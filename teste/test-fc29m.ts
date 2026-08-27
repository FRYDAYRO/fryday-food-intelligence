// Importul raportului 2.9 la nivel de MATERIAL (FC29_MATERIAL).
//
// Ce se verifică:
//  · detecția: fișierul 2.9 cu coloane de material → FC29_MATERIAL; fără ele → FC29 (ca înainte)
//  · ce lipsește în export rămâne null, nu zero
//  · lipsa restaurantului NU inventează o locație (BUG-4 nu se repetă aici)
//  · rollup-ul pe categorie: Σ materiale = linia 2.9 generată, cu înlocuire pe (perioadă × locație)
//  · reimportul înlocuiește, nu dublează
//  · lanțul întreg: import → nboFC → reconciliationMaterialFC, cu toate gălețile A–F atinse
import * as XLSX from 'xlsx';
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx } from '../src/lib/engine';
import { detecteazaTip, importa, mapeazaAntete, type Parsat } from '../src/lib/importer';
import { analizeazaFisier, tipDinNumeFisier } from '../src/lib/auto';
import { COMPANIE, perioadaDin, restaurant, type CerereFC } from '../src/lib/fc-domeniu';
import { nboFC } from '../src/lib/fc-core';
import { reconciliationMaterialFC, type GaleataBridge } from '../src/lib/fc-material';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const ANTETE = ['Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Categorie',
  'Cantitate', 'UM', 'Cost actual', 'Cost teoretic', 'Normalizat'];
const rand = (loc: string, cod: string, den: string, cat: string, costActual: string | number,
  extra: Record<string, unknown> = {}) => ({
  'Perioada': '2026-07', 'Locatie': loc, 'Cod material': cod, 'Denumire material': den,
  'Categorie': cat, 'Cantitate': '', 'UM': '', 'Cost actual': costActual, 'Cost teoretic': '', 'Normalizat': '',
  ...extra,
});

// ————————————————————————————————————————————————————————— detecție

console.log('— Detecție: antetul decide varianta, numele fișierului dă familia —');
t('2.9 + coloane de material → FC29_MATERIAL',
  detecteazaTip(ANTETE, 'NBO 2.9 iulie.xlsx') === 'FC29_MATERIAL');
t('2.9 pe categorie rămâne FC29 (regresie)',
  detecteazaTip(['Luna', 'Restaurant', 'Cont', 'Suma'], 'raport 2.9 iunie.xlsx') === 'FC29');
// fără semnalul „2.9" din nume, tipul NU se revendică — vocabularul lui se suprapune cu al
// inventarului, iar un inventar importat drept 2.9 ar transforma cantități în lei
t('fără semnalul 2.9 în nume, tipul nu se revendică (protecție anti-hijack)',
  detecteazaTip(ANTETE, 'export.xlsx') !== 'FC29_MATERIAL', detecteazaTip(ANTETE, 'export.xlsx'));
t('un inventar cu nume neutru NU e revendicat drept 2.9 pe material',
  detecteazaTip(['Cod', 'Denumire', 'Consum real', 'UM', 'Restaurant', 'Perioada'], 'export.xlsx') !== 'FC29_MATERIAL',
  detecteazaTip(['Cod', 'Denumire', 'Consum real', 'UM', 'Restaurant', 'Perioada'], 'export.xlsx'));
t('inventarul cu nume-semnal rămâne inventar',
  detecteazaTip(['Cod', 'Denumire', 'Consum real', 'UM', 'Restaurant', 'Perioada'], 'inventar iulie.xlsx') === 'INVENTAR');
t('tipDinNumeFisier: „2.9 materiale" → FC29_MATERIAL',
  tipDinNumeFisier('NBO 2.9 materiale iulie.xlsx') === 'FC29_MATERIAL');
t('tipDinNumeFisier: „2.9" simplu → FC29', tipDinNumeFisier('raport 2.9 iunie.xlsx') === 'FC29');

