// D5 + D4 — raportul NBO 2.9 în formatul lui real (PDF de grilă) și prețul efectiv din „Cost per Unit".
//
// Contract:
//   · adaptorul citește grila din textul PDF-ului: Item ID, Item, Inv Unit, Cost per Unit, Usage
//     Actual/Theory/Variance în unități și lei, grupul (și părintele lui), perioada, restaurantul,
//     rândul sursă; denumirile și celulele rupte pe rândul următor se reîntregesc; ce nu se poate
//     citi rămâne raportat, nu dispare; rândurile se verifică pe totalurile raportului;
//   · D4: Cost per Unit > 0 + UM cunoscută și compatibilă → preț datat în nomenclator, în UM-ul
//     ingredientului; zero/negativ → fără update, cu diagnostic; Usage lei ÷ unități e doar
//     diagnostic de consistență (> 5 %), Cost per Unit rămâne valoarea sursă;
//   · lanțul întreg: 2.9 → preț datat → cost rețetă la dată → FC recalculat; septembrie nu
//     schimbă august; săptămânalul și lunarul coexistă (D3); materialele nemapate merg în coadă
//     doar dacă sunt Food & Paper (D1, D6); reimportul identic e duplicat, fără intrări noi.
import { esteRaport29, numar29, parsatDin29, parseRaport29, descrie29, verificaIdentitate29 } from '../src/lib/nbo-29';
import { preturiDin29 } from '../src/lib/actualizare-29';
import { importaPrinCentru, type CerereImport } from '../src/lib/import-center';
import { importa } from '../src/lib/importer';
import { foaieDin29 } from '../src/lib/auto';
import { buildCtx, costProdus, pretLa } from '../src/lib/engine';
import { COMPANIE, perioadaDin } from '../src/lib/fc-domeniu';
import { recipeFC } from '../src/lib/fc-core';
import { analizaIngrediente } from '../src/lib/fc-ingrediente';
import { felNemapat } from '../src/lib/aprobare';
import { stareGoala } from '../src/lib/seed';
import type { AppState, Ingredient, Material29, Produs, Reteta, VanzareFapt } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;
const ACUM = (h: number) => `2026-09-03T${String(h).padStart(2, '0')}:00:00.000Z`;

// ————————————————————————————————— fixtura: textul unui 2.9 real, redus (două pagini)
//
// Exact formele întâlnite în raportul real: celule rupte („20.160," + „0", „(1.080," + „0)",
// „19.049,35" + „lei", „(2.226,10" + „lei)", „(173," + „7)", „(2." + „472,3)"), denumiri rupte
// pe unul sau două rânduri, antete tipărite de două ori, subgrup sub părinte, total de părinte
// cu și fără subgrup, rând cu cost negativ, rând cu cost 1 lei și consum zero.
const ANTET = [
  'FRYDAY CLUJ MEMO Fiscal Year: 2026',
  '2.9 Food Cost - Inventory With Adjustments Summary - FIFO',
  'Period: 8',
  '01.08.2026 - 31.08.2026',
  'Usage in Units Usage in Dollars Usage in Percent',
  'Raw Material Item Inv Beg Pur Inv Inv End Cost End Days On',
  'Item Name ID Units Inv Units Adj Trans Inv per Unit Ext Hand Actual Theory Variance Actual Theory Variance Actual Theory Variance',
];
const SUBSOL = (p: number) => `V 21.1.126.0 - 188 - 02.09.2026 22:35 Copyright © NCR Corporation 2022 ${p} of 2`;
const PAGINA1 = [
  ...ANTET,
  'Food 11%',
  'Food 11%',
  'Branza cheddar felii 2026 7000123 EA 6.759,0 20.160, 126,0 (1.080, 1.777,0 0,63 lei 1.110,63 lei 2,3 23.936, 23.829, 107,0 14.946 lei 14.879 lei 67 lei 2,21% 2,20% 0,01%',
  '0 0) 0 0',
  'BURGER VITA 80G PL 7000268 EA 2.582,0 18.810, 76,0 7.068,0 5.327,0 3,58 lei 19.049,35 7,2 23.057, 24.373, (1.316,0) 82.574 lei 87.287 lei (4.713 lei) 12,22% 12,92% (0,70%)',
  '0 lei 0 0',
  'CHIFLA CARTOF 3.5inch 53G x 7000133 EA 4.310,0 17.352, 175,0 2.952,0 4.536,0 2,35 lei 10.677,74 7,1 19.903, 19.818, 85,0 47.056 lei 46.855 lei 201 lei 6,96% 6,93% 0,03%',
  '72 0 lei 0 0',
  'SALATA LOLLO BIONDA S 7000143 Gram 5.600,0 16.000, 0,0 500,0 236,0 0,04 lei 8,50 lei 0,3 21.864, 24.915, (3.051,0) 787 lei 897 lei (110 lei) 0,12% 0,13% (0,02%)',
  '500g 0 0 0',
  'Sare FRYDAY 2G 2002 Each 221,0 0,0 0,0 0,0 269,0 0,05 lei 13,18 lei (173, (48,0) (48,0) 0,0 (2 lei) (2 lei) 0 lei 0,00% 0,00% 0,00%',
  '7)',
  'Sos special 7000999 KG 10,0 100,0 0,0 0,0 20,0 12,00 lei 240,00 lei 6,0 90,0 88,0 2,0 1.200 lei 1.056 lei 144 lei 0,18% 0,16% 0,02%',
  'Total: Food 11% 31.099,11 lei 146.561 lei 150.892 lei (4.331 lei) 21,69% 22,33% (0,64%)',
  'Total: Food 11% 31.099,11 lei 146.561 lei 150.892 lei (4.331 lei) 21,69% 22,33% (0,64%)',
  'Alcool',
  SUBSOL(1),
];
const PAGINA2 = [
  ...ANTET,
  'Alcool',
  'Alcool',
  'Corona 0,33 - SGR 24 7000241 EA 27,0 48,0 0,0 0,0 21,0 6,97 lei 146,31 lei 12,1 54,0 53,0 1,0 376 lei 369 lei 7 lei 0,06% 0,05% 0,00%',
  'BUC/BAX- new2026',
  'Total: Alcool 146,31 lei 376 lei 369 lei 7 lei 0,06% 0,05% 0,00%',
  'Total: Alcool 146,31 lei 376 lei 369 lei 7 lei 0,06% 0,05% 0,00%',
  'DrinksSugar 21%',
  'DrinksSugar 21%',
  'Pepsi Max 0.33L PROMO FREE 702044 EA 1.788,0 396,0 0,0 (600,0) 926,0 (2,40 lei) (2.226,10 43,6 658,0 624,0 34,0 334 lei 317 lei 17 lei 0,05% 0,05% 0,00%',
  'lei)',
  'Lipton BIB 3006 Liter 11,9 30,0 0,0 0,0 8,8 65,25 lei 576,16 lei 8,3 33,1 23,2 9,9 2.158 lei 1.515 lei 643 lei 0,32% 0,22% 0,10%',
  'Total: DrinksSugar 21% (1.649,94 lei) 2.492 lei 1.832 lei 660 lei 0,37% 0,27% 0,10%',
  'Total: DrinksSugar 21% (1.649,94 lei) 2.492 lei 1.832 lei 660 lei 0,37% 0,27% 0,10%',
  'Paper',
  'ACCESORII',
  'Bonete de unica folosinta 702257 EA 65,0 200,0 0,0 0,0 0,0 0,22 lei 0,00 lei 0,0 265,0 265,0 0,0 57 lei 57 lei 0 lei 0,01% 0,01% 0,00%',
  'Total: ACCESORII 0,00 lei 57 lei 57 lei 0 lei 0,01% 0,01% 0,00%',
  'Paper',
  'Capac din plastic negru 4oz 702116 EA 315,0 0,0 0,0 0,0 319,0 0,12 lei 37,96 lei (2. (4,0) 22,0 (26,0) 0 lei 3 lei (3 lei) 0,00% 0,00% 0,00%',
  '472,3)',
  'PAHAR DIN CARTON 7000005 Each 936,0 0,0 0,0 0,0 923,0 0,33 lei 302,74 lei 2.201, 13,0 14,0 (1,0) 4 lei 5 lei 0 lei 0,00% 0,00% 0,00%',
  '[400ML/16OZ] FRY RANCH 0',
  'CGRBA7992 DP16T',
  'Total: Paper 340,70 lei 4 lei 8 lei (3 lei) 0,00% 0,00% 0,00%',
  'Total: Paper 340,70 lei 61 lei 65 lei (3 lei) 0,01% 0,01% 0,00%',
  'Diverse 21%',
  'Diverse 21%',
  'Articol test 7000267 EA 0,0 0,0 0,0 0,0 0,0 1,00 lei 0,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Total: Diverse 21% 0,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Total: Diverse 21% 0,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Totals: Sales: 675.735,58 lei 29.936,18 lei 149.490 lei 153.158 lei (3.668 lei) 22,12% 22,67% (0,54%)',
  SUBSOL(2),
];
const TEXT = [...PAGINA1, ...PAGINA2].join('\n');

