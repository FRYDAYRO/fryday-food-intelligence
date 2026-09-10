/**
 * Întăririle cerute de review pe serverul comun (08.09.2026). Fiecare secțiune verifică o
 * identitate, nu forma de azi a răspunsului — și fiecare a fost scrisă după ce am reprodus
 * defectul pe care îl păzește.
 *
 * Cea mai importantă lecție e în secțiunea 1. Suita veche verifica „ce primește managerul =
 * `stareAutorizata(starea întreagă)`" — o identitate ADEVĂRATĂ, dar care nu poate prinde nimic:
 * compară serverul cu exact funcția pe care serverul o apelează. Cât timp `stareAutorizata`
 * lăsa `evenimente28` să treacă întregi, egalitatea rămânea adevărată ȘI managerul primea
 * waste-ul celorlalte restaurante. Testele de aici verifică DATELE primite, nu acordul dintre
 * două apeluri ale aceleiași funcții.
 */
process.removeAllListeners('warning');
process.on('warning', () => { /* node:sqlite e experimental */ });

import { DatabaseSync } from 'node:sqlite';
import {
  ConflictRevizie, citesteStarea, colectiiLipsa, iteratiiDin, pareStare, pregatesteSchema,
  raspundeApi, scrieStarea, seedAdmin, type AdaptorDb, type AdaptorParola, type CerereApi,
} from '../src/lib/server-api';
import { hashParola, sareNoua, tokenNou } from '../src/lib/parole';
import { contextAutorizare, stareAutorizata } from '../src/lib/fc-acces';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

function adaptor(): AdaptorDb & { db: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  return {
    db,
    async toate<T>(sql: string, p: unknown[] = []): Promise<T[]> { return db.prepare(sql).all(...(p as never[])) as T[]; },
    async lot(cereri) { for (const c of cereri) db.prepare(c.sql).run(...((c.p ?? []) as never[])); },
  };
}
const parole: AdaptorParola = { hash: (p, s, it) => hashParola(p, s, it ?? 1000), sareNoua, tokenNou };
const ACUM = '2026-09-08T12:00:00.000Z';
const cer = (cale: string, metoda: string, extra: Partial<CerereApi> = {}): CerereApi => ({ cale, metoda, token: null, ...extra });

async function server() {
  const db = adaptor();
  await pregatesteSchema(db);
  await seedAdmin(db, parole, 'admin@fryday.ro', 'parola-admin', ACUM);
  const api = (c: CerereApi) => raspundeApi(c, db, parole, ACUM);
  const login = async (email: string, parola: string) => {
    const r = await api(cer('/api/autentificare', 'POST', { corp: { email, parola } }));
    return r.corp as { token: string };
  };
  return { db, api, login };
}

