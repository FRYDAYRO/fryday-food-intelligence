import { stareGoala } from '../src/lib/seed';
import { genereazaSeedNBO } from '../src/lib/seed-nbo';
import { buildCtx, fcPerioada } from '../src/lib/engine';
import { importa, type Parsat } from '../src/lib/importer';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

console.log('— Acoperire completă: cele două cifre coincid —');
const s0 = genereazaSeedNBO();
const f0 = fcPerioada(s0, buildCtx(s0), '2026-07', 'RETEA');
t('acoperire 100%', aprox(f0.acoperire!, 100, 0.01), `${f0.acoperire!.toFixed(2)}%`);
t('FC total = FC acoperit', aprox(f0.fcTeoretic!, f0.fcTeoreticAcoperit!, 0.001), `${f0.fcTeoretic!.toFixed(2)}% / ${f0.fcTeoreticAcoperit!.toFixed(2)}%`);
t('nimic fără rețetă', f0.netFaraReteta === 0);

console.log('— Acoperire parțială: produs vândut fără rețetă —');
// adăugăm un produs fără rețetă, cu vânzări mari
const s1 = {
  ...s0,
  produse: [...s0.produse, { cod: 'X1', denumire: 'Produs fără rețetă', categorie: 'BURGER', tip: 'SIMPLU' as const, pretInstore: 20, pretDelivery: 24, tva: 11, activ: true }],
  vanzari: [...s0.vanzari, { data: '2026-07-15', locatie: 'L01', canal: 'INSTORE' as const, produs: 'X1', cant: 5000, brut: 100000, net: 100000 / 1.11 }],
};
const f1 = fcPerioada(s1, buildCtx(s1), '2026-07', 'RETEA');
t('acoperirea scade', f1.acoperire! < 40, `${f1.acoperire!.toFixed(1)}%`);
t('FC pe partea acoperită rămâne corect', aprox(f1.fcTeoreticAcoperit!, f0.fcTeoretic!, 0.05), `${f1.fcTeoreticAcoperit!.toFixed(2)}%`);
// fără Sales Report, numitorul e PMIX-ul: acolo diluarea se vede direct
const s1b = { ...s1, salesReport: [] };
const f1b = fcPerioada(s1b, buildCtx(s1b), '2026-07', 'RETEA');
t('fără Sales Report, FC pe total e diluat artificial', f1b.fcTeoretic! < f1b.fcTeoreticAcoperit! / 2,
  `total ${f1b.fcTeoretic!.toFixed(2)}% vs acoperit ${f1b.fcTeoreticAcoperit!.toFixed(2)}%`);
t('cifra acoperită e aceeași, indiferent de numitorul oficial', aprox(f1b.fcTeoreticAcoperit!, f1.fcTeoreticAcoperit!, 0.05));
// ambele mărimi sunt pe baza PMIX; numitorul oficial (Sales Report) e raportat separat
const agPmix = f1.netAcoperit + f1.netFaraReteta;
t('net acoperit + net fără rețetă = totalul PMIX', agPmix > f1.net, `PMIX ${agPmix.toFixed(0)} vs oficial ${f1.net.toFixed(0)}`);

console.log('— Pornirea aplicației: fără date demo —');
const gol = stareGoala();
t('nicio vânzare, niciun produs la pornire', gol.vanzari.length === 0 && gol.produse.length === 0);
t('niciun lot de import demo', !gol.importuri.some(b => b.tip === 'DATE DEMO'));
t('parametrii de calcul rămân', gol.setari.tvaImplicit === 11 && gol.reguli.length > 0 && gol.tinte.length > 0);
const fGol = fcPerioada(gol, buildCtx(gol), '2026-07', 'RETEA');
t('FC pe stare goală nu inventează cifre', fGol.fcTeoretic === null && fGol.fcTeoreticAcoperit === null && fGol.net === 0);

console.log('— Flux real: rețetar + vânzări pe stare goală —');
const nbo: unknown[][] = [
  ['Product Name:', 'SAMURAI CHICKEN', '', '', 'Product ID:', '820023'],
  ['POS Item Price:', '$15.99', 'Category:', 'BURGER*'], [],
  ['Item ID', 'Item Name', 'Qty', 'Units', 'Cost', 'Extension'],
  ['7000133', 'CHIFLA CARTOF 3.5inch 53G x 72', 1, 'EA', '$2.400', '$2.400'],
  ['702045', 'Patties pui 50gr Transavia', 1, 'EA', '$1.171', '$1.171'],
  ['4078', 'Ulei de alune', 20, 'ML', '$0.017', '$0.338'],
  ['4067', 'Sos Samurai BIB', 15, 'ML', '$0.030', '$0.453'],
  ['702399', 'Y-Castraveti felii in saramura', 5.6, 'GM', '$0.016', '$0.087'],
  ['7000143', 'SALATA LOLLO BIONDA S 500g', 10, 'Gram', '$0.036', '$0.360'],
  ['700655', 'Hartie Little Hamburgers', 1, 'EA', '$0.111', '$0.111'],
];
const r1 = importa('RETETAR_NBO', { foaie: 'R', antete: [], randuri: [], matrice: nbo }, 'nbo.xlsx', gol);
const pmix: Parsat = {
  foaie: 'PMIX', antete: ['Data', 'Restaurant', 'Cod produs', 'Canal', 'Cantitate'],
  randuri: [{ Data: '2026-07-29', Restaurant: 'Sun Plaza', 'Cod produs': '820023', Canal: 'InStore', Cantitate: 300 }],
};
const r2 = importa('PMIX', pmix, 'pmix.xlsx', r1.stateNou);
const f2 = fcPerioada(r2.stateNou, buildCtx(r2.stateNou), '2026-07', 'RETEA');
t('acoperire 100% pe datele proprii', aprox(f2.acoperire!, 100, 0.01));
t('FC corect: 4,920 / (15,99÷1,11) = 34,15%', aprox(f2.fcTeoreticAcoperit!, 34.15, 0.05), `${f2.fcTeoreticAcoperit!.toFixed(2)}%`);
t('nicio denumire demo în date', !r2.stateNou.produse.some(p => /Crispy|Cola|Cartofi prăjiți/.test(p.denumire)));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
