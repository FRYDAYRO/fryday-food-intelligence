#!/usr/bin/env bash
# Publică aplicația pe Cloudflare. Două variante, alegi cu FARA_BAZA:
#
#   bash scripts/publica-cloudflare.sh                 → aplicația CU rețete și costuri, protejată prin parolă
#   FARA_BAZA=1 bash scripts/publica-cloudflare.sh     → aplicația GOALĂ (fără date), poate rămâne deschisă
#
# Prima dată, pentru varianta protejată, setează parola echipei:
#   npx wrangler secret put FRYDAY_PAROLA
set -euo pipefail

if [ "${FARA_BAZA:-0}" = "1" ]; then
  echo "1/2 Construiesc varianta FĂRĂ date încorporate…"
  VITE_FARA_BAZA=1 npx vite build --base ./
  touch dist/.nojekyll
  echo "2/2 Public ca site static deschis (nu conține rețete sau costuri)…"
  npx --yes wrangler@latest pages deploy dist --project-name "${PROIECT:-fryday-fi-public}" --commit-dirty=true
  echo
  echo "GATA. Adresa e mai sus. Datele se încarcă din Setări → „Încarcă un instantaneu”."
  exit 0
fi

echo "1/2 Construiesc aplicația completă (cu rețete și prețuri)…"
npx vite build --base ./
touch dist/.nojekyll

echo "2/2 Public cu poartă de parolă…"
npx --yes wrangler@latest deploy

cat <<'NOTA'

GATA. Adresa apare mai sus.

La prima deschidere, browserul cere utilizator și parolă:
  utilizator: fryday        (schimbabil: npx wrangler secret put FRYDAY_UTILIZATOR)
  parola:     cea pusă cu   npx wrangler secret put FRYDAY_PAROLA

Dacă primești „Parola nu e configurată”, rulează:
  npx wrangler secret put FRYDAY_PAROLA
și apoi din nou acest script.
NOTA
