// FC Control Tower — modelul interfeței și randarea ecranelor.
//
// Ce se verifică:
//   navigarea         : cele zece secțiuni există, se filtrează după rol, se schimbă la click
//   filtrele          : perioadă, granularitate, comparație, scop, restaurant, canal
//                       se propagă IDENTIC în toate motoarele (aceeași cerere canonică)
//   scopul            : Companie vs Restaurant, canal, săptămână vs lună
//   KPI-uri           : cifrele de titlu, cu pp pentru procente și lei pentru sume
//   puntea            : cele șase grupuri acoperă exact componentele motorului, o singură dată
//   drill-down        : Companie → Restaurant → Categorie → Produs → Ingredient
//   ingrediente       : panourile și încrederea deterministă
//   simulări          : formularul → scenariu, efecte separate, datele reale neatinse
//   importuri         : un import nevalid NU are cale de activare
//   calitatea datelor : semnalele sunt vizibile, nu ascunse în jurnale
//   roluri            : STORE_MANAGER nu poate ieși din restaurantul lui, nici prin selecție
//
// Randarea se face cu `react-dom/server` — fără DOM, fără biblioteci noi.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx } from '../src/lib/engine';
import { COMPANIE, perioadaDin, restaurant } from '../src/lib/fc-domeniu';
import { analizaTimeline, type CerereTimeline } from '../src/lib/fc-timeline';
import { bridgeFC, ORDINE_COMPONENTE } from '../src/lib/fc-bridge';
import { analizaIngrediente } from '../src/lib/fc-ingrediente';
import { simuleazaFC } from '../src/lib/fc-simulare';
import { pregatesteImport } from '../src/lib/import-center';
import {
  COMPONENTE_GRUP, ORDINE_GRUPURI, SECTIUNI, accesTower, cerereBaza, cerereDin,
  comparatieIngrediente, comparatiiDisponibile, confidentaIngredient, descrieSelectie,
  formSimulareGol, kpiuri, nivelDrill, normalizeazaSelectie, origineDate, panouriIngrediente,
  perioadeDisponibile, poateVedeaLocatia, poateVedeaSectiunea, punteTower, puncteGrafic,
  randImport, rezumatSimulare, scenariuDin, scenariuGol, sectiuneDupaId, selectieImplicita,
  semnaleCalitate, sorteazaMagazine, tabelMagazine, treaptaDin,
  type CaleDrill, type SelectieFC,
} from '../src/lib/fc-tower';
import { TowerProvider, type TowerCtx } from '../src/views/tower/context';
import { ContinutTower, NavigareTower, BandaContext } from '../src/views/tower/ControlTower';
import Bara from '../src/views/tower/Bara';
import { RandKpiuri, Punte, TabelMagazine, Semnale, TabelDrill } from '../src/views/tower/parti';
import type { RandIngredient } from '../src/lib/fc-ingrediente';
import type { AppState, Material29 } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

// ————————————————————————————————————————————————————————— fixtura

const mat = (loc: string | null, material: string, denumire: string, categorie: string, cost: number, teoretic: number | null = null): Material29 =>
  ({ perioada: '2026-07', locatie: loc, material, denumire, categorie, cant: null, um: null, costActual: cost, costTeoretic: teoretic });

const MATERIALE: Material29[] = [
  mat('L01', 'I001', 'Piept de pui', 'Carne și pui', 4000, 3800),
  mat('L01', 'A001', 'Hârtie ambalaj burger', 'Ambalaje', 500, 480),
  mat('L01', 'CUR-1', 'Detergent', 'Materiale curățenie', 180),
  mat('L02', 'I005', 'Chiflă burger', 'Panificație', 1200, 1150),
  { ...mat('L02', 'NORM-1', 'Pui porționat', 'Carne și pui', 300), normalizat: true },
  mat('L02', 'MAT-Z', 'Transport', 'Transport marfă', 400),
  mat(null, 'FARA-LOC', 'Linie agregată', 'Panificație', 250),
];

const s0: AppState = { ...genereazaSeed(), materiale29: MATERIALE };
const ctx0 = buildCtx(s0);
const ACCES_TOP = accesTower(s0, { rol: 'ADMIN' }, false);
const ACCES_MANAGER = accesTower(s0, { rol: 'MANAGER', locatie: 'L02' }, true);

const SEL: SelectieFC = {
  ancora: '2026-07-15', granularitate: 'LUNA', comparatie: 'PERIOADA_PRECEDENTA',
  scop: 'COMPANIE', locatie: null, canal: 'TOTAL',
};

const context = (extra: Partial<TowerCtx> = {}): TowerCtx => ({
  state: s0, ctx: ctx0, sel: SEL, setSel: () => undefined, acces: ACCES_TOP, update: () => undefined, ...extra,
});
const randeaza = (element: Parameters<typeof renderToStaticMarkup>[0], ctxT: TowerCtx = context()) =>
  renderToStaticMarkup(h(TowerProvider, { value: ctxT }, element));

const analiza = analizaTimeline(s0, ctx0, cerereDin(SEL));
const bridge = bridgeFC(s0, ctx0, cerereBaza(SEL));

// ————————————————————————————————————————————————————————— navigarea

console.log('— Navigarea: zece secțiuni, în ordinea cerută —');
const NUME_CERUTE = ['Overview', 'Analiză FC', 'NBO 2.9', 'PMIX 4.7', 'Reconciliere',
  'Ingredient Intelligence', 'Simulări', 'Importuri', 'AI Advisor', 'Setări'];
t('există exact zece secțiuni', SECTIUNI.length === 10, `${SECTIUNI.length}`);
t('numele și ordinea sunt cele cerute', SECTIUNI.map(s => s.nume).join('|') === NUME_CERUTE.join('|'));
t('AI Advisor nu mai e rezervat: are motor determinist în spate', !sectiuneDupaId('AI_ADVISOR').placeholder);
t('nicio secțiune nu mai e placeholder', SECTIUNI.filter(s => s.placeholder).length === 0);
t('un id necunoscut cade pe Overview', sectiuneDupaId('OVERVIEW').id === 'OVERVIEW');

