import { liniiDinItems } from '../src/lib/pdf';
import { matriceDinText, parseSalesMix } from '../src/lib/salesmix';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const it = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y] });

console.log('— Reconstrucția liniilor din fragmente poziționate —');
// fragmentele vin amestecate; aceeași linie are Y aproape egal (zecimale de poziționare)
const items = [
  it('Menu Item Name', 40, 700.2), it('Qty', 300, 700), it('Price', 360, 699.8), it('Extension', 430, 700.1),
  it('CATEGORY BURGER*', 40, 685),
  it('HAMBURGER new', 40, 670), it('5,328', 300, 670), it('10.000', 360, 670), it('$53,280.00', 430, 670),
  it('DUBLU BLACK TRUFFLE SMASHED', 40, 655), it('3,397', 300, 655), it('28.000', 360, 655), it('$95,116.00', 430, 655),
  it('new', 40, 641),
  it('DUBLU SMASHED BURGER new D', 40, 627), it('2,552', 300, 627), it('43.570', 360, 627), it('$111,190.', 430, 627),
  it('64', 40, 613),
  it('TRIPLU RED PEPPER SMASHED new', 40, 599), it('-1', 300, 599), it('38.000', 360, 599), it('($38.00)', 430, 599),
];
const linii = liniiDinItems(items);
t('8 linii vizuale reconstruite', linii.length === 8, `${linii.length}`);
t('fragmentele cu Y ușor diferit stau pe aceeași linie', linii[0] === 'Menu Item Name Qty Price Extension', linii[0]);
t('ordinea X e respectată în linie', linii[2] === 'HAMBURGER new 5,328 10.000 $53,280.00', linii[2]);
t('liniile sunt în ordinea de sus în jos', linii[1] === 'CATEGORY BURGER*');
t('fragmentele goale sunt ignorate', !linii.some(l => l === ''));

console.log('— Pipeline complet: linii PDF → matrice → parser —');
const sm = parseSalesMix(matriceDinText(linii.join('\n')));
t('4 linii de vânzare', sm.linii.length === 4, `${sm.linii.length}`);
t('sufixul de pe linia următoare merge la produsul anterior',
  sm.linii.some(l => l.numeBaza === 'DUBLU BLACK TRUFFLE SMASHED' && l.canal === 'INSTORE'));
t('valoarea ruptă pe două linii e reunită', sm.linii.some(l => Math.abs(l.ext - 111190.64) < 0.01));
t('valoarea negativă în paranteze e citită', sm.linii.some(l => l.qty === -1 && Math.abs(l.ext + 38) < 0.01));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
