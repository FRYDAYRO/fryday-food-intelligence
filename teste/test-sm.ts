import { genereazaSeedNBO } from '../src/lib/seed-nbo';
import { importa, type Parsat } from '../src/lib/importer';
import { buildCtx, perProdus, luna } from '../src/lib/engine';
import { parseSalesMix, despartaCanal, cheieDenumire, matriceDinText } from '../src/lib/salesmix';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

console.log('— Sufixele de canal —');
t('„ new" nu e canal', despartaCanal('HOMESTYLE CHICKEN PESTO new').canal === 'INSTORE');
t('„ D" → Delivery', despartaCanal('PUI BURGER new D').canal === 'DELIVERY');
t('„ M D" → Delivery + componentă de meniu', (() => { const r = despartaCanal('Hamburger M D new'); return r.canal === 'DELIVERY' && r.meniuComponenta; })());
t('„ MD" → același lucru', despartaCanal('Cartofi 112g MD new').meniuComponenta === true);
t('„ M" singur → meniu InStore', (() => { const r = despartaCanal('Cartofi 112g M'); return r.canal === 'INSTORE' && r.meniuComponenta; })());
t('denumirea curată nu pierde cifre', despartaCanal('CARTOFI CRISS CUT 140G new').numeBaza === 'CARTOFI CRISS CUT 140G');
t('cheia unifică variantele de canal', cheieDenumire('Homestyle Chicken Pesto D new') === cheieDenumire('HOMESTYLE CHICKEN PESTO new'));

console.log('— Parserul de raport —');
const matrice: unknown[][] = [
  ['4.7 Sales Mix'], ['Multiple Selection Fiscal Year: 2026'], ['Period: 7 Week: 5'], ['7/27/2026 - 7/31/2026'],
  ['Menu Item Name', 'Qty', 'Price', 'Extension'],
  ['CATEGORY BURGER*'],
  ['HOMESTYLE CHICKEN PESTO new', 504, 26.000, '$13,104.00'],
  ['Homestyle Chicken Pesto D new', 1, 28.000, '$28.00'],
  ['Homestyle Chicken Pesto D new', 200, 40.000, '$8,000.00'],
  ['SAMURAI CHICKEN new', 300, 15.990, '$4,797.00'],
  ['AMERICAN CHEESEBURGER new', 5328, 10.000, '$53,280.00'],
  ['Hamburger M D new', 25, 0.000, '$0.00'],
  ['TRIPLU RED PEPPER SMASHED new', -1, 38.000, '($38.00)'],
  ['Total BURGER* 70,333 $1,456,364.12'],
  ['V 21.1.126.0 - 1 - 8/3/2026 9:03 AM Copyright © NCR Corporation 2022 2 of 12'],
  ['Total 6357 $79,171.00'],
  ['Groups/Stores Selected for this Report'],
  ['FRYDAY ALBA IULIA, FRYDAY BUCURESTI SUN PLAZA, FRYDAY CLUJ IULIUS'],
];
const sm = parseSalesMix(matrice);
t('perioada citită din raport', sm.perioadaDe === '2026-07-27' && sm.perioadaLa === '2026-07-31');
t('cele 3 restaurante identificate', sm.magazine.length === 3);
t('totalul raportului citit', sm.totalQty === 6357 && aprox(sm.totalExt!, 79171, 0.5));
t('7 linii de vânzare, fără zgomot de pagină', sm.linii.length === 7, `${sm.linii.length}`);
t('categoria propagată', sm.linii.every(l => l.categorie === 'BURGER'));
t('linia negativă păstrată', sm.linii.some(l => l.qty === -1 && l.ext === -38));
t('rândurile „Total" și antetele ignorate', !sm.linii.some(l => /total|menu item/i.test(l.nume)));

