/**
 * FC Control Tower — stratul de model al interfeței.
 *
 * Aici NU se calculează Food Cost. Fiecare cifră vine din motoarele deja validate
 * (`fc-timeline`, `fc-bridge`, `fc-ingrediente`, `fc-simulare`, `import-center`);
 * modulul acesta doar le compune într-o formă pe care ecranele o pot desena:
 * selecția globală, navigarea, grupurile punții, drill-down-ul, tabelele, panourile,
 * semnalele de calitate și drepturile de vizualizare.
 *
 * Regula de aur a proiectului rămâne: `views/` nu conține nicio formulă de business.
 * De aceea tot ce ar fi „logică de ecran" stă aici, pur, testabil din Node.
 */
import type { AppState, Tinta } from './types';
import { AZI_ISO } from './engine';
import {
  canalePentru, etichetaCanal, locatieDin, perioadaDin, restaurant, COMPANIE,
  type CerereFC, type FCChannel, type FCLevel, type FCPeriod, type FCPeriodType,
} from './fc-domeniu';
import {
  ETICHETA_COMPONENTA_BRIDGE, type ComponentaBridge, type ComponentaBridgeRand, type FCBridge,
} from './fc-bridge';
import {
  perioadaComparatie,
  type AnalizaTimeline, type CerereTimeline, type CriteriuClasament, type MetriciFC,
  type RandCategorieTL, type RandProdusTL, type TipComparatieTL,
} from './fc-timeline';
import type {
  AnalizaIngrediente, CalitateDate, RandIngredient, TipComparatie,
} from './fc-ingrediente';
import type { SimulareFC, ScenariuFC, IdEfect } from './fc-simulare';
import { ETICHETA_SURSA, type RezultatCentral } from './import-center';
import { areDateDemo } from './reconciliere';

// ————————————————————————————————————————————————————————— navigarea

export type IdSectiune =
  | 'OVERVIEW' | 'ANALIZA_FC' | 'NBO29' | 'PMIX47' | 'RECONCILIERE'
  | 'INGREDIENTE' | 'SIMULARI' | 'IMPORTURI' | 'AI_ADVISOR' | 'SETARI';

export interface Sectiune {
  id: IdSectiune;
  nume: string;
  descriere: string;
  /** Secțiunea are sens doar cu vedere pe toată rețeaua. */
  doarCompanie: boolean;
  /** Secțiunea scrie în date — un manager de restaurant nu o primește. */
  scrie: boolean;
  /** Încă nu are motor în spate; e doar destinație de navigare. */
  placeholder: boolean;
}

export const SECTIUNI: Sectiune[] = [
  { id: 'OVERVIEW', nume: 'Overview', descriere: 'KPI-urile perioadei, puntea FC și restaurantele', doarCompanie: false, scrie: false, placeholder: false },
  { id: 'ANALIZA_FC', nume: 'Analiză FC', descriere: 'Evoluția în timp, defalcări și clasamente', doarCompanie: false, scrie: false, placeholder: false },
  { id: 'NBO29', nume: 'NBO 2.9', descriere: 'Consumul raportat, pe material și categorie', doarCompanie: false, scrie: false, placeholder: false },
  { id: 'PMIX47', nume: 'PMIX 4.7', descriere: 'Vânzările pe produs care stau sub FC-ul teoretic', doarCompanie: false, scrie: false, placeholder: false },
  { id: 'RECONCILIERE', nume: 'Reconciliere', descriere: 'Ce explică puntea și ce rămâne neexplicat', doarCompanie: false, scrie: false, placeholder: false },
  { id: 'INGREDIENTE', nume: 'Ingredient Intelligence', descriere: 'Cine a mișcat FC-ul: preț, consum, rețetă, mix', doarCompanie: false, scrie: false, placeholder: false },
  { id: 'SIMULARI', nume: 'Simulări', descriere: 'What-if pe prețuri, rețete și mix — fără să atingă datele reale', doarCompanie: false, scrie: false, placeholder: false },
  { id: 'IMPORTURI', nume: 'Importuri', descriere: 'Import Center: validare înainte de activare, versiuni și audit', doarCompanie: false, scrie: true, placeholder: false },
  { id: 'AI_ADVISOR', nume: 'AI Advisor', descriere: 'Rezervat — motorul de raționament nu e încă implementat', doarCompanie: false, scrie: false, placeholder: true },
  { id: 'SETARI', nume: 'Setări', descriere: 'Ținte, praguri și contextul de lucru', doarCompanie: false, scrie: true, placeholder: false },
];

export const sectiuneDupaId = (id: IdSectiune): Sectiune =>
  SECTIUNI.find(s => s.id === id) ?? SECTIUNI[0];

// ————————————————————————————————————————————————————————— rolurile și accesul

/**
 * Rolurile de produs. Ele se DERIVĂ din rolul serverului, nu se declară în interfață:
 * MANAGER (cu restaurant) → STORE_MANAGER, ADMIN/ANALIST → TOP_MANAGEMENT.
 */
export type RolTower = 'STORE_MANAGER' | 'TOP_MANAGEMENT';

export interface UtilizatorTower { rol: string; locatie?: string | null; nume?: string | null }

export interface AccesTower {
  rol: RolTower;
  /** Rolul brut din care s-a derivat (ADMIN / ANALIST / MANAGER / LOCAL). */
  rolSursa: string;
  /** Restaurantul din care nu poate ieși; `null` pentru management. */
  locatieImpusa: string | null;
  poateVedeaCompania: boolean;
  poateScrie: boolean;
  locatiiVizibile: string[];
  /**
   * `true` doar când serverul a filtrat datele ÎNAINTE să ajungă aici. Ascunderea din
   * interfață NU e o măsură de securitate și nu se raportează ca atare.
   */
  enforcatPeServer: boolean;
  avertismentEnforcement: string | null;
  sectiuni: IdSectiune[];
}

const AVERTISMENT_LOCAL =
  'Aplicația rulează fără server: datele sunt locale și integrale, iar rolul e doar o preferință de afișare. '
  + 'Restricția reală pe restaurant există numai când ești autentificat pe serverul comun, care filtrează datele înainte de a le trimite.';

const AVERTISMENT_NEFILTRAT =
  'Ești autentificat ca manager, dar serverul nu a marcat starea ca filtrată — interfața limitează vederea, '
  + 'însă limitarea nu e garantată de server. Tratează-o ca pe o comoditate, nu ca pe o măsură de securitate.';

/**
 * Ce vede utilizatorul curent. `filtratDeServer` vine din răspunsul serverului
 * (`serverStare.filtrat`), nu dintr-o presupunere a interfeței.
 */
export function accesTower(
  state: AppState,
  utilizator: UtilizatorTower | null,
  filtratDeServer: boolean,
): AccesTower {
  const toate = state.locatii.map(l => l.cod).sort();
  const rolSursa = utilizator?.rol ?? 'LOCAL';
  const eManager = rolSursa === 'MANAGER' && !!utilizator?.locatie;

  if (eManager) {
    const loc = utilizator!.locatie!;
    return {
      rol: 'STORE_MANAGER', rolSursa, locatieImpusa: loc,
      poateVedeaCompania: false, poateScrie: false,
      locatiiVizibile: toate.includes(loc) ? [loc] : [loc],
      enforcatPeServer: filtratDeServer,
      avertismentEnforcement: filtratDeServer ? null : AVERTISMENT_NEFILTRAT,
      sectiuni: SECTIUNI.filter(s => !s.doarCompanie && !s.scrie).map(s => s.id),
    };
  }
  return {
    rol: 'TOP_MANAGEMENT', rolSursa, locatieImpusa: null,
    poateVedeaCompania: true, poateScrie: true,
    locatiiVizibile: toate,
    enforcatPeServer: utilizator !== null,
    avertismentEnforcement: utilizator === null ? AVERTISMENT_LOCAL : null,
    sectiuni: SECTIUNI.map(s => s.id),
  };
}

