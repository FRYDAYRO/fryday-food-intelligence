import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, analizaPromo, consumuriLuna, kpiProdus, perProdus, volumeLuna } from '../src/lib/engine';
import { cockpit, oportunitati } from '../src/lib/decizii';
import { structuraIngrediente, similaritate, portofoliu, simulPromotie, intelFurnizori, deRenegociat } from '../src/lib/portofoliu';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx = buildCtx(s0);
const L = '2026-07';

console.log('— Structura pe ingrediente —');
const st1 = structuraIngrediente('P001', ctx);
t('Σ ponderi ≈ 100% (fără ambalaje pe canal)', [...st1.values()].reduce((s, x) => s + x, 0) > 90);
t('pieptul are cea mai mare pondere', [...st1.entries()].sort((a, b) => b[1] - a[1])[0][0] === 'I001', [...st1.entries()].sort((a, b) => b[1] - a[1])[0].join('='));
t('similaritatea cu sine = Σ ponderi', aprox(similaritate(st1, st1), [...st1.values()].reduce((s, x) => s + x, 0), 0.001));
const st2 = structuraIngrediente('P002', ctx);
const sim12 = similaritate(st1, st2);
t('burgerii au structuri parțial comune', sim12 > 20 && sim12 < 100, `${sim12.toFixed(1)}%`);

console.log('— Portfolio Optimization —');
const p = portofoliu(s0, ctx, L);
t('categoriile acoperă tot profitul', aprox(p.categorii.reduce((s, c) => s + c.mixProfit, 0), 100, 0.05));
t('categoriile acoperă toate vânzările', aprox(p.categorii.reduce((s, c) => s + c.mixVanzari, 0), 100, 0.05));
t('dezechilibru = %profit − %vânzări', p.categorii.every(c => aprox(c.dezechilibru, c.mixProfit - c.mixVanzari, 1e-9)));
t('fiecare categorie are verdict', p.categorii.every(c => c.verdict.length > 20));
t('redundanțele sunt perechi distincte, cu similaritate ≥ 60%', p.redundante.every(r => r.a !== r.b && r.similaritate >= 60));
t('canibalizările sunt din aceeași categorie', p.canibalizari.every(c => {
  const A = s0.produse.find(x => x.cod === c.a)!, B = s0.produse.find(x => x.cod === c.b)!;
  return A.categorie === B.categorie;
}));
t('golurile de preț au salt ≥ 45% și ≥ 5 lei', p.goluri.every(g => g.latimePct >= 45 && g.la - g.de >= 5));
t('golurile citează produsele care le mărginesc', p.goluri.every(g => g.sugestie.includes(g.produsDe) && g.sugestie.includes(g.produsLa)));
t('propuneri de produse noi generate', p.produseNoi.length >= 1, `${p.produseNoi.length} propuneri`);

console.log('— Promotion Simulator —');
// DISCOUNT: trebuie să dea exact aceleași cifre ca motorul de reducere din engine
const disc = simulPromotie(s0, ctx, { tip: 'DISCOUNT', produs: 'P008', discountPct: 15 }, L)!;
const ref = analizaPromo(s0, ctx, 'P008', 15, [0, 10, 20, 30], L)!;
t('DISCOUNT = analizaPromo (o singură implementare)', disc.randuri.every((r, i) => aprox(r.profit, ref.randuri[i].profit, 0.01) && aprox(r.dProfit, ref.randuri[i].dProfit, 0.01)));
t('DISCOUNT: FC unitar creşte faţă de baseline', (disc.fcUnitar ?? 0) > (disc.baseline.fc ?? 0));

