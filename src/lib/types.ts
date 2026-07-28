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

export interface WasteFapt {
  data: string;                 // YYYY-MM-DD
  locatie: string;
  ingredient: string;           // cod ingredient
  cant: number;                 // cantitate risipită (în UM indicată)
  um: UMCod;
  motiv?: string;               // ex: expirat, deteriorat, supraproducție
  valoare?: number;             // cost estimat (lei) — calculat din ultimul preț dacă lipsește
}

export type Clasa29 = 'FOOD' | 'PAPER' | 'EXCLUS';
export interface RegulaClasificare { pattern: string; clasa: Clasa29; }

export interface Tinta { locatie: string | 'RETEA'; fcCurat: number; }

export interface ImportBatch {
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
  tolerantaReconciliere: number;  // %
  pragAlertaPret: number;         // %
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
  waste: WasteFapt[];
  reguli: RegulaClasificare[];
  tinte: Tinta[];
  importuri: ImportBatch[];
  scenarii: Scenariu[];
  pretFurnizori: PretFurnizor[];
  labor: CostLabor[];
  costuriOperare: CostOperare[];
  reguliBusiness: RegulaBusiness[];
  rnd: VariantaRnD[];
  setari: Setari;
}
