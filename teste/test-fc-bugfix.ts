// BUG-1 — simulările pe rețete raportau impact ZERO pe lunile din trecut.
//
// `aplicaScenariu` modifică versiunea ACTIVĂ a rețetei, dar costarea unei luni închise
// se face la o dată din trecut, unde `versiuneLa` rezolvă o versiune mai VECHE — deci
// modificarea nu era niciodată văzută. Cum `FC_BAZA` și `RETETAR_NBO` creează la fiecare
// import o versiune nouă datată azi, cazul este cel normal, nu unul marginal.
//
// Testele verifică identități independente de implementare:
//     Δcost/porție = Δgramaj_BRUT × preț_UM_bază,  unde brut = net / (1 − pierdere%)
//     Δcost lunar  = Δcost/porție × bucăți vândute în lună
import { genereazaSeed } from '../src/lib/seed';
import {
  AZI_ISO, aplicaInDate, aplicaScenariu, buildCtx, costProdus, impactRetea,
  versiuneActiva, versiuneLa, volumeLuna,
} from '../src/lib/engine';
import { simuleaza } from '../src/lib/simulare';
import type { AppState, LinieReteta } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

const LUNA = '2026-07';
const D = `${LUNA}-15`;          // data la care se costează luna simulată
const LINIE = 3;                 // P001 linia 3 = I011 (salată), 20 g, 6 lei/kg, canal AMBELE
const PRET_I011 = 6;             // lei/kg
const PIERDERE = 15;             // % — costul se plătește pe cantitatea brută (§3.2)

/**
 * Reproduce situația din producție: rețetarul a fost reîncărcat AZI, deci versiunea
 * activă este ulterioară lunii pe care o simulăm. `optiuni` permite ca versiunea nouă
 * să difere de cea veche, pentru testul de izolare a bazei.
 */
function cuRetetarReincarcatAzi(modificaV3?: (linii: LinieReteta[]) => void): AppState {
  const s = genereazaSeed();
  const r = s.retete.find(x => x.cod === 'P001')!;
  const linii = versiuneActiva(r).linii.map(l => ({ ...l }));
  modificaV3?.(linii);
  const nr = r.versiuni[r.versiuni.length - 1].nr + 1;
  r.versiuni = [...r.versiuni, { nr, data: AZI_ISO(), nota: 'Import bază FC (reîncărcare rețetar)', linii }];
  r.activa = nr;
  return s;
}

// ————————————————————————————————————————————————————————————— precondiția bug-ului

console.log('— Precondiția: versiunea activă este ulterioară lunii simulate —');
const s0 = cuRetetarReincarcatAzi();
const r0 = s0.retete.find(x => x.cod === 'P001')!;
t('rețetarul are o versiune nouă, datată azi', versiuneActiva(r0).data === AZI_ISO(), `v${r0.activa}@${AZI_ISO()}`);
t('la data lunii simulate se rezolvă o versiune MAI VECHE',
  versiuneLa(r0, D).nr !== r0.activa, `versiuneLa(${D})=v${versiuneLa(r0, D).nr} · activă=v${r0.activa}`);

const volume = volumeLuna(s0, LUNA);
const vol = volume.get('P001')!;
const BUC_DIRECT = vol.bucIn + vol.bucDlv;
// P001 se vinde și ca parte din meniul P008: modificarea rețetei lovește și combo-ul,
// deci baza de porții afectate este cea directă PLUS cea explodată din meniuri
const BUC_COMBO = s0.produse
  .filter(p => p.tip === 'COMBO')
  .reduce((s, p) => {
    const v = volume.get(p.cod);
    if (!v) return s;
    const cant = (p.combo ?? []).filter(c => c.cod === 'P001').reduce((a, c) => a + c.cant, 0);
    return s + (v.bucIn + v.bucDlv) * cant;
  }, 0);
const BUC = BUC_DIRECT + BUC_COMBO;
t('P001 are volum în luna simulată', BUC_DIRECT > 0, `${BUC_DIRECT} buc (${vol.bucIn} InStore + ${vol.bucDlv} Delivery)`);
t('P001 se vinde și prin meniu (combo)', BUC_COMBO > 0, `${BUC_COMBO} porții prin combo · ${BUC} total`);

// ————————————————————————————————————————————————————————————— 1. costul la o dată din trecut

console.log('\n— Modificarea de gramaj este vizibilă la costarea unei luni închise —');
const ctx0 = buildCtx(s0);
const cantVeche = versiuneActiva(r0).linii[LINIE].cant;   // 20 g
const cantNoua = 10;
const dGrame = cantNoua - cantVeche;                       // −10 g net
// costul se plătește pe brut: −10 g net la 15% pierdere = −11,7647 g brut = −0,070588 lei
const dCostPortieAsteptat = (dGrame / (1 - PIERDERE / 100) / 1000) * PRET_I011;

