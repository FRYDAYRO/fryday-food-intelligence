// Actualizarea prețurilor din 2.9 și impactul lor în FC.
// Identitatea apărată: Δcost = Δpreț × consum, ΔFC = Δcost ÷ net × 100 — verificată numeric,
// nu prin snapshot. Și invarianta proiectului: istoricul nu se rescrie.
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, pretLa } from '../src/lib/engine';
import { COMPANIE, perioadaDin } from '../src/lib/fc-domeniu';
import { aplicaPreturi29, impactPreturi29 } from '../src/lib/actualizare-29';
import type { AppState, Ingredient, Produs, Reteta, VanzareFapt } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

// fixtură cu cifre alese ca impactul să fie verificabil în cap
const ing = (cod: string, pret: number | null): Ingredient => ({
  cod, denumire: cod, categorie: 'T', tip: 'FOOD', um: 'kg',
  preturi: pret === null ? [] : [{ validDeLa: '2026-07-01', pret }], activ: true,
});
const S: AppState = {
  ...genereazaSeed(),
  locatii: [{ cod: 'L01', nume: 'Centru' }],
  ingrediente: [ing('IA', 10), ing('IB', 4), ing('IC', 2), ing('ID', null)],
  produse: [{ cod: 'PX', denumire: 'Produs', categorie: 'T', tip: 'SIMPLU',
    pretInstore: 30, pretDelivery: 30, tva: 11, activ: true } as Produs],
  retete: [{ cod: 'PX', tip: 'PRODUS', denumire: 'Produs', activa: 1,
    versiuni: [{ nr: 1, data: '2026-07-01', linii: [
      { comp: 'IA', tipComp: 'INGREDIENT', cant: 100, um: 'g', canal: 'AMBELE' },
      { comp: 'IB', tipComp: 'INGREDIENT', cant: 200, um: 'g', canal: 'AMBELE' },
    ] }] } as Reteta],
  // 100 buc × 100 g IA = 10 kg IA; × 200 g IB = 20 kg IB. Net = 1000 lei.
  vanzari: [{ data: '2026-08-10', locatie: 'L01', canal: 'INSTORE', produs: 'PX', cant: 100, brut: 1110, net: 1000 } as VanzareFapt],
  salesReport: [],
};
const CTX = buildCtx(S);
const CERERE = { perioada: perioadaDin('2026-08-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' as const };

console.log('\n— A. Impactul unei scumpiri —');
const sus = impactPreturi29(S, CTX, CERERE, [{ cod: 'IA', costPeUnitate: 12 }]);
const rIA = sus.randuri.find(r => r.cod === 'IA')!;
t('consumul perioadei e cel din rețete × vânzări', aprox(rIA.consum, 10), `${rIA.consum} kg`);
t('Δpreț = 12 − 10', aprox(rIA.deltaLei!, 2));
t('Δpreț % = 20%', aprox(rIA.deltaPct!, 20));
t('IDENTITATE: Δcost = Δpreț × consum = 2 × 10 = 20 lei', aprox(rIA.deltaCostLei!, 20));
t('IDENTITATE: ΔFC = 20 ÷ 1000 × 100 = 2,00 pp', aprox(rIA.deltaFcPp!, 2));
t('e clasificată drept CREȘTERE', rIA.fel === 'CRESTERE');
t('numitorul e declarat', sus.netRON === 1000 && sus.sursaNet.length > 0);
t('FC înainte = (10×10 + 20×4) ÷ 1000 = 18%', aprox(sus.fcInaintePct!, 18));
t('FC după = 18 + 2 = 20%', aprox(sus.fcDupaPct!, 20));
t('totalul coincide cu singurul rând', aprox(sus.totalDeltaCostLei, 20) && aprox(sus.totalDeltaFcPp!, 2));

console.log('\n— B. Ieftinire, neschimbat, neconsumat, fără referință —');
const mix = impactPreturi29(S, CTX, CERERE, [
  { cod: 'IA', costPeUnitate: 8 },     // −2 × 10 kg = −20 lei
  { cod: 'IB', costPeUnitate: 4 },     // neschimbat
  { cod: 'IC', costPeUnitate: 9 },     // nu se consumă
  { cod: 'ID', costPeUnitate: 5 },     // fără preț de referință
  { cod: 'IZ', costPeUnitate: 1 },     // nu există în nomenclator
]);
const g = (c: string) => mix.randuri.find(r => r.cod === c)!;
t('ieftinirea dă Δcost NEGATIV', aprox(g('IA').deltaCostLei!, -20) && g('IA').fel === 'SCADERE');
t('… și scade FC-ul', aprox(g('IA').deltaFcPp!, -2));
t('prețul neschimbat nu mișcă nimic',
  g('IB').fel === 'NESCHIMBAT' && g('IB').deltaCostLei === 0 && g('IB').deltaFcPp === 0);
t('ingredientul neconsumat nu mișcă FC-ul acum',
  g('IC').fel === 'NEFOLOSIT' && g('IC').deltaCostLei === 0);
t('… și spune de ce', /nu s-a consumat/i.test(g('IC').motiv ?? ''), g('IC').motiv ?? '');
t('fără preț de referință NU se inventează un impact',
  g('ID').fel === 'NOU' && g('ID').deltaCostLei === null && g('ID').deltaFcPp === null);
t('… cu motivul scris', (g('ID').motiv ?? '').includes('preț de referință'));
t('materialul absent din nomenclator NU se creează pe tăcute',
  mix.faraIngredient.includes('IZ') && !mix.randuri.some(r => r.cod === 'IZ'));
t('rândurile sunt ordonate după cât mișcă FC-ul', mix.randuri[0].cod === 'IA');

console.log('\n— C. Mai multe schimbări deodată —');
const doua = impactPreturi29(S, CTX, CERERE, [
  { cod: 'IA', costPeUnitate: 11 },   // +1 × 10 = +10
  { cod: 'IB', costPeUnitate: 3.5 },  // −0,5 × 20 = −10
]);
t('impactele se compensează exact', aprox(doua.totalDeltaCostLei, 0));
t('… deci FC-ul rămâne la 18%', aprox(doua.fcDupaPct!, 18));
t('dar fiecare rând își păstrează semnul',
  doua.randuri.find(r => r.cod === 'IA')!.deltaCostLei === 10
  && doua.randuri.find(r => r.cod === 'IB')!.deltaCostLei === -10);
t('suma rândurilor = totalul raportat',
  aprox(doua.randuri.reduce((s, r) => s + (r.deltaCostLei ?? 0), 0), doua.totalDeltaCostLei));

console.log('\n— D. Aplicarea: istoricul NU se rescrie —');
const ap = aplicaPreturi29(S, CTX, [{ cod: 'IA', costPeUnitate: 12 }], '2026-08-01');
const iaNou = ap.stareNoua.ingrediente.find(i => i.cod === 'IA')!;
t('prețul nou s-a scris', ap.scrise === 1);
t('prețul vechi RĂMÂNE în istoric', iaNou.preturi.some(p => p.validDeLa === '2026-07-01' && p.pret === 10));
t('prețul nou e datat', iaNou.preturi.some(p => p.validDeLa === '2026-08-01' && p.pret === 12));
t('costul din IULIE folosește tot prețul vechi', pretLa(iaNou, '2026-07-15') === 10);
t('costul din AUGUST folosește prețul nou', pretLa(iaNou, '2026-08-15') === 12);
t('starea originală rămâne neatinsă', S.ingrediente.find(i => i.cod === 'IA')!.preturi.length === 1);
t('un preț identic NU adaugă o intrare — fără zgomot săptămânal',
  (() => {
    const x = aplicaPreturi29(ap.stareNoua, CTX, [{ cod: 'IA', costPeUnitate: 12 }], '2026-08-01');
    return x.scrise === 0 && x.sarite === 1
      && x.stareNoua.ingrediente.find(i => i.cod === 'IA')!.preturi.length === 2;
  })());
t('un import repetat de patru ori nu umflă istoricul',
  (() => {
    let s = S;
    for (let i = 0; i < 4; i++) s = aplicaPreturi29(s, CTX, [{ cod: 'IA', costPeUnitate: 12 }], '2026-08-01').stareNoua;
    return s.ingrediente.find(i => i.cod === 'IA')!.preturi.length === 2;
  })(),
  'exact problema pe care o are azi rețetarul');
t('un material necunoscut nu creează ingredient',
  aplicaPreturi29(S, CTX, [{ cod: 'IZ', costPeUnitate: 1 }], '2026-08-01')
    .stareNoua.ingrediente.length === S.ingrediente.length);

console.log('\n— E. Impactul prezis se confirmă pe cifrele reale —');
t('FC-ul recalculat DUPĂ aplicare = FC-ul prezis înainte',
  (() => {
    const prezis = impactPreturi29(S, CTX, CERERE, [{ cod: 'IA', costPeUnitate: 12 }]).fcDupaPct!;
    const dupa = aplicaPreturi29(S, CTX, [{ cod: 'IA', costPeUnitate: 12 }], '2026-08-01').stareNoua;
    const real = impactPreturi29(dupa, buildCtx(dupa), CERERE, []).fcInaintePct!;
    return aprox(prezis, real, 1e-6);
  })(),
  'predicția nu e o estimare — e aceeași aritmetică');

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
