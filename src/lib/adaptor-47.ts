/**
 * Adaptorul 4.7: leagă raportul Sales Mix de Store Master.
 *
 * Ce face: ia lista de restaurante din antetul raportului („Groups/Stores Selected for this
 * Report"), o trece prin motorul de potrivire EXISTENT (`store-master`) și spune limpede
 * ce scop are fișierul. Nu re-parsează raportul, nu rescrie motorul de potrivire și nu
 * atinge nicio formulă de Food Cost.
 *
 * Distincția pe care o apără:
 *
 *   Un 4.7 „Multiple Selection" e agregat pe TOATĂ REȚEAUA. Rândurile lui sunt vânzări
 *   însumate peste zeci de restaurante — nu ale unuia. Dacă un asemenea fișier ar fi citit
 *   ca date ale unui restaurant, fiecare cifră pe restaurant ar fi falsă de zeci de ori.
 *   De aceea scopul se stabilește ÎNAINTE de orice calcul, iar un fișier de rețea nu poate
 *   fi atribuit unui magazin nici din greșeală.
 *
 * Raportul 4.7 nu conține identificatori de magazin — doar nume. Potrivirea pe nume
 * stabilește identitatea; `storeId` rămâne `null`, exact ca peste tot în aplicație.
 */
import type { SalesMix } from './salesmix';
import {
  esteUtilizabila, potrivesteRestaurant,
  type IntrareStoreMaster, type ProvenientaRand, type StatusPotrivire,
} from './store-master';
import { STORE_MASTER } from './store-master';

/** Ce acoperă fișierul. Se decide din antet, nu din numele fișierului. */
export type ScopFisier47 =
  | 'RETEA_AGREGAT'    // mai multe restaurante însumate — NU sunt datele niciunui magazin
  | 'RESTAURANT_UNIC'  // un singur restaurant declarat în antet
  | 'SCOP_NEDECLARAT'; // antetul nu spune pe ce restaurante e raportul

export const ETICHETA_SCOP_47: Record<ScopFisier47, string> = {
  RETEA_AGREGAT: 'Raport agregat pe rețea',
  RESTAURANT_UNIC: 'Raport pe un singur restaurant',
  SCOP_NEDECLARAT: 'Scop nedeclarat în raport',
};

export const MESAJ_SCOP_NEDECLARAT =
  'Raportul nu declară pe ce restaurante a fost rulat. Date insuficiente pentru o concluzie sigură '
  + 'la nivel de restaurant.';

export const MESAJ_AGREGAT =
  'Raportul însumează mai multe restaurante. Cifrele lui sunt de REȚEA: nu se pot atribui unui '
  + 'restaurant anume și nu se împart între ele.';

export interface RezumatPotrivire47 {
  /** Câte restaurante declară antetul. */
  totalDeclarate: number;
  matched: number;
  unmatched: number;
  ambiguous: number;
  /** Numele care nu s-au putut rezolva — matched = 0 pentru ele. */
  peStatus: Record<StatusPotrivire, number>;
}

export interface RezultatAdaptor47 {
  fisier: string;
  raport: 'PMIX_47';
  perioadaDe: string | null;
  perioadaLa: string | null;
  /** Cheia de perioadă folosită de restul aplicației (`AAAA-LL`), din data de început. */
  perioada: string;
  scop: ScopFisier47;
  /** Identitățile rezolvate din antet, fiecare cu proveniența ei completă. */
  restaurante: ProvenientaRand[];
  rezumat: RezumatPotrivire47;
  /** Câte linii de vânzare conține raportul. */
  liniiTotal: number;
  /**
   * `true` doar când fișierul poate hrăni analitică PE RESTAURANT: un singur restaurant,
   * identificat fără ambiguitate. Un raport de rețea e util — dar la nivel de rețea.
   */
  atribuibilPeRestaurant: boolean;
  /** Restaurantul căruia îi aparțin rândurile, când există exact unul rezolvat. */
  restaurantUnic: string | null;
  /** De ce nu se poate atribui, când nu se poate. */
  motiv: string | null;
  avertismente: string[];
}

