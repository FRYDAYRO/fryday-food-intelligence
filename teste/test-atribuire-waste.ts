// PR #23 — regula corectată de atribuire a waste-ului: potrivirea cantitativă NU e dovadă,
// statutul vine numai din declarații cu temei, iar numai partea INCLUSĂ în Usage Actual poate
// reduce Neexplicatul.
//
// Cazuri reale (FRYDAY Cluj, 01–31.08.2026; 2.8 „Spoilage and Loss" față de Inv Adj din 2.9):
//   Sos Cheddar BIB 4064   — Adj 3,8 kg; 17 evenimente 2.8 = 3,82 kg, 172,17 lei (45,07/45,08 lei/kg)
//   Sausage Patty 702458   — Adj 23; 22 evenimente 2.8 = 23 buc, 56,88 lei (2,47/2,48)
//   TIRAMISU FISTIC 7000131 — Adj 6; 2.8 direct 3 buc (27,83 lei) + 3 buc pe codul de meniu 910015 (28,64 lei)
//   Tort pufos capsuni 702178 — Adj 5; 2.8 direct 3 + 2 pe 910008
//   Tort ciocolata zmeura 702171 — Adj 1; 2.8 doar pe 7000159, cu cost 0,00
//   Furculita Rosie 702092 — Adj 6; niciun eveniment 2.8
import { potriveste28cu29, pretDeterminabil, versiuneDeterminabila, PRECIZIE_UNITATI_29, type DeclaratieIncludere, type Eveniment28 } from '../src/lib/atribuire-waste';
import { fereastraDin } from '../src/lib/surse-29';
import type { Ingredient, Material29, Reteta } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

const F = fereastraDin('2026-08-01', '2026-08-31');
const F8 = { de: '2026-08-01', la: '2026-08-31' };
const mat = (material: string, denumire: string, um: string, ajustari: number | undefined, costPeUnitate: number, categorie = 'Food 11%'): Material29 => ({
  perioada: '2026-08', locatie: 'L01', material, denumire, categorie, cant: null, um: null, costActual: 0, costTeoretic: null,
  umInventar: um, costPeUnitate, fereastra: F, sursa: { fisier: '2.9_Memo_Cluj.pdf', rand: 1 }, ...(ajustari !== undefined ? { ajustari } : {}),
});
const M29: Material29[] = [
  mat('4064', 'Sos Cheddar BIB', 'KG', 3.8, 45.07),
  mat('702458', 'Sausage Patty', 'Each', 23, 2.48),
  mat('7000131', 'TIRAMISU FISTIC 1.2 KG', 'EA', 6, 9.28, 'Food 21%'),
  mat('702178', 'Tort pufos cu capsuni', 'EA', 5, 7.62, 'FRYCafe 21%'),
  mat('702171', 'Tort de ciocolata cu zmeura', 'EA', 1, 8.51, 'FRYCafe 21%'),
  mat('702092', 'Furculita Rosie', 'EA', 6, 0.27, 'Paper'),
  mat('7000123', 'Branza cheddar felii 2026', 'EA', 0, 0.63),
];
const ev = (rand: number, cod: string, denumire: string, motiv: string, um: string, cant: number, costUnitar: number, lei: number, utilizator = 'alina.nasaudean'): Eveniment28 =>
  ({ locatie: 'L01', fereastra: F8, cod, denumire, motiv, utilizator, um, cant, costUnitar, lei, rand, sursa: { fisier: '2.8_Memo_Cluj.pdf', rand } });
