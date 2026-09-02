// FC Advisor — stratul determinist de analiză și granița cu modelul de limbaj.
//
// Ce se verifică:
//   explicația FC     : preț / rețetă / PMIX / consum separate, plus paper normalizat,
//                       operațional, neclasificat și neexplicat — fiecare din motorul lui
//   neexplicatul      : rămâne neatribuit; nicio cauză cunoscută nu îl absoarbe
//   dovezi insuficiente: se rostește exact „Date insuficiente pentru o concluzie sigură."
//   proveniență       : fiecare cifră poartă motorul, câmpul, scopul și sursele
//   prioritate        : regulă deterministă, aceeași ieșire pentru aceleași intrări
//   what-if           : rulează motorul din PR #8, fără să atingă datele reale
//   scop              : Companie vs Restaurant; un manager nu primește alt restaurant
//   granița cu LLM    : promptul conține doar dosarul; orice cifră inventată e respinsă
import { genereazaSeed } from '../src/lib/seed';
import { buildCtx } from '../src/lib/engine';
import { analizaIngrediente } from '../src/lib/fc-ingrediente';
import { bridgeFC } from '../src/lib/fc-bridge';
import { analizaTimeline } from '../src/lib/fc-timeline';
import { accesTower, cerereBaza, cerereDin, punteTower, type SelectieFC } from '../src/lib/fc-tower';
import {
  MESAJ_INSUFICIENT, PRAGURI_ADVISOR, calculeazaPrioritate, cifreDin, descrieDosar,
  dosarAdvisor, dosarPentru,
  type CauzaFC,
} from '../src/lib/fc-advisor';
import {
  MODEL_RECOMANDAT, PROMPT_SISTEM, construiestePrompt, narreaza, naratorDeterminist,
  numereDin, serializeazaStabil, valideazaNaratiune, valideazaScop, valoriPermise,
} from '../src/lib/fc-advisor-llm';
import type { AppState, Material29 } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

// ————————————————————————————————————————————————————————— fixtura

const mat = (loc: string | null, material: string, denumire: string, categorie: string, cost: number, teoretic: number | null = null): Material29 =>
  ({ perioada: '2026-07', locatie: loc, material, denumire, categorie, cant: null, um: null, costActual: cost, costTeoretic: teoretic });

const MATERIALE: Material29[] = [
  mat('L01', 'I001', 'Piept de pui', 'Carne și pui', 4000, 3800),
  mat('L01', 'A001', 'Hârtie ambalaj burger', 'Ambalaje', 500, 480),
  mat('L01', 'CUR-1', 'Detergent', 'Materiale curățenie', 180),
  mat('L02', 'I005', 'Chiflă burger', 'Panificație', 1200, 1150),
  { ...mat('L02', 'NORM-1', 'Pui porționat', 'Carne și pui', 300), normalizat: true },
  mat('L02', 'MAT-Z', 'Transport', 'Transport marfă', 400),
  mat(null, 'FARA-LOC', 'Linie agregată', 'Panificație', 250),
];

const s0: AppState = { ...genereazaSeed(), materiale29: MATERIALE };
const ctx0 = buildCtx(s0);
const ACCES_TOP = accesTower(s0, { rol: 'ADMIN' }, false);
const ACCES_MANAGER = accesTower(s0, { rol: 'MANAGER', locatie: 'L02' }, true);

const SEL: SelectieFC = {
  ancora: '2026-07-15', granularitate: 'LUNA', comparatie: 'PERIOADA_PRECEDENTA',
  scop: 'COMPANIE', locatie: null, canal: 'TOTAL',
};

const d = dosarAdvisor(s0, ctx0, { selectie: SEL, acces: ACCES_TOP });
const analiza = analizaTimeline(s0, ctx0, cerereDin(SEL));
const bridge = bridgeFC(s0, ctx0, cerereBaza(SEL));
const ing = analizaIngrediente(s0, ctx0, { ...cerereBaza(SEL), comparatie: 'LUNA_PRECEDENTA' });

// ————————————————————————————————————————————————————————— starea FC

