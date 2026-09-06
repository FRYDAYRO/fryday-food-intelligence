// Autorizare și izolarea datelor între restaurante.
//
// Ce se verifică:
//   contextul canonic : role · storeId · allowedStoreIds · companyAccess · channelAccess
//   proiecția de date : motoarele NU primesc rândurile altui restaurant — nu sunt acolo
//   porțile           : companie, restaurant străin, canal, scriere, import — refuz explicit
//   intrarea externă  : URL / deep link / stare veche nu pot lărgi drepturile
//   Advisor           : dosarul unui manager nu pomenește alt restaurant, nici prin cifre
//   simulare          : rulează doar pe scopul autorizat
//   audit             : acțiunile importante lasă urmă, inclusiv refuzurile
//   regresie          : pentru cine are acces la tot, nimic nu se schimbă
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx } from '../src/lib/engine';
import { analizaTimeline } from '../src/lib/fc-timeline';
import { bridgeFC } from '../src/lib/fc-bridge';
import { analizaIngrediente } from '../src/lib/fc-ingrediente';
import { simuleazaFC } from '../src/lib/fc-simulare';
import { pregatesteImport } from '../src/lib/import-center';
import {
  ENFORCEMENT_LOCAL, MAX_AUDIT_ACCES, TOATE_CANALELE, auditulActorului, canalePermise,
  contextAutorizare, etichetaScop, inregistreazaAcces, intrareAudit, potVedeaRestaurantul,
  restauranteVizibile, scopDinParametri, scurgeri, stareAutorizata, verificaCerere,
  verificaImport, verificaScriere,
  type ContextAutorizare,
} from '../src/lib/fc-acces';
import {
  accesTower, cerereBaza, cerereDin, normalizeazaSelectie, poateVedeaLocatia,
  selectieImplicita, type SelectieFC,
} from '../src/lib/fc-tower';
import { dosarAdvisor, verificaCerereAdvisor } from '../src/lib/fc-advisor';
import { naratorDeterminist } from '../src/lib/fc-advisor-llm';
import { TowerProvider, type TowerCtx } from '../src/views/tower/context';
import { ContinutTower } from '../src/views/tower/ControlTower';
import Bara from '../src/views/tower/Bara';
import type { AppState, Material29 } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

// ————————————————————————————————————————————————————————— fixtura

const mat = (loc: string | null, material: string, denumire: string, categorie: string, cost: number): Material29 =>
  ({ perioada: '2026-07', locatie: loc, material, denumire, categorie, cant: null, um: null, costActual: cost, costTeoretic: null });

const baza = genereazaSeed();
const s0: AppState = {
  ...baza,
  materiale29: [
    mat('L01', 'I001', 'Piept de pui', 'Carne și pui', 4000),
    mat('L02', 'I005', 'Chiflă burger', 'Panificație', 1200),
    mat(null, 'FARA-LOC', 'Linie agregată', 'Panificație', 250),
  ],
  waste: [{ locatie: 'L01', perioada: '2026-07', ingredient: 'I001', cant: 3, um: 'kg' },
    { locatie: 'L02', perioada: '2026-07', ingredient: 'I005', cant: 2, um: 'kg' }],
  inventar: [{ locatie: 'L01', perioada: '2026-07', ingredient: 'I001', consumReal: 90, um: 'kg' },
    { locatie: 'L02', perioada: '2026-07', ingredient: 'I005', consumReal: 40, um: 'kg' }],
  versiuniImport: [
    { id: 'PMIX_47#1', tip: 'PMIX_47', nr: 1, fisier: 'pmix L01.xlsx', amprenta: 'a1', dataEfectiva: '2026-07-01',
      importatLa: '2026-07-01T00:00:00.000Z', activa: true, scop: 'RESTAURANT', restaurante: ['L01'], perioada: '2026-07', randuri: 10 },
    { id: 'PMIX_47#2', tip: 'PMIX_47', nr: 2, fisier: 'pmix L02.xlsx', amprenta: 'a2', dataEfectiva: '2026-07-01',
      importatLa: '2026-07-01T00:00:00.000Z', activa: true, scop: 'RESTAURANT', restaurante: ['L02'], perioada: '2026-07', randuri: 10 },
    { id: 'RETETAR#1', tip: 'RETETAR', nr: 1, fisier: 'retetar.xlsx', amprenta: 'a3', dataEfectiva: '2026-06-01',
      importatLa: '2026-06-01T00:00:00.000Z', activa: true, scop: 'COMUN', restaurante: [], perioada: null, randuri: 99 },
    { id: 'NBO_29#1', tip: 'NBO_29', nr: 1, fisier: '2.9 companie.xlsx', amprenta: 'a4', dataEfectiva: '2026-07-01',
      importatLa: '2026-07-01T00:00:00.000Z', activa: true, scop: 'COMPANIE', restaurante: [], perioada: '2026-07', randuri: 50 },
  ],
  auditImport: [
    { id: 'A1', actor: 'analist', data: '2026-07-01T00:00:00.000Z', fisier: 'pmix L01.xlsx', tip: 'PMIX_47',
      tipIntern: 'PMIX', perioada: '2026-07', scop: 'RESTAURANT', restaurante: ['L01'], randuri: 10, importate: 10,
      validare: 'VALIDAT', amprenta: 'a1', versiune: 'PMIX_47#1', activat: true },
    { id: 'A2', actor: 'analist', data: '2026-07-01T00:00:00.000Z', fisier: 'pmix L02.xlsx', tip: 'PMIX_47',
      tipIntern: 'PMIX', perioada: '2026-07', scop: 'RESTAURANT', restaurante: ['L02'], randuri: 10, importate: 10,
      validare: 'VALIDAT', amprenta: 'a2', versiune: 'PMIX_47#2', activat: true },
  ],
  auditAcces: [],
};