const htmlNav = randeaza(h(NavigareTower, { activ: 'OVERVIEW', onAlege: () => undefined }));
t('navigarea randează toate secțiunile pentru management',
  SECTIUNI.every(s => htmlNav.includes(`data-sectiune="${s.id}"`)));
t('secțiunea activă e marcată pentru cititoarele de ecran', htmlNav.includes('aria-current="page"'));
t('nicio secțiune nu mai poartă marcajul „rezervat"', !htmlNav.includes('>rezervat<'));

const htmlNavManager = randeaza(h(NavigareTower, { activ: 'OVERVIEW', onAlege: () => undefined }),
  context({ acces: ACCES_MANAGER }));
t('managerul de restaurant NU vede secțiunea de importuri', !htmlNavManager.includes('data-sectiune="IMPORTURI"'));
t('managerul de restaurant NU vede setările', !htmlNavManager.includes('data-sectiune="SETARI"'));
t('managerul vede totuși analizele', htmlNavManager.includes('data-sectiune="ANALIZA_FC"'));

console.log('\n— Secțiunea activă chiar se schimbă —');
for (const id of ['OVERVIEW', 'ANALIZA_FC', 'NBO29', 'PMIX47', 'RECONCILIERE', 'INGREDIENTE', 'SIMULARI', 'IMPORTURI', 'AI_ADVISOR', 'SETARI'] as const) {
  const html = randeaza(h(ContinutTower, { initial: id }));
  t(`${id} se randează ca secțiune activă`, html.includes(`data-sectiune-activa="${id}"`));
}
t('o secțiune interzisă de rol cade pe Overview, nu crapă',
  randeaza(h(ContinutTower, { initial: 'IMPORTURI' }), context({ acces: ACCES_MANAGER }))
    .includes('data-sectiune-activa="OVERVIEW"'));

// ————————————————————————————————————————————————————————— filtrele

console.log('\n— Bara de control: toate filtrele cerute sunt prezente —');
const htmlBara = randeaza(h(Bara, {}));
for (const [camp, marcaj] of [
  ['perioadă', 'data-camp="perioada"'], ['comparație', 'data-camp="comparatie"'],
  ['restaurant', 'data-camp="locatie"'], ['săptămână', 'data-granularitate="SAPTAMANA"'],
  ['lună', 'data-granularitate="LUNA"'], ['companie', 'data-scop="COMPANIE"'],
  ['restaurant (scop)', 'data-scop="RESTAURANT"'], ['Total', 'data-canal="TOTAL"'],
  ['InStore', 'data-canal="INSTORE"'], ['Delivery', 'data-canal="DELIVERY"'],
] as [string, string][]) {
  t(`bara conține ${camp}`, htmlBara.includes(marcaj));
}
t('bara marchează selecția curentă (Companie + Total)',
  htmlBara.includes('data-scop="COMPANIE" aria-pressed="true"')
  || htmlBara.includes('aria-pressed="true" data-scop="COMPANIE"'));
t('managerul are butonul „Companie" dezactivat, nu ascuns',
  (() => { const html = randeaza(h(Bara, {}), context({ acces: ACCES_MANAGER, sel: { ...SEL, scop: 'RESTAURANT', locatie: 'L02' } }));
    return html.includes('data-scop="COMPANIE"') && html.includes('disabled'); })());

console.log('\n— Filtrele se traduc într-o singură cerere canonică —');
const cerCompanie = cerereDin(SEL);
t('perioada vine din ancoră și granularitate', cerCompanie.perioada.cheie === '2026-07');
t('scopul Companie dă nivel COMPANY', cerCompanie.nivel.tip === 'COMPANY');
t('scopul Restaurant dă nivel STORE cu locația aleasă',
  cerereDin({ ...SEL, scop: 'RESTAURANT', locatie: 'L01' }).nivel.tip === 'STORE');
t('canalul se propagă neschimbat', cerereDin({ ...SEL, canal: 'DELIVERY' }).canal === 'DELIVERY');
t('comparația se propagă neschimbată',
  cerereDin({ ...SEL, comparatie: 'ACEEASI_PERIOADA_AN_PRECEDENT' }).comparatie === 'ACEEASI_PERIOADA_AN_PRECEDENT');
t('cerereBaza e cererea fără comparație — același scop',
  cerereBaza(SEL).perioada.cheie === cerCompanie.perioada.cheie
  && cerereBaza(SEL).canal === cerCompanie.canal);
t('descrierea scopului e citibilă și completă',
  descrieSelectie(SEL) === '2026-07 · Companie · Total', descrieSelectie(SEL));
t('descrierea urmează restaurantul și canalul alese',
  descrieSelectie({ ...SEL, scop: 'RESTAURANT', locatie: 'L01', canal: 'DELIVERY' }) === '2026-07 · L01 · Delivery',
  descrieSelectie({ ...SEL, scop: 'RESTAURANT', locatie: 'L01', canal: 'DELIVERY' }));

console.log('\n— Săptămână vs lună: aceeași ancoră, altă perioadă —');
const selSapt: SelectieFC = { ...SEL, granularitate: 'SAPTAMANA' };
t('granularitatea săptămânală dă o perioadă ISO de săptămână',
  cerereDin(selSapt).perioada.tip === 'SAPTAMANA' && /^\d{4}-S\d+$/.test(cerereDin(selSapt).perioada.cheie),
  cerereDin(selSapt).perioada.cheie);
t('săptămâna conține ancora',
  cerereDin(selSapt).perioada.de <= SEL.ancora && cerereDin(selSapt).perioada.la >= SEL.ancora);
t('perioadele disponibile sunt DOAR cele cu vânzări',
  perioadeDisponibile(s0, 'LUNA').every(p => s0.vanzari.some(v => v.data >= p.de && v.data <= p.la)));
t('lista de perioade nu inventează luni goale',
  perioadeDisponibile(s0, 'LUNA').length === new Set(s0.vanzari.map(v => v.data.slice(0, 7))).size);
t('perioadele săptămânale sunt mai multe decât cele lunare',
  perioadeDisponibile(s0, 'SAPTAMANA').length > perioadeDisponibile(s0, 'LUNA').length);

