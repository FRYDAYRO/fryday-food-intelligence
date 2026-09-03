// D1 — coada COMUNĂ de aprobare primește și materialele 2.9 fără corespondent în nomenclator.
//
// Contract:
//   · un material 2.9 necunoscut NU se creează și NU se mapează automat: intră în aceeași coadă
//     ca denumirile POS, marcat MATERIAL, cu leii lui (costActual) și proveniența;
//   · aprobarea scrie aliasul pe `Ingredient.aliasuri` (identitatea = codul de material, sau
//     denumirea când codul lipsește) și scoate intrarea din coadă;
//   · F3 funcționează și pe această cale: reimportul aceluiași 2.9 după alias trece ca
//     REIMPORT_MAPARE, iar materialul se leagă de ingredient în punte;
//   · o denumire POS și un material cu același text sunt două intrări diferite.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { importaPrinCentru, type CerereImport } from '../src/lib/import-center';
import { identitateSeRezolva, type Parsat } from '../src/lib/importer';
import { coadaAprobare, codIngredientPentru, felNemapat } from '../src/lib/aprobare';
import { reconciliationMaterialFC, identificaIngredient } from '../src/lib/fc-material';
import { CoadaAprobare } from '../src/views/shared/Nemapate';
import { buildCtx } from '../src/lib/engine';
import { COMPANIE, perioadaDin } from '../src/lib/fc-domeniu';
import { migreaza } from '../src/lib/store';
import { stareGoala, genereazaSeed } from '../src/lib/seed';
import type { AppState, Ingredient } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
const ACUM = (h: number) => `2026-09-03T${String(h).padStart(2, '0')}:00:00.000Z`;

const ing = (cod: string, denumire: string): Ingredient =>
  ({ cod, denumire, categorie: 'MP', tip: 'FOOD', um: 'kg', preturi: [{ validDeLa: '2026-07-01', pret: 40 }], activ: true });
const BAZA: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'FRYDAY IASI PALAS' }],
  ingrediente: [ing('M1', 'Carne vita'), ing('ING9', 'Piept de pui')],
  produse: [{ cod: 'P1', denumire: 'Burger', categorie: 'B', tip: 'SIMPLU', pretInstore: 11.9, pretDelivery: 11.9, tva: 19, activ: true }],
};
const ANTETE = ['Perioada', 'Locatie', 'Cod material', 'Denumire material', 'Categorie', 'Cost actual'];
const rand = (cod: string, den: string, cost: number, cat = 'FOOD') =>
  ({ Perioada: '2026-08', Locatie: 'L01', 'Cod material': cod, 'Denumire material': den, Categorie: cat, 'Cost actual': cost });
const P = (randuri: Record<string, unknown>[]): Parsat => ({ antete: ANTETE, randuri, foaie: 'S1' });
const imp = (s: AppState, c: Omit<CerereImport, 'tip'>) => importaPrinCentru(s, { ...c, tip: 'NBO_29' });
/** Exact ce face store-ul la „Alocă" pe un material. */
const aprobaMaterial = (s: AppState, identitate: string, codIng: string): AppState => ({
  ...s,
  ingrediente: s.ingrediente.map(i => i.cod !== codIng ? i : { ...i, aliasuri: [...new Set([...(i.aliasuri ?? []), identitate])] }),
  nemapate: s.nemapate.filter(n => !(n.denumire === identitate && felNemapat(n) === 'MATERIAL')),
});

