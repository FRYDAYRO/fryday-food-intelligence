/**
 * Master-ul de restaurante FRYDAY, recuperat din raportul NCR 4.7 Sales Mix
 * (`date-sursa/4.7_Sales_Mix.pdf`, antetul „Groups/Stores Selected for this Report",
 * an fiscal 2026, perioada 7, generat 8/3/2026).
 *
 * REGULA DE DATE care ține tot modulul:
 *
 *   Numele de mai jos sunt DOAR NUME DE AFIȘARE. Raportul NCR listează restaurantele
 *   exclusiv pe nume — nu conține niciun identificator de magazin. Până când apare un
 *   export NCR cu coloana de magazin, `storeId` rămâne `null` și `verificat` rămâne
 *   `false` pentru toate.
 *
 * Prin urmare, în aplicație:
 *   · un restaurant nemapat NU primește date — nici măcar „aproximativ";
 *   · potrivirea după nume e INTERZISĂ: două restaurante din același oraș
 *     (CLUJ IULIUS / CLUJ MEMO / CLUJ VIVO) s-ar putea confunda, iar o cifră
 *     atribuită greșit e mai rea decât o cifră lipsă;
 *   · lista nu acordă niciun drept: autorizarea rămâne în `fc-acces`.
 */

/** Numele exact, așa cum apare în raportul sursă — nu se normalizează și nu se traduce. */
export type NumeRestaurant = string;

export interface RestaurantFryday {
  displayName: NumeRestaurant;
  /** Identificatorul din sistemul-sursă. `null` până când un export NCR îl confirmă. */
  storeId: string | null;
  source: 'legacy-4.7';
  verified: boolean;
}

/** Selecția „toată rețeaua" — nu e un restaurant, e scopul de companie. */
export const TOATE_RESTAURANTELE = 'TOATE';

export const MESAJ_NEMAPAT = 'Date insuficiente pentru o concluzie sigură.';

const NUME: NumeRestaurant[] = [
  "FRYDAY ALBA IULIA",
  "FRYDAY ARAD ATRIUM",
  "FRYDAY BUCURESTI BANEASA",
  "FRYDAY Bucuresti Berceni DT",
  "FRYDAY BUCURESTI MALL",
  "FRYDAY BUCURESTI SUN PLAZA",
  "FRYDAY CLUJ IULIUS",
  "FRYDAY CLUJ MEMO",
  "FRYDAY CLUJ VIVO",
  "FRYDAY CONSTANTA CITY PARK",
  "FRYDAY CONSTANTA VIVO",
  "FRYDAY CRAIOVA",
  "FRYDAY CRAIOVA ELECTROPUTERE",
  "FRYDAY GALATI",
  "FRYDAY IASI MOLDOVA MALL",
  "FRYDAY IASI PALAS",
  "FRYDAY ORADEA",
  "FRYDAY PIATRA NEAMT DT",
  "FRYDAY PITESTI ARGES MALL",
  "FRYDAY PITESTI VIVO",
  "FRYDAY PLOIESTI DT",
  "FRYDAY RM VALCEA DT",
  "FRYDAY SIBIU PROMENADA",
  "FRYDAY SIBIU SELIMBAR",
  "FRYDAY SUCEAVA DT",
  "FRYDAY TARGOVISTE",
  "FRYDAY TG MURES PLAZA M",
  "FRYDAY TG MURES SHOPPING CITY",
  "FRYDAY TIMISOARA IULIUS TOWN",
  "FRYDAY VASLUI DT",
];

/**
 * Cele 30 de restaurante reale. Toate pornesc nemapate: niciun `storeId` nu a fost
 * observat în sursă, deci niciunul nu se inventează.
 */
export const RESTAURANTE_FRYDAY: RestaurantFryday[] = NUME.map(displayName => ({
  displayName, storeId: null, source: 'legacy-4.7', verified: false,
}));

/** Un restaurant are date doar dacă are un `storeId` VERIFICAT. Numele nu e o cheie. */
export const esteMapat = (r: RestaurantFryday): boolean => r.verified && r.storeId !== null;

export const restaurantDupaNume = (nume: string): RestaurantFryday | undefined =>
  RESTAURANTE_FRYDAY.find(r => r.displayName === nume);

/** Căutare pe cuvinte, fără diacritice și fără majuscule — „iasi palas" găsește „FRYDAY IASI PALAS". */
export function cautaRestaurante(q: string, lista: RestaurantFryday[] = RESTAURANTE_FRYDAY): RestaurantFryday[] {
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const cuvinte = norm(q).split(/\s+/).filter(Boolean);
  if (!cuvinte.length) return lista;
  return lista.filter(r => {
    const n = norm(r.displayName);
    return cuvinte.every(c => n.includes(c));
  });
}
