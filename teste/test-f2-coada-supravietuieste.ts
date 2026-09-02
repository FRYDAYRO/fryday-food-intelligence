// F2 — un 4.7 în care TOATE codurile sunt necunoscute nu mai pierde coada de aprobare.
//
// Înainte: importul cădea pe NIMIC_IMPORTAT, `activeazaImport` arunca starea candidat cu
// tot cu `nemapate`, iar avertismentul spunea că rândurile „au fost puse în coada de
// aprobare". Nu fuseseră. Banii dispăreau cu o promisiune falsă lângă ei.
//
// Ce se cere aici, în ordinea cerințelor:
//   1. 100% coduri necunoscute → coada populată, lei și buc conservați, proveniență
//      păstrată, NICIO vânzare atribuită prin ghicit, NICIO versiune creată;
//   2. importul parțial necunoscut → comportament identic cu înainte;
//   3. NIMIC_IMPORTAT real, fără nemapate → comportament identic cu înainte;
//   4. mesajul spune exact ce s-a întâmplat, în fiecare caz.
// Și, ca garda generală să nu fie relaxată: orice ALT motiv de respingere aruncă în
// continuare candidatul, iar mesajul o spune.
import { importaUnificat, pregatesteImport, activeazaImport } from '../src/lib/import-center';
import { importa, type Parsat } from '../src/lib/importer';
import { coadaAprobare } from '../src/lib/aprobare';
import { randImport } from '../src/lib/fc-tower';
import { stareGoala } from '../src/lib/seed';
import type { AppState } from '../src/lib/types';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
const ACUM = '2026-09-02T08:00:00.000Z';
const P = (antete: string[], randuri: Record<string, unknown>[]): Parsat => ({ antete, randuri, foaie: 'S1' });

const BAZA: AppState = {
  ...stareGoala(),
  locatii: [{ cod: 'L01', nume: 'FRYDAY IASI PALAS' }],
  produse: [{ cod: 'P1', denumire: 'Burger', categorie: 'B', tip: 'SIMPLU', pretInstore: 11.9, pretDelivery: 11.9, tva: 19, activ: true }],
};
const ANTETE = ['Data', 'Locatie', 'Cod produs', 'Denumire', 'Cantitate', 'Valoare neta', 'Canal'];
const rand = (cod: string, den: string, cant: number, lei: number, data = '2026-08-03') =>
  ({ Data: data, Locatie: 'L01', 'Cod produs': cod, Denumire: den, Cantitate: cant, 'Valoare neta': lei, Canal: 'INSTORE' });

// ————————————————————————————————— 1. 100 % coduri necunoscute
console.log('— 1. Toate codurile necunoscute —');
//   XX-1  10 buc / 150 lei
//   XX-1   5 buc /  75 lei   (același cod, cumulat)
//   YY-2   2 buc /  40 lei
const TOT = P(ANTETE, [rand('XX-1', 'Milkshake Mango', 10, 150), rand('XX-1', 'Milkshake Mango', 5, 75, '2026-08-04'), rand('YY-2', 'Ceva Nou', 2, 40)]);
const r = importaUnificat(BAZA, { fisier: '4.7 nou.xlsx', parsat: TOT, intern: 'PMIX', acum: ACUM });
const s = r.stareNoua;
t('importul NU e un succes normal', r.batch.status === 'ESUAT', r.batch.status);
t('rezultatul canonic e RESPINS (semantica actuală)', r.rezultat?.stare === 'RESPINS', r.rezultat?.stare);
t('coada e POPULATĂ', s.nemapate.length === 2, `${s.nemapate.length} intrări`);
t('bucățile sunt conservate: 17', s.nemapate.reduce((a, n) => a + n.cant, 0) === 17);
t('leii sunt conservați: 265', aprox(s.nemapate.reduce((a, n) => a + n.valoare, 0), 265));
t('codul repetat e cumulat (15 buc, 225 lei)',
  s.nemapate.find(n => n.denumire === 'XX-1')?.cant === 15 && aprox(s.nemapate.find(n => n.denumire === 'XX-1')?.valoare ?? 0, 225));
