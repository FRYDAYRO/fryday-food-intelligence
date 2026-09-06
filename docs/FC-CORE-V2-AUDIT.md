# FC CORE V2 — AUDIT REPORT

**Repository:** FRYDAYRO/fryday-food-intelligence · **Branch:** `claude/fc-core-v1-audit-7i7cga`
**Scope:** audit only — no application file was modified.
**Baseline verified:** `pnpm typecheck` clean · `pnpm test` = **773 passed, 0 failed** (28 suites).
*(`CLAUDE.md` still claims "421 teste / 13 suite" — stale, see R-9.)*

---

## 0. What was inspected

All of `src/lib/*` (18 files, ~5 000 lines), all of `src/views/*` (27 files, ~5 500 lines),
`teste/*` (28 suites), `package.json`, `tsconfig.*`, `vite.config.ts`, `.github/workflows/ci.yml`,
`scripts/ruleaza-teste.mjs`, and the embedded production dataset `src/date/baza-fryday.json`.

The embedded FRYDAY base is the single most informative artefact in the repo:

| | |
|---|---|
| Ingredients | 151 (44 `PACKAGING`, 107 `FOOD`) |
| Products | 160 — **0 combos**, all `SIMPLU` |
| Recipes | 160, **exactly one version each**, all dated `2026-08-01` |
| Recipe lines | 591 — 579 `AMBELE`, 7 `DELIVERY`, 5 `INSTORE`, 156 `AMBALAJ` |
| Sales / SalesReport / 2.9 / waste / inventory | **0 rows each** |
| Locations | **0** |
| `codPos` populated | **0 of 160** |
| Product code = | the commercial name itself (`HAMBURGER`, `DUBLU CHEESEBURGER`, …) |

That last row is the defining architectural fact of this codebase and drives half of this report.

---

## A. What already works correctly

**A1. The cost kernel is genuinely correct and genuinely pure.**
`engine.ts` `costProdus` / `costLinie` / `costSemipreparat` handle unit conversion, gross-vs-net
yield (`cantBruta`), semi-finished goods with yields, cycle protection, combo explosion, and
per-channel line filtering. Memoisation is keyed on `(product, channel, date)`. No React, no DOM,
no I/O anywhere in `lib/*.ts`. It runs from Node, which is why the 773-test suite exists at all.

**A2. Dated costing is real, not decorative.** `pretLa(ing, data)` and `versiuneLa(reteta, data)`
resolve the price and the recipe version in force *on the sale date*. The `9999-12-31` sentinel and
`AZI_ISO()` guard mean "today and later" deliberately use the active version, so a manual
reactivation of an old version is respected. Invariant 1 in `CLAUDE.md` holds.

**A3. Coverage is measured and reported honestly.** `agregatePerioada` tracks `netFaraReteta` and
`acoperire`; `fcPerioada` publishes both `fcTeoretic` (over all sales) and `fcTeoreticAcoperit`
(over the recipe-covered part), with an in-code comment explaining exactly why the second is the
comparable number. This is unusually disciplined and is the right foundation for an FC Control Tower.

**A4. Simulations do not touch real data.** `aplicaScenariu` deep-copies ingredients, recipes and
products before mutating. `aplicaInDate` is the only writer, and it writes **new dated versions**,
never overwrites. Invariant 3 holds.

**A5. The import layer is the most mature part of the application.**
`auto.ts` does content-based column inference (`scorCod`, `scorPret`, `scorUM`, `scorData`,
`esteIndexRand`…), finds the header row anywhere in the first 25 rows, handles multi-sheet
workbooks, and refuses ambiguous types without an explicit signal (`NECESITA_SEMNAL`). The 4.7 PDF
path validates itself against the report's own `Total` row and reports "difference zero" or refuses.
The FC_BAZA import cross-checks calculated cost against the declared `MC` per product **and**
diagnoses the root cause (NOMENCLATOR vs RETETAR price divergence). This is production-grade.

**A6. Re-import is idempotent.** PMIX/SALES_MIX replace on `data|locatie|canal|produs`, FC29 on
`perioada|locatie`, waste/inventory on `locatie|perioada`. No duplication on re-run.

**A7. Menu-component double-counting is already solved.** SALES_MIX excludes zero-price lines that
belong to a defined combo, and says how many bucăți it excluded and why.

**A8. Data-quality reporting largely exists.** `reconciliere.ts` produces coverage, PMIX↔Sales
divergence against a configurable tolerance, unmapped codes split by cause (`FARA_NOMENCLATOR` vs
`FARA_RETETA`), unclassified 2.9 categories, import batches with errors, a 0–100 confidence score
and a `FIABIL / CU_REZERVE / INSUFICIENT` verdict. Requirement 13 is ~70 % delivered.

**A9. Variance decomposition into recipe / waste / unexplained works**, and correctly returns
`null` — not `0` — for the unexplained part when inventory is missing (`varianceDetaliat`).

**A10. Every score carries an `Explicatie`** (`scoruri.ts`: date, logică, calcule, impact,
încredere). Invariant 5 holds. This is the honest foundation the "AI Advisor" (req. 12) needs.

**A11. Performance is adequate at current scale.** Measured on the real 160-product base with a
synthetic 30-day PMIX:

| | 3 stores (25 470 rows) | 20 stores (169 800 rows) |
|---|---|---|
| `perProdus` | 50 ms | — |
| `fcPerioada` (one level) | 48 ms | — |
| `consumuriLuna` | 31 ms | — |
| `alerte` | 64 ms | — |
| `recomandari` | 273 ms | — |
| Full `FoodCost.tsx` render | ~400 ms | **962 ms** |

---

## B. What is incomplete

| # | Requirement | State |
|---|---|---|
| B1 | **5 — Paper normalization** | **Not implemented, and blocked by the type system.** `Linie29` is `{perioada, locatie, categorie, valoare}` — *category*-level. Identifying "materials present in NBO but not represented in recipes" requires *material*-level 2.9 lines. There is no such structure and no such reconciliation anywhere. |
| B2 | **6 — Operational categories** | Collapsed into one bucket. `Clasa29 = 'FOOD' \| 'PAPER' \| 'EXCLUS'` — cleaning, uniforms, stationery and operational supplies all land in `EXCLUS` with no sub-classification and no separate reporting line. |
| B3 | **3 — Reconciliation / FC Bridge** | A single delta exists (`variancePP`, `varianceLei` = Curat − Teoretic). There is **no bridge** — no ordered, named decomposition (recipe → coverage gap → paper → operational → waste → unexplained) that sums back to the observed difference. |
| B4 | **9 — Weekly periods** | Weekly granularity exists **only for product series** (`cheiePerioada`, `evolutieGranulara`, `serieProdus`). The whole FC engine — `fcPerioada`, `agregatePerioada`, `varianceDetaliat`, `consumuriLuna`, `reconciliaza`, `alerte` — is hard-wired to `AAAA-LL` month strings. There is no weekly FC. |
| B5 | **8 — Store-level analysis** | Works *if* PMIX carries a location. But the 4.7 report is network-aggregated: `importer.ts` writes `locatie = 'AGREGAT'` and warns "analizele pe locație nu pot separa unitățile". `App.tsx` even ships a dedicated banner for managers who see an empty app because of this. Store-level FC is therefore unreachable through the primary import path. |
| B6 | **9 — Historical comparison** | `FoodCost.tsx` compares to the previous month only. No multi-period trend, no week-over-week, no year-over-year at FC level. |
| B7 | **1 — Recipe FC identity** | The link PMIX → product is **name-based only** (`cheieDenumire` + `aliasuri`). `codPos` is populated for 0 of 160 products. See R-1. |
| B8 | **12 — AI Advisor** | `decizii.ts` `narativExecutiv` / `cockpit` and `engine.recomandari` produce data-backed narratives; nothing invents explanations. But they are framed around profit/menu decisions, not FC movement attribution — because the FC bridge (B3) that would supply the attribution does not exist. |
| B9 | **13 — Data quality** | Missing: duplicate-record detection, missing-period detection, and ingredients-without-prices as an explicit check (only surfaced as an import warning, not as a standing quality signal). |