export const poateVedeaLocatia = (a: AccesTower, locatie: string): boolean =>
  a.locatieImpusa === null || a.locatieImpusa === locatie;

export const poateVedeaSectiunea = (a: AccesTower, id: IdSectiune): boolean =>
  a.sectiuni.includes(id);

// ————————————————————————————————————————————————————————— selecția globală

export type GranularitateTower = Extract<FCPeriodType, 'SAPTAMANA' | 'LUNA'>;

/** Bara de control: perioadă × granularitate × comparație × scop × restaurant × canal. */
export interface SelectieFC {
  /** O zi din perioada selectată — perioada se derivă din ea, nu se stochează separat. */
  ancora: string;
  granularitate: GranularitateTower;
  comparatie: TipComparatieTL;
  scop: 'COMPANIE' | 'RESTAURANT';
  locatie: string | null;
  canal: FCChannel;
}

export const perioadaDinSelectie = (sel: SelectieFC): FCPeriod =>
  perioadaDin(sel.ancora, sel.granularitate);

export const nivelDin = (sel: SelectieFC): FCLevel =>
  sel.scop === 'RESTAURANT' && sel.locatie ? restaurant(sel.locatie) : COMPANIE;

/** Cererea canonică pe care o consumă toate motoarele — o singură traducere, în tot dashboardul. */
export const cerereDin = (sel: SelectieFC): CerereTimeline => ({
  perioada: perioadaDinSelectie(sel),
  nivel: nivelDin(sel),
  canal: sel.canal,
  comparatie: sel.comparatie,
});

/** Traducerea comparației de timeline în vocabularul motorului de ingrediente. */
export const comparatieIngrediente = (sel: SelectieFC): TipComparatie =>
  sel.comparatie === 'ACEEASI_PERIOADA_AN_PRECEDENT' ? 'LUNA_AN_PRECEDENT'
    : sel.granularitate === 'SAPTAMANA' ? 'SAPTAMANA_PRECEDENTA' : 'LUNA_PRECEDENTA';

/** Perioadele care CHIAR au vânzări — lista nu se completează cu perioade inventate. */
export function perioadeDisponibile(state: AppState, granularitate: GranularitateTower, acces?: AccesTower): FCPeriod[] {
  const loc = acces?.locatieImpusa ?? null;
  const chei = new Map<string, FCPeriod>();
  for (const v of state.vanzari) {
    if (loc && v.locatie !== loc) continue;
    const p = perioadaDin(v.data, granularitate);
    if (!chei.has(p.cheie)) chei.set(p.cheie, p);
  }
  return [...chei.values()].sort((a, b) => b.de.localeCompare(a.de));
}

export interface OptiuneComparatie {
  tip: TipComparatieTL;
  eticheta: string;
  disponibil: boolean;
  motiv?: string;
}

/** Ce comparații sunt posibile pe selecția curentă — motorul decide, nu interfața. */
export function comparatiiDisponibile(state: AppState, sel: SelectieFC): OptiuneComparatie[] {
  const per = perioadaDinSelectie(sel);
  const loc = sel.scop === 'RESTAURANT' ? sel.locatie : null;
  const canale = canalePentru(sel.canal);
  const areVanzari = (p: FCPeriod) => state.vanzari.some(v =>
    v.data >= p.de && v.data <= p.la && (!loc || v.locatie === loc) && canale.includes(v.canal));

  return ([
    ['PERIOADA_PRECEDENTA', sel.granularitate === 'SAPTAMANA' ? 'Săptămâna precedentă' : 'Luna precedentă'],
    ['ACEEASI_PERIOADA_AN_PRECEDENT', 'Aceeași lună, anul trecut'],
  ] as [TipComparatieTL, string][]).map(([tip, eticheta]) => {
    const { perioada, motiv } = perioadaComparatie(per, tip);
    if (!perioada) return { tip, eticheta, disponibil: false, motiv: motiv ?? 'Comparație imposibilă pe perioada selectată.' };
    if (!areVanzari(perioada)) {
      return { tip, eticheta, disponibil: false, motiv: `Nu există vânzări pe ${perioada.cheie} în scopul selectat — perioada nu se fabrică.` };
    }
    return { tip, eticheta, disponibil: true };
  });
}

/**
 * Selecția implicită: cea mai recentă perioadă cu date, în scopul permis de rol.
 * Fără date, ancora rămâne ziua curentă și ecranele o declară goală — nu inventează o lună.
 */
export function selectieImplicita(state: AppState, acces: AccesTower): SelectieFC {
  const granularitate: GranularitateTower = 'LUNA';
  const per = perioadeDisponibile(state, granularitate, acces)[0];
  const baza: SelectieFC = {
    ancora: per?.de ?? AZI_ISO(),
    granularitate,
    comparatie: 'PERIOADA_PRECEDENTA',
    scop: acces.locatieImpusa ? 'RESTAURANT' : 'COMPANIE',
    locatie: acces.locatieImpusa,
    canal: 'TOTAL',
  };
  return normalizeazaSelectie(state, baza, acces);
}

/**
 * Ține selecția validă și în drepturi: un manager nu poate ajunge pe „Companie" sau pe alt
 * restaurant nici prin stare veche, nici prin schimbarea unui singur câmp.
 */
export function normalizeazaSelectie(state: AppState, sel: SelectieFC, acces: AccesTower): SelectieFC {
  const rez: SelectieFC = { ...sel };

  if (acces.locatieImpusa) {
    rez.scop = 'RESTAURANT';
    rez.locatie = acces.locatieImpusa;
  } else if (rez.scop === 'RESTAURANT') {
    const coduri = new Set(state.locatii.map(l => l.cod));
    if (!rez.locatie || !coduri.has(rez.locatie)) {
      const prima = [...coduri].sort()[0];
      if (prima) rez.locatie = prima; else { rez.scop = 'COMPANIE'; rez.locatie = null; }
    }
  } else {
    rez.locatie = null;
  }

  // comparația imposibilă pe granularitatea curentă cade pe cea precedentă, nu rămâne agățată
  const { perioada } = perioadaComparatie(perioadaDin(rez.ancora, rez.granularitate), rez.comparatie);
  if (!perioada && rez.comparatie === 'ACEEASI_PERIOADA_AN_PRECEDENT') rez.comparatie = 'PERIOADA_PRECEDENTA';

  return rez;
}

/** Descrierea scopului, folosită identic în titluri, export și jurnal. */
export const descrieSelectie = (sel: SelectieFC): string =>
  `${perioadaDinSelectie(sel).cheie} · ${sel.scop === 'COMPANIE' ? 'Companie' : sel.locatie} · ${etichetaCanal(sel.canal)}`;

// ————————————————————————————————————————————————————————— KPI-urile

export type UnitateKpi = 'PCT' | 'RON' | 'PP';
export type TonKpi = 'ok' | 'atentie' | 'rau' | 'neutru';

