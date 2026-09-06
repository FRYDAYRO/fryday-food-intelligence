// Puntea la nivel de material între 2.9 și Recipe FC.
//
// Identități verificate:
//   Σ găleți A–F            = totalul 2.9 (fiecare leu într-o singură găleată)
//   explained + unexplained = totalul 2.9
//   Σ restaurante + fără locație = companie
//   complete = false        ori de câte ori dovada pe material e insuficientă
//   nimic nu se inventează  : fără canal → UNKNOWN; săptămână → indisponibil
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx } from '../src/lib/engine';
import { COMPANIE, perioadaDin, perioadeDinLuna, restaurant, type CerereFC, type FCChannel } from '../src/lib/fc-domeniu';
import { reconciliationMaterialFC, type GaleataBridge } from '../src/lib/fc-material';
import type { AppState, Ingredient, Material29 } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const LUNA = perioadaDin('2026-07-15', 'LUNA');
const cer = (canal: FCChannel = 'TOTAL', nivel = COMPANIE): CerereFC => ({ perioada: LUNA, nivel, canal });

const mat = (o: Partial<Material29> & Pick<Material29, 'material' | 'categorie' | 'costActual'>): Material29 => ({
  perioada: '2026-07', locatie: 'L01', denumire: o.material, cant: null, um: null,
  costTeoretic: null, ...o,
});

// ————————————————————————————————————————————————————————— fixtura curată

// fiecare material se mapează pe un ingredient folosit în rețete, are categorie cunoscută,
// preț, locație, perioadă și cost teoretic declarat → puntea trebuie să se poată închide
const CURATE: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 4000, costTeoretic: 3800, cant: 280, um: 'kg' }),
  mat({ material: 'I005', denumire: 'Chiflă burger', categorie: 'Panificație', costActual: 1200, costTeoretic: 1150, cant: 1500, um: 'buc' }),
  mat({ material: 'I011', denumire: 'Salată iceberg', categorie: 'Legume și sosuri', costActual: 300, costTeoretic: 280 }),
  mat({ material: 'A001', denumire: 'Hârtie ambalaj burger', categorie: 'Ambalaje', costActual: 500, costTeoretic: 480 }),
  mat({ material: 'A002', denumire: 'Cutie delivery burger', categorie: 'Ambalaje', costActual: 700, costTeoretic: 690 }),
];
const sCurat: AppState = { ...genereazaSeed(), materiale29: CURATE };
const ctxCurat = buildCtx(sCurat);

console.log('— Fixtura curată: puntea se poate închide complet —');
const rc = reconciliationMaterialFC(sCurat, ctxCurat, cer());
const TOTAL_CURAT = CURATE.reduce((s, m) => s + m.costActual, 0);
t('reconcilierea e disponibilă', rc.disponibil);
t('totalul 2.9 e suma liniilor', aprox(rc.nboActual, TOTAL_CURAT), `${rc.nboActual} vs ${TOTAL_CURAT}`);
t('Σ găleți A–F = totalul 2.9', aprox(rc.bridge.reduce((s, b) => s + b.lei, 0), rc.nboActual));
t('explained + unexplained = total', aprox(rc.explainedAmount + rc.unexplainedAmount, rc.nboActual));
t('nimic neexplicat', rc.unexplainedAmount === 0, `${rc.unexplainedAmount} lei`);
t('nimic neclasificat', rc.bridge.find(b => b.galeata === 'UNCLASSIFIED')!.lei === 0);
t('explicat 100%', aprox(rc.explainedPct!, 100));
t('COMPLETE = true', rc.complete, rc.motiveIncomplet.join(' | ') || '(fără motive)');
t('teoreticul declarat în 2.9 e folosit ca atare', aprox(rc.nboTeoretic!, 6400), `${rc.nboTeoretic}`);
t('variance pe material = actual − teoretic',
  aprox(rc.randuri.find(r => r.material === 'I001')!.variance!, 200));
t('Food merge în găleata A', rc.bridge.find(b => b.galeata === 'RECIPE_FOOD')!.lei === 4000 + 1200 + 300);
t('Paper merge în găleata B', rc.bridge.find(b => b.galeata === 'RECIPE_PAPER')!.lei === 500 + 700);
t('Food Cost-ul 2.9 = A + B + C', aprox(rc.nboFoodCost, TOTAL_CURAT));
t('diferența NBO teoretic − Recipe FC e calculată',
  rc.diferentaTeoreticVsRecipe !== null && aprox(rc.diferentaTeoreticVsRecipe, rc.nboTeoretic! - rc.recipe.cost));
