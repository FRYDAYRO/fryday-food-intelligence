// Compatibilitatea perioadelor, legată în fluxul REAL al aplicației.
//
// Regula de business verificată aici:
//   ACCEPT             — intervale identice → calculul continuă, cifrele NU se schimbă
//   BLOCK              — disjuncte sau suprapuse parțial → cifra COMBINATĂ se reține
//   INSUFFICIENT_DATA  — o sursă fără interval → NU blochează, cifrele rămân neatinse
//
// Ce se blochează: doar rezultatul care amestecă două ferestre. Rapoartele individuale
// rămân întregi și vizibile — un 4.7 e un raport valid despre 4.7 și când nu poate fi
// împărțit la un 2.9 din altă săptămână.
//
// Cazul real care a cerut tot acest strat: 4.7 pe 17–23 august și 2.9 pe 1–9 august.
// Amândouă cad în „2026-08". La granularitate de lună par identice. Nu au nicio zi comună.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCtx, fmtInterval } from '../src/lib/engine';
import { genereazaSeed, stareGoala } from '../src/lib/seed';
import { COMPANIE, perioadaDin } from '../src/lib/fc-domeniu';
import { compatibilitate } from '../src/lib/compatibilitate';
import {
  COMBINATIE_FC, bandaPerioade, descrieInterval, descrieVerdict, intervaleSurse, verdictCombinare,
  type SursaCombinabila,
} from '../src/lib/perioade-surse';
import { BandaPerioade } from '../src/views/tower/parti';
import { ContinutTower } from '../src/views/tower/ControlTower';
import { TowerProvider, type TowerCtx } from '../src/views/tower/context';
import { accesTower, type SelectieFC } from '../src/lib/fc-tower';
import { nboFC, numitorFC, recipeFC, reconciliationFC } from '../src/lib/fc-core';
import { bridgeFC } from '../src/lib/fc-bridge';
import { metriciFC } from '../src/lib/fc-timeline';
import { areDateDemo, reconciliaza } from '../src/lib/reconciliere';
import { activeazaImport, pregatesteImport } from '../src/lib/import-center';
import type { AppState, Material29, VanzareFapt, VersiuneSursa } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

// ————————————————————————————————————————————————————————— fixtura
//
// O lună (august 2026), un restaurant, vânzări și consum 2.9 — tot ce trebuie ca puntea
// să fie disponibilă. Singurul lucru care variază între cazuri sunt INTERVALELE declarate
// de versiunile de import.

const LUNA = perioadaDin('2026-08-15', 'LUNA');

const vz = (data: string, produs: string, cant: number, net: number): VanzareFapt =>
  ({ data, locatie: 'L01', canal: 'INSTORE', produs, cant, brut: net * 1.11, net });

const mat = (material: string, denumire: string, categorie: string, cost: number): Material29 =>
  ({ perioada: '2026-08', locatie: 'L01', material, denumire, categorie, cant: null, um: null, costActual: cost, costTeoretic: null });

const ver = (
  tip: SursaCombinabila, fisier: string, interval: [string, string] | null, activa = true,
): VersiuneSursa => ({
  id: `${tip}#1`, tip, nr: 1, fisier, amprenta: `fp_${tip}`,
  dataEfectiva: '2026-08-01', importatLa: '2026-08-25T10:00:00.000Z',
  activa, scop: 'RESTAURANT', restaurante: ['L01'], perioada: '2026-08',
  ...(interval ? { intervalDe: interval[0], intervalLa: interval[1] } : {}),
  randuri: 10,
});

const seed = genereazaSeed();
const baza: AppState = {
  ...seed,
  vanzari: [vz('2026-08-18', 'P001', 100, 2000), vz('2026-08-20', 'P002', 50, 1000)],
  salesReport: [{ data: '2026-08-18', locatie: 'L01', canal: 'INSTORE', net: 2900, brut: 3219 }] as AppState['salesReport'],
  materiale29: [mat('I001', 'Piept de pui', 'Carne și pui', 800), mat('A001', 'Ambalaj', 'Ambalaje', 120)],
  linii29: [{ perioada: '2026-08', locatie: 'L01', categorie: 'Carne și pui', valoare: 800 },
    { perioada: '2026-08', locatie: 'L01', categorie: 'Ambalaje', valoare: 120 }] as AppState['linii29'],
  versiuniImport: [],
};

/** Versiune cu UN SINGUR capăt de interval — un interval pe jumătate nu e un interval. */
const verJumatate = (tip: SursaCombinabila, capat: 'DE' | 'LA'): VersiuneSursa => ({
  ...ver(tip, `${tip} pe jumătate.xlsx`, null),
  ...(capat === 'DE' ? { intervalDe: '2026-08-01' } : { intervalLa: '2026-08-31' }),
});

