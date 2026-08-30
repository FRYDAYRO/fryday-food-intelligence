// Puntea FC canonică — motorul oficial de clasificare și reconciliere Food Cost.
//
// UN singur model de clasificare guvernează analiza FC: cel din `fc-clasificare`
// (9 categorii, nimic nu cade tăcut pe FOOD). Puntea de aici NU folosește NICIODATĂ
// clasificatorul vechi din `engine` (`clasifica`), al cărui fallback implicit pe FOOD
// rămâne doar pentru rollup-ul de compatibilitate pe categorie — izolat de acest fișier.
//
// Ce face: descompune fiecare leu din raportul 2.9 într-o componentă numită, cu
// proveniență completă (raport → perioadă → restaurant → material → regulă de
// clasificare → ingredient → rețete), astfel încât întrebarea „de ce e această
// componentă 0.42 puncte procentuale?" să aibă răspuns până la rândul de material.
//
// Reguli care nu se încalcă:
//  · nimic nu cade tăcut pe FOOD — necunoscutul rămâne UNCLASSIFIED și se vede;
//  · puntea NU se forțează la 100%: explained + unexplained e o partiție a rândurilor
//    reale, fără nicio ajustare artificială; ce nu se poate explica se raportează;
//  · `complete: false` ori de câte ori dovada la nivel de material e insuficientă;
//  · canalul din 2.9 se folosește DOAR când sursa îl declară explicit; altfel e UNKNOWN
//    și nu se inventează nicio repartiție pe canale;
//  · 2.9 e lunar: pe săptămâni se calculează doar partea de rețete, iar partea de 2.9
//    se declară indisponibilă — nu se fabrică valori săptămânale din date lunare;
//  · scorul de încredere e o formulă deterministă pe acoperirea datelor, cu factorii
//    și ponderile expuse — nicio cifră fără explicație.
import type { AppState, Material29 } from './types';
import {
  eLunaIntreaga, locatieDin, luniAtinse,
  type CerereFC, type CtxFC, type FCChannel, type FCChannelSursa, type SursaFC,
} from './fc-domeniu';
import {
  categorieMaterial,
  type FCCategory, type RegulaCategorie29, type SursaClasificare,
} from './fc-clasificare';
import { COMBINATIE_FC, verdictCombinare, type VerdictSurse } from './perioade-surse';
import { numitorFC, recipeFC, type NumitorFC, type RecipeFC } from './fc-core';
import {
  diagnosticeMaterial, randuriMaterialFC, sorteazaDiagnostice, teoreticDinRetete, teoreticPeRand, trebuieMapat,
  type DiagnosticFC, type RandMaterialFC,
} from './fc-material';

// ————————————————————————————————————————————————————————— componentele punții

/** Componenta în care intră fiecare leu din 2.9 — vocabularul oficial al punții. */
export type ComponentaBridge =
  | 'RECIPE_FOOD'    // Food explicat direct de rețetar
  | 'RECIPE_PAPER'   // Paper explicat direct de rețetar
  | 'NBO_FOOD'       // Food mapat pe nomenclator, dar nefolosit de nicio rețetă
  | 'NBO_PAPER'      // Paper mapat pe nomenclator, dar nefolosit de nicio rețetă
  | 'NORMALIZED'     // materiale normalizate: consum FC pe care rețetarul nu-l poate arăta
  | 'CLEANING'       // curățenie — în afara Food Cost
  | 'OPERATIONAL'    // consumabile de exploatare — în afara Food Cost
  | 'UNIFORMS'       // uniforme — în afara Food Cost
  | 'STATIONERY'     // papetărie — în afara Food Cost
  | 'OTHER'          // recunoscut, dar în afara celorlalte grupe
  | 'UNCLASSIFIED'   // nerecunoscut de nicio regulă — NU e presupus nimic
  | 'UNEXPLAINED';   // fără nicio dovadă care să-l lege de rețete sau nomenclator

export const ORDINE_COMPONENTE: ComponentaBridge[] = [
  'RECIPE_FOOD', 'RECIPE_PAPER', 'NBO_FOOD', 'NBO_PAPER', 'NORMALIZED',
  'CLEANING', 'OPERATIONAL', 'UNIFORMS', 'STATIONERY', 'OTHER',
  'UNCLASSIFIED', 'UNEXPLAINED',
];

