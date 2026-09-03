/**
 * Adaptorul raportului NBO 2.9 „Food Cost - Inventory With Adjustments Summary" în formatul
 * lui real: PDF-ul de grilă tipărit de NCR, citit ca text (pdf.js, `textDinPdf`).
 *
 * Ce păstrează, pe fiecare rând: Item ID, Item, Inv Unit, Cost per Unit, Usage
 * Actual/Theory/Variance în unități și în lei, procentele, grupul de categorie (și părintele
 * lui, când raportul e imbricat), perioada și restaurantul din antet, poziția rândului sursă.
 *
 * Ce NU face: nu clasifică, nu mapează materiale, nu calculează prețuri. Întoarce raportul
 * așa cum e, cu verificările lui interne (totalurile pe grup și totalul general), și un
 * `Parsat` pe care Import Center-ul îl tratează ca pe orice 2.9 pe material.
 *
 * Particularitățile extragerii din PDF, rezolvate aici:
 *   · denumirile lungi se rup pe rândul următor („Corona 0,33 - SGR 24" + „BUC/BAX- new2026");
 *   · numerele lungi se rup și ele în celulă („20.160," + „0", „(1.080," + „0)", „(2.226,10" +
 *     „lei)"), iar bucățile ajung pe rândul următor, în ordinea coloanelor;
 *   · antetele de grup sunt tipărite de două ori; un subgrup stă sub părintele lui
 *     („Paper" → „ACCESORII"); după totalul subgrupului, părintele se retipărește o dată;
 *   · antetul paginii (restaurant, perioadă, coloane) și subsolul se repetă pe fiecare pagină.
 */
import type { Parsat } from './importer';

export interface Trio { actual: number; teoretic: number; varianta: number; }

export interface Rand29 {
  /** Linia din textul PDF pe care stă rândul (1 = prima linie). */
  rand: number;
  /** Grupul părinte, când raportul imbrică subgrupuri; altfel `null`. */
  grup: string | null;
  /** Antetul de grup sub care stă rândul, exact ca în raport. */
  categorie: string;
  itemId: string;
  item: string;
  /** „Inv Unit" — unitatea de inventar în care e exprimat costul pe unitate. */
  umInventar: string;
  stocInitial: number;
  achizitii: number;
  ajustari: number;
  transferuri: number;
  stocFinal: number;
  /** „Cost per Unit" — lei pe unitatea de inventar. */
  costPeUnitate: number;
  /** „End Ext" — valoarea stocului final, lei. */
  valoareStocFinal: number;
  zileStoc: number;
  consumUnitati: Trio;
  consumLei: Trio;
  consumPct: Trio;
}

export interface Total29 {
  categorie: string;
  valoareStocFinal: number;
  consumLei: Trio;
  consumPct: Trio;
}

export interface Verificare29 {
  categorie: string;
  /** Suma consumului actual (lei) pe rândurile grupului. */
  calculat: number;
  declarat: number;
  /** Rândurile sunt rotunjite la leu în raport: diferența admisă crește cu numărul lor. */
  toleranta: number;
  ok: boolean;
}

export interface Raport29 {
  titlu: string | null;
  restaurant: string | null;
  anFiscal: string | null;
  /** „Period: 8" / „Week: 32" — eticheta de perioadă a raportului, așa cum o tipărește NBO. */
  perioadaEticheta: string | null;
  de: string | null;
  la: string | null;
  randuri: Rand29[];
  totaluri: Total29[];
  totalGeneral: { vanzari: number; valoareStocFinal: number; consumLei: Trio; consumPct: Trio } | null;
  /** Rânduri care arată a rânduri de material, dar nu s-au putut citi — cu textul lor. */
  nerecunoscute: { rand: number; text: string }[];
  verificari: Verificare29[];
  avertismente: string[];
}

const NUM = /^\(?-?[\d.]*\d(?:,\d+)?\)?$/;
const LEI = /^\(?-?[\d.]*\d(?:,\d+)? lei\)?$/;
const PCT = /^\(?-?[\d.]*\d(?:,\d+)?%\)?$/;
const UM_INVENTAR = /^(ea|each|kg|liter|litre|ltr|lt|l|ml|gram|grams|gr|g|pair|pairs|buc|pcs|pc)$/i;
const ITEM_ID = /^\d{3,8}$/;

