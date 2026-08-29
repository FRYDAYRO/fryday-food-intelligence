// Master-ul real de restaurante FRYDAY: lista, selectorul și regula care ține totul —
// un restaurant fără identificator verificat nu primește niciodată datele altuia.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx } from '../src/lib/engine';
import {
  MESAJ_NEMAPAT, RESTAURANTE_FRYDAY, TOATE_RESTAURANTELE, cautaRestaurante, esteMapat,
  restaurantDupaNume,
} from '../src/lib/restaurante-fryday';
import {
  accesTower, alegeRestaurant, optiuniRestaurant, type SelectieFC,
} from '../src/lib/fc-tower';
import { contextAutorizare, scurgeri, stareAutorizata } from '../src/lib/fc-acces';
import { TowerProvider, type TowerCtx } from '../src/views/tower/context';
import { ContinutTower } from '../src/views/tower/ControlTower';
import SelectorRestaurant from '../src/views/tower/SelectorRestaurant';
import Bara from '../src/views/tower/Bara';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  \u2714', n, d); } else { fail++; console.log('  \u2718', n, d); } };

// Lista de referință, transcrisă din antetul raportului 4.7 („Groups/Stores Selected for
// this Report"). Testul compară modulul cu ACEASTA, nu cu el însuși.
const REFERINTA: string[] = [
  "FRYDAY ALBA IULIA",
  "FRYDAY ARAD ATRIUM",
  "FRYDAY BUCURESTI BANEASA",
  "FRYDAY Bucuresti Berceni DT",
  "FRYDAY BUCURESTI MALL",
  "FRYDAY BUCURESTI SUN PLAZA",
  "FRYDAY CLUJ IULIUS",
  "FRYDAY CLUJ MEMO",
  "FRYDAY CLUJ VIVO",
  "FRYDAY CONSTANTA CITY PARK",
  "FRYDAY CONSTANTA VIVO",
  "FRYDAY CRAIOVA",
  "FRYDAY CRAIOVA ELECTROPUTERE",
  "FRYDAY GALATI",
  "FRYDAY IASI MOLDOVA MALL",
  "FRYDAY IASI PALAS",
  "FRYDAY ORADEA",
  "FRYDAY PIATRA NEAMT DT",
  "FRYDAY PITESTI ARGES MALL",
  "FRYDAY PITESTI VIVO",
  "FRYDAY PLOIESTI DT",
  "FRYDAY RM VALCEA DT",
  "FRYDAY SIBIU PROMENADA",
  "FRYDAY SIBIU SELIMBAR",
  "FRYDAY SUCEAVA DT",
  "FRYDAY TARGOVISTE",
  "FRYDAY TG MURES PLAZA M",
  "FRYDAY TG MURES SHOPPING CITY",
  "FRYDAY TIMISOARA IULIUS TOWN",
  "FRYDAY VASLUI DT",
];

const S: AppState = { ...genereazaSeed(), locatii: [{ cod: 'L01', nume: 'FRYDAY Centru' }, { cod: 'L02', nume: 'FRYDAY Mall' }] };
const CTX = buildCtx(S);
const SEL: SelectieFC = {
  ancora: '2026-07-15', granularitate: 'LUNA', comparatie: 'PERIOADA_PRECEDENTA',
  scop: 'COMPANIE', locatie: null, canal: 'TOTAL',
};
const ADMIN = accesTower(S, { rol: 'ADMIN' }, false);
const MGR = accesTower(S, { rol: 'MANAGER', locatie: 'L02' }, true);

const ctxTower = (acces = ADMIN, extra: Partial<TowerCtx> = {}): TowerCtx => ({
  state: S, ctx: CTX, sel: SEL, setSel: () => undefined, acces, update: () => undefined, ...extra,
});
const randeaza = (el: unknown, acces = ADMIN, extra: Partial<TowerCtx> = {}) =>
  renderToStaticMarkup(h(TowerProvider, { value: ctxTower(acces, extra) }, el as never));

