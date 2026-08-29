/**
 * Legătura dintre selecția din bară și motoarele de calcul. Aici NU se calculează nimic:
 * fiecare hook doar memorează rezultatul motorului potrivit pentru scopul curent.
 */
import { useMemo } from 'react';
import { analizaTimeline, serieTimeline, type AnalizaTimeline, type PunctTimeline } from '../../lib/fc-timeline';
import { bridgeFC, type FCBridge } from '../../lib/fc-bridge';
import { analizaIngrediente, type AnalizaIngrediente } from '../../lib/fc-ingrediente';
import { simuleazaFC, type ScenariuFC, type SimulareFC } from '../../lib/fc-simulare';
import {
  cerereBaza, cerereDin, comparatieIngrediente, intervalSerie, nivelDin,
  type CaleDrill, type SelectieFC,
} from '../../lib/fc-tower';
import { useTower } from './context';

export function useAnaliza(caleLocatie?: string): AnalizaTimeline {
  const { state, ctx, sel } = useTower();
  const efectiv: SelectieFC = caleLocatie ? { ...sel, scop: 'RESTAURANT', locatie: caleLocatie } : sel;
  return useMemo(() => analizaTimeline(state, ctx, cerereDin(efectiv)), [state, ctx,
    efectiv.ancora, efectiv.granularitate, efectiv.comparatie, efectiv.scop, efectiv.locatie, efectiv.canal]);
}

export function usePunte(caleLocatie?: string): FCBridge {
  const { state, ctx, sel } = useTower();
  const efectiv: SelectieFC = caleLocatie ? { ...sel, scop: 'RESTAURANT', locatie: caleLocatie } : sel;
  return useMemo(() => bridgeFC(state, ctx, cerereBaza(efectiv)), [state, ctx,
    efectiv.ancora, efectiv.granularitate, efectiv.scop, efectiv.locatie, efectiv.canal]);
}

export function useIngrediente(caleLocatie?: string): AnalizaIngrediente {
  const { state, ctx, sel } = useTower();
  const efectiv: SelectieFC = caleLocatie ? { ...sel, scop: 'RESTAURANT', locatie: caleLocatie } : sel;
  return useMemo(() => analizaIngrediente(state, ctx, {
    ...cerereBaza(efectiv), comparatie: comparatieIngrediente(efectiv),
  }), [state, ctx, efectiv.ancora, efectiv.granularitate, efectiv.comparatie,
    efectiv.scop, efectiv.locatie, efectiv.canal]);
}

export function useSerie(nrPerioade = 12): PunctTimeline[] {
  const { state, ctx, sel } = useTower();
  return useMemo(() => {
    const interval = intervalSerie(state, sel, nrPerioade);
    if (!interval) return [];
    return serieTimeline(state, ctx, {
      de: interval.de, la: interval.la,
      granularitate: sel.granularitate, nivel: nivelDin(sel), canal: sel.canal,
    });
  }, [state, ctx, sel.ancora, sel.granularitate, sel.scop, sel.locatie, sel.canal, nrPerioade]);
}

/** Simularea rulează pe o COPIE — motorul nu atinge niciodată datele reale. */
export function useSimulare(scenariu: ScenariuFC): SimulareFC {
  const { state, ctx, sel } = useTower();
  const semnatura = JSON.stringify(scenariu);
  return useMemo(() => simuleazaFC(state, ctx, cerereBaza(sel), scenariu), [state, ctx,
    sel.ancora, sel.granularitate, sel.scop, sel.locatie, sel.canal, semnatura]);
}

/** Analiza pentru o cale de drill-down: restaurantul din cale schimbă scopul, restul rămâne. */
export const locatiaDinCale = (cale: CaleDrill, sel: SelectieFC): string | undefined =>
  cale.locatie ?? (sel.scop === 'RESTAURANT' ? sel.locatie ?? undefined : undefined);
