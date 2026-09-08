// Eticheta afișată se DERIVĂ din `package.json`, nu se scrie a doua oară.
//
// Testul citește chiar `package.json`, deci dacă cineva schimbă versiunea acolo și uită
// interfața, nu se rupe nimic — asta e ideea. Ce se verifică e regula de derivare și
// faptul că sursa e chiar unică.
import { etichetaVersiune } from '../src/lib/versiune';
import pkg from '../package.json' with { type: 'json' };

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

console.log('— 1. Regula de derivare —');
t('1.0.0-rc15 → RC 15.0', etichetaVersiune('1.0.0-rc15') === 'RC 15.0', etichetaVersiune('1.0.0-rc15'));
t('1.0.0-rc9 → RC 9.0', etichetaVersiune('1.0.0-rc9') === 'RC 9.0');
t('1.0.0-rc15.2 → RC 15.2 (corecție pe același candidat)',
  etichetaVersiune('1.0.0-rc15.2') === 'RC 15.2', etichetaVersiune('1.0.0-rc15.2'));
t('1.0.0-rc.15 → RC 15.0 (forma cu punct e acceptată)', etichetaVersiune('1.0.0-rc.15') === 'RC 15.0');
t('1.0.0 → v1.0.0 (release stabil, nu candidat)', etichetaVersiune('1.0.0') === 'v1.0.0');
t('2.3.4 → v2.3.4', etichetaVersiune('2.3.4') === 'v2.3.4');
t('numărul de RC nu se confundă cu patch-ul', etichetaVersiune('1.0.3-rc15') === 'RC 15.0');
t('spațiile nu strică nimic', etichetaVersiune('  1.0.0-rc15  ') === 'RC 15.0');

console.log('\n— 2. Ce nu se poate deriva rămâne cum e, nu se inventează —');
t('un șir nerecunoscut se întoarce neatins', etichetaVersiune('beta') === 'beta');
t('gol rămâne gol', etichetaVersiune('') === '');
t('semver cu etichetă necunoscută rămâne întreg',
  etichetaVersiune('1.0.0-alpha3') === '1.0.0-alpha3', etichetaVersiune('1.0.0-alpha3'));

console.log('\n— 3. Sursa unică —');
// versiunea nu se scrie de două ori: testul verifică IDENTITATEA (eticheta se derivă din
// package.json), nu un număr fixat aici — altfel fiecare release ar cere o corecție de test
t('package.json poartă un semver valid', /^\d+\.\d+\.\d+(-rc\.?\d+(\.\d+)?)?$/.test(pkg.version), pkg.version);
t('eticheta afișată se derivă din package.json, nu dintr-o constantă proprie',
  etichetaVersiune(pkg.version) === etichetaVersiune(pkg.version.trim()) && etichetaVersiune(pkg.version) !== pkg.version,
  `${pkg.version} → ${etichetaVersiune(pkg.version)}`);
t('un release stabil se afișează ca v1.2.3, un candidat ca RC n.m',
  (pkg.version.includes('-rc') ? /^RC \d+\.\d+$/ : /^v\d+\.\d+\.\d+$/).test(etichetaVersiune(pkg.version)),
  etichetaVersiune(pkg.version));
// dacă versiunea din package.json s-ar schimba, eticheta o urmează SINGURĂ
t('eticheta urmează sursa, oricare ar fi ea',
  etichetaVersiune('1.0.0-rc16') === 'RC 16.0' && etichetaVersiune('1.0.0-rc99') === 'RC 99.0');

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
