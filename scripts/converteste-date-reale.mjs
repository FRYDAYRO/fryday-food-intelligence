// Convertește rapoartele reale (xlsx FC + PDF 4.7 Sales Mix + PDF 2.9) în `src/lib/date-reale.ts`.
//
// Rulare:  node scripts/converteste-date-reale.mjs
// Necesită `pdftotext` (poppler-utils) pentru cele două PDF-uri.
//
// Ce produce: un AppState complet, cu două locații DISTINCTE, pentru că sursele
// nu au același domeniu (vezi ATENȚIE în README-ul generat):
//   NET  = rețea, 30 restaurante, 27–31 iulie 2026 (raportul 4.7)
//   CLUJ = FRYDAY CLUJ MEMO, 1–31 iulie 2026 (raportul 2.9)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import XLSX from 'xlsx';

const DIR = resolve(process.cwd(), 'date-sursa');
const F_XLSX = join(DIR, 'FRYDAY_FC_Initial_Corectat.xlsx');
const F_47 = join(DIR, '4.7_Sales_Mix.pdf');
const F_29 = join(DIR, '2.9_Cluj_Memo.pdf');
const F_CRIT = join(DIR, 'CR_IT_CENTRALIZAT.xlsx');       // etapa de prețuri 03.08.2026
const F_DELIV = join(DIR, 'PRETURI_DELIVERY_UPDATE.xlsx'); // revizia ulterioară a prețurilor delivery
const IESIRE = resolve(process.cwd(), 'src/lib/date-reale.ts');

const LUNA = '2026-07';
const DATA_47 = '2026-07-31';   // 4.7 e agregat 27–31 iulie; datăm la sfârșitul intervalului
const VALID_DE_LA = '2026-07-01';
const LOC_NET = 'NET';
const LOC_CLUJ = 'CLUJ';

const avert = [];
const W = m => avert.push(m);

for (const f of [F_XLSX, F_47, F_29]) {
  if (!existsSync(f)) { console.error(`Lipsește fișierul sursă: ${f}`); process.exit(1); }
}

const pdfText = f => {
  try {
    return execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch {
    console.error('`pdftotext` lipsește. Instalează poppler-utils (apt-get install poppler-utils).');
    process.exit(1);
  }
};

const num = v => {
  if (typeof v === 'number') return v;
  if (v == null) return null;
  let s = String(v).trim().replace(/\$/g, '').replace(/,/g, '');
  if (!s || s === '-') return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }        // (123) = negativ
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
};

// Normalizare pentru potrivirea denumirilor între rapoarte:
// scoate „new", separă cifrele de litere („40ml" = „40 ml") și uniformizează UM.
const norm = s => String(s ?? '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .replace(/\bNEW\b/g, ' ')
  .replace(/(\d)([A-Z])/g, '$1 $2')
  .replace(/([A-Z])(\d)/g, '$1 $2')
  .replace(/\bGM\b/g, 'G')
  .replace(/\bLT\b/g, 'L')
  .trim()
  .replace(/\s+/g, ' ');

// scoate „new" ca să rămână marcajul de canal („… D") la final
const faraNew = s => String(s ?? '').replace(/\bnew\b/gi, ' ').trim().replace(/\s+/g, ' ');

// denumire fără gramajul final (CARTOFI CRISS CUT 140 G → CARTOFI CRISS CUT)
const faraGramaj = n => n.replace(/\s+\d+(\s*\d*)?\s*(G|ML|L|KG|BUC|X)?$/,'').trim();

// ── 1. NOMENCLATOR + 2.9 → ingrediente ─────────────────────────────────────
const wb = XLSX.readFile(F_XLSX);
const sheet = n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, blankrows: false });

const t29 = pdfText(F_29);

// Categoriile din 2.9 dau clasificarea reală FOOD/PACKAGING pe cod materie primă.
const CAT_PAPER = /^(Paper|ACCESORII)$/i;
const CAT_EXCLUS = /^(Toys|UNIFORMA|Birotica|MERCH RAW|Operationale|Produse curatenie|Garantie)/i;

