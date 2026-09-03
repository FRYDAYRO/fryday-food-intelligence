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
import type { AppState, Ingredient, Material29 } from './types';
import { UMS, pretLa, sorteazaPreturi, type Ctx } from './engine';
import { canalePentru, locatieDin, type CerereFC } from './fc-domeniu';
import { consumaPerioada } from './fc-ingrediente';
import { numitorFC, recipeFC } from './fc-core';
import { identificaIngredient } from './fc-material';
import { fereastraRand } from './surse-29';
import { umNBO } from './nbo';

/** O linie de cost din 2.9: ingredientul și prețul lui în UM-ul nomenclatorului, în perioada raportului. */
export interface CostMaterial29 {
  /** Codul INGREDIENTULUI din nomenclator (identitatea rezolvată), nu al materialului din raport. */
  cod: string;
  denumire?: string;
  /** Prețul în UM-ul ingredientului (lei/kg, lei/l, lei/buc) — „Cost per Unit" convertit din unitatea de inventar. */
  costPeUnitate: number;
  /** Perioada raportului din care vine prețul și rândul sursă — proveniența intrării de istoric. */
  perioada?: string;
  rand?: number;
  /** Identitatea materialului în 2.9 (Item ID), când diferă de codul ingredientului. */
  material?: string;
  /** Restaurantul raportului: costul FIFO e al lui. */
  restaurant?: string;
  /** Începutul ferestrei raportului: data de la care se aplică prețul. */
  validDeLa?: string;
}

// ————————————————————————————————————————————— D4: prețul efectiv din „Cost per Unit"

/**
 * Peste ce abatere relativă între „Usage lei ÷ Usage unități" și „Cost per Unit" se
 * semnalează inconsistența. Consumul în lei e rotunjit la leu în raport, deci pe sume mici
 * abaterea e zgomot de rotunjire: se cere și un consum de cel puțin `MIN_LEI_CONSISTENTA_29`.
 */
export const PRAG_CONSISTENTA_29 = 0.05;
export const MIN_LEI_CONSISTENTA_29 = 20;

export type FelPret29 = 'ELIGIBIL' | 'NEMAPAT' | 'FARA_COST' | 'ZERO_SAU_NEGATIV' | 'UM_NECUNOSCUTA' | 'UM_INCOMPATIBILA';

export interface DiagnosticPret29 {
  material: string;
  denumire: string;
  /** Ingredientul identificat (cod, denumire sau alias aprobat) — `null` când materialul e nemapat. */
  ingredient: string | null;
  fel: FelPret29;
  costPeUnitate: number | null;
  umInventar: string | null;
  /** Prețul în UM-ul ingredientului, când e eligibil. */
  pret: number | null;
  um: string | null;
  /** Diagnosticul de consistență: prețul implicit Usage lei ÷ unități, abaterea față de Cost per Unit. */
  consistenta?: { implicit: number; abatere: number; avertisment: boolean };
  motiv?: string;
  perioada: string;
  validDeLa: string;
  rand?: number;
}

export interface RezultatPreturi29 {
  costuri: CostMaterial29[];
  diagnostice: DiagnosticPret29[];
  /** Avertismentele de consistență, gata de afișat: material, Cost per Unit, prețul implicit, abaterea. */
  consistenta: string[];
  numar: Record<FelPret29, number>;
}

const rotund6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * D4 — prețul efectiv al fiecărui material din 2.9, din „Cost per Unit", în UM-ul ingredientului:
 *   · Cost per Unit > 0 și unitate de inventar cunoscută, convertibilă la UM-ul ingredientului → eligibil;
 *   · zero sau negativ → fără preț valid: diagnostic explicit, nomenclatorul nu se atinge;
 *   · Usage lei ÷ Usage unități e DOAR diagnostic: o abatere relevantă dă avertisment, dar
 *     Cost per Unit rămâne valoarea sursă — nu se „corectează" din raportul celor două;
 *   · materialele nemapate nu primesc preț: intră în coada de aprobare (D1), nu se ghicesc.
 * Pur: nu scrie nimic; întoarce costurile de aplicat și diagnosticul fiecărui rând.
 */
