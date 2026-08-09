import { genereazaSeedNBO } from '../src/lib/seed-nbo';
import { importa, detecteazaTip, type Parsat } from '../src/lib/importer';
import { buildCtx, kpiProdus } from '../src/lib/engine';
import { analizeazaFisier } from '../src/lib/auto';
import * as XLSX from 'xlsx';

let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

// pornim de la nomenclatorul creat din NBO, cu prețuri egale pe canale
const s0 = genereazaSeedNBO();
t('inițial: același preț POS pe ambele canale', s0.produse[0].pretInstore === 15.99 && s0.produse[0].pretDelivery === 17.99);

console.log('— Fișier separat pentru InStore (o singură coloană de preț) —');
const pIn: Parsat = {
  foaie: 'Prețuri', antete: ['Cod produs', 'Denumire', 'Pret'],
  randuri: [
    { 'Cod produs': '820023', 'Denumire': 'SAMURAI CHICKEN', 'Pret': 16.99 },
    { 'Cod produs': '820024', 'Denumire': 'CHICKEN LEMON', 'Pret': 16.99 },
    { 'Cod produs': '26031', 'Denumire': 'Chicken Pesto Burger', 'Pret': 24.99 },   // prin numărul POS
  ],
};
t('tipul se detectează din numele fișierului', detecteazaTip(pIn.antete, 'Preturi instore 2026-08.xlsx') === 'PRETURI_PRODUSE',
  detecteazaTip(pIn.antete, 'Preturi instore 2026-08.xlsx'));
const rIn = importa('PRETURI_PRODUSE', pIn, 'Preturi instore 2026-08.xlsx', s0);
t('canalul dedus din numele fișierului', rIn.batch.status === 'IMPORTAT' && rIn.batch.importate === 3, `${rIn.batch.importate} prețuri`);
const sam = rIn.stateNou.produse.find(p => p.cod === '820023')!;
t('InStore actualizat, Delivery neatins', sam.pretInstore === 16.99 && sam.pretDelivery === 17.99, `${sam.pretInstore} / ${sam.pretDelivery}`);
t('maparea prin numărul POS funcționează', rIn.stateNou.produse.find(p => p.cod === '700970')!.pretInstore === 24.99);
t('produsul inactiv devine activ când primește preț', rIn.stateNou.produse.find(p => p.cod === '700970')!.activ === true);
t('modificarea intră în jurnalul de prețuri', (sam.istoricPret ?? []).some(x => x.canal === 'INSTORE' && x.pret === 16.99));
t('raportează pe ce canal s-a lucrat', rIn.batch.avertismente.some(a => a.includes('InStore')));

console.log('— Fișier separat pentru Delivery —');
const pDlv: Parsat = {
  foaie: 'Prețuri', antete: ['Cod', 'Pret'],
  randuri: [{ 'Cod': '820023', 'Pret': 19.99 }, { 'Cod': '820024', 'Pret': 19.99 }],
};
const rDlv = importa('PRETURI_PRODUSE', pDlv, 'preturi delivery august.xlsx', rIn.stateNou);
const sam2 = rDlv.stateNou.produse.find(p => p.cod === '820023')!;
t('Delivery actualizat, InStore păstrat', sam2.pretDelivery === 19.99 && sam2.pretInstore === 16.99, `${sam2.pretInstore} / ${sam2.pretDelivery}`);
t('jurnalul are ambele canale', (sam2.istoricPret ?? []).length === 2);

console.log('— Fără indiciu de canal: se cere explicit —');
const rAmbiguu = importa('PRETURI_PRODUSE', pDlv, 'lista.xlsx', s0);
t('nu aplică nimic și explică de ce', rAmbiguu.batch.importate === 0 && rAmbiguu.batch.avertismente.some(a => a.includes('nu se știe canalul')));
const rExplicit = importa('PRETURI_PRODUSE', pDlv, 'lista.xlsx', s0, undefined, { canalImplicit: 'DELIVERY' });
t('cu canalul ales manual, prețurile intră', rExplicit.batch.importate === 2 && rExplicit.stateNou.produse.find(p => p.cod === '820023')!.pretDelivery === 19.99);

console.log('— Un singur fișier cu ambele canale pe coloane —');
const pAmbele: Parsat = {
  foaie: 'Prețuri', antete: ['Cod produs', 'Pret InStore', 'Pret Delivery'],
  randuri: [{ 'Cod produs': '820023', 'Pret InStore': 17.49, 'Pret Delivery': 20.49 }],
};
const rAmbele = importa('PRETURI_PRODUSE', pAmbele, 'lista preturi.xlsx', s0);
const sam3 = rAmbele.stateNou.produse.find(p => p.cod === '820023')!;
t('ambele canale actualizate dintr-un fișier', sam3.pretInstore === 17.49 && sam3.pretDelivery === 20.49);
t('două intrări în jurnal', (sam3.istoricPret ?? []).length === 2);