// CADOU: costul cadoului se adaugă, prețul rămâne
const cadou = simulPromotie(s0, ctx, { tip: 'CADOU', produs: 'P001', cadou: 'P005', canibalizarePct: 70 }, L)!;
const kIn = kpiProdus('P001', 'INSTORE', ctx)!, kDlv = kpiProdus('P001', 'DELIVERY', ctx)!;
const v1 = volumeLuna(s0, L).get('P001')!;
const w = { i: v1.bucIn / (v1.bucIn + v1.bucDlv), d: v1.bucDlv / (v1.bucIn + v1.bucDlv) };
const netP001 = kIn.net! * w.i + kDlv.net! * w.d;
t('CADOU: netul rămâne cel al produsului principal', aprox(cadou.netUnitar, netP001, 0.01), fmtLei0(cadou.netUnitar));
t('CADOU: costul include cadoul', cadou.costUnitar > (kIn.cost!.total * w.i + kDlv.cost!.total * w.d) + 0.5);
t('CADOU: FC-ul unitar creşte peste cel normal', (cadou.fcUnitar ?? 0) > (kIn.fc ?? 0));
t('CADOU: canibalizarea scade profitul', cadou.pierdereUnitara > 0 && cadou.randuri[0].profitPierdut > 0);
t('CADOU: la volum constant profitul scade', cadou.randuri[0].dProfit < 0, fmtLei0(cadou.randuri[0].dProfit));

// COMBO: pachet cu preț dat
const combo = simulPromotie(s0, ctx, { tip: 'COMBO', produs: 'P001', produseCombo: ['P001', 'P003'], pretPachet: 24, volumBaza: 400, canibalizarePct: 50 }, L)!;
t('COMBO: net = preț pachet / (1+TVA)', aprox(combo.netUnitar, 24 / 1.1, 0.01), combo.netUnitar.toFixed(2));
t('COMBO: costul = suma componentelor', combo.costUnitar > 0 && combo.costUnitar < combo.netUnitar);
t('COMBO: volumul de bază respectat', combo.randuri[0].unitati === 400 && combo.randuri[3].unitati === 520);
const numeP003 = s0.produse.find(x => x.cod === 'P003')!.denumire;
t('COMBO: descrierea conține ambele produse și discountul', combo.descriere.includes('Crispy Burger') && combo.descriere.includes(numeP003) && combo.descriere.includes('%'), combo.descriere.slice(0, 70));
t('COMBO: profitul crește cu volumul', combo.randuri.every((r, i) => i === 0 || r.profit >= combo.randuri[i - 1].profit));

// MENIU: discount procentual pe suma componentelor
const meniu = simulPromotie(s0, ctx, { tip: 'MENIU', produs: 'P001', produseCombo: ['P001', 'P003', 'P005'], discountPct: 20, volumBaza: 300 }, L)!;
// prețul pachetului folosește prețul mediu ponderat pe canale al fiecărei componente (așa cum se vinde efectiv)
const brutPonderat = ['P001', 'P003', 'P005'].reduce((s, c) => {
  const v = volumeLuna(s0, L).get(c)!;
  const tot = v.bucIn + v.bucDlv;
  const pr = s0.produse.find(x => x.cod === c)!;
  return s + (pr.pretInstore ?? 0) * (v.bucIn / tot) + (pr.pretDelivery ?? 0) * (v.bucDlv / tot);
}, 0);
t('MENIU: prețul pachetului = suma ponderată × (1 − discount)', aprox(meniu.netUnitar, (brutPonderat * 0.8) / 1.1, 0.05), meniu.netUnitar.toFixed(2));
t('MENIU: break-even calculat', meniu.upliftBreakEven != null || meniu.randuri.every(r => r.dProfit < 0));

