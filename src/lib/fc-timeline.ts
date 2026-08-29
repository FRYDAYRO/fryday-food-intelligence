// Timeline-ul FC și analitica Restaurant / Companie — stratul care COMPUNE motoarele
// canonice existente într-un singur tablou: alegi perioada (săptămână/lună), scopul
// (companie/restaurant), canalul și comparația, și primești metricile, delta, seria în
// timp, defalcările și clasamentele — toate din ACELEAȘI funcții de calcul.
//
// Reguli care nu se încalcă:
//  · o singură formulă: restaurantul și compania trec prin exact aceeași `metriciFC`;
//    compania nu are un calcul propriu — e aceeași funcție pe scop mai larg, iar suma
//    restaurantelor se verifică prin identități, nu prin promisiuni;
//  · lună cu lună, săptămână cu săptămână: comparațiile pe granularități diferite se
//    refuză cu motiv, iar istoricul lipsă întoarce o stare indisponibilă explicită;
//  · nu se fabrică valori săptămânale din date lunare: pe săptămâni partea de 2.9 se
//    declară indisponibilă (prin refuzul punții), iar partea de rețete rămâne calculată;
//  · pp ≠ %: metricile de FC se compară în puncte procentuale, cele în lei ca diferență
//    absolută (plus % relativ) — tipurile de delta le țin separate;
//  · toate procentele de FC stau pe ACELAȘI numitor (vânzările nete declarate de
//    `numitorFC`), ca seria teoretic/actual/teoretic-NBO să fie comparabilă;
//  · datele incomplete nu se ascund: perioade neîncheiate, restaurante lipsă, PMIX/rețete/
//    prețuri lipsă, canale necunoscute, materiale neclasificate, reconciliere incompletă —
//    toate apar numite în calitate, cu `complete: false`.
import { AZI_ISO, costProdus, pretCurent, pretLa } from './engine';
import type { AppState, Canal } from './types';
import {
  canalePentru, contineData, locatieDin, perioadaAnterioara, perioadaDin, perioadeIntre, restaurant,
  type CerereFC, type CtxFC, type FCChannel, type FCChannelSursa, type FCLevel, type FCPeriod,
  type FCPeriodType, type SursaFC,
} from './fc-domeniu';
import { numitorFC, recipeFC } from './fc-core';
import { bridgeFC, type ComponentaBridge, type FCBridge } from './fc-bridge';
import { consumaPerioada } from './fc-ingrediente';

// ————————————————————————————————————————————————————————— cererea

export type TipComparatieTL = 'PERIOADA_PRECEDENTA' | 'ACEEASI_PERIOADA_AN_PRECEDENT';

export interface CerereTimeline extends CerereFC {
  comparatie: TipComparatieTL;
}

// ————————————————————————————————————————————————————————— metricile unei perioade

/**
 * Metricile de bază pentru (perioadă × scop × canal). Partea de rețete există întotdeauna;
 * partea de 2.9 vine din puntea canonică (`bridgeFC`) și se declară indisponibilă cinstit
 * pe săptămâni sau fără date. Toate procentele stau pe `salesRON`.
 */
export interface MetriciFC {
  salesRON: number;
  sursaVanzari: 'Sales Report' | 'PMIX';

  /** FC teoretic din rețete: cost ÷ vânzări nete. */
  recipeFcPct: number | null;
  recipeCostRON: number;
  foodCostRON: number;
  paperCostRON: number;
  /** Cât din vânzări au rețetă calculabilă. */
  acoperirePct: number | null;
  /** Partea de vânzări cu cost COMPLET calculabil (fără componente neprețuite). */
  acoperireCompletaPct: number | null;
  /** Vânzări acoperite de rețetă, dar al căror cost e o limită de jos. */
  netCostIncomplet: number;

