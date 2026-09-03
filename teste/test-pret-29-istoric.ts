// Prețul efectiv datat: istoric cu proveniență, precedență explicită, vizibilitate.
//
// Contract:
//   · fiecare intrare de preț poartă sursa ei (2.9 / listă / rețetar / manual) până la fișier,
//     amprentă, perioadă, material și rând; nimic nu se șterge din istoric;
//   · D2: la aceeași dată efectivă, prețul valid din 2.9 are prioritate ÎN CALCUL față de
//     listă/manual, indiferent de ordinea importurilor; celelalte rămân în istoric;
//   · un preț identic cu cel valid la acea dată nu creează intrare; o corecție 2.9 pe aceeași
//     fereastră își înlocuiește doar propria intrare;
//   · săptămânalul câștigă în fereastra lui; lunarul scrie la 1 și nu atinge săptămânile;
//   · un preț încărcat în septembrie nu schimbă costul lui august; rețetarul nu primește
//     versiune nouă; costul rețetei se recalculează singur la dată;
//   · Ingredient Intelligence arată și ingredientele cu preț schimbat fără consum.
import { genereazaSeed, stareGoala } from '../src/lib/seed';
import { buildCtx, costProdus, pretLa } from '../src/lib/engine';
import { COMPANIE, perioadaDin } from '../src/lib/fc-domeniu';
import { aplicaPreturi29, impactPreturi29 } from '../src/lib/actualizare-29';
import { analizaIngrediente } from '../src/lib/fc-ingrediente';
import { panouriIngrediente } from '../src/lib/fc-tower';
import { importa, type Parsat } from '../src/lib/importer';
import { importaPrinCentru, istoricPret } from '../src/lib/import-center';
import type { AppState, Ingredient, Produs, Reteta, VanzareFapt } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

const ing = (cod: string, pret: number | null, deLa = '2026-07-01'): Ingredient => ({
  cod, denumire: cod, categorie: 'T', tip: 'FOOD', um: 'kg',
  preturi: pret === null ? [] : [{ validDeLa: deLa, pret }], activ: true,
});
const S: AppState = {
  ...genereazaSeed(),
  locatii: [{ cod: 'L01', nume: 'Centru' }],
  ingrediente: [ing('IA', 10), ing('IB', 4), ing('IC', 2)],
  produse: [{ cod: 'PX', denumire: 'Produs', categorie: 'T', tip: 'SIMPLU', pretInstore: 30, pretDelivery: 30, tva: 11, activ: true } as Produs],
  retete: [{ cod: 'PX', tip: 'PRODUS', denumire: 'Produs', activa: 1,
    versiuni: [{ nr: 1, data: '2026-07-01', linii: [
      { comp: 'IA', tipComp: 'INGREDIENT', cant: 100, um: 'g', canal: 'AMBELE' },
      { comp: 'IB', tipComp: 'INGREDIENT', cant: 200, um: 'g', canal: 'AMBELE' },
    ] }] } as Reteta],
  // iulie: 100 buc · august: 100 buc → 10 kg IA, 20 kg IB pe lună; net 1000 lei/lună
  vanzari: [
    { data: '2026-07-10', locatie: 'L01', canal: 'INSTORE', produs: 'PX', cant: 100, brut: 1110, net: 1000 } as VanzareFapt,
    { data: '2026-08-10', locatie: 'L01', canal: 'INSTORE', produs: 'PX', cant: 100, brut: 1110, net: 1000 } as VanzareFapt,
  ],
  salesReport: [], istoricPreturi: [], versiuniImport: [],
};
const CTX = buildCtx(S);
const SURSA = { fisier: '2.9 august.xlsx', amprenta: 'fp_aug' };
const pIA = (s: AppState) => s.ingrediente.find(i => i.cod === 'IA')!;