const CHEDDAR: Eveniment28[] = [
  [168, 0.26, 45.07, 11.72], [170, 0.25, 45.07, 11.27], [172, 0.3, 45.07, 13.52], [174, 0.2, 45.07, 9.01], [176, 0.15, 45.07, 6.76],
  [178, 0.15, 45.07, 6.76], [180, 0.12, 45.08, 5.41], [182, 0.16, 45.07, 7.21], [184, 0.35, 45.07, 15.78], [186, 0.28, 45.07, 12.62],
  [195, 0.15, 45.07, 6.76], [197, 0.2, 45.07, 9.01], [199, 0.2, 45.07, 9.01], [201, 0.25, 45.07, 11.27], [203, 0.2, 45.07, 9.01],
  [205, 0.25, 45.07, 11.27], [207, 0.35, 45.07, 15.78],
].map(([r, q, c, l]) => ev(r, '4064', 'Sos Cheddar BIB', 'End of Day', 'KG', q, c, l));
const SAUSAGE: Eveniment28[] = [
  ...[146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156].map(r => ev(r, '702458', 'Sausage Patty', 'End of Day', 'Each', 1, 2.47, 2.47)),
  ...[157, 158, 159, 160, 162, 163].map(r => ev(r, '702458', 'Sausage Patty', 'End of Day', 'Each', 1, 2.48, 2.48)),
  ev(161, '702458', 'Sausage Patty', 'Dropped', 'Each', 1, 2.48, 2.48),
  ev(164, '702458', 'Sausage Patty', 'End of Day', 'Each', 1, 2.47, 2.47, 'tirnovianu.vasile'),
  ev(165, '702458', 'Sausage Patty', 'End of Day', 'Each', 1, 2.47, 2.47),
  ev(166, '702458', 'Sausage Patty', 'End of Day', 'Each', 2, 2.47, 4.94, 'tirnovianu.vasile'),
  ev(167, '702458', 'Sausage Patty', 'End of Day', 'Each', 1, 2.47, 2.47),
];
const DESERTURI: Eveniment28[] = [
  ev(224, '7000131', 'TIRAMISU FISTIC 1.2 KG', 'End of Day', 'EA', 1, 9.28, 9.28, 'chetan.vivien'),
  ev(225, '7000131', 'TIRAMISU FISTIC 1.2 KG', 'End of Day', 'EA', 2, 9.28, 18.55),
  ev(8, '910015', 'TIRAMISU CU FISTIC new', 'Dropped', 'EA', 3, 9.55, 28.64),
  ev(239, '702178', 'Tort pufos cu capsuni', 'End of Day', 'EA', 1, 7.62, 7.62),
  ev(240, '702178', 'Tort pufos cu capsuni', 'Dropped', 'EA', 1, 7.62, 7.62, 'tirnovianu.vasile'),
  ev(241, '702178', 'Tort pufos cu capsuni', 'End of Day', 'EA', 1, 7.62, 7.62),
  ev(10, '910008', 'Tort pufos capsuni new', 'Dropped', 'EA', 2, 7.89, 15.78),
  ev(9, '7000159', 'Tort ciocolata zmeura new', 'End of Day', 'EA', 1, 0, 0),
];
const TOATE = [...CHEDDAR, ...SAUSAGE, ...DESERTURI];
const LEI28 = 172.17 + 56.88 + 27.83 + 28.64 + 22.86 + 15.78 + 0;
const linie = (p: ReturnType<typeof potriveste28cu29>, material: string) => p.linii.find(l => l.material === material)!;

console.log('— 1. Potrivirea cantitativă: observație pe material × UM, fără totaluri între UM —');
const P = potriveste28cu29(M29, TOATE);
const ch = linie(P, '4064');
t('Sos Cheddar: 17 evenimente = 3,82 kg față de Adj 3,8 → compatibil cu precizia tipăririi, diferența +0,02 rămâne raportată',
  ch.nrEvenimente === 17 && aprox(ch.cant28, 3.82, 1e-9) && ch.potrivire === 'COMPATIBILA_CU_PRECIZIA' && aprox(ch.diferenta!, 0.02));
t('precizia declarată: unitățile 2.9 au o zecimală → toleranță 0,05', PRECIZIE_UNITATI_29 === 0.1 && P.precizie === 0.1);
t('o diferență de 0,06 nu mai e compatibilă cu precizia', linie(potriveste28cu29([mat('4064', 'Sos Cheddar BIB', 'KG', 3.76, 45.07)], CHEDDAR), '4064').potrivire === 'DIFERENTA_REALA');
const sp = linie(P, '702458');
t('Sausage Patty: 22 evenimente = 23 = Adj → potrivire EXACTĂ', sp.nrEvenimente === 22 && sp.cant28 === 23 && sp.potrivire === 'EXACTA' && sp.diferenta === 0);
t('TIRAMISU: fără alias, 3 față de Adj 6 → diferență reală −3; codul de meniu 910015 rămâne fără corespondent 2.9',
  linie(P, '7000131').potrivire === 'DIFERENTA_REALA' && linie(P, '7000131').diferenta === -3 && linie(P, '910015').potrivire === 'FARA_CORESPONDENT_29');