  nboDisponibil: boolean;
  motivNbo?: string;
  /** Canalul din care provin efectiv datele 2.9 — UNKNOWN când sursa nu îl declară. */
  canalNbo: FCChannelSursa;
  /** Teoreticul DECLARAT de 2.9 (nu se inventează). */
  nboTheoreticalRON: number | null;
  nboTheoreticalFcPct: number | null;
  /** Partea de Food Cost a consumului real 2.9. */
  nboActualRON: number | null;
  nboActualFcPct: number | null;
  /** Tot consumul 2.9, inclusiv operaționalul. */
  nboTotalRON: number | null;
  /** NBO actual (FC) − costul din rețete. */
  varianceRON: number | null;
  variancePp: number | null;
  explainedPct: number | null;
  unexplainedPct: number | null;
  unexplainedRON: number | null;
  operationalRON: number | null;
  normalizedRON: number | null;
  unclassifiedRON: number | null;

  /** Scorul punții când 2.9 există; altfel acoperirea rețetelor. Determinist, documentat. */
  confidence: number;
}

/** Metricile unei cereri — ACEEAȘI funcție pentru restaurant și companie. */
export function metriciFC(state: AppState, ctx: CtxFC, cerere: CerereFC): MetriciFC {
  const recipe = recipeFC(state, ctx, cerere);
  const numitor = numitorFC(state, cerere, recipe.netVandut);
  const b = bridgeFC(state, ctx, cerere);
  const net = numitor.net;
  const pct = (lei: number | null) => (lei !== null && net > 0 ? (lei / net) * 100 : null);
  const comp = (c: ComponentaBridge) => b.componente.find(x => x.componenta === c)?.lei ?? 0;

  const operational = b.nboDisponibil
    ? comp('CLEANING') + comp('OPERATIONAL') + comp('UNIFORMS') + comp('STATIONERY') + comp('OTHER')
    : null;

  return {
    salesRON: net, sursaVanzari: numitor.sursa,
    recipeFcPct: pct(recipe.cost),
    recipeCostRON: recipe.cost, foodCostRON: recipe.costFood, paperCostRON: recipe.costPaper,
    acoperirePct: recipe.acoperirePct,
    acoperireCompletaPct: recipe.acoperireCompletaPct,
    netCostIncomplet: recipe.netCostIncomplet,

    nboDisponibil: b.nboDisponibil,
    ...(b.motivNbo !== undefined ? { motivNbo: b.motivNbo } : {}),
    canalNbo: b.canalSursa,
    nboTheoreticalRON: b.nboTheoreticalFC,
    nboTheoreticalFcPct: pct(b.nboTheoreticalFC),
    nboActualRON: b.nboDisponibil ? b.nboFoodCost : null,
    nboActualFcPct: b.nboDisponibil ? pct(b.nboFoodCost) : null,
    nboTotalRON: b.nboDisponibil ? b.nboActual : null,
    varianceRON: b.difference,
    variancePp: b.difference !== null ? pct(b.difference) : null,
    explainedPct: b.nboDisponibil ? b.explainedPct : null,
    unexplainedPct: b.nboDisponibil ? b.unexplainedPct : null,
    unexplainedRON: b.nboDisponibil ? b.unexplainedAmount : null,
    operationalRON: operational,
    normalizedRON: b.nboDisponibil ? comp('NORMALIZED') : null,
    unclassifiedRON: b.nboDisponibil ? comp('UNCLASSIFIED') : null,

    confidence: b.nboDisponibil ? b.confidenceScore : Math.round(Math.min(100, Math.max(0, recipe.acoperirePct ?? 0))),
  };
}

// ————————————————————————————————————————————————————————— comparația (pp ≠ %)

/** Delta pentru metrici PROCENTUALE: diferența e în puncte procentuale, niciodată „%". */
export interface DeltaPp { curent: number | null; precedent: number | null; deltaPp: number | null; }
/** Delta pentru metrici în LEI: diferența absolută + variația relativă. */
export interface DeltaRON { curent: number | null; precedent: number | null; deltaRON: number | null; deltaPct: number | null; }

const dPp = (c: number | null, p: number | null): DeltaPp =>
  ({ curent: c, precedent: p, deltaPp: c !== null && p !== null ? c - p : null });
