// F3 — reimportul aceluiași fișier DUPĂ aprobarea unei mapări nu mai e un „duplicat".
//
// Contractul de idempotență de azi: amprenta fișierului (`amprentaSursa`) se compară cu
// versiunile activate ale aceluiași tip; orice potrivire e DUPLICAT_EXACT și importul se
// oprește. Amprenta vede doar conținutul fișierului, nu și nomenclatorul — deci după ce omul
// aprobă un alias în coadă, exact același fișier ar aduce rânduri NOI, dar e refuzat.
//
// Contractul corect:
//   · un fișier cu aceeași amprentă e duplicat DOAR dacă nimic din ce versiunea lui a lăsat
//     nemapat nu se rezolvă acum — atunci nu are ce să aducă și rămâne blocat, ca azi;
//   · dacă cel puțin o identitate lăsată nemapată de acea versiune se mapează acum, importul
//     e un REIMPORT_MAPARE: trece, creează o versiune nouă (istoricul nu se rescrie), iar
//     motorul înlocuiește pe cheie ce importase deja — nimic nu se dublează;
//   · versiunile activate înainte de acest contract nu poartă lista: rămân „duplicat", ca azi.
import { importaUnificat, pregatesteImport, activeazaImport } from '../src/lib/import-center';
import type { Parsat } from '../src/lib/importer';
import { randImport } from '../src/lib/fc-tower';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
const ACUM = '2026-09-03T08:00:00.000Z';
const P = (antete: string[], randuri: Record<string, unknown>[]): Parsat => ({ antete, randuri, foaie: 'S1' });

const BAZA: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'FRYDAY IASI PALAS' }],
  produse: [
    { cod: 'P1', denumire: 'Burger', categorie: 'B', tip: 'SIMPLU', pretInstore: 11.9, pretDelivery: 11.9, tva: 19, activ: true },
    { cod: 'P2', denumire: 'Milkshake', categorie: 'S', tip: 'SIMPLU', pretInstore: 15, pretDelivery: 15, tva: 19, activ: true },
  ],
};
const ANTETE = ['Data', 'Locatie', 'Cod produs', 'Denumire', 'Cantitate', 'Valoare neta', 'Canal'];
const rand = (cod: string, den: string, cant: number, lei: number, data = '2026-08-03') =>
  ({ Data: data, Locatie: 'L01', 'Cod produs': cod, Denumire: den, Cantitate: cant, 'Valoare neta': lei, Canal: 'INSTORE' });
/** Exact ce face `atribuieAlias` din store: aliasul intră pe produs, identitatea iese din coadă. */
const aproba = (s: AppState, den: string, cod: string): AppState => ({
  ...s,
  produse: s.produse.map(p => p.cod !== cod ? p : { ...p, aliasuri: [...new Set([...(p.aliasuri ?? []), den])] }),
  nemapate: s.nemapate.filter(n => n.denumire !== den),
});
const imp = (s: AppState, fisier: string, parsat: Parsat, acum = ACUM) => importaUnificat(s, { fisier, parsat, intern: 'PMIX', acum });
const vz = (s: AppState, produs: string) => s.vanzari.filter(v => v.produs === produs);
const net = (s: AppState) => s.vanzari.reduce((a, v) => a + v.net, 0);
const versiuni = (s: AppState) => s.versiuniImport ?? [];