export const ETICHETA_COMPONENTA_BRIDGE: Record<ComponentaBridge, string> = {
  RECIPE_FOOD: 'Food din rețete',
  RECIPE_PAPER: 'Paper din rețete',
  NBO_FOOD: 'Food în NBO, fără rețetă',
  NBO_PAPER: 'Paper în NBO, fără rețetă',
  NORMALIZED: 'Materiale normalizate',
  CLEANING: 'Curățenie',
  OPERATIONAL: 'Operațional',
  UNIFORMS: 'Uniforme',
  STATIONERY: 'Papetărie',
  OTHER: 'Altele',
  UNCLASSIFIED: 'Neclasificat',
  UNEXPLAINED: 'Neexplicat',
};

/** Componentele cu o găleată numită și o dovadă — restul e neexplicat sau necunoscut. */
export const COMPONENTE_EXPLICATE: ComponentaBridge[] = [
  'RECIPE_FOOD', 'RECIPE_PAPER', 'NBO_FOOD', 'NBO_PAPER', 'NORMALIZED',
  'CLEANING', 'OPERATIONAL', 'UNIFORMS', 'STATIONERY', 'OTHER',
];

/** Componentele care intră în Food Cost. */
export const COMPONENTE_FC_BRIDGE: ComponentaBridge[] = [
  'RECIPE_FOOD', 'RECIPE_PAPER', 'NBO_FOOD', 'NBO_PAPER', 'NORMALIZED',
];

// ————————————————————————————————————————————————————————— proveniența

/**
 * O contribuție la o componentă = un rând de material din 2.9, cu tot lanțul de dovezi.
 * De aici răspunde managementul la „de ce e cifra asta atâta?": raport → perioadă →
 * restaurant → material → regulă de clasificare → ingredient → rețete.
 */
export interface ContributieBridge {
  componenta: ComponentaBridge;
  /** De ce a intrat exact în această componentă. */
  motiv: string;
  // — proveniența
  raport: 'NBO_29';
  perioadaSursa: string;
  locatie: string | null;
  canal: FCChannelSursa;
  material: string;
  denumire: string;
  categorieBruta: string;
  categorie: FCCategory;
  /** Regula de clasificare care a decis (`null` = nicio regulă → UNCLASSIFIED). */
  regula: string | null;
  sursaClasificare: SursaClasificare;
  /** Legătura cu nomenclatorul, unde există. */
  ingredient: string | null;
  /** Legătura cu rețetarul. */
  areReteta: boolean;
  utilizareInRetete: number;
  // — banii
  lei: number;
  /** Puncte procentuale pe numitorul declarat. */
  pp: number | null;
}

export interface ComponentaBridgeRand {
  componenta: ComponentaBridge;
  eticheta: string;
  lei: number;
  /** Puncte procentuale pe numitor — cifra din care se face drill-down. */
  pp: number | null;
  /** Procent din totalul 2.9. */
  pctDinNbo: number | null;
  nrMateriale: number;
  explicatie: string;
  /** Rândurile de material care compun cifra, sortate descrescător după lei. */
  contributii: ContributieBridge[];
}

// ————————————————————————————————————————————————————————— încrederea

export interface FactorConfidenta {
  factor: 'acoperire_retete' | 'clasificare' | 'mapare' | 'explicat' | 'sursa';
  eticheta: string;
  /** Ponderea în scorul final; ponderile însumează 1. */
  pondere: number;
  /** 0–100. */
  scor: number;
  detaliu: string;
}

/** Scor determinist pe acoperirea datelor — o formulă expusă, nu o apreciere. */
export interface ConfidentaFC {
  scor: number;              // 0–100, rotunjit
  factori: FactorConfidenta[];
  formula: string;
}

// ————————————————————————————————————————————————————————— rezultatul

export interface FCBridge {
  cerere: CerereFC;
  numitor: NumitorFC;

  /** Recipe FC pe cererea dată. */
  recipe: RecipeFC;
  /** Recipe FC pe fiecare canal — Total = InStore + Delivery ca sume. */
  recipePeCanal: Record<FCChannel, RecipeFC>;

