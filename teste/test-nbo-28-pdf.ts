// PR #23 — adaptorul raportului NBO 2.8 „Spoilage and Loss" în formatul lui real (PDF de listă).
//
// Contract:
//   · citește antetul (restaurant, an fiscal, perioadă, fereastră), grupurile, totalurile;
//   · fiecare eveniment: Description, ItemID, Reason, By, UM, Qty, Cost/Unit, Extension, rândul sursă;
//   · formele reale de tipărire: „lei" mutat pe rândul următor și lipit de numele următor, linie
//     singură „lei", continuări de nume („72", „70G", „crocanta"), „lei" în totalul de grup;
//   · Extension = Qty × Cost/Unit se verifică (toleranța rotunjirii), grupurile pe total;
//   · rândurile fără dată își iau fereastra din antet; ce nu se citește rămâne raportat.
import { esteRaport28, parseRaport28, parsatDin28, descrie28, ANTETE_28 } from '../src/lib/nbo-28';
import { importa, detecteazaTip } from '../src/lib/importer';
import { detecteazaSursa, importaPrinCentru, semnalDinNume, type CerereImport } from '../src/lib/import-center';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

// fixtură: rânduri REALE din 2.8 Cluj 08.2026, în formele lor de tipărire
const CADRU = [
  'FRYDAY CLUJ MEMO Fiscal Year: 2026',
  '2.8 Spoilage and Loss',
  'Period: 8',
  '01.08.2026 - 31.08.2026',
  'Inventory Qty. Cost/',
  'Description ItemID Reason By Units Lost Unit Extension',
];
const SUBSOL = (p: number) => `V 21.1.126.0 - 15 - 02.09.2026 22:45 Copyright © NCR Corporation 2022 ${p} of 2`;
const P1 = [
  ...CADRU,
  'DESERT*',
  'TIRAMISU CU FISTIC new 910015 Dropped alina.nasaudean EA 3,00 9,55 lei 28,64 lei',
  'Tort ciocolata zmeura new 7000159 End of Day alina.nasaudean EA 1,00 0,00 lei 0,00 lei',
  'Tort pufos capsuni new 910008 Dropped alina.nasaudean EA 2,00 7,89 lei 15,78 lei',
  'Total: DESERT* 44,42 lei',
  'Food 11%',
  'CHIFLA CARTOF 3.5inch 53G x 7000133 Dropped chitu.stefan EA 17,00 2,35 lei 40,02 lei',
  '72',
  'CHIFLA CARTOF 3.5inch 53G x 7000133 End of Day alina.nasaudean EA 5,00 2,35 lei 11,77 lei',
  '72',
  'Sausage Patty 702458 End of Day tirnovianu.vasile Each 2,00 2,47 lei 4,94 lei',
  'Sos Cheddar BIB 4064 End of Day alina.nasaudean KG 0,26 45,07 11,72 lei',
  'Sos Cheddar BIB lei',
  '4064 End of Day alina.nasaudean KG 0,25 45,07 11,27 lei',
  'Sos Cheddar BIB lei',
  '4064 End of Day chetan.vivien KG 0,15 45,07 6,76 lei',
  'lei',
  SUBSOL(1),
];
const P2 = [
  ...CADRU,
  'Sos Cheddar BIB 4064 End of Day alina.nasaudean KG 0,35 45,07 lei 15,78 lei',
  'Total: Food 11% lei 102,26 lei',
  'Food 21%',
  'PLACINTA MAR CARAMEL. 7000166 End of Day alina.nasaudean EA 8,00 1,58 lei 12,61 lei',
  '70G',
  'TIRAMISU FISTIC 1.2 KG 7000131 End of Day alina.nasaudean EA 2,00 9,28 lei 18,55 lei',
  'Total: Food 21% 31,16 lei',
  'FRYCafe 21%',
  'Prajitura de vanilie cu bezea 702179 End of Day alina.nasaudean EA 2,00 5,14 lei 10,28 lei',
  'crocanta',
  'Total: FRYCafe 21% 10,28 lei',
  'Grand Total: 188,12 lei',
  SUBSOL(2),
];
const TEXT = [...P1, ...P2].join('\n');

