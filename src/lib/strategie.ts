// Business Strategy Simulator — simulează decizii la nivel de rețea, nu de produs.
// Traduce pârghiile strategice în schimbări concrete, le trece prin motorul de simulare
// și construiește contul de profit: vânzări → Food & Paper → Labor → Prime Cost → costuri de operare → EBITDA.
import type { AppState, Schimbare } from './types';
import {
  costLinieLa, pretCurent, versiuneActiva, perProdus, volumeLuna,
  fmtInt, fmtPct, fmtPP, type Ctx,
} from './engine';
import { simuleaza, type RezultatSimulare } from './simulare';

export interface PargheiStrategie {
  eliminaCategorie?: string;                 // categoria scoasă din meniu
  transferCategoriePct?: number;             // % din volumul ei preluat de restul meniului
  pretGlobalPct?: number;                    // modificarea tuturor prețurilor (%)
  tvaNou?: number;                           // schimbarea cotei de TVA
  furnizoriOptimi?: boolean;                 // mută fiecare ingredient pe cea mai bună ofertă
  retetePct?: number;                        // reduce cu X% cea mai scumpă linie din fiecare rețetă
  restauranteNoi?: number;                   // câte restaurante se deschid
  rampaPct?: number;                         // % din vânzările medii pe care le ating în primul an
  lanseazaMeniuRnD?: boolean;                // publică variantele aprobate din R&D Lab
}

export interface LinieCont {
  eticheta: string;
  valoare0: number; valoare1: number;
  pct0: number | null; pct1: number | null;   // ca % din vânzări nete
  esteCost: boolean;
}

export interface RezultatStrategie {
  pargheiAplicate: string[];
  schimbari: Schimbare[];
  sim: RezultatSimulare;
  restaurante0: number; restaurante1: number;
  net0: number; net1: number;
  foodPaper0: number; foodPaper1: number; fc0: number | null; fc1: number | null;
  labor0: number; labor1: number; laborPct0: number | null; laborPct1: number | null;
  prime0: number | null; prime1: number | null;
  operare0: number; operare1: number;
  ebitda0: number; ebitda1: number; ebitdaPct0: number | null; ebitdaPct1: number | null;
  marja0: number | null; marja1: number | null;
  cont: LinieCont[];
  concluzie: string;
  avertismente: string[];
}

