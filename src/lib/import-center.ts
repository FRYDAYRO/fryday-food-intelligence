// Import Center — stratul canonic prin care intră TOATE datele-sursă de Food Cost.
//
// Ce rezolvă: importul direct (`importa`) știe să citească fiecare format, dar nu spune
// dacă fișierul e cel crezut, dacă a mai fost importat, ce s-a schimbat față de versiunea
// precedentă, pe ce scop se aplică și dacă e sigur să fie activat. Aici se adaugă exact
// aceste garanții, în jurul motorului existent, fără să-i schimbe comportamentul.
//
// Reguli care nu se încalcă:
//  · VALIDARE ÎNAINTE DE ACTIVARE: `pregatesteImport` lucrează pe o COPIE a stării și nu
//    scrie nimic; un import invalid nu poate corupe parțial datele existente, pentru că
//    starea reală se atinge doar în `activeazaImport`, și doar când validarea a trecut;
//  · nimic nu se ghicește: detecția combină numele fișierului cu antetele, iar când cele
//    două nu se susțin reciproc rezultatul e NECESITA_CONFIRMARE, cu candidații listați;
//  · datele COMUNE (rețetar, nomenclator, prețuri) nu au restaurant; datele de FAPT
//    (2.9, 4.1, PMIX 4.7) sunt ori de companie, ori pe restaurant — niciodată amestecate
//    tăcut: un fișier cu restaurant doar pe unele rânduri e blocat, nu „agregat";
//  · istoricul nu se rescrie: fiecare import adaugă o VERSIUNE nouă, activă de la data ei;
//    versiunile vechi rămân, iar recalculul istoric folosește versiunea de atunci;
//  · idempotență: aceleași date reimportate dau aceeași amprentă și nu se dublează;
//  · 4.1 nu se forțează în forma lui 2.9: dacă structura nu e cea a raportului de vânzări,
//    importul se oprește — cu confirmare cerută când tipul a fost doar dedus, cu eroare de
//    validare când tipul fusese deja confirmat — în loc să îndese datele într-un format vecin.
import { norm, pretLa } from './engine';
import { clasificaCategorie29 } from './fc-clasificare';
import type {
  AppState, ImportBatch, IntrareAudit, IntrarePretIstoric, Reteta, VersiuneSursa,
} from './types';
import {
  detecteazaCanal, importa, mapeazaAntete, parseData, parseNumar, parsePerioada,
  type OpteImport, type Parsat, type TipImport,
} from './importer';
import { parseSalesMix } from './salesmix';

// ————————————————————————————————————————————————————————— tipurile canonice de sursă

export type TipSursaFC =
  | 'RETETAR'               // rețetar / recipe cards
  | 'NOMENCLATOR'           // nomenclatorul de ingrediente (master data)
  | 'PRETURI_INGREDIENTE'   // lista de prețuri datate
  | 'NBO_29'                // raportul NBO 2.9 (consum), pe categorie sau pe material
  | 'NBO_41'                // raportul NBO 4.1 (vânzări nete pe zi × restaurant × canal)
  | 'PMIX_47';              // PMIX / Sales Mix 4.7 (vânzări pe produs)

export const ETICHETA_SURSA: Record<TipSursaFC, string> = {
  RETETAR: 'Rețetar',
  NOMENCLATOR: 'Nomenclator de ingrediente',
  PRETURI_INGREDIENTE: 'Prețuri de ingrediente',
  NBO_29: 'NBO 2.9 (consum)',
  NBO_41: 'NBO 4.1 (vânzări nete)',
  PMIX_47: 'PMIX 4.7 (vânzări pe produs)',
};

/**
 * Scopul unei surse. Rețetarul, nomenclatorul și prețurile sunt COMUNE tuturor
 * restaurantelor; 2.9, 4.1 și PMIX pot veni agregat (companie) sau pe restaurant.
 */
export type ScopSursa = 'COMUN' | 'COMPANIE' | 'RESTAURANT';

/** Sursele comune tuturor restaurantelor — nu au și nu pot avea scop pe unitate. */
export const SURSE_COMUNE: TipSursaFC[] = ['RETETAR', 'NOMENCLATOR', 'PRETURI_INGREDIENTE'];
export const eComuna = (t: TipSursaFC) => SURSE_COMUNE.includes(t);

export type Granularitate = 'ZI' | 'LUNA' | 'INTERVAL' | 'FARA';

// ————————————————————————————————————————————————————————— diagnostice

export type CodDiagnosticImport =
  | 'COLOANE_LIPSA' | 'COLOANE_NECUNOSCUTE' | 'RANDURI_DUPLICATE' | 'DATE_INVALIDE'
  | 'NUMERE_INVALIDE' | 'LOCATIE_LIPSA' | 'PRODUS_LIPSA' | 'INGREDIENT_LIPSA'
  | 'PRET_LIPSA' | 'RETETA_LIPSA' | 'CATEGORIE_NECUNOSCUTA' | 'CANAL_NECUNOSCUT'
  | 'GRANULARITATE_MIXTA' | 'IMPORT_DUPLICAT' | 'VERSIUNI_IN_CONFLICT' | 'NIMIC_IMPORTAT';

export interface DiagnosticImport {
  cod: CodDiagnosticImport;
  nivel: 'BLOCANT' | 'ATENTIE' | 'INFO';
  titlu: string;
  detaliu: string;
  nrElemente: number;
  exemple: string[];
}

// ————————————————————————————————————————————————————————— detecția

export interface CandidatDetectie { tip: TipSursaFC; scor: number; motive: string[]; }

export interface Detectie {
  tip: TipSursaFC | null;
  /** 0–100, determinist: se compune din semnalul de nume și cel de conținut. */
  incredere: number;
  stare: 'SIGUR' | 'NECESITA_CONFIRMARE';
  semnalNume: TipSursaFC | null;
  semnalContinut: TipSursaFC | null;
  candidati: CandidatDetectie[];
  motiv: string;
}

/**
 * Rapoarte pe care acest centru NU le importă, dar al căror vocabular structural seamănă
 * cu al celor importate (inventarul are cod + denumire + cantitate, ca un raport de vânzări).
 * Un nume din familia asta oprește detecția automată: cantitățile lor n-au voie să intre
 * ca lei sau ca vânzări.
 */
export const numeExclus = (numeFisier: string) => /inventar|stoc|waste|pierder|risipa/.test(norm(numeFisier));

/**
 * Numărul de raport dintr-un nume de fișier, cu granițe de cifră: „2.9" din „12.9.2026" e
 * o dată, nu raportul 2.9 — iar „4.1" apare în orice „2026.04.10".
 */
const numarRaport = (n: string, numar: string) =>
  new RegExp(`(^|[^0-9])${numar.replace('.', '\\.')}([^0-9]|$)`).test(n);

/** Semnalul din numele fișierului. Ordinea contează: „sales mix" e PMIX, nu 4.1. */
export function semnalDinNume(numeFisier: string): TipSursaFC | null {
  const n = norm(numeFisier);
  if (numeExclus(n)) return null;
  if (numarRaport(n, '2.9') || /2 9|nbo 29/.test(n)) return 'NBO_29';
  if (numarRaport(n, '4.1') || /4 1|nbo 41/.test(n)) return 'NBO_41';
  if (/sales mix|4 7|pmix/.test(n) || numarRaport(n, '4.7')) return 'PMIX_47';
  if (/sales report|raport vanzari|vanzari nete/.test(n)) return 'NBO_41';
  if (/retet|recipe/.test(n)) return 'RETETAR';
  if (/nomenclator|master|articole|catalog/.test(n)) return 'NOMENCLATOR';
  if (/pret|price|tarif/.test(n)) return 'PRETURI_INGREDIENTE';
  return null;
}

interface RegulaContinut {
  tip: TipSursaFC; intern: TipImport; cerute: string[];
  /** Regulă SLABĂ: câmpuri prea generice ca să identifice singure raportul (denumire + cantitate
   *  se potrivesc la fel de bine cu un inventar sau cu o listă de waste). Cere semnal de nume. */
  slaba?: boolean;
}

/** Regulile de conținut: ce câmpuri trebuie mapate ca fișierul să poată fi acel tip. */
const REGULI_CONTINUT: RegulaContinut[] = [
  { tip: 'NBO_29', intern: 'FC29_MATERIAL', cerute: ['material', 'denumire', 'costActual'] },
  { tip: 'NBO_29', intern: 'FC29', cerute: ['perioada', 'categorie', 'valoare'] },
  { tip: 'NBO_41', intern: 'SALES', cerute: ['data', 'locatie', 'net'] },
  { tip: 'PMIX_47', intern: 'PMIX', cerute: ['data', 'produs', 'cant'] },
  { tip: 'PMIX_47', intern: 'SALES_MIX', cerute: ['denumire', 'cant'], slaba: true },
  { tip: 'RETETAR', intern: 'RETETAR', cerute: ['reteta', 'comp', 'cant'] },
  { tip: 'RETETAR', intern: 'RETETAR_NBO', cerute: ['comp', 'cant', 'um'] },
  { tip: 'NOMENCLATOR', intern: 'COST_INGREDIENTE', cerute: ['cod', 'denumire', 'um'] },
  { tip: 'PRETURI_INGREDIENTE', intern: 'COST_INGREDIENTE', cerute: ['cod', 'pret'] },
];

