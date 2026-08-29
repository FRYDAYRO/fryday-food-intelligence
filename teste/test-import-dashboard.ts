// Registrul FRYDAY DASHBOARD: nomenclator, rețetar și prețurile lunii realizate.
// Proprietăți apărate: nu se preiau prețuri de plan, nu se stochează netul, nu se
// potrivește nimic după asemănare, iar un preț lipsă rămâne lipsă — nu devine zero.
import { importaDashboard, numar, parseNomenclator, parsePreturi, parseRetetar } from '../src/lib/import-dashboard';
import { pretNet } from '../src/lib/engine';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const NOM: unknown[][] = [
  ['NOMENCLATOR — 3 materii prime'], ['Prețul e singurul input.'],
  ['Cod NBO', 'Denumire NBO', 'Tip', 'UM (NBO)', 'UM bază', 'PREȚ / UM bază', 'Valabil de la'],
  ['700977', 'Aqua Carpatica Plata', 'Aliment', 'EA', 'buc', '2.7920', '2026-08-09'],
  ['700100', 'Hârtie ambalaj', 'Ambalaj', 'EA', 'buc', '0.1500', '2026-08-01'],
  ['697025', 'Ingredient fără preț', 'Aliment', 'KG', 'kg', '0', '2026-08-01'],
];
const RET: unknown[][] = [
  ['REȚETAR — 3 linii'], ['Cantitatea e editabilă.'],
  ['Produs', 'Categorie', 'Canal', 'Cod MP', 'Denumire MP', 'Cantitate', 'UM', 'Preț unitar', 'Cost linie'],
  ['DUBLU CHEESEBURGER', 'BURGER', 'AMBELE', '700977', 'Aqua Carpatica Plata', '2.', 'buc', '0.4520', '0.9040'],
  ['DUBLU CHEESEBURGER', 'BURGER', 'DELIVERY', '700100', 'Hârtie ambalaj', '1', 'buc', '0.15', '0.15'],
  ['PRODUS FARA PRET', 'ALTE', '', '700977', 'Aqua Carpatica Plata', '100', 'g', '0.1', '0.1'],
];
const SIM: unknown[][] = [
  ['SIMULARE PE PRODUS · august → decembrie 2026'],
  ['August = realizat. Lunile următoare urmează planul.'], [''], ['', 'TOTAL GENERAL'],
  ['#', 'Produs', 'Categorie', 'Continuă?', 'TVA %', 'Buc InStore', 'Buc Delivery',
   'Cost unitar I', 'Cost unitar D', 'Cost mat. I', 'Cost mat. D', 'COST MATERIAL', 'cheie',
   'Preț I IULIE', 'Preț D IULIE', 'August\r\nPreț I', 'Preț D', 'Net I', 'Net D', 'Net TOTAL', 'FC', 'FC I', 'FC D',
   'Septembrie\r\nPreț I', 'Preț D'],
  ['1', 'DUBLU CHEESEBURGER', 'BURGER', 'DA', '11', '100', '50', '', '', '', '', '', '',
   '17.00', '19.00', '17.99', '19.99', '', '', '', '', '', '', '23.49', '26.49'],
  ['2', 'MILKSHAKE VANILIE MARE', 'DESERT', 'DA', '21', '10', '5', '', '', '', '', '', '',
   '12.00', '14.00', '12.50', '14.50', '', '', '', '', '', '', '13.00', '15.00'],
];

console.log('\n— A. Nomenclator —');
const n = parseNomenclator(NOM);
t('citește toate materiile prime', n.ingrediente.length === 3);
t('prețul e datat, nu doar o valoare',
  n.ingrediente[0].preturi[0].validDeLa === '2026-08-09' && n.ingrediente[0].preturi[0].pret === 2.792);
t('ambalajul e clasificat PACKAGING', n.ingrediente[1].tip === 'PACKAGING');
t('alimentul e clasificat FOOD', n.ingrediente[0].tip === 'FOOD');
t('UM de bază se normalizează', n.ingrediente[0].um === 'buc' && n.ingrediente[2].um === 'kg');
t('un preț 0 NU se stochează — lipsa e informație, zeroul ar fi minciună',
  n.ingrediente[2].preturi.length === 0);
t('… și se raportează explicit', n.probleme.some(p => p.ce === '697025' && p.detaliu.includes('necunoscut')));
t('o UM necunoscută oprește rândul, nu îl ghicește',
  parseNomenclator([...NOM.slice(0, 3), ['X1', 'X', 'Aliment', 'EA', 'galoane', '1', '2026-08-01']])
    .ingrediente.length === 0);

console.log('\n— B. Rețetar —');
const r = parseRetetar(RET, '2026-08-01');
t('grupează liniile pe produs', r.retete.length === 2);
t('păstrează toate liniile', r.retete.reduce((s, x) => s + x.versiuni[0].linii.length, 0) === 3);
t('„Denumire MP" NU devine denumirea rețetei — denumirea E produsul',
  r.retete.every(x => x.denumire === x.cod)
  && r.retete.some(x => x.denumire === 'DUBLU CHEESEBURGER'),
  'capcana pentru care există adaptorul ăsta');
t('… și nici codul materiei prime nu ajunge denumire',
  !r.retete.some(x => /^\d+$/.test(x.denumire)));
