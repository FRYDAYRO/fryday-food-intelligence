// PR #23 — declarațiile de includere: singura sursă de statut, validate pe linia lor; formularul din
// Reconciliere le scrie prin motor, iar statutul se recalculează din stare.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCtx } from '../src/lib/engine';
import { reconciliationFC } from '../src/lib/fc-core';
import { COMPANIE, perioadaDin, type CerereFC } from '../src/lib/fc-domeniu';
import { accesTower, cerereBaza, type SelectieFC } from '../src/lib/fc-tower';
import { adaugaDeclaratie, cantitateDisponibila, declaratiiLiniei, eComparabila, retrageDeclaratie, valideazaDeclaratie } from '../src/lib/declaratii';
import { stareGoala } from '../src/lib/seed';
import { AtribuireWaste } from '../src/views/tower/AtribuireWaste';
import { TowerProvider, type TowerCtx } from '../src/views/tower/context';
import type { AppState, DeclaratieIncludere, Eveniment28, Material29 } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

const F = { de: '2026-08-01', la: '2026-08-31', granularitate: 'LUNA' as const };
const F8 = { de: '2026-08-01', la: '2026-08-31' };
const mat = (material: string, denumire: string, um: string, ajustari: number | undefined, costPeUnitate: number, costActual: number): Material29 => ({
  perioada: '2026-08', locatie: 'L01', material, denumire, categorie: 'Food 11%', cant: null, um: null, costActual, costTeoretic: null,
  umInventar: um, costPeUnitate, fereastra: F, sursa: { fisier: '2.9.pdf', rand: 1 }, ...(ajustari !== undefined ? { ajustari } : {}),
});
const ev = (rand: number, cod: string, denumire: string, motiv: string, um: string, cant: number, costUnitar: number, lei: number): Eveniment28 =>
  ({ locatie: 'L01', fereastra: F8, cod, denumire, motiv, utilizator: 'alina.nasaudean', um, cant, costUnitar, lei, rand, sursa: { fisier: '2.8.pdf', rand } });
