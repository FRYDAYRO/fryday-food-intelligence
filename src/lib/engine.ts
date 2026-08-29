import type {
  AppState, Canal, Ingredient, LinieReteta, Produs, RegulaClasificare,
  Reteta, Schimbare, UMCod, VanzareFapt, Vedere, VersiuneReteta,
} from './types';

// ---------------------------------------------------------------- UM & utilitare

export const UMS: Record<UMCod, { baza: 'kg' | 'l' | 'buc'; f: number }> = {
  g: { baza: 'kg', f: 0.001 }, kg: { baza: 'kg', f: 1 },
  ml: { baza: 'l', f: 0.001 }, l: { baza: 'l', f: 1 },
  buc: { baza: 'buc', f: 1 },
};

export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 %._-]/g, ' ').replace(/\s+/g, ' ').trim();

export const luna = (data: string) => data.slice(0, 7);

// ---------------------------------------------------------------- Context de calcul

/**
 * Contractul minim de costare: nomenclator, rețete, produse — atât.
 *
 * Tot ce înseamnă Food Cost se calculează DOAR din aceste trei surse. Nimic din afara
 * scopului (comision de agregator, labor, costuri de operare) nu are voie să intre aici,
 * iar funcțiile care primesc `CtxCost` nu pot, prin construcție, să-l citească.
 */
export interface CtxCost {
  ingrediente: Map<string, Ingredient>;
  retete: Map<string, Reteta>;
  produse: Map<string, Produs>;
}

export interface Ctx extends CtxCost {
  /** ÎN AFARA SCOPULUI Food Cost — rămas pentru rapoartele de profit care încă îl folosesc. */
  comisionDeliveryPct: number;    // comisionul agregatorului, aplicat vânzărilor nete Delivery
}

export function buildCtx(s: Pick<AppState, 'ingrediente' | 'retete' | 'produse'> & { setari?: { comisionDeliveryPct?: number } }): Ctx {
  return {
    comisionDeliveryPct: s.setari?.comisionDeliveryPct ?? 0,
    ingrediente: new Map(s.ingrediente.map(i => [i.cod, i])),
    retete: new Map(s.retete.map(r => [r.cod, r])),
    produse: new Map(s.produse.map(p => [p.cod, p])),
  };
}