export function preturiDin29(ingrediente: Ingredient[], materiale: Material29[]): RezultatPreturi29 {
  const costuri: CostMaterial29[] = [];
  const diagnostice: DiagnosticPret29[] = [];
  const consistenta: string[] = [];
  const numar: Record<FelPret29, number> = { ELIGIBIL: 0, NEMAPAT: 0, FARA_COST: 0, ZERO_SAU_NEGATIV: 0, UM_NECUNOSCUTA: 0, UM_INCOMPATIBILA: 0 };
  const vazute = new Set<string>();

  for (const m of materiale) {
    const validDeLa = fereastraRand(m).de;
    const baza = { material: m.material, denumire: m.denumire, perioada: m.perioada, validDeLa, ...(m.sursa?.rand !== undefined ? { rand: m.sursa.rand } : {}) };
    const cost = m.costPeUnitate;
    const umInventar = m.umInventar ?? null;
    const pune = (d: Omit<DiagnosticPret29, keyof typeof baza>) => { diagnostice.push({ ...baza, ...d }); numar[d.fel]++; };

    const codIng = identificaIngredient(ingrediente, m.material, m.denumire);
    if (cost === undefined || cost === null) { pune({ ingredient: codIng, fel: 'FARA_COST', costPeUnitate: null, umInventar, pret: null, um: null, motiv: 'Raportul nu dă Cost per Unit pe acest rând.' }); continue; }
    if (!codIng) { pune({ ingredient: null, fel: 'NEMAPAT', costPeUnitate: cost, umInventar, pret: null, um: null, motiv: 'Materialul nu are corespondent în nomenclator — se leagă în coada de aprobare, nu se ghicește.' }); continue; }
    if (!(cost > 0)) { pune({ ingredient: codIng, fel: 'ZERO_SAU_NEGATIV', costPeUnitate: cost, umInventar, pret: null, um: null, motiv: `Cost per Unit ${cost} lei nu e un preț valid — nomenclatorul nu se actualizează din el.` }); continue; }
    const ing = ingrediente.find(i => i.cod === codIng)!;
    const umCod = umInventar ? umNBO(umInventar) : null;
    if (!umCod) { pune({ ingredient: codIng, fel: 'UM_NECUNOSCUTA', costPeUnitate: cost, umInventar, pret: null, um: ing.um, motiv: `Unitatea de inventar „${umInventar ?? '—'}" nu e recunoscută — prețul nu se poate exprima în ${ing.um}.` }); continue; }
    if (UMS[umCod].baza !== ing.um) { pune({ ingredient: codIng, fel: 'UM_INCOMPATIBILA', costPeUnitate: cost, umInventar, pret: null, um: ing.um, motiv: `Costul e pe ${umInventar} (${UMS[umCod].baza}), ingredientul e ținut în ${ing.um} — fără conversie sigură.` }); continue; }
    // lei pe unitatea de inventar → lei pe UM-ul de bază al ingredientului (0,04 lei/g = 40 lei/kg)
    const pret = rotund6(cost / UMS[umCod].f);

    // diagnosticul de consistență: prețul implicit din consum, pe aceeași unitate de inventar
    let cons: DiagnosticPret29['consistenta'];
    if (m.cant !== null && m.cant !== undefined && m.cant !== 0 && Math.abs(m.costActual) >= MIN_LEI_CONSISTENTA_29) {
      const implicit = m.costActual / m.cant;
      // rotunjit înainte de comparație: 0,021 față de 0,02 e exact 5 %, nu 5,000000000002 %
      const abatere = rotund6(Math.abs(implicit - cost) / cost);
      cons = { implicit: rotund6(implicit), abatere, avertisment: abatere > PRAG_CONSISTENTA_29 };
      if (cons.avertisment) {
        consistenta.push(`${m.denumire} (${m.material}): Cost per Unit ${cost} lei/${umInventar}, din consum ${cons.implicit} lei/${umInventar} (${Math.round(abatere * 100)}%)`);
      }
    }
    if (vazute.has(codIng)) {
      pune({ ingredient: codIng, fel: 'ELIGIBIL', costPeUnitate: cost, umInventar, pret, um: ing.um, ...(cons ? { consistenta: cons } : {}), motiv: 'Un alt rând al raportului a dat deja prețul acestui ingredient — se păstrează primul.' });
      continue;
    }
    vazute.add(codIng);
    pune({ ingredient: codIng, fel: 'ELIGIBIL', costPeUnitate: cost, umInventar, pret, um: ing.um, ...(cons ? { consistenta: cons } : {}) });
    costuri.push({
      cod: codIng, denumire: ing.denumire, costPeUnitate: pret, perioada: m.perioada, validDeLa,
      ...(m.sursa?.rand !== undefined ? { rand: m.sursa.rand } : {}),
      ...(m.material !== codIng ? { material: m.material } : {}),
      ...(m.locatie ? { restaurant: m.locatie } : {}),
    });
  }
  return { costuri, diagnostice, consistenta, numar };
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
  state: AppState, ctx: Ctx | null, costuri: CostMaterial29[], validDeLa: string,
  sursa?: { fisier: string; amprenta?: string },
): { stareNoua: AppState; scrise: number; sarite: number; inlocuiteAltRestaurant: string[] } {
  let scrise = 0, sarite = 0;
  const inlocuiteAltRestaurant: string[] = [];
  const ingrediente = state.ingrediente.map(ing => {
    const c = costuri.find(x => x.cod === ing.cod);
    if (!c) return ing;
    const curent = ing.preturi.length ? pretLa(ing, validDeLa) : null;
    if (curent !== null && curent === c.costPeUnitate) { sarite++; return ing; }
    scrise++;
    // se înlocuiește DOAR propria intrare 2.9 de la aceeași dată (corecția aceleiași ferestre);
    // lista de prețuri sau intrarea manuală de la aceeași dată rămân în istoric (D2), iar
    // intrările săptămânilor sau ale lunii de alături nu sunt atinse — validDeLa e altul
    const proprie = (p: { validDeLa: string; sursa?: { tip: string } }) => p.validDeLa === validDeLa && p.sursa?.tip === 'NBO_29';
    // nomenclatorul are un singur preț pe ingredient: un 2.9 al altui restaurant, pe aceeași
    // dată, e înlocuit — și spus, nu ascuns
    for (const p of ing.preturi) {
      if (proprie(p) && p.sursa?.restaurant && c.restaurant && p.sursa.restaurant !== c.restaurant) {
        inlocuiteAltRestaurant.push(`${ing.cod} (${p.sursa.restaurant} → ${c.restaurant})`);
      }
    }
    return {
      ...ing,
      preturi: sorteazaPreturi([...ing.preturi.filter(p => !proprie(p)), {
        validDeLa, pret: c.costPeUnitate,
        sursa: {
          tip: 'NBO_29' as const, material: c.material ?? c.cod,
          ...(sursa ? { fisier: sursa.fisier } : {}), ...(sursa?.amprenta ? { amprenta: sursa.amprenta } : {}),
          ...(c.perioada ? { perioada: c.perioada } : {}), ...(c.rand !== undefined ? { rand: c.rand } : {}),
          ...(c.restaurant ? { restaurant: c.restaurant } : {}),
        },
      }]),
    };
  });
  void ctx;
  return { stareNoua: { ...state, ingrediente }, scrise, sarite, inlocuiteAltRestaurant };
}