// pârghiile strategice → lista de schimbări concrete pe care le înțelege motorul de simulare
export function construiesteSchimbari(state: AppState, ctx: Ctx, p: PargheiStrategie, lunaSel: string): { schimbari: Schimbare[]; etichete: string[] } {
  const schimbari: Schimbare[] = [];
  const etichete: string[] = [];

  if (p.eliminaCategorie) {
    const inCategorie = state.produse.filter(x => x.categorie === p.eliminaCategorie && x.activ);
    const raman = state.produse.filter(x => x.categorie !== p.eliminaCategorie && x.activ && x.tip !== 'COMBO');
    const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
    const bucRaman = raman.reduce((s, x) => s + (rows.find(r => r.cod === x.cod)?.buc ?? 0), 0);
    const pctTotal = p.transferCategoriePct ?? 0;
    for (const prod of inCategorie) {
      // volumul se împarte proporțional cu ponderea produselor rămase
      const redistribuire = pctTotal > 0 && bucRaman > 0
        ? raman.map(x => ({ produs: x.cod, pct: (pctTotal * (rows.find(r => r.cod === x.cod)?.buc ?? 0)) / bucRaman }))
          .filter(x => x.pct > 0.01)
        : undefined;
      schimbari.push({ tip: 'ELIMINA_PRODUS', produs: prod.cod, redistribuire });
    }
    etichete.push(`Eliminarea categoriei „${p.eliminaCategorie}" (${inCategorie.length} produse)`
      + (pctTotal > 0 ? `, cu ${pctTotal}% din volum preluat de restul meniului` : ', fără transfer de volum'));
  }

  if (p.pretGlobalPct) {
    for (const prod of state.produse) {
      if (!prod.activ) continue;
      if (prod.pretInstore) schimbari.push({ tip: 'PRET_VANZARE', produs: prod.cod, canal: 'INSTORE', pretNou: +(prod.pretInstore * (1 + p.pretGlobalPct / 100)).toFixed(2) });
      if (prod.pretDelivery) schimbari.push({ tip: 'PRET_VANZARE', produs: prod.cod, canal: 'DELIVERY', pretNou: +(prod.pretDelivery * (1 + p.pretGlobalPct / 100)).toFixed(2) });
    }
    etichete.push(`Modificarea tuturor prețurilor cu ${p.pretGlobalPct > 0 ? '+' : ''}${p.pretGlobalPct}%`);
  }

  if (p.furnizoriOptimi) {
    let n = 0;
    for (const ing of state.ingrediente) {
      const pc = pretCurent(ing);
      const best = state.pretFurnizori.filter(o => o.ingredient === ing.cod && o.pret < pc).sort((a, b) => a.pret - b.pret)[0];
      if (!best) continue;
      schimbari.push({ tip: 'FURNIZOR', ingredient: ing.cod, furnizorNou: best.furnizor, pretNou: best.pret });
      n++;
    }
    if (n) etichete.push(`Mutarea a ${n} ingrediente pe cea mai bună ofertă de furnizor`);
  }

  if (p.retetePct) {
    let n = 0;
    for (const r of state.retete) {
      if (r.tip !== 'PRODUS') continue;
      const v = versiuneActiva(r);
      let best = -1, bestCost = 0;
      v.linii.forEach((l, i) => {
        if (l.tipComp === 'AMBALAJ' || (l.um !== 'g' && l.um !== 'ml') || l.cant < 20) return;
        const c = costLinieLa(l, ctx).total;
        if (c > bestCost) { bestCost = c; best = i; }
      });
      if (best < 0) continue;
      const cant = v.linii[best].cant;
      schimbari.push({ tip: 'GRAMAJ', reteta: r.cod, linie: best, cantNoua: Math.round(cant * (1 - p.retetePct / 100)) });
      n++;
    }
    if (n) etichete.push(`Reformularea a ${n} rețete (−${p.retetePct}% pe componenta cea mai scumpă)`);
  }

  if (p.lanseazaMeniuRnD) {
    const aprobate = state.rnd.filter(v => v.status === 'APROBAT' && v.linii.length && v.pretInstore > 0);
    for (const v of aprobate) {
      schimbari.push({
        tip: 'PRODUS_NOU', cod: v.cod, denumire: v.denumire || v.nume, tva: v.tva,
        pretInstore: v.pretInstore, pretDelivery: v.pretDelivery || v.pretInstore,
        linii: v.linii, bucInstore: v.bucInstore, bucDelivery: v.bucDelivery,
      });
    }
    if (aprobate.length) etichete.push(`Lansarea a ${aprobate.length} produse aprobate în R&D Lab`);
    else etichete.push('Lansare meniu nou: nicio variantă aprobată în R&D Lab');
  }

  if (p.tvaNou != null) etichete.push(`Schimbarea TVA la ${p.tvaNou}% (prețurile brute rămân aceleași)`);
  if (p.restauranteNoi) etichete.push(`Deschiderea a ${p.restauranteNoi} restaurante noi, la ${p.rampaPct ?? 70}% din vânzările medii`);

  return { schimbari, etichete };
}

