import { stareGoala } from '../src/lib/seed';
import { importa, type Parsat } from '../src/lib/importer';
import { matriceDinText } from '../src/lib/salesmix';
import { buildCtx, costProdus, perProdus } from '../src/lib/engine';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const baza: AppState = { ...stareGoala(),
  ingrediente: [
    { cod: 'CHIFLA', denumire: 'Chifla', categorie: 'MP', tip: 'FOOD', um: 'buc', preturi: [{ validDeLa: '2026-07-01', pret: 2 }], activ: true },
    { cod: 'CARTOF', denumire: 'Cartofi', categorie: 'MP', tip: 'FOOD', um: 'kg', preturi: [{ validDeLa: '2026-07-01', pret: 5 }], activ: true },
    { cod: 'PAHAR', denumire: 'Pahar', categorie: 'Ambalaje', tip: 'PACKAGING', um: 'buc', preturi: [{ validDeLa: '2026-07-01', pret: 0.5 }], activ: true },
  ],
  produse: [
    { cod: 'HAMBURGER', denumire: 'HAMBURGER', categorie: 'BURGER', tip: 'SIMPLU', tva: 11, pretInstore: 8, activ: true },
    { cod: 'CARTOFI', denumire: 'Cartofi Prajiti 112G', categorie: 'CARTOFI', tip: 'SIMPLU', tva: 11, pretInstore: 10, activ: true },
    { cod: 'SUC', denumire: 'Pepsi 350ML', categorie: 'DRINKS', tip: 'SIMPLU', tva: 21, pretInstore: 7.99, activ: true },
  ],
  retete: [
    { cod: 'HAMBURGER', tip: 'PRODUS', denumire: 'HAMBURGER', activa: 1, versiuni: [{ nr: 1, data: '2026-07-01', linii: [{ comp: 'CHIFLA', tipComp: 'INGREDIENT', cant: 1, um: 'buc', canal: 'AMBELE' }] }] },
    { cod: 'CARTOFI', tip: 'PRODUS', denumire: 'Cartofi', activa: 1, versiuni: [{ nr: 1, data: '2026-07-01', linii: [{ comp: 'CARTOF', tipComp: 'INGREDIENT', cant: 112, um: 'g', canal: 'AMBELE' }] }] },
    { cod: 'SUC', tip: 'PRODUS', denumire: 'Pepsi', activa: 1, versiuni: [{ nr: 1, data: '2026-07-01', linii: [{ comp: 'PAHAR', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'AMBELE' }] }] },
  ],
};

console.log('— Definirea meniului din fișier —');
const pMeniu: Parsat = {
  foaie: 'Meniuri', antete: ['Meniu', 'Componenta', 'Cantitate', 'Pret', 'TVA'],
  randuri: [
    { Meniu: 'Meniu Junior Little Hamburger', Componenta: 'HAMBURGER', Cantitate: 1, Pret: 28, TVA: 11 },
    { Meniu: 'Meniu Junior Little Hamburger', Componenta: 'Cartofi Prajiti 112G', Cantitate: 1, Pret: 28, TVA: 11 },
    { Meniu: 'Meniu Junior Little Hamburger', Componenta: 'Pepsi 350ML', Cantitate: 1, Pret: 28, TVA: 11 },
    { Meniu: 'Meniu Junior Little Hamburger', Componenta: 'INEXISTENT', Cantitate: 1, Pret: 28, TVA: 11 },
  ],
};
const rM = importa('MENIURI', pMeniu, 'Meniuri combo.xlsx', baza);
t('import reușit, un meniu creat', rM.batch.status === 'IMPORTAT' && rM.batch.importate === 1, rM.batch.erori.join('|'));
const meniu = rM.stateNou.produse.find(p => p.tip === 'COMBO')!;
t('meniul are 3 componente (a patra e ignorată)', meniu.combo?.length === 3, `${meniu.combo?.length}`);
t('componenta negăsită e raportată', rM.batch.avertismente.some(a => a.includes('INEXISTENT')));
t('prețul și TVA-ul sunt preluate', meniu.pretInstore === 28 && meniu.tva === 11);
t('componentele pot fi indicate prin denumire, nu doar prin cod', meniu.combo!.some(c => c.cod === 'CARTOFI'));