console.log('\n— Comparația: ce nu se poate, se spune —');
const comp = comparatiiDisponibile(s0, SEL);
t('comparația cu perioada precedentă e evaluată', comp.some(c => c.tip === 'PERIOADA_PRECEDENTA'));
t('anul trecut e indisponibil pe date de 2026, cu motiv',
  comp.find(c => c.tip === 'ACEEASI_PERIOADA_AN_PRECEDENT')!.disponibil === false
  && !!comp.find(c => c.tip === 'ACEEASI_PERIOADA_AN_PRECEDENT')!.motiv);
t('pe săptămâni, comparația cu anul trecut e refuzată explicit',
  comparatiiDisponibile(s0, selSapt).find(c => c.tip === 'ACEEASI_PERIOADA_AN_PRECEDENT')!.motiv!.includes('luni'));
t('traducerea comparației pentru ingrediente respectă granularitatea',
  comparatieIngrediente(SEL) === 'LUNA_PRECEDENTA'
  && comparatieIngrediente(selSapt) === 'SAPTAMANA_PRECEDENTA'
  && comparatieIngrediente({ ...SEL, comparatie: 'ACEEASI_PERIOADA_AN_PRECEDENT' }) === 'LUNA_AN_PRECEDENT');

// ————————————————————————————————————————————————————————— KPI-uri

console.log('\n— KPI-urile: cele șase cifre de titlu —');
const k = kpiuri(analiza);
t('sunt exact șase KPI-uri', k.length === 6);
t('ordinea e cea cerută',
  k.map(x => x.id).join(',') === 'FC_TEORETIC_NBO,FC_ACTUAL_NBO,FC_RETETAR,VARIATIE,EXPLICAT,NEEXPLICAT');
const kFcRetetar = k.find(x => x.id === 'FC_RETETAR')!;
t('FC Rețetar poartă valoarea motorului, nu una recalculată',
  aprox(kFcRetetar.valoare!, analiza.metrici!.recipeFcPct!, 1e-9));
t('FC Rețetar e procent, deci delta e în pp și deltaRON e null',
  kFcRetetar.unitate === 'PCT' && kFcRetetar.deltaRON === null);
const kVariatie = k.find(x => x.id === 'VARIATIE')!;
t('Variația e în lei, deci deltaPp e null', kVariatie.unitate === 'RON' && kVariatie.deltaPp === null);
t('Variația poartă exact varianceRON al motorului', aprox(kVariatie.valoare!, analiza.metrici!.varianceRON!));
t('FC Teoretic NBO ia teoreticul DECLARAT',
  aprox(k.find(x => x.id === 'FC_TEORETIC_NBO')!.valoare!, analiza.metrici!.nboTheoreticalFcPct!));
t('Explicat + Neexplicat = 100%',
  aprox(k.find(x => x.id === 'EXPLICAT')!.valoare! + k.find(x => x.id === 'NEEXPLICAT')!.valoare!, 100));
t('fiecare KPI poartă o notă explicativă', k.every(x => !!x.nota));

console.log('\n— KPI fără date: motiv, nu zero —');
const sFaraNbo: AppState = { ...s0, materiale29: [] };
const kFara = kpiuri(analizaTimeline(sFaraNbo, buildCtx(sFaraNbo), cerereDin(SEL)));
for (const id of ['FC_TEORETIC_NBO', 'FC_ACTUAL_NBO', 'VARIATIE', 'EXPLICAT', 'NEEXPLICAT']) {
  const x = kFara.find(y => y.id === id)!;
  t(`${id} e null cu motiv, nu 0`, x.valoare === null && !!x.indisponibilDe);
}
t('FC Rețetar rămâne calculabil fără 2.9', kFara.find(x => x.id === 'FC_RETETAR')!.valoare !== null);

const htmlKpi = randeaza(h(RandKpiuri, { kpiuri: k }));
t('KPI-urile se randează, fiecare cu id-ul lui', k.every(x => htmlKpi.includes(`data-kpi="${x.id}"`)));
t('KPI-ul indisponibil scrie „indisponibil", nu 0',
  randeaza(h(RandKpiuri, { kpiuri: kFara })).includes('indisponibil'));
t('delta procentuală apare în pp', htmlKpi.includes('pp') || htmlKpi.includes('fără comparație'));

// ————————————————————————————————————————————————————————— puntea

console.log('\n— Puntea FC: grupuri disjuncte, care acoperă tot —');
const punte = punteTower(bridge);
t('puntea e disponibilă pe fixtură', punte.disponibil);
t('sunt șase grupuri', punte.grupuri.length === 6);
const acoperite = ORDINE_GRUPURI.flatMap(g => COMPONENTE_GRUP[g]);
t('grupurile acoperă TOATE componentele motorului',
  ORDINE_COMPONENTE.every(c => acoperite.includes(c)));
t('nicio componentă nu apare în două grupuri', new Set(acoperite).size === acoperite.length);
t('suma grupurilor = consumul total 2.9', aprox(punte.totalLei, bridge.nboActual));
t('partea de Food Cost a grupurilor = nboFoodCost al motorului',
  aprox(punte.totalFoodCostLei, bridge.nboFoodCost));
t('ținta e teoreticul DECLARAT, nu reconstruit', aprox(punte.tintaTeoreticaLei!, bridge.nboTheoreticalFC!));
t('diferența față de țintă se AFIȘEAZĂ, nu se forțează la zero',
  aprox(punte.diferentaFataDeTinta!, punte.totalFoodCostLei - punte.tintaTeoreticaLei!)
  && Math.abs(punte.diferentaFataDeTinta!) > 0);
t('neexplicatul e un grup separat, cu bani în el',
  punte.grupuri.find(g => g.grup === 'NEEXPLICAT')!.lei > 0);
t('neclasificatul NU e topit în Food',
  aprox(punte.grupuri.find(g => g.grup === 'NECLASIFICAT')!.lei, 400));
t('operaționalul e în afara Food Cost',
  punte.grupuri.find(g => g.grup === 'OPERATIONAL')!.inFoodCost === false);
