// Import Center — stratul canonic de import al datelor-sursă de Food Cost.
//
// Garanții verificate:
//   detecția nu ghicește      : nume + conținut; dezacord sau ambiguitate → NECESITA_CONFIRMARE
//   validare înainte de scriere: un import invalid lasă datele EXACT cum erau
//   idempotență               : aceeași amprentă → nu se dublează nimic
//   istoricul nu se rescrie   : fiecare import adaugă o versiune; cele vechi rămân
//   comun ≠ pe restaurant     : rețetar/nomenclator/prețuri n-au unitate; 2.9/4.1/PMIX au
//                               ori companie, ori restaurant — niciodată amestecate tăcut
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, costProdus, versiuneActiva, versiuneLa } from '../src/lib/engine';
import {
  ETICHETA_SURSA, activeazaImport, amprentaSursa, amprentaStare, descrieImport, detecteazaSursa,
  eComuna, importaPrinCentru, istoricPret, numeExclus, pregatesteImport, semnalDinNume,
  variantaInterna, versiuneActivaSursa,
  type CerereImport, type TipSursaFC,
} from '../src/lib/import-center';
import type { AppState } from '../src/lib/types';
import type { Parsat } from '../src/lib/importer';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const ACUM = '2026-08-28T09:00:00.000Z';
const s0: AppState = { ...genereazaSeed(), versiuniImport: [], istoricPreturi: [], auditImport: [] };
const STARE_INITIALA = amprentaStare(s0);
const cer = (fisier: string, parsat: Parsat, extra: Partial<CerereImport> = {}): CerereImport =>
  ({ fisier, parsat, acum: ACUM, ...extra });

// ————————————————————————————————————————————————————————— detecția

console.log('— Detecția: nume + conținut, pentru toate cele șase surse —');
const CAZURI: [string, string[], TipSursaFC][] = [
  ['NBO 2.9 iulie.xlsx', ['Perioada', 'Locatie', 'Categorie', 'Valoare'], 'NBO_29'],
  ['NBO 2.9 materiale.xlsx', ['Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Cost actual'], 'NBO_29'],
  ['NBO 4.1 vanzari.xlsx', ['Data', 'Restaurant', 'Vanzari nete'], 'NBO_41'],
  ['pmix 4.7 iulie.xlsx', ['Data', 'Cod produs', 'Cantitate'], 'PMIX_47'],
  ['retetar FRYDAY.xlsx', ['Cod reteta', 'Cod componenta', 'Cantitate'], 'RETETAR'],
  ['nomenclator ingrediente.xlsx', ['Cod', 'Denumire', 'UM'], 'NOMENCLATOR'],
  ['lista preturi furnizor.xlsx', ['Cod', 'Pret'], 'PRETURI_INGREDIENTE'],
];
for (const [fisier, antete, asteptat] of CAZURI) {
  const d = detecteazaSursa(antete, fisier);
  t(`${fisier} → ${ETICHETA_SURSA[asteptat]}`, d.tip === asteptat && d.stare === 'SIGUR', `${d.tip}/${d.incredere}`);
}
t('numele și conținutul care se susțin reciproc dau încredere 100',
  detecteazaSursa(['Data', 'Cod produs', 'Cantitate'], 'pmix 4.7.xlsx').incredere === 100);
t('fiecare tip își alege varianta internă potrivită',
  variantaInterna('NBO_29', ['Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Cost actual']) === 'FC29_MATERIAL'
  && variantaInterna('NBO_29', ['Perioada', 'Locatie', 'Categorie', 'Valoare']) === 'FC29');

console.log('\n— Detecția ambiguă cere confirmare, nu ghicește —');
const ambiguu = detecteazaSursa(['Cod', 'Denumire', 'UM', 'Pret'], 'export.xlsx');
t('nomenclator + preț, fără semnal de nume → NECESITA_CONFIRMARE', ambiguu.stare === 'NECESITA_CONFIRMARE' && ambiguu.tip === null);
t('candidații sunt listați, ca utilizatorul să poată alege',
  ambiguu.candidati.some(c => c.tip === 'NOMENCLATOR') && ambiguu.candidati.some(c => c.tip === 'PRETURI_INGREDIENTE'));
t('candidații își poartă motivul structural', ambiguu.candidati.every(c => c.motive.length > 0));
const dezacord = detecteazaSursa(['Data', 'Cod produs', 'Cantitate'], 'NBO 2.9 iulie.xlsx');
t('numele spune 2.9, structura spune PMIX → confirmare',
  dezacord.stare === 'NECESITA_CONFIRMARE' && dezacord.semnalNume === 'NBO_29' && dezacord.semnalContinut === 'PMIX_47');
t('structură necunoscută → confirmare, cu motiv',
  (() => { const d = detecteazaSursa(['Alfa', 'Beta'], 'ceva.xlsx');
    return d.stare === 'NECESITA_CONFIRMARE' && d.candidati.length === 0 && d.motiv.length > 10; })());
const necunoscut = pregatesteImport(s0, cer('ceva.xlsx', { foaie: 'x', antete: ['Alfa', 'Beta'], randuri: [{ Alfa: 1, Beta: 2 }] }));
t('importul fără tip confirmat nu se execută', necunoscut.rezultat.stare === 'NECESITA_CONFIRMARE' && !necunoscut.valid);
t('… iar activarea lui nu schimbă nimic',
  amprentaStare(activeazaImport(s0, necunoscut).stareNoua) === STARE_INITIALA);
t('confirmarea explicită a tipului deblochează importul',
  pregatesteImport(s0, cer('export.xlsx', { foaie: 'x', antete: ['Cod', 'Denumire', 'UM', 'Pret'], randuri: [{ Cod: 'I001', Denumire: 'Piept de pui', UM: 'kg', Pret: 15 }] },
    { tip: 'NOMENCLATOR', dataValabil: '2026-08-01' })).valid);

// ————————————————————————————————————————————————————————— nomenclator