  /** Partea de 2.9 a punții e calculabilă pe această cerere? */
  nboDisponibil: boolean;
  motivNbo?: string;
  perioadeSursa: string[];
  /**
   * Compatibilitatea ferestrelor celor două rapoarte care compun cifra. Se raportează
   * ÎNTOTDEAUNA, și când e ACCEPT: ecranul trebuie să poată arăta perioada fiecărei surse,
   * nu doar să afle că ceva e blocat.
   */
  verdictPerioade: VerdictSurse;
  /** Canalul din care provin efectiv rândurile 2.9 incluse. */
  canalSursa: FCChannelSursa;
  randuri: RandMaterialFC[];

  /** Totalul consumului actual din 2.9 pe scopul cerut. */
  nboActual: number;
  /** Partea de 2.9 care intră în Food Cost. */
  nboFoodCost: number;
  /** Teoreticul DECLARAT de 2.9. `null` când raportul nu îl conține — nu se inventează. */
  nboTheoreticalFC: number | null;
  /** nboFoodCost − recipe.cost: variance-ul real de explicat. `null` fără 2.9. */
  difference: number | null;
  /** Teoretic declarat − recipe.cost. `null` când teoreticul lipsește. */
  diferentaTeoretica: number | null;

  componente: ComponentaBridgeRand[];
  explainedAmount: number;
  /** UNEXPLAINED + UNCLASSIFIED: bani fără dovadă SAU fără clasificare. */
  unexplainedAmount: number;
  explainedPct: number | null;
  unexplainedPct: number | null;
  /** Cât din vânzări au rețetă calculabilă (acoperirea Recipe FC). */
  coveragePct: number | null;

  confidence: ConfidentaFC;
  /** Scurtătură: `confidence.scor`. */
  confidenceScore: number;

  complete: boolean;
  motiveIncomplet: string[];
  diagnostice: DiagnosticFC[];
  surse: SursaFC[];
}

// ————————————————————————————————————————————————————————— componenta unui rând

const EXPLICATII_COMPONENTE: Record<ComponentaBridge, string> = {
  RECIPE_FOOD: 'Materie primă alimentară care se regăsește în rețete — partea pe care Recipe FC o explică direct.',
  RECIPE_PAPER: 'Ambalaje care se regăsesc în rețete — explicate direct de rețetar.',
  NBO_FOOD: 'Aliment prezent în nomenclator, dar pe care nicio rețetă nu îl consumă: consum real de Food Cost, '
    + 'cu un gol de rețetar în dreptul lui.',
  NBO_PAPER: 'Ambalaj prezent în nomenclator, dar pe care nicio rețetă nu îl consumă: gol de rețetar, nu material normalizat.',
  NORMALIZED: 'Materiale normalizate: prezente în 2.9, nereprezentate ca atare în rețete (porționate sau '
    + 'reambalate intern). Consum real de Food Cost, pe care rețetarul nu îl poate arăta.',
  CLEANING: 'Curățenie și igienă — consum real, în afara Food Cost.',
  OPERATIONAL: 'Consumabile de exploatare — consum real, în afara Food Cost.',
  UNIFORMS: 'Echipament de lucru — consum real, în afara Food Cost.',
  STATIONERY: 'Papetărie și birotică — consum real, în afara Food Cost.',
  OTHER: 'Recunoscut de reguli, dar în afara celorlalte grupe.',
  UNCLASSIFIED: 'Categorii pe care nicio regulă nu le recunoaște. NU au fost presupuse Food: '
    + 'până la maparea lor explicită stau separat, ca să nu deformeze niciun procent.',
  UNEXPLAINED: 'Food sau Paper fără corespondent în nomenclator: nu există niciun lanț de dovezi care să lege '
    + 'consumul de vreo rețetă. Aici stă partea de variance pe care datele curente nu o pot atribui.',
};

/** Categoria efectivă în vocabularul punții: cu semnul `areIngredient`, care desparte
 *  golul de rețetar (NBO_PAPER) de materialul normalizat. */
const categorieEfectiva = (r: RandMaterialFC): FCCategory =>
  categorieMaterial(r.clasificare, {
    normalizatInSursa: r.normalizatInSursa,
    areReteta: r.areReteta,
    areIngredient: r.areIngredient,
  });

