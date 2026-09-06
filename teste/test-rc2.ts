import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, aplicaScenariu, aplicaInDate, consumuriLuna, consumLunarIngredient, alerte, kpiProdus, versiuneActiva } from '../src/lib/engine';
import { importa, type Parsat } from '../src/lib/importer';

// ceasul, fixat: fereastra de schimbări recente a lui `alerte` se măsoară față de el.
// Fără asta, suita ar pica singură pe măsură ce calendarul înaintează.
const ACUM = '2026-08-15';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx0 = buildCtx(s0);

console.log('— Schimbare furnizor —');
const { ctx: ctxF } = aplicaScenariu(s0, [{ tip: 'FURNIZOR', ingredient: 'I001', furnizorNou: 'F05', pretNou: 13.40 }]);
const c0 = kpiProdus('P001', 'INSTORE', ctx0)!.cost!.total;
const c1 = kpiProdus('P001', 'INSTORE', ctxF)!.cost!.total;
t('costul scade cu Δpreț×0,10909 (−0,065)', aprox(c0 - c1, 0.6 * 0.109091, 0.001), (c0 - c1).toFixed(4));
const sF = aplicaInDate(s0, { nume: 'AviAlt', schimbari: [{ tip: 'FURNIZOR', ingredient: 'I001', furnizorNou: 'F05', pretNou: 13.40 }] });
const iF = sF.ingrediente.find(i => i.cod === 'I001')!;
t('aplicarea schimbă furnizorul + preț datat azi', iF.furnizor === 'F05' && iF.preturi[iF.preturi.length - 1].pret === 13.40, `${iF.furnizor}, ${iF.preturi.length} prețuri`);

console.log('— consumuriLuna (toate ingredientele, o trecere) —');
const cons = consumuriLuna(s0, ctx0, '2026-07');
const consPiept = consumLunarIngredient('I001', s0, ctx0, '2026-07');
t('consistent cu consumLunarIngredient', aprox(cons.get('I001')!.cant, consPiept.cantitate, 1e-6), cons.get('I001')!.cant.toFixed(1) + ' kg');
t('acoperă și ambalajele', (cons.get('A002')?.cant ?? 0) > 0, `cutii dlv: ${cons.get('A002')?.cant}`);
const topCheltuiala = [...cons.entries()].sort((a, b) => b[1].valoare - a[1].valoare)[0];
t('pieptul e cheltuiala #1', topCheltuiala[0] === 'I001', `${topCheltuiala[0]}: ${topCheltuiala[1].valoare.toFixed(0)} lei`);

console.log('— Alerte noi: marjă foarte mică + profit în scădere —');
const a0 = alerte(s0, ctx0, '2026-07', ACUM);
t('Cola (marjă ~68%) → MARJA_MICA', a0.some(a => a.categorie === 'MARJA_MICA' && a.titlu.includes('Cola')));
// profit în scădere: scumpim pieptul de la 1 iulie → profit iul < iun pe burgeri
const s3 = { ...s0, ingrediente: s0.ingrediente.map(i => i.cod !== 'I001' ? i : { ...i, preturi: [{ validDeLa: '2026-01-01', pret: 13.2 }, { validDeLa: '2026-07-01', pret: 22 }] }) };
const a3 = alerte(s3, buildCtx(s3), '2026-07', ACUM);
t('scumpirea mare → alerte PROFIT în scădere', a3.some(a => a.categorie === 'PROFIT'), a3.filter(a => a.categorie === 'PROFIT').map(a => a.titlu.split(':')[0]).join(', '));

console.log('— Import Prețuri Furnizori + mapare manuală —');
const pf: Parsat = {
  foaie: 'Oferte', antete: ['Supplier', 'Articol', 'Oferta lei', 'De la'],
  randuri: [
    { 'Supplier': 'AviAlt Distribution', 'Articol': 'I001', 'Oferta lei': '13,10', 'De la': '2026-07-25' },
    { 'Supplier': 'FurnizorNou SRL', 'Articol': 'I005', 'Oferta lei': 0.72, 'De la': '' },
    { 'Supplier': 'X', 'Articol': 'I999', 'Oferta lei': 1, 'De la': '' },
  ],
};
// „Articol" nu e în sinonime pentru ing → maparea manuală e necesară
const rez = importa('PRETURI_FURNIZORI', pf, 'oferte furnizori.xlsx', s0, { ing: 'Articol', pret: 'Oferta lei' });
t('import cu mapare manuală reușit', rez.batch.status === 'IMPORTAT' && rez.batch.importate === 2, `${rez.batch.importate} oferte`);
t('oferta F05/I001 actualizată la 13,10', rez.stateNou.pretFurnizori.some(o => o.furnizor === 'F05' && o.ingredient === 'I001' && o.pret === 13.10));
t('furnizor nou creat cu avertisment', rez.stateNou.furnizori.some(f => f.nume === 'FurnizorNou SRL') && rez.batch.avertismente.some(a => a.includes('FurnizorNou')));
t('ingredient necunoscut respins', rez.batch.avertismente.some(a => a.includes('I999')));

console.log('— R&D: publicarea variantei aprobate —');
const varianta = {
  nume: 'Double Crispy', schimbari: [{
    tip: 'PRODUS_NOU' as const, cod: 'P010', denumire: 'Double Crispy', tva: 10,
    pretInstore: 27.9, pretDelivery: 30.9, bucInstore: 500, bucDelivery: 250,
    linii: [
      { comp: 'I005', tipComp: 'INGREDIENT' as const, cant: 1, um: 'buc' as const, canal: 'AMBELE' as const },
      { comp: 'SP-021', tipComp: 'SEMIPREPARAT' as const, cant: 240, um: 'g' as const, canal: 'AMBELE' as const },
      { comp: 'A001', tipComp: 'AMBALAJ' as const, cant: 1, um: 'buc' as const, canal: 'INSTORE' as const },
    ],
  }],
};
const sPub = aplicaInDate(s0, varianta);
const rPub = sPub.retete.find(r => r.cod === 'P010')!;
t('produs + rețetă v1 publicate', sPub.produse.some(p => p.cod === 'P010') && rPub.activa === 1);
t('nota rețetei citează R&D-ul', (versiuneActiva(rPub).nota ?? '').includes('Double Crispy'));
const kPub = kpiProdus('P010', 'INSTORE', buildCtx(sPub))!;
// cost: chiflă 0,80 + 240g×13,909 = 3,338 + hârtie 0,25 = 4,388; net 25,364 → FC 17,3%
t('FC-ul produsului publicat ≈ 17,3%', aprox(kPub.fc!, 17.3, 0.1), kPub.fc!.toFixed(2) + '%');

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
