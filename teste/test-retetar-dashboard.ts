/**
 * Foile NOMENCLATOR și REȚETAR ale dashboardului FRYDAY, importate SEPARAT, ca în pilot:
 *   · antetul e pe rândul 3 (două rânduri de titlu deasupra) și trebuie găsit;
 *   · coloanele „Produs | Categorie | Canal | Cod MP | Denumire MP | Cantitate | UM" se mapează corect
 *     (rețeta = Produs, componenta = Cod MP; „Denumire MP" NU devine denumirea rețetei);
 *   · rândurile „TOTAL REȚETĂ" nu produc linii; produsele lipsă se creează din rețetar;
 *   · identitate independentă de implementare: costul calculat de motor din nomenclator
 *     = Σ (cantitate × preț/UM bază) al foii = „TOTAL REȚETĂ" tipărit în foaie.
 * Fișierul e cel real, din rădăcina depozitului.
 */
import * as XLSX from 'xlsx';
import { mapeazaAntete, importa, type Parsat } from '../src/lib/importer';
import { gasesteAntet } from '../src/lib/auto';
import { importaUnificat } from '../src/lib/import-center';
import { stareGoala } from '../src/lib/seed';
import { buildCtx, costProdus } from '../src/lib/engine';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const val = (v: unknown) => String(v ?? '').trim();

console.log('— Maparea coloanelor foii REȚETAR —');
const anteteRetetar = ['Produs', 'Categorie', 'Canal', 'Cod MP', 'Denumire MP', 'Cantitate', 'UM', 'Preț unitar', 'Cost linie', 'TOTAL InStore', 'TOTAL Delivery'];
const m = mapeazaAntete(anteteRetetar, 'RETETAR');
t('rețeta = Produs', m.reteta === 'Produs', m.reteta);
t('componenta = Cod MP', m.comp === 'Cod MP', m.comp);
t('„Denumire MP" nu e denumirea rețetei', m.denumire === undefined && m.denumireComp === 'Denumire MP', `${m.denumire} / ${m.denumireComp}`);
t('categoria, cantitatea, UM și canalul mapate', m.categorie === 'Categorie' && m.cant === 'Cantitate' && m.um === 'UM' && m.canal === 'Canal');
t('coloanele de bani nu sunt mapate', !Object.values(m).some(a => /pre|cost|total/i.test(a)), JSON.stringify(m));
const mVechi = mapeazaAntete(['Cod reteta', 'Denumire reteta', 'Cod componenta', 'Cantitate', 'UM', 'Canal'], 'RETETAR');
t('formatul vechi rămâne mapat la fel', mVechi.reteta === 'Cod reteta' && mVechi.comp === 'Cod componenta' && mVechi.denumire === 'Denumire reteta');

console.log('— Fișierul real: foile NOMENCLATOR și REȚETAR, separat —');
const wb = XLSX.readFile('FRYDAY-DASHBOARD-fc update (1).xlsx', { cellDates: true });
const foaie = (nume: string): { parsat: Parsat; matrice: unknown[][] } => {
  const ws = wb.Sheets[nume];
  const matrice = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
  const h = gasesteAntet(matrice);
  const randuri = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', range: h });
  return { matrice, parsat: { foaie: nume, antete: Object.keys(randuri[0] ?? {}), randuri, matrice } as Parsat };
};
const nom = foaie('NOMENCLATOR'), ret = foaie('RETETAR');
t('antetul NOMENCLATOR e pe rândul 3', gasesteAntet(nom.matrice) === 2);
t('antetul REȚETAR e pe rândul 3', gasesteAntet(ret.matrice) === 2);
t('antetele foii REȚETAR sunt cele așteptate', JSON.stringify(ret.parsat.antete) === JSON.stringify(anteteRetetar), JSON.stringify(ret.parsat.antete));

let s: AppState = { ...stareGoala(), locatii: [{ cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }] };
const iN = importaUnificat(s, { fisier: 'NOMENCLATOR-FRYDAY.xlsx', parsat: nom.parsat, intern: 'COST_INGREDIENTE',
  mapare: mapeazaAntete(nom.parsat.antete, 'COST_INGREDIENTE'), optiuni: { dataValabil: '2026-08-01' } });
s = iN.stareNoua;
const nrNom = nom.parsat.randuri.filter(r => val(r['Cod NBO']) !== '').length;
t('nomenclatorul intră integral', iN.batch.status === 'IMPORTAT' && iN.batch.importate === nrNom, `${iN.batch.importate}/${nrNom}`);
t('fiecare ingredient are preț datat', s.ingrediente.length === nrNom && s.ingrediente.every(i => i.preturi.length === 1));
const codNom = new Set(s.ingrediente.map(i => i.cod));

const iR = importaUnificat(s, { fisier: 'RETETAR-FRYDAY.xlsx', parsat: ret.parsat, intern: 'RETETAR',
  mapare: mapeazaAntete(ret.parsat.antete, 'RETETAR'), optiuni: { dataValabil: '2026-08-01' } });
