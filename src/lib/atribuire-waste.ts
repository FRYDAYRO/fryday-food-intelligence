/**
 * Atribuirea waste-ului față de Usage Actual din 2.9 — regula corectată.
 *
 * Principii (contractul PR #23, punctele 1–5):
 *  · POTRIVIREA cantitativă (evenimente 2.8 față de Inv Adj 2.9, pe restaurant × fereastră ×
 *    material × UM) e o observație, NU o dovadă: `Adj = 5` poate fi o corecție de inventar și
 *    `Qty 2.8 = 5` waste neajustat; nici `Adj = 0` nu demonstrează singur includerea în Usage;
 *  · STATUTUL includerii („inclus în Usage Actual", „exclus prin ajustare", „nedeterminat") vine
 *    NUMAI dintr-o declarație cu temei și proveniență (regulă NBO confirmată, legătură verificată
 *    cu mișcările de stoc, declarația omului). Fără declarație totul e NEDETERMINAT;
 *  · numai partea INCLUSĂ în Usage Actual poate reduce Neexplicatul (aici doar se clasifică;
 *    puntea consumă rezultatul);
 *  · nu există totaluri în unități între UM diferite: acoperirea se exprimă pe coduri și în lei,
 *    fiecare parte cu evaluarea ei (2.8 la Extension tipărit, 2.9 la Cost per Unit);
 *  · precizia: 2.9 tipărește unitățile cu o zecimală, deci o diferență ≤ 0,05 e „compatibilă cu
 *    precizia", nu waste suplimentar demonstrat — dar rămâne raportată;
 *  · valorile clasificate din 2.8 însumează EXACT totalul rândurilor (repartizare proporțională
 *    cu cantitatea, restul de rotunjire la NEDETERMINAT); diferența față de un total tipărit al
 *    raportului rămâne separată;
 *  · rezultatul e pur și se recalculează la fiecare apel: schimbarea versiunii 2.9 selectate sau
 *    a mapărilor aprobate schimbă potrivirea, nu un statut memorat.
 */
import { pretLa, versiuneLa } from './engine';
import type { Ingredient, Material29, Reteta, Sursa29, VersiuneReteta } from './types';

export type Includere = 'INCLUS_IN_USAGE' | 'EXCLUS_PRIN_AJUSTARE' | 'NEDETERMINAT';
export type TemeiIncludere = 'REGULA_NBO_CONFIRMATA' | 'LEGATURA_STOC_VERIFICATA' | 'DECLARATIE_UTILIZATOR';

/** Un eveniment din raportul 2.8 (Spoilage and Loss), cu coloanele dovedite pe raportul real. */
export interface Eveniment28 {
  locatie: string | null;
  /** Fereastra raportului 2.8 (rândurile nu au dată proprie). */
  fereastra: { de: string; la: string };
  cod: string;
  denumire: string;
  motiv: string;
  utilizator?: string;
  um: string;
  cant: number;
  /** Cost/Unit propriu al 2.8 — evaluarea raportului, nu Cost per Unit din 2.9. */
  costUnitar: number;
  /** Extension tipărit. */
  lei: number;
  rand?: number;
  sursa?: Sursa29;
}

/** Declarația care dă statut unei cantități: fără ea, cantitatea rămâne nedeterminată. */
export interface DeclaratieIncludere {
  locatie: string | null;
  fereastra: { de: string; la: string };
  material: string;
  includere: Exclude<Includere, 'NEDETERMINAT'>;
  cant: number;
  temei: TemeiIncludere;
  /** Cine/ce a stabilit-o: documentul NBO, verificarea, utilizatorul — cu data. */
  sursa: string;
}

export type Potrivire29 =
  | 'EXACTA'                    // Qty 2.8 = Adj 2.9
  | 'COMPATIBILA_CU_PRECIZIA'   // diferă cu cel mult jumătate din ultima zecimală tipărită
  | 'DIFERENTA_REALA'           // diferă peste precizia tipăririi
  | 'FARA_EVENIMENT_28'         // Adj ≠ 0 fără niciun eveniment 2.8
  | 'FARA_CORESPONDENT_29'      // evenimente 2.8 pe un cod absent din selecția 2.9
  | 'FARA_COLOANA_ADJ'          // materialul există în 2.9, dar fără coloana Adj (necunoscut)
  | 'UM_DIFERITA';              // unitățile nu coincid: cantitățile nu se compară