// ————————————————————————————————— A. proveniența
console.log('— A. Fiecare intrare 2.9 își poartă proveniența —');
const a1 = aplicaPreturi29(S, CTX, [{ cod: 'IA', costPeUnitate: 12, perioada: '2026-08', rand: 7 }], '2026-08-01', SURSA);
const eA = pIA(a1.stareNoua).preturi.find(p => p.validDeLa === '2026-08-01')!;
t('intrarea nouă e datată la începutul perioadei raportului', !!eA && eA.pret === 12);
t('… cu sursa: 2.9, fișier, amprentă, perioadă, material, rând',
  eA.sursa?.tip === 'NBO_29' && eA.sursa.fisier === '2.9 august.xlsx' && eA.sursa.amprenta === 'fp_aug'
  && eA.sursa.perioada === '2026-08' && eA.sursa.material === 'IA' && eA.sursa.rand === 7, JSON.stringify(eA.sursa));
t('prețul vechi rămâne, fără sursă (moștenit)', pIA(a1.stareNoua).preturi.some(p => p.validDeLa === '2026-07-01' && p.pret === 10));
t('rezultatul enumeră ce a scris', a1.scrise === 1 && a1.sarite === 0);

// ————————————————————————————————— B. D2: precedența la aceeași dată
console.log('\n— B. D2: 2.9 are prioritate în calcul la aceeași dată; celelalte rămân în istoric —');
const LISTA: Parsat = { antete: ['Cod', 'Pret'], randuri: [{ Cod: 'IA', Pret: 11 }], foaie: 'P' };
// lista întâi, apoi 2.9
const b1 = importa('COST_INGREDIENTE', LISTA, 'preturi aug.xlsx', S, undefined, { dataValabil: '2026-08-01', amprenta: 'fp_lista' });
t('(pregătire) lista scrie 11 la 1 august, cu sursa ei', pIA(b1.stateNou).preturi.some(p => p.validDeLa === '2026-08-01' && p.pret === 11 && p.sursa?.tip === 'LISTA_PRETURI' && p.sursa.fisier === 'preturi aug.xlsx'),
  JSON.stringify(pIA(b1.stateNou).preturi));
const b2 = aplicaPreturi29(b1.stateNou, buildCtx(b1.stateNou), [{ cod: 'IA', costPeUnitate: 12, perioada: '2026-08' }], '2026-08-01', SURSA);
t('2.9 după listă: ambele intrări rămân în istoric', pIA(b2.stareNoua).preturi.filter(p => p.validDeLa === '2026-08-01').length === 2);
t('… iar în calcul câștigă 2.9: pretLa(15 aug) = 12', pretLa(pIA(b2.stareNoua), '2026-08-15') === 12, `${pretLa(pIA(b2.stareNoua), '2026-08-15')}`);
// 2.9 întâi, apoi lista
const b3 = importa('COST_INGREDIENTE', LISTA, 'preturi aug.xlsx', a1.stareNoua, undefined, { dataValabil: '2026-08-01', amprenta: 'fp_lista' });
t('listă după 2.9: ambele rămân', pIA(b3.stateNou).preturi.filter(p => p.validDeLa === '2026-08-01').length === 2);
t('… și tot 2.9 câștigă, indiferent de ordine', pretLa(pIA(b3.stateNou), '2026-08-15') === 12, `${pretLa(pIA(b3.stateNou), '2026-08-15')}`);
t('iulie e neatins de ambele: 10', pretLa(pIA(b3.stateNou), '2026-07-15') === 10);
// corecția 2.9 pe aceeași fereastră
const b4 = aplicaPreturi29(b2.stareNoua, buildCtx(b2.stareNoua), [{ cod: 'IA', costPeUnitate: 13, perioada: '2026-08' }], '2026-08-01', { ...SURSA, amprenta: 'fp_aug2' });
t('corecția 2.9 înlocuiește DOAR intrarea ei: o singură intrare 2.9 la 1 august, cu 13', pIA(b4.stareNoua).preturi.filter(p => p.validDeLa === '2026-08-01' && p.sursa?.tip === 'NBO_29').length === 1
  && pretLa(pIA(b4.stareNoua), '2026-08-15') === 13);
