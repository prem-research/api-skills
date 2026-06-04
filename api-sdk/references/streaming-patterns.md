# Streaming & Live STT Patterns

Reusable patterns for streaming chat/vision/audio and live speech-to-text with `@premai/api-sdk`.

---

## Client Caching Pattern

`createRvencClient` is async and performs an ML-KEM handshake — create it once and reuse.

```typescript
import createRvencClient from '@premai/api-sdk/browser'

type RvencClient = Awaited<ReturnType<typeof createRvencClient>>

let clientInstance: RvencClient | null = null
let isInitializing = false

async function getClient(options: {
  apiKey: string
  clientKEK?: string
  attest: boolean
  proxyUrl: string
  enclaveUrl: string
}): Promise<RvencClient> {
  if (clientInstance) return clientInstance

  if (isInitializing) {
    while (isInitializing) await new Promise(r => setTimeout(r, 50))
    return clientInstance!
  }

  isInitializing = true
  clientInstance = await createRvencClient({
    apiKey: options.apiKey,
    clientKEK: options.clientKEK || undefined,
    attest: options.attest,
    requestTimeoutMs: 60000,
    config: {
      endpoints: { proxy: options.proxyUrl, enclave: options.enclaveUrl },
      openAIClientOptions: { dangerouslyAllowBrowser: true },
    },
  })
  isInitializing = false
  return clientInstance
}

// Invalidate when the API key changes
function resetClient() {
  clientInstance = null
}
```

> In React: store `clientInstance` and `isInitializing` as `useRef` values inside the component/hook. Call `resetClient()` inside a `useEffect` that depends on `apiKey`.

---

## Streaming Chat

```typescript
let abortController: AbortController | null = null

async function streamChat(
  client: RvencClient,
  model: string,
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void
) {
  abortController = new AbortController()

  const stream = await client.chat.completions.create({
    model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
  })

  for await (const chunk of stream as AsyncIterable<any>) {
    if (abortController?.signal.aborted) break
    const content = chunk.choices?.[0]?.delta?.content || ''
    if (content) onChunk(content)
  }
}

function stopStream() {
  abortController?.abort()
  abortController = null
}
```

---

## Vision (non-streaming)

Convert the image file to a base64 data URL before sending.

```typescript
async function analyzeImage(
  client: RvencClient,
  model: string,
  imageFile: File,
  prompt?: string
): Promise<string> {
  const arrayBuffer = await imageFile.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )
  const dataUrl = `data:${imageFile.type || 'image/jpeg'};base64,${base64}`

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          ...(prompt ? [{ type: 'text' as const, text: prompt }] : []),
          { type: 'image_url' as const, image_url: { url: dataUrl } },
        ],
      },
    ],
  })
  return response.choices[0]?.message?.content || ''
}
```

---

## Audio Transcription / Translation

```typescript
// Transcription — Whisper or Deepgram
async function transcribeAudio(
  client: RvencClient,
  model: string,
  audioFile: File
): Promise<string> {
  const bytes = new Uint8Array(await audioFile.arrayBuffer())
  const result = await client.audio.transcriptions.create({ file: bytes, model })

  // Whisper: result.text | Deepgram: result.results.channels[0].alternatives[0].transcript
  return result?.text ?? result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
}

// Translation — Whisper only, always returns English text
async function translateAudio(
  client: RvencClient,
  model: string,
  audioFile: File
): Promise<string> {
  const bytes = new Uint8Array(await audioFile.arrayBuffer())
  const result = await client.audio.translations.create({ file: bytes, model })
  return result.text
}
```

---

## Live Speech-to-Text

Requires a Deepgram model. Manages the full Web Audio pipeline with proper teardown.

```typescript
import createRvencClient from '@premai/api-sdk/browser'

type LiveSession = {
  sendAudio(chunk: Uint8Array): void
  close(): void
  transcripts(): AsyncIterable<unknown>
  closed: Promise<void>
}

// Resources — keep as refs in React, or plain variables in other environments
let session: LiveSession | null = null
let audioContext: AudioContext | null = null
let mediaStream: MediaStream | null = null
let processor: ScriptProcessorNode | null = null

async function startLiveSTT(options: {
  apiKey: string
  model: string            // must be a Deepgram model, e.g. 'deepgram/general-nova-3'
  language?: string        // 'multi', 'en', 'es', etc. Default: 'multi'
  clientKEK?: string
  attest: boolean
  proxyUrl: string
  enclaveUrl: string
  onFinalTranscript: (text: string) => void
  onInterimTranscript: (text: string) => void
  onError: (err: string) => void
  onStop: () => void
}) {
  const client = await createRvencClient({
    apiKey: options.apiKey,
    clientKEK: options.clientKEK || undefined,
    attest: options.attest,
    requestTimeoutMs: 60000,
    config: {
      endpoints: { proxy: options.proxyUrl, enclave: options.enclaveUrl },
      openAIClientOptions: { dangerouslyAllowBrowser: true },
    },
  })

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })
  audioContext = new AudioContext()

  session = (await client.audio.transcriptions.live({
    model: options.model,
    language: options.language ?? 'multi',
    encoding: 'linear16',
    sample_rate: audioContext.sampleRate,  // use actual hardware rate — never hardcode 48000
  })) as LiveSession

  const source = audioContext.createMediaStreamSource(mediaStream)
  processor = audioContext.createScriptProcessor(4096, 1, 1)
  source.connect(processor)
  processor.connect(audioContext.destination)

  processor.onaudioprocess = (e) => {
    if (!session) return
    const f32 = e.inputBuffer.getChannelData(0)
    const i16 = new Int16Array(f32.length)
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]))
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff  // Float32 → Int16 PCM
    }
    try { session.sendAudio(new Uint8Array(i16.buffer)) } catch { /* session may have closed */ }
  }

  // Run transcript loop concurrently — does not block the caller
  ;(async () => {
    try {
      for await (const chunk of session.transcripts()) {
        const c = chunk as any
        const transcript = c?.channel?.alternatives?.[0]?.transcript
        if (!transcript) continue
        if (c.is_final) {
          options.onFinalTranscript(transcript + ' ')
          options.onInterimTranscript('')
        } else {
          options.onInterimTranscript(transcript)
        }
      }
    } catch { /* session closed or network error */ }
    finally {
      options.onStop()
      options.onInterimTranscript('')
    }
  })()
}

// Teardown — order matters
function stopLiveSTT() {
  processor?.disconnect()
  processor = null

  mediaStream?.getTracks().forEach(t => t.stop())
  mediaStream = null

  audioContext?.close()
  audioContext = null

  if (session) {
    session.close()
    session.closed.catch(() => {})  // required — closing rejects the closed promise
    session = null
  }
}
```

> In React: store each resource in a `useRef`. Wrap `startLiveSTT` / `stopLiveSTT` in `useCallback`. Call `stopLiveSTT` in the `useEffect` cleanup to handle unmount.

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| Separate client per live STT session | Live sessions are stateful — reusing a cached client across `start/stop` cycles leaks session state |
| Audio resources as refs (not state) | State updates are async and can cause re-renders mid-teardown; refs read synchronously |
| `session.closed.catch(() => {})` | Closing the session rejects the `closed` promise; without this the browser throws an uncaught rejection |
| IIFE for transcript loop | Allows `startLiveSTT` to return immediately while transcription continues in background |
| `audioContext.sampleRate` not `48000` | Hardware sample rate varies (44100 on macOS, 48000 on many others) — mismatch causes garbled audio |
| `clientKEK: value \|\| undefined` | SDK rejects `null` — always pass `undefined` when no KEK is available |