/** O stare completă (toate colecțiile pe care le parcurge filtrarea), cu date pe două restaurante. */
const S: AppState = {
  ...stareGoala(),
  // filtrarea pe unitate se verifică aici, deci starea o cere explicit: implicit,
  // prin decizia din 10.09.2026, managerii văd cifrele întregii rețele
  setari: { ...stareGoala().setari, managerVedeToataReteaua: false },
  locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }, { cod: 'L02', nume: 'FRYDAY TIMISOARA IULIUS TOWN' }],
  evenimente28: [
    { locatie: 'L01', fereastra: { de: '2026-08-01', la: '2026-08-31' }, cod: 'M1', denumire: 'Cheddar', motiv: 'End of Day', um: 'KG', cant: 2, costUnitar: 11.27, lei: 22.54 },
    { locatie: 'L02', fereastra: { de: '2026-08-01', la: '2026-08-31' }, cod: 'M2', denumire: 'Cartofi', motiv: 'Waste', um: 'KG', cant: 5, costUnitar: 4, lei: 20 },
    { locatie: null, fereastra: { de: '2026-08-01', la: '2026-08-31' }, cod: 'M3', denumire: 'Consolidat', motiv: 'Waste', um: 'KG', cant: 1, costUnitar: 1, lei: 1 },
  ] as AppState['evenimente28'],
  declaratiiIncludere: [
    { locatie: 'L01', fereastra: { de: '2026-08-01', la: '2026-08-31' }, material: 'M1', includere: 'INCLUS_IN_USAGE', cant: 2, temei: 'REGULA_NBO_CONFIRMATA', sursa: 'test' },
    { locatie: 'L02', fereastra: { de: '2026-08-01', la: '2026-08-31' }, material: 'M2', includere: 'EXCLUS_PRIN_AJUSTARE', cant: 5, temei: 'REGULA_NBO_CONFIRMATA', sursa: 'test' },
  ] as AppState['declaratiiIncludere'],
  auditAcces: [
    { id: 'a1', data: ACUM, actor: 'analist@f.ro', rol: 'TOP_MANAGEMENT', actiune: 'SCHIMBARE_SCOP', scop: 'COMPANIE', rezultat: 'PERMIS', detaliu: '' },
    { id: 'a2', data: ACUM, actor: 'mgr@f.ro', rol: 'STORE_MANAGER', actiune: 'SCHIMBARE_SCOP', scop: 'L02', rezultat: 'PERMIS', detaliu: '' },
    { id: 'a3', data: ACUM, actor: 'altcineva@f.ro', rol: 'STORE_MANAGER', actiune: 'SCHIMBARE_SCOP', scop: 'L01', rezultat: 'REFUZAT', detaliu: 'nu are voie' },
  ] as AppState['auditAcces'],
};

async function ruleaza() {

console.log('— 1. Managerul nu primește rânduri ale altui restaurant (verificat PE DATE) —');
{
  const { api, login } = await server();
  const admin = await login('admin@fryday.ro', 'parola-admin');
  await api(cer('/api/utilizatori', 'POST', { token: admin.token, corp: { email: 'mgr@f.ro', parola: 'parola-lunga', rol: 'MANAGER', locatie: 'L02' } }));
  await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: S, revizie: 0 } }));
  const mgr = await login('mgr@f.ro', 'parola-lunga');
  const primita = (await api(cer('/api/stare', 'GET', { token: mgr.token }))).corp as { stare: AppState };
  const s = primita.stare;

  t('niciun eveniment 2.8 al altui restaurant',
    (s.evenimente28 ?? []).every(x => x.locatie === 'L02' || x.locatie === null),
    JSON.stringify((s.evenimente28 ?? []).map(x => x.locatie)));
  t('… dar evenimentele proprii rămân', (s.evenimente28 ?? []).some(x => x.locatie === 'L02'));
  t('nicio declarație de includere a altui restaurant',
    (s.declaratiiIncludere ?? []).every(x => x.locatie === 'L02' || x.locatie === null),
    JSON.stringify((s.declaratiiIncludere ?? []).map(x => x.locatie)));
  t('… dar declarațiile proprii rămân', (s.declaratiiIncludere ?? []).some(x => x.locatie === 'L02'));
  t('urma de audit e doar a lui',
    (s.auditAcces ?? []).every(x => x.actor === 'mgr@f.ro'),
    JSON.stringify((s.auditAcces ?? []).map(x => x.actor)));
  t('… deci nu află nici ce a cerut altcineva, nici pe ce scop',
    !JSON.stringify(s.auditAcces ?? []).includes('altcineva@f.ro'));

  // proba negativă: numele și cifrele celuilalt restaurant nu apar NICĂIERI în ce a primit
  const text = JSON.stringify(s);
  t('numele celuilalt restaurant nu apare nicăieri în starea primită', !text.includes('CLUJ'));
  t('denumirea materialului lui nu apare nicăieri', !text.includes('Cheddar'));
}
{
  // analistul vede tot: filtrarea nu trebuie să taie din ce are voie să vadă
  const ctx = contextAutorizare(S, { rol: 'ANALIST', email: 'analist@f.ro' }, true);
  const a = stareAutorizata(S, ctx);
  t('analistul primește toate evenimentele 2.8', (a.evenimente28 ?? []).length === 3);
  t('analistul primește toată urma de audit', (a.auditAcces ?? []).length === 3);
}