---

## C. What conflicts with the FC-only scope

Everything below computes or displays P&L, which the brief places **out of scope**.

| File | Conflicting content |
|---|---|
| `src/lib/strategie.ts` (208 L) | Builds a full P&L: `vânzări → Food & Paper → Labor → Prime Cost → costuri operare → EBITDA`. `RezultatStrategie` carries `labor0/1`, `operare0/1`, `ebitda0/1`, `ebitdaPct0/1`, `cont: LinieCont[]`. Also models `restauranteNoi` / `rampaPct` (network expansion). **Entirely out of FC scope.** |
| `src/lib/simulare.ts` | `RezultatSimulare` carries `labor`, `laborPct0/1`, `prime0/1`, `dPrimePP`; answer #2 of the eight canned answers is "Cum se modifică Prime Cost?". The Food-Cost half is in scope and is good; the Labor/Prime half is not. |
| `src/views/BusinessStrategy.tsx` (222 L) | Renders the EBITDA P&L statement and a scenario comparison table on EBITDA/month and EBITDA/year. |
| `src/views/Setari.tsx` | Two editable tables: **Cost de personal (Labor)** and **Costuri de operare — pentru EBITDA** (chirie / utilități / altele). |
| `src/lib/types.ts` | `CostLabor`, `CostOperare`, `Setari.tintaLaborPct` — state that only P&L consumes. |
| `src/lib/seed.ts`, `seed-nbo.ts` | Seed `labor` and `costuriOperare`. |
| `src/views/RnDLab.tsx` | References labor/prime in its economics. |
| `teste/test-str.ts` (45 tests), part of `test-bse.ts` (44 tests) | Cover the EBITDA/Prime-Cost paths. |

**Also structurally wrong regardless of scope:**

| File | Problem |
|---|---|
| `src/lib/Setari.tsx` (154 L) | **A React component inside `src/lib/`.** Violates the golden rule in `CLAUDE.md` ("tot ce e în `src/lib/` este pur: fără React"). Verified **dead** — imported by nothing in `src/` or `teste/`. It is a stale fork of `src/views/Setari.tsx` (missing the server panel, the commission field and the snapshot import). |
| 8 view files | Business formulas computed inline in JSX — see R-8. |

---

## D. Where Delivery-commission logic lives

The brief puts Delivery commission out of scope. It is currently woven through the engine, not
bolted on the side — removing it is a real refactor, not a deletion.

| Location | What |
|---|---|
| `types.ts:129` | `Setari.comisionDeliveryPct?: number` |
| `engine.ts:25,28-34` | **`Ctx` itself carries `comisionDeliveryPct`.** `buildCtx` reads it from `state.setari`. Every consumer of `Ctx` transitively depends on it. |
| `engine.ts:201` | `agregatePerioada` accumulates `netDelivery` — *only for rows with a computable cost* (commission base = covered part) |
| `engine.ts:227-230, 254-257` | `RandProdus.netDelivery / comision / profitReal / fcReal`; `perProdus` computes them — here over **all** Delivery net (see BUG-8) |
| `engine.ts:351-354, 472-487` | `RezultatFC.netDelivery / comisionLei / profitReal / fcDeliveryAparent / fcRealDelivery`; `fcPerioada` runs a **second** `agregatePerioada` pass just for the Delivery view |
| `engine.ts:576` | `aplicaScenariu` rebuilds the simulated `Ctx` with the commission |
| `views/FoodCost.tsx:142-162` | Whole "Economia Delivery" section |
| `views/Dashboard.tsx:129-130` | "Comision Delivery" KPI tile |
| `views/Topuri.tsx:75,113-144` | `fcReal` / `comision` / `profitReal` sortable columns + footer totals |
| `views/Setari.tsx:116-117` | The commission % input |
| `seed.ts:40,337`, `seed-nbo.ts:186`, `date/baza-fryday.json` | Seeded at 16 % |
| `teste/test-com.ts` | 22 tests, entirely about commission |

---

## E. Can PMIX 4.7 be reliably connected to recipes and ingredient costs?

**Costs: yes. Products: only by name, and that is fragile.**

*The chain that works.* Ingredient prices are dated and stored in base UM; `fcbaza.ts` converts the
per-recipe-UM cost from NOMENCLATOR into base UM (`cost / UMS[um].f`); recipes are versioned;
`costProdus` resolves both by date. The FC_BAZA import cross-checks calculated cost against the
declared `MC` per product and, when they diverge, names the responsible ingredient. Solid.

*The chain that is fragile.* The 4.7 report **has no product codes** — `salesmix.ts` says so in its
own header comment. Matching runs `POS name → despartaCanal() → cheieDenumire() → aliasuri`.
The FC_BAZA import then sets `cod = numeBazaComercial(denumire)` — **the product's primary key is
its commercial name.** In the shipped base, `codPos` is set for 0 of 160 products.

Consequences:

1. Renaming a product in NBO or in the FC base creates a **new product** and orphans all history.
2. `cheieDenumire` strips the standalone tokens `d`, `m`, `md`, `new`, `nou` **anywhere** in the
   string, not only as a suffix — collision risk on legitimate names.
3. `despartaCanal` infers channel from a trailing `" D"` / `" MD"` / `" M"`. Any product whose real
   name ends in those letters is silently reclassified.
4. Unmatched names fall into `state.nemapate` for assisted mapping (good — `Nemapate.tsx` exists and
   `atribuieAlias` persists the alias on the product), but this is manual remediation of a structural
   gap, not a fix.

**Verdict:** works today because someone keeps the names aligned by hand. Not a foundation for a
Control Tower. See PR-2.

---

## F. Can 2.9 be reconciled to recipe-based FC?

**Only as a single opaque delta. A real bridge is not currently possible.**

What exists: `fcPerioada` returns `varianceLei = consumCurat − ag.cost` and
`variancePP = fcCurat − fcTeoretic`. Three obstacles stand between that and requirement 3:

1. **Granularity mismatch.** 2.9 arrives as `{perioada, locatie, categorie, valoare}`; recipe cost
   is per ingredient. There is no join key. Category totals cannot be attributed to ingredients.
2. **Base mismatch (BUG-7).** `consumCurat` covers **all** sales; `ag.cost` covers **only** sales of
   products that have a recipe. The delta therefore silently absorbs the cost of unmapped products
   and reads as operational loss.
3. **Paper is not comparable.** `fcPaper` uses `paper29` when 2.9 exists, else the theoretical
   `ag.costPaper`. But `clasifica` defaults **unmatched categories to FOOD**, and the shipped base
   has exactly one PAPER rule (`ambalaje`). Any real 2.9 with packaging categories worded
   differently books packaging as Food, and the theoretical/actual Paper comparison is meaningless.

---

