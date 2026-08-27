// Simulatorul FC — what-if pur pe prețuri, rețete și PMIX.
//
// Identități verificate:
//   Δcost(preț)   = Δpreț × consum                      (identitatea punții de preț)
//   Δcost(gramaj) = Δcant × cost unitar × porții        (cu pierderea și combo-urile incluse)
//   baseline + efect_preț + efect_rețetă + efect_mix + interacțiune = combinat   (în lei)
//   interacțiune  = 0 pe scenarii cu o singură dimensiune
//   Δ(companie)   = Δ(L01) + Δ(L02);  Δ(Total) = Δ(InStore) + Δ(Delivery)
//   datele reale rămân NEATINSE, iar două rulări identice dau exact același rezultat
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, pretCurent, versiuneActiva } from '../src/lib/engine';
import { COMPANIE, perioadaDin, restaurant, type CerereFC, type FCChannel, type FCLevel } from '../src/lib/fc-domeniu';
import { simuleazaFC, descrieSimulare, type ScenariuFC, type SimulareFC } from '../src/lib/fc-simulare';
import type { AppState, Ingredient, Produs, VanzareFapt } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const s0 = genereazaSeed();
const ctx0 = buildCtx(s0);
const LUNA = perioadaDin('2026-07-15', 'LUNA');
const cer = (canal: FCChannel = 'TOTAL', nivel: FCLevel = COMPANIE): CerereFC => ({ perioada: LUNA, nivel, canal });
const ef = (sim: SimulareFC, id: string) => sim.efecte.find(e => e.id === id)!;
const PRET_I001 = pretCurent(s0.ingrediente.find(i => i.cod === 'I001')!);

// ————————————————————————————————————————————————————————— siguranța istoricului

console.log('— Datele reale sunt intangibile —');
const amprenta = () => JSON.stringify({
  vanzari: s0.vanzari, ingrediente: s0.ingrediente, retete: s0.retete, produse: s0.produse,
});
const inainte = amprenta();
const COMBINAT: ScenariuFC = {
  preturi: [{ ingredient: 'I001', pretNou: PRET_I001 + 2 }],
  retete: [{ tip: 'CANTITATE', produs: 'P001', component: 'SP-021', cantNoua: 132 }],
  pmix: [{ produs: 'P001', factor: 1.2 }],
};
const simC = simuleazaFC(s0, ctx0, cer(), COMBINAT);
t('starea (PMIX, rețete, prețuri, produse) rămâne neatinsă după simulare', amprenta() === inainte);
t('prețul real al I001 nu s-a schimbat', pretCurent(ctx0.ingrediente.get('I001')!) === PRET_I001);
t('rețeta reală a P001 nu s-a schimbat',
  versiuneActiva(ctx0.retete.get('P001')!).linii.find(l => l.comp === 'SP-021')!.cant === 120);
const cantP001Inainte = s0.vanzari.filter(v => v.produs === 'P001').map(v => v.cant);
t('rândurile de mix sunt copii: cantitățile originale P001 rămân exact cele dinainte',
  JSON.stringify(s0.vanzari.filter(v => v.produs === 'P001').map(v => v.cant)) === JSON.stringify(cantP001Inainte)
  && simC.scenarioNetRON !== simC.currentNetRON);

console.log('\n— Determinism: aceleași intrări → exact același rezultat —');
const simC2 = simuleazaFC(s0, ctx0, cer(), COMBINAT);
t('două rulări identice dau rezultate identice, câmp cu câmp', JSON.stringify(simC) === JSON.stringify(simC2));
t('a treia rulare, la fel', JSON.stringify(simuleazaFC(s0, ctx0, cer(), COMBINAT)) === JSON.stringify(simC));

// ————————————————————————————————————————————————————————— prețuri