t('diferența NBO real − Recipe FC e calculată', aprox(rc.diferentaActualVsRecipe, rc.nboFoodCost - rc.recipe.cost));
t('cantitatea și UM se păstrează unde există',
  rc.randuri.find(r => r.material === 'I001')!.cant === 280 && rc.randuri.find(r => r.material === 'I001')!.um === 'kg');
t('unde cantitatea lipsește rămâne null, nu zero', rc.randuri.find(r => r.material === 'I011')!.cant === null);

// ————————————————————————————————————————————————————————— fixtura murdară

const ingNefolosit: Ingredient = {
  cod: 'I099', denumire: 'Ingredient nefolosit', categorie: 'Carne', tip: 'FOOD', um: 'kg',
  preturi: [{ validDeLa: '2026-01-01', pret: 20 }], activ: true,
};
const ingFaraPret: Ingredient = {
  cod: 'I098', denumire: 'Ingredient fără preț', categorie: 'Carne', tip: 'FOOD', um: 'kg',
  preturi: [], activ: true,
};
const MURDARE: Material29[] = [
  ...CURATE,
  mat({ material: 'MAT-X', denumire: 'Material necunoscut', categorie: 'Carne și pui', costActual: 900 }),
  mat({ material: 'I099', denumire: 'Ingredient nefolosit', categorie: 'Carne și pui', costActual: 250 }),
  mat({ material: 'I098', denumire: 'Ingredient fără preț', categorie: 'Carne și pui', costActual: 120 }),
  mat({ material: 'MAT-Z', denumire: 'Servicii externalizate', categorie: 'Transport marfă', costActual: 400 }),
  mat({ material: 'NORM-1', denumire: 'Pui porționat intern', categorie: 'Carne și pui', costActual: 600, normalizat: true }),
  mat({ material: 'AMB-NOU', denumire: 'Ambalaj nou nemapat', categorie: 'Ambalaje', costActual: 350 }),
  mat({ material: 'CUR-1', denumire: 'Detergent podea', categorie: 'Materiale curățenie', costActual: 180 }),
  mat({ material: 'UNI-1', denumire: 'Tricouri', categorie: 'Uniforme personal', costActual: 220 }),
  mat({ material: 'I001-BIS', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 150 }),   // mapare dublă pe denumire
  mat({ material: 'FARA-LOC', denumire: 'Linie fără restaurant', categorie: 'Panificație', costActual: 90, locatie: null }),
];
const baza = genereazaSeed();
const sMurdar: AppState = {
  ...baza,
  ingrediente: [...baza.ingrediente, ingNefolosit, ingFaraPret],
  materiale29: MURDARE,
};
const ctxMurdar = buildCtx(sMurdar);
const rm = reconciliationMaterialFC(sMurdar, ctxMurdar, cer());
const TOTAL_MURDAR = MURDARE.reduce((s, m) => s + m.costActual, 0);

console.log('\n— Fixtura murdară: fiecare leu ajunge într-o singură găleată —');
t('Σ găleți A–F = totalul 2.9', aprox(rm.bridge.reduce((s, b) => s + b.lei, 0), TOTAL_MURDAR),
  `${rm.bridge.reduce((s, b) => s + b.lei, 0)} vs ${TOTAL_MURDAR}`);
t('explained + unexplained = total', aprox(rm.explainedAmount + rm.unexplainedAmount, rm.nboActual));
t('explainedPct + unexplainedPct = 100', aprox(rm.explainedPct! + rm.unexplainedPct!, 100));
t('fiecare material apare exact o dată în randuri', rm.randuri.length === MURDARE.length);
t('numărul de materiale pe găleți însumează totalul',
  rm.bridge.reduce((s, b) => s + b.nrMateriale, 0) === MURDARE.length);
for (const b of rm.bridge) console.log(`      ${b.eticheta.padEnd(30)} ${String(b.lei).padStart(6)} lei · ${b.nrMateriale} materiale`);

