// D3 — rapoartele 2.9 săptămânale și lunare coexistă: nu se șterg, nu se adună.
//
// Contract:
//   · fiecare rând 2.9 poartă fereastra REALĂ a raportului (de, la, granularitate) și
//     proveniența (fișier, amprentă, rând); identitatea de înlocuire e (fereastră, restaurant);
//   · un săptămânal nu șterge lunarul, lunarul nu șterge săptămânile, două săptămâni coexistă;
//   · reimportul corectat al ACELEIAȘI ferestre înlocuiește doar rândurile acelei ferestre;
//   · analiza săptămânală folosește sursa săptămânală cu exact acea fereastră; analiza lunară
//     folosește raportul lunar; lunarul NU se însumează cu săptămânile lui;
//   · surse concurente pe aceeași cerere, fără regulă deterministă → blocat cu motiv.
import { importaPrinCentru, pregatesteImport, type CerereImport } from '../src/lib/import-center';
import type { Parsat } from '../src/lib/importer';
import { nboFC, numitorFC } from '../src/lib/fc-core';
import { bridgeFC } from '../src/lib/fc-bridge';
import { reconciliationMaterialFC } from '../src/lib/fc-material';
import { buildCtx, fcPerioada } from '../src/lib/engine';
import { COMPANIE, perioadaDin, restaurant } from '../src/lib/fc-domeniu';
import { verdictCombinare, bandaPerioade, COMBINATIE_FC } from '../src/lib/perioade-surse';
import { fereastraRand, granularitateFereastra, selecteaza29 } from '../src/lib/surse-29';
import { stareGoala } from '../src/lib/seed';
import type { AppState, Material29 } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
const ACUM = (h: number) => `2026-09-03T${String(h).padStart(2, '0')}:00:00.000Z`;

const BAZA: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'FRYDAY IASI PALAS' }, { cod: 'L02', nume: 'FRYDAY ORADEA' }],
  ingrediente: [{ cod: 'M1', denumire: 'Carne vita', categorie: 'MP', tip: 'FOOD', um: 'kg', preturi: [{ validDeLa: '2026-07-01', pret: 40 }], activ: true }],
};
const ANTETE = ['Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Categorie', 'Cost actual'];
const rand = (loc: string, cod: string, den: string, cat: string, cost: number, perioada = '2026-08') =>
  ({ Perioada: perioada, Locatie: loc, 'Cod material': cod, 'Denumire material': den, Categorie: cat, 'Cost actual': cost });
const P = (randuri: Record<string, unknown>[]): Parsat => ({ antete: ANTETE, randuri, foaie: 'S1' });
const imp = (s: AppState, c: Omit<CerereImport, 'tip'>) => importaPrinCentru(s, { ...c, tip: 'NBO_29' });

// fișierul LUNAR: august, L01 = 1000 (FOOD 800 + PAPER 200), L02 = 500 (FOOD)
const LUNAR = P([rand('L01', 'M1', 'Carne vita', 'FOOD', 800), rand('L01', 'AMB', 'Cutii', 'PAPER', 200), rand('L02', 'M1', 'Carne vita', 'FOOD', 500)]);
// săptămâna S32 (03–09 aug): L01 = 250, L02 = 120 · S33 (10–16 aug): L01 = 260
const S32 = P([rand('L01', 'M1', 'Carne vita', 'FOOD', 250), rand('L02', 'M1', 'Carne vita', 'FOOD', 120)]);
const S33 = P([rand('L01', 'M1', 'Carne vita', 'FOOD', 260)]);
const W32 = { de: '2026-08-03', la: '2026-08-09' }, W33 = { de: '2026-08-10', la: '2026-08-16' }, W34 = { de: '2026-08-17', la: '2026-08-23' };
const AUG = perioadaDin('2026-08-15', 'LUNA');
const pS32 = perioadaDin('2026-08-05', 'SAPTAMANA'), pS33 = perioadaDin('2026-08-12', 'SAPTAMANA'), pS34 = perioadaDin('2026-08-19', 'SAPTAMANA');
const mat = (s: AppState) => s.materiale29 ?? [];
const suma = (rows: Material29[]) => rows.reduce((a, m) => a + m.costActual, 0);

// ————————————————————————————————— 1. fereastra și proveniența pe rând
console.log('— 1. Fiecare rând 2.9 poartă fereastra reală și proveniența —');
const r1 = imp(BAZA, { fisier: '2.9 august.xlsx', parsat: LUNAR, acum: ACUM(8) });
t('lunarul se activează', r1.rezultat.stare === 'ACTIVAT', r1.rezultat.erori.join(' | '));
const l1 = mat(r1.stareNoua);
t('rândurile lunare poartă fereastra lunii (01–31 aug), granularitate LUNA',
  l1.length === 3 && l1.every(m => m.fereastra?.de === '2026-08-01' && m.fereastra?.la === '2026-08-31' && m.fereastra?.granularitate === 'LUNA'),
  JSON.stringify(l1[0]?.fereastra));
t('… și proveniența: fișier, amprentă, rând', l1.every(m => m.sursa?.fisier === '2.9 august.xlsx' && m.sursa?.amprenta === r1.rezultat.amprenta && typeof m.sursa?.rand === 'number'),
  JSON.stringify(l1[0]?.sursa));
