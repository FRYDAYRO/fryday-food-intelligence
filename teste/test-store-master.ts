// Store Master: identitatea restaurantelor și potrivirea rapoartelor în vrac.
// Proprietatea centrală: se atribuie DOAR pe intrări verificate, iar orice ambiguitate
// oprește atribuirea. O cifră la restaurantul greșit e mai rea decât o cifră lipsă.
import {
  MESAJ_IDENTITATE_NEREZOLVATA, STORE_MASTER, datasetValidat, esteUtilizabila,
  normalizeazaNume, potrivesteRestaurant, potrivesteVrac,
  type IntrareStoreMaster, type RaportSursa, type StatusPotrivire,
} from '../src/lib/store-master';
import { RESTAURANTE_FRYDAY } from '../src/lib/restaurante-fryday';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const CTX = (raport: RaportSursa = 'PMIX_47', perioada = '2026-07', randSursa = 1) => ({ raport, perioada, randSursa });
const potriveste = (v: string, master?: IntrareStoreMaster[], c = CTX()) => potrivesteRestaurant(v, c, master);

// master de test CU intrări verificate — master-ul real nu are niciuna, iar fără așa ceva
// nu s-ar putea testa deloc căile de potrivire reușită
const V = (displayName: string, storeId: string, aliases: string[] = []): IntrareStoreMaster =>
  ({ displayName, storeId, aliases, source: 'legacy-4.7', verified: true });
const MASTER_V: IntrareStoreMaster[] = [
  V('FRYDAY CLUJ MEMO', '1001', ['CLUJ MEMO', 'Fryday Memorandumului']),
  V('FRYDAY CLUJ VIVO', '1002', ['CLUJ VIVO']),
  V('FRYDAY IASI PALAS', '1003'),
];

console.log('\n— A. Master-ul canonic —');
t('master-ul are cele 30 de restaurante', STORE_MASTER.length === 30);
t('master-ul E lista de restaurante — o singură sursă de adevăr, nu o copie',
  STORE_MASTER === RESTAURANTE_FRYDAY);
t('niciun nume duplicat', new Set(STORE_MASTER.map(m => m.displayName)).size === 30);
t('niciun storeId fabricat', STORE_MASTER.every(m => m.storeId === null));
t('nicio intrare verificată — raportul 4.7 nu conține identificatori',
  STORE_MASTER.every(m => !m.verified));
t('niciun alias inventat', STORE_MASTER.every(m => m.aliases.length === 0));
t('niciun cod de tip L01/L02 în master',
  !STORE_MASTER.some(m => /^L\d+$/.test(String(m.storeId))));

console.log('\n— B. Precăderea potrivirii —');
t('1. identificatorul verificat câștigă',
  (() => { const p = potriveste('1001', MASTER_V);
    return p.status === 'MATCHED_ID' && p.identitate === 'FRYDAY CLUJ MEMO' && p.storeId === '1001'; })());
t('2. numele verificat, exact',
  (() => { const p = potriveste('FRYDAY CLUJ MEMO', MASTER_V);
    return p.status === 'MATCHED_NAME' && p.identitate === 'FRYDAY CLUJ MEMO'; })());
t('3. numele verificat, normalizat (majuscule, diacritice, spații)',
  (() => { const p = potriveste('  fryday   cluj  memo ', MASTER_V);
    return p.status === 'MATCHED_NAME' && p.identitate === 'FRYDAY CLUJ MEMO'; })());
t('4. aliasul verificat',
  (() => { const p = potriveste('Fryday Memorandumului', MASTER_V);
    return p.status === 'MATCHED_ALIAS' && p.identitate === 'FRYDAY CLUJ MEMO'; })());
t('aliasul se potrivește și normalizat', potriveste('cluj memo', MASTER_V).status === 'MATCHED_ALIAS');
t('5. altfel UNMATCHED', potriveste('FRYDAY NECUNOSCUT', MASTER_V).status === 'UNMATCHED');
t('identificatorul bate numele altui restaurant',
  potriveste('1003', MASTER_V).identitate === 'FRYDAY IASI PALAS');
t('un rând fără restaurant declarat e UNMATCHED, nu atribuit primului',
  (() => { const p = potriveste('   ', MASTER_V);
    return p.status === 'UNMATCHED' && p.identitate === null; })());

console.log('\n— C. Master-ul REAL nu atribuie nimic: nimic nu e verificat —');
t('numele exact al unui restaurant real rămâne UNMATCHED',
  potriveste('FRYDAY CLUJ MEMO').status === 'UNMATCHED');