const A_TOP = contextAutorizare(s0, { rol: 'ADMIN', email: 'admin@fryday.ro' }, false);
const A_ANALIST = contextAutorizare(s0, { rol: 'ANALIST', email: 'analist@fryday.ro' }, true);
const A_MGR = contextAutorizare(s0, { rol: 'MANAGER', locatie: 'L02', email: 'mgr@fryday.ro' }, true);
const A_MGR_NEFILTRAT = contextAutorizare(s0, { rol: 'MANAGER', locatie: 'L02' }, false);
const A_LOCAL = contextAutorizare(s0, null, false);

const SEL: SelectieFC = {
  ancora: '2026-07-15', granularitate: 'LUNA', comparatie: 'PERIOADA_PRECEDENTA',
  scop: 'COMPANIE', locatie: null, canal: 'TOTAL',
};
const ACUM = '2026-08-29T12:00:00.000Z';

// ————————————————————————————————————————————————————————— contextul canonic

console.log('— Contextul canonic de autorizare —');
t('MANAGER cu restaurant → STORE_MANAGER', A_MGR.role === 'STORE_MANAGER');
t('ADMIN → TOP_MANAGEMENT', A_TOP.role === 'TOP_MANAGEMENT');
t('ANALIST → TOP_MANAGEMENT', A_ANALIST.role === 'TOP_MANAGEMENT');
t('MANAGER fără restaurant NU devine store manager (nu are ce restrânge)',
  contextAutorizare(s0, { rol: 'MANAGER' }, true).role === 'TOP_MANAGEMENT');
t('storeId e restaurantul propriu, null pentru management',
  A_MGR.storeId === 'L02' && A_TOP.storeId === null);
t('allowedStoreIds conține exact restaurantul propriu',
  A_MGR.allowedStoreIds.join(',') === 'L02');
t('allowedStoreIds al managementului conține toate restaurantele',
  A_TOP.allowedStoreIds.join(',') === 'L01,L02');
t('companyAccess e fals pentru manager, adevărat pentru management',
  A_MGR.companyAccess === false && A_TOP.companyAccess === true);
t('channelAccess conține cele trei canale', A_MGR.channelAccess.join(',') === TOATE_CANALELE.join(','));
t('actorul e identificatorul deja folosit, nu date personale în plus',
  A_MGR.actor === 'mgr@fryday.ro' && A_LOCAL.actor === 'local');
t('eticheta de scop nu e ambiguă',
  etichetaScop(A_TOP) === 'Companie' && etichetaScop(A_MGR) === 'Restaurant: L02');

console.log('\n— Enforcement: unde e impusă restricția, spus pe față —');
t('manager filtrat de server → enforcement SERVER', A_MGR.enforcement === 'SERVER');
t('manager NEfiltrat → CLIENT_ONLY, cu motiv explicit',
  A_MGR_NEFILTRAT.enforcement === 'CLIENT_ONLY' && A_MGR_NEFILTRAT.motivEnforcement.includes('securitate'));