t('rândul sursă e cel din fișier (rândul 2 = prima linie de date)', l1[0]?.sursa?.rand === 2, `${l1[0]?.sursa?.rand}`);
t('versiunea unui fișier doar cu luna NU presupune un interval (regula documentată: nedeclarat rămâne nedeclarat)',
  (r1.stareNoua.versiuniImport ?? [])[0]?.intervalDe === undefined);
t('rollup-ul pe categorie poartă aceeași fereastră', r1.stareNoua.linii29.every(l => l.fereastra?.de === '2026-08-01' && l.fereastra?.la === '2026-08-31'));
t('granularitatea se derivă din fereastră: 7 zile luni–duminică = SAPTAMANA', granularitateFereastra('2026-08-03', '2026-08-09') === 'SAPTAMANA');
t('… luna întreagă = LUNA', granularitateFereastra('2026-08-01', '2026-08-31') === 'LUNA');
t('… altceva = INTERVAL', granularitateFereastra('2026-08-01', '2026-08-15') === 'INTERVAL' && granularitateFereastra('2026-08-04', '2026-08-10') === 'INTERVAL');
t('un rând vechi, fără fereastră, se citește ca lunar pe luna lui', (() => {
  const f = fereastraRand({ perioada: '2026-07' });
  return f.de === '2026-07-01' && f.la === '2026-07-31' && f.granularitate === 'LUNA';
})());

// ————————————————————————————————— 2. coexistența
console.log('\n— 2. Săptămânalul nu șterge lunarul; lunarul nu șterge săptămânile —');
const r2 = imp(r1.stareNoua, { fisier: '2.9 S32.xlsx', parsat: S32, acum: ACUM(9), interval: W32 });
t('săptămâna 32 se activează cu fereastra declarată', r2.rezultat.stare === 'ACTIVAT' && r2.rezultat.intervalDe === W32.de && r2.rezultat.intervalLa === W32.la, r2.rezultat.erori.join(' | '));
t('rândurile lunare sunt NEATINSE: 3 rânduri, 1500 lei', mat(r2.stareNoua).filter(m => m.fereastra?.granularitate === 'LUNA').length === 3
  && aprox(suma(mat(r2.stareNoua).filter(m => m.fereastra?.granularitate === 'LUNA')), 1500));
t('rândurile săptămânii 32 stau alături: 2 rânduri, 370 lei', mat(r2.stareNoua).filter(m => m.fereastra?.de === W32.de).length === 2
  && aprox(suma(mat(r2.stareNoua).filter(m => m.fereastra?.de === W32.de)), 370));
const r3 = imp(r2.stareNoua, { fisier: '2.9 S33.xlsx', parsat: S33, acum: ACUM(10), interval: W33 });
t('săptămâna 33 coexistă cu 32 și cu lunarul: 6 rânduri în total', mat(r3.stareNoua).length === 6, `${mat(r3.stareNoua).length}`);
t('nicio versiune nu a fost ștearsă: trei versiuni NBO_29', (r3.stareNoua.versiuniImport ?? []).filter(v => v.tip === 'NBO_29').length === 3);
// și în ordinea inversă: săptămânile întâi, lunarul după
const inv1 = imp(BAZA, { fisier: '2.9 S32.xlsx', parsat: S32, acum: ACUM(8), interval: W32 });
const inv2 = imp(inv1.stareNoua, { fisier: '2.9 august.xlsx', parsat: LUNAR, acum: ACUM(9) });
t('lunarul importat DUPĂ săptămâni nu le șterge', mat(inv2.stareNoua).filter(m => m.fereastra?.de === W32.de).length === 2 && mat(inv2.stareNoua).length === 5);

