import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSel, useStore } from '../lib/store';
import { evolutieGranulara, perProdus, fmtInt, fmtLei, fmtPct, type Granularitate, type RandProdus } from '../lib/engine';
import { Gol, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';

const GRAN: { v: Granularitate; l: string }[] = [
  { v: 'ZI', l: 'Zi' }, { v: 'SAPTAMANA', l: 'Săptămână' }, { v: 'LUNA', l: 'Lună' }, { v: 'AN', l: 'An' },
];

function TabProfit() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const loc = sel.locatie === 'RETEA' ? undefined : sel.locatie;
  const [selProd, setSelProd] = useState<string | null>(null);
  const [gran, setGran] = useState<Granularitate>('ZI');

  const randuri = useMemo(() =>
    perProdus(state.vanzari, ctx, { luna: sel.luna, locatie: loc, vedere: sel.vedere })
      .sort((a, b) => b.profit - a.profit),
    [state, ctx, sel, loc]);

  const evol = useMemo(() => selProd
    ? evolutieGranulara(selProd, state.vanzari, ctx, sel.vedere, gran, loc).map(e => ({
        perioada: gran === 'ZI' ? e.perioada.slice(5) : e.perioada,
        Profit: Math.round(e.profit),
        'Marjă %': e.net > 0 ? +(((e.profit) / e.net) * 100).toFixed(1) : null,
      }))
    : [], [selProd, gran, state, ctx, sel.vedere, loc]);

  if (!randuri.length) return <Gol titlu="Nicio vânzare în selecția curentă" />;

  return (
    <div>
      <T dens>
        <thead><tr><Th>Produs</Th><Th dr>Buc</Th><Th dr>Profit unitar</Th><Th dr>Profit total</Th><Th dr>Marjă brută (lei)</Th><Th dr>Marjă %</Th><Th dr>Food Cost %</Th><Th dr>Paper Cost %</Th><Th dr>Contribuție la profit</Th><Th dr>ROI</Th></tr></thead>
        <tbody>
          {randuri.map(r => (
            <tr key={r.cod} onClick={() => setSelProd(r.cod === selProd ? null : r.cod)}
              className={cx('cursor-pointer hover:bg-muted/50', selProd === r.cod && 'bg-primary/10')}>
              <Td>{r.denumire}</Td>
              <Td dr>{fmtInt(r.buc)}</Td>
              <Td dr>{r.buc > 0 ? `${fmtLei(r.profit / r.buc)} lei` : '—'}</Td>
              <Td dr>{fmtInt(r.profit)} lei</Td>
              <Td dr>{fmtInt(r.profit)} lei</Td>
              <Td dr>{fmtPct(r.marja)}</Td>
              <Td dr>{fmtPct(r.fc)}</Td>
              <Td dr>{r.net > 0 ? fmtPct((r.costPaper / r.net) * 100) : '—'}</Td>
              <Td dr>{fmtPct(r.contributie)}</Td>
              <Td dr className={r.roi != null && r.roi >= 300 ? 'text-ok font-semibold' : ''}>{fmtPct(r.roi, 0)}</Td>
            </tr>
          ))}
        </tbody>
      </T>
      <p className="mt-1.5 text-xs text-muted-foreground">
        ROI = profitul adus de fiecare leu investit în Food & Paper (profit ÷ cost). Marja brută în lei = profitul brut. Click pe produs pentru evoluție.
      </p>

      {selProd && (
        <div className="mt-4">
          <Titlu actiuni={
            <Sel value={gran} onChange={e => setGran(e.target.value as Granularitate)}>
              {GRAN.map(g => <option key={g.v} value={g.v}>pe {g.l.toLowerCase()}</option>)}
            </Sel>
          }>
            {state.produse.find(p => p.cod === selProd)?.denumire} — evoluția profitului ({GRAN.find(g => g.v === gran)?.l.toLowerCase()})
          </Titlu>
          <div className="h-64 rounded-md border bg-card p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evol} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
                <XAxis dataKey="perioada" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="lei" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="lei" type="monotone" dataKey="Profit" stroke="#1E7F4F" strokeWidth={2.5} dot={gran !== 'ZI'} />
                <Line yAxisId="pct" type="monotone" dataKey="Marjă %" stroke="#B97A0A" strokeWidth={2} dot={gran !== 'ZI'} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Evoluția acoperă tot istoricul PMIX din aplicație, pe vederea globală selectată (canal & locație).</p>
        </div>
      )}
    </div>
  );
}

function Bara({ pct, culoare }: { pct: number; culoare: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded bg-muted">
        <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: culoare }} />
      </div>
      <span className="num text-xs">{fmtPct(pct)}</span>
    </div>
  );
}

type CheieContrib = 'mix' | 'contributie' | 'mixCost' | 'mixFood';

function TabContributie() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const loc = sel.locatie === 'RETEA' ? undefined : sel.locatie;
  const [dupa, setDupa] = useState<CheieContrib>('contributie');

  const randuri = useMemo(() =>
    perProdus(state.vanzari, ctx, { luna: sel.luna, locatie: loc, vedere: sel.vedere })
      .sort((a, b) => (b[dupa] ?? 0) - (a[dupa] ?? 0)),
    [state, ctx, sel, loc, dupa]);

  if (!randuri.length) return <Gol titlu="Nicio vânzare în selecția curentă" />;

  const col = (c: CheieContrib, titlu: string) => (
    <Th dr><button className={cx(dupa === c && 'text-foreground')} onClick={() => setDupa(c)}>{titlu}{dupa === c ? ' ↓' : ''}</button></Th>
  );

  return (
    <div>
      <T dens>
        <thead><tr><Th>#</Th><Th>Produs</Th>{col('mix', '% din vânzări')}{col('contributie', '% din profit')}{col('mixCost', '% din Food Cost')}{col('mixFood', '% din costul ingredientelor')}</tr></thead>
        <tbody>
          {randuri.map((r: RandProdus, i) => (
            <tr key={r.cod}>
              <Td className="num text-muted-foreground">{i + 1}</Td>
              <Td>{r.denumire}</Td>
              <Td dr><Bara pct={r.mix} culoare="#B97A0A" /></Td>
              <Td dr><Bara pct={r.contributie} culoare="#1E7F4F" /></Td>
              <Td dr><Bara pct={r.mixCost} culoare="#C6373C" /></Td>
              <Td dr><Bara pct={r.mixFood} culoare="#8A5A00" /></Td>
            </tr>
          ))}
        </tbody>
      </T>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Clasamentul se reordonează la click pe coloană. Un produs sănătos are % din profit ≥ % din Food Cost; inversul semnalează un consumator de cost. „% din costul ingredientelor" = doar partea Food (fără ambalaje).
      </p>
    </div>
  );
}

export default function ProfitIntelligence() {
  const [tab, setTab] = useState<'profit' | 'contrib'>('profit');
  return (
    <div>
      <Titlu>Profit Intelligence</Titlu>
      <div className="mb-4 flex flex-wrap gap-1 rounded-md border bg-card p-1">
        {([['profit', 'Profit & ROI'], ['contrib', 'Product Contribution']] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cx('rounded px-3 py-1.5 text-sm font-semibold', tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{l}</button>
        ))}
      </div>
      {tab === 'profit' ? <TabProfit /> : <TabContributie />}
    </div>
  );
}
