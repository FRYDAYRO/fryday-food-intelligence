import type { AppState, Canal, Ingredient, Linie29, Produs, Reteta, SalesReportRand, VanzareFapt } from './types';
import { agregatePerioada, buildCtx } from './engine';
import { VERSIUNE_REGULI_29, regulileImpliciteLegacy } from './fc-clasificare';

// PRNG determinist — datele demo sunt identice la fiecare regenerare
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ing = (cod: string, denumire: string, categorie: string, tip: 'FOOD' | 'PACKAGING',
  um: 'kg' | 'l' | 'buc', pret: number, furnizor?: string, pretVechi?: number): Ingredient => ({
  cod, denumire, categorie, tip, um, furnizor, activ: true,
  preturi: pretVechi != null
    ? [{ validDeLa: '2026-01-01', pret: pretVechi }, { validDeLa: '2026-07-01', pret }]
    : [{ validDeLa: '2026-01-01', pret }],
});

/**
 * Stare curată, pentru lucrul cu datele reale. Păstrează doar parametrii de calcul
 * (TVA, ținte, reguli de clasificare, reguli de business) — restul se populează din importuri.
 * Fără asta, importurile s-ar adăuga peste datele demo și analizele le-ar amesteca.
 */
export function stareGoala(): AppState {
  const d = genereazaSeed();
  return {
    locatii: [], furnizori: [], ingrediente: [], produse: [], retete: [],
    vanzari: [], salesReport: [], linii29: [], materiale29: [],
    waste: [], inventar: [],
    reguli: d.reguli, reguliImplicite: d.reguliImplicite,
    // țintele FRYDAY: Food Cost 45% pe rețea (nu cele din demo, legate de locații fictive)
    tinte: [{ locatie: 'RETEA', fcCurat: 45 }],
    importuri: [], scenarii: [], pretFurnizori: [], rnd: [], nemapate: [],
    labor: [], costuriOperare: [], reguliBusiness: d.reguliBusiness,
    // 5% e pragul potrivit pentru monitorizarea periodică a prețurilor la reîncărcarea rețetarelor;
    // setul demo păstrează 25%, unde exemplul de alertă a fost validat numeric.
    setari: { ...d.setari, tvaImplicit: 11, pragAlertaPret: 5, tintaLaborPct: 17.5, comisionDeliveryPct: 16 },
  };
}