// Raportul emite pentru fiecare categorie o pereche de rânduri `Total:` (subgrup,
// apoi grup — grupul include și subcategoriile surori, ex. Paper = Paper + ACCESORII).
// Luăm PRIMA apariție a fiecărui nume, apoi verificăm suma față de totalul general.
const catPeCod = new Map();   // cod MP → categorie 2.9
const linii29Agg = [];
{
  const vazuteCat = new Set();
  let bufer = [];
  for (const raw of t29.split('\n')) {
    const l = raw.replace(/\s+$/, '');
    if (!l.trim()) continue;

    const mTot = l.match(/^Total:\s+(.+?)\s{2,}(.*)$/);
    if (mTot) {
      const cat = mTot[1].trim();
      const col = mTot[2].trim().split(/\s+/);
      // [costExt, $actual, $theory, $variance, %a, %t, %v]
      const actual = num(col[1]);
      if (!vazuteCat.has(cat)) {
        vazuteCat.add(cat);
        if (actual != null) linii29Agg.push({ perioada: LUNA, locatie: LOC_CLUJ, categorie: cat, valoare: +actual.toFixed(2) });
        for (const cod of bufer) if (!catPeCod.has(cod)) catPeCod.set(cod, cat);
      }
      bufer = [];
      continue;
    }
    // rând de materie primă: <denumire> <ItemID> <UM> <coloane numerice>
    const m = l.match(/^(.{3,45}?)\s{2,}(\d{3,9})\s+(EA|KG|GM|ML|Each|LB|OZ|L)\s+\S/i);
    if (m) bufer.push(m[2]);
  }
}

// invariantă: suma categoriilor trebuie să dea totalul general al raportului
{
  const mGT = t29.match(/Totals:\s+Sales:\s+\$[\d,.]+\s+\$[\d,.]+\s+\$?([\d,]+)\s+\$?([\d,]+)/);
  const sum = linii29Agg.reduce((s, l) => s + l.valoare, 0);
  if (mGT) {
    const gt = num(mGT[1]);
    if (gt != null && Math.abs(sum - gt) > 1) W(`2.9: suma categoriilor ${sum.toFixed(0)} ≠ total raport ${gt} (diferență ${(sum - gt).toFixed(0)})`);
    else console.log(`✓ 2.9: suma categoriilor = totalul raportului (${sum.toFixed(0)})`);
  } else W('2.9: nu am putut citi totalul general pentru verificare.');
}

const nom = sheet('NOMENCLATOR');
const ingrediente = [];
const ingPeCod = new Map();
for (const r of nom.slice(3)) {
  const cod = r[0] == null ? null : String(r[0]).trim();
  if (!cod || !r[1]) continue;
  const denRaw = String(r[1]).trim();
  const den = denRaw.replace(/^[\d.]+\s+(EA|ML|GM|KG|L)\s+/i, '');   // "1.000 EA Xyz" → "Xyz"
  const umSrc = String(r[2] ?? 'EA').trim().toUpperCase();
  const cost = num(r[3]);
  if (cost == null) { W(`NOMENCLATOR: cost lipsă pentru ${cod} ${den}`); continue; }
  // EA→buc (cost/buc), GM→kg (cost/g ×1000), ML→l (cost/ml ×1000)
  const um = umSrc === 'GM' ? 'kg' : umSrc === 'ML' ? 'l' : 'buc';
  const pret = umSrc === 'GM' || umSrc === 'ML' ? cost * 1000 : cost;
  const cat29 = catPeCod.get(cod);
  const tip = cat29 && CAT_PAPER.test(cat29) ? 'PACKAGING' : 'FOOD';
  const ing = {
    cod, denumire: den, categorie: cat29 ?? 'Neclasificat', tip, um,
    preturi: [{ validDeLa: VALID_DE_LA, pret: +pret.toFixed(6) }], activ: true,
  };
  ingrediente.push(ing);
  ingPeCod.set(cod, ing);
}

// ── 2. RETETAR → blocuri de rețetă ─────────────────────────────────────────
const ret = sheet('RETETAR');
const blocuri = new Map();   // nume rețetă → linii
{
  let nume = null, linii = null;
  for (const r of ret.slice(2)) {
    const a = r[0] == null ? '' : String(r[0]).trim();
    if (!a) continue;
    if (a === 'COD') continue;                       // rând de antet
    const esteAntetBloc = r[1] == null && r[5] != null && typeof r[5] === 'string';
    const esteTotalBloc = r[1] == null && typeof r[5] === 'number';
    if (esteAntetBloc) { nume = a; linii = []; blocuri.set(nume, linii); continue; }
    if (esteTotalBloc) { nume = null; linii = null; continue; }
    if (!linii) continue;
    const cant = num(r[2]);
    const umSrc = String(r[3] ?? '').trim().toUpperCase();
    if (cant == null || !umSrc) continue;
    const um = umSrc === 'GM' ? 'g' : umSrc === 'ML' ? 'ml' : 'buc';
    linii.push({ comp: a, cant, um, _den: String(r[1] ?? '').trim() });
  }
}

