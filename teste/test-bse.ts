import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, aplicaScenariu, impactRetea, kpiProdus, volumeLuna, perProdus, aplicaInDate } from '../src/lib/engine';
import { simuleaza } from '../src/lib/simulare';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx = buildCtx(s0);
const L = '2026-07';

console.log('— Baseline: simularea goală = realitatea —');
const zero = simuleaza(s0, ctx, { schimbari: [], luna: L });
const agg = perProdus(s0.vanzari, ctx, { luna: L, vedere: 'TOTAL' });
t('vânzări nete = PMIX', aprox(zero.net0, agg.reduce((s, r) => s + r.net, 0), 0.5), `${zero.net0.toFixed(0)} lei`);
t('fără schimbări: înainte = după', aprox(zero.dProfitLunar, 0, 0.01) && aprox(zero.dFcPP ?? 0, 0, 0.001));
t('niciun produs afectat', zero.afectate.length === 0);
t('8 răspunsuri generate', zero.raspunsuri.length === 8 && zero.raspunsuri.every(r => r.raspuns.length > 5));

console.log('— Prime Cost (Food & Paper + Labor) —');
const labor = s0.labor.filter(l => l.luna === L).reduce((s, l) => s + l.cost, 0);
t('labor preluat din date', zero.labor === labor, `${labor} lei`);
t('Labor % = labor / vânzări nete', aprox(zero.laborPct0!, (labor / zero.net0) * 100, 0.01), `${zero.laborPct0!.toFixed(1)}%`);
t('Prime Cost = FC + Labor %', aprox(zero.prime0!, zero.fc0! + zero.laborPct0!, 1e-9), `${zero.prime0!.toFixed(1)}%`);
t('răspunsul de Prime Cost citează Labor-ul fix', zero.raspunsuri[1].raspuns.includes('Labor'));

console.log('— Schimbare de preț: coerent cu motorul de impact —');
const cfgPret = { schimbari: [{ tip: 'PRET_VANZARE' as const, produs: 'P005', canal: 'INSTORE' as const, pretNou: 9.9 }], luna: L };
const sim = simuleaza(s0, ctx, cfgPret);
const a = aplicaScenariu(s0, cfgPret.schimbari);
const ref = impactRetea(s0, ctx, a.ctx, a.produseNoi, a.preturiVanzare, L);
t('Δ profit = impactRetea', aprox(sim.dProfitLunar, ref.dupa.profit - ref.inainte.profit, 1), `${sim.dProfitLunar.toFixed(0)} vs ${(ref.dupa.profit - ref.inainte.profit).toFixed(0)}`);
t('FC scade la creșterea prețului', (sim.dFcPP ?? 0) < 0, `${sim.dFcPP?.toFixed(2)} pp`);
t('Prime Cost scade și el (vânzări mai mari, labor fix)', (sim.dPrimePP ?? 0) < 0, `${sim.dPrimePP?.toFixed(2)} pp`);
t('impact anual = 12 × lunar', aprox(sim.dProfitAnual, sim.dProfitLunar * 12, 0.01));
t('doar produsul modificat e afectat', sim.afectate.length === 1 && sim.afectate[0].cod === 'P005', sim.afectate.map(x => x.cod).join(','));
t('motivul rândului = PRET', sim.afectate[0].motiv === 'PRET');
t('categoria Băuturi apare ca afectată', sim.categoriiAfectate.length === 1, sim.categoriiAfectate.map(c => c.categorie).join(','));

console.log('— Schimbare de cost: cascadă prin semipreparat —');
const simCost = simuleaza(s0, ctx, { schimbari: [{ tip: 'PRET_INGREDIENT', ingredient: 'I001', pretNou: 16 }], luna: L });
t('4 produse afectate prin cascadă', simCost.afectate.length === 4, simCost.afectate.map(x => x.cod).join(','));
t('toate au motivul COST', simCost.afectate.every(r => r.motiv === 'COST'));
t('Δ profit ≈ −697 lei (Δpreț × consum)', aprox(simCost.dProfitLunar, -697, 2), simCost.dProfitLunar.toFixed(0));
t('Σ Δ pe produse = Δ total', aprox(simCost.afectate.reduce((s, r) => s + r.dProfit, 0), simCost.dProfitLunar, 0.5));

