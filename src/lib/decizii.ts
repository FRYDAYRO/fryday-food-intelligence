// Decision Intelligence Engine — transformă agregatele în decizii explicate.
// Toate funcțiile sunt pure și lucrează pe copii ale modelului: nimic nu modifică datele reale.
import type { AppState, Canal, Ingredient, LinieReteta, Schimbare } from './types';
import {
  buildCtx, cantBruta, consumuriLuna, costLinieLa, costLunar, costProdus,
  fcPerioada, kpiProdus, lunaPrec, menuEngineering, perProdus, pretCurent, pretLa, recomandari,
  utilizariIngredient, versiuneActiva, volumeLuna, aplicaScenariu, impactRetea,
  fmtInt, fmtLei, fmtPP, fmtPct, luna as lunaDin,
  type Ctx, type RandProdus, type Recomandare,
} from './engine';

// ————————————————————————————————————————————— utilitare comune

export interface ComponentaCost {
  indice: number | null;            // indexul liniei în rețeta activă (null pentru combo)
  cod: string; nume: string;
  tip: LinieReteta['tipComp'] | 'PRODUS';
  cant: number; um: string;
  cost: number; share: number;      // lei/porție și % din costul porției
  esential: boolean;                // sub 3% din cost = candidat de eliminare
}

export function componenteCost(cod: string, ctx: Ctx, canal: Canal = 'INSTORE'): ComponentaCost[] {
  const nume = (c: string) => ctx.ingrediente.get(c)?.denumire ?? ctx.retete.get(c)?.denumire ?? ctx.produse.get(c)?.denumire ?? c;
  const total = costProdus(cod, canal, ctx, '9999-12-31')?.total ?? 0;
  const p = ctx.produse.get(cod);
  const r = ctx.retete.get(cod);
  const rez: ComponentaCost[] = [];
  if (r) {
    versiuneActiva(r).linii.forEach((l, i) => {
      if (l.canal !== 'AMBELE' && l.canal !== canal) return;
      const cost = costLinieLa(l, ctx).total;
      rez.push({
        indice: i, cod: l.comp, nume: nume(l.comp), tip: l.tipComp,
        cant: +cantBruta(l).toFixed(3), um: l.um, cost,
        share: total > 0 ? (cost / total) * 100 : 0,
        esential: total > 0 ? cost / total >= 0.03 : true,
      });
    });
  } else if (p?.combo?.length) {
    for (const c of p.combo) {
      const cost = (costProdus(c.cod, canal, ctx, '9999-12-31')?.total ?? 0) * c.cant;
      rez.push({
        indice: null, cod: c.cod, nume: nume(c.cod), tip: 'PRODUS',
        cant: c.cant, um: 'buc', cost,
        share: total > 0 ? (cost / total) * 100 : 0, esential: true,
      });
    }
  }
  return rez.sort((a, b) => b.cost - a.cost);
}

function volume(state: AppState, lunaRef: string, cod: string) {
  const v = volumeLuna(state, lunaRef).get(cod) ?? { bucIn: 0, bucDlv: 0, netIn: 0, netDlv: 0 };
  return { ...v, buc: v.bucIn + v.bucDlv, net: v.netIn + v.netDlv };
}

// impactul lunar al unei schimbări pe un singur produs, la volum constant (exact, fără simulare de rețea)
function impactLunarProdus(state: AppState, ctx0: Ctx, ctx1: Ctx, cod: string, lunaRef: string): number {
  const v = volume(state, lunaRef, cod);
  let d = 0;
  for (const [canal, buc] of [['INSTORE', v.bucIn], ['DELIVERY', v.bucDlv]] as const) {
    if (!buc) continue;
    const a = kpiProdus(cod, canal, ctx0), b = kpiProdus(cod, canal, ctx1);
    if (a?.profit == null || b?.profit == null) continue;
    d += (b.profit - a.profit) * buc;
  }
  return d;
}

const tintaRetea = (state: AppState) => state.tinte.find(t => t.locatie === 'RETEA')?.fcCurat ?? null;

// ————————————————————————————————————————————— 1. Profit Driver Analysis

export type RolDriver = 'MOTOR_PROFIT' | 'MOTOR_MARJA' | 'CONSUMATOR_FC' | 'FRANA';

export interface Driver extends RandProdus {
  mixBuc: number;
  roluri: RolDriver[];
  decalaj: number;                  // mixCost − contribuție (pp): pozitiv = consumă mai mult decât aduce
  dominanta: ComponentaCost | null;
  cauza: string;
}

export interface RezultatDriveri {
  randuri: Driver[];
  marjaMedie: number; fcRetea: number | null; tinta: number | null;
  profitTotal: number; costTotal: number;
}

export function driveriProfit(state: AppState, ctx: Ctx, lunaSel: string): RezultatDriveri {
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  const me = menuEngineering(rows);
  const net = rows.reduce((s, r) => s + r.net, 0);
  const profitTotal = rows.reduce((s, r) => s + r.profit, 0);
  const costTotal = rows.reduce((s, r) => s + r.cost, 0);
  const marjaMedie = net > 0 ? (profitTotal / net) * 100 : 0;
  const fcRetea = net > 0 ? (costTotal / net) * 100 : null;
  const tinta = tintaRetea(state);

  const randuri: Driver[] = rows.map(r => {
    const mixBuc = me.randuri.find(x => x.cod === r.cod)?.mixBuc ?? 0;
    const dominanta = componenteCost(r.cod, ctx)[0] ?? null;
    const decalaj = r.mixCost - r.contributie;
    const roluri: RolDriver[] = [];
    if (r.contributie >= 12) roluri.push('MOTOR_PROFIT');
    if (r.marja != null && r.marja >= marjaMedie + 2) roluri.push('MOTOR_MARJA');
    if (r.mixCost >= 12) roluri.push('CONSUMATOR_FC');
    const subMarja = r.marja != null && r.marja <= marjaMedie - 3;
    const pesteTinta = tinta != null && r.fc != null && r.fc > tinta;
    if (decalaj >= 3 || subMarja || (pesteTinta && mixBuc >= 5)) roluri.push('FRANA');

    // ——— cauza: de ce produsul se află în această poziție
    const c: string[] = [];
    if (roluri.includes('MOTOR_PROFIT')) c.push(`aduce ${fmtPct(r.contributie)} din profitul rețelei (${fmtInt(r.profit)} lei/lună) la ${fmtPct(mixBuc)} din bucăți`);
    if (roluri.includes('MOTOR_MARJA')) c.push(`marjă ${fmtPct(r.marja)}, cu ${fmtPP((r.marja ?? 0) - marjaMedie)} peste media rețelei`);
    if (decalaj >= 3) c.push(`consumă ${fmtPct(r.mixCost)} din Food Cost, dar aduce doar ${fmtPct(r.contributie)} din profit — decalaj de ${fmtPP(decalaj)}`);
    else if (roluri.includes('CONSUMATOR_FC')) c.push(`consumă ${fmtPct(r.mixCost)} din Food Cost-ul rețelei (${fmtInt(r.cost)} lei/lună), proporțional cu contribuția`);
    if (pesteTinta) c.push(`FC ${fmtPct(r.fc)}, peste ținta de ${fmtPct(tinta)}`);
    if (subMarja && !roluri.includes('MOTOR_MARJA')) c.push(`marjă ${fmtPct(r.marja)}, sub media de ${fmtPct(marjaMedie)}`);
    if (dominanta && dominanta.share >= 35) c.push(`componenta dominantă: ${dominanta.nume} = ${fmtPct(dominanta.share)} din costul porției (${fmtLei(dominanta.cost)} lei)`);
    if (r.faraReteta) c.push('nu are rețetă — costul nu poate fi calculat');
    if (!c.length) c.push(`profil echilibrat: ${fmtPct(r.mix)} din vânzări, ${fmtPct(r.contributie)} din profit, FC ${fmtPct(r.fc)}`);

    return { ...r, mixBuc, roluri, decalaj, dominanta, cauza: c.join('; ') + '.' };
  }).sort((a, b) => b.profit - a.profit);

  return { randuri, marjaMedie, fcRetea, tinta, profitTotal, costTotal };
}

