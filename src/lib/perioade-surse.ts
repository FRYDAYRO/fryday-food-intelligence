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
import type { FCPeriod } from './fc-domeniu';

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
/** Sursele agregate PE FEREASTRĂ (un rând = tot raportul): nu se taie la cerere, se aleg pe granularitate. */
const PE_FEREASTRA = new Set<SursaCombinabila>(['NBO_29']);

const ziUrmatoare = (d: string) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
const marginiLunii = (luna: string) => {
  const [an, l] = luna.split('-').map(Number);
  return { de: `${luna}-01`, la: new Date(Date.UTC(an, l, 0)).toISOString().slice(0, 10) };
};
const luniCererii = (p: FCPeriod): string[] => {
  const rez: string[] = [];
  for (let l = p.de.slice(0, 7); l <= p.la.slice(0, 7);) {
    rez.push(l);
    const [an, ll] = l.split('-').map(Number);
    l = ll === 12 ? `${an + 1}-01` : `${an}-${String(ll + 1).padStart(2, '0')}`;
  }
  return rez;
};

/**
 * Intervalele surselor PENTRU O CERERE — ce fereastră servește efectiv cererea, pe fiecare tip,
 * dintre TOATE versiunile (nu doar cea activă: un săptămânal și un lunar coexistă).
 *
 *  · sursele cu rânduri DATATE (4.7, 4.1) servesc orice cerere cuprinsă în fereastra lor:
 *    fereastra efectivă e cererea însăși; mai multe ferestre care o acoperă fără goluri
 *    se compun; o acoperire parțială rămâne parțială și se judecă ca atare (BLOCK explicit);
 *  · sursele agregate pe fereastră (2.9) se aleg pe granularitate: raportul lunar pentru o
 *    lună, cel săptămânal cu exact fereastra cerută pentru o săptămână — niciodată tăiate;
 *  · un tip cu ferestre declarate, dar niciuna pe cerere, intră cu cea mai recentă: e
 *    DEMONSTRAT pe altă fereastră, nu absent — garda de azi nu se relaxează;
 *  · versiunile fără fereastră rămân „necunoscute" (INSUFFICIENT_DATA), ca azi.
 */
export function intervaleSursePentru(
  state: AppState, tipuri: SursaCombinabila[], perioada: FCPeriod,
): IntervalSursa[] {
  const rez: IntervalSursa[] = [];
  for (const tip of tipuri) {
    const ale = (state.versiuniImport ?? []).filter(v => v.tip === tip);
    if (!ale.length) continue;
    // aceeași fereastră de mai multe ori (reimport corectat) → ultima versiune
    const peFereastra = new Map<string, VersiuneSursa>();
    for (const v of ale.filter(v => v.intervalDe && v.intervalLa)) {
      const k = `${v.intervalDe}|${v.intervalLa}`;
      const e = peFereastra.get(k);
      if (!e || v.nr > e.nr) peFereastra.set(k, v);
    }
    const declarate = [...peFereastra.values()].sort((a, b) => a.intervalDe!.localeCompare(b.intervalDe!));
    const nedeclarata = ale.find(v => !(v.intervalDe && v.intervalLa));
    const ca = (v: VersiuneSursa, de = v.intervalDe!, la = v.intervalLa!): IntervalSursa =>
      ({ tip, raport: ETICHETA_RAPORT[tip], fisier: v.fisier, de, la, declarat: true });
    const necunoscuta = (v: VersiuneSursa): IntervalSursa =>
      ({ tip, raport: ETICHETA_RAPORT[tip], fisier: v.fisier, de: '', la: '', declarat: false });
    const altaFereastra = () => {
      const ultima = [...declarate].sort((a, b) => b.nr - a.nr)[0];
      if (ultima) rez.push(ca(ultima));
      else if (nedeclarata) rez.push(necunoscuta(nedeclarata));
    };

    if (PE_FEREASTRA.has(tip)) {
      if (perioada.tip === 'SAPTAMANA') {
        const exact = declarate.find(v => v.intervalDe === perioada.de && v.intervalLa === perioada.la);
        if (exact) rez.push(ca(exact)); else altaFereastra();
      } else {
        for (const luna of luniCererii(perioada)) {
          const { de, la } = marginiLunii(luna);
          const exact = declarate.find(v => v.intervalDe === de && v.intervalLa === la);
          if (exact) rez.push(ca(exact));
          else if (nedeclarata) rez.push(necunoscuta(nedeclarata));
          else altaFereastra();
        }
      }
      continue;
    }

    const ating = declarate.filter(v => v.intervalDe! <= perioada.la && v.intervalLa! >= perioada.de);
    if (!ating.length) { altaFereastra(); continue; }
    const contine = ating.find(v => v.intervalDe! <= perioada.de && v.intervalLa! >= perioada.la);
    if (contine) { rez.push(ca(contine, perioada.de, perioada.la)); continue; }
    // tăiate la cerere, apoi verificate: acoperă cererea fără goluri și fără suprapuneri?
    const taiate = ating.map(v => ({ v, de: v.intervalDe! < perioada.de ? perioada.de : v.intervalDe!, la: v.intervalLa! > perioada.la ? perioada.la : v.intervalLa! }));
    const acopera = taiate[0].de === perioada.de && taiate[taiate.length - 1].la === perioada.la
      && taiate.every((x, i) => i === 0 || ziUrmatoare(taiate[i - 1].la) === x.de);
    if (acopera) {
      rez.push({ tip, raport: ETICHETA_RAPORT[tip], fisier: taiate.map(x => x.v.fisier).join(' + '), de: perioada.de, la: perioada.la, declarat: true });
    } else {
      rez.push(...taiate.map(x => ca(x.v, x.de, x.la)));
    }
  }
  return rez.sort((a, b) => a.tip.localeCompare(b.tip) || a.de.localeCompare(b.de));
}

