// PR #24 — același adaptor, două gramatici: rapoartele NBO tipărite în format american (punct zecimal,
// virgulă la mii, „$", negative în paranteze, dată m/d/yyyy) și raportul consolidat („Corporate").
//
// Fixturi din rapoartele reale: 2.9 Vâlcea săptămâna 17–23.08.2026 și 2.9 consolidat 01–09.08.2026.
// Contract:
//   · formatul se detectează din text, nu din numele fișierului, și se aplică întregului raport;
//   · celulele rupte („10,560." + „0", „(259." + „0)", „27,569." … + „0 0 0 0") se reîntregesc la fel;
//   · fereastra săptămânală vine din „m/d/yyyy - m/d/yyyy", cea consolidată din Start/End Date;
//   · consolidatul nu are restaurant: intră la nivel de companie, cu avertisment, nu cu eroare;
//   · identitatea Beg + Pur + Trans − Adj − End = Usage se închide și aici; totalurile se verifică;
//   · Import Center activează versiunea cu fereastra raportului (săptămână / interval);
//   · 2.8 în format american se citește cu aceeași gramatică (verificat pe fixtură, fără raport real).
import { detecteazaFormat29, esteRaport29, numar29EN, parseRaport29, parsatDin29, verificaIdentitate29, descrie29 } from '../src/lib/nbo-29';
import { detecteazaFormat28, parseRaport28, parsatDin28 } from '../src/lib/nbo-28';
import { importaPrinCentru } from '../src/lib/import-center';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

