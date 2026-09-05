/**
 * Ajustările de inventar din NBO 2.9 („Inv Adj"), ca cifră SEPARATĂ de puntea Usage.
 *
 * Identitatea demonstrată pe raportul real: `Usage Actual = Beg + Pur + Trans − Adj − End`.
 * Ajustările sunt deci EXCLUSE din consumul raportat (unități, lei, %), din End Ext și din
 * Days On Hand, iar raportul nu le tipărește în lei. De aici regulile de aici:
 *  · `consumFC` / `consumTotal` / FC Curat / FC operațional rămân pe Usage lei tipărit (FIFO);
 *  · Adj × Cost per Unit e o ESTIMARE la prețul tipărit, nu evaluarea FIFO — și e etichetată așa;
 *  · unitățile nu se însumează între UM diferite: rândurile poartă fiecare UM-ul lui;
 *  · Adj ≠ 0 fără cost utilizabil → estimare incompletă; Adj negativ → convenție nevalidată;
 *    în ambele cazuri FC-ul cu ajustări NU se prezintă ca rezultat;
 *  · fișier fără coloana Adj → ajustări NECUNOSCUTE (nu zero), FC-ul cu ajustări e indisponibil;
 *  · rândurile vin explicit din `materiale29` (nu din rollup-ul `linii29`), pe aceeași selecție
 *    de ferestre ca `nboFC`: un import 2.9 pe categorie n-are materiale, deci n-are ajustări;
 *  · ajustările NU sunt etichetate drept waste: natura lor fizică se stabilește din 2.8.
 */
import { clasifica } from './engine';
import { selecteaza29 } from './surse-29';
import { identificaIngredient } from './fc-material';
import { nboFC, numitorFC, recipeFC, type NumitorFC } from './fc-core';
import { locatieDin, type CerereFC, type CtxFC } from './fc-domeniu';
import type { Explicatie } from './scoruri';
import type { AppState, Clasa29, Fereastra29, Sursa29 } from './types';

export interface AjustareMaterial29 {
  locatie: string | null;
  fereastra: Fereastra29;
  material: string;
  denumire: string;
  /** Ingredientul mapat (cod sau alias), dacă există. */
  ingredient: string | null;
  categorie: string;
  clasa: Clasa29;
  /** „Inv Adj" exact cum e tipărit, în `umInventar`. */
  unitati: number;
  umInventar: string | null;
  costPeUnitate: number | null;
  /** |Adj| × Cost per Unit, doar când costul e utilizabil (> 0); altfel `null` cu motiv. */
  leiEstimat: number | null;
  motivFaraEvaluare: string | null;
  /** Cost per Unit sub 0,10 lei: prețul tipărit cu două zecimale are precizie limitată. */
  precizieLimitata: boolean;
  sursa?: Sursa29;
}

export interface Ajustari29 {
  cerere: CerereFC;
  disponibil: boolean;
  motiv: string | null;
  ferestre: Fereastra29[];
  /** Doar materialele cu ajustare ≠ 0, fiecare cu UM-ul lui — fără total în unități. */
  randuri: AjustareMaterial29[];
  /** Materiale ale selecției cu Adj = 0 tipărit: contribuie zero, fără să ceară preț. */
  materialeCuZero: number;
  /** Materiale ale selecției fără coloana Adj: ajustare necunoscută, nu zero. */
  materialeFaraColoana: number;
  /** Adj ≠ 0 fără cost utilizabil: nu intră în nicio sumă. */
  materialeFaraEvaluare: number;
  materialeNegative: number;
  /** Σ estimărilor pe semn, separat (nu se compensează). */
  leiEstimatPozitiv: number;
  leiEstimatNegativ: number;
  /** Partea Food + Paper a estimărilor pozitive (aceeași clasificare ca `consumFC`). */
  leiEstimatPozitivFC: number;
  /** Estimarea acoperă toate ajustările ≠ 0 și nu există necunoscute sau semne nevalidate. */
  complet: boolean;
  /** FC operațional (tot 2.9 ÷ numitor), cum îl vede motorul pe aceeași cerere. */
  fcOperationalPct: number | null;
  /** (consum 2.9 total + Σ Adj × CPU) ÷ numitor — doar când `complet`; nu înlocuiește nimic. */
  fcCuAjustariEstimatPct: number | null;
  motivFcIndisponibil: string | null;
  numitor: NumitorFC | null;
  explicatie: Explicatie;
}