console.log('\n— Alocarea pe găleți —');
const g = (x: GaleataBridge) => rm.bridge.find(b => b.galeata === x)!;
// I001-BIS se mapează pe I001 (folosit în rețete), deci e Food explicat de rețetar —
// dublura lui e o problemă de calitate a datelor, semnalată separat, nu un leu neexplicat
t('A · Food din rețete, inclusiv materialul mapat pe denumire',
  g('RECIPE_FOOD').lei === 4000 + 1200 + 300 + 150, `${g('RECIPE_FOOD').lei}`);
t('B · Paper din rețete', g('RECIPE_PAPER').lei === 500 + 700, `${g('RECIPE_PAPER').lei}`);
t('C · normalizate: marcat în sursă + ambalaj fără rețetă',
  g('NORMALIZED_PAPER').lei === 600 + 350, `${g('NORMALIZED_PAPER').lei}`);
t('D · operațional: curățenie + uniforme', g('OPERATIONAL').lei === 180 + 220, `${g('OPERATIONAL').lei}`);
t('E · neclasificat: categoria necunoscută, NU presupusă Food', g('UNCLASSIFIED').lei === 400, `${g('UNCLASSIFIED').lei}`);
t('F · neexplicat: Food fără rețetă sau fără mapare',
  g('UNEXPLAINED').lei === 900 + 250 + 120 + 90, `${g('UNEXPLAINED').lei}`);
t('materialul nemapat NU e presupus explicat',
  rm.randuri.find(r => r.material === 'MAT-X')!.areIngredient === false);

console.log('\n— Reconciliere incompletă, declarată ca atare —');
t('COMPLETE = false', !rm.complete);
t('motivele sunt enumerate, nu ascunse', rm.motiveIncomplet.length >= 3, `${rm.motiveIncomplet.length} motive`);
t('un motiv menționează leii neatribuiți', rm.motiveIncomplet.some(m => m.includes('neatribuiți')));
t('un motiv menționează categoriile nerecunoscute', rm.motiveIncomplet.some(m => m.includes('nerecunoscute')));
t('puntea NU e forțată la 100%', rm.explainedPct! < 100, `${rm.explainedPct!.toFixed(1)}%`);
t('neexplicatul e nenul și vizibil', rm.unexplainedAmount > 0);

console.log('\n— Maparea material → rețetă —');
const r001 = rm.randuri.find(r => r.material === 'I001')!;
t('material mapat pe ingredient', r001.areIngredient && r001.ingredient === 'I001');
t('ingredientul e folosit în rețete', r001.areReteta && r001.utilizareInRetete > 0, `${r001.utilizareInRetete} rețete`);
t('ingredientul are preț', r001.arePret);
const r099 = rm.randuri.find(r => r.material === 'I099')!;
t('mapat, dar nefolosit în nicio rețetă', r099.areIngredient && !r099.areReteta && r099.utilizareInRetete === 0);
t('mapat fără preț e semnalat', rm.randuri.find(r => r.material === 'I098')!.arePret === false);
t('maparea pe denumire funcționează când codul diferă',
  rm.randuri.find(r => r.material === 'I001-BIS')!.ingredient === 'I001');

console.log('\n— Diagnostice de calitate a datelor —');
const d = (cod: string) => rm.diagnostice.find(x => x.cod === cod);
for (const cod of ['MATERIAL_FARA_MAPARE', 'MATERIAL_FARA_RETETA', 'MATERIAL_FARA_PRET', 'CATEGORIE_NECUNOSCUTA',
  'MATERIAL_NORMALIZAT', 'IN_NBO_FARA_RETETA', 'INGREDIENT_FARA_NBO', 'MAPARE_DUBLA', 'LIPSA_LOCATIE'] as const) {
  t(`diagnostic prezent: ${cod}`, !!d(cod), d(cod) ? `${d(cod)!.nrElemente} elemente · ${Math.round(d(cod)!.lei)} lei` : 'LIPSĂ');
}
// se cere mapare doar pentru FOOD/PAPER: curățenia și uniformele nu sunt ingrediente,
// iar normalizatele prin definiție nu au corespondent în rețetar
t('se cere mapare doar pentru materialele de Food Cost', d('MATERIAL_FARA_MAPARE')!.nrElemente === 2,
  d('MATERIAL_FARA_MAPARE')!.exemple.join(' | '));