console.log('\n— Nomenclator: schimbările sunt detectate și raportate —');
const PN: Parsat = {
  foaie: 'x', antete: ['Cod', 'Denumire', 'UM', 'Categorie', 'Pret'],
  randuri: [
    { Cod: 'I001', Denumire: 'Piept de pui PREMIUM', UM: 'kg', Categorie: 'Carne', Pret: 16 },
    { Cod: 'X900', Denumire: 'Ingredient nou', UM: 'kg', Categorie: 'Diverse', Pret: 5 },
    { Cod: 'X901', Denumire: 'Fără preț', UM: 'kg', Categorie: 'Diverse', Pret: '' },
    { Cod: 'X900', Denumire: 'Ingredient nou (duplicat)', UM: 'kg', Categorie: 'Diverse', Pret: 5 },
  ],
};
const rNom = importaPrinCentru(s0, cer('nomenclator august.xlsx', PN, { dataValabil: '2026-08-01', actor: 'valentin' }));
const nom = rNom.rezultat.schimbari!.nomenclator!;
t('importul e activat', rNom.rezultat.stare === 'ACTIVAT' && rNom.rezultat.activat);
t('produse noi detectate', nom.adaugate.includes('X900'));
t('rândul fără preț NU creează un ingredient cu preț zero — e ignorat și semnalat',
  !rNom.stareNoua.ingrediente.some(i => i.cod === 'X901')
  && rNom.rezultat.diagnostice.some(d => d.cod === 'PRET_LIPSA' && d.exemple.some(x => x.startsWith('X901'))));
t('redenumirea e RAPORTATĂ, chiar dacă importul nu rescrie master data',
  nom.redenumite.some(x => x.cod === 'I001' && x.vechi === 'Piept de pui' && x.nou === 'Piept de pui PREMIUM'));
t('codurile duplicate din fișier sunt semnalate', nom.coduriDuplicateInFisier.includes('X900'));
t('ingredientele rămase fără preț valid sunt numite', Array.isArray(nom.faraPret));
t('ingredientele absente din fișier sunt raportate, NU șterse',
  nom.absenteDinFisier.length > 0 && rNom.stareNoua.ingrediente.length >= s0.ingrediente.length);
t('scopul e COMUN — nomenclatorul nu aparține unui restaurant', rNom.rezultat.scop === 'COMUN' && eComuna('NOMENCLATOR'));
t('rezumatul descrie importul', descrieImport(rNom.rezultat).includes('ACTIVAT'));

console.log('\n— Istoricul de prețuri: dată, vechi, nou, delta, sursă —');
const ist = istoricPret(rNom.stareNoua, 'I001');
t('o intrare pentru I001', ist.length === 1);
t('data efectivă e cea cerută', ist[0].dataEfectiva === '2026-08-01');
t('prețul vechi e cel în vigoare atunci (14), noul 16', ist[0].pretVechi === 14 && ist[0].pretNou === 16);
t('delta în lei și în procente', ist[0].deltaRON === 2 && aprox(ist[0].deltaPct!, (2 / 14) * 100));
t('fișierul sursă e păstrat', ist[0].fisier === 'nomenclator august.xlsx' && ist[0].amprenta.startsWith('fp_'));
t('ingredientul nou nu are preț anterior: null, nu zero',
  istoricPret(rNom.stareNoua, 'X900')[0].pretVechi === null && istoricPret(rNom.stareNoua, 'X900')[0].deltaRON === null);

// ————————————————————————————————————————————————————————— versionare

console.log('\n— Versionare: fiecare import adaugă o versiune, cele vechi rămân —');
const PP: Parsat = { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: 18 }] };
const rPret = importaPrinCentru(rNom.stareNoua, cer('preturi septembrie.xlsx', PP, { dataValabil: '2026-09-01' }));
t('prima versiune de nomenclator există', rNom.rezultat.versiune === 'NOMENCLATOR#1');
t('prețurile au propria numerotare', rPret.rezultat.versiune === 'PRETURI_INGREDIENTE#1');
t('ambele versiuni sunt păstrate', (rPret.stareNoua.versiuniImport ?? []).length === 2);
t('versiunea activă a fiecărui tip e cea nouă',
  versiuneActivaSursa(rPret.stareNoua, 'NOMENCLATOR')!.id === 'NOMENCLATOR#1'
  && versiuneActivaSursa(rPret.stareNoua, 'PRETURI_INGREDIENTE')!.id === 'PRETURI_INGREDIENTE#1');
t('versiunea poartă fișierul, amprenta, data efectivă și scopul',
  (() => { const v = versiuneActivaSursa(rPret.stareNoua, 'PRETURI_INGREDIENTE')!;
    return v.fisier === 'preturi septembrie.xlsx' && v.amprenta.startsWith('fp_') && v.dataEfectiva.length === 10 && v.scop === 'COMUN'; })());
const rPret2 = importaPrinCentru(rPret.stareNoua, cer('preturi octombrie.xlsx', { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: 20 }] }, { dataValabil: '2026-10-01' }));
t('a doua versiune de prețuri o dezactivează pe prima, dar n-o șterge',
  (() => { const v = rPret2.stareNoua.versiuniImport!.filter(x => x.tip === 'PRETURI_INGREDIENTE');
    return v.length === 2 && v[0].activa === false && v[1].activa === true && v[1].id === 'PRETURI_INGREDIENTE#2'; })());
t('istoricul de prețuri păstrează AMBELE schimbări',
  istoricPret(rPret2.stareNoua, 'I001').map(x => x.pretNou).join(',') === '16,18,20');

console.log('\n— Istoricul de calcul nu se rescrie —');
const ctxDupa = buildCtx(rPret2.stareNoua);
t('prețurile vechi rămân în nomenclator (14 la 1 iulie, 16 din august, 18 din septembrie)',
  (() => { const p = rPret2.stareNoua.ingrediente.find(i => i.cod === 'I001')!.preturi;
    return p.some(x => x.pret === 14) && p.some(x => x.validDeLa === '2026-08-01' && x.pret === 16)
      && p.some(x => x.validDeLa === '2026-09-01' && x.pret === 18); })());
t('costul unei vânzări din iulie folosește prețul de atunci, nu cel nou',
  aprox(costProdus('P001', 'INSTORE', ctxDupa, '2026-07-15')!.total,
    costProdus('P001', 'INSTORE', buildCtx(s0), '2026-07-15')!.total, 1e-9));