/** Variantele interne posibile pentru un tip canonic, în ordinea specificității. */
export function variantaInterna(tip: TipSursaFC, antete: string[]): TipImport | null {
  for (const r of REGULI_CONTINUT) {
    if (r.tip !== tip) continue;
    const m = mapeazaAntete(antete, r.intern);
    if (r.cerute.every(c => m[c] !== undefined)) return r.intern;
  }
  return null;
}

/**
 * Detecția canonică: nume + conținut. Un semnal singur nu e de ajuns decât când
 * conținutul indică fără echivoc un singur tip; altfel se cere confirmare.
 */
export function detecteazaSursa(antete: string[], numeFisier: string): Detectie {
  const semnalNume = semnalDinNume(numeFisier);
  const potriviri = new Map<TipSursaFC, CandidatDetectie>();
  const tari = new Set<TipSursaFC>();
  for (const r of REGULI_CONTINUT) {
    const m = mapeazaAntete(antete, r.intern);
    const gasite = r.cerute.filter(c => m[c] !== undefined);
    if (gasite.length !== r.cerute.length) continue;
    const scor = 40 + gasite.length * 5;
    const c = potriviri.get(r.tip);
    const motiv = `structura ${r.intern}: ${gasite.join(', ')}`;
    if (!c) { potriviri.set(r.tip, { tip: r.tip, scor, motive: [motiv] }); if (!r.slaba) tari.add(r.tip); }
    else { c.scor = Math.max(c.scor, scor); c.motive.push(motiv); if (!r.slaba) tari.add(r.tip); }
  }
  const candidati = [...potriviri.values()].sort((a, b) => b.scor - a.scor || a.tip.localeCompare(b.tip));
  for (const c of candidati) if (c.tip === semnalNume) { c.scor += 40; c.motive.push(`numele fișierului indică ${ETICHETA_SURSA[c.tip]}`); }
  candidati.sort((a, b) => b.scor - a.scor || a.tip.localeCompare(b.tip));
  const semnalContinut = candidati.length ? candidati[0].tip : null;

  const cereConfirmare = (motiv: string, incredere: number): Detectie =>
    ({ tip: null, incredere, stare: 'NECESITA_CONFIRMARE', semnalNume, semnalContinut, candidati, motiv });

  if (numeExclus(numeFisier)) {
    return cereConfirmare('Numele fișierului arată a inventar / stoc / waste — rapoarte pe care acest '
      + 'centru nu le importă, dar a căror structură seamănă cu a celor importate. Confirmă explicit tipul, '
      + 'altfel cantitățile ar putea intra ca vânzări sau ca lei.', 20);
  }
  if (!candidati.length) {
    return cereConfirmare(semnalNume
      ? `Numele fișierului sugerează ${ETICHETA_SURSA[semnalNume]}, dar antetele nu au coloanele acelui raport.`
      : 'Nici numele fișierului, nici antetele nu identifică un raport cunoscut.', 0);
  }
  // numele și conținutul se susțin reciproc
  if (semnalNume && candidati[0].tip === semnalNume) {
    return { tip: semnalNume, incredere: 100, stare: 'SIGUR', semnalNume, semnalContinut, candidati, motiv: 'Numele fișierului și antetele indică același raport.' };
  }
  // numele spune altceva decât conținutul: niciodată nu se alege în tăcere
  if (semnalNume && candidati.some(c => c.tip === semnalNume)) {
    return cereConfirmare(`Numele fișierului sugerează ${ETICHETA_SURSA[semnalNume]}, dar structura se potrivește și cu `
      + `${ETICHETA_SURSA[candidati[0].tip]}. Confirmă tipul.`, 55);
  }
  if (semnalNume) {
    return cereConfirmare(`Numele fișierului sugerează ${ETICHETA_SURSA[semnalNume]}, dar structura arată `
      + `${ETICHETA_SURSA[candidati[0].tip]}. Confirmă tipul — un raport importat greșit corupe datele.`, 30);
  }
  // fără semnal de nume: conținutul decide doar dacă un singur tip se potrivește PRINTR-O
  // regulă tare; o potrivire slabă (denumire + cantitate) se potrivește și cu un inventar
  if (candidati.length === 1 && tari.has(candidati[0].tip)) {
    return { tip: candidati[0].tip, incredere: 75, stare: 'SIGUR', semnalNume, semnalContinut, candidati, motiv: 'Un singur raport are această structură.' };
  }
  if (candidati.length === 1) {
    return cereConfirmare(`Structura (${candidati[0].motive.join('; ')}) e prea generică pentru a identifica `
      + `singură ${ETICHETA_SURSA[candidati[0].tip]}: aceleași coloane apar și în inventar sau waste. Confirmă tipul.`, 35);
  }
  return cereConfirmare('Structura se potrivește cu mai multe rapoarte: '
    + `${candidati.slice(0, 3).map(c => ETICHETA_SURSA[c.tip]).join(', ')}. Confirmă tipul.`, 45);
}

// ————————————————————————————————————————————————————————— amprenta deterministă

/** FNV-1a pe 32 de biți — determinist, fără dependințe, suficient pentru idempotență. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Amprenta conținutului: același fișier, aceleași opțiuni → aceeași amprentă, indiferent
 * de ordinea coloanelor. Rândurile își păstrează ordinea (o reordonare e alt conținut).
 */
export function amprentaSursa(
  tip: TipSursaFC, p: Parsat,
  opt?: { dataValabil?: string; locatie?: string; optiuni?: OpteImport; mapare?: Record<string, string> },
): string {
  // antetele se ordonează canonic, dar se păstrează ORIGINALELE: două coloane care se
  // normalizează la fel („Pret" și „Preț") rămân distincte, altfel conținut diferit ar
  // produce aceeași amprentă și al doilea fișier ar fi respins ca duplicat
  const ordine = p.antete.map((a, i) => ({ a, i }))
    .sort((x, y) => norm(x.a).localeCompare(norm(y.a)) || x.i - y.i);
  const val = (v: unknown) => (v === undefined ? '\u2205' : `${typeof v}:${String(v)}`);
  const linii = p.randuri.map(r => ordine.map(({ a }) => `${a}=${val(r[a])}`).join('\u0001'));
  // pentru rapoartele citite din grilă (4.7, cardurile NBO) conținutul REAL e în matrice
  const matrice = (p.matrice ?? []).map(rand => rand.map(val).join('\u0001'));
  const o = opt?.optiuni ?? {};
  const optiuni = JSON.stringify(o, Object.keys(o).sort());
  const m = opt?.mapare ?? {};
  const mapare = JSON.stringify(m, Object.keys(m).sort());
  const canonic = [tip, opt?.dataValabil ?? '', opt?.locatie ?? '', optiuni, mapare,
    ordine.map(x => x.a).join('\u0001'), ...linii, '\u0002', ...matrice].join('\n');
  return `fp_${fnv1a(canonic)}_${p.randuri.length}_${(p.matrice ?? []).length}`;
}

// ————————————————————————————————————————————————————————— schimbările detectate

export interface SchimbariNomenclator {
  adaugate: string[];
  /** Prezente în nomenclator, absente din fișier — raportate, NU șterse. */
  absenteDinFisier: string[];
  redenumite: { cod: string; vechi: string; nou: string }[];
  coduriDuplicateInFisier: string[];
  faraPret: string[];
}

export interface SchimbariReteta {
  adaugate: string[];
  modificate: string[];
  /** Prezente în rețetar, absente din fișier — raportate, NU șterse. */
  absenteDinFisier: string[];
  gramajeSchimbate: { reteta: string; component: string; vechi: number; nou: number }[];
  ingredienteAdaugate: { reteta: string; component: string }[];
  ingredienteEliminate: { reteta: string; component: string }[];
  /** Componente referite de rețete, absente din nomenclator. */
  ingredienteLipsa: string[];
  ingredienteFaraPret: string[];
}

export interface SchimbariDetectate {
  nomenclator: SchimbariNomenclator | null;
  retete: SchimbariReteta | null;
  preturi: IntrarePretIstoric[];
}