## G. How normalization is currently represented

There are **three distinct, unrelated mechanisms**, none of which is "paper normalization" in the
sense of requirement 5:

1. **Text normalization** — `engine.norm()`: lowercase, strip diacritics, collapse punctuation.
   Used for header matching and rule matching. *(Not applied consistently — see BUG-6.)*
2. **Name normalization for matching** — `salesmix.cheieDenumire()` and `fcbaza.numeBazaComercial()`.
3. **Packaging classification** — `nbo.esteAmbalaj(denumire)`: an 18-word Romanian/English keyword
   list (`hartie, cutie, punga, ambalaj, folie, pahar, capac, tacam, servet, caserola, box, bag,
   wrap, cup, lid, napkin, tava`) matched against the **ingredient name**. This sets
   `Ingredient.tip = 'PACKAGING'`, which `costLinie` turns into the `paper` component.

**Mechanism 3 is the only thing resembling normalization, and it is a substring heuristic on a
free-text name.** It has already produced two live misclassifications in the shipped base (BUG-5).
There is no material-level 2.9, no "in NBO but not in any recipe" detection, and no normalized
material master. **Requirement 5 has no implementation to build on.**

---

## H. How Store and Company aggregation works

The pattern is uniform and clean: a `locatie?: string` filter where `undefined` means "whole
network". `fcPerioada(state, ctx, luna, locatie)` maps `'RETEA' → undefined` and every downstream
filter is `if (loc && x.locatie !== loc) continue`.

Company-level totals are **recomputed from raw sales rows**, never averaged from store-level results
— so invariant 4 (`Total = InStore + Delivery as sums`) holds by construction.

Two structural problems:

- **The primary import path destroys the store dimension.** SALES_MIX assigns `'AGREGAT'` when the
  4.7 report covers more than one restaurant. Per-store import requires one file per restaurant
  (the batch importer at `Importuri.tsx:78-120` supports this — but it depends on the operator
  exporting that way).
- **There is no `locatie` on `Ingredient`, `Produs` or `Reteta`.** Recipes and prices are global.
  A per-store recipe variant or a per-store purchase price cannot be represented.

Also: `FoodCost.tsx` re-runs `fcPerioada` for `RETEA` + every location + both months on every render
— 2×(1+N) full passes over the sales array. **962 ms measured at 20 stores.**

---

## I. How weekly/monthly periods work

**Monthly** is the only real period. `luna(data) = data.slice(0,7)` is the key everywhere:
`agregatePerioada`, `perProdus`, `fcPerioada`, `consumuriLuna`, `varianceDetaliat`, `reconciliaza`,
`alerte`, `recomandari`, `simuleaza`, `Linie29.perioada`, `WasteFapt.perioada`,
`InventarFapt.perioada`, `CostLabor.luna`. `lunaAnterioara` / `lunaPrec` give month-over-month.

**Weekly** exists as `cheiePerioada(data, 'SAPTAMANA')` — a correct ISO-8601 week key
(`2026-S29`) — but it is consumed by only three call sites, all product-level:
`evolutieGranulara`, `serieProdus`, and `ProfitIntelligence.tsx`.

**The gap:** the ISO week primitive is correct and tested (`test-pi.ts:20`). Nothing in the FC engine
uses it. 2.9, waste and inventory are month-stamped by type, so weekly FC Curat is impossible
without a data-model change.

**Compounding problem:** SALES_MIX stamps a multi-day report onto a **single date**
(`importer.ts:704-706` — "POS-ul nu dă defalcarea pe zi: totalul a fost înregistrat pe {data}").
A 5-day report becomes one day. A report straddling a month boundary lands entirely in one month.
Any weekly FC built on this data would be fiction.

---

## J. What tests already cover

773 tests, 28 suites, all numeric assertions against independent identities (no snapshots), all
importing directly from `../src/lib`. CI runs `typecheck → test → build` on every push and PR.

| Suite | Tests | Covers |
|---|---|---|
| `test-di.ts` | 65 | Decision Intelligence, cost components, drivers, lifecycle |
| `test-p3.ts` | 51 | Portfolio, cannibalisation, promotions |
| `test-sm.ts` | 45 | 4.7 Sales Mix parsing, channel suffixes, PDF text reconstruction |
| `test-str.ts` | 45 | Business Strategy — *P&L / EBITDA (out of scope)* |
| `test-bse.ts` | 44 | Business Simulation |
| `test-sc.ts` | 43 | Scores, health, `Explicatie` |
| `test-fcb.ts` | 43 | FC_BAZA parser (nomenclator + rețetar + food cost) |
| `test-nboimp.ts` | 40 | NBO recipe-card import |
| `test-tl.ts` | 40 | Timeline, trajectory, projection |
| `test-gol.ts` | 32 | Empty state, migration, FRYDAY defaults |
| `test-pret.ts` | 25 | Dated ingredient prices |
| `test-importer.ts` | 24 | Header mapping, type detection |
| `test-auto.ts` | 23 | Content-based column inference |
| `test-engine.ts` | 23 | UM conversion, `costProdus`, `versiuneLa`, combos |
| `test-waste.ts` | 23 | Waste + inventory + variance decomposition |
| `test-com.ts` | 22 | Delivery commission — *out of scope* |
| `test-nbo.ts` / `test-pi.ts` / `test-impact.ts` | 21 each | NBO cards / product analytics / ingredient impact |
| `test-nemapat.ts` | 18 | Unmapped names, alias assignment |
| `test-meniu.ts` / `test-menu-alerte.ts` | 17 each | Combos / menu engineering + alerts |
| `test-fc.ts` | 15 | `fcPerioada`, 2.9 classification |
| `test-rc2.ts` / `test-rc.ts` | 14 / 13 | Reconciliation |
| `test-upd.ts` / `test-pdf.ts` / `test-eroare.ts` | 11 / 9 / 8 | Updates / PDF / error paths |

**Assessment:** coverage of the *cost kernel* and the *import layer* is genuinely strong. Coverage
of the *FC control-tower semantics* (bridge, paper/operational split, store×period aggregation) is
thin — `test-fc.ts` has only 15 tests for the single most important function in the application.

---

## K. What tests are missing

Ordered by risk. Every one of these must exist **before** the corresponding implementation step.

**K1 — Simulation × dated recipe versions.** Nothing asserts that a `GRAMAJ` / `INGREDIENT` /
`ADAUGA_LINIE` / `ELIMINA_LINIE` change is visible at a *past* `dataRef`. BUG-1 lives in exactly
this hole.

**K2 — The FC bridge identity.** No test asserts the bridge sums:
`FC_29_Curat − FC_Recipe = Σ(named bridge steps)`, residual = 0.

**K3 — Food / Paper / Operational separation.** No test asserts
`costFood + costPaper == costTotal` for a product with mixed lines, nor that a 2.9 category matching
no rule is *reported*, not silently booked as FOOD.

**K4 — Diacritic-insensitive classification.** `clasifica` and `reconciliaza` disagree on
`"Materiale curățenie"` (BUG-6, reproduced). No test compares them.

**K5 — Store × period aggregation identity.**
`Σ fcPerioada(store_i).cost == fcPerioada('RETEA').cost` and the same for `net`, `costFood`,
`costPaper`. Never asserted.

**K6 — Weekly FC.** No FC-level weekly test exists because no FC-level weekly code exists. Needed
first: `Σ weeks(month) == month` for cost, net and quantity.

