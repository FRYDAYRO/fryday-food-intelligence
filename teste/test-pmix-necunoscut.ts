// Un cod PMIX fără produs în nomenclator nu are voie să dispară tăcut.
//
// Înainte: rândul era ignorat, banii ieșeau din raport fără urmă, acoperirea putea rămâne
// 100% (fiindcă rândul nici nu intra în numitor) și coada de aprobare rămânea goală — deci
// omul n-avea de unde afla, și cu atât mai puțin de unde repara.
//
// Identitatea centrală verificată aici:
//     Σ buc din fișier = Σ buc importate + Σ buc în coada de aprobare
//     Σ lei din fișier = Σ lei importate + Σ lei în coada de aprobare
// Nimic nu se pierde între raportul original și ce a intrat în aplicație.
import { importa, type Parsat } from '../src/lib/importer';
import { coadaAprobare } from '../src/lib/aprobare';
import { reconciliaza } from '../src/lib/reconciliere';
import { buildCtx } from '../src/lib/engine';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const P = (antete: string[], randuri: Record<string, unknown>[]): Parsat => ({ antete, randuri, foaie: 'S1' });

const baza = (): AppState => ({
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'Test' }],
  ingrediente: [{ cod: 'I1', denumire: 'Piept', categorie: 'Carne', tip: 'FOOD', um: 'kg',
    preturi: [{ validDeLa: '2026-01-01', pret: 20 }], activ: true }],
  produse: [
    { cod: 'P1', denumire: 'Burger', categorie: 'Burgeri', tip: 'SIMPLU', pretInstore: 11.9, pretDelivery: 11.9, tva: 19, activ: true },
    { cod: 'MS-1', denumire: 'Milkshake Mango', categorie: 'Milkshake', tip: 'SIMPLU', pretInstore: 11.9, pretDelivery: 11.9, tva: 19, activ: true },
  ],
  retete: [{ cod: 'P1', tip: 'PRODUS', denumire: 'Burger', activa: 1,
    versiuni: [{ nr: 1, data: '2026-01-01', linii: [{ comp: 'I1', tipComp: 'INGREDIENT', cant: 0.1, um: 'kg', canal: 'AMBELE' }] }] }],
});

//  cunoscut:   P1    100 buc, 1190 lei
//  necunoscut: XX-99  10 buc,  150 lei   ← rândul care dispărea
//  necunoscut: XX-99   5 buc,   75 lei   ← al doilea rând, ACELAȘI cod: se cumulează
//  necunoscut: YY-11   2 buc,   40 lei
const FISIER = P(['Data', 'Locatie', 'Cod produs', 'Denumire', 'Cantitate', 'Valoare neta', 'Canal'], [
  { Data: '2026-08-05', Locatie: 'L01', 'Cod produs': 'P1', Denumire: 'Burger', Cantitate: 100, 'Valoare neta': 1190, Canal: 'INSTORE' },
  { Data: '2026-08-05', Locatie: 'L01', 'Cod produs': 'XX-99', Denumire: 'Milkshake Mango', Cantitate: 10, 'Valoare neta': 150, Canal: 'INSTORE' },
  { Data: '2026-08-06', Locatie: 'L01', 'Cod produs': 'XX-99', Denumire: 'Milkshake Mango', Cantitate: 5, 'Valoare neta': 75, Canal: 'INSTORE' },
  { Data: '2026-08-06', Locatie: 'L01', 'Cod produs': 'YY-11', Denumire: 'Ceva Nou', Cantitate: 2, 'Valoare neta': 40, Canal: 'INSTORE' },
]);
const TOTAL_BUC = 117, TOTAL_LEI = 1455;

console.log('— 1. Rândul necunoscut NU se mai pierde —');
const r = importa('PMIX', FISIER, '4.7 august.xlsx', baza());
const s = r.stateNou;
t('importul reușește (un cod necunoscut nu strică fișierul)', r.batch.status === 'IMPORTAT', r.batch.status);
t('rândul cunoscut a intrat', s.vanzari.length === 1 && s.vanzari[0].produs === 'P1');
t('coada de aprobare are DOUĂ coduri, nu trei rânduri', s.nemapate.length === 2,
  s.nemapate.map(n => n.denumire).join(', '));
const xx = s.nemapate.find(n => n.denumire === 'XX-99');
t('XX-99 e în coadă', !!xx);
t('… cu bucățile CUMULATE din ambele rânduri: 15', xx?.cant === 15, `${xx?.cant}`);
t('… cu leii cumulați: 225', aprox(xx?.valoare ?? -1, 225), `${xx?.valoare}`);
t('… cu numele din fișier, ca omul să recunoască rândul', xx?.categorie === 'Milkshake Mango', xx?.categorie);
t('… cu sursa declarată', xx?.sursa === 'PMIX', `${xx?.sursa}`);
t('… și cu fișierul din care vine', xx?.fisier === '4.7 august.xlsx');
t('coada e ordonată după impactul în lei', s.nemapate[0].valoare >= s.nemapate[1].valoare,
  s.nemapate.map(n => `${n.denumire}=${n.valoare}`).join(' '));

console.log('\n— 2. Reconcilierea totalurilor: nimic nu dispare —');
const bucImportate = s.vanzari.reduce((a, v) => a + v.cant, 0);
const leiImportati = s.vanzari.reduce((a, v) => a + v.net, 0);
const bucCoada = s.nemapate.reduce((a, n) => a + n.cant, 0);
const leiCoada = s.nemapate.reduce((a, n) => a + n.valoare, 0);
t('Σ buc fișier = Σ buc importate + Σ buc în coadă',
  bucImportate + bucCoada === TOTAL_BUC, `${bucImportate} + ${bucCoada} = ${TOTAL_BUC}`);