function schimbariNomenclator(inainte: AppState, dupa: AppState, p: Parsat, map: Record<string, string>): SchimbariNomenclator {
  const vechi = new Map(inainte.ingrediente.map(i => [i.cod, i]));
  const adaugate = dupa.ingrediente.filter(i => !vechi.has(i.cod)).map(i => i.cod).sort();

  const coduriFisier = new Set<string>();
  const duplicate = new Set<string>();
  // redenumirile se citesc din FIȘIER față de nomenclatorul existent: importul păstrează
  // denumirea cunoscută (nu rescrie master data), deci diferența trebuie RAPORTATĂ ca atare,
  // nu dedusă din starea de după — altfel o redenumire ar trece complet neobservată
  const redenumite: { cod: string; vechi: string; nou: string }[] = [];
  if (map.cod !== undefined) {
    for (const r of p.randuri) {
      const c = String(r[map.cod] ?? '').trim();
      if (!c) continue;
      if (coduriFisier.has(c)) duplicate.add(c); else coduriFisier.add(c);
      const numeNou = map.denumire !== undefined ? String(r[map.denumire] ?? '').trim() : '';
      const v = vechi.get(c);
      if (v && numeNou && norm(numeNou) !== norm(v.denumire) && !redenumite.some(x => x.cod === c)) {
        redenumite.push({ cod: c, vechi: v.denumire, nou: numeNou });
      }
    }
  }
  redenumite.sort((a, b) => a.cod.localeCompare(b.cod));
  return {
    adaugate,
    absenteDinFisier: coduriFisier.size
      ? inainte.ingrediente.filter(i => !coduriFisier.has(i.cod)).map(i => i.cod).sort() : [],
    redenumite,
    coduriDuplicateInFisier: [...duplicate].sort(),
    faraPret: dupa.ingrediente
      .filter(i => !(i.preturi.length > 0 && pretLa(i, '9999-12-31') > 0))
      .map(i => i.cod).sort(),
  };
}

const semnaturaReteta = (r: Reteta): Map<string, number> => {
  const v = r.versiuni.find(x => x.nr === r.activa) ?? r.versiuni[r.versiuni.length - 1];
  const m = new Map<string, number>();
  for (const l of v.linii) m.set(`${l.comp}|${l.canal}`, (m.get(`${l.comp}|${l.canal}`) ?? 0) + l.cant);
  return m;
};

function schimbariReteta(inainte: AppState, dupa: AppState, p: Parsat, map: Record<string, string>): SchimbariReteta {
  const vechi = new Map(inainte.retete.map(r => [r.cod, r]));
  const rez: SchimbariReteta = {
    adaugate: [], modificate: [], absenteDinFisier: [],
    gramajeSchimbate: [], ingredienteAdaugate: [], ingredienteEliminate: [],
    ingredienteLipsa: [], ingredienteFaraPret: [],
  };
  for (const r of dupa.retete) {
    const v = vechi.get(r.cod);
    if (!v) { rez.adaugate.push(r.cod); continue; }
    const sv = semnaturaReteta(v);
    const sn = semnaturaReteta(r);
    let schimbat = false;
    for (const [k, cant] of sn) {
      const [comp] = k.split('|');
      if (!sv.has(k)) { rez.ingredienteAdaugate.push({ reteta: r.cod, component: comp }); schimbat = true; }
      else if (sv.get(k) !== cant) {
        rez.gramajeSchimbate.push({ reteta: r.cod, component: comp, vechi: sv.get(k)!, nou: cant });
        schimbat = true;
      }
    }
    for (const [k] of sv) {
      if (!sn.has(k)) { rez.ingredienteEliminate.push({ reteta: r.cod, component: k.split('|')[0] }); schimbat = true; }
    }
    if (schimbat) rez.modificate.push(r.cod);
  }
  // rețetele din fișier, ca să știm care lipsesc din el (raportate, nu șterse)
  const codFisier = map.reteta ?? map.produs ?? map.cod;
  if (codFisier !== undefined) {
    const inFisier = new Set(p.randuri.map(r => String(r[codFisier] ?? '').trim()).filter(Boolean));
    if (inFisier.size) rez.absenteDinFisier = inainte.retete.filter(r => !inFisier.has(r.cod)).map(r => r.cod).sort();
  }
  const ingr = new Map(dupa.ingrediente.map(i => [i.cod, i]));
  const codRetete = new Set(dupa.retete.map(r => r.cod));
  const lipsa = new Set<string>();
  const faraPret = new Set<string>();
  for (const r of dupa.retete) {
    for (const [k] of semnaturaReteta(r)) {
      const comp = k.split('|')[0];
      const i = ingr.get(comp);
      if (!i) { if (!codRetete.has(comp)) lipsa.add(comp); continue; }
      if (!(i.preturi.length > 0 && pretLa(i, '9999-12-31') > 0)) faraPret.add(comp);
    }
  }
  rez.ingredienteLipsa = [...lipsa].sort();
  rez.ingredienteFaraPret = [...faraPret].sort();
  rez.adaugate.sort(); rez.modificate.sort();
  rez.gramajeSchimbate.sort((a, b) => a.reteta.localeCompare(b.reteta) || a.component.localeCompare(b.component));
  rez.ingredienteAdaugate.sort((a, b) => a.reteta.localeCompare(b.reteta) || a.component.localeCompare(b.component));
  rez.ingredienteEliminate.sort((a, b) => a.reteta.localeCompare(b.reteta) || a.component.localeCompare(b.component));
  return rez;
}

/** Diferența de prețuri, cu prețul anterior în vigoare LA DATA schimbării. */
function schimbariPret(inainte: AppState, dupa: AppState, fisier: string, amprenta: string): IntrarePretIstoric[] {
  const vechi = new Map(inainte.ingrediente.map(i => [i.cod, i]));
  const rez: IntrarePretIstoric[] = [];
  for (const i of dupa.ingrediente) {
    const v = vechi.get(i.cod);
    const cunoscute = new Set((v?.preturi ?? []).map(p => `${p.validDeLa}|${p.pret}`));
    for (const p of i.preturi) {
      if (cunoscute.has(`${p.validDeLa}|${p.pret}`)) continue;
      // `pretLa` retro-umple cu cel mai vechi preț cunoscut când nimic nu era în vigoare;
      // pentru ISTORIC asta ar inventa o variație care nu a existat, deci se cere explicit
      // un preț care chiar era în vigoare la data respectivă
      const eraInVigoare = (v?.preturi ?? []).some(x => x.validDeLa <= p.validDeLa);
      const anterior = v && eraInVigoare ? pretLa(v, p.validDeLa) : null;
      const pretVechi = anterior !== null && anterior > 0 ? anterior : null;
      rez.push({
        ingredient: i.cod, denumire: i.denumire, dataEfectiva: p.validDeLa,
        pretVechi, pretNou: p.pret,
        deltaRON: pretVechi !== null ? p.pret - pretVechi : null,
        deltaPct: pretVechi !== null && pretVechi !== 0 ? ((p.pret - pretVechi) / pretVechi) * 100 : null,
        fisier, amprenta,
      });
    }
  }
  return rez.sort((a, b) => a.ingredient.localeCompare(b.ingredient) || a.dataEfectiva.localeCompare(b.dataEfectiva));
}

// ————————————————————————————————————————————————————————— rezultatul canonic

export interface RezultatCentral {
  fisier: string;
  tip: TipSursaFC | null;
  tipIntern: TipImport | null;
  detectie: Detectie;
  perioada: string | null;
  perioade: string[];
  /** Fereastra reală a raportului, cu precizie de zi. `null` = nedeclarată de sursă. */
  intervalDe: string | null;
  intervalLa: string | null;
  /** Data de la care se aplică versiunea acestui import. */
  dataEfectiva: string;
  granularitate: Granularitate;
  scop: ScopSursa;
  restaurante: string[];
  randuri: number;
  importate: number;
  /** `null` pentru rapoartele citite din grilă, unde un rând-sursă nu corespunde 1:1 unei înregistrări. */
  sarite: number | null;
  avertismente: string[];
  erori: string[];
  /** importate ÷ rânduri, %. */
  acoperire: number | null;
  duplicat: 'NOU' | 'DUPLICAT_EXACT' | 'REIMPORT_ACTUALIZAT';
  amprenta: string;
  versiune: string | null;
  activat: boolean;
  stare: 'VALIDAT' | 'ACTIVAT' | 'RESPINS' | 'NECESITA_CONFIRMARE' | 'DUPLICAT';
  importatLa: string;
  actor: string;
  diagnostice: DiagnosticImport[];
  schimbari: SchimbariDetectate | null;
  audit: IntrareAudit | null;
}

export interface CerereImport {
  fisier: string;
  parsat: Parsat;
  /** Confirmarea tipului, când detecția o cere. */
  tip?: TipSursaFC;
  actor?: string;
  /** Momentul importului — parametru, ca rezultatul să fie determinist în teste. */
  acum?: string;
  dataValabil?: string;
  /** Restaurantul declarat, când fișierul nu îl conține. */
  locatie?: string;
  optiuni?: OpteImport;
  /**
   * Maparea manuală de coloane, când omul a corectat-o în interfață. Fără ea, ecranul
   * vechi de importuri nu putea trece prin stratul canonic: maparea automată e o
   * presupunere bună, dar pe antete neobișnuite omul are ultimul cuvânt.
   */
  mapare?: Record<string, string>;
  /**
   * Varianta internă aleasă deja de ecran. Un tip canonic are mai multe structuri
   * posibile (PMIX ↔ SALES_MIX, RETETAR ↔ RETETAR_NBO); când apelantul a stabilit-o,
   * detecția nu are voie s-o suprascrie — mai ales după o mapare manuală, care schimbă
   * exact câmpurile pe care detecția se uită.
   */
  internPreferat?: TipImport;
}

