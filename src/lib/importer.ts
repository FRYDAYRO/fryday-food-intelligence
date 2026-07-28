import * as XLSX from 'xlsx';
import type { AppState, Canal, ImportBatch, Ingredient, LinieReteta, Reteta, UMCod, VanzareFapt } from './types';
import { norm } from './engine';

export type TipImport = 'PMIX' | 'SALES' | 'FC29' | 'COST_INGREDIENTE' | 'RETETAR' | 'PRETURI_FURNIZORI';

export const TIP_LABEL: Record<TipImport, string> = {
  PMIX: 'PMIX (vânzări pe produs)',
  SALES: 'Sales Report NBO',
  FC29: 'Raport NBO 2.9',
  COST_INGREDIENTE: 'Cost ingrediente',
  RETETAR: 'Rețetar',
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
  COST_INGREDIENTE: {
    cod: ['cod ingredient', 'cod', 'cod articol'],
    denumire: ['denumire', 'ingredient', 'nume', 'denumire ingredient'],
    categorie: ['categorie', 'grupa'],
    tip: ['tip', 'fel'],
    um: ['um', 'um baza', 'unitate', 'unitate masura', 'u.m.'],
    pret: ['pret', 'pret net', 'pret unitar', 'cost', 'pret/um'],
    validDeLa: ['valabil de la', 'de la', 'data', 'valabilitate'],
    furnizor: ['furnizor', 'supplier'],
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
}

export async function citesteFisier(file: File): Promise<Parsat> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const foaie = wb.SheetNames[0];
  const ws = wb.Sheets[foaie];
  const randuri = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  const antete = randuri.length ? Object.keys(randuri[0]) : [];
  return { antete, randuri, foaie };
}

export function mapeazaAntete(antete: string[], tip: TipImport): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [camp, sinonime] of Object.entries(CAMPURI[tip])) {
    for (const a of antete) {
      const n = norm(a);
      if (sinonime.some(s => n === s || n.includes(s))) { map[camp] = a; break; }
    }
  }
  return map;
}