// ————————————————————————————————————————————— 2. Ingredient Impact Network

export interface NodGraf { id: string; nume: string; tip: 'INGREDIENT' | 'SEMIPREPARAT' | 'PRODUS' | 'COMBO'; nivel: number; }
export interface MuchieGraf { de: string; la: string; eticheta: string; }

// graful de dependențe: ingredient → (semipreparate) → produse → meniuri combo
export function grafIngredient(codIng: string, ctx: Ctx): { noduri: NodGraf[]; muchii: MuchieGraf[] } {
  const ing = ctx.ingrediente.get(codIng);
  if (!ing) return { noduri: [], muchii: [] };
  const noduri = new Map<string, NodGraf>();
  const muchii: MuchieGraf[] = [];
  noduri.set(codIng, { id: codIng, nume: ing.denumire, tip: 'INGREDIENT', nivel: 0 });

  const liniiCu = (compCautat: string) => {
    const rez: { reteta: string; linie: LinieReteta }[] = [];
    for (const r of ctx.retete.values()) {
      for (const l of versiuneActiva(r).linii) if (l.comp === compCautat) rez.push({ reteta: r.cod, linie: l });
    }
    return rez;
  };

  // nivel 1: semipreparate care conțin ingredientul; nivel 2: produse; nivel 3: combo
  const produseDirecte = new Set<string>();
  for (const { reteta, linie } of liniiCu(codIng)) {
    const r = ctx.retete.get(reteta)!;
    if (r.tip === 'SEMIPREPARAT') {
      noduri.set(r.cod, { id: r.cod, nume: r.denumire, tip: 'SEMIPREPARAT', nivel: 1 });
      muchii.push({ de: codIng, la: r.cod, eticheta: `${+cantBruta(linie).toFixed(2)} ${linie.um}` });
      for (const { reteta: rp, linie: lp } of liniiCu(r.cod)) {
        const rr = ctx.retete.get(rp)!;
        if (rr.tip !== 'PRODUS') continue;
        noduri.set(rr.cod, { id: rr.cod, nume: rr.denumire, tip: 'PRODUS', nivel: 2 });
        muchii.push({ de: r.cod, la: rr.cod, eticheta: `${+cantBruta(lp).toFixed(2)} ${lp.um}` });
        produseDirecte.add(rr.cod);
      }
    } else {
      noduri.set(r.cod, { id: r.cod, nume: r.denumire, tip: 'PRODUS', nivel: 2 });
      muchii.push({ de: codIng, la: r.cod, eticheta: `${+cantBruta(linie).toFixed(2)} ${linie.um}` });
      produseDirecte.add(r.cod);
    }
  }
  for (const p of ctx.produse.values()) {
    if (!p.combo?.length) continue;
    for (const c of p.combo) {
      if (!produseDirecte.has(c.cod)) continue;
      noduri.set(p.cod, { id: p.cod, nume: p.denumire, tip: 'COMBO', nivel: 3 });
      muchii.push({ de: c.cod, la: p.cod, eticheta: `×${c.cant}` });
    }
  }
  return { noduri: [...noduri.values()], muchii };
}

export interface ImpactProdusIng {
  cod: string; denumire: string; buc: number;
  cost0: number | null; cost1: number | null;
  fc0: number | null; fc1: number | null;
  dLunar: number;                   // Δ profit lei/lună pe acest produs
}

export interface ImpactIngredient {
  pret0: number; pret1: number;
  consum: number; um: string;
  produse: ImpactProdusIng[];
  dFcPP: number | null; dProfitLunar: number; dProfitAnual: number;
  fc0: number | null; fc1: number | null;
}

export function impactIngredient(state: AppState, ctx: Ctx, codIng: string, pretNou: number, lunaSel: string): ImpactIngredient | null {
  const ing = ctx.ingrediente.get(codIng);
  if (!ing) return null;
  const { ctx: ctx1, produseNoi, preturiVanzare } = aplicaScenariu(state, [{ tip: 'PRET_INGREDIENT', ingredient: codIng, pretNou }]);
  const retea = impactRetea(state, ctx, ctx1, produseNoi, preturiVanzare, lunaSel);
  const cons = consumuriLuna(state, ctx, lunaSel).get(codIng);
  const produse: ImpactProdusIng[] = utilizariIngredient(codIng, ctx).map(u => {
    const a = kpiProdus(u.produs, 'INSTORE', ctx), b = kpiProdus(u.produs, 'INSTORE', ctx1);
    return {
      cod: u.produs, denumire: u.denumire, buc: volume(state, lunaSel, u.produs).buc,
      cost0: a?.cost?.total ?? null, cost1: b?.cost?.total ?? null,
      fc0: a?.fc ?? null, fc1: b?.fc ?? null,
      dLunar: impactLunarProdus(state, ctx, ctx1, u.produs, lunaSel),
    };
  }).sort((a, b) => a.dLunar - b.dLunar);
  const dProfit = retea.dupa.profit - retea.inainte.profit;
  return {
    pret0: pretCurent(ing), pret1: pretNou,
    consum: cons?.cant ?? 0, um: ing.um, produse,
    dFcPP: retea.dupa.fc != null && retea.inainte.fc != null ? retea.dupa.fc - retea.inainte.fc : null,
    dProfitLunar: dProfit, dProfitAnual: dProfit * 12,
    fc0: retea.inainte.fc, fc1: retea.dupa.fc,
  };
}

// ————————————————————————————————————————————— 3. Menu Optimization Engine

export type CategMenu = 'FC_MARE' | 'PROFIT_MIC' | 'PROFITABIL_NEPROMOVAT' | 'VOLUM_MARE_MARJA_MICA' | 'REFORMULARE' | 'ELIMINARE';

