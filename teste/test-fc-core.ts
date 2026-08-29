// Motorul FC: RecipeFC · NBOFC · ReconciliationFC.
//
// Se verifică identități, nu valori fixate:
//   Total        = InStore + Delivery, ca SUME (invarianta 4)
//   Companie     = Σ restaurante
//   Lună         = Σ săptămâni
//   Puntea       : cost teoretic + Σ pași = consum 2.9 Curat, rezidual zero
//   Izolare P&L  : nicio cifră de FC nu se mișcă la schimbarea comisionului sau a labor-ului
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx } from '../src/lib/engine';
import {
  COMPANIE, perioadaDin, perioadeDinLuna, restaurant,
  type CerereFC, type FCChannel,
} from '../src/lib/fc-domeniu';
import { nboFC, recipeFC, reconciliationFC } from '../src/lib/fc-core';
import type { AppState, WasteFapt } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx = buildCtx(s0);
const LUNA = perioadaDin('2026-07-15', 'LUNA');
const cerere = (canal: FCChannel = 'TOTAL', nivel = COMPANIE): CerereFC => ({ perioada: LUNA, nivel, canal });

// ————————————————————————————————————————————————————————— Recipe FC

console.log('— Recipe FC: PMIX × rețete × prețuri —');
const total = recipeFC(s0, ctx, cerere('TOTAL'));
const inStore = recipeFC(s0, ctx, cerere('INSTORE'));
const delivery = recipeFC(s0, ctx, cerere('DELIVERY'));

t('are vânzări în perioadă', total.buc > 0 && total.netVandut > 0,
  `${total.buc} buc · ${total.netVandut.toFixed(0)} lei`);
t('Total = InStore + Delivery pe bucăți', aprox(total.buc, inStore.buc + delivery.buc, 1e-6));
t('Total = InStore + Delivery pe vânzări nete', aprox(total.netVandut, inStore.netVandut + delivery.netVandut));
t('Total = InStore + Delivery pe cost', aprox(total.cost, inStore.cost + delivery.cost));
t('Total = InStore + Delivery pe Food', aprox(total.costFood, inStore.costFood + delivery.costFood));
t('Total = InStore + Delivery pe Paper', aprox(total.costPaper, inStore.costPaper + delivery.costPaper));
t('cost = Food + Paper', aprox(total.cost, total.costFood + total.costPaper));
t('procentul NU se mediază, se recalculează din totaluri',
  aprox(total.fcPct!, (total.cost / total.netAcoperit) * 100, 1e-9));
t('FC pe partea acoperită ≥ FC pe tot vândutul (numitor mai mic)',
  total.fcPct! >= total.fcPeTotalVandut!, `${total.fcPct!.toFixed(2)}% ≥ ${total.fcPeTotalVandut!.toFixed(2)}%`);
t('acoperirea e raportată', total.acoperirePct !== null, `${total.acoperirePct?.toFixed(1)}%`);
t('netVandut = netAcoperit + netFaraReteta', aprox(total.netVandut, total.netAcoperit + total.netFaraReteta));
t('Paper Cost pe Delivery e mai mare per porție decât pe InStore (ambalaj de livrare)',
  delivery.costPaper / delivery.buc > inStore.costPaper / inStore.buc,
  `${(delivery.costPaper / delivery.buc).toFixed(4)} vs ${(inStore.costPaper / inStore.buc).toFixed(4)} lei/buc`);

console.log('\n— Acoperire incompletă: produsele fără rețetă diluează procentul —');
// un produs vândut care nu are rețetă: intră în numitor, dar nu are cost calculabil
const cuGaura: AppState = {
  ...s0,
  vanzari: [...s0.vanzari, {
    data: '2026-07-10', locatie: 'L01', canal: 'INSTORE', produs: 'FARA-RETETA',
    cant: 100, brut: 1110, net: 1000,
  }],
};
const gaura = recipeFC(cuGaura, buildCtx(cuGaura), cerere('TOTAL'));
t('acoperirea scade sub 100%', gaura.acoperirePct! < 100, `${gaura.acoperirePct!.toFixed(2)}%`);
t('vânzările fără rețetă sunt izolate', aprox(gaura.netFaraReteta, 1000));
t('costul NU crește (produsul nu are rețetă)', aprox(gaura.cost, total.cost));
t('FC pe partea acoperită rămâne cifra corectă', aprox(gaura.fcPct!, total.fcPct!, 1e-9),
  `${gaura.fcPct!.toFixed(3)}% vs ${total.fcPct!.toFixed(3)}%`);
t('FC pe tot vândutul e STRICT mai mic — subestimarea e vizibilă',
  gaura.fcPeTotalVandut! < gaura.fcPct!,
  `${gaura.fcPeTotalVandut!.toFixed(3)}% < ${gaura.fcPct!.toFixed(3)}%`);