console.log('\n— Creșterea de preț: Δcost = Δpreț × consum —');
const simP = simuleazaFC(s0, ctx0, cer(), { preturi: [{ ingredient: 'I001', pretNou: PRET_I001 + 2 }] });
const dp = simP.detaliiPret[0];
t('disponibil și complet pe date curate', simP.disponibil && simP.complete, simP.motiveIncomplet.join(' | '));
t('oldUnitCost = prețul curent', dp.oldUnitCost === PRET_I001);
t('newUnitCost și delta', dp.newUnitCost === PRET_I001 + 2 && dp.deltaUnitCost === 2);
t('consumul e pozitiv și în UM de bază', dp.consumedQuantity > 0 && dp.um === 'kg');
t('identitatea: costImpact = Δpreț × consum', aprox(dp.costImpactRON, dp.deltaUnitCost * dp.consumedQuantity));
t('identitatea: Σ detalii preț = efectul izolat de preț', aprox(dp.costImpactRON, ef(simP, 'PRET').costLei));
t('identitatea: efectul de preț = Δcost total (singura dimensiune)', aprox(ef(simP, 'PRET').costLei, simP.deltaCostRON));
t('interacțiunea e zero pe o singură dimensiune', aprox(ef(simP, 'INTERACTIUNE').costLei, 0, 1e-6));
t('FC-ul crește: deltaFCpp > 0', simP.deltaFCpp! > 0, `${simP.deltaFCpp?.toFixed(3)}pp`);
t('deltaFCPercent = Δcost / cost baseline', aprox(simP.deltaFCPercent!, (simP.deltaCostRON / simP.currentCostRON) * 100));
t('fcImpactPP pe numitorul acoperit', aprox(dp.fcImpactPP!, (dp.costImpactRON / simP.currentNetRON) * 100, 0.05));
t('prețul NU mișcă vânzările nete', simP.scenarioNetRON === simP.currentNetRON && ef(simP, 'PRET').netLei === 0);

console.log('\n— Scăderea de preț —');
const simPm = simuleazaFC(s0, ctx0, cer(), { preturi: [{ ingredient: 'I001', pretNou: PRET_I001 - 3 }] });
t('impactul e negativ', simPm.deltaCostRON < 0 && simPm.deltaFCpp! < 0);
t('aceeași identitate, cu semn', aprox(simPm.detaliiPret[0].costImpactRON, -3 * simPm.detaliiPret[0].consumedQuantity));
t('consumul e același indiferent de direcție', aprox(simPm.detaliiPret[0].consumedQuantity, dp.consumedQuantity));

// ————————————————————————————————————————————————————————— rețete

console.log('\n— Gramaj în plus: Δcost = Δcant × cost unitar × porții echivalente —');
const simR = simuleazaFC(s0, ctx0, cer(), { retete: [{ tip: 'CANTITATE', produs: 'P001', component: 'SP-021', cantNoua: 132 }] });
const dr = simR.detaliiReteta[0];
t('cantitățile vechi și noi sunt raportate', dr.oldQuantity === 120 && dr.newQuantity === 132 && dr.quantityDelta === 12);
t('porțiile echivalente includ combo-urile care conțin produsul',
  dr.portii > s0.vanzari.filter(v => v.produs === 'P001' && v.data.startsWith('2026-07')).reduce((s, v) => s + v.cant, 0),
  `${dr.portii} porții`);
t('porțiile echivalente = P001 + P008 (combo cu 1×P001)',
  dr.portii === s0.vanzari.filter(v => (v.produs === 'P001' || v.produs === 'P008') && v.data.startsWith('2026-07')).reduce((s, v) => s + v.cant, 0));
t('identitatea: costImpact = Δcant × unitCost × porții', aprox(dr.costImpactRON, dr.quantityDelta! * dr.unitCost! * dr.portii, 0.5));
t('identitatea: efectul de rețetă = Δcost total (singura dimensiune)', aprox(ef(simR, 'RETETA').costLei, simR.deltaCostRON));
t('interacțiunea e zero', aprox(ef(simR, 'INTERACTIUNE').costLei, 0, 1e-6));
t('rețeta NU mișcă vânzările nete', simR.scenarioNetRON === simR.currentNetRON);

console.log('\n— Gramaj în minus —');
const simRm = simuleazaFC(s0, ctx0, cer(), { retete: [{ tip: 'CANTITATE', produs: 'P001', component: 'SP-021', cantNoua: 108 }] });
t('impactul e negativ și simetric', aprox(simRm.deltaCostRON, -simR.deltaCostRON));

console.log('\n— Pierderea se respectă: linia cu pierdere 15% costă brut —');
// I011 în P001: 20g cu pierdere 15% → costul unei unități include 1/(1−0.15)
const simRp = simuleazaFC(s0, ctx0, cer(), { retete: [{ tip: 'CANTITATE', produs: 'P001', component: 'I011', cantNoua: 30 }] });
const drp = simRp.detaliiReteta[0];
const pretI011 = pretCurent(s0.ingrediente.find(i => i.cod === 'I011')!);
t('unitCost include pierderea: preț/g ÷ (1−15%)', aprox(drp.unitCost!, (pretI011 / 1000) / 0.85, 1e-6),
  `${drp.unitCost} vs ${(pretI011 / 1000) / 0.85}`);
