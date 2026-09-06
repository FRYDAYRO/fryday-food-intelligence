/**
 * Versiunea aplicației — o singură sursă de adevăr: `package.json`.
 *
 * Eticheta afișată se DERIVĂ din semver, nu se scrie a doua oară. Trei numere care se
 * bat cap în cap (constanta din interfață, `package.json` și numele unei arhive) nu sunt
 * o problemă de estetică: când ceva merge prost în producție, prima întrebare e „ce
 * versiune rulează?", iar trei răspunsuri diferite înseamnă niciunul.
 *
 * Modulul e pur, ca tot ce stă în `lib/`: primește șirul, nu-l citește din mediu. Injecția
 * la build se face în `App.tsx`, unde există un bundler — altfel suitele de teste, care
 * rulează în Node prin esbuild, ar cădea pe o constantă globală inexistentă.
 */

/** `1.0.0-rc15` → `RC 15.0` · `1.0.0-rc15.2` → `RC 15.2` · `1.2.3` → `v1.2.3`. */
export function etichetaVersiune(semver: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-rc\.?(\d+)(?:\.(\d+))?)?$/.exec(semver.trim());
  if (!m) return semver.trim();
  const [, major, minor, patch, rc, rcMinor] = m;
  // un release candidate se numește după numărul lui de RC; a doua cifră permite
  // corecții pe același candidat (rc15.1) fără să pară un candidat nou
  if (rc !== undefined) return `RC ${rc}.${rcMinor ?? '0'}`;
  return `v${major}.${minor}.${patch}`;
}