console.log('— Eliminarea unui produs, cu redistribuire —');
const vol = volumeLuna(s0, L);
const bucSos = (vol.get('P007')?.bucIn ?? 0) + (vol.get('P007')?.bucDlv ?? 0);
const elim = simuleaza(s0, ctx, {
  schimbari: [{ tip: 'ELIMINA_PRODUS', produs: 'P007', redistribuire: [{ produs: 'P001', pct: 50 }] }], luna: L,
});
const rSos = elim.produse.find(r => r.cod === 'P007')!;
const rBurger = elim.produse.find(r => r.cod === 'P001')!;
t('volumul produsului eliminat devine 0', rSos.buc1 === 0 && rSos.buc0 === bucSos, `${bucSos} buc`);
t('50% din volum se transferă', aprox(rBurger.buc1 - rBurger.buc0, bucSos * 0.5, 0.5), `+${(rBurger.buc1 - rBurger.buc0).toFixed(0)} buc`);
t('motivele: ELIMINAT și VOLUM', rSos.motiv === 'ELIMINAT' && rBurger.motiv === 'VOLUM');
t('mixul de vânzări se recalculează', rSos.mix1 === 0 && rBurger.mix1 > rBurger.mix0);
t('răspunsul de mix descrie mutarea', /→/.test(elim.raspunsuri[7].raspuns), elim.raspunsuri[7].raspuns.slice(0, 60));
// verificare independentă, pe canale (costul de ambalaj diferă între InStore și Delivery)
const v7 = vol.get('P007')!;
const pu = (cod: string, canal: 'INSTORE' | 'DELIVERY') => kpiProdus(cod, canal, ctx)!.profit!;
const asteptat = 0.5 * (v7.bucIn * pu('P001', 'INSTORE') + v7.bucDlv * pu('P001', 'DELIVERY'))
  - (v7.bucIn * pu('P007', 'INSTORE') + v7.bucDlv * pu('P007', 'DELIVERY'));
t('Δ profit = 50% × volum transferat × profit burger − profitul sosului', aprox(elim.dProfitLunar, asteptat, 1), `${elim.dProfitLunar.toFixed(0)} vs ${asteptat.toFixed(0)}`);

console.log('— Combo nou —');
const combo = simuleaza(s0, ctx, {
  schimbari: [{
    tip: 'COMBO_NOU', cod: 'CB01', denumire: 'Combo Wrap & Cartofi',
    componente: [{ cod: 'P004', cant: 1 }, { cod: 'P003', cant: 1 }],
    pretInstore: 26.9, pretDelivery: 29.9, tva: 10, bucInstore: 400, bucDelivery: 200,
  }], luna: L,
});
const rC = combo.produse.find(r => r.cod === 'CB01')!;
t('combo-ul apare ca produs nou', rC.motiv === 'NOU' && rC.buc0 === 0 && rC.buc1 === 600);
t('costul comboului = suma componentelor', rC.cost1 > 0 && aprox(rC.cost1 / rC.buc1,
  ((kpiProdus('P004', 'INSTORE', ctx)!.cost!.total + kpiProdus('P003', 'INSTORE', ctx)!.cost!.total) * 400
   + (kpiProdus('P004', 'DELIVERY', ctx)!.cost!.total + kpiProdus('P003', 'DELIVERY', ctx)!.cost!.total) * 200) / 600, 0.01));
t('profitul crește (produs nou, volum incremental)', combo.dProfitLunar > 0, `+${combo.dProfitLunar.toFixed(0)} lei`);
t('FC-ul rețelei se modifică', combo.dFcPP != null && Math.abs(combo.dFcPP) > 0.01, `${combo.dFcPP?.toFixed(2)} pp`);
t('numele comboului apare în „produse noi"', combo.noi.includes('Combo Wrap & Cartofi'));

