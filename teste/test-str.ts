import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, perProdus, pretCurent } from '../src/lib/engine';
import { simuleaza } from '../src/lib/simulare';
import { construiesteSchimbari, simuleazaStrategie, categoriiCuPondere } from '../src/lib/strategie';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx = buildCtx(s0);
const L = '2026-07';

console.log('— Contul de profit de bază —');
const baza = simuleazaStrategie(s0, ctx, {}, L);
const labor = s0.labor.filter(l => l.luna === L).reduce((s, l) => s + l.cost, 0);
const oper = s0.costuriOperare.filter(o => o.luna === L).reduce((s, o) => s + o.chirie + o.utilitati + o.altele, 0);
t('fără pârghii: EBITDA nu se schimbă', aprox(baza.ebitda1, baza.ebitda0, 0.5));
t('EBITDA = vânzări − food&paper − labor − operare', aprox(baza.ebitda0, baza.net0 - baza.foodPaper0 - labor - oper, 0.5), `${baza.ebitda0.toFixed(0)} lei`);
t('Prime Cost = FC% + Labor%', aprox(baza.prime0!, baza.fc0! + baza.laborPct0!, 0.01), `${baza.prime0!.toFixed(1)}%`);
t('contul are 7 linii, cu EBITDA la final', baza.cont.length === 7 && baza.cont[6].eticheta.includes('EBITDA'));
t('vânzările nete sunt 100% din ele însele', baza.cont[0].pct0 === 100 && baza.cont[0].pct1 === 100);
t('avertisment despre EBITDA/cash flow', baza.avertismente.some(a => a.includes('Cash Flow')));

console.log('— Eliminarea unei categorii —');
const cats = categoriiCuPondere(s0, ctx, L);
t('categoriile sunt ordonate după vânzări', cats.every((c, i) => i === 0 || cats[i - 1].net >= c.net), cats.map(c => c.categorie).join(','));
const catB = cats.find(c => c.categorie === 'Băuturi')!;
const elimFara = simuleazaStrategie(s0, ctx, { eliminaCategorie: 'Băuturi', transferCategoriePct: 0 }, L);
t('vânzările scad exact cu categoria eliminată', aprox(elimFara.net0 - elimFara.net1, catB.net, 1), `${(elimFara.net0 - elimFara.net1).toFixed(0)} vs ${catB.net.toFixed(0)} lei`);
t('profitul brut scade cu profitul categoriei', aprox((elimFara.net0 - elimFara.foodPaper0) - (elimFara.net1 - elimFara.foodPaper1), catB.profit, 1));
t('EBITDA scade (nu compensează costuri fixe)', elimFara.ebitda1 < elimFara.ebitda0);
const elimCu = simuleazaStrategie(s0, ctx, { eliminaCategorie: 'Băuturi', transferCategoriePct: 50 }, L);
t('cu transfer de 50% pierderea e mai mică', elimCu.ebitda1 > elimFara.ebitda1, `${elimCu.ebitda1.toFixed(0)} vs ${elimFara.ebitda1.toFixed(0)}`);
const sch = construiesteSchimbari(s0, ctx, { eliminaCategorie: 'Băuturi', transferCategoriePct: 50 }, L).schimbari;
const redis = sch.find(x => x.tip === 'ELIMINA_PRODUS')!;
t('redistribuirea însumează procentul cerut', redis.tip === 'ELIMINA_PRODUS' && aprox((redis.redistribuire ?? []).reduce((s, r) => s + r.pct, 0), 50, 0.1));

console.log('— Modificarea globală de preț —');
const pret = simuleazaStrategie(s0, ctx, { pretGlobalPct: 5 }, L);
t('vânzările cresc ~5%', aprox(pret.net1 / pret.net0, 1.05, 0.005), `×${(pret.net1 / pret.net0).toFixed(4)}`);
t('costul rămâne neschimbat', aprox(pret.foodPaper1, pret.foodPaper0, 1));
t('Food Cost scade', (pret.fc1 ?? 0) < (pret.fc0 ?? 0), `${pret.fc0?.toFixed(2)} → ${pret.fc1?.toFixed(2)}`);
t('EBITDA crește cu ~creșterea de vânzări', aprox(pret.ebitda1 - pret.ebitda0, pret.net1 - pret.net0, 1.5), `+${(pret.ebitda1 - pret.ebitda0).toFixed(0)} lei`);
t('toate produsele active au schimbări de preț', construiesteSchimbari(s0, ctx, { pretGlobalPct: 5 }, L).schimbari.every(x => x.tip === 'PRET_VANZARE'));

console.log('— Schimbarea de TVA —');
const tva = simuleazaStrategie(s0, ctx, { tvaNou: 19 }, L);
t('netul scade cu raportul cotelor (10% → 19%)', aprox(tva.net1 / tva.net0, 1.10 / 1.19, 0.002), `×${(tva.net1 / tva.net0).toFixed(4)}`);
t('Food Cost crește (net mai mic, cost identic)', (tva.fc1 ?? 0) > (tva.fc0 ?? 0), `${tva.fc0?.toFixed(1)} → ${tva.fc1?.toFixed(1)}`);
t('EBITDA scade cu pierderea de venit net', aprox(tva.ebitda0 - tva.ebitda1, tva.net0 - tva.net1, 1));
t('avertisment despre prețurile brute', tva.avertismente.some(a => a.includes('brute')));

