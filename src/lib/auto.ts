// Analiză automată a fișierelor de import.
// Rezolvă cele trei cauze frecvente de eșec: fișierul are mai multe foi, antetul nu e pe primul rând,
// iar numele coloanelor nu seamănă cu nimic cunoscut. Când numele nu ajută, se uită la conținut.
import * as XLSX from 'xlsx';
import { mapeazaAntete, type Parsat, type TipImport } from './importer';
import { matriceDinText, parseSalesMix } from './salesmix';
import { textDinPdf } from './pdf';
import { norm } from './engine';
import { umNBO } from './nbo';

export interface FoaieAnalizata {
  foaie: string;
  randAntet: number;                    // pe ce rând s-a găsit antetul (0 = primul)
  parsat: Parsat;
  tip: TipImport | null;
  mapare: Record<string, string>;       // câmp → coloană, completată și din conținut
  dinContinut: string[];                // câmpurile deduse din conținut, nu din nume
  lipsa: string[];                      // câmpuri obligatorii încă negăsite
  incredere: number;                    // 0–100
  note: string[];
}

// ————————————————————————————————————————————— clasificatoare de conținut

const val = (v: unknown) => String(v ?? '').trim();
const nevide = (col: unknown[]) => col.filter(v => val(v) !== '');

const numar = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = val(v).replace(/[$\s\u00a0]/g, '');
  if (!s || !/[0-9]/.test(s)) return null;
  const ro = /,\d{1,3}$/.test(s) && !/\.\d{1,3}$/.test(s);
  const c = ro ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = Number(c.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const dataISO = (v: unknown): string | null => {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = val(v);
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
};

const pondere = (col: unknown[], test: (v: unknown) => boolean) => {
  const c = nevide(col);
  return c.length ? c.filter(test).length / c.length : 0;
};

const scorUM = (col: unknown[]) => pondere(col, v => umNBO(v) !== null);
const scorData = (col: unknown[]) => pondere(col, v => dataISO(v) !== null);
const esteNumeric = (col: unknown[]) => pondere(col, v => numar(v) !== null) >= 0.85;

const unicitate = (c: string[]) => (c.length ? new Set(c).size / c.length : 0);

// un simplu index de rând (1, 2, 3…) nu este un cod de articol
const esteIndexRand = (col: unknown[]) => {
  const n = nevide(col).map(numar);
  if (n.some(x => x === null) || n.length < 3) return false;
  const v = n as number[];
  return v.every((x, i) => i === 0 || x === v[i - 1] + 1) && v[0] <= 2;
};

const scorCod = (col: unknown[]) => {
  const c = nevide(col).map(val);
  if (c.length < 2 || esteIndexRand(col)) return 0;
  const scurte = c.filter(s => s.length >= 2 && s.length <= 16 && !/\s{2,}/.test(s)).length / c.length;
  const cuCifre = c.filter(s => /\d/.test(s)).length / c.length;
  const faraSpatii = c.filter(s => !/\s/.test(s)).length / c.length;
  if (scurte < 0.85 || cuCifre < 0.6) return 0;
  return 0.4 * scurte + 0.3 * cuCifre + 0.2 * faraSpatii + 0.1 * unicitate(c);
};

const scorDenumire = (col: unknown[]) => {
  const c = nevide(col).map(val);
  if (c.length < 2) return 0;
  const text = c.filter(s => /[a-zA-ZăâîșțĂÂÎȘȚ]{3}/.test(s)).length / c.length;
  const lungime = c.reduce((s, x) => s + x.length, 0) / c.length;
  if (text < 0.8 || lungime < 5) return 0;
  return 0.6 * text + 0.4 * Math.min(1, lungime / 20);
};

const scorPret = (col: unknown[]) => {
  if (!esteNumeric(col)) return 0;
  const n = nevide(col).map(numar).filter((x): x is number => x !== null);
  if (!n.length || esteIndexRand(col)) return 0;
  const cuZecimale = n.filter(x => Math.abs(x % 1) > 1e-9).length / n.length;
  const mediana = [...n].sort((a, b) => a - b)[Math.floor(n.length / 2)];
  if (mediana <= 0 || mediana > 100000) return 0;
  return 0.7 * cuZecimale + 0.3 * (mediana < 5000 ? 1 : 0.3);
};

const scorCantitate = (col: unknown[]) => {
  if (!esteNumeric(col)) return 0;
  const n = nevide(col).map(numar).filter((x): x is number => x !== null);
  if (!n.length || esteIndexRand(col)) return 0;
  if (n.some(x => x < 0)) return 0;
  const mediana = [...n].sort((a, b) => a - b)[Math.floor(n.length / 2)];
  return mediana > 0 && mediana < 10000 ? 0.6 : 0.2;
};

const scorCanal = (col: unknown[]) =>
  pondere(col, v => /instore|in-store|delivery|livrare|sala|takeaway|dine/i.test(val(v)));

const scorPerioada = (col: unknown[]) =>
  pondere(col, v => /^\d{4}-\d{2}$/.test(val(v)) || /^(ian|feb|mar|apr|mai|iun|iul|aug|sep|oct|noi|dec)/i.test(val(v)));

// ————————————————————————————————————————————— detectarea rândului de antet

function coloaneDinRand(rand: unknown[]): string[] {
  const rez: string[] = [];
  const vazute = new Set<string>();
  rand.forEach((c, i) => {
    let nume = val(c) || `Coloana ${i + 1}`;
    if (vazute.has(nume)) nume = `${nume} (${i + 1})`;
    vazute.add(nume);
    rez.push(nume);
  });
  return rez;
}

/** Alege rândul care arată cel mai mult ca un antet: text pe majoritatea celulelor, cu date dedesubt. */
export function gasesteAntet(matrice: unknown[][]): number {
  let best = 0, bestScor = -1;
  const limita = Math.min(matrice.length - 1, 25);
  for (let i = 0; i <= limita; i++) {
    const rand = matrice[i] ?? [];
    const celule = rand.filter(c => val(c) !== '');
    if (celule.length < 2) continue;
    // antetul e text, nu numere
    const text = celule.filter(c => val(c) !== '' && numar(c) === null).length / celule.length;
    // rândurile de dedesubt trebuie să aibă cam aceeași lățime
    const urmatoare = matrice.slice(i + 1, i + 6).filter(r => (r ?? []).some(c => val(c) !== ''));
    if (!urmatoare.length) continue;
    const potrivire = urmatoare.reduce((s, r) => {
      const n = (r ?? []).filter(c => val(c) !== '').length;
      return s + Math.min(n, celule.length) / Math.max(n, celule.length, 1);
    }, 0) / urmatoare.length;
    const scor = text * 3 + potrivire * 2 + Math.min(celule.length, 12) / 12 - i * 0.04;
    if (scor > bestScor) { bestScor = scor; best = i; }
  }
  return best;
}

// ————————————————————————————————————————————— deducerea câmpurilor din conținut

type Verificator = (col: unknown[]) => number;   // 0 = sigur nu, 1 = potrivire perfectă
const PRAG_CONTINUT = 0.55;

const REGULI_CONTINUT: Partial<Record<TipImport, Record<string, Verificator>>> = {
  RETETAR_NBO: { comp: scorCod, denumireComp: scorDenumire, um: scorUM, cant: scorCantitate, cost: scorPret, extension: scorPret },
  COST_INGREDIENTE: { cod: scorCod, denumire: scorDenumire, um: scorUM, pret: scorPret },
  PMIX: { data: scorData, produs: scorCod, denumire: scorDenumire, cant: scorCantitate, canal: scorCanal, net: scorPret, brut: scorPret },
  SALES: { data: scorData, canal: scorCanal, net: scorPret, brut: scorPret },
  FC29: { perioada: scorPerioada, categorie: scorDenumire, valoare: scorPret },
  // raportul 4.7 se recunoaște după antet și după structura de raport, nu din conținut
  MENIURI: { meniu: scorDenumire, componenta: scorDenumire },
  WASTE: { ingredient: scorCod, cant: scorCantitate },
  INVENTAR: { ingredient: scorCod, cant: scorCantitate },
  FC_BAZA: { denumire: scorDenumire },
  SALES_MIX: { denumire: scorDenumire, cant: scorCantitate, pret: scorPret },
  // prețurile de vânzare se recunosc după nume de coloană; codul se poate deduce
  PRETURI_PRODUSE: { produs: scorCod, denumire: scorDenumire, pret: scorPret },
  // furnizorul nu se ghicește din conținut: fără o coloană numită astfel, tipul nu se aplică
  PRETURI_FURNIZORI: { ing: scorCod, pret: scorPret },
  RETETAR: { reteta: scorCod, comp: scorCod, cant: scorCantitate, um: scorUM },
};

const OBLIGATORII: Record<TipImport, string[]> = {
  PMIX: ['data', 'produs', 'cant'],
  SALES: ['data'],
  FC29: ['perioada', 'categorie', 'valoare'],
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

function coloane(parsat: Parsat): Record<string, unknown[]> {
  const rez: Record<string, unknown[]> = {};
  for (const a of parsat.antete) rez[a] = parsat.randuri.map(r => r[a]);
  return rez;
}

/** Completează maparea pentru câmpurile pe care numele coloanelor nu le-au acoperit. */
function completeazaDinContinut(tip: TipImport, parsat: Parsat, map: Record<string, string>) {
  const reguli = REGULI_CONTINUT[tip];
  const dinContinut: string[] = [];
  if (!reguli) return { map, dinContinut };
  const cols = coloane(parsat);
  const folosite = new Set(Object.values(map));
  // câmpurile obligatorii primele, ca să nu le fure o coloană ambiguă
  const ordine = [...OBLIGATORII[tip], ...Object.keys(reguli).filter(c => !OBLIGATORII[tip].includes(c))];
  for (const camp of ordine) {
    if (map[camp]) continue;
    const test = reguli[camp];
    if (!test) continue;
    const candidati = parsat.antete
      .filter(a => !folosite.has(a))
      .map(a => ({ a, s: test(cols[a]) + (norm(a).includes(norm(camp)) ? 0.25 : 0) }))
      .filter(x => x.s >= PRAG_CONTINUT)
      .sort((a, b) => b.s - a.s);
    if (!candidati.length) continue;
    const alesa = candidati[0].a;
    map[camp] = alesa;
    folosite.add(alesa);
    dinContinut.push(camp);
  }
  return { map, dinContinut };
}

// ————————————————————————————————————————————— analiza completă

// Tipuri cu puține câmpuri obligatorii: un tabel „cod + preț" seamănă atât cu o listă de prețuri de
// vânzare, cât și cu un cost de ingrediente. Acestea se aplică doar dacă există un semnal explicit —
// o coloană recunoscută după nume sau un nume de fișier care le indică.
const NECESITA_SEMNAL: Partial<Record<TipImport, RegExp>> = {
  MENIURI: /meniu|combo/i,
  WASTE: /waste|pierder|risipa/i,
  INVENTAR: /inventar|stoc|consum real/i,
  SALES_MIX: /sales mix|4\.?7/i,
  PRETURI_PRODUSE: /pret|price|vanzare|meniu|instore|delivery/i,
  PRETURI_FURNIZORI: /furnizor|supplier|oferta|achizit/i,
};

/**
 * Ce sugerează numele fișierului. Un fișier numit „Prețuri INSTORE" este o listă de prețuri de
 * vânzare, nu un cost de ingrediente — semnalul acesta cântărește mai mult decât potrivirea coloanelor,
 * pentru că exact așa citește un om numele fișierului.
 */
export function tipDinNumeFisier(numeFisier: string): TipImport | null {
  const n = norm(numeFisier);
  const pret = /pret|price|tarif/.test(n);
  // „prețuri ingrediente" / „corecții prețuri materii prime" sunt costuri de ingrediente,
  // nu prețuri de vânzare — cuvântul „ingredient" decide înaintea cuvântului „preț"
  if (/ingredient|materie prima|materii prime|nomenclator/.test(n)) return 'COST_INGREDIENTE';
  if (pret && /instore|in store|delivery|livrare|sala|vanzare|meniu/.test(n)) return 'PRETURI_PRODUSE';
  if (pret && /furnizor|supplier|oferta|achizit/.test(n)) return 'PRETURI_FURNIZORI';
  if (/recipe|recipes|retetar nbo|nbo/.test(n)) return 'RETETAR_NBO';
  if (/sales mix|4 7 sales|4\.7/.test(n)) return 'SALES_MIX';
  if (/pmix|product mix/.test(n)) return 'PMIX';
  if (/2\.9|2 9|nbo 29/.test(n)) return 'FC29';
  if (/sales report|raport vanzari/.test(n)) return 'SALES';
  if (/retetar|reteta/.test(n)) return 'RETETAR';
  if (pret) return 'PRETURI_PRODUSE';
  if (/cost|fc baza|baza de date/.test(n)) return 'COST_INGREDIENTE';
  return null;
}

function analizeazaFoaie(foaie: string, matrice: unknown[][], numeFisier: string): FoaieAnalizata {
  const sugerat = tipDinNumeFisier(numeFisier);
  const randAntet = gasesteAntet(matrice);
  const antete = coloaneDinRand(matrice[randAntet] ?? []);
  const randuri = matrice.slice(randAntet + 1)
    .filter(r => (r ?? []).some(c => val(c) !== ''))
    .map(r => {
      const o: Record<string, unknown> = {};
      antete.forEach((a, i) => { o[a] = (r ?? [])[i] ?? ''; });
      return o;
    });
  const parsat: Parsat = { foaie, antete, randuri, matrice };
  const note: string[] = [];
  if (randAntet > 0) note.push(`Antetul a fost găsit pe rândul ${randAntet + 1}, nu pe primul`);
  if (sugerat) note.push(`Numele fișierului sugerează: ${sugerat}`);

  // ——— evaluăm fiecare tip și păstrăm cel mai bun
  let bestTip: TipImport | null = null, bestScor = 0;
  let bestMap: Record<string, string> = {}, bestCont: string[] = [], bestLipsa: string[] = [];
  for (const tip of Object.keys(OBLIGATORII) as TipImport[]) {
    const dinNume = mapeazaAntete(antete, tip);
    const { map, dinContinut } = completeazaDinContinut(tip, parsat, { ...dinNume });
    const oblig = OBLIGATORII[tip];
    const lipsa = oblig.filter(c => !map[c]);
    if (lipsa.length) continue;
    // pentru tipurile ambigue: fără semnal din numele coloanelor sau al fișierului, nu se aplică
    const semnal = NECESITA_SEMNAL[tip];
    if (semnal && tip !== sugerat) {
      const peNumeExista = Object.keys(map).some(c => !dinContinut.includes(c));
      if (!peNumeExista) continue;
    }
    const acoperite = Object.keys(map).length;
    const peNume = acoperite - dinContinut.length;
    const obligPeNume = oblig.filter(c => map[c] && !dinContinut.includes(c)).length;
    const obligDinContinut = oblig.filter(c => dinContinut.includes(c)).length;
    // câmpurile recunoscute după nume sunt un semnal mult mai tare decât cele ghicite din conținut
    const scor = obligPeNume * 22 + peNume * 7 + acoperite * 3 - obligDinContinut * 5
      + (tip === 'RETETAR_NBO' && /nbo|recipe/i.test(numeFisier) ? 12 : 0)
      + (tip === sugerat ? 35 : 0);
    if (scor > bestScor) {
      bestScor = scor; bestTip = tip; bestMap = map; bestCont = dinContinut; bestLipsa = [];
    }
  }
  if (!bestTip) {
    // nimic complet: raportăm cel mai apropiat, ca utilizatorul să vadă ce lipsește
    const tipAprox = (Object.keys(OBLIGATORII) as TipImport[])
      .map(t => {
        const m = completeazaDinContinut(t, parsat, { ...mapeazaAntete(antete, t) }).map;
        return { t, lipsa: OBLIGATORII[t].filter(c => !m[c]), map: m };
      })
      .sort((a, b) => a.lipsa.length - b.lipsa.length)[0];
    bestTip = null; bestMap = tipAprox.map; bestLipsa = tipAprox.lipsa;
    note.push(`Nu s-a putut determina tipul: pentru „${tipAprox.t}" lipsesc ${tipAprox.lipsa.join(', ')}`);
  }
  if (bestCont.length) note.push(`Deduse din conținut (nu din numele coloanei): ${bestCont.join(', ')}`);

  return {
    foaie, randAntet, parsat, tip: bestTip, mapare: bestMap,
    dinContinut: bestCont, lipsa: bestLipsa,
    incredere: bestTip ? Math.max(20, Math.min(100, Math.round(bestScor * 1.4))) : 0,
    note,
  };
}

/** Analizează toate foile unui fișier și spune, pentru fiecare, ce este și cum se mapează. */
/** PDF: singurul format PDF din fluxul FRYDAY e raportul 4.7 Sales Mix — se validează pe propriile totaluri. */
async function analizeazaPdf(file: File): Promise<FoaieAnalizata[]> {
  let text: string;
  try {
    text = await textDinPdf(await file.arrayBuffer());
  } catch (e) {
    console.warn('Citirea PDF a eșuat:', e);
    return [{
      foaie: 'PDF', randAntet: 0, parsat: { foaie: 'PDF', antete: [], randuri: [], matrice: [] },
      tip: null, mapare: {}, dinContinut: [], lipsa: [], incredere: 0,
      note: ['Citirea PDF nu e disponibilă în varianta fișier-unic deschisă de pe disc. '
        + 'Folosește versiunea online (aceeași aplicație) sau exportul Excel al raportului — se importă identic.'],
    }];
  }
  const matrice = matriceDinText(text);
  const sm = parseSalesMix(matrice);
  const note: string[] = [];
  const q = sm.linii.reduce((s, l) => s + l.qty, 0);
  const e = sm.linii.reduce((s, l) => s + l.ext, 0);
  const validat = sm.totalQty != null && sm.totalExt != null
    && q === sm.totalQty && Math.abs(e - sm.totalExt) < 0.5;
  if (sm.perioadaDe) note.push(`Perioada raportului: ${sm.perioadaDe} → ${sm.perioadaLa}`);
  if (sm.magazine.length === 1) note.push(`Restaurant: ${sm.magazine[0]}`);
  else if (sm.magazine.length > 1) note.push(`Raport agregat pe ${sm.magazine.length} restaurante`);
  note.push(validat
    ? `Verificat pe totalul raportului: ${q.toLocaleString('ro-RO')} buc · ${e.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} lei — diferență zero`
    : sm.totalQty != null
      ? `ATENȚIE: totalul calculat (${q.toLocaleString('ro-RO')} buc) diferă de cel declarat (${sm.totalQty.toLocaleString('ro-RO')}) — verifică PDF-ul`
      : 'PDF fără rând de total — nu s-a putut verifica încrucișat');
  if (!sm.linii.length) {
    return [{
      foaie: 'PDF', randAntet: 0, parsat: { foaie: 'PDF', antete: [], randuri: [], matrice },
      tip: null, mapare: {}, dinContinut: [], lipsa: ['linii de vânzare'],
      incredere: 0,
      note: ['Nicio linie de vânzare recognoscibilă — PDF-urile acceptate sunt rapoartele 4.7 Sales Mix. Pentru alte date, folosește exportul Excel/CSV.'],
    }];
  }
  return [{
    foaie: `PDF · ${sm.linii.length} linii de vânzare`, randAntet: 0,
    parsat: { foaie: 'PDF', antete: [], randuri: [], matrice },
    tip: 'SALES_MIX', mapare: {}, dinContinut: [], lipsa: [],
    incredere: validat ? 100 : 70, note,
  }];
}

export async function analizeazaFisier(file: File): Promise<FoaieAnalizata[]> {
  if (/\.pdf$/i.test(file.name)) return analizeazaPdf(file);
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const foi: Record<string, unknown[][]> = {};
  for (const n of wb.SheetNames) foi[n] = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1, defval: '' });

  // baza FC se recunoaște după prezența simultană a foilor de nomenclator, rețetar și food cost
  const numeFoi = wb.SheetNames.map(n => norm(n));
  if (numeFoi.some(n => n.includes('nomenclator')) && numeFoi.some(n => n.includes('retetar'))
      && numeFoi.some(n => n.includes('food cost'))) {
    const principala = wb.SheetNames.find(n => norm(n).includes('food cost'))!;
    return [{
      foaie: `${wb.SheetNames.length} foi (nomenclator + rețetar + food cost)`,
      randAntet: 3,
      parsat: { foaie: principala, antete: [], randuri: [], matrice: foi[principala], foi },
      tip: 'FC_BAZA', mapare: {}, dinContinut: [], lipsa: [], incredere: 100,
      note: ['Fișier complet de bază: se importă nomenclatorul, rețetarul și maparea produs → rețetă → canal → preț, dintr-o singură trecere'],
    }];
  }

  const rez: FoaieAnalizata[] = [];
  for (const nume of wb.SheetNames) {
    const matrice = foi[nume];
    if (!matrice.some(r => (r ?? []).some(c => val(c) !== ''))) continue;   // foaie goală
    const f = analizeazaFoaie(nume, matrice, file.name);
    f.parsat.foi = foi;
    rez.push(f);
  }
  return rez;
}

