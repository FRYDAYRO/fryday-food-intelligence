// PR #23 (partea demonstrabilă din 2.9) — ajustările de inventar se PĂSTREAZĂ și se afișează
// separat de puntea Usage.
//
// Contract:
//   · identitatea raportului: Usage Actual = Beg + Pur + Trans − Adj − End (582/582 pe raportul real);
//   · `Material29.ajustari` vine din adaptor exact cum e tipărit; absent ≠ zero; semnul se păstrează;
//   · Usage lei tipărit rămâne consumul (FIFO); Adj × Cost per Unit e ESTIMARE separată, pe semn,
//     fără total în unități între UM diferite;
//   · Adj ≠ 0 fără cost utilizabil → estimare incompletă, FC cu ajustări indisponibil;
//     Adj = 0 contribuie zero fără preț; Adj negativ → convenție nevalidată → FC indisponibil;
//   · rândurile vin din `materiale29`, nu din rollup: linii29 fără materiale29 → indisponibil;
//   · nimic din consumFC / consumTotal / FC Curat / FC operațional nu se mișcă.
import { parseRaport29, parsatDin29, verificaIdentitate29, TOLERANTA_IDENTITATE_29, descrie29 } from '../src/lib/nbo-29';
import { ajustari29 } from '../src/lib/ajustari-29';
import { importa, type Parsat } from '../src/lib/importer';
import { buildCtx } from '../src/lib/engine';
import { nboFC, reconciliationFC } from '../src/lib/fc-core';
import { COMPANIE, perioadaDin, restaurant, type CerereFC } from '../src/lib/fc-domeniu';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

// ————————————————————————————————— fixtura: rânduri REALE din 2.9 Cluj, august 2026
// Sos Cheddar BIB: Usage 134,9 kg = 20 + 130 + 0 − 3,8 − 11,3; Theory 124,3; CPU 45,07; lei 6.081 / 5.603
// Sausage Patty: Usage 25 = 0 + 226 + 0 − 23 − 178; Theory 23; CPU 2,48; Days On Hand 220,7 = 178 ÷ (25/31)
// Furculita Rosie (Paper): Usage 357 = 100 + 500 − 6 − 237; CPU 0,27
// Tort ciocolata zmeura new: Adj 1 cu Cost per Unit 0,00 → fără evaluare
// Articol test: Adj 0 cu Cost per Unit 0,00 → contribuie zero fără preț
const ANTET = [
  'FRYDAY CLUJ MEMO Fiscal Year: 2026',
  '2.9 Food Cost - Inventory With Adjustments Summary - FIFO',
  'Period: 8',
  '01.08.2026 - 31.08.2026',
  'Usage in Units Usage in Dollars Usage in Percent',
  'Raw Material Item Inv Beg Pur Inv Inv End Cost End Days On',
  'Item Name ID Units Inv Units Adj Trans Inv per Unit Ext Hand Actual Theory Variance Actual Theory Variance Actual Theory Variance',
];
const CHEDDAR = 'Sos Cheddar BIB 4064 KG 20,0 130,0 3,8 0,0 11,3 45,07 lei 509,29 lei 2,6 134,9 124,3 10,6 6.081 lei 5.603 lei 478 lei 0,90% 0,83% 0,07%';
const LINII = [
  ...ANTET,
  'Food 11%',
  'Food 11%',
  CHEDDAR,
  'Sausage Patty 702458 Each 0,0 226,0 23,0 0,0 178,0 2,48 lei 441,44 lei 220,7 25,0 23,0 2,0 62 lei 57 lei 5 lei 0,01% 0,01% 0,00%',
  'Total: Food 11% 950,73 lei 6.143 lei 5.660 lei 483 lei 0,91% 0,84% 0,07%',
  'Total: Food 11% 950,73 lei 6.143 lei 5.660 lei 483 lei 0,91% 0,84% 0,07%',
  'FRYCafe 21%',
  'FRYCafe 21%',
  'Tort ciocolata zmeura new 7000159 EA 2,0 0,0 1,0 0,0 0,0 0,00 lei 0,00 lei 0,0 1,0 0,0 1,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Total: FRYCafe 21% 0,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Total: FRYCafe 21% 0,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Paper',
  'Paper',
  'Furculita Rosie 702092 EA 100,0 500,0 6,0 0,0 237,0 0,27 lei 63,99 lei 20,6 357,0 259,0 98,0 96 lei 70 lei 26 lei 0,01% 0,01% 0,00%',
  'Total: Paper 63,99 lei 96 lei 70 lei 26 lei 0,01% 0,01% 0,00%',
  'Total: Paper 63,99 lei 96 lei 70 lei 26 lei 0,01% 0,01% 0,00%',
  'Diverse 21%',
  'Diverse 21%',
  'Articol test 7000267 EA 0,0 0,0 0,0 0,0 0,0 0,00 lei 0,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Total: Diverse 21% 0,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Total: Diverse 21% 0,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Totals: Sales: 675.735,58 lei 1.014,72 lei 6.239 lei 5.730 lei 509 lei 0,92% 0,85% 0,08%',
  'V 21.1.126.0 - 188 - 02.09.2026 22:35 Copyright © NCR Corporation 2022 1 of 1',
];
const TEXT = LINII.join('\n');
const FARA_TORT = LINII.filter(l => !l.startsWith('Tort ciocolata')).join('\n')
  .replace('Total: FRYCafe 21% 0,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%\nTotal: FRYCafe 21% 0,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%', 'Total: FRYCafe 21% 0,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%');