// ————————————————————————————————— 1. 100 % necunoscut → coadă → aprobare → reimport
console.log('— 1. Fișier 100 % necunoscut: coada, aprobarea, reimportul —');
//   XX-1  15 buc / 225 lei · YY-2  2 buc / 40 lei
const TOT = P(ANTETE, [rand('XX-1', 'Milkshake Mango', 10, 150), rand('XX-1', 'Milkshake Mango', 5, 75, '2026-08-04'), rand('YY-2', 'Ceva Nou', 2, 40)]);
const r1 = imp(BAZA, '4.7 nou.xlsx', TOT);
t('(1) importul inițial: respins, coada cu 2 identități', r1.batch.status === 'ESUAT' && r1.stareNoua.nemapate.length === 2);
t('(1) … 265 lei în coadă, 0 în vânzări', aprox(r1.stareNoua.nemapate.reduce((a, n) => a + n.valoare, 0), 265) && net(r1.stareNoua) === 0);
t('(1) … nicio versiune (nu s-a activat nimic)', versiuni(r1.stareNoua).length === 0);
// (2) omul aprobă XX-1 → P2
const s1b = aproba(r1.stareNoua, 'XX-1', 'P2');
t('(2) aprobarea scoate XX-1 din coadă, YY-2 rămâne', s1b.nemapate.map(n => n.denumire).join(',') === 'YY-2');
// (3) reimportul ACELUIAȘI fișier
const r1c = imp(s1b, '4.7 nou.xlsx', TOT);
t('(3) reimportul nu e duplicat — nu exista versiune', r1c.rezultat?.duplicat !== 'DUPLICAT_EXACT', `${r1c.rezultat?.duplicat}`);
t('(3) … și e activat', r1c.batch.status === 'IMPORTAT' && versiuni(r1c.stareNoua).length === 1);
// (4) suma anterior nemapată e procesată conform mapării
t('(4) XX-1 intră ca P2: 15 buc, 225 lei', vz(r1c.stareNoua, 'P2').reduce((a, v) => a + v.cant, 0) === 15
  && aprox(vz(r1c.stareNoua, 'P2').reduce((a, v) => a + v.net, 0), 225), JSON.stringify(vz(r1c.stareNoua, 'P2').map(v => [v.data, v.cant, v.net])));
t('(4) YY-2, încă necunoscut, rămâne în coadă cu cifrele lui', r1c.stareNoua.nemapate.length === 1 && r1c.stareNoua.nemapate[0].denumire === 'YY-2' && r1c.stareNoua.nemapate[0].cant === 2);
t('(4) total vânzări = doar ce s-a mapat (225), nimic dublat', aprox(net(r1c.stareNoua), 225));

// ————————————————————————————————— 2. parțial necunoscut → versiune → aprobare → reimport
console.log('\n— 2. Fișier parțial necunoscut: versiunea există, reimportul după mapare trece —');
//   P1 100 buc / 1190 lei (cunoscut) · XX-1 15 / 225 · YY-2 2 / 40
const PART = P(ANTETE, [rand('P1', 'Burger', 100, 1190), rand('XX-1', 'Milkshake Mango', 10, 150), rand('XX-1', 'Milkshake Mango', 5, 75, '2026-08-04'), rand('YY-2', 'Ceva Nou', 2, 40)]);
const r2 = imp(BAZA, '4.7 august.xlsx', PART);
t('(1) importul inițial e activat, versiunea #1', r2.batch.status === 'IMPORTAT' && versiuni(r2.stareNoua).length === 1 && versiuni(r2.stareNoua)[0].id === 'PMIX_47#1');
t('(1) P1 în vânzări (1190), XX-1 și YY-2 în coadă', aprox(net(r2.stareNoua), 1190) && r2.stareNoua.nemapate.length === 2);
const v1 = JSON.stringify(versiuni(r2.stareNoua)[0]);
// (2) aprobare XX-1 → P2
const s2b = aproba(r2.stareNoua, 'XX-1', 'P2');
// (3) reimport
const pg2 = pregatesteImport(s2b, { fisier: '4.7 august.xlsx', parsat: PART, tip: 'PMIX_47', acum: '2026-09-03T09:00:00.000Z' });
t('(3) reimportul NU mai e DUPLICAT_EXACT', pg2.rezultat.duplicat !== 'DUPLICAT_EXACT', `${pg2.rezultat.duplicat}`);
t('(3) … ci un reimport după mapare, declarat ca atare', pg2.rezultat.duplicat === 'REIMPORT_MAPARE', `${pg2.rezultat.duplicat}`);
t('(3) … valid, cu diagnostic explicit (nu blocant)', pg2.valid && pg2.rezultat.diagnostice.some(d => d.cod === 'REIMPORT_DUPA_MAPARE' && d.nivel !== 'BLOCANT'),
  pg2.rezultat.diagnostice.map(d => `${d.cod}:${d.nivel}`).join(','));