export function verdictCombinare(
  state: AppState, tipuri: SursaCombinabila[] = COMBINATIE_FC, perioada?: FCPeriod,
): VerdictSurse {
  const intervale = perioada ? intervaleSursePentru(state, tipuri, perioada) : intervaleSurse(state, tipuri);
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

// ————————————————————————————————————————————————————————— banda de perioade

/**
 * Combinațiile pe care motoarele le calculează efectiv. Nu sunt o alegere de interfață:
 * `bridgeFC` compară 2.9 cu 4.7, iar `numitorFC` compară 4.1 cu 4.7. Sunt DOUĂ verdicte
 * distincte și rămân distincte — un al treilea, „global", ar fi o judecată pe care niciun
 * motor nu o face.
 */
export interface CombinatieVerdict {
  cheie: 'FOOD_COST' | 'NUMITOR';
  eticheta: string;
  /** Ce calcul se pierde când verdictul blochează. */
  consecinta: string;
  tipuri: SursaCombinabila[];
  verdict: VerdictSurse;
}

/** Statusul de titlu al benzii — reducerea celor două verdicte, nu o evaluare nouă. */
export type StatusBanda = 'GOL' | 'ACCEPT' | 'INSUFFICIENT_DATA' | 'BLOCK';

export interface BandaPerioade {
  status: StatusBanda;
  /** Toate sursele combinabile prezente, cu intervalul lor. Un fapt, nu o judecată. */
  intervale: IntervalSursa[];
  combinatii: CombinatieVerdict[];
  /** Rezumatul de o linie, pentru forma compactă a benzii. */
  titlu: string;
}

/**
 * Titluri SCURTE, deliberat. Banda stă pe fiecare ecran, inclusiv pe telefon, unde o frază
 * întreagă plus rezumatul surselor ar umple cinci rânduri înainte de orice conținut.
 * Explicația completă trăiește în partea desfășurată, unde are loc.
 */
const TITLU: Record<StatusBanda, string> = {
  GOL: 'Nicio sursă importată',
  ACCEPT: 'Aceeași perioadă',
  INSUFFICIENT_DATA: 'Compatibilitate incertă',
  BLOCK: 'Perioadele nu coincid',
};

/**
 * Tot ce trebuie ca să se poată desena banda de perioade. Citește doar versiunile de
 * import — nu rulează `bridgeFC` și nicio agregare grea — și întoarce EXACT verdictele pe
 * care le folosesc motoarele, prin aceeași funcție. Nu pot diverge, pentru că nu sunt două.
 */
export function bandaPerioade(state: AppState): BandaPerioade {
  const intervale = intervaleSurse(state, ['PMIX_47', 'NBO_29', 'NBO_41']);
  const are = (t: SursaCombinabila) => intervale.some(i => i.tip === t);

  const combinatii: CombinatieVerdict[] = [];
  if (are('NBO_29') || are('PMIX_47')) {
    combinatii.push({
      cheie: 'FOOD_COST',
      eticheta: 'Food Cost (2.9 × 4.7)',
      consecinta: 'consumul real, variance-ul și FC-ul actual',
      tipuri: COMBINATIE_FC,
      verdict: verdictCombinare(state, COMBINATIE_FC),
    });
  }
  if (are('NBO_41')) {
    combinatii.push({
      cheie: 'NUMITOR',
      eticheta: 'Numitor (4.1 × 4.7)',
      consecinta: 'vânzările nete ca numitor — rămâne PMIX-ul, din aceeași fereastră cu costul',
      tipuri: ['NBO_41', 'PMIX_47'],
      verdict: verdictCombinare(state, ['NBO_41', 'PMIX_47']),
    });
  }

  const status: StatusBanda = !intervale.length ? 'GOL'
    : combinatii.some(c => c.verdict.blocheaza) ? 'BLOCK'
      : combinatii.some(c => c.verdict.verdict === 'INSUFFICIENT_DATA') ? 'INSUFFICIENT_DATA'
        : combinatii.length ? 'ACCEPT' : 'INSUFFICIENT_DATA';

  return { status, intervale, combinatii, titlu: TITLU[status] };
}

/** Rândul de afișat pentru fiecare sursă: „4.7 (vânzări pe produs) 2026-08-17 → 2026-08-23". */
export const descrieInterval = (i: IntervalSursa) =>
  i.declarat ? `${i.raport}: ${i.de} → ${i.la}` : `${i.raport}: interval nedeclarat`;

/** Rezumatul într-o linie, pentru jurnale și pentru motivele de indisponibilitate. */
export const descrieVerdict = (v: VerdictSurse) =>
  `${v.verdict}${v.intervale.length ? ` · ${v.intervale.map(descrieInterval).join(' · ')}` : ''}`;