/**
 * Analizează un 4.7 deja parsat. Pur: nu atinge starea, nu scrie nimic, poate fi rulat
 * de oricâte ori pe același fișier cu același rezultat.
 */
export function analizeaza47(
  sm: SalesMix,
  fisier: string,
  master: IntrareStoreMaster[] = STORE_MASTER,
): RezultatAdaptor47 {
  const perioada = (sm.perioadaDe ?? '').slice(0, 7);
  const restaurante = sm.magazine.map((nume, i) =>
    potrivesteRestaurant(nume, { raport: 'PMIX_47', perioada, randSursa: i + 1 }, master));

  const peStatus: Record<StatusPotrivire, number> = {
    MATCHED_ID: 0, MATCHED_NAME: 0, MATCHED_ALIAS: 0, UNMATCHED: 0, AMBIGUOUS: 0,
  };
  for (const r of restaurante) peStatus[r.status]++;
  const matched = restaurante.filter(r => esteUtilizabila(r.status)).length;

  const rezumat: RezumatPotrivire47 = {
    totalDeclarate: sm.magazine.length,
    matched,
    unmatched: peStatus.UNMATCHED,
    ambiguous: peStatus.AMBIGUOUS,
    peStatus,
  };

  // „Corporate" în antet e o declarație de scop la fel de bună ca o listă de magazine:
  // raportul acoperă toată rețeaua. Nu se atribuie unui restaurant, dar nici nu e necunoscut.
  const scop: ScopFisier47 = sm.corporativ ? 'RETEA_AGREGAT'
    : sm.magazine.length === 0 ? 'SCOP_NEDECLARAT'
      : sm.magazine.length === 1 ? 'RESTAURANT_UNIC' : 'RETEA_AGREGAT';

  const avertismente: string[] = [];
  for (const r of restaurante) {
    if (r.status === 'AMBIGUOUS') avertismente.push(`„${r.valoareSursa}": ${r.motiv ?? 'ambiguu'}`);
    else if (r.status === 'UNMATCHED') avertismente.push(`„${r.valoareSursa}": nu există în Store Master.`);
  }

  // atribuirea pe restaurant: doar un singur restaurant, rezolvat fără ambiguitate
  let atribuibilPeRestaurant = false;
  let restaurantUnic: string | null = null;
  let motiv: string | null = null;

  if (scop === 'SCOP_NEDECLARAT') {
    motiv = MESAJ_SCOP_NEDECLARAT;
  } else if (scop === 'RETEA_AGREGAT') {
    motiv = sm.corporativ && !sm.magazine.length
      ? `${MESAJ_AGREGAT} (raport „${sm.etichetaScop ?? 'de rețea'}", pe toată compania)`
      : `${MESAJ_AGREGAT} (${sm.magazine.length} restaurante declarate)`;
  } else {
    const r = restaurante[0];
    if (esteUtilizabila(r.status)) {
      atribuibilPeRestaurant = true;
      restaurantUnic = r.identitate;
    } else {
      motiv = r.motiv ?? `Restaurantul „${r.valoareSursa}" nu s-a putut identifica.`;
    }
  }

  if (!sm.linii.length) avertismente.push('Raportul nu conține nicio linie de vânzare.');
  if (!sm.perioadaDe) avertismente.push('Raportul nu declară perioada — nu se poate data.');

  return {
    fisier, raport: 'PMIX_47',
    perioadaDe: sm.perioadaDe, perioadaLa: sm.perioadaLa, perioada,
    scop, restaurante, rezumat,
    liniiTotal: sm.linii.length,
    atribuibilPeRestaurant, restaurantUnic, motiv, avertismente,
  };
}

/** Rezumatul de o linie pe care îl arată ecranul de import. */
export function descrie47(r: RezultatAdaptor47): string {
  const z = r.rezumat;
  const cap = `${ETICHETA_SCOP_47[r.scop]} · ${r.liniiTotal} linii · ${z.matched}/${z.totalDeclarate} restaurante identificate`;
  return r.atribuibilPeRestaurant ? `${cap} · atribuit lui ${r.restaurantUnic}` : `${cap} · ${r.motiv ?? ''}`.trim();
}