const cu = (versiuni: VersiuneSursa[]): AppState => ({ ...baza, versiuniImport: versiuni });
const cerere = { perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' as const };
const punte = (s: AppState) => bridgeFC(s, buildCtx(s), cerere);

// ————————————————————————————————————————————————————————— 1 · ACCEPT

console.log('— 1 · ACCEPT: intervale identice, calculul continuă —');
const IDENTIC: [string, string] = ['2026-08-01', '2026-08-31'];
const sAccept = cu([ver('PMIX_47', '4.7 august.xlsx', IDENTIC), ver('NBO_29', '2.9 august.xlsx', IDENTIC)]);
const vAccept = verdictCombinare(sAccept, COMBINATIE_FC);
t('verdictul e ACCEPT', vAccept.verdict === 'ACCEPT', vAccept.verdict);
t('… și NU blochează', !vAccept.blocheaza);
t('motorul de comparare spune IDENTIC', vAccept.compat.fel === 'IDENTIC');
t('motivul numește intervalul comun', vAccept.motiv.includes('2026-08-01') && vAccept.motiv.includes('2026-08-31'));
const bAccept = punte(sAccept);
t('puntea rămâne disponibilă', bAccept.nboDisponibil, bAccept.motivNbo ?? '');
t('consumul real e cel din 2.9: 920 lei', aprox(bAccept.nboActual, 920));
t('verdictul e raportat și când e ACCEPT — ecranul poate arăta perioadele',
  bAccept.verdictPerioade.verdict === 'ACCEPT' && bAccept.verdictPerioade.intervale.length === 2);

// ————————————————————————————————————————————————————————— 2 · BLOCK, disjunct

console.log('\n— 2 · BLOCK · DISJUNCT —');
const sDisjunct = cu([
  ver('PMIX_47', '4.7.xlsx', ['2026-08-17', '2026-08-23']),
  ver('NBO_29', '2.9.xlsx', ['2026-08-01', '2026-08-09']),
]);
const vDisj = verdictCombinare(sDisjunct, COMBINATIE_FC);
t('verdictul e BLOCK', vDisj.verdict === 'BLOCK', vDisj.verdict);
t('… și blochează', vDisj.blocheaza);
t('motorul spune DISJUNCT', vDisj.compat.fel === 'DISJUNCT', vDisj.compat.fel);
t('zero zile comune', vDisj.compat.zileComune === 0);
const bDisj = punte(sDisjunct);
t('puntea se declară INDISPONIBILĂ', !bDisj.nboDisponibil);
t('… cu motivul incompatibilității, nu cu altul', (bDisj.motivNbo ?? '').includes('nicio zi comună'));
t('motivul arată ambele ferestre, ca omul să vadă de ce',
  (bDisj.motivNbo ?? '').includes('2026-08-17') && (bDisj.motivNbo ?? '').includes('2026-08-01'));
t('cifra COMBINATĂ nu se produce: fără variance', bDisj.difference === null);
const mDisj = metriciFC(sDisjunct, buildCtx(sDisjunct), cerere);
t('FC-ul actual nu se calculează', mDisj.nboActualFcPct === null && mDisj.nboTotalRON === null);
t('… dar FC-ul din rețete rămâne, e o singură sursă', mDisj.recipeFcPct !== null && mDisj.recipeCostRON > 0);
const recDisj = reconciliationFC(sDisjunct, buildCtx(sDisjunct), cerere);
t('reconcilierea FC blochează și ea partea 2.9', !recDisj.nbo.disponibil && recDisj.fcCuratPct === null);
t('… și poartă verdictul', recDisj.verdictPerioade.verdict === 'BLOCK');
t('nboFC refuză direct, cu același motiv', !nboFC(sDisjunct, cerere).disponibil);

// ————————————————————————————————————————————————————————— 3 · BLOCK, suprapunere parțială

console.log('\n— 3 · BLOCK · SUPRAPUNERE_PARTIALA —');
const sPartial = cu([
  ver('PMIX_47', '4.7.xlsx', ['2026-08-01', '2026-08-15']),
  ver('NBO_29', '2.9.xlsx', ['2026-08-10', '2026-08-25']),
]);
const vPart = verdictCombinare(sPartial, COMBINATIE_FC);
t('verdictul e BLOCK', vPart.verdict === 'BLOCK' && vPart.blocheaza);
t('motorul spune SUPRAPUNERE_PARTIALA', vPart.compat.fel === 'SUPRAPUNERE_PARTIALA', vPart.compat.fel);
t('cele 6 zile comune sunt numărate, nu ignorate', vPart.compat.zileComune === 6, `${vPart.compat.zileComune}`);
t('suprapunerea parțială blochează la fel de ferm ca disjuncția', !punte(sPartial).nboDisponibil);
t('motivul spune că ar împărți consumul unei perioade la vânzările alteia',
  (punte(sPartial).motivNbo ?? '').includes('consumul unei perioade'));
t('zilele fiecărei surse sunt raportate: 15 și 16',
  vPart.compat.zile['4.7 (vânzări pe produs)'] === 15 && vPart.compat.zile['2.9 (consum pe material)'] === 16);

// ————————————————————————————————————————————————————————— 4 · INSUFFICIENT DATA

console.log('\n— 4 · INSUFFICIENT DATA: nu blochează, nu schimbă nicio cifră —');
const sFaraInterval = cu([
  ver('PMIX_47', '4.7.xlsx', ['2026-08-01', '2026-08-31']),
  ver('NBO_29', '2.9.xlsx', null),
]);
const vLipsa = verdictCombinare(sFaraInterval, COMBINATIE_FC);
t('verdictul e INSUFFICIENT_DATA', vLipsa.verdict === 'INSUFFICIENT_DATA', vLipsa.verdict);
t('… și NU blochează', !vLipsa.blocheaza);
t('sursa fără interval e numită', vLipsa.nedeclarate.includes('NBO_29'));
t('motivul spune ce lipsește și ce se poate face', vLipsa.motiv.includes('nu declară intervalul') && vLipsa.motiv.includes('Reimportă'));
const bLipsa = punte(sFaraInterval);
t('puntea rămâne disponibilă', bLipsa.nboDisponibil);
t('IDENTITATE: cifrele sunt EXACT cele de la ACCEPT — necunoscutul nu schimbă nimic',
  aprox(bLipsa.nboActual, bAccept.nboActual) && aprox(bLipsa.difference ?? 0, bAccept.difference ?? 0));
// starea fără nicio versiune de import = tot ce s-a importat înainte de această versiune
const sVechi = cu([]);
const vVechi = verdictCombinare(sVechi, COMBINATIE_FC);
t('o stare fără versiuni de import (date vechi) e INSUFFICIENT_DATA, nu BLOCK',
  vVechi.verdict === 'INSUFFICIENT_DATA' && !vVechi.blocheaza);
t('… iar puntea funcționează neschimbată pe ele',
  punte(sVechi).nboDisponibil && aprox(punte(sVechi).nboActual, bAccept.nboActual));
t('o singură sursă cu interval nu are cu ce fi comparată',
  verdictCombinare(cu([ver('PMIX_47', '4.7.xlsx', ['2026-08-01', '2026-08-31'])]), COMBINATIE_FC).verdict === 'INSUFFICIENT_DATA');

// C03: două surse compatibile NU dau undă verde cât timp o a treia nu-și declară fereastra —
// altfel combinația ar include o sursă cu perioadă necunoscută sub eticheta „ACCEPT"
const sTrei = cu([
  ver('PMIX_47', '4.7.xlsx', IDENTIC),
  ver('NBO_41', '4.1.xlsx', IDENTIC),
  ver('NBO_29', '2.9.xlsx', null),
]);
const vTrei = verdictCombinare(sTrei, ['PMIX_47', 'NBO_41', 'NBO_29']);
t('două surse compatibile + una nedeclarată ⇒ INSUFFICIENT_DATA, NU ACCEPT',
  vTrei.verdict === 'INSUFFICIENT_DATA', vTrei.verdict);
t('… iar sursa nedeclarată e numită, nu tăcută', vTrei.nedeclarate.join() === 'NBO_29');
t('… și tot nu blochează', !vTrei.blocheaza);
t('CONTRA-PROBĂ: aceleași trei surse, toate declarate identic ⇒ ACCEPT',
  verdictCombinare(cu([ver('PMIX_47', 'a', IDENTIC), ver('NBO_41', 'b', IDENTIC), ver('NBO_29', 'c', IDENTIC)]),
    ['PMIX_47', 'NBO_41', 'NBO_29']).verdict === 'ACCEPT');

// C06: un interval pe jumătate nu e un interval
t('o versiune cu doar `intervalDe` NU e considerată declarată',
  verdictCombinare(cu([ver('PMIX_47', 'a', IDENTIC), verJumatate('NBO_29', 'DE')]), COMBINATIE_FC)
    .nedeclarate.includes('NBO_29'));
t('… nici una cu doar `intervalLa`',
  verdictCombinare(cu([ver('PMIX_47', 'a', IDENTIC), verJumatate('NBO_29', 'LA')]), COMBINATIE_FC)
    .verdict === 'INSUFFICIENT_DATA');
t('… și nici nu blochează, fiindcă nu se știe nimic sigur',
  !verdictCombinare(cu([ver('PMIX_47', 'a', IDENTIC), verJumatate('NBO_29', 'DE')]), COMBINATIE_FC).blocheaza);

// C05: doar versiunea ACTIVĂ contează — un import vechi, înlocuit, nu blochează nimic
const sIstoric = cu([
  { ...ver('NBO_29', '2.9 vechi.xlsx', ['2026-06-01', '2026-06-07'], false), id: 'NBO_29#1', nr: 1 },
  { ...ver('NBO_29', '2.9 nou.xlsx', IDENTIC, true), id: 'NBO_29#2', nr: 2 },
  ver('PMIX_47', '4.7.xlsx', IDENTIC),
]);
t('versiunea INACTIVĂ, cu altă fereastră, e ignorată',
  verdictCombinare(sIstoric, COMBINATIE_FC).verdict === 'ACCEPT',
  verdictCombinare(sIstoric, COMBINATIE_FC).verdict);
t('… deci puntea rămâne disponibilă', punte(sIstoric).nboDisponibil);
t('… iar verdictul se sprijină pe exact două intervale, nu pe trei',
  verdictCombinare(sIstoric, COMBINATIE_FC).intervale.length === 2);
t('CONTRA-PROBĂ: dacă cea veche devine activă, blochează',
  verdictCombinare(cu([
    { ...ver('NBO_29', '2.9 vechi.xlsx', ['2026-06-01', '2026-06-07'], true), id: 'NBO_29#1', nr: 1 },
    ver('PMIX_47', '4.7.xlsx', IDENTIC),
  ]), COMBINATIE_FC).blocheaza);

// ————————————————————————————————————————————————————————— 5 · DEMO + REAL

console.log('\n— 5 · DEMO + REAL: MIXT, dar aceeași regulă de compatibilitate —');
t('fixtura conține date demo (produse P00x)', areDateDemo(sDisjunct).demo);
t('DEMO nu slăbește regula: perioade disjuncte tot blochează', !punte(sDisjunct).nboDisponibil);
t('DEMO nu întărește regula: perioade identice tot trec', punte(sAccept).nboDisponibil);
const sReal: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'FRYDAY TEST' }],
  produse: seed.produse.filter(p => p.cod === 'P001'),
  retete: seed.retete.filter(r => r.cod === 'P001'),
  ingrediente: seed.ingrediente,
  vanzari: [vz('2026-08-18', 'P001', 100, 2000)],
  materiale29: [mat('I001', 'Piept de pui', 'Carne și pui', 800)],
  versiuniImport: [
    ver('PMIX_47', '4.7.xlsx', ['2026-08-17', '2026-08-23']),
    ver('NBO_29', '2.9.xlsx', ['2026-08-01', '2026-08-09']),
  ],
};
t('pe date curat REALE (fără demo) verdictul e identic', verdictCombinare(sReal, COMBINATIE_FC).verdict === 'BLOCK');
t('… și blocarea e la fel', !bridgeFC(sReal, buildCtx(sReal), cerere).nboDisponibil);
t('starea reală poartă totuși marcajul demo prin codul P001 — verdictul NU depinde de asta',
  areDateDemo(sReal).demo && verdictCombinare(sReal, COMBINATIE_FC).blocheaza);
