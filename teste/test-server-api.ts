/**
 * Serverul comun: conturi, roluri, starea partajată.
 *
 * Adaptorul de bază de date e SQLite real (node:sqlite), nu o imitație: aceleași comenzi
 * care ajung în D1. Ce se verifică sunt IDENTITĂȚI, nu forma răspunsului de azi:
 *   · tăierea în bucăți e reversibilă, oricare ar fi mărimea;
 *   · o scriere refuzată (revizie veche) nu schimbă NIMIC;
 *   · o scriere căzută la jumătate lasă revizia veche întreagă și citibilă;
 *   · ce primește un manager e EXACT `stareAutorizata(...)` — aceeași regulă ca în interfață.
 *
 * ATENȚIE la ultima: e o identitate adevărată, dar NU dovedește că nu se scurg date. Compară
 * serverul cu exact funcția pe care serverul o apelează, deci rămâne adevărată și când funcția
 * lasă o colecție întreagă să treacă — cum chiar s-a întâmplat cu `evenimente28` (review,
 * 08.09.2026). Proba pe DATE, nu pe acordul a două apeluri, e în `test-server-intariri.ts`.
 */
process.removeAllListeners('warning');
process.on('warning', () => { /* node:sqlite e experimental; avertismentul nu ne spune nimic */ });

import { DatabaseSync } from 'node:sqlite';
import {
  MARIME_BUCATA, ROLURI, citesteStarea, egal, pareStare, pregatesteSchema, raspundeApi,
  scrieStarea, seedAdmin, taieInBucati, type AdaptorDb, type AdaptorParola, type CerereApi,
} from '../src/lib/server-api';
import { hashParola, sareNoua, tokenNou } from '../src/lib/parole';
import { contextAutorizare, stareAutorizata } from '../src/lib/fc-acces';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

// ————————————————————————————————————————————————————————— adaptoare

function adaptor(): AdaptorDb & { db: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  return {
    db,
    async toate<T>(sql: string, p: unknown[] = []): Promise<T[]> {
      return db.prepare(sql).all(...(p as never[])) as T[];
    },
    async lot(cereri) {
      for (const c of cereri) db.prepare(c.sql).run(...((c.p ?? []) as never[]));
    },
  };
}

// iterații mici: testele verifică regula, nu costul de calcul al PBKDF2
const parole: AdaptorParola = {
  hash: (p, s) => hashParola(p, s, 1000),
  sareNoua, tokenNou,
};

const ACUM = '2026-09-08T12:00:00.000Z';
const cer = (cale: string, metoda: string, extra: Partial<CerereApi> = {}): CerereApi =>
  ({ cale, metoda, token: null, ...extra });

