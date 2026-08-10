// Teste pe serverul real: pornește o instanță, exersează rolurile și concurența.
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
const DB = '/tmp/fryday-test.db';
for (const s of ['', '-wal', '-shm']) { try { rmSync(DB + s); } catch { /* nu exista */ } }
const srv = spawn('node', ['server/server.mjs'], { env: { ...process.env, PORT: '8899', DB, ADMIN_PAROLA: 'test123' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));

let ok = 0, fail = 0;
const t = (n, c, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const B = 'http://localhost:8899';
const cere = async (cale, opt = {}) => {
  const r = await fetch(B + cale, { ...opt, headers: { 'content-type': 'application/json', ...(opt.headers ?? {}) } });
  return { cod: r.status, corp: await r.json() };
};
const cuToken = (tok) => ({ authorization: `Bearer ${tok}` });

try {
  console.log('— Sănătate și autentificare —');
  t('serverul răspunde', (await cere('/api/sanatate')).corp.ok === true);
  t('parolă greșită → 401', (await cere('/api/autentificare', { method: 'POST', body: JSON.stringify({ email: 'admin@fryday.ro', parola: 'x' }) })).cod === 401);
  const a = await cere('/api/autentificare', { method: 'POST', body: JSON.stringify({ email: 'admin@fryday.ro', parola: 'test123' }) });
  t('admin se autentifică și primește token', a.cod === 200 && !!a.corp.token);
  const tokAdmin = a.corp.token;
  t('rolul e ADMIN', a.corp.utilizator.rol === 'ADMIN');
  t('fără token → 401', (await cere('/api/stare')).cod === 401);

  console.log('— Salvarea stării, cu control de concurență —');
  const stare1 = {
    locatii: [{ cod: 'L01', nume: 'Sun Plaza' }, { cod: 'L02', nume: 'Oradea' }],
    produse: [{ cod: 'B1', denumire: 'Burger' }], ingrediente: [], retete: [],
    vanzari: [
      { data: '2026-07-15', locatie: 'L01', canal: 'INSTORE', produs: 'B1', cant: 10, brut: 200, net: 180 },
      { data: '2026-07-15', locatie: 'L02', canal: 'INSTORE', produs: 'B1', cant: 20, brut: 400, net: 360 },
    ],
    waste: [{ locatie: 'L01', perioada: '2026-07', ingredient: 'X', cant: 1, um: 'buc' }],
    inventar: [], linii29: [], salesReport: [], labor: [],
    tinte: [{ locatie: 'RETEA', fcCurat: 45 }, { locatie: 'L02', fcCurat: 44 }],
  };
  const p1 = await cere('/api/stare', { method: 'PUT', headers: cuToken(tokAdmin), body: JSON.stringify({ stare: stare1, revizie: 0 }) });
  t('prima salvare → revizia 1', p1.cod === 200 && p1.corp.revizie === 1);
  const g1 = await cere('/api/stare', { headers: cuToken(tokAdmin) });
  t('adminul primește starea completă', g1.corp.stare.vanzari.length === 2 && g1.corp.filtrat === false);
  const conflict = await cere('/api/stare', { method: 'PUT', headers: cuToken(tokAdmin), body: JSON.stringify({ stare: stare1, revizie: 0 }) });
  t('salvarea pe o revizie învechită → 409, nu suprascriere', conflict.cod === 409 && conflict.corp.revizieServer === 1);
  const p2 = await cere('/api/stare', { method: 'PUT', headers: cuToken(tokAdmin), body: JSON.stringify({ stare: stare1, revizie: 1 }) });
  t('salvarea pe revizia corectă merge', p2.cod === 200 && p2.corp.revizie === 2);

  console.log('— Roluri: managerul vede doar restaurantul lui —');
  await cere('/api/utilizatori', { method: 'POST', headers: cuToken(tokAdmin), body: JSON.stringify({ email: 'oradea@fryday.ro', parola: 'm1', rol: 'MANAGER', locatie: 'L02', nume: 'Manager Oradea' }) });
  const mgrFaraLoc = await cere('/api/utilizatori', { method: 'POST', headers: cuToken(tokAdmin), body: JSON.stringify({ email: 'x@fryday.ro', parola: 'm', rol: 'MANAGER' }) });
  t('un manager fără restaurant e refuzat', mgrFaraLoc.cod === 400);
  const m = await cere('/api/autentificare', { method: 'POST', body: JSON.stringify({ email: 'oradea@fryday.ro', parola: 'm1' }) });
  const tokMgr = m.corp.token;
  const gm = await cere('/api/stare', { headers: cuToken(tokMgr) });
  t('managerul primește doar vânzările lui', gm.corp.stare.vanzari.length === 1 && gm.corp.stare.vanzari[0].locatie === 'L02');
  t('serverul marchează răspunsul ca filtrat', gm.corp.filtrat === true);
  t('waste-ul altui restaurant nu ajunge la el', gm.corp.stare.waste.length === 0);
  t('vede doar restaurantul lui în listă', gm.corp.stare.locatii.length === 1 && gm.corp.stare.locatii[0].cod === 'L02');
  t('ținta de rețea îi rămâne vizibilă', gm.corp.stare.tinte.some(x => x.locatie === 'RETEA'));
  t('nomenclatorul e comun, nu filtrat', gm.corp.stare.produse.length === 1);
  t('managerul NU poate salva starea', (await cere('/api/stare', { method: 'PUT', headers: cuToken(tokMgr), body: JSON.stringify({ stare: stare1 }) })).cod === 403);
  t('managerul nu poate administra utilizatori', (await cere('/api/utilizatori', { headers: cuToken(tokMgr) })).cod === 403);
  t('managerul nu vede jurnalul', (await cere('/api/jurnal', { headers: cuToken(tokMgr) })).cod === 403);

  console.log('— Analistul: scrie, dar nu administrează —');
  await cere('/api/utilizatori', { method: 'POST', headers: cuToken(tokAdmin), body: JSON.stringify({ email: 'analist@fryday.ro', parola: 'a1', rol: 'ANALIST' }) });
  const an = await cere('/api/autentificare', { method: 'POST', body: JSON.stringify({ email: 'analist@fryday.ro', parola: 'a1' }) });
  const tokAn = an.corp.token;
  t('analistul vede tot', (await cere('/api/stare', { headers: cuToken(tokAn) })).corp.stare.vanzari.length === 2);
  t('analistul poate salva', (await cere('/api/stare', { method: 'PUT', headers: cuToken(tokAn), body: JSON.stringify({ stare: stare1, revizie: 2 }) })).cod === 200);
  t('analistul nu administrează utilizatori', (await cere('/api/utilizatori', { headers: cuToken(tokAn) })).cod === 403);

  console.log('— Persistența și jurnalul —');
  t('revizia se vede public în /sanatate', (await cere('/api/sanatate')).corp.revizie === 3);
  const j = await cere('/api/jurnal', { headers: cuToken(tokAdmin) });
  t('jurnalul reține autentificările și salvările', j.corp.jurnal.some(x => x.actiune === 'SALVARE_STARE') && j.corp.jurnal.some(x => x.actiune === 'AUTENTIFICARE'));
  t('autentificarea eșuată e reținută', j.corp.jurnal.some(x => x.actiune === 'AUTENTIFICARE_EȘUATĂ'));
  t('ruta necunoscută → 404', (await cere('/api/inexistent', { headers: cuToken(tokAdmin) })).cod === 404);
} finally {
  srv.kill();
}
console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
