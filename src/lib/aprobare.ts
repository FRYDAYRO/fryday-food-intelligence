/**
 * Coada de aprobare: tot ce nu s-a putut mapa automat, într-un singur loc, cu o decizie
 * explicită a omului.
 *
 * De ce există: fiecare strat de import refuză corect ce nu poate rezolva — un produs din
 * 4.7 fără rețetă, un material din 2.9 absent din nomenclator, un restaurant necunoscut.
 * Refuzul e sigur, dar dacă nimeni nu-l vede, rândurile dispar tăcut și cifrele ies mai
 * mici fără ca cineva să știe de ce. Coada face refuzurile vizibile și reversibile.
 *
 * Regula care o guvernează:
 *
 *   Aplicația NU aprobă nimic singură. Propune, ordonat după cât cântărește fiecare rând;
 *   omul decide. O aprobare se scrie ca ALIAS — o legătură explicită, datată, cu autor —
 *   nu ca o rescriere a datelor. Se poate citi, se poate întoarce.
 *
 * Sugestiile sunt exact atât: sugestii. Nu se aplică de la sine niciodată, oricât de bine
 * ar arăta potrivirea. Trei restaurante se numesc „FRYDAY CLUJ …"; două milkshake-uri diferă
 * printr-un cuvânt. O potrivire automată greșită e mai rea decât una lipsă.
 */
import type { AppState } from './types';

export type FelIntrare = 'PRODUS' | 'MATERIAL' | 'RESTAURANT';

export interface IntrareAprobare {
  /** Cheia stabilă a intrării: fel + textul-sursă. Aceeași denumire nu apare de două ori. */
  id: string;
  fel: FelIntrare;
  /** Textul EXACT din fișier, nemodificat. */
  valoareSursa: string;
  /** Din ce raport a venit, ca omul să știe ce aprobă. */
  sursa: string;
  perioada: string;
  /** Cât cântărește: lei pentru produse, consum pentru materiale. Ordinea cozii vine de aici. */
  greutate: number;
  unitateGreutate: 'RON' | 'BUC' | 'UM';
  /** Ce ar putea fi — ordonate, niciodată aplicate automat. */
  sugestii: SugestieAprobare[];
  motiv: string;
}

export interface SugestieAprobare {
  tinta: string;
  /** 0–100. Cât de aproape e numele, NU cât de sigur e că e corect. */
  scor: number;
  explicatie: string;
}

export interface DecizieAprobare {
  id: string;
  /** `null` = respins explicit: „nu are corespondent", nu „încă nu m-am uitat". */
  tinta: string | null;
  actor: string;
  data: string;
}

/** Aliasurile aprobate, gata de trimis importatorului. */
export type AliasuriAprobate = Record<string, string>;

const norm = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

const cuvinte = (s: string) => new Set(norm(s).split(' ').filter(Boolean));

/**
 * Cât de aproape sunt două denumiri, ca procent din cuvintele comune. Nu e o probabilitate
 * și nu autorizează nimic: e doar ordinea în care merită să te uiți.
 */
export function scorPotrivire(a: string, b: string): number {
  const A = cuvinte(a), B = cuvinte(b);
  if (!A.size || !B.size) return 0;
  let comune = 0;
  for (const w of A) if (B.has(w)) comune++;
  return Math.round((comune / Math.max(A.size, B.size)) * 100);
}

/** Cele mai apropiate candidate, peste un prag. Lista poate fi goală — și e în regulă. */
export function sugereaza(valoare: string, candidati: string[], prag = 40, max = 5): SugestieAprobare[] {
  return candidati
    .map(t => ({ tinta: t, scor: scorPotrivire(valoare, t) }))
    .filter(x => x.scor >= prag)
    .sort((a, b) => b.scor - a.scor || a.tinta.localeCompare(b.tinta))
    .slice(0, max)
    .map(x => ({
      ...x,
      explicatie: x.scor === 100
        ? 'Aceleași cuvinte — dar tot trebuie confirmat: două produse pot diferi printr-un singur cuvânt.'
        : `${x.scor}% din cuvinte coincid. Sugestie, nu potrivire.`,
    }));
}

