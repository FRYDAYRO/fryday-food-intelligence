/**
 * Un raport care nu-și declară restaurantul e refuzat — corect: altfel rândurile ar cădea tăcut pe
 * primul restaurant din nomenclator. Refuzul are însă o singură ieșire: omul declară restaurantul.
 *
 * Blocajul reprodus pe 09.09.2026, pe o aplicație proaspătă: selectorul „Restaurant (dacă fișierul
 * nu îl conține)" din Import Center lista DOAR locațiile existente. Pe o stare goală lista e goală,
 * deci mesajul cerea o declarație imposibil de dat. Identitatea verificată aici: pentru orice stare,
 * inclusiv una fără nicio locație, există cel puțin o opțiune de declarat, iar declararea deblochează
 * importul și îl pune pe restaurantul ALES, nu pe altul.
 */
import { stareGoala } from '../src/lib/seed';
import { optiuniRestaurant, accesTower } from '../src/lib/fc-tower';
import { pregatesteImport } from '../src/lib/import-center';
import { RESTAURANTE_FRYDAY } from '../src/lib/restaurante-fryday';
import type { AppState } from '../src/lib/types';
import type { Parsat } from '../src/lib/importer';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { TowerProvider } from '../src/views/tower/context';
import ImportCenter from '../src/views/tower/ImportCenter';
import { buildCtx } from '../src/lib/engine';
import { selectieImplicita } from '../src/lib/fc-tower';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const ACUM = '2026-09-09T12:00:00.000Z';
// un 4.7 tabelar FĂRĂ coloană de restaurant — forma care declanșează blocajul
const parsat: Parsat = {
  foaie: 'Sheet1',
  antete: ['Denumire', 'Cantitate', 'Valoare'],
  randuri: [
    { Denumire: 'Bere Corona', Cantitate: 2, Valoare: 31.98 },
    { Denumire: 'Budweiser', Cantitate: 1, Valoare: 18.99 },
  ],
};
const cerere = (state: AppState, locatie?: string) => pregatesteImport(state, {
  fisier: '4.7.xlsx', parsat, tip: 'PMIX_47', acum: ACUM,
  ...(locatie ? { locatie } : {}),
});
const blocante = (p: ReturnType<typeof pregatesteImport>) =>
  p.rezultat.diagnostice.filter(d => d.nivel === 'BLOCANT').map(d => d.cod);

console.log('— 1. Fără declarație, importul e refuzat (garda rămâne) —');
const GOALA: AppState = { ...stareGoala(), locatii: [] };
{
  const p = cerere(GOALA);
  t('un raport fără restaurant e blocat', blocante(p).includes('LOCATIE_LIPSA'), blocante(p).join());
  t('… și nu se activează', p.rezultat.stare === 'RESPINS', String(p.rezultat.stare));
}

console.log('\n— 2. Există întotdeauna ce declara, chiar pe o aplicație goală —');
const acces = accesTower(GOALA, null, false);
{
  const o = optiuniRestaurant(GOALA, acces);
  t('starea goală nu are nicio locație', GOALA.locatii.length === 0);
  t('… dar selectorul oferă restaurantele oficiale', o.reale.length > 0, `${o.reale.length} opțiuni`);
  t('… toate marcate ca fiind încă fără date', o.reale.every(x => !x.areDate));
  t('lista acoperă rețeaua cunoscută', o.reale.length === RESTAURANTE_FRYDAY.length, `${o.reale.length}/${RESTAURANTE_FRYDAY.length}`);
}

console.log('\n— 3. Declararea deblochează, pe restaurantul ALES —');
for (const nume of ['FRYDAY CLUJ MEMO', 'FRYDAY RM VALCEA DT']) {
  const p = cerere(GOALA, nume);
  t(`„${nume}" ⇒ fără blocaj de locație`, !blocante(p).includes('LOCATIE_LIPSA'), blocante(p).join() || '—');
  t('… scop RESTAURANT, pe cel ales', p.rezultat.scop === 'RESTAURANT' && p.rezultat.restaurante.join() === nume,
    `${p.rezultat.scop} ${JSON.stringify(p.rezultat.restaurante)}`);
}

console.log('\n— 4. Un restaurant care are deja date nu se oferă de două ori —');
{
  const cuCluj: AppState = { ...stareGoala(), locatii: [{ cod: 'FRYDAY CLUJ MEMO', nume: 'FRYDAY CLUJ MEMO' }] };
  const o = optiuniRestaurant(cuCluj, accesTower(cuCluj, null, false));
  t('apare o singură dată, în grupul cu date',
    o.dinDate.filter(x => x.eticheta === 'FRYDAY CLUJ MEMO').length === 1
    && o.reale.every(x => x.eticheta !== 'FRYDAY CLUJ MEMO'));
}

console.log('\n— 5. Un manager nu poate declara restaurantul altcuiva —');
{
  const cuDoua: AppState = { ...stareGoala(), locatii: [
    { cod: 'L01', nume: 'FRYDAY CLUJ MEMO' }, { cod: 'L02', nume: 'FRYDAY TIMISOARA IULIUS TOWN' },
  ] };
  const mgr = accesTower(cuDoua, { rol: 'MANAGER', locatie: 'L02', email: 'mgr@f.ro' }, true);
  const o = optiuniRestaurant(cuDoua, mgr);
  t('selectorul e blocat pe unitatea lui', o.blocatLa === 'L02', String(o.blocatLa));
  t('… și nu i se oferă niciun alt restaurant',
    o.reale.length === 0 && o.dinDate.every(x => x.valoare === 'L02'),
    `reale=${o.reale.length} dinDate=${JSON.stringify(o.dinDate.map(x => x.valoare))}`);
}

console.log('\n— 6. Ecranul chiar oferă opțiunile (nu doar motorul le calculează) —');
{
  // reparația e în componentă, deci proba trebuie să treacă prin componentă: altfel un selector
  // care rămâne legat de `state.locatii` ar trece toate testele de mai sus și ar bloca omul la fel
  const ctxTower = {
    state: GOALA, ctx: buildCtx(GOALA), acces,
    sel: selectieImplicita(GOALA, acces), setSel: () => { /* static */ },
    update: () => { /* static */ },
  };
  const html = renderToStaticMarkup(
    h(TowerProvider, { value: ctxTower as never }, h(ImportCenter)) as never,
  );
  t('selectorul de restaurant e randat', html.includes('locatie-import'));
  t('… și conține restaurante de ales, deși aplicația e goală',
    html.includes('FRYDAY CLUJ MEMO') && html.includes('FRYDAY RM VALCEA DT'));
  t('… grupate ca fiind încă fără date', html.includes('fără date încă'));
}

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
