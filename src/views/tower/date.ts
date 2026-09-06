/**
 * Legătura dintre selecția din bară și motoarele de calcul. Aici NU se calculează nimic:
 * fiecare hook doar memorează rezultatul motorului potrivit pentru scopul curent.
 */
import { useMemo } from 'react';
import { analizaTimeline, serieTimeline, type AnalizaTimeline, type PunctTimeline } from '../../lib/fc-timeline';
import { bridgeFC, type FCBridge } from '../../lib/fc-bridge';
import { ajustari29, type Ajustari29 } from '../../lib/ajustari-29';
import { reconciliationFC, type ReconciliationFC } from '../../lib/fc-core';
import { analizaIngrediente, type AnalizaIngrediente } from '../../lib/fc-ingrediente';
import { simuleazaFC, type ScenariuFC, type SimulareFC } from '../../lib/fc-simulare';
import { tablouVariatii, type TabloulVariatii } from '../../lib/fc-variatii';
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

/** Ajustările de inventar 2.9 pe aceeași cerere ca puntea — cifră separată, calculată la cerere. */
export function useAjustari29(caleLocatie?: string): Ajustari29 {
  const { state, ctx, sel } = useTower();
  const efectiv: SelectieFC = caleLocatie ? { ...sel, scop: 'RESTAURANT', locatie: caleLocatie } : sel;
  return useMemo(() => ajustari29(state, ctx, cerereBaza(efectiv)), [state, ctx,
    efectiv.ancora, efectiv.granularitate, efectiv.scop, efectiv.locatie, efectiv.canal]);
}

/** Puntea canonică cu atribuirea waste-ului (pașii EXPLICAT / NERECONCILIAT), pe aceeași cerere. */
export function useReconciliere(caleLocatie?: string): ReconciliationFC {
  const { state, ctx, sel } = useTower();
  const efectiv: SelectieFC = caleLocatie ? { ...sel, scop: 'RESTAURANT', locatie: caleLocatie } : sel;
  return useMemo(() => reconciliationFC(state, ctx, cerereBaza(efectiv)), [state, ctx,
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

/**
 * Tabloul de variații. Ia din bară scopul (companie/restaurant), canalul și ancora;
 * granularitatea NU o ia, pentru că vederea arată AMBELE cadențe deodată — asta e tot
 * rostul ei. Comparația e fixată la perioada precedentă din același motiv.
 */
export function useVariatii(): TabloulVariatii {
  const { state, ctx, sel } = useTower();
  return useMemo(() => tablouVariatii(state, ctx, {
    ancora: sel.ancora, nivel: nivelDin(sel), canal: sel.canal,
  }), [state, ctx, sel.ancora, sel.scop, sel.locatie, sel.canal]);
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
