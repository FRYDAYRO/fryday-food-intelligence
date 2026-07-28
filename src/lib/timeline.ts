// Product Intelligence Engine — ciclul de viață al unui produs, de la lansare până azi.
// Consumă motoarele existente; nu modifică niciun calcul de bază.
import type { AppState, Canal } from './types';
import {
  cheiePerioada, costLinieLa, costProdus, luna as lunaDin, pretLa, versiuneActiva,
  fmtInt, fmtLei, fmtPct, fmtPP, type Ctx,
} from './engine';
import { cicluViata, type Etapa } from './decizii';
import { scoruriProduse, type ProductHealth } from './scoruri';

// ————————————————————————————————————————————— evenimentele din viața produsului

export type TipEveniment = 'LANSARE' | 'RETETA' | 'PRET' | 'COST_INGREDIENT' | 'SCENARIU';

export interface Eveniment {
  data: string; tip: TipEveniment;
  titlu: string; detaliu: string;
  costPortie: number | null;        // costul porției InStore la acea dată, dacă se poate calcula
  inFereastra: boolean;             // avem vânzări în jurul datei pentru comparație?
}

// costul unei versiuni de rețetă, la prețurile ingredientelor valabile atunci
function costVersiune(cod: string, nrVersiune: number, dataRef: string, ctx: Ctx): number | null {
  const r = ctx.retete.get(cod);
  if (!r) return null;
  const v = r.versiuni.find(x => x.nr === nrVersiune);
  if (!v) return null;
  // context cu prețurile de la data versiunii
  const ctxAtunci: Ctx = {
    ...ctx,
    ingrediente: new Map([...ctx.ingrediente.values()].map(i => {
      const p = pretLa(i, dataRef);
      return [i.cod, p ? { ...i, preturi: [{ validDeLa: '2000-01-01', pret: p }] } : i];
    })),
    retete: new Map([...ctx.retete.values()].map(x => [x.cod, x.cod === cod ? { ...x, activa: nrVersiune } : x])),
  };
  let total = 0;
  for (const l of v.linii) {
    if (l.canal === 'DELIVERY') continue;      // referință: porția InStore
    total += costLinieLa(l, ctxAtunci).total;
  }
  return total;
}

