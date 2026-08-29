/**
 * FC Advisor — stratul DETERMINIST de analiză.
 *
 * Advisorul nu calculează Food Cost. Consumă ieșirile canonice ale motoarelor deja
 * validate (`fc-timeline`, `fc-bridge`, `fc-ingrediente`, `fc-simulare`, `fc-tower`) și le
 * transformă într-un dosar de dovezi: fapte, drivere, clasamente, oportunități, riscuri,
 * acțiuni și avertismente de calitate.
 *
 * Trei reguli pe care fișierul acesta le impune prin construcție:
 *
 *   1. Nicio cifră fără proveniență. Fiecare număr din dosar e o `Cifra` care își poartă
 *      motorul, câmpul, scopul și sursele. Ce nu se poate calcula rămâne `null` cu motiv.
 *   2. Nimic nu se ghicește. Când dovezile nu ajung, secțiunea poartă
 *      `MESAJ_INSUFICIENT` — nu o estimare.
 *   3. Prioritatea e o regulă, nu o părere: praguri deterministe, scrise în rezultat.
 *
 * Partea de limbaj natural stă separat, în `fc-advisor-llm.ts`, și primește DOAR dosarul
 * de aici. Niciun calcul nu se face în prompt.
 */
import type { AppState } from './types';
import type { Ctx } from './engine';
import {
  etichetaCanal, locatieDin,
  type CerereFC, type FCChannelSursa, type SursaFC,
} from './fc-domeniu';
import { bridgeFC, ETICHETA_COMPONENTA_BRIDGE, type FCBridge } from './fc-bridge';
import {
  analizaTimeline, type AnalizaTimeline, type MetriciFC,
} from './fc-timeline';
import {
  analizaIngrediente, ETICHETA_ANOMALIE, ETICHETA_OPORTUNITATE,
  type AnalizaIngrediente, type RandIngredient,
} from './fc-ingrediente';
import { simuleazaFC, type ScenariuFC, type SimulareFC } from './fc-simulare';
import {
  accesTower, cerereBaza, cerereDin, comparatieIngrediente, descrieSelectie,
  normalizeazaSelectie, punteTower, semnaleCalitate, sorteazaMagazine, tabelMagazine,
  type AccesTower, type GrupBridge, type SelectieFC, type SemnalCalitate,
} from './fc-tower';
import { stareAutorizata, verificaCerere, type Verdict } from './fc-acces';

/** Formula exactă pe care Advisorul o rostește când dovezile nu ajung. */
export const MESAJ_INSUFICIENT = 'Date insuficiente pentru o concluzie sigură.';

// ————————————————————————————————————————————————————————— proveniența

export type MotorSursa = 'FC_TIMELINE' | 'FC_BRIDGE' | 'FC_INGREDIENTE' | 'FC_SIMULARE';

/** De unde vine o cifră: motorul, câmpul exact, scopul cererii și rapoartele-sursă. */
export interface Referinta {
  motor: MotorSursa;
  /** Numele câmpului din motor — verificabil prin citirea codului, nu prin încredere. */
  camp: string;
  scop: string;
  surse: SursaFC[];
}

export type UnitateCifra = 'RON' | 'PCT' | 'PP' | 'BUC';

/**
 * Un număr din dosar. `valoare: null` înseamnă necunoscut, cu motiv scris — niciodată 0
 * pus în locul unui necunoscut.
 */
export interface Cifra {
  eticheta: string;
  valoare: number | null;
  unitate: UnitateCifra;
  referinta: Referinta;
  indisponibilDe?: string;
}

const cifra = (
  eticheta: string, valoare: number | null, unitate: UnitateCifra,
  referinta: Referinta, indisponibilDe?: string,
): Cifra => ({
  eticheta, valoare, unitate, referinta,
  ...(valoare === null ? { indisponibilDe: indisponibilDe ?? MESAJ_INSUFICIENT } : {}),
});

/** Toate numerele dintr-o structură de dosar — baza validării „fără cifre inventate". */
export function cifreDin(x: unknown, acc: Cifra[] = []): Cifra[] {
  if (x === null || typeof x !== 'object') return acc;
  if (Array.isArray(x)) { for (const el of x) cifreDin(el, acc); return acc; }
  const o = x as Record<string, unknown>;
  if (typeof o.eticheta === 'string' && 'valoare' in o && typeof o.unitate === 'string' && 'referinta' in o) {
    acc.push(o as unknown as Cifra);
  }
  for (const v of Object.values(o)) cifreDin(v, acc);
  return acc;
}

// ————————————————————————————————————————————————————————— prioritatea (deterministă)

export type Prioritate = 'CRITICA' | 'MARE' | 'MEDIE' | 'MICA';

export interface PraguriAdvisor {
  /** Impact în lei peste care o acțiune e critică, respectiv mare / medie. */
  impactCriticLei: number;
  impactMareLei: number;
  impactMediuLei: number;
  /** Impact în puncte procentuale peste care o acțiune urcă o treaptă. */
  impactMarePp: number;
  /** Sub acest scor de încredere, prioritatea coboară o treaptă. */
  confidentaMinima: number;
  /** Sub acest scor de încredere nu se emit recomandări „mari" sau „critice". */
  confidentaPentruPrioritateMare: number;
  /** Deteriorare de FC (pp) peste care restaurantul intră în lista de riscuri. */
  deteriorareRestaurantPp: number;
  /** Cât din variance-ul neexplicat (%) devine risc de raportat. */
  neexplicatRiscPct: number;
}

export const PRAGURI_ADVISOR: PraguriAdvisor = {
  impactCriticLei: 5000,
  impactMareLei: 1500,
  impactMediuLei: 300,
  impactMarePp: 0.5,
  confidentaMinima: 60,
  confidentaPentruPrioritateMare: 50,
  deteriorareRestaurantPp: 1,
  neexplicatRiscPct: 10,
};

const ORDINE_PRIORITATE: Prioritate[] = ['CRITICA', 'MARE', 'MEDIE', 'MICA'];
const coboara = (p: Prioritate): Prioritate => ORDINE_PRIORITATE[Math.min(3, ORDINE_PRIORITATE.indexOf(p) + 1)];
const urca = (p: Prioritate): Prioritate => ORDINE_PRIORITATE[Math.max(0, ORDINE_PRIORITATE.indexOf(p) - 1)];

export interface CalculPrioritate {
  prioritate: Prioritate;
  /** Regula aplicată, scrisă — ca prioritatea să fie verificabilă, nu o părere. */
  regula: string;
}

/**
 * Prioritatea unei acțiuni. Deterministă: aceleași intrări dau întotdeauna aceeași ieșire,
 * iar regula aplicată se întoarce odată cu ea. Modelul de limbaj NU o poate schimba.
 */
