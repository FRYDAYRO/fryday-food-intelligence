import * as XLSX from 'xlsx';
import type { AppState, Canal, Fereastra29, ImportBatch, Ingredient, InventarFapt, Linie29, LinieReteta, Material29, Nemapat, Produs, Reteta, Sursa29, UMCod, VanzareFapt, WasteFapt } from './types';
import { clasificaCategorie29 } from './fc-clasificare';
import { UMS, buildCtx, consumuriLuna, costProdus, norm, pretCurent } from './engine';
import { cardsDinMatrice, cardsDinTabel, esteAmbalaj, pretBaza, umNBO } from './nbo';
import { cheieDenumire, parseSalesMix } from './salesmix';
import { analizeaza47 } from './adaptor-47';
import { LOCATIE_RETEA } from './fc-domeniu';
import { cheieFereastra, fereastraDin, fereastraRand } from './surse-29';
import { identificaIngredient } from './fc-material';
import { numeBazaComercial, parseBazaFC, type LinieFC, type ProdusFC } from './fcbaza';

export type TipImport = 'MENIURI' | 'WASTE' | 'INVENTAR' | 'FC_BAZA' | 'PMIX' | 'SALES_MIX' | 'SALES' | 'FC29' | 'FC29_MATERIAL' | 'COST_INGREDIENTE' | 'RETETAR' | 'RETETAR_NBO' | 'PRETURI_PRODUSE' | 'PRETURI_FURNIZORI';

export const TIP_LABEL: Record<TipImport, string> = {
  PMIX: 'PMIX (vânzări pe produs)',
  SALES: 'Sales Report NBO',
  FC29: 'Raport NBO 2.9',
  FC29_MATERIAL: 'Raport NBO 2.9 pe material (detaliu de consum)',
  COST_INGREDIENTE: 'Cost ingrediente',
  RETETAR: 'Rețetar',
  MENIURI: 'Meniuri / combo (componente și cantități)',
  WASTE: 'Waste (pierderi pe ingredient)',
  INVENTAR: 'Inventar (consum real pe ingredient)',
  FC_BAZA: 'Bază FC completă (nomenclator + rețetar + food cost)',
  SALES_MIX: 'Sales Mix 4.7 (raport POS)',
  RETETAR_NBO: 'Rețetar NBO (recipe cards)',
  PRETURI_PRODUSE: 'Prețuri de vânzare (InStore / Delivery)',
  PRETURI_FURNIZORI: 'Prețuri Furnizori',
};

// sinonime de antet (normalizate) → câmp intern
const CAMPURI: Record<TipImport, Record<string, string[]>> = {
  PMIX: {
    data: ['data', 'date', 'zi', 'ziua'],
    locatie: ['locatie', 'location', 'restaurant', 'cod locatie', 'unitate', 'magazin'],
    canal: ['canal', 'channel', 'tip vanzare', 'sursa'],
    produs: ['cod produs', 'cod', 'plu', 'product code', 'articol', 'cod articol'],
    denumire: ['denumire', 'denumire produs', 'produs', 'product', 'nume'],
    cant: ['cantitate', 'buc', 'bucati', 'qty', 'quantity', 'cant'],
    brut: ['valoare bruta', 'valoare', 'vanzari brute', 'gross', 'total brut', 'suma'],
    discount: ['discount', 'reducere', 'reduceri'],
    net: ['valoare neta', 'net', 'vanzari nete', 'total net'],
  },
  SALES: {
    data: ['data', 'date', 'zi'],
    locatie: ['locatie', 'location', 'restaurant', 'cod locatie', 'unitate'],
    canal: ['canal', 'channel'],
    brut: ['vanzari brute', 'valoare bruta', 'gross', 'brut'],
    net: ['vanzari nete', 'valoare neta', 'net'],
    bonuri: ['bonuri', 'nr bonuri', 'tranzactii', 'tickets', 'nr tranzactii'],
  },
  FC29: {
    perioada: ['perioada', 'luna', 'month', 'data'],
    locatie: ['locatie', 'location', 'restaurant', 'cod locatie', 'unitate'],
    categorie: ['categorie', 'categorie cheltuiala', 'cont', 'denumire', 'articol', 'grupa'],
    valoare: ['valoare', 'suma', 'cost', 'consum', 'total'],
  },
  FC29_MATERIAL: {
    perioada: ['perioada', 'luna', 'month'],
    locatie: ['locatie', 'location', 'restaurant', 'cod locatie', 'unitate', 'magazin', 'store'],
    material: ['cod material', 'cod mp', 'material', 'item id', 'cod articol', 'item code', 'cod', 'sku'],
    denumire: ['denumire material', 'denumire', 'item name', 'materie prima', 'descriere', 'nume'],
    categorie: ['categorie', 'grupa', 'category', 'familie'],
    cant: ['cantitate', 'cant', 'qty', 'quantity'],
    um: ['um', 'unitate', 'u.m.', 'unit', 'uom'],
    costActual: ['cost actual', 'consum real', 'valoare consum', 'actual', 'consum'],
    costTeoretic: ['cost teoretic', 'valoare teoretica', 'teoretic', 'theoretical', 'ideal'],
    normalizat: ['normalizat', 'normalized', 'material normalizat'],
    canal: ['canal', 'channel', 'canal vanzare'],
  },
  COST_INGREDIENTE: {
    cod: ['cod ingredient', 'cod', 'cod articol', 'cod material', 'cod materie prima', 'cod nbo',
      'item id', 'item code', 'material', 'sku', 'id', 'nr articol', 'cod intern', 'cod produs'],
    denumire: ['denumire', 'ingredient', 'nume', 'denumire ingredient', 'item name', 'materie prima',
      'denumire articol', 'descriere', 'denumire materie prima'],
    categorie: ['categorie', 'grupa', 'grupa articol', 'familie', 'category'],
    tip: ['tip', 'fel', 'type'],
    um: ['um', 'um baza', 'unitate', 'unitate masura', 'u.m.', 'units', 'unit', 'uom'],
    pret: ['pret', 'pret net', 'pret unitar', 'cost', 'pret/um', 'cost unitar', 'price',
      'pret achizitie', 'pret lista', 'valoare unitara'],
    validDeLa: ['valabil de la', 'de la', 'data', 'valabilitate'],
    furnizor: ['furnizor', 'supplier'],
  },
  RETETAR_NBO: {
    produs: ['product id', 'cod produs', 'product code', 'id produs'],
    denumireProdus: ['product name', 'denumire produs', 'nume produs'],
    categorie: ['category', 'categorie'],
    pretPos: ['pos item price', 'pret pos', 'pret vanzare', 'price'],
    codPos: ['pos item number', 'numar pos', 'cod pos'],
    comp: ['item id', 'cod ingredient', 'cod componenta', 'ingredient id'],
    denumireComp: ['item name', 'denumire ingredient', 'materie prima', 'nume ingredient'],
    cant: ['qty', 'quantity', 'cantitate', 'cant'],
    um: ['units', 'unit', 'um', 'unitate'],
    cost: ['cost', 'cost unitar', 'pret unitar'],
    extension: ['extension', 'ext', 'cost ron', 'valoare'],
  },
  MENIURI: {
    meniu: ['meniu', 'combo', 'produs meniu', 'denumire meniu', 'cod meniu'],
    componenta: ['componenta', 'component', 'produs', 'articol', 'cod produs'],
    cant: ['cantitate', 'cant', 'qty', 'buc'],
    pret: ['pret', 'pret cu tva', 'price'],
    tva: ['tva', 'tva %'],
    categorie: ['categorie', 'category'],
  },
  WASTE: {
    ingredient: ['ingredient', 'cod', 'cod mp', 'materie prima', 'cod ingredient'],
    cant: ['cantitate', 'cant', 'qty', 'pierdere', 'waste'],
    um: ['um', 'unitate'],
    locatie: ['locatie', 'restaurant', 'magazin', 'store'],
    perioada: ['perioada', 'luna', 'month'],
    motiv: ['motiv', 'cauza', 'reason'],
  },
  INVENTAR: {
    ingredient: ['ingredient', 'cod', 'cod mp', 'materie prima', 'cod ingredient'],
    cant: ['consum real', 'consum', 'cantitate', 'cant'],
    um: ['um', 'unitate'],
    locatie: ['locatie', 'restaurant', 'magazin', 'store'],
    perioada: ['perioada', 'luna', 'month'],
  },
  FC_BAZA: { denumire: ['denumire comerciala'], reteta: ['reteta'], canal: ['canal'] },
  SALES_MIX: {
    denumire: ['menu item name', 'denumire', 'produs', 'item name'],
    cant: ['qty', 'quantity', 'cantitate'],
    pret: ['price', 'pret'],
    valoare: ['extension', 'valoare', 'ext'],
  },
  PRETURI_PRODUSE: {
    produs: ['cod produs', 'cod', 'plu', 'product id', 'pos item number', 'cod articol', 'item id', 'sku'],
    denumire: ['denumire', 'denumire produs', 'produs', 'product name', 'nume', 'item name'],
    canal: ['canal', 'channel', 'tip vanzare', 'mediu'],
    pretInstore: ['pret instore', 'instore', 'in store', 'pret sala', 'pret restaurant', 'pret local', 'dine in'],
    pretDelivery: ['pret delivery', 'delivery', 'pret livrare', 'livrare', 'takeaway', 'pret takeaway'],
    pret: ['pret nou dupa discount', 'pret nou', 'pret cu tva', 'pret vanzare', 'pret pos',
      'pos item price', 'price', 'pret brut', 'pret meniu', 'tarif', 'pret'],
    validDeLa: ['valabil de la', 'de la', 'data', 'valabilitate'],
  },
  PRETURI_FURNIZORI: {
    furnizor: ['furnizor', 'supplier', 'nume furnizor', 'cod furnizor'],
    ing: ['cod ingredient', 'cod', 'ingredient', 'cod articol'],
    pret: ['pret', 'pret oferta', 'pret net', 'pret unitar', 'oferta'],
    validDeLa: ['valabil de la', 'de la', 'data', 'valabilitate'],
  },
  RETETAR: {
    reteta: ['cod reteta', 'cod produs', 'reteta', 'cod'],
    tipReteta: ['tip reteta', 'tip'],
    denumire: ['denumire reteta', 'denumire', 'nume'],
    comp: ['cod componenta', 'componenta', 'cod ingredient', 'ingredient'],
    tipComp: ['tip componenta', 'tip comp'],
    cant: ['cantitate', 'cant', 'gramaj', 'qty'],
    um: ['um', 'unitate', 'u.m.'],
    pierdere: ['pierdere', 'pierdere %', 'pierdere pct'],
    canal: ['canal'],
    randCant: ['randament', 'randament cantitate'],
    randUm: ['randament um'],
  },
};

export interface Parsat {
  antete: string[];
  randuri: Record<string, unknown>[];
  foaie: string;
  matrice?: unknown[][];      // rândurile brute, necesare pentru layouturile cu antet + grilă (NBO)
  foi?: Record<string, unknown[][]>;   // toate foile, pentru fișierele care se citesc integral (baza FC)
}

export async function citesteFisier(file: File): Promise<Parsat> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const foaie = wb.SheetNames[0];
  const ws = wb.Sheets[foaie];
  const randuri = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  const antete = randuri.length ? Object.keys(randuri[0]) : [];
  const matrice = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
  const foi: Record<string, unknown[][]> = {};
  for (const n of wb.SheetNames) foi[n] = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1, defval: '' });
  return { antete, randuri, foaie, matrice, foi };
}

/**
 * Potrivirea antetului cu un sinonim. Substring-ul simplu produce false pozitive
 * („Suma" ar conține „um", „Discount" ar conține „cont"), deci se cere fie egalitate,
 * fie potrivire pe cuvinte întregi.
 */
function potrivesteAntet(antet: string, sinonim: string): number {
  const n = norm(antet);
  const s = norm(sinonim);
  if (!n || !s) return 0;
  if (n === s) return 3;                                  // potrivire exactă
  const cuvinte = n.split(/[^a-z0-9]+/).filter(Boolean);
  const cuvinteS = s.split(/[^a-z0-9]+/).filter(Boolean);
  if (cuvinteS.every(w => cuvinte.includes(w))) return 2;  // toate cuvintele sinonimului apar ca cuvinte
  // substring permis doar pentru sinonime lungi, unde coincidența e improbabilă
  if (s.length >= 5 && n.includes(s)) return 1;
  return 0;
}

