// Puntea la nivel de MATERIAL între raportul 2.9 și Food Cost-ul din rețete × PMIX.
//
// Ce rezolvă: până acum 2.9 venea pe categorie, deci întrebarea „ce s-a consumat și nu apare
// în nicio rețetă" nu avea răspuns, iar diferența dintre teoretic și real rămânea o singură
// cifră opacă. Cu materialul, fiecare leu din 2.9 primește o găleată numită, iar ce nu poate
// fi atribuit se raportează ca atare.
//
// Reguli care nu se încalcă:
//  · puntea NU se forțează la 100% — `unexplainedAmount` există și e afișat;
//  · `complete: false` ori de câte ori dovada la nivel de material e insuficientă;
//  · nimic nu cade tăcut pe FOOD: o categorie nerecunoscută rămâne UNCLASSIFIED;
//  · 2.9 nu are canal → canalul sursă este UNKNOWN, nu se repartizează pe InStore/Delivery;
//  · 2.9 e lunar → nu se fabrică valori săptămânale din date lunare;
//  · perioada sursă se păstrează pe fiecare rând.
import { consumuriInterval, norm, pretCurent } from './engine';
import type { AppState, Material29, UMCod } from './types';
import { fereastraRand, selecteaza29, type Fereastra29 } from './surse-29';
import {
  locatieDin, luniAtinse,
  type CerereFC, type CtxFC, type FCChannelSursa, type SursaFC,
} from './fc-domeniu';
import {
  categorieMaterial, clasificaCategorie29, esteFC, esteOperational,
  type Clasificare29, type FCCategory, type RegulaCategorie29,
} from './fc-clasificare';
import { recipeFC, type RecipeFC } from './fc-core';

// ————————————————————————————————————————————————————————— rândul de material

export interface RandMaterialFC {
  material: string;
  denumire: string;
  /** Categoria brută, exact cum vine în raport. */
  categorieBruta: string;
  /** Categoria efectivă, după clasificare și după semnele din date. */
  categorie: FCCategory;
  clasificare: Clasificare29;
  locatie: string | null;
  /** Perioada SURSĂ (AAAA-LL), păstrată ca atare. */
  perioadaSursa: string;
  /** Canalul declarat explicit în sursă; 2.9 obișnuit nu îl conține → UNKNOWN. */
  canal: FCChannelSursa;
  cant: number | null;
  um: UMCod | null;
  costActual: number;
  costTeoretic: number | null;
  /** actual − teoretic. `null` când teoreticul nu se poate stabili. */
  variance: number | null;
  normalizat: boolean;
  /** Marcajul brut din sursă, păstrat separat de categoria efectivă. */
  normalizatInSursa: boolean;
  /** Materialul are corespondent în nomenclatorul de ingrediente. */
  areIngredient: boolean;
  ingredient: string | null;
  /** Ingredientul apare în cel puțin o rețetă. */
  areReteta: boolean;
  /** În câte rețete apare. */
  utilizareInRetete: number;
  arePret: boolean;
  sursa: SursaFC['raport'];
}

// ————————————————————————————————————————————————————————— diagnostice

export type CodDiagnostic =
  | 'MATERIAL_FARA_MAPARE' | 'MATERIAL_FARA_RETETA' | 'MATERIAL_FARA_PRET'
  | 'CATEGORIE_NECUNOSCUTA' | 'MATERIAL_NORMALIZAT' | 'IN_NBO_FARA_RETETA'
  | 'INGREDIENT_FARA_NBO' | 'MAPARE_DUBLA' | 'LIPSA_LOCATIE' | 'LIPSA_PERIOADA' | 'GRANULARITATE_MIXTA'
  // folosite de puntea canonică (fc-bridge):
  | 'RESTAURANT_FARA_29' | 'LUNA_FARA_29' | 'SURSA_INCOMPLETA';

export interface DiagnosticFC {
  cod: CodDiagnostic;
  nivel: 'BLOCANT' | 'ATENTIE' | 'INFO';
  titlu: string;
  detaliu: string;
  actiune: string;
  nrElemente: number;
  lei: number;
  exemple: string[];
}

