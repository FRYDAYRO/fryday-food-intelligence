// Bariera de erori: o excepție într-un ecran nu albește aplicația.
//
// Randarea pe server NU declanșează barierele: React re-aruncă eroarea în loc s-o prindă,
// iar un harness cu DOM ar cere o dependență nouă pentru un singur test. Aici se verifică
// deci CONTRACTUL componentei, bucată cu bucată — exact metodele pe care React le apelează:
// `getDerivedStateFromError` (prinderea), `render` cu stare de eroare (fallback-ul),
// `componentDidCatch` (logarea) și `getDerivedStateFromProps` (ridicarea barierei).
// Fiecare e chemată direct, cu aceleași argumente pe care i le-ar da React.
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h, type ReactNode } from 'react';
import { Bariera } from '../src/views/shared/Bariera';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

// consola se reține, ca testul să nu-și verse zgomotul — dar se și VERIFICĂ,
// fiindcă „nu ascunde eroarea din logging" e o cerință, nu o preferință
const erori: unknown[][] = [];
const consolaReala = console.error;
console.error = (...a: unknown[]) => { erori.push(a); };
const randeaza = (n: ReactNode): string => {
  try { return renderToStaticMarkup(n as never); } finally { /* consola rămâne redirecționată */ }
};

const Bun = () => h('div', { 'data-ok': '1' }, 'conținut normal');

/** Bariera așa cum arată DUPĂ ce React i-a dat eroarea — fără DOM, doar contractul. */
const cazuta = (eroare: Error, zona?: string): string => {
  const b = new Bariera({ children: h(Bun), ...(zona ? { zona } : {}) });
  b.state = { eroare, ...Bariera.getDerivedStateFromError(eroare) } as never;
  return renderToStaticMarkup(b.render() as never);
};

console.log('— 1. Fără eroare, bariera e transparentă —');
const curat = randeaza(h(Bariera, null, h(Bun)));
t('conținutul trece neatins', curat.includes('data-ok="1"') && curat.includes('conținut normal'));
t('fallback-ul NU apare', !curat.includes('bariera-eroare'));
t('nimic în consolă', erori.length === 0, `${erori.length}`);

console.log('\n— 2. Cu eroare, aplicația NU rămâne albă —');
const eroare = new Error('cost indisponibil');
const cazut = cazuta(eroare, 'Rețetar');
t('se randează ceva, nu gol', cazut.trim().length > 200, `${cazut.length} caractere`);
t('fallback-ul e marcat', cazut.includes('data-zona="bariera-eroare"'));
t('e anunțat ca alertă (accesibilitate)', cazut.includes('role="alert"'));
t('zona e numită în cuvintele omului', cazut.includes('Rețetar'), 'zona="Rețetar"');
t('spune că datele sunt salvate', cazut.includes('Datele tale sunt salvate'));
t('spune că restul aplicației merge', /nu aplicația/.test(cazut));

console.log('\n— 3. Recuperare —');
t('există buton de reîncercare', cazut.includes('data-actiune="reia"'));
t('există buton de reîncărcare', cazut.includes('data-actiune="reincarca"'));
t('butoanele sunt butoane reale, nu text', (cazut.match(/<button/g) ?? []).length >= 2,
  `${(cazut.match(/<button/g) ?? []).length} butoane`);

console.log('\n— 4. Eroarea NU e ascunsă —');
t('detaliul tehnic e disponibil, dar pliat', cazut.includes('<details') && cazut.includes('Detaliul tehnic'));
t('mesajul erorii e vizibil în detaliu', cazut.includes('cost indisponibil'));
t('trimite la consolă pentru traseul complet', /consola browserului/.test(cazut));
// componentDidCatch e chemat exact cum îl cheamă React
const b = new Bariera({ children: null, zona: 'Rețetar' });
b.componentDidCatch(eroare, { componentStack: '\n  at Retetar' } as never);
t('A SCRIS în consolă', erori.length >= 1, `${erori.length} apeluri`);
t('… cu marcaj FRYDAY și zona', String(erori[0]?.[0] ?? '').includes('[FRYDAY]')
  && String(erori[0]?.[0] ?? '').includes('Rețetar'), String(erori[0]?.[0] ?? ''));
t('… și cu obiectul Error, nu doar un text',
  erori[0]?.[1] instanceof Error && (erori[0][1] as Error).message === 'cost indisponibil');

console.log('\n— 5. Notificarea gazdei —');
let primit: Error | null = null;
const bn = new Bariera({ children: null, onEroare: (e: Error) => { primit = e; } });
bn.componentDidCatch(new Error('x'), { componentStack: '' } as never);
t('onEroare e chemat cu eroarea', primit !== null && (primit as unknown as Error).message === 'x');
t('… iar absența lui nu strică nimic', (() => {
  try { new Bariera({ children: null }).componentDidCatch(new Error('y'), { componentStack: '' } as never); return true; }
  catch { return false; }
})());

console.log('\n— 6. Bariera se ridică la schimbarea zonei —');
// contractul care face recuperarea posibilă: fără el, un ecran căzut ar rămâne căzut
// și după ce omul trece la alt modul
const cuStare = (cheie: string | undefined, eroare: Error | null) =>
  Bariera.getDerivedStateFromProps({ children: null, cheie }, { cheie: 'retetar', eroare });
t('cheie nouă ⇒ eroarea se șterge',
  cuStare('foodcost', new Error('e'))?.eroare === null);
t('… și se reține noua cheie', cuStare('foodcost', new Error('e'))?.cheie === 'foodcost');
t('aceeași cheie ⇒ starea rămâne (nu se reia la fiecare randare)',
  cuStare('retetar', new Error('e')) === null);
t('getDerivedStateFromError întoarce eroarea',
  Bariera.getDerivedStateFromError(new Error('z'))?.eroare instanceof Error);

console.log('\n— 7. „Încearcă din nou" chiar șterge eroarea —');
const br = new Bariera({ children: h(Bun) });
br.state = { eroare: new Error('e') };
let cerut: unknown = null;
br.setState = ((patch: unknown) => { cerut = patch; }) as never;
// se apelează handlerul chiar din elementul randat, nu o copie a lui
const el = br.render() as { props: { children: ReactNode } };
const gasesteReia = (n: unknown): (() => void) | null => {
  const x = n as { props?: { children?: unknown; onClick?: () => void; 'data-actiune'?: string } };
  if (!x || typeof x !== 'object') return null;
  if (x.props?.['data-actiune'] === 'reia' && x.props.onClick) return x.props.onClick;
  const c = x.props?.children;
  for (const k of Array.isArray(c) ? c : [c]) { const r = gasesteReia(k); if (r) return r; }
  return null;
};
const reia = gasesteReia(el);
t('butonul „Încearcă din nou" are un handler', reia !== null);
reia?.();
t('… care cere ștergerea erorii', (cerut as { eroare?: unknown } | null)?.eroare === null,
  JSON.stringify(cerut));

console.error = consolaReala;
console.log(`\n${ok} teste trecute, ${fail} eșuate`);
