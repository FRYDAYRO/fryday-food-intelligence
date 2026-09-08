/**
 * Poartă de acces pentru FRYDAY Food Intelligence, fără Zero Trust și fără card.
 *
 * Cere utilizator și parolă (HTTP Basic) înainte de a servi aplicația. Parola se ține ca
 * secret în Cloudflare, nu în cod:
 *
 *   npx wrangler secret put FRYDAY_PAROLA        # o dată, la configurare
 *   npx wrangler deploy
 *
 * Parola e COMUNĂ: oprește accesul întâmplător și indexarea, dar nu spune cine a intrat.
 * Conturile pe persoană, cu roluri, vin din serverul comun de sub `/api/` (vezi `api.ts`):
 * acela are autentificarea lui și trece înaintea porții, fiindcă antetul `authorization` e
 * deja folosit aici. Parola comună rămâne zidul exterior al interfeței.
 */

import { raspundeApiHttp, type EnvApi } from './api';

interface Env extends EnvApi {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  FRYDAY_PAROLA?: string;
  FRYDAY_UTILIZATOR?: string;
}

/** Comparație în timp constant, ca să nu se poată ghici parola din durata răspunsului. */
function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const cereAutentificare = () =>
  new Response('Acces restricționat — FRYDAY Food Intelligence', {
    status: 401,
    headers: {
      'www-authenticate': 'Basic realm="FRYDAY Food Intelligence", charset="UTF-8"',
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // API-ul serverului comun trece ÎNAINTEA porții de parolă: are autentificarea lui, pe
    // conturi și jetoane. Dacă ar sta în spatele ei, clientul n-ar putea trimite `Bearer`,
    // fiindcă antetul `authorization` e deja luat de parola comună.
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return raspundeApiHttp(request, env);
    }

    const parola = env.FRYDAY_PAROLA;
    // Fără secret configurat, refuzăm tot: mai bine inaccesibil decât deschis din greșeală.
    if (!parola) {
      return new Response(
        'Parola nu e configurată. Rulează: npx wrangler secret put FRYDAY_PAROLA',
        { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
      );
    }

    const auth = request.headers.get('authorization') ?? '';
    if (!auth.startsWith('Basic ')) return cereAutentificare();

    let user = '', pass = '';
    try {
      const dec = atob(auth.slice(6));
      const i = dec.indexOf(':');
      user = dec.slice(0, i);
      pass = dec.slice(i + 1);
    } catch {
      return cereAutentificare();
    }

    const userAsteptat = env.FRYDAY_UTILIZATOR ?? 'fryday';
    if (!egal(user, userAsteptat) || !egal(pass, parola)) return cereAutentificare();

    const res = await env.ASSETS.fetch(request);
    // conținut privat: nu se cachează pe drum și nu se indexează
    const h = new Headers(res.headers);
    h.set('cache-control', 'private, no-store');
    h.set('x-robots-tag', 'noindex, nofollow');
    return new Response(res.body, { status: res.status, headers: h });
  },
};
