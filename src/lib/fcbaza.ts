// Parser pentru fișierul de bază FRYDAY FC (nomenclator + rețetar + food cost).
// Structura reală, așa cum vine din Excel:
//  · NOMENCLATOR — antet pe rândul 4: Cod MP | Denumire | UM | Cost / UM | Cost NOU / UM
//  · RETETAR     — blocuri: rând cu numele rețetei (col A) și categoria (col F), apoi antetul
//                  COD | INGREDIENT | QTY | UM | COST/UM | COST | COST/UM NOU | COST NOU,
//                  liniile de ingrediente, iar la final un rând de total care repetă numele rețetei
//  · FOOD COST   — antet pe rândul 4: Denumire comercială | Rețetă | Categorie | Canal |
//                  Tip TVA | TVA % | MC actual | MC NOU | Preț cu TVA | …
import { norm } from './engine';
import { umNBO } from './nbo';
import type { UMCod } from './types';

export interface IngredientFC { cod: string; denumire: string; um: UMCod | null; cost: number | null; costNou: number | null; }
export interface LinieFC { cod: string; denumire: string; qty: number; um: UMCod; costUM: number | null; costUMNou: number | null; }
export interface RetetaFC { nume: string; categorie: string; linii: LinieFC[]; totalActual: number | null; totalNou: number | null; }
export interface ProdusFC {
  denumire: string; reteta: string; categorie: string;
  canal: 'INSTORE' | 'DELIVERY'; tva: number;
  mcActual: number | null; mcNou: number | null; pretCuTva: number | null;
}
export interface BazaFC {
  ingrediente: IngredientFC[];
  retete: RetetaFC[];
  produse: ProdusFC[];
  avertismente: string[];
}

const val = (v: unknown) => String(v ?? '').trim();