export interface ParteIncludere { cant: number; lei: number; }

export interface LiniePotrivire {
  locatie: string | null;
  fereastra: { de: string; la: string };
  material: string;
  denumire: string;
  um: string;
  /** Inv Adj 2.9; `null` = coloana absentă (necunoscut) sau material absent din 2.9. */
  adj: number | null;
  costPeUnitate: number | null;
  /** |Adj| × CPU, când e calculabil. */
  leiEstimat29: number | null;
  cant28: number;
  nrEvenimente: number;
  /** Σ Extension 2.8 pe linie — evaluarea proprie a 2.8. */
  lei28: number;
  /** Qty 2.8 − Adj 2.9; `null` când nu se compară. */
  diferenta: number | null;
  potrivire: Potrivire29;
  /** Statutul cantităților și al lei-lor 2.8: însumează exact `cant28` și `lei28`. */
  parti: Record<Includere, ParteIncludere>;
  /** Declarații care depășeau cantitatea disponibilă (au fost plafonate). */
  declaratiiPlafonate: number;
  motive: { motiv: string; cant: number; lei: number }[];
  /** Codurile 2.8 care au intrat pe linie (codul propriu și aliasurile aprobate). */
  coduri28: string[];
  evenimente: Eveniment28[];
}

export interface Potrivire28cu29 {
  linii: LiniePotrivire[];
  /** Acoperire pe CODURI (nu pe unități, care nu se însumează între UM). */
  coduri: { cuAdj: number; cuEvenimente: number; ambele: number; doarAdj: number; doarEvenimente: number; faraColoanaAdj: number };
  /** Σ Extension 2.8 pe toate evenimentele primite (rândurile). */
  lei28: number;
  /** Repartizarea lei-lor 2.8 pe statut — însumează exact `lei28`. */
  lei28Parti: Record<Includere, number>;
  /** Diferența dintre un total tipărit al 2.8 și suma rândurilor, ținută separat (rotunjirea raportului). */
  diferentaTotalTiparit28: number | null;
  /** Σ |Adj| × CPU pe materialele selecției cu Adj ≠ 0 (estimare 2.9, altă evaluare decât 2.8). */
  leiEstimat29: number;
  /** Partea din `leiEstimat29` a materialelor fără niciun eveniment 2.8. */
  leiEstimat29FaraEvenimente: number;
  precizie: number;
}

/** Unitățile 2.9 sunt tipărite cu o zecimală. */
export const PRECIZIE_UNITATI_29 = 0.1;

const normUM = (u: string) => {
  const s = u.trim().toLowerCase();
  return s === 'each' || s === 'pcs' || s === 'pc' || s === 'buc' ? 'ea' : s === 'liter' || s === 'litre' || s === 'ltr' || s === 'lt' ? 'l' : s;
};
const cheie = (loc: string | null, f: { de: string; la: string }, material: string) => `${loc ?? ''}|${f.de}|${f.la}|${material}`;
const rot2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Potrivirea evenimentelor 2.8 cu ajustările 2.9 ale selecției date. `aliasuri`: cod 2.8 → cod
 * de material 2.9 (mapările APROBATE); `declaratii`: singura sursă de statut.
 */