t('curățenia și uniformele NU sunt cerute în nomenclatorul de ingrediente',
  !d('MATERIAL_FARA_MAPARE')!.exemple.some(e => /Detergent|Tricouri|Servicii/.test(e)));
t('categoria necunoscută e raportată cu numele ei',
  d('CATEGORIE_NECUNOSCUTA')!.exemple.some(e => e.includes('Transport marfă')));
t('maparea dublă e semnalată', d('MAPARE_DUBLA')!.nrElemente === 1, d('MAPARE_DUBLA')!.exemple.join(''));
t('lipsa locației e semnalată', d('LIPSA_LOCATIE')!.nrElemente === 1);
t('fiecare diagnostic propune o acțiune', rm.diagnostice.every(x => x.actiune.length > 10));
t('diagnosticele blocante sunt primele', rm.diagnostice[0].nivel === 'BLOCANT');
t('materialul normalizat e doar INFO, nu blocant', d('MATERIAL_NORMALIZAT')!.nivel === 'INFO');
t('fixtura curată nu are diagnostice blocante',
  !rc.diagnostice.some(x => x.nivel === 'BLOCANT'), rc.diagnostice.map(x => x.cod).join(','));

console.log('\n— Materiale normalizate —');
t('normalizatul din sursă e marcat', rm.randuri.find(r => r.material === 'NORM-1')!.normalizat);
t('ambalajul fără rețetă devine normalizat', rm.randuri.find(r => r.material === 'AMB-NOU')!.categorie === 'NORMALIZED');
t('normalizatele intră în Food Cost-ul 2.9',
  aprox(rm.nboFoodCost, g('RECIPE_FOOD').lei + g('RECIPE_PAPER').lei + g('NORMALIZED_PAPER').lei));
t('normalizatele sunt identificabile separat, nu topite în Paper',
  g('NORMALIZED_PAPER').lei > 0 && g('NORMALIZED_PAPER').lei !== g('RECIPE_PAPER').lei);

console.log('\n— Canal: 2.9 nu îl conține —');
t('canalul sursă e UNKNOWN', rm.canalSursa === 'UNKNOWN');
t('fiecare rând poartă canal UNKNOWN', rm.randuri.every(r => r.canal === 'UNKNOWN'));
for (const canal of ['INSTORE', 'DELIVERY'] as FCChannel[]) {
  const r = reconciliationMaterialFC(sMurdar, ctxMurdar, cer(canal));
  t(`cerere pe ${canal}: indisponibilă, nu repartizată`, !r.disponibil && r.nboActual === 0);
  t(`motivul spune că sursa nu are canal`, (r.motivIndisponibil ?? '').includes('canal'));
}