export function calculeazaPrioritate(
  impactLei: number | null, impactPp: number | null, confidenta: number,
  praguri: PraguriAdvisor = PRAGURI_ADVISOR,
): CalculPrioritate {
  const lei = impactLei === null ? 0 : Math.abs(impactLei);
  const pasi: string[] = [];
  let p: Prioritate =
    lei >= praguri.impactCriticLei ? 'CRITICA'
      : lei >= praguri.impactMareLei ? 'MARE'
        : lei >= praguri.impactMediuLei ? 'MEDIE' : 'MICA';
  pasi.push(`impact ${lei.toFixed(0)} lei → ${p}`);

  if (impactPp !== null && Math.abs(impactPp) >= praguri.impactMarePp) {
    const inainte = p; p = urca(p);
    pasi.push(`|Δ FC| ${Math.abs(impactPp).toFixed(2)} pp ≥ ${praguri.impactMarePp} → urcă ${inainte}→${p}`);
  }
  if (confidenta < praguri.confidentaMinima) {
    const inainte = p; p = coboara(p);
    pasi.push(`încredere ${confidenta} < ${praguri.confidentaMinima} → coboară ${inainte}→${p}`);
  }
  if (confidenta < praguri.confidentaPentruPrioritateMare && (p === 'CRITICA' || p === 'MARE')) {
    pasi.push(`încredere ${confidenta} < ${praguri.confidentaPentruPrioritateMare} → nicio prioritate peste MEDIE`);
    p = 'MEDIE';
  }
  return { prioritate: p, regula: pasi.join(' · ') };
}

// ————————————————————————————————————————————————————————— 1. starea FC

export interface StareFC {
  disponibil: boolean;
  motiv: string | null;
  fcRetetar: Cifra;
  fcActualNbo: Cifra;
  fcTeoreticNbo: Cifra;
  variatie: Cifra;
  explicat: Cifra;
  neexplicat: Cifra;
  vanzari: Cifra;
  /** Direcția față de perioada de comparație — sau `null` când comparația lipsește. */
  directie: 'IN_CRESTERE' | 'IN_SCADERE' | 'STABIL' | null;
  deltaFcPp: Cifra;
  confidenta: number;
  rezumat: string;
}

// ————————————————————————————————————————————————————————— 2. explicația mișcării

export type CauzaFC =
  | 'PRET' | 'RETETA' | 'PMIX' | 'CONSUM'
  | 'PAPER_NORMALIZAT' | 'OPERATIONAL' | 'NECLASIFICAT' | 'NEEXPLICAT';

export const ETICHETA_CAUZA: Record<CauzaFC, string> = {
  PRET: 'Efect de preț',
  RETETA: 'Efect de rețetă',
  PMIX: 'Efect de mix (PMIX)',
  CONSUM: 'Efect de consum',
  PAPER_NORMALIZAT: 'Paper și materiale normalizate',
  OPERATIONAL: 'Consum operațional',
  NECLASIFICAT: 'Materiale neclasificate',
  NEEXPLICAT: 'Variance neexplicat',
};

export interface ContributieCauza {
  cauza: CauzaFC;
  eticheta: string;
  lei: Cifra;
  pp: Cifra;
  /** Ce anume s-a măsurat — fraza care apare în explicație. */
  descriere: string;
  /** Ingredientele / materialele care compun cauza, în ordinea impactului. */
  contribuitori: { cheie: string; denumire: string; lei: number }[];
}

export interface ExplicatieFC {
  disponibil: boolean;
  motiv: string | null;
  /** Cauzele separate. Ele NU se însumează la variance-ul total: unele mișcă numărătorul
   *  din rețetar, altele vin din 2.9 — dosarul spune explicit ce se adună cu ce. */
  cauze: ContributieCauza[];
  /** Δcost din rețetar = preț + consum + interacțiune (identitatea motorului de ingrediente). */
  deltaCostRetetar: Cifra;
  interactiune: Cifra;
  /** Suma cauzelor din rețetar, ca verificare vizibilă a identității. */
  verificareIdentitate: string;
  /** Neexplicatul NU se atribuie niciunei cauze cunoscute. */
  notaNeexplicat: string;
}

const NOTA_NEEXPLICAT =
  'Variance-ul neexplicat rămâne neatribuit: nu există lanț de dovezi care să îl lege de preț, '
  + 'rețetă, mix sau consum. A-l pune pe seama unei cauze cunoscute ar fi o presupunere, nu o concluzie.';

// ————————————————————————————————————————————————————————— 3–4. mișcări

export interface Miscare {
  subiect: string;
  denumire: string;
  tip: 'INGREDIENT' | 'RESTAURANT' | 'COMPONENTA';
  lei: Cifra;
  pp: Cifra;
  motiv: string;
  confidenta: number;
}

// ————————————————————————————————————————————————————————— 5–7. oportunități, riscuri, acțiuni

export interface OportunitateAdvisor {
  tip: string;
  eticheta: string;
  subiect: string;
  denumire: string;
  motiv: string;
  impactLei: Cifra;
  impactPp: Cifra;
  scop: { perioada: string; nivel: string; canale: FCChannelSursa[]; produse: string[]; magazine: string[] };
  confidenta: number;
  motiveConfidenta: string[];
  dovada: { calcul: string; surse: SursaFC[] };
  /** Scenariul rulabil, când motorul de simulare îl poate produce. */
  scenariu?: ScenariuFC;
}

export type TipRisc =
  | 'FC_PESTE_TINTA' | 'DETERIORARE' | 'NEEXPLICAT_MARE' | 'CONCENTRARE'
  | 'DATE_INSUFICIENTE' | 'PRET_INSTABIL' | 'NECLASIFICAT_MARE';

export interface Risc {
  tip: TipRisc;
  titlu: string;
  detaliu: string;
  scop: string;
  lei: Cifra;
  pp: Cifra;
  prioritate: Prioritate;
  regulaPrioritate: string;
  confidenta: number;
}

export type TipActiune =
  | 'VERIFICA_PRET_FURNIZOR' | 'REVIZUIESTE_GRAMAJ' | 'INVESTIGHEAZA_CONSUM'
  | 'INVESTIGHEAZA_RESTAURANT' | 'REVIZUIESTE_PMIX' | 'REVIZUIESTE_PAPER_NORMALIZAT'
  | 'INVESTIGHEAZA_NEEXPLICAT' | 'CLASIFICA_MATERIALE' | 'COMPLETEAZA_DATE';

export const ETICHETA_ACTIUNE: Record<TipActiune, string> = {
  VERIFICA_PRET_FURNIZOR: 'Verifică prețul de furnizor',
  REVIZUIESTE_GRAMAJ: 'Revizuiește gramajul din rețetă',
  INVESTIGHEAZA_CONSUM: 'Investighează consumul',
  INVESTIGHEAZA_RESTAURANT: 'Investighează restaurantul',
  REVIZUIESTE_PMIX: 'Revizuiește mixul de vânzări',
  REVIZUIESTE_PAPER_NORMALIZAT: 'Revizuiește paper-ul și materialele normalizate',
  INVESTIGHEAZA_NEEXPLICAT: 'Investighează variance-ul neexplicat',
  CLASIFICA_MATERIALE: 'Clasifică materialele necunoscute',
  COMPLETEAZA_DATE: 'Completează datele lipsă',
};

export interface Recomandare {
  tip: TipActiune;
  titlu: string;
  prioritate: Prioritate;
  /** Regula deterministă care a dat prioritatea. */
  regulaPrioritate: string;
  motiv: string;
  impactLei: Cifra;
  impactPp: Cifra;
  scop: string;
  confidenta: number;
  motiveConfidenta: string[];
  /** Dovada: de unde vine fiecare cifră din recomandare. */
  dovada: { calcul: string; referinte: Referinta[] };
  scenariu?: ScenariuFC;
}