// ————————————————————————————————————————————————————————— puntea

/** Găleata în care intră fiecare leu din 2.9. A–F, în ordinea din specificație. */
export type GaleataBridge =
  | 'RECIPE_FOOD' | 'RECIPE_PAPER' | 'NORMALIZED_PAPER'
  | 'OPERATIONAL' | 'UNCLASSIFIED' | 'UNEXPLAINED';

export const ETICHETA_GALEATA: Record<GaleataBridge, string> = {
  RECIPE_FOOD: 'A · Food din rețete',
  RECIPE_PAPER: 'B · Paper din rețete',
  NORMALIZED_PAPER: 'C · Materiale normalizate',
  OPERATIONAL: 'D · Operațional',
  UNCLASSIFIED: 'E · Neclasificat',
  UNEXPLAINED: 'F · Neexplicat',
};

export interface RandBridge {
  galeata: GaleataBridge;
  eticheta: string;
  lei: number;
  pct: number | null;         // % din totalul 2.9
  nrMateriale: number;
  explicatie: string;
}

export interface ReconciliationMaterialFC {
  cerere: CerereFC;
  disponibil: boolean;
  motivIndisponibil?: string;
  /** Perioadele sursă efectiv folosite (lunile din 2.9). */
  perioadeSursa: string[];
  canalSursa: FCChannelSursa;

  randuri: RandMaterialFC[];

  /** Suma costurilor actuale din 2.9 pe scopul cerut. */
  nboActual: number;
  /** Suma costurilor teoretice declarate în 2.9. `null` când raportul nu le conține. */
  nboTeoretic: number | null;
  /** Partea de 2.9 care intră în Food Cost (A+B+C). */
  nboFoodCost: number;

  recipe: RecipeFC;
  /** NBO teoretic − Recipe FC. `null` când 2.9 nu declară teoreticul. */
  diferentaTeoreticVsRecipe: number | null;
  /** NBO Food Cost real − Recipe FC. */
  diferentaActualVsRecipe: number;

  bridge: RandBridge[];
  explainedAmount: number;
  unexplainedAmount: number;
  explainedPct: number | null;
  unexplainedPct: number | null;
  complete: boolean;
  motiveIncomplet: string[];

  diagnostice: DiagnosticFC[];
  surse: SursaFC[];
}

// ————————————————————————————————————————————————————————— maparea material → ingredient

interface Mapare { ingredient: string | null; areReteta: boolean; utilizari: number; arePret: boolean; }

/** Câte rețete folosesc fiecare ingredient (pe toate versiunile, ca să nu ratăm reformulările). */
function utilizariPeIngredient(ctx: CtxFC): Map<string, number> {
  const rez = new Map<string, number>();
  for (const r of ctx.retete.values()) {
    const vazute = new Set<string>();
    for (const v of r.versiuni) for (const l of v.linii) vazute.add(l.comp);
    for (const c of vazute) rez.set(c, (rez.get(c) ?? 0) + 1);
  }
  return rez;
}

/**
 * Ingredientul din nomenclator pentru un material 2.9 — singura regulă de identificare, folosită
 * la import, în punte și la verdictul de reimport: codul de material = codul ingredientului;
 * altfel denumirea, normalizată; altfel un alias aprobat în coada comună (pe cod sau pe nume).
 * Fără potrivire → `null`: materialul merge în coadă, nu se creează și nu se ghicește.
 */
export function identificaIngredient(
  ingrediente: Iterable<{ cod: string; denumire: string; aliasuri?: string[] }>, material: string, denumire: string,
): string | null {
  const lista = [...ingrediente];
  const direct = material ? lista.find(i => i.cod === material) : undefined;
  if (direct) return direct.cod;
  const k = norm(denumire);
  const peNume = k ? lista.find(i => norm(i.denumire) === k) : undefined;
  if (peNume) return peNume.cod;
  const peAlias = lista.find(i => (i.aliasuri ?? []).some(a => a === material || (k !== '' && norm(a) === k)));
  return peAlias ? peAlias.cod : null;
}

