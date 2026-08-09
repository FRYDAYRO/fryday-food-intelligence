// Citirea rapoartelor PDF direct în browser (pdf.js), fără server.
// Rulează pe firul principal, prin mecanismul oficial de „fake worker" al pdf.js
// (globalThis.pdfjsWorker) — astfel funcționează identic în build-ul Vite, în fișierul-unic
// și în Node (teste), fără fișiere de worker separate.
interface ItemText { str: string; transform: number[]; }

/**
 * Reconstruiește liniile vizuale dintr-o pagină: pdf.js dă fragmente poziționate, nu rânduri.
 * Fragmentele se grupează pe coordonata Y (cu toleranță, pentru zecimalele de poziționare)
 * și se ordonează pe X — exact ordinea în care le-ar citi un om.
 */
export function liniiDinItems(items: ItemText[]): string[] {
  const cuPozitie = items
    .filter(i => i.str.trim() !== '')
    .map(i => ({ text: i.str, x: i.transform[4], y: i.transform[5] }));
  if (!cuPozitie.length) return [];

  // grupare pe Y: două fragmente aparțin aceleiași linii dacă diferența e sub ~40% din înălțimea tipică
  const randuri: { y: number; frag: { text: string; x: number }[] }[] = [];
  const TOL = 2.5;
  for (const f of cuPozitie.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const r = randuri.find(x => Math.abs(x.y - f.y) <= TOL);
    if (r) r.frag.push({ text: f.text, x: f.x });
    else randuri.push({ y: f.y, frag: [{ text: f.text, x: f.x }] });
  }
  return randuri
    .sort((a, b) => b.y - a.y)
    .map(r => r.frag.sort((a, b) => a.x - b.x).map(f => f.text).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Textul complet al unui PDF, pagină cu pagină, ca linii — formatul așteptat de matriceDinText(). */
export async function textDinPdf(date: ArrayBuffer): Promise<string> {
  // Încărcare leneșă: pdf.js intră doar când chiar se citește un PDF. În varianta fișier-unic
  // (deschisă direct de pe disc) chunk-ul separat nu poate fi adus — apelantul tratează eroarea.
  // @ts-expect-error — modulul de worker nu are declarații de tipuri; e handlerul intern („fake worker")
  const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const sarcina = pdfjs.getDocument({ data: new Uint8Array(date), useSystemFonts: true });
  const doc = await sarcina.promise;
  const linii: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const continut = await pagina.getTextContent();
    linii.push(...liniiDinItems(continut.items as ItemText[]));
  }
  await sarcina.destroy();
  return linii.join('\n');
}