t('(3) … diagnosticul numește identitatea mapată', pg2.rezultat.diagnostice.find(d => d.cod === 'REIMPORT_DUPA_MAPARE')?.exemple.includes('XX-1') === true);
t('(3) Tower: butonul de activare e disponibil', randImport(pg2.rezultat).poateActiva && randImport(pg2.rezultat).motivBlocare === null);
const r2c = activeazaImport(s2b, pg2);
t('(3) activarea reușește', r2c.rezultat.stare === 'ACTIVAT', r2c.rezultat.erori.join(' | '));
// (4) fără dublare, fără rescriere de istoric
t('(4) P1 rămâne 100 buc / 1190 lei — NU dublat', vz(r2c.stareNoua, 'P1').length === 1 && vz(r2c.stareNoua, 'P1')[0].cant === 100 && aprox(vz(r2c.stareNoua, 'P1')[0].net, 1190));
t('(4) XX-1 intră ca P2: 15 buc / 225 lei', vz(r2c.stareNoua, 'P2').reduce((a, v) => a + v.cant, 0) === 15 && aprox(vz(r2c.stareNoua, 'P2').reduce((a, v) => a + v.net, 0), 225));
t('(4) total = 1190 + 225 = 1415', aprox(net(r2c.stareNoua), 1415), `${net(r2c.stareNoua)}`);
t('(4) YY-2 rămâne în coadă (2 buc / 40 lei), singur', r2c.stareNoua.nemapate.length === 1 && r2c.stareNoua.nemapate[0].denumire === 'YY-2');
t('(4) versiunea #1 rămâne în istoric, NESCHIMBATĂ', JSON.stringify({ ...versiuni(r2c.stareNoua)[0], activa: true }) === v1);
t('(4) … dar nu mai e activă; #2 e activă', versiuni(r2c.stareNoua).length === 2 && !versiuni(r2c.stareNoua)[0].activa && versiuni(r2c.stareNoua)[1].activa && versiuni(r2c.stareNoua)[1].id === 'PMIX_47#2');
t('(4) versiunea #2 are aceeași amprentă (același fișier)', versiuni(r2c.stareNoua)[1]?.amprenta === versiuni(r2c.stareNoua)[0]?.amprenta);
t('(4) urma de audit s-a scris ca activat', (r2c.stareNoua.auditImport ?? []).slice(-1)[0]?.activat === true);
// aliasul pe ACELAȘI produs: rândurile se cumulează pe cheie, nu se dublează
const s2same = aproba(r2.stareNoua, 'XX-1', 'P1');
const r2same = imp(s2same, '4.7 august.xlsx', PART, '2026-09-03T09:00:00.000Z');
t('alias pe același produs: P1 pe 03.08 = 100 + 10 = 110 buc, nu 210',
  r2same.batch.status === 'IMPORTAT' && vz(r2same.stareNoua, 'P1').find(v => v.data === '2026-08-03')?.cant === 110,
  JSON.stringify(vz(r2same.stareNoua, 'P1').map(v => [v.data, v.cant])));
t('… total = 1190 + 225', aprox(net(r2same.stareNoua), 1415));

