#!/usr/bin/env bash
# Publică aplicația pe Cloudflare Pages, dintr-o comandă:
#   bash scripts/publica-cloudflare.sh
# La prima rulare se deschide browserul pentru autentificare în contul Cloudflare.
# Nu e nevoie de repository public: fișierele se urcă direct.
set -euo pipefail
PROIECT="${PROIECT:-fryday-fi}"

echo "1/3 Construiesc aplicația…"
npx vite build --base ./
touch dist/.nojekyll

echo "2/3 Public pe Cloudflare Pages (proiect: $PROIECT)…"
npx --yes wrangler@latest pages deploy dist --project-name "$PROIECT" --commit-dirty=true

cat <<'NOTA'

3/3 GATA. Adresa apare mai sus (ceva de forma https://fryday-fi.pages.dev).

IMPORTANT — protejarea datelor:
Aplicația conține rețetele și costurile FRYDAY, deci NU o lăsa deschisă public.
Pune o poartă de acces pe email, gratuit, în câteva minute:

  1. dash.cloudflare.com → Zero Trust → Access → Applications → Add an application
  2. Self-hosted · Application domain: fryday-fi.pages.dev
  3. Policy: Allow · Include → Emails ending in → @fryday.ro
     (sau Emails → lista exactă de adrese)
  4. Save

De atunci, oricine deschide adresa primește un cod pe email; doar adresele permise intră.
Gratuit până la 50 de utilizatori.
NOTA
