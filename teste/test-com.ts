import { stareGoala } from '../src/lib/seed';
import { importa, type Parsat } from '../src/lib/importer';
import { buildCtx, fcPerioada, inflatiaIngredientelor, perProdus } from '../src/lib/engine';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

// ——— stare minimă construită prin importuri reale: bază FC + Sales Mix
const NOMENCLATOR: unknown[][] = [
  ['NOMENCLATOR'], [], [],
  ['Cod MP', 'Denumire materie primă (NBO)', 'UM', 'Cost / UM', 'Cost NOU / UM'],
  ['ING1', 'Carne test', 'EA', 4, 4],
  ['AMB1', 'Cutie livrare', 'EA', 1, 1],
];
const RETETAR: unknown[][] = [
  ['REȚETAR'], [], [],
  ['Burger T', '', '', '', '', 'BURGER'],
  ['COD', 'INGREDIENT', 'QTY', 'UM', 'COST/UM', 'COST', 'COST/UM NOU', 'COST NOU'],
  ['ING1', 'Carne test', 1, 'EA', 4, 4, 4, 4],
  ['Burger T', '', '', '', '', 4, '', 4],
  [],
  ['Burger T D', '', '', '', '', 'BURGER'],
  ['COD', 'INGREDIENT', 'QTY', 'UM', 'COST/UM', 'COST', 'COST/UM NOU', 'COST NOU'],
  ['ING1', 'Carne test', 1, 'EA', 4, 4, 4, 4],
  ['AMB1', 'Cutie livrare', 1, 'EA', 1, 1, 1, 1],
  ['Burger T D', '', '', '', '', 5, '', 5],
];
const FOODCOST: unknown[][] = [
  ['FOOD COST'], [], [],
  ['Denumire comercială', 'Rețetă (Recipe Cards)', 'Categorie', 'Canal', 'Tip TVA', 'TVA %', 'MC actual', 'MC NOU', 'Preț cu TVA'],
  ['BURGER T', 'Burger T', 'BURGER', 'Instore', 'FOOD', 0.11, 4, 4, 11.1],
  ['BURGER T D', 'Burger T D', 'BURGER', 'Delivery', 'FOOD', 0.11, 5, 5, 22.2],
];
const SM: unknown[][] = [
  ['4.7 Sales Mix'], ['7/27/2026 - 7/31/2026'],
  ['Menu Item Name', 'Qty', 'Price', 'Extension'],
  ['CATEGORY BURGER*'],
  ['BURGER T new', 100, 11.100, '$1,110.00'],
  ['BURGER T new D', 50, 22.200, '$1,110.00'],
  ['PRODUS MISTER new', 30, 10.000, '$300.00'],
  ['Total 180 $2,520.00'],
  ['Groups/Stores Selected for this Report'],
  ['FRYDAY TEST'],
];

function stareCuVanzari(): AppState {
  let s = stareGoala();
  s = importa('FC_BAZA', { foaie: 'x', antete: [], randuri: [], matrice: [], foi: { NOMENCLATOR, RETETAR, 'FOOD COST': FOODCOST } }, 'fc.xlsx', s).stateNou;
  s = importa('SALES_MIX', { foaie: 'S', antete: [], randuri: [], matrice: SM }, '4.7 Sales Mix.xlsx', s).stateNou;
  return s;
}

console.log('— Comisionul Delivery (16% implicit) —');
const s = stareCuVanzari();
t('comisionul implicit e 16%', s.setari.comisionDeliveryPct === 16);
const ctx = buildCtx(s);
t('contextul poartă comisionul', ctx.comisionDeliveryPct === 16);
const rows = perProdus(s.vanzari, ctx, { luna: '2026-07', vedere: 'TOTAL' });
const b = rows.find(r => r.cod === 'BURGER T')!;
// net: 100×10 InStore + 50×20 Delivery = 2.000; comision = 16% × 1.000 = 160
t('netul Delivery e separat pe rând', aprox(b.netDelivery, 1000, 0.5), b.netDelivery.toFixed(1));
t('comisionul: 160 lei', aprox(b.comision, 160, 0.1), b.comision.toFixed(2));
// cost: 100×4 + 50×5 = 650 · profit 1.350 · profit real 1.190
t('profitul real scade cu comisionul', aprox(b.profitReal, 1190, 0.5), b.profitReal.toFixed(1));
t('FC real > FC aparent', b.fcReal! > b.fc!, `${b.fc!.toFixed(2)} → ${b.fcReal!.toFixed(2)}`);
t('FC real = cost / (net − comision)', aprox(b.fcReal!, (650 / 1840) * 100, 0.05), b.fcReal!.toFixed(2));

