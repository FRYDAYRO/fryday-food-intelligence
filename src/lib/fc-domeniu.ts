// Vocabularul domeniului Food Cost — dimensiunile pe care se raportează orice cifră de FC.
//
// Aplicația este DOAR pentru Food Cost. P&L (labor, costuri de operare, EBITDA) și comisionul
// de agregator sunt în afara scopului: nu apar în niciun tip din acest fișier și nu au cum să
// intre în calcul, pentru că motorul de FC primește `CtxFC` — contractul minim de costare,
// fără câmpul de comision.
//
// Cele patru dimensiuni:
//   FCPeriod     — zi / săptămână / lună, cu interval explicit
//   FCChannel    — InStore / Delivery / Total
//   FCLevel      — restaurant / companie
//   FCComponent  — Food / Paper / Operational / Normalized / Unexplained
import { cheiePerioada, type CtxCost } from './engine';
import type { Clasa29 } from './types';

// ————————————————————————————————————————————————————————— contextul de calcul

/**
 * Contractul de costare al motorului de FC: nomenclator, rețete, produse.
 * Este exact `CtxCost` din engine — un `Ctx` complet se poate pasa oriunde e cerut,
 * dar funcțiile de FC nu pot citi din el nimic din afara scopului.
 */
export type CtxFC = CtxCost;

// ————————————————————————————————————————————————————————— perioada

export type FCPeriodType = 'ZI' | 'SAPTAMANA' | 'LUNA';

export interface FCPeriod {
  tip: FCPeriodType;
  /** '2026-07-15' pentru ZI · '2026-S29' pentru SAPTAMANA · '2026-07' pentru LUNA. */
  cheie: string;
  de: string;          // prima zi inclusă, AAAA-LL-ZZ
  la: string;          // ultima zi inclusă, AAAA-LL-ZZ
  zile: number;        // zile acoperite efectiv
  /** Intervalul natural a fost tăiat (o săptămână la marginea lunii). */
  partiala: boolean;
}

