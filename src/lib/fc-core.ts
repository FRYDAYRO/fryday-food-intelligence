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
import { UMS, areCostMasurabil, costProdus, luna as lunaDin, clasifica } from './engine';
import { potriveste28cu29, pretDeterminabil, type Potrivire28cu29 } from './atribuire-waste';
import { identificaIngredient } from './identitate';
import { fereastraRand } from './surse-29';
import { COMBINATIE_FC, intervaleSursePentru, verdictCombinare, type VerdictSurse } from './perioade-surse';
import { selecteaza29 } from './surse-29';
import type { AppState, Canal } from './types';
import {
  canalePentru, componentaDin29, contineData, descrieCerere, locatieDin, luniAtinse,
  type CerereFC, type CtxFC, type FCComponent, type SursaFC,
} from './fc-domeniu';

// ————————————————————————————————————————————————————————— numitorul

export interface NumitorFC {
  net: number;
  sursa: 'Sales Report' | 'PMIX';
  nota: string;
  /**
   * Motivul pentru care 4.1 NU a fost folosit ca numitor, deși există rânduri pe perioadă:
   * fereastra lui nu e aceeași cu a vânzărilor din 4.7. Absent = nicio incompatibilitate.
   */
  motivIncompatibil?: string;
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
  if (!(linii.length && net > 0)) {
    return { net: netPmix, sursa: 'PMIX', nota: 'Fără Sales Report pe această perioadă — numitorul este PMIX-ul, care poate diferi de vânzările fiscale' };
  }
  // 4.1 și 4.7 pot cădea în aceeași lună acoperind ferestre diferite. Costul vine din 4.7;
  // împărțit la vânzările altei ferestre ar da un procent plauzibil și fals. Când
  // incompatibilitatea e DEMONSTRATĂ, numitorul rămâne cel din aceeași sursă cu costul.
  const v = verdictCombinare(state, ['NBO_41', 'PMIX_47'], cerere.perioada);
  if (v.blocheaza) {
    return {
      net: netPmix, sursa: 'PMIX',
      nota: 'Sales Report-ul acoperă altă perioadă decât vânzările pe produs — numitorul rămâne PMIX-ul, din aceeași fereastră cu costul',
      motivIncompatibil: v.motiv,
    };
  }
  // fereastra declarată a lui 4.1 poate conține cererea și totuși să aibă goluri înăuntru:
  // zile cu vânzări pe produs fără niciun rând de Sales Report. Un numitor de 3 zile la un
  // cost de 7 ar da un procent plauzibil și fals — numitorul rămâne atunci PMIX-ul.
  // regula golurilor se aplică doar când un 4.1 cu rânduri pe zi DECLARĂ că acoperă cererea:
  // fără fereastră declarată, Sales Report-ul rămâne numitorul, ca până acum
  const zilnic41 = (state.versiuniImport ?? []).some(v => v.tip === 'NBO_41' && v.granularitate === 'ZI');
  const declaraAcoperire = zilnic41 && intervaleSursePentru(state, ['NBO_41'], cerere.perioada)
    .some(i => i.declarat && i.de <= cerere.perioada.de && i.la >= cerere.perioada.la);
  const zileSR = new Set(linii.map(r => r.data));
  const zileFara = !declaraAcoperire ? [] : [...new Set(state.vanzari
    .filter(x => contineData(cerere.perioada, x.data) && (!loc || x.locatie === loc) && canale.includes(x.canal) && !zileSR.has(x.data))
    .map(x => x.data))].sort();
  if (zileFara.length) {
    return {
      net: netPmix, sursa: 'PMIX',
      nota: `Sales Report-ul nu are rânduri pe ${zileFara.length} zile cu vânzări din perioadă — numitorul rămâne PMIX-ul, din aceeași fereastră cu costul`,
      motivIncompatibil: `Sales Report incomplet pe perioadă: lipsesc ${zileFara.slice(0, 5).join(', ')}${zileFara.length > 5 ? '…' : ''}.`,
    };
  }
  return { net, sursa: 'Sales Report', nota: `${linii.length} rânduri de Sales Report NBO` };
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
  /**
   * cost / TOATE vânzările — subestimează când acoperirea nu e completă,
   * și e `null` (nu 0) când nicio vânzare n-a avut cost calculabil.
   */
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
    fcPeTotalVandut: netVandut > 0 && areCostMasurabil(netAcoperit, cost) ? (cost / netVandut) * 100 : null,
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