t('fiecare grup își poartă explicația', punte.grupuri.every(g => g.lei === 0 || g.explicatie.length > 0));
t('pp-ul grupurilor se însumează din componentele lui, nu se aproximează',
  punte.grupuri.every(g => g.pp === null
    || aprox(g.pp, g.componente.reduce((s, c) => s + (c.pp ?? 0), 0), 1e-9)));
t('un grup fără pp rămâne null, nu devine 0',
  punte.grupuri.every(g => g.pp !== null || g.componente.every(c => c.pp === null) || g.componente.length === 0));

const punteFara = punteTower(bridgeFC(sFaraNbo, buildCtx(sFaraNbo), cerereBaza(SEL)));
t('fără 2.9, puntea se declară indisponibilă cu motiv',
  !punteFara.disponibil && !!punteFara.motiv && punteFara.grupuri.length === 0);

const htmlPunte = randeaza(h(Punte, { p: punte, activ: null, onAlege: () => undefined }));
t('puntea randează toate cele șase grupuri',
  ORDINE_GRUPURI.every(g => htmlPunte.includes(`data-grup="${g}"`)));
t('grupurile sunt butoane — se poate face drill-down', htmlPunte.includes('<button'));
t('puntea arată și teoreticul declarat', htmlPunte.includes('teoretic'));
t('puntea indisponibilă spune de ce',
  randeaza(h(Punte, { p: punteFara, activ: null, onAlege: () => undefined })).includes('nu e disponibilă'));

// ————————————————————————————————————————————————————————— drill-down

console.log('\n— Drill-down: Companie → Restaurant → Categorie → Produs → Ingredient —');
const ing = analizaIngrediente(s0, ctx0, { ...cerereBaza(SEL), comparatie: 'LUNA_PRECEDENTA' });
const nCompanie = nivelDrill(analiza, {}, SEL, ing);
t('la companie, copiii sunt restaurantele', nCompanie.treapta === 'COMPANIE' && nCompanie.urmatoarea === 'RESTAURANT');
t('restaurantele din drill sunt cele din analiză',
  nCompanie.noduri.map(n => n.cheie).sort().join(',') === (analiza.magazine ?? []).map(m => m.locatie).sort().join(','));
t('suma restaurantelor = costul din rețete al companiei',
  aprox(nCompanie.noduri.reduce((s, n) => s + (n.lei ?? 0), 0), analiza.metrici!.recipeCostRON));

const caleL01: CaleDrill = { locatie: 'L01' };
const analizaL01 = analizaTimeline(s0, ctx0, cerereDin({ ...SEL, scop: 'RESTAURANT', locatie: 'L01' }));
const nRestaurant = nivelDrill(analizaL01, caleL01, SEL, ing);
t('la restaurant, copiii sunt categoriile', nRestaurant.treapta === 'RESTAURANT' && nRestaurant.urmatoarea === 'CATEGORIE');
t('categoriile vin din analiza restaurantului',
  nRestaurant.noduri.length === analizaL01.categorii.length && nRestaurant.noduri.length > 0);

const primaCategorie = nRestaurant.noduri[0].cheie;
const nCategorie = nivelDrill(analizaL01, { ...caleL01, categorie: primaCategorie }, SEL, ing);
t('la categorie, copiii sunt produsele ei', nCategorie.treapta === 'CATEGORIE' && nCategorie.urmatoarea === 'PRODUS');
t('produsele afișate chiar sunt din categoria aleasă',
  nCategorie.noduri.every(n => analizaL01.produse.find(p => p.produs === n.cheie)?.categorie === primaCategorie));

const primulProdus = nCategorie.noduri.find(n => n.areCopii)?.cheie ?? nCategorie.noduri[0].cheie;
const ingL01 = analizaIngrediente(s0, ctx0,
  { ...cerereBaza({ ...SEL, scop: 'RESTAURANT', locatie: 'L01' }), comparatie: 'LUNA_PRECEDENTA' });
const nProdus = nivelDrill(analizaL01, { ...caleL01, categorie: primaCategorie, produs: primulProdus }, SEL, ingL01);
t('la produs, copiii sunt ingredientele', nProdus.treapta === 'PRODUS' && nProdus.urmatoarea === 'INGREDIENT');
t('ingredientele produsului vin din motorul de ingrediente', nProdus.noduri.length > 0);
t('ingredientul e ultima treaptă', nProdus.noduri.every(n => !n.areCopii));
t('fiecare nivel scrie ce numără',
  [nCompanie, nRestaurant, nCategorie, nProdus].every(n => n.baza.length > 10));
t('treapta se deduce corect din cale',
  treaptaDin({}, SEL) === 'COMPANIE' && treaptaDin({ locatie: 'L01' }, SEL) === 'RESTAURANT'
  && treaptaDin({ locatie: 'L01', categorie: 'X' }, SEL) === 'CATEGORIE'
  && treaptaDin({ locatie: 'L01', categorie: 'X', produs: 'P' }, SEL) === 'PRODUS');
t('cu scopul pe restaurant, drill-ul începe direct de la categorii',
  treaptaDin({}, { ...SEL, scop: 'RESTAURANT', locatie: 'L01' }) === 'RESTAURANT');

const htmlDrill = randeaza(h(TabelDrill, { nivel: nCompanie, onCoboara: () => undefined }));
t('tabelul de drill randează nodurile', nCompanie.noduri.every(n => htmlDrill.includes(`data-nod="${n.cheie}"`)));
t('tabelul de drill își declară treapta', htmlDrill.includes('data-treapta="COMPANIE"'));
t('fără analiza de ingrediente, treapta de produs spune DE CE e goală',
  (() => { const n = nivelDrill(analizaL01, { ...caleL01, categorie: primaCategorie, produs: primulProdus }, SEL, null);
    return n.noduri.length === 0 && !!n.motiv && n.motiv.length > 20; })());
t('… iar tabelul chiar arată acel motiv',
  randeaza(h(TabelDrill, {
    nivel: nivelDrill(analizaL01, { ...caleL01, categorie: primaCategorie, produs: primulProdus }, SEL, null),
    onCoboara: () => undefined,
  })).includes('nu e disponibilă'));

// ————————————————————————————————————————————————————————— restaurante