// ── 3. FOOD COST → produse (Instore+Delivery unite) ────────────────────────
const fcRows = sheet('FOOD COST').slice(3).filter(r => r[0]);
const produseMap = new Map();   // cod produs → produs + rețete sursă
const slug = s => norm(s).replace(/ /g, '_').slice(0, 48);

for (const r of fcRows) {
  const denCom = String(r[0]).trim();
  const numeReteta = r[1] == null ? null : String(r[1]).trim();
  const categorie = String(r[2] ?? 'Necategorisit').trim();
  const canal = /deliver/i.test(String(r[3] ?? '')) ? 'DELIVERY' : 'INSTORE';
  const tvaPct = (num(r[5]) ?? 0.11) * 100;
  const pretCuTVA = num(r[8]);
  const baza = denCom.replace(/\s+D$/, '').trim();
  const cod = slug(baza);
  if (!cod) continue;
  let p = produseMap.get(cod);
  if (!p) {
    p = { cod, denumire: baza, categorie, tip: 'SIMPLU', tva: +tvaPct.toFixed(2), activ: true, _ret: {} };
    produseMap.set(cod, p);
  }
  if (canal === 'DELIVERY') p.pretDelivery = pretCuTVA ?? undefined;
  else p.pretInstore = pretCuTVA ?? undefined;
  if (numeReteta) p._ret[canal] = numeReteta;
}

// ── 4. Rețete: unim varianta Instore cu cea Delivery pe canale ─────────────
const retete = [];
const cheie = l => `${l.comp}|${l.cant}|${l.um}`;
let faraReteta = 0;
for (const p of produseMap.values()) {
  const li = p._ret.INSTORE ? blocuri.get(p._ret.INSTORE) : null;
  const ld = p._ret.DELIVERY ? blocuri.get(p._ret.DELIVERY) : null;
  if (!li && !ld) { faraReteta++; continue; }
  const mi = new Map((li ?? []).map(l => [cheie(l), l]));
  const md = new Map((ld ?? []).map(l => [cheie(l), l]));
  const linii = [];
  const push = (l, canal) => {
    const ing = ingPeCod.get(l.comp);
    if (!ing) { W(`Rețetă ${p.denumire}: ingredient necunoscut ${l.comp} (${l._den})`); return; }
    linii.push({
      comp: l.comp,
      tipComp: ing.tip === 'PACKAGING' ? 'AMBALAJ' : 'INGREDIENT',
      cant: l.cant, um: l.um, canal,
    });
  };
  for (const [k, l] of mi) push(l, md.has(k) ? 'AMBELE' : (ld ? 'INSTORE' : 'AMBELE'));
  for (const [k, l] of md) if (!mi.has(k)) push(l, 'DELIVERY');
  if (!linii.length) { faraReteta++; continue; }
  retete.push({ cod: p.cod, tip: 'PRODUS', denumire: p.denumire, activa: 1, versiuni: [{ nr: 1, data: VALID_DE_LA, nota: 'Import xlsx FC inițial', linii }] });
}

const produsPeNume = new Map();
for (const p of produseMap.values()) produsPeNume.set(norm(p.denumire), p.cod);
// index secundar, fără gramaj — folosit doar dacă e neambiguu
const produsFaraGramaj = new Map();
for (const p of produseMap.values()) {
  const k = faraGramaj(norm(p.denumire));
  if (!k || produsPeNume.has(k)) continue;
  produsFaraGramaj.set(k, produsFaraGramaj.has(k) ? null : p.cod);   // null = ambiguu
}
// SKU-uri grupate: „Pepsi /PEPSI ZERO/7UP ZERO/LIPTON 500ML" enumeră chiar în denumire
// variantele acoperite → înregistrăm fiecare variantă ca alias către același produs.
for (const p of produseMap.values()) {
  if (!p.denumire.includes('/')) continue;
  const parti = p.denumire.split('/').map(s => s.trim()).filter(Boolean);
  if (parti.length < 2) continue;
  const ultim = norm(parti[parti.length - 1]);
  const mDim = ultim.match(/(\d+\s*(?:ML|L|G|KG))$/);
  const dim = mDim ? mDim[1] : '';
  for (const part of parti) {
    const b = norm(part).replace(/(\d+\s*(?:ML|L|G|KG))$/, '').trim();
    if (!b) continue;
    const alias = (b + ' ' + dim).trim().replace(/\s+/g, ' ');
    if (!produsPeNume.has(alias)) produsPeNume.set(alias, p.cod);
  }
}



