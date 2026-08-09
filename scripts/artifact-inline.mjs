// Împachetează build-ul Vite într-un singur fișier, pentru publicare ca Artifact.
// Artifact-ul furnizează el <!doctype>/<html>/<head>/<body>, deci emitem DOAR conținutul.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST = resolve(process.cwd(), 'dist');
const iesire = process.argv[2] ?? resolve(process.cwd(), 'fryday-app.html');

const assets = readdirSync(join(DIST, 'assets'));
const js = assets.find(f => f.endsWith('.js'));
const css = assets.find(f => f.endsWith('.css'));
if (!js) { console.error('Nu găsesc bundle-ul JS în dist/assets.'); process.exit(1); }

const codJs = readFileSync(join(DIST, 'assets', js), 'utf8');
const codCss = css ? readFileSync(join(DIST, 'assets', css), 'utf8') : '';

// </script> în interiorul codului ar închide devreme tagul
const jsSigur = codJs.replace(/<\/script>/gi, '<\\/script>');

const html = `<title>FRYDAY Food Intelligence</title>
<style>
${codCss}
/* fundal explicit: artifact-ul compune peste fundalul gazdei */
html, body { background: hsl(43 26% 95%); min-height: 100%; }
</style>
<div id="root"></div>
<script type="module">
${jsSigur}
</script>
`;

writeFileSync(iesire, html);
console.log(`${iesire}  ${(html.length / 1024 / 1024).toFixed(2)} MB  (js ${(codJs.length / 1024).toFixed(0)} kB, css ${(codCss.length / 1024).toFixed(0)} kB)`);