/** Ordinea coloanelor numerice ale grilei, după „Inv Unit": ce fel de valoare stă în fiecare. */
const COLOANE: ('NUM' | 'LEI' | 'PCT')[] = [
  'NUM', 'NUM', 'NUM', 'NUM', 'NUM',   // Beg Inv, Pur Units, Inv Adj, Inv Trans, End Inv
  'LEI', 'LEI',                         // Cost per Unit, End Ext
  'NUM',                                // Days On Hand
  'NUM', 'NUM', 'NUM',                  // Usage in Units: Actual, Theory, Variance
  'LEI', 'LEI', 'LEI',                  // Usage in Dollars
  'PCT', 'PCT', 'PCT',                  // Usage in Percent
];
const REGEX: Record<'NUM' | 'LEI' | 'PCT', RegExp> = { NUM, LEI, PCT };

/** Număr în format românesc, cu paranteze pentru negativ: „1.610,35 lei" → 1610.35, „(264,0)" → −264. */
export function numar29(s: string): number | null {
  let t = s.trim().replace(/\s*(lei|%)\s*/gi, '');
  const neg = /^\(.*\)$/.test(t) || t.startsWith('-');
  t = t.replace(/[()\-]/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return neg ? -n : n;
}

const dataRO = (s: string): string | null => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const STRUCTURA = [
  /^Total:\s/, /^Totals:\s/, /^V\s\d+\.\d/, /Fiscal Year:/i, /^2\.9 Food Cost/i, /^Period:\s/i, /^Week:\s/i,
  /^\d{2}\.\d{2}\.\d{4}\s-\s\d{2}\.\d{2}\.\d{4}$/, /^Usage in Units/i, /^Raw Material/i, /^Item Name/i, /copyright/i,
];
const eStructura = (l: string) => STRUCTURA.some(re => re.test(l));

/** Textul e raportul 2.9 al NBO? Se decide din titlul tipărit pe fiecare pagină, nu din numele fișierului. */
export function esteRaport29(text: string): boolean {
  return /2\.9\s+Food Cost\s*-\s*Inventory/i.test(text);
}

interface Deschis { index: number; fel: 'CIFRE' | 'LEI'; }

/** Câmpurile unui rând de material — după „Inv Unit", cu „lei" lipit de numărul lui. */
function campuri(tokens: string[]): string[] {
  const rez: string[] = [];
  for (const t of tokens) {
    if (/^lei\)?$/i.test(t) && rez.length) rez[rez.length - 1] += ` ${t}`;
    else rez.push(t);
  }
  return rez;
}

/** Ce câmpuri sunt rupte în celulă și ce bucată le lipsește. */
function deschise(c: string[]): Deschis[] {
  const rez: Deschis[] = [];
  c.forEach((v, i) => {
    const fel = COLOANE[i];
    if (REGEX[fel].test(v)) return;
    if (/[,.]$/.test(v) || (v.startsWith('(') && !v.includes(')') && fel !== 'LEI')) rez.push({ index: i, fel: 'CIFRE' });
    else if (fel === 'LEI' && !/lei/i.test(v)) rez.push({ index: i, fel: 'LEI' });
    else if (v.startsWith('(') && !v.includes(')')) rez.push({ index: i, fel: 'LEI' });
  });
  return rez;
}

const lipeste = (v: string, bucata: string) => (/^lei/i.test(bucata) ? `${v} ${bucata}` : `${v}${bucata}`);

/** Un rând de material, dacă linia are forma grilei: nume … ItemID InvUnit + 17 câmpuri. */
function candidat(l: string): { nume: string; itemId: string; um: string; campuri: string[] } | null {
  const tokens = l.split(' ');
  for (let i = 0; i + 1 < tokens.length; i++) {
    if (!ITEM_ID.test(tokens[i]) || !UM_INVENTAR.test(tokens[i + 1])) continue;
    const c = campuri(tokens.slice(i + 2));
    if (c.length !== COLOANE.length) continue;
    return { nume: tokens.slice(0, i).join(' ').trim(), itemId: tokens[i], um: tokens[i + 1], campuri: c };
  }
  return null;
}

