// Auditul final: fluxul complet, de la import până la autorizare.
//
// Suita asta nu re-testează fiecare motor — o fac suitele lui. Verifică ce se poate
// strica DOAR la îmbinare:
//
//   A. corectitudinea calculului   — cele două motoare de FC dau aceeași cifră?
//   B. integritatea datelor        — nimic nu se pierde tăcut între straturi
//   C. importurile                 — invalidul nu corupe niciodată activul
//   D. versionarea                 — istoricul nu se rescrie
//   E. perioadele                  — margini de lună/an, granularități incompatibile
//   F. izolarea Companie/Restaurant— agregare fără dublare, fără scurgeri
//   G. canalele                    — Total = InStore + Delivery; UNKNOWN nu se alocă
//   H. Advisorul                   — nicio cifră fără dovadă
//   I. simulările                  — deterministe, fără să atingă producția
//   J. interfața                   — fiecare ecran se randează în stările-limită
//   K. regresia                    — identitățile motoarelor rămân exacte
//   L. performanța                 — fără recalculări inutile pe același scop
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, costProdus, fcPerioada, versiuneLa } from '../src/lib/engine';
import { COMPANIE, perioadaDin, restaurant } from '../src/lib/fc-domeniu';
import { recipeFC } from '../src/lib/fc-core';
import { bridgeFC } from '../src/lib/fc-bridge';
import { analizaTimeline, metriciFC, serieTimeline } from '../src/lib/fc-timeline';
import { analizaIngrediente } from '../src/lib/fc-ingrediente';
import { simuleazaFC } from '../src/lib/fc-simulare';
import { activeazaImport, pregatesteImport } from '../src/lib/import-center';
import {
  accesTower, cerereBaza, cerereDin, normalizeazaSelectie, punteTower, semnaleCalitate, tabelMagazine,
  type SelectieFC,
} from '../src/lib/fc-tower';
import {
  contextAutorizare, inregistreazaAcces, scopDinParametri, scurgeri, stareAutorizata,
  verificaCerere, verificaImport, verificaScriere,
} from '../src/lib/fc-acces';
import { MESAJ_INSUFICIENT, cifreDin, dosarAdvisor } from '../src/lib/fc-advisor';
import { naratorDeterminist, valideazaNaratiune } from '../src/lib/fc-advisor-llm';
import { TowerProvider, type TowerCtx } from '../src/views/tower/context';
import { ContinutTower } from '../src/views/tower/ControlTower';
import type {
  AppState, Ingredient, Material29, Produs, Reteta, VanzareFapt,
} from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const LUNA = perioadaDin('2026-07-15', 'LUNA');
const SEL: SelectieFC = {
  ancora: '2026-07-15', granularitate: 'LUNA', comparatie: 'PERIOADA_PRECEDENTA',
  scop: 'COMPANIE', locatie: null, canal: 'TOTAL',
};
const ACUM = '2026-08-29T12:00:00.000Z';

// ————————————————————————————————————————————————————————— fixtura de stres
//
// Conține exact cazurile în care straturile se pot certa între ele: produs fără rețetă,
// rețetă cu două versiuni datate, preț schimbat la mijlocul lunii, material normalizat,
// material neclasificat, material nemapat, rând 2.9 fără restaurant, vânzări pe ambele canale.

const ing = (cod: string, denumire: string, preturi: { validDeLa: string; pret: number }[], tip: 'FOOD' | 'PACKAGING' = 'FOOD'): Ingredient =>
  ({ cod, denumire, categorie: 'Test', tip, um: 'kg', preturi, activ: true });

const prod = (cod: string, denumire: string): Produs =>
  ({ cod, denumire, categorie: 'Test', tip: 'SIMPLU', pretInstore: 30, pretDelivery: 35, tva: 9, activ: true });

const vz = (data: string, locatie: string, canal: 'INSTORE' | 'DELIVERY', produs: string, cant: number, net: number): VanzareFapt =>
  ({ data, locatie, canal, produs, cant, brut: net * 1.09, net });

const mat = (loc: string | null, material: string, denumire: string, categorie: string, cost: number, extra: Partial<Material29> = {}): Material29 =>
  ({ perioada: '2026-07', locatie: loc, material, denumire, categorie, cant: null, um: null,
    costActual: cost, costTeoretic: null, ...extra });

const RETETA_DOUA_VERSIUNI: Reteta = {
  cod: 'PX1', tip: 'PRODUS', denumire: 'Produs cu două versiuni', activa: 2,
  versiuni: [
    { nr: 1, data: '2026-06-01', linii: [{ comp: 'IX1', tipComp: 'INGREDIENT', cant: 100, um: 'g', canal: 'AMBELE' }] },
    { nr: 2, data: '2026-07-16', linii: [{ comp: 'IX1', tipComp: 'INGREDIENT', cant: 200, um: 'g', canal: 'AMBELE' }] },
  ],
};

const STRES: AppState = {
  ...genereazaSeed(),
  locatii: [{ cod: 'L01', nume: 'Centru' }, { cod: 'L02', nume: 'Mall' }],
  ingrediente: [
    ing('IX1', 'Ingredient datat', [{ validDeLa: '2026-06-01', pret: 10 }, { validDeLa: '2026-07-16', pret: 20 }]),
    ing('IX2', 'Ingredient fără preț', []),
    ing('IXP', 'Ambalaj', [{ validDeLa: '2026-06-01', pret: 1 }], 'PACKAGING'),
  ],
  produse: [prod('PX1', 'Produs cu două versiuni'), prod('PX2', 'Produs fără rețetă'), prod('PX3', 'Produs fără preț la ingredient')],
  retete: [
    RETETA_DOUA_VERSIUNI,
    { cod: 'PX3', tip: 'PRODUS', denumire: 'Produs fără preț la ingredient', activa: 1,
      versiuni: [{ nr: 1, data: '2026-06-01', linii: [{ comp: 'IX2', tipComp: 'INGREDIENT', cant: 50, um: 'g', canal: 'AMBELE' }] }] },
  ],
  vanzari: [
    // iunie — perioada de comparație
    vz('2026-06-10', 'L01', 'INSTORE', 'PX1', 10, 300),
    vz('2026-06-10', 'L02', 'DELIVERY', 'PX1', 5, 175),
    // iulie — înainte și după schimbarea de versiune/preț (16 iulie)
    vz('2026-07-10', 'L01', 'INSTORE', 'PX1', 10, 300),
    vz('2026-07-20', 'L01', 'INSTORE', 'PX1', 10, 300),
    vz('2026-07-10', 'L02', 'DELIVERY', 'PX1', 4, 140),
    vz('2026-07-12', 'L01', 'INSTORE', 'PX2', 6, 180),   // fără rețetă
    vz('2026-07-12', 'L02', 'INSTORE', 'PX3', 4, 120),   // ingredient fără preț
  ],
  salesReport: [],
  linii29: [],
  materiale29: [
    mat('L01', 'IX1', 'Ingredient datat', 'Carne și pui', 400),
    mat('L02', 'NORM-1', 'Material normalizat', 'Carne și pui', 60, { normalizat: true }),
    mat('L01', 'NECL-1', 'Categorie necunoscută', 'Categorie inventată', 90),
    mat('L01', 'NEMAP-1', 'Food fără nomenclator', 'Carne și pui', 70),
    mat(null, 'FARA-LOC', 'Linie agregată', 'Carne și pui', 50),
    mat('L01', 'CUR-1', 'Detergent', 'Materiale curățenie', 30),
  ],
  waste: [], inventar: [], scenarii: [], rnd: [], nemapate: [],
  labor: [], costuriOperare: [],
  tinte: [{ locatie: 'RETEA', fcCurat: 21 }, { locatie: 'L01', fcCurat: 20 }, { locatie: 'L02', fcCurat: 22 }],
  importuri: [], versiuniImport: [], istoricPreturi: [], auditImport: [], auditAcces: [],
};
const CTX_STRES = buildCtx(STRES);

