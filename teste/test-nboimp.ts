import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, costProdus, kpiProdus } from '../src/lib/engine';
import { importa, type Parsat } from '../src/lib/importer';
import { cardsDinMatrice, pretBaza, umNBO, esteAmbalaj } from '../src/lib/nbo';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

// pornim de la o stare goală de nomenclator, ca la o instalare curată
const s0 = { ...genereazaSeed(), produse: [], retete: [], ingrediente: [], vanzari: [], salesReport: [] };

// ——— matricea reprodusă exact după capturile NBO (SAMURAI CHICKEN + CHICKEN LEMON, două carduri)
const matrice: unknown[][] = [
  ['Recipes - Menu Items'], [],
  ['Product Name:', 'SAMURAI CHICKEN', '', '', 'Product ID:', '820023'],
  ['POS Item Price:', '$15.99', 'Materials Cost:', '$4.92', 'Category:', 'BURGER*'],
  ['POS Item Number:', '820023', 'Materials Cost %:', '30.77%'],
  [],
  ['Item ID', 'Item Name', 'Qty', 'Units', 'Cost', 'Extension'],
  ['7000133', 'CHIFLA CARTOF 3.5inch 53G x 72', 1, 'EA', '$2.400', '$2.400'],
  ['702045', 'Patties pui 50gr Transavia', 1, 'EA', '$1.171', '$1.171'],
  ['4078', 'Ulei de alune', 20.000, 'ML', '$0.017', '$0.338'],
  ['4067', 'Sos Samurai BIB', 15.000, 'ML', '$0.030', '$0.453'],
  ['702399', 'Y-Castraveti felii in saramura', 5.600, 'GM', '$0.016', '$0.087'],
  ['7000143', 'SALATA LOLLO BIONDA S 500g', 10.000, 'Gram', '$0.036', '$0.360'],
  ['700655', 'Hartie Little Hamburgers', 1, 'EA', '$0.111', '$0.111'],
  [],
  ['Product Name:', 'Chicken Pesto Burger', '', '', 'Product ID:', '700970'],
  ['POS Item Price:', '$0.00', 'Materials Cost:', '$13.04', 'Category:', 'BURGER*'],
  ['POS Item Number:', '26031', 'Materials Cost %:', '0%'],
  [],
  ['Item ID', 'Item Name', 'Qty', 'Units', 'Cost', 'Extension'],
  ['700996', 'Schnitzel Cornflakes Gierlinger 100gr', 1, 'EA', '$3.698', '$3.698'],
  ['700963', 'Green Pesto Mayo', 40.000, 'ML', '$0.047', '$1.880'],
  ['700966', 'Salata Roumaine', 15.000, 'Gram', '$0.032', '$0.480'],
  ['7000123', 'Branza cheddar felii 2026', 1, 'EA', '$0.616', '$0.616'],
  ['702321', '5 Inch Potato Roll', 1, 'EA', '$5.308', '$5.308'],
  ['702496', 'Cutie mare burger Chicken Pesto', 1, 'EA', '$0.974', '$0.974'],
  ['702398', 'Castraveti felii in saramura', 11.200, 'GM', '$0.007', '$0.084'],
];

console.log('— Parserul de recipe card —');
const carduri = cardsDinMatrice(matrice);
t('două carduri detectate', carduri.length === 2, carduri.map(c => c.denumire).join(' | '));
const sam = carduri[0];
t('antetul citit complet', sam.produs === '820023' && sam.denumire === 'SAMURAI CHICKEN' && sam.pretPos === 15.99 && sam.categorie === 'BURGER', `${sam.produs} · ${sam.pretPos} · ${sam.categorie}`);
t('Materials Cost preluat', sam.materialsCost === 4.92);
t('7 linii de ingrediente', sam.linii.length === 7);
t('al doilea card are POS diferit de Product ID', carduri[1].produs === '700970' && carduri[1].codPos === '26031');
t('categoria e curățată de asterisc', !sam.categorie.includes('*'));