// ── 4b. Prețuri de listă (etapa 03.08.2026) ────────────────────────────────
// Prețul nou intră în vigoare la 03.08.2026; îl păstrăm pe cel anterior, datat,
// ca să nu se rescrie istoricul (invarianta 1).
const DATA_PRET_NOU = '2026-08-03';

// „1. Denumiri RO": denumire ACTUALĂ → NOUĂ. Nomenclatorul nostru are denumirile
// actuale, iar foile de prețuri le folosesc pe cele noi → indexăm invers.
const redenumiri = new Map();
if (existsSync(F_CRIT)) {
  const wsD = XLSX.readFile(F_CRIT).Sheets['1. Denumiri RO'];
  if (wsD) {
    for (const r of XLSX.utils.sheet_to_json(wsD, { header: 1, blankrows: false }).slice(4)) {
      const vechi = r[0] == null ? '' : String(r[0]).trim();
      const nou = r[1] == null ? '' : String(r[1]).trim();
      if (!vechi || !nou) continue;
      const kNou = norm(nou.replace(/\s+D$/, ''));
      const kVechi = norm(vechi.replace(/\s+D$/, ''));
      if (kNou && kVechi && kNou !== kVechi) redenumiri.set(kNou, kVechi);
    }
  }
}

const gasesteProdus = den => {
  // „(REȚETA NOUĂ)" e un calificativ, nu alt produs — gramajul din paranteze rămâne
  const curatat = String(den).replace(/\(\s*RETETA\s+NOUA\s*\)/ig, ' ');
  const k = norm(curatat.replace(/\s+D$/, ''));
  const kAlt = redenumiri.get(k) ?? null;
  const cod = produsPeNume.get(k) ?? produsFaraGramaj.get(k)
    ?? (kAlt ? (produsPeNume.get(kAlt) ?? produsFaraGramaj.get(kAlt)) : null)
    ?? produsFaraGramaj.get(faraGramaj(k)) ?? null;
  return cod ? produseMap.get(cod) ?? null : null;
};

// Aplică o foaie de prețuri pe un canal. `colActual`/`colNou` sunt indici de coloană.
function aplicaPreturi({ fisier, foaie, canal, colActual, colNou, antet, sursa }) {
  const stat = { potrivite: 0, total: 0, schimbate: 0, nepotrivite: [] };
  if (!existsSync(fisier)) { W(`${sursa}: fișierul lipsește, prețurile ${canal} rămân cele din FOOD COST.`); return stat; }
  const ws = XLSX.readFile(fisier).Sheets[foaie];
  if (!ws) { W(`${sursa}: lipsește foaia „${foaie}".`); return stat; }
  for (const r of XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }).slice(antet)) {
    const den = r[0] == null ? '' : String(r[0]).trim();
    const actual = num(r[colActual]);
    const nou = num(r[colNou]);
    if (!den || (actual == null && nou == null)) continue;   // rânduri-titlu de secțiune
    stat.total++;
    const p = gasesteProdus(den);
    if (!p) { stat.nepotrivite.push(den); continue; }
    stat.potrivite++;
    const ist = [];
    if (actual != null) ist.push({ data: VALID_DE_LA, canal, pret: actual, nota: `preț anterior (${sursa})` });
    if (nou != null && actual != null && Math.abs(nou - actual) > 1e-9) {
      ist.push({ data: DATA_PRET_NOU, canal, pret: nou, nota: `etapa 03.08.2026 (${sursa})` });
      stat.schimbate++;
    }
    if (canal === 'INSTORE') p.pretInstore = nou ?? actual; else p.pretDelivery = nou ?? actual;
    if (ist.length) p.istoricPret = [...(p.istoricPret ?? []), ...ist];
  }
  return stat;
}

