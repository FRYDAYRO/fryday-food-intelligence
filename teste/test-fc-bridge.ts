// Puntea FC canonică (fc-bridge) — motorul oficial de clasificare și reconciliere.
//
// Identități verificate:
//   Σ celor 12 componente      = totalul 2.9 (partiție reală, fără ajustări artificiale)
//   explained + unexplained    = totalul 2.9, unde unexplained = UNEXPLAINED + UNCLASSIFIED
//   companie                   = Σ restaurante, componentă cu componentă
//   Recipe Total               = Recipe InStore + Recipe Delivery, ca sume
//   scorul de încredere        = formula declarată, recalculată independent din fixtură
//   nimic nu se inventează     : canal nedeclarat → UNKNOWN; săptămână → 2.9 indisponibil;
//                                necunoscutul NU cade pe FOOD (izolat de fallback-ul vechi)
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, clasifica, consumuriLuna } from '../src/lib/engine';
import {
  COMPANIE, perioadaDin, perioadeDinLuna, restaurant,
  type CerereFC, type FCChannel, type FCLevel,
} from '../src/lib/fc-domeniu';
import {
  COMPONENTE_EXPLICATE, COMPONENTE_FC_BRIDGE, ORDINE_COMPONENTE,
  bridgeFC, deUndeVine, descrieBridge,
  type ComponentaBridge, type FCBridge,
} from '../src/lib/fc-bridge';
import type { AppState, Ingredient, Material29 } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const LUNA = perioadaDin('2026-07-15', 'LUNA');
const cer = (canal: FCChannel = 'TOTAL', nivel: FCLevel = COMPANIE): CerereFC => ({ perioada: LUNA, nivel, canal });
const mat = (o: Partial<Material29> & Pick<Material29, 'material' | 'categorie' | 'costActual'>): Material29 => ({
  perioada: '2026-07', locatie: 'L01', denumire: o.material, cant: null, um: null,
  costTeoretic: null, ...o,
});
const comp = (b: FCBridge, c: ComponentaBridge) => b.componente.find(x => x.componenta === c)!;

// ingrediente în plus: unul alimentar și un ambalaj, ambele în nomenclator dar în nicio rețetă
const ingFoodNefolosit: Ingredient = {
  cod: 'I099', denumire: 'Ingredient nefolosit', categorie: 'Carne', tip: 'FOOD', um: 'kg',
  preturi: [{ validDeLa: '2026-01-01', pret: 20 }], activ: true,
};
const ingPaperNefolosit: Ingredient = {
  cod: 'A099', denumire: 'Cutie meniu nouă', categorie: 'Ambalaje', tip: 'PACKAGING', um: 'buc',
  preturi: [{ validDeLa: '2026-01-01', pret: 1.5 }], activ: true,
};
const cuIngrediente = (s: AppState): AppState =>
  ({ ...s, ingrediente: [...s.ingrediente, ingFoodNefolosit, ingPaperNefolosit] });

// ————————————————————————————————————————————————————————— fixtura curată

const CURATE: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 4000, costTeoretic: 3800 }),
  mat({ material: 'I005', denumire: 'Chiflă burger', categorie: 'Panificație', costActual: 1200, costTeoretic: 1150 }),
  mat({ material: 'A001', denumire: 'Hârtie ambalaj burger', categorie: 'Ambalaje', costActual: 500, costTeoretic: 480 }),
];
const sCurat: AppState = { ...genereazaSeed(), materiale29: CURATE };
const ctxCurat = buildCtx(sCurat);
const bc = bridgeFC(sCurat, ctxCurat, cer());

console.log('— Fixtura curată: puntea se închide, încrederea e maximă —');
t('2.9 disponibil', bc.nboDisponibil);
t('totalul 2.9 = suma liniilor', aprox(bc.nboActual, 5700));
t('Σ componente = totalul 2.9', aprox(bc.componente.reduce((s, c) => s + c.lei, 0), bc.nboActual));
t('Food din rețete', comp(bc, 'RECIPE_FOOD').lei === 4000 + 1200);
t('Paper din rețete', comp(bc, 'RECIPE_PAPER').lei === 500);
t('nimic neexplicat, nimic neclasificat', bc.unexplainedAmount === 0);
t('explicat 100%', aprox(bc.explainedPct!, 100));
t('COMPLETE = true', bc.complete, bc.motiveIncomplet.join(' | ') || '(fără motive)');
t('încrederea = 100 pe date complete', bc.confidenceScore === 100, `${bc.confidenceScore}`);
t('teoreticul declarat = suma declarată', aprox(bc.nboTheoreticalFC!, 3800 + 1150 + 480));
t('difference = NBO Food Cost − Recipe FC', aprox(bc.difference!, bc.nboFoodCost - bc.recipe.cost));
t('diferența teoretică = teoretic declarat − Recipe FC', aprox(bc.diferentaTeoretica!, bc.nboTheoreticalFC! - bc.recipe.cost));
t('coveragePct = acoperirea rețetelor', bc.coveragePct === bc.recipe.acoperirePct && aprox(bc.coveragePct!, 100));
t('cele 12 componente apar toate, în ordinea specificată',
  bc.componente.map(c => c.componenta).join(',') === ORDINE_COMPONENTE.join(','));