const BAZA: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }],
  ingrediente: [
    { cod: 'SOS-CHEDDAR', denumire: 'Sos Cheddar BIB', categorie: 'SOSURI', tip: 'FOOD', um: 'kg', preturi: [{ validDeLa: '2026-07-01', pret: 44 }], activ: true, aliasuri: ['4064'] },
  ],
  salesReport: [{ data: '2026-08-15', locatie: 'L01', canal: 'INSTORE', net: 675735.58 }],
};
const LUNA = perioadaDin('2026-08-15', 'LUNA');
const cerere = (nivel = COMPANIE): CerereFC => ({ perioada: LUNA, nivel, canal: 'TOTAL' });
const importat = (text: string, s: AppState = BAZA) => importa('FC29_MATERIAL', parsatDin29(parseRaport29(text)), '2.9_Memo_Cluj.pdf', s);

console.log('— 1. Identitatea raportului: Usage Actual = Beg + Pur + Trans − Adj − End —');
const R = parseRaport29(TEXT);
const id = verificaIdentitate29(R);
t('toate rândurile fixturii închid identitatea exact', id.exacte === R.randuri.length && id.inAfara.length === 0, `${id.exacte}/${id.randuri}`);
t('Sausage Patty: Days On Hand = End ÷ (Usage ÷ 31) dovedește că Adj nu e în consum',
  aprox(178 / (25 / 31), 220.7, 0.05));
const RUPT = parseRaport29(TEXT.replace('134,9 124,3 10,6', '138,7 124,3 14,4'));
const idRupt = verificaIdentitate29(RUPT);
t('un Usage care nu se închide e listat, nu ascuns', idRupt.inAfara.length === 1 && idRupt.inAfara[0].itemId === '4064'
  && aprox(idRupt.inAfara[0].calculat, 134.9) && aprox(idRupt.inAfara[0].tiparit, 138.7));
t('…și devine avertisment la citire', RUPT.avertismente.some(a => a.includes('Bilanțul de stoc')));
t('MUTAȚIE: Adj adunat în loc de scăzut ar rupe identitatea pe fiecare rând cu Adj ≠ 0',
  R.randuri.filter(x => x.ajustari !== 0).every(x => Math.abs((x.stocInitial + x.achizitii + x.transferuri + x.ajustari - x.stocFinal) - x.consumUnitati.actual) > TOLERANTA_IDENTITATE_29));
