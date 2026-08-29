// Motorul Food Cost — cele trei vederi ale aceleiași realități și puntea dintre ele.
//
//   RecipeFC          PMIX 4.7 × rețete × prețuri de ingrediente  → costul TEORETIC
//   NBOFC             raportul 2.9                                 → consumul REAL
//   ReconciliationFC  puntea dintre ele, descompusă pe componente  → variance explicat
//
// Reguli respectate aici:
//  · doar Food Cost — nimic din P&L, niciun comision de agregator: funcțiile primesc `CtxFC`,
//    contractul minim de costare, deci nici nu au de unde citi așa ceva;
//  · Total = InStore + Delivery ca SUME; procentele se recalculează din totaluri;
//  · ce nu se poate calcula se raportează `disponibil: false`, niciodată zero;
//  · fiecare rezultat își poartă sursele, ca orice cifră să fie urmărită până la datele brute.
import { UMS, costProdus, luna as lunaDin, pretLa, clasifica } from './engine';
import type { AppState, Canal } from './types';
import {
  canalePentru, componentaDin29, contineData, descrieCerere, eLunaIntreaga, locatieDin, luniAtinse,
  type CerereFC, type CtxFC, type FCComponent, type SursaFC,
} from './fc-domeniu';

// ————————————————————————————————————————————————————————— numitorul

export interface NumitorFC {
  net: number;
  sursa: 'Sales Report' | 'PMIX';
  nota: string;
}

/**
 * Vânzările nete pe care se raportează procentele. Sales Report NBO are prioritate — e
 * sursa fiscală; PMIX-ul rămâne rezerva, cu mențiunea explicită că poate diferi.
 */
export function numitorFC(state: AppState, cerere: CerereFC, netPmix: number): NumitorFC {
  const loc = locatieDin(cerere.nivel);
  const canale = canalePentru(cerere.canal);
  const linii = state.salesReport.filter(r =>
    contineData(cerere.perioada, r.data) && (!loc || r.locatie === loc) && canale.includes(r.canal));
  const net = linii.reduce((s, r) => s + r.net, 0);
  return linii.length && net > 0
    ? { net, sursa: 'Sales Report', nota: `${linii.length} rânduri de Sales Report NBO` }
    : { net: netPmix, sursa: 'PMIX', nota: 'Fără Sales Report pe această perioadă — numitorul este PMIX-ul, care poate diferi de vânzările fiscale' };
}

// ————————————————————————————————————————————————————————— 1. Recipe FC

export interface ProdusFaraReteta { cod: string; denumire: string; buc: number; net: number; }

export interface RecipeFC {
  cerere: CerereFC;
  buc: number;
  /** Vânzările nete din PMIX pe perioada, nivelul și canalul cerute. */
  netVandut: number;
  /** Partea de vânzări pentru care costul e calculabil (produsul are rețetă). */
  netAcoperit: number;
  netFaraReteta: number;
  /** Vânzări cu rețetă, dar al căror cost e INCOMPLET (un component fără preț valid). */
  netCostIncomplet: number;
  produseCostIncomplet: ProdusFaraReteta[];
  acoperirePct: number | null;
  /** Partea de vânzări cu cost COMPLET calculabil — `acoperirePct` minus felia incompletă. */
  acoperireCompletaPct: number | null;
  cost: number;                 // Food + Paper teoretic
  costFood: number;
  costPaper: number;
  /** cost / vânzările acoperite — cifra comparabilă. */
  fcPct: number | null;
  /** cost / TOATE vânzările — subestimează când acoperirea nu e completă. */
  fcPeTotalVandut: number | null;
  produseFaraReteta: ProdusFaraReteta[];
  surse: SursaFC[];
}