t('… lista rămâne în istoric', pIA(b4.stareNoua).preturi.some(p => p.validDeLa === '2026-08-01' && p.sursa?.tip === 'LISTA_PRETURI' && p.pret === 11));
t('lista reimportată la aceeași dată își înlocuiește propria intrare, nu pe a lui 2.9', (() => {
  const x = importa('COST_INGREDIENTE', { ...LISTA, randuri: [{ Cod: 'IA', Pret: 11.5 }] }, 'preturi aug.xlsx', b4.stareNoua, undefined, { dataValabil: '2026-08-01', amprenta: 'fp_lista2' });
  const p = pIA(x.stateNou).preturi.filter(q => q.validDeLa === '2026-08-01');
  return p.length === 2 && p.some(q => q.sursa?.tip === 'LISTA_PRETURI' && q.pret === 11.5) && pretLa(pIA(x.stateNou), '2026-08-15') === 13;
})());
t('preț identic cu cel valid la dată → nicio intrare', aplicaPreturi29(b4.stareNoua, CTX, [{ cod: 'IA', costPeUnitate: 13 }], '2026-08-01', SURSA).scrise === 0);
t('un 2.9 care NU poate produce preț valid nu atinge nimic (lista nu se scrie de la sine)', (() => {
  const x = aplicaPreturi29(b1.stateNou, CTX, [], '2026-08-01', SURSA);
  return JSON.stringify(x.stareNoua.ingrediente) === JSON.stringify(b1.stateNou.ingrediente);
})());

// ————————————————————————————————— C. săptămânal vs lunar
console.log('\n— C. Săptămânalul câștigă în fereastra lui; lunarul scrie la 1 și nu atinge săptămânile —');
const c1 = aplicaPreturi29(S, CTX, [{ cod: 'IA', costPeUnitate: 12, perioada: '2026-08' }], '2026-08-01', { fisier: '2.9 aug.xlsx', amprenta: 'fp_l' });
const c2 = aplicaPreturi29(c1.stareNoua, CTX, [{ cod: 'IA', costPeUnitate: 12.5, perioada: '2026-S32' }], '2026-08-03', { fisier: '2.9 S32.xlsx', amprenta: 'fp_s32' });
const c3 = aplicaPreturi29(c2.stareNoua, CTX, [{ cod: 'IA', costPeUnitate: 12.5, perioada: '2026-S33' }], '2026-08-10', { fisier: '2.9 S33.xlsx', amprenta: 'fp_s33' });
t('S33 cu același preț ca S32 nu adaugă nimic', c3.scrise === 0 && c3.sarite === 1);
t('1–2 august: prețul lunar (12)', pretLa(pIA(c3.stareNoua), '2026-08-02') === 12);
t('3 august încolo: prețul săptămânii (12,5)', pretLa(pIA(c3.stareNoua), '2026-08-05') === 12.5 && pretLa(pIA(c3.stareNoua), '2026-08-20') === 12.5);
const c4 = aplicaPreturi29(c3.stareNoua, CTX, [{ cod: 'IA', costPeUnitate: 12.2, perioada: '2026-08' }], '2026-08-01', { fisier: '2.9 aug.xlsx', amprenta: 'fp_l2' });
t('lunarul corectat după săptămâni scrie DOAR la 1 august', pretLa(pIA(c4.stareNoua), '2026-08-02') === 12.2 && pretLa(pIA(c4.stareNoua), '2026-08-05') === 12.5);
t('… și săptămânile rămân exact cum erau', pIA(c4.stareNoua).preturi.filter(p => p.validDeLa === '2026-08-03').length === 1);
const c5 = aplicaPreturi29(c1.stareNoua, CTX, [{ cod: 'IA', costPeUnitate: 12.5, perioada: '2026-S32' }], '2026-08-03', { fisier: '2.9 S32.xlsx', amprenta: 'fp_s32' });
t('săptămânalul importat după lunar nu șterge lunarul', pIA(c5.stareNoua).preturi.some(p => p.validDeLa === '2026-08-01' && p.pret === 12) && pretLa(pIA(c5.stareNoua), '2026-08-05') === 12.5);