function mapeaza(material: Material29, ctx: CtxFC, utilizari: Map<string, number>, dupaNume: Map<string, string>): Mapare {
  void dupaNume;
  const cod = identificaIngredient(ctx.ingrediente.values(), material.material, material.denumire);
  if (!cod) return { ingredient: null, areReteta: false, utilizari: 0, arePret: false };
  const ing = ctx.ingrediente.get(cod)!;
  const n = utilizari.get(cod) ?? 0;
  return { ingredient: cod, areReteta: n > 0, utilizari: n, arePret: ing.preturi.length > 0 && pretCurent(ing) > 0 };
}

// ————————————————————————————————————————————————————— piesele refolosibile ale motorului
// (folosite și de puntea canonică din fc-bridge — aceleași rânduri, aceleași diagnostice)

/**
 * Teoreticul reconstruit din rețete × PMIX (pe Total), pe FERESTRELE rapoartelor 2.9 alese și
 * pe locația cerută. Fereastra, nu luna: teoreticul unui 2.9 săptămânal e al săptămânii lui.
 */
export function teoreticDinRetete(state: AppState, ctx: CtxFC, ferestre: Fereastra29[], loc: string | undefined): Map<string, number> {
  const rez = new Map<string, number>();
  for (const f of ferestre) {
    for (const [cod, v] of consumuriInterval(state, ctx, f.de, f.la, loc)) {
      rez.set(cod, (rez.get(cod) ?? 0) + v.valoare);
    }
  }
  return rez;
}

/**
 * Teoreticul pe (lună × locație), cu cheia `lună|locație|ingredient` — rândul unui restaurant
 * primește teoreticul RESTAURANTULUI lui din luna lui, nu totalul scopului. Fără asta, două
 * rânduri ale aceluiași ingredient (două restaurante, două luni) ar purta fiecare teoreticul
 * întregului scop, iar variance-ul pe rând ar număra teoreticul de două ori.
 * Locația `null` înseamnă rând agregat → teoreticul întregii rețele.
 */
export function teoreticPeRand(
  state: AppState, ctx: CtxFC, ferestre: Fereastra29[], locatii: (string | null)[],
): Map<string, number> {
  const rez = new Map<string, number>();
  for (const f of ferestre) {
    for (const lc of new Set(locatii)) {
      for (const [cod, v] of consumuriInterval(state, ctx, f.de, f.la, lc ?? undefined)) {
        rez.set(`${f.de}|${f.la}|${lc ?? ''}|${cod}`, v.valoare);
      }
    }
  }
  return rez;
}

/**
 * Construiește rândurile de material: clasificare (nimic nu cade tăcut pe FOOD), mapare pe
 * nomenclator și rețete, teoreticul declarat sau reconstruit. Nu filtrează nimic — primește
 * exact materialele pe care apelantul le-a pus în scop.
 *
 * `teoreticRand` are cheia `lună|locație|ingredient` (vezi `teoreticPeRand`); o hartă goală
 * înseamnă „nu reconstrui" (ex. vederile pe canal, unde PMIX-ul reconstruit e pe Total).
 * Reconstruirea se aplică DOAR când exact un rând al aceleiași (luni, locații) se mapează pe
 * ingredient — altfel același teoretic s-ar atribui fiecărui rând și s-ar număra de N ori;
 * cazul ambiguu rămâne `null` și e semnalat separat de MAPARE_DUBLA.
 */