// ————————————————————————————————— 3. fișier realmente duplicat: nimic nu s-a schimbat
console.log('\n— 3. Fără nicio schimbare semantică, duplicatul rămâne duplicat —');
const r3 = imp(r2.stareNoua, '4.7 august.xlsx', PART, '2026-09-03T09:00:00.000Z');
t('(a) același fișier, nimic aprobat: DUPLICAT_EXACT', r3.rezultat?.duplicat === 'DUPLICAT_EXACT' && r3.rezultat?.stare === 'DUPLICAT');
t('(a) … nicio versiune nouă, nicio vânzare în plus', versiuni(r3.stareNoua).length === 1 && aprox(net(r3.stareNoua), 1190));
t('(a) … coada neschimbată', r3.stareNoua.nemapate.length === 2);
// „lasă nemapat" nu e o mapare: nimic nu se rezolvă
const s3b = { ...r2.stareNoua, nemapate: r2.stareNoua.nemapate.filter(n => n.denumire !== 'XX-1') };
const r3b = imp(s3b, '4.7 august.xlsx', PART, '2026-09-03T09:00:00.000Z');
t('(b) după „lasă nemapat", tot DUPLICAT (nu s-a mapat nimic)', r3b.rezultat?.duplicat === 'DUPLICAT_EXACT' && versiuni(r3b.stareNoua).length === 1);
t('(b) … și coada NU e repopulată de un duplicat', r3b.stareNoua.nemapate.length === 1);
// alias pentru o identitate care NU e în acest fișier
const s3c = aproba(r2.stareNoua, 'ZZ-9', 'P2');
const r3c = imp(s3c, '4.7 august.xlsx', PART, '2026-09-03T09:00:00.000Z');
t('(c) un alias străin de fișier nu-l face „reimport"', r3c.rezultat?.duplicat === 'DUPLICAT_EXACT');
// după reimportul cu mapare, un al treilea import identic e iar duplicat — fără buclă
const r3d = imp(r2c.stareNoua, '4.7 august.xlsx', PART, '2026-09-03T10:00:00.000Z');
t('(d) după reimportul cu mapare, același fișier e din nou DUPLICAT', r3d.rezultat?.duplicat === 'DUPLICAT_EXACT' && versiuni(r3d.stareNoua).length === 2,
  `${r3d.rezultat?.duplicat} · ${versiuni(r3d.stareNoua).length} versiuni`);
// … până la următoarea aprobare (YY-2), când trece iar și completează fișierul
const s3e = aproba(r2c.stareNoua, 'YY-2', 'P2');
const r3e = imp(s3e, '4.7 august.xlsx', PART, '2026-09-03T11:00:00.000Z');
t('(e) aprobarea lui YY-2 deschide din nou reimportul', r3e.rezultat?.duplicat === 'REIMPORT_MAPARE' && r3e.batch.status === 'IMPORTAT');
t('(e) … totalul e acum tot fișierul: 1190 + 225 + 40 = 1455', aprox(net(r3e.stareNoua), 1455), `${net(r3e.stareNoua)}`);
t('(e) … coada e goală, trei versiuni în istoric, ultima activă', r3e.stareNoua.nemapate.length === 0 && versiuni(r3e.stareNoua).length === 3
  && versiuni(r3e.stareNoua).filter(v => v.activa).length === 1 && versiuni(r3e.stareNoua)[2].activa);
t('(e) … P1 tot o singură dată', vz(r3e.stareNoua, 'P1').length === 1 && vz(r3e.stareNoua, 'P1')[0].cant === 100);

