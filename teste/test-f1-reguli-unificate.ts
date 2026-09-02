// F1 — aceeași categorie 2.9 dă același rezultat în Food Cost și în Control Tower.
//
// Cele două clasificatoare plecau din vocabulare diferite: `state.reguli` (FC Curat în
// ecranul Food Cost, în `fcPerioada` ȘI în `nboFC` din Control Tower) avea patru tipare, doar
// în română; `REGULI_IMPLICITE_29` (puntea pe materiale) are treizeci, în două limbi. O
// categorie ca „CLEANING" era EXCLUSĂ de punte și numărată ca FOOD în FC Curat.
//
// Acum regulile implicite ale clasificatorului vechi se DERIVĂ din lista canonică. Nu
// există două liste. Regulile omului rămân exact unde le-a pus, cu prioritatea de azi.
import { clasifica, buildCtx, fcPerioada } from '../src/lib/engine';
import {
  clasificaCategorie29, clasaDinCategorie, regulileImpliciteLegacy, imbinaReguli, REGULI_IMPLICITE_29, VERSIUNE_REGULI_29,
  type FCCategory,
} from '../src/lib/fc-clasificare';
import { nboFC } from '../src/lib/fc-core';
import { COMPANIE, perioadaDin } from '../src/lib/fc-domeniu';
import { genereazaSeed, stareGoala } from '../src/lib/seed';
import { genereazaSeedNBO } from '../src/lib/seed-nbo';
import { migreaza } from '../src/lib/store';
import type { AppState, RegulaClasificare } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

const IMPLICITE = stareGoala().reguli;
/** Ce ar da FC Curat pentru categoria asta: FOOD/PAPER intră, EXCLUS iese. */
const legacy = (c: string, reguli: RegulaClasificare[] = IMPLICITE) => clasifica(c, reguli);
const canonic = (c: string) => clasificaCategorie29(c, []).categorie;

// ————————————————————————————————— 1. cazurile cerute explicit
console.log('— 1. Aceeași categorie, același verdict —');
const parita = (cat: string, asteptatCanonic: FCCategory) => {
  const l = legacy(cat), k = canonic(cat);
  t(`${cat.padEnd(14)} canonic → ${asteptatCanonic}`, k === asteptatCanonic, k);
  t(`${' '.repeat(14)} legacy  → ${clasaDinCategorie(asteptatCanonic)}, fără „auto"`,
    l.clasa === clasaDinCategorie(asteptatCanonic) && l.auto === false, `${l.clasa}${l.auto ? ' (auto)' : ''}`);
};
parita('CLEANING', 'CLEANING');
parita('PAPER', 'PAPER');
parita('Curatenie', 'CLEANING');
parita('Materiale curățenie', 'CLEANING');
parita('UNIFORMS', 'UNIFORMS');
parita('Packaging', 'PAPER');
parita('Ambalaje', 'PAPER');
parita('Consumabile administrative', 'STATIONERY');
parita('Carne si pui', 'FOOD');
parita('Bauturi', 'FOOD');
parita('FOOD', 'FOOD');

console.log('\n— 2. Regula de derivare, pe toate categoriile —');
t('FOOD → FOOD', clasaDinCategorie('FOOD') === 'FOOD');
t('PAPER → PAPER', clasaDinCategorie('PAPER') === 'PAPER');
t('NORMALIZED → PAPER (materie de Food Cost, „NORMALIZED_PAPER" în punte)', clasaDinCategorie('NORMALIZED') === 'PAPER');
for (const c of ['CLEANING', 'OPERATIONAL', 'UNIFORMS', 'STATIONERY', 'OTHER'] as FCCategory[]) {
  t(`${c} → EXCLUS`, clasaDinCategorie(c) === 'EXCLUS');
}
t('lista derivată are exact atâtea reguli câte are cea canonică (nu e o a doua listă)',
  regulileImpliciteLegacy().length === REGULI_IMPLICITE_29.length);
t('… în aceeași ordine (specific înaintea genericului)',
  regulileImpliciteLegacy().every((r, i) => r.pattern === REGULI_IMPLICITE_29[i].pattern));
t('… iar fiecare clasă e derivată, nu scrisă',
  regulileImpliciteLegacy().every((r, i) => r.clasa === clasaDinCategorie(REGULI_IMPLICITE_29[i].categorie)));
// paritate COMPLETĂ: orice tipar canonic dă, prin legacy, clasa derivată a categoriei lui
t('paritate pe TOATE tiparele canonice',
  REGULI_IMPLICITE_29.every(r => legacy(r.pattern).clasa === clasaDinCategorie(r.categorie)));