console.log('— Importul: agregare și potrivire pe denumire —');
const s0 = genereazaSeedNBO();
const p: Parsat = { foaie: 'S', antete: [], randuri: [], matrice };
const r = importa('SALES_MIX', p, '4.7 Sales Mix 10002.xlsx', s0);
t('import reușit', r.batch.status === 'IMPORTAT', r.batch.erori.join(' | '));
t('SAMURAI se potrivește pe denumire', r.stateNou.vanzari.some(v => v.produs === '820023' && v.data === '2026-07-27'));
const vSam = r.stateNou.vanzari.filter(v => v.produs === '820023' && v.data === '2026-07-27');
t('SAMURAI: 300 buc InStore, brut 4.797', vSam.length === 1 && vSam[0].cant === 300 && aprox(vSam[0].brut, 4797, 0.5));
t('netul la TVA 11%', aprox(vSam[0].net, 4797 / 1.11, 0.05), vSam[0].net.toFixed(2));
t('locație agregată creată', r.stateNou.locatii.some(l => l.cod === 'AGREGAT'));
t('avertisment despre cele 5 zile', r.batch.avertismente.some(a => a.includes('5 zile') && a.includes('2026-07-27')));
t('avertisment despre agregarea pe restaurante', r.batch.avertismente.some(a => a.includes('agregat')));
t('avertisment despre liniile cu preț 0', r.batch.avertismente.some(a => a.includes('preț 0')));
t('avertisment despre cantitățile negative', r.batch.avertismente.some(a => a.includes('negativ')));
t('acoperirea pe denumiri raportată', r.batch.avertismente.some(a => a.includes('Acoperire pe denumiri')));
t('denumirile nemapate listate, ordonate după valoare', r.batch.avertismente.some(a => a.includes('AMERICAN CHEESEBURGER')));

console.log('— Alocarea manuală a unei denumiri (alias) —');
const r2 = importa('SALES_MIX', p, '4.7 Sales Mix 10002.xlsx', s0, undefined,
  { aliasuriNoi: { 'HOMESTYLE CHICKEN PESTO': '700970', 'Homestyle Chicken Pesto': '700970' } });
const vPesto = r2.stateNou.vanzari.filter(v => v.produs === '700970' && v.data === '2026-07-27');
t('cele două canale intră separat', vPesto.length === 2, vPesto.map(v => `${v.canal}:${v.cant}`).join(' '));
const dlv = vPesto.find(v => v.canal === 'DELIVERY')!;
t('Delivery agregă cele două prețuri: 201 buc, 8.028 lei', dlv.cant === 201 && aprox(dlv.brut, 8028, 0.5), `${dlv.cant} buc, ${dlv.brut} lei`);
t('aliasul e salvat pe produs', (r2.stateNou.produse.find(x => x.cod === '700970')!.aliasuri ?? []).length === 2);
// aliasul salvat funcționează la reimport, fără să-l mai dai
const r3 = importa('SALES_MIX', p, '4.7 Sales Mix.xlsx', r2.stateNou);
t('la reimport, aliasul salvat potrivește singur', r3.stateNou.vanzari.filter(v => v.produs === '700970' && v.data === '2026-07-27').length === 2);
t('reimportul nu dublează rândurile', r3.stateNou.vanzari.length === r2.stateNou.vanzari.length,
  `${r2.stateNou.vanzari.length} → ${r3.stateNou.vanzari.length}`);

console.log('— Analiza pe datele reale importate —');
const ctx = buildCtx(r2.stateNou);
const rows = perProdus(r2.stateNou.vanzari, ctx, { luna: '2026-07', locatie: 'AGREGAT', vedere: 'TOTAL' });
const pesto = rows.find(x => x.cod === '700970')!;
t('Chicken Pesto apare cu 705 bucăți', pesto.buc === 705, `${pesto.buc}`);
// cardul NBO nu are canal, deci cutia de livrare (0,974) se aplică și în sală:
// costul e 13,040 pe ambele canale, nu 12,177 în sală. De aici 48,3% în loc de 46,0%.
t('Food Cost ≈ 48,3% (cutia de livrare pe ambele canale)', aprox(pesto.fc!, 48.3, 0.3), `${pesto.fc!.toFixed(2)}%`);
t('profitul ≈ 9.845 lei', aprox(pesto.profit, 9845, 60), pesto.profit.toFixed(0));
t('importul NBO avertizează despre ambalajul fără canal',
  importa('RETETAR_NBO', { foaie: 'R', antete: [], randuri: [], matrice: [
    ['Product Name:', 'Chicken Pesto Burger', '', '', 'Product ID:', '700970'],
    ['POS Item Price:', '$0.00', 'Category:', 'BURGER*'], [],
    ['Item ID', 'Item Name', 'Qty', 'Units', 'Cost', 'Extension'],
    ['702321', '5 Inch Potato Roll', 1, 'EA', '$5.308', '$5.308'],
    ['702496', 'Cutie mare burger Chicken Pesto', 1, 'EA', '$0.974', '$0.974'],
  ] }, 'nbo.xlsx', s0).batch.avertismente.some(a => a.includes('ambele canale') && a.includes('Cutie')));
