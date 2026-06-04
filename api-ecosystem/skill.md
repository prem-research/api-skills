---
name: api-ecosystem
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

## Skills

These companion skills are available for deeper knowledge:

- `api-sdk` — TypeScript SDK for encrypted inference. Load when integrating `@premai/api-sdk` into a project, implementing streaming chat/audio/vision, managing files, tools, or the DEK store.
- `api-docs` — Official Prem documentation links. Load when onboarding, managing API keys, handling errors/rate limits, billing, or looking up raw REST API schemas.
- `reticle` — `@premai/reticle` hardware attestation SDK. Load when verifying AMD SEV-SNP, Intel TDX, or NVIDIA GPU enclaves from JS/TS.
- `reticle-expo` — React Native / Expo attestation integration. Load when implementing `@premai/reticle` in a React Native or Expo app.

## Security Boundaries

**Protected:** inference inputs/outputs, file contents, audio — encrypted client-side, processed inside the enclave, invisible to Prem staff.

**Not protected:** request timing and payload sizes (visible to proxy), model output behavior, hardware side-channels (verifiable via attestation firmware).