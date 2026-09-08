/**
 * Adaptorul raportului NBO 2.8 „Spoilage and Loss" în formatul lui real (PDF de listă).
 *
 * Dovedit pe raportul real (Cluj, 08.2026, 157 evenimente, 4 pagini):
 *  · antet: restaurantul + „Fiscal Year", titlul, „Period: N", „dd.mm.yyyy - dd.mm.yyyy";
 *  · coloane: Description, ItemID, Reason, By, Inventory Units, Qty. Lost, Cost/Unit, Extension;
 *  · grupuri („DESERT*", „Food 11%", „FRYCafe 21%") cu „Total: <grup> X lei" și „Grand Total: X lei";
 *  · rândurile NU au dată: fereastra e a raportului; Cost/Unit e evaluarea proprie a 2.8;
 *  · forme de tipărire: „lei"-ul coloanei Cost/Unit cade pe rândul următor și se lipește de
 *    numele evenimentului următor („Sos Cheddar BIB lei" + „4064 End of Day … 11,27 lei"), o
 *    linie singură „lei", continuări de nume („72", „70G", „crocanta"), „lei" rătăcit în totalul
 *    de grup („Total: Food 11% lei 1.295,69 lei").
 * Ce nu se poate citi rămâne raportat în `nerecunoscute`, nu dispare.
 */
import type { Parsat } from './importer';
import { etichetaScopRetea } from './fc-domeniu';

export interface Rand28 {
  /** Linia din textul PDF pe care începe rândul (1 = prima linie). */
  rand: number;
  categorie: string;
  itemId: string;
  item: string;
  motiv: string;
  utilizator: string;
  um: string;
  cant: number;
  /** Cost/Unit tipărit de 2.8 — evaluarea raportului, nu Cost per Unit din 2.9. */
  costUnitar: number;
  /** Extension tipărit. */
  lei: number;
}

export interface Verificare28 { categorie: string; calculat: number; declarat: number; toleranta: number; ok: boolean; }

export interface Raport28 {
  titlu: string | null;
  restaurant: string | null;
  anFiscal: string | null;
  perioadaEticheta: string | null;
  de: string | null;
  la: string | null;
  format: Format28;
  agregat: boolean;
  randuri: Rand28[];
  totaluri: { categorie: string; lei: number }[];
  totalGeneral: number | null;
  nerecunoscute: { rand: number; text: string }[];
  verificari: Verificare28[];
  /** Rânduri la care Extension ≠ Qty × Cost/Unit peste toleranța de rotunjire (listate, nu corectate). */
  extensiiNeinchise: { rand: number; itemId: string; calculat: number; tiparit: number }[];
  avertismente: string[];
}

/**
 * Gramatica numerelor, ca la 2.9: RO („3,00", „9,55 lei", dd.mm.yyyy) sau EN („3.00", „$9.55", m/d/yyyy).
 * Se decide din text („$" în fața cifrelor). Pe raportul real Cluj e RO; formatul EN al 2.8 e dedus
 * din gramatica 2.9 și verificat doar pe fixturi, până la un raport real în acest format.
 */
export type Format28 = 'RO' | 'EN';
interface Gramatica28 { format: Format28; NUM: RegExp; BANI: RegExp; numar: (s: string) => number; data: (s: string) => string | null; interval: RegExp; }
const NUM_RO = /^-?[\d.]*\d(?:,\d+)?$/;
const NUM_EN = /^-?[\d,]*\d(?:\.\d+)?$/;
const numarRO = (s: string): number => Number(s.replace(/\./g, '').replace(',', '.'));
const numarEN = (s: string): number => Number(s.replace(/[$,]/g, ''));
const dataEN = (d: string): string | null => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d.trim());
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
};
const GRAMATICA: Record<Format28, Gramatica28> = {
  RO: { format: 'RO', NUM: NUM_RO, BANI: NUM_RO, numar: numarRO, data: (d: string) => iso(d), interval: /^(\d{2}\.\d{2}\.\d{4}) - (\d{2}\.\d{2}\.\d{4})$/ },
  EN: { format: 'EN', NUM: NUM_EN, BANI: /^\$[\d,]*\d(?:\.\d+)?$/, numar: numarEN, data: dataEN, interval: /^(\d{1,2}\/\d{1,2}\/\d{4}) - (\d{1,2}\/\d{1,2}\/\d{4})$/ },
};
export const detecteazaFormat28 = (text: string): Format28 => (/\$\d/.test(text) ? 'EN' : 'RO');

