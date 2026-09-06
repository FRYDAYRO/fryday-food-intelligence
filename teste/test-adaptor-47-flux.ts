// Adaptorul 4.7 în fluxul REAL de import: cine primește vânzările unui raport POS.
//
// Problema rezolvată: `importer.ts` fabrica o pseudo-locație „AGREGAT" pentru orice raport
// care acoperea mai multe restaurante. Ea intra în `state.locatii` și apărea ca al 31-lea
// restaurant în clasamente — un magazin care nu există.
//
// Acum locația se cere adaptorului canonic, care trece numele din antet prin Store Master:
//   · un singur restaurant identificat sigur → vânzările merg la EL
//   · raport de rețea / identități nesigure   → codul rezervat RETEA, care NU e restaurant
//   · restaurant declarat manual la import    → decizia omului bate deducția
//
// Datele nu se pierd în niciun caz: rândurile există, intră în totalul companiei, iar
// denumirile de produs nemapate rămân în coada de mapare, ca înainte.
import { importa, type Parsat } from '../src/lib/importer';
import { buildCtx } from '../src/lib/engine';
import { genereazaSeed } from '../src/lib/seed';
import { COMPANIE, LOCATIE_RETEA, eLocatieReala, perioadaDin } from '../src/lib/fc-domeniu';
import { analizaTimeline } from '../src/lib/fc-timeline';
import { RESTAURANTE_FRYDAY } from '../src/lib/restaurante-fryday';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

// fără Sales Report: altfel numitorul ar veni din 4.1, iar identitățile de mai jos
// ar compara vânzări din altă sursă decât cea importată aici
const s0: AppState = { ...genereazaSeed(), vanzari: [], locatii: [], salesReport: [] };
const LOCATII_INITIALE = s0.locatii.length;

/** Grila unui 4.7, în forma REALĂ a exportului NCR: antet, categorie, linii, magazine la final. */
const grila = (magazine: string[], corporate = false): unknown[][] => [
  ['4.7 Sales Mix'],
  // scopul declarat de antet: „Corporate"/„Multiple Selection" înseamnă rețea prin ele
  // însele, indiferent câte magazine urmează în listă
  [corporate ? 'Corporate Fiscal Year: 2026'
    : magazine.length > 1 ? 'Multiple Selection Fiscal Year: 2026' : 'Fiscal Year: 2026'],
  ['Period: 7 Week: 5'],
  ['7/27/2026 - 7/31/2026'],
  ['Menu Item Name', 'Qty', 'Price', 'Extension'],
  ['CATEGORY BURGER*'],
  ['Crispy Burger', 100, 20.000, '$2,000.00'],
  ['PRODUS INEXISTENT XYZ', 40, 10.000, '$400.00'],
  ['Total 140 $2,400.00'],
  ...(magazine.length
    ? [['Groups/Stores Selected for this Report'], [magazine.join(', ')]]
    : []),
];
const imp = (magazine: string[], corporate = false, opt?: Parameters<typeof importa>[5]) => {
  const p: Parsat = { foaie: 'S', antete: [], randuri: [], matrice: grila(magazine, corporate) };
  return importa('SALES_MIX', p, '4.7 test.xlsx', s0, undefined, opt);
};
const noi = (r: ReturnType<typeof importa>) => r.stateNou.vanzari.filter(v => !s0.vanzari.includes(v));

// ————————————————————————————————————————————————————————— 1 · locații identificabile

console.log('— 1 · Un singur restaurant, identificat sigur → vânzările merg la EL —');
const UNU = RESTAURANTE_FRYDAY[0].displayName;   // „FRYDAY ALBA IULIA"
const rUnu = imp([UNU]);
t('importul reușește', rUnu.batch.status === 'IMPORTAT', rUnu.batch.erori.join(' | '));
t('vânzările primesc restaurantul din antet', noi(rUnu).every(v => v.locatie === UNU), [...new Set(noi(rUnu).map(v => v.locatie))].join(','));
t('… iar restaurantul intră în nomenclator, o singură dată',
  rUnu.stateNou.locatii.filter(l => l.cod === UNU).length === 1);
t('NU se creează pseudo-locația AGREGAT', !rUnu.stateNou.locatii.some(l => l.cod === 'AGREGAT'));
t('numele vine din Store Master, nu din text brut',
  RESTAURANTE_FRYDAY.some(x => x.displayName === noi(rUnu)[0].locatie));

