---
name: reticle-expo
description: React Native / Expo integration for hardware attestation via @premai/reticle. Use when implementing attestation in a React Native or Expo app. Triggers on reticle-expo, React Native attestation, Expo attestation, ReticleWorkletBridge, useAttestation, BareKit worklet, mobile attestation.
---

# reticle-expo

React Native / Expo app demonstrating hardware attestation (`@premai/reticle`) on iOS and Android. Solves a core constraint: JavaScriptCore (React Native's JS engine) does not expose a `WebAssembly` API, so the WASM-based reticle SDK cannot run directly.

**GitHub:** https://github.com/prem-research/reticle-expo

## The Problem

React Native uses Hermes/JavaScriptCore — neither exposes `WebAssembly` to userland. The reticle SDK is WASM-only.

## The Solution: Dual-Engine Architecture

```
Hermes (UI thread)
    ↕ IPC (newline-delimited JSON)
QuickJS (BareKit worklet, background thread)
    └── bare-wasm3  ←  patches WebAssembly global via wasm3 interpreter
            └── @premai/reticle WASM
```

- **Hermes** — handles React Native UI as normal
- **BareKit worklet** — spawns a QuickJS interpreter in a background thread
- **`bare-wasm3`** — injects a `WebAssembly` polyfill into QuickJS via `wasm3` (pure interpreter, no JIT required)
- **IPC pipe** — Hermes and QuickJS communicate via `BareKit.IPC` using newline-delimited JSON messages

## Key Files

| File | Description |
|------|-------------|
| `worklets/attestation-worklet.js` | QuickJS worklet: loads bare polyfills, patches `WebAssembly`, initializes reticle SDK, handles `warmup` and `attest` IPC messages |
| `src/services/reticle-worklet-bridge.ts` | `ReticleWorkletBridge` class — Hermes-side bridge that starts the worklet, sends JSON messages, tracks pending requests with timeouts |
| `src/hooks/useAttestation.ts` | `useAttestation` React hook — manages init/attest lifecycle, status states, error handling |

## ReticleWorkletBridge

Singleton — use `getReticleBridge()` to get the shared instance.

```typescript
import { getReticleBridge } from './src/services/reticle-worklet-bridge'

const bridge = getReticleBridge()

// Initialize worklet (warmup phase — loads WASM, ~1x per app lifetime)
await bridge.init()

// Run attestation
const result = await bridge.attest({ apiKey, proxyUrl, enclaveUrl })
// result: { cpuType: 'SEV' | 'TDX', hasGpu: boolean }

// Cleanup
bridge.destroy()
```

**Timeouts:** warmup 30s, attestation 60s.

## useAttestation Hook

```typescript
const {
  attest,          // () => Promise<void> — run attestation
  status,          // 'idle' | 'initializing' | 'running' | 'done' | 'error'
  result,          // { cpuType, hasGpu } | null
  error,           // string | null
  isReady,         // boolean | null — bridge initialized
  hasApiKey,       // boolean | null — API key present in settings
  refreshApiKey,   // () => void — reload API key from settings
} = useAttestation()
```

Hook initializes the bridge on mount (after API key check via `hasApiKeyConfigured()`) and prevents duplicate init via `initStarted` ref guard. Credentials are loaded from `settings` via `loadSettings()` at attest time.

## Worklet IPC Protocol

Messages are newline-delimited JSON over `BareKit.IPC`:

| Message | Direction | Fields |
|---------|-----------|--------|
| `{ type: 'warmup', id, wasmPath }` | Hermes → QuickJS | Init SDK, preload WASM module |
| `{ type: 'attest', id, apiKey, proxyUrl, wasmPath }` | Hermes → QuickJS | Run attestation |
| `{ id, attestation: { cpuType, hasGpu } }` | QuickJS → Hermes | Success result |
| `{ id, error: { type, message } }` | QuickJS → Hermes | Error (AttestationError \| GatewayError \| Error) |
| `{ type: 'debug', msg }` | QuickJS → Hermes | Debug log |

## Worklet Internals

The worklet (`attestation-worklet.js`) does several non-obvious things worth knowing:

- **`queueMicrotask` polyfill** — required by wasm-bindgen Promises runtime; may be missing in BareKit
- **`readFileSync` patch** — intercepts `reticle_bg.wasm` reads and redirects to the on-disk `wasmPath` provided by the host app
- **WASM module preload** — `new WebAssembly.Module(wasmBytes)` called during warmup to populate wasm3's module cache, avoids OOM from loading 3.7MB WASM + data overlap at attestation time
- **`ioNudge`** — custom `WebAssembly.Instance` wrapper that writes a newline after sync wasm3 execution to unblock the IPC event loop

## Requirements

- macOS + Xcode (iOS builds)
- Bun package manager
- Access to a running `attestation-server` (from `@premai/reticle`)