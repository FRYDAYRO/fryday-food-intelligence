/**
 * Contextul canonic de autorizare și proiecția de date pe care el o impune.
 *
 * Regula pe care o urmează tot fișierul: **ascunderea din interfață nu e securitate.**
 * De aceea autorizarea nu se oprește la butoane, ci taie datele înainte ca vreun motor
 * să le vadă. Un manager de restaurant nu primește o interfață care refuză să afișeze
 * alt restaurant — primește o stare din care rândurile altui restaurant lipsesc.
 *
 * Trei niveluri, în ordinea în care apără:
 *
 *   1. `stareAutorizata` — proiecția. Motoarele rulează pe ea, deci o cerere fabricată
 *      de mână nu are ce să găsească: rândurile nu sunt acolo.
 *   2. `verificaCerere` / `verificaImport` — porțile. O cerere în afara scopului e
 *      REFUZATĂ explicit, nu tăcut ajustată: refuzul se vede și se poate testa.
 *   3. `selectieDinParametri` — intrarea dinspre exterior (URL, deep link, stare veche
 *      din localStorage). Nimic din ce vine de acolo nu poate lărgi scopul.
 *
 * Ce NU e aici: o promisiune de securitate pe care arhitectura nu o poate ține.
 * Bariera reală e serverul comun (`server/server.mjs`), care filtrează starea înainte
 * de a o trimite. Fără server, aplicația e mono-utilizator și locală, iar `enforcement`
 * spune asta pe față — vezi `ENFORCEMENT_*` mai jos.
 */
import type { ActiuneAuditAcces, AppState, Canal, IntrareAuditAcces } from './types';
import type { FCChannel } from './fc-domeniu';

// ————————————————————————————————————————————————————————— contextul canonic

export type Rol = 'STORE_MANAGER' | 'TOP_MANAGEMENT';

/** Rolurile serverului, din care se derivă cele de produs. */
export type RolServer = 'ADMIN' | 'ANALIST' | 'MANAGER';

export interface UtilizatorAutorizat {
  rol: string;
  locatie?: string | null;
  nume?: string | null;
  email?: string | null;
}

/** Unde e impusă restricția — și, la fel de important, unde NU e. */
export type Enforcement = 'SERVER' | 'CLIENT_ONLY';

export const ENFORCEMENT_SERVER =
  'Serverul comun filtrează starea înainte să o trimită: rândurile altor restaurante nu ajung în browser.';
export const ENFORCEMENT_LOCAL =
  'Aplicația rulează fără server: datele sunt locale și integrale, iar rolul e o preferință de afișare. '
  + 'Proiecția de mai jos limitează ce văd motoarele, dar oricine are acces la fișierul de stare are acces la tot. '
  + 'Restricția reală există numai autentificat pe serverul comun.';
export const ENFORCEMENT_NEFILTRAT =
  'Ești autentificat ca manager, dar serverul nu a marcat starea ca filtrată. Interfața și proiecția limitează '
  + 'vederea, însă limitarea nu e garantată de server — tratează-o ca pe o comoditate, nu ca pe o măsură de securitate.';

/**
 * Contextul de autorizare. Un singur obiect, construit o singură dată, respectat de
 * toate interogările analitice.
 */
export interface ContextAutorizare {
  role: Rol;
  /** Restaurantul propriu, pentru STORE_MANAGER. `null` pentru management. */
  storeId: string | null;
  /** Restaurantele pe care rolul are voie să le vadă. */
  allowedStoreIds: string[];
  /** Are voie la agregarea pe companie? */
  companyAccess: boolean;
  /** Canalele permise. Lipsa unui canal din listă îl face inaccesibil, nu doar ascuns. */
  channelAccess: FCChannel[];

  // — transparența, nu doar drepturile
  /** Rolul brut din care s-a derivat (ADMIN / ANALIST / MANAGER / LOCAL). */
  rolSursa: string;
  enforcement: Enforcement;
  /** Ce garantează, de fapt, enforcement-ul curent. Se afișează, nu se ascunde. */
  motivEnforcement: string;
  /** Actorul pentru urma de audit. Fără date personale peste identificatorul deja folosit. */
  actor: string;
}

