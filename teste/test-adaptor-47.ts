// Adaptorul 4.7: de la raportul brut la identități din Store Master.
// Proprietatea centrală: un raport agregat pe rețea NU devine niciodată datele unui restaurant.
import { matriceDinText, parseSalesMix } from '../src/lib/salesmix';
import { analizeaza47, descrie47, ETICHETA_SCOP_47, MESAJ_AGREGAT, MESAJ_SCOP_NEDECLARAT } from '../src/lib/adaptor-47';
import { STORE_MASTER, type IntrareStoreMaster } from '../src/lib/store-master';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const antet = (magazine: string) => `4.7 Sales Mix
Multiple Selection Fiscal Year: 2026 Period: 8 Week: 4 8/17/2026 - 8/23/2026
BERE CATEGORY
Bere Corona new 132 15.990 $2,110.68
Budweiser new 88 15.990 $1,407.12
Groups/Stores Selected for this Report
${magazine}
V 21.1.126.0 - 1 - 8/24/2026 9:12 AM Copyright © NCR Corporation 2022`;

const din = (magazine: string, fisier = '4.7.pdf') =>
  analizeaza47(parseSalesMix(matriceDinText(antet(magazine))), fisier);

console.log('\n— A. Lista de restaurante ruptă pe rânduri se reface întreagă —');
// exact ruptura din raportul real: numele se taie între rânduri
const RUPT = `FRYDAY ALBA IULIA, FRYDAY PITESTI VIVO, FRYDAY
PLOIESTI DT, FRYDAY SIBIU SELIMBAR, FRYDAY SUCEAVA DT, FRYDAY
TARGOVISTE, FRYDAY VASLUI DT`;
const r = din(RUPT);
t('numele tăiat între rânduri se reface', r.restaurante.some(x => x.valoareSursa === 'FRYDAY PLOIESTI DT'));
t('și al doilea la fel', r.restaurante.some(x => x.valoareSursa === 'FRYDAY TARGOVISTE'));
t('nu rămâne niciun orfan „FRYDAY"', !r.restaurante.some(x => x.valoareSursa === 'FRYDAY'));
t('se numără toate cele 7, niciunul pierdut', r.rezumat.totalDeclarate === 7, `${r.rezumat.totalDeclarate}`);
t('subsolul raportului lipit de ultimul nume nu îl strică',
  (() => {
    // în PDF-ul real subsolul se lipește uneori de ultima intrare, pe același rând
    const x = analizeaza47(parseSalesMix(matriceDinText(
      `4.7 Sales Mix
8/17/2026 - 8/23/2026
Groups/Stores Selected for this Report
FRYDAY ORADEA, FRYDAY VASLUI DT 12 of 12 V 21.1.126.0 - 1 - 8/24/2026
Copyright © NCR Corporation 2022`)), 'x.pdf');
    return x.restaurante.some(y => y.valoareSursa === 'FRYDAY VASLUI DT')
      && !x.restaurante.some(y => y.valoareSursa.includes('12 of'));
  })(),
  'numele rămâne întreg, subsolul se taie');
t('toate se identifică în Store Master', r.rezumat.matched === 7);

console.log('\n— A2. Antetul raportului pe UN SINGUR restaurant —');
// Forma reală: numele stă în colțul din stânga sus, pe două coloane, rupt între rânduri,
// cu titlul raportului la mijloc. Nu există secțiunea „Groups/Stores".
const PE_RESTAURANT = `FRYDAY TIMISOARA Fiscal Year: 2026
4.7 Sales Mix
IULIUS TOWN Period: 8 Week: 4
8/17/2026 - 8/23/2026
Menu Item Name Qty Price Extension
CATEGORY BERE
Bere Corona new 1 15.990 $15.99
Total BERE 1 $15.99`;
const unu = analizeaza47(parseSalesMix(matriceDinText(PE_RESTAURANT)), 'restaurant.pdf');
t('numele rupt de layout-ul pe coloane se reface întreg',
  unu.restaurante[0]?.valoareSursa === 'FRYDAY TIMISOARA IULIUS TOWN',
  unu.restaurante[0]?.valoareSursa ?? '(niciunul)');