// ————————————————————————————————————————————————————————— 8. what-if

export interface OptiuneWhatIf {
  titlu: string;
  descriere: string;
  scenariu: ScenariuFC;
  disponibil: boolean;
  motiv: string | null;
  deltaPp: Cifra;
  deltaLei: Cifra;
  fcCurent: Cifra;
  fcScenariu: Cifra;
  confidenta: number;
  /** Efectele separate ale motorului — preț / rețetă / mix / interacțiune. */
  efecte: { id: string; eticheta: string; lei: Cifra }[];
  notaSemantica: string;
}

const NOTA_WHATIF =
  'Simularea pornește de la starea de AZI (prețurile curente, rețetele active) și rulează pe o copie: '
  + 'nu atinge datele reale. Când prețul de azi diferă de cel de la finele perioadei analizate, '
  + 'delta simulării diferă de impactul istoric — cele două cifre răspund la întrebări diferite.';

// ————————————————————————————————————————————————————————— 9. calitatea datelor

export interface AvertismentDate {
  cod: string;
  nivel: 'BLOCANT' | 'ATENTIE' | 'INFO';
  titlu: string;
  detaliu: string;
  nrElemente: number;
  exemple: string[];
  /** Efectul asupra încrederii — cât scade și de ce. */
  efectAsupraIncrederii: string;
}

// ————————————————————————————————————————————————————————— dosarul complet

export interface DosarAdvisor {
  /** Scopul EXACT pe care s-a produs dosarul — clamped la drepturile utilizatorului. */
  scop: {
    descriere: string;
    perioada: string;
    granularitate: string;
    nivel: string;
    canal: string;
    comparatie: string;
    /** Restaurantele la care dosarul are voie să se refere. */
    restauranteAutorizate: string[];
  };
  stare: StareFC;
  explicatie: ExplicatieFC;
  driveri: Miscare[];
  miscariNegative: Miscare[];
  miscariPozitive: Miscare[];
  restaurante: {
    fcMare: Miscare[];
    deteriorare: Miscare[];
    imbunatatire: Miscare[];
    neexplicatMare: Miscare[];
    /** Restaurante excluse dintr-un clasament pentru că metrica lipsește. */
    excluse: string[];
  };
  ingrediente: {
    driveriFc: Miscare[];
    cresteriPret: Miscare[];
    deviatiiConsum: Miscare[];
    impactCost: Miscare[];
    negociere: OportunitateAdvisor[];
    optimizareReteta: OportunitateAdvisor[];
  };
  oportunitati: OportunitateAdvisor[];
  riscuri: Risc[];
  actiuni: Recomandare[];
  whatIf: OptiuneWhatIf[];
  avertismenteDate: AvertismentDate[];
  /** Încrederea globală, cu factorii ei. */
  confidenta: { scor: number; factori: { factor: string; scor: number; detaliu: string }[]; formula: string };
  /** Secțiunile care nu au putut fi produse, cu motivul lor. */
  lipsuri: { sectiune: string; motiv: string }[];
  /** Toate sursele care au alimentat dosarul. */
  surse: SursaFC[];
  praguri: PraguriAdvisor;
}

// ————————————————————————————————————————————————————————— construcția

const refT = (camp: string, scop: string, surse: SursaFC[]): Referinta =>
  ({ motor: 'FC_TIMELINE', camp, scop, surse });
const refB = (camp: string, scop: string, surse: SursaFC[]): Referinta =>
  ({ motor: 'FC_BRIDGE', camp, scop, surse });
const refI = (camp: string, scop: string, surse: SursaFC[]): Referinta =>
  ({ motor: 'FC_INGREDIENTE', camp, scop, surse });
const refS = (camp: string, scop: string, surse: SursaFC[]): Referinta =>
  ({ motor: 'FC_SIMULARE', camp, scop, surse });

const sumaEfect = (randuri: RandIngredient[], f: (e: NonNullable<RandIngredient['efecte']>) => number): number =>
  randuri.reduce((s, r) => s + (r.efecte ? f(r.efecte) : 0), 0);

function stareaFC(a: AnalizaTimeline, scop: string): StareFC {
  const m: MetriciFC | null = a.metrici;
  const c = a.comparatie;
  const s = a.surse;
  if (!m) {
    const gol = (et: string, camp: string) => cifra(et, null, 'PCT', refT(camp, scop, s), a.motivIndisponibil ?? MESAJ_INSUFICIENT);
    return {
      disponibil: false, motiv: a.motivIndisponibil ?? MESAJ_INSUFICIENT,
      fcRetetar: gol('FC rețetar', 'metrici.recipeFcPct'),
      fcActualNbo: gol('FC actual NBO', 'metrici.nboActualFcPct'),
      fcTeoreticNbo: gol('FC teoretic NBO', 'metrici.nboTheoreticalFcPct'),
      variatie: cifra('Variație', null, 'RON', refT('metrici.varianceRON', scop, s), MESAJ_INSUFICIENT),
      explicat: gol('Explicat', 'metrici.explainedPct'),
      neexplicat: gol('Neexplicat', 'metrici.unexplainedPct'),
      vanzari: cifra('Vânzări nete', null, 'RON', refT('metrici.salesRON', scop, s), MESAJ_INSUFICIENT),
      directie: null,
      deltaFcPp: cifra('Δ FC rețetar', null, 'PP', refT('comparatie.recipeFc.deltaPp', scop, s), MESAJ_INSUFICIENT),
      confidenta: 0, rezumat: MESAJ_INSUFICIENT,
    };
  }
  const motivNbo = m.motivNbo ?? 'Puntea 2.9 nu e disponibilă pe această cerere.';
  const dFc = c?.recipeFc.deltaPp ?? null;
  const directie = dFc === null ? null
    : Math.abs(dFc) < 0.05 ? 'STABIL' : dFc > 0 ? 'IN_CRESTERE' : 'IN_SCADERE';
  const rezumat = m.recipeFcPct === null ? MESAJ_INSUFICIENT
    : `FC rețetar ${m.recipeFcPct.toFixed(1)}%`
      + (dFc !== null ? `, ${dFc >= 0 ? '+' : ''}${dFc.toFixed(2)} pp față de perioada de comparație` : ', fără comparație disponibilă')
      + (m.nboDisponibil && m.nboActualFcPct !== null ? `; FC actual NBO ${m.nboActualFcPct.toFixed(1)}%` : `; fără date 2.9 (${motivNbo})`);

  return {
    disponibil: true, motiv: null,
    fcRetetar: cifra('FC rețetar', m.recipeFcPct, 'PCT', refT('metrici.recipeFcPct', scop, s)),
    fcActualNbo: cifra('FC actual NBO', m.nboActualFcPct, 'PCT', refT('metrici.nboActualFcPct', scop, s), motivNbo),
    fcTeoreticNbo: cifra('FC teoretic NBO (declarat)', m.nboTheoreticalFcPct, 'PCT', refT('metrici.nboTheoreticalFcPct', scop, s),
      m.nboDisponibil ? 'Raportul 2.9 nu declară costul teoretic — nu se reconstruiește.' : motivNbo),
    variatie: cifra('Variație (NBO − rețetar)', m.varianceRON, 'RON', refT('metrici.varianceRON', scop, s), motivNbo),
    explicat: cifra('Explicat', m.explainedPct, 'PCT', refT('metrici.explainedPct', scop, s), motivNbo),
    neexplicat: cifra('Neexplicat', m.unexplainedPct, 'PCT', refT('metrici.unexplainedPct', scop, s), motivNbo),
    vanzari: cifra('Vânzări nete', m.salesRON, 'RON', refT('metrici.salesRON', scop, s)),
    directie,
    deltaFcPp: cifra('Δ FC rețetar', dFc, 'PP', refT('comparatie.recipeFc.deltaPp', scop, s),
      c?.motivIndisponibil ?? 'Nu există perioadă de comparație utilizabilă.'),
    confidenta: m.confidence,
    rezumat,
  };
}