export const TOATE_CANALELE: FCChannel[] = ['TOTAL', 'INSTORE', 'DELIVERY'];

/**
 * Contextul pentru utilizatorul curent. `filtratDeServer` vine din răspunsul serverului,
 * nu dintr-o presupunere a interfeței.
 */
export function contextAutorizare(
  state: AppState,
  utilizator: UtilizatorAutorizat | null,
  filtratDeServer: boolean,
): ContextAutorizare {
  const toate = state.locatii.map(l => l.cod).sort();
  const rolSursa = utilizator?.rol ?? 'LOCAL';
  const actor = utilizator?.email ?? utilizator?.nume ?? (utilizator ? rolSursa : 'local');
  const eManager = rolSursa === 'MANAGER' && !!utilizator?.locatie;

  if (eManager) {
    const loc = utilizator!.locatie!;
    return {
      role: 'STORE_MANAGER',
      storeId: loc,
      allowedStoreIds: [loc],
      companyAccess: false,
      channelAccess: [...TOATE_CANALELE],
      rolSursa,
      enforcement: filtratDeServer ? 'SERVER' : 'CLIENT_ONLY',
      motivEnforcement: filtratDeServer ? ENFORCEMENT_SERVER : ENFORCEMENT_NEFILTRAT,
      actor,
    };
  }
  return {
    role: 'TOP_MANAGEMENT',
    storeId: null,
    allowedStoreIds: toate,
    companyAccess: true,
    channelAccess: [...TOATE_CANALELE],
    rolSursa,
    enforcement: utilizator ? 'SERVER' : 'CLIENT_ONLY',
    motivEnforcement: utilizator ? ENFORCEMENT_SERVER : ENFORCEMENT_LOCAL,
    actor,
  };
}

/** Eticheta de scop, afișată permanent. Niciodată ambiguă. */
export const etichetaScop = (a: ContextAutorizare): string =>
  a.role === 'TOP_MANAGEMENT' && a.storeId === null ? 'Companie' : `Restaurant: ${a.storeId ?? '—'}`;

// ————————————————————————————————————————————————————————— porțile

export type CodRefuz =
  | 'RESTAURANT_NEAUTORIZAT' | 'COMPANIE_NEAUTORIZATA' | 'CANAL_NEAUTORIZAT'
  | 'SCRIERE_NEAUTORIZATA' | 'IMPORT_IN_AFARA_SCOPULUI' | 'RESTAURANT_INEXISTENT';

export interface Verdict {
  permis: boolean;
  cod: CodRefuz | null;
  /** De ce s-a refuzat — text pentru utilizator și pentru jurnal. */
  motiv: string | null;
}

const DA: Verdict = { permis: true, cod: null, motiv: null };
const nu = (cod: CodRefuz, motiv: string): Verdict => ({ permis: false, cod, motiv });

/** Are voie rolul să vadă restaurantul cerut? */
export const potVedeaRestaurantul = (a: ContextAutorizare, locatie: string): boolean =>
  a.allowedStoreIds.includes(locatie);

/**
 * Poarta pentru orice interogare analitică: scop (companie sau restaurant) × canal.
 * Refuză explicit, cu motiv — nu ajustează tăcut cererea.
 *
 * `locatie` ABSENT înseamnă „nu întreb despre scop"; `locatie: null` înseamnă explicit
 * „companie". Cele două nu se confundă: altfel o verificare doar de canal ar refuza un
 * manager pentru un scop pe care nici nu l-a cerut.
 */
export function verificaCerere(
  a: ContextAutorizare,
  cerere: { locatie?: string | null; canal?: FCChannel },
): Verdict {
  const canal = cerere.canal;
  if (canal !== undefined && !a.channelAccess.includes(canal)) {
    return nu('CANAL_NEAUTORIZAT', `Canalul ${canal} nu e în drepturile rolului ${a.role}.`);
  }
  if (!('locatie' in cerere)) return DA;
  const loc = cerere.locatie ?? null;
  if (loc === null) {
    return a.companyAccess
      ? DA
      : nu('COMPANIE_NEAUTORIZATA',
        `Rolul ${a.role} nu are acces la agregarea pe companie. Scopul rămâne ${a.storeId ?? '—'}.`);
  }
  return potVedeaRestaurantul(a, loc)
    ? DA
    : nu('RESTAURANT_NEAUTORIZAT', `Restaurantul ${loc} nu e în drepturile rolului ${a.role}.`);
}