// un tabel generic „cod + denumire + sumă" (o listă de prețuri, de pildă) NU e revendicat:
// „Suma"/„Valoare" nu sunt sinonime de cost actual — doar vocabularul specific consumului este
t('o listă de prețuri nu e revendicată drept 2.9 pe material',
  mapeazaAntete(['Poz', 'Referinta', 'Text', 'Masura', 'Suma'], 'FC29_MATERIAL').costActual === undefined);

const map = mapeazaAntete(ANTETE, 'FC29_MATERIAL');
t('maparea coloanelor: material', map.material === 'Cod material');
t('maparea coloanelor: denumire', map.denumire === 'Denumire material');
t('maparea coloanelor: cost actual ≠ cost teoretic',
  map.costActual === 'Cost actual' && map.costTeoretic === 'Cost teoretic');
t('maparea coloanelor: cantitate, UM, normalizat',
  map.cant === 'Cantitate' && map.um === 'UM' && map.normalizat === 'Normalizat');
t('maparea coloanelor: perioadă și locație', map.perioada === 'Perioada' && map.locatie === 'Locatie');

// ————————————————————————————————————————————————————————— importul

console.log('\n— Import: fiecare câmp ajunge unde trebuie, ce lipsește rămâne null —');
const s0 = genereazaSeed();
const P: Parsat = {
  foaie: '2.9', antete: ANTETE,
  randuri: [
    rand('L01', 'I001', 'Piept de pui', 'Carne și pui', '4.000,50',
      { 'Cantitate': '280', 'UM': 'KG', 'Cost teoretic': '3.800,00' }),
    rand('L01', 'A001', 'Hârtie ambalaj burger', 'Ambalaje', 500),
    rand('L01', 'NORM-1', 'Pui porționat intern', 'Carne și pui', 600, { 'Normalizat': 'DA' }),
    rand('L01', 'CUR-1', 'Detergent podea', 'Materiale curățenie', 180),
    rand('L01', 'X-1', 'Ceva exotic', 'Transport marfă', 400),
    rand('L01', 'MAT-X', 'Material fantomă', 'Carne și pui', 900),
    rand('', 'I005', 'Chiflă burger', 'Panificație', 90),                       // fără restaurant
    rand('FRYDAY Gara', 'I011', 'Salată iceberg', 'Legume și sosuri', 300),     // restaurant nou
    rand('L01', 'TOTAL', '', '', 6970),                                          // rând de total → ignorat
    { ...rand('L01', 'I013', 'Cașcaval felii', 'Lactate'  as string, 55), 'Perioada': '' },  // fără perioadă → ignorat
  ],
};
const { stateNou: s1, batch: b1 } = importa('FC29_MATERIAL', P, 'NBO 2.9 iulie.xlsx', s0);

t('batch IMPORTAT', b1.status === 'IMPORTAT', b1.erori.join(' | '));
t('8 linii importate (totalul și rândul fără perioadă sunt ignorate)', b1.importate === 8, `${b1.importate}`);
t('perioada lotului e luna importată', b1.perioada === '2026-07');
t('starea reală nu e atinsă (imutabilitate)', (s0.materiale29 ?? []).length === 0);

const m29 = s1.materiale29;
t('materiale29 are cele 8 linii', m29.length === 8, `${m29.length}`);
const i001 = m29.find(m => m.material === 'I001')!;
t('numărul RO e parsat: 4.000,50 → 4000.5', i001.costActual === 4000.5);
t('costul teoretic declarat e păstrat', i001.costTeoretic === 3800);
t('cantitatea și UM sunt parsate (KG → kg)', i001.cant === 280 && i001.um === 'kg');
t('categoria brută se păstrează ca atare', i001.categorie === 'Carne și pui');
const a001 = m29.find(m => m.material === 'A001')!;
t('ce lipsește rămâne null, nu zero',
  a001.cant === null && a001.um === null && a001.costTeoretic === null);
