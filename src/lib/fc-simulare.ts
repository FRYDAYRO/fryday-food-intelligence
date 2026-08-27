// Simulatorul FC — motorul pur de what-if pe Food Cost: prețuri, rețete, PMIX.
//
// Ce răspunde: „dacă prețul/gramajul/mixul ar fi X, ce s-ar întâmpla cu Food Cost-ul
// perioadei?" — cu efectele SEPARATE (preț / rețetă / mix) și cu interacțiunea lor
// numită explicit, nu topită într-o cifră neexplicată.
//
// Reguli care nu se încalcă:
//  · datele reale sunt INTANGIBILE: funcția nu scrie nimic, nicăieri — lucrează exclusiv
//    pe copii; PMIX-ul, rețetele, prețurile și perioadele istorice rămân neatinse;
//  · totul e determinist: aceleași intrări → exact același rezultat, fără LLM, fără aleator;
//  · baseline-ul se ALINIAZĂ (convenția BUG-1): entitățile atinse de scenariu se reduc la
//    versiunea activă / prețul curent, datate la origine, în AMBELE contexte — astfel delta
//    reflectă DOAR schimbarea cerută, nu și istoricul de versiuni dintre timp; entitățile
//    neatinse își păstrează istoricul datat și se anulează în diferență;
//  · fără preț valid nu se presupune zero: schimbarea de preț pe un ingredient fără preț
//    se refuză, iar componentele fără preț din rețetele afectate se semnalează;
//  · fără rețetă nu se presupune zero: produsele fără rețetă rămân în afara costului,
//    vizibile în acoperire, iar scenariul se declară incomplet;
//  · canalul se deduce din vânzările afectate; fără dovadă → UNKNOWN, nu se inventează.
import { costLinieLa, costProdus, consumPerPortie, pretCurent, versiuneActiva } from './engine';
import type { AppState, Canal, Ingredient, LinieReteta, Reteta, VanzareFapt } from './types';
import {
  canalePentru, contineData, locatieDin, luniAtinse,
  type CerereFC, type CtxFC, type FCChannelSursa, type SursaFC,
} from './fc-domeniu';

/** Data sentinelă de la care o versiune/un preț simulat se consideră în vigoare. */
const DATA_ORIGINE = '2000-01-01';

// ————————————————————————————————————————————————————————— scenariul

export interface SchimbarePretFC {
  ingredient: string;
  /** Lei pe UM de bază a ingredientului. */
  pretNou: number;
}

export type SchimbareRetetaFC =
  | { tip: 'CANTITATE'; produs: string; component: string; cantNoua: number; canal?: LinieReteta['canal'] }
  | { tip: 'ELIMINA'; produs: string; component: string; canal?: LinieReteta['canal'] }
  | { tip: 'ADAUGA'; produs: string; linie: LinieReteta }
  | { tip: 'INLOCUIESTE'; produs: string; componentVechi: string; componentNou: string; tipCompNou?: LinieReteta['tipComp'] };

export interface SchimbarePmixFC {
  produs: string;
  /** Multiplicator de volum pe produs în perioada analizată: 1 = neschimbat, 0 = scos din mix. */
  factor: number;
}

export interface ScenariuFC {
  nume?: string;
  preturi?: SchimbarePretFC[];
  retete?: SchimbareRetetaFC[];
  pmix?: SchimbarePmixFC[];
}

// ————————————————————————————————————————————————————————— rezultatul

export type IdEfect = 'PRET' | 'RETETA' | 'MIX' | 'INTERACTIUNE';

export interface EfectScenariu {
  id: IdEfect;
  eticheta: string;
  /** Efectul IZOLAT asupra costului: dimensiunea aplicată singură, față de baseline. */
  costLei: number;
  /** Efectul asupra vânzărilor nete (doar mixul mișcă numitorul). */
  netLei: number;
  /** FC%(doar această dimensiune) − FC%(baseline). NU se adună între ele — numitorii diferă. */
  fcPp: number | null;
  explicatie: string;
}

export interface DetaliuPret {
  ingredient: string; denumire: string; um: string;
  oldUnitCost: number; newUnitCost: number; deltaUnitCost: number;
  /** Consum în UM de bază pe perioada și scopul cerute, pe rețetele baseline. */
  consumedQuantity: number;
  /** = deltaUnitCost × consumedQuantity — identitatea punții de preț. */
  costImpactRON: number;
  fcImpactPP: number | null;
}