export interface PregatireImport {
  rezultat: RezultatCentral;
  /** Starea rezultată, calculată pe o COPIE — se aplică doar prin `activeazaImport`. */
  stareCandidat: AppState | null;
  valid: boolean;
  /**
   * Amprenta stării pe care s-a făcut pregătirea. Activarea o verifică: o pregătire
   * calculată pe o stare care între timp s-a schimbat ar rescrie, tăcut, importul dintre
   * timp — inclusiv pe al ei propriu, la o a doua activare.
   */
  bazaStare: string;
}

/** Amprenta datelor unei stări — baza verificării de concurență la activare. */
export const amprentaStare = (s: AppState): string => `st_${fnv1a(JSON.stringify([
  s.ingrediente, s.produse, s.retete, s.vanzari, s.salesReport, s.linii29, s.materiale29,
  s.waste, s.inventar, s.locatii, s.versiuniImport ?? [], s.istoricPreturi ?? [],
]))}`;

const ACTOR_SISTEM = 'SISTEM';

const clona = (s: AppState): AppState => JSON.parse(JSON.stringify(s)) as AppState;

// ————————————————————————————————————————————————————————— validarea

interface Colector { diag: DiagnosticImport[]; }

const adaugaDiag = (
  c: Colector, cod: CodDiagnosticImport, nivel: DiagnosticImport['nivel'],
  titlu: string, detaliu: string, exemple: string[],
) => {
  if (!exemple.length) return;
  c.diag.push({ cod, nivel, titlu, detaliu, nrElemente: exemple.length, exemple: exemple.slice(0, 8) });
};

/** Coloanele obligatorii ale fiecărei variante interne. */
const OBLIGATORII: Partial<Record<TipImport, string[]>> = {
  FC29: ['perioada', 'categorie', 'valoare'],
  FC29_MATERIAL: ['material', 'denumire', 'costActual'],
  SALES: ['data', 'locatie', 'net'],
  PMIX: ['data', 'produs', 'cant'],
  SALES_MIX: ['denumire', 'cant'],
  RETETAR: ['reteta', 'comp', 'cant'],
  RETETAR_NBO: ['comp', 'cant', 'um'],
  COST_INGREDIENTE: ['cod'],
};

/** Câmpul de restaurant al fiecărei variante, unde există. */
const CAMP_LOCATIE: Partial<Record<TipImport, string>> = {
  FC29: 'locatie', FC29_MATERIAL: 'locatie', SALES: 'locatie', PMIX: 'locatie',
};

/**
 * Variante al căror model de date CERE un restaurant pe fiecare rând: fără el, importul
 * ar atribui tăcut totul primului restaurant din nomenclator (și, la 2.9, ar șterge luna
 * acelui restaurant). Doar 2.9 pe material poate fi stocat cu adevărat agregat (`locatie: null`).
 */
const NECESITA_RESTAURANT: TipImport[] = ['PMIX', 'SALES', 'FC29', 'SALES_MIX'];

/** Rapoarte citite din grilă: un rând-sursă nu corespunde 1:1 unei înregistrări importate. */
const CITITE_DIN_GRILA: TipImport[] = ['SALES_MIX', 'RETETAR_NBO'];

const ANTET_LOCATIE = 'Locatie (declarat la import)';

/** Un rând complet gol (linie de total sau separator) nu contează la nicio statistică. */
const randGol = (r: Record<string, unknown>) =>
  Object.values(r).every(v => String(v ?? '').trim() === '');

/**
 * Restaurantul declarat de utilizator trebuie să AJUNGĂ în date, nu doar în metadate:
 * se injectează ca o coloană sintetică pe copia parsată, atunci când fișierul nu are
 * deloc coloană de restaurant (sau o are complet goală). Un fișier care are restaurante
 * pe unele rânduri NU se completează: acolo problema e granularitatea mixtă, semnalată separat.
 */
function cuRestaurantDeclarat(p: Parsat, intern: TipImport, locatie: string): Parsat {
  const camp = CAMP_LOCATIE[intern];
  if (!camp) return p;
  const antet = mapeazaAntete(p.antete, intern)[camp];
  if (antet !== undefined) {
    const areValori = p.randuri.some(r => String(r[antet] ?? '').trim() !== '');
    if (areValori) return p;
    return { ...p, randuri: p.randuri.map(r => ({ ...r, [antet]: locatie })) };
  }
  return {
    ...p,
    antete: [...p.antete, ANTET_LOCATIE],
    randuri: p.randuri.map(r => ({ ...r, [ANTET_LOCATIE]: locatie })),
  };
}

interface Scop { scop: ScopSursa; restaurante: string[]; mixt: boolean; cuLocatie: number; faraLocatie: number; }

function determinaScop(tip: TipSursaFC, intern: TipImport, p: Parsat, map: Record<string, string>, declarat?: string): Scop {
  if (eComuna(tip)) return { scop: 'COMUN', restaurante: [], mixt: false, cuLocatie: 0, faraLocatie: 0 };
  const camp = CAMP_LOCATIE[intern];
  const antet = camp ? map[camp] : undefined;
  if (antet === undefined) {
    // fișierul nu are coloană de restaurant: ori e declarat de utilizator, ori e agregat
    return declarat
      ? { scop: 'RESTAURANT', restaurante: [declarat], mixt: false, cuLocatie: p.randuri.length, faraLocatie: 0 }
      : { scop: 'COMPANIE', restaurante: [], mixt: false, cuLocatie: 0, faraLocatie: p.randuri.length };
  }
  // rândurile complet goale (linii de total, separatoare) nu sunt „fără restaurant"
  const valori = p.randuri.filter(r => !randGol(r)).map(r => String(r[antet] ?? '').trim());
  const cu = valori.filter(v => v.length > 0);
  const fara = valori.length - cu.length;
  const restaurante = [...new Set(cu)].sort();
  if (cu.length && fara) return { scop: 'RESTAURANT', restaurante, mixt: true, cuLocatie: cu.length, faraLocatie: fara };
  if (cu.length) return { scop: 'RESTAURANT', restaurante, mixt: false, cuLocatie: cu.length, faraLocatie: 0 };
  return declarat
    ? { scop: 'RESTAURANT', restaurante: [declarat], mixt: false, cuLocatie: 0, faraLocatie: 0 }
    : { scop: 'COMPANIE', restaurante: [], mixt: false, cuLocatie: 0, faraLocatie: fara };
}

interface Perioade {
  perioade: string[]; granularitate: Granularitate; dateInvalide: string[];
  /** Cea mai veche dată de valabilitate din fișier — data efectivă a unei liste de prețuri. */
  dataMin: string | null;
  /**
   * Fereastra REALĂ acoperită de raport, cu precizie de zi. Lunile de mai sus nu o pot
   * exprima: 17–23 august și 1–9 august dau amândouă „2026-08", deși nu au nicio zi comună.
   * `null` = raportul nu declară intervalul; atunci nu se presupune nimic despre el.
   */
  intervalDe: string | null;
  intervalLa: string | null;
}

function determinaPerioade(intern: TipImport, p: Parsat, map: Record<string, string>, dataValabil?: string): Perioade {
  const dateInvalide: string[] = [];
  const luni = new Set<string>();
  // zilele efective, ca fereastra raportului să nu se piardă în rotunjirea la lună
  const zile: string[] = [];
  let granularitate: Granularitate = 'FARA';
  if (map.data !== undefined) {
    granularitate = 'ZI';
    p.randuri.forEach((r, i) => {
      const brut = r[map.data!];
      if (String(brut ?? '').trim() === '') return;
      const d = parseData(brut);
      if (!d) dateInvalide.push(`rândul ${i + 2}: „${String(brut)}"`);
      else { luni.add(d.slice(0, 7)); zile.push(d); }
    });
  } else if (map.perioada !== undefined) {
    granularitate = 'LUNA';
    p.randuri.forEach((r, i) => {
      const brut = r[map.perioada!];
      if (String(brut ?? '').trim() === '') return;
      const per = parsePerioada(brut);
      if (!per) dateInvalide.push(`rândul ${i + 2}: „${String(brut)}"`);
      else luni.add(per);
    });
  } else if (dataValabil) {
    granularitate = intern === 'COST_INGREDIENTE' ? 'FARA' : 'LUNA';
    if (intern !== 'COST_INGREDIENTE') luni.add(dataValabil.slice(0, 7));
  }
  // o listă de prețuri / un nomenclator își poartă data de valabilitate pe rând
  const valabilitati: string[] = [];
  if (map.validDeLa !== undefined) {
    for (const r of p.randuri) {
      const d = parseData(r[map.validDeLa]);
      if (d) valabilitati.push(d);
    }
  }
  const perioade = [...luni].sort();
  if (perioade.length > 1 && granularitate !== 'FARA') granularitate = 'INTERVAL';

  // Intervalul: din datele rândurilor când raportul are o coloană de dată; altfel din
  // antetul NCR al grilei („Start Date / End Date", sau „MM/DD/AAAA - MM/DD/AAAA"), pe care
  // parserul îl citea deja și îl arunca. Nu se inventează nimic: fără declarație → null.
  const sortate = zile.sort();
  let intervalDe: string | null = sortate[0] ?? null;
  let intervalLa: string | null = sortate[sortate.length - 1] ?? null;
  if ((!intervalDe || !intervalLa) && p.matrice?.length) {
    const sm = parseSalesMix(p.matrice);
    intervalDe = sm.perioadaDe;
    intervalLa = sm.perioadaLa;
  }
  // un capăt fără celălalt nu e un interval: se declară nedeclarat, nu pe jumătate
  const complet = intervalDe !== null && intervalLa !== null;
  return {
    perioade, granularitate, dateInvalide, dataMin: valabilitati.sort()[0] ?? null,
    intervalDe: complet ? intervalDe : null,
    intervalLa: complet ? intervalLa : null,
  };
}