t('MIXT nu e o portiță: regula de compatibilitate se aplică identic pe demo, real și mixt',
  verdictCombinare(sDisjunct, COMBINATIE_FC).verdict === verdictCombinare(sReal, COMBINATIE_FC).verdict);

// ————————————————————————————————————————————————————————— 6 · rapoartele individuale

console.log('\n— 6 · Raportul individual rămâne vizibil —');
t('datele importate NU se șterg: liniile 2.9 sunt toate acolo', sDisjunct.materiale29!.length === 2);
t('vânzările 4.7 sunt toate acolo', sDisjunct.vanzari.length === 2);
t('nicio linie nu s-a modificat', JSON.stringify(sDisjunct.materiale29) === JSON.stringify(baza.materiale29));
const recipeDisj = recipeFC(sDisjunct, buildCtx(sDisjunct), cerere);
t('raportul 4.7 singur se calculează normal: cost din rețete > 0', recipeDisj.cost > 0);
t('… identic cu cel din cazul ACCEPT — blocajul nu l-a atins',
  aprox(recipeDisj.cost, recipeFC(sAccept, buildCtx(sAccept), cerere).cost));
t('raportul 2.9 singur rămâne citibil: suma lui e 920 lei',
  aprox(sDisjunct.materiale29!.reduce((s, m) => s + m.costActual, 0), 920));
