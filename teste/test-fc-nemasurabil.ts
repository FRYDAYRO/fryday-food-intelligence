// Regresie: „Food Cost a crescut cu +45,1 pp față de 2026-07: 0,0% → 45,1%".
//
// Defectul: cost 0 peste vânzări nenule era raportat drept Food Cost 0%, nu drept Food Cost
// necunoscut. O lună fără rețetar devenea astfel o bază de comparație, iar narativul executiv
// anunța o creștere care nu s-a întâmplat — întreaga valoare a lunii curente, prezentată drept
// variație, și absorbită apoi de „efectul mixului" (reziduul unei diferențe inexistente).
//
// Identități verificate aici:
//   cost = 0 ∧ acoperire = 0 ∧ net > 0  ⇒  FC = null              (în TOATE motoarele)
//   cost = 0 ∧ acoperire > 0            ⇒  FC = 0                 (zero real, măsurat)
//   fcInainte = null                    ⇒  deltaPP = null ∧ efectMixPP = null
//   fixul nu atinge nicio cifră dintr-o perioadă cu acoperire — vezi §5
import { buildCtx, fcPerioada, areCostMasurabil } from '../src/lib/engine';
import { narativExecutiv } from '../src/lib/decizii';
import { stareGoala } from '../src/lib/seed';
import { recipeFC } from '../src/lib/fc-core';
import { metriciFC } from '../src/lib/fc-timeline';
import { COMPANIE, perioadaDin } from '../src/lib/fc-domeniu';
import type { AppState, Ingredient, Produs, Reteta, VanzareFapt } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

// ————————————————————————————————————————————————————————— fixtura, cu cifre de mână
//
//   I1 = 45,10 lei/kg · P1 = 0,1 kg I1  ⇒  4,51 lei/porție
//   P2 („milkshake") NU are rețetă — exact cazul din rețetarul incomplet.
//   P3 are rețetă, dar dintr-un ingredient cu preț 0 ⇒ cost real 0.
//
//   august : 100 × P1, 1000 lei net ⇒ cost 451 ⇒ FC 45,1%
//   iulie  : 100 × P2, 1000 lei net ⇒ cost   0, acoperire 0  ⇒ FC necunoscut

const ing = (cod: string, pret: number): Ingredient =>
  ({ cod, denumire: cod, categorie: 'Carne', tip: 'FOOD', um: 'kg', preturi: [{ validDeLa: '2026-01-01', pret }], activ: true });

const prod = (cod: string): Produs =>
  ({ cod, denumire: cod, categorie: 'Test', tip: 'SIMPLU', pretInstore: 11.9, pretDelivery: 11.9, tva: 19, activ: true });

const reteta = (cod: string, comp: string): Reteta => ({
  cod, tip: 'PRODUS', denumire: cod, activa: 1,
  versiuni: [{ nr: 1, data: '2026-01-01', linii: [{ comp, tipComp: 'INGREDIENT', cant: 0.1, um: 'kg', canal: 'AMBELE' }] }],
});

const v = (data: string, produs: string, cant: number, net: number): VanzareFapt =>
  ({ data, locatie: 'L01', canal: 'INSTORE', produs, cant, brut: net * 1.19, net });

const BAZA: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'Test' }],
  ingrediente: [ing('I1', 45.1), ing('I0', 0)],
  produse: [prod('P1'), prod('P2'), prod('P3')],
  retete: [reteta('P1', 'I1'), reteta('P3', 'I0')],
  tinte: [{ locatie: 'RETEA', fcCurat: 30 }],
};

const stare = (vanzari: VanzareFapt[], extra: Partial<AppState> = {}): AppState =>
  ({ ...BAZA, vanzari, ...extra });

