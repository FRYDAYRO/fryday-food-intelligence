import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, agregatePerioada, fcPerioada, consumPerPortie, utilizariIngredient, consumLunarIngredient, aplicaScenariu, impactRetea, costLunar } from '../src/lib/engine';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx = buildCtx(s0);

console.log('— Paper Cost —');
const ag = agregatePerioada(s0.vanzari, ctx, { luna: '2026-07', vedere: 'TOTAL' });
t('cost = food + paper', aprox(ag.cost, ag.costFood + ag.costPaper, 0.01), `${ag.cost.toFixed(0)} = ${ag.costFood.toFixed(0)} + ${ag.costPaper.toFixed(0)}`);
t('paperPct coerent', aprox(ag.paperPct!, (ag.costPaper / ag.net) * 100, 0.05));
const fc = fcPerioada(s0, ctx, '2026-07', 'RETEA');
t('paper29 = liniile Ambalaje din 2.9', fc.paper29 === s0.linii29.filter(l => l.perioada === '2026-07' && l.categorie === 'Ambalaje').reduce((s, l) => s + l.valoare, 0), String(fc.paper29));
t('fcPaper din 2.9 când există', aprox(fc.fcPaper!, (fc.paper29 / fc.net) * 100, 0.01), fc.fcPaper!.toFixed(2) + '%');

console.log('— Ingredient Intelligence: consum pe porție —');
// Piept în Crispy Burger: 120 g pane × (10 kg piept / 11 kg randament) = 0,109091 kg
const uP001 = consumPerPortie('I001', 'P001', 'INSTORE', ctx);
t('piept per Crispy Burger = 0,10909 kg', aprox(uP001, 0.120 * 10 / 11, 1e-6), uP001.toFixed(6));
// prin combo: P008 conține P001 → același consum de piept + nimic din cartofi/cola
const uP008 = consumPerPortie('I001', 'P008', 'INSTORE', ctx);
t('piept per Meniu (combo) = per burger', aprox(uP008, uP001, 1e-9));
// salată: 20 g net cu 15% pierdere → 23,53 g brut
const uSalata = consumPerPortie('I011', 'P001', 'INSTORE', ctx);
t('salată brută 0,02353 kg (pierderea inclusă)', aprox(uSalata, 0.02 / 0.85, 1e-6), uSalata.toFixed(5));
// ambalaj pe canal: cutia delivery doar pe DELIVERY
t('cutie delivery: 0 pe InStore, 1 pe Delivery', consumPerPortie('A002', 'P001', 'INSTORE', ctx) === 0 && consumPerPortie('A002', 'P001', 'DELIVERY', ctx) === 1);

console.log('— Utilizări & consum lunar —');
const ut = utilizariIngredient('I001', ctx);
t('pieptul apare în P001, P002, P006, P008', ['P001', 'P002', 'P006', 'P008'].every(c => ut.some(u => u.produs === c)) && ut.length === 4, ut.map(u => u.produs).join(','));
const cons = consumLunarIngredient('I001', s0, ctx, '2026-07');
// verificare independentă: Σ per produs = total
const suma = [...cons.perProdus.values()].reduce((s, x) => s + x.cant, 0);
t('Σ per produs = consum total', aprox(suma, cons.cantitate, 1e-6), `${cons.cantitate.toFixed(1)} kg`);
t('valoare = cantitate × preț curent (14)', aprox(cons.valoare, cons.cantitate * 14, 0.01));

console.log('— What-if preț = coerent cu Product Impact —');
const { ctx: ctx1, produseNoi, preturiVanzare } = aplicaScenariu(s0, [{ tip: 'PRET_INGREDIENT', ingredient: 'I001', pretNou: 16 }]);
const imp = impactRetea(s0, ctx, ctx1, produseNoi, preturiVanzare, '2026-07');
const dCostDirect = costLunar(s0, ctx1, '2026-07').cost - costLunar(s0, ctx, '2026-07').cost;
t('Δcost rețea = impactRetea', aprox(imp.dupa.cost - imp.inainte.cost, dCostDirect, 0.01));
// Δcost ≈ Δpreț × consum lunar (2 lei/kg × ~350 kg)
t('Δcost ≈ 2 lei × consumul lunar de piept', aprox(dCostDirect, 2 * cons.cantitate, 0.5), `${dCostDirect.toFixed(0)} vs ${(2 * cons.cantitate).toFixed(0)} lei`);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