t('fără server → CLIENT_ONLY, iar textul nu pretinde securitate',
  A_LOCAL.enforcement === 'CLIENT_ONLY' && A_LOCAL.motivEnforcement === ENFORCEMENT_LOCAL);
t('motivul spune că oricine are fișierul are tot', ENFORCEMENT_LOCAL.includes('acces la tot'));

// ————————————————————————————————————————————————————————— proiecția

console.log('\n— Proiecția: rândurile altui restaurant NU ajung la motoare —');
const sMgr = stareAutorizata(s0, A_MGR);
t('vânzările altui restaurant lipsesc', sMgr.vanzari.every(v => v.locatie === 'L02'));
t('… și chiar existau în starea întreagă', s0.vanzari.some(v => v.locatie === 'L01'));
t('salesReport-ul e filtrat', sMgr.salesReport.every(x => x.locatie === 'L02'));
t('2.9 pe categorie e filtrat', sMgr.linii29.every(x => x.locatie === 'L02'));
t('2.9 pe material e filtrat', sMgr.materiale29.every(x => x.locatie === 'L02' || x.locatie === null));
t('rândurile 2.9 fără restaurant rămân — nu aparțin altcuiva',
  sMgr.materiale29.some(x => x.locatie === null));
t('waste-ul e filtrat', sMgr.waste.every(x => x.locatie === 'L02'));
t('inventarul e filtrat', sMgr.inventar.every(x => x.locatie === 'L02'));
t('labor-ul e filtrat', sMgr.labor.every(x => x.locatie === 'L02'));
t('costurile de operare sunt filtrate', sMgr.costuriOperare.every(x => x.locatie === 'L02'));
t('lista de restaurante conține doar restaurantul propriu',
  sMgr.locatii.map(l => l.cod).join(',') === 'L02');
t('ținta de rețea rămâne, ținta altui restaurant nu',
  sMgr.tinte.some(x => x.locatie === 'RETEA') && !sMgr.tinte.some(x => x.locatie === 'L01'));
t('versiunile de import ale altui restaurant lipsesc',
  !(sMgr.versiuniImport ?? []).some(v => v.restaurante.includes('L01')));
t('versiunile COMUNE rămân — sunt ale tuturor',
  (sMgr.versiuniImport ?? []).some(v => v.scop === 'COMUN'));
t('versiunile de COMPANIE nu ajung la manager',
  !(sMgr.versiuniImport ?? []).some(v => v.scop === 'COMPANIE'));
t('auditul de import al altui restaurant lipsește',
  !(sMgr.auditImport ?? []).some(x => x.restaurante.includes('L01')));

console.log('\n— Datele comune rămân întregi: fără ele nu se poate calcula nimic —');
t('rețetarul rămâne', sMgr.retete.length === s0.retete.length);
t('nomenclatorul rămâne', sMgr.ingrediente.length === s0.ingrediente.length);
t('produsele rămân', sMgr.produse.length === s0.produse.length);
t('istoricul de prețuri rămâne (prețurile sunt pe rețea)',
  (sMgr.istoricPreturi ?? []).length === (s0.istoricPreturi ?? []).length);

console.log('\n— Plasa finală: niciun rând străin, în nicio colecție —');
t('detectorul nu găsește nicio scurgere în starea managerului', scurgeri(sMgr, A_MGR).length === 0,
  JSON.stringify(scurgeri(sMgr, A_MGR)));
t('… iar pe starea neproiectată ar fi găsit', scurgeri(s0, A_MGR).length > 0);
t('detectorul numește colecția și restaurantul scurs',
  scurgeri(s0, A_MGR).every(x => x.colectie.length > 0 && x.locatie.length > 0));

console.log('\n— Pentru cine are acces la tot, proiecția nu schimbă nimic —');
t('managementul primește exact același obiect', stareAutorizata(s0, A_TOP) === s0);
t('… deci nicio analiză existentă nu se schimbă',
  JSON.stringify(analizaTimeline(stareAutorizata(s0, A_TOP), buildCtx(s0), cerereDin(SEL)).metrici)
  === JSON.stringify(analizaTimeline(s0, buildCtx(s0), cerereDin(SEL)).metrici));

// ————————————————————————————————————————————————————————— porțile

console.log('\n— Porțile refuză explicit, nu ajustează tăcut —');
t('managerul nu are acces la companie',
  !verificaCerere(A_MGR, { locatie: null }).permis
  && verificaCerere(A_MGR, { locatie: null }).cod === 'COMPANIE_NEAUTORIZATA');