t('normalizat: DA → true', m29.find(m => m.material === 'NORM-1')!.normalizat === true);
t('normalizat: absent → falsy', !i001.normalizat);
t('rândul de TOTAL nu a intrat', !m29.some(m => m.material === 'TOTAL'));
t('rândul fără perioadă nu a intrat, cu avertisment',
  !m29.some(m => m.material === 'I013') && b1.avertismente.some(a => a.includes('fără perioadă')));

console.log('\n— Locația: nimic nu se inventează —');
t('linia fără restaurant are locatie null, NU o locație fantomă',
  m29.find(m => m.material === 'I005')!.locatie === null);
t('avertisment pentru liniile fără restaurant', b1.avertismente.some(a => a.includes('fără restaurant')));
t('restaurantul nou din fișier e creat în nomenclator',
  s1.locatii.some(l => l.cod === 'FRYDAY Gara') && !s0.locatii.some(l => l.cod === 'FRYDAY Gara'));
t('L01 e recunoscut, nu duplicat', s1.locatii.filter(l => l.cod === 'L01').length === 1);

console.log('\n— Rollup pe categorie: Σ materiale = linia 2.9 generată —');
const l29 = (loc: string, cat: string) =>
  s1.linii29.find(l => l.perioada === '2026-07' && l.locatie === loc && l.categorie === cat);
t('Carne și pui @L01 = 4000.50 + 600 + 900', aprox(l29('L01', 'Carne și pui')!.valoare, 5500.5));
t('Ambalaje @L01 = 500', aprox(l29('L01', 'Ambalaje')!.valoare, 500));
t('Materiale curățenie @L01 = 180', aprox(l29('L01', 'Materiale curățenie')!.valoare, 180));
t('categoria necunoscută intră în rollup cu numele ei brut', aprox(l29('L01', 'Transport marfă')!.valoare, 400));
t('restaurantul nou are propriul rollup', aprox(l29('FRYDAY Gara', 'Legume și sosuri')!.valoare, 300));
t('linia fără restaurant NU intră în rollup (Linie29 cere locația)',
  !s1.linii29.some(l => l.categorie === 'Panificație' && l.perioada === '2026-07' && l.locatie === 'L01'));
const rollupL01 = s1.linii29.filter(l => l.perioada === '2026-07' && l.locatie === 'L01');
t('rollup-ul ÎNLOCUIEȘTE vechile linii 2.9 ale perechii (perioadă × locație)',
  rollupL01.length === 4 && !rollupL01.some(l => l.categorie === 'Uniforme personal'),
  rollupL01.map(l => l.categorie).join(' | '));
t('Σ rollup L01 = Σ materiale cu locația L01',
  aprox(rollupL01.reduce((s, l) => s + l.valoare, 0),
        m29.filter(m => m.locatie === 'L01').reduce((s, m) => s + m.costActual, 0)));
t('L02 din seed rămâne neatins (altă locație, aceeași lună)',
  s1.linii29.filter(l => l.perioada === '2026-07' && l.locatie === 'L02').length
  === s0.linii29.filter(l => l.perioada === '2026-07' && l.locatie === 'L02').length);
t('iunie din seed rămâne neatins (altă lună)',
  s1.linii29.filter(l => l.perioada === '2026-06').length === s0.linii29.filter(l => l.perioada === '2026-06').length);
t('avertismentul spune că rollup-ul a fost generat', b1.avertismente.some(a => a.includes('Rollup')));

console.log('\n— Avertismente oneste —');
t('categoriile nerecunoscute sunt numite, nu presupuse Food',
  b1.avertismente.some(a => a.includes('Transport marfă') && a.includes('NU au fost presupuse Food')));
t('materialele fără corespondent în nomenclator sunt numite',
  b1.avertismente.some(a => a.includes('Material fantomă')));
t('teoreticul parțial e semnalat', b1.avertismente.some(a => a.includes('1 din 8')));