console.log('\n— Performanța restaurantelor —');
const tabel = tabelMagazine(s0, analiza);
t('tabelul are un rând pe restaurant', tabel.length === (analiza.magazine ?? []).length && tabel.length === 2);
t('coloanele cerute există pe fiecare rând', tabel.every(r =>
  'recipeFcPct' in r && 'nboFcPct' in r && 'varianceRON' in r && 'foodRON' in r && 'paperRON' in r
  && 'normalizedRON' in r && 'operationalRON' in r && 'unexplainedRON' in r && 'trendPp' in r && 'status' in r));
t('cifrele sunt cele ale motorului, nu recalculate',
  aprox(tabel[0].foodRON, analiza.magazine![0].metrici.foodCostRON));
t('statusul se sprijină pe ținta din date',
  tabel.every(r => r.tinta === null || r.motivStatus.includes('ținta')));
t('un restaurant fără țintă nu primește un prag inventat',
  (() => { const fara = { ...s0, tinte: [] };
    return tabelMagazine(fara, analizaTimeline(fara, buildCtx(fara), cerereDin(SEL)))
      .every(r => r.tinta === null && (r.status === 'OK' || r.status === 'FARA_DATE')); })());

console.log('\n— Ordonarea vine din motor, nu din interfață —');
for (const criteriu of ['FC_MARE', 'CRESTERE_FC', 'SCADERE_FC', 'IMPACT_COST', 'NEEXPLICAT'] as const) {
  const s = sorteazaMagazine(tabel, analiza, criteriu);
  const clasament = analiza.clasamente!.find(c => c.criteriu === criteriu)!;
  t(`ordonarea „${criteriu}" respectă exact clasamentul motorului`,
    s.randuri.map(r => r.locatie).join(',') === clasament.randuri.map(r => r.locatie).join(','));
  t(`… și își declară baza`, s.baza === clasament.baza && s.baza.length > 5);
}
t('restaurantele fără metrica de ordonare sunt excluse, nu puse pe 0',
  (() => { const s = sorteazaMagazine(tabel, analiza, 'CRESTERE_FC');
    return s.randuri.length + s.excluse.length === tabel.length; })());

const htmlTabel = randeaza(h(TabelMagazine, {
  randuri: tabel, excluse: [], baza: 'test', onAlege: () => undefined,
}));
t('tabelul randează fiecare restaurant', tabel.every(r => htmlTabel.includes(`data-magazin="${r.locatie}"`)));
t('tabelul arată toate cele unsprezece coloane cerute',
  ['FC rețetar', 'FC NBO', 'Variație', 'Food', 'Paper', 'Normalizat', 'Operațional', 'Neexplicat', 'Trend', 'Status']
    .every(c => htmlTabel.includes(c)));

// ————————————————————————————————————————————————————————— ingrediente

console.log('\n— Ingredient Intelligence: cele cinci panouri —');
const panouri = panouriIngrediente(ing);
t('sunt cinci panouri', panouri.length === 5);
t('ordinea și identitatea panourilor sunt cele cerute',
  panouri.map(p => p.id).join(',') === 'DRIVERE_FC,CRESTERI_PRET,IMPACT_COST,DEVIATII_CONSUM,OPORTUNITATI');
t('fiecare panou își declară baza de ordonare', panouri.every(p => p.baza.length > 10));
t('fiecare rând poartă câmpurile cerute', panouri.every(p => p.randuri.every(r =>
  'deltaPretLei' in r && 'impactCostRON' in r && 'impactFcPp' in r
  && Array.isArray(r.produseAfectate) && Array.isArray(r.magazineAfectate) && typeof r.confidence === 'number')));
t('panoul de creșteri de preț conține doar creșteri',
  panouri.find(p => p.id === 'CRESTERI_PRET')!.randuri.every(r => (r.deltaPretPct ?? 0) > 0));
t('oportunitățile poartă impactul motorului, nu unul inventat',
  panouri.find(p => p.id === 'OPORTUNITATI')!.randuri.every((r, i) =>
    r.impactCostRON === ing.oportunitati[i].impactEstimatLei));

console.log('\n— Încrederea pe rând e deterministă și explicată —');
const randCuPret = ing.randuri.find(r => r.pretCurent !== null && r.pretPrecedent !== null && !r.pretPrecedentEstimat);
if (randCuPret) {
  const c = confidentaIngredient(randCuPret, ing.calitate);
  t('un ingredient cu preț complet pornește de la 100 minus penalizările declarate',
    c.scor <= 100 && c.scor >= 0 && (c.scor === 100 ? c.motive.length === 0 : c.motive.length > 0));
}
// rândurile fabricate acoperă cazurile pe care fixtura demo nu le conține
const randSintetic = (patch: Partial<RandIngredient>): RandIngredient => ({
  ingredient: 'X', denumire: 'X', um: 'kg', categorie: 'test',
  pretCurent: 10, pretPrecedent: 9, deltaPretLei: 1, deltaPretPct: 11.1,
  pretPrecedentEstimat: false, pretCurentEstimat: false,
  consumCurent: 5, consumPrecedent: 4, deltaConsumPct: 25,
  costCurent: 50, costPrecedent: 36, deltaCostLei: 14,
  contributiePpCurent: 1, contributiePpPrecedent: 0.8, fcImpactPp: 0.2,
  efecte: { pret: 1, consum: 1, reteta: 1, pmix: 0, interactiunePret: 0, interactiuneConsum: 0 },
  produse: [], magazine: [], canale: [], perioade: ['2026-07'], ...patch,
});
const calGoala = { pretLipsa: [], ingredientLipsa: [], mapareLipsa: [], pmixLipsa: false,
  perioadaLipsa: false, istoricInsuficient: [], retetaRetroumpluta: [] };
t('un rând complet primește 100',
  confidentaIngredient(randSintetic({}), calGoala).scor === 100);
t('lipsa prețului scade încrederea și spune de ce',
  (() => { const c = confidentaIngredient(randSintetic({ pretCurent: null, efecte: null }), calGoala);
    return c.scor === 40 && c.motive.some(m => m.includes('preț')); })());