// numele scris altfel, dar aceeași identitate
const rDiacritice = imp(['fryday alba iulia']);
t('un nume scris cu alte majuscule se rezolvă la ACEEAȘI identitate',
  noi(rDiacritice).every(v => v.locatie === UNU), [...new Set(noi(rDiacritice).map(v => v.locatie))].join(','));
t('… fără să creeze un al doilea restaurant',
  rDiacritice.stateNou.locatii.filter(l => l.cod === UNU).length === 1
  && rDiacritice.stateNou.locatii.length === LOCATII_INITIALE + 1);

// ————————————————————————————————————————————————————————— 2 · raport de rețea

console.log('\n— 2 · Raport agregat pe rețea → NU devine restaurant —');
const TREI = RESTAURANTE_FRYDAY.slice(0, 3).map(x => x.displayName);
const rRetea = imp(TREI);
t('importul reușește', rRetea.batch.status === 'IMPORTAT');
t('NU există pseudo-locația AGREGAT', !rRetea.stateNou.locatii.some(l => l.cod === 'AGREGAT'));
t('nici codul rezervat RETEA nu devine restaurant', !rRetea.stateNou.locatii.some(l => l.cod === LOCATIE_RETEA));
t('nomenclatorul de locații rămâne NEATINS', rRetea.stateNou.locatii.length === LOCATII_INITIALE);
t('… deși antetul declară trei restaurante', TREI.length === 3);
t('vânzările NU se pierd: există, pe codul rezervat',
  noi(rRetea).length > 0 && noi(rRetea).every(v => v.locatie === LOCATIE_RETEA));
t('… și NU se împart artificial între cele trei',
  !noi(rRetea).some(v => TREI.includes(v.locatie)));
t('avertismentul spune de ce', rRetea.batch.avertismente.some(a =>
  a.includes('REȚEA') && a.includes('nu se pot atribui unui restaurant')));

const rCorporate = imp([], true);
t('un raport „Corporate" fără listă de magazine e tot de rețea',
  noi(rCorporate).every(v => v.locatie === LOCATIE_RETEA));
t('… fără locație creată', rCorporate.stateNou.locatii.length === LOCATII_INITIALE);

// ————————————————————————————————————————————————————————— 3 · fără mapping sigur

console.log('\n— 3 · Fără mapping sigur → nu se atribuie, iar produsele rămân în nemapate —');
// un restaurant nou, cu forma corectă a numelui, dar absent din Store Master —
// exact cazul unei deschideri noi, înainte ca lista canonică să fie actualizată
const NOU = 'FRYDAY MAGAZIN INEXISTENT';
const rNecunoscut = imp([NOU]);
t('un nume necunoscut NU devine restaurant',
  rNecunoscut.stateNou.locatii.length === LOCATII_INITIALE
  && !rNecunoscut.stateNou.locatii.some(l => l.cod === NOU));
t('vânzările lui merg pe codul rezervat, nu pe numele necunoscut',
  noi(rNecunoscut).every(v => v.locatie === LOCATIE_RETEA));
t('avertismentul NUMEȘTE identitatea nerezolvată', rNecunoscut.batch.avertismente.some(a =>
  a.includes(NOU) && a.includes('UNMATCHED')));
t('… iar parserul chiar l-a văzut ca magazin, nu l-a aruncat',
  rNecunoscut.batch.avertismente.some(a => a.includes('din 1 restaurante din antet')));
t('… și spune limpede că nu li se atribuie vânzările',
  rNecunoscut.batch.avertismente.some(a => a.includes('NU li se atribuie')));

// coada de mapare a PRODUSELOR rămâne exact mecanismul dinainte
t('denumirea de produs nemapată intră în `nemapate`',
  rRetea.stateNou.nemapate.some(n => n.denumire === 'PRODUS INEXISTENT XYZ'));
t('… cu valoarea ei, pentru prioritizare',
  aprox(rRetea.stateNou.nemapate.find(n => n.denumire === 'PRODUS INEXISTENT XYZ')!.valoare, 400, 1));
t('produsul care SE mapează nu ajunge în nemapate',
  !rRetea.stateNou.nemapate.some(n => n.denumire === 'Crispy Burger'));

// ————————————————————————————————————————————————————————— 4 · fără duplicate

console.log('\n— 4 · Fără duplicate în nomenclatorul de restaurante —');
const dubluA = imp([UNU]);
const dubluB = importa('SALES_MIX', { foaie: 'S', antete: [], randuri: [], matrice: grila([UNU]) },
  '4.7 a doua oară.xlsx', dubluA.stateNou);
