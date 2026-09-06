// Coada de aprobare și compatibilitatea perioadelor.
// Proprietatea centrală: aplicația propune, omul decide. Nimic nu se aprobă singur.
import { stareGoala } from '../src/lib/seed';
import {
  aliasuriDin, coadaAprobare, rezumaCoada, scorPotrivire, sugereaza, valideazaDecizie,
  type DecizieAprobare,
} from '../src/lib/aprobare';
import { MESAJ_INCOMPATIBIL, compatibilitate } from '../src/lib/compatibilitate';
import type { AppState, Produs } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const prod = (den: string): Produs =>
  ({ cod: den, denumire: den, categorie: 'T', tip: 'SIMPLU', pretInstore: 10, pretDelivery: 12, tva: 11, activ: true });
const S: AppState = { ...stareGoala(),
  produse: [prod('MILKSHAKE VANILIE'), prod('MILKSHAKE CIOCOLATA'), prod('CHEESEBURGER')],
  nemapate: [
    { denumire: 'MILKSHAKE VANILIE MARE', categorie: 'DESERT', cant: 10, valoare: 250, fisier: '4.7.pdf' },
    { denumire: 'PRODUS NECUNOSCUT XYZ', categorie: 'ALTE', cant: 2, valoare: 1200, fisier: '4.7.pdf' },
    { denumire: 'MILKSHAKE CIOCOLATA MIC', categorie: 'DESERT', cant: 5, valoare: 80, fisier: '4.7.pdf' },
  ] };

console.log('\n— A. Coada: ce nu s-a mapat, vizibil —');
const c = coadaAprobare(S);
t('toate nepotrivirile intră în coadă', c.length === 3);
t('ordonate după cât cântăresc, nu alfabetic',
  c[0].valoareSursa === 'PRODUS NECUNOSCUT XYZ' && c[0].greutate === 1200,
  'primul rând e cel care doare');
t('fiecare poartă sursa', c.every(x => x.sursa === '4.7.pdf'));
t('fiecare spune de ce e acolo', c.every(x => x.motiv.includes('nu corespunde')));
t('… și consecința: nu intră în Food Cost', c.every(x => x.motiv.includes('Food Cost')));
t('greutatea e în lei', c.every(x => x.unitateGreutate === 'RON'));
t('id-ul e stabil pentru aceeași denumire',
  coadaAprobare(S)[0].id === coadaAprobare(S)[0].id && c[0].id.startsWith('PRODUS:'));

console.log('\n— B. Sugestii: propuse, NICIODATĂ aplicate —');
const ms = c.find(x => x.valoareSursa === 'MILKSHAKE VANILIE MARE')!;
t('un nume apropiat primește sugestii', ms.sugestii.length > 0);
t('cea mai bună sugestie e cea corectă', ms.sugestii[0].tinta === 'MILKSHAKE VANILIE');
t('dar NU e aplicată — rândul rămâne în coadă', c.includes(ms));
t('sugestia spune că e doar o sugestie',
  ms.sugestii.every(s => /sugestie|confirmat/i.test(s.explicatie)));
t('un nume fără corespondent nu primește sugestii inventate',
  c.find(x => x.valoareSursa === 'PRODUS NECUNOSCUT XYZ')!.sugestii.length === 0);
t('scorul e simetric', scorPotrivire('A B', 'B A') === 100);
t('cuvintele în plus scad scorul', scorPotrivire('MILKSHAKE VANILIE MARE', 'MILKSHAKE VANILIE') < 100);
t('denumiri fără nimic comun dau 0', scorPotrivire('ALFA', 'BETA') === 0);
t('pragul filtrează zgomotul', sugereaza('ALFA BETA GAMA', ['ZZZ YYY XXX']).length === 0);
t('sugestiile sunt limitate ca număr',
  sugereaza('A', Array.from({ length: 50 }, (_, i) => `A ${i}`)).length <= 5);
t('două milkshake-uri diferite NU se confundă între ele',
  (() => {
    const s1 = sugereaza('MILKSHAKE VANILIE MARE', ['MILKSHAKE VANILIE', 'MILKSHAKE CIOCOLATA']);
    return s1[0].tinta === 'MILKSHAKE VANILIE' && (s1[1]?.scor ?? 0) < s1[0].scor;
  })());

console.log('\n— C. Deciziile omului —');
const dec: DecizieAprobare[] = [
  { id: ms.id, tinta: 'MILKSHAKE VANILIE', actor: 'valentin', data: '2026-08-29T21:00:00Z' },
];
t('o decizie luată scoate rândul din coadă',
  !coadaAprobare(S, dec).some(x => x.id === ms.id));
t('celelalte rămân', coadaAprobare(S, dec).length === 2);
t('aprobarea devine alias pentru importator',
  aliasuriDin(dec, c)['MILKSHAKE VANILIE MARE'] === 'MILKSHAKE VANILIE');
t('o RESPINGERE explicită nu produce alias',
  Object.keys(aliasuriDin([{ id: ms.id, tinta: null, actor: 'v', data: 'x' }], c)).length === 0);
t('… dar scoate rândul din coadă — decizia e luată',
  !coadaAprobare(S, [{ id: ms.id, tinta: null, actor: 'v', data: 'x' }]).some(x => x.id === ms.id),
  'diferența dintre „nu are corespondent" și „nu m-am uitat încă"');