t('Furculita Rosie: Adj 6 fără niciun eveniment → FARA_EVENIMENT_28', linie(P, '702092').potrivire === 'FARA_EVENIMENT_28' && linie(P, '702092').cant28 === 0);
t('Branza cheddar: Adj 0 și fără evenimente → nu apare (nimic de potrivit)', !P.linii.some(l => l.material === '7000123'));
t('nu există niciun total în unități', !('unitati' in P) && !('cantTotal' in P));
t('acoperirea se exprimă pe coduri: 6 cu Adj, 7 cu evenimente, 4 în ambele, 2 doar Adj (Furculita, Tort ciocolata), 3 doar 2.8 (DESERT*)',
  P.coduri.cuAdj === 6 && P.coduri.cuEvenimente === 7 && P.coduri.ambele === 4 && P.coduri.doarAdj === 2 && P.coduri.doarEvenimente === 3, JSON.stringify(P.coduri));
t('fiecare linie își poartă UM-ul și motivele cu cantitate și lei', sp.um === 'Each' && sp.motive.find(m => m.motiv === 'Dropped')!.cant === 1 && sp.motive.find(m => m.motiv === 'End of Day')!.cant === 22);
t('proveniența evenimentelor ajunge pe linie (rândul sursă 2.8)', ch.evenimente.every(e => e.sursa?.rand === e.rand));

console.log('\n— 2. Egalitatea cantităților NU clasifică: fără declarație totul e NEDETERMINAT —');
t('Sausage Patty EXACT: 23 buc și 56,88 lei rămân NEDETERMINAT (MUTAȚIA „exact ⇒ exclus" ar pica aici)',
  sp.parti.NEDETERMINAT.cant === 23 && aprox(sp.parti.NEDETERMINAT.lei, 56.88) && sp.parti.EXCLUS_PRIN_AJUSTARE.cant === 0 && sp.parti.INCLUS_IN_USAGE.cant === 0);
t('Sos Cheddar compatibil: 3,82 kg / 172,17 lei NEDETERMINAT', aprox(ch.parti.NEDETERMINAT.cant, 3.82) && aprox(ch.parti.NEDETERMINAT.lei, 172.17) && ch.parti.EXCLUS_PRIN_AJUSTARE.lei === 0);
const cuZero = potriveste28cu29([mat('702458', 'Sausage Patty', 'Each', 0, 2.48)], SAUSAGE);
t('Adj = 0 tipărit cu evenimente 2.8 NU demonstrează includerea: rămâne NEDETERMINAT (diferența +23 e raportată)',
  linie(cuZero, '702458').parti.INCLUS_IN_USAGE.cant === 0 && linie(cuZero, '702458').parti.NEDETERMINAT.cant === 23 && linie(cuZero, '702458').diferenta === 23);
t('Σ lei 2.8 pe statut = Σ rândurilor exact (fără dublare sau pierdere)', aprox(P.lei28Parti.NEDETERMINAT + P.lei28Parti.EXCLUS_PRIN_AJUSTARE + P.lei28Parti.INCLUS_IN_USAGE, P.lei28) && aprox(P.lei28, LEI28, 0.005), `${P.lei28} vs ${LEI28.toFixed(2)}`);
t('nicio linie nu are lei clasificați dincolo de NEDETERMINAT', P.linii.every(l => l.parti.EXCLUS_PRIN_AJUSTARE.lei === 0 && l.parti.INCLUS_IN_USAGE.lei === 0));

