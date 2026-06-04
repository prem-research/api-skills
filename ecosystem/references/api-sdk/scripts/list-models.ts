#!/usr/bin/env bun
import createRvencClient from '@premai/api-sdk'

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

const byType: Record<string, typeof models> = {}
for (const m of models) {
  if (!byType[m.type]) byType[m.type] = []
  byType[m.type].push(m)
}

for (const [type, list] of Object.entries(byType)) {
  console.log(`\n## ${type}`)
  for (const m of list) console.log(`  ${m.model}  —  ${m.name}`)
}
