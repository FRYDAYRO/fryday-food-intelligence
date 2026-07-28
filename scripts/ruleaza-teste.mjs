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
    '--format=cjs', `--outfile=${iesire}`, '--log-level=error'], { stdio: 'inherit' });
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
  const esuate = linii.filter(l => l.includes('✘'));
  console.log(`${f.padEnd(22)} ${rezumat}`);
  for (const l of esuate) console.log('   ', l.trim());
}
console.log(`\n──────────────\nTOTAL: ${totalTrecute} teste trecute, ${totalEsuate} eșuate`);
process.exit(totalEsuate > 0 ? 1 : 0);