const pretIn = aplicaPreturi({
  fisier: F_CRIT, foaie: '8. Preturi INSTORE RO', canal: 'INSTORE',
  colActual: 1, colNou: 2, antet: 4, sursa: 'CR–IT',
});

// Delivery: se listează prețurile DUPĂ discount (col. 1 = actual, col. 3 = nou).
// PRETURI_DELIVERY_UPDATE.xlsx este revizia ulterioară a foii „9. Preturi DELIVERY RO"
// din CR–IT; unde diferă, are prioritate.
const pretDel = aplicaPreturi({
  fisier: F_DELIV, foaie: 'Preturi DELIVERY RO', canal: 'DELIVERY',
  colActual: 1, colNou: 3, antet: 5, sursa: 'UPDATE delivery',
});

// semnalăm divergențele față de foaia mai veche din CR–IT
if (existsSync(F_DELIV) && existsSync(F_CRIT)) {
  const cit = XLSX.readFile(F_CRIT).Sheets['9. Preturi DELIVERY RO'];
  const upd = XLSX.readFile(F_DELIV).Sheets['Preturi DELIVERY RO'];
  if (cit && upd) {
    const cheie = (rows, n) => {
      const m = new Map();
      for (const r of XLSX.utils.sheet_to_json(rows, { header: 1, blankrows: false }).slice(n)) {
        const d = r[0] == null ? '' : String(r[0]).trim();
        if (d && (typeof r[1] === 'number' || typeof r[3] === 'number')) m.set(d, [r[1], r[3]]);
      }
      return m;
    };
    const a = cheie(upd, 5), b = cheie(cit, 4);
    const cf = [];
    for (const [k, v] of a) {
      const w = b.get(k);
      if (w && (String(v[0]) !== String(w[0]) || String(v[1]) !== String(w[1]))) {
        cf.push(`${k}: UPDATE ${v[1]} vs CR–IT ${w[1]}`);
      }
    }
    if (cf.length) W(`Delivery — ${cf.length} produse diferă între UPDATE și CR–IT „9. Preturi DELIVERY RO"; s-a folosit UPDATE: ${cf.join(' · ')}`);
  }
}

const produse = [...produseMap.values()].map(({ _ret, ...p }) => p);

// ── 5. 4.7 Sales Mix → vânzări ─────────────────────────────────────────────
const t47 = pdfText(F_47);
const vanzari = [];
const nepotrivite = [];
{
  // Denumirile lungi se rup pe mai multe rânduri, iar continuarea vine DUPĂ rândul
  // cu cifre (ex. „AMERICAN DUBLU CHEESEBURGER" / „new D"). O atașăm ca sufix.
  const brute = [];
  let rupe = false;
  for (const raw of t47.split('\n')) {
    const l = raw.replace(/\s+$/, '');
    if (!l.trim()) continue;
    // anteturi/subsoluri de pagină — întrerup și continuarea denumirii
    if (/^\s*(CATEGORY|Menu Item Name|Multiple Selection|V \d|Groups\/Stores|FRYDAY |Fiscal Year|Period:|Copyright)/.test(l)
      || /\d{1,2}\/\d{1,2}\/\d{4}/.test(l) || /\bof \d+\s*$/.test(l)) { rupe = true; continue; }
    const m = l.match(/^\s+(.+?)\s{2,}([\d,]+)\s+([\d.]+)\s+\$([\d,.]+)\s*$/);
    if (m) {
      const den = m[1].trim();
      if (/^Total\b/i.test(den)) { rupe = true; continue; }
      brute.push({ nume: den, cant: num(m[2]), brut: num(m[4]) });
      rupe = false;
      continue;
    }
    const cont = l.match(/^\s{10,}([A-Za-z0-9%*''\-\.\/ ]{2,})\s*$/);
    if (cont && brute.length && !rupe) {
      const t = cont[1].trim();
      // o continuare reală conține litere și nu e un rest de subsol
      if (/[A-Za-z]/.test(t) && !/^Total/i.test(t) && t.length <= 40) {
        brute[brute.length - 1].nume += ' ' + t;
      } else rupe = true;
    }
  }
  for (const b of brute) {
    if (b.cant == null || b.brut == null) continue;
    const nume = b.nume.trim();
    const curat = faraNew(nume);                       // „X new D new" → „X D"
    // marcaj de canal la final: „ D" sau „ MD" (marketplace delivery)
    const canal = /\sM?D$/.test(curat) ? 'DELIVERY' : 'INSTORE';
    const bazaNume = curat.replace(/\s+M?D$/, '');
    const k = norm(bazaNume);
    let cod = produsPeNume.get(k);
    if (!cod) {
      const alt = produsFaraGramaj.get(k);
      if (alt) cod = alt;
    }
    if (!cod) { nepotrivite.push({ nume, cant: b.cant, brut: b.brut }); continue; }
    const p = produseMap.get(cod);
    const tva = p ? p.tva : 11;
    vanzari.push({
      data: DATA_47, locatie: LOC_NET, canal, produs: cod,
      cant: b.cant, brut: +b.brut.toFixed(2), net: +(b.brut / (1 + tva / 100)).toFixed(2),
    });
  }
}