export interface KpiTower {
  id: string;
  eticheta: string;
  valoare: number | null;
  unitate: UnitateKpi;
  /** Delta în puncte procentuale — DOAR pentru metrici procentuale. */
  deltaPp: number | null;
  /** Delta în lei — DOAR pentru metrici în lei. */
  deltaRON: number | null;
  /** Variația relativă a unei metrici în lei. Niciodată amestecată cu pp. */
  deltaPct: number | null;
  ton: TonKpi;
  /** De ce lipsește cifra, când lipsește. Niciun zero pus în locul unui necunoscut. */
  indisponibilDe: string | null;
  nota?: string;
}

const tonDupaDelta = (delta: number | null, cresteE: 'bine' | 'rau'): TonKpi => {
  if (delta === null || Math.abs(delta) < 1e-9) return 'neutru';
  const bun = cresteE === 'bine' ? delta > 0 : delta < 0;
  return bun ? 'ok' : 'rau';
};

/** Cele șase cifre de titlu ale Overview-ului, cu deltele lor în unitatea corectă. */
export function kpiuri(a: AnalizaTimeline): KpiTower[] {
  const m: MetriciFC | null = a.metrici;
  const c = a.comparatie;
  const motivNbo = m?.motivNbo ?? 'Puntea 2.9 nu e disponibilă pe această cerere.';
  const fara = (cond: boolean, motiv: string) => (cond ? null : motiv);

  return [
    {
      id: 'FC_TEORETIC_NBO', eticheta: 'FC Teoretic NBO',
      valoare: m?.nboTheoreticalFcPct ?? null, unitate: 'PCT',
      deltaPp: null, deltaRON: null, deltaPct: null,
      ton: 'neutru',
      indisponibilDe: fara(!!m && m.nboTheoreticalFcPct !== null,
        m?.nboDisponibil ? 'Raportul 2.9 nu conține costul teoretic — nu se inventează.' : motivNbo),
      nota: 'Teoreticul DECLARAT de 2.9, nu unul recalculat.',
    },
    {
      id: 'FC_ACTUAL_NBO', eticheta: 'FC Actual NBO',
      valoare: m?.nboActualFcPct ?? null, unitate: 'PCT',
      deltaPp: c?.nboActualFc.deltaPp ?? null, deltaRON: null, deltaPct: null,
      ton: tonDupaDelta(c?.nboActualFc.deltaPp ?? null, 'rau'),
      indisponibilDe: fara(!!m?.nboDisponibil, motivNbo),
      nota: 'Partea de Food Cost a consumului real din 2.9.',
    },
    {
      id: 'FC_RETETAR', eticheta: 'FC Rețetar',
      valoare: m?.recipeFcPct ?? null, unitate: 'PCT',
      deltaPp: c?.recipeFc.deltaPp ?? null, deltaRON: null, deltaPct: null,
      ton: tonDupaDelta(c?.recipeFc.deltaPp ?? null, 'rau'),
      indisponibilDe: fara(!!m && m.recipeFcPct !== null, 'Nu există vânzări cu rețetă calculabilă în scop.'),
      nota: 'Costul teoretic din rețetar ÷ vânzările nete.',
    },
    {
      id: 'VARIATIE', eticheta: 'Variație (NBO − Rețetar)',
      valoare: m?.varianceRON ?? null, unitate: 'RON',
      deltaPp: null, deltaRON: c?.variance.deltaRON ?? null, deltaPct: c?.variance.deltaPct ?? null,
      ton: tonDupaDelta(c?.variance.deltaRON ?? null, 'rau'),
      indisponibilDe: fara(!!m && m.varianceRON !== null, motivNbo),
      nota: 'Consumul real de Food Cost minus costul din rețete.',
    },
    {
      id: 'EXPLICAT', eticheta: 'Explicat',
      valoare: m?.explainedPct ?? null, unitate: 'PCT',
      deltaPp: c?.explained.deltaPp ?? null, deltaRON: null, deltaPct: null,
      ton: tonDupaDelta(c?.explained.deltaPp ?? null, 'bine'),
      indisponibilDe: fara(!!m?.nboDisponibil, motivNbo),
      nota: 'Cât din consumul 2.9 are un lanț de dovezi până la rețete sau nomenclator.',
    },
    {
      id: 'NEEXPLICAT', eticheta: 'Neexplicat',
      valoare: m?.unexplainedPct ?? null, unitate: 'PCT',
      deltaPp: c !== null && c.explained.deltaPp !== null ? -c.explained.deltaPp : null,
      deltaRON: null, deltaPct: null,
      ton: tonDupaDelta(c !== null && c.explained.deltaPp !== null ? -c.explained.deltaPp : null, 'rau'),
      indisponibilDe: fara(!!m?.nboDisponibil, motivNbo),
      nota: 'Neexplicat + neclasificat: bani fără dovadă sau fără regulă de clasificare.',
    },
  ];
}

// ————————————————————————————————————————————————————————— puntea, grupată pentru citit

export type GrupBridge =
  | 'FOOD_RETETE' | 'FOOD_FARA_RETETA' | 'PAPER_NORMALIZAT'
  | 'OPERATIONAL' | 'NECLASIFICAT' | 'NEEXPLICAT';

export const ORDINE_GRUPURI: GrupBridge[] = [
  'FOOD_RETETE', 'FOOD_FARA_RETETA', 'PAPER_NORMALIZAT', 'OPERATIONAL', 'NECLASIFICAT', 'NEEXPLICAT',
];

export const ETICHETA_GRUP: Record<GrupBridge, string> = {
  FOOD_RETETE: 'Food din rețete',
  FOOD_FARA_RETETA: 'Food fără rețetă',
  PAPER_NORMALIZAT: 'Paper și normalizate',
  OPERATIONAL: 'Operațional',
  NECLASIFICAT: 'Neclasificat',
  NEEXPLICAT: 'Neexplicat',
};

/** Fiecare componentă a punții aparține exact unui grup — nimic nu se pierde, nimic nu se numără de două ori. */
export const COMPONENTE_GRUP: Record<GrupBridge, ComponentaBridge[]> = {
  FOOD_RETETE: ['RECIPE_FOOD'],
  FOOD_FARA_RETETA: ['NBO_FOOD'],
  PAPER_NORMALIZAT: ['RECIPE_PAPER', 'NBO_PAPER', 'NORMALIZED'],
  OPERATIONAL: ['CLEANING', 'OPERATIONAL', 'UNIFORMS', 'STATIONERY', 'OTHER'],
  NECLASIFICAT: ['UNCLASSIFIED'],
  NEEXPLICAT: ['UNEXPLAINED'],
};

/** Grupurile care intră în Food Cost — restul e consum real, în afara FC. */
export const GRUPURI_IN_FC: GrupBridge[] = ['FOOD_RETETE', 'FOOD_FARA_RETETA', 'PAPER_NORMALIZAT'];

export interface RandGrupBridge {
  grup: GrupBridge;
  eticheta: string;
  lei: number;
  pp: number | null;
  pctDinNbo: number | null;
  nrMateriale: number;
  inFoodCost: boolean;
  /** Componentele motorului care compun grupul — de aici pornește drill-down-ul la material. */
  componente: ComponentaBridgeRand[];
  explicatie: string;
}

