#!/usr/bin/env bun
import createRvencClient from '@premai/api-sdk'

console.log('Testing connection...')

try {
  const client = await createRvencClient({
    apiKey: process.env.PREM_API_KEY!,
    clientKEK: process.env.CLIENT_KEK,
    attest: false,
    config: {
      endpoints: {
        proxy: process.env.PROXY_URL,
        enclave: process.env.ENCLAVE_URL,
      },
    },
  })
  const models = await client.models.list()
  console.log(`OK — connected. ${models.length} models available.`)
} catch (err) {
  console.error('FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
}