export function genereazaSeed(): AppState {
  const rnd = mulberry32(20260726);

  const locatii = [
    { cod: 'L01', nume: 'FRYDAY Centru' },
    { cod: 'L02', nume: 'FRYDAY Mall' },
  ];

  const furnizori = [
    { cod: 'F01', nume: 'AviProd Distribuție' },
    { cod: 'F02', nume: 'Panifcom' },
    { cod: 'F03', nume: 'LegumeFresh SRL' },
    { cod: 'F04', nume: 'PackExpert' },
    { cod: 'F05', nume: 'AviAlt Distribution' },
    { cod: 'F06', nume: 'PackWest' },
  ];

  const ingrediente: Ingredient[] = [
    ing('I001', 'Piept de pui', 'Carne', 'FOOD', 'kg', 14.00, 'F01', 13.20),
    ing('I002', 'Pulpe dezosate de pui', 'Carne', 'FOOD', 'kg', 9.50, 'F01'),
    ing('I003', 'Panadă crispy', 'Panificație', 'FOOD', 'kg', 6.00, 'F02'),
    ing('I004', 'Marinadă', 'Sosuri', 'FOOD', 'kg', 5.00, 'F01'),
    ing('I005', 'Chiflă burger', 'Panificație', 'FOOD', 'buc', 0.80, 'F02', 0.75),
    ing('I006', 'Lipie tortilla 30cm', 'Panificație', 'FOOD', 'buc', 0.90, 'F02'),
    ing('I007', 'Cartofi pentru prăjit', 'Legume', 'FOOD', 'kg', 4.20, 'F03'),
    ing('I008', 'Ulei de prăjit', 'Alte alimente', 'FOOD', 'l', 8.50, 'F03'),
    ing('I009', 'Sos de usturoi', 'Sosuri', 'FOOD', 'kg', 12.00, 'F01'),
    ing('I010', 'Sos picant', 'Sosuri', 'FOOD', 'kg', 11.00, 'F01'),
    ing('I011', 'Salată iceberg', 'Legume', 'FOOD', 'kg', 6.00, 'F03'),
    ing('I012', 'Roșii', 'Legume', 'FOOD', 'kg', 7.00, 'F03'),
    ing('I013', 'Cașcaval felii', 'Lactate', 'FOOD', 'kg', 32.00, 'F01'),
    ing('I014', 'Cola doză 330ml', 'Băuturi', 'FOOD', 'buc', 1.90, 'F03'),
    ing('A001', 'Hârtie ambalaj burger', 'Ambalaje', 'PACKAGING', 'buc', 0.25, 'F04'),
    ing('A002', 'Cutie delivery burger', 'Ambalaje', 'PACKAGING', 'buc', 0.90, 'F04'),
    ing('A003', 'Cutie aripioare', 'Ambalaje', 'PACKAGING', 'buc', 0.70, 'F04'),
    ing('A004', 'Pungă cartofi', 'Ambalaje', 'PACKAGING', 'buc', 0.20, 'F04'),
    ing('A005', 'Pungă delivery', 'Ambalaje', 'PACKAGING', 'buc', 0.35, 'F04'),
    ing('A006', 'Folie wrap', 'Ambalaje', 'PACKAGING', 'buc', 0.30, 'F04'),
    ing('A007', 'Cutiuță sos', 'Ambalaje', 'PACKAGING', 'buc', 0.15, 'F04'),
  ];

  const produse: Produs[] = [
    { cod: 'P001', denumire: 'Crispy Burger', categorie: 'Burgeri', tip: 'SIMPLU', pretInstore: 18.90, pretDelivery: 21.90, tva: 10, activ: true },
    { cod: 'P002', denumire: 'Spicy Cheese Burger', categorie: 'Burgeri', tip: 'SIMPLU', pretInstore: 21.90, pretDelivery: 24.90, tva: 10, activ: true },
    { cod: 'P003', denumire: 'Aripioare crispy 6 buc', categorie: 'Pui', tip: 'SIMPLU', pretInstore: 16.90, pretDelivery: 19.90, tva: 10, activ: true },
    { cod: 'P004', denumire: 'Cartofi prăjiți', categorie: 'Garnituri', tip: 'SIMPLU', pretInstore: 7.90, pretDelivery: 8.90, tva: 10, activ: true },
    { cod: 'P005', denumire: 'Cola 330ml', categorie: 'Băuturi', tip: 'SIMPLU', pretInstore: 6.50, pretDelivery: 6.90, tva: 10, activ: true },
    { cod: 'P006', denumire: 'Crispy Wrap', categorie: 'Wrapuri', tip: 'SIMPLU', pretInstore: 15.90, pretDelivery: 18.90, tva: 10, activ: true },
    { cod: 'P007', denumire: 'Sos extra', categorie: 'Extra', tip: 'SIMPLU', pretInstore: 2.50, pretDelivery: 2.90, tva: 10, activ: true },
    {
      cod: 'P008', denumire: 'Meniu Crispy Burger', categorie: 'Meniuri', tip: 'COMBO',
      pretInstore: 29.90, pretDelivery: 33.90, tva: 10, activ: true,
      combo: [{ cod: 'P001', cant: 1 }, { cod: 'P004', cant: 1 }, { cod: 'P005', cant: 1 }],
    },
  ];

  const retete: Reteta[] = [
    {
      cod: 'SP-021', tip: 'SEMIPREPARAT', denumire: 'Piept pane (lot)', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-05', randament: { cant: 11, um: 'kg' },
        linii: [
          { comp: 'I001', tipComp: 'INGREDIENT', cant: 10, um: 'kg', canal: 'AMBELE' },
          { comp: 'I003', tipComp: 'INGREDIENT', cant: 1.5, um: 'kg', canal: 'AMBELE' },
          { comp: 'I004', tipComp: 'INGREDIENT', cant: 0.8, um: 'kg', canal: 'AMBELE' },
        ],
      }],
    },
    {
      cod: 'SP-022', tip: 'SEMIPREPARAT', denumire: 'Aripioare marinate (lot)', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-05', randament: { cant: 10.2, um: 'kg' },
        linii: [
          { comp: 'I002', tipComp: 'INGREDIENT', cant: 10, um: 'kg', canal: 'AMBELE' },
          { comp: 'I004', tipComp: 'INGREDIENT', cant: 1, um: 'kg', canal: 'AMBELE' },
        ],
      }],
    },
    {
      cod: 'P001', tip: 'PRODUS', denumire: 'Crispy Burger', activa: 2,
      versiuni: [
        {
          nr: 1, data: '2026-01-10', nota: 'Rețeta inițială',
          linii: [
            { comp: 'I005', tipComp: 'INGREDIENT', cant: 1, um: 'buc', canal: 'AMBELE' },
            { comp: 'SP-021', tipComp: 'SEMIPREPARAT', cant: 110, um: 'g', canal: 'AMBELE' },
            { comp: 'I009', tipComp: 'INGREDIENT', cant: 25, um: 'g', canal: 'AMBELE' },
            { comp: 'I011', tipComp: 'INGREDIENT', cant: 20, um: 'g', pierdere: 15, canal: 'AMBELE' },
            { comp: 'A001', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'INSTORE' },
            { comp: 'A002', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'DELIVERY' },
          ],
        },
        {
          nr: 2, data: '2026-05-01', nota: 'Gramaj pane 110g → 120g (standard rețea)',
          linii: [
            { comp: 'I005', tipComp: 'INGREDIENT', cant: 1, um: 'buc', canal: 'AMBELE' },
            { comp: 'SP-021', tipComp: 'SEMIPREPARAT', cant: 120, um: 'g', canal: 'AMBELE' },
            { comp: 'I009', tipComp: 'INGREDIENT', cant: 25, um: 'g', canal: 'AMBELE' },
            { comp: 'I011', tipComp: 'INGREDIENT', cant: 20, um: 'g', pierdere: 15, canal: 'AMBELE' },
            { comp: 'A001', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'INSTORE' },
            { comp: 'A002', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'DELIVERY' },
          ],
        },
      ],
    },
    {
      cod: 'P002', tip: 'PRODUS', denumire: 'Spicy Cheese Burger', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-10',
        linii: [
          { comp: 'I005', tipComp: 'INGREDIENT', cant: 1, um: 'buc', canal: 'AMBELE' },
          { comp: 'SP-021', tipComp: 'SEMIPREPARAT', cant: 120, um: 'g', canal: 'AMBELE' },
          { comp: 'I010', tipComp: 'INGREDIENT', cant: 25, um: 'g', canal: 'AMBELE' },
          { comp: 'I013', tipComp: 'INGREDIENT', cant: 20, um: 'g', canal: 'AMBELE' },
          { comp: 'I011', tipComp: 'INGREDIENT', cant: 20, um: 'g', pierdere: 15, canal: 'AMBELE' },
          { comp: 'A001', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'INSTORE' },
          { comp: 'A002', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'DELIVERY' },
        ],
      }],
    },
    {
      cod: 'P003', tip: 'PRODUS', denumire: 'Aripioare crispy 6 buc', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-10',
        linii: [
          { comp: 'SP-022', tipComp: 'SEMIPREPARAT', cant: 300, um: 'g', canal: 'AMBELE' },
          { comp: 'I003', tipComp: 'INGREDIENT', cant: 40, um: 'g', canal: 'AMBELE' },
          { comp: 'I008', tipComp: 'INGREDIENT', cant: 20, um: 'ml', canal: 'AMBELE' },
          { comp: 'A003', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'AMBELE' },
          { comp: 'A005', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'DELIVERY' },
        ],
      }],
    },
    {
      cod: 'P004', tip: 'PRODUS', denumire: 'Cartofi prăjiți', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-10',
        linii: [
          { comp: 'I007', tipComp: 'INGREDIENT', cant: 180, um: 'g', canal: 'AMBELE' },
          { comp: 'I008', tipComp: 'INGREDIENT', cant: 15, um: 'ml', canal: 'AMBELE' },
          { comp: 'A004', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'AMBELE' },
        ],
      }],
    },
    {
      cod: 'P005', tip: 'PRODUS', denumire: 'Cola 330ml', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-10',
        linii: [{ comp: 'I014', tipComp: 'INGREDIENT', cant: 1, um: 'buc', canal: 'AMBELE' }],
      }],
    },
    {
      cod: 'P006', tip: 'PRODUS', denumire: 'Crispy Wrap', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-10',
        linii: [
          { comp: 'I006', tipComp: 'INGREDIENT', cant: 1, um: 'buc', canal: 'AMBELE' },
          { comp: 'SP-021', tipComp: 'SEMIPREPARAT', cant: 90, um: 'g', canal: 'AMBELE' },
          { comp: 'I009', tipComp: 'INGREDIENT', cant: 20, um: 'g', canal: 'AMBELE' },
          { comp: 'I011', tipComp: 'INGREDIENT', cant: 25, um: 'g', pierdere: 15, canal: 'AMBELE' },
          { comp: 'I012', tipComp: 'INGREDIENT', cant: 25, um: 'g', canal: 'AMBELE' },
          { comp: 'A006', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'AMBELE' },
          { comp: 'A005', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'DELIVERY' },
        ],
      }],
    },
    {
      cod: 'P007', tip: 'PRODUS', denumire: 'Sos extra', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-10',
        linii: [
          { comp: 'I009', tipComp: 'INGREDIENT', cant: 30, um: 'g', canal: 'AMBELE' },
          { comp: 'A007', tipComp: 'AMBALAJ', cant: 1, um: 'buc', canal: 'AMBELE' },
        ],
      }],
    },
  ];

  // ---- Vânzări demo: iunie + iulie 2026, 2 locații × 2 canale, mix ponderat
  const pondere: Record<string, number> = {
    P001: 24, P002: 14, P003: 16, P004: 22, P005: 20, P006: 10, P007: 8, P008: 12,
  };
  const bazaZi: Record<string, number> = { L01: 1.0, L02: 0.78 };
  const cotaDlv: Record<string, number> = { L01: 0.36, L02: 0.30 };

  const vanzari: VanzareFapt[] = [];
  const zile: string[] = [];
  for (let d = 1; d <= 30; d++) zile.push(`2026-06-${String(d).padStart(2, '0')}`);
  for (let d = 1; d <= 26; d++) zile.push(`2026-07-${String(d).padStart(2, '0')}`);

  const ctxSeed = buildCtx({ ingrediente, retete, produse });
  for (const data of zile) {
    const zi = new Date(data + 'T12:00:00').getDay();
    const weekend = zi === 0 || zi === 5 || zi === 6 ? 1.28 : 1.0;
    const iulie = data.startsWith('2026-07') ? 1.06 : 1.0;
    for (const loc of locatii) {
      for (const p of produse) {
        const bucTotal = Math.max(0, Math.round(pondere[p.cod] * bazaZi[loc.cod] * weekend * iulie * (0.75 + rnd() * 0.5)));
        if (!bucTotal) continue;
        const bucDlv = Math.round(bucTotal * cotaDlv[loc.cod] * (0.8 + rnd() * 0.4));
        const bucIn = bucTotal - bucDlv;
        for (const [canal, buc] of [['INSTORE', bucIn], ['DELIVERY', bucDlv]] as [Canal, number][]) {
          if (buc <= 0) continue;
          const brutU = canal === 'INSTORE' ? p.pretInstore! : p.pretDelivery!;
          const brut = brutU * buc;
          vanzari.push({ data, locatie: loc.cod, canal, produs: p.cod, cant: buc, brut, net: brut / (1 + p.tva / 100) });
        }
      }
    }
  }

  // ---- Sales Report = agregatul zilnic al PMIX (reconciliere perfectă în demo)
  const srMap = new Map<string, SalesReportRand>();
  for (const v of vanzari) {
    const k = `${v.data}|${v.locatie}|${v.canal}`;
    const r = srMap.get(k) ?? { data: v.data, locatie: v.locatie, canal: v.canal, net: 0, brut: 0, bonuri: 0 };
    r.net += v.net; r.brut = (r.brut ?? 0) + v.brut;
    srMap.set(k, r);
  }
  const salesReport = [...srMap.values()].map(r => ({ ...r, bonuri: Math.round(r.net / 21) }));

  // ---- Raport 2.9: derivat din costul teoretic + variance realist (+8…+11%) + linii EXCLUS
  const linii29: Linie29[] = [];
  const catSplit: [string, number][] = [
    ['Carne și pui', 0.42], ['Panificație', 0.14], ['Legume și sosuri', 0.16],
    ['Băuturi', 0.09], ['Ulei și alte alimente', 0.05], ['Ambalaje', 0.14],
  ];
  for (const per of ['2026-06', '2026-07']) {
    for (const loc of locatii) {
      const ag = agregatePerioada(vanzari, ctxSeed, { luna: per, locatie: loc.cod, vedere: 'TOTAL' });
      const factor = 1.08 + rnd() * 0.03; // consum real ≈ teoretic + 8–11% (variance)
      const curat = ag.cost * factor;
      for (const [cat, cota] of catSplit) {
        linii29.push({ perioada: per, locatie: loc.cod, categorie: cat, valoare: Math.round(curat * cota) });
      }
      linii29.push({ perioada: per, locatie: loc.cod, categorie: 'Uniforme personal', valoare: 700 });
      linii29.push({ perioada: per, locatie: loc.cod, categorie: 'Consumabile administrative', valoare: 400 });
      linii29.push({ perioada: per, locatie: loc.cod, categorie: 'Materiale curățenie', valoare: 550 });
    }
  }

  return {
    locatii, furnizori, ingrediente, produse, retete, vanzari, salesReport, linii29,
    materiale29: [],
    waste: [], inventar: [],
    // o singură sursă de vocabular pentru 2.9: lista canonică din `fc-clasificare`, derivată
    reguli: regulileImpliciteLegacy(), reguliImplicite: VERSIUNE_REGULI_29,
    tinte: [
      { locatie: 'RETEA', fcCurat: 21.0 },
      { locatie: 'L01', fcCurat: 20.5 },
      { locatie: 'L02', fcCurat: 21.5 },
    ],
    labor: [
      { locatie: 'L01', luna: '2026-06', cost: 12400 },
      { locatie: 'L02', luna: '2026-06', cost: 10900 },
      { locatie: 'L01', luna: '2026-07', cost: 12850 },
      { locatie: 'L02', luna: '2026-07', cost: 11300 },
    ],
    reguliBusiness: [
      { id: 'R1', tip: 'FC_MAX_CATEGORIE', nume: 'Food Cost maxim pe categorie', valoare: 25, activ: true },
      { id: 'R2', tip: 'MARJA_MIN', nume: 'Marjă minimă pe produs', valoare: 70, activ: true },
      { id: 'R3', tip: 'PROFIT_MIN_PRODUS', nume: 'Profit minim pe produs (lei/lună)', valoare: 800, activ: true },
      { id: 'R4', tip: 'VOLUM_MIN', nume: 'Volum minim pe produs (buc/lună)', valoare: 300, activ: true },
      { id: 'R5', tip: 'COST_MAX_INGREDIENT', nume: 'Cost maxim pe ingredient (lei/UM)', scop: 'I001', valoare: 13.5, activ: true },
    ],
    costuriOperare: [
      { locatie: 'L01', luna: '2026-06', chirie: 7200, utilitati: 3100, altele: 2400 },
      { locatie: 'L02', luna: '2026-06', chirie: 6400, utilitati: 2800, altele: 2100 },
      { locatie: 'L01', luna: '2026-07', chirie: 7200, utilitati: 3450, altele: 2500 },
      { locatie: 'L02', luna: '2026-07', chirie: 6400, utilitati: 3050, altele: 2200 },
    ],
    pretFurnizori: [
      { furnizor: 'F01', ingredient: 'I001', pret: 14.00, validDeLa: '2026-07-01' },
      { furnizor: 'F05', ingredient: 'I001', pret: 13.40, validDeLa: '2026-07-10' },
      { furnizor: 'F05', ingredient: 'I002', pret: 9.10, validDeLa: '2026-07-10' },
      { furnizor: 'F01', ingredient: 'I004', pret: 5.00, validDeLa: '2026-07-01' },
      { furnizor: 'F05', ingredient: 'I004', pret: 4.70, validDeLa: '2026-07-10' },
      { furnizor: 'F04', ingredient: 'A002', pret: 0.90, validDeLa: '2026-07-01' },
      { furnizor: 'F06', ingredient: 'A002', pret: 0.82, validDeLa: '2026-07-12' },
      { furnizor: 'F06', ingredient: 'A001', pret: 0.23, validDeLa: '2026-07-12' },
    ],
    rnd: [], nemapate: [],
    importuri: [{
      id: 'seed', tip: 'DATE DEMO', fisier: 'seed intern', data: new Date().toISOString(),
      randuri: vanzari.length, importate: vanzari.length, avertismente: [], erori: [], status: 'IMPORTAT',
    }],
    scenarii: [],
    // TVA implicit 11% (cota FRYDAY confirmată) — se aplică produselor create de acum înainte:
    // importuri, R&D Lab, produse noi din simulări. Produsele demo își păstrează cota lor de 10%,
    // pentru că exemplul numeric de referință (Crispy Burger, FC 18,4%) a fost validat la acea cotă.
    setari: { tvaImplicit: 11, tintaLaborPct: 24, comisionDeliveryPct: 16, tolerantaReconciliere: 0.5, pragAlertaPret: 25 },
  };
}
