import { useMemo } from 'react';
import { useSel, useStore } from '../lib/store';
import { perProdus, fmtInt, fmtPct, type RandProdus } from '../lib/engine';
import { Gol, Titlu } from '../lib/ui';
import type { Vedere } from '../lib/types';

function Top({ titlu, randuri, valoare, format, nota }: {
  titlu: string; randuri: RandProdus[];
  valoare: (r: RandProdus) => number | null;
  format: (n: number) => string; nota?: string;
}) {
  const date = randuri
    .map(r => ({ r, v: valoare(r) }))
    .filter((x): x is { r: RandProdus; v: number } => x.v != null)
    .sort((a, b) => b.v - a.v)
    .slice(0, 8);
  const max = Math.max(...date.map(d => Math.abs(d.v)), 1);
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-display text-sm font-extrabold">{titlu}</div>
        {nota && <div className="text-[11px] text-muted-foreground">{nota}</div>}
      </div>
      <div className="space-y-1.5">
        {date.map((d, i) => (
          <div key={d.r.cod} className="relative overflow-hidden rounded">
            <div className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${(Math.abs(d.v) / max) * 100}%` }} />
            <div className="relative flex items-center justify-between px-2 py-1 text-sm">
              <span className="truncate"><span className="num mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>{d.r.denumire}</span>
              <span className="num ml-2 shrink-0 font-semibold">{format(d.v)}</span>
            </div>
          </div>
        ))}
        {date.length === 0 && <div className="text-sm text-muted-foreground">Fără date.</div>}
      </div>
    </div>
  );
}

export default function Topuri() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const loc = sel.locatie === 'RETEA' ? undefined : sel.locatie;

  const pe = (vedere: Vedere) => perProdus(state.vanzari, ctx, { luna: sel.luna, locatie: loc, vedere });
  const total = useMemo(() => pe('TOTAL'), [state, ctx, sel.luna, loc]);      // eslint-disable-line react-hooks/exhaustive-deps
  const instore = useMemo(() => pe('INSTORE'), [state, ctx, sel.luna, loc]);  // eslint-disable-line react-hooks/exhaustive-deps
  const delivery = useMemo(() => pe('DELIVERY'), [state, ctx, sel.luna, loc]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!total.length) return <div><Titlu>Topuri produse</Titlu><Gol titlu="Nicio vânzare în perioada selectată" /></div>;

  return (
    <div>
      <Titlu>Topuri produse — {sel.luna}{loc ? ` · ${state.locatii.find(l => l.cod === loc)?.nume}` : ' · rețea'}</Titlu>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Top titlu="Top vânzări" nota="lei net, Total" randuri={total} valoare={r => r.net} format={n => `${fmtInt(n)} lei`} />
        <Top titlu="Top profit" nota="lei, Total" randuri={total} valoare={r => r.profit} format={n => `${fmtInt(n)} lei`} />
        <Top titlu="Top Food Cost %" nota="cele mai scumpe rețete" randuri={total} valoare={r => r.fc} format={n => fmtPct(n)} />
        <Top titlu="Top marjă %" nota="Total" randuri={total} valoare={r => r.marja} format={n => fmtPct(n)} />
        <Top titlu="Top InStore" nota="lei net" randuri={instore} valoare={r => r.net} format={n => `${fmtInt(n)} lei`} />
        <Top titlu="Top Delivery" nota="lei net" randuri={delivery} valoare={r => r.net} format={n => `${fmtInt(n)} lei`} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Topurile se recalculează automat din PMIX la fiecare import, pe vederea Total / InStore / Delivery. Bara indică valoarea relativă față de liderul topului.</p>
    </div>
  );
}