t('produsul fără rețetă e numit, ca să poată fi reparat',
  gaura.produseFaraReteta.some(p => p.cod === 'FARA-RETETA' && p.buc === 100));
const recGaura = reconciliationFC(cuGaura, buildCtx(cuGaura), cerere('TOTAL'));
const pasAcoperire = recGaura.pasi.find(p => p.id === 'ACOPERIRE')!;
t('puntea semnalează golul de acoperire, fără să-i inventeze costul',
  !pasAcoperire.disponibil && pasAcoperire.lei === 0 && pasAcoperire.explicatie.includes('1000'),
  pasAcoperire.explicatie.slice(0, 60) + '…');
t('puntea rămâne închisă și cu acoperire incompletă', aprox(recGaura.rezidualLei!, 0, 0.01));

console.log('\n— Companie = Σ restaurante —');
const perRestaurant = s0.locatii.map(l => recipeFC(s0, ctx, cerere('TOTAL', restaurant(l.cod))));
for (const camp of ['buc', 'netVandut', 'netAcoperit', 'cost', 'costFood', 'costPaper'] as const) {
  const suma = perRestaurant.reduce((s, r) => s + r[camp], 0);
  t(`Σ restaurante = companie pe ${camp}`, aprox(suma, total[camp], 0.01),
    `${suma.toFixed(2)} vs ${total[camp].toFixed(2)}`);
}
t('fiecare restaurant are date', perRestaurant.every(r => r.buc > 0),
  perRestaurant.map((r, i) => `${s0.locatii[i].cod}:${r.buc}`).join(' '));

console.log('\n— Lună = Σ săptămâni —');
const saptamani = perioadeDinLuna('2026-07', 'SAPTAMANA')
  .map(p => recipeFC(s0, ctx, { perioada: p, nivel: COMPANIE, canal: 'TOTAL' }));
for (const camp of ['buc', 'netVandut', 'cost', 'costFood', 'costPaper'] as const) {
  const suma = saptamani.reduce((s, r) => s + r[camp], 0);
  t(`Σ săptămâni = luna pe ${camp}`, aprox(suma, total[camp], 0.01), `${suma.toFixed(2)} vs ${total[camp].toFixed(2)}`);
}
t('săptămânile sunt mai multe de una', saptamani.length > 1, `${saptamani.length} săptămâni`);
t('Recipe FC funcționează și pe zi',
  recipeFC(s0, ctx, { perioada: perioadaDin('2026-07-15', 'ZI'), nivel: COMPANIE, canal: 'TOTAL' }).buc > 0);

console.log('\n— Trasabilitate —');
t('rezultatul își poartă sursele', total.surse.length >= 3, total.surse.map(s => s.raport).join(','));
t('sursa PMIX numără rândurile intrate în calcul',
  (total.surse.find(s => s.raport === 'PMIX')?.randuri ?? 0) > 0);
t('sursele acoperă rețetarul și nomenclatorul',
  total.surse.some(s => s.raport === 'RETETAR') && total.surse.some(s => s.raport === 'NOMENCLATOR'));

// ————————————————————————————————————————————————————————— NBO FC

console.log('\n— NBO FC: raportul 2.9 —');
const nbo = nboFC(s0, cerere('TOTAL'));
t('2.9 disponibil pe luna întreagă, pe Total', nbo.disponibil);
t('componentele însumează consumul total',
  aprox(nbo.peComponenta.FOOD + nbo.peComponenta.PAPER + nbo.peComponenta.OPERATIONAL, nbo.consumTotal));
t('FC Curat = Food + Paper', aprox(nbo.consumFC, nbo.peComponenta.FOOD + nbo.peComponenta.PAPER));
t('FC Curat < consum total (există și operațional)', nbo.consumFC < nbo.consumTotal,
  `${nbo.consumFC.toFixed(0)} < ${nbo.consumTotal.toFixed(0)}`);
t('operaționalul e nenul (uniforme, administrative, curățenie)', nbo.peComponenta.OPERATIONAL > 0,
  `${nbo.peComponenta.OPERATIONAL.toFixed(0)} lei`);
t('categoriile cu diacritice sunt clasificate corect, nu raportate ca necunoscute',
  !nbo.categoriiNeclasificate.includes('Materiale curățenie'), nbo.categoriiNeclasificate.join(',') || '(niciuna)');
// categoriile care nu se potrivesc cu nicio regulă primesc implicit FOOD — semnal de calitate,
// nu un fapt: fără el, o categorie de ambalaje formulată altfel ar intra tăcut în Food
t('categoriile fără regulă sunt raportate, nu trecute tăcut pe FOOD',
  nbo.categoriiNeclasificate.includes('Carne și pui'), nbo.categoriiNeclasificate.length + ' categorii semnalate');