/** Cheia de duplicat pe rând, pe variantă internă. */
function cheieRand(intern: TipImport, r: Record<string, unknown>, map: Record<string, string>): string | null {
  const v = (c: string) => (map[c] !== undefined ? String(r[map[c]] ?? '').trim() : '');
  switch (intern) {
    case 'PMIX': return `${v('data')}|${v('locatie')}|${v('canal')}|${v('produs')}`;
    case 'SALES': return `${v('data')}|${v('locatie')}|${v('canal')}`;
    case 'FC29': return `${v('perioada')}|${v('locatie')}|${v('categorie')}`;
    case 'FC29_MATERIAL': return `${v('perioada')}|${v('locatie')}|${v('material')}`;
    case 'COST_INGREDIENTE': return v('cod');
    case 'RETETAR': return `${v('reteta')}|${v('comp')}`;
    default: return null;
  }
}

// ————————————————————————————————————————————————————————— pregătirea (fără scriere)

export function pregatesteImport(state: AppState, cerere: CerereImport): PregatireImport {
  const acum = cerere.acum ?? new Date().toISOString();
  const actor = cerere.actor?.trim() || ACTOR_SISTEM;
  const p = cerere.parsat;
  const detectie = detecteazaSursa(p.antete, cerere.fisier);
  const tip = cerere.tip ?? (detectie.stare === 'SIGUR' ? detectie.tip : null);
  const col: Colector = { diag: [] };

  const gol = (
    stare: RezultatCentral['stare'], erori: string[], tipRez: TipSursaFC | null, amprenta: string,
  ): PregatireImport => {
    const rezultat: RezultatCentral = {
      fisier: cerere.fisier, tip: tipRez, tipIntern: null, detectie,
      perioada: null, perioade: [], intervalDe: null, intervalLa: null, dataEfectiva: acum.slice(0, 10),
      granularitate: 'FARA', scop: tipRez && eComuna(tipRez) ? 'COMUN' : 'COMPANIE',
      restaurante: [], randuri: p.randuri.length, importate: 0, sarite: p.randuri.length,
      avertismente: [], erori, acoperire: null, duplicat: 'NOU', amprenta,
      versiune: null, activat: false, stare, importatLa: acum, actor,
      diagnostice: col.diag, schimbari: null,
      audit: {
        id: `A_${fnv1a(`${amprenta}|${acum}|${cerere.fisier}|${actor}`)}`, actor, data: acum, fisier: cerere.fisier,
        tip: tipRez ?? 'NEDETECTAT', tipIntern: '—', perioada: null,
        scop: tipRez && eComuna(tipRez) ? 'COMUN' : 'COMPANIE', restaurante: [],
        randuri: p.randuri.length, importate: 0,
        validare: stare === 'NECESITA_CONFIRMARE' ? 'NECESITA_CONFIRMARE' : 'RESPINS',
        amprenta, versiune: null, activat: false,
      },
    };
    return { rezultat, stareCandidat: null, valid: false, bazaStare: amprentaStare(state) };
  };

  if (!tip) {
    return gol('NECESITA_CONFIRMARE', [detectie.motiv], null,
      `fp_nedetectat_${p.randuri.length}`);
  }

  const amprenta = amprentaSursa(tip, p, {
    dataValabil: cerere.dataValabil, locatie: cerere.locatie, optiuni: cerere.optiuni,
    mapare: cerere.mapare,
  });
  // varianta fixată de ecran are prioritate, dar numai dacă aparține chiar tipului cerut:
  // un `internPreferat` străin ar muta importul în alt raport, tăcut
  const preferat = cerere.internPreferat
    && REGULI_CONTINUT.some(r => r.tip === tip && r.intern === cerere.internPreferat)
    ? cerere.internPreferat : null;
  const internBrut = preferat ?? variantaInterna(tip, p.antete);
  // restaurantul declarat se injectează ÎNAINTE de mapare: altfel ar rămâne o etichetă în
  // metadate, iar rândurile ar ajunge, tăcut, pe primul restaurant din nomenclator
  const pEfectiv = cerere.locatie && internBrut ? cuRestaurantDeclarat(p, internBrut, cerere.locatie) : p;
  const intern = internBrut ?? preferat ?? variantaInterna(tip, pEfectiv.antete);
  if (!intern) {
    // structura nu e cea a tipului — NU se îndeasă într-un format vecin.
    // Tipul CONFIRMAT de utilizator face din nepotrivire o eroare de validare (fișier greșit
    // sau incomplet), nu o nouă cerere de confirmare: alegerea a fost deja făcută.
    // ce anume lipsește, ca diagnostic structurat — nu doar un mesaj liber
    const variante = REGULI_CONTINUT.filter(r => r.tip === tip);
    const celMaiApropiat = variante
      .map(r => ({ r, lipsa: r.cerute.filter(c => mapeazaAntete(pEfectiv.antete, r.intern)[c] === undefined) }))
      .sort((a, b) => a.lipsa.length - b.lipsa.length)[0];
    if (celMaiApropiat) {
      adaugaDiag(col, 'COLOANE_LIPSA', 'BLOCANT', 'Coloane obligatorii lipsă',
        `Raportul ${ETICHETA_SURSA[tip]} (varianta ${celMaiApropiat.r.intern}) cere aceste câmpuri; `
        + 'fără ele fișierul nu poate fi acel raport.', celMaiApropiat.lipsa);
    }
    const mesaj = `Fișierul a fost tratat ca ${ETICHETA_SURSA[tip]}, dar antetele nu au structura acelui `
      + 'raport — nu se forțează într-un format vecin. Verifică fișierul sau tipul ales.';
    return cerere.tip
      ? gol('RESPINS', [mesaj], tip, amprenta)
      : gol('NECESITA_CONFIRMARE', [mesaj], tip, amprenta);
  }

  const mapAuto = mapeazaAntete(pEfectiv.antete, intern);
  // aceeași compunere ca în `importa`: manualul suprascrie automatul, iar valoarea goală ȘTERGE
  const map: Record<string, string> = { ...mapAuto };
  if (cerere.mapare) for (const [c, a] of Object.entries(cerere.mapare)) { if (a) map[c] = a; else delete map[c]; }
  const obligatorii = OBLIGATORII[intern] ?? [];
  const lipsa = obligatorii.filter(c => map[c] === undefined);
  adaugaDiag(col, 'COLOANE_LIPSA', 'BLOCANT', 'Coloane obligatorii lipsă',
    `Raportul ${ETICHETA_SURSA[tip]} cere aceste câmpuri; fără ele importul nu se poate face corect.`,
    lipsa);
  const folosite = new Set(Object.values(map));
  adaugaDiag(col, 'COLOANE_NECUNOSCUTE', 'INFO', 'Coloane nefolosite',
    'Prezente în fișier, dar fără corespondent în model — ignorate, nu pierdute din vedere.',
    p.antete.filter(a => !folosite.has(a) && a.trim() !== ''));

  // — scopul: companie vs restaurant, niciodată amestecate
  const scop = determinaScop(tip, intern, pEfectiv, map, cerere.locatie);
  if (eComuna(tip)) {
    const coloanaLoc = p.antete.filter(a => /locatie|restaurant|unitate|magazin|store/.test(norm(a)));
    adaugaDiag(col, 'LOCATIE_LIPSA', 'ATENTIE', 'Date comune cu coloană de restaurant',
      `${ETICHETA_SURSA[tip]} este comun tuturor restaurantelor: coloana de restaurant se ignoră, `
      + 'datele NU devin specifice unei unități.', coloanaLoc);
  }
  if (scop.mixt) {
    adaugaDiag(col, 'GRANULARITATE_MIXTA', 'BLOCANT', 'Restaurant completat doar pe o parte din rânduri',
      `${scop.cuLocatie} rânduri au restaurant, ${scop.faraLocatie} nu. Datele de companie și cele pe `
      + 'restaurant nu se pot amesteca într-un singur import: ori completezi restaurantul peste tot, '
      + 'ori împarți fișierul.', [`${scop.cuLocatie} cu restaurant`, `${scop.faraLocatie} fără`]);
  }
  if (!eComuna(tip) && scop.scop === 'COMPANIE') {
    if (NECESITA_RESTAURANT.includes(intern)) {
      // fără restaurant, motorul ar atribui totul primului restaurant din nomenclator —
      // iar la 2.9 ar ȘTERGE luna acelui restaurant. Se blochează, nu se „agregă".
      adaugaDiag(col, 'LOCATIE_LIPSA', 'BLOCANT', 'Raport fără restaurant, dar care cere unul',
        `${ETICHETA_SURSA[tip]} (varianta ${intern}) se stochează pe restaurant: fără coloana de `
        + 'restaurant, fiecare rând ar fi atribuit tăcut primului restaurant din nomenclator. '
        + 'Declară restaurantul la import sau folosește fișiere separate pe unitate.',
        ['fără coloană de restaurant']);
    } else {
      adaugaDiag(col, 'LOCATIE_LIPSA', 'INFO', 'Import la nivel de companie',
        'Fișierul nu precizează restaurantul: datele se înregistrează agregat, la nivel de rețea '
        + '(restaurant necunoscut, nu primul din listă).', ['fără coloană de restaurant']);
    }
  }

  // — perioade și granularitate
  const per = determinaPerioade(intern, pEfectiv, map, cerere.dataValabil);
  adaugaDiag(col, 'DATE_INVALIDE', 'ATENTIE', 'Date calendaristice necitibile',
    'Rândurile cu dată invalidă nu pot fi atribuite unei perioade.', per.dateInvalide);

  // — numere invalide pe câmpurile numerice ale variantei
  const campuriNumerice: Partial<Record<TipImport, string[]>> = {
    PMIX: ['cant', 'net'], SALES: ['net', 'brut'], FC29: ['valoare'],
    FC29_MATERIAL: ['costActual', 'costTeoretic'], SALES_MIX: ['cant', 'valoare'],
    COST_INGREDIENTE: ['pret'], RETETAR: ['cant'], RETETAR_NBO: ['cant'],
  };
  const numereInvalide: string[] = [];
  for (const c of campuriNumerice[intern] ?? []) {
    if (map[c] === undefined) continue;
    pEfectiv.randuri.forEach((r, i) => {
      const brut = r[map[c]!];
      if (String(brut ?? '').trim() === '') return;
      if (parseNumar(brut) === null) numereInvalide.push(`rândul ${i + 2}, ${c}: „${String(brut)}"`);
    });
  }
  adaugaDiag(col, 'NUMERE_INVALIDE', 'ATENTIE', 'Valori numerice necitibile',
    'Rândurile cu numere invalide sunt ignorate de import — nu se presupune zero.', numereInvalide);

  // — rânduri duplicate în fișier
  const chei = new Map<string, number>();
  for (const r of pEfectiv.randuri) {
    if (randGol(r)) continue;
    const k = cheieRand(intern, r, map);
    if (k === null || k.replace(/\|/g, '').trim() === '') continue;
    chei.set(k, (chei.get(k) ?? 0) + 1);
  }
  adaugaDiag(col, 'RANDURI_DUPLICATE', 'ATENTIE', 'Rânduri duplicate în fișier',
    'Aceeași cheie apare de mai multe ori: valorile se suprapun la import.',
    [...chei.entries()].filter(([, n]) => n > 1).map(([k, n]) => `${k} ×${n}`).sort());

  // — canalul, unde sursa îl poate avea
  if (intern === 'PMIX' || intern === 'SALES') {
    const necunoscute = new Set<string>();
    let fara = 0;
    pEfectiv.randuri.forEach(r => {
      const brut = map.canal !== undefined ? r[map.canal] : '';
      const c = detecteazaCanal(brut, cerere.fisier);
      if (c) return;
      const s = String(brut ?? '').trim();
      if (s) necunoscute.add(s); else fara++;
    });
    adaugaDiag(col, 'CANAL_NECUNOSCUT', 'ATENTIE', 'Valori de canal nerecunoscute',
      'Nu se ghicește: rândurile rămân cu canalul stabilit de import, iar valorile de mai jos sunt semnalate.',
      [...necunoscute].sort());
    if (fara && map.canal === undefined) {
      adaugaDiag(col, 'CANAL_NECUNOSCUT', 'INFO', 'Fișier fără coloană de canal',
        'Canalul se deduce din numele fișierului sau rămâne necunoscut — nu se repartizează arbitrar.',
        [`${fara} rânduri`]);
    }
  }

  // — referințe: produse, ingrediente, categorii
  if (intern === 'PMIX' && map.produs !== undefined) {
    const cunoscute = new Set(state.produse.map(x => x.cod));
    const necunoscute = [...new Set(pEfectiv.randuri
      .map(r => String(r[map.produs!] ?? '').trim())
      .filter(c => c && !cunoscute.has(c)))].sort();
    adaugaDiag(col, 'PRODUS_LIPSA', 'ATENTIE', 'Produse necunoscute în nomenclator',
      'Vânzările lor intră, dar fără rețetă costul nu se poate calcula — apar în acoperire.', necunoscute);
    const cuReteta = new Set(state.retete.map(r => r.cod));
    adaugaDiag(col, 'RETETA_LIPSA', 'ATENTIE', 'Produse vândute fără rețetă',
      'Costul lor NU e presupus zero: rămâne necunoscut până la importul rețetei.',
      [...new Set(pEfectiv.randuri.map(r => String(r[map.produs!] ?? '').trim())
        .filter(c => c && cunoscute.has(c) && !cuReteta.has(c)))].sort());
  }
  if ((intern === 'RETETAR' || intern === 'RETETAR_NBO') && map.comp !== undefined) {
    const cunoscute = new Set(state.ingrediente.map(i => i.cod));
    const numeIng = new Map(state.ingrediente.map(i => [norm(i.denumire), i.cod]));
    adaugaDiag(col, 'INGREDIENT_LIPSA', 'ATENTIE', 'Componente absente din nomenclator',
      'Vor fi create sau vor rămâne fără preț — costul lor nu se poate calcula până la maparea corectă.',
      [...new Set(pEfectiv.randuri.map(r => String(r[map.comp!] ?? '').trim())
        .filter(c => c && !cunoscute.has(c) && !numeIng.has(norm(c))))].sort());
  }
  if (intern === 'FC29' || intern === 'FC29_MATERIAL') {
    const campCat = map.categorie;
    if (campCat !== undefined) {
      const necunoscute = [...new Set(pEfectiv.randuri.map(r => String(r[campCat] ?? '').trim())
        .filter(c => c && clasificaNecunoscuta(c)))].sort();
      adaugaDiag(col, 'CATEGORIE_NECUNOSCUTA', 'ATENTIE', 'Categorii 2.9 nerecunoscute',
        'NU se presupun Food: rămân neclasificate până la o regulă explicită.', necunoscute);
    }
  }
  if (intern === 'COST_INGREDIENTE' && map.pret !== undefined) {
    const faraPret = pEfectiv.randuri
      .map((r, i) => ({ i, cod: String(r[map.cod ?? ''] ?? '').trim(), pret: parseNumar(r[map.pret!]) }))
      .filter(x => x.cod && (x.pret === null || x.pret <= 0))
      .map(x => `${x.cod} (rândul ${x.i + 2})`);
    adaugaDiag(col, 'PRET_LIPSA', 'ATENTIE', 'Ingrediente fără preț valid în fișier',
      'Rămân fără preț: costul lor e necunoscut, nu zero.', faraPret);
  }

  // — idempotență și conflicte de versiune
  const versiuni = state.versiuniImport ?? [];
  const acelasiFisier = versiuni.filter(v => v.tip === tip);
  const duplicatExact = acelasiFisier.some(v => v.amprenta === amprenta);
  const duplicat: RezultatCentral['duplicat'] = duplicatExact ? 'DUPLICAT_EXACT'
    : acelasiFisier.some(v => v.fisier === cerere.fisier) ? 'REIMPORT_ACTUALIZAT' : 'NOU';
  if (duplicatExact) {
    adaugaDiag(col, 'IMPORT_DUPLICAT', 'ATENTIE', 'Fișier deja importat',
      'Aceeași amprentă de conținut există deja: reimportul nu adaugă date noi și nu dublează nimic.',
      [amprenta]);
  }
  const dataEfectiva = cerere.dataValabil ?? per.dataMin
    ?? (per.perioade[0] ? `${per.perioade[0]}-01` : acum.slice(0, 10));
  const activaCurenta = acelasiFisier.find(v => v.activa);
  if (activaCurenta && dataEfectiva < activaCurenta.dataEfectiva) {
    adaugaDiag(col, 'VERSIUNI_IN_CONFLICT', 'ATENTIE', 'Versiune mai veche decât cea activă',
      `Versiunea activă (${activaCurenta.id}) se aplică din ${activaCurenta.dataEfectiva}, iar acest fișier `
      + `din ${dataEfectiva}: se păstrează ca istoric, dar NU devine versiunea curentă.`,
      [`${activaCurenta.id} → ${activaCurenta.dataEfectiva}`, `fișier nou → ${dataEfectiva}`]);
  }

  // — rularea propriu-zisă, pe o COPIE: starea reală rămâne neatinsă
  const copie = clona(state);
  const optiuni: OpteImport = {
    ...cerere.optiuni,
    ...(cerere.dataValabil ? { dataValabil: cerere.dataValabil } : {}),
    // 4.7 își primește restaurantul prin opțiunea lui dedicată (raportul e agregat pe unitate)
    ...(cerere.locatie && intern === 'SALES_MIX' ? { locatieRaport: cerere.locatie } : {}),
  };
  const rulat = importa(intern, pEfectiv, cerere.fisier, copie, cerere.mapare, optiuni);
  const erori = [...rulat.batch.erori];
  const avertismente = [...rulat.batch.avertismente];

  const importate = rulat.batch.importate;
  const randuriUtile = pEfectiv.randuri.filter(r => !randGol(r)).length;
  const dinGrila = CITITE_DIN_GRILA.includes(intern);
  const randuriSursa = dinGrila ? (pEfectiv.matrice?.length ?? randuriUtile) : randuriUtile;
  if (importate === 0) {
    adaugaDiag(col, 'NIMIC_IMPORTAT', 'BLOCANT', 'Importul nu a adus niciun rând',
      randuriSursa === 0
        ? 'Fișierul nu conține rânduri de date.'
        : 'Toate rândurile au fost ignorate de motor (coloane, date sau valori necitibile). '
          + 'Un import care nu importă nimic nu se activează — altfel ar crea o versiune goală.',
      [`${randuriSursa} rânduri în fișier, 0 importate`]);
  }

  const blocante = col.diag.filter(d => d.nivel === 'BLOCANT');
  const valid = erori.length === 0 && blocante.length === 0 && !duplicatExact;

  const schimbari: SchimbariDetectate = {
    // lista de prețuri folosește același motor ca nomenclatorul, dar NU e o revizie de
    // nomenclator: altfel un fișier cu o linie ar raporta tot nomenclatorul drept „absent"
    nomenclator: tip === 'NOMENCLATOR' ? schimbariNomenclator(state, rulat.stateNou, pEfectiv, map) : null,
    retete: intern === 'RETETAR' || intern === 'RETETAR_NBO'
      ? schimbariReteta(state, rulat.stateNou, pEfectiv, map) : null,
    preturi: schimbariPret(state, rulat.stateNou, cerere.fisier, amprenta),
  };
  if (schimbari.nomenclator?.coduriDuplicateInFisier.length) {
    adaugaDiag(col, 'RANDURI_DUPLICATE', 'ATENTIE', 'Coduri de ingredient duplicate în fișier',
      'Ultima apariție câștigă la import: verifică fișierul dacă nu e intenționat.',
      schimbari.nomenclator.coduriDuplicateInFisier);
  }

  // acoperirea se raportează față de ÎNREGISTRĂRILE așteptate, nu față de rândurile brute:
  // motorul agregă rândurile cu aceeași cheie, iar o agregare nu e un rând „sărit"
  const cheiDistincte = chei.size;
  const asteptate = dinGrila ? null : (cheiDistincte > 0 ? cheiDistincte : randuriUtile);
  const nr = randuriSursa;
  const rezultat: RezultatCentral = {
    fisier: cerere.fisier, tip, tipIntern: intern, detectie,
    perioada: per.perioade[0] ?? null, perioade: per.perioade,
    intervalDe: per.intervalDe, intervalLa: per.intervalLa,
    dataEfectiva, granularitate: per.granularitate,
    scop: scop.scop, restaurante: scop.restaurante,
    randuri: nr, importate,
    sarite: asteptate !== null ? Math.max(0, asteptate - importate) : null,
    avertismente, erori,
    acoperire: asteptate !== null && asteptate > 0 ? Math.min(100, (importate / asteptate) * 100) : null,
    duplicat, amprenta,
    versiune: null, activat: false,
    stare: duplicatExact ? 'DUPLICAT' : valid ? 'VALIDAT' : 'RESPINS',
    importatLa: acum, actor,
    diagnostice: sorteazaDiag(col.diag),
    schimbari,
    audit: {
      id: `A_${fnv1a(`${amprenta}|${acum}|${cerere.fisier}|${actor}`)}`, actor, data: acum, fisier: cerere.fisier,
      tip, tipIntern: intern, perioada: per.perioade[0] ?? null,
      scop: scop.scop, restaurante: scop.restaurante,
      randuri: nr, importate,
      validare: duplicatExact ? 'DUPLICAT' : valid ? 'VALIDAT' : 'RESPINS',
      amprenta, versiune: null, activat: false,
    },
  };
  return {
    rezultat,
    stareCandidat: valid ? deterministaBatch(rulat.stateNou, state, amprenta, acum) : null,
    valid,
    bazaStare: amprentaStare(state),
  };
}

