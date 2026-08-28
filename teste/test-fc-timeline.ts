// Timeline-ul FC și analitica Restaurant / Companie.
//
// Identități verificate:
//   compania = Σ restaurante (vânzări, cost rețete) + fără-locație (partea 2.9)
//   rândul unui restaurant din analiza companiei = analiza rulată direct pe restaurant
//   pp ≠ %: procentele se compară în puncte procentuale, sumele în lei (+% relativ)
//   săptămânile nu primesc NICIODATĂ valori 2.9 fabricate din date lunare
//   granularitățile incompatibile refuză; istoricul lipsă = stare indisponibilă explicită
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx } from '../src/lib/engine';
import { COMPANIE, perioadaDin, perioadeDinLuna, restaurant } from '../src/lib/fc-domeniu';
import {
  analizaTimeline, comparaFC, descrieTimeline, metriciFC, perioadaComparatie, serieTimeline,
  type CerereTimeline,
} from '../src/lib/fc-timeline';
import type { AppState, Ingredient, Material29, Produs, VanzareFapt } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const LUNA = perioadaDin('2026-07-15', 'LUNA');
const cer = (extra: Partial<CerereTimeline> = {}): CerereTimeline =>
  ({ perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL', comparatie: 'PERIOADA_PRECEDENTA', ...extra });

// ————————————————————————————————————————————————————————— fixtura 2.9 cu cifre de mână

const mat = (loc: string | null, material: string, denumire: string, categorie: string, cost: number, teoretic: number | null = null): Material29 =>
  ({ perioada: '2026-07', locatie: loc, material, denumire, categorie, cant: null, um: null, costActual: cost, costTeoretic: teoretic });

// L01: Food 4000 (teoretic 3800) + Paper 500 (480) + curățenie 180
// L02: Food 1200 (1150) + normalizat 300 + neclasificat 400
// fără locație: 250 nemapat (→ neexplicat)
// → total 6830 · FC actual 6000 · teoretic declarat 5430 · neexplicat 650 (400 + 250)
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
const a = analizaTimeline(s0, ctx0, cer());
const m = a.metrici!;

console.log('— Metricile de bază, pe cifre de mână —');
t('analiza e disponibilă', a.disponibil);
t('vânzările vin din Sales Report', m.sursaVanzari === 'Sales Report' && m.salesRON > 0);
t('FC-ul din rețete = cost ÷ vânzări, pe același numitor',
  aprox(m.recipeFcPct!, (m.recipeCostRON / m.salesRON) * 100, 1e-9));
t('food + paper = costul din rețete', aprox(m.foodCostRON + m.paperCostRON, m.recipeCostRON));
t('NBO total = suma liniilor 2.9 = 6830', m.nboDisponibil && aprox(m.nboTotalRON!, 6830));
t('NBO actual (partea FC) = 6000 (Food+Paper+Normalizat)', aprox(m.nboActualRON!, 6000));
t('teoreticul DECLARAT = 5430, nu reconstruit', aprox(m.nboTheoreticalRON!, 5430));
t('variance = NBO actual − cost rețete', aprox(m.varianceRON!, m.nboActualRON! - m.recipeCostRON));
t('variance în pp = variance ÷ vânzări', aprox(m.variancePp!, (m.varianceRON! / m.salesRON) * 100, 1e-9));
t('neexplicat = 650 lei (400 neclasificat + 250 nemapat)', aprox(m.unexplainedRON!, 650));
t('explained + unexplained = 100%', aprox(m.explainedPct! + m.unexplainedPct!, 100));
t('operațional = 180 (curățenia)', aprox(m.operationalRON!, 180));
t('normalizat = 300', aprox(m.normalizedRON!, 300));
t('neclasificat = 400 — vizibil, nu topit în Food', aprox(m.unclassifiedRON!, 400));
t('canalul 2.9 e UNKNOWN — sursa nu îl declară', m.canalNbo === 'UNKNOWN');
t('încrederea vine din punte când 2.9 există', m.confidence > 0 && m.confidence <= 100);
t('rezumatul descrie analiza', descrieTimeline(a).includes('FC'));

console.log('\n— Compania = Σ restaurante, prin ACEEAȘI funcție —');
t('există defalcarea pe restaurante la companie', a.magazine !== null && a.magazine!.length === 2);
t('vânzările companiei = Σ restaurante',
  aprox(m.salesRON, a.magazine!.reduce((s, r) => s + r.metrici.salesRON, 0)));
t('costul din rețete al companiei = Σ restaurante',
  aprox(m.recipeCostRON, a.magazine!.reduce((s, r) => s + r.metrici.recipeCostRON, 0)));
t('food-ul companiei = Σ restaurante',
  aprox(m.foodCostRON, a.magazine!.reduce((s, r) => s + r.metrici.foodCostRON, 0)));
t('NBO-ul companiei = Σ restaurante + partea fără locație',
  aprox(m.nboTotalRON!, a.magazine!.reduce((s, r) => s + (r.metrici.nboTotalRON ?? 0), 0) + a.nboFaraLocatieRON!),
  `${m.nboTotalRON} = Σ + ${a.nboFaraLocatieRON}`);
t('partea fără locație e declarată explicit: 250 lei', aprox(a.nboFaraLocatieRON!, 250));
const aL01 = analizaTimeline(s0, ctx0, cer({ nivel: restaurant('L01') }));
t('DRILL-DOWN: rândul L01 din companie = analiza rulată direct pe L01',
  JSON.stringify(a.magazine!.find(x => x.locatie === 'L01')!.metrici) === JSON.stringify(aL01.metrici!));
t('restaurantul nu are clasamente și magazine — e frunza ierarhiei',
  aL01.magazine === null && aL01.clasamente === null);
t('restaurantul își vede doar 2.9-ul lui: L01 = 4680', aprox(aL01.metrici!.nboTotalRON!, 4680));

console.log('\n— Ierarhia de drill-down: companie → restaurant → categorie → produs → material —');
t('categoriile există la ambele niveluri', a.categorii.length > 0 && aL01.categorii.length > 0);
t('Σ net pe categorii = Σ net pe produse (aceeași bază)',
  aprox(a.categorii.reduce((s, x) => s + x.net, 0), a.produse.reduce((s, x) => s + x.net, 0)));
t('fiecare produs își poartă categoria — legătura de ierarhie',
  a.produse.every(p => a.categorii.some(c => c.categorie === p.categorie)));
t('mixul categoriilor însumează 100%', aprox(a.categorii.reduce((s, x) => s + (x.mixPct ?? 0), 0), 100));
t('materialele vin din 2.9 când puntea e disponibilă',
  a.materiale.length === MATERIALE.length && a.materiale.every(x => x.sursa === 'NBO_29'));
t('materialul cel mai scump e primul', a.materiale[0].cod === 'I001' && a.materiale[0].costRON === 4000);
t('materialul neclasificat își arată categoria', a.materiale.find(x => x.cod === 'MAT-Z')!.categorie === 'UNCLASSIFIED');
// fără 2.9, materialele vin din rețetar — cu prețul de la finele perioadei
const sFara29: AppState = { ...genereazaSeed(), materiale29: [] };
const aFara29 = analizaTimeline(sFara29, buildCtx(sFara29), cer());
t('fără 2.9, defalcarea pe materiale vine din rețetar și o spune',
  aFara29.materiale.length > 0 && aFara29.materiale.every(x => x.sursa === 'RETETAR'));

console.log('\n— Comparația: pp pentru procente, lei pentru sume —');
const c = a.comparatie!;
t('comparația e disponibilă (iunie există)', c.disponibil && c.perioadaPrecedenta!.cheie === '2026-06');
t('FC-ul se compară în PUNCTE PROCENTUALE', c.recipeFc.deltaPp !== null
  && aprox(c.recipeFc.deltaPp, c.recipeFc.curent! - c.recipeFc.precedent!, 1e-9));
t('delta pp nu are câmp de „%" — tipurile nu se amestecă', !('deltaPct' in c.recipeFc));
t('vânzările se compară în LEI, cu variația relativă separată',
  c.sales.deltaRON !== null && aprox(c.sales.deltaRON, c.sales.curent! - c.sales.precedent!)
  && aprox(c.sales.deltaPct!, (c.sales.deltaRON / c.sales.precedent!) * 100, 1e-6));
t('costul se compară în lei', c.recipeCost.deltaRON !== null);
t('precedentul e chiar metricile lunii iunie',
  aprox(c.precedent!.recipeCostRON, metriciFC(s0, ctx0, { perioada: perioadaDin('2026-06-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' }).recipeCostRON));
t('NBO-ul precedent e null (iunie fără 2.9), delta rămâne null — nu zero',
  c.nboActual.precedent === null && c.nboActual.deltaRON === null);

console.log('\n— Comparația cu anul precedent: doar unde istoricul există —');
const anTrecut: VanzareFapt[] = genereazaSeed().vanzari
  .filter(v => v.data.startsWith('2026-07'))
  .map(v => ({ ...v, data: `2025-${v.data.slice(5)}` }));
const sIstoric: AppState = { ...s0, vanzari: [...s0.vanzari, ...anTrecut] };
const cAn = comparaFC(sIstoric, buildCtx(sIstoric), cer({ comparatie: 'ACEEASI_PERIOADA_AN_PRECEDENT' }));
t('cu istoric, comparația an-la-an merge', cAn.disponibil && cAn.perioadaPrecedenta!.cheie === '2025-07');
t('fără istoric, întoarce stare indisponibilă explicită, nu zerouri',
  (() => { const x = comparaFC(s0, ctx0, cer({ comparatie: 'ACEEASI_PERIOADA_AN_PRECEDENT' }));
    return !x.disponibil && x.motivIndisponibil!.includes('2025-07') && x.recipeFc.deltaPp === null; })());

console.log('\n— Granularități incompatibile: refuz, nu amestec —');
const saptamani = perioadeDinLuna('2026-07', 'SAPTAMANA');
const saptIntreaga = saptamani.filter(x => !x.partiala)[1];
const saptTaiata = saptamani.find(x => x.partiala)!;
t('săptămâna întreagă se compară cu săptămâna precedentă (tot săptămână)',
  (() => { const x = perioadaComparatie(saptIntreaga, 'PERIOADA_PRECEDENTA');
    return x.perioada !== null && x.perioada.tip === 'SAPTAMANA' && x.perioada.zile === 7; })());
t('săptămâna TĂIATĂ nu se compară cu nimic', perioadaComparatie(saptTaiata, 'PERIOADA_PRECEDENTA').perioada === null);
t('an-precedent pe săptămână refuză cu motiv',
  (() => { const x = perioadaComparatie(saptIntreaga, 'ACEEASI_PERIOADA_AN_PRECEDENT');
    return x.perioada === null && x.motiv!.includes('ISO'); })());
t('luna se compară cu luna', perioadaComparatie(LUNA, 'PERIOADA_PRECEDENTA').perioada!.cheie === '2026-06');

console.log('\n— Seria în timp: săptămâni și luni, fără valori fabricate —');
const serieSapt = serieTimeline(s0, ctx0, { de: '2026-07-01', la: '2026-07-31', granularitate: 'SAPTAMANA', nivel: COMPANIE, canal: 'TOTAL' });
t('seria săptămânală acoperă luna, cu marginile tăiate marcate parțiale',
  serieSapt.length === 5 && serieSapt[0].partial && serieSapt[serieSapt.length - 1].partial);
t('fiecare punct își poartă perioada, granularitatea, scopul, canalul și sursele',
  serieSapt.every(p => p.granularitate === 'SAPTAMANA' && p.nivel === 'COMPANIE' && p.canal === 'TOTAL' && p.surse.length > 0));
t('NICIUN punct săptămânal nu are valori 2.9 — nu se fabrică din date lunare',
  serieSapt.every(p => !p.metrici.nboDisponibil && p.metrici.nboActualRON === null && p.metrici.nboTotalRON === null));
t('punctele săptămânale au totuși FC-ul din rețete',
  serieSapt.filter(p => !p.partial).every(p => p.metrici.recipeFcPct !== null));
const serieLuni = serieTimeline(s0, ctx0, { de: '2026-06-01', la: '2026-07-31', granularitate: 'LUNA', nivel: COMPANIE, canal: 'TOTAL' });
t('seria lunară are punctele lunilor', serieLuni.length === 2 && serieLuni.map(p => p.perioada.cheie).join(',') === '2026-06,2026-07');
t('iulie are 2.9, iunie nu — fiecare punct spune cinstit',
  serieLuni[1].metrici.nboDisponibil && !serieLuni[0].metrici.nboDisponibil);
t('confidence există pe fiecare punct', serieLuni.every(p => p.confidence >= 0 && p.confidence <= 100));

console.log('\n— Clasamentele: metrici numite, ordine deterministă —');
const cl = (crit: string) => a.clasamente!.find(x => x.criteriu === crit)!;
t('toate cele 7 criterii există',
  ['FC_MARE', 'CRESTERE_FC', 'SCADERE_FC', 'IMPACT_COST', 'NEEXPLICAT', 'NORMALIZAT', 'OPERATIONAL']
    .every(x => a.clasamente!.some(y => y.criteriu === x)));
t('fiecare clasament își declară BAZA exactă', a.clasamente!.every(x => x.baza.length > 10));
t('neexplicatul: L02 (400) înaintea L01 (0)',
  cl('NEEXPLICAT').randuri[0].locatie === 'L02' && aprox(cl('NEEXPLICAT').randuri[0].valoare, 400));
t('normalizatul: L02 primul, cu 300', cl('NORMALIZAT').randuri[0].locatie === 'L02' && aprox(cl('NORMALIZAT').randuri[0].valoare, 300));
t('operaționalul: L01 primul, cu 180', cl('OPERATIONAL').randuri[0].locatie === 'L01' && aprox(cl('OPERATIONAL').randuri[0].valoare, 180));
t('creșterea și scăderea de FC sunt ordonate invers una față de alta',
  cl('CRESTERE_FC').randuri[0].locatie === cl('SCADERE_FC').randuri[cl('SCADERE_FC').randuri.length - 1].locatie);
// un restaurant fără 2.9 e EXCLUS din clasamentele pe 2.9, nu presupus zero
const sPartial29: AppState = { ...genereazaSeed(), materiale29: MATERIALE.filter(x => x.locatie !== 'L02') };
const aPartial29 = analizaTimeline(sPartial29, buildCtx(sPartial29), cer());
t('restaurantul fără 2.9 apare la excluse, nu cu zero',
  aPartial29.clasamente!.find(x => x.criteriu === 'NEEXPLICAT')!.excluse.includes('L02'));

console.log('\n— Canale: Total / InStore / Delivery / UNKNOWN —');
const mIn = metriciFC(s0, ctx0, { perioada: LUNA, nivel: COMPANIE, canal: 'INSTORE' });
const mDl = metriciFC(s0, ctx0, { perioada: LUNA, nivel: COMPANIE, canal: 'DELIVERY' });
t('rețetele merg pe fiecare canal; Total = InStore + Delivery',
  aprox(m.recipeCostRON, mIn.recipeCostRON + mDl.recipeCostRON));
t('2.9 fără canal declarat refuză pe canale separate — nu se inventează repartiția',
  !mIn.nboDisponibil && !mDl.nboDisponibil);
t('canalul necunoscut e expus în calitate', a.calitate.canalNecunoscut);
const cuCanal: AppState = {
  ...genereazaSeed(),
  materiale29: [{ ...mat('L01', 'I001', 'Piept de pui', 'Carne și pui', 3000), canal: 'INSTORE' as const }],
};
const mInCanal = metriciFC(cuCanal, buildCtx(cuCanal), { perioada: LUNA, nivel: COMPANIE, canal: 'INSTORE' });
t('cu canalul DECLARAT în sursă, vederea pe canal funcționează și îl raportează',
  mInCanal.nboDisponibil && mInCanal.canalNbo === 'INSTORE' && aprox(mInCanal.nboTotalRON!, 3000));

console.log('\n— Calitatea datelor: nimic incomplet nu se ascunde —');
t('neclasificatul, canalul necunoscut și reconcilierea incompletă apar în calitate',
  aprox(a.calitate.neclasificatRON!, 400) && a.calitate.canalNecunoscut && a.calitate.reconciliereIncompleta);
t('motivele reconcilierii vin din punte', a.calitate.motiveReconciliere.length > 0);
t('analiza NU e completă cât timp există lei nerecunoscuți',
  !a.complete && a.motiveIncomplet.some(x => x.includes('UNCLASSIFIED')));
// PMIX lipsă
const aGol = analizaTimeline(s0, ctx0, cer({ perioada: perioadaDin('2026-09-15', 'LUNA') }));
t('fără PMIX: stare indisponibilă explicită + calitate.pmixLipsa',
  !aGol.disponibil && aGol.calitate.pmixLipsa && aGol.motivIndisponibil!.includes('PMIX'));
// rețetă lipsă
const produsFaraReteta: Produs = { cod: 'PX', denumire: 'Fără rețetă', categorie: 'Diverse', tip: 'SIMPLU', pretInstore: 20, tva: 9, activ: true };
const sFaraReteta: AppState = {
  ...s0, produse: [...s0.produse, produsFaraReteta],
  vanzari: [...s0.vanzari, { data: '2026-07-10', locatie: 'L01', canal: 'INSTORE', produs: 'PX', cant: 10, brut: 218, net: 200 }],
};
const aFaraReteta = analizaTimeline(sFaraReteta, buildCtx(sFaraReteta), cer());
t('produsul fără rețetă e numit, iar costul lui e null, nu zero',
  aFaraReteta.calitate.produseFaraReteta.includes('PX')
  && aFaraReteta.produse.find(p => p.produs === 'PX')!.costRON === null
  && aFaraReteta.motiveIncomplet.some(x => x.includes('rețetă')));
// preț lipsă (partea de rețetar)
const ingFaraPret: Ingredient = { cod: 'I096', denumire: 'Fără preț', categorie: 'Diverse', tip: 'FOOD', um: 'kg', preturi: [], activ: true };
const seedFaraPret = genereazaSeed();
const sFaraPret: AppState = {
  ...seedFaraPret, materiale29: [],
  ingrediente: [...seedFaraPret.ingrediente, ingFaraPret],
  retete: seedFaraPret.retete.map(r => (r.cod !== 'P001' ? r : {
    ...r,
    versiuni: r.versiuni.map(v => (v.nr !== r.activa ? v : {
      ...v, linii: [...v.linii.map(l => ({ ...l })), { comp: 'I096', tipComp: 'INGREDIENT' as const, cant: 10, um: 'g' as const, canal: 'AMBELE' as const }],
    })),
  })),
};
const aFaraPret = analizaTimeline(sFaraPret, buildCtx(sFaraPret), cer());
t('ingredientul fără preț: rândul lui de material are cost null și e listat la calitate',
  aFaraPret.materiale.find(x => x.cod === 'I096')!.costRON === null
  && aFaraPret.calitate.preturiLipsa.includes('I096')
  && aFaraPret.motiveIncomplet.some(x => x.includes('preț')));
const sFaraPretCu29: AppState = { ...sFaraPret, materiale29: MATERIALE };
t('prețul lipsă e semnalat ȘI când 2.9 există — nu doar când defalcarea cade pe rețetar',
  analizaTimeline(sFaraPretCu29, buildCtx(sFaraPretCu29), cer()).calitate.preturiLipsa.includes('I096'));
// perioadă incompletă (luna în curs)
const azi = new Date().toISOString().slice(0, 10);
const sAzi: AppState = {
  ...s0,
  vanzari: [...s0.vanzari, { data: `${azi.slice(0, 7)}-01`, locatie: 'L01', canal: 'INSTORE', produs: 'P001', cant: 5, brut: 109, net: 100 }],
};
const aAzi = analizaTimeline(sAzi, buildCtx(sAzi), cer({ perioada: perioadaDin(azi, 'LUNA') }));
t('luna în curs e declarată neîncheiată',
  aAzi.disponibil && aAzi.calitate.perioadaIncompleta && aAzi.motiveIncomplet.some(x => x.includes('neîncheiată')));
// restaurante lipsă din 2.9
t('restaurantul cu vânzări dar fără 2.9 e numit',
  aPartial29.calitate.restauranteLipsa29.some(x => x.includes('L02')));

console.log('\n— Determinism —');
t('două rulări identice, câmp cu câmp', JSON.stringify(a) === JSON.stringify(analizaTimeline(s0, ctx0, cer())));
t('seria e deterministă', JSON.stringify(serieSapt)
  === JSON.stringify(serieTimeline(s0, ctx0, { de: '2026-07-01', la: '2026-07-31', granularitate: 'SAPTAMANA', nivel: COMPANIE, canal: 'TOTAL' })));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
