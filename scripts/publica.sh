#!/usr/bin/env bash
# Publică aplicația pe GitHub Pages, cap-coadă, dintr-o singură comandă:
#   GH_TOKEN=ghp_xxx bash scripts/publica.sh          → repository PRIVAT (implicit)
#   GH_TOKEN=ghp_xxx PUBLIC=1 bash scripts/publica.sh → repository public
# Tokenul: https://github.com/settings/tokens/new — clasic, cu bifele „repo" și „workflow".
set -euo pipefail

REPO="${REPO:-fryday-food-intelligence}"
VIZ=$([ "${PUBLIC:-0}" = "1" ] && echo false || echo true)
API="https://api.github.com"
H=(-H "Authorization: token ${GH_TOKEN:?Setează GH_TOKEN}" -H "Accept: application/vnd.github+json")

LOGIN=$(curl -fsS "${H[@]}" "$API/user" | python3 -c "import sys,json;print(json.load(sys.stdin)['login'])")
echo "Cont: $LOGIN · repository: $REPO · privat: $VIZ"

# 1) repository (409/422 = există deja, mergem mai departe)
curl -fsS "${H[@]}" -X POST "$API/user/repos" \
  -d "{\"name\":\"$REPO\",\"private\":$VIZ,\"description\":\"FRYDAY Food Intelligence — platformă Food Cost\"}" \
  >/dev/null 2>&1 && echo "Repository creat." || echo "Repository existent — continui."

# 2) push
git remote remove origin 2>/dev/null || true
git remote add origin "https://x-access-token:${GH_TOKEN}@github.com/${LOGIN}/${REPO}.git"
git push -u origin main
echo "Cod publicat."

# 3) GitHub Pages, cu sursa „GitHub Actions"
curl -fsS "${H[@]}" -X POST "$API/repos/$LOGIN/$REPO/pages" \
  -d '{"build_type":"workflow"}' >/dev/null 2>&1 && echo "Pages activat." \
  || echo "Pages: activat deja sau necesită plan plătit pe repository privat (vezi nota de mai jos)."

echo
echo "Aplicația va fi la:  https://${LOGIN}.github.io/${REPO}/"
echo "Progresul build-ului: https://github.com/${LOGIN}/${REPO}/actions"
echo "Notă: pe contul GitHub gratuit, Pages funcționează doar pe repository PUBLIC."
echo "      Dacă activarea a eșuat, rulează din nou cu PUBLIC=1 sau fă repository-ul public din Settings."