t('puntea raportează perioadele-sursă chiar și blocată',
  bDisj.verdictPerioade.intervale.length === 2 && bDisj.verdictPerioade.intervale.every(i => i.declarat));
t('fiecare interval se descrie pentru ecran',
  descrieInterval(bDisj.verdictPerioade.intervale[0]).includes('→'));
t('rezumatul verdictului numește starea', descrieVerdict(vDisj).startsWith('BLOCK'));

// ————————————————————————————————————————————————————————— 7 · cazul real

console.log('\n— 7 · CAZUL REAL: 4.7 = 17–23 aug · 2.9 = 1–9 aug, ambele în 2026-08 —');
const REAL_47: [string, string] = ['2026-08-17', '2026-08-23'];
const REAL_29: [string, string] = ['2026-08-01', '2026-08-09'];
const sCazReal = cu([ver('PMIX_47', '4.7 corporate.xlsx', REAL_47), ver('NBO_29', '2.9 corporate.xlsx', REAL_29)]);
t('ambele rapoarte cad în ACEEAȘI lună calendaristică',
  REAL_47[0].slice(0, 7) === '2026-08' && REAL_29[0].slice(0, 7) === '2026-08');
t('versiunile lor păstrează aceeași `perioada` lunară — de aici venea confuzia',
  sCazReal.versiuniImport!.every(v => v.perioada === '2026-08'));
const vReal = verdictCombinare(sCazReal, COMBINATIE_FC);
t('… și totuși verdictul e DISJUNCT, nu IDENTIC', vReal.compat.fel === 'DISJUNCT', vReal.compat.fel);
t('BLOCK, nu ACCEPT', vReal.verdict === 'BLOCK' && vReal.blocheaza);
t('zile: 4.7 are 7, 2.9 are 9',
  vReal.compat.zile['4.7 (vânzări pe produs)'] === 7 && vReal.compat.zile['2.9 (consum pe material)'] === 9,
  JSON.stringify(vReal.compat.zile));
t('zero zile comune — 23 aug < 1 aug e imposibil, ferestrele nu se ating', vReal.compat.zileComune === 0);
t('Food Cost-ul combinat NU se produce', !punte(sCazReal).nboDisponibil);
t('… iar utilizatorul află exact de ce', (punte(sCazReal).motivNbo ?? '').includes('Nu se pot combina'));
// contra-proba: aceleași 7 zile pentru amândouă ⇒ trece
t('CONTRA-PROBĂ: aceleași 7 zile pentru ambele ⇒ ACCEPT',
  verdictCombinare(cu([ver('PMIX_47', 'a', REAL_47), ver('NBO_29', 'b', REAL_47)]), COMBINATIE_FC).verdict === 'ACCEPT');
t('… și puntea redevine disponibilă',
  punte(cu([ver('PMIX_47', 'a', REAL_47), ver('NBO_29', 'b', REAL_47)])).nboDisponibil);
// o zi diferență e de ajuns: compatibil înseamnă IDENTIC, nu „aproape"
t('o singură zi diferență ⇒ tot BLOCK — compatibil înseamnă identic',
  verdictCombinare(cu([ver('PMIX_47', 'a', ['2026-08-17', '2026-08-23']),
    ver('NBO_29', 'b', ['2026-08-17', '2026-08-24'])]), COMBINATIE_FC).verdict === 'BLOCK');

// ————————————————————————————————————————————————————————— 4.1 ca numitor