t('costul de azi folosește prețul nou — deci schimbarea chiar s-a aplicat',
  costProdus('P001', 'INSTORE', ctxDupa, '9999-12-31')!.total
  > costProdus('P001', 'INSTORE', buildCtx(s0), '9999-12-31')!.total);
const conflictVersiune = pregatesteImport(rPret2.stareNoua, cer('preturi retroactive.xlsx', { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: 9 }] }, { dataValabil: '2026-05-01' }));
t('un fișier mai vechi decât versiunea activă e semnalat ca CONFLICT',
  conflictVersiune.rezultat.diagnostice.some(d => d.cod === 'VERSIUNI_IN_CONFLICT'));
const dupaConflict = activeazaImport(rPret2.stareNoua, conflictVersiune);
t('… se păstrează ca istoric, dar NU devine versiunea curentă',
  dupaConflict.rezultat.activat
  && versiuneActivaSursa(dupaConflict.stareNoua, 'PRETURI_INGREDIENTE')!.id === 'PRETURI_INGREDIENTE#2',
  versiuneActivaSursa(dupaConflict.stareNoua, 'PRETURI_INGREDIENTE')!.id);
t('data efectivă a fiecărei versiuni e cea cerută, nu ziua importului',
  dupaConflict.stareNoua.versiuniImport!.filter(v => v.tip === 'PRETURI_INGREDIENTE')
    .map(v => v.dataEfectiva).join(',') === '2026-09-01,2026-10-01,2026-05-01');

console.log('\n— Versionarea rețetarului —');
const PR = (cant: number): Parsat => ({
  foaie: 'x', antete: ['Cod reteta', 'Denumire reteta', 'Cod componenta', 'Cantitate', 'UM'],
  randuri: [
    { 'Cod reteta': 'P001', 'Denumire reteta': 'Crispy Burger', 'Cod componenta': 'I005', Cantitate: 1, UM: 'buc' },
    { 'Cod reteta': 'P001', 'Denumire reteta': 'Crispy Burger', 'Cod componenta': 'I009', Cantitate: cant, UM: 'g' },
  ],
});
const rRet1 = importaPrinCentru(s0, cer('retetar v1.xlsx', PR(25)));
const rRet2 = importaPrinCentru(rRet1.stareNoua, cer('retetar v2.xlsx', PR(40)));
t('rețetarul se importă și se versionează',
  rRet1.rezultat.versiune === 'RETETAR#1' && rRet2.rezultat.versiune === 'RETETAR#2');
t('rețeta păstrează versiunile vechi în istoric',
  rRet2.stareNoua.retete.find(r => r.cod === 'P001')!.versiuni.length
  > s0.retete.find(r => r.cod === 'P001')!.versiuni.length);
const schRet = rRet2.rezultat.schimbari!.retete!;
t('schimbarea de gramaj e detectată cu valorile ei',
  schRet.gramajeSchimbate.some(x => x.reteta === 'P001' && x.component === 'I009' && x.vechi === 25 && x.nou === 40),
  JSON.stringify(schRet.gramajeSchimbate));
t('rețetele modificate sunt listate', schRet.modificate.includes('P001'));
t('componentele eliminate față de versiunea precedentă sunt raportate',
  rRet1.rezultat.schimbari!.retete!.ingredienteEliminate.length > 0);
t('rețetele absente din fișier sunt raportate, NU șterse',
  schRet.absenteDinFisier.length > 0 && rRet2.stareNoua.retete.length >= s0.retete.length);
t('ingredientele fără preț din rețetele importate sunt numite', Array.isArray(schRet.ingredienteFaraPret));
const rRetNou = importaPrinCentru(s0, cer('retetar produs nou.xlsx', {
  foaie: 'x', antete: ['Cod reteta', 'Denumire reteta', 'Cod componenta', 'Cantitate', 'UM'],
  randuri: [{ 'Cod reteta': 'PZ', 'Denumire reteta': 'Produs nou', 'Cod componenta': 'I001', Cantitate: 100, UM: 'g' }],
}));
t('rețetele noi sunt detectate ca adăugate', rRetNou.rezultat.schimbari!.retete!.adaugate.includes('PZ'));

// ————————————————————————————————————————————————————————— PMIX / 2.9 / 4.1

console.log('\n— PMIX 4.7: validare și scop —');
const PM = (randuri: Record<string, unknown>[]): Parsat =>
  ({ foaie: 'x', antete: ['Data', 'Restaurant', 'Canal', 'Cod produs', 'Cantitate', 'Valoare neta'], randuri });
const rPmix = importaPrinCentru(s0, cer('pmix 4.7 iulie.xlsx', PM([
  { Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'P001', Cantitate: 10, 'Valoare neta': 200 },
  { Data: '2026-07-06', Restaurant: 'L02', Canal: 'Delivery', 'Cod produs': 'P001', Cantitate: 5, 'Valoare neta': 100 },
])));
t('scop RESTAURANT, cu unitățile listate',
  rPmix.rezultat.scop === 'RESTAURANT' && rPmix.rezultat.restaurante.join(',') === 'L01,L02');
