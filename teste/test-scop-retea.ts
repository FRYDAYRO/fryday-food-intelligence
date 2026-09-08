/**
 * O regulă care trebuie să fie aceeași în TOATE adaptoarele NBO: eticheta prin care un raport
 * își declară scopul de rețea („Corporate", „All Stores", „Multiple Selection") stă exact acolo
 * unde ar sta numele unității — deci un parser care n-o cunoaște fabrică un restaurant numit
 * „Corporate" și îi pune pe el cifrele întregii companii.
 *
 * Reprodus pe 2.8 (07.09.2026): un raport consolidat intra ca `scop=RESTAURANT`, cu restaurantul
 * „Corporate". Vocabularul e acum unul singur, în `fc-domeniu`, iar identitatea verificată aici e:
 * „un antet care declară un scop nu produce niciodată un restaurant, în niciun adaptor".
 */
import { etichetaScopRetea, LOCATIE_RETEA } from '../src/lib/fc-domeniu';
import { parseRaport29, parsatDin29 } from '../src/lib/nbo-29';
import { parseRaport28, parsatDin28 } from '../src/lib/nbo-28';
import { parseRaport41, parsatDin41 } from '../src/lib/nbo-41';
import { matriceDinText, parseSalesMix } from '../src/lib/salesmix';
import { importaPrinCentru } from '../src/lib/import-center';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';
import type { Parsat } from '../src/lib/importer';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const ETICHETE = ['Corporate', 'All Stores', 'Multiple Selection'];
const RESTAURANTE = ['FRYDAY CLUJ MEMO', 'FRYDAY RM VALCEA DT', 'FRYDAY TIMISOARA IULIUS TOWN'];

console.log('— 1. Vocabularul comun —');
for (const e of ETICHETE) {
  t(`„${e}" e recunoscută ca etichetă de scop`, etichetaScopRetea(e) !== null, String(etichetaScopRetea(e)));
  t(`… și cu majuscule diferite`, etichetaScopRetea(e.toUpperCase()) !== null);
  t(`… și urmată de alt text`, etichetaScopRetea(`${e} Fiscal Year: 2026`) !== null);
}
for (const r of RESTAURANTE) t(`„${r}" NU e etichetă de scop`, etichetaScopRetea(r) === null);
t('un nume necunoscut rămâne nume, nu scop', etichetaScopRetea('FRYDAY NOU DESCHIS') === null);
t('textul gol nu e scop', etichetaScopRetea('') === null && etichetaScopRetea('   ') === null);
// „Corporation" nu e „Corporate": lista e explicită, nu o potrivire pe prefix liber
t('un cuvânt care doar începe la fel nu se confundă', etichetaScopRetea('Corporatex SRL') === null);

console.log('\n— 2. Raportul 2.9 —');
const R29 = (nume: string) => [
  `${nume} Fiscal Year: 2026`,
  '2.9 Food Cost - Inventory With Adjustments Summary - FIFO',
  'Period: 8',
  '01.08.2026 - 31.08.2026',
  'Food 11%',
  'Sos Cheddar BIB 4064 KG 1,00 2,00 0,00 0,00 1,00 11,27 lei 11,27 lei 5,0 2,00 2,00 0,00 22,54 lei 22,54 lei 0,00 lei 1,0% 1,0% 0,0%',
].join('\n');
for (const e of ETICHETE) {
  const r = parseRaport29(R29(e));
  t(`„${e}" ⇒ consolidat, fără restaurant`, r.agregat === true && r.restaurant === null, `agregat=${r.agregat} restaurant=${JSON.stringify(r.restaurant)}`);
  const p = parsatDin29(r);
  t(`… iar rândurile nu poartă niciun restaurant`, p.randuri.every(x => !x.Locatie));
}
{
  const r = parseRaport29(R29('FRYDAY CLUJ MEMO'));
  t('un restaurant real rămâne restaurant', r.agregat === false && r.restaurant === 'FRYDAY CLUJ MEMO');
  t('… și rândurile îl poartă', parsatDin29(r).randuri.every(x => x.Locatie === 'FRYDAY CLUJ MEMO'));
}

console.log('\n— 3. Raportul 2.8 —');
const R28 = (nume: string) => [
  `${nume} Fiscal Year: 2026`,
  '2.8 Spoilage and Loss',
  'Period: 8',
  '01.08.2026 - 31.08.2026',
  'Food 11%',
  'Sos Cheddar BIB 4064 End of Day alina KG 2,00 11,27 lei 22,54 lei',
  'Total: Food 11% 22,54 lei',
].join('\n');
for (const e of ETICHETE) {
  const r = parseRaport28(R28(e));
  t(`„${e}" ⇒ consolidat, fără restaurant`, r.agregat === true && r.restaurant === null, `agregat=${r.agregat} restaurant=${JSON.stringify(r.restaurant)}`);
  t('… evenimentele se citesc oricum', r.randuri.length === 1);
  t('… iar rândurile nu poartă niciun restaurant', parsatDin28(r).randuri.every(x => !x.Locatie));
}
{
  const r = parseRaport28(R28('FRYDAY CLUJ MEMO'));
  t('un restaurant real rămâne restaurant', r.agregat === false && r.restaurant === 'FRYDAY CLUJ MEMO');
  t('… și evenimentele îl poartă', parsatDin28(r).randuri.every(x => x.Locatie === 'FRYDAY CLUJ MEMO'));
}