export function randuriMaterialFC(
  ctx: CtxFC,
  materiale: Material29[],
  teoreticRand: Map<string, number>,
  reguliUtilizator: RegulaCategorie29[] = [],
): RandMaterialFC[] {
  const utilizari = utilizariPeIngredient(ctx);
  const dupaNume = new Map<string, string>();
  for (const i of ctx.ingrediente.values()) dupaNume.set(norm(i.denumire), i.cod);

  // câte rânduri ale aceleiași (ferestre, locații) se mapează pe fiecare ingredient
  const cheiaRand = (m: Material29, ingredient: string) => { const f = fereastraRand(m); return `${f.de}|${f.la}|${m.locatie ?? ''}|${ingredient}`; };
  const mapari = materiale.map(m => mapeaza(m, ctx, utilizari, dupaNume));
  const cateOri = new Map<string, number>();
  materiale.forEach((m, i) => {
    const ing = mapari[i].ingredient;
    if (ing) cateOri.set(cheiaRand(m, ing), (cateOri.get(cheiaRand(m, ing)) ?? 0) + 1);
  });

  return materiale.map((m, i) => {
    const cls = clasificaCategorie29(m.categorie, reguliUtilizator);
    const mp = mapari[i];
    const categorie = categorieMaterial(cls, { normalizatInSursa: m.normalizat, areReteta: mp.areReteta });
    const teoretic = m.costTeoretic
      ?? (mp.ingredient && cateOri.get(cheiaRand(m, mp.ingredient)) === 1
        ? teoreticRand.get(cheiaRand(m, mp.ingredient)) ?? null
        : null);
    return {
      material: m.material, denumire: m.denumire,
      categorieBruta: m.categorie, categorie, clasificare: cls,
      locatie: m.locatie, perioadaSursa: m.perioada,
      canal: m.canal ?? ('UNKNOWN' as const),
      cant: m.cant ?? null, um: m.um ?? null,
      costActual: m.costActual, costTeoretic: teoretic,
      variance: teoretic != null ? m.costActual - teoretic : null,
      normalizat: categorie === 'NORMALIZED',
      normalizatInSursa: m.normalizat === true,
      areIngredient: mp.ingredient !== null, ingredient: mp.ingredient,
      areReteta: mp.areReteta, utilizareInRetete: mp.utilizari, arePret: mp.arePret,
      sursa: 'NBO_29' as const,
    };
  });
}

/** Materialele care TREBUIE să aibă corespondent în nomenclator: doar Food și Paper. */
export const trebuieMapat = (r: RandMaterialFC) => r.categorie === 'FOOD' || r.categorie === 'PAPER';

/** Ordinea de afișare: blocantele primele, apoi după bani. */
export const sorteazaDiagnostice = (d: DiagnosticFC[]): DiagnosticFC[] =>
  [...d].sort((a, b) => {
    const o = { BLOCANT: 0, ATENTIE: 1, INFO: 2 };
    return o[a.nivel] - o[b.nivel] || b.lei - a.lei;
  });

/**
 * Diagnosticele de calitate a datelor pe rândurile de material date — nesortate;
 * apelantul le poate completa cu ale lui și le sortează cu `sorteazaDiagnostice`.
 */
