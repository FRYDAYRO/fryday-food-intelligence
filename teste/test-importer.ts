import { genereazaSeed } from '../src/lib/seed';
import { importa, mapeazaAntete, detecteazaTip, parseNumar, parseData, parsePerioada, detecteazaCanal, type Parsat } from '../src/lib/importer';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

console.log('— Parsere —');
t('număr RO 1.234,56', parseNumar('1.234,56') === 1234.56);
t('număr 12,5', parseNumar('12,5') === 12.5);
t('dată DD.MM.YYYY', parseData('05.07.2026') === '2026-07-05');
t('dată serial Excel', parseData(46203) !== null);
t('perioadă 07/2026', parsePerioada('07/2026') === '2026-07');
t('canal din valoare', detecteazaCanal('Delivery', '') === 'DELIVERY');
t('canal din fișier', detecteazaCanal('', 'pmix_instore_iulie.xlsx') === 'INSTORE');

console.log('— Detecție & mapare coloane —');
const antetePmix = ['Data', 'Locatie', 'Canal', 'Cod produs', 'Denumire produs', 'Cantitate', 'Valoare neta'];
t('detecție PMIX', detecteazaTip(antetePmix, 'export.xlsx') === 'PMIX');
const m = mapeazaAntete(antetePmix, 'PMIX');
t('mapare cod produs', m.produs === 'Cod produs');
t('mapare net', m.net === 'Valoare neta');
t('detecție 2.9 din nume', detecteazaTip(['Luna', 'Restaurant', 'Cont', 'Suma'], 'raport 2.9 iunie.xlsx') === 'FC29');

console.log('— Import PMIX (înlocuire pe cheie + cod necunoscut) —');
const s0 = genereazaSeed();
const p: Parsat = {
  foaie: 'PMIX', antete: antetePmix,
  randuri: [
    { 'Data': '2026-07-10', 'Locatie': 'L01', 'Canal': 'InStore', 'Cod produs': 'P001', 'Denumire produs': 'Crispy Burger', 'Cantitate': 50, 'Valoare neta': 859.09 },
    { 'Data': '2026-07-10', 'Locatie': 'L01', 'Canal': 'InStore', 'Cod produs': 'P999', 'Denumire produs': 'Fantomă', 'Cantitate': 5, 'Valoare neta': 100 },
  ],
};
const inainte = s0.vanzari.filter(v => v.data === '2026-07-10' && v.locatie === 'L01' && v.canal === 'INSTORE' && v.produs === 'P001');
t('cheia există în seed', inainte.length === 1);
const { stateNou, batch } = importa('PMIX', p, 'pmix.xlsx', s0);
const dupa = stateNou.vanzari.filter(v => v.data === '2026-07-10' && v.locatie === 'L01' && v.canal === 'INSTORE' && v.produs === 'P001');
t('rândul a fost înlocuit (nu duplicat)', dupa.length === 1 && dupa[0].cant === 50, `cant=${dupa[0]?.cant}`);
t('cod necunoscut → avertisment', batch.avertismente.some(a => a.includes('P999')));
t('batch IMPORTAT', batch.status === 'IMPORTAT' && batch.importate === 1);
t('istoric importuri crescut', stateNou.importuri.length === s0.importuri.length + 1);

console.log('— Import 2.9 (înlocuire perioadă+locație) —');
const p29: Parsat = {
  foaie: '2.9', antete: ['Luna', 'Locatie', 'Categorie', 'Valoare'],
  randuri: [
    { 'Luna': '2026-07', 'Locatie': 'L01', 'Categorie': 'Carne si pui', 'Valoare': '9.999,00' },
    { 'Luna': '2026-07', 'Locatie': 'L01', 'Categorie': 'Uniforme personal', 'Valoare': 700 },
  ],
};
const r29 = importa('FC29', p29, '2.9.xlsx', s0);
const linii = r29.stateNou.linii29.filter(l => l.perioada === '2026-07' && l.locatie === 'L01');
t('perechea (2026-07, L01) înlocuită complet', linii.length === 2, `linii=${linii.length}`);
t('L02 neatins', r29.stateNou.linii29.some(l => l.perioada === '2026-07' && l.locatie === 'L02'));
t('valoare RO parsată', linii.find(l => l.categorie === 'Carne si pui')?.valoare === 9999);

console.log('— Import cost ingrediente (istoric + alertă) —');
const pc: Parsat = {
  foaie: 'Costuri', antete: ['Cod', 'Denumire', 'Pret', 'Valabil de la'],
  randuri: [
    { 'Cod': 'I001', 'Denumire': 'Piept de pui', 'Pret': '19,00', 'Valabil de la': '2026-07-20' },
    { 'Cod': 'I099', 'Denumire': 'Ingredient nou test', 'Pret': 3, 'Valabil de la': '' },
  ],
};
const rc = importa('COST_INGREDIENTE', pc, 'costuri.xlsx', s0);
const i1 = rc.stateNou.ingrediente.find(i => i.cod === 'I001')!;
t('istoric preț extins la 3 versiuni', i1.preturi.length === 3, String(i1.preturi.length));
t('alertă variație > prag (14→19 = +36%)', rc.batch.avertismente.some(a => a.includes('Piept')));
t('ingredient nou creat cu avertisment', rc.stateNou.ingrediente.some(i => i.cod === 'I099') && rc.batch.avertismente.some(a => a.includes('I099')));

console.log('— Import rețetar (versiune nouă) —');
const pr: Parsat = {
  foaie: 'Retetar', antete: ['Cod reteta', 'Denumire reteta', 'Cod componenta', 'Cantitate', 'UM', 'Canal'],
  randuri: [
    { 'Cod reteta': 'P004', 'Denumire reteta': 'Cartofi prăjiți', 'Cod componenta': 'I007', 'Cantitate': 200, 'UM': 'g', 'Canal': '' },
    { 'Cod reteta': 'P004', 'Denumire reteta': 'Cartofi prăjiți', 'Cod componenta': 'A004', 'Cantitate': 1, 'UM': 'buc', 'Canal': '' },
  ],
};
const rr = importa('RETETAR', pr, 'retetar.xlsx', s0);
const ret = rr.stateNou.retete.find(r => r.cod === 'P004')!;
t('versiune nouă activă (v2)', ret.activa === 2 && ret.versiuni.length === 2);
t('linia de 200 g importată', ret.versiuni[1].linii.some(l => l.comp === 'I007' && l.cant === 200));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