console.log('\n— 3. Declarațiile cu temei dau statut; lei-ii se repartizează exact —');
const declExclus: DeclaratieIncludere = { locatie: 'L01', fereastra: F8, material: '4064', includere: 'EXCLUS_PRIN_AJUSTARE', cant: 3.8, temei: 'REGULA_NBO_CONFIRMATA', sursa: 'document NBO, 2026-09-05' };
const PD = potriveste28cu29(M29, TOATE, {}, [declExclus]);
const chD = linie(PD, '4064');
t('EXCLUS 3,8 kg → lei proporțional: 172,17 × 3,8 ÷ 3,82 = 171,27', aprox(chD.parti.EXCLUS_PRIN_AJUSTARE.cant, 3.8) && aprox(chD.parti.EXCLUS_PRIN_AJUSTARE.lei, 171.27));
t('restul 0,02 kg rămâne NEDETERMINAT cu 0,90 lei; suma = 172,17 exact', aprox(chD.parti.NEDETERMINAT.cant, 0.02) && aprox(chD.parti.NEDETERMINAT.lei, 0.9)
  && aprox(chD.parti.EXCLUS_PRIN_AJUSTARE.lei + chD.parti.NEDETERMINAT.lei + chD.parti.INCLUS_IN_USAGE.lei, 172.17));
t('MUTAȚIE „repartizare fără rest": totalul pe statut rămâne egal cu Σ rândurilor', aprox(PD.lei28Parti.NEDETERMINAT + PD.lei28Parti.EXCLUS_PRIN_AJUSTARE + PD.lei28Parti.INCLUS_IN_USAGE, PD.lei28));
t('declarația nu atinge celelalte linii', linie(PD, '702458').parti.NEDETERMINAT.cant === 23);
// trei părți dintr-un total care nu se împarte exact la ban: 10,00 lei pe 3 buc → 3,33 + 3,33 + REST 3,34
const treiParti = potriveste28cu29([mat('X1', 'X', 'EA', 1, 1)], [ev(1, 'X1', 'X', 'Dropped', 'EA', 3, 3.3333, 10)], {}, [
  { locatie: 'L01', fereastra: F8, material: 'X1', includere: 'EXCLUS_PRIN_AJUSTARE', cant: 1, temei: 'DECLARATIE_UTILIZATOR', sursa: 'test' },
  { locatie: 'L01', fereastra: F8, material: 'X1', includere: 'INCLUS_IN_USAGE', cant: 1, temei: 'DECLARATIE_UTILIZATOR', sursa: 'test' },
]);
const px = linie(treiParti, 'X1').parti;
t('restul de rotunjire merge la NEDETERMINAT, ca suma să fie exact totalul (3,33 + 3,33 + 3,34 = 10,00)',
  aprox(px.EXCLUS_PRIN_AJUSTARE.lei, 3.33) && aprox(px.INCLUS_IN_USAGE.lei, 3.33) && aprox(px.NEDETERMINAT.lei, 3.34)
  && aprox(px.EXCLUS_PRIN_AJUSTARE.lei + px.INCLUS_IN_USAGE.lei + px.NEDETERMINAT.lei, 10));
const declPrea: DeclaratieIncludere = { ...declExclus, cant: 5 };
const chP = linie(potriveste28cu29(M29, TOATE, {}, [declPrea]), '4064');
t('EXCLUS nu poate depăși Adj-ul tipărit: 5 declarat → 3,8 acordat, declarație plafonată', aprox(chP.parti.EXCLUS_PRIN_AJUSTARE.cant, 3.8) && chP.declaratiiPlafonate === 1);
const declInclus: DeclaratieIncludere = { locatie: 'L01', fereastra: F8, material: '702458', includere: 'INCLUS_IN_USAGE', cant: 23, temei: 'LEGATURA_STOC_VERIFICATA', sursa: 'verificare stoc 2026-09-05' };
const spI = linie(potriveste28cu29(M29, TOATE, {}, [declInclus]), '702458');
t('INCLUS declarat: 23 buc / 56,88 lei intră în partea care poate reduce Neexplicatul', spI.parti.INCLUS_IN_USAGE.cant === 23 && aprox(spI.parti.INCLUS_IN_USAGE.lei, 56.88) && spI.parti.NEDETERMINAT.cant === 0);
const spI2 = linie(potriveste28cu29(M29, TOATE, {}, [{ ...declInclus, cant: 30 }]), '702458');
t('INCLUS nu poate depăși cantitatea 2.8: 30 declarat → 23 acordat', spI2.parti.INCLUS_IN_USAGE.cant === 23 && spI2.declaratiiPlafonate === 1);
const altaFereastra = potriveste28cu29(M29, TOATE, {}, [{ ...declExclus, fereastra: { de: '2026-07-01', la: '2026-07-31' } }]);
t('o declarație pe altă fereastră nu se aplică', linie(altaFereastra, '4064').parti.EXCLUS_PRIN_AJUSTARE.cant === 0);