const TOL = parseRaport29(TEXT.replace('134,9 124,3 10,6', '135,1 124,3 10,8'));
t('o diferență de rotunjire (≤ 0,3) e „în toleranță", nu eroare', verificaIdentitate29(TOL).inToleranta === 1 && verificaIdentitate29(TOL).inAfara.length === 0);
t('descrierea raportului spune bilanțul', descrie29(R).includes('bilanț de stoc: 5/5 exact'), descrie29(R));

console.log('\n— 2. Estimarea la nivel de adaptor: semne separate, cost neutilizabil, FC cu ajustări —');
t('Σ Adj × CPU pozitiv = 3,8 × 45,07 + 23 × 2,48 + 6 × 0,27', aprox(id.ajustari.leiEstimatPozitiv, 3.8 * 45.07 + 23 * 2.48 + 6 * 0.27, 1e-9), id.ajustari.leiEstimatPozitiv.toFixed(2));
t('Tort ciocolata zmeura: Adj 1 cu CPU 0,00 → fără cost utilizabil', id.ajustari.faraCostUtilizabil === 1 && id.ajustari.materiale === 4);
t('FC cu ajustări NU se prezintă cât timp estimarea e incompletă', id.fcCuAjustariEstimatPct === null && (id.motivFcIndisponibil ?? '').includes('fără Cost per Unit'));
const idC = verificaIdentitate29(parseRaport29(FARA_TORT));
t('cu estimarea completă: FC cu ajustări = (Usage lei + Σ Adj × CPU) ÷ vânzări', idC.fcCuAjustariEstimatPct !== null
  && aprox(idC.fcCuAjustariEstimatPct!, ((6239 + idC.ajustari.leiEstimatPozitiv) / 675735.58) * 100, 1e-9)
  && idC.fcRaportatPct === 0.92);
t('Articol test: Adj 0 cu CPU 0 nu cere preț și nu blochează', idC.ajustari.faraCostUtilizabil === 0 && idC.ajustari.materiale === 3);
const NEG = parseRaport29(FARA_TORT.replace('Each 0,0 226,0 23,0', 'Each 0,0 226,0 (23,0)'));
const idN = verificaIdentitate29(NEG);
t('Adj negativ: semnul se păstrează, suma lui e separată, nu compensată', NEG.randuri.find(x => x.itemId === '702458')!.ajustari === -23
  && idN.ajustari.materialeNegative === 1 && aprox(idN.ajustari.leiEstimatNegativ, 23 * 2.48, 1e-9)
  && aprox(idN.ajustari.leiEstimatPozitiv, 3.8 * 45.07 + 6 * 0.27, 1e-9));
t('Adj negativ → FC cu ajustări neinterpretabil (convenție nevalidată)', idN.fcCuAjustariEstimatPct === null && (idN.motivFcIndisponibil ?? '').includes('negativ'));