const S0: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }],
  linii29: [{ perioada: '2026-08', locatie: 'L01', categorie: 'Food 11%', valoare: 6143, fereastra: F, sursa: { fisier: '2.9.pdf' } }],
  materiale29: [mat('4064', 'Sos Cheddar BIB', 'KG', 3.8, 45.07, 6081), mat('702458', 'Sausage Patty', 'Each', 23, 2.48, 62), mat('702092', 'Furculita Rosie', 'EA', 6, 0.27, 96)],
  evenimente28: [
    ev(1, '4064', 'Sos Cheddar BIB', 'End of Day', 'KG', 0.26, 45.07, 11.72), ev(2, '4064', 'Sos Cheddar BIB', 'End of Day', 'KG', 3.56, 45.07, 160.45),
    ev(3, '702458', 'Sausage Patty', 'End of Day', 'Each', 23, 2.47, 56.88), ev(4, '910015', 'TIRAMISU CU FISTIC new', 'Dropped', 'EA', 3, 9.55, 28.64),
  ],
  salesReport: [{ data: '2026-08-15', locatie: 'L01', canal: 'INSTORE', net: 675735.58 }],
};
const cerere: CerereFC = { perioada: perioadaDin('2026-08-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' };
const rec = (s: AppState) => reconciliationFC(s, buildCtx(s), cerere);
const linie = (s: AppState, material: string) => rec(s).waste.potrivire!.linii.find(l => l.material === material)!;
const decl = (material: string, includere: DeclaratieIncludere['includere'], cant: number, extra: Partial<DeclaratieIncludere> = {}): DeclaratieIncludere =>
  ({ locatie: 'L01', fereastra: F8, material, includere, cant, temei: 'DECLARATIE_UTILIZATOR', sursa: 'test 2026-09-05', ...extra });

console.log('— 1. Validarea pe linie —');
const ch = linie(S0, '4064');
t('Sos Cheddar e comparabilă (3,82 vs 3,8, compatibilă cu precizia)', eComparabila(ch) && ch.potrivire === 'COMPATIBILA_CU_PRECIZIA');
t('cantitatea disponibilă: EXCLUS ≤ Adj (3,8), INCLUS ≤ rămas nedeterminat (3,82)', aprox(cantitateDisponibila(ch, 'EXCLUS_PRIN_AJUSTARE'), 3.8) && aprox(cantitateDisponibila(ch, 'INCLUS_IN_USAGE'), 3.82));
t('declarație valabilă: fără erori', valideazaDeclaratie(ch, decl('4064', 'EXCLUS_PRIN_AJUSTARE', 3.8)).length === 0);
t('EXCLUS peste Adj → eroare', valideazaDeclaratie(ch, decl('4064', 'EXCLUS_PRIN_AJUSTARE', 3.82)).some(e => e.includes('Inv Adj')));
t('INCLUS peste cantitatea 2.8 → eroare', valideazaDeclaratie(ch, decl('4064', 'INCLUS_IN_USAGE', 4)).some(e => e.includes('cantitatea 2.8')));
t('cantitate zero sau negativă → eroare', valideazaDeclaratie(ch, decl('4064', 'INCLUS_IN_USAGE', 0)).some(e => e.includes('pozitivă')));
t('fără sursă → eroare', valideazaDeclaratie(ch, decl('4064', 'INCLUS_IN_USAGE', 1, { sursa: '  ' })).some(e => e.includes('sursa')));
t('alt material / altă fereastră / alt restaurant → eroare de cheie',
  valideazaDeclaratie(ch, decl('702458', 'INCLUS_IN_USAGE', 1)).some(e => e.includes('nu privește'))
  && valideazaDeclaratie(ch, decl('4064', 'INCLUS_IN_USAGE', 1, { fereastra: { de: '2026-07-01', la: '2026-07-31' } })).some(e => e.includes('nu privește'))
  && valideazaDeclaratie(ch, decl('4064', 'INCLUS_IN_USAGE', 1, { locatie: 'L02' })).some(e => e.includes('nu privește')));
const tir = linie(S0, '910015');
t('linie fără corespondent 2.9: necomparabilă, cantitate disponibilă 0, declarația e refuzată', !eComparabila(tir) && cantitateDisponibila(tir, 'INCLUS_IN_USAGE') === 0 && valideazaDeclaratie(tir, decl('910015', 'INCLUS_IN_USAGE', 3)).some(e => e.includes('Comparația nu e validă')));
const fur = linie(S0, '702092');
t('Adj fără eveniment: nimic de declarat (disponibil 0)', cantitateDisponibila(fur, 'EXCLUS_PRIN_AJUSTARE') === 0 && cantitateDisponibila(fur, 'INCLUS_IN_USAGE') === 0);

console.log('\n— 2. Scrierea în stare și recalculul statutului —');
const S1 = adaugaDeclaratie(S0, decl('4064', 'EXCLUS_PRIN_AJUSTARE', 3.8, { sursa: '  document NBO  ' }));
t('declarația intră în stare, cu sursa curățată', S1.declaratiiIncludere?.length === 1 && S1.declaratiiIncludere[0].sursa === 'document NBO');
t('statutul se recalculează: 171,27 lei excluși, 0,90 nedeterminați', aprox(rec(S1).waste.exclusLei, 171.27) && aprox(linie(S1, '4064').parti.NEDETERMINAT.lei, 0.9));
t('după EXCLUS 3,8, mai rămâne doar INCLUS ≤ 0,02', aprox(cantitateDisponibila(linie(S1, '4064'), 'EXCLUS_PRIN_AJUSTARE'), 0) && aprox(cantitateDisponibila(linie(S1, '4064'), 'INCLUS_IN_USAGE'), 0.02));
t('a doua declarație EXCLUS pe aceeași linie e refuzată (plafonul Adj e consumat)', valideazaDeclaratie(linie(S1, '4064'), decl('4064', 'EXCLUS_PRIN_AJUSTARE', 1)).length > 0);
const S2 = adaugaDeclaratie(S1, decl('702458', 'INCLUS_IN_USAGE', 23, { temei: 'LEGATURA_STOC_VERIFICATA' }));
t('INCLUS 23 pe Sausage: pasul WASTE devine disponibil cu 56,88 și Neexplicatul scade exact cu atât',
  rec(S2).pasi.find(p => p.id === 'WASTE')!.disponibil && aprox(rec(S2).waste.inclusLei, 56.88)
  && aprox(rec(S2).pasi.find(p => p.id === 'UNEXPLAINED')!.lei, rec(S0).pasi.find(p => p.id === 'UNEXPLAINED')!.lei - 56.88));
t('declarațiile liniei se citesc din stare', declaratiiLiniei(S2, linie(S2, '4064')).length === 1 && declaratiiLiniei(S2, linie(S2, '702458')).length === 1);
const S3 = retrageDeclaratie(S2, decl('702458', 'INCLUS_IN_USAGE', 23, { temei: 'LEGATURA_STOC_VERIFICATA' }));
t('retragerea scoate exact declarația și statutul revine', S3.declaratiiIncludere?.length === 1 && rec(S3).waste.inclusLei === 0 && !rec(S3).pasi.find(p => p.id === 'WASTE')!.disponibil);
t('retragerea unei declarații inexistente nu schimbă starea', retrageDeclaratie(S3, decl('4064', 'INCLUS_IN_USAGE', 1)) === S3);
t('MUTAȚIE „statut memorat": declarația ștearsă din stare nu lasă urme în rezultat', rec({ ...S2, declaratiiIncludere: [] }).waste.inclusLei === 0 && rec({ ...S2, declaratiiIncludere: [] }).waste.exclusLei === 0);

console.log('\n— 3. Formularul din Reconciliere —');
const SEL: SelectieFC = { ancora: '2026-08-15', granularitate: 'LUNA', comparatie: 'PERIOADA_PRECEDENTA', scop: 'COMPANIE', locatie: null, canal: 'TOTAL' };
const context = (state: AppState, extra: Partial<TowerCtx> = {}): TowerCtx => ({
  state, ctx: buildCtx(state), sel: SEL, setSel: () => undefined, acces: accesTower(state, { rol: 'ADMIN' }, false), update: () => undefined, ...extra,
});
const randeaza = (state: AppState) => renderToStaticMarkup(h(TowerProvider, { value: context(state) }, h(AtribuireWaste, { rec: reconciliationFC(state, buildCtx(state), cerereBaza(SEL)) })));
const html0 = randeaza(S0);
t('secțiunea arată cele trei părți și liniile de potrivire', html0.includes('Inclus în Usage Actual') && html0.includes('Exclus prin ajustare') && html0.includes('Nedeterminat') && html0.includes('Sos Cheddar BIB') && html0.includes('compatibilă cu precizia'));
t('liniile comparabile au formularul de declarație; cele fără comparație validă nu', (html0.match(/data-actiune="declara"/g) ?? []).length === 2 && html0.includes('fără comparație validă'));
t('formularul cere includere, cantitate, temei și sursă', ['includere', 'cant', 'temei', 'sursa'].every(c => html0.includes(`data-camp="${c}"`)));
t('drill-down la evenimente cu rândul sursă', html0.includes('2.8.pdf, rândul 1') && html0.includes('End of Day'));
const html2 = randeaza(S2);
t('declarațiile existente apar pe linie, cu temei, sursă și buton de retragere', html2.includes('document NBO') && html2.includes('legătură verificată') && (html2.match(/data-actiune="retrage"/g) ?? []).length === 2);
t('cu INCLUS declarat, coloana „Inclus" arată 56,88 și cardul spune că scade Neexplicatul', html2.includes('56,88') && html2.includes('scade Neexplicatul'));

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
process.exit(fail ? 1 : 0);
