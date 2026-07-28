import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, costProdus, kpiProdus, fcPerioada, agregatePerioada } from '../src/lib/engine';

const s = genereazaSeed();
const ctx = buildCtx(s);
const D = '2026-07-15';
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
let ok = 0, fail = 0;
const t = (nume: string, cond: boolean, detaliu = '') => {
  if (cond) { ok++; console.log('  ✔', nume, detaliu); }
  else { fail++; console.log('  ✘', nume, detaliu); }
};

console.log('— Exemplul validat §4 (Crispy Burger) —');
// SP-021: (10×14 + 1.5×6 + 0.8×5) / 11 = 153/11 = 13.9091 lei/kg
const spRet = ctx.retete.get('SP-021')!;
// costProdus nu expune SP direct; verificăm prin linia de 120 g din P001
const cIn = costProdus('P001', 'INSTORE', ctx, D)!;
const cDlv = costProdus('P001', 'DELIVERY', ctx, D)!;
// food: chiflă 0.80 + 0.120×13.9091=1.6691 + sos 0.025×12=0.30 + salată (20g net, 15% pierdere → 23.53g)×6=0.1412 → 2.9103
t('cost food P001', aprox(cIn.food, 2.91, 0.005), cIn.food.toFixed(4));
t('paper InStore 0.25', aprox(cIn.paper, 0.25), cIn.paper.toFixed(4));
t('cost InStore 3.16', aprox(cIn.total, 3.16, 0.005), cIn.total.toFixed(4));
t('paper Delivery 0.90', aprox(cDlv.paper, 0.90), cDlv.paper.toFixed(4));
t('cost Delivery 3.81', aprox(cDlv.total, 3.81, 0.005), cDlv.total.toFixed(4));

const kIn = kpiProdus('P001', 'INSTORE', ctx, D)!;
const kDlv = kpiProdus('P001', 'DELIVERY', ctx, D)!;
t('preț net InStore 17.18', aprox(kIn.net!, 17.1818, 0.001), kIn.net!.toFixed(4));
t('FC InStore ≈18.4%', aprox(kIn.fc!, 18.4, 0.1), kIn.fc!.toFixed(2));
t('FC Delivery ≈19.1%', aprox(kDlv.fc!, 19.1, 0.1), kDlv.fc!.toFixed(2));

console.log('— Combo P008 = P001 + P004 + P005 —');
const c8 = costProdus('P008', 'INSTORE', ctx, D)!;
const c4 = costProdus('P004', 'INSTORE', ctx, D)!;
const c5 = costProdus('P005', 'INSTORE', ctx, D)!;
t('combo = suma componentelor', aprox(c8.total, cIn.total + c4.total + c5.total, 0.0001), c8.total.toFixed(4));

console.log('— Versiunea 1 vs 2 (110g vs 120g) —');
const r1 = { ...ctx.retete.get('P001')!, activa: 1 };
const ctxV1 = { ...ctx, retete: new Map(ctx.retete) };
ctxV1.retete.set('P001', r1);
// versiunea activă contează pentru „azi"; pentru date din trecut se aplică versiunea în vigoare atunci
const cV1 = costProdus('P001', 'INSTORE', ctxV1, '9999-12-31')!;
const cV2Azi = costProdus('P001', 'INSTORE', ctx, '9999-12-31')!;
t('v1 mai ieftină decât v2 (la versiunea activă)', cV1.total < cV2Azi.total, `${cV1.total.toFixed(3)} < ${cV2Azi.total.toFixed(3)}`);
t('recalculul istoric ignoră reactivarea manuală: iunie rămâne pe v2 (în vigoare atunci)',
  aprox(costProdus('P001', 'INSTORE', ctxV1, '2026-06-15')!.total, costProdus('P001', 'INSTORE', ctx, '2026-06-15')!.total, 1e-9));

console.log('— Istoric prețuri (iunie: piept 13.20) —');
const cIunie = costProdus('P001', 'INSTORE', ctx, '2026-06-15')!;
t('cost iunie < cost iulie', cIunie.total < cIn.total, `${cIunie.total.toFixed(3)} < ${cIn.total.toFixed(3)}`);

console.log('— Agregate & Food Cost Engine (iulie, rețea) —');
const ag = agregatePerioada(s.vanzari, ctx, { luna: '2026-07', vedere: 'TOTAL' });
t('acoperire rețetar 100%', aprox(ag.acoperire!, 100, 0.0001), ag.acoperire!.toFixed(2));
const agI = agregatePerioada(s.vanzari, ctx, { luna: '2026-07', vedere: 'INSTORE' });
const agD = agregatePerioada(s.vanzari, ctx, { luna: '2026-07', vedere: 'DELIVERY' });
t('Total = InStore + Delivery (net)', aprox(ag.net, agI.net + agD.net, 0.01), `${ag.net.toFixed(0)} = ${agI.net.toFixed(0)} + ${agD.net.toFixed(0)}`);
t('Total = InStore + Delivery (cost)', aprox(ag.cost, agI.cost + agD.cost, 0.01));

const fc = fcPerioada(s, ctx, '2026-07', 'RETEA');
console.log(`  net=${fc.net.toFixed(0)} numitor=${fc.numitor} fcT=${fc.fcTeoretic?.toFixed(2)}% fcCurat=${fc.fcCurat?.toFixed(2)}% fcOp=${fc.fcOp?.toFixed(2)}% var=${fc.variancePP?.toFixed(2)}pp excl=${fc.excluderi}`);
t('numitor = Sales Report', fc.numitor === 'Sales Report');
t('fcOp > fcCurat > fcTeoretic', fc.fcOp! > fc.fcCurat! && fc.fcCurat! > fc.fcTeoretic!);
t('variance ≈ +1.5…+2.5pp', fc.variancePP! > 1.2 && fc.variancePP! < 2.8, fc.variancePP!.toFixed(2));
t('excluderi = 2×1650 lei', aprox(fc.excluderi, 3300, 0.5), String(fc.excluderi));
t('variancePP = fcCurat − fcTeoretic', aprox(fc.variancePP!, fc.fcCurat! - fc.fcTeoretic!, 1e-9));
t('profit estimat = net×(1−fcCurat)', aprox(fc.profitEstimat!, fc.net * (1 - fc.fcCurat! / 100), 0.01));

const fcL1 = fcPerioada(s, ctx, '2026-07', 'L01');
const fcL2 = fcPerioada(s, ctx, '2026-07', 'L02');
t('rețea net = L01 + L02', aprox(fc.net, fcL1.net + fcL2.net, 0.01));
t('țintă L01 = 20.5', fcL1.tinta === 20.5);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
void spRet;
