// Audit de lansare — adaptorul raportului NBO 4.1 „Sales Journal" (PDF de rezumat pe fereastră).
//
// Contract:
//   · antetul pe două rânduri (restaurant) sau „All Stores Start Date / End Date" (rețea);
//   · Net Sales, Gross Sales și „Sales by Location" (net, bonuri, medie pe canal); Σ canale = Net Sales;
//   · regula de canal (decizie 06.09.2026): Take Out și Drive Thru → InStore; Delivery → Delivery;
//   · rândul de vânzări e datat pe prima zi a ferestrei; versiunea Import Center poartă fereastra,
//     cu granularitate INTERVAL (agregat), deci regula golurilor pe zile nu îl respinge;
//   · „All Stores" intră pe locația rezervată a rețelei, doar la nivel de companie, unde e numitorul autoritar.
import { esteRaport41, parseRaport41, parsatDin41, descrie41 } from '../src/lib/nbo-41';
import { importa } from '../src/lib/importer';
import { importaPrinCentru } from '../src/lib/import-center';
import { numitorFC } from '../src/lib/fc-core';
import { COMPANIE, LOCATIE_RETEA, perioadaDin, restaurant, type CerereFC } from '../src/lib/fc-domeniu';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

// fixturi: liniile reale ale celor două rapoarte
const TIMISOARA = [
  'FRYDAY TIMISOARA Fiscal Year: 2026', '4.1 Sales Journal', 'IULIUS TOWN Period: 8 Week: 4', '8/17/2026 - 8/23/2026',
  'Sales Cash Reconciliation',
  'Net Sales $189,606.42 Net Sales $189,606.42', 'Total Comps 25% $163.63 - Charge Deposits $89,060.48',
  'TVA 11% $18,733.16 Total TVA $22,765.53', 'TVA 21% $4,032.37 -Paid Outs', 'Total TVA $22,765.53 + Paid Ins $3,500.00',
  'Total Comps 100% $10.99 - Other Deposits $123,311.47', 'Refund Net', 'Comps - Staff Meals', 'Gross Sales $212,371.95',
  '= Cash Accountability ($69,598.91)', 'Discounts', 'Cash Deposit', 'Total Comps 25% $163.63',
  'Discount Glovo/Tazz $19,544.32 Cash Over (Short) $69,598.91', 'Total Discounts $19,555.31',
  'Other Amount Qty', 'Voids-Sales $2,630.71 201', 'Refund ($239.19) 4', 'Guest Check', 'Sales by Location Sales', 'Count Average',
  'Dine In Sales Net $109,893.88 2,041 $53.84', 'Take Out Net Sales $14,086.01 257 $54.81', 'Delivery Net Sales $65,626.53 796 $82.45',
  'Drive Thru Net Sales', 'Gross Sales $212,371.95 3,094',
  'V 21.1.126.0 - 91 - 8/24/2026 9:10 AM Copyright © NCR Corporation 2022 1 of 1',
].join('\n');
const ALL_STORES = [
  'All Stores Start Date: 06/15/2026', '4.1 Sales Journal', 'End Date: 06/21/2026', 'Sales Cash Reconciliation',
  'Net Sales $4,541,475.65 Net Sales $4,541,475.65', 'Total Comps 25% $5,384.66 - Charge Deposits $2,215,941.83',
  'Gross Sales $4,988,022.54', '= Cash Accountability ($1,449,960.65)', 'Guest Check', 'Sales by Location Sales', 'Count Average',
  'Dine In Sales Net $2,404,684.48 38,960 $61.72', 'Take Out Net Sales $555,570.85 8,864 $62.68',
  'Delivery Net Sales $1,319,135.23 15,754 $83.73', 'Drive Thru Net Sales $262,085.09 4,420 $59.30', 'Gross Sales $4,988,022.54 67,998',
  'V 21.1.126.0 - 91 - 06/23/2026 6:53 AM Copyright © NCR Corporation 2022 1 of 1',
].join('\n');

console.log('— 1. Raportul pe un restaurant —');
t('se recunoaște după titlu; 2.9 și 2.8 nu sunt 4.1', esteRaport41(TIMISOARA) && !esteRaport41('2.9 Food Cost - Inventory') && !esteRaport41('2.8 Spoilage and Loss'));
const T = parseRaport41(TIMISOARA);
t('restaurantul de pe două rânduri, eticheta de perioadă, fereastra săptămânii', T.restaurant === 'FRYDAY TIMISOARA IULIUS TOWN' && !T.agregat && T.perioadaEticheta === 'Period 8 Week: 4' && T.de === '2026-08-17' && T.la === '2026-08-23' && T.format === 'EN');
t('Net Sales, Gross Sales și numărul de bonuri', T.netSales === 189606.42 && T.grossSales === 212371.95 && T.bonuri === 3094);
t('canalele: net, bonuri, medie; Drive Thru tipărit fără sumă = 0', T.canale.DINE_IN.net === 109893.88 && T.canale.DINE_IN.bonuri === 2041 && T.canale.DINE_IN.mediu === 53.84
  && T.canale.TAKE_OUT.net === 14086.01 && T.canale.DELIVERY.net === 65626.53 && T.canale.DELIVERY.bonuri === 796 && T.canale.DRIVE_THRU.net === 0);
