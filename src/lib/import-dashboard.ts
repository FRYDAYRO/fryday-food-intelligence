/**
 * Adaptorul registrului FRYDAY DASHBOARD (xlsx): NOMENCLATOR, REȚETAR și prețurile de
 * vânzare din foaia SIMULARE PE PRODUS.
 *
 * De ce un adaptor propriu și nu importatorul generic: foaia REȚETAR are „Produs" pe post
 * de cheie și „Denumire MP" pentru materia primă. Aliasurile generice ar lega „Denumire MP"
 * la denumirea REȚETEI — adică fiecare rețetă s-ar numi după ingredientul ei. Formele astea
 * sunt fixe și cunoscute, deci se citesc explicit, pe nume de coloană.
 *
 * Reguli care nu se încalcă:
 *
 *   · Se preiau DOAR prețurile lunii realizate (august). Coloanele lunilor următoare sunt
 *     plan — fișierul o spune el însuși — și un plan nu are ce căuta printre cifrele reale.
 *   · Prețurile din foaie sunt CU TVA. Netul nu se stochează: se calculează din brut și
 *     cota de TVA prin `pretNet`, ca să existe o singură definiție în toată aplicația.
 *   · Nimic nu se potrivește după asemănare. Un produs cu preț dar fără rețetă rămâne așa,
 *     declarat, până când cineva dă maparea explicit.
 */
import type { Ingredient, LinieReteta, Produs, Reteta, UMCod } from './types';

export interface RandProblema { ce: string; detaliu: string; }

export interface RezultatDashboard {
  ingrediente: Ingredient[];
  produse: Produs[];
  retete: Reteta[];
  /** Luna ale cărei prețuri s-au preluat, ca să se vadă în audit ce s-a importat. */
  lunaPreturi: string;
  /** Produse cu rețetă, dar fără preț de vânzare în foaia de simulare. */
  faraPret: string[];
  /** Produse cu preț, dar fără rețetă — costul lor rămâne necunoscut, nu zero. */
  faraReteta: string[];
  probleme: RandProblema[];
}

const norm = (s: unknown): string =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

/** Numerele din registru vin ca text, cu separatori de mii și virgulă zecimală ocazională. */
export function numar(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v ?? '').trim();
  if (!s) return null;
  const negativ = /^\(.*\)$/.test(s);
  s = s.replace(/[()$\s %]/g, '');
  // „1.234,56" (ro) vs „1,234.56" (en): decide ultimul separator
  const ultVirgula = s.lastIndexOf(','), ultPunct = s.lastIndexOf('.');
  if (ultVirgula > ultPunct) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negativ ? -n : n;
}

const UM_VALIDE: Record<string, UMCod> = { KG: 'kg', L: 'l', BUC: 'buc', G: 'g', ML: 'ml', EA: 'buc' };
const umDin = (v: unknown): UMCod | null => UM_VALIDE[norm(v)] ?? null;

/** Indexul coloanelor unei foi, după antetul ei exact (normalizat). */
function coloane(antet: unknown[]): Map<string, number> {
  const m = new Map<string, number>();
  antet.forEach((c, i) => { const k = norm(c); if (k && !m.has(k)) m.set(k, i); });
  return m;
}

// ————————————————————————————————————————————————————————— NOMENCLATOR