t('titlul raportului nu intră în numele restaurantului',
  !(unu.restaurante[0]?.valoareSursa ?? '').toLowerCase().includes('sales mix'));
t('anul fiscal și perioada nu intră în nume',
  !/fiscal|period|week/i.test(unu.restaurante[0]?.valoareSursa ?? ''));
t('scopul e RESTAURANT_UNIC, fără secțiune Groups/Stores', unu.scop === 'RESTAURANT_UNIC');
t('se identifică în Store Master', unu.rezumat.matched === 1);
t('e atribuibil pe restaurant', unu.atribuibilPeRestaurant === true);
t('… lui exact restaurantul din antet', unu.restaurantUnic === 'FRYDAY TIMISOARA IULIUS TOWN');
t('… fără storeId inventat', unu.restaurante[0].storeId === null);
t('perioada se citește tot din antet', unu.perioadaDe === '2026-08-17' && unu.perioadaLa === '2026-08-23');
t('liniile de vânzare se citesc normal', unu.liniiTotal === 1);
t('rândurile de antet NU devin linii de vânzare',
  parseSalesMix(matriceDinText(PE_RESTAURANT)).linii.every(l => !/fiscal|iulius town/i.test(l.nume)));
t('„Multiple Selection" nu e citit drept nume de restaurant',
  (() => {
    const x = parseSalesMix(matriceDinText(`4.7 Sales Mix
Multiple Selection Fiscal Year: 2026 Period: 8 Week: 4
8/17/2026 - 8/23/2026
Menu Item Name Qty Price Extension
CATEGORY BERE
Bere Corona new 1 15.990 $15.99
Groups/Stores Selected for this Report
FRYDAY ORADEA, FRYDAY GALATI
Copyright © NCR Corporation 2022`));
    return !x.magazine.some(m => /multiple selection/i.test(m)) && x.magazine.length === 2;
  })(),
  'lista explicită are precădere peste antetul de sus');

t('când există AMBELE antete, lista Groups/Stores are precădere',
  (() => {
    // capcană: antetul de sus arată a raport pe un restaurant, dar fișierul are și lista
    // explicită. Lista e sursa autoritară — altfel un raport de rețea ar fi citit ca al
    // primului restaurant din antet, iar cifrele întregii rețele i s-ar pune în cârcă.
    const x = parseSalesMix(matriceDinText(`FRYDAY ORADEA Fiscal Year: 2026
4.7 Sales Mix
Period: 8 Week: 4
8/17/2026 - 8/23/2026
Menu Item Name Qty Price Extension
CATEGORY BERE
Bere Corona new 1 15.990 $15.99
Groups/Stores Selected for this Report
FRYDAY GALATI, FRYDAY GALATI, FRYDAY CRAIOVA
Copyright © NCR Corporation 2022`));
    return !x.magazine.includes('FRYDAY ORADEA') && x.magazine.length === 2;
  })(),
  'antetul de sus nu poate deturna un raport de rețea');

console.log('\n— A3. Alte rapoarte NCR, același antet (4.1 Sales Journal) —');
// 4.1 are EXACT aceeași structură de antet ca 4.7-ul pe restaurant, doar titlul diferă.
// Nu are „Menu Item Name" și nici categorii — deci scanarea antetului trebuie să se oprească
// singură, la intervalul de date. Altfel numele ar înghiți tot raportul.
const JURNAL_41 = `FRYDAY TIMISOARA Fiscal Year: 2026
4.1 Sales Journal
IULIUS TOWN Period: 8 Week: 4
8/17/2026 - 8/23/2026
Sales Cash Reconciliation
Net Sales $189,606.42 Net Sales $189,606.42
Total Comps 25% $163.63 - Charge Deposits $89,060.48
TVA 11% $18,733.16 Total TVA $22,765.53
Gross Sales $212,371.95
Total Payments CASH $50,212.56
V 21.1.126.0 - 91 - 8/24/2026 9:10 AM Copyright © NCR Corporation 2022 1 of 1`;
const j41 = parseSalesMix(matriceDinText(JURNAL_41));
t('restaurantul se identifică și dintr-un 4.1',
  j41.magazine.length === 1 && j41.magazine[0] === 'FRYDAY TIMISOARA IULIUS TOWN',
  JSON.stringify(j41.magazine));
