/**
 * Raportul 4.7 citit din grilă (PDF sau exportul Excel al NCR) prin poarta unică de import —
 * calea ecranului Importuri („Importă automat tot") și a Import Center-ului.
 * Grila nu are antete: coloanele obligatorii și restaurantul se verifică pe conținut,
 * nu pe antete; altfel importul cădea cu „coloane lipsă" și „raport fără restaurant".
 * Reprodus în proba pilotului (07.09.2026): 4.7 Timișoara → 0 vânzări, locație necreată.
 */
import { stareGoala } from '../src/lib/seed';
import { matriceDinText } from '../src/lib/salesmix';
import { importaUnificat, pregatesteImport, activeazaImport } from '../src/lib/import-center';
import { LOCATIE_RETEA } from '../src/lib/fc-domeniu';
import type { AppState } from '../src/lib/types';
import type { Parsat } from '../src/lib/importer';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const TEXT = [
  'FRYDAY TIMISOARA Fiscal Year: 2026', '4.7 Sales Mix', 'IULIUS TOWN Period: 8 Week: 4', '8/17/2026 - 8/23/2026', 'Menu Item Name Qty Price Extension',
  'CATEGORY BERE', 'Bere Corona new 1 15.990 $15.99', 'Bere Corona new D 1 19.990 $19.99', 'Budweiser new 2 18.990 $37.98', 'Total BERE 4 $73.96', 'Total 4 $73.96',
  'V 21.1.126.0 - 1 - 8/24/2026 9:12 AM Copyright © NCR Corporation 2022 1 of 1',
].join('\n');
const TEXT_MULTI = [
  'Multiple Selection Fiscal Year: 2026', '4.7 Sales Mix', 'Period: 8 Week: 4', '8/17/2026 - 8/23/2026', 'Menu Item Name Qty Price Extension',
  'CATEGORY BERE', 'Bere Corona new 132 15.990 $2,110.68', 'Total BERE 132 $2,110.68', 'Total 132 $2,110.68',
  'Groups/Stores Selected for this Report', 'FRYDAY TIMISOARA IULIUS TOWN, FRYDAY CLUJ MEMO',
].join('\n');
const grila = (text: string): Parsat => ({ foaie: 'PDF', antete: [], randuri: [], matrice: matriceDinText(text) } as Parsat);
const produse: AppState['produse'] = [
  { cod: 'CORONA', denumire: 'Bere Corona', categorie: 'BERE', tip: 'SIMPLU', tva: 11, pretInstore: 15.99, activ: true, aliasuri: ['Bere Corona'] },
];
const ACUM = '2026-09-07T10:00:00.000Z';

console.log('— Calea ecranului Importuri: importaUnificat cu grila 4.7 —');
const cuL02: AppState = { ...stareGoala(), locatii: [{ cod: 'L02', nume: 'FRYDAY TIMISOARA IULIUS TOWN' }], produse };
const r1 = importaUnificat(cuL02, { fisier: '4.7__Sales_Mix_10002_134.pdf', parsat: grila(TEXT), intern: 'SALES_MIX', mapare: {}, acum: ACUM });
t('importul reușește', r1.batch.status === 'IMPORTAT', `${r1.batch.status} ${JSON.stringify(r1.rezultat?.diagnostice.filter(d => d.nivel === 'BLOCANT').map(d => d.cod))}`);
t('fără diagnostic de coloane lipsă sau restaurant lipsă', !r1.rezultat?.diagnostice.some(d => d.nivel === 'BLOCANT'));
t('versiunea e PMIX 4.7, pe restaurantul L02', r1.rezultat?.tip === 'PMIX_47' && r1.rezultat?.scop === 'RESTAURANT' && r1.rezultat?.restaurante.join() === 'L02', `${r1.rezultat?.tip} ${r1.rezultat?.scop} ${r1.rezultat?.restaurante}`);
t('fereastra versiunii e cea din antetul grilei', r1.rezultat?.intervalDe === '2026-08-17' && r1.rezultat?.intervalLa === '2026-08-23');
t('vânzările produsului cunoscut intră pe L02, pe ambele canale', r1.stareNoua.vanzari.length === 2 && r1.stareNoua.vanzari.every(v => v.locatie === 'L02' && v.produs === 'CORONA'), JSON.stringify(r1.stareNoua.vanzari.map(v => [v.locatie, v.canal, v.cant])));
t('produsul necunoscut (Budweiser) merge în coada de aprobare, nu în vânzări', r1.stareNoua.nemapate.some(n => n.denumire === 'Budweiser') && !r1.stareNoua.vanzari.some(v => v.produs === 'Budweiser'));
t('nu se creează o a doua locație', r1.stareNoua.locatii.length === 1);

console.log('— Restaurantul nou: numele din antet devine locație —');
const gol: AppState = { ...stareGoala(), produse };
const r2 = importaUnificat(gol, { fisier: '4.7__Sales_Mix_10002_134.pdf', parsat: grila(TEXT), intern: 'SALES_MIX', mapare: {}, acum: ACUM });
t('importul reușește și pe aplicația goală', r2.batch.status === 'IMPORTAT', r2.batch.status);
t('versiunea poartă numele exact din antet', r2.rezultat?.restaurante.join() === 'FRYDAY TIMISOARA IULIUS TOWN');
t('locația e creată cu numele exact', r2.stareNoua.locatii.some(l => l.nume === 'FRYDAY TIMISOARA IULIUS TOWN') && r2.stareNoua.vanzari.every(v => v.locatie === 'FRYDAY TIMISOARA IULIUS TOWN'));