t('proveniență: fișierul e reținut', s.nemapate.every(n => n.fisier === '4.7 nou.xlsx'));
t('proveniență: sursa e declarată', s.nemapate.every(n => n.sursa === 'PMIX'));
t('urma de audit s-a scris', (s.auditImport ?? []).length === 1);
t('… și spune că NU s-a activat', (s.auditImport ?? [])[0]?.activat === false);
t('NICIO vânzare atribuită prin ghicit', s.vanzari.length === 0, `${s.vanzari.length}`);
t('NICIO versiune de sursă creată', (s.versiuniImport ?? []).length === 0);
t('nicio locație inventată', s.locatii.length === 1);
t('coada de aprobare chiar le vede', coadaAprobare(s).length === 2, `${coadaAprobare(s).length}`);
const er = r.batch.erori.join(' | ');
t('mesajul e o EROARE (nu succes), și e exact', /Niciun rând costabil/.test(er), er.slice(0, 80));
t('… numără codurile', /2 coduri/.test(er));
t('… spune bucățile și leii', /17 buc/.test(er) && /265 lei/.test(er));
t('… spune că au ajuns în coadă', /coada de aprobare/.test(er));
t('… spune că nicio vânzare și nicio versiune', /Nicio vânzare/.test(er) && /nicio versiune/.test(er));
t('… și NU promite un reimport (acela e refuzat ca duplicat — F3)', !/reimport/i.test(er));
// Control Tower: butonul se oferă, cu numele lui, exact pe acest caz
const rt = randImport(r.rezultat!);
t('Tower: rezultatul declară intrările de păstrat', r.rezultat?.nemapateDePastrat === 2, `${r.rezultat?.nemapateDePastrat}`);
t('Tower: butonul e disponibil', rt.poateActiva === true);
t('Tower: … și e „păstrează coada", nu „activează"', rt.doarCoada === true);

// ————————————————————————————————— 2. parțial necunoscut: identic cu înainte
console.log('\n— 2. Parțial necunoscut: comportamentul de dinainte rămâne —');
const PART = P(ANTETE, [rand('P1', 'Burger', 100, 1190), rand('XX-1', 'Milkshake Mango', 10, 150)]);
const rp = importaUnificat(BAZA, { fisier: '4.7 partial.xlsx', parsat: PART, intern: 'PMIX', acum: ACUM });
const sp = rp.stareNoua;
t('importul reușește', rp.batch.status === 'IMPORTAT');
t('rândul cunoscut a intrat', sp.vanzari.length === 1 && sp.vanzari[0].cant === 100);
t('versiunea s-a creat', (sp.versiuniImport ?? []).length === 1);
t('codul necunoscut e în coadă', sp.nemapate.length === 1 && sp.nemapate[0].denumire === 'XX-1');
t('Σ buc = 100 + 10', sp.vanzari.reduce((a, v) => a + v.cant, 0) + sp.nemapate.reduce((a, n) => a + n.cant, 0) === 110);
t('Σ lei = 1190 + 150', aprox(sp.vanzari.reduce((a, v) => a + v.net, 0) + sp.nemapate.reduce((a, n) => a + n.valoare, 0), 1340));
const direct = importa('PMIX', PART, '4.7 partial.xlsx', BAZA);
t('ACELEAȘI cifre ca motorul direct', direct.stateNou.vanzari.length === sp.vanzari.length
  && direct.stateNou.nemapate.length === sp.nemapate.length);
const avp = rp.batch.avertismente.join(' | ');
t('mesajul spune că a intrat în coadă (aici e adevărat)', /1 intrări noi în coada de aprobare/.test(avp), avp.slice(0, 120));
const pgValid = pregatesteImport(BAZA, { fisier: '4.7 partial.xlsx', parsat: PART, tip: 'PMIX_47', acum: ACUM });
t('Tower: pe import valid butonul e „Activează", nu „păstrează coada"',
  randImport(pgValid.rezultat).poateActiva && !randImport(pgValid.rezultat).doarCoada && pgValid.rezultat.nemapateDePastrat === 0);
t('Tower: după activare nu mai există buton (deja activat)', !randImport(rp.rezultat!).poateActiva);
t('… cu buc și lei', /10 buc/.test(avp) && /150 lei/.test(avp));

