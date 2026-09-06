// Parser pentru exporturile NBO (Recipes — Menu Items).
// Acceptă două forme:
//   A) tabel plat, cu antetul produsului repetat pe fiecare rând;
//   B) layout de recipe card: antet („Product Name:", „Product ID:"…) urmat de grila de ingrediente,
//      eventual mai multe carduri unul sub altul în aceeași foaie.
import { UMS, norm } from './engine';
import type { UMCod } from './types';

export interface LinieNBO {
  comp: string; denumire: string;
  cant: number; um: UMCod;
  cost: number | null;          // cost unitar declarat de NBO (per UM din rețetă)
  extension: number | null;     // cost total al liniei
}

export interface CardNBO {
  produs: string; denumire: string; categorie: string;
  pretPos: number | null; codPos: string | null;
  materialsCost: number | null;
  linii: LinieNBO[];
}

const parseNr = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[$\s]/g, '').replace(/\u00a0/g, '');
  // format românesc (1.234,56) vs anglo-saxon (1,234.56)
  const ro = /,\d{1,3}$/.test(s) && !/\.\d{1,3}$/.test(s);
  const curat = ro ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = Number(curat.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const UM_NBO: Record<string, UMCod> = {
  ea: 'buc', each: 'buc', buc: 'buc', pcs: 'buc', pc: 'buc', un: 'buc',
  gm: 'g', gr: 'g', g: 'g', gram: 'g', grame: 'g',
  kg: 'kg', kilo: 'kg',
  ml: 'ml', mls: 'ml',
  lt: 'l', l: 'l', litru: 'l', liter: 'l', litre: 'l', ltr: 'l',
  pair: 'buc', pairs: 'buc', pereche: 'buc', perechi: 'buc',
};

export function umNBO(v: unknown): UMCod | null {
  const n = norm(String(v ?? '')).replace(/[^a-z]/g, '');
  return UM_NBO[n] ?? null;
}

// Prețul în UM de bază (lei/kg, lei/l, lei/buc) pornind de la costul NBO exprimat în UM-ul rețetei.
// Extension/Qty are mai multe cifre semnificative decât coloana Cost, deci e sursa preferată.
export function pretBaza(l: LinieNBO): number | null {
  const unitar = l.extension != null && l.cant > 0 ? l.extension / l.cant : l.cost;
  if (unitar == null) return null;
  const f = UMS[l.um]?.f;
  return f && f > 0 ? unitar / f : null;
}

const ETICHETE = {
  denumire: ['product name', 'nume produs', 'denumire produs'],
  produs: ['product id', 'cod produs', 'id produs'],
  pret: ['pos item price', 'pret pos', 'pret vanzare'],
  codPos: ['pos item number', 'numar pos', 'cod pos'],
  categorie: ['category', 'categorie'],
  cost: ['materials cost'],
};

const potriviva = (celula: unknown, variante: string[]) => {
  const n = norm(String(celula ?? '')).replace(/:$/, '').trim();
  return variante.some(v => n === v || n.startsWith(v));
};

// prima valoare nevidă de la dreapta unei etichete
function valoareDupa(rand: unknown[], idx: number): string | null {
  for (let j = idx + 1; j < Math.min(rand.length, idx + 4); j++) {
    const v = String(rand[j] ?? '').trim();
    if (v) return v;
  }
  return null;
}

/** Extrage cardurile dintr-o matrice brută (layout B). */
export function cardsDinMatrice(matrice: unknown[][]): CardNBO[] {
  const carduri: CardNBO[] = [];
  let curent: CardNBO | null = null;
  let coloane: Record<string, number> | null = null;

  const inchide = () => {
    if (curent && curent.linii.length) carduri.push(curent);
    curent = null; coloane = null;
  };

  for (const rand of matrice) {
    if (!Array.isArray(rand)) continue;
    const text = rand.map(c => norm(String(c ?? ''))).join(' ');

    // antet de card nou
    let esteAntet = false;
    for (let i = 0; i < rand.length; i++) {
      if (potriviva(rand[i], ETICHETE.denumire)) {
        const val = valoareDupa(rand, i);
        if (val) {
          inchide();
          curent = { produs: '', denumire: val, categorie: '', pretPos: null, codPos: null, materialsCost: null, linii: [] };
          esteAntet = true;
        }
      }
    }
    if (curent) {
      for (let i = 0; i < rand.length; i++) {
        const val = valoareDupa(rand, i);
        if (!val) continue;
        if (potriviva(rand[i], ETICHETE.produs)) { curent.produs = val; esteAntet = true; }
        else if (potriviva(rand[i], ETICHETE.codPos)) { curent.codPos = val; esteAntet = true; }
        else if (potriviva(rand[i], ETICHETE.categorie)) { curent.categorie = val.replace(/\*+$/, '').trim(); esteAntet = true; }
        else if (potriviva(rand[i], ETICHETE.pret)) { curent.pretPos = parseNr(val); esteAntet = true; }
        else if (potriviva(rand[i], ETICHETE.cost) && !norm(String(rand[i])).includes('%')) { curent.materialsCost = parseNr(val); esteAntet = true; }
      }
    }
    if (esteAntet) continue;

    // antetul grilei de ingrediente
    if (/item id/.test(text) && /(qty|quantity|cantitate)/.test(text)) {
      coloane = {};
      rand.forEach((c, i) => {
        const n = norm(String(c ?? ''));
        if (n.includes('item id') || n === 'cod') coloane!.comp = i;
        else if (n.includes('item name') || n.includes('materie')) coloane!.denumire = i;
        else if (n.includes('qty') || n.includes('cantitate')) coloane!.cant = i;
        else if (n.includes('unit') || n === 'um') coloane!.um = i;
        else if (n.includes('extension') || n.includes('cost ron')) coloane!.ext = i;
        else if (n.includes('cost')) coloane!.cost = i;
      });
      continue;
    }

    // linie de ingredient
    if (curent && coloane && coloane.comp != null) {
      const comp = String(rand[coloane.comp] ?? '').trim();
      const cant = parseNr(rand[coloane.cant ?? -1]);
      const um = umNBO(rand[coloane.um ?? -1]);
      if (!comp || cant == null || !um) continue;
      if (/^(total|subtotal)/i.test(comp)) continue;
      curent.linii.push({
        comp, denumire: String(rand[coloane.denumire ?? -1] ?? '').trim() || comp,
        cant, um,
        cost: parseNr(rand[coloane.cost ?? -1]),
        extension: parseNr(rand[coloane.ext ?? -1]),
      });
    }
  }
  inchide();
  return carduri;
}

/** Grupează un tabel plat în carduri (layout A). */
export function cardsDinTabel(randuri: Record<string, unknown>[], map: Record<string, string>): CardNBO[] {
  const g = (r: Record<string, unknown>, camp: string) => (map[camp] ? r[map[camp]] : undefined);
  const carduri = new Map<string, CardNBO>();
  for (const r of randuri) {
    const comp = String(g(r, 'comp') ?? '').trim();
    const cant = parseNr(g(r, 'cant'));
    const um = umNBO(g(r, 'um'));
    if (!comp || cant == null || !um) continue;
    const cod = String(g(r, 'produs') ?? '').trim();
    const den = String(g(r, 'denumireProdus') ?? '').trim();
    const cheie = cod || den;
    if (!cheie) continue;
    let c = carduri.get(cheie);
    if (!c) {
      c = {
        produs: cod || den, denumire: den || cod,
        categorie: String(g(r, 'categorie') ?? '').replace(/\*+$/, '').trim(),
        pretPos: parseNr(g(r, 'pretPos')),
        codPos: String(g(r, 'codPos') ?? '').trim() || null,
        materialsCost: null, linii: [],
      };
      carduri.set(cheie, c);
    }
    c.linii.push({
      comp, denumire: String(g(r, 'denumireComp') ?? '').trim() || comp,
      cant, um, cost: parseNr(g(r, 'cost')), extension: parseNr(g(r, 'extension')),
    });
  }
  return [...carduri.values()];
}

const CUVINTE_AMBALAJ = ['hartie', 'cutie', 'punga', 'pungi', 'ambalaj', 'folie', 'pahar', 'capac',
  'tacam', 'servet', 'caserola', 'box', 'bag', 'wrap', 'cup', 'lid', 'napkin', 'tava'];

export function esteAmbalaj(denumire: string): boolean {
  const n = norm(denumire);
  return CUVINTE_AMBALAJ.some(c => n.includes(c));
}