// suitele se bundluiesc în CJS, unde nu există `await` la nivel de modul: corpul stă într-o funcție
async function ruleaza() {

// ————————————————————————————————————————————————————————— 1. tăierea în bucăți

console.log('— 1. Tăierea în bucăți e reversibilă —');
for (const [n, marime] of [[0, 10], [1, 10], [9, 10], [10, 10], [11, 10], [1000, 7], [5000, 5000]] as [number, number][]) {
  const s = 'ă'.repeat(n);
  const b = taieInBucati(s, marime);
  t(`${n} caractere în bucăți de ${marime}: reunirea dă exact șirul`, b.join('') === s, `${b.length} bucăți`);
  t(`… și nicio bucată nu depășește ${marime}`, b.every(x => x.length <= marime));
}
t('mărimea implicită e sub limita pe rând a lui D1', MARIME_BUCATA <= 1_000_000);
t('o mărime nevalidă e refuzată, nu ghicită', (() => { try { taieInBucati('x', 0); return false; } catch { return true; } })());

// ————————————————————————————————————————————————————————— 2. starea: dus-întors

console.log('\n— 2. Starea se întoarce exact cum a intrat —');
const S_MICA: AppState = { ...stareGoala(), locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }] };
{
  const a = adaptor();
  await pregatesteSchema(a);
  t('fără nicio scriere, revizia e 0 și starea lipsește', (await citesteStarea(a)).revizie === 0 && (await citesteStarea(a)).stare === null);
  await scrieStarea(a, S_MICA, 1, ACUM, 'a@f.ro');
  const c = await citesteStarea(a);
  t('starea citită e identică cu cea scrisă', JSON.stringify(c.stare) === JSON.stringify(S_MICA));
  t('revizia și autorul se păstrează', c.revizie === 1 && c.actualizatDe === 'a@f.ro' && c.actualizatLa === ACUM);
}
{
  // o stare cât să ceară mai multe bucăți: dus-întorsul trebuie să fie la fel de exact
  const a = adaptor();
  await pregatesteSchema(a);
  const mare: AppState = {
    ...S_MICA,
    materiale29: Array.from({ length: 5000 }, (_, i) => ({
      perioada: '2026-08', locatie: 'L01', material: `M${i}`, denumire: `Material numărul ${i} cu diacritice ăîâșț`,
      categorie: 'Food 11%', cant: i, um: 'kg', costActual: i * 1.5, costTeoretic: i * 1.4,
    })) as AppState['materiale29'],
  };
  const scris = await scrieStarea(a, mare, 1, ACUM, null);
  t('o stare mare se taie în mai multe bucăți', scris.bucati > 1, `${scris.bucati} bucăți · ${(scris.octeti / 1024).toFixed(0)} KB`);
  t('și se întoarce identică', JSON.stringify((await citesteStarea(a)).stare) === JSON.stringify(mare));
}

console.log('\n— 3. O scriere căzută la jumătate nu strică revizia veche —');
{
  const a = adaptor();
  await pregatesteSchema(a);
  await scrieStarea(a, S_MICA, 1, ACUM, 'a@f.ro');
  // bucăți pentru revizia 2 scrise, dar pointerul NU s-a mutat (cădere la mijloc)
  await a.lot([{ sql: 'INSERT INTO stare_bucati (revizie, nr, continut) VALUES (?,?,?)', p: [2, 0, '{"stricat":'] }]);
  const c = await citesteStarea(a);
  t('citirea întoarce tot revizia 1, întreagă', c.revizie === 1 && JSON.stringify(c.stare) === JSON.stringify(S_MICA));
  // iar dacă pointerul ar arăta spre o revizie incompletă, se semnalează, nu se trunchiază
  await a.lot([{ sql: 'UPDATE stare_meta SET revizie = 2, bucati = 9 WHERE id = 1' }]);
  let semnalat = false;
  try { await citesteStarea(a); } catch { semnalat = true; }
  t('o revizie incompletă dă eroare, nu o stare trunchiată', semnalat);
}
{
  // căderea REALĂ, în interiorul scrierii: adaptorul refuză după primul lot. Ordinea corectă
  // (bucăți întâi, pointer la final) lasă revizia veche întreagă; ordinea inversă ar muta
  // pointerul spre o revizie fără bucăți, iar citirea ar cădea.
  const a = adaptor();
  await pregatesteSchema(a);
  await scrieStarea(a, S_MICA, 1, ACUM, 'a@f.ro');
  let loturi = 0;
  const cade: AdaptorDb = {
    toate: (sql, p) => a.toate(sql, p),
    async lot(c) { if (loturi++ >= 1) throw new Error('cădere simulată la mijlocul scrierii'); return a.lot(c); },
  };
  const alta: AppState = { ...S_MICA, locatii: [{ cod: 'L02', nume: 'ALTUL' }] };
  let aCazut = false;
  try { await scrieStarea(cade, alta, 2, '2026-09-09T12:00:00.000Z', 'b@f.ro'); } catch { aCazut = true; }
  t('scrierea chiar a căzut la mijloc', aCazut);
  const dupa = await citesteStarea(a);
  t('revizia veche a rămas ACTIVĂ după cădere', dupa.revizie === 1);
  t('și conținutul ei e neatins', JSON.stringify(dupa.stare) === JSON.stringify(S_MICA));
  t('autorul reviziei active e tot cel vechi', dupa.actualizatDe === 'a@f.ro');
}