export const CATEG_MENU_LABEL: Record<CategMenu, string> = {
  FC_MARE: 'Food Cost prea mare',
  PROFIT_MIC: 'Profit mic',
  PROFITABIL_NEPROMOVAT: 'Profitabil, slab promovat',
  VOLUM_MARE_MARJA_MICA: 'Vânzări mari, marjă mică',
  REFORMULARE: 'Candidat pentru reformulare',
  ELIMINARE: 'Candidat pentru eliminare',
};

export interface RandOptimMenu {
  cod: string; denumire: string;
  categorii: CategMenu[];
  fc: number | null; marja: number | null; profit: number; contributie: number; mixBuc: number;
  diagnostic: string; actiune: string;
  impactLunar: number | null;       // câștigul estimat lei/lună dacă acțiunea se aplică
  impactAnual: number | null;
}

export function optimizariMeniu(state: AppState, ctx: Ctx, lunaSel: string): RandOptimMenu[] {
  const dr = driveriProfit(state, ctx, lunaSel);
  const tinta = dr.tinta;
  const rez: RandOptimMenu[] = [];

  for (const r of dr.randuri) {
    if (r.buc === 0) continue;
    const categorii: CategMenu[] = [];
    const pesteTinta = tinta != null && r.fc != null && r.fc > tinta;
    const marjaMica = r.marja != null && r.marja <= dr.marjaMedie - 3;
    const popular = r.mixBuc >= 10;
    const profitMic = r.contributie < 3;

    if (pesteTinta) categorii.push('FC_MARE');
    if (profitMic) categorii.push('PROFIT_MIC');
    if (r.marja != null && r.marja >= dr.marjaMedie + 2 && r.mixBuc < 8) categorii.push('PROFITABIL_NEPROMOVAT');
    if (popular && marjaMica) categorii.push('VOLUM_MARE_MARJA_MICA');
    if (pesteTinta && (popular || r.decalaj >= 3)) categorii.push('REFORMULARE');
    if (profitMic && marjaMica && !popular) categorii.push('ELIMINARE');
    if (!categorii.length) continue;

    // ——— acțiunea recomandată + impactul, calculat pe scenariul corespunzător
    let actiune = '', impactLunar: number | null = null;
    const dom = r.dominanta;
    if (categorii.includes('REFORMULARE') || categorii.includes('FC_MARE')) {
      const linie = componenteCost(r.cod, ctx).find(c => c.indice != null && c.tip !== 'AMBALAJ' && (c.um === 'g' || c.um === 'ml') && c.cant >= 20);
      if (linie && linie.indice != null) {
        const ret = ctx.retete.get(r.cod)!;
        const cantAct = versiuneActiva(ret).linii[linie.indice].cant;
        const cantNoua = Math.round(cantAct * 0.9);
        const { ctx: c1 } = aplicaScenariu(state, [{ tip: 'GRAMAJ', reteta: r.cod, linie: linie.indice, cantNoua }]);
        impactLunar = impactLunarProdus(state, ctx, c1, r.cod, lunaSel);
        actiune = `Reformulare: ${linie.nume} ${cantAct} → ${cantNoua} ${linie.um} (−10%)`;
      } else if (tinta != null && r.fc != null) {
        const p = ctx.produse.get(r.cod);
        const k = kpiProdus(r.cod, 'INSTORE', ctx);
        if (p?.pretInstore && k?.cost) {
          const brutTinta = (k.cost.total / (tinta / 100)) * (1 + p.tva / 100);
          const pretNou = +Math.min(brutTinta, p.pretInstore * 1.1).toFixed(1);
          const { ctx: c1 } = aplicaScenariu(state, [{ tip: 'PRET_VANZARE', produs: r.cod, canal: 'INSTORE', pretNou }]);
          impactLunar = impactLunarProdus(state, ctx, c1, r.cod, lunaSel);
          actiune = `Ajustare preț InStore ${fmtLei(p.pretInstore)} → ${fmtLei(pretNou)} lei`;
        }
      }
    } else if (categorii.includes('VOLUM_MARE_MARJA_MICA')) {
      const p = ctx.produse.get(r.cod);
      if (p?.pretInstore) {
        const pretNou = +(Math.round(p.pretInstore * 1.05 * 10) / 10).toFixed(1);
        const { ctx: c1 } = aplicaScenariu(state, [{ tip: 'PRET_VANZARE', produs: r.cod, canal: 'INSTORE', pretNou }]);
        impactLunar = impactLunarProdus(state, ctx, c1, r.cod, lunaSel);
        actiune = `Creștere de preț +5% (${fmtLei(p.pretInstore)} → ${fmtLei(pretNou)} lei InStore)`;
      }
    } else if (categorii.includes('PROFITABIL_NEPROMOVAT')) {
      impactLunar = r.profit * 0.15;
      actiune = 'Promovare: poziționare în meniu, bundling, recomandare la casă (+15% volum)';
    } else if (categorii.includes('ELIMINARE')) {
      impactLunar = null;
      actiune = `Analiză pentru eliminare — profitul pierdut ar fi ${fmtInt(r.profit)} lei/lună, dar eliberează spațiu în meniu și SKU-uri`;
    } else {
      actiune = 'Analiză de contribuție: preț, gramaj sau repoziționare în meniu';
    }

    const diag: string[] = [];
    if (pesteTinta) diag.push(`FC ${fmtPct(r.fc)} vs ținta ${fmtPct(tinta)}`);
    if (marjaMica) diag.push(`marjă ${fmtPct(r.marja)} sub media de ${fmtPct(dr.marjaMedie)}`);
    if (profitMic) diag.push(`doar ${fmtPct(r.contributie)} din profit`);
    if (popular) diag.push(`volum mare (${fmtPct(r.mixBuc)} din bucăți)`);
    if (r.decalaj >= 3) diag.push(`decalaj cost/profit ${fmtPP(r.decalaj)}`);
    if (dom && dom.share >= 35) diag.push(`${dom.nume} = ${fmtPct(dom.share)} din cost`);

    rez.push({
      cod: r.cod, denumire: r.denumire, categorii,
      fc: r.fc, marja: r.marja, profit: r.profit, contributie: r.contributie, mixBuc: r.mixBuc,
      diagnostic: diag.join(' · '), actiune,
      impactLunar, impactAnual: impactLunar != null ? impactLunar * 12 : null,
    });
  }
  return rez.sort((a, b) => (b.impactLunar ?? -Infinity) - (a.impactLunar ?? -Infinity));
}

// ————————————————————————————————————————————— 4. Dynamic Pricing Simulator

export interface PasPret {
  variatiePct: number; pretBrut: number; pretNet: number;
  fc: number | null; profitUnitar: number | null; marja: number | null;
  profitLunar: number; dProfitLunar: number; dProfitAnual: number;
  curent: boolean;
}