console.log('— Starea FC vine din motor, nu din Advisor —');
t('dosarul e disponibil pe fixtură', d.stare.disponibil);
t('FC rețetar e exact cifra motorului de timeline',
  aprox(d.stare.fcRetetar.valoare!, analiza.metrici!.recipeFcPct!, 1e-9));
t('FC actual NBO e exact cifra motorului', aprox(d.stare.fcActualNbo.valoare!, analiza.metrici!.nboActualFcPct!, 1e-9));
t('variația e exact varianceRON', aprox(d.stare.variatie.valoare!, analiza.metrici!.varianceRON!, 1e-9));
t('teoreticul e cel DECLARAT, nu reconstruit',
  aprox(d.stare.fcTeoreticNbo.valoare!, analiza.metrici!.nboTheoreticalFcPct!, 1e-9));
t('vânzările sunt numitorul motorului', aprox(d.stare.vanzari.valoare!, analiza.metrici!.salesRON, 1e-9));
t('rezumatul citează FC-ul, nu îl reformulează',
  d.stare.rezumat.includes(analiza.metrici!.recipeFcPct!.toFixed(1)));
t('direcția e derivată din delta comparației',
  d.stare.deltaFcPp.valoare === null ? d.stare.directie === null : d.stare.directie !== null);
t('descrierea dosarului e citibilă', descrieDosar(d).includes(d.scop.descriere));

// ————————————————————————————————————————————————————————— explicația

console.log('\n— Explicația separă toate cele opt cauze —');
const CAUZE_CERUTE: CauzaFC[] = ['PRET', 'CONSUM', 'RETETA', 'PMIX',
  'PAPER_NORMALIZAT', 'OPERATIONAL', 'NECLASIFICAT', 'NEEXPLICAT'];
t('toate cele opt cauze sunt prezente',
  CAUZE_CERUTE.every(c => d.explicatie.cauze.some(x => x.cauza === c)));
t('nicio cauză nu apare de două ori',
  new Set(d.explicatie.cauze.map(c => c.cauza)).size === d.explicatie.cauze.length);
const cauza = (c: CauzaFC) => d.explicatie.cauze.find(x => x.cauza === c)!;

const cuEfecte = ing.randuri.filter(r => r.efecte !== null);
t('efectul de PREȚ = Σ efecte.pret din motorul de ingrediente',
  aprox(cauza('PRET').lei.valoare!, cuEfecte.reduce((s, r) => s + r.efecte!.pret, 0), 1e-6));
t('efectul de CONSUM = Σ efecte.consum',
  aprox(cauza('CONSUM').lei.valoare!, cuEfecte.reduce((s, r) => s + r.efecte!.consum, 0), 1e-6));
t('efectul de REȚETĂ = Σ efecte.reteta',
  aprox(cauza('RETETA').lei.valoare!, cuEfecte.reduce((s, r) => s + r.efecte!.reteta, 0), 1e-6));
t('efectul de PMIX = Σ efecte.pmix',
  aprox(cauza('PMIX').lei.valoare!, cuEfecte.reduce((s, r) => s + r.efecte!.pmix, 0), 1e-6));
t('consumul = rețetă + mix + interacțiunea lor (identitatea motorului)',
  aprox(cauza('CONSUM').lei.valoare!,
    cauza('RETETA').lei.valoare! + cauza('PMIX').lei.valoare!
    + cuEfecte.reduce((s, r) => s + r.efecte!.interactiuneConsum, 0), 1e-6));
t('Δcost = preț + consum + interacțiune preț×consum',
  aprox(d.explicatie.deltaCostRetetar.valoare!,
    cauza('PRET').lei.valoare! + cauza('CONSUM').lei.valoare! + d.explicatie.interactiune.valoare!, 0.01));

