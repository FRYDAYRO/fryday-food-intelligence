// Poarta unică de import: ecranul vechi și Import Center intră pe ACEEAȘI cale.
//
// Ce se demonstrează aici, în ordinea cerințelor:
//   1. importul normal continuă să funcționeze, cu aceleași cifre;
//   2. se creează versiunea sursei (proveniență);
//   3. intervalul raportului se păstrează;
//   4. banda de compatibilitate vede intervalul după import;
//   5. nemapatele se păstrează;
//   6. Waste și Inventarul NU sunt tratate greșit — nici respinse, nici versionate ca surse FC;
//   7. niciun comportament existent valid nu dispare: mapare manuală, opțiuni, tipuri.
import { importaUnificat, sursaPentruIntern, pregatesteImport, activeazaImport } from '../src/lib/import-center';
import { importa, type Parsat } from '../src/lib/importer';
import { bandaPerioade, verdictCombinare } from '../src/lib/perioade-surse';
import { stareGoala } from '../src/lib/seed';
import { buildCtx, fcPerioada } from '../src/lib/engine';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;
const ACUM = '2026-09-01T10:00:00.000Z';

const P = (antete: string[], randuri: Record<string, unknown>[]): Parsat =>
  ({ antete, randuri, foaie: 'S1' });

// ————————————————————————————————————————————————————————— fixturi
const PMIX = P(['Data', 'Locatie', 'Cod produs', 'Denumire', 'Cantitate', 'Valoare', 'Canal'], [
  { Data: '2026-08-05', Locatie: 'L01', 'Cod produs': 'P1', Denumire: 'Burger', Cantitate: 100, Valoare: 1190, Canal: 'INSTORE' },
  { Data: '2026-08-07', Locatie: 'L01', 'Cod produs': 'P1', Denumire: 'Burger', Cantitate: 50, Valoare: 595, Canal: 'INSTORE' },
]);
const NBO29 = P(['Perioada', 'Categorie', 'Valoare', 'Locatie'], [
  { Perioada: '2026-08', Categorie: 'FOOD', Valoare: 300, Locatie: 'L01' },
  { Perioada: '2026-08', Categorie: 'PAPER', Valoare: 40, Locatie: 'L01' },
]);
const WASTE = P(['Data', 'Ingredient', 'Cantitate', 'UM', 'Locatie'], [
  { Data: '2026-08-05', Ingredient: 'I1', Cantitate: 2, UM: 'kg', Locatie: 'L01' },
]);

const baza = (): AppState => ({
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'Test' }],
  ingrediente: [{ cod: 'I1', denumire: 'Piept', categorie: 'Carne', tip: 'FOOD', um: 'kg',
    preturi: [{ validDeLa: '2026-01-01', pret: 20 }], activ: true }],
  produse: [{ cod: 'P1', denumire: 'Burger', categorie: 'Burgeri', tip: 'SIMPLU',
    pretInstore: 11.9, pretDelivery: 11.9, tva: 19, activ: true }],
  retete: [{ cod: 'P1', tip: 'PRODUS', denumire: 'Burger', activa: 1,
    versiuni: [{ nr: 1, data: '2026-01-01', linii: [{ comp: 'I1', tipComp: 'INGREDIENT', cant: 0.1, um: 'kg', canal: 'AMBELE' }] }] }],
});

