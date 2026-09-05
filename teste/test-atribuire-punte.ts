// PR #23 — puntea consumă atribuirea waste-ului: 2.9 pe material + 2.8 pe eveniment + declarații.
//
// Contract:
//   · fără declarații, nimic nu iese din Neexplicat: potrivirea cantitativă (chiar exactă) nu clasifică;
//   · EXCLUS prin ajustare nu se scade; INCLUS în Usage se scade la evaluarea 2.8; nedeterminatul
//     apare ca pas NERECONCILIAT cu sumă informativă, în afara rezidualului;
//   · aliasul aprobat în coada comună leagă codul 2.8 de materialul 2.9 al aceluiași ingredient;
//   · evenimente pe altă fereastră sau fără 2.9 pe material rămân nereconciliate;
//   · waste-ul vechi (fără statut) e nereconciliat; prețul lui e datat doar dacă e determinabil.
// Cazuri reale (Cluj, 08.2026): Sos Cheddar BIB (Adj 3,8 kg, 2.8 = 3,82 kg / 172,17 lei),
// Sausage Patty (Adj 23, 2.8 = 23 / 56,88 lei), TIRAMISU FISTIC (Adj 6, 2.8 = 3 + 3 pe codul 910015),
// Furculita Rosie (Adj 6, fără eveniment).
import { parseRaport29, parsatDin29 } from '../src/lib/nbo-29';
import { parseRaport28, parsatDin28 } from '../src/lib/nbo-28';
import { importa } from '../src/lib/importer';
import { buildCtx } from '../src/lib/engine';
import { reconciliationFC } from '../src/lib/fc-core';
import { COMPANIE, perioadaDin, type CerereFC } from '../src/lib/fc-domeniu';
import { stareGoala } from '../src/lib/seed';
import type { AppState, DeclaratieIncludere } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

const ANTET29 = [
  'FRYDAY CLUJ MEMO Fiscal Year: 2026', '2.9 Food Cost - Inventory With Adjustments Summary - FIFO', 'Period: 8', '01.08.2026 - 31.08.2026',
  'Usage in Units Usage in Dollars Usage in Percent', 'Raw Material Item Inv Beg Pur Inv Inv End Cost End Days On',
  'Item Name ID Units Inv Units Adj Trans Inv per Unit Ext Hand Actual Theory Variance Actual Theory Variance Actual Theory Variance',
];
const T29 = [
  ...ANTET29,
  'Food 11%', 'Food 11%',
  'Sos Cheddar BIB 4064 KG 20,0 130,0 3,8 0,0 11,3 45,07 lei 509,29 lei 2,6 134,9 124,3 10,6 6.081 lei 5.603 lei 478 lei 0,90% 0,83% 0,07%',
  'Sausage Patty 702458 Each 0,0 226,0 23,0 0,0 178,0 2,48 lei 441,44 lei 220,7 25,0 23,0 2,0 62 lei 57 lei 5 lei 0,01% 0,01% 0,00%',
  'Total: Food 11% 950,73 lei 6.143 lei 5.660 lei 483 lei 0,91% 0,84% 0,07%', 'Total: Food 11% 950,73 lei 6.143 lei 5.660 lei 483 lei 0,91% 0,84% 0,07%',
  'Food 21%', 'Food 21%',
  'TIRAMISU FISTIC 1.2 KG 7000131 EA 12,0 15,0 6,0 0,0 1,0 9,28 lei 9,28 lei 1,6 20,0 21,0 (1,0) 186 lei 195 lei (9 lei) 0,03% 0,03% 0,00%',
  'Total: Food 21% 9,28 lei 186 lei 195 lei (9 lei) 0,03% 0,03% 0,00%', 'Total: Food 21% 9,28 lei 186 lei 195 lei (9 lei) 0,03% 0,03% 0,00%',
  'Paper', 'Paper',
  'Furculita Rosie 702092 EA 100,0 500,0 6,0 0,0 237,0 0,27 lei 63,99 lei 20,6 357,0 259,0 98,0 96 lei 70 lei 26 lei 0,01% 0,01% 0,00%',
  'Total: Paper 63,99 lei 96 lei 70 lei 26 lei 0,01% 0,01% 0,00%', 'Total: Paper 63,99 lei 96 lei 70 lei 26 lei 0,01% 0,01% 0,00%',
  'Totals: Sales: 675.735,58 lei 1.024,00 lei 6.425 lei 5.925 lei 500 lei 0,95% 0,88% 0,07%',
  'V 21.1.126.0 - 188 - 02.09.2026 22:35 Copyright © NCR Corporation 2022 1 of 1',
].join('\n');
const ANTET28 = ['FRYDAY CLUJ MEMO Fiscal Year: 2026', '2.8 Spoilage and Loss', 'Period: 8', '01.08.2026 - 31.08.2026', 'Inventory Qty. Cost/', 'Description ItemID Reason By Units Lost Unit Extension'];
const T28 = [
  ...ANTET28,
  'DESERT*',
  'TIRAMISU CU FISTIC new 910015 Dropped alina.nasaudean EA 3,00 9,55 lei 28,64 lei',
  'Total: DESERT* 28,64 lei',
  'Food 11%',
  'Sausage Patty 702458 End of Day alina.nasaudean Each 16,00 2,47 lei 39,52 lei',
  'Sausage Patty 702458 Dropped alina.nasaudean Each 7,00 2,48 lei 17,36 lei',
  'Sos Cheddar BIB 4064 End of Day alina.nasaudean KG 0,26 45,07 lei 11,72 lei',
  'Sos Cheddar BIB 4064 End of Day alina.nasaudean KG 0,25 45,07 lei 11,27 lei',
  'Sos Cheddar BIB 4064 End of Day chetan.vivien KG 0,30 45,07 lei 13,52 lei',
  'Sos Cheddar BIB 4064 End of Day alina.nasaudean KG 3,01 45,07 lei 135,66 lei',
  'Total: Food 11% 229,05 lei',
  'Food 21%',
  'TIRAMISU FISTIC 1.2 KG 7000131 End of Day chetan.vivien EA 1,00 9,28 lei 9,28 lei',
  'TIRAMISU FISTIC 1.2 KG 7000131 End of Day alina.nasaudean EA 2,00 9,28 lei 18,55 lei',
  'Total: Food 21% 27,83 lei',
  'Grand Total: 285,52 lei',
  'V 21.1.126.0 - 15 - 02.09.2026 22:45 Copyright © NCR Corporation 2022 1 of 1',
].join('\n');
const LEI28 = 28.64 + 39.52 + 17.36 + 11.72 + 11.27 + 13.52 + 135.66 + 9.28 + 18.55;   // 285,52