t('managementul are acces la companie', verificaCerere(A_TOP, { locatie: null }).permis);
t('managerul nu are acces la alt restaurant',
  !verificaCerere(A_MGR, { locatie: 'L01' }).permis
  && verificaCerere(A_MGR, { locatie: 'L01' }).cod === 'RESTAURANT_NEAUTORIZAT');
t('managerul are acces la restaurantul lui', verificaCerere(A_MGR, { locatie: 'L02' }).permis);
t('managementul are acces la toate restaurantele',
  verificaCerere(A_TOP, { locatie: 'L01' }).permis && verificaCerere(A_TOP, { locatie: 'L02' }).permis);
t('fiecare refuz poartă un motiv citibil',
  (verificaCerere(A_MGR, { locatie: 'L01' }).motiv ?? '').includes('L01'));
t('un canal în afara drepturilor e refuzat',
  !verificaCerere({ ...A_MGR, channelAccess: ['INSTORE'] }, { canal: 'DELIVERY' }).permis);
t('un canal permis trece', verificaCerere(A_MGR, { canal: 'DELIVERY' }).permis);
t('o verificare DOAR de canal nu se citește ca cerere de companie',
  verificaCerere(A_MGR, { canal: 'TOTAL' }).permis);
t('… dar `locatie: null` explicit înseamnă companie și se refuză',
  !verificaCerere(A_MGR, { locatie: null, canal: 'TOTAL' }).permis);
t('scrierea e refuzată managerului, permisă managementului',
  !verificaScriere(A_MGR).permis && verificaScriere(A_TOP).permis);
t('potVedeaRestaurantul e consecvent cu poarta',
  potVedeaRestaurantul(A_MGR, 'L02') && !potVedeaRestaurantul(A_MGR, 'L01'));
t('canalele efective respectă drepturile',
  canalePermise(A_MGR).join(',') === 'INSTORE,DELIVERY'
  && canalePermise({ ...A_MGR, channelAccess: ['INSTORE'] }).join(',') === 'INSTORE');

console.log('\n— Poarta de import —');
t('managerul nu poate importa deloc',
  !verificaImport(A_MGR, { scop: 'COMUN', restaurante: [] }).permis);
t('managementul poate importa comun', verificaImport(A_TOP, { scop: 'COMUN', restaurante: [] }).permis);
t('managementul poate importa pe companie', verificaImport(A_TOP, { scop: 'COMPANIE', restaurante: [] }).permis);
t('un import cu restaurante în afara drepturilor e refuzat',
  !verificaImport({ ...A_TOP, allowedStoreIds: ['L02'], role: 'TOP_MANAGEMENT' },
    { scop: 'RESTAURANT', restaurante: ['L01', 'L02'] }).permis);
t('… iar refuzul numește restaurantul străin',
  (verificaImport({ ...A_TOP, allowedStoreIds: ['L02'] },
    { scop: 'RESTAURANT', restaurante: ['L01'] }).motiv ?? '').includes('L01'));

// ————————————————————————————————————————————————————————— intrarea dinspre exterior

console.log('\n— URL / deep link / stare veche nu pot lărgi drepturile —');
const urlMgr = scopDinParametri(s0, A_MGR, { scop: 'RESTAURANT', locatie: 'L01' });
t('un URL care cere alt restaurant e refuzat', urlMgr.locatie === 'L02' && urlMgr.refuzuri.length === 1);
t('… iar refuzul e raportat, nu înghițit', urlMgr.refuzuri[0].cod === 'RESTAURANT_NEAUTORIZAT');
const urlComp = scopDinParametri(s0, A_MGR, { scop: 'COMPANIE' });
t('un URL care cere compania e refuzat pentru manager',
  urlComp.companie === false && urlComp.locatie === 'L02'
  && urlComp.refuzuri[0].cod === 'COMPANIE_NEAUTORIZATA');
t('managementul primește ce cere', scopDinParametri(s0, A_TOP, { scop: 'COMPANIE' }).companie === true);
t('managementul poate cere orice restaurant existent',
  scopDinParametri(s0, A_TOP, { scop: 'RESTAURANT', locatie: 'L01' }).locatie === 'L01');
t('un restaurant inexistent e refuzat cu cod propriu',
  scopDinParametri(s0, A_TOP, { scop: 'RESTAURANT', locatie: 'HACK' }).refuzuri[0].cod === 'RESTAURANT_INEXISTENT');
