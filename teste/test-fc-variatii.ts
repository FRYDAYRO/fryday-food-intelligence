// Tabloul de variații — vederea de luni dimineață.
//
// Identități verificate:
//   ΔFC = efectCost + efectVanzari                       (rescrierea exactă a diferenței)
//   Δcost ingredient = pret + consum + interactiunePret  (termeni numiți, niciodată topiți)
//   consum = reteta + pmix + interactiuneConsum
//   ancora nu compară NICIODATĂ o perioadă neîncheiată cu una întreagă
//   suma pe ingrediente ≠ Δcostul din rețete când prețul se mișcă în interiorul perioadei —
//     iar diferența e CALCULATĂ și numită, nu ascunsă
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCtx } from '../src/lib/engine';
import { stareGoala } from '../src/lib/seed';
import { COMPANIE, perioadaDin, restaurant } from '../src/lib/fc-domeniu';
import {
  PRAGURI_VARIATII, ancoreaza, descompuneFC, descrieVariatii, tablouVariatii,
  type CerereVariatii,
} from '../src/lib/fc-variatii';
import { accesTower, sectiuneDupaId, type SelectieFC } from '../src/lib/fc-tower';
import { TowerProvider, type TowerCtx } from '../src/views/tower/context';
import Variatii from '../src/views/tower/Variatii';
import type { AppState, Ingredient, Produs, Reteta, VanzareFapt } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

// ————————————————————————————————————————————————————————— fixtura, cu cifre de mână
//
// Un singur produs, trei componente — ca fiecare leu să poată fi refăcut pe hârtie.
//
//   P1 = 0,1 kg I1 + 1 buc I2 + 1 buc A1 (ambalaj)
//   I1: 20 lei/kg până pe 2026-06-21, 25 lei/kg de pe 2026-06-22
//   I2: 1,00 lei/buc · A1: 0,50 lei/buc  (neschimbate)
//   ⇒ cost/porție 3,50 lei înainte de 22 iunie, 4,00 lei după
//
//   mai   (2026-05-20): 300 buc · 3000 lei net ⇒ cost 1050 · FC 35,000000%
//   S1    (2026-06-17): 200 buc · 2000 lei net ⇒ cost  700 · FC 35,000000%
//   S2    (2026-06-24): 150 buc · 1650 lei net ⇒ cost  600 · FC 36,363636%
//   iunie                350 buc · 3650 lei net ⇒ cost 1300 · FC 35,616438%

const ing = (cod: string, den: string, um: 'kg' | 'buc', tip: 'FOOD' | 'PACKAGING',
  preturi: { validDeLa: string; pret: number }[]): Ingredient =>
  ({ cod, denumire: den, categorie: tip === 'PACKAGING' ? 'Ambalaje' : 'Carne', tip, um, preturi, activ: true });

const RETETA_P1: Reteta = {
  cod: 'P1', tip: 'PRODUS', denumire: 'Burger', activa: 1,
  versiuni: [{
    nr: 1, data: '2026-01-01', linii: [
      { comp: 'I1', tipComp: 'INGREDIENT', cant: 0.1, um: 'kg', canal: 'AMBELE' },
      { comp: 'I2', tipComp: 'INGREDIENT', cant: 1, um: 'buc', canal: 'AMBELE' },
      { comp: 'A1', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'AMBELE' },
    ],
  }],
};

const P1: Produs = {
  cod: 'P1', denumire: 'Burger', categorie: 'Burgeri', tip: 'SIMPLU',
  pretInstore: 11.1, tva: 11, activ: true,
};

const v = (data: string, cant: number, net: number, locatie = 'L1'): VanzareFapt =>
  ({ data, locatie, canal: 'INSTORE', produs: 'P1', cant, brut: net * 1.11, net });

function fixtura(salt: string): AppState {
  return {
    ...stareGoala(),
    locatii: [{ cod: 'L1', nume: 'FRYDAY TEST' }],
    produse: [P1],
    retete: [RETETA_P1],
    ingrediente: [
      ing('I1', 'Piept de pui', 'kg', 'FOOD', [{ validDeLa: '2026-01-01', pret: 20 }, { validDeLa: salt, pret: 25 }]),
      ing('I2', 'Chiflă', 'buc', 'FOOD', [{ validDeLa: '2026-01-01', pret: 1 }]),
      ing('A1', 'Cutie burger', 'buc', 'PACKAGING', [{ validDeLa: '2026-01-01', pret: 0.5 }]),
    ],
    vanzari: [v('2026-05-20', 300, 3000), v('2026-06-17', 200, 2000), v('2026-06-24', 150, 1650)],
  };
}