s = iR.stareNoua;
const liniiFoaie = ret.parsat.randuri.filter(r => val(r['Cod MP']) !== '');
const produseFoaie = [...new Set(liniiFoaie.map(r => val(r['Produs'])))];
const necunoscute = liniiFoaie.filter(r => !codNom.has(val(r['Cod MP'])));
t('rețetarul intră', iR.batch.status === 'IMPORTAT', iR.batch.erori.join('; '));
t('câte o rețetă pe produs din foaie', s.retete.length === produseFoaie.length, `${s.retete.length}/${produseFoaie.length}`);
t('toate componentele foii există în nomenclator', necunoscute.length === 0, `${necunoscute.length} necunoscute`);
const nrLiniiApp = s.retete.reduce((a, r) => a + r.versiuni[r.versiuni.length - 1].linii.length, 0);
t('rândurile „TOTAL REȚETĂ" nu devin linii', nrLiniiApp === liniiFoaie.length, `${nrLiniiApp}/${liniiFoaie.length}`);
t('produsele lipsă se creează din rețetar', s.produse.length === produseFoaie.length && s.produse.every(p => p.tip === 'SIMPLU' && p.activ));
t('produsul poartă categoria din foaie', s.produse.every(p => p.categorie === val(liniiFoaie.find(r => val(r['Produs']) === p.cod)?.['Categorie'])));
t('produsul nou n-are preț de vânzare (vine din 4.7)', s.produse.every(p => p.pretInstore === undefined && p.pretDelivery === undefined));
t('denumirea rețetei e produsul, nu prima componentă', s.retete.every(r => r.denumire === r.cod));
t('TVA-ul produselor noi e cel implicit', s.produse.every(p => p.tva === s.setari.tvaImplicit));

console.log('— Identitatea costului: motor = Σ cantitate × preț/UM bază = TOTAL REȚETĂ din foaie —');
const ctx = buildCtx(s);
const pretNom = new Map(nom.parsat.randuri.map(r => [val(r['Cod NBO']), Number(r['PREȚ / UM bază'])]));
const F: Record<string, number> = { g: 0.001, kg: 1, ml: 0.001, l: 1, buc: 1 };
const totalFoaie = new Map<string, number>();
for (const r of ret.parsat.randuri) if (val(r['Denumire MP']) === 'TOTAL REȚETĂ') totalFoaie.set(val(r['Produs']), Number(r['TOTAL InStore']));
let verificate = 0, abateri: string[] = [];
for (const cod of produseFoaie) {
  const linii = liniiFoaie.filter(r => val(r['Produs']) === cod);
  if (!linii.every(r => val(r['Canal']).toUpperCase() === 'AMBELE')) continue;
  const asteptat = linii.reduce((a, r) => a + Number(r['Cantitate']) * F[val(r['UM'])] * (pretNom.get(val(r['Cod MP'])) ?? NaN), 0);
  const c = costProdus(cod, 'INSTORE', ctx, '2026-08-15');
  verificate++;
  if (!c || Math.abs(c.total - asteptat) > 0.0005) abateri.push(`${cod}: motor ${c?.total.toFixed(4)} vs foaie ${asteptat.toFixed(4)}`);
  const tipar = totalFoaie.get(cod);
  if (tipar !== undefined && Math.abs(tipar - asteptat) > 0.005) abateri.push(`${cod}: TOTAL REȚETĂ tipărit ${tipar} vs Σ ${asteptat.toFixed(4)}`);
}
t('cel puțin 100 de produse verificate', verificate >= 100, String(verificate));
t('costul din motor = Σ foii, pe toate produsele verificate', abateri.length === 0, abateri.slice(0, 5).join(' | '));

console.log('— Reimportul aceluiași rețetar nu dublează nimic —');
const iR2 = importaUnificat(s, { fisier: 'RETETAR-FRYDAY.xlsx', parsat: ret.parsat, intern: 'RETETAR',
  mapare: mapeazaAntete(ret.parsat.antete, 'RETETAR'), optiuni: { dataValabil: '2026-08-01' } });
t('nicio versiune nouă, niciun produs nou', iR2.stareNoua.produse.length === s.produse.length
  && iR2.stareNoua.retete.every(r => r.versiuni.length === 1));

console.log('— Formatul vechi: produsul existent rămâne neatins, cel lipsă se creează —');
const s0 = stareGoala();
const pr: Parsat = { foaie: 'Retetar', antete: ['Cod reteta', 'Denumire reteta', 'Cod componenta', 'Cantitate', 'UM'],
  randuri: [{ 'Cod reteta': 'X1', 'Denumire reteta': 'Produs X', 'Cod componenta': 'I1', 'Cantitate': 100, 'UM': 'g' }] };
const bazaX: AppState = { ...s0, ingrediente: [{ cod: 'I1', denumire: 'Ing', categorie: 'MP', tip: 'FOOD', um: 'kg', preturi: [{ validDeLa: '2026-01-01', pret: 10 }], activ: true }] };
const rX = importa('RETETAR', pr, 'retetar.xlsx', bazaX);
t('produsul lipsă e creat cu denumirea din foaie', rX.stateNou.produse.length === 1 && rX.stateNou.produse[0].denumire === 'Produs X' && rX.stateNou.produse[0].categorie === 'Fără categorie');
t('avertismentul spune ce s-a creat', rX.batch.avertismente.some(a => /produse noi create din rețetar/.test(a) && a.includes('X1')));
const bazaY: AppState = { ...bazaX, produse: [{ cod: 'X1', denumire: 'Vechi', categorie: 'C', tip: 'SIMPLU', tva: 9, pretInstore: 20, activ: true }] };
const rY = importa('RETETAR', pr, 'retetar.xlsx', bazaY);
t('produsul existent nu e rescris', rY.stateNou.produse.length === 1 && rY.stateNou.produse[0].denumire === 'Vechi' && rY.stateNou.produse[0].pretInstore === 20 && rY.stateNou.produse[0].tva === 9);
const rSP = importa('RETETAR', { ...pr, randuri: [{ ...pr.randuri[0], 'Cod reteta': 'SP-1' }] }, 'retetar.xlsx', bazaX);
t('semipreparatul nu devine produs', rSP.stateNou.produse.length === 0 && rSP.stateNou.retete[0]?.tip === 'SEMIPREPARAT');

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
