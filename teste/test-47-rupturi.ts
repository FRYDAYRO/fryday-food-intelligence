// Audit de lansare — formele de rupere din raportul 4.7 pe mai multe restaurante (30 de magazine):
//   · extension-ul trunchiat la capăt de rând, cu cifrele orfane lipite de continuarea denumirii
//     („$119,520." + „new 00") — înainte, rândul dispărea și corupea numele următorului;
//   · continuarea denumirii DUPĂ linia cu cifre („250g MD New") — înainte, se lipea la produsul următor;
//   · denumiri cu cifre și paranteze („PACK COUNTRY HOT WINGS 30 (990G)") — rămân întregi.
// Proprietatea verificată: suma liniilor citite = totalul categoriei, iar fiecare produs își ține numele.
import { matriceDinText, parseSalesMix } from '../src/lib/salesmix';
import { importa } from '../src/lib/importer';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

const TEXT = [
  'Multiple Selection Fiscal Year: 2026', '4.7 Sales Mix', 'Period: 8 Week: 4', '8/17/2026 - 8/23/2026', 'Menu Item Name Qty Price Extension',
  'CATEGORY BURGER*',
  'AMERICAN CHEESEBURGER new D 1,665 13.000 $21,645.00',
  'AMERICAN DUBLU CHEESEBURGER 7,470 16.000 $119,520.',
  'new 00',
  'AMERICAN DUBLU CHEESEBURGER 1,394 19.000 $26,486.00',
  'new D',
  'AMERICAN TRIPLU CHEESEBURGER 2,846 24.990 $71,121.54',
  'BLACK TRUFFLE SMASHED new 4,684 22.990 $107,685.',
  '16',
  'Total BURGER* 18,059 $346,457.70',
  'CATEGORY CARTOFI*',
  'Cartofi prajiti in ulei de alune SuperSize 82 23.990 $1,967.18',
  '250g MD New',
  'Fry Shaker Cajun 307 5.000 $1,535.00',
  'Fry Shaker Cajun D 78 5.000 $390.00',
  'Total CARTOFI* 467 $3,892.18',
  'CATEGORY PUI*',
  'NUGGETS 4 M D new 85 0.000 $0.00',
  'PACK COUNTRY HOT WINGS 30 (990G) 28 101.240 $2,834.72',
  'new',
  'PACK COUNTRY HOT WINGS 30 (990G) 17 121.240 $2,061.08',
  'new D',
  'PACK HOMESTYLE CRISPY 20 (1200G) 122 121.240 $14,791.28',
  'Total PUI* 252 $19,687.08',
  'Total 18778 $370,036.96',
  'Groups/Stores Selected for this Report',
  'FRYDAY ALBA IULIA, FRYDAY CLUJ MEMO, FRYDAY RM VALCEA DT',
  'V 21.1.126.0 - 1 - 8/24/2026 9:12 AM Copyright © NCR Corporation 2022 1 of 1',
].join('\n');

const sm = parseSalesMix(matriceDinText(TEXT));
const l = (nume: string) => sm.linii.find(x => x.nume === nume);
const suma = (cat: string) => sm.linii.filter(x => x.categorie === cat).reduce((s, x) => ({ q: s.q + x.qty, e: s.e + x.ext }), { q: 0, e: 0 });

console.log('— Extension trunchiat cu cifrele orfane lângă continuarea denumirii —');
t('„$119,520." + „new 00" → 119.520,00 lei, 7.470 buc, numele „AMERICAN DUBLU CHEESEBURGER new"', l('AMERICAN DUBLU CHEESEBURGER new')?.qty === 7470 && aprox(l('AMERICAN DUBLU CHEESEBURGER new')!.ext, 119520));
t('rândul următor își păstrează numele curat („… new D"), nu înghite rândul trunchiat', l('AMERICAN DUBLU CHEESEBURGER new D')?.qty === 1394 && aprox(l('AMERICAN DUBLU CHEESEBURGER new D')!.ext, 26486) && !sm.linii.some(x => x.nume.includes('$')));
t('„$107,685." + „16" (cifre singure) → 107.685,16', aprox(l('BLACK TRUFFLE SMASHED new')!.ext, 107685.16));
t('BURGER: suma liniilor = totalul categoriei (18.059 buc, 346.457,70 lei)', suma('BURGER').q === 18059 && aprox(suma('BURGER').e, 346457.7), `${suma('BURGER').q} / ${suma('BURGER').e.toFixed(2)}`);