console.log('\n— 4.1 ca numitor: fereastră greșită ⇒ numitorul rămâne din aceeași sursă cu costul —');
const s41Bun = cu([ver('PMIX_47', '4.7.xlsx', IDENTIC), ver('NBO_41', '4.1.xlsx', IDENTIC)]);
const nBun = numitorFC(s41Bun, cerere, 3000);
t('perioade identice ⇒ numitorul e Sales Report (4.1)', nBun.sursa === 'Sales Report' && aprox(nBun.net, 2900));
const s41Rau = cu([ver('PMIX_47', '4.7.xlsx', ['2026-08-17', '2026-08-23']), ver('NBO_41', '4.1.xlsx', ['2026-06-15', '2026-06-21'])]);
const nRau = numitorFC(s41Rau, cerere, 3000);
t('perioade disjuncte ⇒ numitorul NU mai e 4.1', nRau.sursa === 'PMIX' && aprox(nRau.net, 3000));
t('… iar motivul e declarat, nu tăcut', !!nRau.motivIncompatibil && nRau.motivIncompatibil!.includes('nicio zi comună'));
t('nota explică substituirea', nRau.nota.includes('altă perioadă'));
t('fără versiuni de import, numitorul rămâne EXACT cel dinainte',
  numitorFC(cu([]), cerere, 3000).sursa === 'Sales Report');
const recon = reconciliaza(s41Rau, buildCtx(s41Rau), '2026-08');
t('Reconcilierea: netul fiecărei surse rămâne VIZIBIL',
  recon.netPmix > 0 && recon.netSales !== null && aprox(recon.netSales!, 2900));
t('… dar diferența dintre ele se reține — ea e cifra combinată',
  recon.diferenta === null && recon.diferentaPct === null && recon.inToleranta === null);
t('… cu verdictul atașat', recon.verdictPerioade.verdict === 'BLOCK');
const reconBun = reconciliaza(s41Bun, buildCtx(s41Bun), '2026-08');
t('perioade identice ⇒ diferența se calculează ca înainte', reconBun.diferenta !== null);
t('IDENTITATE: aceeași diferență ca fără verificare de perioade',
  aprox(reconBun.diferenta!, reconciliaza(cu([]), buildCtx(baza), '2026-08').diferenta!));

// ————————————————————————————————————————————————————————— intervalul chiar ajunge în stare

console.log('\n— Intervalul se păstrează la import: antetul NCR nu se mai aruncă —');
const GRILA: unknown[][] = [
  ['FRYDAY TIMISOARA', '', 'Fiscal Year: 2026'],
  ['4.7 Sales Mix', '', ''],
  ['Corporate Start Date: 08/17/2026', '', 'End Date: 08/23/2026'],
  ['Menu Item Name', 'Qty', 'Price', 'Extension'],
  ['Crispy Burger', 10, 20, 200],
];
const impGrila = activeazaImport(cu([]), pregatesteImport(cu([]), {
  fisier: 'pmix 4.7 august.xlsx', acum: '2026-08-25T10:00:00.000Z',
  parsat: { foaie: 'x', antete: ['Menu Item Name', 'Qty', 'Price', 'Extension'], randuri: [], matrice: GRILA },
  tip: 'PMIX_47', locatie: 'L01',
}));
t('un 4.7 din grilă fără restaurant declarat rămâne refuzat — garda veche e neatinsă',
  !pregatesteImport(cu([]), {
    fisier: 'pmix 4.7.xlsx', acum: '2026-08-25T10:00:00.000Z', tip: 'PMIX_47',
    parsat: { foaie: 'x', antete: ['Menu Item Name', 'Qty', 'Price', 'Extension'], randuri: [], matrice: GRILA },
  }).valid);
t('importul din grilă reține intervalul din antet',
  impGrila.rezultat.intervalDe === '2026-08-17' && impGrila.rezultat.intervalLa === '2026-08-23',
  `${impGrila.rezultat.intervalDe} → ${impGrila.rezultat.intervalLa}`);
const verGrila = (impGrila.stareNoua.versiuniImport ?? []).at(-1);
t('… și îl scrie în versiunea persistată',
  verGrila?.intervalDe === '2026-08-17' && verGrila?.intervalLa === '2026-08-23');
t('… lângă perioada lunară, care rămâne cum era', verGrila?.perioada === '2026-08' || verGrila?.perioada === null);
const impTabel = activeazaImport(cu([]), pregatesteImport(cu([]), {
  fisier: 'NBO 4.1 vanzari.xlsx', acum: '2026-08-25T10:00:00.000Z',
  parsat: {
    foaie: 'x', antete: ['Data', 'Restaurant', 'Canal', 'Vanzari nete'],
    randuri: [
      { Data: '2026-06-15', Restaurant: 'L01', Canal: 'InStore', 'Vanzari nete': 100 },
      { Data: '2026-06-21', Restaurant: 'L01', Canal: 'InStore', 'Vanzari nete': 120 },
      { Data: '2026-06-18', Restaurant: 'L01', Canal: 'InStore', 'Vanzari nete': 110 },
    ],
  },
}));
t('un raport tabelar își ia intervalul din min/max-ul datelor, nu din ordinea rândurilor',
  impTabel.rezultat.intervalDe === '2026-06-15' && impTabel.rezultat.intervalLa === '2026-06-21',
  `${impTabel.rezultat.intervalDe} → ${impTabel.rezultat.intervalLa}`);