export interface PunteTower {
  disponibil: boolean;
  motiv: string | null;
  grupuri: RandGrupBridge[];
  /** Suma grupurilor = tot consumul 2.9. Identitatea motorului, nu una inventată aici. */
  totalLei: number;
  /** Partea care intră în Food Cost. */
  totalFoodCostLei: number;
  /** Teoreticul DECLARAT de 2.9 — ținta punții. `null` când raportul nu îl conține. */
  tintaTeoreticaLei: number | null;
  /** Consum real de FC − teoretic declarat. Se AFIȘEAZĂ, nu se forțează la zero. */
  diferentaFataDeTinta: number | null;
  notaTinta: string;
  confidenta: number | null;
}

const NOTA_TINTA_LIPSA =
  'Raportul 2.9 nu declară un cost teoretic pentru acest scop. Puntea arată din ce se compune consumul real; '
  + 'ținta nu se reconstruiește din alte cifre.';
const NOTA_TINTA =
  'Grupurile însumează consumul real din 2.9. Diferența față de teoreticul declarat se arată ca atare — '
  + 'explicatul și neexplicatul nu se ajustează ca să iasă ținta.';

/** Puntea, pregătită pentru desen: șase grupuri disjuncte, fiecare cu materialele lui. */
export function punteTower(bridge: FCBridge | null): PunteTower {
  if (!bridge || !bridge.nboDisponibil) {
    return {
      disponibil: false,
      motiv: bridge?.motivNbo ?? 'Puntea 2.9 nu e disponibilă pe această cerere.',
      grupuri: [], totalLei: 0, totalFoodCostLei: 0,
      tintaTeoreticaLei: null, diferentaFataDeTinta: null,
      notaTinta: NOTA_TINTA_LIPSA, confidenta: null,
    };
  }
  const dupaComponenta = new Map(bridge.componente.map(c => [c.componenta, c]));
  const grupuri = ORDINE_GRUPURI.map((grup): RandGrupBridge => {
    const componente = COMPONENTE_GRUP[grup]
      .map(c => dupaComponenta.get(c))
      .filter((c): c is ComponentaBridgeRand => c !== undefined);
    const lei = componente.reduce((s, c) => s + c.lei, 0);
    // pp lipsește doar când numitorul e 0; dacă vreo componentă nu îl are, grupul nu îl are
    const pp = componente.length && componente.every(c => c.pp !== null)
      ? componente.reduce((s, c) => s + (c.pp as number), 0) : null;
    const pctDinNbo = bridge.nboActual !== 0 ? (lei / bridge.nboActual) * 100 : null;
    return {
      grup, eticheta: ETICHETA_GRUP[grup], lei, pp, pctDinNbo,
      nrMateriale: componente.reduce((s, c) => s + c.nrMateriale, 0),
      inFoodCost: GRUPURI_IN_FC.includes(grup),
      componente,
      explicatie: componente.map(c => `${ETICHETA_COMPONENTA_BRIDGE[c.componenta]}: ${c.explicatie}`).join(' '),
    };
  });
  const totalLei = grupuri.reduce((s, g) => s + g.lei, 0);
  const totalFoodCostLei = grupuri.filter(g => g.inFoodCost).reduce((s, g) => s + g.lei, 0);
  return {
    disponibil: true, motiv: null, grupuri, totalLei, totalFoodCostLei,
    tintaTeoreticaLei: bridge.nboTheoreticalFC,
    diferentaFataDeTinta: bridge.nboTheoreticalFC !== null ? totalFoodCostLei - bridge.nboTheoreticalFC : null,
    notaTinta: bridge.nboTheoreticalFC !== null ? NOTA_TINTA : NOTA_TINTA_LIPSA,
    confidenta: bridge.confidenceScore,
  };
}

// ————————————————————————————————————————————————————————— drill-down

export type TreaptaDrill = 'COMPANIE' | 'RESTAURANT' | 'CATEGORIE' | 'PRODUS' | 'INGREDIENT';

/** Unde ai ajuns în lanțul Companie → Restaurant → Categorie → Produs → Ingredient. */
export interface CaleDrill {
  locatie?: string;
  categorie?: string;
  produs?: string;
}

export interface NodDrill {
  treapta: TreaptaDrill;
  cheie: string;
  eticheta: string;
  /** Lei pe treapta respectivă. `null` = necunoscut (ex. produs fără rețetă) — niciodată zero de umplutură. */
  lei: number | null;
  pct: number | null;
  nota?: string;
  /** Se mai poate coborî de aici? */
  areCopii: boolean;
}

export interface NivelDrill {
  treapta: TreaptaDrill;
  urmatoarea: TreaptaDrill | null;
  eticheta: string;
  noduri: NodDrill[];
  /** Ce se numără pe treapta asta — clar scris, ca nicio cifră să nu fie fără explicație. */
  baza: string;
  /** De ce nivelul e gol, când e gol dintr-un motiv anume (nu doar „fără rânduri"). */
  motiv?: string;
}

export const treaptaDin = (cale: CaleDrill, sel: SelectieFC): TreaptaDrill => {
  if (cale.produs) return 'PRODUS';
  if (cale.categorie) return 'CATEGORIE';
  if (cale.locatie || sel.scop === 'RESTAURANT') return 'RESTAURANT';
  return 'COMPANIE';
};

const URMATOAREA: Record<TreaptaDrill, TreaptaDrill | null> = {
  COMPANIE: 'RESTAURANT', RESTAURANT: 'CATEGORIE', CATEGORIE: 'PRODUS', PRODUS: 'INGREDIENT', INGREDIENT: null,
};

/** Selecția cu care trebuie rulate motoarele pentru o cale de drill-down. */
export const selectiePentruCale = (sel: SelectieFC, cale: CaleDrill): SelectieFC =>
  cale.locatie ? { ...sel, scop: 'RESTAURANT', locatie: cale.locatie } : sel;

/**
 * Copiii nodului curent. Rândurile vin din `analizaTimeline` (restaurante, categorii, produse)
 * și din `analizaIngrediente` (ingredientele unui produs) — dashboardul nu recalculează nimic.
 */
