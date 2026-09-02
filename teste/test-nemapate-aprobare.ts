// Coada de aprobare, fuzionată în ecranul care exista deja.
//
// Înainte: `Nemapate.tsx` avea propria euristică de sugestie (jumătate din cuvinte),
// întorcea o singură ghicire și o PRESELECTA în selector — un „Alocă" apăsat din reflex
// aplica o potrivire pe care nimeni nu o confirmase. `aprobare.ts` avea scorurile, ordinea
// după lei și respingerea explicită, dar nu avea ecran.
//
// Acum ecranul consumă `coadaAprobare`: sugestii scorate, vizibile, NICIUNA preselectată.
// Se verifică aici că nimic nu se aplică singur, că proveniența e la vedere și că
// „lasă nemapat" a rămas.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { genereazaSeed } from '../src/lib/seed';
import {
  codProdusPentru, coadaAprobare, rezumaCoada, scorPotrivire, sugereaza,
} from '../src/lib/aprobare';
import { CoadaAprobare } from '../src/views/shared/Nemapate';
import type { AppState, Nemapat } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };

const nm = (denumire: string, valoare: number, cant = 10, fisier = '4.7 august.xlsx'): Nemapat =>
  ({ denumire, categorie: 'BURGER', cant, valoare, fisier });

const seed = genereazaSeed();
const s0: AppState = {
  ...seed,
  nemapate: [
    nm('CRISPY BURGER new', 120, 6, '4.7 mic.xlsx'),
    nm('SPICY CHEESE BURGER D', 9500, 400, '4.7 mare.xlsx'),
    nm('OBIECT FARA CORESPONDENT', 300, 20, '4.7 mic.xlsx'),
    nm('COMPONENTA DE MENIU', 0, 50, '4.7 mic.xlsx'),
  ],
};

// ————————————————————————————————————————————————————————— coada, prin motorul canonic

console.log('— Coada: ordonată după lei, cu sugestii scorate —');
const coada = coadaAprobare(s0);
t('toate intrările nemapate ajung în coadă', coada.length === 4, `${coada.length}`);
t('ORDINEA e după lei, nu alfabetică',
  coada.map(x => x.greutate).join() === '9500,300,120,0', coada.map(x => x.greutate).join());
t('primul rând e cel care doare', coada[0].valoareSursa === 'SPICY CHEESE BURGER D');
t('greutatea e declarată în lei', coada.every(x => x.unitateGreutate === 'RON'));
t('proveniența e păstrată pe fiecare intrare',
  coada.find(x => x.valoareSursa === 'CRISPY BURGER new')!.sursa === '4.7 mic.xlsx');
t('fiecare intrare spune DE CE e acolo', coada.every(x => x.motiv.length > 20));

const spicy = coada.find(x => x.valoareSursa === 'SPICY CHEESE BURGER D')!;
t('sugestiile sunt scorate', spicy.sugestii.length > 0 && spicy.sugestii.every(s => s.scor > 0));
t('… ordonate descrescător', spicy.sugestii.every((s, i) => i === 0 || spicy.sugestii[i - 1].scor >= s.scor));
t('… și trimit spre produsul corect', spicy.sugestii[0].tinta === 'Spicy Cheese Burger', spicy.sugestii[0].tinta);
t('… fiecare cu explicația ei', spicy.sugestii.every(s => s.explicatie.includes('Sugestie') || s.explicatie.includes('confirmat')));
t('o potrivire de 100% tot cere confirmare, în cuvinte',
  sugereaza('Spicy Cheese Burger', ['Spicy Cheese Burger'])[0].explicatie.includes('trebuie confirmat'));
const fara = coada.find(x => x.valoareSursa === 'OBIECT FARA CORESPONDENT')!;
t('o denumire fără corespondent NU primește sugestii inventate', fara.sugestii.length === 0);

const rez = rezumaCoada(coada);
t('rezumatul numără leii neaprobați', rez.greutateRON === 9920, `${rez.greutateRON}`);
t('… și câte au sugestii', rez.cuSugestii === coada.filter(x => x.sugestii.length).length);
t('… pe feluri', rez.peFel.PRODUS === 4 && rez.peFel.MATERIAL === 0);

// ————————————————————————————————————————————————————————— sugestie → cod de produs

console.log('\n— Traducerea sugestie → cod, în motor, nu în ecran —');
t('o denumire unică se rezolvă la codul ei', codProdusPentru('Spicy Cheese Burger', s0) === 'P002');
t('un cod dat direct se acceptă', codProdusPentru('P002', s0) === 'P002');
t('o denumire inexistentă NU se rezolvă', codProdusPentru('Ceva ce nu există', s0) === null);
const sOmonime: AppState = {
  ...s0,
  produse: [...s0.produse, { ...s0.produse.find(p => p.cod === 'P002')!, cod: 'P999' }],
};
t('DOUĂ produse cu aceeași denumire ⇒ nu se alege niciunul',
  codProdusPentru('Spicy Cheese Burger', sOmonime) === null);