const faraAntet = activeazaImport(cu([]), pregatesteImport(cu([]), {
  fisier: 'nomenclator.xlsx', acum: '2026-08-25T10:00:00.000Z',
  parsat: { foaie: 'x', antete: ['Cod', 'Denumire', 'UM'], randuri: [{ Cod: 'I001', Denumire: 'Pui', UM: 'kg' }] },
}));
t('un fișier fără nicio dată NU primește un interval inventat',
  faraAntet.rezultat.intervalDe === null && faraAntet.rezultat.intervalLa === null);
// un antet care declară doar începutul nu descrie o fereastră: se raportează ca nedeclarat
const GRILA_JUMATATE: unknown[][] = [
  ['FRYDAY TIMISOARA', '', 'Fiscal Year: 2026'],
  ['4.7 Sales Mix', '', ''],
  ['Corporate Start Date: 08/17/2026', '', ''],
  ['Menu Item Name', 'Qty', 'Price', 'Extension'],
  ['Crispy Burger', 10, 20, 200],
];
const impJumatate = pregatesteImport(cu([]), {
  fisier: 'pmix 4.7 partial.xlsx', acum: '2026-08-25T10:00:00.000Z', tip: 'PMIX_47', locatie: 'L01',
  parsat: { foaie: 'x', antete: ['Menu Item Name', 'Qty', 'Price', 'Extension'], randuri: [], matrice: GRILA_JUMATATE },
});
t('antet cu Start Date dar fără End Date ⇒ interval NEDECLARAT, nu pe jumătate',
  impJumatate.rezultat.intervalDe === null && impJumatate.rezultat.intervalLa === null,
  `${impJumatate.rezultat.intervalDe} → ${impJumatate.rezultat.intervalLa}`);
const verFara = (faraAntet.stareNoua.versiuniImport ?? []).at(-1);
t('… iar versiunea lui nu poartă câmpurile deloc',
  verFara !== undefined && verFara.intervalDe === undefined && verFara.intervalLa === undefined);
t('… deci verdictul cu el rămâne INSUFFICIENT_DATA, nu BLOCK',
  verdictCombinare(faraAntet.stareNoua, COMBINATIE_FC).verdict === 'INSUFFICIENT_DATA');

console.log('\n— Motorul de comparare nu a fost atins —');
t('compatibilitate() se comportă exact ca înainte pe intervale identice',
  compatibilitate([{ raport: 'a', de: '2026-08-01', la: '2026-08-07' },
    { raport: 'b', de: '2026-08-01', la: '2026-08-07' }]).fel === 'IDENTIC');
t('… și pe cazul real', compatibilitate([
  { raport: '4.7', de: '2026-08-17', la: '2026-08-23' },
  { raport: '2.9', de: '2026-08-01', la: '2026-08-09' }]).fel === 'DISJUNCT');
t('intervaleSurse întoarce sursele în ordine stabilă',
  intervaleSurse(sCazReal).map(i => i.tip).join() === 'NBO_29,PMIX_47');
t('… și doar pe cele cerute', intervaleSurse(sCazReal, ['NBO_41']).length === 0);

console.log('\n— Formatarea intervalului —');
t('aceeași lună: „17–23 Aug 2026"', fmtInterval('2026-08-17', '2026-08-23') === '17–23 Aug 2026', fmtInterval('2026-08-17', '2026-08-23'));
t('luni diferite, același an: „28 Iul – 3 Aug 2026"', fmtInterval('2026-07-28', '2026-08-03') === '28 Iul – 3 Aug 2026', fmtInterval('2026-07-28', '2026-08-03'));
t('ani diferiți: anul apare de două ori', fmtInterval('2025-12-28', '2026-01-03') === '28 Dec 2025 – 3 Ian 2026', fmtInterval('2025-12-28', '2026-01-03'));
t('o singură zi nu se scrie ca interval', fmtInterval('2026-08-17', '2026-08-17') === '17 Aug 2026');
t('fără interval ⇒ „—", nu o dată inventată',
  fmtInterval(null, '2026-08-17') === '—' && fmtInterval('2026-08-17', null) === '—' && fmtInterval(null, null) === '—');
t('zilele nu se scriu cu zero în față', fmtInterval('2026-08-01', '2026-08-09') === '1–9 Aug 2026', fmtInterval('2026-08-01', '2026-08-09'));

console.log('\n— Banda de perioade: selectorul —');
const bandaReal = bandaPerioade(cu([
  ver('PMIX_47', '4.7 corporate.xlsx', REAL_47),
  ver('NBO_29', '2.9 corporate.xlsx', REAL_29),
  ver('NBO_41', '4.1 corporate.xlsx', ['2026-06-15', '2026-06-21']),
]));
t('statusul e BLOCK', bandaReal.status === 'BLOCK', bandaReal.status);
t('toate cele TREI surse apar', bandaReal.intervale.length === 3);
t('sunt DOUĂ combinații, nu una „globală"', bandaReal.combinatii.length === 2);
t('combinația de Food Cost e 2.9 × 4.7', bandaReal.combinatii[0].cheie === 'FOOD_COST');
t('combinația de numitor e 4.1 × 4.7', bandaReal.combinatii[1].cheie === 'NUMITOR');
t('ambele blochează pe cazul real', bandaReal.combinatii.every(c => c.verdict.blocheaza));
t('IDENTITATE: verdictul benzii = verdictul punții, prin ACEEAȘI funcție',
  JSON.stringify(bandaReal.combinatii[0].verdict) === JSON.stringify(punte(sCazReal).verdictPerioade));
t('fără 4.1 importat, combinația de numitor nici nu apare',
  bandaPerioade(sCazReal).combinatii.length === 1);