console.log('\n— 1b. Decizia din 10.09.2026: managerii văd cifrele întregii rețele —');
{
  // Aceeași stare ca mai sus, dar FĂRĂ setarea de restrângere: implicit, toată lumea vede tot.
  // Ce NU se schimbă e dreptul de scriere — acolo e valoarea rolului, nu în ce poate citi.
  const TOTI: AppState = { ...S, setari: { ...S.setari, managerVedeToataReteaua: true } };
  const { api, login } = await server();
  const admin = await login('admin@fryday.ro', 'parola-admin');
  await api(cer('/api/utilizatori', 'POST', { token: admin.token, corp: { email: 'mgr@f.ro', parola: 'parola-lunga', rol: 'MANAGER', locatie: 'L02' } }));
  await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: TOTI, revizie: 0 } }));
  const mgr = await login('mgr@f.ro', 'parola-lunga');
  const r = await api(cer('/api/stare', 'GET', { token: mgr.token }));
  const primita = (r.corp as { stare: AppState; filtrat: boolean });
  const s2 = primita.stare;

  t('managerul primește ambele restaurante', s2.locatii.length === 2, JSON.stringify(s2.locatii.map(l => l.cod)));
  t('… inclusiv evenimentele 2.8 ale celuilalt', (s2.evenimente28 ?? []).some(x => x.locatie === 'L01'));
  t('… și declarațiile lui', (s2.declaratiiIncludere ?? []).some(x => x.locatie === 'L01'));
  t('… iar cifrele celuilalt restaurant chiar ajung la el', JSON.stringify(s2).includes('Cheddar'));

  // partea care NU se lărgește: rolul rămâne fără drept de scriere
  t('dar tot NU poate scrie starea comună',
    (await api(cer('/api/stare', 'PUT', { token: mgr.token, corp: { stare: TOTI, revizie: 1 } }))).cod === 403);
  t('… și tot nu vede lista de utilizatori', (await api(cer('/api/utilizatori', 'GET', { token: mgr.token }))).cod === 403);
  t('… și tot nu vede jurnalul', (await api(cer('/api/jurnal', 'GET', { token: mgr.token }))).cod === 403);

  // reversul, ca decizia să rămână reversibilă printr-o singură setare
  const ctxRestrans = contextAutorizare({ ...TOTI, setari: { ...TOTI.setari, managerVedeToataReteaua: false } },
    { rol: 'MANAGER', locatie: 'L02', email: 'mgr@f.ro' }, true);
  t('setarea pe false readuce filtrarea pe unitate',
    stareAutorizata({ ...TOTI, setari: { ...TOTI.setari, managerVedeToataReteaua: false } }, ctxRestrans)
      .locatii.every(l => l.cod === 'L02'));
  const ctxTot = contextAutorizare(TOTI, { rol: 'MANAGER', locatie: 'L02', email: 'mgr@f.ro' }, true);
  t('… iar cu vizibilitate completă, motivul e declarat, nu tăcut',
    /toată rețeaua/i.test(ctxTot.motivEnforcement), ctxTot.motivEnforcement.slice(0, 60));
  t('… restaurantul lui rămâne cel implicit', ctxTot.storeId === 'L02');
}