**K7 — Sales Report VAT and channel.** `test-importer.ts` never imports a `SALES` file. BUG-2
(hardcoded `/1.1`) and BUG-3 (silent zero-row import when channel is undetectable) are both
untested.

**K8 — Location resolution.** No test covers a location-less row. BUG-4 (phantom `L01`) is untested.

**K9 — Coverage-adjusted variance.** No test asserts that a product without a recipe must **not**
inflate `varianceLei` (BUG-7).

**K10 — `esteAmbalaj` against the real nomenclature.** A regression test over
`baza-fryday.json` asserting the FOOD/PACKAGING split — this alone would have caught BUG-5.

**K11 — 4.7 spanning a month boundary.** No test covers a report whose period crosses months.

**K12 — Data quality: duplicates, missing periods, ingredients without prices.** No coverage,
because the features do not exist.

---

## 1. Architecture assessment

**Verdict: the foundation is sound. Keep it. The problem is not the engine — it is the data model
around the engine, and a payload of out-of-scope P&L features.**

**Strengths.** The one-way dependency rule is real and unbroken. `lib/` is genuinely pure and
genuinely testable — 773 Node-executable tests are the proof, and they are numeric identity tests,
not snapshots. Dated costing, versioned recipes, copy-on-write simulation and the `Explicatie`
discipline are the right primitives for an FC Control Tower and would be expensive to rebuild.

**Weaknesses, in order of severity.**

1. **The product primary key is a commercial name.** No stable identifier survives a rename.
2. **`Linie29` is category-level.** This single type blocks requirements 3, 5 and 6 simultaneously.
   Nothing can be bridged, normalized or split into operational sub-categories until 2.9 can carry
   material-level lines.
3. **The month is hard-wired.** `luna()` is called as the period key at ~30 sites. Weekly FC is not
   a feature toggle; it is a `Perioada` abstraction that does not exist yet.
4. **Paper is a keyword heuristic on a free-text name.** Two live misclassifications already
   (BUG-5). This is the weakest link in requirement 4.
5. **P&L is entangled, not layered.** `Ctx` itself carries `comisionDeliveryPct`, so every consumer
   of the calculation context transitively depends on out-of-scope logic.
6. **`engine.ts` is 1 225 lines** and now holds UM conversion, costing, aggregation, menu
   engineering, alerts, recommendations, promo analysis, simulation *and* number formatting. It has
   outgrown the "one engine per file" rule stated in `CLAUDE.md`.
7. **Eight view files compute business ratios inline**, untested, against the stated rule.

**Recommendation: evolve, do not rewrite.** Introduce `Perioada` and `MaterialFapt` as new types
alongside the existing ones, migrate call sites incrementally behind the existing test suite, and
quarantine P&L behind a feature flag before removing it. The 773-test suite is the regression net
that makes this safe — that is precisely what it was built for.

---

## 2. Data-flow diagram (text)

```
╔═ SOURCES ═════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  FRYDAY-DASHBOARD.xlsx      NBO recipe cards      4.7 Sales Mix       2.9      ║
║  NOMENCLATOR|RETETAR|FC     (Excel / cards)       (xlsx | PDF)     (monthly)   ║
║        │                          │                     │              │      ║
╚════════│══════════════════════════│═════════════════════│══════════════│══════╝
         │                          │                     │              │
         ▼                          ▼                     ▼              ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │  auto.ts — analizeazaFisier()                                             │
   │  · sheet sweep · gasesteAntet() · mapeazaAntete() · content inference     │
   │  · tipDinNumeFisier() · NECESITA_SEMNAL gate · PDF → matriceDinText()     │
   │  → FoaieAnalizata { tip, mapare, incredere, note }                        │
   └───────────────────────────────────────────────────────────────────────────┘
         │            │                    │                        │
         ▼            ▼                    ▼                        ▼
   fcbaza.ts      nbo.ts              salesmix.ts             (direct map)
   parseBazaFC    cardsDinMatrice     parseSalesMix           FC29 fields
                  pretBaza()          despartaCanal()
                  esteAmbalaj() ◄── PAPER/FOOD decided HERE, by keyword ⚠ BUG-5
                                     cheieDenumire()
                                          │
                                          ▼  name-only join ⚠ RISK R-1
                                     produse.aliasuri
                                     produse.codPos (0/160 populated)
         │            │                    │                        │
         └────────────┴──────────┬─────────┴────────────────────────┘
                                 ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │  importer.ts — importa(tip, parsat, state, mapare, opt)                   │
   │  idempotent replace keys:                                                 │
   │    PMIX / SALES_MIX  → data|locatie|canal|produs                          │
   │    SALES             → data|locatie|canal      ⚠ BUG-2 (VAT), BUG-3       │
   │    FC29              → perioada|locatie                                   │
   │    WASTE / INVENTAR  → locatie|perioada                                   │
   │  rezolvaLocatie()    → phantom 'L01' when blank  ⚠ BUG-4                  │
   │  → { stateNou, batch: ImportBatch }                                       │
   └───────────────────────────────────────────────────────────────────────────┘
                                 ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │  AppState  (localStorage | window.storage | server /api/stare)            │
   │  ingrediente[] produse[] retete[] vanzari[] salesReport[] linii29[]       │
   │  waste[] inventar[] reguli[] tinte[] nemapate[] setari                    │
   │  ⚠ Linii29 = {perioada, locatie, CATEGORIE, valoare} — no material key    │
   └───────────────────────────────────────────────────────────────────────────┘
                                 ▼
                    store.tsx  →  buildCtx(state) → Ctx
                                  { ingrediente, retete, produse,
                                    comisionDeliveryPct }  ⚠ out-of-scope in Ctx
                                 ▼
╔═ ENGINE (pure) ═══════════════════════════════════════════════════════════════╗
║                                                                               ║
║  pretLa(ing, data) ──┐                                                        ║
║  versiuneLa(r, data)─┼──► costLinie ──► costSemipreparat ──► costProdus       ║
║                      │      │                                 (memo:          ║
║  cantBruta(linie) ───┘      └─► {food, paper, total}          cod|canal|data) ║
║                                                                               ║
║  costProdus ──► agregatePerioada ──► fcPerioada ──► RezultatFC                ║
║       │              (luna only ⚠)        │                                   ║
║       │                                   ├─ fcTeoretic       (÷ all sales)   ║
║       │                                   ├─ fcTeoreticAcoperit (÷ covered)   ║
║       │                                   ├─ fcCurat = 2.9 minus EXCLUS       ║
║       │                                   ├─ fcOp    = all of 2.9             ║
║       │                                   ├─ fcPaper = paper29 | teoretic ⚠   ║
║       │                                   └─ variance = Curat − Teoretic      ║
║       │                                        ⚠ BUG-7: mixed denominators    ║
║       │                                        ⚠ NOT a bridge (req. 3)        ║
║       │                                                                       ║
║       ├──► perProdus ──► menuEngineering / alerte / recomandari               ║
║       ├──► consumuriLuna ──► varianceDetaliat (recipe|waste|unexplained)      ║
║       ├──► consumPerPortie ──► utilizariIngredient / impactIngredient (req10) ║
║       └──► aplicaScenariu ──► simuleaza (req 11)  ⚠ BUG-1                     ║
║                    └──► aplicaInDate — ONLY writer, new dated versions only   ║
║                                                                               ║
║  clasifica(categorie, reguli) → FOOD | PAPER | EXCLUS                         ║
║      default when no rule matches = FOOD  ⚠ silent                            ║
║      norm() here vs raw toLowerCase() in reconciliere  ⚠ BUG-6                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
                                 ▼
   reconciliere.ts ──► Reconciliere { acoperire, nemapate, PMIX↔Sales,
                                      categoriiNeclasificate, scorIncredere,
                                      verdict }                    (req. 13)
                                 ▼
   scoruri.ts ─ Explicatie ─► decizii.ts (narativ, cockpit) ─► timeline.ts
                                 ▼
   23 views — single-page, useState router in App.tsx (no URL routing)
   Global context: { luna, locatie, vedere } via SelCtx
```

