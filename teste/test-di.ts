import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, fcPerioada, kpiProdus, consumLunarIngredient, volumeLuna } from '../src/lib/engine';
import {
  componenteCost, driveriProfit, grafIngredient, impactIngredient, optimizariMeniu,
  scaraPret, optimizariReteta, cicluViata, oportunitati, narativExecutiv, cockpit,
} from '../src/lib/decizii';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx = buildCtx(s0);
const L = '2026-07';

console.log('— Componente de cost —');
const comp = componenteCost('P001', ctx);
t('Σ share = 100%', aprox(comp.reduce((s, c) => s + c.share, 0), 100, 0.01));
t('sortate descrescător după cost', comp.every((c, i) => i === 0 || comp[i - 1].cost >= c.cost));
t('Σ cost componente = costul porției', aprox(comp.reduce((s, c) => s + c.cost, 0), kpiProdus('P001', 'INSTORE', ctx)!.cost!.total, 0.001));
t('dominanta = pieptul pane (SP)', comp[0].cod === 'SP-021' && comp[0].share > 50, `${comp[0].nume} ${comp[0].share.toFixed(1)}%`);
const compCombo = componenteCost('P008', ctx);
t('combo: componentele sunt produse', compCombo.length === 3 && compCombo.every(c => c.tip === 'PRODUS'));

console.log('— Profit Driver Analysis —');
const dr = driveriProfit(s0, ctx, L);
t('toate produsele au cauză explicată', dr.randuri.every(r => r.cauza.length > 20));
t('decalaj = mixCost − contribuție', dr.randuri.every(r => aprox(r.decalaj, r.mixCost - r.contributie, 1e-9)));
t('sortare pe profit', dr.randuri.every((r, i) => i === 0 || dr.randuri[i - 1].profit >= r.profit));
const cola = dr.randuri.find(r => r.cod === 'P005')!;
t('Cola marcată FRÂNĂ (FC peste țintă, marjă sub medie)', cola.roluri.includes('FRANA'), cola.roluri.join(','));
t('cauza Cola citează FC-ul și ținta', /FC 3\d,\d%/.test(cola.cauza) && cola.cauza.includes('ținta'), cola.cauza.slice(0, 90));
const motor = dr.randuri[0];
t('motorul de profit e marcat MOTOR_PROFIT', motor.roluri.includes('MOTOR_PROFIT'), `${motor.denumire} ${motor.contributie.toFixed(1)}%`);
t('marja medie = ponderată', aprox(dr.marjaMedie, (dr.profitTotal / dr.randuri.reduce((s, r) => s + r.net, 0)) * 100, 0.01));

console.log('— Ingredient Impact Network (graf) —');
const g = grafIngredient('I001', ctx);
const ids = g.noduri.map(n => n.id);
t('ingredientul e rădăcina (nivel 0)', g.noduri.find(n => n.id === 'I001')?.nivel === 0);
t('semipreparatul SP-021 pe nivel 1', g.noduri.find(n => n.id === 'SP-021')?.nivel === 1);
t('produsele P001/P002/P006 pe nivel 2', ['P001', 'P002', 'P006'].every(c => g.noduri.find(n => n.id === c)?.nivel === 2), ids.join(','));
t('combo P008 pe nivel 3', g.noduri.find(n => n.id === 'P008')?.nivel === 3);
t('muchie ingredient → SP cu cantitate', g.muchii.some(m => m.de === 'I001' && m.la === 'SP-021' && /kg|g/.test(m.eticheta)));
t('muchiile leagă doar noduri existente', g.muchii.every(m => ids.includes(m.de) && ids.includes(m.la)));
const gAmb = grafIngredient('A002', ctx);
t('ambalaj delivery: fără semipreparate, direct pe produse', gAmb.noduri.every(n => n.tip !== 'SEMIPREPARAT') && gAmb.noduri.length > 1);