t('titlul „4.1 Sales Journal" nu intră în nume',
  !(j41.magazine[0] ?? '').toLowerCase().includes('journal'));
t('antetul se OPREȘTE la intervalul de date, nu înghite raportul',
  !(j41.magazine[0] ?? '').includes('$') && (j41.magazine[0] ?? '').length <= 60,
  `${(j41.magazine[0] ?? '').length} caractere`);
t('sumele din raport nu ajung în numele restaurantului',
  !/189|212|Comps|TVA/i.test(j41.magazine[0] ?? ''));
t('perioada se citește și din 4.1',
  j41.perioadaDe === '2026-08-17' && j41.perioadaLa === '2026-08-23');
t('un 4.1 nu produce linii de vânzare — nu e un Sales Mix', j41.linii.length === 0);
t('adaptorul îl declară raport pe un singur restaurant',
  analizeaza47(j41, '4.1.pdf').scop === 'RESTAURANT_UNIC');
t('… identificat în Store Master', analizeaza47(j41, '4.1.pdf').rezumat.matched === 1);
t('titlul se sare după FORMĂ, deci merge și pentru rapoarte viitoare',
  (() => {
    const x = parseSalesMix(matriceDinText(`FRYDAY ORADEA Fiscal Year: 2026
9.9 Raport Viitor
Period: 8 Week: 4
8/17/2026 - 8/23/2026
Net Sales $1.00`));
    return x.magazine[0] === 'FRYDAY ORADEA';
  })());
// plasa de siguranță, testată direct: un raport FĂRĂ interval de date nu are unde să
// oprească antetul, deci scanarea ajunge departe. Atunci numele trebuie respins, nu
// declarat — mai bine niciun magazin decât unul inventat din resturi de raport.
t('un antet nemărginit NU produce un nume de restaurant din resturi',
  (() => {
    const x = parseSalesMix(matriceDinText(`FRYDAY TIMISOARA Fiscal Year: 2026
4.1 Sales Journal
IULIUS TOWN Period: 8 Week: 4
Sales Cash Reconciliation
Net Sales $189,606.42 Net Sales $189,606.42
Total Comps 25% $163.63 - Charge Deposits $89,060.48`));
    return x.magazine.length === 0;
  })(),
  'fără interval de date, antetul curge — plasa îl oprește');
t('un nume care ajunge să conțină sume e respins',
  (() => {
    // parseSalesMix e exportat și primește matrici și din Excel, unde celulele cu valute
    // ajung direct la el — nu trec prin filtrarea din matriceDinText
    const x = parseSalesMix([
      ['FRYDAY ORADEA', 'Fiscal Year: 2026'],
      ['Net Sales $189,606.42'],
      ['Total Comps 25% $163.63'],
    ]);
    return x.magazine.length === 0;
  })(),
  'un nume cu sume în el nu e un nume');
t('un nume absurd de lung e respins',
  (() => {
    const lung = 'FRYDAY ' + 'CUVANT '.repeat(15);
    const x = parseSalesMix(matriceDinText(`${lung} Fiscal Year: 2026\nPeriod: 8`));
    return x.magazine.length === 0;
  })());
t('un antet fără nume de restaurant nu inventează unul',
  (() => {
    const x = parseSalesMix(matriceDinText(`Multiple Selection Fiscal Year: 2026
4.1 Sales Journal
Period: 8 Week: 4
8/17/2026 - 8/23/2026
Net Sales $1.00`));
    return x.magazine.length === 0;
  })());

