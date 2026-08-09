# FRYDAY Food Intelligence — context pentru Claude Code

Aplicație React + TypeScript pentru managementul Food Cost și al profitabilității rețelei FRYDAY.
24 module, motor de calcul pur, 421 de teste automate.

## Comenzi

```bash
pnpm dev          # dezvoltare, http://localhost:5173
pnpm test         # TOATE cele 13 suite (421 teste) — rulează-le după orice modificare în src/lib
pnpm typecheck    # tsc -b, strict, zero erori acceptate
pnpm build        # build de producție
```

## Arhitectură — regula de aur

Dependențele merg **într-o singură direcție** și nu se inversează niciodată:

```
engine.ts → decizii.ts → portofoliu.ts / simulare.ts → strategie.ts / scoruri.ts / timeline.ts
                                                     → reconciliere.ts
```

- Tot ce e în `src/lib/` este **pur**: fără React, fără acces la DOM, fără efecte secundare.
  Orice funcție de acolo trebuie să poată fi testată din Node, fără browser.
- `src/views/` conține doar interfață. **Nicio formulă de business în views.**
  Dacă un ecran are nevoie de un calcul nou, funcția se scrie în `lib/` și se testează acolo.
- Un motor nou se adaugă ca fișier separat în `lib/`, nu prin umflarea lui `engine.ts`.

## Invariante care nu se încalcă

1. **Costul istoric nu se rescrie.** `costProdus(cod, canal, ctx, data)` folosește versiunea de rețetă
   în vigoare la `data` (`versiuneLa`), nu versiunea activă azi. Data sentinelă `9999-12-31` și
   datele viitoare înseamnă „azi" și folosesc versiunea activă.
2. **Prețurile ingredientelor sunt datate.** Costul unei vânzări din iunie folosește prețul din iunie.
3. **Simulările nu ating datele reale.** `aplicaScenariu` lucrează pe o copie a modelului;
   doar `aplicaInDate`, apelat explicit după confirmarea utilizatorului, scrie în stare — și
   întotdeauna prin versiuni noi datate, niciodată prin suprascriere.
4. **Total = InStore + Delivery ca sume**; procentele se recalculează din totaluri, nu se mediază.
5. **Nicio cifră fără explicație.** Scorurile și recomandările poartă o structură `Explicatie`
   (date, logică, calcule, impact, nivel de încredere). Dacă adaugi un scor nou, adaugi și explicația.

## Testare

- Fiecare suită din `teste/` importă direct din `../src/lib` și verifică **numeric**, nu prin snapshot.
- Testele bune aici verifică o identitate independentă de implementare
  (ex. `Δcost = Δpreț × consum lunar`, `Σ contribuții = 100%`, `EBITDA = marjă − labor − operare`),
  nu doar că funcția returnează ce returnează azi.
- Când un test pică după o schimbare de comportament intenționată, **întreabă-te întâi dacă
  testul avea dreptate**. Istoric, două corecții reale au fost găsite exact așa.

## Convenții

- Interfața și comentariile sunt **în română**. Diacriticele contează.
- Numele funcțiilor și tipurilor sunt în română când descriu domeniul (`costProdus`, `versiuneLa`,
  `oportunitati`), în engleză când sunt termeni consacrați (`Ctx`, `RandProdus.roi`).
- Formatarea numerelor trece prin `fmtLei`, `fmtPct`, `fmtPP`, `fmtInt` din `engine.ts` — locale `ro-RO`.
- Fără biblioteci noi fără motiv serios: dependențele sunt doar `react`, `react-dom`, `recharts`, `xlsx`.

## Ce urmează (prioritizat)

1. Import de **Waste** — deblochează descompunerea variance-ului și Restaurant Performance Index.
2. **Inventar** — consum real vs teoretic.
3. **AOV și bonuri** din Sales Report NBO — completează analiza promoțiilor.
4. Portare pe server (NestJS + PostgreSQL): motorul e pur și acoperit de teste, suita devine regresia.

## Date reale (iulie 2026)

Aplicația pornește cu date reale, nu cu seed demo. Sursele stau în `date-sursa/`, iar
`src/lib/date-reale.ts` este **generat** — nu se editează manual:

```bash
node scripts/converteste-date-reale.mjs   # necesită pdftotext (poppler-utils)
```

Cele două rapoarte **nu acoperă același domeniu**, deci stau pe locații separate:

| Locație | Sursă | Domeniu | Perioadă |
|---|---|---|---|
| `NET` | 4.7 Sales Mix | 30 de restaurante | 27–31 iulie 2026 |
| `CLUJ` | 2.9 Cluj Memo | doar FRYDAY CLUJ MEMO | 1–31 iulie 2026 |

De aceea vederea „Toată rețeaua" (`RETEA` = fără filtru) **nu** e un FC real: ar împărți
consumul lunar al unei locații la vânzările pe 5 zile ale rețelei. Aplicația pornește pe `NET`,
iar Executive Cockpit respectă locația selectată (nu mai e fixat pe `RETEA`).

Prețurile de listă vin din etapa **03.08.2026**, pe canale:

- **instore** — `CR_IT_CENTRALIZAT.xlsx`, foaia „8. Preturi INSTORE RO";
- **delivery** — `PRETURI_DELIVERY_UPDATE.xlsx`, coloanele **după discount**
  („Preț actual (după discount)" → „Preț NOU DUPĂ discount"). Fișierul e revizia
  ulterioară a foii „9. Preturi DELIVERY RO" din CR–IT; unde diferă, are prioritate,
  iar divergențele sunt raportate ca avertisment de convertor.

Prețul anterior și cel nou se adaugă **datate** în `istoricPret`; `pretInstore`/`pretDelivery`
țin doar valoarea în vigoare. Nu se suprascrie nimic (invarianta 1).

Verificări care trebuie să rămână adevărate:
- suma categoriilor 2.9 = totalul raportului (248.655) — verificată în convertor;
- `CLUJ` → `fcOp` = 44,85% și net = 554.382, adică exact cifrele din antetul raportului 2.9;
- `NET` → `fcTeoretic` = 41,31% din rețete × PMIX.

`seed.ts` rămâne, dar doar ca fixture pentru teste.

## Limite cunoscute (nu sunt bug-uri)

- FC operațional / Curat / Paper doar pe Total: raportul 2.9 nu conține canalul.
- 8% din valoarea brută a raportului 4.7 (93 articole) nu are corespondent în nomenclatorul
  xlsx (ex. „Pepsi-Cola 500ml", „APPLE TOFFEE FRYPIE 2X"), deci vânzările pe `NET` sunt
  subevaluate cu acea sumă, iar FC-ul teoretic e ușor supraevaluat. Lista completă apare
  în Importuri → avertismente; se închide cu un nomenclator extins, nu din cod.
- `CLUJ` nu are mix pe produs (2.9 nu îl conține), deci `fcTeoretic` e 0 acolo — se folosesc
  `fcOp` / `fcCurat`.
- Proiecția de profit este o regresie liniară pe istoric, fără sezonalitate — și e declarată ca atare în UI.
- Aplicația e mono-utilizator; starea trăiește în `localStorage` (local) sau `window.storage` (artifact).