// ————————————————————————————————— 4. 4.7 pe DENUMIRI (grilă): aceeași regulă
console.log('\n— 4. 4.7 pe denumiri: aliasul pe nume deschide reimportul —');
const GRILA: Parsat = { foaie: 'S', antete: ['Menu Item Name', 'Qty', 'Price', 'Extension'], randuri: [], matrice: [
  ['4.7 Sales Mix'], ['Fiscal Year: 2026'], ['Period: 8 Week: 1'], ['8/3/2026 - 8/9/2026'],
  ['Menu Item Name', 'Qty', 'Price', 'Extension'], ['CATEGORY SHAKES*'],
  ['Burger', 10, 11.900, '$119.00'], ['Milkshake Mango', 4, 15.000, '$60.00'], ['Total 14 $179.00'],
  ['Groups/Stores Selected for this Report'], ['FRYDAY IASI PALAS'],
] };
const g1 = importaUnificat(BAZA, { fisier: '4.7 nume.xlsx', parsat: GRILA, intern: 'SALES_MIX', locatie: 'L01', acum: ACUM });
t('(1) grila: Burger intră, Milkshake Mango în coadă', g1.batch.status === 'IMPORTAT' && g1.stareNoua.nemapate.map(n => n.denumire).join(',') === 'Milkshake Mango', g1.batch.erori.join(' | '));
const gA = aproba(g1.stareNoua, 'Milkshake Mango', 'P2');
const g2 = importaUnificat(gA, { fisier: '4.7 nume.xlsx', parsat: GRILA, intern: 'SALES_MIX', locatie: 'L01', acum: '2026-09-03T09:00:00.000Z' });
t('(2) reimportul după aliasul pe nume e REIMPORT_MAPARE', g2.rezultat?.duplicat === 'REIMPORT_MAPARE' && g2.batch.status === 'IMPORTAT', `${g2.rezultat?.duplicat}`);
t('(3) Milkshake Mango intră ca P2, Burger nu se dublează', vz(g2.stareNoua, 'P2').reduce((a, v) => a + v.cant, 0) === 4 && vz(g2.stareNoua, 'P1').reduce((a, v) => a + v.cant, 0) === 10);
const g3 = importaUnificat(g2.stareNoua, { fisier: '4.7 nume.xlsx', parsat: GRILA, intern: 'SALES_MIX', locatie: 'L01', acum: '2026-09-03T10:00:00.000Z' });
t('(4) a treia oară, fără altă mapare: DUPLICAT', g3.rezultat?.duplicat === 'DUPLICAT_EXACT');

// ————————————————————————————————— 4b. maparea poate veni și din nomenclator, nu doar din alias
console.log('\n— 4b. Un produs adăugat ulterior în nomenclator deschide la fel reimportul —');
const cuProdusNou: AppState = { ...r2.stareNoua, produse: [...r2.stareNoua.produse,
  { cod: 'YY-2', denumire: 'Ceva Nou', categorie: 'S', tip: 'SIMPLU', pretInstore: 20, pretDelivery: 20, tva: 19, activ: true }] };
const r4b = imp(cuProdusNou, '4.7 august.xlsx', PART, '2026-09-03T09:00:00.000Z');
t('PMIX: produs nou cu exact codul necunoscut → REIMPORT_MAPARE', r4b.rezultat?.duplicat === 'REIMPORT_MAPARE' && r4b.batch.status === 'IMPORTAT', `${r4b.rezultat?.duplicat}`);
t('… YY-2 intră (2 buc / 40 lei), XX-1 rămâne în coadă', vz(r4b.stareNoua, 'YY-2').reduce((a, v) => a + v.cant, 0) === 2
  && r4b.stareNoua.nemapate.map(n => n.denumire).join(',') === 'XX-1');
const cuNume: AppState = { ...g1.stareNoua, produse: [...g1.stareNoua.produse,
  { cod: 'P3', denumire: 'MILKSHAKE   mango', categorie: 'S', tip: 'SIMPLU', pretInstore: 15, pretDelivery: 15, tva: 19, activ: true }] };
const g4b = importaUnificat(cuNume, { fisier: '4.7 nume.xlsx', parsat: GRILA, intern: 'SALES_MIX', locatie: 'L01', acum: '2026-09-03T09:00:00.000Z' });
t('4.7 pe denumiri: produs nou cu numele (pe cheia de potrivire, nu literal) → REIMPORT_MAPARE',
  g4b.rezultat?.duplicat === 'REIMPORT_MAPARE' && vz(g4b.stareNoua, 'P3').reduce((a, v) => a + v.cant, 0) === 4, `${g4b.rezultat?.duplicat}`);