/**
 * Lotul de import scris de motor poartă un id aleator și ceasul mașinii. Pentru ca aceeași
 * pregătire să dea aceeași stare, lotul nou primește un id derivat din amprentă și ora
 * declarată a importului.
 */
function deterministaBatch(dupa: AppState, inainte: AppState, amprenta: string, acum: string): AppState {
  if (dupa.importuri.length <= inainte.importuri.length) return dupa;
  // motorul poate adăuga lotul la început SAU la sfârșit — îl recunoaștem după id-ul
  // care nu exista înainte, nu după poziție
  const vechi = new Set(inainte.importuri.map(b => b.id));
  let normalizat = 0;
  return {
    ...dupa,
    importuri: dupa.importuri.map(b =>
      vechi.has(b.id) ? b : { ...b, id: `B_${amprenta}_${normalizat++}`, data: acum }),
  };
}

const sorteazaDiag = (d: DiagnosticImport[]): DiagnosticImport[] =>
  [...d].sort((a, b) => {
    const o = { BLOCANT: 0, ATENTIE: 1, INFO: 2 };
    return o[a.nivel] - o[b.nivel] || a.cod.localeCompare(b.cod);
  });

/** O categorie 2.9 pe care nicio regulă nu o recunoaște — la import doar se semnalează. */
const clasificaNecunoscuta = (categorie: string) => clasificaCategorie29(categorie).neclasificat;