console.log('— Costul meniului = suma componentelor —');
const ctx = buildCtx(rM.stateNou);
const c = costProdus(meniu.cod, 'INSTORE', ctx, '2026-07-15')!;
// chifla 2 + cartofi 0,112×5 = 0,56 + pahar 0,50 = 3,06
t('cost = 2 + 0,56 + 0,50 = 3,06', aprox(c.total, 3.06), c.total.toFixed(3));
t('ambalajul componentelor intră în Paper', aprox(c.paper, 0.5), c.paper.toFixed(3));
t('restul intră în Food', aprox(c.food, 2.56), c.food.toFixed(3));

console.log('— Sales Mix: componentele la preț 0 nu mai dublează costul —');
const raport = [
  '4.7 Sales Mix', '7/27/2026 - 7/31/2026', 'Menu Item Name Qty Price Extension',
  'CATEGORY COMBOS*',
  'Meniu Junior Little Hamburger 100 28.000 $2,800.00',
  'CATEGORY BURGER*',
  'HAMBURGER New 100 0.000 $0.00',
  'HAMBURGER New 500 8.000 $4,000.00',
  'Total 700 $6,800.00',
  'Groups/Stores Selected for this Report', 'FRYDAY ORADEA',
  'V 21.1.126.0 Copyright © NCR Corporation 2022 1 of 1',
].join('\n');
const pSm: Parsat = { foaie: 'PDF', antete: [], randuri: [], matrice: matriceDinText(raport) };
const rS = importa('SALES_MIX', pSm, '4.7.pdf', rM.stateNou);
t('linia de componentă cu preț 0 e exclusă explicit', rS.batch.avertismente.some(a => a.includes('EXCLUSE') && a.includes('componente')));
const v = rS.stateNou.vanzari;
t('meniul e înregistrat cu 100 bucăți', v.some(x => x.produs === meniu.cod && x.cant === 100));
t('hamburgerul are doar cele 500 vândute separat, nu 600', v.find(x => x.produs === 'HAMBURGER')?.cant === 500,
  String(v.find(x => x.produs === 'HAMBURGER')?.cant));

console.log('— Analiza: costul apare o singură dată —');
const rows = perProdus(rS.stateNou.vanzari, buildCtx(rS.stateNou), { luna: '2026-07', vedere: 'TOTAL' });
const rMeniu = rows.find(x => x.cod === meniu.cod)!;
const rBurger = rows.find(x => x.cod === 'HAMBURGER')!;
t('costul meniului: 100 × 3,06 = 306', aprox(rMeniu.cost, 306, 0.5), rMeniu.cost.toFixed(2));
t('costul hamburgerului: 500 × 2 = 1.000', aprox(rBurger.cost, 1000, 0.5), rBurger.cost.toFixed(2));
t('total cost = 1.306, nu 1.506 (fără dublare)', aprox(rows.reduce((s, r) => s + r.cost, 0), 1306, 0.5),
  rows.reduce((s, r) => s + r.cost, 0).toFixed(2));
t('meniul are venit propriu, deci FC calculabil', rMeniu.fc != null && rMeniu.fc > 0);
// FC meniu = 306 / (2800/1.11) = 12,1%
t('FC meniu ≈ 12,1%', aprox(rMeniu.fc!, 12.13, 0.1), `${rMeniu.fc!.toFixed(2)}%`);

console.log('— Fără meniuri definite, se avertizează în loc să se tacă —');
const rS2 = importa('SALES_MIX', pSm, '4.7.pdf', baza);
t('liniile cu preț 0 sunt semnalate ca neatribuite', rS2.batch.avertismente.some(a => a.includes('preț 0') && a.includes('Definește meniurile')));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
