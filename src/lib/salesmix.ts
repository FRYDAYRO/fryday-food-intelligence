// Parser pentru raportul „4.7 Sales Mix" (NCR Back Office).
// Particularitățile formatului, observate pe rapoartele reale FRYDAY:
//  · nu există coduri de produs — doar „Menu Item Name", deci maparea se face pe denumire;
//  · canalul e codificat în denumire: sufix „ D" = Delivery, „ MD" / „ M D" = meniu pe Delivery;
//  · același produs apare pe mai multe rânduri, la prețuri diferite (promoții, agregatori);
//  · liniile cu preț 0 sunt componente de meniu: bucăți reale, dar fără venit propriu;
//  · rândurile „CATEGORY X" dau categoria, „Total X" se ignoră;
//  · raportul acoperă o perioadă (5 zile) și toate restaurantele, agregat.
import type { Canal } from './types';
import { norm } from './engine';

export interface LinieSalesMix {
  nume: string;              // denumirea așa cum apare în raport
  numeBaza: string;          // fără sufixele new / D / MD, pentru potrivire
  categorie: string;
  canal: Canal;
  meniuComponenta: boolean;  // rând de tip „M" / „MD": parte dintr-un meniu
  qty: number;
  pret: number;
  ext: number;
}

export interface SalesMix {
  linii: LinieSalesMix[];
  perioadaDe: string | null;
  perioadaLa: string | null;
  magazine: string[];
  /**
   * Raportul e rulat la nivel de companie („Corporate" în antet), fără listă de magazine.
   * Nu e un restaurant și nu se atribuie niciunuia — dar nici nu e „scop nedeclarat":
   * știm exact ce acoperă.
   */
  corporativ: boolean;
  totalQty: number | null;
  totalExt: number | null;
}

const nr = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v ?? '').trim();
  if (!s) return null;
  const negativ = /^\(.*\)$/.test(s);           // (38.00) = valoare negativă
  s = s.replace(/[()$\s\u00a0]/g, '').replace(/,/g, '');
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negativ ? -n : n;
};

/** Separă sufixele de canal din denumirea POS și întoarce numele curat. */
export function despartaCanal(nume: string): { numeBaza: string; canal: Canal; meniuComponenta: boolean } {
  let s = nume.replace(/\s+/g, ' ').trim();
  let canal: Canal = 'INSTORE';
  let meniu = false;

  // sufixele apar la final, eventual combinate: „... new D", „... MD NEW", „... M D new"
  const sufixe: RegExp[] = [
    /\s+m\s*d$/i,          // MD / M D → meniu, pe Delivery
    /\s+d$/i,              // D → Delivery
    /\s+new$/i,            // marcaj de versiune, fără sens de canal
    /\s+nou$/i,
    /\s+m$/i,              // M → meniu, InStore
  ];
  let sters = true;
  while (sters) {
    sters = false;
    for (const re of sufixe) {
      if (re.test(s)) {
        const gasit = s.match(re)![0].trim();
        const g = norm(gasit).replace(/\s+/g, '');
        if (g === 'md') { canal = 'DELIVERY'; meniu = true; }
        else if (g === 'd') canal = 'DELIVERY';
        else if (g === 'm') meniu = true;
        s = s.replace(re, '').trim();
        sters = true;
      }
    }
  }
  return { numeBaza: s, canal, meniuComponenta: meniu };
}

const GUNOI = [
  /^menu item name/i, /^multiple selection/i, /^period:/i, /^fiscal year/i, /^\d+\.\d+ sales mix/i,
  /^v \d+\./i, /copyright/i, /^groups?\/stores/i, /^total\b/i, /^\d+ of \d+$/i, /^page /i,
];

