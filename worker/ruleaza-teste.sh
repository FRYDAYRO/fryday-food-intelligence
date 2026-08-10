#!/usr/bin/env bash
# Testează poarta de acces (fără Cloudflare, direct pe logică).
set -euo pipefail
cd "$(dirname "$0")"
npx --yes esbuild index.ts --bundle --format=esm --outfile=worker-compilat.mjs --log-level=error
node test-worker.mjs
rm -f worker-compilat.mjs
