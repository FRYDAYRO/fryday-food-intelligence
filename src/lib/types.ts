export type Canal = 'INSTORE' | 'DELIVERY';
export type Vedere = 'TOTAL' | Canal;
export type UMCod = 'g' | 'kg' | 'ml' | 'l' | 'buc';

export interface PretIstoric { validDeLa: string; pret: number; }

export interface Ingredient {
  cod: string; denumire: string; categorie: string;
  tip: 'FOOD' | 'PACKAGING';
  um: 'kg' | 'l' | 'buc';
  furnizor?: string;
  preturi: PretIstoric[];
  activ: boolean;
}

export interface Furnizor { cod: string; nume: string; contact?: string; }

export interface PretFurnizor { furnizor: string; ingredient: string; pret: number; validDeLa?: string; }

export interface ComboComp { cod: string; cant: number; }

export interface IntrarePret { data: string; canal: Canal; pret: number; nota?: string; }

export interface Produs {
  cod: string; denumire: string; categorie: string;
  codPos?: string;          // numărul POS din NBO, când diferă de Product ID; folosit la maparea PMIX
  aliasuri?: string[];      // denumiri din rapoartele POS (4.7 Sales Mix) care trimit la acest produs
  tip: 'SIMPLU' | 'COMBO';
  pretInstore?: number;   // brut, cu TVA
  pretDelivery?: number;  // brut, cu TVA
  tva: number;            // %
  activ: boolean;
  combo?: ComboComp[];
  istoricPret?: IntrarePret[];
}

export interface LinieReteta {
  comp: string;                 // cod_ingredient sau cod semipreparat
  tipComp: 'INGREDIENT' | 'SEMIPREPARAT' | 'AMBALAJ';
  cant: number;                 // cantitate (brută; sau netă dacă pierdere > 0)
  um: UMCod;
  pierdere?: number;            // % — doar dacă cant e introdusă în net
  canal: 'INSTORE' | 'DELIVERY' | 'AMBELE';
}

export interface VersiuneReteta {
  nr: number; data: string; nota?: string;
  linii: LinieReteta[];
  randament?: { cant: number; um: 'kg' | 'l' | 'buc' };  // doar semipreparate
}

export interface Reteta {
  cod: string;                  // = cod produs, sau SP-xxx
  tip: 'PRODUS' | 'SEMIPREPARAT';
  denumire: string;
  versiuni: VersiuneReteta[];
  activa: number;               // nr versiune activă
}

export interface VanzareFapt {
  data: string;                 // YYYY-MM-DD
  locatie: string; canal: Canal; produs: string;
  cant: number; brut: number; net: number;
}

export interface SalesReportRand {
  data: string; locatie: string; canal: Canal;
  net: number; brut?: number; bonuri?: number;
}

export interface Linie29 { perioada: string; locatie: string; categorie: string; valoare: number; }

/**
 * O linie din raportul 2.9 la nivel de MATERIAL, nu de categorie.
 *
 * `Linie29` rămâne rollup-ul pe categorie și e în continuare sursa când exportul nu are
 * detaliu pe material. Doar cu materialul se poate face puntea către rețete: fără el,
 * „ce s-a consumat și nu e în nicio rețetă" nu se poate afla.
 *
 * Câmpurile opționale reflectă realitatea exportului: nu orice 2.9 dă cantitatea sau costul
 * teoretic. Ce lipsește rămâne `null` și se raportează ca atare — nu se completează cu zero.
 */
export interface Material29 {
  perioada: string;            // AAAA-LL — perioada SURSĂ, păstrată ca atare
  locatie: string | null;      // null = raportul nu a precizat restaurantul
  material: string;            // codul materialului din NBO
  denumire: string;
  categorie: string;           // categoria brută, așa cum vine în raport
  cant: number | null;
  um: UMCod | null;
  costActual: number;          // lei consumați efectiv (valoarea din 2.9)
  costTeoretic: number | null; // lei teoretici, dacă raportul îi conține
  /** Materialul e marcat în sursă drept normalizat (porționat/reambalat intern). */
  normalizat?: boolean;
  /** Canalul, DOAR când exportul îl precizează explicit. Lipsă = necunoscut, nu Total. */
  canal?: Canal;
}

export type Clasa29 = 'FOOD' | 'PAPER' | 'EXCLUS';
export interface RegulaClasificare { pattern: string; clasa: Clasa29; }

export interface Tinta { locatie: string | 'RETEA'; fcCurat: number; }

export interface ImportBatch {
  perioada?: string;        // luna de date atinsă de import (YYYY-MM), pentru mutarea selecției globale
  id: string; tip: string; fisier: string; data: string;
  randuri: number; importate: number;
  avertismente: string[]; erori: string[];
  status: 'IMPORTAT' | 'ESUAT';
}