console.log('\n\u2014 A. Lista celor 30 de restaurante reale \u2014');
t('modulul conține exact 30 de restaurante', RESTAURANTE_FRYDAY.length === 30, `${RESTAURANTE_FRYDAY.length}`);
t('lista de referință are tot 30', REFERINTA.length === 30);
t('numele coincid EXACT cu cele recuperate din raportul 4.7',
  RESTAURANTE_FRYDAY.map(r => r.displayName).join('|') === REFERINTA.join('|'));
t('niciun nume duplicat', new Set(RESTAURANTE_FRYDAY.map(r => r.displayName)).size === 30);
t('niciun nume gol sau cu spații la capete',
  RESTAURANTE_FRYDAY.every(r => r.displayName.length > 0 && r.displayName === r.displayName.trim()));
t('toate poartă sursa legacy-4.7', RESTAURANTE_FRYDAY.every(r => r.source === 'legacy-4.7'));

console.log('\n\u2014 B. storeId rămâne null până la un export NCR \u2014');
t('NICIUN storeId inventat', RESTAURANTE_FRYDAY.every(r => r.storeId === null));
t('niciunul nu e marcat verificat', RESTAURANTE_FRYDAY.every(r => r.verified === false));
t('niciunul nu e considerat mapat', RESTAURANTE_FRYDAY.every(r => !esteMapat(r)));
t('niciun cod de tip L01/L02 nu s-a lipit de un restaurant real',
  !RESTAURANTE_FRYDAY.some(r => /^L\d+$/.test(String(r.storeId))));
t('modelul are exact câmpurile cerute, fără altele inventate',
  RESTAURANTE_FRYDAY.every(r => JSON.stringify(Object.keys(r).sort())
    === JSON.stringify(['displayName', 'source', 'storeId', 'verified'])));
t('un storeId adăugat dar neverificat NU face restaurantul mapat',
  !esteMapat({ displayName: 'X', storeId: '1234', source: 'legacy-4.7', verified: false }));

console.log('\n\u2014 C. Căutarea \u2014');
t('căutarea goală întoarce toate cele 30', cautaRestaurante('').length === 30);
t('caută după oraș', cautaRestaurante('cluj').length === 3, cautaRestaurante('cluj').map(r => r.displayName).join(', '));
t('caută după mall', cautaRestaurante('vivo').length === 3);
t('caută pe mai multe cuvinte', cautaRestaurante('iasi palas').length === 1);
t('căutarea ignoră majusculele', cautaRestaurante('ALBA').length === 1);
t('căutarea ignoră diacriticele', cautaRestaurante('timișoara').length === 1);
t('o căutare fără potriviri întoarce zero, nu tot', cautaRestaurante('zzz').length === 0);
t('căutarea nu inventează restaurante', cautaRestaurante('bucuresti').every(r => REFERINTA.includes(r.displayName)));

console.log('\n\u2014 D. Opțiunile selectorului, pe rol \u2014');
const oAdmin = optiuniRestaurant(S, ADMIN);
t('managementul primește „Toate restaurantele"', oAdmin.toate?.valoare === TOATE_RESTAURANTELE);
t('management: cele 30 de restaurante reale sunt în listă', oAdmin.reale.length === 30);
t('management: locațiile cu date apar separat', oAdmin.dinDate.length === 2);
t('restaurantele reale sunt marcate FĂRĂ date', oAdmin.reale.every(o => !o.areDate && o.motiv === MESAJ_NEMAPAT));
t('locațiile din date sunt marcate CU date', oAdmin.dinDate.every(o => o.areDate));
t('căutarea filtrează opțiunile', optiuniRestaurant(S, ADMIN, 'sibiu').reale.length === 2);

const oMgr = optiuniRestaurant(S, MGR);
t('managerul e blocat la restaurantul lui', oMgr.blocatLa === 'L02');
t('managerul NU primește „Toate restaurantele"', oMgr.toate === null);
t('managerul nu primește master-ul de 30 — nu poate ieși din scop prin selector', oMgr.reale.length === 0);
t('managerul vede exact o opțiune, a lui', oMgr.dinDate.length === 1 && oMgr.dinDate[0].valoare === 'L02');
t('numele celuilalt restaurant nu apare în opțiunile managerului',
  !JSON.stringify(oMgr).includes('L01'));

