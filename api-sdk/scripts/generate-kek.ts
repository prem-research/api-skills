#!/usr/bin/env bun
import { generateNewClientKEK, getClientKID } from '@premai/api-sdk'

const kek = generateNewClientKEK()
const kid = getClientKID(kek)

console.log(`CLIENT_KEK=${kek}`)
console.log(`KID=${kid}`)
console.log('\nStore CLIENT_KEK in your secrets manager. KID is the storage key for the DEK store.')
