/**
 * Perioadele surselor și verdictul de combinare.
 *
 * Stratul care leagă `compatibilitate.ts` de starea reală a aplicației. Motorul de comparare
 * nu se rescrie aici: el primește intervale și dă un verdict. Ce lipsea era intrarea —
 * până acum nicio sursă nu-și păstra fereastra cu precizie de zi, iar 4.7 pe 17–23 august și
 * 2.9 pe 1–9 august ajungeau amândouă „2026-08", deci păreau compatibile fiind disjuncte.
 *
 * Regula, o singură dată, aici:
 *
 *   ACCEPT             — toate sursele implicate declară EXACT același interval
 *   BLOCK              — intervalele declarate diferă (disjuncte sau suprapuse parțial)
 *   INSUFFICIENT_DATA  — cel puțin o sursă implicată nu declară intervalul
 *
 * `INSUFFICIENT_DATA` NU blochează. Datele importate înainte de această versiune nu poartă
 * interval; dacă lipsa lui ar bloca, aplicația s-ar opri pe tot ce există deja. Necunoscutul
 * se declară ca necunoscut — nu se transformă într-o acuzație.
 *
 * Blocajul cade DOAR pe cifra combinată. Fiecare raport rămâne vizibil în ecranul lui:
 * un 4.7 e un raport valid despre 4.7 chiar și când nu poate fi împărțit la un 2.9 din
 * altă săptămână.
 */
import { compatibilitate, type Compatibilitate, type IntervalRaport } from './compatibilitate';
import type { AppState, VersiuneSursa } from './types';

// ————————————————————————————————————————————————————————— sursele care se pot combina

/** Rapoartele care pot intra ÎMPREUNĂ într-o singură cifră de Food Cost. */
export type SursaCombinabila = 'PMIX_47' | 'NBO_29' | 'NBO_41';

export const ETICHETA_RAPORT: Record<SursaCombinabila, string> = {
  PMIX_47: '4.7 (vânzări pe produs)',
  NBO_29: '2.9 (consum pe material)',
  NBO_41: '4.1 (vânzări nete)',
};

/** Combinația de bază a Food Cost-ului: consumul real împărțit la vânzări. */
export const COMBINATIE_FC: SursaCombinabila[] = ['NBO_29', 'PMIX_47'];

export interface IntervalSursa extends IntervalRaport {
  tip: SursaCombinabila;
  fisier: string;
  /** Sursa există în stare, dar nu-și declară fereastra. */
  declarat: boolean;
}

const eCombinabila = (tip: string): tip is SursaCombinabila =>
  tip === 'PMIX_47' || tip === 'NBO_29' || tip === 'NBO_41';

/** Versiunea ACTIVĂ a fiecărei surse cerute — istoricul nu intră în verdict. */
function versiuniActive(state: AppState, tipuri: SursaCombinabila[]): VersiuneSursa[] {
  const cerute = new Set<string>(tipuri);
  return (state.versiuniImport ?? []).filter(v => v.activa && cerute.has(v.tip));
}

/**
 * Intervalele declarate de sursele cerute care EXISTĂ în stare. O sursă neimportată nu
 * apare: nu intră în combinație, deci nu are ce să blocheze.
 */
export function intervaleSurse(
  state: AppState, tipuri: SursaCombinabila[] = COMBINATIE_FC,
): IntervalSursa[] {
  return versiuniActive(state, tipuri)
    .filter(v => eCombinabila(v.tip))
    .map(v => ({
      tip: v.tip as SursaCombinabila,
      raport: ETICHETA_RAPORT[v.tip as SursaCombinabila],
      fisier: v.fisier,
      de: v.intervalDe ?? '',
      la: v.intervalLa ?? '',
      declarat: !!(v.intervalDe && v.intervalLa),
    }))
    .sort((a, b) => a.tip.localeCompare(b.tip));
}

// ————————————————————————————————————————————————————————— verdictul

export type VerdictCombinare = 'ACCEPT' | 'BLOCK' | 'INSUFFICIENT_DATA';

export interface VerdictSurse {
  verdict: VerdictCombinare;
  /** Blochează cifra COMBINATĂ. Niciodată vizualizarea rapoartelor individuale. */
  blocheaza: boolean;
  /** Verdictul motorului de comparare, cu zilele fiecărei surse. */
  compat: Compatibilitate;
  intervale: IntervalSursa[];
  /** Sursele prezente care nu-și declară fereastra. */
  nedeclarate: SursaCombinabila[];
  motiv: string;
}

const MOTIV_NEDECLARAT = (lipsa: SursaCombinabila[]) =>
  `${lipsa.map(t => ETICHETA_RAPORT[t]).join(' și ')} nu declară intervalul acoperit, `
  + 'deci compatibilitatea perioadelor nu se poate stabili. Cifrele rămân calculate ca până acum, '
  + 'dar nu sunt garantate a fi din aceeași fereastră. Reimportă rapoartele ca intervalul să fie citit din antet.';

/**
 * Poate fi combinată cifra celor două (sau mai multe) surse? Verdictul se dă pe intervalele
 * DECLARATE; ce nu e declarat rămâne necunoscut, nu presupus greșit.
 */
export function verdictCombinare(
  state: AppState, tipuri: SursaCombinabila[] = COMBINATIE_FC,
): VerdictSurse {
  const intervale = intervaleSurse(state, tipuri);
  const nedeclarate = intervale.filter(i => !i.declarat).map(i => i.tip);
  const declarate = intervale.filter(i => i.declarat);

  // mai puțin de două surse cu interval ⇒ nu există ce compara
  if (declarate.length < 2 || nedeclarate.length > 0) {
    const compat = compatibilitate(intervale.map(i => ({ raport: i.raport, de: i.de, la: i.la })));
    return {
      verdict: 'INSUFFICIENT_DATA', blocheaza: false, compat, intervale, nedeclarate,
      motiv: nedeclarate.length
        ? MOTIV_NEDECLARAT(nedeclarate)
        : 'Sunt necesare cel puțin două rapoarte cu interval declarat pentru a verifica compatibilitatea.',
    };
  }

  const compat = compatibilitate(declarate.map(i => ({ raport: i.raport, de: i.de, la: i.la })));
  return compat.compatibile
    ? { verdict: 'ACCEPT', blocheaza: false, compat, intervale, nedeclarate: [], motiv: compat.motiv }
    : { verdict: 'BLOCK', blocheaza: true, compat, intervale, nedeclarate: [], motiv: compat.motiv };
}

/** Rândul de afișat pentru fiecare sursă: „4.7 (vânzări pe produs) 2026-08-17 → 2026-08-23". */
export const descrieInterval = (i: IntervalSursa) =>
  i.declarat ? `${i.raport}: ${i.de} → ${i.la}` : `${i.raport}: interval nedeclarat`;

/** Rezumatul într-o linie, pentru jurnale și pentru motivele de indisponibilitate. */
export const descrieVerdict = (v: VerdictSurse) =>
  `${v.verdict}${v.intervale.length ? ` · ${v.intervale.map(descrieInterval).join(' · ')}` : ''}`;