const trio = (a: number, t: number, v: number): Trio => ({ actual: a, teoretic: t, varianta: v });

/**
 * Citește raportul 2.9 din textul lui (liniile reconstruite din PDF). Pur: nu atinge starea,
 * nu clasifică, nu mapează. Ce nu se poate citi rămâne în `nerecunoscute`, nu dispare.
 */
export function parseRaport29(text: string): Raport29 {
  const linii = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim());
  const r: Raport29 = {
    titlu: null, restaurant: null, anFiscal: null, perioadaEticheta: null, de: null, la: null,
    randuri: [], totaluri: [], totalGeneral: null, nerecunoscute: [], verificari: [], avertismente: [],
  };
  let grup: string | null = null;
  let categorie: string | null = null;
  let precedent: 'DATE' | 'STRUCTURA' | 'ANTET' | 'CONTINUARE' | null = null;
  let antetPrecedent: string | null = null;
  // rândul în curs de completare: bucățile de celulă rupte și continuarea denumirii
  let inCurs: { rand: Rand29 | null; nume: string; itemId: string; um: string; campuri: string[]; deschise: Deschis[]; linie: number; text: string } | null = null;
  const perioadeVazute = new Set<string>();

  const inchide = () => {
    if (!inCurs) return;
    const c = inCurs.campuri;
    const valide = c.every((v, i) => REGEX[COLOANE[i]].test(v));
    if (!valide) {
      r.nerecunoscute.push({ rand: inCurs.linie, text: inCurs.text });
    } else {
      const n = c.map(numar29) as number[];
      r.randuri.push({
        rand: inCurs.linie, grup, categorie: categorie ?? '', itemId: inCurs.itemId, item: inCurs.nume, umInventar: inCurs.um,
        stocInitial: n[0], achizitii: n[1], ajustari: n[2], transferuri: n[3], stocFinal: n[4],
        costPeUnitate: n[5], valoareStocFinal: n[6], zileStoc: n[7],
        consumUnitati: trio(n[8], n[9], n[10]), consumLei: trio(n[11], n[12], n[13]), consumPct: trio(n[14], n[15], n[16]),
      });
    }
    inCurs = null;
  };

  linii.forEach((l, idx) => {
    const nr = idx + 1;
    if (!l) return;

    if (eStructura(l)) {
      inchide();
      precedent = 'STRUCTURA';
      let m: RegExpExecArray | null;
      if ((m = /^(.*?)\s*Fiscal Year:\s*(\d{4})/i.exec(l))) {
        if (m[1] && !r.restaurant) r.restaurant = m[1].trim();
        r.anFiscal ??= m[2];
      } else if (/^2\.9 Food Cost/i.test(l)) {
        r.titlu ??= l;
      } else if ((m = /^(Period|Week):\s*(.+)$/i.exec(l))) {
        r.perioadaEticheta ??= `${m[1]} ${m[2].trim()}`;
      } else if ((m = /^(\d{2}\.\d{2}\.\d{4})\s-\s(\d{2}\.\d{2}\.\d{4})$/.exec(l))) {
        const de = dataRO(m[1]), la = dataRO(m[2]);
        if (de && la) {
          perioadeVazute.add(`${de}|${la}`);
          r.de ??= de; r.la ??= la;
        }
      } else if ((m = /^Total:\s(.+?)\s(\(?[\d.,]+ lei\)?)\s(\(?[\d.,]+ lei\)?)\s(\(?[\d.,]+ lei\)?)\s(\(?[\d.,]+ lei\)?)\s(\(?[\d.,]+%\)?)\s(\(?[\d.,]+%\)?)\s(\(?[\d.,]+%\)?)$/.exec(l))) {
        const t: Total29 = {
          categorie: m[1], valoareStocFinal: numar29(m[2]) ?? 0,
          consumLei: trio(numar29(m[3]) ?? 0, numar29(m[4]) ?? 0, numar29(m[5]) ?? 0),
          consumPct: trio(numar29(m[6]) ?? 0, numar29(m[7]) ?? 0, numar29(m[8]) ?? 0),
        };
        const ultim = r.totaluri[r.totaluri.length - 1];
        // totalul e tipărit de două ori; a doua tipărire a aceluiași grup nu e alt total
        if (!(ultim && ultim.categorie === t.categorie && ultim.consumLei.actual === t.consumLei.actual)) r.totaluri.push(t);
      } else if ((m = /^Totals:\s(?:Sales:\s)?(\(?[\d.,]+ lei\)?)\s(\(?[\d.,]+ lei\)?)\s(\(?[\d.,]+ lei\)?)\s(\(?[\d.,]+ lei\)?)\s(\(?[\d.,]+ lei\)?)\s(\(?[\d.,]+%\)?)\s(\(?[\d.,]+%\)?)\s(\(?[\d.,]+%\)?)$/.exec(l))) {
        r.totalGeneral = {
          vanzari: numar29(m[1]) ?? 0, valoareStocFinal: numar29(m[2]) ?? 0,
          consumLei: trio(numar29(m[3]) ?? 0, numar29(m[4]) ?? 0, numar29(m[5]) ?? 0),
          consumPct: trio(numar29(m[6]) ?? 0, numar29(m[7]) ?? 0, numar29(m[8]) ?? 0),
        };
      }
      return;
    }

    const c = candidat(l);
    if (c) {
      inchide();
      inCurs = { rand: null, ...c, deschise: deschise(c.campuri), linie: nr, text: l };
      precedent = 'DATE';
      return;
    }

    // linie fără cifre după un rând de material: bucățile celulelor rupte, apoi continuarea denumirii
    if ((precedent === 'DATE' || precedent === 'CONTINUARE') && inCurs) {
      const tokens = l.split(' ');
      if (inCurs.deschise.length) {
        const nBucati = Math.min(inCurs.deschise.length, tokens.length);
        const bucati = tokens.slice(tokens.length - nBucati);
        const restNume = tokens.slice(0, tokens.length - nBucati);
        inCurs.deschise.slice(0, nBucati).forEach((d, i) => { inCurs!.campuri[d.index] = lipeste(inCurs!.campuri[d.index], bucati[i]); });
        inCurs.deschise = inCurs.deschise.slice(nBucati);
        if (restNume.length) inCurs.nume = `${inCurs.nume} ${restNume.join(' ')}`.trim();
      } else {
        inCurs.nume = `${inCurs.nume} ${l}`.trim();
      }
      precedent = 'CONTINUARE';
      return;
    }

    // antet de grup: tipărit de două ori; un antet diferit imediat după altul e un subgrup
    inchide();
    if (precedent === 'ANTET' && antetPrecedent === l) { /* a doua tipărire */ }
    else if (precedent === 'ANTET' && antetPrecedent !== null) { grup = antetPrecedent; categorie = l; }
    else { grup = null; categorie = l; }
    antetPrecedent = l;
    precedent = 'ANTET';
  });
  inchide();

  if (perioadeVazute.size > 1) {
    r.avertismente.push(`Paginile declară perioade diferite: ${[...perioadeVazute].map(p => p.replace('|', ' → ')).join(', ')} — s-a păstrat prima.`);
  }
  if (!r.de || !r.la) r.avertismente.push('Raportul nu declară perioada (dd.mm.yyyy - dd.mm.yyyy) — fereastra rămâne nedeclarată.');
  if (!r.restaurant) r.avertismente.push('Raportul nu declară restaurantul în antet.');
  if (r.nerecunoscute.length) {
    r.avertismente.push(`${r.nerecunoscute.length} rânduri de material nu s-au putut citi (liniile ${r.nerecunoscute.slice(0, 5).map(x => x.rand).join(', ')}${r.nerecunoscute.length > 5 ? '…' : ''}).`);
  }

  // verificarea pe grup: suma rândurilor (rotunjite la leu în raport) față de totalul declarat
  const peCategorie = new Map<string, { suma: number; n: number }>();
  for (const x of r.randuri) {
    const e = peCategorie.get(x.categorie) ?? { suma: 0, n: 0 };
    e.suma += x.consumLei.actual; e.n++;
    peCategorie.set(x.categorie, e);
  }
  for (const t of r.totaluri) {
    const e = peCategorie.get(t.categorie);
    if (!e) continue;
    // un grup părinte are două totaluri: al rândurilor lui directe și al întregului, cu
    // subgrupurile; se verifică pe cel care se potrivește ca structură, nu se ghicește
    const sub = r.randuri.filter(x => x.grup === t.categorie);
    const cuSub = sub.length ? { suma: e.suma + sub.reduce((s, x) => s + x.consumLei.actual, 0), n: e.n + sub.length } : null;
    const potrivit = cuSub && Math.abs(cuSub.suma - t.consumLei.actual) <= Math.abs(e.suma - t.consumLei.actual) ? cuSub : e;
    const toleranta = 0.5 * potrivit.n + 1;
    const ok = Math.abs(potrivit.suma - t.consumLei.actual) <= toleranta;
    const eticheta = potrivit === cuSub ? `${t.categorie} (cu subgrupuri)` : t.categorie;
    r.verificari.push({ categorie: eticheta, calculat: potrivit.suma, declarat: t.consumLei.actual, toleranta, ok });
    if (!ok) r.avertismente.push(`Grupul „${eticheta}": rândurile însumează ${potrivit.suma} lei, totalul declarat e ${t.consumLei.actual} lei.`);
  }
  if (r.totalGeneral) {
    const suma = r.randuri.reduce((s, x) => s + x.consumLei.actual, 0);
    const toleranta = 0.5 * r.randuri.length + 1;
    if (Math.abs(suma - r.totalGeneral.consumLei.actual) > toleranta) {
      r.avertismente.push(`Totalul general: rândurile însumează ${suma} lei, raportul declară ${r.totalGeneral.consumLei.actual} lei.`);
    }
  }
  return r;
}

