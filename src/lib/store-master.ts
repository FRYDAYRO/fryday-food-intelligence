/**
 * STORE MASTER — sursa unică de adevăr pentru identitatea restaurantelor.
 *
 * Tot ce înseamnă „ce restaurant e ăsta?" trece pe aici: NBO 2.9, PMIX 4.7, NBO 4.1 și
 * orice raport în vrac de mâine. Niciun alt modul nu are voie să-și facă propria potrivire
 * după nume — de aceea logica stă într-un singur fișier, pură și determinist testabilă.
 *
 * Regula care ține tot:
 *
 *   Se potrivește DOAR pe intrări VERIFICATE. O intrare nesigură nu atribuie niciodată un
 *   rând, oricât de bine ar arăta numele. Raportul 4.7 ne-a dat 30 de nume fără niciun
 *   identificator, deci toate 30 sunt neverificate — și niciun rând nu li se atribuie
 *   până când un export NCR aduce identificatorul.
 *
 * Și corolarul, la fel de important:
 *
 *   Dacă două intrări din master ar putea prinde același text-sursă, rezultatul e AMBIGUU
 *   și atribuirea se OPREȘTE. „FRYDAY CLUJ" nu are voie să aleagă singur între IULIUS,
 *   MEMO și VIVO. O cifră pusă la restaurantul greșit e mai rea decât o cifră lipsă.
 *
 * Potrivirea e deterministă și nu are nimic de-a face cu modelul de limbaj: Advisorul
 * primește identități deja rezolvate, nu le rezolvă el.
 */
import { RESTAURANTE_FRYDAY, type RestaurantFryday } from './restaurante-fryday';

export type IntrareStoreMaster = RestaurantFryday;

/** Master-ul canonic. Alte module îl citesc; niciunul nu-și ține propria listă. */
export const STORE_MASTER: IntrareStoreMaster[] = RESTAURANTE_FRYDAY;

/** Rapoartele în vrac care trec prin potrivire. Lista crește; algoritmul nu se schimbă. */
export type RaportSursa = 'NBO_29' | 'PMIX_47' | 'NBO_41' | 'ALT_RAPORT';

export type StatusPotrivire =
  | 'MATCHED_ID'      // identificator verificat — singura potrivire fără nicio îndoială
  | 'MATCHED_NAME'    // nume verificat, exact sau normalizat
  | 'MATCHED_ALIAS'   // alias verificat, observat într-un fișier real
  | 'UNMATCHED'       // nu s-a găsit nimic verificat — rândul NU intră în calcul
  | 'AMBIGUOUS';      // mai multe intrări ar putea prinde același text — atribuirea se oprește

/** O potrivire e utilizabilă în calcul doar dacă a rezolvat o identitate verificată. */
export const POTRIVIRI_UTILIZABILE: StatusPotrivire[] = ['MATCHED_ID', 'MATCHED_NAME', 'MATCHED_ALIAS'];

export const esteUtilizabila = (s: StatusPotrivire): boolean => POTRIVIRI_UTILIZABILE.includes(s);

export const MESAJ_IDENTITATE_NEREZOLVATA = 'Date insuficiente pentru o concluzie sigură.';

/**
 * Proveniența unui rând importat. Trebuie să răspundă, singură, la: din ce raport?
 * ce scria în fișier? ce intrare din master? cum s-a potrivit? era verificată? ce perioadă?
 * al câtelea rând? Fără toate astea, o cifră nu se poate urmări înapoi.
 */
export interface ProvenientaRand {
  raport: RaportSursa;
  perioada: string;
  /** Indexul rândului în fișierul sursă (1 = primul rând de date). */
  randSursa: number;
  /** Textul EXACT din fișier, nemodificat — inclusiv spații și majuscule. */
  valoareSursa: string;
  status: StatusPotrivire;
  /** Cum s-a ajuns la concluzie, în cuvinte — pentru cine citește auditul peste un an. */
  metoda: string;
  /** `displayName`-ul din master, când s-a rezolvat o identitate. Altfel `null`. */
  identitate: string | null;
  storeId: string | null;
  verificat: boolean;
  /** Intrările care ar fi putut prinde textul — populat la AMBIGUOUS și la UNMATCHED. */
  candidati: string[];
  motiv?: string;
}

/**
 * Normalizarea folosită la comparație. Taie diacriticele, majusculele și spațiile în plus.
 * NU taie cuvinte: „CLUJ" și „CLUJ MEMO" rămân diferite, altfel normalizarea ar topi două
 * restaurante într-unul — exact ce nu are voie să facă.
 */
export const normalizeazaNume = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

const verificate = (master: IntrareStoreMaster[]) =>
  master.filter(m => m.verified && m.storeId !== null);

/**
 * Potrivește un text-sursă cu master-ul, în ordinea de precădere cerută:
 * 1. identificator verificat · 2. nume verificat exact · 3. nume verificat normalizat
 * 4. alias verificat · 5. altfel UNMATCHED.
 *
 * La ORICE nivel, două sau mai multe intrări care prind același text ⇒ AMBIGUOUS.
 */