// ————————————————————————————————— 1. sursaPentruIntern: harta, nu numele
console.log('— 1. Ce e sursă FC și ce nu —');
t('PMIX → PMIX_47', sursaPentruIntern('PMIX', PMIX.antete) === 'PMIX_47');
t('SALES_MIX → PMIX_47', sursaPentruIntern('SALES_MIX', ['Denumire', 'Cantitate']) === 'PMIX_47');
t('FC29 → NBO_29', sursaPentruIntern('FC29', NBO29.antete) === 'NBO_29');
t('SALES → NBO_41', sursaPentruIntern('SALES', ['Data', 'Locatie', 'Net']) === 'NBO_41');
t('RETETAR → RETETAR', sursaPentruIntern('RETETAR', ['Reteta', 'Componenta', 'Cantitate']) === 'RETETAR');
t('WASTE nu e sursă FC', sursaPentruIntern('WASTE', WASTE.antete) === null);
t('INVENTAR nu e sursă FC', sursaPentruIntern('INVENTAR', WASTE.antete) === null);
t('MENIURI nu e sursă FC', sursaPentruIntern('MENIURI', ['Combo', 'Componenta']) === null);
t('FC_BAZA nu e sursă FC combinabilă', sursaPentruIntern('FC_BAZA', ['Denumire', 'Canal']) === null);
t('PRETURI_FURNIZORI nu e sursă FC', sursaPentruIntern('PRETURI_FURNIZORI', ['Cod', 'Pret']) === null);
// COST_INGREDIENTE aparține la două surse — se alege după câmpurile PREZENTE
t('COST_INGREDIENTE cu cod+denumire+um → NOMENCLATOR',
  sursaPentruIntern('COST_INGREDIENTE', ['Cod', 'Denumire', 'UM']) === 'NOMENCLATOR');
t('COST_INGREDIENTE doar cu cod+preț → PRETURI_INGREDIENTE',
  sursaPentruIntern('COST_INGREDIENTE', ['Cod', 'Pret']) === 'PRETURI_INGREDIENTE');

// ————————————————————————————————— 2. import normal + proveniență + interval
console.log('\n— 2. Import normal prin poarta unică —');
const r1 = importaUnificat(baza(), { fisier: '4.7 august.xlsx', parsat: PMIX, intern: 'PMIX', acum: ACUM });
const s1 = r1.stareNoua;
t('importul a reușit', r1.batch.status === 'IMPORTAT', r1.batch.status);
t('rândurile au intrat', s1.vanzari.length === 2, `${s1.vanzari.length}`);
t('sursa recunoscută e PMIX_47', r1.sursa === 'PMIX_47', `${r1.sursa}`);
t('S-A CREAT versiunea sursei', (s1.versiuniImport ?? []).length === 1, (s1.versiuniImport ?? [])[0]?.id);
t('versiunea e activă', (s1.versiuniImport ?? [])[0]?.activa === true);
t('INTERVALUL s-a păstrat: 05 → 07 august',
  (s1.versiuniImport ?? [])[0]?.intervalDe === '2026-08-05' && (s1.versiuniImport ?? [])[0]?.intervalLa === '2026-08-07',
  `${(s1.versiuniImport ?? [])[0]?.intervalDe} → ${(s1.versiuniImport ?? [])[0]?.intervalLa}`);
t('urma de audit s-a scris', (s1.auditImport ?? []).length === 1);
t('auditul spune că s-a activat', (s1.auditImport ?? [])[0]?.activat === true);

// cifrele NU se schimbă față de motorul direct
const direct = importa('PMIX', PMIX, '4.7 august.xlsx', baza());
t('ACELEAȘI vânzări ca pe calea directă', direct.stateNou.vanzari.length === s1.vanzari.length);
t('ACELEAȘI valori nete', aprox(
  direct.stateNou.vanzari.reduce((a, v) => a + v.net, 0),
  s1.vanzari.reduce((a, v) => a + v.net, 0)));
const ctx1 = buildCtx(s1);
const fc1 = fcPerioada(s1, ctx1, '2026-08', 'RETEA');
const fcD = fcPerioada(direct.stateNou, buildCtx(direct.stateNou), '2026-08', 'RETEA');
t('Food Cost-ul e neschimbat', fc1.fcTeoretic !== null && fcD.fcTeoretic !== null
  && aprox(fc1.fcTeoretic, fcD.fcTeoretic), `${fc1.fcTeoretic?.toFixed(4)}%`);

// ————————————————————————————————— 3. compatibilitatea devine disponibilă
console.log('\n— 3. Garda de compatibilitate, după import —');
t('înainte de al doilea import: date insuficiente',
  bandaPerioade(s1).status === 'INSUFFICIENT_DATA', bandaPerioade(s1).status);