console.log('\n— 3. Exportul în Material29: exact cum e tipărit, absent ≠ zero —');
const P = parsatDin29(R);
t('Parsat-ul are coloana „Ajustare inventar"', P.antete.includes('Ajustare inventar') && P.randuri[0]['Ajustare inventar'] === 3.8);
const S1 = importat(TEXT).stateNou;
const m = (s: AppState, cod: string) => s.materiale29!.find(x => x.material === cod)!;
t('Sos Cheddar BIB: ajustari = 3,8 (unități, KG)', m(S1, '4064').ajustari === 3.8 && m(S1, '4064').umInventar === 'KG');
t('Sausage Patty: ajustari = 23; Furculita: 6; Tort: 1', m(S1, '702458').ajustari === 23 && m(S1, '702092').ajustari === 6 && m(S1, '7000159').ajustari === 1);
t('0,0 tipărit rămâne 0, nu absent', m(S1, '7000267').ajustari === 0);
const faraColoana: Parsat = { ...P, antete: P.antete.filter(a => a !== 'Ajustare inventar'), randuri: P.randuri.map(r => { const { 'Ajustare inventar': _a, ...rest } = r; return rest; }) };
const S0 = importa('FC29_MATERIAL', faraColoana, '2.9_vechi.xlsx', BAZA).stateNou;
t('fără coloană: ajustari ABSENT, nu 0 (MUTAȚIA „coerție la zero" ar pica aici)', S0.materiale29!.every(x => x.ajustari === undefined));
const celulaGoala: Parsat = { ...P, randuri: P.randuri.map(r => (r['Cod material'] === '702458' ? { ...r, 'Ajustare inventar': '' } : r)) };
const Sg = importa('FC29_MATERIAL', celulaGoala, '2.9_gol.xlsx', BAZA).stateNou;
t('celulă goală → absent pe acel rând, celelalte păstrate', m(Sg, '702458').ajustari === undefined && m(Sg, '4064').ajustari === 3.8);
t('raportul importului spune că ajustările sunt estimare separată', importat(TEXT).batch.avertismente.some(a => a.includes('Inv Adj') && a.includes('NU intră în consum')));
t('…și că un fișier fără coloană le lasă necunoscute', importa('FC29_MATERIAL', faraColoana, '2.9_vechi.xlsx', BAZA).batch.avertismente.some(a => a.includes('necunoscute, nu zero')));

console.log('\n— 4. ajustari29: cifra separată pe cererea FC —');
const ctx = buildCtx(S1);
const A = ajustari29(S1, ctx, cerere());
t('disponibil pe luna raportului', A.disponibil, A.motiv ?? '');
t('4 materiale cu Adj ≠ 0, 1 cu zero tipărit, 0 fără coloană', A.randuri.length === 4 && A.materialeCuZero === 1 && A.materialeFaraColoana === 0);
t('fiecare rând își poartă UM-ul; nu există niciun total în unități', A.randuri.every(r => r.umInventar) && !('unitati' in A));
t('Σ pozitive = 171,27 + 57,04 + 1,62 (lei la CPU)', aprox(A.leiEstimatPozitiv, 3.8 * 45.07 + 23 * 2.48 + 6 * 0.27, 1e-9), A.leiEstimatPozitiv.toFixed(2));
t('Food + Paper: tot, categoriile sunt clasificate', aprox(A.leiEstimatPozitivFC, A.leiEstimatPozitiv, 1e-9));
t('Tort: Adj 1 fără cost → leiEstimat null cu motiv, estimarea nu e completă',
  A.randuri.find(r => r.material === '7000159')!.leiEstimat === null && A.randuri.find(r => r.material === '7000159')!.motivFaraEvaluare !== null && !A.complet && A.materialeFaraEvaluare === 1);
t('FC cu ajustări indisponibil cât timp estimarea e incompletă', A.fcCuAjustariEstimatPct === null && (A.motivFcIndisponibil ?? '').includes('fără Cost per Unit'));
t('ingredientul mapat apare pe rând (alias 4064 → SOS-CHEDDAR)', A.randuri.find(r => r.material === '4064')!.ingredient === 'SOS-CHEDDAR');
t('proveniența ajunge pe rând: fișier + rând sursă', A.randuri.every(r => r.sursa?.fisier === '2.9_Memo_Cluj.pdf' && typeof r.sursa?.rand === 'number'));

const S2 = importat(FARA_TORT).stateNou;
const A2 = ajustari29(S2, buildCtx(S2), cerere());
const nbo2 = nboFC(S2, cerere());
t('estimare completă → FC cu ajustări = (consum total 2.9 + Σ Adj × CPU) ÷ numitor', A2.complet && A2.fcCuAjustariEstimatPct !== null
  && aprox(A2.fcCuAjustariEstimatPct!, ((nbo2.consumTotal + A2.leiEstimatPozitiv) / 675735.58) * 100, 1e-9)
  && aprox(A2.fcOperationalPct!, (nbo2.consumTotal / 675735.58) * 100, 1e-9));