// ————————————————————————————————— 3. NIMIC_IMPORTAT real, fără nemapate
console.log('\n— 3. Nimic importat, fără coadă: identic cu înainte —');
const GOL = P(ANTETE, []);
const rg = importaUnificat(BAZA, { fisier: 'gol.xlsx', parsat: GOL, intern: 'PMIX', acum: ACUM });
t('fișier gol: respins', rg.batch.status === 'ESUAT');
t('… starea rămâne neschimbată (în afară de audit)', rg.stareNoua.nemapate.length === 0 && rg.stareNoua.vanzari.length === 0);
t('… fără mesajul de coadă', !/coada de aprobare/.test(rg.batch.erori.join(' ') + rg.batch.avertismente.join(' ')));
const DATE_REA = P(ANTETE, [rand('P1', 'Burger', 5, 59.5, 'nu-e-data')]);
const rd = importaUnificat(BAZA, { fisier: 'date-rele.xlsx', parsat: DATE_REA, intern: 'PMIX', acum: ACUM });
t('date necitibile: respins', rd.batch.status === 'ESUAT');
t('… nimic în coadă, nimic în vânzări', rd.stareNoua.nemapate.length === 0 && rd.stareNoua.vanzari.length === 0);

// ————————————————————————————————— 4. garda generală NU e relaxată
console.log('\n— 4. Orice ALT motiv de respingere aruncă în continuare candidatul —');
// același fișier 100% necunoscut, a doua oară: un import respins n-a creat versiune, deci nu
// are de ce să fie „duplicat" — dar trebuie să fie IDEMPOTENT: coada rămâne 2, nu 4
const r2 = importaUnificat(s, { fisier: '4.7 nou.xlsx', parsat: TOT, intern: 'PMIX', acum: ACUM });
t('reimportul identic nu e duplicat (nu exista versiune)', r2.rezultat?.duplicat === 'NOU');
t('… și e idempotent: coada rămâne 2, nu se dublează', r2.stareNoua.nemapate.length === 2, `${r2.stareNoua.nemapate.length}`);
t('… tot fără vânzări și fără versiune', r2.stareNoua.vanzari.length === 0 && (r2.stareNoua.versiuniImport ?? []).length === 0);
// „Lasă nemapat" golește coada; un import NOU al aceluiași fișier o repopulează — aceeași
// semantică ca la 4.7 pe denumiri, unde coada e „ce e încă nerezolvat în ultimul import".
// O decizie persistentă de „ignoră definitiv" ar fi F3, nu F2.
const golit: AppState = { ...s, nemapate: [] };
const r3 = importaUnificat(golit, { fisier: '4.7 nou.xlsx', parsat: TOT, intern: 'PMIX', acum: ACUM });
t('după „lasă nemapat", un import nou repopulează coada (semantica existentă)', r3.stareNoua.nemapate.length === 2);
// respingere din ALT motiv, cu coduri necunoscute în fișier: granularitate mixtă
// (un rând cu restaurant, unul fără) — candidatul e aruncat, iar mesajul o spune
const MIXT = P(ANTETE, [rand('XX-1', 'Milkshake Mango', 10, 150),
  { Data: '2026-08-04', Locatie: '', 'Cod produs': 'YY-2', Denumire: 'Ceva', Cantitate: 2, 'Valoare neta': 40, Canal: 'INSTORE' }]);
const rm = importaUnificat(BAZA, { fisier: 'mixt.xlsx', parsat: MIXT, intern: 'PMIX', acum: ACUM });
t('granularitate mixtă + coduri necunoscute: respins', rm.batch.status === 'ESUAT');
t('… cu alt blocant decât NIMIC_IMPORTAT', (rm.rezultat?.diagnostice ?? []).some(d => d.nivel === 'BLOCANT' && d.cod !== 'NIMIC_IMPORTAT'),
  (rm.rezultat?.diagnostice ?? []).filter(d => d.nivel === 'BLOCANT').map(d => d.cod).join(','));
t('… coada NU e păstrată (garda nu e relaxată)', rm.stareNoua.nemapate.length === 0, `${rm.stareNoua.nemapate.length}`);
t('… iar mesajul spune că coada NU a fost păstrată',
  /NU a fost păstrată/.test(rm.rezultat?.avertismente.join(' ') ?? ''),
  rm.rezultat?.avertismente.find(a => /NU a fost păstrată/.test(a))?.slice(0, 80));