const UM_INVENTAR = /^(ea|each|kg|liter|litre|ltr|lt|l|ml|gram|grams|gr|g|pair|pairs|buc|pcs|pc)$/i;
const ITEM_ID = /^\d{1,8}$/;
const TITLU = /2\.8\s+Spoilage and Loss/i;
const DATA_RO = /^(\d{2})\.(\d{2})\.(\d{4})$/;

const iso = (d: string): string | null => {
  const m = DATA_RO.exec(d.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

export const esteRaport28 = (text: string): boolean => TITLU.test(text);

/**
 * Grila 2.8 dintr-o linie: RO `<nume> <ItemID> <motiv…> <utilizator> <UM> <cant> <cost> [lei] <ext> lei`,
 * EN `<nume> <ItemID> <motiv…> <utilizator> <UM> <cant> $<cost> $<ext>`.
 */
function citesteRand(linie: string, g: Gramatica28): Omit<Rand28, 'rand' | 'categorie'> | null {
  let tok = linie.split(' ');
  if (tok.length < 6) return null;
  if (g.format === 'RO') {
    if (tok[tok.length - 1].toLowerCase() !== 'lei') return null;
    tok = tok.slice(0, -1);
  }
  const ext = tok.pop()!;
  if (!g.BANI.test(ext)) return null;
  if (g.format === 'RO' && tok[tok.length - 1]?.toLowerCase() === 'lei') tok.pop();
  const cost = tok.pop()!;
  const cant = tok.pop()!;
  const um = tok.pop()!;
  if (!g.BANI.test(cost) || !g.NUM.test(cant) || !UM_INVENTAR.test(um)) return null;
  const utilizator = tok.pop() ?? '';
  if (!utilizator) return null;
  // motivul: cuvintele dintre ItemID (ultimul jeton numeric din stânga utilizatorului) și utilizator
  let i = tok.length - 1;
  while (i >= 0 && !ITEM_ID.test(tok[i])) i--;
  if (i < 0) return null;
  const itemId = tok[i];
  const motiv = tok.slice(i + 1).join(' ');
  const item = tok.slice(0, i).join(' ');
  return { itemId, item, motiv, utilizator, um, cant: g.numar(cant), costUnitar: g.numar(cost), lei: g.numar(ext) };
}

export function parseRaport28(text: string): Raport28 {
  const linii = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim());
  const g = GRAMATICA[detecteazaFormat28(text)];
  const BAN = g.format === 'RO' ? '(?:lei )?(-?[\\d.]*\\d(?:,\\d+)?) lei' : '(\\$[\\d,]*\\d(?:\\.\\d+)?)';
  const TOTAL = new RegExp(`^Total: (.+?) ${BAN}$`);
  const GRAND = new RegExp(`^Grand Total: ${BAN}$`);
  const r: Raport28 = {
    titlu: null, restaurant: null, anFiscal: null, perioadaEticheta: null, de: null, la: null, format: g.format, agregat: false,
    randuri: [], totaluri: [], totalGeneral: null, nerecunoscute: [], verificari: [], extensiiNeinchise: [], avertismente: [],
  };
  let categorie: string | null = null;
  let precedent: 'RAND' | 'TOTAL' | 'CADRU' | 'GRUP' | null = null;
  let numePendinte: string | null = null;
  const perioadeVazute = new Set<string>();

  linii.forEach((l, idx) => {
    const nr = idx + 1;
    if (!l) return;
    // ——— cadrul paginii
    if (/^=== PAGINA \d+ ===$/.test(l)) { precedent = 'CADRU'; return; }
    const an = /^(.*?) Fiscal Year: (\d{4})$/.exec(l);
    if (an) {
      // ca la 2.9: „Corporate Fiscal Year" declară scopul, nu un restaurant pe nume „Corporate"
      const scop = etichetaScopRetea(an[1]);
      if (scop) r.agregat = true; else r.restaurant ??= an[1].trim();
      r.anFiscal ??= an[2]; precedent = 'CADRU'; return;
    }
    if (TITLU.test(l)) { r.titlu ??= l; precedent = 'CADRU'; return; }
    const per = /^(Period|Week): (.+)$/.exec(l);
    if (per) { r.perioadaEticheta ??= l; precedent = 'CADRU'; return; }
    const interval = g.interval.exec(l);
    if (interval) {
      const de = g.data(interval[1]), la = g.data(interval[2]);
      if (de && la) { perioadeVazute.add(`${de}|${la}`); r.de ??= de; r.la ??= la; }
      precedent = 'CADRU'; return;
    }
    const start = /^(Corporate\s+)?Start Date:\s*(\S+)$/i.exec(l);
    if (start) { if (start[1]) r.agregat = true; const de = g.data(start[2]) ?? iso(start[2]) ?? dataEN(start[2]); if (de) r.de ??= de; precedent = 'CADRU'; return; }
    const end = /^End Date:\s*(\S+)$/i.exec(l);
    if (end) { const la = g.data(end[1]) ?? iso(end[1]) ?? dataEN(end[1]); if (la) r.la ??= la; precedent = 'CADRU'; return; }
    if (/^Inventory Qty\. Cost\/$/.test(l) || /^Description ItemID Reason By/.test(l)) { precedent = 'CADRU'; return; }
    if (/^V [\d.]+ - \d+ - .*Copyright/.test(l)) { precedent = 'CADRU'; return; }
    // ——— totaluri (cu „lei" rătăcit admis înaintea sumei)
    const tg = GRAND.exec(l);
    if (tg) { r.totalGeneral = g.numar(tg[1]); precedent = 'TOTAL'; return; }
    const tot = TOTAL.exec(l);
    if (tot) { r.totaluri.push({ categorie: tot[1].trim(), lei: g.numar(tot[2]) }); precedent = 'TOTAL'; numePendinte = null; return; }
    // ——— „lei"-ul rătăcit al coloanei Cost/Unit, singur pe linie
    if (/^lei$/i.test(l)) return;
    // ——— rând de eveniment
    const rand = citesteRand(l, g);
    if (rand) {
      const item = rand.item || numePendinte || '';
      numePendinte = null;
      if (!item) { r.nerecunoscute.push({ rand: nr, text: l }); precedent = 'RAND'; return; }
      r.randuri.push({ rand: nr, categorie: categorie ?? '', ...rand, item });
      precedent = 'RAND';
      return;
    }
    // ——— „<nume> lei": numele evenimentului următor, cu „lei"-ul coloanei Cost/Unit lipit de el
    const cuLei = /^(.+?) lei$/i.exec(l);
    if (g.format === 'RO' && cuLei && !/\d,\d/.test(l)) { numePendinte = cuLei[1]; return; }
    // ——— un rând de material care nu s-a putut citi (are sume, dar nu grila întreagă)
    if ((/\d,\d{2}/.test(l) && /lei/i.test(l)) || (g.format === 'EN' && /\$\d/.test(l))) { r.nerecunoscute.push({ rand: nr, text: l }); precedent = 'RAND'; return; }
    // ——— continuare de nume (după un rând) sau antet de grup
    const scurta = /^[\p{L}\d%.,()\-/]{1,8}$/u.test(l) && !/^[A-Z][A-Za-z]+ \d+%$/.test(l);
    if (precedent === 'RAND' && r.randuri.length && !/^(Food|Paper|DESERT|FRYCafe|Alcool|Drinks|Diverse)/i.test(l)) {
      r.randuri[r.randuri.length - 1].item += ` ${l}`;
      return;
    }
    if (precedent === 'CADRU' && scurta && r.randuri.length && !/%$/.test(l)) {
      r.randuri[r.randuri.length - 1].item += ` ${l}`;
      return;
    }
    categorie = l;
    precedent = 'GRUP';
  });

  if (perioadeVazute.size > 1) r.avertismente.push(`Paginile declară perioade diferite: ${[...perioadeVazute].map(p => p.split('|').join(' → ')).join(', ')} — s-a păstrat prima.`);
  if (!r.de || !r.la) r.avertismente.push('Raportul nu declară perioada (dd.mm.yyyy - dd.mm.yyyy) — fereastra rămâne nedeclarată.');
  if (!r.restaurant && !r.agregat) r.avertismente.push('Raportul nu declară restaurantul în antet.');
  if (r.agregat) r.avertismente.push('Raport consolidat (Corporate): evenimentele sunt ale întregii companii, fără restaurant — nu se pot potrivi cu ajustările unui restaurant.');
  if (r.nerecunoscute.length) r.avertismente.push(`${r.nerecunoscute.length} rânduri nu s-au putut citi (liniile ${r.nerecunoscute.slice(0, 5).map(x => x.rand).join(', ')}${r.nerecunoscute.length > 5 ? '…' : ''}).`);

  // Extension = Qty × Cost/Unit: NBO calculează din costul nerotunjit, deci toleranța crește cu cantitatea
  for (const x of r.randuri) {
    const calculat = Math.round(x.cant * x.costUnitar * 100) / 100;
    if (Math.abs(calculat - x.lei) > 0.005 * x.cant + 0.01) r.extensiiNeinchise.push({ rand: x.rand, itemId: x.itemId, calculat, tiparit: x.lei });
  }
  if (r.extensiiNeinchise.length) r.avertismente.push(`${r.extensiiNeinchise.length} rânduri la care Extension ≠ Qty × Cost/Unit peste rotunjire — s-a păstrat Extension tipărit.`);
  const peCat = new Map<string, { suma: number; n: number }>();
  for (const x of r.randuri) { const e = peCat.get(x.categorie) ?? { suma: 0, n: 0 }; e.suma += x.lei; e.n++; peCat.set(x.categorie, e); }
  for (const t of r.totaluri) {
    const e = peCat.get(t.categorie);
    if (!e) continue;
    const calculat = Math.round(e.suma * 100) / 100;
    const toleranta = 0.01 * e.n + 0.01;
    const ok = Math.abs(calculat - t.lei) <= toleranta;
    r.verificari.push({ categorie: t.categorie, calculat, declarat: t.lei, toleranta, ok });
    if (!ok) r.avertismente.push(`Grupul „${t.categorie}": rândurile însumează ${calculat} lei, totalul declarat e ${t.lei} lei.`);
  }
  if (r.totalGeneral !== null) {
    const suma = Math.round(r.randuri.reduce((s, x) => s + x.lei, 0) * 100) / 100;
    const toleranta = 0.01 * r.randuri.length + 0.01;
    if (Math.abs(suma - r.totalGeneral) > toleranta) r.avertismente.push(`Totalul general: rândurile însumează ${suma} lei, raportul declară ${r.totalGeneral} lei.`);
  } else if (r.randuri.length) r.avertismente.push('Raportul nu declară totalul general (linia „Grand Total:").');
  return r;
}

/** Antetele `Parsat`-ului produs de adaptor — ce recunoaște importatorul WASTE_28. */
export const ANTETE_28 = [
  'Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Grup raport', 'Motiv', 'Utilizator',
  'Cantitate', 'UM', 'Cost unitar', 'Valoare', 'Rand sursa',
] as const;

export function parsatDin28(r: Raport28, foaie = 'PDF'): Parsat {
  const perioada = r.de ? r.de.slice(0, 7) : null;
  const randuri = r.randuri.map(x => ({
    ...(perioada ? { Perioada: perioada } : {}),
    Locatie: r.restaurant ?? '',
    'Cod material': x.itemId,
    'Denumire material': x.item,
    'Grup raport': x.categorie,
    Motiv: x.motiv,
    Utilizator: x.utilizator,
    Cantitate: x.cant,
    UM: x.um,
    'Cost unitar': x.costUnitar,
    Valoare: x.lei,
    'Rand sursa': x.rand,
  }));
  return {
    foaie, antete: ANTETE_28.filter(a => perioada || a !== 'Perioada'), randuri,
    ...(r.de && r.la ? { fereastra: { de: r.de, la: r.la } } : {}),
  };
}

export function descrie28(r: Raport28): string {
  const cap = `Raport NBO 2.8${r.restaurant ? ` · ${r.restaurant}` : r.agregat ? ' · consolidat (Corporate)' : ''}${r.de && r.la ? ` · ${r.de} → ${r.la}` : ' · perioadă nedeclarată'}${r.format === 'EN' ? ' · format american' : ''}`;
  const lei = Math.round(r.randuri.reduce((s, x) => s + x.lei, 0) * 100) / 100;
  const verif = r.verificari.length ? `${r.verificari.filter(v => v.ok).length}/${r.verificari.length} grupuri verificate pe total` : 'fără totaluri de grup';
  const motive = [...new Set(r.randuri.map(x => x.motiv))];
  return `${cap} · ${r.randuri.length} evenimente · ${lei.toLocaleString('ro-RO')} lei (evaluarea 2.8) · motive: ${motive.join(', ') || '—'} · ${verif}`
    + (r.totalGeneral !== null ? ` · Grand Total ${r.totalGeneral.toLocaleString('ro-RO')} lei` : '')
    + (r.nerecunoscute.length ? ` · ${r.nerecunoscute.length} rânduri necitite` : '');
}
