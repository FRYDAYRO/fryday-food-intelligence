/**
 * STORE MASTER — sursa unică de adevăr pentru identitatea restaurantelor.
 *
 * Tot ce înseamnă „ce restaurant e ăsta?" trece pe aici: NBO 2.9, PMIX 4.7, NBO 4.1 și
 * orice raport în vrac de mâine. Niciun alt modul nu are voie să-și facă propria potrivire
 * după nume — de aceea logica stă într-un singur fișier, pură și determinist testabilă.
 *
 * Regula care ține tot — și distincția pe care se sprijină totul:
 *
 *   IDENTITATEA (ce restaurant e) se poate stabili din nume, determinist și unic.
 *   IDENTIFICATORUL (`storeId`) NU se poate inventa niciodată din nume.
 *
 *   Raportul 4.7 ne-a dat 30 de nume fără niciun identificator. Un raport care spune
 *   „FRYDAY CLUJ MEMO" se poate deci importa și afișa pe restaurantul lui — dar `storeId`
 *   rămâne `null` și `verificat` rămâne `false` până când o sursă autoritară aduce ID-ul.
 *   Aplicația nu se blochează așteptând un export NCR; doar nu se preface că are un ID.
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
  /** Identificatorul autoritar. `null` când identitatea s-a stabilit doar din nume. */
  storeId: string | null;
  /**
   * `true` DOAR când identitatea e susținută de un identificator autoritar. O potrivire
   * pe nume, oricât de sigură, lasă `false`: știm ce restaurant e, nu avem ID-ul lui.
   */
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

/** Intrările care au un identificator autoritar. Doar ele pot fi potrivite pe identificator. */
const cuIdentificator = (master: IntrareStoreMaster[]) =>
  master.filter(m => m.verified && m.storeId !== null);

/**
 * Potrivește un text-sursă cu master-ul, pe scara cerută:
 *
 *   1. identificator autoritar (când există)
 *   2. nume de afișare EXACT, unic în master
 *   3. alias EXACT, unic în master
 *   4. potrivire normalizată — DOAR dacă dă exact un rezultat
 *   5. altfel UNMATCHED
 *
 * La orice nivel, două sau mai multe intrări care prind textul ⇒ AMBIGUOUS și atribuirea
 * se oprește. Nivelurile se evaluează în ordine: o potrivire exactă e neambiguă prin
 * definiție și are precădere — dar normalizarea, care e cea care poate topi două
 * restaurante într-unul, nu atribuie nimic dacă prinde mai mult de unul.
 *
 * IMPORTANT: o potrivire pe nume stabilește IDENTITATEA (ce restaurant e), nu
 * identificatorul. `storeId` rămâne `null` și `verificat` rămâne `false` până când o sursă
 * autoritară aduce un identificator. Raportul se poate importa și afișa pe restaurantul lui;
 * doar nu ne prefacem că avem un ID pe care nu-l avem.
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
  const ambiguu = (ce: string, lovite: IntrareStoreMaster[]): ProvenientaRand =>
    nimic('AMBIGUOUS', `${ce} „${brut.trim()}" e revendicat de mai multe intrări: ${lovite.map(m => m.displayName).join(', ')}.`,
      lovite.map(m => m.displayName),
      'Atribuirea s-a oprit: nu se alege între restaurante. Dezambiguizează master-ul sau folosește identificatorul.');
  /** Identitatea rezolvată. `storeId` intră DOAR când chiar a venit dintr-o sursă autoritară. */
  const gasit = (m: IntrareStoreMaster, status: StatusPotrivire, metoda: string): ProvenientaRand => ({
    ...baza, status, metoda,
    identitate: m.displayName,
    storeId: m.verified ? m.storeId : null,
    verificat: m.verified && m.storeId !== null,
    candidati: [m.displayName],
  });

  const v = brut.trim();
  if (!v) return nimic('UNMATCHED', 'Rândul nu declară niciun restaurant.', [], MESAJ_IDENTITATE_NEREZOLVATA);
  const n = normalizeazaNume(v);

  // 1 — identificatorul autoritar
  const dupaId = cuIdentificator(master).filter(m => m.storeId === v);
  if (dupaId.length > 1) return ambiguu('Identificatorul', dupaId);
  if (dupaId.length === 1) return gasit(dupaId[0], 'MATCHED_ID', `Identificator autoritar „${v}".`);

  // 2 — numele de afișare, exact. O potrivire exactă unică e neambiguă prin definiție.
  const dupaNume = master.filter(m => m.displayName === v);
  if (dupaNume.length > 1) return ambiguu('Numele', dupaNume);
  if (dupaNume.length === 1) {
    return gasit(dupaNume[0], 'MATCHED_NAME', 'Nume din Store Master, potrivire exactă.');
  }

  // 3 — aliasul, exact
  const dupaAlias = master.filter(m => m.aliases.includes(v));
  if (dupaAlias.length > 1) return ambiguu('Aliasul', dupaAlias);
  if (dupaAlias.length === 1) return gasit(dupaAlias[0], 'MATCHED_ALIAS', `Alias „${v}", potrivire exactă.`);

  // 4 — normalizat. Aici se poate topi ceva, deci aici e cea mai strictă condiție:
  //     atribuie DOAR dacă rezultatul e unul singur.
  const dupaNorm = master.filter(m =>
    normalizeazaNume(m.displayName) === n || m.aliases.some(a => normalizeazaNume(a) === n));
  if (dupaNorm.length > 1) {
    return nimic('AMBIGUOUS',
      `Normalizat, „${v}" prinde mai multe restaurante: ${dupaNorm.map(m => m.displayName).join(', ')}.`,
      dupaNorm.map(m => m.displayName),
      'Normalizarea NU are voie să topească două restaurante într-unul. Atribuirea s-a oprit.');
  }
  if (dupaNorm.length === 1) {
    const m = dupaNorm[0];
    const prinAlias = normalizeazaNume(m.displayName) !== n;
    return gasit(m, prinAlias ? 'MATCHED_ALIAS' : 'MATCHED_NAME',
      prinAlias ? 'Alias, potrivire după normalizare.' : 'Nume din Store Master, potrivire după normalizare.');
  }

  // 5 — nimic. Nu se caută „ceva asemănător": numele apropiate NU se unesc automat.
  return nimic('UNMATCHED', 'Niciun restaurant din Store Master nu corespunde.', [], MESAJ_IDENTITATE_NEREZOLVATA);
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
