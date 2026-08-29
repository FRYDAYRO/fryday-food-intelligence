// Server multi-utilizator pentru FRYDAY Food Intelligence.
// Fără dependențe externe: http din Node și SQLite nativ (node:sqlite).
//
//   node server/server.mjs                    → pornește pe :8787 cu date în server/fryday.db
//   PORT=9000 DB=/tmp/x.db node server/...    → configurabil
//
// Modelul de acces:
//   · ADMIN    — citește și scrie tot
//   · ANALIST  — citește tot, scrie tot (fără administrare de utilizatori)
//   · MANAGER  — citește DOAR restaurantul lui; nu scrie starea
// Filtrarea pe rol se face pe server, nu în interfață: un manager nu primește niciodată
// datele altor restaurante, oricât ar insista clientul.
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8787);
const CALE_DB = process.env.DB ?? new URL('./fryday.db', import.meta.url).pathname;

const db = new DatabaseSync(CALE_DB);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS utilizatori (
    email TEXT PRIMARY KEY, parolaHash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('ADMIN','ANALIST','MANAGER')),
    locatie TEXT, nume TEXT
  );
  CREATE TABLE IF NOT EXISTS sesiuni (
    token TEXT PRIMARY KEY, email TEXT NOT NULL, creatLa TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS stare (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    revizie INTEGER NOT NULL, actualizatLa TEXT NOT NULL, actualizatDe TEXT, json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS jurnal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL, email TEXT, actiune TEXT NOT NULL, detalii TEXT
  );
`);

const hash = (s) => createHash('sha256').update(String(s)).digest('hex');

/** Primul cont de administrare, creat o singură dată. Parola se schimbă la prima folosire. */
function seedAdmin() {
  const n = db.prepare('SELECT COUNT(*) c FROM utilizatori').get().c;
  if (n > 0) return;
  db.prepare('INSERT INTO utilizatori (email, parolaHash, rol, locatie, nume) VALUES (?,?,?,?,?)')
    .run('admin@fryday.ro', hash(process.env.ADMIN_PAROLA ?? 'fryday'), 'ADMIN', null, 'Administrator');
  console.log('Cont inițial: admin@fryday.ro / ' + (process.env.ADMIN_PAROLA ?? 'fryday') + ' — schimbă parola după prima autentificare.');
}
seedAdmin();

const jurnal = (email, actiune, detalii) =>
  db.prepare('INSERT INTO jurnal (data, email, actiune, detalii) VALUES (?,?,?,?)')
    .run(new Date().toISOString(), email ?? null, actiune, detalii ?? null);

/** Un manager primește doar restaurantul lui: vânzări, waste, inventar și 2.9 sunt filtrate. */
function filtreazaPentruRol(stare, u) {
  if (u.rol !== 'MANAGER' || !u.locatie) return stare;
  const L = u.locatie;
  return {
    ...stare,
    vanzari: (stare.vanzari ?? []).filter(v => v.locatie === L),
    waste: (stare.waste ?? []).filter(x => x.locatie === L),
    inventar: (stare.inventar ?? []).filter(x => x.locatie === L),
    linii29: (stare.linii29 ?? []).filter(x => x.locatie === L),
    // 2.9 pe material stă la baza punții din Control Tower: fără filtrul ăsta, un manager
    // ar primi consumul întregii rețele. Rândurile fără restaurant declarat rămân: ele nu
    // aparțin altcuiva, iar puntea le raportează separat, ca „fără locație".
    materiale29: (stare.materiale29 ?? []).filter(x => x.locatie === L || x.locatie == null),
    salesReport: (stare.salesReport ?? []).filter(x => x.locatie === L),
    labor: (stare.labor ?? []).filter(x => x.locatie === L),
    locatii: (stare.locatii ?? []).filter(x => x.cod === L),
    tinte: (stare.tinte ?? []).filter(x => x.locatie === L || x.locatie === 'RETEA'),
  };
}

const utilizatorDinToken = (req) => {
  const auth = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const s = db.prepare('SELECT email FROM sesiuni WHERE token = ?').get(token);
  if (!s) return null;
  return db.prepare('SELECT email, rol, locatie, nume FROM utilizatori WHERE email = ?').get(s.email) ?? null;
};

const corpJson = (req) => new Promise((rez, rej) => {
  let d = '';
  req.on('data', c => { d += c; if (d.length > 40e6) { rej(new Error('corp prea mare')); req.destroy(); } });
  req.on('end', () => { try { rez(d ? JSON.parse(d) : {}); } catch (e) { rej(e); } });
});

const raspunde = (res, cod, corp) => {
  res.writeHead(cod, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, PUT, POST, OPTIONS',
  });
  res.end(JSON.stringify(corp));
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const cale = url.pathname;
  if (req.method === 'OPTIONS') return raspunde(res, 204, {});

  try {
    if (cale === '/api/sanatate') {
      const s = db.prepare('SELECT revizie, actualizatLa FROM stare WHERE id = 1').get();
      return raspunde(res, 200, { ok: true, revizie: s?.revizie ?? 0, actualizatLa: s?.actualizatLa ?? null });
    }

    if (cale === '/api/autentificare' && req.method === 'POST') {
      const { email, parola } = await corpJson(req);
      const u = db.prepare('SELECT * FROM utilizatori WHERE email = ?').get(String(email ?? '').toLowerCase());
      if (!u || u.parolaHash !== hash(parola)) {
        jurnal(email, 'AUTENTIFICARE_EȘUATĂ');
        return raspunde(res, 401, { eroare: 'Email sau parolă greșite' });
      }
      const token = randomUUID();
      db.prepare('INSERT INTO sesiuni (token, email, creatLa) VALUES (?,?,?)').run(token, u.email, new Date().toISOString());
      jurnal(u.email, 'AUTENTIFICARE');
      return raspunde(res, 200, { token, utilizator: { email: u.email, rol: u.rol, locatie: u.locatie, nume: u.nume } });
    }

    const u = utilizatorDinToken(req);
    if (!u) return raspunde(res, 401, { eroare: 'Neautentificat' });

    if (cale === '/api/eu') return raspunde(res, 200, { utilizator: u });

    if (cale === '/api/stare' && req.method === 'GET') {
      const s = db.prepare('SELECT revizie, json, actualizatLa, actualizatDe FROM stare WHERE id = 1').get();
      if (!s) return raspunde(res, 200, { revizie: 0, stare: null });
      return raspunde(res, 200, {
        revizie: s.revizie, actualizatLa: s.actualizatLa, actualizatDe: s.actualizatDe,
        stare: filtreazaPentruRol(JSON.parse(s.json), u),
        filtrat: u.rol === 'MANAGER',
      });
    }

    if (cale === '/api/stare' && req.method === 'PUT') {
      if (u.rol === 'MANAGER') return raspunde(res, 403, { eroare: 'Managerii nu pot modifica starea comună' });
      const { stare, revizie } = await corpJson(req);
      if (!stare || typeof stare !== 'object') return raspunde(res, 400, { eroare: 'Stare lipsă' });
      const curent = db.prepare('SELECT revizie FROM stare WHERE id = 1').get();
      const rCurent = curent?.revizie ?? 0;
      // control de concurență: dacă altcineva a salvat între timp, refuzăm în loc să suprascriem
      if (revizie != null && revizie !== rCurent) {
        return raspunde(res, 409, { eroare: 'Starea a fost modificată de altcineva între timp', revizieServer: rCurent });
      }
      const nou = rCurent + 1;
      const acum = new Date().toISOString();
      db.prepare(`INSERT INTO stare (id, revizie, actualizatLa, actualizatDe, json) VALUES (1,?,?,?,?)
                  ON CONFLICT(id) DO UPDATE SET revizie=excluded.revizie, actualizatLa=excluded.actualizatLa,
                  actualizatDe=excluded.actualizatDe, json=excluded.json`)
        .run(nou, acum, u.email, JSON.stringify(stare));
      jurnal(u.email, 'SALVARE_STARE', `revizia ${nou}`);
      return raspunde(res, 200, { revizie: nou, actualizatLa: acum });
    }

    if (cale === '/api/utilizatori' && req.method === 'GET') {
      if (u.rol !== 'ADMIN') return raspunde(res, 403, { eroare: 'Doar administratorii' });
      return raspunde(res, 200, { utilizatori: db.prepare('SELECT email, rol, locatie, nume FROM utilizatori').all() });
    }

    if (cale === '/api/utilizatori' && req.method === 'POST') {
      if (u.rol !== 'ADMIN') return raspunde(res, 403, { eroare: 'Doar administratorii' });
      const { email, parola, rol, locatie, nume } = await corpJson(req);
      if (!email || !parola || !['ADMIN', 'ANALIST', 'MANAGER'].includes(rol)) {
        return raspunde(res, 400, { eroare: 'email, parola și rol (ADMIN/ANALIST/MANAGER) sunt obligatorii' });
      }
      if (rol === 'MANAGER' && !locatie) return raspunde(res, 400, { eroare: 'Un manager are nevoie de restaurant' });
      db.prepare('INSERT OR REPLACE INTO utilizatori (email, parolaHash, rol, locatie, nume) VALUES (?,?,?,?,?)')
        .run(String(email).toLowerCase(), hash(parola), rol, locatie ?? null, nume ?? null);
      jurnal(u.email, 'UTILIZATOR_SALVAT', email);
      return raspunde(res, 200, { ok: true });
    }

    if (cale === '/api/jurnal' && req.method === 'GET') {
      if (u.rol === 'MANAGER') return raspunde(res, 403, { eroare: 'Doar administratorii și analiștii' });
      return raspunde(res, 200, { jurnal: db.prepare('SELECT * FROM jurnal ORDER BY id DESC LIMIT 200').all() });
    }

    return raspunde(res, 404, { eroare: 'Rută necunoscută' });
  } catch (e) {
    return raspunde(res, 500, { eroare: String(e?.message ?? e) });
  }
});

server.listen(PORT, () => console.log(`FRYDAY FI server pe http://localhost:${PORT} · bază: ${CALE_DB}`));
