// Clasificarea categoriilor 2.9.
// Regula centrală verificată aici: NIMIC nu cade tăcut pe FOOD. O categorie nerecunoscută
// rămâne UNCLASSIFIED și se vede, ca să fie mapată explicit.
import {
  CATEGORII_FC, CATEGORII_OPERATIONALE, ETICHETA_CATEGORIE, REGULI_IMPLICITE_29,
  categorieMaterial, clasificaCategorie29, esteFC, esteOperational,
  EXCEPTII_MATERIAL_29, clasificaMaterial29, exceptieMaterial29, clasaMaterial29,
  type FCCategory, type RegulaCategorie29,
} from '../src/lib/fc-clasificare';
import { genereazaSeed } from '../src/lib/seed';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const cat = (s: string, reguli: RegulaCategorie29[] = []) => clasificaCategorie29(s, reguli);

// ————————————————————————————————————————————————————————— regula de aur

console.log('— Nimic nu cade tăcut pe FOOD —');
for (const necunoscut of ['Categorie inventată', 'ZZZ', 'Servicii externalizate', 'Transport marfă', '???']) {
  const c = cat(necunoscut);
  t(`„${necunoscut}" → UNCLASSIFIED, nu FOOD`, c.categorie === 'UNCLASSIFIED', c.categorie);
  t(`„${necunoscut}" e marcat explicit neclasificat`, c.neclasificat && c.regula === null && c.sursa === 'NECLASIFICAT');
}
t('categorie goală → UNCLASSIFIED, nu FOOD', cat('').categorie === 'UNCLASSIFIED');
t('categorie doar cu spații → UNCLASSIFIED', cat('   ').categorie === 'UNCLASSIFIED');
t('UNCLASSIFIED nu intră în Food Cost', !esteFC('UNCLASSIFIED'));
t('UNCLASSIFIED nu e nici operațional — e necunoscut', !esteOperational('UNCLASSIFIED'));

// ————————————————————————————————————————————————————————— categoriile din setul demo

console.log('\n— Categoriile reale din setul demo sunt mapate EXPLICIT —');
const asteptate: [string, FCCategory][] = [
  ['Carne și pui', 'FOOD'],
  ['Panificație', 'FOOD'],
  ['Legume și sosuri', 'FOOD'],
  ['Băuturi', 'FOOD'],
  ['Ulei și alte alimente', 'FOOD'],
  ['Ambalaje', 'PAPER'],
  ['Uniforme personal', 'UNIFORMS'],
  ['Consumabile administrative', 'STATIONERY'],
  ['Materiale curățenie', 'CLEANING'],
];
for (const [nume, cerut] of asteptate) {
  const c = cat(nume);
  t(`„${nume}" → ${cerut}`, c.categorie === cerut, `${c.categorie} prin regula „${c.regula}"`);
  t(`„${nume}" NU e marcat neclasificat`, !c.neclasificat);
}

console.log('\n— Toate categoriile din seed sunt acoperite, niciuna nu rămâne neclasificată —');
const seed = genereazaSeed();
const categoriiSeed = [...new Set(seed.linii29.map(l => l.categorie))];
const ramase = categoriiSeed.filter(c => clasificaCategorie29(c).neclasificat);
t('nicio categorie din seed nu mai e neclasificată', ramase.length === 0, ramase.join(', ') || '(niciuna)');
t('seed-ul chiar conține categoriile problematice din audit',
  categoriiSeed.includes('Carne și pui') && categoriiSeed.includes('Panificație'));

console.log('\n— Diacriticele nu contează la potrivire —');
for (const [cu, fara] of [['Materiale curățenie', 'Materiale curatenie'], ['Panificație', 'Panificatie'], ['Băuturi', 'Bauturi']]) {
  t(`„${cu}" și „${fara}" dau aceeași categorie`, cat(cu).categorie === cat(fara).categorie, cat(cu).categorie);
}
t('majusculele nu contează', cat('AMBALAJE').categorie === cat('ambalaje').categorie);

// ————————————————————————————————————————————————————————— ordinea regulilor