function componentaPentru(r: RandMaterialFC): { componenta: ComponentaBridge; motiv: string } {
  const c = r.categorie;
  const regula = r.clasificare.regula ? `regula „${r.clasificare.regula}"` : 'nicio regulă';
  if (c === 'UNCLASSIFIED') {
    return { componenta: 'UNCLASSIFIED', motiv: `Categoria „${r.categorieBruta}" nu e recunoscută de nicio regulă — nu se presupune nimic.` };
  }
  if (c === 'NORMALIZED') {
    return {
      componenta: 'NORMALIZED',
      motiv: r.normalizatInSursa
        ? 'Marcat normalizat chiar în sursă.'
        : `Ambalaj fără corespondent în nomenclator (${regula}) — reambalat intern, rețetarul nu îl poate arăta.`,
    };
  }
  if (c === 'CLEANING' || c === 'OPERATIONAL' || c === 'UNIFORMS' || c === 'STATIONERY' || c === 'OTHER') {
    return { componenta: c, motiv: `Clasificat ${c} prin ${regula} — consum real, în afara Food Cost.` };
  }
  // FOOD / PAPER — dovada decide
  if (r.areReteta) {
    return {
      componenta: c === 'FOOD' ? 'RECIPE_FOOD' : 'RECIPE_PAPER',
      motiv: `Clasificat ${c} prin ${regula}; mapat pe ingredientul ${r.ingredient}, folosit în ${r.utilizareInRetete} rețete.`,
    };
  }
  if (r.areIngredient) {
    return {
      componenta: c === 'FOOD' ? 'NBO_FOOD' : 'NBO_PAPER',
      motiv: `Clasificat ${c} prin ${regula}; mapat pe ingredientul ${r.ingredient}, dar nicio rețetă nu îl consumă.`,
    };
  }
  return {
    componenta: 'UNEXPLAINED',
    motiv: `Clasificat ${c} prin ${regula}, dar fără corespondent în nomenclator: niciun lanț de dovezi către rețete.`,
  };
}

// ————————————————————————————————————————————————————————— motorul