export function parseNomenclator(randuri: unknown[][]): { ingrediente: Ingredient[]; probleme: RandProblema[] } {
  const iAntet = randuri.findIndex(r => norm(r?.[0]) === 'COD NBO');
  if (iAntet < 0) return { ingrediente: [], probleme: [{ ce: 'NOMENCLATOR', detaliu: 'Antetul „Cod NBO" nu a fost găsit.' }] };
  const c = coloane(randuri[iAntet]);
  const idx = (k: string) => c.get(k) ?? -1;
  const [cCod, cDen, cTip, cUm, cPret, cVal] =
    ['COD NBO', 'DENUMIRE NBO', 'TIP', 'UM BAZA', 'PRET UM BAZA', 'VALABIL DE LA'].map(idx);

  const probleme: RandProblema[] = [];
  const ingrediente: Ingredient[] = [];
  for (const r of randuri.slice(iAntet + 1)) {
    const cod = String(r?.[cCod] ?? '').trim();
    if (!cod) continue;
    const um = umDin(r[cUm]);
    if (!um || (um !== 'kg' && um !== 'l' && um !== 'buc')) {
      probleme.push({ ce: cod, detaliu: `UM de bază necunoscută: „${String(r[cUm] ?? '')}".` });
      continue;
    }
    const pret = numar(r[cPret]);
    const validDeLa = String(r[cVal] ?? '').trim();
    if (pret === null) probleme.push({ ce: cod, detaliu: 'Fără preț — costul lui rămâne necunoscut, nu zero.' });
    else if (pret === 0) probleme.push({ ce: cod, detaliu: 'Preț 0 — tratat ca necunoscut, nu ca gratuit.' });
    ingrediente.push({
      cod,
      denumire: String(r[cDen] ?? cod).trim(),
      categorie: String(r[cTip] ?? '').trim() || '—',
      tip: /AMBALAJ/.test(norm(r[cTip])) ? 'PACKAGING' : 'FOOD',
      um,
      // un preț absent sau 0 nu se scrie: lipsa lui e informație, zeroul ar fi o minciună
      preturi: pret !== null && pret > 0 && validDeLa ? [{ validDeLa, pret }] : [],
      activ: true,
    });
  }
  return { ingrediente, probleme };
}

// ————————————————————————————————————————————————————————— REȚETAR

const CANALE: Record<string, LinieReteta['canal']> = {
  AMBELE: 'AMBELE', INSTORE: 'INSTORE', DELIVERY: 'DELIVERY',
};

export function parseRetetar(
  randuri: unknown[][], data: string,
): { retete: Reteta[]; probleme: RandProblema[] } {
  const iAntet = randuri.findIndex(r => norm(r?.[0]) === 'PRODUS' && norm(r?.[3]) === 'COD MP');
  if (iAntet < 0) return { retete: [], probleme: [{ ce: 'RETETAR', detaliu: 'Antetul („Produs" + „Cod MP") nu a fost găsit.' }] };
  const c = coloane(randuri[iAntet]);
  const idx = (k: string) => c.get(k) ?? -1;
  const [cProd, cCanal, cMp, cCant, cUm] = ['PRODUS', 'CANAL', 'COD MP', 'CANTITATE', 'UM'].map(idx);

  const probleme: RandProblema[] = [];
  const peProdus = new Map<string, LinieReteta[]>();
  for (const r of randuri.slice(iAntet + 1)) {
    const produs = String(r?.[cProd] ?? '').trim();
    const mp = String(r?.[cMp] ?? '').trim();
    if (!produs || !mp) continue;
    const cant = numar(r[cCant]);
    const um = umDin(r[cUm]);
    if (cant === null) { probleme.push({ ce: produs, detaliu: `Cantitate necitibilă pentru ${mp}.` }); continue; }
    if (!um) { probleme.push({ ce: produs, detaliu: `UM necunoscută pentru ${mp}: „${String(r[cUm] ?? '')}".` }); continue; }
    // canalul lipsă înseamnă „pe ambele" — așa e folosit în registru
    const canal = CANALE[norm(r[cCanal])] ?? 'AMBELE';
    const linii = peProdus.get(produs) ?? [];
    linii.push({ comp: mp, tipComp: 'INGREDIENT', cant, um, canal });
    peProdus.set(produs, linii);
  }

  const retete: Reteta[] = [...peProdus.entries()].map(([cod, linii]) => ({
    cod, tip: 'PRODUS', denumire: cod,
    versiuni: [{ nr: 1, data, nota: 'Import registru FRYDAY DASHBOARD', linii }],
    activa: 1,
  }));
  return { retete, probleme };
}

// ————————————————————————————————————————————————————————— prețuri (doar luna realizată)