function explicatia(
  a: AnalizaTimeline, ing: AnalizaIngrediente | null, bridge: FCBridge, scop: string,
): ExplicatieFC {
  const sI = ing?.surse ?? [];
  const net = a.metrici?.salesRON ?? 0;
  const pp = (lei: number | null) => (lei !== null && net > 0 ? (lei / net) * 100 : null);
  const cauze: ContributieCauza[] = [];

  const adauga = (
    cauza: CauzaFC, lei: number | null, ref: Referinta, descriere: string,
    contribuitori: { cheie: string; denumire: string; lei: number }[] = [],
    indisponibilDe?: string,
  ) => {
    cauze.push({
      cauza, eticheta: ETICHETA_CAUZA[cauza],
      lei: cifra(`${ETICHETA_CAUZA[cauza]} (lei)`, lei, 'RON', ref, indisponibilDe),
      pp: cifra(`${ETICHETA_CAUZA[cauza]} (pp)`, pp(lei), 'PP', ref, indisponibilDe),
      descriere, contribuitori,
    });
  };

  // — cauzele din rețetar: preț, rețetă, mix, consum (motorul de ingrediente)
  const cuEfecte = (ing?.randuri ?? []).filter(r => r.efecte !== null);
  const faraEfecte = (ing?.randuri ?? []).filter(r => r.efecte === null);
  const disponibilIng = !!ing?.disponibil && cuEfecte.length > 0;
  const motivIng = !ing?.disponibil
    ? (ing?.motivIndisponibil ?? MESAJ_INSUFICIENT)
    : 'Niciun ingredient din scop nu are preț valid în ambele perioade — efectele nu se pot separa.';

  const topDupa = (f: (r: RandIngredient) => number) =>
    [...cuEfecte].sort((x, y) => Math.abs(f(y)) - Math.abs(f(x))).slice(0, 5)
      .map(r => ({ cheie: r.ingredient, denumire: r.denumire, lei: f(r) }));

  adauga('PRET', disponibilIng ? sumaEfect(cuEfecte, e => e.pret) : null,
    refI('Σ randuri[].efecte.pret', scop, sI),
    'Δ preț × consumul perioadei precedente — efectul izolat al prețurilor.',
    disponibilIng ? topDupa(r => r.efecte!.pret) : [], motivIng);

  adauga('CONSUM', disponibilIng ? sumaEfect(cuEfecte, e => e.consum) : null,
    refI('Σ randuri[].efecte.consum', scop, sI),
    'Δ consum × prețul perioadei precedente — efectul izolat al cantităților consumate.',
    disponibilIng ? topDupa(r => r.efecte!.consum) : [], motivIng);

  adauga('RETETA', disponibilIng ? sumaEfect(cuEfecte, e => e.reteta) : null,
    refI('Σ randuri[].efecte.reteta', scop, sI),
    'Partea din Δ consum explicată de schimbări de gramaj, la volum constant.',
    disponibilIng ? topDupa(r => r.efecte!.reteta) : [], motivIng);

  adauga('PMIX', disponibilIng ? sumaEfect(cuEfecte, e => e.pmix) : null,
    refI('Σ randuri[].efecte.pmix', scop, sI),
    'Partea din Δ consum explicată de schimbarea volumelor vândute, la gramaj constant.',
    disponibilIng ? topDupa(r => r.efecte!.pmix) : [], motivIng);

  // — cauzele din 2.9: paper normalizat, operațional, neclasificat, neexplicat
  const punte = punteTower(bridge);
  const grup = (g: GrupBridge) => punte.grupuri.find(x => x.grup === g) ?? null;
  const motivNbo = punte.motiv ?? 'Puntea 2.9 nu e disponibilă pe această cerere.';
  const materialeGrup = (g: GrupBridge) =>
    (grup(g)?.componente ?? []).flatMap(c => c.contributii)
      .sort((x, y) => y.lei - x.lei).slice(0, 5)
      .map(c => ({ cheie: c.material, denumire: c.denumire, lei: c.lei }));

  adauga('PAPER_NORMALIZAT', punte.disponibil ? (grup('PAPER_NORMALIZAT')?.lei ?? 0) : null,
    refB('componente[RECIPE_PAPER,NBO_PAPER,NORMALIZED].lei', scop, bridge.surse),
    'Ambalaje și materiale normalizate din 2.9: consum real de Food Cost pe care rețetarul nu îl poate arăta ca atare.',
    punte.disponibil ? materialeGrup('PAPER_NORMALIZAT') : [], motivNbo);

  adauga('OPERATIONAL', punte.disponibil ? (grup('OPERATIONAL')?.lei ?? 0) : null,
    refB('componente[CLEANING,OPERATIONAL,UNIFORMS,STATIONERY,OTHER].lei', scop, bridge.surse),
    'Consum real raportat în 2.9, în afara Food Cost.',
    punte.disponibil ? materialeGrup('OPERATIONAL') : [], motivNbo);

  adauga('NECLASIFICAT', punte.disponibil ? (grup('NECLASIFICAT')?.lei ?? 0) : null,
    refB('componente[UNCLASSIFIED].lei', scop, bridge.surse),
    'Categorii pe care nicio regulă nu le recunoaște. Nu au fost presupuse Food: stau separat, ca să nu deformeze niciun procent.',
    punte.disponibil ? materialeGrup('NECLASIFICAT') : [], motivNbo);

  adauga('NEEXPLICAT', punte.disponibil ? (grup('NEEXPLICAT')?.lei ?? 0) : null,
    refB('componente[UNEXPLAINED].lei', scop, bridge.surse),
    'Food sau Paper fără corespondent în nomenclator: niciun lanț de dovezi către rețete.',
    punte.disponibil ? materialeGrup('NEEXPLICAT') : [], motivNbo);

  const deltaCost = disponibilIng
    ? cuEfecte.reduce((s, r) => s + (r.deltaCostLei ?? 0), 0) : null;
  const interactiune = disponibilIng
    ? sumaEfect(cuEfecte, e => e.interactiunePret) : null;

  return {
    disponibil: disponibilIng || punte.disponibil,
    motiv: disponibilIng || punte.disponibil ? null : MESAJ_INSUFICIENT,
    cauze,
    deltaCostRetetar: cifra('Δ cost din rețetar', deltaCost, 'RON',
      refI('Σ randuri[].deltaCostLei', scop, sI), motivIng),
    interactiune: cifra('Interacțiune preț × consum', interactiune, 'RON',
      refI('Σ randuri[].efecte.interactiunePret', scop, sI), motivIng),
    verificareIdentitate: disponibilIng
      ? 'Δcost = efect preț + efect consum + interacțiune (identitate exactă a motorului de ingrediente). '
        + 'Efect consum = efect rețetă + efect mix + interacțiunea lor. '
        + 'Cauzele din 2.9 NU se adună la Δcost: ele descriu consumul raportat, nu mișcarea costului din rețetar.'
      + (faraEfecte.length ? ` ${faraEfecte.length} ingrediente rămân în afara identității: fără preț valid, efectele lor nu se pot separa.` : '')
      : MESAJ_INSUFICIENT,
    notaNeexplicat: NOTA_NEEXPLICAT,
  };
}