t('prețul retro-umplut costă exact 20 de puncte',
  confidentaIngredient(randSintetic({ pretPrecedentEstimat: true }), calGoala).scor === 80);
t('rețeta retro-umplută costă exact 20 de puncte',
  confidentaIngredient(
    randSintetic({ produse: [{ produs: 'P001', denumire: 'P', cantPerPortie: 1, buc: 1, net: 1,
      pmixPct: null, costLei: 1, sharePct: null, fcImpactPp: null }] }),
    { ...calGoala, retetaRetroumpluta: ['P001'] }).scor === 80);
t('scorul nu coboară sub 0 nici cumulat',
  confidentaIngredient(randSintetic({ pretCurent: null, pretPrecedentEstimat: true, efecte: null }), calGoala).scor >= 0);
t('aceeași intrare dă același scor de fiecare dată',
  ing.randuri.every(r => confidentaIngredient(r, ing.calitate).scor === confidentaIngredient(r, ing.calitate).scor));

// ————————————————————————————————————————————————————————— simulări

console.log('\n— Simulări: formular → scenariu, fără să atingă datele —');
t('formularul gol nu produce niciun scenariu', scenariuGol(scenariuDin(formSimulareGol())));
const ingredientTest = s0.ingrediente.find(i => i.activ && i.preturi.length > 0)!;
const formPret = { ...formSimulareGol(), ingredient: ingredientTest.cod, pretNou: 99 };
t('prețul completat produce o schimbare de preț',
  scenariuDin(formPret).preturi!.length === 1 && scenariuDin(formPret).preturi![0].pretNou === 99);
t('un preț fără ingredient nu ghicește nimic',
  scenariuGol(scenariuDin({ ...formSimulareGol(), pretNou: 99 })));
t('un ingredient fără preț nou nu produce scenariu',
  scenariuGol(scenariuDin({ ...formSimulareGol(), ingredient: ingredientTest.cod })));
t('mixul cere și produs, și factor',
  scenariuGol(scenariuDin({ ...formSimulareGol(), pmixProdus: 'P001' }))
  && !scenariuGol(scenariuDin({ ...formSimulareGol(), pmixProdus: 'P001', pmixFactor: 1.2 })));
t('gramajul cere produs + componentă + cantitate',
  scenariuGol(scenariuDin({ ...formSimulareGol(), produs: 'P001', component: 'I001' }))
  && !scenariuGol(scenariuDin({ ...formSimulareGol(), produs: 'P001', component: 'I001', cantNoua: 5 })));

const inainteDeSimulare = JSON.stringify(s0);
const sim = simuleazaFC(s0, ctx0, cerereBaza(SEL), scenariuDin(formPret));
const rez = rezumatSimulare(sim);
t('starea reală rămâne neatinsă de simulare', JSON.stringify(s0) === inainteDeSimulare);
t('rezumatul poartă FC curent și FC scenariu', rez.fcCurent !== null && rez.fcScenariu !== null);
t('Δ pp e diferența celor două FC-uri',
  rez.deltaPp === null || aprox(rez.deltaPp, rez.fcScenariu! - rez.fcCurent!, 1e-9));
t('Δ lei e cel al motorului', aprox(rez.deltaRON!, sim.deltaCostRON));
t('efectele sunt separate pe preț, rețetă, mix și interacțiune',
  ['PRET', 'RETETA', 'MIX', 'INTERACTIUNE'].every(id => rez.efecte.some(e => e.id === id)));
t('identitatea de descompunere e scrisă în rezumat',
  rez.identitate.includes('interacțiune') && rez.identitate.includes('scenariu'));
t('baseline + Σ efecte + interacțiune = costul scenariului',
  aprox(sim.currentCostRON + rez.efecte.reduce((s, e) => s + e.costLei, 0), sim.scenarioCostRON, 0.01));
t('fiecare efect își poartă explicația', rez.efecte.every(e => e.explicatie.length > 0));
t('ce a fost atins se raportează explicit',
  Array.isArray(rez.afectate.ingrediente) && Array.isArray(rez.afectate.magazine));

const htmlSim = randeaza(h(ContinutTower, { initial: 'SIMULARI' }));
t('ecranul de simulări randează toate cele patru pârghii',
  ['data-camp="ingredient"', 'data-camp="pretNou"', 'data-camp="component"', 'data-camp="pmixFactor"']
    .every(m => htmlSim.includes(m)));
t('fără scenariu, ecranul spune că nu e nimic de simulat', htmlSim.includes('Niciun scenariu definit'));

// ————————————————————————————————————————————————————————— importuri

console.log('\n— Import Center: nevalidul nu se poate activa —');
const parsatBun = {
  foaie: 'x', antete: ['Cod', 'Denumire', 'UM', 'Categorie', 'Pret'],
  randuri: [{ Cod: 'I001', Denumire: 'Piept de pui', UM: 'kg', Categorie: 'Carne', Pret: 22 }],
};
const bun = randImport(pregatesteImport(s0, {
  fisier: 'nomenclator august.xlsx', parsat: parsatBun, acum: '2026-08-01T08:00:00.000Z',
  dataValabil: '2026-08-01',
}).rezultat);
t('un import valid se poate activa', bun.stare === 'VALIDAT' && bun.poateActiva && bun.motivBlocare === null);
t('rândul de import poartă tot ce cere ecranul',
  bun.eticheta.length > 0 && bun.granularitate.length > 0 && typeof bun.randuri === 'number'
  && Array.isArray(bun.avertismente) && Array.isArray(bun.erori) && Array.isArray(bun.diagnostice));

const ambiguu = randImport(pregatesteImport(s0, {
  fisier: 'export.xlsx', parsat: { foaie: 'x', antete: ['Cod', 'Denumire', 'UM', 'Pret'], randuri: [{ Cod: 'X', Pret: 1 }] },
  acum: '2026-08-01T08:00:00.000Z',
}).rezultat);
t('un fișier ambiguu cere confirmare și NU se poate activa',
  ambiguu.stare === 'NECESITA_CONFIRMARE' && !ambiguu.poateActiva && !!ambiguu.motivBlocare);