export interface DetaliuReteta {
  schimbare: SchimbareRetetaFC;
  produs: string; denumireProdus: string;
  component: string; denumireComponent: string;
  /** `null` când liniile atinse au cantități diferite (op pe mai multe linii). */
  oldQuantity: number | null;
  newQuantity: number | null;
  quantityDelta: number | null;
  um: string;
  /** Costul unei unități din componentă în UM-ul liniei, cu pierderea inclusă, la prețuri baseline. */
  unitCost: number | null;
  /**
   * Porții ECHIVALENTE vândute în scop din rețeta atinsă: combo-urile numără cu
   * multiplicitatea produsului în ele. Identitatea `costImpact = Δcant × unitCost × portii`
   * ține pentru schimbări pe produse; pentru semipreparate, `portii` numără unitățile
   * vândute ale produselor care le consumă (informativ — impactul vine tot din costare).
   */
  portii: number;
  /** Efectul IZOLAT al acestei schimbări (doar ea aplicată pe baseline), pe tot scopul. */
  costImpactRON: number;
  fcImpactPP: number | null;
}

export interface DetaliuPmix {
  produs: string; denumire: string; factor: number;
  areReteta: boolean;
  bucBaseline: number; bucScenariu: number;
  netBaseline: number; netScenariu: number;
  /** `null` pentru produsele fără rețetă — costul lor NU se presupune zero. */
  costBaseline: number | null; costScenariu: number | null;
  costImpactRON: number | null;
}

export interface FactorConfidentaSim {
  factor: 'acoperire_retete' | 'preturi_componente' | 'pmix_prezent';
  eticheta: string; pondere: number; scor: number; detaliu: string;
}

export interface ConfidentaSim { scor: number; factori: FactorConfidentaSim[]; formula: string; }

export interface SimulareFC {
  cerere: CerereFC;
  scenariu: ScenariuFC;
  disponibil: boolean;
  motivIndisponibil?: string;

  // — cifrele de titlu
  /** FC% baseline: cost ÷ vânzările acoperite de rețete, pe scopul cerut. */
  currentRecipeFC: number | null;
  scenarioRecipeFC: number | null;
  deltaFCpp: number | null;
  /** Variația RELATIVĂ a costului: deltaCostRON ÷ currentCostRON × 100. */
  deltaFCPercent: number | null;
  currentCostRON: number;
  scenarioCostRON: number;
  deltaCostRON: number;
  currentNetRON: number;
  scenarioNetRON: number;

  // — descompunerea deterministă: baseline + Σ efecte izolate + interacțiune = combinat (în lei)
  efecte: EfectScenariu[];

  detaliiPret: DetaliuPret[];
  detaliiReteta: DetaliuReteta[];
  detaliiPmix: DetaliuPmix[];

  affectedIngredients: string[];
  affectedProducts: string[];
  affectedStores: string[];
  affectedPeriods: string[];
  affectedChannels: FCChannelSursa[];

  /** Cât din vânzările nete ale scopului au rețetă calculabilă (baseline). */
  dataCoverage: number | null;
  /** Componente fără preț valid din rețetele afectate — costate azi cu 0 de motor, semnalate aici. */
  ingredienteFaraPret: string[];
  confidence: ConfidentaSim;
  complete: boolean;
  motiveIncomplet: string[];
  surse: SursaFC[];
}

// ————————————————————————————————————————————————————————— construcția contextelor (pure)

/** Versiunea activă, datată la origine — în vigoare pentru orice zi din perioada analizată. */
const inVigoareOricand = (r: Reteta): Reteta => {
  const v = versiuneActiva(r);
  return { ...r, activa: v.nr, versiuni: [{ ...v, linii: v.linii.map(l => ({ ...l })), data: DATA_ORIGINE }] };
};

const cuPretUnic = (i: Ingredient, pret: number): Ingredient =>
  ({ ...i, preturi: [{ validDeLa: DATA_ORIGINE, pret }] });

/** Context nou din hărți noi — obiectele neatinse se REFOLOSESC, nu se copiază (și nu se mută). */
const ctxDin = (baza: CtxFC, ingrediente?: Map<string, Ingredient>, retete?: Map<string, Reteta>): CtxFC =>
  ({ ingrediente: ingrediente ?? baza.ingrediente, retete: retete ?? baza.retete, produse: baza.produse });