t('cele cu regulă NU apar ca nesemnalate',
  !nbo.categoriiNeclasificate.includes('Ambalaje') && !nbo.categoriiNeclasificate.includes('Uniforme personal'));
t('2.9 își poartă sursa', nbo.surse.some(s => s.raport === 'NBO_29' && s.randuri > 0));

console.log('\n— 2.9 refuză cinstit ce nu poate raporta —');
const nboSapt = nboFC(s0, { perioada: perioadeDinLuna('2026-07', 'SAPTAMANA')[1], nivel: COMPANIE, canal: 'TOTAL' });
t('pe săptămână: indisponibil, nu interpolat', !nboSapt.disponibil && nboSapt.consumFC === 0);
t('motivul e explicit: 2.9 e lunar', (nboSapt.motivIndisponibil ?? '').includes('lunar'), nboSapt.motivIndisponibil);
const nboCanal = nboFC(s0, cerere('DELIVERY'));
t('pe canal: indisponibil, 2.9 nu conține canalul', !nboCanal.disponibil);
t('motivul e explicit: fără canal', (nboCanal.motivIndisponibil ?? '').includes('canal'));
const fara29: AppState = { ...s0, linii29: [] };
const nboFara = nboFC(fara29, cerere('TOTAL'));
t('fără 2.9 importat: indisponibil cu motiv', !nboFara.disponibil && !!nboFara.motivIndisponibil);
t('restaurantul are propriul 2.9', nboFC(s0, cerere('TOTAL', restaurant('L01'))).disponibil);
t('Σ restaurante = companie pe consumul 2.9',
  aprox(s0.locatii.reduce((s, l) => s + nboFC(s0, cerere('TOTAL', restaurant(l.cod))).consumTotal, 0), nbo.consumTotal));

// ————————————————————————————————————————————————————————— puntea

console.log('\n— Puntea Recipe FC ↔ NBO FC —');
const rec = reconciliationFC(s0, ctx, cerere('TOTAL'));
t('diferența = 2.9 Curat − cost teoretic', aprox(rec.diferentaLei!, nbo.consumFC - total.cost));
t('procentele folosesc același numitor declarat', rec.numitor.net > 0,
  `${rec.numitor.sursa}: ${rec.numitor.net.toFixed(0)} lei`);
t('numitorul preferă Sales Report', rec.numitor.sursa === 'Sales Report');
t('FC teoretic și FC Curat se raportează la același numitor',
  aprox(rec.fcRecipePct!, (total.cost / rec.numitor.net) * 100, 1e-9)
  && aprox(rec.fcCuratPct!, (nbo.consumFC / rec.numitor.net) * 100, 1e-9));
t('FC operațional ≥ FC Curat', rec.fcOperationalPct! >= rec.fcCuratPct!,
  `${rec.fcOperationalPct!.toFixed(2)}% ≥ ${rec.fcCuratPct!.toFixed(2)}%`);

const catreCurat = rec.pasi.filter(p => p.id !== 'OPERATIONAL');
t('IDENTITATEA PUNȚII: Σ pași = diferența',
  aprox(catreCurat.reduce((s, p) => s + p.lei, 0), rec.diferentaLei!, 0.01),
  `${catreCurat.reduce((s, p) => s + p.lei, 0).toFixed(2)} vs ${rec.diferentaLei!.toFixed(2)}`);
t('rezidualul este zero', aprox(rec.rezidualLei!, 0, 0.01), rec.rezidualLei!.toFixed(6));
t('puntea NU se declară completă cât timp lipsesc pași', !rec.complet);
t('pașii necalculabili sunt marcați, nu raportați ca zero real',
  rec.pasi.filter(p => !p.disponibil).every(p => p.lei === 0 && p.explicatie.length > 20),
  rec.pasi.filter(p => !p.disponibil).map(p => p.id).join(','));
t('materialele normalizate sunt identificabile separat ca pas',
  rec.pasi.some(p => p.componenta === 'NORMALIZED'));
t('pasul de materiale normalizate spune de ce nu se poate calcula încă',
  (rec.pasi.find(p => p.componenta === 'NORMALIZED')?.explicatie ?? '').includes('material'));
t('variance-ul neexplicat este identificat',
  rec.pasi.some(p => p.componenta === 'UNEXPLAINED' && p.disponibil));
t('operaționalul e după linia de sosire, nu în punte',
  rec.pasi.find(p => p.id === 'OPERATIONAL')!.lei === nbo.peComponenta.OPERATIONAL);
t('fiecare pas are efect și în puncte procentuale',
  rec.pasi.filter(p => p.disponibil).every(p => p.pp !== null));

