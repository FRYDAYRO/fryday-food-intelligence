# FRYDAY Food Intelligence — RC 9

Aplicație de management Food Cost, profitabilitate și decizii de business pentru rețeaua FRYDAY.
**24 module · 421 teste automate · motor de calcul pur, fără dependențe de server.**

---

## Rulare locală

Ai nevoie de **Node.js 20+**. Recomandat `pnpm`, dar merge și cu `npm`.

```bash
pnpm install          # sau: npm install
pnpm dev              # sau: npm run dev
```

Se deschide pe `http://localhost:5173`. Aplicația pornește cu un set de date demo
(2 restaurante, 8 produse, 21 ingrediente, 2 luni de PMIX) și persistă automat în
`localStorage`, deci modificările rămân între sesiuni.

### Alte comenzi

```bash
pnpm typecheck        # verificare TypeScript strict, fără emisie
pnpm test             # rulează toate cele 13 suite de teste (421 de teste)
pnpm build            # build de producție în dist/
pnpm preview          # servește build-ul de producție
```

Testele nu au nevoie de browser: fiecare suită se compilează cu esbuild și rulează în Node,
direct pe motorul real din `src/lib`.

---

## Structura proiectului

```
src/
├─ App.tsx                shell-ul aplicației, cele 24 de module, selectoarele globale
├─ index.css              tema FRYDAY
├─ lib/                   MOTOARELE (funcții pure, testabile fără interfață)
│  ├─ types.ts            modelul de date
│  ├─ engine.ts           calcul: costuri, Food Cost, agregate, simulări, alerte
│  ├─ decizii.ts          decizie: drivere, graf de dependențe, optimizări, narativ, cockpit
│  ├─ portofoliu.ts       portofoliu de meniu, promoții, furnizori
│  ├─ simulare.ts         Business Simulation: „ce se întâmplă dacă…"
│  ├─ strategie.ts        Business Strategy: decizii de rețea, cont de profit, EBITDA
│  ├─ scoruri.ts          Product Health Score, risc pe ingrediente, reguli de business
│  ├─ timeline.ts         ciclul de viață al produsului
│  ├─ reconciliere.ts     calitatea datelor după import
│  ├─ importer.ts         import Excel/CSV, 7 tipuri de fișiere
│  ├─ seed.ts             datele demo (deterministe, cu seed fix)
│  ├─ store.tsx           starea aplicației + persistență
│  └─ ui.tsx              componentele vizuale comune
├─ views/                 cele 24 de module de interfață
└─ main.tsx               punctul de intrare
teste/                    13 suite, rulate cu `pnpm test`
```

Dependențele merg într-o singură direcție:
`engine → decizii → portofoliu / simulare → strategie / scoruri / timeline`.
Niciun motor nu depinde de interfață, deci întregul strat de calcul poate fi portat
pe server (NestJS + PostgreSQL) fără rescriere, iar suita de teste devine regresia portării.

---

## Modulele

| Grup | Module |
|---|---|
| Executiv | Executive Cockpit · Opportunity Board · Dashboard (5 roluri) |
| Date | Master Data · Rețetar · Import Center (+ Reconciliere) · Setări |
| Analiză | Food Cost · Product Analytics · Ingredient Intelligence · Profit Intelligence · Topuri |
| Decizie | Decision Intelligence · Health & Risk · Menu Engineering · Recomandări · Alerte |
| Simulare | Business Simulation · Business Strategy · Product Impact · Product Timeline |
| Dezvoltare | R&D Lab · Supplier Intelligence |

---

## Date reale

Import Center acceptă **7 tipuri de fișiere**: Nomenclator, Rețetar, Cost Ingrediente,
PMIX, Sales Report NBO, Raport NBO 2.9 și Prețuri Furnizori. Coloanele sunt detectate
automat, dar pot fi mapate manual înainte de import.

**Înainte de a te baza pe rapoarte**, deschide `Import Center → Reconciliere & calitatea datelor`.
Ecranul îți spune acoperirea rețetarului, codurile nemapate, diferența PMIX ↔ Sales Report,
starea raportului 2.9 și un scor de încredere 0–100 cu ce anume trebuie corectat.

---

## Limite cunoscute

- Food Cost operațional, Curat și Paper Cost se calculează doar pe Total: raportul 2.9 nu are canal.
- Waste și inventarul nu sunt încă în model, deci variance-ul nu poate fi descompus pe cauze.
- AOV și numărul de bonuri există în Sales Report, dar nu sunt încă folosite.
- Aplicația este mono-utilizator, fără autentificare — datele stau în browser.


## Publicarea online

Aplicația e un singur fișier static — orice găzduire de fișiere statice o poate servi.

**GitHub Pages (recomandat, automat).** Workflow-ul `.github/workflows/pages.yml` e inclus, iar `scripts/publica.sh` face totul dintr-o comandă:
```bash
GH_TOKEN=ghp_xxx bash scripts/publica.sh          # repository privat
GH_TOKEN=ghp_xxx PUBLIC=1 bash scripts/publica.sh # repository public (necesar pe contul gratuit)
```
Tokenul se creează la github.com/settings/tokens/new (clasic, bifele „repo" + „workflow") și poate fi revocat imediat după.
De la primul push încolo, fiecare `git push` republică automat aplicația la `https://<utilizator>.github.io/<repo>/`.

**Netlify / Vercel (fără cod).** Trage arhiva `FRYDAY-FI-publicare-online.zip` (sau folderul `dist/` după `npx vite build --base ./`) în Netlify Drop — primești un URL pe loc.

**Important:** găzduirea online publică *aplicația*, nu datele. Datele rămân în browserul fiecărui utilizator; pentru aceleași cifre la CEO se folosește instantaneul din Setări (Descarcă / Încarcă). Date comune în timp real = faza de server (NestJS + PostgreSQL), pentru care motorul pur e deja pregătit.
