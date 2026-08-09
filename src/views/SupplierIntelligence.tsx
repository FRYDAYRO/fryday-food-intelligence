import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSel, useStore } from '../lib/store';
import { deRenegociat, intelFurnizori } from '../lib/portofoliu';
import { fmtInt, fmtLei, fmtPct, fmtPP } from '../lib/engine';
import { Gol, Insigna, T, Td, Th, Titlu, cx } from '../lib/ui';

export default function SupplierIntelligence() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const lista = useMemo(() => intelFurnizori(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const reneg = useMemo(() => deRenegociat(state, ctx, sel.luna), [state, ctx, sel.luna]);
  const [cod, setCod] = useState(lista[0]?.cod ?? '');
  const f = lista.find(x => x.cod === cod) ?? lista[0];

  const serie = useMemo(() => {
    if (!f) return [] as Record<string, string | number>[];
    const date = [...new Set(f.evolutie.map(e => e.data))].sort();
    const ing = [...new Set(f.evolutie.map(e => e.ingredient))].slice(0, 5);
    return date.map(d => {
      const rand: Record<string, string | number> = { data: d };
      for (const i of ing) {
        const ultim = f.evolutie.filter(e => e.ingredient === i && e.data <= d).pop();
        if (ultim) rand[i] = ultim.pret;
      }
      return rand;
    });
  }, [f]);

  if (!f) return <Gol titlu="Niciun furnizor definit" />;
  const cheiSerie = Object.keys(serie[serie.length - 1] ?? {}).filter(k => k !== 'data');
  const culori = ['#B97A0A', '#2563A6', '#1E7F4F', '#C6373C', '#6B4E9E'];

  return (
    <div>
      <Titlu>Supplier Intelligence — {sel.luna}</Titlu>

      <T dens>
        <thead><tr><Th>Furnizor</Th><Th dr>Ingrediente</Th><Th dr>Cheltuială / lună</Th><Th dr>Cheltuială / an</Th><Th dr>% din costul materialelor</Th><Th dr>Impact la +5% preț</Th><Th dr>Economie cu alternative</Th></tr></thead>
        <tbody>
          {lista.map(x => (
            <tr key={x.cod} onClick={() => setCod(x.cod)}
              className={cx('cursor-pointer hover:bg-muted/50', x.cod === f.cod && 'bg-primary/10 font-semibold')}>
              <Td>{x.nume}</Td>
              <Td dr>{x.ingrediente.length}</Td>
              <Td dr>{fmtInt(x.cheltuialaLunara)} lei</Td>
              <Td dr>{fmtInt(x.cheltuialaAnuala)} lei</Td>
              <Td dr>{fmtPct(x.shareCost)}</Td>
              <Td dr className={x.impactCrestere5.profitLunar < 0 ? 'text-danger' : ''}>
                {x.impactCrestere5.fcPP != null ? `${fmtPP(x.impactCrestere5.fcPP)} · ${fmtInt(x.impactCrestere5.profitLunar)} lei` : '—'}
              </Td>
              <Td dr className={x.economieAlternative > 0 ? 'text-ok font-semibold' : ''}>
                {x.economieAlternative > 0 ? `+${fmtInt(x.economieAlternative)} lei/lună` : '—'}
              </Td>
            </tr>
          ))}
        </tbody>
      </T>
      <p className="mt-1.5 text-xs text-muted-foreground">Click pe un furnizor pentru evoluția prețurilor, produsele afectate și ofertele alternative. „Impact la +5%" simulează o scumpire generalizată la acel furnizor, pe volumele reale din PMIX.</p>

      <Titlu>{f.nume}</Titlu>
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-bold">Evoluția prețurilor</div>
          <div className="h-56 rounded-md border bg-card p-3">
            {serie.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {cheiSerie.map((k, i) => (
                    <Line key={k} type="stepAfter" dataKey={k} stroke={culori[i % culori.length]} strokeWidth={2} dot />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Un singur nivel de preț înregistrat — fără evoluție de afișat.</div>
            )}
          </div>
          <div className="mt-3 rounded-md border bg-card p-3 text-sm">
            <div className="mb-1 font-semibold">Produse afectate ({f.produseAfectate.length})</div>
            <div className="text-muted-foreground">{f.produseAfectate.join(' · ') || 'Niciun produs activ nu folosește ingredientele acestui furnizor.'}</div>
            <div className="mt-2 border-t pt-2">
              O scumpire de 5% la acest furnizor ar muta Food Cost-ul rețelei cu{' '}
              <b className={cx(f.impactCrestere5.profitLunar < 0 ? 'text-danger' : '')}>{fmtPP(f.impactCrestere5.fcPP)}</b> și profitul cu{' '}
              <b className={cx(f.impactCrestere5.profitLunar < 0 ? 'text-danger' : 'text-ok')}>{fmtInt(f.impactCrestere5.profitLunar)} lei/lună</b>{' '}
              ({fmtInt(f.impactCrestere5.profitLunar * 12)} lei/an).
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-bold">Ingredientele livrate</div>
          <T dens>
            <thead><tr><Th>Ingredient</Th><Th dr>Preț</Th><Th dr>Ultima variație</Th><Th dr>Consum/lună</Th><Th dr>Cost/an</Th><Th>Alternativă</Th></tr></thead>
            <tbody>
              {f.ingrediente.map(i => (
                <tr key={i.cod}>
                  <Td>{i.nume}</Td>
                  <Td dr>{fmtLei(i.pret)} /{i.um}</Td>
                  <Td dr className={i.variatiePct != null && i.variatiePct > 0 ? 'text-danger' : i.variatiePct != null && i.variatiePct < 0 ? 'text-ok' : ''}>
                    {i.variatiePct != null ? `${i.variatiePct > 0 ? '+' : ''}${fmtPct(i.variatiePct)}` : '—'}
                    {i.variatiePct != null && <span className="ml-1 text-xs text-muted-foreground">{i.dataUltima}</span>}
                  </Td>
                  <Td dr>{i.cantLunara > 0 ? `${i.cantLunara.toFixed(1)} ${i.um}` : '—'}</Td>
                  <Td dr>{i.cheltuialaAnuala > 0 ? `${fmtInt(i.cheltuialaAnuala)} lei` : '—'}</Td>
                  <Td>
                    {i.alternativa
                      ? <span className="text-ok">{i.alternativa.furnizor} {fmtLei(i.alternativa.pret)} <b>(+{fmtInt(i.alternativa.economieLunara)} lei/lună)</b></span>
                      : <span className="text-muted-foreground">—</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </T>
        </div>
      </div>

      <Titlu>De renegociat — prioritățile Achizițiilor</Titlu>
      {reneg.length === 0 ? <Gol titlu="Niciun ingredient nu întrunește criteriile de renegociere" /> : (
        <div className="space-y-2">
          {reneg.map(r => (
            <div key={r.cod} className="rounded-md border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Insigna fel="info">{r.furnizor}</Insigna>
                <span className="font-semibold">{r.nume}</span>
                <span className="num ml-auto text-sm">
                  {fmtInt(r.cheltuialaAnuala)} lei/an
                  {r.castigLunar != null && r.castigLunar > 0 && <b className="ml-3 text-ok">+{fmtInt(r.castigLunar)} lei/lună dacă se schimbă sursa</b>}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{r.motiv}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