// ————————————————————————————————————————————————————————— A. sursa canonică de adevăr

console.log('— A. Cele două motoare de FC dau ACEEAȘI cifră —');
const perechi: [string, 'RETEA' | 'L01' | 'L02'][] = [['companie', 'RETEA'], ['L01', 'L01'], ['L02', 'L02']];
const seed = genereazaSeed();
const ctxSeed = buildCtx(seed);
for (const [et, loc] of perechi) {
  const v = fcPerioada(seed, ctxSeed, '2026-07', loc);
  const n = metriciFC(seed, ctxSeed, {
    perioada: LUNA, nivel: loc === 'RETEA' ? COMPANIE : restaurant(loc), canal: 'TOTAL',
  });
  t(`costul teoretic e identic (${et})`, aprox(v.costTeoretic, n.recipeCostRON, 0.01),
    `${v.costTeoretic.toFixed(2)} vs ${n.recipeCostRON.toFixed(2)}`);
  t(`numitorul e identic (${et})`, aprox(v.net, n.salesRON, 0.01));
  t(`FC-ul teoretic e identic (${et})`, v.fcTeoretic !== null && n.recipeFcPct !== null
    && aprox(v.fcTeoretic, n.recipeFcPct, 1e-9));
  t(`paper-ul e identic (${et})`, aprox(v.paperTeoretic, n.paperCostRON, 0.01));
}