const miscareIngredient = (r: RandIngredient, scop: string, surse: SursaFC[], motiv: string): Miscare => ({
  subiect: r.ingredient, denumire: r.denumire, tip: 'INGREDIENT',
  lei: cifra('Δ cost', r.deltaCostLei, 'RON', refI('randuri[].deltaCostLei', scop, surse),
    'Ingredientul nu are preț valid în ambele perioade — impactul nu se poate cifra.'),
  pp: cifra('Impact FC', r.fcImpactPp, 'PP', refI('randuri[].fcImpactPp', scop, surse),
    'Fără preț valid, contribuția la FC rămâne necunoscută.'),
  motiv,
  confidenta: r.pretCurent === null || r.pretPrecedent === null ? 40
    : r.pretPrecedentEstimat || r.pretCurentEstimat ? 70 : 100,
});

function riscuri(
  state: AppState, a: AnalizaTimeline, ing: AnalizaIngrediente | null, bridge: FCBridge,
  scop: string, praguri: PraguriAdvisor,
): Risc[] {
  const rez: Risc[] = [];
  const m = a.metrici;
  const net = m?.salesRON ?? 0;
  const pp = (lei: number | null) => (lei !== null && net > 0 ? (lei / net) * 100 : null);
  const adauga = (
    tip: TipRisc, titlu: string, detaliu: string, scopRisc: string,
    lei: number | null, ppRisc: number | null, ref: Referinta, confidenta: number,
  ) => {
    const p = calculeazaPrioritate(lei, ppRisc, confidenta, praguri);
    rez.push({
      tip, titlu, detaliu, scop: scopRisc,
      lei: cifra(titlu, lei, 'RON', ref, MESAJ_INSUFICIENT),
      pp: cifra(titlu, ppRisc, 'PP', ref, MESAJ_INSUFICIENT),
      prioritate: p.prioritate, regulaPrioritate: p.regula, confidenta,
    });
  };

  // FC peste ținta declarată
  const tinte = state.tinte;
  const tabel = tabelMagazine(state, a);
  for (const r of tabel) {
    if (r.status === 'RISC' && r.recipeFcPct !== null && r.tinta !== null) {
      const depasirePp = r.recipeFcPct - r.tinta;
      adauga('FC_PESTE_TINTA', `${r.locatie}: FC peste țintă`,
        `FC rețetar ${r.recipeFcPct.toFixed(1)}% față de ținta ${r.tinta.toFixed(1)}%.`,
        r.locatie, null, depasirePp, refT('magazine[].metrici.recipeFcPct', scop, a.surse), r.confidence);
    }
    if (r.trendPp !== null && r.trendPp >= praguri.deteriorareRestaurantPp) {
      adauga('DETERIORARE', `${r.locatie}: FC în deteriorare`,
        `FC-ul a crescut cu ${r.trendPp.toFixed(2)} pp față de perioada de comparație.`,
        r.locatie, null, r.trendPp, refT('magazine[].comparatie.recipeFc.deltaPp', scop, a.surse), r.confidence);
    }
  }
  if (!tinte.length && tabel.length) {
    adauga('DATE_INSUFICIENTE', 'Fără ținte de FC definite',
      'Statusurile nu se pot raporta la un prag: nicio țintă nu e definită în date.',
      scop, null, null, refT('state.tinte', scop, a.surse), 100);
  }

  // neexplicat mare
  if (m?.unexplainedPct !== null && m?.unexplainedPct !== undefined
    && m.unexplainedPct >= praguri.neexplicatRiscPct) {
    adauga('NEEXPLICAT_MARE', 'Variance neexplicat semnificativ',
      `${m.unexplainedPct.toFixed(1)}% din consumul 2.9 nu are lanț de dovezi către rețete sau nomenclator. `
      + NOTA_NEEXPLICAT,
      scop, m.unexplainedRON, pp(m.unexplainedRON), refB('unexplainedAmount', scop, bridge.surse),
      bridge.confidenceScore);
  }
  // neclasificat mare
  const necl = m?.unclassifiedRON ?? null;
  if (necl !== null && necl > 0) {
    adauga('NECLASIFICAT_MARE', 'Materiale neclasificate în 2.9',
      'Categorii pe care nicio regulă nu le recunoaște. Până la clasificare, ele nu intră în niciun procent.',
      scop, necl, pp(necl), refB('componente[UNCLASSIFIED].lei', scop, bridge.surse), bridge.confidenceScore);
  }

  // anomalii de ingrediente cu semnificație de risc
  for (const an of ing?.anomalii ?? []) {
    if (an.tip === 'CONCENTRARE_MAGAZIN') {
      adauga('CONCENTRARE', `${an.denumire}: impact concentrat`,
        an.detaliu, scop, an.lei, null, refI('anomalii[].lei', scop, ing?.surse ?? []), 80);
    }
    if (an.tip === 'PRET_INSTABIL') {
      adauga('PRET_INSTABIL', `${an.denumire}: istoric de prețuri instabil`,
        an.detaliu, scop, an.lei, null, refI('anomalii[].valoareMasurata', scop, ing?.surse ?? []), 70);
    }
  }

  return rez.sort((x, y) => ORDINE_PRIORITATE.indexOf(x.prioritate) - ORDINE_PRIORITATE.indexOf(y.prioritate)
    || Math.abs(y.lei.valoare ?? 0) - Math.abs(x.lei.valoare ?? 0)
    || x.titlu.localeCompare(y.titlu));
}

