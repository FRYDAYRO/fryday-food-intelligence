import { useMemo, useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useSel, useStore } from '../lib/store';
import { dosarProdus, type Eveniment } from '../lib/timeline';
import { ETAPA_LABEL } from '../lib/decizii';
import { fmtInt, fmtLei, fmtPct, fmtPP } from '../lib/engine';
import { Gol, Insigna, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';

const EV: Record<Eveniment['tip'], { l: string; fel: 'ok' | 'info' | 'FOOD' | 'warn' | 'EXCLUS'; punct: string }> = {
  LANSARE: { l: 'Lansare', fel: 'ok', punct: '#1E7F4F' },
  RETETA: { l: 'Rețetă', fel: 'info', punct: '#2563A6' },
  PRET: { l: 'Preț', fel: 'FOOD', punct: '#B97A0A' },
  COST_INGREDIENT: { l: 'Cost ingredient', fel: 'warn', punct: '#C6373C' },
  SCENARIU: { l: 'Simulare aplicată', fel: 'EXCLUS', punct: '#6B4E9E' },
};

export default function ProductTimeline() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const [cod, setCod] = useState(state.produse[0]?.cod ?? '');
  const d = useMemo(() => (cod ? dosarProdus(state, ctx, cod, sel.luna) : null), [cod, state, ctx, sel.luna]);

  if (!d) return <Gol titlu="Niciun produs" />;

  const grafic = d.serie.map(s => ({
    perioada: s.perioada.replace(/^\d{4}-/, ''),
    'Profit (lei)': Math.round(s.profit),
    'FC %': s.fc != null ? +s.fc.toFixed(1) : null,
    Bucăți: s.buc,
  }));
  const tr = d.traiectorie;
  const felTraiectorie = tr.directie === 'IMBUNATATIRE' ? 'ok' : tr.directie === 'DEGRADARE' ? 'EXCLUS' : 'info';

  return (
    <div>
      <Titlu actiuni={
        <Sel value={cod} onChange={e => setCod(e.target.value)}>
          {state.produse.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
        </Sel>
      }>Product Timeline</Titlu>

      {/* antet: scor, etapă, traiectorie, proiecție */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product Score</div>
          <div className="num mt-0.5 text-2xl font-bold">{d.health ? d.health.scor.toFixed(0) : '—'}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
          {d.health && <div className="text-xs text-muted-foreground">
            FC {fmtPct(d.health.fc)} · marjă {fmtPct(d.health.marja)} · {fmtInt(d.health.buc)} buc
          </div>}
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Etapa de viață</div>
          <div className="mt-0.5 text-lg font-semibold">{ETAPA_LABEL[d.etapa]}</div>
          <div className="text-xs text-muted-foreground">{d.serie.length} săptămâni de vânzări</div>
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Traiectorie</div>
          <div className="mt-0.5"><Insigna fel={felTraiectorie}>
            {tr.directie === 'IMBUNATATIRE' ? 'se îmbunătățește' : tr.directie === 'DEGRADARE' ? 'se degradează' : 'stabil'}
          </Insigna></div>
          <div className="num mt-1 text-xs text-muted-foreground">
            {tr.pantaProfitUnitar >= 0 ? '+' : ''}{fmtLei(tr.pantaProfitUnitar)} lei/porție pe săptămână
          </div>
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Profit estimat, următoarele 4 săptămâni</div>
          {d.proiectie ? <>
            <div className="num mt-0.5 text-lg font-semibold">{fmtInt(d.proiectie.proiectie4Saptamani)} lei</div>
            <div className="num text-xs text-muted-foreground">
              interval {fmtInt(d.proiectie.interval.min)}–{fmtInt(d.proiectie.interval.max)} · încredere {d.proiectie.incredere === 'RIDICATA' ? 'ridicată' : d.proiectie.incredere === 'MEDIE' ? 'medie' : 'scăzută'}
            </div>
          </> : <div className="mt-0.5 text-sm text-muted-foreground">istoric insuficient</div>}
        </div>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{tr.dovada}</p>
      {d.proiectie && <p className="mt-1 text-xs text-muted-foreground"><b>Metoda proiecției:</b> {d.proiectie.metoda}</p>}

      {/* evoluția */}
      <Titlu>Evoluția săptămânală</Titlu>
      <div className="h-72 rounded-md border bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={grafic} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <XAxis dataKey="perioada" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="lei" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 11 }} unit="%" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {d.health?.fc != null && <ReferenceLine yAxisId="pct" y={state.tinte.find(t => t.locatie === 'RETEA')?.fcCurat ?? 21} stroke="#1E7F4F" strokeDasharray="4 4" />}
            <Bar yAxisId="lei" dataKey="Profit (lei)" fill="#E8DFD0" radius={[3, 3, 0, 0]} />
            <Line yAxisId="pct" type="monotone" dataKey="FC %" stroke="#C6373C" strokeWidth={2.5} dot />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* cronologia */}
      <Titlu>Cronologia produsului — de la lansare până azi</Titlu>
      <div className="relative border-l-2 border-muted pl-5">
        {d.evenimente.map((e, i) => {
          const cmp = d.comparatii.find(c => c.ev.data === e.data && c.ev.titlu === e.titlu)?.cmp;
          return (
            <div key={i} className="relative pb-4">
              <span className="absolute -left-[26px] top-1.5 h-3 w-3 rounded-full border-2 border-card" style={{ background: EV[e.tip].punct }} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="num text-xs text-muted-foreground">{e.data}</span>
                <Insigna fel={EV[e.tip].fel}>{EV[e.tip].l}</Insigna>
                <span className="font-semibold">{e.titlu}</span>
                {e.costPortie != null && <span className="num text-xs text-muted-foreground">cost porție {fmtLei(e.costPortie)} lei</span>}
                {!e.inFereastra && e.tip !== 'LANSARE' && <span className="text-xs text-muted-foreground">(în afara perioadei cu vânzări)</span>}
              </div>
              <div className="text-sm text-muted-foreground">{e.detaliu}</div>

              {cmp && (
                <div className={cx('mt-2 rounded border-l-4 bg-muted/30 p-3 text-sm',
                  cmp.verdict === 'IMBUNATATIRE' ? 'border-l-ok' : cmp.verdict === 'DEGRADARE' ? 'border-l-danger' : 'border-l-muted')}>
                  <div className="flex flex-wrap items-center gap-2">
                    <b>Performanța înainte vs după</b>
                    <Insigna fel={cmp.verdict === 'IMBUNATATIRE' ? 'ok' : cmp.verdict === 'DEGRADARE' ? 'EXCLUS' : 'info'}>
                      {cmp.verdict === 'IMBUNATATIRE' ? 'îmbunătățire' : cmp.verdict === 'DEGRADARE' ? 'degradare' : 'neutru'}
                    </Insigna>
                    <span className={cx('num ml-auto font-semibold', cmp.dProfitLunar >= 0 ? 'text-ok' : 'text-danger')}>
                      {cmp.dProfitLunar >= 0 ? '+' : ''}{fmtInt(cmp.dProfitLunar)} lei/lună
                    </span>
                  </div>
                  <div className="mt-1 text-muted-foreground">{cmp.explicatie}</div>
                  <div className="num mt-1 grid grid-cols-2 gap-x-4 text-xs md:grid-cols-4">
                    <span>Bucăți: {fmtInt(cmp.inainte.buc)} → {fmtInt(cmp.dupa.buc)}</span>
                    <span>Cost/porție: {fmtLei(cmp.inainte.costUnitar)} → {fmtLei(cmp.dupa.costUnitar)}</span>
                    <span>FC: {fmtPct(cmp.inainte.fc)} → {fmtPct(cmp.dupa.fc)} ({fmtPP(cmp.dFcPP)})</span>
                    <span>Marjă: {fmtPct(cmp.inainte.marja)} → {fmtPct(cmp.dupa.marja)} ({fmtPP(cmp.dMarjaPP)})</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {d.comparatii.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Comparațiile înainte/după apar automat pentru evenimentele care au cel puțin 14 zile de vânzări de o parte și de alta.
        </p>
      )}

      {/* recomandări */}
      <Titlu>Recomandări pentru R&amp;D</Titlu>
      <div className="space-y-2">
        {d.recomandari.map((r, i) => (
          <div key={i} className={cx('rounded-md border bg-card p-3', r.prioritate === 'MARE' && 'border-l-4 border-l-danger')}>
            <div className="flex flex-wrap items-center gap-2">
              <Insigna fel={r.prioritate === 'MARE' ? 'EXCLUS' : r.prioritate === 'MEDIE' ? 'warn' : 'info'}>
                prioritate {r.prioritate === 'MARE' ? 'mare' : r.prioritate === 'MEDIE' ? 'medie' : 'mică'}
              </Insigna>
              <span className="font-semibold">{r.actiune}</span>
              {r.unde !== '—' && <span className="ml-auto text-xs text-muted-foreground">→ {r.unde}</span>}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{r.motiv}</div>
          </div>
        ))}
      </div>

      {/* detaliul seriei */}
      <Titlu>Detaliul săptămânal</Titlu>
      <T dens>
        <thead><tr><Th>Săptămâna</Th><Th dr>Bucăți</Th><Th dr>Vânzări nete</Th><Th dr>Cost</Th><Th dr>FC %</Th><Th dr>Profit</Th><Th dr>Profit/porție</Th><Th dr>Marjă</Th></tr></thead>
        <tbody>
          {d.serie.map(s => (
            <tr key={s.perioada}>
              <Td className="num">{s.perioada}</Td>
              <Td dr>{fmtInt(s.buc)}</Td>
              <Td dr>{fmtInt(s.net)}</Td>
              <Td dr>{fmtInt(s.cost)}</Td>
              <Td dr>{fmtPct(s.fc)}</Td>
              <Td dr>{fmtInt(s.profit)}</Td>
              <Td dr>{fmtLei(s.profitUnitar)}</Td>
              <Td dr>{fmtPct(s.marja)}</Td>
            </tr>
          ))}
        </tbody>
      </T>
    </div>
  );
}