// ————————————————————————————————————————————————— 1. predicatul, singura regulă
console.log('— 1. areCostMasurabil —');
t('acoperire zero și cost zero ⇒ nemăsurabil', areCostMasurabil(0, 0) === false);
t('acoperire pozitivă ⇒ măsurabil (chiar la cost 0)', areCostMasurabil(1000, 0) === true);
t('cost pozitiv fără net acoperit ⇒ măsurabil (produse la preț 0)', areCostMasurabil(0, 12) === true);
t('acoperire negativă e imposibilă, dar nu produce un FC', areCostMasurabil(-1, 0) === false);

// ————————————————————————— 2. cazul exact din raport: iulie fără rețete, august cu
console.log('\n— 2. fcPerioada: vânzări fără rețetar ⇒ FC null, nu 0 —');
const S = stare([v('2026-07-10', 'P2', 100, 1000), v('2026-08-10', 'P1', 100, 1000)]);
const CTX = buildCtx(S);
const iul = fcPerioada(S, CTX, '2026-07', 'RETEA');
const aug = fcPerioada(S, CTX, '2026-08', 'RETEA');

t('iulie: numitorul există', aprox(iul.net, 1000), `${iul.net}`);
t('iulie: costul e zero', aprox(iul.costTeoretic, 0));
t('iulie: acoperirea e zero', iul.acoperire === 0, `${iul.acoperire}`);
t('iulie: fcTeoretic e NULL, nu 0', iul.fcTeoretic === null, `${iul.fcTeoretic}`);
t('iulie: fcTeoreticAcoperit rămâne null', iul.fcTeoreticAcoperit === null);
t('iulie: fcPaper e NULL, nu 0', iul.fcPaper === null, `${iul.fcPaper}`);
t('iulie: variancePP nu se calculează pe un FC inexistent', iul.variancePP === null);
t('august: fcTeoretic = 451/1000 = 45,1%', aug.fcTeoretic !== null && aprox(aug.fcTeoretic, 45.1, 1e-9), `${aug.fcTeoretic}`);

// ————————————————————————————————————————————— 3. narativul nu mai inventează variația
console.log('\n— 3. narativExecutiv: fără bază măsurabilă, fără verdict —');
const n = narativExecutiv(S, CTX, '2026-08');
t('fcInainte e null', n.fcInainte === null, `${n.fcInainte}`);
t('fcAcum e 45,1%', n.fcAcum !== null && aprox(n.fcAcum, 45.1, 1e-9));
t('deltaPP e null — NU +45,1', n.deltaPP === null, `${n.deltaPP}`);
t('efectMixPP e null — reziduul unei diferențe inexistente nu se publică', n.efectMixPP === null, `${n.efectMixPP}`);
t('efectPreturiPP rămâne o cifră (se măsoară pe mixul lunii curente)', typeof n.efectPreturiPP === 'number');

const text = n.paragrafe.join(' ');
t('narativul NU mai anunță o creștere', !/a crescut/.test(text), text.slice(0, 60));
t('narativul NU mai afișează „0,0% →"', !/0,0% →/.test(text));
t('narativul spune de ce lipsește comparația', /nu se poate face/.test(text));
t('narativul numește cauza: produse fără rețetă', /n-are rețetă/.test(text));
t('narativul spune explicit „necunoscut, nu zero"', /necunoscut, nu zero/.test(text));
t('narativul nu mai pronunță o pârghie pe efectul mixului', !/Presiunea vine din/.test(text));
t('narativul nu declară nici „în target", nici depășire', !/în target|depășire de/.test(text));

// ————————————————————————— 4. cele două cauze se disting: rețetar lipsă vs PMIX lipsă
console.log('\n— 4. cauza lipsei se numește corect —');
const SR = stare([v('2026-08-10', 'P1', 100, 1000)],
  { salesReport: [{ data: '2026-07-10', locatie: 'L01', canal: 'INSTORE', net: 1000 }] });
const nSR = narativExecutiv(SR, buildCtx(SR), '2026-08');
const tSR = nSR.paragrafe.join(' ');
t('doar Sales Report în iulie ⇒ deltaPP null', nSR.deltaPP === null);
t('cauza numită e lipsa PMIX-ului, nu lipsa rețetei', /fără PMIX/.test(tSR) && !/n-are rețetă/.test(tSR), tSR.slice(0, 40));

