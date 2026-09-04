// Ingredient Intelligence — cum mișcă prețurile și consumul ingredientelor Food Cost-ul.
//
// Ce răspunde: „de ce s-a mișcat FC-ul față de perioada precedentă?" — descompus PE
// INGREDIENT, cu efectul de preț separat de cel de consum, iar consumul despărțit la
// rândul lui în efect de rețetă și efect de mix. Nicio mișcare totală nu se pune
// pe seama prețului singur.
//
// Reguli care nu se încalcă:
//  · comparația istorică e ISTORICĂ: consumul fiecărei perioade se calculează pe versiunea
//    de rețetă în vigoare la data fiecărei vânzări (invariantul costului istoric), iar
//    prețul fiecărei perioade e prețul datat de la finele ei;
//  · nu se compară perioade cu granularități incompatibile: săptămână cu săptămâna
//    precedentă, lună întreagă cu luna precedentă sau cu aceeași lună de anul trecut —
//    orice altceva se refuză cu motiv;
//  · datele lipsă nu devin tăcut zero: ingredientul fără preț valid are cost `null`,
//    perioada fără PMIX refuză analiza, istoricul insuficient se declară;
//  · anomaliile și oportunitățile sunt DETERMINISTE: praguri configurabile, formule
//    declarate în dovadă, fără LLM; nicio economie nu se inventează — fiecare cifră
//    are baza ei de calcul scrisă;
//  · compania = Σ restaurante prin construcție: aceeași trecere acumulează și pe
//    magazin, și global, ca sume — nu există o a doua formulă pentru companie.
import { AZI_ISO, UMS, cantBruta, pretLa, versiuneLa } from './engine';
import type { AppState, Canal, IntrarePretIstoric, Reteta, UMCod } from './types';
import {
  canalePentru, contineData, eLunaIntreaga, locatieDin, luniAtinse, perioadaAnterioara, perioadaDin,
  type CerereFC, type CtxFC, type FCChannelSursa, type FCPeriod, type SursaFC,
} from './fc-domeniu';
import type { ScenariuFC } from './fc-simulare';

// ————————————————————————————————————————————————————————— cererea

export type TipComparatie = 'SAPTAMANA_PRECEDENTA' | 'LUNA_PRECEDENTA' | 'LUNA_AN_PRECEDENT';

export const ETICHETA_COMPARATIE: Record<TipComparatie, string> = {
  SAPTAMANA_PRECEDENTA: 'față de săptămâna precedentă',
  LUNA_PRECEDENTA: 'față de luna precedentă',
  LUNA_AN_PRECEDENT: 'față de aceeași lună a anului trecut',
};

export interface CerereIngrediente extends CerereFC {
  comparatie: TipComparatie;
}

// ————————————————————————————————————————————————————————— pragurile (deterministe)

export interface PraguriIngrediente {
  /** Creștere de preț „mare", în % față de perioada de comparație. */
  pretCrestereMarePct: number;
  /** Creștere de consum „mare", în %. */
  consumCrestereMarePct: number;
  /** Impact FC „mare", în puncte procentuale. */
  fcImpactMarePp: number;
  /** Impact de cost „mare", în lei pe perioadă. */
  costImpactMareLei: number;
  /** Concentrare: un singur restaurant poartă cel puțin atâta % din delta ingredientului. */
  concentrareMagazinPct: number;
  /** … și delta acelui restaurant e cel puțin atâția lei (altfel concentrarea e zgomot). */
  concentrareMinLei: number;
  /** Instabilitate: coeficientul de variație al istoricului de prețuri, în %. */
  volatilitatePretPct: number;
  /** Câte prețuri istorice cere calculul volatilității. */
  istoricMinim: number;
  /** Oportunitatea de control al consumului cere un efect de rețetă de măcar atâția lei. */
  controlConsumMinLei: number;
  /** Oportunitatea de renegociere cere un cost curent de măcar atâția lei. */
  negociereMinLei: number;
  /** Risc de concentrare: ingredientul e cel puțin atâta % din costul total al perioadei. */
  riscConcentrarePct: number;
  /** Optimizare de rețetă: ingredientul e cel puțin atâta % din costul total. */
  optimizareSharePct: number;
}

export const PRAGURI_IMPLICITE: PraguriIngrediente = {
  pretCrestereMarePct: 10,
  consumCrestereMarePct: 15,
  fcImpactMarePp: 0.3,
  costImpactMareLei: 500,
  concentrareMagazinPct: 70,
  concentrareMinLei: 100,
  volatilitatePretPct: 8,
  istoricMinim: 3,
  controlConsumMinLei: 100,
  negociereMinLei: 300,
  riscConcentrarePct: 20,
  optimizareSharePct: 15,
};

// ————————————————————————————————————————————————————————— rândul de ingredient

/**
 * Descompunerea EXACTĂ a mișcării de cost a unui ingredient, în lei:
 *   Δcost = pret + consum + interactiunePret          (identitate exactă)
 *   consum = reteta + pmix + interactiuneConsum       (identitate exactă)
 * `pret` = Δpreț × consum precedent; `consum` = Δconsum × preț precedent;
 * `reteta` = schimbarea consumului PE PORȚIE (gramaje/versiuni), la volume precedente;
 * `pmix` = schimbarea volumelor, la consumul pe porție precedent;
 * interacțiunile sunt termenii încrucișați — reali, numiți, niciodată topiți în rest.
 */
export interface EfecteIngredient {
  pret: number;
  consum: number;
  reteta: number;
  pmix: number;
  interactiunePret: number;
  interactiuneConsum: number;
}

export interface ImpactProdus {
  produs: string; denumire: string;
  /** Consum pe porție în perioada curentă, UM de bază (mediat pe versiunile în vigoare). */
  cantPerPortie: number;
  buc: number; net: number;
  /** % din vânzările nete ale scopului. */
  pmixPct: number | null;
  /** Costul ingredientului în acest produs, perioada curentă. `null` fără preț valid. */
  costLei: number | null;
  /** % din costul total al ingredientului. */
  sharePct: number | null;
  /** Contribuția la FC, pp pe vânzările scopului. */
  fcImpactPp: number | null;
}