**Two flows that do not exist yet and must be built for FC Core V2:**

```
   2.9 material lines ──╳──► material master ──╳──► "in NBO, not in any recipe"
                                                     └─► PAPER NORMALIZATION (req. 5)

   FC_Recipe ──╳──► [coverage | paper | operational | waste | unexplained] ──╳──► FC_29
                                                     └─► FC BRIDGE (req. 3)
```

---

## 3. List of bugs

All confirmed by reading the code; BUG-1, BUG-5 and BUG-6 were additionally **reproduced**.

### BUG-1 — CRITICAL · Recipe simulations silently return zero impact on past months
`src/lib/engine.ts:520-548` (`aplicaScenariu`) vs `engine.ts:55-62` (`versiuneLa`)

`aplicaScenariu` applies `GRAMAJ` / `INGREDIENT` / `ELIMINA_LINIE` / `ADAUGA_LINIE` to the **active**
version. `simuleaza` then costs at `dataRef = ${luna}-15`, and `impactRetea` / `recomandari` cost at
the actual sale date — both in the past. `versiuneLa` therefore resolves an **older** version and the
mutation is never seen.

Reproduced against the real 160-product base, adding a second recipe version dated today (exactly
what `FC_BAZA` and `RETETAR_NBO` do on every reload):

```
versiune activă = 3 · versiune la 2026-07-15 = 2
cost la 2026-07-15 : 3.1603 → 3.1603 · Δ = 0.0000   ⟵ SIMULATION IGNORED
cost la „azi"      : 3.1603 → 1.5051 · Δ = -1.6552  ⟵ works
```

**Impact:** the moment the rețetar is reloaded — which the documented workflow does periodically —
Business Simulation, Business Strategy's `retetePct` lever, and the impact figures attached to every
recommendation all report **0 lei** for recipe changes. The user sees a plausible screen full of
zeros, with no warning. Price changes are unaffected (`aplicaScenariu` rewrites the price history to
`2000-01-01`); only recipe-structure changes break.
**Fix:** stamp mutated versions with a date ≤ `dataRef`, or give `aplicaScenariu` an explicit
`dataRef` and mutate `versiuneLa(r, dataRef)` instead of `versiuneActiva(r)`.

### BUG-2 — HIGH · Sales Report import hardcodes 11 % VAT
`src/lib/importer.ts:880`
```ts
const net = parseNumar(g(r, 'net')) ?? (parseNumar(g(r, 'brut')) ?? 0) / 1.1;
```
When a Sales Report has only a gross column, net is derived with a **literal 1.1**, ignoring
`setari.tvaImplicit` and any product-level rate (drinks at 19 % exist in the base). The Sales Report
net is the **preferred FC denominator** (`fcPerioada`: `numitor = 'Sales Report'`), so this biases
every FC % in the application.

### BUG-3 — HIGH · Sales Report import silently drops every row when the channel is undetectable
`src/lib/importer.ts:874-884`

`lipsesc(['data','locatie'])` does not require `canal`, but the row loop does:
`if (!data || !locatie || !canal || !net) return []`. A Sales Report with no channel column and no
channel hint in the filename imports **0 rows** with status `IMPORTAT`. FC then falls back to the
PMIX denominator without saying why. (`!net` also drops legitimate zero-sales days.)

### BUG-4 — HIGH · Rows without a location land in a phantom `L01`
`src/lib/importer.ts:391-393`
```ts
if (!v) return state.locatii[0]?.cod ?? 'L01';
```
The shipped FRYDAY base has **zero** locations. A PMIX or 2.9 file without a location column
therefore writes every row to `'L01'`, which is never added to `state.locatii` (only the non-empty
branch pushes to `locatiiNoi`). The data is invisible in every location selector and unreachable in
per-store analysis, while still counting in `RETEA` totals.

### BUG-5 — HIGH · Two food ingredients are classified as PACKAGING in the shipped base
`src/lib/nbo.ts:esteAmbalaj` — keyword `pahar` matched against the ingredient name.

| Code | Name | UM | Price | Used by |
|---|---|---|---|---|
| `702181` | Prajitura cu mascarpone si capasuni **in pahar sticla** | buc | 9.25 lei | `Prajitura mascarpone capsuni` |
| `702180` | TIRAMISÙ pufos **in pahar sticla** | buc | 7.485 lei | `TIRAMISU` |

Both are desserts *served in* a glass. `costLinie` books the **entire** cost as `paper`, so those two
products report `costFood = 0` and `paperPct = 100 %`. Directly corrupts requirement 4.

### BUG-6 — MEDIUM · `clasifica` and `reconciliaza` disagree on diacritics
`engine.ts:339` uses `norm()` (diacritics stripped); `reconciliere.ts:61-63` uses raw
`.toLowerCase().includes()`. Reproduced:

```
clasifica("Materiale curățenie", [{pattern:'curatenie', clasa:'EXCLUS'}]) → {clasa:'EXCLUS', auto:false}
reconciliere-style match                                                  → false
categoriiNeclasificate = ['Materiale curățenie']   ← false positive
```
The category is correctly excluded from FC Curat, yet reported as unclassified, raising a spurious
`ATENȚIE` and deducting 3 points from `scorIncredere` per affected category. Since the shipped rules
are `uniforme / administrative / curatenie / ambalaje` and real 2.9 exports are written in Romanian
**with** diacritics, this fires on essentially every real import.

### BUG-7 — MEDIUM · Variance mixes denominators
`engine.ts:492-493`
```ts
variancePP: fcCurat − fcTeoretic,
varianceLei: consumCurat − ag.cost,
```
`consumCurat` (2.9) covers **all** sales; `ag.cost` covers **only** products that have a recipe.
The gap absorbs the cost of unmapped products and is presented in the UI as *"partea de consum pe
care rețetele nu o explică (waste, porționare, erori)"* — attributing a mapping problem to
operations. This is the precise defect the FC bridge must eliminate.

### BUG-8 — LOW · `netDelivery` computed on two different bases
`engine.ts:201` (`agregatePerioada`) accumulates `netDelivery` **only for rows with a computable
cost**; `engine.ts:243` (`perProdus`) accumulates `a.netD` for **all** rows. `fcPerioada.comisionLei`
and `RandProdus.comision` therefore disagree whenever coverage < 100 %. (Moot once commission is
removed from scope, but the same asymmetry will reappear in any covered/uncovered split.)

### BUG-9 — LOW · `inflatiaIngredientelor` assumes the price history is sorted
`engine.ts:641-643` reads `ing.preturi[0]` and `ing.preturi[len-1]` directly, whereas `pretLa`
defensively sorts. All current writers sort, so this is latent — but it is an unguarded invariant.

### BUG-10 — LOW · `AZI_ISO()` is memoised for the process lifetime
`engine.ts:63-64` — `_azi ??= new Date()…`. Goes stale across midnight in a long-lived tab and is
unmockable from tests, which is part of why BUG-1 has no test.

