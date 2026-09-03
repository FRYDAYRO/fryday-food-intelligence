/**
 * Ferestrele rapoartelor 2.9 — o singură regulă pentru „ce rânduri 2.9 servesc această cerere".
 *
 * Un 2.9 săptămânal și unul lunar sunt două observații ale aceleiași realități, la
 * granularități diferite. Nu se adună între ele și nu se șterg unul pe altul: fiecare rând
 * poartă fereastra REALĂ a raportului din care vine, iar identitatea de înlocuire e
 * (fereastră, restaurant), nu (lună, restaurant).
 *
 * Selecția pe cerere:
 *   · cerere pe lună întreagă → rândurile raportului LUNAR al acelei luni; săptămânile ei nu
 *     se însumează, nici când o acoperă toată (nu se aliniază la lună fără a tăia zile);
 *   · cerere pe săptămână → rândurile raportului SĂPTĂMÂNAL cu exact acea fereastră;
 *     lunarul nu se împarte pe zile;
 *   · două surse diferite pe aceeași (fereastră, restaurant) → concurente: se blochează cu
 *     motiv, nu se alege una la întâmplare.
 *
 * Rândurile importate înainte de acest contract nu poartă fereastra: se citesc ca raport
 * lunar al lunii lor, exact cum erau citite și până acum.
 */
import { marginiLuna, luniAtinse, eLunaIntreaga, type FCPeriod } from './fc-domeniu';
import type { Fereastra29, Granularitate29 } from './types';

export type { Fereastra29, Granularitate29 };

const laData = (d: string) => new Date(`${d}T00:00:00Z`);
const zileIntre = (de: string, la: string) => Math.round((laData(la).getTime() - laData(de).getTime()) / 86400000) + 1;

/** Granularitatea unei ferestre: 7 zile luni–duminică = săptămână; luna calendaristică = lună; altfel interval. */
export function granularitateFereastra(de: string, la: string): Granularitate29 {
  const m = marginiLuna(de.slice(0, 7));
  if (de === m.de && la === m.la) return 'LUNA';
  if (zileIntre(de, la) === 7 && laData(de).getUTCDay() === 1) return 'SAPTAMANA';
  return 'INTERVAL';
}

export const fereastraDin = (de: string, la: string): Fereastra29 => ({ de, la, granularitate: granularitateFereastra(de, la) });

/** Fereastra unui rând 2.9 — cea declarată, altfel luna lui (rând moștenit = raport lunar). */
export function fereastraRand(r: { perioada: string; fereastra?: Fereastra29 }): Fereastra29 {
  if (r.fereastra) return r.fereastra;
  const { de, la } = marginiLuna(r.perioada);
  return { de, la, granularitate: 'LUNA' };
}

/** Cheia de identitate a unui rând 2.9: fereastra reală × restaurantul. */
export const cheieFereastra = (f: Fereastra29, locatie: string | null | undefined) =>
  `${f.de}|${f.la}|${locatie ?? ''}`;

export const descrieFereastra = (f: { de: string; la: string }) => {
  const z = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
  return `${z(f.de)} – ${z(f.la)}`;
};

export interface Rand29 {
  perioada: string;
  locatie: string | null;
  fereastra?: Fereastra29;
  sursa?: { fisier: string; amprenta?: string; rand?: number };
}

export interface Selectie29<T extends Rand29> {
  disponibil: boolean;
  motiv: string | null;
  randuri: T[];
  /** Ferestrele din care vin rândurile alese. */
  ferestre: Fereastra29[];
  /** Ferestrele pe care există două surse diferite pentru același restaurant. */
  concurente: { fereastra: Fereastra29; locatie: string | null; fisiere: string[] }[];
  /** Cerere pe mai multe luni: lunile fără raport lunar (se semnalează, nu se interpolează). */
  luniLipsa: string[];
}

const goala = <T extends Rand29>(motiv: string, luniLipsa: string[] = []): Selectie29<T> =>
  ({ disponibil: false, motiv, randuri: [], ferestre: [], concurente: [], luniLipsa });

/**
 * Rândurile 2.9 care servesc cererea. `loc` restrânge la un restaurant; fără el intră toate
 * rândurile, inclusiv cele fără restaurant declarat (companie = Σ restaurante + fără locație).
 */
