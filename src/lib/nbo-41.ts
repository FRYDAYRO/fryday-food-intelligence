/**
 * Adaptorul raportului NBO 4.1 „Sales Journal" în formatul lui real (PDF de rezumat).
 *
 * Dovedit pe rapoartele reale (Timișoara, săptămâna 17–23.08.2026; „All Stores", 15–21.06.2026):
 *  · antet: restaurantul pe două rânduri (stânga) + „Fiscal Year / Period: N Week: N" (dreapta), sau
 *    „All Stores Start Date: mm/dd/yyyy" + „End Date: mm/dd/yyyy" pentru raportul de rețea;
 *  · un singur rezumat pe fereastră, NU un jurnal pe zile: „Net Sales", „Gross Sales", iar „Sales by
 *    Location" dă vânzările nete, numărul de bonuri și media pe Dine In / Take Out / Delivery / Drive Thru;
 *  · identitatea verificată: Σ canale = Net Sales (pe ambele rapoarte, la ban);
 *  · gramatica numerelor ca la 2.9 (RO sau americană), detectată din text.
 * Regula de canal (decizie de business, 06.09.2026): Take Out și Drive Thru intră la InStore;
 * Delivery rămâne Delivery. Rândul de vânzări se datează pe prima zi a ferestrei, iar versiunea
 * poartă fereastra întreagă — un raport săptămânal servește cererea săptămânii lui și lunile care o conțin.
 */
import type { Parsat } from './importer';
import { numar29, numar29EN } from './nbo-29';
import { LOCATIE_RETEA } from './fc-domeniu';

export type Canal41 = 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY' | 'DRIVE_THRU';
export interface Valoare41 { net: number; bonuri: number | null; mediu: number | null; }

export interface Raport41 {
  titlu: string | null;
  restaurant: string | null;
  /** „All Stores": raport de rețea, fără restaurant. */
  agregat: boolean;
  anFiscal: string | null;
  perioadaEticheta: string | null;
  de: string | null;
  la: string | null;
  format: 'RO' | 'EN';
  netSales: number | null;
  grossSales: number | null;
  /** Numărul total de bonuri (Guest Check Count de pe rândul Gross Sales). */
  bonuri: number | null;
  canale: Record<Canal41, Valoare41>;
  /** Σ canale față de Net Sales — identitatea raportului. */
  verificare: { sumaCanale: number; netSales: number | null; ok: boolean } | null;
  avertismente: string[];
}

export const esteRaport41 = (text: string): boolean => /4\.1\s+Sales Journal/i.test(text);

const ETICHETE: Record<Canal41, RegExp> = {
  DINE_IN: /^Dine In (?:Sales Net|Net Sales)\b/i,
  TAKE_OUT: /^Take Out (?:Net Sales|Sales Net)\b/i,
  DELIVERY: /^Delivery (?:Net Sales|Sales Net)\b/i,
  DRIVE_THRU: /^Drive Thru (?:Net Sales|Sales Net)\b/i,
};
const BANI_EN = /\(?-?\$[\d,]*\d(?:\.\d+)?\)?/g;
const BANI_RO = /\(?-?[\d.]*\d(?:,\d+)? lei\)?/g;
const NUM_EN = /^\(?[\d,]*\d(?:\.\d+)?\)?$/;
const NUM_RO = /^\(?[\d.]*\d(?:,\d+)?\)?$/;

const dataDin = (s: string): string | null => {
  const en = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (en) return `${en[3]}-${en[1].padStart(2, '0')}-${en[2].padStart(2, '0')}`;
  const ro = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  return ro ? `${ro[3]}-${ro[2]}-${ro[1]}` : null;
};