export function simuleazaStrategie(state: AppState, ctx: Ctx, p: PargheiStrategie, lunaSel: string): RezultatStrategie {
  const { schimbari, etichete } = construiesteSchimbari(state, ctx, p, lunaSel);
  const sim = simuleaza(state, ctx, { schimbari, tvaNou: p.tvaNou, luna: lunaSel });

  const locatii = state.locatii.length || 1;
  const noi = p.restauranteNoi ?? 0;
  const rampa = (p.rampaPct ?? 70) / 100;

  const labor0 = state.labor.filter(l => l.luna === lunaSel).reduce((s, l) => s + l.cost, 0);
  const op = state.costuriOperare.filter(o => o.luna === lunaSel);
  const operare0 = op.reduce((s, o) => s + o.chirie + o.utilitati + o.altele, 0);

  // restaurantele noi: vânzările și costurile variabile intră cu rampă, cele fixe integral
  const factorVanzari = 1 + (noi * rampa) / locatii;
  const net1 = sim.net1 * factorVanzari;
  const foodPaper1 = sim.cost1 * factorVanzari;
  const labor1 = labor0 * (1 + (noi * Math.max(rampa, 0.8)) / locatii);   // personalul nu scalează sub ~80%
  const operare1 = operare0 * (1 + noi / locatii);                        // chiria și utilitățile intră integral

  const pct = (v: number, baza: number) => (baza > 0 ? (v / baza) * 100 : null);
  const ebitda0 = sim.net0 - sim.cost0 - labor0 - operare0;
  const ebitda1 = net1 - foodPaper1 - labor1 - operare1;

  const cont: LinieCont[] = [
    { eticheta: 'Vânzări nete', valoare0: sim.net0, valoare1: net1, pct0: 100, pct1: 100, esteCost: false },
    { eticheta: 'Food & Paper Cost', valoare0: sim.cost0, valoare1: foodPaper1, pct0: pct(sim.cost0, sim.net0), pct1: pct(foodPaper1, net1), esteCost: true },
    { eticheta: 'Marjă brută', valoare0: sim.net0 - sim.cost0, valoare1: net1 - foodPaper1, pct0: pct(sim.net0 - sim.cost0, sim.net0), pct1: pct(net1 - foodPaper1, net1), esteCost: false },
    { eticheta: 'Labor', valoare0: labor0, valoare1: labor1, pct0: pct(labor0, sim.net0), pct1: pct(labor1, net1), esteCost: true },
    { eticheta: 'Prime Cost', valoare0: sim.cost0 + labor0, valoare1: foodPaper1 + labor1, pct0: pct(sim.cost0 + labor0, sim.net0), pct1: pct(foodPaper1 + labor1, net1), esteCost: true },
    { eticheta: 'Costuri de operare (chirie, utilități, altele)', valoare0: operare0, valoare1: operare1, pct0: pct(operare0, sim.net0), pct1: pct(operare1, net1), esteCost: true },
    { eticheta: 'EBITDA estimat', valoare0: ebitda0, valoare1: ebitda1, pct0: pct(ebitda0, sim.net0), pct1: pct(ebitda1, net1), esteCost: false },
  ];

  const dEbitda = ebitda1 - ebitda0;
  const dFc = sim.dFcPP;
  const concluzie = `${dEbitda >= 0 ? 'Scenariul creează valoare' : 'Scenariul distruge valoare'}: EBITDA ${fmtInt(ebitda0)} → ${fmtInt(ebitda1)} lei/lună `
    + `(${dEbitda >= 0 ? '+' : ''}${fmtInt(dEbitda)} lei/lună, ${dEbitda >= 0 ? '+' : ''}${fmtInt(dEbitda * 12)} lei/an), `
    + `Food Cost ${fmtPP(dFc)}, vânzări ${net1 >= sim.net0 ? '+' : ''}${fmtInt(net1 - sim.net0)} lei/lună.`;

  const avertismente: string[] = [];
  if (!labor0) avertismente.push('Nu există cost de personal pentru luna selectată — Prime Cost și EBITDA sunt incomplete. Completează în Setări.');
  if (!operare0) avertismente.push('Nu există costuri de operare pentru luna selectată — EBITDA nu include chiria și utilitățile.');
  if (noi > 0) avertismente.push(`Restaurantele noi sunt estimate din media rețelei: vânzări la ${(rampa * 100).toFixed(0)}%, personal la minimum 80%, chiria și utilitățile integral. Nu includ investiția inițială (CAPEX) și nici perioada de deschidere.`);
  if (p.pretGlobalPct && p.pretGlobalPct > 0) avertismente.push('Creșterea generalizată de preț este simulată la volum constant — elasticitatea reală se testează în Promotion Simulator sau prin scenarii de mix.');
  if (p.tvaNou != null) avertismente.push('Schimbarea de TVA presupune prețuri brute neschimbate: tot efectul se duce în vânzările nete și în marjă.');
  avertismente.push('EBITDA exclude amortizarea, dobânzile și impozitul; Cash Flow necesită date financiare care nu sunt încă în aplicație.');

  return {
    pargheiAplicate: etichete, schimbari, sim,
    restaurante0: locatii, restaurante1: locatii + noi,
    net0: sim.net0, net1,
    foodPaper0: sim.cost0, foodPaper1,
    fc0: sim.fc0, fc1: pct(foodPaper1, net1),
    labor0, labor1, laborPct0: pct(labor0, sim.net0), laborPct1: pct(labor1, net1),
    prime0: pct(sim.cost0 + labor0, sim.net0), prime1: pct(foodPaper1 + labor1, net1),
    operare0, operare1,
    ebitda0, ebitda1, ebitdaPct0: pct(ebitda0, sim.net0), ebitdaPct1: pct(ebitda1, net1),
    marja0: pct(sim.net0 - sim.cost0, sim.net0), marja1: pct(net1 - foodPaper1, net1),
    cont, concluzie, avertismente,
  };
}

// util pentru interfață: categoriile cu ponderea lor, ca utilizatorul să știe ce elimină
export function categoriiCuPondere(state: AppState, ctx: Ctx, lunaSel: string) {
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, vedere: 'TOTAL' });
  const net = rows.reduce((s, r) => s + r.net, 0);
  const m = new Map<string, { net: number; profit: number; nr: number }>();
  for (const r of rows) {
    const c = m.get(r.categorie) ?? { net: 0, profit: 0, nr: 0 };
    c.net += r.net; c.profit += r.profit; c.nr++;
    m.set(r.categorie, c);
  }
  return [...m.entries()].map(([categorie, c]) => ({
    categorie, nr: c.nr, net: c.net, profit: c.profit,
    mix: net > 0 ? (c.net / net) * 100 : 0,
    eticheta: `${categorie} — ${c.nr} produse, ${fmtPct(net > 0 ? (c.net / net) * 100 : 0)} din vânzări, ${fmtInt(c.profit)} lei profit`,
  })).sort((a, b) => b.net - a.net);
}

export { volumeLuna };
