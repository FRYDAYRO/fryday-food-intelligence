/**
 * Actualizarea prețurilor de ingrediente din raportul 2.9 — și impactul fiecărei schimbări
 * asupra Food Cost-ului, calculat ÎNAINTE de a scrie ceva.
 *
 * Raportul 2.9 dă costul realizat pe unitate („Cost per Unit"), pe material și pe perioadă.
 * Nomenclatorul dă prețul de referință. Cele două nu sunt același lucru — 2.9 e FIFO, ieșit
 * din stoc — de aceea prețul nou se adaugă ca intrare DATATĂ, lângă cele vechi, nu peste ele:
 * costul lunii trecute rămâne calculat cu prețul lunii trecute.
 *
 * Impactul se calculează pe identitatea exactă, nu prin estimare:
 *
 *     Δcost = (preț nou − preț vechi) × consumul perioadei
 *     ΔFC   = Δcost ÷ vânzările nete × 100        (în puncte procentuale)
 *
 * Consumul vine din `consumaPerioada` — aceeași funcție pe care o folosește Ingredient
 * Intelligence. Nicio formulă de FC nu se rescrie aici; se compun cele existente.
 */
import type { AppState } from './types';
import { pretLa, type Ctx } from './engine';
import { canalePentru, locatieDin, type CerereFC } from './fc-domeniu';
import { consumaPerioada } from './fc-ingrediente';
import { numitorFC, recipeFC } from './fc-core';

/** O linie de cost din 2.9: materialul și costul lui pe unitate în perioada raportului. */
export interface CostMaterial29 {
  cod: string;
  denumire?: string;
  costPeUnitate: number;
}

export type FelSchimbare = 'CRESTERE' | 'SCADERE' | 'NESCHIMBAT' | 'NOU' | 'NEFOLOSIT';

export interface ImpactPret {
  cod: string;
  denumire: string;
  pretVechi: number | null;
  pretNou: number;
  deltaLei: number | null;
  deltaPct: number | null;
  fel: FelSchimbare;
  /** Consumul perioadei, în UM de bază. Zero când ingredientul nu s-a consumat. */
  consum: number;
  /** (preț nou − preț vechi) × consum. Pozitiv = FC-ul crește. */
  deltaCostLei: number | null;
  /** Δcost ÷ vânzări nete × 100. `null` când nu există numitor. */
  deltaFcPp: number | null;
  /** De ce nu s-a putut calcula impactul, când nu s-a putut. */
  motiv?: string;
}

export interface RezultatActualizare29 {
  cerere: CerereFC;
  /** Vânzările nete pe care s-a raportat impactul — numitorul, declarat. */
  netRON: number;
  sursaNet: string;
  /** FC-ul din rețete înainte de schimbare. */
  fcInaintePct: number | null;
  /** FC-ul după aplicarea tuturor prețurilor noi — suma impactelor, nu o a doua formulă. */
  fcDupaPct: number | null;
  randuri: ImpactPret[];
  /** Materialele din 2.9 care nu există în nomenclator — nu se creează pe tăcute. */
  faraIngredient: string[];
  totalDeltaCostLei: number;
  totalDeltaFcPp: number | null;
}

const rotund = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Ce s-ar schimba dacă prețurile din 2.9 ar deveni prețurile de referință. NU scrie nimic:
 * întoarce impactul, ca omul să vadă înainte să confirme.
 */