// ————————————————————————————————— 1. adaptorul citește grila
console.log('— 1. Adaptorul citește raportul 2.9 din textul PDF-ului —');
const R = parseRaport29(TEXT);
const la = (id: string) => R.randuri.find(x => x.itemId === id)!;
t('e recunoscut ca 2.9 după titlu, nu după numele fișierului', esteRaport29(TEXT) && !esteRaport29('Sales Mix 4.7\nCATEGORY BURGER'));
t('antet: restaurant, an fiscal, eticheta de perioadă, fereastra', R.restaurant === 'FRYDAY CLUJ MEMO' && R.anFiscal === '2026' && R.perioadaEticheta === 'Period 8' && R.de === '2026-08-01' && R.la === '2026-08-31', `${R.restaurant} ${R.perioadaEticheta} ${R.de}..${R.la}`);
t('13 materiale, niciun rând necitit', R.randuri.length === 13 && R.nerecunoscute.length === 0, `${R.randuri.length} / nerec ${R.nerecunoscute.length}: ${R.nerecunoscute.map(n => n.text).join(' | ')}`);
const ch = la('7000123');
t('celulele rupte se reîntregesc în ordinea coloanelor (Pur 20.160, Trans (1.080), Usage 23.936 / 23.829)', ch.achizitii === 20160 && ch.transferuri === -1080 && ch.consumUnitati.actual === 23936 && ch.consumUnitati.teoretic === 23829 && ch.ajustari === 126, JSON.stringify(ch));
t('Cost per Unit și End Ext se citesc în lei', ch.costPeUnitate === 0.63 && ch.valoareStocFinal === 1110.63 && ch.umInventar === 'EA');
t('„lei" rupt pe rândul următor se lipește de valoarea lui (End Ext 19.049,35 lei)', la('7000268').valoareStocFinal === 19049.35 && la('7000268').achizitii === 18810);
t('bucata de denumire de pe rândul cu cifre rupte merge la denumire („… 53G x 72")', la('7000133').item === 'CHIFLA CARTOF 3.5inch 53G x 72' && la('7000133').valoareStocFinal === 10677.74, la('7000133').item);
t('unitatea Gram și numele „… S 500g"', la('7000143').umInventar === 'Gram' && la('7000143').item === 'SALATA LOLLO BIONDA S 500g' && la('7000143').consumUnitati.actual === 21864);
t('paranteza ruptă a zilelor de stoc: (173,7) → −173,7; consum negativ (48,0) → −48', aprox(la('2002').zileStoc, -173.7) && la('2002').consumUnitati.actual === -48 && la('2002').consumLei.actual === -2);
t('„(2." + „472,3)" → −2472,3', aprox(la('702116').zileStoc, -2472.3));
t('denumirea continuă pe unul sau două rânduri („Corona … BUC/BAX- new2026", „PAHAR … CGRBA7992 DP16T")', la('7000241').item === 'Corona 0,33 - SGR 24 BUC/BAX- new2026' && la('7000005').item === 'PAHAR DIN CARTON [400ML/16OZ] FRY RANCH CGRBA7992 DP16T' && la('7000005').zileStoc === 2201, `${la('7000005').item} / ${la('7000005').zileStoc}`);
t('cost negativ „(2,40 lei)" și „(2.226,10" + „lei)"', la('702044').costPeUnitate === -2.4 && la('702044').valoareStocFinal === -2226.1);
t('grupul: antetul dublu e unul singur; subgrupul poartă părintele („Paper" → „ACCESORII")', la('702257').categorie === 'ACCESORII' && la('702257').grup === 'Paper' && la('702116').categorie === 'Paper' && la('702116').grup === null && la('7000241').categorie === 'Alcool' && la('7000267').categorie === 'Diverse 21%');
t('categoria de la sfârșitul paginii 1 („Alcool") nu fură rândurile paginii 2 și nu devine denumire', R.randuri.filter(x => x.categorie === 'Alcool').length === 1 && !R.randuri.some(x => /Alcool/.test(x.item)));
t('rândul sursă e linia din text (Branza = linia 10, Corona = linia 34)', ch.rand === 10 && la('7000241').rand === PAGINA1.length + ANTET.length + 3, `${ch.rand} ${la('7000241').rand}`);
t('procentele și varianța se citesc cu semn', la('7000268').consumPct.actual === 12.22 && la('7000268').consumPct.varianta === -0.7 && la('7000268').consumLei.varianta === -4713);
t('identitate: Σ consum actual pe rânduri = totalul general al raportului', aprox(R.randuri.reduce((s, x) => s + x.consumLei.actual, 0), R.totalGeneral!.consumLei.actual), `${R.randuri.reduce((s, x) => s + x.consumLei.actual, 0)} vs ${R.totalGeneral?.consumLei.actual}`);
t('totalul general: vânzări 675.735,58 lei, consum 149.490 lei, FC 22,12 %', !!R.totalGeneral && R.totalGeneral.vanzari === 675735.58 && R.totalGeneral.consumLei.actual === 149490 && R.totalGeneral.consumPct.actual === 22.12);
t('toate grupurile se verifică pe total: Paper direct (4) și Paper cu subgrup (4 + 57 = 61)', R.verificari.length === 7 && R.verificari.every(v => v.ok) && R.verificari.some(v => v.categorie === 'Paper (cu subgrupuri)' && v.calculat === 61), R.verificari.map(v => `${v.categorie}:${v.calculat}/${v.declarat}:${v.ok}`).join(' '));
t('totalurile tipărite de două ori sunt un singur total', R.totaluri.length === 7 && R.totaluri.filter(x => x.categorie === 'Paper').length === 2, `${R.totaluri.length}`);
t('fără avertismente pe un raport consistent', R.avertismente.length === 0, R.avertismente.join(' | '));
t('numerele românești cu paranteze: „1.610,35 lei" → 1610,35 · „(264,0)" → −264 · „0" → 0 · „(0,80%)" → −0,8', numar29('1.610,35 lei') === 1610.35 && numar29('(264,0)') === -264 && numar29('0') === 0 && numar29('(0,80%)') === -0.8 && numar29('abc') === null);

