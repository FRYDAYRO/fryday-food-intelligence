/**
 * Declarațiile de includere — singura sursă de statut pentru waste față de Usage Actual.
 *
 * Reguli: o declarație se acceptă NUMAI pe o linie cu comparație validă (același restaurant,
 * aceeași fereastră, material prezent în 2.9 cu coloana Adj, aceeași UM); „exclus prin ajustare"
 * nu poate depăși Inv Adj tipărit; „inclus în Usage" nu poate depăși cantitatea 2.8 rămasă;
 * fiecare declarație poartă temeiul și sursa ei. Motorul (`potriveste28cu29`) recalculează
 * statutul din declarații la fiecare cerere — aici nu se memorează nimic derivat.
 */
import type { LiniePotrivire } from './atribuire-waste';
import type { AppState, DeclaratieIncludere, Includere, TemeiIncludere } from './types';

export const ETICHETA_INCLUDERE: Record<Includere, string> = {
  INCLUS_IN_USAGE: 'inclus în Usage Actual',
  EXCLUS_PRIN_AJUSTARE: 'exclus prin ajustare (Inv Adj)',
  NEDETERMINAT: 'nedeterminat',
};

export const ETICHETA_TEMEI: Record<TemeiIncludere, string> = {
  REGULA_NBO_CONFIRMATA: 'regulă NBO confirmată (document)',
  LEGATURA_STOC_VERIFICATA: 'legătură verificată cu mișcările de stoc',
  DECLARATIE_UTILIZATOR: 'declarația utilizatorului',
};

const aceeasiCheie = (a: { locatie: string | null; fereastra: { de: string; la: string }; material: string }, b: typeof a) =>
  (a.locatie ?? '') === (b.locatie ?? '') && a.fereastra.de === b.fereastra.de && a.fereastra.la === b.fereastra.la && a.material === b.material;

const aceeasiDeclaratie = (a: DeclaratieIncludere, b: DeclaratieIncludere) =>
  aceeasiCheie(a, b) && a.includere === b.includere && a.cant === b.cant && a.temei === b.temei && a.sursa === b.sursa;

/** Comparația liniei e validă: doar atunci o declarație poate da statut. */
export const eComparabila = (l: LiniePotrivire) =>
  l.potrivire === 'EXACTA' || l.potrivire === 'COMPATIBILA_CU_PRECIZIA' || l.potrivire === 'DIFERENTA_REALA';

/** Declarațiile din stare care privesc linia (aceeași cheie de restaurant × fereastră × material). */
export const declaratiiLiniei = (state: AppState, l: LiniePotrivire): DeclaratieIncludere[] =>
  (state.declaratiiIncludere ?? []).filter(d => aceeasiCheie(d, l));

/** Cantitatea pe care o mai poate primi linia pentru statutul cerut (după declarațiile deja acordate). */
export function cantitateDisponibila(l: LiniePotrivire, includere: Exclude<Includere, 'NEDETERMINAT'>): number {
  if (!eComparabila(l)) return 0;
  const ramas = l.parti.NEDETERMINAT.cant;
  if (includere === 'INCLUS_IN_USAGE') return ramas;
  const plafonAdj = Math.max(0, (l.adj ?? 0) - l.parti.EXCLUS_PRIN_AJUSTARE.cant);
  return Math.min(ramas, plafonAdj);
}

/** Erorile pentru care o declarație NU se acceptă pe linia dată. Lista goală = valabilă. */
export function valideazaDeclaratie(l: LiniePotrivire, d: DeclaratieIncludere): string[] {
  const erori: string[] = [];
  if (!aceeasiCheie(d, l)) erori.push('Declarația nu privește această linie (restaurant, fereastră sau material diferit).');
  if (!eComparabila(l)) erori.push(`Comparația nu e validă (${l.potrivire}): fără material în 2.9 cu coloana Adj și aceeași UM, nicio declarație nu dă statut.`);
  if (!(d.cant > 0)) erori.push('Cantitatea declarată trebuie să fie strict pozitivă.');
  if (!d.sursa.trim()) erori.push('Declarația trebuie să-și spună sursa (document, verificare, persoană și dată).');
  if (eComparabila(l) && d.cant > 0) {
    const disponibil = cantitateDisponibila(l, d.includere);
    if (d.cant > disponibil + 1e-9) {
      erori.push(d.includere === 'EXCLUS_PRIN_AJUSTARE'
        ? `„Exclus prin ajustare" nu poate depăși Inv Adj tipărit rămas (${disponibil} ${l.um}).`
        : `„Inclus în Usage" nu poate depăși cantitatea 2.8 rămasă nedeterminată (${disponibil} ${l.um}).`);
    }
  }
  return erori;
}

/** Adaugă declarația în stare (apelantul a validat-o pe linia ei). Nu modifică nimic altceva. */
export const adaugaDeclaratie = (state: AppState, d: DeclaratieIncludere): AppState =>
  ({ ...state, declaratiiIncludere: [...(state.declaratiiIncludere ?? []), { ...d, sursa: d.sursa.trim() }] });

/** Retrage o declarație (prima identică). Statutul se recalculează de la sine la următoarea cerere. */
export function retrageDeclaratie(state: AppState, d: DeclaratieIncludere): AppState {
  const lista = state.declaratiiIncludere ?? [];
  const i = lista.findIndex(x => aceeasiDeclaratie(x, d));
  if (i < 0) return state;
  return { ...state, declaratiiIncludere: [...lista.slice(0, i), ...lista.slice(i + 1)] };
}