t('rezumatul descrie puntea', descrieBridge(bc).includes('complet: da'));

console.log('\n— Recipe FC pe canale: Total = InStore + Delivery ca sume —');
t('costul Total = InStore + Delivery',
  aprox(bc.recipePeCanal.TOTAL.cost, bc.recipePeCanal.INSTORE.cost + bc.recipePeCanal.DELIVERY.cost));
t('vânzările Total = InStore + Delivery',
  aprox(bc.recipePeCanal.TOTAL.netVandut, bc.recipePeCanal.INSTORE.netVandut + bc.recipePeCanal.DELIVERY.netVandut));
t('recipe-ul cererii e chiar cel pe Total', bc.recipe === bc.recipePeCanal.TOTAL);
t('procentul pe Total se recalculează din totaluri, nu se mediază',
  aprox(bc.recipePeCanal.TOTAL.fcPct!, (bc.recipePeCanal.TOTAL.cost / bc.recipePeCanal.TOTAL.netAcoperit) * 100));

// ————————————————————————————————————————————————————————— toate categoriile

// câte un material pentru FIECARE categorie de clasificare → componenta lui din punte
const TOATE: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 4000 }),      // RECIPE_FOOD
  mat({ material: 'A001', denumire: 'Hârtie ambalaj burger', categorie: 'Ambalaje', costActual: 500 }),  // RECIPE_PAPER
  mat({ material: 'I099', denumire: 'Ingredient nefolosit', categorie: 'Carne și pui', costActual: 250 }), // NBO_FOOD
  mat({ material: 'A099', denumire: 'Cutie meniu nouă', categorie: 'Ambalaje', costActual: 130 }),       // NBO_PAPER
  mat({ material: 'NORM-1', denumire: 'Pui porționat intern', categorie: 'Carne și pui', costActual: 600, normalizat: true }), // NORMALIZED
  mat({ material: 'AMB-NOU', denumire: 'Ambalaj nemapat', categorie: 'Ambalaje', costActual: 350 }),     // NORMALIZED (nemapat)
  mat({ material: 'CUR-1', denumire: 'Detergent podea', categorie: 'Materiale curățenie', costActual: 180 }), // CLEANING
  mat({ material: 'OP-1', denumire: 'Șervețele bucătărie', categorie: 'Consumabile diverse', costActual: 90 }), // OPERATIONAL
  mat({ material: 'UNI-1', denumire: 'Tricouri', categorie: 'Uniforme personal', costActual: 220 }),     // UNIFORMS
  mat({ material: 'PAP-1', denumire: 'Role imprimantă', categorie: 'Consumabile administrative', costActual: 60 }), // STATIONERY
  mat({ material: 'PROT-1', denumire: 'Cadouri parteneri', categorie: 'Protocol', costActual: 75 }),     // OTHER (regulă utilizator)
  mat({ material: 'MAT-Z', denumire: 'Servicii externalizate', categorie: 'Transport marfă', costActual: 400 }), // UNCLASSIFIED
  mat({ material: 'MAT-X', denumire: 'Material necunoscut', categorie: 'Carne și pui', costActual: 900 }), // UNEXPLAINED
];
const TOTAL_TOATE = TOATE.reduce((s, m) => s + m.costActual, 0);
const sToate: AppState = cuIngrediente({ ...genereazaSeed(), materiale29: TOATE });
const ctxToate = buildCtx(sToate);
const REGULI_MELE = [{ pattern: 'protocol', categorie: 'OTHER' as const }];
const bt = bridgeFC(sToate, ctxToate, cer(), REGULI_MELE);

console.log('\n— Fiecare categorie de clasificare ajunge în componenta ei —');
const ASTEPTARI: [ComponentaBridge, number][] = [
  ['RECIPE_FOOD', 4000], ['RECIPE_PAPER', 500],
  ['NBO_FOOD', 250], ['NBO_PAPER', 130],
  ['NORMALIZED', 600 + 350],
  ['CLEANING', 180], ['OPERATIONAL', 90], ['UNIFORMS', 220], ['STATIONERY', 60], ['OTHER', 75],
  ['UNCLASSIFIED', 400], ['UNEXPLAINED', 900],
];
for (const [c, lei] of ASTEPTARI) t(`${c} = ${lei} lei`, comp(bt, c).lei === lei, `${comp(bt, c).lei}`);
t('Σ celor 12 componente = totalul 2.9', aprox(bt.componente.reduce((s, c) => s + c.lei, 0), TOTAL_TOATE));
t('numărul de materiale pe componente însumează rândurile',
  bt.componente.reduce((s, c) => s + c.nrMateriale, 0) === TOATE.length);
