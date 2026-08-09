import { stareGoala } from '../src/lib/seed';
import { importa, mapeazaAntete, type Parsat } from '../src/lib/importer';
import { parseBazaFC, numeBazaComercial } from '../src/lib/fcbaza';
import { buildCtx, costProdus, versiuneActiva, pretCurent, kpiProdus } from '../src/lib/engine';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

// ——— fișier de bază FC, reprodus fidel după structura reală
const NOMENCLATOR: unknown[][] = [
  ['NOMENCLATOR — cost actual'], ['Col D = cost actual'], [],
  ['Cod MP', 'Denumire materie primă (NBO)', 'UM', 'Cost / UM', 'Cost NOU / UM'],
  ['7000133', 'CHIFLA CARTOF 3.5inch 53G x 72', 'EA', 2.4, 2.4],
  ['7000210', 'PREP - smashed koliber 60G', 'EA', 2.93233, 3.596],
  ['700655', 'Hartie Little Hamburgers', 'EA', 0.111, 0.111],
  ['7000140', 'HARTIE BURGER Doubles', 'EA', 0.111, 0.111],
  ['702052', 'Ketchup Jerrycan Heinz', 'ML', 0.0221, 0.0221],
  ['7000142', 'Y - Ceapa Cuburi', 'GM', 0.007, 0.007],
  ['702496', 'Cutie mare burger', 'EA', 0.974, 0.974],
];
const RETETAR: unknown[][] = [
  ['REȚETAR'], [], [],
  ['Single HAMBURGER', '', '', '', '', 'BURGER VITA'],
  ['COD', 'INGREDIENT', 'QTY', 'UM', 'COST/UM', 'COST', 'COST/UM NOU', 'COST NOU'],
  ['7000133', 'CHIFLA CARTOF 3.5inch 53G x 72', 1, 'EA', 2.4, 2.4, 2.4, 2.4],
  ['7000210', 'PREP - smashed koliber 60G', 1, 'EA', 2.93233, 2.93233, 3.596, 3.596],
  ['700655', 'Hartie Little Hamburgers', 1, 'EA', 0.111, 0.111, 0.111, 0.111],
  ['702052', 'Ketchup Jerrycan Heinz', 10, 'ML', 0.0221, 0.221, 0.0221, 0.221],
  ['7000142', 'Y - Ceapa Cuburi', 5, 'GM', 0.007, 0.035, 0.007, 0.035],
  ['Single HAMBURGER', '', '', '', '', 5.699, '', 6.363],
  [],
  ['Single HAMBURGER D', '', '', '', '', 'BURGER VITA'],
  ['COD', 'INGREDIENT', 'QTY', 'UM', 'COST/UM', 'COST', 'COST/UM NOU', 'COST NOU'],
  ['7000133', 'CHIFLA CARTOF 3.5inch 53G x 72', 1, 'EA', 2.4, 2.4, 2.4, 2.4],
  ['7000210', 'PREP - smashed koliber 60G', 1, 'EA', 2.93233, 2.93233, 3.596, 3.596],
  ['702496', 'Cutie mare burger', 1, 'EA', 0.974, 0.974, 0.974, 0.974],
  ['702052', 'Ketchup Jerrycan Heinz', 10, 'ML', 0.0221, 0.221, 0.0221, 0.221],
  ['7000142', 'Y - Ceapa Cuburi', 5, 'GM', 0.007, 0.035, 0.007, 0.035],
  ['Single HAMBURGER D', '', '', '', '', 6.562, '', 7.226],
];
const FOODCOST: unknown[][] = [
  ['FOOD COST'], [], [],
  ['Denumire comercială', 'Rețetă (Recipe Cards)', 'Categorie', 'Canal', 'Tip TVA', 'TVA %', 'MC actual', 'MC NOU', 'Preț cu TVA'],
  ['HAMBURGER', 'Single HAMBURGER', 'BURGER VITA', 'Instore', 'FOOD', 0.11, 5.699, 6.363, 8],
  ['HAMBURGER D', 'Single HAMBURGER D', 'BURGER VITA', 'Delivery', 'FOOD', 0.11, 6.562, 7.226, 10],
];
const foi = { NOMENCLATOR, RETETAR, 'FOOD COST': FOODCOST };