console.log('\n— Continuarea denumirii de după linia cu cifre —');
t('„250g MD New" aparține rândului precedent (SuperSize), care devine meniu pe Delivery', l('Cartofi prajiti in ulei de alune SuperSize 250g MD New')?.qty === 82 && l('Cartofi prajiti in ulei de alune SuperSize 250g MD New')?.canal === 'DELIVERY');
t('Fry Shaker Cajun rămâne cu numele lui, InStore', l('Fry Shaker Cajun')?.qty === 307 && l('Fry Shaker Cajun')?.canal === 'INSTORE' && !sm.linii.some(x => x.nume.startsWith('250g')));
t('CARTOFI: suma liniilor = totalul categoriei', suma('CARTOFI').q === 467 && aprox(suma('CARTOFI').e, 3892.18));

console.log('\n— Denumiri cu cifre și paranteze —');
t('„PACK COUNTRY HOT WINGS 30 (990G)" + „new" / „new D" rămân întregi și separate', l('PACK COUNTRY HOT WINGS 30 (990G) new')?.qty === 28 && l('PACK COUNTRY HOT WINGS 30 (990G) new D')?.qty === 17 && l('PACK COUNTRY HOT WINGS 30 (990G) new D')?.canal === 'DELIVERY');
t('PUI: suma liniilor = totalul categoriei', suma('PUI').q === 252 && aprox(suma('PUI').e, 19687.08));
t('totalul general se închide exact: 18.778 buc, 370.036,96 lei', sm.linii.reduce((s, x) => s + x.qty, 0) === sm.totalQty && aprox(sm.linii.reduce((s, x) => s + x.ext, 0), sm.totalExt!) && sm.totalQty === 18778);
t('un început de denumire pe rândul de dinaintea cifrelor rămâne început, nu continuare', (() => {
  const sm2 = parseSalesMix(matriceDinText(['CATEGORY X*', 'Burger A 10 5.000 $50.00', 'Nume foarte lung de produs', 'care continua 3 2.000 $6.00', 'Total X* 13 $56.00'].join('\n')));
  return sm2.linii.some(x => x.nume === 'Nume foarte lung de produs care continua' && x.qty === 3) && sm2.linii.find(x => x.qty === 10)?.nume === 'Burger A';
})());
t('lista de restaurante și perioada se citesc ca înainte', sm.magazine.length === 3 && sm.perioadaDe === '2026-08-17' && sm.perioadaLa === '2026-08-23');

console.log('\n— Restaurantul din antetul 4.7 se leagă de codul lui din Store Master —');
const TEXT1 = [
  'FRYDAY TIMISOARA Fiscal Year: 2026', '4.7 Sales Mix', 'IULIUS TOWN Period: 8 Week: 4', '8/17/2026 - 8/23/2026', 'Menu Item Name Qty Price Extension',
  'CATEGORY BERE', 'Bere Corona new 1 15.990 $15.99', 'Bere Corona new D 1 19.990 $19.99', 'Total BERE 2 $35.98', 'Total 2 $35.98',
  'V 21.1.126.0 - 1 - 8/24/2026 9:12 AM Copyright © NCR Corporation 2022 1 of 1',
].join('\n');
const parsat1 = { foaie: 'PDF', antete: [] as string[], randuri: [] as Record<string, unknown>[], matrice: matriceDinText(TEXT1) };
const cuRestaurant: AppState = { ...stareGoala(), locatii: [{ cod: 'L02', nume: 'FRYDAY TIMISOARA IULIUS TOWN' }],
  produse: [{ cod: 'CORONA', denumire: 'Bere Corona', categorie: 'BERE', tip: 'SIMPLU', tva: 21, pretInstore: 15.99, activ: true, aliasuri: ['Bere Corona'] }] };
const r1 = importa('SALES_MIX', parsat1, '4.7_Sales_Mix.pdf', cuRestaurant);
t('vânzările intră pe codul L02, nu pe numele restaurantului', r1.stateNou.vanzari.length === 2 && r1.stateNou.vanzari.every(v => v.locatie === 'L02'), [...new Set(r1.stateNou.vanzari.map(v => v.locatie))].join(','));
t('nu se creează o a doua locație cu numele restaurantului (MUTAȚIA „locație după nume" ar pica aici)', r1.stateNou.locatii.length === 1 && !r1.batch.avertismente.some(a => a.includes('Locație creată')));
const faraRestaurant: AppState = { ...cuRestaurant, locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }] };
const r2 = importa('SALES_MIX', parsat1, '4.7_Sales_Mix.pdf', faraRestaurant);
t('fără intrare în Store Master, numele devine cod și locația e creată, ca înainte', r2.stateNou.locatii.length === 2 && r2.stateNou.vanzari.every(v => v.locatie === 'FRYDAY TIMISOARA IULIUS TOWN') && r2.batch.avertismente.some(a => a.includes('Locație creată')));

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
process.exit(fail ? 1 : 0);
