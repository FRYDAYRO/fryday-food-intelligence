import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, perProdus, pretCurent, consumuriLuna } from '../src/lib/engine';
import { scoruriProduse, riscIngrediente, echilibruMeniu, verificaReguli, oportunitatiProduse } from '../src/lib/scoruri';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx = buildCtx(s0);
const L = '2026-07';

console.log('— Product Health Score —');
const h = scoruriProduse(s0, ctx, L);
t('toate produsele primesc scor', h.length === 8, `${h.length} produse`);
t('scorurile sunt în 0–100', h.every(x => x.scor >= 0 && x.scor <= 100));
t('sortate descrescător', h.every((x, i) => i === 0 || h[i - 1].scor >= x.scor));
t('ponderile însumează 100%', h.every(x => x.componente.reduce((s, c) => s + c.pondere, 0) === 100));
t('scorul = suma ponderată a componentelor', h.every(x => aprox(x.scor, x.componente.reduce((s, c) => s + c.scor * c.pondere, 0) / 100, 0.001)));
t('verdictul urmează pragurile', h.every(x => x.verdict === (x.scor >= 80 ? 'EXCELENT' : x.scor >= 65 ? 'BUN' : x.scor >= 50 ? 'ATENTIE' : 'CRITIC')));
const cola = h.find(x => x.cod === 'P005')!;
const burger = h.find(x => x.cod === 'P001')!;
t('Cola (FC 31,5%) are componenta Food Cost slabă', cola.componente[0].scor < burger.componente[0].scor, `${cola.componente[0].scor.toFixed(0)} vs ${burger.componente[0].scor.toFixed(0)}`);
t('burgerul are scor mai bun decât Cola', burger.scor > cola.scor, `${burger.scor.toFixed(0)} vs ${cola.scor.toFixed(0)}`);
t('componenta de stabilitate penalizează scumpirea pieptului', burger.componente[5].scor < 100 && burger.volatilitate > 0, `volatilitate ${burger.volatilitate.toFixed(1)}%`);
t('explicația are date, logică, calcule și încredere', h.every(x =>
  x.explicatie.date.length >= 3 && x.explicatie.logica.length > 50 && x.explicatie.calcule.length === 8 && ['RIDICATA','MEDIE','SCAZUTA'].includes(x.explicatie.incredere)));
t('produsele cu volum mare au încredere ridicată', h.filter(x => x.buc >= 300).every(x => x.explicatie.incredere === 'RIDICATA'));

console.log('— Ingredient Risk Analyzer —');
const r = riscIngrediente(s0, ctx, L);
t('doar ingredientele consumate', r.length > 0 && r.length <= s0.ingrediente.length, `${r.length} ingrediente`);
t('scoruri 0–100, ordonate', r.every(x => x.scor >= 0 && x.scor <= 100) && r.every((x, i) => i === 0 || r[i - 1].scor >= x.scor));
t('scorul = suma ponderată', r.every(x => aprox(x.scor, x.componente.reduce((s, c) => s + c.scor * c.pondere, 0) / 100, 0.001)));
const piept = r.find(x => x.cod === 'I001')!;
const cons = consumuriLuna(s0, ctx, L);
t('riscul la +10% = 10% × preț × consum', aprox(piept.riscLa10Pct, pretCurent(s0.ingrediente.find(i => i.cod === 'I001')!) * 0.1 * cons.get('I001')!.cant, 0.5), `${piept.riscLa10Pct.toFixed(0)} lei`);
t('risc anual = 12 × lunar', r.every(x => aprox(x.riscAnual, x.riscLa10Pct * 12, 0.01)));
t('pieptul are risc ridicat (4 produse, cost mare, scumpit)', piept.nivel === 'RIDICAT', `${piept.scor.toFixed(0)}/100`);
t('numărul de produse coincide cu utilizările', piept.nrProduse === 4 && piept.produse.length === 4);
t('shareCost însumează ~100% pe toate ingredientele', aprox(r.reduce((s, x) => s + x.shareCost, 0), 100, 0.5), `${r.reduce((s, x) => s + x.shareCost, 0).toFixed(1)}%`);
t('fiecare risc are explicație completă', r.every(x => x.explicatie.calcule.length === 5 && x.explicatie.impact.includes('lei')));

