// Fluxul săptămânal: aplicația pornește goală, iar reîncărcarea acelorași fișiere nu
// umflă istoricul. Plus invarianta de canal la nivel de companie.
import { stareGoala } from '../src/lib/seed';
import { bazaInitiala } from '../src/lib/store';
import { importa } from '../src/lib/importer';
import { buildCtx } from '../src/lib/engine';
import { COMPANIE, perioadaDin } from '../src/lib/fc-domeniu';
import { metriciFC } from '../src/lib/fc-timeline';
import type { AppState, Ingredient, Produs, Reteta, VanzareFapt } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

console.log('\n— A. Aplicația pornește GOALĂ —');
const gol = stareGoala();
for (const [nume, n] of [['locații', gol.locatii.length], ['produse', gol.produse.length],
  ['rețete', gol.retete.length], ['ingrediente', gol.ingrediente.length],
  ['vânzări', gol.vanzari.length], ['materiale 2.9', (gol.materiale29 ?? []).length]] as const) {
  t(`fără ${nume} la pornire`, n === 0, `${n}`);
}
t('dar parametrii de calcul rămân', gol.setari.tvaImplicit === 11 && gol.reguli.length > 0);
t('ținta de rețea rămâne', gol.tinte.some(x => x.locatie === 'RETEA'));
t('starea INIȚIALĂ a aplicației e cea goală, nu baza încorporată',
  (() => {
    const b = bazaInitiala();
    return b.produse.length === 0 && b.retete.length === 0 && b.ingrediente.length === 0
      && b.vanzari.length === 0 && b.locatii.length === 0;
  })(),
  'baza FRYDAY rămâne disponibilă, dar numai cerută explicit');
t('nicio cifră nu apare fără import',
  metriciFC(gol, buildCtx(gol), { perioada: perioadaDin('2026-08-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' })
    .salesRON === 0);

console.log('\n— B. Reîncărcarea aceluiași rețetar NU umflă istoricul —');
const baza: AppState = { ...stareGoala(),
  ingrediente: [{ cod: 'IX', denumire: 'Ing', categorie: 'T', tip: 'FOOD', um: 'kg',
    preturi: [{ validDeLa: '2026-08-01', pret: 10 }], activ: true } as Ingredient],
  produse: [{ cod: 'PX', denumire: 'P', categorie: 'T', tip: 'SIMPLU',
    pretInstore: 30, pretDelivery: 35, tva: 11, activ: true } as Produs] };
const fis = (cant: number) => ({ foaie: 'x',
  antete: ['Cod produs', 'Denumire', 'Cod componenta', 'Cantitate', 'UM', 'Canal'],
  randuri: [{ 'Cod produs': 'PX', Denumire: 'P', 'Cod componenta': 'IX', Cantitate: cant, UM: 'g', Canal: 'AMBELE' }] });

let s = baza;
for (let i = 0; i < 5; i++) s = importa('RETETAR', fis(100), `sapt-${i}.xlsx`, s).stateNou;
const ret = () => s.retete.find(x => x.cod === 'PX')!;
t('cinci importuri identice lasă O SINGURĂ versiune', ret().versiuni.length === 1, `${ret().versiuni.length}`);
t('importul spune că nu s-a schimbat nimic',
  importa('RETETAR', fis(100), 'x.xlsx', s).batch.avertismente.some(a => a.includes('neschimbate')));

const dupaSchimbare = importa('RETETAR', fis(150), 'sapt-schimbat.xlsx', s);
s = dupaSchimbare.stateNou;
t('o schimbare REALĂ creează versiune nouă', ret().versiuni.length === 2);
t('versiunea veche rămâne întreagă', ret().versiuni[0].linii[0].cant === 100);
t('cea nouă poartă cantitatea nouă', ret().versiuni[1].linii[0].cant === 150);
t('… și numele fișierului care a adus-o', (ret().versiuni[1].nota ?? '').includes('sapt-schimbat'));
t('versiunea activă e cea nouă', ret().activa === 2);
t('o revenire la cantitatea veche e tot o schimbare — se versionează',
  importa('RETETAR', fis(100), 'revenire.xlsx', s).stateNou.retete.find(x => x.cod === 'PX')!.versiuni.length === 3);
t('ordinea liniilor în fișier nu contează pentru „neschimbat"',
  (() => {
    const doua = { foaie: 'x', antete: ['Cod produs', 'Denumire', 'Cod componenta', 'Cantitate', 'UM', 'Canal'],
      randuri: [
        { 'Cod produs': 'PY', Denumire: 'PY', 'Cod componenta': 'IX', Cantitate: 10, UM: 'g', Canal: 'AMBELE' },
        { 'Cod produs': 'PY', Denumire: 'PY', 'Cod componenta': 'IX', Cantitate: 20, UM: 'ml', Canal: 'AMBELE' }] };
    const inversat = { ...doua, randuri: [doua.randuri[1], doua.randuri[0]] };
    let x = importa('RETETAR', doua, 'a.xlsx', baza).stateNou;
    x = importa('RETETAR', inversat, 'b.xlsx', x).stateNou;
    return x.retete.find(r => r.cod === 'PY')!.versiuni.length === 1;
  })(),
  'altfel o simplă reordonare ar părea o modificare de rețetă');

console.log('\n— C. La nivel de companie, Total = InStore + Delivery —');
const vz = (canal: 'INSTORE' | 'DELIVERY', cant: number, net: number): VanzareFapt =>
  ({ data: '2026-08-10', locatie: 'L01', canal, produs: 'PX', cant, brut: net * 1.11, net });
const cuVanzari: AppState = { ...baza,
  locatii: [{ cod: 'L01', nume: 'A' }, { cod: 'L02', nume: 'B' }],
  retete: [{ cod: 'PX', tip: 'PRODUS', denumire: 'P', activa: 1,
    versiuni: [{ nr: 1, data: '2026-08-01', linii: [{ comp: 'IX', tipComp: 'INGREDIENT', cant: 100, um: 'g', canal: 'AMBELE' }] }] } as Reteta],
  vanzari: [vz('INSTORE', 60, 600), vz('DELIVERY', 40, 400),
    { ...vz('INSTORE', 20, 200), locatie: 'L02' }, { ...vz('DELIVERY', 10, 100), locatie: 'L02' }] };
const c = buildCtx(cuVanzari);
const per = perioadaDin('2026-08-15', 'LUNA');
const m = (canal: 'TOTAL' | 'INSTORE' | 'DELIVERY') =>
  metriciFC(cuVanzari, c, { perioada: per, nivel: COMPANIE, canal });
const [tot, ins, del] = [m('TOTAL'), m('INSTORE'), m('DELIVERY')];
t('vânzările: Total = InStore + Delivery', aprox(tot.salesRON, ins.salesRON + del.salesRON),
  `${tot.salesRON} = ${ins.salesRON} + ${del.salesRON}`);
t('costul: Total = InStore + Delivery', aprox(tot.recipeCostRON, ins.recipeCostRON + del.recipeCostRON));
t('ambele canale chiar au date', ins.salesRON > 0 && del.salesRON > 0);
t('FC-ul NU se adună între canale — se recalculează din totaluri',
  !aprox(tot.recipeFcPct ?? 0, (ins.recipeFcPct ?? 0) + (del.recipeFcPct ?? 0), 0.001));
t('FC total = cost total ÷ vânzări totale',
  aprox(tot.recipeFcPct!, (tot.recipeCostRON / tot.salesRON) * 100, 1e-9));
t('compania însumează ambele restaurante', aprox(tot.salesRON, 1300));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