/** Antetele `Parsat`-ului produs de adaptor — exact ce recunoaște importatorul 2.9 pe material. */
export const ANTETE_29 = [
  'Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Grup raport', 'Categorie',
  'Cantitate', 'UM', 'Cost actual', 'Cost teoretic', 'Cost per unit', 'Cantitate teoretica', 'Rand sursa',
] as const;

/**
 * Raportul ca `Parsat`, pe drumul obișnuit al importului 2.9 pe material. Categoria unui
 * subgrup poartă și părintele („Paper / ACCESORII"), ca regulile de clasificare să vadă
 * grupul de cost al raportului; grupul rămâne și separat, în coloana lui.
 */
export function parsatDin29(r: Raport29, foaie = 'PDF'): Parsat {
  // fără perioadă în antet nu există coloana de lună: importatorul cere atunci „valabil de la"
  // declarat de om, în loc să dateze rândurile pe o lună pe care raportul n-o spune
  const perioada = r.de ? r.de.slice(0, 7) : null;
  const randuri = r.randuri.map(x => ({
    ...(perioada ? { Perioada: perioada } : {}),
    Locatie: r.restaurant ?? '',
    'Cod material': x.itemId,
    'Denumire material': x.item,
    'Grup raport': x.grup ?? '',
    Categorie: x.grup ? `${x.grup} / ${x.categorie}` : x.categorie,
    Cantitate: x.consumUnitati.actual,
    UM: x.umInventar,
    'Cost actual': x.consumLei.actual,
    'Cost teoretic': x.consumLei.teoretic,
    'Cost per unit': x.costPeUnitate,
    'Cantitate teoretica': x.consumUnitati.teoretic,
    'Rand sursa': x.rand,
  }));
  return {
    foaie, antete: ANTETE_29.filter(a => perioada || a !== 'Perioada'), randuri,
    ...(r.de && r.la ? { fereastra: { de: r.de, la: r.la } } : {}),
  };
}

/** Rezumatul de o linie pe care îl arată ecranul de import. */
export function descrie29(r: Raport29): string {
  const cap = `Raport NBO 2.9${r.restaurant ? ` · ${r.restaurant}` : ''}${r.de && r.la ? ` · ${r.de} → ${r.la}` : ' · perioadă nedeclarată'}`;
  const verif = r.verificari.length
    ? `${r.verificari.filter(v => v.ok).length}/${r.verificari.length} grupuri verificate pe total`
    : 'fără totaluri de grup';
  return `${cap} · ${r.randuri.length} materiale · ${verif}${r.nerecunoscute.length ? ` · ${r.nerecunoscute.length} rânduri necitite` : ''}`;
}