console.log('\n— A4. 2.9: pe restaurant și pe companie („Corporate") —');
const NOU_29_VALCEA = `FRYDAY RM VALCEA DT Fiscal Year: 2026
2.9 Food Cost - Inventory With Adjustments Summary - FIFO
Period: 8 Week: 4
8/17/2026 - 8/23/2026
Usage in Units Usage in Dollars Usage in Percent
Raw Material Item Inv Beg Pur Inv Inv End Cost End Days On
Alcool
APEROL SPRITZ 9% 0.2L 7000247 EA 19.0 0.0 0.0 0.0 16.0 $15.19 $243.07`;
const v29 = parseSalesMix(matriceDinText(NOU_29_VALCEA));
t('2.9 pe restaurant: numele se citește din antet',
  v29.magazine[0] === 'FRYDAY RM VALCEA DT', JSON.stringify(v29.magazine));
t('titlul lung al lui 2.9 nu intră în nume',
  !/food cost|fifo|inventory/i.test(v29.magazine[0] ?? ''));
t('… iar adaptorul îl atribuie restaurantului',
  analizeaza47(v29, '2.9.pdf').restaurantUnic === 'FRYDAY RM VALCEA DT');
t('… identificat în Store Master', analizeaza47(v29, '2.9.pdf').rezumat.matched === 1);
t('capul de tabel 2.9 oprește antetul', !v29.corporativ);

// 2.9 la nivel de companie: alt marcaj de scop („Corporate") și date pe rânduri separate
const NOU_29_CORP = `Corporate Start Date: 08/01/2026
2.9 Food Cost - Inventory With Adjustments Summary - FIFO
End Date: 08/09/2026
Usage in Units Usage in Dollars Usage in Percent
Raw Material Item Inv Beg Pur Inv Inv End Cost End Days On
Alcool
APEROL SPRITZ 9% 0.2L 7000247 EA 794.0 24.0 0.0 0.0 1,030.0 $15.19 $15,647.76`;
const c29 = parseSalesMix(matriceDinText(NOU_29_CORP));
t('„Corporate" e recunoscut ca scop de companie', c29.corporativ === true);
t('… și NU e citit ca nume de restaurant', c29.magazine.length === 0);
t('datele pe rânduri separate se citesc: Start Date', c29.perioadaDe === '2026-08-01');
t('… și End Date', c29.perioadaLa === '2026-08-09');
const a29 = analizeaza47(c29, '2.9-corp.pdf');
t('adaptorul îl declară raport de REȚEA, nu scop nedeclarat', a29.scop === 'RETEA_AGREGAT');
t('… deci NU e atribuibil unui restaurant', a29.atribuibilPeRestaurant === false);
t('… iar motivul spune că e „Corporate"', (a29.motiv ?? '').includes('Corporate'));
t('un raport de companie fără magazine nu inventează niciunul', a29.rezumat.totalDeclarate === 0);
t('perioada ajunge în cheia folosită de aplicație', a29.perioada === '2026-08');

console.log('\n— A5. Cele trei etichete de scop de rețea —');
const corp = (eticheta: string, titlu = '4.1 Sales Journal') => parseSalesMix(matriceDinText(
  `${eticheta} Start Date: 06/15/2026
${titlu}
End Date: 06/21/2026
Sales Cash Reconciliation
Net Sales $4,541,475.65 Net Sales $4,541,475.65`));
for (const et of ['Corporate', 'All Stores', 'Multiple Selection']) {
  const x = corp(et);
  t(`„${et}" e recunoscut ca scop de rețea`, x.corporativ === true);
  t(`… cu eticheta EXACTĂ păstrată`, x.etichetaScop === et, x.etichetaScop ?? '(null)');
  t(`… și NU e citit ca nume de restaurant`, x.magazine.length === 0);
  t(`… iar adaptorul îl declară RETEA_AGREGAT`,
    analizeaza47(x, 'c.pdf').scop === 'RETEA_AGREGAT');
  t(`… neatribuibil unui restaurant`, analizeaza47(x, 'c.pdf').atribuibilPeRestaurant === false);
}
t('motivul citează eticheta reală, nu una fixă',
  (analizeaza47(corp('All Stores'), 'c.pdf').motiv ?? '').includes('All Stores'));