export function diagnosticeMaterial(
  randuri: RandMaterialFC[],
  ctx: CtxFC,
  teoreticPeIngredient: Map<string, number>,
  loc: string | undefined,
): DiagnosticFC[] {
  const diagnostice: DiagnosticFC[] = [];
  const adauga = (
    cod: CodDiagnostic, nivel: DiagnosticFC['nivel'], titlu: string, detaliu: string, actiune: string,
    elemente: { nume: string; lei: number }[],
  ) => {
    if (!elemente.length) return;
    diagnostice.push({
      cod, nivel, titlu, detaliu, actiune,
      nrElemente: elemente.length,
      lei: elemente.reduce((s, e) => s + e.lei, 0),
      exemple: elemente.sort((a, b) => b.lei - a.lei).slice(0, 8).map(e => e.nume),
    });
  };
  const el = (rs: RandMaterialFC[]) => rs.map(r => ({ nume: `${r.denumire} (${r.material})`, lei: r.costActual }));

  // se cere mapare DOAR pentru materialele care ar trebui să fie ingrediente. Curățenia,
  // uniformele sau papetăria nu au ce căuta în nomenclatorul de ingrediente, iar un material
  // normalizat tocmai prin asta se definește: nu are corespondent în rețetar.
  const faraMapare = randuri.filter(r => trebuieMapat(r) && !r.areIngredient);
  adauga('MATERIAL_FARA_MAPARE', 'BLOCANT', 'Materiale de Food Cost fără corespondent în nomenclator',
    'Nu se pot lega de niciun ingredient, deci nici de vreo rețetă: costul lor cade în „Neexplicat".',
    'Adaugă ingredientele în nomenclator cu același cod ca în NBO, sau mapează-le pe cele existente.',
    el(faraMapare));

  adauga('MATERIAL_FARA_RETETA', 'ATENTIE', 'Materiale mapate, dar nefolosite în nicio rețetă',
    'Ingredientul există în nomenclator, însă nicio rețetă nu îl consumă — fie lipsește din rețete, fie e normalizat.',
    'Completează rețetele care îl folosesc sau confirmă că e material normalizat.',
    el(randuri.filter(r => r.areIngredient && !r.areReteta)));

  adauga('MATERIAL_FARA_PRET', 'ATENTIE', 'Materiale fără preț în nomenclator',
    'Fără preț, costul teoretic al ingredientului nu se poate calcula, deci variance-ul lui rămâne necunoscut.',
    'Importă lista de prețuri sau completează prețul în Master Data.',
    el(randuri.filter(r => r.areIngredient && !r.arePret)));

  adauga('CATEGORIE_NECUNOSCUTA', 'BLOCANT', 'Categorii 2.9 pe care nicio regulă nu le recunoaște',
    'Aceste linii NU au fost presupuse Food. Rămân neclasificate și stau separat în punte, '
    + 'ca să nu deformeze Food Cost-ul.',
    'Adaugă o regulă de clasificare pentru fiecare categorie de mai jos.',
    randuri.filter(r => r.categorie === 'UNCLASSIFIED')
      .map(r => ({ nume: `${r.categorieBruta} — ${r.denumire}`, lei: r.costActual })));

  adauga('MATERIAL_NORMALIZAT', 'INFO', 'Materiale normalizate identificate',
    'Prezente în 2.9, nereprezentate ca atare în rețete. Intră în Food Cost, dar rețetarul nu le arată.',
    'Nicio acțiune obligatorie — sunt separate tocmai ca să fie vizibile.',
    el(randuri.filter(r => r.categorie === 'NORMALIZED')));

  adauga('IN_NBO_FARA_RETETA', 'ATENTIE', 'Prezente în NBO, absente din rețetar',
    'Materiale de Food Cost consumate real, pe care rețetarul nu le explică deloc.',
    'Verifică dacă lipsește o rețetă sau dacă materialul e normalizat.',
    el(randuri.filter(r => esteFC(r.categorie) && !r.areReteta)));

  const materialeMapate = new Set(randuri.map(r => r.ingredient).filter((x): x is string => x !== null));
  adauga('INGREDIENT_FARA_NBO', 'ATENTIE', 'Ingrediente consumate teoretic, absente din 2.9',
    'Rețetele și PMIX-ul spun că s-au consumat, dar raportul 2.9 nu le conține — semn de mapare incompletă '
    + 'sau de raport parțial.',
    'Verifică exportul 2.9 și maparea codurilor.',
    [...teoreticPeIngredient.entries()]
      .filter(([cod, v]) => !materialeMapate.has(cod) && v > 0)
      .map(([cod, v]) => ({ nume: `${ctx.ingrediente.get(cod)?.denumire ?? cod} (${cod})`, lei: v })));

  // dublura se caută în ACELAȘI restaurant și aceeași perioadă: două restaurante care consumă
  // același ingredient nu sunt o dublură, ci exact forma normală a raportului pe unități
  const peIngredient = new Map<string, RandMaterialFC[]>();
  for (const r of randuri) {
    if (!r.ingredient) continue;
    const k = `${r.ingredient}|${r.locatie ?? ''}|${r.perioadaSursa}`;
    peIngredient.set(k, [...(peIngredient.get(k) ?? []), r]);
  }
  adauga('MAPARE_DUBLA', 'BLOCANT', 'Mai multe materiale mapate pe același ingredient',
    'Costul lor s-ar putea număra de două ori la comparația cu teoreticul.',
    'Verifică maparea: fiecare ingredient trebuie să aibă un singur material corespondent pe perioadă.',
    [...peIngredient.entries()].filter(([, rs]) => rs.length > 1)
      .map(([k, rs]) => ({ nume: `${k.split('|')[0]} ← ${rs.map(r => r.material).join(', ')}`, lei: rs.reduce((s, r) => s + r.costActual, 0) })));

  adauga('LIPSA_LOCATIE', 'BLOCANT', 'Linii 2.9 fără restaurant',
    'Nu pot fi atribuite unui restaurant, deci nu apar în analiza pe unitate, deși contează în total.',
    'Reimportă raportul cu coloana de restaurant completată.',
    el(randuri.filter(r => !r.locatie)));

  // granularitate mixtă — doar la nivel de companie, unde ambele forme se însumează
  if (!loc) {
    const faraLoc = randuri.filter(r => !r.locatie);
    const cuLoc = new Set(randuri.filter(r => r.locatie).map(r => r.material));
    if (faraLoc.length && cuLoc.size) {
      const suprapuse = faraLoc.filter(r => cuLoc.has(r.material));
      const relevante = suprapuse.length ? suprapuse : faraLoc;
      diagnostice.push({
        cod: 'GRANULARITATE_MIXTA',
        nivel: suprapuse.length ? 'BLOCANT' : 'ATENTIE',
        titlu: 'Perioada conține atât linii pe restaurant, cât și linii fără restaurant',
        detaliu: suprapuse.length
          ? `${suprapuse.length} materiale apar în AMBELE forme: consumul lor e numărat de două ori la nivel de companie.`
          : 'Cele două forme se însumează la nivel de companie; dacă provin din același raport exportat '
            + 'de două ori (agregat și pe restaurant), consumul e numărat de două ori.',
        actiune: 'Păstrează o singură formă pe perioadă: reimportă fie raportul agregat, fie fișierele pe restaurant.',
        nrElemente: relevante.length,
        lei: relevante.reduce((s, r) => s + r.costActual, 0),
        exemple: relevante.slice(0, 8).map(r => `${r.denumire} (${r.material})`),
      });
    }
  }

  adauga('LIPSA_PERIOADA', 'BLOCANT', 'Linii 2.9 fără perioadă',
    'Fără perioadă nu pot fi comparate cu nicio lună de vânzări.',
    'Reimportă raportul cu perioada completată.',
    el(randuri.filter(r => !r.perioadaSursa)));

  return diagnostice;
}