const ANTET_COL = [
  'Usage in Units Usage in Dollars Usage in Percent',
  'Raw Material Item Inv Beg Pur Inv Inv End Cost End Days On',
  'Item Name ID Units Inv Units Adj Trans Inv per Unit Ext Hand Actual Theory Variance Actual Theory Variance Actual Theory Variance',
];
const SUBSOL = (p: number, n: number) => `V 21.1.126.0 - 188 - 8/24/2026 12:48 PM Copyright © NCR Corporation 2022 ${p} of ${n}`;
// ——— Vâlcea, săptămâna 4: rânduri reale, inclusiv celule rupte și negative
const VALCEA = [
  'FRYDAY RM VALCEA DT Fiscal Year: 2026', '2.9 Food Cost - Inventory With Adjustments Summary - FIFO', 'Period: 8 Week: 4', '8/17/2026 - 8/23/2026', ...ANTET_COL,
  'Alcool', 'Alcool',
  'APEROL SPRITZ 9% 0.2L 7000247 EA 19.0 0.0 0.0 0.0 16.0 $15.19 $243.07 37.3 3.0 3.0 0.0 $46 $46 $0 0.03% 0.03% 0.00%',
  'Corona 0,33 - SGR 24 7000241 EA 23.0 0.0 0.0 0.0 16.0 $6.97 $111.47 16.0 7.0 7.0 0.0 $49 $49 $0 0.03% 0.03% 0.00%',
  'BUC/BAX- new2026',
  'Total: Alcool $354.54 $95 $95 $0 0.06% 0.06% 0.00%', 'Total: Alcool $354.54 $95 $95 $0 0.06% 0.06% 0.00%',
  'Food 11%', 'Food 11%',
  'Almette cu rosii si busuioc 150 gr 702631 KG 0.6 1.2 0.0 0.0 1.9 $41.13 $76.10 (259. (0.1) 0.1 (0.1) ($2) $2 ($4) 0.00% 0.00% 0.00%',
  '0)',
  'Branza cheddar felii 2026 7000123 EA 2,480.0 10,560. 36.0 0.0 8,330.0 $0.63 $5,206.25 12.5 4,674.0 4,674.0 0.0 $2,920 $2,920 $0 1.94% 1.94% 0.00%',
  '0',
  'Total: Food 11% $5,282.35 $2,918 $2,922 ($4) 1.94% 1.94% 0.00%', 'Total: Food 11% $5,282.35 $2,918 $2,922 ($4) 1.94% 1.94% 0.00%',
  SUBSOL(1, 2),
  'FRYDAY RM VALCEA DT Fiscal Year: 2026', '2.9 Food Cost - Inventory With Adjustments Summary - FIFO', 'Period: 8 Week: 4', '8/17/2026 - 8/23/2026', ...ANTET_COL,
  'Paper', 'Paper',
  'Manusi unica folosinta 702588 EA 15,000. 0.0 0.0 0.0 14,000. $0.03 $378.00 98.0 1,000.0 1,000.0 0.0 $27 $27 $0 0.02% 0.02% 0.00%',
  '0 0',
  'Bulina porc 700968 EA 599.0 0.0 0.0 0.0 596.0 $0.09 $51.26 1,390. 3.0 3.0 0.0 $0 $0 $0 0.00% 0.00% 0.00%',
  '7',
  'Total: Paper $429.26 $27 $27 $0 0.02% 0.02% 0.00%', 'Total: Paper $429.26 $27 $27 $0 0.02% 0.02% 0.00%',
  'Totals: Sales: $150,594.66 $6,066.15 $3,040 $3,044 ($4) 2.02% 2.02% 0.00%',
  SUBSOL(2, 2),
].join('\n');
// ——— consolidat („Corporate"): fără restaurant, interval de 9 zile, patru celule rupte pe un rând
const CORPORATE = [
  'Corporate Start Date: 08/01/2026', '2.9 Food Cost - Inventory With Adjustments Summary - FIFO', 'End Date: 08/09/2026', ...ANTET_COL,
  'Alcool', 'Alcool',
  'APEROL SPRITZ 9% 0.2L 7000247 EA 794.0 24.0 0.0 0.0 1,030.0 $15.19 $15,647.76 (43.7) (212.0) 206.0 (418.0) ($3,221) $3,130 ($6,350) (0.05%) 0.05% (0.11%)',
  'Corona 0,33 - SGR 24 7000241 EA 378.0 168.0 4.0 0.0 463.0 $6.97 $3,225.26 52.7 79.0 0.0 79.0 $550 $0 $550 0.01% 0.00% 0.01%',
  'BUC/BAX- new2026',
  'Total: Alcool $18,873.02 ($2,671) $3,130 ($5,800) (0.04%) 0.05% (0.10%)', 'Total: Alcool $18,873.02 ($2,671) $3,130 ($5,800) (0.04%) 0.05% (0.10%)',
  'Condimente', 'Condimente',
  'Sare FRYDAY 2G 2002 Each 27,569. 3,000.0 0.0 0.0 19,723. $0.03 $611.41 16.4 10,846. 10,846. 0.0 $290 $290 $0 0.00% 0.00% 0.00%',
  '0 0 0 0',
  'Total: Condimente $611.41 $290 $290 $0 0.00% 0.00% 0.00%', 'Total: Condimente $611.41 $290 $290 $0 0.00% 0.00% 0.00%',
  'Totals: Sales: $5,971,250.54 $19,484.43 ($2,381) $3,420 ($5,800) (0.04%) 0.06% (0.10%)',
  'V 21.1.126.0 - 188 - 08/17/2026 12:34 PM Copyright © NCR Corporation 2022 1 of 1',
].join('\n');

