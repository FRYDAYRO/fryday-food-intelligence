import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useSel, useStore } from '../../lib/store';
import { scaraPret } from '../../lib/decizii';
import { fmtInt, fmtLei, fmtPct } from '../../lib/engine';
import { Camp, Gol, Insigna, Sel, T, Td, Th, cx } from '../../lib/ui';

export default function DynamicPricing() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const [cod, setCod] = useState(state.produse[0]?.cod ?? '');
  const [canal, setCanal] = useState<'INSTORE' | 'DELIVERY'>('INSTORE');

  const rez = useMemo(() => scaraPret(state, ctx, cod, canal, sel.luna), [state, ctx, cod, canal, sel.luna]);
  const tinta = state.tinte.find(t => t.locatie === 'RETEA')?.fcCurat ?? null;
  const p = state.produse.find(x => x.cod === cod);

  if (!rez || !p) return <Gol titlu="Produsul nu are preț pe canalul selectat" />;

  const date = rez.pasi.map(x => ({
    eticheta: `${x.variatiePct > 0 ? '+' : ''}${x.variatiePct}%`,
    pret: x.pretBrut, Profit: Math.round(x.profitLunar), fc: x.fc, curent: x.curent,
  }));

  return (
    <div>
      <div className="rounded-md border bg-card p-4">
        <div className="grid items-end gap-2 md:grid-cols-4">
          <Camp eticheta="Produs">
            <Sel value={cod} onChange={e => setCod(e.target.value)}>
              {state.produse.map(x => <option key={x.cod} value={x.cod}>{x.denumire}</option>)}
            </Sel>
          </Camp>
          <Camp eticheta="Canal">
            <Sel value={canal} onChange={e => setCanal(e.target.value as 'INSTORE' | 'DELIVERY')}>
              <option value="INSTORE">InStore</option><option value="DELIVERY">Delivery</option>
            </Sel>
          </Camp>
          <div className="pb-1 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Volum PMIX ({sel.luna})</div>
            <div className="num font-semibold">{fmtInt(rez.buc)} buc/lună</div>
          </div>
          {rez.pretTinta != null && tinta != null && (
            <div className="pb-1 text-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preț pentru ținta de {fmtPct(tinta)}</div>
              <div className="num font-semibold">{fmtLei(rez.pretTinta)} lei</div>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Scara de prețuri recalculează instant Food Cost %, profitul unitar, marja și profitul lunar/anual, la volum constant. Elasticitatea se testează în Promo Analyzer.
        </p>
      </div>

      <div className="mt-4 h-56 rounded-md border bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={date} margin={{ top: 8, right: 12, bottom: 0, left: -6 }}>
            <XAxis dataKey="eticheta" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={({ payload }) => {
              const d = payload?.[0]?.payload as (typeof date)[0] | undefined;
              if (!d) return null;
              return (
                <div className="rounded border bg-card px-2 py-1.5 text-xs shadow">
                  <b>{fmtLei(d.pret)} lei</b> ({d.eticheta})<br />FC {fmtPct(d.fc)} · profit {fmtInt(d.Profit)} lei/lună
                </div>
              );
            }} />
            <ReferenceLine y={0} stroke="#8A8173" />
            <Bar dataKey="Profit" radius={[3, 3, 0, 0]}>
              {date.map((d, i) => <Cell key={i} fill={d.curent ? '#241F19' : '#1E7F4F'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <T dens>
        <thead><tr><Th>Variație</Th><Th dr>Preț brut</Th><Th dr>Preț net</Th><Th dr>Food Cost %</Th><Th dr>Profit unitar</Th><Th dr>Marjă</Th><Th dr>Profit lunar</Th><Th dr>Δ lunar</Th><Th dr>Δ anual</Th></tr></thead>
        <tbody>
          {rez.pasi.map(x => (
            <tr key={x.variatiePct} className={x.curent ? 'bg-primary/10 font-semibold' : ''}>
              <Td>{x.variatiePct > 0 ? '+' : ''}{x.variatiePct}%{x.curent && <span className="ml-1.5"><Insigna fel="info">preț actual</Insigna></span>}
                {tinta != null && x.fc != null && x.fc <= tinta && !x.curent && <span className="ml-1.5"><Insigna fel="ok">în țintă</Insigna></span>}
              </Td>
              <Td dr>{fmtLei(x.pretBrut)}</Td>
              <Td dr>{fmtLei(x.pretNet)}</Td>
              <Td dr className={tinta != null && x.fc != null && x.fc > tinta ? 'text-danger' : ''}>{fmtPct(x.fc)}</Td>
              <Td dr>{fmtLei(x.profitUnitar)}</Td>
              <Td dr>{fmtPct(x.marja)}</Td>
              <Td dr>{fmtInt(x.profitLunar)}</Td>
              <Td dr className={cx(x.dProfitLunar > 0 ? 'text-ok font-semibold' : x.dProfitLunar < 0 ? 'text-danger' : '')}>
                {x.curent ? '—' : `${x.dProfitLunar >= 0 ? '+' : ''}${fmtInt(x.dProfitLunar)}`}
              </Td>
              <Td dr>{x.curent ? '—' : `${x.dProfitAnual >= 0 ? '+' : ''}${fmtInt(x.dProfitAnual)}`}</Td>
            </tr>
          ))}
        </tbody>
      </T>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Prețurile sunt rotunjite la 10 bani. Δ se raportează la prețul actual, pe {fmtInt(rez.buc)} bucăți/lună din PMIX — pentru impactul consolidat pe rețea (ambele canale) folosește Price Change Analyzer.
      </p>
    </div>
  );
}