const SG = stare([v('2026-08-10', 'P1', 100, 1000)]);
const nSG = narativExecutiv(SG, buildCtx(SG), '2026-08');
t('iulie complet gol ⇒ „Nu există date"', /Nu există date pentru 2026-07/.test(nSG.paragrafe.join(' ')));

// —————————————————————————————— 5. fixul NU atinge o perioadă cu acoperire (non-regresie)
console.log('\n— 5. perioadele măsurabile rămân bit-identice —');
const SB = stare([v('2026-07-10', 'P1', 100, 1000), v('2026-08-10', 'P1', 100, 1000)]);
const CB = buildCtx(SB);
const nB = narativExecutiv(SB, CB, '2026-08');
t('iulie măsurabil ⇒ FC 45,1%', fcPerioada(SB, CB, '2026-07', 'RETEA').fcTeoretic === 45.10000000000001
  || aprox(fcPerioada(SB, CB, '2026-07', 'RETEA').fcTeoretic!, 45.1, 1e-9));
t('deltaPP = 0 (nu null) când ambele luni sunt măsurabile', nB.deltaPP !== null && aprox(nB.deltaPP, 0, 1e-9), `${nB.deltaPP}`);
t('efectMixPP redevine o cifră', nB.efectMixPP !== null && aprox(nB.efectMixPP, 0, 1e-9), `${nB.efectMixPP}`);
t('descompunerea se publică din nou', /Descompunerea variației teoretice/.test(nB.paragrafe.join(' ')));

// cost real zero, cu acoperire: 0% e o măsurătoare, nu o lipsă
const SZ = stare([v('2026-07-10', 'P3', 100, 1000)]);
const z = fcPerioada(SZ, buildCtx(SZ), '2026-07', 'RETEA');
t('rețetă cu ingredient la preț 0 ⇒ acoperire 100%', z.acoperire === 100, `${z.acoperire}`);
t('… iar FC-ul e 0%, NU null: zeroul e măsurat', z.fcTeoretic === 0, `${z.fcTeoretic}`);
t('… și fcPaper e tot 0, nu null', z.fcPaper === 0, `${z.fcPaper}`);

// —————————————————————————— 6. aceeași regulă în motorul canonic și în Control Tower
console.log('\n— 6. motoarele nu divergă: aceeași perioadă, același verdict —');
const PER_IUL = perioadaDin('2026-07-01', 'LUNA');
const cerere = { perioada: PER_IUL, nivel: COMPANIE, canal: 'TOTAL' as const };
const r = recipeFC(S, CTX, cerere);
t('recipeFC: netAcoperit zero', aprox(r.netAcoperit, 0));
t('recipeFC.fcPct era deja null', r.fcPct === null);
t('recipeFC.fcPeTotalVandut e acum NULL, nu 0', r.fcPeTotalVandut === null, `${r.fcPeTotalVandut}`);
const m = metriciFC(S, CTX, cerere);
t('metriciFC.recipeFcPct e NULL, nu 0', m.recipeFcPct === null, `${m.recipeFcPct}`);
t('… deși numitorul e nenul (deci nu e o lipsă de vânzări)', m.salesRON > 0, `${m.salesRON}`);

// vechi ↔ nou dau ACEEAȘI cifră și pe perioada măsurabilă
const PER_AUG = perioadaDin('2026-08-01', 'LUNA');
const mAug = metriciFC(S, CTX, { perioada: PER_AUG, nivel: COMPANIE, canal: 'TOTAL' });
t('august: motorul vechi și cel canonic dau același FC',
  mAug.recipeFcPct !== null && aug.fcTeoretic !== null && aprox(mAug.recipeFcPct, aug.fcTeoretic, 1e-9),
  `${mAug.recipeFcPct} vs ${aug.fcTeoretic}`);

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