/** Poarta pentru scriere (import, activare). Doar management. */
export function verificaScriere(a: ContextAutorizare): Verdict {
  return a.role === 'TOP_MANAGEMENT'
    ? DA
    : nu('SCRIERE_NEAUTORIZATA',
      'Importurile și activările sunt rezervate analiștilor și administratorilor. '
      + 'Serverul respinge oricum scrierea stării comune pentru manageri.');
}

/**
 * Poarta pentru un import: scopul fișierului trebuie să încapă în drepturile rolului.
 * Un import de companie sau pentru alt restaurant e refuzat înainte de orice scriere.
 */
export function verificaImport(
  a: ContextAutorizare,
  importScop: { scop: string; restaurante: string[] },
): Verdict {
  const scriere = verificaScriere(a);
  if (!scriere.permis) return scriere;
  if (importScop.scop === 'COMPANIE' && !a.companyAccess) {
    return nu('COMPANIE_NEAUTORIZATA', 'Un import de companie cere acces la nivel de companie.');
  }
  const straine = importScop.restaurante.filter(r => !potVedeaRestaurantul(a, r));
  return straine.length
    ? nu('IMPORT_IN_AFARA_SCOPULUI', `Importul conține restaurante în afara drepturilor: ${straine.join(', ')}.`)
    : DA;
}

// ————————————————————————————————————————————————————————— proiecția de date

/**
 * Starea redusă la ce are voie rolul să vadă.
 *
 * Rețetarul, nomenclatorul, produsele și prețurile rămân întregi: sunt COMUNE întregii
 * rețele (serverul le trimite la fel) și fără ele Food Cost-ul nu se poate calcula deloc.
 * Se taie exact ce aparține unui restaurant: vânzări, 2.9 (categorie și material), waste,
 * inventar, labor, costuri de operare, ținte, lista de restaurante și urma importurilor.
 *
 * Rândurile de 2.9 FĂRĂ restaurant declarat rămân: nu aparțin altcuiva, iar puntea le
 * raportează separat, ca „fără locație" — exact ca pe server.
 *
 * Întoarce ACELAȘI obiect, neatins, doar pentru cine are voie la TOATE restaurantele din
 * stare. `companyAccess` singur NU e suficient: un rol regional poate avea vedere de
 * companie peste un SUBSET de restaurante, iar atunci agregarea trebuie să se oprească
 * la subsetul lui — altfel „companie" ar însemna, tăcut, și restaurantele altora.
 */
export function stareAutorizata(state: AppState, a: ContextAutorizare): AppState {
  const permise = new Set(a.allowedStoreIds);
  if (state.locatii.every(l => permise.has(l.cod))) return state;
  const alMeu = (loc: string) => permise.has(loc);

  return {
    ...state,
    vanzari: state.vanzari.filter(v => alMeu(v.locatie)),
    salesReport: state.salesReport.filter(x => alMeu(x.locatie)),
    linii29: state.linii29.filter(x => alMeu(x.locatie)),
    materiale29: state.materiale29.filter(x => x.locatie === null || alMeu(x.locatie)),
    waste: state.waste.filter(x => alMeu(x.locatie)),
    inventar: state.inventar.filter(x => alMeu(x.locatie)),
    labor: state.labor.filter(x => alMeu(x.locatie)),
    costuriOperare: state.costuriOperare.filter(x => alMeu(x.locatie)),
    locatii: state.locatii.filter(l => alMeu(l.cod)),
    // ținta de rețea rămâne: e un prag comun, nu o cifră a altui restaurant
    tinte: state.tinte.filter(t => t.locatie === 'RETEA' || alMeu(t.locatie)),
    // metadate de import: doar sursele comune și cele ale restaurantelor permise
    ...(state.versiuniImport ? {
      versiuniImport: state.versiuniImport.filter(v =>
        v.scop === 'COMUN' || v.restaurante.every(r => alMeu(r)) && v.scop !== 'COMPANIE'),
    } : {}),
    ...(state.auditImport ? {
      auditImport: state.auditImport.filter(x =>
        x.scop === 'COMUN' || x.restaurante.every(r => alMeu(r)) && x.scop !== 'COMPANIE'),
    } : {}),
  };
}