export function nivelDrill(
  analiza: AnalizaTimeline,
  cale: CaleDrill,
  sel: SelectieFC,
  ingrediente?: AnalizaIngrediente | null,
): NivelDrill {
  const treapta = treaptaDin(cale, sel);
  const urmatoarea = URMATOAREA[treapta];

  if (treapta === 'COMPANIE') {
    const magazine = analiza.magazine ?? [];
    const total = magazine.reduce((s, m) => s + m.metrici.recipeCostRON, 0);
    return {
      treapta, urmatoarea, eticheta: 'Companie',
      baza: 'recipeCostRON pe restaurant — costul din rețete al vânzărilor din perioada și canalul selectate',
      noduri: magazine.map(m => ({
        treapta: 'RESTAURANT' as const, cheie: m.locatie, eticheta: m.locatie,
        lei: m.metrici.recipeCostRON,
        pct: total > 0 ? (m.metrici.recipeCostRON / total) * 100 : null,
        nota: m.metrici.nboDisponibil ? undefined : (m.metrici.motivNbo ?? 'fără date 2.9'),
        areCopii: true,
      })),
    };
  }

  if (treapta === 'RESTAURANT') {
    const total = analiza.categorii.reduce((s, c) => s + c.costRON, 0);
    return {
      treapta, urmatoarea, eticheta: cale.locatie ?? sel.locatie ?? 'Restaurant',
      baza: 'costRON pe categorie de produs — suma costurilor din rețete ale vânzărilor categoriei',
      noduri: analiza.categorii.map((c: RandCategorieTL) => ({
        treapta: 'CATEGORIE' as const, cheie: c.categorie, eticheta: c.categorie,
        lei: c.costRON, pct: total > 0 ? (c.costRON / total) * 100 : null,
        areCopii: true,
      })),
    };
  }

  if (treapta === 'CATEGORIE') {
    const produse = analiza.produse.filter((p: RandProdusTL) => p.categorie === cale.categorie);
    const total = produse.reduce((s, p) => s + (p.costRON ?? 0), 0);
    return {
      treapta, urmatoarea, eticheta: cale.categorie ?? 'Categorie',
      baza: 'costRON pe produs — `null` la produsele fără rețetă, care NU se costează cu zero',
      noduri: produse.map(p => ({
        treapta: 'PRODUS' as const, cheie: p.produs, eticheta: p.denumire,
        lei: p.costRON,
        pct: p.costRON !== null && total > 0 ? (p.costRON / total) * 100 : null,
        nota: p.areReteta ? undefined : 'fără rețetă — costul nu se poate calcula',
        areCopii: p.areReteta,
      })),
    };
  }

  // PRODUS → ingredientele lui, din motorul de ingrediente
  if (!ingrediente || !ingrediente.disponibil) {
    return {
      treapta, urmatoarea, eticheta: cale.produs ?? 'Produs', noduri: [],
      baza: 'costLei al ingredientului ÎN acest produs, din analiza de ingrediente',
      motiv: ingrediente?.motivIndisponibil
        ?? 'Analiza de ingrediente nu e disponibilă pe această perioadă, deci componentele produsului nu se pot cifra.',
    };
  }
  const randuri = (ingrediente.randuri)
    .map(r => ({ r, p: r.produse.find(x => x.produs === cale.produs) }))
    .filter((x): x is { r: RandIngredient; p: NonNullable<typeof x.p> } => x.p !== undefined);
  const total = randuri.reduce((s, x) => s + (x.p.costLei ?? 0), 0);
  return {
    treapta, urmatoarea, eticheta: cale.produs ?? 'Produs',
    baza: 'costLei al ingredientului ÎN acest produs, din analiza de ingrediente (consum datat × prețul perioadei)',
    noduri: randuri
      .sort((a, b) => (b.p.costLei ?? -1) - (a.p.costLei ?? -1))
      .map(x => ({
        treapta: 'INGREDIENT' as const, cheie: x.r.ingredient, eticheta: x.r.denumire,
        lei: x.p.costLei,
        pct: x.p.costLei !== null && total > 0 ? (x.p.costLei / total) * 100 : null,
        nota: x.r.pretCurent === null ? 'fără preț valid — costul nu se presupune zero' : undefined,
        areCopii: false,
      })),
  };
}

// ————————————————————————————————————————————————————————— tabelul de restaurante

export type StatusMagazin = 'OK' | 'ATENTIE' | 'RISC' | 'FARA_DATE';

export interface RandTabelMagazin {
  locatie: string;
  recipeFcPct: number | null;
  nboFcPct: number | null;
  variancePp: number | null;
  varianceRON: number | null;
  foodRON: number;
  paperRON: number;
  normalizedRON: number | null;
  operationalRON: number | null;
  unexplainedRON: number | null;
  /** Δ FC rețetar față de perioada de comparație, în pp. `null` = fără comparație. */
  trendPp: number | null;
  status: StatusMagazin;
  motivStatus: string;
  tinta: number | null;
  confidence: number;
}

const tintaPentru = (tinte: Tinta[], locatie: string): number | null =>
  tinte.find(t => t.locatie === locatie)?.fcCurat
  ?? tinte.find(t => t.locatie === 'RETEA')?.fcCurat
  ?? null;

/** Statusul e o comparație cu ținta declarată în date, nu o apreciere de interfață. */
function statusMagazin(fc: number | null, tinta: number | null): { status: StatusMagazin; motiv: string } {
  if (fc === null) return { status: 'FARA_DATE', motiv: 'Fără vânzări cu rețetă calculabilă în perioada selectată.' };
  if (tinta === null) return { status: 'OK', motiv: 'Nu există țintă de FC definită pentru acest restaurant.' };
  if (fc <= tinta) return { status: 'OK', motiv: `FC ${fc.toFixed(1)}% ≤ ținta ${tinta.toFixed(1)}%.` };
  if (fc <= tinta + 1) return { status: 'ATENTIE', motiv: `FC ${fc.toFixed(1)}% depășește ținta ${tinta.toFixed(1)}% cu cel mult 1 pp.` };
  return { status: 'RISC', motiv: `FC ${fc.toFixed(1)}% depășește ținta ${tinta.toFixed(1)}% cu peste 1 pp.` };
}

export function tabelMagazine(state: AppState, a: AnalizaTimeline): RandTabelMagazin[] {
  return (a.magazine ?? []).map(m => {
    const tinta = tintaPentru(state.tinte, m.locatie);
    const { status, motiv } = statusMagazin(m.metrici.recipeFcPct, tinta);
    return {
      locatie: m.locatie,
      recipeFcPct: m.metrici.recipeFcPct,
      nboFcPct: m.metrici.nboActualFcPct,
      variancePp: m.metrici.variancePp,
      varianceRON: m.metrici.varianceRON,
      foodRON: m.metrici.foodCostRON,
      paperRON: m.metrici.paperCostRON,
      normalizedRON: m.metrici.normalizedRON,
      operationalRON: m.metrici.operationalRON,
      unexplainedRON: m.metrici.unexplainedRON,
      trendPp: m.comparatie.recipeFc.deltaPp,
      status, motivStatus: motiv, tinta,
      confidence: m.metrici.confidence,
    };
  });
}

export interface SortareMagazine {
  criteriu: CriteriuClasament;
  eticheta: string;
  /** Metrica exactă după care s-a ordonat — copiată din clasamentul motorului. */
  baza: string;
  randuri: RandTabelMagazin[];
  /** Restaurante fără metrica respectivă: excluse din ordonare, nu presupuse zero. */
  excluse: RandTabelMagazin[];
}

/**
 * Ordonarea nu se recalculează în interfață: se ia clasamentul deja produs de
 * `analizaTimeline` și se aranjează rândurile după el.
 */
export function sorteazaMagazine(
  randuri: RandTabelMagazin[], a: AnalizaTimeline, criteriu: CriteriuClasament,
): SortareMagazine {
  const clasament = (a.clasamente ?? []).find(c => c.criteriu === criteriu);
  if (!clasament) {
    return { criteriu, eticheta: criteriu, baza: 'clasament indisponibil', randuri, excluse: [] };
  }
  const dupaLocatie = new Map(randuri.map(r => [r.locatie, r]));
  const ordonate = clasament.randuri
    .map(x => dupaLocatie.get(x.locatie))
    .filter((r): r is RandTabelMagazin => r !== undefined);
  const excluse = clasament.excluse
    .map(l => dupaLocatie.get(l))
    .filter((r): r is RandTabelMagazin => r !== undefined);
  return { criteriu, eticheta: clasament.eticheta, baza: clasament.baza, randuri: ordonate, excluse };
}

// ————————————————————————————————————————————————————————— panourile de ingrediente