// ————————————————————————————————— 5. versiuni de dinainte de contract
console.log('\n— 5. O versiune activată înainte de acest contract nu poartă lista: rămâne duplicat —');
const vechi: AppState = { ...s2b, versiuniImport: versiuni(s2b).map(v => { const { nemapate: _n, ...rest } = v as typeof v & { nemapate?: string[] }; return rest; }) };
const r5 = imp(vechi, '4.7 august.xlsx', PART, '2026-09-03T09:00:00.000Z');
t('fără listă pe versiune → DUPLICAT_EXACT, ca azi (limita e declarată)', r5.rezultat?.duplicat === 'DUPLICAT_EXACT');

// ————————————————————————————————— 6. maparea NU deschide căi de dublare
console.log('\n— 6. Maparea deschide reimportul doar pentru același fișier, încă în vigoare —');
const inchis = (r: ReturnType<typeof imp>) => r.rezultat?.diagnostice.find(d => d.cod === 'IMPORT_DUPLICAT')?.detaliu ?? '';
// (a) același conținut sub ALT nume: canalul s-ar deduce din nume și rândurile ar intra a doua oară
const FARA_CANAL = P(ANTETE.filter(a => a !== 'Canal'), [
  { Data: '2026-08-03', Locatie: 'L01', 'Cod produs': 'P1', Denumire: 'Burger', Cantitate: 100, 'Valoare neta': 1190 },
  { Data: '2026-08-03', Locatie: 'L01', 'Cod produs': 'XX-1', Denumire: 'Milkshake Mango', Cantitate: 15, 'Valoare neta': 225 }]);