export function scaraPret(state: AppState, ctx: Ctx, cod: string, canal: Canal, lunaSel: string,
  variatii = [-10, -5, 0, 5, 10, 15, 20]): { pasi: PasPret[]; pretTinta: number | null; buc: number } | null {
  const p = ctx.produse.get(cod);
  if (!p) return null;
  const brut = canal === 'INSTORE' ? p.pretInstore : p.pretDelivery;
  const k0 = kpiProdus(cod, canal, ctx);
  if (!brut || !k0?.cost) return null;
  const v = volume(state, lunaSel, cod);
  const buc = canal === 'INSTORE' ? v.bucIn : v.bucDlv;
  const cost = k0.cost.total;
  const profit0 = (k0.profit ?? 0) * buc;

  const pasi: PasPret[] = variatii.map(x => {
    const pretBrut = +(Math.round(brut * (1 + x / 100) * 10) / 10).toFixed(2);
    const pretNet = pretBrut / (1 + p.tva / 100);
    const profitUnitar = pretNet - cost;
    const profitLunar = profitUnitar * buc;
    return {
      variatiePct: x, pretBrut, pretNet,
      fc: pretNet > 0 ? (cost / pretNet) * 100 : null,
      profitUnitar, marja: pretNet > 0 ? (profitUnitar / pretNet) * 100 : null,
      profitLunar, dProfitLunar: profitLunar - profit0, dProfitAnual: (profitLunar - profit0) * 12,
      curent: x === 0,
    };
  });
  const tinta = tintaRetea(state);
  const pretTinta = tinta != null ? +((cost / (tinta / 100)) * (1 + p.tva / 100)).toFixed(2) : null;
  return { pasi, pretTinta, buc };
}

// ————————————————————————————————————————————— 5. Recipe Optimization Engine

export interface ScenariuReteta {
  id: string; tip: 'GRAMAJ' | 'SURSA' | 'ELIMINARE';
  titlu: string; motiv: string;
  costNou: number | null; fcNou: number | null;
  dCostPortie: number; dProfitLunar: number; dProfitAnual: number;
  schimbare: Schimbare;
}

export function optimizariReteta(state: AppState, ctx: Ctx, cod: string, lunaSel: string): { componente: ComponentaCost[]; scenarii: ScenariuReteta[] } {
  const componente = componenteCost(cod, ctx);
  const ret = ctx.retete.get(cod);
  if (!ret) return { componente, scenarii: [] };
  const k0 = kpiProdus(cod, 'INSTORE', ctx);
  const cost0 = k0?.cost?.total ?? 0;
  const linii = versiuneActiva(ret).linii;
  const scenarii: ScenariuReteta[] = [];

  const evalueaza = (id: string, tip: ScenariuReteta['tip'], titlu: string, motiv: string, schimbare: Schimbare) => {
    const { ctx: c1 } = aplicaScenariu(state, [schimbare]);
    const k1 = kpiProdus(cod, 'INSTORE', c1);
    const costNou = k1?.cost?.total ?? null;
    scenarii.push({
      id, tip, titlu, motiv, costNou, fcNou: k1?.fc ?? null,
      dCostPortie: (costNou ?? 0) - cost0,
      dProfitLunar: impactLunarProdus(state, ctx, c1, cod, lunaSel),
      dProfitAnual: impactLunarProdus(state, ctx, c1, cod, lunaSel) * 12,
      schimbare,
    });
  };

  // a) reducere de gramaj pe cele mai scumpe linii cântărite
  for (const c of componente.filter(x => x.indice != null && x.tip !== 'AMBALAJ' && (x.um === 'g' || x.um === 'ml') && x.cant >= 20).slice(0, 3)) {
    const cantAct = linii[c.indice!].cant;
    for (const pct of [5, 10]) {
      const cantNoua = Math.round(cantAct * (1 - pct / 100));
      if (cantNoua <= 0 || cantNoua === cantAct) continue;
      evalueaza(`gram-${c.indice}-${pct}`, 'GRAMAJ',
        `${c.nume}: ${cantAct} → ${cantNoua} ${c.um} (−${pct}%)`,
        `${fmtPct(c.share)} din costul porției (${fmtLei(c.cost)} lei) — cea mai eficientă pârghie de cost.`,
        { tip: 'GRAMAJ', reteta: cod, linie: c.indice!, cantNoua });
    }
  }

  // b) sursă alternativă pentru ingredientele din rețetă (inclusiv prin semipreparate)
  const codsIng = new Set<string>();
  const adauga = (r: string) => {
    for (const l of versiuneActiva(ctx.retete.get(r)!).linii) {
      if (l.tipComp === 'SEMIPREPARAT' && ctx.retete.has(l.comp)) adauga(l.comp);
      else codsIng.add(l.comp);
    }
  };
  adauga(cod);
  for (const o of state.pretFurnizori) {
    if (!codsIng.has(o.ingredient)) continue;
    const ing = ctx.ingrediente.get(o.ingredient);
    if (!ing) continue;
    const pc = pretCurent(ing);
    if (pc <= 0 || o.pret >= pc * 0.97) continue;
    const fz = state.furnizori.find(f => f.cod === o.furnizor)?.nume ?? o.furnizor;
    evalueaza(`sursa-${o.ingredient}-${o.furnizor}`, 'SURSA',
      `${ing.denumire}: sursă alternativă ${fz} (${fmtLei(o.pret)} vs ${fmtLei(pc)} lei/${ing.um})`,
      `Ofertă cu ${fmtPct(((pc - o.pret) / pc) * 100)} mai ieftină, fără schimbarea rețetei — doar a furnizorului.`,
      { tip: 'FURNIZOR', ingredient: o.ingredient, furnizorNou: o.furnizor, pretNou: o.pret });
  }

  // c) eliminarea liniilor neesențiale (sub 3% din cost, non-ambalaj)
  for (const c of componente.filter(x => x.indice != null && !x.esential && x.tip !== 'AMBALAJ').slice(0, 2)) {
    evalueaza(`elim-${c.indice}`, 'ELIMINARE',
      `Elimină ${c.nume} (${c.cant} ${c.um})`,
      `Doar ${fmtPct(c.share)} din costul porției — verifică impactul senzorial înainte de decizie.`,
      { tip: 'ELIMINA_LINIE', reteta: cod, linie: c.indice! });
  }

  return { componente, scenarii: scenarii.sort((a, b) => b.dProfitLunar - a.dProfitLunar) };
}

// ————————————————————————————————————————————— 6. Product Lifecycle

export type Etapa = 'LANSARE' | 'CRESTERE' | 'MATURITATE' | 'DECLIN';

export const ETAPA_LABEL: Record<Etapa, string> = {
  LANSARE: 'Lansare', CRESTERE: 'Creștere', MATURITATE: 'Maturitate', DECLIN: 'Declin',
};

export interface CicluViata {
  cod: string; denumire: string; etapa: Etapa;
  primaVanzare: string; zile: number;
  bucRecent: number; bucAnterior: number; trendPct: number | null;
  varf: number; procentDinVarf: number | null;
  marja: number | null; contributie: number;
  dovada: string; recomandare: string;
}