  // sursa 2.9 potrivită cererii: lunarul pe lună, săptămânalul pe săptămână, niciodată însumate
  const sel = selecteaza29(state.linii29, cerere.perioada, loc);
  if (!sel.disponibil) return indisponibil(sel.motiv ?? 'Raportul 2.9 nu e disponibil pe această cerere.');
  const vCombinare = verdictCombinare(state, COMBINATIE_FC, cerere.perioada);
  if (vCombinare.blocheaza) return indisponibil(vCombinare.motiv);
  if (cerere.canal !== 'TOTAL') {
    return indisponibil('Raportul 2.9 nu conține canalul: consumul real există doar pe Total, '
      + 'nu separat pe InStore și Delivery.');
  }
  const linii = sel.randuri;
  const intervalSursa = sel.ferestre.map(f => `${f.de} → ${f.la}`).join(', ') || interval;

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
      raport: 'NBO_29', randuri: linii.length, interval: intervalSursa,
      nota: `${luni.join(', ')} · ${neclasificate.size ? `${neclasificate.size} categorii fără regulă, tratate implicit FOOD` : 'toate categoriile clasificate'}`,
    }],
  };
}

// ————————————————————————————————————————————————————————— 3. puntea de reconciliere

export type IdPasBridge = 'ACOPERIRE' | 'NORMALIZED' | 'WASTE' | 'WASTE_NERECONCILIAT' | 'UNEXPLAINED' | 'OPERATIONAL';
export type StatutPas = 'EXPLICAT' | 'NERECONCILIAT';

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
  /** EXPLICAT = intră în punte; NERECONCILIAT = se afișează, dar nu mișcă Neexplicatul. */
  statut?: StatutPas;
  /** Suma informativă a unui pas nereconciliat (evaluarea sursei lui). Nu intră în punte. */
  leiInformativ?: number;
  nrRanduri?: number;
}

/**
 * Atribuirea waste-ului față de Usage Actual din 2.9 (contractul PR #23):
 *  · doar waste-ul DEMONSTRAT inclus în Usage (declarație cu temei, pe același restaurant, aceeași
 *    fereastră, același material și UM) reduce Neexplicatul;
 *  · waste-ul exclus prin ajustare nu se scade (nu e în Usage); cel nedeterminat rămâne afișat ca
 *    „nereconciliat"; potrivirea cantitativă cu Inv Adj e o observație, nu o dovadă;
 *  · rândurile vechi de waste (fără statut) sunt nereconciliate; evaluarea lor datată e posibilă
 *    doar dacă prețul e determinabil pe fereastră.
 */
export interface AtribuireWasteFC {
  /** Există 2.9 pe material pe această cerere, deci potrivirea 2.8 ↔ Inv Adj se poate face. */
  disponibil: boolean;
  motiv: string | null;
  potrivire: Potrivire28cu29 | null;
  /** Lei 2.8 (evaluarea proprie a raportului) pe statut. */
  inclusLei: number;
  exclusLei: number;
  nedeterminatLei: number;
  /** Evenimente 2.8 intrate în potrivire. */
  evenimente: number;
  /** Evenimente 2.8 din scop, dar pe altă fereastră decât 2.9 selectat (sau fără 2.9 pe material). */
  inAfaraSelectiei: { evenimente: number; lei: number };
  /** Waste importat pe vechiul drum (fără statut): nereconciliat prin definiție. */
  vechi: { randuri: number; leiDeterminabil: number; randuriFaraPretDeterminabil: number };
  /** Ajustări 2.9 fără niciun eveniment 2.8: nu sunt waste; apar în panoul ajustărilor. */
  ajustariFaraEveniment: { coduri: number; leiEstimat: number };
  /** Nimic nedeterminat, nimic în afara selecției, niciun waste vechi, fiecare Adj cu explicație. */
  atribuireCompleta: boolean;
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
  /** Ce rămâne după pașii DISPONIBILI. Zero prin construcție — nu dovedește atribuirea (vezi `waste.atribuireCompleta`). */
  rezidualLei: number | null;
  waste: AtribuireWasteFC;
  /** Toți pașii sunt calculabili → puntea explică integral diferența. */
  complet: boolean;
  /** Compatibilitatea ferestrelor surselor. Blocarea propriu-zisă vine prin `nbo`. */
  verdictPerioade: VerdictSurse;
  surse: SursaFC[];
}

