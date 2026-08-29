// Vocabularul domeniului FC: perioadă, canal, nivel, componentă.
// Se verifică identități structurale, nu valori fixate: fiecare zi aparține exact unei
// perioade, suma perioadelor acoperă exact intervalul, iar tăierea la marginea lunii
// este declarată, nu ascunsă.
import {
  COMPANIE, COMPONENTE_FC, ETICHETA_COMPONENTA, canalePentru, componentaDin29, contineData,
  eLunaIntreaga, etichetaCanal, etichetaNivel, intraInFC, locatieDin, luniAtinse, marginiLuna,
  perioadaAnterioara, perioadaDin, perioadeDinLuna, perioadeIntre, restaurant,
  type FCComponent, type FCPeriodType,
} from '../src/lib/fc-domeniu';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const ziSapt = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();   // 1 = luni

// ————————————————————————————————————————————————————————— marginile lunii

console.log('— Marginile lunii —');
t('iulie 2026: 01 → 31', marginiLuna('2026-07').de === '2026-07-01' && marginiLuna('2026-07').la === '2026-07-31');
t('februarie 2026 (an nebisect): 28 zile', marginiLuna('2026-02').la === '2026-02-28');
t('februarie 2028 (an bisect): 29 zile', marginiLuna('2028-02').la === '2028-02-29');
t('decembrie nu trece în anul următor', marginiLuna('2026-12').la === '2026-12-31');

// ————————————————————————————————————————————————————————— perioada

console.log('\n— Perioada: interval explicit, nu doar o cheie —');
const zi = perioadaDin('2026-07-15', 'ZI');
t('ZI: o singură zi', zi.cheie === '2026-07-15' && zi.de === zi.la && zi.zile === 1);
const luna = perioadaDin('2026-07-15', 'LUNA');
t('LUNA: cheia e AAAA-LL, intervalul e luna întreagă',
  luna.cheie === '2026-07' && luna.de === '2026-07-01' && luna.la === '2026-07-31' && luna.zile === 31);
const sapt = perioadaDin('2026-07-15', 'SAPTAMANA');
t('SAPTAMANA: cheia e ISO', sapt.cheie === '2026-S29', sapt.cheie);
t('SAPTAMANA: începe luni', ziSapt(sapt.de) === 1, `${sapt.de} (zi ${ziSapt(sapt.de)})`);
t('SAPTAMANA: 7 zile, de luni până duminică', sapt.zile === 7 && ziSapt(sapt.la) === 0, `${sapt.de} → ${sapt.la}`);
t('nicio perioadă naturală nu e parțială', !zi.partiala && !luna.partiala && !sapt.partiala);