export type Schimbare =
  | { tip: 'GRAMAJ'; reteta: string; linie: number; cantNoua: number }
  | { tip: 'INGREDIENT'; reteta: string; linie: number; compNoua: string; tipCompNoua: 'INGREDIENT' | 'SEMIPREPARAT' | 'AMBALAJ' }
  | { tip: 'ELIMINA_LINIE'; reteta: string; linie: number }
  | { tip: 'ADAUGA_LINIE'; reteta: string; linieNoua: LinieReteta }
  | { tip: 'PRET_INGREDIENT'; ingredient: string; pretNou: number }
  | { tip: 'FURNIZOR'; ingredient: string; furnizorNou: string; pretNou: number }
  | { tip: 'PRET_VANZARE'; produs: string; canal: 'INSTORE' | 'DELIVERY'; pretNou: number }
  | { tip: 'ELIMINA_PRODUS'; produs: string; redistribuire?: { produs: string; pct: number }[] }
  | { tip: 'COMBO_NOU'; cod: string; denumire: string; categorie?: string; componente: ComboComp[]; pretInstore: number; pretDelivery: number; tva: number; bucInstore: number; bucDelivery: number }
  | { tip: 'PRODUS_NOU'; cod: string; denumire: string; pretInstore: number; pretDelivery: number; tva: number; linii: LinieReteta[]; bucInstore: number; bucDelivery: number };

export interface AjustareMix { produs: string; deltaPct: number; }

export interface Scenariu { id: string; nume: string; creat: string; schimbari: Schimbare[]; mix?: AjustareMix[]; aplicat?: string; }

export interface CostLabor { locatie: string; luna: string; cost: number; }

export type TipRegula = 'FC_MAX_CATEGORIE' | 'MARJA_MIN' | 'PROFIT_MIN_PRODUS' | 'VOLUM_MIN' | 'COST_MAX_INGREDIENT';

export interface RegulaBusiness {
  id: string; tip: TipRegula; nume: string;
  scop?: string;          // categorie / produs / ingredient; gol = se aplică tuturor
  valoare: number; activ: boolean;
}

export interface CostOperare { locatie: string; luna: string; chirie: number; utilitati: number; altele: number; }

export interface Locatie { cod: string; nume: string; }

export interface VariantaRnD {
  id: string; nume: string; creat: string;
  status: 'CIORNA' | 'APROBAT' | 'PUBLICAT';
  cod: string; denumire: string; categorie: string;
  pretInstore: number; pretDelivery: number; tva: number;
  linii: LinieReteta[];
  bucInstore: number; bucDelivery: number;
  nota?: string; publicat?: string;
}

export interface Setari {
  tvaImplicit: number;
  tintaLaborPct?: number;         // ținta de Labor % din vânzări nete (pentru Prime Cost)
  comisionDeliveryPct?: number;   // comisionul agregatorului pe vânzările Delivery (FRYDAY: 16%)
  tolerantaReconciliere: number;  // %
  pragAlertaPret: number;         // %
}

/** Waste raportat per restaurant și lună, la nivel de ingredient (fișier lunar din operațiuni). */
export interface WasteFapt {
  locatie: string; perioada: string;      // AAAA-LL
  ingredient: string; cant: number; um: UMCod;
  motiv?: string;                          // expirat, ars, cădere, retur client…
}

/** Consumul real din inventar (stoc inițial + intrări − stoc final), per ingredient. */
export interface InventarFapt {
  locatie: string; perioada: string;
  ingredient: string; consumReal: number; um: UMCod;
}

export interface Nemapat {
  denumire: string;          // denumirea POS care nu s-a potrivit cu nomenclatorul
  categorie: string;
  cant: number;              // din ultimul import în care a apărut
  valoare: number;           // lei bruti — criteriul de prioritizare
  fisier: string;
}

export interface AppState {
  locatii: Locatie[];
  furnizori: Furnizor[];
  ingrediente: Ingredient[];
  produse: Produs[];
  retete: Reteta[];
  vanzari: VanzareFapt[];
  salesReport: SalesReportRand[];
  linii29: Linie29[];
  materiale29: Material29[];   // 2.9 la nivel de material, când exportul îl conține
  waste: WasteFapt[];
  inventar: InventarFapt[];
  reguli: RegulaClasificare[];
  tinte: Tinta[];
  importuri: ImportBatch[];
  scenarii: Scenariu[];
  pretFurnizori: PretFurnizor[];
  labor: CostLabor[];
  costuriOperare: CostOperare[];
  reguliBusiness: RegulaBusiness[];
  rnd: VariantaRnD[];
  nemapate: Nemapat[];       // denumirile din Sales Mix rămase fără produs — pentru maparea asistată
  setari: Setari;
}