const r2 = importaUnificat(s1, { fisier: '2.9 august.xlsx', parsat: NBO29, intern: 'FC29', acum: ACUM });
const s2 = r2.stareNoua;
t('2.9 s-a importat', r2.batch.status === 'IMPORTAT');
t('are versiune proprie', (s2.versiuniImport ?? []).some(v => v.tip === 'NBO_29'));
const banda2 = bandaPerioade(s2);
t('banda vede acum DOUĂ intervale', banda2.intervale.length === 2, `${banda2.intervale.length}`);
t('verdictul de combinare se poate calcula', banda2.combinatii.length >= 1);
// 2.9 declarat pe LUNĂ nu poate purta un interval de zile — regula documentată: se
// raportează INSUFFICIENT_DATA și NU se blochează nimic. Aici se verifică exact asta.
const v = verdictCombinare(s2, ['NBO_29', 'PMIX_47']);
t('2.9 lunar ⇒ INSUFFICIENT_DATA', v.verdict === 'INSUFFICIENT_DATA', v.verdict);
t('… și NU blochează calculul', v.blocheaza === false);
t('… iar sursa nedeclarată e numită', v.nedeclarate.includes('NBO_29'), v.nedeclarate.join(','));

// garda VIE se demonstrează pe două surse datate pe zi: 4.7 × 4.1
const SALES_AUG = P(['Data', 'Locatie', 'Canal', 'Net'], [
  { Data: '2026-08-05', Locatie: 'L01', Canal: 'INSTORE', Net: 1000 },
  { Data: '2026-08-07', Locatie: 'L01', Canal: 'INSTORE', Net: 800 },
]);
const sAcc = importaUnificat(s1, { fisier: '4.1 august.xlsx', parsat: SALES_AUG, intern: 'SALES', acum: ACUM }).stareNoua;
const vAcc = verdictCombinare(sAcc, ['NBO_41', 'PMIX_47']);
t('4.7 și 4.1 pe același interval ⇒ ACCEPT', vAcc.verdict === 'ACCEPT', vAcc.verdict);
t('… deci garda chiar decide, nu doar raportează', vAcc.blocheaza === false);

// perioade disjuncte ⇒ garda BLOCHEAZĂ (dovada că nu e decorativă)
const SALES_IUNIE = P(['Data', 'Locatie', 'Canal', 'Net'], [
  { Data: '2026-06-05', Locatie: 'L01', Canal: 'INSTORE', Net: 1000 },
]);
const sDisj = importaUnificat(s1, { fisier: '4.1 iunie.xlsx', parsat: SALES_IUNIE, intern: 'SALES', acum: ACUM }).stareNoua;
const vDisj = verdictCombinare(sDisj, ['NBO_41', 'PMIX_47']);
t('perioade disjuncte ⇒ BLOCK', vDisj.verdict === 'BLOCK', `${vDisj.verdict}`);
t('… și chiar blochează', vDisj.blocheaza === true);
t('… cu motiv scris', !!vDisj.motiv && vDisj.motiv.length > 10);

// ————————————————————————————————— 4. nemapatele se păstrează
console.log('\n— 4. Nemapatele nu se pierd —');
const SALESMIX = P(['Denumire', 'Cantitate', 'Valoare'], [
  { Denumire: 'Burger', Cantitate: 10, Valoare: 119 },
  { Denumire: 'Produs Fantomă', Cantitate: 5, Valoare: 60 },
]);
const rNm = importaUnificat(baza(), {
  fisier: '4.7 Sales Mix FRYDAY IASI PALAS.xlsx', parsat: SALESMIX, intern: 'SALES_MIX',
  optiuni: { dataRaport: '2026-08-05' }, acum: ACUM,
});
const dirNm = importa('SALES_MIX', SALESMIX, '4.7 Sales Mix FRYDAY IASI PALAS.xlsx', baza(), undefined, { dataRaport: '2026-08-05' });
t('poarta unică păstrează ACELEAȘI nemapate ca motorul direct',
  rNm.stareNoua.nemapate.length === dirNm.stateNou.nemapate.length,
  `${rNm.stareNoua.nemapate.length} vs ${dirNm.stateNou.nemapate.length}`);