export function potrivesteRestaurant(
  valoareSursa: string,
  context: { raport: RaportSursa; perioada: string; randSursa: number },
  master: IntrareStoreMaster[] = STORE_MASTER,
): ProvenientaRand {
  const brut = String(valoareSursa ?? '');
  const baza = { ...context, valoareSursa: brut };
  const nimic = (status: StatusPotrivire, metoda: string, candidati: string[], motiv?: string): ProvenientaRand =>
    ({ ...baza, status, metoda, identitate: null, storeId: null, verificat: false, candidati, ...(motiv ? { motiv } : {}) });

  const v = brut.trim();
  if (!v) return nimic('UNMATCHED', 'Rândul nu declară niciun restaurant.', [], MESAJ_IDENTITATE_NEREZOLVATA);

  const n = normalizeazaNume(v);
  const vf = verificate(master);

  // Nivelul la care fiecare intrare verificată ar putea prinde textul. Se calculează pentru
  // TOATE, nu se iese la prima potrivire: altfel o potrivire exactă ar ascunde faptul că o a
  // doua intrare prinde același text după normalizare, iar cele două s-ar topi în tăcere.
  const nivel = (m: IntrareStoreMaster): { rang: number; status: StatusPotrivire; cum: string } | null => {
    if (m.storeId === v) return { rang: 1, status: 'MATCHED_ID', cum: `Identificator verificat „${v}".` };
    if (m.displayName === v) return { rang: 2, status: 'MATCHED_NAME', cum: 'Nume verificat, potrivire exactă.' };
    if (normalizeazaNume(m.displayName) === n) return { rang: 3, status: 'MATCHED_NAME', cum: 'Nume verificat, potrivire după normalizare.' };
    if (m.aliases.some(a => a === v || normalizeazaNume(a) === n)) return { rang: 4, status: 'MATCHED_ALIAS', cum: `Alias verificat „${v}".` };
    return null;
  };

  const candidati = vf.map(m => ({ m, n: nivel(m) })).filter((x): x is { m: IntrareStoreMaster; n: NonNullable<ReturnType<typeof nivel>> } => x.n !== null);

  // Două intrări diferite care ar putea prinde același text ⇒ se oprește. Nu contează că una
  // prinde „mai exact": un master în care două restaurante revendică același text e corupt,
  // iar alegerea tăcută a unuia e exact greșeala pe care stratul ăsta există s-o prevină.
  if (candidati.length > 1) {
    const nume = candidati.map(c => c.m.displayName);
    const prin = candidati.map(c => `${c.m.displayName} (${c.n.status})`).join(', ');
    return nimic('AMBIGUOUS', `Textul „${v}" e revendicat de mai multe intrări: ${prin}.`, nume,
      'Atribuirea s-a oprit: nu se alege între restaurante. Curăță master-ul sau folosește identificatorul.');
  }

  if (candidati.length === 1) {
    const { m, n: niv } = candidati[0];
    return { ...baza, status: niv.status, metoda: niv.cum, identitate: m.displayName, storeId: m.storeId, verificat: true, candidati: [m.displayName] };
  }

  // Nimic verificat. Spunem totuși ce ar fi putut fi, ca omul să știe exact ce lipsește.
  const neverificati = master
    .filter(m => !m.verified || m.storeId === null)
    .filter(m => m.displayName === v || normalizeazaNume(m.displayName) === n
      || m.aliases.some(a => normalizeazaNume(a) === n))
    .map(m => m.displayName);
  const motiv = neverificati.length
    ? `Numele corespunde cu ${neverificati.join(', ')}, dar intrarea nu are un identificator verificat. `
      + MESAJ_IDENTITATE_NEREZOLVATA
    : MESAJ_IDENTITATE_NEREZOLVATA;
  return nimic('UNMATCHED',
    neverificati.length
      ? 'Candidat găsit după nume, dar neverificat — nu se atribuie.'
      : 'Niciun restaurant din master nu corespunde.',
    neverificati, motiv);
}

// ————————————————————————————————————————————————————————— datasetul validat

export interface RandVrac<T> {
  /** Datele parsate ale rândului, netransformate de stratul de identitate. */
  date: T;
  provenienta: ProvenientaRand;
}

export interface DatasetValidat<T> {
  /** Rândurile cu identitate rezolvată — SINGURELE care intră în motoarele FC. */
  canonice: RandVrac<T>[];
  /** Rândurile oprite: UNMATCHED sau AMBIGUOUS. Nu se pierd, dar nu se calculează. */
  excluse: RandVrac<T>[];
  /** Câte rânduri pe fiecare status — rezumatul pe care îl citește ecranul de import. */
  peStatus: Record<StatusPotrivire, number>;
  /** `true` când nimic n-a fost oprit: abia atunci o analiză pe tot fișierul e completă. */
  complet: boolean;
}

/**
 * Împarte rândurile în ce se poate calcula și ce nu. Rândurile oprite rămân, cu proveniența
 * lor intactă: se pot arăta, exporta și rezolva — dar nu intră în nicio cifră.
 */
export function datasetValidat<T>(randuri: RandVrac<T>[]): DatasetValidat<T> {
  const peStatus: Record<StatusPotrivire, number> = {
    MATCHED_ID: 0, MATCHED_NAME: 0, MATCHED_ALIAS: 0, UNMATCHED: 0, AMBIGUOUS: 0,
  };
  for (const r of randuri) peStatus[r.provenienta.status]++;
  const canonice = randuri.filter(r => esteUtilizabila(r.provenienta.status));
  return { canonice, excluse: randuri.filter(r => !esteUtilizabila(r.provenienta.status)), peStatus,
    complet: canonice.length === randuri.length };
}

/** Potrivește un fișier întreg dintr-o dată — calea pe care o folosesc importurile în vrac. */
export function potrivesteVrac<T>(
  randuri: { valoareSursa: string; date: T }[],
  context: { raport: RaportSursa; perioada: string },
  master: IntrareStoreMaster[] = STORE_MASTER,
): DatasetValidat<T> {
  return datasetValidat(randuri.map((r, i) => ({
    date: r.date,
    provenienta: potrivesteRestaurant(r.valoareSursa, { ...context, randSursa: i + 1 }, master),
  })));
}