console.log('\n— E. Ce se întâmplă la alegere —');
const rezToate = alegeRestaurant(S, { ...SEL, scop: 'RESTAURANT', locatie: 'L01' }, ADMIN, TOATE_RESTAURANTELE);
t('„Toate restaurantele" duce la scopul de companie',
  rezToate.fel === 'COMPANIE' && rezToate.sel.scop === 'COMPANIE' && rezToate.sel.locatie === null);
t('„Toate restaurantele" e REFUZAT unui manager',
  alegeRestaurant(S, SEL, MGR, TOATE_RESTAURANTELE).fel === 'REFUZAT');
t('o locație reală cu date mută scopul pe ea',
  (() => { const r = alegeRestaurant(S, SEL, ADMIN, 'L01');
    return r.fel === 'RESTAURANT' && r.sel.locatie === 'L01'; })());
t('un restaurant real nemapat NU mută scopul — se declară nemapat',
  alegeRestaurant(S, SEL, ADMIN, 'FRYDAY CLUJ MEMO').fel === 'NEMAPAT');
t('… și poartă exact mesajul cerut',
  (() => { const r = alegeRestaurant(S, SEL, ADMIN, 'FRYDAY CLUJ MEMO');
    return r.fel === 'NEMAPAT' && r.mesaj === MESAJ_NEMAPAT; })());
t('toate cele 30 se comportă la fel: nemapate, fără excepții',
  RESTAURANTE_FRYDAY.every(r => alegeRestaurant(S, SEL, ADMIN, r.displayName).fel === 'NEMAPAT'));
t('un nume inexistent nu devine locație',
  ['NEMAPAT', 'REFUZAT'].includes(alegeRestaurant(S, SEL, ADMIN, 'FRYDAY INVENTAT').fel));

console.log('\n— F. Coliziunea de nume: orașul nu e cheie —');
t('cele trei restaurante din Cluj sunt intrări DISTINCTE',
  new Set(['FRYDAY CLUJ IULIUS', 'FRYDAY CLUJ MEMO', 'FRYDAY CLUJ VIVO']
    .map(n => restaurantDupaNume(n)?.displayName)).size === 3);
t('niciunul dintre ele nu se leagă de vreo locație din date',
  ['FRYDAY CLUJ IULIUS', 'FRYDAY CLUJ MEMO', 'FRYDAY CLUJ VIVO']
    .every(n => alegeRestaurant(S, SEL, ADMIN, n).fel === 'NEMAPAT'));
t('o locație numită la fel ca un restaurant real NU îi împrumută datele',
  (() => {
    // capcana: cineva importă un fișier care creează locația „FRYDAY CLUJ MEMO"
    const capcana: AppState = { ...S, locatii: [...S.locatii, { cod: 'FRYDAY CLUJ MEMO', nume: 'FRYDAY CLUJ MEMO' }] };
    const acc = accesTower(capcana, { rol: 'ADMIN' }, false);
    // master-ul are prioritate: numele rămâne nemapat, nu preia locația omonimă
    return alegeRestaurant(capcana, SEL, acc, 'FRYDAY CLUJ MEMO').fel === 'NEMAPAT';
  })(),
  'potrivirea după nume rămâne interzisă chiar și la potrivire exactă');
t('două restaurante din același oraș nu se confundă la căutare',
  cautaRestaurante('cluj memo').length === 1);

console.log('\n— G. Selectorul se randează, derulează și caută —');
const htmlSel = randeaza(h(SelectorRestaurant, {
  valoare: TOATE_RESTAURANTELE, eticheta: 'Toate restaurantele', onAlege: () => undefined, deschisInitial: true,
}));
t('selectorul se randează', htmlSel.includes('data-zona="selector-restaurant"'));
t('lista se deschide', htmlSel.includes('data-zona="lista-restaurante"'));
t('lista chiar derulează (înălțime limitată + scroll propriu)',
  htmlSel.includes('max-h-72') && htmlSel.includes('overflow-y-auto'));
t('are câmp de căutare', htmlSel.includes('data-camp="cauta-restaurant"'));
t('toate cele 30 de nume apar în listă',
  RESTAURANTE_FRYDAY.every(r => htmlSel.includes(`data-optiune="${r.displayName}"`)));