// ————————————————————————————————————————————————————————— activarea (singura scriere)

export interface RezultatActivare { stareNoua: AppState; rezultat: RezultatCentral; }

/**
 * Aplică un import PREGĂTIT. Dacă validarea nu a trecut, starea se întoarce NESCHIMBATĂ,
 * iar rezultatul rămâne RESPINS — un import invalid nu poate corupe parțial nimic.
 */
export function activeazaImport(state: AppState, pregatire: PregatireImport): RezultatActivare {
  const r = pregatire.rezultat;
  // pregătirea e valabilă doar pentru starea pe care a fost calculată: altfel activarea ei
  // ar rescrie datele cu un instantaneu vechi și ar șterge, tăcut, importul dintre timp
  // (inclusiv la o a doua activare a ACELEIAȘI pregătiri)
  if (pregatire.valid && pregatire.bazaStare !== amprentaStare(state)) {
    const respins: RezultatCentral = {
      ...r, stare: 'RESPINS', activat: false,
      erori: [...r.erori, 'Starea s-a schimbat de la pregătirea acestui import (alt import activat între timp, '
        + 'sau aceeași pregătire activată de două ori). Repetă pregătirea pe starea curentă.'],
    };
    const audit: IntrareAudit = { ...(respins.audit ?? auditGol(respins)), validare: 'RESPINS', activat: false };
    return {
      stareNoua: { ...state, auditImport: [...(state.auditImport ?? []), audit] },
      rezultat: { ...respins, audit },
    };
  }
  if (!pregatire.valid || !pregatire.stareCandidat || !r.tip || !r.tipIntern) {
    const audit: IntrareAudit = { ...(r.audit ?? auditGol(r)), activat: false };
    return {
      stareNoua: { ...state, auditImport: [...(state.auditImport ?? []), audit] },
      rezultat: { ...r, activat: false, audit },
    };
  }

  const versiuni = [...(state.versiuniImport ?? [])];
  const alePipului = versiuni.filter(v => v.tip === r.tip);
  const nr = alePipului.length + 1;
  const dataEfectiva = r.dataEfectiva;
  const activaCurenta = alePipului.find(v => v.activa);
  // o versiune mai veche decât cea activă rămâne istoric, dar nu preia rolul de curentă
  const devineActiva = !activaCurenta || dataEfectiva >= activaCurenta.dataEfectiva;
  const versiune: VersiuneSursa = {
    id: `${r.tip}#${nr}`, tip: r.tip, nr,
    fisier: r.fisier, amprenta: r.amprenta,
    dataEfectiva, importatLa: r.importatLa,
    activa: devineActiva, scop: r.scop, restaurante: r.restaurante,
    perioada: r.perioada,
    ...(r.intervalDe && r.intervalLa ? { intervalDe: r.intervalDe, intervalLa: r.intervalLa } : {}),
    randuri: r.randuri,
  };
  const versiuniNoi = versiuni.map(v => (v.tip === r.tip && devineActiva ? { ...v, activa: false } : v));
  versiuniNoi.push(versiune);

  const audit: IntrareAudit = {
    ...(r.audit ?? auditGol(r)),
    validare: 'VALIDAT', versiune: versiune.id, activat: true,
  };
  const stareNoua: AppState = {
    ...pregatire.stareCandidat,
    versiuniImport: versiuniNoi,
    istoricPreturi: [...(state.istoricPreturi ?? []), ...(r.schimbari?.preturi ?? [])],
    auditImport: [...(state.auditImport ?? []), audit],
  };
  return {
    stareNoua,
    rezultat: { ...r, stare: 'ACTIVAT', activat: true, versiune: versiune.id, audit },
  };
}