console.log('\n— Perioadă: 2.9 e lunar —');
t('perioada sursă e păstrată', rm.perioadeSursa.join(',') === '2026-07', rm.perioadeSursa.join(','));
t('fiecare rând poartă perioada sursă', rm.randuri.every(r => r.perioadaSursa === '2026-07'));
const rSapt = reconciliationMaterialFC(sMurdar, ctxMurdar, {
  perioada: perioadeDinLuna('2026-07', 'SAPTAMANA')[1], nivel: COMPANIE, canal: 'TOTAL',
});
t('cerere săptămânală: indisponibilă', !rSapt.disponibil);
t('nu se fabrică valori săptămânale din date lunare', rSapt.nboActual === 0 && rSapt.randuri.length === 0);
t('motivul spune că raportul e lunar', (rSapt.motivIndisponibil ?? '').includes('lunar'));
t('luna funcționează', reconciliationMaterialFC(sMurdar, ctxMurdar, cer()).disponibil);
const rIunie = reconciliationMaterialFC(sMurdar, ctxMurdar, { perioada: perioadaDin('2026-06-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' });
t('o lună fără date pe material e indisponibilă, nu zero fals', !rIunie.disponibil);

console.log('\n— Companie și restaurant —');
const sMulti: AppState = {
  ...sMurdar,
  materiale29: [
    ...CURATE.map(m => ({ ...m, locatie: 'L01' })),
    ...CURATE.map(m => ({ ...m, material: `${m.material}-B`, locatie: 'L02' })),
    mat({ material: 'ORFAN', denumire: 'Fără restaurant', categorie: 'Panificație', costActual: 77, locatie: null }),
  ],
};
const ctxMulti = buildCtx(sMulti);
const comp = reconciliationMaterialFC(sMulti, ctxMulti, cer('TOTAL', COMPANIE));
const l01 = reconciliationMaterialFC(sMulti, ctxMulti, cer('TOTAL', restaurant('L01')));
const l02 = reconciliationMaterialFC(sMulti, ctxMulti, cer('TOTAL', restaurant('L02')));
t('fiecare restaurant are propriile materiale', l01.randuri.length === 5 && l02.randuri.length === 5);
t('L01 și L02 au același total (fixturi simetrice)', aprox(l01.nboActual, l02.nboActual));
t('Σ restaurante + liniile fără locație = companie',
  aprox(l01.nboActual + l02.nboActual + 77, comp.nboActual),
  `${l01.nboActual} + ${l02.nboActual} + 77 vs ${comp.nboActual}`);
t('liniile fără locație NU apar la niciun restaurant',
  !l01.randuri.some(r => r.material === 'ORFAN') && !l02.randuri.some(r => r.material === 'ORFAN'));
t('dar apar la companie', comp.randuri.some(r => r.material === 'ORFAN'));
t('compania semnalează liniile fără restaurant', comp.diagnostice.some(x => x.cod === 'LIPSA_LOCATIE'));
t('Σ găleți pe restaurant = totalul restaurantului',
  aprox(l01.bridge.reduce((s, b) => s + b.lei, 0), l01.nboActual));
t('Recipe FC-ul e cel al restaurantului, nu al rețelei', l01.recipe.cost < comp.recipe.cost,
  `${l01.recipe.cost.toFixed(0)} < ${comp.recipe.cost.toFixed(0)}`);

console.log('\n— Granularitate mixtă: companie vs restaurant —');
t('compania cu ambele forme primește diagnosticul, ca ATENȚIE când materialele nu se suprapun',
  comp.diagnostice.some(d => d.cod === 'GRANULARITATE_MIXTA' && d.nivel === 'ATENTIE'));
t('la nivel de restaurant diagnosticul NU apare (formele nu se însumează acolo)',
  !l01.diagnostice.some(d => d.cod === 'GRANULARITATE_MIXTA'));
// suprapunere reală: același material și cu restaurant, și fără → numărat de două ori
const sDublu: AppState = {
  ...genereazaSeed(),
  materiale29: [
    mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 600, locatie: 'L01' }),
    mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 1000, locatie: null }),
  ],
};
const rDublu = reconciliationMaterialFC(sDublu, buildCtx(sDublu), cer('TOTAL', COMPANIE));
const dDublu = rDublu.diagnostice.find(d => d.cod === 'GRANULARITATE_MIXTA')!;
t('materialul prezent în AMBELE forme → BLOCANT, cu leii dublurii',
  dDublu.nivel === 'BLOCANT' && aprox(dDublu.lei, 1000), `${dDublu.nivel} · ${dDublu.lei}`);
t('dublarea face reconcilierea incompletă', !rDublu.complete);

console.log('\n— Trasabilitate —');
t('sursele includ 2.9 pe material', rm.surse.some(s => s.raport === 'NBO_29' && s.randuri === MURDARE.length));
t('sursa notează că raportul nu are canal', rm.surse.some(s => (s.nota ?? '').includes('canal necunoscut')));
t('sursele includ și PMIX, și rețetarul',
  rm.surse.some(s => s.raport === 'PMIX') && rm.surse.some(s => s.raport === 'RETETAR'));
t('fiecare rând declară raportul-sursă', rm.randuri.every(r => r.sursa === 'NBO_29'));

console.log('\n— Fără date pe material —');
const fara = reconciliationMaterialFC(genereazaSeed(), buildCtx(genereazaSeed()), cer());
t('indisponibil când nu s-a importat 2.9 pe material', !fara.disponibil);
t('motivul explică de ce puntea pe material nu se poate face',
  (fara.motivIndisponibil ?? '').includes('material'));
t('complete = false', !fara.complete);
t('Recipe FC rămâne calculat chiar și așa', fara.recipe.cost > 0);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
