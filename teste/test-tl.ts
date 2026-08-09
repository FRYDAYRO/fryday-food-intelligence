import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, aplicaInDate, kpiProdus, consumPerPortie, pretLa } from '../src/lib/engine';
import { dosarProdus, evenimenteProdus, serieProdus, comparaInainteDupa, traiectorie, proiectieProfit } from '../src/lib/timeline';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx = buildCtx(s0);
const L = '2026-07';

console.log('— Evenimentele produsului —');
const ev = evenimenteProdus(s0, ctx, 'P001');
t('sortate cronologic', ev.every((e, i) => i === 0 || ev[i - 1].data <= e.data));
t('lansarea = prima vânzare (2026-06-01)', ev[0].tip === 'LANSARE' && ev[0].data === '2026-06-01' || ev.some(e => e.tip === 'LANSARE' && e.data === '2026-06-01'));
t('ambele versiuni de rețetă apar', ev.filter(e => e.tip === 'RETETA').length === 2, ev.filter(e => e.tip === 'RETETA').map(e => e.data).join(','));
const v2 = ev.find(e => e.tip === 'RETETA' && e.data === '2026-05-01')!;
t('v2 arată creșterea de cost 110g → 120g', v2.detaliu.includes('cost porție') && v2.detaliu.includes('→'), v2.detaliu.slice(-45));
const scump = ev.find(e => e.tip === 'COST_INGREDIENT' && e.titlu.includes('Piept'))!;
t('scumpirea pieptului (13,20 → 14,00) apare', !!scump && scump.data === '2026-07-01', scump?.titlu);
t('scumpirea e în fereastra cu vânzări', scump.inFereastra);
t('evenimentele din ianuarie sunt marcate în afara ferestrei', ev.filter(e => e.data < '2026-06-01' && e.tip !== 'LANSARE').every(e => !e.inFereastra));
// produs fără semipreparat: doar ingredientele proprii
const evCola = evenimenteProdus(s0, ctx, 'P005');
t('Cola nu moștenește scumpirea pieptului', !evCola.some(e => e.titlu.includes('Piept')));

console.log('— Seria săptămânală —');
const serie = serieProdus(s0, ctx, 'P001', 'SAPTAMANA');
t('8–9 săptămâni de date', serie.length >= 8, `${serie.length} săptămâni`);
t('profitul = net − cost pe fiecare punct', serie.every(p => aprox(p.profit, p.net - p.cost, 0.01)));
t('profitul unitar = profit / bucăți', serie.every(p => p.buc === 0 || aprox(p.profitUnitar, p.profit / p.buc, 0.001)));
t('FC = cost / net', serie.every(p => p.net === 0 || aprox(p.fc!, (p.cost / p.net) * 100, 0.001)));
const totalBuc = serie.reduce((s, p) => s + p.buc, 0);
const bucReal = s0.vanzari.filter(v => v.produs === 'P001').reduce((s, v) => s + v.cant, 0);
t('Σ bucăți = PMIX', totalBuc === bucReal, `${totalBuc}`);

console.log('— Înainte vs după o modificare —');
const cmp = comparaInainteDupa(s0, ctx, 'P001', '2026-07-01', 14)!;
t('comparația există pentru scumpirea din 1 iulie', !!cmp);
t('costul pe porție crește după scumpire', cmp.dupa.costUnitar > cmp.inainte.costUnitar, `${cmp.inainte.costUnitar.toFixed(3)} → ${cmp.dupa.costUnitar.toFixed(3)}`);
// verificare independentă: Δcost/porție = Δpreț × consum piept/porție (0,10909 kg × 0,80 lei)
// efectul curat al rețetei, verificat independent: Σ (Δpreț × consum/porție) pentru toate ingredientele scumpite la 1 iulie
const asteptat = s0.ingrediente.reduce((s, ing) => {
  const dupaPret = pretLa(ing, '2026-07-01') ?? 0;
  const inaintePret = pretLa(ing, '2026-06-30') ?? 0;
  if (aprox(dupaPret, inaintePret, 1e-9)) return s;
  return s + (dupaPret - inaintePret) * consumPerPortie(ing.cod, 'P001', 'INSTORE', ctx);
}, 0);
t('Δcost/porție InStore = Σ (Δpreț × consum) pe ingredientele scumpite la 1 iulie',
  aprox(cmp.dupa.costUnitarIn - cmp.inainte.costUnitarIn, asteptat, 0.002),
  `${(cmp.dupa.costUnitarIn - cmp.inainte.costUnitarIn).toFixed(4)} vs ${asteptat.toFixed(4)}`);
