/**
 * Bara de control, mereu vizibilă. Ea e SINGURA sursă a scopului: perioadă, granularitate,
 * comparație, companie/restaurant și canal. Fiecare secțiune citește aceeași selecție,
 * deci nu există două ecrane care să arate perioade diferite.
 */
import { Sel, cx } from '../../lib/ui';
import {
  comparatiiDisponibile, normalizeazaSelectie, perioadeDisponibile,
  type GranularitateTower, type SelectieFC,
} from '../../lib/fc-tower';
import type { FCChannel } from '../../lib/fc-domeniu';
import { restauranteVizibile } from '../../lib/fc-acces';
import { useTower } from './context';

const CANALE: { v: FCChannel; l: string }[] = [
  { v: 'TOTAL', l: 'Total' },
  { v: 'INSTORE', l: 'InStore' },
  { v: 'DELIVERY', l: 'Delivery' },
];

export default function Bara() {
  const { state, sel, setSel, acces } = useTower();
  const perioade = perioadeDisponibile(state, sel.granularitate, acces);
  const comparatii = comparatiiDisponibile(state, sel);
  const aplica = (patch: Partial<SelectieFC>) => setSel(normalizeazaSelectie(state, { ...sel, ...patch }, acces));

  const schimbaGranularitate = (g: GranularitateTower) => {
    // ancora rămâne aceeași zi: schimbarea granularității nu mută utilizatorul în altă lună
    const lista = perioadeDisponibile(state, g, acces);
    const potrivita = lista.find(p => sel.ancora >= p.de && sel.ancora <= p.la) ?? lista[0];
    aplica({ granularitate: g, ancora: potrivita?.de ?? sel.ancora });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card/70 px-4 py-2 backdrop-blur" data-zona="bara">
      <span className="mr-1 hidden text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">
        Scop
      </span>

      <div className="inline-flex overflow-hidden rounded-md border" role="group" aria-label="Granularitate">
        {(['SAPTAMANA', 'LUNA'] as GranularitateTower[]).map(g => (
          <button key={g} type="button" data-granularitate={g}
            aria-pressed={sel.granularitate === g}
            onClick={() => schimbaGranularitate(g)}
            className={cx('h-9 px-3 text-sm font-semibold transition-colors',
              sel.granularitate === g ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}>
            {g === 'SAPTAMANA' ? 'Săptămână' : 'Lună'}
          </button>
        ))}
      </div>

      <Sel aria-label="Perioada" data-camp="perioada" value={sel.ancora}
        onChange={e => aplica({ ancora: e.target.value })}>
        {perioade.map(p => <option key={p.cheie} value={p.de}>{p.cheie}{p.partiala ? ' (parțială)' : ''}</option>)}
        {perioade.length === 0 && <option value={sel.ancora}>fără perioade cu date</option>}
      </Sel>

      <Sel aria-label="Perioada de comparație" data-camp="comparatie" value={sel.comparatie}
        onChange={e => aplica({ comparatie: e.target.value as SelectieFC['comparatie'] })}>
        {comparatii.map(c => (
          <option key={c.tip} value={c.tip} disabled={!c.disponibil}>
            {c.eticheta}{c.disponibil ? '' : ' — indisponibilă'}
          </option>
        ))}
      </Sel>

      <div className="inline-flex overflow-hidden rounded-md border" role="group" aria-label="Scop">
        {(['COMPANIE', 'RESTAURANT'] as SelectieFC['scop'][]).map(s => (
          <button key={s} type="button" data-scop={s}
            aria-pressed={sel.scop === s}
            disabled={s === 'COMPANIE' && !acces.poateVedeaCompania}
            title={s === 'COMPANIE' && !acces.poateVedeaCompania
              ? 'Rolul tău vede doar restaurantul propriu' : undefined}
            onClick={() => aplica({ scop: s })}
            className={cx('h-9 px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              sel.scop === s ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}>
            {s === 'COMPANIE' ? 'Companie' : 'Restaurant'}
          </button>
        ))}
      </div>

      <Sel aria-label="Restaurantul" data-camp="locatie" value={sel.locatie ?? ''}
        disabled={sel.scop !== 'RESTAURANT' || !!acces.locatieImpusa}
        onChange={e => aplica({ locatie: e.target.value })}>
        {sel.scop !== 'RESTAURANT' && <option value="">toată rețeaua</option>}
        {restauranteVizibile(state, acces.context).map(l => <option key={l} value={l}>{l}</option>)}
      </Sel>

      <div className="inline-flex overflow-hidden rounded-md border" role="group" aria-label="Canal">
        {CANALE.filter(c => acces.context.channelAccess.includes(c.v)).map(c => (
          <button key={c.v} type="button" data-canal={c.v}
            aria-pressed={sel.canal === c.v}
            onClick={() => aplica({ canal: c.v })}
            className={cx('h-9 px-3 text-sm font-semibold transition-colors',
              sel.canal === c.v ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}>
            {c.l}
          </button>
        ))}
      </div>

      <span className="ml-auto hidden text-[11px] text-muted-foreground xl:inline">
        Filtrele se aplică identic în toate secțiunile.
      </span>
    </div>
  );
}