console.log('\n— 4. Recalcul la schimbarea selecției 2.9 sau a mapărilor aprobate —');
const ALIAS = { '910015': '7000131', '910008': '702178', '7000159': '702171' };
const PA = potriveste28cu29(M29, TOATE, ALIAS);
t('alias 910015 → 7000131: 3 + 3 = 6 = Adj → EXACTĂ, cu ambele coduri pe linie',
  linie(PA, '7000131').potrivire === 'EXACTA' && linie(PA, '7000131').cant28 === 6 && linie(PA, '7000131').coduri28.length === 2);
t('alias 910008 → 702178: 3 + 2 = 5 = Adj; 7000159 → 702171: 0 + 1 = 1 = Adj', linie(PA, '702178').potrivire === 'EXACTA' && linie(PA, '702171').potrivire === 'EXACTA');
t('cu alias: niciun cod 2.8 fără corespondent, un singur Adj fără eveniment (Furculita)', PA.coduri.doarEvenimente === 0 && PA.coduri.doarAdj === 1);
t('…dar statutul rămâne NEDETERMINAT: aliasul schimbă potrivirea, nu includerea', PA.linii.every(l => l.parti.NEDETERMINAT.lei === l.lei28));
t('evaluările rămân separate: Tiramisu 56,47 lei în 2.8 față de 55,68 la CPU 2.9 (6 × 9,28)',
  aprox(linie(PA, '7000131').lei28, 56.47) && aprox(linie(PA, '7000131').leiEstimat29!, 55.68));
t('Tort ciocolata zmeura: 0,00 lei în 2.8 față de 8,51 la CPU — cantitatea se potrivește, valoarea nu', aprox(linie(PA, '702171').lei28, 0) && aprox(linie(PA, '702171').leiEstimat29!, 8.51));
const alta29 = M29.map(m => (m.material === '7000131' ? { ...m, ajustari: 3 } : m));
t('altă versiune 2.9 (Adj 3): aceleași evenimente, potrivire diferită (direct EXACTĂ, cu alias +3)',
  linie(potriveste28cu29(alta29, TOATE), '7000131').potrivire === 'EXACTA' && linie(potriveste28cu29(alta29, TOATE, ALIAS), '7000131').diferenta === 3);
const faraColoana = M29.map(m => (m.material === '4064' ? (({ ajustari: _a, ...rest }) => rest)(m) : m));
t('material fără coloana Adj → FARA_COLOANA_ADJ, adj null (necunoscut, nu zero)', linie(potriveste28cu29(faraColoana, CHEDDAR), '4064').potrivire === 'FARA_COLOANA_ADJ' && linie(potriveste28cu29(faraColoana, CHEDDAR), '4064').adj === null);
const alteUM = CHEDDAR.map(e => ({ ...e, um: 'Gram' }));
const liniiGram = potriveste28cu29(M29, alteUM).linii.filter(l => l.material === '4064');
t('UM diferită → cantitățile nu se compară: linia în grame e UM_DIFERITA, linia în KG rămâne fără eveniment',
  liniiGram.find(l => l.um === 'Gram')!.potrivire === 'UM_DIFERITA' && liniiGram.find(l => l.um === 'Gram')!.diferenta === null
  && liniiGram.find(l => l.um === 'KG')!.potrivire === 'FARA_EVENIMENT_28');
t('„Each" și „EA" sunt aceeași unitate', linie(potriveste28cu29(M29, SAUSAGE.map(e => ({ ...e, um: 'EA' }))), '702458').potrivire === 'EXACTA');
const altaLuna = potriveste28cu29(M29, TOATE.map(e => ({ ...e, fereastra: { de: '2026-07-01', la: '2026-07-31' } })));
t('evenimente pe altă fereastră nu se potrivesc cu Adj-ul lui august', altaLuna.coduri.ambele === 0 && altaLuna.coduri.doarEvenimente === 7);
t('alt restaurant: la fel', potriveste28cu29(M29, TOATE.map(e => ({ ...e, locatie: 'L02' }))).coduri.ambele === 0);