const idIntrare = (fel: FelIntrare, v: string) => `${fel}:${norm(v)}`;

/**
 * Construiește coada din starea curentă. Produsele nemapate din 4.7 sunt sursa principală;
 * lista de aprobări deja luate se scade, ca o decizie să nu fie cerută de două ori.
 */
export function coadaAprobare(
  state: AppState, decizii: DecizieAprobare[] = [],
): IntrareAprobare[] {
  const decise = new Set(decizii.map(d => d.id));
  const numeProduse = state.produse.map(p => p.denumire);

  const intrari: IntrareAprobare[] = (state.nemapate ?? []).map(n => {
    const id = idIntrare('PRODUS', n.denumire);
    return {
      id, fel: 'PRODUS' as const,
      valoareSursa: n.denumire,
      sursa: n.fisier,
      perioada: '',
      greutate: n.valoare,
      unitateGreutate: 'RON' as const,
      sugestii: sugereaza(n.denumire, numeProduse),
      motiv: 'Denumirea din raport nu corespunde niciunui produs din nomenclator. '
        + 'Vânzările ei nu intră în Food Cost până când nu e legată de un produs.',
    };
  }).filter(x => !decise.has(x.id));

  // ordinea cozii: cât cântărește, nu ordinea alfabetică — primul rând e cel care doare
  return intrari.sort((a, b) => b.greutate - a.greutate || a.valoareSursa.localeCompare(b.valoareSursa));
}

export interface RezumatCoada {
  total: number;
  peFel: Record<FelIntrare, number>;
  /** Cât valorează, în lei, ce stă neaprobat. Cifra care spune dacă merită atenția acum. */
  greutateRON: number;
  /** Câte au cel puțin o sugestie — restul cer o decizie făcută de la zero. */
  cuSugestii: number;
}

export function rezumaCoada(coada: IntrareAprobare[]): RezumatCoada {
  const peFel: Record<FelIntrare, number> = { PRODUS: 0, MATERIAL: 0, RESTAURANT: 0 };
  let greutateRON = 0, cuSugestii = 0;
  for (const x of coada) {
    peFel[x.fel]++;
    if (x.unitateGreutate === 'RON') greutateRON += x.greutate;
    if (x.sugestii.length) cuSugestii++;
  }
  return { total: coada.length, peFel, greutateRON: Math.round(greutateRON * 100) / 100, cuSugestii };
}

/**
 * Traduce deciziile luate în aliasuri pentru importator. Respingerile explicite (`tinta:
 * null`) NU produc alias: rămân decizii înregistrate, ca aceeași denumire să nu reapară în
 * coadă, dar nu leagă nimic de nimic.
 */
export function aliasuriDin(decizii: DecizieAprobare[], coada: IntrareAprobare[]): AliasuriAprobate {
  const dupaId = new Map(coada.map(x => [x.id, x.valoareSursa]));
  const rez: AliasuriAprobate = {};
  for (const d of decizii) {
    if (d.tinta === null) continue;
    const sursa = dupaId.get(d.id);
    if (sursa) rez[sursa] = d.tinta;
  }
  return rez;
}

/** O decizie e validă doar dacă ținta chiar există. Un alias către nimic ar pierde rândul altfel. */
export function valideazaDecizie(
  d: DecizieAprobare, state: AppState,
): { valida: boolean; motiv?: string } {
  if (d.tinta === null) return { valida: true };
  if (!d.actor.trim()) return { valida: false, motiv: 'Aprobarea trebuie să aibă un autor.' };
  const exista = state.produse.some(p => p.cod === d.tinta || p.denumire === d.tinta);
  return exista ? { valida: true }
    : { valida: false, motiv: `Produsul „${d.tinta}" nu există în nomenclator — aliasul ar trimite spre nimic.` };
}