const dRON = (c: number | null, p: number | null): DeltaRON => ({
  curent: c, precedent: p,
  deltaRON: c !== null && p !== null ? c - p : null,
  deltaPct: c !== null && p !== null && p !== 0 ? ((c - p) / p) * 100 : null,
});

export interface ComparatieFC {
  disponibil: boolean;
  motivIndisponibil?: string;
  perioadaPrecedenta: FCPeriod | null;
  precedent: MetriciFC | null;
  /** pp pentru procente, lei pentru sume — tipurile nu se amestecă. */
  recipeFc: DeltaPp;
  nboActualFc: DeltaPp;
  explained: DeltaPp;
  sales: DeltaRON;
  recipeCost: DeltaRON;
  foodCost: DeltaRON;
  paperCost: DeltaRON;
  nboActual: DeltaRON;
  variance: DeltaRON;
  operational: DeltaRON;
  normalized: DeltaRON;
}

/** Perioada de comparație — sau `null` cu motiv, când granularitatea/istoricul nu o permit. */
export function perioadaComparatie(per: FCPeriod, comparatie: TipComparatieTL): { perioada: FCPeriod | null; motiv?: string } {
  if (per.partiala) {
    return { perioada: null, motiv: `Perioada ${per.cheie} e tăiată la ${per.zile} zile — comparația cu una întreagă ar amesteca granularități.` };
  }
  if (comparatie === 'PERIOADA_PRECEDENTA') return { perioada: perioadaAnterioara(per) };
  if (per.tip !== 'LUNA') {
    return { perioada: null, motiv: 'Comparația cu anul precedent există doar pe luni: săptămânile ISO nu au un corespondent unic anul trecut.' };
  }
  const [an, l] = per.cheie.split('-').map(Number);
  return { perioada: perioadaDin(`${an - 1}-${String(l).padStart(2, '0')}-01`, 'LUNA') };
}

export function comparaFC(state: AppState, ctx: CtxFC, cerere: CerereTimeline): ComparatieFC {
  const goale: Omit<ComparatieFC, 'disponibil' | 'motivIndisponibil' | 'perioadaPrecedenta' | 'precedent'> = {
    recipeFc: dPp(null, null), nboActualFc: dPp(null, null), explained: dPp(null, null),
    sales: dRON(null, null), recipeCost: dRON(null, null), foodCost: dRON(null, null),
    paperCost: dRON(null, null), nboActual: dRON(null, null), variance: dRON(null, null),
    operational: dRON(null, null), normalized: dRON(null, null),
  };
  const { perioada: perPrec, motiv } = perioadaComparatie(cerere.perioada, cerere.comparatie);
  if (!perPrec) {
    return { disponibil: false, motivIndisponibil: motiv, perioadaPrecedenta: null, precedent: null, ...goale };
  }
  // istoric lipsă = stare indisponibilă explicită, nu zerouri
  const loc = locatieDin(cerere.nivel);
  const canale = canalePentru(cerere.canal);
  const areVanzari = state.vanzari.some(v =>
    contineData(perPrec, v.data) && (!loc || v.locatie === loc) && canale.includes(v.canal as Canal));
  if (!areVanzari) {
    return {
      disponibil: false,
      motivIndisponibil: `Nu există vânzări pe ${perPrec.cheie}${loc ? ` la ${loc}` : ''} — comparația nu are față de ce se face.`,
      perioadaPrecedenta: perPrec, precedent: null, ...goale,
    };
  }
  const c = metriciFC(state, ctx, cerere);
  const p = metriciFC(state, ctx, { ...cerere, perioada: perPrec });
  return {
    disponibil: true, perioadaPrecedenta: perPrec, precedent: p,
    recipeFc: dPp(c.recipeFcPct, p.recipeFcPct),
    nboActualFc: dPp(c.nboActualFcPct, p.nboActualFcPct),
    explained: dPp(c.explainedPct, p.explainedPct),
    sales: dRON(c.salesRON, p.salesRON),
    recipeCost: dRON(c.recipeCostRON, p.recipeCostRON),
    foodCost: dRON(c.foodCostRON, p.foodCostRON),
    paperCost: dRON(c.paperCostRON, p.paperCostRON),
    nboActual: dRON(c.nboActualRON, p.nboActualRON),
    variance: dRON(c.varianceRON, p.varianceRON),
    operational: dRON(c.operationalRON, p.operationalRON),
    normalized: dRON(c.normalizedRON, p.normalizedRON),
  };
}

