import { genereazaSeed } from '../src/lib/seed';
import { importa, detecteazaTip, type Parsat } from '../src/lib/importer';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const s0 = genereazaSeed();

// fișier cu antete pe care detecția nu le prinde
// antete care nu se potrivesc cu nicio variantă cunoscută
const p: Parsat = {
  foaie: 'FC BAZA', antete: ['Poz', 'Referinta interna', 'Text scurt', 'Masura', 'Suma RON'],
  randuri: [{ 'Poz': 1, 'Referinta interna': '7000133', 'Text scurt': 'CHIFLA CARTOF', 'Masura': 'EA', 'Suma RON': 2.4 }],
};
const rez = importa('COST_INGREDIENTE', p, 'FRYDAY FC BAZA 2026-08.xlsx', s0);
t('importul eșuează controlat, cu eroare explicită', rez.batch.status === 'ESUAT' && rez.batch.erori.length >= 1, rez.batch.erori.length + ' erori');
const e = rez.batch.erori[0];
t('eroarea numește coloana lipsă', e.includes('cod'), e.slice(0, 60));
t('eroarea listează coloanele din fișier', e.includes('Poz') && e.includes('Referinta interna'));
t('eroarea trimite la maparea manuală', e.includes('Maparea coloanelor'));

// cu mapare manuală, același fișier intră
const rez2 = importa('COST_INGREDIENTE', p, 'FRYDAY FC BAZA 2026-08.xlsx', s0,
  { cod: 'Referinta interna', denumire: 'Text scurt', um: 'Masura', pret: 'Suma RON' });
t('cu maparea manuală importul reușește', rez2.batch.status === 'IMPORTAT' && rez2.batch.importate === 1, `${rez2.batch.importate} rânduri`);

// sinonimele noi prind antetele frecvente fără mapare
const p2: Parsat = {
  foaie: 'FC', antete: ['Item ID', 'Item Name', 'UOM', 'Cost unitar'],
  randuri: [{ 'Item ID': '4078', 'Item Name': 'Ulei de alune', 'UOM': 'l', 'Cost unitar': 16.9 }],
};
const rez3 = importa('COST_INGREDIENTE', p2, 'costuri.xlsx', s0);
t('„Item ID / Item Name / UOM / Cost unitar" recunoscute automat', rez3.batch.status === 'IMPORTAT', rez3.batch.erori.join(' | '));
t('detecția de tip funcționează pe aceste antete', ['COST_INGREDIENTE', 'RETETAR_NBO'].includes(detecteazaTip(p2.antete, 'costuri.xlsx')), detecteazaTip(p2.antete, 'costuri.xlsx'));

// antetele frecvente din exporturile ERP se prind acum automat
const p3: Parsat = {
  foaie: 'FC', antete: ['Material NBO', 'Descriere articol', 'Unitate', 'Valoare unitara'],
  randuri: [{ 'Material NBO': '7000133', 'Descriere articol': 'CHIFLA CARTOF', 'Unitate': 'buc', 'Valoare unitara': 2.4 }],
};
const rez4 = importa('COST_INGREDIENTE', p3, 'fc baza.xlsx', s0);
t('„Material / Descriere / Unitate / Valoare unitara" prinse automat', rez4.batch.status === 'IMPORTAT', rez4.batch.erori.join(' | '));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
