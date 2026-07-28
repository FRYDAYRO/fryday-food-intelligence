import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { useSel, useStore } from '../lib/store';
import { agregatePerioada, alerte, consumuriLuna, fcPerioada, menuEngineering, perProdus, pretCurent, recomandari, fmtInt, fmtLei, fmtPP, fmtPct } from '../lib/engine';
import { Gol, Kpi, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';

function Punte({ t, v, e }: { t: number; v: number; e: number }) {
  const op = t + v + e;
  if (op <= 0) return null;
  const w = (x: number) => `${Math.max(2, (x / op) * 100)}%`;
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Puntea Food Cost — de la teoretic la operațional</div>
        <div className="num text-xs text-muted-foreground">{fmtInt(op)} lei consum operațional</div>
      </div>
      <div className="flex h-9 w-full overflow-hidden rounded">
        <div style={{ width: w(t) }} className="flex items-center justify-center bg-primary/90 text-[11px] font-bold text-primary-foreground">Teoretic</div>
        <div style={{ width: w(v) }} className="flex items-center justify-center bg-danger/85 text-[11px] font-bold text-white">Variance</div>
        <div style={{ width: w(e) }} className="flex items-center justify-center bg-stone-400 text-[11px] font-bold text-white">Excluderi</div>
      </div>
      <div className="num mt-1.5 grid grid-cols-3 text-xs text-muted-foreground">
        <div>{fmtInt(t)} lei — rețetele la mixul vândut</div>
        <div className="text-center">{fmtInt(v)} lei — risipă / porționare</div>
        <div className="text-right">{fmtInt(e)} lei — uniforme & non-F&P</div>
      </div>
      <div className="mt-2 border-t pt-1.5 text-xs text-muted-foreground">
        Teoretic + Variance = <b>Food Cost Curat</b> · Curat + Excluderi = Food Cost operațional
      </div>
    </div>
  );
}

const ROLURI = ['CEO', 'Director General', 'Director Operațional', 'R&D', 'Achiziții'] as const;
type Rol = (typeof ROLURI)[number];