export interface ImpactMagazin {
  locatie: string;
  consumCurent: number; consumPrecedent: number;
  deltaConsumPct: number | null;
  costCurent: number | null; costPrecedent: number | null;
  deltaCostLei: number | null;
  /** Δ contribuție pp, pe vânzările nete ALE restaurantului. */
  fcImpactPp: number | null;
  /** Prețul e pe rețea, nu pe restaurant — deviația de preț e aceeași peste tot. */
  deltaPretPct: number | null;
  /** % din suma |Δcost| pe restaurante — baza detecției de concentrare. */
  shareDinDeltaPct: number | null;
}

export interface RandIngredient {
  ingredient: string; denumire: string; um: UMCod; categorie: string;

  /** Prețul în vigoare la finele fiecărei perioade. `null` = fără preț valid, NU zero. */
  pretCurent: number | null;
  pretPrecedent: number | null;
  deltaPretLei: number | null;
  deltaPretPct: number | null;
  /** Prețul „precedent" e doar retro-umplerea celui mai vechi preț cunoscut. */
  pretPrecedentEstimat: boolean;
  /** Nici prețul „curent" nu era în vigoare la finele perioadei — cel mai vechi preț e ulterior ei. */
  pretCurentEstimat: boolean;

  /** Consum în UM de bază, pe rețetele ÎN VIGOARE la data fiecărei vânzări. */
  consumCurent: number;
  consumPrecedent: number;
  deltaConsumPct: number | null;

  /** cost = consum × prețul de la finele perioadei — convenția care face identitățile exacte. */
  costCurent: number | null;
  costPrecedent: number | null;
  deltaCostLei: number | null;

  /** Contribuția la FC: cost ÷ vânzările nete ale scopului, pp. */
  contributiePpCurent: number | null;
  contributiePpPrecedent: number | null;
  fcImpactPp: number | null;

  /** `null` când prețul lipsește — efectele nu se pot calcula fără să presupunem zero. */
  efecte: EfecteIngredient | null;

  /**
   * Schimbările de preț înregistrate în fereastra (finele perioadei precedente, finele celei
   * curente], cu proveniența lor. Un ingredient cu preț schimbat apare și fără consum: impactul
   * lui e zero acum, dar schimbarea e un fapt care se arată, nu se ascunde.
   */
  schimbariPret: IntrarePretIstoric[];

  produse: ImpactProdus[];
  magazine: ImpactMagazin[];
  canale: FCChannelSursa[];
  perioade: string[];
}

// ————————————————————————————————————————————————————————— anomalii și oportunități

export type TipAnomalie =
  | 'PRET_CRESTERE_MARE' | 'CONSUM_CRESTERE_MARE' | 'FC_IMPACT_MARE' | 'COST_IMPACT_MARE'
  | 'CONCENTRARE_MAGAZIN' | 'PRET_LIPSA' | 'MAPARE_LIPSA' | 'PRET_INSTABIL';

export const ETICHETA_ANOMALIE: Record<TipAnomalie, string> = {
  PRET_CRESTERE_MARE: 'Creștere de preț neobișnuit de mare',
  CONSUM_CRESTERE_MARE: 'Creștere de consum neobișnuit de mare',
  FC_IMPACT_MARE: 'Impact mare asupra FC',
  COST_IMPACT_MARE: 'Impact mare de cost',
  CONCENTRARE_MAGAZIN: 'Impact concentrat într-un singur restaurant',
  PRET_LIPSA: 'Ingredient consumat fără preț valid',
  MAPARE_LIPSA: 'Ingredient fără corespondent în rețete',
  PRET_INSTABIL: 'Istoric de prețuri instabil',
};

export interface AnomalieIngrediente {
  tip: TipAnomalie;
  ingredient: string; denumire: string;
  detaliu: string;
  /** Valoarea măsurată și pragul care a declanșat — nicio cifră fără explicație. */
  valoareMasurata: number | null;
  prag: number | null;
  lei: number | null;
}

export type TipOportunitate =
  | 'NEGOCIERE_PRET' | 'OPTIMIZARE_RETETA' | 'CONTROL_CONSUM' | 'RISC_CONCENTRARE' | 'COST_MARE';

export const ETICHETA_OPORTUNITATE: Record<TipOportunitate, string> = {
  NEGOCIERE_PRET: 'Renegociere de preț',
  OPTIMIZARE_RETETA: 'Optimizare de rețetă',
  CONTROL_CONSUM: 'Control al consumului',
  RISC_CONCENTRARE: 'Risc de concentrare',
  COST_MARE: 'Ingredient cu cost mare',
};

export interface OportunitateIngredient {
  tip: TipOportunitate;
  ingredient: string; denumire: string;
  motiv: string;
  /** Lei pe perioada analizată. Baza de calcul e scrisă în `dovada.calcul` — nu se inventează. */
  impactEstimatLei: number;
  fcImpactPp: number | null;
  scop: {
    perioada: string;
    nivel: string;
    canale: FCChannelSursa[];
    produse: string[];
    magazine: string[];
  };
  confidence: { scor: number; motive: string[] };
  dovada: { calcul: string; surse: SursaFC[] };
  /**
   * Scenariul what-if legat, rulabil direct în `simuleazaFC`. ATENȚIE la semantică:
   * simularea pornește de la STAREA DE AZI (prețul curent, rețetele active), deci delta ei
   * coincide cu impactul estimat aici doar când prețul de azi e cel de la finele perioadei
   * analizate — divergența, când există, e notată explicit în `dovada.calcul`.
   */
  scenariu?: ScenariuFC;
}

export interface CalitateDate {
  /** Ingrediente consumate în scop, fără preț valid în CEL PUȚIN una dintre perioade. */
  pretLipsa: string[];
  /** Componente referite de rețete, absente din nomenclator. */
  ingredientLipsa: string[];
  /** Ingrediente active cu preț, nefolosite de nicio rețetă. */
  mapareLipsa: string[];
  /** Fără vânzări pe perioada curentă (analiza refuză). */
  pmixLipsa: boolean;
  /** Fără vânzări pe perioada de comparație (analiza refuză). */
  perioadaLipsa: boolean;
  /** Prețuri retro-umplute: prețul folosit pentru o perioadă nu era de fapt cunoscut atunci. */
  istoricInsuficient: string[];
  /** Rețete a căror primă versiune e ulterioară unor vânzări din scop: consum retro-umplut, nu măsurat. */
  retetaRetroumpluta: string[];
}

