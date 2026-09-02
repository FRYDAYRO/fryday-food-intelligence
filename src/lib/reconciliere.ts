// Reconciliere post-import — răspunde la întrebarea „pot avea încredere în raportul ăsta?".
import type { AppState } from './types';
import { verdictCombinare, type VerdictSurse } from './perioade-surse';
import { clasifica, luna as lunaDin, perProdus, fmtInt, fmtPct, type Ctx } from './engine';

export interface ProblemaDate {
  nivel: 'BLOCANT' | 'ATENTIE' | 'INFO';
  titlu: string; detaliu: string; actiune: string;
}

export interface RandNemapat { cod: string; buc: number; net: number; motiv: 'FARA_NOMENCLATOR' | 'FARA_RETETA'; }

export interface Reconciliere {
  luna: string;
  // acoperire
  netTotal: number; netCuReteta: number; acoperire: number | null;
  nemapate: RandNemapat[];
  // reconciliere PMIX ↔ Sales Report
  netPmix: number; netSales: number | null; diferenta: number | null; diferentaPct: number | null; inToleranta: boolean | null;
  /**
   * Compatibilitatea ferestrelor surselor. Când blochează, DOAR diferența PMIX ↔ Sales
   * devine indisponibilă: netul fiecărei surse rămâne la vedere, pentru că fiecare e o
   * cifră validă despre raportul ei.
   */
  verdictPerioade: VerdictSurse;
  // raportul 2.9
  are29: boolean; total29: number; categoriiNeclasificate: string[]; excluderi: number;
  // loturi
  loturi: { id: string; tip: string; fisier: string; data: string; importate: number; erori: number; avertismente: number; status: string }[];
  probleme: ProblemaDate[];
  scorIncredere: number;             // 0–100
  verdict: 'FIABIL' | 'CU_REZERVE' | 'INSUFICIENT';
}

/** Datele demo încă prezente amestecă rezultatele cu datele reale importate. */
export function areDateDemo(state: AppState): { demo: boolean; produse: number; vanzari: number } {
  const coduriDemo = new Set(['P001', 'P002', 'P003', 'P004', 'P005', 'P006', 'P007', 'P008']);
  const produse = state.produse.filter(p => coduriDemo.has(p.cod)).length;
  const vanzari = state.vanzari.filter(v => coduriDemo.has(v.produs)).length;
  return { demo: produse > 0 || vanzari > 0 || state.importuri.some(b => b.tip === 'DATE DEMO'), produse, vanzari };
}