export function recipeFC(state: AppState, ctx: CtxFC, cerere: CerereFC): RecipeFC {
  const loc = locatieDin(cerere.nivel);
  const canale = canalePentru(cerere.canal);
  const memo = new Map<string, unknown>();

  let buc = 0, netVandut = 0, netAcoperit = 0, cost = 0, costFood = 0, costPaper = 0, randuri = 0;
  let netCostIncomplet = 0;
  const fara = new Map<string, ProdusFaraReteta>();
  const incomplete = new Map<string, ProdusFaraReteta>();

  for (const v of state.vanzari) {
    if (!contineData(cerere.perioada, v.data)) continue;
    if (loc && v.locatie !== loc) continue;
    if (!canale.includes(v.canal)) continue;
    randuri++;
    buc += v.cant; netVandut += v.net;
    const c = costProdus(v.produs, v.canal as Canal, ctx, v.data, memo);
    if (c) {
      netAcoperit += v.net;
      cost += c.total * v.cant; costFood += c.food * v.cant; costPaper += c.paper * v.cant;
      if (c.incomplet) {
        // are rețetă, deci intră în acoperire — dar costul e o LIMITĂ DE JOS, nu o cifră
        netCostIncomplet += v.net;
        const e = incomplete.get(v.produs)
          ?? { cod: v.produs, denumire: ctx.produse.get(v.produs)?.denumire ?? v.produs, buc: 0, net: 0 };
        e.buc += v.cant; e.net += v.net;
        incomplete.set(v.produs, e);
      }
    } else {
      const e = fara.get(v.produs)
        ?? { cod: v.produs, denumire: ctx.produse.get(v.produs)?.denumire ?? v.produs, buc: 0, net: 0 };
      e.buc += v.cant; e.net += v.net;
      fara.set(v.produs, e);
    }
  }

  const interval = `${cerere.perioada.de} → ${cerere.perioada.la}`;
  return {
    cerere, buc, netVandut, netAcoperit,
    netFaraReteta: netVandut - netAcoperit,
    netCostIncomplet,
    produseCostIncomplet: [...incomplete.values()].sort((a, b) => b.net - a.net || a.cod.localeCompare(b.cod)),
    acoperirePct: netVandut > 0 ? (netAcoperit / netVandut) * 100 : null,
    acoperireCompletaPct: netVandut > 0 ? ((netAcoperit - netCostIncomplet) / netVandut) * 100 : null,
    cost, costFood, costPaper,
    fcPct: netAcoperit > 0 ? (cost / netAcoperit) * 100 : null,
    fcPeTotalVandut: netVandut > 0 ? (cost / netVandut) * 100 : null,
    produseFaraReteta: [...fara.values()].sort((a, b) => b.net - a.net),
    surse: [
      { raport: 'PMIX', randuri, interval, nota: `${cerere.canal === 'TOTAL' ? 'ambele canale' : cerere.canal}` },
      { raport: 'RETETAR', randuri: ctx.retete.size, interval, nota: 'versiunile în vigoare la data fiecărei vânzări' },
      { raport: 'NOMENCLATOR', randuri: ctx.ingrediente.size, interval, nota: 'prețuri datate' },
    ],
  };
}

// ————————————————————————————————————————————————————————— 2. NBO FC (raportul 2.9)

export interface NBOFC {
  cerere: CerereFC;
  /** 2.9 este LUNAR și fără canal: pe orice altceva nu se poate raporta cinstit. */
  disponibil: boolean;
  motivIndisponibil?: string;
  /** Tot consumul din 2.9 — Food Cost operațional. */
  consumTotal: number;
  /** Food + Paper, fără operațional — „FC Curat". */
  consumFC: number;
  peComponenta: Record<FCComponent, number>;
  categoriiNeclasificate: string[];
  surse: SursaFC[];
}

const componenteGoale = (): Record<FCComponent, number> =>
  ({ FOOD: 0, PAPER: 0, OPERATIONAL: 0, NORMALIZED: 0, UNEXPLAINED: 0 });