export type IdPanou = 'DRIVERE_FC' | 'CRESTERI_PRET' | 'IMPACT_COST' | 'DEVIATII_CONSUM' | 'OPORTUNITATI';

export interface RandPanouIngredient {
  ingredient: string;
  denumire: string;
  deltaPretLei: number | null;
  deltaPretPct: number | null;
  impactCostRON: number | null;
  impactFcPp: number | null;
  produseAfectate: string[];
  magazineAfectate: string[];
  confidence: number;
  motiveConfidenta: string[];
  nota: string | null;
}

export interface PanouIngrediente {
  id: IdPanou;
  eticheta: string;
  /** Ce metrică ordonează panoul — scrisă, nu subînțeleasă. */
  baza: string;
  randuri: RandPanouIngredient[];
  /** Ingrediente lăsate afară pentru că metrica lipsește. */
  excluse: string[];
}

const FORMULA_CONFIDENTA =
  '100 − 40 (preț lipsă) − 20 (preț retro-umplut) − 20 (rețetă retro-umplută) − 20 (fără efecte calculabile)';

/** Încredere deterministă pe rând, din semnalele de calitate ale motorului. */
export function confidentaIngredient(r: RandIngredient, calitate: CalitateDate): { scor: number; motive: string[] } {
  const motive: string[] = [];
  let scor = 100;
  if (r.pretCurent === null || r.pretPrecedent === null) { scor -= 40; motive.push('preț lipsă într-una dintre perioade'); }
  if (r.pretPrecedentEstimat || r.pretCurentEstimat) { scor -= 20; motive.push('preț retro-umplut: nu era cunoscut atunci'); }
  if (r.produse.some(p => calitate.retetaRetroumpluta.includes(p.produs))) {
    scor -= 20; motive.push('rețetă retro-umplută pentru o parte din vânzări');
  }
  if (r.efecte === null) { scor -= 20; motive.push('efectele preț/consum nu se pot separa fără preț'); }
  return { scor: Math.max(0, Math.min(100, scor)), motive };
}

const randPanou = (r: RandIngredient, calitate: CalitateDate): RandPanouIngredient => {
  const conf = confidentaIngredient(r, calitate);
  return {
    ingredient: r.ingredient, denumire: r.denumire,
    deltaPretLei: r.deltaPretLei, deltaPretPct: r.deltaPretPct,
    impactCostRON: r.deltaCostLei, impactFcPp: r.fcImpactPp,
    produseAfectate: r.produse.map(p => p.produs),
    magazineAfectate: r.magazine.map(m => m.locatie),
    confidence: conf.scor, motiveConfidenta: conf.motive,
    nota: r.pretCurent === null ? 'consumat fără preț valid — impactul nu se poate cifra'
      : r.pretPrecedentEstimat ? 'prețul precedent e retro-umplut'
        : null,
  };
};

const desc = (v: number | null) => (v === null ? -Infinity : Math.abs(v));

/** Cele cinci panouri cerute, fiecare cu baza lui de ordonare declarată. */
export function panouriIngrediente(a: AnalizaIngrediente): PanouIngrediente[] {
  const cal = a.calitate;
  const cu = (f: (r: RandIngredient) => number | null) =>
    a.randuri.filter(r => f(r) !== null);
  const fara = (f: (r: RandIngredient) => number | null) =>
    a.randuri.filter(r => f(r) === null).map(r => r.ingredient);
  const top = (randuri: RandIngredient[], f: (r: RandIngredient) => number | null, n = 10) =>
    [...randuri].sort((x, y) => desc(f(y)) - desc(f(x))).slice(0, n).map(r => randPanou(r, cal));

  const contributie = (r: RandIngredient) => r.contributiePpCurent;
  const pret = (r: RandIngredient) => r.deltaPretPct;
  const cost = (r: RandIngredient) => r.deltaCostLei;
  const consum = (r: RandIngredient) => r.deltaConsumPct;

  return [
    {
      id: 'DRIVERE_FC', eticheta: 'Top drivere de FC',
      baza: 'contributiePpCurent — costul ingredientului ÷ vânzările nete ale scopului, pp',
      randuri: top(cu(contributie), contributie), excluse: fara(contributie),
    },
    {
      id: 'CRESTERI_PRET', eticheta: 'Top creșteri de preț',
      baza: 'deltaPretPct — prețul de la finele perioadei față de cel al perioadei de comparație, %',
      randuri: [...cu(pret)].filter(r => (r.deltaPretPct ?? 0) > 0)
        .sort((x, y) => (y.deltaPretPct ?? 0) - (x.deltaPretPct ?? 0)).slice(0, 10).map(r => randPanou(r, cal)),
      excluse: fara(pret),
    },
    {
      id: 'IMPACT_COST', eticheta: 'Top impacturi de cost',
      baza: 'deltaCostLei — Δcost pe perioadă, lei (ordonat după valoare absolută)',
      randuri: top(cu(cost), cost), excluse: fara(cost),
    },
    {
      id: 'DEVIATII_CONSUM', eticheta: 'Top deviații de consum',
      baza: 'deltaConsumPct — consumul în UM de bază față de perioada de comparație, %',
      randuri: top(cu(consum), consum), excluse: fara(consum),
    },
    {
      id: 'OPORTUNITATI', eticheta: 'Top oportunități',
      baza: 'impactEstimatLei din motorul de oportunități — baza de calcul e în dovada fiecăreia',
      randuri: a.oportunitati.slice(0, 10).map(o => {
        const r = a.randuri.find(x => x.ingredient === o.ingredient);
        const baza = r ? randPanou(r, cal) : null;
        return {
          ingredient: o.ingredient, denumire: o.denumire,
          deltaPretLei: baza?.deltaPretLei ?? null, deltaPretPct: baza?.deltaPretPct ?? null,
          impactCostRON: o.impactEstimatLei, impactFcPp: o.fcImpactPp,
          produseAfectate: o.scop.produse, magazineAfectate: o.scop.magazine,
          confidence: o.confidence.scor, motiveConfidenta: o.confidence.motive,
          nota: o.motiv,
        };
      }),
      excluse: [],
    },
  ];
}

export const formulaConfidentaIngredient = FORMULA_CONFIDENTA;

// ————————————————————————————————————————————————————————— simulările

/** Formularul de what-if, exact cele patru pârghii cerute. */
export interface FormSimulare {
  ingredient: string | null;
  pretNou: number | null;
  produs: string | null;
  component: string | null;
  cantNoua: number | null;
  pmixProdus: string | null;
  pmixFactor: number | null;
}

export const formSimulareGol = (): FormSimulare => ({
  ingredient: null, pretNou: null, produs: null, component: null, cantNoua: null,
  pmixProdus: null, pmixFactor: null,
});

/** Traduce formularul în scenariul motorului. Câmpurile incomplete se ignoră, nu se ghicesc. */
export function scenariuDin(f: FormSimulare): ScenariuFC {
  const s: ScenariuFC = {};
  if (f.ingredient && f.pretNou !== null && Number.isFinite(f.pretNou)) {
    s.preturi = [{ ingredient: f.ingredient, pretNou: f.pretNou }];
  }
  if (f.produs && f.component && f.cantNoua !== null && Number.isFinite(f.cantNoua)) {
    s.retete = [{ tip: 'CANTITATE', produs: f.produs, component: f.component, cantNoua: f.cantNoua }];
  }
  if (f.pmixProdus && f.pmixFactor !== null && Number.isFinite(f.pmixFactor)) {
    s.pmix = [{ produs: f.pmixProdus, factor: f.pmixFactor }];
  }
  return s;
}