const auditGol = (r: RezultatCentral): IntrareAudit => ({
  id: `A_${fnv1a(`${r.amprenta}|${r.importatLa}|${r.fisier}|${r.actor}`)}`, actor: r.actor, data: r.importatLa, fisier: r.fisier,
  tip: r.tip ?? 'NEDETECTAT', tipIntern: r.tipIntern ?? '—', perioada: r.perioada,
  scop: r.scop, restaurante: r.restaurante, randuri: r.randuri, importate: 0,
  validare: r.stare === 'NECESITA_CONFIRMARE' ? 'NECESITA_CONFIRMARE' : 'RESPINS',
  amprenta: r.amprenta, versiune: null, activat: false,
});

/**
 * Sursa canonică FC căreia îi aparține o structură internă — sau `null` când nu are una.
 *
 * Nu toate importurile sunt surse de Food Cost. Waste, inventarul, meniurile, baza FC și
 * listele de prețuri de vânzare nu se COMBINĂ cu alt raport într-o cifră, deci nu au
 * interval de comparat și nici verdict de compatibilitate. Pentru ele proveniența
 * înseamnă urma de audit, nu o versiune de sursă — a le inventa una ar pune în banda de
 * perioade rapoarte care n-au ce căuta acolo.
 *
 * `COST_INGREDIENTE` aparține la două surse (nomenclator sau doar prețuri); se alege după
 * câmpurile chiar prezente, în ordinea din `REGULI_CONTINUT`, nu după nume.
 */
export function sursaPentruIntern(intern: TipImport, antete: string[]): TipSursaFC | null {
  const ale = REGULI_CONTINUT.filter(r => r.intern === intern);
  if (!ale.length) return null;
  if (ale.length === 1) return ale[0].tip;
  const m = mapeazaAntete(antete, intern);
  return (ale.find(r => r.cerute.every(c => m[c] !== undefined)) ?? ale[0]).tip;
}

export interface CerereUnificata {
  fisier: string;
  parsat: Parsat;
  /** Structura deja stabilită de ecran: detecție proprie, alegere manuală sau analiză pe foi. */
  intern: TipImport;
  mapare?: Record<string, string>;
  optiuni?: OpteImport;
  locatie?: string;
  dataValabil?: string;
  actor?: string;
  acum?: string;
}

export interface RezultatUnificat {
  stareNoua: AppState;
  batch: ImportBatch;
  /** Prezent doar pentru sursele FC, care trec prin validare-apoi-activare. */
  rezultat: RezultatCentral | null;
  /** Sursa FC sub care s-a versionat importul; `null` pentru rapoartele necombinabile. */
  sursa: TipSursaFC | null;
}

/**
 * Poarta UNICĂ de import. Ambele ecrane intră pe aici, deci nu există două căi prin care
 * datele ajung în stare — și niciun drum pe care proveniența să se piardă tăcut.
 *
 * Rapoartele care SUNT surse FC trec prin stratul canonic: validare pe o copie, apoi
 * activare, cu versiune, interval, amprentă și protecție la dublă activare. Restul trec
 * direct prin motor — același `importa`, niciodată o a doua implementare — și primesc
 * urma de audit, ca fiecare fișier intrat în aplicație să fie explicabil.
 */
export function importaUnificat(state: AppState, cerere: CerereUnificata): RezultatUnificat {
  const acum = cerere.acum ?? new Date().toISOString();
  const actor = cerere.actor?.trim() || ACTOR_SISTEM;
  const sursa = sursaPentruIntern(cerere.intern, cerere.parsat.antete);

  if (sursa) {
    const pregatire = pregatesteImport(state, {
      fisier: cerere.fisier, parsat: cerere.parsat, tip: sursa,
      internPreferat: cerere.intern,
      ...(cerere.mapare ? { mapare: cerere.mapare } : {}),
      ...(cerere.optiuni ? { optiuni: cerere.optiuni } : {}),
      ...(cerere.locatie ? { locatie: cerere.locatie } : {}),
      ...(cerere.dataValabil ? { dataValabil: cerere.dataValabil } : {}),
      actor, acum,
    });
    const { stareNoua, rezultat } = activeazaImport(state, pregatire);
    return { stareNoua, batch: batchDinRezultat(rezultat), rezultat, sursa };
  }

  // raport necombinabil: se importă direct, dar NU tăcut
  const rulat = importa(cerere.intern, cerere.parsat, cerere.fisier, state, cerere.mapare, {
    ...cerere.optiuni,
    ...(cerere.dataValabil ? { dataValabil: cerere.dataValabil } : {}),
  });
  const reusit = rulat.batch.status === 'IMPORTAT';
  const audit: IntrareAudit = {
    id: `A_${fnv1a(`${cerere.fisier}|${acum}|${cerere.intern}|${actor}`)}`,
    actor, data: acum, fisier: cerere.fisier,
    tip: 'NEDETECTAT', tipIntern: cerere.intern, perioada: rulat.batch.perioada ?? null,
    scop: 'COMPANIE', restaurante: [],
    randuri: rulat.batch.randuri, importate: rulat.batch.importate,
    validare: reusit ? 'VALIDAT' : 'RESPINS',
    amprenta: `fp_direct_${fnv1a(`${cerere.fisier}|${cerere.intern}|${rulat.batch.randuri}`)}`,
    versiune: null, activat: reusit,
  };
  return {
    stareNoua: { ...rulat.stateNou, auditImport: [...(rulat.stateNou.auditImport ?? []), audit] },
    batch: rulat.batch, rezultat: null, sursa: null,
  };
}

/** Rezultatul canonic, redus la forma pe care ecranele o afișează deja. */
function batchDinRezultat(r: RezultatCentral): ImportBatch {
  return {
    ...(r.perioada ? { perioada: r.perioada } : {}),
    id: r.amprenta, tip: r.tipIntern ?? r.tip ?? 'NEDETECTAT', fisier: r.fisier,
    data: r.importatLa, randuri: r.randuri, importate: r.importate,
    avertismente: r.avertismente, erori: r.erori,
    status: r.activat ? 'IMPORTAT' : 'ESUAT',
  };
}

/** Comoditate: pregătește și, dacă validarea trece, activează — într-un singur apel. */
export function importaPrinCentru(state: AppState, cerere: CerereImport): RezultatActivare {
  return activeazaImport(state, pregatesteImport(state, cerere));
}

/** Versiunea activă a unui tip de sursă, dacă există. */
export const versiuneActivaSursa = (state: AppState, tip: TipSursaFC): VersiuneSursa | null =>
  (state.versiuniImport ?? []).find(v => v.tip === tip && v.activa) ?? null;

/** Istoricul de preț al unui ingredient, ordonat cronologic. */
export const istoricPret = (state: AppState, ingredient: string): IntrarePretIstoric[] =>
  (state.istoricPreturi ?? []).filter(x => x.ingredient === ingredient)
    .sort((a, b) => a.dataEfectiva.localeCompare(b.dataEfectiva));

/** Rezumat într-o linie, pentru jurnale. */
export const descrieImport = (r: RezultatCentral) =>
  `${r.fisier} · ${r.tip ? ETICHETA_SURSA[r.tip] : 'nedetectat'} · ${r.stare} · `
  + `${r.importate}/${r.randuri} rânduri · ${r.scop}${r.restaurante.length ? ` (${r.restaurante.join(', ')})` : ''}`;
