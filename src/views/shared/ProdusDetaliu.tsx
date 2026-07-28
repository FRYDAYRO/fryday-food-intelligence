import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSel, useStore } from '../../lib/store';
import {
  cantBruta, costLinieLa, costProdus, evolutieProdus, kpiProdus, perProdus, versiuneActiva,
  fmtInt, fmtLei, fmtPct,
} from '../../lib/engine';
import { Gol, Insigna, T, Td, Th, Titlu } from '../../lib/ui';

const KpiMic = ({ e, v, s }: { e: string; v: string; s?: string }) => (
  <div className="rounded-md border bg-card px-3 py-2.5">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{e}</div>
    <div className="num mt-0.5 text-lg font-semibold">{v}</div>
    {s && <div className="text-xs text-muted-foreground">{s}</div>}
  </div>
);

export default function ProdusDetaliu({ cod }: { cod: string }) {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const produs = state.produse.find(p => p.cod === cod);
  const loc = sel.locatie === 'RETEA' ? undefined : sel.locatie;

  const rand = useMemo(() => perProdus(state.vanzari, ctx, { luna: sel.luna, locatie: loc, vedere: sel.vedere })
    .find(r => r.cod === cod), [state, ctx, sel, loc, cod]);
  const evol = useMemo(() => evolutieProdus(cod, state.vanzari, ctx, sel.vedere, loc).map(e => ({
    luna: e.luna, 'FC %': e.fc != null ? +e.fc.toFixed(2) : null, Profit: Math.round(e.profit),
  })), [cod, state, ctx, sel.vedere, loc]);

  const reteta = state.retete.find(r => r.cod === cod);
  const vAct = reteta ? versiuneActiva(reteta) : null;
  const eticheta = sel.vedere === 'TOTAL' ? 'Total' : sel.vedere === 'INSTORE' ? 'InStore' : 'Delivery';
  const costIn = costProdus(cod, 'INSTORE', ctx, '9999-12-31');
  const costDlv = costProdus(cod, 'DELIVERY', ctx, '9999-12-31');

  if (!produs) return <Gol titlu="Produs inexistent" />;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiMic e="Bucăți vândute" v={fmtInt(rand?.buc ?? 0)} s={`${sel.luna} · ${eticheta}`} />
        <KpiMic e="Valoare vânzări" v={`${fmtInt(rand?.net ?? 0)} lei`} s="net, fără TVA" />
        <KpiMic e="Food Cost %" v={fmtPct(rand?.fc ?? null)} s={`cost total ${fmtInt(rand?.cost ?? 0)} lei`} />
        <KpiMic e="Profit" v={`${fmtInt(rand?.profit ?? 0)} lei`} s={`marjă ${fmtPct(rand?.marja ?? null)}`} />
        <KpiMic e="Cost/porție InStore" v={`${fmtLei(costIn?.total)} lei`} s={`Food ${fmtLei(costIn?.food)} + Paper ${fmtLei(costIn?.paper)}`} />
        <KpiMic e="Cost/porție Delivery" v={`${fmtLei(costDlv?.total)} lei`} s={`Food ${fmtLei(costDlv?.food)} + Paper ${fmtLei(costDlv?.paper)}`} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div>
          <Titlu>Rețetarul complet & costul ingredientelor</Titlu>
          {vAct ? (
            <>
              <T dens>
                <thead><tr><Th>Componentă</Th><Th>Tip</Th><Th dr>Cant. (brută)</Th><Th>Canal</Th><Th dr>Cost InStore</Th><Th dr>Cost Delivery</Th><Th dr>% din cost</Th></tr></thead>
                <tbody>
                  {vAct.linii.map((l, i) => {
                    const c = costLinieLa(l, ctx);
                    const inLine = l.canal !== 'DELIVERY' ? c.total : null;
                    const dlvLine = l.canal !== 'INSTORE' ? c.total : null;
                    const nume = state.ingrediente.find(x => x.cod === l.comp)?.denumire ?? state.retete.find(x => x.cod === l.comp)?.denumire ?? l.comp;
                    const pct = costIn?.total ? ((inLine ?? 0) / costIn.total) * 100 : null;
                    return (
                      <tr key={i}>
                        <Td>{nume}</Td>
                        <Td>{l.tipComp === 'AMBALAJ' ? <Insigna fel="PAPER">Paper</Insigna> : l.tipComp === 'SEMIPREPARAT' ? <Insigna fel="info">SP</Insigna> : <Insigna fel="FOOD">Food</Insigna>}</Td>
                        <Td dr>{+cantBruta(l).toFixed(2)} {l.um}{l.pierdere ? ` (${l.cant} net, ${l.pierdere}% pierdere)` : ''}</Td>
                        <Td>{l.canal === 'AMBELE' ? 'Ambele' : l.canal === 'INSTORE' ? 'InStore' : 'Delivery'}</Td>
                        <Td dr>{inLine != null ? fmtLei(inLine) : '—'}</Td>
                        <Td dr>{dlvLine != null ? fmtLei(dlvLine) : '—'}</Td>
                        <Td dr>{pct != null && inLine != null ? fmtPct(pct) : '—'}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </T>
              <p className="mt-1.5 text-xs text-muted-foreground">Versiunea activă v{reteta!.activa} ({vAct.data}). Costurile liniilor sunt la prețurile curente ale ingredientelor.</p>
            </>
          ) : produs.tip === 'COMBO' ? (
            <T dens>
              <thead><tr><Th>Componentă combo</Th><Th dr>Cant.</Th><Th dr>Cost InStore</Th><Th dr>Cost Delivery</Th></tr></thead>
              <tbody>
                {produs.combo?.map(c => {
                  const ci = costProdus(c.cod, 'INSTORE', ctx, '9999-12-31');
                  const cd = costProdus(c.cod, 'DELIVERY', ctx, '9999-12-31');
                  return (
                    <tr key={c.cod}>
                      <Td>{state.produse.find(p => p.cod === c.cod)?.denumire ?? c.cod}</Td>
                      <Td dr>{c.cant}</Td>
                      <Td dr>{fmtLei((ci?.total ?? 0) * c.cant)}</Td>
                      <Td dr>{fmtLei((cd?.total ?? 0) * c.cant)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </T>
          ) : <Gol titlu="Produsul nu are rețetă" sub="Adaugă rețeta în modulul Rețetar sau importă rețetarul." />}
        </div>

        <div>
          <Titlu>Evoluția în timp ({eticheta})</Titlu>
          <div className="h-64 rounded-md border bg-card p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evol} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
                <XAxis dataKey="luna" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="fc" tick={{ fontSize: 11 }} unit="%" />
                <YAxis yAxisId="lei" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="fc" type="monotone" dataKey="FC %" stroke="#C6373C" strokeWidth={2.5} dot />
                <Line yAxisId="lei" type="monotone" dataKey="Profit" stroke="#1E7F4F" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <T>
            <thead><tr><Th>Canal</Th><Th dr>Preț brut</Th><Th dr>Preț net</Th><Th dr>FC %</Th><Th dr>Profit/buc</Th><Th dr>Marjă</Th></tr></thead>
            <tbody>
              {(['INSTORE', 'DELIVERY'] as const).map(c => {
                const k = kpiProdus(cod, c, ctx);
                const brut = c === 'INSTORE' ? produs.pretInstore : produs.pretDelivery;
                return (
                  <tr key={c}>
                    <Td>{c === 'INSTORE' ? 'InStore' : 'Delivery'}</Td>
                    <Td dr>{fmtLei(brut)}</Td>
                    <Td dr>{fmtLei(k?.net ?? null)}</Td>
                    <Td dr>{fmtPct(k?.fc ?? null)}</Td>
                    <Td dr>{fmtLei(k?.profit ?? null)}</Td>
                    <Td dr>{fmtPct(k?.marja ?? null)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </T>
        </div>
      </div>
    </>
  );
}