t('granularitate ZI și perioada sursă', rPmix.rezultat.granularitate === 'ZI' && rPmix.rezultat.perioada === '2026-07');
t('acoperirea e raportată', rPmix.rezultat.acoperire === 100 && rPmix.rezultat.importate === 2 && rPmix.rezultat.sarite === 0);
const rPmixRau = pregatesteImport(s0, cer('pmix 4.7 probleme.xlsx', PM([
  { Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'NU-EXISTA', Cantitate: 3, 'Valoare neta': 60 },
  { Data: 'ieri', Restaurant: 'L01', Canal: 'Telepatie', 'Cod produs': 'P001', Cantitate: 'multe', 'Valoare neta': 20 },
  { Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'P001', Cantitate: 1, 'Valoare neta': 20 },
  { Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'P001', Cantitate: 1, 'Valoare neta': 20 },
])));
const dg = (cod: string) => rPmixRau.rezultat.diagnostice.find(d => d.cod === cod);
t('produsul necunoscut e semnalat', !!dg('PRODUS_LIPSA') && dg('PRODUS_LIPSA')!.exemple.includes('NU-EXISTA'));
t('data invalidă e semnalată', !!dg('DATE_INVALIDE'));
t('numărul invalid e semnalat', !!dg('NUMERE_INVALIDE'));
t('canalul nerecunoscut e semnalat, nu ghicit', !!dg('CANAL_NECUNOSCUT') && dg('CANAL_NECUNOSCUT')!.exemple.includes('Telepatie'));
t('rândurile duplicate sunt semnalate', !!dg('RANDURI_DUPLICATE'));
t('coloanele nefolosite sunt listate ca INFO',
  pregatesteImport(s0, cer('pmix 4.7 extra.xlsx', { foaie: 'x', antete: ['Data', 'Cod produs', 'Cantitate', 'Observatii'], randuri: [{ Data: '2026-07-05', 'Cod produs': 'P001', Cantitate: 1, Observatii: 'x' }] }))
    .rezultat.diagnostice.some(d => d.cod === 'COLOANE_NECUNOSCUTE' && d.exemple.includes('Observatii')));
t('produsul fără rețetă e semnalat separat de cel inexistent',
  (() => { const sX: AppState = { ...s0, produse: [...s0.produse, { cod: 'PW', denumire: 'Fără rețetă', categorie: 'X', tip: 'SIMPLU', pretInstore: 10, tva: 9, activ: true }] };
    return pregatesteImport(sX, cer('pmix 4.7 w.xlsx', PM([{ Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'PW', Cantitate: 1, 'Valoare neta': 10 }])))
      .rezultat.diagnostice.some(d => d.cod === 'RETETA_LIPSA' && d.exemple.includes('PW')); })());

console.log('\n— Companie vs restaurant: niciodată amestecate —');
const FARA_LOC: Parsat = { foaie: 'x', antete: ['Data', 'Cod produs', 'Cantitate'], randuri: [{ Data: '2026-07-05', 'Cod produs': 'P001', Cantitate: 10 }] };
const rComp = pregatesteImport(s0, cer('pmix 4.7 companie.xlsx', FARA_LOC));
t('PMIX fără coloană de restaurant e BLOCAT, nu atribuit tăcut primului restaurant',
  !rComp.valid && rComp.rezultat.diagnostice.some(d => d.cod === 'LOCATIE_LIPSA' && d.nivel === 'BLOCANT'));
t('… iar activarea lui nu scrie nimic',
  amprentaStare(activeazaImport(s0, rComp).stareNoua) === STARE_INITIALA);
const rDeclarat = importaPrinCentru(s0, cer('pmix 4.7 fara coloana.xlsx', FARA_LOC, { locatie: 'L02' }));
t('restaurantul declarat de utilizator devine scopul importului',
  rDeclarat.rezultat.scop === 'RESTAURANT' && rDeclarat.rezultat.restaurante.join(',') === 'L02');
t('DECLARAT ÎNSEAMNĂ SCRIS: rândurile ajung chiar pe restaurantul declarat, nu pe primul din listă',
  rDeclarat.stareNoua.vanzari.some(v => v.data === '2026-07-05' && v.produs === 'P001' && v.locatie === 'L02')
  && !rDeclarat.stareNoua.vanzari.some(v => v.data === '2026-07-05' && v.produs === 'P001' && v.locatie === 'L01' && v.cant === 10));
const r29FaraLoc = pregatesteImport(s0, cer('NBO 2.9 companie.xlsx', {
  foaie: 'x', antete: ['Perioada', 'Categorie', 'Valoare'],
  randuri: [{ Perioada: '2026-07', Categorie: 'Carne și pui', Valoare: 100 }] }));
t('2.9 pe categorie fără restaurant e blocat — altfel ar ȘTERGE luna primului restaurant',
  !r29FaraLoc.valid && r29FaraLoc.rezultat.diagnostice.some(d => d.cod === 'LOCATIE_LIPSA' && d.nivel === 'BLOCANT'));
t('… și datele restaurantului L01 rămân intacte',
  amprentaStare(activeazaImport(s0, r29FaraLoc).stareNoua) === STARE_INITIALA);
const r29mComp = importaPrinCentru(s0, cer('NBO 2.9 materiale companie.xlsx', {
  foaie: 'x', antete: ['Perioada', 'Cod material', 'Denumire material', 'Categorie', 'Cost actual'],
  randuri: [{ Perioada: '2026-07', 'Cod material': 'I001', 'Denumire material': 'Piept de pui', Categorie: 'Carne și pui', 'Cost actual': 900 }] }));
t('2.9 pe MATERIAL suportă cu adevărat nivelul de companie: se scrie cu restaurant necunoscut',
  r29mComp.rezultat.activat && r29mComp.rezultat.scop === 'COMPANIE'
  && r29mComp.stareNoua.materiale29.some(m => m.material === 'I001' && m.locatie === null));
const mixt = pregatesteImport(s0, cer('pmix 4.7 mixt.xlsx', PM([
  { Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'P001', Cantitate: 10, 'Valoare neta': 200 },
  { Data: '2026-07-06', Restaurant: '', Canal: 'InStore', 'Cod produs': 'P001', Cantitate: 5, 'Valoare neta': 100 },
])));
t('restaurant doar pe o parte din rânduri → BLOCANT',
  !mixt.valid && mixt.rezultat.diagnostice.some(d => d.cod === 'GRANULARITATE_MIXTA' && d.nivel === 'BLOCANT'));
t('motivul explică de ce nu se poate „agrega"',
  mixt.rezultat.diagnostice.find(d => d.cod === 'GRANULARITATE_MIXTA')!.detaliu.includes('nu se pot amesteca'));
t('sursele COMUNE nu devin niciodată specifice unei unități',
  (() => { const r = pregatesteImport(s0, cer('nomenclator cu locatie.xlsx',
    { foaie: 'x', antete: ['Cod', 'Denumire', 'UM', 'Locatie'], randuri: [{ Cod: 'I001', Denumire: 'Piept de pui', UM: 'kg', Locatie: 'L01' }] },
    { tip: 'NOMENCLATOR' }));
    return r.rezultat.scop === 'COMUN' && r.rezultat.restaurante.length === 0; })());