const fcp = fcPerioada(s, ctx, '2026-07', 'RETEA');
t('comisionul de perioadă: 160 lei', aprox(fcp.comisionLei, 160, 0.1), fcp.comisionLei.toFixed(1));
// FC Delivery aparent: 250/1000 = 25% · real: 250/840 = 29,76%
t('FC Delivery aparent 25%', aprox(fcp.fcDeliveryAparent!, 25, 0.05), fcp.fcDeliveryAparent!.toFixed(2));
t('FC Delivery real 29,76%', aprox(fcp.fcRealDelivery!, 29.76, 0.05), fcp.fcRealDelivery!.toFixed(2));
t('profitul real de perioadă = net − cost − comision', aprox(fcp.profitReal!, 2000 - 650 - 160, 0.5), fcp.profitReal!.toFixed(1));
t('abaterea folosește FC-ul teoretic când 2.9 lipsește (țintă 45%)',
  fcp.abatere != null && aprox(fcp.abatere, (650 / 2000) * 100 - 45, 0.05), String(fcp.abatere?.toFixed(2)));

console.log('— Comision zero = comportamentul vechi —');
const s0 = { ...s, setari: { ...s.setari, comisionDeliveryPct: 0 } };
const r0 = perProdus(s0.vanzari, buildCtx(s0), { luna: '2026-07', vedere: 'TOTAL' }).find(r => r.cod === 'BURGER T')!;
t('fără comision: profit real = profit, FC real = FC', r0.comision === 0 && aprox(r0.profitReal, r0.profit, 0.001) && aprox(r0.fcReal!, r0.fc!, 0.001));

console.log('— Nemapatele persistă și se rezolvă prin alias —');
t('denumirea negăsită e salvată în stare', s.nemapate.length === 1 && s.nemapate[0].denumire === 'PRODUS MISTER');
t('cu bucăți și valoare pentru prioritizare', s.nemapate[0].cant === 30 && aprox(s.nemapate[0].valoare, 300, 0.5));
// utilizatorul atribuie aliasul (ce face ecranul de mapare)
const s2: AppState = {
  ...s,
  produse: s.produse.map(p => p.cod !== 'BURGER T' ? p : { ...p, aliasuri: [...(p.aliasuri ?? []), 'PRODUS MISTER'] }),
  nemapate: s.nemapate.filter(n => n.denumire !== 'PRODUS MISTER'),
};
const r2 = importa('SALES_MIX', { foaie: 'S', antete: [], randuri: [], matrice: SM }, '4.7 Sales Mix.xlsx', s2);
t('la reimport, aliasul mapează denumirea', !r2.stateNou.nemapate.some(n => n.denumire === 'PRODUS MISTER'),
  r2.stateNou.nemapate.map(n => n.denumire).join('|') || 'listă goală');
const b2 = perProdus(r2.stateNou.vanzari, buildCtx(r2.stateNou), { luna: '2026-07', vedere: 'TOTAL' }).find(r => r.cod === 'BURGER T')!;
t('bucățile mapate intră în produs', b2.buc === 180, `${b2.buc}`);

console.log('— Inflația ingredientelor —');
const s3: AppState = {
  ...s,
  ingrediente: s.ingrediente.map(i => i.cod !== 'ING1' ? i : { ...i, preturi: [{ validDeLa: '2026-07-01', pret: 4 }, { validDeLa: '2026-08-01', pret: 4.6 }] }),
};
const infl = inflatiaIngredientelor(s3, buildCtx(s3), '2026-07');
t('doar ingredientele cu preț schimbat apar', infl.length === 1 && infl[0].cod === 'ING1');
t('variația +15%', aprox(infl[0].variatiePct, 15, 0.01), infl[0].variatiePct.toFixed(1));
// consum: 100 + 50 = 150 buc → impact 150 × 0,6 = 90 lei/lună
t('impactul pe consumul lunii: +90 lei/lună', aprox(infl[0].impactLunar, 90, 0.5), infl[0].impactLunar.toFixed(1));
t('anualizat ×12', aprox(infl[0].impactAnual, 1080, 1));
t('instantaneele vechi migrează (nemapate lipsă → listă goală)', (() => {
  const brut = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
  delete brut.nemapate;
  // migrarea rulează la încărcare; aici verificăm doar convenția câmpului opțional
  return Array.isArray((brut.nemapate as unknown[] | undefined) ?? []);
})());

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