const nr = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = val(v).replace(/[$\s\u00a0]/g, '');
  if (!s || !/[0-9]/.test(s)) return null;
  const ro = /,\d{1,3}$/.test(s) && !/\.\d{1,3}$/.test(s);
  const c = ro ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = Number(c.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Găsește rândul de antet care conține toate etichetele cerute. */
function randAntet(m: unknown[][], cerute: string[]): number {
  for (let i = 0; i < Math.min(m.length, 30); i++) {
    const t = (m[i] ?? []).map(c => norm(val(c))).join(' | ');
    if (cerute.every(c => t.includes(c))) return i;
  }
  return -1;
}

// potrivirea exactă are prioritate: „COST" nu trebuie confundat cu „COST/UM"
function coloana(rand: unknown[], variante: string[]): number {
  const nume = rand.map(c => norm(val(c)));
  for (const v of variante) {
    const i = nume.indexOf(v);
    if (i >= 0) return i;
  }
  for (const v of variante) {
    const i = nume.findIndex(n => n.startsWith(v) && n !== '');
    if (i >= 0) return i;
  }
  return -1;
}

function parseNomenclator(m: unknown[][], av: string[]): IngredientFC[] {
  const h = randAntet(m, ['cod', 'denumire', 'um']);
  if (h < 0) { av.push('NOMENCLATOR: antetul nu a fost găsit'); return []; }
  const a = m[h];
  const cCod = coloana(a, ['cod mp', 'cod']);
  const cDen = coloana(a, ['denumire materie prima', 'denumire']);
  const cUm = coloana(a, ['um']);
  const cCost = coloana(a, ['cost / um', 'cost/um', 'cost um', 'cost']);
  const cNou = coloana(a, ['cost nou / um', 'cost nou/um', 'cost nou']);
  const rez: IngredientFC[] = [];
  for (let i = h + 1; i < m.length; i++) {
    const cod = val(m[i]?.[cCod]);
    if (!cod || norm(cod) === 'cod mp') continue;
    rez.push({
      cod, denumire: val(m[i]?.[cDen]) || cod,
      um: umNBO(m[i]?.[cUm]),
      cost: cCost >= 0 ? nr(m[i]?.[cCost]) : null,
      costNou: cNou >= 0 ? nr(m[i]?.[cNou]) : null,
    });
  }
  return rez;
}

function parseRetetar(m: unknown[][], av: string[]): RetetaFC[] {
  const rez: RetetaFC[] = [];
  let curent: RetetaFC | null = null;
  let col: { cod: number; den: number; qty: number; um: number; costUM: number; costUMNou: number; total: number; totalNou: number } | null = null;

  for (let i = 0; i < m.length; i++) {
    const rand = m[i] ?? [];
    const a0 = val(rand[0]);
    const esteAntetBloc = norm(a0) === 'cod' && norm(val(rand[1])).startsWith('ingredient');

    if (esteAntetBloc) {
      col = {
        cod: 0, den: 1,
        qty: coloana(rand, ['qty', 'cantitate']),
        um: coloana(rand, ['um']),
        costUM: coloana(rand, ['cost um', 'cost/um']),
        costUMNou: coloana(rand, ['cost um nou', 'cost/um nou']),
        total: coloana(rand, ['cost']),
        totalNou: coloana(rand, ['cost nou']),
      };
      continue;
    }
    // rândul de total repetă numele rețetei și nu are cod de ingredient sub el
    if (curent && a0 && norm(a0) === norm(curent.nume) && !val(rand[2])) {
      curent.totalActual = col ? nr(rand[col.total]) : null;
      curent.totalNou = col && col.totalNou >= 0 ? nr(rand[col.totalNou]) : null;
      if (curent.linii.length) rez.push(curent);
      curent = null; col = null;
      continue;
    }
    // rând de ingredient
    if (curent && col && a0 && !isNaN(Number(a0.replace(/\D/g, '')) ) && val(rand[1])) {
      const qty = nr(rand[col.qty]);
      const um = umNBO(rand[col.um]);
      if (qty != null && um) {
        curent.linii.push({
          cod: a0, denumire: val(rand[1]), qty, um,
          costUM: col.costUM >= 0 ? nr(rand[col.costUM]) : null,
          costUMNou: col.costUMNou >= 0 ? nr(rand[col.costUMNou]) : null,
        });
        continue;
      }
    }
    // început de bloc nou: nume de rețetă în col A, categorie în col F
    if (a0 && !val(rand[2]) && norm(a0) !== 'cod') {
      if (curent && curent.linii.length) rez.push(curent);   // bloc fără rând de total
      curent = { nume: a0, categorie: val(rand[5]), linii: [], totalActual: null, totalNou: null };
    }
  }
  if (curent && curent.linii.length) rez.push(curent);
  if (!rez.length) av.push('RETETAR: nicio rețetă recognoscibilă');
  return rez;
}

function parseFoodCost(m: unknown[][], av: string[]): ProdusFC[] {
  const h = randAntet(m, ['denumire comerciala', 'canal']);
  if (h < 0) { av.push('FOOD COST: antetul nu a fost găsit'); return []; }
  const a = m[h];
  const c = {
    den: coloana(a, ['denumire comerciala', 'denumire']),
    ret: coloana(a, ['reteta']),
    cat: coloana(a, ['categorie']),
    canal: coloana(a, ['canal']),
    tva: coloana(a, ['tva %', 'tva']),
    mc: coloana(a, ['mc actual']),
    mcNou: coloana(a, ['mc nou']),
    pret: coloana(a, ['pret cu tva']),
  };
  const rez: ProdusFC[] = [];
  for (let i = h + 1; i < m.length; i++) {
    const den = val(m[i]?.[c.den]);
    if (!den || norm(den) === 'denumire comerciala') continue;
    const canalBrut = norm(val(m[i]?.[c.canal]));
    if (!canalBrut) continue;
    let tva = c.tva >= 0 ? nr(m[i]?.[c.tva]) : null;
    if (tva != null && tva > 0 && tva < 1) tva = tva * 100;      // 0,11 → 11%
    rez.push({
      denumire: den,
      reteta: val(m[i]?.[c.ret]),
      categorie: val(m[i]?.[c.cat]) || 'Fără categorie',
      canal: /deliv|livrare/.test(canalBrut) ? 'DELIVERY' : 'INSTORE',
      tva: tva ?? 11,
      mcActual: c.mc >= 0 ? nr(m[i]?.[c.mc]) : null,
      mcNou: c.mcNou >= 0 ? nr(m[i]?.[c.mcNou]) : null,
      pretCuTva: c.pret >= 0 ? nr(m[i]?.[c.pret]) : null,
    });
  }
  return rez;
}

export function parseBazaFC(foi: Record<string, unknown[][]>): BazaFC {
  const avertismente: string[] = [];
  const gaseste = (cheie: string) => {
    const n = Object.keys(foi).find(k => norm(k).includes(cheie));
    return n ? foi[n] : null;
  };
  const nomen = gaseste('nomenclator');
  const retetar = gaseste('retetar');
  const fc = gaseste('food cost');
  return {
    ingrediente: nomen ? parseNomenclator(nomen, avertismente) : [],
    retete: retetar ? parseRetetar(retetar, avertismente) : [],
    produse: fc ? parseFoodCost(fc, avertismente) : [],
    avertismente,
  };
}

/** Numele comercial fără sufixul de canal, pentru gruparea celor două rânduri (Instore / Delivery). */
export function numeBazaComercial(s: string): string {
  return s.replace(/\s+(D|MD|M\s*D)$/i, '').replace(/\s+/g, ' ').trim();
}