const ingr = (cod: string, denumire: string, um: 'kg' | 'l' | 'buc', pret: number, aliasuri: string[]) =>
  ({ cod, denumire, categorie: 'MP', tip: 'FOOD' as const, um, preturi: [{ validDeLa: '2026-07-01', pret }], activ: true, aliasuri });
const BAZA: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }],
  ingrediente: [ingr('SOS-CHEDDAR', 'Sos Cheddar BIB', 'kg', 44, ['4064']), ingr('SAUSAGE', 'Sausage Patty', 'buc', 2.48, ['702458']), ingr('TIRAMISU', 'Tiramisu fistic', 'buc', 9.28, ['7000131'])],
  salesReport: [{ data: '2026-08-15', locatie: 'L01', canal: 'INSTORE', net: 675735.58 }],
};
const LUNA = perioadaDin('2026-08-15', 'LUNA');
const cerere = (): CerereFC => ({ perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' });
const S1 = importa('FC29_MATERIAL', parsatDin29(parseRaport29(T29)), '2.9_Memo_Cluj.pdf', BAZA).stateNou;
const S2 = importa('WASTE_28', parsatDin28(parseRaport28(T28)), '2.8_Memo_Cluj.pdf', S1).stateNou;
const rec = (s: AppState) => reconciliationFC(s, buildCtx(s), cerere());
const pas = (r: ReturnType<typeof rec>, id: string) => r.pasi.find(p => p.id === id)!;
const linie = (r: ReturnType<typeof rec>, material: string) => r.waste.potrivire!.linii.find(l => l.material === material)!;

console.log('— 1. Fără declarații: nimic nu iese din Neexplicat —');
const R0 = rec(S2);
t('2.8 importat: 9 evenimente, 285,52 lei în evaluarea 2.8', (S2.evenimente28 ?? []).length === 9 && aprox(LEI28, 285.52));
t('atribuirea e disponibilă (există 2.9 pe material) și a intrat cu toate cele 9 evenimente', R0.waste.disponibil && R0.waste.evenimente === 9);
t('Sausage Patty: potrivire EXACTĂ (23 = 23), dar statutul rămâne nedeterminat', linie(R0, '702458').potrivire === 'EXACTA' && aprox(linie(R0, '702458').parti.NEDETERMINAT.lei, 56.88));
t('Sos Cheddar: 3,82 față de 3,8 → compatibil cu precizia, 172,17 lei nedeterminați', linie(R0, '4064').potrivire === 'COMPATIBILA_CU_PRECIZIA' && aprox(linie(R0, '4064').parti.NEDETERMINAT.lei, 172.17));
t('TIRAMISU: fără alias, 3 față de 6 (diferență reală); 910015 fără corespondent 2.9', linie(R0, '7000131').potrivire === 'DIFERENTA_REALA' && linie(R0, '910015').potrivire === 'FARA_CORESPONDENT_29');
t('Furculita: Adj fără eveniment → 1,62 lei estimat, nu waste', linie(R0, '702092').potrivire === 'FARA_EVENIMENT_28' && aprox(R0.waste.ajustariFaraEveniment.leiEstimat, 1.62) && R0.waste.ajustariFaraEveniment.coduri === 1);
t('inclus 0, exclus 0, nedeterminat 285,52', R0.waste.inclusLei === 0 && R0.waste.exclusLei === 0 && aprox(R0.waste.nedeterminatLei, 285.52));
t('pasul WASTE e indisponibil cu lei 0; pasul NERECONCILIAT poartă 285,52 informativ pe 9 rânduri',
  !pas(R0, 'WASTE').disponibil && pas(R0, 'WASTE').lei === 0 && pas(R0, 'WASTE_NERECONCILIAT').statut === 'NERECONCILIAT' && aprox(pas(R0, 'WASTE_NERECONCILIAT').leiInformativ!, 285.52) && pas(R0, 'WASTE_NERECONCILIAT').nrRanduri === 9);
t('MUTAȚIE „potrivirea exactă scade": Neexplicat = întreaga diferență', aprox(pas(R0, 'UNEXPLAINED').lei, R0.diferentaLei!, 1e-9));
t('rezidual zero, dar atribuirea NU e completă și puntea NU e completă', aprox(R0.rezidualLei!, 0, 1e-9) && !R0.waste.atribuireCompleta && !R0.complet);
t('sursa NBO_28 apare în trasabilitate cu 9 rânduri', R0.surse.some(s => s.raport === 'NBO_28' && s.randuri === 9));

console.log('\n— 2. Aliasul aprobat leagă codul 2.8 de materialul 2.9 —');
const S2a: AppState = { ...S2, ingrediente: S2.ingrediente.map(i => (i.cod === 'TIRAMISU' ? { ...i, aliasuri: ['7000131', '910015'] } : i)) };
const Ra = rec(S2a);
t('cu 910015 aprobat pe TIRAMISU: 3 + 3 = 6 = Adj → EXACTĂ, fără cod 2.8 fără corespondent', linie(Ra, '7000131').potrivire === 'EXACTA' && linie(Ra, '7000131').cant28 === 6 && Ra.waste.potrivire!.coduri.doarEvenimente === 0);
t('…statutul rămâne nedeterminat: aliasul schimbă potrivirea, nu includerea', aprox(Ra.waste.nedeterminatLei, 285.52) && Ra.waste.inclusLei === 0);

console.log('\n— 3. Declarațiile dau statut —');
const F8 = { de: '2026-08-01', la: '2026-08-31' };
const dExclus: DeclaratieIncludere = { locatie: 'L01', fereastra: F8, material: '4064', includere: 'EXCLUS_PRIN_AJUSTARE', cant: 3.8, temei: 'REGULA_NBO_CONFIRMATA', sursa: 'test' };
const Re = rec({ ...S2, declaratiiIncludere: [dExclus] });
t('EXCLUS 3,8 kg Sos Cheddar: 171,27 lei excluși, 0,90 nedeterminați pe linie; WASTE rămâne indisponibil', aprox(Re.waste.exclusLei, 171.27) && aprox(linie(Re, '4064').parti.NEDETERMINAT.lei, 0.9) && !pas(Re, 'WASTE').disponibil);
t('MUTAȚIE „exclusul se scade": Neexplicatul nu se mișcă', aprox(pas(Re, 'UNEXPLAINED').lei, R0.diferentaLei!, 1e-9));
const dInclus: DeclaratieIncludere = { locatie: 'L01', fereastra: F8, material: '702458', includere: 'INCLUS_IN_USAGE', cant: 23, temei: 'LEGATURA_STOC_VERIFICATA', sursa: 'test' };
const Ri = rec({ ...S2, declaratiiIncludere: [dInclus] });
t('INCLUS 23 Sausage Patty: WASTE disponibil cu 56,88 lei (evaluarea 2.8)', pas(Ri, 'WASTE').disponibil && aprox(pas(Ri, 'WASTE').lei, 56.88) && aprox(Ri.waste.inclusLei, 56.88));
t('Neexplicatul scade exact cu 56,88; rezidualul rămâne zero', aprox(pas(Ri, 'UNEXPLAINED').lei, R0.diferentaLei! - 56.88) && aprox(Ri.rezidualLei!, 0, 1e-9));
t('Σ pași disponibili = diferența', aprox(Ri.pasi.filter(p => p.id !== 'OPERATIONAL' && p.disponibil).reduce((s, p) => s + p.lei, 0), Ri.diferentaLei!, 1e-6));
const dInclusCheddar: DeclaratieIncludere = { ...dExclus, includere: 'INCLUS_IN_USAGE', temei: 'LEGATURA_STOC_VERIFICATA' };
const Rc = rec({ ...S2, declaratiiIncludere: [dInclusCheddar] });
t('cazul Sos Cheddar BIB: 6.081 − 124,3 × 45,07 = 478,80; scade la 307,53 DOAR cu waste INCLUS (171,27)',
  aprox(6081 - 124.3 * 45.07, 478.8) && aprox(Rc.waste.inclusLei, 171.27) && aprox(478.8 - Rc.waste.inclusLei, 307.53)
  && aprox(pas(Rc, 'UNEXPLAINED').lei, R0.diferentaLei! - 171.27));
t('cu ambele declarații: 0,90 lei rămân nedeterminați pe Sos Cheddar, restul pe celelalte linii', aprox(rec({ ...S2, declaratiiIncludere: [dExclus, dInclus] }).waste.nedeterminatLei, 285.52 - 171.27 - 56.88));
t('o declarație pe alt restaurant sau altă fereastră nu se aplică',
  rec({ ...S2, declaratiiIncludere: [{ ...dInclus, locatie: 'L02' }] }).waste.inclusLei === 0 && rec({ ...S2, declaratiiIncludere: [{ ...dInclus, fereastra: { de: '2026-07-01', la: '2026-07-31' } }] }).waste.inclusLei === 0);
t('o declarație INCLUS pe codul 2.8 fără corespondent (910015) nu se aplică', rec({ ...S2, declaratiiIncludere: [{ ...dInclus, material: '910015', cant: 3 }] }).waste.inclusLei === 0);

console.log('\n— 4. Fără 2.9 pe material, pe altă fereastră, waste vechi —');
const doarLinii: AppState = { ...S2, materiale29: [] };
const Rl = rec(doarLinii);
t('linii29 fără materiale29: atribuirea e indisponibilă, tot 2.8 e nedeterminat, WASTE explică de ce', !Rl.waste.disponibil && aprox(Rl.waste.nedeterminatLei, 285.52) && pas(Rl, 'WASTE').explicatie.includes('nu se poate confrunta'));
const T28iulie = T28.replace(/01\.08\.2026 - 31\.08\.2026/g, '01.07.2026 - 31.07.2026').replace('Period: 8', 'Period: 7');
const S3 = importa('WASTE_28', parsatDin28(parseRaport28(T28iulie)), '2.8_iulie.pdf', S2).stateNou;
const Riul = reconciliationFC(S3, buildCtx(S3), { perioada: perioadaDin('2026-07-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' });
t('iulie: fără 2.9 → nboFC indisponibil, dar waste-ul lunii e raportat nedeterminat', !Riul.nbo.disponibil && !Riul.waste.disponibil && aprox(Riul.waste.nedeterminatLei, 285.52));
const Raug = rec(S3);
t('august nu vede evenimentele lui iulie', Raug.waste.evenimente === 9 && Raug.waste.inAfaraSelectiei.evenimente === 0);
const cuVechi: AppState = { ...S2, waste: [{ locatie: 'L01', perioada: '2026-08', ingredient: 'SOS-CHEDDAR', cant: 2, um: 'kg', motiv: 'expirat' }] };
const Rv = rec(cuVechi);
const pretAug = S2.ingrediente.find(i => i.cod === 'SOS-CHEDDAR')!.preturi;
t('waste-ul vechi: nereconciliat, evaluat la prețul determinabil al lunii (2.9 a scris 45,07 valabil de la 1 august)',
  Rv.waste.vechi.randuri === 1 && aprox(Rv.waste.vechi.leiDeterminabil, 2 * 45.07) && pretAug.some(p => p.validDeLa === '2026-08-01' && p.pret === 45.07)
  && aprox(pas(Rv, 'WASTE_NERECONCILIAT').leiInformativ!, 285.52 + 90.14) && aprox(pas(Rv, 'UNEXPLAINED').lei, R0.diferentaLei!, 1e-9));
const tarziu: AppState = { ...cuVechi, ingrediente: cuVechi.ingrediente.map(i => (i.cod === 'SOS-CHEDDAR' ? { ...i, preturi: [{ validDeLa: '2026-08-20', pret: 45.07 }] } : i)) };
const Rt = rec(tarziu);
t('preț care începe pe 20 august → rândul vechi rămâne fără preț determinabil, nu se evaluează', Rt.waste.vechi.randuriFaraPretDeterminabil === 1 && Rt.waste.vechi.leiDeterminabil === 0);

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
process.exit(fail ? 1 : 0);