t('un canal inventat nu trece',
  scopDinParametri(s0, A_TOP, { canal: 'PIRAT' }).canal === 'TOTAL');
t('parametri complet goi dau un scop sigur, nu o excepție',
  scopDinParametri(s0, A_MGR, {}).locatie === 'L02');
t('un canal restricționat cade pe primul permis',
  scopDinParametri(s0, { ...A_MGR, channelAccess: ['INSTORE'] }, { canal: 'DELIVERY' }).canal === 'INSTORE');

console.log('\n— Manipularea filtrelor și a stării nu ajută —');
const accMgr = accesTower(s0, { rol: 'MANAGER', locatie: 'L02' }, true);
t('o selecție „Companie" fabricată de mână devine restaurantul propriu',
  normalizeazaSelectie(s0, { ...SEL, scop: 'COMPANIE' }, accMgr).locatie === 'L02');
t('o selecție care țintește alt restaurant e corectată',
  normalizeazaSelectie(s0, { ...SEL, scop: 'RESTAURANT', locatie: 'L01' }, accMgr).locatie === 'L02');
t('poateVedeaLocatia trece prin contextul canonic',
  !poateVedeaLocatia(accMgr, 'L01') && poateVedeaLocatia(accMgr, 'L02'));
t('selecția implicită a managerului e restaurantul lui',
  selectieImplicita(s0, accMgr).locatie === 'L02');
t('restaurantele vizibile în interfață vin din context',
  restauranteVizibile(s0, A_MGR).join(',') === 'L02'
  && restauranteVizibile(s0, A_TOP).join(',') === 'L01,L02');

console.log('\n— Chiar cu cererea fabricată, motorul nu are ce găsi —');
const ctxMgr = buildCtx(sMgr);
const ctxTopPartial = buildCtx(s0);
const fortat: SelectieFC = { ...SEL, scop: 'RESTAURANT', locatie: 'L01' };
const analizaFortata = analizaTimeline(sMgr, ctxMgr, cerereDin(fortat));
t('o analiză forțată pe L01, rulată pe starea proiectată, nu are vânzări',
  !analizaFortata.disponibil || (analizaFortata.metrici?.salesRON ?? 0) === 0);
t('puntea forțată pe L01 nu are rânduri 2.9 ale lui',
  bridgeFC(sMgr, ctxMgr, cerereBaza(fortat)).randuri.every(r => r.locatie !== 'L01'));
t('analiza de companie rulată pe starea managerului = analiza restaurantului lui',
  aprox(analizaTimeline(sMgr, ctxMgr, cerereDin(SEL)).metrici?.salesRON ?? 0,
    analizaTimeline(sMgr, ctxMgr, cerereDin({ ...SEL, scop: 'RESTAURANT', locatie: 'L02' })).metrici?.salesRON ?? 0));

// ————————————————————————————————————————————————————————— Advisor și simulare

console.log('\n— Advisor: niciun restaurant străin, nici măcar prin cifre —');
const dosarMgr = dosarAdvisor(s0, buildCtx(s0), { selectie: SEL, acces: accMgr });
t('dosarul managerului e pe restaurantul lui', dosarMgr.scop.nivel === 'L02');
t('scopul autorizat conține doar restaurantul lui',
  dosarMgr.scop.restauranteAutorizate.join(',') === 'L02');
t('dosarul NU pomenește alt restaurant nicăieri',
  !new RegExp('\\bL01\\b').test(JSON.stringify(dosarMgr)));
t('naratiunea NU pomenește alt restaurant',
  !new RegExp('\\bL01\\b').test(naratorDeterminist(dosarMgr)));
t('nici cerând explicit L01 nu primește L01',
  dosarAdvisor(s0, buildCtx(s0), { selectie: { ...SEL, scop: 'RESTAURANT', locatie: 'L01' }, acces: accMgr })
    .scop.nivel === 'L02');
t('cifrele dosarului sunt cele ale restaurantului propriu, nu ale rețelei',
  aprox(dosarMgr.stare.vanzari.valoare!,
    analizaTimeline(sMgr, ctxMgr, cerereDin({ ...SEL, scop: 'RESTAURANT', locatie: 'L02' })).metrici!.salesRON, 0.01));
t('poarta de Advisor refuză o cerere în afara scopului',
  !verificaCerereAdvisor(accMgr, { ...SEL, scop: 'RESTAURANT', locatie: 'L01' }).permis);