export const scenariuGol = (s: ScenariuFC): boolean =>
  !s.preturi?.length && !s.retete?.length && !s.pmix?.length;

export interface EfectAfisat {
  id: IdEfect;
  eticheta: string;
  costLei: number;
  fcPp: number | null;
  explicatie: string;
}

export interface RezumatSimulare {
  disponibil: boolean;
  motiv: string | null;
  fcCurent: number | null;
  fcScenariu: number | null;
  deltaPp: number | null;
  deltaRON: number | null;
  deltaPct: number | null;
  /** Efectele IZOLATE — preț, rețetă, mix — plus interacțiunea. Nu se adună la total în pp. */
  efecte: EfectAfisat[];
  /** Baseline + Σ efecte + interacțiune = combinat, în lei. Identitatea motorului. */
  identitate: string;
  confidenta: number;
  acoperire: number | null;
  ingredienteFaraPret: string[];
  afectate: { ingrediente: string[]; produse: string[]; magazine: string[]; perioade: string[] };
  complete: boolean;
  motiveIncomplet: string[];
}

export function rezumatSimulare(s: SimulareFC): RezumatSimulare {
  return {
    disponibil: s.disponibil,
    motiv: s.motivIndisponibil ?? null,
    fcCurent: s.currentRecipeFC,
    fcScenariu: s.scenarioRecipeFC,
    deltaPp: s.deltaFCpp,
    deltaRON: s.deltaCostRON,
    deltaPct: s.deltaFCPercent,
    efecte: s.efecte.map(e => ({
      id: e.id, eticheta: e.eticheta, costLei: e.costLei, fcPp: e.fcPp, explicatie: e.explicatie,
    })),
    identitate: 'cost(baseline) + efect(preț) + efect(rețetă) + efect(mix) + interacțiune = cost(scenariu)',
    confidenta: s.confidence.scor,
    acoperire: s.dataCoverage,
    ingredienteFaraPret: s.ingredienteFaraPret,
    afectate: {
      ingrediente: s.affectedIngredients, produse: s.affectedProducts,
      magazine: s.affectedStores, perioade: s.affectedPeriods,
    },
    complete: s.complete,
    motiveIncomplet: s.motiveIncomplet,
  };
}

// ————————————————————————————————————————————————————————— Import Center

export interface RandImportTower {
  fisier: string;
  tip: string | null;
  eticheta: string;
  stareDetectie: string;
  incredereDetectie: number;
  perioada: string | null;
  granularitate: string;
  scop: string;
  restaurante: string[];
  randuri: number;
  importate: number;
  sarite: number | null;
  acoperire: number | null;
  avertismente: string[];
  erori: string[];
  stare: RezultatCentral['stare'];
  /** Doar un import VALIDAT se poate activa — starea de aici e singura poartă din interfață. */
  poateActiva: boolean;
  motivBlocare: string | null;
  versiune: string | null;
  activat: boolean;
  diagnostice: { cod: string; nivel: string; titlu: string; detaliu: string; exemple: string[] }[];
}

export function randImport(r: RezultatCentral): RandImportTower {
  const blocante = r.diagnostice.filter(d => d.nivel === 'BLOCANT');
  const poateActiva = r.stare === 'VALIDAT';
  const motivBlocare =
    r.stare === 'VALIDAT' ? null
      : r.stare === 'ACTIVAT' ? 'Importul e deja activat.'
        : r.stare === 'DUPLICAT' ? 'Fișierul a mai fost importat cu exact acest conținut — nu se dublează nimic.'
          : r.stare === 'NECESITA_CONFIRMARE' ? 'Tipul fișierului nu poate fi stabilit cu certitudine — confirmă-l înainte de import.'
            : blocante.length ? `Validarea a găsit ${blocante.length} probleme blocante.`
              : r.erori[0] ?? 'Importul nu a trecut validarea.';
  return {
    fisier: r.fisier,
    tip: r.tip,
    eticheta: r.tip ? ETICHETA_SURSA[r.tip] : 'nedetectat',
    stareDetectie: r.detectie.stare,
    incredereDetectie: r.detectie.incredere,
    perioada: r.perioada,
    granularitate: r.granularitate,
    scop: r.scop,
    restaurante: r.restaurante,
    randuri: r.randuri,
    importate: r.importate,
    sarite: r.sarite,
    acoperire: r.acoperire,
    avertismente: r.avertismente,
    erori: r.erori,
    stare: r.stare,
    poateActiva,
    motivBlocare,
    versiune: r.versiune,
    activat: r.activat,
    diagnostice: r.diagnostice.map(d => ({
      cod: d.cod, nivel: d.nivel, titlu: d.titlu, detaliu: d.detaliu, exemple: d.exemple,
    })),
  };
}

// ————————————————————————————————————————————————————————— calitatea datelor, la vedere

export type CodSemnal =
  | 'NECLASIFICAT' | 'CANAL_NECUNOSCUT' | 'RETETA_LIPSA' | 'PRET_LIPSA' | 'PMIX_LIPSA'
  | 'RESTAURANT_LIPSA' | 'RECONCILIERE_INCOMPLETA' | 'PERIOADA_INCOMPLETA' | 'DATE_DEMO'
  | 'INGREDIENT_LIPSA' | 'ISTORIC_PRET';

export interface SemnalCalitate {
  cod: CodSemnal;
  nivel: 'BLOCANT' | 'ATENTIE' | 'INFO';
  titlu: string;
  detaliu: string;
  nrElemente: number;
  exemple: string[];
  /** Unde se rezolvă — semnalul trimite spre remediu, nu doar spre problemă. */
  sectiune: IdSectiune;
}

const ORDINE_NIVEL = { BLOCANT: 0, ATENTIE: 1, INFO: 2 };

/**
 * Toate problemele de date, în același vocabular, vizibile în interfață — nu ascunse
 * într-un jurnal tehnic.
 */