console.log('\n— 2. Ultimul administrator nu se poate pierde —');
{
  const { api, login } = await server();
  const admin = await login('admin@fryday.ro', 'parola-admin');
  const pune = (corp: Record<string, unknown>) => api(cer('/api/utilizatori', 'POST', { token: admin.token, corp }));
  const r = await pune({ email: 'admin@fryday.ro', parola: 'parola-lunga', rol: 'MANAGER', locatie: 'L01' });
  t('ultimul admin nu se poate retrograda pe el însuși', r.cod === 400, `cod=${r.cod}`);
  t('… și chiar a rămas ADMIN', (await login('admin@fryday.ro', 'parola-admin')).token !== undefined);
  t('ștergerea lui e refuzată la fel',
    (await api(cer('/api/utilizatori', 'DELETE', { token: admin.token, corp: { email: 'admin@fryday.ro' } }))).cod === 400);
  t('cu doi admini, retrogradarea unuia e permisă',
    (await pune({ email: 'al2@f.ro', parola: 'parola-lunga', rol: 'ADMIN' })).cod === 200
    && (await pune({ email: 'al2@f.ro', parola: 'parola-lunga', rol: 'ANALIST' })).cod === 200);
  t('… iar acum ultimul rămas nu se mai poate retrograda',
    (await pune({ email: 'admin@fryday.ro', parola: 'parola-lunga', rol: 'ANALIST' })).cod === 400);
}

console.log('\n— 3. Publicarea reviziei e un compare-and-swap —');
{
  const db = adaptor();
  await pregatesteSchema(db);
  const st = { ...stareGoala() };
  await scrieStarea(db, st, 1, ACUM, 'a@f.ro');
  t('prima scriere publică revizia 1', (await citesteStarea(db)).revizie === 1);
  // două cereri concurente citesc amândouă revizia 1 și încearcă amândouă revizia 2
  await scrieStarea(db, st, 2, ACUM, 'a@f.ro');
  let prinsa: unknown = null;
  try { await scrieStarea(db, st, 2, ACUM, 'b@f.ro'); } catch (e) { prinsa = e; }
  t('a doua publicare pe aceeași revizie e refuzată', prinsa instanceof ConflictRevizie, String(prinsa));
  t('… și spune ce revizie e pe server',
    prinsa instanceof ConflictRevizie && prinsa.revizieServer === 2, String((prinsa as ConflictRevizie)?.revizieServer));
  t('revizia publicată rămâne cea a câștigătoarei', (await citesteStarea(db)).actualizatDe === 'a@f.ro');
}
{
  // aceeași cursă, dar prin rută: perdanta primește 409, nu 200
  const { db, api, login } = await server();
  const admin = await login('admin@fryday.ro', 'parola-admin');
  await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: S, revizie: 0 } }));
  // simulăm concurența: a doua cerere trimite tot revizia 0, deși serverul e la 1
  const r = await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: S, revizie: 0 } }));
  t('o scriere pe o revizie depășită dă 409', r.cod === 409, `cod=${r.cod}`);
  t('… iar starea de pe server e tot cea bună', (await citesteStarea(db)).revizie === 1);
}

{
  // Cursa ADEVĂRATĂ, cea pe care o secvență n-o poate reproduce: două cereri citesc AMÂNDOUĂ
  // revizia 1 și pornesc amândouă spre revizia 2. Prima publică; a doua trebuie să afle că
  // revizia publicată NU e a ei — altfel i-ar răspunde clientului „salvat", iar starea lui
  // s-ar pierde în tăcere sub cea a celuilalt.
  const db = adaptor();
  await pregatesteSchema(db);
  await scrieStarea(db, { ...stareGoala() }, 1, ACUM, 'initial');
  const lotOriginal = db.lot.bind(db);
  let intercalat = false;
  db.lot = async (cereri) => {
    await lotOriginal(cereri);
    // imediat după ce B și-a scris bucățile, dar înainte să-și publice pointerul, A publică
    const eScriereBucati = cereri.some(c => c.sql.includes('INSERT INTO stare_bucati'));
    if (eScriereBucati && !intercalat) {
      intercalat = true;
      await scrieStarea({ ...db, lot: lotOriginal }, { ...stareGoala(), produse: [] }, 2, ACUM, 'A');
    }
  };
  let rez: unknown = null;
  try { await scrieStarea(db, { ...stareGoala() }, 2, ACUM, 'B'); } catch (e) { rez = e; }
  db.lot = lotOriginal;
  t('cel care pierde cursa NU primește confirmare', rez instanceof ConflictRevizie, `rezultat=${rez instanceof Error ? rez.message : JSON.stringify(rez)}`);
  const final = await citesteStarea(db);
  t('… iar pe server e starea câștigătorului, întreagă', final.revizie === 2 && final.actualizatDe === 'A', `revizia ${final.revizie} de la ${final.actualizatDe}`);
  t('… și se citește fără eroare', final.stare !== null);
}

