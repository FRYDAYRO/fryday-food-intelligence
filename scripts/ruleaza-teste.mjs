// Rulează toate suitele de teste: le compilează cu esbuild și le execută în Node.
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const dirTeste = resolve(process.cwd(), 'teste');
const temp = mkdtempSync(join(tmpdir(), 'fryday-teste-'));
const fisiere = readdirSync(dirTeste).filter(f => f.endsWith('.ts')).sort();

let totalTrecute = 0, totalEsuate = 0;
for (const f of fisiere) {
  const iesire = join(temp, f.replace('.ts', '.cjs'));
  execFileSync('npx', ['esbuild', join(dirTeste, f), '--bundle', '--platform=node',
    '--format=cjs', `--outfile=${iesire}`, '--log-level=error',
    // pdf.js cere API-uri de randare la încărcare; extragerea de text nu le folosește, deci stub-uri
    '--banner:js=globalThis.DOMMatrix??=class{};globalThis.Path2D??=class{};globalThis.ImageData??=class{};',
    // pdf.js folosește createRequire(import.meta.url); în CJS ar fi undefined
    '--define:import.meta.url="file:///fryday-teste.mjs"'],
    { stdio: 'inherit' });
  let out = '';
  try {
    out = execFileSync('node', [iesire], { encoding: 'utf8' });
  } catch (e) {
    out = (e.stdout ?? '') + (e.stderr ?? '');
  }
  const linii = out.trim().split('\n');
  const rezumat = linii[linii.length - 1] ?? '';
  const m = rezumat.match(/(\d+) teste trecute, (\d+) e/);
  if (m) { totalTrecute += +m[1]; totalEsuate += +m[2]; }
  else {
    // suita s-a oprit înainte de rezumat (excepție la încărcare sau în timpul rulării)
    totalEsuate += 1;
    console.log(`${f.padEnd(22)} SUITĂ CRĂPATĂ — fără rezumat:`);
    for (const l of linii.slice(-6)) console.log('   ', l.trim().slice(0, 140));
    continue;
  }
  const esuate = linii.filter(l => l.includes('✘'));
  console.log(`${f.padEnd(22)} ${rezumat}`);
  for (const l of esuate) console.log('   ', l.trim());
}
console.log(`\n──────────────\nTOTAL: ${totalTrecute} teste trecute, ${totalEsuate} eșuate`);
process.exit(totalEsuate > 0 ? 1 : 0);