export function mapeazaAntete(antete: string[], tip: TipImport): Record<string, string> {
  const map: Record<string, string> = {};
  const folosite = new Set<string>();
  // câmpurile se atribuie în ordinea calității potrivirii, ca o coloană să nu fie „furată"
  const candidati: { camp: string; antet: string; scor: number }[] = [];
  for (const [camp, sinonime] of Object.entries(CAMPURI[tip])) {
    for (const a of antete) {
      const scor = Math.max(...sinonime.map(s => potrivesteAntet(a, s)));
      if (scor > 0) candidati.push({ camp, antet: a, scor });
    }
  }
  candidati.sort((x, y) => y.scor - x.scor);
  for (const c of candidati) {
    if (map[c.camp] || folosite.has(c.antet)) continue;
    map[c.camp] = c.antet;
    folosite.add(c.antet);
  }
  return map;
}

export function detecteazaTip(antete: string[], numeFisier: string): TipImport {
  const nf = norm(numeFisier);
  if (nf.includes('2.9') || nf.includes('29')) {
    // varianta pe material cere semnalul strict al familiei: „29" poate fi o zi dintr-o dată
    // („inventar 29.06"), iar un inventar importat drept 2.9 ar transforma cantități în lei.
    // Fără semnalul strict rămâne comportamentul vechi (FC29 pe categorie).
    if (/2\.9|2 9|nbo 29/.test(nf)) {
      const m29 = mapeazaAntete(antete, 'FC29_MATERIAL');
      if (m29.material !== undefined && m29.denumire !== undefined && m29.costActual !== undefined) return 'FC29_MATERIAL';
    }
    return 'FC29';
  }
  if (nf.includes('pmix')) return 'PMIX';
  if (nf.includes('sales')) return 'SALES';
  if (nf.includes('furnizor') || nf.includes('supplier') || nf.includes('ofert')) return 'PRETURI_FURNIZORI';
  if (/meniu|combo/.test(nf) && !/sales|pmix/.test(nf)) return 'MENIURI';
  if (/waste|pierder|risipa/.test(nf)) return 'WASTE';
  if (/inventar|stoc|consum real/.test(nf)) return 'INVENTAR';
  if (nf.includes('sales mix') || nf.includes('4 7') || nf.includes('4.7')) return 'SALES_MIX';
  if ((nf.includes('pret') || nf.includes('price')) && (nf.includes('instore') || nf.includes('delivery') || nf.includes('vanzare') || nf.includes('meniu'))) return 'PRETURI_PRODUSE';
  if (nf.includes('nbo') || nf.includes('recipe')) return 'RETETAR_NBO';
  if (nf.includes('retet')) return 'RETETAR';
  if (nf.includes('ingredient') || nf.includes('cost')) return 'COST_INGREDIENTE';
  const cerute: Record<TipImport, string[]> = {
    PMIX: ['data', 'produs', 'cant'],
    SALES: ['data', 'locatie', 'net'],
    FC29: ['perioada', 'categorie', 'valoare'],
    FC29_MATERIAL: ['material', 'denumire', 'costActual'],
    COST_INGREDIENTE: ['cod', 'pret'],
    RETETAR: ['reteta', 'comp', 'cant'],
    RETETAR_NBO: ['comp', 'cant', 'um'],
    MENIURI: ['meniu', 'componenta'],
    WASTE: ['ingredient', 'cant'],
    INVENTAR: ['ingredient', 'cant'],
    FC_BAZA: ['denumire', 'canal'],
    SALES_MIX: ['denumire', 'cant'],
    PRETURI_PRODUSE: ['produs'],
    PRETURI_FURNIZORI: ['furnizor', 'ing', 'pret'],
  };
  // FC29_MATERIAL nu concurează fără semnalul „2.9" din numele fișierului: vocabularul lui
  // („consum real", „cod", „denumire") se suprapune cu al inventarului, iar un inventar
  // importat drept 2.9 ar transforma CANTITĂȚI în lei — corupere tăcută de date.
  const scoruri = (Object.keys(CAMPURI) as TipImport[]).filter(t => t !== 'FC29_MATERIAL').map(t => {
    const m = mapeazaAntete(antete, t);
    const c = cerute[t];
    return { t, scor: c.filter(x => m[x] !== undefined).length / c.length + Object.keys(m).length * 0.01 };
  });
  scoruri.sort((a, b) => b.scor - a.scor);
  return scoruri[0].t;
}

