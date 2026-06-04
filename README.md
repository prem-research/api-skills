# Prem Confidential APIs Skills

A collection of skills for AI coding agents. Skills are packaged instructions and scripts that extend agent capabilities.

Skills follow the [Agent Skills](https://agentskills.io/) format.

## Available Skills

### ecosystem

Prem's confidential computing AI infrastructure — end-to-end encrypted inference via hardware-attested enclaves (AMD SEV-SNP, Intel TDX, NVIDIA Hopper/Blackwell) with post-quantum cryptography (XWing: ML-KEM768 + X25519). All data is encrypted client-side before leaving the device.

**Use when:**

- Calling LLMs via the Prem confidential AI gateway
- Transcribing or translating audio with privacy guarantees
- Uploading, indexing, or querying encrypted files
- Running AI tools: image generation, PDF parsing, web search, RAG
- Setting up a local OpenAI-compatible proxy with transparent encryption
- Managing cryptographic keys (KEK/DEK) in browser or server environments
- Verifying enclave integrity via hardware attestation (AMD SEV-SNP, Intel TDX, NVIDIA GPU)
- Implementing attestation in React Native / Expo apps

**References included:**

| Reference | Description |
|-----------|-------------|
| `api-sdk` | Full `@premai/api-sdk` SDK reference — chat, vision, audio, files, tools, DEK store, proxy |
| `prem-docs` | Official Prem documentation links — quickstart, API keys, billing, errors, rate limits, architecture |
| `reticle` | `@premai/reticle` hardware attestation SDK — AMD SEV-SNP, Intel TDX, NVIDIA GPU verification |
| `reticle-expo` | React Native / Expo attestation integration — BareKit worklet, dual-engine architecture |

## Installation

```bash
npx skills add prem-research/api-skills
```

## Usage

Skills are automatically available once installed. The agent will use them when relevant tasks are detected.

**Examples:**

- Set up the SDK in my Next.js app
- Add streaming chat completions with encryption
- Help me transcribe audio using the Prem Confidential API
- Generate a new CLIENT_KEK for my project
- Verify enclave attestation before sending data
- Implement attestation in my Expo app

## Skill Structure

Each skill contains:

- `skill.md` - Instructions for the agent
- `scripts/` - Helper scripts for automation (optional)
- `references/` - Supporting documentation (optional)

## License

See [LICENSE](./LICENSE).