### BUG-11 — LOW · Dead guard in the RETETAR block parser
`fcbaza.ts:118` — `!isNaN(Number(a0.replace(/\D/g, '')))`. For a text cell this is
`Number('') === 0`, so the guard is **always true**. Ingredient-row detection relies entirely on the
subsequent `qty != null && um` check. Works today; misleading and brittle.

---

## 4. Architectural risks

**R-1 — CRITICAL · The product primary key is a commercial name.**
`cod = numeBazaComercial(denumire)`; `codPos` populated 0/160. A rename in NBO or in the FC base
creates a new product, orphans all sales history and all recipe versions, and silently drops FC
coverage. This is the single largest threat to a Control Tower.

**R-2 — CRITICAL · `Linie29` is category-level.**
Requirements 3 (bridge), 5 (paper normalization) and 6 (operational categories) all need
material-level 2.9. One type change unblocks three requirements; without it none is reachable.

**R-3 — HIGH · The month is hard-wired at ~30 sites.**
`luna()` is the period key throughout the engine, and `Linie29` / `WasteFapt` / `InventarFapt` are
month-stamped *by type*. Requirement 9 (weekly) is a data-model change, not a UI toggle.

**R-4 — HIGH · The 4.7 report destroys both the day and the store dimension.**
A multi-day report is stamped onto one date; a multi-store report is stamped `'AGREGAT'`. Any weekly
or per-store FC built on the primary import path would be fiction. Requirements 8 and 9 depend on a
per-store, per-day export discipline that the application cannot enforce.

**R-5 — HIGH · Paper/Food classification is a substring heuristic on free text.**
18 keywords against an ingredient name, no override, no review queue, no test against the real
nomenclature. Two live errors already (BUG-5). Requirement 4 rests on this.

**R-6 — HIGH · Unclassified 2.9 categories default to FOOD, silently.**
`clasifica` returns `{clasa:'FOOD', auto:true}`. The `auto` flag reaches the UI but nothing blocks
or gates on it, and the shipped rule set has exactly **one** PAPER pattern. FC Curat and Paper Cost
are quietly wrong on any 2.9 whose wording differs from the four seeded patterns.

**R-7 — MEDIUM · Out-of-scope logic is entangled, not layered.**
`Ctx` itself carries `comisionDeliveryPct`, so every `Ctx` consumer transitively depends on it.
Labor/EBITDA reach into `simulare.ts`, `strategie.ts`, `types.ts`, both seeds and 89 tests. Removal
is a refactor with a real blast radius — quarantine before deleting.

**R-8 — MEDIUM · Business formulas in views, against the stated rule.**
`Dashboard.tsx:76,90` · `IngredientIntelligence.tsx:26` · `MenuEngineering.tsx:52` ·
`ProfitIntelligence.tsx:27,48` · `Topuri.tsx:135` · `shared/ProdusDetaliu.tsx:62` ·
`BusinessSimulation.tsx:445`. Each is an untested duplicate of logic that belongs in `lib/`.
`MenuEngineering.tsx:52` re-derives `marjaMedie` with a formula already present in
`engine.recomandari` — two implementations, one test.

**R-9 — MEDIUM · `CLAUDE.md` is stale and `src/lib/Setari.tsx` is a dead React file in `lib/`.**
The doc claims 421 tests / 13 suites; reality is 773 / 28. `src/lib/Setari.tsx` (154 lines) is a
React component inside the "pure" directory, imported by nothing, and a divergent fork of
`views/Setari.tsx`. Both erode trust in the documented rules.

**R-10 — MEDIUM · `engine.ts` is 1 225 lines and holds eight concerns.**
UM conversion, costing, period aggregation, menu engineering, alerts, recommendations, promo
analysis, simulation *and* `ro-RO` number formatting. `CLAUDE.md` says a new engine goes in its own
file; `engine.ts` itself no longer honours that.

**R-11 — MEDIUM · `FoodCost.tsx` render cost scales with stores × sales.**
2×(1+N) full `fcPerioada` passes per render — **962 ms measured at 20 stores / 169 800 rows**, plus
a separate `varianceDetaliat` (which runs `consumuriLuna`, O(ingredients × product-channel pairs)).
Acceptable at 3 stores, not at company scale.

**R-12 — LOW · No URL routing.** `App.tsx` uses `useState` for module selection. No deep links, no
shareable views, no browser back. A Control Tower needs addressable screens.

**R-13 — LOW · Single-user state model.** `AppState` is one blob in `localStorage` /
`window.storage` / one server row with optimistic-concurrency conflict on save. Fine today;
incompatible with the NestJS + PostgreSQL port already named in `CLAUDE.md`.

---

## 5. Proposed implementation plan — PR-sized steps

Each step is independently shippable, keeps the app buildable, and lands **tests first**.
Steps 1–4 are prerequisites; 5–12 can then proceed with some parallelism.

### Phase 0 — Stabilise (no new features)

**PR-1 · Fix confirmed bugs + add the missing regression tests.**
BUG-1 … BUG-6, plus BUG-9/10/11 opportunistically. Tests K1, K4, K7, K8, K10 land in the same PR.
Also refresh `CLAUDE.md` (773/28) and delete the dead `src/lib/Setari.tsx`.
*Why first:* BUG-1 makes an entire shipped module silently wrong; everything downstream inherits it.
*Risk:* low. *Size:* ~250 lines + ~40 tests.

**PR-2 · Introduce a stable product identity.**
Add `Produs.idIntern` (immutable, generated once), keep `cod` as the display/legacy key, and make
every join prefer `idIntern → codPos → cod → alias`. Ship a one-time migration in
`store.migreaza` that stamps `idIntern` on existing products. Expose a rename operation that
preserves identity. Add a data-quality check for "two products with the same normalized name".
*Why here:* every later requirement joins on product identity. Doing this after the bridge means
redoing the bridge. *Risk:* medium (touches migration). *Size:* ~350 lines + ~30 tests.

**PR-3 · Quarantine out-of-scope P&L behind a flag.**
Introduce `setari.moduleExtinse: boolean` (default `false`). Hide `BusinessStrategy`, the Labor and
Operating-cost tables in `Setari.tsx`, and the Prime-Cost answer in `simulare.ts`. Remove
`comisionDeliveryPct` from `Ctx` — pass it as an explicit argument to the two functions that
actually need it. **Delete nothing yet**; the 89 related tests keep passing.
*Why:* proves the FC-only surface is coherent before committing to deletion. *Risk:* medium
(`Ctx` signature change ripples). *Size:* ~300 lines.

**PR-4 · Extract a `Perioada` abstraction.**
New `src/lib/perioada.ts`: `type Perioada = { tip: 'ZI'|'SAPTAMANA'|'LUNA'; cheie: string }`, with
`perioadaDin(data, tip)` (reusing the tested `cheiePerioada`), `perioadeIntre()`, `precedenta()`,
`contine(perioada, data)`. **Do not change any call site yet** — land it with tests only.
*Why:* the seam that makes weekly possible without a big-bang refactor. *Risk:* none (additive).
*Size:* ~150 lines + ~40 tests.

### Phase 1 — The FC data model