console.log('\n— 4b. Regresii (remedierile pe 106825c): declarațiile nu ocolesc comparația; bani întregi, nenegativi —');
const declInclusX = (material: string, cant: number): DeclaratieIncludere => ({ locatie: 'L01', fereastra: F8, material, includere: 'INCLUS_IN_USAGE', cant, temei: 'DECLARATIE_UTILIZATOR', sursa: 'test' });
const faraCoresp = potriveste28cu29(M29, [ev(1, 'X9', 'Fără corespondent', 'Dropped', 'EA', 5, 10, 50)], {}, [declInclusX('X9', 5)]);
t('R1a. fără material corespondent în 2.9: declarația NU atribuie (50 lei rămân NEDETERMINAT, declarație neaplicată)',
  linie(faraCoresp, 'X9').potrivire === 'FARA_CORESPONDENT_29' && linie(faraCoresp, 'X9').parti.INCLUS_IN_USAGE.lei === 0
  && aprox(linie(faraCoresp, 'X9').parti.NEDETERMINAT.lei, 50) && linie(faraCoresp, 'X9').declaratiiNeaplicate === 1);
const mixte = [ev(1, '4064', 'Sos Cheddar BIB', 'Dropped', 'KG', 1, 10, 10), ev(2, '4064', 'Sos Cheddar BIB', 'Dropped', 'EA', 2, 10, 20)];
const pm = potriveste28cu29(M29, mixte, {}, [declInclusX('4064', 3)]);
const lKG = pm.linii.find(l => l.material === '4064' && l.um === 'KG')!, lEA = pm.linii.find(l => l.material === '4064' && l.um === 'EA')!;
t('R1b. 1 KG și 2 EA pe aceeași cheie rămân două linii: cantitățile nu se însumează la 3',
  lKG.cant28 === 1 && lEA.cant28 === 2 && !pm.linii.some(l => l.material === '4064' && l.cant28 === 3));
t('R1b. declarația INCLUS 3 se aplică doar liniei cu UM-ul materialului (KG), plafonată la 1; linia EA e UM_DIFERITA, neatinsă',
  lKG.parti.INCLUS_IN_USAGE.cant === 1 && aprox(lKG.parti.INCLUS_IN_USAGE.lei, 10) && lKG.declaratiiPlafonate === 1
  && lEA.potrivire === 'UM_DIFERITA' && lEA.parti.INCLUS_IN_USAGE.cant === 0 && aprox(lEA.parti.NEDETERMINAT.lei, 20) && lEA.declaratiiNeaplicate === 1);
const faraCol = potriveste28cu29(faraColoana, CHEDDAR, {}, [declInclusX('4064', 3.8)]);
t('R1c. fără coloana Adj: declarația nu se aplică (comparație nevalidă)', linie(faraCol, '4064').parti.INCLUS_IN_USAGE.cant === 0 && linie(faraCol, '4064').declaratiiNeaplicate === 1);
t('R1c. estimarea 2.9 se numără o dată pe material, nu pe fiecare linie de UM', pm.coduri.cuAdj === 6 && aprox(pm.leiEstimat29, 3.8 * 45.07 + 23 * 2.48 + 6 * 9.28 + 5 * 7.62 + 8.51 + 6 * 0.27, 0.005));
const doua = potriveste28cu29([mat('Y1', 'Y', 'EA', 1, 1)], [ev(1, 'Y1', 'Y', 'Dropped', 'EA', 2, 50.005, 100.01)], {}, [
  { locatie: 'L01', fereastra: F8, material: 'Y1', includere: 'EXCLUS_PRIN_AJUSTARE', cant: 1, temei: 'DECLARATIE_UTILIZATOR', sursa: 'test' },
  { locatie: 'L01', fereastra: F8, material: 'Y1', includere: 'INCLUS_IN_USAGE', cant: 1, temei: 'DECLARATIE_UTILIZATOR', sursa: 'test' },
]);
const py = linie(doua, 'Y1').parti;
t('R2. 100,01 lei pe 2 unități, 1 EXCLUS + 1 INCLUS → 50,01 + 50,00 + 0,00, nimic negativ, total exact',
  aprox(py.EXCLUS_PRIN_AJUSTARE.lei, 50.01) && aprox(py.INCLUS_IN_USAGE.lei, 50) && py.NEDETERMINAT.lei === 0 && py.NEDETERMINAT.cant === 0
  && aprox(py.EXCLUS_PRIN_AJUSTARE.lei + py.INCLUS_IN_USAGE.lei + py.NEDETERMINAT.lei, 100.01), JSON.stringify(py));
