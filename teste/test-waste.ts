import { genereazaSeed } from '../src/lib/seed';
import { importa, mapeazaAntete, detecteazaTip, TIP_LABEL, type Parsat } from '../src/lib/importer';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

console.log('— Waste: tip nou de import —');
t('WASTE apare în TIP_LABEL', TIP_LABEL.WASTE === 'Waste (risipă ingrediente)');

console.log('— Detecție & mapare coloane —');
t('detecție din nume (waste)', detecteazaTip(['Data', 'Cod ingredient', 'Cantitate'], 'waste_iulie.xlsx') === 'WASTE');
t('detecție din nume (risipă)', detecteazaTip(['Data', 'Cod ingredient', 'Cantitate'], 'risipa_L01.xlsx') === 'WASTE');
const antete = ['Data', 'Locatie', 'Cod ingredient', 'Cantitate', 'UM', 'Motiv', 'Valoare risipa'];
const m = mapeazaAntete(antete, 'WASTE');
t('mapare ingredient', m.ingredient === 'Cod ingredient');
t('mapare cantitate', m.cant === 'Cantitate');
t('mapare motiv', m.motiv === 'Motiv');
t('mapare valoare', m.valoare === 'Valoare risipa');

console.log('— Import waste (validare ingredient + cost estimat) —');
const s0 = genereazaSeed();
const p: Parsat = {
  foaie: 'Waste', antete,
  randuri: [
    { 'Data': '2026-07-15', 'Locatie': 'L01', 'Cod ingredient': 'I001', 'Cantitate': 2, 'UM': 'kg', 'Motiv': 'expirat', 'Valoare risipa': '' },
    { 'Data': '2026-07-15', 'Locatie': 'L01', 'Cod ingredient': 'I999', 'Cantitate': 5, 'UM': 'kg', 'Motiv': 'deteriorat', 'Valoare risipa': '' },
  ],
};
const { stateNou, batch } = importa('WASTE', p, 'waste_iulie.xlsx', s0);
t('seed pornește fără waste', s0.waste.length === 0);
t('doar ingredientul cunoscut a intrat', stateNou.waste.length === 1, `waste=${stateNou.waste.length}`);
const w = stateNou.waste.find(x => x.ingredient === 'I001')!;
t('cost estimat din ultimul preț (14×2=28)', w.valoare === 28, `valoare=${w?.valoare}`);
t('UM și motiv păstrate', w.um === 'kg' && w.motiv === 'expirat');
t('ingredient necunoscut → avertisment', batch.avertismente.some(a => a.includes('I999')));
t('batch IMPORTAT (1 rând)', batch.status === 'IMPORTAT' && batch.importate === 1);
t('istoric importuri crescut', stateNou.importuri.length === s0.importuri.length + 1);

console.log('— Valoare explicită & agregare pe cheie —');
const pExplicit: Parsat = {
  foaie: 'Waste', antete,
  randuri: [
    { 'Data': '2026-07-16', 'Locatie': 'L01', 'Cod ingredient': 'I001', 'Cantitate': 1, 'UM': 'kg', 'Motiv': 'supraproductie', 'Valoare risipa': 50 },
    { 'Data': '2026-07-16', 'Locatie': 'L01', 'Cod ingredient': 'I001', 'Cantitate': 3, 'UM': 'kg', 'Motiv': 'supraproductie', 'Valoare risipa': 150 },
  ],
};
const rExpl = importa('WASTE', pExplicit, 'waste.xlsx', s0);
const dupe = rExpl.stateNou.waste.filter(x => x.data === '2026-07-16' && x.ingredient === 'I001' && x.motiv === 'supraproductie');
t('dublurile din fișier agregate pe cheie', dupe.length === 1 && dupe[0].cant === 4, `n=${dupe.length} cant=${dupe[0]?.cant}`);
t('valoarea explicită însumată (50+150)', dupe[0]?.valoare === 200, `valoare=${dupe[0]?.valoare}`);

console.log('— Reimport: înlocuire pe cheie (nu duplicat) —');
const s1 = rExpl.stateNou;
const pReimport: Parsat = {
  foaie: 'Waste', antete,
  randuri: [
    { 'Data': '2026-07-16', 'Locatie': 'L01', 'Cod ingredient': 'I001', 'Cantitate': 9, 'UM': 'kg', 'Motiv': 'supraproductie', 'Valoare risipa': 400 },
  ],
};
const rRe = importa('WASTE', pReimport, 'waste.xlsx', s1);
const dupa = rRe.stateNou.waste.filter(x => x.data === '2026-07-16' && x.ingredient === 'I001' && x.motiv === 'supraproductie');
t('cheia înlocuită, nu duplicată', dupa.length === 1 && dupa[0].cant === 9, `n=${dupa.length} cant=${dupa[0]?.cant}`);

console.log('— Coloane obligatorii lipsă → eroare —');
const pInvalid: Parsat = { foaie: 'Waste', antete: ['Data', 'Altceva'], randuri: [{ 'Data': '2026-07-15', 'Altceva': 'x' }] };
const rInv = importa('WASTE', pInvalid, 'waste.xlsx', s0);
t('lipsă coloane → batch ESUAT', rInv.batch.status === 'ESUAT' && rInv.batch.erori.length > 0);
t('state neschimbat la eroare', rInv.stateNou.waste.length === s0.waste.length);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