export default function Dashboard() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const [rol, setRol] = useState<Rol>('CEO');
  const exec = rol === 'CEO' || rol === 'Director General';
  const ops = rol === 'Director Operațional';
  const rnd = rol === 'R&D';
  const achiz = rol === 'Achiziții';

  const fc = useMemo(() => fcPerioada(state, ctx, sel.luna, sel.locatie), [state, ctx, sel.luna, sel.locatie]);
  const loc = sel.locatie === 'RETEA' ? undefined : sel.locatie;

  const canale = useMemo(() => (['INSTORE', 'DELIVERY', 'TOTAL'] as const).map(v => ({
    v, ...agregatePerioada(state.vanzari, ctx, { luna: sel.luna, locatie: loc, vedere: v }),
  })), [state, ctx, sel.luna, loc]);

  const luni = useMemo(() => [...new Set(state.vanzari.map(v => v.data.slice(0, 7)))].sort(), [state.vanzari]);
  const trend = useMemo(() => luni.map(l => {
    const r = fcPerioada(state, ctx, l, sel.locatie);
    return {
      luna: l,
      'FC Curat': r.fcCurat != null ? +r.fcCurat.toFixed(2) : null,
      'FC teoretic': r.fcTeoretic != null ? +r.fcTeoretic.toFixed(2) : null,
      'Profit (lei)': Math.round(r.profitEstimat ?? (r.net - r.costTeoretic)),
    };
  }), [luni, state, ctx, sel.locatie]);

  const locatiiFc = useMemo(() => state.locatii.map(l => fcPerioada(state, ctx, sel.luna, l.cod)), [state, ctx, sel.luna]);

  const produse = useMemo(() => perProdus(state.vanzari, ctx, { luna: sel.luna, locatie: loc, vedere: sel.vedere }), [state, ctx, sel.luna, sel.vedere, loc]);
  const topProfit = useMemo(() => [...produse].sort((a, b) => b.profit - a.profit).slice(0, 5), [produse]);
  const bottomProfit = useMemo(() => [...produse].filter(p => p.buc > 0).sort((a, b) => a.profit - b.profit).slice(0, 5), [produse]);
  const categorii = useMemo(() => {
    const m = new Map<string, { net: number; cost: number; profit: number }>();
    for (const p of produse) {
      const c = m.get(p.categorie) ?? { net: 0, cost: 0, profit: 0 };
      c.net += p.net; c.cost += p.cost; c.profit += p.profit;
      m.set(p.categorie, c);
    }
    return [...m.entries()].map(([nume, c]) => ({ nume, ...c, fc: c.net > 0 ? (c.cost / c.net) * 100 : null }))
      .sort((a, b) => b.net - a.net).slice(0, 6);
  }, [produse]);
  const me = useMemo(() => rnd ? menuEngineering(produse) : null, [rnd, produse]);
  const achizitii = useMemo(() => {
    if (!achiz) return null;
    const cons = consumuriLuna(state, ctx, sel.luna);
    const top = [...cons.entries()].map(([cod, c]) => ({ cod, ...c, ing: state.ingrediente.find(i => i.cod === cod)! }))
      .sort((a, b) => b.valoare - a.valoare).slice(0, 8);
    const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const variatii = state.ingrediente.flatMap(i => {
      const ps = [...i.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
      if (ps.length < 2 || ps[ps.length - 1].validDeLa < cutoff) return [];
      const u = ps[ps.length - 1], p = ps[ps.length - 2];
      return [{ ing: i, dela: p.pret, la: u.pret, pct: p.pret > 0 ? ((u.pret - p.pret) / p.pret) * 100 : 0, data: u.validDeLa }];
    }).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 8);
    return { top, variatii };
  }, [achiz, state, ctx, sel.luna]);

  const nrAlerte = useMemo(() => {
    const a = alerte(state, ctx, sel.luna);
    return { critice: a.filter(x => x.nivel === 'CRITIC').length, total: a.length };
  }, [state, ctx, sel.luna]);

  const insights = useMemo(() => {
    if (!exec) return null;
    const recs = recomandari(state, ctx, sel.luna, 6);
    const reduceri = recs.filter(r => (r.tip === 'GRAMAJ' || r.tip === 'FURNIZOR' || r.tip === 'PRET') && (r.impactProfitLunar ?? 0) > 0);
    const topMarja = [...produse].filter(p2 => p2.marja != null && p2.buc > 0).sort((a, b) => (b.marja ?? 0) - (a.marja ?? 0)).slice(0, 2);
    const topContrib = [...produse].sort((a, b) => b.contributie - a.contributie).slice(0, 2);
    const cons = consumuriLuna(state, ctx, sel.luna);
    const topIng = [...cons.entries()].sort((a, b) => b[1].valoare - a[1].valoare).slice(0, 2)
      .map(([c2, v2]) => ({ nume: state.ingrediente.find(i => i.cod === c2)?.denumire ?? c2, valoare: v2.valoare }));
    return { recs, reduceri, topMarja, topContrib, topIng };
  }, [exec, state, ctx, sel.luna, produse]);

  if (!fc.net) return <Gol titlu="Nu există vânzări în perioada selectată" sub="Importă un PMIX din modulul Importuri sau alege altă lună." />;

  const tonAbatere = fc.abatere == null ? undefined : fc.abatere <= 0 ? 'bun' : 'rau';

  return (
    <div>
      <Titlu actiuni={
        nrAlerte.total > 0
          ? <span className="rounded-md border bg-card px-3 py-1.5 text-sm">🔔 <b className="num text-danger">{nrAlerte.critice}</b> critice · <b className="num">{nrAlerte.total}</b> alerte active — vezi modulul <b>Alerte</b></span>
          : <span className="rounded-md border bg-card px-3 py-1.5 text-sm text-muted-foreground">Nicio alertă activă</span>
      }>Dashboard Executive
        <Sel value={rol} onChange={e => setRol(e.target.value as Rol)} className="ml-3 inline-block align-middle">
          {ROLURI.map(r => <option key={r}>{r}</option>)}
        </Sel>
      </Titlu>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi eticheta="Vânzări nete" valoare={`${fmtInt(fc.net)} lei`} sub={`numitor: ${fc.numitor}`} />
        <Kpi eticheta="Food Cost teoretic" valoare={fmtPct(fc.fcTeoretic)} sub={`din care Paper ${fmtPct(fc.fcPaper)} · acoperire ${fmtPct(fc.acoperire, 1)}`} />
        <Kpi eticheta="Food Cost total (operațional)" valoare={fmtPct(fc.fcOp)} sub={fc.are29 ? `${fmtInt(fc.consumOp)} lei din 2.9` : 'importă raportul 2.9'} />
        <Kpi eticheta="Food Cost Curat" valoare={fmtPct(fc.fcCurat)} ton={tonAbatere}
          sub={fc.tinta != null ? `țintă ${fmtPct(fc.tinta)} · ${fmtPP(fc.abatere)}` : 'fără țintă'} />
        <Kpi eticheta="Variance (risipă)" valoare={fmtPP(fc.variancePP)} ton={fc.variancePP != null && fc.variancePP > 2 ? 'rau' : 'neutru'}
          sub={fc.varianceLei != null ? `${fmtInt(fc.varianceLei)} lei` : '—'} />
        <Kpi eticheta="Profit estimat (după F&P)" valoare={fc.profitEstimat != null ? `${fmtInt(fc.profitEstimat)} lei` : '—'} sub="vânzări × (1 − FC Curat)" />
      </div>

      {insights && (
        <div className="mt-4 rounded-md border-2 border-primary/50 bg-card p-4">
          <div className="flex items-baseline justify-between">
            <div className="font-display text-base font-extrabold">Executive Insights — {sel.luna}</div>
            <div className="text-xs text-muted-foreground">generat automat din PMIX, rețetar, prețuri și oferte</div>
          </div>
          <div className="mt-2 grid gap-x-6 gap-y-1.5 text-sm md:grid-cols-2">
            <div>💡 <b>Oportunități de reducere a Food Cost:</b> {insights.reduceri.length
              ? insights.reduceri.slice(0, 2).map(r => `${r.titlu} (${r.impactProfitLunar! >= 0 ? '+' : ''}${fmtInt(r.impactProfitLunar!)} lei/lună)`).join('; ')
              : 'nimic semnificativ — costurile sunt în parametri'}</div>
            <div>🏆 <b>Cea mai mare marjă:</b> {insights.topMarja.map(p2 => `${p2.denumire} (${fmtPct(p2.marja)})`).join(', ')}</div>
            <div>📈 <b>Cea mai mare contribuție la profit:</b> {insights.topContrib.map(p2 => `${p2.denumire} (${fmtPct(p2.contributie)})`).join(', ')}</div>
            <div>🥩 <b>Ingredientele cu cel mai mare impact financiar:</b> {insights.topIng.map(i => `${i.nume} (${fmtInt(i.valoare)} lei/lună)`).join(', ')}</div>
            <div className="md:col-span-2">✅ <b>Modificările recomandate:</b> {insights.recs.slice(0, 3).map(r => r.titlu).join(' · ')} — detalii și impact în modulul <b>Recomandări</b>.</div>
          </div>
        </div>
      )}

      {(exec || ops) && fc.are29 && fc.varianceLei != null && (
        <div className="mt-4">
          <Punte t={fc.costTeoretic} v={Math.max(0, fc.varianceLei)} e={fc.excluderi} />
        </div>
      )}

      {!achiz && <><Titlu>Canale — InStore vs Delivery</Titlu>
      <T>
        <thead><tr><Th>Vedere</Th><Th dr>Bucăți</Th><Th dr>Vânzări nete</Th><Th dr>Cost teoretic</Th><Th dr>din care Paper</Th><Th dr>FC teoretic</Th><Th dr>Paper Cost %</Th><Th dr>Profit teoretic</Th><Th dr>Marjă</Th></tr></thead>
        <tbody>
          {canale.map(c => (
            <tr key={c.v} className={c.v === 'TOTAL' ? 'bg-muted/40 font-semibold' : ''}>
              <Td>{c.v === 'TOTAL' ? 'Total' : c.v === 'INSTORE' ? 'InStore' : 'Delivery'}</Td>
              <Td dr>{fmtInt(c.buc)}</Td><Td dr>{fmtInt(c.net)}</Td><Td dr>{fmtInt(c.cost)}</Td>
              <Td dr>{fmtInt(c.costPaper)}</Td>
              <Td dr>{fmtPct(c.fc)}</Td><Td dr>{fmtPct(c.paperPct)}</Td><Td dr>{fmtInt(c.profit)}</Td><Td dr>{fmtPct(c.marja)}</Td>
            </tr>
          ))}
        </tbody>
      </T></>}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div>
          <Titlu>Evoluția Food Cost & profit</Titlu>
          <div className="h-64 rounded-md border bg-card p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <XAxis dataKey="luna" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="fc" tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit="%" />
                <YAxis yAxisId="lei" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {fc.tinta != null && <ReferenceLine yAxisId="fc" y={fc.tinta} stroke="#1E7F4F" strokeDasharray="4 4" label={{ value: 'țintă', fontSize: 11, fill: '#1E7F4F' }} />}
                <Line yAxisId="fc" type="monotone" dataKey="FC Curat" stroke="#C6373C" strokeWidth={2.5} dot />
                <Line yAxisId="fc" type="monotone" dataKey="FC teoretic" stroke="#B97A0A" strokeWidth={2} dot strokeDasharray="5 3" />
                <Line yAxisId="lei" type="monotone" dataKey="Profit (lei)" stroke="#1E7F4F" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {(exec || ops) ? <div>
          <Titlu>Restaurante — {sel.luna}</Titlu>
          <T>
            <thead><tr><Th>Locație</Th><Th dr>Vânzări nete</Th><Th dr>FC Curat</Th><Th dr>Țintă</Th><Th dr>Abatere</Th><Th dr>Variance</Th></tr></thead>
            <tbody>
              {locatiiFc.map(r => {
                const l = state.locatii.find(x => x.cod === r.locatie);
                const ok = r.abatere != null && r.abatere <= 0;
                return (
                  <tr key={r.locatie}>
                    <Td><span className={`mr-2 inline-block h-2 w-2 rounded-full ${r.abatere == null ? 'bg-stone-300' : ok ? 'bg-ok' : 'bg-danger'}`} />{l?.nume ?? r.locatie}</Td>
                    <Td dr>{fmtInt(r.net)}</Td>
                    <Td dr>{fmtPct(r.fcCurat)}</Td>
                    <Td dr>{fmtPct(r.tinta)}</Td>
                    <Td dr className={r.abatere == null ? '' : ok ? 'text-ok' : 'text-danger'}>{fmtPP(r.abatere)}</Td>
                    <Td dr>{fmtPP(r.variancePP)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </T>
          <p className="mt-2 text-xs text-muted-foreground">
            FC Curat = consumul real Food & Paper (2.9, fără excluderi) / vânzări nete. Excluderile ({fmtLei(fc.excluderi, 0)} lei luna aceasta) nu aparțin Food & Paper Cost.
          </p>
        </div> : rnd && me ? (
          <div>
            <Titlu>R&D — starea meniului</Titlu>
            <div className="grid grid-cols-4 gap-2">
              {(['STAR', 'PLOWHORSE', 'PUZZLE', 'DOG'] as const).map(c => (
                <div key={c} className="rounded-md border bg-card px-3 py-2 text-center">
                  <div className="num text-xl font-semibold">{me.randuri.filter(r => r.clasa === c).length}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c === 'STAR' ? 'Stars' : c === 'PLOWHORSE' ? 'Plowhorses' : c === 'PUZZLE' ? 'Puzzles' : 'Dogs'}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-md border bg-card p-3 text-sm">
              <div className="mb-1 font-semibold">Prioritățile de reformulare</div>
              {me.randuri.filter(r => r.clasa === 'PLOWHORSE' || r.clasa === 'DOG').slice(0, 4).map(r => (
                <div key={r.cod} className="flex justify-between border-b py-1 last:border-b-0">
                  <span>{r.denumire}</span>
                  <span className="num text-muted-foreground">FC {fmtPct(r.fc)} · {fmtLei(r.profitUnitar)} lei/porție</span>
                </div>
              ))}
              <p className="mt-2 text-xs text-muted-foreground">Detalii în Menu Engineering; construiește variantele în R&D Lab.</p>
            </div>
          </div>
        ) : achiz && achizitii ? (
          <div>
            <Titlu>Achiziții — cheltuiala pe ingrediente ({sel.luna})</Titlu>
            <T dens>
              <thead><tr><Th>Ingredient</Th><Th dr>Consum</Th><Th dr>Cheltuială/lună</Th><Th dr>Preț curent</Th></tr></thead>
              <tbody>
                {achizitii.top.map(t2 => (
                  <tr key={t2.cod}>
                    <Td>{t2.ing?.denumire ?? t2.cod}</Td>
                    <Td dr>{t2.cant.toFixed(1)} {t2.um}</Td>
                    <Td dr>{fmtInt(t2.valoare)} lei</Td>
                    <Td dr>{fmtLei(pretCurent(t2.ing))} lei/{t2.um}</Td>
                  </tr>
                ))}
              </tbody>
            </T>
            <div className="mt-3 rounded-md border bg-card p-3 text-sm">
              <div className="mb-1 font-semibold">Variații recente de preț (60 zile)</div>
              {achizitii.variatii.length === 0 ? <div className="text-muted-foreground">Nicio variație recentă.</div> : achizitii.variatii.map(v2 => (
                <div key={v2.ing.cod} className="flex justify-between border-b py-1 last:border-b-0">
                  <span>{v2.ing.denumire} <span className="text-xs text-muted-foreground">({v2.data})</span></span>
                  <span className={cx('num font-semibold', v2.pct > 0 ? 'text-danger' : 'text-ok')}>{fmtLei(v2.dela)} → {fmtLei(v2.la)} ({v2.pct > 0 ? '+' : ''}{fmtPct(v2.pct)})</span>
                </div>
              ))}
              <p className="mt-2 text-xs text-muted-foreground">Ofertele alternative sunt în Ingredient Intelligence și Product Impact → Schimbare furnizor.</p>
            </div>
          </div>
        ) : null}
      </div>

      {(exec || rnd) && <>
      <Titlu>Top & Bottom — {sel.luna}</Titlu>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <div className="mb-2 font-display text-sm font-extrabold">Top produse (profit)</div>
          {topProfit.map((p, i) => (
            <div key={p.cod} className="flex justify-between border-b py-1 text-sm last:border-b-0">
              <span className="truncate"><span className="num mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>{p.denumire}</span>
              <span className="num font-semibold text-ok">{fmtInt(p.profit)} lei</span>
            </div>
          ))}
        </div>
        <div className="rounded-md border bg-card p-4">
          <div className="mb-2 font-display text-sm font-extrabold">Bottom produse (profit)</div>
          {bottomProfit.map((p, i) => (
            <div key={p.cod} className="flex justify-between border-b py-1 text-sm last:border-b-0">
              <span className="truncate"><span className="num mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>{p.denumire}</span>
              <span className="num font-semibold">{fmtInt(p.profit)} lei <span className="text-xs text-muted-foreground">({fmtPct(p.fc)})</span></span>
            </div>
          ))}
        </div>
        <div className="rounded-md border bg-card p-4">
          <div className="mb-2 font-display text-sm font-extrabold">Top categorii (vânzări nete)</div>
          {categorii.map((c, i) => (
            <div key={c.nume} className="flex justify-between border-b py-1 text-sm last:border-b-0">
              <span className="truncate"><span className="num mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>{c.nume}</span>
              <span className="num font-semibold">{fmtInt(c.net)} lei <span className="text-xs text-muted-foreground">FC {fmtPct(c.fc)}</span></span>
            </div>
          ))}
        </div>
      </div>
      </>}
    </div>
  );
}