console.log('— Unități și conversia de preț —');
t('EA/GM/ML/Gram recunoscute', umNBO('EA') === 'buc' && umNBO('GM') === 'g' && umNBO('ML') === 'ml' && umNBO('Gram') === 'g');
const ulei = sam.linii.find(l => l.comp === '4078')!;
t('ulei: 0,338/20 ML → 16,90 lei/l', aprox(pretBaza(ulei)!, 16.90, 0.01), `${pretBaza(ulei)!.toFixed(2)}`);
const sos = sam.linii.find(l => l.comp === '4067')!;
t('sos: 0,453/15 ML → 30,20 lei/l', aprox(pretBaza(sos)!, 30.20, 0.01), `${pretBaza(sos)!.toFixed(2)}`);
const salata = sam.linii.find(l => l.comp === '7000143')!;
t('salată: 0,360/10 GM → 36,00 lei/kg', aprox(pretBaza(salata)!, 36.00, 0.01));
const chifla = sam.linii.find(l => l.comp === '7000133')!;
t('chiflă: EA → 2,400 lei/buc, fără conversie', aprox(pretBaza(chifla)!, 2.400, 0.001));
t('ambalajele sunt recunoscute după denumire', esteAmbalaj('Hartie Little Hamburgers') && esteAmbalaj('Cutie mare burger Chicken Pesto') && !esteAmbalaj('Ulei de alune'));

console.log('— Importul populează nomenclatorul —');
const p: Parsat = { foaie: 'NBO', antete: [], randuri: [], matrice };
const rez = importa('RETETAR_NBO', p, 'recipe cards NBO.xlsx', s0);
t('import reușit, 2 produse', rez.batch.status === 'IMPORTAT' && rez.batch.importate === 2, `${rez.batch.importate}`);
const st = rez.stateNou;
t('produsele au intrat în nomenclator', st.produse.length === 2 && st.produse.some(x => x.cod === '820023'));
t('preț, categorie și TVA completate', st.produse[0].pretInstore === 15.99 && st.produse[0].categorie === 'BURGER' && st.produse[0].tva === s0.setari.tvaImplicit);
t('numărul POS păstrat ca alias', st.produse.find(x => x.cod === '700970')!.codPos === '26031');
t('produsul cu preț 0 a intrat inactiv', st.produse.find(x => x.cod === '700970')!.activ === false);
t('14 ingrediente create (7+7, fără suprapunere)', st.ingrediente.length === 14, `${st.ingrediente.length}`);
t('UM de bază corectă', st.ingrediente.find(i => i.cod === '4078')!.um === 'l' && st.ingrediente.find(i => i.cod === '7000143')!.um === 'kg' && st.ingrediente.find(i => i.cod === '7000133')!.um === 'buc');
t('ambalajele marcate PACKAGING', st.ingrediente.filter(i => ['700655', '702496'].includes(i.cod)).every(i => i.tip === 'PACKAGING'));
t('prețurile convertite corect', aprox(st.ingrediente.find(i => i.cod === '4067')!.preturi[0].pret, 30.20, 0.01));
t('rețetele create și activate', st.retete.length === 2 && st.retete.every(r => r.activa === 1 && r.versiuni[0].linii.length === 7));

console.log('— Costul calculat = Materials Cost din NBO —');
const ctx = buildCtx(st);
const cSam = costProdus('820023', 'INSTORE', ctx, '2026-07-15')!;
t('SAMURAI: 4,920 lei', aprox(cSam.total, 4.920, 0.005), cSam.total.toFixed(3));
t('din care Paper 0,111', aprox(cSam.paper, 0.111, 0.001));
const cPesto = costProdus('700970', 'INSTORE', ctx, '2026-07-15')!;
t('Chicken Pesto Burger: 13,040 lei', aprox(cPesto.total, 13.040, 0.005), cPesto.total.toFixed(3));
t('FC calculat pe preț net', kpiProdus('820023', 'INSTORE', ctx)!.fc! > 30);
t('niciun avertisment de incoerență Extension/Cost', !rez.batch.avertismente.some(a => a.includes('≠ Qty × Cost')));

