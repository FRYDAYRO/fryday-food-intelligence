// Setul de date real FRYDAY, extras din recipe cards NBO (Back Office Switchboard).
// Sursă: capturi NBO din 07.01.2026 — SAMURAI CHICKEN (820023), CHICKEN LEMON (820024),
// Chicken Pesto Burger (700970 / POS 26031) și rețetarul CHICKEN GANG Chișinău.
// Prețurile ingredientelor sunt convertite din costul unitar NBO în UM de bază (kg / l / buc).
import type { AppState, Ingredient, Produs, Reteta, SalesReportRand, VanzareFapt } from './types';

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ing = (cod: string, denumire: string, categorie: string, tip: 'FOOD' | 'PACKAGING',
  um: 'kg' | 'l' | 'buc', pret: number, furnizor?: string): Ingredient => ({
  cod, denumire, categorie, tip, um, furnizor, activ: true,
  preturi: [{ validDeLa: '2026-01-07', pret }],
});

// Cota de TVA FRYDAY, confirmată
export const TVA_FRYDAY = 11;

export function genereazaSeedNBO(): AppState {
  const rnd = mulberry32(20260107);

  const ingrediente: Ingredient[] = [
    // ——— costul unitar NBO × 1000 pentru GM/ML (preț per kg / per litru)
    ing('7000133', 'CHIFLA CARTOF 3.5inch 53G x 72', 'Panificație', 'FOOD', 'buc', 2.400, 'F01'),
    ing('702045', 'Patties pui 50gr Transavia', 'Carne', 'FOOD', 'buc', 1.171, 'F02'),
    ing('4078', 'Ulei de alune', 'Uleiuri', 'FOOD', 'l', 16.90, 'F03'),
    ing('4067', 'Sos Samurai BIB', 'Sosuri', 'FOOD', 'l', 30.20, 'F03'),
    ing('702122', 'Lemon Pepper Mayo', 'Sosuri', 'FOOD', 'kg', 40.60, 'F03'),
    ing('700963', 'Green Pesto Mayo', 'Sosuri', 'FOOD', 'l', 47.00, 'F03'),
    ing('702399', 'Y-Castraveti felii in saramura', 'Legume', 'FOOD', 'kg', 15.536, 'F04'),
    ing('702398', 'Castraveti felii in saramura', 'Legume', 'FOOD', 'kg', 7.50, 'F04'),
    ing('7000143', 'SALATA LOLLO BIONDA S 500g', 'Legume', 'FOOD', 'kg', 36.00, 'F04'),
    ing('700966', 'Salata Roumaine', 'Legume', 'FOOD', 'kg', 32.00, 'F04'),
    ing('700996', 'Schnitzel Cornflakes Gierlinger 100gr', 'Carne', 'FOOD', 'buc', 3.698, 'F02'),
    ing('7000123', 'Branza cheddar felii 2026', 'Lactate', 'FOOD', 'buc', 0.616, 'F05'),
    ing('702321', '5 Inch Potato Roll', 'Panificație', 'FOOD', 'buc', 5.308, 'F01'),
    ing('700655', 'Hartie Little Hamburgers', 'Ambalaje', 'PACKAGING', 'buc', 0.111, 'F06'),
    ing('702496', 'Cutie mare burger Chicken Pesto', 'Ambalaje', 'PACKAGING', 'buc', 0.974, 'F06'),
  ];

  const produse: Produs[] = [
    { cod: '820023', denumire: 'SAMURAI CHICKEN', categorie: 'BURGER', tip: 'SIMPLU', pretInstore: 15.99, pretDelivery: 17.99, tva: TVA_FRYDAY, activ: true },
    { cod: '820024', denumire: 'CHICKEN LEMON', categorie: 'BURGER', tip: 'SIMPLU', pretInstore: 15.99, pretDelivery: 17.99, tva: TVA_FRYDAY, activ: true },
    { cod: '820025', denumire: 'CHICKEN PESTO', categorie: 'BURGER', tip: 'SIMPLU', pretInstore: 15.99, pretDelivery: 17.99, tva: TVA_FRYDAY, activ: true },
    // preț 0 în NBO → produsul intră în nomenclator, dar inactiv până i se stabilește prețul.
    // Numărul POS (26031) diferă de Product ID (700970): PMIX-ul și listele de prețuri se mapează pe oricare.
    { cod: '700970', codPos: '26031', denumire: 'Chicken Pesto Burger', categorie: 'BURGER', tip: 'SIMPLU', pretInstore: 0, pretDelivery: 0, tva: TVA_FRYDAY, activ: false },
  ];

  const L = (comp: string, cant: number, um: 'g' | 'ml' | 'buc', amb = false): Reteta['versiuni'][0]['linii'][0] => ({
    comp, tipComp: amb ? 'AMBALAJ' : 'INGREDIENT', cant, um, canal: 'AMBELE',
  });

  const retete: Reteta[] = [
    {
      cod: '820023', tip: 'PRODUS', denumire: 'SAMURAI CHICKEN', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-07', nota: 'Recipe card NBO 07.01.2026',
        linii: [
          L('7000133', 1, 'buc'), L('702045', 1, 'buc'), L('4078', 20, 'ml'),
          L('4067', 15, 'ml'), L('702399', 5.6, 'g'), L('7000143', 10, 'g'),
          L('700655', 1, 'buc', true),
        ],
      }],
    },
    {
      cod: '820024', tip: 'PRODUS', denumire: 'CHICKEN LEMON', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-07', nota: 'Recipe card NBO 07.01.2026',
        linii: [
          L('7000133', 1, 'buc'), L('702045', 1, 'buc'), L('4078', 20, 'ml'),
          L('702122', 15, 'g'), L('702399', 5.6, 'g'), L('7000143', 10, 'g'),
          L('700655', 1, 'buc', true),
        ],
      }],
    },
    {
      cod: '820025', tip: 'PRODUS', denumire: 'CHICKEN PESTO', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-07', nota: 'Rețetar CHICKEN GANG Chișinău, structură PUI BURGER new (820005)',
        linii: [
          L('7000133', 1, 'buc'), L('702045', 1, 'buc'), L('4078', 20, 'ml'),
          L('700963', 15, 'ml'), L('702399', 5.6, 'g'), L('7000143', 10, 'g'),
          L('700655', 1, 'buc', true),
        ],
      }],
    },
    {
      cod: '700970', tip: 'PRODUS', denumire: 'Chicken Pesto Burger', activa: 1,
      versiuni: [{
        nr: 1, data: '2026-01-07', nota: 'Recipe card NBO — POS 26031',
        linii: [
          L('700996', 1, 'buc'), L('700963', 40, 'ml'), L('700966', 15, 'g'),
          L('7000123', 1, 'buc'), L('702321', 1, 'buc'), L('702398', 11.2, 'g'),
          L('702496', 1, 'buc', true),
        ],
      }],
    },
  ];

  // ——— PMIX estimat (nu provine din NBO): volume plauzibile, deterministe, pentru a activa analizele
  const locatii = [
    { cod: 'L01', nume: 'FRYDAY București Sun Plaza' },
    { cod: 'L02', nume: 'CHICKEN GANG Chișinău' },
  ];
  const vanzari: VanzareFapt[] = [];
  const salesReport: SalesReportRand[] = [];
  const bazaZi: Record<string, number> = { '820023': 26, '820024': 22, '820025': 15 };

  for (const luna of ['2026-06', '2026-07']) {
    const zile = luna === '2026-06' ? 30 : 26;
    for (let z = 1; z <= zile; z++) {
      const data = `${luna}-${String(z).padStart(2, '0')}`;
      const weekend = [0, 6].includes(new Date(`${data}T12:00:00Z`).getUTCDay());
      for (const loc of locatii) {
        const factorLoc = loc.cod === 'L01' ? 1 : 0.78;
        const perCanal: Record<string, { net: number; brut: number; bonuri: number }> = {
          INSTORE: { net: 0, brut: 0, bonuri: 0 }, DELIVERY: { net: 0, brut: 0, bonuri: 0 },
        };
        for (const p of produse.filter(x => x.activ)) {
          const baza = bazaZi[p.cod] ?? 10;
          for (const canal of ['INSTORE', 'DELIVERY'] as const) {
            const cotaCanal = canal === 'INSTORE' ? 0.68 : 0.32;
            const cant = Math.max(1, Math.round(baza * factorLoc * cotaCanal * (weekend ? 1.22 : 1) * (0.85 + rnd() * 0.3)));
            const pretBrut = (canal === 'INSTORE' ? p.pretInstore : p.pretDelivery) ?? 0;
            const brut = pretBrut * cant;
            const net = brut / (1 + p.tva / 100);
            vanzari.push({ data, locatie: loc.cod, canal, produs: p.cod, cant, brut, net });
            perCanal[canal].net += net; perCanal[canal].brut += brut;
            perCanal[canal].bonuri += Math.round(cant * 0.6);
          }
        }
        for (const canal of ['INSTORE', 'DELIVERY'] as const) {
          salesReport.push({ data, locatie: loc.cod, canal, ...perCanal[canal] });
        }
      }
    }
  }

  return {
    locatii,
    furnizori: [
      { cod: 'F01', nume: 'Panificație — furnizor NBO' },
      { cod: 'F02', nume: 'Transavia / Gierlinger' },
      { cod: 'F03', nume: 'Sosuri & uleiuri' },
      { cod: 'F04', nume: 'Legume' },
      { cod: 'F05', nume: 'Lactate' },
      { cod: 'F06', nume: 'Ambalaje' },
    ],
    ingrediente, produse, retete, vanzari, salesReport,
    linii29: [],                       // raportul 2.9 nu a fost încă importat
    materiale29: [],
    waste: [], inventar: [],
    reguli: [
      { pattern: 'ambalaj', clasa: 'PAPER' },
      { pattern: 'hartie', clasa: 'PAPER' },
      { pattern: 'cutie', clasa: 'PAPER' },
      { pattern: 'consumabil', clasa: 'EXCLUS' },
      { pattern: 'curatenie', clasa: 'EXCLUS' },
    ],
    tinte: [{ locatie: 'RETEA', fcCurat: 30 }],
    importuri: [{
      id: 'NBO1', tip: 'RETETAR', fisier: 'recipe cards NBO 07.01.2026',
      data: '2026-01-07', randuri: 28, importate: 28, status: 'IMPORTAT',
      erori: [],
      avertismente: [
        'Prețurile ingredientelor provin din coloana Cost a recipe card-urilor NBO, convertite în UM de bază.',
        'PMIX-ul este estimat, nu importat — înlocuiește-l cu exportul real înainte de a folosi cifrele de profit.',
        'Chicken Pesto Burger (700970) are preț POS 0,00 în NBO — a intrat ca produs inactiv.',
      ],
    }],
    scenarii: [],
    pretFurnizori: [],
    rnd: [], nemapate: [],
    labor: [],
    costuriOperare: [],
    reguliBusiness: [
      { id: 'R1', tip: 'FC_MAX_CATEGORIE', nume: 'Food Cost maxim pe categorie', valoare: 32, activ: true },
      { id: 'R2', tip: 'MARJA_MIN', nume: 'Marjă minimă pe produs', valoare: 62, activ: true },
    ],
    setari: { tvaImplicit: TVA_FRYDAY, tintaLaborPct: 17.5, comisionDeliveryPct: 16, pragAlertaPret: 5, tolerantaReconciliere: 1 },
  };
}