console.log('— Menu Balance Analyzer —');
const e = echilibruMeniu(s0, ctx, L);
const rows = perProdus(s0.vanzari, ctx, { luna: L, vedere: 'TOTAL' });
t('toate categoriile analizate', e.categorii.length === new Set(rows.map(x => x.categorie)).size);
t('SKU-urile însumează 100%', aprox(e.categorii.reduce((s, c) => s + c.shareSKU, 0), 100, 0.5));
t('vânzările însumează 100%', aprox(e.categorii.reduce((s, c) => s + c.shareVanzari, 0), 100, 0.5));
t('echilibru = %vânzări − %SKU', e.categorii.every(c => aprox(c.scorEchilibru, c.shareVanzari - c.shareSKU, 0.001)));
t('verdictul urmează pragul de 8 pp', e.categorii.every(c =>
  c.verdict === (c.scorEchilibru <= -8 ? 'SUPRADIMENSIONATA' : c.scorEchilibru >= 8 ? 'SUBREPREZENTATA' : 'ECHILIBRATA')));
t('recomandări pentru R&D generate', e.recomandariRnD.length > 0, `${e.recomandariRnD.length} recomandări`);
t('explicația listează fiecare categorie', e.explicatie.calcule.length === e.categorii.length);

console.log('— Business Rule Engine —');
const v = verificaReguli(s0, ctx, L);
t('regulile din seed sunt verificate', v.verificate > 0, `${v.verificate} verificări`);
t('încălcări detectate', v.incalcari.length > 0, `${v.incalcari.length} încălcări`);
t('ordonate după abatere', v.incalcari.every((x, i) => i === 0 || v.incalcari[i - 1].abatere >= x.abatere));
t('regula de marjă prinde Cola (68,5% < 70%)', v.incalcari.some(i => i.regula.tip === 'MARJA_MIN' && i.subiect.includes('Cola')));
t('regula de cost pe ingredient prinde pieptul (14 > 13,5)', v.incalcari.some(i => i.regula.tip === 'COST_MAX_INGREDIENT' && i.subiect.includes('Piept')));
t('abaterea = valoare − limită (sau invers pentru minime)', v.incalcari.every(i => i.abatere > 0));
// dezactivarea unei reguli o scoate din verificare
const s1 = { ...s0, reguliBusiness: s0.reguliBusiness.map(x => x.tip === 'MARJA_MIN' ? { ...x, activ: false } : x) };
t('regula dezactivată nu mai generează încălcări', verificaReguli(s1, ctx, L).incalcari.every(i => i.regula.tip !== 'MARJA_MIN'));
// o regulă imposibilă generează încălcări pentru toate produsele
const s2 = { ...s0, reguliBusiness: [{ id: 'X', tip: 'VOLUM_MIN' as const, nume: 'test', valoare: 999999, activ: true }] };
t('regulă imposibilă → toate produsele o încalcă', verificaReguli(s2, ctx, L).incalcari.length === rows.filter(x => x.buc > 0).length);

console.log('— Product Opportunity Engine —');
const op = oportunitatiProduse(s0, ctx, L);
t('oportunități generate', op.length > 0, `${op.length}`);
t('tipuri valide', op.every(x => ['PROMOVARE', 'REFORMULARE', 'ELIMINARE', 'CRESTERE'].includes(x.tip)));
t('sortate după impact lunar', op.every((x, i) => i === 0 || (op[i - 1].impactLunar ?? -1) >= (x.impactLunar ?? -1)));
t('impact anual = 12 × lunar', op.every(x => x.impactLunar == null || aprox(x.impactAnual!, x.impactLunar * 12, 0.01)));
t('fiecare are motiv și explicație', op.every(x => x.motiv.length > 20 && x.explicatie.calcule.length >= 3));
t('produsele peste țintă merg la reformulare', op.filter(x => x.tip === 'REFORMULARE').every(x => (h.find(y => y.cod === x.cod)?.fc ?? 0) > 21));

console.log('— Performanță —');
const t0 = Date.now(); scoruriProduse(s0, ctx, L); const t1 = Date.now();
riscIngrediente(s0, ctx, L); const t2 = Date.now();
verificaReguli(s0, ctx, L); const t3 = Date.now();
console.log(`  scoruri ${t1 - t0} ms · risc ${t2 - t1} ms · reguli ${t3 - t2} ms`);
t('scoruri < 500 ms', t1 - t0 < 500);
t('risc < 500 ms', t2 - t1 < 500);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
