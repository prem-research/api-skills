---
name: ecosystem
description: Prem confidential AI ecosystem. Use when working with anything from Prem or @premai/* packages. Triggers on Prem, premai, prem.io, confidential AI, encrypted inference, enclave, attestation, reticle, reticle-expo, @premai/reticle, @premai/api-sdk, @premai/bare-wasm3, createRvencClient, RvencClient, DEKStore, KEK, DEK, ClientBuilder, BareKit, hardware attestation, SEV-SNP, TDX, NVIDIA enclave, XWing, post-quantum, confidential-proxy.
---

# Ecosystem

Prem's confidential computing AI infrastructure — end-to-end encrypted inference via hardware-attested enclaves (AMD SEV-SNP, Intel TDX, NVIDIA Hopper/Blackwell) with post-quantum cryptography (XWing: ML-KEM768 + X25519).

All data is encrypted client-side before leaving the device. The enclave processes data without Prem staff being able to access it.

## Core Concepts

- **KEK (Key Encryption Key)** — master key generated once per user/app, stored in a secrets manager. Never sent to the server.
- **DEK (Data Encryption Key)** — unique key per file, wrapped with the KEK. Required to decrypt file content.
- **Enclave** — hardware-isolated execution environment that verifies its own integrity via remote attestation before accepting connections.
- **Attestation** — cryptographic proof that the enclave code is unmodified and running on genuine hardware. Always enable in production (`attest: true`), disable only for local/dev endpoints.

## Packages

| Package | Description |
|---------|-------------|
| `@premai/api-sdk` | TypeScript SDK for encrypted AI inference — chat, audio, files, tools, models |
| `@premai/reticle` | Hardware attestation SDK — AMD SEV-SNP, Intel TDX, NVIDIA GPU verification via WASM |
| `@premai/bare-wasm3` | WASM polyfill for BareKit/QuickJS — enables reticle in React Native / Expo |

## References

Load these when the task requires deeper knowledge:

- `references/reticle-expo/reticle-expo.md` — React Native / Expo integration for hardware attestation. Load when:
  - Implementing attestation in a React Native or Expo app
  - Working with `ReticleWorkletBridge`, `useAttestation`, or BareKit worklets
  - Understanding the dual-engine architecture (Hermes + QuickJS + bare-wasm3)
  - Debugging IPC between the UI thread and the attestation worklet

- `references/reticle/reticle.md` — `@premai/reticle` hardware attestation SDK. Load when:
  - Verifying AMD SEV-SNP, Intel TDX, or NVIDIA GPU enclave integrity from JS/TS
  - Using `ClientBuilder`, `attest()`, or low-level `request_sev/tdx/nvidia()` methods
  - Managing WASM object lifecycle (`.free()` / `using` keyword)
  - Setting up or querying the `attestation-server` REST API

- `references/prem-docs-mcp/prem-docs-mcp.md` — Prem Docs MCP server. Load when an AI agent needs to search or query Prem documentation programmatically via Model Context Protocol.

- `references/prem-docs/prem-docs.md` — official Prem documentation links. Load when:
  - Onboarding to Prem or explaining the platform to someone new
  - Managing API keys (creating, scoping, rotating, inspecting request history)
  - Handling errors, rate limits, or debugging gateway responses
  - Billing questions (pricing, balance, limits, payment, usage)
  - Understanding the security model, attestation, or enclave architecture
  - Looking up raw REST API schemas for chat, audio, or models endpoints
  - Following a quickstart or recipe for authentication, chat, or audio

- `references/api-sdk/api-sdk.md` — full SDK reference. Load when:
  - Integrating `@premai/api-sdk` into a project (Node.js, React, Next.js)
  - Implementing streaming chat, vision, audio transcription/translation, or live STT
  - Uploading, listing, deleting, or RAG-indexing encrypted files
  - Using AI tools (image gen, PDF parsing, web search, web scraper, RAG)
  - Managing the DEK store across sessions
  - Setting up the local OpenAI-compatible proxy
  - Debugging errors or reviewing anti-patterns

## Security Boundaries

**Protected:** inference inputs/outputs, file contents, audio — encrypted client-side, processed inside the enclave, invisible to Prem staff.

**Not protected:** request timing and payload sizes (visible to proxy), model output behavior, hardware side-channels (verifiable via attestation firmware).