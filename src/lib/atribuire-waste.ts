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
import { sorteazaPreturi } from './engine';
import type { DeclaratieIncludere, Eveniment28, Includere, Ingredient, Material29, Reteta, VersiuneReteta } from './types';

export type { Includere, TemeiIncludere, Eveniment28, DeclaratieIncludere } from './types';

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
  /**
   * Statutul cantităților și al lei-lor 2.8: însumează exact `cant28` și `lei28`, în bani întregi
   * (metoda celui mai mare rest), toate părțile ≥ 0. Fără comparație validă totul e NEDETERMINAT.
   */
  parti: Record<Includere, ParteIncludere>;
  /** Declarații care depășeau cantitatea disponibilă (au fost plafonate). */
  declaratiiPlafonate: number;
  /** Declarații refuzate: comparația nu e validă (fără corespondent 2.9, fără coloană Adj, UM diferită). */
  declaratiiNeaplicate: number;
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
const cheieMaterial = (loc: string | null, f: { de: string; la: string }, material: string) => `${loc ?? ''}|${f.de}|${f.la}|${material}`;
/** Linia de potrivire e pe material ȘI UM: cantitățile cu UM diferite nu se însumează niciodată. */
const cheieLinie = (loc: string | null, f: { de: string; la: string }, material: string, um: string) => `${cheieMaterial(loc, f, material)}|${normUM(um)}`;
const rot2 = (x: number) => Math.round(x * 100) / 100;
const bani = (lei: number) => Math.round(lei * 100);

/**
 * Repartizarea unei sume în bani întregi pe cote proporționale (cel mai mare rest): suma
 * părților e exact totalul, nicio parte nu e negativă. La egalitate de rest câștigă ordinea dată.
 */
