import { genereazaSeedNBO } from '../src/lib/seed-nbo';
import { importa, type Parsat } from '../src/lib/importer';
import { buildCtx, perProdus } from '../src/lib/engine';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const s0 = genereazaSeedNBO();
t('setul de bază are vânzări în iunie–iulie', [...new Set(s0.vanzari.map(v => v.data.slice(0, 7)))].sort().join(',') === '2026-06,2026-07');

console.log('— PMIX pe o lună nouă, cu nume de restaurant necunoscut —');
const pmix: Parsat = {
  foaie: 'PMIX', antete: ['Data', 'Restaurant', 'Cod produs', 'Canal', 'Cantitate', 'Valoare'],
  randuri: [
    { Data: '2026-08-03', Restaurant: 'FRYDAY Sun Plaza', 'Cod produs': '820023', Canal: 'InStore', Cantitate: 40, Valoare: 679.6 },
    { Data: '2026-08-03', Restaurant: 'FRYDAY Sun Plaza', 'Cod produs': '820024', Canal: 'Delivery', Cantitate: 18, Valoare: 377.8 },
    { Data: '2026-08-04', Restaurant: 'FRYDAY Baneasa', 'Cod produs': '820023', Canal: 'InStore', Cantitate: 31, Valoare: 526.7 },
  ],
};
const r = importa('PMIX', pmix, 'PMIX august.xlsx', s0);
t('cele 3 rânduri intră', r.batch.status === 'IMPORTAT' && r.batch.importate === 3, `${r.batch.importate}`);
t('locațiile noi sunt create, nu ignorate', r.stateNou.locatii.length === s0.locatii.length + 2,
  r.stateNou.locatii.map(l => l.nume).join(' · '));
t('creările sunt raportate', r.batch.avertismente.filter(a => a.includes('Locație nouă')).length === 2);
t('vânzările sunt legate de locațiile noi', r.stateNou.vanzari.some(v => v.locatie === 'FRYDAY Sun Plaza'));

console.log('— Datele apar în analize pe luna importată —');
const ctx = buildCtx(r.stateNou);
const augTot = perProdus(r.stateNou.vanzari, ctx, { luna: '2026-08', vedere: 'TOTAL' });
t('august are 2 produse vândute', augTot.length === 2, augTot.map(x => `${x.cod}:${x.buc}`).join(' '));
t('Food Cost calculabil pe august', augTot.every(x => x.fc !== null && x.fc > 0), augTot.map(x => x.fc!.toFixed(1) + '%').join(' '));
const augLoc = perProdus(r.stateNou.vanzari, ctx, { luna: '2026-08', locatie: 'FRYDAY Sun Plaza', vedere: 'TOTAL' });
t('filtrarea pe restaurantul nou funcționează', augLoc.length === 2 && augLoc.reduce((s, x) => s + x.buc, 0) === 58,
  `${augLoc.reduce((s, x) => s + x.buc, 0)} buc`);
const iulie = perProdus(r.stateNou.vanzari, ctx, { luna: '2026-07', vedere: 'TOTAL' });
t('iulie rămâne neatinsă', iulie.length === 3);

console.log('— Reimportul aceleiași luni înlocuiește, nu dublează —');
const r2 = importa('PMIX', pmix, 'PMIX august.xlsx', r.stateNou);
t('numărul de rânduri rămâne același', r2.stateNou.vanzari.length === r.stateNou.vanzari.length,
  `${r.stateNou.vanzari.length} → ${r2.stateNou.vanzari.length}`);
t('locațiile nu se dublează', r2.stateNou.locatii.length === r.stateNou.locatii.length);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
