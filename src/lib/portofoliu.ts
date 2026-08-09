// Faza 3 — Profit Intelligence: portofoliu de meniu, promoții și furnizori.
// Construit peste engine.ts (calcul) și decizii.ts (decizie); toate funcțiile sunt pure.
import type { AppState, Canal, Schimbare } from './types';
import {
  analizaPromo, aplicaScenariu, consumPerPortie, consumuriLuna, costProdus, impactRetea,
  kpiProdus, perProdus, pretCurent, volumeLuna,
  fmtInt, fmtLei, fmtPct, type Ctx, type RandProdus,
} from './engine';
import { cicluViata } from './decizii';

// ————————————————————————————————————————————— structura pe ingrediente (prin semipreparate și combo)

export function structuraIngrediente(cod: string, ctx: Ctx, canal: Canal = 'INSTORE'): Map<string, number> {
  const total = costProdus(cod, canal, ctx, '9999-12-31')?.total ?? 0;
  const m = new Map<string, number>();
  if (total <= 0) return m;
  const memo = new Map<string, number>();
  for (const ing of ctx.ingrediente.values()) {
    const cant = consumPerPortie(ing.cod, cod, canal, ctx, memo);
    if (cant <= 0) continue;
    m.set(ing.cod, ((cant * pretCurent(ing)) / total) * 100);
  }
  return m;
}

// suprapunerea structurilor de cost a două produse (0–100%)
export function similaritate(a: Map<string, number>, b: Map<string, number>): number {
  let s = 0;
  for (const [cod, sa] of a) s += Math.min(sa, b.get(cod) ?? 0);
  return s;
}

// ————————————————————————————————————————————— 6. Portfolio Optimization

export interface PerecheCanibalizare {
  a: string; b: string; numeA: string; numeB: string;
  categorie: string; pretA: number; pretB: number; difPretPct: number;
  mixA: number; mixB: number; trendA: number | null; trendB: number | null;
  similaritate: number; motiv: string;
}

export interface Redundanta { a: string; b: string; numeA: string; numeB: string; similaritate: number; motiv: string; }

export interface CategorieEchilibru {
  categorie: string; nrSKU: number;
  mixVanzari: number; mixProfit: number; mixCost: number;
  fc: number | null; marja: number | null;
  dezechilibru: number;              // %profit − %vânzări (negativ = consumă mai mult decât aduce)
  verdict: string;
}

export interface GolPret {
  categorie: string; de: number; la: number; latimePct: number;
  produsDe: string; produsLa: string;
  sugestie: string; potentialLunar: number | null;
}

export interface RezultatPortofoliu {
  canibalizari: PerecheCanibalizare[];
  redundante: Redundanta[];
  categorii: CategorieEchilibru[];
  goluri: GolPret[];
  produseNoi: { titlu: string; motiv: string; potentialLunar: number | null }[];
}