console.log('\n— 4. Raportul 4.1 —');
const R41 = (antet: string[]) => [
  ...antet,
  '4.1 Sales Journal',
  'Sales Cash Reconciliation',
  'Net Sales 1.000,00 lei',
  'Sales by Location',
  'Dine In Net Sales 600,00 lei 10 60,00 lei',
  'Delivery Net Sales 400,00 lei 5 80,00 lei',
].join('\n');
for (const e of ETICHETE) {
  // forma cu „Start Date" era deja acoperită; cea cu „Fiscal Year" e cea care fabrica restaurantul
  const r = parseRaport41(R41([`${e} Fiscal Year: 2026`, 'Period: 8 Week: 4', '01.08.2026 - 07.08.2026']));
  t(`„${e} Fiscal Year" ⇒ rețea, fără restaurant`, r.agregat === true && r.restaurant === null, `agregat=${r.agregat} restaurant=${JSON.stringify(r.restaurant)}`);
  t('… iar rândurile intră pe locația rezervată a rețelei',
    parsatDin41(r).randuri.every(x => x.Locatie === LOCATIE_RETEA));
  const rs = parseRaport41(R41([`${e} Start Date: 01.08.2026`, 'End Date: 07.08.2026']));
  t(`„${e} Start Date" ⇒ tot rețea`, rs.agregat === true && rs.restaurant === null);
}
{
  const r = parseRaport41(R41(['FRYDAY TIMISOARA Fiscal Year: 2026', 'IULIUS TOWN Period: 8 Week: 4', '01.08.2026 - 07.08.2026']));
  t('un restaurant real, pe două rânduri, rămâne restaurant',
    r.agregat === false && r.restaurant === 'FRYDAY TIMISOARA IULIUS TOWN', String(r.restaurant));
  t('… și rândurile îl poartă', parsatDin41(r).randuri.every(x => x.Locatie === 'FRYDAY TIMISOARA IULIUS TOWN'));
}

console.log('\n— 5. Raportul 4.7 —');
const R47 = (nume: string) => [
  `${nume} Fiscal Year: 2026`,
  '4.7 Sales Mix',
  'Period: 8 Week: 4',
  '8/17/2026 - 8/23/2026',
  'Menu Item Name Qty Price Extension',
  'CATEGORY BERE',
  'Bere Corona new 1 15.990 $15.99',
  'Total BERE 1 $15.99',
  'Total 1 $15.99',
].join('\n');
for (const e of ETICHETE) {
  const sm = parseSalesMix(matriceDinText(R47(e)));
  t(`„${e}" ⇒ scop de rețea declarat`, sm.corporativ === true && sm.etichetaScop !== null, `eticheta=${sm.etichetaScop}`);
  t('… și niciun magazin fabricat din etichetă', !sm.magazine.some(m => etichetaScopRetea(m)), JSON.stringify(sm.magazine));
  t('… liniile se citesc oricum', sm.linii.length === 1);
}
{
  const sm = parseSalesMix(matriceDinText(R47('FRYDAY CLUJ MEMO')));
  t('un restaurant real e listat ca magazin, nu ca scop',
    sm.corporativ === false && sm.magazine.includes('FRYDAY CLUJ MEMO'), JSON.stringify(sm.magazine));
}

console.log('\n— 6. Prin poarta de import: cele trei scopuri ajung unde trebuie —');
// identitatea de aici e a stratului de import, nu a parserului: un raport care își declară
// scopul intră la nivel de COMPANIE (fără restaurante), unul de unitate la RESTAURANT
const BAZA: AppState = { ...stareGoala(), locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }] };
const ACUM = '2026-09-08T12:00:00.000Z';
const importa = (fisier: string, parsat: Parsat, tip: 'NBO_29' | 'NBO_28' | 'NBO_41', de: string, la: string) =>
  importaPrinCentru(BAZA, { fisier, parsat, tip, interval: { de, la }, acum: ACUM });

for (const [et, tip, face] of [
  ['2.9', 'NBO_29', (n: string) => parsatDin29(parseRaport29(R29(n)))],
  ['2.8', 'NBO_28', (n: string) => parsatDin28(parseRaport28(R28(n)))],
  ['4.1', 'NBO_41', (n: string) => parsatDin41(parseRaport41(R41([`${n} Fiscal Year: 2026`, 'Period: 8 Week: 4', '01.08.2026 - 31.08.2026'])))],
] as [string, 'NBO_29' | 'NBO_28' | 'NBO_41', (n: string) => Parsat][]) {
  const cRest = importa(`${et}-restaurant.pdf`, face('FRYDAY CLUJ MEMO'), tip, '2026-08-01', '2026-08-31');
  t(`${et} pe unitate ⇒ scop=RESTAURANT, pe L01`,
    cRest.rezultat?.scop === 'RESTAURANT' && cRest.rezultat?.restaurante.join() === 'L01',
    `${cRest.rezultat?.scop} ${JSON.stringify(cRest.rezultat?.restaurante)}`);
  for (const e of ETICHETE) {
    const c = importa(`${et}-${e}.pdf`, face(e), tip, '2026-08-01', '2026-08-31');
    t(`${et} „${e}" ⇒ scop=COMPANIE, fără restaurante`,
      c.rezultat?.scop === 'COMPANIE' && c.rezultat?.restaurante.length === 0,
      `${c.rezultat?.scop} ${JSON.stringify(c.rezultat?.restaurante)}`);
    // proba care contează pentru utilizator: eticheta nu s-a transformat într-o locație nouă
    t(`… și nu s-a creat o locație numită „${e}"`,
      !c.stareNoua.locatii.some(l => etichetaScopRetea(l.nume)),
      JSON.stringify(c.stareNoua.locatii.map(l => l.nume)));
  }
}

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