t('… dar spune EXACT ce lipsește, nu tace',
  (() => { const p = potriveste('FRYDAY CLUJ MEMO');
    return p.candidati.includes('FRYDAY CLUJ MEMO') && !!p.motiv
      && p.motiv.includes('NEVERIFICAT'.toLowerCase()) === false
      && p.motiv.includes(MESAJ_IDENTITATE_NEREZOLVATA); })());
t('toate cele 30 rămân neatribuite pe master-ul real',
  STORE_MASTER.every(m => potriveste(m.displayName).status === 'UNMATCHED'));
t('niciuna nu primește storeId prin potrivire',
  STORE_MASTER.every(m => potriveste(m.displayName).storeId === null));
t('niciuna nu e marcată verificată prin potrivire',
  STORE_MASTER.every(m => potriveste(m.displayName).verificat === false));

console.log('\n— D. Ambiguitatea oprește atribuirea —');
const AMBIGUU: IntrareStoreMaster[] = [V('FRYDAY CLUJ', '2001'), V('Fryday  CLUJ', '2002')];
t('două intrări care normalizează la fel ⇒ AMBIGUOUS',
  potriveste('FRYDAY CLUJ', AMBIGUU).status === 'AMBIGUOUS');
t('… și NU se alege niciuna', potriveste('FRYDAY CLUJ', AMBIGUU).identitate === null);
t('… iar ambii candidați sunt numiți', potriveste('FRYDAY CLUJ', AMBIGUU).candidati.length === 2);
t('un identificator duplicat în master ⇒ AMBIGUOUS, nu primul găsit',
  potriveste('9', [V('A', '9'), V('B', '9')]).status === 'AMBIGUOUS');
t('un alias revendicat de două restaurante ⇒ AMBIGUOUS (alias hijacking)',
  potriveste('CENTRU', [V('A', '1', ['CENTRU']), V('B', '2', ['CENTRU'])]).status === 'AMBIGUOUS');
t('un alias care revendică numele altui restaurant NU fură rândul — se oprește tot',
  (() => {
    // B revendică drept alias numele exact al lui A. Atribuirea se oprește: B nu primește
    // rândul (deturnarea eșuează), dar nici A nu-l primește tăcut — master-ul e corupt și
    // se vede. Prețul e o atribuire refuzată; alternativa ar fi una greșită.
    const p = potriveste('FRYDAY IASI PALAS', [V('FRYDAY IASI PALAS', '1'), V('B', '2', ['FRYDAY IASI PALAS'])]);
    return p.status === 'AMBIGUOUS' && p.identitate === null
      && p.candidati.includes('B') && p.candidati.includes('FRYDAY IASI PALAS');
  })(),
  'deturnarea prin alias nu reușește, iar coliziunea e semnalată');
t('… iar restaurantul deturnat NU primește tăcut rândul',
  potriveste('FRYDAY IASI PALAS', [V('FRYDAY IASI PALAS', '1'), V('B', '2', ['FRYDAY IASI PALAS'])])
    .identitate !== 'FRYDAY IASI PALAS');
// precăderea contează și când aceeași intrare prinde pe două căi: statusul trebuie să spună
// ADEVĂRUL despre cum s-a potrivit, altfel proveniența minte fără să schimbe cifra
t('la aceeași intrare, numele exact e raportat ca MATCHED_NAME, nu ca alias',
  potriveste('FRYDAY X', [V('FRYDAY X', '1', ['FRYDAY X', 'X'])]).status === 'MATCHED_NAME');
t('identificatorul e raportat ca MATCHED_ID chiar dacă e și alias',
  potriveste('77', [V('FRYDAY Y', '77', ['77'])]).status === 'MATCHED_ID');
t('aliasul e raportat ca MATCHED_ALIAS doar când chiar prin alias s-a potrivit',
  potriveste('X', [V('FRYDAY X', '1', ['X'])]).status === 'MATCHED_ALIAS');
t('AMBIGUOUS nu e utilizabil în calcul', !esteUtilizabila('AMBIGUOUS'));
t('UNMATCHED nu e utilizabil în calcul', !esteUtilizabila('UNMATCHED'));

console.log('\n— E. Normalizarea nu topește restaurante diferite —');
t('CLUJ IULIUS / MEMO / VIVO normalizează DIFERIT',
  new Set(['FRYDAY CLUJ IULIUS', 'FRYDAY CLUJ MEMO', 'FRYDAY CLUJ VIVO'].map(normalizeazaNume)).size === 3);