console.log('— 1. Gramatica americană se detectează din text și citește sumele, negativele, procentele —');
t('formatul: „$" înaintea cifrelor → EN; raportul românesc → RO', detecteazaFormat29(VALCEA) === 'EN' && detecteazaFormat29('APEROL 7000247 EA 16,0 0,0 15,19 lei 1.610,35 lei') === 'RO');
t('numar29EN: „$15,647.76" → 15647,76 · „($3,221)" → −3221 · „(0.05%)" → −0,05 · „10,846." → null (celulă ruptă)', numar29EN('$15,647.76') === 15647.76 && numar29EN('($3,221)') === -3221 && numar29EN('(0.05%)') === -0.05 && numar29EN('10,846.') === null);
t('un „19.0" nu devine 190: gramatica se aplică întregului raport', parseRaport29(VALCEA).randuri[0].stocInitial === 19);
const V = parseRaport29(VALCEA);
t('titlul și restaurantul se citesc; eticheta „Period: 8 Week: 4"; fereastra săptămânală din m/d/yyyy', esteRaport29(VALCEA) && V.restaurant === 'FRYDAY RM VALCEA DT' && V.perioadaEticheta === 'Period 8 Week: 4' && V.de === '2026-08-17' && V.la === '2026-08-23' && V.format === 'EN' && !V.agregat);
t('6 materiale citite, niciunul nerecunoscut, fără avertismente', V.randuri.length === 6 && V.nerecunoscute.length === 0 && V.avertismente.length === 0, V.avertismente.join(' | ') + V.nerecunoscute.map(x => x.text).join(' | '));
const de = (id: string) => V.randuri.find(x => x.itemId === id)!;
t('APEROL: unități, CPU, End Ext, Days On Hand, Usage lei și procente', de('7000247').stocInitial === 19 && de('7000247').stocFinal === 16 && de('7000247').costPeUnitate === 15.19 && de('7000247').valoareStocFinal === 243.07 && de('7000247').zileStoc === 37.3 && de('7000247').consumLei.actual === 46 && de('7000247').consumPct.actual === 0.03);
t('denumirea continuată („BUC/BAX- new2026") se lipește la Corona', de('7000241').item === 'Corona 0,33 - SGR 24 BUC/BAX- new2026');
t('celula ruptă „(259." + „0)" → Days On Hand −259; negativele din paranteze', de('702631').zileStoc === -259 && de('702631').consumUnitati.actual === -0.1 && de('702631').consumLei.actual === -2 && de('702631').consumLei.varianta === -4);
t('celula ruptă „10,560." + „0" → 10.560 achiziții; „2,480.0" → 2.480', de('7000123').achizitii === 10560 && de('7000123').stocInitial === 2480 && de('7000123').stocFinal === 8330 && de('7000123').consumLei.actual === 2920);
t('două celule rupte pe un rând („15,000." „14,000." + „0 0")', de('702588').stocInitial === 15000 && de('702588').stocFinal === 14000 && de('702588').consumUnitati.actual === 1000);
t('celula ruptă „1,390." + „7" → Days On Hand 1.390,7', de('700968').zileStoc === 1390.7);
t('totalurile de grup se citesc cu „$" și paranteze; 3/3 grupuri verificate', V.totaluri.length === 3 && V.totaluri.find(x => x.categorie === 'Food 11%')!.consumLei.varianta === -4 && V.verificari.length === 3 && V.verificari.every(v => v.ok), V.verificari.map(v => `${v.categorie} ${v.calculat} vs ${v.declarat}`).join('; '));
t('totalul general: vânzări 150.594,66, consum 3.040, FC 2,02 %', V.totalGeneral?.vanzari === 150594.66 && V.totalGeneral?.consumLei.actual === 3040 && V.totalGeneral?.consumPct.actual === 2.02);
const idV = verificaIdentitate29(V);
t('identitatea Beg + Pur + Trans − Adj − End = Usage se închide pe toate rândurile', idV.exacte + idV.inToleranta === 6 && idV.inAfara.length === 0, `${idV.exacte} exacte, ${idV.inToleranta} toleranță`);
t('Branza cheddar: Adj 36 → estimare 36 × 0,63', idV.ajustari.materiale === 1 && aprox(idV.ajustari.leiEstimatPozitiv, 36 * 0.63));
t('descrierea spune formatul', descrie29(V).includes('format american'));