const a1 = imp(BAZA, '4.7 instore.xlsx', FARA_CANAL);
t('(a) fișier fără coloană de canal, canalul din nume: INSTORE', a1.batch.status === 'IMPORTAT' && vz(a1.stareNoua, 'P1')[0]?.canal === 'INSTORE');
const a2 = imp(aproba(a1.stareNoua, 'XX-1', 'P2'), '4.7 delivery.xlsx', FARA_CANAL, '2026-09-03T09:00:00.000Z');
t('(a) același conținut sub alt nume rămâne DUPLICAT și după alias', a2.rezultat?.duplicat === 'DUPLICAT_EXACT', `${a2.rezultat?.duplicat}`);
t('(a) … nimic dublat pe DELIVERY: total rămâne 1190', aprox(net(a2.stareNoua), 1190) && !a2.stareNoua.vanzari.some(v => v.canal === 'DELIVERY'), `${net(a2.stareNoua)}`);
t('(a) … iar diagnosticul spune de ce (alt nume)', /alt nume de fișier/.test(inchis(a2)), inchis(a2).slice(0, 90));
const a3 = imp(aproba(a1.stareNoua, 'XX-1', 'P2'), '4.7 instore.xlsx', FARA_CANAL, '2026-09-03T09:00:00.000Z');
t('(a) sub ACELAȘI nume, reimportul trece: 1190 + 225', a3.rezultat?.duplicat === 'REIMPORT_MAPARE' && aprox(net(a3.stareNoua), 1415), `${a3.rezultat?.duplicat} ${net(a3.stareNoua)}`);
// (b) fișierul a fost CORECTAT (același nume, alt conținut): cel vechi nu se mai redeschide
const V2 = P(ANTETE, [rand('P1', 'Burger', 120, 1428), rand('XX-1', 'Milkshake Mango', 10, 150), rand('XX-1', 'Milkshake Mango', 5, 75, '2026-08-04'), rand('YY-2', 'Ceva Nou', 2, 40)]);
const b1 = imp(BAZA, '4.7 august.xlsx', PART);
const b2 = imp(b1.stareNoua, '4.7 august.xlsx', V2, '2026-09-03T09:00:00.000Z');
t('(b) corecția e REIMPORT_ACTUALIZAT: P1 = 1428', b2.rezultat?.duplicat === 'REIMPORT_ACTUALIZAT' && aprox(net(b2.stareNoua), 1428));
const b3 = imp(aproba(b2.stareNoua, 'XX-1', 'P2'), '4.7 august.xlsx', PART, '2026-09-03T10:00:00.000Z');
t('(b) fișierul VECHI după alias rămâne DUPLICAT (a fost înlocuit)', b3.rezultat?.duplicat === 'DUPLICAT_EXACT', `${b3.rezultat?.duplicat}`);
t('(b) … corecția NU e anulată: P1 rămâne 1428', aprox(vz(b3.stareNoua, 'P1').reduce((a, v) => a + v.net, 0), 1428));
t('(b) … diagnosticul numește versiunea care l-a înlocuit', /înlocuit de PMIX_47#2/.test(inchis(b3)), inchis(b3).slice(0, 90));
const b4 = imp(aproba(b2.stareNoua, 'XX-1', 'P2'), '4.7 august.xlsx', V2, '2026-09-03T10:00:00.000Z');
t('(b) fișierul CURENT după alias trece: 1428 + 225', b4.rezultat?.duplicat === 'REIMPORT_MAPARE' && aprox(net(b4.stareNoua), 1653), `${b4.rezultat?.duplicat} ${net(b4.stareNoua)}`);
// (c) alt fișier, alt nume, aceeași fereastră: tot „înlocuit"
const c1 = imp(BAZA, '4.7 aug v1.xlsx', PART);
const c2 = imp(c1.stareNoua, '4.7 aug v2.xlsx', V2, '2026-09-03T09:00:00.000Z');
const c3 = imp(aproba(c2.stareNoua, 'XX-1', 'P2'), '4.7 aug v1.xlsx', PART, '2026-09-03T10:00:00.000Z');
t('(c) un fișier mai nou pe aceeași fereastră închide reimportul celui vechi', c3.rezultat?.duplicat === 'DUPLICAT_EXACT' && aprox(vz(c3.stareNoua, 'P1').reduce((a, v) => a + v.net, 0), 1428), `${c3.rezultat?.duplicat}`);
// (d) o versiune mai nouă pe ALTĂ fereastră (septembrie) NU blochează augustul
const SEPT2 = P(ANTETE, [rand('P1', 'Burger', 50, 595, '2026-09-01'), rand('YY-2', 'Ceva Nou', 3, 60, '2026-09-01')]);
const d1 = imp(BAZA, '4.7 august.xlsx', PART);
const d2 = imp(d1.stareNoua, '4.7 sept.xlsx', SEPT2, '2026-09-03T09:00:00.000Z');
const d3 = imp(aproba(d2.stareNoua, 'XX-1', 'P2'), '4.7 august.xlsx', PART, '2026-09-03T10:00:00.000Z');
t('(d) septembrie importat după august nu închide augustul: 1190 + 595 + 225', d3.rezultat?.duplicat === 'REIMPORT_MAPARE' && aprox(net(d3.stareNoua), 2010), `${d3.rezultat?.duplicat} ${net(d3.stareNoua)}`);
// (e) produs ȘTERS după activare: rândurile lui ar ajunge în coadă cu vânzările încă în stare
const e1 = imp(BAZA, '4.7 august.xlsx', PART);
const eS = aproba({ ...e1.stareNoua, produse: e1.stareNoua.produse.filter(p => p.cod !== 'P1') }, 'XX-1', 'P2');
const e2 = imp(eS, '4.7 august.xlsx', PART, '2026-09-03T09:00:00.000Z');
t('(e) produs șters + alias: reimportul rămâne închis', e2.rezultat?.duplicat === 'DUPLICAT_EXACT', `${e2.rezultat?.duplicat}`);
t('(e) … banii NU sunt de două ori: P1 nu apare în coadă', !e2.stareNoua.nemapate.some(n => n.denumire === 'P1') && aprox(net(e2.stareNoua), 1190));
t('(e) … diagnosticul numește identitatea dispărută', /P1/.test(inchis(e2)) && /nu se mai mapează/.test(inchis(e2)), inchis(e2).slice(0, 100));

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