// ————————————————————————————————————————————————————————— motorul

export function reconciliationMaterialFC(
  state: AppState,
  ctx: CtxFC,
  cerere: CerereFC,
  reguliUtilizator: RegulaCategorie29[] = [],
): ReconciliationMaterialFC {
  const loc = locatieDin(cerere.nivel);
  const luni = luniAtinse(cerere.perioada);
  const recipe = recipeFC(state, ctx, cerere);
  const interval = `${cerere.perioada.de} → ${cerere.perioada.la}`;

  const gol = (motiv: string): ReconciliationMaterialFC => ({
    cerere, disponibil: false, motivIndisponibil: motiv,
    perioadeSursa: [], canalSursa: 'UNKNOWN', randuri: [],
    nboActual: 0, nboTeoretic: null, nboFoodCost: 0,
    recipe, diferentaTeoreticVsRecipe: null, diferentaActualVsRecipe: 0,
    bridge: [], explainedAmount: 0, unexplainedAmount: 0,
    explainedPct: null, unexplainedPct: null,
    complete: false, motiveIncomplet: [motiv],
    diagnostice: [], surse: recipe.surse,
  });

  // 2.9 nu are canal: nu se inventează repartiția
  if (cerere.canal !== 'TOTAL') {
    return gol('Raportul 2.9 nu conține canalul. Consumul pe material există doar la nivel de Total; '
      + 'repartizarea lui pe InStore/Delivery ar fi o invenție, nu un calcul.');
  }

  const toate = state.materiale29 ?? [];
  if (!toate.length) {
    return gol('Nu a fost importat niciun raport 2.9 la nivel de material. Structura pe categorie nu permite '
      + 'puntea pe material: „ce s-a consumat și nu e în nicio rețetă" rămâne fără răspuns.');
  }
  // sursa 2.9 potrivită cererii: lunarul pe lună, săptămânalul pe săptămână, niciodată însumate
  const sel = selecteaza29(toate, cerere.perioada, loc);
  if (!sel.disponibil) return gol(sel.motiv ?? `Nu există linii 2.9 pe material pentru ${luni.join(', ')}.`);
  const inScop = sel.randuri;

  // ——— maparea și teoreticul, cu piesele refolosibile (aceleași pe care le folosește fc-bridge):
  // pe scop pentru diagnostice, pe (lună × locație) pentru rânduri — ca teoreticul unui
  // ingredient să nu se atribuie de mai multe ori
  const teoreticPeIngredient = teoreticDinRetete(state, ctx, sel.ferestre, loc);
  const teoreticRand = teoreticPeRand(state, ctx, sel.ferestre, [...new Set(inScop.map(m => m.locatie))]);
  const randuri = randuriMaterialFC(ctx, inScop, teoreticRand, reguliUtilizator);

  // ——— găleata fiecărui rând
  const galeataPentru = (r: RandMaterialFC): GaleataBridge => {
    if (r.categorie === 'UNCLASSIFIED') return 'UNCLASSIFIED';
    if (r.categorie === 'NORMALIZED') return 'NORMALIZED_PAPER';
    if (esteOperational(r.categorie)) return 'OPERATIONAL';
    if (r.categorie === 'FOOD' && r.areReteta) return 'RECIPE_FOOD';
    if (r.categorie === 'PAPER' && r.areReteta) return 'RECIPE_PAPER';
    return 'UNEXPLAINED';   // Food/Paper consumat, dar fără legătură cu vreo rețetă
  };

  const acc = new Map<GaleataBridge, { lei: number; n: number }>();
  for (const r of randuri) {
    const g = galeataPentru(r);
    const e = acc.get(g) ?? { lei: 0, n: 0 };
    e.lei += r.costActual; e.n++;
    acc.set(g, e);
  }

  const nboActual = randuri.reduce((s, r) => s + r.costActual, 0);
  const cuTeoretic = inScop.filter(m => m.costTeoretic != null);
  const nboTeoretic = cuTeoretic.length ? cuTeoretic.reduce((s, m) => s + (m.costTeoretic ?? 0), 0) : null;
  const pct = (lei: number) => (nboActual > 0 ? (lei / nboActual) * 100 : null);

  const EXPLICATII: Record<GaleataBridge, string> = {
    RECIPE_FOOD: 'Materie primă alimentară care se regăsește în rețete — partea pe care Recipe FC o explică direct.',
    RECIPE_PAPER: 'Ambalaje care se regăsesc în rețete — explicate direct de rețetar.',
    NORMALIZED_PAPER: 'Materiale normalizate: prezente în 2.9, dar nereprezentate ca atare în rețete '
      + '(porționate sau reambalate intern). Consum real de Food Cost, pe care rețetarul nu îl poate arăta.',
    OPERATIONAL: 'Curățenie, uniforme, papetărie, consumabile de exploatare. Consum real, dar în afara Food Cost.',
    UNCLASSIFIED: 'Categorii pe care nicio regulă nu le recunoaște. NU au fost presupuse Food: '
      + 'până la maparea lor explicită rămân separate, ca să nu deformeze niciun procent.',
    UNEXPLAINED: 'Food sau Paper consumat, fără legătură cu vreo rețetă sau fără corespondent în nomenclator. '
      + 'Aici stă variance-ul pe care datele curente nu îl pot atribui.',
  };

  const ordine: GaleataBridge[] = ['RECIPE_FOOD', 'RECIPE_PAPER', 'NORMALIZED_PAPER', 'OPERATIONAL', 'UNCLASSIFIED', 'UNEXPLAINED'];
  const bridge: RandBridge[] = ordine.map(g => {
    const e = acc.get(g) ?? { lei: 0, n: 0 };
    return { galeata: g, eticheta: ETICHETA_GALEATA[g], lei: e.lei, pct: pct(e.lei), nrMateriale: e.n, explicatie: EXPLICATII[g] };
  });

  const lei = (g: GaleataBridge) => acc.get(g)?.lei ?? 0;
  const unexplainedAmount = lei('UNEXPLAINED');
  const explainedAmount = nboActual - unexplainedAmount;
  const nboFoodCost = lei('RECIPE_FOOD') + lei('RECIPE_PAPER') + lei('NORMALIZED_PAPER');

  // ——— diagnostice (piesa comună cu fc-bridge)
  const diagnostice = diagnosticeMaterial(randuri, ctx, teoreticPeIngredient, loc);
  const faraMapare = randuri.filter(r => trebuieMapat(r) && !r.areIngredient);

  // ——— completitudine: dovada la nivel de material e suficientă?
  const motiveIncomplet: string[] = [];
  if (unexplainedAmount !== 0) {
    motiveIncomplet.push(`${Math.round(unexplainedAmount)} lei rămân neatribuiți unei găleți numite.`);
  }
  if (lei('UNCLASSIFIED') !== 0) {
    motiveIncomplet.push(`${Math.round(lei('UNCLASSIFIED'))} lei stau pe categorii nerecunoscute.`);
  }
  if (faraMapare.length) {
    motiveIncomplet.push(`${faraMapare.length} materiale de Food Cost nu au corespondent în nomenclator.`);
  }
  if (nboTeoretic === null) {
    motiveIncomplet.push('Raportul 2.9 nu conține costul teoretic pe material: variance-ul se poate calcula '
      + 'doar față de teoreticul reconstruit din rețete × PMIX.');
  }
  if (diagnostice.some(d => d.nivel === 'BLOCANT')) {
    motiveIncomplet.push(`${diagnostice.filter(d => d.nivel === 'BLOCANT').length} diagnostice blocante de calitate a datelor.`);
  }

  const surse: SursaFC[] = [
    ...recipe.surse,
    { raport: 'NBO_29', randuri: inScop.length, interval, nota: `material · perioade sursă ${luni.join(', ')} · canal necunoscut` },
  ];

  return {
    cerere, disponibil: true,
    perioadeSursa: [...new Set(inScop.map(m => m.perioada))].sort(),
    canalSursa: 'UNKNOWN',
    randuri,
    nboActual, nboTeoretic, nboFoodCost,
    recipe,
    diferentaTeoreticVsRecipe: nboTeoretic !== null ? nboTeoretic - recipe.cost : null,
    diferentaActualVsRecipe: nboFoodCost - recipe.cost,
    bridge,
    explainedAmount, unexplainedAmount,
    explainedPct: pct(explainedAmount), unexplainedPct: pct(unexplainedAmount),
    complete: motiveIncomplet.length === 0,
    motiveIncomplet,
    diagnostice: sorteazaDiagnostice(diagnostice),
    surse,
  };
}

/** Rezumat într-o linie, pentru jurnale. */
export const descrieReconciliereMaterial = (r: ReconciliationMaterialFC) =>
  r.disponibil
    ? `${r.cerere.perioada.cheie} · 2.9 ${r.nboActual.toFixed(0)} lei · explicat ${r.explainedPct?.toFixed(1)}% · `
      + `neexplicat ${r.unexplainedAmount.toFixed(0)} lei · complet: ${r.complete ? 'da' : 'nu'}`
    : `${r.cerere.perioada.cheie} · indisponibil — ${r.motivIndisponibil}`;