t('… și pentru „Corporate" la fel',
  (analizeaza47(corp('Corporate'), 'c.pdf').motiv ?? '').includes('Corporate'));
t('o etichetă NECUNOSCUTĂ nu e presupusă scop de rețea',
  corp('Regiunea Nord').corporativ === false,
  'necunoscut rămâne necunoscut, nu se ghicește');
t('… iar raportul rămâne cu scop nedeclarat, nu atribuit greșit',
  analizeaza47(corp('Regiunea Nord'), 'c.pdf').atribuibilPeRestaurant === false);
t('un raport de rețea cu listă de magazine citează numărul, nu eticheta',
  (() => {
    const x = parseSalesMix(matriceDinText(`Multiple Selection Fiscal Year: 2026
4.7 Sales Mix
Period: 8 Week: 4
8/17/2026 - 8/23/2026
Menu Item Name Qty Price Extension
Groups/Stores Selected for this Report
FRYDAY ORADEA, FRYDAY GALATI
Copyright © NCR Corporation 2022`));
    return (analizeaza47(x, 'c.pdf').motiv ?? '').includes('2 restaurante');
  })());

console.log('\n— B. Scopul fișierului se stabilește din antet —');
t('mai multe restaurante ⇒ raport de REȚEA',
  din('FRYDAY ORADEA, FRYDAY GALATI').scop === 'RETEA_AGREGAT');
t('un singur restaurant ⇒ raport pe restaurant',
  din('FRYDAY CLUJ MEMO').scop === 'RESTAURANT_UNIC');
t('fără antet de magazine ⇒ scop nedeclarat',
  analizeaza47(parseSalesMix(matriceDinText('4.7 Sales Mix\nBere Corona new 1 2.00 $2.00')), 'x.pdf').scop
    === 'SCOP_NEDECLARAT');
t('fiecare scop are o etichetă în română',
  Object.values(ETICHETA_SCOP_47).every(e => e.length > 0));

console.log('\n— C. Un raport de rețea NU devine datele unui restaurant —');
const retea = din('FRYDAY ORADEA, FRYDAY GALATI, FRYDAY CRAIOVA');
t('nu e atribuibil pe restaurant', retea.atribuibilPeRestaurant === false);
t('nu numește niciun restaurant unic', retea.restaurantUnic === null);
t('spune de ce, explicit', (retea.motiv ?? '').includes(MESAJ_AGREGAT.slice(0, 40)));
t('… și câte restaurante însumează', (retea.motiv ?? '').includes('3 restaurante'));
t('identitățile rămân toate cunoscute, deși nu se atribuie', retea.rezumat.matched === 3);
t('un raport fără scop declarat rostește formula de dovezi insuficiente',
  (analizeaza47(parseSalesMix(matriceDinText('4.7 Sales Mix')), 'x.pdf').motiv ?? '')
    === MESAJ_SCOP_NEDECLARAT);

console.log('\n— D. Un raport pe un singur restaurant se atribuie —');
const unic = din('FRYDAY CLUJ MEMO');
t('e atribuibil', unic.atribuibilPeRestaurant === true);
t('numește restaurantul', unic.restaurantUnic === 'FRYDAY CLUJ MEMO');
t('fără motiv de refuz', unic.motiv === null);
t('… dar tot NU inventează un storeId', unic.restaurante[0].storeId === null);
t('… și nu se declară verificat', unic.restaurante[0].verificat === false);
t('un singur restaurant NECUNOSCUT nu se atribuie',
  (() => { const x = din('FRYDAY INVENTAT SRL');
    return x.scop === 'RESTAURANT_UNIC' && !x.atribuibilPeRestaurant && x.restaurantUnic === null; })());
t('… și spune de ce', (din('FRYDAY INVENTAT SRL').motiv ?? '').length > 0);

