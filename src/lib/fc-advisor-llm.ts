/**
 * FC Advisor — GRANIȚA cu modelul de limbaj.
 *
 * Aici se face o singură treabă: dosarul determinist produs de `fc-advisor.ts` devine
 * text în limba română. Modelul NU are voie să calculeze, să prioritizeze sau să scoată
 * cifre din burtă — și, mai important, nu e nevoie să-l credem pe cuvânt:
 *
 *   • `construiestePrompt` trimite DOAR dosarul de dovezi, serializat determinist.
 *     Nicio stare brută, niciun raport neprelucrat, niciun calcul ascuns în prompt.
 *   • `valideazaNaratiune` scanează textul întors și respinge ORICE număr care nu se
 *     regăsește în dovezi. O cifră inventată nu ajunge la utilizator: naratiunea e
 *     refuzată și se folosește varianta deterministă.
 *   • `naratorDeterminist` produce textul fără niciun model, din aceleași cifre.
 *     Aplicația funcționează complet și fără LLM; modelul e o îmbunătățire de exprimare,
 *     nu o sursă de adevăr.
 *
 * De ce nu e inclus un client de API: aplicația rulează în browser, iar un apel direct
 * ar însemna o cheie de API livrată clientului. Punctul de injecție e tipul `Narator`;
 * legarea lui de un model se face pe server (Messages API, `claude-opus-5`), cu dosarul
 * trimis ca atare. `PROMPT_SISTEM` de mai jos e contractul pe care acel server îl impune.
 */
import { fmtLei, fmtPP, fmtPct } from './engine';
import {
  ETICHETA_CAUZA, MESAJ_INSUFICIENT, cifreDin,
  type Cifra, type DosarAdvisor, type Recomandare,
} from './fc-advisor';

// ————————————————————————————————————————————————————————— contractul

export const PROMPT_SISTEM = [
  'Ești un analist de Food Cost care explică, în română, un dosar de dovezi deja calculat.',
  '',
  'Reguli absolute:',
  '1. Nu calcula nimic. Fiecare cifră pe care o scrii trebuie să apară exact așa în dovezi.',
  '2. Nu inventa numere, procente, sume sau ponderi. Dacă o cifră lipsește din dovezi, spune',
  `   „${MESAJ_INSUFICIENT}" și mergi mai departe.`,
  '3. Nu schimba prioritățile. Ele sunt calculate determinist și îți sunt date; le repeți, nu le rejudeci.',
  '4. Nu atribui variance-ul neexplicat vreunei cauze cunoscute. Neexplicat înseamnă neexplicat.',
  '5. Nu extinde scopul. Vorbește doar despre perioada, restaurantele și canalul din dosar.',
  '6. Distinge unitățile: procentele se compară în puncte procentuale (pp), sumele în lei.',
  '',
  'Scrii scurt, la obiect, fără superlative și fără sfaturi generice. Structura cerută:',
  'stare FC · de ce s-a schimbat · mișcări negative · mișcări pozitive · oportunități ·',
  'riscuri · acțiuni recomandate · opțiuni what-if · avertismente de date.',
].join('\n');

/** Ce pleacă spre model: instrucțiunile, dovezile și lista cifrelor permise. */
export interface PromptAdvisor {
  sistem: string;
  /** Dosarul serializat determinist — singura sursă de fapte. */
  dovezi: string;
  mesaj: string;
  /** Valorile numerice pe care naratiunea are voie să le folosească. */
  cifrePermise: number[];
  /** Model recomandat pentru partea de exprimare (apelul se face pe server). */
  modelRecomandat: string;
}

export const MODEL_RECOMANDAT = 'claude-opus-5';

/** Serializare stabilă: aceleași dovezi produc mereu același șir (cheile sortate). */
export function serializeazaStabil(x: unknown): string {
  const stabil = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(stabil);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const rez: Record<string, unknown> = {};
      for (const k of Object.keys(o).sort()) rez[k] = stabil(o[k]);
      return rez;
    }
    return v;
  };
  return JSON.stringify(stabil(x), null, 1);
}

/**
 * Promptul complet. Conține DOAR dosarul: niciun rând de vânzare, niciun material brut,
 * nicio stare a aplicației. Ce nu e în dosar nu ajunge la model.
 */