console.log('\n— 2. Raportul consolidat („Corporate"): fără restaurant, fereastră din Start/End Date —');
const C = parseRaport29(CORPORATE);
t('consolidat: agregat, fără restaurant, fereastra 01–09.08.2026', C.agregat && C.restaurant === null && C.de === '2026-08-01' && C.la === '2026-08-09' && C.format === 'EN');
t('avertisment de consolidat, nu eroare de restaurant lipsă', C.avertismente.some(a => a.includes('Corporate')) && !C.avertismente.some(a => a.includes('nu declară restaurantul')));
t('3 materiale citite, niciunul nerecunoscut', C.randuri.length === 3 && C.nerecunoscute.length === 0, C.nerecunoscute.map(x => x.text).join(' | '));
const dc = (id: string) => C.randuri.find(x => x.itemId === id)!;
t('APEROL consolidat: 1.030 End Inv, $15,647.76, Days (43.7) → −43,7, Usage (212.0), ($3,221), (0.05%)', dc('7000247').stocFinal === 1030 && dc('7000247').valoareStocFinal === 15647.76 && dc('7000247').zileStoc === -43.7 && dc('7000247').consumUnitati.actual === -212 && dc('7000247').consumLei.actual === -3221 && dc('7000247').consumPct.actual === -0.05);
t('Sare: patru celule rupte pe un rând („27,569." „19,723." „10,846." „10,846." + „0 0 0 0")', dc('2002').stocInitial === 27569 && dc('2002').stocFinal === 19723 && dc('2002').consumUnitati.actual === 10846 && dc('2002').consumUnitati.teoretic === 10846);
t('Corona consolidat: Adj 4 citit', dc('7000241').ajustari === 4 && verificaIdentitate29(C).ajustari.materiale === 1);
t('identitatea se închide și pe consolidat (27.569 + 3.000 − 19.723 = 10.846)', verificaIdentitate29(C).inAfara.length === 0 && verificaIdentitate29(C).exacte === 3);
t('totalul general consolidat: vânzări 5.971.250,54, consum −2.381', C.totalGeneral?.vanzari === 5971250.54 && C.totalGeneral?.consumLei.actual === -2381 && C.totalGeneral?.consumPct.actual === -0.04);
t('Parsat-ul consolidat nu inventează o locație', parsatDin29(C).randuri.every(r => r.Locatie === '') && parsatDin29(C).fereastra?.de === '2026-08-01');

console.log('\n— 3. Import Center: săptămâna Vâlcea și consolidatul la nivel de companie —');
const BAZA: AppState = { ...stareGoala(), locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }, { cod: 'L05', nume: 'FRYDAY RM VALCEA DT' }] };
const ACUM = (h: number) => `2026-09-06T${String(h).padStart(2, '0')}:00:00.000Z`;
const cv = importaPrinCentru(BAZA, { fisier: '2.9_Valcea.pdf', parsat: parsatDin29(V), tip: 'NBO_29', interval: { de: V.de!, la: V.la! }, acum: ACUM(10) });
const vv = (cv.stareNoua.versiuniImport ?? []).find(v => v.tip === 'NBO_29')!;
t('Vâlcea se activează ca versiune săptămânală pe restaurantul lui', cv.rezultat.activat && vv.intervalDe === '2026-08-17' && vv.intervalLa === '2026-08-23' && vv.scop === 'RESTAURANT' && vv.restaurante.join() === 'L05', cv.rezultat.erori.join(' | '));
t('materialele Vâlcea poartă fereastra săptămânii și locația', cv.stareNoua.materiale29.length === 6 && cv.stareNoua.materiale29.every(m => m.locatie === 'L05' && m.fereastra?.granularitate === 'SAPTAMANA'));
t('prețul din 2.9 Vâlcea intră datat de la 17.08 pentru materialele mapate (CPU $0.63)', (() => {
  const cuIng: AppState = { ...BAZA, ingrediente: [{ cod: 'CHEDDAR', denumire: 'Branza cheddar felii 2026', categorie: 'MP', tip: 'FOOD', um: 'buc', preturi: [{ validDeLa: '2026-07-01', pret: 0.6 }], activ: true, aliasuri: ['7000123'] }] };
  const r = importaPrinCentru(cuIng, { fisier: '2.9_Valcea.pdf', parsat: parsatDin29(V), tip: 'NBO_29', interval: { de: V.de!, la: V.la! }, acum: ACUM(11) });
  return r.stareNoua.ingrediente[0].preturi.some(p => p.validDeLa === '2026-08-17' && p.pret === 0.63 && p.sursa?.tip === 'NBO_29');
})());
const cc = importaPrinCentru(cv.stareNoua, { fisier: '2.9_corporate.pdf', parsat: parsatDin29(C), tip: 'NBO_29', interval: { de: C.de!, la: C.la! }, acum: ACUM(12) });
const vc = (cc.stareNoua.versiuniImport ?? []).filter(v => v.tip === 'NBO_29').find(v => v.fisier === '2.9_corporate.pdf')!;
t('consolidatul se activează la nivel de companie, cu interval de 9 zile, fără restaurant', cc.rezultat.activat && vc.scop === 'COMPANIE' && vc.intervalDe === '2026-08-01' && vc.intervalLa === '2026-08-09', cc.rezultat.erori.join(' | '));
t('materialele consolidate au locația null și fereastra INTERVAL; Vâlcea rămâne neatinsă', cc.stareNoua.materiale29.filter(m => m.locatie === null).length === 3 && cc.stareNoua.materiale29.filter(m => m.locatie === null).every(m => m.fereastra?.granularitate === 'INTERVAL') && cc.stareNoua.materiale29.filter(m => m.locatie === 'L05').length === 6);