// ————————————————————————————————— 3. selecția pe cerere
console.log('\n— 3. Analiza lunară ia lunarul; cea săptămânală ia săptămâna; nimic nu se adună —');
const S = r3.stareNoua;
const nAug = nboFC(S, { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL' });
t('august = raportul lunar: 1500 (nu 1500 + 370 + 260)', nAug.disponibil && aprox(nAug.consumTotal, 1500), `${nAug.consumTotal}`);
t('… FOOD 1550? nu: FOOD 1300 + PAPER 200', aprox(nAug.peComponenta.FOOD, 1300) && aprox(nAug.peComponenta.PAPER, 200));
const n32 = nboFC(S, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' });
t('săptămâna 32 = sursa săptămânală: 370', n32.disponibil && aprox(n32.consumTotal, 370), `${n32.disponibil} ${n32.motivIndisponibil ?? n32.consumTotal}`);
t('… sursa declară fereastra săptămânii', n32.surse[0]?.interval === `${W32.de} → ${W32.la}`, n32.surse[0]?.interval);
const n33 = nboFC(S, { perioada: pS33, nivel: COMPANIE, canal: 'TOTAL' });
t('săptămâna 33 = 260', n33.disponibil && aprox(n33.consumTotal, 260));
const n34 = nboFC(S, { perioada: pS34, nivel: COMPANIE, canal: 'TOTAL' });
t('săptămâna 34, fără raport săptămânal: indisponibil, cu motiv — lunarul NU se împarte', !n34.disponibil && /nu se împarte|nu există/i.test(n34.motivIndisponibil ?? ''), n34.motivIndisponibil);
t('… motivul numește fereastra cerută', new RegExp(`17\\.08|${W34.de}`).test(n34.motivIndisponibil ?? ''), n34.motivIndisponibil);
const doarLunar = r1.stareNoua;
const n32L = nboFC(doarLunar, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' });
t('doar lunar în stare → orice săptămână e indisponibilă', !n32L.disponibil);
const doarSapt = inv1.stareNoua;
const nAugS = nboFC(doarSapt, { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL' });
t('doar săptămâni în stare → luna e indisponibilă (nu se reconstruiește din săptămâni)', !nAugS.disponibil && /lunar/i.test(nAugS.motivIndisponibil ?? ''), nAugS.motivIndisponibil);
// restaurant + companie = Σ
const n32L01 = nboFC(S, { perioada: pS32, nivel: restaurant('L01'), canal: 'TOTAL' });
const n32L02 = nboFC(S, { perioada: pS32, nivel: restaurant('L02'), canal: 'TOTAL' });
t('pe săptămână: L01 250 + L02 120 = companie 370', aprox(n32L01.consumTotal, 250) && aprox(n32L02.consumTotal, 120) && aprox(n32L01.consumTotal + n32L02.consumTotal, n32.consumTotal));
// rânduri fără locație pe fereastra săptămânii: intră doar la companie
const FARA_LOC = P([{ ...rand('', 'M1', 'Carne vita', 'FOOD', 30) }]);
const rFara = pregatesteImport(S, { fisier: '2.9 S32 retea.xlsx', parsat: FARA_LOC, tip: 'NBO_29', acum: ACUM(11), interval: W32 });
t('(pregătire) fișierul fără restaurant e acceptat la nivel de companie', rFara.valid || rFara.rezultat.diagnostice.some(d => d.cod === 'LOCATIE_LIPSA' && d.nivel === 'INFO'), rFara.rezultat.diagnostice.filter(d => d.nivel === 'BLOCANT').map(d => d.cod).join(','));

// ————————————————————————————————— 4. reimportul corectat înlocuiește doar fereastra lui
console.log('\n— 4. Reimportul corectat al aceleiași ferestre înlocuiește doar acea fereastră —');
const S32c = P([rand('L01', 'M1', 'Carne vita', 'FOOD', 280), rand('L02', 'M1', 'Carne vita', 'FOOD', 120)]);
const r4 = imp(S, { fisier: '2.9 S32.xlsx', parsat: S32c, acum: ACUM(12), interval: W32 });
t('corecția S32 e REIMPORT_ACTUALIZAT și se activează', r4.rezultat.duplicat === 'REIMPORT_ACTUALIZAT' && r4.rezultat.stare === 'ACTIVAT', `${r4.rezultat.duplicat} ${r4.rezultat.stare}`);
t('S32 = 400 acum; tot 2 rânduri', aprox(nboFC(r4.stareNoua, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 400) && mat(r4.stareNoua).filter(m => m.fereastra?.de === W32.de).length === 2);
t('S33 și lunarul sunt neatinse', aprox(nboFC(r4.stareNoua, { perioada: pS33, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 260)
  && aprox(nboFC(r4.stareNoua, { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 1500));
t('… proveniența rândurilor S32 arată noua amprentă', mat(r4.stareNoua).filter(m => m.fereastra?.de === W32.de).every(m => m.sursa?.amprenta === r4.rezultat.amprenta));
const LUNARc = P([rand('L01', 'M1', 'Carne vita', 'FOOD', 900), rand('L01', 'AMB', 'Cutii', 'PAPER', 200), rand('L02', 'M1', 'Carne vita', 'FOOD', 500)]);
const r5 = imp(r4.stareNoua, { fisier: '2.9 august.xlsx', parsat: LUNARc, acum: ACUM(13) });
t('corecția lunarului înlocuiește doar luna: 1600; S32 rămâne 400, S33 260',
  aprox(nboFC(r5.stareNoua, { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 1600)
  && aprox(nboFC(r5.stareNoua, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 400)
  && aprox(nboFC(r5.stareNoua, { perioada: pS33, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 260));
t('reimportul IDENTIC rămâne duplicat', imp(r5.stareNoua, { fisier: '2.9 S33.xlsx', parsat: S33, acum: ACUM(14), interval: W33 }).rezultat.duplicat === 'DUPLICAT_EXACT');

// ————————————————————————————————— 5. surse concurente → blocat cu motiv
console.log('\n— 5. Surse concurente fără regulă deterministă: blocat, nu combinat —');
// aceeași fereastră, același restaurant, două amprente diferite — nu poate apărea prin import
// (înlocuirea pe fereastră), dar selectorul trebuie să refuze, nu să însumeze
const altaSursa = { amprenta: 'fp_altul', fisier: 'alt 2.9 S32.xlsx' };
const concurente: AppState = {
  ...S,
  materiale29: [...mat(S), ...mat(S).filter(m => m.fereastra?.de === W32.de).map(m => ({ ...m, costActual: m.costActual + 1, sursa: { ...m.sursa!, ...altaSursa } }))],
  linii29: [...S.linii29, ...S.linii29.filter(l => l.fereastra?.de === W32.de).map(l => ({ ...l, valoare: l.valoare + 1, sursa: { ...l.sursa!, ...altaSursa } }))],
};
const nConc = nboFC(concurente, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' });
t('două surse pe aceeași fereastră × restaurant → indisponibil', !nConc.disponibil, `${nConc.consumTotal}`);
t('… motivul numește concurența și fișierele', /concurent/i.test(nConc.motivIndisponibil ?? '') && /alt 2\.9 S32\.xlsx/.test(nConc.motivIndisponibil ?? ''), nConc.motivIndisponibil);
const sel = selecteaza29(mat(concurente), pS32, undefined);
t('selectorul expune fereastra concurentă', !sel.disponibil && sel.concurente.length > 0);
// o fereastră INTERVAL (1–15 aug) nu servește nici luna, nici săptămâna
const rInt = imp(BAZA, { fisier: '2.9 1-15.xlsx', parsat: S32, acum: ACUM(8), interval: { de: '2026-08-01', la: '2026-08-15' } });
t('fereastră INTERVAL: luna e indisponibilă', !nboFC(rInt.stareNoua, { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL' }).disponibil);
t('… și săptămâna 32 la fel (fereastra nu coincide)', !nboFC(rInt.stareNoua, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' }).disponibil);
t('… cu motivul care spune ce fereastră există', /01\.08|2026-08-01/.test(nboFC(rInt.stareNoua, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' }).motivIndisponibil ?? ''));

// ————————————————————————————————— 6. puntea și ecranul vechi merg pe același selector
console.log('\n— 6. Puntea, reconcilierea pe material și ecranul vechi folosesc același selector —');
const ctx = buildCtx(S);
const bAug = bridgeFC(S, ctx, { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL' });
t('puntea pe august: 2.9 = 1500 (lunarul)', bAug.nboDisponibil && aprox(bAug.nboActual, 1500), `${bAug.nboDisponibil} ${bAug.motivNbo ?? bAug.nboActual}`);
const b32 = bridgeFC(S, ctx, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' });
t('puntea pe săptămâna 32: 2.9 = 370 (sursa săptămânală)', b32.nboDisponibil && aprox(b32.nboActual, 370), `${b32.nboDisponibil} ${b32.motivNbo ?? b32.nboActual}`);
const m32 = reconciliationMaterialFC(S, ctx, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' });
t('reconcilierea pe material pe săptămână: disponibilă, 370', m32.disponibil && aprox(m32.nboActual, 370), m32.motivIndisponibil);
t('… pe săptămâna 34: indisponibilă, cu motiv', !reconciliationMaterialFC(S, ctx, { perioada: pS34, nivel: COMPANIE, canal: 'TOTAL' }).disponibil);
const vechi = fcPerioada(S, ctx, '2026-08', 'RETEA');
t('ecranul vechi (lunar) vede doar lunarul: consum operațional 1500', aprox(vechi.consumOp, 1500), `${vechi.consumOp}`);
// rânduri moștenite, fără fereastră: lunare
const mostenit: AppState = { ...BAZA, linii29: [{ perioada: '2026-07', locatie: 'L01', categorie: 'FOOD', valoare: 700 }] };
t('rândurile vechi fără fereastră se citesc ca lunar', aprox(nboFC(mostenit, { perioada: perioadaDin('2026-07-10', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 700));

// ————————————————————————————————— 7. banda de perioade, pe cerere
console.log('\n— 7. Compatibilitatea perioadelor se judecă pe fereastra cererii —');
const cuVersiuni = (s: AppState, ...v: { tip: string; de: string; la: string; nr: number }[]): AppState => ({
  ...s, versiuniImport: [...(s.versiuniImport ?? []), ...v.map(x => ({
    id: `${x.tip}#${x.nr}`, tip: x.tip, nr: x.nr, fisier: `${x.tip}-${x.nr}.xlsx`, amprenta: `fp_${x.tip}_${x.nr}`,
    dataEfectiva: x.de, importatLa: ACUM(1), activa: true, scop: 'RESTAURANT', restaurante: ['L01'], perioada: x.de.slice(0, 7),
    intervalDe: x.de, intervalLa: x.la, randuri: 1, granularitate: 'ZI' as const,
  }))],
});
const cu47 = cuVersiuni(S, { tip: 'PMIX_47', de: '2026-08-03', la: '2026-08-09', nr: 1 }, { tip: 'PMIX_47', de: '2026-08-10', la: '2026-08-16', nr: 2 }, { tip: 'PMIX_47', de: '2026-08-01', la: '2026-08-31', nr: 3 });
const vS32 = verdictCombinare(cu47, COMBINATIE_FC, pS32);
t('săptămâna 32: 2.9 S32 și 4.7 S32 → ACCEPT', vS32.verdict === 'ACCEPT', `${vS32.verdict}: ${vS32.motiv}`);
const vAug = verdictCombinare(cu47, COMBINATIE_FC, AUG);
t('august: 2.9 lunar (fără interval declarat) → INSUFFICIENT_DATA, fără blocare; săptămânile 4.7 nu intră în judecată',
  vAug.verdict === 'INSUFFICIENT_DATA' && !vAug.blocheaza && vAug.nedeclarate.join() === 'NBO_29', `${vAug.verdict}: ${vAug.motiv}`);
const cuLunarDeclarat = imp(cu47, { fisier: '2.9 august decl.xlsx', parsat: LUNAR, acum: ACUM(16), interval: { de: '2026-08-01', la: '2026-08-31' } });
const vAugD = verdictCombinare(cuLunarDeclarat.stareNoua, COMBINATIE_FC, AUG);
t('… cu fereastra lunii declarată la import: 2.9 lunar și 4.7 lunar → ACCEPT', vAugD.verdict === 'ACCEPT', `${vAugD.verdict}: ${vAugD.motiv}`);
t('… iar săptămâna 32 rămâne ACCEPT pe sursele ei săptămânale', verdictCombinare(cuLunarDeclarat.stareNoua, COMBINATIE_FC, pS32).verdict === 'ACCEPT');
const doar47Lunar = cuVersiuni(S, { tip: 'PMIX_47', de: '2026-08-01', la: '2026-08-31', nr: 1 });
const vS32b = verdictCombinare(doar47Lunar, COMBINATIE_FC, pS32);
t('săptămâna 32 cu un 4.7 lunar DATAT care o conține → ACCEPT (4.7 se taie la cerere, 2.9 nu)', vS32b.verdict === 'ACCEPT', `${vS32b.verdict}: ${vS32b.motiv}`);
const partial47 = cuVersiuni(S, { tip: 'PMIX_47', de: '2026-08-05', la: '2026-08-31', nr: 1 });
const vS32c = verdictCombinare(partial47, COMBINATIE_FC, pS32);
t('săptămâna 32 cu un 4.7 care începe pe 5 august → BLOCK: acoperire parțială, declarată', vS32c.verdict === 'BLOCK' && vS32c.blocheaza && /2026-08-05/.test(vS32c.motiv), `${vS32c.verdict}: ${vS32c.motiv}`);
t('nboFC pe săptămâna 32 cu 4.7 parțial: blocat de verdict', !nboFC(partial47, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' }).disponibil);
t('fără perioadă, verdictul global rămâne cel de azi (pe versiunile active)', typeof verdictCombinare(cu47, COMBINATIE_FC).verdict === 'string');
t('nboFC pe august cu săptămâni 4.7 și 2.9 în stare: NU e blocat de ele', nboFC(cu47, { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL' }).disponibil);
const doarSapt47 = cuVersiuni(S, { tip: 'PMIX_47', de: '2026-08-03', la: '2026-08-09', nr: 1 }, { tip: 'PMIX_47', de: '2026-08-10', la: '2026-08-16', nr: 2 });
const vAugS = verdictCombinare(imp(doarSapt47, { fisier: '2.9 august decl.xlsx', parsat: LUNAR, acum: ACUM(17), interval: { de: '2026-08-01', la: '2026-08-31' } }).stareNoua, COMBINATIE_FC, AUG);
t('august cu 2.9 lunar declarat și 4.7 doar pe două săptămâni → BLOCK (4.7 acoperă doar 03–16 aug)', vAugS.verdict === 'BLOCK', `${vAugS.verdict}: ${vAugS.motiv}`);

// ————————————————————————————————— 8. importul pe categorie (FC29) respectă aceeași cheie
console.log('\n— 8. 2.9 pe categorie: aceeași fereastră, aceeași înlocuire —');
const CAT = { antete: ['Perioada', 'Locatie', 'Categorie', 'Valoare'], randuri: [{ Perioada: '2026-08', Locatie: 'L01', Categorie: 'FOOD', Valoare: 275 }], foaie: 'S' };
const r8 = imp(S, { fisier: '2.9 cat S32.xlsx', parsat: CAT, acum: ACUM(15), interval: W32 });
t('categoria pe S32 înlocuiește doar S32 × L01 (detaliul pe material al acelei ferestre iese)', r8.rezultat.stare === 'ACTIVAT'
  && !mat(r8.stareNoua).some(m => m.fereastra?.de === W32.de && m.locatie === 'L01')
  && mat(r8.stareNoua).some(m => m.fereastra?.de === W32.de && m.locatie === 'L02'), r8.rezultat.erori.join(' | '));
t('… lunarul și S33 rămân', mat(r8.stareNoua).filter(m => m.fereastra?.granularitate === 'LUNA').length === 3 && mat(r8.stareNoua).some(m => m.fereastra?.de === W33.de));
t('… iar S32 = 275 (L01, categorie) + 120 (L02, material)', aprox(nboFC(r8.stareNoua, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 395), `${nboFC(r8.stareNoua, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal}`);


// ————————————————————————————————— 9. constatările panelului adversarial
console.log('\n— 9. Teoreticul pe fereastra rândului; versiuni în vigoare; banda pe cerere; ferestre-fantomă —');
// (a) teoreticul unui rând săptămânal e al săptămânii, nu al lunii
const cuRetete: AppState = {
  ...S,
  produse: [{ cod: 'B1', denumire: 'Burger', categorie: 'B', tip: 'SIMPLU', pretInstore: 20, pretDelivery: 20, tva: 11, activ: true }],
  retete: [{ cod: 'B1', tip: 'PRODUS', denumire: 'Burger', activa: 1, versiuni: [{ nr: 1, data: '2026-07-01', linii: [{ comp: 'M1', tipComp: 'INGREDIENT', cant: 1, um: 'kg', canal: 'AMBELE' }] }] }],
  // 10 burgeri pe zi la L01 în august → 10 kg × 40 lei = 400 lei/zi teoretic
  vanzari: Array.from({ length: 31 }, (_, i) => ({ data: `2026-08-${String(i + 1).padStart(2, '0')}`, locatie: 'L01', canal: 'INSTORE' as const, produs: 'B1', cant: 10, brut: 200, net: 180 })),
};
const b9 = bridgeFC(cuRetete, buildCtx(cuRetete), { perioada: pS32, nivel: restaurant('L01'), canal: 'TOTAL' });
t('(a) puntea pe săptămâna 32 e disponibilă, cu 2.9 = 250 și rețete pe săptămână = 2800', b9.nboDisponibil && aprox(b9.nboActual, 250) && aprox(b9.recipe.cost, 2800), `${b9.motivNbo ?? ''} ${b9.nboActual} ${b9.recipe.cost}`);
t('(a) … și nicio lună falsă lipsă pe o cerere săptămânală', !b9.diagnostice.some(d => d.cod === 'LUNA_FARA_29'), b9.diagnostice.map(d => d.cod).join(','));
const m9 = reconciliationMaterialFC(cuRetete, buildCtx(cuRetete), { perioada: pS32, nivel: restaurant('L01'), canal: 'TOTAL' });
t('(a) reconcilierea pe material: același teoretic pe rând (2800)', aprox(m9.randuri.find(r => r.material === 'M1')?.costTeoretic ?? 0, 2800), `${m9.randuri.find(r => r.material === 'M1')?.costTeoretic}`);
t('(a) pe august, teoreticul rândului lunar e al lunii: 31 × 400 = 12400', aprox(reconciliationMaterialFC(cuRetete, buildCtx(cuRetete), { perioada: AUG, nivel: restaurant('L01'), canal: 'TOTAL' }).randuri.find(r => r.material === 'M1')?.costTeoretic ?? 0, 12400));
// (b) versiunile în vigoare: săptămânalul nu scoate lunarul din vigoare
const vers = (s: AppState) => (s.versiuniImport ?? []).filter(v => v.tip === 'NBO_29').map(v => `${v.id}:${v.activa ? 'activa' : 'istoric'}`).join(',');
t('(b) după S32 și S33, lunarul rămâne în vigoare: trei versiuni active', vers(S) === 'NBO_29#1:activa,NBO_29#2:activa,NBO_29#3:activa', vers(S));
t('(b) corecția S32 scoate din vigoare DOAR S32', vers(r4.stareNoua) === 'NBO_29#1:activa,NBO_29#2:istoric,NBO_29#3:activa,NBO_29#4:activa', vers(r4.stareNoua));
// (c) banda pe cerere: cu 4.7 lunar, lunarul și săptămânalul 2.9 nu blochează nimic
const cuBanda = imp(cuVersiuni(S, { tip: 'PMIX_47', de: '2026-08-01', la: '2026-08-31', nr: 1 }), { fisier: '2.9 august decl.xlsx', parsat: LUNAR, acum: ACUM(18), interval: { de: '2026-08-01', la: '2026-08-31' } }).stareNoua;
t('(c) banda pe august: ACCEPT', bandaPerioade(cuBanda, AUG).status === 'ACCEPT', bandaPerioade(cuBanda, AUG).status);
t('(c) banda pe săptămâna 32: ACCEPT (4.7 zilnic o conține, 2.9 S32 exact)', bandaPerioade(cuBanda, pS32).status === 'ACCEPT', bandaPerioade(cuBanda, pS32).status);
// (d) F3 pe 2.9 nu e închis de un raport pe ALTĂ fereastră a aceleiași luni
const M9F = P([rand('L01', 'M1', 'Carne vita', 'FOOD', 800), rand('L01', 'M9', 'Piept pui', 'FOOD', 300)]);
const d9a = imp(BAZA, { fisier: '2.9 aug M9.xlsx', parsat: M9F, acum: ACUM(8) });
const d9b = imp(d9a.stareNoua, { fisier: '2.9 S32.xlsx', parsat: S32, acum: ACUM(9), interval: W32 });
const d9c: AppState = { ...d9b.stareNoua, ingrediente: d9b.stareNoua.ingrediente.map(i => i.cod === 'M1' ? { ...i, aliasuri: ['M9'] } : i), nemapate: [] };
const d9d = imp(d9c, { fisier: '2.9 aug M9.xlsx', parsat: M9F, acum: ACUM(10) });
t('(d) reimportul lunarului după alias trece deși între timp a intrat S32', d9d.rezultat.duplicat === 'REIMPORT_MAPARE', `${d9d.rezultat.duplicat}: ${d9d.rezultat.diagnostice.find(x => x.cod === 'IMPORT_DUPLICAT')?.detaliu ?? ''}`);
// (e) fereastra declarată în dd.mm.yyyy se normalizează, nu aruncă
const e9 = imp(BAZA, { fisier: '2.9 S32.xlsx', parsat: S32, acum: ACUM(8), interval: { de: '03.08.2026', la: '09.08.2026' } });
t('(e) fereastra dd.mm.yyyy e normalizată la ISO și importul trece', e9.rezultat.stare === 'ACTIVAT' && mat(e9.stareNoua).every(m => m.fereastra?.de === '2026-08-03'), e9.rezultat.erori.join(' | '));
t('(e) … cu aceeași amprentă ca declararea ISO', e9.rezultat.amprenta === r2.rezultat.amprenta);
// (f) același fișier redeclarat pe altă fereastră: fereastra greșită nu rămâne fantomă
const f9a = imp(BAZA, { fisier: '2.9 S32.xlsx', parsat: S32, acum: ACUM(8), interval: W33 });
const f9b = imp(f9a.stareNoua, { fisier: '2.9 S32.xlsx', parsat: S32, acum: ACUM(9), interval: W32 });
t('(f) redeclararea e REIMPORT_ACTUALIZAT', f9b.rezultat.duplicat === 'REIMPORT_ACTUALIZAT');
t('(f) … iar rândurile ferestrei greșite au dispărut', !nboFC(f9b.stareNoua, { perioada: pS33, nivel: COMPANIE, canal: 'TOTAL' }).disponibil && aprox(nboFC(f9b.stareNoua, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 370));
t('(f) … versiunea greșită e istoric', vers(f9b.stareNoua) === 'NBO_29#1:istoric,NBO_29#2:activa', vers(f9b.stareNoua));
t('(f) două exporturi cu același nume, dar alt CONȚINUT, pe ferestre diferite coexistă', (() => { const x = imp(f9b.stareNoua, { fisier: '2.9 S32.xlsx', parsat: S33, acum: ACUM(10), interval: W33 }); return aprox(nboFC(x.stareNoua, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 370) && aprox(nboFC(x.stareNoua, { perioada: pS33, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 260); })());
t('(f) versiunea redeclarată poartă aceeași amprentă de conținut', (f9b.stareNoua.versiuniImport ?? [])[0]?.amprentaContinut === (f9b.stareNoua.versiuniImport ?? [])[1]?.amprentaContinut);
// (g) 4.7 agregat (fără zi pe rând) nu se taie la săptămână
const agregat47 = cuVersiuni(S, { tip: 'PMIX_47', de: '2026-08-01', la: '2026-08-31', nr: 1 });
agregat47.versiuniImport = agregat47.versiuniImport!.map(v => v.tip === 'PMIX_47' ? { ...v, granularitate: 'LUNA' as const } : v);
const g9 = verdictCombinare(agregat47, COMBINATIE_FC, pS32);
t('(g) 4.7 lunar AGREGAT + 2.9 S32 → BLOCK, nu ACCEPT', g9.verdict === 'BLOCK', `${g9.verdict}: ${g9.motiv}`);
t('(g) … pe august rămâne ACCEPT doar cu lunar 2.9 declarat', verdictCombinare(cuLunarDeclarat.stareNoua, COMBINATIE_FC, AUG).verdict === 'ACCEPT');
// (h) 4.1 cu goluri în fereastră nu devine numitor
const cu41: AppState = {
  ...cuRetete,
  salesReport: ['2026-08-03', '2026-08-04', '2026-08-05'].map(d => ({ data: d, locatie: 'L01', canal: 'INSTORE' as const, net: 100 })),
  versiuniImport: [...(cuRetete.versiuniImport ?? []), { id: 'NBO_41#1', tip: 'NBO_41', nr: 1, fisier: '4.1.xlsx', amprenta: 'fp41', dataEfectiva: '2026-08-01', importatLa: ACUM(1), activa: true, scop: 'RESTAURANT', restaurante: ['L01'], perioada: '2026-08', intervalDe: '2026-08-01', intervalLa: '2026-08-31', granularitate: 'ZI' as const, randuri: 3 },
    { id: 'PMIX_47#1', tip: 'PMIX_47', nr: 1, fisier: '4.7.xlsx', amprenta: 'fp47', dataEfectiva: '2026-08-01', importatLa: ACUM(1), activa: true, scop: 'RESTAURANT', restaurante: ['L01'], perioada: '2026-08', intervalDe: '2026-08-01', intervalLa: '2026-08-31', granularitate: 'ZI' as const, randuri: 31 }],
};
const n9 = numitorFC(cu41, { perioada: pS32, nivel: restaurant('L01'), canal: 'TOTAL' }, 7 * 180);
t('(h) Sales Report cu 3 zile din 7 nu e numitor: rămâne PMIX, cu motiv', n9.sursa === 'PMIX' && /lipsesc/.test(n9.motivIncompatibil ?? ''), `${n9.sursa} ${n9.motivIncompatibil ?? ''}`);
// (i) versiune 4.7 înlocuită nu dictează verdictul; ultima, nedeclarată, lasă necunoscutul necunoscut
const lunarDecl = imp(S, { fisier: '2.9 august decl.xlsx', parsat: LUNAR, acum: ACUM(16), interval: { de: '2026-08-01', la: '2026-08-31' } }).stareNoua;
const i9: AppState = cuVersiuni(lunarDecl, { tip: 'PMIX_47', de: '2026-08-03', la: '2026-08-09', nr: 1 });
i9.versiuniImport = [...i9.versiuniImport!, { id: 'PMIX_47#2', tip: 'PMIX_47', nr: 2, fisier: '4.7 august.xlsx', amprenta: 'fp_l', dataEfectiva: '2026-08-15', importatLa: ACUM(2), activa: true, scop: 'RESTAURANT', restaurante: ['L01'], perioada: '2026-08', randuri: 1 }];
const v9 = verdictCombinare(i9, COMBINATIE_FC, AUG);
t('(i) ultima versiune 4.7 fără fereastră → INSUFFICIENT_DATA, nu BLOCK pe una veche', v9.verdict === 'INSUFFICIENT_DATA' && !v9.blocheaza, `${v9.verdict}: ${v9.motiv}`);
// (j) cerere pe două luni: cele două lunare 2.9 se compun, nu se contrazic
const IUL = P([rand('L01', 'M1', 'Carne vita', 'FOOD', 700, '2026-07')]);
const j9 = imp(lunarDecl, { fisier: '2.9 iulie decl.xlsx', parsat: IUL, acum: ACUM(19), interval: { de: '2026-07-01', la: '2026-07-31' } }).stareNoua;
const DOUA = { tip: 'LUNA' as const, cheie: '2026-07', de: '2026-07-01', la: '2026-08-31', zile: 62, partiala: false };
const vj = verdictCombinare(j9, ['NBO_29'], DOUA);
t('(j) două luni 2.9 → o singură fereastră compusă, fără BLOCK între ele', vj.verdict !== 'BLOCK' && vj.intervale.length === 1 && vj.intervale[0].de === '2026-07-01' && vj.intervale[0].la === '2026-08-31', `${vj.verdict}: ${vj.intervale.map(i => `${i.de}..${i.la}`).join(',')}`);
t('(j) nboFC pe două luni = 700 + 1500', aprox(nboFC(j9, { perioada: DOUA, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 2200), `${nboFC(j9, { perioada: DOUA, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal}`);
// (k) 2.9 pe material fără coloana Perioada, cu fereastra declarată: luna vine din fereastră
const FARA_PER = { antete: ['Locatie', 'Cod material', 'Denumire material', 'Categorie', 'Cost actual'], randuri: [{ Locatie: 'L01', 'Cod material': 'M1', 'Denumire material': 'Carne vita', Categorie: 'FOOD', 'Cost actual': 210 }], foaie: 'S' };
const k9 = imp(BAZA, { fisier: '2.9 S32 fara luna.xlsx', parsat: FARA_PER, acum: ACUM(8), interval: W32 });
t('(k) fără coloana de lună, fereastra declarată dă luna: import activat, S32 = 210', k9.rezultat.stare === 'ACTIVAT' && aprox(nboFC(k9.stareNoua, { perioada: pS32, nivel: COMPANIE, canal: 'TOTAL' }).consumTotal, 210), k9.rezultat.erori.join(' | ') + ' ' + k9.rezultat.diagnostice.filter(d => d.nivel === 'BLOCANT').map(d => d.cod).join(','));

// (l) regula golurilor 4.1 se aplică doar când un 4.1 cu rânduri pe zi declară fereastra:
//     fără versiuni, Sales Report-ul rămâne numitorul, ca până acum
const l9: AppState = { ...cu41, versiuniImport: (cu41.versiuniImport ?? []).filter(v => v.tip !== 'NBO_41') };
const nl = numitorFC(l9, { perioada: pS32, nivel: restaurant('L01'), canal: 'TOTAL' }, 7 * 180);
t('(l) fără versiune 4.1 declarată, Sales Report-ul cu 3 zile rămâne numitorul', nl.sursa === 'Sales Report' && nl.motivIncompatibil === undefined, `${nl.sursa} ${nl.motivIncompatibil ?? ''}`);
// (m) sursele comune fără fereastră (prețuri) sunt instantanee: fiecare versiune nouă o
//     înlocuiește pe cea dinainte, dar o versiune retroactivă rămâne istoric
const PRET = (p: number) => ({ foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'M1', Pret: p }] });
const impP = (st: AppState, c: Omit<CerereImport, 'tip'>) => importaPrinCentru(st, { ...c, tip: 'PRETURI_INGREDIENTE' });
const m1 = impP(BAZA, { fisier: 'preturi sept.xlsx', parsat: PRET(10), acum: ACUM(30), dataValabil: '2026-09-01' }).stareNoua;
const m2 = impP(m1, { fisier: 'preturi oct.xlsx', parsat: PRET(12), acum: ACUM(31), dataValabil: '2026-10-01' }).stareNoua;
const m3 = impP(m2, { fisier: 'preturi retro.xlsx', parsat: PRET(9), acum: ACUM(32), dataValabil: '2026-08-01' }).stareNoua;
const activePret = (st: AppState) => (st.versiuniImport ?? []).filter(v => v.tip === 'PRETURI_INGREDIENTE' && v.activa).map(v => v.fisier);
t('(m) a doua listă de prețuri o scoate din vigoare pe prima', activePret(m2).join() === 'preturi oct.xlsx', activePret(m2).join());
t('(m) lista retroactivă rămâne istoric, nu devine curentă', activePret(m3).join() === 'preturi oct.xlsx' && (m3.versiuniImport ?? []).filter(v => v.tip === 'PRETURI_INGREDIENTE').length === 3, activePret(m3).join());

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