t('stare fără nicio sursă ⇒ GOL', bandaPerioade(cu([])).status === 'GOL');
t('… iar banda nu se randează deloc', renderToStaticMarkup(h(BandaPerioade, { date: bandaPerioade(cu([])) })) === '');
t('perioade identice ⇒ ACCEPT', bandaPerioade(sAccept).status === 'ACCEPT');
t('o sursă nedeclarată ⇒ INSUFFICIENT_DATA', bandaPerioade(sFaraInterval).status === 'INSUFFICIENT_DATA');
t('un BLOCK bate un INSUFFICIENT: statusul arată cel mai grav',
  bandaPerioade(cu([ver('PMIX_47', 'a', REAL_47), ver('NBO_29', 'b', REAL_29), ver('NBO_41', 'c', null)])).status === 'BLOCK');

console.log('\n— Banda de perioade: randarea celor cinci stări —');
const randB = (d: ReturnType<typeof bandaPerioade>) => renderToStaticMarkup(h(BandaPerioade, { date: d }));
const htmlBlock = randB(bandaReal);
t('BLOCK · insigna spune BLOCAT', htmlBlock.includes('data-status="BLOCK"') && htmlBlock.includes('BLOCAT'));
t('… arată intervalul fiecărei surse, formatat', htmlBlock.includes('17–23 Aug 2026')
  && htmlBlock.includes('1–9 Aug 2026') && htmlBlock.includes('15–21 Iun 2026'));
t('… cu numele scurt al raportului', htmlBlock.includes('>4.7<') && htmlBlock.includes('>2.9<') && htmlBlock.includes('>4.1<'));
// ancorat pe rândul sursei: „7 zile" apare și în motivul verdictului, deci un `includes`
// pe tot documentul ar trece chiar dacă rândul n-ar mai număra nimic
// tăiat la începutul rândului URMĂTOR: un `</div>` lazy ar sări peste rândul propriu și
// ar înghiți zilele vecinului, iar testul ar trece degeaba
const randSursa = (html: string, tip: string) => {
  const de = html.indexOf(`data-sursa="${tip}"`);
  if (de < 0) return '';
  const urm = html.indexOf('data-sursa="', de + 12);
  return html.slice(de, urm < 0 ? html.length : urm);
};
t('… și cu zilele fiecăruia, pe rândul lui',
  randSursa(htmlBlock, 'PMIX_47').includes('7 zile') && randSursa(htmlBlock, 'NBO_29').includes('9 zile'),
  randSursa(htmlBlock, 'PMIX_47').slice(0, 160));
t('… și cu fișierul din care vine', randSursa(htmlBlock, 'NBO_29').includes('2.9 corporate.xlsx'));
t('rândul unei surse nedeclarate NU numără zile',
  !randSursa(randB(bandaPerioade(sFaraInterval)), 'NBO_29').includes('zile'));
t('… numește felul incompatibilității', htmlBlock.includes('DISJUNCT'));
t('… spune ce calcul se pierde', htmlBlock.includes('Se pierde:'));
t('… și că rapoartele individuale rămân vizibile',
  htmlBlock.includes('data-zona="individuale"') && htmlBlock.includes('rămâne complet vizibil'));
t('… fiecare sursă are ancora ei', ['PMIX_47', 'NBO_29', 'NBO_41'].every(x => htmlBlock.includes(`data-sursa="${x}"`)));
t('… și fiecare combinație pe a ei',
  htmlBlock.includes('data-combinatie="FOOD_COST"') && htmlBlock.includes('data-combinatie="NUMITOR"'));

const htmlPartial = randB(bandaPerioade(sPartial));
t('SUPRAPUNERE_PARTIALA · blochează la fel', htmlPartial.includes('data-status="BLOCK"'));
t('… dar își spune felul propriu', htmlPartial.includes('SUPRAPUNERE_PARTIALA'));
t('… și numărul de zile comune', htmlPartial.includes('6 zile comune'));

const htmlAccept = randB(bandaPerioade(sAccept));
t('ACCEPT · insigna spune COMPATIBIL', htmlAccept.includes('data-status="ACCEPT"') && htmlAccept.includes('COMPATIBIL'));
t('… fără mesajul de rapoarte individuale, că n-a blocat nimic', !htmlAccept.includes('data-zona="individuale"'));
t('… și tot arată perioada, nu doar starea', htmlAccept.includes('1–31 Aug 2026'));

const htmlLipsa = randB(bandaPerioade(sFaraInterval));
t('INSUFFICIENT_DATA · insigna spune NEDECLARAT',
  htmlLipsa.includes('data-status="INSUFFICIENT_DATA"') && htmlLipsa.includes('NEDECLARAT'));
t('… iar titlul NU repetă insigna, ci adaugă ceva',
  bandaPerioade(sFaraInterval).titlu === 'Compatibilitate incertă');
t('… numește sursa fără interval', htmlLipsa.includes('interval nedeclarat'));
t('… și NU pretinde că blochează', !htmlLipsa.includes('data-zona="individuale"'));
t('… iar sursa care ARE interval îl arată', htmlLipsa.includes('1–31 Aug 2026'));

// MIXT: originea datelor stă pe banda de context; banda de perioade nu o repetă, dar
// nici nu slăbește regula când datele sunt mixte
t('MIXT · originea rămâne pe banda de context, nu se dublează',
  !htmlBlock.includes('Demo') && !htmlBlock.includes('MIXT'));