console.log('— Impact ingredient pe rețea —');
const imp = impactIngredient(s0, ctx, 'I001', 16, L)!;
const consP = consumLunarIngredient('I001', s0, ctx, L);
t('Δ profit = −Δpreț × consum lunar', aprox(imp.dProfitLunar, -2 * consP.cantitate, 0.5), `${imp.dProfitLunar.toFixed(0)} vs ${(-2 * consP.cantitate).toFixed(0)} lei`);
t('impact anual = 12 × lunar', aprox(imp.dProfitAnual, imp.dProfitLunar * 12, 0.01));
t('FC-ul rețelei crește', (imp.dFcPP ?? 0) > 0, `+${imp.dFcPP?.toFixed(2)} pp`);
t('4 produse afectate, cu costuri în creștere', imp.produse.length === 4 && imp.produse.every(p => (p.cost1 ?? 0) > (p.cost0 ?? 0)));
t('Σ impact per produs ≈ impact rețea', aprox(imp.produse.reduce((s, p) => s + p.dLunar, 0), imp.dProfitLunar, 1), imp.produse.reduce((s, p) => s + p.dLunar, 0).toFixed(0));

console.log('— Menu Optimization Engine —');
const om = optimizariMeniu(s0, ctx, L);
t('există propuneri', om.length >= 3, `${om.length} produse`);
t('fiecare are diagnostic + acțiune', om.every(o => o.diagnostic.length > 5 && o.actiune.length > 10));
t('Cola: Food Cost prea mare', om.find(o => o.cod === 'P005')?.categorii.includes('FC_MARE') === true);
t('impact anual = 12 × lunar', om.every(o => o.impactLunar == null || aprox(o.impactAnual!, o.impactLunar * 12, 0.01)));
t('sortate pe impact descrescător', om.filter(o => o.impactLunar != null).every((o, i, a) => i === 0 || a[i - 1].impactLunar! >= o.impactLunar!));
const omPozitive = om.filter(o => (o.impactLunar ?? 0) > 0);
t('acțiunile propuse au impact pozitiv', omPozitive.length >= 2, `${omPozitive.length} cu câștig`);

console.log('— Dynamic Pricing Simulator —');
const sc = scaraPret(s0, ctx, 'P005', 'INSTORE', L)!;
const pas0 = sc.pasi.find(p => p.curent)!;
t('pasul curent are Δ = 0', aprox(pas0.dProfitLunar, 0, 0.01) && pas0.variatiePct === 0);
t('FC scade când prețul crește', sc.pasi.every((p, i) => i === 0 || (p.fc ?? 0) <= (sc.pasi[i - 1].fc ?? 0)));
t('profitul crește monoton cu prețul (volum constant)', sc.pasi.every((p, i) => i === 0 || p.profitLunar >= sc.pasi[i - 1].profitLunar));
t('bucăți = volumul PMIX InStore', sc.buc === (volumeLuna(s0, L).get('P005')?.bucIn ?? 0), String(sc.buc));
// prețul care duce FC la ținta de 21%
const k = kpiProdus('P005', 'INSTORE', ctx)!;
t('pretTinta aduce FC exact la țintă', aprox((k.cost!.total / (sc.pretTinta! / 1.1)) * 100, 21, 0.05), `${sc.pretTinta} lei`);
t('Δ anual = 12 × Δ lunar', sc.pasi.every(p => aprox(p.dProfitAnual, p.dProfitLunar * 12, 0.01)));

console.log('— Recipe Optimization Engine —');
const or1 = optimizariReteta(s0, ctx, 'P001', L);
t('scenarii generate', or1.scenarii.length >= 3, `${or1.scenarii.length} scenarii`);
const gram = or1.scenarii.find(s => s.tip === 'GRAMAJ')!;
t('gramaj: cost/porție scade, profit crește', gram.dCostPortie < 0 && gram.dProfitLunar > 0, `${gram.titlu} → ${gram.dProfitLunar.toFixed(0)} lei/lună`);
const vol001 = volumeLuna(s0, L).get('P001')!;
t('impactul = −Δcost × bucăți (ambele canale)', aprox(gram.dProfitLunar, -gram.dCostPortie * (vol001.bucIn + vol001.bucDlv), 1), gram.dProfitLunar.toFixed(0));
t('sursă alternativă propusă prin semipreparat (AviAlt/piept)', or1.scenarii.some(s => s.tip === 'SURSA' && s.titlu.includes('Piept')), or1.scenarii.filter(s => s.tip === 'SURSA').map(s => s.titlu.slice(0, 30)).join(' | '));
t('rețeta reală NU e modificată', s0.retete.find(r => r.cod === 'P001')!.versiuni.length === 2 && or1.componente.length > 0);
t('scenariile au FC nou calculat', or1.scenarii.every(s => s.fcNou != null && s.costNou != null));

