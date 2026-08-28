// Ingredient Intelligence — cine și cu cât a mișcat Food Cost-ul.
//
// Identități verificate (pe o fixtură cu cifre calculate DE MÂNĂ, apoi pe seed):
//   Δcost   = efect preț + efect consum + interacțiune preț          (exact)
//   consum  = efect rețetă + efect mix + interacțiune consum         (exact)
//   companie = Σ restaurante (aceeași trecere, ca sume)
//   consumul fiecărei perioade folosește versiunea de rețetă ÎN VIGOARE ATUNCI
//   datele lipsă rămân null / refuz cu motiv — niciodată zero tăcut
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, consumuriLuna } from '../src/lib/engine';
import { COMPANIE, perioadaDin, perioadeDinLuna, restaurant } from '../src/lib/fc-domeniu';
import {
  PRAGURI_IMPLICITE, analizaIngrediente, descrieAnaliza,
  type CerereIngrediente, type TipComparatie,
} from '../src/lib/fc-ingrediente';
import { simuleazaFC } from '../src/lib/fc-simulare';
import type { AppState, Ingredient, Produs, Reteta, VanzareFapt } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const LUNA = perioadaDin('2026-07-15', 'LUNA');
const cer = (comparatie: TipComparatie = 'LUNA_PRECEDENTA', nivel = COMPANIE as CerereIngrediente['nivel'], canal: CerereIngrediente['canal'] = 'TOTAL'): CerereIngrediente =>
  ({ perioada: LUNA, nivel, canal, comparatie });

// ————————————————————————————————————————————————————————— fixtura cu cifre de mână

// ING-A: 10 lei/kg în iunie, 12 în iulie. Rețeta PA: v1 (100g A + 1 B), v2 din 1 iulie (120g A + 1 B).
// Iunie: 150 buc (L01 100 / L02 50), net 3000. Iulie: 200 buc (L01 120+20 delivery / L02 60), net 4000.
//   qA iunie = 150 × 0,1 = 15 kg      qA iulie = 200 × 0,12 = 24 kg
//   cost A: 150 → 288 lei; Δ = 138 = preț 30 (2×15) + consum 90 (9×10) + interacțiune 18 (2×9)
//   consum 90 = mix 50 (10×50×0,1) + rețetă 30 (10×150×0,02) + interacțiune 10 (10×50×0,02)
const ingA: Ingredient = {
  cod: 'ING-A', denumire: 'Carne test', categorie: 'Carne', tip: 'FOOD', um: 'kg',
  preturi: [{ validDeLa: '2026-01-01', pret: 10 }, { validDeLa: '2026-07-01', pret: 12 }], activ: true,
};
const ingB: Ingredient = {
  cod: 'ING-B', denumire: 'Ambalaj test', categorie: 'Ambalaje', tip: 'PACKAGING', um: 'buc',
  preturi: [{ validDeLa: '2026-01-01', pret: 2 }], activ: true,
};
const retetaPA: Reteta = {
  cod: 'PA', tip: 'PRODUS', denumire: 'Produs A', activa: 2,
  versiuni: [
    { nr: 1, data: '2026-01-01', linii: [
      { comp: 'ING-A', tipComp: 'INGREDIENT', cant: 100, um: 'g', canal: 'AMBELE' },
      { comp: 'ING-B', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'AMBELE' },
    ] },
    { nr: 2, data: '2026-07-01', linii: [
      { comp: 'ING-A', tipComp: 'INGREDIENT', cant: 120, um: 'g', canal: 'AMBELE' },
      { comp: 'ING-B', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'AMBELE' },
    ] },
  ],
};
const produsPA: Produs = { cod: 'PA', denumire: 'Produs A', categorie: 'Test', tip: 'SIMPLU', pretInstore: 25, tva: 9, activ: true };
const vz = (data: string, locatie: string, canal: 'INSTORE' | 'DELIVERY', cant: number, net: number): VanzareFapt =>
  ({ data, locatie, canal, produs: 'PA', cant, brut: net * 1.09, net });