**PR-5 · Material-level 2.9 (`MaterialFapt`).**
Add `MaterialFapt { perioada, locatie, material, denumire, cant, um, valoare, categorie }` alongside
`Linie29` (keep both — `Linie29` stays the category rollup). Extend the FC29 importer to detect and
parse material-level exports, falling back to category-level. Add `AppState.materiale29[]` +
migration. *Risk:* low (purely additive). *Size:* ~400 lines + ~35 tests.

**PR-6 · Normalized material master + Food/Paper/Operational classification.**
New `src/lib/materiale.ts`. Replace the `esteAmbalaj` keyword heuristic with a three-layer
classifier: **(1)** explicit per-material override stored in state, **(2)** rules on category, **(3)**
keyword fallback — always reporting which layer decided. Widen `Clasa29` to
`'FOOD' | 'PAPER' | 'OPERATIONAL' | 'EXCLUS'` with operational sub-categories
(`CURATENIE | UNIFORME | PAPETARIE | CONSUMABILE`). Add a review queue for materials whose class was
guessed. Test K3 + K10 land here; BUG-5 becomes structurally impossible.
*Delivers requirements 4 and 6.* *Risk:* medium (`Clasa29` widening touches `FoodCost.tsx`).
*Size:* ~500 lines + ~60 tests.

**PR-7 · Paper normalization — "in NBO, not in any recipe".**
Using PR-5 + PR-6: for a period × store, diff the material set in 2.9 against the material set
reachable from recipes × PMIX. Classify each unmatched material (packaging not modelled / normalized
material / operational / genuinely unknown) with lei value and share of consumption.
*Delivers requirement 5.* *Risk:* low. *Size:* ~350 lines + ~40 tests.

### Phase 2 — The FC Control Tower

**PR-8 · The FC Bridge.**
New `src/lib/bridge.ts` producing an ordered, additive decomposition:
```
FC_Recipe (covered sales)
  + coverage gap        (products without a recipe)   ← removes BUG-7
  + paper not modelled  (from PR-7)
  + operational         (from PR-6)
  + waste reported      (from varianceDetaliat)
  + unexplained         (residual)
  = FC_29_Curat
```
Every step carries an `Explicatie` (invariant 5) and a lei + pp value. Test K2 asserts residual = 0.
*Delivers requirement 3, fixes BUG-7.* *Risk:* medium (the numbers must reconcile exactly).
*Size:* ~450 lines + ~55 tests.

**PR-9 · Weekly FC + period-aware engine.**
Thread `Perioada` (PR-4) through `agregatePerioada`, `fcPerioada`, `consumuriLuna`,
`varianceDetaliat`, `reconciliaza`. Keep the `luna: string` overloads as thin adapters so no view
breaks. Where 2.9 is monthly, report the weekly FC Curat as **unavailable**, not interpolated.
Test K6 asserts `Σ weeks(month) == month`.
*Delivers requirement 9.* *Risk:* high (widest blast radius — mitigated by adapters + 773 tests).
*Size:* ~600 lines + ~70 tests.

