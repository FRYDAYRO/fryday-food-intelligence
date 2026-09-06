import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, perProdus, menuEngineering, alerte, aplicaInDate, lunaPrec, PRAG_IMPACT_LEI } from '../src/lib/engine';

// ceasul, fixat: fereastra de schimbări recente a lui `alerte` se măsoară față de el.
// Fără asta, suita ar pica singură pe măsură ce calendarul înaintează.
const ACUM = '2026-08-15';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const s0 = genereazaSeed();
const ctx0 = buildCtx(s0);

console.log('— Menu Engineering —');
const rows = perProdus(s0.vanzari, ctx0, { luna: '2026-07', vedere: 'TOTAL' });
const me = menuEngineering(rows);
t('toate produsele clasificate', me.randuri.length === rows.filter(r => r.buc > 0 && !r.faraReteta).length);
t('prag popularitate = 70/n', Math.abs(me.pragPop - 70 / me.randuri.length) < 1e-9, me.pragPop.toFixed(2) + '%');
const cmVerif = me.randuri.reduce((s, r) => s + r.profit, 0) / me.randuri.reduce((s, r) => s + r.buc, 0);
t('cm mediu = Σprofit/Σbuc', Math.abs(me.cmMediu - cmVerif) < 1e-9, me.cmMediu.toFixed(3));
t('clasele respectă pragurile', me.randuri.every(r => {
  const pop = r.mixBuc >= me.pragPop, prof = r.profitUnitar >= me.cmMediu;
  const c = pop && prof ? 'STAR' : pop ? 'PLOWHORSE' : prof ? 'PUZZLE' : 'DOG';
  return c === r.clasa;
}));
const clase = new Set(me.randuri.map(r => r.clasa));
t('matricea are cel puțin 3 cadrane populate', clase.size >= 3, [...clase].join(','));
t('Cola e plowhorse sau dog (FC mare, popular)', ['PLOWHORSE', 'DOG'].includes(me.randuri.find(r => r.cod === 'P005')!.clasa), me.randuri.find(r => r.cod === 'P005')!.clasa);

console.log('— Alerts Center —');
const a0 = alerte(s0, ctx0, '2026-07', ACUM);
t('există alerte FC peste target (țintă 21%)', a0.some(a => a.categorie === 'FC_PESTE_TINTA'));
t('Cola (FC ~32%) semnalată', a0.some(a => a.titlu.includes('Cola')));
t('sortare: criticele primele', a0.length === 0 || a0[0].nivel === 'CRITIC' || !a0.some(a => a.nivel === 'CRITIC'));
// piept +6% e sub pragul %, dar volumul mare îl face relevant în lei → alertă de impact, nu de prag
const alSeed = a0.find(a => a.categorie === 'COST_INGREDIENT' && a.titlu.includes('Piept'));
t('seed: +6% sub prag, dar impact ≥ 250 lei/lună → alertă ATENTIE', alSeed?.nivel === 'ATENTIE' && alSeed.titlu.includes('lei/lună'), alSeed?.titlu ?? 'lipsă');

// scumpire mare azi → alertă CRITIC (+43% ≥ 2×prag)
const s1 = aplicaInDate(s0, { nume: 'Șoc preț', schimbari: [{ tip: 'PRET_INGREDIENT', ingredient: 'I001', pretNou: 20 }] });
const a1 = alerte(s1, buildCtx(s1), '2026-07', ACUM);
const alPiept = a1.find(a => a.categorie === 'COST_INGREDIENT' && a.titlu.includes('Piept'));
t('scumpire +43% (peste prag, sub 2×prag) → ATENTIE', alPiept?.nivel === 'ATENTIE', alPiept?.titlu ?? 'lipsă');
const s1b = aplicaInDate(s0, { nume: 'Șoc dublu', schimbari: [{ tip: 'PRET_INGREDIENT', ingredient: 'I001', pretNou: 30 }] });
const a1b = alerte(s1b, buildCtx(s1b), '2026-07', ACUM);
t('scumpire +114% (≥ 2×prag) → CRITIC', a1b.find(a => a.categorie === 'COST_INGREDIENT' && a.titlu.includes('Piept'))?.nivel === 'CRITIC');

// marjă: iulie vs iunie — scumpirea pieptului din seed (13,2→14) taie marja unor produse cu <1,5pp → nu; verificăm mecanismul cu șocul de preț aplicat DOAR pe iulie
t('lunaPrec corect', lunaPrec('2026-07') === '2026-06' && lunaPrec('2026-01') === '2025-12');
// marjă: prețul aplicat azi (27.07) nu atinge vânzările din 1–26.07 → corect, nicio alertă retroactivă
t('prețul de azi NU rescrie marja lunii în curs', a1.filter(a => a.categorie === 'MARJA').length === 0);
// dar un preț valabil de la 1 iulie schimbă marja iul vs iun → mecanismul se declanșează
const s3 = { ...s0, ingrediente: s0.ingrediente.map(i => i.cod !== 'I001' ? i : { ...i, preturi: [{ validDeLa: '2026-01-01', pret: 13.2 }, { validDeLa: '2026-07-01', pret: 20 }] }) };
const a3 = alerte(s3, buildCtx(s3), '2026-07', ACUM);
const aM = a3.filter(a => a.categorie === 'MARJA');
t('scumpire de la 1 iulie → alerte de scădere a marjei (iul vs iun)', aM.length >= 2, `${aM.length} produse: ${aM.map(x => x.titlu.split(':')[0]).join(', ')}`);

// impact rețetă: aplicăm o schimbare de rețetă cu impact mare (SP-021 la 160 g în P001)
const s2 = aplicaInDate(s0, { nume: 'Gramaj mare', schimbari: [{ tip: 'GRAMAJ', reteta: 'P001', linie: 1, cantNoua: 160 }] });
const a2 = alerte(s2, buildCtx(s2), '2026-07', ACUM);
const alRet = a2.find(a => a.categorie === 'IMPACT' && a.titlu.includes('Crispy Burger'));
t(`versiunea nouă cu impact ≥ ${PRAG_IMPACT_LEI} lei semnalată`, !!alRet, alRet?.titlu ?? 'lipsă');
t('creșterea de cost e ATENTIE', alRet?.nivel === 'ATENTIE');

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