const punte = punteTower(bridge);
const grup = (g: string) => punte.grupuri.find(x => x.grup === g)!;
t('paper + normalizat = grupul punții', aprox(cauza('PAPER_NORMALIZAT').lei.valoare!, grup('PAPER_NORMALIZAT').lei));
t('operaționalul = grupul punții', aprox(cauza('OPERATIONAL').lei.valoare!, grup('OPERATIONAL').lei));
t('neclasificatul = grupul punții, 400 lei', aprox(cauza('NECLASIFICAT').lei.valoare!, 400));
t('neexplicatul = grupul punții, 250 lei', aprox(cauza('NEEXPLICAT').lei.valoare!, 250));
t('fiecare cauză are și pp, calculat pe vânzările scopului',
  d.explicatie.cauze.every(c => c.pp.valoare === null
    || aprox(c.pp.valoare, (c.lei.valoare! / analiza.metrici!.salesRON) * 100, 1e-9)));
t('fiecare cauză spune CE s-a măsurat', d.explicatie.cauze.every(c => c.descriere.length > 20));
t('cauzele își listează contribuitorii, cu cifrele lor',
  d.explicatie.cauze.filter(c => (c.lei.valoare ?? 0) !== 0).every(c => c.contribuitori.length > 0));
t('identitatea de verificare e scrisă în dosar',
  d.explicatie.verificareIdentitate.includes('interacțiune'));

console.log('\n— Neexplicatul NU se atribuie unei cauze cunoscute —');
t('nota despre neexplicat există și e explicită',
  d.explicatie.notaNeexplicat.includes('neatribuit') && d.explicatie.notaNeexplicat.includes('presupunere'));
t('neexplicatul are cauză proprie, nu e topit în preț sau consum',
  cauza('NEEXPLICAT').lei.valoare! > 0
  && !aprox(cauza('PRET').lei.valoare!, cauza('PRET').lei.valoare! + cauza('NEEXPLICAT').lei.valoare!));
t('descrierea neexplicatului nu propune o cauză',
  !/din cauza|pentru că|probabil|posibil/i.test(cauza('NEEXPLICAT').descriere));
t('acțiunea pe neexplicat e o investigație, nu o corecție',
  d.actiuni.filter(a => a.tip === 'INVESTIGHEAZA_NEEXPLICAT').every(a => a.motiv.includes('neatribuit')));

// ————————————————————————————————————————————————————————— dovezi insuficiente

console.log('\n— Când dovezile nu ajung, se spune exact asta —');
const sFaraNbo: AppState = { ...s0, materiale29: [] };
const dFaraNbo = dosarAdvisor(sFaraNbo, buildCtx(sFaraNbo), { selectie: SEL, acces: ACCES_TOP });
t('fără 2.9, cauzele din punte sunt null cu motiv',
  ['PAPER_NORMALIZAT', 'OPERATIONAL', 'NECLASIFICAT', 'NEEXPLICAT'].every(c => {
    const x = dFaraNbo.explicatie.cauze.find(y => y.cauza === c)!;
    return x.lei.valoare === null && !!x.lei.indisponibilDe;
  }));
t('fără 2.9, cauzele din rețetar rămân calculabile',
  dFaraNbo.explicatie.cauze.find(c => c.cauza === 'PRET')!.lei.valoare !== null);
t('fără 2.9, lipsa e declarată în secțiunea de lipsuri',
  dFaraNbo.lipsuri.some(l => l.sectiune === 'PUNTE_29' && l.motiv.length > 10));

const sGol: AppState = { ...genereazaSeed(), vanzari: [], salesReport: [], materiale29: [] };
const dGol = dosarAdvisor(sGol, buildCtx(sGol), { selectie: SEL, acces: accesTower(sGol, { rol: 'ADMIN' }, false) });
t('fără vânzări, starea e indisponibilă cu motiv', !dGol.stare.disponibil && !!dGol.stare.motiv);
t('fără vânzări, rezumatul e exact mesajul cerut', dGol.stare.rezumat === MESAJ_INSUFICIENT);
t('fără vânzări, cifrele sunt null — niciun zero de umplutură',
  cifreDin(dGol.stare).every(c => c.valoare === null));
t('fiecare cifră lipsă își poartă motivul',
  cifreDin(dGol).filter(c => c.valoare === null).every(c => !!c.indisponibilDe));
t('naratiunea unei stări goale rostește mesajul cerut',
  naratorDeterminist(dGol).includes(MESAJ_INSUFICIENT));