t('toate cele 30 normalizează la 30 de valori distincte',
  new Set(STORE_MASTER.map(m => normalizeazaNume(m.displayName))).size === 30,
  'nicio coliziune de normalizare în master-ul real');
t('normalizarea nu taie cuvinte: „CLUJ" ≠ „CLUJ MEMO"',
  normalizeazaNume('FRYDAY CLUJ') !== normalizeazaNume('FRYDAY CLUJ MEMO'));
t('un prefix nu prinde întregul',
  potriveste('FRYDAY CLUJ', MASTER_V).status === 'UNMATCHED',
  'nu alege între MEMO și VIVO doar fiindcă e „CLUJ"');
t('normalizarea e stabilă pe diacritice', normalizeazaNume('Timișoara') === normalizeazaNume('TIMISOARA'));

console.log('\n— F. Proveniența răspunde la toate cele șapte întrebări —');
const pv = potrivesteRestaurant('1001', { raport: 'NBO_29', perioada: '2026-07', randSursa: 42 }, MASTER_V);
t('din ce raport?', pv.raport === 'NBO_29');
t('ce perioadă?', pv.perioada === '2026-07');
t('al câtelea rând?', pv.randSursa === 42);
t('ce scria în fișier?', pv.valoareSursa === '1001');
t('ce intrare din master?', pv.identitate === 'FRYDAY CLUJ MEMO');
t('cum s-a potrivit?', pv.status === 'MATCHED_ID' && pv.metoda.length > 0);
t('era verificată?', pv.verificat === true);
t('valoarea-sursă se păstrează NEATINSĂ, cu spații și majuscule cu tot',
  potrivesteRestaurant('  fryday   cluj  memo ', CTX(), MASTER_V).valoareSursa === '  fryday   cluj  memo ');
t('proveniența se păstrează și când NU s-a potrivit nimic',
  (() => { const p = potrivesteRestaurant('X', { raport: 'NBO_41', perioada: '2026-06', randSursa: 7 });
    return p.raport === 'NBO_41' && p.perioada === '2026-06' && p.randSursa === 7 && p.valoareSursa === 'X'; })());
t('fiecare status poartă o metodă lizibilă',
  (['1001', 'FRYDAY CLUJ MEMO', 'cluj memo', 'ZZZ'] as const)
    .every(v => potriveste(v, MASTER_V).metoda.trim().length > 0));

console.log('\n— G. Importul în vrac: 2.9, 4.7, 4.1 —');
const randuri = [
  { valoareSursa: 'FRYDAY CLUJ MEMO', date: { cost: 100 } },
  { valoareSursa: '1002', date: { cost: 200 } },
  { valoareSursa: 'CLUJ MEMO', date: { cost: 50 } },
  { valoareSursa: 'FRYDAY NECUNOSCUT', date: { cost: 999 } },
  { valoareSursa: 'FRYDAY CLUJ', date: { cost: 888 } },
];
for (const raport of ['NBO_29', 'PMIX_47', 'NBO_41'] as RaportSursa[]) {
  const d = potrivesteVrac(randuri, { raport, perioada: '2026-07' }, MASTER_V);
  t(`${raport}: rândurile rezolvate intră în canonic`, d.canonice.length === 3);
  t(`${raport}: cele nerezolvate sunt OPRITE, nu calculate`, d.excluse.length === 2);
  t(`${raport}: datasetul se declară incomplet`, d.complet === false);
  t(`${raport}: fiecare rând poartă raportul lui`, d.canonice.every(r => r.provenienta.raport === raport));
  t(`${raport}: rândurile își păstrează indexul din fișier`,
    d.canonice.map(r => r.provenienta.randSursa).join(',') === '1,2,3');
  t(`${raport}: datele parsate rămân neatinse de stratul de identitate`,
    d.canonice[0].date.cost === 100);
}
const d47 = potrivesteVrac(randuri, { raport: 'PMIX_47', perioada: '2026-07' }, MASTER_V);
t('rezumatul pe status e exact',
  d47.peStatus.MATCHED_NAME === 1 && d47.peStatus.MATCHED_ID === 1
  && d47.peStatus.MATCHED_ALIAS === 1 && d47.peStatus.UNMATCHED === 2 && d47.peStatus.AMBIGUOUS === 0,
  JSON.stringify(d47.peStatus));
