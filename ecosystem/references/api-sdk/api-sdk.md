---
name: api-sdk
description: End-to-end encrypted AI inference SDK. Use when calling LLMs, transcribing audio, uploading/indexing encrypted files, running AI tools (image gen, PDF parsing, web search, RAG), or setting up a local OpenAI-compatible proxy. All encryption happens client-side before any data leaves the device. Triggers on createRvencClient, @premai/api-sdk, RvencClient, DEKStore, encrypted inference, confidential AI.
---

# api-sdk

OpenAI-compatible TypeScript SDK with end-to-end encryption via post-quantum cryptography (XWing: ML-KEM768 + X25519) and hardware-attested enclaves (AMD SEV-SNP, Intel TDX, NVIDIA Hopper/Blackwell). All data is encrypted client-side before leaving the device.

This skill covers: initialization with React caching, streaming chat, vision, audio transcription/translation, live STT with the full Web Audio pipeline, file operations, tools, models, and error handling.

**Load reference files when needed:**
- `references/api-sdk/references/streaming-patterns.md` — streaming chat/vision/audio and live STT patterns with client caching and teardown
- `references/api-sdk/references/kek-management.md` — KEK localStorage lifecycle, PIN-based backup/restore

## Installation

```bash
npm install @premai/api-sdk
```

**Required environment variables:**
- `PREM_API_KEY` — API key
- `CLIENT_KEK` — 32-byte hex master key (generate once with `generateNewClientKEK()`, store in secrets manager)
- `PROXY_URL` — Gateway endpoint (e.g. `https://gateway.prem.io`)
- `ENCLAVE_URL` — Enclave endpoint (e.g. `https://conf-engine.prem.io`)

In Next.js, expose gateway/enclave URLs via `NEXT_PUBLIC_*` env vars baked at build time.

## Import Paths

```typescript
// Node.js
import createRvencClient from '@premai/api-sdk'

// Browser / React / Next.js  ← always use this in browser environments
import createRvencClient from '@premai/api-sdk/browser'

// Types only
import type { RvencClientOptions, DEKStore, DecryptedFile, Model } from '@premai/api-sdk'
```

Using the non-browser import in a Next.js app causes bundle errors. Always use `/browser` when `dangerouslyAllowBrowser: true` is needed.

## Initialization

### Basic (Node.js / server)

```typescript
const client = await createRvencClient({
  apiKey: process.env.PREM_API_KEY!,
  clientKEK: process.env.CLIENT_KEK,
  attest: process.env.NODE_ENV !== 'development',
  requestTimeoutMs: 30000,
  config: {
    endpoints: {
      enclave: process.env.ENCLAVE_URL,
      proxy:   process.env.PROXY_URL,
    },
  },
})
```

### Client Caching (React / Next.js)

`createRvencClient` is async — it performs an ML-KEM768 key exchange with the enclave. Repeating this per render adds latency and burns quota. Cache with `useRef` and guard concurrent calls with a second ref.

```typescript
import createRvencClient from '@premai/api-sdk/browser'
import { useRef, useEffect } from 'react'

const clientRef = useRef<Awaited<ReturnType<typeof createRvencClient>> | null>(null)
const isInitializingRef = useRef(false)  // ref, not state — sync read required

// Invalidate when API key changes
useEffect(() => { clientRef.current = null }, [apiKey])

async function getClient() {
  if (!clientRef.current && !isInitializingRef.current) {
    isInitializingRef.current = true
    clientRef.current = await createRvencClient({
      apiKey,
      clientKEK: clientKEK || undefined,  // pass undefined, never null
      attest: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' ? false : true,
      requestTimeoutMs: 60000,
      config: {
        endpoints: {
          proxy:   process.env.NEXT_PUBLIC_PROXY_URL,
          enclave: process.env.NEXT_PUBLIC_ENCLAVE_URL,
        },
        openAIClientOptions: {
          dangerouslyAllowBrowser: true,
        },
      },
    })
    isInitializingRef.current = false
  } else if (isInitializingRef.current) {
    // Wait out concurrent initialization (polling avoids a shared Promise ref)
    while (isInitializingRef.current) {
      await new Promise(r => setTimeout(r, 50))
    }
  }
  return clientRef.current!
}
```

`attest` must be `false` for local/dev endpoints and `true` for production enclaves. `clientKEK` comes from `getCurrentKEK()` — see `references/api-sdk/references/kek-management.md`.

## Chat Completions

### Streaming (with AbortController)