**PR-10 · Store / Company aggregation, hardened.**
Test K5 (`Σ stores == RETEA`) first. Then: refuse to hide the `'AGREGAT'` problem — surface it as a
first-class data-quality signal; memoise `fcPerioada` per `(state, luna, locatie)` and compute all
levels in **one** pass over sales instead of 2×(1+N); add per-store completeness ("which stores have
2.9 for this period").
*Delivers requirement 8, fixes R-11.* *Risk:* medium. *Size:* ~400 lines + ~35 tests.

**PR-11 · Data quality completion.**
Duplicate detection (same product twice under different names/codes), missing-period detection
(gaps in the PMIX/2.9 calendar), ingredients without prices as a standing signal, unexplained
variance above threshold. Fold into `reconciliere.ts`'s existing `ProblemaDate` / `scorIncredere`
model. Test K12.
*Completes requirement 13.* *Risk:* low. *Size:* ~350 lines + ~40 tests.

**PR-12 · FC-scoped Advisor.**
Rewrite `narativExecutiv` to explain FC movement **from the bridge**: which step moved, by how many
lei and pp, versus which period, at which store. Hard rule, enforced by test: every sentence must
cite a computed bridge step; when the bridge cannot attribute a movement, say so explicitly.
*Completes requirement 12.* *Risk:* low. *Size:* ~400 lines + ~45 tests.

### Phase 3 — Cleanup (only after Phase 2 is green)

**PR-13 · Remove quarantined P&L.** Delete `strategie.ts`, `BusinessStrategy.tsx`, `CostLabor`,
`CostOperare`, `tintaLaborPct`, `comisionDeliveryPct`, the Prime-Cost answer, `test-str.ts`,
`test-com.ts`, and the Labor/Prime paths in `test-bse.ts`. Only after PR-3's flag has shipped and
the FC-only surface is confirmed complete.

**PR-14 · Split `engine.ts`.** `um.ts` · `cost.ts` · `agregare.ts` · `alerte.ts` · `format.ts`,
re-exported from `engine.ts` so no import breaks. Move the eight inline view formulas (R-8) into
`lib/` with tests.

**PR-15 · URL routing.** Addressable modules with `?modul=&luna=&locatie=&vedere=` — a Control Tower
needs shareable screens.

---

## 6. Exact files that would need modification

Grouped by PR. **`new`** = created; everything else is edited.

| PR | Files |
|---|---|
| **PR-1** | `src/lib/engine.ts` (aplicaScenariu, AZI_ISO, inflatiaIngredientelor) · `src/lib/importer.ts` (SALES net/canal, rezolvaLocatie) · `src/lib/reconciliere.ts` (norm) · `src/lib/nbo.ts` (esteAmbalaj) · `src/date/baza-fryday.json` (2 ingredient types) · `src/lib/fcbaza.ts` (row guard) · **delete** `src/lib/Setari.tsx` · `CLAUDE.md` · **new** `teste/test-fc-bugfix.ts`, `teste/test-sales-import.ts`, `teste/test-ambalaj-baza.ts` |
| **PR-2** | `src/lib/types.ts` · `src/lib/store.tsx` (migreaza) · `src/lib/importer.ts` (all joins) · `src/lib/salesmix.ts` · `src/lib/fcbaza.ts` · `src/lib/engine.ts` (buildCtx) · `src/views/MasterData.tsx` · `src/views/shared/Nemapate.tsx` · **new** `teste/test-identitate.ts` |
| **PR-3** | `src/lib/types.ts` (Setari) · `src/lib/engine.ts` (Ctx, buildCtx, perProdus, fcPerioada, aplicaScenariu) · `src/lib/simulare.ts` · `src/App.tsx` (MODULE) · `src/views/Setari.tsx` · `src/views/FoodCost.tsx` · `src/views/Dashboard.tsx` · `src/views/Topuri.tsx` |
| **PR-4** | **new** `src/lib/perioada.ts` · **new** `teste/test-perioada.ts` |
| **PR-5** | `src/lib/types.ts` · `src/lib/importer.ts` (FC29 branch, CAMPURI) · `src/lib/auto.ts` (REGULI_CONTINUT, OBLIGATORII) · `src/lib/store.tsx` · **new** `teste/test-material29.ts` |
| **PR-6** | **new** `src/lib/materiale.ts` · `src/lib/types.ts` (Clasa29) · `src/lib/engine.ts` (clasifica, costLinie) · `src/lib/nbo.ts` · `src/lib/reconciliere.ts` · `src/views/FoodCost.tsx` · `src/lib/ui.tsx` (Insigna) · **new** `teste/test-materiale.ts` |
| **PR-7** | **new** `src/lib/normalizare.ts` · `src/lib/engine.ts` (consumuriLuna reuse) · **new** `src/views/PaperNormalization.tsx` · `src/App.tsx` · **new** `teste/test-normalizare.ts` |
| **PR-8** | **new** `src/lib/bridge.ts` · `src/lib/engine.ts` (RezultatFC, fcPerioada) · `src/lib/scoruri.ts` (Explicatie reuse) · **new** `src/views/FCBridge.tsx` · `src/App.tsx` · **new** `teste/test-bridge.ts` |
| **PR-9** | `src/lib/engine.ts` (agregatePerioada, fcPerioada, consumuriLuna, varianceDetaliat, alerte) · `src/lib/reconciliere.ts` · `src/lib/bridge.ts` · `src/lib/types.ts` · `src/views/FoodCost.tsx` · `src/App.tsx` (Antet) · `src/lib/store.tsx` (Selectie) · **new** `teste/test-saptamanal.ts` |
| **PR-10** | `src/lib/engine.ts` (memoisation, single-pass) · `src/views/FoodCost.tsx` · `src/lib/reconciliere.ts` · `src/lib/importer.ts` (AGREGAT signal) · **new** `teste/test-agregare.ts` |
| **PR-11** | `src/lib/reconciliere.ts` · `src/lib/types.ts` · `src/views/Importuri.tsx` · **new** `teste/test-calitate.ts` |
| **PR-12** | `src/lib/decizii.ts` (narativExecutiv, cockpit) · `src/lib/bridge.ts` · `src/views/ExecutiveCockpit.tsx` · `src/views/Recomandari.tsx` · **new** `teste/test-advisor.ts` |
| **PR-13** | **delete** `src/lib/strategie.ts`, `src/views/BusinessStrategy.tsx`, `teste/test-str.ts`, `teste/test-com.ts` · `src/lib/types.ts` · `src/lib/simulare.ts` · `src/lib/seed.ts` · `src/lib/seed-nbo.ts` · `src/views/Setari.tsx` · `src/App.tsx` · `teste/test-bse.ts` |
| **PR-14** | **new** `src/lib/um.ts`, `cost.ts`, `agregare.ts`, `alerte.ts`, `format.ts` · `src/lib/engine.ts` → re-export barrel · `src/views/Dashboard.tsx`, `IngredientIntelligence.tsx`, `MenuEngineering.tsx`, `ProfitIntelligence.tsx`, `Topuri.tsx`, `shared/ProdusDetaliu.tsx`, `BusinessSimulation.tsx` |
| **PR-15** | `src/App.tsx` · `src/main.tsx` · `src/lib/store.tsx` |

---

## 7. Tests that must be added before implementation

Written first, in the suite named, asserting **implementation-independent identities** as
`CLAUDE.md` requires.

| # | Suite | Assertion | Gates |
|---|---|---|---|
| **T1** | `test-fc-bugfix.ts` | A `GRAMAJ` change on a recipe whose active version post-dates the simulated month **must** change `simuleaza().cost1` and `impactRetea().dupa.cost`. `Δcost = Δgramaj × preț × buc_lună`. | PR-1 / BUG-1 |
| **T2** | `test-sales-import.ts` | `SALES` gross→net uses the configured VAT, not 1.1; a file without a channel column either imports with an explicit default or **fails loudly** — never `IMPORTAT` with 0 rows. | PR-1 / BUG-2, BUG-3 |
| **T3** | `test-fc-bugfix.ts` | A PMIX row with no location produces a location that exists in `state.locatii`, or an explicit error. | PR-1 / BUG-4 |
| **T4** | `test-ambalaj-baza.ts` | Over the real `baza-fryday.json`: every `PACKAGING` ingredient is genuine packaging; the two dessert-in-glass items are `FOOD`. Locks the split as a regression fence. | PR-1 / BUG-5 |
| **T5** | `test-fc-bugfix.ts` | For every rule and every category, `clasifica(cat, reguli).auto === false` ⟺ `reconciliaza` does **not** list `cat` as unclassified. Parametrised over diacritic variants. | PR-1 / BUG-6 |
| **T6** | `test-identitate.ts` | Renaming a product preserves `idIntern`, all sales history, all recipe versions, and `acoperire`. Two products with the same normalized name are reported, never silently merged. | PR-2 / R-1 |
| **T7** | `test-perioada.ts` | `Σ perioade('ZI', month) == perioada('LUNA', month)` for cost, net and quantity. ISO-week boundaries across the new year (`2026-12-31` → `2027-S01`). Every day of a month belongs to exactly one week key. | PR-4 / R-3 |
| **T8** | `test-material29.ts` | A material-level 2.9 rolls up **exactly** to the equivalent category-level `Linie29`. Re-import of one store-month replaces only that store-month. | PR-5 / R-2 |
| **T9** | `test-materiale.ts` | `costFood + costPaper + costOperational == costTotal` for a product with mixed lines. An explicit override beats a rule; a rule beats the keyword fallback; the deciding layer is always reported. A category matching no rule is **reported**, never silently booked as FOOD. | PR-6 / req. 4, 6 / R-5, R-6 |
| **T10** | `test-normalizare.ts` | A material present in 2.9 and in no recipe appears in the normalization report with its exact lei value. `Σ(normalized materials) + Σ(recipe-modelled materials) == Σ(2.9 materials)`. | PR-7 / req. 5 |
| **T11** | `test-bridge.ts` | **The bridge identity:** `FC_Recipe + Σ(steps) == FC_29_Curat`, residual < 0.01 lei. A product without a recipe moves the *coverage* step and **not** the *unexplained* step. Every step carries a non-empty `Explicatie`. | PR-8 / req. 3 / BUG-7 |
| **T12** | `test-saptamanal.ts` | `Σ fcPerioada(weeks of month).cost == fcPerioada(month).cost`, same for `net`, `costFood`, `costPaper`. Weekly FC Curat is `null` (never interpolated) when 2.9 is monthly. | PR-9 / req. 9 |
| **T13** | `test-agregare.ts` | `Σ fcPerioada(store_i).{cost,net,costFood,costPaper} == fcPerioada('RETEA').…` for every metric. Percentages are recomputed from totals, never averaged (invariant 4). An `'AGREGAT'` location surfaces as a data-quality problem. | PR-10 / req. 8 / invariant 4 |
| **T14** | `test-calitate.ts` | Duplicates, missing periods and price-less ingredients each raise exactly one `ProblemaDate` and each move `scorIncredere` monotonically downward. | PR-11 / req. 13 |
| **T15** | `test-advisor.ts` | Every advisor sentence references a bridge step that exists in the computed result. Given a movement the bridge cannot attribute, the advisor says so and proposes **nothing**. | PR-12 / req. 12 |

---

## Summary

The engine is worth keeping: pure, dated, versioned, and defended by 773 numeric tests that all
pass today. Three things stand between it and an FC Control Tower — a product key that is a
commercial name, a 2.9 model that is category-level, and a period model that is hard-wired to the
month. Each is a small type change with a wide call-site footprint, which is exactly the shape of
refactor the existing test suite was built to make safe.

Eleven bugs were found; **BUG-1 is the one to fix this week** — recipe simulations silently report
zero impact on any month older than the last rețetar reload, which in this workflow means every
month.

Before any of that, the P&L and Delivery-commission logic needs to be quarantined rather than
deleted: `Ctx` itself carries `comisionDeliveryPct`, so it reaches every calculation in the
application.