t('… și o acceptă pe cea din scop',
  verificaCerereAdvisor(accMgr, { ...SEL, scop: 'RESTAURANT', locatie: 'L02' }).permis);
t('dosarul managementului chiar conține ambele restaurante',
  new RegExp('\\bL01\\b').test(JSON.stringify(dosarAdvisor(s0, buildCtx(s0), { selectie: SEL, acces: accesTower(s0, { rol: 'ADMIN' }, false) }))));

console.log('\n— Acces PARȚIAL: companie, dar nu toate restaurantele —');
// `allowedStoreIds` e o listă, nu un singur restaurant: un rol poate avea vedere de
// companie peste un SUBSET. Acolo agregarea trebuie să se oprească la subset — și tocmai
// asta face proiecția, pe care clamparea selecției nu o poate înlocui.
const A_PARTIAL: ContextAutorizare = {
  ...A_TOP, allowedStoreIds: ['L02'], companyAccess: true, storeId: null, actor: 'regional@fryday.ro',
};
const accPartial = { ...accesTower(s0, { rol: 'ANALIST' }, true), context: A_PARTIAL, locatiiVizibile: ['L02'] };
const sPartial = stareAutorizata(s0, A_PARTIAL);
t('proiecția taie și pentru un rol cu vedere de companie pe subset',
  sPartial.vanzari.every(v => v.locatie === 'L02') && s0.vanzari.some(v => v.locatie === 'L01'));
t('agregarea de companie pe subset NU include restaurantul neautorizat',
  (analizaTimeline(sPartial, buildCtx(sPartial), cerereDin(SEL)).magazine ?? [])
    .every(m => m.locatie === 'L02'));
t('… iar fără proiecție ar fi inclus (de asta e nevoie de ea)',
  (analizaTimeline(s0, ctxTopPartial, cerereDin(SEL)).magazine ?? []).some(m => m.locatie === 'L01'));
t('vânzările agregate pe subset = doar cele autorizate, pe perioada cerută',
  aprox(analizaTimeline(sPartial, buildCtx(sPartial), cerereDin(SEL)).metrici!.salesRON,
    s0.salesReport.filter(v => v.locatie === 'L02' && v.data >= '2026-07-01' && v.data <= '2026-07-31')
      .reduce((s, v) => s + v.net, 0), 0.01));
t('dosarul Advisor al rolului parțial nu pomenește restaurantul neautorizat',
  !new RegExp('\\bL01\\b').test(JSON.stringify(
    dosarAdvisor(s0, buildCtx(s0), { selectie: SEL, acces: accPartial }))));
t('detectorul de scurgeri confirmă izolarea pe subset', scurgeri(sPartial, A_PARTIAL).length === 0);

console.log('\n— Simulare: doar pe scopul autorizat —');
const ingredientTest = s0.ingrediente.find(i => i.activ && i.preturi.length > 0)!;
const scenariu = { preturi: [{ ingredient: ingredientTest.cod, pretNou: 99 }] };
const simMgr = simuleazaFC(sMgr, ctxMgr, cerereBaza({ ...SEL, scop: 'RESTAURANT', locatie: 'L02' }), scenariu);
const simFortat = simuleazaFC(sMgr, ctxMgr, cerereBaza(fortat), scenariu);
t('simularea pe restaurantul propriu rulează', simMgr.disponibil);
t('simularea forțată pe alt restaurant nu are date',
  !simFortat.disponibil || simFortat.affectedStores.every(x => x !== 'L01'));
t('restaurantele atinse de simulare sunt doar cele autorizate',
  simMgr.affectedStores.every(x => potVedeaRestaurantul(A_MGR, x)));
t('simularea nu atinge datele reale',
  (() => { const inainte = JSON.stringify(sMgr); simuleazaFC(sMgr, ctxMgr, cerereBaza(SEL), scenariu);
    return JSON.stringify(sMgr) === inainte; })());

console.log('\n— Import: scopul fișierului trebuie să încapă în drepturi —');
const parsatL01 = {
  foaie: 'x', antete: ['Data', 'Locatie', 'Cod produs', 'Cantitate'],
  randuri: [{ Data: '2026-07-05', Locatie: 'L01', 'Cod produs': 'P001', Cantitate: 3 }],
};
const prep = pregatesteImport(s0, { fisier: 'pmix iulie.xlsx', parsat: parsatL01, acum: ACUM });
t('un import pe L01 e refuzat unui management limitat la L02',
  !verificaImport({ ...A_TOP, allowedStoreIds: ['L02'] },
    { scop: prep.rezultat.scop, restaurante: prep.rezultat.restaurante }).permis
  || prep.rezultat.restaurante.length === 0);