```typescript
const abortControllerRef = useRef<AbortController | null>(null)

// Start
abortControllerRef.current = new AbortController()
const client = await getClient()

const stream = await client.chat.completions.create({
  model: 'MODEL_ID',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: prompt },
  ],
  stream: true,
  stream_options: { include_usage: true },
})

for await (const chunk of stream as AsyncIterable<any>) {
  if (abortControllerRef.current?.signal.aborted) break
  const content = chunk.choices?.[0]?.delta?.content || ''
  if (content) appendToOutput(content)
}

// Stop from outside
abortControllerRef.current?.abort()
abortControllerRef.current = null
```

### Non-streaming

```typescript
const response = await client.chat.completions.create({
  model: 'MODEL_ID',
  messages: [{ role: 'user', content: 'Hello!' }],
})
const text = response.choices[0].message.content
```

## Vision

Image must be converted to a base64 data URL before sending. Vision uses non-streaming `create()`.

```typescript
const arrayBuffer = await file.arrayBuffer()
const base64 = btoa(
  new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
)
const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`

const response = await client.chat.completions.create({
  model: 'MODEL_ID',
  messages: [
    { role: 'system', content: 'What is in this image?' },
    {
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },      // optional — omit if no prompt
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ],
})
const description = response.choices[0]?.message?.content || ''
```

## Audio

### Transcription (file → text)

`file` accepts `Uint8Array`, `ArrayBuffer`, `Blob`, or Node.js `ReadStream`.

```typescript
const bytes = new Uint8Array(await file.arrayBuffer())

const result = await client.audio.transcriptions.create({
  file: bytes,
  model: selectedModel,
  // language: 'en',          // optional for Whisper
  // response_format: 'json', // default
})

// Whisper models return result.text
// Deepgram models return result.results.channels[0].alternatives[0].transcript
// Always handle both:
const text = result?.text
  ?? result?.results?.channels?.[0]?.alternatives?.[0]?.transcript
```

### Translation (audio → English)

Translation is Whisper-only — always returns `.text`.

```typescript
const bytes = new Uint8Array(await file.arrayBuffer())
const result = await client.audio.translations.create({
  file: bytes,
  model: 'openai/whisper-large-v3',
  response_format: 'json',
})
console.log(result.text)
```

### Live Speech-to-Text

Requires a Deepgram model. Audio must be Int16 PCM — the Web Audio API provides Float32 which must be converted.

**Setup:**

```typescript
import createRvencClient from '@premai/api-sdk/browser'

const client = await createRvencClient({ apiKey, clientKEK: clientKEK || undefined, attest: ..., config: { ... } })

const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })
const audioContext = new AudioContext()

const session = await client.audio.transcriptions.live({
  model: 'deepgram/general-nova-3',
  language: 'multi',          // or 'en', 'es', etc.
  encoding: 'linear16',
  sample_rate: audioContext.sampleRate,  // use actual hardware rate — do NOT hardcode 48000
})

const source = audioContext.createMediaStreamSource(mediaStream)
const processor = audioContext.createScriptProcessor(4096, 1, 1)
source.connect(processor)
processor.connect(audioContext.destination)

processor.onaudioprocess = (e) => {
  const f32 = e.inputBuffer.getChannelData(0)
  const i16 = new Int16Array(f32.length)
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]))
    i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff  // Float32 → Int16 PCM
  }
  try { session.sendAudio(new Uint8Array(i16.buffer)) } catch { /* session may have closed */ }
}
```

**Transcript loop** (run concurrently — IIFE lets the caller return immediately):

```typescript
;(async () => {
  try {
    for await (const chunk of session.transcripts()) {
      const c = chunk as any
      const transcript = c?.channel?.alternatives?.[0]?.transcript
      if (!transcript) continue
      if (c.is_final) {
        appendToOutput(transcript + ' ')
        setInterimTranscript('')
      } else {
        setInterimTranscript(transcript)   // show greyed interim text in UI
      }
    }
  } catch { /* session closed or network error */ }
  finally {
    setIsStreaming(false)
    setInterimTranscript('')
  }
})()
```

**Teardown (order matters):**

```typescript
// 1. Disconnect audio graph
processor.disconnect()
source.disconnect()

// 2. Stop media tracks
mediaStream.getTracks().forEach(t => t.stop())

// 3. Close AudioContext
audioContext.close()

// 4. Close session — always suppress the unhandled rejection
session.close()
session.closed.catch(() => {})  // ← required, or browser throws uncaught rejection
```

For the full React hook implementation (with refs, store wiring, and cleanup), see `references/api-sdk/references/streaming-patterns.md`.

## File Operations

```typescript
import { serializeDEKStore, deserializeDEKStore } from '@premai/api-sdk'