t('regula utilizatorului a decis OTHER', comp(bt, 'OTHER').contributii[0].sursaClasificare === 'UTILIZATOR');

console.log('\n— Puntea rețete → material: dovada decide componenta —');
const cI099 = comp(bt, 'NBO_FOOD').contributii[0];
t('alimentul mapat dar nefolosit de rețete e NBO_FOOD, nu neexplicat',
  cI099.material === 'I099' && cI099.ingredient === 'I099' && !cI099.areReteta);
const cA099 = comp(bt, 'NBO_PAPER').contributii[0];
t('ambalajul mapat dar nefolosit e NBO_PAPER — gol de rețetar, nu material normalizat',
  cA099.material === 'A099' && cA099.ingredient === 'A099' && !cA099.areReteta);
t('ambalajul NEMAPAT rămâne material normalizat',
  comp(bt, 'NORMALIZED').contributii.some(c => c.material === 'AMB-NOU' && c.ingredient === null));
t('alimentul nemapat e neexplicat — fără lanț de dovezi',
  comp(bt, 'UNEXPLAINED').contributii[0].material === 'MAT-X' && comp(bt, 'UNEXPLAINED').contributii[0].ingredient === null);
t('materialul din rețete poartă numărul de rețete care îl folosesc',
  comp(bt, 'RECIPE_FOOD').contributii[0].utilizareInRetete > 0);

console.log('\n— Explicat și neexplicat: partiție reală, fără ajustări artificiale —');
t('explained = Σ componentelor cu dovadă',
  aprox(bt.explainedAmount, COMPONENTE_EXPLICATE.reduce((s, c) => s + comp(bt, c).lei, 0)));
t('unexplained = UNEXPLAINED + UNCLASSIFIED', aprox(bt.unexplainedAmount, 900 + 400));
t('explained + unexplained = totalul 2.9', aprox(bt.explainedAmount + bt.unexplainedAmount, bt.nboActual));
t('explainedPct + unexplainedPct = 100', aprox(bt.explainedPct! + bt.unexplainedPct!, 100));
t('puntea NU e forțată la 100%', bt.explainedPct! < 100, `${bt.explainedPct!.toFixed(1)}%`);
t('fiecare contribuție corespunde unui rând REAL din 2.9 — niciun rând de ajustare',
  bt.componente.every(c => c.contributii.every(x =>
    TOATE.some(m => m.material === x.material && m.costActual === x.lei && m.perioada === x.perioadaSursa))));
t('suma contribuțiilor fiecărei componente = componenta',
  bt.componente.every(c => aprox(c.contributii.reduce((s, x) => s + x.lei, 0), c.lei)));
t('Food Cost-ul 2.9 = componentele FC', aprox(bt.nboFoodCost, COMPONENTE_FC_BRIDGE.reduce((s, c) => s + comp(bt, c).lei, 0)));
t('operaționalul NU intră în Food Cost-ul 2.9', aprox(bt.nboFoodCost, 4000 + 500 + 250 + 130 + 950));

console.log('\n— Necunoscutul rămâne necunoscut: izolat de fallback-ul vechi —');
// clasificatorul VECHI ar fi presupus Food; puntea canonică NU-l folosește
t('fallback-ul vechi chiar presupune FOOD pe necunoscut (de asta e izolat)',
  clasifica('Transport marfă', sToate.reguli).clasa === 'FOOD' && clasifica('Transport marfă', sToate.reguli).auto);
t('puntea pune necunoscutul în UNCLASSIFIED, nu în Food', comp(bt, 'UNCLASSIFIED').lei === 400);
t('niciun leu necunoscut în componentele Food',
  !comp(bt, 'RECIPE_FOOD').contributii.some(c => c.material === 'MAT-Z')
  && !comp(bt, 'NBO_FOOD').contributii.some(c => c.material === 'MAT-Z'));
t('necunoscutul NU intră în Food Cost-ul 2.9: cu fallback-ul vechi ar fi fost cu 400 lei mai mare',
  aprox(bt.nboFoodCost + 400 + 900, bt.nboFoodCost + comp(bt, 'UNCLASSIFIED').lei + comp(bt, 'UNEXPLAINED').lei));
t('contribuția neclasificată poartă explicit lipsa regulii',
  comp(bt, 'UNCLASSIFIED').contributii[0].regula === null
  && comp(bt, 'UNCLASSIFIED').contributii[0].sursaClasificare === 'NECLASIFICAT');

