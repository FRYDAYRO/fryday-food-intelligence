// Clasificarea liniilor din raportul 2.9.
//
// Regula care guvernează tot fișierul: NIMIC nu cade tăcut pe FOOD.
//
// Clasificatorul vechi (`clasifica` din engine) întorcea `FOOD` pentru orice categorie care nu
// se potrivea cu nicio regulă, cu un steag `auto` pe care nimic nu-l bloca. Efectul: o categorie
// de ambalaje formulată altfel decât regula intra tăcut în Food, iar FC Curat ieșea greșit fără
// ca cineva să afle. Aici, o categorie nerecunoscută rămâne `UNCLASSIFIED` și apare în
// diagnosticele de calitate a datelor, ca să fie mapată explicit.
import { norm } from './engine';
import type { Clasa29, RegulaClasificare } from './types';

/** Categoria unei linii 2.9. `UNCLASSIFIED` nu e o valoare implicită, ci o problemă de raportat. */
export type FCCategory =
  | 'FOOD'          // materie primă alimentară
  | 'PAPER'         // ambalaje
  | 'NORMALIZED'    // material normalizat: porționat/reambalat intern, nu apare ca atare în rețete
  | 'CLEANING'      // curățenie, igienă
  | 'OPERATIONAL'   // consumabile de exploatare
  | 'UNIFORMS'      // echipament de lucru
  | 'STATIONERY'    // papetărie, birotică
  | 'OTHER'         // recunoscut, dar în afara celorlalte grupe
  | 'UNCLASSIFIED'; // nerecunoscut — NU se presupune nimic

export const ETICHETA_CATEGORIE: Record<FCCategory, string> = {
  FOOD: 'Food', PAPER: 'Paper', NORMALIZED: 'Material normalizat',
  CLEANING: 'Curățenie', OPERATIONAL: 'Operațional', UNIFORMS: 'Uniforme',
  STATIONERY: 'Papetărie', OTHER: 'Altele', UNCLASSIFIED: 'Neclasificat',
};

/** Categoriile care intră în Food Cost. `UNCLASSIFIED` nu e aici: nu se știe, deci nu se include. */
export const CATEGORII_FC: FCCategory[] = ['FOOD', 'PAPER', 'NORMALIZED'];
export const esteFC = (c: FCCategory) => CATEGORII_FC.includes(c);

/** Categoriile de consum operațional — reale, dar în afara Food Cost. */
export const CATEGORII_OPERATIONALE: FCCategory[] = ['CLEANING', 'OPERATIONAL', 'UNIFORMS', 'STATIONERY', 'OTHER'];
export const esteOperational = (c: FCCategory) => CATEGORII_OPERATIONALE.includes(c);

export interface RegulaCategorie29 {
  /** Text căutat în categoria din raport, normalizat (fără diacritice, litere mici). */
  pattern: string;
  categorie: FCCategory;
}

/**
 * Regulile implicite, ordonate de la specific la general — prima potrivire câștigă.
 *
 * Ordinea contează: „consumabile administrative" trebuie să ajungă la STATIONERY înainte ca
 * „consumabile" să-l prindă ca OPERATIONAL. Fiecare categorie din setul demo și din vocabularul
 * FRYDAY este mapată EXPLICIT aici — nu mai există cădere tăcută pe FOOD.
 */
