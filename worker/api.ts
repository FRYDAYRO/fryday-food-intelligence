/**
 * Învelișul Cloudflare al serverului comun: leagă D1 și WebCrypto de `raspundeApi`, care e pur.
 *
 * Aici nu stă nicio regulă de business și niciun rol — toate sunt în `src/lib/server-api.ts`,
 * testate din Node pe SQLite real. Fișierul ăsta traduce doar: cerere HTTP → `CerereApi`,
 * `RaspunsApi` → răspuns HTTP, și D1 → `AdaptorDb`.
 */
import {
  pregatesteSchema, raspundeApi, seedAdmin,
  type AdaptorDb, type CerereApi,
} from '../src/lib/server-api';
import { adaptorParole } from '../src/lib/parole';

/** Minimul din D1 de care avem nevoie — fără să adăugăm o dependență de tipuri. */
interface D1Rezultat<T> { results: T[] }
interface D1Comanda { bind(...v: unknown[]): D1Comanda; all<T>(): Promise<D1Rezultat<T>> }
export interface D1Baza { prepare(sql: string): D1Comanda; batch(c: D1Comanda[]): Promise<unknown> }

export interface EnvApi {
  DB?: D1Baza;
  /** Contul inițial, creat o singură dată, doar dacă ambele secrete există. */
  FRYDAY_ADMIN_EMAIL?: string;
  FRYDAY_ADMIN_PAROLA?: string;
}

export const adaptorD1 = (db: D1Baza): AdaptorDb => ({
  async toate<T>(sql: string, p: unknown[] = []): Promise<T[]> {
    const r = await db.prepare(sql).bind(...p).all<T>();
    return r.results ?? [];
  },
  async lot(cereri) {
    if (!cereri.length) return;
    // D1 aplică lotul atomic: ori toate comenzile, ori niciuna
    await db.batch(cereri.map(c => db.prepare(c.sql).bind(...(c.p ?? []))));
  },
});

/**
 * Schema și contul inițial, o singură dată per izolat. `IF NOT EXISTS` face pregătirea
 * idempotentă, iar `seedAdmin` nu face nimic dacă există deja măcar un utilizator.
 */
let pregatire: Promise<void> | null = null;
function pregateste(db: AdaptorDb, env: EnvApi, acum: string): Promise<void> {
  pregatire ??= (async () => {
    await pregatesteSchema(db);
    if (env.FRYDAY_ADMIN_EMAIL && env.FRYDAY_ADMIN_PAROLA) {
      await seedAdmin(db, adaptorParole, env.FRYDAY_ADMIN_EMAIL, env.FRYDAY_ADMIN_PAROLA, acum);
    }
  })().catch(e => { pregatire = null; throw e; });
  return pregatire;
}

/**
 * Antetele CORS. Clientul poate rula pe altă origine decât workerul (dezvoltare pe :5173 cu
 * serverul pe :8787, sau interfața servită de altundeva): fără ele, browserul oprește cererea
 * înainte s-o trimită. Nu punem `credentials`: jetonul călătorește într-un antet, nu în cookie,
 * deci nu există cerere autentificată „din oficiu" de pe altă origine.
 */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, x-fryday-token',
  'access-control-max-age': '86400',
};

const json = (cod: number, corp: unknown): Response =>
  new Response(JSON.stringify(corp), {
    status: cod,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // răspunsurile conțin date de business: nu se cachează nicăieri pe drum
      'cache-control': 'private, no-store',
      ...CORS,
    },
  });

/**
 * Corpul, citit cu un plafon REAL: `request.text()` ar aduna tot în memorie înainte de orice
 * verificare, iar o cerere fără `content-length` (chunked) trecea de plafon. Numărăm octeții
 * pe măsură ce vin și ne oprim la primul care depășește — înainte să existe alocarea.
 */
async function corpLimitat(request: Request, limita: number): Promise<string | null> {
  const declarata = Number(request.headers.get('content-length') ?? 0);
  if (declarata > limita) return null;
  const flux = request.body;
  if (!flux) return '';
  const cititor = flux.getReader();
  const parti: Uint8Array[] = [];
  let octeti = 0;
  for (;;) {
    const { done, value } = await cititor.read();
    if (done) break;
    octeti += value.byteLength;
    if (octeti > limita) { await cititor.cancel(); return null; }
    parti.push(value);
  }
  const tot = new Uint8Array(octeti);
  let i = 0;
  for (const p of parti) { tot.set(p, i); i += p.byteLength; }
  return new TextDecoder().decode(tot);
}

/** Corpul JSON al cererii, cu o limită: un corp uriaș nu trebuie să doboare izolatul. */
const LIMITA_CORP = 60 * 1024 * 1024;

export async function raspundeApiHttp(request: Request, env: EnvApi): Promise<Response> {
  const url = new URL(request.url);
  // preflight-ul nu poartă jeton și nu trebuie să atingă baza: i se răspunde primul
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (!env.DB) {
    return json(503, { eroare: 'Serverul comun nu e configurat: lipsește legătura D1 „DB". Vezi wrangler.toml.' });
  }
  const db = adaptorD1(env.DB);
  const acum = new Date().toISOString();

  try {
    await pregateste(db, env, acum);
  } catch (e) {
    return json(503, { eroare: `Baza de date nu s-a putut pregăti: ${(e as Error)?.message ?? e}` });
  }

  let corp: unknown;
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    const text = await corpLimitat(request, LIMITA_CORP);
    if (text === null) return json(413, { eroare: 'Corpul cererii e prea mare' });
    if (text) {
      try { corp = JSON.parse(text); } catch { return json(400, { eroare: 'Corpul nu e JSON valid' }); }
    }
  }

  const auth = request.headers.get('x-fryday-token') ?? request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  const cerere: CerereApi = { cale: url.pathname, metoda: request.method, token, corp };
  try {
    const r = await raspundeApi(cerere, db, adaptorParole, acum);
    return json(r.cod, r.corp);
  } catch (e) {
    // mesajul intern nu iese la client: ar putea descrie schema
    console.error('API:', e);
    return json(500, { eroare: 'Eroare internă a serverului' });
  }
}