t('al doilea import al aceluiași restaurant NU îl adaugă din nou',
  dubluB.stateNou.locatii.filter(l => l.cod === UNU).length === 1);
t('… iar numărul total de locații rămâne același',
  dubluB.stateNou.locatii.length === dubluA.stateNou.locatii.length);
t('Store Master nu are el însuși duplicate',
  new Set(RESTAURANTE_FRYDAY.map(x => x.displayName)).size === RESTAURANTE_FRYDAY.length);
t('… nici după normalizare (nume care s-ar topi unul în altul)',
  new Set(RESTAURANTE_FRYDAY.map(x => x.displayName.toLowerCase().replace(/\s+/g, ' ').trim())).size
  === RESTAURANTE_FRYDAY.length);
const dupaRetea = importa('SALES_MIX', { foaie: 'S', antete: [], randuri: [], matrice: grila(TREI) },
  '4.7 retea 2.xlsx', rRetea.stateNou);
t('două rapoarte de rețea nu produc două „locații" de rețea',
  dupaRetea.stateNou.locatii.length === LOCATII_INITIALE);

// ————————————————————————————————————————————————————————— 5 · rapoartele nu se schimbă

console.log('\n— 5 · Rapoartele existente nu se modifică nejustificat —');
const LUNA = perioadaDin('2026-07-27', 'LUNA');
const cerere = { perioada: LUNA, nivel: COMPANIE, canal: 'TOTAL' as const, comparatie: 'PERIOADA_PRECEDENTA' as const };
const aRetea = analizaTimeline(rRetea.stateNou, buildCtx(rRetea.stateNou), cerere);
t('analiza de companie e disponibilă', aRetea.disponibil);
t('vânzările de rețea INTRĂ în totalul companiei',
  aRetea.metrici!.salesRON > 0 && aprox(aRetea.metrici!.salesRON, aRetea.vanzariReteaRON, 0.01),
  `${aRetea.metrici!.salesRON} vs ${aRetea.vanzariReteaRON}`);
t('… dar NU apar ca restaurant în defalcare',
  (aRetea.magazine ?? []).every(m => m.locatie !== LOCATIE_RETEA && m.locatie !== 'AGREGAT'));
t('cu doar un raport de rețea, lista de restaurante e goală — nu inventată',
  (aRetea.magazine ?? []).length === 0);
t('partea de rețea e RAPORTATĂ separat, nu ascunsă', aRetea.vanzariReteaRON > 0);
t('clasamentele nu conțin coduri rezervate',
  (aRetea.clasamente ?? []).every(c => c.randuri.every(r => eLocatieReala(r.locatie))));

// restaurantul identificat apare normal în defalcare
const aUnu = analizaTimeline(rUnu.stateNou, buildCtx(rUnu.stateNou), cerere);
t('un restaurant REAL apare în defalcare', (aUnu.magazine ?? []).some(m => m.locatie === UNU));
t('… iar partea de rețea e zero acolo', aUnu.vanzariReteaRON === 0);
t('IDENTITATE: companie = Σ restaurante + partea de rețea',
  aprox(aUnu.metrici!.salesRON,
    (aUnu.magazine ?? []).reduce((s, m) => s + m.metrici.salesRON, 0) + aUnu.vanzariReteaRON, 0.01));
t('… și pe raportul de rețea, unde suma restaurantelor e zero',
  aprox(aRetea.metrici!.salesRON,
    (aRetea.magazine ?? []).reduce((s, m) => s + m.metrici.salesRON, 0) + aRetea.vanzariReteaRON, 0.01));
t('cifrele produsului sunt identice indiferent cui i s-au atribuit vânzările',
  aprox(aUnu.metrici!.recipeCostRON, aRetea.metrici!.recipeCostRON, 0.01),
  `${aUnu.metrici!.recipeCostRON} vs ${aRetea.metrici!.recipeCostRON}`);
t('… la fel și FC-ul', aprox(aUnu.metrici!.recipeFcPct!, aRetea.metrici!.recipeFcPct!, 1e-9));

// ————————————————————————————————————————————————————————— locația declarată manual

console.log('\n— Restaurantul declarat manual bate deducția —');
const rManual = imp(TREI, false, { locatieRaport: 'L09' });
t('locația declarată de om se folosește, chiar pe un raport agregat',
  noi(rManual).every(v => v.locatie === 'L09'));
t('… și intră în nomenclator', rManual.stateNou.locatii.some(l => l.cod === 'L09'));
t('… fiind o locație reală, apare în defalcare',
  eLocatieReala('L09') && !eLocatieReala(LOCATIE_RETEA));

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