console.log('\n— Waste iese din „neexplicat" exact cu valoarea lui —');
const ing = s0.ingrediente.find(i => i.cod === 'I001')!;
const waste: WasteFapt[] = [{ locatie: 'L01', perioada: '2026-07', ingredient: 'I001', cant: 10, um: 'kg', motiv: 'expirat' }];
const cuWaste: AppState = { ...s0, waste };
const recW = reconciliationFC(cuWaste, ctx, cerere('TOTAL'));
const pasW = recW.pasi.find(p => p.id === 'WASTE')!;
const asteptatWaste = 10 * ing.preturi[ing.preturi.length - 1].pret;
t('pasul de waste devine disponibil', pasW.disponibil);
t('waste = cantitate × prețul ingredientului', aprox(pasW.lei, asteptatWaste, 0.01),
  `${pasW.lei.toFixed(2)} vs ${asteptatWaste.toFixed(2)}`);
t('neexplicatul scade exact cu waste-ul',
  aprox(recW.pasi.find(p => p.id === 'UNEXPLAINED')!.lei,
        rec.pasi.find(p => p.id === 'UNEXPLAINED')!.lei - pasW.lei, 0.01));
t('puntea rămâne închisă după adăugarea waste-ului',
  aprox(recW.rezidualLei!, 0, 0.01) && aprox(recW.diferentaLei!, rec.diferentaLei!, 0.01));
t('sursa de waste apare în trasabilitate', recW.surse.some(s => s.raport === 'WASTE'));

console.log('\n— Fără 2.9, puntea nu inventează zerouri —');
const recFara = reconciliationFC(fara29, ctx, cerere('TOTAL'));
t('diferența e null, nu zero', recFara.diferentaLei === null);
t('rezidualul e null, nu zero', recFara.rezidualLei === null);
t('nu se propun pași', recFara.pasi.length === 0);
t('puntea nu e completă', !recFara.complet);
t('partea de rețetar rămâne calculată', recFara.fcRecipePct !== null && recFara.recipe.cost > 0);
t('FC Curat e null fără 2.9', recFara.fcCuratPct === null);

// ————————————————————————————————————————————————————————— izolarea P&L

console.log('\n— Izolare: nicio cifră de FC nu depinde de P&L —');
const cuPL: AppState = {
  ...s0,
  setari: { ...s0.setari, comisionDeliveryPct: 35, tintaLaborPct: 99 },
  labor: [{ locatie: 'L01', luna: '2026-07', cost: 999999 }],
  costuriOperare: [{ locatie: 'L01', luna: '2026-07', chirie: 500000, utilitati: 400000, altele: 300000 }],
};
const faraPL: AppState = {
  ...s0,
  setari: { ...s0.setari, comisionDeliveryPct: 0, tintaLaborPct: 0 },
  labor: [], costuriOperare: [],
};
const rA = recipeFC(cuPL, buildCtx(cuPL), cerere('TOTAL'));
const rB = recipeFC(faraPL, buildCtx(faraPL), cerere('TOTAL'));
for (const camp of ['buc', 'netVandut', 'netAcoperit', 'cost', 'costFood', 'costPaper'] as const) {
  t(`Recipe FC invariant la P&L pe ${camp}`, aprox(rA[camp], rB[camp], 1e-9));
}
t('Recipe FC invariant la P&L pe FC%', aprox(rA.fcPct!, rB.fcPct!, 1e-9));
t('Recipe FC pe Delivery invariant la comision (comisionul e în afara scopului)',
  aprox(recipeFC(cuPL, buildCtx(cuPL), cerere('DELIVERY')).cost,
        recipeFC(faraPL, buildCtx(faraPL), cerere('DELIVERY')).cost, 1e-9));
const nA = nboFC(cuPL, cerere('TOTAL')), nB = nboFC(faraPL, cerere('TOTAL'));
t('NBO FC invariant la P&L', aprox(nA.consumFC, nB.consumFC, 1e-9) && aprox(nA.consumTotal, nB.consumTotal, 1e-9));
const recA = reconciliationFC(cuPL, buildCtx(cuPL), cerere('TOTAL'));
const recB = reconciliationFC(faraPL, buildCtx(faraPL), cerere('TOTAL'));
t('puntea invariantă la P&L', aprox(recA.diferentaLei!, recB.diferentaLei!, 1e-9));
t('pașii punții sunt identici',
  recA.pasi.every((p, i) => p.id === recB.pasi[i].id && aprox(p.lei, recB.pasi[i].lei, 1e-9)));
t('niciun câmp din rezultatele FC nu poartă comision, labor sau profit',
  !JSON.stringify({ r: rA, n: nA, b: { ...recA, recipe: null, nbo: null } })
    .match(/comision|labor|ebitda|profitReal|prime/i));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