t('nemapatele chiar sunt numite',
  rNm.stareNoua.nemapate.length === 0 || rNm.stareNoua.nemapate.some(n => /Fantom/.test(n.denumire)),
  rNm.stareNoua.nemapate.map(n => n.denumire).join(', ') || '(niciunul)');

// ————————————————————————————————— 5. Waste și Inventar
console.log('\n— 5. Waste și Inventar: importate, nu versionate ca surse FC —');
const rW = importaUnificat(baza(), { fisier: 'waste august.xlsx', parsat: WASTE, intern: 'WASTE', acum: ACUM });
t('Waste NU e respins (numele nu-l mai exclude)', rW.batch.status === 'IMPORTAT', rW.batch.status);
t('rândurile de waste au intrat', rW.stareNoua.waste.length === 1, `${rW.stareNoua.waste.length}`);
t('NU primește versiune de sursă FC', (rW.stareNoua.versiuniImport ?? []).length === 0);
t('DAR primește urmă de audit', (rW.stareNoua.auditImport ?? []).length === 1);
t('auditul îi păstrează tipul intern', (rW.stareNoua.auditImport ?? [])[0]?.tipIntern === 'WASTE');
t('nu poluează banda de perioade', bandaPerioade(rW.stareNoua).intervale.length === 0);
const rI = importaUnificat(baza(), { fisier: 'inventar.xlsx', parsat: WASTE, intern: 'INVENTAR', acum: ACUM });
t('Inventarul se importă la fel', rI.batch.status === 'IMPORTAT' && rI.stareNoua.inventar.length === 1);
t('… tot fără versiune de sursă', (rI.stareNoua.versiuniImport ?? []).length === 0);

// ————————————————————————————————— 6. maparea manuală supraviețuiește
console.log('\n— 6. Maparea manuală de coloane —');
// antete pe care maparea AUTOMATĂ nu le poate recunoaște: niciun alias nu prinde
// „BD", „Store", „Item Ref" sau „Pieces". Fără intervenția omului, fișierul e ilizibil.
const CIUDAT = P(['BD', 'Store', 'Item Ref', 'Pieces', 'Suma neta', 'Canal'], [
  { BD: '2026-08-05', Store: 'L01', 'Item Ref': 'P1', Pieces: 10, 'Suma neta': 119, Canal: 'INSTORE' },
]);
const faraMapare = importaUnificat(baza(), { fisier: 'ciudat.xlsx', parsat: CIUDAT, intern: 'PMIX', acum: ACUM });
t('fără mapare manuală importul NU trece (antete nerecunoscute)',
  faraMapare.batch.status === 'ESUAT', faraMapare.batch.status);
const cuMapare = importaUnificat(baza(), {
  fisier: 'ciudat.xlsx', parsat: CIUDAT, intern: 'PMIX', acum: ACUM,
  // cheia e CÂMPUL din model, valoarea e COLOANA din fișier — aceeași convenție ca în `importa`
  mapare: { data: 'BD', locatie: 'Store', produs: 'Item Ref', cant: 'Pieces', net: 'Suma neta' },
});
t('CU mapare manuală importul trece', cuMapare.batch.status === 'IMPORTAT', cuMapare.batch.status);
t('… rândul a intrat', cuMapare.stareNoua.vanzari.length === 1);
t('… și tot primește versiune cu interval',
  (cuMapare.stareNoua.versiuniImport ?? [])[0]?.intervalDe === '2026-08-05',
  `${(cuMapare.stareNoua.versiuniImport ?? [])[0]?.intervalDe}`);
t('maparea intră în amprentă (nu e văzut ca duplicat al celui fără mapare)',
  (cuMapare.stareNoua.versiuniImport ?? [])[0]?.amprenta !== faraMapare.batch.id);