t('R2. toate părțile sunt ≥ 0 pe toate liniile tuturor scenariilor',
  [P, PD, pm, doua, faraCoresp].every(x => x.linii.every(l => l.parti.NEDETERMINAT.lei >= 0 && l.parti.EXCLUS_PRIN_AJUSTARE.lei >= 0 && l.parti.INCLUS_IN_USAGE.lei >= 0)));
const declTrei = [declInclusX('Z1', 1), { ...declInclusX('Z1', 1), includere: 'EXCLUS_PRIN_AJUSTARE' as const }];
const treiBani = linie(potriveste28cu29([mat('Z1', 'Z', 'EA', 1, 1)], [ev(1, 'Z1', 'Z', 'Dropped', 'EA', 3, 0.01, 0.02)], {}, declTrei), 'Z1').parti;
t('R2. 0,02 lei pe 3 unități (1 EXCLUS, 1 INCLUS, 1 nedeterminat): banii întregi se împart fără fracțiuni și fără negativ',
  treiBani.EXCLUS_PRIN_AJUSTARE.lei + treiBani.INCLUS_IN_USAGE.lei + treiBani.NEDETERMINAT.lei === 0.02 && [treiBani.EXCLUS_PRIN_AJUSTARE.lei, treiBani.INCLUS_IN_USAGE.lei, treiBani.NEDETERMINAT.lei].every(v => v === 0 || v === 0.01));

console.log('\n— 5. Totalul tipărit și estimarea 2.9 rămân cifre separate —');
const PT = potriveste28cu29(M29, TOATE, ALIAS, [], { totalTiparit28: 324.22 });
t('diferența față de totalul tipărit se ține separat (rotunjirea raportului), nu se repartizează', aprox(PT.diferentaTotalTiparit28!, 324.22 - PT.lei28) && aprox(PT.lei28, LEI28, 0.005));
t('Σ |Adj| × CPU pe selecție = 171,27 + 57,04 + 55,68 + 38,10 + 8,51 + 1,62', aprox(PT.leiEstimat29, 3.8 * 45.07 + 23 * 2.48 + 6 * 9.28 + 5 * 7.62 + 8.51 + 6 * 0.27, 0.005), String(PT.leiEstimat29));
t('partea fără eveniment = Furculita 1,62 lei', aprox(PT.leiEstimat29FaraEvenimente, 1.62));
t('MUTAȚIE „2.8 adunat peste Adj × CPU": nicio cifră a rezultatului nu e suma celor două', ![PT.lei28, PT.leiEstimat29, ...Object.values(PT.lei28Parti)].some(v => aprox(v, PT.lei28 + PT.leiEstimat29, 0.005)));

