#!/usr/bin/env bash
# Republică aplicația live (build nou → https://valentin845.github.io/fryday-fi/):
#   GH_TOKEN=ghp_xxx bash scripts/publica-app.sh
set -euo pipefail
npx vite build --base ./
touch dist/.nojekyll
cd dist
rm -rf .git && git init -b main -q
git config user.name "FRYDAY Food Intelligence" && git config user.email "fryday-fi@local"
git add -A && git commit -q -m "Build $(date +%Y-%m-%d\ %H:%M)"
git push -q --force "https://x-access-token:${GH_TOKEN:?Setează GH_TOKEN}@github.com/valentin845/fryday-fi.git" main
echo "Publicat: https://valentin845.github.io/fryday-fi/"