t('… nicio vânzare ghicită pe restaurantul lipsă', rm.stareNoua.vanzari.length === 0);
// coloană obligatorie lipsă: nici măcar nu există candidat de păstrat
const FARA_COD = P(['Data', 'Locatie', 'Denumire', 'Cantitate', 'Canal'],
  [{ Data: '2026-08-03', Locatie: 'L01', Denumire: 'X', Cantitate: 1, Canal: 'INSTORE' }]);
const rc = importaUnificat(BAZA, { fisier: 'fara-cod.xlsx', parsat: FARA_COD, intern: 'PMIX', acum: ACUM });
t('coloană lipsă: respins, coada goală', rc.batch.status === 'ESUAT' && rc.stareNoua.nemapate.length === 0);
t('Tower: pe respingere din alt motiv, NICIUN buton', !randImport(rc.rezultat!).poateActiva && !randImport(rc.rezultat!).doarCoada);
t('Tower: pe respingere mixtă, NICIUN buton', !randImport(rm.rezultat!).poateActiva && rm.rezultat?.nemapateDePastrat === 0);
// DUPLICAT al unei versiuni deja ACTIVATE: banii sunt deja în vânzări. Dacă între timp
// produsul a dispărut din nomenclator, același fișier ar cădea pe NIMIC_IMPORTAT — dar coada
// nu are voie să-i reprezinte a doua oară. Garda de duplicat rămâne deasupra.
const DOAR_P1 = P(ANTETE, [rand('P1', 'Burger', 100, 1190)]);
const activ = importaUnificat(BAZA, { fisier: '4.7 iulie.xlsx', parsat: DOAR_P1, intern: 'PMIX', acum: ACUM }).stareNoua;
t('(pregătire) prima trecere e activată, cu versiune', (activ.versiuniImport ?? []).length === 1 && activ.vanzari.length === 1);
const faraProdus: AppState = { ...activ, produse: [] };
const rdup = importaUnificat(faraProdus, { fisier: '4.7 iulie.xlsx', parsat: DOAR_P1, intern: 'PMIX', acum: ACUM });
t('același fișier, produsul șters: DUPLICAT_EXACT', rdup.rezultat?.duplicat === 'DUPLICAT_EXACT', `${rdup.rezultat?.duplicat}`);
t('… coada NU e păstrată (banii sunt deja în vânzări)', rdup.stareNoua.nemapate.length === 0, `${rdup.stareNoua.nemapate.length}`);
t('… vânzările existente rămân neatinse', rdup.stareNoua.vanzari.length === 1);
t('… fără buton în Tower', !randImport(rdup.rezultat!).poateActiva && rdup.rezultat?.nemapateDePastrat === 0);

// ————————————————————————————————— 5. calea pas cu pas dă același rezultat
console.log('\n— 5. pregătește + activează = poarta unică —');
const pg = pregatesteImport(BAZA, { fisier: '4.7 nou.xlsx', parsat: TOT, tip: 'PMIX_47', acum: ACUM });
t('pregătirea e invalidă (NIMIC_IMPORTAT)', !pg.valid && pg.rezultat.diagnostice.some(d => d.cod === 'NIMIC_IMPORTAT'));
t('… dar candidatul poartă coada', (pg.stareCandidat?.nemapate.length ?? 0) === 2);
const ac = activeazaImport(BAZA, pg);
t('activarea păstrează coada', ac.stareNoua.nemapate.length === 2);
t('… fără versiune', (ac.stareNoua.versiuniImport ?? []).length === 0);
t('… cu același rezultat ca poarta unică', ac.stareNoua.nemapate.length === s.nemapate.length
  && ac.rezultat.erori[0] === r.rezultat?.erori[0]);