t('mesajul e exact cel cerut, literal',
  MESAJ_INSUFICIENT === 'Date insuficiente pentru o concluzie sigură.');

// ————————————————————————————————————————————————————————— proveniență

console.log('\n— Proveniența: nicio cifră fără sursă —');
const toateCifrele = cifreDin(d);
t('dosarul conține cifre', toateCifrele.length > 20, `${toateCifrele.length}`);
t('fiecare cifră poartă un motor cunoscut',
  toateCifrele.every(c => ['FC_TIMELINE', 'FC_BRIDGE', 'FC_INGREDIENTE', 'FC_SIMULARE'].includes(c.referinta.motor)));
t('fiecare cifră poartă câmpul exact din motor',
  toateCifrele.every(c => c.referinta.camp.length > 2));
t('fiecare cifră poartă scopul pe care a fost calculată',
  toateCifrele.every(c => c.referinta.scop === d.scop.descriere));
t('cifrele din punte trimit la câmpurile punții',
  cauza('NEEXPLICAT').lei.referinta.motor === 'FC_BRIDGE'
  && cauza('NEEXPLICAT').lei.referinta.camp.includes('UNEXPLAINED'));
t('cifrele de preț trimit la motorul de ingrediente',
  cauza('PRET').lei.referinta.motor === 'FC_INGREDIENTE'
  && cauza('PRET').lei.referinta.camp.includes('efecte.pret'));
t('sursele raportate sunt cele ale motoarelor',
  d.surse.length === analiza.surse.length + bridge.surse.length + ing.surse.length);
t('fiecare acțiune poartă dovada ei',
  d.actiuni.every(a => a.dovada.calcul.length > 10 && a.dovada.referinte.length > 0));
t('fiecare oportunitate poartă calculul motorului',
  d.oportunitati.every(o => o.dovada.calcul.length > 10));

// ————————————————————————————————————————————————————————— prioritatea

console.log('\n— Prioritatea e o regulă, nu o părere —');
t('impact mare + încredere mare → CRITICA',
  calculeazaPrioritate(6000, 0.1, 90).prioritate === 'CRITICA');
t('impact mediu → MEDIE', calculeazaPrioritate(500, 0.1, 90).prioritate === 'MEDIE');
t('impact mic → MICA', calculeazaPrioritate(50, 0.01, 90).prioritate === 'MICA');
t('un impact FC mare urcă o treaptă',
  calculeazaPrioritate(500, 1.0, 90).prioritate === 'MARE'
  && calculeazaPrioritate(500, 0.1, 90).prioritate === 'MEDIE');
t('încrederea slabă coboară o treaptă',
  calculeazaPrioritate(2000, 0.1, 55).prioritate === 'MEDIE'
  && calculeazaPrioritate(2000, 0.1, 90).prioritate === 'MARE');
t('sub pragul de încredere nu se emit priorități mari',
  calculeazaPrioritate(50000, 5, 30).prioritate === 'MEDIE');
t('regula aplicată se întoarce scrisă',
  calculeazaPrioritate(6000, 0.1, 90).regula.includes('→ CRITICA'));
t('aceeași intrare dă mereu aceeași ieșire',
  JSON.stringify(calculeazaPrioritate(1234, 0.4, 71)) === JSON.stringify(calculeazaPrioritate(1234, 0.4, 71)));
t('impact null se tratează ca 0, nu ca necunoscut care urcă',
  calculeazaPrioritate(null, null, 100).prioritate === 'MICA');
t('pragurile sunt expuse în dosar, ca prioritatea să fie verificabilă',
  d.praguri.impactCriticLei === PRAGURI_ADVISOR.impactCriticLei);
t('fiecare acțiune își poartă regula de prioritate',
  d.actiuni.every(a => a.regulaPrioritate.includes('impact')));
t('acțiunile sunt ordonate după prioritate',
  (() => { const ord = ['CRITICA', 'MARE', 'MEDIE', 'MICA'];
    return d.actiuni.every((a, i) => i === 0 || ord.indexOf(d.actiuni[i - 1].prioritate) <= ord.indexOf(a.prioritate)); })());
