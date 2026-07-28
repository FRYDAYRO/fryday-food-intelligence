import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, perProdus, evolutieGranulara, cheiePerioada, recomandari, analizaPromo, aplicaScenariu, impactRetea, kpiProdus } from '../src/lib/engine';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx = buildCtx(s0);

console.log('— Profit Intelligence: ROI + contribuții —');
const rows = perProdus(s0.vanzari, ctx, { luna: '2026-07', vedere: 'TOTAL' });
t('ROI = profit/cost', rows.every(r => r.roi == null || aprox(r.roi, (r.profit / r.cost) * 100, 0.01)));
t('Σ contribuție profit = 100%', aprox(rows.reduce((s, r) => s + r.contributie, 0), 100, 0.01));
t('Σ % din Food Cost = 100%', aprox(rows.reduce((s, r) => s + r.mixCost, 0), 100, 0.01));
t('Σ % din costul ingredientelor = 100%', aprox(rows.reduce((s, r) => s + r.mixFood, 0), 100, 0.01));
t('food+paper = cost pe fiecare rând', rows.every(r => aprox(r.costFood + r.costPaper, r.cost, 0.01)));

console.log('— Evoluție granulară —');
t('cheie săptămână ISO: 2026-07-15 → 2026-S29', cheiePerioada('2026-07-15', 'SAPTAMANA') === '2026-S29', cheiePerioada('2026-07-15', 'SAPTAMANA'));
t('cheie an', cheiePerioada('2026-07-15', 'AN') === '2026');
const zi = evolutieGranulara('P001', s0.vanzari, ctx, 'TOTAL', 'ZI');
const sapt = evolutieGranulara('P001', s0.vanzari, ctx, 'TOTAL', 'SAPTAMANA');
const an = evolutieGranulara('P001', s0.vanzari, ctx, 'TOTAL', 'AN');
const sumZi = zi.reduce((s, x) => s + x.profit, 0);
t('Σ zile = Σ săptămâni = Σ an (profit)', aprox(sumZi, sapt.reduce((s, x) => s + x.profit, 0), 0.01) && aprox(sumZi, an.reduce((s, x) => s + x.profit, 0), 0.01), `${sumZi.toFixed(0)} lei`);
t('56 de zile de vânzări', zi.length === 56, String(zi.length));

console.log('— Smart Recommendations —');
const recs = recomandari(s0, ctx, '2026-07');
t('există recomandări', recs.length >= 4, `${recs.length} recomandări`);
const tipuri = new Set(recs.map(r => r.tip));
t('cel puțin 4 tipuri distincte (PRET, GRAMAJ, FURNIZOR…)', tipuri.size >= 4 && tipuri.has('PRET') && tipuri.has('FURNIZOR'), [...tipuri].join(','));
const rFz = recs.find(r => r.tip === 'FURNIZOR');
t('furnizorul cu cea mai mare economie în LEI e primul (AviAlt/piept)', !!rFz && rFz.titlu.includes('AviAlt') && (rFz.impactProfitLunar ?? 0) > 0, rFz?.titlu ?? 'lipsă');
const rPret = recs.find(r => r.tip === 'PRET');
if (rPret) {
  const X = Number(rPret.titlu.match(/cu ([\d,]+) RON/)?.[1].replace(',', '.'));
  const p = s0.produse.find(x => x.cod === rPret.produs)!;
  const { ctx: c1, produseNoi, preturiVanzare } = aplicaScenariu(s0, [{ tip: 'PRET_VANZARE', produs: p.cod, canal: 'INSTORE', pretNou: +(p.pretInstore! + X).toFixed(2) }]);
  const imp = impactRetea(s0, ctx, c1, produseNoi, preturiVanzare, '2026-07');
  t('impactul din recomandarea de preț = simularea directă', aprox(rPret.impactProfitLunar!, imp.dupa.profit - imp.inainte.profit, 0.5), `${rPret.impactProfitLunar?.toFixed(0)} lei`);
  const kVechi = kpiProdus(p.cod, 'INSTORE', ctx)!;
  const kNou = kpiProdus(p.cod, 'INSTORE', c1)!;
  const laTinta = rPret.motiv.includes('aduce FC-ul produsului la țintă');
  t('prețul recomandat reduce FC-ul produsului' + (laTinta ? ' până la țintă' : ' (plafonat +10%)'),
    laTinta ? kNou.fc! <= 21.05 : kNou.fc! < kVechi.fc!, `${kVechi.fc!.toFixed(1)}% → ${kNou.fc!.toFixed(1)}%`);
} else t('recomandare de preț prezentă', false);
t('toate au motiv + detaliu de rețea', recs.every(r => r.motiv.length > 10 && r.detaliu.length > 10));

console.log('— Promo Analyzer —');
const promo = analizaPromo(s0, ctx, 'P008', 15, [0, 10, 20, 30], '2026-07')!;
t('la volum constant, promoția taie profitul', promo.randuri[0].dProfit < 0, fmtLei0(promo.randuri[0].dProfit));
t('profitul crește monoton cu volumul', promo.randuri.every((r, i) => i === 0 || r.profit > promo.randuri[i - 1].profit));
t('FC-ul produsului crește la discount (net mai mic)', (promo.randuri[0].fc ?? 0) > (promo.baseline.fc ?? 0));
const be = promo.randuri.find(r => r.breakEven);
t('break-even marcat pe primul uplift profitabil', !!be && promo.randuri.filter(r => r.dProfit >= 0)[0]?.upliftPct === be.upliftPct, be ? `+${be.upliftPct}%` : 'peste 30%');

console.log('— Performanță (volume mari) —');
const t0 = Date.now();
perProdus(s0.vanzari, ctx, { luna: '2026-07', vedere: 'TOTAL' });
const t1 = Date.now();
recomandari(s0, ctx, '2026-07');
const t2 = Date.now();
console.log(`  perProdus (${s0.vanzari.length} rânduri): ${t1 - t0} ms · recomandari (≈10 simulări de rețea): ${t2 - t1} ms`);
t('perProdus < 200 ms', t1 - t0 < 200);
t('recomandari < 1500 ms', t2 - t1 < 1500);

function fmtLei0(n: number) { return n.toFixed(0) + ' lei'; }
console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
