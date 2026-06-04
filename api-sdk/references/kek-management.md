# KEK Management Reference

The client Key Encryption Key (KEK) is a 32-byte hex string that wraps per-file Data Encryption Keys (DEKs). It must be generated once and persisted — losing it means losing access to all encrypted files.

## localStorage Format

The browser stores the KEK in `localStorage` under the key `"kekkid"` as a JSON object:

```typescript
type KEKStorage = {
  kek: string  // 32-byte hex — passed as clientKEK to createRvencClient
  kid: string  // hex key ID derived from KEK — used as storage/lookup key
}

// Example
window.localStorage.getItem("kekkid")
// → '{"kek":"a3f1...64 hex chars...","kid":"b7c2...64 hex chars..."}'
```

## Reading the Current KEK

Use these utilities before calling `createRvencClient`:

```typescript
export function getCurrentKEK(): string | null {
  try {
    if (typeof window === 'undefined') return null  // SSR guard
    const stored = window.localStorage.getItem('kekkid')
    if (!stored) return null
    return (JSON.parse(stored) as KEKStorage).kek
  } catch { return null }
}

export function getCurrentKID(): string | null {
  try {
    if (typeof window === 'undefined') return null
    const stored = window.localStorage.getItem('kekkid')
    if (!stored) return null
    return (JSON.parse(stored) as KEKStorage).kid
  } catch { return null }
}
```

Pass to SDK:

```typescript
import createRvencClient from '@premai/api-sdk/browser'
import { getClientKID } from '@premai/api-sdk'

const clientKEK = getCurrentKEK()

const client = await createRvencClient({
  apiKey,
  clientKEK: clientKEK || undefined,  // undefined is fine; null is not accepted
  ...
})
```

## Generating a New KEK

```typescript
import { randomBytes, bytesToHex } from '@noble/ciphers/utils.js'
import { getClientKID } from '@premai/api-sdk'

function generateAndStoreKEK(): string {
  const kekBytes = randomBytes(32)
  const kid = getClientKID(bytesToHex(kekBytes))

  const kekData: KEKStorage = {
    kek: bytesToHex(kekBytes),
    kid: bytesToHex(kid),
  }
  window.localStorage.setItem('kekkid', JSON.stringify(kekData))
  return kekData.kek
}
```

Only call this once per user. Regenerating overwrites the previous KEK and makes existing encrypted files unrecoverable unless a backup was made first.

## PIN-Protected Backup / Restore

For recovery flows, the KEK can be encrypted with a 6-digit PIN using Argon2id + XChaCha20-Poly1305. The result is a base64 string the user can copy or download.

### Dependencies

```bash
npm install @noble/ciphers @noble/hashes
```

### Encrypt (export)

```typescript
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { managedNonce, randomBytes, bytesToHex } from '@noble/ciphers/utils.js'
import { argon2id } from '@noble/hashes/argon2.js'

const te = new TextEncoder()

function kdfFromPin(pin6: string, salt: Uint8Array): Uint8Array {
  if (!/^\d{6}$/.test(pin6)) throw new Error('PIN must be exactly 6 digits')
  return argon2id(te.encode(pin6), salt, { dkLen: 32, m: 65536, p: 1, t: 4 })
}

export function encryptKEKWithPin(plainKEK: string, pin6: string): string {
  const salt = randomBytes(16)
  const key = kdfFromPin(pin6, salt)
  const aead = managedNonce(xchacha20poly1305)(key)
  const ct = aead.encrypt(te.encode(plainKEK))

  // Format: [version=1 (1 byte)] [salt (16 bytes)] [ciphertext+tag]
  const out = new Uint8Array(1 + salt.length + ct.length)
  out[0] = 1
  out.set(salt, 1)
  out.set(ct, 1 + salt.length)
  return Buffer.from(out).toString('base64')
}
```

### Decrypt (import)

```typescript
const td = new TextDecoder()

export function decryptKEKWithPin(b64: string, pin6: string): string {
  const buf = Buffer.from(b64, 'base64')
  if (buf.length < 1 + 16 + 24 + 16) throw new Error('Ciphertext too short')
  if (buf[0] !== 1) throw new Error('Unsupported version')

  const salt   = buf.subarray(1, 17)
  const packed = buf.subarray(17)
  const key    = kdfFromPin(pin6, salt)
  const aead   = managedNonce(xchacha20poly1305)(key)
  return td.decode(aead.decrypt(packed))
}
```

### Full import flow (store after decryption)

```typescript
import { hexToBytes } from '@noble/ciphers/utils.js'
import { getClientKID } from '@premai/api-sdk'

async function importKEKFromBackup(encryptedB64: string, pin: string): Promise<void> {
  const plainKEK = decryptKEKWithPin(encryptedB64, pin)  // throws on wrong PIN
  const kekBytes = hexToBytes(plainKEK)
  const kid = getClientKID(plainKEK)

  window.localStorage.setItem('kekkid', JSON.stringify({
    kek: plainKEK,
    kid: bytesToHex(kid),
  }))
}
```

### Downloading the encrypted backup

```typescript
function downloadKEKBackup(encryptedB64: string, filename = 'KEK-backup.txt'): void {
  const blob = new Blob([encryptedB64], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

## KEK Lifecycle Summary

```
First visit ──────► generateAndStoreKEK()
                         │
                         ▼
                   localStorage["kekkid"]
                         │
                         ├──► getCurrentKEK() ──► createRvencClient({ clientKEK })
                         │
                         └──► encryptKEKWithPin(kek, pin) ──► user saves backup
                                                                     │
Later / new device ◄─────────────────────────────────────────────────┘
                    decryptKEKWithPin(backup, pin) ──► importKEKFromBackup()
```

## Security Notes

- The KEK never leaves the browser unencrypted. When backed up, it is wrapped with a PIN-derived key.
- Argon2id parameters (m=65536, t=4, p=1) are tuned for browser use — strong enough to resist offline attacks against a 6-digit PIN.
- `managedNonce` from `@noble/ciphers` automatically prepends a random nonce on encrypt and strips it on decrypt — no manual nonce management required.
- If the user clears localStorage without a backup, all encrypted files become permanently inaccessible. Always prompt users to back up the KEK before clearing site data.