// ————————————————————————————————————————————————————————— 4. parole

console.log('\n— 4. Parolele —');
{
  const s1 = sareNoua(), s2 = sareNoua();
  const h1 = await hashParola('parola-mea-buna', s1, 1000);
  t('hash-ul nu conține parola', !h1.includes('parola-mea-buna'));
  t('aceeași parolă + aceeași sare ⇒ același hash', h1 === await hashParola('parola-mea-buna', s1, 1000));
  t('aceeași parolă + sare diferită ⇒ hash diferit', s1 !== s2 && h1 !== await hashParola('parola-mea-buna', s2, 1000));
  t('sarea nu se repetă între conturi', new Set(Array.from({ length: 50 }, sareNoua)).size === 50);
  t('jetoanele nu se repetă', new Set(Array.from({ length: 50 }, tokenNou)).size === 50);
  t('comparația în timp constant spune adevărul', egal('abc', 'abc') && !egal('abc', 'abd') && !egal('abc', 'abcd'));
}

// ————————————————————————————————————————————————————————— 5. autentificare

console.log('\n— 5. Autentificarea —');
async function server() {
  const a = adaptor();
  await pregatesteSchema(a);
  await seedAdmin(a, parole, 'admin@fryday.ro', 'parola-admin', ACUM);
  const api = (c: CerereApi, acum = ACUM) => raspundeApi(c, a, parole, acum);
  const login = async (email: string, parola: string) => {
    const r = await api(cer('/api/autentificare', 'POST', { corp: { email, parola } }));
    return { cod: r.cod, token: (r.corp as { token?: string }).token ?? null, corp: r.corp };
  };
  return { a, api, login };
}
{
  const { a, api, login } = await server();
  t('seed-ul creează primul administrator', (await a.toate('SELECT email FROM utilizatori')).length === 1);
  t('seed-ul nu rulează a doua oară', (await seedAdmin(a, parole, 'altul@f.ro', 'x', ACUM)) === false
    && (await a.toate('SELECT email FROM utilizatori')).length === 1);

  t('parolă greșită ⇒ 401', (await login('admin@fryday.ro', 'gresita')).cod === 401);
  t('cont inexistent ⇒ 401, același mesaj', (await login('nimeni@f.ro', 'orice')).cod === 401);
  const bun = await login('ADMIN@Fryday.ro', 'parola-admin');
  t('emailul nu e sensibil la majuscule', bun.cod === 200 && !!bun.token);
  t('răspunsul nu conține hash-ul sau sarea', !JSON.stringify(bun.corp).includes('pbkdf2$'));

  t('fără token, /api/eu e 401', (await api(cer('/api/eu', 'GET'))).cod === 401);
  t('cu token, /api/eu spune cine ești',
    (await api(cer('/api/eu', 'GET', { token: bun.token }))).corp.utilizator !== undefined);
  t('token inventat ⇒ 401', (await api(cer('/api/eu', 'GET', { token: 'inventat' }))).cod === 401);

  const peste40Zile = '2026-10-18T12:00:00.000Z';
  t('sesiunea expiră', (await api(cer('/api/eu', 'GET', { token: bun.token }), peste40Zile)).cod === 401);

  await api(cer('/api/deconectare', 'POST', { token: bun.token }));
  t('după deconectare, jetonul nu mai e valabil', (await api(cer('/api/eu', 'GET', { token: bun.token }))).cod === 401);

  t('starea de sănătate nu cere autentificare', (await api(cer('/api/sanatate', 'GET'))).cod === 200);
  const proaspat = await login('admin@fryday.ro', 'parola-admin');
  t('rută necunoscută, autentificat ⇒ 404', (await api(cer('/api/altceva', 'GET', { token: proaspat.token }))).cod === 404);
  // fără jeton nici măcar nu se află ce rute există: poarta e înaintea rutării
  t('rută necunoscută, neautentificat ⇒ 401, nu 404', (await api(cer('/api/altceva', 'GET'))).cod === 401);
}