t('identitatea ține și cu pierdere', aprox(drp.costImpactRON, drp.quantityDelta! * drp.unitCost! * drp.portii, 0.5));

console.log('\n— Eliminare, adăugare, înlocuire —');
const simE = simuleazaFC(s0, ctx0, cer(), { retete: [{ tip: 'ELIMINA', produs: 'P001', component: 'I009' }] });
t('eliminarea scade costul', simE.deltaCostRON < 0);
t('eliminarea raportează cantitatea → 0', simE.detaliiReteta[0].oldQuantity === 25 && simE.detaliiReteta[0].newQuantity === 0);
const simA = simuleazaFC(s0, ctx0, cer(), {
  retete: [{ tip: 'ADAUGA', produs: 'P001', linie: { comp: 'I012', tipComp: 'INGREDIENT', cant: 30, um: 'g', canal: 'AMBELE' } }],
});
t('adăugarea crește costul', simA.deltaCostRON > 0);
t('adăugarea raportează 0 → cantitate', simA.detaliiReteta[0].oldQuantity === 0 && simA.detaliiReteta[0].newQuantity === 30);
const simI = simuleazaFC(s0, ctx0, cer(), { retete: [{ tip: 'INLOCUIESTE', produs: 'P001', componentVechi: 'I009', componentNou: 'I010' }] });
t('înlocuirea își raportează componentele', simI.detaliiReteta[0].component === 'I009' && simI.disponibil);
t('înlocuirea nu schimbă cantitatea', simI.detaliiReteta[0].quantityDelta === 0);

console.log('\n— Schimbarea într-un semipreparat se propagă la toate produsele care îl consumă —');
const simSp = simuleazaFC(s0, ctx0, cer(), { retete: [{ tip: 'CANTITATE', produs: 'SP-021', component: 'I001', cantNoua: 11 }] });
t('mai multe produse afectate', simSp.affectedProducts.length >= 3, simSp.affectedProducts.join(','));
t('efectul vine din costare, nu din estimare', aprox(ef(simSp, 'RETETA').costLei, simSp.deltaCostRON));
t('porțiile numără produsele care chiar consumă semipreparatul', simSp.detaliiReteta[0].portii > 0);

// ————————————————————————————————————————————————————————— PMIX

console.log('\n— Mixul în plus: doar mixul mișcă și numitorul —');
const simM = simuleazaFC(s0, ctx0, cer(), { pmix: [{ produs: 'P001', factor: 1.2 }] });
const dm = simM.detaliiPmix[0];
t('bucățile și netul scalează cu factorul', aprox(dm.bucScenariu, dm.bucBaseline * 1.2) && aprox(dm.netScenariu, dm.netBaseline * 1.2));
t('costul scalează cu factorul', aprox(dm.costScenariu!, dm.costBaseline! * 1.2));
t('identitatea: costImpact = cost baseline × (factor − 1)', aprox(dm.costImpactRON!, dm.costBaseline! * 0.2));
t('efectul de mix = Δcost total (singura dimensiune)', aprox(ef(simM, 'MIX').costLei, simM.deltaCostRON));
t('mixul mișcă vânzările nete', ef(simM, 'MIX').netLei > 0 && simM.scenarioNetRON > simM.currentNetRON);
t('efectul pe FC% e DOAR al mixului — poate fi negativ când produsul e sub media FC',
  simM.deltaFCpp !== null, `${simM.deltaFCpp?.toFixed(3)}pp`);
t('interacțiunea e zero', aprox(ef(simM, 'INTERACTIUNE').costLei, 0, 1e-6));

console.log('\n— Mixul în minus —');
const simMm = simuleazaFC(s0, ctx0, cer(), { pmix: [{ produs: 'P001', factor: 0.8 }] });
t('volum mai mic → cost mai mic, net mai mic', simMm.deltaCostRON < 0 && simMm.scenarioNetRON < simMm.currentNetRON);
t('factor 0 = scos din mix, fără să șteargă nimic', simuleazaFC(s0, ctx0, cer(), { pmix: [{ produs: 'P001', factor: 0 }] }).disponibil);

// ————————————————————————————————————————————————————————— combinat