console.log('\n— Fiecare zi aparține exact unei perioade —');
for (const tip of ['ZI', 'SAPTAMANA', 'LUNA'] as FCPeriodType[]) {
  const p = perioadaDin('2026-07-15', tip);
  t(`${tip}: conține data de referință`, contineData(p, '2026-07-15'));
  const inainte = new Date(new Date(`${p.de}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
  const dupa = new Date(new Date(`${p.la}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
  t(`${tip}: exclude ziua dinaintea și de după interval`, !contineData(p, inainte) && !contineData(p, dupa),
    `${inainte} ∉ [${p.de}, ${p.la}] ∌ ${dupa}`);
  t(`${tip}: marginile sunt incluse`, contineData(p, p.de) && contineData(p, p.la));
}

// ————————————————————————————————————————————————————————— acoperirea intervalului

console.log('\n— Suma perioadelor acoperă exact intervalul —');
const acopera = (tip: FCPeriodType, lunaTest: string) => {
  const { de, la } = marginiLuna(lunaTest);
  const p = perioadeIntre(de, la, tip);
  const zile = p.reduce((s, x) => s + x.zile, 0);
  const total = perioadaDin(`${lunaTest}-01`, 'LUNA').zile;
  // fiecare zi a lunii apare o singură dată
  const vazute = new Set<string>();
  let dubluri = 0;
  for (const x of p) {
    for (let d = x.de; d <= x.la; d = new Date(new Date(`${d}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10)) {
      if (vazute.has(d)) dubluri++;
      vazute.add(d);
    }
  }
  return { p, zile, total, dubluri, distincte: vazute.size };
};
for (const lunaTest of ['2026-07', '2026-02', '2026-12', '2027-01']) {
  for (const tip of ['ZI', 'SAPTAMANA'] as FCPeriodType[]) {
    const a = acopera(tip, lunaTest);
    t(`${lunaTest} ${tip}: Σ zile = zilele lunii`, a.zile === a.total, `${a.zile}/${a.total} în ${a.p.length} perioade`);
    t(`${lunaTest} ${tip}: fără suprapuneri, fără găuri`, a.dubluri === 0 && a.distincte === a.total);
  }
}

console.log('\n— Săptămânile tăiate la marginea lunii sunt declarate —');
const sapt7 = perioadeDinLuna('2026-07', 'SAPTAMANA');
t('iulie 2026 are săptămâni parțiale la capete', sapt7.some(s => s.partiala),
  sapt7.map(s => `${s.cheie}:${s.zile}z${s.partiala ? '*' : ''}`).join(' '));
t('doar capetele pot fi parțiale',
  sapt7.slice(1, -1).every(s => !s.partiala && s.zile === 7));
t('o săptămână parțială are mai puțin de 7 zile',
  sapt7.filter(s => s.partiala).every(s => s.zile < 7));
t('zilele nu sunt niciodată parțiale', perioadeDinLuna('2026-07', 'ZI').every(z => !z.partiala && z.zile === 1));

console.log('\n— Trecerea dintre ani —');
const capAn = perioadeIntre('2026-12-28', '2027-01-03', 'SAPTAMANA');
t('o săptămână care traversează anul rămâne o singură perioadă', capAn.length === 1,
  capAn.map(s => `${s.cheie} ${s.de}→${s.la}`).join(' '));
t('cheia ISO a săptămânii de peste an e stabilă', capAn[0].cheie === perioadaDin('2027-01-01', 'SAPTAMANA').cheie,
  `${capAn[0].cheie} vs ${perioadaDin('2027-01-01', 'SAPTAMANA').cheie}`);
t('toate lunile atinse sunt raportate', luniAtinse(capAn[0]).join(',') === '2026-12,2027-01',
  luniAtinse(capAn[0]).join(','));

// ————————————————————————————————————————————————————————— perioada anterioară

console.log('\n— Perioada anterioară —');
t('luna anterioară lui ianuarie e decembrie anul trecut',
  perioadaAnterioara(perioadaDin('2027-01-15', 'LUNA')).cheie === '2026-12');
t('luna anterioară lui iulie e iunie', perioadaAnterioara(luna).cheie === '2026-06');
t('săptămâna anterioară e cu 7 zile în urmă',
  perioadaAnterioara(sapt).la === new Date(new Date(`${sapt.de}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10));
t('ziua anterioară e ziua dinainte', perioadaAnterioara(zi).cheie === '2026-07-14');

// ————————————————————————————————————————————————————————— 2.9 e lunar

console.log('\n— Doar lunile întregi pot fi comparate cu raportul 2.9 —');
t('luna întreagă: da', eLunaIntreaga(luna));
t('săptămână: nu', !eLunaIntreaga(sapt));
t('zi: nu', !eLunaIntreaga(zi));
t('un interval de două luni întregi: da', eLunaIntreaga(perioadeIntre('2026-06-01', '2026-07-31', 'LUNA')[0]));

// ————————————————————————————————————————————————————————— canal

console.log('\n— Canalul: Total = InStore + Delivery —');
t('TOTAL acoperă ambele canale', canalePentru('TOTAL').join(',') === 'INSTORE,DELIVERY');
t('INSTORE acoperă doar InStore', canalePentru('INSTORE').join(',') === 'INSTORE');
t('DELIVERY acoperă doar Delivery', canalePentru('DELIVERY').join(',') === 'DELIVERY');
t('etichetele sunt cele din interfață',
  etichetaCanal('INSTORE') === 'InStore' && etichetaCanal('DELIVERY') === 'Delivery' && etichetaCanal('TOTAL') === 'Total');

// ————————————————————————————————————————————————————————— nivel

console.log('\n— Nivelul: restaurant vs companie —');
t('compania nu filtrează pe locație', locatieDin(COMPANIE) === undefined);
t('restaurantul filtrează pe codul lui', locatieDin(restaurant('L01')) === 'L01');
t('eticheta de companie e explicită', etichetaNivel(COMPANIE).includes('rețea'));
t('eticheta de restaurant e codul', etichetaNivel(restaurant('L02')) === 'L02');

// ————————————————————————————————————————————————————————— componenta

console.log('\n— Componenta de cost —');
t('FOOD din 2.9 → FOOD', componentaDin29('FOOD') === 'FOOD');
t('PAPER din 2.9 → PAPER', componentaDin29('PAPER') === 'PAPER');
t('EXCLUS din 2.9 → OPERATIONAL (nu „exclus", ci consum operațional)',
  componentaDin29('EXCLUS') === 'OPERATIONAL');
t('Food Cost = Food + Paper + Normalized + Unexplained',
  COMPONENTE_FC.join(',') === 'FOOD,PAPER,NORMALIZED,UNEXPLAINED');
t('operaționalul NU intră în Food Cost', !intraInFC('OPERATIONAL'));
t('toate celelalte componente intră în Food Cost',
  (['FOOD', 'PAPER', 'NORMALIZED', 'UNEXPLAINED'] as FCComponent[]).every(intraInFC));
t('fiecare componentă are etichetă în română',
  (['FOOD', 'PAPER', 'OPERATIONAL', 'NORMALIZED', 'UNEXPLAINED'] as FCComponent[])
    .every(c => (ETICHETA_COMPONENTA[c] ?? '').length > 0));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