export const REGULI_IMPLICITE_29: RegulaCategorie29[] = [
  // — papetărie și birotică (înaintea „consumabile" generic)
  { pattern: 'consumabile administrative', categorie: 'STATIONERY' },
  { pattern: 'administrative', categorie: 'STATIONERY' },
  { pattern: 'papetarie', categorie: 'STATIONERY' },
  { pattern: 'birotica', categorie: 'STATIONERY' },
  { pattern: 'rechizite', categorie: 'STATIONERY' },
  { pattern: 'stationery', categorie: 'STATIONERY' },

  // — uniforme
  { pattern: 'uniforme', categorie: 'UNIFORMS' },
  { pattern: 'echipament de lucru', categorie: 'UNIFORMS' },
  { pattern: 'echipament protectie', categorie: 'UNIFORMS' },
  { pattern: 'uniform', categorie: 'UNIFORMS' },

  // — curățenie și igienă
  { pattern: 'curatenie', categorie: 'CLEANING' },
  { pattern: 'igiena', categorie: 'CLEANING' },
  { pattern: 'detergent', categorie: 'CLEANING' },
  { pattern: 'dezinfect', categorie: 'CLEANING' },
  { pattern: 'cleaning', categorie: 'CLEANING' },

  // — materiale normalizate (înaintea ambalajelor: sunt un caz special de material)
  { pattern: 'normalizat', categorie: 'NORMALIZED' },
  { pattern: 'normalized', categorie: 'NORMALIZED' },
  { pattern: 'portionat', categorie: 'NORMALIZED' },
  { pattern: 'semipreparat', categorie: 'NORMALIZED' },

  // — ambalaje
  { pattern: 'ambalaj', categorie: 'PAPER' },
  { pattern: 'ambalaje', categorie: 'PAPER' },
  { pattern: 'packaging', categorie: 'PAPER' },
  { pattern: 'hartie', categorie: 'PAPER' },
  { pattern: 'paper', categorie: 'PAPER' },
  { pattern: 'caserol', categorie: 'PAPER' },
  { pattern: 'pungi', categorie: 'PAPER' },

  // — alimente: vocabularul real din rapoartele FRYDAY, mapat explicit
  { pattern: 'carne si pui', categorie: 'FOOD' },
  { pattern: 'carne', categorie: 'FOOD' },
  { pattern: 'pui', categorie: 'FOOD' },
  { pattern: 'vita', categorie: 'FOOD' },
  { pattern: 'peste', categorie: 'FOOD' },
  { pattern: 'creveti', categorie: 'FOOD' },
  { pattern: 'panificatie', categorie: 'FOOD' },
  { pattern: 'legume si sosuri', categorie: 'FOOD' },
  { pattern: 'legume', categorie: 'FOOD' },
  { pattern: 'sosuri', categorie: 'FOOD' },
  { pattern: 'lactate', categorie: 'FOOD' },
  { pattern: 'branzeturi', categorie: 'FOOD' },
  { pattern: 'bauturi', categorie: 'FOOD' },
  { pattern: 'ulei si alte alimente', categorie: 'FOOD' },
  { pattern: 'ulei', categorie: 'FOOD' },
  { pattern: 'alimente', categorie: 'FOOD' },
  { pattern: 'materii prime', categorie: 'FOOD' },
  { pattern: 'food', categorie: 'FOOD' },
  { pattern: 'condimente', categorie: 'FOOD' },
  { pattern: 'inghetata', categorie: 'FOOD' },
  { pattern: 'desert', categorie: 'FOOD' },
  { pattern: 'cafea', categorie: 'FOOD' },

  // — consumabile de exploatare (generic, la final)
  { pattern: 'consumabile', categorie: 'OPERATIONAL' },
  { pattern: 'operational', categorie: 'OPERATIONAL' },
  { pattern: 'intretinere', categorie: 'OPERATIONAL' },
  { pattern: 'mentenanta', categorie: 'OPERATIONAL' },
];

/**
 * Clasa VECHE (FOOD / PAPER / EXCLUS) a unei categorii canonice.
 *
 * FC Curat se calculează peste tot — ecranul Food Cost, `fcPerioada`, `nboFC` din Control
 * Tower — cu clasificatorul vechi din `engine` și cu `state.reguli`. Puntea pe materiale
 * folosește lista canonică de mai sus. Cele două plecau din vocabulare diferite: patru tipare
 * în română contra treizeci în două limbi. Aceeași categorie 2.9 dădea un Food Cost Curat
 * într-un ecran și altul în celălalt. Regula de aici e puntea dintre ele.
 *
 * `NORMALIZED` cade pe PAPER: e materie de Food Cost (`esteFC`), iar puntea o numește
 * chiar „NORMALIZED_PAPER". Tot ce e operațional iese din FC Curat, deci EXCLUS.
 */
export const clasaDinCategorie = (c: FCCategory): Clasa29 =>
  (c === 'FOOD' ? 'FOOD' : esteFC(c) ? 'PAPER' : 'EXCLUS');

/**
 * Regulile implicite ale clasificatorului vechi — DERIVATE din `REGULI_IMPLICITE_29`, nu o
 * a doua listă. Ordinea se păstrează (specific înaintea genericului), fiindcă și
 * clasificatorul vechi ia prima potrivire.
 */
