// Business Simulation Engine — răspunsul complet la „ce se întâmplă dacă…".
// Acoperă toate tipurile de schimbare, ajustările de mix, eliminările de produs și Prime Cost (Food + Labor).
import type { AjustareMix, AppState, Canal, Schimbare } from './types';
import {
  aplicaScenariu, costProdus, luna as lunaDin, pretNet,
  fmtInt, fmtLei, fmtPct, fmtPP, type Ctx,
} from './engine';

export interface ConfigSimulare {
  schimbari: Schimbare[];
  mix?: AjustareMix[];               // ajustări de volum introduse de utilizator (% pe produs)
  tvaNou?: number;                   // schimbare de TVA: prețul brut rămâne, netul se recalculează
  luna: string;
  locatie?: string;                  // undefined = toată rețeaua
}

export type MotivRand = 'PRET' | 'COST' | 'VOLUM' | 'NOU' | 'ELIMINAT' | 'MIXT';

export interface RandSimProdus {
  cod: string; denumire: string; categorie: string;
  buc0: number; buc1: number;
  net0: number; net1: number; cost0: number; cost1: number;
  profit0: number; profit1: number;
  fc0: number | null; fc1: number | null;
  dProfit: number; mix0: number; mix1: number;
  motiv: MotivRand;
}

export interface RandSimCategorie {
  categorie: string;
  net0: number; net1: number; cost0: number; cost1: number;
  profit0: number; profit1: number; fc0: number | null; fc1: number | null;
  dProfit: number; mixVanzari0: number; mixVanzari1: number;
}

export interface RezultatSimulare {
  luna: string; locatie: string;
  net0: number; net1: number;
  cost0: number; cost1: number; costFood1: number; costPaper1: number;
  fc0: number | null; fc1: number | null; dFcPP: number | null;
  labor: number | null; laborPct0: number | null; laborPct1: number | null;
  prime0: number | null; prime1: number | null; dPrimePP: number | null;
  profit0: number; profit1: number; dProfitLunar: number; dProfitAnual: number;
  buc0: number; buc1: number;
  produse: RandSimProdus[];
  afectate: RandSimProdus[];
  categorii: RandSimCategorie[];
  categoriiAfectate: RandSimCategorie[];
  noi: string[]; eliminate: string[];
  raspunsuri: { intrebare: string; raspuns: string }[];
}

interface Celula { buc0: number; buc1: number; net0: number; netU0: number; }