// ————————————————————————————————————————————————————————— seria în timp

export interface PunctTimeline {
  perioada: FCPeriod;
  granularitate: FCPeriodType;
  nivel: string;
  canal: FCChannel;
  metrici: MetriciFC;
  /** Acoperirea surselor punctului — rânduri intrate efectiv în calcul. */
  surse: SursaFC[];
  /** Punct pe o perioadă tăiată sau neîncheiată — comparabil doar cu grijă. */
  partial: boolean;
  confidence: number;
}

/**
 * Seria de puncte pe interval, la granularitatea cerută. Pe săptămâni, partea de 2.9 a
 * fiecărui punct e indisponibilă prin refuzul punții — valorile săptămânale NU se
 * fabrică din date lunare.
 */
export function serieTimeline(
  state: AppState, ctx: CtxFC,
  opt: { de: string; la: string; granularitate: FCPeriodType; nivel: FCLevel; canal: FCChannel },
): PunctTimeline[] {
  const azi = AZI_ISO();
  return perioadeIntre(opt.de, opt.la, opt.granularitate).map(per => {
    const cerere: CerereFC = { perioada: per, nivel: opt.nivel, canal: opt.canal };
    const m = metriciFC(state, ctx, cerere);
    const recipe = recipeFC(state, ctx, cerere);
    return {
      perioada: per, granularitate: opt.granularitate,
      nivel: locatieDin(opt.nivel) ?? 'COMPANIE', canal: opt.canal,
      metrici: m,
      surse: recipe.surse,
      partial: per.partiala || per.la >= azi,
      confidence: m.confidence,
    };
  });
}

// ————————————————————————————————————————————————————————— defalcările (drill-down)

export interface RandCategorieTL {
  categorie: string;
  net: number; buc: number;
  costRON: number; foodRON: number; paperRON: number;
  fcPct: number | null;          // cost ÷ netul categoriei
  mixPct: number | null;         // netul categoriei ÷ netul scopului
}

export interface RandProdusTL {
  produs: string; denumire: string; categorie: string;
  net: number; buc: number;
  costRON: number | null;        // null = fără rețetă — nu zero
  fcPct: number | null;
  mixPct: number | null;
  areReteta: boolean;
}

export interface RandMaterialTL {
  cod: string; denumire: string;
  /** De unde vine rândul: consumul real 2.9 sau consumul teoretic din rețetar. */
  sursa: 'NBO_29' | 'RETETAR';
  categorie: string;
  costRON: number | null;        // null = preț lipsă (pe rândurile din rețetar)
  pct: number | null;            // % din costul defalcării
}

interface Defalcari { categorii: RandCategorieTL[]; produse: RandProdusTL[]; materiale: RandMaterialTL[]; }