const laData = (d: string) => new Date(`${d}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const adaugaZile = (d: string, n: number) => { const x = laData(d); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
const numarZile = (de: string, la: string) => Math.round((laData(la).getTime() - laData(de).getTime()) / 86400000) + 1;

/** Prima și ultima zi a lunii AAAA-LL. */
export function marginiLuna(luna: string): { de: string; la: string } {
  const [an, l] = luna.split('-').map(Number);
  return { de: `${luna}-01`, la: iso(new Date(Date.UTC(an, l, 0))) };
}

/** Lunea săptămânii ISO care conține data. */
function luniIso(data: string): string {
  const d = laData(data);
  return adaugaZile(data, -((d.getUTCDay() + 6) % 7));
}

/** Perioada de tipul cerut care conține data dată, cu intervalul ei natural, netăiat. */
export function perioadaDin(data: string, tip: FCPeriodType): FCPeriod {
  if (tip === 'ZI') return { tip, cheie: data, de: data, la: data, zile: 1, partiala: false };
  if (tip === 'LUNA') {
    const luna = data.slice(0, 7);
    const { de, la } = marginiLuna(luna);
    return { tip, cheie: luna, de, la, zile: numarZile(de, la), partiala: false };
  }
  const de = luniIso(data), la = adaugaZile(de, 6);
  return { tip, cheie: cheiePerioada(data, 'SAPTAMANA'), de, la, zile: 7, partiala: false };
}

/**
 * Perioadele de tipul cerut care acoperă intervalul [de, la], TĂIATE la marginile lui.
 * Tăierea garantează că suma perioadelor este exact intervalul — o săptămână care iese
 * din lună apare cu mai puține zile și cu `partiala: true`, ca să nu fie comparată
 * naiv cu una întreagă.
 */
export function perioadeIntre(de: string, la: string, tip: FCPeriodType): FCPeriod[] {
  if (la < de) return [];
  const grupe = new Map<string, { de: string; la: string }>();
  for (let d = de; d <= la; d = adaugaZile(d, 1)) {
    const cheie = perioadaDin(d, tip).cheie;
    const g = grupe.get(cheie);
    if (g) g.la = d; else grupe.set(cheie, { de: d, la: d });
  }
  return [...grupe.entries()].map(([cheie, g]) => {
    const natural = perioadaDin(g.de, tip);
    const zile = numarZile(g.de, g.la);
    return { tip, cheie, de: g.de, la: g.la, zile, partiala: zile < natural.zile };
  });
}

/** Perioadele de tipul cerut care acoperă o lună, tăiate la marginile ei. */
export function perioadeDinLuna(luna: string, tip: FCPeriodType): FCPeriod[] {
  const { de, la } = marginiLuna(luna);
  return perioadeIntre(de, la, tip);
}

export const contineData = (p: FCPeriod, data: string) => data >= p.de && data <= p.la;

/** Perioada naturală precedentă, pentru comparația istorică. */
export function perioadaAnterioara(p: FCPeriod): FCPeriod {
  if (p.tip === 'LUNA') {
    const [an, l] = p.cheie.split('-').map(Number);
    const luna = l === 1 ? `${an - 1}-12` : `${an}-${String(l - 1).padStart(2, '0')}`;
    return perioadaDin(`${luna}-01`, 'LUNA');
  }
  return perioadaDin(adaugaZile(p.de, p.tip === 'ZI' ? -1 : -7), p.tip);
}

/** Lunile calendaristice atinse de o perioadă — raportul 2.9 este lunar. */
export function luniAtinse(p: FCPeriod): string[] {
  const rez: string[] = [];
  for (let d = p.de; d <= p.la; d = adaugaZile(d, 1)) {
    const l = d.slice(0, 7);
    if (!rez.includes(l)) rez.push(l);
  }
  return rez;
}

/** Perioada acoperă exact una sau mai multe luni întregi? Condiția ca 2.9 să fie comparabil. */
export function eLunaIntreaga(p: FCPeriod): boolean {
  const luni = luniAtinse(p);
  if (!luni.length) return false;
  return p.de === marginiLuna(luni[0]).de && p.la === marginiLuna(luni[luni.length - 1]).la;
}

// ————————————————————————————————————————————————————————— canalul

export type FCChannel = 'INSTORE' | 'DELIVERY' | 'TOTAL';

/** Canalele concrete acoperite de o vedere. Total = InStore + Delivery, ca SUME. */
export const canalePentru = (c: FCChannel): ('INSTORE' | 'DELIVERY')[] =>
  (c === 'TOTAL' ? ['INSTORE', 'DELIVERY'] : [c]);

export const etichetaCanal = (c: FCChannel) =>
  c === 'INSTORE' ? 'InStore' : c === 'DELIVERY' ? 'Delivery' : 'Total';

// ————————————————————————————————————————————————————————— nivelul

export type FCLevel =
  | { tip: 'COMPANY' }
  | { tip: 'STORE'; locatie: string };

export const COMPANIE: FCLevel = { tip: 'COMPANY' };
export const restaurant = (locatie: string): FCLevel => ({ tip: 'STORE', locatie });

/** Filtrul de locație: `undefined` înseamnă toată rețeaua. */
export const locatieDin = (n: FCLevel): string | undefined => (n.tip === 'STORE' ? n.locatie : undefined);

export const etichetaNivel = (n: FCLevel) => (n.tip === 'COMPANY' ? 'Companie (toată rețeaua)' : n.locatie);

// ————————————————————————————————————————————————————————— componenta de cost

/**
 * Din ce se compune consumul, în vocabularul FC:
 *   FOOD        — materie primă alimentară
 *   PAPER       — ambalaje
 *   OPERATIONAL — curățenie, uniforme, papetărie, consumabile: NU intră în Food Cost
 *   NORMALIZED  — materiale prezente în 2.9 dar nereprezentate în rețete
 *   UNEXPLAINED — restul, pe care datele curente nu îl pot atribui
 */
export type FCComponent = 'FOOD' | 'PAPER' | 'OPERATIONAL' | 'NORMALIZED' | 'UNEXPLAINED';

export const ETICHETA_COMPONENTA: Record<FCComponent, string> = {
  FOOD: 'Food',
  PAPER: 'Paper',
  OPERATIONAL: 'Operațional',
  NORMALIZED: 'Materiale normalizate',
  UNEXPLAINED: 'Neexplicat',
};

/** Componentele care intră în Food Cost („FC Curat"). Operaționalul rămâne în afară. */
export const COMPONENTE_FC: FCComponent[] = ['FOOD', 'PAPER', 'NORMALIZED', 'UNEXPLAINED'];

export const intraInFC = (c: FCComponent) => COMPONENTE_FC.includes(c);

/**
 * Clasificarea 2.9 existentă, tradusă în vocabularul FC. `EXCLUS` din raportul 2.9
 * înseamnă „nu e Food & Paper" — adică exact consum operațional.
 */
export const componentaDin29 = (c: Clasa29): FCComponent =>
  (c === 'FOOD' ? 'FOOD' : c === 'PAPER' ? 'PAPER' : 'OPERATIONAL');

// ————————————————————————————————————————————————————————— trasabilitate

export type RaportSursa = 'PMIX' | 'SALES_REPORT' | 'NBO_29' | 'RETETAR' | 'NOMENCLATOR' | 'WASTE' | 'INVENTAR';

/** De unde vine o cifră: fiecare rezultat de FC își poartă sursele, ca să fie verificabil. */
export interface SursaFC {
  raport: RaportSursa;
  randuri: number;          // câte înregistrări au intrat efectiv în calcul
  interval: string;         // perioada acoperită de ele
  nota?: string;
}

// ————————————————————————————————————————————————————————— cererea

/** Coordonatele unei cifre de Food Cost: perioadă × nivel × canal. */
export interface CerereFC {
  perioada: FCPeriod;
  nivel: FCLevel;
  canal: FCChannel;
}

export const descrieCerere = (c: CerereFC) =>
  `${c.perioada.cheie} · ${etichetaNivel(c.nivel)} · ${etichetaCanal(c.canal)}`;