t('scorul e simetric și mărginit',
  scorPotrivire('a b', 'b a') === 100 && scorPotrivire('a', 'x') === 0);

// ————————————————————————————————————————————————————————— ecranul

console.log('\n— Ecranul: consumă coada, nu-și mai calculează sugestiile —');
// randarea cere contextul de store; îl construim minimal, ca ecranul să fie testabil izolat
const nimic = () => undefined;
const randeaza = (st: AppState) => renderToStaticMarkup(
  h(CoadaAprobare, { state: st, atribuieAlias: nimic, renuntaNemapat: nimic }));
const html = randeaza(s0);
t('ecranul se randează', html.includes('data-zona="coada-aprobare"'));
t('afișează toate intrările cu valoare', (html.match(/data-intrare=/g) ?? []).length === 3,
  `${(html.match(/data-intrare=/g) ?? []).length}`);
t('… în ordinea din coadă: cel mai scump primul',
  html.indexOf('SPICY CHEESE BURGER D') < html.indexOf('OBIECT FARA CORESPONDENT'));
t('proveniența e VIZIBILĂ, nu doar în date',
  html.includes('data-camp="sursa"') && html.includes('4.7 mare.xlsx'));
t('sugestiile apar pe ecran', html.includes('data-zona="sugestii"') && html.includes('data-sugestie='));
// scorul e chiar rostul sugestiei: fără el rămâne o ghicire nemotivată
const chip = html.match(/<button[^>]*data-sugestie="Spicy Cheese Burger"[\s\S]*?<\/button>/)?.[0] ?? '';
// DOAR textul vizibil: procentul apare și în `title`, deci un regex pe tot chip-ul ar
// trece chiar dacă scorul ar dispărea de sub ochii omului
const textVizibil = (c: string) => c.replace(/<[^>]+>/g, '');
t('… fiecare cu procentul ei, VIZIBIL, nu doar în tooltip',
  /\d+%/.test(textVizibil(chip)), JSON.stringify(textVizibil(chip)));
t('… și cu denumirea produsului propus', chip.includes('Spicy Cheese Burger'));
t('… iar explicația stă în `title`, la îndemână', chip.includes('title='));
t('toate sugestiile randate poartă un procent vizibil',
  (html.match(/<button[^>]*data-sugestie=[\s\S]*?<\/button>/g) ?? [])
    .every(c => /\d+%/.test(textVizibil(c))));
t('… iar cele fără sugestii sunt marcate', html.includes('fără sugestii'));

// NIMIC preselectat — regula centrală
const selectate = html.match(/<option[^>]*selected[^>]*>/g) ?? [];
t('singurul „selected" e opțiunea GOALĂ — deci nimic nu e preselectat',
  selectate.length === 3 && selectate.every(o => /value=""/.test(o)), selectate.join(' '));
t('niciun PRODUS real nu e preselectat',
  !selectate.some(o => /value="P\d+"/.test(o)));
t('toate selectoarele au valoarea goală',
  (html.match(/data-camp="produs"[^>]*/g) ?? []).every(x => !/value="[^"]+"/.test(x)));
// ancorat pe ATRIBUT: clasa Tailwind conține „disabled:opacity-50", deci un `includes`
// pe tot markup-ul ar trece și cu butonul activ
const btnAloca = html.match(/<button[^>]*>Alocă<\/button>/g) ?? [];
t('există un buton „Alocă" pe fiecare rând', btnAloca.length === 3, `${btnAloca.length}`);
t('… și toate sunt DEZACTIVATE cât timp nu s-a ales nimic',
  btnAloca.every(b => /<button\s+disabled=""/.test(b)), btnAloca[0] ?? 'niciun buton');
t('… în timp ce „Lasă nemapat" rămâne activ — refuzul nu are nevoie de o alegere',
  (html.match(/<button[^>]*>Lasă nemapat<\/button>/g) ?? []).every(b => !/disabled=""/.test(b)));
t('nicio sugestie nu apare ca „aleasă"', !html.includes('aria-pressed="true"'));
t('opțiunea „lasă nemapat" există pe fiecare rând, ca BUTON',
  (html.match(/<button[^>]*>Lasă nemapat<\/button>/g) ?? []).length === 3,
  `${(html.match(/<button[^>]*>Lasă nemapat<\/button>/g) ?? []).length}`);
t('textul spune că procentul NU e o certitudine',
  html.includes('nu o certitudine') && html.includes('cere confirmarea ta'));
t('… și ce înseamnă „lasă nemapat"', html.includes('fără să creeze alias'));

// ————————————————————————————————————————————————————————— fără coadă, fără ecran

console.log('\n— Fără nimic de aprobat, ecranul dispare —');
const sGol: AppState = { ...s0, nemapate: [] };
const htmlGol = randeaza(sGol);
t('ecranul nu se randează deloc', !htmlGol.includes('data-zona="coada-aprobare"'));
t('coada e goală', coadaAprobare(sGol).length === 0);
t('rezumatul unei cozi goale e zero, nu null',
  rezumaCoada([]).total === 0 && rezumaCoada([]).greutateRON === 0);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