export function portofoliu(state: AppState, ctx: Ctx, lunaSel: string): RezultatPortofoliu {
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  const bucTotal = rows.reduce((s, r) => s + r.buc, 0);
  const cicluri = cicluViata(state, ctx, lunaSel);
  const mixBuc = (cod: string) => {
    const r = rows.find(x => x.cod === cod);
    return bucTotal > 0 && r ? (r.buc / bucTotal) * 100 : 0;
  };
  const struct = new Map<string, Map<string, number>>();
  for (const r of rows) struct.set(r.cod, structuraIngrediente(r.cod, ctx));

  // ——— canibalizare: aceeași categorie, preț apropiat, trenduri divergente
  const canibalizari: PerecheCanibalizare[] = [];
  const redundante: Redundanta[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const A = ctx.produse.get(rows[i].cod), B = ctx.produse.get(rows[j].cod);
      if (!A || !B) continue;
      const sim = similaritate(struct.get(A.cod) ?? new Map(), struct.get(B.cod) ?? new Map());
      if (A.categorie === B.categorie && sim >= 60) {
        redundante.push({
          a: A.cod, b: B.cod, numeA: A.denumire, numeB: B.denumire, similaritate: sim,
          motiv: `Structuri de cost suprapuse în proporție de ${fmtPct(sim)} — practic același produs din perspectiva rețetarului și a aprovizionării.`,
        });
      }
      if (A.categorie !== B.categorie || !A.pretInstore || !B.pretInstore) continue;
      const difPct = (Math.abs(A.pretInstore - B.pretInstore) / Math.min(A.pretInstore, B.pretInstore)) * 100;
      if (difPct > 15) continue;
      const mA = mixBuc(A.cod), mB = mixBuc(B.cod);
      if (mA + mB < 8) continue;
      const tA = cicluri.find(c => c.cod === A.cod)?.trendPct ?? null;
      const tB = cicluri.find(c => c.cod === B.cod)?.trendPct ?? null;
      const divergent = tA != null && tB != null && Math.sign(tA) !== Math.sign(tB) && Math.abs(tA - tB) >= 6;
      if (!divergent && sim < 50) continue;
      canibalizari.push({
        a: A.cod, b: B.cod, numeA: A.denumire, numeB: B.denumire, categorie: A.categorie,
        pretA: A.pretInstore, pretB: B.pretInstore, difPretPct: difPct,
        mixA: mA, mixB: mB, trendA: tA, trendB: tB, similaritate: sim,
        motiv: `Aceeași categorie, prețuri la ${fmtPct(difPct)} distanță și ${fmtPct(sim)} structură de cost comună`
          + (divergent ? `; trendurile diverg (${tA! >= 0 ? '+' : ''}${fmtPct(tA!)} vs ${tB! >= 0 ? '+' : ''}${fmtPct(tB!)}), semn că unul îl înlocuiește pe celălalt.` : '; se adresează aceleiași ocazii de consum.'),
      });
    }
  }
  canibalizari.sort((a, b) => (b.mixA + b.mixB) - (a.mixA + a.mixB));
  redundante.sort((a, b) => b.similaritate - a.similaritate);

  // ——— echilibrul categoriilor
  const netTotal = rows.reduce((s, r) => s + r.net, 0);
  const profitTotal = rows.reduce((s, r) => s + r.profit, 0);
  const costTotal = rows.reduce((s, r) => s + r.cost, 0);
  const perCat = new Map<string, RandProdus[]>();
  for (const r of rows) perCat.set(r.categorie, [...(perCat.get(r.categorie) ?? []), r]);
  const categorii: CategorieEchilibru[] = [...perCat.entries()].map(([categorie, lista]) => {
    const net = lista.reduce((s, r) => s + r.net, 0);
    const cost = lista.reduce((s, r) => s + r.cost, 0);
    const profit = lista.reduce((s, r) => s + r.profit, 0);
    const mixVanzari = netTotal > 0 ? (net / netTotal) * 100 : 0;
    const mixProfit = profitTotal > 0 ? (profit / profitTotal) * 100 : 0;
    const dez = mixProfit - mixVanzari;
    const fc = net > 0 ? (cost / net) * 100 : null;
    const verdict = dez <= -3
      ? `Consumă mai mult decât aduce: ${fmtPct(mixVanzari)} din vânzări, dar doar ${fmtPct(mixProfit)} din profit (FC ${fmtPct(fc)}).`
      : dez >= 3
        ? `Categorie eficientă: ${fmtPct(mixProfit)} din profit la ${fmtPct(mixVanzari)} din vânzări — merită extinsă.`
        : `Echilibrată: contribuția la profit urmează ponderea în vânzări.`;
    return {
      categorie, nrSKU: lista.length, mixVanzari, mixProfit,
      mixCost: costTotal > 0 ? (cost / costTotal) * 100 : 0,
      fc, marja: net > 0 ? (profit / net) * 100 : null,
      dezechilibru: dez, verdict,
    };
  }).sort((a, b) => a.dezechilibru - b.dezechilibru);

  // ——— goluri în segmentele de preț, pe categorie
  const goluri: GolPret[] = [];
  for (const [categorie, lista] of perCat) {
    const preturi = lista
      .map(r => ({ cod: r.cod, nume: r.denumire, pret: ctx.produse.get(r.cod)?.pretInstore ?? 0, marja: r.marja, buc: r.buc }))
      .filter(x => x.pret > 0).sort((a, b) => a.pret - b.pret);
    if (preturi.length < 2) continue;
    const marjaMed = lista.reduce((s, r) => s + (r.marja ?? 0), 0) / lista.length;
    const bucMed = lista.reduce((s, r) => s + r.buc, 0) / lista.length;
    for (let i = 1; i < preturi.length; i++) {
      const de = preturi[i - 1].pret, la = preturi[i].pret;
      const latime = ((la - de) / de) * 100;
      if (latime < 45 || la - de < 5) continue;
      const mijloc = Math.round(((de + la) / 2) * 2) / 2;
      const potential = (mijloc / 1.1) * (marjaMed / 100) * (bucMed * 0.3);
      goluri.push({
        categorie, de, la, latimePct: latime,
        produsDe: preturi[i - 1].nume, produsLa: preturi[i].nume,
        sugestie: `Bandă neacoperită între ${fmtLei(de)} și ${fmtLei(la)} lei (${preturi[i - 1].nume} → ${preturi[i].nume}). Un produs la ~${fmtLei(mijloc)} lei ar prelua clienții care refuză saltul de preț.`,
        potentialLunar: potential,
      });
    }
  }
  goluri.sort((a, b) => (b.potentialLunar ?? 0) - (a.potentialLunar ?? 0));

  // ——— oportunități de produse noi
  const produseNoi: RezultatPortofoliu['produseNoi'] = [];
  for (const g of goluri.slice(0, 2)) {
    produseNoi.push({
      titlu: `Produs nou în ${g.categorie}, bandă ${fmtLei(g.de)}–${fmtLei(g.la)} lei`,
      motiv: g.sugestie + ' Construiește varianta în R&D Lab și verifică FC-ul înainte de lansare.',
      potentialLunar: g.potentialLunar,
    });
  }
  const catEficienta = categorii.filter(c => c.dezechilibru >= 2).sort((a, b) => b.dezechilibru - a.dezechilibru)[0];
  if (catEficienta) {
    produseNoi.push({
      titlu: `Extinde categoria „${catEficienta.categorie}"`,
      motiv: `${catEficienta.verdict} Un SKU suplimentar în această categorie aduce profit peste media rețelei (marjă ${fmtPct(catEficienta.marja)}).`,
      potentialLunar: null,
    });
  }
  for (const r of redundante.slice(0, 1)) {
    produseNoi.push({
      titlu: `Diferențiază „${r.numeB}" față de „${r.numeA}"`,
      motiv: `${r.motiv} Reformulare cu un ingredient distinctiv sau repoziționare de preț, ca cele două să nu concureze pe același client.`,
      potentialLunar: null,
    });
  }

  return { canibalizari, redundante, categorii, goluri, produseNoi };
}