console.log('— 1. Adaptorul citește raportul 2.8 —');
t('recunoaște raportul după titlu', esteRaport28(TEXT) && !esteRaport28('2.9 Food Cost - Inventory With Adjustments Summary'));
const R = parseRaport28(TEXT);
t('antet: restaurant, an fiscal, perioadă, fereastră', R.restaurant === 'FRYDAY CLUJ MEMO' && R.anFiscal === '2026' && R.perioadaEticheta === 'Period: 8' && R.de === '2026-08-01' && R.la === '2026-08-31');
t('13 evenimente citite, niciunul nerecunoscut', R.randuri.length === 13 && R.nerecunoscute.length === 0, `${R.randuri.length} / ${R.nerecunoscute.map(x => x.text).join(' | ')}`);
const de = (id: string) => R.randuri.filter(x => x.itemId === id);
t('rând obișnuit: nume, ItemID, motiv cu spații, utilizator, UM, cantitate, cost, extension',
  de('910015')[0].item === 'TIRAMISU CU FISTIC new' && de('910015')[0].motiv === 'Dropped' && de('910015')[0].utilizator === 'alina.nasaudean'
  && de('910015')[0].um === 'EA' && de('910015')[0].cant === 3 && de('910015')[0].costUnitar === 9.55 && de('910015')[0].lei === 28.64
  && de('7000159')[0].motiv === 'End of Day' && de('7000159')[0].costUnitar === 0);
t('continuarea de nume „72" se lipește la CHIFLA CARTOF (de două ori)', de('7000133').every(x => x.item === 'CHIFLA CARTOF 3.5inch 53G x 72'));
t('„70G" și „crocanta" se lipesc la numele lor', de('7000166')[0].item === 'PLACINTA MAR CARAMEL. 70G' && de('702179')[0].item === 'Prajitura de vanilie cu bezea crocanta');
t('rândul cu „lei" mutat: costul 45,07 se citește fără „lei", extension 11,72', de('4064')[0].costUnitar === 45.07 && de('4064')[0].lei === 11.72 && de('4064')[0].item === 'Sos Cheddar BIB');
t('„Sos Cheddar BIB lei" + „4064 End of Day …" → un singur eveniment cu numele întreg', de('4064').length === 4 && de('4064').every(x => x.item === 'Sos Cheddar BIB') && de('4064')[1].cant === 0.25 && de('4064')[2].utilizator === 'chetan.vivien');
t('linia singură „lei" nu produce nimic', !R.randuri.some(x => x.item.includes('lei')) && R.nerecunoscute.length === 0);
t('rândul de pe pagina 2 cu „lei" la locul lui se citește la fel', de('4064')[3].cant === 0.35 && de('4064')[3].lei === 15.78);
t('grupul e cel de deasupra, exact cum e tipărit', de('4064').every(x => x.categorie === 'Food 11%') && de('702179')[0].categorie === 'FRYCafe 21%' && de('910015')[0].categorie === 'DESERT*');
t('rândul sursă e linia din text', de('910015')[0].rand === 8 && de('4064')[1].rand === 20);
t('„Total: Food 11% lei 102,26 lei" se citește cu „lei"-ul rătăcit', R.totaluri.find(x => x.categorie === 'Food 11%')!.lei === 102.26);
t('grupurile se verifică pe total: 4/4', R.verificari.length === 4 && R.verificari.every(v => v.ok), R.verificari.map(v => `${v.categorie} ${v.calculat} vs ${v.declarat}`).join('; '));
t('Grand Total citit, Σ rânduri = 188,12', R.totalGeneral === 188.12 && aprox(R.randuri.reduce((s, x) => s + x.lei, 0), 188.12, 1e-6));
t('Extension = Qty × Cost/Unit: 2 × 9,28 = 18,56 față de 18,55 tipărit e în toleranța costului nerotunjit', R.extensiiNeinchise.length === 0);
const RUPT = parseRaport28(TEXT.replace('EA 3,00 9,55 lei 28,64 lei', 'EA 3,00 9,55 lei 38,64 lei'));
t('o extension care nu se închide e listată și devine avertisment', RUPT.extensiiNeinchise.length === 1 && RUPT.extensiiNeinchise[0].itemId === '910015' && RUPT.avertismente.some(a => a.includes('Extension')));
t('…și totalul grupului nu mai bate', !RUPT.verificari.find(v => v.categorie === 'DESERT*')!.ok);
const NECITIT = parseRaport28(TEXT.replace('Sausage Patty 702458 End of Day tirnovianu.vasile Each 2,00 2,47 lei 4,94 lei', 'Sausage Patty 702458 End of Day tirnovianu.vasile Each 2,00 lei'));
t('un rând de material necitibil rămâne raportat, nu dispare', NECITIT.nerecunoscute.length === 1 && NECITIT.avertismente.some(a => a.includes('nu s-au putut citi')));
const FARA = parseRaport28(TEXT.replace(/01\.08\.2026 - 31\.08\.2026\n/g, ''));
t('fără perioadă în antet: fereastra rămâne nedeclarată, cu avertisment', FARA.de === null && FARA.avertismente.some(a => a.includes('nu declară perioada')));
t('descrierea spune evenimentele, lei-ii 2.8, motivele și verificarea', descrie28(R).includes('13 evenimente') && descrie28(R).includes('Dropped') && descrie28(R).includes('4/4 grupuri'), descrie28(R));