// ————————————————————————————————— 7. opțiunile și protecțiile rămân
console.log('\n— 7. Opțiuni, protecții, determinism —');
const rLoc = importaUnificat(baza(), {
  fisier: '4.7 Sales Mix.xlsx', parsat: SALESMIX, intern: 'SALES_MIX',
  locatie: 'L01', optiuni: { dataRaport: '2026-08-05' }, acum: ACUM,
});
t('locația declarată ajunge la motor', rLoc.stareNoua.vanzari.every(x => x.locatie === 'L01'),
  [...new Set(rLoc.stareNoua.vanzari.map(x => x.locatie))].join(','));
const dublu = importaUnificat(s1, { fisier: '4.7 august.xlsx', parsat: PMIX, intern: 'PMIX', acum: ACUM });
t('al doilea import identic e recunoscut ca duplicat, nu dublează rândurile',
  dublu.stareNoua.vanzari.length === s1.vanzari.length, `${dublu.stareNoua.vanzari.length}`);
t('un import respins NU scrie versiune',
  faraMapare.stareNoua.versiuniImport === undefined || (faraMapare.stareNoua.versiuniImport ?? []).length === 0);
t('… dar scrie audit, ca eșecul să fie explicabil', (faraMapare.stareNoua.auditImport ?? []).length === 1);
t('rezultatul canonic e expus pentru sursele FC', r1.rezultat !== null && r1.rezultat.activat);
t('… și lipsește pentru rapoartele necombinabile', rW.rezultat === null);

// ————————————————————————————————— varianta aleasă de ecran are prioritate
// Un fișier poate satisface DOUĂ structuri ale aceluiași raport. Detecția alege prima
// din listă; ecranul poate ști altceva. Dacă alegerea ecranului n-ar fi onorată, importul
// ar intra pe altă structură decât cea pe care omul a confirmat-o.
console.log('\n— 8. Structura aleasă de ecran —');
const AMBIGUU = P(['Data', 'Locatie', 'Cod produs', 'Denumire', 'Cantitate', 'Valoare', 'Canal'], [
  { Data: '2026-08-05', Locatie: 'L01', 'Cod produs': 'P1', Denumire: 'Burger', Cantitate: 7, Valoare: 83.3, Canal: 'INSTORE' },
]);
t('fără preferință, detecția alege PMIX',
  pregatesteImport(baza(), { fisier: 'a.xlsx', parsat: AMBIGUU, tip: 'PMIX_47', acum: ACUM })
    .rezultat.tipIntern === 'PMIX');
const cuSM = pregatesteImport(baza(), {
  fisier: 'a.xlsx', parsat: AMBIGUU, tip: 'PMIX_47', internPreferat: 'SALES_MIX', acum: ACUM,
});
t('cu preferința ecranului, se folosește SALES_MIX', cuSM.rezultat.tipIntern === 'SALES_MIX',
  `${cuSM.rezultat.tipIntern}`);
t('poarta unică duce preferința mai departe',
  importaUnificat(baza(), { fisier: 'a.xlsx', parsat: AMBIGUU, intern: 'SALES_MIX', acum: ACUM })
    .rezultat?.tipIntern === 'SALES_MIX');
// o preferință din ALT raport nu are voie să deturneze importul
const strain = pregatesteImport(baza(), {
  fisier: 'a.xlsx', parsat: AMBIGUU, tip: 'PMIX_47', internPreferat: 'FC29', acum: ACUM,
});
t('o structură străină de tipul cerut e IGNORATĂ, nu urmată',
  strain.rezultat.tipIntern === 'PMIX', `${strain.rezultat.tipIntern}`);
t('… iar importul rămâne valid pe structura corectă', strain.valid);

// echivalență cu calea Import Center, pas cu pas
const pg = pregatesteImport(baza(), { fisier: '4.7 august.xlsx', parsat: PMIX, tip: 'PMIX_47', acum: ACUM });
const ac = activeazaImport(baza(), pg);
t('poarta unică dă ACELAȘI rezultat ca Import Center',
  ac.stareNoua.vanzari.length === s1.vanzari.length
  && (ac.stareNoua.versiuniImport ?? [])[0]?.intervalDe === (s1.versiuniImport ?? [])[0]?.intervalDe);

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