// ————————————————————————————————————————————— 7. Promotion Simulator

export type TipPromotie = 'DISCOUNT' | 'COMBO' | 'CADOU' | 'MENIU';

export interface ConfigPromotie {
  tip: TipPromotie;
  produs: string;                    // produsul principal (DISCOUNT, CADOU) sau ancora pachetului
  discountPct?: number;              // DISCOUNT, MENIU
  produseCombo?: string[];           // COMBO / MENIU: componentele pachetului
  pretPachet?: number;               // COMBO: prețul brut al pachetului (dacă lipsește, se folosește discountPct)
  cadou?: string;                    // CADOU: produsul oferit gratuit
  volumBaza?: number;                // pachete estimate / lună (COMBO, MENIU); implicit din PMIX
  canibalizarePct?: number;          // % din pachete care înlocuiesc vânzări existente (implicit 70)
  uplifts?: number[];                // scenarii de volum
}

export interface RandPromotie {
  upliftPct: number; unitati: number;
  net: number; cost: number; fc: number | null;
  profit: number; profitPierdut: number; dProfit: number;
  breakEven: boolean;
}

export interface RezultatPromotie {
  tip: TipPromotie; descriere: string;
  netUnitar: number; costUnitar: number; profitUnitar: number; fcUnitar: number | null; marjaUnitara: number | null;
  pierdereUnitara: number;
  baseline: { unitati: number; profit: number; fc: number | null };
  randuri: RandPromotie[];
  upliftBreakEven: number | null;
}

// media ponderată pe canale a unui indicator, pe volumele lunii
function peCanale(state: AppState, ctx: Ctx, cod: string, lunaSel: string) {
  const v = volumeLuna(state, lunaSel).get(cod) ?? { bucIn: 0, bucDlv: 0, netIn: 0, netDlv: 0 };
  const buc = v.bucIn + v.bucDlv;
  const k = (c: Canal) => kpiProdus(cod, c, ctx);
  const kIn = k('INSTORE'), kDlv = k('DELIVERY');
  const w = buc > 0 ? { i: v.bucIn / buc, d: v.bucDlv / buc } : { i: 1, d: 0 };
  return {
    buc,
    net: (kIn?.net ?? 0) * w.i + (kDlv?.net ?? 0) * w.d,
    cost: (kIn?.cost?.total ?? 0) * w.i + (kDlv?.cost?.total ?? 0) * w.d,
    profit: (kIn?.profit ?? 0) * w.i + (kDlv?.profit ?? 0) * w.d,
    brut: (ctx.produse.get(cod)?.pretInstore ?? 0) * w.i + (ctx.produse.get(cod)?.pretDelivery ?? 0) * w.d,
    tva: ctx.produse.get(cod)?.tva ?? 0,
  };
}