export interface AnalizaIngrediente {
  cerere: CerereIngrediente;
  disponibil: boolean;
  motivIndisponibil?: string;
  perioadaCurenta: FCPeriod;
  perioadaPrecedenta: FCPeriod | null;
  netCurent: number;
  netPrecedent: number;
  /** Sortate descrescător după |Δcost| (ingredientele fără preț, la coadă, după consum). */
  randuri: RandIngredient[];
  anomalii: AnomalieIngrediente[];
  /** Sortate descrescător după |impact estimat|. */
  oportunitati: OportunitateIngredient[];
  calitate: CalitateDate;
  complete: boolean;
  motiveIncomplet: string[];
  surse: SursaFC[];
}

// ————————————————————————————————————————————————————————— consumul datat al unei perioade

const conv = (um: UMCod, baza: string): number | null => {
  const u = UMS[um];
  return u && u.baza === baza ? u.f : null;
};

interface ConsumPortie {
  cantitati: Map<string, number>;
  lipsa: Set<string>;
  faraReteta: boolean;
  /** Rețete a căror primă versiune e ULTERIOARĂ datei vânzării: consumul e retro-umplut, nu măsurat. */
  retro: Set<string>;
}

/** Consumul pe porție al TUTUROR ingredientelor unui produs, la data dată — versiunea
 *  în vigoare ATUNCI, nu cea activă azi (invariantul costului istoric). Semipreparatele
 *  sunt fără canal, ca în costare: filtrul de canal se aplică doar pe rețeta produsului. */
function consumPortieLa(produs: string, canal: Canal, ctx: CtxFC, data: string): ConsumPortie {
  const rez: ConsumPortie = { cantitati: new Map(), lipsa: new Set(), faraReteta: false, retro: new Set() };
  const versiunea = (r: Reteta) => {
    const v = versiuneLa(r, data);
    if (v.data > data) rez.retro.add(r.cod);
    return v;
  };
  const aduna = (cod: string, factor: number, stack: Set<string>) => {
    if (stack.has(`C|${cod}`)) return;   // protecție la combo-uri ciclice
    const p = ctx.produse.get(cod);
    if (p?.tip === 'COMBO' && p.combo?.length) {
      stack.add(`C|${cod}`);
      for (const c of p.combo) aduna(c.cod, factor * c.cant, stack);
      stack.delete(`C|${cod}`);
      return;
    }
    const r = ctx.retete.get(cod);
    if (!r) { rez.faraReteta = true; return; }
    dinReteta(r, factor, stack, false);
  };
  const dinReteta = (r: Reteta, factor: number, stack: Set<string>, inSP: boolean) => {
    if (stack.has(r.cod)) return;
    stack.add(r.cod);
    const v = versiunea(r);
    for (const l of v.linii) {
      // filtrul de canal doar la nivelul produsului — semipreparatele nu diferă pe canal
      if (!inSP && l.canal !== 'AMBELE' && l.canal !== canal) continue;
      const cb = cantBruta(l);
      if (l.tipComp === 'SEMIPREPARAT') {
        const sp = ctx.retete.get(l.comp);
        if (!sp) { rez.lipsa.add(l.comp); continue; }
        const vsp = versiunea(sp);
        const baza = vsp.randament?.um ?? 'kg';
        const f = conv(l.um, baza);
        if (f == null) { rez.lipsa.add(l.comp); continue; }
        const scala = vsp.randament && vsp.randament.cant > 0 ? (cb * f) / vsp.randament.cant : cb * f;
        dinReteta(sp, factor * scala, stack, true);
      } else {
        const ing = ctx.ingrediente.get(l.comp);
        if (!ing) { rez.lipsa.add(l.comp); continue; }
        const f = conv(l.um, ing.um);
        if (f == null) { rez.lipsa.add(l.comp); continue; }
        rez.cantitati.set(l.comp, (rez.cantitati.get(l.comp) ?? 0) + cb * f * factor);
      }
    }
    stack.delete(r.cod);
  };
  aduna(produs, 1, new Set());
  return rez;
}

interface AcumIngredient {
  qty: number;
  /** Cheia e `produs|canal`: despărțirea rețetă/mix se face pe celule produs × canal, ca o
   *  mutare de volum între canale (linii de rețetă diferite pe canal) să fie MIX, nu rețetă. */
  perCelula: Map<string, { qty: number; buc: number }>;
  perProdus: Map<string, { qty: number; buc: number }>;
  perMagazin: Map<string, { qty: number }>;
  canale: Set<Canal>;
  luni: Set<string>;
}

export interface ConsumPerioada {
  peIngredient: Map<string, AcumIngredient>;
  net: number;
  buc: number;
  netPerMagazin: Map<string, number>;
  netPerProdus: Map<string, { net: number; buc: number }>;
  /** Volumele REALE vândute pe `produs|canal` — indiferent dacă rețeta de atunci conținea
   *  vreun ingredient anume; baza corectă pentru „produsul s-a vândut, ingredientul nu era în rețetă". */
  bucPerCelula: Map<string, number>;
  faraReteta: Set<string>;
  componenteLipsa: Set<string>;
  reteteRetro: Set<string>;
  randuri: number;
}

/** O singură trecere prin vânzările perioadei: acumulează global, pe produs și pe restaurant
 *  CA SUME — compania nu are o formulă separată, e chiar suma restaurantelor. */
