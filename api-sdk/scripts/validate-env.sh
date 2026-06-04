#!/usr/bin/env bash
set -euo pipefail

OK=1

check() {
  local name=$1 val=${!1:-}
  if [ -z "$val" ]; then
    echo "MISSING  $name"
    OK=0
  else
    echo "OK       $name"
  fi
}

check PREM_API_KEY
check CLIENT_KEK
check PROXY_URL
check ENCLAVE_URL

# Validate CLIENT_KEK is 64 hex chars (32 bytes)
if [ -n "${CLIENT_KEK:-}" ] && ! [[ "$CLIENT_KEK" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo "INVALID  CLIENT_KEK — must be 64 hex chars (32 bytes)"
  OK=0
fi

[ $OK -eq 1 ] && echo -e "\nAll env vars OK" || { echo -e "\nFix the above before running the SDK"; exit 1; }