export function semnaleCalitate(
  state: AppState,
  a: AnalizaTimeline,
  ing?: AnalizaIngrediente | null,
): SemnalCalitate[] {
  const s: SemnalCalitate[] = [];
  const c = a.calitate;

  if (c.neclasificatRON !== null && c.neclasificatRON > 0) {
    s.push({
      cod: 'NECLASIFICAT', nivel: 'ATENTIE', titlu: 'Categorii 2.9 neclasificate',
      detaliu: `${c.neclasificatRON.toFixed(2)} lei stau în categorii pe care nicio regulă nu le recunoaște. `
        + 'Nu au fost presupuse Food: până la mapare stau separat, ca să nu deformeze niciun procent.',
      nrElemente: 1, exemple: [], sectiune: 'RECONCILIERE',
    });
  }
  if (c.canalNecunoscut) {
    s.push({
      cod: 'CANAL_NECUNOSCUT', nivel: 'ATENTIE', titlu: 'Canal necunoscut în 2.9',
      detaliu: 'Raportul 2.9 nu declară canalul, deci partea lui nu se poate atribui InStore sau Delivery. '
        + 'Nu se inventează o repartiție.',
      nrElemente: 1, exemple: [], sectiune: 'NBO29',
    });
  }
  if (c.produseFaraReteta.length) {
    s.push({
      cod: 'RETETA_LIPSA', nivel: 'ATENTIE', titlu: 'Produse vândute fără rețetă',
      detaliu: 'Costul lor nu se poate calcula, deci nu intră în FC-ul teoretic — nu au fost costate cu zero.',
      nrElemente: c.produseFaraReteta.length, exemple: c.produseFaraReteta.slice(0, 8), sectiune: 'PMIX47',
    });
  }
  if (c.preturiLipsa.length) {
    s.push({
      cod: 'PRET_LIPSA', nivel: 'ATENTIE', titlu: 'Ingrediente fără preț valid',
      detaliu: 'Fără preț, contribuția lor la cost rămâne necunoscută, nu zero.',
      nrElemente: c.preturiLipsa.length, exemple: c.preturiLipsa.slice(0, 8), sectiune: 'IMPORTURI',
    });
  }
  if (c.pmixLipsa) {
    s.push({
      cod: 'PMIX_LIPSA', nivel: 'BLOCANT', titlu: 'Lipsesc vânzările (PMIX)',
      detaliu: 'Fără vânzări pe perioada selectată nu există numitor pentru niciun procent de FC.',
      nrElemente: 1, exemple: [], sectiune: 'IMPORTURI',
    });
  }
  if (c.restauranteLipsa29.length) {
    s.push({
      cod: 'RESTAURANT_LIPSA', nivel: 'ATENTIE', titlu: 'Restaurante fără date 2.9',
      detaliu: 'Au vânzări în perioada selectată, dar nu apar în raportul de consum — puntea nu se poate face pentru ele.',
      nrElemente: c.restauranteLipsa29.length, exemple: c.restauranteLipsa29.slice(0, 8), sectiune: 'IMPORTURI',
    });
  }
  if (c.reconciliereIncompleta) {
    s.push({
      cod: 'RECONCILIERE_INCOMPLETA', nivel: 'ATENTIE', titlu: 'Reconcilierea nu se închide',
      detaliu: c.motiveReconciliere.join(' ') || 'Puntea rămâne incompletă pe scopul selectat.',
      nrElemente: c.motiveReconciliere.length, exemple: c.motiveReconciliere.slice(0, 5), sectiune: 'RECONCILIERE',
    });
  }
  if (c.perioadaIncompleta) {
    s.push({
      cod: 'PERIOADA_INCOMPLETA', nivel: 'INFO', titlu: 'Perioadă neîncheiată sau tăiată',
      detaliu: 'Cifrele se compară cu grijă: intervalul selectat nu acoperă o perioadă întreagă.',
      nrElemente: 1, exemple: [], sectiune: 'ANALIZA_FC',
    });
  }
  if (ing) {
    if (ing.calitate.ingredientLipsa.length) {
      s.push({
        cod: 'INGREDIENT_LIPSA', nivel: 'ATENTIE', titlu: 'Componente absente din nomenclator',
        detaliu: 'Rețetele le folosesc, dar nomenclatorul nu le conține — lanțul de dovezi se rupe acolo.',
        nrElemente: ing.calitate.ingredientLipsa.length,
        exemple: ing.calitate.ingredientLipsa.slice(0, 8), sectiune: 'IMPORTURI',
      });
    }
    if (ing.calitate.istoricInsuficient.length) {
      s.push({
        cod: 'ISTORIC_PRET', nivel: 'INFO', titlu: 'Prețuri retro-umplute',
        detaliu: 'Prețul folosit pentru perioada de comparație nu era, de fapt, cunoscut atunci.',
        nrElemente: ing.calitate.istoricInsuficient.length,
        exemple: ing.calitate.istoricInsuficient.slice(0, 8), sectiune: 'INGREDIENTE',
      });
    }
  }

  const demo = areDateDemo(state);
  if (demo.demo) {
    s.push({
      cod: 'DATE_DEMO', nivel: 'INFO', titlu: 'Setul conține date demo',
      detaliu: `${demo.produse} produse și ${demo.vanzari} rânduri de vânzări provin din setul demonstrativ, `
        + 'nu din importuri reale. Cifrele de mai jos nu sunt producție.',
      nrElemente: demo.produse + demo.vanzari, exemple: [], sectiune: 'IMPORTURI',
    });
  }

  return s.sort((x, y) => ORDINE_NIVEL[x.nivel] - ORDINE_NIVEL[y.nivel] || x.cod.localeCompare(y.cod));
}

export type OrigineDate = 'GOL' | 'DEMO' | 'IMPORTAT' | 'MIXT';

/** De unde vin datele afișate — demo și importat nu se amestecă tăcut. */
export function origineDate(state: AppState): { origine: OrigineDate; eticheta: string; detaliu: string } {
  const demo = areDateDemo(state);
  const importuriReale = state.importuri.filter(b => b.tip !== 'DATE DEMO' && b.status === 'IMPORTAT').length;
  if (!state.vanzari.length && !importuriReale) {
    return { origine: 'GOL', eticheta: 'Fără date', detaliu: 'Nu s-a importat încă nimic și nu există set demo încărcat.' };
  }
  if (demo.demo && importuriReale > 0) {
    return {
      origine: 'MIXT', eticheta: 'Demo + importat',
      detaliu: `Setul conține și date demonstrative, și ${importuriReale} importuri reale. Cifrele nu sunt pur producție.`,
    };
  }
  if (demo.demo) {
    return { origine: 'DEMO', eticheta: 'Date demo', detaliu: 'Toate cifrele provin din setul demonstrativ — nu sunt date de producție.' };
  }
  return { origine: 'IMPORTAT', eticheta: 'Date importate', detaliu: `${importuriReale} importuri reale stau la baza cifrelor.` };
}

// ————————————————————————————————————————————————————————— seria pentru grafic

export interface PunctGrafic {
  cheie: string;
  fcRetetar: number | null;
  fcNbo: number | null;
  neexplicatRON: number | null;
  partial: boolean;
}

/** Punctele graficului de timeline, gata de desenat. Nicio valoare fabricată pentru perioade fără date. */
export const puncteGrafic = (serie: { perioada: FCPeriod; metrici: MetriciFC; partial: boolean }[]): PunctGrafic[] =>
  serie.map(p => ({
    cheie: p.perioada.cheie,
    fcRetetar: p.metrici.recipeFcPct,
    fcNbo: p.metrici.nboActualFcPct,
    neexplicatRON: p.metrici.unexplainedRON,
    partial: p.partial,
  }));

/** Intervalul acoperit de datele reale, pentru seria de timeline. */
export function intervalSerie(state: AppState, sel: SelectieFC, nrPerioade = 12): { de: string; la: string } | null {
  const perioade = perioadeDisponibile(state, sel.granularitate);
  if (!perioade.length) return null;
  const per = perioadaDinSelectie(sel);
  const pana = perioade.find(p => p.cheie === per.cheie) ?? perioade[0];
  const idx = perioade.findIndex(p => p.cheie === pana.cheie);
  const primele = perioade.slice(idx, idx + nrPerioade);
  const ultima = primele[primele.length - 1];
  return { de: ultima.de, la: pana.la };
}

/** Cererea de bază pentru orice motor, din selecție — o singură sursă de adevăr. */
export const cerereBaza = (sel: SelectieFC): CerereFC => ({
  perioada: perioadaDinSelectie(sel),
  nivel: nivelDin(sel),
  canal: sel.canal,
});

export const locatiaCererii = (sel: SelectieFC): string | undefined => locatieDin(nivelDin(sel));