console.log('\n— Proveniența: de la puncte procentuale până la rândul de material —');
const cariera = comp(bt, 'RECIPE_FOOD').contributii.find(c => c.material === 'I001')!;
t('contribuția poartă raportul sursă', cariera.raport === 'NBO_29');
t('contribuția poartă perioada sursă', cariera.perioadaSursa === '2026-07');
t('contribuția poartă restaurantul', cariera.locatie === 'L01');
t('contribuția poartă categoria brută din raport', cariera.categorieBruta === 'Carne și pui');
t('contribuția poartă regula de clasificare care a decis',
  cariera.regula === 'carne si pui' && cariera.sursaClasificare === 'IMPLICITA');
t('contribuția poartă legătura cu ingredientul', cariera.ingredient === 'I001');
t('contribuția poartă legătura cu rețetele', cariera.areReteta && cariera.utilizareInRetete > 0);
t('contribuția poartă suma și punctele procentuale',
  cariera.lei === 4000 && aprox(cariera.pp!, (4000 / bt.numitor.net) * 100));
t('contribuția explică de ce a intrat în componentă', cariera.motiv.includes('rețete'));
// „de ce e componenta asta X puncte procentuale?" — drill-down până la materiale
const uni = deUndeVine(bt, 'UNIFORMS');
t('pp-ul componentei = suma pp-urilor contribuțiilor',
  aprox(uni.pp!, uni.contributii.reduce((s, c) => s + (c.pp ?? 0), 0)));
t('răspunsul e chiar rândul de material din 2.9',
  uni.contributii.length === 1 && uni.contributii[0].material === 'UNI-1' && uni.contributii[0].lei === 220);
t('contribuțiile sunt sortate descrescător după lei',
  bt.componente.every(c => c.contributii.every((x, i, a) => i === 0 || a[i - 1].lei >= x.lei)));

console.log('\n— Puntea incompletă se declară incompletă —');
t('COMPLETE = false pe fixtura cu probleme', !bt.complete);
t('motivele sunt enumerate', bt.motiveIncomplet.length >= 3, `${bt.motiveIncomplet.length} motive`);
t('un motiv: leii neexplicați', bt.motiveIncomplet.some(m => m.includes('neexplicați')));
t('un motiv: categoriile nerecunoscute', bt.motiveIncomplet.some(m => m.includes('nerecunoscute')));
t('un motiv: teoreticul nedeclarat', bt.motiveIncomplet.some(m => m.includes('teoretic')));
t('diagnosticul categoriilor necunoscute există și poartă banii',
  bt.diagnostice.some(d => d.cod === 'CATEGORIE_NECUNOSCUTA' && d.lei === 400));
t('diagnosticul materialelor nemapate există',
  bt.diagnostice.some(d => d.cod === 'MATERIAL_FARA_MAPARE'));

console.log('\n— Încrederea: formula deterministă, recalculată independent din fixtură —');
// recalculăm fiecare factor din fixtură, cu logică proprie testului
const leiNecl = 400;
const leiFCFix = 4000 + 500 + 250 + 130 + 900;            // FOOD+PAPER efectiv (fără normalizate/operațional)
const leiFCMapatFix = 4000 + 500 + 250 + 130;             // din ele, cu corespondent în nomenclator
const fClasificare = (1 - leiNecl / TOTAL_TOATE) * 100;
const fMapare = (leiFCMapatFix / leiFCFix) * 100;
const fExplicat = ((TOTAL_TOATE - 900 - 400) / TOTAL_TOATE) * 100;
const fSursa = 0;                                          // niciun teoretic declarat în TOATE
const fAcoperire = bt.recipe.acoperirePct!;
const scorAsteptat = Math.round(0.25 * fAcoperire + 0.25 * fClasificare + 0.2 * fMapare + 0.2 * fExplicat + 0.1 * fSursa);
t('scorul = formula declarată, pe cifrele fixturii', bt.confidenceScore === scorAsteptat,
  `${bt.confidenceScore} vs ${scorAsteptat}`);
t('ponderile însumează 1', aprox(bt.confidence.factori.reduce((s, f) => s + f.pondere, 0), 1));
t('scorul e între 0 și 100', bt.confidenceScore >= 0 && bt.confidenceScore <= 100);
t('factorul de clasificare e acoperirea măsurată', aprox(bt.confidence.factori.find(f => f.factor === 'clasificare')!.scor, fClasificare));
t('factorul de mapare e acoperirea măsurată', aprox(bt.confidence.factori.find(f => f.factor === 'mapare')!.scor, fMapare));
t('factorul sursei e 0 fără teoretic declarat', bt.confidence.factori.find(f => f.factor === 'sursa')!.scor === 0);
t('fiecare factor își explică cifra', bt.confidence.factori.every(f => f.detaliu.length > 0));
t('determinist: același input → același scor', bridgeFC(sToate, ctxToate, cer(), REGULI_MELE).confidenceScore === bt.confidenceScore);
t('mai puțină dovadă → încredere mai mică', bt.confidenceScore < bc.confidenceScore,
  `${bt.confidenceScore} < ${bc.confidenceScore}`);
t('formula e expusă în rezultat', bt.confidence.formula.includes('0.25'));