function actiuni(
  a: AnalizaTimeline, ing: AnalizaIngrediente | null, bridge: FCBridge,
  semnale: SemnalCalitate[], scop: string, praguri: PraguriAdvisor,
): Recomandare[] {
  const rez: Recomandare[] = [];
  const sI = ing?.surse ?? [];
  const net = a.metrici?.salesRON ?? 0;
  const pp = (lei: number | null) => (lei !== null && net > 0 ? (lei / net) * 100 : null);

  const adauga = (
    tip: TipActiune, titlu: string, motiv: string, scopA: string,
    lei: number | null, ppA: number | null, confidenta: number, motiveConf: string[],
    calcul: string, referinte: Referinta[], scenariu?: ScenariuFC,
  ) => {
    const p = calculeazaPrioritate(lei, ppA, confidenta, praguri);
    rez.push({
      tip, titlu, prioritate: p.prioritate, regulaPrioritate: p.regula, motiv,
      impactLei: cifra('Impact estimat', lei, 'RON', referinte[0], MESAJ_INSUFICIENT),
      impactPp: cifra('Impact FC', ppA, 'PP', referinte[0], MESAJ_INSUFICIENT),
      scop: scopA, confidenta, motiveConfidenta: motiveConf,
      dovada: { calcul, referinte },
      ...(scenariu ? { scenariu } : {}),
    });
  };

  // — din oportunitățile motorului de ingrediente
  for (const o of ing?.oportunitati ?? []) {
    const tip: TipActiune =
      o.tip === 'NEGOCIERE_PRET' ? 'VERIFICA_PRET_FURNIZOR'
        : o.tip === 'OPTIMIZARE_RETETA' ? 'REVIZUIESTE_GRAMAJ'
          : o.tip === 'CONTROL_CONSUM' ? 'INVESTIGHEAZA_CONSUM'
            : o.tip === 'RISC_CONCENTRARE' ? 'INVESTIGHEAZA_RESTAURANT'
              : 'INVESTIGHEAZA_CONSUM';
    adauga(tip, `${ETICHETA_ACTIUNE[tip]}: ${o.denumire}`, o.motiv,
      `${o.scop.nivel} · ${o.scop.perioada}`, o.impactEstimatLei, o.fcImpactPp,
      o.confidence.scor, o.confidence.motive, o.dovada.calcul,
      [refI(`oportunitati[${o.tip}].impactEstimatLei`, scop, o.dovada.surse)], o.scenariu);
  }

  // — din anomaliile de consum, care nu produc întotdeauna oportunități
  for (const an of ing?.anomalii ?? []) {
    if (an.tip !== 'CONSUM_CRESTERE_MARE') continue;
    adauga('INVESTIGHEAZA_CONSUM', `Investighează consumul: ${an.denumire}`, an.detaliu,
      scop, an.lei, pp(an.lei), 75,
      ['prag determinist depășit', 'consumul nu implică singur o cauză'],
      `${an.detaliu} Prag: ${an.prag ?? '—'}.`,
      [refI('anomalii[CONSUM_CRESTERE_MARE]', scop, sI)]);
  }

  // — din punte: paper normalizat, neclasificat, neexplicat
  const punte = punteTower(bridge);
  if (punte.disponibil) {
    const g = (x: GrupBridge) => punte.grupuri.find(y => y.grup === x);
    const norm = g('PAPER_NORMALIZAT');
    if (norm && norm.lei > 0) {
      adauga('REVIZUIESTE_PAPER_NORMALIZAT', 'Revizuiește paper-ul și materialele normalizate',
        'Consum real de Food Cost pe care rețetarul nu îl arată ca atare — de aliniat cu rețetele sau de recunoscut ca normalizat.',
        scop, norm.lei, norm.pp, bridge.confidenceScore,
        ['cifra vine direct din puntea 2.9'],
        `Suma componentelor ${ETICHETA_COMPONENTA_BRIDGE.RECIPE_PAPER}, ${ETICHETA_COMPONENTA_BRIDGE.NBO_PAPER} și ${ETICHETA_COMPONENTA_BRIDGE.NORMALIZED}.`,
        [refB('componente[RECIPE_PAPER,NBO_PAPER,NORMALIZED].lei', scop, bridge.surse)]);
    }
    const necl = g('NECLASIFICAT');
    if (necl && necl.lei > 0) {
      adauga('CLASIFICA_MATERIALE', 'Clasifică materialele necunoscute',
        'Categoriile nerecunoscute stau în afara oricărui procent. Maparea lor face puntea completă.',
        scop, necl.lei, necl.pp, 100, ['clasificarea e o regulă, nu o estimare'],
        'Suma componentei UNCLASSIFIED din puntea 2.9.',
        [refB('componente[UNCLASSIFIED].lei', scop, bridge.surse)]);
    }
    const nex = g('NEEXPLICAT');
    if (nex && nex.lei > 0) {
      adauga('INVESTIGHEAZA_NEEXPLICAT', 'Investighează variance-ul neexplicat',
        NOTA_NEEXPLICAT, scop, nex.lei, nex.pp, bridge.confidenceScore,
        ['cauza nu e cunoscută — de aceea e o investigație, nu o corecție'],
        'Suma componentei UNEXPLAINED din puntea 2.9.',
        [refB('componente[UNEXPLAINED].lei', scop, bridge.surse)]);
    }
  }

  // — din mixul de vânzări, când efectul lui domină
  const cuEfecte = (ing?.randuri ?? []).filter(r => r.efecte !== null);
  if (cuEfecte.length) {
    const efectPmix = sumaEfect(cuEfecte, e => e.pmix);
    const efectPret = sumaEfect(cuEfecte, e => e.pret);
    if (Math.abs(efectPmix) > Math.abs(efectPret) && Math.abs(efectPmix) >= praguri.impactMediuLei) {
      adauga('REVIZUIESTE_PMIX', 'Revizuiește mixul de vânzări',
        'Mișcarea de cost vine mai mult din ce s-a vândut decât din cât costă — mixul e pârghia, nu prețul.',
        scop, efectPmix, pp(efectPmix), 85,
        ['efectul de mix e izolat de motorul de ingrediente'],
        'Σ efecte.pmix pe ingredientele din scop, comparat cu Σ efecte.pret.',
        [refI('Σ randuri[].efecte.pmix', scop, sI)]);
    }
  }

  // — din calitatea datelor: fără date bune, prima acțiune e completarea lor
  const blocante = semnale.filter(s => s.nivel === 'BLOCANT');
  const atentii = semnale.filter(s => s.nivel === 'ATENTIE');
  if (blocante.length || atentii.length) {
    const conf = blocante.length ? 100 : 90;
    adauga('COMPLETEAZA_DATE', 'Completează datele lipsă',
      [...blocante, ...atentii].slice(0, 4).map(s => s.titlu).join(' · '),
      scop, null, null, conf,
      ['problema e de acoperire a datelor, nu de cifră'],
      'Semnalele de calitate produse de motoare pe scopul curent.',
      [refT('calitate', scop, a.surse)]);
  }

  return rez.sort((x, y) => ORDINE_PRIORITATE.indexOf(x.prioritate) - ORDINE_PRIORITATE.indexOf(y.prioritate)
    || Math.abs(y.impactLei.valoare ?? 0) - Math.abs(x.impactLei.valoare ?? 0)
    || x.titlu.localeCompare(y.titlu));
}