console.log('\n— 4. Bucățile unei încercări căzute nu ajung niciodată într-o stare citită —');
{
  const db = adaptor();
  await pregatesteSchema(db);
  const lung = { ...stareGoala(), produse: Array.from({ length: 3000 }, (_, i) => ({ cod: `P${i}`, denumire: 'x'.repeat(500), categorie: 'C', tip: 'SIMPLU', tva: 11, activ: true, aliasuri: [] })) };
  await scrieStarea(db, lung, 1, ACUM, 'a@f.ro', 'scriere-lunga');
  const nrLung = (await db.toate<{ n: number }>("SELECT COUNT(*) n FROM stare_bucati WHERE revizie = 1 AND scriere = 'scriere-lunga'"))[0].n;
  t('starea lungă s-a scris în mai multe bucăți', nrLung > 1, `${nrLung} bucăți`);

  // (a) o revizie DEJA publicată nu se rescrie: altfel ștergerea bucăților ei ar lăsa pointerul
  // arătând spre o stare imposibil de citit — exact felul de avarie din care nu se mai iese
  let peste: unknown = null;
  try { await scrieStarea(db, { ...stareGoala() }, 1, ACUM, 'a@f.ro', 'scriere-lunga'); } catch (e) { peste = e; }
  t('o revizie deja publicată nu se rescrie', peste instanceof ConflictRevizie, String(peste));
  t('… iar starea publicată e neatinsă și citibilă',
    (await citesteStarea(db)).stare?.produse.length === 3000);

  // (b) reîncercarea unei scrieri NEPUBLICATE, mai scurtă, nu-și lasă proprii indici orfani
  await db.lot([{ sql: "INSERT INTO stare_bucati (revizie, nr, continut, scriere) VALUES (2, 0, 'a', 'reincercare')" },
                { sql: "INSERT INTO stare_bucati (revizie, nr, continut, scriere) VALUES (2, 1, 'b', 'reincercare')" },
                { sql: "INSERT INTO stare_bucati (revizie, nr, continut, scriere) VALUES (2, 2, 'c', 'reincercare')" }]);
  await scrieStarea(db, { ...stareGoala() }, 2, ACUM, 'a@f.ro', 'reincercare');
  const nrScurt = (await db.toate<{ n: number }>("SELECT COUNT(*) n FROM stare_bucati WHERE revizie = 2 AND scriere = 'reincercare'"))[0].n;
  t('reîncercarea mai scurtă nu lasă indici orfani ai ei', nrScurt === 1, `${nrScurt} bucăți`);
  t('… iar starea se citește, nu aruncă', (await citesteStarea(db)).stare !== null);

  // (b) bucățile ALTEI încercări, pe aceeași revizie, rămân inerte: cititorul cere exact
  // bucățile scrierii PUBLICATE, deci un rest de la o cerere concurentă căzută nu se amestecă
  await db.lot([{ sql: "INSERT INTO stare_bucati (revizie, nr, continut, scriere) VALUES (2, 0, 'gunoi', 'alta-scriere')" },
                { sql: "INSERT INTO stare_bucati (revizie, nr, continut, scriere) VALUES (2, 1, 'orfan', 'alta-scriere')" }]);
  const dupa = await citesteStarea(db);
  t('bucățile altei încercări nu schimbă starea citită', dupa.stare !== null && dupa.revizie === 2);
  t('… și nu apar în conținut', !JSON.stringify(dupa.stare).includes('gunoi'));
}