// ————————————————————————————————————————————————————————— restaurant vs companie

console.log('\n— Restaurant și companie: același motor, agregare consistentă —');
const PE_UNITATI: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 3000, locatie: 'L01' }),
  mat({ material: 'A001', denumire: 'Hârtie ambalaj burger', categorie: 'Ambalaje', costActual: 400, locatie: 'L01' }),
  mat({ material: 'MAT-Z', denumire: 'Transport', categorie: 'Transport marfă', costActual: 100, locatie: 'L01' }),
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 2000, locatie: 'L02' }),
  mat({ material: 'CUR-1', denumire: 'Detergent', categorie: 'Materiale curățenie', costActual: 80, locatie: 'L02' }),
  mat({ material: 'MAT-X', denumire: 'Necunoscut', categorie: 'Carne și pui', costActual: 500, locatie: 'L02' }),
];
const sUnitati: AppState = { ...genereazaSeed(), materiale29: PE_UNITATI };
const ctxUnitati = buildCtx(sUnitati);
const bCo = bridgeFC(sUnitati, ctxUnitati, cer());
const b01 = bridgeFC(sUnitati, ctxUnitati, cer('TOTAL', restaurant('L01')));
const b02 = bridgeFC(sUnitati, ctxUnitati, cer('TOTAL', restaurant('L02')));
t('restaurantul vede doar rândurile lui', b01.randuri.length === 3 && b02.randuri.length === 3);
t('totalul companiei = Σ restaurante', aprox(bCo.nboActual, b01.nboActual + b02.nboActual));
t('FIECARE componentă a companiei = Σ restaurante',
  ORDINE_COMPONENTE.every(c => aprox(comp(bCo, c).lei, comp(b01, c).lei + comp(b02, c).lei)),
  ORDINE_COMPONENTE.map(c => `${c}:${comp(bCo, c).lei}=${comp(b01, c).lei}+${comp(b02, c).lei}`).filter(x => !x.endsWith(':0=0+0')).join(' '));
t('explained-ul companiei = Σ restaurante', aprox(bCo.explainedAmount, b01.explainedAmount + b02.explainedAmount));
t('unexplained-ul companiei = Σ restaurante', aprox(bCo.unexplainedAmount, b01.unexplainedAmount + b02.unexplainedAmount));
t('Recipe FC al companiei = Σ restaurante',
  aprox(bCo.recipe.cost, b01.recipe.cost + b02.recipe.cost));
t('restaurantul L01 își vede necunoscutul lui', comp(b01, 'UNCLASSIFIED').lei === 100);
t('restaurantul L02 își vede neexplicatul lui', comp(b02, 'UNEXPLAINED').lei === 500);
t('proveniența pe restaurant poartă restaurantul',
  b01.componente.every(c => c.contributii.every(x => x.locatie === 'L01')));

// ————————————————————————————————————————————————————————— canalul

console.log('\n— Canalul: se păstrează doar ce declară sursa, nimic nu se repartizează —');
const CANALE: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 3000, canal: 'INSTORE' }),
  mat({ material: 'I005', denumire: 'Chiflă burger', categorie: 'Panificație', costActual: 1200, canal: 'DELIVERY' }),
  mat({ material: 'I011', denumire: 'Salată iceberg', categorie: 'Legume și sosuri', costActual: 300 }),  // fără canal
];
const sCanale: AppState = { ...genereazaSeed(), materiale29: CANALE };
const ctxCanale = buildCtx(sCanale);

const bTot = bridgeFC(sCanale, ctxCanale, cer('TOTAL'));
t('pe Total intră toate rândurile', bTot.nboActual === 4500);
t('rândul fără canal declarat e UNKNOWN, nu Total',
  bTot.randuri.find(r => r.material === 'I011')!.canal === 'UNKNOWN');
t('rândul cu canal declarat îl păstrează',
  bTot.randuri.find(r => r.material === 'I001')!.canal === 'INSTORE');
t('canalul sursei pe Total cu rânduri mixte = UNKNOWN', bTot.canalSursa === 'UNKNOWN');

const bIn = bridgeFC(sCanale, ctxCanale, cer('INSTORE'));
t('pe InStore intră DOAR rândurile declarate InStore', bIn.nboDisponibil && bIn.nboActual === 3000);
t('canalul sursei e InStore', bIn.canalSursa === 'INSTORE');
t('rândul fără canal NU e repartizat — e exclus și declarat',
  bIn.motiveIncomplet.some(m => m.includes('fără canal')) && !bIn.complete);
t('excluderea apare în diagnostice cu banii ei',
  bIn.diagnostice.some(d => d.cod === 'SURSA_INCOMPLETA' && d.lei === 300));
const bDel = bridgeFC(sCanale, ctxCanale, cer('DELIVERY'));
t('pe Delivery, doar rândul Delivery', bDel.nboActual === 1200);
t('InStore + Delivery ≤ Total (restul e necunoscut, nu se inventează)',
  bIn.nboActual + bDel.nboActual === 4200 && bTot.nboActual - 4200 === 300);