// ce nu se poate citi NU dispare: rândul rupt căruia îi lipsește continuarea rămâne raportat
const RUPT = [...PAGINA1.filter(l => l !== '0 0) 0 0'), ...PAGINA2].join('\n');
const rr = parseRaport29(RUPT);
t('un rând rupt fără continuare e raportat ca necitit, nu pierdut pe tăcute', rr.randuri.length === 12 && rr.nerecunoscute.length === 1 && rr.nerecunoscute[0].rand === 10 && rr.avertismente.some(a => /necitit|nu s-au putut citi/.test(a)), rr.avertismente.join(' | '));
t('… iar totalul grupului nu se mai verifică', rr.verificari.some(v => v.categorie === 'Food 11%' && !v.ok) && rr.avertismente.some(a => /Food 11%/.test(a)));
const ALTA_PER = TEXT.replace('01.08.2026 - 31.08.2026\nUsage in Units', '01.08.2026 - 31.08.2026\nUsage in Units').split('\n');
ALTA_PER[PAGINA1.length + 3] = '03.08.2026 - 09.08.2026';
const rp = parseRaport29(ALTA_PER.join('\n'));
t('pagini cu perioade diferite: se păstrează prima, cu avertisment', rp.de === '2026-08-01' && rp.avertismente.some(a => /perioade diferite/.test(a)));
t('descrierea de o linie', /Raport NBO 2\.9 · FRYDAY CLUJ MEMO · 2026-08-01 → 2026-08-31 · 13 materiale · 7\/7 grupuri/.test(descrie29(R)), descrie29(R));

// ————————————————————————————————— 2. Parsat-ul intră pe drumul 2.9 pe material
console.log('\n— 2. Raportul devine un Parsat 2.9 pe material, cu fereastra declarată de el —');
const P = parsatDin29(R);
t('13 rânduri, antetele recunoscute de importator', P.randuri.length === 13 && P.antete.includes('Cost per unit') && P.antete.includes('Cod material') && P.antete.includes('Rand sursa'));
t('fereastra vine din antetul raportului', P.fereastra?.de === '2026-08-01' && P.fereastra?.la === '2026-08-31');
const pb = P.randuri.find(r => r['Cod material'] === '702257')!;
t('subgrupul poartă părintele în categorie („Paper / ACCESORII") și separat („Grup raport")', pb.Categorie === 'Paper / ACCESORII' && pb['Grup raport'] === 'Paper' && pb.Locatie === 'FRYDAY CLUJ MEMO' && pb.Perioada === '2026-08');
t('cantitate = Usage Actual, cost actual = Usage lei Actual, cost teoretic = Usage lei Theory, UM = Inv Unit', P.randuri[0]['Cantitate'] === 23936 && P.randuri[0]['Cost actual'] === 14946 && P.randuri[0]['Cost teoretic'] === 14879 && P.randuri[0].UM === 'EA' && P.randuri[0]['Cantitate teoretica'] === 23829 && P.randuri[0]['Cost per unit'] === 0.63);
const foaie = foaieDin29(TEXT, '2.9_Memo_Cluj.pdf');
t('analiza automată a PDF-ului îl duce pe FC29_MATERIAL, cu maparea completă', !!foaie && foaie.tip === 'FC29_MATERIAL' && foaie.mapare.costPeUnitate === 'Cost per unit' && foaie.mapare.material === 'Cod material' && foaie.mapare.cantTeoretic === 'Cantitate teoretica' && foaie.mapare.cant === 'Cantitate' && foaie.incredere === 100, JSON.stringify(foaie?.mapare));
t('… și nu se aplică unui text care nu e 2.9', foaieDin29('Sales Mix\nMenu Item Name Qty', 'x.pdf') === null);
const direct = importa('FC29_MATERIAL', P, '2.9_Memo_Cluj.pdf', { ...stareGoala(), locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }] });
t('și importatorul apelat direct (fără Center) datează rândurile pe fereastra declarată de fișier', direct.stateNou.materiale29!.length === 13 && direct.stateNou.materiale29!.every(m => m.fereastra?.de === '2026-08-01' && m.fereastra.la === '2026-08-31' && m.fereastra.granularitate === 'LUNA'));
const directS = importa('FC29_MATERIAL', parsatDin29(parseRaport29(TEXT.replace(/01\.08\.2026 - 31\.08\.2026/g, '03.08.2026 - 09.08.2026'))), 'S32.pdf', { ...stareGoala(), locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }] });
t('… iar o săptămână declarată de fișier dă rânduri SAPTAMANA, nu luna lor', directS.stateNou.materiale29!.every(m => m.fereastra?.granularitate === 'SAPTAMANA' && m.fereastra.de === '2026-08-03'));

// ————————————————————————————————— 3. importul prin Import Center + D4
console.log('\n— 3. Importul prin Import Center: versiune cu fereastră, coadă D1/D6, prețuri D4 —');
const ing = (cod: string, denumire: string, um: Ingredient['um'], pret: number): Ingredient =>
  ({ cod, denumire, categorie: 'MP', tip: 'FOOD', um, preturi: [{ validDeLa: '2026-07-01', pret }], activ: true });
const BAZA: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }],
  ingrediente: [
    ing('CHED', 'Branza cheddar felii 2026', 'buc', 0.6),   // identificat pe denumire; EA → buc
    ing('7000268', 'Burger vita', 'buc', 3.58),             // preț identic → fără intrare nouă
    ing('7000143', 'Salata lollo', 'kg', 35),               // Gram → kg: 0,04 lei/g = 40 lei/kg
    ing('702044', 'Pepsi Max', 'buc', 2.5),                 // cost negativ → fără preț valid
    ing('7000267', 'Articol test', 'kg', 9),                // EA pe un ingredient în kg → UM incompatibilă
    ing('3006', 'Lipton BIB', 'l', 60),                     // Liter → l
    ing('7000005', 'Pahar carton', 'buc', 0.3),             // abatere 7 % dar consum 4 lei → fără avertisment
    ing('2002', 'Sare FRYDAY 2G', 'buc', 0.04),
    ing('7000133', 'Chifla cartof', 'buc', 2),
    ing('7000999', 'Sos special', 'kg', 11),                // 1.200 lei ÷ 90 kg = 13,33 vs 12 → avertisment
  ],
  produse: [{ cod: 'P1', denumire: 'Cheeseburger', categorie: 'B', tip: 'SIMPLU', pretInstore: 30, pretDelivery: 30, tva: 11, activ: true } as Produs],
  retete: [{ cod: 'P1', tip: 'PRODUS', denumire: 'Cheeseburger', activa: 1,
    versiuni: [{ nr: 1, data: '2026-07-01', linii: [
      { comp: 'CHED', tipComp: 'INGREDIENT', cant: 2, um: 'buc', canal: 'AMBELE' },
      { comp: '7000143', tipComp: 'INGREDIENT', cant: 100, um: 'g', canal: 'AMBELE' },
    ] }] } as Reteta],
  vanzari: [
    { data: '2026-07-10', locatie: 'L01', canal: 'INSTORE', produs: 'P1', cant: 100, brut: 3330, net: 3000 } as VanzareFapt,
    { data: '2026-08-10', locatie: 'L01', canal: 'INSTORE', produs: 'P1', cant: 100, brut: 3330, net: 3000 } as VanzareFapt,
  ],
  salesReport: [], istoricPreturi: [], versiuniImport: [], nemapate: [],
};
const imp = (s: AppState, c: Omit<CerereImport, 'tip'>) => importaPrinCentru(s, { ...c, tip: 'NBO_29' });
const r3 = imp(BAZA, { fisier: '2.9_Memo_Cluj.pdf', parsat: P, acum: ACUM(8) });
const S3 = r3.stareNoua;
t('importul se activează', r3.rezultat.stare === 'ACTIVAT', r3.rezultat.erori.join(' | ') + ' ' + r3.rezultat.diagnostice.filter(d => d.nivel === 'BLOCANT').map(d => d.cod).join(' | '));
const v3 = S3.versiuniImport!.find(v => v.tip === 'NBO_29')!;
t('versiunea poartă fereastra declarată de raport, fără ca omul să o tasteze', v3.intervalDe === '2026-08-01' && v3.intervalLa === '2026-08-31' && v3.perioada === '2026-08', `${v3.intervalDe}..${v3.intervalLa}`);
t('restaurantul din antet devine restaurantul versiunii', v3.scop === 'RESTAURANT' && v3.restaurante.join() === 'L01', `${v3.scop} ${v3.restaurante.join()}`);
const m3 = S3.materiale29!;
t('13 materiale cu Cost per Unit, unitatea de inventar și rândul sursă', m3.length === 13 && m3.every(m => m.costPeUnitate !== undefined && m.umInventar && m.sursa?.rand !== undefined && m.locatie === 'L01'), `${m3.length}`);
const mb = m3.find(m => m.material === '702257')!;
t('subgrupul își păstrează grupul părinte și rândul din PDF', mb.grup === 'Paper' && mb.categorie === 'Paper / ACCESORII' && mb.sursa?.rand === la('702257').rand && mb.cantTeoretic === 265);
t('fereastra fiecărui rând e luna raportului (granularitate LUNA), nu una presupusă', m3.every(m => m.fereastra?.de === '2026-08-01' && m.fereastra?.la === '2026-08-31' && m.fereastra.granularitate === 'LUNA'));
const coada = S3.nemapate.filter(n => felNemapat(n) === 'MATERIAL').map(n => n.denumire).sort();
t('D1/D6: în coadă intră doar materialele nemapate Food & Paper (Capac, Bonete), nu Corona (Alcool, neclasificat)', coada.join() === '702116,702257', coada.join());
const pret = (s: AppState, cod: string) => s.ingrediente.find(i => i.cod === cod)!;
const eCH = pret(S3, 'CHED').preturi.find(p => p.validDeLa === '2026-08-01');
t('D4: Cost per Unit 0,63 lei/EA devine prețul datat al ingredientului identificat pe denumire', !!eCH && eCH.pret === 0.63 && pret(S3, 'CHED').preturi.length === 2);
t('… cu proveniența completă: 2.9, fișier, amprenta versiunii, perioada, materialul (Item ID), rândul PDF, restaurantul',
  eCH?.sursa?.tip === 'NBO_29' && eCH.sursa.fisier === '2.9_Memo_Cluj.pdf' && eCH.sursa.amprenta === v3.amprenta && eCH.sursa.perioada === '2026-08'
  && eCH.sursa.material === '7000123' && eCH.sursa.rand === 10 && eCH.sursa.restaurant === 'L01', JSON.stringify(eCH?.sursa));