// ————————————————————————————————— 1. materialul necunoscut ajunge în coadă
console.log('— 1. Un material 2.9 fără corespondent intră în coada comună —');
//  M1 cunoscut (800) · M9 „Piept pui" necunoscut, două rânduri (300 + 150) · M7 „Sos casei" necunoscut (60)
//  (un rând FĂRĂ cod de material nu e un material: importerul îl ignoră ca rând de decor — regulă existentă)
const F = P([rand('M1', 'Carne vita', 800), rand('M9', 'Piept pui', 300), rand('M9', 'Piept pui', 150), rand('M7', 'Sos casei', 60, 'FOOD')]);
const r1 = imp(BAZA, { fisier: '2.9 august.xlsx', parsat: F, acum: ACUM(8) });
t('importul se activează (consumul intră chiar dacă unele materiale nu se mapează)', r1.rezultat.stare === 'ACTIVAT', r1.rezultat.erori.join(' | '));
const s1 = r1.stareNoua;
const coada = s1.nemapate.filter(n => felNemapat(n) === 'MATERIAL');
t('două materiale în coadă, marcate MATERIAL, cu sursa NBO_29', coada.length === 2 && coada.every(n => n.sursa === 'NBO_29'), JSON.stringify(coada.map(n => n.denumire)));
t('identitatea e codul de material (M9, M7), nu denumirea', coada.some(n => n.denumire === 'M9') && coada.some(n => n.denumire === 'M7'));
t('leii sunt cumulați pe identitate: M9 = 450', aprox(coada.find(n => n.denumire === 'M9')?.valoare ?? 0, 450));
t('descrierea e denumirea din raport', coada.find(n => n.denumire === 'M9')?.categorie === 'Piept pui');
t('proveniența: fișierul', coada.every(n => n.fisier === '2.9 august.xlsx'));
t('nu s-a creat niciun ingredient nou', s1.ingrediente.length === 2);
t('rândurile 2.9 sunt totuși importate (4 rânduri, 1310 lei)', (s1.materiale29 ?? []).length === 4 && aprox((s1.materiale29 ?? []).reduce((a, m) => a + m.costActual, 0), 1310));
t('rezultatul importului spune câte materiale sunt necunoscute', (r1.rezultat.necunoscute ?? []).length === 2, JSON.stringify(r1.rezultat.necunoscute));
t('versiunea reține ce a lăsat nemapat (pentru F3)', ((s1.versiuniImport ?? [])[0]?.nemapate ?? []).includes('M9'));

// ————————————————————————————————— 2. coada canonică
console.log('\n— 2. Coada canonică le vede ca MATERIAL, cu sugestii din ingrediente —');
const c2 = coadaAprobare(s1);
const m9 = c2.find(x => x.fel === 'MATERIAL' && x.valoareSursa === 'M9');
t('intrarea MATERIAL există, cu greutatea în lei', !!m9 && m9.unitateGreutate === 'RON' && aprox(m9.greutate, 450));
t('sugestiile vin din nomenclatorul de INGREDIENTE („Piept de pui" pentru „Piept pui")', !!m9 && m9.sugestii.some(s => s.tinta === 'Piept de pui'), JSON.stringify(m9?.sugestii.map(s => s.tinta)));
t('… și nu din produse', !!m9 && !m9.sugestii.some(s => s.tinta === 'Burger'));
t('motivul vorbește de nomenclator și de punte, nu de vânzări', !!m9 && /nomenclator/.test(m9.motiv) && /punte|Neexplicat/.test(m9.motiv), m9?.motiv);
t('id-ul distinge felul: MATERIAL:M9', m9?.id === 'MATERIAL:M9');
t('codIngredientPentru traduce sugestia în cod', codIngredientPentru('Piept de pui', s1) === 'ING9' && codIngredientPentru('Burger', s1) === null);
t('rezumatul numără pe fel', c2.filter(x => x.fel === 'MATERIAL').length === 2 && c2.filter(x => x.fel === 'PRODUS').length === 0);

// ————————————————————————————————— 3. aprobarea scrie aliasul pe ingredient
console.log('\n— 3. Aprobarea: alias pe Ingredient.aliasuri, intrarea iese din coadă —');
const s3 = aprobaMaterial(s1, 'M9', 'ING9');
t('aliasul e pe ingredient', s3.ingrediente.find(i => i.cod === 'ING9')?.aliasuri?.includes('M9') === true);
t('intrarea a ieșit din coadă; cealaltă rămâne', s3.nemapate.length === 1 && s3.nemapate[0].denumire === 'M7');
t('identificaIngredient rezolvă acum M9 prin alias', identificaIngredient(s3.ingrediente, 'M9', 'Piept pui') === 'ING9');
t('… și înainte de alias nu rezolva', identificaIngredient(s1.ingrediente, 'M9', 'Piept pui') === null);
t('… pe denumire normalizată rezolvă și fără alias („piept de PUI" → ING9)', identificaIngredient(s1.ingrediente, 'ALT', 'piept de PUI') === 'ING9');
t('identitateSeRezolva pe calea FC29_MATERIAL: da după alias, nu înainte',
  identitateSeRezolva(s3, 'M9', 'FC29_MATERIAL') && !identitateSeRezolva(s1, 'M9', 'FC29_MATERIAL'));