export function potriveste28cu29(
  materiale: Material29[], evenimente: Eveniment28[], aliasuri: Record<string, string> = {},
  declaratii: DeclaratieIncludere[] = [], optiuni: { precizie?: number; totalTiparit28?: number } = {},
): Potrivire28cu29 {
  const precizie = optiuni.precizie ?? PRECIZIE_UNITATI_29;
  const toleranta = precizie / 2 + 1e-9;

  const peMaterial = new Map<string, Material29>();
  for (const m of materiale) {
    if (!m.fereastra) continue;
    peMaterial.set(cheie(m.locatie, m.fereastra, m.material), m);
  }
  const peCheie = new Map<string, Eveniment28[]>();
  for (const e of evenimente) {
    const k = cheie(e.locatie, e.fereastra, aliasuri[e.cod] ?? e.cod);
    if (!peCheie.has(k)) peCheie.set(k, []);
    peCheie.get(k)!.push(e);
  }

  const linii: LiniePotrivire[] = [];
  const chei = new Set<string>([...peCheie.keys(), ...[...peMaterial.entries()].filter(([, m]) => m.ajustari !== undefined && m.ajustari !== 0).map(([k]) => k)]);
  for (const k of chei) {
    const m = peMaterial.get(k) ?? null;
    const ev = peCheie.get(k) ?? [];
    const [loc, de, la, material] = k.split('|');
    const adj = m && m.ajustari !== undefined ? m.ajustari : null;
    const cpu = m?.costPeUnitate ?? null;
    const leiEstimat29 = adj !== null && cpu !== null && cpu > 0 ? Math.abs(adj) * cpu : null;
    const cant28 = ev.reduce((s, e) => s + e.cant, 0);
    const lei28 = rot2(ev.reduce((s, e) => s + e.lei, 0));
    const umuri = new Set(ev.map(e => normUM(e.um)));
    const um = ev[0]?.um ?? m?.umInventar ?? '';
    const umOk = umuri.size <= 1 && (!m?.umInventar || !ev.length || umuri.has(normUM(m.umInventar)));

    let potrivire: Potrivire29;
    let diferenta: number | null = null;
    if (!m) potrivire = 'FARA_CORESPONDENT_29';
    else if (adj === null) potrivire = 'FARA_COLOANA_ADJ';
    else if (!ev.length) potrivire = 'FARA_EVENIMENT_28';
    else if (!umOk) potrivire = 'UM_DIFERITA';
    else {
      diferenta = rot2(cant28 - adj);
      potrivire = Math.abs(diferenta) < 1e-9 ? 'EXACTA' : Math.abs(diferenta) <= toleranta ? 'COMPATIBILA_CU_PRECIZIA' : 'DIFERENTA_REALA';
    }

    // statutul: NUMAI din declarații; potrivirea (chiar EXACTA) nu clasifică nimic
    const decl = declaratii.filter(d => cheie(d.locatie, d.fereastra, d.material) === k);
    let plafonate = 0;
    let ramas = cant28;
    const cantDecl = (fel: Exclude<Includere, 'NEDETERMINAT'>, plafon: number) => {
      const cerut = decl.filter(d => d.includere === fel).reduce((s, d) => s + Math.max(0, d.cant), 0);
      const acordat = Math.min(cerut, plafon, ramas);
      if (cerut > acordat + 1e-9) plafonate++;
      ramas -= acordat;
      return acordat;
    };
    // „exclus prin ajustare" nu poate depăși ajustarea tipărită; „inclus" nu poate depăși restul
    const exclus = cantDecl('EXCLUS_PRIN_AJUSTARE', adj !== null && adj > 0 ? adj : 0);
    const inclus = cantDecl('INCLUS_IN_USAGE', Number.POSITIVE_INFINITY);
    const nedeterminat = Math.max(0, cant28 - exclus - inclus);
    const leiPt = (c: number) => (cant28 > 0 ? rot2(lei28 * (c / cant28)) : 0);
    const leiExclus = leiPt(exclus), leiInclus = leiPt(inclus);
    const parti: Record<Includere, ParteIncludere> = {
      EXCLUS_PRIN_AJUSTARE: { cant: exclus, lei: leiExclus },
      INCLUS_IN_USAGE: { cant: inclus, lei: leiInclus },
      // restul de rotunjire rămâne aici, ca suma părților să fie exact lei28
      NEDETERMINAT: { cant: nedeterminat, lei: rot2(lei28 - leiExclus - leiInclus) },
    };

    const motive = new Map<string, { motiv: string; cant: number; lei: number }>();
    for (const e of ev) {
      const x = motive.get(e.motiv) ?? { motiv: e.motiv, cant: 0, lei: 0 };
      x.cant += e.cant; x.lei = rot2(x.lei + e.lei);
      motive.set(e.motiv, x);
    }

    linii.push({
      locatie: loc || null, fereastra: { de, la }, material,
      denumire: m?.denumire ?? ev[0]?.denumire ?? material, um,
      adj, costPeUnitate: cpu, leiEstimat29, cant28, nrEvenimente: ev.length, lei28, diferenta, potrivire, parti,
      declaratiiPlafonate: plafonate, motive: [...motive.values()], coduri28: [...new Set(ev.map(e => e.cod))], evenimente: ev,
    });
  }
  linii.sort((a, b) => (b.lei28 || b.leiEstimat29 || 0) - (a.lei28 || a.leiEstimat29 || 0) || a.denumire.localeCompare(b.denumire));

  const cuAdj = linii.filter(l => l.adj !== null && l.adj !== 0);
  const cuEv = linii.filter(l => l.nrEvenimente > 0);
  const lei28Parti: Record<Includere, number> = { INCLUS_IN_USAGE: 0, EXCLUS_PRIN_AJUSTARE: 0, NEDETERMINAT: 0 };
  for (const l of linii) for (const f of Object.keys(lei28Parti) as Includere[]) lei28Parti[f] = rot2(lei28Parti[f] + l.parti[f].lei);
  const lei28 = rot2(linii.reduce((s, l) => s + l.lei28, 0));
  return {
    linii,
    coduri: {
      cuAdj: cuAdj.length, cuEvenimente: cuEv.length,
      ambele: linii.filter(l => l.adj !== null && l.adj !== 0 && l.nrEvenimente > 0).length,
      doarAdj: linii.filter(l => l.potrivire === 'FARA_EVENIMENT_28').length,
      doarEvenimente: linii.filter(l => l.potrivire === 'FARA_CORESPONDENT_29').length,
      faraColoanaAdj: linii.filter(l => l.potrivire === 'FARA_COLOANA_ADJ').length,
    },
    lei28, lei28Parti,
    diferentaTotalTiparit28: optiuni.totalTiparit28 !== undefined ? rot2(optiuni.totalTiparit28 - lei28) : null,
    leiEstimat29: rot2(cuAdj.reduce((s, l) => s + (l.leiEstimat29 ?? 0), 0)),
    leiEstimat29FaraEvenimente: rot2(cuAdj.filter(l => l.nrEvenimente === 0).reduce((s, l) => s + (l.leiEstimat29 ?? 0), 0)),
    precizie,
  };
}

