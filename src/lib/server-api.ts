/**
 * API-ul serverului comun — PUR, ca tot ce stă în `lib/`.
 *
 * Nu cunoaște nici D1, nici Node, nici `fetch`: primește un adaptor de bază de date și unul
 * de parole, deci rulează identic în Worker (Cloudflare) și în suita de teste (Node). Regula
 * de rol NU se rescrie aici: filtrarea vine din `stareAutorizata`, aceeași funcție pe care o
 * folosește și interfața, ca un manager să vadă exact același subset în ambele locuri.
 *
 * Ce ține serverul, și de ce așa:
 *
 *   · Starea e un singur JSON, ca instantaneul local — motorul lucrează pe `AppState` întreg.
 *     D1 are o limită pe rând, iar starea rețelei crește peste ea, deci JSON-ul se taie în
 *     BUCĂȚI de `MARIME_BUCATA`, scrise sub o revizie NOUĂ. Pointerul (`stare_meta.revizie`)
 *     se mută la final, printr-o singură comandă: dacă scrierea cade la jumătate, revizia
 *     veche rămâne întreagă și citibilă. Nu există stare pe jumătate salvată.
 *   · Compresia nu se face aici: Cloudflare comprimă răspunsul HTTP singur, iar în D1 spațiul
 *     nu e problema (JSON-ul brut al unui an de rețea intră lejer în cota gratuită).
 *   · Parolele NU se țin ca SHA-256 simplu: fiecare are sarea lui și trece prin PBKDF2, iar
 *     comparația e în timp constant. Sesiunile expiră.
 */
import { contextAutorizare, stareAutorizata, type RolServer } from './fc-acces';
import type { AppState } from './types';

/** Rândurile se taie sub limita pe rând a lui D1, cu marjă. */
export const MARIME_BUCATA = 600_000;

/** Cât trăiește o sesiune. Un token furat nu e valabil la nesfârșit. */
export const ZILE_SESIUNE = 30;

/** Câte revizii vechi se păstrează după o salvare reușită. */
export const REVIZII_PASTRATE = 2;

export const ROLURI: RolServer[] = ['ADMIN', 'ANALIST', 'MANAGER'];

export interface AdaptorDb {
  toate<T = Record<string, unknown>>(sql: string, p?: unknown[]): Promise<T[]>;
  /** Execută mai multe comenzi. Adaptorul decide dacă sunt atomice; algoritmul nu se bazează pe asta. */
  lot(cereri: { sql: string; p?: unknown[] }[]): Promise<void>;
}

export interface AdaptorParola {
  /** PBKDF2 sau echivalent. Aceeași sare ⇒ același rezultat. */
  hash(parola: string, sare: string): Promise<string>;
  sareNoua(): string;
  tokenNou(): string;
}

export interface CerereApi {
  cale: string;
  metoda: string;
  token: string | null;
  corp?: unknown;
}

export interface RaspunsApi {
  cod: number;
  corp: Record<string, unknown>;
}

export interface UtilizatorServer {
  email: string;
  rol: RolServer;
  locatie: string | null;
  nume: string | null;
}

const ras = (cod: number, corp: Record<string, unknown>): RaspunsApi => ({ cod, corp });
const eroare = (cod: number, mesaj: string, extra: Record<string, unknown> = {}) =>
  ras(cod, { eroare: mesaj, ...extra });