console.log('\n— Reimportul înlocuiește, nu dublează —');
const { stateNou: s2 } = importa('FC29_MATERIAL', P, 'NBO 2.9 iulie.xlsx', s1);
t('a doua rulare: același număr de materiale', s2.materiale29.length === 8, `${s2.materiale29.length}`);
t('a doua rulare: același număr de linii 2.9 pe iulie',
  s2.linii29.filter(l => l.perioada === '2026-07').length === s1.linii29.filter(l => l.perioada === '2026-07').length);
const PIunie: Parsat = {
  foaie: '2.9', antete: ANTETE,
  randuri: [{ ...rand('L01', 'I001', 'Piept de pui', 'Carne și pui', 3200), 'Perioada': '2026-06' }],
};
const { stateNou: s3 } = importa('FC29_MATERIAL', PIunie, 'NBO 2.9 iunie.xlsx', s2);
t('altă lună se ADAUGĂ, nu înlocuiește', s3.materiale29.length === 9,
  `${s3.materiale29.length} · iulie=${s3.materiale29.filter(m => m.perioada === '2026-07').length}`);
t('iulie rămâne intact după importul lui iunie',
  s3.materiale29.filter(m => m.perioada === '2026-07').length === 8);

console.log('\n— Perioada din opțiuni, când fișierul nu are coloană —');
const ANTETE_FARA_P = ANTETE.filter(a => a !== 'Perioada');
const PFara: Parsat = {
  foaie: '2.9', antete: ANTETE_FARA_P,
  randuri: [(() => { const r = rand('L01', 'I001', 'Piept de pui', 'Carne și pui', 100) as Record<string, unknown>; delete r['Perioada']; return r; })()],
};
const { stateNou: sFara, batch: bFara } = importa('FC29_MATERIAL', PFara, '2.9.xlsx', genereazaSeed(), undefined, { dataValabil: '2026-06-15' });
t('dataValabil dă perioada implicită', sFara.materiale29[0]?.perioada === '2026-06' && bFara.perioada === '2026-06');
const { batch: bFaraTot } = importa('FC29_MATERIAL', PFara, '2.9.xlsx', genereazaSeed());
t('fără coloană și fără opțiune: rândurile sunt ignorate cu avertisment, nu datate din senin',
  bFaraTot.importate === 0 && bFaraTot.avertismente.some(a => a.includes('fără perioadă')));

console.log('\n— Coloane lipsă: eșec zgomotos, starea neatinsă —');
const PRupt: Parsat = { foaie: '2.9', antete: ['Cod material', 'Denumire material'], randuri: [] };
const sCurat = genereazaSeed();
const { stateNou: sRupt, batch: bRupt } = importa('FC29_MATERIAL', PRupt, '2.9.xlsx', sCurat);
t('status ESUAT cu eroarea pe coloane', bRupt.status === 'ESUAT' && bRupt.erori[0].includes('costActual'));
t('starea rămâne neatinsă la eșec',
  sRupt.materiale29.length === 0 && sRupt.linii29.length === sCurat.linii29.length);

// ————————————————————————————————————————————————————————— lanțul întreg

console.log('\n— Lanțul întreg: import → nboFC → puntea pe material —');
const cerL01: CerereFC = { perioada: perioadaDin('2026-07-15', 'LUNA'), nivel: restaurant('L01'), canal: 'TOTAL' };
const nbo = nboFC(s1, cerL01);
t('nboFC e disponibil pe rollup-ul generat', nbo.disponibil);
t('consumul total 2.9 = Σ materiale L01', aprox(nbo.consumTotal, 4000.5 + 500 + 600 + 180 + 400 + 900));