console.log('— Parserul bazei FC —');
const b = parseBazaFC(foi);
t('7 ingrediente citite', b.ingrediente.length === 7, `${b.ingrediente.length}`);
t('2 rețete, cu categorie', b.retete.length === 2 && b.retete[0].categorie === 'BURGER VITA');
t('rețeta InStore are 5 linii', b.retete[0].linii.length === 5);
t('totalul rețetei citit din coloana COST, nu COST/UM', aprox(b.retete[0].totalActual!, 5.699) && aprox(b.retete[0].totalNou!, 6.363),
  `${b.retete[0].totalActual} / ${b.retete[0].totalNou}`);
t('costul unitar pe linie e păstrat', aprox(b.retete[0].linii[1].costUMNou!, 3.596));
t('2 rânduri de produs, cu canal și TVA în procente', b.produse.length === 2 && b.produse[0].tva === 11 && b.produse[1].canal === 'DELIVERY');
t('numele comercial se curăță de sufixul de canal', numeBazaComercial('HAMBURGER D') === 'HAMBURGER' && numeBazaComercial('HAMBURGER') === 'HAMBURGER');

console.log('— Importul —');
const r = importa('FC_BAZA', { foaie: 'FOOD COST', antete: [], randuri: [], matrice: FOODCOST, foi }, 'FC baza.xlsx', stareGoala());
t('import reușit, un produs comercial', r.batch.status === 'IMPORTAT' && r.batch.importate === 1, r.batch.erori.join('|'));
const s = r.stateNou;
t('cele două rânduri devin un produs cu două prețuri', s.produse.length === 1 && s.produse[0].pretInstore === 8 && s.produse[0].pretDelivery === 10);
t('aliasurile includ ambele denumiri și rețetele', (s.produse[0].aliasuri ?? []).includes('HAMBURGER D') && (s.produse[0].aliasuri ?? []).includes('Single HAMBURGER D'));
t('TVA preluat pe produs', s.produse[0].tva === 11);

console.log('— Conversia costului în UM de bază —');
const ket = s.ingrediente.find(x => x.cod === '702052')!;
t('ketchup: 0,0221 lei/ML → 22,10 lei/l', ket.um === 'l' && aprox(pretCurent(ket), 22.1, 0.001), `${pretCurent(ket)} lei/${ket.um}`);
const ceapa = s.ingrediente.find(x => x.cod === '7000142')!;
t('ceapă: 0,007 lei/GM → 7,00 lei/kg', ceapa.um === 'kg' && aprox(pretCurent(ceapa), 7, 0.001));
t('chifla rămâne per bucată', aprox(pretCurent(s.ingrediente.find(x => x.cod === '7000133')!), 2.4));
t('ambalajele sunt marcate PACKAGING', s.ingrediente.filter(x => ['700655', '702496'].includes(x.cod)).every(x => x.tip === 'PACKAGING'));

console.log('— Fuziunea rețetelor pe canal (ambalajul corect pe fiecare canal) —');
const linii = versiuneActiva(s.retete[0]).linii;
t('hârtia doar pe InStore', linii.some(l => l.comp === '700655' && l.canal === 'INSTORE'));
t('cutia doar pe Delivery', linii.some(l => l.comp === '702496' && l.canal === 'DELIVERY'));
t('liniile comune pe AMBELE', linii.filter(l => l.canal === 'AMBELE').length === 4, `${linii.filter(l => l.canal === 'AMBELE').length}`);
const ctx = buildCtx(s);
const ci = costProdus('HAMBURGER', 'INSTORE', ctx, '2026-08-15')!;
const cd = costProdus('HAMBURGER', 'DELIVERY', ctx, '2026-08-15')!;
t('cost InStore = MC NOU declarat (6,363)', aprox(ci.total, 6.363, 0.005), ci.total.toFixed(3));
t('cost Delivery = MC NOU declarat (7,226)', aprox(cd.total, 7.226, 0.005), cd.total.toFixed(3));
t('Paper diferă pe canale', aprox(ci.paper, 0.111) && aprox(cd.paper, 0.974));
t('controlul încrucișat confirmă potrivirea', r.batch.avertismente.some(a => a.includes('Control încrucișat') && a.includes('coincide')));

