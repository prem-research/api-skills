---
name: prem-docs
description: Official Prem documentation. Use when onboarding to Prem, understanding the platform architecture, managing API keys, handling errors/rate limits, billing, or looking up raw API reference endpoints. Triggers on Confidential API docs, quickstart, API keys, billing, rate limits, attestation, security model, enclave architecture, Prem platform, prem.io, prem labs, prem, prem ai.
---

# Prem Documentation

Official docs for the Prem confidential AI platform. Load specific links below based on the task at hand.

Install official skill: `npx skills add docs.prem.io --yes`.

---

## Basics

| Topic | URL | Load when |
|-------|-----|-----------|
| Quickstart | https://docs.prem.io/basics/build/quickstart.md | Starting a new Prem integration from scratch — covers API key setup, env vars (PREM_API_KEY, PROXY_URL, ENCLAVE_URL), SDK install, local proxy, and first streaming chat completion |
| Overview | https://docs.prem.io/basics/build/overview.md | Need a navigation map of all Prem docs — chat, audio, auth, encryption, errors, recipes, architecture |
| Use LLMs / AI agents | https://docs.prem.io/basics/troubleshooting/use-llms.md | Loading Prem docs into an AI coding agent or editor (Claude Code, Cursor, Windsurf) via `npx skills add https://docs.prem.io/skill.md`, or discovering all doc pages via `llms.txt` |
| Contact us | https://docs.prem.io/basics/troubleshooting/contact-us.md | Need support — live chat via dashboard (minutes) or email support@premai.io (1 business day) |

---

## Developer Resources

| Topic | URL | Load when |
|-------|-----|-----------|
| Encryption | https://docs.prem.io/developer-resources/get-started/encryption.md | Understanding zero-knowledge architecture, KEK/DEK/RAG-DEK key hierarchy, XWing post-quantum KEM, XChaCha20-Poly1305 encryption, AES-KWP key wrapping, two-server model (gateway + enclave), or file encryption flow |
| API Keys | https://docs.prem.io/developer-resources/get-started/api-keys.md | Creating or rotating API keys (Dashboard → Developers → API Keys), setting IP restrictions (IPv4/IPv6/CIDR), applying least-privilege scopes, or understanding org-level key ownership |
| Errors | https://docs.prem.io/developer-resources/get-started/errors.md | Debugging error responses — JSON body has `status`, `error`, `support_id` fields; 400 bad request, 401 auth, 403 missing scope, 404 not found, 429 rate limited, 500/503 server errors; save `support_id` for support tickets (kept 1 week) |
| Rate Limits | https://docs.prem.io/developer-resources/get-started/rate-limits.md | Understanding rate limit types (RPS, TPM, tokens daily quota, concurrent requests, audio APM/daily quota), tier capacities (BASE to TIER_3), token bucket algorithm, handling 429 with exponential backoff + `Retry-After` header |

---

## Billing

| Topic | URL | Load when |
|-------|-----|-----------|
| Models & Pricing | https://docs.prem.io/developer-resources/billing/models-and-pricing.md | Comparing model costs (pay-as-you-go): chat input/output per 1M tokens, audio per minute; or choosing between Explorer (free, shared), Developer (dedicated), Enterprise (air-gapped) tiers |
| Balance | https://docs.prem.io/developer-resources/billing/balance.md | Understanding prepaid balance (requests blocked at zero), topping up (\$1 min via Stripe), or configuring auto top-up (threshold + target amount) |
| Limits | https://docs.prem.io/developer-resources/billing/limits.md | Monthly spending caps per tier (Base \$100, Tier 1 \$500, Tier 2 \$5k, Tier 3 \$20k), resets on 1st of month, adjustable via Dashboard |
| Payment | https://docs.prem.io/developer-resources/billing/payment.md | Adding/managing payment cards (stored via Stripe), setting default payment method for manual top-ups and auto-replenishment |
| Usage | https://docs.prem.io/developer-resources/billing/usage.md | Inspecting last 30 days of token usage (prompt/completion/reasoning tokens + cost per day), per-model breakdown, file storage size and count |

---

## API Reference

### API Keys

| Endpoint | URL | Load when |
|----------|-----|-----------|
| Get API key | https://docs.prem.io/developer-resources/reference/api-keys/get-api-key.md | `GET /developers/api_keys/{id}` — fetch single key with scopes, ip_allow_list, expires_at, usage metrics |
| Get API key analytics | https://docs.prem.io/developer-resources/reference/api-keys/get-api-key-analytics.md | `GET /analytics/api_keys` — success rates, latency percentiles (p50/p90/p95/p99), hourly breakdown, 30-day per-key metrics, top keys by usage |
| List API key scopes | https://docs.prem.io/developer-resources/reference/api-keys/list-api-key-scopes.md | `GET /developers/api_keys/scopes` — full list of available scopes: api_key.create/read/update/delete, users.read/update, chats.completion, tools.execute, files.encrypted.create/read, audio.transcription/translation |
| List API keys | https://docs.prem.io/developer-resources/reference/api-keys/list-api-keys.md | `GET /developers/api_keys` — all org keys with metadata (scopes, IPs, expiry, request count, last used) |
| Get API key request | https://docs.prem.io/developer-resources/reference/api-keys/get-api-key-request.md | `GET /developers/api_keys/requests/{id}` — single request log entry with full request/response bodies, headers, duration (ms), memory peak |
| List API key requests | https://docs.prem.io/developer-resources/reference/api-keys/list-api-key-requests.md | `POST /developers/api_keys/requests` — paginated request history with filters: api_key_id, date range, status (success/failed), HTTP method, search string; default limit 50 |