export function simuleaza(state: AppState, ctx0: Ctx, cfg: ConfigSimulare): RezultatSimulare {
  const { ctx: ctx1, produseNoi, preturiVanzare } = aplicaScenariu(state, cfg.schimbari);
  const dataRef = `${cfg.luna}-15`;
  const memo0 = new Map<string, unknown>();
  const memo1 = new Map<string, unknown>();

  // ——— volumele de bază, pe (produs × canal)
  const celule = new Map<string, Celula>();
  const cheie = (p: string, c: Canal) => `${p}|${c}`;
  for (const v of state.vanzari) {
    if (lunaDin(v.data) !== cfg.luna) continue;
    if (cfg.locatie && v.locatie !== cfg.locatie) continue;
    const k = cheie(v.produs, v.canal);
    const c = celule.get(k) ?? { buc0: 0, buc1: 0, net0: 0, netU0: 0 };
    c.buc0 += v.cant; c.buc1 += v.cant; c.net0 += v.net;
    celule.set(k, c);
  }
  for (const c of celule.values()) c.netU0 = c.buc0 > 0 ? c.net0 / c.buc0 : 0;

  // ——— ajustările de mix introduse de utilizator
  for (const a of cfg.mix ?? []) {
    for (const canal of ['INSTORE', 'DELIVERY'] as Canal[]) {
      const c = celule.get(cheie(a.produs, canal));
      if (c) c.buc1 = c.buc0 * (1 + a.deltaPct / 100);
    }
  }

  // ——— eliminările de produs, cu redistribuirea volumului
  const eliminate: string[] = [];
  for (const s of cfg.schimbari) {
    if (s.tip !== 'ELIMINA_PRODUS') continue;
    eliminate.push(s.produs);
    for (const canal of ['INSTORE', 'DELIVERY'] as Canal[]) {
      const c = celule.get(cheie(s.produs, canal));
      if (!c) continue;
      const transferat = c.buc1;
      c.buc1 = 0;
      for (const r of s.redistribuire ?? []) {
        const t = celule.get(cheie(r.produs, canal));
        if (t) t.buc1 += transferat * (r.pct / 100);
      }
    }
  }

  // ——— produsele noi (produs simplu sau combo)
  const noi: string[] = [];
  for (const pn of produseNoi) {
    noi.push(pn.produs.denumire);
    for (const [canal, buc] of [['INSTORE', pn.bucInstore], ['DELIVERY', pn.bucDelivery]] as [Canal, number][]) {
      if (!buc) continue;
      const k = cheie(pn.produs.cod, canal);
      const c = celule.get(k) ?? { buc0: 0, buc1: 0, net0: 0, netU0: 0 };
      c.buc1 += buc;
      celule.set(k, c);
    }
  }

  // ——— agregarea pe produs
  const perProdusMap = new Map<string, RandSimProdus>();
  const flags = new Map<string, { cost: boolean; volum: boolean }>();
  let net0 = 0, net1 = 0, cost0 = 0, cost1 = 0, costFood1 = 0, costPaper1 = 0, buc0 = 0, buc1 = 0;

  for (const [k, c] of celule) {
    const bara = k.lastIndexOf('|');
    const cod = k.slice(0, bara), canal = k.slice(bara + 1) as Canal;
    const p1 = ctx1.produse.get(cod);
    const p0 = ctx0.produse.get(cod);
    const nume = p1?.denumire ?? cod;
    const categorie = p1?.categorie ?? '—';

    // preț net unitar: cel realizat din PMIX, sau cel nou dacă prețul s-a schimbat / produsul e nou
    const schimbatPret = preturiVanzare.get(cod)?.some(x => x.canal === canal) ?? false;
    let netU1 = (schimbatPret || c.buc0 === 0) && p1 ? (pretNet(p1, canal) ?? 0) : c.netU0;
    if (cfg.tvaNou != null && p1) netU1 = netU1 * (1 + p1.tva / 100) / (1 + cfg.tvaNou / 100);
    const netU0 = c.buc0 > 0 ? c.netU0 : (p0 ? pretNet(p0, canal) ?? 0 : 0);

    const cu0 = costProdus(cod, canal, ctx0, dataRef, memo0)?.total ?? 0;
    const c1 = costProdus(cod, canal, ctx1, dataRef, memo1);
    const cu1 = c1?.total ?? 0;

    const r = perProdusMap.get(cod) ?? {
      cod, denumire: nume, categorie,
      buc0: 0, buc1: 0, net0: 0, net1: 0, cost0: 0, cost1: 0,
      profit0: 0, profit1: 0, fc0: null, fc1: null, dProfit: 0, mix0: 0, mix1: 0, motiv: 'MIXT' as MotivRand,
    };
    const fl = flags.get(cod) ?? { cost: false, volum: false };
    if (Math.abs(cu1 - cu0) > 1e-9) fl.cost = true;
    if (Math.abs(c.buc1 - c.buc0) > 1e-9) fl.volum = true;
    flags.set(cod, fl);

    r.buc0 += c.buc0; r.buc1 += c.buc1;
    r.net0 += netU0 * c.buc0; r.net1 += netU1 * c.buc1;
    r.cost0 += cu0 * c.buc0; r.cost1 += cu1 * c.buc1;
    perProdusMap.set(cod, r);

    net0 += netU0 * c.buc0; net1 += netU1 * c.buc1;
    cost0 += cu0 * c.buc0; cost1 += cu1 * c.buc1;
    costFood1 += (c1?.food ?? 0) * c.buc1;
    costPaper1 += (c1?.paper ?? 0) * c.buc1;
    buc0 += c.buc0; buc1 += c.buc1;
  }

  const produse = [...perProdusMap.values()].map(r => {
    r.profit0 = r.net0 - r.cost0; r.profit1 = r.net1 - r.cost1;
    r.fc0 = r.net0 > 0 ? (r.cost0 / r.net0) * 100 : null;
    r.fc1 = r.net1 > 0 ? (r.cost1 / r.net1) * 100 : null;
    r.dProfit = r.profit1 - r.profit0;
    r.mix0 = net0 > 0 ? (r.net0 / net0) * 100 : 0;
    r.mix1 = net1 > 0 ? (r.net1 / net1) * 100 : 0;
    const fl = flags.get(r.cod) ?? { cost: false, volum: false };
    const volumSchimbat = fl.volum;
    const costSchimbat = fl.cost;
    const pretSchimbat = preturiVanzare.has(r.cod);
    r.motiv = r.buc0 === 0 ? 'NOU'
      : r.buc1 === 0 ? 'ELIMINAT'
      : [pretSchimbat, costSchimbat, volumSchimbat].filter(Boolean).length > 1 ? 'MIXT'
      : pretSchimbat ? 'PRET'
      : costSchimbat ? 'COST'
      : volumSchimbat ? 'VOLUM' : 'MIXT';
    return r;
  }).sort((a, b) => a.dProfit - b.dProfit);

  const afectate = produse.filter(r => Math.abs(r.dProfit) > 0.005 || r.buc0 !== r.buc1);

  // ——— agregarea pe categorie
  const catMap = new Map<string, RandSimCategorie>();
  for (const r of produse) {
    const c = catMap.get(r.categorie) ?? {
      categorie: r.categorie, net0: 0, net1: 0, cost0: 0, cost1: 0,
      profit0: 0, profit1: 0, fc0: null, fc1: null, dProfit: 0, mixVanzari0: 0, mixVanzari1: 0,
    };
    c.net0 += r.net0; c.net1 += r.net1; c.cost0 += r.cost0; c.cost1 += r.cost1;
    catMap.set(r.categorie, c);
  }
  const categorii = [...catMap.values()].map(c => {
    c.profit0 = c.net0 - c.cost0; c.profit1 = c.net1 - c.cost1;
    c.fc0 = c.net0 > 0 ? (c.cost0 / c.net0) * 100 : null;
    c.fc1 = c.net1 > 0 ? (c.cost1 / c.net1) * 100 : null;
    c.dProfit = c.profit1 - c.profit0;
    c.mixVanzari0 = net0 > 0 ? (c.net0 / net0) * 100 : 0;
    c.mixVanzari1 = net1 > 0 ? (c.net1 / net1) * 100 : 0;
    return c;
  }).sort((a, b) => a.dProfit - b.dProfit);
  const categoriiAfectate = categorii.filter(c => Math.abs(c.dProfit) > 0.005);

  // ——— Prime Cost: Food & Paper + Labor (costul de personal rămâne fix în lei pe termen scurt)
  const laborLinii = state.labor?.filter(l => l.luna === cfg.luna && (!cfg.locatie || l.locatie === cfg.locatie)) ?? [];
  const labor = laborLinii.length ? laborLinii.reduce((s, l) => s + l.cost, 0) : null;
  const fc0 = net0 > 0 ? (cost0 / net0) * 100 : null;
  const fc1 = net1 > 0 ? (cost1 / net1) * 100 : null;
  const laborPct0 = labor != null && net0 > 0 ? (labor / net0) * 100 : null;
  const laborPct1 = labor != null && net1 > 0 ? (labor / net1) * 100 : null;
  const prime0 = fc0 != null && laborPct0 != null ? fc0 + laborPct0 : null;
  const prime1 = fc1 != null && laborPct1 != null ? fc1 + laborPct1 : null;

  const profit0 = net0 - cost0, profit1 = net1 - cost1;
  const dProfitLunar = profit1 - profit0;
  const dFcPP = fc0 != null && fc1 != null ? fc1 - fc0 : null;
  const dPrimePP = prime0 != null && prime1 != null ? prime1 - prime0 : null;

  // ——— cele opt răspunsuri
  const semn = (n: number) => (n >= 0 ? '+' : '');
  const topPlus = [...afectate].sort((a, b) => b.dProfit - a.dProfit)[0];
  const topMinus = afectate[0];
  const raspunsuri = [
    { intrebare: 'Cum se modifică Food Cost?', raspuns: `${fmtPct(fc0)} → ${fmtPct(fc1)} (${fmtPP(dFcPP)}) · cost ${fmtInt(cost0)} → ${fmtInt(cost1)} lei` },
    {
      intrebare: 'Cum se modifică Prime Cost?',
      raspuns: prime0 != null
        ? `${fmtPct(prime0)} → ${fmtPct(prime1)} (${fmtPP(dPrimePP)}) · Labor ${fmtInt(labor)} lei fix = ${fmtPct(laborPct0)} → ${fmtPct(laborPct1)} din vânzări`
        : 'Nu există cost de personal înregistrat pentru această lună — completează-l în Setări pentru a vedea Prime Cost.',
    },
    { intrebare: 'Cât profit câștig?', raspuns: `${fmtInt(profit0)} → ${fmtInt(profit1)} lei (${semn(dProfitLunar)}${fmtInt(dProfitLunar)} lei)` },
    { intrebare: 'Care este impactul pe lună?', raspuns: `${semn(dProfitLunar)}${fmtInt(dProfitLunar)} lei profit · vânzări ${semn(net1 - net0)}${fmtInt(net1 - net0)} lei · ${fmtInt(buc1 - buc0)} bucăți` },
    { intrebare: 'Care este impactul pe an?', raspuns: `${semn(dProfitLunar)}${fmtInt(dProfitLunar * 12)} lei profit (run-rate pe 12 luni)` },
    {
      intrebare: 'Ce alte produse sunt afectate?',
      raspuns: afectate.length
        ? `${afectate.length} produse: ${afectate.slice(0, 5).map(r => `${r.denumire} (${semn(r.dProfit)}${fmtInt(r.dProfit)} lei)`).join(', ')}${afectate.length > 5 ? ' …' : ''}`
        : 'Niciun produs nu își schimbă costul, prețul sau volumul.',
    },
    {
      intrebare: 'Ce categorie este afectată?',
      raspuns: categoriiAfectate.length
        ? categoriiAfectate.map(c => `${c.categorie}: ${semn(c.dProfit)}${fmtInt(c.dProfit)} lei, FC ${fmtPct(c.fc0)} → ${fmtPct(c.fc1)}`).join(' · ')
        : 'Nicio categorie nu este afectată.',
    },
    {
      intrebare: 'Cum se modifică mixul de vânzări?',
      raspuns: (cfg.mix?.length || eliminate.length || noi.length)
        ? afectate.filter(r => Math.abs(r.mix1 - r.mix0) >= 0.05)
            .map(r => `${r.denumire} ${fmtPct(r.mix0)} → ${fmtPct(r.mix1)}`).slice(0, 6).join(' · ') || 'Ponderile rămân practic neschimbate.'
        : 'Mix neschimbat — simularea rulează pe volumele reale din PMIX.',
    },
  ];

  // trimiterea explicită la câștigători/pierzători, utilă în rezumat
  if (topPlus && topPlus.dProfit > 0) raspunsuri[5].raspuns += ` | cel mai mare câștig: ${topPlus.denumire} (${fmtLei(topPlus.dProfit, 0)} lei)`;
  if (topMinus && topMinus.dProfit < 0) raspunsuri[5].raspuns += ` | cea mai mare pierdere: ${topMinus.denumire} (${fmtLei(topMinus.dProfit, 0)} lei)`;

  return {
    luna: cfg.luna, locatie: cfg.locatie ?? 'RETEA',
    net0, net1, cost0, cost1, costFood1, costPaper1,
    fc0, fc1, dFcPP, labor, laborPct0, laborPct1, prime0, prime1, dPrimePP,
    profit0, profit1, dProfitLunar, dProfitAnual: dProfitLunar * 12,
    buc0, buc1, produse, afectate, categorii, categoriiAfectate, noi, eliminate, raspunsuri,
  };
}