const rec = reconciliationMaterialFC(s1, buildCtx(s1), cerL01);
const g = (x: GaleataBridge) => rec.bridge.find(b => b.galeata === x)!;
t('puntea pe material e disponibilă după import', rec.disponibil);
t('A · Food din rețete = I001', aprox(g('RECIPE_FOOD').lei, 4000.5), `${g('RECIPE_FOOD').lei}`);
t('B · Paper din rețete = A001', aprox(g('RECIPE_PAPER').lei, 500));
t('C · normalizate = NORM-1', aprox(g('NORMALIZED_PAPER').lei, 600));
t('D · operațional = detergentul', aprox(g('OPERATIONAL').lei, 180));
t('E · neclasificat = categoria necunoscută', aprox(g('UNCLASSIFIED').lei, 400));
t('F · neexplicat = materialul fantomă', aprox(g('UNEXPLAINED').lei, 900));
t('Σ găleți = totalul importat pe L01', aprox(rec.bridge.reduce((s, b) => s + b.lei, 0), rec.nboActual));
t('variance-ul lui I001 vine din teoreticul declarat', aprox(rec.randuri.find(r => r.material === 'I001')!.variance!, 200.5));

const comp = reconciliationMaterialFC(s1, buildCtx(s1), { ...cerL01, nivel: COMPANIE });
t('compania vede și liniile fără restaurant, și restaurantul nou',
  comp.randuri.length === 8 && aprox(comp.nboActual, 6970.5), `${comp.randuri.length} · ${comp.nboActual}`);
t('compania semnalează liniile fără restaurant',
  comp.diagnostice.some(d => d.cod === 'LIPSA_LOCATIE' && d.nrElemente === 1));

// ————————————————————————————————————————————————————————— corecțiile din review

console.log('\n— O celulă de perioadă goală NU șterge altă lună (dataValabil doar fără coloană) —');
const ANTETE_MIN = ['Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Categorie', 'Cost actual'];
const rMin = (per: string, loc: string, cod: string, cost: number) =>
  ({ 'Perioada': per, 'Locatie': loc, 'Cod material': cod, 'Denumire material': cod, 'Categorie': 'Carne și pui', 'Cost actual': cost });
const PAug: Parsat = { foaie: 'x', antete: ANTETE_MIN, randuri: Array.from({ length: 5 }, (_, i) => rMin('2026-08', 'L01', `M${i}`, 100)) };
const sAug = importa('FC29_MATERIAL', PAug, '2.9 august.xlsx', genereazaSeed()).stateNou;
const PIulGol: Parsat = { foaie: 'x', antete: ANTETE_MIN, randuri: [rMin('2026-07', 'L01', 'IUL1', 300), rMin('', 'L01', 'RATACIT', 250)] };
const { stateNou: sEfix, batch: bEfix } = importa('FC29_MATERIAL', PIulGol, '2.9 iulie.xlsx', sAug, undefined, { dataValabil: '2026-08-15' });
t('rândul cu perioada goală e IGNORAT, nu re-datat pe dataValabil',
  !sEfix.materiale29.some(m => m.material === 'RATACIT'));
t('luna august rămâne intactă (nu e ștearsă de cheia rândului rătăcit)',
  sEfix.materiale29.filter(m => m.perioada === '2026-08').length === 5,
  `${sEfix.materiale29.filter(m => m.perioada === '2026-08').length}/5`);
t('avertismentul de perioadă lipsă apare', bEfix.avertismente.some(a => a.includes('fără perioadă')));
t('iulie a intrat normal', sEfix.materiale29.some(m => m.material === 'IUL1' && m.perioada === '2026-07'));

console.log('\n— Importul pe categorie elimină detaliul pe material al perechii înlocuite —');
const PAugMix: Parsat = { foaie: 'x', antete: ANTETE_MIN,
  randuri: [...Array.from({ length: 5 }, (_, i) => rMin('2026-08', 'L01', `M${i}`, 100)), rMin('2026-08', '', 'FARA-LOC-G', 70)] };
const sG1 = importa('FC29_MATERIAL', PAugMix, '2.9 august.xlsx', genereazaSeed()).stateNou;
const PCat: Parsat = { foaie: 'x', antete: ['Perioada', 'Locatie', 'Categorie', 'Valoare'],
  randuri: [{ 'Perioada': '2026-08', 'Locatie': 'L01', 'Categorie': 'Carne și pui', 'Valoare': 999 }] };