console.log('\n— 2. Parsat-ul 2.8: coloanele importatorului, fereastra din antet —');
const P = parsatDin28(R);
t('antetele sunt cele declarate', P.antete.join('|') === ANTETE_28.join('|'));
t('fereastra vine din antetul raportului', P.fereastra?.de === '2026-08-01' && P.fereastra?.la === '2026-08-31');
const r0 = P.randuri.find(r => r['Cod material'] === '910015')!;
t('rândul poartă tot ce s-a dovedit pe raport', r0.Perioada === '2026-08' && r0.Locatie === 'FRYDAY CLUJ MEMO' && r0['Denumire material'] === 'TIRAMISU CU FISTIC new'
  && r0['Grup raport'] === 'DESERT*' && r0.Motiv === 'Dropped' && r0.Utilizator === 'alina.nasaudean' && r0.Cantitate === 3 && r0.UM === 'EA' && r0['Cost unitar'] === 9.55 && r0.Valoare === 28.64 && r0['Rand sursa'] === 8);
t('fără perioadă: coloana Perioada lipsește, nu se inventează', !parsatDin28(FARA).antete.includes('Perioada') && parsatDin28(FARA).fereastra === undefined);

console.log('\n— 3. Importul: evenimente cu proveniență, fără statut, coada comună —');
const BAZA: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }],
  ingrediente: [
    { cod: 'SOS-CHEDDAR', denumire: 'Sos Cheddar BIB', categorie: 'SOSURI', tip: 'FOOD', um: 'kg', preturi: [{ validDeLa: '2026-07-01', pret: 44 }], activ: true, aliasuri: ['4064'] },
    { cod: 'SAUSAGE', denumire: 'Sausage Patty', categorie: 'CARNE', tip: 'FOOD', um: 'buc', preturi: [{ validDeLa: '2026-07-01', pret: 2.48 }], activ: true, aliasuri: ['702458'] },
  ],
};
t('detecția internă după nume + structură: WASTE_28', detecteazaTip(P.antete, '2.8_Memo_Cluj.pdf') === 'WASTE_28');
t('fără semnalul „2.8" din nume, structura nu concurează singură (nu e presupus 2.8)', detecteazaTip(P.antete, 'lista.xlsx') !== 'WASTE_28');
const imp = importa('WASTE_28', P, '2.8_Memo_Cluj.pdf', BAZA);
const ev = imp.stateNou.evenimente28 ?? [];
t('13 evenimente în stare, cu restaurantul rezolvat la cod, fereastra raportului și rândul sursă',
  ev.length === 13 && ev.every(e => e.locatie === 'L01' && e.fereastra.de === '2026-08-01' && e.fereastra.la === '2026-08-31' && e.sursa?.fisier === '2.8_Memo_Cluj.pdf' && typeof e.rand === 'number'));
const ch = ev.filter(e => e.cod === '4064');
t('Sos Cheddar: 4 evenimente, cantitatea, UM, Cost/Unit și Extension exact cum sunt tipărite', ch.length === 4 && ch[0].cant === 0.26 && ch[0].um === 'KG' && ch[0].costUnitar === 45.07 && ch[0].lei === 11.72 && ch[0].motiv === 'End of Day' && ch[0].utilizator === 'alina.nasaudean' && ch[0].grup === 'Food 11%');
t('niciun eveniment nu are statut față de Usage (nu există câmp de includere)', ev.every(e => !('includere' in e)));
t('materialele fără ingredient intră în coada comună cu sursa NBO_28 (DESERT*, chifla, placinta, tiramisu, prajitura)',
  imp.stateNou.nemapate.filter(n => n.sursa === 'NBO_28').length === 7 && imp.stateNou.nemapate.some(n => n.denumire === '910015' && n.categorie === 'TIRAMISU CU FISTIC new' && n.cant === 3 && aprox(n.valoare, 28.64)));
t('raportul importului spune că nu se însumează cu ajustările 2.9 și că statutul vine din declarații', imp.batch.avertismente.some(a => a.includes('Nu se însumează cu ajustările 2.9') && a.includes('declarații')));
const imp2 = importa('WASTE_28', P, '2.8_Memo_Cluj.pdf', imp.stateNou);
t('reimportul aceleiași ferestre × restaurant înlocuiește, nu adaugă', (imp2.stateNou.evenimente28 ?? []).length === 13);
const iulie = parsatDin28(parseRaport28(TEXT.replace(/01\.08\.2026 - 31\.08\.2026/g, '01.07.2026 - 31.07.2026').replace('Period: 8', 'Period: 7')));
const imp3 = importa('WASTE_28', iulie, '2.8_iulie.pdf', imp.stateNou);
t('altă fereastră coexistă: iulie + august = 26 evenimente', (imp3.stateNou.evenimente28 ?? []).length === 26);