export function detecteazaTip(antete: string[], numeFisier: string): TipImport {
  const nf = norm(numeFisier);
  if (nf.includes('2.9') || nf.includes('29')) return 'FC29';
  if (nf.includes('pmix')) return 'PMIX';
  if (nf.includes('sales')) return 'SALES';
  if (nf.includes('furnizor') || nf.includes('supplier') || nf.includes('ofert')) return 'PRETURI_FURNIZORI';
  if (nf.includes('retet')) return 'RETETAR';
  if (nf.includes('ingredient') || nf.includes('cost')) return 'COST_INGREDIENTE';
  const cerute: Record<TipImport, string[]> = {
    PMIX: ['data', 'produs', 'cant'],
    SALES: ['data', 'locatie', 'net'],
    FC29: ['perioada', 'categorie', 'valoare'],
    COST_INGREDIENTE: ['cod', 'pret'],
    RETETAR: ['reteta', 'comp', 'cant'],
    PRETURI_FURNIZORI: ['furnizor', 'ing', 'pret'],
  };
  const scoruri = (Object.keys(CAMPURI) as TipImport[]).map(t => {
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

export interface RezultatImport { stateNou: AppState; batch: ImportBatch; }

export function campuriTip(tip: TipImport): string[] { return Object.keys(CAMPURI[tip]); }

export function importa(tip: TipImport, p: Parsat, numeFisier: string, state: AppState,
  mapare?: Record<string, string>): RezultatImport {
  const auto = mapeazaAntete(p.antete, tip);
  const map: Record<string, string> = { ...auto };
  if (mapare) for (const [c, a] of Object.entries(mapare)) { if (a) map[c] = a; else delete map[c]; }
  const avert: string[] = [];
  const erori: string[] = [];
  const g = (r: Record<string, unknown>, c: string) => (map[c] !== undefined ? r[map[c]] : '');
  let importate = 0;
  let stateNou = state;

  const lipsesc = (obligatorii: string[]) =>
    obligatorii.filter(c => map[c] === undefined);

  if (tip === 'PMIX') {
    const lipsa = lipsesc(['data', 'produs', 'cant']);
    if (lipsa.length) erori.push(`Coloane negăsite: ${lipsa.join(', ')}`);
    else {
      const produseCunoscute = new Set(state.produse.map(x => x.cod));
      const necunoscute = new Set<string>();
      const noi: VanzareFapt[] = [];
      const canalFisier = detecteazaCanal('', numeFisier);
      p.randuri.forEach((r, i) => {
        const data = parseData(g(r, 'data'));
        const cod = String(g(r, 'produs')).trim();
        const cant = parseNumar(g(r, 'cant'));
        if (!data || !cod || cant == null) { if (String(g(r, 'produs')).trim() || g(r, 'cant')) avert.push(`Rând ${i + 2}: date incomplete — ignorat`); return; }
        const canal = detecteazaCanal(g(r, 'canal'), numeFisier) ?? canalFisier;
        if (!canal) { avert.push(`Rând ${i + 2}: canal neidentificat — ignorat`); return; }
        if (!produseCunoscute.has(cod)) { necunoscute.add(cod); return; }
        const locatie = String(g(r, 'locatie')).trim() || state.locatii[0].cod;
        const prod = state.produse.find(x => x.cod === cod)!;
        const brut = parseNumar(g(r, 'brut'));
        const discount = parseNumar(g(r, 'discount')) ?? 0;
        let net = parseNumar(g(r, 'net'));
        if (net == null) {
          const b = brut ?? (canal === 'INSTORE' ? (prod.pretInstore ?? 0) : (prod.pretDelivery ?? 0)) * cant;
          net = (b - discount) / (1 + prod.tva / 100);
        }
        noi.push({ data, locatie, canal, produs: cod, cant, brut: brut ?? net * (1 + prod.tva / 100), net });
      });
      necunoscute.forEach(c => avert.push(`Cod produs nemapat în nomenclator: ${c} — rânduri ignorate`));
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
      stateNou = { ...state, vanzari: [...pastrate, ...agg.values()] };
    }
  } else if (tip === 'SALES') {
    const lipsa = lipsesc(['data', 'locatie']);
    if (lipsa.length || (map.net === undefined && map.brut === undefined)) erori.push(`Coloane negăsite: ${[...lipsa, map.net === undefined && map.brut === undefined ? 'net/brut' : ''].filter(Boolean).join(', ')}`);
    else {
      const noi = p.randuri.flatMap((r, i) => {
        const data = parseData(g(r, 'data'));
        const locatie = String(g(r, 'locatie')).trim();
        const canal = detecteazaCanal(g(r, 'canal'), numeFisier);
        const net = parseNumar(g(r, 'net')) ?? (parseNumar(g(r, 'brut')) ?? 0) / 1.1;
        if (!data || !locatie || !canal || !net) { avert.push(`Rând ${i + 2}: date incomplete — ignorat`); return []; }
        return [{ data, locatie, canal, net, brut: parseNumar(g(r, 'brut')) ?? undefined, bonuri: parseNumar(g(r, 'bonuri')) ?? undefined }];
      });
      const chei = new Set(noi.map(v => `${v.data}|${v.locatie}|${v.canal}`));
      importate = noi.length;
      stateNou = { ...state, salesReport: [...state.salesReport.filter(v => !chei.has(`${v.data}|${v.locatie}|${v.canal}`)), ...noi] };
    }
  } else if (tip === 'FC29') {
    const lipsa = lipsesc(['categorie', 'valoare']);
    if (lipsa.length) erori.push(`Coloane negăsite: ${lipsa.join(', ')}`);
    else {
      const noi = p.randuri.flatMap((r, i) => {
        const perioada = parsePerioada(g(r, 'perioada'));
        const categorie = String(g(r, 'categorie')).trim();
        const valoare = parseNumar(g(r, 'valoare'));
        if (!perioada || !categorie || valoare == null) { if (categorie) avert.push(`Rând ${i + 2}: date incomplete — ignorat`); return []; }
        const locatie = String(g(r, 'locatie')).trim() || state.locatii[0].cod;
        return [{ perioada, locatie, categorie, valoare }];
      });
      const perechi = new Set(noi.map(l => `${l.perioada}|${l.locatie}`));
      importate = noi.length;
      stateNou = { ...state, linii29: [...state.linii29.filter(l => !perechi.has(`${l.perioada}|${l.locatie}`)), ...noi] };
    }
  } else if (tip === 'COST_INGREDIENTE') {
    const lipsa = lipsesc(['cod', 'pret']);
    if (lipsa.length) erori.push(`Coloane negăsite: ${lipsa.join(', ')}`);
    else {
      const ingrediente = state.ingrediente.map(x => ({ ...x, preturi: [...x.preturi] }));
      const azi = new Date().toISOString().slice(0, 10);
      p.randuri.forEach((r, i) => {
        const cod = String(g(r, 'cod')).trim();
        const pret = parseNumar(g(r, 'pret'));
        if (!cod || pret == null) { if (cod) avert.push(`Rând ${i + 2}: preț invalid — ignorat`); return; }
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
        const vechi = ing.preturi.length ? ing.preturi[ing.preturi.length - 1].pret : null;
        if (vechi != null && vechi > 0 && Math.abs(pret - vechi) / vechi * 100 > state.setari.pragAlertaPret) {
          avert.push(`Preț ${ing.denumire}: ${vechi} → ${pret} lei (variație > ${state.setari.pragAlertaPret}%)`);
        }
        ing.preturi = [...ing.preturi.filter(x => x.validDeLa !== validDeLa), { validDeLa, pret }]
          .sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
        importate++;
      });
      stateNou = { ...state, ingrediente };
    }
  } else if (tip === 'PRETURI_FURNIZORI') {
    const lipsa = lipsesc(['furnizor', 'ing', 'pret']);
    if (lipsa.length) erori.push(`Coloane negăsite: ${lipsa.join(', ')}`);
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
  } else if (tip === 'RETETAR') {
    const lipsa = lipsesc(['reteta', 'comp', 'cant']);
    if (lipsa.length) erori.push(`Coloane negăsite: ${lipsa.join(', ')}`);
    else {
      const grupe = new Map<string, Record<string, unknown>[]>();
      for (const r of p.randuri) {
        const cod = String(g(r, 'reteta')).trim();
        if (!cod) continue;
        const arr = grupe.get(cod) ?? [];
        arr.push(r); grupe.set(cod, arr);
      }
      const retete = state.retete.map(x => ({ ...x, versiuni: [...x.versiuni] }));
      const azi = new Date().toISOString().slice(0, 10);
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
        const nr = (ret.versiuni[ret.versiuni.length - 1]?.nr ?? 0) + 1;
        ret.versiuni = [...ret.versiuni, {
          nr, data: azi, nota: `Import ${numeFisier}`, linii,
          randament: eSPReteta ? { cant: randCant ?? 1, um: randUm } : undefined,
        }];
        ret.activa = nr;
        importate++;
      }
      stateNou = { ...state, retete };
    }
  }

  const batch: ImportBatch = {
    id: idBatch(), tip: TIP_LABEL[tip], fisier: numeFisier, data: new Date().toISOString(),
    randuri: p.randuri.length, importate,
    avertismente: avert.slice(0, 40), erori,
    status: erori.length ? 'ESUAT' : 'IMPORTAT',
  };
  if (erori.length) stateNou = state;
  return { stateNou: { ...stateNou, importuri: [batch, ...stateNou.importuri] }, batch };
}