console.log('— Divergență nomenclator vs rețetar, raportată —');
const foiDiv = { NOMENCLATOR: NOMENCLATOR.map(x => x[0] === '7000210' ? ['7000210', 'PREP - smashed koliber 60G', 'EA', 2.93233, 3.35] : x), RETETAR, 'FOOD COST': FOODCOST };
const rDiv = importa('FC_BAZA', { foaie: 'F', antete: [], randuri: [], matrice: FOODCOST, foi: foiDiv }, 'fc.xlsx', stareGoala());
t('ingredientul divergent e numit explicit', rDiv.batch.avertismente.some(a => a.includes('PREP - smashed koliber') && a.includes('NOMENCLATOR 3.3500') && a.includes('RETETAR 3.5960')));
t('nepotrivirea de produs e raportată', rDiv.batch.avertismente.some(a => a.includes('HAMBURGER: calculat')));
t('nomenclatorul e sursa folosită', aprox(costProdus('HAMBURGER', 'INSTORE', buildCtx(rDiv.stateNou), '2026-08-15')!.total, 6.363 - 0.246, 0.005));

console.log('— Prețuri din CR: InStore și Delivery după discount —');
const crIn: Parsat = {
  foaie: '8. Preturi INSTORE RO', antete: ['Produs', 'Preț actual', 'Preț NOU', 'Observații'],
  randuri: [{ 'Produs': 'BURGERI', 'Preț actual': '', 'Preț NOU': '', 'Observații': '' },
            { 'Produs': 'HAMBURGER', 'Preț actual': 8, 'Preț NOU': 8.99, 'Observații': 'Se schimbă' }],
};
t('coloana aleasă pentru InStore este „Preț NOU"', mapeazaAntete(crIn.antete, 'PRETURI_PRODUSE').pret === 'Preț NOU');
const r2 = importa('PRETURI_PRODUSE', crIn, 'CR IT preturi INSTORE.xlsx', s, undefined, { canalImplicit: 'INSTORE' });
t('prețul InStore se aplică pe denumire', r2.stateNou.produse[0].pretInstore === 8.99 && r2.stateNou.produse[0].pretDelivery === 10);
t('rândul de categorie fără preț e ignorat', r2.batch.importate === 1);
t('se raportează potrivirea pe denumire', r2.batch.avertismente.some(a => a.includes('denumirea comercială')));

const crD: Parsat = {
  foaie: 'Preturi DELIVERY RO',
  antete: ['Produs', 'Preț actual (după discount)', 'Preț NOU ÎNAINTE de discount', 'Preț NOU DUPĂ discount', 'Se aplică discount'],
  randuri: [{ 'Produs': 'HAMBURGER', 'Preț actual (după discount)': 10, 'Preț NOU ÎNAINTE de discount': 14.2857, 'Preț NOU DUPĂ discount': 11.49, 'Se aplică discount': 'DA – 30%' }],
};
t('coloana aleasă pentru Delivery este cea DUPĂ discount', mapeazaAntete(crD.antete, 'PRETURI_PRODUSE').pret === 'Preț NOU DUPĂ discount');
const r3 = importa('PRETURI_PRODUSE', crD, 'PRETURI DELIVERY UPDATE.xlsx', r2.stateNou, undefined, { canalImplicit: 'DELIVERY' });
t('se ia prețul după discount, nu cel înainte', r3.stateNou.produse[0].pretDelivery === 11.49);
t('InStore rămâne neatins', r3.stateNou.produse[0].pretInstore === 8.99);
const k = kpiProdus('HAMBURGER', 'DELIVERY', buildCtx(r3.stateNou))!;
t('FC Delivery pe prețul după discount', aprox(k.fc!, (7.226 / (11.49 / 1.11)) * 100, 0.1), `${k.fc!.toFixed(2)}%`);
t('jurnalul de prețuri are ambele canale', (r3.stateNou.produse[0].istoricPret ?? []).length === 2);

