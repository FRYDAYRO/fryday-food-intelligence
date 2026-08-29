// Tabloul de variații — vederea de luni dimineață: ce s-a mișcat în FC de săptămâna
// trecută și de luna trecută, și DIN CE anume vine mișcarea.
//
// Nu conține nicio formulă nouă de Food Cost. Compune motoarele canonice existente:
//   `metriciFC` / `comparaFC` / `serieTimeline`  — cifrele perioadei și delta lor
//   `analizaIngrediente`                          — Δpreț și Δconsum pe ingredient
// Ce adaugă este singurul lucru care lipsea: legătura dintre ele, cu identitățile scrise
// explicit și cu golul dintre convenții DECLARAT, nu ascuns.
//
// Reguli care nu se încalcă:
//  · pp ≠ %: FC-ul se compară în puncte procentuale, leii ca diferență absolută;
//  · ΔFC se descompune EXACT în efectul costului și efectul vânzărilor —
//        ΔFC = Δcost ÷ net_curent − cost_precedent × Δnet ÷ (net_curent × net_precedent)
//    identitate algebrică, nu aproximare: cei doi termeni se adună la ΔFC întotdeauna;
//  · Δcost pe ingredient se descompune în preț, consum și termenul încrucișat — trei
//    numere numite, niciodată topite unul în altul;
//  · suma pe ingrediente NU este egală cu Δcostul din rețete și nu se pretinde că este:
//    ingredientele se evaluează la prețul de la finele perioadei, iar costarea folosește
//    prețul de la data fiecărei vânzări. Diferența se calculează și se numește;
//  · pe săptămâni, partea de 2.9 rămâne indisponibilă (raportul e lunar) — se declară,
//    nu se fabrică;
//  · o perioadă neîncheiată nu se compară cu una întreagă: ancora coboară la ultima
//    perioadă încheiată și spune că a făcut-o.
import { AZI_ISO } from './engine';
import type { AppState } from './types';
import {
  perioadaAnterioara, perioadaDin,
  type FCChannel, type FCLevel, type FCPeriod, type FCPeriodType, type SursaFC,
} from './fc-domeniu';
import { comparaFC, metriciFC, serieTimeline, type ComparatieFC, type MetriciFC, type PunctTimeline } from './fc-timeline';
import {
  PRAGURI_IMPLICITE, analizaIngrediente,
  type AnalizaIngrediente, type PraguriIngrediente, type RandIngredient, type TipComparatie,
} from './fc-ingrediente';

// ————————————————————————————————————————————————————————— cererea

/** Cele două cadențe pe care se uită omul: săptămâna încheiată și luna încheiată. */
export type Cadenta = 'SAPTAMANA' | 'LUNA';

export const ETICHETA_CADENTA: Record<Cadenta, string> = {
  SAPTAMANA: 'Săptămâna încheiată, față de cea dinainte',
  LUNA: 'Luna încheiată, față de cea dinainte',
};

export interface PraguriVariatii {
  /** ΔFC de la care mișcarea merită un semnal, în puncte procentuale. */
  fcSemnificativPp: number;
  /** Δcost de la care mișcarea merită un semnal, în lei pe perioadă. */
  costSemnificativLei: number;
  /** Δpreț de la care un ingredient merită un semnal, în %. */
  pretSemnificativPct: number;
  /** Scădere de vânzări de la care semnalăm că FC-ul urcă din numitor, în %. */
  vanzariScadereSemnificativaPct: number;
  /** Câte mișcări de ingredient se rețin în tablou. */
  miscariRetinute: number;
  /** Câte perioade intră în seria din spate. */
  puncteSerie: number;
}

export const PRAGURI_VARIATII: PraguriVariatii = {
  fcSemnificativPp: 0.3,
  costSemnificativLei: 500,
  pretSemnificativPct: 10,
  vanzariScadereSemnificativaPct: 10,
  miscariRetinute: 15,
  puncteSerie: 8,
};

