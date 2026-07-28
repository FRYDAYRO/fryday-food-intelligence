// Product Intelligence Sprint — nivel de scoruri și risc peste motoarele existente.
// Nu modifică nimic din calculele de bază: consumă engine/decizii/portofoliu și adaugă interpretare.
import type { AppState, RegulaBusiness } from './types';
import {
  consumuriLuna, perProdus, pretCurent, menuEngineering, utilizariIngredient,
  fmtInt, fmtLei, fmtPct, fmtPP, type Ctx, type RandProdus,
} from './engine';
import { cicluViata, componenteCost } from './decizii';
import { portofoliu } from './portofoliu';

// ————————————————————————————————————————————— explicabilitate (cerința 7)

export type Incredere = 'RIDICATA' | 'MEDIE' | 'SCAZUTA';

export interface Explicatie {
  date: string[];        // ce date au fost folosite
  logica: string;        // regula aplicată, în cuvinte
  calcule: string[];     // pașii numerici
  impact: string;        // efectul estimat
  incredere: Incredere;
  motivIncredere: string;
}

function increderePeVolum(buc: number, zileIstoric: number): { nivel: Incredere; motiv: string } {
  if (buc >= 300 && zileIstoric >= 45) return { nivel: 'RIDICATA', motiv: `${fmtInt(buc)} bucăți vândute și ${zileIstoric} zile de istoric — bază statistică solidă.` };
  if (buc >= 80 && zileIstoric >= 21) return { nivel: 'MEDIE', motiv: `${fmtInt(buc)} bucăți și ${zileIstoric} zile de istoric — suficient pentru o direcție, nu pentru precizie.` };
  return { nivel: 'SCAZUTA', motiv: `Doar ${fmtInt(buc)} bucăți sau istoric scurt (${zileIstoric} zile) — tratează rezultatul ca ipoteză.` };
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

// scor de percentilă: unde se află valoarea față de restul meniului
function percentila(valoare: number, toate: number[]): number {
  if (toate.length <= 1) return 50;
  const subEa = toate.filter(v => v < valoare).length;
  return (subEa / (toate.length - 1)) * 100;
}

// ————————————————————————————————————————————— 1. Product Health Score

export interface ComponentaScor { nume: string; scor: number; pondere: number; detaliu: string; }

export interface ProductHealth {
  cod: string; denumire: string; categorie: string;
  scor: number; verdict: 'EXCELENT' | 'BUN' | 'ATENTIE' | 'CRITIC';
  componente: ComponentaScor[];
  explicatie: Explicatie;
  fc: number | null; marja: number | null; profit: number; buc: number; contributie: number;
  trend: number | null; volatilitate: number;
}

const VERDICT = (s: number): ProductHealth['verdict'] => (s >= 80 ? 'EXCELENT' : s >= 65 ? 'BUN' : s >= 50 ? 'ATENTIE' : 'CRITIC');

// volatilitatea costului: cea mai mare variație procentuală a ingredientelor din rețetă
function volatilitateReteta(cod: string, state: AppState, ctx: Ctx): { max: number; vinovat: string | null } {
  const comp = componenteCost(cod, ctx);
  let max = 0, vinovat: string | null = null;
  for (const c of comp) {
    const ing = state.ingrediente.find(i => i.cod === c.cod);
    const lista = ing ? [ing] : state.ingrediente.filter(i =>
      ctx.retete.get(c.cod)?.versiuni.some(v => v.linii.some(l => l.comp === i.cod)));
    for (const x of lista) {
      const ps = [...x.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
      if (ps.length < 2 || ps[ps.length - 2].pret <= 0) continue;
      const varPct = Math.abs(((ps[ps.length - 1].pret - ps[ps.length - 2].pret) / ps[ps.length - 2].pret) * 100);
      if (varPct > max) { max = varPct; vinovat = x.denumire; }
    }
  }
  return { max, vinovat };
}

export function scoruriProduse(state: AppState, ctx: Ctx, lunaSel: string): ProductHealth[] {
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  if (!rows.length) return [];
  const me = menuEngineering(rows);
  const cicluri = cicluViata(state, ctx, lunaSel);
  const tinta = state.tinte.find(t => t.locatie === 'RETEA')?.fcCurat ?? 25;
  const zile = new Set(state.vanzari.map(v => v.data)).size;

  const profitUnitar = (r: RandProdus) => (r.buc > 0 ? r.profit / r.buc : 0);
  const toateUnitare = rows.map(profitUnitar);
  const toateProfituri = rows.map(r => r.profit);
  const toateVolume = rows.map(r => r.buc);
  const perCategorie = new Map<string, number>();
  for (const r of rows) perCategorie.set(r.categorie, (perCategorie.get(r.categorie) ?? 0) + Math.max(0, r.profit));

  return rows.map(r => {
    const trend = cicluri.find(c => c.cod === r.cod)?.trendPct ?? null;
    const vol = volatilitateReteta(r.cod, state, ctx);
    const mixBuc = me.randuri.find(x => x.cod === r.cod)?.mixBuc ?? 0;
    const catProfit = perCategorie.get(r.categorie) ?? 0;
    const inCategorie = catProfit > 0 ? (Math.max(0, r.profit) / catProfit) * 100 : 0;

    const sFc = r.fc == null ? 50 : clamp(100 - Math.max(0, r.fc - tinta) * (100 / tinta));
    const sProfitUnitar = percentila(profitUnitar(r), toateUnitare);
    const sProfitTotal = percentila(r.profit, toateProfituri);
    const sVolum = percentila(r.buc, toateVolume);
    const sTrend = trend == null ? 50 : clamp(50 + trend * 2);
    const sStabilitate = clamp(100 - vol.max * 5);
    const sCategorie = clamp(inCategorie * 2);

    const componente: ComponentaScor[] = [
      { nume: 'Food Cost', scor: sFc, pondere: 25, detaliu: `FC ${fmtPct(r.fc)} față de ținta de ${fmtPct(tinta)}` },
      { nume: 'Profit unitar', scor: sProfitUnitar, pondere: 15, detaliu: `${fmtLei(profitUnitar(r))} lei/porție, peste ${fmtPct(sProfitUnitar)} din meniu` },
      { nume: 'Profit total', scor: sProfitTotal, pondere: 20, detaliu: `${fmtInt(r.profit)} lei/lună, ${fmtPct(r.contributie)} din profitul rețelei` },
      { nume: 'Volum vânzări', scor: sVolum, pondere: 15, detaliu: `${fmtInt(r.buc)} buc/lună, ${fmtPct(mixBuc)} din bucățile vândute` },
      { nume: 'Evoluția vânzărilor', scor: sTrend, pondere: 10, detaliu: trend == null ? 'fără istoric suficient' : `${trend >= 0 ? '+' : ''}${fmtPct(trend)} în ultimele 14 zile` },
      { nume: 'Stabilitatea costurilor', scor: sStabilitate, pondere: 10, detaliu: vol.max > 0 ? `variație maximă ${fmtPct(vol.max)}${vol.vinovat ? ` la ${vol.vinovat}` : ''}` : 'prețuri stabile' },
      { nume: 'Contribuția în categorie', scor: sCategorie, pondere: 5, detaliu: `${fmtPct(inCategorie)} din profitul categoriei ${r.categorie}` },
    ];
    const scor = componente.reduce((s, c) => s + c.scor * c.pondere, 0) / 100;

    const slabe = [...componente].sort((a, b) => a.scor - b.scor).slice(0, 2);
    const tari = [...componente].sort((a, b) => b.scor - a.scor).slice(0, 2);
    const inc = increderePeVolum(r.buc, zile);

    return {
      cod: r.cod, denumire: r.denumire, categorie: r.categorie,
      scor, verdict: VERDICT(scor), componente,
      fc: r.fc, marja: r.marja, profit: r.profit, buc: r.buc, contributie: r.contributie,
      trend, volatilitate: vol.max,
      explicatie: {
        date: [`PMIX ${lunaSel} (${fmtInt(r.buc)} bucăți)`, 'rețeta activă și prețurile datate ale ingredientelor',
          `ținta de Food Cost a rețelei (${fmtPct(tinta)})`, 'istoricul vânzărilor pe ultimele 28 de zile'],
        logica: 'Șapte componente, fiecare adusă la o scală 0–100 și ponderată: Food Cost 25%, profit total 20%, profit unitar 15%, volum 15%, evoluție 10%, stabilitatea costurilor 10%, contribuția în categorie 5%. Profitul și volumul sunt evaluate prin percentilă față de restul meniului, nu absolut.',
        calcule: componente.map(c => `${c.nume}: ${c.scor.toFixed(0)}/100 × ${c.pondere}% = ${((c.scor * c.pondere) / 100).toFixed(1)} puncte (${c.detaliu})`)
          .concat(`Total: ${scor.toFixed(1)}/100 → ${VERDICT(scor)}`),
        impact: `Puncte forte: ${tari.map(c => c.nume.toLowerCase()).join(' și ')}. Puncte slabe: ${slabe.map(c => `${c.nume.toLowerCase()} (${c.scor.toFixed(0)}/100)`).join(', ')}.`,
        incredere: inc.nivel, motivIncredere: inc.motiv,
      },
    };
  }).sort((a, b) => b.scor - a.scor);
}

// ————————————————————————————————————————————— 2. Ingredient Risk Analyzer

export interface IngredientRisk {
  cod: string; nume: string; um: string;
  scor: number; nivel: 'RIDICAT' | 'MEDIU' | 'SCAZUT';
  nrProduse: number; produse: string[];
  cheltuialaLunara: number; cheltuialaAnuala: number; shareCost: number;
  variatiePct: number; volatilitate: number;
  riscLa10Pct: number;              // lei/lună pierduți dacă prețul crește cu 10%
  riscAnual: number;
  componente: ComponentaScor[];
  explicatie: Explicatie;
}

export function riscIngrediente(state: AppState, ctx: Ctx, lunaSel: string): IngredientRisk[] {
  const cons = consumuriLuna(state, ctx, lunaSel);
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  const costTotal = rows.reduce((s, r) => s + r.cost, 0);
  const profitTotal = rows.reduce((s, r) => s + r.profit, 0);
  const nrProduseTotal = Math.max(1, rows.length);
  const zile = new Set(state.vanzari.map(v => v.data)).size;

  const rez: IngredientRisk[] = [];
  for (const ing of state.ingrediente) {
    const c = cons.get(ing.cod);
    if (!c || c.cant <= 0) continue;
    const utiliz = utilizariIngredient(ing.cod, ctx);
    const ps = [...ing.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
    const variatie = ps.length > 1 && ps[ps.length - 2].pret > 0
      ? ((ps[ps.length - 1].pret - ps[ps.length - 2].pret) / ps[ps.length - 2].pret) * 100 : 0;
    // volatilitatea = amplitudinea istorică a prețului
    const preturi = ps.map(p => p.pret);
    const volatilitate = preturi.length > 1 && Math.min(...preturi) > 0
      ? ((Math.max(...preturi) - Math.min(...preturi)) / Math.min(...preturi)) * 100 : 0;

    const shareCost = costTotal > 0 ? (c.valoare / costTotal) * 100 : 0;
    const riscLa10Pct = pretCurent(ing) * 0.1 * c.cant;
    const riscProfitPct = profitTotal > 0 ? (riscLa10Pct / profitTotal) * 100 : 0;

    const sDependenta = clamp((utiliz.length / nrProduseTotal) * 200);
    const sImpact = clamp(shareCost * 4);
    const sVolatilitate = clamp(volatilitate * 4);
    const sRiscFinanciar = clamp(riscProfitPct * 20);

    const componente: ComponentaScor[] = [
      { nume: 'Dependența meniului', scor: sDependenta, pondere: 30, detaliu: `${utiliz.length} din ${nrProduseTotal} produse îl conțin` },
      { nume: 'Impact în Food Cost', scor: sImpact, pondere: 25, detaliu: `${fmtPct(shareCost)} din costul materialelor (${fmtInt(c.valoare)} lei/lună)` },
      { nume: 'Volatilitatea prețului', scor: sVolatilitate, pondere: 25, detaliu: volatilitate > 0 ? `amplitudine istorică ${fmtPct(volatilitate)}` : 'preț stabil în tot istoricul' },
      { nume: 'Risc financiar', scor: sRiscFinanciar, pondere: 20, detaliu: `+10% preț = ${fmtInt(riscLa10Pct)} lei/lună, ${fmtPct(riscProfitPct)} din profit` },
    ];
    const scor = componente.reduce((s, x) => s + x.scor * x.pondere, 0) / 100;
    const inc = increderePeVolum(rows.reduce((s, r) => s + r.buc, 0), zile);

    rez.push({
      cod: ing.cod, nume: ing.denumire, um: ing.um,
      scor, nivel: scor >= 60 ? 'RIDICAT' : scor >= 35 ? 'MEDIU' : 'SCAZUT',
      nrProduse: utiliz.length, produse: utiliz.map(u => u.denumire),
      cheltuialaLunara: c.valoare, cheltuialaAnuala: c.valoare * 12, shareCost,
      variatiePct: variatie, volatilitate,
      riscLa10Pct, riscAnual: riscLa10Pct * 12,
      componente,
      explicatie: {
        date: [`consumul real din PMIX ${lunaSel} (${c.cant.toFixed(1)} ${ing.um})`,
          `istoricul de prețuri (${ps.length} intrări, ${ps[0]?.validDeLa} → ${ps[ps.length - 1]?.validDeLa})`,
          'rețetele active, expandate prin semipreparate și combo-uri'],
        logica: 'Risc = dependență (30%) + impact în Food Cost (25%) + volatilitatea prețului (25%) + risc financiar la +10% (20%). Un ingredient ieftin, dar prezent în tot meniul și cu preț instabil, este mai riscant decât unul scump folosit într-un singur produs.',
        calcule: componente.map(x => `${x.nume}: ${x.scor.toFixed(0)}/100 × ${x.pondere}% (${x.detaliu})`)
          .concat(`Risc total: ${scor.toFixed(1)}/100 → ${scor >= 60 ? 'RIDICAT' : scor >= 35 ? 'MEDIU' : 'SCĂZUT'}`),
        impact: `O scumpire de 10% costă ${fmtInt(riscLa10Pct)} lei/lună (${fmtInt(riscLa10Pct * 12)} lei/an) și mișcă Food Cost-ul cu ${fmtPP(costTotal > 0 ? (riscLa10Pct / rows.reduce((s, r) => s + r.net, 0)) * 100 : 0)}.`,
        incredere: inc.nivel, motivIncredere: inc.motiv,
      },
    });
  }
  return rez.sort((a, b) => b.scor - a.scor);
}

// ————————————————————————————————————————————— 4. Menu Balance Analyzer

export interface EchilibruCategorie {
  categorie: string; nrSKU: number; shareSKU: number;
  shareVanzari: number; shareProfit: number;
  fc: number | null; scorEchilibru: number;
  verdict: 'SUPRADIMENSIONATA' | 'SUBREPREZENTATA' | 'ECHILIBRATA';
  recomandare: string;
}

export interface RezultatEchilibru {
  categorii: EchilibruCategorie[];
  goluriPret: { categorie: string; de: number; la: number; sugestie: string }[];
  recomandariRnD: string[];
  explicatie: Explicatie;
}

export function echilibruMeniu(state: AppState, ctx: Ctx, lunaSel: string): RezultatEchilibru {
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  const port = portofoliu(state, ctx, lunaSel);
  const nrTotal = Math.max(1, rows.length);
  const zile = new Set(state.vanzari.map(v => v.data)).size;

  const categorii: EchilibruCategorie[] = port.categorii.map(c => {
    const nrSKU = rows.filter(r => r.categorie === c.categorie).length;
    const shareSKU = (nrSKU / nrTotal) * 100;
    const scor = c.mixVanzari - shareSKU;   // pozitiv = fiecare SKU trage mai mult decât media
    const verdict: EchilibruCategorie['verdict'] = scor <= -8 ? 'SUPRADIMENSIONATA' : scor >= 8 ? 'SUBREPREZENTATA' : 'ECHILIBRATA';
    const recomandare = verdict === 'SUPRADIMENSIONATA'
      ? `${nrSKU} produse (${fmtPct(shareSKU)} din meniu) pentru doar ${fmtPct(c.mixVanzari)} din vânzări — consolidează: elimină sau diferențiază produsele care se suprapun.`
      : verdict === 'SUBREPREZENTATA'
        ? `Doar ${nrSKU} produse aduc ${fmtPct(c.mixVanzari)} din vânzări — categoria suportă extindere; prioritate pentru R&D.`
        : `Numărul de produse este proporțional cu rulajul (${fmtPct(shareSKU)} din SKU-uri, ${fmtPct(c.mixVanzari)} din vânzări).`;
    return {
      categorie: c.categorie, nrSKU, shareSKU,
      shareVanzari: c.mixVanzari, shareProfit: c.mixProfit,
      fc: c.fc, scorEchilibru: scor, verdict, recomandare,
    };
  }).sort((a, b) => a.scorEchilibru - b.scorEchilibru);

  const recomandariRnD: string[] = [];
  for (const c of categorii.filter(x => x.verdict === 'SUBREPREZENTATA')) {
    recomandariRnD.push(`Extinde „${c.categorie}": ${c.nrSKU} produse aduc ${fmtPct(c.shareVanzari)} din vânzări și ${fmtPct(c.shareProfit)} din profit. Un SKU nou aici are cea mai bună rată de succes.`);
  }
  for (const c of categorii.filter(x => x.verdict === 'SUPRADIMENSIONATA')) {
    recomandariRnD.push(`Consolidează „${c.categorie}": ${c.nrSKU} produse pentru ${fmtPct(c.shareVanzari)} din vânzări. Verifică redundanțele înainte de a mai adăuga ceva.`);
  }
  for (const g of port.goluri.slice(0, 3)) {
    recomandariRnD.push(`Gol de preț în „${g.categorie}": ${fmtLei(g.de)} → ${fmtLei(g.la)} lei. Un produs la ~${fmtLei((g.de + g.la) / 2)} lei ar acoperi saltul.`);
  }
  for (const r of port.redundante.slice(0, 2)) {
    recomandariRnD.push(`„${r.numeA}" și „${r.numeB}" au ${fmtPct(r.similaritate)} structură de cost comună — diferențiere sau consolidare.`);
  }

  return {
    categorii,
    goluriPret: port.goluri.map(g => ({ categorie: g.categorie, de: g.de, la: g.la, sugestie: g.sugestie })),
    recomandariRnD,
    explicatie: {
      date: [`PMIX ${lunaSel}`, 'nomenclatorul de produse cu categorii și prețuri', 'structura de cost a fiecărei rețete'],
      logica: 'Fiecare categorie este comparată pe trei ponderi: câte SKU-uri are, cât vinde și cât profit aduce. Dacă ponderea în SKU-uri depășește ponderea în vânzări cu peste 8 pp, categoria este supradimensionată; invers, este subreprezentată și suportă extindere.',
      calcule: categorii.map(c => `${c.categorie}: ${c.nrSKU} SKU (${fmtPct(c.shareSKU)}) vs ${fmtPct(c.shareVanzari)} vânzări → ${fmtPP(c.scorEchilibru)} → ${c.verdict.toLowerCase()}`),
      impact: `${categorii.filter(c => c.verdict !== 'ECHILIBRATA').length} categorii necesită intervenție; ${port.goluri.length} goluri de preț identificate.`,
      incredere: increderePeVolum(rows.reduce((s, r) => s + r.buc, 0), zile).nivel,
      motivIncredere: increderePeVolum(rows.reduce((s, r) => s + r.buc, 0), zile).motiv,
    },
  };
}

// ————————————————————————————————————————————— 6. Business Rule Engine

export interface Incalcare {
  regula: RegulaBusiness;
  subiect: string; tipSubiect: 'PRODUS' | 'CATEGORIE' | 'INGREDIENT';
  valoare: number; limita: number; abatere: number;
  mesaj: string;
}

export function verificaReguli(state: AppState, ctx: Ctx, lunaSel: string): { incalcari: Incalcare[]; verificate: number } {
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  const incalcari: Incalcare[] = [];
  let verificate = 0;

  const perCat = new Map<string, { net: number; cost: number }>();
  for (const r of rows) {
    const c = perCat.get(r.categorie) ?? { net: 0, cost: 0 };
    c.net += r.net; c.cost += r.cost;
    perCat.set(r.categorie, c);
  }

  for (const reg of state.reguliBusiness.filter(r => r.activ)) {
    if (reg.tip === 'FC_MAX_CATEGORIE') {
      for (const [categorie, c] of perCat) {
        if (reg.scop && reg.scop !== categorie) continue;
        verificate++;
        const fc = c.net > 0 ? (c.cost / c.net) * 100 : 0;
        if (fc > reg.valoare) incalcari.push({
          regula: reg, subiect: categorie, tipSubiect: 'CATEGORIE',
          valoare: fc, limita: reg.valoare, abatere: fc - reg.valoare,
          mesaj: `Categoria „${categorie}" are Food Cost ${fmtPct(fc)}, peste limita de ${fmtPct(reg.valoare)} (depășire ${fmtPP(fc - reg.valoare)}).`,
        });
      }
    } else if (reg.tip === 'COST_MAX_INGREDIENT') {
      for (const ing of state.ingrediente) {
        if (reg.scop && reg.scop !== ing.cod) continue;
        verificate++;
        const p = pretCurent(ing);
        if (p > reg.valoare) incalcari.push({
          regula: reg, subiect: ing.denumire, tipSubiect: 'INGREDIENT',
          valoare: p, limita: reg.valoare, abatere: p - reg.valoare,
          mesaj: `${ing.denumire} costă ${fmtLei(p)} lei/${ing.um}, peste limita de ${fmtLei(reg.valoare)} lei (+${fmtPct(((p - reg.valoare) / reg.valoare) * 100)}).`,
        });
      }
    } else {
      for (const r of rows) {
        if (reg.scop && reg.scop !== r.cod && reg.scop !== r.categorie) continue;
        if (r.buc === 0) continue;
        verificate++;
        if (reg.tip === 'MARJA_MIN' && r.marja != null && r.marja < reg.valoare) incalcari.push({
          regula: reg, subiect: r.denumire, tipSubiect: 'PRODUS',
          valoare: r.marja, limita: reg.valoare, abatere: reg.valoare - r.marja,
          mesaj: `${r.denumire} are marjă ${fmtPct(r.marja)}, sub minimul de ${fmtPct(reg.valoare)} (lipsesc ${fmtPP(reg.valoare - r.marja)}).`,
        });
        if (reg.tip === 'PROFIT_MIN_PRODUS' && r.profit < reg.valoare) incalcari.push({
          regula: reg, subiect: r.denumire, tipSubiect: 'PRODUS',
          valoare: r.profit, limita: reg.valoare, abatere: reg.valoare - r.profit,
          mesaj: `${r.denumire} aduce ${fmtInt(r.profit)} lei/lună, sub pragul de ${fmtInt(reg.valoare)} lei.`,
        });
        if (reg.tip === 'VOLUM_MIN' && r.buc < reg.valoare) incalcari.push({
          regula: reg, subiect: r.denumire, tipSubiect: 'PRODUS',
          valoare: r.buc, limita: reg.valoare, abatere: reg.valoare - r.buc,
          mesaj: `${r.denumire} s-a vândut în ${fmtInt(r.buc)} bucăți, sub minimul de ${fmtInt(reg.valoare)}.`,
        });
      }
    }
  }
  return { incalcari: incalcari.sort((a, b) => b.abatere - a.abatere), verificate };
}

// ————————————————————————————————————————————— 3 + 5. Oportunități pe produs & prioritizare

export interface OportunitateProdus {
  cod: string; denumire: string;
  tip: 'PROMOVARE' | 'REFORMULARE' | 'ELIMINARE' | 'CRESTERE';
  motiv: string; impactLunar: number | null; impactAnual: number | null;
  scor: number; explicatie: Explicatie;
}

export function oportunitatiProduse(state: AppState, ctx: Ctx, lunaSel: string): OportunitateProdus[] {
  const scoruri = scoruriProduse(state, ctx, lunaSel);
  const cicluri = cicluViata(state, ctx, lunaSel);
  const tinta = state.tinte.find(t => t.locatie === 'RETEA')?.fcCurat ?? 25;
  const rez: OportunitateProdus[] = [];

  for (const h of scoruri) {
    const ciclu = cicluri.find(c => c.cod === h.cod);
    const compFc = h.componente[0], compVolum = h.componente[3];
    let tip: OportunitateProdus['tip'] | null = null;
    let motiv = '', impact: number | null = null;

    if (h.fc != null && h.fc > tinta && h.buc > 0) {
      tip = 'REFORMULARE';
      const economie = h.profit > 0 ? (h.fc - tinta) / 100 * (h.profit / (h.marja ?? 100) * 100) : 0;
      impact = economie;
      motiv = `Food Cost ${fmtPct(h.fc)} peste ținta de ${fmtPct(tinta)}; aducerea la țintă ar elibera ${fmtInt(economie)} lei/lună.`;
    } else if (compVolum.scor < 40 && (h.marja ?? 0) > 75) {
      tip = 'PROMOVARE';
      impact = h.profit * 0.2;
      motiv = `Marjă ${fmtPct(h.marja)} dar volum mic (${fmtInt(h.buc)} buc, sub ${fmtPct(compVolum.scor)} din meniu) — vizibilitate mai bună ar aduce ~${fmtInt(h.profit * 0.2)} lei/lună la +20% volum.`;
    } else if (h.scor < 50 && h.contributie < 3) {
      tip = 'ELIMINARE';
      impact = null;
      motiv = `Scor ${h.scor.toFixed(0)}/100 și doar ${fmtPct(h.contributie)} din profit — candidat de retragere; profitul pierdut ar fi ${fmtInt(h.profit)} lei/lună.`;
    } else if ((ciclu?.trendPct ?? 0) >= 5 && h.scor >= 60) {
      tip = 'CRESTERE';
      impact = h.profit * ((ciclu!.trendPct ?? 0) / 100);
      motiv = `Vânzări în creștere (${ciclu!.trendPct! >= 0 ? '+' : ''}${fmtPct(ciclu!.trendPct!)}) pe un produs sănătos (scor ${h.scor.toFixed(0)}) — susține disponibilitatea și blochează costul ingredientelor.`;
    }
    if (!tip) continue;

    rez.push({
      cod: h.cod, denumire: h.denumire, tip, motiv,
      impactLunar: impact, impactAnual: impact != null ? impact * 12 : null,
      scor: h.scor,
      explicatie: {
        date: [`Product Health Score ${h.scor.toFixed(0)}/100`, `PMIX ${lunaSel}`, 'ținta de Food Cost a rețelei', 'trendul ultimelor 14 zile'],
        logica: tip === 'REFORMULARE' ? 'Produsele peste ținta de Food Cost intră la reformulare; economia se calculează ca diferența de puncte de FC aplicată vânzărilor nete ale produsului.'
          : tip === 'PROMOVARE' ? 'Marjă peste 75% cu volum în ultima treime a meniului = potențial nefructificat; estimarea presupune +20% volum la aceeași marjă.'
          : tip === 'ELIMINARE' ? 'Scor sub 50 și contribuție sub 3% din profit: costul de complexitate depășește aportul.'
          : 'Trend pozitiv peste 5% pe un produs cu scor bun: creșterea se susține, nu se forțează.',
        calcule: [`Componenta Food Cost: ${compFc.scor.toFixed(0)}/100`, `Componenta volum: ${compVolum.scor.toFixed(0)}/100`,
          impact != null ? `Impact estimat: ${fmtInt(impact)} lei/lună → ${fmtInt(impact * 12)} lei/an` : 'Impact: nu se estimează un câștig direct'],
        impact: impact != null ? `${fmtInt(impact)} lei/lună (${fmtInt(impact * 12)} lei/an)` : 'decizie de portofoliu, fără câștig direct cuantificabil',
        incredere: h.explicatie.incredere, motivIncredere: h.explicatie.motivIncredere,
      },
    });
  }
  return rez.sort((a, b) => (b.impactLunar ?? -1) - (a.impactLunar ?? -1));
}