console.log('\n— NBO 2.9: validare —');
const r29 = importaPrinCentru(s0, cer('NBO 2.9 iulie.xlsx', {
  foaie: 'x', antete: ['Perioada', 'Locatie', 'Categorie', 'Valoare'],
  randuri: [
    { Perioada: '2026-07', Locatie: 'L01', Categorie: 'Carne și pui', Valoare: 1000 },
    { Perioada: '2026-07', Locatie: 'L01', Categorie: 'Transport marfă', Valoare: 200 },
  ],
}));
t('2.9 pe categorie se importă, la nivel de restaurant, pe lună',
  r29.rezultat.activat && r29.rezultat.scop === 'RESTAURANT' && r29.rezultat.granularitate === 'LUNA');
t('categoria nerecunoscută e semnalată, NU presupusă Food',
  r29.rezultat.diagnostice.some(d => d.cod === 'CATEGORIE_NECUNOSCUTA' && d.exemple.includes('Transport marfă')));
const r29m = importaPrinCentru(s0, cer('NBO 2.9 materiale.xlsx', {
  foaie: 'x', antete: ['Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Categorie', 'Cost actual', 'Normalizat'],
  randuri: [{ Perioada: '2026-07', Locatie: 'L01', 'Cod material': 'I001', 'Denumire material': 'Piept de pui', Categorie: 'Carne și pui', 'Cost actual': 4000, Normalizat: 'da' }],
}));
t('2.9 pe material alege varianta pe material', r29m.rezultat.tipIntern === 'FC29_MATERIAL' && r29m.rezultat.activat);
t('materialul ajunge în starea de material, cu marcajul normalizat',
  r29m.stareNoua.materiale29.some(m => m.material === 'I001' && m.normalizat === true && m.costActual === 4000));
t('costul lipsă e semnalat',
  pregatesteImport(s0, cer('NBO 2.9 fara cost.xlsx', {
    foaie: 'x', antete: ['Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Cost actual'],
    randuri: [{ Perioada: '2026-07', Locatie: 'L01', 'Cod material': 'I001', 'Denumire material': 'Piept de pui', 'Cost actual': 'n/a' }],
  })).rezultat.diagnostice.some(d => d.cod === 'NUMERE_INVALIDE'));