console.log('— Furnizori optimi + reformulare —');
const furn = simuleazaStrategie(s0, ctx, { furnizoriOptimi: true }, L);
t('costul scade', furn.foodPaper1 < furn.foodPaper0, `−${(furn.foodPaper0 - furn.foodPaper1).toFixed(0)} lei`);
t('vânzările rămân identice', aprox(furn.net1, furn.net0, 0.5));
t('EBITDA crește exact cu economia de cost', aprox(furn.ebitda1 - furn.ebitda0, furn.foodPaper0 - furn.foodPaper1, 0.5));
const schF = construiesteSchimbari(s0, ctx, { furnizoriOptimi: true }, L).schimbari;
t('doar ingrediente cu ofertă mai bună', schF.every(x => x.tip === 'FURNIZOR' && x.pretNou < pretCurent(s0.ingrediente.find(i => i.cod === x.ingredient)!)), `${schF.length} ingrediente`);
const ret = simuleazaStrategie(s0, ctx, { retetePct: 10 }, L);
t('reformularea scade costul', ret.foodPaper1 < ret.foodPaper0 && ret.ebitda1 > ret.ebitda0, `+${(ret.ebitda1 - ret.ebitda0).toFixed(0)} lei/lună`);

console.log('— Restaurante noi —');
const exp2 = simuleazaStrategie(s0, ctx, { restauranteNoi: 2, rampaPct: 70 }, L);
t('rețeaua trece de la 2 la 4 restaurante', exp2.restaurante0 === 2 && exp2.restaurante1 === 4);
t('vânzările cresc cu 2×70%/2 = +70%', aprox(exp2.net1 / exp2.net0, 1.7, 0.01), `×${(exp2.net1 / exp2.net0).toFixed(3)}`);
t('costurile de operare se dublează (chirie integrală)', aprox(exp2.operare1 / exp2.operare0, 2, 0.01));
t('labor crește cu minimum 80% pe restaurant', aprox(exp2.labor1 / exp2.labor0, 1.8, 0.01));
t('Food Cost % rămâne același (structura nu se schimbă)', aprox(exp2.fc1!, exp2.fc0!, 0.05));
t('EBITDA crește', exp2.ebitda1 > exp2.ebitda0, `${exp2.ebitda0.toFixed(0)} → ${exp2.ebitda1.toFixed(0)} lei`);
t('avertisment despre CAPEX', exp2.avertismente.some(a => a.includes('CAPEX')));

console.log('— Lansarea meniului din R&D —');
const cuRnD = {
  ...s0,
  rnd: [{
    id: 'R1', nume: 'Test', creat: '2026-07-20', status: 'APROBAT' as const,
    cod: 'RD01', denumire: 'Burger nou', categorie: 'R&D',
    pretInstore: 24.9, pretDelivery: 27.9, tva: 10,
    linii: [{ comp: 'I005', tipComp: 'INGREDIENT' as const, cant: 1, um: 'buc' as const, canal: 'AMBELE' as const },
            { comp: 'SP-021', tipComp: 'SEMIPREPARAT' as const, cant: 130, um: 'g' as const, canal: 'AMBELE' as const }],
    bucInstore: 500, bucDelivery: 250,
  }],
};
const rnd = simuleazaStrategie(cuRnD, buildCtx(cuRnD), { lanseazaMeniuRnD: true }, L);
t('produsul aprobat intră în simulare', rnd.sim.noi.includes('Burger nou'), rnd.sim.noi.join(','));
t('vânzările și EBITDA cresc', rnd.net1 > rnd.net0 && rnd.ebitda1 > rnd.ebitda0, `+${(rnd.ebitda1 - rnd.ebitda0).toFixed(0)} lei/lună`);
t('fără variante aprobate: eticheta o spune', simuleazaStrategie(s0, ctx, { lanseazaMeniuRnD: true }, L).pargheiAplicate.some(x => x.includes('nicio variantă')));

console.log('— Scenariu combinat —');
const comb = simuleazaStrategie(s0, ctx, { pretGlobalPct: 3, furnizoriOptimi: true, retetePct: 5, restauranteNoi: 1, rampaPct: 80 }, L);
t('toate pârghiile sunt listate', comb.pargheiAplicate.length === 4, `${comb.pargheiAplicate.length} pârghii`);
t('EBITDA crește semnificativ', comb.ebitda1 > comb.ebitda0 * 1.2, `${comb.ebitda0.toFixed(0)} → ${comb.ebitda1.toFixed(0)} lei`);
t('concluzia spune că se creează valoare', comb.concluzie.includes('creează valoare'));
t('Food Cost scade', (comb.fc1 ?? 0) < (comb.fc0 ?? 0), `${comb.fc0?.toFixed(2)} → ${comb.fc1?.toFixed(2)}`);
t('contul rămâne coerent: marjă = vânzări − food', aprox(comb.cont[2].valoare1, comb.cont[0].valoare1 - comb.cont[1].valoare1, 0.5));
t('EBITDA = marjă − labor − operare', aprox(comb.cont[6].valoare1, comb.cont[2].valoare1 - comb.cont[3].valoare1 - comb.cont[5].valoare1, 0.5));

console.log('— Coerență cu motorul de simulare —');
const direct = simuleaza(s0, ctx, { schimbari: construiesteSchimbari(s0, ctx, { pretGlobalPct: 5 }, L).schimbari, luna: L });
t('vânzările din strategie = cele din simulare (fără expansiune)', aprox(pret.net1, direct.net1, 0.5));
t('Food Cost identic', aprox(pret.fc1!, direct.fc1!, 0.01));

console.log('— Performanță —');
const t0 = Date.now();
for (let i = 0; i < 5; i++) simuleazaStrategie(s0, ctx, { pretGlobalPct: i, furnizoriOptimi: true, retetePct: 5, restauranteNoi: i }, L);
const t1 = Date.now();
console.log(`  5 scenarii strategice complete: ${t1 - t0} ms`);
t('un scenariu < 300 ms', (t1 - t0) / 5 < 300);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