/** Restaurantele care CHIAR există în starea autorizată — baza selectoarelor din interfață. */
export const restauranteVizibile = (state: AppState, a: ContextAutorizare): string[] =>
  state.locatii.map(l => l.cod).filter(c => potVedeaRestaurantul(a, c)).sort();

// ————————————————————————————————————————————————————————— intrarea dinspre exterior

/** Ce poate cere cineva din afară: URL, deep link, stare veche din localStorage. */
export interface ParametriScop {
  scop?: string | null;
  locatie?: string | null;
  canal?: string | null;
}

export interface ScopCerut {
  /** Scopul REZULTAT, deja limitat la drepturi. */
  companie: boolean;
  locatie: string | null;
  canal: FCChannel;
  /** Ce s-a refuzat din ce s-a cerut — se arată utilizatorului, nu se înghite. */
  refuzuri: Verdict[];
}

const CANAL_VALID = (c: string | null | undefined): FCChannel | null =>
  c === 'TOTAL' || c === 'INSTORE' || c === 'DELIVERY' ? c : null;

/**
 * Traduce parametri NEÎNCREDERE într-un scop sigur.
 *
 * Nimic din ce vine de aici nu poate lărgi drepturile: un `locatie=L01` cerut de un
 * manager de la L02 e refuzat și înlocuit cu restaurantul lui, iar refuzul e raportat.
 */
export function scopDinParametri(
  state: AppState, a: ContextAutorizare, p: ParametriScop,
): ScopCerut {
  const refuzuri: Verdict[] = [];
  const coduri = new Set(state.locatii.map(l => l.cod));

  const canalCerut = CANAL_VALID(p.canal ?? null);
  let canal: FCChannel = 'TOTAL';
  if (canalCerut) {
    const v = verificaCerere(a, { canal: canalCerut });
    if (v.permis) canal = canalCerut; else refuzuri.push(v);
  } else if (p.canal) {
    refuzuri.push(nu('CANAL_NEAUTORIZAT', `Canalul „${p.canal}" nu există.`));
  }
  if (!a.channelAccess.includes(canal)) canal = a.channelAccess[0] ?? 'TOTAL';

  const vreaCompanie = p.scop === 'COMPANIE' || (p.scop == null && !p.locatie);
  if (vreaCompanie) {
    const v = verificaCerere(a, { locatie: null, canal });
    if (v.permis) return { companie: true, locatie: null, canal, refuzuri };
    refuzuri.push(v);
    return { companie: false, locatie: a.storeId, canal, refuzuri };
  }

  const cerut = p.locatie ?? null;
  if (cerut && !coduri.has(cerut)) {
    refuzuri.push(nu('RESTAURANT_INEXISTENT', `Restaurantul „${cerut}" nu există în date.`));
    return { companie: a.companyAccess, locatie: a.companyAccess ? null : a.storeId, canal, refuzuri };
  }
  if (cerut) {
    const v = verificaCerere(a, { locatie: cerut, canal });
    if (v.permis) return { companie: false, locatie: cerut, canal, refuzuri };
    refuzuri.push(v);
  }
  return a.companyAccess
    ? { companie: true, locatie: null, canal, refuzuri }
    : { companie: false, locatie: a.storeId, canal, refuzuri };
}

// ————————————————————————————————————————————————————————— urma de audit

export type ActiuneAudit = ActiuneAuditAcces;

export type { IntrareAuditAcces };