export const PRAG_PRECIZIE_CPU_29 = 0.1;

/** Ajustările 2.9 pe cererea dată, calculate la cerere din `materiale29` — pur, fără stare nouă. */
export function ajustari29(state: AppState, ctx: CtxFC, cerere: CerereFC): Ajustari29 {
  const loc = locatieDin(cerere.nivel);
  const gol = (motiv: string): Ajustari29 => ({
    cerere, disponibil: false, motiv, ferestre: [], randuri: [], materialeCuZero: 0, materialeFaraColoana: 0,
    materialeFaraEvaluare: 0, materialeNegative: 0, leiEstimatPozitiv: 0, leiEstimatNegativ: 0, leiEstimatPozitivFC: 0,
    complet: false, fcOperationalPct: null, fcCuAjustariEstimatPct: null, motivFcIndisponibil: motiv, numitor: null,
    explicatie: {
      date: [], logica: 'Ajustările se citesc doar din rândurile 2.9 pe material ale ferestrelor selectate.',
      calcule: [], impact: 'Fără rânduri pe material nu există ajustări de arătat — nici zero, nici estimare.',
      incredere: 'SCAZUTA', motivIncredere: motiv,
    },
  });

  // selecția explicită din materiale29: aceleași reguli de fereastră ca nboFC, dar pe rândurile
  // de material — un 2.9 importat pe categorie are linii29, nu materiale29, deci n-are ajustări
  const sel = selecteaza29(state.materiale29 ?? [], cerere.perioada, loc);
  // un 2.9 importat doar pe categorie n-are materiale29 pe fereastră → selecția e goală → indisponibil
  if (!sel.disponibil) return gol(sel.motiv ?? 'Raportul 2.9 pe material nu e disponibil pe această cerere.');

  const randuri: AjustareMaterial29[] = [];
  let cuZero = 0, faraColoana = 0, faraEvaluare = 0, negative = 0;
  let leiPoz = 0, leiNeg = 0, leiPozFC = 0;
  for (const m of sel.randuri) {
    if (m.ajustari === undefined) { faraColoana++; continue; }
    if (m.ajustari === 0) { cuZero++; continue; }
    const cpu = m.costPeUnitate ?? null;
    const utilizabil = cpu !== null && cpu > 0;
    const leiEstimat = utilizabil ? Math.abs(m.ajustari) * cpu : null;
    const clasa = clasifica(m.categorie, state.reguli).clasa;
    if (m.ajustari < 0) negative++;
    if (!utilizabil) faraEvaluare++;
    else if (m.ajustari > 0) { leiPoz += leiEstimat!; if (clasa === 'FOOD' || clasa === 'PAPER') leiPozFC += leiEstimat!; }
    else leiNeg += leiEstimat!;
    randuri.push({
      locatie: m.locatie, fereastra: m.fereastra ?? sel.ferestre[0], material: m.material, denumire: m.denumire,
      ingredient: identificaIngredient(state.ingrediente, m.material, m.denumire),
      categorie: m.categorie, clasa, unitati: m.ajustari, umInventar: m.umInventar ?? null, costPeUnitate: cpu,
      leiEstimat,
      motivFaraEvaluare: utilizabil ? null
        : cpu === null ? 'fără Cost per Unit în sursă' : 'Cost per Unit zero sau negativ — nu se poate estima',
      precizieLimitata: utilizabil && cpu < PRAG_PRECIZIE_CPU_29,
      ...(m.sursa ? { sursa: m.sursa } : {}),
    });
  }
  randuri.sort((a, b) => (b.leiEstimat ?? -1) - (a.leiEstimat ?? -1) || a.denumire.localeCompare(b.denumire));

  const complet = faraColoana === 0 && faraEvaluare === 0 && negative === 0;
  const nbo = nboFC(state, cerere);
  const recipe = recipeFC(state, ctx, cerere);
  const numitor = numitorFC(state, cerere, recipe.netVandut);
  const fcOperationalPct = nbo.disponibil && numitor.net > 0 ? (nbo.consumTotal / numitor.net) * 100 : null;
  let motivFc: string | null = null;
  if (!nbo.disponibil) motivFc = nbo.motivIndisponibil ?? 'Consumul 2.9 nu e disponibil pe această cerere.';
  else if (!(numitor.net > 0)) motivFc = 'Fără vânzări nete pe această cerere: procentul nu are numitor.';
  else if (faraColoana) motivFc = `${faraColoana} rânduri fără coloana de ajustări: ajustările sunt necunoscute, nu zero.`;
  else if (negative) motivFc = `${negative} materiale cu ajustare negativă: convenția de semn nu e validată.`;
  else if (faraEvaluare) motivFc = `${faraEvaluare} materiale cu ajustare fără Cost per Unit utilizabil: estimarea e incompletă.`;
  const fcCuAjustariEstimatPct = motivFc === null && fcOperationalPct !== null
    ? ((nbo.consumTotal + leiPoz) / numitor.net) * 100 : null;

  const explicatie: Explicatie = {
    date: [
      `${sel.randuri.length} rânduri 2.9 pe material, ferestre ${sel.ferestre.map(f => `${f.de} → ${f.la}`).join(', ')}`,
      `${randuri.length} materiale cu Inv Adj ≠ 0, ${cuZero} cu 0,0 tipărit, ${faraColoana} fără coloană`,
      numitor.net > 0 ? `numitor ${numitor.sursa}: ${numitor.net.toFixed(2)} lei` : 'fără numitor',
    ],
    logica: 'Usage Actual = Beg + Pur + Trans − Adj − End: ajustările sunt excluse din consumul raportat. '
      + 'Estimarea lor este |Adj| × Cost per Unit (prețul tipărit), nu evaluarea FIFO a raportului; semnele nu se compensează.',
    calcule: [
      `Σ pozitive = ${leiPoz.toFixed(2)} lei (din care Food + Paper ${leiPozFC.toFixed(2)} lei); Σ negative = ${leiNeg.toFixed(2)} lei`,
      fcCuAjustariEstimatPct !== null && nbo.disponibil
        ? `FC cu ajustări estimat = (${nbo.consumTotal.toFixed(2)} + ${leiPoz.toFixed(2)}) ÷ ${numitor.net.toFixed(2)} = ${fcCuAjustariEstimatPct.toFixed(2)} %, față de FC operațional ${fcOperationalPct!.toFixed(2)} %`
        : `FC cu ajustări: indisponibil — ${motivFc}`,
    ],
    impact: 'Cifră separată de puntea Usage: nu intră în consum, nu se scade din Neexplicat și nu e etichetată drept waste.',
    incredere: complet ? 'MEDIE' : 'SCAZUTA',
    motivIncredere: complet
      ? 'Estimare la Cost per Unit, nu evaluare FIFO; natura fizică a ajustărilor se stabilește din raportul 2.8.'
      : (motivFc ?? 'Estimare incompletă.'),
  };

  return {
    cerere, disponibil: true, motiv: null, ferestre: sel.ferestre, randuri,
    materialeCuZero: cuZero, materialeFaraColoana: faraColoana, materialeFaraEvaluare: faraEvaluare, materialeNegative: negative,
    leiEstimatPozitiv: leiPoz, leiEstimatNegativ: leiNeg, leiEstimatPozitivFC: leiPozFC, complet,
    fcOperationalPct, fcCuAjustariEstimatPct, motivFcIndisponibil: motivFc, numitor, explicatie,
  };
}
