import { stareGoala, genereazaSeed } from '../src/lib/seed';
import { areDateDemo, reconciliaza } from '../src/lib/reconciliere';
import { importa, type Parsat } from '../src/lib/importer';
import { buildCtx, perProdus } from '../src/lib/engine';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

console.log('— Detectarea datelor demo —');
const demo = genereazaSeed();
const d1 = areDateDemo(demo);
t('datele demo sunt detectate', d1.demo && d1.produse === 8 && d1.vanzari > 1000, `${d1.produse} produse, ${d1.vanzari} rânduri`);
const gol = stareGoala();
t('starea goală nu e detectată ca demo', !areDateDemo(gol).demo);

console.log('— Starea goală —');
t('fără produse, rețete, ingrediente, vânzări', gol.produse.length === 0 && gol.retete.length === 0
  && gol.ingrediente.length === 0 && gol.vanzari.length === 0 && gol.linii29.length === 0);
t('fără locații (se creează din PMIX)', gol.locatii.length === 0);
t('fără istoric de importuri', gol.importuri.length === 0);
t('păstrează TVA 11%', gol.setari.tvaImplicit === 11);
t('păstrează regulile de clasificare și ținta', gol.reguli.length > 0 && gol.tinte.length > 0);
t('țintele FRYDAY: FC 45% pe rețea, fără ținte pe locații demo', gol.tinte.length === 1 && gol.tinte[0].locatie === 'RETEA' && gol.tinte[0].fcCurat === 45);
t('ținta de labor implicită: 17,5%', gol.setari.tintaLaborPct === 17.5);
t('păstrează regulile de business', gol.reguliBusiness.length > 0);

console.log('— Import pe stare goală: nimic demo nu contaminează —');
const nbo: unknown[][] = [
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
const r1 = importa('RETETAR_NBO', { foaie: 'R', antete: [], randuri: [], matrice: nbo }, 'nbo.xlsx', gol);
t('doar produsul real intră', r1.stateNou.produse.length === 1 && r1.stateNou.produse[0].denumire === 'SAMURAI CHICKEN');
t('doar ingredientele reale', r1.stateNou.ingrediente.length === 7);
const pmix: Parsat = {
  foaie: 'PMIX', antete: ['Data', 'Restaurant', 'Cod produs', 'Canal', 'Cantitate'],
  randuri: [{ Data: '2026-08-03', Restaurant: 'Sun Plaza', 'Cod produs': '820023', Canal: 'InStore', Cantitate: 40 }],
};
const r2 = importa('PMIX', pmix, 'pmix.xlsx', r1.stateNou);
t('PMIX-ul intră fără rânduri demo', r2.stateNou.vanzari.length === 1);
const rows = perProdus(r2.stateNou.vanzari, buildCtx(r2.stateNou), { luna: '2026-08', vedere: 'TOTAL' });
t('analizele arată doar produsul real', rows.length === 1 && rows[0].denumire === 'SAMURAI CHICKEN', rows.map(x => x.denumire).join(','));
t('Food Cost calculat pe datele reale', rows[0].fc !== null && rows[0].fc! > 30, `${rows[0].fc!.toFixed(2)}%`);
t('nicio denumire demo nu apare', !r2.stateNou.produse.some(p => /Crispy|Cola|Cartofi/.test(p.denumire)));
t('acoperirea rețetarului este 100%', reconciliaza(r2.stateNou, buildCtx(r2.stateNou), '2026-08').acoperire === 100);

console.log('— Contrast: același import peste datele demo —');
const rDemo = importa('PMIX', pmix, 'pmix.xlsx', importa('RETETAR_NBO', { foaie: 'R', antete: [], randuri: [], matrice: nbo }, 'nbo.xlsx', demo).stateNou);
const rowsDemo = perProdus(rDemo.stateNou.vanzari, buildCtx(rDemo.stateNou), { luna: '2026-07', vedere: 'TOTAL' });
t('peste demo, iulie rămâne plin de produse fictive', rowsDemo.length === 8, `${rowsDemo.length} produse în iulie`);
t('de aceea banner-ul avertizează înainte de import', areDateDemo(rDemo.stateNou).demo);

console.log('— Baza FRYDAY încorporată în aplicație —');
const baza = JSON.parse(JSON.stringify(require('../src/date/baza-fryday.json')));
t('160 produse, 151 ingrediente, 160 rețete', baza.produse.length === 160 && baza.ingrediente.length === 151 && baza.retete.length === 160,
  `${baza.produse.length}/${baza.ingrediente.length}/${baza.retete.length}`);
t('nicio vânzare încorporată — se importă periodic', baza.vanzari.length === 0);
t('fără istoric de importuri artificial', baza.importuri.length === 0);
t('țintele FRYDAY: FC 45% · labor 17,5% · comision 16%',
  baza.tinte[0].fcCurat === 45 && baza.setari.tintaLaborPct === 17.5 && baza.setari.comisionDeliveryPct === 16);
t('corecțiile de cost sunt incluse (koliber 3,57 · patty 1,14)', (() => {
  const k = baza.ingrediente.find((i: { cod: string }) => i.cod === '7000210');
  const p = baza.ingrediente.find((i: { cod: string }) => i.cod === '702045');
  return k.preturi[k.preturi.length - 1].pret === 3.57 && p.preturi[p.preturi.length - 1].pret === 1.14;
})());
t('istoricul de prețuri e păstrat, nu suprascris', (() => {
  const k = baza.ingrediente.find((i: { cod: string }) => i.cod === '7000210');
  return k.preturi.length === 2 && k.preturi[0].validDeLa === '2026-08-01' && k.preturi[1].validDeLa === '2026-08-03';
})());
t('prețurile pe canal sunt încărcate', (() => {
  const h = baza.produse.find((p: { cod: string }) => p.cod === 'HAMBURGER');
  return h.pretInstore > 0 && h.pretDelivery > 0;
})());
t('nicio denumire din setul demo', !baza.produse.some((p: { denumire: string }) => /Crispy Burger|Cola 330/.test(p.denumire)));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