t('identitatea: Σ canale = Net Sales', T.verificare?.ok === true && aprox(T.verificare!.sumaCanale, 189606.42));
t('fără avertismente', T.avertismente.length === 0, T.avertismente.join(' | '));
const TR = parseRaport41(TIMISOARA.replace('Delivery Net Sales $65,626.53', 'Delivery Net Sales $65,000.00'));
t('o sumă pe canal care nu închide Net Sales e semnalată, nu ascunsă', TR.verificare?.ok === false && TR.avertismente.some(a => a.includes('≠ Net Sales')));
t('descrierea spune regula de canal și că e rezumat', descrie41(T).includes('Dine In + Take Out + Drive Thru') && descrie41(T).includes('rezumat pe fereastră'));

console.log('\n— 2. Parsat-ul pentru SALES: InStore = Dine In + Take Out + Drive Thru, datat pe prima zi —');
const P = parsatDin41(T);
const inst = P.randuri.find(r => r.Canal === 'INSTORE')!, dlv = P.randuri.find(r => r.Canal === 'DELIVERY')!;
t('două rânduri, pe restaurantul din antet, datate 2026-08-17, cu fereastra 17–23', P.randuri.length === 2 && P.randuri.every(r => r.Data === '2026-08-17' && r.Locatie === 'FRYDAY TIMISOARA IULIUS TOWN') && P.fereastra?.de === '2026-08-17' && P.fereastra?.la === '2026-08-23');
t('InStore = 109.893,88 + 14.086,01 + 0 = 123.979,89, 2.298 bonuri', aprox(inst['Vanzari nete'] as number, 123979.89) && inst['Nr bonuri'] === 2298);
t('Delivery = 65.626,53, 796 bonuri', aprox(dlv['Vanzari nete'] as number, 65626.53) && dlv['Nr bonuri'] === 796);
t('MUTAȚIE „Take Out la Delivery": InStore + Delivery = Net Sales și Delivery e doar Delivery', aprox((inst['Vanzari nete'] as number) + (dlv['Vanzari nete'] as number), 189606.42) && (dlv['Vanzari nete'] as number) === 65626.53);

console.log('\n— 3. Importul: pe codul restaurantului, versiune cu fereastra, numitorul —');
const BAZA: AppState = { ...stareGoala(), locatii: [{ cod: 'L02', nume: 'FRYDAY TIMISOARA IULIUS TOWN' }, { cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }] };
const ACUM = (h: number) => `2026-09-06T${String(h).padStart(2, '0')}:00:00.000Z`;
const c1 = importaPrinCentru(BAZA, { fisier: '4.1_Sales_Journal.pdf', parsat: P, tip: 'NBO_41', interval: { de: T.de!, la: T.la! }, acum: ACUM(10) });
const v1 = (c1.stareNoua.versiuniImport ?? []).find(v => v.tip === 'NBO_41')!;
t('versiune NBO_41 activată pe restaurantul L02, cu fereastra săptămânii și granularitate INTERVAL (agregat)', c1.rezultat.activat && v1.scop === 'RESTAURANT' && v1.restaurante.join() === 'L02' && v1.intervalDe === '2026-08-17' && v1.intervalLa === '2026-08-23' && v1.granularitate === 'INTERVAL', `${c1.rezultat.erori.join(' | ')} ${v1?.granularitate}`);
t('rândurile de Sales Report stau pe codul L02, nu pe nume', c1.stareNoua.salesReport.length === 2 && c1.stareNoua.salesReport.every(r => r.locatie === 'L02' && r.data === '2026-08-17') && c1.stareNoua.locatii.length === 2);
const SAPT: CerereFC = { perioada: perioadaDin('2026-08-17', 'SAPTAMANA'), nivel: restaurant('L02'), canal: 'TOTAL' };
const nS = numitorFC(c1.stareNoua, SAPT, 1);
t('numitorul săptămânii 17–23 pe L02 = 189.606,42 din Sales Report (regula golurilor nu se aplică agregatului)', nS.sursa === 'Sales Report' && aprox(nS.net, 189606.42), `${nS.sursa} ${nS.net} ${nS.nota}`);
const nI = numitorFC(c1.stareNoua, { ...SAPT, canal: 'INSTORE' }, 1);
t('pe canalul InStore: 123.979,89', nI.sursa === 'Sales Report' && aprox(nI.net, 123979.89));
const nL = numitorFC(c1.stareNoua, { perioada: perioadaDin('2026-08-15', 'LUNA'), nivel: restaurant('L02'), canal: 'TOTAL' }, 1);
t('luna care conține săptămâna primește aceeași sumă (o singură săptămână importată)', nL.sursa === 'Sales Report' && aprox(nL.net, 189606.42));
const nAlt = numitorFC(c1.stareNoua, { ...SAPT, nivel: restaurant('L01') }, 777);
t('alt restaurant nu vede vânzările Timișoarei: cade pe PMIX', nAlt.sursa === 'PMIX' && nAlt.net === 777);
const c2 = importaPrinCentru(c1.stareNoua, { fisier: '4.1_Sales_Journal.pdf', parsat: P, tip: 'NBO_41', interval: { de: T.de!, la: T.la! }, acum: ACUM(11) });
t('reimportul identic e duplicat, fără rânduri în plus', !c2.rezultat.activat && c2.stareNoua.salesReport.length === 2);