t('nicio acțiune de prioritate mare nu vine din date slabe',
  d.actiuni.filter(a => a.prioritate === 'CRITICA' || a.prioritate === 'MARE')
    .every(a => a.confidenta >= PRAGURI_ADVISOR.confidentaPentruPrioritateMare));

console.log('\n— Acțiunile sunt acționabile și acoperă tipurile cerute —');
t('fiecare acțiune are titlu, motiv, scop și încredere',
  d.actiuni.every(a => a.titlu.length > 5 && a.motiv.length > 10 && a.scop.length > 3 && a.confidenta > 0));
t('tipurile de acțiune sunt din lista declarată',
  d.actiuni.every(a => ['VERIFICA_PRET_FURNIZOR', 'REVIZUIESTE_GRAMAJ', 'INVESTIGHEAZA_CONSUM',
    'INVESTIGHEAZA_RESTAURANT', 'REVIZUIESTE_PMIX', 'REVIZUIESTE_PAPER_NORMALIZAT',
    'INVESTIGHEAZA_NEEXPLICAT', 'CLASIFICA_MATERIALE', 'COMPLETEAZA_DATE'].includes(a.tip)));
t('puntea cu neclasificat produce acțiunea de clasificare',
  d.actiuni.some(a => a.tip === 'CLASIFICA_MATERIALE'));
t('puntea cu neexplicat produce acțiunea de investigare',
  d.actiuni.some(a => a.tip === 'INVESTIGHEAZA_NEEXPLICAT'));
t('paper-ul normalizat produce acțiunea lui',
  d.actiuni.some(a => a.tip === 'REVIZUIESTE_PAPER_NORMALIZAT'));

// ————————————————————————————————————————————————————————— riscuri

console.log('\n— Riscuri —');
t('riscurile poartă prioritate deterministă',
  d.riscuri.every(r => r.regulaPrioritate.includes('impact')));
t('neexplicatul peste prag devine risc',
  analiza.metrici!.unexplainedPct! >= PRAGURI_ADVISOR.neexplicatRiscPct
    ? d.riscuri.some(r => r.tip === 'NEEXPLICAT_MARE')
    : !d.riscuri.some(r => r.tip === 'NEEXPLICAT_MARE'));
t('riscurile sunt ordonate după prioritate',
  (() => { const ord = ['CRITICA', 'MARE', 'MEDIE', 'MICA'];
    return d.riscuri.every((r, i) => i === 0 || ord.indexOf(d.riscuri[i - 1].prioritate) <= ord.indexOf(r.prioritate)); })());

// ————————————————————————————————————————————————————————— what-if

console.log('\n— What-if: motorul din PR #8, pe o copie —');
const inainte = JSON.stringify(s0);
const dWhatIf = dosarAdvisor(s0, ctx0, { selectie: SEL, acces: ACCES_TOP, maxWhatIf: 2 });
t('datele reale rămân neatinse după generarea scenariilor', JSON.stringify(s0) === inainte);
t('se generează cel mult câte scenarii s-au cerut', dWhatIf.whatIf.length <= 2);
t('scenariile disponibile poartă Δ pp și Δ lei',
  dWhatIf.whatIf.filter(w => w.disponibil).every(w => w.deltaPp.valoare !== null && w.deltaLei.valoare !== null));
t('scenariile indisponibile spun de ce, fără cifre inventate',
  dWhatIf.whatIf.filter(w => !w.disponibil).every(w => w.deltaPp.valoare === null && !!w.motiv));
t('fiecare scenariu poartă efectele separate ale motorului',
  dWhatIf.whatIf.filter(w => w.disponibil).every(w =>
    ['PRET', 'RETETA', 'MIX', 'INTERACTIUNE'].every(id => w.efecte.some(e => e.id === id))));
t('nota semantică previne confuzia istoric vs. simulare',
  dWhatIf.whatIf.every(w => w.notaSemantica.includes('AZI')));
t('scenariul de preț −5% pornește de la prețul curent, nu de la unul inventat',
  (() => { const w = dWhatIf.whatIf.find(x => x.titlu.startsWith('Preț −5%'));
    if (!w) return true;
    const p = w.scenariu.preturi![0];
    const r = ing.randuri.find(x => x.ingredient === p.ingredient)!;
    return aprox(p.pretNou, r.pretCurent! * 0.95, 1e-9); })());