// ————————————————————————————————— 6. o pregătire veche nu rescrie coada de acum
console.log('\n— 6. Garda de stare veche acoperă și calea „păstrează coada" —');
// Pregătirea lui TOT e calculată pe BAZA. Între timp starea se mișcă. Activarea acelei
// pregătiri trebuie REFUZATĂ, nu aplicată peste o coadă care nu mai e cea de atunci.
const STALE = /Starea s-a schimbat/;
const ZZ = { denumire: 'ZZ-9', categorie: '?', cant: 3, valoare: 33, fisier: 'alt 4.7.xlsx', sursa: 'PMIX' as const };
// (a) altă intrare a ajuns în coadă între timp
const cuAlta: AppState = { ...BAZA, nemapate: [ZZ] };
const acA = activeazaImport(cuAlta, pg);
t('(a) activarea unei pregătiri vechi e refuzată', acA.rezultat.stare === 'RESPINS' && STALE.test(acA.rezultat.erori.join(' ')),
  acA.rezultat.erori.join(' ').slice(0, 60));
t('(a) intrarea adăugată între timp NU e ștearsă', acA.stareNoua.nemapate.length === 1 && acA.stareNoua.nemapate[0].denumire === 'ZZ-9',
  acA.stareNoua.nemapate.map(n => n.denumire).join(','));
t('(a) rezultatul nu mai oferă „păstrează coada"', acA.rezultat.nemapateDePastrat === 0 && !randImport(acA.rezultat).poateActiva);
t('(a) urma de audit s-a scris, ca neactivat', (acA.stareNoua.auditImport ?? []).length === 1 && acA.stareNoua.auditImport![0].activat === false);
// (b) o denumire a fost ALOCATĂ (alias) după prima activare
const dupaPrima = activeazaImport(BAZA, pg).stareNoua;
const cuAlias: AppState = {
  ...dupaPrima,
  produse: dupaPrima.produse.map(p => p.cod === 'P1' ? { ...p, aliasuri: ['XX-1'] } : p),
  nemapate: dupaPrima.nemapate.filter(n => n.denumire !== 'XX-1'),
};
const acB = activeazaImport(cuAlias, pg);
t('(b) după o alocare, aceeași pregătire e refuzată', acB.rezultat.stare === 'RESPINS' && STALE.test(acB.rezultat.erori.join(' ')));
t('(b) denumirea alocată NU reînvie în coadă', acB.stareNoua.nemapate.every(n => n.denumire !== 'XX-1')
  && acB.stareNoua.nemapate.length === 1, acB.stareNoua.nemapate.map(n => n.denumire).join(','));
// (c) o denumire a fost lăsată nemapată (scoasă din coadă) — singura schimbare e coada
const cuRenunt: AppState = { ...dupaPrima, nemapate: dupaPrima.nemapate.filter(n => n.denumire !== 'YY-2') };
const acC = activeazaImport(cuRenunt, pg);
t('(c) după „lasă nemapat", aceeași pregătire e refuzată', acC.rezultat.stare === 'RESPINS' && STALE.test(acC.rezultat.erori.join(' ')));
t('(c) denumirea scoasă NU reînvie', acC.stareNoua.nemapate.length === 1 && acC.stareNoua.nemapate[0].denumire === 'XX-1',
  acC.stareNoua.nemapate.map(n => n.denumire).join(','));
// (d) aceeași pregătire, activată de două ori la rând
const acD = activeazaImport(dupaPrima, pg);
t('(d) a doua activare a ACELEIAȘI pregătiri e refuzată', acD.rezultat.stare === 'RESPINS' && STALE.test(acD.rezultat.erori.join(' ')));
t('(d) coada rămâne exact cum era', JSON.stringify(acD.stareNoua.nemapate) === JSON.stringify(dupaPrima.nemapate));
// (e) o pregătire NOUĂ, pe starea mișcată, merge — și adaugă peste coada de acum, nu o înlocuiește
const pgNou = pregatesteImport(cuAlta, { fisier: '4.7 nou.xlsx', parsat: TOT, tip: 'PMIX_47', acum: ACUM });
const acE = activeazaImport(cuAlta, pgNou);
t('(e) pregătirea proaspătă pe starea curentă păstrează coada', acE.stareNoua.nemapate.length === 3, `${acE.stareNoua.nemapate.length}`);
t('(e) intrarea de dinainte NU e pierdută, iar cele noi sunt lângă ea (buc și lei intacte)',
  [...acE.stareNoua.nemapate].sort((a, b) => a.denumire.localeCompare(b.denumire)).map(n => `${n.denumire}:${n.cant}/${n.valoare}`).join(',')
    === 'XX-1:15/225,YY-2:2/40,ZZ-9:3/33', acE.stareNoua.nemapate.map(n => `${n.denumire}:${n.cant}/${n.valoare}`).join(','));