const ultimaZi = (luna: string) => { const [a, l] = luna.split('-').map(Number); return `${luna}-${String(new Date(Date.UTC(a, l, 0)).getUTCDate()).padStart(2, '0')}`; };
const seSuprapun = (a: { de: string; la: string }, b: { de: string; la: string }) => a.de <= b.la && b.de <= a.la;

const wasteGol = (motiv: string): AtribuireWasteFC => ({
  disponibil: false, motiv, potrivire: null, inclusLei: 0, exclusLei: 0, nedeterminatLei: 0, evenimente: 0,
  inAfaraSelectiei: { evenimente: 0, lei: 0 }, vechi: { randuri: 0, leiDeterminabil: 0, randuriFaraPretDeterminabil: 0 },
  ajustariFaraEveniment: { coduri: 0, leiEstimat: 0 }, atribuireCompleta: false,
});

/** Atribuirea waste-ului pe cererea dată — pură, recalculată din selecția 2.9, aliasuri și declarații. */
export function atribuireWasteFC(state: AppState, cerere: CerereFC): AtribuireWasteFC {
  const loc = locatieDin(cerere.nivel);
  const luni = luniAtinse(cerere.perioada);
  const rot2 = (x: number) => Math.round(x * 100) / 100;

  // waste-ul vechi (fără statut): nereconciliat; evaluat doar dacă prețul lunii e determinabil
  const vechi = { randuri: 0, leiDeterminabil: 0, randuriFaraPretDeterminabil: 0 };
  const ingrediente = new Map(state.ingrediente.map(i => [i.cod, i]));
  for (const w of state.waste) {
    if (!luni.includes(w.perioada) || (loc && w.locatie !== loc)) continue;
    vechi.randuri++;
    const ing = ingrediente.get(w.ingredient);
    const pret = ing ? pretDeterminabil(ing, { de: `${w.perioada}-01`, la: ultimaZi(w.perioada) }) : null;
    if (pret?.determinabil && pret.pret !== null) vechi.leiDeterminabil = rot2(vechi.leiDeterminabil + w.cant * (UMS[w.um]?.f ?? 1) * pret.pret);
    else vechi.randuriFaraPretDeterminabil++;
  }

  // evenimentele 2.8 din scop: restaurantul cerut, fereastra care atinge perioada cerută
  const inScop = (state.evenimente28 ?? []).filter(e => (!loc || e.locatie === loc) && seSuprapun(e.fereastra, cerere.perioada));

  const sel = selecteaza29(state.materiale29 ?? [], cerere.perioada, loc);
  if (!sel.disponibil) {
    const lei = rot2(inScop.reduce((s, e) => s + e.lei, 0));
    return {
      ...wasteGol(sel.motiv ?? 'Raportul 2.9 pe material nu e disponibil pe această cerere: waste-ul nu se poate confrunta cu Inv Adj.'),
      nedeterminatLei: lei, inAfaraSelectiei: { evenimente: inScop.length, lei }, vechi,
    };
  }
  // doar evenimentele de pe (restaurant, fereastră) ale versiunilor 2.9 selectate se potrivesc
  const cheiSel = new Set(sel.randuri.map(m => { const f = fereastraRand(m); return `${m.locatie ?? ''}|${f.de}|${f.la}`; }));
  const potrivibile = inScop.filter(e => cheiSel.has(`${e.locatie ?? ''}|${e.fereastra.de}|${e.fereastra.la}`));
  const inAfara = inScop.filter(e => !cheiSel.has(`${e.locatie ?? ''}|${e.fereastra.de}|${e.fereastra.la}`));

  // aliasuri APROBATE (coada comună D1): codul 2.8 → materialul 2.9 al aceluiași ingredient
  const codMaterial29 = new Set(sel.randuri.map(m => m.material));
  const ingredientAl = new Map<string, string | null>();
  const ingredientMaterial = (material: string, denumire: string) => {
    if (!ingredientAl.has(material)) ingredientAl.set(material, identificaIngredient(state.ingrediente, material, denumire));
    return ingredientAl.get(material)!;
  };
  const aliasuri: Record<string, string> = {};
  for (const e of potrivibile) {
    if (codMaterial29.has(e.cod) || aliasuri[e.cod]) continue;
    const ing = ingredientMaterial(e.cod, e.denumire);
    if (!ing) continue;
    const m = sel.randuri.find(x => x.locatie === e.locatie && ingredientMaterial(x.material, x.denumire) === ing);
    if (m) aliasuri[e.cod] = m.material;
  }

  const materialeSel = sel.randuri.map(m => (m.fereastra ? m : { ...m, fereastra: fereastraRand(m) }));
  const pot = potriveste28cu29(materialeSel, potrivibile, aliasuri, state.declaratiiIncludere ?? []);
  const leiInAfara = rot2(inAfara.reduce((s, e) => s + e.lei, 0));
  const doarAdj = pot.linii.filter(l => l.potrivire === 'FARA_EVENIMENT_28');
  const atribuireCompleta = pot.lei28Parti.NEDETERMINAT === 0 && inAfara.length === 0 && vechi.randuri === 0
    && pot.coduri.faraColoanaAdj === 0 && pot.coduri.doarAdj === 0 && pot.coduri.doarEvenimente === 0
    && pot.linii.every(l => l.parti.NEDETERMINAT.cant === 0);
  return {
    disponibil: true, motiv: null, potrivire: pot,
    inclusLei: pot.lei28Parti.INCLUS_IN_USAGE, exclusLei: pot.lei28Parti.EXCLUS_PRIN_AJUSTARE,
    nedeterminatLei: rot2(pot.lei28Parti.NEDETERMINAT + leiInAfara),
    evenimente: potrivibile.length,
    inAfaraSelectiei: { evenimente: inAfara.length, lei: leiInAfara },
    vechi,
    ajustariFaraEveniment: { coduri: doarAdj.length, leiEstimat: pot.leiEstimat29FaraEvenimente },
    atribuireCompleta,
  };
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
  const verdictPerioade = verdictCombinare(state, COMBINATIE_FC, cerere.perioada);

  const waste = atribuireWasteFC(state, cerere);
  if (!nbo.disponibil) {
    return {
      cerere, recipe, nbo, numitor, fcRecipePct, fcCuratPct, fcOperationalPct,
      diferentaLei: null, pasi: [], rezidualLei: null, waste, complet: false, verdictPerioade, surse,
    };
  }

  const diferentaLei = nbo.consumFC - recipe.cost;
  const interval = `${cerere.perioada.de} → ${cerere.perioada.la}`;
  if (waste.vechi.randuri) surse.push({ raport: 'WASTE', randuri: waste.vechi.randuri, interval });
  const nr28 = waste.evenimente + waste.inAfaraSelectiei.evenimente;
  if (nr28) surse.push({ raport: 'NBO_28', randuri: nr28, interval, nota: 'evaluarea proprie a raportului 2.8; statutul față de Usage vine din declarații' });
  const nereconciliatLei = Math.round((waste.nedeterminatLei + waste.vechi.leiDeterminabil) * 100) / 100;
  const nereconciliatRanduri = waste.evenimente + waste.inAfaraSelectiei.evenimente + waste.vechi.randuri;

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
      id: 'WASTE', componenta: null, eticheta: 'Waste demonstrat inclus în Usage Actual',
      lei: waste.inclusLei, pp: pp(waste.inclusLei), disponibil: waste.inclusLei > 0, statut: 'EXPLICAT',
      nrRanduri: waste.evenimente,
      explicatie: waste.inclusLei > 0
        ? `${waste.inclusLei.toFixed(2)} lei de waste 2.8 declarat inclus în Usage Actual (același restaurant, aceeași fereastră, `
          + 'același material și UM), la evaluarea raportului 2.8. Doar această parte reduce Neexplicatul.'
        : waste.disponibil
          ? 'Nicio cantitate de waste nu e demonstrată ca inclusă în Usage Actual: potrivirea cu Inv Adj este o observație, nu o dovadă, '
            + 'iar fără declarație cu temei nimic nu se scade din Neexplicat. Waste-ul exclus prin ajustare nu e în Usage și nu se scade.'
          : `Waste-ul nu se poate confrunta cu Inv Adj: ${waste.motiv ?? 'raportul 2.9 pe material lipsește'}.`,
    },
    {
      id: 'WASTE_NERECONCILIAT', componenta: null, eticheta: 'Waste nereconciliat (nu mișcă Neexplicatul)',
      lei: 0, pp: null, disponibil: false, statut: 'NERECONCILIAT',
      leiInformativ: nereconciliatLei, nrRanduri: nereconciliatRanduri,
      explicatie: nereconciliatRanduri
        ? `${nereconciliatRanduri} rânduri de waste fără statut demonstrat față de Usage Actual: `
          + `${waste.nedeterminatLei.toFixed(2)} lei din 2.8 (nedeterminat${waste.inAfaraSelectiei.evenimente ? `, din care ${waste.inAfaraSelectiei.lei.toFixed(2)} lei pe altă fereastră decât 2.9 selectat` : ''})`
          + (waste.vechi.randuri ? `, ${waste.vechi.randuri} rânduri vechi de waste (${waste.vechi.leiDeterminabil.toFixed(2)} lei la preț determinabil${waste.vechi.randuriFaraPretDeterminabil ? `, ${waste.vechi.randuriFaraPretDeterminabil} fără preț determinabil pe lună` : ''})` : '')
          + (waste.exclusLei ? `; separat, ${waste.exclusLei.toFixed(2)} lei sunt excluși prin ajustare (nu sunt în Usage)` : '')
          + '. Rămân în Neexplicat până la o declarație cu temei.'
        : 'Nu există waste nereconciliat pe această cerere.',
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

  // puntea se închide pe pașii DISPONIBILI care duc la FC Curat; operaționalul e după linia de
  // sosire; pașii nereconciliați poartă doar sume informative — rezidualul zero nu dovedește atribuirea
  const catreCurat = pasi.filter(p => p.id !== 'OPERATIONAL');
  const rezidualLei = diferentaLei - catreCurat.filter(p => p.disponibil).reduce((s, p) => s + p.lei, 0);

  return {
    cerere, recipe, nbo, numitor, fcRecipePct, fcCuratPct, fcOperationalPct,
    diferentaLei, pasi, rezidualLei, waste,
    complet: catreCurat.filter(p => p.statut !== 'NERECONCILIAT').every(p => p.disponibil) && waste.atribuireCompleta,
    verdictPerioade, surse,
  };
}

/** Rezumat într-o linie, pentru jurnale și verificări rapide. */
export const descrieReconciliere = (r: ReconciliationFC) =>
  `${descrieCerere(r.cerere)} · teoretic ${r.fcRecipePct?.toFixed(1) ?? '—'}% · `
  + `curat ${r.fcCuratPct?.toFixed(1) ?? '—'}% · diferență ${r.diferentaLei?.toFixed(0) ?? '—'} lei`;

export { lunaDin };