export function nboFC(state: AppState, cerere: CerereFC): NBOFC {
  const loc = locatieDin(cerere.nivel);
  const luni = luniAtinse(cerere.perioada);
  const interval = `${cerere.perioada.de} → ${cerere.perioada.la}`;

  const indisponibil = (motiv: string): NBOFC => ({
    cerere, disponibil: false, motivIndisponibil: motiv,
    consumTotal: 0, consumFC: 0, peComponenta: componenteGoale(),
    categoriiNeclasificate: [], surse: [],
  });

  if (!eLunaIntreaga(cerere.perioada)) {
    return indisponibil(`Raportul 2.9 este lunar. Perioada ${cerere.perioada.cheie} nu acoperă luni întregi, `
      + 'deci consumul real nu i se poate atribui fără a inventa o repartiție pe zile.');
  }
  if (cerere.canal !== 'TOTAL') {
    return indisponibil('Raportul 2.9 nu conține canalul: consumul real există doar pe Total, '
      + 'nu separat pe InStore și Delivery.');
  }

  const linii = state.linii29.filter(l => luni.includes(l.perioada) && (!loc || l.locatie === loc));
  if (!linii.length) {
    return indisponibil(`Nu există raport 2.9 importat pentru ${luni.join(', ')}`
      + (loc ? ` la restaurantul ${loc}.` : ' la nivel de rețea.'));
  }

  const peComponenta = componenteGoale();
  const neclasificate = new Set<string>();
  let consumTotal = 0;
  for (const l of linii) {
    const c = clasifica(l.categorie, state.reguli);
    peComponenta[componentaDin29(c.clasa)] += l.valoare;
    consumTotal += l.valoare;
    if (c.auto) neclasificate.add(l.categorie);
  }

  return {
    cerere, disponibil: true,
    consumTotal,
    consumFC: peComponenta.FOOD + peComponenta.PAPER,
    peComponenta,
    categoriiNeclasificate: [...neclasificate],
    surse: [{
      raport: 'NBO_29', randuri: linii.length, interval,
      nota: `${luni.join(', ')} · ${neclasificate.size ? `${neclasificate.size} categorii fără regulă, tratate implicit FOOD` : 'toate categoriile clasificate'}`,
    }],
  };
}

// ————————————————————————————————————————————————————————— 3. puntea de reconciliere

export type IdPasBridge = 'ACOPERIRE' | 'NORMALIZED' | 'WASTE' | 'UNEXPLAINED' | 'OPERATIONAL';

export interface PasBridge {
  id: IdPasBridge;
  componenta: FCComponent | null;
  eticheta: string;
  /** Efectul în lei. Zero când pasul nu e calculabil — atunci `disponibil` e false. */
  lei: number;
  /** Efectul în puncte procentuale pe numitorul declarat. */
  pp: number | null;
  disponibil: boolean;
  explicatie: string;
}

export interface ReconciliationFC {
  cerere: CerereFC;
  recipe: RecipeFC;
  nbo: NBOFC;
  numitor: NumitorFC;
  fcRecipePct: number | null;      // cost teoretic / numitor
  fcCuratPct: number | null;       // 2.9 Food+Paper / numitor
  fcOperationalPct: number | null; // tot 2.9 / numitor
  /** 2.9 Curat − cost teoretic. `null` fără 2.9. */
  diferentaLei: number | null;
  pasi: PasBridge[];
  /** Ce rămâne neexplicat după toți pașii. Zero prin construcție când puntea se închide. */
  rezidualLei: number | null;
  /** Toți pașii sunt calculabili → puntea explică integral diferența. */
  complet: boolean;
  surse: SursaFC[];
}

/** Waste raportat, în lei, pe perioada și nivelul cerute. */
function wasteLei(state: AppState, ctx: CtxFC, cerere: CerereFC): { lei: number; randuri: number } {
  const loc = locatieDin(cerere.nivel);
  const luni = luniAtinse(cerere.perioada);
  let lei = 0, randuri = 0;
  for (const w of state.waste) {
    if (!luni.includes(w.perioada) || (loc && w.locatie !== loc)) continue;
    const ing = ctx.ingrediente.get(w.ingredient);
    if (!ing) continue;
    randuri++;
    lei += w.cant * (UMS[w.um]?.f ?? 1) * pretLa(ing, `${w.perioada}-28`);
  }
  return { lei, randuri };
}