// ————————————————————————————————————————————————————————— 6. roluri și scurgeri

console.log('\n— 6. Rolurile: un manager nu primește niciun rând al altui restaurant —');
const S_RETEA: AppState = {
  ...stareGoala(),
  // filtrarea pe unitate se verifică aici, deci starea o cere explicit: implicit,
  // prin decizia din 10.09.2026, managerii văd cifrele întregii rețele
  setari: { ...stareGoala().setari, managerVedeToataReteaua: false },
  locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }, { cod: 'L02', nume: 'FRYDAY TIMISOARA IULIUS TOWN' }],
  vanzari: [
    { data: '2026-08-05', locatie: 'L01', canal: 'INSTORE', produs: 'P1', cant: 3, brut: 60, net: 54 },
    { data: '2026-08-05', locatie: 'L02', canal: 'INSTORE', produs: 'P1', cant: 7, brut: 140, net: 126 },
  ] as AppState['vanzari'],
  materiale29: [
    { perioada: '2026-08', locatie: 'L01', material: 'M1', denumire: 'A', categorie: 'Food 11%', cant: 1, um: 'kg', costActual: 10, costTeoretic: 9 },
    { perioada: '2026-08', locatie: 'L02', material: 'M2', denumire: 'B', categorie: 'Food 11%', cant: 2, um: 'kg', costActual: 20, costTeoretic: 18 },
    { perioada: '2026-08', locatie: null, material: 'M3', denumire: 'C', categorie: 'Food 11%', cant: 3, um: 'kg', costActual: 30, costTeoretic: 27 },
  ] as AppState['materiale29'],
};
{
  const { api, login } = await server();
  const admin = await login('admin@fryday.ro', 'parola-admin');
  const cre = async (email: string, rol: string, locatie?: string) =>
    api(cer('/api/utilizatori', 'POST', { token: admin.token, corp: { email, parola: 'parola-lunga', rol, locatie } }));
  t('adminul creează un analist', (await cre('analist@f.ro', 'ANALIST')).cod === 200);
  t('adminul creează un manager pe L02', (await cre('mgr@f.ro', 'MANAGER', 'L02')).cod === 200);
  t('un manager fără restaurant e refuzat', (await cre('x@f.ro', 'MANAGER')).cod === 400);
  t('un rol inventat e refuzat', (await cre('y@f.ro', 'SEF')).cod === 400);
  t('o parolă scurtă e refuzată', (await api(cer('/api/utilizatori', 'POST', { token: admin.token, corp: { email: 'z@f.ro', parola: 'scurt', rol: 'ANALIST' } }))).cod === 400);
  t('rolurile acceptate sunt exact cele trei', ROLURI.join(',') === 'ADMIN,ANALIST,MANAGER');

  await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: S_RETEA, revizie: 0 } }));

  const mgr = await login('mgr@f.ro', 'parola-lunga');
  const r = await api(cer('/api/stare', 'GET', { token: mgr.token }));
  const primita = (r.corp as { stare: AppState; filtrat: boolean });
  t('managerul primește starea marcată ca filtrată', r.cod === 200 && primita.filtrat === true);
  t('nicio vânzare a altui restaurant', primita.stare.vanzari.every(v => v.locatie === 'L02'));
  t('niciun material 2.9 al altui restaurant (cele fără locație rămân)',
    primita.stare.materiale29.every(m => m.locatie === 'L02' || m.locatie === null)
    && primita.stare.materiale29.length === 2);
  t('nu vede nici măcar numele celorlalte restaurante', primita.stare.locatii.every(l => l.cod === 'L02'));

  // identitatea care contează: serverul aplică EXACT regula din motor, nu una scrisă a doua oară
  const ctx = contextAutorizare(S_RETEA, { rol: 'MANAGER', locatie: 'L02', email: 'mgr@f.ro' }, true);
  t('ce primește managerul = stareAutorizata(starea întreagă)',
    JSON.stringify(primita.stare) === JSON.stringify(stareAutorizata(S_RETEA, ctx)));

  t('managerul nu poate scrie starea comună',
    (await api(cer('/api/stare', 'PUT', { token: mgr.token, corp: { stare: S_RETEA, revizie: 1 } }))).cod === 403);
  t('managerul nu vede lista de utilizatori', (await api(cer('/api/utilizatori', 'GET', { token: mgr.token }))).cod === 403);
  t('managerul nu vede jurnalul', (await api(cer('/api/jurnal', 'GET', { token: mgr.token }))).cod === 403);
  t('managerul nu poate crea conturi', (await cre.call(null, 'nou@f.ro', 'ADMIN') && (await api(cer('/api/utilizatori', 'POST', { token: mgr.token, corp: { email: 'n@f.ro', parola: 'parola-lunga', rol: 'ADMIN' } }))).cod === 403));

  const an = await login('analist@f.ro', 'parola-lunga');
  const rAn = await api(cer('/api/stare', 'GET', { token: an.token }));
  t('analistul primește toată rețeaua, nefiltrat',
    (rAn.corp as { filtrat: boolean }).filtrat === false
    && (rAn.corp as { stare: AppState }).stare.vanzari.length === 2);
  t('analistul poate scrie', (await api(cer('/api/stare', 'PUT', { token: an.token, corp: { stare: S_RETEA, revizie: (rAn.corp as { revizie: number }).revizie } }))).cod === 200);
  t('analistul vede jurnalul', (await api(cer('/api/jurnal', 'GET', { token: an.token }))).cod === 200);
  t('analistul NU vede lista de utilizatori', (await api(cer('/api/utilizatori', 'GET', { token: an.token }))).cod === 403);
}