// ── 6. Sales report: total rețea (4.7) + total Cluj (2.9) ──────────────────
const salesReport = [];
{
  const netRetea = vanzari.reduce((s, v) => s + v.net, 0);
  const brutRetea = vanzari.reduce((s, v) => s + v.brut, 0);
  salesReport.push({ data: DATA_47, locatie: LOC_NET, canal: 'INSTORE', net: +vanzari.filter(v => v.canal === 'INSTORE').reduce((s, v) => s + v.net, 0).toFixed(2), brut: +vanzari.filter(v => v.canal === 'INSTORE').reduce((s, v) => s + v.brut, 0).toFixed(2) });
  salesReport.push({ data: DATA_47, locatie: LOC_NET, canal: 'DELIVERY', net: +vanzari.filter(v => v.canal === 'DELIVERY').reduce((s, v) => s + v.net, 0).toFixed(2), brut: +vanzari.filter(v => v.canal === 'DELIVERY').reduce((s, v) => s + v.brut, 0).toFixed(2) });
  void netRetea; void brutRetea;
  const mSales = t29.match(/Totals:\s+Sales:\s+\$?([\d,]+\.\d{2})/);
  if (mSales) {
    salesReport.push({ data: '2026-07-31', locatie: LOC_CLUJ, canal: 'INSTORE', net: num(mSales[1]) });
  } else W('2.9: nu am găsit totalul Sales.');
}

// ── 7. Reguli de clasificare pentru 2.9 ────────────────────────────────────
const reguli = [...new Set(linii29Agg.map(l => l.categorie))].map(c => ({
  pattern: c,
  clasa: CAT_PAPER.test(c) ? 'PAPER' : CAT_EXCLUS.test(c) ? 'EXCLUS' : 'FOOD',
}));

// ── 8. Emitere ─────────────────────────────────────────────────────────────
const nepotrivitVal = nepotrivite.reduce((s, x) => s + x.brut, 0);
const totalBrut47 = vanzari.reduce((s, v) => s + v.brut, 0) + nepotrivitVal;

const state = {
  locatii: [
    { cod: LOC_NET, nume: 'Rețea FRYDAY — 30 restaurante (4.7, 27–31 iul)' },
    { cod: LOC_CLUJ, nume: 'FRYDAY CLUJ MEMO (2.9, iulie)' },
  ],
  furnizori: [],
  ingrediente,
  produse,
  retete,
  vanzari,
  salesReport,
  linii29: linii29Agg,
  reguli,
  tinte: [{ locatie: 'RETEA', fcCurat: 21 }],
  importuri: [
    {
      id: 'IMP-XLSX', tip: 'RETETAR', fisier: 'FRYDAY_FC_Initial_Corectat.xlsx', data: VALID_DE_LA,
      randuri: nom.length - 3 + fcRows.length, importate: ingrediente.length + produse.length + retete.length,
      avertismente: avert.slice(0, 50), erori: [], status: 'IMPORTAT',
    },
    {
      id: 'IMP-47', tip: 'PMIX', fisier: '4.7_Sales_Mix.pdf (27–31 iul, 30 restaurante)', data: DATA_47,
      randuri: vanzari.length + nepotrivite.length, importate: vanzari.length,
      avertismente: nepotrivite.length
        ? [`${nepotrivite.length} articole din 4.7 nu au corespondent în nomenclatorul xlsx `
          + `(${nepotrivitVal.toFixed(0)} lei, ${(100 * nepotrivitVal / (totalBrut47 || 1)).toFixed(1)}% din brut). `
          + `Vânzările rețelei sunt subevaluate cu această sumă, deci FC% pe locația ${LOC_NET} e supraevaluat.`,
        ...nepotrivite.sort((a, b) => b.brut - a.brut).slice(0, 25).map(x => `nepotrivit: ${x.nume} — ${x.brut.toFixed(2)} lei`)]
        : [],
      erori: [], status: 'IMPORTAT',
    },
    {
      id: 'IMP-29', tip: 'FC29', fisier: '2.9_Cluj_Memo.pdf (1–31 iul, FRYDAY CLUJ MEMO)', data: '2026-07-31',
      randuri: linii29Agg.length, importate: linii29Agg.length,
      avertismente: ['Domeniu diferit de 4.7: o singură locație, lună întreagă. Nu compara direct cu locația NET.'],
      erori: [], status: 'IMPORTAT',
    },
  ],
  scenarii: [],
  pretFurnizori: [],
  labor: [],
  costuriOperare: [],
  reguliBusiness: [],
  rnd: [],
  setari: { tvaImplicit: 11, tolerantaReconciliere: 2, pragAlertaPret: 10 },
};

