import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSel, useStore } from '../lib/store';
import {
  consumLunarIngredient, pretCurent, utilizariIngredient, fmtInt, fmtLei, fmtPP, fmtPct,
} from '../lib/engine';
import { impactIngredient } from '../lib/decizii';
import GrafDependente from './impact/GrafDependente';
import { Camp, Gol, In, Insigna, T, Td, Th, Titlu, cx } from '../lib/ui';

export default function IngredientIntelligence() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const [cauta, setCauta] = useState('');
  const [cod, setCod] = useState(state.ingrediente[0]?.cod ?? '');
  const [pretNou, setPretNou] = useState('');

  const ing = state.ingrediente.find(i => i.cod === cod);
  const q = cauta.toLowerCase();
  const lista = useMemo(() => state.ingrediente
    .filter(i => i.denumire.toLowerCase().includes(q) || i.cod.toLowerCase().includes(q))
    .map(i => {
      const ps = [...i.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa));
      const ultim = ps[ps.length - 1]?.pret ?? 0;
      const prec = ps.length > 1 ? ps[ps.length - 2].pret : null;
      return { ...i, pret: ultim, varPct: prec ? ((ultim - prec) / prec) * 100 : null };
    }), [state.ingrediente, q]);

  const utilizari = useMemo(() => (ing ? utilizariIngredient(ing.cod, ctx) : []), [ing, ctx]);
  const consum = useMemo(() => (ing ? consumLunarIngredient(ing.cod, state, ctx, sel.luna) : null), [ing, state, ctx, sel.luna]);
  const istoric = useMemo(() => ing
    ? [...ing.preturi].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa)).map(p => ({ data: p.validDeLa, 'Preț (lei)': p.pret }))
    : [], [ing]);

  // what-if: preț nou → impact instant (fără a atinge datele reale)
  // Ingredient Impact Network: un singur motor partajat (lib/decizii), fără calcule duplicate în UI
  const whatIf = useMemo(() => {
    const p = Number(pretNou);
    if (!ing || !Number.isFinite(p) || p <= 0) return null;
    return impactIngredient(state, ctx, ing.cod, p, sel.luna);
  }, [pretNou, ing, state, ctx, sel.luna]);

  const impacturiGraf = useMemo(() => {
    if (!whatIf) return undefined;
    const m = new Map<string, number>();
    for (const p of whatIf.produse) m.set(p.cod, p.dLunar);
    return m;
  }, [whatIf]);

  if (!ing) return <Gol titlu="Niciun ingredient" />;
  const varUltima = lista.find(l => l.cod === ing.cod)?.varPct ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div>
        <Titlu>Ingredient Intelligence</Titlu>
        <In placeholder="Caută ingredient…" value={cauta} onChange={e => setCauta(e.target.value)} className="mb-2" />
        <div className="max-h-[68vh] space-y-0.5 overflow-y-auto rounded-md border bg-card p-1.5">
          {lista.map(i => (
            <button key={i.cod} onClick={() => { setCod(i.cod); setPretNou(''); }}
              className={cx('flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm',
                cod === i.cod ? 'bg-primary/15 font-semibold' : 'hover:bg-muted')}>
              <span className="truncate">{i.denumire}</span>
              <span className="num shrink-0 text-xs">
                {fmtLei(i.pret)}/{i.um}
                {i.varPct != null && Math.abs(i.varPct) >= 0.05 && (
                  <span className={i.varPct > 0 ? 'text-danger' : 'text-ok'}> {i.varPct > 0 ? '▲' : '▼'}{fmtPct(Math.abs(i.varPct))}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Titlu>{ing.denumire} <span className="ml-2 align-middle"><Insigna fel={ing.tip === 'PACKAGING' ? 'PAPER' : 'FOOD'}>{ing.tip === 'PACKAGING' ? 'Paper' : 'Food'}</Insigna></span></Titlu>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-md border bg-card px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cost actual</div>
            <div className="num mt-0.5 text-lg font-semibold">{fmtLei(pretCurent(ing))} lei/{ing.um}</div>
            <div className={cx('text-xs', varUltima != null && varUltima > 0 ? 'text-danger' : 'text-muted-foreground')}>
              {varUltima != null ? `ultima variație ${varUltima > 0 ? '+' : ''}${fmtPct(varUltima)}` : `${ing.preturi.length} versiune de preț`}
            </div>
          </div>
          <div className="rounded-md border bg-card px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Consum lunar ({sel.luna})</div>
            <div className="num mt-0.5 text-lg font-semibold">{consum ? `${consum.cantitate.toFixed(1)} ${consum.um}` : '—'}</div>
            <div className="text-xs text-muted-foreground">pe volumele PMIX, toată rețeaua</div>
          </div>
          <div className="rounded-md border bg-card px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cheltuială lunară</div>
            <div className="num mt-0.5 text-lg font-semibold">{fmtInt(consum?.valoare ?? 0)} lei</div>
            <div className="num text-xs text-muted-foreground">{fmtInt((consum?.valoare ?? 0) * 12)} lei/an la prețul actual</div>
          </div>
          <div className="rounded-md border bg-card px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Utilizat în</div>
            <div className="num mt-0.5 text-lg font-semibold">{utilizari.length} produse</div>
            <div className="text-xs text-muted-foreground">direct sau prin semipreparate</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-bold">Evoluția costului</div>
            <div className="h-52 rounded-md border bg-card p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={istoric} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Line type="stepAfter" dataKey="Preț (lei)" stroke="#B97A0A" strokeWidth={2.5} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Fiecare punct = o versiune de preț din nomenclator (validă de la data respectivă). Costurile istorice folosesc prețul valabil la data vânzării.</p>
          </div>

          <div>
            <div className="mb-2 text-sm font-bold">Impactul unei modificări de preț</div>
            <div className="rounded-md border bg-card p-4">
              <div className="flex items-end gap-2">
                <Camp eticheta={`Preț ipotetic (lei/${ing.um})`}>
                  <In type="number" step="0.01" value={pretNou} onChange={e => setPretNou(e.target.value)} placeholder={String(pretCurent(ing))} />
                </Camp>
                <div className="pb-1 text-xs text-muted-foreground">simulare instant — datele reale nu se modifică</div>
              </div>
              {whatIf && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded border bg-muted/30 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Food Cost rețea</div>
                    <div className="num mt-0.5 font-semibold">{fmtPct(whatIf.fc0)} → {fmtPct(whatIf.fc1)}</div>
                    <div className={cx('num text-sm font-bold', (whatIf.dFcPP ?? 0) > 0 ? 'text-danger' : 'text-ok')}>
                      {fmtPP(whatIf.dFcPP)}
                    </div>
                  </div>
                  <div className="rounded border bg-muted/30 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Profit rețea</div>
                    <div className={cx('num mt-0.5 font-semibold', whatIf.dProfitLunar >= 0 ? 'text-ok' : 'text-danger')}>
                      {whatIf.dProfitLunar >= 0 ? '+' : ''}{fmtInt(whatIf.dProfitLunar)} lei/lună
                    </div>
                    <div className="num text-sm text-muted-foreground">{whatIf.dProfitAnual >= 0 ? '+' : ''}{fmtInt(whatIf.dProfitAnual)} lei/an</div>
                  </div>
                </div>
              )}
              {!whatIf && <p className="mt-2 text-xs text-muted-foreground">Introdu un preț pentru a vedea instant efectul asupra Food Cost și a costului lunar, pe mixul lunii {sel.luna}. Pentru scenarii combinate folosește Product Impact.</p>}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-bold">Recipe Impact Engine — produsele în care este utilizat{whatIf ? ' și impactul modificării' : ''}</div>
          {utilizari.length === 0 ? <Gol titlu="Nu apare în nicio rețetă activă" /> : (
            <T dens>
              <thead><tr><Th>Produs</Th><Th dr>Cant./porție</Th><Th dr>Cost/porție</Th><Th dr>% din costul porției</Th><Th dr>Consum lunar</Th>{whatIf && <><Th dr>Cost porție →</Th><Th dr>FC % →</Th><Th dr>Impact lei/lună</Th></>}</tr></thead>
              <tbody>
                {utilizari.map(u => {
                  const c = consum?.perProdus.get(u.produs);
                  const w = whatIf?.produse.find(x => x.cod === u.produs);
                  return (
                    <tr key={u.produs}>
                      <Td>{u.denumire}</Td>
                      <Td dr>{(u.cantIn || u.cantDlv).toFixed(3)} {ing.um}</Td>
                      <Td dr>{fmtLei(u.costIn)} lei</Td>
                      <Td dr>{fmtPct(u.sharePct)}</Td>
                      <Td dr>{c ? `${c.cant.toFixed(1)} ${ing.um} (${fmtInt(c.buc)} buc)` : '—'}</Td>
                      {whatIf && w && (() => {
                        const dLunar = w.dLunar;
                        return <>
                          <Td dr>{fmtLei(w.cost0)} → <b>{fmtLei(w.cost1)}</b></Td>
                          <Td dr>{fmtPct(w.fc0)} → <b className={(w.fc1 ?? 0) > (w.fc0 ?? 0) ? 'text-danger' : 'text-ok'}>{fmtPct(w.fc1)}</b></Td>
                          <Td dr className={dLunar > 0 ? 'text-danger' : dLunar < 0 ? 'text-ok' : ''}>{dLunar >= 0 ? '+' : ''}{fmtInt(dLunar)}</Td>
                        </>;
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </T>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">Cantitățile sunt brute (includ pierderile) și cuprind consumul prin semipreparate și meniuri combo. Costul și ponderea sunt pe porția InStore.</p>

          <div className="mt-4">
            <div className="mb-2 text-sm font-bold">Graf de dependențe{whatIf ? ' — cu impactul lunar pe fiecare produs' : ''}</div>
            <GrafDependente codIng={ing.cod} ctx={ctx} impacturi={impacturiGraf} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Lanțul complet ingredient → semipreparat → produs → meniu combo, exact cum îl parcurge motorul de cost. Cifrele de pe noduri apar când introduci un preț ipotetic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