t('conversia UM: 0,04 lei/Gram → 40 lei/kg; 65,25 lei/Liter → 65,25 lei/l', pretLa(pret(S3, '7000143'), '2026-08-15') === 40 && pretLa(pret(S3, '3006'), '2026-08-15') === 65.25);
t('prețul identic (Burger 3,58) nu creează intrare', pret(S3, '7000268').preturi.length === 1);
t('cost negativ (Pepsi −2,40): fără update, prețul vechi rămâne', pret(S3, '702044').preturi.length === 1 && pretLa(pret(S3, '702044'), '2026-08-15') === 2.5);
t('UM incompatibilă (EA pe ingredient în kg): fără update', pret(S3, '7000267').preturi.length === 1 && pretLa(pret(S3, '7000267'), '2026-08-15') === 9);
t('Sare 0,05, Chifla 2,35, Pahar 0,33, Sos 12 — scrise', pretLa(pret(S3, '2002'), '2026-08-15') === 0.05 && pretLa(pret(S3, '7000133'), '2026-08-15') === 2.35 && pretLa(pret(S3, '7000005'), '2026-08-15') === 0.33 && pretLa(pret(S3, '7000999'), '2026-08-15') === 12);
const av = r3.rezultat.avertismente;
t('raportul importului numără: 7 intrări noi, 1 identică', av.some(a => /Prețuri din 2\.9 \(Cost per Unit\): 7 intrări datate noi/.test(a) && /1 identice/.test(a)), av.filter(a => /Cost per Unit/.test(a)).join(' | '));
t('… 2 materiale mapate fără preț valid (zero/negativ 1, UM incompatibilă 1), numite', av.some(a => /2 materiale mapate FĂRĂ preț valid/.test(a) && /zero\/negativ: 1/.test(a) && /UM incompatibilă: 1/.test(a) && /Pepsi Max/.test(a) && /Articol test/.test(a)), av.filter(a => /FĂRĂ preț/.test(a)).join(' | '));
t('… avertismentul de consistență pe Sos special (13,33 vs 12), fără „corectare"', av.some(a => /consistență/.test(a) && /Sos special/.test(a) && /nu se corectează/.test(a)) && pretLa(pret(S3, '7000999'), '2026-08-15') === 12, av.filter(a => /consisten/.test(a)).join(' | '));
t('… Pahar (abatere 7 % pe 4 lei) și Sare (pe −2 lei) NU sunt avertizate: rotunjirea la leu nu e inconsistență', !av.some(a => /consistență/.test(a) && (/Pahar/.test(a) || /Sare/.test(a))));
t('… materialele nemapate sunt numărate ca fără preț până la aprobare', av.some(a => /3 materiale nemapate nu primesc preț/.test(a)), av.filter(a => /nemapate/.test(a)).join(' | '));
const ist = S3.istoricPreturi!.filter(e => e.sursa?.tip === 'NBO_29');
t('istoricul de prețuri din Import Center are 7 intrări 2.9, cu preț vechi, nou și Δ', ist.length === 7 && ist.every(e => e.pretVechi !== null && e.deltaRON !== null) && ist.find(e => e.ingredient === 'CHED')?.deltaRON === 0.63 - 0.6 + 0 && aprox(ist.find(e => e.ingredient === 'CHED')!.deltaRON!, 0.03), `${ist.length}`);
t('rețetarul nu primește versiune nouă', S3.retete[0].versiuni.length === 1);
const rDup = imp(S3, { fisier: '2.9_Memo_Cluj.pdf', parsat: P, acum: ACUM(9) });
t('reimportul identic e DUPLICAT_EXACT: nicio intrare de preț în plus', rDup.rezultat.duplicat === 'DUPLICAT_EXACT' && !rDup.rezultat.activat && pret(rDup.stareNoua, 'CHED').preturi.length === 2, rDup.rezultat.duplicat);