t('Σ lei fișier = Σ lei importați + Σ lei în coadă',
  aprox(leiImportati + leiCoada, TOTAL_LEI), `${leiImportati} + ${leiCoada} = ${TOTAL_LEI}`);
t('… deci nimic nu se pierde între raport și aplicație', bucCoada === 17 && aprox(leiCoada, 265),
  `${bucCoada} buc, ${leiCoada} lei nemapați`);

console.log('\n— 3. Utilizatorul AFLĂ, nu ghicește —');
const av = r.batch.avertismente.join(' | ');
t('avertismentul numără codurile', /2 coduri fără produs/.test(av), av.slice(0, 90));
t('… și spune bucățile și leii', /17 buc/.test(av) && /265 lei/.test(av));
t('… și spune limpede că nu intră în calcul', /NU intră în calcul/.test(av));
// motorul spune doar faptul (nu intră în calcul); DACĂ au ajuns în coadă decide activarea,
// unde e sigur — vezi test-f2-coada-supravietuieste.ts
t('… și NU promite ce nu decide el (coada e treaba activării)', !/coada de aprobare/.test(av));
t('fiecare cod e numit separat, cu numele lui', /cod „XX-99" \(Milkshake Mango\)/.test(av));
t('coada de aprobare chiar le vede', coadaAprobare(s).length === 2, `${coadaAprobare(s).length}`);

console.log('\n— 4. Acoperirea nu mai minte —');
const rec = reconciliaza(s, buildCtx(s), '2026-08');
t('acoperirea rețetarului e 100% pe ce A INTRAT', rec.acoperire === 100, `${rec.acoperire}`);
t('dar cei 265 lei rămân vizibili în coadă, nu evaporați', leiCoada > 0);

console.log('\n— 5. Aprobarea închide bucla —');
// exact ce face `atribuieAlias` din store: codul devine alias pe produsul ales
const dupaAprobare: AppState = {
  ...s,
  produse: s.produse.map(p => p.cod !== 'MS-1' ? p : { ...p, aliasuri: [...(p.aliasuri ?? []), 'XX-99'] }),
  nemapate: s.nemapate.filter(n => n.denumire !== 'XX-99'),
};
const r2 = importa('PMIX', FISIER, '4.7 august.xlsx', dupaAprobare);
const s2 = r2.stateNou;
t('la REIMPORT codul aprobat se potrivește singur',
  s2.vanzari.some(v => v.produs === 'MS-1'), s2.vanzari.map(v => v.produs).join(','));
t('… cu bucățile corecte: 15', aprox(s2.vanzari.filter(v => v.produs === 'MS-1').reduce((a, v) => a + v.cant, 0), 15));
t('… iar XX-99 NU mai reapare în coadă', !s2.nemapate.some(n => n.denumire === 'XX-99'),
  s2.nemapate.map(n => n.denumire).join(','));
t('… dar YY-11, încă neaprobat, rămâne', s2.nemapate.some(n => n.denumire === 'YY-11'));
t('coada nu se reumple la nesfârșit cu ce s-a rezolvat', s2.nemapate.length === 1, `${s2.nemapate.length}`);

console.log('\n— 6. Nicio potrivire ghicită —');
const APROAPE = P(['Data', 'Locatie', 'Cod produs', 'Denumire', 'Cantitate', 'Valoare neta', 'Canal'], [
  { Data: '2026-08-05', Locatie: 'L01', 'Cod produs': 'MS-2', Denumire: 'Milkshake Mango', Cantitate: 3, 'Valoare neta': 45, Canal: 'INSTORE' },
]);
const rg = importa('PMIX', APROAPE, 'x.xlsx', baza());
t('un cod diferit cu ACELAȘI nume NU se leagă automat',
  !rg.stateNou.vanzari.some(v => v.produs === 'MS-1'), rg.stateNou.vanzari.map(v => v.produs).join(','));
t('… ci ajunge în coadă, pentru decizia omului',
  rg.stateNou.nemapate.some(n => n.denumire === 'MS-2'));

console.log('\n— 7. Cazuri de margine —');
const FARA_VAL = P(['Data', 'Locatie', 'Cod produs', 'Cantitate', 'Canal'], [
  { Data: '2026-08-05', Locatie: 'L01', 'Cod produs': 'ZZ-1', Cantitate: 4, Canal: 'INSTORE' },
]);
const rv = importa('PMIX', FARA_VAL, 'y.xlsx', baza());
t('fără coloană de valoare, codul tot ajunge în coadă',
  rv.stateNou.nemapate.some(n => n.denumire === 'ZZ-1'));
t('… cu bucățile păstrate', rv.stateNou.nemapate.find(n => n.denumire === 'ZZ-1')?.cant === 4);
t('… și cu valoarea 0, nu inventată', rv.stateNou.nemapate.find(n => n.denumire === 'ZZ-1')?.valoare === 0);
const rTot = importa('PMIX', FISIER, 'z.xlsx', { ...baza(), produse: [] });
t('când NIMIC nu se potrivește, tot fișierul e în coadă, nu pierdut',
  rTot.stateNou.nemapate.reduce((a, n) => a + n.cant, 0) === TOTAL_BUC,
  `${rTot.stateNou.nemapate.reduce((a, n) => a + n.cant, 0)} buc`);
t('… iar valorile se păstrează integral',
  aprox(rTot.stateNou.nemapate.reduce((a, n) => a + n.valoare, 0), TOTAL_LEI));

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