console.log('— Restaurantul declarat de om bate deducția —');
const r3 = importaUnificat(cuL02, { fisier: 'sales mix.pdf', parsat: grila(TEXT), intern: 'SALES_MIX', mapare: {}, locatie: 'L02', acum: ACUM });
t('declarat L02 → restaurantul versiunii e L02', r3.batch.status === 'IMPORTAT' && r3.rezultat?.restaurante.join() === 'L02');

console.log('— Raportul pe mai multe unități intră la nivel de companie, pe locația rețelei —');
const r4 = importaUnificat(cuL02, { fisier: '4.7__Sales_Mix_multi.pdf', parsat: grila(TEXT_MULTI), intern: 'SALES_MIX', mapare: {}, acum: ACUM });
t('importul reușește', r4.batch.status === 'IMPORTAT', `${r4.batch.status} ${JSON.stringify(r4.rezultat?.diagnostice.filter(d => d.nivel === 'BLOCANT').map(d => d.cod))}`);
t('scop COMPANIE, fără restaurant', r4.rezultat?.scop === 'COMPANIE' && r4.rezultat?.restaurante.length === 0);
t('rândurile stau pe locația rezervată a rețelei, care nu intră în nomenclator', r4.stareNoua.vanzari.every(v => v.locatie === LOCATIE_RETEA) && !r4.stareNoua.locatii.some(l => l.cod === LOCATIE_RETEA));

console.log('— Un restaurant neidentificat în Store Master rămâne refuzat fără declarație —');
const TEXT_NECUNOSCUT = TEXT.replace('FRYDAY TIMISOARA Fiscal Year: 2026', 'FRYDAY NECUNOSCUT Fiscal Year: 2026').replace('IULIUS TOWN Period: 8 Week: 4', 'Period: 8 Week: 4');
const r8 = importaUnificat(cuL02, { fisier: '4.7 necunoscut.pdf', parsat: grila(TEXT_NECUNOSCUT), intern: 'SALES_MIX', mapare: {}, acum: ACUM });
t('refuzat cu LOCATIE_LIPSA blocant, nimic scris', r8.batch.status !== 'IMPORTAT' && !!r8.rezultat?.diagnostice.some(d => d.cod === 'LOCATIE_LIPSA' && d.nivel === 'BLOCANT') && r8.stareNoua.vanzari.length === 0, `${r8.batch.status}`);
const r9 = importaUnificat(cuL02, { fisier: '4.7 necunoscut.pdf', parsat: grila(TEXT_NECUNOSCUT), intern: 'SALES_MIX', mapare: {}, locatie: 'L02', acum: ACUM });
t('cu restaurantul declarat, același fișier intră pe L02', r9.batch.status === 'IMPORTAT' && r9.stareNoua.vanzari.every(v => v.locatie === 'L02'));

console.log('— Calea Import Center: tipul PMIX_47 pe o grilă fără antete —');
const p5 = pregatesteImport(cuL02, { fisier: 'Sales Mix 4.7.xlsx', parsat: grila(TEXT), tip: 'PMIX_47', acum: ACUM });
t('grila e recunoscută ca varianta SALES_MIX, nu respinsă ca „structură străină"', p5.rezultat.stare === 'VALIDAT', `${p5.rezultat.stare} ${p5.rezultat.erori.join('; ')}`);
const a5 = activeazaImport(cuL02, p5);
t('activarea scrie vânzările pe L02', a5.rezultat.activat && a5.stareNoua.vanzari.length === 2);

console.log('— O grilă fără linii de vânzare e respinsă cu diagnostic, nu importată goală —');
const p6 = pregatesteImport(cuL02, { fisier: '4.7 gol.pdf', parsat: grila(['FRYDAY TIMISOARA Fiscal Year: 2026', '4.7 Sales Mix', 'Menu Item Name Qty Price Extension'].join('\n')), tip: 'PMIX_47', internPreferat: 'SALES_MIX', acum: ACUM });
t('respins, cu COLOANE_LIPSA pe „linii de vânzare"', p6.rezultat.stare !== 'VALIDAT' && p6.rezultat.diagnostice.some(d => d.cod === 'COLOANE_LIPSA' && d.nivel === 'BLOCANT'), p6.rezultat.stare);

console.log('— Reimportul aceleiași grile e duplicat —');
const r7 = importaUnificat(r1.stareNoua, { fisier: '4.7__Sales_Mix_10002_134.pdf', parsat: grila(TEXT), intern: 'SALES_MIX', mapare: {}, acum: '2026-09-07T11:00:00.000Z' });
t('a doua oară nu se dublează nimic', r7.rezultat?.stare === 'DUPLICAT' && r7.stareNoua.vanzari.length === 2, r7.rezultat?.stare);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