console.log('— Reimport: versiune nouă, fără duplicare —');
const rez2 = importa('RETETAR_NBO', p, 'recipe cards NBO.xlsx', st);
t('produsele nu se dublează', rez2.stateNou.produse.length === 2);
t('ingredientele nu se dublează', rez2.stateNou.ingrediente.length === 14);
t('rețeta primește versiunea 2', rez2.stateNou.retete[0].versiuni.length === 2 && rez2.stateNou.retete[0].activa === 2);
t('prețul identic nu creează intrare nouă', rez2.stateNou.ingrediente.find(i => i.cod === '4078')!.preturi.length === 1);

console.log('— Scumpire la reimport —');
// scumpire de la 16,90 la 40,00 lei/l (+137%), peste pragul de alertă
const matrice2 = matrice.map(r => (Array.isArray(r) && r[0] === '4078' ? ['4078', 'Ulei de alune', 20.000, 'ML', '$0.040', '$0.800'] : r));
const rez3 = importa('RETETAR_NBO', { ...p, matrice: matrice2 }, 'nbo v2.xlsx', st);
const ulei2 = rez3.stateNou.ingrediente.find(i => i.cod === '4078')!;
t('prețul zilei se actualizează, nu se dublează intrarea', ulei2.preturi.length === 1 && aprox(ulei2.preturi[0].pret, 40.00, 0.01), `${ulei2.preturi.map(x => x.pret.toFixed(2)).join(' → ')}`);
t('variația peste prag e semnalată', rez3.batch.avertismente.some(a => a.includes('Ulei de alune') && a.includes('%')), rez3.batch.avertismente.find(a => a.includes('Ulei')) ?? 'lipsă');
// import la o dată ulterioară păstrează istoricul (verificare pe model, nu pe ceas)
const cuIstoric = { ...st, ingrediente: st.ingrediente.map(i => i.cod !== '4078' ? i : { ...i, preturi: [{ validDeLa: '2026-01-01', pret: 12 }] }) };
const rez4 = importa('RETETAR_NBO', { ...p, matrice: matrice2 }, 'nbo v3.xlsx', cuIstoric);
const ulei3 = rez4.stateNou.ingrediente.find(i => i.cod === '4078')!;
t('prețul vechi rămâne, cel nou se adaugă datat', ulei3.preturi.length === 2 && ulei3.preturi[0].pret === 12 && aprox(ulei3.preturi[1].pret, 40, 0.01), ulei3.preturi.map(x => `${x.validDeLa}:${x.pret}`).join(' → '));

console.log('— PMIX se mapează pe cod sau pe numărul POS —');
const pmix: Parsat = {
  foaie: 'PMIX', antete: ['Data', 'Cod produs', 'Canal', 'Cantitate'],
  randuri: [
    { 'Data': '2026-07-01', 'Cod produs': '820023', 'Canal': 'InStore', 'Cantitate': 12 },
    { 'Data': '2026-07-01', 'Cod produs': '26031', 'Canal': 'InStore', 'Cantitate': 5 },   // numărul POS
    { 'Data': '2026-07-01', 'Cod produs': '999999', 'Canal': 'InStore', 'Cantitate': 3 },  // inexistent
  ],
};
const rezP = importa('PMIX', pmix, 'pmix.xlsx', st);
t('2 rânduri intrate, unul respins', rezP.stateNou.vanzari.length === 2);
t('rândul cu numărul POS a fost mapat pe 700970', rezP.stateNou.vanzari.some(v => v.produs === '700970' && v.cant === 5));
t('maparea prin POS e raportată', rezP.batch.avertismente.some(a => a.includes('Mapate prin numărul POS')));
t('codul necunoscut e semnalat', rezP.batch.avertismente.some(a => a.includes('999999')));

console.log('— Control de coerență pe date greșite —');
const matriceGresita = matrice.map(r => (Array.isArray(r) && r[0] === '702045' ? ['702045', 'Patties pui 50gr Transavia', 1, 'EA', '$1.171', '$9.999'] : r));
const rezG = importa('RETETAR_NBO', { ...p, matrice: matriceGresita }, 'nbo gresit.xlsx', s0);
t('Extension ≠ Qty × Cost este semnalat', rezG.batch.avertismente.some(a => a.includes('≠ Qty × Cost')));
t('suma liniilor ≠ Materials Cost este semnalată', rezG.batch.avertismente.some(a => a.includes('Materials Cost din NBO')));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