t('o UM necunoscută în REȚETAR oprește linia, nu o presupune „buc"',
  (() => {
    const x = parseRetetar([...RET.slice(0, 3), ['P', 'C', 'AMBELE', '700977', 'D', '1', 'galoane']], '2026-08-01');
    return x.retete.length === 0 && x.probleme.some(q => q.detaliu.includes('UM necunoscută'));
  })());
t('… iar liniile păstrate au toate o UM validă',
  r.retete.every(x => x.versiuni[0].linii.every(l => ['kg', 'l', 'buc', 'g', 'ml'].includes(l.um))));
t('canalul se citește pe linie', r.retete[0].versiuni[0].linii[1].canal === 'DELIVERY');
t('canalul lipsă înseamnă AMBELE, nu se ghicește altceva',
  r.retete[1].versiuni[0].linii[0].canal === 'AMBELE');
t('cantitatea „2." se citește ca 2', r.retete[0].versiuni[0].linii[0].cant === 2);
t('UM-urile de rețetar se păstrează (g, ml, buc)',
  r.retete[1].versiuni[0].linii[0].um === 'g');
t('versiunea e datată', r.retete[0].versiuni[0].data === '2026-08-01');
t('o cantitate necitibilă oprește linia, cu motiv',
  (() => {
    const x = parseRetetar([...RET.slice(0, 3), ['P', 'C', 'AMBELE', '700977', 'D', 'abc', 'buc']], '2026-08-01');
    return x.retete.length === 0 && x.probleme.some(p => p.detaliu.includes('Cantitate'));
  })());

console.log('\n— C. Prețuri: DOAR luna realizată —');
const p = parsePreturi(SIM, 'August');
t('citește produsele cu preț', p.produse.length === 2);
t('preia prețul InStore din AUGUST', p.produse[0].pretInstore === 17.99);
t('preia prețul Delivery din AUGUST', p.produse[0].pretDelivery === 19.99);
t('NU preia prețul de septembrie (plan)',
  p.produse[0].pretInstore !== 23.49 && p.produse[0].pretDelivery !== 26.49,
  'planul nu are ce căuta printre cifrele reale');
t('nici pe cel din iulie', p.produse[0].pretInstore !== 17.00);
t('cota de TVA se preia pe produs', p.produse[0].tva === 11 && p.produse[1].tva === 21);
t('prețurile stocate sunt BRUTE, cu TVA', p.produse[0].pretInstore === 17.99);
t('netul se calculează, nu se stochează',
  Math.abs((pretNet(p.produse[0], 'INSTORE') ?? 0) - 17.99 / 1.11) < 1e-9,
  `${pretNet(p.produse[0], 'INSTORE')?.toFixed(4)}`);
t('netul Delivery diferă de cel InStore',
  pretNet(p.produse[0], 'DELIVERY') !== pretNet(p.produse[0], 'INSTORE'));
t('TVA 21% dă alt net decât 11%',
  Math.abs((pretNet(p.produse[1], 'INSTORE') ?? 0) - 12.5 / 1.21) < 1e-9);
t('o lună inexistentă nu inventează prețuri',
  parsePreturi(SIM, 'Martie').produse.length === 0);
t('… și spune de ce', parsePreturi(SIM, 'Martie').probleme.some(x => x.detaliu.includes('Martie')));
t('un produs fără TVA nu intră — netul n-ar fi calculabil',
  (() => {
    const s = [...SIM]; s.push(['3', 'X', 'C', 'DA', '', '', '', '', '', '', '', '', '', '1', '1', '5', '6']);
    const x = parsePreturi(s, 'August');
    return !x.produse.some(q => q.cod === 'X') && x.probleme.some(q => q.ce === 'X');
  })());

console.log('\n— D. Registrul întreg: ce lipsește se declară —');
const d = importaDashboard({ nomenclator: NOM, retetar: RET, simulare: SIM }, 'August', '2026-08-01');
t('luna preluată e declarată', d.lunaPreturi === 'August');
t('produsul cu rețetă dar fără preț e numit', d.faraPret.includes('PRODUS FARA PRET'));
t('produsul cu preț dar fără rețetă e numit', d.faraReteta.includes('MILKSHAKE VANILIE MARE'));
t('NU se potrivește nimic după asemănare',
  !d.retete.some(x => /MILKSHAKE/.test(x.cod)),
  'maparea se dă explicit, nu se ghicește');
t('materiile prime orfane sunt raportate',
  (() => {
    const x = importaDashboard({
      nomenclator: NOM.slice(0, 4), retetar: RET, simulare: SIM,
    }, 'August', '2026-08-01');
    return x.probleme.some(q => q.ce === '700100' && q.detaliu.includes('absentă'));
  })());
t('pe date curate, singura problemă e prețul 0', d.probleme.length === 1);
t('importul e determinist',
  JSON.stringify(importaDashboard({ nomenclator: NOM, retetar: RET, simulare: SIM }, 'August', '2026-08-01'))
  === JSON.stringify(d));

console.log('\n— E. Citirea numerelor —');
t('zecimale cu punct', numar('2.7920') === 2.792);
t('separator de mii englezesc', numar('1,234.56') === 1234.56);
t('separator de mii românesc', numar('1.234,56') === 1234.56);
t('valoare în paranteze = negativ', numar('(38.00)') === -38);
t('procent', numar('11 %') === 11);
t('text necitibil → null', numar('abc') === null);
t('gol → null', numar('') === null);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