console.log('\n— 4. Import Center: sursa NBO_28, versiune cu fereastra raportului, reimport duplicat —');
t('semnalul din nume: „2.8" bate filtrul de familie waste/pierderi', semnalDinNume('2.8_Memo_Cluj.pdf') === 'NBO_28' && semnalDinNume('2.8 pierderi Cluj.pdf') === 'NBO_28' && semnalDinNume('waste august.xlsx') === null);
const det = detecteazaSursa(P.antete, '2.8_Memo_Cluj.pdf');
t('detecția canonică: NBO_28 sigur (nume + structură)', det.tip === 'NBO_28' && det.stare === 'SIGUR', det.motiv);
const detNume = detecteazaSursa(P.antete, 'pierderi_cluj.pdf');
t('un fișier cu nume de „pierderi" dar cu structura completă 2.8 nu mai e refuzat de filtrul de familie: cere confirmare cu NBO_28 primul candidat',
  detNume.stare === 'NECESITA_CONFIRMARE' && detNume.candidati[0]?.tip === 'NBO_28' && !detNume.motiv.includes('nu le importă'), `${detNume.stare}: ${detNume.motiv}`);
const ACUM = (h: number) => `2026-09-05T${String(h).padStart(2, '0')}:00:00.000Z`;
const cerere = (fisier: string, parsat = P, acum = ACUM(10)): CerereImport => ({ fisier, parsat, acum, tip: 'NBO_28', interval: parsat.fereastra ? { de: parsat.fereastra.de, la: parsat.fereastra.la } : undefined });
const c1 = importaPrinCentru(BAZA, cerere('2.8_Memo_Cluj.pdf'));
t('importul prin centru se activează ca versiune NBO_28', c1.rezultat.activat && c1.rezultat.versiune === 'NBO_28#1', c1.rezultat.erori.join(' | '));
const v1 = (c1.stareNoua.versiuniImport ?? []).find(v => v.tip === 'NBO_28')!;
t('versiunea poartă fereastra raportului și restaurantul rezolvat', v1.intervalDe === '2026-08-01' && v1.intervalLa === '2026-08-31' && v1.scop === 'RESTAURANT' && v1.restaurante.join() === 'L01');
t('evenimentele poartă amprenta versiunii', (c1.stareNoua.evenimente28 ?? []).every(e => e.sursa?.amprenta === v1.amprenta));
const c2 = importaPrinCentru(c1.stareNoua, cerere('2.8_Memo_Cluj.pdf', P, ACUM(11)));
t('reimportul identic e duplicat exact, fără versiune nouă', !c2.rezultat.activat && c2.rezultat.duplicat === 'DUPLICAT_EXACT');
const c3 = importaPrinCentru(c1.stareNoua, cerere('2.8_iulie.pdf', iulie, ACUM(12)));
t('iulie devine versiune separată, ambele active (ferestre diferite)', c3.rezultat.activat && (c3.stareNoua.versiuniImport ?? []).filter(v => v.tip === 'NBO_28' && v.activa).length === 2);
const corectat = parsatDin28(parseRaport28(TEXT.replace('EA 3,00 9,55 lei 28,64 lei', 'EA 4,00 9,55 lei 38,19 lei').replace('Total: DESERT* 44,42 lei', 'Total: DESERT* 53,97 lei').replace('Grand Total: 188,12 lei', 'Grand Total: 197,67 lei')));
const c4 = importaPrinCentru(c3.stareNoua, cerere('2.8_Memo_Cluj.pdf', corectat, ACUM(13)));
t('același fișier corectat pe aceeași fereastră înlocuiește versiunea veche (REIMPORT_ACTUALIZAT), fără dublare',
  c4.rezultat.activat && (c4.stareNoua.versiuniImport ?? []).filter(v => v.tip === 'NBO_28' && v.activa).length === 2
  && (c4.stareNoua.evenimente28 ?? []).filter(e => e.fereastra.de === '2026-08-01').length === 13
  && (c4.stareNoua.evenimente28 ?? []).find(e => e.cod === '910015' && e.fereastra.de === '2026-08-01')!.cant === 4, c4.rezultat.duplicat ?? '');

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
process.exit(fail ? 1 : 0);