// Upload — generates a unique DEK per file, wrapped with clientKEK
const uploaded = await client.files.upload({
  file: new Uint8Array(await file.arrayBuffer()),
  fileName: 'report.pdf',
  mimeType: 'application/pdf',
  ragIndex: false,  // true to auto-index for RAG
})

// IMMEDIATELY persist dekStore after every upload — it's the only way to decrypt later
const serialized = serializeDEKStore(client.dekStore)
await saveToYourBackend(serialized)

// Restore on next session
const stored = await loadFromYourBackend()
const store = deserializeDEKStore(stored)
const client = await createRvencClient({ ..., dekStore: store })

// List
const { files, pagination } = await client.files.list({
  limit: 20,
  offset: 0,
  search: 'report',   // optional
  from: '2024-01-01', // optional
  to: '2024-12-31',   // optional
})

// Get metadata
const meta = await client.files.get({ id: fileId })

// Delete
await client.files.delete({ id: fileId })

// RAG index
await client.files.index({ files: [{ fileId: uploaded.id, filePath: 'report.pdf' }] })

// Remove from RAG
await client.files.deleteIndex({ fileIds: [fileId] })
```

## Tools

### File-producing tools — return `DecryptedFile`

```typescript
const image  = await client.tools.generateImage({ prompt: 'a red fox in snow' })
const audio  = await client.tools.audioGenerateFromText({ text: 'Hello world' })
const doc    = await client.tools.createFileForUser({ fileName: 'summary', fileExtension: 'txt', fileContent: '...', mimeType: 'text/plain' })
```

### File-processing tools — require `fileId`, DEK must be in `client.dekStore`

```typescript
const pdf      = await client.tools.getPDFContent({ fileId })
const txt      = await client.tools.getTextDocumentContent({ fileId })
const sheet    = await client.tools.getSpreadsheetContent({ fileId })
const data     = await client.tools.getDataFileContent({ fileId })
const slides   = await client.tools.getPowerPointContent({ fileId, slideNumbers: [1, 2] })
const ocr      = await client.tools.getFileContentOCR({ fileId })
const caption  = await client.tools.imageDescribeAndCaption({ fileId })
const video    = await client.tools.videoDescribeAndCaption({ fileId })
const txcript  = await client.tools.transcribeAudioToText({ fileId, language: 'en' })
const diarize  = await client.tools.transcribeAudioWithDiarization({ fileId })
const speakers = await client.tools.audioDiarization({ fileId })
```

### Simple tools

```typescript
const time    = await client.tools.getTime({ timezone: 'America/New_York' })
const results = await client.tools.webSearchTool({ query: 'AI news', country: 'US' })
const page    = await client.tools.webPageScraperTool({ url: 'https://example.com', renderJs: true })
const rag     = await client.tools.searchRag({ query: 'quarterly revenue' })
```

## Models

```typescript
const all  = await client.models.list()
const chat = await client.models.list({ type: 'chat' })
// Fields: id, name, description, model, type, enabled, input_modalities, price_config
```

## DEK Store Management

```typescript
import {
  generateNewClientKEK,
  initializeDEKStore,
  serializeDEKStore,
  deserializeDEKStore,
  getClientKID,
} from '@premai/api-sdk'

// One-time setup: generate KEK and store in secrets manager
const kek = generateNewClientKEK()  // 32-byte hex string
const kid = getClientKID(kek)       // Use as storage key

// Initialize store (first run)
const store = initializeDEKStore(kek)

// After any file operation: persist immediately
const json = serializeDEKStore(client.dekStore)

