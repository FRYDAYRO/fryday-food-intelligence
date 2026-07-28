import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { useSel, useStore } from '../lib/store';
import { menuEngineering, perProdus, fmtInt, fmtLei, fmtPct, type ClasaME, type RandME } from '../lib/engine';
import { Gol, Insigna, T, Td, Th, Titlu } from '../lib/ui';

const META: Record<ClasaME, { nume: string; culoare: string; fel: 'ok' | 'FOOD' | 'info' | 'EXCLUS' }> = {
  STAR: { nume: 'Star', culoare: '#1E7F4F', fel: 'ok' },
  PLOWHORSE: { nume: 'Plowhorse', culoare: '#B97A0A', fel: 'FOOD' },
  PUZZLE: { nume: 'Puzzle', culoare: '#2563A6', fel: 'info' },
  DOG: { nume: 'Dog', culoare: '#C6373C', fel: 'EXCLUS' },
};

function Recomandare({ titlu, sub, randuri, motiv }: { titlu: string; sub: string; randuri: RandME[]; motiv: (r: RandME) => string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="font-display text-sm font-extrabold">{titlu}</div>
      <div className="mb-2 text-xs text-muted-foreground">{sub}</div>
      {randuri.length === 0 ? <div className="text-sm text-muted-foreground">Nimic aici — bun semn.</div> : (
        <ul className="space-y-1.5">
          {randuri.map(r => (
            <li key={r.cod} className="text-sm">
              <b>{r.denumire}</b> <span className="text-muted-foreground">— {motiv(r)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MenuEngineering() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const loc = sel.locatie === 'RETEA' ? undefined : sel.locatie;

  const me = useMemo(() => {
    const rows = perProdus(state.vanzari, ctx, { luna: sel.luna, locatie: loc, vedere: sel.vedere });
    return menuEngineering(rows);
  }, [state, ctx, sel, loc]);

  const eticheta = sel.vedere === 'TOTAL' ? 'Total' : sel.vedere === 'INSTORE' ? 'InStore' : 'Delivery';

  if (!me.randuri.length) return <div><Titlu>Menu Engineering</Titlu><Gol titlu="Nicio vânzare cu rețetă în selecția curentă" /></div>;

  const stars = me.randuri.filter(r => r.clasa === 'STAR');
  const puzzles = me.randuri.filter(r => r.clasa === 'PUZZLE');
  const plow = me.randuri.filter(r => r.clasa === 'PLOWHORSE');
  const dogs = me.randuri.filter(r => r.clasa === 'DOG');
  const tinta = state.tinte.find(t => t.locatie === 'RETEA')?.fcCurat ?? null;
  const fcPeste = tinta != null ? me.randuri.filter(r => r.fc != null && r.fc > tinta).sort((a, b) => (b.fc ?? 0) - (a.fc ?? 0)) : [];
  const marjaMedie = me.randuri.reduce((s2, r) => s2 + r.profit, 0) / Math.max(1, me.randuri.reduce((s2, r) => s2 + r.net, 0)) * 100;
  const marjaScazuta = me.randuri.filter(r => r.marja != null && r.marja < marjaMedie - 5).sort((a, b) => (a.marja ?? 0) - (b.marja ?? 0));
  const reformulare = me.randuri.filter(r => (r.clasa === 'DOG' || r.clasa === 'PLOWHORSE') && tinta != null && r.fc != null && r.fc > tinta);
  const optimizare = plow.filter(r => !reformulare.some(x => x.cod === r.cod));

  const date = me.randuri.map(r => ({ ...r, x: +r.mixBuc.toFixed(2), y: +r.profitUnitar.toFixed(2) }));

  return (
    <div>
      <Titlu>Menu Engineering — {sel.luna} · {eticheta}{loc ? ` · ${state.locatii.find(l => l.cod === loc)?.nume}` : ' · rețea'}</Titlu>
      <p className="mb-3 text-sm text-muted-foreground">
        Clasificare pe două axe: <b>popularitate</b> (mixul de bucăți vândute, prag {fmtPct(me.pragPop)} = regula 70%/n) ×{' '}
        <b>profitabilitate</b> (contribuția lei/porție față de media ponderată de {fmtLei(me.cmMediu)} lei).
      </p>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="rounded-md border bg-card p-3">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: -6 }}>
                <XAxis type="number" dataKey="x" name="Popularitate" unit="%" tick={{ fontSize: 11 }}
                  label={{ value: 'Popularitate (mix bucăți %)', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                <YAxis type="number" dataKey="y" name="Contribuție" unit=" lei" tick={{ fontSize: 11 }}
                  label={{ value: 'Profit / porție (lei)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    const p = payload?.[0]?.payload as (RandME & { x: number; y: number }) | undefined;
                    if (!p) return null;
                    return (
                      <div className="rounded border bg-card px-2 py-1.5 text-xs shadow">
                        <b>{p.denumire}</b> · {META[p.clasa].nume}<br />
                        mix {fmtPct(p.mixBuc)} · {fmtLei(p.profitUnitar)} lei/buc · {fmtInt(p.buc)} buc
                      </div>
                    );
                  }} />
                <ReferenceLine x={+me.pragPop.toFixed(2)} stroke="#8A8173" strokeDasharray="4 4" />
                <ReferenceLine y={+me.cmMediu.toFixed(2)} stroke="#8A8173" strokeDasharray="4 4" />
                <Scatter data={date}>
                  {date.map(d => <Cell key={d.cod} fill={META[d.clasa].culoare} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(Object.keys(META) as ClasaME[]).map(c => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: META[c].culoare }} />
                {META[c].nume} ({me.randuri.filter(r => r.clasa === c).length})
              </span>
            ))}
          </div>
        </div>

        <T dens>
          <thead><tr><Th>Produs</Th><Th dr>Mix buc</Th><Th dr>Lei/porție</Th><Th dr>FC %</Th><Th>Clasă</Th></tr></thead>
          <tbody>
            {me.randuri.map(r => (
              <tr key={r.cod}>
                <Td>{r.denumire}</Td>
                <Td dr>{fmtPct(r.mixBuc)}</Td>
                <Td dr>{fmtLei(r.profitUnitar)}</Td>
                <Td dr>{fmtPct(r.fc)}</Td>
                <Td><Insigna fel={META[r.clasa].fel}>{META[r.clasa].nume}</Insigna></Td>
              </tr>
            ))}
          </tbody>
        </T>
      </div>

      <Titlu>Recomandări automate</Titlu>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Recomandare titlu="De promovat" sub="Stars & Puzzles — profit peste medie"
          randuri={[...stars, ...puzzles]}
          motiv={r => r.clasa === 'STAR'
            ? `star al meniului (${fmtPct(r.mixBuc)} din bucăți, ${fmtLei(r.profitUnitar)} lei/porție) — menține vizibilitatea maximă`
            : `profitabil (${fmtLei(r.profitUnitar)} lei/porție), dar puțin vândut — poziționare mai bună în meniu, bundling, recomandare la casă`} />
        <Recomandare titlu="De optimizat" sub="Plowhorses cu rețeta în regulă — problema e contribuția"
          randuri={optimizare}
          motiv={r => `se vinde mult (${fmtPct(r.mixBuc)} din bucăți), dar aduce doar ${fmtLei(r.profitUnitar)} lei/porție — gramaj, bundling sau preț în Product Impact`} />
        <Recomandare titlu="De reformulat" sub="Rețeta e problema — Food Cost peste țintă"
          randuri={reformulare}
          motiv={r => `FC ${fmtPct(r.fc)} peste ținta de ${fmtPct(tinta)} — reconstruiește rețeta în R&D Lab sau schimbă furnizorul ingredientelor scumpe`} />
        <Recomandare titlu="De analizat pentru eliminare" sub="Dogs — nepopulari și neprofitabili"
          randuri={dogs}
          motiv={r => `doar ${fmtPct(r.mixBuc)} din bucăți și ${fmtLei(r.profitUnitar)} lei/porție — retragere sau înlocuire în meniu`} />
        <Recomandare titlu="Food Cost peste target" sub={`ținta rețelei: ${fmtPct(tinta)}`}
          randuri={fcPeste}
          motiv={r => `FC ${fmtPct(r.fc)} — cu ${fmtPct((r.fc ?? 0) - (tinta ?? 0))} peste țintă`} />
        <Recomandare titlu="Marjă scăzută" sub={`sub media rețelei (${fmtPct(marjaMedie)}) cu peste 5 pp`}
          randuri={marjaScazuta}
          motiv={r => `marjă ${fmtPct(r.marja)} față de media de ${fmtPct(marjaMedie)}`} />
      </div>
    </div>
  );
}