// FNV-1a — id determinist, ca aceleași acțiuni să producă aceeași urmă
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export interface CerereAudit {
  actiune: ActiuneAudit;
  scop: string;
  rezultat: 'PERMIS' | 'REFUZAT';
  detaliu: string;
  /** Momentul, parametru — ca urma să fie deterministă în teste. */
  acum: string;
}

export const intrareAudit = (a: ContextAutorizare, c: CerereAudit): IntrareAuditAcces => ({
  id: `AA_${fnv1a(`${a.actor}|${c.actiune}|${c.scop}|${c.acum}|${c.rezultat}`)}`,
  data: c.acum, actor: a.actor, rol: a.role,
  actiune: c.actiune, scop: c.scop, rezultat: c.rezultat, detaliu: c.detaliu,
});

/**
 * Câte intrări de audit se păstrează în starea locală. Urma completă e treaba jurnalului
 * de pe server; aici păstrăm o fereastră recentă, ca starea persistată să nu crească la infinit.
 */
export const MAX_AUDIT_ACCES = 500;

/** Adaugă o intrare de audit. Starea rămâne imutabilă — se întoarce una nouă. */
export const inregistreazaAcces = (state: AppState, a: ContextAutorizare, c: CerereAudit): AppState => {
  const toate = [...(state.auditAcces ?? []), intrareAudit(a, c)];
  return { ...state, auditAcces: toate.slice(-MAX_AUDIT_ACCES) };
};

/** Urma de audit a unui actor, cronologic. */
export const auditulActorului = (state: AppState, actor: string): IntrareAuditAcces[] =>
  (state.auditAcces ?? []).filter(x => x.actor === actor).sort((x, y) => x.data.localeCompare(y.data));

// ————————————————————————————————————————————————————————— verificarea proiecției

export interface ScurgereDetectata {
  colectie: string;
  locatie: string;
  nrRanduri: number;
}

/**
 * Caută rânduri care nu au ce căuta în starea dată. Folosită în teste ca plasă finală:
 * dacă proiecția uită o colecție, aici se vede.
 */
export function scurgeri(state: AppState, a: ContextAutorizare): ScurgereDetectata[] {
  if (a.companyAccess && a.storeId === null) return [];
  const permise = new Set(a.allowedStoreIds);
  const rez: ScurgereDetectata[] = [];
  const verifica = (colectie: string, randuri: { locatie: string | null }[]) => {
    const straine = new Map<string, number>();
    for (const r of randuri) {
      if (r.locatie === null || permise.has(r.locatie)) continue;
      straine.set(r.locatie, (straine.get(r.locatie) ?? 0) + 1);
    }
    for (const [locatie, nrRanduri] of straine) rez.push({ colectie, locatie, nrRanduri });
  };
  verifica('vanzari', state.vanzari);
  verifica('salesReport', state.salesReport);
  verifica('linii29', state.linii29);
  verifica('materiale29', state.materiale29);
  verifica('waste', state.waste);
  verifica('inventar', state.inventar);
  verifica('labor', state.labor);
  verifica('costuriOperare', state.costuriOperare);
  verifica('locatii', state.locatii.map(l => ({ locatie: l.cod })));
  verifica('tinte', state.tinte.filter(t => t.locatie !== 'RETEA').map(t => ({ locatie: t.locatie })));
  for (const v of state.versiuniImport ?? []) {
    const straine = v.restaurante.filter(r => !permise.has(r));
    if (straine.length) rez.push({ colectie: 'versiuniImport', locatie: straine.join(','), nrRanduri: 1 });
  }
  for (const x of state.auditImport ?? []) {
    const straine = x.restaurante.filter(r => !permise.has(r));
    if (straine.length) rez.push({ colectie: 'auditImport', locatie: straine.join(','), nrRanduri: 1 });
  }
  return rez;
}

/** Canalele efective ale unei cereri, limitate la drepturi. */
export const canalePermise = (a: ContextAutorizare): Canal[] =>
  (['INSTORE', 'DELIVERY'] as Canal[]).filter(c => a.channelAccess.includes(c) || a.channelAccess.includes('TOTAL'));