function aplicaOpe(r: Reteta, ops: SchimbareRetetaFC[]): Reteta {
  const copie = inVigoareOricand(r);
  const v = copie.versiuni[0];
  for (const op of ops) {
    if (op.tip === 'CANTITATE') {
      for (const l of v.linii) if (l.comp === op.component && (!op.canal || l.canal === op.canal)) l.cant = op.cantNoua;
    } else if (op.tip === 'ELIMINA') {
      v.linii = v.linii.filter(l => !(l.comp === op.component && (!op.canal || l.canal === op.canal)));
    } else if (op.tip === 'ADAUGA') {
      v.linii.push({ ...op.linie });
    } else {
      for (const l of v.linii) {
        if (l.comp === op.componentVechi) { l.comp = op.componentNou; if (op.tipCompNou) l.tipComp = op.tipCompNou; }
      }
    }
  }
  return copie;
}

// ————————————————————————————————————————————————————————— costarea unui scop

interface Agregat { buc: number; net: number; netAcoperit: number; cost: number; faraReteta: Set<string>; }

function costeaza(rows: VanzareFapt[], ctx: CtxFC): Agregat {
  const memo = new Map<string, unknown>();
  const rez: Agregat = { buc: 0, net: 0, netAcoperit: 0, cost: 0, faraReteta: new Set() };
  for (const v of rows) {
    rez.buc += v.cant; rez.net += v.net;
    const c = costProdus(v.produs, v.canal, ctx, v.data, memo);
    if (c) { rez.cost += c.total * v.cant; rez.netAcoperit += v.net; }
    else rez.faraReteta.add(v.produs);
  }
  return rez;
}

const fcPct = (a: Agregat): number | null => (a.netAcoperit > 0 ? (a.cost / a.netAcoperit) * 100 : null);

// ————————————————————————————————————————————————————————— motorul