console.log('\n— 4. Raportul 2.8 în format american (dedus; verificat pe fixtură) —');
const T28 = [
  'FRYDAY RM VALCEA DT Fiscal Year: 2026', '2.8 Spoilage and Loss', 'Period: 8 Week: 4', '8/17/2026 - 8/23/2026', 'Inventory Qty. Cost/', 'Description ItemID Reason By Units Lost Unit Extension',
  'Food 11%',
  'Branza cheddar felii 2026 7000123 End of Day alina.nasaudean EA 6.00 $0.62 $3.75',
  'Sos Cheddar BIB 4064 End of Day alina.nasaudean KG 3.82 $45.07 $172.17',
  'CHIFLA CARTOF 3.5inch 53G x 7000133 Dropped chitu.stefan EA 1,017.00 $2.35 $2,389.95',
  '72',
  'Total: Food 11% $2,565.87',
  'Grand Total: $2,565.87',
  'V 21.1.126.0 - 15 - 8/24/2026 12:48 PM Copyright © NCR Corporation 2022 1 of 1',
].join('\n');
t('formatul 2.8: „$" → EN', detecteazaFormat28(T28) === 'EN' && detecteazaFormat28('EA 3,00 9,55 lei 28,64 lei') === 'RO');
const R28 = parseRaport28(T28);
t('3 evenimente citite, fereastra săptămânală din m/d/yyyy, niciun rând necitit', R28.randuri.length === 3 && R28.de === '2026-08-17' && R28.la === '2026-08-23' && R28.nerecunoscute.length === 0 && R28.format === 'EN', R28.nerecunoscute.map(x => x.text).join(' | '));
t('cantitate, Cost/Unit și Extension cu „$" și virgulă la mii', R28.randuri[2].cant === 1017 && R28.randuri[2].costUnitar === 2.35 && R28.randuri[2].lei === 2389.95 && R28.randuri[0].lei === 3.75);
t('continuarea de nume „72" se lipește și aici', R28.randuri[2].item === 'CHIFLA CARTOF 3.5inch 53G x 72');
t('totalul de grup și Grand Total cu „$"; grupul verificat', R28.totaluri[0].lei === 2565.87 && R28.totalGeneral === 2565.87 && R28.verificari.every(v => v.ok));
t('Parsat-ul 2.8 EN are aceleași coloane și fereastra', parsatDin28(R28).randuri[1].Valoare === 172.17 && parsatDin28(R28).fereastra?.de === '2026-08-17');

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
process.exit(fail ? 1 : 0);