t('o țintă inexistentă e refuzată',
  !valideazaDecizie({ id: ms.id, tinta: 'NU EXISTA', actor: 'v', data: 'x' }, S).valida);
t('… cu motiv', (valideazaDecizie({ id: ms.id, tinta: 'NU EXISTA', actor: 'v', data: 'x' }, S).motiv ?? '')
  .includes('nu există'));
t('o aprobare fără autor e refuzată',
  !valideazaDecizie({ id: ms.id, tinta: 'MILKSHAKE VANILIE', actor: '  ', data: 'x' }, S).valida);
t('o țintă validă trece', valideazaDecizie(dec[0], S).valida);
t('respingerea nu cere țintă validă',
  valideazaDecizie({ id: ms.id, tinta: null, actor: 'v', data: 'x' }, S).valida);

console.log('\n— D. Rezumatul cozii —');
const r = rezumaCoada(c);
t('numără total', r.total === 3);
t('numără pe fel', r.peFel.PRODUS === 3 && r.peFel.MATERIAL === 0);
t('însumează leii neaprobați', r.greutateRON === 1530);
t('spune câte au sugestii', r.cuSugestii === 2);
t('o coadă goală se rezumă la zero', rezumaCoada([]).total === 0 && rezumaCoada([]).greutateRON === 0);

console.log('\n— E. Compatibilitatea perioadelor —');
const I = (raport: string, de: string, la: string) => ({ raport, de, la });
const identic = compatibilitate([I('4.7', '2026-08-17', '2026-08-23'), I('2.9', '2026-08-17', '2026-08-23')]);
t('intervale identice sunt compatibile', identic.compatibile && identic.fel === 'IDENTIC');
t('… și se spune care e intervalul', identic.motiv.includes('2026-08-17'));

// exact cazul de pe fișierele reale
const real = compatibilitate([I('4.7', '2026-08-17', '2026-08-23'), I('2.9', '2026-08-01', '2026-08-09')]);
t('cazul REAL (4.7 17–23 aug vs 2.9 1–9 aug) e DISJUNCT', real.fel === 'DISJUNCT');
t('… deci incompatibil', !real.compatibile);
t('… cu zero zile comune', real.zileComune === 0);
t('… iar lungimile diferite sunt vizibile', real.zile['2.9'] === 9 && real.zile['4.7'] === 7);
t('… și motivul numește ambele intervale',
  real.motiv.includes('2026-08-17') && real.motiv.includes('2026-08-01'));

const partial = compatibilitate([I('4.7', '2026-08-17', '2026-08-23'), I('2.9', '2026-08-20', '2026-08-26')]);
t('suprapunerea parțială NU e compatibilă', !partial.compatibile && partial.fel === 'SUPRAPUNERE_PARTIALA');
t('… se numără zilele comune', partial.zileComune === 4);
t('… și se explică de ce e periculoasă',
  partial.motiv.includes('consumul unei perioade la vânzările alteia'));
t('același început, sfârșit diferit ⇒ NU e identic',
  (() => {
    const x = compatibilitate([I('4.7', '2026-08-17', '2026-08-23'), I('2.9', '2026-08-17', '2026-08-30')]);
    return x.fel !== 'IDENTIC' && !x.compatibile && x.zile['2.9'] === 14;
  })(),
  'o săptămână și două săptămâni care încep la fel nu sunt același interval');
t('același sfârșit, început diferit ⇒ NU e identic',
  !compatibilitate([I('4.7', '2026-08-17', '2026-08-23'), I('2.9', '2026-08-10', '2026-08-23')]).compatibile);
t('un interval nedeclarat printre altele valide oprește comparația',
  (() => {
    const x = compatibilitate([I('4.7', '2026-08-17', '2026-08-23'),
      I('2.9', '2026-08-17', '2026-08-23'), I('4.1', '', '')]);
    return x.fel === 'NEDECLARAT' && !x.compatibile;
  })(),
  'două compatibile plus unul necunoscut nu dau un rezultat sigur');
t('… iar motivul spune că lipsește intervalul',
  compatibilitate([I('4.7', '2026-08-17', '2026-08-23'), I('2.9', '2026-08-17', '2026-08-23'), I('4.1', '', '')])
    .motiv.includes('nu declară intervalul'));
t('un interval nedeclarat oprește comparația',
  compatibilitate([I('4.7', '2026-08-17', '2026-08-23'), I('2.9', '', '')]).fel === 'NEDECLARAT');
t('un singur raport nu se compară cu nimic',
  compatibilitate([I('4.7', '2026-08-17', '2026-08-23')]).fel === 'NEDECLARAT');
t('trei rapoarte identice rămân compatibile',
  compatibilitate([I('4.7', '2026-08-17', '2026-08-23'), I('2.9', '2026-08-17', '2026-08-23'),
    I('4.1', '2026-08-17', '2026-08-23')]).compatibile);
t('unul singur diferit strică tot',
  !compatibilitate([I('4.7', '2026-08-17', '2026-08-23'), I('2.9', '2026-08-17', '2026-08-23'),
    I('4.1', '2026-06-15', '2026-06-21')]).compatibile);
t('mesajul pentru ecran e explicit', MESAJ_INCOMPATIBIL.includes('fără sens'));
t('nu se normalizează și nu se extrapolează nimic',
  partial.zile['4.7'] === 7 && partial.zile['2.9'] === 7 && !partial.compatibile,
  'zilele se raportează ca atare, combinarea rămâne refuzată');

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