export const regulileImpliciteLegacy = (): RegulaClasificare[] =>
  REGULI_IMPLICITE_29.map(r => ({ pattern: r.pattern, clasa: clasaDinCategorie(r.categorie) }));

/**
 * Îmbină regulile deja salvate cu cele implicite, FĂRĂ să șteargă și FĂRĂ să reordoneze
 * nimic din ce exista. Clasificatorul vechi ia prima potrivire dintr-o singură listă, iar
 * regulile omului stau acolo unde le-a pus el — deci ele rămân în față, cu prioritatea de
 * azi, iar implicitele noi intră doar în urma lor și doar dacă tiparul lipsește. Ce era
 * clasificat rămâne clasificat la fel; se schimbă numai ce cădea înainte, tăcut, pe FOOD.
 */
export function imbinaReguli(existente: RegulaClasificare[], implicite: RegulaClasificare[]): RegulaClasificare[] {
  const stiute = new Set(existente.map(r => norm(r.pattern)));
  return [...existente, ...implicite.filter(r => !stiute.has(norm(r.pattern)))];
}

export type SursaClasificare = 'UTILIZATOR' | 'IMPLICITA' | 'NECLASIFICAT';

export interface Clasificare29 {
  categorie: FCCategory;
  /** Ce regulă a decis. `null` când nu s-a potrivit nimic. */
  regula: string | null;
  sursa: SursaClasificare;
  /** Adevărat doar când chiar nu s-a putut decide — niciodată o presupunere tăcută. */
  neclasificat: boolean;
}

/**
 * Clasifică o categorie din 2.9. Regulile utilizatorului au prioritate față de cele implicite;
 * dacă nu se potrivește nimic, rezultatul este `UNCLASSIFIED`, cu `regula: null`.
 */
export function clasificaCategorie29(
  categorie: string,
  reguliUtilizator: RegulaCategorie29[] = [],
): Clasificare29 {
  const c = norm(categorie);
  if (!c) {
    return { categorie: 'UNCLASSIFIED', regula: null, sursa: 'NECLASIFICAT', neclasificat: true };
  }
  for (const r of reguliUtilizator) {
    if (r.pattern && c.includes(norm(r.pattern))) {
      return { categorie: r.categorie, regula: r.pattern, sursa: 'UTILIZATOR', neclasificat: false };
    }
  }
  for (const r of REGULI_IMPLICITE_29) {
    if (c.includes(r.pattern)) {
      return { categorie: r.categorie, regula: r.pattern, sursa: 'IMPLICITA', neclasificat: false };
    }
  }
  return { categorie: 'UNCLASSIFIED', regula: null, sursa: 'NECLASIFICAT', neclasificat: true };
}

/**
 * Categoria efectivă a unui material: clasificarea categoriei, cu două corecții din date —
 * un material marcat normalizat în sursă este NORMALIZED indiferent de categorie, iar unul
 * care nu se regăsește în niciun rețetar, dar e ambalaj, este tot material normalizat.
 *
 * Semnul `areIngredient` rafinează cazul ambalajelor: un ambalaj care EXISTĂ în nomenclator,
 * dar pe care nicio rețetă nu-l folosește, nu e material normalizat (reambalat intern), ci un
 * gol de rețetar — rămâne PAPER, iar puntea îl arată separat. Apelanții care nu transmit
 * semnul păstrează comportamentul de până acum.
 *
 * Necunoscutul rămâne necunoscut CHIAR ȘI marcat normalizat în sursă: marcajul spune cum e
 * manipulat materialul, nu ce este — dacă nicio regulă nu-i recunoaște categoria, a-l lăsa
 * să intre în Food Cost pe ușa „normalizat" ar fi exact căderea tăcută pe care o interzicem.
 */
export function categorieMaterial(
  cls: Clasificare29,
  semne: { normalizatInSursa?: boolean; areReteta?: boolean; areIngredient?: boolean },
): FCCategory {
  if (cls.categorie === 'UNCLASSIFIED') return 'UNCLASSIFIED';
  if (semne.normalizatInSursa) return 'NORMALIZED';
  if (cls.categorie === 'PAPER' && semne.areReteta === false && semne.areIngredient !== true) return 'NORMALIZED';
  return cls.categorie;
}