export function parseRaport41(text: string): Raport41 {
  const linii = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const format: 'RO' | 'EN' = /\(?\$\d/.test(text) ? 'EN' : 'RO';
  const BANI = format === 'EN' ? BANI_EN : BANI_RO;
  const NUM = format === 'EN' ? NUM_EN : NUM_RO;
  const numar = format === 'EN' ? numar29EN : numar29;
  const gol = (): Valoare41 => ({ net: 0, bonuri: null, mediu: null });
  const r: Raport41 = {
    titlu: null, restaurant: null, agregat: false, anFiscal: null, perioadaEticheta: null, de: null, la: null, format,
    netSales: null, grossSales: null, bonuri: null,
    canale: { DINE_IN: gol(), TAKE_OUT: gol(), DELIVERY: gol(), DRIVE_THRU: gol() },
    verificare: null, avertismente: [],
  };
  const fragmenteNume: string[] = [];
  let inAntet = true;
  for (const l of linii) {
    let m: RegExpExecArray | null;
    if ((m = /^(All Stores|Corporate|Multiple Selection)\s+Start Date:\s*(\S+)$/i.exec(l))) { r.agregat = true; r.de ??= dataDin(m[2]); continue; }
    if ((m = /^Start Date:\s*(\S+)$/i.exec(l))) { r.de ??= dataDin(m[1]); continue; }
    if ((m = /^End Date:\s*(\S+)$/i.exec(l))) { r.la ??= dataDin(m[1]); continue; }
    if ((m = /^(.*?)\s*Fiscal Year:\s*(\d{4})$/i.exec(l))) { if (m[1]) fragmenteNume.push(m[1].trim()); r.anFiscal ??= m[2]; continue; }
    if (/^4\.1 Sales Journal/i.test(l)) { r.titlu ??= l; continue; }
    if ((m = /^(.*?)\s*(Period|Week):\s*(.+)$/i.exec(l))) { if (m[1]) fragmenteNume.push(m[1].trim()); r.perioadaEticheta ??= `${m[2]} ${m[3].trim()}`; continue; }
    if ((m = /^(\S+)\s-\s(\S+)$/.exec(l)) && dataDin(m[1]) && dataDin(m[2])) { r.de ??= dataDin(m[1]); r.la ??= dataDin(m[2]); inAntet = false; continue; }
    if (/^Sales Cash Reconciliation/i.test(l)) inAntet = false;
    if (inAntet) continue;
    if ((m = /^Net Sales\s+(\S+)/i.exec(l)) && r.netSales === null) { r.netSales = numar(m[1]); continue; }
    // „Gross Sales" apare de două ori: în reconciliere (doar suma) și la „Sales by Location" (cu numărul de bonuri)
    if ((m = /^Gross Sales\s+(\S+)(?:\s+(\S+))?/i.exec(l))) {
      r.grossSales ??= numar(m[1]);
      const nr = m[2];
      if (nr !== undefined && NUM.test(nr)) r.bonuri = numar(nr);
      continue;
    }
    for (const [canal, re] of Object.entries(ETICHETE) as [Canal41, RegExp][]) {
      if (!re.test(l)) continue;
      const rest = l.replace(re, '').trim();
      const bani = [...(rest.match(BANI) ?? [])];
      const primul = bani[0];
      if (primul === undefined) { r.canale[canal] = gol(); break; }   // canal tipărit fără sumă = zero
      const net = numar(primul) ?? 0;
      const dupa = rest.slice(rest.indexOf(primul) + primul.length).trim().split(' ').filter(Boolean);
      const intai = dupa[0];
      const bonuri = intai !== undefined && NUM.test(intai) ? numar(intai) : null;
      const alDoilea = bani[1];
      const mediu = alDoilea !== undefined ? numar(alDoilea) : null;
      r.canale[canal] = { net, bonuri, mediu };
      break;
    }
  }
  if (!r.agregat && fragmenteNume.length) {
    const nume = fragmenteNume.join(' ').replace(/\s+/g, ' ').trim();
    if (nume && !/[$%]/.test(nume) && nume.length <= 60) r.restaurant = nume;
  }
  if (!r.de || !r.la) r.avertismente.push('Raportul nu declară fereastra (Start/End Date sau interval) — rămâne nedeclarată.');
  if (!r.restaurant && !r.agregat) r.avertismente.push('Raportul nu declară restaurantul în antet.');
  if (r.agregat) r.avertismente.push('Raport de rețea (All Stores): vânzările sunt ale întregii companii, fără restaurant — intră doar la nivel de companie.');
  if (r.netSales === null) r.avertismente.push('Raportul nu conține „Net Sales".');
  else {
    const suma = Math.round(Object.values(r.canale).reduce((s, c) => s + c.net, 0) * 100) / 100;
    const ok = Math.abs(suma - r.netSales) <= 0.04;
    r.verificare = { sumaCanale: suma, netSales: r.netSales, ok };
    if (!ok) r.avertismente.push(`Σ canale (${suma}) ≠ Net Sales (${r.netSales}): raportul nu se închide pe canale.`);
  }
  return r;
}

/** Antetele `Parsat`-ului produs de adaptor — ce recunoaște importatorul SALES. */
export const ANTETE_41 = ['Data', 'Locatie', 'Canal', 'Vanzari nete', 'Nr bonuri'] as const;

/**
 * Raportul ca `Parsat` pentru importul SALES: un rând pe canal al aplicației, datat pe prima zi a
 * ferestrei, cu fereastra întreagă declarată. InStore = Dine In + Take Out + Drive Thru (decizie
 * de business); Delivery = Delivery. Raportul de rețea intră pe locația rezervată a rețelei.
 */
export function parsatDin41(r: Raport41, foaie = 'PDF'): Parsat {
  const c = r.canale;
  const suma = (...v: Valoare41[]) => ({
    net: Math.round(v.reduce((s, x) => s + x.net, 0) * 100) / 100,
    bonuri: v.some(x => x.bonuri !== null) ? v.reduce((s, x) => s + (x.bonuri ?? 0), 0) : null,
  });
  const instore = suma(c.DINE_IN, c.TAKE_OUT, c.DRIVE_THRU);
  const delivery = suma(c.DELIVERY);
  const locatie = r.agregat ? LOCATIE_RETEA : (r.restaurant ?? '');
  const rand = (canal: 'INSTORE' | 'DELIVERY', v: { net: number; bonuri: number | null }) => ({
    Data: r.de ?? '', Locatie: locatie, Canal: canal, 'Vanzari nete': v.net, 'Nr bonuri': v.bonuri ?? '',
  });
  const randuri = [rand('INSTORE', instore), rand('DELIVERY', delivery)].filter(x => x['Vanzari nete'] > 0);
  return { foaie, antete: [...ANTETE_41], randuri, ...(r.de && r.la ? { fereastra: { de: r.de, la: r.la } } : {}) };
}

export function descrie41(r: Raport41): string {
  const cap = `Raport NBO 4.1${r.restaurant ? ` · ${r.restaurant}` : r.agregat ? ' · rețea (All Stores)' : ''}${r.de && r.la ? ` · ${r.de} → ${r.la}` : ' · fereastră nedeclarată'}${r.format === 'EN' ? ' · format american' : ''}`;
  const c = r.canale;
  const instore = c.DINE_IN.net + c.TAKE_OUT.net + c.DRIVE_THRU.net;
  return `${cap} · Net Sales ${(r.netSales ?? 0).toLocaleString('ro-RO')} · InStore (Dine In + Take Out + Drive Thru) ${instore.toLocaleString('ro-RO')} · Delivery ${c.DELIVERY.net.toLocaleString('ro-RO')}`
    + (r.verificare ? (r.verificare.ok ? ' · Σ canale = Net Sales' : ' · ATENȚIE: Σ canale ≠ Net Sales') : '')
    + ' · rezumat pe fereastră (fără zile)';
}