export function cicluViata(state: AppState, ctx: Ctx, lunaSel: string): CicluViata[] {
  if (!state.vanzari.length) return [];
  const maxData = state.vanzari.reduce((m, v) => (v.data > m ? v.data : m), state.vanzari[0].data);
  const zi = (d: string) => Math.round((new Date(maxData + 'T00:00:00Z').getTime() - new Date(d + 'T00:00:00Z').getTime()) / 86400000);
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });

  const perZi = new Map<string, Map<string, number>>();
  const prima = new Map<string, string>();
  for (const v of state.vanzari) {
    const m = perZi.get(v.produs) ?? new Map<string, number>();
    m.set(v.data, (m.get(v.data) ?? 0) + v.cant);
    perZi.set(v.produs, m);
    const p = prima.get(v.produs);
    if (!p || v.data < p) prima.set(v.produs, v.data);
  }

  const rez: CicluViata[] = [];
  for (const [cod, zile] of perZi) {
    const p = ctx.produse.get(cod);
    const r = rows.find(x => x.cod === cod);
    let recent = 0, anterior = 0;
    const serie = [...zile.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [d, buc] of serie) {
      const v = zi(d);
      if (v < 14) recent += buc;
      else if (v < 28) anterior += buc;
    }
    // vârful istoric = cea mai bună fereastră de 14 zile
    let varf = 0;
    for (let i = 0; i < serie.length; i++) {
      let s = 0;
      const start = new Date(serie[i][0] + 'T00:00:00Z').getTime();
      for (let j = i; j < serie.length; j++) {
        if (new Date(serie[j][0] + 'T00:00:00Z').getTime() - start >= 14 * 86400000) break;
        s += serie[j][1];
      }
      if (s > varf) varf = s;
    }
    const trendPct = anterior > 0 ? ((recent - anterior) / anterior) * 100 : null;
    const procentDinVarf = varf > 0 ? (recent / varf) * 100 : null;
    const primaV = prima.get(cod)!;
    const vechime = zi(primaV);

    let etapa: Etapa;
    if (vechime <= 42) etapa = 'LANSARE';
    else if (trendPct != null && trendPct >= 8) etapa = 'CRESTERE';
    else if ((trendPct != null && trendPct <= -8) || (procentDinVarf != null && procentDinVarf < 75)) etapa = 'DECLIN';
    else etapa = 'MATURITATE';

    const dovada = `${fmtInt(recent)} buc în ultimele 14 zile vs ${fmtInt(anterior)} buc în cele 14 anterioare`
      + (trendPct != null ? ` (${trendPct >= 0 ? '+' : ''}${fmtPct(trendPct)})` : '')
      + (procentDinVarf != null ? `, ${fmtPct(procentDinVarf)} din vârful istoric` : '')
      + `; prima vânzare ${primaV} (${vechime} zile).`;

    const recomandare =
      etapa === 'LANSARE' ? 'Monitorizează săptămânal FC și marja; produsul nu are încă mix stabil — nu trage concluzii de profitabilitate înainte de 6 săptămâni.'
      : etapa === 'CRESTERE' ? 'Susține creșterea: stoc și disponibilitate, vizibilitate în meniu; blochează costul ingredientelor-cheie prin contracte.'
      : etapa === 'DECLIN' ? (r && r.contributie < 3
          ? 'Declin cu contribuție mică: candidat pentru eliminare sau reformulare completă în R&D Lab.'
          : 'Declin pe un produs important: testează relansare (promoție, reformulare, repoziționare de preț) înainte de a reduce vizibilitatea.')
      : (r && r.marja != null && r.marja >= 0 ? 'Maturitate: protejează marja — optimizări de cost și furnizori, nu investiții de promovare.' : 'Maturitate: verifică marja și costul rețetei.');

    rez.push({
      cod, denumire: p?.denumire ?? cod, etapa,
      primaVanzare: primaV, zile: vechime,
      bucRecent: recent, bucAnterior: anterior, trendPct, varf, procentDinVarf,
      marja: r?.marja ?? null, contributie: r?.contributie ?? 0,
      dovada, recomandare,
    });
  }
  const ordine: Record<Etapa, number> = { DECLIN: 0, LANSARE: 1, CRESTERE: 2, MATURITATE: 3 };
  return rez.sort((a, b) => ordine[a.etapa] - ordine[b.etapa] || b.contributie - a.contributie);
}

// ————————————————————————————————————————————— 7. Opportunity Finder

export type CategOportunitate = 'FOOD_COST' | 'PROFIT' | 'MENIU' | 'INGREDIENT' | 'PROMOVARE' | 'ANALIZA';

export interface Oportunitate {
  id: string; categorie: CategOportunitate;
  titlu: string; detaliu: string;
  impactLunar: number | null; impactAnual: number | null;
  unde: string;                     // modulul în care se execută
}

export function oportunitati(state: AppState, ctx: Ctx, lunaSel: string, max = 14): Oportunitate[] {
  const rez: Oportunitate[] = [];
  const vazute = new Set<string>();
  const adauga = (o: Oportunitate) => { if (!vazute.has(o.id)) { vazute.add(o.id); rez.push(o); } };

  const catRec: Record<Recomandare['tip'], CategOportunitate> = {
    PRET: 'PROFIT', GRAMAJ: 'FOOD_COST', FURNIZOR: 'INGREDIENT', PROMOVEAZA: 'PROMOVARE', ANALIZEAZA: 'ANALIZA',
  };
  for (const r of recomandari(state, ctx, lunaSel, 12)) {
    adauga({
      id: `rec-${r.id}`, categorie: catRec[r.tip], titlu: r.titlu,
      detaliu: `${r.motiv} ${r.detaliu}`,
      impactLunar: r.impactProfitLunar, impactAnual: r.impactProfitLunar != null ? r.impactProfitLunar * 12 : null,
      unde: r.tip === 'FURNIZOR' ? 'Product Impact → Schimbare furnizor' : r.tip === 'GRAMAJ' ? 'Decision Intelligence → Recipe Optimization' : r.tip === 'PRET' ? 'Product Impact → Dynamic Pricing' : 'Menu Engineering',
    });
  }

  for (const m of optimizariMeniu(state, ctx, lunaSel).slice(0, 8)) {
    adauga({
      id: `menu-${m.cod}`, categorie: m.categorii.includes('ELIMINARE') || m.categorii.includes('PROFIT_MIC') ? 'MENIU' : 'FOOD_COST',
      titlu: `${m.denumire}: ${m.actiune}`,
      detaliu: `${m.diagnostic}. Categorii: ${m.categorii.map(c => CATEG_MENU_LABEL[c]).join(', ')}.`,
      impactLunar: m.impactLunar, impactAnual: m.impactAnual,
      unde: 'Decision Intelligence → Menu Optimization',
    });
  }

  // ingrediente cu cheltuială mare și ofertă alternativă — renegociere sau schimbare de sursă
  const consOp = consumuriLuna(state, ctx, lunaSel);
  const scumpe = [...consOp.entries()].map(([cod, c]) => ({ cod, c, ing: state.ingrediente.find(i => i.cod === cod) }))
    .filter(x => x.ing && x.c.valoare >= 500).sort((a, b) => b.c.valoare - a.c.valoare).slice(0, 3);
  for (const s of scumpe) {
    const alt = state.pretFurnizori.filter(o => o.ingredient === s.cod && o.pret < pretCurent(s.ing!)).sort((a, b) => a.pret - b.pret)[0];
    const castig = alt ? (pretCurent(s.ing!) - alt.pret) * s.c.cant : null;
    adauga({
      id: `ing-${s.cod}`, categorie: 'INGREDIENT',
      titlu: alt
        ? `${s.ing!.denumire}: renegociere sau mutare pe oferta de ${fmtLei(alt.pret)} lei/${s.ing!.um}`
        : `${s.ing!.denumire}: renegociere de preț (fără ofertă alternativă în sistem)`,
      detaliu: `Cheltuială ${fmtInt(s.c.valoare)} lei/lună (${fmtInt(s.c.valoare * 12)} lei/an), ${s.c.cant.toFixed(1)} ${s.c.um} consumate. `
        + `Fiecare leu economisit pe ${s.ing!.um} aduce ${fmtInt(s.c.cant)} lei/lună la nivel de rețea.`,
      impactLunar: castig, impactAnual: castig != null ? castig * 12 : null,
      unde: 'Supplier Intelligence',
    });
  }

  for (const c of cicluViata(state, ctx, lunaSel).filter(x => x.etapa === 'DECLIN').slice(0, 3)) {
    adauga({
      id: `ciclu-${c.cod}`, categorie: 'ANALIZA',
      titlu: `${c.denumire}: vânzări în declin — decizie de relansare sau retragere`,
      detaliu: `${c.dovada} ${c.recomandare}`,
      impactLunar: null, impactAnual: null,
      unde: 'Decision Intelligence → Product Lifecycle',
    });
  }

  return rez.sort((a, b) => (b.impactLunar ?? -1) - (a.impactLunar ?? -1)).slice(0, max);
}