export function consumaPerioada(
  state: AppState, ctx: CtxFC, per: FCPeriod, loc: string | undefined, canale: Canal[],
): ConsumPerioada {
  const rez: ConsumPerioada = {
    peIngredient: new Map(), net: 0, buc: 0,
    netPerMagazin: new Map(), netPerProdus: new Map(), bucPerCelula: new Map(),
    faraReteta: new Set(), componenteLipsa: new Set(), reteteRetro: new Set(), randuri: 0,
  };
  const memo = new Map<string, ConsumPortie>();
  for (const v of state.vanzari) {
    if (!contineData(per, v.data)) continue;
    if (loc && v.locatie !== loc) continue;
    if (!canale.includes(v.canal)) continue;
    rez.randuri++;
    rez.net += v.net; rez.buc += v.cant;
    rez.netPerMagazin.set(v.locatie, (rez.netPerMagazin.get(v.locatie) ?? 0) + v.net);
    const np = rez.netPerProdus.get(v.produs) ?? { net: 0, buc: 0 };
    np.net += v.net; np.buc += v.cant;
    rez.netPerProdus.set(v.produs, np);
    const celula = `${v.produs}|${v.canal}`;
    rez.bucPerCelula.set(celula, (rez.bucPerCelula.get(celula) ?? 0) + v.cant);

    const cheie = `${celula}|${v.data}`;
    let cp = memo.get(cheie);
    if (!cp) { cp = consumPortieLa(v.produs, v.canal, ctx, v.data); memo.set(cheie, cp); }
    if (cp.faraReteta) rez.faraReteta.add(v.produs);
    for (const c of cp.lipsa) rez.componenteLipsa.add(c);
    for (const c of cp.retro) rez.reteteRetro.add(c);
    for (const [cod, perPortie] of cp.cantitati) {
      const a = rez.peIngredient.get(cod)
        ?? { qty: 0, perCelula: new Map(), perProdus: new Map(), perMagazin: new Map(), canale: new Set<Canal>(), luni: new Set<string>() };
      a.qty += perPortie * v.cant;
      const pc = a.perCelula.get(celula) ?? { qty: 0, buc: 0 };
      pc.qty += perPortie * v.cant; pc.buc += v.cant;
      a.perCelula.set(celula, pc);
      const pp = a.perProdus.get(v.produs) ?? { qty: 0, buc: 0 };
      pp.qty += perPortie * v.cant; pp.buc += v.cant;
      a.perProdus.set(v.produs, pp);
      const pm = a.perMagazin.get(v.locatie) ?? { qty: 0 };
      pm.qty += perPortie * v.cant;
      a.perMagazin.set(v.locatie, pm);
      a.canale.add(v.canal);
      a.luni.add(v.data.slice(0, 7));
      rez.peIngredient.set(cod, a);
    }
  }
  return rez;
}

// ————————————————————————————————————————————————————————— motorul

const pct = (nou: number, vechi: number): number | null => (vechi !== 0 ? ((nou - vechi) / vechi) * 100 : null);