console.log('\n— Scenariul combinat: descompunere deterministă, nimic neexplicat —');
const [eP, eR, eM, eI] = simC.efecte;
t('cele patru efecte sunt prezente în ordine', simC.efecte.map(e => e.id).join(',') === 'PRET,RETETA,MIX,INTERACTIUNE');
t('IDENTITATEA: Σ efecte + interacțiune = Δcost combinat',
  aprox(eP.costLei + eR.costLei + eM.costLei + eI.costLei, simC.deltaCostRON),
  `${eP.costLei.toFixed(0)}+${eR.costLei.toFixed(0)}+${eM.costLei.toFixed(0)}+${eI.costLei.toFixed(0)} vs ${simC.deltaCostRON.toFixed(0)}`);
t('baseline + Δ = combinat', aprox(simC.currentCostRON + simC.deltaCostRON, simC.scenarioCostRON));
t('efectul de preț din combinat = efectul din scenariul izolat', aprox(eP.costLei, simP.deltaCostRON));
t('efectul de rețetă din combinat = efectul din scenariul izolat', aprox(eR.costLei, simR.deltaCostRON));
t('efectul de mix din combinat = efectul din scenariul izolat', aprox(eM.costLei, simM.deltaCostRON));
t('interacțiunea e nenulă și DECLARATĂ, nu topită în alte efecte', Math.abs(eI.costLei) > 0.001, `${eI.costLei.toFixed(2)} lei`);
t('interacțiunea își explică natura', eI.explicatie.includes('încrucișat') || eI.explicatie.includes('Identitate'));
t('fiecare efect are explicație', simC.efecte.every(e => e.explicatie.length > 0));

// ————————————————————————————————————————————————————————— restaurant / companie / canale

console.log('\n— Restaurant vs companie: efectele se adună —');
const scenariuP = { preturi: [{ ingredient: 'I001', pretNou: PRET_I001 + 2 }] };
const sL1 = simuleazaFC(s0, ctx0, cer('TOTAL', restaurant('L01')), scenariuP);
const sL2 = simuleazaFC(s0, ctx0, cer('TOTAL', restaurant('L02')), scenariuP);
const sCo = simuleazaFC(s0, ctx0, cer(), scenariuP);
t('Δcost companie = Δ L01 + Δ L02', aprox(sCo.deltaCostRON, sL1.deltaCostRON + sL2.deltaCostRON));
t('consumul companiei = Σ restaurante', aprox(sCo.detaliiPret[0].consumedQuantity,
  sL1.detaliiPret[0].consumedQuantity + sL2.detaliiPret[0].consumedQuantity));
t('restaurantul își vede doar magazinul lui', sL1.affectedStores.join(',') === 'L01' && sL2.affectedStores.join(',') === 'L02');
t('compania le vede pe amândouă', sCo.affectedStores.join(',') === 'L01,L02');

console.log('\n— Canale: InStore + Delivery = Total —');
const sIn = simuleazaFC(s0, ctx0, cer('INSTORE'), scenariuP);
const sDl = simuleazaFC(s0, ctx0, cer('DELIVERY'), scenariuP);
t('Δcost Total = Δ InStore + Δ Delivery', aprox(sCo.deltaCostRON, sIn.deltaCostRON + sDl.deltaCostRON));
t('scopul pe canal vede doar canalul lui',
  sIn.affectedChannels.join(',') === 'INSTORE' && sDl.affectedChannels.join(',') === 'DELIVERY');
t('pe Total, canalele afectate vin din vânzările atinse', sCo.affectedChannels.join(',') === 'DELIVERY,INSTORE');
t('perioadele afectate sunt lunile cu vânzări atinse', sCo.affectedPeriods.join(',') === '2026-07');

console.log('\n— Dovada pe canal: ambalajul folosit doar pe Delivery nu atinge InStore —');
const pretA002 = pretCurent(s0.ingrediente.find(i => i.cod === 'A002')!);
const sAmb = simuleazaFC(s0, ctx0, cer(), { preturi: [{ ingredient: 'A002', pretNou: pretA002 * 2 }] });
t('canalele afectate: doar Delivery', sAmb.affectedChannels.join(',') === 'DELIVERY', sAmb.affectedChannels.join(','));
t('scumpirea cutiei de delivery nu mișcă nimic pe InStore',
  simuleazaFC(s0, ctx0, cer('INSTORE'), { preturi: [{ ingredient: 'A002', pretNou: pretA002 * 2 }] }).deltaCostRON === 0);