// On next session: restore and pass to createRvencClient
const store = deserializeDEKStore(json)
const client = await createRvencClient({ apiKey, clientKEK: kek, dekStore: store, ... })
```

## Local Proxy (OpenAI-compatible)

Run as a transparent encryption proxy for any OpenAI-compatible client:

```bash
npx @premai/api-sdk confidential-proxy
# Starts http://127.0.0.1:3000/v1
```

```typescript
// Start programmatically
import { startServer } from '@premai/api-sdk'
await startServer({ port: 3000, kek: process.env.CLIENT_KEK })
```

```python
# Use from Python (or any OpenAI-compatible client)
from openai import OpenAI
client = OpenAI(base_url="http://127.0.0.1:3000/v1", api_key="unused")
```

## Error Handling

```typescript
try {
  const stream = await client.chat.completions.create({ model, messages, stream: true })
  for await (const chunk of stream) { ... }
} catch (err) {
  // AbortError is expected (user cancelled / timeout) — never show as an error
  if (err instanceof Error && err.name === 'AbortError') return

  // SDK embeds JSON in error.message for structured gateway errors
  let message = err instanceof Error ? err.message : 'An unknown error occurred'
  try {
    const jsonMatch = message.match(/\{.*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      message = parsed.error || parsed.message || message
    }
  } catch { /* message stays as-is */ }

  setError(message)
}
```

HTTP status codes: 400 bad request, 401 auth, 403 scope missing, 429 rate limited (backoff), 503 enclave unavailable (retry).

## Anti-patterns

| Don't | Do instead |
|-------|-----------|
| `createRvencClient(...)` without `await` | Always `await` — async ML-KEM handshake |
| Create new client per request in React | Cache with `useRef`, invalidate on `apiKey` change |
| Discard `client.dekStore` after file upload | Serialize and persist immediately |
| Pass `fs.createReadStream` as `file` in browser | Pass `Uint8Array` (or `Blob`) |
| Set `attest: true` against dev/local endpoints | Use `attest: false` for non-enclave endpoints |
| Spawn two concurrent `createRvencClient` calls | Gate with `isInitializingRef` + polling loop |
| Send Float32 PCM to `session.sendAudio` | Convert: `s < 0 ? s * 0x8000 : s * 0x7fff` |
| Assume `result.text` for all audio models | Null-coalesce: `result?.text ?? result?.results?.channels?.[0]?.alternatives?.[0]?.transcript` |
| Skip `session.close()` on STT teardown | Always close + `session.closed.catch(() => {})` |
| Hardcode `sample_rate: 48000` | Use `audioContext.sampleRate` (actual hardware rate) |
| Pass `clientKEK: null` to `createRvencClient` | Pass `clientKEK: value || undefined` — SDK rejects `null` |
| Create a new client per live STT session without cleanup | Store refs (`sessionRef`, `audioContextRef`, `processorRef`, `mediaStreamRef`) and always teardown in order |

## API Key Scopes

| Operation | Required scope |
|-----------|---------------|
| Chat / Vision | `chats.completion` |
| Audio transcription | `audio.transcription` |
| Audio translation | `audio.translation` |
| File upload | `files.encrypted.create` |
| File read / list | `files.encrypted.read` |
| File delete | `files.encrypted.delete` |
| Tools | `tools.execute` |
| List API keys | `api_keys.read` |

## TypeScript Types

```typescript
import type {
  RvencClientOptions,
  DEKStore, EncryptionKeys,
  FileUploadOptions, UploadedFile, DecryptedFile, FileMetadata,
  ListFilesOptions, ListFilesResponse, PaginationInfo,
  GetFileOptions, DeleteFileOptions, DeleteFileResponse,
  IndexFileInput, IndexFilesOptions, IndexFilesResponse,
  DeleteIndexOptions, DeleteIndexResponse,
  Model, ListModelsParams, ListModelsResponse, ModelPriceConfig,
  GenerateImageParams, AudioGenerateFromTextParams, CreateFileParams,
  GetPDFContentParams, TranscribeParams, GetTimeParams,
  WebSearchParams, WebScraperParams, SearchRagParams,
  PDFContentDecrypted, TextDocumentContentDecrypted,
  TranscribeAudioDecrypted, TranscribeWithDiarizationDecrypted,
  SpreadsheetContentDecrypted, DataFileContentDecrypted,
  PowerPointContentDecrypted, AudioDiarizationDecrypted, GetTimeDecrypted,
} from '@premai/api-sdk'
```

## Scripts

Runnable helpers in `references/api-sdk/scripts/`:

| Script | Description | Run |
|--------|-------------|-----|
| `generate-kek.ts` | Generate a new `CLIENT_KEK` and print the hex string + derived KID | `bun references/api-sdk/scripts/generate-kek.ts` |
| `validate-env.sh` | Check presence and format of all 4 required env vars | `bash references/api-sdk/scripts/validate-env.sh` |
| `list-models.ts` | Initialise a client and print all available models grouped by type | `bun references/api-sdk/scripts/list-models.ts` |
| `test-connection.ts` | Verify endpoint URLs and API key with `attest: false` (dev mode) | `bun references/api-sdk/scripts/test-connection.ts` |

## Reference Files

- `references/api-sdk/references/streaming-patterns.md` — streaming chat/vision/audio and live STT patterns. Load when building chat UI, audio features, or live STT in any framework.
- `references/api-sdk/references/kek-management.md` — `getCurrentKEK()`, `generateNewKEK()`, PIN-encrypted export/import, localStorage format. Load when managing the KEK lifecycle in a browser app.

## Security Boundaries

**Protected:** all inference inputs/outputs, file contents, audio — encrypted client-side, processed in a hardware-attested enclave, invisible to Prem staff.

**Not protected:** request timing and payload sizes (visible to proxy), model output behavior, hardware side-channels (verifiable via attestation firmware), compromised manufacturer root keys.