console.log('— Scenariu de mix definit de utilizator —');
const mix = simuleaza(s0, ctx, { schimbari: [], mix: [{ produs: 'P001', deltaPct: 10 }, { produs: 'P005', deltaPct: -20 }], luna: L });
const mBurger = mix.produse.find(r => r.cod === 'P001')!;
const mCola = mix.produse.find(r => r.cod === 'P005')!;
t('volumele urmează procentele', aprox(mBurger.buc1, mBurger.buc0 * 1.1, 0.5) && aprox(mCola.buc1, mCola.buc0 * 0.8, 0.5));
t('mixul de vânzări se mută', mBurger.mix1 > mBurger.mix0 && mCola.mix1 < mCola.mix0);
t('FC scade (mai mult burger cu FC mic, mai puțină cola scumpă)', (mix.dFcPP ?? 0) < 0, `${mix.dFcPP?.toFixed(2)} pp`);
t('profitul crește', mix.dProfitLunar > 0, `+${mix.dProfitLunar.toFixed(0)} lei`);
t('Prime Cost se îmbunătățește', (mix.dPrimePP ?? 0) < 0);

console.log('— Scenariu combinat (preț + gramaj + mix) —');
const comb = simuleaza(s0, ctx, {
  schimbari: [
    { tip: 'PRET_VANZARE', produs: 'P001', canal: 'INSTORE', pretNou: 20.9 },
    { tip: 'GRAMAJ', reteta: 'P001', linie: 1, cantNoua: 110 },
  ],
  mix: [{ produs: 'P001', deltaPct: -5 }],
  luna: L,
});
t('motivul devine MIXT', comb.produse.find(r => r.cod === 'P001')!.motiv === 'MIXT');
t('răspunsurile acoperă toate cele 8 întrebări', comb.raspunsuri.length === 8 && comb.raspunsuri.every(r => r.raspuns.length > 10));
t('Σ profit pe categorii = profit total', aprox(comb.categorii.reduce((s, c) => s + c.profit1, 0), comb.profit1, 0.5));
t('Σ vânzări pe categorii = total', aprox(comb.categorii.reduce((s, c) => s + c.net1, 0), comb.net1, 0.5));
t('mixurile pe categorii însumează 100%', aprox(comb.categorii.reduce((s, c) => s + c.mixVanzari1, 0), 100, 0.05));

console.log('— Aplicarea în datele reale —');
const sElim = aplicaInDate(s0, { nume: 'Scoate sosul', schimbari: [{ tip: 'ELIMINA_PRODUS', produs: 'P007' }] });
t('produsul eliminat devine inactiv', sElim.produse.find(p => p.cod === 'P007')!.activ === false);
const sCombo = aplicaInDate(s0, {
  nume: 'Combo nou', schimbari: [{
    tip: 'COMBO_NOU', cod: 'CB02', denumire: 'Combo Test', componente: [{ cod: 'P001', cant: 1 }, { cod: 'P003', cant: 1 }],
    pretInstore: 25, pretDelivery: 28, tva: 10, bucInstore: 100, bucDelivery: 50,
  }],
});
const pCombo = sCombo.produse.find(p => p.cod === 'CB02')!;
t('comboul intră în nomenclator cu componente', pCombo.tip === 'COMBO' && pCombo.combo?.length === 2);
t('costul comboului publicat se calculează', (kpiProdus('CB02', 'INSTORE', buildCtx(sCombo))?.cost?.total ?? 0) > 0);

console.log('— Performanță —');
const t0 = Date.now();
for (let i = 0; i < 10; i++) simuleaza(s0, ctx, { schimbari: [{ tip: 'PRET_INGREDIENT', ingredient: 'I001', pretNou: 15 + i / 10 }], mix: [{ produs: 'P001', deltaPct: i }], luna: L });
const t1 = Date.now();
console.log(`  10 simulări complete: ${t1 - t0} ms (${((t1 - t0) / 10).toFixed(1)} ms/simulare)`);
t('o simulare < 100 ms', (t1 - t0) / 10 < 100);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