export function construiestePrompt(dosar: DosarAdvisor): PromptAdvisor {
  return {
    sistem: PROMPT_SISTEM,
    dovezi: serializeazaStabil(dosar),
    mesaj: `Explică Food Cost-ul pentru scopul „${dosar.scop.descriere}", folosind exclusiv dovezile de mai sus.`,
    cifrePermise: valoriPermise(dosar),
    modelRecomandat: MODEL_RECOMANDAT,
  };
}

// ————————————————————————————————————————————————————————— validarea

/**
 * Toate valorile numerice care apar legitim în dosar, plus rotunjirile lor uzuale.
 *
 * Include DOUĂ categorii, pentru că ambele sunt dovezi:
 *   • valorile din `Cifra.valoare` — cifrele calculate de motoare;
 *   • numerele care apar în textele dosarului (denumiri de produse, motive, calcule,
 *     praguri citate de motoare). Un model care citează „23% din costul ingredientelor"
 *     repetă o dovadă, nu inventează una.
 * Ce nu apare NICĂIERI în dosar rămâne interzis — acolo se prinde fabricația.
 */
export function valoriPermise(dosar: DosarAdvisor): number[] {
  const set = new Set<number>();
  const adauga = (n: number | null | undefined) => {
    if (n === null || n === undefined || !Number.isFinite(n)) return;
    set.add(n);
    set.add(Math.abs(n));
    for (const z of [0, 1, 2]) {
      set.add(+n.toFixed(z));
      set.add(+Math.abs(n).toFixed(z));
    }
  };
  for (const c of cifreDin(dosar)) adauga(c.valoare);
  for (const cauza of dosar.explicatie.cauze) {
    for (const contrib of cauza.contribuitori) adauga(contrib.lei);
  }
  for (const v of Object.values(dosar.praguri)) adauga(v as number);
  adauga(dosar.confidenta.scor);
  for (const f of dosar.confidenta.factori) adauga(f.scor);
  for (const r of dosar.riscuri) adauga(r.confidenta);
  for (const r of dosar.actiuni) adauga(r.confidenta);
  for (const o of dosar.oportunitati) adauga(o.confidenta);
  for (const w of dosar.whatIf) adauga(w.confidenta);
  for (const a of dosar.avertismenteDate) adauga(a.nrElemente);
  adauga(dosar.stare.confidenta);
  for (const n of numereDinTexte(dosar)) adauga(n);
  return [...set].sort((a, b) => a - b);
}

/** Numerele care apar în TEXTELE dosarului — denumiri, motive, calcule, note. */
export function numereDinTexte(x: unknown, acc: number[] = []): number[] {
  if (typeof x === 'string') { acc.push(...numereDin(x)); return acc; }
  if (x === null || typeof x !== 'object') return acc;
  for (const v of Object.values(x as Record<string, unknown>)) numereDinTexte(v, acc);
  return acc;
}

/** Numerele dintr-un text în format ro-RO („1.234,56") sau simplu („1234.56"). */
export function numereDin(text: string): number[] {
  const rez: number[] = [];
  // fără spații în clasă: ro-RO separă miile cu punct, iar un spațiu între două numere
  // NU le unește („9 10,45" sunt două numere, nu 910,45)
  for (const m of text.matchAll(/-?\d[\d.]*(?:,\d+)?/g)) {
    const brut = m[0];
    // „1.234,56" → 1234.56 ; „12,5" → 12.5 ; „1234.56" rămâne
    const normalizat = brut.includes(',')
      ? brut.replace(/\./g, '').replace(',', '.')
      : /^\-?\d{1,3}(\.\d{3})+$/.test(brut) ? brut.replace(/\./g, '') : brut;
    const n = Number(normalizat);
    if (Number.isFinite(n)) rez.push(n);
  }
  return rez;
}

export interface RezultatValidare {
  valid: boolean;
  /** Numerele din text care NU se regăsesc în dovezi. */
  numereStraine: number[];
  /** Ce anume s-a încălcat — mesaje citibile, pentru jurnal. */
  motive: string[];
}

/**
 * Verifică o naratiune produsă de model. Un singur număr fără acoperire în dovezi
 * invalidează textul: mai bine o formulare seacă, dar adevărată.
 */