export function simulPromotie(state: AppState, ctx: Ctx, cfg: ConfigPromotie, lunaSel: string): RezultatPromotie | null {
  const uplifts = cfg.uplifts ?? [0, 10, 20, 30];
  const canib = (cfg.canibalizarePct ?? 70) / 100;
  const nume = (c: string) => ctx.produse.get(c)?.denumire ?? c;

  // DISCOUNT: delegăm matematica existentă (o singură implementare a reducerii procentuale)
  if (cfg.tip === 'DISCOUNT') {
    const d = cfg.discountPct ?? 0;
    const a = analizaPromo(state, ctx, cfg.produs, d, uplifts, lunaSel);
    if (!a) return null;
    const u = peCanale(state, ctx, cfg.produs, lunaSel);
    const netU = u.net * (1 - d / 100);
    return {
      tip: 'DISCOUNT', descriere: `−${d}% la „${nume(cfg.produs)}"`,
      netUnitar: netU, costUnitar: u.cost, profitUnitar: netU - u.cost,
      fcUnitar: netU > 0 ? (u.cost / netU) * 100 : null,
      marjaUnitara: netU > 0 ? ((netU - u.cost) / netU) * 100 : null,
      pierdereUnitara: 0,
      baseline: { unitati: a.baseline.buc, profit: a.baseline.profit, fc: a.baseline.fc },
      randuri: a.randuri.map(r => ({
        upliftPct: r.upliftPct, unitati: r.buc, net: r.net, cost: r.cost, fc: r.fc,
        profit: r.profit, profitPierdut: 0, dProfit: r.dProfit, breakEven: r.breakEven,
      })),
      upliftBreakEven: a.randuri.find(r => r.breakEven)?.upliftPct ?? null,
    };
  }

  // CADOU: produsul principal se vinde la preț întreg, dar poartă și costul cadoului
  if (cfg.tip === 'CADOU') {
    if (!cfg.cadou) return null;
    const p = peCanale(state, ctx, cfg.produs, lunaSel);
    const c = peCanale(state, ctx, cfg.cadou, lunaSel);
    const netU = p.net, costU = p.cost + c.cost;
    const pierdere = canib * c.profit;      // cadoul înlocuiește vânzări existente ale produsului oferit
    const baselineProfit = p.profit * p.buc;
    const randuri: RandPromotie[] = uplifts.map(up => {
      const unitati = p.buc * (1 + up / 100);
      const profit = (netU - costU - pierdere) * unitati;
      return {
        upliftPct: up, unitati, net: netU * unitati, cost: costU * unitati,
        fc: netU > 0 ? (costU / netU) * 100 : null,
        profit, profitPierdut: pierdere * unitati, dProfit: profit - baselineProfit, breakEven: false,
      };
    });
    const be = randuri.find(r => r.dProfit >= 0); if (be) be.breakEven = true;
    return {
      tip: 'CADOU', descriere: `„${nume(cfg.produs)}" cu „${nume(cfg.cadou)}" cadou`,
      netUnitar: netU, costUnitar: costU, profitUnitar: netU - costU,
      fcUnitar: netU > 0 ? (costU / netU) * 100 : null,
      marjaUnitara: netU > 0 ? ((netU - costU) / netU) * 100 : null,
      pierdereUnitara: pierdere,
      baseline: { unitati: p.buc, profit: baselineProfit, fc: p.net > 0 ? (p.cost / p.net) * 100 : null },
      randuri, upliftBreakEven: randuri.find(r => r.breakEven)?.upliftPct ?? null,
    };
  }

  // COMBO / MENIU: pachet din mai multe produse, la un preț de pachet
  const comps = (cfg.produseCombo?.length ? cfg.produseCombo : [cfg.produs]).map(c => peCanale(state, ctx, c, lunaSel));
  if (!comps.length) return null;
  const brutSuma = comps.reduce((s, c) => s + c.brut, 0);
  const tva = comps[0].tva;
  const brutPachet = cfg.pretPachet && cfg.pretPachet > 0
    ? cfg.pretPachet
    : brutSuma * (1 - (cfg.discountPct ?? 0) / 100);
  const netU = brutPachet / (1 + tva / 100);
  const costU = comps.reduce((s, c) => s + c.cost, 0);
  const profitSeparat = comps.reduce((s, c) => s + c.profit, 0);
  const pierdere = canib * profitSeparat;
  const volumBaza = cfg.volumBaza && cfg.volumBaza > 0
    ? cfg.volumBaza
    : Math.round(Math.min(...comps.map(c => c.buc)) * 0.25);

  const randuri: RandPromotie[] = uplifts.map(up => {
    const unitati = volumBaza * (1 + up / 100);
    const profit = (netU - costU - pierdere) * unitati;
    return {
      upliftPct: up, unitati, net: netU * unitati, cost: costU * unitati,
      fc: netU > 0 ? (costU / netU) * 100 : null,
      profit, profitPierdut: pierdere * unitati, dProfit: profit, breakEven: false,
    };
  });
  const be = randuri.find(r => r.dProfit >= 0); if (be) be.breakEven = true;

  const disc = brutSuma > 0 ? (1 - brutPachet / brutSuma) * 100 : 0;
  return {
    tip: cfg.tip,
    descriere: `${cfg.tip === 'MENIU' ? 'Meniu' : 'Combo'} „${(cfg.produseCombo ?? [cfg.produs]).map(nume).join(' + ')}" la ${fmtLei(brutPachet)} lei (−${fmtPct(disc)} față de ${fmtLei(brutSuma)} lei separat)`,
    netUnitar: netU, costUnitar: costU, profitUnitar: netU - costU,
    fcUnitar: netU > 0 ? (costU / netU) * 100 : null,
    marjaUnitara: netU > 0 ? ((netU - costU) / netU) * 100 : null,
    pierdereUnitara: pierdere,
    baseline: { unitati: 0, profit: 0, fc: null },
    randuri, upliftBreakEven: randuri.find(r => r.breakEven)?.upliftPct ?? null,
  };
}