console.log('\n— 5. Parola se verifică cu iterațiile cu care a fost scrisă —');
{
  t('iterațiile se citesc din hash', iteratiiDin('pbkdf2$1000$abcd') === 1000);
  t('un hash de altă formă cade pe valoarea curentă', iteratiiDin('altceva') === 210_000 && iteratiiDin(null) === 210_000);
  const db = adaptor();
  await pregatesteSchema(db);
  // cont creat cu 1000 de iterații
  const vechi: AdaptorParola = { hash: (p, s, it) => hashParola(p, s, it ?? 1000), sareNoua, tokenNou };
  await seedAdmin(db, vechi, 'admin@fryday.ro', 'parola-admin', ACUM);
  // parametrul se ridică: adaptorul NOU calculează implicit cu 5000
  const nou: AdaptorParola = { hash: (p, s, it) => hashParola(p, s, it ?? 5000), sareNoua, tokenNou };
  const r = await raspundeApi(cer('/api/autentificare', 'POST', { corp: { email: 'admin@fryday.ro', parola: 'parola-admin' } }), db, nou, ACUM);
  t('contul vechi se autentifică și după ridicarea parametrului', r.cod === 200, `cod=${r.cod}`);
  const rGresit = await raspundeApi(cer('/api/autentificare', 'POST', { corp: { email: 'admin@fryday.ro', parola: 'gresita' } }), db, nou, ACUM);
  t('… iar o parolă greșită rămâne greșită', rGresit.cod === 401);
}

console.log('\n— 6. O stare incompletă e refuzată la intrare, nu la citire —');
{
  const fara = { ...S } as Record<string, unknown>;
  delete fara.linii29;
  t('colecția lipsă e numită', colectiiLipsa(fara).join() === 'linii29', colectiiLipsa(fara).join());
  t('starea completă trece', pareStare(S) && colectiiLipsa(S).length === 0);
  const { db, api, login } = await server();
  const admin = await login('admin@fryday.ro', 'parola-admin');
  const r = await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: fara, revizie: 0 } }));
  t('serverul o refuză cu 400, spunând ce lipsește',
    r.cod === 400 && String((r.corp as { eroare: string }).eroare).includes('linii29'),
    `${r.cod} ${JSON.stringify(r.corp)}`);
  t('… și nimic nu s-a scris', (await citesteStarea(db)).revizie === 0);
  // proba că refuzul chiar previne 500-ul: cu starea incompletă stocată, GET-ul managerului ar cădea
  await api(cer('/api/utilizatori', 'POST', { token: admin.token, corp: { email: 'mgr@f.ro', parola: 'parola-lunga', rol: 'MANAGER', locatie: 'L02' } }));
  await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: S, revizie: 0 } }));
  const mgr = await login('mgr@f.ro', 'parola-lunga');
  t('cu o stare completă, GET-ul managerului merge', (await api(cer('/api/stare', 'GET', { token: mgr.token }))).cod === 200);
}

console.log('\n— 7. Deconectarea anulează jetonul pe server —');
{
  const { api, login } = await server();
  const a = await login('admin@fryday.ro', 'parola-admin');
  t('jetonul e valabil înainte', (await api(cer('/api/eu', 'GET', { token: a.token }))).cod === 200);
  t('deconectarea reușește', (await api(cer('/api/deconectare', 'POST', { token: a.token }))).cod === 200);
  t('jetonul nu mai e valabil după', (await api(cer('/api/eu', 'GET', { token: a.token }))).cod === 401);
}

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
}

ruleaza().catch(e => { console.error('EROARE', e); process.exit(1); });