t('managerul nu ajunge nici la validare — poarta de scriere îl oprește întâi',
  verificaImport(A_MGR, { scop: prep.rezultat.scop, restaurante: prep.rezultat.restaurante }).cod === 'SCRIERE_NEAUTORIZATA');

// ————————————————————————————————————————————————————————— audit

console.log('\n— Urma de acces —');
const dupaAudit = inregistreazaAcces(s0, A_MGR, {
  actiune: 'SCHIMBARE_SCOP', scop: 'L02 · TOTAL', rezultat: 'PERMIS', detaliu: 'Scop schimbat în L02.', acum: ACUM,
});
t('intrarea se adaugă, starea rămâne imutabilă',
  (dupaAudit.auditAcces ?? []).length === 1 && (s0.auditAcces ?? []).length === 0);
t('intrarea poartă actorul, rolul, acțiunea, scopul și rezultatul',
  (() => { const x = dupaAudit.auditAcces![0];
    return x.actor === 'mgr@fryday.ro' && x.rol === 'STORE_MANAGER'
      && x.actiune === 'SCHIMBARE_SCOP' && x.scop === 'L02 · TOTAL' && x.rezultat === 'PERMIS'; })());
t('id-ul e determinist pentru aceeași acțiune',
  intrareAudit(A_MGR, { actiune: 'ADVISOR', scop: 'L02', rezultat: 'PERMIS', detaliu: '', acum: ACUM }).id
  === intrareAudit(A_MGR, { actiune: 'ADVISOR', scop: 'L02', rezultat: 'PERMIS', detaliu: '', acum: ACUM }).id);
t('acțiuni diferite au id-uri diferite',
  intrareAudit(A_MGR, { actiune: 'ADVISOR', scop: 'L02', rezultat: 'PERMIS', detaliu: '', acum: ACUM }).id
  !== intrareAudit(A_MGR, { actiune: 'SIMULARE', scop: 'L02', rezultat: 'PERMIS', detaliu: '', acum: ACUM }).id);
t('un refuz se înregistrează ca refuz, cu motiv',
  (() => { const v = verificaCerere(A_MGR, { locatie: 'L01' });
    const st = inregistreazaAcces(s0, A_MGR, {
      actiune: 'ACCES_REFUZAT', scop: 'L01', rezultat: 'REFUZAT', detaliu: v.motiv ?? '', acum: ACUM });
    return st.auditAcces![0].rezultat === 'REFUZAT' && st.auditAcces![0].detaliu.includes('L01'); })());
t('urma nu crește la infinit',
  (() => { let st = s0;
    for (let i = 0; i < MAX_AUDIT_ACCES + 25; i++) {
      st = inregistreazaAcces(st, A_MGR, { actiune: 'ADVISOR', scop: `s${i}`, rezultat: 'PERMIS', detaliu: '', acum: ACUM });
    }
    return (st.auditAcces ?? []).length === MAX_AUDIT_ACCES; })());
t('cele mai recente intrări sunt cele păstrate',
  (() => { let st = s0;
    for (let i = 0; i < MAX_AUDIT_ACCES + 5; i++) {
      st = inregistreazaAcces(st, A_MGR, { actiune: 'ADVISOR', scop: `s${i}`, rezultat: 'PERMIS', detaliu: '', acum: ACUM });
    }
    return st.auditAcces![st.auditAcces!.length - 1].scop === `s${MAX_AUDIT_ACCES + 4}`; })());
t('urma unui actor se poate citi separat',
  auditulActorului(dupaAudit, 'mgr@fryday.ro').length === 1
  && auditulActorului(dupaAudit, 'altcineva').length === 0);
t('nu se stochează date personale peste identificatorul de actor',
  Object.keys(dupaAudit.auditAcces![0]).join(',') === 'id,data,actor,rol,actiune,scop,rezultat,detaliu');

// ————————————————————————————————————————————————————————— interfața