t('cifrele scenariului trimit la motorul de simulare',
  dWhatIf.whatIf.every(w => w.deltaPp.referinta.motor === 'FC_SIMULARE'));

// ————————————————————————————————————————————————————————— scop și permisiuni

console.log('\n— Scopul: Companie vs Restaurant —');
const dL01 = dosarAdvisor(s0, ctx0, { selectie: { ...SEL, scop: 'RESTAURANT', locatie: 'L01' }, acces: ACCES_TOP });
t('dosarul pe restaurant declară restaurantul ca nivel', dL01.scop.nivel === 'L01');
t('dosarul de companie declară nivelul COMPANIE', d.scop.nivel === 'COMPANIE');
t('cifrele restaurantului diferă de cele ale companiei',
  dL01.stare.vanzari.valoare! < d.stare.vanzari.valoare!);
t('cifrele restaurantului sunt exact cele ale analizei directe',
  aprox(dL01.stare.fcRetetar.valoare!,
    analizaTimeline(s0, ctx0, cerereDin({ ...SEL, scop: 'RESTAURANT', locatie: 'L01' })).metrici!.recipeFcPct!, 1e-9));
t('la nivel de restaurant, clasamentul de restaurante e gol, cu lipsa declarată',
  dL01.restaurante.fcMare.length === 0 && dL01.lipsuri.some(l => l.sectiune === 'RESTAURANTE'));
t('la nivel de companie, clasamentele au rânduri', d.restaurante.fcMare.length > 0);

console.log('\n— Un manager nu primește date despre alt restaurant —');
const dManager = dosarAdvisor(s0, ctx0, { selectie: SEL, acces: ACCES_MANAGER });
t('selecția „Companie" a unui manager e re-normalizată la restaurantul lui',
  dManager.scop.nivel === 'L02');
t('scopul autorizat conține doar restaurantul lui',
  dManager.scop.restauranteAutorizate.join(',') === 'L02');
t('nici cerând explicit alt restaurant nu îl primește',
  dosarAdvisor(s0, ctx0, { selectie: { ...SEL, scop: 'RESTAURANT', locatie: 'L01' }, acces: ACCES_MANAGER })
    .scop.nivel === 'L02');
t('dosarul managerului NU menționează nicăieri alt restaurant',
  !new RegExp('\\bL01\\b').test(JSON.stringify(dManager)));
t('dosarul de companie menționează, în schimb, ambele restaurante',
  new RegExp('\\bL01\\b').test(JSON.stringify(d)) && new RegExp('\\bL02\\b').test(JSON.stringify(d)));
t('naratiunea managerului nu scapă alt restaurant',
  !new RegExp('\\bL01\\b').test(naratorDeterminist(dManager)));
t('dosarPentru derivă accesul din rolul serverului',
  dosarPentru(s0, ctx0, SEL, { rol: 'MANAGER', locatie: 'L02' }, true).scop.nivel === 'L02'
  && dosarPentru(s0, ctx0, SEL, { rol: 'ADMIN' }, false).scop.nivel === 'COMPANIE');

// ————————————————————————————————————————————————————————— calitatea datelor

console.log('\n— Avertismentele de date sunt la vedere —');
t('avertismentele există pe fixtura cu probleme', d.avertismenteDate.length > 0);
t('fiecare avertisment spune cum afectează încrederea',
  d.avertismenteDate.every(a => a.efectAsupraIncrederii.length > 20));
t('încrederea globală are formula scrisă', d.confidenta.formula.includes('×'));
t('încrederea globală e între 0 și 100', d.confidenta.scor >= 0 && d.confidenta.scor <= 100);
t('factorii de încredere sunt declarați', d.confidenta.factori.length === 3);
t('datele slabe scad încrederea',
  dGol.confidenta.scor < d.confidenta.scor, `${dGol.confidenta.scor} < ${d.confidenta.scor}`);