// saltul de preț cade EXACT pe granița dintre săptămâni: costarea datată și evaluarea la
// finele perioadei dau atunci aceeași cifră — cazul în care reconcilierea trebuie să fie zero
const s0 = fixtura('2026-06-22');
const ctx0 = buildCtx(s0);
const AZI = '2026-07-05';
const cer = (extra: Partial<CerereVariatii> = {}): CerereVariatii =>
  ({ ancora: AZI, nivel: COMPANIE, canal: 'TOTAL', ...extra });

const tab = tablouVariatii(s0, ctx0, cer(), PRAGURI_VARIATII, undefined, AZI);
const sapt = tab.cadente.find(c => c.cadenta === 'SAPTAMANA')!;
const luna = tab.cadente.find(c => c.cadenta === 'LUNA')!;

console.log('— Ancorarea: niciodată o perioadă neîncheiată —');
t('săptămâna ancorată e ultima ÎNCHEIATĂ: 22–28 iunie',
  sapt.perioada.de === '2026-06-22' && sapt.perioada.la === '2026-06-28', sapt.perioada.cheie);
t('luna ancorată e ultima ÎNCHEIATĂ: iunie', luna.perioada.cheie === '2026-06');
t('ambele au coborât de la ancoră și spun de ce',
  sapt.ancoraCoborata && luna.ancoraCoborata && !!sapt.motivAncora && !!luna.motivAncora);
t('perioada precedentă a săptămânii e 15–21 iunie',
  sapt.perioadaPrecedenta!.de === '2026-06-15' && sapt.perioadaPrecedenta!.la === '2026-06-21');
t('perioada precedentă a lunii e mai', luna.perioadaPrecedenta!.cheie === '2026-05');
t('o ancoră deja în trecut, pe o perioadă încheiată, NU coboară',
  ancoreaza('2026-06-24', 'SAPTAMANA', AZI).cobora === false);
t('… și rămâne pe perioada ei', ancoreaza('2026-06-24', 'SAPTAMANA', AZI).perioada.de === '2026-06-22');
t('ancora din perioada curentă coboară o singură treaptă',
  ancoreaza('2026-07-02', 'SAPTAMANA', AZI).perioada.de === '2026-06-22');
t('ancora în VIITOR e adusă în prezent, nu urmată orbește',
  ancoreaza('2027-01-01', 'LUNA', AZI).perioada.cheie === '2026-06');
t('motivul ancorei numește perioada afișată',
  ancoreaza('2026-07-02', 'LUNA', AZI).motiv!.includes('2026-06'));
