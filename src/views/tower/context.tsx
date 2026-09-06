import { createContext, useContext } from 'react';
import type { AppState } from '../../lib/types';
import type { Ctx } from '../../lib/engine';
import type { AccesTower, SelectieFC } from '../../lib/fc-tower';

/**
 * Contextul turnului de control. Îl primesc toate ecranele, ca nicio secțiune să nu-și
 * construiască singură scopul: perioada, restaurantul și canalul vin dintr-un singur loc.
 */
export interface TowerCtx {
  state: AppState;
  ctx: Ctx;
  sel: SelectieFC;
  setSel: (s: SelectieFC) => void;
  acces: AccesTower;
  /** Singura poartă de scriere: o folosește doar Import Center, după validare. */
  update: (fn: (s: AppState) => AppState) => void;
  /**
   * Restaurantul real ales din selector care NU are încă un identificator verificat.
   * Cât timp e setat, turnul nu arată cifre: nu există date pentru el, iar ale altuia
   * nu se împrumută. Opțional, ca ecranele testate izolat să nu fie obligate să-l dea.
   */
  nemapat?: string | null;
  setNemapat?: (nume: string | null) => void;
}

const Gol = createContext<TowerCtx | null>(null);

export const TowerProvider = Gol.Provider;

export function useTower(): TowerCtx {
  const t = useContext(Gol);
  if (!t) throw new Error('useTower în afara TowerProvider');
  return t;
}