/** Scenariile what-if propuse — doar cele pe care motorul de simulare le poate chiar rula. */
function optiuniWhatIf(
  state: AppState, ctx: Ctx, cerere: CerereFC, ing: AnalizaIngrediente | null,
  scop: string, maxim = 3,
): OptiuneWhatIf[] {
  const rez: OptiuneWhatIf[] = [];
  const candidati: { titlu: string; descriere: string; scenariu: ScenariuFC }[] = [];

  // 1. scenariile legate de oportunitățile motorului
  for (const o of (ing?.oportunitati ?? []).filter(x => x.scenariu)) {
    candidati.push({
      titlu: `${ETICHETA_OPORTUNITATE[o.tip]}: ${o.denumire}`,
      descriere: o.motiv, scenariu: o.scenariu!,
    });
  }
  // 2. „−5% la prețul celui mai mare driver de cost" — construit din cifre existente
  const driver = (ing?.randuri ?? []).find(r => r.pretCurent !== null && (r.deltaCostLei ?? 0) > 0)
    ?? (ing?.randuri ?? []).find(r => r.pretCurent !== null);
  if (driver && driver.pretCurent !== null) {
    const pretNou = driver.pretCurent * 0.95;
    candidati.push({
      titlu: `Preț −5% la ${driver.denumire}`,
      descriere: `Prețul curent ${driver.pretCurent.toFixed(2)} lei/${driver.um} scade la ${pretNou.toFixed(2)} lei/${driver.um}.`,
      scenariu: { nume: `-5% ${driver.ingredient}`, preturi: [{ ingredient: driver.ingredient, pretNou }] },
    });
  }

  for (const c of candidati.slice(0, maxim)) {
    const sim: SimulareFC = simuleazaFC(state, ctx, cerere, c.scenariu);
    const ref = refS('simuleazaFC', scop, sim.surse);
    rez.push({
      titlu: c.titlu, descriere: c.descriere, scenariu: c.scenariu,
      disponibil: sim.disponibil,
      motiv: sim.motivIndisponibil ?? null,
      deltaPp: cifra('Δ FC', sim.deltaFCpp, 'PP', ref, sim.motivIndisponibil ?? MESAJ_INSUFICIENT),
      deltaLei: cifra('Δ cost', sim.disponibil ? sim.deltaCostRON : null, 'RON', ref, sim.motivIndisponibil ?? MESAJ_INSUFICIENT),
      fcCurent: cifra('FC curent', sim.currentRecipeFC, 'PCT', ref, sim.motivIndisponibil ?? MESAJ_INSUFICIENT),
      fcScenariu: cifra('FC scenariu', sim.scenarioRecipeFC, 'PCT', ref, sim.motivIndisponibil ?? MESAJ_INSUFICIENT),
      confidenta: sim.confidence.scor,
      efecte: sim.efecte.map(e => ({
        id: e.id, eticheta: e.eticheta,
        lei: cifra(`Efect ${e.eticheta}`, e.costLei, 'RON', ref),
      })),
      notaSemantica: NOTA_WHATIF,
    });
  }
  return rez;
}

const avertismentDin = (s: SemnalCalitate): AvertismentDate => ({
  cod: s.cod, nivel: s.nivel, titlu: s.titlu, detaliu: s.detaliu,
  nrElemente: s.nrElemente, exemple: s.exemple,
  efectAsupraIncrederii: s.nivel === 'BLOCANT'
    ? 'Blochează concluziile: fără aceste date, cifrele afectate nu se pot calcula deloc.'
    : s.nivel === 'ATENTIE'
      ? 'Reduce încrederea: o parte din scop nu e acoperită de date, iar recomandările nu urcă la prioritate mare.'
      : 'Nu schimbă cifrele, dar contează la citirea lor.',
});

// ————————————————————————————————————————————————————————— motorul

export interface CerereAdvisor {
  selectie: SelectieFC;
  acces: AccesTower;
  praguri?: PraguriAdvisor;
  /** Câte scenarii what-if să ruleze (fiecare e o simulare completă). */
  maxWhatIf?: number;
}

/**
 * Dosarul complet, pe scopul autorizat. Selecția e re-normalizată la drepturile
 * utilizatorului ÎNAINTE de orice calcul: un manager de restaurant nu poate obține
 * date despre alt restaurant nici trimițând o selecție construită de mână.
 */
export function dosarAdvisor(state: AppState, ctx: Ctx, cerere: CerereAdvisor): DosarAdvisor {
  const praguri = cerere.praguri ?? PRAGURI_ADVISOR;
  const acces = cerere.acces;
  const sel = normalizeazaSelectie(state, cerere.selectie, acces);
  // apărare în adâncime: chiar dacă apelantul a uitat proiecția, Advisorul nu vede
  // rândurile altui restaurant. Pentru cine are acces la tot, e același obiect.
  state = stareAutorizata(state, acces.context);
  const scop = descrieSelectie(sel);
  const cerereFC = cerereBaza(sel);

  const a = analizaTimeline(state, ctx, cerereDin(sel));
  const bridge = bridgeFC(state, ctx, cerereFC);
  const ingBrut = analizaIngrediente(state, ctx, { ...cerereFC, comparatie: comparatieIngrediente(sel) });
  const ing = ingBrut.disponibil ? ingBrut : null;

  const semnale = semnaleCalitate(state, a, ing);
  const stare = stareaFC(a, scop);
  const explicatie = explicatia(a, ing, bridge, scop);

  const sI = ingBrut.surse;
  const randuri = ing?.randuri ?? [];
  const top = (f: (r: RandIngredient) => number | null, semn: 'ORICE' | 'POZITIV' | 'NEGATIV', motiv: string, n = 5) =>
    randuri
      .filter(r => f(r) !== null && (semn === 'ORICE' || (semn === 'POZITIV' ? f(r)! > 0 : f(r)! < 0)))
      .sort((x, y) => Math.abs(f(y)!) - Math.abs(f(x)!))
      .slice(0, n)
      .map(r => miscareIngredient(r, scop, sI, motiv));

  const driveri = top(r => r.contributiePpCurent, 'ORICE', 'Contribuie cel mai mult la FC-ul perioadei.');
  const miscariNegative = top(r => r.deltaCostLei, 'POZITIV', 'A împins costul în sus față de perioada de comparație.');
  const miscariPozitive = top(r => r.deltaCostLei, 'NEGATIV', 'A tras costul în jos față de perioada de comparație.');

  // — restaurante (doar la nivel de companie; pe restaurant, lista are un singur scop)
  const tabel = tabelMagazine(state, a);
  const clasament = (criteriu: Parameters<typeof sorteazaMagazine>[2], f: (r: (typeof tabel)[number]) => number | null,
    unitate: UnitateCifra, camp: string, motiv: string) => {
    const s = sorteazaMagazine(tabel, a, criteriu);
    return s.randuri.slice(0, 5).map((r): Miscare => ({
      subiect: r.locatie, denumire: r.locatie, tip: 'RESTAURANT',
      lei: cifra(motiv, unitate === 'RON' ? f(r) : null, 'RON', refT(camp, scop, a.surse), MESAJ_INSUFICIENT),
      pp: cifra(motiv, unitate === 'RON' ? null : f(r), unitate === 'PCT' ? 'PCT' : 'PP', refT(camp, scop, a.surse), MESAJ_INSUFICIENT),
      motiv, confidenta: r.confidence,
    }));
  };

  const restaurante = {
    fcMare: clasament('FC_MARE', r => r.recipeFcPct, 'PCT', 'magazine[].metrici.recipeFcPct', 'FC rețetar ridicat.'),
    deteriorare: clasament('CRESTERE_FC', r => r.trendPp, 'PP', 'magazine[].comparatie.recipeFc.deltaPp', 'Cea mai mare creștere de FC.'),
    imbunatatire: clasament('SCADERE_FC', r => r.trendPp, 'PP', 'magazine[].comparatie.recipeFc.deltaPp', 'Cea mai mare scădere de FC.'),
    neexplicatMare: clasament('NEEXPLICAT', r => r.unexplainedRON, 'RON', 'magazine[].metrici.unexplainedRON', 'Cel mai mare variance neexplicat.'),
    excluse: [...new Set((a.clasamente ?? []).flatMap(c => c.excluse))].sort(),
  };

  const oportunitateDin = (o: NonNullable<AnalizaIngrediente['oportunitati']>[number]): OportunitateAdvisor => ({
    tip: o.tip, eticheta: ETICHETA_OPORTUNITATE[o.tip],
    subiect: o.ingredient, denumire: o.denumire, motiv: o.motiv,
    impactLei: cifra('Impact estimat', o.impactEstimatLei, 'RON', refI(`oportunitati[${o.tip}].impactEstimatLei`, scop, o.dovada.surse)),
    impactPp: cifra('Impact FC', o.fcImpactPp, 'PP', refI(`oportunitati[${o.tip}].fcImpactPp`, scop, o.dovada.surse), MESAJ_INSUFICIENT),
    scop: o.scop, confidenta: o.confidence.scor, motiveConfidenta: o.confidence.motive,
    dovada: o.dovada, ...(o.scenariu ? { scenariu: o.scenariu } : {}),
  });
  const oportunitati = (ing?.oportunitati ?? []).map(oportunitateDin);

  const dosar: DosarAdvisor = {
    scop: {
      descriere: scop,
      perioada: cerereFC.perioada.cheie,
      granularitate: sel.granularitate,
      nivel: locatieDin(cerereFC.nivel) ?? 'COMPANIE',
      canal: etichetaCanal(sel.canal),
      comparatie: sel.comparatie,
      restauranteAutorizate: acces.locatieImpusa ? [acces.locatieImpusa] : acces.locatiiVizibile,
    },
    stare, explicatie, driveri, miscariNegative, miscariPozitive, restaurante,
    ingrediente: {
      driveriFc: driveri,
      cresteriPret: top(r => r.deltaPretPct, 'POZITIV', 'Cea mai mare creștere de preț.'),
      deviatiiConsum: top(r => r.deltaConsumPct, 'ORICE', 'Cea mai mare deviație de consum.'),
      impactCost: top(r => r.deltaCostLei, 'ORICE', 'Cel mai mare impact de cost.'),
      negociere: oportunitati.filter(o => o.tip === 'NEGOCIERE_PRET'),
      optimizareReteta: oportunitati.filter(o => o.tip === 'OPTIMIZARE_RETETA'),
    },
    oportunitati,
    riscuri: riscuri(state, a, ing, bridge, scop, praguri),
    actiuni: actiuni(a, ing, bridge, semnale, scop, praguri),
    whatIf: optiuniWhatIf(state, ctx, cerereFC, ing, scop, cerere.maxWhatIf ?? 3),
    avertismenteDate: semnale.map(avertismentDin),
    confidenta: confidentaGlobala(a, bridge, ingBrut, semnale),
    lipsuri: lipsuri(a, bridge, ingBrut),
    surse: [...a.surse, ...bridge.surse, ...ingBrut.surse],
    praguri,
  };
  return dosar;
}

