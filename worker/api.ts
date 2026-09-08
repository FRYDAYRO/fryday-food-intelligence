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

const json = (cod: number, corp: unknown): Response =>
  new Response(JSON.stringify(corp), {
    status: cod,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // răspunsurile conțin date de business: nu se cachează nicăieri pe drum
      'cache-control': 'private, no-store',
    },
  });

/** Corpul JSON al cererii, cu o limită: un corp uriaș nu trebuie să doboare izolatul. */
const LIMITA_CORP = 60 * 1024 * 1024;

export async function raspundeApiHttp(request: Request, env: EnvApi): Promise<Response> {
  const url = new URL(request.url);
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
    const lungime = Number(request.headers.get('content-length') ?? 0);
    if (lungime > LIMITA_CORP) return json(413, { eroare: 'Corpul cererii e prea mare' });
    const text = await request.text();
    if (text.length > LIMITA_CORP) return json(413, { eroare: 'Corpul cererii e prea mare' });
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
