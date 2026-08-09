import * as XLSX from 'xlsx';
import { analizeazaFisier, gasesteAntet } from '../src/lib/auto';
import { importa } from '../src/lib/importer';
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, costProdus } from '../src/lib/engine';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

// fabricăm un File din foi date ca matrice
function fals(nume: string, foi: Record<string, unknown[][]>): File {
  const wb = XLSX.utils.book_new();
  for (const [n, m] of Object.entries(foi)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(m), n);
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return { name: nume, arrayBuffer: async () => buf } as unknown as File;
}

async function main() {
console.log('— Antet care nu e pe primul rând —');
const cuTitlu: unknown[][] = [
  ['FRYDAY FOOD COST — BAZA DE DATE'], ['Generat: 08.08.2026'], [],
  ['Cod', 'Denumire', 'UM', 'Pret'],
  ['7000133', 'CHIFLA CARTOF 3.5inch', 'buc', 2.4],
  ['4078', 'Ulei de alune', 'l', 16.9],
];
t('rândul de antet detectat corect (al 4-lea)', gasesteAntet(cuTitlu) === 3, String(gasesteAntet(cuTitlu)));
let a = await analizeazaFisier(fals('FRYDAY FC BAZA 2026-08.xlsx', { 'Baza': cuTitlu }));
t('o foaie analizată', a.length === 1);
t('tip detectat: Cost ingrediente', a[0].tip === 'COST_INGREDIENTE', String(a[0].tip));
t('antetul raportat ca fiind pe rândul 4', a[0].randAntet === 3 && a[0].note.some(n => n.includes('rândul 4')));
t('4 rânduri de date, titlul ignorat', a[0].parsat.randuri.length === 2, `${a[0].parsat.randuri.length}`);
let r = importa(a[0].tip!, a[0].parsat, 'fc.xlsx', genereazaSeed(), a[0].mapare);
t('importul reușește fără intervenție', r.batch.status === 'IMPORTAT' && r.batch.importate === 2, r.batch.erori.join(' | '));

console.log('— Coloane cu nume complet necunoscute (deducere din conținut) —');
const opac: unknown[][] = [
  ['Poz', 'Referinta', 'Text', 'Masura', 'Suma'],
  [1, '7000133', 'CHIFLA CARTOF 3.5inch 53G', 'EA', 2.4],
  [2, '4078', 'Ulei de alune rafinat', 'ML', 0.017],
  [3, '702045', 'Patties pui 50gr Transavia', 'EA', 1.171],
  [4, '7000143', 'SALATA LOLLO BIONDA S 500g', 'GM', 0.036],
];
a = await analizeazaFisier(fals('export.xlsx', { 'Sheet1': opac }));
t('tip dedus fără ajutor din nume', a[0].tip !== null, String(a[0].tip));
t('codul dedus din conținut', a[0].mapare.cod === 'Referinta', a[0].mapare.cod);
t('denumirea dedusă din conținut', a[0].mapare.denumire === 'Text', a[0].mapare.denumire);
t('UM dedusă din vocabularul NBO', a[0].mapare.um === 'Masura', a[0].mapare.um);
t('prețul dedus din conținut', a[0].mapare.pret === 'Suma', a[0].mapare.pret);
t('raportează ce a dedus din conținut', a[0].dinContinut.length >= 3, a[0].dinContinut.join(', '));
r = importa(a[0].tip!, a[0].parsat, 'export.xlsx', genereazaSeed(), a[0].mapare);
t('import automat reușit', r.batch.status === 'IMPORTAT' && r.batch.importate === 4, `${r.batch.importate}/4`);

console.log('— Fișier cu mai multe foi, de tipuri diferite —');
const pmix: unknown[][] = [
  ['Data', 'Cod produs', 'Canal', 'Cantitate'],
  ['2026-07-01', 'P001', 'InStore', 12],
  ['2026-07-01', 'P003', 'Delivery', 7],
];
const costuri: unknown[][] = [
  ['Cod', 'Denumire', 'UM', 'Pret'],
  ['I001', 'Piept de pui', 'kg', 14.5],
];
const goala: unknown[][] = [[], ['']];
a = await analizeazaFisier(fals('raport lunar.xlsx', { 'Vanzari': pmix, 'Costuri': costuri, 'Note': goala }));
t('foaia goală e ignorată', a.length === 2, `${a.length} foi`);
t('foaia de vânzări → PMIX', a.find(x => x.foaie === 'Vanzari')?.tip === 'PMIX');
t('foaia de costuri → Cost ingrediente', a.find(x => x.foaie === 'Costuri')?.tip === 'COST_INGREDIENTE');

console.log('— Recipe card NBO recunoscut automat —');
const nbo: unknown[][] = [
  ['Recipes - Menu Items'], [],
  ['Product Name:', 'SAMURAI CHICKEN', '', '', 'Product ID:', '820023'],
  ['POS Item Price:', '$15.99', 'Materials Cost:', '$4.92', 'Category:', 'BURGER*'], [],
  ['Item ID', 'Item Name', 'Qty', 'Units', 'Cost', 'Extension'],
  ['7000133', 'CHIFLA CARTOF 3.5inch 53G x 72', 1, 'EA', '$2.400', '$2.400'],
  ['702045', 'Patties pui 50gr Transavia', 1, 'EA', '$1.171', '$1.171'],
  ['4078', 'Ulei de alune', 20, 'ML', '$0.017', '$0.338'],
  ['4067', 'Sos Samurai BIB', 15, 'ML', '$0.030', '$0.453'],
  ['702399', 'Y-Castraveti felii in saramura', 5.6, 'GM', '$0.016', '$0.087'],
  ['7000143', 'SALATA LOLLO BIONDA S 500g', 10, 'Gram', '$0.036', '$0.360'],
  ['700655', 'Hartie Little Hamburgers', 1, 'EA', '$0.111', '$0.111'],
];
a = await analizeazaFisier(fals('recipe cards NBO.xlsx', { 'Recipes': nbo }));
t('tip detectat: Rețetar NBO', a[0].tip === 'RETETAR_NBO', String(a[0].tip));
const gol = { ...genereazaSeed(), produse: [], retete: [], ingrediente: [], vanzari: [], salesReport: [] };
r = importa('RETETAR_NBO', a[0].parsat, 'nbo.xlsx', gol, a[0].mapare);
t('produsul și rețeta intră automat', r.stateNou.produse.length === 1 && r.stateNou.retete.length === 1);
const c = costProdus('820023', 'INSTORE', buildCtx(r.stateNou), '2026-07-15')!;
t('costul reproduce NBO: 4,920 lei', aprox(c.total, 4.920), c.total.toFixed(3));

console.log('— Fișier de care nu se poate face nimic —');
a = await analizeazaFisier(fals('aiurea.xlsx', { 'X': [['a', 'b'], ['x', 'y'], ['z', 'w']] }));
t('tipul rămâne nedeterminat', a[0].tip === null);
t('spune explicit ce lipsește', a[0].lipsa.length > 0 && a[0].note.some(n => n.includes('lipsesc')), a[0].note.join(' | ').slice(0, 80));

console.log('— Fișier de corecții de prețuri la ingrediente —');
const cor: unknown[][] = [
  ['Cod', 'Denumire', 'UM', 'Pret'],
  ['7000210', 'PREP - smashed koliber 60G', 'EA', 3.57],
  ['702045', 'Patties pui 50gr Transavia', 'EA', 1.14],
];
const aCor = await analizeazaFisier(fals('CORECTII-COST-INGREDIENTE-2026-08.xlsx', { 'Corectii': cor }));
t('fișierul de corecții → Cost ingrediente', aCor[0].tip === 'COST_INGREDIENTE', String(aCor[0].tip));
const aCor2 = await analizeazaFisier(fals('Corectii preturi ingrediente august.xlsx', { 'C': cor }));
t('„prețuri ingrediente" nu e confundat cu prețurile de vânzare', aCor2[0].tip === 'COST_INGREDIENTE', String(aCor2[0].tip));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
}
main();