t('perioada raportată de lot', r2.batch.perioada === '2026-07' && luna('2026-07-27') === '2026-07');

console.log('— Ziua și locația alese manual —');
const r4 = importa('SALES_MIX', p, '4.7.xlsx', s0, undefined, { dataRaport: '2026-07-31', locatieRaport: 'L01' });
t('data aleasă e respectată', r4.stateNou.vanzari.some(v => v.data === '2026-07-31' && v.locatie === 'L01'));
t('nu se creează locație nouă', r4.stateNou.locatii.length === s0.locatii.length);

console.log('— Raport în format text (extras din PDF) —');
// particularitățile reale: denumire ruptă pe rânduri, sufixul apărând DUPĂ linia cu cifre,
// valoare tăiată la sfârșit de linie, valoare negativă în paranteze
const text = [
  'Multiple Selection 4.7 Sales Mix Fiscal Year: 2026',
  'Period: 7 Week: 5',
  '7/27/2026 - 7/31/2026',
  'Menu Item Name Qty Price Extension',
  'CATEGORY BURGER*',
  'DUBLU BLACK TRUFFLE SMASHED 3,397 28.000 $95,116.00',
  'new',
  'DUBLU BLACK TRUFFLE SMASHED 1,995 44.290 $88,358.55',
  'new D',
  'DUBLU SMASHED BURGER new D 2,552 43.570 $111,190.',
  '64',
  'TRIPLU RED PEPPER SMASHED new -1 38.000 ($38.00)',
  'Total BURGER* 7943 $294,627.19',
  'Total 7943 $294,627.19',
  'Groups/Stores Selected for this Report',
  'FRYDAY ALBA IULIA, FRYDAY ARAD ATRIUM, FRYDAY ORADEA',
  'V 21.1.126.0 - 1 - 8/3/2026 9:03 AM Copyright © NCR Corporation 2022 12 of 12',
].join('\n');
const smT = parseSalesMix(matriceDinText(text));
t('4 linii reconstruite din text', smT.linii.length === 4, `${smT.linii.length}`);
const q = smT.linii.reduce((s, l) => s + l.qty, 0), ex = smT.linii.reduce((s, l) => s + l.ext, 0);
t('totalul calculat = totalul declarat de raport', q === smT.totalQty && aprox(ex, smT.totalExt!, 0.01),
  `${q} vs ${smT.totalQty} · ${ex.toFixed(2)} vs ${smT.totalExt}`);
t('sufixul de pe rândul următor merge la produsul corect (nu la următorul)',
  smT.linii.filter(l => cheieDenumire(l.numeBaza) === 'dublu black truffle smashed').length === 2);
t('canalul din sufixul rupt e recunoscut',
  smT.linii.some(l => cheieDenumire(l.numeBaza) === 'dublu black truffle smashed' && l.canal === 'DELIVERY' && l.qty === 1995));
t('nicio denumire nu începe cu sufix', !smT.linii.some(l => /^(new|d|md)\b/i.test(l.numeBaza)));
t('valoarea tăiată pe două rânduri e reunită', smT.linii.some(l => aprox(l.ext, 111190.64, 0.01)));
t('valoarea negativă în paranteze e citită corect', smT.linii.some(l => l.qty === -1 && aprox(l.ext, -38, 0.01)));
t('restaurantele sunt extrase', smT.magazine.length === 3, smT.magazine.join(' | '));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
