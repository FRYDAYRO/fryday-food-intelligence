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
}

const Gol = createContext<TowerCtx | null>(null);

export const TowerProvider = Gol.Provider;

export function useTower(): TowerCtx {
  const t = useContext(Gol);
  if (!t) throw new Error('useTower în afara TowerProvider');
  return t;
}