// ————————————————————————————————————————————— 8. Executive AI Narrative (motor pe reguli)

export interface CauzaFC { eticheta: string; pp: number; lei: number; }

export interface Narativ {
  luna: string; lunaPrec: string;
  fcAcum: number | null; fcInainte: number | null; deltaPP: number | null;
  efectPreturiPP: number; efectMixPP: number;
  cauze: CauzaFC[];
  paragrafe: string[];
  potentialPP: number; potentialLei: number;
}

// starea cu prețurile „îngheţate" înainte de luna analizată — pentru a separa efectul de preț de cel de mix
function statePreturiInainte(state: AppState, lunaSel: string): AppState {
  const prag = `${lunaSel}-01`;
  return {
    ...state,
    ingrediente: state.ingrediente.map((i): Ingredient => {
      const inainte = i.preturi.filter(p => p.validDeLa < prag);
      return inainte.length === i.preturi.length ? i : { ...i, preturi: inainte.length ? inainte : i.preturi.slice(0, 1) };
    }),
  };
}

export function narativExecutiv(state: AppState, ctx: Ctx, lunaSel: string): Narativ {
  const prec = lunaPrec(lunaSel);
  const acum = fcPerioada(state, ctx, lunaSel, 'RETEA');
  const inainte = fcPerioada(state, ctx, prec, 'RETEA');
  const fcAcum = acum.fcCurat ?? acum.fcTeoretic;
  const fcInainte = inainte.fcCurat ?? inainte.fcTeoretic;
  const deltaPP = fcAcum != null && fcInainte != null ? fcAcum - fcInainte : null;

  // efectul prețurilor: același mix, prețurile de dinainte de luna analizată
  const stateVechi = statePreturiInainte(state, lunaSel);
  const costAcum = costLunar(state, ctx, lunaSel);
  const costLaPreturiVechi = costLunar(stateVechi, buildCtx(stateVechi), lunaSel);
  const efectPreturiLei = costAcum.cost - costLaPreturiVechi.cost;
  const efectPreturiPP = costAcum.net > 0 ? (efectPreturiLei / costAcum.net) * 100 : 0;
  const deltaTeoreticPP = acum.fcTeoretic != null && inainte.fcTeoretic != null ? acum.fcTeoretic - inainte.fcTeoretic : 0;
  const efectMixPP = deltaTeoreticPP - efectPreturiPP;

  // cauzele pe ingrediente: Δpreț în luna analizată × consumul real
  const cons = consumuriLuna(state, ctx, lunaSel);
  // ultima zi înainte de luna analizată: prețul „de referință" al lunii precedente
  const zeroLuna = new Date(`${lunaSel}-01T00:00:00Z`);
  zeroLuna.setUTCDate(zeroLuna.getUTCDate() - 1);
  const inainteData = zeroLuna.toISOString().slice(0, 10);
  const cauze: CauzaFC[] = [];
  for (const ing of state.ingrediente) {
    const c = cons.get(ing.cod);
    if (!c) continue;
    const acumPret = pretCurent(ing);
    const vechiPret = pretLa(ing, inainteData) || acumPret;
    if (Math.abs(acumPret - vechiPret) < 1e-9) continue;
    const lei = (acumPret - vechiPret) * c.cant;
    cauze.push({
      eticheta: `${ing.denumire} ${fmtLei(vechiPret)} → ${fmtLei(acumPret)} lei/${ing.um}`,
      lei, pp: costAcum.net > 0 ? (lei / costAcum.net) * 100 : 0,
    });
  }
  cauze.sort((a, b) => Math.abs(b.lei) - Math.abs(a.lei));

  // produsul cu cea mai mare scădere de marjă lună/lună
  const rAcum = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  const rPrec = perProdus(state.vanzari, ctx, { luna: prec, vedere: 'TOTAL' });
  let scadere: { nume: string; dMarja: number; dProfit: number } | null = null;
  for (const r of rAcum) {
    const p = rPrec.find(x => x.cod === r.cod);
    if (!p || r.marja == null || p.marja == null) continue;
    const d = r.marja - p.marja;
    if (d < -0.2 && (!scadere || d < scadere.dMarja)) scadere = { nume: r.denumire, dMarja: d, dProfit: r.profit - p.profit };
  }

  // potențialul de optimizare: top oportunități cu impact pozitiv
  const opt = oportunitati(state, ctx, lunaSel, 6).filter(o => (o.impactLunar ?? 0) > 0);
  const top2 = opt.slice(0, 2);
  const potentialLei = top2.reduce((s, o) => s + (o.impactLunar ?? 0), 0);
  const potentialPP = costAcum.net > 0 ? (potentialLei / costAcum.net) * 100 : 0;

  // ——— textul
  const paragrafe: string[] = [];
  const dir = deltaPP == null ? null : deltaPP > 0.05 ? 'a crescut' : deltaPP < -0.05 ? 'a scăzut' : 'a rămas stabil';
  if (deltaPP != null && dir) {
    paragrafe.push(
      `Food Cost ${dir}${Math.abs(deltaPP) >= 0.05 ? ` cu ${fmtPP(Math.abs(deltaPP))}` : ''} față de ${prec}: ${fmtPct(fcInainte)} → ${fmtPct(fcAcum)}`
      + (acum.tinta != null ? `, față de o țintă de ${fmtPct(acum.tinta)} (${fcAcum != null && fcAcum <= acum.tinta ? 'în target' : `depășire de ${fmtPP((fcAcum ?? 0) - acum.tinta)}`})` : '') + '.'
    );
  } else {
    paragrafe.push(`Food Cost în ${lunaSel}: ${fmtPct(fcAcum)}${acum.tinta != null ? `, țintă ${fmtPct(acum.tinta)}` : ''}. Fără lună de referință completă pentru comparație.`);
  }

  const bucati: string[] = [];
  if (cauze.length) {
    const c0 = cauze[0];
    bucati.push(`principala cauză este ${c0.lei > 0 ? 'creșterea' : 'scăderea'} costului la ${c0.eticheta}, care mișcă Food Cost-ul cu ${fmtPP(c0.pp)} (${c0.lei > 0 ? '+' : ''}${fmtInt(c0.lei)} lei/lună la consumul actual)`);
    if (cauze.length > 1) bucati.push(`urmată de ${cauze[1].eticheta} (${fmtPP(cauze[1].pp)})`);
  }
  if (scadere) bucati.push(`la care se adaugă scăderea marjei produsului ${scadere.nume} (${fmtPP(scadere.dMarja)}, ${fmtInt(scadere.dProfit)} lei profit)`);
  if (bucati.length) paragrafe.push(bucati.join(', ') + '.');

  paragrafe.push(
    `Descompunerea variației teoretice: efectul prețurilor de achiziție ${fmtPP(efectPreturiPP)} (${efectPreturiLei >= 0 ? '+' : ''}${fmtInt(efectPreturiLei)} lei), efectul mixului de vânzări ${fmtPP(efectMixPP)}.`
    + (Math.abs(efectPreturiPP) > Math.abs(efectMixPP)
      ? ' Presiunea vine din achiziții, deci pârghia principală este renegocierea sau schimbarea sursei.'
      : ' Presiunea vine din mixul vândut, deci pârghia principală este meniul: preț, vizibilitate și reformulare.')
  );

  if (top2.length) {
    paragrafe.push(
      `Optimizarea ${top2.map(o => `„${o.titlu}"`).join(' și ')} ar aduce aproximativ ${fmtInt(potentialLei)} lei/lună `
      + `(${fmtInt(potentialLei * 12)} lei/an), echivalentul unei reduceri de Food Cost de ${fmtPct(potentialPP)}.`
    );
  }

  return { luna: lunaSel, lunaPrec: prec, fcAcum, fcInainte, deltaPP, efectPreturiPP, efectMixPP, cauze, paragrafe, potentialPP, potentialLei };
}

