# Audit final de arhitectură — FC Control Tower

Data: 2026-08-29 · Bază: `1b58b7e` (head-ul PR #14) · Suită: 43 fișiere de test, 2516 teste

Documentul acesta este rezultatul unei treceri adversariale prin tot fluxul, de la fișierul
importat până la ce vede pe ecran un manager de restaurant. Nu descrie ce *ar trebui* să facă
sistemul, ci ce face — verificat numeric, cu testele care pinează fiecare afirmație.

---

## 1. Fluxul auditat

```
IMPORT → VALIDARE → VERSIONARE → DATE CANONICE → MOTOR FC → NBO 2.9 → PMIX 4.7
       → RECONCILIERE → TIMELINE → ANALITICĂ RESTAURANT/COMPANIE → INGREDIENT INTELLIGENCE
       → SIMULĂRI → AI ADVISOR → DASHBOARD → AUTORIZARE
```

Fiecare săgeată are cel puțin un test de îmbinare în `teste/test-integrare-finala.ts` (197 teste).
Suita aceea nu re-testează motoarele — o fac suitele lor — ci exact ce se poate strica *între* ele.

## 2. Proprietarii calculului

Regula: **o metrică, un proprietar**. Verificat prin căutare, nu prin presupunere.

| Metrică | Proprietar unic | Cine o consumă |
|---|---|---|
| Cost produs la o dată | `engine.costProdus` (+ `versiuneLa`, `pretLa`) | toate motoarele |
| FC teoretic din rețete | `fc-core.recipeFC` | `fc-timeline`, `fc-bridge`, `fc-simulare`, Advisor |
| Numitorul (vânzări nete) | `fc-core.numitorFC` | idem |
| Puntea / reconcilierea | `fc-bridge.bridgeFC` | `fc-timeline`, `fc-tower`, Advisor |
| Efecte preț/consum/mix | `fc-ingrediente.analizaIngrediente` | Ingredient Intelligence, Advisor |
| What-if | `fc-simulare.simuleazaFC` | Simulări, Advisor |
| Drepturi de vedere | `fc-acces.ContextAutorizare` | tot turnul |

`src/views/` nu conține nicio formulă de business — verificat prin căutare după `costProdus`,
`pretLa`, `recipeFC`, `bridgeFC` și după calcule de procent în `.tsx`. Singurele împărțiri din
views sunt lățimi de bară în pixeli.

### Motorul vechi și motorul nou coexistă — și sunt pinate să nu divergă

`engine.fcPerioada` (folosit de Dashboard, Executive Cockpit, Food Cost, `decizii.ts`) și
stiva nouă `recipeFC`/`metriciFC` (folosită de Control Tower) calculează aceleași mărimi pe
căi diferite. **Nu am ales tăcut un rezultat.** Le-am comparat numeric și sunt identice:

| Scop | `fcPerioada.costTeoretic` | `metriciFC.recipeCostRON` | Δ |
|---|---|---|---|
| Rețea (seed) | 21 098,38 | 21 098,38 | 0,0000 |
| L01 (seed) | 11 851,91 | 11 851,91 | 0,0000 |
| L02 (seed) | 9 246,47 | 9 246,47 | 0,0000 |
| Companie (fixtură de stres) | 54,00 | 54,00 | 0,0000 |

La fel pentru numitor, FC teoretic, paper și acoperire. Egalitatea e acum **testată** (secțiunea A),
inclusiv pe o fixtură construită special ca straturile să se certe: rețetă cu două versiuni datate,
preț schimbat la mijlocul lunii, produs fără rețetă, ingredient fără preț, material normalizat,
material neclasificat, material nemapat, rând 2.9 fără restaurant, ambele canale.

Eliminarea motorului vechi ar însemna rescrierea a patru ecrane care nu fac obiectul acestui PR.
Până atunci, divergența tăcută e imposibilă: orice abatere pică testul.

## 3. Constatări

Optsprezece mutații deliberate au fost injectate în cod pentru a verifica dacă suita chiar
mușcă. **Toate 18 au fost prinse.** Cinci dintre ele au scăpat la prima rulare — acelea au fost
goluri în suită, închise mai jos.

### A-1 · Un ingredient fără preț cobora tăcut Food Cost-ul — **REMEDIAT**

**Severitate: medie-mare** (cifra de titlu era greșită, în direcția liniștitoare)

`costLinie` calcula o linie de rețetă ca `cantitate × preț`. Când ingredientul nu avea preț
(listă goală, sau preț 0), rezultatul era o linie de **0 lei declarată completă** —
`incomplet: false`. Consecințele, în lanț:

* `recipeFC` număra vânzarea drept **complet acoperită**;
* `acoperirePct` raporta felia aceea ca „cost calculabil";
* FC-ul afișat ieșea **mai mic decât realitatea**, fără niciun semn în cifră.

Reproducere (fixtura de stres, iulie): produsul PX3 se vinde 120 lei, are rețetă, iar
ingredientul ei IX2 nu are niciun preț. Înainte: acoperire 82,69%, cei 120 lei intrau la cost 0.

Remediere — fără să inventăm o valoare:

1. `engine.costLinie` declară linia `incomplet: true` când prețul lipsește sau e 0.
   Linia rămâne 0 lei: nu ghicim un preț, doar nu mai pretindem că e cost calculat.
2. `fc-core.recipeFC` expune `netCostIncomplet`, `produseCostIncomplet` și `acoperireCompletaPct`.
   **Aritmetica existentă nu s-a schimbat** — `cost`, `netAcoperit`, `fcPct` sunt bit-identice —
   deci nicio cifră din suitele existente nu s-a mișcat (2510 teste verzi).
3. `fc-timeline` duce felia în `CalitateTimeline` și în `motiveIncomplet`: *„…lei din vânzări au
   cost incomplet — Food Cost-ul e o limită de jos, nu cifra exactă."*
4. `fc-tower` ridică semnalul `COST_INCOMPLET` în Overview, cu trimitere spre PMIX 4.7.

După: acoperire brută 82,69%, acoperire **completă** 71,15%, iar cei 120 lei sunt numiți.
Un preț de 0 lei nu mai e citit ca „ingredient gratuit".

Expunerea pe setul demo era **zero** (niciun ingredient fără preț), deci remedierea nu a
schimbat nicio cifră existentă. Pe date reale, unde prețurile lipsesc des, contează.

Pinat de 8 teste + mutația „prețul zero redevine «ingredient gratuit»" (prinsă, 5 teste pică).

### A-2 · Cinci goluri în suita de audit — **ÎNCHISE**

Găsite prin testare prin mutație, nu prin citire. Fiecare e acum acoperit:

| Mutația care scăpa | Ce nu se testa | Test adăugat |
|---|---|---|
| Numitorul preferă PMIX în locul Sales Report | fixtura nu avea Sales Report | precădere declarată + FC pe fiecare numitor (4,50% vs 5,19%) |
| Proiecția returnează starea întreagă | rolul regional (vede compania, dar limitat la un subset) | 3 teste pe rolul regional |
| Validatorul Advisor acceptă orice număr | se testa doar naratiunea *corectă* | naratiune cu cifre fabricate → respinsă, cu numerele numite |
| Interacțiunea simulării forțată la zero | scenariul era pe o singură dimensiune | scenariu mixt preț+rețetă+mix, interacțiune 240 lei ≠ 0 |
| Felia de cost incomplet ascunsă | consecința lui A-1 | vezi A-1 |

### A-3 · Fixtura de test cerea o săptămână fără vânzări — **fals pozitiv, nu defect**

Prima rulare a picat pe `analizaTimeline` returnând `metrici: null`. Comportamentul motorului e
corect (săptămâna 13–19 iulie chiar nu are vânzări, iar analiza se declară indisponibilă cu motiv,
în loc să raporteze zero). Testul a fost ancorat pe o săptămână cu date, iar refuzul a devenit el
însuși o aserțiune.

### A-4 · Import PMIX fără coloană de canal — **comportament corect, acum pinat**

Un fișier de vânzări fără canal e **respins**, nu alocat: rândurile sunt ignorate cu avertisment
explicit, importul primește diagnostic BLOCANT `NIMIC_IMPORTAT` și nu se activează. `VanzareFapt`
nu are stare UNKNOWN, deci a inventa un canal ar fi singura alternativă — și nu se face.
Am confundat asta cu un defect al fixturii mele; e de fapt exact cerința „never invent a channel".

### A-5 · Scalarea peste ~30 de restaurante — **limitare măsurată, neremediat**

**Severitate: mică azi, în creștere.** `analizaTimeline` la nivel de companie rulează `metriciFC` +
`comparaFC` o dată per restaurant, fiecare rescanând tot `state.vanzari`.

| Restaurante | Rânduri de vânzări | Analiză pe companie |
|---|---|---|
| 6 | 10 752 | 188 ms |
| 12 | 21 504 | 352 ms |
| 24 | 43 008 | 794 ms |
| 48 | 86 016 | 2 242 ms |

Sub o secundă până la ~24 de restaurante — acceptabil pentru rețeaua curentă. La 48 devine
vizibil. Nu am restructurat un motor validat la finalul unui PR de audit; în schimb suita are
acum o pază împotriva unei regresii *pătratice* (raport între 8 și 16 restaurante, independentă
de viteza mașinii). Remedierea firească e indexarea vânzărilor pe restaurant în `buildCtx` —
lucru pentru un PR propriu, sau direct pe server (vezi §6).

## 4. Ce am verificat, pe dimensiuni

**A. Corectitudinea calculului** — două motoare, aceeași cifră (Δ = 0 pe 4 scopuri × 5 mărimi).
FC-ul companiei e raportul sumelor, **nu media FC-urilor restaurantelor**. Δpp și Δ% nu se
confundă. Toate procentele stau pe numitorul declarat.

**B. Integritatea datelor** — Companie = Σ Restaurante, exact. Partea de 2.9 fără restaurant e
declarată separat, **nu repartizată**. Niciun restaurant nu apare de două ori. Rândul unui
restaurant din tabel = analiza rulată direct pe el.

**C. Importurile** — șapte fișiere ostile (gol, coloane malformate, tip ambiguu, perioadă lipsă,
celulă de perioadă goală, produs inexistent, granularitate mixtă): **niciunul nu a atins datele
active**, fiecare și-a spus starea și motivul, fiecare a lăsat urmă în audit. Duplicatul e
`DUPLICAT`, nu eroare, și nu dublează nimic. O pregătire făcută pe o stare veche e refuzată la
activare, iar importul dintre timp **nu e rulat înapoi**.

**D. Versionarea** — costul din 10 iulie folosește versiunea 1 (1 leu), cel din 20 iulie
versiunea 2 (4 lei). Un import de preț din august **nu rescrie** costul lunii iulie. Luna iulie
conține ambele regimuri, nu doar cel activ azi.

**E. Perioadele** — marginile de lună și de an nu amestecă. Pe săptămâni, partea de 2.9 se
declară indisponibilă cu motiv în loc să fie fabricată din date lunare. Comparația cu anul
precedent e refuzată pe săptămâni, explicit. O perioadă fără date se declară indisponibilă.
Seria conține doar perioade cu date — nu goluri inventate.

**F. Izolarea Companie/Restaurant** — proiecția `stareAutorizata` nu lasă niciun rând străin
(verificat cu `scurgeri`, nu prin inspecție vizuală). Dosarul Advisor al unui manager nu conține
șirul altui restaurant nicăieri în JSON. Rolul regional — cel periculos, cu vedere pe companie
dar limitat la un subset — primește doar subsetul.

**G. Canalele** — Total = InStore + Delivery ca *sume*; FC-ul se recalculează din totaluri, nu se
mediază. 2.9 fără canal declarat rămâne `UNKNOWN` și **nu se repartizează** pe canal; semnalul e
ridicat. Un PMIX fără canal e refuzat, nu alocat.

**H. AI Advisor** — fiecare cifră poartă motor, câmp și scop. Cifrele indisponibile poartă
motivul, nu zero. Naratiunea deterministă trece validatorul; o naratiune cu cifre fabricate e
**respinsă, cu numerele străine numite**. Neexplicatul din dosar = grupa punții, la virgulă, și
nu e atribuit vreunei cauze cunoscute. Prioritățile urmează reguli deterministe scrise lângă ele;
nicio recomandare de prioritate mare din date slabe. Fără dovezi, Advisorul rostește exact
*„Date insuficiente pentru o concluzie sigură."* și nu inventează nicio cifră.

**I. Simulările** — datele reale rămân **bit-identice** (comparație pe JSON înainte/după).
Două rulări identice dau exact același rezultat. `baseline + Σ efecte + interacțiune = scenariu`,
exact. Pe un scenariu mixt interacțiunea e 240 lei — și fără termenul ăla identitatea se rupe,
ceea ce e testat explicit.

**J. Interfața** — toate cele 10 ecrane se randează pe date reale **și pe stare goală**, fără să
crape. Starea goală spune că nu are date în loc să arate zerouri. Scopul e vizibil pe fiecare
ecran. Tabelele largi derulează în containerul lor.

**K. Regresia** — identitățile motorului de ingrediente rămân exacte: `Δcost = preț + consum +
interacțiune` și `consum = rețetă + mix + interacțiune`. Ingredientul fără preț nu primește
efecte inventate.

**L. Performanța** — vezi A-5.

## 4b. Identitatea vizuală — ecranele noi față de aplicația live

Directivă: aplicația live rămâne referința; funcționalitatea nouă trebuie să arate **nativ**,
fără redesign. Auditul a comparat ecranele turnului cu `src/lib/ui.tsx` — sursa de adevăr a
limbajului de design — și cu cele 27 de ecrane existente.

**Ce era deja nativ, verificat:**

* Turnul e **modulul 1 din bara laterală existentă**, nu o aplicație separată: aceeași navigare,
  același `bg-sidebar`, aceeași stare activă `bg-primary text-primary-foreground`.
* `CardKpi` folosește **exact aceleași clase** ca `Kpi` din `ui.tsx`
  (`rounded-md border bg-card px-4 py-3`, etichetă `text-[11px] uppercase tracking-[0.12em]`,
  valoare `num text-2xl font-semibold`). Adaugă doar semantica „indisponibil + motiv".
* Componente reutilizate: `Insigna` ×15, `Sel` ×12, `Camp` ×11, `In` ×33, `Btn` ×3.
* Vocabular de clase existent: `num` ×107, `text-muted-foreground` ×148, `bg-card` ×63.
* Culorile de status sunt **cele stabilite de `Insigna`** (amber, stone, red, emerald, orange,
  sky). Nu s-a introdus niciun al doilea sistem de culori, niciun font nou, nicio animație.

**Trei abateri reale, remediate în acest PR (aliniere, nu redesign):**

| # | Ce era | Ce s-a schimbat |
|---|---|---|
| U-1 | Pe ecranul turnului se vedeau **două bare de filtre suprapuse**: „Context global" (Perioada/Locația/Canal) și „Scop" (granularitate/perioadă/comparație/companie-restaurant/canal). Turnul nu citește deloc selecția globală — niciun fișier din `views/tower/` nu importă `useSel` — deci bara de sus era **inertă**: utilizatorul schimba perioada și nu se mișca nicio cifră. | `App.tsx` nu mai randează cele trei selectoare pentru modulele cu scop propriu. Rândul rămâne, cu aceleași clase, și păstrează `IndicatorServer` (rol + „date filtrate") — context de securitate care trebuie să rămână vizibil — plus o notă că scopul se alege din bara de dedesubt. |
| U-2 | Capetele de tabel din turn: `text-xs uppercase tracking-wide`, fără `font-semibold` — mai mari și mai slabe decât în restul aplicației, în **14 tabele**. | Aliniate la definiția `Th`: `text-[11px] font-semibold uppercase tracking-wider`. |
| U-3 | Titlurile de secțiune din turn: `font-bold`, cu o treaptă mai ușor decât `Titlu` din `ui.tsx`. | Aliniat la `font-extrabold`. |

Toate trei mută ecranele noi **spre** limbajul existent. Zero schimbări de layout, culori,
spațiere, terminologie sau comportament responsive.

**Pinat de 6 teste noi** (secțiunea O): cardul e cardul aplicației; titlurile păstrează greutatea;
capetele de tabel folosesc tipografia din `Th`; cifrele stau pe fontul tabular; **nicio nuanță în
afara vocabularului `Insigna`**; scopul rămâne vizibil fără bara globală. Verificate prin mutație:
un `thead` divergent și o culoare străină (`indigo-600`) pică fiecare suita.

**Îmbunătățiri posibile, NEIMPLEMENTATE aici (opționale, pentru un PR viitor):**

1. `ok`, `danger` și `warn` sunt clase CSS scrise de mână în `index.css`, nu culori Tailwind.
   Variantele cu opacitate (`bg-ok/10`, `border-ok/50`) **nu se rezolvă** — inclusiv în
   `App.tsx`, cod pre-existent. Mutarea lor în `tailwind.config.js` ar face `Insigna` și
   indicatorii de status să folosească tokenii de brand în locul paletei generice.
2. Turnul își reimplementează tabelele în loc să folosească `T`/`Th`/`Td`, iar stările goale în
   loc de `Gol`. Vizual e acum identic, dar extragerea în componentele comune ar preveni o
   viitoare divergență prin construcție, nu prin test.
3. Pe ecranul turnului rămân patru rânduri înaintea conținutului (bară laterală → identitate →
   taburi de secțiune → scop → bandă de context). Comasarea taburilor cu bara de scop ar
   recâștiga spațiu vertical pe laptop — dar e o schimbare de layout, deci în afara acestui PR.


## 5. Postura de securitate — ce garantează infrastructura și ce nu

Formulat exact, fără să promitem ce nu putem ține.

**Ce e enforcat cu adevărat:** doar autentificat pe serverul comun. `server.mjs` filtrează starea
pe rol **înainte** să o trimită (`filtreazaPentruRol`: vânzări, waste, inventar, 2.9 pe linie și
pe material, Sales Report, labor, locații, ținte) și respinge `PUT /api/stare` pentru manageri cu
403. Asta e granița reală.

**Ce NU e o măsură de securitate:** tot ce se întâmplă în client. `stareAutorizata`,
`verificaCerere`, `normalizeazaSelectie`, ascunderea secțiunilor — toate limitează *ce văd
motoarele*, dar oricine are acces la fișierul de stare locală are acces la tot. Aplicația spune
asta ea însăși, în Setări: câmpul „Unde e impusă restricția" arată *pe server* sau *doar în
client*, iar în al doilea caz afișează un avertisment explicit. Nu pretindem altceva nicăieri.

Ce am verificat adversarial, în limitele astea:

* un manager care cere explicit alt restaurant e readus în scopul lui;
* un manager care cere scopul COMPANIE e readus la restaurantul lui;
* cererea directă pe alt restaurant e refuzată, cu cod și motiv;
* scopul dedus din parametri străini se întoarce cu refuzuri, nu cu date;
* ecranul randat pentru un manager cu selecție forțată nu conține alt restaurant;
* managerul nu poate scrie deloc; un import pentru alt restaurant e refuzat **înainte** de orice
  scriere; un import de companie e refuzat unui rol fără vedere pe companie;
* refuzurile se înregistrează în urma de acces, cu scop și motiv.

Fiecare din punctele astea e pinat de o mutație care, injectată, pică suita.

**Limită de proiect, nu defect:** aplicația e mono-utilizator, iar jurnalul de acces din client e
o comoditate — jurnalul de nefalsificat e cel de pe server. Urma de acces reține maximum 500 de
intrări și nu stochează date personale peste identificatorul de actor deja folosit de auditul de
import.

## 6. Limite cunoscute (nu sunt defecte)

1. **Două motoare de FC coexistă.** Identice azi, pinate să rămână așa. Consolidarea cere
   rescrierea a patru ecrane vechi.
2. **R-6 — rollup-ul pe categorie urmează clasificatorul vechi.** `linii29 → nboFC` pică implicit
   pe FOOD pentru categoriile fără regulă. Comportament pre-existent, **păstrat intenționat și
   vizibil**: puntea pe material — calea onestă — ține aceeași categorie în `UNCLASSIFIED`,
   avertismentul de import o spune explicit, iar divergența e pinată în `test-fc29m.ts` și în
   secțiunea B a auditului final.
3. **FC operațional / Curat / Paper doar pe Total** — raportul 2.9 nu conține canalul.
4. **Proiecția de profit e o regresie liniară fără sezonalitate**, declarată ca atare în UI.
5. **Scalarea peste ~30 de restaurante** — vezi A-5.
6. **Waste și Inventar lipsesc** din descompunerea variance-ului; până la import, partea lor
   rămâne în „Neexplicat" și e numită acolo, nu repartizată.

## 7. Verdict

**READY.**

Cu următoarele precizări, care fac parte din verdict:

* Un defect real de calcul a fost găsit și remediat (A-1), cu 8 teste de regresie și fără să
  miște vreo cifră existentă.
* Nicio scurgere între restaurante nu a fost găsită pe niciuna dintre căile testate — dar
  garanția rămâne **pe server**, iar aplicația spune asta explicit acolo unde contează. Cine
  rulează varianta locală trebuie să știe că rolul e o preferință de afișare.
* Limitarea de scalare (A-5) e măsurată și declarată, nu ascunsă. Nu blochează rețeaua curentă.
* Toate cele 18 mutații deliberate (16 în motoare, 2 în stratul vizual) au fost prinse de suită.

Porți: `pnpm test` 2516/2516 · `pnpm typecheck` fără erori · `pnpm build` reușit.