export function parseNumar(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  let s = String(v).trim().replace(/\s|lei|ron/gi, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseData(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  if (typeof v === 'number' && v > 20000 && v < 60000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return parseData(d);
  }
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

export function parsePerioada(v: unknown): string | null {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  m = s.match(/^(\d{1,2})[./-](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  const d = parseData(v);
  return d ? d.slice(0, 7) : null;
}

export function detecteazaCanal(v: unknown, numeFisier: string): Canal | null {
  const s = norm(String(v ?? ''));
  const nf = norm(numeFisier);
  const e = (t: string) => s.includes(t) || (!s && nf.includes(t));
  if (e('deliv') || e('dlv') || e('livrare')) return 'DELIVERY';
  if (e('instore') || e('in store') || e('local') || e('restaurant') || e('sala')) return 'INSTORE';
  return null;
}

const idBatch = () => `B${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

/**
 * Versiunea activă a unei rețete = cea în vigoare AZI, adică versiunea cu cea mai recentă
 * dată (la egalitate, numărul mai mare). Un import retroactiv adaugă istoric, dar NU preia
 * rolul de versiune curentă — altfel rețeta de azi ar fi rescrisă de un fișier vechi.
 */
function activaDupaData(r: Reteta): number {
  return r.versiuni.reduce((a, b) => (b.data > a.data || (b.data === a.data && b.nr > a.nr) ? b : a), r.versiuni[0]).nr;
}

export interface RezultatImport {
  stateNou: AppState;
  batch: ImportBatch;
  /** Identitățile din raport rămase fără produs în ACEASTĂ rulare (coduri la PMIX, denumiri la 4.7). */
  necunoscute?: string[];
}

/**
 * Se rezolvă acum această identitate din raport la un produs? Aceeași regulă ca la import:
 * pe coduri (PMIX) — codul intern, numărul POS sau un alias, exact; pe denumiri (4.7 Sales
 * Mix) — denumirea produsului sau un alias, pe cheia de potrivire a denumirilor.
 */
export function identitateSeRezolva(
  nomenclator: { produse: Produs[]; ingrediente: Ingredient[] }, identitate: string, tip: 'PMIX' | 'SALES_MIX' | 'FC29_MATERIAL',
): boolean {
  if (tip === 'FC29_MATERIAL') return identificaIngredient(nomenclator.ingrediente, identitate, identitate) !== null;
  const { produse } = nomenclator;
  if (tip === 'PMIX') {
    return produse.some(p => p.cod === identitate || p.codPos === identitate || (p.aliasuri ?? []).includes(identitate));
  }
  const k = cheieDenumire(identitate);
  return produse.some(p => cheieDenumire(p.denumire) === k || (p.aliasuri ?? []).some(a => cheieDenumire(a) === k));
}

const fmtNr = (n: number) => n.toLocaleString('ro-RO');

/**
 * Adaugă un preț datat în istoricul unui ingredient. Aceeași dată → înlocuire, nu dublare.
 * Dacă data e anterioară ultimului preț existent, prețul NOU nu devine cel curent — se
 * avertizează explicit, altfel corecția pare aplicată deși cifrele nu se schimbă.
 */
function adaugaPretDatat(
  preturi: { validDeLa: string; pret: number }[], data: string, pret: number,
  denumire: string, avert: string[],
): { validDeLa: string; pret: number }[] {
  const rez = [...preturi.filter(x => x.validDeLa !== data), { validDeLa: data, pret }]
    .sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
  const ultima = preturi.length ? preturi[preturi.length - 1].validDeLa : null;
  if (ultima && data < ultima) {
    avert.push(`${denumire}: prețul introdus e valabil de la ${data}, dar există deja un preț mai recent (${ultima}) care rămâne cel curent. `
      + 'Dacă vrei ca noul preț să fie cel de azi, importă fără dată sau cu o dată ulterioară.');
  }
  return rez;
}

export interface SchimbarePret { cod: string; denumire: string; um: string; vechi: number | null; nou: number; }

/**
 * Raportul de schimbări la reîncărcarea periodică a rețetarelor: ce preț s-a mișcat, cu cât,
 * și ce produse se scumpesc — inclusiv cele care NU erau în fișierul importat, dar folosesc
 * ingredientul respectiv. Fără asta, o scumpire la un ingredient comun trece neobservată.
 */
function raporteazaSchimbari(
  veche: AppState, noua: AppState, preturi: SchimbarePret[],
  coduriDinFisier: Set<string>, avert: string[], dataRef: string,
): void {
  const prag = noua.setari.pragAlertaPret;
  const noi = preturi.filter(p => p.vechi == null);
  const mutate = preturi.filter(p => p.vechi != null && Math.abs(p.nou - p.vechi) > 0.0005);

  if (noi.length) avert.push(`${noi.length} ingrediente noi adăugate în nomenclator`);
  if (!mutate.length) {
    avert.push('Nicio schimbare de preț: costurile din fișier coincid cu nomenclatorul existent');
    return;
  }

  // consumul lunar, ca schimbările să fie ordonate după impactul în lei, nu după procent
  const luni = [...new Set(noua.vanzari.map(v => v.data.slice(0, 7)))].sort();
  const luna = luni[luni.length - 1];
  const ctxV = buildCtx(veche), ctxN = buildCtx(noua);
  const cons = luna ? consumuriLuna(noua, ctxN, luna) : new Map<string, { cant: number }>();

  const cuImpact = mutate.map(p => {
    const cant = cons.get(p.cod)?.cant ?? 0;
    return { ...p, varPct: ((p.nou - p.vechi!) / p.vechi!) * 100, impact: (p.nou - p.vechi!) * cant, cant };
  }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact) || Math.abs(b.varPct) - Math.abs(a.varPct));

  const pesteP = cuImpact.filter(p => Math.abs(p.varPct) >= prag);
  avert.push(`PREȚURI MODIFICATE: ${mutate.length} ingrediente și-au schimbat costul${pesteP.length ? `, dintre care ${pesteP.length} peste pragul de ${prag}%` : ''}`);
  for (const p of cuImpact.slice(0, 20)) {
    const semn = p.varPct > 0 ? '+' : '';
    avert.push(`  ${Math.abs(p.varPct) >= prag ? '⚠ ' : ''}${p.denumire}: ${p.vechi!.toFixed(4)} → ${p.nou.toFixed(4)} lei/${p.um} (${semn}${p.varPct.toFixed(1)}%)`
      + (p.cant > 0 ? ` · consum ${fmtNr(Math.round(p.cant))} ${p.um}/lună → ${semn}${fmtNr(Math.round(p.impact))} lei/lună` : ''));
  }
  if (cuImpact.length > 20) avert.push(`  … și alte ${cuImpact.length - 20} ingrediente`);
  const totalImpact = cuImpact.reduce((s, p) => s + p.impact, 0);
  if (Math.abs(totalImpact) > 1) {
    avert.push(`  Efect total pe consumul lunii ${luna}: ${totalImpact > 0 ? '+' : ''}${fmtNr(Math.round(totalImpact))} lei/lună (${totalImpact > 0 ? '+' : ''}${fmtNr(Math.round(totalImpact * 12))} lei/an)`);
  }

  // ——— produsele afectate, separat cele care nu erau în fișier
  const afectate: { cod: string; denumire: string; v: number; n: number; inFisier: boolean }[] = [];
  for (const pr of noua.produse) {
    const a = costProdus(pr.cod, 'INSTORE', ctxV, dataRef)?.total;
    const b = costProdus(pr.cod, 'INSTORE', ctxN, dataRef)?.total;
    if (a == null || b == null || Math.abs(a - b) < 0.0005) continue;
    afectate.push({ cod: pr.cod, denumire: pr.denumire, v: a, n: b, inFisier: coduriDinFisier.has(pr.cod) });
  }
  afectate.sort((x, y) => Math.abs(y.n - y.v) - Math.abs(x.n - x.v));
  const dinAfara = afectate.filter(x => !x.inFisier);
  if (afectate.length) {
    avert.push(`COSTURI RECALCULATE: ${afectate.length} produse își schimbă costul${dinAfara.length ? `, dintre care ${dinAfara.length} NU erau în fișierul importat` : ''}`);
    for (const x of afectate.slice(0, 15)) {
      avert.push(`  ${x.denumire}: ${x.v.toFixed(3)} → ${x.n.toFixed(3)} lei/porție (${x.n > x.v ? '+' : ''}${(x.n - x.v).toFixed(3)})${x.inFisier ? '' : ' ← din nomenclator, nu din fișier'}`);
    }
    if (afectate.length > 15) avert.push(`  … și alte ${afectate.length - 15} produse`);
  }
}

export function campuriTip(tip: TipImport): string[] { return Object.keys(CAMPURI[tip]); }

/** Mesaj de eroare care arată și coloanele existente, ca maparea manuală să fie evidentă. */
function eroareColoane(lipsa: string[], antete: string[]): string {
  const gasite = antete.length
    ? `Coloanele din fișier: ${antete.slice(0, 14).map(a => `„${a}"`).join(', ')}${antete.length > 14 ? ` (+${antete.length - 14})` : ''}.`
    : 'Fișierul nu are un rând de antet recognoscibil — verifică dacă primul rând conține numele coloanelor.';
  return `Coloane obligatorii negăsite: ${lipsa.join(', ')}. ${gasite} `
    + 'Mapează-le manual în secțiunea „Maparea coloanelor" de mai sus, apoi importă din nou.';
}

export interface OpteImport {
  canalImplicit?: Canal;      // pentru fișierele de prețuri fără coloană de canal
  dataValabil?: string;       // data de la care se aplică prețurile
  costNou?: boolean;          // baza FC: se importă coloana „Cost NOU" (implicit) sau cea actuală
  dataRaport?: string;        // Sales Mix: ziua pe care se înregistrează perioada raportată
  locatieRaport?: string;     // Sales Mix: locația pe care se agregă raportul
  aliasuriNoi?: Record<string, string>;   // denumire din raport → cod de produs
  /** 2.9: fereastra reală a raportului, când fișierul nu o poartă pe rând (declarată sau din antet). */
  fereastra?: { de: string; la: string };
  /** Amprenta fișierului, ca rândurile să-și poarte proveniența până la versiune. */
  amprenta?: string;
}

/** Fereastra unui rând 2.9: cea declarată pentru tot fișierul, altfel luna rândului (raport lunar). */
const fereastra29 = (opt: OpteImport | undefined, perioada: string): Fereastra29 =>
  (opt?.fereastra ? fereastraDin(opt.fereastra.de, opt.fereastra.la) : fereastraRand({ perioada }));
/** Proveniența unui rând 2.9: fișier, amprentă (= versiunea din Import Center) și rândul din fișier. */
const sursa29 = (fisier: string, opt: OpteImport | undefined, rand?: number): Sursa29 =>
  ({ fisier, ...(opt?.amprenta ? { amprenta: opt.amprenta } : {}), ...(rand !== undefined ? { rand } : {}) });

export function importa(tip: TipImport, p: Parsat, numeFisier: string, state: AppState,
  mapare?: Record<string, string>, opt?: OpteImport): RezultatImport {
  const auto = mapeazaAntete(p.antete, tip);
  const map: Record<string, string> = { ...auto };
  if (mapare) for (const [c, a] of Object.entries(mapare)) { if (a) map[c] = a; else delete map[c]; }
  const avert: string[] = [];
  const erori: string[] = [];
  const g = (r: Record<string, unknown>, c: string) => (map[c] !== undefined ? r[map[c]] : '');
  let importate = 0;
  let stateNou = state;
  let necunoscuteRulare: string[] = [];

  const lipsesc = (obligatorii: string[]) =>
    obligatorii.filter(c => map[c] === undefined);

  // perioadele atinse, ca interfața să poată muta selecția globală pe luna importată
  const perioade = new Set<string>();
  // locațiile necunoscute din fișiere se adaugă în nomenclator; altfel filtrarea pe restaurant rămâne goală
  const locatiiNoi: { cod: string; nume: string }[] = [];
  const rezolvaLocatie = (brut: unknown): string => {
    const v = String(brut ?? '').trim();
    if (!v) return state.locatii[0]?.cod ?? 'L01';
    const gasit = state.locatii.find(l => l.cod === v || norm(l.nume) === norm(v))
      ?? locatiiNoi.find(l => l.cod === v || norm(l.nume) === norm(v));
    if (gasit) return gasit.cod;
    const l = { cod: v, nume: v };
    locatiiNoi.push(l);
    avert.push(`Locație nouă creată din fișier: ${v}`);
    return l.cod;
  };

  if (tip === 'MENIURI') {
    const lipsa = lipsesc(['meniu', 'componenta']);
    if (lipsa.length) {
      erori.push(`Coloane obligatorii negăsite: ${lipsa.join(', ')}. Fișierul trebuie să aibă meniul și componenta pe fiecare rând.`);
    } else {
      const produse = state.produse.map(x => ({ ...x }));
      // indexăm produsele după cod, cod POS și denumire, ca fișierul să poată folosi oricare
      const gaseste = (v: string): string | undefined => {
        const s = v.trim();
        if (!s) return undefined;
        const dupaCod = produse.find(p => p.cod === s || p.codPos === s);
        if (dupaCod) return dupaCod.cod;
        const k = cheieDenumire(s);
        return produse.find(p => cheieDenumire(p.denumire) === k
          || (p.aliasuri ?? []).some(a => cheieDenumire(a) === k))?.cod;
      };

      const grupuri = new Map<string, { nume: string; comp: { cod: string; cant: number }[]; pret?: number; tva?: number; categorie?: string }>();
      const compNegasite = new Set<string>();
      p.randuri.forEach((r, idx) => {
        const numeMeniu = String(g(r, 'meniu')).trim();
        const numeComp = String(g(r, 'componenta')).trim();
        if (!numeMeniu || !numeComp) return;
        const codComp = gaseste(numeComp);
        if (!codComp) { compNegasite.add(numeComp); return; }
        const cant = map.cant ? (parseNumar(g(r, 'cant')) ?? 1) : 1;
        const gr = grupuri.get(numeMeniu) ?? { nume: numeMeniu, comp: [] };
        gr.comp.push({ cod: codComp, cant });
        if (map.pret) { const v = parseNumar(g(r, 'pret')); if (v != null && v > 0) gr.pret = v; }
        if (map.tva) { const v = parseNumar(g(r, 'tva')); if (v != null) gr.tva = v > 0 && v < 1 ? v * 100 : v; }
        if (map.categorie) { const v = String(g(r, 'categorie')).trim(); if (v) gr.categorie = v; }
        grupuri.set(numeMeniu, gr);
        void idx;
      });

      for (const [nume, gr] of grupuri) {
        const cod = gaseste(nume) ?? nume;
        const idx = produse.findIndex(x => x.cod === cod);
        const existent = idx >= 0 ? produse[idx] : undefined;
        const prod: Produs = {
          cod, denumire: existent?.denumire ?? nume,
          categorie: gr.categorie ?? existent?.categorie ?? 'MENIURI',
          tip: 'COMBO',
          combo: gr.comp,
          pretInstore: gr.pret ?? existent?.pretInstore,
          pretDelivery: existent?.pretDelivery ?? gr.pret,
          tva: gr.tva ?? existent?.tva ?? state.setari.tvaImplicit,
          activ: true,
          aliasuri: [...new Set([...(existent?.aliasuri ?? []), nume])],
          codPos: existent?.codPos,
        };
        if (idx >= 0) produse[idx] = prod; else produse.push(prod);
        importate++;
      }
      compNegasite.forEach(c => avert.push(`Componentă negăsită în nomenclator: „${c}" — ignorată (importă întâi rețetarul)`));
      avert.push(`${grupuri.size} meniuri definite; costul lor se calculează prin însumarea componentelor, la data vânzării`);
      avert.push('La importul Sales Mix, liniile de componentă cu preț 0 ale acestor meniuri vor fi excluse automat, ca să nu se dubleze costul');
      stateNou = { ...state, produse };
    }
  } else if (tip === 'WASTE' || tip === 'INVENTAR') {
    const lipsa = lipsesc(['ingredient', 'cant']);
    if (lipsa.length) {
      erori.push(`Coloane obligatorii negăsite: ${lipsa.join(', ')}. Fișierul trebuie să aibă codul ingredientului și cantitatea.`);
    } else {
      const lunaImplicita = opt?.dataValabil?.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
      const waste = [...state.waste], inventar = [...state.inventar];
      const necunoscute = new Set<string>();
      const chei = new Set<string>();
      const noiW: WasteFapt[] = [], noiI: InventarFapt[] = [];

      p.randuri.forEach((r, idx) => {
        const cod = String(g(r, 'ingredient')).trim();
        const cant = parseNumar(g(r, 'cant'));
        if (!cod || cant == null) return;
        const ing = state.ingrediente.find(x => x.cod === cod);
        if (!ing) { necunoscute.add(cod); return; }
        // UM din fișier, dacă există; altfel UM de bază a ingredientului
        const umBrut = map.um ? umNBO(g(r, 'um')) : null;
        const um: UMCod = umBrut ?? ing.um;
        if (UMS[um].baza !== ing.um) {
          avert.push(`Rând ${idx + 2}: UM „${um}" nu se potrivește cu ingredientul ${ing.denumire} (${ing.um}) — rând ignorat`);
          return;
        }
        const locatie = map.locatie ? String(g(r, 'locatie')).trim() : (opt?.locatieRaport ?? '');
        const perioada = map.perioada ? String(g(r, 'perioada')).trim().slice(0, 7) : lunaImplicita;
        if (!locatie) { avert.push(`Rând ${idx + 2}: fără restaurant — rând ignorat (adaugă o coloană „Locație" sau selectează un restaurant)`); return; }
        chei.add(`${locatie}|${perioada}`);
        if (tip === 'WASTE') {
          const motiv = map.motiv ? String(g(r, 'motiv')).trim() || undefined : undefined;
          noiW.push({ locatie, perioada, ingredient: cod, cant, um, motiv });
        } else {
          noiI.push({ locatie, perioada, ingredient: cod, consumReal: cant, um });
        }
        importate++;
        perioade.add(perioada);
      });

      // reimportul aceleiași luni/locații înlocuiește, nu adaugă
      const pastreaza = <T extends { locatie: string; perioada: string }>(x: T) => !chei.has(`${x.locatie}|${x.perioada}`);
      necunoscute.forEach(c => avert.push(`Cod de ingredient negăsit în nomenclator: ${c} — rând ignorat`));
      if (chei.size) avert.push(`Perioade acoperite: ${[...chei].join(', ')}`);
      if (tip === 'WASTE') {
        const lei = noiW.reduce((s, w) => {
          const ing = state.ingrediente.find(x => x.cod === w.ingredient);
          return s + (ing ? w.cant * UMS[w.um].f * pretCurent(ing) : 0);
        }, 0);
        avert.push(`Waste raportat: ${fmtNr(Math.round(lei))} lei`);
        stateNou = { ...state, waste: [...waste.filter(pastreaza), ...noiW] };
      } else {
        avert.push('Consumul real din inventar permite descompunerea variance-ului: rețetă vs waste vs neexplicat');
        stateNou = { ...state, inventar: [...inventar.filter(pastreaza), ...noiI] };
      }
    }
  } else if (tip === 'FC_BAZA') {
    const b = parseBazaFC(p.foi ?? { [p.foaie]: p.matrice ?? [] });
    avert.push(...b.avertismente);
    if (!b.produse.length || !b.retete.length) {
      erori.push('Fișierul trebuie să conțină foile NOMENCLATOR, RETETAR și FOOD COST. '
        + `Găsite: ${Object.keys(p.foi ?? {}).join(', ') || 'niciuna'}.`);
    } else {
      const azi = opt?.dataValabil ?? new Date().toISOString().slice(0, 10);
      const folosesteNou = opt?.costNou !== false;    // implicit se importă costurile NOI
      const schimbariPret: SchimbarePret[] = [];

      // ——— ingrediente, cu prețul în UM de bază
      const ingrediente: Ingredient[] = [];
      const pastrate = new Map(state.ingrediente.map(x => [x.cod, x]));
      for (const g of b.ingrediente) {
        const costDeclarat = folosesteNou ? (g.costNou ?? g.cost) : (g.cost ?? g.costNou);
        const um: UMCod = g.um ?? 'buc';
        const umBaza = UMS[um].baza;
        // nomenclatorul dă costul PER UM din rețetă (0,0221 per ML), aplicația stochează per UM de bază
        const pret = costDeclarat != null ? costDeclarat / UMS[um].f : null;
        const vechi = pastrate.get(g.cod);
        const amb = esteAmbalaj(g.denumire);
        const preturi = vechi ? [...vechi.preturi] : [];
        if (pret != null && pret > 0) {
          const ultim = preturi.length ? preturi[preturi.length - 1] : null;
          if (!ultim || Math.abs(ultim.pret - pret) > 0.0005 || preturi.some(x => x.validDeLa === azi)) {
            schimbariPret.push({ cod: g.cod, denumire: g.denumire, um: umBaza, vechi: ultim?.pret ?? null, nou: pret });
            const noi = adaugaPretDatat(preturi, azi, pret, g.denumire, avert);
            preturi.length = 0; preturi.push(...noi);
          }
        } else avert.push(`${g.denumire} (${g.cod}): fără cost în nomenclator`);
        ingrediente.push({
          cod: g.cod, denumire: g.denumire, categorie: vechi?.categorie ?? (amb ? 'Ambalaje' : 'Materii prime'),
          tip: amb ? 'PACKAGING' : 'FOOD', um: umBaza, furnizor: vechi?.furnizor,
          preturi: preturi.sort((x, y) => x.validDeLa.localeCompare(y.validDeLa)), activ: true,
        });
        pastrate.delete(g.cod);
      }
      for (const rest of pastrate.values()) ingrediente.push(rest);   // ingredientele care nu apar în fișier rămân

      // ——— produse: cele două rânduri (Instore / Delivery) devin un singur produs cu două prețuri
      const reteteFC = new Map(b.retete.map(r => [r.nume, r]));
      const grupuri = new Map<string, ProdusFC[]>();
      for (const pr of b.produse) {
        const k = numeBazaComercial(pr.denumire);
        grupuri.set(k, [...(grupuri.get(k) ?? []), pr]);
      }

      const produse = state.produse.map(x => ({ ...x }));
      const retete = state.retete.map(x => ({ ...x, versiuni: [...x.versiuni] }));
      let fuzionate = 0, fara = 0;

      for (const [nume, rand] of grupuri) {
        const rIn = rand.find(x => x.canal === 'INSTORE');
        const rDlv = rand.find(x => x.canal === 'DELIVERY');
        const orice = rIn ?? rDlv!;
        const cod = nume;

        // liniile de rețetă, cu canal deductibil din diferența dintre cele două variante
        const linIn = rIn?.reteta ? reteteFC.get(rIn.reteta)?.linii ?? [] : [];
        const linDlv = rDlv?.reteta ? reteteFC.get(rDlv.reteta)?.linii ?? [] : [];
        if (!linIn.length && !linDlv.length) { fara++; avert.push(`${nume}: rețeta „${orice.reteta}" nu are linii — produsul intră fără cost`); }
        const cheie = (l: LinieFC) => `${l.cod}|${l.qty}|${l.um}`;
        const setIn = new Map(linIn.map(l => [cheie(l), l]));
        const setDlv = new Map(linDlv.map(l => [cheie(l), l]));
        const linii: LinieReteta[] = [];
        const adauga = (l: LinieFC, canal: LinieReteta['canal']) => {
          const ing = ingrediente.find(x => x.cod === l.cod);
          linii.push({
            comp: l.cod, tipComp: ing?.tip === 'PACKAGING' ? 'AMBALAJ' : 'INGREDIENT',
            cant: l.qty, um: l.um, canal,
          });
        };
        for (const [k, l] of setIn) {
          if (setDlv.has(k)) { adauga(l, 'AMBELE'); setDlv.delete(k); }
          else adauga(l, linDlv.length ? 'INSTORE' : 'AMBELE');
        }
        for (const l of setDlv.values()) adauga(l, linIn.length ? 'DELIVERY' : 'AMBELE');
        if (linIn.length && linDlv.length && linii.some(l => l.canal !== 'AMBELE')) fuzionate++;

        // produsul
        const idx = produse.findIndex(x => x.cod === cod);
        const aliasuri = [...new Set(rand.map(x => x.denumire).concat(rand.map(x => x.reteta).filter(Boolean)))];
        const prod: Produs = {
          cod, denumire: nume, categorie: orice.categorie, tip: 'SIMPLU',
          tva: orice.tva,
          pretInstore: rIn?.pretCuTva ?? undefined,
          pretDelivery: rDlv?.pretCuTva ?? undefined,
          activ: (rIn?.pretCuTva ?? rDlv?.pretCuTva ?? 0) > 0,
          aliasuri: [...new Set([...(produse[idx]?.aliasuri ?? []), ...aliasuri])],
          codPos: produse[idx]?.codPos,
        };
        if (idx >= 0) produse[idx] = prod; else produse.push(prod);

        // rețeta, ca versiune nouă
        if (linii.length) {
          let ret = retete.find(x => x.cod === cod);
          if (!ret) { ret = { cod, tip: 'PRODUS', denumire: nume, versiuni: [], activa: 0 }; retete.push(ret); }
          const nrV = (ret.versiuni[ret.versiuni.length - 1]?.nr ?? 0) + 1;
          ret.versiuni = [...ret.versiuni, {
            nr: nrV, data: azi,
            nota: `Import bază FC ${numeFisier}${folosesteNou ? ' (costuri NOI)' : ' (costuri actuale)'}`,
            linii,
          }];
          ret.activa = nrV;
        }
        importate++;
      }

      // ——— control la nivel de ingredient: nomenclatorul vs costul folosit în blocurile de rețetar
      const dinRetetar = new Map<string, { cost: number; denumire: string }>();
      for (const r of b.retete) for (const l of r.linii) {
        const c = folosesteNou ? (l.costUMNou ?? l.costUM) : (l.costUM ?? l.costUMNou);
        if (c != null && c > 0 && !dinRetetar.has(l.cod)) dinRetetar.set(l.cod, { cost: c, denumire: l.denumire });
      }
      const divergente: string[] = [];
      for (const g of b.ingrediente) {
        const dr = dinRetetar.get(g.cod);
        const cn = folosesteNou ? (g.costNou ?? g.cost) : (g.cost ?? g.costNou);
        if (!dr || cn == null || cn <= 0) continue;
        if (Math.abs(dr.cost - cn) > Math.max(0.0005, cn * 0.005)) {
          divergente.push(`${g.denumire} (${g.cod}): NOMENCLATOR ${cn.toFixed(4)} vs RETETAR ${dr.cost.toFixed(4)} — diferență ${(dr.cost - cn).toFixed(4)} pe unitate`);
        }
      }
      if (divergente.length) {
        avert.push(`CAUZA NEPOTRIVIRILOR: ${divergente.length} ingrediente au preț diferit în NOMENCLATOR față de blocurile din RETETAR. `
          + 'Aplicația poate ține un singur preț per ingredient și a folosit NOMENCLATORUL. Corectează una dintre foi pentru a obține exact MC-ul declarat.');
        for (const d of divergente.slice(0, 12)) avert.push(`  ${d}`);
        if (divergente.length > 12) avert.push(`  … și alte ${divergente.length - 12} ingrediente`);
      }

      // ——— control încrucișat: costul calculat din nomenclator vs MC-ul declarat în fișier
      const ctxNou = buildCtx({ ...state, ingrediente, produse, retete });
      const nepotriviri: { nume: string; calculat: number; declarat: number; dif: number }[] = [];
      for (const [nume, rand] of grupuri) {
        const rIn = rand.find(x => x.canal === 'INSTORE') ?? rand[0];
        const mc = folosesteNou ? rIn.mcNou : rIn.mcActual;
        if (mc == null || mc <= 0) continue;
        const c = costProdus(nume, rIn.canal, ctxNou, azi);
        if (!c) continue;
        const dif = c.total - mc;
        if (Math.abs(dif) > Math.max(0.02, mc * 0.01)) nepotriviri.push({ nume, calculat: c.total, declarat: mc, dif });
      }
      nepotriviri.sort((x, y) => Math.abs(y.dif) - Math.abs(x.dif));
      if (nepotriviri.length) {
        avert.push(`ATENȚIE: la ${nepotriviri.length} din ${grupuri.size} produse, costul calculat din nomenclator diferă de MC-ul declarat în foaia FOOD COST cu peste 1%. `
          + 'Cauza obișnuită: prețul unui ingredient din NOMENCLATOR nu coincide cu cel folosit în blocul de RETETAR. Nomenclatorul a fost luat ca sursă.');
        for (const n of nepotriviri.slice(0, 15)) {
          avert.push(`  ${n.nume}: calculat ${n.calculat.toFixed(3)} vs declarat ${n.declarat.toFixed(3)} (${n.dif > 0 ? '+' : ''}${n.dif.toFixed(3)})`);
        }
        if (nepotriviri.length > 15) avert.push(`  … și alte ${nepotriviri.length - 15} produse`);
      } else {
        avert.push(`Control încrucișat: costul calculat coincide cu MC-ul declarat la toate cele ${grupuri.size} produse`);
      }

      avert.push(`${grupuri.size} produse comerciale, ${b.retete.length} rețete și ${b.ingrediente.length} ingrediente din fișier`);
      if (fuzionate) avert.push(`${fuzionate} produse au rețete diferite pe canale: liniile comune au intrat pe AMBELE, restul pe canalul corespunzător (rezolvă problema ambalajului de livrare)`);
      if (fara) avert.push(`${fara} produse nu au linii de rețetă`);
      avert.push(folosesteNou
        ? 'S-au importat costurile NOI din nomenclator (coloana „Cost NOU / UM")'
        : 'S-au importat costurile ACTUALE din nomenclator');
      stateNou = { ...state, ingrediente, produse, retete };
      raporteazaSchimbari(state, stateNou, schimbariPret, new Set(grupuri.keys()), avert, azi);
    }
  } else if (tip === 'SALES_MIX') {
    const sm = parseSalesMix(p.matrice ?? []);
    if (!sm.linii.length) {
      erori.push('Nicio linie de vânzare recognoscibilă. Raportul 4.7 trebuie exportat ca Excel sau CSV, cu coloanele Menu Item Name / Qty / Price / Extension.');
    } else {
      // ziua pe care se înregistrează perioada: aleasă de utilizator sau prima zi a raportului
      const data = opt?.dataRaport ?? sm.perioadaDe ?? new Date().toISOString().slice(0, 10);
      const zile = sm.perioadaDe && sm.perioadaLa
        ? Math.round((new Date(sm.perioadaLa).getTime() - new Date(sm.perioadaDe).getTime()) / 86400000) + 1 : 1;

      /**
       * Locația: se cere adaptorului canonic, nu se ghicește aici. `analizeaza47` trece
       * numele din antet prin Store Master și spune dacă raportul e atribuibil unui
       * restaurant anume. Un raport de rețea NU devine restaurant: rândurile lui primesc
       * codul rezervat `RETEA`, care nu intră în nomenclatorul de locații.
       *
       * Înainte, un raport pe mai multe unități fabrica o locație „AGREGAT" care ajungea
       * în `state.locatii` și apărea ca al 31-lea restaurant în clasamente.
       */
      const a47 = analizeaza47(sm, numeFisier);
      const locatii = [...state.locatii];
      let locatie: string;
      if (opt?.locatieRaport) {
        // restaurantul declarat explicit de om la import — decizia lui bate deducția
        locatie = opt.locatieRaport;
      } else if (a47.atribuibilPeRestaurant && a47.restaurantUnic) {
        locatie = a47.restaurantUnic;
      } else {
        locatie = LOCATIE_RETEA;
        if (a47.motiv) avert.push(a47.motiv);
      }
      // proveniența identităților: ce s-a rezolvat și ce nu, cu numele exacte
      const nerezolvate = a47.restaurante.filter(r => r.status === 'UNMATCHED' || r.status === 'AMBIGUOUS');
      if (nerezolvate.length) {
        avert.push(`${nerezolvate.length} din ${a47.rezumat.totalDeclarate} restaurante din antet nu s-au putut `
          + `identifica sigur: ${nerezolvate.map(r => `„${r.valoareSursa}" (${r.status})`).slice(0, 8).join(', ')}. `
          + 'Vânzările NU li se atribuie.');
      }
      // un cod rezervat nu e restaurant: nu intră în nomenclator și nu apare în selector
      if (locatie !== LOCATIE_RETEA && !locatii.some(l => l.cod === locatie)) {
        locatii.push({ cod: locatie, nume: locatie });
        avert.push(`Locație creată pentru raport: ${locatie}`);
      }

      // ——— potrivirea pe denumire: cod, cod POS, alias salvat, apoi denumirea normalizată
      const produse = state.produse.map(x => ({ ...x }));
      const dupaCheie = new Map<string, string>();
      for (const pr of produse) {
        dupaCheie.set(cheieDenumire(pr.denumire), pr.cod);
        for (const a of pr.aliasuri ?? []) dupaCheie.set(cheieDenumire(a), pr.cod);
      }
      // aliasuri noi, alocate manual de utilizator
      for (const [den, cod] of Object.entries(opt?.aliasuriNoi ?? {})) {
        const idx = produse.findIndex(x => x.cod === cod);
        if (idx < 0) continue;
        produse[idx] = { ...produse[idx], aliasuri: [...new Set([...(produse[idx].aliasuri ?? []), den])] };
        dupaCheie.set(cheieDenumire(den), cod);
      }

      // ——— agregarea: același produs apare pe mai multe rânduri, la prețuri diferite
      const acc = new Map<string, { cant: number; brut: number }>();
      const nepotrivite = new Map<string, { cant: number; valoare: number; categorie: string }>();
      let pretZero = 0, bucZero = 0, negative = 0;

      // componentele meniurilor definite: costul lor intră deja prin explozia meniului-părinte,
      // deci liniile lor cu preț 0 trebuie excluse, altfel costul se numără de două ori
      const componenteMeniu = new Set<string>();
      for (const pr of produse) {
        if (pr.tip !== 'COMBO' || !pr.combo?.length) continue;
        for (const c of pr.combo) componenteMeniu.add(c.cod);
      }
      let excluseComponente = 0, bucExcluse = 0;

      for (const l of sm.linii) {
        if (l.qty < 0) negative++;
        if (l.pret === 0) { pretZero++; bucZero += l.qty; }
        const cheie = cheieDenumire(l.numeBaza);
        const cod = dupaCheie.get(cheie);
        if (cod && l.pret === 0 && componenteMeniu.has(cod)) {
          excluseComponente++; bucExcluse += l.qty;
          continue;
        }
        if (!cod) {
          const n = nepotrivite.get(l.numeBaza) ?? { cant: 0, valoare: 0, categorie: l.categorie };
          n.cant += l.qty; n.valoare += l.ext;
          nepotrivite.set(l.numeBaza, n);
          continue;
        }
        const k = `${cod}|${l.canal}`;
        const a = acc.get(k) ?? { cant: 0, brut: 0 };
        a.cant += l.qty; a.brut += l.ext;
        acc.set(k, a);
      }

      const noi: VanzareFapt[] = [];
      for (const [k, a] of acc) {
        const bara = k.lastIndexOf('|');
        const cod = k.slice(0, bara), canal = k.slice(bara + 1) as Canal;
        const prod = produse.find(x => x.cod === cod)!;
        noi.push({ data, locatie, canal, produs: cod, cant: a.cant, brut: a.brut, net: a.brut / (1 + prod.tva / 100) });
        importate++;
      }

      // înlocuim aceeași combinație dată+locație+canal+produs, ca reimportul să nu dubleze
      const chei = new Set(noi.map(v => `${v.data}|${v.locatie}|${v.canal}|${v.produs}`));
      const vanzari = [...state.vanzari.filter(v => !chei.has(`${v.data}|${v.locatie}|${v.canal}|${v.produs}`)), ...noi];

      // ——— raportarea onestă a limitelor
      if (zile > 1) avert.push(`Raportul acoperă ${zile} zile (${sm.perioadaDe} – ${sm.perioadaLa}), dar POS-ul nu dă defalcarea pe zi: totalul a fost înregistrat pe ${data}`);
      if (locatie === 'AGREGAT') avert.push(`Raportul e agregat pe ${sm.magazine.length} restaurante: analizele pe locație nu pot separa unitățile`);
      if (excluseComponente) {
        avert.push(`${excluseComponente} linii cu preț 0 au fost EXCLUSE (${fmtNr(bucExcluse)} bucăți): sunt componente ale unor meniuri definite, `
          + 'iar costul lor intră deja prin meniul-părinte — altfel s-ar fi numărat de două ori');
      }
      const zeroRamas = pretZero - excluseComponente;
      if (zeroRamas > 0) avert.push(`${zeroRamas} linii cu preț 0 rămase (${fmtNr(bucZero - bucExcluse)} bucăți): costul lor intră în Food Cost fără venit propriu. `
        + 'Definește meniurile (import „Meniuri / combo") ca să fie atribuite corect.');
      if (negative) avert.push(`${negative} linii cu cantitate negativă (retururi) — incluse în agregare`);
      if (sm.totalQty != null) {
        const potrivit = [...acc.values()].reduce((s, a) => s + a.cant, 0);
        const nepot = [...nepotrivite.values()].reduce((s, a) => s + a.cant, 0);
        avert.push(`Acoperire pe denumiri: ${fmtNr(potrivit)} din ${fmtNr(potrivit + nepot)} bucăți s-au mapat pe nomenclator (${((potrivit / Math.max(1, potrivit + nepot)) * 100).toFixed(1)}%)`);
      }
      const topNepot = [...nepotrivite.entries()].sort((a, b) => b[1].valoare - a[1].valoare);
      for (const [den, v] of topNepot.slice(0, 25)) {
        avert.push(`Nemapat: „${den}" (${v.categorie}) — ${fmtNr(v.cant)} buc, ${fmtNr(Math.round(v.valoare))} lei`);
      }
      if (topNepot.length > 25) avert.push(`… și alte ${topNepot.length - 25} denumiri nemapate`);

      // ——— maparea asistată: lista persistentă a denumirilor fără produs
      const rezolvabile = new Set([...dupaCheie.keys()]);
      const nemapateNoi = [
        // intrările vechi rămân doar dacă încă nu se pot rezolva și nu reapar în importul curent
        ...state.nemapate.filter(n => !rezolvabile.has(cheieDenumire(n.denumire)) && !nepotrivite.has(n.denumire)),
        ...[...nepotrivite.entries()].map(([den, v]) => ({
          denumire: den, categorie: v.categorie, cant: v.cant, valoare: v.valoare, fisier: numeFisier,
          sursa: 'SALES_MIX' as const,
        })),
      ].sort((a, b) => b.valoare - a.valoare);

      necunoscuteRulare = [...nepotrivite.keys()];
      stateNou = { ...state, produse, locatii, vanzari, nemapate: nemapateNoi };
      perioade.add(data.slice(0, 7));
    }
  } else if (tip === 'PMIX') {
    const lipsa = lipsesc(['data', 'produs', 'cant']);
    if (lipsa.length) erori.push(eroareColoane(lipsa, p.antete));
    else {
      // maparea acceptă atât codul intern, cât și numărul POS din NBO
      const dupaCod = new Map<string, string>();
      for (const x of state.produse) {
        dupaCod.set(x.cod, x.cod);
        if (x.codPos) dupaCod.set(x.codPos, x.cod);
        // aliasurile sunt identitățile venite din POS pe care omul le-a confirmat în coada
        // de aprobare. Fără ele, aprobarea unui cod necunoscut n-ar schimba nimic la
        // următorul import — coada s-ar reumple la nesfârșit cu același rând.
        for (const a of x.aliasuri ?? []) dupaCod.set(a, x.cod);
      }
      // Codul necunoscut NU se pierde: se reține cu bucăți și lei, ca banii din raport să
      // rămână explicabili și rândul să ajungă în coada de aprobare.
      const necunoscute = new Map<string, { cant: number; valoare: number; nume: string }>();
      const prinPos = new Set<string>();
      const noi: VanzareFapt[] = [];
      const canalFisier = detecteazaCanal('', numeFisier);
      p.randuri.forEach((r, i) => {
        const data = parseData(g(r, 'data'));
        const cod = String(g(r, 'produs')).trim();
        const cant = parseNumar(g(r, 'cant'));
        if (!data || !cod || cant == null) { if (String(g(r, 'produs')).trim() || g(r, 'cant')) avert.push(`Rând ${i + 2}: date incomplete — ignorat`); return; }
        const canal = detecteazaCanal(g(r, 'canal'), numeFisier) ?? canalFisier;
        if (!canal) { avert.push(`Rând ${i + 2}: canal neidentificat — ignorat`); return; }
        const codIntern = dupaCod.get(cod);
        if (!codIntern) {
          // fără produs nu există TVA, deci netul nu se poate deduce dintr-un brut:
          // se ia ce spune fișierul, iar dacă nu spune nimic rămâne 0 și se declară
          const valFisier = parseNumar(g(r, 'net')) ?? parseNumar(g(r, 'brut')) ?? 0;
          const e = necunoscute.get(cod) ?? { cant: 0, valoare: 0, nume: String(g(r, 'denumire') ?? '').trim() };
          e.cant += cant; e.valoare += valFisier;
          if (!e.nume) e.nume = String(g(r, 'denumire') ?? '').trim();
          necunoscute.set(cod, e);
          return;
        }
        if (codIntern !== cod) prinPos.add(`${cod} → ${codIntern}`);
        const locatie = rezolvaLocatie(g(r, 'locatie'));
        perioade.add(data.slice(0, 7));
        const prod = state.produse.find(x => x.cod === codIntern)!;
        const brut = parseNumar(g(r, 'brut'));
        const discount = parseNumar(g(r, 'discount')) ?? 0;
        let net = parseNumar(g(r, 'net'));
        if (net == null) {
          const b = brut ?? (canal === 'INSTORE' ? (prod.pretInstore ?? 0) : (prod.pretDelivery ?? 0)) * cant;
          net = (b - discount) / (1 + prod.tva / 100);
        }
        noi.push({ data, locatie, canal, produs: codIntern, cant, brut: brut ?? net * (1 + prod.tva / 100), net });
      });
      if (necunoscute.size) {
        const totCant = [...necunoscute.values()].reduce((a, x) => a + x.cant, 0);
        const totLei = [...necunoscute.values()].reduce((a, x) => a + x.valoare, 0);
        avert.push(`${necunoscute.size} coduri fără produs în nomenclator: ${fmtNr(totCant)} buc, `
          + `${fmtNr(Math.round(totLei))} lei — NU intră în calcul.`);
        for (const [c, v] of [...necunoscute.entries()].sort((a, b) => b[1].valoare - a[1].valoare).slice(0, 25)) {
          avert.push(`Nemapat: cod „${c}"${v.nume ? ` (${v.nume})` : ''} — ${fmtNr(v.cant)} buc, ${fmtNr(Math.round(v.valoare))} lei`);
        }
      }
      if (prinPos.size) avert.push(`Mapate prin numărul POS: ${[...prinPos].slice(0, 8).join(', ')}${prinPos.size > 8 ? '…' : ''}`);
      const chei = new Set(noi.map(v => `${v.data}|${v.locatie}|${v.canal}|${v.produs}`));
      const pastrate = state.vanzari.filter(v => !chei.has(`${v.data}|${v.locatie}|${v.canal}|${v.produs}`));
      // agregăm dublurile din fișier pe aceeași cheie
      const agg = new Map<string, VanzareFapt>();
      for (const v of noi) {
        const k = `${v.data}|${v.locatie}|${v.canal}|${v.produs}`;
        const e = agg.get(k);
        if (e) { e.cant += v.cant; e.brut += v.brut; e.net += v.net; } else agg.set(k, { ...v });
      }
      importate = agg.size;
      // Codurile necunoscute intră în ACEEAȘI coadă de aprobare ca denumirile din 4.7 —
      // o singură mapare, un singur ecran. Intrările vechi rămân doar cât timp încă nu se
      // pot rezolva și nu reapar în importul curent; la aprobare, codul devine alias și
      // rândul se potrivește singur la următorul import.
      const rezolvabileP = new Set(dupaCod.keys());
      const nemapateP: Nemapat[] = [
        ...state.nemapate.filter(n => !rezolvabileP.has(n.denumire) && !necunoscute.has(n.denumire)),
        ...[...necunoscute.entries()].map(([cod, v]) => ({
          denumire: cod, categorie: v.nume || '—', cant: v.cant, valoare: v.valoare,
          fisier: numeFisier, sursa: 'PMIX' as const,
        })),
      ].sort((a, b) => b.valoare - a.valoare);
      necunoscuteRulare = [...necunoscute.keys()];
      stateNou = { ...state, vanzari: [...pastrate, ...agg.values()], nemapate: nemapateP };
    }
  } else if (tip === 'SALES') {
    const lipsa = lipsesc(['data', 'locatie']);
    if (lipsa.length || (map.net === undefined && map.brut === undefined)) erori.push(eroareColoane([...lipsa, map.net === undefined && map.brut === undefined ? 'net sau brut' : ''].filter(Boolean), p.antete));
    else {
      const noi = p.randuri.flatMap((r, i) => {
        const data = parseData(g(r, 'data'));
        const locatie = rezolvaLocatie(g(r, 'locatie'));
        const canal = detecteazaCanal(g(r, 'canal'), numeFisier);
        const net = parseNumar(g(r, 'net')) ?? (parseNumar(g(r, 'brut')) ?? 0) / 1.1;
        if (!data || !locatie || !canal || !net) { avert.push(`Rând ${i + 2}: date incomplete — ignorat`); return []; }
        perioade.add(data.slice(0, 7));
        return [{ data, locatie, canal, net, brut: parseNumar(g(r, 'brut')) ?? undefined, bonuri: parseNumar(g(r, 'bonuri')) ?? undefined }];
      });
      const chei = new Set(noi.map(v => `${v.data}|${v.locatie}|${v.canal}`));
      importate = noi.length;
      stateNou = { ...state, salesReport: [...state.salesReport.filter(v => !chei.has(`${v.data}|${v.locatie}|${v.canal}`)), ...noi] };
    }
  } else if (tip === 'FC29') {
    const lipsa = lipsesc(['categorie', 'valoare']);
    if (lipsa.length) erori.push(eroareColoane(lipsa, p.antete));
    else {
      const noi: Linie29[] = p.randuri.flatMap((r, i) => {
        const perioada = parsePerioada(g(r, 'perioada'));
        const categorie = String(g(r, 'categorie')).trim();
        const valoare = parseNumar(g(r, 'valoare'));
        if (!perioada || !categorie || valoare == null) { if (categorie) avert.push(`Rând ${i + 2}: date incomplete — ignorat`); return []; }
        const locatie = rezolvaLocatie(g(r, 'locatie'));
        perioade.add(perioada);
        return [{ perioada, locatie, categorie, valoare, fereastra: fereastra29(opt, perioada), sursa: sursa29(numeFisier, opt, i + 2) }];
      });
      // identitatea de înlocuire e (fereastră reală, restaurant): un săptămânal nu atinge
      // lunarul, lunarul nu atinge săptămânile, iar corecția aceleiași ferestre o înlocuiește
      const chei = new Set(noi.map(l => cheieFereastra(fereastraRand(l), l.locatie)));
      importate = noi.length;
      // detaliul pe material al ferestrelor înlocuite iese și el: altfel puntea pe material
      // ar reconcilia un consum pe care acest import tocmai l-a înlocuit
      const staleMat = (state.materiale29 ?? []).filter(m => m.locatie !== null && chei.has(cheieFereastra(fereastraRand(m), m.locatie)));
      if (staleMat.length) {
        avert.push(`${staleMat.length} linii de detaliu pe material pentru aceleași (fereastră × locație) au fost eliminate — `
          + 'importul pe categorie le înlocuiește. Reimportă fișierul 2.9 pe material dacă vrei detaliul înapoi.');
      }
      stateNou = {
        ...state,
        materiale29: (state.materiale29 ?? []).filter(m => !(m.locatie !== null && chei.has(cheieFereastra(fereastraRand(m), m.locatie)))),
        linii29: [...state.linii29.filter(l => !chei.has(cheieFereastra(fereastraRand(l), l.locatie))), ...noi],
      };
    }
  } else if (tip === 'FC29_MATERIAL') {
    // Raportul 2.9 la nivel de MATERIAL — alimentează puntea de reconciliere pe material.
    // Reguli: ce lipsește în export rămâne null, nu zero; lipsa restaurantului NU inventează
    // o locație (rămâne null și e raportată); categoriile nerecunoscute NU cad pe Food.
    const lipsa = lipsesc(['material', 'denumire', 'costActual']);
    if (lipsa.length) erori.push(eroareColoane(lipsa, p.antete));
    else {
      const lunaImplicita = opt?.dataValabil?.slice(0, 7);
      const DA = new Set(['da', 'yes', 'true', '1', 'x', 'normalizat']);

      const noi: Material29[] = [];
      const neclasificate = new Set<string>();
      const nemapate = new Set<string>();
      // materialele fără corespondent, pe identitate (codul, sau denumirea când codul lipsește),
      // cu leii cumulați — merg în coada comună de aprobare, nu se creează și nu se ghicesc
      const necunoscute = new Map<string, { denumire: string; cant: number; valoare: number }>();
      const canaleNecunoscute = new Set<string>();
      const faraCost: number[] = [];
      let faraPerioada = 0, faraLocatie = 0, cuTeoretic = 0, cuCanal = 0, totalActual = 0;

      p.randuri.forEach((r, i) => {
        const material = String(g(r, 'material')).trim();
        if (!material || /^(total|subtotal)/i.test(material)) return;   // rânduri de total / decor
        const denumire = String(g(r, 'denumire')).trim() || material;
        const costActual = parseNumar(g(r, 'costActual'));
        if (costActual == null) { faraCost.push(i + 2); return; }
        // fallback-ul pe dataValabil se aplică DOAR când fișierul nu are coloană de perioadă:
        // o celulă goală re-datată ar muta rândul într-o lună pe care fișierul nu o acoperă,
        // iar cheia lui de înlocuire ar șterge datele reale ale acelei luni
        const perioada = map.perioada !== undefined ? parsePerioada(g(r, 'perioada')) : lunaImplicita;
        if (!perioada) { faraPerioada++; return; }

        // fără restaurant → null: linia contează la nivel de companie și e semnalată,
        // dar nu se inventează o locație care nu există în sursă
        const locBrut = map.locatie !== undefined ? String(g(r, 'locatie')).trim() : '';
        const locatie = locBrut ? rezolvaLocatie(locBrut) : null;
        if (!locatie) faraLocatie++;

        const categorie = String(g(r, 'categorie')).trim();
        if (clasificaCategorie29(categorie).neclasificat) neclasificate.add(categorie || '(fără categorie)');
        if (identificaIngredient(state.ingrediente, material, denumire) === null) {
          nemapate.add(`${denumire} (${material})`);
          const identitate = material || denumire;
          const n = necunoscute.get(identitate) ?? { denumire, cant: 0, valoare: 0 };
          n.cant += map.cant !== undefined ? (parseNumar(g(r, 'cant')) ?? 0) : 0;
          n.valoare += costActual;
          necunoscute.set(identitate, n);
        }

        const costTeoretic = map.costTeoretic !== undefined ? parseNumar(g(r, 'costTeoretic')) : null;
        if (costTeoretic != null) cuTeoretic++;
        const normalizat = map.normalizat !== undefined
          && DA.has(norm(String(g(r, 'normalizat'))));

        // canalul se PĂSTREAZĂ doar când sursa îl declară explicit; o valoare nerecunoscută
        // NU se ghicește — rândul rămâne fără canal (necunoscut), iar valoarea e semnalată.
        // Livrarea se verifică PRIMA: „livrare locală" conține și „local", dar e livrare.
        const canalBrut = map.canal !== undefined ? norm(String(g(r, 'canal'))) : '';
        const canal = /delivery|livrare|curier|glovo|tazz|bolt/.test(canalBrut) ? 'DELIVERY' as const
          : /in ?store|salon|dine ?in|local/.test(canalBrut) ? 'INSTORE' as const
          : undefined;
        if (canal) cuCanal++;
        else if (canalBrut) canaleNecunoscute.add(String(g(r, 'canal')).trim());

        noi.push({
          perioada, locatie, material, denumire, categorie,
          cant: map.cant !== undefined ? parseNumar(g(r, 'cant')) : null,
          um: map.um !== undefined ? umNBO(g(r, 'um')) : null,
          costActual, costTeoretic,
          ...(normalizat ? { normalizat: true } : {}),
          ...(canal ? { canal } : {}),
          fereastra: fereastra29(opt, perioada), sursa: sursa29(numeFisier, opt, i + 2),
        });
        totalActual += costActual;
        perioade.add(perioada);
        importate++;
      });

      // reimportul aceleiași (ferestre × locații) înlocuiește, nu adaugă; alte ferestre
      // (săptămânile lunii, sau luna săptămânilor) rămân neatinse
      const cheia = (m: { perioada: string; locatie: string | null; fereastra?: Fereastra29 }) => cheieFereastra(fereastraRand(m), m.locatie);
      const chei = new Set(noi.map(cheia));
      const materiale29 = [...(state.materiale29 ?? []).filter(m => !chei.has(cheia(m))), ...noi];

      // rollup pe categorie → linii29, ca FC Curat pe categorie să vină din același import.
      // Liniile fără restaurant nu pot intra în rollup (Linie29 cere locația): rămân doar
      // la nivel de material și sunt semnalate mai jos.
      const rollup = new Map<string, Linie29>();
      for (const m of noi) {
        if (!m.locatie) continue;
        const k = `${cheieFereastra(fereastraRand(m), m.locatie)}|${m.categorie}`;
        const e = rollup.get(k);
        if (e) e.valoare += m.costActual;
        else rollup.set(k, { perioada: m.perioada, locatie: m.locatie, categorie: m.categorie, valoare: m.costActual,
          fereastra: fereastraRand(m), sursa: sursa29(numeFisier, opt) });
      }
      const perechi29 = new Set([...rollup.values()].map(l => cheieFereastra(fereastraRand(l), l.locatie)));
      const linii29 = [...state.linii29.filter(l => !perechi29.has(cheieFereastra(fereastraRand(l), l.locatie))), ...rollup.values()];

      // ——— raportarea onestă a ce s-a importat și a ce lipsește
      avert.push(`${noi.length} linii de material, ${fmtNr(Math.round(totalActual))} lei consum actual, `
        + `pe perioadele ${[...new Set(noi.map(m => m.perioada))].sort().join(', ') || '—'}`);
      avert.push(rollup.size
        ? `Rollup pe categorie generat: ${rollup.size} linii 2.9 — FC Curat pe categorie folosește acum acest import`
        : 'Niciun rollup pe categorie generat (nicio linie nu are restaurant)');
      avert.push(cuTeoretic === noi.length && noi.length > 0
        ? 'Costul teoretic e declarat pe fiecare linie: variance-ul pe material vine direct din raport'
        : cuTeoretic > 0
          ? `Cost teoretic declarat doar pe ${cuTeoretic} din ${noi.length} linii — pe restul se reconstruiește din rețete × PMIX`
          : 'Raportul nu declară costul teoretic: variance-ul pe material se reconstruiește din rețete × PMIX');
      if (map.canal !== undefined && noi.length) {
        avert.push(cuCanal === noi.length
          ? 'Canalul e declarat explicit pe fiecare linie — analiza 2.9 pe canal devine posibilă pe acest import'
          : `Canal declarat doar pe ${cuCanal} din ${noi.length} linii — restul rămân cu canal necunoscut (nu se presupune Total)`);
        if (canaleNecunoscute.size) {
          avert.push(`Valori de canal nerecunoscute, lăsate necunoscute (nu s-a ghicit nimic): ${[...canaleNecunoscute].slice(0, 5).join(', ')}${canaleNecunoscute.size > 5 ? '…' : ''}`);
        }
      }
      if (faraCost.length) {
        avert.push(`${faraCost.length} rânduri fără cost — ignorate (rândurile ${faraCost.slice(0, 5).join(', ')}${faraCost.length > 5 ? '…' : ''})`);
      }
      if (faraPerioada) avert.push(`${faraPerioada} rânduri fără perioadă — ignorate (adaugă coloana „Perioada" sau alege data valabilității înainte de import)`);
      if (faraLocatie) avert.push(`${faraLocatie} linii fără restaurant: contează la nivel de companie, dar nu apar în analiza pe unitate și nici în rollup-ul pe categorie`);
      if (neclasificate.size) {
        avert.push(`${neclasificate.size} categorii pe care nicio regulă nu le recunoaște — liniile lor NU au fost presupuse Food `
          + 'în puntea pe material; în FC-ul pe categorie (rollup-ul 2.9) urmează însă regulile de clasificare existente. '
          + 'Adaugă reguli pentru: ' + [...neclasificate].slice(0, 8).join(', ') + (neclasificate.size > 8 ? '…' : ''));
      }
      if (nemapate.size) {
        avert.push(`${nemapate.size} materiale fără corespondent în nomenclator: `
          + [...nemapate].slice(0, 8).join(', ') + (nemapate.size > 8 ? '…' : '')
          + ' — au intrat în coada de aprobare; costul lor apare ca „Neexplicat" în punte până la aprobare');
      }
      // coada comună: intrările de material care încă nu se rezolvă și nu reapar acum rămân;
      // cele reapărute se împrospătează cu cifrele acestui fișier; produsele nu sunt atinse
      necunoscuteRulare = [...necunoscute.keys()];
      const nemapateNoi29: Nemapat[] = [
        ...state.nemapate.filter(n => n.sursa !== 'NBO_29'
          || (identificaIngredient(state.ingrediente, n.denumire, n.categorie) === null && !necunoscute.has(n.denumire))),
        ...[...necunoscute.entries()].map(([identitate, v]) => ({
          denumire: identitate, categorie: v.denumire, cant: v.cant, valoare: v.valoare,
          fisier: numeFisier, sursa: 'NBO_29' as const,
        })),
      ];

      // granularitate mixtă: aceeași perioadă cu linii pe restaurant ȘI fără restaurant se
      // însumează la nivel de companie — posibil același consum numărat de două ori
      const luniMixte = [...new Set(noi.map(m => m.perioada))].filter(per => {
        const rows = materiale29.filter(m => m.perioada === per);
        return rows.some(m => m.locatie === null) && rows.some(m => m.locatie !== null);
      });
      if (luniMixte.length) {
        avert.push(`ATENȚIE: perioadele ${luniMixte.join(', ')} conțin atât linii pe restaurant, cât și linii fără restaurant — `
          + 'la nivel de companie ambele se însumează; verifică să nu fie același consum numărat de două ori');
      }

      stateNou = { ...state, materiale29, linii29, nemapate: nemapateNoi29 };
    }
  } else if (tip === 'COST_INGREDIENTE') {
    // prețul e opțional: un nomenclator pur (cod + denumire + UM) creează ingredientele
    // fără preț — costul lor rămâne NECUNOSCUT, niciodată presupus zero
    const lipsa = lipsesc(['cod']);
    if (lipsa.length) erori.push(eroareColoane(lipsa, p.antete));
    else {
      const ingrediente = state.ingrediente.map(x => ({ ...x, preturi: [...x.preturi] }));
      const azi = opt?.dataValabil ?? new Date().toISOString().slice(0, 10);   // fișierele fără coloană de dată se aplică de la data cerută, altfel de azi
      p.randuri.forEach((r, i) => {
        const cod = String(g(r, 'cod')).trim();
        const pret = map.pret !== undefined ? parseNumar(g(r, 'pret')) : null;
        const fisierCuPret = map.pret !== undefined;
        if (!cod) return;
        if (fisierCuPret && pret == null) { avert.push(`Rând ${i + 2}: preț invalid — ignorat`); return; }
        const validDeLa = parseData(g(r, 'validDeLa')) ?? azi;
        let ing = ingrediente.find(x => x.cod === cod);
        if (!ing) {
          const denumire = String(g(r, 'denumire')).trim();
          if (!denumire) { avert.push(`Rând ${i + 2}: ingredient nou fără denumire (${cod}) — ignorat`); return; }
          const catg = String(g(r, 'categorie')).trim() || 'Alte alimente';
          const umRaw = norm(String(g(r, 'um')));
          const um = (['kg', 'l', 'buc'] as const).find(u => umRaw.startsWith(u)) ?? 'kg';
          const tipRaw = norm(String(g(r, 'tip')) + ' ' + catg);
          ing = {
            cod, denumire, categorie: catg,
            tip: tipRaw.includes('ambalaj') || tipRaw.includes('pack') ? 'PACKAGING' : 'FOOD',
            um, furnizor: String(g(r, 'furnizor')).trim() || undefined, preturi: [], activ: true,
          } as Ingredient;
          ingrediente.push(ing);
          avert.push(`Ingredient nou creat: ${cod} — ${denumire}`);
        }
        if (pret != null) {
          const vechi = ing.preturi.length ? ing.preturi[ing.preturi.length - 1].pret : null;
          if (vechi != null && vechi > 0 && Math.abs(pret - vechi) / vechi * 100 > state.setari.pragAlertaPret) {
            avert.push(`Preț ${ing.denumire}: ${vechi} → ${pret} lei (variație > ${state.setari.pragAlertaPret}%)`);
          }
          ing.preturi = adaugaPretDatat(ing.preturi, validDeLa, pret, ing.denumire, avert);
        }
        importate++;
      });
      stateNou = { ...state, ingrediente };
    }
  } else if (tip === 'PRETURI_PRODUSE') {
    // fișierele CR-IT nu au coduri, doar denumiri comerciale: acceptăm și potrivirea pe nume
    const peDenumire = map.produs === undefined && map.denumire !== undefined;
    const lipsa = peDenumire ? [] : lipsesc(['produs']);
    const arePret = map.pret !== undefined || map.pretInstore !== undefined || map.pretDelivery !== undefined;
    if (lipsa.length || !arePret) {
      erori.push(eroareColoane([...lipsa, arePret ? '' : 'preț (o coloană de preț, sau câte una pe canal)'].filter(Boolean), p.antete));
    } else {
      const azi = opt?.dataValabil ?? new Date().toISOString().slice(0, 10);
      // maparea acceptă atât codul intern, cât și numărul POS
      const dupaCod = new Map<string, string>();
      for (const x of state.produse) {
        dupaCod.set(x.cod, x.cod);
        if (x.codPos) dupaCod.set(x.codPos, x.cod);
      }
      // index pe denumire normalizată (denumire proprie + aliasuri), pentru fișierele fără coduri
      const dupaNume = new Map<string, string>();
      for (const x of state.produse) {
        dupaNume.set(cheieDenumire(x.denumire), x.cod);
        for (const a of x.aliasuri ?? []) dupaNume.set(cheieDenumire(a), x.cod);
      }
      const produse = state.produse.map(x => ({ ...x }));
      const necunoscute = new Set<string>();
      const atinse = new Set<string>();
      let reactivate = 0;

      p.randuri.forEach((r, i) => {
        const codBrut = String(g(r, peDenumire ? 'denumire' : 'produs')).trim();
        if (!codBrut) return;
        const cod = peDenumire ? dupaNume.get(cheieDenumire(codBrut)) : dupaCod.get(codBrut);
        if (!cod) { necunoscute.add(codBrut); return; }
        const idx = produse.findIndex(x => x.cod === cod);
        const prod = produse[idx];

        // canalul: din coloană, din opțiuni, sau din numele fișierului
        const canalRand = map.canal !== undefined ? detecteazaCanal(g(r, 'canal'), numeFisier) : null;
        const nf = norm(numeFisier);
        const canalFisier: Canal | null = nf.includes('instore') || nf.includes('sala') ? 'INSTORE'
          : nf.includes('delivery') || nf.includes('livrare') ? 'DELIVERY' : null;
        const canal = canalRand ?? opt?.canalImplicit ?? canalFisier;

        const pIn = map.pretInstore !== undefined ? parseNumar(g(r, 'pretInstore')) : null;
        const pDlv = map.pretDelivery !== undefined ? parseNumar(g(r, 'pretDelivery')) : null;
        const pGen = map.pret !== undefined ? parseNumar(g(r, 'pret')) : null;
        const dataRand = map.validDeLa !== undefined ? (parseData(g(r, 'validDeLa')) ?? azi) : azi;

        const aplica = (c: Canal, val: number) => {
          const vechi = c === 'INSTORE' ? prod.pretInstore : prod.pretDelivery;
          if (vechi != null && Math.abs(vechi - val) < 0.0005) return;   // preț neschimbat
          if (c === 'INSTORE') prod.pretInstore = val; else prod.pretDelivery = val;
          prod.istoricPret = [...(prod.istoricPret ?? []), { data: dataRand, canal: c, pret: val, nota: `Import ${numeFisier}` }];
          if (vechi != null && vechi > 0) {
            const varPct = ((val - vechi) / vechi) * 100;
            if (Math.abs(varPct) >= 5) {
              avert.push(`${prod.denumire} ${c === 'INSTORE' ? 'InStore' : 'Delivery'}: ${vechi} → ${val} lei (${varPct > 0 ? '+' : ''}${varPct.toFixed(1)}%)`);
            }
          }
          atinse.add(`${cod}|${c}`);
          importate++;
        };

        if (pIn != null && pIn > 0) aplica('INSTORE', pIn);
        if (pDlv != null && pDlv > 0) aplica('DELIVERY', pDlv);
        if (pGen != null && pGen > 0) {
          if (canal) aplica(canal, pGen);
          else avert.push(`Rând ${i + 2} (${prod.denumire}): nu se știe canalul — alege-l înainte de import sau adaugă o coloană „canal"`);
        }
        // un produs care primește preț devine vandabil
        if (!prod.activ && ((prod.pretInstore ?? 0) > 0 || (prod.pretDelivery ?? 0) > 0)) {
          prod.activ = true; reactivate++;
        }
        produse[idx] = prod;
      });

      necunoscute.forEach(c => avert.push(`${peDenumire ? 'Denumire' : 'Cod'} negăsit${peDenumire ? 'ă' : ''} în nomenclator: ${c} — preț ignorat (importă întâi rețetarul sau baza FC)`));
      if (peDenumire) avert.push('Fișierul nu are coduri de produs: potrivirea s-a făcut pe denumirea comercială');
      if (reactivate) avert.push(`${reactivate} produse au devenit active după primirea unui preț`);
      const canale = new Set([...atinse].map(x => x.split('|')[1]));
      if (canale.size) avert.push(`Prețuri actualizate pe: ${[...canale].map(c => c === 'INSTORE' ? 'InStore' : 'Delivery').join(' și ')}`);
      // produsele active fără preț pe un canal, ca să nu rămână găuri nedetectate
      const faraCanal = produse.filter(x => x.activ && ((x.pretInstore ?? 0) === 0 || (x.pretDelivery ?? 0) === 0));
      if (faraCanal.length) avert.push(`${faraCanal.length} produse active nu au preț pe ambele canale: ${faraCanal.slice(0, 5).map(x => x.denumire).join(', ')}${faraCanal.length > 5 ? '…' : ''}`);
      stateNou = { ...state, produse };
    }
  } else if (tip === 'PRETURI_FURNIZORI') {
    const lipsa = lipsesc(['furnizor', 'ing', 'pret']);
    if (lipsa.length) erori.push(eroareColoane(lipsa, p.antete));
    else {
      const furnizori = [...state.furnizori];
      const oferte = [...state.pretFurnizori];
      p.randuri.forEach((r, i) => {
        const ingCod = String(g(r, 'ing')).trim();
        const pret = parseNumar(g(r, 'pret'));
        const fRaw = String(g(r, 'furnizor')).trim();
        if (!ingCod || pret == null || !fRaw) { if (ingCod) avert.push(`Rând ${i + 2}: date incomplete — ignorat`); return; }
        if (!state.ingrediente.some(x => x.cod === ingCod)) { avert.push(`Rând ${i + 2}: ingredient necunoscut ${ingCod} — ignorat`); return; }
        let f = furnizori.find(x => x.cod === fRaw || norm(x.nume) === norm(fRaw));
        if (!f) {
          f = { cod: `F${String(furnizori.length + 1).padStart(2, '0')}`, nume: fRaw };
          furnizori.push(f);
          avert.push(`Furnizor nou creat: ${f.cod} — ${fRaw}`);
        }
        const validDeLa = parseData(g(r, 'validDeLa')) ?? undefined;
        const idx = oferte.findIndex(o => o.furnizor === f!.cod && o.ingredient === ingCod);
        const oferta = { furnizor: f.cod, ingredient: ingCod, pret, validDeLa };
        if (idx >= 0) oferte[idx] = oferta; else oferte.push(oferta);
        importate++;
      });
      stateNou = { ...state, furnizori, pretFurnizori: oferte };
    }
  } else if (tip === 'RETETAR_NBO') {
    // Un singur fișier populează: nomenclator, ingrediente cu prețuri, rețete versionate.
    const carduri = p.matrice && p.matrice.length ? cardsDinMatrice(p.matrice) : [];
    const lista = carduri.length ? carduri : cardsDinTabel(p.randuri, map);
    if (!lista.length) {
      erori.push('Niciun recipe card recognoscibil. Verifică maparea coloanelor (Item ID, Qty, Units) sau exportă din NBO cu antetul produsului.');
    } else {
      const produse = [...state.produse];
      const ingrediente = state.ingrediente.map(x => ({ ...x, preturi: [...x.preturi] }));
      const retete = state.retete.map(x => ({ ...x, versiuni: [...x.versiuni] }));
      const azi = opt?.dataValabil ?? new Date().toISOString().slice(0, 10);
      const schimbariPret: SchimbarePret[] = [];
      const coduriDinFisier = new Set<string>();

      const produseNoiCreate: string[] = [];
      for (const card of lista) {
        const cod = (card.produs || card.denumire).trim();
        if (!cod) { avert.push('Card fără cod de produs — ignorat'); continue; }
        if (!card.linii.length) { avert.push(`Produsul ${cod}: nicio linie de ingredient — ignorat`); continue; }

        // ——— nomenclator
        const idx = produse.findIndex(x => x.cod === cod);
        const pretBrut = card.pretPos ?? undefined;
        const codPos = card.codPos && card.codPos !== cod ? card.codPos : undefined;
        if (idx < 0) {
          produse.push({
            cod, denumire: card.denumire || cod, categorie: card.categorie || 'Fără categorie',
            codPos, tip: 'SIMPLU', tva: state.setari.tvaImplicit,
            pretInstore: pretBrut, pretDelivery: pretBrut,
            activ: (pretBrut ?? 0) > 0,
          } as Produs);
          avert.push(`Produs nou în nomenclator: ${cod} — ${card.denumire}`);
          produseNoiCreate.push(cod);
          if (!(pretBrut != null && pretBrut > 0)) avert.push(`Produsul ${cod} are preț POS 0 în NBO — a intrat inactiv, completează prețul în Master Data`);
        } else {
          const vechi = produse[idx];
          produse[idx] = {
            ...vechi,
            denumire: card.denumire || vechi.denumire,
            categorie: card.categorie || vechi.categorie,
            codPos: codPos ?? vechi.codPos,
            pretInstore: pretBrut != null && pretBrut > 0 ? pretBrut : vechi.pretInstore,
            pretDelivery: pretBrut != null && pretBrut > 0 && !vechi.pretDelivery ? pretBrut : vechi.pretDelivery,
          };
        }
        if (codPos) avert.push(`${cod}: număr POS diferit (${codPos}) — PMIX-ul se mapează pe oricare dintre ele`);

        // ——— ingrediente + prețuri, convertite în UM de bază
        const linii: LinieReteta[] = [];
        for (const l of card.linii) {
          const amb = esteAmbalaj(l.denumire);
          const pret = pretBaza(l);
          const umBaza = UMS[l.um].baza;
          let ing = ingrediente.find(x => x.cod === l.comp);
          if (!ing) {
            ing = {
              cod: l.comp, denumire: l.denumire, categorie: amb ? 'Ambalaje' : 'Materii prime',
              tip: amb ? 'PACKAGING' : 'FOOD', um: umBaza, preturi: [], activ: true,
            } as Ingredient;
            ingrediente.push(ing);
            avert.push(`Ingredient nou: ${l.comp} — ${l.denumire}`);
          } else if (ing.um !== umBaza) {
            avert.push(`${l.denumire} (${l.comp}): UM din NBO (${l.um}) nu se potrivește cu ${ing.um} din nomenclator — prețul NU a fost actualizat`);
            linii.push({ comp: l.comp, tipComp: ing.tip === 'PACKAGING' ? 'AMBALAJ' : 'INGREDIENT', cant: l.cant, um: l.um, canal: 'AMBELE' });
            continue;
          }
          // control de coerență pe datele NBO
          if (l.cost != null && l.extension != null && l.cost > 0) {
            const asteptat = l.cant * l.cost;
            if (Math.abs(asteptat - l.extension) > Math.max(0.01, asteptat * 0.02)) {
              avert.push(`${l.denumire}: Extension ${l.extension} ≠ Qty × Cost (${asteptat.toFixed(3)}) — verifică în NBO`);
            }
          }
          if (pret != null && pret > 0) {
            const ultim = ing.preturi.length ? ing.preturi[ing.preturi.length - 1] : null;
            if (!ultim || Math.abs(ultim.pret - pret) / Math.max(ultim.pret, 1e-9) > 0.005) {
              schimbariPret.push({ cod: l.comp, denumire: l.denumire, um: umBaza, vechi: ultim?.pret ?? null, nou: pret });
              ing.preturi = adaugaPretDatat(ing.preturi, azi, pret, l.denumire, avert);
            }
          } else {
            avert.push(`${l.denumire}: fără cost în NBO — ingredientul intră fără preț`);
          }
          linii.push({
            comp: l.comp, tipComp: amb ? 'AMBALAJ' : 'INGREDIENT',
            cant: l.cant, um: l.um, canal: 'AMBELE',
          });
        }

        // ——— rețeta, ca versiune nouă (istoricul se păstrează)
        let ret = retete.find(x => x.cod === cod);
        if (!ret) {
          ret = { cod, tip: 'PRODUS', denumire: card.denumire || cod, versiuni: [], activa: 0 } as Reteta;
          retete.push(ret);
        }
        const nr = (ret.versiuni[ret.versiuni.length - 1]?.nr ?? 0) + 1;
        ret.versiuni = [...ret.versiuni, { nr, data: azi, nota: `Import NBO ${numeFisier}`, linii }];
        ret.activa = activaDupaData(ret);
        ret.denumire = card.denumire || ret.denumire;

        // ——— cardul NBO nu are dimensiunea de canal: ambalajul intră pe ambele canale
        const ambalaje = linii.filter(l => l.tipComp === 'AMBALAJ');
        if (ambalaje.length) {
          const nume = ambalaje.map(l => card.linii.find(x => x.comp === l.comp)?.denumire ?? l.comp);
          avert.push(`${cod}: ambalajele (${nume.join(', ')}) au intrat pe ambele canale — cardul NBO nu distinge InStore de Delivery. `
            + 'Dacă ambalajul diferă, setează canalul pe linie în Rețetar, altfel costul unui canal e supraevaluat.');
        }

        // ——— control final: costul calculat vs Materials Cost din NBO
        if (card.materialsCost != null && card.materialsCost > 0) {
          const calculat = card.linii.reduce((s, l) => s + (l.extension ?? (l.cost ?? 0) * l.cant), 0);
          if (Math.abs(calculat - card.materialsCost) > Math.max(0.02, card.materialsCost * 0.02)) {
            avert.push(`${cod}: suma liniilor (${calculat.toFixed(3)}) diferă de Materials Cost din NBO (${card.materialsCost})`);
          }
        }
        coduriDinFisier.add(cod);
        importate++;
      }
      if (produseNoiCreate.length) {
        avert.push(`Cota de TVA aplicată produselor noi: ${state.setari.tvaImplicit}% (se modifică în Setări)`);
      }
      stateNou = { ...state, produse, ingrediente, retete };
      raporteazaSchimbari(state, stateNou, schimbariPret, coduriDinFisier, avert, azi);
    }
  } else if (tip === 'RETETAR') {
    const lipsa = lipsesc(['reteta', 'comp', 'cant']);
    if (lipsa.length) erori.push(eroareColoane(lipsa, p.antete));
    else {
      const grupe = new Map<string, Record<string, unknown>[]>();
      for (const r of p.randuri) {
        const cod = String(g(r, 'reteta')).trim();
        if (!cod) continue;
        const arr = grupe.get(cod) ?? [];
        arr.push(r); grupe.set(cod, arr);
      }
      const retete = state.retete.map(x => ({ ...x, versiuni: [...x.versiuni] }));
      let neschimbate = 0;
      // versiunea se datează la data cerută de import, nu la ceasul mașinii: altfel o
      // versiune „din iunie" nu s-ar aplica în iunie, iar recalculul istoric ar folosi
      // rețeta greșită (invariantul costului istoric)
      const azi = opt?.dataValabil ?? new Date().toISOString().slice(0, 10);
      for (const [cod, randuri] of grupe) {
        const linii: LinieReteta[] = [];
        let randCant: number | null = null; let randUm: 'kg' | 'l' | 'buc' = 'kg';
        for (const r of randuri) {
          const comp = String(g(r, 'comp')).trim();
          const cant = parseNumar(g(r, 'cant'));
          if (!comp || cant == null) continue;
          const umRaw = norm(String(g(r, 'um')));
          const um = (['g', 'kg', 'ml', 'l', 'buc'] as UMCod[]).find(u => umRaw === u || umRaw.startsWith(u)) ?? 'g';
          const tipRaw = norm(String(g(r, 'tipComp')));
          const eSP = tipRaw.includes('semi') || comp.toUpperCase().startsWith('SP');
          const eAmb = tipRaw.includes('ambalaj') || state.ingrediente.find(x => x.cod === comp)?.tip === 'PACKAGING';
          const canalRaw = detecteazaCanal(g(r, 'canal'), '');
          const pierdere = parseNumar(g(r, 'pierdere')) ?? undefined;
          if (!eSP && !state.ingrediente.some(x => x.cod === comp) && !retete.some(x => x.cod === comp)) {
            avert.push(`Rețeta ${cod}: componenta ${comp} nu există — linie ignorată`); continue;
          }
          linii.push({
            comp, cant, um, pierdere,
            tipComp: eSP ? 'SEMIPREPARAT' : eAmb ? 'AMBALAJ' : 'INGREDIENT',
            canal: canalRaw ?? 'AMBELE',
          });
          const rc = parseNumar(g(r, 'randCant'));
          if (rc != null) { randCant = rc; const ru = norm(String(g(r, 'randUm'))); randUm = (['kg', 'l', 'buc'] as const).find(u => ru.startsWith(u)) ?? 'kg'; }
        }
        if (!linii.length) { avert.push(`Rețeta ${cod}: nicio linie validă`); continue; }
        const eSPReteta = cod.toUpperCase().startsWith('SP') || norm(String(g(randuri[0], 'tipReteta'))).includes('semi');
        let ret = retete.find(x => x.cod === cod);
        const denumire = String(g(randuri[0], 'denumire')).trim() || state.produse.find(x => x.cod === cod)?.denumire || cod;
        if (!ret) {
          ret = { cod, tip: eSPReteta ? 'SEMIPREPARAT' : 'PRODUS', denumire, versiuni: [], activa: 0 } as Reteta;
          retete.push(ret);
          if (!eSPReteta && !state.produse.some(x => x.cod === cod)) avert.push(`Rețeta ${cod} nu are produs în nomenclator — se importă, dar nu apare în vânzări`);
        }
        // O versiune nouă se scrie DOAR când conținutul chiar diferă. La un import
        // săptămânal, altfel s-ar aduna ~52 de versiuni pe an per rețetă, aproape toate
        // identice: cifrele ar rămâne corecte (versiuneLa alege oricum bine), dar istoricul
        // — singurul loc unde scrie când s-a schimbat gramajul și cu cât — ar deveni ilizibil.
        const semnatura = (l: LinieReteta[]) => JSON.stringify(
          [...l].map(x => [x.comp, x.tipComp, x.cant, x.um, x.canal, x.pierdere ?? 0])
            .sort((a, b) => String(a).localeCompare(String(b))));
        const ultima = ret.versiuni[ret.versiuni.length - 1];
        if (ultima && semnatura(ultima.linii) === semnatura(linii)) {
          neschimbate++;
          continue;
        }
        const nr = (ultima?.nr ?? 0) + 1;
        ret.versiuni = [...ret.versiuni, {
          nr, data: azi, nota: `Import ${numeFisier}`, linii,
          randament: eSPReteta ? { cant: randCant ?? 1, um: randUm } : undefined,
        }];
        ret.activa = activaDupaData(ret);
        importate++;
      }
      if (neschimbate) {
        avert.push(`${neschimbate} rețete neschimbate față de versiunea în vigoare — nu s-a creat o versiune nouă pentru ele.`);
      }
      stateNou = { ...state, retete };
    }
  }

  if (locatiiNoi.length && stateNou !== state) {
    stateNou = { ...stateNou, locatii: [...stateNou.locatii, ...locatiiNoi.filter(l => !stateNou.locatii.some(x => x.cod === l.cod))] };
  }

  const perioadaAtinsa = [...perioade].sort().reverse()[0];

  const batch: ImportBatch = {
    perioada: perioadaAtinsa,
    id: idBatch(), tip: TIP_LABEL[tip], fisier: numeFisier, data: new Date().toISOString(),
    randuri: p.randuri.length, importate,
    avertismente: avert.slice(0, 40), erori,
    status: erori.length ? 'ESUAT' : 'IMPORTAT',
  };
  if (erori.length) stateNou = state;
  return { stateNou: { ...stateNou, importuri: [batch, ...stateNou.importuri] }, batch, necunoscute: necunoscuteRulare };
}
