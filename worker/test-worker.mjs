// Testăm logica porții de acces, fără să implicăm Cloudflare.
const mod = await import('./worker-compilat.mjs');
const w = mod.default;
let ok = 0, fail = 0;
const t = (n, c, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const ASSETS = { fetch: async () => new Response('<html>aplicația</html>', { headers: { 'content-type': 'text/html' } }) };
const cere = (auth, env = { ASSETS, FRYDAY_PAROLA: 'secret123' }) =>
  w.fetch(new Request('https://x/', auth ? { headers: { authorization: auth } } : {}), env);
const basic = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');

console.log('— Poarta de acces —');
t('fără secret configurat, nu servește nimic', (await cere(basic('fryday', 'x'), { ASSETS })).status === 503);
t('fără antet de autentificare → 401', (await cere(null)).status === 401);
const r401 = await cere(null);
t('cere autentificare Basic în antet', (r401.headers.get('www-authenticate') ?? '').startsWith('Basic realm='));
t('parolă greșită → 401', (await cere(basic('fryday', 'greșit'))).status === 401);
t('utilizator greșit → 401', (await cere(basic('altcineva', 'secret123'))).status === 401);
t('antet malformat → 401', (await cere('Basic !!!'))?.status === 401);
t('schemă necunoscută → 401', (await cere('Bearer abc')).status === 401);
const bun = await cere(basic('fryday', 'secret123'));
t('acreditări corecte → aplicația se servește', bun.status === 200 && (await bun.text()).includes('aplicația'));
const bun2 = await cere(basic('fryday', 'secret123'));
t('conținutul nu se cachează', (bun2.headers.get('cache-control') ?? '').includes('no-store'));
t('nu se indexează de motoarele de căutare', (bun2.headers.get('x-robots-tag') ?? '').includes('noindex'));
t('utilizatorul e configurabil', (await cere(basic('vali', 'secret123'), { ASSETS, FRYDAY_PAROLA: 'secret123', FRYDAY_UTILIZATOR: 'vali' })).status === 200);
t('parola de lungime diferită e respinsă', (await cere(basic('fryday', 'secret'))).status === 401);
console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