t('linia țintă este cea așteptată (I011, în grame, cu pierdere 15%)',
  versiuneActiva(r0).linii[LINIE].comp === 'I011' && versiuneActiva(r0).linii[LINIE].um === 'g'
  && versiuneActiva(r0).linii[LINIE].pierdere === PIERDERE,
  `${versiuneActiva(r0).linii[LINIE].comp} ${cantVeche}g · pierdere ${versiuneActiva(r0).linii[LINIE].pierdere}%`);

const sim = aplicaScenariu(s0, [{ tip: 'GRAMAJ', reteta: 'P001', linie: LINIE, cantNoua }], { peIstoric: true });

const bazaIn = costProdus('P001', 'INSTORE', sim.ctxBaza, D)!.total;
const dupaIn = costProdus('P001', 'INSTORE', sim.ctx, D)!.total;
t('costul InStore se schimbă la data din trecut (BUG-1)',
  !aprox(dupaIn, bazaIn, 1e-9), `${bazaIn.toFixed(4)} → ${dupaIn.toFixed(4)}`);
t('Δcost/porție InStore = Δgramaj × preț',
  aprox(dupaIn - bazaIn, dCostPortieAsteptat, 1e-6),
  `${(dupaIn - bazaIn).toFixed(6)} vs ${dCostPortieAsteptat.toFixed(6)}`);

const bazaDlv = costProdus('P001', 'DELIVERY', sim.ctxBaza, D)!.total;
const dupaDlv = costProdus('P001', 'DELIVERY', sim.ctx, D)!.total;
t('Δcost/porție Delivery = același Δ (linia e pe AMBELE canale)',
  aprox(dupaDlv - bazaDlv, dCostPortieAsteptat, 1e-6), `${(dupaDlv - bazaDlv).toFixed(6)}`);

t('modificarea se vede la ORICE dată din lună, nu doar la data de referință',
  aprox(costProdus('P001', 'INSTORE', sim.ctx, `${LUNA}-03`)!.total
      - costProdus('P001', 'INSTORE', sim.ctxBaza, `${LUNA}-03`)!.total, dCostPortieAsteptat, 1e-6));

// ————————————————————————————————————————————————————————————— 2. identitatea pe lună

console.log('\n— Δcost lunar = Δcost/porție × porții vândute (direct + prin meniu) —');
const rez = simuleaza(s0, ctx0, { schimbari: [{ tip: 'GRAMAJ', reteta: 'P001', linie: LINIE, cantNoua }], luna: LUNA });
const dCostLunar = rez.cost1 - rez.cost0;
const asteptatLunar = dCostPortieAsteptat * BUC;
t('simularea NU mai raportează impact zero', Math.abs(dCostLunar) > 1e-6, `Δcost = ${dCostLunar.toFixed(2)} lei`);
t('Δcost lunar = Δcost/porție × porții (inclusiv explozia meniului)',
  aprox(dCostLunar, asteptatLunar, 0.01), `${dCostLunar.toFixed(4)} vs ${asteptatLunar.toFixed(4)}`);
t('meniul care conține P001 este și el afectat', rez.afectate.some(x => x.cod === 'P008'));
t('vânzările nete nu se schimbă (doar rețeta s-a modificat)', aprox(rez.net1, rez.net0, 0.01));
t('Δprofit = −Δcost', aprox(rez.dProfitLunar, -dCostLunar, 0.01), `${rez.dProfitLunar.toFixed(2)}`);
t('produsul apare între cele afectate', rez.afectate.some(x => x.cod === 'P001'));
t('motivul afectării este COST', rez.afectate.find(x => x.cod === 'P001')?.motiv === 'COST',
  rez.afectate.find(x => x.cod === 'P001')?.motiv);

// ————————————————————————————————————————————————————————————— 3. izolarea bazei

console.log('\n— Baza este aliniată: Δ reflectă DOAR editarea, nu și saltul de versiune —');
// v3 diferă real de v2: I009 urcă de la 25 g la 40 g. Editarea simulată rămâne pe linia 3.
const sDif = cuRetetarReincarcatAzi(linii => { linii[2] = { ...linii[2], cant: 40 }; });
const rDif = sDif.retete.find(x => x.cod === 'P001')!;
t('v3 chiar diferă de versiunea în vigoare în luna simulată',
  versiuneActiva(rDif).linii[2].cant !== versiuneLa(rDif, D).linii[2].cant,
  `activă=${versiuneActiva(rDif).linii[2].cant}g · în vigoare atunci=${versiuneLa(rDif, D).linii[2].cant}g`);