t('„Toate restaurantele" apare ca opțiune', htmlSel.includes(`data-optiune="${TOATE_RESTAURANTELE}"`));
t('selecția curentă e marcată vizibil', htmlSel.includes('aria-selected="true"'));
t('restaurantele nemapate sunt marcate „fără date"',
  htmlSel.includes('data-are-date="0"') && htmlSel.includes('fără date'));
t('locațiile cu date sunt marcate ca atare', htmlSel.includes('data-are-date="1"'));
t('grupurile sunt separate', htmlSel.includes('data-grup="Restaurante FRYDAY"')
  && htmlSel.includes('data-grup="Locații cu date"'));
t('lista are rol de listbox accesibil', htmlSel.includes('role="listbox"') && htmlSel.includes('role="option"'));
t('panoul se adaptează pe mobil (lățime limitată de ecran)', htmlSel.includes('calc(100vw-2rem)'));
t('bara de control folosește selectorul, nu vechiul dropdown',
  randeaza(h(Bara)).includes('data-zona="selector-restaurant"'));

console.log('\n— … iar managerului selectorul îi rămâne blocat —');
const htmlMgr = randeaza(h(SelectorRestaurant, {
  valoare: 'L02', eticheta: 'L02', onAlege: () => undefined, deschisInitial: true,
}), MGR);
t('butonul e dezactivat pentru manager', htmlMgr.includes('disabled'));
t('lista NU se deschide pentru manager', !htmlMgr.includes('data-zona="lista-restaurante"'));
t('niciun nume din master nu ajunge la manager',
  !RESTAURANTE_FRYDAY.some(r => htmlMgr.includes(r.displayName)));
t('nici numele celuilalt restaurant', !htmlMgr.includes('L01'));

console.log('\n— H. Un restaurant nemapat nu primește NICIO cifră —');
const htmlNemapat = randeaza(h(ContinutTower, { initial: 'OVERVIEW' }), ADMIN, { nemapat: 'FRYDAY CLUJ MEMO' });
t('ecranul arată panoul de restaurant nemapat', htmlNemapat.includes('data-zona="restaurant-nemapat"'));
t('rostește exact formula cerută', htmlNemapat.includes(MESAJ_NEMAPAT));
t('numele restaurantului ales e afișat', htmlNemapat.includes('FRYDAY CLUJ MEMO'));
t('NU se randează conținutul secțiunii', !htmlNemapat.includes('data-zona="kpi"'));
t('nicio cifră de Food Cost nu apare pe ecran', !/\d+[,.]\d+\s*%/.test(htmlNemapat));
t('niciun cod de locație din date nu se strecoară',
  !htmlNemapat.includes('L01') && !htmlNemapat.includes('L02'));
t('… deși aceleași date randează normal fără restaurantul nemapat',
  randeaza(h(ContinutTower, { initial: 'OVERVIEW' })).includes('data-zona="kpi"'),
  'dovada că blocarea vine din selecție, nu din lipsa datelor');

console.log('\n— I. Autorizarea rămâne cea din PR #14, neschimbată de selector —');
const aMgr = contextAutorizare(S, { rol: 'MANAGER', locatie: 'L02', email: 'm@f.ro' }, true);
const sMgr = stareAutorizata(S, aMgr);
t('proiecția managerului nu are scurgeri', scurgeri(sMgr, aMgr).length === 0);
t('selectorul nu adaugă niciun drept: opțiunile managerului rămân una singură',
  optiuniRestaurant(sMgr, MGR).dinDate.length === 1);
t('un manager care cere un restaurant real prin selector NU primește date',
  ['NEMAPAT', 'REFUZAT'].includes(alegeRestaurant(S, SEL, MGR, 'FRYDAY CLUJ MEMO').fel));
t('un manager care cere alt restaurant din date e REFUZAT',
  alegeRestaurant(S, SEL, MGR, 'L01').fel === 'REFUZAT');
t('… cu motiv, nu tăcut',
  (() => { const r = alegeRestaurant(S, SEL, MGR, 'L01'); return r.fel === 'REFUZAT' && r.motiv.length > 0; })());