console.log('\n— 3. Ce era clasificat rămâne clasificat la fel —');
const VECHI: RegulaClasificare[] = [
  { pattern: 'uniforme', clasa: 'EXCLUS' }, { pattern: 'administrative', clasa: 'EXCLUS' },
  { pattern: 'curatenie', clasa: 'EXCLUS' }, { pattern: 'ambalaje', clasa: 'PAPER' },
];
for (const c of ['Uniforme personal', 'Consumabile administrative', 'Materiale curățenie', 'Ambalaje', 'Burgeri', 'Pui', 'Wrapuri']) {
  t(`${c.padEnd(28)} aceeași clasă ca înainte`, legacy(c, VECHI).clasa === legacy(c).clasa,
    `${legacy(c, VECHI).clasa} → ${legacy(c).clasa}`);
}
t('categoriile FOOD nerecunoscute rămân FOOD (fallback-ul vechi e neatins)',
  legacy('Wrapuri').clasa === 'FOOD' && legacy('Wrapuri').auto === true);

console.log('\n— 4. Regula omului are prioritatea de azi —');
// azi: o singură listă, prima potrivire câștigă, iar omul ADAUGĂ la coadă (FoodCost.tsx:217)
const cuCustom = [...IMPLICITE, { pattern: 'servetele', clasa: 'EXCLUS' as const }];
t('regula custom nouă clasifică ce era înainte necunoscut', legacy('Servetele', cuCustom).clasa === 'EXCLUS'
  && legacy('Servetele', IMPLICITE).auto === true);
// custom care contrazice un implicit: cine e primul în listă câștigă — exact ca azi
const custPrimul = [{ pattern: 'carne', clasa: 'EXCLUS' as const }, ...IMPLICITE];
const custUltimul = [...IMPLICITE, { pattern: 'carne', clasa: 'EXCLUS' as const }];
t('custom ÎNAINTEA implicitului câștigă', legacy('Carne', custPrimul).clasa === 'EXCLUS');
t('custom DUPĂ implicit pierde — prima potrivire, ca azi', legacy('Carne', custUltimul).clasa === 'FOOD');
// canonic: regulile utilizatorului au întotdeauna prioritate — nu se schimbă nimic aici
t('canonic: regula utilizatorului bate implicitul (comportamentul de azi)',
  clasificaCategorie29('Carne', [{ pattern: 'carne', categorie: 'OTHER' }]).categorie === 'OTHER');

console.log('\n— 5. Migrarea stării salvate: sigură, fără ștergeri —');
// o stare salvată ÎNAINTE de F1: cele 4 reguli vechi + una a omului, fără marcajul de migrare
const salvat = { ...genereazaSeed(), reguliImplicite: undefined, reguli: [...VECHI, { pattern: 'servetele', clasa: 'EXCLUS' as const }] };
const migrat = migreaza(JSON.parse(JSON.stringify(salvat)));
t('nicio regulă existentă nu e ștearsă', salvat.reguli.every(r => migrat.reguli.some(m => m.pattern === r.pattern && m.clasa === r.clasa)));
t('regulile existente rămân ÎN FAȚĂ, în ordinea lor',
  migrat.reguli.slice(0, salvat.reguli.length).every((r, i) => r.pattern === salvat.reguli[i].pattern));
t('regula custom rămâne cu prioritatea ei', legacy('Servetele', migrat.reguli).clasa === 'EXCLUS');
t('implicitele noi intră DUPĂ', migrat.reguli.length > salvat.reguli.length
  && migrat.reguli.some(r => r.pattern === 'cleaning'));
t('nu apar duplicate de tipar', new Set(migrat.reguli.map(r => r.pattern)).size === migrat.reguli.length);
t('CLEANING e acum clasificat și pe starea migrată', legacy('CLEANING', migrat.reguli).clasa === 'EXCLUS'
  && legacy('CLEANING', migrat.reguli).auto === false);
const faraReguli = migreaza(JSON.parse(JSON.stringify({ ...genereazaSeed(), reguliImplicite: undefined, reguli: undefined })));
t('stare fără reguli → primește implicitele', faraReguli.reguli.length === REGULI_IMPLICITE_29.length);
t('migrarea e idempotentă', migreaza(JSON.parse(JSON.stringify(migrat))).reguli.length === migrat.reguli.length);
t('imbinaReguli nu atinge lista existentă', (() => {
  const ex = [{ pattern: 'x', clasa: 'FOOD' as const }];
  const copie = JSON.stringify(ex);
  imbinaReguli(ex, IMPLICITE);
  return JSON.stringify(ex) === copie;
})());