// ————————————————————————————————— 4. F3 pe calea materialelor
console.log('\n— 4. F3: reimportul aceluiași 2.9 după alias trece și leagă materialul —');
const r4 = imp(s3, { fisier: '2.9 august.xlsx', parsat: F, acum: ACUM(9) });
t('reimportul e REIMPORT_MAPARE, activat', r4.rezultat.duplicat === 'REIMPORT_MAPARE' && r4.rezultat.stare === 'ACTIVAT', `${r4.rezultat.duplicat} ${r4.rezultat.stare}`);
t('diagnosticul numește M9', r4.rezultat.diagnostice.find(d => d.cod === 'REIMPORT_DUPA_MAPARE')?.exemple.includes('M9') === true);
const rec = reconciliationMaterialFC(r4.stareNoua, buildCtx(r4.stareNoua), { perioada: perioadaDin('2026-08-15', 'LUNA'), nivel: COMPANIE, canal: 'TOTAL' });
t('în punte, M9 e legat de ING9', rec.randuri.filter(x => x.material === 'M9').every(x => x.areIngredient && x.ingredient === 'ING9'), JSON.stringify(rec.randuri.map(x => [x.material, x.ingredient])));
t('M7 rămâne nemapat și în coadă (nu s-a dublat)', r4.stareNoua.nemapate.filter(n => n.denumire === 'M7').length === 1);
t('consumul nu s-a dublat: tot 1310 lei pe august', aprox((r4.stareNoua.materiale29 ?? []).reduce((a, m) => a + m.costActual, 0), 1310));
t('fără altă aprobare, al treilea import identic e DUPLICAT', imp(r4.stareNoua, { fisier: '2.9 august.xlsx', parsat: F, acum: ACUM(10) }).rezultat.duplicat === 'DUPLICAT_EXACT');
t('reimportul IDENTIC fără nicio aprobare e DUPLICAT', imp(s1, { fisier: '2.9 august.xlsx', parsat: F, acum: ACUM(9) }).rezultat.duplicat === 'DUPLICAT_EXACT');

// ————————————————————————————————— 5. două feluri, același text
console.log('\n— 5. O denumire POS și un material cu același text sunt intrări diferite —');
const cuProdus: AppState = { ...s1, nemapate: [...s1.nemapate, { denumire: 'M9', categorie: 'Milkshake', cant: 3, valoare: 45, fisier: '4.7.xlsx', sursa: 'PMIX' }] };
const c5 = coadaAprobare(cuProdus);
t('coada are PRODUS:M9 și MATERIAL:M9', c5.some(x => x.id === 'PRODUS:M9') && c5.some(x => x.id === 'MATERIAL:M9'));
t('aprobarea materialului nu atinge intrarea de produs', aprobaMaterial(cuProdus, 'M9', 'ING9').nemapate.some(n => n.denumire === 'M9' && felNemapat(n) === 'PRODUS'));
t('o intrare veche, fără sursă, e PRODUS', felNemapat({ denumire: 'X', categorie: '', cant: 1, valoare: 1, fisier: 'f' }) === 'PRODUS');
t('migrarea păstrează intrările vechi ca produse', migreaza(JSON.parse(JSON.stringify({ ...genereazaSeed(), nemapate: [{ denumire: 'X', categorie: '', cant: 1, valoare: 1, fisier: 'f' }] }))).nemapate.every(n => felNemapat(n) === 'PRODUS'));

// ————————————————————————————————— 6. ecranul comun
console.log('\n— 6. Ecranul cozii distinge produs de material și alocă unde trebuie —');
const apeluri: string[] = [];
const html = renderToStaticMarkup(h(CoadaAprobare, {
  state: cuProdus,
  atribuieAlias: (d: string, c: string) => { apeluri.push(`P:${d}→${c}`); },
  atribuieAliasIngredient: (d: string, c: string) => { apeluri.push(`M:${d}→${c}`); },
  renuntaNemapat: () => { /* nimic */ },
}));
t('rândul de material e marcat', /data-fel="MATERIAL"/.test(html));
t('rândul de produs e marcat', /data-fel="PRODUS"/.test(html));
t('selectorul rândului de material listează INGREDIENTE', /Piept de pui/.test(html) && /Carne vita/.test(html));
t('selectorul rândului de produs listează produse', /Burger/.test(html));
t('titlul nu mai vorbește doar de POS', /material/i.test(html));

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