console.log('\n— 4. Raportul de rețea („All Stores") —');
const A = parseRaport41(ALL_STORES);
t('agregat, fără restaurant, fereastra 15–21.06 din Start/End Date', A.agregat && A.restaurant === null && A.de === '2026-06-15' && A.la === '2026-06-21');
t('Σ canale = Net Sales 4.541.475,65; Drive Thru 262.085,09 citit', A.verificare?.ok === true && A.canale.DRIVE_THRU.net === 262085.09 && A.bonuri === 67998);
t('avertisment de rețea, nu eroare de restaurant lipsă', A.avertismente.some(a => a.includes('All Stores')) && !A.avertismente.some(a => a.includes('nu declară restaurantul')));
const PA = parsatDin41(A);
t('rândurile intră pe locația rezervată a rețelei; InStore = Dine In + Take Out + Drive Thru', PA.randuri.every(r => r.Locatie === LOCATIE_RETEA) && aprox(PA.randuri.find(r => r.Canal === 'INSTORE')!['Vanzari nete'] as number, 2404684.48 + 555570.85 + 262085.09));
const cA = importaPrinCentru(c1.stareNoua, { fisier: '4.1_All_Stores.pdf', parsat: PA, tip: 'NBO_41', interval: { de: A.de!, la: A.la! }, acum: ACUM(12) });
const vA = (cA.stareNoua.versiuniImport ?? []).find(v => v.fisier === '4.1_All_Stores.pdf')!;
t('versiunea de rețea e la nivel de companie, fără restaurant, fără locație creată', cA.rezultat.activat && vA.scop === 'COMPANIE' && vA.restaurante.length === 0 && !cA.stareNoua.locatii.some(l => l.cod === LOCATIE_RETEA), `${cA.rezultat.erori.join(' | ')} ${vA?.scop}`);
const IUN: CerereFC = { perioada: perioadaDin('2026-06-15', 'SAPTAMANA'), nivel: COMPANIE, canal: 'TOTAL' };
t('numitorul companiei pe 15–21.06 = totalul de rețea', aprox(numitorFC(cA.stareNoua, IUN, 1).net, 4541475.65));
t('la nivel de restaurant, rândurile rețelei nu se văd', numitorFC(cA.stareNoua, { ...IUN, nivel: restaurant('L02') }, 5).sursa === 'PMIX');
// și rânduri pe restaurant în aceeași săptămână: totalul de rețea rămâne autoritar, nu se adună peste el
const cuRest = importa('SALES', { foaie: 'x', antete: ['Data', 'Locatie', 'Canal', 'Vanzari nete'], randuri: [{ Data: '2026-06-15', Locatie: 'L02', Canal: 'INSTORE', 'Vanzari nete': 1000 }] }, 'sales L02.xlsx', cA.stareNoua).stateNou;
const nC = numitorFC(cuRest, IUN, 1);
t('cu rânduri pe restaurant în aceeași perioadă: numitorul companiei rămâne 4.541.475,65 (MUTAȚIA „se adună" ar da 4.542.475,65)', aprox(nC.net, 4541475.65) && nC.nota.includes('All Stores'));
t('restaurantul își vede doar rândul lui', aprox(numitorFC(cuRest, { ...IUN, nivel: restaurant('L02') }, 1).net, 1000));
t('fără rânduri de rețea, compania e Σ restaurante, ca înainte', aprox(numitorFC({ ...cuRest, salesReport: cuRest.salesReport.filter(r => r.locatie !== LOCATIE_RETEA) }, IUN, 1).net, 1000));

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
process.exit(fail ? 1 : 0);