function defalcari(state: AppState, ctx: CtxFC, cerere: CerereFC, bridge: FCBridge, preturiLipsa: Set<string>): Defalcari {
  const loc = locatieDin(cerere.nivel);
  const canale = canalePentru(cerere.canal);
  const memo = new Map<string, unknown>();
  const peProdus = new Map<string, { net: number; buc: number; cost: number; food: number; paper: number; areReteta: boolean }>();
  let netScop = 0;
  for (const v of state.vanzari) {
    if (!contineData(cerere.perioada, v.data)) continue;
    if (loc && v.locatie !== loc) continue;
    if (!canale.includes(v.canal as Canal)) continue;
    netScop += v.net;
    const a = peProdus.get(v.produs) ?? { net: 0, buc: 0, cost: 0, food: 0, paper: 0, areReteta: true };
    a.net += v.net; a.buc += v.cant;
    const c = costProdus(v.produs, v.canal as Canal, ctx, v.data, memo);
    if (c) { a.cost += c.total * v.cant; a.food += c.food * v.cant; a.paper += c.paper * v.cant; }
    else a.areReteta = false;
    peProdus.set(v.produs, a);
  }

  const produse: RandProdusTL[] = [...peProdus.entries()].map(([cod, a]) => ({
    produs: cod, denumire: ctx.produse.get(cod)?.denumire ?? cod,
    categorie: ctx.produse.get(cod)?.categorie ?? '—',
    net: a.net, buc: a.buc,
    costRON: a.areReteta ? a.cost : null,
    fcPct: a.areReteta && a.net > 0 ? (a.cost / a.net) * 100 : null,
    mixPct: netScop > 0 ? (a.net / netScop) * 100 : null,
    areReteta: a.areReteta,
  })).sort((a, b) => b.net - a.net || a.produs.localeCompare(b.produs));

  const peCategorie = new Map<string, { net: number; buc: number; cost: number; food: number; paper: number }>();
  for (const p of produse) {
    const c = peCategorie.get(p.categorie) ?? { net: 0, buc: 0, cost: 0, food: 0, paper: 0 };
    c.net += p.net; c.buc += p.buc;
    const a = peProdus.get(p.produs)!;
    if (p.areReteta) { c.cost += a.cost; c.food += a.food; c.paper += a.paper; }
    peCategorie.set(p.categorie, c);
  }
  const categorii: RandCategorieTL[] = [...peCategorie.entries()].map(([categorie, c]) => ({
    categorie, net: c.net, buc: c.buc,
    costRON: c.cost, foodRON: c.food, paperRON: c.paper,
    fcPct: c.net > 0 ? (c.cost / c.net) * 100 : null,
    mixPct: netScop > 0 ? (c.net / netScop) * 100 : null,
  })).sort((a, b) => b.net - a.net || a.categorie.localeCompare(b.categorie));

  // prețurile lipsă din rețetele scopului se caută ÎNTOTDEAUNA — nu doar când defalcarea
  // cade pe rețetar; un ingredient consumat fără preț e o lipsă și când 2.9 există
  const consum = consumaPerioada(state, ctx, cerere.perioada, loc, canale);
  for (const [cod] of consum.peIngredient) {
    const ing = ctx.ingrediente.get(cod);
    if (ing && !(ing.preturi.length > 0 && pretCurent(ing) > 0)) preturiLipsa.add(cod);
  }

  // materiale: consumul REAL 2.9 când puntea e disponibilă, altfel consumul teoretic din
  // rețetar (prețul de la finele perioadei; prețul lipsă rămâne null, nu zero)
  let materiale: RandMaterialTL[];
  if (bridge.nboDisponibil) {
    const total = bridge.nboActual;
    materiale = bridge.randuri.map(r => ({
      cod: r.material, denumire: r.denumire, sursa: 'NBO_29' as const,
      categorie: r.categorie,
      costRON: r.costActual,
      pct: total > 0 ? (r.costActual / total) * 100 : null,
    })).sort((a, b) => (b.costRON ?? 0) - (a.costRON ?? 0) || a.cod.localeCompare(b.cod));
  } else {
    const randuri = [...consum.peIngredient.entries()].map(([cod, a]) => {
      const ing = ctx.ingrediente.get(cod);
      const pret = ing && ing.preturi.length > 0 ? pretLa(ing, cerere.perioada.la) : 0;
      return {
        cod, denumire: ing?.denumire ?? cod, sursa: 'RETETAR' as const,
        categorie: ing?.categorie ?? '—',
        costRON: pret > 0 ? a.qty * pret : null,
        pct: null as number | null,
      };
    });
    const total = randuri.reduce((s, r) => s + (r.costRON ?? 0), 0);
    for (const r of randuri) r.pct = r.costRON !== null && total > 0 ? (r.costRON / total) * 100 : null;
    materiale = randuri.sort((a, b) => (b.costRON ?? -1) - (a.costRON ?? -1) || a.cod.localeCompare(b.cod));
  }
  return { categorii, produse, materiale };
}

// ————————————————————————————————————————————————————————— restaurantele și clasamentele

export interface RandMagazinTL {
  locatie: string;
  metrici: MetriciFC;
  comparatie: ComparatieFC;
}