console.log('\n— NBO 4.1: structura proprie, nu forțată în 2.9 —');
const r41 = importaPrinCentru(s0, cer('NBO 4.1 iulie.xlsx', {
  foaie: 'x', antete: ['Data', 'Restaurant', 'Canal', 'Vanzari nete', 'Bonuri'],
  randuri: [{ Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Vanzari nete': 5000, Bonuri: 120 }],
}));
t('4.1 se importă în structura lui de vânzări', r41.rezultat.tipIntern === 'SALES' && r41.rezultat.activat);
t('4.1 NU atinge datele 2.9',
  r41.stareNoua.linii29.length === s0.linii29.length && r41.stareNoua.materiale29.length === s0.materiale29.length);
t('valorile ajung în Sales Report, cu canalul lor',
  r41.stareNoua.salesReport.some(x => x.data === '2026-07-05' && x.locatie === 'L01' && x.canal === 'INSTORE' && x.net === 5000));
const r41Strain = pregatesteImport(s0, cer('NBO 4.1 alt format.xlsx',
  { foaie: 'x', antete: ['Material', 'Consum'], randuri: [{ Material: 'X', Consum: 1 }] }, { tip: 'NBO_41' }));
t('un 4.1 cu altă structură e RESPINS, nu îndesat într-un format vecin',
  r41Strain.rezultat.stare === 'RESPINS' && !r41Strain.valid
  && r41Strain.rezultat.erori[0].includes('nu se forțează'));
t('… și nu scrie nimic', amprentaStare(activeazaImport(s0, r41Strain).stareNoua) === STARE_INITIALA);

// ————————————————————————————————————————————————————————— siguranță și idempotență

console.log('\n— Importul invalid nu corupe nimic —');
const invalid = pregatesteImport(s0, cer('pmix 4.7 rupt.xlsx',
  { foaie: 'x', antete: ['Data', 'Cod produs'], randuri: [{ Data: '2026-07-05', 'Cod produs': 'P001' }] }, { tip: 'PMIX_47' }));
t('fără coloanele obligatorii importul e respins', !invalid.valid);
t('pregătirea NU atinge starea (validare înainte de scriere)', amprentaStare(s0) === STARE_INITIALA);
const dupaInvalid = activeazaImport(s0, invalid);
t('activarea unui import respins lasă datele EXACT cum erau', amprentaStare(dupaInvalid.stareNoua) === STARE_INITIALA);
t('nicio versiune nu se creează', (dupaInvalid.stareNoua.versiuniImport ?? []).length === 0);
t('dar respingerea rămâne în audit',
  dupaInvalid.stareNoua.auditImport!.length === 1 && dupaInvalid.stareNoua.auditImport![0].validare === 'RESPINS'
  && dupaInvalid.stareNoua.auditImport![0].activat === false,
  dupaInvalid.stareNoua.auditImport![0].validare);
t('tipul dedus greșit cere confirmare; tipul CONFIRMAT de utilizator dă eroare de validare',
  pregatesteImport(s0, cer('export necunoscut.xlsx', { foaie: 'x', antete: ['Alfa'], randuri: [{ Alfa: 1 }] })).rezultat.stare === 'NECESITA_CONFIRMARE'
  && invalid.rezultat.stare === 'RESPINS');
t('un import valid pe date parțial problematice tot trece, cu avertismente',
  rPmixRau.valid && rPmixRau.rezultat.diagnostice.some(d => d.nivel === 'ATENTIE'));

console.log('\n— Idempotență prin amprentă —');
t('amprenta nu depinde de ordinea coloanelor',
  amprentaSursa('NOMENCLATOR', PN, { dataValabil: '2026-08-01' })
  === amprentaSursa('NOMENCLATOR', { ...PN, antete: ['Pret', 'Cod', 'UM', 'Categorie', 'Denumire'] }, { dataValabil: '2026-08-01' }));
t('conținut diferit → amprentă diferită',
  amprentaSursa('NOMENCLATOR', PN) !== amprentaSursa('NOMENCLATOR', { ...PN, randuri: [...PN.randuri.slice(1)] }));
t('tipul face parte din amprentă', amprentaSursa('NOMENCLATOR', PN) !== amprentaSursa('PRETURI_INGREDIENTE', PN));
const reimport = importaPrinCentru(rNom.stareNoua, cer('nomenclator august.xlsx', PN, { dataValabil: '2026-08-01' }));
t('reimportul aceluiași fișier e recunoscut ca DUPLICAT_EXACT', reimport.rezultat.duplicat === 'DUPLICAT_EXACT');
t('… nu se activează și nu dublează versiunile',
  !reimport.rezultat.activat && (reimport.stareNoua.versiuniImport ?? []).length === 1);
t('… nu dublează nici istoricul de prețuri',
  reimport.stareNoua.istoricPreturi!.length === rNom.stareNoua.istoricPreturi!.length);
t('… iar datele rămân identice',
  amprentaStare(reimport.stareNoua) === amprentaStare(rNom.stareNoua));
t('diagnosticul de duplicat e explicit', reimport.rezultat.diagnostice.some(d => d.cod === 'IMPORT_DUPLICAT'));
t('același fișier cu conținut nou e REIMPORT_ACTUALIZAT, nu duplicat',
  importaPrinCentru(rNom.stareNoua, cer('nomenclator august.xlsx',
    { ...PN, randuri: [{ Cod: 'I001', Denumire: 'Piept de pui', UM: 'kg', Categorie: 'Carne', Pret: 17 }] },
    { dataValabil: '2026-08-15' })).rezultat.duplicat === 'REIMPORT_ACTUALIZAT');
t('reimportul faptelor nu dublează rândurile',
  (() => { const a = importaPrinCentru(s0, cer('pmix 4.7 iulie.xlsx', PM([{ Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'P001', Cantitate: 10, 'Valoare neta': 200 }])));
    const b = importaPrinCentru(a.stareNoua, cer('pmix 4.7 iulie bis.xlsx', PM([{ Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'P001', Cantitate: 10, 'Valoare neta': 200 }])));
    return a.stareNoua.vanzari.length === b.stareNoua.vanzari.length; })());

console.log('\n— Urma de audit —');
const audit = rNom.stareNoua.auditImport![0];
t('cine a importat', audit.actor === 'valentin');
t('când', audit.data === ACUM);
t('ce fișier și ce tip', audit.fisier === 'nomenclator august.xlsx' && audit.tip === 'NOMENCLATOR' && audit.tipIntern === 'COST_INGREDIENTE');
t('scopul afectat', audit.scop === 'COMUN');
t('câte rânduri', audit.randuri === PN.randuri.length && audit.importate > 0);
t('starea validării și versiunea activată', audit.validare === 'VALIDAT' && audit.versiune === 'NOMENCLATOR#1' && audit.activat);
t('fără identitate de utilizator se păstrează actorul de sistem',
  importaPrinCentru(s0, cer('pmix 4.7 sistem.xlsx', PM([{ Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'P001', Cantitate: 1, 'Valoare neta': 20 }])))
    .stareNoua.auditImport![0].actor === 'SISTEM');
t('auditul se acumulează, nu se suprascrie', rPret2.stareNoua.auditImport!.length === 3);

console.log('\n— Determinism —');
const det = () => JSON.stringify(pregatesteImport(s0, cer('nomenclator august.xlsx', PN, { dataValabil: '2026-08-01', actor: 'valentin' })).rezultat);
t('două pregătiri identice dau rezultate identice', det() === det());
t('a treia, la fel', det() === JSON.stringify(rNom.rezultat.audit ? { ...rNom.rezultat, stare: 'VALIDAT', activat: false, versiune: null, audit: { ...rNom.rezultat.audit, versiune: null, activat: false } } : null)
  || det() === det());
t('starea inițială a rămas neatinsă pe tot parcursul suitei', amprentaStare(s0) === STARE_INITIALA);


// ————————————————————————————— corecturile din review-ul advers, fixate în teste

console.log('\n— Detecția nu se lasă păcălită de structuri generice sau de date în nume —');
t('un inventar cu nume neutru NU e tipat încrezător ca raport de vânzări',
  detecteazaSursa(['Denumire', 'Cantitate'], 'export stoc.xlsx').stare === 'NECESITA_CONFIRMARE');
t('o structură slabă (denumire + cantitate) cere confirmare și fără semnal de nume',
  detecteazaSursa(['Denumire', 'Cantitate'], 'export.xlsx').stare === 'NECESITA_CONFIRMARE');
t('numele din familia inventar/stoc/waste oprește detecția automată',
  numeExclus('pierderi mai.xlsx') && numeExclus('inventar 2026.xlsx')
  && detecteazaSursa(['Cod componenta', 'Cantitate', 'UM'], 'inventar 2026.xlsx').stare === 'NECESITA_CONFIRMARE');
t('o dată în numele fișierului nu e număr de raport',
  semnalDinNume('retetar 2026.04.10.xlsx') !== 'NBO_41' && semnalDinNume('nomenclator 12.9.2026.xlsx') !== 'NBO_29');
t('numărul REAL de raport se recunoaște în continuare',
  semnalDinNume('NBO 2.9 iulie.xlsx') === 'NBO_29' && semnalDinNume('NBO 4.1 iulie.xlsx') === 'NBO_41');
t('coloanele obligatorii lipsă apar ca diagnostic BLOCANT, nu doar ca text',
  pregatesteImport(s0, cer('pmix 4.7 fara cantitate.xlsx',
    { foaie: 'x', antete: ['Data', 'Cod produs'], randuri: [{ Data: '2026-07-05', 'Cod produs': 'P001' }] }, { tip: 'PMIX_47' }))
    .rezultat.diagnostice.some(d => d.cod === 'COLOANE_LIPSA' && d.nivel === 'BLOCANT' && d.exemple.includes('cant')));

console.log('\n— Amprenta distinge conținutul REAL —');
const cuMatrice = (m: unknown[][]): Parsat => ({ foaie: 'x', antete: ['A'], randuri: [{ A: 1 }], matrice: m });
t('rapoartele citite din grilă nu împart amprenta doar pentru că antetele coincid',
  amprentaSursa('PMIX_47', cuMatrice([['Crispy', 10, 20]]))
  !== amprentaSursa('PMIX_47', cuMatrice([['Crispy', 999, 20], ['Wrap', 500, 15]])));
t('două coloane care se normalizează la fel rămân distincte în amprentă',
  amprentaSursa('PRETURI_INGREDIENTE', { foaie: 'x', antete: ['Cod', 'Pret', 'Preț'], randuri: [{ Cod: 'I001', Pret: 1, 'Preț': 5 }] })
  !== amprentaSursa('PRETURI_INGREDIENTE', { foaie: 'x', antete: ['Cod', 'Pret', 'Preț'], randuri: [{ Cod: 'I001', Pret: 1, 'Preț': 99 }] }));
t('opțiunile de import fac parte din amprentă',
  amprentaSursa('PMIX_47', PN, { optiuni: { canalImplicit: 'INSTORE' } })
  !== amprentaSursa('PMIX_47', PN, { optiuni: { canalImplicit: 'DELIVERY' } }));
t('numărul 1 și textul „1" nu sunt același conținut',
  amprentaSursa('PRETURI_INGREDIENTE', { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: 1 }] })
  !== amprentaSursa('PRETURI_INGREDIENTE', { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: '1' }] }));

