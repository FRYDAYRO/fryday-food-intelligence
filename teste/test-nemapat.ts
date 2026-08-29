import { stareGoala } from '../src/lib/seed';
import { importa, type Parsat } from '../src/lib/importer';
import { cheieDenumire, matriceDinText } from '../src/lib/salesmix';
import { buildCtx, perProdus } from '../src/lib/engine';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const raport = [
  '4.7 Sales Mix', '7/27/2026 - 7/31/2026', 'Menu Item Name Qty Price Extension',
  'CATEGORY BURGER*',
  'SAMURAI CHICKEN new 300 15.990 $4,797.00',
  'BURGER NECUNOSCUT new 500 20.000 $10,000.00',
  'ALT BURGER FARA RETETA new D 100 25.000 $2,500.00',
  'Garantie SGR Pet D 2,224 0.500 $1,112.00',
  'Total 3124 $18,409.00',
  'Groups/Stores Selected for this Report', 'FRYDAY ORADEA',
  'V 21.1.126.0 Copyright © NCR Corporation 2022 1 of 1',
].join('\n');
const parsat: Parsat = { foaie: 'PDF', antete: [], randuri: [], matrice: matriceDinText(raport) };

// nomenclator minimal: doar SAMURAI există
const baza: AppState = { ...stareGoala(),
  produse: [{ cod: '820023', denumire: 'SAMURAI CHICKEN', categorie: 'BURGER', tip: 'SIMPLU', tva: 11, pretInstore: 15.99, activ: true },
            { cod: 'X9', denumire: 'BURGER SPECIAL', categorie: 'BURGER', tip: 'SIMPLU', tva: 11, pretInstore: 20, activ: true }],
};

console.log('— Nealocatele ajung în stare, ordonate după valoare —');
const r = importa('SALES_MIX', parsat, '4.7.pdf', baza);
t('import reușit', r.batch.status === 'IMPORTAT');
const nm = r.stateNou.nemapate;
t('3 denumiri nealocate reținute', nm.length === 3, nm.map(x => x.denumire).join(' | '));
t('cea mai valoroasă e prima la sortare', [...nm].sort((a, b) => b.valoare - a.valoare)[0].denumire === 'BURGER NECUNOSCUT');
t('cantitatea și valoarea sunt păstrate', (() => { const x = nm.find(y => y.denumire === 'BURGER NECUNOSCUT')!; return x.cant === 500 && Math.abs(x.valoare - 10000) < 0.5; })());
t('produsul potrivit NU apare în listă', !nm.some(x => /SAMURAI/i.test(x.denumire)));
t('fișierul sursă e reținut', nm.every(x => x.fisier === '4.7.pdf'));
t('denumirea e reținută în formă de bază, fără „new" / „ D" — aliasul acoperă ambele canale',
  nm.some(x => x.denumire === 'ALT BURGER FARA RETETA'), nm.map(x => x.denumire).join(' | '));

console.log('— Alocarea unui alias face potrivirea la reimport —');
// simulăm exact ce face atribuieAlias din store
const dupaAlocare: AppState = {
  ...r.stateNou,
  produse: r.stateNou.produse.map(p => p.cod !== 'X9' ? p : { ...p, aliasuri: [...(p.aliasuri ?? []), 'BURGER NECUNOSCUT'] }),
  nemapate: r.stateNou.nemapate.filter(n => n.denumire !== 'BURGER NECUNOSCUT'),
};
t('denumirea a ieșit din listă', dupaAlocare.nemapate.length === 2);
const r2 = importa('SALES_MIX', parsat, '4.7.pdf', dupaAlocare);
t('la reimport, vânzarea se atribuie produsului', r2.stateNou.vanzari.some(v => v.produs === 'X9' && v.cant === 500));
const rows = perProdus(r2.stateNou.vanzari, buildCtx(r2.stateNou), { luna: '2026-07', vedere: 'TOTAL' });
t('produsul apare în analize cu bucățile corecte', rows.find(x => x.cod === 'X9')?.buc === 500);
t('nu mai e raportat ca nealocat', !r2.stateNou.nemapate.some(n => n.denumire === 'BURGER NECUNOSCUT'));
t('celelalte rămân nealocate', r2.stateNou.nemapate.length === 2);

console.log('— Cheia de potrivire ignoră sufixele de canal și versiune —');
t('aliasul acoperă și varianta Delivery', cheieDenumire('BURGER NECUNOSCUT new') === cheieDenumire('BURGER NECUNOSCUT new D'));
t('acoperă și varianta scrisă cu majuscule', cheieDenumire('burger necunoscut NEW') === cheieDenumire('BURGER NECUNOSCUT new'));

console.log('— Sugestia automată pe cuvinte comune —');
const sug = (den: string, produse: { cod: string; denumire: string }[]) => {
  const cuvinte = cheieDenumire(den).split(' ').filter(w => w.length > 2);
  let cel = '', max = 0;
  for (const p of produse) {
    const k = cheieDenumire(p.denumire);
    const s = cuvinte.filter(w => k.includes(w)).length / cuvinte.length;
    if (s > max) { max = s; cel = p.cod; }
  }
  return max >= 0.5 ? cel : '';
};
t('„BURGER SPECIAL new D" → BURGER SPECIAL', sug('BURGER SPECIAL new D', baza.produse) === 'X9');
t('denumire fără cuvinte comune nu primește sugestie', sug('Punga Mica D', baza.produse) === '');

console.log('— Raportul de acoperire îl anunță pe utilizator —');
t('acoperirea e raportată în avertismente', r.batch.avertismente.some(a => a.includes('Acoperire pe denumiri')));
t('cele nealocate sunt listate cu valoarea', r.batch.avertismente.some(a => a.includes('BURGER NECUNOSCUT') && a.includes('lei')));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