### Models

| Endpoint | URL | Load when |
|----------|-----|-----------|
| List models | https://docs.prem.io/developer-resources/reference/models/list-models.md | `GET /models?type=CHAT\|AUDIO_TRANSCRIPTION\|AUDIO_SPEECH\|IMAGE` — model id, type, name, description, input_modalities, enabled, price_config |

### Chats & Audio

| Endpoint | URL | Load when |
|----------|-----|-----------|
| Chat completions | https://docs.prem.io/developer-resources/reference/rvenc/chat-completions.md | `POST /rvenc/chat/completions` — raw encrypted REST schema; payload fields: encryptedInference, cipherText, nonce; SSE streaming with encrypted chunks (XChaCha20-Poly1305); OpenAI-compatible decrypted format |
| Audio transcriptions | https://docs.prem.io/developer-resources/reference/rvenc/audio-transcriptions.md | `POST /rvenc/audio/transcriptions` — encrypted multipart: encryptedInference, cipherText, nonce, encryptedFile, fileNonce, encryptedFileName, fileNameNonce; max 25MB; supports language, response_format (json/text/verbose_json), timestamp_granularities |
| Audio translations | https://docs.prem.io/developer-resources/reference/rvenc/audio-translations.md | `POST /rvenc/audio/translations` — same encrypted structure as transcriptions; Whisper-only, always translates to English; max 25MB; non-streaming |

---

## Recipes

| Topic | URL | Load when |
|-------|-----|-----------|
| Authentication | https://docs.prem.io/recipes/authentication.md | Working auth example: `createRvencClient` with apiKey + clientKEK, pre-generating encryption keys once via `generateEncryptionKeys()` for reuse across requests, custom requestTimeoutMs / maxBufferSize |
| Chat completions | https://docs.prem.io/recipes/rvenc-chat-completion.md | Code examples for: text chat, image analysis, document/receipt JSON extraction (`response_format: json_object`), product catalog from images, image Q&A, multi-image comparison, streaming vision |
| Audio transcription | https://docs.prem.io/recipes/audio-transcription.md | Code examples for: basic transcription (whisper-large-v3), language hint, verbose_json with word/segment timestamps, custom domain prompt for accuracy |
| Audio translation | https://docs.prem.io/recipes/audio-translation.md | Code examples for: basic translation to English, contextual prompt, verbose_json with detected language + duration |

---

## Learn More

| Topic | URL | Load when |
|-------|-----|-----------|
| What is Prem API | https://docs.prem.io/basics/learn-more/overview.md | Explaining the platform: TEE-based confidential computing, zero-knowledge guarantee, quantum-resistant encryption, OpenAI drop-in replacement, target use cases (healthcare, finance, legal, sensitive IP) |
| Developer Experience | https://docs.prem.io/basics/learn-more/developer-experience.md | Understanding the DX: encryption is invisible in app code, TypeScript SDK vs local proxy for other languages, standard OpenAI-style errors and rate limits |
| Platform Status & Roadmap | https://docs.prem.io/basics/learn-more/platform-status.md | Current production features (streaming, tool calling, Whisper/Deepgram, AMD SEV-SNP + Intel TDX + NVIDIA GPU attestation); gap: image reproducibility not yet available; roadmap: deterministic builds, Python/Go/Rust SDKs, enclave-to-enclave chaining, verification dashboard |

---

## Architecture & Security

| Topic | URL | Load when |
|-------|-----|-----------|
| How it works | https://docs.prem.io/basics/learn-more/how-it-works.md | Full request flow: SDK encrypts on device → proxy gateway (blind, sees only metadata) → sealed enclave decrypts + runs inference + re-encrypts → response decrypts on device; all supporting services (model router, LLM, vector DB, STT) run inside CVMs |
| Security model | https://docs.prem.io/basics/learn-more/security-model.md | What Prem cannot see (request content, keys, CVM data) vs can see (timing, payload sizes, API keys); protected against: network eavesdropping, server/cloud operator access, rogue employees, code tampering; not protected: hardware side-channels, compromised manufacturer keys, metadata |
| Attestation | https://docs.prem.io/basics/learn-more/attestation.md | 4-step flow (challenge → TEE-signed report → browser verification → decision); hardware: AMD SEV-SNP, Intel TDX, NVIDIA Hopper/Blackwell; Rust+WASM stack (`@premai/reticle`); GPU session binding; what to verify: code hashes, signature chains, debug disabled, nonce present |