// ————————————————————————————————————————————— 9. Executive Cockpit — răspunsuri directe

export interface Raspuns { intrebare: string; raspuns: string; detaliu: string; impact: string; unde: string; }

export function cockpit(state: AppState, ctx: Ctx, lunaSel: string): { raspunsuri: Raspuns[]; narativ: Narativ } {
  const narativ = narativExecutiv(state, ctx, lunaSel);
  const dr = driveriProfit(state, ctx, lunaSel);
  const optim = optimizariMeniu(state, ctx, lunaSel);
  const cons = consumuriLuna(state, ctx, lunaSel);
  const cicluri = cicluViata(state, ctx, lunaSel);

  const frane = dr.randuri.filter(r => r.roluri.includes('FRANA')).sort((a, b) => b.decalaj - a.decalaj);
  const motor = dr.randuri[0] ?? null;
  const marjaTop = [...dr.randuri].filter(r => r.marja != null && r.buc > 0).sort((a, b) => (b.marja ?? 0) - (a.marja ?? 0))[0] ?? null;
  const ingTop = [...cons.entries()].map(([cod, c]) => ({ cod, ...c, nume: state.ingrediente.find(i => i.cod === cod)?.denumire ?? cod }))
    .sort((a, b) => b.valoare - a.valoare)[0] ?? null;
  const deModificat = optim.find(o => o.categorii.includes('REFORMULARE') || o.categorii.includes('FC_MARE')) ?? optim[0] ?? null;
  const dePromovat = optim.find(o => o.categorii.includes('PROFITABIL_NEPROMOVAT'))
    ?? (marjaTop ? { denumire: marjaTop.denumire, actiune: 'Promovare — marja cea mai mare din meniu', impactLunar: marjaTop.profit * 0.15, diagnostic: `marjă ${fmtPct(marjaTop.marja)}` } as RandOptimMenu : null);
  const consumatorFC = [...dr.randuri].sort((a, b) => b.mixCost - a.mixCost)[0] ?? null;
  const opp = oportunitati(state, ctx, lunaSel, 8);
  const oppTop = opp.find(o => (o.impactLunar ?? 0) > 0) ?? null;
  // ingredientele de renegociat: ofertă alternativă mai bună sau scumpire recentă, ponderate cu consumul
  const renegocieri = [...cons.entries()].map(([cod, c]) => {
    const ing = state.ingrediente.find(i => i.cod === cod);
    if (!ing) return null;
    const alt = state.pretFurnizori.filter(o => o.ingredient === cod && o.pret < pretCurent(ing)).sort((a, b) => a.pret - b.pret)[0];
    const ps = [...ing.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
    const varPct = ps.length > 1 && ps[ps.length - 2].pret > 0 ? ((ps[ps.length - 1].pret - ps[ps.length - 2].pret) / ps[ps.length - 2].pret) * 100 : 0;
    const castig = alt ? (pretCurent(ing) - alt.pret) * c.cant : 0;
    if (castig <= 0 && varPct < 3) return null;
    return { ing, c, alt, varPct, castig };
  }).filter(Boolean).sort((a, b) => b!.castig - a!.castig || b!.c.valoare - a!.c.valoare) as { ing: typeof state.ingrediente[0]; c: { cant: number; valoare: number; um: string }; alt?: { furnizor: string; pret: number }; varPct: number; castig: number }[];

  const deEliminat = optim.find(o => o.categorii.includes('ELIMINARE'))
    ?? (cicluri.find(c => c.etapa === 'DECLIN' && c.contributie < 3)
      ? optim.find(o => o.cod === cicluri.find(c => c.etapa === 'DECLIN' && c.contributie < 3)!.cod) ?? null
      : null);
  const potential = optim.reduce((s, o) => s + Math.max(0, o.impactLunar ?? 0), 0);

  const raspunsuri: Raspuns[] = [
    {
      intrebare: 'Unde pierdem bani?',
      raspuns: frane.length
        ? `${frane[0].denumire}${frane.length > 1 ? ` și ${frane[1].denumire}` : ''}`
        : 'Niciun produs nu trage profitabilitatea în jos',
      detaliu: frane.length ? frane[0].cauza : 'Toate produsele au contribuția la profit aliniată cu consumul de Food Cost.',
      impact: frane.length
        ? `decalaj cost/profit ${fmtPP(frane[0].decalaj)} · ${fmtInt(frane[0].cost)} lei cost/lună`
        : 'nicio pierdere structurală de cuantificat luna aceasta',
      unde: 'Decision Intelligence → Profit Drivers',
    },
    {
      intrebare: 'Unde câștigăm bani?',
      raspuns: motor ? `${motor.denumire}${dr.randuri[1] ? ` și ${dr.randuri[1].denumire}` : ''}` : '—',
      detaliu: motor
        ? `Primele două produse aduc ${fmtPct(motor.contributie + (dr.randuri[1]?.contributie ?? 0))} din profitul rețelei. ${motor.denumire}: ${motor.cauza}`
        : '',
      impact: motor ? `${fmtInt(motor.profit + (dr.randuri[1]?.profit ?? 0))} lei/lună din primele două poziții` : 'fără vânzări în perioada selectată',
      unde: 'Profit Intelligence → Product Contribution',
    },
    {
      intrebare: 'Ce produs produce cel mai mare profit?',
      raspuns: motor ? motor.denumire : '—',
      detaliu: motor ? motor.cauza : '',
      impact: motor ? `${fmtInt(motor.profit)} lei/lună · ${fmtPct(motor.contributie)} din profitul rețelei · ROI ${fmtPct(motor.roi, 0)}` : 'fără vânzări în perioada selectată',
      unde: 'Profit Intelligence',
    },
    {
      intrebare: 'Ce produs consumă cel mai mult Food Cost?',
      raspuns: consumatorFC ? consumatorFC.denumire : '—',
      detaliu: consumatorFC
        ? `Absoarbe ${fmtPct(consumatorFC.mixCost)} din Food Cost-ul rețelei și returnează ${fmtPct(consumatorFC.contributie)} din profit (decalaj ${fmtPP(consumatorFC.decalaj)}).`
          + (consumatorFC.dominanta ? ` Componenta dominantă: ${consumatorFC.dominanta.nume} (${fmtPct(consumatorFC.dominanta.share)} din costul porției).` : '')
        : '',
      impact: consumatorFC ? `${fmtInt(consumatorFC.cost)} lei cost/lună · FC ${fmtPct(consumatorFC.fc)}` : '—',
      unde: 'Decision Intelligence → Recipe Optimization',
    },
    {
      intrebare: 'Ce ingredient generează cel mai mare impact?',
      raspuns: ingTop ? ingTop.nume : '—',
      detaliu: ingTop
        ? `Consum ${ingTop.cant.toFixed(1)} ${ingTop.um}/lună; o variație de 1 leu/${ingTop.um} mișcă profitul rețelei cu ${fmtInt(ingTop.cant)} lei/lună.`
        : '',
      impact: ingTop ? `${fmtInt(ingTop.valoare)} lei/lună cheltuială` : 'fără consum înregistrat',
      unde: 'Ingredient Intelligence → Impact Network',
    },
    {
      intrebare: 'Ce ingrediente trebuie renegociate?',
      raspuns: renegocieri.length ? renegocieri.slice(0, 2).map(r => r.ing.denumire).join(', ') : 'Niciunul urgent',
      detaliu: renegocieri.length
        ? renegocieri.slice(0, 2).map(r => `${r.ing.denumire}: ${fmtInt(r.c.valoare * 12)} lei/an`
            + (r.alt ? `, ofertă alternativă la ${fmtLei(r.alt.pret)} lei/${r.ing.um} (${state.furnizori.find(f => f.cod === r.alt!.furnizor)?.nume ?? r.alt.furnizor})` : '')
            + (r.varPct >= 3 ? `, s-a scumpit cu ${fmtPct(r.varPct)}` : '')).join('. ') + '.'
        : 'Nicio ofertă alternativă mai bună și nicio scumpire semnificativă în ultima perioadă.',
      impact: renegocieri.length && renegocieri[0].castig > 0
        ? `+${fmtInt(renegocieri.reduce((s2, r) => s2 + r.castig, 0))} lei/lună dacă se mută pe cele mai bune oferte`
        : 'fără câștig imediat de cuantificat',
      unde: 'Supplier Intelligence',
    },
    {
      intrebare: 'Ce produs trebuie reformulat?',
      raspuns: deModificat ? deModificat.denumire : 'Niciunul urgent',
      detaliu: deModificat ? `${deModificat.diagnostic}. Acțiune: ${deModificat.actiune}.` : 'Toate produsele sunt în parametrii de cost.',
      impact: deModificat?.impactLunar != null
        ? `+${fmtInt(deModificat.impactLunar)} lei/lună (${fmtInt(deModificat.impactAnual ?? 0)} lei/an)`
        : 'niciun câștig de cuantificat — costurile sunt în parametri',
      unde: 'Decision Intelligence → Recipe Optimization',
    },
    {
      intrebare: 'Ce produs trebuie promovat?',
      raspuns: dePromovat ? dePromovat.denumire : '—',
      detaliu: dePromovat ? `${dePromovat.diagnostic}. ${dePromovat.actiune}.` : '',
      impact: dePromovat?.impactLunar != null
        ? `+${fmtInt(dePromovat.impactLunar)} lei/lună la +15% volum`
        : 'niciun produs cu marjă peste medie și volum mic',
      unde: 'Menu Engineering',
    },
    {
      intrebare: 'Ce produs trebuie eliminat?',
      raspuns: deEliminat ? deEliminat.denumire : 'Niciunul — nicio poziție nu întrunește criteriile',
      detaliu: deEliminat
        ? `${deEliminat.diagnostic}. ${deEliminat.actiune}`
        : 'Eliminarea se recomandă doar la contribuție sub 3%, marjă sub medie și volum mic simultan.',
      impact: deEliminat
        ? `profit pierdut ${fmtInt(deEliminat.profit)} lei/lună, dar eliberează SKU-uri și spațiu în meniu`
        : 'nicio eliminare justificată financiar acum',
      unde: 'Decision Intelligence → Product Lifecycle',
    },
    {
      intrebare: 'Care este cea mai mare oportunitate financiară?',
      raspuns: oppTop ? oppTop.titlu : `+${fmtInt(potential)} lei/lună identificați`,
      detaliu: oppTop
        ? `${oppTop.detaliu} Total identificat pe meniul lunii ${lunaSel}: ${fmtInt(potential)} lei/lună, fiecare acțiune calculată prin simulare pe volumele reale din PMIX.`
        : `Suma impacturilor pozitive din toate acțiunile recomandate pe meniul lunii ${lunaSel}.`,
      impact: oppTop?.impactAnual != null
        ? `+${fmtInt(oppTop.impactLunar)} lei/lună · ${fmtInt(oppTop.impactAnual)} lei/an (total portofoliu: ${fmtInt(potential * 12)} lei/an)`
        : `${fmtInt(potential * 12)} lei/an · echivalent ${fmtPct(narativ.potentialPP)} Food Cost`,
      unde: oppTop?.unde ?? 'Decision Intelligence → Opportunity Finder',
    },
  ];

  return { raspunsuri, narativ };
}

export { lunaDin };