// §3.1 — prețul valabil la o dată
export function pretLa(ing: Ingredient, data: string): number {
  let p = 0; let gasit = false;
  const sorted = [...ing.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
  for (const pr of sorted) if (pr.validDeLa <= data) { p = pr.pret; gasit = true; }
  if (!gasit && sorted.length) p = sorted[0].pret;
  return p;
}

export const pretCurent = (ing: Ingredient) => pretLa(ing, '9999-12-31');

export function versiuneActiva(r: Reteta): VersiuneReteta {
  return r.versiuni.find(v => v.nr === r.activa) ?? r.versiuni[r.versiuni.length - 1];
}

// Versiunea valabilă la o anumită dată de vânzare.
// Recalculul istoric folosește rețeta care era în vigoare atunci, nu cea activă azi;
// pentru „azi" și pentru simulări (data sentinelă 9999-12-31) rămâne versiunea activă,
// ca reactivarea manuală a unei versiuni vechi să fie respectată.
export function versiuneLa(r: Reteta, data: string): VersiuneReteta {
  const act = versiuneActiva(r);
  if (data >= AZI_ISO()) return act;
  const candidate = r.versiuni.filter(v => v.data <= data);
  if (!candidate.length) return r.versiuni[0] ?? act;
  return candidate.reduce((a, b) => (b.data > a.data || (b.data === a.data && b.nr > a.nr) ? b : a));
}

let _azi: string | null = null;
export const AZI_ISO = () => (_azi ??= new Date().toISOString().slice(0, 10));

const convFactor = (um: UMCod, baza: string): number | null => {
  const u = UMS[um];
  return u && u.baza === baza ? u.f : null;
};

// §3.2 — cantitatea brută (costul se plătește pe brut)
export const cantBruta = (l: LinieReteta) =>
  l.pierdere && l.pierdere > 0 ? l.cant / (1 - l.pierdere / 100) : l.cant;

export interface CostProdus { food: number; paper: number; total: number; incomplet: boolean; }
const ZERO: CostProdus = { food: 0, paper: 0, total: 0, incomplet: true };

// §3.3 — cost semipreparat per UM de bază a randamentului
function costSemipreparat(r: Reteta, ctx: CtxCost, data: string, memo: Map<string, unknown>, stack: Set<string>): number {
  const key = `SP|${r.cod}|${data}`;
  const m = memo.get(key); if (typeof m === 'number') return m;
  if (stack.has(r.cod)) return 0; // protecție la cicluri
  stack.add(r.cod);
  const v = versiuneLa(r, data);
  let tot = 0;
  for (const l of v.linii) tot += costLinie(l, ctx, data, memo, stack).total;
  stack.delete(r.cod);
  const rez = v.randament && v.randament.cant > 0 ? tot / v.randament.cant : tot;
  memo.set(key, rez);
  return rez;
}

// §3.2 + §3.4 — costul unei linii de rețetă
function costLinie(l: LinieReteta, ctx: CtxCost, data: string, memo: Map<string, unknown>, stack: Set<string>): CostProdus {
  const cb = cantBruta(l);
  if (l.tipComp === 'SEMIPREPARAT') {
    const sp = ctx.retete.get(l.comp);
    if (!sp) return ZERO;
    const v = versiuneLa(sp, data);
    const baza = v.randament?.um ?? 'kg';
    const f = convFactor(l.um, baza);
    if (f == null) return ZERO;
    const c = cb * f * costSemipreparat(sp, ctx, data, memo, stack);
    return { food: c, paper: 0, total: c, incomplet: false };
  }
  const ing = ctx.ingrediente.get(l.comp);
  if (!ing) return ZERO;
  const f = convFactor(l.um, ing.um);
  if (f == null) return ZERO;
  const c = cb * f * pretLa(ing, data);
  const ePaper = l.tipComp === 'AMBALAJ' || ing.tip === 'PACKAGING';
  return { food: ePaper ? 0 : c, paper: ePaper ? c : 0, total: c, incomplet: false };
}

// §3.4 — cost produs pe canal (recursiv, combo inclus)
export function costProdus(
  cod: string, canal: Canal, ctx: CtxCost, data: string,
  memo: Map<string, unknown> = new Map(),
): CostProdus | null {
  const key = `P|${cod}|${canal}|${data}`;
  const m = memo.get(key);
  if (m !== undefined && typeof m === 'object') return m as CostProdus;

  const p = ctx.produse.get(cod);
  if (p?.tip === 'COMBO' && p.combo?.length) {
    let food = 0, paper = 0, incomplet = false;
    for (const c of p.combo) {
      const cc = costProdus(c.cod, canal, ctx, data, memo);
      if (!cc) { incomplet = true; continue; }
      food += cc.food * c.cant; paper += cc.paper * c.cant;
      incomplet = incomplet || cc.incomplet;
    }
    const rez = { food, paper, total: food + paper, incomplet };
    memo.set(key, rez); return rez;
  }

  const r = ctx.retete.get(cod);
  if (!r) return null;
  const v = versiuneLa(r, data);
  let food = 0, paper = 0, incomplet = false;
  for (const l of v.linii) {
    if (l.canal !== 'AMBELE' && l.canal !== canal) continue;
    const c = costLinie(l, ctx, data, memo, new Set());
    food += c.food; paper += c.paper;
    incomplet = incomplet || c.incomplet;
  }
  const rez = { food, paper, total: food + paper, incomplet };
  memo.set(key, rez); return rez;
}

// cost pe o singură linie de rețetă, la o dată (pentru afișarea rețetarului complet)
export function costLinieLa(l: LinieReteta, ctx: CtxCost, data = '9999-12-31'): CostProdus {
  return costLinie(l, ctx, data, new Map(), new Set());
}

// §3.5 — preț net
export function pretNet(p: Produs, canal: Canal): number | null {
  const brut = canal === 'INSTORE' ? p.pretInstore : p.pretDelivery;
  if (brut == null || brut <= 0) return null;
  return brut / (1 + p.tva / 100);
}

// §3.5–3.6 — FC%, profit, marjă la nivel de produs
export function kpiProdus(cod: string, canal: Canal, ctx: CtxCost, data = '9999-12-31') {
  const p = ctx.produse.get(cod);
  if (!p) return null;
  const cost = costProdus(cod, canal, ctx, data);
  const net = pretNet(p, canal);
  if (!cost || net == null) return { cost, net, fc: null, profit: null, marja: null };
  return {
    cost, net,
    fc: (cost.total / net) * 100,
    profit: net - cost.total,
    marja: ((net - cost.total) / net) * 100,
  };
}

// ---------------------------------------------------------------- §3.7 agregate PMIX

export interface FiltruPerioada { luna: string; locatie?: string; vedere: Vedere; }

export interface Agregat {
  buc: number; net: number; cost: number;
  costFood: number; costPaper: number; paperPct: number | null;
  fc: number | null; profit: number; marja: number | null;
  acoperire: number | null; netFaraReteta: number; netDelivery: number;
}

export function agregatePerioada(vanzari: VanzareFapt[], ctx: CtxCost, f: FiltruPerioada,
  memo: Map<string, unknown> = new Map()): Agregat {
  let buc = 0, net = 0, cost = 0, costFood = 0, costPaper = 0, netCuReteta = 0, netDelivery = 0;
  for (const v of vanzari) {
    if (luna(v.data) !== f.luna) continue;
    if (f.locatie && v.locatie !== f.locatie) continue;
    if (f.vedere !== 'TOTAL' && v.canal !== f.vedere) continue;
    buc += v.cant; net += v.net;
    const c = costProdus(v.produs, v.canal, ctx, v.data, memo);
    if (c) {
      cost += c.total * v.cant; costFood += c.food * v.cant; costPaper += c.paper * v.cant; netCuReteta += v.net;
      if (v.canal === 'DELIVERY') netDelivery += v.net;   // baza comisionului: partea acoperită de rețetar
    }
  }
  const profit = net - cost;
  return {
    buc, net, cost, costFood, costPaper, netDelivery,
    paperPct: netCuReteta > 0 ? (costPaper / netCuReteta) * 100 : null,
    profit,
    fc: netCuReteta > 0 ? (cost / netCuReteta) * 100 : null,
    marja: netCuReteta > 0 ? ((netCuReteta - cost) / netCuReteta) * 100 : null,
    acoperire: net > 0 ? (netCuReteta / net) * 100 : null,
    netFaraReteta: net - netCuReteta,
  };
}

// ---------------------------------------------------------------- analitica pe produs

export interface RandProdus {
  cod: string; denumire: string; categorie: string;
  buc: number; net: number; cost: number; costFood: number; costPaper: number;
  fc: number | null; profit: number; marja: number | null;
  roi: number | null;             // profit / cost investit (Food & Paper), %
  mix: number; contributie: number;
  mixCost: number;                // % din Food Cost-ul total
  mixFood: number;                // % din costul ingredientelor (food)
  rang: number; faraReteta: boolean;
  netDelivery: number;            // partea de vânzări nete de pe Delivery (baza comisionului)
  comision: number;               // lei plătiți agregatorului
  profitReal: number;             // profit − comision: economia reală, nu cea aparentă
  fcReal: number | null;          // cost / (net − comision): Food Cost pe banii care chiar rămân
}

export function perProdus(vanzari: VanzareFapt[], ctx: Ctx, f: FiltruPerioada): RandProdus[] {
  const memo = new Map<string, unknown>();
  const acc = new Map<string, { buc: number; net: number; netD: number; cost: number; food: number; paper: number; fara: boolean }>();
  for (const v of vanzari) {
    if (luna(v.data) !== f.luna) continue;
    if (f.locatie && v.locatie !== f.locatie) continue;
    if (f.vedere !== 'TOTAL' && v.canal !== f.vedere) continue;
    const a = acc.get(v.produs) ?? { buc: 0, net: 0, netD: 0, cost: 0, food: 0, paper: 0, fara: false };
    a.buc += v.cant; a.net += v.net;
    if (v.canal === 'DELIVERY') a.netD += v.net;
    const c = costProdus(v.produs, v.canal, ctx, v.data, memo);
    if (c) { a.cost += c.total * v.cant; a.food += c.food * v.cant; a.paper += c.paper * v.cant; } else a.fara = true;
    acc.set(v.produs, a);
  }
  const netTotal = [...acc.values()].reduce((s, a) => s + a.net, 0);
  const profitTotal = [...acc.values()].reduce((s, a) => s + (a.net - a.cost), 0);
  const costTotal = [...acc.values()].reduce((s, a) => s + a.cost, 0);
  const foodTotal = [...acc.values()].reduce((s, a) => s + a.food, 0);
  const rows: RandProdus[] = [...acc.entries()].map(([cod, a]) => {
    const p = ctx.produse.get(cod);
    const profit = a.net - a.cost;
    const comision = a.netD * (ctx.comisionDeliveryPct / 100);
    const netReal = a.net - comision;
    return {
      netDelivery: a.netD, comision, profitReal: profit - comision,
      fcReal: !a.fara && netReal > 0 ? (a.cost / netReal) * 100 : null,
      cod, denumire: p?.denumire ?? cod, categorie: p?.categorie ?? '—',
      buc: a.buc, net: a.net, cost: a.cost, costFood: a.food, costPaper: a.paper, profit,
      fc: !a.fara && a.net > 0 ? (a.cost / a.net) * 100 : null,
      marja: !a.fara && a.net > 0 ? (profit / a.net) * 100 : null,
      roi: !a.fara && a.cost > 0 ? (profit / a.cost) * 100 : null,
      mix: netTotal > 0 ? (a.net / netTotal) * 100 : 0,
      contributie: profitTotal > 0 ? (profit / profitTotal) * 100 : 0,
      mixCost: costTotal > 0 ? (a.cost / costTotal) * 100 : 0,
      mixFood: foodTotal > 0 ? (a.food / foodTotal) * 100 : 0,
      rang: 0, faraReteta: a.fara,
    };
  });
  rows.sort((a, b) => b.net - a.net);
  rows.forEach((r, i) => { r.rang = i + 1; });
  return rows;
}

export function evolutieProdus(cod: string, vanzari: VanzareFapt[], ctx: Ctx, vedere: Vedere, locatie?: string) {
  const memo = new Map<string, unknown>();
  const acc = new Map<string, { buc: number; net: number; cost: number }>();
  for (const v of vanzari) {
    if (v.produs !== cod) continue;
    if (locatie && v.locatie !== locatie) continue;
    if (vedere !== 'TOTAL' && v.canal !== vedere) continue;
    const l = luna(v.data);
    const a = acc.get(l) ?? { buc: 0, net: 0, cost: 0 };
    a.buc += v.cant; a.net += v.net;
    const c = costProdus(cod, v.canal, ctx, v.data, memo);
    if (c) a.cost += c.total * v.cant;
    acc.set(l, a);
  }
  return [...acc.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([l, a]) => ({
      luna: l, buc: a.buc, net: a.net,
      fc: a.net > 0 ? (a.cost / a.net) * 100 : null,
      profit: a.net - a.cost,
    }));
}

export type Granularitate = 'ZI' | 'SAPTAMANA' | 'LUNA' | 'AN';

export function cheiePerioada(data: string, g: Granularitate): string {
  if (g === 'ZI') return data;
  if (g === 'LUNA') return data.slice(0, 7);
  if (g === 'AN') return data.slice(0, 4);
  const d = new Date(data + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); // joia săptămânii ISO
  const an = d.getUTCFullYear();
  const start = Date.UTC(an, 0, 1);
  const w = Math.ceil(((d.getTime() - start) / 86400000 + 1) / 7);
  return `${an}-S${String(w).padStart(2, '0')}`;
}

export function evolutieGranulara(cod: string, vanzari: VanzareFapt[], ctx: Ctx,
  vedere: Vedere, gran: Granularitate, locatie?: string) {
  const memo = new Map<string, unknown>();
  const acc = new Map<string, { buc: number; net: number; cost: number }>();
  for (const v of vanzari) {
    if (v.produs !== cod) continue;
    if (locatie && v.locatie !== locatie) continue;
    if (vedere !== 'TOTAL' && v.canal !== vedere) continue;
    const k = cheiePerioada(v.data, gran);
    const a = acc.get(k) ?? { buc: 0, net: 0, cost: 0 };
    a.buc += v.cant; a.net += v.net;
    const c = costProdus(cod, v.canal, ctx, v.data, memo);
    if (c) a.cost += c.total * v.cant;
    acc.set(k, a);
  }
  return [...acc.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([perioada, a]) => ({
    perioada, buc: a.buc, net: a.net,
    fc: a.net > 0 ? (a.cost / a.net) * 100 : null,
    profit: a.net - a.cost,
    roi: a.cost > 0 ? ((a.net - a.cost) / a.cost) * 100 : null,
  }));
}

// ---------------------------------------------------------------- §3.8–3.10 Food Cost Engine

export function clasifica(categorie: string, reguli: RegulaClasificare[]): { clasa: 'FOOD' | 'PAPER' | 'EXCLUS'; auto: boolean } {
  const c = norm(categorie);
  for (const r of reguli) if (c.includes(norm(r.pattern))) return { clasa: r.clasa, auto: false };
  return { clasa: 'FOOD', auto: true }; // neclasificat → tratat FOOD, semnalat în UI
}

export interface RezultatFC {
  luna: string; locatie: string | 'RETEA';
  net: number; numitor: 'Sales Report' | 'PMIX';
  paperTeoretic: number; paper29: number; fcPaper: number | null;
  costTeoretic: number;
  fcTeoretic: number | null;          // cost / TOATE vânzările nete
  fcTeoreticAcoperit: number | null;  // cost / vânzările PMIX ale produselor care au rețetă — cifra comparabilă
  netAcoperit: number; netFaraReteta: number;   // ambele pe baza PMIX
  netDelivery: number; comisionLei: number;     // comisionul agregatorului pe partea Delivery
  profitReal: number | null;                    // net acoperit − cost − comision (economia reală)
  fcDeliveryAparent: number | null;             // pe Delivery: cost / net, fără comision
  fcRealDelivery: number | null;                // pe Delivery: cost / (net − comision)
  consumOp: number; fcOp: number | null;
  consumCurat: number; fcCurat: number | null;
  excluderi: number; variancePP: number | null; varianceLei: number | null;
  profitEstimat: number | null;
  tinta: number | null; abatere: number | null;
  acoperire: number | null; are29: boolean;
}

export interface RandVariance {
  ingredient: string; denumire: string; um: string;
  consumTeoretic: number;      // din rețete × mixul vândut
  wasteRaportat: number;       // din fișierul de waste
  consumReal: number | null;   // din inventar
  neexplicat: number | null;   // real − (teoretic + waste): porționare, erori, furt
  pret: number;
  leiTeoretic: number; leiWaste: number; leiNeexplicat: number | null;
}

export interface VarianceDetaliat {
  linii: RandVariance[];
  leiTeoretic: number;
  leiWaste: number;
  leiNeexplicat: number | null;
  leiReal: number | null;
  areWaste: boolean; areInventar: boolean;
  acoperireInventar: number;    // % din costul teoretic pentru care avem consum real
}

/**
 * Descompune diferența dintre Food Cost teoretic și consumul real în trei părți:
 * rețetă, waste raportat și rest neexplicat. Fără inventar, ultima parte nu se poate calcula —
 * se raportează null, nu zero, ca să nu creeze impresia că totul e explicat.
 */
export function varianceDetaliat(state: AppState, ctx: Ctx, luna: string, locatie: string | 'RETEA'): VarianceDetaliat {
  const loc = locatie === 'RETEA' ? undefined : locatie;
  const teoretic = consumuriLuna(state, ctx, luna, loc);

  const waste = new Map<string, number>();
  for (const w of state.waste) {
    if (w.perioada !== luna || (loc && w.locatie !== loc)) continue;
    const f = UMS[w.um]?.f ?? 1;
    waste.set(w.ingredient, (waste.get(w.ingredient) ?? 0) + w.cant * f);
  }
  const real = new Map<string, number>();
  for (const iv of state.inventar) {
    if (iv.perioada !== luna || (loc && iv.locatie !== loc)) continue;
    const f = UMS[iv.um]?.f ?? 1;
    real.set(iv.ingredient, (real.get(iv.ingredient) ?? 0) + iv.consumReal * f);
  }

  const coduri = new Set([...teoretic.keys(), ...waste.keys(), ...real.keys()]);
  const linii: RandVariance[] = [];
  let leiTeoretic = 0, leiWaste = 0, leiNeexplicat = 0, leiReal = 0, teoreticCuInventar = 0;

  for (const cod of coduri) {
    const ing = ctx.ingrediente.get(cod);
    if (!ing) continue;
    const pret = pretLa(ing, `${luna}-28`);
    const ct = teoretic.get(cod)?.cant ?? 0;
    const w = waste.get(cod) ?? 0;
    const r = real.has(cod) ? real.get(cod)! : null;
    const nex = r != null ? r - ct - w : null;
    const lt = ct * pret, lw = w * pret;
    const ln = nex != null ? nex * pret : null;
    leiTeoretic += lt; leiWaste += lw;
    if (ln != null) { leiNeexplicat += ln; leiReal += r! * pret; teoreticCuInventar += lt; }
    linii.push({
      ingredient: cod, denumire: ing.denumire, um: ing.um,
      consumTeoretic: ct, wasteRaportat: w, consumReal: r, neexplicat: nex,
      pret, leiTeoretic: lt, leiWaste: lw, leiNeexplicat: ln,
    });
  }
  linii.sort((a, b) => Math.abs(b.leiNeexplicat ?? b.leiWaste) - Math.abs(a.leiNeexplicat ?? a.leiWaste));
  const areInventar = real.size > 0;
  return {
    linii, leiTeoretic, leiWaste,
    leiNeexplicat: areInventar ? leiNeexplicat : null,
    leiReal: areInventar ? leiReal : null,
    areWaste: waste.size > 0, areInventar,
    acoperireInventar: leiTeoretic > 0 ? (teoreticCuInventar / leiTeoretic) * 100 : 0,
  };
}

/** Luna calendaristică precedentă, în format AAAA-LL. */
export function lunaAnterioara(luna: string): string {
  const [a, l] = luna.split('-').map(Number);
  return l === 1 ? `${a - 1}-12` : `${a}-${String(l - 1).padStart(2, '0')}`;
}

export function fcPerioada(state: AppState, ctx: Ctx, lunaSel: string, locatie: string | 'RETEA'): RezultatFC {
  const loc = locatie === 'RETEA' ? undefined : locatie;
  const memo = new Map<string, unknown>();
  const ag = agregatePerioada(state.vanzari, ctx, { luna: lunaSel, locatie: loc, vedere: 'TOTAL' }, memo);

  const srNet = state.salesReport
    .filter(r => luna(r.data) === lunaSel && (!loc || r.locatie === loc))
    .reduce((s, r) => s + r.net, 0);
  const net = srNet > 0 ? srNet : ag.net;
  const numitor = srNet > 0 ? 'Sales Report' as const : 'PMIX' as const;

  const linii = state.linii29.filter(l => l.perioada === lunaSel && (!loc || l.locatie === loc));
  const are29 = linii.length > 0;
  let consumOp = 0, consumCurat = 0, paper29 = 0;
  for (const l of linii) {
    consumOp += l.valoare;
    const cls = clasifica(l.categorie, state.reguli).clasa;
    if (cls !== 'EXCLUS') consumCurat += l.valoare;
    if (cls === 'PAPER') paper29 += l.valoare;
  }
  const fcTeoretic = net > 0 ? (ag.cost / net) * 100 : null;
  // Când acoperirea rețetarului nu e completă, raportul cost/vânzări totale subestimează Food Cost-ul:
  // numitorul include produse fără cost calculabil. Cifra comparabilă se raportează la partea acoperită.
  // Se calculează strict pe PMIX (unde se măsoară și costul, și acoperirea), nu pe numitorul oficial:
  // altfel o divergență PMIX ↔ Sales Report ar deforma rezultatul. Divergența se raportează separat,
  // în ecranul de reconciliere.
  const netAcoperit = ag.net - ag.netFaraReteta;
  const fcTeoreticAcoperit = netAcoperit > 0 ? (ag.cost / netAcoperit) * 100 : null;
  const comisionLei = ag.netDelivery * ((state.setari.comisionDeliveryPct ?? 0) / 100);
  const agD = agregatePerioada(state.vanzari, ctx, { luna: lunaSel, locatie: loc, vedere: 'DELIVERY' }, memo);
  const comD = agD.netDelivery * ((state.setari.comisionDeliveryPct ?? 0) / 100);
  const netRealD = agD.netDelivery - comD;
  const fcOp = are29 && net > 0 ? (consumOp / net) * 100 : null;
  const fcCurat = are29 && net > 0 ? (consumCurat / net) * 100 : null;
  const tinta = state.tinte.find(t => t.locatie === locatie)?.fcCurat
    ?? state.tinte.find(t => t.locatie === 'RETEA')?.fcCurat ?? null;
  return {
    luna: lunaSel, locatie, net, numitor,
    paperTeoretic: ag.costPaper, paper29,
    fcPaper: net > 0 ? ((are29 ? paper29 : ag.costPaper) / net) * 100 : null,
    costTeoretic: ag.cost, fcTeoretic, fcTeoreticAcoperit,
    netAcoperit, netFaraReteta: ag.netFaraReteta,
    netDelivery: ag.netDelivery, comisionLei,
    profitReal: netAcoperit > 0 ? netAcoperit - ag.cost - comisionLei : null,
    fcDeliveryAparent: agD.fc,
    fcRealDelivery: netRealD > 0 ? (agD.cost / netRealD) * 100 : null,
    consumOp, fcOp, consumCurat, fcCurat,
    excluderi: consumOp - consumCurat,
    variancePP: fcCurat != null && fcTeoretic != null ? fcCurat - fcTeoretic : null,
    varianceLei: are29 ? consumCurat - ag.cost : null,
    profitEstimat: fcCurat != null ? net * (1 - fcCurat / 100) : null,
    tinta,
    // abaterea față de țintă: pe FC Curat când există 2.9, altfel pe FC-ul teoretic acoperit —
    // altfel clasamentul restaurantelor rămâne gol până la primul import 2.9
    abatere: tinta != null && (fcCurat ?? fcTeoreticAcoperit) != null ? (fcCurat ?? fcTeoreticAcoperit)! - tinta : null,
    acoperire: ag.acoperire, are29,
  };
}

// ---------------------------------------------------------------- §Simulator

export interface SimProdusNou { produs: Produs; bucInstore: number; bucDelivery: number; }

/** Data sentinelă de la care o versiune simulată se consideră în vigoare (§Simulator). */
const DATA_ORIGINE = '2000-01-01';

export interface OpteScenariu {
  /**
   * Scenariul se evaluează pe vânzări din trecut (o lună închisă), nu pe „azi".
   *
   * Schimbările de rețetă se aplică pe versiunea ACTIVĂ — indecșii de linie din interfață
   * se referă la ea. Dar costarea unei luni închise se face la o dată din trecut, unde
   * `versiuneLa` rezolvă versiunea în vigoare ATUNCI. Dacă rețetarul a fost reîncărcat
   * între timp (fiecare import FC_BAZA / RETETAR_NBO adaugă o versiune datată azi),
   * cele două nu mai coincid și modificarea rămâne invizibilă: simularea raportează zero.
   *
   * Cu opțiunea activă, rețetele atinse de schimbări structurale sunt reduse la versiunea
   * activă, datată la origine, deci în vigoare pentru orice zi din perioada analizată —
   * aceeași convenție folosită de `alerte` pentru impactul unei versiuni noi pe mixul lunii.
   * `ctxBaza` primește exact același tratament, fără schimbări, ca diferența dintre cele
   * două contexte să reflecte DOAR editarea, nu și saltul de versiune dintre timp.
   */
  peIstoric?: boolean;
}

export interface RezultatScenariu {
  /** Contextul cu schimbările aplicate. */
  ctx: Ctx;
  /** Baza de comparație, aliniată pe aceleași versiuni de rețetă, dar fără schimbări. */
  ctxBaza: Ctx;
  produseNoi: SimProdusNou[];
  preturiVanzare: Map<string, { canal: Canal; pret: number }[]>;
}

export function aplicaScenariu(state: AppState, schimbari: Schimbare[], opte?: OpteScenariu): RezultatScenariu {
  const ingrediente = state.ingrediente.map(i => ({ ...i, preturi: [...i.preturi] }));
  const retete = state.retete.map(r => ({
    ...r,
    versiuni: r.versiuni.map(v => ({ ...v, linii: v.linii.map(l => ({ ...l })) })),
  }));
  const produse: Produs[] = state.produse.map(p => ({ ...p, combo: p.combo?.map(c => ({ ...c })) }));
  const produseNoi: SimProdusNou[] = [];
  const preturiVanzare = new Map<string, { canal: Canal; pret: number }[]>();

  const gasesteReteta = (cod: string) => retete.find(r => r.cod === cod);

  // operațiile pe rețete se aplică grupat: întâi modificările pe index (față de rețeta reală),
  // apoi eliminările (desc), apoi adăugările — astfel indecșii aleși în UI rămân stabili
  const opsReteta = new Map<string, Schimbare[]>();
  for (const s of schimbari) {
    if (s.tip === 'GRAMAJ' || s.tip === 'INGREDIENT' || s.tip === 'ELIMINA_LINIE' || s.tip === 'ADAUGA_LINIE') {
      const arr = opsReteta.get(s.reteta) ?? [];
      arr.push(s); opsReteta.set(s.reteta, arr);
    }
  }
  const retusate = new Set<string>();      // rețetele atinse de schimbări structurale
  for (const [cod, ops] of opsReteta) {
    const r = gasesteReteta(cod); if (!r) continue;
    retusate.add(cod);
    const v = r.versiuni.find(x => x.nr === r.activa) ?? r.versiuni[r.versiuni.length - 1];
    const sterse = new Set<number>();
    for (const op of ops) {
      if (op.tip === 'GRAMAJ') { const l = v.linii[op.linie]; if (l) l.cant = op.cantNoua; }
      else if (op.tip === 'INGREDIENT') { const l = v.linii[op.linie]; if (l) { l.comp = op.compNoua; l.tipComp = op.tipCompNoua; } }
      else if (op.tip === 'ELIMINA_LINIE') sterse.add(op.linie);
    }
    v.linii = v.linii.filter((_, i) => !sterse.has(i));
    for (const op of ops) if (op.tip === 'ADAUGA_LINIE') v.linii.push({ ...op.linieNoua });
  }

  for (const s of schimbari) {
    if (s.tip === 'PRET_INGREDIENT' || s.tip === 'FURNIZOR') {
      const ing = ingrediente.find(i => i.cod === s.ingredient);
      if (ing) ing.preturi = [{ validDeLa: DATA_ORIGINE, pret: s.pretNou }];
    } else if (s.tip === 'PRET_VANZARE') {
      const p = produse.find(x => x.cod === s.produs); if (!p) continue;
      if (s.canal === 'INSTORE') p.pretInstore = s.pretNou; else p.pretDelivery = s.pretNou;
      const arr = preturiVanzare.get(s.produs) ?? [];
      arr.push({ canal: s.canal, pret: s.pretNou });
      preturiVanzare.set(s.produs, arr);
    } else if (s.tip === 'ELIMINA_PRODUS') {
      const p = produse.find(x => x.cod === s.produs);
      if (p) p.activ = false;      // costurile rămân calculabile; volumele se anulează în simulare
    } else if (s.tip === 'COMBO_NOU') {
      const p: Produs = {
        cod: s.cod, denumire: s.denumire, categorie: s.categorie ?? 'Meniuri', tip: 'COMBO',
        pretInstore: s.pretInstore, pretDelivery: s.pretDelivery, tva: s.tva, activ: true,
        combo: s.componente.map(c => ({ ...c })),
      };
      produse.push(p);
      produseNoi.push({ produs: p, bucInstore: s.bucInstore, bucDelivery: s.bucDelivery });
    } else if (s.tip === 'PRODUS_NOU') {
      const p: Produs = {
        cod: s.cod, denumire: s.denumire, categorie: 'Produse noi', tip: 'SIMPLU',
        pretInstore: s.pretInstore, pretDelivery: s.pretDelivery, tva: s.tva, activ: true,
      };
      produse.push(p);
      retete.push({
        cod: s.cod, tip: 'PRODUS', denumire: s.denumire, activa: 1,
        versiuni: [{ nr: 1, data: new Date().toISOString().slice(0, 10), linii: s.linii }],
      });
      produseNoi.push({ produs: p, bucInstore: s.bucInstore, bucDelivery: s.bucDelivery });
    }
  }
  // §BUG-1 — o rețetă retușată trebuie să fie în vigoare pentru toată perioada simulată,
  // altfel costarea unei luni închise ar rezolva o versiune veche și modificarea ar fi
  // invizibilă. Se reduce la versiunea activă, datată la origine. Rețetele neatinse își
  // păstrează istoricul, ca celelalte produse să fie costate în continuare corect.
  const inVigoareOricand = (r: Reteta): Reteta => {
    const v = versiuneActiva(r);
    return { ...r, activa: v.nr, versiuni: [{ ...v, data: DATA_ORIGINE }] };
  };
  const aliniaza = (lista: Reteta[]) => (opte?.peIstoric
    ? lista.map(r => (retusate.has(r.cod) ? inVigoareOricand(r) : r))
    : lista);

  const comision = state.setari.comisionDeliveryPct ?? 0;
  return {
    ctx: {
      comisionDeliveryPct: comision,
      ingrediente: new Map(ingrediente.map(i => [i.cod, i])),
      retete: new Map(aliniaza(retete).map(r => [r.cod, r])),
      produse: new Map(produse.map(p => [p.cod, p])),
    },
    // baza: starea reală, aliniată pe aceleași versiuni ca scenariul, dar fără schimbări
    ctxBaza: {
      comisionDeliveryPct: comision,
      ingrediente: new Map(state.ingrediente.map(i => [i.cod, i])),
      retete: new Map(aliniaza(state.retete).map(r => [r.cod, r])),
      produse: new Map(state.produse.map(p => [p.cod, p])),
    },
    produseNoi, preturiVanzare,
  };
}

export interface RandInflatie {
  cod: string; denumire: string; um: string;
  pretVechi: number; pretNou: number; variatiePct: number;
  dataVechi: string; dataNou: string;
  consumLunar: number;             // în UM de bază, pe luna analizată
  impactLunar: number;             // (nou − vechi) × consum: lei/lună
  impactAnual: number;
}

/**
 * Inflația ingredientelor: primul vs ultimul preț din istoric, cu impactul în lei
 * pe consumul lunii date. Reîncărcarea periodică a rețetarelor construiește istoricul;
 * acest raport îl transformă într-un radar de scumpiri, ordonat după bani, nu după procente.
 */
export function inflatiaIngredientelor(state: AppState, ctx: Ctx, lunaSel: string): RandInflatie[] {
  const cons = consumuriLuna(state, ctx, lunaSel);
  const rez: RandInflatie[] = [];
  for (const ing of state.ingrediente) {
    if (ing.preturi.length < 2) continue;
    const v = ing.preturi[0], n = ing.preturi[ing.preturi.length - 1];
    if (Math.abs(n.pret - v.pret) < 0.0005) continue;
    const consum = cons.get(ing.cod)?.cant ?? 0;
    const impact = (n.pret - v.pret) * consum;
    rez.push({
      cod: ing.cod, denumire: ing.denumire, um: ing.um,
      pretVechi: v.pret, pretNou: n.pret,
      variatiePct: v.pret > 0 ? ((n.pret - v.pret) / v.pret) * 100 : 0,
      dataVechi: v.validDeLa, dataNou: n.validDeLa,
      consumLunar: consum, impactLunar: impact, impactAnual: impact * 12,
    });
  }
  return rez.sort((a, b) => Math.abs(b.impactLunar) - Math.abs(a.impactLunar) || Math.abs(b.variatiePct) - Math.abs(a.variatiePct));
}

export interface ImpactRetea {
  inainte: { net: number; cost: number; fc: number | null; profit: number };
  dupa: { net: number; cost: number; fc: number | null; profit: number };
}

// Impactul la nivel de rețea, pe mixul lunii de referință (§3.7 recalculat cu ctx-ul scenariului)
export function impactRetea(state: AppState, ctx0: Ctx, ctx1: Ctx,
  produseNoi: SimProdusNou[], preturiVanzare: Map<string, { canal: Canal; pret: number }[]>,
  lunaRef: string): ImpactRetea {
  const memo0 = new Map<string, unknown>();
  const memo1 = new Map<string, unknown>();
  let net0 = 0, cost0 = 0, net1 = 0, cost1 = 0;
  for (const v of state.vanzari) {
    if (luna(v.data) !== lunaRef) continue;
    net0 += v.net;
    const c0 = costProdus(v.produs, v.canal, ctx0, v.data, memo0);
    if (c0) cost0 += c0.total * v.cant;
    // după: același mix de bucăți; prețul de vânzare poate diferi
    const p1 = ctx1.produse.get(v.produs);
    const schimbat = preturiVanzare.get(v.produs)?.find(x => x.canal === v.canal);
    const netRow = schimbat && p1 ? (pretNet(p1, v.canal) ?? 0) * v.cant : v.net;
    net1 += netRow;
    const c1 = costProdus(v.produs, v.canal, ctx1, v.data, memo1);
    if (c1) cost1 += c1.total * v.cant;
  }
  const azi = `${lunaRef}-15`;
  for (const pn of produseNoi) {
    for (const [canal, buc] of [['INSTORE', pn.bucInstore], ['DELIVERY', pn.bucDelivery]] as [Canal, number][]) {
      if (!buc) continue;
      const netU = pretNet(pn.produs, canal) ?? 0;
      const c = costProdus(pn.produs.cod, canal, ctx1, azi, memo1);
      net1 += netU * buc;
      if (c) cost1 += c.total * buc;
    }
  }
  return {
    inainte: { net: net0, cost: cost0, fc: net0 > 0 ? (cost0 / net0) * 100 : null, profit: net0 - cost0 },
    dupa: { net: net1, cost: cost1, fc: net1 > 0 ? (cost1 / net1) * 100 : null, profit: net1 - cost1 },
  };
}

// volumele lunare pe produs (toate locațiile) — pentru impactul financiar pe baza vânzărilor
export function volumeLuna(state: AppState, lunaRef: string) {
  const m = new Map<string, { bucIn: number; bucDlv: number; netIn: number; netDlv: number }>();
  for (const v of state.vanzari) {
    if (luna(v.data) !== lunaRef) continue;
    const x = m.get(v.produs) ?? { bucIn: 0, bucDlv: 0, netIn: 0, netDlv: 0 };
    if (v.canal === 'INSTORE') { x.bucIn += v.cant; x.netIn += v.net; } else { x.bucDlv += v.cant; x.netDlv += v.net; }
    m.set(v.produs, x);
  }
  return m;
}

// Confirmarea unei simulări: aplică schimbările în DATELE REALE, cu versionare și istoric
export function aplicaInDate(state: AppState, sc: { nume: string; schimbari: Schimbare[] }): AppState {
  const azi = new Date().toISOString().slice(0, 10);
  const { ctx } = aplicaScenariu(state, sc.schimbari);
  const retusate = new Set(sc.schimbari.flatMap(x => 'reteta' in x ? [x.reteta] : []));
  let s: AppState = {
    ...state,
    retete: state.retete.map(r => {
      if (!retusate.has(r.cod)) return r;
      const rNou = ctx.retete.get(r.cod); if (!rNou) return r;
      const liniiNoi = versiuneActiva(rNou).linii.map(l => ({ ...l }));
      const nr = (r.versiuni[r.versiuni.length - 1]?.nr ?? 0) + 1;
      return {
        ...r, activa: nr,
        versiuni: [...r.versiuni, { nr, data: azi, nota: `Aplicat din simularea „${sc.nume}"`, linii: liniiNoi, randament: versiuneActiva(r).randament }],
      };
    }),
  };
  for (const ch of sc.schimbari) {
    if (ch.tip === 'PRET_INGREDIENT' || ch.tip === 'FURNIZOR') {
      s = {
        ...s,
        ingrediente: s.ingrediente.map(i => i.cod !== ch.ingredient ? i : {
          ...i,
          furnizor: ch.tip === 'FURNIZOR' ? ch.furnizorNou : i.furnizor,
          preturi: [...i.preturi.filter(p => p.validDeLa !== azi), { validDeLa: azi, pret: ch.pretNou }]
            .sort((a, b) => a.validDeLa.localeCompare(b.validDeLa)),
        }),
      };
    } else if (ch.tip === 'PRET_VANZARE') {
      s = {
        ...s,
        produse: s.produse.map(p => p.cod !== ch.produs ? p : {
          ...p,
          pretInstore: ch.canal === 'INSTORE' ? ch.pretNou : p.pretInstore,
          pretDelivery: ch.canal === 'DELIVERY' ? ch.pretNou : p.pretDelivery,
          // jurnalul prețurilor de vânzare, pentru Product Timeline
          istoricPret: [...(p.istoricPret ?? []), { data: azi, canal: ch.canal, pret: ch.pretNou, nota: sc.nume }],
        }),
      };
    } else if (ch.tip === 'ELIMINA_PRODUS') {
      s = { ...s, produse: s.produse.map(p => p.cod !== ch.produs ? p : { ...p, activ: false }) };
    } else if (ch.tip === 'COMBO_NOU') {
      if (!s.produse.some(p => p.cod === ch.cod)) {
        s = {
          ...s,
          produse: [...s.produse, {
            cod: ch.cod, denumire: ch.denumire, categorie: ch.categorie ?? 'Meniuri', tip: 'COMBO',
            pretInstore: ch.pretInstore, pretDelivery: ch.pretDelivery, tva: ch.tva, activ: true,
            combo: ch.componente.map(c => ({ ...c })),
          }],
        };
      }
    } else if (ch.tip === 'PRODUS_NOU') {
      if (!s.produse.some(p => p.cod === ch.cod)) {
        s = {
          ...s,
          produse: [...s.produse, {
            cod: ch.cod, denumire: ch.denumire, categorie: 'Produse noi', tip: 'SIMPLU',
            pretInstore: ch.pretInstore, pretDelivery: ch.pretDelivery, tva: ch.tva, activ: true,
          }],
          retete: [...s.retete, {
            cod: ch.cod, tip: 'PRODUS', denumire: ch.denumire, activa: 1,
            versiuni: [{ nr: 1, data: azi, nota: `Creat din simularea „${sc.nume}"`, linii: ch.linii.map(l => ({ ...l })) }],
          }],
        };
      }
    }
  }
  return s;
}



// ---------------------------------------------------------------- Ingredient Intelligence

// consumul (brut, în UM de bază a ingredientului) al unui ingredient per unitate de rețetă/produs
function consumInReteta(codIng: string, r: Reteta, canal: Canal, ctx: CtxCost, memoSP: Map<string, number>): number {
  const v = versiuneActiva(r);
  let tot = 0;
  for (const l of v.linii) {
    if (l.canal !== 'AMBELE' && l.canal !== canal) continue;
    const f = UMS[l.um]?.f ?? 0;
    if (l.tipComp === 'SEMIPREPARAT') {
      const sp = ctx.retete.get(l.comp);
      if (!sp) continue;
      tot += cantBruta(l) * f * consumPerUnitSP(codIng, sp, ctx, memoSP);
    } else if (l.comp === codIng) {
      tot += cantBruta(l) * f;
    }
  }
  return tot;
}

function consumPerUnitSP(codIng: string, sp: Reteta, ctx: CtxCost, memoSP: Map<string, number>): number {
  const key = `${codIng}|${sp.cod}`;
  const m = memoSP.get(key);
  if (m !== undefined) return m;
  memoSP.set(key, 0); // protecție la cicluri
  const v = versiuneActiva(sp);
  const brut = consumInReteta(codIng, sp, 'INSTORE', ctx, memoSP); // SP nu diferă pe canal
  const rez = v.randament && v.randament.cant > 0 ? brut / v.randament.cant : brut;
  memoSP.set(key, rez);
  return rez;
}

export function consumPerPortie(codIng: string, codProdus: string, canal: Canal, ctx: CtxCost,
  memoSP: Map<string, number> = new Map()): number {
  const p = ctx.produse.get(codProdus);
  if (p?.tip === 'COMBO' && p.combo?.length) {
    let tot = 0;
    for (const c of p.combo) tot += consumPerPortie(codIng, c.cod, canal, ctx, memoSP) * c.cant;
    return tot;
  }
  const r = ctx.retete.get(codProdus);
  if (!r) return 0;
  return consumInReteta(codIng, r, canal, ctx, memoSP);
}

export interface UtilizareIngredient {
  produs: string; denumire: string;
  cantIn: number; cantDlv: number;           // per porție, UM de bază
  costIn: number;                             // lei/porție InStore
  sharePct: number | null;                    // % din costul porției InStore
}

export function utilizariIngredient(codIng: string, ctx: CtxCost): UtilizareIngredient[] {
  const ing = ctx.ingrediente.get(codIng);
  if (!ing) return [];
  const pret = pretCurent(ing);
  const memoSP = new Map<string, number>();
  const rez: UtilizareIngredient[] = [];
  for (const [cod, p] of ctx.produse) {
    const cantIn = consumPerPortie(codIng, cod, 'INSTORE', ctx, memoSP);
    const cantDlv = consumPerPortie(codIng, cod, 'DELIVERY', ctx, memoSP);
    if (cantIn <= 0 && cantDlv <= 0) continue;
    const costIn = cantIn * pret;
    const total = costProdus(cod, 'INSTORE', ctx, '9999-12-31')?.total ?? 0;
    rez.push({
      produs: cod, denumire: p.denumire, cantIn, cantDlv, costIn,
      sharePct: total > 0 ? (costIn / total) * 100 : null,
    });
  }
  return rez.sort((a, b) => b.costIn - a.costIn);
}

export interface ConsumLunarIngredient {
  cantitate: number; um: string; valoare: number;
  perProdus: Map<string, { cant: number; buc: number }>;
}

export function consumLunarIngredient(codIng: string, state: AppState, ctx: CtxCost, lunaRef: string): ConsumLunarIngredient {
  const ing = ctx.ingrediente.get(codIng);
  const memoSP = new Map<string, number>();
  const cache = new Map<string, number>();
  const perProdus = new Map<string, { cant: number; buc: number }>();
  let cantitate = 0;
  for (const v of state.vanzari) {
    if (luna(v.data) !== lunaRef) continue;
    const key = `${v.produs}|${v.canal}`;
    let u = cache.get(key);
    if (u === undefined) { u = consumPerPortie(codIng, v.produs, v.canal, ctx, memoSP); cache.set(key, u); }
    if (u <= 0) continue;
    cantitate += u * v.cant;
    const e = perProdus.get(v.produs) ?? { cant: 0, buc: 0 };
    e.cant += u * v.cant; e.buc += v.cant;
    perProdus.set(v.produs, e);
  }
  return { cantitate, um: ing?.um ?? 'kg', valoare: cantitate * (ing ? pretCurent(ing) : 0), perProdus };
}

// cheltuiala lunară pe fiecare ingredient (consum brut × preț curent), pentru Achiziții
export function consumuriLuna(state: AppState, ctx: CtxCost, lunaRef: string, locatie?: string): Map<string, { cant: number; valoare: number; um: string }> {
  const vol = new Map<string, number>();
  for (const v of state.vanzari) {
    if (luna(v.data) !== lunaRef) continue;
    if (locatie && v.locatie !== locatie) continue;
    const k = `${v.produs}|${v.canal}`;
    vol.set(k, (vol.get(k) ?? 0) + v.cant);
  }
  const memoSP = new Map<string, number>();
  const rez = new Map<string, { cant: number; valoare: number; um: string }>();
  for (const ing of ctx.ingrediente.values()) {
    let cant = 0;
    for (const [k, buc] of vol) {
      const bara = k.lastIndexOf('|');
      const u = consumPerPortie(ing.cod, k.slice(0, bara), k.slice(bara + 1) as Canal, ctx, memoSP);
      if (u > 0) cant += u * buc;
    }
    if (cant > 0) rez.set(ing.cod, { cant, valoare: cant * pretCurent(ing), um: ing.um });
  }
  return rez;
}

// ---------------------------------------------------------------- Menu Engineering (§popularitate × profitabilitate)

export type ClasaME = 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';
export interface RandME extends RandProdus {
  mixBuc: number;          // % din bucățile vândute
  profitUnitar: number;    // contribuție lei/buc
  clasa: ClasaME;
}
export interface RezultatME { randuri: RandME[]; pragPop: number; cmMediu: number; }

// Regula Kasavana–Smith: popular dacă mixul de bucăți ≥ 70% × (100/n);
// profitabil dacă contribuția unitară ≥ media ponderată a contribuției
export function menuEngineering(rows: RandProdus[]): RezultatME {
  const cu = rows.filter(r => r.buc > 0 && !r.faraReteta);
  const totalBuc = cu.reduce((s, r) => s + r.buc, 0);
  const totalProfit = cu.reduce((s, r) => s + r.profit, 0);
  const n = cu.length;
  const pragPop = n > 0 ? 70 / n : 0;
  const cmMediu = totalBuc > 0 ? totalProfit / totalBuc : 0;
  const randuri: RandME[] = cu.map(r => {
    const mixBuc = totalBuc > 0 ? (r.buc / totalBuc) * 100 : 0;
    const profitUnitar = r.buc > 0 ? r.profit / r.buc : 0;
    const popular = mixBuc >= pragPop;
    const profitabil = profitUnitar >= cmMediu;
    const clasa: ClasaME = popular && profitabil ? 'STAR' : popular ? 'PLOWHORSE' : profitabil ? 'PUZZLE' : 'DOG';
    return { ...r, mixBuc, profitUnitar, clasa };
  }).sort((a, b) => b.mixBuc - a.mixBuc);
  return { randuri, pragPop, cmMediu };
}

// ---------------------------------------------------------------- Alerts Center

export interface Alerta {
  nivel: 'CRITIC' | 'ATENTIE' | 'INFO';
  categorie: 'FC_PESTE_TINTA' | 'COST_INGREDIENT' | 'MARJA' | 'MARJA_MICA' | 'PROFIT' | 'IMPACT';
  titlu: string;
  detaliu: string;
}

export const PRAG_IMPACT_LEI = 250;      // impact lunar considerat „ridicat"
const PRAG_MARJA_PP = 1.5;               // scădere de marjă semnalată
const FEREASTRA_ZILE = 60;               // schimbări recente luate în calcul

export function lunaPrec(l: string): string {
  const [y, m] = l.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function costLunar(state: AppState, ctx: Ctx, lunaRef: string): { net: number; cost: number } {
  const memo = new Map<string, unknown>();
  let net = 0, cost = 0;
  for (const v of state.vanzari) {
    if (luna(v.data) !== lunaRef) continue;
    net += v.net;
    const c = costProdus(v.produs, v.canal, ctx, v.data, memo);
    if (c) cost += c.total * v.cant;
  }
  return { net, cost };
}

export function alerte(state: AppState, ctx: Ctx, lunaSel: string): Alerta[] {
  const rez: Alerta[] = [];
  const azi = new Date();
  const cutoff = new Date(azi.getTime() - FEREASTRA_ZILE * 86400000).toISOString().slice(0, 10);
  const tintaRetea = state.tinte.find(t => t.locatie === 'RETEA')?.fcCurat ?? null;

  // 1) produse cu Food Cost peste target
  const acum = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  if (tintaRetea != null) {
    for (const r of acum) {
      if (r.fc == null || r.buc === 0) continue;
      if (r.fc > tintaRetea) {
        const peste = r.fc - tintaRetea;
        rez.push({
          nivel: peste > 10 ? 'CRITIC' : 'ATENTIE', categorie: 'FC_PESTE_TINTA',
          titlu: `${r.denumire}: Food Cost ${fmtPct(r.fc)}`,
          detaliu: `Peste ținta rețelei de ${fmtPct(tintaRetea)} cu ${fmtPP(peste)}. ${fmtInt(r.buc)} buc vândute în ${lunaSel} — candidat pentru Product Impact (gramaj, rețetă sau preț).`,
        });
      }
    }
  }

  // 2) creșteri ale costului ingredientelor (ultima intrare vs precedenta)
  for (const ing of state.ingrediente) {
    if (ing.preturi.length < 2) continue;
    const ps = [...ing.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
    const ultim = ps[ps.length - 1], prec = ps[ps.length - 2];
    if (ultim.validDeLa < cutoff || prec.pret <= 0) continue;
    const varPct = ((ultim.pret - prec.pret) / prec.pret) * 100;
    if (varPct >= state.setari.pragAlertaPret) {
      rez.push({
        nivel: varPct >= state.setari.pragAlertaPret * 2 ? 'CRITIC' : 'ATENTIE', categorie: 'COST_INGREDIENT',
        titlu: `${ing.denumire}: ${fmtLei(prec.pret)} → ${fmtLei(ultim.pret)} lei/${ing.um}`,
        detaliu: `Creștere de ${fmtPct(varPct)} de la ${ultim.validDeLa}. Verifică furnizorul ${state.furnizori.find(f => f.cod === ing.furnizor)?.nume ?? ''} sau rulează o simulare de înlocuire.`,
      });
    } else if (varPct > 0 && ultim.validDeLa >= cutoff) {
      // impactul financiar chiar și sub prag, dacă e mare în lei
      const ctxVechi: Ctx = {
        ...ctx,
        ingrediente: new Map([...ctx.ingrediente.values()].map(i =>
          [i.cod, i.cod === ing.cod ? { ...i, preturi: ps.slice(0, -1) } : i])),
      };
      const dCost = costLunar(state, ctx, lunaSel).cost - costLunar(state, ctxVechi, lunaSel).cost;
      if (dCost >= PRAG_IMPACT_LEI) {
        rez.push({
          nivel: 'ATENTIE', categorie: 'COST_INGREDIENT',
          titlu: `${ing.denumire}: +${fmtPct(varPct)} cu impact ${fmtInt(dCost)} lei/lună`,
          detaliu: `Deși sub pragul de ${state.setari.pragAlertaPret}%, volumul consumat face scumpirea semnificativă la nivel de rețea.`,
        });
      }
    }
  }

  // 3) scăderi ale marjei față de luna precedentă
  const prec = perProdus(state.vanzari, ctx, { luna: lunaPrec(lunaSel), vedere: 'TOTAL' });
  for (const r of acum) {
    const p = prec.find(x => x.cod === r.cod);
    if (!p || r.marja == null || p.marja == null || r.buc === 0) continue;
    const dif = r.marja - p.marja;
    if (dif <= -PRAG_MARJA_PP) {
      rez.push({
        nivel: dif <= -2 * PRAG_MARJA_PP ? 'CRITIC' : 'ATENTIE', categorie: 'MARJA',
        titlu: `${r.denumire}: marja ${fmtPct(p.marja)} → ${fmtPct(r.marja)}`,
        detaliu: `Scădere de ${fmtPP(dif)} față de ${lunaPrec(lunaSel)} — de regulă din scumpirea ingredientelor sau schimbarea rețetei.`,
      });
    }
  }

  // 3b) profit în scădere față de luna precedentă
  for (const r of acum) {
    const p = prec.find(x => x.cod === r.cod);
    if (!p || r.buc === 0 || p.profit <= 0) continue;
    const dLei = r.profit - p.profit;
    const dPct = (dLei / p.profit) * 100;
    if (dLei <= -200 && dPct <= -10) {
      rez.push({
        nivel: dLei <= -500 && dPct <= -25 ? 'CRITIC' : 'ATENTIE', categorie: 'PROFIT',
        titlu: `${r.denumire}: profit ${fmtInt(p.profit)} → ${fmtInt(r.profit)} lei`,
        detaliu: `Scădere de ${fmtInt(-dLei)} lei (${fmtPct(-dPct)}) față de ${lunaPrec(lunaSel)} — verifică volumul, costul rețetei și prețul.`,
      });
    }
  }

  // 3c) marjă foarte mică în termeni absoluți
  for (const r of acum) {
    if (r.marja == null || r.buc === 0) continue;
    if (r.marja < 70) {
      rez.push({
        nivel: r.marja < 60 ? 'CRITIC' : 'ATENTIE', categorie: 'MARJA_MICA',
        titlu: `${r.denumire}: marjă ${fmtPct(r.marja)}`,
        detaliu: `Sub pragul sănătos de 70% pentru QSR (FC ${fmtPct(r.fc)}). Candidat pentru renegocierea costului, gramaj sau preț — vezi Menu Engineering și Product Impact.`,
      });
    }
  }

  // 4) modificări recente cu impact financiar ridicat (versiuni noi de rețetă)
  for (const r of state.retete) {
    if (r.versiuni.length < 2) continue;
    const vAct = versiuneActiva(r);
    if (vAct.data < cutoff) continue;
    const idx = r.versiuni.findIndex(v => v.nr === vAct.nr);
    const vPrec = r.versiuni[idx - 1];
    if (!vPrec) continue;
    // impactul versiunii noi pe mixul lunii: ambele versiuni se evaluează „ca și cum" ar fi
    // fost în vigoare toată luna (altfel costul datat le-ar aplica doar din ziua publicării)
    const caIn = (nr: number): Ctx => ({
      ...ctx,
      retete: new Map([...ctx.retete.values()].map(x => [x.cod, x.cod === r.cod
        ? { ...x, activa: nr, versiuni: x.versiuni.filter(v => v.nr === nr).map(v => ({ ...v, data: '2000-01-01' })) }
        : x])),
    });
    const dCost = costLunar(state, caIn(vAct.nr), lunaSel).cost - costLunar(state, caIn(vPrec.nr), lunaSel).cost;
    if (Math.abs(dCost) >= PRAG_IMPACT_LEI) {
      rez.push({
        nivel: dCost > 0 ? 'ATENTIE' : 'INFO', categorie: 'IMPACT',
        titlu: `Rețeta „${r.denumire}" v${vAct.nr} (${vAct.data}): ${dCost > 0 ? '+' : ''}${fmtInt(dCost)} lei/lună`,
        detaliu: `${vAct.nota ?? 'Versiune nouă'} — impact estimat pe mixul lunii ${lunaSel} față de v${vPrec.nr}. ${dCost > 0 ? 'Costul rețelei crește.' : 'Economie confirmată.'}`,
      });
    }
  }

  const ordine = { CRITIC: 0, ATENTIE: 1, INFO: 2 };
  return rez.sort((a, b) => ordine[a.nivel] - ordine[b.nivel]);
}


// ---------------------------------------------------------------- Smart Recommendations

export interface Recomandare {
  id: string;
  tip: 'PRET' | 'GRAMAJ' | 'FURNIZOR' | 'PROMOVEAZA' | 'ANALIZEAZA';
  titlu: string;          // acțiunea concretă, cu cifre
  motiv: string;
  impactFcPP: number | null;        // Δ FC rețea (pp)
  impactProfitLunar: number | null; // Δ profit rețea (lei/lună)
  detaliu: string;                  // impactul pe rețea, explicat
  produs?: string;
}

export function recomandari(state: AppState, ctx: Ctx, lunaSel: string, max = 10): Recomandare[] {
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  if (!rows.length) return [];
  const me = menuEngineering(rows);
  const tinta = state.tinte.find(t => t.locatie === 'RETEA')?.fcCurat ?? null;
  const rez: Recomandare[] = [];
  const sim = (sch: Schimbare) => {
    // impactul se măsoară pe vânzările lunii (date din trecut) → evaluare pe istoric,
    // altfel recomandările de gramaj ar raporta impact zero (§BUG-1)
    const { ctx: c1, ctxBaza, produseNoi, preturiVanzare } = aplicaScenariu(state, [sch], { peIstoric: true });
    const r = impactRetea(state, ctxBaza, c1, produseNoi, preturiVanzare, lunaSel);
    return {
      dFc: r.dupa.fc != null && r.inainte.fc != null ? r.dupa.fc - r.inainte.fc : null,
      dP: r.dupa.profit - r.inainte.profit,
    };
  };

  // 1) Crește prețul cu X RON — populari cu FC peste țintă
  if (tinta != null) {
    for (const r of me.randuri.filter(x => x.clasa === 'PLOWHORSE' && x.fc != null && x.fc > tinta).slice(0, 3)) {
      const p = ctx.produse.get(r.cod);
      const k = kpiProdus(r.cod, 'INSTORE', ctx);
      if (!p?.pretInstore || !k?.cost || k.fc == null) continue;
      const brutTinta = (k.cost.total / (tinta / 100)) * (1 + p.tva / 100);
      const XFull = Math.ceil((brutTinta - p.pretInstore) * 10) / 10;
      const plafon = Math.max(0.5, Math.round(p.pretInstore * 0.10 * 10) / 10); // max +10% comercial
      const X = Math.min(XFull, plafon);
      if (X < 0.3) continue;
      const partial = XFull > plafon + 1e-9;
      const imp = sim({ tip: 'PRET_VANZARE', produs: r.cod, canal: 'INSTORE', pretNou: +(p.pretInstore + X).toFixed(2) });
      rez.push({
        id: `pret-${r.cod}`, tip: 'PRET', produs: r.cod,
        titlu: `Crește prețul „${r.denumire}" cu ${X.toFixed(2).replace('.', ',')} RON (InStore)`,
        motiv: `FC ${fmtPct(r.fc)} peste ținta de ${fmtPct(tinta)}, iar produsul e popular (${fmtPct(r.mixBuc)} din bucăți) — noul preț ${partial ? 'reduce FC-ul spre țintă (plafonat la +10% comercial)' : 'aduce FC-ul produsului la țintă'}.`,
        impactFcPP: imp.dFc, impactProfitLunar: imp.dP,
        detaliu: `La volumele PMIX din ${lunaSel}: FC rețea ${fmtPP(imp.dFc)}, profit ${imp.dP >= 0 ? '+' : ''}${fmtInt(imp.dP)} lei/lună (${fmtInt(imp.dP * 12)} lei/an).`,
      });
    }
  }

  // 2) Scade gramajul ingredientului Y cu X g — cea mai scumpă linie food a produselor scumpe
  for (const r of me.randuri.filter(x => tinta != null && x.fc != null && x.fc > tinta).slice(0, 3)) {
    const ret = ctx.retete.get(r.cod);
    if (!ret) continue;
    const v = versiuneActiva(ret);
    let best = -1, bestCost = 0;
    v.linii.forEach((l, i) => {
      if (l.um !== 'g' || l.tipComp === 'AMBALAJ' || l.cant < 20) return;
      const c = costLinieLa(l, ctx).total;
      if (c > bestCost) { bestCost = c; best = i; }
    });
    if (best < 0) continue;
    const l = v.linii[best];
    const reducere = Math.max(5, Math.round(l.cant * 0.1 / 5) * 5);
    const numeC = ctx.ingrediente.get(l.comp)?.denumire ?? ctx.retete.get(l.comp)?.denumire ?? l.comp;
    const imp = sim({ tip: 'GRAMAJ', reteta: r.cod, linie: best, cantNoua: l.cant - reducere });
    rez.push({
      id: `gramaj-${r.cod}`, tip: 'GRAMAJ', produs: r.cod,
      titlu: `Scade gramajul „${numeC}" din ${r.denumire} cu ${reducere} g (${l.cant} → ${l.cant - reducere} g)`,
      motiv: `Cea mai scumpă componentă a rețetei (${fmtLei(bestCost)} lei/porție), iar FC-ul produsului e ${fmtPct(r.fc)}, peste ținta de ${fmtPct(tinta)}.`,
      impactFcPP: imp.dFc, impactProfitLunar: imp.dP,
      detaliu: `Pe mixul lunii: FC rețea ${fmtPP(imp.dFc)}, profit ${imp.dP >= 0 ? '+' : ''}${fmtInt(imp.dP)} lei/lună (${fmtInt(imp.dP * 12)} lei/an). Testează senzorial înainte de aplicare.`,
    });
  }

  // 3) Înlocuiește sursa ingredientului Z cu alternativa A — oferte mai ieftine, prioritizate după economia în lei
  const consum = consumuriLuna(state, ctx, lunaSel);
  const oferteBune = state.pretFurnizori.flatMap(o => {
    const ing = ctx.ingrediente.get(o.ingredient);
    if (!ing) return [];
    const pc = pretCurent(ing);
    if (pc <= 0 || o.pret >= pc * 0.97) return [];
    const economieLei = (pc - o.pret) * (consum.get(ing.cod)?.cant ?? 0);
    if (economieLei < 20) return [];
    return [{ o, ing, pc, economieLei }];
  }).sort((a, b) => b.economieLei - a.economieLei).slice(0, 2);
  for (const { o, ing, pc } of oferteBune) {
    const fz = state.furnizori.find(f => f.cod === o.furnizor)?.nume ?? o.furnizor;
    const imp = sim({ tip: 'FURNIZOR', ingredient: ing.cod, furnizorNou: o.furnizor, pretNou: o.pret });
    rez.push({
      id: `furnizor-${ing.cod}-${o.furnizor}`, tip: 'FURNIZOR',
      titlu: `Înlocuiește sursa „${ing.denumire}" cu alternativa ${fz} (${fmtLei(o.pret)} vs ${fmtLei(pc)} lei/${ing.um})`,
      motiv: `Ofertă cu ${fmtPct(((pc - o.pret) / pc) * 100)} mai ieftină pentru un ingredient cu consum mare.`,
      impactFcPP: imp.dFc, impactProfitLunar: imp.dP,
      detaliu: `FC rețea ${fmtPP(imp.dFc)}, profit ${imp.dP >= 0 ? '+' : ''}${fmtInt(imp.dP)} lei/lună (${fmtInt(imp.dP * 12)} lei/an), la același consum. Verifică calitatea înainte de switch.`,
    });
  }

  // 4) Promovează — marjă mare (Stars & Puzzles peste media +3 pp)
  const marjaMedie = rows.reduce((s, r) => s + r.profit, 0) / Math.max(1, rows.reduce((s, r) => s + r.net, 0)) * 100;
  for (const r of me.randuri.filter(x => (x.clasa === 'STAR' || x.clasa === 'PUZZLE') && x.marja != null && x.marja > marjaMedie)
    .sort((a, b) => (b.marja ?? 0) - (a.marja ?? 0)).slice(0, 2)) {
    const plus10 = r.profit * 0.1;
    rez.push({
      id: `promo-${r.cod}`, tip: 'PROMOVEAZA', produs: r.cod,
      titlu: `Promovează „${r.denumire}" — marjă ${fmtPct(r.marja)}`,
      motiv: `Marjă cu ${fmtPP((r.marja ?? 0) - marjaMedie)} peste media rețelei (${fmtPct(marjaMedie)}); fiecare porție aduce ${fmtLei(r.profitUnitar)} lei profit.`,
      impactFcPP: null, impactProfitLunar: plus10,
      detaliu: `+10% volum ar aduce ~${fmtInt(plus10)} lei profit/lună (${fmtInt(plus10 * 12)} lei/an) fără a afecta FC%. Vezi și Promo Analyzer.`,
    });
  }

  // 5) Analizează — profit prea mic
  for (const r of me.randuri.filter(x => x.clasa === 'DOG' || (x.contributie < 2 && x.buc > 0))
    .sort((a, b) => a.contributie - b.contributie).slice(0, 2)) {
    rez.push({
      id: `analiza-${r.cod}`, tip: 'ANALIZEAZA', produs: r.cod,
      titlu: `Analizează „${r.denumire}" — profitul este prea mic`,
      motiv: `Doar ${fmtPct(r.contributie)} din profitul companiei (${fmtInt(r.profit)} lei/lună) la ${fmtPct(r.mixBuc)} din bucăți${r.clasa === 'DOG' ? ' — cadranul Dog' : ''}.`,
      impactFcPP: null, impactProfitLunar: null,
      detaliu: `Opțiuni: reformulare în R&D Lab, repoziționare de preț sau eliminare (pierderea directă ar fi ${fmtInt(r.profit)} lei/lună, dar eliberează meniul).`,
    });
  }

  rez.sort((a, b) => Math.abs(b.impactProfitLunar ?? 0) - Math.abs(a.impactProfitLunar ?? 0));
  return rez.slice(0, max);
}

// ---------------------------------------------------------------- Promo & Price Analyzer

export interface RandPromo {
  upliftPct: number; buc: number; net: number; cost: number;
  fc: number | null; profit: number; dProfit: number; breakEven: boolean;
}

export function analizaPromo(state: AppState, ctx: Ctx, cod: string, discountPct: number,
  uplifts: number[], lunaRef: string): { baseline: { buc: number; net: number; profit: number; fc: number | null }; randuri: RandPromo[] } | null {
  const p = ctx.produse.get(cod);
  if (!p) return null;
  const vol = volumeLuna(state, lunaRef).get(cod) ?? { bucIn: 0, bucDlv: 0, netIn: 0, netDlv: 0 };
  const canale = (['INSTORE', 'DELIVERY'] as const).map(canal => {
    const brut = canal === 'INSTORE' ? p.pretInstore : p.pretDelivery;
    const cost = costProdus(cod, canal, ctx, `${lunaRef}-15`)?.total ?? 0;
    const buc = canal === 'INSTORE' ? vol.bucIn : vol.bucDlv;
    return { brut: brut ?? 0, net0: brut ? brut / (1 + p.tva / 100) : 0, cost, buc };
  });
  const b = canale.reduce((s, c) => ({ buc: s.buc + c.buc, net: s.net + c.net0 * c.buc, cost: s.cost + c.cost * c.buc }), { buc: 0, net: 0, cost: 0 });
  const baseline = { buc: b.buc, net: b.net, profit: b.net - b.cost, fc: b.net > 0 ? (b.cost / b.net) * 100 : null };
  const randuri: RandPromo[] = uplifts.map(u => {
    const t = canale.reduce((s, c) => {
      const bucN = c.buc * (1 + u / 100);
      const netU = c.net0 * (1 - discountPct / 100);
      return { buc: s.buc + bucN, net: s.net + netU * bucN, cost: s.cost + c.cost * bucN };
    }, { buc: 0, net: 0, cost: 0 });
    const profit = t.net - t.cost;
    return {
      upliftPct: u, buc: t.buc, net: t.net, cost: t.cost,
      fc: t.net > 0 ? (t.cost / t.net) * 100 : null,
      profit, dProfit: profit - baseline.profit, breakEven: false,
    };
  });
  const primul = randuri.find(r => r.dProfit >= 0);
  if (primul) primul.breakEven = true;
  return { baseline, randuri };
}

// ---------------------------------------------------------------- formatare

export const fmtLei = (n: number | null | undefined, zecimale = 2) =>
  n == null ? '—' : n.toLocaleString('ro-RO', { minimumFractionDigits: zecimale, maximumFractionDigits: zecimale });
export const fmtPct = (n: number | null | undefined, zecimale = 1) =>
  n == null ? '—' : `${n.toLocaleString('ro-RO', { minimumFractionDigits: zecimale, maximumFractionDigits: zecimale })}%`;
export const fmtPP = (n: number | null | undefined) =>
  n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toLocaleString('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pp`;
export const fmtInt = (n: number | null | undefined) =>
  n == null ? '—' : Math.round(n).toLocaleString('ro-RO');