console.log('\n— Regula specifică bate regula generală —');
t('„Consumabile administrative" → STATIONERY, nu OPERATIONAL', cat('Consumabile administrative').categorie === 'STATIONERY');
t('„Consumabile curățenie" → CLEANING, nu OPERATIONAL', cat('Consumabile curățenie').categorie === 'CLEANING');
t('„Consumabile diverse" → OPERATIONAL (regula generală)', cat('Consumabile diverse').categorie === 'OPERATIONAL');
t('„Ulei și alte alimente" → FOOD', cat('Ulei și alte alimente').categorie === 'FOOD');
t('regulile implicite sunt ordonate de la specific la general',
  REGULI_IMPLICITE_29.findIndex(r => r.pattern === 'consumabile administrative')
  < REGULI_IMPLICITE_29.findIndex(r => r.pattern === 'consumabile'));

console.log('\n— Regulile utilizatorului au prioritate —');
const aleMele: RegulaCategorie29[] = [{ pattern: 'ambalaje', categorie: 'OTHER' }];
t('regula utilizatorului bate implicita', cat('Ambalaje', aleMele).categorie === 'OTHER');
t('sursa deciziei e raportată', cat('Ambalaje', aleMele).sursa === 'UTILIZATOR');
t('fără regulă proprie, decide implicita', cat('Ambalaje').sursa === 'IMPLICITA');
t('o regulă a utilizatorului poate rezolva o categorie necunoscută',
  cat('Transport marfă', [{ pattern: 'transport', categorie: 'OPERATIONAL' }]).categorie === 'OPERATIONAL');
t('regula cu pattern gol e ignorată, nu prinde tot',
  cat('Ceva necunoscut', [{ pattern: '', categorie: 'FOOD' }]).categorie === 'UNCLASSIFIED');

// ————————————————————————————————————————————————————————— apartenența la Food Cost

console.log('\n— Ce intră și ce nu intră în Food Cost —');
t('Food Cost = FOOD + PAPER + NORMALIZED', CATEGORII_FC.join(',') === 'FOOD,PAPER,NORMALIZED');
t('operaționalele sunt cele cinci', CATEGORII_OPERATIONALE.join(',') === 'CLEANING,OPERATIONAL,UNIFORMS,STATIONERY,OTHER');
t('cele două mulțimi nu se intersectează', !CATEGORII_FC.some(c => CATEGORII_OPERATIONALE.includes(c)));
t('UNCLASSIFIED nu e în niciuna',
  !CATEGORII_FC.includes('UNCLASSIFIED') && !CATEGORII_OPERATIONALE.includes('UNCLASSIFIED'));
t('fiecare categorie are etichetă în română',
  (['FOOD', 'PAPER', 'NORMALIZED', 'CLEANING', 'OPERATIONAL', 'UNIFORMS', 'STATIONERY', 'OTHER', 'UNCLASSIFIED'] as FCCategory[])
    .every(c => (ETICHETA_CATEGORIE[c] ?? '').length > 0));

// ————————————————————————————————————————————————————————— materiale normalizate

console.log('\n— Materialele normalizate —');
t('marcajul din sursă face materialul NORMALIZED, indiferent de categorie',
  categorieMaterial(cat('Carne și pui'), { normalizatInSursa: true }) === 'NORMALIZED');
t('ambalajul care nu apare în nicio rețetă devine NORMALIZED',
  categorieMaterial(cat('Ambalaje'), { areReteta: false }) === 'NORMALIZED');
t('ambalajul folosit în rețete rămâne PAPER',
  categorieMaterial(cat('Ambalaje'), { areReteta: true }) === 'PAPER');
t('alimentul fără rețetă NU devine normalizat — rămâne FOOD, iar puntea îl va marca neexplicat',
  categorieMaterial(cat('Carne și pui'), { areReteta: false }) === 'FOOD');
t('necunoscutul rămâne necunoscut chiar dacă are rețetă',
  categorieMaterial(cat('Zzz'), { areReteta: true }) === 'UNCLASSIFIED');
t('necunoscutul marcat normalizat în sursă rămâne UNCLASSIFIED — marcajul spune cum e manipulat, nu ce este',
  categorieMaterial(cat('Transport marfă'), { normalizatInSursa: true }) === 'UNCLASSIFIED');
t('ambalajul mapat pe nomenclator dar fără rețetă rămâne PAPER când semnul areIngredient e dat (gol de rețetar)',
  categorieMaterial(cat('Ambalaje'), { areReteta: false, areIngredient: true }) === 'PAPER');
t('fără semnul areIngredient, comportamentul vechi se păstrează',
  categorieMaterial(cat('Ambalaje'), { areReteta: false }) === 'NORMALIZED');