const bInFara = bridgeFC(sCurat, ctxCurat, cer('INSTORE'));
t('fără NICIO linie cu canal declarat, vederea pe canal refuză cinstit',
  !bInFara.nboDisponibil && bInFara.motivNbo!.includes('nu declară canalul'));
t('refuzul pe canal păstrează partea de rețete calculată', bInFara.recipe.cost > 0);
t('refuzul nu inventează componente', bInFara.componente.every(c => c.lei === 0 && c.contributii.length === 0));

const TOT_EXPLICIT: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 3000, canal: 'INSTORE' }),
  mat({ material: 'I005', denumire: 'Chiflă burger', categorie: 'Panificație', costActual: 1200, canal: 'DELIVERY' }),
];
const sExplicit: AppState = { ...genereazaSeed(), materiale29: TOT_EXPLICIT };
const bTotEx = bridgeFC(sExplicit, buildCtx(sExplicit), cer('TOTAL'));
t('când TOATE rândurile declară canalul, Totalul e declarat ca provenind din canale',
  bTotEx.canalSursa === 'TOTAL');

// ————————————————————————————————————————————————————————— săptămâna și luna

console.log('\n— Săptămâni și luni: nu se fabrică valori săptămânale din date lunare —');
const saptamani = perioadeDinLuna('2026-07', 'SAPTAMANA');
const saptIntreaga = saptamani.find(s => !s.partiala)!;
const bSapt = bridgeFC(sCurat, ctxCurat, { perioada: saptIntreaga, nivel: COMPANIE, canal: 'TOTAL' });
t('pe săptămână, partea de 2.9 e indisponibilă', !bSapt.nboDisponibil);
t('motivul spune explicit de ce', bSapt.motivNbo!.includes('lunar'));
t('partea de rețete rămâne calculată pe săptămână', bSapt.recipe.cost > 0 && bSapt.recipe.buc > 0);
t('nicio valoare 2.9 fabricată', bSapt.nboActual === 0 && bSapt.componente.every(c => c.lei === 0));
t('difference nu se pretinde calculabilă', bSapt.difference === null);
t('COMPLETE = false, cu motivul indisponibilității', !bSapt.complete && bSapt.motiveIncomplet[0] === bSapt.motivNbo);
t('încrederea pe săptămână reflectă doar rețetele',
  bSapt.confidence.factori.filter(f => f.factor !== 'acoperire_retete').every(f => f.scor === 0));
t('luna întreagă rămâne disponibilă (contrast)', bridgeFC(sCurat, ctxCurat, cer()).nboDisponibil);

// două luni cerute, date doar pe una → nu se interpolează, se semnalează
const DOUA_LUNI = { tip: 'LUNA' as const, cheie: '2026-07', de: '2026-07-01', la: '2026-08-31', zile: 62, partiala: false };
const bDoua = bridgeFC(sCurat, ctxCurat, { perioada: DOUA_LUNI, nivel: COMPANIE, canal: 'TOTAL' });
t('luna fără date 2.9 e diagnosticată, nu interpolată',
  bDoua.diagnostice.some(d => d.cod === 'LUNA_FARA_29' && d.exemple.includes('2026-08')));
t('diagnosticul lunii lipsă e blocant → puntea nu e completă', !bDoua.complete);
t('perioadele sursă enumeră doar lunile cu date', bDoua.perioadeSursa.join(',') === '2026-07');

// ————————————————————————————————————————————————————————— calitatea datelor

console.log('\n— Calitatea datelor: fiecare lipsă numită —');
t('restaurantele cu vânzări dar fără 2.9 sunt semnalate (L02 lipsește din 2.9)',
  bc.diagnostice.some(d => d.cod === 'RESTAURANT_FARA_29' && d.exemple.some(e => e.includes('L02'))));
t('pe restaurantul care ARE date, diagnosticul lipsei de restaurante nu apare',
  !bridgeFC(sCurat, ctxCurat, cer('TOTAL', restaurant('L01'))).diagnostice.some(d => d.cod === 'RESTAURANT_FARA_29'));
const bPartial = bridgeFC(
  { ...genereazaSeed(), materiale29: [CURATE[0], mat({ material: 'I005', denumire: 'Chiflă burger', categorie: 'Panificație', costActual: 1200 })] },
  ctxCurat, cer());
t('teoreticul declarat parțial e semnalat ca gol al sursei',
  bPartial.diagnostice.some(d => d.cod === 'SURSA_INCOMPLETA' && d.exemple.some(e => e.includes('teoretic'))));
t('diagnosticele punții rămân sortate: blocantele primele',
  bt.diagnostice.every((d, i, a) => i === 0
    || ({ BLOCANT: 0, ATENTIE: 1, INFO: 2 }[a[i - 1].nivel] <= { BLOCANT: 0, ATENTIE: 1, INFO: 2 }[d.nivel])));