export function evenimenteProdus(state: AppState, ctx: Ctx, cod: string): Eveniment[] {
  const ev: Eveniment[] = [];
  const vanzari = state.vanzari.filter(v => v.produs === cod);
  const prima = vanzari.length ? vanzari.reduce((m, v) => (v.data < m ? v.data : m), vanzari[0].data) : null;
  const ultima = vanzari.length ? vanzari.reduce((m, v) => (v.data > m ? v.data : m), vanzari[0].data) : null;
  const inFer = (d: string) => !!prima && !!ultima && d > prima && d < ultima;
  const p = ctx.produse.get(cod);

  if (prima) ev.push({
    data: prima, tip: 'LANSARE',
    titlu: 'Prima vânzare înregistrată',
    detaliu: `Produsul apare în PMIX începând cu ${prima}. Tot ce urmează se raportează la acest punct de pornire.`,
    costPortie: costProdus(cod, 'INSTORE', ctx, prima)?.total ?? null,
    inFereastra: false,
  });

  // versiunile de rețetă
  const r = ctx.retete.get(cod);
  if (r) {
    for (const v of r.versiuni) {
      const cost = costVersiune(cod, v.nr, v.data, ctx);
      const anterioara = r.versiuni.find(x => x.nr === v.nr - 1);
      const costAnterior = anterioara ? costVersiune(cod, anterioara.nr, v.data, ctx) : null;
      const delta = cost != null && costAnterior != null ? cost - costAnterior : null;
      ev.push({
        data: v.data, tip: 'RETETA',
        titlu: `Rețeta v${v.nr}${v.nr === r.activa ? ' (activă)' : ''}`,
        detaliu: (v.nota ?? 'Versiune de rețetă')
          + (delta != null ? ` · cost porție ${fmtLei(costAnterior)} → ${fmtLei(cost)} lei (${delta >= 0 ? '+' : ''}${fmtLei(delta)})` : ''),
        costPortie: cost, inFereastra: inFer(v.data),
      });
    }
  }

  // prețurile de vânzare
  for (const ip of p?.istoricPret ?? []) {
    ev.push({
      data: ip.data, tip: 'PRET',
      titlu: `Preț ${ip.canal === 'INSTORE' ? 'InStore' : 'Delivery'}: ${fmtLei(ip.pret)} lei`,
      detaliu: ip.nota ?? 'Modificare de preț de vânzare',
      costPortie: null, inFereastra: inFer(ip.data),
    });
  }

  // scumpirile de ingrediente care ating acest produs
  const comp = new Set<string>();
  const adauga = (codR: string) => {
    const rr = ctx.retete.get(codR);
    if (!rr) return;
    for (const l of versiuneActiva(rr).linii) {
      if (l.tipComp === 'SEMIPREPARAT') adauga(l.comp); else comp.add(l.comp);
    }
  };
  adauga(cod);
  if (p?.combo?.length) for (const c of p.combo) adauga(c.cod);
  for (const ing of state.ingrediente) {
    if (!comp.has(ing.cod)) continue;
    const ps = [...ing.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
    for (let i = 1; i < ps.length; i++) {
      const varPct = ps[i - 1].pret > 0 ? ((ps[i].pret - ps[i - 1].pret) / ps[i - 1].pret) * 100 : 0;
      ev.push({
        data: ps[i].validDeLa, tip: 'COST_INGREDIENT',
        titlu: `${ing.denumire}: ${fmtLei(ps[i - 1].pret)} → ${fmtLei(ps[i].pret)} lei/${ing.um}`,
        detaliu: `${varPct >= 0 ? 'Scumpire' : 'Ieftinire'} de ${fmtPct(Math.abs(varPct))} pe un ingredient din rețetă.`,
        costPortie: costProdus(cod, 'INSTORE', ctx, ps[i].validDeLa)?.total ?? null,
        inFereastra: inFer(ps[i].validDeLa),
      });
    }
  }

  // scenariile aplicate care ating produsul
  for (const sc of state.scenarii) {
    if (!sc.aplicat) continue;
    const atinge = sc.schimbari.some(ch =>
      ('produs' in ch && ch.produs === cod) || ('reteta' in ch && ch.reteta === cod) || ('cod' in ch && ch.cod === cod));
    if (!atinge) continue;
    ev.push({
      data: sc.aplicat, tip: 'SCENARIU',
      titlu: `Simulare aplicată: ${sc.nume}`,
      detaliu: `${sc.schimbari.length} modificări confirmate din Business Simulation.`,
      costPortie: null, inFereastra: inFer(sc.aplicat),
    });
  }

  return ev.sort((a, b) => a.data.localeCompare(b.data));
}

// ————————————————————————————————————————————— seria de performanță

export interface PunctSerie {
  perioada: string; buc: number; net: number; cost: number;
  fc: number | null; profit: number; profitUnitar: number; marja: number | null;
}

export function serieProdus(state: AppState, ctx: Ctx, cod: string, gran: 'ZI' | 'SAPTAMANA' | 'LUNA' = 'SAPTAMANA'): PunctSerie[] {
  const memo = new Map<string, unknown>();
  const acc = new Map<string, { buc: number; net: number; cost: number }>();
  for (const v of state.vanzari) {
    if (v.produs !== cod) continue;
    const k = cheiePerioada(v.data, gran);
    const a = acc.get(k) ?? { buc: 0, net: 0, cost: 0 };
    a.buc += v.cant; a.net += v.net;
    const c = costProdus(cod, v.canal as Canal, ctx, v.data, memo);
    if (c) a.cost += c.total * v.cant;
    acc.set(k, a);
  }
  return [...acc.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([perioada, a]) => ({
    perioada, buc: a.buc, net: a.net, cost: a.cost,
    fc: a.net > 0 ? (a.cost / a.net) * 100 : null,
    profit: a.net - a.cost,
    profitUnitar: a.buc > 0 ? (a.net - a.cost) / a.buc : 0,
    marja: a.net > 0 ? ((a.net - a.cost) / a.net) * 100 : null,
  }));
}

// ————————————————————————————————————————————— înainte / după o modificare

interface LaturaComparatie {
  buc: number; net: number; costUnitar: number; costUnitarIn: number; mixDlv: number;
  fc: number | null; profitUnitar: number; marja: number | null;
}

export interface Comparatie {
  data: string; zile: number;
  inainte: LaturaComparatie;
  dupa: LaturaComparatie;
  dBuc: number; dFcPP: number | null; dProfitUnitar: number; dMarjaPP: number | null;
  dProfitLunar: number;
  verdict: 'IMBUNATATIRE' | 'DEGRADARE' | 'NEUTRU';
  explicatie: string;
}

export function comparaInainteDupa(state: AppState, ctx: Ctx, cod: string, data: string, zile = 14): Comparatie | null {
  const memo = new Map<string, unknown>();
  const ref = new Date(`${data}T00:00:00Z`).getTime();
  const acc = (de: number, la: number): LaturaComparatie => {
    let buc = 0, net = 0, cost = 0, bucIn = 0, costIn = 0, bucDlv = 0;
    for (const v of state.vanzari) {
      if (v.produs !== cod) continue;
      const t = new Date(`${v.data}T00:00:00Z`).getTime();
      if (t < de || t >= la) continue;
      buc += v.cant; net += v.net;
      const c = costProdus(cod, v.canal as Canal, ctx, v.data, memo);
      if (c) cost += c.total * v.cant;
      if (v.canal === 'INSTORE') { bucIn += v.cant; if (c) costIn += c.total * v.cant; }
      else bucDlv += v.cant;
    }
    return {
      buc, net,
      costUnitar: buc > 0 ? cost / buc : 0,
      costUnitarIn: bucIn > 0 ? costIn / bucIn : 0,     // izolează efectul rețetei de mixul de canale
      mixDlv: buc > 0 ? (bucDlv / buc) * 100 : 0,
      fc: net > 0 ? (cost / net) * 100 : null,
      profitUnitar: buc > 0 ? (net - cost) / buc : 0,
      marja: net > 0 ? ((net - cost) / net) * 100 : null,
    };
  };
  const zi = 86400000;
  const inainte = acc(ref - zile * zi, ref);
  const dupa = acc(ref, ref + zile * zi);
  if (inainte.buc === 0 || dupa.buc === 0) return null;

  const dProfitUnitar = dupa.profitUnitar - inainte.profitUnitar;
  const dFcPP = dupa.fc != null && inainte.fc != null ? dupa.fc - inainte.fc : null;
  const dMarjaPP = dupa.marja != null && inainte.marja != null ? dupa.marja - inainte.marja : null;
  const bucLunar = (dupa.buc / zile) * 30;
  const dProfitLunar = dProfitUnitar * bucLunar;

  const scor = (dProfitUnitar > 0.02 ? 1 : dProfitUnitar < -0.02 ? -1 : 0)
    + (dupa.buc > inainte.buc * 1.05 ? 1 : dupa.buc < inainte.buc * 0.95 ? -1 : 0);
  const verdict: Comparatie['verdict'] = scor > 0 ? 'IMBUNATATIRE' : scor < 0 ? 'DEGRADARE' : 'NEUTRU';

  const parti: string[] = [];
  parti.push(`volum ${fmtInt(inainte.buc)} → ${fmtInt(dupa.buc)} buc (${dupa.buc >= inainte.buc ? '+' : ''}${fmtPct(inainte.buc > 0 ? ((dupa.buc - inainte.buc) / inainte.buc) * 100 : 0)})`);
  parti.push(`cost/porție ${fmtLei(inainte.costUnitar)} → ${fmtLei(dupa.costUnitar)} lei`);
  const dCostIn = dupa.costUnitarIn - inainte.costUnitarIn;
  if (Math.abs(dCostIn) > 0.001) parti.push(`din care efectul rețetei, la mix de canal constant (InStore): ${fmtLei(inainte.costUnitarIn)} → ${fmtLei(dupa.costUnitarIn)} lei (${dCostIn >= 0 ? '+' : ''}${fmtLei(dCostIn)})`);
  if (Math.abs(dupa.mixDlv - inainte.mixDlv) >= 2) parti.push(`atenție: ponderea Delivery s-a mutat de la ${fmtPct(inainte.mixDlv)} la ${fmtPct(dupa.mixDlv)}, ceea ce mișcă singur costul mediu prin ambalaj`);
  if (dFcPP != null) parti.push(`Food Cost ${fmtPct(inainte.fc)} → ${fmtPct(dupa.fc)} (${fmtPP(dFcPP)})`);
  parti.push(`profit/porție ${fmtLei(inainte.profitUnitar)} → ${fmtLei(dupa.profitUnitar)} lei`);

  return {
    data, zile, inainte, dupa, dBuc: dupa.buc - inainte.buc, dFcPP, dProfitUnitar, dMarjaPP, dProfitLunar,
    verdict,
    explicatie: `${zile} zile înainte vs ${zile} zile după: ` + parti.join('; ')
      + `. La ritmul de după, efectul este de ${dProfitLunar >= 0 ? '+' : ''}${fmtInt(dProfitLunar)} lei profit pe lună.`,
  };
}

// ————————————————————————————————————————————— traiectorie și proiecție

export interface Traiectorie {
  directie: 'IMBUNATATIRE' | 'STABIL' | 'DEGRADARE';
  pantaProfitUnitar: number;         // lei/porție per săptămână
  pantaVolum: number;                // bucăți per săptămână
  variatieFcPP: number | null;
  dovada: string;
}

// regresie liniară simplă pe indexul perioadei
function panta(valori: number[]): { m: number; r2: number } {
  const n = valori.length;
  if (n < 2) return { m: 0, r2: 0 };
  const mx = (n - 1) / 2;
  const my = valori.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  valori.forEach((y, x) => { num += (x - mx) * (y - my); den += (x - mx) ** 2; });
  const m = den > 0 ? num / den : 0;
  const b = my - m * mx;
  let ssRes = 0, ssTot = 0;
  valori.forEach((y, x) => { ssRes += (y - (m * x + b)) ** 2; ssTot += (y - my) ** 2; });
  return { m, r2: ssTot > 0 ? 1 - ssRes / ssTot : 0 };
}

export function traiectorie(serie: PunctSerie[]): Traiectorie {
  if (serie.length < 3) {
    return { directie: 'STABIL', pantaProfitUnitar: 0, pantaVolum: 0, variatieFcPP: null, dovada: 'Prea puține perioade pentru a stabili o direcție (minimum 3 săptămâni).' };
  }
  const pu = panta(serie.map(s => s.profitUnitar));
  const pv = panta(serie.map(s => s.buc));
  const fcPrim = serie[0].fc, fcUlt = serie[serie.length - 1].fc;
  const dFc = fcPrim != null && fcUlt != null ? fcUlt - fcPrim : null;

  const scor = (pu.m > 0.01 ? 1 : pu.m < -0.01 ? -1 : 0) + (pv.m > 5 ? 1 : pv.m < -5 ? -1 : 0);
  const directie: Traiectorie['directie'] = scor > 0 ? 'IMBUNATATIRE' : scor < 0 ? 'DEGRADARE' : 'STABIL';

  return {
    directie, pantaProfitUnitar: pu.m, pantaVolum: pv.m, variatieFcPP: dFc,
    dovada: `Pe ${serie.length} săptămâni: profitul pe porție se mișcă cu ${pu.m >= 0 ? '+' : ''}${fmtLei(pu.m)} lei/săptămână`
      + ` (potrivire ${fmtPct(pu.r2 * 100)}), volumul cu ${pv.m >= 0 ? '+' : ''}${fmtInt(pv.m)} buc/săptămână`
      + (dFc != null ? `, iar Food Cost-ul a trecut de la ${fmtPct(fcPrim)} la ${fmtPct(fcUlt)} (${fmtPP(dFc)})` : '') + '.',
  };
}

export interface Proiectie {
  saptamaniIstoric: number;
  profitSaptamanalMediu: number;
  proiectie4Saptamani: number;
  proiectieLunara: number;
  interval: { min: number; max: number };
  incredere: 'RIDICATA' | 'MEDIE' | 'SCAZUTA';
  metoda: string;
}

export function proiectieProfit(serie: PunctSerie[]): Proiectie | null {
  if (serie.length < 3) return null;
  const profituri = serie.map(s => s.profit);
  const { m, r2 } = panta(profituri);
  const n = profituri.length;
  const medie = profituri.reduce((s, v) => s + v, 0) / n;
  const ultim = profituri[n - 1];
  // proiecția pe 4 săptămâni: extrapolarea trendului de la ultima observație
  const proiectie4 = [1, 2, 3, 4].reduce((s, k) => s + Math.max(0, ultim + m * k), 0);
  const dev = Math.sqrt(profituri.reduce((s, v, i) => s + (v - (medie + m * (i - (n - 1) / 2))) ** 2, 0) / n);
  const incredere: Proiectie['incredere'] = n >= 8 && r2 >= 0.5 ? 'RIDICATA' : n >= 5 ? 'MEDIE' : 'SCAZUTA';
  return {
    saptamaniIstoric: n, profitSaptamanalMediu: medie,
    proiectie4Saptamani: proiectie4, proiectieLunara: (proiectie4 / 4) * (30 / 7),
    interval: { min: proiectie4 - 2 * dev, max: proiectie4 + 2 * dev },
    incredere,
    metoda: `Regresie liniară pe ${n} săptămâni de vânzări reale (potrivire ${fmtPct(r2 * 100)}), extrapolată patru săptămâni de la ultima observație. `
      + `Presupune preț, rețetă și mix neschimbate — orice modificare aplicată invalidează proiecția.`,
  };
}

// ————————————————————————————————————————————— recomandări pentru R&D

export interface RecomandareRnD {
  prioritate: 'MARE' | 'MEDIE' | 'MICA';
  actiune: string; motiv: string; unde: string;
}

export function recomandariCicluViata(state: AppState, ctx: Ctx, cod: string,
  health: ProductHealth | undefined, tr: Traiectorie, ev: Eveniment[], lunaSel: string): RecomandareRnD[] {
  const rez: RecomandareRnD[] = [];
  const tinta = state.tinte.find(t => t.locatie === 'RETEA')?.fcCurat ?? 25;
  const etapa: Etapa = cicluViata(state, ctx, lunaSel).find(c => c.cod === cod)?.etapa ?? 'MATURITATE';

  if (health && health.fc != null && health.fc > tinta) {
    rez.push({
      prioritate: 'MARE',
      actiune: `Reformulează rețeta: FC ${fmtPct(health.fc)} vs ținta ${fmtPct(tinta)}`,
      motiv: `Componenta dominantă din cost este cea care trebuie atacată prima; o reducere de 10% pe ea aduce produsul aproape de țintă.`,
      unde: 'Decision Intelligence → Recipe Optimization',
    });
  }
  if (tr.directie === 'DEGRADARE') {
    const cauza = tr.pantaProfitUnitar < -0.01 && (tr.variatieFcPP ?? 0) > 0.5
      ? 'costul crește mai repede decât prețul'
      : tr.pantaVolum < -5 ? 'volumul scade, nu marja' : 'combinație de volum și cost';
    rez.push({
      prioritate: 'MARE',
      actiune: tr.pantaVolum < -5 ? 'Testează relansarea (rețetă, porționare, promoție)' : 'Recalibrează prețul sau costul rețetei',
      motiv: `Traiectorie de degradare — ${cauza}. ${tr.dovada}`,
      unde: tr.pantaVolum < -5 ? 'R&D Lab · Promotion Simulator' : 'Business Simulation',
    });
  }
  const ultimaVersiune = [...ev].reverse().find(e => e.tip === 'RETETA');
  if (ultimaVersiune) {
    const zile = Math.round((Date.now() - new Date(`${ultimaVersiune.data}T00:00:00Z`).getTime()) / 86400000);
    if (zile > 180) rez.push({
      prioritate: 'MICA',
      actiune: 'Revizuiește rețeta — nu a fost actualizată de peste 6 luni',
      motiv: `Ultima versiune este din ${ultimaVersiune.data} (${zile} zile). Între timp, prețurile ingredientelor s-au mișcat.`,
      unde: 'Rețetar · R&D Lab',
    });
  }
  const scumpiri = ev.filter(e => e.tip === 'COST_INGREDIENT' && e.detaliu.startsWith('Scumpire'));
  if (scumpiri.length >= 1) {
    rez.push({
      prioritate: 'MEDIE',
      actiune: 'Caută sursă alternativă pentru ingredientele care s-au scumpit',
      motiv: `${scumpiri.length} scumpiri înregistrate pe ingredientele acestui produs: ${scumpiri.slice(-2).map(s => s.titlu).join('; ')}.`,
      unde: 'Supplier Intelligence',
    });
  }
  if (etapa === 'LANSARE') rez.push({
    prioritate: 'MEDIE',
    actiune: 'Monitorizează săptămânal — produsul e încă în lansare',
    motiv: 'Mixul nu s-a stabilizat; nu trage concluzii de profitabilitate înainte de 6 săptămâni de vânzări.',
    unde: 'Product Timeline',
  });
  if (etapa === 'DECLIN' && (health?.contributie ?? 0) < 3) rez.push({
    prioritate: 'MARE',
    actiune: 'Decizie de portofoliu: relansare sau retragere',
    motiv: `Produs în declin cu ${fmtPct(health?.contributie ?? 0)} din profitul rețelei. Menținerea lui costă spațiu în meniu și SKU-uri.`,
    unde: 'Decision Intelligence → Product Lifecycle',
  });
  if (!rez.length) rez.push({
    prioritate: 'MICA',
    actiune: 'Menține — produsul e în parametri',
    motiv: `Scor ${health?.scor.toFixed(0) ?? '—'}/100, traiectorie ${tr.directie === 'IMBUNATATIRE' ? 'în îmbunătățire' : 'stabilă'}.`,
    unde: '—',
  });

  const ordine = { MARE: 0, MEDIE: 1, MICA: 2 };
  return rez.sort((a, b) => ordine[a.prioritate] - ordine[b.prioritate]);
}

// ————————————————————————————————————————————— agregatorul modulului

export interface DosarProdus {
  cod: string; denumire: string;
  health: ProductHealth | undefined;
  etapa: Etapa;
  evenimente: Eveniment[];
  serie: PunctSerie[];
  traiectorie: Traiectorie;
  proiectie: Proiectie | null;
  comparatii: { ev: Eveniment; cmp: Comparatie }[];
  recomandari: RecomandareRnD[];
}

export function dosarProdus(state: AppState, ctx: Ctx, cod: string, lunaSel: string): DosarProdus {
  const health = scoruriProduse(state, ctx, lunaSel).find(h => h.cod === cod);
  const etapa = cicluViata(state, ctx, lunaSel).find(c => c.cod === cod)?.etapa ?? 'MATURITATE';
  const evenimente = evenimenteProdus(state, ctx, cod);
  const serie = serieProdus(state, ctx, cod, 'SAPTAMANA');
  const tr = traiectorie(serie);
  const comparatii = evenimente
    .filter(e => e.inFereastra && e.tip !== 'LANSARE')
    .map(ev => ({ ev, cmp: comparaInainteDupa(state, ctx, cod, ev.data) }))
    .filter((x): x is { ev: Eveniment; cmp: Comparatie } => x.cmp !== null);

  return {
    cod, denumire: ctx.produse.get(cod)?.denumire ?? cod,
    health, etapa, evenimente, serie, traiectorie: tr,
    proiectie: proiectieProfit(serie),
    comparatii,
    recomandari: recomandariCicluViata(state, ctx, cod, health, tr, evenimente, lunaSel),
  };
}

export { lunaDin };