export interface CerereVariatii {
  /** Data de referință — de regulă „azi". Ancora coboară singură la ultima perioadă încheiată. */
  ancora: string;
  nivel: FCLevel;
  canal: FCChannel;
  /** Cadențele cerute. Implicit amândouă. */
  cadente?: Cadenta[];
}

// ————————————————————————————————————————————————————————— ancorarea

const ZI = 86400000;
const laData = (d: string) => new Date(`${d}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const minusZile = (d: string, n: number) => iso(new Date(laData(d).getTime() - n * ZI));

export interface Ancorare {
  perioada: FCPeriod;
  /** Ancora cerută cădea într-o perioadă neîncheiată și a fost coborâtă. */
  cobora: boolean;
  motiv?: string;
}

/**
 * Ultima perioadă ÎNCHEIATĂ de tipul cerut, la sau înaintea ancorei. O perioadă care nu
 * s-a terminat încă nu se compară cu una întreagă — ar arăta o „scădere" care e doar
 * lipsa zilelor rămase.
 */
export function ancoreaza(ancora: string, tip: FCPeriodType, azi: string = AZI_ISO()): Ancorare {
  const start = ancora < azi ? ancora : minusZile(azi, 1);
  let per = perioadaDin(start, tip);
  if (per.la < azi) {
    return { perioada: per, cobora: start !== ancora };
  }
  per = perioadaAnterioara(per);
  return {
    perioada: per,
    cobora: true,
    motiv: `Perioada care conține ${ancora} nu s-a încheiat încă — tabloul arată ${per.cheie}, `
      + 'ultima perioadă întreagă. O perioadă neîncheiată comparată cu una întreagă ar arăta o scădere care nu există.',
  };
}

// ————————————————————————————————————————————————————————— descompunerea exactă a ΔFC

/**
 * De ce s-a mișcat FC-ul: pentru că s-a mișcat costul, sau pentru că s-au mișcat vânzările.
 *
 *   ΔFC = cost_c/net_c − cost_p/net_p
 *       = Δcost/net_c  −  cost_p × Δnet / (net_c × net_p)
 *         └ efectCost ┘    └────── efectVanzari ──────┘
 *
 * Identitate algebrică: cei doi termeni se adună EXACT la ΔFC. Nu e o atribuire aleasă
 * de noi, e rescrierea diferenței — de asta poate fi verificată numeric în teste.
 */
export interface DescompunereFC {
  fcCurentPct: number;
  fcPrecedentPct: number;
  deltaFcPp: number;
  /** Cât din ΔFC vine din mișcarea costului, la vânzările perioadei curente. */
  efectCostPp: number;
  /** Cât din ΔFC vine din mișcarea vânzărilor (numitorul), la costul perioadei precedente. */
  efectVanzariPp: number;
  costCurentRON: number;
  costPrecedentRON: number;
  deltaCostRON: number;
  netCurentRON: number;
  netPrecedentRON: number;
  deltaNetRON: number;
  /** Ce a apăsat mai tare: costul sau vânzările. Egalitatea perfectă rămâne 'AMBELE'. */
  dominanta: 'COST' | 'VANZARI' | 'AMBELE';
}

export function descompuneFC(
  costCurent: number, netCurent: number, costPrecedent: number, netPrecedent: number,
): DescompunereFC | null {
  if (!(netCurent > 0) || !(netPrecedent > 0)) return null;
  const fcC = (costCurent / netCurent) * 100;
  const fcP = (costPrecedent / netPrecedent) * 100;
  const dCost = costCurent - costPrecedent;
  const dNet = netCurent - netPrecedent;
  const efectCostPp = (dCost / netCurent) * 100;
  const efectVanzariPp = (-costPrecedent * dNet / (netCurent * netPrecedent)) * 100;
  const aC = Math.abs(efectCostPp), aV = Math.abs(efectVanzariPp);
  return {
    fcCurentPct: fcC, fcPrecedentPct: fcP, deltaFcPp: fcC - fcP,
    efectCostPp, efectVanzariPp,
    costCurentRON: costCurent, costPrecedentRON: costPrecedent, deltaCostRON: dCost,
    netCurentRON: netCurent, netPrecedentRON: netPrecedent, deltaNetRON: dNet,
    dominanta: aC === aV ? 'AMBELE' : aC > aV ? 'COST' : 'VANZARI',
  };
}

// ————————————————————————————————————————————————————————— mișcarea unui ingredient

export type Directie = 'CRESTERE' | 'SCADERE' | 'NESCHIMBAT';

const directie = (d: number | null): Directie =>
  d === null || d === 0 ? 'NESCHIMBAT' : d > 0 ? 'CRESTERE' : 'SCADERE';

export interface MiscarePret {
  ingredient: string;
  denumire: string;
  categorie: string;

  pretCurent: number | null;
  pretPrecedent: number | null;
  deltaPretLei: number | null;
  deltaPretPct: number | null;
  directiePret: Directie;
  /** Prețul folosit pentru una dintre perioade nu era în vigoare atunci (retro-umplut). */
  pretEstimat: boolean;

  consumCurent: number;
  consumPrecedent: number;
  deltaConsumPct: number | null;

  costCurentRON: number | null;
  costPrecedentRON: number | null;
  deltaCostRON: number | null;

  /** Δcost = efectPret + efectConsum + efectIncrucisat — identitate exactă, termeni numiți. */
  efectPretRON: number | null;
  efectConsumRON: number | null;
  efectIncrucisatRON: number | null;
  /** Din efectul de consum: cât vine din rețetă (gramaj) și cât din mix (volume vândute). */
  efectRetetaRON: number | null;
  efectMixRON: number | null;

  /** Contribuția ingredientului la ΔFC, în puncte procentuale pe vânzările scopului. */
  fcImpactPp: number | null;
  /** Rândul canonic din Ingredient Intelligence, pentru drill-down fără recalcul. */
  rand: RandIngredient;
}

function miscareDin(r: RandIngredient): MiscarePret {
  const e = r.efecte;
  return {
    ingredient: r.ingredient, denumire: r.denumire, categorie: r.categorie,
    pretCurent: r.pretCurent, pretPrecedent: r.pretPrecedent,
    deltaPretLei: r.deltaPretLei, deltaPretPct: r.deltaPretPct,
    directiePret: directie(r.deltaPretLei),
    pretEstimat: r.pretPrecedentEstimat || r.pretCurentEstimat,
    consumCurent: r.consumCurent, consumPrecedent: r.consumPrecedent,
    deltaConsumPct: r.deltaConsumPct,
    costCurentRON: r.costCurent, costPrecedentRON: r.costPrecedent, deltaCostRON: r.deltaCostLei,
    efectPretRON: e ? e.pret : null,
    efectConsumRON: e ? e.consum : null,
    efectIncrucisatRON: e ? e.interactiunePret : null,
    efectRetetaRON: e ? e.reteta : null,
    efectMixRON: e ? e.pmix : null,
    fcImpactPp: r.fcImpactPp,
    rand: r,
  };
}

// ————————————————————————————————————————————————————————— reconcilierea celor două vederi

/**
 * Suma mișcărilor pe ingrediente NU este Δcostul din rețete, și nu se pretinde că este.
 * Ingredientele se evaluează la prețul de la finele fiecărei perioade (convenția care face
 * descompunerea preț/consum exactă); costarea folosește prețul de la DATA fiecărei vânzări
 * (invariantul costului istoric). Când prețurile se mișcă în interiorul perioadei, cele două
 * dau cifre diferite — corect amândouă, pe convenții diferite.
 *
 * Aici se calculează diferența și se numesc cauzele ei. Un gol nenumit ar fi o eroare
 * ascunsă; unul numit e o limită cunoscută.
 */
export interface ReconciliereVariatii {
  /** Σ Δcost pe ingredientele care au preț în ambele perioade. */
  sumaIngredienteRON: number;
  /** Δcostul din rețete, din comparația canonică. */
  deltaCostReteteRON: number | null;
  diferentaRON: number | null;
  /** |diferență| ÷ |Δcost rețete| × 100 — cât de mare e golul față de cifra explicată. */
  diferentaPct: number | null;
  /** Ingrediente lăsate în afara sumei pentru că le lipsește prețul într-o perioadă. */
  ingredienteFaraPret: string[];
  motive: string[];
}

function reconciliaza(a: AnalizaIngrediente, cmp: ComparatieFC): ReconciliereVariatii {
  let suma = 0;
  const faraPret: string[] = [];
  for (const r of a.randuri) {
    if (r.deltaCostLei === null) faraPret.push(r.ingredient);
    else suma += r.deltaCostLei;
  }
  const dRetete = cmp.recipeCost.deltaRON;
  const dif = dRetete !== null ? suma - dRetete : null;
  const motive: string[] = [];
  if (dif !== null && Math.abs(dif) > 0.005) {
    motive.push('Ingredientele sunt evaluate la prețul de la finele fiecărei perioade, iar costarea '
      + 'folosește prețul de la data fiecărei vânzări — diferența e convenția, nu o eroare de calcul.');
  }
  if (faraPret.length) {
    motive.push(`${faraPret.length} ingrediente nu au preț valid în ambele perioade — costul lor e `
      + 'necunoscut, nu zero, și nu intră în sumă.');
  }
  if (a.calitate.retetaRetroumpluta.length) {
    motive.push(`${a.calitate.retetaRetroumpluta.length} rețete au prima versiune ulterioară unor vânzări — `
      + 'consumul lor e retro-umplut, nu măsurat.');
  }
  return {
    sumaIngredienteRON: suma,
    deltaCostReteteRON: dRetete,
    diferentaRON: dif,
    diferentaPct: dif !== null && dRetete !== null && dRetete !== 0 ? Math.abs(dif / dRetete) * 100 : null,
    ingredienteFaraPret: faraPret.sort(),
    motive,
  };
}

// ————————————————————————————————————————————————————————— semnalele

export type FelSemnal =
  | 'FC_CRESTERE' | 'FC_SCADERE' | 'COST_CRESTERE' | 'COST_SCADERE'
  | 'VANZARI_SCADERE' | 'PRET_CRESTERE' | 'DATE_INCOMPLETE';

export type Severitate = 'INFO' | 'ATENTIE' | 'ALERTA';

export interface SemnalVariatie {
  fel: FelSemnal;
  severitate: Severitate;
  titlu: string;
  detaliu: string;
  /** Cifra pe care stă semnalul, cu unitatea ei — ca să nu se confunde pp cu %. */
  valoare: number | null;
  unitate: 'pp' | '%' | 'lei' | null;
}

function semnale(
  d: DescompunereFC | null, miscari: MiscarePret[], p: PraguriVariatii, motiveIncomplet: string[],
): SemnalVariatie[] {
  const rez: SemnalVariatie[] = [];
  if (d) {
    if (d.deltaFcPp >= p.fcSemnificativPp) {
      rez.push({
        fel: 'FC_CRESTERE',
        severitate: d.deltaFcPp >= p.fcSemnificativPp * 3 ? 'ALERTA' : 'ATENTIE',
        titlu: `Food Cost în creștere cu ${d.deltaFcPp.toFixed(2)} pp`,
        detaliu: `De la ${d.fcPrecedentPct.toFixed(2)}% la ${d.fcCurentPct.toFixed(2)}%. `
          + `Din creștere, ${d.efectCostPp.toFixed(2)} pp vin din cost și ${d.efectVanzariPp.toFixed(2)} pp din vânzări.`,
        valoare: d.deltaFcPp, unitate: 'pp',
      });
    } else if (d.deltaFcPp <= -p.fcSemnificativPp) {
      rez.push({
        fel: 'FC_SCADERE', severitate: 'INFO',
        titlu: `Food Cost în scădere cu ${Math.abs(d.deltaFcPp).toFixed(2)} pp`,
        detaliu: `De la ${d.fcPrecedentPct.toFixed(2)}% la ${d.fcCurentPct.toFixed(2)}%.`,
        valoare: d.deltaFcPp, unitate: 'pp',
      });
    }
    if (d.deltaCostRON >= p.costSemnificativLei) {
      rez.push({
        fel: 'COST_CRESTERE', severitate: 'ATENTIE',
        titlu: `Costul din rețete a crescut cu ${Math.round(d.deltaCostRON)} lei`,
        detaliu: `De la ${Math.round(d.costPrecedentRON)} la ${Math.round(d.costCurentRON)} lei.`,
        valoare: d.deltaCostRON, unitate: 'lei',
      });
    } else if (d.deltaCostRON <= -p.costSemnificativLei) {
      rez.push({
        fel: 'COST_SCADERE', severitate: 'INFO',
        titlu: `Costul din rețete a scăzut cu ${Math.round(Math.abs(d.deltaCostRON))} lei`,
        detaliu: `De la ${Math.round(d.costPrecedentRON)} la ${Math.round(d.costCurentRON)} lei.`,
        valoare: d.deltaCostRON, unitate: 'lei',
      });
    }
    const scadereNet = d.netPrecedentRON > 0 ? (d.deltaNetRON / d.netPrecedentRON) * 100 : null;
    if (scadereNet !== null && scadereNet <= -p.vanzariScadereSemnificativaPct && d.efectVanzariPp > 0) {
      rez.push({
        fel: 'VANZARI_SCADERE', severitate: 'ATENTIE',
        titlu: `Vânzările au scăzut cu ${Math.abs(scadereNet).toFixed(1)}%`,
        detaliu: `FC-ul urcă cu ${d.efectVanzariPp.toFixed(2)} pp doar din numitor — costul pe porție `
          + 'nu s-a schimbat neapărat.',
        valoare: scadereNet, unitate: '%',
      });
    }
  }
  for (const m of miscari) {
    if (m.deltaPretPct !== null && m.deltaPretPct >= p.pretSemnificativPct) {
      rez.push({
        fel: 'PRET_CRESTERE',
        severitate: m.fcImpactPp !== null && m.fcImpactPp >= p.fcSemnificativPp ? 'ALERTA' : 'ATENTIE',
        titlu: `${m.denumire}: preț +${m.deltaPretPct.toFixed(1)}%`,
        detaliu: `De la ${m.pretPrecedent?.toFixed(2) ?? '—'} la ${m.pretCurent?.toFixed(2) ?? '—'} lei/UM`
          + `${m.efectPretRON !== null ? `, ${Math.round(m.efectPretRON)} lei pe perioadă` : ''}`
          + `${m.pretEstimat ? '. Prețul unei perioade e retro-umplut, nu cunoscut atunci.' : '.'}`,
        valoare: m.deltaPretPct, unitate: '%',
      });
    }
  }
  if (motiveIncomplet.length) {
    rez.push({
      fel: 'DATE_INCOMPLETE', severitate: 'ATENTIE',
      titlu: 'Cifrele perioadei sunt incomplete',
      detaliu: motiveIncomplet.join(' '),
      valoare: null, unitate: null,
    });
  }
  return rez;
}

// ————————————————————————————————————————————————————————— o cadență

export interface CadentaVariatii {
  cadenta: Cadenta;
  eticheta: string;
  perioada: FCPeriod;
  perioadaPrecedenta: FCPeriod | null;
  /** Ancora a fost coborâtă la ultima perioadă încheiată. */
  ancoraCoborata: boolean;
  motivAncora?: string;

  disponibil: boolean;
  motivIndisponibil?: string;

  metrici: MetriciFC | null;
  comparatie: ComparatieFC | null;
  descompunere: DescompunereFC | null;
  miscari: MiscarePret[];
  /** Câte mișcări existau înainte de tăierea la pragul de afișare. */
  miscariTotale: number;
  reconciliere: ReconciliereVariatii | null;
  serie: PunctTimeline[];
  semnale: SemnalVariatie[];

  /** Partea de 2.9 — pe săptămâni e indisponibilă prin construcție, nu prin lipsă de date. */
  nboDisponibil: boolean;
  motivNbo?: string;

  complete: boolean;
  motiveIncomplet: string[];
  surse: SursaFC[];
}

const TIP: Record<Cadenta, FCPeriodType> = { SAPTAMANA: 'SAPTAMANA', LUNA: 'LUNA' };
const CMP: Record<Cadenta, TipComparatie> = {
  SAPTAMANA: 'SAPTAMANA_PRECEDENTA', LUNA: 'LUNA_PRECEDENTA',
};

function cadenta(
  state: AppState, ctx: CtxVariatii, cerere: CerereVariatii, c: Cadenta,
  praguri: PraguriVariatii, praguriIng: PraguriIngrediente, azi: string,
): CadentaVariatii {
  const anc = ancoreaza(cerere.ancora, TIP[c], azi);
  const per = anc.perioada;
  const baza = {
    cadenta: c, eticheta: ETICHETA_CADENTA[c],
    perioada: per,
    ancoraCoborata: anc.cobora,
    ...(anc.motiv !== undefined ? { motivAncora: anc.motiv } : {}),
  };
  const gol = (motiv: string): CadentaVariatii => ({
    ...baza, perioadaPrecedenta: null,
    disponibil: false, motivIndisponibil: motiv,
    metrici: null, comparatie: null, descompunere: null,
    miscari: [], miscariTotale: 0, reconciliere: null, serie: [], semnale: [],
    nboDisponibil: false,
    complete: false, motiveIncomplet: [motiv], surse: [],
  });

  const cerereFC = { perioada: per, nivel: cerere.nivel, canal: cerere.canal };
  const m = metriciFC(state, ctx, cerereFC);
  if (!(m.salesRON > 0)) {
    return gol(`Nu există vânzări pe ${per.cheie} în scopul cerut — nu e nimic de comparat.`);
  }
  const cmp = comparaFC(state, ctx, { ...cerereFC, comparatie: 'PERIOADA_PRECEDENTA' });

  // seria din spate — aceleași metrici, perioadele anterioare
  const primaSerie = (() => {
    let p = per;
    for (let i = 1; i < Math.max(1, praguri.puncteSerie); i++) p = perioadaAnterioara(p);
    return p.de;
  })();
  const serie = serieTimeline(state, ctx, {
    de: primaSerie, la: per.la, granularitate: TIP[c], nivel: cerere.nivel, canal: cerere.canal,
  });

  // Mișcările pe ingrediente. Cerința de perioadă întreagă NU se rescrie aici:
  // `analizaIngrediente` o verifică deja și refuză cu motiv, iar motivul e preluat mai jos.
  let miscari: MiscarePret[] = [];
  let miscariTotale = 0;
  let reconciliere: ReconciliereVariatii | null = null;
  const motiveIncomplet: string[] = [];
  const a = analizaIngrediente(state, ctx, { ...cerereFC, comparatie: CMP[c] }, praguriIng);
  if (!a.disponibil) {
    motiveIncomplet.push(a.motivIndisponibil ?? 'Analiza pe ingrediente nu e disponibilă.');
  } else if (cmp.perioadaPrecedenta && a.perioadaPrecedenta
    && cmp.perioadaPrecedenta.cheie !== a.perioadaPrecedenta.cheie) {
    // aceeași perioadă de comparație în ambele motoare — altfel cifrele nu se pot pune alături
    motiveIncomplet.push(`Comparația de FC merge pe ${cmp.perioadaPrecedenta.cheie}, cea de ingrediente pe `
      + `${a.perioadaPrecedenta.cheie} — cifrele nu se pun alături.`);
  } else {
    const toate = a.randuri.map(miscareDin);
    miscariTotale = toate.length;
    miscari = toate.slice(0, Math.max(0, praguri.miscariRetinute));
    reconciliere = reconciliaza(a, cmp);
    motiveIncomplet.push(...a.motiveIncomplet);
  }

  const d = cmp.disponibil && cmp.precedent
    ? descompuneFC(m.recipeCostRON, m.salesRON, cmp.precedent.recipeCostRON, cmp.precedent.salesRON)
    : null;
  if (!cmp.disponibil && cmp.motivIndisponibil) motiveIncomplet.push(cmp.motivIndisponibil);
  if (m.acoperirePct !== null && m.acoperirePct < 100) {
    motiveIncomplet.push(`Doar ${m.acoperirePct.toFixed(1)}% din vânzări au rețetă calculabilă — `
      + 'restul nu e presupus zero.');
  }
  if (!m.nboDisponibil && m.motivNbo) motiveIncomplet.push(m.motivNbo);

  // apărare, nu invariant demonstrat: azi niciun drum nu produce două motive identice
  const unice = [...new Set(motiveIncomplet)];
  return {
    ...baza,
    perioadaPrecedenta: cmp.perioadaPrecedenta,
    disponibil: true,
    metrici: m, comparatie: cmp, descompunere: d,
    miscari, miscariTotale, reconciliere, serie,
    semnale: semnale(d, miscari, praguri, unice),
    nboDisponibil: m.nboDisponibil,
    ...(m.motivNbo !== undefined ? { motivNbo: m.motivNbo } : {}),
    complete: unice.length === 0,
    motiveIncomplet: unice,
    surse: serie.flatMap(p => p.surse),
  };
}

// ————————————————————————————————————————————————————————— tabloul

export type CtxVariatii = Parameters<typeof metriciFC>[1];

export interface TabloulVariatii {
  cerere: CerereVariatii;
  cadente: CadentaVariatii[];
  /** Toate semnalele, cele mai grave întâi, cu cadența din care vin. */
  semnale: (SemnalVariatie & { cadenta: Cadenta })[];
  complete: boolean;
}

const RANG: Record<Severitate, number> = { ALERTA: 0, ATENTIE: 1, INFO: 2 };

/**
 * Tabloul complet: săptămâna încheiată și luna încheiată, fiecare cu cifrele ei, cu
 * descompunerea ΔFC și cu ingredientele care au mișcat costul.
 */
export function tablouVariatii(
  state: AppState, ctx: CtxVariatii, cerere: CerereVariatii,
  praguri: PraguriVariatii = PRAGURI_VARIATII,
  praguriIng: PraguriIngrediente = PRAGURI_IMPLICITE,
  azi: string = AZI_ISO(),
): TabloulVariatii {
  const cerute = cerere.cadente?.length ? cerere.cadente : (['SAPTAMANA', 'LUNA'] as Cadenta[]);
  const cadente = cerute.map(c => cadenta(state, ctx, cerere, c, praguri, praguriIng, azi));
  const semnale = cadente
    .flatMap(cd => cd.semnale.map(s => ({ ...s, cadenta: cd.cadenta })))
    .sort((a, b) => RANG[a.severitate] - RANG[b.severitate]
      || Math.abs(b.valoare ?? 0) - Math.abs(a.valoare ?? 0)
      || a.titlu.localeCompare(b.titlu));
  return { cerere, cadente, semnale, complete: cadente.every(c => c.complete) };
}

/** Rezumat într-o linie, pentru jurnale. */
export const descrieVariatii = (t: TabloulVariatii) =>
  t.cadente.map(c => c.disponibil && c.descompunere
    ? `${c.perioada.cheie}: FC ${c.descompunere.fcCurentPct.toFixed(1)}% `
      + `(${c.descompunere.deltaFcPp >= 0 ? '+' : ''}${c.descompunere.deltaFcPp.toFixed(2)} pp)`
    : `${c.perioada.cheie}: indisponibil`).join(' · ');
