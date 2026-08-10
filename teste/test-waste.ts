import { stareGoala } from '../src/lib/seed';
import { importa, type Parsat } from '../src/lib/importer';
import { buildCtx, varianceDetaliat, consumuriLuna } from '../src/lib/engine';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

// bază minimă: un burger cu chiflă (2,40/buc) și carne (10 lei/kg, 100 g)
const baza: AppState = { ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'Sun Plaza' }, { cod: 'L02', nume: 'Oradea' }],
  ingrediente: [
    { cod: 'CHIFLA', denumire: 'Chifla', categorie: 'MP', tip: 'FOOD', um: 'buc', preturi: [{ validDeLa: '2026-07-01', pret: 2.4 }], activ: true },
    { cod: 'CARNE', denumire: 'Carne vita', categorie: 'MP', tip: 'FOOD', um: 'kg', preturi: [{ validDeLa: '2026-07-01', pret: 10 }], activ: true },
  ],
  produse: [{ cod: 'B1', denumire: 'Burger', categorie: 'BURGER', tip: 'SIMPLU', tva: 11, pretInstore: 20, activ: true }],
  retete: [{ cod: 'B1', tip: 'PRODUS', denumire: 'Burger', activa: 1, versiuni: [{ nr: 1, data: '2026-07-01', linii: [
    { comp: 'CHIFLA', tipComp: 'INGREDIENT', cant: 1, um: 'buc', canal: 'AMBELE' },
    { comp: 'CARNE', tipComp: 'INGREDIENT', cant: 100, um: 'g', canal: 'AMBELE' },
  ] }] }],
  vanzari: [{ data: '2026-07-15', locatie: 'L01', canal: 'INSTORE', produs: 'B1', cant: 1000, brut: 20000, net: 20000 / 1.11 }],
};

console.log('— Consumul teoretic, ca punct de referință —');
const ctx0 = buildCtx(baza);
const cons = consumuriLuna(baza, ctx0, '2026-07');
t('1000 burgeri → 1000 chifle', aprox(cons.get('CHIFLA')!.cant, 1000));
t('1000 burgeri → 100 kg carne', aprox(cons.get('CARNE')!.cant, 100));
t('consumul se poate cere pe o locație', aprox(consumuriLuna(baza, ctx0, '2026-07', 'L01').get('CHIFLA')!.cant, 1000)
  && !consumuriLuna(baza, ctx0, '2026-07', 'L02').has('CHIFLA'));

console.log('— Importul de waste —');
const pWaste: Parsat = {
  foaie: 'Waste', antete: ['Cod', 'Cantitate', 'UM', 'Locatie', 'Perioada', 'Motiv'],
  randuri: [
    { Cod: 'CHIFLA', Cantitate: 30, UM: 'buc', Locatie: 'L01', Perioada: '2026-07', Motiv: 'expirat' },
    { Cod: 'CARNE', Cantitate: 2, UM: 'kg', Locatie: 'L01', Perioada: '2026-07', Motiv: 'ars' },
    { Cod: 'INEXISTENT', Cantitate: 5, UM: 'buc', Locatie: 'L01', Perioada: '2026-07', Motiv: '' },
  ],
};
const rW = importa('WASTE', pWaste, 'Waste iulie.xlsx', baza);
t('import reușit, 2 rânduri valide', rW.batch.status === 'IMPORTAT' && rW.batch.importate === 2, rW.batch.erori.join('|'));
t('codul necunoscut e raportat, nu importat', rW.batch.avertismente.some(a => a.includes('INEXISTENT')));
t('valoarea waste-ului e raportată în lei (30×2,40 + 2×10 = 92)', rW.batch.avertismente.some(a => a.includes('92')));
t('motivul e păstrat', rW.stateNou.waste.find(w => w.ingredient === 'CHIFLA')?.motiv === 'expirat');

console.log('— Descompunerea fără inventar: neexplicatul rămâne necunoscut —');
const vd1 = varianceDetaliat(rW.stateNou, buildCtx(rW.stateNou), '2026-07', 'RETEA');
t('cost teoretic = 1000×2,40 + 100×10 = 3.400', aprox(vd1.leiTeoretic, 3400, 0.5), vd1.leiTeoretic.toFixed(2));
t('waste = 92 lei', aprox(vd1.leiWaste, 92, 0.5));
t('neexplicatul e null, nu zero — fără inventar nu se poate ști', vd1.leiNeexplicat === null);
t('consumul real e null', vd1.leiReal === null);
t('are waste, nu are inventar', vd1.areWaste && !vd1.areInventar);