const VANZARI: VanzareFapt[] = [
  vz('2025-07-10', 'L01', 'INSTORE', 80, 1600),
  vz('2026-06-10', 'L01', 'INSTORE', 100, 2000), vz('2026-06-12', 'L02', 'INSTORE', 50, 1000),
  vz('2026-07-08', 'L01', 'INSTORE', 120, 2400), vz('2026-07-15', 'L01', 'DELIVERY', 20, 400),
  vz('2026-07-12', 'L02', 'INSTORE', 60, 1200),
];
const golut = genereazaSeed();
const sFix: AppState = {
  ...golut,
  ingrediente: [ingA, ingB], retete: [retetaPA], produse: [produsPA], vanzari: VANZARI,
};
const ctxFix = buildCtx(sFix);
const aFix = analizaIngrediente(sFix, ctxFix, cer());
const rA = aFix.randuri.find(r => r.ingredient === 'ING-A')!;
const rB = aFix.randuri.find(r => r.ingredient === 'ING-B')!;

console.log('— Creșterea de preț: cifrele de mână, exact —');
t('analiza e disponibilă și completă', aFix.disponibil && aFix.complete, aFix.motiveIncomplet.join(' | '));
t('prețul curent și precedent sunt cele datate', rA.pretCurent === 12 && rA.pretPrecedent === 10);
t('Δpreț = +2 lei (+20%)', rA.deltaPretLei === 2 && aprox(rA.deltaPretPct!, 20));
t('consumul: 15 kg → 24 kg (versiunile în vigoare atunci)', aprox(rA.consumPrecedent, 15) && aprox(rA.consumCurent, 24));
t('Δconsum = +60%', aprox(rA.deltaConsumPct!, 60));
t('costul: 150 → 288 lei', aprox(rA.costPrecedent!, 150) && aprox(rA.costCurent!, 288));
t('Δcost = 138 lei', aprox(rA.deltaCostLei!, 138));

console.log('\n— Descompunerea exactă: preț / consum / rețetă / mix / interacțiuni —');
const eA = rA.efecte!;
t('efect preț = Δpreț × consum precedent = 30', aprox(eA.pret, 30));
t('efect consum = Δconsum × preț precedent = 90', aprox(eA.consum, 90));
t('interacțiune preț = Δpreț × Δconsum = 18', aprox(eA.interactiunePret, 18));
t('IDENTITATE: Δcost = preț + consum + interacțiune', aprox(eA.pret + eA.consum + eA.interactiunePret, rA.deltaCostLei!));
t('efect mix = preț × Δvolum × consum/porție precedent = 50', aprox(eA.pmix, 50));
t('efect rețetă = preț × volum precedent × Δconsum/porție = 30', aprox(eA.reteta, 30));
t('interacțiune consum = 10', aprox(eA.interactiuneConsum, 10));
t('IDENTITATE: consum = rețetă + mix + interacțiune', aprox(eA.reteta + eA.pmix + eA.interactiuneConsum, eA.consum));
t('mișcarea totală NU e pusă pe seama prețului singur', eA.pret < rA.deltaCostLei!);
t('B (preț neschimbat): efect preț 0, tot consumul e mix',
  rB.efecte!.pret === 0 && aprox(rB.efecte!.pmix, rB.efecte!.consum) && rB.efecte!.reteta === 0);

console.log('\n— Contribuția la FC în puncte procentuale —');
t('contribuție precedentă = 150/3000 = 5pp', aprox(rA.contributiePpPrecedent!, 5));
t('contribuție curentă = 288/4000 = 7,2pp', aprox(rA.contributiePpCurent!, 7.2));
t('fcImpactPp = +2,2pp', aprox(rA.fcImpactPp!, 2.2));