export function simuleazaFC(
  state: AppState,
  ctx: CtxFC,
  cerere: CerereFC,
  scenariu: ScenariuFC,
): SimulareFC {
  const loc = locatieDin(cerere.nivel);
  const canale = canalePentru(cerere.canal);
  const preturi = scenariu.preturi ?? [];
  const opsRetete = scenariu.retete ?? [];
  const pmix = scenariu.pmix ?? [];

  const gol = (motiv: string): SimulareFC => ({
    cerere, scenariu, disponibil: false, motivIndisponibil: motiv,
    currentRecipeFC: null, scenarioRecipeFC: null, deltaFCpp: null, deltaFCPercent: null,
    currentCostRON: 0, scenarioCostRON: 0, deltaCostRON: 0, currentNetRON: 0, scenarioNetRON: 0,
    efecte: [], detaliiPret: [], detaliiReteta: [], detaliiPmix: [],
    affectedIngredients: [], affectedProducts: [], affectedStores: [], affectedPeriods: [], affectedChannels: [],
    dataCoverage: null, ingredienteFaraPret: [],
    confidence: { scor: 0, factori: [], formula: FORMULA },
    complete: false, motiveIncomplet: [motiv], surse: [],
  });

  // ——— validarea scenariului: nimic necunoscut nu se ignoră tăcut
  for (const p of preturi) {
    const ing = ctx.ingrediente.get(p.ingredient);
    if (!ing) return gol(`Ingredientul „${p.ingredient}" nu există în nomenclator — scenariul nu se poate evalua.`);
    if (!(p.pretNou >= 0)) return gol(`Preț nou invalid pentru „${p.ingredient}": ${p.pretNou}.`);
    if (!(ing.preturi.length > 0 && pretCurent(ing) > 0)) {
      return gol(`Ingredientul „${p.ingredient}" nu are un preț valid în nomenclator. Fără prețul vechi, `
        + 'delta ar presupune tăcut zero — importă întâi lista de prețuri.');
    }
  }
  for (const op of opsRetete) {
    const r = ctx.retete.get(op.produs);
    if (!r) return gol(`„${op.produs}" nu are rețetă — schimbarea de rețetă nu se poate evalua.`);
    const v = versiuneActiva(r);
    if (op.tip === 'CANTITATE' || op.tip === 'ELIMINA') {
      if (!v.linii.some(l => l.comp === op.component && (!op.canal || l.canal === op.canal))) {
        return gol(`Componenta „${op.component}" nu apare în rețeta „${op.produs}"${op.canal ? ` pe canalul ${op.canal}` : ''}.`);
      }
      if (op.tip === 'CANTITATE' && !(op.cantNoua >= 0)) return gol(`Cantitate nouă invalidă pentru „${op.component}": ${op.cantNoua}.`);
    }
    if (op.tip === 'ADAUGA') {
      const exista = op.linie.tipComp === 'SEMIPREPARAT' ? ctx.retete.has(op.linie.comp) : ctx.ingrediente.has(op.linie.comp);
      if (!exista) return gol(`Componenta adăugată „${op.linie.comp}" nu există în ${op.linie.tipComp === 'SEMIPREPARAT' ? 'rețetar' : 'nomenclator'}.`);
    }
    if (op.tip === 'INLOCUIESTE') {
      if (!v.linii.some(l => l.comp === op.componentVechi)) {
        return gol(`Componenta „${op.componentVechi}" nu apare în rețeta „${op.produs}".`);
      }
      const eSp = op.tipCompNou === 'SEMIPREPARAT'
        || v.linii.some(l => l.comp === op.componentVechi && l.tipComp === 'SEMIPREPARAT' && !op.tipCompNou);
      if (eSp ? !ctx.retete.get(op.componentNou) : !ctx.ingrediente.get(op.componentNou)) {
        return gol(`Componenta nouă „${op.componentNou}" nu există în ${eSp ? 'rețetar' : 'nomenclator'}.`);
      }
    }
  }
  for (const m of pmix) {
    if (!ctx.produse.get(m.produs)) return gol(`Produsul „${m.produs}" nu există — schimbarea de mix nu se poate evalua.`);
    if (!(m.factor >= 0)) return gol(`Factor de mix invalid pentru „${m.produs}": ${m.factor}.`);
  }

  // ——— scopul: vânzările perioadei × nivel × canal (copii — originalele nu se ating)
  const inScop = state.vanzari.filter(v =>
    contineData(cerere.perioada, v.data) && (!loc || v.locatie === loc) && canale.includes(v.canal as Canal));
  if (!inScop.length) {
    return gol(`Nu există vânzări (PMIX) pe ${cerere.perioada.cheie}${loc ? ` la ${loc}` : ''}`
      + `${cerere.canal !== 'TOTAL' ? ` pe canalul ${cerere.canal}` : ''} — nu e nimic de simulat.`);
  }

  // ——— alinierea (convenția BUG-1): entitățile ATINSE se reduc la prețul curent / versiunea
  // activă, datate la origine, în ambele contexte; restul rămân cu istoricul lor și se
  // anulează în diferență
  const ingAtinse = new Set(preturi.map(p => p.ingredient));
  const retAtinse = new Set(opsRetete.map(o => o.produs));

  const ingBaza = new Map(ctx.ingrediente);
  for (const cod of ingAtinse) ingBaza.set(cod, cuPretUnic(ctx.ingrediente.get(cod)!, pretCurent(ctx.ingrediente.get(cod)!)));
  const retBaza = new Map(ctx.retete);
  for (const cod of retAtinse) retBaza.set(cod, inVigoareOricand(ctx.retete.get(cod)!));
  const ctxBaza = ctxDin(ctx, ingBaza, retBaza);

  const ingScenariu = new Map(ingBaza);
  for (const p of preturi) ingScenariu.set(p.ingredient, cuPretUnic(ctx.ingrediente.get(p.ingredient)!, p.pretNou));
  const opePeReteta = new Map<string, SchimbareRetetaFC[]>();
  for (const op of opsRetete) opePeReteta.set(op.produs, [...(opePeReteta.get(op.produs) ?? []), op]);
  const retScenariu = new Map(retBaza);
  for (const [cod, ops] of opePeReteta) retScenariu.set(cod, aplicaOpe(ctx.retete.get(cod)!, ops));

  const ctxPret = ctxDin(ctx, ingScenariu, retBaza);
  const ctxReteta = ctxDin(ctx, ingBaza, retScenariu);
  const ctxComplet = ctxDin(ctx, ingScenariu, retScenariu);

  // ——— mixul: copii scalate ale rândurilor de vânzare; originalele rămân neatinse
  const factorPentru = new Map(pmix.map(m => [m.produs, m.factor]));
  const rowsMix = pmix.length
    ? inScop.map(v => {
      const f = factorPentru.get(v.produs);
      return f === undefined || f === 1 ? v : { ...v, cant: v.cant * f, brut: v.brut * f, net: v.net * f };
    })
    : inScop;

  // ——— cele cinci costări: baseline, câte una pe dimensiune, combinat
  const B = costeaza(inScop, ctxBaza);
  const P = preturi.length ? costeaza(inScop, ctxPret) : B;
  const R = opsRetete.length ? costeaza(inScop, ctxReteta) : B;
  const M = pmix.length ? costeaza(rowsMix, ctxBaza) : B;
  const C = costeaza(rowsMix, ctxComplet);

  const fcB = fcPct(B);
  const pp = (a: Agregat): number | null => (fcPct(a) !== null && fcB !== null ? fcPct(a)! - fcB : null);

  const efectPret = P.cost - B.cost;
  const efectReteta = R.cost - B.cost;
  const efectMix = M.cost - B.cost;
  const interactiune = (C.cost - B.cost) - efectPret - efectReteta - efectMix;

  const efecte: EfectScenariu[] = [
    {
      id: 'PRET', eticheta: 'Efectul prețurilor', costLei: efectPret, netLei: 0, fcPp: pp(P),
      explicatie: 'Doar prețurile schimbate, pe mixul și rețetele baseline: Δpreț × consum.',
    },
    {
      id: 'RETETA', eticheta: 'Efectul rețetelor', costLei: efectReteta, netLei: 0, fcPp: pp(R),
      explicatie: 'Doar schimbările de rețetă, la prețurile și mixul baseline: Δgramaj × cost unitar × porții.',
    },
    {
      id: 'MIX', eticheta: 'Efectul mixului', costLei: efectMix, netLei: M.net - B.net, fcPp: pp(M),
      explicatie: 'DOAR schimbarea de mix, la prețurile și rețetele baseline — mută și numitorul (vânzările).',
    },
    {
      id: 'INTERACTIUNE', eticheta: 'Interacțiunea dimensiunilor', costLei: interactiune, netLei: 0, fcPp: null,
      explicatie: 'Termenii încrucișați (preț nou × gramaj nou × volum nou): reali, dar care nu aparțin '
        + 'niciunei dimensiuni singure. Zero când scenariul schimbă o singură dimensiune. '
        + 'Identitate: baseline + Σ efecte + interacțiune = combinat, în lei.',
    },
  ];

  // ——— detaliile de preț: consum pe rețetele baseline → identitatea Δcost = Δpreț × consum
  const memoSP = new Map<string, number>();
  const detaliiPret: DetaliuPret[] = preturi.map(p => {
    const ing = ctx.ingrediente.get(p.ingredient)!;
    const vechi = pretCurent(ing);
    let consum = 0;
    for (const v of inScop) consum += v.cant * consumPerPortie(p.ingredient, v.produs, v.canal as Canal, ctxBaza, memoSP);
    const impact = (p.pretNou - vechi) * consum;
    return {
      ingredient: p.ingredient, denumire: ing.denumire, um: ing.um,
      oldUnitCost: vechi, newUnitCost: p.pretNou, deltaUnitCost: p.pretNou - vechi,
      consumedQuantity: consum, costImpactRON: impact,
      fcImpactPP: B.netAcoperit > 0 ? (impact / B.netAcoperit) * 100 : null,
    };
  });

  // ——— detaliile de rețetă: efectul IZOLAT al fiecărei schimbări (doar ea, pe baseline)
  const numeComp = (cod: string) => ctx.ingrediente.get(cod)?.denumire ?? ctx.retete.get(cod)?.denumire ?? cod;
  /** Câte porții din `tinta` conține o unitate vândută din `cod` (combo-urile, cu multiplicitatea lor). */
  const portiiPerUnitate = (tinta: string, cod: string, vazute = new Set<string>()): number => {
    if (cod === tinta) return 1;
    if (vazute.has(cod)) return 0;
    const p = ctx.produse.get(cod);
    if (p?.tip === 'COMBO' && p.combo?.length) {
      vazute.add(cod);
      return p.combo.reduce((s, c) => s + c.cant * portiiPerUnitate(tinta, c.cod, vazute), 0);
    }
    return 0;
  };
  const detaliiReteta: DetaliuReteta[] = opsRetete.map(op => {
    const r = ctx.retete.get(op.produs)!;
    const vAct = versiuneActiva(r);
    const ctxOp = ctxDin(ctx, ingBaza, new Map(retBaza).set(op.produs, aplicaOpe(r, [op])));
    const doarEa = costeaza(inScop, ctxOp);
    const impact = doarEa.cost - B.cost;

    const component = op.tip === 'ADAUGA' ? op.linie.comp : op.tip === 'INLOCUIESTE' ? op.componentVechi : op.component;
    const liniiAtinse = op.tip === 'ADAUGA' ? [op.linie]
      : vAct.linii.filter(l => l.comp === component && (('canal' in op && op.canal) ? l.canal === op.canal : true));
    const cantUnica = new Set(liniiAtinse.map(l => l.cant)).size === 1 ? liniiAtinse[0]?.cant ?? null : null;
    const oldQuantity = op.tip === 'ADAUGA' ? 0 : cantUnica;
    const newQuantity =
      op.tip === 'CANTITATE' ? op.cantNoua :
      op.tip === 'ELIMINA' ? 0 :
      op.tip === 'ADAUGA' ? op.linie.cant : cantUnica;
    const linia = liniiAtinse[0];
    const unitCost = linia
      ? costLinieLa({ ...linia, cant: 1, pierdere: undefined }, ctxDin(ctx, ingBaza, retBaza)).total
        / (linia.pierdere && linia.pierdere > 0 ? 1 - linia.pierdere / 100 : 1)
      : null;

    // porțiile echivalente: pe produs, expandând combo-urile; pe semipreparat, unitățile
    // vândute ale produselor al căror cost chiar se schimbă cu această operație
    let portii: number;
    if (r.tip !== 'SEMIPREPARAT') {
      portii = inScop.reduce((s, v) => s + v.cant * portiiPerUnitate(op.produs, v.produs), 0);
    } else {
      const atinse = new Set<string>();
      const mB = new Map<string, unknown>(), mO = new Map<string, unknown>();
      for (const [cod] of ctx.produse) {
        for (const canal of ['INSTORE', 'DELIVERY'] as Canal[]) {
          if ((costProdus(cod, canal, ctxBaza, '9999-12-31', mB)?.total ?? 0)
            !== (costProdus(cod, canal, ctxOp, '9999-12-31', mO)?.total ?? 0)) { atinse.add(cod); break; }
        }
      }
      portii = inScop.filter(v => atinse.has(v.produs)).reduce((s, v) => s + v.cant, 0);
    }

    return {
      schimbare: op, produs: op.produs, denumireProdus: r.denumire,
      component, denumireComponent: numeComp(component),
      oldQuantity, newQuantity,
      quantityDelta: oldQuantity !== null && newQuantity !== null ? newQuantity - oldQuantity : null,
      um: linia?.um ?? '—', unitCost, portii,
      costImpactRON: impact,
      fcImpactPP: B.netAcoperit > 0 ? (impact / B.netAcoperit) * 100 : null,
    };
  });

  // ——— detaliile de mix, pe produs
  const detaliiPmix: DetaliuPmix[] = pmix.map(m => {
    const randuri = inScop.filter(v => v.produs === m.produs);
    const memo = new Map<string, unknown>();
    let buc = 0, net = 0, cost = 0, costabil = true;
    for (const v of randuri) {
      buc += v.cant; net += v.net;
      const c = costProdus(v.produs, v.canal, ctxBaza, v.data, memo);
      if (c) cost += c.total * v.cant; else costabil = false;
    }
    const areReteta = randuri.length > 0
      ? costabil
      : costProdus(m.produs, 'INSTORE', ctxBaza, '9999-12-31', memo) !== null;
    return {
      produs: m.produs, denumire: ctx.produse.get(m.produs)!.denumire, factor: m.factor,
      areReteta,
      bucBaseline: buc, bucScenariu: buc * m.factor,
      netBaseline: net, netScenariu: net * m.factor,
      costBaseline: areReteta ? cost : null,
      costScenariu: areReteta ? cost * m.factor : null,
      costImpactRON: areReteta ? cost * (m.factor - 1) : null,
    };
  });

  // ——— cine e atins: dovezi, nu presupuneri
  const affectedIngredients = [...new Set([
    ...preturi.map(p => p.ingredient),
    ...opsRetete.flatMap(op =>
      op.tip === 'ADAUGA' ? [op.linie.comp] :
      op.tip === 'INLOCUIESTE' ? [op.componentVechi, op.componentNou] : [op.component]),
  ])].sort();

  // dovada e pe (produs × canal): un ambalaj folosit doar pe Delivery nu atinge InStore
  const afectatPeCanal = new Map<string, Set<Canal>>();
  const marcheaza = (cod: string, canal: Canal) =>
    afectatPeCanal.set(cod, (afectatPeCanal.get(cod) ?? new Set()).add(canal));
  const memoAf = new Map<string, unknown>();
  const memoAfS = new Map<string, unknown>();
  for (const [cod] of ctx.produse) {
    for (const canal of ['INSTORE', 'DELIVERY'] as Canal[]) {
      const b = costProdus(cod, canal, ctxBaza, '9999-12-31', memoAf);
      const s = costProdus(cod, canal, ctxComplet, '9999-12-31', memoAfS);
      if ((b?.total ?? 0) !== (s?.total ?? 0)) marcheaza(cod, canal);
    }
  }
  // mixul mută volumul pe orice canal pe care produsul chiar s-a vândut în scop;
  // un produs de mix fără vânzări în scop rămâne atins declarativ, dar fără canale dovedite
  for (const m of pmix) {
    for (const v of inScop) if (v.produs === m.produs) marcheaza(m.produs, v.canal);
    if (!afectatPeCanal.has(m.produs)) afectatPeCanal.set(m.produs, new Set());
  }
  const affectedProducts = new Set(afectatPeCanal.keys());

  const randuriAfectate = inScop.filter(v => afectatPeCanal.get(v.produs)?.has(v.canal));
  const affectedStores = [...new Set(randuriAfectate.map(v => v.locatie))].sort();
  const canaleAfectate = [...new Set(randuriAfectate.map(v => v.canal))].sort() as FCChannelSursa[];
  const areSchimbari = preturi.length + opsRetete.length + pmix.length > 0;
  // schimbare fără nicio dovadă în scop (nicio vânzare atinsă): canalul nu se poate ști
  const affectedChannels: FCChannelSursa[] = randuriAfectate.length ? canaleAfectate : areSchimbari ? ['UNKNOWN'] : [];
  const affectedPeriods = [...new Set(randuriAfectate.map(v => v.data.slice(0, 7)))].sort();

  // ——— calitatea datelor
  const dataCoverage = B.net > 0 ? (B.netAcoperit / B.net) * 100 : null;
  const faraPret = new Set<string>();
  const memoC = new Map<string, number>();
  for (const cod of affectedProducts) {
    for (const [codIng, ing] of ctx.ingrediente) {
      if (ing.preturi.length > 0 && pretCurent(ing) > 0) continue;
      if (consumPerPortie(codIng, cod, 'INSTORE', ctxBaza, memoC) > 0
        || consumPerPortie(codIng, cod, 'DELIVERY', ctxBaza, memoC) > 0) faraPret.add(codIng);
    }
  }
  const ingredienteFaraPret = [...faraPret].sort();

  const motiveIncomplet: string[] = [];
  if (B.faraReteta.size) {
    motiveIncomplet.push(`${B.faraReteta.size} produse vândute în scop nu au rețetă — costul lor NU e presupus zero, `
      + `ci rămâne în afara calculului (acoperire ${dataCoverage?.toFixed(1)}%).`);
  }
  if (ingredienteFaraPret.length) {
    motiveIncomplet.push(`${ingredienteFaraPret.length} componente din rețetele afectate nu au preț valid: `
      + 'contribuția lor la cost e azi 0 în motor, deci delta poate fi subestimată.');
  }
  if (detaliiPmix.some(d => !d.areReteta)) {
    motiveIncomplet.push('Schimbarea de mix atinge produse fără rețetă: efectul lor pe cost nu se poate calcula '
      + 'și NU e presupus zero.');
  }
  if (affectedChannels.includes('UNKNOWN')) {
    motiveIncomplet.push('Scenariul nu atinge nicio vânzare din scop: impactul e nul pe dovezile existente, '
      + 'iar canalul nu se poate stabili.');
  }

  // ——— încrederea: formulă deterministă pe acoperirea datelor
  const componenteAfectate = new Set<string>();
  for (const cod of affectedProducts) {
    for (const [codIng] of ctx.ingrediente) {
      if (consumPerPortie(codIng, cod, 'INSTORE', ctxBaza, memoC) > 0
        || consumPerPortie(codIng, cod, 'DELIVERY', ctxBaza, memoC) > 0) componenteAfectate.add(codIng);
    }
  }
  const marg = (x: number) => Math.min(100, Math.max(0, x));
  const luniScop = luniAtinse(cerere.perioada);
  const luniCuVanzari = new Set(inScop.map(v => v.data.slice(0, 7)));
  const factori: FactorConfidentaSim[] = [
    {
      factor: 'acoperire_retete', eticheta: 'Acoperirea rețetelor', pondere: 0.4,
      scor: marg(dataCoverage ?? 0),
      detaliu: `${dataCoverage?.toFixed(1) ?? '0'}% din vânzările scopului au rețetă calculabilă.`,
    },
    {
      factor: 'preturi_componente', eticheta: 'Prețurile componentelor afectate', pondere: 0.35,
      scor: marg(componenteAfectate.size
        ? ((componenteAfectate.size - ingredienteFaraPret.length) / componenteAfectate.size) * 100
        : 100),
      detaliu: `${componenteAfectate.size - ingredienteFaraPret.length} din ${componenteAfectate.size} componente `
        + 'ale rețetelor afectate au preț valid.',
    },
    {
      factor: 'pmix_prezent', eticheta: 'PMIX pe perioadă', pondere: 0.25,
      scor: marg(luniScop.length ? (luniCuVanzari.size / luniScop.length) * 100 : 0),
      detaliu: `${luniCuVanzari.size} din ${luniScop.length} luni ale perioadei au vânzări importate.`,
    },
  ];
  const confidence: ConfidentaSim = {
    scor: Math.round(factori.reduce((s, f) => s + f.pondere * f.scor, 0)),
    factori,
    formula: FORMULA,
  };

  const interval = `${cerere.perioada.de} → ${cerere.perioada.la}`;
  const surse: SursaFC[] = [
    { raport: 'PMIX', randuri: inScop.length, interval, nota: cerere.canal === 'TOTAL' ? 'ambele canale' : cerere.canal },
    { raport: 'RETETAR', randuri: ctx.retete.size, interval, nota: 'baseline aliniat: rețetele atinse, la versiunea activă' },
    { raport: 'NOMENCLATOR', randuri: ctx.ingrediente.size, interval, nota: 'baseline aliniat: prețurile atinse, la prețul curent' },
  ];

  return {
    cerere, scenariu, disponibil: true,
    currentRecipeFC: fcB, scenarioRecipeFC: fcPct(C),
    deltaFCpp: fcPct(C) !== null && fcB !== null ? fcPct(C)! - fcB : null,
    deltaFCPercent: B.cost > 0 ? ((C.cost - B.cost) / B.cost) * 100 : null,
    currentCostRON: B.cost, scenarioCostRON: C.cost, deltaCostRON: C.cost - B.cost,
    currentNetRON: B.net, scenarioNetRON: C.net,
    efecte, detaliiPret, detaliiReteta, detaliiPmix,
    affectedIngredients, affectedProducts: [...affectedProducts].sort(),
    affectedStores, affectedPeriods, affectedChannels,
    dataCoverage, ingredienteFaraPret,
    confidence,
    complete: motiveIncomplet.length === 0,
    motiveIncomplet, surse,
  };
}

const FORMULA = 'scor = 0.40×acoperire_retete + 0.35×preturi_componente + 0.25×pmix_prezent — '
  + 'fiecare factor e o acoperire măsurată pe date (0–100), nu o apreciere.';

/** Rezumat într-o linie, pentru jurnale. */
export const descrieSimulare = (s: SimulareFC) =>
  s.disponibil
    ? `${s.cerere.perioada.cheie} · ΔFC ${s.deltaFCpp?.toFixed(2) ?? '—'}pp · Δcost ${s.deltaCostRON.toFixed(0)} lei · `
      + `încredere ${s.confidence.scor} · complet: ${s.complete ? 'da' : 'nu'}`
    : `${s.cerere.perioada.cheie} · indisponibil — ${s.motivIndisponibil}`;