const antet = `// GENERAT AUTOMAT de scripts/converteste-date-reale.mjs — nu edita manual.
// Surse: date-sursa/FRYDAY_FC_Initial_Corectat.xlsx, 4.7_Sales_Mix.pdf, 2.9_Cluj_Memo.pdf
//
// ATENȚIE — cele două rapoarte NU au același domeniu, de aceea stau pe locații separate:
//   ${LOC_NET}  = 30 de restaurante, 27–31 iulie 2026 (4.7 Sales Mix)
//   ${LOC_CLUJ} = doar FRYDAY CLUJ MEMO, 1–31 iulie 2026 (2.9)
// Nu compara direct FC-ul dintre ele și nu citi „Toată rețeaua" ca pe un FC real:
// ar împărți consumul lunar al unei locații la vânzările pe 5 zile ale rețelei.
import type { AppState } from './types';

export function genereazaDateReale(): AppState {
  return `;

writeFileSync(IESIRE, antet + JSON.stringify(state, null, 2).replace(/\n/g, '\n  ') + ' as AppState;\n}\n');

// ── Raport ─────────────────────────────────────────────────────────────────
console.log(`ingrediente        ${ingrediente.length}`);
console.log(`  din care PACKAGING ${ingrediente.filter(i => i.tip === 'PACKAGING').length}`);
console.log(`produse            ${produse.length}`);
console.log(`rețete             ${retete.length}   (fără rețetă: ${faraReteta})`);
console.log(`vânzări (4.7)      ${vanzari.length} rânduri, brut ${totalBrut47 ? (100 * (totalBrut47 - nepotrivitVal) / totalBrut47).toFixed(1) : '0'}% potrivit`);
console.log(`  nepotrivite      ${nepotrivite.length} articole, ${nepotrivitVal.toFixed(2)} lei`);
for (const [et, st] of [['instore CR–IT', pretIn], ['delivery UPDATE', pretDel]]) {
  console.log(`preț ${et.padEnd(15)} ${st.potrivite}/${st.total} potrivite, ${st.schimbate} modificate la 03.08.2026`);
  if (st.nepotrivite.length) console.log(`  fără corespondent  ${st.nepotrivite.length}: ${st.nepotrivite.slice(0, 5).join(' · ')}${st.nepotrivite.length > 5 ? ' …' : ''}`);
}
console.log(`linii 2.9          ${linii29Agg.length} categorii, total ${linii29Agg.reduce((s, l) => s + l.valoare, 0).toFixed(2)}`);
console.log(`salesReport        ${salesReport.length}`);
if (avert.length) {
  console.log(`\navertismente (${avert.length}), primele 10:`);
  for (const a of avert.slice(0, 10)) console.log('  ·', a);
}
if (nepotrivite.length) {
  console.log('\ntop 10 articole 4.7 nepotrivite:');
  for (const x of nepotrivite.sort((a, b) => b.brut - a.brut).slice(0, 10)) {
    console.log(`  · ${x.nume.padEnd(46)} ${x.brut.toFixed(2)}`);
  }
}
console.log(`\nscris: ${IESIRE}`);