export type CriteriuClasament =
  | 'FC_MARE' | 'CRESTERE_FC' | 'SCADERE_FC' | 'IMPACT_COST'
  | 'NEEXPLICAT' | 'NORMALIZAT' | 'OPERATIONAL';

export interface RandClasament { locatie: string; valoare: number; }

export interface Clasament {
  criteriu: CriteriuClasament;
  eticheta: string;
  /** Ce metrică ordonează, exact — clasamentul nu folosește valori arbitrare de UI. */
  baza: string;
  randuri: RandClasament[];
  /** Restaurante fără metrica respectivă (ex. fără 2.9) — excluse, nu presupuse zero. */
  excluse: string[];
}

function clasamente(magazine: RandMagazinTL[]): Clasament[] {
  const construieste = (
    criteriu: CriteriuClasament, eticheta: string, baza: string,
    valoare: (m: RandMagazinTL) => number | null, ordine: 'DESC' | 'ASC' = 'DESC',
  ): Clasament => {
    const cu = magazine.map(m => ({ locatie: m.locatie, v: valoare(m) }));
    const randuri = cu.filter((x): x is { locatie: string; v: number } => x.v !== null)
      .sort((a, b) => (ordine === 'DESC' ? b.v - a.v : a.v - b.v) || a.locatie.localeCompare(b.locatie))
      .map(x => ({ locatie: x.locatie, valoare: x.v }));
    return { criteriu, eticheta, baza, randuri, excluse: cu.filter(x => x.v === null).map(x => x.locatie).sort() };
  };
  return [
    construieste('FC_MARE', 'FC-ul cel mai mare', 'recipeFcPct — costul din rețete ÷ vânzările nete, %',
      m => m.metrici.recipeFcPct),
    construieste('CRESTERE_FC', 'Cea mai mare creștere de FC', 'Δ recipeFcPct față de perioada de comparație, pp',
      m => m.comparatie.recipeFc.deltaPp),
    construieste('SCADERE_FC', 'Cea mai mare scădere de FC', 'Δ recipeFcPct față de perioada de comparație, pp',
      m => m.comparatie.recipeFc.deltaPp, 'ASC'),
    construieste('IMPACT_COST', 'Cel mai mare impact de cost', '|Δ recipeCostRON| față de perioada de comparație, lei',
      m => (m.comparatie.recipeCost.deltaRON !== null ? Math.abs(m.comparatie.recipeCost.deltaRON) : null)),
    construieste('NEEXPLICAT', 'Cel mai mare variance neexplicat', 'unexplainedRON din puntea 2.9, lei',
      m => m.metrici.unexplainedRON),
    construieste('NORMALIZAT', 'Cea mai mare componentă normalizată', 'normalizedRON din puntea 2.9, lei',
      m => m.metrici.normalizedRON),
    construieste('OPERATIONAL', 'Cea mai mare componentă operațională', 'operationalRON din puntea 2.9, lei',
      m => m.metrici.operationalRON),
  ];
}

// ————————————————————————————————————————————————————————— calitatea datelor

export interface CalitateTimeline {
  /** Perioada selectată e tăiată sau neîncheiată. */
  perioadaIncompleta: boolean;
  /** Restaurante cu vânzări în scop, absente din datele 2.9. */
  restauranteLipsa29: string[];
  pmixLipsa: boolean;
  /** Produse vândute fără rețetă. */
  produseFaraReteta: string[];
  /** Ingrediente/materiale fără preț valid. */
  preturiLipsa: string[];
  /** Produse cu rețetă al căror cost e incomplet (un component fără preț) și leii afectați. */
  produseCostIncomplet: string[];
  netCostIncomplet: number;
  /** Partea de 2.9 vine fără canal declarat. */
  canalNecunoscut: boolean;
  /** Lei pe categorii 2.9 nerecunoscute. */
  neclasificatRON: number | null;
  /** Puntea nu se închide — motivele ei. */
  reconciliereIncompleta: boolean;
  motiveReconciliere: string[];
}