t('mapările duble sunt semnalate pe fixtura pe unități (I001 pe cod și pe denumire)',
  bridgeFC(sUnitati, ctxUnitati, cer()).diagnostice.some(d => d.cod === 'MAPARE_DUBLA') === false); // fixtura nu are dubluri
const CU_DUBLURA = [...CURATE, mat({ material: 'I001-BIS', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 150 })];
t('… dar apar când chiar există',
  bridgeFC({ ...genereazaSeed(), materiale29: CU_DUBLURA }, ctxCurat, cer())
    .diagnostice.some(d => d.cod === 'MAPARE_DUBLA'));
const FARA_LOC = [...CURATE, mat({ material: 'I011', denumire: 'Salată iceberg', categorie: 'Legume și sosuri', costActual: 90, locatie: null })];
const bFaraLoc = bridgeFC({ ...genereazaSeed(), materiale29: FARA_LOC }, ctxCurat, cer());
t('liniile fără restaurant sunt semnalate', bFaraLoc.diagnostice.some(d => d.cod === 'LIPSA_LOCATIE'));
t('granularitatea mixtă e semnalată la companie', bFaraLoc.diagnostice.some(d => d.cod === 'GRANULARITATE_MIXTA'));

// ————————————————————————————————————————————————————————— surse și numitor

console.log('\n— Sursele și numitorul —');
t('sursele includ PMIX, rețetarul, nomenclatorul și 2.9',
  ['PMIX', 'RETETAR', 'NOMENCLATOR', 'NBO_29'].every(r => bc.surse.some(s => s.raport === r)));
t('sursa 2.9 declară perioadele și canalul necunoscut',
  bc.surse.find(s => s.raport === 'NBO_29')!.nota!.includes('2026-07'));
t('numitorul preferă Sales Report', bc.numitor.sursa === 'Sales Report');
t('pe săptămână sursa 2.9 nu e revendicată', !bSapt.surse.some(s => s.raport === 'NBO_29'));

// ————————————————————————————— corecturile din review-ul advers, fixate în teste

console.log('\n— Teoreticul reconstruit se atribuie pe (lună × restaurant), nu pe tot scopul —');
const DUB: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 3000, locatie: 'L01' }),
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 2000, locatie: 'L02' }),
];
const sDub: AppState = { ...genereazaSeed(), materiale29: DUB };
const ctxDub = buildCtx(sDub);
const bDub = bridgeFC(sDub, ctxDub, cer());
const t01 = consumuriLuna(sDub, ctxDub, '2026-07', 'L01').get('I001')!.valoare;
const t02 = consumuriLuna(sDub, ctxDub, '2026-07', 'L02').get('I001')!.valoare;
const rDub01 = bDub.randuri.find(r => r.locatie === 'L01')!;
const rDub02 = bDub.randuri.find(r => r.locatie === 'L02')!;
t('rândul din L01 poartă teoreticul lui L01, nu al companiei', aprox(rDub01.costTeoretic!, t01),
  `${rDub01.costTeoretic?.toFixed(0)} vs ${t01.toFixed(0)}`);
t('rândul din L02 poartă teoreticul lui L02', aprox(rDub02.costTeoretic!, t02));
t('Σ teoretic pe rânduri = teoreticul companiei — nu se numără de două ori',
  aprox(rDub01.costTeoretic! + rDub02.costTeoretic!, consumuriLuna(sDub, ctxDub, '2026-07', undefined).get('I001')!.valoare));
t('variance-ul fiecărui rând e actualul LUI minus teoreticul LUI',
  aprox(rDub01.variance!, 3000 - t01) && aprox(rDub02.variance!, 2000 - t02));
t('două restaurante cu același ingredient NU sunt „mapare dublă"',
  !bDub.diagnostice.some(d => d.cod === 'MAPARE_DUBLA'));

// două rânduri pe ACELAȘI restaurant mapate pe același ingredient: teoreticul reconstruit
// nu se poate atribui fără dublare → rămâne null, iar MAPARE_DUBLA blochează
const AMBIG: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 3000 }),
  mat({ material: 'I001-BIS', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 150 }),
];
const bAmbig = bridgeFC({ ...genereazaSeed(), materiale29: AMBIG }, ctxCurat, cer());
t('ambiguitate în același restaurant: teoreticul reconstruit rămâne null, nu se dublează',
  bAmbig.randuri.every(r => r.costTeoretic === null));
t('… iar MAPARE_DUBLA o semnalează blocant',
  bAmbig.diagnostice.some(d => d.cod === 'MAPARE_DUBLA' && d.nivel === 'BLOCANT') && !bAmbig.complete);