const FORMULA_CONFIDENTA =
  '0,45 × încrederea punții (sau acoperirea rețetelor fără 2.9) + 0,35 × disponibilitatea analizei de ingrediente '
  + '+ 0,20 × (100 − 25 per semnal blocant − 10 per semnal de atenție)';

function confidentaGlobala(
  a: AnalizaTimeline, bridge: FCBridge, ing: AnalizaIngrediente, semnale: SemnalCalitate[],
): DosarAdvisor['confidenta'] {
  const marg = (x: number) => Math.min(100, Math.max(0, x));
  const scorPunte = bridge.nboDisponibil ? bridge.confidenceScore : marg(a.metrici?.acoperirePct ?? 0);
  const scorIng = ing.disponibil ? (ing.complete ? 100 : 70) : 0;
  const blocante = semnale.filter(s => s.nivel === 'BLOCANT').length;
  const atentii = semnale.filter(s => s.nivel === 'ATENTIE').length;
  const scorDate = marg(100 - 25 * blocante - 10 * atentii);
  const scor = Math.round(0.45 * scorPunte + 0.35 * scorIng + 0.20 * scorDate);
  return {
    scor,
    factori: [
      { factor: 'punte', scor: Math.round(scorPunte),
        detaliu: bridge.nboDisponibil ? 'Încrederea punții 2.9.' : `Fără 2.9 — se folosește acoperirea rețetelor (${(a.metrici?.acoperirePct ?? 0).toFixed(0)}%).` },
      { factor: 'ingrediente', scor: scorIng,
        detaliu: ing.disponibil ? (ing.complete ? 'Analiza de ingrediente e completă.' : 'Analiza există, dar e incompletă.') : (ing.motivIndisponibil ?? MESAJ_INSUFICIENT) },
      { factor: 'calitatea datelor', scor: scorDate,
        detaliu: `${blocante} semnale blocante, ${atentii} de atenție.` },
    ],
    formula: FORMULA_CONFIDENTA,
  };
}

function lipsuri(a: AnalizaTimeline, bridge: FCBridge, ing: AnalizaIngrediente): DosarAdvisor['lipsuri'] {
  const rez: DosarAdvisor['lipsuri'] = [];
  if (!a.disponibil) rez.push({ sectiune: 'STARE_FC', motiv: a.motivIndisponibil ?? MESAJ_INSUFICIENT });
  if (!bridge.nboDisponibil) {
    rez.push({ sectiune: 'PUNTE_29', motiv: bridge.motivNbo ?? 'Puntea 2.9 nu e disponibilă pe această cerere.' });
  }
  if (!ing.disponibil) rez.push({ sectiune: 'INGREDIENTE', motiv: ing.motivIndisponibil ?? MESAJ_INSUFICIENT });
  if (!a.comparatie?.disponibil) {
    rez.push({ sectiune: 'COMPARATIE', motiv: a.comparatie?.motivIndisponibil ?? 'Nu există perioadă de comparație utilizabilă.' });
  }
  if (a.magazine === null) {
    rez.push({ sectiune: 'RESTAURANTE', motiv: 'Defalcarea pe restaurante există doar la nivel de companie.' });
  }
  return rez;
}

/**
 * Verdictul de autorizare al unei cereri de Advisor, ÎNAINTE de a o rula. Interfața îl
 * folosește ca să refuze explicit, nu să ajusteze tăcut scopul cerut.
 */
export const verificaCerereAdvisor = (acces: AccesTower, sel: SelectieFC): Verdict =>
  verificaCerere(acces.context, {
    locatie: sel.scop === 'RESTAURANT' ? sel.locatie : null,
    canal: sel.canal,
  });

/** Comoditate: construiește accesul și dosarul într-un singur apel. */
export const dosarPentru = (
  state: AppState, ctx: Ctx, selectie: SelectieFC,
  utilizator: { rol: string; locatie?: string | null } | null, filtratDeServer: boolean,
): DosarAdvisor =>
  dosarAdvisor(state, ctx, { selectie, acces: accesTower(state, utilizator, filtratDeServer) });

/** Rezumat într-o linie, pentru jurnale. */
export const descrieDosar = (d: DosarAdvisor) =>
  `${d.scop.descriere} · ${d.stare.rezumat} · ${d.actiuni.length} acțiuni · ${d.riscuri.length} riscuri · încredere ${d.confidenta.scor}`;

export { ETICHETA_ANOMALIE };