t('datele slabe nu produc recomandări de prioritate mare',
  dGol.actiuni.every(a => a.prioritate !== 'CRITICA' || a.confidenta >= PRAGURI_ADVISOR.confidentaPentruPrioritateMare));

// ————————————————————————————————————————————————————————— granița cu modelul

console.log('\n— Granița cu LLM: promptul conține DOAR dosarul —');
const prompt = construiestePrompt(d);
t('promptul poartă instrucțiunile de sistem', prompt.sistem === PROMPT_SISTEM);
t('sistemul interzice explicit calculul', PROMPT_SISTEM.includes('Nu calcula nimic'));
t('sistemul interzice atribuirea neexplicatului', PROMPT_SISTEM.includes('Neexplicat înseamnă neexplicat'));
t('sistemul interzice rejudecarea priorităților', PROMPT_SISTEM.includes('Nu schimba prioritățile'));
t('sistemul impune formula de refuz', PROMPT_SISTEM.includes(MESAJ_INSUFICIENT));
t('dovezile sunt exact dosarul serializat', prompt.dovezi === serializeazaStabil(d));
t('promptul NU conține rândurile brute de vânzări',
  !prompt.dovezi.includes('salesReport') && !prompt.dovezi.includes('"cant"') && !prompt.dovezi.includes('"brut"'));
t('promptul NU conține starea aplicației',
  !prompt.dovezi.includes('"materiale29"') && !prompt.dovezi.includes('"validDeLa"')
  && !prompt.dovezi.includes('"costActual"') && !prompt.dovezi.includes('"tipComp"'));
t('promptul conține, în schimb, dosarul de dovezi',
  prompt.dovezi.includes('"referinta"') && prompt.dovezi.includes('"cauze"'));
t('promptul recomandă modelul potrivit', prompt.modelRecomandat === MODEL_RECOMANDAT);
t('serializarea e stabilă între apeluri', serializeazaStabil(d) === serializeazaStabil(d));
t('serializarea nu depinde de ordinea cheilor',
  serializeazaStabil({ a: 1, b: 2 }) === serializeazaStabil({ b: 2, a: 1 }));

console.log('\n— Nicio cifră inventată nu trece —');
t('naratiunea deterministă trece propria validare',
  valideazaNaratiune(naratorDeterminist(d), d).valid);
t('un număr inventat e prins',
  (() => { const r = valideazaNaratiune('FC-ul a crescut cu 987654,32 lei.', d);
    return !r.valid && r.numereStraine.includes(987654.32); })());
t('un procent inventat e prins',
  !valideazaNaratiune('Explicatul e de 73,91%.', d).valid);
t('numerele care apar în TEXTELE dosarului sunt permise — sunt tot dovezi',
  valideazaNaratiune('Raportul NBO 2.9 arată consumul.', d).valid);
t('… dar asta nu deschide poarta: un număr absent din tot dosarul e tot respins',
  !valideazaNaratiune('Impactul e de 918273,64 lei.', d).valid);
t('motivul respingerii e scris', valideazaNaratiune('Impact 987654,32 lei.', d).motive[0].includes('nu apar în dovezi'));
t('cifrele reale din dosar trec',
  valideazaNaratiune(`Variație ${d.stare.variatie.valoare!.toFixed(2).replace('.', ',')} lei.`, d).valid);
t('anii nu sunt tratați drept cifre inventate', valideazaNaratiune('În perioada 2026-07 FC-ul...', d).valid);
t('numerele mici de enumerare nu sunt tratate drept afirmații', valideazaNaratiune('1. Prima acțiune. 2. A doua.', d).valid);
t('numerele în format ro-RO sunt citite corect',
  numereDin('1.234,56 lei și 12,5%').some(n => aprox(n, 1234.56)) && numereDin('12,5%').some(n => aprox(n, 12.5)));
t('două numere despărțite de spațiu NU se lipesc într-unul singur',
  (() => { const n = numereDin('încredere 9 10,45 lei');
    return n.includes(9) && n.some(x => aprox(x, 10.45)) && !n.some(x => aprox(x, 910.45)); })());