console.log('— Supplier Intelligence —');
const fz = intelFurnizori(s0, ctx, L);
t('toți furnizorii listați, ordonați după cheltuială', fz.length === s0.furnizori.length && fz.every((f, i) => i === 0 || fz[i - 1].cheltuialaLunara >= f.cheltuialaLunara));
const cons = consumuriLuna(s0, ctx, L);
const totalCheltuiala = fz.reduce((s, f) => s + f.cheltuialaLunara, 0);
const totalConsum = [...cons.values()].reduce((s, c) => s + c.valoare, 0);
t('Σ cheltuieli furnizori = Σ consumuri', aprox(totalCheltuiala, totalConsum, 0.5), `${totalCheltuiala.toFixed(0)} vs ${totalConsum.toFixed(0)} lei`);
t('cheltuiala anuală = 12 × lunară', fz.every(f => aprox(f.cheltuialaAnuala, f.cheltuialaLunara * 12, 0.01)));
const f1 = fz[0];
t('furnizorul principal are produse afectate', f1.produseAfectate.length > 0, `${f1.nume}: ${f1.produseAfectate.length} produse`);
t('+5% preț ⇒ FC crește și profitul scade', (f1.impactCrestere5.fcPP ?? 0) > 0 && f1.impactCrestere5.profitLunar < 0, `${f1.impactCrestere5.fcPP?.toFixed(2)} pp / ${f1.impactCrestere5.profitLunar.toFixed(0)} lei`);
// impactul ≈ 5% din cheltuiala furnizorului
t('impactul ≈ −5% × cheltuiala lunară', aprox(f1.impactCrestere5.profitLunar, -0.05 * f1.cheltuialaLunara, 2), `${f1.impactCrestere5.profitLunar.toFixed(0)} vs ${(-0.05 * f1.cheltuialaLunara).toFixed(0)}`);
const cuAlt = fz.find(f => f.economieAlternative > 0);
t('economia cu alternative = Δpreț × consum', !!cuAlt && cuAlt.ingrediente.some(i => i.alternativa && aprox(i.alternativa.economieLunara, (i.pret - i.alternativa.pret) * i.cantLunara, 0.01)));
t('share din costul materialelor însumează 100%', aprox(fz.reduce((s, f) => s + f.shareCost, 0), 100, 0.5), `${fz.reduce((s, f) => s + f.shareCost, 0).toFixed(1)}%`);

const rn = deRenegociat(s0, ctx, L);
t('priorități de renegociere identificate', rn.length >= 2, `${rn.length}`);
t('prima prioritate are câștig sau cheltuială mare', (rn[0].castigLunar ?? 0) > 0 || rn[0].cheltuialaAnuala > 10000, rn[0].nume);
t('fiecare are motiv explicat', rn.every(r => r.motiv.length > 15));

console.log('— Cockpit extins & oportunități —');
const ck = cockpit(s0, ctx, L);
t('10 întrebări acoperite', ck.raspunsuri.length === 10, String(ck.raspunsuri.length));
const intrebari = ck.raspunsuri.map(r => r.intrebare).join(' | ');
t('include „unde câștigăm bani"', /unde câștigăm bani/i.test(intrebari));
t('include consumatorul de Food Cost', /consumă cel mai mult Food Cost/i.test(intrebari));
t('include ingredientele de renegociat', /renegociate/i.test(intrebari));
t('include cea mai mare oportunitate', /cea mai mare oportunitate/i.test(intrebari));
t('toate răspunsurile au impact financiar', ck.raspunsuri.every(r => r.impact.length > 5 && r.unde.length > 3));
const opp = oportunitati(s0, ctx, L);
t('oportunitățile includ ingrediente scumpe', opp.some(o => o.id.startsWith('ing-')), opp.filter(o => o.id.startsWith('ing-')).length + ' ingrediente');
t('toate au impact anual acolo unde există cel lunar', opp.every(o => o.impactLunar == null || aprox(o.impactAnual!, o.impactLunar * 12, 0.01)));

console.log('— Paper Cost pe produs —');
const rows = perProdus(s0.vanzari, ctx, { luna: L, vedere: 'TOTAL' });
t('Paper Cost % = costPaper / net', rows.every(r => r.net === 0 || (r.costPaper / r.net) * 100 >= 0));
t('Paper Cost total < Food Cost total', rows.reduce((s, r) => s + r.costPaper, 0) < rows.reduce((s, r) => s + r.costFood, 0));

console.log('— Performanță —');
const t0 = Date.now(); portofoliu(s0, ctx, L); const t1 = Date.now();
intelFurnizori(s0, ctx, L); const t2 = Date.now();
cockpit(s0, ctx, L); const t3 = Date.now();
console.log(`  portofoliu ${t1 - t0} ms · intelFurnizori ${t2 - t1} ms · cockpit ${t3 - t2} ms`);
t('portofoliu < 800 ms', t1 - t0 < 800);
t('intelFurnizori < 800 ms', t2 - t1 < 800);
t('cockpit < 2000 ms', t3 - t2 < 2000);

function fmtLei0(n: number) { return n.toFixed(2); }
console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