// ————————————————————————————————————————————————————————— 7. concurență

console.log('\n— 7. Două salvări în paralel: a doua e refuzată, nu suprascrie —');
{
  const { api, login } = await server();
  const admin = await login('admin@fryday.ro', 'parola-admin');
  await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: S_RETEA, revizie: 0 } }));
  const dupaPrima = await api(cer('/api/stare', 'GET', { token: admin.token }));
  t('prima salvare duce revizia la 1', (dupaPrima.corp as { revizie: number }).revizie === 1);

  const alta: AppState = { ...S_RETEA, vanzari: [] as AppState['vanzari'] };
  const conflict = await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: alta, revizie: 0 } }));
  t('o salvare pe o revizie veche ⇒ 409, cu revizia serverului', conflict.cod === 409
    && (conflict.corp as { revizieServer: number }).revizieServer === 1);
  const dupaConflict = await api(cer('/api/stare', 'GET', { token: admin.token }));
  t('starea NU s-a schimbat după refuz',
    JSON.stringify((dupaConflict.corp as { stare: AppState }).stare) === JSON.stringify(S_RETEA)
    && (dupaConflict.corp as { revizie: number }).revizie === 1);

  const bun = await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: alta, revizie: 1 } }));
  t('cu revizia corectă, salvarea trece și incrementează', bun.cod === 200 && (bun.corp as { revizie: number }).revizie === 2);

  t('un corp care nu e o stare FRYDAY e refuzat',
    (await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: { ceva: 1 }, revizie: 2 } }))).cod === 400);
  t('pareStare acceptă o stare reală și refuză un obiect oarecare',
    pareStare(S_RETEA) && !pareStare({ produse: [] }) && !pareStare(null));
}

// ————————————————————————————————————————————————————————— 8. administrarea conturilor