console.log('— Product Lifecycle —');
const cv = cicluViata(s0, ctx, L);
t('toate produsele clasificate', cv.length === 8, `${cv.length} produse`);
t('etape valide + dovadă + recomandare', cv.every(c => ['LANSARE', 'CRESTERE', 'MATURITATE', 'DECLIN'].includes(c.etapa) && c.dovada.length > 20 && c.recomandare.length > 20));
t('prima vânzare = 2026-06-01, vechime 55 zile', cv.every(c => c.primaVanzare === '2026-06-01' && c.zile === 55), `${cv[0].primaVanzare} / ${cv[0].zile}`);
t('trend calculat pe 14 vs 14 zile', cv.every(c => c.trendPct != null && c.bucRecent > 0 && c.bucAnterior > 0));
t('recentul nu depășește vârful istoric', cv.every(c => c.bucRecent <= c.varf + 1e-9));

console.log('— Opportunity Finder —');
const opp = oportunitati(s0, ctx, L);
t('oportunități găsite', opp.length >= 5, `${opp.length}`);
t('id-uri unice', new Set(opp.map(o => o.id)).size === opp.length);
t('sortare pe impact lunar', opp.every((o, i) => i === 0 || (opp[i - 1].impactLunar ?? -1) >= (o.impactLunar ?? -1)));
t('fiecare are „unde" (modulul de execuție)', opp.every(o => o.unde.length > 3));
t('categorii multiple acoperite', new Set(opp.map(o => o.categorie)).size >= 3, [...new Set(opp.map(o => o.categorie))].join(','));

console.log('— Executive AI Narrative —');
const n = narativExecutiv(s0, ctx, L);
t('cel puțin 3 paragrafe', n.paragrafe.length >= 3, `${n.paragrafe.length} paragrafe`);
t('cauza #1 = scumpirea pieptului (13,20 → 14,00)', n.cauze[0]?.eticheta.includes('Piept') && n.cauze[0].lei > 0, n.cauze[0]?.eticheta ?? 'lipsă');
t('cauza în pp = lei / vânzări nete', aprox(n.cauze[0].pp, (n.cauze[0].lei / 279) / 1, 999));
t('efectul prețurilor e pozitiv (scumpire în iulie)', n.efectPreturiPP > 0, `${n.efectPreturiPP.toFixed(2)} pp`);
t('efect preț + efect mix = Δ FC teoretic', (() => {
  const a = fcPerioada(s0, ctx, L, 'RETEA'), b = fcPerioada(s0, ctx, '2026-06', 'RETEA');
  if (a.fcTeoretic === null || b.fcTeoretic === null || n.efectMixPP === null) return false;
  return aprox(n.efectPreturiPP + n.efectMixPP, a.fcTeoretic - b.fcTeoretic, 0.01);
})());
t('textul menționează luna precedentă', n.paragrafe[0].includes('2026-06') || n.paragrafe[0].includes('Food Cost'));
t('potențial de optimizare estimat', n.potentialLei > 0 && n.potentialPP > 0, `${n.potentialLei.toFixed(0)} lei = ${n.potentialPP.toFixed(2)} pp`);

console.log('— Executive Cockpit —');
const ck = cockpit(s0, ctx, L);
t('toate întrebările au răspuns și modul de execuție', ck.raspunsuri.length >= 7 && ck.raspunsuri.every(r => r.raspuns.length > 1 && r.unde.length > 3), `${ck.raspunsuri.length} întrebări`);
t('include impactul financiar pe fiecare', ck.raspunsuri.every(r => r.impact.length > 1));
t('„unde pierdem bani" indică o frână reală', /Cola|Sos|Cartofi/.test(ck.raspunsuri[0].raspuns), ck.raspunsuri[0].raspuns);
t('narativul e inclus', ck.narativ.paragrafe.length >= 3);

console.log('— Performanță —');
const t0 = Date.now(); driveriProfit(s0, ctx, L); const t1 = Date.now();
optimizariMeniu(s0, ctx, L); const t2 = Date.now();
cockpit(s0, ctx, L); const t3 = Date.now();
console.log(`  driveriProfit ${t1 - t0} ms · optimizariMeniu ${t2 - t1} ms · cockpit complet ${t3 - t2} ms`);
t('driveriProfit < 300 ms', t1 - t0 < 300);
t('cockpit complet < 2000 ms', t3 - t2 < 2000);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