// ————————————————————————————————————————————————————————— evaluarea datată pe o fereastră

/**
 * Prețul unui ingredient pe o fereastră FĂRĂ dată pe eveniment (raportul 2.8 lunar): e
 * determinabil doar dacă un singur preț a fost în vigoare pe toată fereastra — altfel nu se
 * alege o zi în locul raportului.
 */
export function pretDeterminabil(ing: Ingredient, f: { de: string; la: string }): { determinabil: boolean; pret: number | null; preturi: number[] } {
  if (!ing.preturi.length) return { determinabil: false, pret: null, preturi: [] };
  const preturi = new Set<number>([pretLa(ing, f.de)]);
  for (const p of ing.preturi) if (p.validDeLa > f.de && p.validDeLa <= f.la) preturi.add(pretLa(ing, p.validDeLa));
  const lista = [...preturi];
  return { determinabil: lista.length === 1, pret: lista.length === 1 ? lista[0] : null, preturi: lista };
}

const semnaturaLinii = (v: VersiuneReteta) =>
  JSON.stringify([...v.linii].map(l => [l.comp, l.tipComp, l.cant, l.um, l.canal, l.pierdere ?? 0]).sort());

/**
 * Versiunea de rețetă pe o fereastră fără dată pe eveniment: determinabilă doar dacă o singură
 * versiune a fost în vigoare, sau dacă toate versiunile din fereastră au aceleași linii.
 */
export function versiuneDeterminabila(r: Reteta, f: { de: string; la: string }): { determinabil: boolean; versiune: VersiuneReteta | null; versiuni: number[] } {
  if (!r.versiuni.length) return { determinabil: false, versiune: null, versiuni: [] };
  const inVigoare = new Map<number, VersiuneReteta>();
  const prima = versiuneLa(r, f.de);
  inVigoare.set(prima.nr, prima);
  for (const v of r.versiuni) if (v.data > f.de && v.data <= f.la) { const x = versiuneLa(r, v.data); inVigoare.set(x.nr, x); }
  const lista = [...inVigoare.values()];
  const semnaturi = new Set(lista.map(semnaturaLinii));
  const determinabil = semnaturi.size === 1;
  return { determinabil, versiune: determinabil ? lista[0] : null, versiuni: lista.map(v => v.nr) };
}