/** Comparație în timp constant: durata răspunsului nu trebuie să spună cât din hash e corect. */
export function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Schema. Rulată la fiecare pornire: `IF NOT EXISTS` o face idempotentă. */
export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS utilizatori (
    email TEXT PRIMARY KEY, parolaHash TEXT NOT NULL, sare TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('ADMIN','ANALIST','MANAGER')),
    locatie TEXT, nume TEXT, creatLa TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sesiuni (
    token TEXT PRIMARY KEY, email TEXT NOT NULL, creatLa TEXT NOT NULL, expiraLa TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS stare_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    revizie INTEGER NOT NULL, actualizatLa TEXT NOT NULL, actualizatDe TEXT, bucati INTEGER NOT NULL, octeti INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS stare_bucati (
    revizie INTEGER NOT NULL, nr INTEGER NOT NULL, continut TEXT NOT NULL,
    PRIMARY KEY (revizie, nr)
  )`,
  `CREATE TABLE IF NOT EXISTS jurnal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL, email TEXT, actiune TEXT NOT NULL, detalii TEXT
  )`,
];

export async function pregatesteSchema(db: AdaptorDb): Promise<void> {
  await db.lot(SCHEMA.map(sql => ({ sql })));
}

/** Taie un șir în bucăți de cel mult `MARIME_BUCATA`. Reunirea lor dă exact șirul inițial. */
export function taieInBucati(s: string, marime = MARIME_BUCATA): string[] {
  if (marime <= 0) throw new Error('marimea bucății trebuie să fie pozitivă');
  if (s === '') return [''];
  const out: string[] = [];
  for (let i = 0; i < s.length; i += marime) out.push(s.slice(i, i + marime));
  return out;
}

interface RandMeta { revizie: number; actualizatLa: string; actualizatDe: string | null; bucati: number; octeti: number }

async function meta(db: AdaptorDb): Promise<RandMeta | null> {
  const r = await db.toate<RandMeta>('SELECT revizie, actualizatLa, actualizatDe, bucati, octeti FROM stare_meta WHERE id = 1');
  return r[0] ?? null;
}

/** Citește starea reviziei active, reunind bucățile în ordine. */
export async function citesteStarea(db: AdaptorDb): Promise<{ revizie: number; stare: AppState | null; actualizatLa: string | null; actualizatDe: string | null }> {
  const m = await meta(db);
  if (!m) return { revizie: 0, stare: null, actualizatLa: null, actualizatDe: null };
  const bucati = await db.toate<{ nr: number; continut: string }>(
    'SELECT nr, continut FROM stare_bucati WHERE revizie = ? ORDER BY nr', [m.revizie]);
  if (bucati.length !== m.bucati) {
    // pointerul arată spre o revizie incompletă: mai bine o eroare decât o stare trunchiată
    throw new Error(`revizia ${m.revizie} are ${bucati.length} bucăți din ${m.bucati} — starea nu se poate reconstitui`);
  }
  const json = bucati.map(b => b.continut).join('');
  return { revizie: m.revizie, stare: JSON.parse(json) as AppState, actualizatLa: m.actualizatLa, actualizatDe: m.actualizatDe };
}

/**
 * Scrie o revizie nouă. Bucățile noi se scriu ÎNAINTE ca pointerul să se mute, deci o cădere
 * la mijloc lasă revizia veche întreagă. Curățenia reviziilor vechi vine după mutare.
 */
export async function scrieStarea(
  db: AdaptorDb, stare: unknown, revizieNoua: number, acum: string, deCine: string | null,
): Promise<{ bucati: number; octeti: number }> {
  const json = JSON.stringify(stare);
  const bucati = taieInBucati(json);
  await db.lot(bucati.map((continut, i) => ({
    sql: 'INSERT OR REPLACE INTO stare_bucati (revizie, nr, continut) VALUES (?,?,?)',
    p: [revizieNoua, i, continut],
  })));
  await db.lot([{
    sql: `INSERT INTO stare_meta (id, revizie, actualizatLa, actualizatDe, bucati, octeti) VALUES (1,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET revizie=excluded.revizie, actualizatLa=excluded.actualizatLa,
          actualizatDe=excluded.actualizatDe, bucati=excluded.bucati, octeti=excluded.octeti`,
    p: [revizieNoua, acum, deCine, bucati.length, json.length],
  }]);
  await db.lot([{ sql: 'DELETE FROM stare_bucati WHERE revizie <= ?', p: [revizieNoua - REVIZII_PASTRATE] }]);
  return { bucati: bucati.length, octeti: json.length };
}

async function utilizatorDinToken(db: AdaptorDb, token: string | null, acum: string): Promise<UtilizatorServer | null> {
  if (!token) return null;
  const s = await db.toate<{ email: string; expiraLa: string }>(
    'SELECT email, expiraLa FROM sesiuni WHERE token = ?', [token]);
  const sesiune = s[0];
  if (!sesiune || sesiune.expiraLa <= acum) return null;
  const u = await db.toate<UtilizatorServer>(
    'SELECT email, rol, locatie, nume FROM utilizatori WHERE email = ?', [sesiune.email]);
  return u[0] ?? null;
}

const jurnal = (email: string | null, actiune: string, acum: string, detalii?: string) => ({
  sql: 'INSERT INTO jurnal (data, email, actiune, detalii) VALUES (?,?,?,?)',
  p: [acum, email, actiune, detalii ?? null] as unknown[],
});

/** O stare plauzibilă: colecțiile de bază există. Nu validăm conținutul — motorul o face. */
export function pareStare(x: unknown): x is AppState {
  const s = x as Partial<AppState> | null;
  return !!s && typeof s === 'object'
    && Array.isArray(s.produse) && Array.isArray(s.retete)
    && Array.isArray(s.ingrediente) && Array.isArray(s.vanzari) && Array.isArray(s.locatii);
}

const zilePeste = (acum: string, zile: number) =>
  new Date(new Date(acum).getTime() + zile * 86_400_000).toISOString();

const corpObiect = (c: CerereApi): Record<string, unknown> =>
  (c.corp && typeof c.corp === 'object' ? c.corp : {}) as Record<string, unknown>;

/**
 * Poarta unică a serverului. Întoarce codul și corpul; nu scrie nimic în afara bazei.
 * `acum` se primește, nu se citește din ceas: altfel testele n-ar fi deterministe.
 */
export async function raspundeApi(
  c: CerereApi, db: AdaptorDb, parole: AdaptorParola, acum: string,
): Promise<RaspunsApi> {
  const { cale, metoda } = c;

  if (cale === '/api/sanatate' && metoda === 'GET') {
    const m = await meta(db);
    return ras(200, { ok: true, revizie: m?.revizie ?? 0, actualizatLa: m?.actualizatLa ?? null });
  }

  if (cale === '/api/autentificare' && metoda === 'POST') {
    const corp = corpObiect(c);
    const email = String(corp.email ?? '').trim().toLowerCase();
    const parola = String(corp.parola ?? '');
    const r = await db.toate<{ email: string; parolaHash: string; sare: string; rol: RolServer; locatie: string | null; nume: string | null }>(
      'SELECT email, parolaHash, sare, rol, locatie, nume FROM utilizatori WHERE email = ?', [email]);
    const u = r[0];
    // hash-uim chiar și când contul nu există: altfel durata răspunsului ar spune cine e înscris
    const sare = u?.sare ?? 'sare-inexistenta';
    const calculat = await parole.hash(parola, sare);
    if (!u || !egal(calculat, u.parolaHash)) {
      await db.lot([jurnal(email || null, 'AUTENTIFICARE_EȘUATĂ', acum)]);
      return eroare(401, 'Email sau parolă greșite');
    }
    const token = parole.tokenNou();
    await db.lot([
      { sql: 'INSERT INTO sesiuni (token, email, creatLa, expiraLa) VALUES (?,?,?,?)', p: [token, u.email, acum, zilePeste(acum, ZILE_SESIUNE)] },
      { sql: 'DELETE FROM sesiuni WHERE expiraLa <= ?', p: [acum] },
      jurnal(u.email, 'AUTENTIFICARE', acum),
    ]);
    return ras(200, { token, utilizator: { email: u.email, rol: u.rol, locatie: u.locatie, nume: u.nume } });
  }

  const u = await utilizatorDinToken(db, c.token, acum);
  if (!u) return eroare(401, 'Neautentificat');

  if (cale === '/api/eu' && metoda === 'GET') return ras(200, { utilizator: u });

  if (cale === '/api/deconectare' && metoda === 'POST') {
    await db.lot([{ sql: 'DELETE FROM sesiuni WHERE token = ?', p: [c.token] }]);
    return ras(200, { ok: true });
  }

  if (cale === '/api/stare' && metoda === 'GET') {
    const s = await citesteStarea(db);
    if (!s.stare) return ras(200, { revizie: 0, stare: null, filtrat: false });
    // regula de rol e cea din motor, nu una scrisă a doua oară aici
    const ctx = contextAutorizare(s.stare, { rol: u.rol, locatie: u.locatie, nume: u.nume, email: u.email }, true);
    return ras(200, {
      revizie: s.revizie, actualizatLa: s.actualizatLa, actualizatDe: s.actualizatDe,
      stare: stareAutorizata(s.stare, ctx),
      filtrat: u.rol === 'MANAGER' && !!u.locatie,
    });
  }

  if (cale === '/api/stare' && metoda === 'PUT') {
    if (u.rol === 'MANAGER') return eroare(403, 'Managerii nu pot modifica starea comună');
    const corp = corpObiect(c);
    if (!pareStare(corp.stare)) return eroare(400, 'Corpul nu conține o stare FRYDAY validă');
    const m = await meta(db);
    const rCurent = m?.revizie ?? 0;
    const trimisa = corp.revizie;
    // control de concurență: dacă altcineva a salvat între timp, refuzăm în loc să suprascriem
    if (trimisa != null && trimisa !== rCurent) {
      return eroare(409, 'Starea a fost modificată de altcineva între timp', { revizieServer: rCurent });
    }
    const nou = rCurent + 1;
    const scris = await scrieStarea(db, corp.stare, nou, acum, u.email);
    await db.lot([jurnal(u.email, 'SALVARE_STARE', acum, `revizia ${nou} · ${scris.bucati} bucăți · ${scris.octeti} octeți`)]);
    return ras(200, { revizie: nou, actualizatLa: acum, bucati: scris.bucati, octeti: scris.octeti });
  }

  if (cale === '/api/utilizatori' && metoda === 'GET') {
    if (u.rol !== 'ADMIN') return eroare(403, 'Doar administratorii');
    return ras(200, { utilizatori: await db.toate('SELECT email, rol, locatie, nume, creatLa FROM utilizatori ORDER BY email') });
  }

  if (cale === '/api/utilizatori' && metoda === 'POST') {
    if (u.rol !== 'ADMIN') return eroare(403, 'Doar administratorii');
    const corp = corpObiect(c);
    const email = String(corp.email ?? '').trim().toLowerCase();
    const parola = String(corp.parola ?? '');
    const rol = String(corp.rol ?? '') as RolServer;
    const locatie = corp.locatie == null || corp.locatie === '' ? null : String(corp.locatie);
    if (!email || !email.includes('@')) return eroare(400, 'Email lipsă sau invalid');
    if (parola.length < 8) return eroare(400, 'Parola trebuie să aibă cel puțin 8 caractere');
    if (!ROLURI.includes(rol)) return eroare(400, `Rolul trebuie să fie unul dintre: ${ROLURI.join(', ')}`);
    if (rol === 'MANAGER' && !locatie) return eroare(400, 'Un manager are nevoie de restaurantul lui');
    const sare = parole.sareNoua();
    const h = await parole.hash(parola, sare);
    await db.lot([
      { sql: `INSERT INTO utilizatori (email, parolaHash, sare, rol, locatie, nume, creatLa) VALUES (?,?,?,?,?,?,?)
              ON CONFLICT(email) DO UPDATE SET parolaHash=excluded.parolaHash, sare=excluded.sare,
              rol=excluded.rol, locatie=excluded.locatie, nume=excluded.nume`,
        p: [email, h, sare, rol, locatie, corp.nume == null ? null : String(corp.nume), acum] },
      // parola schimbată încheie sesiunile vechi ale acelui cont
      { sql: 'DELETE FROM sesiuni WHERE email = ?', p: [email] },
      jurnal(u.email, 'UTILIZATOR_SALVAT', acum, `${email} · ${rol}${locatie ? ` · ${locatie}` : ''}`),
    ]);
    return ras(200, { ok: true, email, rol, locatie });
  }

  if (cale === '/api/utilizatori' && metoda === 'DELETE') {
    if (u.rol !== 'ADMIN') return eroare(403, 'Doar administratorii');
    const email = String(corpObiect(c).email ?? '').trim().toLowerCase();
    if (!email) return eroare(400, 'Email lipsă');
    if (email === u.email) return eroare(400, 'Nu îți poți șterge propriul cont');
    const admini = await db.toate<{ n: number }>("SELECT COUNT(*) n FROM utilizatori WHERE rol = 'ADMIN'");
    const tinta = await db.toate<{ rol: RolServer }>('SELECT rol FROM utilizatori WHERE email = ?', [email]);
    if (!tinta[0]) return eroare(404, 'Cont inexistent');
    // fără asta, o ștergere greșită ar lăsa serverul fără nimeni care să mai creeze conturi
    if (tinta[0].rol === 'ADMIN' && (admini[0]?.n ?? 0) <= 1) return eroare(400, 'Ultimul administrator nu se poate șterge');
    await db.lot([
      { sql: 'DELETE FROM utilizatori WHERE email = ?', p: [email] },
      { sql: 'DELETE FROM sesiuni WHERE email = ?', p: [email] },
      jurnal(u.email, 'UTILIZATOR_ȘTERS', acum, email),
    ]);
    return ras(200, { ok: true });
  }

  if (cale === '/api/jurnal' && metoda === 'GET') {
    if (u.rol === 'MANAGER') return eroare(403, 'Doar administratorii și analiștii');
    return ras(200, { jurnal: await db.toate('SELECT id, data, email, actiune, detalii FROM jurnal ORDER BY id DESC LIMIT 200') });
  }

  return eroare(404, 'Rută necunoscută');
}

/**
 * Primul administrator, creat o singură dată, dintr-un secret de mediu. Fără el, un server
 * proaspăt n-ar avea cum să primească primul cont; cu el, contul există DOAR dacă cineva a
 * pus secretul. Parola se schimbă după prima autentificare, prin `/api/utilizatori`.
 */
export async function seedAdmin(
  db: AdaptorDb, parole: AdaptorParola, email: string, parola: string, acum: string,
): Promise<boolean> {
  const n = await db.toate<{ n: number }>('SELECT COUNT(*) n FROM utilizatori');
  if ((n[0]?.n ?? 0) > 0) return false;
  const sare = parole.sareNoua();
  await db.lot([
    { sql: 'INSERT INTO utilizatori (email, parolaHash, sare, rol, locatie, nume, creatLa) VALUES (?,?,?,?,?,?,?)',
      p: [email.trim().toLowerCase(), await parole.hash(parola, sare), sare, 'ADMIN', null, 'Administrator', acum] },
    jurnal(null, 'ADMIN_INITIAL', acum, email),
  ]);
  return true;
}