console.log('— Semantica datelor la corecțiile de preț —');
// corecție în aceeași zi cu baza → înlocuire, nu dublare; noul preț devine cel curent
const corAzi: Parsat = { foaie: 'C', antete: ['Cod', 'Pret'], randuri: [{ Cod: '7000210', Pret: 3.57 }] };
const rc1 = importa('COST_INGREDIENTE', corAzi, 'corectii.xlsx', s);
const kolib = rc1.stateNou.ingrediente.find(x => x.cod === '7000210')!;
t('corecția din aceeași zi înlocuiește, nu dublează', kolib.preturi.length === 1 && kolib.preturi[0].pret === 3.57,
  kolib.preturi.map(x => `${x.validDeLa}:${x.pret}`).join(' | '));
t('costul curent folosește corecția', aprox(costProdus('HAMBURGER', 'INSTORE', buildCtx(rc1.stateNou), '9999-12-31')!.total, 6.363 + (3.57 - 3.596), 0.005),
  costProdus('HAMBURGER', 'INSTORE', buildCtx(rc1.stateNou), '9999-12-31')!.total.toFixed(3));
t('variația sub prag (−0,7%) nu alarmează inutil', !rc1.batch.avertismente.some(a => /variație/.test(a)));
// o scumpire reală peste prag se semnalează
const corMare: Parsat = { foaie: 'C', antete: ['Cod', 'Pret'], randuri: [{ Cod: '7000210', Pret: 4.5 }] };
const rcM = importa('COST_INGREDIENTE', corMare, 'corectii.xlsx', s);
t('variația peste prag e semnalată', rcM.batch.avertismente.some(a => /koliber/.test(a) && /variație/.test(a)),
  rcM.batch.avertismente.find(a => /variație/.test(a)) ?? '—');

// bază datată în urmă + corecție azi → istoric pe două date, costul istoric neatins
const rB = importa('FC_BAZA', { foaie: 'F', antete: [], randuri: [], matrice: FOODCOST, foi }, 'fc.xlsx', stareGoala(), undefined, { dataValabil: '2026-08-01' });
const rc2 = importa('COST_INGREDIENTE', corAzi, 'corectii.xlsx', rB.stateNou);
const kolib2 = rc2.stateNou.ingrediente.find(x => x.cod === '7000210')!;
t('bază datată + corecție azi → două intrări în istoric', kolib2.preturi.length === 2 && kolib2.preturi[0].validDeLa === '2026-08-01',
  kolib2.preturi.map(x => `${x.validDeLa}:${x.pret}`).join(' | '));
const ctx2 = buildCtx(rc2.stateNou);
t('costul la data bazei rămâne pe prețul vechi', aprox(costProdus('HAMBURGER', 'INSTORE', ctx2, '2026-08-01')!.total, 6.363, 0.005));
t('costul de azi folosește corecția', aprox(costProdus('HAMBURGER', 'INSTORE', ctx2, '9999-12-31')!.total, 6.363 - 0.026, 0.005));

// corecție retro-datată sub un preț mai nou → avertisment explicit, prețul curent neschimbat
const corRetro: Parsat = { foaie: 'C', antete: ['Cod', 'Pret', 'Valabil de la'], randuri: [{ Cod: '7000210', Pret: 9.99, 'Valabil de la': '2026-07-01' }] };
const rc3 = importa('COST_INGREDIENTE', corRetro, 'corectii.xlsx', s);
const kolib3 = rc3.stateNou.ingrediente.find(x => x.cod === '7000210')!;
t('retro-datarea e avertizată explicit', rc3.batch.avertismente.some(a => a.includes('rămâne cel curent')));
t('prețul curent nu se schimbă la retro-datare', kolib3.preturi[kolib3.preturi.length - 1].pret !== 9.99,
  kolib3.preturi.map(x => `${x.validDeLa}:${x.pret}`).join(' | '));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
