# Prem Confidential APIs Skills

A collection of skills for AI coding agents. Skills are packaged instructions and scripts that extend agent capabilities.

Skills follow the [Agent Skills](https://agentskills.io/) format.

## Installation

```bash
npx skills add prem-research/api-skills
```

## Available Skills

### api-ecosystem

Prem's confidential computing AI infrastructure overview — end-to-end encrypted inference via hardware-attested enclaves (AMD SEV-SNP, Intel TDX, NVIDIA Hopper/Blackwell) with post-quantum cryptography (XWing: ML-KEM768 + X25519).

**Triggers on:** Prem, premai, prem.io, confidential AI, encrypted inference, enclave, attestation, KEK, DEK, XWing, post-quantum, confidential-proxy.

---

### api-sdk

TypeScript SDK for encrypted AI inference (`@premai/api-sdk`). Covers initialization with React caching, streaming chat, vision, audio transcription/translation, live STT, file operations, tools, models, and error handling.

**Triggers on:** `createRvencClient`, `@premai/api-sdk`, `RvencClient`, `DEKStore`, encrypted inference.

**Includes:**
- `references/streaming-patterns.md` — streaming chat/vision/audio and live STT patterns
- `references/kek-management.md` — KEK localStorage lifecycle, PIN-based backup/restore
- `scripts/` — helper scripts: generate KEK, validate env, list models, test connection

---

### api-docs

Official Prem documentation links — quickstart, API keys, billing, errors, rate limits, architecture, and raw REST API reference.

**Triggers on:** Prem docs, quickstart, API keys, billing, rate limits, attestation, security model, prem.io.

---

### reticle

Hardware attestation SDK (`@premai/reticle`) for verifying AMD SEV-SNP, Intel TDX, and NVIDIA GPU enclaves from JavaScript/TypeScript via WebAssembly.

**Triggers on:** `@premai/reticle`, attestation, `ClientBuilder`, `attest()`, SEV-SNP, TDX, NVIDIA attestation.

---

### reticle-expo

React Native / Expo integration for hardware attestation. Implements `@premai/reticle` via a dual-engine architecture (Hermes + QuickJS + bare-wasm3) to work around the missing `WebAssembly` API in React Native.

**Triggers on:** reticle-expo, React Native attestation, Expo attestation, `ReticleWorkletBridge`, `useAttestation`, BareKit worklet.

---

## Skill Structure

Each skill contains:

- `skill.md` — instructions for the agent
- `scripts/` — helper scripts for automation (optional)
- `references/` — supporting documentation (optional)

## License

See [LICENSE](./LICENSE).