const { stateNou: sG2, batch: bG2 } = importa('FC29', PCat, 'raport 2.9.xlsx', sG1);
t('detaliul pe material al perechii (2026-08 × L01) e eliminat',
  !sG2.materiale29.some(m => m.perioada === '2026-08' && m.locatie === 'L01'),
  `rămase: ${sG2.materiale29.filter(m => m.perioada === '2026-08' && m.locatie === 'L01').length}`);
t('eliminarea e anunțată, nu tăcută', bG2.avertismente.some(a => a.includes('detaliu pe material')));
t('linia fără restaurant supraviețuiește (perechile pe categorie au mereu locație)',
  sG2.materiale29.some(m => m.material === 'FARA-LOC-G'));
t('rollup-ul pe categorie e cel nou', sG2.linii29.filter(l => l.perioada === '2026-08' && l.locatie === 'L01').length === 1
  && sG2.linii29.find(l => l.perioada === '2026-08' && l.locatie === 'L01')!.valoare === 999);

console.log('\n— Granularitate mixtă: semnalată la import —');
t('fixtura principală (are și linii fără restaurant) primește avertismentul',
  b1.avertismente.some(a => a.includes('atât linii pe restaurant')));

console.log('\n— Coloane absente: totul rămâne null, nimic nu crapă —');
const ANTETE_SCURT = ['Cod material', 'Denumire material', 'Categorie', 'Cost actual'];
const PScurt: Parsat = { foaie: 'x', antete: ANTETE_SCURT,
  randuri: [{ 'Cod material': 'I001', 'Denumire material': 'Piept de pui', 'Categorie': 'Carne și pui', 'Cost actual': 120 }] };
const sScurt = importa('FC29_MATERIAL', PScurt, '2.9.xlsx', genereazaSeed(), undefined, { dataValabil: '2026-07-01' }).stateNou;
const mScurt = sScurt.materiale29[0];
t('fără coloanele opționale: cant/um/teoretic null, normalizat falsy, locație null',
  mScurt.cant === null && mScurt.um === null && mScurt.costTeoretic === null && !mScurt.normalizat && mScurt.locatie === null);

console.log('\n— Rândurile fără cost: ignorate agregat, zero rămâne valoare legitimă —');
const PFlood: Parsat = { foaie: 'x', antete: ANTETE_MIN,
  randuri: [
    ...Array.from({ length: 45 }, (_, i) => rMin('2026-07', 'L01', `GOL${i}`, '' as unknown as number)),
    rMin('2026-07', 'L01', 'ZERO', 0),
    rMin('2026-07', 'L01', 'NECUNOSCUT-CAT', 100),
  ].map((r, i) => (i === 46 ? { ...r, 'Categorie': 'Transport marfă' } : r)) };
const { stateNou: sFlood, batch: bFlood } = importa('FC29_MATERIAL', PFlood, '2.9 iulie.xlsx', genereazaSeed());
t('rândurile fără cost sunt ignorate', sFlood.materiale29.length === 2, `${sFlood.materiale29.length}`);
t('cost 0 declarat e importat ca 0, nu ignorat', sFlood.materiale29.some(m => m.material === 'ZERO' && m.costActual === 0));
t('avertisment AGREGAT pentru fără-cost, nu 45 de rânduri',
  bFlood.avertismente.filter(a => a.includes('fără cost')).length === 1
  && bFlood.avertismente.some(a => a.includes('45 rânduri fără cost')));
t('rezumatul onest supraviețuiește plafonului de 40 (rollup + categorii necunoscute)',
  bFlood.avertismente.some(a => a.includes('Rollup')) && bFlood.avertismente.some(a => a.includes('nicio regulă')),
  `${bFlood.avertismente.length} avertismente`);