console.log('\n— Interfața arată scopul, fără ambiguitate —');
const context = (extra: Partial<TowerCtx> = {}): TowerCtx => ({
  state: sMgr, ctx: ctxMgr,
  sel: { ...SEL, scop: 'RESTAURANT', locatie: 'L02' },
  setSel: () => undefined, acces: accMgr, update: () => undefined, ...extra,
});
const randeaza = (el: Parameters<typeof renderToStaticMarkup>[0], c: TowerCtx = context()) =>
  renderToStaticMarkup(h(TowerProvider, { value: c }, el));

const htmlMgr = randeaza(h(ContinutTower, { initial: 'OVERVIEW' }));
t('banda arată scopul explicit', htmlMgr.includes('data-zona="scop-banda"') && htmlMgr.includes('Restaurant: L02'));
t('interfața managerului nu scrie nicăieri alt restaurant', !new RegExp('\\bL01\\b').test(htmlMgr));
t('selectorul de restaurant nu oferă alt restaurant',
  !new RegExp('\\bL01\\b').test(randeaza(h(Bara, {}))));
t('butonul „Companie" e dezactivat, nu ascuns',
  randeaza(h(Bara, {})).includes('data-scop="COMPANIE"') && randeaza(h(Bara, {})).includes('disabled'));
t('managerul nu primește ecranul de importuri',
  randeaza(h(ContinutTower, { initial: 'IMPORTURI' })).includes('data-sectiune-activa="OVERVIEW"'));

const accTop = accesTower(s0, { rol: 'ADMIN' }, false);
const htmlTop = randeaza(h(ContinutTower, { initial: 'OVERVIEW' }),
  context({ state: s0, ctx: buildCtx(s0), sel: SEL, acces: accTop }));
t('managementul vede eticheta „Companie"', htmlTop.includes('Companie'));
t('managementul vede ambele restaurante în tabel',
  new RegExp('\\bL01\\b').test(htmlTop) && new RegExp('\\bL02\\b').test(htmlTop));

// ————————————————————————————————————————————————————————— regresie

console.log('\n— Regresia analizei existente —');
const ctxTop = buildCtx(s0);
t('compania rămâne suma restaurantelor',
  (() => { const a = analizaTimeline(s0, ctxTop, cerereDin(SEL));
    return aprox(a.metrici!.salesRON, (a.magazine ?? []).reduce((s, m) => s + m.metrici.salesRON, 0), 0.01); })());
t('analiza unui restaurant e aceeași rulată direct sau prin proiecție',
  (() => {
    const direct = analizaTimeline(s0, ctxTop, cerereDin({ ...SEL, scop: 'RESTAURANT', locatie: 'L02' }));
    const prin = analizaTimeline(sMgr, ctxMgr, cerereDin({ ...SEL, scop: 'RESTAURANT', locatie: 'L02' }));
    return aprox(direct.metrici!.salesRON, prin.metrici!.salesRON, 0.01)
      && aprox(direct.metrici!.recipeCostRON, prin.metrici!.recipeCostRON, 0.01);
  })());
t('FC-ul restaurantului nu se schimbă din cauza proiecției',
  (() => {
    const direct = analizaTimeline(s0, ctxTop, cerereDin({ ...SEL, scop: 'RESTAURANT', locatie: 'L02' })).metrici!.recipeFcPct;
    const prin = analizaTimeline(sMgr, ctxMgr, cerereDin({ ...SEL, scop: 'RESTAURANT', locatie: 'L02' })).metrici!.recipeFcPct;
    return direct !== null && prin !== null && aprox(direct, prin, 1e-9);
  })());
t('analiza de ingrediente pe restaurant rămâne identică',
  (() => {
    const c = { ...cerereBaza({ ...SEL, scop: 'RESTAURANT', locatie: 'L02' }), comparatie: 'LUNA_PRECEDENTA' as const };
    const direct = analizaIngrediente(s0, ctxTop, c);
    const prin = analizaIngrediente(sMgr, ctxMgr, c);
    return direct.randuri.length === prin.randuri.length
      && aprox(direct.netCurent, prin.netCurent, 0.01);
  })());
t('puntea restaurantului rămâne identică',
  (() => {
    const c = cerereBaza({ ...SEL, scop: 'RESTAURANT', locatie: 'L02' });
    return aprox(bridgeFC(s0, ctxTop, c).nboActual, bridgeFC(sMgr, ctxMgr, c).nboActual, 0.01);
  })());
t('rândurile 2.9 fără locație rămân în puntea managerului — nu se pierd date proprii',
  bridgeFC(sMgr, ctxMgr, cerereBaza(SEL)).randuri.some(r => r.locatie === null));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