t('… iar pe date demo+reale regula e aceeași', areDateDemo(sCazReal).demo && bandaPerioade(sCazReal).status === 'BLOCK');
t('… identică cu cea de pe date curat reale', bandaPerioade(sReal).status === bandaPerioade(sCazReal).status);

console.log('\n— Banda: compactă pe telefon —');
const sumar = htmlBlock.match(/<summary[\s\S]*?<\/summary>/)?.[0] ?? '';
t('forma compactă e un <summary>, deci detaliile sunt pliate implicit', sumar.length > 0);
t('… fără atributul `open`, ca să nu împingă conținutul', !htmlBlock.includes('<details open'));
t('… rezumatul ține toate sursele într-o singură linie',
  sumar.includes('data-camp="rezumat"') && (sumar.match(/·/g) ?? []).length === 2);
t('… iar linia se rupe controlat, nu se taie', sumar.includes('flex-wrap'));
t('pe telefon rezumatul surselor e ascuns — insigna și titlul rămân',
  sumar.includes('hidden text-muted-foreground sm:inline') || sumar.includes('hidden') && sumar.includes('sm:inline'));
t('titlul e scurt, ca banda să nu treacă de 2–3 rânduri pe 390 px',
  bandaReal.titlu.length <= 24, `${bandaReal.titlu.length}: ${bandaReal.titlu}`);
t('… toate cele patru titluri sunt scurte',
  (['GOL', 'ACCEPT', 'INSUFFICIENT_DATA', 'BLOCK'] as const).every(st =>
    (bandaPerioade(st === 'GOL' ? cu([])
      : st === 'ACCEPT' ? sAccept
        : st === 'INSUFFICIENT_DATA' ? sFaraInterval : sCazReal).titlu.length <= 24)));

console.log('\n— Selectorul benzii: pur și dependent DOAR de versiunile de import —');
// cheia de memoizare din turn e `state.versiuniImport`; asta e valid doar dacă nimic
// altceva din stare nu schimbă rezultatul
t('două apeluri pe aceeași stare dau exact același rezultat',
  JSON.stringify(bandaPerioade(sCazReal)) === JSON.stringify(bandaPerioade(sCazReal)));
t('schimbarea vânzărilor NU schimbă banda',
  JSON.stringify(bandaPerioade({ ...sCazReal, vanzari: [] }))
  === JSON.stringify(bandaPerioade(sCazReal)));
t('schimbarea liniilor 2.9 NU schimbă banda',
  JSON.stringify(bandaPerioade({ ...sCazReal, materiale29: [] }))
  === JSON.stringify(bandaPerioade(sCazReal)));
t('schimbarea rețetelor și a produselor NU schimbă banda',
  JSON.stringify(bandaPerioade({ ...sCazReal, retete: [], produse: [] }))
  === JSON.stringify(bandaPerioade(sCazReal)));
t('DOAR versiunile de import o schimbă — deci cheia de memoizare e corectă',
  JSON.stringify(bandaPerioade({ ...sCazReal, versiuniImport: [] }))
  !== JSON.stringify(bandaPerioade(sCazReal)));
t('conținutul greu stă DOAR în partea desfășurată',
  !sumar.includes('Se pierde:') && htmlBlock.includes('Se pierde:'));

console.log('\n— Banda e randată în turn, pe toate secțiunile —');
const SEL_T: SelectieFC = {
  ancora: '2026-08-15', granularitate: 'LUNA', comparatie: 'PERIOADA_PRECEDENTA',
  scop: 'COMPANIE', locatie: null, canal: 'TOTAL',
};
const ctxT = (state: AppState): TowerCtx => ({
  state, ctx: buildCtx(state), sel: SEL_T, setSel: () => undefined,
  acces: accesTower(state, { rol: 'ADMIN' }, false), update: () => undefined,
});
const turn = (state: AppState, initial: Parameters<typeof ContinutTower>[0]['initial'] = 'OVERVIEW') =>
  renderToStaticMarkup(h(TowerProvider, { value: ctxT(state) }, h(ContinutTower, { initial })));
const turnBlock = turn(sCazReal);
t('banda apare în turn', turnBlock.includes('data-zona="banda-perioade"'));
t('… cu statusul corect', turnBlock.includes('data-status="BLOCK"'));
t('… sub banda de context, nu în locul ei',
  turnBlock.indexOf('data-zona="banda"') < turnBlock.indexOf('data-zona="banda-perioade"')
  && turnBlock.includes('data-zona="banda"'));
t('… deasupra conținutului', turnBlock.indexOf('data-zona="banda-perioade"') < turnBlock.indexOf('data-zona="continut"'));
for (const sect of ['OVERVIEW', 'ANALIZA_FC', 'VARIATII', 'NBO29', 'RECONCILIERE'] as const) {
  t(`… pe secțiunea ${sect}`, turn(sCazReal, sect).includes('data-zona="banda-perioade"'));
}
t('pe o stare fără surse, turnul nu arată banda deloc',
  !turn(cu([])).includes('data-zona="banda-perioade"'));
t('… dar restul turnului se randează normal', turn(cu([])).includes('data-zona="continut"'));

console.log('\n— Motivul substituirii numitorului ajunge la ecran —');
const mNum = metriciFC(s41Rau, buildCtx(s41Rau), cerere);
t('MetriciFC poartă motivul, nu doar sursa',
  mNum.sursaVanzari === 'PMIX' && !!mNum.motivNumitorIncompatibil);
t('… iar când nu e nicio incompatibilitate, câmpul lipsește',
  metriciFC(s41Bun, buildCtx(s41Bun), cerere).motivNumitorIncompatibil === undefined);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