export function reconciliaza(state: AppState, ctx: Ctx, lunaSel: string, locatie?: string): Reconciliere {
  const rows = perProdus(state.vanzari, ctx, { luna: lunaSel, locatie, vedere: 'TOTAL' });
  const netTotal = rows.reduce((s, r) => s + r.net, 0);
  const netCuReteta = rows.filter(r => !r.faraReteta).reduce((s, r) => s + r.net, 0);
  const acoperire = netTotal > 0 ? (netCuReteta / netTotal) * 100 : null;

  const nemapate: RandNemapat[] = rows
    .filter(r => r.faraReteta)
    .map(r => ({
      cod: r.cod, buc: r.buc, net: r.net,
      motiv: state.produse.some(p => p.cod === r.cod) ? 'FARA_RETETA' as const : 'FARA_NOMENCLATOR' as const,
    }))
    .sort((a, b) => b.net - a.net);

  const netPmix = netTotal;
  const liniiSales = state.salesReport.filter(s => lunaDin(s.data) === lunaSel && (!locatie || s.locatie === locatie));
  const netSales = liniiSales.length ? liniiSales.reduce((s, x) => s + x.net, 0) : null;
  // Diferența dintre două ferestre diferite nu e o diferență de raportare, ci o comparație
  // fără sens. Netul fiecărei surse rămâne vizibil; doar scăderea lor se reține.
  const verdictPerioade = verdictCombinare(state, ['NBO_41', 'PMIX_47']);
  const combinabil = !verdictPerioade.blocheaza;
  const diferenta = netSales != null && combinabil ? netPmix - netSales : null;
  const diferentaPct = netSales != null && combinabil && netSales > 0 ? (diferenta! / netSales) * 100 : null;
  const toleranta = state.setari.tolerantaReconciliere ?? 1;
  const inToleranta = diferentaPct != null ? Math.abs(diferentaPct) <= toleranta : null;

  const linii29 = state.linii29.filter(l => l.perioada === lunaSel && (!locatie || l.locatie === locatie));
  const total29 = linii29.reduce((s, l) => s + l.valoare, 0);
  const excluderi = linii29.filter(l => clasifica(l.categorie, state.reguli).clasa === 'EXCLUS').reduce((s, l) => s + l.valoare, 0);
  const categoriiNeclasificate = [...new Set(linii29
    .filter(l => !state.reguli.some(r => l.categorie.toLowerCase().includes(r.pattern.toLowerCase())))
    .map(l => l.categorie))];

  const loturi = [...state.importuri]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 8)
    .map(b => ({
      id: b.id, tip: b.tip, fisier: b.fisier, data: b.data,
      importate: b.importate, erori: b.erori.length, avertismente: b.avertismente.length, status: b.status,
    }));

  // ——— problemele, în ordinea gravității
  const probleme: ProblemaDate[] = [];
  if (netTotal === 0) probleme.push({
    nivel: 'BLOCANT', titlu: 'Nicio vânzare în perioada selectată',
    detaliu: 'PMIX-ul nu conține rânduri pentru luna și locația alese.',
    actiune: 'Verifică luna selectată sau importă PMIX-ul lunii respective.',
  });
  if (acoperire != null && acoperire < 90) probleme.push({
    nivel: acoperire < 75 ? 'BLOCANT' : 'ATENTIE',
    titlu: `Acoperirea rețetarului este ${fmtPct(acoperire)}`,
    detaliu: `${fmtInt(netTotal - netCuReteta)} lei din vânzări provin de la ${nemapate.length} produse fără rețetă calculabilă. `
      + 'Food Cost-ul teoretic și toate analizele de profit sunt subestimate cu această pondere.',
    actiune: 'Completează rețetele lipsă în Rețetar sau mapează codurile în nomenclator, apoi reimportă.',
  });
  const faraNomenclator = nemapate.filter(n => n.motiv === 'FARA_NOMENCLATOR');
  if (faraNomenclator.length) probleme.push({
    nivel: 'ATENTIE', titlu: `${faraNomenclator.length} coduri din PMIX nu există în nomenclator`,
    detaliu: `Coduri: ${faraNomenclator.slice(0, 8).map(n => n.cod).join(', ')}${faraNomenclator.length > 8 ? '…' : ''}. `
      + 'Vânzările lor intră în numitor, dar nu au cost — cea mai frecventă cauză de Food Cost prea mic.',
    actiune: 'Adaugă produsele în Master Data cu același cod ca în PMIX.',
  });
  if (netSales == null) probleme.push({
    nivel: 'ATENTIE', titlu: 'Lipsește Sales Report NBO pentru această lună',
    detaliu: 'Fără el, numitorul Food Cost este PMIX-ul, care poate diferi de vânzările fiscale.',
    actiune: 'Importă Sales Report NBO pentru luna selectată.',
  });
  else if (inToleranta === false) probleme.push({
    nivel: 'BLOCANT', titlu: `PMIX și Sales Report diferă cu ${fmtPct(Math.abs(diferentaPct!))}`,
    detaliu: `PMIX ${fmtInt(netPmix)} lei vs Sales Report ${fmtInt(netSales)} lei (${diferenta! >= 0 ? '+' : ''}${fmtInt(diferenta!)} lei), `
      + `peste toleranța de ${fmtPct(toleranta)}. Cele două surse nu descriu aceeași realitate.`,
    actiune: 'Verifică perioada exportului, locațiile incluse și dacă PMIX-ul conține și produse fără vânzare fiscală.',
  });
  if (!linii29.length) probleme.push({
    nivel: 'ATENTIE', titlu: 'Lipsește raportul 2.9 pentru această lună',
    detaliu: 'Fără el nu există Food Cost operațional, Food Cost Curat, Paper Cost real și nici variance.',
    actiune: 'Importă raportul NBO 2.9 pentru luna selectată.',
  });
  if (categoriiNeclasificate.length) probleme.push({
    nivel: 'ATENTIE', titlu: `${categoriiNeclasificate.length} categorii din 2.9 nu se potrivesc cu nicio regulă`,
    detaliu: `Categorii: ${categoriiNeclasificate.slice(0, 6).join(', ')}${categoriiNeclasificate.length > 6 ? '…' : ''}. `
      + 'Ele primesc clasificarea implicită, ceea ce poate muta cheltuieli între Food, Paper și excluderi.',
    actiune: 'Adaugă reguli de clasificare în Setări pentru aceste categorii.',
  });
  const cuErori = loturi.filter(l => l.erori > 0);
  if (cuErori.length) probleme.push({
    nivel: 'INFO', titlu: `${cuErori.length} loturi de import cu erori`,
    detaliu: `Ultimul: ${cuErori[0].fisier} (${cuErori[0].erori} erori).`,
    actiune: 'Deschide jurnalul importurilor pentru detalii pe rând.',
  });

  // ——— scorul de încredere
  let scor = 100;
  if (acoperire != null) scor -= Math.max(0, 100 - acoperire) * 1.5;      // fiecare punct lipsă costă 1,5
  if (netSales == null) scor -= 12; else if (inToleranta === false) scor -= 25;
  if (!linii29.length) scor -= 15;
  if (categoriiNeclasificate.length) scor -= Math.min(10, categoriiNeclasificate.length * 3);
  if (faraNomenclator.length) scor -= Math.min(15, faraNomenclator.length * 3);
  scor = Math.max(0, Math.min(100, scor));

  return {
    luna: lunaSel,
    netTotal, netCuReteta, acoperire, nemapate,
    netPmix, netSales, diferenta, diferentaPct, inToleranta, verdictPerioade,
    are29: linii29.length > 0, total29, categoriiNeclasificate, excluderi,
    loturi, probleme,
    scorIncredere: scor,
    verdict: scor >= 85 ? 'FIABIL' : scor >= 60 ? 'CU_REZERVE' : 'INSUFICIENT',
  };
}