/** Coloanele de preț ale unei luni: antetul lunii poartă „Preț I", iar următoarea e „Preț D". */
function coloanePret(antet: unknown[], luna: string): { i: number; d: number } | null {
  const cheie = norm(luna);
  for (let k = 0; k < antet.length; k++) {
    const h = norm(antet[k]);
    if (h.startsWith(cheie) && h.includes('PRET I')) {
      const urm = norm(antet[k + 1]);
      if (urm === 'PRET D') return { i: k, d: k + 1 };
      return null;
    }
  }
  return null;
}

export function parsePreturi(
  randuri: unknown[][], luna: string,
): { produse: Produs[]; probleme: RandProblema[] } {
  const iAntet = randuri.findIndex(r => norm(r?.[1]) === 'PRODUS' && r.some(x => norm(x).includes('TVA')));
  if (iAntet < 0) return { produse: [], probleme: [{ ce: 'SIMULARE', detaliu: 'Antetul foii de simulare nu a fost găsit.' }] };
  const antet = randuri[iAntet];
  const c = coloane(antet);
  const cProd = c.get('PRODUS') ?? 1;
  const cTva = c.get('TVA') ?? -1;
  const col = coloanePret(antet, luna);
  if (!col) {
    return { produse: [], probleme: [{ ce: 'SIMULARE', detaliu: `Luna „${luna}" nu are coloane „Preț I" / „Preț D".` }] };
  }

  const probleme: RandProblema[] = [];
  const produse: Produs[] = [];
  const vazute = new Set<string>();
  for (const r of randuri.slice(iAntet + 1)) {
    const den = String(r?.[cProd] ?? '').trim();
    if (!den) continue;
    if (vazute.has(den)) { probleme.push({ ce: den, detaliu: 'Produs repetat în foaie — se păstrează primul rând.' }); continue; }
    vazute.add(den);
    const tva = cTva >= 0 ? numar(r[cTva]) : null;
    if (tva === null) { probleme.push({ ce: den, detaliu: 'Fără cotă de TVA — netul nu se poate calcula.' }); continue; }
    const pi = numar(r[col.i]); const pd = numar(r[col.d]);
    if (pi === null && pd === null) { probleme.push({ ce: den, detaliu: `Fără preț pe ${luna}.` }); continue; }
    produse.push({
      cod: den, denumire: den, categorie: '—', tip: 'SIMPLU',
      // brut, cu TVA — netul se calculează din ele, nu se stochează separat
      ...(pi !== null ? { pretInstore: pi } : {}),
      ...(pd !== null ? { pretDelivery: pd } : {}),
      tva, activ: true,
    });
  }
  return { produse, probleme };
}

// ————————————————————————————————————————————————————————— registrul întreg

export interface FoiDashboard {
  nomenclator: unknown[][];
  retetar: unknown[][];
  simulare: unknown[][];
}

/**
 * Citește registrul întreg. `luna` e luna REALIZATĂ ale cărei prețuri se preiau; lunile
 * următoare din foaie sunt plan și se ignoră deliberat.
 */
export function importaDashboard(foi: FoiDashboard, luna: string, data: string): RezultatDashboard {
  const n = parseNomenclator(foi.nomenclator);
  const r = parseRetetar(foi.retetar, data);
  const p = parsePreturi(foi.simulare, luna);

  const cuReteta = new Set(r.retete.map(x => norm(x.cod)));
  const cuPret = new Set(p.produse.map(x => norm(x.cod)));
  const faraPret = r.retete.map(x => x.cod).filter(x => !cuPret.has(norm(x))).sort();
  const faraReteta = p.produse.map(x => x.cod).filter(x => !cuReteta.has(norm(x))).sort();

  // materiile prime cerute de rețete, dar absente din nomenclator
  const coduri = new Set(n.ingrediente.map(x => x.cod));
  const probleme = [...n.probleme, ...r.probleme, ...p.probleme];
  const orfane = [...new Set(r.retete.flatMap(x => x.versiuni[0].linii.map(l => l.comp)).filter(c => !coduri.has(c)))];
  for (const o of orfane) probleme.push({ ce: o, detaliu: 'Materie primă din rețetar, absentă din nomenclator.' });

  return {
    ingrediente: n.ingrediente,
    produse: p.produse,
    retete: r.retete,
    lunaPreturi: luna,
    faraPret, faraReteta, probleme,
  };
}