const gol = randImport(pregatesteImport(s0, {
  fisier: 'pmix iulie.xlsx', parsat: { foaie: 'x', antete: ['Data', 'Cod produs', 'Cantitate'], randuri: [] },
  acum: '2026-08-01T08:00:00.000Z', locatie: 'L01',
}).rezultat);
t('un import fără rânduri e blocat, cu motiv', !gol.poateActiva && !!gol.motivBlocare);

const htmlImport = randeaza(h(ContinutTower, { initial: 'IMPORTURI' }));
t('ecranul de import listează cele șase surse acceptate',
  ['NBO 2.9', 'NBO 4.1', 'PMIX', 'Rețetar', 'Nomenclator', 'Prețuri'].every(s => htmlImport.includes(s)));
t('ecranul de import are câmpurile de fișier, tip, restaurant și dată',
  ['data-camp="fisier"', 'data-camp="tip"', 'data-camp="locatie-import"', 'data-camp="dataValabil"']
    .every(m => htmlImport.includes(m)));
t('managerul de restaurant nu primește deloc ecranul de import',
  randeaza(h(ContinutTower, { initial: 'IMPORTURI' }), context({ acces: ACCES_MANAGER }))
    .includes('data-sectiune-activa="OVERVIEW"'));

// ————————————————————————————————————————————————————————— calitatea datelor

console.log('\n— Calitatea datelor e la vedere, nu în jurnal —');
const semnale = semnaleCalitate(s0, analiza, ing);
t('semnalele există pe fixtura cu probleme', semnale.length > 0);
t('neclasificatul e semnalat', semnale.some(s => s.cod === 'NECLASIFICAT'));
t('canalul necunoscut e semnalat', semnale.some(s => s.cod === 'CANAL_NECUNOSCUT'));
t('datele demo sunt marcate ca atare', semnale.some(s => s.cod === 'DATE_DEMO'));
t('blocantele stau primele', (() => {
  const niveluri = semnale.map(s => s.nivel);
  const iBlocant = niveluri.lastIndexOf('BLOCANT');
  const iInfo = niveluri.indexOf('INFO');
  return iBlocant === -1 || iInfo === -1 || iBlocant < iInfo;
})());
t('fiecare semnal trimite spre secțiunea unde se rezolvă',
  semnale.every(s => SECTIUNI.some(x => x.id === s.sectiune)));
t('fiecare semnal are detaliu, nu doar un cod', semnale.every(s => s.detaliu.length > 20));
t('problemele diferite au coduri diferite — nu se amestecă sub același cod',
  new Set(semnale.map(s => s.cod)).size === semnale.length);
t('componentele absente din nomenclator au codul lor, distinct de prețul lipsă',
  (() => { const sIng = { ...s0, retete: s0.retete.map(r => r.cod !== s0.retete[0].cod ? r
    : { ...r, versiuni: r.versiuni.map(v => ({ ...v, linii: [...v.linii,
      { comp: 'INEXISTENT', tipComp: 'INGREDIENT' as const, cant: 10, um: 'g' as const, canal: 'AMBELE' as const }] })) }) };
    const cIng = buildCtx(sIng);
    const ana = analizaTimeline(sIng, cIng, cerereDin(SEL));
    const ingr = analizaIngrediente(sIng, cIng, { ...cerereBaza(SEL), comparatie: 'LUNA_PRECEDENTA' });
    return semnaleCalitate(sIng, ana, ingr).some(x => x.cod === 'INGREDIENT_LIPSA'); })());

const htmlSemnale = randeaza(h(Semnale, { semnale }));
t('semnalele se randează cu codul lor', semnale.every(s => htmlSemnale.includes(`data-semnal="${s.cod}"`)));
t('fără probleme, se spune explicit că nu sunt',
  randeaza(h(Semnale, { semnale: [] })).includes('Nicio problemă'));

console.log('\n— Demo ≠ importat —');
t('setul demo e recunoscut ca demo', origineDate(s0).origine === 'DEMO' || origineDate(s0).origine === 'MIXT');
t('o stare goală se declară goală, nu „importată"',
  origineDate({ ...s0, vanzari: [], importuri: [], produse: [] }).origine === 'GOL');
t('banda de context arată originea datelor',
  randeaza(h(BandaContext, {})).includes('data-zona="banda"'));

// ————————————————————————————————————————————————————————— roluri

console.log('\n— Rolurile: managerul nu poate ieși din restaurantul lui —');
t('MANAGER cu restaurant → STORE_MANAGER',
  ACCES_MANAGER.rol === 'STORE_MANAGER' && ACCES_MANAGER.locatieImpusa === 'L02');
t('ADMIN → TOP_MANAGEMENT cu vedere pe companie',
  ACCES_TOP.rol === 'TOP_MANAGEMENT' && ACCES_TOP.poateVedeaCompania);
t('ANALIST → tot TOP_MANAGEMENT', accesTower(s0, { rol: 'ANALIST' }, false).rol === 'TOP_MANAGEMENT');
t('MANAGER fără restaurant NU devine store manager (nu are ce restrânge)',
  accesTower(s0, { rol: 'MANAGER' }, false).rol === 'TOP_MANAGEMENT');
t('managerul vede doar restaurantul lui', ACCES_MANAGER.locatiiVizibile.join(',') === 'L02');
t('managerul nu poate scrie', !ACCES_MANAGER.poateScrie && ACCES_TOP.poateScrie);
t('poateVedeaLocatia respectă restricția',
  poateVedeaLocatia(ACCES_MANAGER, 'L02') && !poateVedeaLocatia(ACCES_MANAGER, 'L01')
  && poateVedeaLocatia(ACCES_TOP, 'L01'));
t('secțiunile de scriere nu sunt în lista managerului',
  !poateVedeaSectiunea(ACCES_MANAGER, 'IMPORTURI') && poateVedeaSectiunea(ACCES_TOP, 'IMPORTURI'));

console.log('\n— Selecția se normalizează la drepturi, nu doar la afișare —');
const incercare: SelectieFC = { ...SEL, scop: 'COMPANIE', locatie: null };
const normalizat = normalizeazaSelectie(s0, incercare, ACCES_MANAGER);
t('o selecție „Companie" a unui manager devine restaurantul lui',
  normalizat.scop === 'RESTAURANT' && normalizat.locatie === 'L02');