console.log('\n— Canal UNKNOWN: fără dovadă, nu se inventează —');
const ingNefolosit: Ingredient = {
  cod: 'I097', denumire: 'Ingredient nefolosit', categorie: 'Diverse', tip: 'FOOD', um: 'kg',
  preturi: [{ validDeLa: '2026-01-01', pret: 10 }], activ: true,
};
const sNefolosit: AppState = { ...s0, ingrediente: [...s0.ingrediente, ingNefolosit] };
const simU = simuleazaFC(sNefolosit, buildCtx(sNefolosit), cer(), { preturi: [{ ingredient: 'I097', pretNou: 12 }] });
t('ingredient în nicio rețetă → canal UNKNOWN', simU.affectedChannels.join(',') === 'UNKNOWN');
t('impactul e nul pe dovezile existente', simU.deltaCostRON === 0);
t('scenariul se declară incomplet, cu motiv', !simU.complete && simU.motiveIncomplet.some(m => m.includes('canal')));

// ————————————————————————————————————————————————————————— calitatea datelor

console.log('\n— Preț lipsă: nu se presupune zero —');
const ingFaraPret: Ingredient = {
  cod: 'I096', denumire: 'Fără preț', categorie: 'Diverse', tip: 'FOOD', um: 'kg', preturi: [], activ: true,
};
const sFaraPret: AppState = { ...s0, ingrediente: [...s0.ingrediente, ingFaraPret] };
const simFp = simuleazaFC(sFaraPret, buildCtx(sFaraPret), cer(), { preturi: [{ ingredient: 'I096', pretNou: 15 }] });
t('schimbarea de preț pe un ingredient fără preț se REFUZĂ, nu se presupune zero',
  !simFp.disponibil && simFp.motivIndisponibil!.includes('preț valid'));

// componentă fără preț într-o rețetă afectată: semnalată, nu ascunsă
const sCompFp: AppState = {
  ...s0,
  ingrediente: [...s0.ingrediente, ingFaraPret],
  retete: s0.retete.map(r => (r.cod !== 'P001' ? r : {
    ...r,
    versiuni: r.versiuni.map(v => (v.nr !== r.activa ? v : {
      ...v, linii: [...v.linii.map(l => ({ ...l })), { comp: 'I096', tipComp: 'INGREDIENT' as const, cant: 10, um: 'g' as const, canal: 'AMBELE' as const }],
    })),
  })),
};
const simCompFp = simuleazaFC(sCompFp, buildCtx(sCompFp), cer(), scenariuP);
t('componenta fără preț din rețeta afectată e numită', simCompFp.ingredienteFaraPret.includes('I096'));
t('scenariul e incomplet, cu motiv despre subestimare',
  !simCompFp.complete && simCompFp.motiveIncomplet.some(m => m.includes('preț valid')));
t('încrederea scade sub 100', simCompFp.confidence.scor < 100, `${simCompFp.confidence.scor}`);

console.log('\n— Rețetă lipsă: nu se presupune zero —');
const produsFaraReteta: Produs = {
  cod: 'PX', denumire: 'Produs fără rețetă', categorie: 'Diverse', tip: 'SIMPLU',
  pretInstore: 20, tva: 9, activ: true,
};
const vanzarePX: VanzareFapt = { data: '2026-07-10', locatie: 'L01', canal: 'INSTORE', produs: 'PX', cant: 10, brut: 200, net: 183.49 };
const sFaraReteta: AppState = { ...s0, produse: [...s0.produse, produsFaraReteta], vanzari: [...s0.vanzari, vanzarePX] };
const ctxFaraReteta = buildCtx(sFaraReteta);
const simFr = simuleazaFC(sFaraReteta, ctxFaraReteta, cer(), scenariuP);
t('acoperirea scade sub 100 și e expusă', simFr.dataCoverage! < 100, `${simFr.dataCoverage?.toFixed(2)}%`);
t('scenariul e incomplet: produsele fără rețetă NU sunt presupuse zero',
  !simFr.complete && simFr.motiveIncomplet.some(m => m.includes('rețetă')));
const simMixFr = simuleazaFC(sFaraReteta, ctxFaraReteta, cer(), { pmix: [{ produs: 'PX', factor: 2 }] });
t('mixul pe un produs fără rețetă: costul e null, nu zero',
  simMixFr.detaliiPmix[0].costImpactRON === null && simMixFr.detaliiPmix[0].areReteta === false);
