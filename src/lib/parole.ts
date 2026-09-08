/**
 * Parole și jetoane, peste WebCrypto — standardul disponibil identic în Cloudflare Workers și
 * în Node, deci aceeași implementare rulează în producție și în teste.
 *
 * De ce PBKDF2 și nu SHA-256 simplu: un hash rapid, fără sare, se sparge cu un tabel gata
 * calculat. PBKDF2 cu sare pe fiecare cont face fiecare încercare scumpă și obligă atacatorul
 * să reia munca pentru fiecare utilizator. 210.000 de iterații e recomandarea OWASP pentru
 * PBKDF2-HMAC-SHA256; pe un Worker, un login costă câteva zeci de milisecunde.
 */

export const ITERATII = 210_000;

const enc = new TextEncoder();

const hex = (b: ArrayBuffer): string =>
  [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');

/** Hash-ul unei parole cu sarea ei. Aceeași pereche dă întotdeauna același rezultat. */
export async function hashParola(parola: string, sare: string, iteratii = ITERATII): Promise<string> {
  const cheie = await crypto.subtle.importKey('raw', enc.encode(parola), 'PBKDF2', false, ['deriveBits']);
  const biti = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(sare), iterations: iteratii, hash: 'SHA-256' },
    cheie, 256,
  );
  return `pbkdf2$${iteratii}$${hex(biti)}`;
}

const aleator = (octeti: number): string =>
  [...crypto.getRandomValues(new Uint8Array(octeti))].map(x => x.toString(16).padStart(2, '0')).join('');

/** Sare nouă, 16 octeți. Nu se refolosește între conturi. */
export const sareNoua = (): string => aleator(16);

/** Jeton de sesiune, 32 de octeți: nu se ghicește și nu se enumeră. */
export const tokenNou = (): string => aleator(32);

/** Adaptorul cerut de `server-api`, gata legat. */
export const adaptorParole = {
  hash: (parola: string, sare: string) => hashParola(parola, sare),
  sareNoua,
  tokenNou,
};