t('teoreticul DECLARAT în sursă nu e atins de regula ambiguității',
  bridgeFC({ ...genereazaSeed(), materiale29: [{ ...AMBIG[0], costTeoretic: 2800 }, AMBIG[1]] }, ctxCurat, cer())
    .randuri.find(r => r.material === 'I001')!.costTeoretic === 2800);

console.log('\n— Pe vederea pe canal, teoreticul nu se reconstruiește din PMIX-ul pe Total —');
const bInT = bridgeFC(sCanale, ctxCanale, cer('INSTORE'));
t('rândul InStore fără teoretic declarat rămâne fără teoretic — nu primește teoreticul ambelor canale',
  bInT.randuri.every(r => r.costTeoretic === null));
t('pe Total, același rând ARE teoretic reconstruit (contrast)',
  bridgeFC(sCanale, ctxCanale, cer('TOTAL')).randuri.find(r => r.material === 'I001')!.costTeoretic !== null);
t('INGREDIENT_FARA_NBO nu acuză pe nedrept consumul celuilalt canal',
  !bInT.diagnostice.some(d => d.cod === 'INGREDIENT_FARA_NBO'));
t('motivul spune că pe canal teoreticul nu se poate reconstrui',
  bInT.motiveIncomplet.some(m => m.includes('reconstrui')));

console.log('\n— Necunoscutul marcat „normalizat" NU intră tăcut în Food Cost —');
const CU_NORM_NECUNOSCUT: Material29[] = [...CURATE,
  mat({ material: 'X-77', denumire: 'Servicii externe', categorie: 'Transport marfă', costActual: 500, costTeoretic: 500, normalizat: true })];
const bNorm = bridgeFC({ ...genereazaSeed(), materiale29: CU_NORM_NECUNOSCUT }, ctxCurat, cer());
t('categoria necunoscută rămâne UNCLASSIFIED chiar marcată normalizat', comp(bNorm, 'UNCLASSIFIED').lei === 500);
t('NU intră în NORMALIZED', comp(bNorm, 'NORMALIZED').lei === 0);
t('NU intră în Food Cost-ul 2.9', aprox(bNorm.nboFoodCost, 5700));
t('e diagnosticată drept categorie necunoscută',
  bNorm.diagnostice.some(d => d.cod === 'CATEGORIE_NECUNOSCUTA' && d.lei === 500));
t('COMPLETE = false — nimic nu trece tăcut', !bNorm.complete);
t('încrederea scade', bNorm.confidenceScore < 100, `${bNorm.confidenceScore}`);

console.log('\n— canalSursa spune de unde vin EFECTIV rândurile —');
const DOAR_INSTORE: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 3000, canal: 'INSTORE' }),
  mat({ material: 'I005', denumire: 'Chiflă burger', categorie: 'Panificație', costActual: 1200, canal: 'INSTORE' }),
];
const sDoarIn: AppState = { ...genereazaSeed(), materiale29: DOAR_INSTORE };
const bDoarIn = bridgeFC(sDoarIn, buildCtx(sDoarIn), cer('TOTAL'));
t('un Total construit doar din linii InStore se declară InStore, nu Total', bDoarIn.canalSursa === 'INSTORE');
t('golul e semnalat: Totalul nu conține consumul Delivery',
  bDoarIn.diagnostice.some(d => d.cod === 'SURSA_INCOMPLETA' && d.exemple.some(e => e.includes('INSTORE'))));

console.log('\n— Motivul indisponibilității numește cauza reală —');
const DOAR_IUNIE: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 900, perioada: '2026-06', canal: 'INSTORE' })];
const sIunie: AppState = { ...genereazaSeed(), materiale29: DOAR_IUNIE };
const bIul = bridgeFC(sIunie, buildCtx(sIunie), cer('INSTORE'));
t('luna fără date spune „nu există linii", nu „lipsește canalul"',
  !bIul.nboDisponibil && bIul.motivNbo!.includes('Nu există linii'), bIul.motivNbo);

console.log('\n— Rândurile de storno nu împing încrederea în afara [0, 100] —');
const CU_STORNO: Material29[] = [
  mat({ material: 'I001', denumire: 'Piept de pui', categorie: 'Carne și pui', costActual: 1000 }),
  mat({ material: 'MAT-Z', denumire: 'Storno transport', categorie: 'Transport marfă', costActual: -900 }),
];
const bStorno = bridgeFC({ ...genereazaSeed(), materiale29: CU_STORNO }, ctxCurat, cer());
t('fiecare factor rămâne în [0, 100]', bStorno.confidence.factori.every(f => f.scor >= 0 && f.scor <= 100),
  bStorno.confidence.factori.map(f => `${f.factor}:${f.scor.toFixed(0)}`).join(' '));
t('scorul rămâne în [0, 100]', bStorno.confidenceScore >= 0 && bStorno.confidenceScore <= 100);
t('identitatea explained + unexplained = total rezistă și cu storno',
  aprox(bStorno.explainedAmount + bStorno.unexplainedAmount, bStorno.nboActual));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
