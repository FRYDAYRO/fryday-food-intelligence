/**
 * Compatibilitatea perioadelor între rapoarte.
 *
 * Problema, observată pe fișierele reale: 2.9 la nivel de companie acoperea 1–9 august
 * (9 zile), 4.7 acoperea 17–23 august (7 zile), iar 4.1 acoperea 15–21 iunie. Un Food Cost
 * calculat ca `consum(2.9) ÷ vânzări(4.7)` din asemenea fișiere ar împărți consumul unei
 * perioade la vânzările alteia — o cifră care arată ca un procent, dar nu înseamnă nimic.
 *
 * De aceea intervalele se compară ÎNAINTE de calcul, iar incompatibilitatea se declară.
 * Aplicația nu ajustează, nu extrapolează, nu „normalizează la 7 zile": nu are de unde ști
 * cum s-au distribuit vânzările în zilele lipsă.
 */

export interface IntervalRaport {
  raport: string;
  de: string;
  la: string;
}

export type FelCompatibilitate = 'IDENTIC' | 'SUPRAPUNERE_PARTIALA' | 'DISJUNCT' | 'NEDECLARAT';

export interface Compatibilitate {
  fel: FelCompatibilitate;
  compatibile: boolean;
  /** Zilele acoperite de fiecare, ca diferența de lungime să fie vizibilă. */
  zile: Record<string, number>;
  /** Câte zile au în comun. Zero la intervale disjuncte. */
  zileComune: number;
  motiv: string;
}

const zi = 86400000;
const ziua = (s: string) => Date.parse(s + 'T00:00:00Z');
const lungime = (de: string, la: string) => Math.round((ziua(la) - ziua(de)) / zi) + 1;

/**
 * Compară intervalele a două (sau mai multe) rapoarte. Compatibile înseamnă IDENTICE —
 * nimic mai puțin. O suprapunere parțială e cea mai periculoasă formă de incompatibilitate,
 * fiindcă produce o cifră plauzibilă, deci greu de pus la îndoială.
 */
export function compatibilitate(intervale: IntervalRaport[]): Compatibilitate {
  const zile: Record<string, number> = {};
  const valide = intervale.filter(x => x.de && x.la);
  for (const x of valide) zile[x.raport] = lungime(x.de, x.la);

  if (valide.length < intervale.length || valide.length < 2) {
    return {
      fel: 'NEDECLARAT', compatibile: false, zile, zileComune: 0,
      motiv: valide.length < 2
        ? 'Sunt necesare cel puțin două rapoarte cu interval declarat pentru a le compara.'
        : 'Cel puțin un raport nu declară intervalul — compatibilitatea nu se poate stabili.',
    };
  }

  const toateLaFel = valide.every(x => x.de === valide[0].de && x.la === valide[0].la);
  if (toateLaFel) {
    return {
      fel: 'IDENTIC', compatibile: true, zile,
      zileComune: lungime(valide[0].de, valide[0].la),
      motiv: `Toate rapoartele acoperă exact ${valide[0].de} → ${valide[0].la}.`,
    };
  }

  const inceput = Math.max(...valide.map(x => ziua(x.de)));
  const sfarsit = Math.min(...valide.map(x => ziua(x.la)));
  const comune = sfarsit >= inceput ? Math.round((sfarsit - inceput) / zi) + 1 : 0;
  const listaZile = valide.map(x => `${x.raport} ${x.de}→${x.la} (${zile[x.raport]} zile)`).join(', ');

  return comune > 0
    ? {
      fel: 'SUPRAPUNERE_PARTIALA', compatibile: false, zile, zileComune: comune,
      motiv: `Rapoartele acoperă intervale diferite, cu ${comune} zile comune: ${listaZile}. `
        + 'Combinate, ar împărți consumul unei perioade la vânzările alteia. '
        + 'Rulează-le pe același interval.',
    }
    : {
      fel: 'DISJUNCT', compatibile: false, zile, zileComune: 0,
      motiv: `Rapoartele nu au nicio zi comună: ${listaZile}. Nu se pot combina.`,
    };
}

/** Mesajul scurt pentru ecran, când combinarea e refuzată. */
export const MESAJ_INCOMPATIBIL =
  'Rapoartele nu acoperă aceeași perioadă — Food Cost-ul combinat ar fi o cifră fără sens.';