export function bridgeFC(
  state: AppState,
  ctx: CtxFC,
  cerere: CerereFC,
  reguliUtilizator: RegulaCategorie29[] = [],
): FCBridge {
  const loc = locatieDin(cerere.nivel);
  const luni = luniAtinse(cerere.perioada);
  const interval = `${cerere.perioada.de} → ${cerere.perioada.la}`;

  // — partea de rețete: pe cerere și pe fiecare canal (Total = InStore + Delivery ca sume)
  const recipe = recipeFC(state, ctx, cerere);
  const peCanal = (canal: FCChannel) =>
    canal === cerere.canal ? recipe : recipeFC(state, ctx, { ...cerere, canal });
  const recipePeCanal: Record<FCChannel, RecipeFC> = {
    INSTORE: peCanal('INSTORE'), DELIVERY: peCanal('DELIVERY'), TOTAL: peCanal('TOTAL'),
  };
  const numitor = numitorFC(state, cerere, recipe.netVandut);
  const pp = (lei: number) => (numitor.net > 0 ? (lei / numitor.net) * 100 : null);

  // — scopul 2.9: luni întregi, locația cerută, canalul DOAR dacă sursa îl declară
  const toate = state.materiale29 ?? [];
  // verdictul de compatibilitate a perioadelor, o singură dată pe punte
  const verdictSurse = verdictCombinare(state, COMBINATIE_FC);
  const peLuniSiLoc = toate.filter(m => luni.includes(m.perioada) && (!loc || m.locatie === loc));

  let motivNbo: string | undefined;
  let inScop: Material29[] = [];
  let excluseFaraCanal: Material29[] = [];

  if (!eLunaIntreaga(cerere.perioada)) {
    motivNbo = `Raportul 2.9 este lunar. Perioada ${cerere.perioada.cheie} (${interval}) nu acoperă luni întregi, `
      + 'deci consumul pe material nu i se poate atribui fără a inventa o repartiție pe zile. '
      + 'Partea de rețete rămâne calculată pe perioada cerută.';
  } else if (verdictSurse.blocheaza) {
    // Perioadele DEMONSTRAT diferite: consumul unei ferestre împărțit la vânzările alteia
    // ar da un procent plauzibil și fals. Puntea se declară indisponibilă — partea de rețete
    // rămâne calculată, iar fiecare raport rămâne vizibil în ecranul lui.
    motivNbo = verdictSurse.motiv;
  } else if (!peLuniSiLoc.length) {
    // lipsa datelor se spune ÎNAINTEA lipsei canalului: fără niciun rând, cauza e absența
    // raportului, nu coloana de canal
    motivNbo = toate.length
      ? `Nu există linii 2.9 pe material pentru ${luni.join(', ')}${loc ? ` la restaurantul ${loc}` : ''}.`
      : 'Nu a fost importat niciun raport 2.9 la nivel de material.';
  } else if (cerere.canal !== 'TOTAL' && !peLuniSiLoc.some(m => m.canal)) {
    motivNbo = 'Raportul 2.9 importat nu declară canalul pe nicio linie. Consumul real există doar la nivel '
      + 'de Total; repartizarea lui pe InStore/Delivery ar fi o invenție, nu un calcul.';
  } else if (cerere.canal !== 'TOTAL') {
    // doar rândurile care declară EXPLICIT canalul cerut; restul nu se repartizează
    inScop = peLuniSiLoc.filter(m => m.canal === cerere.canal);
    excluseFaraCanal = peLuniSiLoc.filter(m => !m.canal);
    if (!inScop.length) {
      motivNbo = `Nicio linie 2.9 nu declară explicit canalul ${cerere.canal} pe această perioadă — `
        + 'liniile fără canal nu se repartizează.';
      excluseFaraCanal = [];
    }
  } else {
    inScop = peLuniSiLoc;
  }

  const nboDisponibil = motivNbo === undefined;

  // — rândurile, în vocabularul punții: categoria efectivă folosește și semnul `areIngredient`.
  // Teoreticul se reconstruiește DOAR pe Total: PMIX-ul reconstruit acoperă ambele canale,
  // deci pe o vedere pe canal ar compara actualul unui canal cu teoreticul amândurora.
  const eTotal = cerere.canal === 'TOTAL';
  const teoreticPeIngredient = nboDisponibil && eTotal
    ? teoreticDinRetete(state, ctx, luni, loc) : new Map<string, number>();
  const teoreticRand = nboDisponibil && eTotal
    ? teoreticPeRand(state, ctx, luni, [...new Set(inScop.map(m => m.locatie))]) : new Map<string, number>();
  const randuri = randuriMaterialFC(ctx, inScop, teoreticRand, reguliUtilizator)
    .map(r => {
      const categorie = categorieEfectiva(r);
      return { ...r, categorie, normalizat: categorie === 'NORMALIZED' };
    });

  // — fiecare leu într-o singură componentă; nicio ajustare artificială
  const acc = new Map<ComponentaBridge, ContributieBridge[]>();
  for (const r of randuri) {
    const { componenta, motiv } = componentaPentru(r);
    const c: ContributieBridge = {
      componenta, motiv,
      raport: 'NBO_29', perioadaSursa: r.perioadaSursa, locatie: r.locatie, canal: r.canal,
      material: r.material, denumire: r.denumire,
      categorieBruta: r.categorieBruta, categorie: r.categorie,
      regula: r.clasificare.regula, sursaClasificare: r.clasificare.sursa,
      ingredient: r.ingredient, areReteta: r.areReteta, utilizareInRetete: r.utilizareInRetete,
      lei: r.costActual, pp: pp(r.costActual),
    };
    acc.set(componenta, [...(acc.get(componenta) ?? []), c]);
  }

  const nboActual = randuri.reduce((s, r) => s + r.costActual, 0);
  const pctDinNbo = (lei: number) => (nboActual > 0 ? (lei / nboActual) * 100 : null);
  const componente: ComponentaBridgeRand[] = ORDINE_COMPONENTE.map(componenta => {
    const contributii = (acc.get(componenta) ?? []).sort((a, b) => b.lei - a.lei);
    const lei = contributii.reduce((s, c) => s + c.lei, 0);
    return {
      componenta, eticheta: ETICHETA_COMPONENTA_BRIDGE[componenta],
      lei, pp: pp(lei), pctDinNbo: pctDinNbo(lei),
      nrMateriale: contributii.length,
      explicatie: EXPLICATII_COMPONENTE[componenta],
      contributii,
    };
  });
  const lei = (c: ComponentaBridge) => componente.find(x => x.componenta === c)!.lei;

  const explainedAmount = COMPONENTE_EXPLICATE.reduce((s, c) => s + lei(c), 0);
  const unexplainedAmount = lei('UNEXPLAINED') + lei('UNCLASSIFIED');
  const nboFoodCost = COMPONENTE_FC_BRIDGE.reduce((s, c) => s + lei(c), 0);

  const cuTeoretic = inScop.filter(m => m.costTeoretic != null);
  const nboTheoreticalFC = cuTeoretic.length ? cuTeoretic.reduce((s, m) => s + (m.costTeoretic ?? 0), 0) : null;

  // — canalul din care provin EFECTIV rândurile incluse: se derivă din rânduri, nu din cerere.
  // Un Total construit doar din linii InStore se declară InStore, nu Total.
  const canaleRanduri = new Set(inScop.map(m => m.canal ?? 'UNKNOWN'));
  const canalSursa: FCChannelSursa =
    !nboDisponibil || !inScop.length || canaleRanduri.has('UNKNOWN') ? 'UNKNOWN'
    : canaleRanduri.size === 2 ? 'TOTAL'
    : [...canaleRanduri][0] as FCChannelSursa;

  // — diagnostice: cele comune pe material + cele proprii punții
  const diagnostice = nboDisponibil ? diagnosticeMaterial(randuri, ctx, teoreticPeIngredient, loc) : [];

  if (nboDisponibil) {
    // luni cerute fără niciun rând 2.9 — puntea pe ele nu există, nu se interpolează
    const luniFara = luni.filter(l => !inScop.some(m => m.perioada === l));
    if (luniFara.length) {
      diagnostice.push({
        cod: 'LUNA_FARA_29', nivel: 'BLOCANT',
        titlu: 'Luni cerute fără raport 2.9 pe material',
        detaliu: `${luniFara.join(', ')}: puntea acoperă doar lunile cu date — nu se interpolează nimic pe restul.`,
        actiune: 'Importă raportul 2.9 pe material pentru lunile lipsă.',
        nrElemente: luniFara.length, lei: 0, exemple: luniFara,
      });
    }

    // restaurante cu vânzări în perioadă, absente din 2.9 — doar la nivel de companie
    if (!loc) {
      const in29 = new Set(inScop.map(m => m.locatie).filter((x): x is string => x !== null));
      const vanzariPeLoc = new Map<string, number>();
      for (const v of state.vanzari) {
        if (v.data >= cerere.perioada.de && v.data <= cerere.perioada.la && !in29.has(v.locatie)) {
          vanzariPeLoc.set(v.locatie, (vanzariPeLoc.get(v.locatie) ?? 0) + v.net);
        }
      }
      if (vanzariPeLoc.size && in29.size) {
        const elemente = [...vanzariPeLoc.entries()].sort((a, b) => b[1] - a[1]);
        diagnostice.push({
          cod: 'RESTAURANT_FARA_29', nivel: 'ATENTIE',
          titlu: 'Restaurante cu vânzări, dar fără linii 2.9',
          detaliu: 'Au vândut în perioadă, dar raportul 2.9 pe material nu le conține: consumul lor real lipsește '
            + 'din punte, deși vânzările lor intră în numitor.',
          actiune: 'Verifică exportul 2.9 — probabil raportul e parțial.',
          nrElemente: elemente.length,
          lei: elemente.reduce((s, [, v]) => s + v, 0),
          exemple: elemente.slice(0, 8).map(([l, v]) => `${l} (${Math.round(v)} lei vânzări)`),
        });
      }
    }

    // goluri ale sursei: teoretic nedeclarat, canal lipsă pe vederea pe canal
    const goluri: { nume: string; lei: number }[] = [];
    const faraTeoretic = inScop.filter(m => m.costTeoretic == null);
    if (faraTeoretic.length && faraTeoretic.length < inScop.length) {
      goluri.push({
        nume: `cost teoretic nedeclarat pe ${faraTeoretic.length} din ${inScop.length} linii`,
        lei: faraTeoretic.reduce((s, m) => s + m.costActual, 0),
      });
    }
    if (excluseFaraCanal.length) {
      goluri.push({
        nume: `${excluseFaraCanal.length} linii fără canal declarat, excluse din vederea pe ${cerere.canal}`,
        lei: excluseFaraCanal.reduce((s, m) => s + m.costActual, 0),
      });
    }
    if (eTotal && (canalSursa === 'INSTORE' || canalSursa === 'DELIVERY')) {
      goluri.push({
        nume: `toate liniile 2.9 provin din canalul ${canalSursa} — Totalul nu conține consumul celuilalt canal`,
        lei: nboActual,
      });
    }
    if (goluri.length) {
      diagnostice.push({
        cod: 'SURSA_INCOMPLETA', nivel: 'ATENTIE',
        titlu: 'Raportul 2.9 e incomplet pe această vedere',
        detaliu: 'Sursa nu declară tot ce ar trebui: golurile de mai jos limitează ce poate afirma puntea.',
        actiune: 'Reexportă raportul cu coloanele complete sau acceptă limitele declarate.',
        nrElemente: goluri.length,
        lei: goluri.reduce((s, g) => s + g.lei, 0),
        exemple: goluri.map(g => g.nume),
      });
    }
  }

  // — încrederea: formulă deterministă pe acoperirea datelor, cu factorii expuși
  const randuriFC = randuri.filter(r => r.categorie === 'FOOD' || r.categorie === 'PAPER');
  const leiFC = randuriFC.reduce((s, r) => s + r.costActual, 0);
  const leiFCMapate = randuriFC.filter(r => r.areIngredient).reduce((s, r) => s + r.costActual, 0);
  const leiCuTeoretic = cuTeoretic.reduce((s, m) => s + m.costActual, 0);
  const explainedPct = nboActual > 0 ? (explainedAmount / nboActual) * 100 : null;
  const fara29 = (eticheta: string): string => `${eticheta} — 0: partea de 2.9 e indisponibilă`;
  // fiecare factor e o acoperire 0–100 prin contract; rândurile de storno (valori negative)
  // pot împinge rapoartele de sume în afara intervalului, deci se mărginesc explicit
  const marg = (x: number) => Math.min(100, Math.max(0, x));

  const factori: FactorConfidenta[] = [
    {
      factor: 'acoperire_retete', eticheta: 'Acoperirea rețetelor', pondere: 0.25,
      scor: marg(recipe.acoperirePct ?? 0),
      detaliu: recipe.acoperirePct !== null
        ? `${recipe.acoperirePct.toFixed(1)}% din vânzările nete au rețetă calculabilă.`
        : 'Nu există vânzări pe perioada cerută.',
    },
    {
      factor: 'clasificare', eticheta: 'Clasificarea 2.9', pondere: 0.25,
      scor: marg(!nboDisponibil ? 0 : nboActual > 0 ? (1 - lei('UNCLASSIFIED') / nboActual) * 100 : 0),
      detaliu: !nboDisponibil ? fara29('Clasificarea')
        : `${Math.round(lei('UNCLASSIFIED'))} lei din ${Math.round(nboActual)} stau pe categorii nerecunoscute.`,
    },
    {
      factor: 'mapare', eticheta: 'Maparea pe nomenclator', pondere: 0.2,
      scor: marg(!nboDisponibil ? 0 : leiFC > 0 ? (leiFCMapate / leiFC) * 100 : nboActual > 0 ? 100 : 0),
      detaliu: !nboDisponibil ? fara29('Maparea')
        : leiFC > 0
          ? `${Math.round(leiFCMapate)} din ${Math.round(leiFC)} lei Food/Paper au corespondent în nomenclator.`
          : 'Niciun material Food/Paper de mapat.',
    },
    {
      factor: 'explicat', eticheta: 'Partea explicată a punții', pondere: 0.2,
      scor: marg(!nboDisponibil ? 0 : explainedPct ?? 0),
      detaliu: !nboDisponibil ? fara29('Explicarea')
        : `${explainedPct?.toFixed(1) ?? '0'}% din consumul 2.9 stă în componente numite, cu dovadă.`,
    },
    {
      factor: 'sursa', eticheta: 'Completitudinea sursei', pondere: 0.1,
      scor: marg(!nboDisponibil ? 0 : nboActual > 0 ? (leiCuTeoretic / nboActual) * 100 : 0),
      detaliu: !nboDisponibil ? fara29('Sursa')
        : `${Math.round(leiCuTeoretic)} din ${Math.round(nboActual)} lei au costul teoretic declarat chiar în raport.`,
    },
  ];
  const confidence: ConfidentaFC = {
    scor: Math.round(factori.reduce((s, f) => s + f.pondere * f.scor, 0)),
    factori,
    formula: 'scor = Σ pondere × factor: 0.25×acoperire_retete + 0.25×clasificare + 0.20×mapare + 0.20×explicat + 0.10×sursa. '
      + 'Fiecare factor e o acoperire măsurată pe date (0–100), nu o apreciere.',
  };

  // — completitudinea: puntea e completă doar când fiecare leu are dovadă și clasificare
  const motiveIncomplet: string[] = [];
  if (!nboDisponibil) motiveIncomplet.push(motivNbo!);
  if (lei('UNEXPLAINED') !== 0) {
    motiveIncomplet.push(`${Math.round(lei('UNEXPLAINED'))} lei rămân neexplicați — fără lanț de dovezi către rețete.`);
  }
  if (lei('UNCLASSIFIED') !== 0) {
    motiveIncomplet.push(`${Math.round(lei('UNCLASSIFIED'))} lei stau pe categorii nerecunoscute.`);
  }
  const faraMapare = randuri.filter(r => trebuieMapat(r) && !r.areIngredient);
  if (faraMapare.length) {
    motiveIncomplet.push(`${faraMapare.length} materiale de Food Cost nu au corespondent în nomenclator.`);
  }
  if (nboDisponibil && nboTheoreticalFC === null) {
    motiveIncomplet.push(eTotal
      ? 'Raportul 2.9 nu declară costul teoretic pe material: variance-ul se poate calcula '
        + 'doar față de teoreticul reconstruit din rețete × PMIX.'
      : 'Raportul 2.9 nu declară costul teoretic pe material, iar pe o vedere pe canal teoreticul '
        + 'nu se poate reconstrui din PMIX (reconstrucția acoperă ambele canale): variance-ul pe material rămâne necunoscut.');
  }
  if (nboDisponibil && recipe.netFaraReteta > 0) {
    motiveIncomplet.push(`${Math.round(recipe.netFaraReteta)} lei din vânzări provin de la produse fără rețetă: `
      + 'partea teoretică a punții nu le acoperă.');
  }
  if (excluseFaraCanal.length) {
    motiveIncomplet.push(`${excluseFaraCanal.length} linii 2.9 fără canal declarat au fost excluse din vederea pe canal.`);
  }
  const blocante = diagnostice.filter(d => d.nivel === 'BLOCANT');
  if (blocante.length) {
    motiveIncomplet.push(`${blocante.length} diagnostice blocante de calitate a datelor.`);
  }

  const surse: SursaFC[] = [
    ...recipe.surse,
    ...(nboDisponibil ? [{
      raport: 'NBO_29' as const, randuri: inScop.length, interval,
      nota: `material · perioade sursă ${luni.join(', ')} · canal ${canalSursa === 'UNKNOWN' ? 'necunoscut' : canalSursa}`,
    }] : []),
  ];

  return {
    cerere, numitor, recipe, recipePeCanal,
    nboDisponibil, ...(motivNbo !== undefined ? { motivNbo } : {}),
    perioadeSursa: [...new Set(inScop.map(m => m.perioada))].sort(),
    verdictPerioade: verdictSurse,
    canalSursa, randuri,
    nboActual, nboFoodCost, nboTheoreticalFC,
    difference: nboDisponibil ? nboFoodCost - recipe.cost : null,
    diferentaTeoretica: nboTheoreticalFC !== null ? nboTheoreticalFC - recipe.cost : null,
    componente,
    explainedAmount, unexplainedAmount,
    explainedPct, unexplainedPct: nboActual > 0 ? (unexplainedAmount / nboActual) * 100 : null,
    coveragePct: recipe.acoperirePct,
    confidence, confidenceScore: confidence.scor,
    complete: motiveIncomplet.length === 0,
    motiveIncomplet,
    diagnostice: sorteazaDiagnostice(diagnostice),
    surse,
  };
}

// ————————————————————————————————————————————————————————— drill-down

/**
 * Răspunsul la „de ce e această componentă atâtea puncte procentuale?" —
 * rândurile de material care o compun, cu tot lanțul de dovezi al fiecăruia.
 */
export function deUndeVine(b: FCBridge, componenta: ComponentaBridge): ComponentaBridgeRand {
  return b.componente.find(c => c.componenta === componenta)!;
}

/** Rezumat într-o linie, pentru jurnale. */
export const descrieBridge = (b: FCBridge) =>
  b.nboDisponibil
    ? `${b.cerere.perioada.cheie} · 2.9 ${b.nboActual.toFixed(0)} lei · explicat ${b.explainedPct?.toFixed(1) ?? '—'}% · `
      + `încredere ${b.confidenceScore} · complet: ${b.complete ? 'da' : 'nu'}`
    : `${b.cerere.perioada.cheie} · doar Recipe FC (${b.recipe.cost.toFixed(0)} lei) — ${b.motivNbo}`;