console.log('— Cu inventar: descompunere completă —');
const pInv: Parsat = {
  foaie: 'Inventar', antete: ['Cod', 'Consum real', 'UM', 'Locatie', 'Perioada'],
  randuri: [
    { Cod: 'CHIFLA', 'Consum real': 1060, UM: 'buc', Locatie: 'L01', Perioada: '2026-07' },
    { Cod: 'CARNE', 'Consum real': 108, UM: 'kg', Locatie: 'L01', Perioada: '2026-07' },
  ],
};
const rI = importa('INVENTAR', pInv, 'Inventar iulie.xlsx', rW.stateNou);
t('inventarul se importă', rI.batch.importate === 2);
const vd2 = varianceDetaliat(rI.stateNou, buildCtx(rI.stateNou), '2026-07', 'RETEA');
// chifle: real 1060 − teoretic 1000 − waste 30 = 30 buc neexplicate = 72 lei
// carne: real 108 − teoretic 100 − waste 2 = 6 kg = 60 lei
t('neexplicat total = 132 lei', aprox(vd2.leiNeexplicat!, 132, 0.5), vd2.leiNeexplicat!.toFixed(2));
t('consum real total = 1060×2,40 + 108×10 = 3.624', aprox(vd2.leiReal!, 3624, 0.5), vd2.leiReal!.toFixed(2));
t('identitatea se închide: teoretic + waste + neexplicat = real',
  aprox(vd2.leiTeoretic + vd2.leiWaste + vd2.leiNeexplicat!, vd2.leiReal!, 0.5));
t('acoperirea inventarului e 100%', aprox(vd2.acoperireInventar, 100, 0.1));
const chifla = vd2.linii.find(l => l.ingredient === 'CHIFLA')!;
t('pe chiflă: 30 buc neexplicate', aprox(chifla.neexplicat!, 30, 0.01));
t('liniile sunt ordonate după impactul în lei', Math.abs(vd2.linii[0].leiNeexplicat ?? 0) >= Math.abs(vd2.linii[1].leiNeexplicat ?? 0));

console.log('— Conversia unităților și filtrarea pe locație —');
const pInvG: Parsat = {
  foaie: 'I', antete: ['Cod', 'Consum real', 'UM', 'Locatie', 'Perioada'],
  randuri: [{ Cod: 'CARNE', 'Consum real': 108000, UM: 'g', Locatie: 'L01', Perioada: '2026-07' }],
};
const rG = importa('INVENTAR', pInvG, 'Inventar.xlsx', rW.stateNou);
const vdG = varianceDetaliat(rG.stateNou, buildCtx(rG.stateNou), '2026-07', 'RETEA');
t('108.000 g = 108 kg', aprox(vdG.linii.find(l => l.ingredient === 'CARNE')!.consumReal!, 108, 0.001));
const vdL2 = varianceDetaliat(rI.stateNou, buildCtx(rI.stateNou), '2026-07', 'L02');
t('altă locație: fără date, fără cifre inventate', vdL2.leiTeoretic === 0 && !vdL2.areWaste && !vdL2.areInventar);

console.log('— Reimportul aceleiași luni înlocuiește, nu dublează —');
const rW2 = importa('WASTE', pWaste, 'Waste iulie corectat.xlsx', rW.stateNou);
t('waste-ul nu se dublează la reimport', rW2.stateNou.waste.length === rW.stateNou.waste.length,
  `${rW.stateNou.waste.length} → ${rW2.stateNou.waste.length}`);
t('UM nepotrivită cu ingredientul e respinsă cu explicație',
  importa('WASTE', { foaie: 'W', antete: ['Cod', 'Cantitate', 'UM', 'Locatie', 'Perioada'],
    randuri: [{ Cod: 'CHIFLA', Cantitate: 5, UM: 'kg', Locatie: 'L01', Perioada: '2026-07' }] }, 'w.xlsx', baza)
    .batch.avertismente.some(a => a.includes('nu se potrivește')));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