t('niciun leu din rândurile oprite nu ajunge în canonic',
  d47.canonice.reduce((s, r) => s + r.date.cost, 0) === 350);
t('rândurile oprite NU se pierd — rămân cu proveniența lor',
  d47.excluse.every(r => r.provenienta.valoareSursa.length > 0 && !!r.provenienta.motiv));
t('un fișier fără niciun rând rezolvat produce dataset gol, nu date inventate',
  (() => {
    const d = potrivesteVrac([{ valoareSursa: 'X', date: { cost: 1 } }], { raport: 'NBO_29', perioada: '2026-07' });
    return d.canonice.length === 0 && d.excluse.length === 1 && !d.complet;
  })());
t('pe master-ul REAL, un fișier întreg rămâne integral neatribuit',
  (() => {
    const d = potrivesteVrac(STORE_MASTER.map(m => ({ valoareSursa: m.displayName, date: { cost: 1 } })),
      { raport: 'PMIX_47', perioada: '2026-07' });
    return d.canonice.length === 0 && d.peStatus.UNMATCHED === 30;
  })(),
  'exact ce trebuie: fără identificatori, niciun raport nu se atribuie');
t('un dataset complet se declară complet',
  potrivesteVrac([{ valoareSursa: '1001', date: {} }], { raport: 'NBO_29', perioada: '2026-07' }, MASTER_V).complet);

console.log('\n— H. Atacuri de atribuire —');
t('un storeId inventat în fișier nu prinde nimic',
  potriveste('999999', MASTER_V).status === 'UNMATCHED');
t('un nume aproape identic NU se atribuie',
  potriveste('FRYDAY CLUJ MEM', MASTER_V).status === 'UNMATCHED',
  'o literă lipsă nu e „destul de aproape"');
t('un nume care conține alt nume nu îl fură',
  potriveste('FRYDAY CLUJ MEMO SI CEVA', MASTER_V).status === 'UNMATCHED');
t('L01 nu se leagă de niciun restaurant real',
  potriveste('L01').status === 'UNMATCHED' && potriveste('L01').identitate === null);
t('L02 la fel', potriveste('L02').identitate === null);
t('un rând nu poate revendica o identitate prin câmpuri suplimentare',
  (() => {
    const p = potrivesteRestaurant('X', CTX(), MASTER_V);
    return p.identitate === null && p.storeId === null && p.verificat === false;
  })());
t('potrivirea e deterministă: aceeași intrare, același rezultat',
  JSON.stringify(potriveste('cluj memo', MASTER_V)) === JSON.stringify(potriveste('cluj memo', MASTER_V)));
t('potrivirea nu modifică master-ul',
  (() => { const inainte = JSON.stringify(STORE_MASTER);
    STORE_MASTER.forEach(m => potriveste(m.displayName));
    return JSON.stringify(STORE_MASTER) === inainte; })());
t('statusurile posibile sunt exact cele cinci declarate',
  (['MATCHED_ID', 'MATCHED_NAME', 'MATCHED_ALIAS', 'UNMATCHED', 'AMBIGUOUS'] as StatusPotrivire[])
    .every(s => typeof esteUtilizabila(s) === 'boolean'));

console.log('\n— I. Datasetul validat e singura poartă spre calcul —');
t('datasetValidat separă strict pe utilizabilitate',
  (() => {
    const d = datasetValidat([
      { date: 1, provenienta: potriveste('1001', MASTER_V) },
      { date: 2, provenienta: potriveste('ZZZ', MASTER_V) },
      { date: 3, provenienta: potriveste('FRYDAY CLUJ', AMBIGUU) },
    ]);
    return d.canonice.length === 1 && d.excluse.length === 2
      && d.canonice.every(r => esteUtilizabila(r.provenienta.status));
  })());
t('niciun rând AMBIGUU nu ajunge în canonic',
  datasetValidat([{ date: 1, provenienta: potriveste('FRYDAY CLUJ', AMBIGUU) }]).canonice.length === 0);
t('mesajul de dovezi insuficiente e cel cerut, cuvânt cu cuvânt',
  MESAJ_IDENTITATE_NEREZOLVATA === 'Date insuficiente pentru o concluzie sigură.');
t('orice rând oprit poartă mesajul sau un motiv explicit',
  potrivesteVrac(randuri, { raport: 'NBO_29', perioada: '2026-07' }, MASTER_V)
    .excluse.every(r => !!r.provenienta.motiv));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