/** Extrage liniile de vânzare dintr-o matrice brută (Excel sau text tabelat). */
export function parseSalesMix(matrice: unknown[][]): SalesMix {
  const linii: LinieSalesMix[] = [];
  const magazine: string[] = [];
  // Lista de restaurante se rupe pe mai multe rânduri, iar ruptura cade uneori ÎN MIJLOCUL
  // unui nume („…, FRYDAY" / „PLOIESTI DT, …"). Tăiat pe rânduri, „PLOIESTI DT" nu conține
  // „FRYDAY" și ar fi aruncat tăcut, iar orfanul „FRYDAY" ar trece drept restaurant. De aceea
  // zona se adună întâi ca text continuu și abia apoi se desparte pe virgule.
  let tamponMagazine = '';
  /**
   * A doua formă de antet: raportul rulat pe UN SINGUR restaurant nu are secțiunea
   * „Groups/Stores" — pune numele în colțul din stânga sus, pe două coloane:
   *
   *   FRYDAY TIMISOARA      Fiscal Year: 2026
   *   4.7 Sales Mix
   *   IULIUS TOWN           Period: 8 Week: 4
   *
   * Numele se rupe între rânduri, cu titlul raportului la mijloc. Se adună partea din
   * stânga a rândurilor de antet și se lipește la final — altfel raportul unui restaurant
   * ar rămâne fără restaurant, iar cifrele lui n-ar avea unde să meargă.
   */
  const fragmenteAntet: string[] = [];
  let inAntet = true;
  let corporativ = false;
  let categorie = '';
  let perioadaDe: string | null = null, perioadaLa: string | null = null;
  let totalQty: number | null = null, totalExt: number | null = null;
  let inMagazine = false;

  const dataUS = (s: string) => {
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
    return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
  };

  for (const rand of matrice) {
    if (!Array.isArray(rand)) continue;
    const celule = rand.map(c => String(c ?? '').trim());
    const text = celule.filter(Boolean).join(' ').trim();
    if (!text) continue;

    // Datele se citesc ÎNAINTEA antetului: „Corporate Start Date: 08/01/2026" e un singur
    // rând care poartă și scopul, și data. Dacă scanarea antetului l-ar consuma prima,
    // data s-ar pierde.
    const sd = /start\s*date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(text);
    if (sd) perioadaDe = dataUS(sd[1]);
    const ed = /end\s*date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(text);
    if (ed) perioadaLa = dataUS(ed[1]);

    // antetul pe coloane al raportului pe un singur restaurant: se citește doar la început,
    // înainte de capul de tabel sau de prima categorie
    if (inAntet) {
      // Antetul se termină la intervalul de date — în toate rapoartele NCR observate el vine
      // imediat după nume. Fără capătul ăsta, un raport care nu are „Menu Item Name" (4.1
      // Sales Journal, de pildă) ar fi citit ca antet până la ultimul rând, iar numele
      // restaurantului ar înghiți jumătate de raport.
      if (/^menu item name/i.test(text) || /^category\b/i.test(text) || /^groups?\/stores/i.test(text)
        || /\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}/.test(text)
        || /^raw material/i.test(text) || /usage in (units|dollars)/i.test(text)) {
        inAntet = false;
      } else {
        const stanga = text.replace(/\s*(fiscal\s+year|period|week)\b.*$/i, '').trim();
        // titlul raportului („4.7 Sales Mix", „4.1 Sales Journal", „2.9 Food Cost…") stă
        // între fragmentele numelui și nu face parte din el — se sare după formă, nu după
        // numărul raportului, ca să meargă și pentru rapoartele viitoare
        // 2.9 la nivel de companie declară scopul cu un singur cuvânt: „Corporate".
        // Nu e nume de restaurant, dar nici scop necunoscut — e toată rețeaua.
        if (/^corporate\b/i.test(stanga)) { corporativ = true; continue; }
        if (sd || ed) continue;   // rând de dată, nu de nume
        const eTitlu = /^\d+\.\d+\b/.test(stanga);
        if (stanga && !eTitlu && !/\d{1,2}\/\d{1,2}\/\d{4}/.test(stanga)
          && !/^v \d+\./i.test(stanga) && !/copyright/i.test(stanga)) {
          fragmenteAntet.push(stanga);
        }
      }
    }

    // perioada raportului
    if (/\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}/.test(text)) {
      const p = text.split('-');
      perioadaDe = dataUS(p[0]); perioadaLa = dataUS(p.slice(1).join('-'));
      continue;
    }
    // lista de restaurante
    if (/^groups?\/stores/i.test(text)) { inMagazine = true; tamponMagazine = ''; continue; }
    if (inMagazine) {
      if (/^v \d+\./i.test(text) || /copyright/i.test(text)) { inMagazine = false; continue; }
      tamponMagazine += (tamponMagazine ? ' ' : '') + text;
      continue;
    }
    // categoria
    const cat = /^category\s+(.+)$/i.exec(text);
    if (cat) { categorie = cat[1].replace(/\*+$/, '').trim(); continue; }
    // totalul general
    const tot = /^total\s+(\d[\d,]*)\s+\$?([\d,.]+)$/i.exec(text);
    if (tot) { totalQty = nr(tot[1]); totalExt = nr(tot[2]); continue; }
    if (GUNOI.some(re => re.test(text))) continue;

    // ——— linia de vânzare: ultimele trei valori numerice sunt qty, price, extension
    const numerice: { i: number; v: number }[] = [];
    celule.forEach((c, i) => { const v = nr(c); if (v !== null && c !== '') numerice.push({ i, v }); });
    if (numerice.length < 3) continue;
    const [q, p, e] = numerice.slice(-3);
    // denumirea = tot ce e înaintea primei valori numerice folosite
    const nume = celule.slice(0, q.i).filter(Boolean).join(' ').trim();
    if (!nume || nume.length < 2) continue;
    // control de coerență: extension ≈ qty × price (rândurile care nu respectă asta nu sunt vânzări)
    if (Math.abs(q.v * p.v - e.v) > Math.max(0.05, Math.abs(e.v) * 0.02)) continue;

    const { numeBaza, canal, meniuComponenta } = despartaCanal(nume);
    linii.push({ nume, numeBaza, categorie, canal, meniuComponenta, qty: q.v, pret: p.v, ext: e.v });
  }

  // raportul pe un singur restaurant: numele adunat din antet, dacă nu exista deja o listă
  if (!tamponMagazine.trim() && fragmenteAntet.length) {
    const nume = fragmenteAntet.join(' ').replace(/\s+/g, ' ').trim();
    // plasă de siguranță: un nume de restaurant nu conține sume și nu are zeci de cuvinte.
    // Dacă antetul a prins altceva decât un nume, e mai bine să nu declarăm niciun magazin
    // decât să declarăm unul inventat din resturi de raport.
    const pareNume = /fryday|chicken/i.test(nume) && !/[$%]/.test(nume) && nume.length <= 60;
    if (pareNume) magazine.push(nume);
  }

  // subsolul raportului se poate lipi de ultima intrare — se taie, dar numele rămâne întreg
  magazine.push(...tamponMagazine.split(',')
    .map(x => x.replace(/\s+\d+ of \d+\b.*$/i, '').trim())
    .filter(x => /fryday|chicken/i.test(x)));

  return { linii, perioadaDe, perioadaLa, magazine: [...new Set(magazine)], corporativ, totalQty, totalExt };
}