t('FC cu ajustări > FC operațional, dar FC operațional e cel al motorului (neatins)',
  A2.fcCuAjustariEstimatPct! > A2.fcOperationalPct! && aprox(reconciliationFC(S2, buildCtx(S2), cerere()).fcOperationalPct!, A2.fcOperationalPct!, 1e-9));
t('explicația poartă date, logică, calcule, impact', A2.explicatie.date.length >= 3 && A2.explicatie.calcule.some(c => c.includes('FC cu ajustări estimat')) && A2.explicatie.impact.includes('nu se scade din Neexplicat'));

console.log('\n— 5. Nimic nu intră în consum: Usage lei tipărit rămâne FIFO —');
const nbo1 = nboFC(S1, cerere());
const nbo0 = nboFC(S0, cerere());
t('MUTAȚIE „Adj intră în consumFC": consumul e identic cu și fără coloana de ajustări', aprox(nbo1.consumFC, nbo0.consumFC, 1e-9) && aprox(nbo1.consumTotal, nbo0.consumTotal, 1e-9));
t('consumTotal = Σ Usage lei tipărit (6.239), nu + 229,93', aprox(nbo1.consumTotal, 6239, 1e-9), nbo1.consumTotal.toFixed(2));
t('costActual al materialului e Usage lei tipărit', m(S1, '4064').costActual === 6081);
t('MUTAȚIE „FC cu ajustări suprascrie FC operațional": reconciliationFC nu vede ajustările',
  aprox(reconciliationFC(S1, ctx, cerere()).fcOperationalPct!, (6239 / 675735.58) * 100, 1e-9));

console.log('\n— 6. Disponibilitate: rândurile vin din materiale29, nu din rollup —');
const doarLinii: AppState = { ...S1, materiale29: [] };
const A3 = ajustari29(doarLinii, buildCtx(doarLinii), cerere());
t('linii29 fără materiale29 → indisponibil cu motiv, chiar dacă nboFC e disponibil', !A3.disponibil && A3.fcCuAjustariEstimatPct === null && nboFC(doarLinii, cerere()).disponibil);
const A0 = ajustari29(S0, buildCtx(S0), cerere());
t('fișier fără coloană → rânduri fără ajustări cunoscute, FC cu ajustări indisponibil (necunoscut ≠ zero)',
  A0.disponibil && A0.randuri.length === 0 && A0.materialeFaraColoana === S0.materiale29!.length && A0.fcCuAjustariEstimatPct === null && (A0.motivFcIndisponibil ?? '').includes('necunoscute'));
const SN = importat(FARA_TORT.replace('Each 0,0 226,0 23,0', 'Each 0,0 226,0 (23,0)')).stateNou;
const AN = ajustari29(SN, buildCtx(SN), cerere());
t('Adj negativ în stare → separat, FC cu ajustări indisponibil', AN.materialeNegative === 1 && aprox(AN.leiEstimatNegativ, 23 * 2.48, 1e-9) && AN.fcCuAjustariEstimatPct === null);
t('pe restaurantul raportului: aceleași rânduri', ajustari29(S1, ctx, cerere(restaurant('L01'))).randuri.length === 4);
const SAPT = perioadaDin('2026-08-03', 'SAPTAMANA');
const AS = ajustari29(S1, ctx, { perioada: SAPT, nivel: COMPANIE, canal: 'TOTAL' });
t('pe o săptămână fără raport săptămânal → indisponibil (lunarul nu se împarte)', !AS.disponibil);
const S1sept = importat(TEXT.replace(/01\.08\.2026 - 31\.08\.2026/g, '01.09.2026 - 30.09.2026').replace('Period: 8', 'Period: 9'), S1).stateNou;
const Asept = ajustari29(S1sept, buildCtx(S1sept), cerere());
t('un 2.9 din septembrie nu schimbă ajustările lui august', aprox(Asept.leiEstimatPozitiv, A.leiEstimatPozitiv, 1e-9) && Asept.randuri.length === 4);

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
process.exit(fail ? 1 : 0);