// ————————————————————————————————————————————————————————— analiza completă

export interface AnalizaTimeline {
  cerere: CerereTimeline;
  disponibil: boolean;
  motivIndisponibil?: string;
  metrici: MetriciFC | null;
  comparatie: ComparatieFC | null;
  /** Defalcarea pe restaurante — doar la nivel de companie; fiecare rând e reproductibil
   *  rulând ACEEAȘI analiză cu `nivel: restaurant(locatie)` (mecanismul de drill-down). */
  magazine: RandMagazinTL[] | null;
  /** Partea de 2.9 fără restaurant — face exactă identitatea companie = Σ restaurante + fără-locație. */
  nboFaraLocatieRON: number | null;
  clasamente: Clasament[] | null;
  categorii: RandCategorieTL[];
  produse: RandProdusTL[];
  materiale: RandMaterialTL[];
  calitate: CalitateTimeline;
  complete: boolean;
  motiveIncomplet: string[];
  surse: SursaFC[];
}

export function analizaTimeline(state: AppState, ctx: CtxFC, cerere: CerereTimeline): AnalizaTimeline {
  const loc = locatieDin(cerere.nivel);
  const canale = canalePentru(cerere.canal);
  const inScop = state.vanzari.filter(v =>
    contineData(cerere.perioada, v.data) && (!loc || v.locatie === loc) && canale.includes(v.canal as Canal));

  const calitateGoala: CalitateTimeline = {
    perioadaIncompleta: cerere.perioada.partiala || cerere.perioada.la >= AZI_ISO(),
    restauranteLipsa29: [], pmixLipsa: false, produseFaraReteta: [], preturiLipsa: [],
    produseCostIncomplet: [], netCostIncomplet: 0,
    canalNecunoscut: false, neclasificatRON: null, reconciliereIncompleta: false, motiveReconciliere: [],
  };
  if (!inScop.length) {
    const motiv = `Nu există vânzări (PMIX) pe ${cerere.perioada.cheie}${loc ? ` la ${loc}` : ''}`
      + `${cerere.canal !== 'TOTAL' ? ` pe canalul ${cerere.canal}` : ''} — nu e nimic de analizat.`;
    return {
      cerere, disponibil: false, motivIndisponibil: motiv,
      metrici: null, comparatie: null, magazine: null, nboFaraLocatieRON: null, clasamente: null,
      categorii: [], produse: [], materiale: [],
      calitate: { ...calitateGoala, pmixLipsa: true },
      complete: false, motiveIncomplet: [motiv], surse: [],
    };
  }

  const metrici = metriciFC(state, ctx, cerere);
  const comparatie = comparaFC(state, ctx, cerere);
  const bridge = bridgeFC(state, ctx, cerere);
  const recipe = recipeFC(state, ctx, cerere);
  const preturiLipsa = new Set<string>();
  const { categorii, produse, materiale } = defalcari(state, ctx, cerere, bridge, preturiLipsa);

  // restaurantele — ACEEAȘI analiză, scop mai îngust; compania nu are formule proprii
  let magazine: RandMagazinTL[] | null = null;
  let nboFaraLocatieRON: number | null = null;
  if (!loc) {
    const locatii = [...new Set([
      ...inScop.map(v => v.locatie),
      ...(state.materiale29 ?? []).filter(m => m.locatie && bridge.perioadeSursa.includes(m.perioada)).map(m => m.locatie!),
    ])].sort();
    magazine = locatii.map(l => ({
      locatie: l,
      metrici: metriciFC(state, ctx, { ...cerere, nivel: restaurant(l) }),
      comparatie: comparaFC(state, ctx, { ...cerere, nivel: restaurant(l) }),
    }));
    nboFaraLocatieRON = bridge.nboDisponibil
      ? bridge.randuri.filter(r => r.locatie === null).reduce((s, r) => s + r.costActual, 0)
      : null;
  }

  // calitatea: nimic incomplet nu se ascunde
  const calitate: CalitateTimeline = {
    ...calitateGoala,
    restauranteLipsa29: bridge.diagnostice.find(d => d.cod === 'RESTAURANT_FARA_29')?.exemple ?? [],
    produseFaraReteta: recipe.produseFaraReteta.map(p => p.cod).sort(),
    produseCostIncomplet: recipe.produseCostIncomplet.map(p => p.cod).sort(),
    netCostIncomplet: recipe.netCostIncomplet,
    preturiLipsa: [...new Set([
      ...preturiLipsa,
      ...(bridge.diagnostice.find(d => d.cod === 'MATERIAL_FARA_PRET')?.exemple ?? []),
    ])].sort(),
    canalNecunoscut: bridge.nboDisponibil && bridge.canalSursa === 'UNKNOWN',
    neclasificatRON: metrici.unclassifiedRON,
    reconciliereIncompleta: bridge.nboDisponibil && !bridge.complete,
    motiveReconciliere: bridge.nboDisponibil ? bridge.motiveIncomplet : [],
  };

  const motiveIncomplet: string[] = [];
  if (calitate.perioadaIncompleta) {
    motiveIncomplet.push(`Perioada ${cerere.perioada.cheie} e ${cerere.perioada.partiala ? 'tăiată' : 'neîncheiată'} — cifrele ei sunt parțiale.`);
  }
  if (!metrici.nboDisponibil && metrici.motivNbo) motiveIncomplet.push(metrici.motivNbo);
  if (calitate.produseFaraReteta.length) {
    motiveIncomplet.push(`${calitate.produseFaraReteta.length} produse vândute nu au rețetă — costul lor NU e presupus zero.`);
  }
  if (calitate.netCostIncomplet > 0) {
    motiveIncomplet.push(`${Math.round(calitate.netCostIncomplet)} lei din vânzări au cost incomplet `
      + `(${calitate.produseCostIncomplet.length} produse cu componente fără preț) — Food Cost-ul e o limită de jos, nu cifra exactă.`);
  }
  if (calitate.preturiLipsa.length) {
    motiveIncomplet.push(`${calitate.preturiLipsa.length} ingrediente/materiale fără preț valid — costul lor e necunoscut, nu zero.`);
  }
  if (calitate.restauranteLipsa29.length) {
    motiveIncomplet.push(`Restaurante cu vânzări, dar fără date 2.9: ${calitate.restauranteLipsa29.slice(0, 5).join(', ')}.`);
  }
  if ((calitate.neclasificatRON ?? 0) > 0) {
    motiveIncomplet.push(`${Math.round(calitate.neclasificatRON!)} lei stau pe categorii 2.9 nerecunoscute (UNCLASSIFIED).`);
  }
  if (calitate.canalNecunoscut && cerere.canal === 'TOTAL') {
    motiveIncomplet.push('Partea de 2.9 vine fără canal declarat — pe canale separate nu se poate repartiza.');
  }
  if (calitate.reconciliereIncompleta) {
    motiveIncomplet.push('Reconcilierea 2.9 nu se închide — vezi motivele punții.');
  }
  if (!comparatie.disponibil && comparatie.motivIndisponibil) motiveIncomplet.push(comparatie.motivIndisponibil);

  return {
    cerere, disponibil: true,
    metrici, comparatie,
    magazine, nboFaraLocatieRON,
    clasamente: magazine ? clasamente(magazine) : null,
    categorii, produse, materiale,
    calitate,
    complete: motiveIncomplet.length === 0,
    motiveIncomplet,
    surse: [...recipe.surse, ...(bridge.nboDisponibil ? bridge.surse.filter(s => s.raport === 'NBO_29') : [])],
  };
}

/** Rezumat într-o linie, pentru jurnale. */
export const descrieTimeline = (a: AnalizaTimeline) =>
  a.disponibil
    ? `${a.cerere.perioada.cheie} · FC rețete ${a.metrici!.recipeFcPct?.toFixed(1) ?? '—'}% · `
      + `FC actual ${a.metrici!.nboActualFcPct?.toFixed(1) ?? '—'}% · complet: ${a.complete ? 'da' : 'nu'}`
    : `${a.cerere.perioada.cheie} · indisponibil — ${a.motivIndisponibil}`;