// ————————————————————————————————————————————— 8. Supplier Intelligence

export interface IngredientFurnizor {
  cod: string; nume: string; um: string;
  pret: number; pretAnterior: number | null; variatiePct: number | null; dataUltima: string;
  cantLunara: number; cheltuialaLunara: number; cheltuialaAnuala: number;
  alternativa: { furnizor: string; pret: number; economieLunara: number } | null;
}

export interface IntelFurnizor {
  cod: string; nume: string;
  ingrediente: IngredientFurnizor[];
  cheltuialaLunara: number; cheltuialaAnuala: number;
  shareCost: number;                            // % din costul total de materiale (Food & Paper) al rețelei
  produseAfectate: string[];
  impactCrestere5: { fcPP: number | null; profitLunar: number };   // dacă furnizorul crește cu 5%
  economieAlternative: number;                  // lei/lună dacă mutăm la cea mai bună ofertă
  evolutie: { data: string; pret: number; ingredient: string }[];
}

export function intelFurnizori(state: AppState, ctx: Ctx, lunaSel: string): IntelFurnizor[] {
  const cons = consumuriLuna(state, ctx, lunaSel);
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  const costMaterialeTotal = rows.reduce((s, r) => s + r.cost, 0);   // Food + Paper: cheltuiala furnizorilor le acoperă pe ambele

  return state.furnizori.map(f => {
    const ale = state.ingrediente.filter(i => i.furnizor === f.cod);
    const ingrediente: IngredientFurnizor[] = ale.map(i => {
      const ps = [...i.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
      const ultim = ps[ps.length - 1];
      const prec = ps.length > 1 ? ps[ps.length - 2] : null;
      const c = cons.get(i.cod);
      const cant = c?.cant ?? 0;
      const alt = state.pretFurnizori
        .filter(o => o.ingredient === i.cod && o.furnizor !== f.cod && o.pret < pretCurent(i))
        .sort((a, b) => a.pret - b.pret)[0];
      return {
        cod: i.cod, nume: i.denumire, um: i.um,
        pret: pretCurent(i), pretAnterior: prec?.pret ?? null,
        variatiePct: prec && prec.pret > 0 ? ((ultim.pret - prec.pret) / prec.pret) * 100 : null,
        dataUltima: ultim.validDeLa,
        cantLunara: cant, cheltuialaLunara: c?.valoare ?? 0, cheltuialaAnuala: (c?.valoare ?? 0) * 12,
        alternativa: alt
          ? {
              furnizor: state.furnizori.find(x => x.cod === alt.furnizor)?.nume ?? alt.furnizor,
              pret: alt.pret, economieLunara: (pretCurent(i) - alt.pret) * cant,
            }
          : null,
      };
    }).sort((a, b) => b.cheltuialaLunara - a.cheltuialaLunara);

    const cheltuialaLunara = ingrediente.reduce((s, i) => s + i.cheltuialaLunara, 0);
    const produse = new Set<string>();
    const memo = new Map<string, number>();
    for (const i of ale) {
      for (const p of ctx.produse.values()) {
        if (consumPerPortie(i.cod, p.cod, 'INSTORE', ctx, memo) > 0 || consumPerPortie(i.cod, p.cod, 'DELIVERY', ctx, memo) > 0) produse.add(p.denumire);
      }
    }

    // impactul unei creșteri generalizate de 5% la acest furnizor
    const schimbari: Schimbare[] = ale
      .filter(i => (cons.get(i.cod)?.cant ?? 0) > 0)
      .map(i => ({ tip: 'PRET_INGREDIENT', ingredient: i.cod, pretNou: +(pretCurent(i) * 1.05).toFixed(4) }));
    let impact = { fcPP: null as number | null, profitLunar: 0 };
    if (schimbari.length) {
      const { ctx: c1, produseNoi, preturiVanzare } = aplicaScenariu(state, schimbari);
      const r = impactRetea(state, ctx, c1, produseNoi, preturiVanzare, lunaSel);
      impact = {
        fcPP: r.dupa.fc != null && r.inainte.fc != null ? r.dupa.fc - r.inainte.fc : null,
        profitLunar: r.dupa.profit - r.inainte.profit,
      };
    }

    const evolutie = ale.flatMap(i => i.preturi.map(p => ({ data: p.validDeLa, pret: p.pret, ingredient: i.denumire })))
      .sort((a, b) => a.data.localeCompare(b.data));

    return {
      cod: f.cod, nume: f.nume, ingrediente,
      cheltuialaLunara, cheltuialaAnuala: cheltuialaLunara * 12,
      shareCost: costMaterialeTotal > 0 ? (cheltuialaLunara / costMaterialeTotal) * 100 : 0,
      produseAfectate: [...produse],
      impactCrestere5: impact,
      economieAlternative: ingrediente.reduce((s, i) => s + (i.alternativa?.economieLunara ?? 0), 0),
      evolutie,
    };
  }).sort((a, b) => b.cheltuialaLunara - a.cheltuialaLunara);
}

// ingredientele care merită renegociate: cheltuială mare, scumpire recentă sau ofertă alternativă
export interface Renegociere { cod: string; nume: string; furnizor: string; cheltuialaAnuala: number; motiv: string; castigLunar: number | null; }

export function deRenegociat(state: AppState, ctx: Ctx, lunaSel: string, max = 5): Renegociere[] {
  const cons = consumuriLuna(state, ctx, lunaSel);
  const rez: Renegociere[] = [];
  for (const [cod, c] of cons) {
    const ing = state.ingrediente.find(i => i.cod === cod);
    if (!ing) continue;
    const fz = state.furnizori.find(f => f.cod === ing.furnizor)?.nume ?? '—';
    const ps = [...ing.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
    const varPct = ps.length > 1 && ps[ps.length - 2].pret > 0
      ? ((ps[ps.length - 1].pret - ps[ps.length - 2].pret) / ps[ps.length - 2].pret) * 100 : 0;
    const alt = state.pretFurnizori.filter(o => o.ingredient === cod && o.pret < pretCurent(ing)).sort((a, b) => a.pret - b.pret)[0];
    const castig = alt ? (pretCurent(ing) - alt.pret) * c.cant : null;
    const motive: string[] = [];
    if (alt) motive.push(`ofertă alternativă la ${fmtLei(alt.pret)} lei/${ing.um} (${state.furnizori.find(f => f.cod === alt.furnizor)?.nume ?? alt.furnizor})`);
    if (varPct >= 3) motive.push(`s-a scumpit cu ${fmtPct(varPct)} recent`);
    if (c.valoare >= 1000) motive.push(`cheltuială mare: ${fmtInt(c.valoare)} lei/lună`);
    if (!motive.length) continue;
    rez.push({
      cod, nume: ing.denumire, furnizor: fz, cheltuialaAnuala: c.valoare * 12,
      motiv: motive.join('; ') + '.', castigLunar: castig,
    });
  }
  return rez.sort((a, b) => (b.castigLunar ?? 0) - (a.castigLunar ?? 0) || b.cheltuialaAnuala - a.cheltuialaAnuala).slice(0, max);
}
