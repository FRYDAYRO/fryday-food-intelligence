import { genereazaSeed } from '../src/lib/seed';
import { buildCtx, costProdus, aplicaScenariu, aplicaInDate, impactRetea, volumeLuna, versiuneActiva, kpiProdus } from '../src/lib/engine';
import type { Schimbare } from '../src/lib/types';

const s0 = genereazaSeed();
const ctx0 = buildCtx(s0);
const D = '2026-07-15';
let ok = 0, fail = 0;
const t = (n: string, c: boolean, d = '') => { if (c) { ok++; console.log('  ✔', n, d); } else { fail++; console.log('  ✘', n, d); } };
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

console.log('— Eliminare + adăugare + gramaj în același scenariu (indecși stabili) —');
// P001: 0=chiflă 1=SP 120g 2=sos 3=salată 4=hârtie 5=cutie
const sch: Schimbare[] = [
  { tip: 'GRAMAJ', reteta: 'P001', linie: 1, cantNoua: 110 },
  { tip: 'ELIMINA_LINIE', reteta: 'P001', linie: 3 },            // scoatem salata
  { tip: 'ADAUGA_LINIE', reteta: 'P001', linieNoua: { comp: 'I013', tipComp: 'INGREDIENT', cant: 15, um: 'g', canal: 'AMBELE' } },
];
const { ctx: ctx1 } = aplicaScenariu(s0, sch);
const v1 = versiuneActiva(ctx1.retete.get('P001')!);
t('nr linii 6−1+1=6', v1.linii.length === 6, String(v1.linii.length));
t('SP redus la 110 g', v1.linii.some(l => l.comp === 'SP-021' && l.cant === 110));
t('salata eliminată', !v1.linii.some(l => l.comp === 'I011'));
t('cașcaval adăugat', v1.linii.some(l => l.comp === 'I013' && l.cant === 15));
const c0 = costProdus('P001', 'INSTORE', ctx0, D)!;
const c1 = costProdus('P001', 'INSTORE', ctx1, D)!;
// Δ = −10g pane (−0.1391) − salată (−0.1412) + 15g cașcaval (+0.48) = +0.1997 → 3.36
t('cost recalculat corect (≈3,36)', aprox(c1.total, 3.36, 0.01), c1.total.toFixed(3));
t('starea reală neatinsă (copie)', costProdus('P001', 'INSTORE', ctx0, D)!.total === c0.total && versiuneActiva(buildCtx(s0).retete.get('P001')!).linii.length === 6);

console.log('— Cascadă: prețul pieptului lovește toate produsele cu SP-021 —');
const { ctx: ctxP } = aplicaScenariu(s0, [{ tip: 'PRET_INGREDIENT', ingredient: 'I001', pretNou: 16 }]);
const afectate: string[] = [];
for (const [cod] of ctxP.produse) {
  const a = costProdus(cod, 'INSTORE', ctx0, D)?.total ?? 0;
  const b = costProdus(cod, 'INSTORE', ctxP, D)?.total ?? 0;
  if (Math.abs(a - b) > 0.0005) afectate.push(cod);
}
t('P001, P002, P006 (direct prin SP-021) afectate', ['P001', 'P002', 'P006'].every(c => afectate.includes(c)), afectate.join(','));
t('P008 (combo cu P001) afectat', afectate.includes('P008'));
t('P004/P005 neafectate', !afectate.includes('P004') && !afectate.includes('P005'));

console.log('— Impact rețea + volume —');
const vol = volumeLuna(s0, '2026-07');
const totalBuc = [...vol.values()].reduce((x, v) => x + v.bucIn + v.bucDlv, 0);
t('volume = totalul PMIX al lunii', totalBuc === s0.vanzari.filter(v => v.data.startsWith('2026-07')).reduce((x, v) => x + v.cant, 0));
const imp = impactRetea(s0, ctx0, ctxP, [], new Map(), '2026-07');
t('scumpirea crește FC și taie profit', imp.dupa.fc! > imp.inainte.fc! && imp.dupa.profit < imp.inainte.profit,
  `ΔFC=${(imp.dupa.fc! - imp.inainte.fc!).toFixed(2)}pp ΔP=${(imp.dupa.profit - imp.inainte.profit).toFixed(0)} lei`);