t('netul lui e totuși cunoscut (vine din vânzări)', aprox(simMixFr.detaliiPmix[0].netScenariu, vanzarePX.net * 2));
t('și motivul e enumerat', simMixFr.motiveIncomplet.some(m => m.includes('mix')));

console.log('\n— PMIX incomplet: acoperirea lunilor e măsurată —');
const DOUA_LUNI = { tip: 'LUNA' as const, cheie: '2026-07', de: '2026-07-01', la: '2026-08-31', zile: 62, partiala: false };
const simDoua = simuleazaFC(s0, ctx0, { perioada: DOUA_LUNI, nivel: COMPANIE, canal: 'TOTAL' }, scenariuP);
t('luna fără vânzări taie factorul de PMIX la 50',
  simDoua.confidence.factori.find(f => f.factor === 'pmix_prezent')!.scor === 50);
t('fără nicio vânzare în scop, simularea refuză cinstit',
  !simuleazaFC(s0, ctx0, { perioada: perioadaDin('2026-01-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' }, scenariuP).disponibil);

console.log('\n— Scenarii invalide: refuz cu motiv, nu ignorare tăcută —');
t('ingredient inexistent', !simuleazaFC(s0, ctx0, cer(), { preturi: [{ ingredient: 'NU-EXISTA', pretNou: 5 }] }).disponibil);
t('preț negativ', !simuleazaFC(s0, ctx0, cer(), { preturi: [{ ingredient: 'I001', pretNou: -1 }] }).disponibil);
t('produs fără rețetă la schimbare de rețetă',
  !simuleazaFC(sFaraReteta, ctxFaraReteta, cer(), { retete: [{ tip: 'CANTITATE', produs: 'PX', component: 'I001', cantNoua: 1 }] }).disponibil);
t('componentă care nu apare în rețetă',
  !simuleazaFC(s0, ctx0, cer(), { retete: [{ tip: 'CANTITATE', produs: 'P001', component: 'I001', cantNoua: 1 }] }).disponibil);
t('componentă adăugată inexistentă',
  !simuleazaFC(s0, ctx0, cer(), { retete: [{ tip: 'ADAUGA', produs: 'P001', linie: { comp: 'ZZZ', tipComp: 'INGREDIENT', cant: 1, um: 'g', canal: 'AMBELE' } }] }).disponibil);
t('factor de mix negativ', !simuleazaFC(s0, ctx0, cer(), { pmix: [{ produs: 'P001', factor: -0.5 }] }).disponibil);
t('produs inexistent la mix', !simuleazaFC(s0, ctx0, cer(), { pmix: [{ produs: 'NU-E', factor: 1.5 }] }).disponibil);
t('refuzul poartă motivul', simuleazaFC(s0, ctx0, cer(), { preturi: [{ ingredient: 'NU-EXISTA', pretNou: 5 }] }).motivIndisponibil!.includes('NU-EXISTA'));

// ————————————————————————————————————————————————————————— cine e atins + încrederea

console.log('\n— Cine e atins: dovezi, nu presupuneri —');
t('ingredientele atinse', simC.affectedIngredients.includes('I001'));
t('produsele atinse includ produsul cu rețeta schimbată și combo-ul care îl conține',
  simC.affectedProducts.includes('P001') && simC.affectedProducts.includes('P008'));
t('produsele atinse de preț sunt cele care consumă ingredientul', simP.affectedProducts.length >= 3, simP.affectedProducts.join(','));
t('magazinele și perioadele vin din vânzările atinse',
  simC.affectedStores.length === 2 && simC.affectedPeriods.join(',') === '2026-07');

console.log('\n— Încrederea: deterministă, cu formula expusă —');
t('pe date curate, 100', simC.confidence.scor === 100, `${simC.confidence.scor}`);
t('ponderile însumează 1', aprox(simC.confidence.factori.reduce((s, f) => s + f.pondere, 0), 1));
t('formula e declarată', simC.confidence.formula.includes('0.40'));
t('fiecare factor are detaliu', simC.confidence.factori.every(f => f.detaliu.length > 0));
t('sursele sunt enumerate: PMIX, rețetar, nomenclator',
  ['PMIX', 'RETETAR', 'NOMENCLATOR'].every(r => simC.surse.some(x => x.raport === r)));
t('rezumatul descrie simularea', descrieSimulare(simC).includes('Δcost'));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