// ————————————————————————————————— D. reproductibilitate și rețetar
console.log('\n— D. Un preț din septembrie nu schimbă august; rețetarul nu primește versiune —');
const costAugInainte = costProdus('PX', 'INSTORE', CTX, '2026-08-15')!.total;
const d1 = aplicaPreturi29(S, CTX, [{ cod: 'IA', costPeUnitate: 14, perioada: '2026-09' }], '2026-09-01', { fisier: '2.9 sept.xlsx', amprenta: 'fp_sep' });
const ctxD1 = buildCtx(d1.stareNoua);
t('costul din 15 august e identic după importul de septembrie', aprox(costProdus('PX', 'INSTORE', ctxD1, '2026-08-15')!.total, costAugInainte));
t('costul din septembrie folosește prețul nou: 0,1×14 + 0,2×4 = 2,2', aprox(costProdus('PX', 'INSTORE', ctxD1, '2026-09-15')!.total, 2.2), `${costProdus('PX', 'INSTORE', ctxD1, '2026-09-15')!.total}`);
const d2 = aplicaPreturi29(S, CTX, [{ cod: 'IA', costPeUnitate: 12, perioada: '2026-08' }], '2026-08-01', SURSA);
t('un 2.9 de AUGUST recalculează costul lui august: 0,1×12 + 0,2×4 = 2,0', aprox(costProdus('PX', 'INSTORE', buildCtx(d2.stareNoua), '2026-08-15')!.total, 2.0));
t('… iar iulie rămâne 1,8', aprox(costProdus('PX', 'INSTORE', buildCtx(d2.stareNoua), '2026-07-15')!.total, 1.8));
t('rețetarul e IDENTIC: nicio versiune nouă, niciun gramaj schimbat', JSON.stringify(d2.stareNoua.retete) === JSON.stringify(S.retete));
t('Recipe FC pe august s-a mișcat automat: 18 % → 20 %', aprox(impactPreturi29(d2.stareNoua, buildCtx(d2.stareNoua), { perioada: perioadaDin('2026-08-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' }, []).fcInaintePct!, 20));

// ————————————————————————————————— E. istoricul prin Import Center poartă sursa
console.log('\n— E. Istoricul de prețuri din Import Center poartă sursa —');
const e1 = importaPrinCentru({ ...S, locatii: [] }, { fisier: 'preturi aug.xlsx', parsat: { antete: ['Cod', 'Denumire', 'UM', 'Pret'], randuri: [{ Cod: 'IA', Denumire: 'IA', UM: 'kg', Pret: 11 }], foaie: 'P' }, tip: 'PRETURI_INGREDIENTE', dataValabil: '2026-08-01', acum: '2026-09-03T08:00:00.000Z' });
t('(pregătire) lista s-a activat', e1.rezultat.stare === 'ACTIVAT', e1.rezultat.erori.join(' | '));
const h = istoricPret(e1.stareNoua, 'IA');
t('intrarea de istoric are sursa listei, cu fișier și amprentă', h.length === 1 && h[0].sursa?.tip === 'LISTA_PRETURI' && h[0].fisier === 'preturi aug.xlsx' && h[0].amprenta === e1.rezultat.amprenta, JSON.stringify(h[0]));

// ————————————————————————————————— F. Ingredient Intelligence vede și ce nu s-a consumat
console.log('\n— F. Un ingredient cu preț schimbat, dar fără consum, rămâne vizibil —');
const f0: AppState = { ...S, istoricPreturi: [] };
const f1 = aplicaPreturi29(f0, CTX, [{ cod: 'IC', costPeUnitate: 2.5, perioada: '2026-08', rand: 3 }], '2026-08-01', SURSA);
const fS: AppState = { ...f1.stareNoua, istoricPreturi: [{ ingredient: 'IC', denumire: 'IC', dataEfectiva: '2026-08-01', pretVechi: 2, pretNou: 2.5, deltaRON: 0.5, deltaPct: 25, fisier: '2.9 august.xlsx', amprenta: 'fp_aug', sursa: { tip: 'NBO_29', fisier: '2.9 august.xlsx', amprenta: 'fp_aug', perioada: '2026-08', material: 'IC', rand: 3 } }] };
const an = analizaIngrediente(fS, buildCtx(fS), { perioada: perioadaDin('2026-08-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL', comparatie: 'LUNA_PRECEDENTA' });
const rIC = an.randuri.find(r => r.ingredient === 'IC');
t('analiza e disponibilă', an.disponibil, an.motivIndisponibil);
t('IC apare deși nu s-a consumat', !!rIC, an.randuri.map(r => r.ingredient).join(','));
t('… cu preț anterior 2, preț nou 2,5, Δ 0,5 lei, Δ 25 %', !!rIC && rIC.pretPrecedent === 2 && rIC.pretCurent === 2.5 && aprox(rIC.deltaPretLei!, 0.5) && aprox(rIC.deltaPretPct!, 25));
t('… consum 0, impact cost 0, impact FC 0 — nu null, nu ascuns', !!rIC && rIC.consumCurent === 0 && rIC.deltaCostLei === 0 && rIC.fcImpactPp === 0);
t('… și poartă evenimentul de preț cu proveniența lui', !!rIC && rIC.schimbariPret.length === 1 && rIC.schimbariPret[0].sursa?.material === 'IC' && rIC.schimbariPret[0].sursa?.rand === 3);
t('IB, fără schimbare de preț și fără consum diferit, nu e zgomot: apare doar pentru că se consumă', an.randuri.some(r => r.ingredient === 'IB'));
const fara: AppState = { ...fS, ingrediente: [...fS.ingrediente, ing('ID', 5)] };
t('un ingredient fără schimbare și fără consum NU apare', !analizaIngrediente(fara, buildCtx(fara), { perioada: perioadaDin('2026-08-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL', comparatie: 'LUNA_PRECEDENTA' }).randuri.some(r => r.ingredient === 'ID'));
const pan = panouriIngrediente(an).find(p => p.id === 'MODIFICARI_PRET');
t('Tower are panoul „Modificări de preț"', !!pan);
t('… care listează IC cu preț anterior, preț nou, consum, impact', !!pan && pan.randuri.some(r => r.ingredient === 'IC' && r.pretPrecedent === 2 && r.pretCurent === 2.5 && r.consumCurent === 0 && r.impactCostRON === 0));
t('… și proveniența schimbării', !!pan && /2\.9 august\.xlsx/.test(pan.randuri.find(r => r.ingredient === 'IC')?.sursaPret ?? ''), pan?.randuri.find(r => r.ingredient === 'IC')?.sursaPret ?? '');
t('… ordonat după |Δ%|, IC primul', !!pan && pan.randuri[0]?.ingredient === 'IC');
t('identitatea motorului de impact e neatinsă: Δcost = Δpreț × consum', (() => {
  const r = impactPreturi29(S, CTX, { perioada: perioadaDin('2026-08-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' }, [{ cod: 'IA', costPeUnitate: 12 }]).randuri[0];
  return aprox(r.deltaCostLei!, 2 * 10) && aprox(r.deltaFcPp!, 2);
})());
t('starea goală nu are istoric', (stareGoala().istoricPreturi ?? []).length === 0);

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