t('(e) mesajul numără doar intrările aduse de acest fișier (2), nu toată coada', /2 coduri/.test(acE.rezultat.erori.join(' ')));
// (f) semantica activării valide nu s-a schimbat: și ea e refuzată pe stare veche (a fost și înainte)
const pgValid2 = pregatesteImport(BAZA, { fisier: 'ok.xlsx', parsat: P(ANTETE, [rand('P1', 'Burger', 1, 11.9)]), tip: 'PMIX_47', acum: ACUM });
t('(f) o pregătire validă veche e refuzată la fel', pgValid2.valid
  && STALE.test(activeazaImport(cuAlta, pgValid2).rezultat.erori.join(' ')));
t('(f) … iar pe starea ei se activează', activeazaImport(BAZA, pgValid2).rezultat.stare === 'ACTIVAT');


// ————————————————————————————————— 7. cifrele din mesaj sunt cele din coadă
console.log('\n— 7. Mesajul spune exact ce a primit coada —');
// (a) XX-1 era deja în coadă din iulie (8 buc / 120 lei); fișierul nou aduce XX-1 15/225 și YY-2 2/40
const cuIulie: AppState = { ...BAZA, nemapate: [{ denumire: 'XX-1', categorie: 'Milkshake Mango', cant: 8, valoare: 120, fisier: '4.7 iulie.xlsx', sursa: 'PMIX' }] };
const r7a = importaUnificat(cuIulie, { fisier: '4.7 nou.xlsx', parsat: TOT, intern: 'PMIX', acum: ACUM });
t('(a) coada e păstrată', r7a.batch.status === 'ESUAT' && r7a.stareNoua.nemapate.length === 2);
t('(a) codul deja în coadă e ÎMPROSPĂTAT cu cifrele ultimului import (15 buc / 225 lei)',
  r7a.stareNoua.nemapate.find(n => n.denumire === 'XX-1')?.cant === 15
  && aprox(r7a.stareNoua.nemapate.find(n => n.denumire === 'XX-1')?.valoare ?? 0, 225)
  && r7a.stareNoua.nemapate.find(n => n.denumire === 'XX-1')?.fisier === '4.7 nou.xlsx');
const er7a = r7a.batch.erori.join(' ');
t('(a) mesajul numără AMBELE coduri aduse (2), nu doar cel nou', /2 coduri necunoscute/.test(er7a), er7a.slice(0, 70));
t('(a) … cu bucățile și leii pe care coada chiar i-a primit: 17 buc, 265 lei', /17 buc/.test(er7a) && /265 lei/.test(er7a));
t('(a) … și nu mai pretinde „toate cele"', !/toate cele/.test(er7a));
t('(a) Tower: 2 de păstrat', r7a.rezultat?.nemapateDePastrat === 2);
// (b) luna următoare: ACELEAȘI coduri, alt fișier, alte cifre — banii nu se pierd
const SEPT = P(ANTETE, [rand('XX-1', 'Milkshake Mango', 30, 450, '2026-09-01'), rand('YY-2', 'Ceva Nou', 7, 140, '2026-09-02')]);
const r7b = importaUnificat(s, { fisier: '4.7 sept.xlsx', parsat: SEPT, intern: 'PMIX', acum: ACUM });
t('(b) fișierul lunii următoare, cu aceleași coduri, e reținut', r7b.batch.status === 'ESUAT' && r7b.rezultat?.nemapateDePastrat === 2);
t('(b) coada poartă cifrele din septembrie (37 buc / 590 lei), nu pe cele vechi',
  r7b.stareNoua.nemapate.reduce((a, n) => a + n.cant, 0) === 37 && aprox(r7b.stareNoua.nemapate.reduce((a, n) => a + n.valoare, 0), 590),
  r7b.stareNoua.nemapate.map(n => `${n.denumire}:${n.cant}/${n.valoare}`).join(','));