console.log('\n— 6. Fereastra fără dată pe eveniment: preț și rețetă determinabile doar fără schimbare în interior —');
const ingUnPret: Ingredient = { cod: 'X', denumire: 'X', categorie: 'MP', tip: 'FOOD', um: 'kg', preturi: [{ validDeLa: '2026-07-01', pret: 44 }], activ: true };
t('un singur preț în vigoare pe toată fereastra → determinabil', pretDeterminabil(ingUnPret, F8).determinabil && pretDeterminabil(ingUnPret, F8).pret === 44);
const ingSchimbat: Ingredient = { ...ingUnPret, preturi: [{ validDeLa: '2026-07-01', pret: 44 }, { validDeLa: '2026-08-18', pret: 45.07 }] };
t('prețul se schimbă în interiorul lunii → NEdeterminabil, cu ambele prețuri listate', !pretDeterminabil(ingSchimbat, F8).determinabil && pretDeterminabil(ingSchimbat, F8).preturi.length === 2);
t('schimbare de preț exact la începutul ferestrei → determinabil (un singur preț în vigoare)', pretDeterminabil({ ...ingUnPret, preturi: [{ validDeLa: '2026-07-01', pret: 44 }, { validDeLa: '2026-08-01', pret: 45.07 }] }, F8).pret === 45.07);
t('schimbare după fereastră → determinabil', pretDeterminabil({ ...ingUnPret, preturi: [{ validDeLa: '2026-07-01', pret: 44 }, { validDeLa: '2026-09-01', pret: 45.07 }] }, F8).pret === 44);
t('două intrări cu același preț → determinabil', pretDeterminabil({ ...ingUnPret, preturi: [{ validDeLa: '2026-07-01', pret: 44 }, { validDeLa: '2026-08-18', pret: 44 }] }, F8).determinabil);
const linii1 = [{ comp: 'X', tipComp: 'INGREDIENT' as const, cant: 100, um: 'g' as const, canal: 'AMBELE' as const }];
const retetaUna: Reteta = { cod: 'P1', tip: 'PRODUS', denumire: 'P1', activa: 1, versiuni: [{ nr: 1, data: '2026-07-01', linii: linii1 }] };
t('o singură versiune de rețetă → determinabilă', versiuneDeterminabila(retetaUna, F8).determinabil && versiuneDeterminabila(retetaUna, F8).versiune!.nr === 1);
const retetaDoua: Reteta = { ...retetaUna, activa: 2, versiuni: [...retetaUna.versiuni, { nr: 2, data: '2026-08-20', linii: [{ ...linii1[0], cant: 120 }] }] };
t('rețeta se schimbă în interiorul lunii → NEdeterminabilă, versiunile 1 și 2 listate', !versiuneDeterminabila(retetaDoua, F8).determinabil && versiuneDeterminabila(retetaDoua, F8).versiuni.join(',') === '1,2');
const retetaIdentica: Reteta = { ...retetaUna, activa: 2, versiuni: [...retetaUna.versiuni, { nr: 2, data: '2026-08-20', nota: 'redenumire', linii: linii1 }] };
t('două versiuni cu aceleași linii → rezultatul e același, deci determinabilă', versiuneDeterminabila(retetaIdentica, F8).determinabil);
t('versiunea nouă după fereastră nu contează', versiuneDeterminabila({ ...retetaDoua, versiuni: [retetaUna.versiuni[0], { ...retetaDoua.versiuni[1], data: '2026-09-01' }] }, F8).determinabil);
console.log('\n— 6b. Regresii: acoperire istorică de la începutul ferestrei —');
const pretTarziu = pretDeterminabil({ ...ingUnPret, preturi: [{ validDeLa: '2026-08-20', pret: 44 }] }, F8);
t('R3. primul preț începe pe 20 august → 1–31 august NU e determinabilă (fără valoare din viitor)', !pretTarziu.determinabil && pretTarziu.pret === null && (pretTarziu.motiv ?? '').includes('istoricul începe'));
t('R3. preț doar după fereastră → nedeterminabil', !pretDeterminabil({ ...ingUnPret, preturi: [{ validDeLa: '2026-09-10', pret: 44 }] }, F8).determinabil);
t('R3. fără niciun preț → nedeterminabil', !pretDeterminabil({ ...ingUnPret, preturi: [] }, F8).determinabil);
const retetaTarzie: Reteta = { ...retetaUna, versiuni: [{ nr: 1, data: '2026-08-20', linii: linii1 }] };
t('R3. prima versiune de rețetă pe 20 august → NU e determinabilă pe 1–31 august', !versiuneDeterminabila(retetaTarzie, F8).determinabil && versiuneDeterminabila(retetaTarzie, F8).versiune === null);
t('R3. versiune doar după fereastră → nedeterminabilă', !versiuneDeterminabila({ ...retetaUna, versiuni: [{ nr: 1, data: '2026-09-10', linii: linii1 }] }, F8).determinabil);
t('R3. fereastră viitoare cu o versiune veche în vigoare → determinabilă strict din istoric', versiuneDeterminabila(retetaUna, { de: '2027-01-01', la: '2027-01-31' }).determinabil);
t('R3. motivul nedeterminabilității e explicit', (versiuneDeterminabila(retetaDoua, F8).motiv ?? '').includes('versiunile 1, 2') && (pretDeterminabil(ingSchimbat, F8).motiv ?? '').includes('44 → 45.07'));

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
process.exit(fail ? 1 : 0);