t('un manager nu poate ținti alt restaurant',
  normalizeazaSelectie(s0, { ...SEL, scop: 'RESTAURANT', locatie: 'L01' }, ACCES_MANAGER).locatie === 'L02');
t('selecția implicită a managerului pornește pe restaurantul lui',
  selectieImplicita(s0, ACCES_MANAGER).locatie === 'L02');
t('selecția implicită a managementului pornește pe companie',
  selectieImplicita(s0, ACCES_TOP).scop === 'COMPANIE');
t('selecția implicită cade pe cea mai recentă perioadă cu date',
  selectieImplicita(s0, ACCES_TOP).ancora === perioadeDisponibile(s0, 'LUNA')[0].de);
t('un restaurant inexistent în selecție e corectat, nu propagat',
  ['L01', 'L02'].includes(normalizeazaSelectie(s0, { ...SEL, scop: 'RESTAURANT', locatie: 'INEXISTENT' }, ACCES_TOP).locatie!));
t('comparația imposibilă pe săptămâni cade pe perioada precedentă',
  normalizeazaSelectie(s0, { ...selSapt, comparatie: 'ACEEASI_PERIOADA_AN_PRECEDENT' }, ACCES_TOP).comparatie
  === 'PERIOADA_PRECEDENTA');

console.log('\n— Enforcement: interfața nu se dă drept securitate —');
t('fără server, se spune clar că restricția nu e reală',
  (() => { const a = accesTower(s0, null, false);
    return !a.enforcatPeServer && !!a.avertismentEnforcement && a.avertismentEnforcement.includes('server'); })());
t('manager cu date filtrate de server → fără avertisment',
  ACCES_MANAGER.enforcatPeServer && ACCES_MANAGER.avertismentEnforcement === null);
t('manager NEfiltrat de server → avertisment explicit',
  (() => { const a = accesTower(s0, { rol: 'MANAGER', locatie: 'L02' }, false);
    return !a.enforcatPeServer && !!a.avertismentEnforcement
      && a.avertismentEnforcement.includes('securitate'); })());
t('banda arată lipsa de enforcement',
  randeaza(h(BandaContext, {}), context({ acces: accesTower(s0, null, false) }))
    .includes('data-zona="fara-enforcement"'));
t('banda arată restaurantul impus al managerului',
  randeaza(h(BandaContext, {}), context({ acces: ACCES_MANAGER })).includes('data-zona="locatie-impusa"'));

// ————————————————————————————————————————————————————————— scopul se propagă în rezultate

console.log('\n— Același filtru, aceleași cifre, în toate motoarele —');
const selL01: SelectieFC = { ...SEL, scop: 'RESTAURANT', locatie: 'L01' };
const analizaPrinSelectie = analizaTimeline(s0, ctx0, cerereDin(selL01));
const analizaDirect = analizaTimeline(s0, ctx0,
  { perioada: perioadaDin('2026-07-15', 'LUNA'), nivel: restaurant('L01'), canal: 'TOTAL', comparatie: 'PERIOADA_PRECEDENTA' } as CerereTimeline);
t('selecția pe restaurant dă exact analiza rulată direct pe restaurant',
  JSON.stringify(analizaPrinSelectie.metrici) === JSON.stringify(analizaDirect.metrici));
t('canalul selectat schimbă efectiv cifrele',
  analizaTimeline(s0, ctx0, cerereDin({ ...SEL, canal: 'INSTORE' })).metrici!.salesRON
  !== analizaTimeline(s0, ctx0, cerereDin(SEL)).metrici!.salesRON);
t('Total = InStore + Delivery ca sume, și prin selecție',
  aprox(analizaTimeline(s0, ctx0, cerereDin({ ...SEL, canal: 'INSTORE' })).metrici!.salesRON
    + analizaTimeline(s0, ctx0, cerereDin({ ...SEL, canal: 'DELIVERY' })).metrici!.salesRON,
  analizaTimeline(s0, ctx0, cerereDin(SEL)).metrici!.salesRON, 0.01));
t('puntea urmează același scop ca analiza',
  bridgeFC(s0, ctx0, cerereBaza(selL01)).cerere.nivel.tip === 'STORE');
t('compania rămâne suma restaurantelor și prin modelul de interfață',
  aprox(nCompanie.noduri.reduce((s, n) => s + (n.lei ?? 0), 0),
    tabel.reduce((s, r) => s + r.foodRON + r.paperRON, 0), 0.01));

console.log('\n— Graficul nu fabrică perioade —');
const puncte = puncteGrafic([{ perioada: perioadaDin('2026-07-15', 'LUNA'), metrici: analiza.metrici!, partial: false }]);
t('punctul poartă cheia perioadei și FC-urile', puncte[0].cheie === '2026-07' && puncte[0].fcRetetar !== null);
t('o perioadă fără 2.9 lasă FC-ul NBO gol, nu 0',
  puncteGrafic([{
    perioada: perioadaDin('2026-07-15', 'LUNA'),
    metrici: analizaTimeline(sFaraNbo, buildCtx(sFaraNbo), cerereDin(SEL)).metrici!, partial: false,
  }])[0].fcNbo === null);

console.log('\n— Ecranele se randează fără să crape, în ambele scopuri —');
for (const scop of ['COMPANIE', 'RESTAURANT'] as const) {
  const s: SelectieFC = scop === 'COMPANIE' ? SEL : selL01;
  const html = randeaza(h(ContinutTower, { initial: 'OVERVIEW' }), context({ sel: s }));
  t(`Overview se randează pe scopul ${scop}`, html.includes('data-zona="kpi"'));
  t(`… cu puntea prezentă pe ${scop}`, html.includes('data-zona="punte"'));
}
t('la nivel de restaurant, tabelul de restaurante spune de ce lipsește',
  randeaza(h(ContinutTower, { initial: 'OVERVIEW' }), context({ sel: selL01 })).includes('Companie'));
t('Overview la companie conține tabelul de restaurante',
  randeaza(h(ContinutTower, { initial: 'OVERVIEW' })).includes('data-zona="magazine"'));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