console.log('\n— Divergența documentată: rollup-ul pe categorie urmează clasificatorul VECHI —');
// R-6 din audit: clasificatorul pe categorie (linii29 → nboFC) pică implicit pe FOOD pentru
// categoriile fără regulă — comportament pre-existent, păstrat intenționat. Puntea pe material
// este calea onestă: aceeași categorie rămâne UNCLASSIFIED acolo. Testul PINEAZĂ divergența
// ca fapt documentat, iar avertismentul de import o spune explicit.
t('avertismentul spune explicit că rollup-ul urmează regulile existente',
  b1.avertismente.some(a => a.includes('NU au fost presupuse Food') && a.includes('rollup')));
t('puntea pe material ține categoria necunoscută separat (E), nu în Food',
  reconciliationMaterialFC(s1, buildCtx(s1), cerL01).bridge.find(b => b.galeata === 'UNCLASSIFIED')!.lei === 400);

// ————————————————————————————————————————————————————————— calea automată (fișier real)

function fals(nume: string, foi: Record<string, unknown[][]>): File {
  const wb = XLSX.utils.book_new();
  for (const [n, m] of Object.entries(foi)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(m), n);
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return { name: nume, arrayBuffer: async () => buf } as unknown as File;
}

async function caleaAutomata() {
  console.log('\n— Calea automată: analizeazaFisier pe fișiere reale —');
  const foaieMat: unknown[][] = [
    ['Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Categorie', 'Cost actual', 'Cost teoretic'],
    ['2026-07', 'L01', 'I001', 'Piept de pui', 'Carne și pui', 4000.5, 3800],
    ['2026-07', 'L01', 'A001', 'Hârtie ambalaj burger', 'Ambalaje', 500, 480],
  ];
  const a1 = await analizeazaFisier(fals('NBO 2.9 iulie.xlsx', { 'Materiale': foaieMat }));
  t('fișier 2.9 cu coloane de material → FC29_MATERIAL', a1[0].tip === 'FC29_MATERIAL', String(a1[0].tip));
  t('costul actual e mapat pe nume, nu dedus', a1[0].mapare.costActual === 'Cost actual' && !a1[0].dinContinut.includes('costActual'));

  const a2 = await analizeazaFisier(fals('export.xlsx', { 'Sheet1': foaieMat }));
  t('același conținut fără semnalul 2.9 în nume → NU e revendicat', a2[0].tip !== 'FC29_MATERIAL', String(a2[0].tip));

  const foaieInv: unknown[][] = [
    ['Cod', 'Denumire', 'Consum real', 'UM', 'Locatie', 'Perioada'],
    ['I001', 'Piept de pui', 280, 'kg', 'L01', '2026-07'],
    ['I005', 'Chiflă burger', 1500, 'buc', 'L01', '2026-07'],
  ];
  const a3 = await analizeazaFisier(fals('inventar 29.06 L01.xlsx', { 'Inventar': foaieInv }));
  t('inventarul cu „29" dintr-o dată în nume NU devine 2.9 pe material', a3[0].tip !== 'FC29_MATERIAL', String(a3[0].tip));
  t('inventarul e recunoscut ca inventar', a3[0].tip === 'INVENTAR', String(a3[0].tip));

  const foaiePret: unknown[][] = [
    ['Cod', 'Denumire', 'Pret'],
    ['I001', 'Piept de pui', 14.5],
    ['I005', 'Chiflă burger', 0.8],
  ];
  const a4 = await analizeazaFisier(fals('lista preturi 2.9.2026.xlsx', { 'Preturi': foaiePret }));
  t('o listă de prețuri cu o dată „2.9" în nume NU e revendicată (costul nu e coloană numită)',
    a4[0].tip !== 'FC29_MATERIAL', String(a4[0].tip));

  t('regresie: „recipe cards NBO" rămâne rețetar NBO', tipDinNumeFisier('recipe cards NBO.xlsx') === 'RETETAR_NBO');
  t('regresie: „pmix 2.9.2026" rămâne PMIX (pmix bate data)', tipDinNumeFisier('pmix 2.9.2026.xlsx') === 'PMIX');
}

caleaAutomata().then(() => {
  console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
  if (fail) process.exit(1);
});