export function selecteaza29<T extends Rand29>(
  randuri: T[], perioada: FCPeriod, loc: string | null | undefined,
): Selectie29<T> {
  const inLoc = randuri.filter(r => !loc || r.locatie === loc);
  const eticheta = descrieFereastra(perioada);

  let alese: T[] = [];
  let luniLipsa: string[] = [];
  if (perioada.tip === 'SAPTAMANA' || (perioada.tip === 'ZI')) {
    if (perioada.tip === 'ZI') return goala('Raportul 2.9 nu există pe zile: consumul real nu se poate atribui unei singure zile.');
    alese = inLoc.filter(r => { const f = fereastraRand(r); return f.de === perioada.de && f.la === perioada.la; });
    if (!alese.length) {
      const peLuna = inLoc.filter(r => fereastraRand(r).granularitate === 'LUNA' && fereastraRand(r).de.slice(0, 7) === perioada.de.slice(0, 7));
      const altele = [...new Set(inLoc.filter(r => fereastraRand(r).granularitate !== 'LUNA' && seIntersecteaza(fereastraRand(r), perioada)).map(r => descrieFereastra(fereastraRand(r))))];
      return goala(`Nu există raport 2.9 săptămânal pe fereastra ${eticheta}`
        + (altele.length ? `; ferestrele disponibile (${altele.join(', ')}) nu coincid cu săptămâna cerută` : '')
        + (peLuna.length ? '; raportul lunar nu se împarte pe săptămâni' : '') + '.');
    }
  } else {
    if (!eLunaIntreaga(perioada)) {
      return goala(`Perioada ${perioada.cheie} (${eticheta}) nu acoperă luni întregi și nu e o săptămână: `
        + 'consumul real nu i se poate atribui fără a inventa o repartiție pe zile.');
    }
    const luni = luniAtinse(perioada);
    const lipsa: string[] = [];
    for (const l of luni) {
      const aleLunii = inLoc.filter(r => { const f = fereastraRand(r); return f.granularitate === 'LUNA' && f.de.slice(0, 7) === l; });
      if (!aleLunii.length) lipsa.push(l);
      alese.push(...aleLunii);
    }
    // nicio lună cu raport lunar → indisponibil; câteva luni lipsă dintr-un interval mai lung
    // → disponibil pe ce există, cu lunile lipsă declarate (motorul le diagnostichează,
    // nu le interpolează) — exact cum se comporta și până acum pe luni întregi
    luniLipsa = lipsa;
    if (lipsa.length === luni.length) {
      const doarSapt = inLoc.some(r => fereastraRand(r).granularitate !== 'LUNA' && lipsa.some(l => fereastraRand(r).de.slice(0, 7) === l || fereastraRand(r).la.slice(0, 7) === l));
      return goala(`Nu există linii 2.9 pentru raportul lunar ${lipsa.join(', ')}${loc ? ` la restaurantul ${loc}` : ''}`
        + (doarSapt ? '; există doar rapoarte săptămânale sau pe interval, iar luna nu se reconstruiește din ele' : '') + '.', lipsa);
    }
  }

  // concurență: aceeași (fereastră, restaurant) din două surse diferite
  const surse = new Map<string, Map<string, string>>();   // cheie → amprentă → fișier
  for (const r of alese) {
    const k = cheieFereastra(fereastraRand(r), r.locatie);
    const m = surse.get(k) ?? new Map<string, string>();
    m.set(r.sursa?.amprenta ?? r.sursa?.fisier ?? '(fără proveniență)', r.sursa?.fisier ?? '(fără proveniență)');
    surse.set(k, m);
  }
  const concurente = [...surse.entries()].filter(([, m]) => m.size > 1).map(([k, m]) => {
    const [de, la, locatie] = k.split('|');
    return { fereastra: fereastraDin(de, la), locatie: locatie || null, fisiere: [...m.values()] };
  });
  if (concurente.length) {
    const c = concurente[0];
    return {
      disponibil: false, randuri: [], ferestre: [], concurente, luniLipsa,
      motiv: `Surse concurente pe fereastra ${descrieFereastra(c.fereastra)}${c.locatie ? ` la ${c.locatie}` : ''}: `
        + `${c.fisiere.join(' și ')}. Nu există o regulă deterministă de alegere, deci consumul nu se combină — reimportă fișierul corect.`,
    };
  }
  const ferestre = [...new Map(alese.map(r => { const f = fereastraRand(r); return [`${f.de}|${f.la}`, f]; })).values()];
  return { disponibil: true, motiv: null, randuri: alese, ferestre, concurente: [], luniLipsa };
}

const seIntersecteaza = (a: { de: string; la: string }, b: { de: string; la: string }) => a.de <= b.la && b.de <= a.la;
