import { genereazaSeedNBO, TVA_FRYDAY } from '../src/lib/seed-nbo';
import { buildCtx, kpiProdus, costProdus, perProdus } from '../src/lib/engine';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

const s = genereazaSeedNBO();
const ctx = buildCtx(s);
const D = '2026-07-15';

console.log('— Costurile reproduc exact recipe card-urile NBO —');
// valorile din coloana „Materials Cost" a NBO
const asteptat: Record<string, number> = { '820023': 4.920, '820024': 5.076, '700970': 13.040, '820025': 5.172 };
for (const [cod, val] of Object.entries(asteptat)) {
  const c = costProdus(cod, 'INSTORE', ctx, D)!;
  const p = s.produse.find(x => x.cod === cod)!;
  t(`${p.denumire}: cost ${val.toFixed(3)} lei`, aprox(c.total, val, 0.005), `calculat ${c.total.toFixed(3)}`);
}

console.log('— Liniile individuale (extension NBO) —');
const linii: [string, string, number][] = [
  ['820023', '7000133', 2.400], ['820023', '702045', 1.171], ['820023', '4078', 0.338],
  ['820023', '4067', 0.453], ['820023', '702399', 0.087], ['820023', '7000143', 0.360],
  ['820023', '700655', 0.111], ['820024', '702122', 0.609],
  ['700970', '700996', 3.698], ['700970', '700963', 1.880], ['700970', '702321', 5.308],
  ['700970', '702496', 0.974], ['700970', '702398', 0.084], ['700970', '7000123', 0.616],
];
let liniiOk = 0;
for (const [prod, comp, val] of linii) {
  const r = s.retete.find(x => x.cod === prod)!;
  const l = r.versiuni[0].linii.find(x => x.comp === comp)!;
  const ingr = s.ingrediente.find(x => x.cod === comp)!;
  const f = l.um === 'g' || l.um === 'ml' ? 0.001 : 1;
  const calc = l.cant * f * ingr.preturi[0].pret;
  if (aprox(calc, val, 0.005)) liniiOk++;
  else console.log(`     ✘ ${prod}/${comp}: ${calc.toFixed(3)} vs ${val}`);
}
t('toate cele 14 linii verificate reproduc extension-ul NBO', liniiOk === linii.length, `${liniiOk}/${linii.length}`);

console.log('— Separarea Food / Paper —');
const cS = costProdus('820023', 'INSTORE', ctx, D)!;
t('hârtia intră în Paper, nu în Food', aprox(cS.paper, 0.111) && aprox(cS.food, 4.809), `food ${cS.food.toFixed(3)} + paper ${cS.paper.toFixed(3)}`);
const cP = costProdus('700970', 'INSTORE', ctx, D)!;
t('cutia mare intră în Paper', aprox(cP.paper, 0.974), `paper ${cP.paper.toFixed(3)}`);

console.log('— Diferența de metodologie față de NBO —');
const k = kpiProdus('820023', 'INSTORE', ctx)!;
const nboPct = (4.920 / 15.99) * 100;                       // NBO: cost / preț CU TVA
const netPct = (4.920 / (15.99 / (1 + TVA_FRYDAY / 100))) * 100;  // FRYDAY: cost / preț NET
t('cota confirmată este 11%', TVA_FRYDAY === 11);
t('NBO raportează 30,77% pe prețul cu TVA', aprox(nboPct, 30.77, 0.02), `${nboPct.toFixed(2)}%`);
t('aplicația raportează pe prețul net, deci mai mare', aprox(k.fc!, netPct, 0.02) && k.fc! > nboPct, `${k.fc!.toFixed(2)}%`);
t('CHICKEN LEMON: NBO 31,74% cu TVA', aprox((5.076 / 15.99) * 100, 31.74, 0.02));

console.log('— Nomenclator & integritate —');
t('4 produse, 15 ingrediente, 4 rețete', s.produse.length === 4 && s.ingrediente.length === 15 && s.retete.length === 4);
t('Chicken Pesto Burger e inactiv (preț 0 în NBO)', s.produse.find(p => p.cod === '700970')!.activ === false);
t('toate liniile trimit la un ingredient existent', s.retete.every(r => r.versiuni[0].linii.every(l => s.ingrediente.some(i => i.cod === l.comp))));
t('ambalajele sunt marcate PACKAGING', s.ingrediente.filter(i => ['700655', '702496'].includes(i.cod)).every(i => i.tip === 'PACKAGING'));
t('prețurile sunt datate 07.01.2026', s.ingrediente.every(i => i.preturi[0].validDeLa === '2026-01-07'));

console.log('— Vânzări estimate & acoperire —');
const rows = perProdus(s.vanzari, ctx, { luna: '2026-07', vedere: 'TOTAL' });
t('toate produsele active au vânzări', rows.length === 3 && rows.every(r => r.buc > 0));
t('acoperirea rețetarului este 100%', rows.every(r => !r.faraReteta));
t('Sales Report acoperă ambele canale', s.salesReport.filter(x => x.data === '2026-07-01').length === 4);
t('raportul 2.9 lipsește — semnalat la reconciliere', s.linii29.length === 0);
t('jurnalul de import conține avertismentele despre PMIX estimat', s.importuri[0].avertismente.some(a => a.includes('estimat')));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