t('(b) … fără dubluri de identitate', r7b.stareNoua.nemapate.length === 2);
t('(b) mesajul spune 37 buc și 590 lei', /37 buc/.test(r7b.batch.erori.join(' ')) && /590 lei/.test(r7b.batch.erori.join(' ')));
t('(b) reimportul IDENTIC rămâne idempotent (nimic adus, nimic scris)',
  importaUnificat(r7b.stareNoua, { fisier: '4.7 sept.xlsx', parsat: SEPT, intern: 'PMIX', acum: ACUM }).rezultat?.nemapateDePastrat === 0);
// (c) diagnosticul de lângă buton spune motivul real, nu „valori necitibile"
const d7 = r.rezultat?.diagnostice.find(d => d.cod === 'NIMIC_IMPORTAT');
t('(c) NIMIC_IMPORTAT explică: coduri necunoscute, nu valori necitibile',
  !!d7 && /coduri necunoscute/.test(d7.detaliu ?? '') && !/necitibile/.test(d7.detaliu ?? ''), d7?.detaliu?.slice(0, 80));
t('(c) … iar pe un fișier cu date necitibile rămâne textul vechi',
  /necitibile/.test(rd.rezultat?.diagnostice.find(d => d.cod === 'NIMIC_IMPORTAT')?.detaliu ?? ''));
t('(c) PRODUS_LIPSA nu mai spune că vânzările „intră"',
  !/intră, dar/.test(r.rezultat?.diagnostice.find(d => d.cod === 'PRODUS_LIPSA')?.detaliu ?? ''));
// (d) un import curat nu poartă mesajul de coadă
const r7d = importaUnificat(BAZA, { fisier: 'curat.xlsx', parsat: DOAR_P1, intern: 'PMIX', acum: ACUM });
t('(d) importul complet mapat nu are niciun mesaj de coadă', r7d.batch.status === 'IMPORTAT'
  && !/coada de aprobare/.test(r7d.batch.avertismente.join(' ') + r7d.batch.erori.join(' ')), r7d.batch.avertismente.join(' | ').slice(0, 80));
// (e) 4.7 pe DENUMIRI (grila NCR), 100 % necunoscut: aceeași semantică, cu „denumiri" în mesaj
const GRILA: Parsat = { foaie: 'S', antete: ['Menu Item Name', 'Qty', 'Price', 'Extension'], randuri: [], matrice: [
  ['4.7 Sales Mix'], ['Fiscal Year: 2026'], ['Period: 8 Week: 1'], ['8/3/2026 - 8/9/2026'],
  ['Menu Item Name', 'Qty', 'Price', 'Extension'], ['CATEGORY SHAKES*'],
  ['Milkshake Mango', 10, 15.000, '$150.00'], ['Ceva Nou', 2, 20.000, '$40.00'], ['Total 12 $190.00'],
  ['Groups/Stores Selected for this Report'], ['FRYDAY IASI PALAS'],
] };
const r7e = importaUnificat(BAZA, { fisier: '4.7 nume.xlsx', parsat: GRILA, intern: 'SALES_MIX', locatie: 'L01', acum: ACUM });
const bloc7e = (r7e.rezultat?.diagnostice ?? []).filter(d => d.nivel === 'BLOCANT').map(d => d.cod);
t('(e) 4.7 pe denumiri, nimic mapat: singurul blocant e NIMIC_IMPORTAT', bloc7e.join(',') === 'NIMIC_IMPORTAT', bloc7e.join(','));
t('(e) coada e păstrată, cu sursa SALES_MIX', r7e.stareNoua.nemapate.length === 2 && r7e.stareNoua.nemapate.every(n => n.sursa === 'SALES_MIX'),
  r7e.stareNoua.nemapate.map(n => `${n.denumire}/${n.sursa}`).join(','));
t('(e) leii sunt conservați: 190', aprox(r7e.stareNoua.nemapate.reduce((a, n) => a + n.valoare, 0), 190));
t('(e) mesajul vorbește de „denumiri", nu de „coduri"', /2 denumiri necunoscute/.test(r7e.batch.erori.join(' ')), r7e.batch.erori.join(' ').slice(0, 80));
t('(e) nicio vânzare, nicio versiune', r7e.stareNoua.vanzari.length === 0 && (r7e.stareNoua.versiuniImport ?? []).length === 0);

console.log(`\n${ok} teste trecute, ${fail} eșuate`);