t('un număr real despărțit de altul nu produce o cifră „străină" fantomă',
  valideazaNaratiune('Încredere 9 și 10,45 nu sunt un singur număr.', d).numereStraine.every(x => !aprox(x, 910.45)));
t('valorile permise includ rotunjirile uzuale',
  (() => { const v = valoriPermise(d);
    return v.includes(+d.stare.fcRetetar.valoare!.toFixed(1)); })());

console.log('\n— Nici scopul nu poate fi depășit prin text —');
t('o naratiune care pomenește alt restaurant e respinsă',
  !valideazaScop('La L01 situația e alta.', dManager, ['L01', 'L02']).valid);
t('naratiunea din scop trece', valideazaScop('La L02 FC-ul a crescut.', dManager, ['L01', 'L02']).valid);
t('motivul depășirii de scop e scris',
  valideazaScop('L01 are probleme.', dManager, ['L01', 'L02']).motive[0].includes('afara scopului'));

console.log('\n— Naratorul: model doar dacă spune adevărul —');
const asincron = async () => {
  const fara = await narreaza(d);
  t('fără narator, textul e cel determinist', fara.sursa === 'DETERMINIST' && fara.text === naratorDeterminist(d));

  const bun = await narreaza(d, async () => `FC rețetar ${d.stare.fcRetetar.valoare!.toFixed(1).replace('.', ',')}%.`);
  t('un narator care respectă dovezile e acceptat', bun.sursa === 'LLM' && bun.validare?.valid === true);

  const mincinos = await narreaza(d, async () => 'FC-ul a scăzut cu 4321,99 lei față de luna trecută.');
  t('un narator care inventează cifre e respins', mincinos.sursa === 'DETERMINIST');
  t('… iar textul livrat rămâne cel adevărat', mincinos.text === naratorDeterminist(d));
  t('… cu motivul respingerii scris', (mincinos.motivRezerva ?? '').includes('nu apar în dovezi'));

  const scapat = await narreaza(dManager, async () => 'Restaurantul L01 stă cel mai prost.', ['L01', 'L02']);
  t('un narator care iese din scop e respins', scapat.sursa === 'DETERMINIST'
    && (scapat.motivRezerva ?? '').includes('afara scopului'));

  const crapat = await narreaza(d, async () => { throw new Error('fără rețea'); });
  t('un narator care eșuează nu lasă ecranul gol',
    crapat.sursa === 'DETERMINIST' && (crapat.motivRezerva ?? '').includes('fără rețea'));

  console.log('\n— Naratiunea deterministă acoperă cele nouă secțiuni —');
  const text = naratorDeterminist(d);
  for (const sectiune of ['Stare FC', 'De ce s-a schimbat FC-ul', 'Mișcări negative', 'Mișcări pozitive',
    'Oportunități', 'Riscuri', 'Acțiuni recomandate', 'Opțiuni what-if', 'Avertismente de date']) {
    t(`naratiunea conține secțiunea „${sectiune}"`, text.includes(sectiune));
  }
  t('naratiunea nu inventează nimic peste dosar', valideazaNaratiune(text, d).valid);
  t('aceeași intrare dă aceeași naratiune', naratorDeterminist(d) === naratorDeterminist(d));

  console.log('\n— Dosarul e determinist —');
  const d1 = dosarAdvisor(s0, ctx0, { selectie: SEL, acces: ACCES_TOP });
  const d2 = dosarAdvisor(s0, ctx0, { selectie: SEL, acces: ACCES_TOP });
  t('două rulări identice produc dosare identice', JSON.stringify(d1) === JSON.stringify(d2));
  t('praguri diferite schimbă prioritățile, nu cifrele',
    (() => {
      const dStrict = dosarAdvisor(s0, ctx0, {
        selectie: SEL, acces: ACCES_TOP,
        praguri: { ...PRAGURI_ADVISOR, impactCriticLei: 1, impactMareLei: 1, impactMediuLei: 1 },
      });
      return dStrict.stare.fcRetetar.valoare === d.stare.fcRetetar.valoare
        && dStrict.actiuni.some(a => a.prioritate === 'CRITICA' || a.prioritate === 'MARE');
    })());

  console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
};

void asincron();