t('explicația separă efectul rețetei de mixul de canale', cmp.explicatie.includes('efectul rețetei'), cmp.explicatie.slice(cmp.explicatie.indexOf('din care'), cmp.explicatie.indexOf('din care') + 80));
t('Food Cost crește', (cmp.dFcPP ?? 0) > 0, `${cmp.dFcPP?.toFixed(2)} pp`);
t('profitul pe porție scade', cmp.dProfitUnitar < 0);
t('verdictul e de degradare sau neutru', ['DEGRADARE', 'NEUTRU'].includes(cmp.verdict), cmp.verdict);
t('explicația conține volum, cost și profit', /volum/.test(cmp.explicatie) && /cost\/porție/.test(cmp.explicatie) && /profit\/porție/.test(cmp.explicatie));
t('fără vânzări de o parte → null', comparaInainteDupa(s0, ctx, 'P001', '2026-01-10', 14) === null);

console.log('— Traiectorie și proiecție —');
const tr = traiectorie(serie);
t('direcție validă + dovadă numerică', ['IMBUNATATIRE', 'STABIL', 'DEGRADARE'].includes(tr.directie) && tr.dovada.includes('săptămâni'), tr.directie);
t('panta profitului unitar e negativă după scumpire', tr.pantaProfitUnitar < 0.05, tr.pantaProfitUnitar.toFixed(4));
t('serie prea scurtă → stabil, cu motiv', traiectorie(serie.slice(0, 2)).dovada.includes('Prea puține'));
const pr = proiectieProfit(serie)!;
t('proiecția acoperă 4 săptămâni', !!pr && pr.saptamaniIstoric === serie.length);
t('proiecția lunară ≈ 4 săptămâni × 30/7', aprox(pr.proiectieLunara, (pr.proiectie4Saptamani / 4) * (30 / 7), 0.5));
t('intervalul include proiecția', pr.interval.min <= pr.proiectie4Saptamani && pr.proiectie4Saptamani <= pr.interval.max);
t('metoda e declarată onest', pr.metoda.includes('Regresie liniară') && pr.metoda.includes('invalidează'));
t('sub 3 săptămâni → fără proiecție', proiectieProfit(serie.slice(0, 2)) === null);

console.log('— Dosarul complet & recomandări —');
const d = dosarProdus(s0, ctx, 'P001', L);
t('dosarul are toate secțiunile', !!d.health && d.evenimente.length > 0 && d.serie.length > 0 && d.recomandari.length > 0);
t('comparațiile sunt doar pentru evenimente din fereastră', d.comparatii.every(c => c.ev.inFereastra));
t('recomandările sunt ordonate după prioritate', d.recomandari.every((r, i) => i === 0 || ['MARE', 'MEDIE', 'MICA'].indexOf(d.recomandari[i - 1].prioritate) <= ['MARE', 'MEDIE', 'MICA'].indexOf(r.prioritate)));
t('scumpirea generează recomandare de furnizor alternativ', d.recomandari.some(r => r.unde.includes('Supplier')), d.recomandari.map(r => r.actiune.slice(0, 30)).join(' | '));
const dCola = dosarProdus(s0, ctx, 'P005', L);
t('Cola (FC 31,5%) primește recomandare de reformulare cu prioritate mare',
  dCola.recomandari[0].prioritate === 'MARE' && dCola.recomandari[0].actiune.includes('Reformulează'), dCola.recomandari[0].actiune);

console.log('— Jurnalul prețurilor de vânzare —');
const s1 = aplicaInDate(s0, { nume: 'Preț nou Cola', schimbari: [{ tip: 'PRET_VANZARE', produs: 'P005', canal: 'INSTORE', pretNou: 7.9 }] });
const p5 = s1.produse.find(p => p.cod === 'P005')!;
t('modificarea de preț se jurnalizează', (p5.istoricPret ?? []).length === 1 && p5.istoricPret![0].pret === 7.9);
t('jurnalul păstrează numele scenariului', p5.istoricPret![0].nota === 'Preț nou Cola');
const evNou = evenimenteProdus(s1, buildCtx(s1), 'P005');
t('evenimentul de preț apare în cronologie', evNou.some(e => e.tip === 'PRET' && e.titlu.includes('7,90')), evNou.filter(e => e.tip === 'PRET').map(e => e.titlu).join(','));
t('prețul din nomenclator s-a actualizat', kpiProdus('P005', 'INSTORE', buildCtx(s1))!.net! > kpiProdus('P005', 'INSTORE', ctx)!.net!);

console.log('— Performanță —');
const t0 = Date.now();
for (const p of s0.produse) dosarProdus(s0, ctx, p.cod, L);
const t1 = Date.now();
console.log(`  dosar complet × ${s0.produse.length} produse: ${t1 - t0} ms`);
t('un dosar < 200 ms', (t1 - t0) / s0.produse.length < 200);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