console.log('— Efectul în motorul de cost —');
const ctx = buildCtx(rAmbele.stateNou);
const kIn = kpiProdus('820023', 'INSTORE', ctx)!, kDlv = kpiProdus('820023', 'DELIVERY', ctx)!;
t('preț net InStore = brut / 1,11', aprox(kIn.net!, 17.49 / 1.11), kIn.net!.toFixed(3));
t('FC diferit pe canale', kIn.fc !== kDlv.fc && kIn.fc! > kDlv.fc!, `${kIn.fc!.toFixed(2)}% vs ${kDlv.fc!.toFixed(2)}%`);

console.log('— Controale —');
const pNec: Parsat = { foaie: 'P', antete: ['Cod', 'Pret'], randuri: [{ 'Cod': 'XXXX', 'Pret': 10 }] };
const rNec = importa('PRETURI_PRODUSE', pNec, 'preturi instore.xlsx', s0);
t('codul necunoscut e semnalat, nu creează produs', rNec.batch.importate === 0 && rNec.batch.avertismente.some(a => a.includes('XXXX')));
const rIdem = importa('PRETURI_PRODUSE', pIn, 'Preturi instore.xlsx', rIn.stateNou);
t('reimportul aceluiași preț nu adaugă intrări', rIdem.batch.importate === 0, `${rIdem.batch.importate}`);
const pVar: Parsat = { foaie: 'P', antete: ['Cod', 'Pret'], randuri: [{ 'Cod': '820023', 'Pret': 25.99 }] };
const rVar = importa('PRETURI_PRODUSE', pVar, 'preturi instore.xlsx', s0);
t('variația mare e semnalată', rVar.batch.avertismente.some(a => a.includes('%')), rVar.batch.avertismente.find(a => a.includes('%')) ?? '');
// produs activ cu preț doar pe InStore → trebuie semnalat
const doarIn = { ...s0, produse: s0.produse.map(p => p.cod === '820025' ? { ...p, pretDelivery: 0 } : p) };
const rGaura = importa('PRETURI_PRODUSE', pVar, 'preturi instore.xlsx', doarIn);
t('semnalează produsele active fără preț pe ambele canale',
  rGaura.batch.avertismente.some(a => a.includes('ambele canale') && a.includes('CHICKEN PESTO')),
  rGaura.batch.avertismente.find(a => a.includes('ambele canale')) ?? 'lipsă');

// ——— detecția automată pe cele trei fișiere reale ale utilizatorului
function fals(nume: string, m: unknown[][]): File {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(m), 'S');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return { name: nume, arrayBuffer: async () => buf } as unknown as File;
}
async function auto() {
  console.log('— Detecție automată pe fișiere separate pe canal —');
  const listaIn: unknown[][] = [
    ['Cod produs', 'Denumire', 'Pret'],
    ['820023', 'SAMURAI CHICKEN', 16.99],
    ['820024', 'CHICKEN LEMON', 16.99],
  ];
  const listaDlv: unknown[][] = [
    ['Cod produs', 'Denumire', 'Pret'],
    ['820023', 'SAMURAI CHICKEN', 20.99],
    ['820024', 'CHICKEN LEMON', 20.99],
  ];
  const a1 = await analizeazaFisier(fals('Preturi INSTORE august.xlsx', listaIn));
  t('fișierul InStore → Prețuri de vânzare', a1[0].tip === 'PRETURI_PRODUSE', String(a1[0].tip));
  const a2 = await analizeazaFisier(fals('Preturi DELIVERY august.xlsx', listaDlv));
  t('fișierul Delivery → Prețuri de vânzare', a2[0].tip === 'PRETURI_PRODUSE', String(a2[0].tip));
  // import automat, cu canalul din numele fișierului
  let stare = s0;
  for (const [nume, an] of [['Preturi INSTORE august.xlsx', a1], ['Preturi DELIVERY august.xlsx', a2]] as const) {
    const r = importa(an[0].tip!, an[0].parsat, nume, stare, an[0].mapare);
    stare = r.stateNou;
  }
  const s = stare.produse.find(p => p.cod === '820023')!;
  t('InStore din primul fișier, Delivery din al doilea', s.pretInstore === 16.99 && s.pretDelivery === 20.99,
    `InStore ${s.pretInstore} · Delivery ${s.pretDelivery}`);
  t('jurnalul are câte o intrare pe canal', (s.istoricPret ?? []).filter(x => x.canal === 'INSTORE').length === 1
    && (s.istoricPret ?? []).filter(x => x.canal === 'DELIVERY').length === 1);
  // Food Cost-ul diferă acum corect pe canale
  const k = buildCtx(stare);
  const fcIn = kpiProdus('820023', 'INSTORE', k)!.fc!, fcDlv = kpiProdus('820023', 'DELIVERY', k)!.fc!;
  t('FC mai mic pe Delivery, unde prețul e mai mare', fcDlv < fcIn, `${fcIn.toFixed(2)}% vs ${fcDlv.toFixed(2)}%`);

  console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
  if (fail) process.exit(1);
}
auto();