t('managerul nu poate ajunge la companie prin selector',
  alegeRestaurant(S, SEL, MGR, TOATE_RESTAURANTELE).fel === 'REFUZAT');
// un rol FĂRĂ restaurant impus, dar și fără drept de companie: cazul pe care ramura de
// manager nu-l acoperă, fiindcă acolo `toate` e null din construcție
const FARA_COMPANIE = (() => {
  const a = accesTower(S, { rol: 'ANALIST', email: 'x@f.ro' }, true);
  return { ...a, poateVedeaCompania: false, context: { ...a.context, companyAccess: false, storeId: null } };
})();
t('un rol fără drept de companie NU primește „Toate restaurantele", chiar fără restaurant impus',
  optiuniRestaurant(S, FARA_COMPANIE).toate === null);
t('… iar dacă îl cere direct, e refuzat',
  alegeRestaurant(S, SEL, FARA_COMPANIE, TOATE_RESTAURANTELE).fel === 'REFUZAT');

// apărare în adâncime: chiar dacă starea NU a fost proiectată, opțiunile nu au voie să
// scurgă restaurante din afara drepturilor — selectorul nu se bazează pe altcineva
const RESTRANS = (() => {
  const a = accesTower(S, { rol: 'ANALIST', email: 'y@f.ro' }, true);
  return { ...a, locatiiVizibile: ['L02'], context: { ...a.context, allowedStoreIds: ['L02'], storeId: null } };
})();
t('pe starea NEPROIECTATĂ, opțiunile tot nu conțin restaurantul nepermis',
  (() => {
    const o = optiuniRestaurant(S, RESTRANS);
    return o.dinDate.every(x => x.valoare === 'L02') && !JSON.stringify(o.dinDate).includes('L01');
  })(),
  'selectorul filtrează el însuși, nu se bazează pe proiecție');
t('… și alegerea celui nepermis rămâne refuzată',
  alegeRestaurant(S, SEL, RESTRANS, 'L01').fel === 'REFUZAT');

t('accesul de companie rămâne rezervat rolurilor care îl au',
  optiuniRestaurant(S, ADMIN).toate !== null && optiuniRestaurant(S, MGR).toate === null);

console.log('\n— J. Manipulare: selector, URL, filtre —');
t('o valoare fabricată în selector nu devine locație',
  ['NEMAPAT', 'REFUZAT'].includes(alegeRestaurant(S, SEL, MGR, 'L01; DROP').fel));
t('un cod de locație inexistent nu produce date — e refuzat sau declarat nemapat',
  ['REFUZAT', 'NEMAPAT'].includes(alegeRestaurant(S, SEL, ADMIN, 'LX9').fel),
  alegeRestaurant(S, SEL, ADMIN, 'LX9').fel);
t('valoarea goală nu trece drept „toată rețeaua" pentru manager',
  alegeRestaurant(S, SEL, MGR, '').fel !== 'COMPANIE');
t('un rol regional cu companie, dar limitat, nu primește restaurantele străine',
  (() => {
    const reg = { ...accesTower(S, { rol: 'ANALIST', email: 'r@f.ro' }, true) };
    const ctxReg = { ...reg.context, companyAccess: true, storeId: null, allowedStoreIds: ['L02'] };
    const acc = { ...reg, context: ctxReg, locatiiVizibile: ['L02'] };
    const o = optiuniRestaurant(stareAutorizata(S, ctxReg), acc);
    return !JSON.stringify(o.dinDate).includes('L01');
  })());
t('numele real nu poate fi folosit ca storeId nici prin ocolire',
  RESTAURANTE_FRYDAY.every(r => {
    const rez = alegeRestaurant(S, SEL, ADMIN, r.displayName);
    return rez.fel !== 'RESTAURANT';
  }));
t('starea reală rămâne neatinsă de orice alegere din selector',
  (() => {
    const inainte = JSON.stringify(S);
    RESTAURANTE_FRYDAY.forEach(r => alegeRestaurant(S, SEL, ADMIN, r.displayName));
    alegeRestaurant(S, SEL, ADMIN, TOATE_RESTAURANTELE);
    return JSON.stringify(S) === inainte;
  })());

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