export function impactPreturi29(
  state: AppState, ctx: Ctx, cerere: CerereFC, costuri: CostMaterial29[],
): RezultatActualizare29 {
  const loc = locatieDin(cerere.nivel) ?? undefined;
  const canale = canalePentru(cerere.canal);
  const consum = consumaPerioada(state, ctx, cerere.perioada, loc, canale);
  const recipe = recipeFC(state, ctx, cerere);
  const numitor = numitorFC(state, cerere, recipe.netVandut);
  const net = numitor.net;
  // prețul de referință se citește la SFÂRȘITUL perioadei: cu el s-a calculat costul ei
  const laData = cerere.perioada.la;

  const randuri: ImpactPret[] = [];
  const faraIngredient: string[] = [];

  for (const c of costuri) {
    const ing = ctx.ingrediente.get(c.cod);
    if (!ing) { faraIngredient.push(c.cod); continue; }
    const vechiBrut = ing.preturi.length ? pretLa(ing, laData) : null;
    const pretVechi = vechiBrut !== null && vechiBrut > 0 ? vechiBrut : null;
    const consumIng = consum.peIngredient.get(c.cod)?.qty ?? 0;

    const deltaLei = pretVechi === null ? null : rotund(c.costPeUnitate - pretVechi);
    const deltaPct = pretVechi === null || pretVechi === 0 ? null : rotund((deltaLei! / pretVechi) * 100);

    const fel: FelSchimbare = pretVechi === null ? 'NOU'
      : consumIng === 0 ? 'NEFOLOSIT'
        : deltaLei === 0 ? 'NESCHIMBAT'
          : deltaLei! > 0 ? 'CRESTERE' : 'SCADERE';

    const deltaCostLei = deltaLei === null ? null : rotund(deltaLei * consumIng);
    const deltaFcPp = deltaCostLei === null || net <= 0 ? null : rotund((deltaCostLei / net) * 100);

    randuri.push({
      cod: c.cod,
      denumire: c.denumire ?? ing.denumire,
      pretVechi, pretNou: c.costPeUnitate, deltaLei, deltaPct, fel,
      consum: consumIng, deltaCostLei, deltaFcPp,
      ...(pretVechi === null ? { motiv: 'Ingredientul nu are preț de referință — impactul nu se poate calcula.' }
        : consumIng === 0 ? { motiv: 'Nu s-a consumat în perioada analizată — schimbarea nu mișcă FC-ul acum.' }
          : net <= 0 ? { motiv: 'Fără vânzări nete în scop — impactul în puncte procentuale nu are numitor.' }
            : {}),
    });
  }

  // ordonate după cât mișcă FC-ul, în valoare absolută: primul rând e cel care contează
  randuri.sort((a, b) => Math.abs(b.deltaCostLei ?? 0) - Math.abs(a.deltaCostLei ?? 0)
    || a.cod.localeCompare(b.cod));

  const totalDeltaCostLei = rotund(randuri.reduce((s, r) => s + (r.deltaCostLei ?? 0), 0));
  const totalDeltaFcPp = net > 0 ? rotund((totalDeltaCostLei / net) * 100) : null;
  const fcInaintePct = net > 0 ? rotund((recipe.cost / net) * 100) : null;

  return {
    cerere, netRON: net, sursaNet: numitor.sursa,
    fcInaintePct,
    fcDupaPct: fcInaintePct === null || totalDeltaFcPp === null ? null : rotund(fcInaintePct + totalDeltaFcPp),
    randuri, faraIngredient,
    totalDeltaCostLei, totalDeltaFcPp,
  };
}

/**
 * Scrie prețurile noi ca intrări DATATE. Istoricul nu se rescrie: costul perioadelor
 * anterioare rămâne calculat cu prețurile lor. Un preț identic cu cel curent nu adaugă
 * nimic — altfel un import săptămânal ar umple istoricul cu intrări care nu spun nimic.
 */
export function aplicaPreturi29(
  state: AppState, ctx: Ctx, costuri: CostMaterial29[], validDeLa: string,
): { stareNoua: AppState; scrise: number; sarite: number } {
  let scrise = 0, sarite = 0;
  const ingrediente = state.ingrediente.map(ing => {
    const c = costuri.find(x => x.cod === ing.cod);
    if (!c) return ing;
    const curent = ing.preturi.length ? pretLa(ing, validDeLa) : null;
    if (curent !== null && curent === c.costPeUnitate) { sarite++; return ing; }
    scrise++;
    return {
      ...ing,
      preturi: [...ing.preturi.filter(p => p.validDeLa !== validDeLa), { validDeLa, pret: c.costPeUnitate }]
        .sort((a, b) => a.validDeLa.localeCompare(b.validDeLa)),
    };
  });
  void ctx;
  return { stareNoua: { ...state, ingrediente }, scrise, sarite };
}