console.log('— Aplicarea în datele reale (confirmare) —');
const scen = { nume: 'Optimizare burger', schimbari: sch };
const sReal = aplicaInDate(s0, scen);
const rReal = sReal.retete.find(r => r.cod === 'P001')!;
t('rețeta are versiune nouă v3 activă', rReal.activa === 3 && rReal.versiuni.length === 3);
t('nota versiunii citează simularea', rReal.versiuni[2].nota!.includes('Optimizare burger'));
t('istoricul v1+v2 păstrat (reversibil)', rReal.versiuni[0].nr === 1 && rReal.versiuni[1].nr === 2);
// versiunea publicată azi se aplică de azi înainte; vânzările trecute păstrează rețeta de atunci
const cReal = costProdus('P001', 'INSTORE', buildCtx(sReal), '9999-12-31')!;
t('costul de azi după aplicare = simularea', aprox(cReal.total, c1.total, 1e-9));
const cIstoric = costProdus('P001', 'INSTORE', buildCtx(sReal), D)!;
t('costul istoric NU se rescrie retroactiv', aprox(cIstoric.total, costProdus('P001', 'INSTORE', ctx0, D)!.total, 1e-9),
  `${cIstoric.total.toFixed(3)} = ${costProdus('P001', 'INSTORE', ctx0, D)!.total.toFixed(3)}`);

const sPret = aplicaInDate(s0, { nume: 'Piept 16', schimbari: [{ tip: 'PRET_INGREDIENT', ingredient: 'I001', pretNou: 16 }] });
const iP = sPret.ingrediente.find(i => i.cod === 'I001')!;
t('preț ingredient: intrare nouă datată azi, istoric intact', iP.preturi.length === 3 && iP.preturi[2].pret === 16, String(iP.preturi.length));
t('costul istoric (iunie) nu se schimbă', aprox(costProdus('P001', 'INSTORE', buildCtx(sPret), '2026-06-15')!.total, costProdus('P001', 'INSTORE', ctx0, '2026-06-15')!.total, 1e-9));

const sPV = aplicaInDate(s0, { nume: 'Preț nou', schimbari: [{ tip: 'PRET_VANZARE', produs: 'P001', canal: 'DELIVERY', pretNou: 22.9 }] });
t('preț vânzare Delivery actualizat', sPV.produse.find(p => p.cod === 'P001')!.pretDelivery === 22.9);

const sPN = aplicaInDate(s0, { nume: 'Lansare', schimbari: [{ tip: 'PRODUS_NOU', cod: 'PN01', denumire: 'Double Crispy', pretInstore: 25.9, pretDelivery: 28.9, tva: 10, bucInstore: 500, bucDelivery: 250, linii: [{ comp: 'I005', tipComp: 'INGREDIENT', cant: 1, um: 'buc', canal: 'AMBELE' }, { comp: 'SP-021', tipComp: 'SEMIPREPARAT', cant: 240, um: 'g', canal: 'AMBELE' }] }] });
t('produs nou creat cu rețetă v1', sPN.produse.some(p => p.cod === 'PN01') && sPN.retete.some(r => r.cod === 'PN01' && r.activa === 1));
const kPN = kpiProdus('PN01', 'INSTORE', buildCtx(sPN), D)!;
t('KPI produs nou calculabil', kPN.fc != null && kPN.fc! > 0, `FC=${kPN.fc?.toFixed(1)}%`);

console.log(`\nRezultat: ${ok} teste trecute, ${fail} eșuate`);
if (fail) process.exit(1);