export function reconciliationFC(state: AppState, ctx: CtxFC, cerere: CerereFC): ReconciliationFC {
  const recipe = recipeFC(state, ctx, cerere);
  const nbo = nboFC(state, cerere);
  const numitor = numitorFC(state, cerere, recipe.netVandut);
  const pp = (lei: number) => (numitor.net > 0 ? (lei / numitor.net) * 100 : null);

  const fcRecipePct = numitor.net > 0 ? (recipe.cost / numitor.net) * 100 : null;
  const fcCuratPct = nbo.disponibil && numitor.net > 0 ? (nbo.consumFC / numitor.net) * 100 : null;
  const fcOperationalPct = nbo.disponibil && numitor.net > 0 ? (nbo.consumTotal / numitor.net) * 100 : null;

  const surse: SursaFC[] = [...recipe.surse, ...nbo.surse];

  if (!nbo.disponibil) {
    return {
      cerere, recipe, nbo, numitor, fcRecipePct, fcCuratPct, fcOperationalPct,
      diferentaLei: null, pasi: [], rezidualLei: null, complet: false, surse,
    };
  }

  const diferentaLei = nbo.consumFC - recipe.cost;
  const w = wasteLei(state, ctx, cerere);
  if (w.randuri) {
    surse.push({ raport: 'WASTE', randuri: w.randuri, interval: `${cerere.perioada.de} → ${cerere.perioada.la}` });
  }

  const pasi: PasBridge[] = [
    {
      id: 'ACOPERIRE', componenta: null, eticheta: 'Produse vândute fără rețetă',
      lei: 0, pp: null, disponibil: false,
      explicatie: recipe.netFaraReteta > 0
        ? `${Math.round(recipe.netFaraReteta)} lei din vânzări provin de la ${recipe.produseFaraReteta.length} produse fără rețetă. `
          + 'Costul lor nu se poate calcula tocmai pentru că rețeta lipsește, deci suma cade în „Neexplicat" — '
          + 'completează rețetele ca să iasă de acolo.'
        : 'Toate vânzările au rețetă calculabilă: acest pas nu mișcă nimic.',
    },
    {
      id: 'NORMALIZED', componenta: 'NORMALIZED', eticheta: 'Materiale normalizate (în 2.9, în nicio rețetă)',
      lei: 0, pp: null, disponibil: false,
      explicatie: 'Necesită raportul 2.9 la nivel de material. Structura importată azi este pe categorie, '
        + 'deci materialele nereprezentate în rețete nu pot fi identificate separat; valoarea lor cade în „Neexplicat".',
    },
    {
      id: 'WASTE', componenta: null, eticheta: 'Waste raportat',
      lei: w.lei, pp: pp(w.lei), disponibil: w.randuri > 0,
      explicatie: w.randuri > 0
        ? `${w.randuri} linii de waste, evaluate la prețul ingredientului din luna respectivă.`
        : 'Nu există waste importat pe această perioadă — partea lui rămâne în „Neexplicat".',
    },
  ];

  const explicat = pasi.filter(p => p.disponibil).reduce((s, p) => s + p.lei, 0);
  const neexplicat = diferentaLei - explicat;
  pasi.push({
    id: 'UNEXPLAINED', componenta: 'UNEXPLAINED', eticheta: 'Neexplicat',
    lei: neexplicat, pp: pp(neexplicat), disponibil: true,
    explicatie: 'Diferența pe care datele curente nu o atribuie: porționare peste gramaj, erori de producție, '
      + 'pierderi neînregistrate — plus tot ce pașii de mai sus nu pot încă separa.',
  });
  pasi.push({
    id: 'OPERATIONAL', componenta: 'OPERATIONAL', eticheta: 'Operațional (curățenie, uniforme, papetărie)',
    lei: nbo.peComponenta.OPERATIONAL, pp: pp(nbo.peComponenta.OPERATIONAL), disponibil: true,
    explicatie: 'Consum din 2.9 care NU face parte din Food Cost. Nu intră în punte, ci explică '
      + 'diferența dintre FC Curat și FC operațional.',
  });

  // puntea se închide pe pașii care duc la FC Curat; operaționalul e după linia de sosire
  const catreCurat = pasi.filter(p => p.id !== 'OPERATIONAL');
  const rezidualLei = diferentaLei - catreCurat.reduce((s, p) => s + p.lei, 0);

  return {
    cerere, recipe, nbo, numitor, fcRecipePct, fcCuratPct, fcOperationalPct,
    diferentaLei, pasi, rezidualLei,
    complet: catreCurat.every(p => p.disponibil),
    surse,
  };
}

/** Rezumat într-o linie, pentru jurnale și verificări rapide. */
export const descrieReconciliere = (r: ReconciliationFC) =>
  `${descrieCerere(r.cerere)} · teoretic ${r.fcRecipePct?.toFixed(1) ?? '—'}% · `
  + `curat ${r.fcCuratPct?.toFixed(1) ?? '—'}% · diferență ${r.diferentaLei?.toFixed(0) ?? '—'} lei`;

export { lunaDin };