t('categoria „materiale normalizate" e recunoscută direct',
  cat('Materiale normalizate').categorie === 'NORMALIZED');
t('„semipreparate" e tratat ca material normalizat', cat('Semipreparate interne').categorie === 'NORMALIZED');
t('NORMALIZED intră în Food Cost', esteFC('NORMALIZED'));

// ————————————————————————————————————————————————————————— vocabularul NBO FRYDAY (decizia 06.09.2026)

console.log('\n— Categoriile 2.9 ale rețelei FRYDAY: ce intră în FC Curat —');
const inFC: [string, FCCategory][] = [
  ['Food 11%', 'FOOD'], ['Food 21%', 'FOOD'], ['Paper', 'PAPER'], ['Condimente', 'FOOD'],
  ['Drink 11%', 'FOOD'], ['DrinksSugar 21%', 'FOOD'], ['FRYCafe 21%', 'FOOD'], ['Alcool', 'FOOD'],
  ['MERCH RAW', 'FOOD'], ['Garantie sgr pet (Raw)', 'FOOD'], ['Garantie sgr aluminiu (Raw)', 'FOOD'],
  ['Garantie sgr sticla (Raw)', 'FOOD'], ['Diverse 21%', 'FOOD'], ['Toys', 'FOOD'],
];
for (const [c, a] of inFC) t(`${c} → ${a}, intră în FC Curat`, cat(c).categorie === a && esteFC(cat(c).categorie), cat(c).categorie);
const inAfara: [string, FCCategory][] = [
  ['Produse curatenie', 'CLEANING'], ['Operationale', 'OPERATIONAL'], ['UNIFORMA CREW & MANAGERI', 'UNIFORMS'], ['Birotica', 'STATIONERY'],
];
for (const [c, a] of inAfara) t(`${c} → ${a}, în afara FC`, cat(c).categorie === a && !esteFC(cat(c).categorie), cat(c).categorie);
t('ACCESORII singur (fără grupul Paper) rămâne neclasificat', cat('ACCESORII').categorie === 'UNCLASSIFIED');
t('ACCESORII sub grupul Paper, cum vine din 2.9, e PAPER', cat('Paper / ACCESORII').categorie === 'PAPER');
t('Consumabile diverse rămâne OPERATIONAL: nu e Diverse 21%', cat('Consumabile diverse').categorie === 'OPERATIONAL');
t('Chestii diverse rămâne neclasificat', cat('Chestii diverse').categorie === 'UNCLASSIFIED');

console.log('\n— Diverse 21%: excepțiile pe material —');
t('Biogon C (CO2 pentru băuturi) urmează categoria → FOOD', clasificaMaterial29('Diverse 21%', 'Biogon C E290 10kg').categorie === 'FOOD');
t('taxa de CO2 nu e aliment → OTHER, în afara FC', clasificaMaterial29('Diverse 21%', 'Alte taxe CO2 15kg').categorie === 'OTHER');
t('articolul de test → OTHER', clasificaMaterial29('Diverse 21%', 'Articol test').categorie === 'OTHER');
t('pompa Monin → OPERATIONAL', clasificaMaterial29('Diverse 21%', 'MONIN -PUMP 10ML (70CL GLASS)').categorie === 'OPERATIONAL');
t('excepția spune ce regulă a decis', clasificaMaterial29('Diverse 21%', 'Articol test').regula === 'diverse 21 · articol test' && !clasificaMaterial29('Diverse 21%', 'Articol test').neclasificat);
t('excepția nu se aplică în altă categorie', exceptieMaterial29('Food 11%', 'Articol test') === null && clasificaMaterial29('Food 11%', 'Articol test').categorie === 'FOOD');
t('fără denumire nu există excepție', exceptieMaterial29('Diverse 21%', '') === null);
t('toate excepțiile duc în afara FC', EXCEPTII_MATERIAL_29.every(e => !esteFC(e.rezultat)));
t('clasa pentru clasificatorul vechi respectă excepția', clasaMaterial29('Diverse 21%', 'Alte taxe CO2 15kg', () => 'FOOD') === 'EXCLUS' && clasaMaterial29('Diverse 21%', 'Biogon C E290 10kg', () => 'FOOD') === 'FOOD');
t('regulile utilizatorului nu trec peste excepția pe material', clasificaMaterial29('Diverse 21%', 'Articol test', [{ pattern: 'diverse', categorie: 'FOOD' }]).categorie === 'OTHER');

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