console.log('\n— 6. FC Curat: ecranul Food Cost și Control Tower dau aceeași cifră —');
//  net 2000 · FOOD 500 · PAPER 60 · CLEANING 40 (engleză!) · Servetele 10 (custom EXCLUS)
//  curat = 500 + 60 = 560 → 28,00 %   (înainte: CLEANING și Servetele cădeau pe FOOD → 30,5 %)
const S: AppState = {
  ...stareGoala(),
  reguli: [...IMPLICITE, { pattern: 'servetele', clasa: 'EXCLUS' }],
  locatii: [{ cod: 'L01', nume: 'L01' }],
  salesReport: [{ data: '2026-08-05', locatie: 'L01', canal: 'INSTORE', net: 2000 }],
  linii29: [
    { perioada: '2026-08', locatie: 'L01', categorie: 'FOOD', valoare: 500 },
    { perioada: '2026-08', locatie: 'L01', categorie: 'PAPER', valoare: 60 },
    { perioada: '2026-08', locatie: 'L01', categorie: 'CLEANING', valoare: 40 },
    { perioada: '2026-08', locatie: 'L01', categorie: 'Servetele', valoare: 10 },
  ],
};
const ctx = buildCtx(S);
const vechi = fcPerioada(S, ctx, '2026-08', 'RETEA');
const nou = nboFC(S, { perioada: perioadaDin('2026-08-01', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' });
t('Food Cost (motor vechi): consum curat = 560', aprox(vechi.consumCurat, 560), `${vechi.consumCurat}`);
t('Control Tower (nboFC): consumFC = 560', nou.disponibil && aprox(nou.consumFC, 560), `${nou.consumFC}`);
t('FC Curat = 28,00 % în ambele', vechi.fcCurat !== null && aprox(vechi.fcCurat, 28) && aprox(nou.consumFC / 2000 * 100, 28));
t('excluderile = 50 (CLEANING + custom)', aprox(vechi.excluderi, 50));
t('paper29 = 60 (PAPER în engleză e recunoscut)', aprox(vechi.paper29, 60));
t('nicio categorie „neclasificată" în Tower', nou.categoriiNeclasificate.length === 0, nou.categoriiNeclasificate.join(','));
// și cu regulile VECHI, ca să se vadă ce se repară
const Svechi = { ...S, reguli: VECHI };
const fcVechi = fcPerioada(Svechi, buildCtx(Svechi), '2026-08', 'RETEA');
t('(înainte de fix ar fi fost 30,50 %)', fcVechi.fcCurat !== null && aprox(fcVechi.fcCurat, 30.5), `${fcVechi.fcCurat}`);


console.log('\n— 7. Migrarea rulează o singură dată: ce șterge omul rămâne șters —');
t('starea migrată poartă marcajul versiunii', migrat.reguliImplicite === VERSIUNE_REGULI_29);
t('seed-ul proaspăt îl poartă și el', stareGoala().reguliImplicite === VERSIUNE_REGULI_29 && genereazaSeed().reguliImplicite === VERSIUNE_REGULI_29);
// omul șterge „food" și „pui" din ecranul Food Cost, apoi aplicația se reîncarcă
const faraFood = { ...migrat, reguli: migrat.reguli.filter(r => r.pattern !== 'food' && r.pattern !== 'pui') };
const reincarcat = migreaza(JSON.parse(JSON.stringify(faraFood)));
t('o regulă implicită ștearsă NU revine la reîncărcare', !reincarcat.reguli.some(r => r.pattern === 'food' || r.pattern === 'pui'),
  `${reincarcat.reguli.length} reguli`);
t('… și numărul rămâne cel de după ștergere', reincarcat.reguli.length === faraFood.reguli.length);
t('golirea completă a listei rămâne golire', migreaza(JSON.parse(JSON.stringify({ ...migrat, reguli: [] }))).reguli.length === 0);
t('o stare veche, FĂRĂ marcaj, primește implicitele o dată', migreaza(JSON.parse(JSON.stringify({ ...salvat, reguliImplicite: undefined }))).reguli.length === migrat.reguli.length);
t('deduplicarea ignoră majusculele și diacriticele („Curățenie" = „curatenie")', (() => {
  const dublu = imbinaReguli([{ pattern: 'Curățenie', clasa: 'EXCLUS' }, { pattern: 'AMBALAJE', clasa: 'PAPER' }], IMPLICITE);
  return !dublu.some(r => r.pattern === 'curatenie') && !dublu.some(r => r.pattern === 'ambalaje')
    && dublu.length === IMPLICITE.length;
})());
t('setul NBO nu mai are o listă proprie: aceleași implicite, derivate',
  JSON.stringify(genereazaSeedNBO().reguli) === JSON.stringify(regulileImpliciteLegacy()) && genereazaSeedNBO().reguliImplicite === VERSIUNE_REGULI_29);
t('pe setul NBO, CLEANING e EXCLUS și în FC Curat', clasifica('CLEANING', genereazaSeedNBO().reguli).clasa === 'EXCLUS');

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
