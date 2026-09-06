// Audit de lansare — o foaie de dashboard (produse cu „Cost material" și „FOOD COST") NU este o listă
// de prețuri de ingrediente: sinonimul „material" nu are voie să prindă un antet de bani, iar „FOOD COST"
// nu e preț. Înainte, foaia era detectată PRETURI_INGREDIENTE „sigur" și ar fi scris coduri și prețuri false.
import { mapeazaAntete } from '../src/lib/importer';
import { detecteazaSursa } from '../src/lib/import-center';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const TOP_SALES = ['#', 'Produs', 'Categorie', 'Buc InStore', 'Buc Delivery', 'Buc TOTAL', 'Vânzări nete', '% din total', 'Cost material', 'FOOD COST', 'Profit brut'];
const NOMENCLATOR = ['Cod NBO', 'Denumire NBO', 'Tip', 'UM (NBO)', 'UM bază', 'PREȚ / UM bază', 'Valabil de la'];
const RETETAR = ['Produs', 'Categorie', 'Canal', 'Cod MP', 'Denumire MP', 'Cantitate', 'UM', 'Preț unitar', 'Cost linie', 'TOTAL InStore', 'TOTAL Delivery'];
const PRETURI = ['Cod material', 'Denumire', 'UM', 'Pret', 'Valabil de la'];

console.log('— Foaia de dashboard nu e listă de prețuri —');
const m = mapeazaAntete(TOP_SALES, 'COST_INGREDIENTE');
t('„Cost material" nu e coloană de cod; „FOOD COST" nu e preț', m.cod === undefined && m.pret !== 'FOOD COST', JSON.stringify(m));
const d = detecteazaSursa(TOP_SALES, 'TOP SALES.xlsx');
t('detecția nu mai e „sigur" pe PRETURI_INGREDIENTE: cere confirmare, fără candidat de preț', d.stare !== 'SIGUR' && !d.candidati.some(c => c.tip === 'PRETURI_INGREDIENTE'), `${d.tip} ${d.stare}: ${d.motiv}`);
t('nici FC29_MATERIAL nu prinde „Cost material" drept cod de material', mapeazaAntete(TOP_SALES, 'FC29_MATERIAL').material === undefined);

console.log('\n— Sursele reale rămân recunoscute —');
const mn = mapeazaAntete(NOMENCLATOR, 'COST_INGREDIENTE');
t('nomenclatorul: cod, denumire, UM, preț, valabil de la', mn.cod === 'Cod NBO' && mn.denumire === 'Denumire NBO' && mn.um === 'UM bază' && mn.pret === 'PREȚ / UM bază' && mn.validDeLa === 'Valabil de la');
t('nomenclatorul rămâne candidat (NOMENCLATOR și PRETURI_INGREDIENTE, cu confirmare)', detecteazaSursa(NOMENCLATOR, 'export.xlsx').candidati.some(c => c.tip === 'NOMENCLATOR'));
t('nomenclatorul cu semnal de nume → sigur', detecteazaSursa(NOMENCLATOR, 'nomenclator.xlsx').tip === 'NOMENCLATOR' && detecteazaSursa(NOMENCLATOR, 'nomenclator.xlsx').stare === 'SIGUR');
const mr = mapeazaAntete(RETETAR, 'COST_INGREDIENTE');
t('rețetarul: „Cod MP" rămâne cod, „Preț unitar" preț', mr.cod === 'Cod MP' && mr.pret === 'Preț unitar');
const mp = mapeazaAntete(PRETURI, 'COST_INGREDIENTE');
t('o listă de prețuri obișnuită: „Cod material" e cod (începe cu „cod"), „Pret" e preț', mp.cod === 'Cod material' && mp.pret === 'Pret');
t('…și e detectată sigur cu semnal de nume', detecteazaSursa(PRETURI, 'preturi ingrediente.xlsx').tip === 'PRETURI_INGREDIENTE');

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
process.exit(fail ? 1 : 0);