export function analizaIngrediente(
  state: AppState,
  ctx: CtxFC,
  cerere: CerereIngrediente,
  praguri: PraguriIngrediente = PRAGURI_IMPLICITE,
): AnalizaIngrediente {
  const calitateGoala = (): CalitateDate => ({
    pretLipsa: [], ingredientLipsa: [], mapareLipsa: [],
    pmixLipsa: false, perioadaLipsa: false, istoricInsuficient: [], retetaRetroumpluta: [],
  });
  const gol = (motiv: string, calitate = calitateGoala(), perPrec: FCPeriod | null = null): AnalizaIngrediente => ({
    cerere, disponibil: false, motivIndisponibil: motiv,
    perioadaCurenta: cerere.perioada, perioadaPrecedenta: perPrec,
    netCurent: 0, netPrecedent: 0,
    randuri: [], anomalii: [], oportunitati: [], calitate,
    complete: false, motiveIncomplet: [motiv], surse: [],
  });

  // ——— granularitatea comparației: niciodată perioade incompatibile
  const per = cerere.perioada;
  if (cerere.comparatie === 'SAPTAMANA_PRECEDENTA') {
    if (per.tip !== 'SAPTAMANA') {
      return gol(`Comparația „${ETICHETA_COMPARATIE[cerere.comparatie]}" cere o perioadă de tip săptămână, nu ${per.tip}.`);
    }
    if (per.partiala) {
      return gol(`Săptămâna ${per.cheie} e tăiată la ${per.zile} zile — comparația cu o săptămână întreagă ar amesteca granularități.`);
    }
  } else {
    if (per.tip !== 'LUNA' || !eLunaIntreaga(per)) {
      return gol(`Comparația „${ETICHETA_COMPARATIE[cerere.comparatie]}" cere o lună calendaristică întreagă.`);
    }
    if (luniAtinse(per).length !== 1) {
      return gol('Comparația pe lună cere exact o lună, nu un interval de mai multe.');
    }
  }

  const perPrec: FCPeriod = cerere.comparatie === 'LUNA_AN_PRECEDENT'
    ? (() => {
      const [an, l] = per.cheie.split('-').map(Number);
      return perioadaDin(`${an - 1}-${String(l).padStart(2, '0')}-01`, 'LUNA');
    })()
    : perioadaAnterioara(per);

  // ——— consumul datat al celor două perioade
  const loc = locatieDin(cerere.nivel);
  const canale = canalePentru(cerere.canal);
  const cur = consumaPerioada(state, ctx, per, loc, canale);
  const prec = consumaPerioada(state, ctx, perPrec, loc, canale);

  if (!cur.randuri) {
    const c = calitateGoala(); c.pmixLipsa = true;
    return gol(`Nu există vânzări (PMIX) pe ${per.cheie}${loc ? ` la ${loc}` : ''} — nu e nimic de analizat.`, c, perPrec);
  }
  if (!prec.randuri) {
    const c = calitateGoala(); c.perioadaLipsa = true;
    return gol(cerere.comparatie === 'LUNA_AN_PRECEDENT'
      ? `Nu există vânzări pe ${perPrec.cheie}: comparația cu anul precedent e posibilă doar unde istoricul există.`
      : `Nu există vânzări pe perioada de comparație ${perPrec.cheie} — mișcarea nu se poate măsura față de nimic.`,
      c, perPrec);
  }

  // ——— rândurile pe ingredient
  const calitate = calitateGoala();
  calitate.ingredientLipsa = [...new Set([...cur.componenteLipsa, ...prec.componenteLipsa])].sort();
  calitate.retetaRetroumpluta = [...new Set([...cur.reteteRetro, ...prec.reteteRetro])].sort();

  // rândurile: ingredientele consumate în oricare perioadă PLUS cele al căror preț de la finele
  // perioadei diferă de cel de la finele perioadei precedente, chiar fără consum
  const cuPretSchimbat = [...ctx.ingrediente.values()]
    .filter(i => i.preturi.length > 0 && pretLa(i, per.la) !== pretLa(i, perPrec.la))
    .map(i => i.cod);
  const coduri = [...new Set([...cur.peIngredient.keys(), ...prec.peIngredient.keys(), ...cuPretSchimbat])].sort();
  const randuri: RandIngredient[] = [];
  const evenimente = (cod: string): IntrarePretIstoric[] => (state.istoricPreturi ?? [])
    .filter(e => e.ingredient === cod && e.dataEfectiva > perPrec.la && e.dataEfectiva <= per.la)
    .sort((a, b) => a.dataEfectiva.localeCompare(b.dataEfectiva));

  for (const cod of coduri) {
    const ing = ctx.ingrediente.get(cod);
    if (!ing) continue;   // deja în ingredientLipsa prin componenteLipsa
    const aCur = cur.peIngredient.get(cod);
    const aPrec = prec.peIngredient.get(cod);
    const qCur = aCur?.qty ?? 0;
    const qPrec = aPrec?.qty ?? 0;

    const areIstoric = ing.preturi.length > 0;
    const brutCur = areIstoric ? pretLa(ing, per.la) : 0;
    const brutPrec = areIstoric ? pretLa(ing, perPrec.la) : 0;
    const pCur = brutCur > 0 ? brutCur : null;
    const pPrec = brutPrec > 0 ? brutPrec : null;
    // preț lipsă în ORICARE perioadă = descompunere imposibilă — se declară, nu se tace
    if ((pCur === null || pPrec === null) && (qCur > 0 || qPrec > 0)) calitate.pretLipsa.push(cod);
    const celMaiVechi = areIstoric
      ? [...ing.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa))[0].validDeLa : null;
    const pretPrecedentEstimat = pPrec !== null && celMaiVechi !== null && celMaiVechi > perPrec.la;
    const pretCurentEstimat = pCur !== null && celMaiVechi !== null && celMaiVechi > per.la;
    if (pretPrecedentEstimat || pretCurentEstimat) calitate.istoricInsuficient.push(cod);

    const costCur = pCur !== null ? qCur * pCur : null;
    const costPrec = pPrec !== null ? qPrec * pPrec : null;
    const contribCur = costCur !== null && cur.net > 0 ? (costCur / cur.net) * 100 : null;
    const contribPrec = costPrec !== null && prec.net > 0 ? (costPrec / prec.net) * 100 : null;

    // — descompunerea exactă (doar cu ambele prețuri valide)
    let efecte: EfecteIngredient | null = null;
    if (pCur !== null && pPrec !== null) {
      const dP = pCur - pPrec;
      const dQ = qCur - qPrec;
      // despărțirea rețetă/mix, pe celule produs × canal, cu volumele REALE vândute:
      //  · un produs vândut în ambele perioade, dar cu ingredientul introdus/scos de o
      //    versiune, are consum pe porție 0 → schimbarea e efect de REȚETĂ, nu de volum;
      //  · o mutare de volum între canale (linii de rețetă diferite pe canal) e MIX;
      //  · doar celula care nu s-a vândut deloc într-o perioadă cade pe mix (volum nou).
      let pmixLei = 0, retetaLei = 0;
      const celule = new Set([...(aCur?.perCelula.keys() ?? []), ...(aPrec?.perCelula.keys() ?? [])]);
      for (const cel of celule) {
        const bucCur = cur.bucPerCelula.get(cel) ?? 0;
        const bucPrec = prec.bucPerCelula.get(cel) ?? 0;
        const cppCur = bucCur > 0 ? (aCur?.perCelula.get(cel)?.qty ?? 0) / bucCur : null;
        const cppPrec = bucPrec > 0 ? (aPrec?.perCelula.get(cel)?.qty ?? 0) / bucPrec : null;
        const cppBaza = cppPrec ?? cppCur ?? 0;
        pmixLei += pPrec * (bucCur - bucPrec) * cppBaza;
        if (cppCur !== null && cppPrec !== null) retetaLei += pPrec * bucPrec * (cppCur - cppPrec);
      }
      const consumLei = dQ * pPrec;
      efecte = {
        pret: dP * qPrec,
        consum: consumLei,
        reteta: retetaLei,
        pmix: pmixLei,
        interactiunePret: dP * dQ,
        interactiuneConsum: consumLei - retetaLei - pmixLei,
      };
    }

    // — impactul pe produse (perioada curentă)
    const produse: ImpactProdus[] = [...(aCur?.perProdus.entries() ?? [])].map(([p, v]) => {
      const np = cur.netPerProdus.get(p);
      const costLei = pCur !== null ? v.qty * pCur : null;
      return {
        produs: p, denumire: ctx.produse.get(p)?.denumire ?? p,
        cantPerPortie: v.buc > 0 ? v.qty / v.buc : 0,
        buc: v.buc, net: np?.net ?? 0,
        pmixPct: cur.net > 0 && np ? (np.net / cur.net) * 100 : null,
        costLei,
        sharePct: costLei !== null && costCur !== null && costCur > 0 ? (costLei / costCur) * 100 : null,
        fcImpactPp: costLei !== null && cur.net > 0 ? (costLei / cur.net) * 100 : null,
      };
    }).sort((a, b) => (b.costLei ?? b.buc) - (a.costLei ?? a.buc));

    // — impactul pe restaurante
    const magazineToate = [...new Set([...(aCur?.perMagazin.keys() ?? []), ...(aPrec?.perMagazin.keys() ?? [])])].sort();
    const deltePeMagazin = magazineToate.map(m => {
      const qC = aCur?.perMagazin.get(m)?.qty ?? 0;
      const qP = aPrec?.perMagazin.get(m)?.qty ?? 0;
      return { m, qC, qP, delta: pCur !== null && pPrec !== null ? qC * pCur - qP * pPrec : null };
    });
    const sumaAbs = deltePeMagazin.reduce((s, d) => s + Math.abs(d.delta ?? 0), 0);
    const magazine: ImpactMagazin[] = deltePeMagazin.map(({ m, qC, qP, delta }) => {
      const netM = cur.netPerMagazin.get(m) ?? 0;
      const netMPrec = prec.netPerMagazin.get(m) ?? 0;
      const cC = pCur !== null ? qC * pCur : null;
      const cP = pPrec !== null ? qP * pPrec : null;
      return {
        locatie: m,
        consumCurent: qC, consumPrecedent: qP,
        deltaConsumPct: pct(qC, qP),
        costCurent: cC, costPrecedent: cP,
        deltaCostLei: delta,
        fcImpactPp: cC !== null && cP !== null && netM > 0 && netMPrec > 0
          ? (cC / netM) * 100 - (cP / netMPrec) * 100 : null,
        deltaPretPct: pCur !== null && pPrec !== null ? pct(pCur, pPrec) : null,
        shareDinDeltaPct: delta !== null && sumaAbs > 0 ? (Math.abs(delta) / sumaAbs) * 100 : null,
      };
    }).sort((a, b) => Math.abs(b.deltaCostLei ?? 0) - Math.abs(a.deltaCostLei ?? 0));

    randuri.push({
      ingredient: cod, denumire: ing.denumire, um: ing.um, categorie: ing.categorie,
      pretCurent: pCur, pretPrecedent: pPrec,
      deltaPretLei: pCur !== null && pPrec !== null ? pCur - pPrec : null,
      deltaPretPct: pCur !== null && pPrec !== null ? pct(pCur, pPrec) : null,
      pretPrecedentEstimat, pretCurentEstimat,
      consumCurent: qCur, consumPrecedent: qPrec,
      deltaConsumPct: pct(qCur, qPrec),
      costCurent: costCur, costPrecedent: costPrec,
      deltaCostLei: costCur !== null && costPrec !== null ? costCur - costPrec : null,
      contributiePpCurent: contribCur, contributiePpPrecedent: contribPrec,
      fcImpactPp: contribCur !== null && contribPrec !== null ? contribCur - contribPrec : null,
      efecte,
      schimbariPret: evenimente(cod),
      produse, magazine,
      canale: [...new Set([...(aCur?.canale ?? []), ...(aPrec?.canale ?? [])])].sort() as FCChannelSursa[],
      perioade: [...new Set([...(aCur?.luni ?? []), ...(aPrec?.luni ?? [])])].sort(),
    });
  }
  const rang = (x: number | null) => (x === null ? -1 : Math.abs(x));
  randuri.sort((a, b) =>
    rang(b.deltaCostLei) - rang(a.deltaCostLei)
    || b.consumCurent - a.consumCurent || a.ingredient.localeCompare(b.ingredient));

  calitate.pretLipsa.sort();
  calitate.istoricInsuficient.sort();

  // — mapare lipsă: ingrediente active cu preț, nefolosite de nicio rețetă (nicio versiune)
  const folosite = new Set<string>();
  for (const r of ctx.retete.values()) for (const v of r.versiuni) for (const l of v.linii) folosite.add(l.comp);
  calitate.mapareLipsa = [...ctx.ingrediente.values()]
    .filter(i => i.activ && i.preturi.length > 0 && !folosite.has(i.cod))
    .map(i => i.cod).sort();

  // ——— anomalii: praguri declarate, valori măsurate
  const anomalii: AnomalieIngrediente[] = [];
  const an = (tip: TipAnomalie, r: { ingredient: string; denumire: string }, detaliu: string,
    valoareMasurata: number | null, prag: number | null, lei: number | null) =>
    anomalii.push({ tip, ingredient: r.ingredient, denumire: r.denumire, detaliu, valoareMasurata, prag, lei });

  for (const r of randuri) {
    if (r.deltaPretPct !== null && r.deltaPretPct >= praguri.pretCrestereMarePct) {
      an('PRET_CRESTERE_MARE', r,
        `Prețul a urcat cu ${r.deltaPretPct.toFixed(1)}% (${r.pretPrecedent} → ${r.pretCurent} lei/${r.um}).`,
        r.deltaPretPct, praguri.pretCrestereMarePct, r.efecte?.pret ?? null);
    }
    if (r.deltaConsumPct !== null && r.deltaConsumPct >= praguri.consumCrestereMarePct) {
      an('CONSUM_CRESTERE_MARE', r,
        `Consumul a urcat cu ${r.deltaConsumPct.toFixed(1)}% (${r.consumPrecedent.toFixed(1)} → ${r.consumCurent.toFixed(1)} ${UMS[r.um].baza}).`,
        r.deltaConsumPct, praguri.consumCrestereMarePct, r.efecte?.consum ?? null);
    }
    if (r.fcImpactPp !== null && Math.abs(r.fcImpactPp) >= praguri.fcImpactMarePp) {
      an('FC_IMPACT_MARE', r,
        `Contribuția la FC s-a mișcat cu ${r.fcImpactPp.toFixed(2)}pp (${r.contributiePpPrecedent?.toFixed(2)} → ${r.contributiePpCurent?.toFixed(2)}).`,
        r.fcImpactPp, praguri.fcImpactMarePp, r.deltaCostLei);
    }
    if (r.deltaCostLei !== null && Math.abs(r.deltaCostLei) >= praguri.costImpactMareLei) {
      an('COST_IMPACT_MARE', r,
        `Costul s-a mișcat cu ${Math.round(r.deltaCostLei)} lei pe perioadă.`,
        r.deltaCostLei, praguri.costImpactMareLei, r.deltaCostLei);
    }
    if (!loc && r.magazine.length > 1) {
      const varf = r.magazine[0];
      if (varf.shareDinDeltaPct !== null && varf.shareDinDeltaPct >= praguri.concentrareMagazinPct
        && Math.abs(varf.deltaCostLei ?? 0) >= praguri.concentrareMinLei) {
        an('CONCENTRARE_MAGAZIN', r,
          `${varf.shareDinDeltaPct.toFixed(0)}% din mișcarea de cost stă în ${varf.locatie} `
          + `(${Math.round(varf.deltaCostLei ?? 0)} lei).`,
          varf.shareDinDeltaPct, praguri.concentrareMagazinPct, varf.deltaCostLei);
      }
    }
    if (r.pretCurent === null || r.pretPrecedent === null) {
      an('PRET_LIPSA', r,
        r.pretCurent === null && r.pretPrecedent === null
          ? 'Consumat în scop, dar fără preț valid în nomenclator: costul lui NU e presupus zero — e necunoscut.'
          : `Fără preț valid pe perioada ${r.pretCurent === null ? 'curentă' : 'de comparație'}: `
            + 'descompunerea mișcării lui e imposibilă — costul lipsă NU e presupus zero.',
        null, null, null);
    }
  }
  for (const cod of calitate.mapareLipsa) {
    const ing = ctx.ingrediente.get(cod)!;
    an('MAPARE_LIPSA', { ingredient: cod, denumire: ing.denumire },
      'Are preț în nomenclator, dar nicio rețetă nu îl folosește — fie lipsește maparea, fie e stoc mort.',
      null, null, null);
  }
  for (const ing of ctx.ingrediente.values()) {
    if (ing.preturi.length < praguri.istoricMinim) continue;
    const valori = ing.preturi.map(p => p.pret);
    const medie = valori.reduce((s, x) => s + x, 0) / valori.length;
    if (medie <= 0) continue;
    const varianta = valori.reduce((s, x) => s + (x - medie) ** 2, 0) / valori.length;
    const cv = (Math.sqrt(varianta) / medie) * 100;
    if (cv >= praguri.volatilitatePretPct) {
      an('PRET_INSTABIL', { ingredient: ing.cod, denumire: ing.denumire },
        `Coeficient de variație ${cv.toFixed(1)}% pe ${valori.length} prețuri istorice.`,
        cv, praguri.volatilitatePretPct, null);
    }
  }

  // ——— oportunități: deterministe, cu baza de calcul scrisă și scenariu what-if unde există
  const interval = `${per.de} → ${per.la}`;
  const surse: SursaFC[] = [
    { raport: 'PMIX', randuri: cur.randuri + prec.randuri, interval: `${perPrec.de} → ${per.la}`, nota: `${per.cheie} vs ${perPrec.cheie}` },
    { raport: 'RETETAR', randuri: ctx.retete.size, interval, nota: 'versiunile în vigoare la data fiecărei vânzări' },
    { raport: 'NOMENCLATOR', randuri: ctx.ingrediente.size, interval, nota: 'prețurile datate de la finele fiecărei perioade' },
  ];
  const oportunitati: OportunitateIngredient[] = [];
  const acoperire = cur.net > 0 ? ((cur.net - [...cur.faraReteta].reduce((s, p) => s + (cur.netPerProdus.get(p)?.net ?? 0), 0)) / cur.net) * 100 : null;
  const incredere = (r: RandIngredient): { scor: number; motive: string[] } => {
    let scor = 100;
    const motive: string[] = [];
    if (acoperire !== null && acoperire < 100) { scor -= 20; motive.push(`acoperirea rețetelor e ${acoperire.toFixed(1)}%`); }
    if (r.pretPrecedentEstimat) { scor -= 30; motive.push('prețul precedent e retro-umplut, nu era cunoscut atunci'); }
    if (calitate.ingredientLipsa.length) { scor -= 10; motive.push('rețetele au componente lipsă din nomenclator'); }
    if (calitate.pretLipsa.length) {
      scor -= 25;
      motive.push(`${calitate.pretLipsa.length} ingrediente consumate nu au preț: costul total e subestimat, `
        + 'deci procentele din el pot fi supraevaluate');
    }
    if (!motive.length) motive.push('datele acoperă complet perioada și comparația');
    return { scor: Math.max(0, scor), motive };
  };
  const scop = (r: RandIngredient) => ({
    perioada: per.cheie,
    nivel: loc ?? 'COMPANIE',
    canale: r.canale,
    produse: r.produse.slice(0, 8).map(p => p.produs),
    magazine: r.magazine.map(m => m.locatie),
  });

  // scenariul what-if pornește de la starea de AZI — divergența față de perioada analizată se declară
  const notaDrift = (r: RandIngredient): string => {
    const ing = ctx.ingrediente.get(r.ingredient)!;
    const azi = ing.preturi.length ? pretLa(ing, '9999-12-31') : 0;
    return r.pretCurent !== null && azi > 0 && Math.abs(azi - r.pretCurent) > 1e-9
      ? ` · ATENȚIE: prețul de AZI (${azi} lei) diferă de cel de la finele perioadei (${r.pretCurent} lei) — `
        + 'scenariul what-if pornește de la prețul de azi, deci delta lui va diferi de impactul estimat aici'
      : '';
  };
  const notaBaza = calitate.pretLipsa.length
    ? ` · procent calculat DOAR pe ingredientele cu preț valid (${calitate.pretLipsa.length} fără preț rămân în afara bazei)`
    : '';

  const costTotal = randuri.reduce((s, r) => s + (r.costCurent ?? 0), 0);
  for (const r of randuri) {
    if (r.efecte && r.deltaPretPct !== null && r.deltaPretPct >= praguri.pretCrestereMarePct
      && (r.costCurent ?? 0) >= praguri.negociereMinLei) {
      const economie = (r.pretCurent! - r.pretPrecedent!) * r.consumCurent;
      oportunitati.push({
        tip: 'NEGOCIERE_PRET', ingredient: r.ingredient, denumire: r.denumire,
        motiv: `Prețul a urcat cu ${r.deltaPretPct.toFixed(1)}% ${ETICHETA_COMPARATIE[cerere.comparatie]}, `
          + `pe un cost de ${Math.round(r.costCurent!)} lei/perioadă — readucerea la prețul precedent e cuantificabilă direct.`,
        impactEstimatLei: economie,
        fcImpactPp: cur.net > 0 ? (economie / cur.net) * 100 : null,
        scop: scop(r), confidence: incredere(r),
        dovada: {
          calcul: `economie = (preț curent ${r.pretCurent} − preț precedent ${r.pretPrecedent}) × consum curent `
            + `${r.consumCurent.toFixed(2)} ${UMS[r.um].baza} = ${economie.toFixed(0)} lei/perioadă${notaDrift(r)}`,
          surse,
        },
        scenariu: { nume: `Renegociere ${r.denumire}`, preturi: [{ ingredient: r.ingredient, pretNou: r.pretPrecedent! }] },
      });
    }
    if (r.efecte && r.efecte.reteta > praguri.controlConsumMinLei) {
      const vinovate = r.produse.filter(p => {
        const prPr = prec.peIngredient.get(r.ingredient)?.perProdus.get(p.produs);
        const cppPrec = prPr && prPr.buc > 0 ? prPr.qty / prPr.buc : null;
        return cppPrec !== null && p.cantPerPortie > cppPrec;
      }).map(p => p.produs);
      oportunitati.push({
        tip: 'CONTROL_CONSUM', ingredient: r.ingredient, denumire: r.denumire,
        motiv: `Consumul PE PORȚIE a crescut ${ETICHETA_COMPARATIE[cerere.comparatie]}: `
          + `${Math.round(r.efecte.reteta)} lei vin din gramaje/rețete, nu din volum.`,
        impactEstimatLei: r.efecte.reteta,
        fcImpactPp: cur.net > 0 ? (r.efecte.reteta / cur.net) * 100 : null,
        scop: { ...scop(r), produse: vinovate.slice(0, 8) },
        confidence: incredere(r),
        dovada: {
          calcul: `efect de rețetă = Σ preț precedent × volum precedent × Δconsum/porție = ${r.efecte.reteta.toFixed(0)} lei — `
            + 'revenirea la consumul pe porție precedent recuperează exact această sumă',
          surse,
        },
      });
    }
    if (costTotal > 0 && (r.costCurent ?? 0) / costTotal * 100 >= praguri.riscConcentrarePct) {
      oportunitati.push({
        tip: 'RISC_CONCENTRARE', ingredient: r.ingredient, denumire: r.denumire,
        motiv: `${((r.costCurent! / costTotal) * 100).toFixed(0)}% din costul ingredientelor stă într-un singur `
          + 'articol: orice șoc de preț sau de furnizor lovește direct FC-ul.',
        impactEstimatLei: r.costCurent!,
        fcImpactPp: r.contributiePpCurent,
        scop: scop(r), confidence: incredere(r),
        dovada: {
          calcul: `expunere = costul curent ${Math.round(r.costCurent!)} lei din ${Math.round(costTotal)} lei total ingrediente `
            + `= ${((r.costCurent! / costTotal) * 100).toFixed(1)}% (prag ${praguri.riscConcentrarePct}%)${notaBaza}`,
          surse,
        },
      });
    }
    if (costTotal > 0 && (r.costCurent ?? 0) / costTotal * 100 >= praguri.optimizareSharePct && r.produse.length) {
      const lei1pct = r.costCurent! * 0.01;
      oportunitati.push({
        tip: 'OPTIMIZARE_RETETA', ingredient: r.ingredient, denumire: r.denumire,
        motiv: `Ingredient greu în rețete (${((r.costCurent! / costTotal) * 100).toFixed(0)}% din costul total): `
          + 'fiecare procent de gramaj optimizat se vede direct în FC.',
        impactEstimatLei: lei1pct,
        fcImpactPp: cur.net > 0 ? (lei1pct / cur.net) * 100 : null,
        scop: scop(r), confidence: incredere(r),
        dovada: {
          calcul: `bază declarată: 1% din consumul curent = ${lei1pct.toFixed(0)} lei/perioadă `
            + `(NU o economie promisă — unitatea de măsură a oricărei reformulări)${notaBaza}`,
          surse,
        },
      });
    }
  }
  // COST_MARE: top 3 după cost curent, dacă nu au deja o oportunitate de preț
  const cuPret = randuri.filter(r => r.costCurent !== null);
  for (const r of cuPret.slice().sort((a, b) => b.costCurent! - a.costCurent!).slice(0, 3)) {
    if (oportunitati.some(o => o.ingredient === r.ingredient && (o.tip === 'NEGOCIERE_PRET' || o.tip === 'COST_MARE'))) continue;
    const lei1pct = r.costCurent! * 0.01;
    oportunitati.push({
      tip: 'COST_MARE', ingredient: r.ingredient, denumire: r.denumire,
      motiv: `Printre cele mai mari costuri de ingredient ale perioadei (${Math.round(r.costCurent!)} lei): `
        + 'orice procent negociat la preț se simte direct.',
      impactEstimatLei: lei1pct,
      fcImpactPp: cur.net > 0 ? (lei1pct / cur.net) * 100 : null,
      scop: scop(r), confidence: incredere(r),
      dovada: {
        calcul: `bază declarată: 1% din prețul curent × consumul curent = ${lei1pct.toFixed(0)} lei/perioadă${notaDrift(r)}`,
        surse,
      },
      scenariu: { nume: `−1% preț ${r.denumire}`, preturi: [{ ingredient: r.ingredient, pretNou: r.pretCurent! * 0.99 }] },
    });
  }
  oportunitati.sort((a, b) => Math.abs(b.impactEstimatLei) - Math.abs(a.impactEstimatLei) || a.ingredient.localeCompare(b.ingredient));

  // ——— completitudine
  const motiveIncomplet: string[] = [];
  if (cur.faraReteta.size || prec.faraReteta.size) {
    const n = new Set([...cur.faraReteta, ...prec.faraReteta]).size;
    motiveIncomplet.push(`${n} produse vândute nu au rețetă: consumul lor de ingrediente e necunoscut, `
      + 'NU zero — mișcarea reală poate fi mai mare decât cea măsurată.');
  }
  if (calitate.ingredientLipsa.length) {
    motiveIncomplet.push(`${calitate.ingredientLipsa.length} componente din rețete lipsesc din nomenclator `
      + `(${calitate.ingredientLipsa.slice(0, 5).join(', ')}): consumul lor nu se poate măsura.`);
  }
  if (calitate.pretLipsa.length) {
    motiveIncomplet.push(`${calitate.pretLipsa.length} ingrediente consumate nu au preț valid: costul lor e necunoscut, nu zero.`);
  }
  if (calitate.istoricInsuficient.length) {
    motiveIncomplet.push(`${calitate.istoricInsuficient.length} ingrediente au prețuri retro-umplute — `
      + 'istoricul de prețuri nu acoperă perioadele comparate.');
  }
  if (calitate.retetaRetroumpluta.length) {
    motiveIncomplet.push(`${calitate.retetaRetroumpluta.length} rețete au prima versiune ULTERIOARĂ unor vânzări `
      + `din scop (${calitate.retetaRetroumpluta.slice(0, 5).join(', ')}): consumul lor de atunci e retro-umplut `
      + 'din versiunea cea mai veche, nu măsurat.');
  }
  if (per.la >= AZI_ISO()) {
    motiveIncomplet.push(`Perioada ${per.cheie} nu s-a încheiat: comparația pune o perioadă parțială `
      + 'lângă una întreagă, iar orice „scădere" poate fi doar calendarul.');
  }

  return {
    cerere, disponibil: true,
    perioadaCurenta: per, perioadaPrecedenta: perPrec,
    netCurent: cur.net, netPrecedent: prec.net,
    randuri, anomalii, oportunitati, calitate,
    complete: motiveIncomplet.length === 0,
    motiveIncomplet, surse,
  };
}

/** Rezumat într-o linie, pentru jurnale. */
export const descrieAnaliza = (a: AnalizaIngrediente) =>
  a.disponibil
    ? `${a.perioadaCurenta.cheie} vs ${a.perioadaPrecedenta?.cheie} · ${a.randuri.length} ingrediente · `
      + `${a.anomalii.length} anomalii · ${a.oportunitati.length} oportunități · complet: ${a.complete ? 'da' : 'nu'}`
    : `${a.perioadaCurenta.cheie} · indisponibil — ${a.motivIndisponibil}`;