console.log('\n— 8. Administrarea conturilor —');
{
  const { api, login } = await server();
  const admin = await login('admin@fryday.ro', 'parola-admin');
  await api(cer('/api/utilizatori', 'POST', { token: admin.token, corp: { email: 'ceo@fryday.ro', parola: 'parola-lunga', rol: 'ANALIST', nume: 'CEO' } }));
  const lista = (await api(cer('/api/utilizatori', 'GET', { token: admin.token }))).corp as { utilizatori: { email: string }[] };
  t('lista are ambele conturi', lista.utilizatori.length === 2);
  t('lista NU conține hash-uri sau săruri', !JSON.stringify(lista).includes('pbkdf2$') && !JSON.stringify(lista).includes('sare'));

  const ceo = await login('ceo@fryday.ro', 'parola-lunga');
  t('contul nou se poate autentifica', ceo.cod === 200);
  await api(cer('/api/utilizatori', 'POST', { token: admin.token, corp: { email: 'ceo@fryday.ro', parola: 'alta-parola-lunga', rol: 'ANALIST' } }));
  t('schimbarea parolei încheie sesiunile vechi', (await api(cer('/api/eu', 'GET', { token: ceo.token }))).cod === 401);
  t('și noua parolă funcționează', (await login('ceo@fryday.ro', 'alta-parola-lunga')).cod === 200);
  t('vechea parolă nu mai funcționează', (await login('ceo@fryday.ro', 'parola-lunga')).cod === 401);

  t('nu îți poți șterge propriul cont',
    (await api(cer('/api/utilizatori', 'DELETE', { token: admin.token, corp: { email: 'admin@fryday.ro' } }))).cod === 400);
  t('un cont inexistent dă 404',
    (await api(cer('/api/utilizatori', 'DELETE', { token: admin.token, corp: { email: 'nimeni@f.ro' } }))).cod === 404);
  t('ștergerea unui cont existent merge',
    (await api(cer('/api/utilizatori', 'DELETE', { token: admin.token, corp: { email: 'ceo@fryday.ro' } }))).cod === 200);
  t('contul șters nu se mai poate autentifica', (await login('ceo@fryday.ro', 'alta-parola-lunga')).cod === 401);
}
{
  // ultimul administrator: dacă s-ar putea șterge, serverul ar rămâne fără nimeni care să creeze conturi
  const { api, login } = await server();
  const admin = await login('admin@fryday.ro', 'parola-admin');
  await api(cer('/api/utilizatori', 'POST', { token: admin.token, corp: { email: 'a2@fryday.ro', parola: 'parola-lunga', rol: 'ADMIN' } }));
  const a2 = await login('a2@fryday.ro', 'parola-lunga');
  t('cu doi administratori, unul se poate șterge',
    (await api(cer('/api/utilizatori', 'DELETE', { token: a2.token, corp: { email: 'admin@fryday.ro' } }))).cod === 200);
  t('ultimul administrator NU se poate șterge',
    (await api(cer('/api/utilizatori', 'DELETE', { token: a2.token, corp: { email: 'a2@fryday.ro' } }))).cod === 400);
}

// ————————————————————————————————————————————————————————— 9. jurnalul

console.log('\n— 9. Jurnalul de acces —');
{
  const { api, login } = await server();
  const admin = await login('admin@fryday.ro', 'parola-admin');
  await login('admin@fryday.ro', 'parola-gresita');
  await api(cer('/api/stare', 'PUT', { token: admin.token, corp: { stare: S_RETEA, revizie: 0 } }));
  const j = (await api(cer('/api/jurnal', 'GET', { token: admin.token }))).corp as { jurnal: { actiune: string }[] };
  const actiuni = j.jurnal.map(x => x.actiune);
  t('autentificarea reușită e înregistrată', actiuni.includes('AUTENTIFICARE'));
  t('autentificarea eșuată e înregistrată', actiuni.includes('AUTENTIFICARE_EȘUATĂ'));
  t('salvarea stării e înregistrată', actiuni.includes('SALVARE_STARE'));
  t('jurnalul nu conține parole', !JSON.stringify(j).includes('parola-admin') && !JSON.stringify(j).includes('parola-gresita'));
}

}

ruleaza().then(() => {
  console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
  if (fail) process.exit(1);
}, (e) => { console.error('EROARE în suită:', e); process.exit(1); });