export function valideazaNaratiune(
  text: string, dosar: DosarAdvisor, tol = 0.01,
): RezultatValidare {
  const permise = valoriPermise(dosar);
  const straine: number[] = [];
  for (const n of numereDin(text)) {
    // anii și numerele mici de enumerare („1.", „2026-07") nu sunt afirmații numerice
    if (Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
    if (Number.isInteger(n) && Math.abs(n) <= 12) continue;
    if (!permise.some(p => Math.abs(p - n) <= tol)) straine.push(n);
  }
  const motive: string[] = [];
  if (straine.length) {
    motive.push(`Naratiunea conține ${straine.length} numere care nu apar în dovezi: ${straine.slice(0, 8).join(', ')}.`);
  }
  return { valid: straine.length === 0, numereStraine: straine, motive };
}

/**
 * Verifică suplimentar că naratiunea nu vorbește despre restaurante din afara scopului
 * autorizat — a doua plasă de siguranță peste filtrarea de pe server.
 */
export function valideazaScop(text: string, dosar: DosarAdvisor, toateLocatiile: string[]): RezultatValidare {
  const permise = new Set(dosar.scop.restauranteAutorizate);
  const straine = toateLocatiile.filter(l => !permise.has(l)
    && new RegExp(`\\b${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text));
  return {
    valid: straine.length === 0,
    numereStraine: [],
    motive: straine.length ? [`Naratiunea menționează restaurante din afara scopului autorizat: ${straine.join(', ')}.`] : [],
  };
}

// ————————————————————————————————————————————————————————— naratorul determinist

const val = (c: Cifra): string => {
  if (c.valoare === null) return c.indisponibilDe ? MESAJ_INSUFICIENT : '—';
  if (c.unitate === 'RON') return fmtLei(c.valoare, 0);
  if (c.unitate === 'PP') return fmtPP(c.valoare);
  if (c.unitate === 'BUC') return String(Math.round(c.valoare));
  return fmtPct(c.valoare, 1);
};

const linieActiune = (r: Recomandare): string =>
  `- [${r.prioritate}] ${r.titlu} — ${r.motiv} `
  + `Impact: ${val(r.impactLei)}${r.impactPp.valoare !== null ? ` (${val(r.impactPp)})` : ''}. `
  + `Încredere ${r.confidenta}. Regulă: ${r.regulaPrioritate}.`;

/**
 * Naratiunea fără model: aceleași cifre, aceeași structură, exprimare fixă.
 * E și textul de rezervă atunci când validarea respinge ieșirea modelului.
 */
export function naratorDeterminist(dosar: DosarAdvisor): string {
  const p: string[] = [];
  p.push(`## Stare FC — ${dosar.scop.descriere}`);
  p.push(dosar.stare.disponibil ? dosar.stare.rezumat : (dosar.stare.motiv ?? MESAJ_INSUFICIENT));
  if (dosar.stare.disponibil) {
    p.push(`FC rețetar ${val(dosar.stare.fcRetetar)} · FC actual NBO ${val(dosar.stare.fcActualNbo)} · `
      + `variație ${val(dosar.stare.variatie)} · explicat ${val(dosar.stare.explicat)} · neexplicat ${val(dosar.stare.neexplicat)}.`);
  }

  p.push('', '## De ce s-a schimbat FC-ul');
  if (!dosar.explicatie.disponibil) {
    p.push(dosar.explicatie.motiv ?? MESAJ_INSUFICIENT);
  } else {
    for (const c of dosar.explicatie.cauze) {
      p.push(`- ${ETICHETA_CAUZA[c.cauza]}: ${val(c.lei)}${c.pp.valoare !== null ? ` (${val(c.pp)})` : ''} — ${c.descriere}`);
    }
    p.push(dosar.explicatie.verificareIdentitate);
    p.push(dosar.explicatie.notaNeexplicat);
  }

  const listaMiscari = (titlu: string, m: typeof dosar.miscariNegative) => {
    p.push('', `## ${titlu}`);
    if (!m.length) { p.push(MESAJ_INSUFICIENT); return; }
    for (const x of m) p.push(`- ${x.denumire}: ${val(x.lei)}${x.pp.valoare !== null ? ` (${val(x.pp)})` : ''} — ${x.motiv}`);
  };
  listaMiscari('Mișcări negative', dosar.miscariNegative);
  listaMiscari('Mișcări pozitive', dosar.miscariPozitive);

  p.push('', '## Oportunități');
  if (!dosar.oportunitati.length) p.push(MESAJ_INSUFICIENT);
  for (const o of dosar.oportunitati.slice(0, 8)) {
    p.push(`- ${o.eticheta}: ${o.denumire} — ${o.motiv} Impact ${val(o.impactLei)}. Încredere ${o.confidenta}.`);
  }

  p.push('', '## Riscuri');
  if (!dosar.riscuri.length) p.push('Niciun risc peste pragurile deterministe.');
  for (const r of dosar.riscuri.slice(0, 8)) {
    p.push(`- [${r.prioritate}] ${r.titlu} — ${r.detaliu}`);
  }

  p.push('', '## Acțiuni recomandate');
  if (!dosar.actiuni.length) p.push(MESAJ_INSUFICIENT);
  for (const r of dosar.actiuni.slice(0, 10)) p.push(linieActiune(r));

  p.push('', '## Opțiuni what-if');
  if (!dosar.whatIf.length) p.push(MESAJ_INSUFICIENT);
  for (const w of dosar.whatIf) {
    p.push(w.disponibil
      ? `- ${w.titlu}: ${val(w.deltaPp)} asupra FC rețetar, ${val(w.deltaLei)} pe perioadă. Încredere ${w.confidenta}.`
      : `- ${w.titlu}: ${MESAJ_INSUFICIENT} ${w.motiv ?? ''}`.trim());
  }
  if (dosar.whatIf.length) p.push(dosar.whatIf[0].notaSemantica);

  p.push('', '## Avertismente de date');
  if (!dosar.avertismenteDate.length) p.push('Nicio problemă de date semnalată pe acest scop.');
  for (const a of dosar.avertismenteDate) {
    p.push(`- [${a.nivel}] ${a.titlu} — ${a.detaliu}${a.exemple.length ? ` (ex.: ${a.exemple.slice(0, 5).join(', ')})` : ''}`);
  }
  p.push('', `Încredere globală: ${dosar.confidenta.scor}. ${dosar.confidenta.formula}`);
  return p.join('\n');
}

// ————————————————————————————————————————————————————————— punctul de injecție

/** Semnătura pe care o implementează un narator real (apel de model, pe server). */
export type Narator = (prompt: PromptAdvisor) => Promise<string>;

export interface RezultatNaratiune {
  text: string;
  sursa: 'LLM' | 'DETERMINIST';
  /** De ce s-a folosit varianta deterministă, când s-a folosit. */
  motivRezerva: string | null;
  validare: RezultatValidare | null;
}

/**
 * Produce naratiunea. Fără narator, întoarce varianta deterministă. Cu narator, îi
 * validează ieșirea și o refuză dacă a inventat cifre sau a ieșit din scop — în ambele
 * cazuri utilizatorul primește text adevărat, nu unul plauzibil.
 */
export async function narreaza(
  dosar: DosarAdvisor,
  narator?: Narator,
  toateLocatiile: string[] = [],
): Promise<RezultatNaratiune> {
  const determinist = naratorDeterminist(dosar);
  if (!narator) {
    return { text: determinist, sursa: 'DETERMINIST', motivRezerva: 'Niciun narator configurat.', validare: null };
  }
  let brut: string;
  try {
    brut = await narator(construiestePrompt(dosar));
  } catch (e) {
    return {
      text: determinist, sursa: 'DETERMINIST',
      motivRezerva: `Naratorul a eșuat: ${String((e as Error)?.message ?? e)}.`, validare: null,
    };
  }
  const cifre = valideazaNaratiune(brut, dosar);
  const scop = valideazaScop(brut, dosar, toateLocatiile);
  if (!cifre.valid || !scop.valid) {
    return {
      text: determinist, sursa: 'DETERMINIST',
      motivRezerva: [...cifre.motive, ...scop.motive].join(' '),
      validare: { valid: false, numereStraine: cifre.numereStraine, motive: [...cifre.motive, ...scop.motive] },
    };
  }
  return { text: brut, sursa: 'LLM', motivRezerva: null, validare: cifre };
}