function repartizeazaBani(totalBani: number, cote: number[]): number[] {
  const sumaCote = cote.reduce((s, c) => s + c, 0);
  if (!(totalBani > 0) || !(sumaCote > 0)) return cote.map(() => 0);
  const exact = cote.map(c => (totalBani * c) / sumaCote);
  const parti = exact.map(x => Math.floor(x + 1e-9));
  let rest = totalBani - parti.reduce((s, x) => s + x, 0);
  const ordine = exact.map((x, i) => ({ i, frac: x - Math.floor(x + 1e-9) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0 && k < ordine.length; k++, rest--) parti[ordine[k].i]++;
  return parti;
}

/**
 * Potrivirea evenimentelor 2.8 cu ajustările 2.9 ale selecției date. `aliasuri`: cod 2.8 → cod
 * de material 2.9 (mapările APROBATE); `declaratii`: singura sursă de statut — și ea se aplică
 * NUMAI pe o linie cu comparație validă (același restaurant, aceeași fereastră, material prezent
 * în 2.9 cu coloana Adj, aceeași UM).
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
    peMaterial.set(cheieMaterial(m.locatie, m.fereastra, m.material), m);
  }
  const peLinie = new Map<string, Eveniment28[]>();
  for (const e of evenimente) {
    const k = cheieLinie(e.locatie, e.fereastra, aliasuri[e.cod] ?? e.cod, e.um);
    if (!peLinie.has(k)) peLinie.set(k, []);
    peLinie.get(k)!.push(e);
  }
  // materialele cu Adj ≠ 0 intră pe linia UM-ului lor de inventar, chiar fără evenimente
  const chei = new Set<string>(peLinie.keys());
  for (const [km, m] of peMaterial) if (m.ajustari !== undefined && m.ajustari !== 0) chei.add(`${km}|${normUM(m.umInventar ?? '')}`);

  const linii: LiniePotrivire[] = [];
  for (const k of chei) {
    const [loc, de, la, material, umNorm] = k.split('|');
    const m = peMaterial.get(cheieMaterial(loc || null, { de, la }, material)) ?? null;
    const ev = peLinie.get(k) ?? [];
    const adj = m && m.ajustari !== undefined ? m.ajustari : null;
    const cpu = m?.costPeUnitate ?? null;
    const leiEstimat29 = adj !== null && cpu !== null && cpu > 0 ? Math.abs(adj) * cpu : null;
    const cant28 = ev.reduce((s, e) => s + e.cant, 0);
    const lei28 = rot2(ev.reduce((s, e) => s + e.lei, 0));
    const um = ev[0]?.um ?? m?.umInventar ?? '';
    const umOk = !!m?.umInventar && normUM(m.umInventar) === umNorm;

    let potrivire: Potrivire29;
    let diferenta: number | null = null;
    if (!m) potrivire = 'FARA_CORESPONDENT_29';
    else if (adj === null) potrivire = 'FARA_COLOANA_ADJ';
    else if (!umOk) potrivire = 'UM_DIFERITA';
    else if (!ev.length) potrivire = 'FARA_EVENIMENT_28';
    else {
      diferenta = rot2(cant28 - adj);
      potrivire = Math.abs(diferenta) < 1e-9 ? 'EXACTA' : Math.abs(diferenta) <= toleranta ? 'COMPATIBILA_CU_PRECIZIA' : 'DIFERENTA_REALA';
    }
    const comparabila = potrivire === 'EXACTA' || potrivire === 'COMPATIBILA_CU_PRECIZIA' || potrivire === 'DIFERENTA_REALA';

    // statutul: NUMAI din declarații, NUMAI pe o comparație validă; potrivirea (chiar EXACTA)
    // nu clasifică nimic
    const decl = declaratii.filter(d => cheieMaterial(d.locatie, d.fereastra, d.material) === cheieMaterial(loc || null, { de, la }, material));
    let plafonate = 0, neaplicate = 0;
    let ramas = cant28;
    const cantDecl = (fel: Exclude<Includere, 'NEDETERMINAT'>, plafon: number) => {
      const ale = decl.filter(d => d.includere === fel);
      const cerut = ale.reduce((s, d) => s + Math.max(0, d.cant), 0);
      if (!comparabila) { neaplicate += ale.length; return 0; }
      const acordat = Math.min(cerut, plafon, ramas);
      if (cerut > acordat + 1e-9) plafonate++;
      ramas -= acordat;
      return acordat;
    };
    // „exclus prin ajustare" nu poate depăși ajustarea tipărită; „inclus" nu poate depăși restul
    const exclus = cantDecl('EXCLUS_PRIN_AJUSTARE', adj !== null && adj > 0 ? adj : 0);
    const inclus = cantDecl('INCLUS_IN_USAGE', Number.POSITIVE_INFINITY);
    const nedeterminat = Math.max(0, cant28 - exclus - inclus);
    // bani întregi, cel mai mare rest; la egalitate restul merge întâi la NEDETERMINAT
    const [bN, bE, bI] = repartizeazaBani(bani(lei28), [nedeterminat, exclus, inclus]);
    const parti: Record<Includere, ParteIncludere> = {
      EXCLUS_PRIN_AJUSTARE: { cant: exclus, lei: bE / 100 },
      INCLUS_IN_USAGE: { cant: inclus, lei: bI / 100 },
      NEDETERMINAT: { cant: nedeterminat, lei: bN / 100 },
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
      declaratiiPlafonate: plafonate, declaratiiNeaplicate: neaplicate,
      motive: [...motive.values()], coduri28: [...new Set(ev.map(e => e.cod))], evenimente: ev,
    });
  }
  linii.sort((a, b) => (b.lei28 || b.leiEstimat29 || 0) - (a.lei28 || a.leiEstimat29 || 0) || a.denumire.localeCompare(b.denumire));

  // estimarea 2.9 se numără o singură dată pe material, nu pe fiecare linie de UM
  const materialeCuAdj = new Map<string, LiniePotrivire>();
  for (const l of linii) if (l.adj !== null && l.adj !== 0) {
    const km = cheieMaterial(l.locatie, l.fereastra, l.material);
    const cur = materialeCuAdj.get(km);
    if (!cur || (cur.nrEvenimente === 0 && l.nrEvenimente > 0)) materialeCuAdj.set(km, l);
  }
  const cuAdj = [...materialeCuAdj.values()];
  const cuEv = linii.filter(l => l.nrEvenimente > 0);
  const lei28Parti: Record<Includere, number> = { INCLUS_IN_USAGE: 0, EXCLUS_PRIN_AJUSTARE: 0, NEDETERMINAT: 0 };
  for (const l of linii) for (const f of Object.keys(lei28Parti) as Includere[]) lei28Parti[f] = rot2(lei28Parti[f] + l.parti[f].lei);
  const lei28 = rot2(linii.reduce((s, l) => s + l.lei28, 0));
  return {
    linii,
    coduri: {
      cuAdj: cuAdj.length, cuEvenimente: new Set(cuEv.map(l => cheieMaterial(l.locatie, l.fereastra, l.material))).size,
      ambele: cuAdj.filter(l => l.nrEvenimente > 0).length,
      doarAdj: cuAdj.filter(l => l.nrEvenimente === 0).length,
      doarEvenimente: new Set(linii.filter(l => l.potrivire === 'FARA_CORESPONDENT_29').map(l => cheieMaterial(l.locatie, l.fereastra, l.material))).size,
      faraColoanaAdj: new Set(linii.filter(l => l.potrivire === 'FARA_COLOANA_ADJ').map(l => cheieMaterial(l.locatie, l.fereastra, l.material))).size,
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
 * determinabil doar dacă un singur preț a fost în vigoare pe TOATĂ fereastra, cu acoperire
 * istorică de la începutul ei — o intrare care începe în interiorul ferestrei nu se extinde
 * înapoi, iar prima intrare de după fereastră nu spune nimic despre ea.
 */
export function pretDeterminabil(ing: Ingredient, f: { de: string; la: string }): { determinabil: boolean; pret: number | null; preturi: number[]; motiv: string | null } {
  const sortate = sorteazaPreturi(ing.preturi);
  const inVigoareLa = (data: string) => { let p: number | null = null; for (const x of sortate) if (x.validDeLa <= data) p = x.pret; return p; };
  const laInceput = inVigoareLa(f.de);
  if (laInceput === null) {
    return { determinabil: false, pret: null, preturi: [], motiv: `niciun preț în vigoare la ${f.de}: istoricul începe după începutul ferestrei` };
  }
  const preturi = new Set<number>([laInceput]);
  for (const x of sortate) if (x.validDeLa > f.de && x.validDeLa <= f.la) preturi.add(inVigoareLa(x.validDeLa)!);
  const lista = [...preturi];
  return lista.length === 1
    ? { determinabil: true, pret: lista[0], preturi: lista, motiv: null }
    : { determinabil: false, pret: null, preturi: lista, motiv: `prețul se schimbă în interiorul ferestrei (${lista.join(' → ')}) și evenimentele nu au dată` };
}

const semnaturaLinii = (v: VersiuneReteta) =>
  JSON.stringify([...v.linii].map(l => [l.comp, l.tipComp, l.cant, l.um, l.canal, l.pierdere ?? 0]).sort());

/** Versiunea în vigoare la o dată, strict din istoric (fără sentinela „azi" și fără prima versiune ca rezervă). */
const versiuneInVigoareLa = (r: Reteta, data: string): VersiuneReteta | null =>
  r.versiuni.filter(v => v.data <= data).reduce<VersiuneReteta | null>((a, b) => (!a || b.data > a.data || (b.data === a.data && b.nr > a.nr) ? b : a), null);

/**
 * Versiunea de rețetă pe o fereastră fără dată pe eveniment: determinabilă doar dacă o singură
 * versiune a fost în vigoare pe toată fereastra (acoperire de la începutul ei), sau dacă toate
 * versiunile din fereastră au aceleași linii.
 */
export function versiuneDeterminabila(r: Reteta, f: { de: string; la: string }): { determinabil: boolean; versiune: VersiuneReteta | null; versiuni: number[]; motiv: string | null } {
  const prima = versiuneInVigoareLa(r, f.de);
  if (!prima) return { determinabil: false, versiune: null, versiuni: [], motiv: `nicio versiune în vigoare la ${f.de}: rețeta începe după începutul ferestrei` };
  const inVigoare = new Map<number, VersiuneReteta>([[prima.nr, prima]]);
  for (const v of r.versiuni) if (v.data > f.de && v.data <= f.la) { const x = versiuneInVigoareLa(r, v.data)!; inVigoare.set(x.nr, x); }
  const lista = [...inVigoare.values()];
  const determinabil = new Set(lista.map(semnaturaLinii)).size === 1;
  return {
    determinabil, versiune: determinabil ? lista[0] : null, versiuni: lista.map(v => v.nr),
    motiv: determinabil ? null : `rețeta se schimbă în interiorul ferestrei (versiunile ${lista.map(v => v.nr).join(', ')}) și evenimentele nu au dată`,
  };
}