/**
 * Reconstruiește rândurile dintr-un raport 4.7 în format text (copiat din PDF).
 * Rezolvă două particularități ale extragerii din PDF: denumirile care se rup pe mai multe
 * rânduri și valorile tăiate la sfârșit de linie („$111,190.” + „64” pe rândul următor).
 */
export function matriceDinText(text: string): unknown[][] {
  const brute = text.split(/\r?\n/).map(l => l.trim());
  // lipim cifrele orfane de valoarea trunchiată de pe rândul anterior
  const linii: string[] = [];
  for (const l of brute) {
    if (/^\d{1,3}$/.test(l) && linii.length && /[.,]$/.test(linii[linii.length - 1])) {
      linii[linii.length - 1] += l;
    } else linii.push(l);
  }

  // valoarea finală poate fi „$1,234.00", „($38.00)" sau „-38.00"
  const FINAL = /(-?[\d,]+)\s+([\d,]+\.\d+)\s+[$(]*(-?[\d,]+\.\d+)\)?$/;
  // fragmentele care sunt doar marcaj de versiune sau canal aparțin rândului ANTERIOR:
  // la extragerea din PDF, continuarea denumirii apare uneori după linia cu cifre
  const DOAR_SUFIX = /^(new|nou)?\s*(m\s*d|md|d|m)?$/i;
  const rez: unknown[][] = [];
  let tampon: string[] = [];
  let inMagazine = false;

  for (const l of linii) {
    if (!l) { continue; }
    // rânduri care resetează tamponul: categorie, total, antet, subsol
    if (/^groups?\/stores/i.test(l)) { tampon = []; inMagazine = true; rez.push([l]); continue; }
    if (inMagazine) {
      if (/^v \d+\./i.test(l) || /copyright/i.test(l)) { inMagazine = false; continue; }
      rez.push([l]);
      continue;
    }
    if (/^category\b/i.test(l) || /^total\b/i.test(l) || GUNOI.some(re => re.test(l))
        || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(l)) {
      tampon = [];
      rez.push([l]);
      continue;
    }
    // Antetul pe coloane al raportului pe un singur restaurant: numele restaurantului stă
    // în stânga, iar în dreapta „Fiscal Year / Period / Week". Rândurile astea nu sunt
    // vânzări — dacă ajung în tamponul de denumiri se pierd la prima resetare, iar raportul
    // rămâne fără restaurant. Trec ca rânduri proprii, ca parserul să le poată citi.
    if (/\b(fiscal\s+year|period\s*:|week\s*:|start\s*date\s*:|end\s*date\s*:)/i.test(l)
      || /^corporate\b/i.test(l)) { tampon = []; rez.push([l]); continue; }

    const m = FINAL.exec(l);
    if (!m) {
      const ultim = rez[rez.length - 1];
      if (DOAR_SUFIX.test(l.trim()) && ultim && ultim.length === 4 && !tampon.length) {
        ultim[0] = `${ultim[0]} ${l.trim()}`;     // continuarea denumirii de pe rândul precedent
      } else tampon.push(l);
      continue;
    }
    const prefix = l.slice(0, m.index).trim();
    const nume = [...tampon, prefix].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    tampon = [];
    if (!nume) continue;
    const neg = /\(.*\)$/.test(l.slice(m.index));
    rez.push([nume, m[1], m[2], (neg ? '-' : '') + m[3]]);
  }
  return rez;
}

/** Cheia de potrivire a unei denumiri POS cu nomenclatorul. */
export function cheieDenumire(s: string): string {
  return norm(s)
    .replace(/\b(new|nou|d|md|m)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