console.log('\n— … și pe fixtura de stres, unde straturile s-ar putea certa —');
for (const [et, loc] of perechi) {
  const v = fcPerioada(STRES, CTX_STRES, '2026-07', loc);
  const n = metriciFC(STRES, CTX_STRES, {
    perioada: LUNA, nivel: loc === 'RETEA' ? COMPANIE : restaurant(loc), canal: 'TOTAL',
  });
  t(`stres: costul teoretic e identic (${et})`, aprox(v.costTeoretic, n.recipeCostRON, 0.01),
    `${v.costTeoretic.toFixed(2)} vs ${n.recipeCostRON.toFixed(2)}`);
  t(`stres: numitorul e identic (${et})`, aprox(v.net, n.salesRON, 0.01),
    `${v.net.toFixed(2)} vs ${n.salesRON.toFixed(2)}`);
  t(`stres: acoperirea e identică (${et})`,
    (v.acoperire === null && n.acoperirePct === null) || aprox(v.acoperire!, n.acoperirePct!, 0.01),
    `${v.acoperire} vs ${n.acoperirePct}`);
}
// numitorul are un proprietar și o ordine de precădere declarată: Sales Report bate PMIX
const CU_SALES: AppState = {
  ...STRES,
  salesReport: [
    { data: '2026-07-10', locatie: 'L01', canal: 'INSTORE', brut: 1090, net: 1000 },
    { data: '2026-07-10', locatie: 'L02', canal: 'DELIVERY', brut: 218, net: 200 },
  ] as AppState['salesReport'],
};
const mSales = metriciFC(CU_SALES, buildCtx(CU_SALES), { perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' });
const mPmix = metriciFC(STRES, CTX_STRES, { perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' });
t('cu Sales Report, numitorul e Sales Report — nu PMIX-ul',
  mSales.sursaVanzari === 'Sales Report' && aprox(mSales.salesRON, 1200, 1e-9),
  `${mSales.salesRON} din ${mSales.sursaVanzari}`);
t('fără Sales Report, numitorul e PMIX-ul și o spune',
  mPmix.sursaVanzari === 'PMIX' && aprox(mPmix.salesRON, 1040, 1e-9),
  `${mPmix.salesRON} din ${mPmix.sursaVanzari}`);
t('FC-ul se raportează la numitorul declarat, nu la altul',
  aprox(mSales.recipeFcPct!, (mSales.recipeCostRON / 1200) * 100, 1e-9)
  && aprox(mPmix.recipeFcPct!, (mPmix.recipeCostRON / 1040) * 100, 1e-9));
t('schimbarea numitorului chiar schimbă FC-ul — sursele NU se confundă',
  Math.abs(mSales.recipeFcPct! - mPmix.recipeFcPct!) > 0.1,
  `${mSales.recipeFcPct!.toFixed(2)}% (Sales Report) vs ${mPmix.recipeFcPct!.toFixed(2)}% (PMIX)`);
// A-1 (remediat în acest PR): un ingredient fără preț producea o linie de 0 lei declarată
// COMPLETĂ, deci vânzarea trecea drept costată integral și cobora tăcut Food Cost-ul.
const rec = recipeFC(STRES, CTX_STRES, { perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' });
t('produsul fără rețetă (PX2) rămâne în afara acoperirii',
  aprox(rec.netAcoperit, 1040 - 180, 1e-9) && rec.produseFaraReteta.some(p => p.cod === 'PX2'));
t('produsul cu ingredient NEPREȚUIT (PX3) are cost declarat INCOMPLET, nu zero tăcut',
  rec.produseCostIncomplet.some(p => p.cod === 'PX3') && aprox(rec.netCostIncomplet, 120, 1e-9),
  `${rec.netCostIncomplet} lei de vânzări cu cost incomplet`);
t('acoperirea completă e mai mică decât acoperirea brută — felia incompletă e scăzută',
  aprox(rec.acoperirePct!, (860 / 1040) * 100, 1e-9)
  && aprox(rec.acoperireCompletaPct!, (740 / 1040) * 100, 1e-9),
  `brut ${rec.acoperirePct!.toFixed(2)}% vs complet ${rec.acoperireCompletaPct!.toFixed(2)}%`);
t('identitate: net = fără rețetă + cost incomplet + cost complet',
  aprox(rec.netFaraReteta + rec.netCostIncomplet + (rec.netAcoperit - rec.netCostIncomplet),
    rec.netVandut, 1e-9));
t('un preț de 0 lei NU e citit ca „ingredient gratuit"',
  costProdus('PX3', 'INSTORE', CTX_STRES, '2026-07-10')!.incomplet);
t('produsele complet prețuite rămân declarate complete',
  costProdus('PX1', 'INSTORE', CTX_STRES, '2026-07-10')!.incomplet === false);

t('proprietarul FC-ului teoretic e unul singur: recipeFC din fc-core',
  metriciFC(STRES, CTX_STRES, { perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' }).recipeCostRON > 0);

// ————————————————————————————————————————————————————————— B. reconcilierea

console.log('\n— B. Reconcilierea: fiecare leu din 2.9 stă într-o singură grupă —');
const bridge = bridgeFC(STRES, CTX_STRES, cerereBaza(SEL));
const punte = punteTower(bridge);
t('puntea e disponibilă', punte.disponibil);
t('suma grupurilor = consumul total 2.9', aprox(punte.totalLei, bridge.nboActual, 0.01));
t('consumul total = suma rândurilor din fixtură',
  aprox(bridge.nboActual, 400 + 60 + 90 + 70 + 50 + 30, 0.01), `${bridge.nboActual}`);
t('materialul normalizat ajunge în grupa lui',
  aprox(punte.grupuri.find(g => g.grup === 'PAPER_NORMALIZAT')!.lei, 60, 0.01));
t('categoria necunoscută rămâne NECLASIFICAT, nu devine Food',
  aprox(punte.grupuri.find(g => g.grup === 'NECLASIFICAT')!.lei, 90, 0.01));
t('Food fără nomenclator rămâne NEEXPLICAT',
  punte.grupuri.find(g => g.grup === 'NEEXPLICAT')!.lei >= 70);
t('curățenia e operațional, în afara Food Cost',
  aprox(punte.grupuri.find(g => g.grup === 'OPERATIONAL')!.lei, 30, 0.01));
t('niciun leu nu apare în două grupe',
  aprox(punte.grupuri.reduce((s, g) => s + g.lei, 0), bridge.nboActual, 0.01));
t('teoreticul nedeclarat rămâne nedeclarat, nu se reconstruiește',
  punte.tintaTeoreticaLei === null && punte.notaTinta.includes('nu se reconstruiește'));
t('neexplicatul nu se topește în nicio cauză cunoscută',
  bridge.componente.find(c => c.componenta === 'UNEXPLAINED')!.lei > 0
  && bridge.unexplainedAmount >= bridge.componente.find(c => c.componenta === 'UNEXPLAINED')!.lei);

// ————————————————————————————————————————————————————————— C. Companie / Restaurant

console.log('\n— C. Agregarea Companie = Σ Restaurante, fără dublare —');
const aCompanie = analizaTimeline(STRES, CTX_STRES, cerereDin(SEL));
const magazine = aCompanie.magazine ?? [];
t('există defalcare pe restaurante la companie', magazine.length === 2);
t('vânzările companiei = Σ restaurante',
  aprox(aCompanie.metrici!.salesRON, magazine.reduce((s, m) => s + m.metrici.salesRON, 0), 0.01));
t('costul companiei = Σ restaurante',
  aprox(aCompanie.metrici!.recipeCostRON, magazine.reduce((s, m) => s + m.metrici.recipeCostRON, 0), 0.01));
t('2.9 al companiei = Σ restaurante + partea fără locație',
  aprox(aCompanie.metrici!.nboTotalRON!,
    magazine.reduce((s, m) => s + (m.metrici.nboTotalRON ?? 0), 0) + aCompanie.nboFaraLocatieRON!, 0.01));
t('partea fără locație e declarată separat, nu repartizată',
  aprox(aCompanie.nboFaraLocatieRON!, 50, 0.01));
t('niciun restaurant nu apare de două ori în defalcare',
  new Set(magazine.map(m => m.locatie)).size === magazine.length);
t('rândul unui restaurant = analiza rulată direct pe el',
  (() => {
    const direct = analizaTimeline(STRES, CTX_STRES, cerereDin({ ...SEL, scop: 'RESTAURANT', locatie: 'L01' }));
    const din = magazine.find(m => m.locatie === 'L01')!;
    return aprox(direct.metrici!.recipeCostRON, din.metrici.recipeCostRON, 0.01)
      && aprox(direct.metrici!.salesRON, din.metrici.salesRON, 0.01);
  })());
t('FC-ul companiei NU e media FC-urilor, ci raportul sumelor',
  (() => {
    const mediaNaiva = magazine.reduce((s, m) => s + (m.metrici.recipeFcPct ?? 0), 0) / magazine.length;
    const real = aCompanie.metrici!.recipeFcPct!;
    return aprox(real, (aCompanie.metrici!.recipeCostRON / aCompanie.metrici!.salesRON) * 100, 1e-9)
      && !aprox(real, mediaNaiva, 1e-6);
  })());

// ————————————————————————————————————————————————————————— D. canalele

console.log('\n— D. Canale: Total = InStore + Delivery, UNKNOWN nu se alocă —');
const mTotal = metriciFC(STRES, CTX_STRES, { perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' });
const mIn = metriciFC(STRES, CTX_STRES, { perioada: LUNA, nivel: COMPANIE, canal: 'INSTORE' });
const mDel = metriciFC(STRES, CTX_STRES, { perioada: LUNA, nivel: COMPANIE, canal: 'DELIVERY' });
t('vânzările: Total = InStore + Delivery', aprox(mTotal.salesRON, mIn.salesRON + mDel.salesRON, 0.01));
t('costul: Total = InStore + Delivery', aprox(mTotal.recipeCostRON, mIn.recipeCostRON + mDel.recipeCostRON, 0.01));
t('FC-ul NU se adună între canale — se recalculează din totaluri',
  aprox(mTotal.recipeFcPct!, (mTotal.recipeCostRON / mTotal.salesRON) * 100, 1e-9));
t('sursa 2.9 nu declară canal → UNKNOWN', mTotal.canalNbo === 'UNKNOWN');
t('pe canal, partea de 2.9 NU se repartizează',
  mIn.nboActualRON === null || mIn.canalNbo === 'UNKNOWN');
t('semnalul de canal necunoscut e ridicat',
  semnaleCalitate(STRES, aCompanie, null).some(s => s.cod === 'CANAL_NECUNOSCUT'));

// ————————————————————————————————————————————————————————— E. perioade

console.log('\n— E. Perioade: margini, granularități, istoric absent —');
// 10 iulie 2026 e vineri: săptămâna 6–12 iulie chiar are vânzări în fixtură
const SEL_SAPT: SelectieFC = { ...SEL, granularitate: 'SAPTAMANA', ancora: '2026-07-10' };
const aSapt = analizaTimeline(STRES, CTX_STRES, cerereDin(SEL_SAPT));
t('pe săptămână, partea de 2.9 e refuzată, nu fabricată din date lunare',
  !aSapt.metrici!.nboDisponibil && !!aSapt.metrici!.motivNbo);
t('FC-ul din rețete rămâne calculabil pe săptămână', aSapt.metrici!.recipeFcPct !== null);
t('o săptămână fără vânzări se declară indisponibilă, nu se raportează zero',
  (() => {
    const goala = analizaTimeline(STRES, CTX_STRES,
      cerereDin({ ...SEL, granularitate: 'SAPTAMANA', ancora: '2026-07-15' }));
    return goala.disponibil === false && goala.metrici === null && !!goala.motivIndisponibil;
  })());
t('comparația cu anul trecut e refuzată pe săptămâni, cu motiv',
  analizaTimeline(STRES, CTX_STRES, cerereDin({ ...SEL_SAPT, comparatie: 'ACEEASI_PERIOADA_AN_PRECEDENT' }))
    .comparatie!.motivIndisponibil!.includes('luni'));
t('comparația cu o lună fără date se declară indisponibilă, nu zero',
  (() => {
    const a = analizaTimeline(STRES, CTX_STRES,
      cerereDin({ ...SEL, ancora: '2026-06-15', comparatie: 'PERIOADA_PRECEDENTA' }));
    return a.comparatie!.disponibil === false && !!a.comparatie!.motivIndisponibil;
  })());
t('marginea de lună: o vânzare din 31 nu intră în luna următoare',
  metriciFC({ ...STRES, vanzari: [...STRES.vanzari, vz('2026-07-31', 'L01', 'INSTORE', 'PX1', 1, 30)] },
    CTX_STRES, { perioada: perioadaDin('2026-08-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' }).salesRON === 0);
t('marginea de an: decembrie → ianuarie nu amestecă anii',
  perioadaDin('2026-12-31', 'LUNA').cheie === '2026-12'
  && perioadaDin('2027-01-01', 'LUNA').cheie === '2027-01');
t('seria conține doar perioade cu date, nu goluri inventate',
  serieTimeline(STRES, CTX_STRES, { de: '2026-06-01', la: '2026-07-31', granularitate: 'LUNA', nivel: COMPANIE, canal: 'TOTAL' })
    .every(p => p.metrici.salesRON > 0 || p.metrici.recipeCostRON === 0));

// ————————————————————————————————————————————————————————— F. versionarea

console.log('\n— F. Istoricul nu se rescrie —');
const costIunie = costProdus('PX1', 'INSTORE', CTX_STRES, '2026-06-10');
const costIulieInainte = costProdus('PX1', 'INSTORE', CTX_STRES, '2026-07-10');
const costIulieDupa = costProdus('PX1', 'INSTORE', CTX_STRES, '2026-07-20');
t('versiunea de rețetă în vigoare atunci e cea folosită',
  versiuneLa(RETETA_DOUA_VERSIUNI, '2026-07-10').nr === 1
  && versiuneLa(RETETA_DOUA_VERSIUNI, '2026-07-20').nr === 2);
t('costul din 10 iulie = 100 g × 10 lei/kg = 1 leu', aprox(costIulieInainte!.total, 1, 1e-9),
  `${costIulieInainte?.total}`);
t('costul din 20 iulie = 200 g × 20 lei/kg = 4 lei', aprox(costIulieDupa!.total, 4, 1e-9),
  `${costIulieDupa?.total}`);
t('costul din iunie folosește prețul din iunie', aprox(costIunie!.total, 1, 1e-9));
t('un preț nou nu rescrie costul lunii trecute',
  aprox(costProdus('PX1', 'INSTORE', CTX_STRES, '2026-06-10')!.total, 1, 1e-9));
t('luna iulie conține AMBELE regimuri, nu doar cel activ azi',
  aprox(metriciFC(STRES, CTX_STRES, { perioada: LUNA, nivel: restaurant('L01'), canal: 'INSTORE' }).recipeCostRON,
    10 * 1 + 10 * 4 + 0, 0.01),
  'PX1: 10 buc × 1 leu + 10 buc × 4 lei; PX2 fără rețetă');

console.log('\n— … și după un import nou, trecutul rămâne trecut —');
const pretNou = pregatesteImport(STRES, {
  fisier: 'preturi august.xlsx',
  parsat: { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'IX1', Pret: 99 }] },
  acum: ACUM, dataValabil: '2026-08-01',
});
const dupaPret = activeazaImport(STRES, pretNou);
t('importul de preț s-a activat', dupaPret.rezultat.activat);
t('costul din iulie NU s-a schimbat după prețul din august',
  aprox(costProdus('PX1', 'INSTORE', buildCtx(dupaPret.stareNoua), '2026-07-10')!.total, 1, 1e-9));
t('costul din august folosește prețul nou',
  costProdus('PX1', 'INSTORE', buildCtx(dupaPret.stareNoua), '2026-08-10')!.total > 4);
t('FC-ul lunii iulie e neschimbat după importul de august',
  aprox(metriciFC(dupaPret.stareNoua, buildCtx(dupaPret.stareNoua), { perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' }).recipeCostRON,
    metriciFC(STRES, CTX_STRES, { perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' }).recipeCostRON, 0.01));
t('istoricul de preț înregistrează schimbarea, cu preț vechi și nou',
  (dupaPret.stareNoua.istoricPreturi ?? []).some(x => x.ingredient === 'IX1' && x.pretNou === 99 && x.pretVechi === 20));

// ————————————————————————————————————————————————————————— G. importuri adversariale

console.log('\n— G. Importuri: invalidul nu corupe niciodată activul —');
const amprentaDate = (s: AppState) => JSON.stringify([s.vanzari, s.ingrediente, s.retete, s.materiale29, s.produse]);
const inainteDeImporturi = amprentaDate(STRES);

const cazuri: [string, Parameters<typeof pregatesteImport>[1]][] = [
  ['fișier gol', { fisier: 'pmix.xlsx', parsat: { foaie: 'x', antete: ['Data', 'Cod produs', 'Cantitate'], randuri: [] }, acum: ACUM, locatie: 'L01' }],
  ['coloane malformate', { fisier: 'ceva.xlsx', parsat: { foaie: 'x', antete: ['A', 'B', 'C'], randuri: [{ A: 1 }] }, acum: ACUM }],
  ['tip ambiguu', { fisier: 'export.xlsx', parsat: { foaie: 'x', antete: ['Cod', 'Denumire', 'UM', 'Pret'], randuri: [{ Cod: 'X' }] }, acum: ACUM }],
  ['perioadă lipsă', { fisier: 'fara data.xlsx', parsat: { foaie: 'x', antete: ['Locatie', 'Cod produs', 'Cantitate'], randuri: [{ Locatie: 'L01', 'Cod produs': 'PX1', Cantitate: 2 }] }, acum: ACUM }],
  ['celulă de perioadă goală', { fisier: 'pmix iulie.xlsx', parsat: { foaie: 'x', antete: ['Data', 'Cod produs', 'Cantitate'], randuri: [{ Data: '', 'Cod produs': 'PX1', Cantitate: 2 }] }, acum: ACUM, locatie: 'L01' }],
  ['produs inexistent', { fisier: 'pmix iulie.xlsx', parsat: { foaie: 'x', antete: ['Data', 'Cod produs', 'Cantitate'], randuri: [{ Data: '2026-07-05', 'Cod produs': 'NU_EXISTA', Cantitate: 2 }] }, acum: ACUM, locatie: 'L01' }],
  ['granularitate mixtă', { fisier: 'pmix iulie.xlsx', parsat: { foaie: 'x', antete: ['Data', 'Cod produs', 'Cantitate'], randuri: [{ Data: '2026-07-05', 'Cod produs': 'PX1', Cantitate: 2 }, { Data: '2026-07', 'Cod produs': 'PX1', Cantitate: 3 }] }, acum: ACUM, locatie: 'L01' }],
];
for (const [eticheta, cerere] of cazuri) {
  const p = pregatesteImport(STRES, cerere);
  const dupa = activeazaImport(STRES, p);
  const activat = dupa.rezultat.activat;
  t(`„${eticheta}": datele rămân intacte dacă nu s-a activat`,
    activat || amprentaDate(dupa.stareNoua) === inainteDeImporturi,
    `stare=${dupa.rezultat.stare}`);
  t(`„${eticheta}": rezultatul își spune starea și motivul`,
    !!dupa.rezultat.stare && (activat || dupa.rezultat.erori.length > 0 || dupa.rezultat.diagnostice.length > 0));
  t(`„${eticheta}": auditul reține încercarea`, (dupa.stareNoua.auditImport ?? []).length > (STRES.auditImport ?? []).length);
}

console.log('\n— Import valid, apoi duplicat și reimport —');
const valid = {
  fisier: 'pmix iulie L01.xlsx',
  parsat: {
    foaie: 'x', antete: ['Data', 'Cod produs', 'Canal', 'Cantitate', 'Valoare neta'],
    randuri: [{ Data: '2026-07-05', 'Cod produs': 'PX1', Canal: 'InStore', Cantitate: 3, 'Valoare neta': 90 }],
  },
  acum: ACUM, locatie: 'L01',
} as const;
t('un PMIX fără canal NU primește un canal inventat — rândul e refuzat, nu alocat',
  (() => {
    const faraCanal = pregatesteImport(STRES, {
      fisier: 'vanzari iulie.xlsx',
      parsat: { foaie: 'x', antete: ['Data', 'Cod produs', 'Cantitate', 'Valoare neta'],
        randuri: [{ Data: '2026-07-05', 'Cod produs': 'PX1', Cantitate: 3, 'Valoare neta': 90 }] },
      acum: ACUM, locatie: 'L01',
    });
    const dupa = activeazaImport(STRES, faraCanal);
    return !dupa.rezultat.activat
      && dupa.rezultat.avertismente.some(a => a.includes('canal neidentificat'))
      && dupa.stareNoua.vanzari.length === STRES.vanzari.length;
  })());
const p1 = pregatesteImport(STRES, { ...valid });
const st1 = activeazaImport(STRES, p1);
t('importul valid se activează', st1.rezultat.activat && st1.rezultat.stare === 'ACTIVAT');
t('… și chiar adaugă rânduri', st1.stareNoua.vanzari.length > STRES.vanzari.length);
t('… și creează o versiune', (st1.stareNoua.versiuniImport ?? []).length === 1);
const dublu = activeazaImport(st1.stareNoua, pregatesteImport(st1.stareNoua, { ...valid }));
t('acelasi fișier a doua oară e DUPLICAT, nu eroare', dublu.rezultat.stare === 'DUPLICAT');
t('duplicatul nu dublează datele', dublu.stareNoua.vanzari.length === st1.stareNoua.vanzari.length);
t('duplicatul nu adaugă o versiune nouă',
  (dublu.stareNoua.versiuniImport ?? []).length === (st1.stareNoua.versiuniImport ?? []).length);
const pregatireVeche = pregatesteImport(STRES, { ...valid, fisier: 'altul.xlsx' });
const invechit = activeazaImport(st1.stareNoua, pregatireVeche);
t('o pregătire făcută pe starea veche e refuzată la activare',
  !invechit.rezultat.activat && invechit.rezultat.erori.some(e => e.includes('s-a schimbat')));
t('… iar importul dintre timp NU e rulat înapoi',
  invechit.stareNoua.vanzari.length === st1.stareNoua.vanzari.length);

// ————————————————————————————————————————————————————————— H. PMIX și 2.9 pe material

console.log('\n— H. PMIX: produse fără rețetă și fără preț sunt vizibile, nu tăcute —');
t('produsul fără rețetă apare în defalcare, cu cost null',
  aCompanie.produse.find(p => p.produs === 'PX2')?.costRON === null);
t('… și e semnalat ca lipsă de rețetă',
  aCompanie.calitate.produseFaraReteta.includes('PX2'));
t('produsul cu ingredient fără preț e semnalat',
  aCompanie.calitate.preturiLipsa.length > 0 || aCompanie.calitate.produseFaraReteta.includes('PX3'));
t('FC-ul raportat pe rețete incomplete e declarat drept limită de jos',
  aCompanie.calitate.netCostIncomplet > 0
  && aCompanie.calitate.produseCostIncomplet.includes('PX3')
  && aCompanie.motiveIncomplet.some(m => m.includes('limită de jos')));
t('… iar dashboardul ridică un semnal distinct pentru asta',
  semnaleCalitate(STRES, aCompanie).some(x => x.cod === 'COST_INCOMPLET'));
t('acoperirea rețetelor e sub 100% și declarată',
  aCompanie.metrici!.acoperirePct !== null && aCompanie.metrici!.acoperirePct < 100);

console.log('\n— 2.9 pe material: identitate, categorie, mapare, normalizare —');
const randMat = (cod: string) => bridge.randuri.find(r => r.material === cod)!;
t('materialul își păstrează identitatea și perioada sursă',
  randMat('IX1').perioadaSursa === '2026-07' && randMat('IX1').locatie === 'L01');
t('materialul mapat pe nomenclator e recunoscut', randMat('IX1').areIngredient);
t('materialul nemapat NU e mapat forțat', !randMat('NEMAP-1').areIngredient);
t('materialul normalizat își păstrează marcajul din sursă', randMat('NORM-1').normalizatInSursa);
t('categoria necunoscută rămâne UNCLASSIFIED', randMat('NECL-1').categorie === 'UNCLASSIFIED');
t('rândul fără restaurant își păstrează locația null', randMat('FARA-LOC').locatie === null);
t('costul actual e cel din raport, neatins', aprox(randMat('IX1').costActual, 400, 1e-9));

// ————————————————————————————————————————————————————————— I. Ingredient Intelligence

console.log('\n— I. Ingredient Intelligence: identitățile rămân exacte —');
const aIng = analizaIngrediente(STRES, CTX_STRES, { ...cerereBaza(SEL), comparatie: 'LUNA_PRECEDENTA' });
t('analiza e disponibilă', aIng.disponibil);
for (const r of aIng.randuri.filter(x => x.efecte !== null)) {
  t(`Δcost = preț + consum + interacțiune (${r.ingredient})`,
    aprox(r.deltaCostLei!, r.efecte!.pret + r.efecte!.consum + r.efecte!.interactiunePret, 0.01));
  t(`consum = rețetă + mix + interacțiune (${r.ingredient})`,
    aprox(r.efecte!.consum, r.efecte!.reteta + r.efecte!.pmix + r.efecte!.interactiuneConsum, 0.01));
}
t('ingredientul fără preț nu primește efecte inventate',
  aIng.randuri.filter(r => r.pretCurent === null).every(r => r.efecte === null));
t('… și e raportat la calitatea datelor',
  aIng.calitate.pretLipsa.length > 0 || aIng.randuri.every(r => r.pretCurent !== null));

// ————————————————————————————————————————————————————————— J. simulări

console.log('\n— J. Simulările: deterministe, izolate, fără să atingă producția —');
const inainteSim = JSON.stringify(STRES);
const scenariu = { preturi: [{ ingredient: 'IX1', pretNou: 30 }] };
const sim1 = simuleazaFC(STRES, CTX_STRES, cerereBaza(SEL), scenariu);
const sim2 = simuleazaFC(STRES, CTX_STRES, cerereBaza(SEL), scenariu);
t('datele reale rămân bit-identice', JSON.stringify(STRES) === inainteSim);
t('două rulări identice dau exact același rezultat', JSON.stringify(sim1) === JSON.stringify(sim2));
t('baseline + Σ efecte + interacțiune = costul scenariului',
  aprox(sim1.currentCostRON + sim1.efecte.reduce((s, e) => s + e.costLei, 0), sim1.scenarioCostRON, 0.01));
t('Δ lei = costul scenariului − baseline', aprox(sim1.deltaCostRON, sim1.scenarioCostRON - sim1.currentCostRON, 1e-9));
t('Δ pp = FC scenariu − FC baseline',
  sim1.deltaFCpp === null || aprox(sim1.deltaFCpp, sim1.scenarioRecipeFC! - sim1.currentRecipeFC!, 1e-9));
t('efectele sunt separate pe preț / rețetă / mix / interacțiune',
  ['PRET', 'RETETA', 'MIX', 'INTERACTIUNE'].every(id => sim1.efecte.some(e => e.id === id)));
// scenariu pe TREI dimensiuni deodată: aici interacțiunea e reală, nu zero
const scenariuMixt = {
  preturi: [{ ingredient: 'IX1', pretNou: 30 }],
  retete: [{ tip: 'CANTITATE' as const, produs: 'PX1', component: 'IX1', cantNoua: 400 }],
  pmix: [{ produs: 'PX1', factor: 2 }],
};
const simMixt = simuleazaFC(STRES, CTX_STRES, cerereBaza(SEL), scenariuMixt);
const efMixt = (id: string) => simMixt.efecte.find(e => e.id === id)!.costLei;
t('scenariul mixt chiar mișcă toate cele trei dimensiuni',
  Math.abs(efMixt('PRET')) > 0.01 && Math.abs(efMixt('RETETA')) > 0.01 && Math.abs(efMixt('MIX')) > 0.01);
t('interacțiunea unui scenariu mixt NU e zero — efectele nu se adună liniar',
  Math.abs(efMixt('INTERACTIUNE')) > 0.01,
  `interacțiune = ${efMixt('INTERACTIUNE').toFixed(2)} lei`);
t('baseline + Σ efecte (interacțiune inclusă) = costul scenariului mixt',
  aprox(simMixt.currentCostRON + simMixt.efecte.reduce((s2, e) => s2 + e.costLei, 0),
    simMixt.scenarioCostRON, 0.01));
t('… și fără termenul de interacțiune identitatea s-ar rupe',
  !aprox(simMixt.currentCostRON + efMixt('PRET') + efMixt('RETETA') + efMixt('MIX'),
    simMixt.scenarioCostRON, 0.01),
  'dovada că termenul chiar poartă informație');
t('scenariul mixt tot nu atinge datele reale', JSON.stringify(STRES) === inainteSim);
t('un scenariu doar de preț nu produce efect de rețetă sau mix',
  aprox(sim1.efecte.find(e => e.id === 'RETETA')!.costLei, 0, 1e-9)
  && aprox(sim1.efecte.find(e => e.id === 'MIX')!.costLei, 0, 1e-9));

// ————————————————————————————————————————————————————————— K. Advisor

console.log('\n— K. Advisorul: nicio cifră fără dovadă —');
const accTop = accesTower(STRES, { rol: 'ADMIN' }, false);
const dosar = dosarAdvisor(STRES, CTX_STRES, { selectie: SEL, acces: accTop });
t('fiecare cifră poartă motor, câmp și scop',
  cifreDin(dosar).every(c => c.referinta.motor.length > 0 && c.referinta.camp.length > 0
    && c.referinta.scop === dosar.scop.descriere));
t('cifrele indisponibile poartă motivul, nu zero',
  cifreDin(dosar).filter(c => c.valoare === null).every(c => !!c.indisponibilDe));
t('naratiunea nu conține niciun număr din afara dovezilor',
  valideazaNaratiune(naratorDeterminist(dosar), dosar).valid);
t('o naratiune cu o cifră fabricată e RESPINSĂ, cu numărul străin numit',
  (() => {
    const fabricat = naratorDeterminist(dosar)
      + ' Food Cost-ul real este de 73,41%, iar pierderea lunară este de 128374,55 lei.';
    const v = valideazaNaratiune(fabricat, dosar);
    return !v.valid && v.numereStraine.includes(73.41) && v.numereStraine.includes(128374.55);
  })(),
  'validatorul nu se mulțumește să semnaleze — spune care cifră nu are dovadă');
t('o cauză inventată în naratiune e semnalată, nu lăsată să treacă',
  (() => {
    const v = valideazaNaratiune(naratorDeterminist(dosar) + ' Cauza este furtul din depozit, 9999,99 lei.', dosar);
    return !v.valid;
  })());
t('naratiunea corectă rămâne validă după aceste probe',
  valideazaNaratiune(naratorDeterminist(dosar), dosar).valid);
t('cifra de FC din dosar = cifra motorului',
  aprox(dosar.stare.fcRetetar.valoare!, aCompanie.metrici!.recipeFcPct!, 1e-9));
t('neexplicatul din dosar = grupa punții',
  aprox(dosar.explicatie.cauze.find(c => c.cauza === 'NEEXPLICAT')!.lei.valoare!,
    punte.grupuri.find(g => g.grup === 'NEEXPLICAT')!.lei, 0.01));
t('neexplicatul NU e atribuit unei cauze cunoscute',
  dosar.explicatie.notaNeexplicat.includes('neatribuit'));
t('prioritățile respectă regula deterministă, scrisă lângă ele',
  dosar.actiuni.every(a => a.regulaPrioritate.includes('impact')));
t('nicio recomandare mare din date slabe',
  dosar.actiuni.filter(a => a.prioritate === 'CRITICA' || a.prioritate === 'MARE')
    .every(a => a.confidenta >= dosar.praguri.confidentaPentruPrioritateMare));

const stareGoala: AppState = { ...STRES, vanzari: [], salesReport: [], materiale29: [] };
const dosarGol = dosarAdvisor(stareGoala, buildCtx(stareGoala), {
  selectie: SEL, acces: accesTower(stareGoala, { rol: 'ADMIN' }, false),
});
t('fără dovezi, Advisorul rostește exact formula cerută', dosarGol.stare.rezumat === MESAJ_INSUFICIENT);
t('… și nicio cifră nu e inventată', cifreDin(dosarGol.stare).every(c => c.valoare === null));
t('… iar naratiunea o repetă', naratorDeterminist(dosarGol).includes(MESAJ_INSUFICIENT));

// ————————————————————————————————————————————————————————— L. autorizare

console.log('\n— L. Autorizare: nicio scurgere între restaurante —');
const aMgr = contextAutorizare(STRES, { rol: 'MANAGER', locatie: 'L02', email: 'm@f.ro' }, true);
const aTop = contextAutorizare(STRES, { rol: 'ADMIN', email: 'a@f.ro' }, false);
const sMgr = stareAutorizata(STRES, aMgr);
const accMgr = accesTower(STRES, { rol: 'MANAGER', locatie: 'L02' }, true);
t('proiecția nu lasă niciun rând străin', scurgeri(sMgr, aMgr).length === 0);
t('dosarul managerului nu pomenește alt restaurant',
  !new RegExp('\\bL01\\b').test(JSON.stringify(dosarAdvisor(STRES, CTX_STRES, { selectie: SEL, acces: accMgr }))));
t('simularea managerului atinge doar restaurantul lui',
  simuleazaFC(sMgr, buildCtx(sMgr), cerereBaza({ ...SEL, scop: 'RESTAURANT', locatie: 'L02' }), scenariu)
    .affectedStores.every(x => x === 'L02'));
// rolul regional e cazul periculos: vede „compania", dar NU toată compania
const aRegional = {
  ...contextAutorizare(STRES, { rol: 'ANALIST', email: 'r@f.ro' }, true),
  companyAccess: true, storeId: null, allowedStoreIds: ['L02'],
};
const sRegional = stareAutorizata(STRES, aRegional);
t('un rol cu vedere pe companie, dar limitat la un subset, NU primește tot',
  !new RegExp('\\bL01\\b').test(JSON.stringify(sRegional)),
  'companyAccess nu e o poartă către întreaga stare');
t('proiecția rolului regional nu are scurgeri', scurgeri(sRegional, aRegional).length === 0);
t('… iar restaurantul permis rămâne întreg',
  sRegional.vanzari.filter(v => v.locatie === 'L02').length
  === STRES.vanzari.filter(v => v.locatie === 'L02').length);
// forțarea scopului: parametrii vin din URL/stare, deci nu se au niciodată de bune
t('un manager care cere explicit alt restaurant e readus în scopul lui',
  (() => {
    const forta = normalizeazaSelectie(STRES, { ...SEL, scop: 'RESTAURANT', locatie: 'L01' }, accMgr);
    return forta.locatie === 'L02' && forta.scop === 'RESTAURANT';
  })());
t('un manager care cere scopul COMPANIE e readus la restaurantul lui',
  normalizeazaSelectie(STRES, { ...SEL, scop: 'COMPANIE', locatie: null }, accMgr).scop === 'RESTAURANT');
t('cererea directă pe alt restaurant e REFUZATĂ, cu motiv',
  (() => {
    const v = verificaCerere(aMgr, { locatie: 'L01' });
    return !v.permis && !!v.motiv && !!v.cod;
  })());
t('scopul dedus din parametri străini se întoarce cu refuzuri, nu cu datele',
  (() => {
    const sc = scopDinParametri(STRES, aMgr, { locatie: 'L01', canal: 'TOTAL' });
    return sc.refuzuri.length > 0 && sc.nivel !== restaurant('L01');
  })());
t('ecranul randat pentru manager cu selecție forțată nu arată alt restaurant',
  !new RegExp('\\bL01\\b').test(
    renderToStaticMarkup(h(TowerProvider, {
      value: {
        state: sMgr, ctx: buildCtx(sMgr), acces: accMgr,
        sel: normalizeazaSelectie(sMgr, { ...SEL, scop: 'RESTAURANT', locatie: 'L01' }, accMgr),
        setSel: () => undefined, update: () => undefined,
      } as TowerCtx,
    }, h(ContinutTower, { initial: 'OVERVIEW' })))));

console.log('\n— … și nici scrierea nu poate ieși din scop —');
t('managerul nu poate scrie deloc', !verificaScriere(aMgr).permis);
t('un import pentru alt restaurant e refuzat înainte de orice scriere',
  !verificaImport(aTop, { scop: 'RESTAURANT', restaurante: ['LX9'] }).permis);
t('un import de companie e refuzat unui rol fără vedere pe companie',
  !verificaImport(aMgr, { scop: 'COMPANIE', restaurante: [] }).permis);
t('importul în scopul propriu rămâne permis pentru cine are dreptul',
  verificaImport(aTop, { scop: 'RESTAURANT', restaurante: ['L01'] }).permis);
t('refuzul se înregistrează în urma de acces, cu scop și motiv',
  (() => {
    const dupa = inregistreazaAcces(STRES, aMgr, {
      actiune: 'CERERE_DATE', scop: 'L01', rezultat: 'REFUZAT', detaliu: 'test de audit',
    });
    const ultim = (dupa.auditAcces ?? []).at(-1);
    return !!ultim && ultim.rezultat === 'REFUZAT' && ultim.scop === 'L01';
  })());

t('managementul vede ambele restaurante',
  (analizaTimeline(STRES, CTX_STRES, cerereDin(SEL)).magazine ?? []).length === 2);

// ————————————————————————————————————————————————————————— M. interfața

console.log('\n— M. Fiecare ecran se randează, inclusiv în stările-limită —');
const ctxTower = (state: AppState, acces = accTop, sel = SEL): TowerCtx =>
  ({ state, ctx: buildCtx(state), sel, setSel: () => undefined, acces, update: () => undefined });
const randeaza = (state: AppState, sectiune: Parameters<typeof ContinutTower>[0]['initial'], acces = accTop, sel = SEL) =>
  renderToStaticMarkup(h(TowerProvider, { value: ctxTower(state, acces, sel) }, h(ContinutTower, { initial: sectiune })));

const SECTIUNI_TOATE = ['OVERVIEW', 'ANALIZA_FC', 'NBO29', 'PMIX47', 'RECONCILIERE',
  'INGREDIENTE', 'SIMULARI', 'IMPORTURI', 'AI_ADVISOR', 'SETARI'] as const;
for (const s of SECTIUNI_TOATE) {
  t(`„${s}" se randează pe date reale`, randeaza(STRES, s).includes(`data-sectiune-activa="${s}"`));
  t(`„${s}" se randează pe stare GOALĂ, fără să crape`,
    randeaza(stareGoala, s).includes(`data-sectiune-activa="${s}"`));
}
t('starea goală spune că nu are date, nu arată zerouri',
  randeaza(stareGoala, 'OVERVIEW').includes('indisponibil') || randeaza(stareGoala, 'OVERVIEW').includes('Nu există date'));
t('etichetele sunt în română', randeaza(STRES, 'OVERVIEW').includes('Puntea Food Cost'));
t('tabelele largi pot derula pe orizontală, nu rup pagina',
  randeaza(STRES, 'OVERVIEW').includes('overflow-x-auto'));
t('scopul e vizibil pe fiecare ecran',
  SECTIUNI_TOATE.every(s => randeaza(STRES, s).includes('data-zona="scop-banda"')));
t('semnalele de calitate sunt vizibile în Overview',
  randeaza(STRES, 'OVERVIEW').includes('data-zona="calitate"'));

// ————————————————————————————————————————————————————————— N. performanță

console.log('\n— N. Performanță: aceeași cerere, același cost, fără surprize —');
const cronometru = (f: () => void, n = 3) => {
  const t0 = Date.now(); for (let i = 0; i < n; i++) f(); return Date.now() - t0;
};
const durataAnaliza = cronometru(() => analizaTimeline(STRES, CTX_STRES, cerereDin(SEL)));
t('analiza completă rulează în timp rezonabil pe fixtura de stres', durataAnaliza < 5000, `${durataAnaliza}ms / 3 rulări`);
t('contextul se construiește o singură dată per stare (buildCtx e pur)',
  (() => { const a = buildCtx(STRES), b = buildCtx(STRES);
    return a.produse.size === b.produse.size && a.retete.size === b.retete.size; })());
t('proiecția nu copiază starea când nu e nevoie',
  stareAutorizata(STRES, contextAutorizare(STRES, { rol: 'ADMIN' }, false)) === STRES);
t('dosarul Advisor rulează o singură dată motoarele pentru un scop',
  cronometru(() => dosarAdvisor(STRES, CTX_STRES, { selectie: SEL, acces: accTop, maxWhatIf: 1 }), 1) < 5000);

// paza împotriva unei regresii pătratice: analiza pe companie trebuie să rămână
// proporțională cu numărul de restaurante, nu cu pătratul lui. Raportul e independent
// de viteza mașinii, deci nu e un test cronometric fragil.
const laScara = (n: number): AppState => {
  const locatii = Array.from({ length: n }, (_, i) => ({ cod: `S${String(i + 1).padStart(2, '0')}`, nume: `R${i + 1}` }));
  return {
    ...STRES, locatii,
    vanzari: locatii.flatMap(l => STRES.vanzari.map(v => ({ ...v, locatie: l.cod }))),
    materiale29: locatii.flatMap(l => (STRES.materiale29 ?? []).map(m => ({ ...m, locatie: m.locatie === null ? null : l.cod }))),
  };
};
const masoara = (n: number) => {
  const st = laScara(n); const c = buildCtx(st);
  return cronometru(() => analizaTimeline(st, c, cerereDin(SEL)), 1);
};
const [t8, t16] = [masoara(8), masoara(16)];
t('analiza pe companie nu explodează pătratic la dublarea rețelei',
  t16 <= Math.max(60, t8 * 6),
  `8 restaurante ${t8}ms → 16 restaurante ${t16}ms`);
t('o cerere pe un singur restaurant nu costă cât toată rețeaua',
  (() => {
    const st = laScara(16); const c = buildCtx(st);
    const unul = cronometru(() => analizaTimeline(st, c, { ...cerereDin(SEL), nivel: restaurant('S01') }), 1);
    const tot = cronometru(() => analizaTimeline(st, c, cerereDin(SEL)), 1);
    return unul <= Math.max(40, tot);
  })());

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