console.log('\n— Impactul pe produse —');
t('produsul PA e identificat cu consumul pe porție curent', rA.produse[0].produs === 'PA' && aprox(rA.produse[0].cantPerPortie, 0.12));
t('volumul și mixul produsului', rA.produse[0].buc === 200 && aprox(rA.produse[0].pmixPct!, 100));
t('costul și share-ul în ingredient', aprox(rA.produse[0].costLei!, 288) && aprox(rA.produse[0].sharePct!, 100));
t('impactul FC al produsului', aprox(rA.produse[0].fcImpactPp!, 7.2));

console.log('\n— Impactul pe restaurante și concentrarea —');
const mL01 = rA.magazine.find(m => m.locatie === 'L01')!;
const mL02 = rA.magazine.find(m => m.locatie === 'L02')!;
t('Δcost L01 = 140×0,12×12 − 100×0,1×10 = 101,6', aprox(mL01.deltaCostLei!, 101.6));
t('Δcost L02 = 36,4', aprox(mL02.deltaCostLei!, 36.4));
t('Σ restaurante = Δcost companie', aprox(mL01.deltaCostLei! + mL02.deltaCostLei!, rA.deltaCostLei!));
t('restaurantul cu cel mai mare impact e primul', rA.magazine[0].locatie === 'L01');
t('share-ul de concentrare: L01 ≈ 73,6%', aprox(mL01.shareDinDeltaPct!, (101.6 / 138) * 100, 0.1));
t('deviația de consum pe restaurant', aprox(mL01.deltaConsumPct!, ((16.8 - 10) / 10) * 100, 0.1));
t('deviația de preț e a rețelei (aceeași)', mL01.deltaPretPct === mL02.deltaPretPct);
t('anomalie: impact concentrat în L01 (73,6% ≥ 70%)',
  aFix.anomalii.some(a => a.tip === 'CONCENTRARE_MAGAZIN' && a.ingredient === 'ING-A'));

console.log('\n— Canale și perioade atinse —');
t('canalele vin din vânzările care consumă ingredientul', rA.canale.join(',') === 'DELIVERY,INSTORE');
t('perioadele atinse: iunie și iulie', rA.perioade.join(',') === '2026-06,2026-07');

console.log('\n— Anomalii cu praguri declarate —');
const anom = (tip: string) => aFix.anomalii.find(a => a.tip === tip && a.ingredient === 'ING-A');
t('creșterea de preț 20% ≥ prag 10%', !!anom('PRET_CRESTERE_MARE') && anom('PRET_CRESTERE_MARE')!.prag === 10);
t('anomalia poartă valoarea măsurată', aprox(anom('PRET_CRESTERE_MARE')!.valoareMasurata!, 20));
t('creșterea de consum 60% ≥ prag 15%', !!anom('CONSUM_CRESTERE_MARE'));
t('impactul FC 2,2pp ≥ prag 0,3pp', !!anom('FC_IMPACT_MARE'));
t('sub pragul de lei, fără anomalie de cost (138 < 500)', !anom('COST_IMPACT_MARE'));
t('pragurile sunt configurabile: cu prag 100 lei, anomalia de cost apare',
  analizaIngrediente(sFix, ctxFix, cer(), { ...PRAGURI_IMPLICITE, costImpactMareLei: 100 })
    .anomalii.some(a => a.tip === 'COST_IMPACT_MARE' && a.ingredient === 'ING-A'));

console.log('\n— Oportunități: nimic inventat, totul cu baza de calcul —');
const cuNegociere = analizaIngrediente(sFix, ctxFix, cer(), { ...PRAGURI_IMPLICITE, negociereMinLei: 100 });
const oNeg = cuNegociere.oportunitati.find(o => o.tip === 'NEGOCIERE_PRET' && o.ingredient === 'ING-A')!;
t('renegocierea apare peste prag', !!oNeg);
t('economia = Δpreț × consum curent = 48 lei', aprox(oNeg.impactEstimatLei, 48));
t('impactul FC al oportunității', aprox(oNeg.fcImpactPp!, (48 / 4000) * 100));
t('dovada scrie formula cu cifre', oNeg.dovada.calcul.includes('12') && oNeg.dovada.calcul.includes('10') && oNeg.dovada.calcul.includes('48'));
t('scopul numește nivel, canale, produse, magazine',
  oNeg.scop.nivel === 'COMPANIE' && oNeg.scop.produse.includes('PA') && oNeg.scop.magazine.length === 2);