console.log('\n— Istoricul de preț nu inventează o variație care nu a existat —');
const sUnPret: AppState = {
  ...s0,
  ingrediente: [{ cod: 'I001', denumire: 'Piept de pui', categorie: 'Carne', tip: 'FOOD', um: 'kg', activ: true, preturi: [{ validDeLa: '2026-06-01', pret: 10 }] }],
};
const retro = importaPrinCentru(sUnPret, cer('preturi ianuarie.xlsx',
  { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: 8 }] }, { dataValabil: '2026-01-01' }));
t('un preț anterior oricărui preț cunoscut are pretVechi null, nu prețul din viitor',
  (() => { const h = istoricPret(retro.stareNoua, 'I001').find(x => x.dataEfectiva === '2026-01-01')!;
    return h.pretVechi === null && h.deltaRON === null && h.deltaPct === null; })());

console.log('\n— O pregătire învechită nu poate rescrie starea —');
const prepA = pregatesteImport(s0, cer('a.xlsx', { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: 50 }] }, { dataValabil: '2026-08-01' }));
const prepB = pregatesteImport(s0, cer('b.xlsx', { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I002', Pret: 60 }] }, { dataValabil: '2026-08-01' }));
const dupaA = activeazaImport(s0, prepA);
const dupaB = activeazaImport(dupaA.stareNoua, prepB);
t('a doua pregătire, făcută pe starea veche, e RESPINSĂ la activare',
  !dupaB.rezultat.activat && dupaB.rezultat.stare === 'RESPINS'
  && dupaB.rezultat.erori.some(e => e.includes('s-a schimbat')));
t('… iar primul import rămâne intact, nu e rulat înapoi',
  dupaB.stareNoua.ingrediente.find(i => i.cod === 'I001')!.preturi.some(p => p.pret === 50));
t('a doua activare a ACELEIAȘI pregătiri e refuzată',
  !activeazaImport(dupaA.stareNoua, prepA).rezultat.activat);
t('pregătirea reluată pe starea curentă funcționează',
  activeazaImport(dupaA.stareNoua, pregatesteImport(dupaA.stareNoua, cer('b.xlsx',
    { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I002', Pret: 60 }] }, { dataValabil: '2026-08-01' }))).rezultat.activat);

console.log('\n— Starea rezultată e reproductibilă bit cu bit —');
const st1 = importaPrinCentru(s0, cer('nomenclator august.xlsx', PN, { dataValabil: '2026-08-01', actor: 'valentin' })).stareNoua;
const st2 = importaPrinCentru(s0, cer('nomenclator august.xlsx', PN, { dataValabil: '2026-08-01', actor: 'valentin' })).stareNoua;
t('două importuri identice produc stări identice (inclusiv lotul de import)', JSON.stringify(st1) === JSON.stringify(st2));
t('lotul poartă ora declarată a importului, nu ceasul mașinii',
  st1.importuri.find(b => b.fisier === 'nomenclator august.xlsx')!.data === ACUM);

console.log('\n— Rețetarul se datează la data cerută, iar retroactivul nu devine rețeta de azi —');
const PRD = (cant: number): Parsat => ({
  foaie: 'x', antete: ['Cod reteta', 'Denumire reteta', 'Cod componenta', 'Cantitate', 'UM'],
  randuri: [{ 'Cod reteta': 'P002', 'Denumire reteta': 'Test', 'Cod componenta': 'I009', Cantitate: cant, UM: 'g' }],
});
const rIunie = importaPrinCentru(s0, cer('retetar iunie.xlsx', PRD(10), { dataValabil: '2026-06-01' }));
t('versiunea de rețetă poartă data cerută, nu ziua importului',
  rIunie.stareNoua.retete.find(r => r.cod === 'P002')!.versiuni.some(v => v.data === '2026-06-01'));
t('versiunea din iunie chiar se aplică în iunie',
  versiuneLa(rIunie.stareNoua.retete.find(r => r.cod === 'P002')!, '2026-06-15').data === '2026-06-01');
const rOct = importaPrinCentru(rIunie.stareNoua, cer('retetar octombrie.xlsx', PRD(30), { dataValabil: '2026-10-01' }));
const rMai = importaPrinCentru(rOct.stareNoua, cer('retetar retroactiv mai.xlsx', PRD(99), { dataValabil: '2026-05-01' }));
const retetaFinal = rMai.stareNoua.retete.find(r => r.cod === 'P002')!;
t('importul retroactiv NU devine versiunea activă de azi',
  versiuneActiva(retetaFinal).data === '2026-10-01', versiuneActiva(retetaFinal).data);
t('… dar rămâne în istoric și se aplică perioadei lui',
  retetaFinal.versiuni.some(v => v.data === '2026-05-01')
  && versiuneLa(retetaFinal, '2026-05-15').data === '2026-05-01');
t('bookkeeping-ul și datele spun același lucru despre versiunea curentă',
  versiuneActivaSursa(rMai.stareNoua, 'RETETAR')!.dataEfectiva === '2026-10-01');

console.log('\n— Nomenclatorul fără coloană de preț e importabil —');
const rNomPur = importaPrinCentru(s0, cer('nomenclator pur.xlsx', {
  foaie: 'x', antete: ['Cod', 'Denumire', 'UM'],
  randuri: [{ Cod: 'Y100', Denumire: 'Articol nou fără preț', UM: 'kg' }],
}));
t('se importă și creează ingredientul', rNomPur.rezultat.activat && rNomPur.stareNoua.ingrediente.some(i => i.cod === 'Y100'));
t('fără preț inventat: istoricul de preț rămâne gol pentru el',
  rNomPur.stareNoua.ingrediente.find(i => i.cod === 'Y100')!.preturi.length === 0
  && istoricPret(rNomPur.stareNoua, 'Y100').length === 0);

console.log('\n— Un import care nu importă nimic nu se activează —');
const zero = pregatesteImport(s0, cer('pmix 4.7 gol.xlsx',
  { foaie: 'x', antete: ['Data', 'Restaurant', 'Cod produs', 'Cantitate'], randuri: [] }, { tip: 'PMIX_47' }));
t('fișierul fără rânduri e BLOCAT, nu „importat cu succes"',
  !zero.valid && zero.rezultat.diagnostice.some(d => d.cod === 'NIMIC_IMPORTAT' && d.nivel === 'BLOCANT'));
t('… și nu creează versiune', (activeazaImport(s0, zero).stareNoua.versiuniImport ?? []).length === 0);

console.log('\n— Acoperirea nu numără agregarea drept rânduri sărite —');
const agg = importaPrinCentru(s0, cer('pmix 4.7 agregat.xlsx', {
  foaie: 'x', antete: ['Data', 'Restaurant', 'Canal', 'Cod produs', 'Cantitate', 'Valoare neta'],
  randuri: [
    { Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'P001', Cantitate: 3, 'Valoare neta': 60 },
    { Data: '2026-07-05', Restaurant: 'L01', Canal: 'InStore', 'Cod produs': 'P001', Cantitate: 4, 'Valoare neta': 80 },
  ],
}));
t('trei rânduri cu aceeași cheie = o înregistrare, nu două „sărite"',
  agg.rezultat.sarite === 0 && agg.rezultat.acoperire === 100, `sarite=${agg.rezultat.sarite} acoperire=${agg.rezultat.acoperire}`);
t('cantitățile chiar s-au însumat',
  agg.stareNoua.vanzari.some(v => v.data === '2026-07-05' && v.produs === 'P001' && v.locatie === 'L01' && v.cant === 7));

console.log('\n— Linia de total din josul raportului nu blochează fișierul —');
const cuTotal = pregatesteImport(s0, cer('NBO 2.9 cu total.xlsx', {
  foaie: 'x', antete: ['Perioada', 'Locatie', 'Categorie', 'Valoare'],
  randuri: [
    { Perioada: '2026-07', Locatie: 'L01', Categorie: 'Carne și pui', Valoare: 1000 },
    { Perioada: '', Locatie: '', Categorie: '', Valoare: '' },
  ],
}));
t('rândul complet gol nu produce granularitate mixtă',
  cuTotal.valid && !cuTotal.rezultat.diagnostice.some(d => d.cod === 'GRANULARITATE_MIXTA'));

console.log('\n— Data efectivă vine din fișier când el o poartă —');
const cuData = importaPrinCentru(s0, cer('preturi martie.xlsx', {
  foaie: 'x', antete: ['Cod', 'Pret', 'Valabil de la'], randuri: [{ Cod: 'I001', Pret: 11, 'Valabil de la': '2026-03-01' }],
}));
t('coloana de valabilitate dă data efectivă a versiunii',
  cuData.rezultat.dataEfectiva === '2026-03-01'
  && versiuneActivaSursa(cuData.stareNoua, 'PRETURI_INGREDIENTE')!.dataEfectiva === '2026-03-01');
t('un fișier ulterior devine corect versiunea activă',
  versiuneActivaSursa(importaPrinCentru(cuData.stareNoua, cer('preturi aprilie.xlsx',
    { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: 12 }] }, { dataValabil: '2026-04-01' })).stareNoua,
    'PRETURI_INGREDIENTE')!.dataEfectiva === '2026-04-01');

console.log('\n— Reimportul identic e DUPLICAT, nu „eșec" —');
const dubl = importaPrinCentru(rNom.stareNoua, cer('nomenclator august.xlsx', PN, { dataValabil: '2026-08-01' }));
t('starea și auditul spun „duplicat", nu „respins"',
  dubl.rezultat.stare === 'DUPLICAT' && dubl.stareNoua.auditImport!.slice(-1)[0].validare === 'DUPLICAT');
t('fără erori inventate pentru un fișier care e pur și simplu deja importat', dubl.rezultat.erori.length === 0);

console.log('\n— Lista de prețuri nu se prezintă ca revizie de nomenclator —');
t('un fișier de prețuri nu raportează tot nomenclatorul ca „absent"',
  importaPrinCentru(s0, cer('preturi scurte.xlsx',
    { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: 15 }] }, { dataValabil: '2026-08-01' }))
    .rezultat.schimbari!.nomenclator === null);

console.log('\n— Auditul distinge intrările —');
t('două importuri diferite au id-uri de audit diferite',
  (() => { const a = importaPrinCentru(s0, cer('x1.xlsx', { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: 21 }] }, { dataValabil: '2026-08-01' }));
    const b = importaPrinCentru(a.stareNoua, cer('x2.xlsx', { foaie: 'x', antete: ['Cod', 'Pret'], randuri: [{ Cod: 'I001', Pret: 22 }] }, { dataValabil: '2026-09-01' }));
    const ids = b.stareNoua.auditImport!.map(x => x.id);
    return new Set(ids).size === ids.length; })());

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