const simDif = aplicaScenariu(sDif, [{ tip: 'GRAMAJ', reteta: 'P001', linie: LINIE, cantNoua }], { peIstoric: true });
const dIzolat = costProdus('P001', 'INSTORE', simDif.ctx, D)!.total
              - costProdus('P001', 'INSTORE', simDif.ctxBaza, D)!.total;
t('Δ = doar efectul editării, nu și diferența v2→v3',
  aprox(dIzolat, dCostPortieAsteptat, 1e-6), `${dIzolat.toFixed(6)} vs ${dCostPortieAsteptat.toFixed(6)}`);
t('baza folosește versiunea activă, nu cea veche',
  aprox(costProdus('P001', 'INSTORE', simDif.ctxBaza, D)!.total,
        costProdus('P001', 'INSTORE', buildCtx(sDif), '9999-12-31')!.total, 1e-6));

// ————————————————————————————————————————————————————————————— 4. impactul pe rețea

console.log('\n— impactRetea vede modificarea pe vânzările reale ale lunii —');
const ir = impactRetea(s0, sim.ctxBaza, sim.ctx, sim.produseNoi, sim.preturiVanzare, LUNA);
t('costul rețelei scade', ir.dupa.cost < ir.inainte.cost, `${ir.inainte.cost.toFixed(2)} → ${ir.dupa.cost.toFixed(2)}`);
t('Δcost rețea = Δcost/porție × porții (inclusiv explozia meniului)',
  aprox(ir.dupa.cost - ir.inainte.cost, asteptatLunar, 0.01),
  `${(ir.dupa.cost - ir.inainte.cost).toFixed(4)} vs ${asteptatLunar.toFixed(4)}`);
t('vânzările nete rămân egale', aprox(ir.dupa.net, ir.inainte.net, 0.01));
t('Food Cost-ul rețelei scade', (ir.dupa.fc ?? 0) < (ir.inainte.fc ?? 0),
  `${ir.inainte.fc?.toFixed(3)}% → ${ir.dupa.fc?.toFixed(3)}%`);

// ————————————————————————————————————————————————————————————— 5. fără regresii

console.log('\n— Comportamentul existent rămâne neschimbat —');
const implicit = aplicaScenariu(s0, [{ tip: 'GRAMAJ', reteta: 'P001', linie: LINIE, cantNoua }]);
t('fără opțiune, versiunea activă este cea modificată (indecșii din UI rămân valabili)',
  versiuneActiva(implicit.ctx.retete.get('P001')!).linii[LINIE].cant === cantNoua);
t('fără opțiune, istoricul de versiuni se păstrează intact',
  implicit.ctx.retete.get('P001')!.versiuni.length === r0.versiuni.length,
  `${implicit.ctx.retete.get('P001')!.versiuni.length} versiuni`);
t('fără opțiune, costarea „azi" era și rămâne corectă',
  aprox(costProdus('P001', 'INSTORE', implicit.ctx, '9999-12-31')!.total
      - costProdus('P001', 'INSTORE', ctx0, '9999-12-31')!.total, dCostPortieAsteptat, 1e-6));

t('cu opțiune, data viitoare folosește tot rețeta modificată',
  aprox(costProdus('P001', 'INSTORE', sim.ctx, '9999-12-31')!.total
      - costProdus('P001', 'INSTORE', sim.ctxBaza, '9999-12-31')!.total, dCostPortieAsteptat, 1e-6));

t('rețetele neatinse își păstrează istoricul de versiuni în contextul simulat',
  sim.ctx.retete.get('P002')!.versiuni.length === s0.retete.find(x => x.cod === 'P002')!.versiuni.length);

t('starea reală nu este atinsă de simulare',
  versiuneActiva(buildCtx(s0).retete.get('P001')!).linii[LINIE].cant === cantVeche
  && s0.retete.find(x => x.cod === 'P001')!.versiuni.length === r0.versiuni.length);

// aplicaInDate scrie o versiune nouă pornind de la cea activă — nu trebuie afectat de fix
const sAplicat = aplicaInDate(s0, { nume: 'Test', schimbari: [{ tip: 'GRAMAJ', reteta: 'P001', linie: LINIE, cantNoua }] });
const rAplicat = sAplicat.retete.find(x => x.cod === 'P001')!;
t('aplicaInDate adaugă o versiune nouă, nu suprascrie', rAplicat.versiuni.length === r0.versiuni.length + 1,
  `${r0.versiuni.length} → ${rAplicat.versiuni.length}`);
t('aplicaInDate păstrează gramajul modificat', versiuneActiva(rAplicat).linii[LINIE].cant === cantNoua);
t('aplicaInDate datează versiunea nouă azi', versiuneActiva(rAplicat).data === new Date().toISOString().slice(0, 10));
t('invarianta 1: versiunile vechi rămân neatinse',
  rAplicat.versiuni[0].linii[LINIE].cant === r0.versiuni[0].linii[LINIE].cant);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
