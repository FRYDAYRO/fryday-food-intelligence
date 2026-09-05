/**
 * Identitatea unui material de raport (2.9, 2.8) în nomenclatorul de ingrediente — regula
 * unică folosită la import, în punte, la verdictul de reimport și la potrivirea 2.8 ↔ 2.9.
 * Modul fără dependențe de motoare, ca să poată fi folosit și din fc-core.
 */
import { norm } from './engine';

/**
 * Ingredientul din nomenclator pentru un material 2.9 — singura regulă de identificare, folosită
 * la import, în punte și la verdictul de reimport: codul de material = codul ingredientului;
 * altfel denumirea, normalizată; altfel un alias aprobat în coada comună (pe cod sau pe nume).
 * Fără potrivire → `null`: materialul merge în coadă, nu se creează și nu se ghicește.
 */
export function identificaIngredient(
  ingrediente: Iterable<{ cod: string; denumire: string; aliasuri?: string[] }>, material: string, denumire: string,
): string | null {
  const lista = [...ingrediente];
  const direct = material ? lista.find(i => i.cod === material) : undefined;
  if (direct) return direct.cod;
  const k = norm(denumire);
  const peNume = k ? lista.find(i => norm(i.denumire) === k) : undefined;
  if (peNume) return peNume.cod;
  const peAlias = lista.find(i => (i.aliasuri ?? []).some(a => a === material || (k !== '' && norm(a) === k)));
  return peAlias ? peAlias.cod : null;
}