t('INVARIANT: ancorarea NU întoarce niciodată o perioadă tăiată — pe 4 ani de date',
  (() => {
    for (let d = new Date('2024-01-01T00:00:00Z'); d < new Date('2028-01-01T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
      const zi = d.toISOString().slice(0, 10);
      for (const tip of ['SAPTAMANA', 'LUNA'] as const) {
        const p = ancoreaza(zi, tip, AZI).perioada;
        if (p.partiala || p.la >= AZI) return false;
      }
    }
    return true;
  })());
t('… de aceea mișcările pe ingrediente nu sunt blocate de perioade tăiate',
  sapt.miscari.length === 3 && luna.miscari.length === 3);

console.log('\n— Cifrele săptămânii, pe hârtie —');
t('vânzările săptămânii = 1650 lei', aprox(sapt.metrici!.salesRON, 1650));
t('costul din rețete = 600 lei (150 × 4,00)', aprox(sapt.metrici!.recipeCostRON, 600));
t('food = 525, paper = 75 — ambalajul nu intră în Food',
  aprox(sapt.metrici!.foodCostRON, 525) && aprox(sapt.metrici!.paperCostRON, 75));
t('FC-ul săptămânii = 36,363636%', aprox(sapt.metrici!.recipeFcPct!, 600 / 1650 * 100));
t('săptămâna precedentă: 2000 lei net, 700 lei cost, FC 35%',
  aprox(sapt.comparatie!.precedent!.salesRON, 2000)
  && aprox(sapt.comparatie!.precedent!.recipeCostRON, 700)
  && aprox(sapt.comparatie!.precedent!.recipeFcPct!, 35));

console.log('\n— ΔFC = efectCost + efectVanzari, identitate exactă —');
const d = sapt.descompunere!;
t('ΔFC = +1,363636 pp', aprox(d.deltaFcPp, 600 / 1650 * 100 - 35));
t('efectul costului = Δcost ÷ net_curent = −6,060606 pp', aprox(d.efectCostPp, -100 / 1650 * 100));
t('efectul vânzărilor = −cost_prec × Δnet ÷ (net_c × net_p) = +7,424242 pp',
  aprox(d.efectVanzariPp, -700 * -350 / (1650 * 2000) * 100));
t('IDENTITATE: efectCost + efectVanzari = ΔFC', aprox(d.efectCostPp + d.efectVanzariPp, d.deltaFcPp));
t('FC-ul crește deși costul SCADE — vânzările sunt cauza',
  d.deltaFcPp > 0 && d.deltaCostRON < 0 && d.dominanta === 'VANZARI');
t('Δcost = −100 lei, Δnet = −350 lei', aprox(d.deltaCostRON, -100) && aprox(d.deltaNetRON, -350));
const dl = luna.descompunere!;
t('luna: ΔFC = +0,616438 pp', aprox(dl.deltaFcPp, 1300 / 3650 * 100 - 35));
t('luna: efectCost = +6,849315 pp', aprox(dl.efectCostPp, 250 / 3650 * 100));
t('luna: efectVanzari = −6,232877 pp', aprox(dl.efectVanzariPp, -1050 * 650 / (3650 * 3000) * 100));
t('luna: IDENTITATE efectCost + efectVanzari = ΔFC', aprox(dl.efectCostPp + dl.efectVanzariPp, dl.deltaFcPp));
t('luna: cei doi termeni au semne OPUSE — nu se topesc unul în altul',
  dl.efectCostPp > 0 && dl.efectVanzariPp < 0);
t('luna: dominanta e costul (|6,85| > |6,23|)', dl.dominanta === 'COST');
t('descompunerea refuză un numitor zero', descompuneFC(100, 0, 100, 100) === null);
t('descompunerea refuză un numitor precedent zero', descompuneFC(100, 100, 100, 0) === null);
t('efecte egale în modul ⇒ dominanta AMBELE',
  descompuneFC(100, 100, 100, 100)!.dominanta === 'AMBELE');

console.log('\n— Mișcările pe ingrediente: Δpreț, Δconsum, termenul încrucișat —');
const i1 = sapt.miscari.find(m => m.ingredient === 'I1')!;
t('I1 apare între mișcări', !!i1);
t('prețul lui I1: 20 → 25 lei', aprox(i1.pretPrecedent!, 20) && aprox(i1.pretCurent!, 25));
t('Δpreț = +5 lei = +25%', aprox(i1.deltaPretLei!, 5) && aprox(i1.deltaPretPct!, 25));
t('direcția prețului e CREȘTERE', i1.directiePret === 'CRESTERE');
t('consumul: 20 kg → 15 kg', aprox(i1.consumPrecedent, 20) && aprox(i1.consumCurent, 15));
t('cost I1: 400 → 375 lei, Δ = −25', aprox(i1.costPrecedentRON!, 400)
  && aprox(i1.costCurentRON!, 375) && aprox(i1.deltaCostRON!, -25));
t('efectul de preț = Δpreț × consum precedent = +100 lei', aprox(i1.efectPretRON!, 100));
t('efectul de consum = Δconsum × preț precedent = −100 lei', aprox(i1.efectConsumRON!, -100));
t('termenul încrucișat = Δpreț × Δconsum = −25 lei', aprox(i1.efectIncrucisatRON!, -25));
t('IDENTITATE: Δcost = preț + consum + încrucișat',
  aprox(i1.efectPretRON! + i1.efectConsumRON! + i1.efectIncrucisatRON!, i1.deltaCostRON!));
t('consumul se desface mai departe în rețetă și mix',
  i1.efectRetetaRON !== null && i1.efectMixRON !== null);
t('rețeta nu s-a schimbat ⇒ efectul de rețetă e zero', aprox(i1.efectRetetaRON!, 0));
t('tot efectul de consum e mix (volume), nu gramaj', aprox(i1.efectMixRON!, -100));
const i2 = sapt.miscari.find(m => m.ingredient === 'I2')!;
t('I2 nu și-a schimbat prețul ⇒ efect de preț zero', aprox(i2.efectPretRON!, 0));
t('I2: direcția prețului e NESCHIMBAT', i2.directiePret === 'NESCHIMBAT');
t('I2: Δcost = −50 lei, tot din consum', aprox(i2.deltaCostRON!, -50) && aprox(i2.efectConsumRON!, -50));
const a1 = sapt.miscari.find(m => m.ingredient === 'A1')!;
t('ambalajul apare și el între mișcări, cu Δcost −25', aprox(a1.deltaCostRON!, -25));
t('mișcările sunt ordonate descrescător după |Δcost|',
  sapt.miscari.every((m, k) => k === 0 || Math.abs(sapt.miscari[k - 1].deltaCostRON ?? 0) >= Math.abs(m.deltaCostRON ?? 0)));
t('fiecare mișcare poartă rândul canonic pentru drill-down',
  sapt.miscari.every(m => m.rand.ingredient === m.ingredient && m.rand.produse.length > 0));

console.log('\n— Reconcilierea: golul dintre convenții e CALCULAT, nu ascuns —');
const rec = sapt.reconciliere!;
t('Σ Δcost pe ingrediente = −100 lei', aprox(rec.sumaIngredienteRON, -100));
t('Δcostul din rețete = −100 lei', aprox(rec.deltaCostReteteRON!, -100));
t('saltul de preț pe granița săptămânii ⇒ diferență ZERO', aprox(rec.diferentaRON!, 0, 1e-6));
t('… și niciun motiv de gol nu se inventează', rec.motive.length === 0);
t('niciun ingredient nu e lăsat pe dinafară', rec.ingredienteFaraPret.length === 0);

// același fixture, dar saltul de preț cade ÎN MIJLOCUL săptămânii curente: costarea datată
// (pe 24 iunie prețul e deja 25) și evaluarea la finele perioadei rămân apropiate, dar
// săptămâna PRECEDENTĂ se evaluează acum la 25 lei/kg, deși vânzarea ei a costat 20
const sMij = fixtura('2026-06-19');
const tabMij = tablouVariatii(sMij, buildCtx(sMij), cer(), PRAGURI_VARIATII, undefined, AZI);
const recMij = tabMij.cadente.find(c => c.cadenta === 'SAPTAMANA')!.reconciliere!;
// evaluarea la finele perioadei vede săptămâna precedentă la 25 lei/kg (500 lei pe I1),
// costarea datată o vede la 20 (400 lei) ⇒ Σ ingrediente = −200, Δcost rețete = −100
t('salt de preț în interiorul perioadei ⇒ Σ ingrediente = −200 lei',
  aprox(recMij.sumaIngredienteRON, -200, 1e-6));
t('… iar Δcostul din rețete rămâne −100 lei', aprox(recMij.deltaCostReteteRON!, -100, 1e-6));
t('diferența = Σ ingrediente − Δcost rețete = −100 lei (semnul contează)',
  aprox(recMij.diferentaRON!, -100, 1e-6), `${recMij.diferentaRON}`);
t('… iar diferența e numită drept convenție, nu eroare',
  recMij.motive.some(m => m.includes('convenția')));
t('diferența are și mărimea relativă, ca să se vadă dacă e neglijabilă',
  recMij.diferentaPct !== null && recMij.diferentaPct > 0);
t('costarea datată rămâne corectă: săptămâna precedentă a costat 700 lei cu prețul de atunci',
  aprox(tabMij.cadente.find(c => c.cadenta === 'SAPTAMANA')!.comparatie!.precedent!.recipeCostRON, 700));

console.log('\n— Semnalele: pp, % și lei nu se amestecă —');
t('creșterea de preț a lui I1 produce un semnal',
  tab.semnale.some(s => s.fel === 'PRET_CRESTERE'));
t('un ingredient cu prețul neschimbat NU produce semnal de preț',
  !tab.semnale.some(s => s.fel === 'PRET_CRESTERE' && s.titlu.includes('Chiflă')));
const sPret = tab.semnale.find(s => s.fel === 'PRET_CRESTERE')!;
t('semnalul de preț e în %, nu în pp', sPret.unitate === '%' && aprox(sPret.valoare!, 25));
t('semnalul de preț numește ingredientul', sPret.titlu.includes('Piept de pui'));
const sFc = tab.semnale.find(s => s.fel === 'FC_CRESTERE' && s.cadenta === 'SAPTAMANA')!;
t('creșterea de FC produce un semnal, în pp', !!sFc && sFc.unitate === 'pp');
t('semnalul de FC arată descompunerea, nu doar cifra',
  sFc.detaliu.includes('din cost') && sFc.detaliu.includes('din vânzări'));
const sVanz = tab.semnale.find(s => s.fel === 'VANZARI_SCADERE' && s.cadenta === 'SAPTAMANA')!;
t('scăderea de vânzări e semnalată separat, în %', !!sVanz && sVanz.unitate === '%');
t('… și spune că FC-ul urcă din numitor', sVanz.detaliu.includes('numitor'));
t('nu apare semnal de creștere de cost — costul a scăzut',
  !sapt.semnale.some(s => s.fel === 'COST_CRESTERE'));
t('semnalele sunt ordonate: alertele înaintea atenționărilor',
  tab.semnale.every((s, k) => k === 0
    || ['ALERTA', 'ATENTIE', 'INFO'].indexOf(tab.semnale[k - 1].severitate)
    <= ['ALERTA', 'ATENTIE', 'INFO'].indexOf(s.severitate)));
t('fiecare semnal spune din ce cadență vine',
  tab.semnale.every(s => s.cadenta === 'SAPTAMANA' || s.cadenta === 'LUNA'));
t('un semnal fără cifră nu inventează o unitate',
  tab.semnale.filter(s => s.valoare === null).every(s => s.unitate === null));

console.log('\n— 2.9 pe săptămâni: indisponibil prin construcție, nu fabricat —');
t('săptămâna NU are date 2.9', !sapt.nboDisponibil);
t('… și spune de ce', !!sapt.motivNbo);
t('săptămâna nu inventează FC actual', sapt.metrici!.nboActualFcPct === null && sapt.metrici!.nboTotalRON === null);
t('luna fără 2.9 încărcat e la fel de cinstită', !luna.nboDisponibil && !!luna.motivNbo);

console.log('\n— Seria din spate —');
t('seria săptămânală are 8 puncte, câte cere pragul', sapt.serie.length === PRAGURI_VARIATII.puncteSerie);
t('ultimul punct al seriei e chiar perioada analizată',
  sapt.serie[sapt.serie.length - 1].perioada.cheie === sapt.perioada.cheie);
t('punctele seriei folosesc ACELEAȘI metrici ca tabloul',
  aprox(sapt.serie[sapt.serie.length - 1].metrici.recipeCostRON, sapt.metrici!.recipeCostRON));
t('seria lunară are tot 8 puncte', luna.serie.length === PRAGURI_VARIATII.puncteSerie);
t('perioadele din serie sunt strict crescătoare',
  sapt.serie.every((p, k) => k === 0 || p.perioada.de > sapt.serie[k - 1].perioada.de));
t('seria nu conține perioade tăiate — toate au 7 zile',
  sapt.serie.every(p => p.perioada.zile === 7 && !p.perioada.partiala));
t('perioadele fără vânzări apar cu zero, nu lipsesc din serie',
  sapt.serie.filter(p => p.metrici.salesRON === 0).length > 0);

console.log('\n— Scopul: restaurant vs companie, aceeași funcție —');
const tabL1 = tablouVariatii(s0, ctx0, cer({ nivel: restaurant('L1') }), PRAGURI_VARIATII, undefined, AZI);
const saptL1 = tabL1.cadente.find(c => c.cadenta === 'SAPTAMANA')!;
t('cu un singur restaurant, compania = restaurantul',
  aprox(saptL1.metrici!.recipeCostRON, sapt.metrici!.recipeCostRON)
  && aprox(saptL1.descompunere!.deltaFcPp, d.deltaFcPp));
const tabAltul = tablouVariatii(s0, ctx0, cer({ nivel: restaurant('INEXISTENT') }), PRAGURI_VARIATII, undefined, AZI);
t('un restaurant fără vânzări e declarat indisponibil, nu zero',
  tabAltul.cadente.every(c => !c.disponibil && !!c.motivIndisponibil));
t('… iar motivul numește perioada', tabAltul.cadente[0].motivIndisponibil!.includes(sapt.perioada.cheie));
t('indisponibilul nu produce descompunere sau mișcări',
  tabAltul.cadente.every(c => c.descompunere === null && c.miscari.length === 0 && c.reconciliere === null));

console.log('\n— Canalul —');
const tabDel = tablouVariatii(s0, ctx0, cer({ canal: 'DELIVERY' }), PRAGURI_VARIATII, undefined, AZI);
t('pe Delivery nu există vânzări ⇒ indisponibil declarat',
  tabDel.cadente.every(c => !c.disponibil));
const tabIn = tablouVariatii(s0, ctx0, cer({ canal: 'INSTORE' }), PRAGURI_VARIATII, undefined, AZI);
t('InStore = Total, pentru că Delivery e gol',
  aprox(tabIn.cadente[0].metrici!.recipeCostRON, sapt.metrici!.recipeCostRON));

console.log('\n— Praguri și opțiuni —');
const tabTaiat = tablouVariatii(s0, ctx0, cer(), { ...PRAGURI_VARIATII, miscariRetinute: 2 }, undefined, AZI);
const saptTaiat = tabTaiat.cadente.find(c => c.cadenta === 'SAPTAMANA')!;
t('pragul de afișare taie lista de mișcări', saptTaiat.miscari.length === 2);
t('… dar spune câte erau în total', saptTaiat.miscariTotale === 3);
t('taie de la coadă: rămân cele mai mari mișcări',
  saptTaiat.miscari.map(m => m.ingredient).join() === sapt.miscari.slice(0, 2).map(m => m.ingredient).join());
const tabPragSus = tablouVariatii(s0, ctx0, cer(), { ...PRAGURI_VARIATII, pretSemnificativPct: 40 }, undefined, AZI);
t('un prag de preț mai mare stinge semnalul de +25%',
  !tabPragSus.semnale.some(s => s.fel === 'PRET_CRESTERE'));
const tabDoarLuna = tablouVariatii(s0, ctx0, cer({ cadente: ['LUNA'] }), PRAGURI_VARIATII, undefined, AZI);
t('se poate cere o singură cadență', tabDoarLuna.cadente.length === 1 && tabDoarLuna.cadente[0].cadenta === 'LUNA');
t('lista goală de cadențe înseamnă „amândouă", nu „niciuna"',
  tablouVariatii(s0, ctx0, cer({ cadente: [] }), PRAGURI_VARIATII, undefined, AZI).cadente.length === 2);
t('un prag de serie de 1 dă un singur punct',
  tablouVariatii(s0, ctx0, cer(), { ...PRAGURI_VARIATII, puncteSerie: 1 }, undefined, AZI)
    .cadente[0].serie.length === 1);

console.log('\n— Calitatea datelor: nimic incomplet nu se ascunde —');
const sFaraPret: AppState = {
  ...s0,
  ingrediente: s0.ingrediente.map(i => (i.cod === 'I2' ? { ...i, preturi: [] } : i)),
};
const tabFaraPret = tablouVariatii(sFaraPret, buildCtx(sFaraPret), cer(), PRAGURI_VARIATII, undefined, AZI);
const saptFP = tabFaraPret.cadente.find(c => c.cadenta === 'SAPTAMANA')!;
t('un ingredient fără preț nu e presupus zero: apare în ingredienteFaraPret',
  saptFP.reconciliere!.ingredienteFaraPret.includes('I2'));
t('… și e numit ca motiv al golului',
  saptFP.reconciliere!.motive.some(m => m.includes('nu au preț valid')));
t('… iar cadența nu se declară completă', !saptFP.complete && saptFP.motiveIncomplet.length > 0);
// I1 −25 + A1 −25 = −50; chifla fără preț NU contribuie cu zero, ci lipsește din sumă
t('suma pe ingrediente sare peste cel fără preț: −50 lei, nu −100',
  aprox(saptFP.reconciliere!.sumaIngredienteRON, -50, 1e-6));
t('… și costarea face la fel: Δcost rețete = −50 lei',
  aprox(saptFP.reconciliere!.deltaCostReteteRON!, -50, 1e-6));
t('… deci golul rămâne zero — lipsa prețului nu creează o diferență falsă',
  aprox(saptFP.reconciliere!.diferentaRON!, 0, 1e-6));
t('tabloul e complet doar dacă toate cadențele sunt', tabFaraPret.complete === false);

const sFaraReteta: AppState = {
  ...s0,
  produse: [...s0.produse, { ...P1, cod: 'P2', denumire: 'Produs fără rețetă' }],
  vanzari: [...s0.vanzari, { ...v('2026-06-24', 10, 200), produs: 'P2' }],
};
const tabFR = tablouVariatii(sFaraReteta, buildCtx(sFaraReteta), cer(), PRAGURI_VARIATII, undefined, AZI);
const saptFR = tabFR.cadente.find(c => c.cadenta === 'SAPTAMANA')!;
t('un produs vândut fără rețetă coboară acoperirea sub 100%', saptFR.metrici!.acoperirePct! < 100);
t('… și e declarat între motivele de incomplet',
  saptFR.motiveIncomplet.some(m => m.includes('rețetă calculabilă')));
t('… și produce un semnal de date incomplete',
  saptFR.semnale.some(s => s.fel === 'DATE_INCOMPLETE'));
t('fiecare motiv e un text propriu-zis, nu un marcaj gol',
  saptFR.motiveIncomplet.every(m => m.trim().length > 10));
t('motivele nu se repetă', new Set(saptFR.motiveIncomplet).size === saptFR.motiveIncomplet.length);

console.log('\n— Fără istoric: comparația refuză, nu inventează —');
const sDoarOSapt: AppState = { ...s0, vanzari: [v('2026-06-24', 150, 1650)] };
const tabUna = tablouVariatii(sDoarOSapt, buildCtx(sDoarOSapt), cer(), PRAGURI_VARIATII, undefined, AZI);
const saptUna = tabUna.cadente.find(c => c.cadenta === 'SAPTAMANA')!;
t('perioada curentă rămâne disponibilă', saptUna.disponibil && saptUna.metrici!.salesRON === 1650);
t('comparația e indisponibilă, cu motiv', !saptUna.comparatie!.disponibil && !!saptUna.comparatie!.motivIndisponibil);
t('fără precedent nu există descompunere — nu se compară cu zero', saptUna.descompunere === null);
t('… iar motivul intră în lista de incomplet', saptUna.motiveIncomplet.some(m => m.includes('nu are față de ce')));
t('fără precedent nu se produce semnal de FC',
  !saptUna.semnale.some(s => s.fel === 'FC_CRESTERE' || s.fel === 'FC_SCADERE'));

console.log('\n— Determinism și rezumat —');
t('două rulări identice dau exact același tablou',
  JSON.stringify(tablouVariatii(s0, ctx0, cer(), PRAGURI_VARIATII, undefined, AZI))
  === JSON.stringify(tab));
t('rezumatul numește perioada și ΔFC-ul ei în pp',
  descrieVariatii(tab).includes('2026-06') && descrieVariatii(tab).includes('pp'));
t('rezumatul marchează explicit creșterea cu semnul +', descrieVariatii(tab).includes('+'));
t('rezumatul are câte o secțiune pe cadență', descrieVariatii(tab).split(' · ').length === 2);
t('o cadență indisponibilă e numită ca atare în rezumat',
  descrieVariatii(tabAltul).includes('indisponibil'));
t('perioadaDin e sursa perioadelor, nu un calcul local',
  perioadaDin('2026-06-24', 'SAPTAMANA').cheie === sapt.perioada.cheie);

console.log('\n— Ecranul: compune motorul, nu recalculează —');
// ancora vine din bară; „azi" e real, dar iunie 2026 e demult încheiat, deci ancorarea
// rămâne pe perioadele fixate mai sus și randarea e deterministă
const SEL: SelectieFC = {
  ancora: '2026-06-24', granularitate: 'LUNA', comparatie: 'PERIOADA_PRECEDENTA',
  scop: 'COMPANIE', locatie: null, canal: 'TOTAL',
};
const ctxTower = (state: AppState, extra: Partial<TowerCtx> = {}): TowerCtx => ({
  state, ctx: buildCtx(state), sel: SEL, setSel: () => undefined,
  acces: accesTower(state, { rol: 'ADMIN' }, false), update: () => undefined, ...extra,
});
const html = renderToStaticMarkup(h(TowerProvider, { value: ctxTower(s0) }, h(Variatii)));
t('ecranul se randează', html.includes('data-ecran="variatii"'));
t('arată ambele cadențe', html.includes('data-cadenta="SAPTAMANA"') && html.includes('data-cadenta="LUNA"'));
t('arată descompunerea ΔFC în cele două efecte',
  html.includes('data-parte="din cost"') && html.includes('data-parte="din vânzări"'));
t('arată ingredientele care au mișcat costul',
  html.includes('data-ingredient="I1"') && html.includes('Piept de pui'));
t('FC-ul săptămânii apare pe ecran cu două zecimale', html.includes('36,36'));
// ancorat pe câmpul propriu-zis: altfel un „%" pus în locul lui „pp" ar trece neobservat,
// pentru că aceeași cifră mai apare o dată în nota de sub descompunere
const camp = (h_: string, nume: string) => h_.match(new RegExp(`data-camp="${nume}"[^>]*>([^<]*)<`))?.[1] ?? '';
t('delta de FC e scrisă în pp (fmtPP), nu în %', camp(html, 'delta-fc') === '+1,4 pp');
t('… iar delta lunii tot în pp', html.includes('+0,6 pp'));
const valori = [...html.matchAll(/data-parte="([^"]+)"[\s\S]*?data-valoare="([^"]+)"/g)].map(m => [m[1], m[2]]);
t('efectul de cost e −6,1 pp, nu cel de vânzări',
  valori.some(([e, v]) => e === 'din cost' && v === '-6,1 pp'), JSON.stringify(valori.slice(0, 2)));
t('efectul de vânzări e +7,4 pp — cele două nu se inversează',
  valori.some(([e, v]) => e === 'din vânzări' && v === '+7,4 pp'));
t('cele două valori afișate sunt DIFERITE între ele', valori[0]?.[1] !== valori[1]?.[1]);
t('semnalele apar pe ecran', html.includes('data-semnal="PRET_CRESTERE"'));
t('nota spune limpede că vederea nu ia granularitatea din bară',
  html.includes('data-zona="nota"') && html.includes('granularitatea'));
t('lipsa raportului 2.9 e scrisă, nu ascunsă', html.includes('fără 2.9'));
t('reconcilierea e la vedere, nu doar în cod', html.includes('data-zona="reconciliere"'));
const htmlGol = renderToStaticMarkup(h(TowerProvider,
  { value: ctxTower(s0, { sel: { ...SEL, scop: 'RESTAURANT', locatie: 'INEXISTENT' } }) }, h(Variatii)));
t('un scop fără date arată motivul, nu zerouri',
  htmlGol.includes('data-zona="indisponibil"') && !/\b0,00\s*%/.test(htmlGol));
t('… și nu randează niciun rând de ingredient', !htmlGol.includes('data-ingredient='));
t('secțiunea e înregistrată în turn, ca ecran de citire',
  sectiuneDupaId('VARIATII').id === 'VARIATII' && !sectiuneDupaId('VARIATII').scrie);

// o cifră necunoscută se scrie „—" pe ecran, nu 0: un preț lipsă nu devine „gratuit"
const htmlFaraPret = renderToStaticMarkup(h(TowerProvider, { value: ctxTower(sFaraPret) }, h(Variatii)));
const randI2 = htmlFaraPret.match(/data-ingredient="I2"[\s\S]*?<\/tr>/)?.[0] ?? '';
t('ingredientul fără preț apare pe ecran', randI2.length > 0);
const gol = (r: string, nume: string) =>
  new RegExp(`data-camp="${nume}"[^>]*><span[^>]*>—<`).test(r);
t('… cu prețul scris „—", nu 0 lei', gol(randI2, 'pret'));
t('… și cu Δcost scris „—", nu 0 lei', gol(randI2, 'delta-cost'));
t('… iar rândul lui nu conține nicio sumă în lei', !/lei/.test(randI2) && !/\b0<\/td>/.test(randI2));
t('rândurile cu preț rămân populate — „—" nu se generalizează',
  !gol(htmlFaraPret.match(/data-ingredient="I1"[\s\S]*?<\/tr>/)?.[0] ?? '', 'delta-cost'));

// canalul din bară chiar ajunge la motor: pe Delivery nu există vânzări în fixtură
const htmlDelivery = renderToStaticMarkup(h(TowerProvider,
  { value: ctxTower(s0, { sel: { ...SEL, canal: 'DELIVERY' } }) }, h(Variatii)));
t('canalul din bară se propagă: pe Delivery ecranul e indisponibil, nu identic cu Total',
  htmlDelivery.includes('data-zona="indisponibil"') && !htmlDelivery.includes('data-ingredient='));
t('… iar pe InStore rămâne populat', renderToStaticMarkup(h(TowerProvider,
  { value: ctxTower(s0, { sel: { ...SEL, canal: 'INSTORE' } }) }, h(Variatii))).includes('data-ingredient="I1"'));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