console.log('\n— E. Numărătorile și motivele —');
const mixt = din('FRYDAY ORADEA, FRYDAY INVENTAT, FRYDAY GALATI');
t('total declarate', mixt.rezumat.totalDeclarate === 3);
t('matched', mixt.rezumat.matched === 2);
t('unmatched', mixt.rezumat.unmatched === 1);
t('ambiguous', mixt.rezumat.ambiguous === 0);
t('rezumatul pe status însumează totalul',
  Object.values(mixt.rezumat.peStatus).reduce((a, b) => a + b, 0) === 3);
t('fiecare nerezolvat produce un avertisment cu numele lui',
  mixt.avertismente.some(a => a.includes('FRYDAY INVENTAT')));
t('cele rezolvate NU produc avertismente', mixt.avertismente.length === 1);
t('un restaurant AMBIGUU produce și el un avertisment, cu motivul lui',
  (() => {
    const M: IntrareStoreMaster[] = [
      { displayName: 'FRYDAY NORD-VEST', storeId: null, aliases: [], source: 'legacy-4.7', verified: false },
      { displayName: 'Fryday  nord  vest', storeId: null, aliases: [], source: 'legacy-4.7', verified: false },
    ];
    const x = analizeaza47(parseSalesMix(matriceDinText(antet('FRYDAY NORD VEST, FRYDAY ORADEA'))), 'a.pdf', M);
    return x.rezumat.ambiguous === 1
      && x.avertismente.some(a => a.includes('FRYDAY NORD VEST') && a.includes('topească'));
  })(),
  'nu doar se numără — se spune care și de ce');
t('ambiguitatea se numără separat',
  (() => {
    const M: IntrareStoreMaster[] = [
      { displayName: 'FRYDAY NORD', storeId: null, aliases: [], source: 'legacy-4.7', verified: false },
      { displayName: 'Fryday  nord', storeId: null, aliases: [], source: 'legacy-4.7', verified: false },
    ];
    const x = analizeaza47(parseSalesMix(matriceDinText(antet('FRYDAY NORD X'))), 'a.pdf', M);
    return x.rezumat.ambiguous + x.rezumat.unmatched === 1;
  })());

console.log('\n— F. Proveniența fiecărei identități —');
const p0 = retea.restaurante[0];
t('poartă raportul', p0.raport === 'PMIX_47');
t('poartă perioada', p0.perioada === '2026-08');
t('poartă poziția din antet', p0.randSursa === 1);
t('… iar pozițiile cresc: al treilea restaurant e pe 3, nu tot pe 1',
  retea.restaurante[2].randSursa === 3 && retea.restaurante[1].randSursa === 2,
  retea.restaurante.map(x => x.randSursa).join(','));
t('poartă textul exact din fișier', p0.valoareSursa === 'FRYDAY ORADEA');
t('poartă metoda potrivirii', p0.metoda.length > 0);
t('rezultatul poartă numele fișierului', retea.fisier === '4.7.pdf');
t('rezultatul poartă intervalul raportului',
  retea.perioadaDe === '2026-08-17' && retea.perioadaLa === '2026-08-23');
t('… și cheia de perioadă folosită de aplicație', retea.perioada === '2026-08');

console.log('\n— G. Nu se atinge nimic —');
t('Store Master rămâne neschimbat',
  (() => { const inainte = JSON.stringify(STORE_MASTER);
    din('FRYDAY ORADEA'); din('FRYDAY INVENTAT');
    return JSON.stringify(STORE_MASTER) === inainte; })());
t('niciun restaurant nu se adaugă în master', STORE_MASTER.length === 30);
t('analiza e deterministă', JSON.stringify(din('FRYDAY ORADEA')) === JSON.stringify(din('FRYDAY ORADEA')));
t('rezumatul de o linie e lizibil',
  descrie47(retea).includes('Raport agregat pe rețea') && descrie47(retea).includes('3 restaurante identificate'));
t('liniile de vânzare se numără', retea.liniiTotal === 2, `${retea.liniiTotal}`);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