t('încrederea e deterministă cu motive', oNeg.confidence.scor === 100 && oNeg.confidence.motive.length > 0);
const simNeg = simuleazaFC(sFix, ctxFix, { perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' }, oNeg.scenariu!);
t('scenariul what-if legat chiar rulează și confirmă economia',
  simNeg.disponibil && aprox(simNeg.deltaCostRON, -48), `${simNeg.deltaCostRON.toFixed(1)}`);
const cuControl = analizaIngrediente(sFix, ctxFix, cer(), { ...PRAGURI_IMPLICITE, concentrareMinLei: 20 });
const oCtrl = cuControl.oportunitati.find(o => o.tip === 'CONTROL_CONSUM' && o.ingredient === 'ING-A')!;
t('controlul consumului = exact efectul de rețetă măsurat (30 lei), nu o estimare',
  !!oCtrl && aprox(oCtrl.impactEstimatLei, 30));
t('produsele vinovate sunt numite', oCtrl.scop.produse.includes('PA'));
t('riscul de concentrare apare pe ingredientul dominant',
  aFix.oportunitati.some(o => o.tip === 'RISC_CONCENTRARE'));
t('oportunitățile sunt ordonate descrescător după impact',
  aFix.oportunitati.every((o, i, arr) => i === 0 || Math.abs(arr[i - 1].impactEstimatLei) >= Math.abs(o.impactEstimatLei)));

console.log('\n— Scăderea de preț —');
const sIeftin: AppState = {
  ...sFix,
  ingrediente: [{ ...ingA, preturi: [{ validDeLa: '2026-01-01', pret: 10 }, { validDeLa: '2026-07-01', pret: 8 }] }, ingB],
};
const aIeftin = analizaIngrediente(sIeftin, buildCtx(sIeftin), cer());
const rIeftin = aIeftin.randuri.find(r => r.ingredient === 'ING-A')!;
t('Δpreț negativ, efect de preț negativ', rIeftin.deltaPretLei === -2 && aprox(rIeftin.efecte!.pret, -30));
t('fără anomalie de creștere de preț', !aIeftin.anomalii.some(a => a.tip === 'PRET_CRESTERE_MARE'));
t('identitatea ține și la scădere',
  aprox(rIeftin.efecte!.pret + rIeftin.efecte!.consum + rIeftin.efecte!.interactiunePret, rIeftin.deltaCostLei!));

console.log('\n— Scăderea de consum —');
const sMaiPutin: AppState = { ...sFix, vanzari: VANZARI.map(v => (v.data.startsWith('2026-07') ? { ...v, cant: v.cant / 2, net: v.net / 2, brut: v.brut / 2 } : v)) };
const aMaiPutin = analizaIngrediente(sMaiPutin, buildCtx(sMaiPutin), cer());
const rMaiPutin = aMaiPutin.randuri.find(r => r.ingredient === 'ING-A')!;
t('consumul scade, efectul de mix e negativ', rMaiPutin.deltaConsumPct! < 0 && rMaiPutin.efecte!.pmix < 0);
t('fără anomalie de creștere de consum', !aMaiPutin.anomalii.some(a => a.tip === 'CONSUM_CRESTERE_MARE' && a.ingredient === 'ING-A'));

console.log('\n— Versiunea în vigoare la MIJLOCUL perioadei se respectă —');
const sMijloc: AppState = {
  ...sFix,
  retete: [{ ...retetaPA, versiuni: [retetaPA.versiuni[0], { ...retetaPA.versiuni[1], data: '2026-07-10' }] }],
};
const aMijloc = analizaIngrediente(sMijloc, buildCtx(sMijloc), cer());
// vânzarea din 8 iulie folosește v1 (0,1), cele din 12 și 15 iulie folosesc v2 (0,12)
t('consumul lunii amestecă versiunile după data vânzării: 120×0,1 + 80×0,12 = 21,6 kg',
  aprox(aMijloc.randuri.find(r => r.ingredient === 'ING-A')!.consumCurent, 120 * 0.1 + 80 * 0.12));

console.log('\n— Comparația cu anul precedent —');
const aAn = analizaIngrediente(sFix, ctxFix, cer('LUNA_AN_PRECEDENT'));
const rAn = aAn.randuri.find(r => r.ingredient === 'ING-A')!;
t('disponibilă unde istoricul există', aAn.disponibil && aAn.perioadaPrecedenta!.cheie === '2025-07');
t('consumul de anul trecut e pe rețeta DE ATUNCI: 80 × 0,1 = 8 kg', aprox(rAn.consumPrecedent, 8));
t('prețul de anul trecut e retro-umplut și DECLARAT ca atare',
  rAn.pretPrecedentEstimat && aAn.calitate.istoricInsuficient.includes('ING-A'));
t('analiza se declară incompletă din cauza istoricului', !aAn.complete && aAn.motiveIncomplet.some(m => m.includes('retro-umplut')));
t('fără istoric deloc, comparația refuză cinstit',
  !analizaIngrediente(genereazaSeed(), buildCtx(genereazaSeed()), cer('LUNA_AN_PRECEDENT')).disponibil);

console.log('\n— Săptămână vs săptămâna precedentă —');
const saptamani = perioadeDinLuna('2026-07', 'SAPTAMANA').filter(s => !s.partiala);
const s29 = saptamani.find(s => s.de === '2026-07-13')!;   // conține vânzările din 15 iulie
const aSapt = analizaIngrediente(sFix, ctxFix, { perioada: s29, nivel: COMPANIE, canal: 'TOTAL', comparatie: 'SAPTAMANA_PRECEDENTA' });
t('comparația săptămânală funcționează', aSapt.disponibil, aSapt.motivIndisponibil);
t('săptămâna curentă are doar vânzarea din 15 iulie: 20 × 0,12 = 2,4 kg',
  aprox(aSapt.randuri.find(r => r.ingredient === 'ING-A')!.consumCurent, 2.4));
t('identitățile țin și pe săptămâni', (() => {
  const r = aSapt.randuri.find(x => x.ingredient === 'ING-A')!;
  const e = r.efecte!;
  return aprox(e.pret + e.consum + e.interactiunePret, r.deltaCostLei!) && aprox(e.reteta + e.pmix + e.interactiuneConsum, e.consum);
})());

console.log('\n— Granularități incompatibile: refuz cu motiv —');
t('lună cu comparație săptămânală', !analizaIngrediente(sFix, ctxFix, cer('SAPTAMANA_PRECEDENTA')).disponibil);
t('săptămână cu comparație lunară',
  !analizaIngrediente(sFix, ctxFix, { perioada: s29, nivel: COMPANIE, canal: 'TOTAL', comparatie: 'LUNA_PRECEDENTA' }).disponibil);
const taiata = perioadeDinLuna('2026-07', 'SAPTAMANA').find(s => s.partiala)!;
t('săptămâna tăiată la marginea lunii refuză comparația',
  !analizaIngrediente(sFix, ctxFix, { perioada: taiata, nivel: COMPANIE, canal: 'TOTAL', comparatie: 'SAPTAMANA_PRECEDENTA' }).disponibil);
t('refuzul explică motivul',
  analizaIngrediente(sFix, ctxFix, cer('SAPTAMANA_PRECEDENTA')).motivIndisponibil!.includes('săptămână'));

console.log('\n— Restaurant vs companie: aceeași formulă —');
const aL01 = analizaIngrediente(sFix, ctxFix, cer('LUNA_PRECEDENTA', restaurant('L01')));
const rL01 = aL01.randuri.find(r => r.ingredient === 'ING-A')!;
t('restaurantul își vede doar consumul lui: 140×0,12 = 16,8', aprox(rL01.consumCurent, 16.8));
t('rândul restaurantului = rândul lui din analiza companiei',
  aprox(rL01.deltaCostLei!, mL01.deltaCostLei!) && aprox(rL01.consumPrecedent, mL01.consumPrecedent));
t('canalul îngustează scopul: doar INSTORE',
  aprox(analizaIngrediente(sFix, ctxFix, cer('LUNA_PRECEDENTA', COMPANIE, 'INSTORE')).randuri.find(r => r.ingredient === 'ING-A')!.consumCurent, 180 * 0.12));

console.log('\n— Datele lipsă rămân necunoscute, nu zero —');
const sFaraPret: AppState = { ...sFix, ingrediente: [{ ...ingA, preturi: [] }, ingB] };
const aFaraPret = analizaIngrediente(sFaraPret, buildCtx(sFaraPret), cer());
const rFaraPret = aFaraPret.randuri.find(r => r.ingredient === 'ING-A')!;
t('fără preț: prețul, costul și efectele sunt null, consumul rămâne real',
  rFaraPret.pretCurent === null && rFaraPret.costCurent === null && rFaraPret.efecte === null && aprox(rFaraPret.consumCurent, 24));
t('anomalia de preț lipsă apare', aFaraPret.anomalii.some(a => a.tip === 'PRET_LIPSA' && a.ingredient === 'ING-A'));
t('calitatea îl listează și analiza e incompletă',
  aFaraPret.calitate.pretLipsa.includes('ING-A') && !aFaraPret.complete);

const sCompLipsa: AppState = { ...sFix, ingrediente: [ingA, ingB],
  retete: [{ ...retetaPA, versiuni: retetaPA.versiuni.map(v => ({ ...v, linii: [...v.linii, { comp: 'ING-X', tipComp: 'INGREDIENT' as const, cant: 5, um: 'g' as const, canal: 'AMBELE' as const }] })) }] };
const aCompLipsa = analizaIngrediente(sCompLipsa, buildCtx(sCompLipsa), cer());
t('componenta absentă din nomenclator e numită, nu costată zero pe tăcute',
  aCompLipsa.calitate.ingredientLipsa.includes('ING-X') && !aCompLipsa.complete
  && aCompLipsa.motiveIncomplet.some(m => m.includes('ING-X')));

const ingNefolosit: Ingredient = { cod: 'ING-N', denumire: 'Nefolosit', categorie: 'Diverse', tip: 'FOOD', um: 'kg', preturi: [{ validDeLa: '2026-01-01', pret: 5 }], activ: true };
const aNefolosit = analizaIngrediente({ ...sFix, ingrediente: [ingA, ingB, ingNefolosit] }, buildCtx({ ...sFix, ingrediente: [ingA, ingB, ingNefolosit] }), cer());
t('ingredientul din nicio rețetă → mapare lipsă + anomalie',
  aNefolosit.calitate.mapareLipsa.includes('ING-N') && aNefolosit.anomalii.some(a => a.tip === 'MAPARE_LIPSA' && a.ingredient === 'ING-N'));

t('fără PMIX pe perioada curentă → refuz',
  !analizaIngrediente(sFix, ctxFix, { perioada: perioadaDin('2026-09-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL', comparatie: 'LUNA_PRECEDENTA' }).disponibil);
const aFaraPrec = analizaIngrediente({ ...sFix, vanzari: VANZARI.filter(v => !v.data.startsWith('2026-06')) }, ctxFix, cer());
t('fără PMIX pe perioada de comparație → refuz, cu calitatea marcată',
  !aFaraPrec.disponibil && aFaraPrec.calitate.perioadaLipsa);

const ingInstabil: Ingredient = {
  cod: 'ING-V', denumire: 'Preț instabil', categorie: 'Diverse', tip: 'FOOD', um: 'kg',
  preturi: [{ validDeLa: '2026-01-01', pret: 10 }, { validDeLa: '2026-03-01', pret: 15 }, { validDeLa: '2026-05-01', pret: 9 }], activ: true,
};
const aInstabil = analizaIngrediente({ ...sFix, ingrediente: [ingA, ingB, ingInstabil] }, buildCtx({ ...sFix, ingrediente: [ingA, ingB, ingInstabil] }), cer());
const anInstabil = aInstabil.anomalii.find(a => a.tip === 'PRET_INSTABIL')!;
t('istoricul instabil e detectat cu coeficientul de variație',
  !!anInstabil && anInstabil.valoareMasurata! >= PRAGURI_IMPLICITE.volatilitatePretPct);
t('sub minimul de istoric, volatilitatea nu se pronunță (2 prețuri < 3)',
  !aFix.anomalii.some(a => a.tip === 'PRET_INSTABIL' && a.ingredient === 'ING-A'));

console.log('\n— Proveniența și determinismul —');
t('sursele numesc PMIX, rețetarul (versiuni datate) și nomenclatorul (prețuri datate)',
  ['PMIX', 'RETETAR', 'NOMENCLATOR'].every(x => aFix.surse.some(s => s.raport === x))
  && aFix.surse.find(s => s.raport === 'RETETAR')!.nota!.includes('în vigoare'));
t('anomaliile poartă valoare + prag', aFix.anomalii.filter(a => a.prag !== null).every(a => a.valoareMasurata !== null));
t('rezultatul e determinist', JSON.stringify(aFix) === JSON.stringify(analizaIngrediente(sFix, ctxFix, cer())));
t('rezumatul descrie analiza', descrieAnaliza(aFix).includes('ingrediente'));

// ————————————————————————————————————————————————————————— seed-ul întreg, ca regresie largă

console.log('\n— Pe seed: identitățile țin pe toate rândurile —');
const s0 = genereazaSeed();
const ctx0 = buildCtx(s0);
const aSeed = analizaIngrediente(s0, ctx0, cer());
t('disponibilă pe seed (iunie vs iulie)', aSeed.disponibil && aSeed.randuri.length > 10, `${aSeed.randuri.length} ingrediente`);
t('identitatea Δcost pe TOATE rândurile cu preț',
  aSeed.randuri.filter(r => r.efecte).every(r =>
    aprox(r.efecte!.pret + r.efecte!.consum + r.efecte!.interactiunePret, r.deltaCostLei!)));
t('identitatea consumului pe TOATE rândurile',
  aSeed.randuri.filter(r => r.efecte).every(r =>
    aprox(r.efecte!.reteta + r.efecte!.pmix + r.efecte!.interactiuneConsum, r.efecte!.consum)));
t('consumul curent = consumuriLuna pe iulie (versiunile aliniate în seed)',
  aSeed.randuri.every(r => {
    const c = consumuriLuna(s0, ctx0, '2026-07', undefined).get(r.ingredient);
    return !c || aprox(c.cant, r.consumCurent);
  }));
const aSeedL1 = analizaIngrediente(s0, ctx0, cer('LUNA_PRECEDENTA', restaurant('L01')));
const aSeedL2 = analizaIngrediente(s0, ctx0, cer('LUNA_PRECEDENTA', restaurant('L02')));
t('compania = Σ restaurante pe fiecare ingredient',
  aSeed.randuri.every(r => {
    const q1 = aSeedL1.randuri.find(x => x.ingredient === r.ingredient)?.consumCurent ?? 0;
    const q2 = aSeedL2.randuri.find(x => x.ingredient === r.ingredient)?.consumCurent ?? 0;
    return aprox(q1 + q2, r.consumCurent);
  }));
t('rândurile sunt ordonate descrescător după |Δcost|',
  aSeed.randuri.every((r, i, arr) => i === 0
    || (arr[i - 1].deltaCostLei === null ? r.deltaCostLei === null
      : r.deltaCostLei === null || Math.abs(arr[i - 1].deltaCostLei!) >= Math.abs(r.deltaCostLei))));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