// ————————————————————————————————— 4. lanțul: preț datat → cost rețetă → FC recalculat
console.log('\n— 4. Prețul datat schimbă costul rețetei la dată și FC-ul, fără să rescrie istoricul —');
const C0 = buildCtx(BAZA), C3 = buildCtx(S3);
t('costul din iulie rămâne pe prețurile de iulie: 2 × 0,60 + 0,1 × 35 = 4,70', aprox(costProdus('P1', 'INSTORE', C0, '2026-07-15')!.total, 4.7) && aprox(costProdus('P1', 'INSTORE', C3, '2026-07-15')!.total, 4.7), `${costProdus('P1', 'INSTORE', C3, '2026-07-15')?.total}`);
t('costul din august folosește prețurile 2.9: 2 × 0,63 + 0,1 × 40 = 5,26', aprox(costProdus('P1', 'INSTORE', C3, '2026-08-15')!.total, 5.26), `${costProdus('P1', 'INSTORE', C3, '2026-08-15')?.total}`);
const AUG = perioadaDin('2026-08-15', 'LUNA'), IUL = perioadaDin('2026-07-15', 'LUNA');
const fcAug0 = recipeFC(BAZA, C0, { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL' });
const fcAug3 = recipeFC(S3, C3, { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL' });
const fcIul3 = recipeFC(S3, C3, { perioada: IUL, nivel: COMPANIE, canal: 'TOTAL' });
t('Recipe Cost pe august se recalculează singur: 100 × 5,26 = 526 lei (era 470)', aprox(fcAug3.cost, 526) && aprox(fcAug0.cost, 470), `${fcAug0.cost} → ${fcAug3.cost}`);
t('Recipe Cost pe iulie e neatins: 470 lei', aprox(fcIul3.cost, 470), `${fcIul3.cost}`);
t('identitate: ΔRecipe Cost = Σ Δpreț × consum = 100 × (2 × 0,03 + 0,1 × 5) = 56', aprox(fcAug3.cost - fcAug0.cost, 56));
const an = analizaIngrediente(S3, C3, { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL', comparatie: 'LUNA_PRECEDENTA' });
const rCH = an.randuri.find(r => r.ingredient === 'CHED');
t('Ingredient Intelligence: cheddar cu preț anterior 0,60, nou 0,63, Δ 0,03 lei, Δ 5 %, consum 200, impact 6 lei', !!rCH && rCH.pretPrecedent === 0.6 && rCH.pretCurent === 0.63 && aprox(rCH.deltaPretLei!, 0.03) && aprox(rCH.deltaPretPct!, 5) && rCH.consumCurent === 200 && aprox(rCH.deltaCostLei!, 6), JSON.stringify({ p: rCH?.pretPrecedent, c: rCH?.pretCurent, q: rCH?.consumCurent, d: rCH?.deltaCostLei }));
t('… cu evenimentul de preț din 2.9 (fișier, rând, restaurant)', !!rCH && rCH.schimbariPret.length === 1 && rCH.schimbariPret[0].sursa?.tip === 'NBO_29' && rCH.schimbariPret[0].sursa?.rand === 10 && rCH.schimbariPret[0].sursa?.restaurant === 'L01');
t('Lipton (preț schimbat, fără consum) rămâne vizibil, cu consum 0', an.randuri.some(r => r.ingredient === '3006' && r.consumCurent === 0 && r.pretCurent === 65.25));

// ————————————————————————————————— 5. septembrie nu schimbă august; săptămâna și luna coexistă
console.log('\n— 5. Un 2.9 din septembrie nu schimbă august; săptămânalul și lunarul coexistă (D3) —');
const SEPT = TEXT.replace(/01\.08\.2026 - 31\.08\.2026/g, '01.09.2026 - 30.09.2026').replace(/Period: 8/g, 'Period: 9')
  .replace('1.777,0 0,63 lei', '1.777,0 0,70 lei');
const r5 = imp(S3, { fisier: '2.9_Memo_Cluj_sept.pdf', parsat: parsatDin29(parseRaport29(SEPT)), acum: ACUM(10) });
const S5 = r5.stareNoua;
t('septembrie se activează ca versiune nouă, pe fereastra lui', r5.rezultat.stare === 'ACTIVAT' && S5.versiuniImport!.some(v => v.intervalDe === '2026-09-01' && v.intervalLa === '2026-09-30'), r5.rezultat.erori.join(' | '));
t('prețul cheddar: august 0,63, septembrie 0,70 — istoricul lui august nu e rescris', pretLa(pret(S5, 'CHED'), '2026-08-15') === 0.63 && pretLa(pret(S5, 'CHED'), '2026-09-15') === 0.7 && pret(S5, 'CHED').preturi.length === 3);
t('costul lunii august e identic după încărcarea lui septembrie', aprox(costProdus('P1', 'INSTORE', buildCtx(S5), '2026-08-15')!.total, 5.26) && aprox(recipeFC(S5, buildCtx(S5), { perioada: AUG, nivel: COMPANIE, canal: 'TOTAL' }).cost, 526));
t('ambele versiuni rămân în vigoare: luni diferite nu se înlocuiesc', S5.versiuniImport!.filter(v => v.tip === 'NBO_29' && v.activa).length === 2);
const SAPT = TEXT.replace(/01\.08\.2026 - 31\.08\.2026/g, '03.08.2026 - 09.08.2026').replace(/Period: 8/g, 'Week: 32')
  .replace('1.777,0 0,63 lei', '1.777,0 0,65 lei');
const r6 = imp(S5, { fisier: '2.9_Memo_Cluj_S32.pdf', parsat: parsatDin29(parseRaport29(SAPT)), acum: ACUM(11) });
const S6 = r6.stareNoua;
t('săptămâna 32 se activează cu fereastra ei (SAPTAMANA) și nu scoate luna din vigoare', r6.rezultat.stare === 'ACTIVAT' && S6.materiale29!.some(m => m.fereastra?.granularitate === 'SAPTAMANA' && m.fereastra.de === '2026-08-03') && S6.versiuniImport!.filter(v => v.tip === 'NBO_29' && v.activa).length === 3, r6.rezultat.erori.join(' | '));
t('rândurile lunare rămân alături de cele săptămânale (nu se însumează, nu se șterg)', S6.materiale29!.filter(m => m.fereastra?.granularitate === 'LUNA' && m.perioada === '2026-08').length === 13 && S6.materiale29!.filter(m => m.fereastra?.granularitate === 'SAPTAMANA').length === 13);
t('prețul săptămânii câștigă în fereastra ei (05.08 → 0,65), luna rămâne la 1 august (0,63)', pretLa(pret(S6, 'CHED'), '2026-08-05') === 0.65 && pretLa(pret(S6, 'CHED'), '2026-08-01') === 0.63 && pretLa(pret(S6, 'CHED'), '2026-08-20') === 0.65);
const r7 = imp(S6, { fisier: '2.9_Memo_Cluj.pdf', parsat: parsatDin29(parseRaport29(TEXT.replace('1.777,0 0,63 lei', '1.777,0 0,64 lei'))), acum: ACUM(12) });
t('reimportul corectat al lunii înlocuiește doar intrarea lunii (0,63 → 0,64); săptămâna rămâne 0,65', pretLa(pret(r7.stareNoua, 'CHED'), '2026-08-01') === 0.64 && pretLa(pret(r7.stareNoua, 'CHED'), '2026-08-05') === 0.65 && pret(r7.stareNoua, 'CHED').preturi.filter(p => p.validDeLa === '2026-08-01').length === 1, `${r7.rezultat.stare} ${pret(r7.stareNoua, 'CHED').preturi.map(p => `${p.validDeLa}:${p.pret}`).join(',')}`);
const ALT = TEXT.replace(/FRYDAY CLUJ MEMO/g, 'FRYDAY IASI PALAS').replace('1.777,0 0,63 lei', '1.777,0 0,61 lei');
const S8b: AppState = { ...S3, locatii: [...S3.locatii, { cod: 'L02', nume: 'FRYDAY IASI PALAS' }] };
const r8 = imp(S8b, { fisier: '2.9_Iasi.pdf', parsat: parsatDin29(parseRaport29(ALT)), acum: ACUM(13) });
t('2.9 al altui restaurant pe aceeași fereastră: prețul e înlocuit (un singur preț pe ingredient) — și SPUS', pretLa(pret(r8.stareNoua, 'CHED'), '2026-08-15') === 0.61 && r8.rezultat.avertismente.some(a => /un singur preț pe ingredient/.test(a) && /CHED \(L01 → L02\)/.test(a)), r8.rezultat.avertismente.filter(a => /singur preț/.test(a)).join(' | '));

// ————————————————————————————————— 6. D4 pe motorul pur
console.log('\n— 6. preturiDin29: regulile D4, pe motorul pur —');
const mat = (material: string, denumire: string, cost: number | undefined, um: string | undefined, cant: number | null, lei: number, extra: Partial<Material29> = {}): Material29 =>
  ({ perioada: '2026-08', locatie: 'L01', material, denumire, categorie: 'Food', cant, um: null, costActual: lei, costTeoretic: null,
    ...(cost !== undefined ? { costPeUnitate: cost } : {}), ...(um ? { umInventar: um } : {}), sursa: { fisier: 'x.pdf', rand: 4 }, ...extra });
const ING6 = [ing('A', 'A', 'kg', 10), ing('B', 'B', 'buc', 1), ing('C', 'C', 'l', 3)];
const d6 = preturiDin29(ING6, [
  mat('A', 'A', 0.02, 'Gram', 1000, 21),           // eligibil: 20 lei/kg; consum 21/1000 = 0,021 vs 0,02 → 5 % nu e > 5 %
  mat('B', 'B', 0, 'EA', 10, 0),                   // zero
  mat('C', 'C', 3, 'KG', 1, 3),                    // KG pe ingredient în litri
  mat('Z', 'Necunoscut', 5, 'EA', 1, 5),           // nemapat
  mat('A', 'A', 0.03, 'Gram', 1, 1),               // al doilea rând al aceluiași ingredient: se păstrează primul
  mat('B', 'B', undefined, 'EA', 1, 1),            // fără Cost per Unit
  mat('C', 'C', 2, 'Liter', 100, 250),             // eligibil 2 lei/l; consum 250/100 = 2,5 → 25 % → avertisment
  mat('C', 'C', 2, 'cutie', 1, 30),                // UM necunoscută
]);
t('un singur cost pe ingredient, în UM-ul lui: A = 20 lei/kg, C = 2 lei/l', d6.costuri.length === 2 && d6.costuri.find(c => c.cod === 'A')?.costPeUnitate === 20 && d6.costuri.find(c => c.cod === 'C')?.costPeUnitate === 2, JSON.stringify(d6.costuri));
t('costurile poartă validDeLa (începutul ferestrei), perioada, rândul, restaurantul', d6.costuri.every(c => c.validDeLa === '2026-08-01' && c.perioada === '2026-08' && c.rand === 4 && c.restaurant === 'L01'));
t('diagnosticul numără fiecare fel', d6.numar.ELIGIBIL === 3 && d6.numar.ZERO_SAU_NEGATIV === 1 && d6.numar.UM_INCOMPATIBILA === 1 && d6.numar.NEMAPAT === 1 && d6.numar.FARA_COST === 1 && d6.numar.UM_NECUNOSCUTA === 1, JSON.stringify(d6.numar));
t('abaterea de exact 5 % nu e avertisment; 25 % este — și prețul rămâne Cost per Unit', d6.consistenta.length === 1 && /C \(C\)/.test(d6.consistenta[0]) && /25%/.test(d6.consistenta[0]) && d6.costuri.find(c => c.cod === 'C')?.costPeUnitate === 2, d6.consistenta.join(' | '));
t('al doilea rând al aceluiași ingredient e eligibil, dar explicat ca nescris', d6.diagnostice.filter(d => d.ingredient === 'A' && d.fel === 'ELIGIBIL').length === 2 && d6.diagnostice.some(d => d.ingredient === 'A' && /păstrează primul/.test(d.motiv ?? '')));
t('fiecare diagnostic spune de ce, în cuvinte', d6.diagnostice.filter(d => d.fel !== 'ELIGIBIL').every(d => (d.motiv ?? '').length > 20));

// ————————————————————————————————— 7. fără perioadă în antet: nimic presupus
console.log('\n— 7. Un raport fără perioadă în antet nu primește o fereastră presupusă —');
const FARA = TEXT.split('\n').filter(l => !/^\d{2}\.\d{2}\.\d{4} - /.test(l)).join('\n');
const rf = parseRaport29(FARA);
const pf = parsatDin29(rf);
t('adaptorul semnalează lipsa perioadei, Parsat-ul nu are fereastră și nici lună', rf.de === null && rf.avertismente.some(a => /nu declară perioada/.test(a)) && pf.fereastra === undefined && pf.randuri[0].Perioada === undefined && !pf.antete.includes('Perioada'));
const rf1 = imp(BAZA, { fisier: '2.9 fara perioada.pdf', parsat: pf, acum: ACUM(14) });
t('fără „valabil de la", importul nu are ce perioadă să folosească: nu se activează', rf1.rezultat.stare !== 'ACTIVAT' && !rf1.stareNoua.materiale29?.length, rf1.rezultat.stare);
const rf2 = imp(BAZA, { fisier: '2.9 fara perioada.pdf', parsat: pf, acum: ACUM(14), dataValabil: '2026-08-01' });
t('cu „valabil de la" declarat de om, intră ca raport lunar al lunii declarate, fără interval de versiune', rf2.rezultat.stare === 'ACTIVAT' && rf2.stareNoua.materiale29!.every(m => m.perioada === '2026-08' && m.fereastra?.granularitate === 'LUNA') && !rf2.stareNoua.versiuniImport!.find(v => v.tip === 'NBO_29')!.intervalDe, rf2.rezultat.erori.join(' | '));

// ————————————————————————————————— 8. constatările panelului adversarial
console.log('\n— 8. Constatările panelului: ID-uri scurte, linii necitite, antete rupte, celule negative rupte, identitatea ferestrei —');
// (a) Item ID de 2 cifre (real: „Sos Truffle Mayo BIB 75 Liter", „Manusi Grill 80 Each") nu e înghițit în denumirea precedentă
const SCURT = [...ANTET, 'Food 11%', 'Food 11%',
  'Sos Samurai BIB 4067 Liter 1,0 0,0 0,0 0,0 0,5 40,00 lei 20,00 lei 10,0 0,5 0,5 0,0 20 lei 20 lei 0 lei 0,00% 0,00% 0,00%',
  'Sos Truffle Mayo BIB 75 Liter 0,0 0,0 0,0 0,0 0,0 43,09 lei 0,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'ACCUSHAKER 2 G 702382 EA 0,0 0,0 0,0 0,0 0,0 445,00 lei 0,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Capac Inox Galeata 10 L 702420 EA 1,0 0,0 0,0 0,0 1,0 50,00 lei 50,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Total: Food 11% 70,00 lei 20 lei 20 lei 0 lei 0,00% 0,00% 0,00%', 'Totals: Sales: 1.000,00 lei 70,00 lei 20 lei 20 lei 0 lei 2,00% 2,00% 0,00%'].join('\n');
const rs = parseRaport29(SCURT);
t('(a) ID-urile de 2 cifre dau rânduri proprii; perechile false din denumire („2 G", „10 L") nu câștigă', rs.randuri.length === 4 && rs.randuri.map(x => x.itemId).join() === '4067,75,702382,702420' && rs.randuri[0].item === 'Sos Samurai BIB' && rs.randuri[2].item === 'ACCUSHAKER 2 G' && rs.randuri[3].item === 'Capac Inox Galeata 10 L', rs.randuri.map(x => `${x.itemId}:${x.item}`).join(' | '));
t('(a) și nicio denumire nu conține cifre de grilă', !rs.randuri.some(x => /lei|%/.test(x.item)) && rs.verificari.every(v => v.ok));
// (b) o linie cu forma grilei, dar cu unitate necunoscută, e raportată ca necitită — nu devine denumire, nici antet
const NECUNOSCUT = [...ANTET, 'Food 11%', 'Food 11%',
  'Chifla 7000133 EA 1,0 0,0 0,0 0,0 1,0 2,00 lei 2,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Cutie Pizza 7000500 Case 1,0 0,0 0,0 0,0 1,0 9,00 lei 9,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Sos casei 7000501 KG 1,0 0,0 0,0 0,0 1,0 5,00 lei 5,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Total: Food 11% 16,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%'].join('\n');
const rn = parseRaport29(NECUNOSCUT);
t('(b) unitatea „Case" nu se citește: rândul e în nerecunoscute, cu avertisment; celelalte două rânduri rămân în categoria lor', rn.randuri.length === 2 && rn.nerecunoscute.length === 1 && /Cutie Pizza/.test(rn.nerecunoscute[0].text) && rn.randuri.every(x => x.categorie === 'Food 11%') && rn.randuri[0].item === 'Chifla' && rn.avertismente.some(a => /nu s-au putut citi/.test(a)), `${rn.randuri.map(x => x.item).join('|')} nerec=${rn.nerecunoscute.length}`);
t('(b) fără linia „Totals:" raportul o spune', rn.totalGeneral === null && rn.avertismente.some(a => /Totals/.test(a)));
// (c) părinte la capătul paginii, subgrup pe pagina următoare: părintele nu se pierde
const RUPT_PAG = [...ANTET, 'Paper', SUBSOL(1), ...ANTET, 'ACCESORII',
  'Cos cartofi 7000600 EA 1,0 0,0 0,0 0,0 1,0 3,00 lei 3,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Total: ACCESORII 3,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%', 'Paper',
  'Capac 7000601 EA 1,0 0,0 0,0 0,0 1,0 1,00 lei 1,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%',
  'Total: Paper 4,00 lei 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%', 'ACCESORII',
  'Sita 7000602 EA 1,0 0,0 0,0 0,0 1,0 2,00 lei 2,00 lei 0 0,0 0,0 0,0 0 lei 0 lei 0 lei 0,00% 0,00% 0,00%'].join('\n');
const rp2 = parseRaport29(RUPT_PAG);
t('(c) „Paper" + cadrul paginii + „ACCESORII" → subgrup al lui Paper; „ACCESORII" retipărit singur își amintește părintele', rp2.randuri.length === 3 && rp2.randuri[0].grup === 'Paper' && rp2.randuri[0].categorie === 'ACCESORII' && rp2.randuri[1].grup === null && rp2.randuri[1].categorie === 'Paper' && rp2.randuri[2].grup === 'Paper' && rp2.randuri[2].categorie === 'ACCESORII', rp2.randuri.map(x => `${x.grup}/${x.categorie}`).join(' '));
// (d) celulă negativă ruptă ÎNAINTEA virgulei: „(1.316" + „,0)" → −1316, nu +1316
const NEG = [...ANTET, 'Food 11%', 'Food 11%',
  'BURGER VITA 7000268 EA 2.582,0 18.810,0 76,0 7.068,0 5.327,0 3,58 lei 19.049,35 lei 7,2 23.057,0 24.373,0 (1.316 82.574 lei 87.287 lei (4.713 lei) 12,22% 12,92% (0,70%)',
  ',0)',
  'Total: Food 11% 19.049,35 lei 82.574 lei 87.287 lei (4.713 lei) 12,22% 12,92% (0,70%)'].join('\n');
const rneg = parseRaport29(NEG);
t('(d) paranteza deschisă fără închidere e celulă ruptă: varianța = −1.316, denumirea rămâne curată', rneg.randuri.length === 1 && rneg.randuri[0].consumUnitati.varianta === -1316 && rneg.randuri[0].item === 'BURGER VITA' && rneg.nerecunoscute.length === 0, JSON.stringify(rneg.randuri[0]?.consumUnitati) + ' ' + rneg.randuri[0]?.item);
// (e) raportul real de referință: identitatea actual − teoretic = varianță pe fiecare rând al fixturii
t('(e) identitate pe fiecare rând: Usage Actual − Theory = Variance (unități și lei)', R.randuri.every(x => aprox(x.consumUnitati.actual - x.consumUnitati.teoretic, x.consumUnitati.varianta) && Math.abs(x.consumLei.actual - x.consumLei.teoretic - x.consumLei.varianta) <= 1));

console.log('\n— 9. Constatările panelului: „identic" nu șterge identitatea ferestrei; retro-umplerea nu e preț în vigoare —');
const W33 = TEXT.replace(/01\.08\.2026 - 31\.08\.2026/g, '10.08.2026 - 16.08.2026').replace(/Period: 8/g, 'Week: 33').replace('1.777,0 0,63 lei', '1.777,0 0,65 lei');
// (f) S32 = 0,65 și S33 = 0,65: S33 își scrie propria intrare; corectarea lui S32 nu schimbă prețul lui S33
const f1 = imp(S3, { fisier: 'S32.pdf', parsat: parsatDin29(parseRaport29(SAPT)), acum: ACUM(20) }).stareNoua;
const f2 = imp(f1, { fisier: 'S33.pdf', parsat: parsatDin29(parseRaport29(W33)), acum: ACUM(21) }).stareNoua;
t('(f) o săptămână cu același preț ca precedenta își scrie totuși intrarea (fereastra are identitate)', pret(f2, 'CHED').preturi.some(p => p.validDeLa === '2026-08-10' && p.pret === 0.65 && p.sursa?.fereastraLa === '2026-08-16'), pret(f2, 'CHED').preturi.map(p => `${p.validDeLa}:${p.pret}`).join(','));
const f3 = imp(f2, { fisier: 'S32.pdf', parsat: parsatDin29(parseRaport29(SAPT.replace('1.777,0 0,65 lei', '1.777,0 0,60 lei'))), acum: ACUM(22) }).stareNoua;
t('(f) S32 corectată la 0,60 nu schimbă prețul lui S33 (12 aug rămâne 0,65)', pretLa(pret(f3, 'CHED'), '2026-08-05') === 0.6 && pretLa(pret(f3, 'CHED'), '2026-08-12') === 0.65, `${pretLa(pret(f3, 'CHED'), '2026-08-05')} ${pretLa(pret(f3, 'CHED'), '2026-08-12')}`);
t('(f) dar prețul identic cu o REFERINȚĂ (lista) tot nu creează intrare: Burger 3,58 rămâne cu o singură intrare', pret(f3, '7000268').preturi.length === 1);
// (g) fără preț în vigoare la data raportului: retro-umplerea unui preț viitor nu e „identic"
const gS: AppState = { ...BAZA, ingrediente: BAZA.ingrediente.map(i => i.cod === 'CHED' ? { ...i, preturi: [] } : i) };
const g1 = imp(gS, { fisier: 'sept.pdf', parsat: parsatDin29(parseRaport29(SEPT.replace('1.777,0 0,70 lei', '1.777,0 0,63 lei'))), acum: ACUM(23) }).stareNoua;
const g2 = imp(g1, { fisier: 'aug.pdf', parsat: P, acum: ACUM(24) }).stareNoua;
t('(g) septembrie 0,63 apoi august 0,63: august primește intrarea lui (nu e „identic" cu retro-umplerea)', pret(g2, 'CHED').preturi.map(p => p.validDeLa).join() === '2026-08-01,2026-09-01', pret(g2, 'CHED').preturi.map(p => `${p.validDeLa}:${p.pret}`).join(','));
const g3 = imp(g2, { fisier: 'sept.pdf', parsat: parsatDin29(parseRaport29(SEPT)), acum: ACUM(25) }).stareNoua;
t('(g) corecția lui septembrie (0,70) nu schimbă costul lui august', pretLa(pret(g3, 'CHED'), '2026-08-20') === 0.63 && pretLa(pret(g3, 'CHED'), '2026-09-15') === 0.7);
const g4S: AppState = { ...BAZA, ingrediente: BAZA.ingrediente.map(i => i.cod === 'CHED' ? { ...i, preturi: [{ validDeLa: '2026-09-01', pret: 0.63 }] } : i) };
const g4 = imp(g4S, { fisier: 'aug.pdf', parsat: P, acum: ACUM(32) }).stareNoua;
t('(g) o listă de prețuri VIITOARE (1 sept, 0,63) nu e „preț în vigoare" în august: 2.9 august își scrie intrarea', pret(g4, 'CHED').preturi.map(p => p.validDeLa).join() === '2026-08-01,2026-09-01', pret(g4, 'CHED').preturi.map(p => `${p.validDeLa}:${p.pret}`).join(','));
// (h) luna și săptămâna care încep în aceeași zi (iunie 2026 începe luni) sunt intrări diferite; săptămâna câștigă în ziua comună
const IUN = TEXT.replace(/01\.08\.2026 - 31\.08\.2026/g, '01.06.2026 - 30.06.2026').replace(/Period: 8/g, 'Period: 6');
const W23 = TEXT.replace(/01\.08\.2026 - 31\.08\.2026/g, '01.06.2026 - 07.06.2026').replace(/Period: 8/g, 'Week: 23').replace('1.777,0 0,63 lei', '1.777,0 0,65 lei');
const hS: AppState = { ...BAZA, ingrediente: BAZA.ingrediente.map(i => i.cod === 'CHED' ? { ...i, preturi: [{ validDeLa: '2026-05-01', pret: 0.6 }] } : i) };
const h1 = imp(hS, { fisier: 'iunie.pdf', parsat: parsatDin29(parseRaport29(IUN)), acum: ACUM(26) }).stareNoua;
const h2 = imp(h1, { fisier: 'W23.pdf', parsat: parsatDin29(parseRaport29(W23)), acum: ACUM(27) }).stareNoua;
t('(h) luna (0,63) și săptămâna (0,65) de la 1 iunie coexistă ca intrări; săptămâna câștigă pe 3 iunie', pret(h2, 'CHED').preturi.filter(p => p.validDeLa === '2026-06-01').length === 2 && pretLa(pret(h2, 'CHED'), '2026-06-03') === 0.65, pret(h2, 'CHED').preturi.map(p => `${p.validDeLa}:${p.pret}:${p.sursa?.fereastraLa ?? '-'}`).join(','));
const h3 = imp(h2, { fisier: 'iunie.pdf', parsat: parsatDin29(parseRaport29(IUN.replace('1.777,0 0,63 lei', '1.777,0 0,64 lei'))), acum: ACUM(28) }).stareNoua;
t('(h) luna corectată (0,64) își înlocuiește doar propria intrare; săptămâna rămâne 0,65', pret(h3, 'CHED').preturi.filter(p => p.validDeLa === '2026-06-01').map(p => p.pret).sort().join() === '0.64,0.65' && pretLa(pret(h3, 'CHED'), '2026-06-03') === 0.65);
// (i) fișier xlsx 2.9 cu două luni: fiecare lună primește prețul ei
const XL = { foaie: 'S', antete: ['Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Categorie', 'Cantitate', 'UM', 'Cost actual', 'Cost per unit'],
  randuri: [
    { Perioada: '2026-07', Locatie: 'L01', 'Cod material': '7000123', 'Denumire material': 'Branza cheddar felii 2026', Categorie: 'Food', Cantitate: 100, UM: 'EA', 'Cost actual': 63, 'Cost per unit': 0.63 },
    { Perioada: '2026-08', Locatie: 'L01', 'Cod material': '7000123', 'Denumire material': 'Branza cheddar felii 2026', Categorie: 'Food', Cantitate: 100, UM: 'EA', 'Cost actual': 70, 'Cost per unit': 0.7 },
  ] };
const i1 = imp(BAZA, { fisier: '2.9 doua luni.xlsx', parsat: XL, acum: ACUM(29) });
t('(i) două luni în același fișier → două prețuri datate (iulie 0,63, august 0,70)', i1.rezultat.stare === 'ACTIVAT' && pretLa(pret(i1.stareNoua, 'CHED'), '2026-07-15') === 0.63 && pretLa(pret(i1.stareNoua, 'CHED'), '2026-08-15') === 0.7, `${i1.rezultat.stare} ${pret(i1.stareNoua, 'CHED').preturi.map(p => `${p.validDeLa}:${p.pret}`).join(',')} ${i1.rezultat.erori.join('|')}`);
// (j) același fișier redeclarat pe altă fereastră: prețurile versiunii înlocuite pleacă odată cu rândurile ei
const j1 = imp(BAZA, { fisier: '2.9 luna.xlsx', parsat: { ...XL, randuri: [XL.randuri[1]] }, acum: ACUM(30), interval: { de: '2026-08-01', la: '2026-08-31' } }).stareNoua;
const j2r = imp(j1, { fisier: '2.9 luna.xlsx', parsat: { ...XL, randuri: [XL.randuri[1]] }, acum: ACUM(31), interval: { de: '2026-08-03', la: '2026-08-09' } });
const j2 = j2r.stareNoua;
t('(j) versiunea redeclarată își retrage prețul (08-01) și scrie prețul noii ferestre (08-03)', j2r.rezultat.stare === 'ACTIVAT' && pret(j2, 'CHED').preturi.map(p => p.validDeLa).join() === '2026-07-01,2026-08-03' && j2r.rezultat.avertismente.some(a => /retrase din nomenclator/.test(a)), `${j2r.rezultat.stare} ${pret(j2, 'CHED').preturi.map(p => `${p.validDeLa}:${p.pret}`).join(',')}`);
// (k) consistența ține cont de rotunjirea unităților (0,1) și a leilor (1): 23 lei ÷ 0,4 L față de 65,21 nu e inconsistență
const k = preturiDin29([ing('MON', 'Monin', 'l', 60)], [mat('MON', 'Monin', 65.21, 'Liter', 0.4, 23)]);
t('(k) 23 lei pe 0,4 L (rotunjit) față de 65,21 lei/L nu dă avertisment', k.consistenta.length === 0 && k.costuri[0]?.costPeUnitate === 65.21, k.consistenta.join(' | '));
const k2 = preturiDin29([ing('MON', 'Monin', 'l', 60)], [mat('MON', 'Monin', 65.21, 'Liter', 40, 2300)]);
t('(k) … dar 2.300 lei pe 40 L (57,5) față de 65,21 dă', k2.consistenta.length === 1);
// (l) Cost per Unit sub 0,10 lei: precizie limitată, semnalată
t('(l) Sare 0,05 lei/Each e semnalată ca preț cu precizie limitată, dar tot se scrie', r3.rezultat.avertismente.some(a => /precizie limitată/.test(a) && /Sare FRYDAY 2G/.test(a)) && pretLa(pret(S3, '2002'), '2026-08-15') === 0.05);

console.log('\n— 10. Ajustările de inventar se păstrează exact cum sunt tipărite (PR #23, A) —');
const adjDe = (id: string) => R.randuri.find(x => x.itemId === id)!.ajustari;
t('Inv Adj citit pe rând: Branza 126, Burger 76, Chifla 175; Salata, Sare, Pepsi 0', adjDe('7000123') === 126 && adjDe('7000268') === 76 && adjDe('7000133') === 175
  && adjDe('7000143') === 0 && adjDe('2002') === 0 && adjDe('702044') === 0);
t('Parsat-ul poartă coloana „Ajustare inventar" cu valoarea tipărită', P.antete.includes('Ajustare inventar') && P.randuri.find(r => r['Cod material'] === '7000123')!['Ajustare inventar'] === 126);
t('identitatea Beg + Pur + Trans − Adj − End = Usage se închide pe toate rândurile fixturii', verificaIdentitate29(R).exacte === R.randuri.length, `${verificaIdentitate29(R).exacte}/${R.randuri.length}`);
t('Pepsi: transferul −600 e semnat și intră în Usage (1.788 + 396 − 600 − 926 = 658)', R.randuri.find(x => x.itemId === '702044')!.transferuri === -600 && R.randuri.find(x => x.itemId === '702044')!.consumUnitati.actual === 658);
const S10 = importa('FC29_MATERIAL', P, '2.9_Memo_Cluj.pdf', { ...stareGoala(), locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }] }).stateNou;
t('Material29.ajustari: 126 la Branza, 0 la Salata (tipărit), niciodată absent când coloana există',
  S10.materiale29!.find(m => m.material === '7000123')!.ajustari === 126 && S10.materiale29!.find(m => m.material === '7000143')!.ajustari === 0 && S10.materiale29!.every(m => m.ajustari !== undefined));
t('Σ Adj × CPU pe fixtură = 126 × 0,63 + 76 × 3,58 + 175 × 2,35 = 762,71', aprox(verificaIdentitate29(R).ajustari.leiEstimatPozitiv, 762.71, 1e-9));
t('FC cu ajustări estimat pe raport: (149.490 + 762,71) ÷ 675.735,58 = 22,24 %, față de 22,12 % raportat',
  aprox(verificaIdentitate29(R).fcCuAjustariEstimatPct!, ((149490 + 762.71) / 675735.58) * 100, 1e-9) && verificaIdentitate29(R).fcRaportatPct === 22.12);

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
