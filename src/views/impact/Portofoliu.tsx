import { useMemo } from 'react';
import { useSel, useStore } from '../../lib/store';
import { portofoliu } from '../../lib/portofoliu';
import { fmtInt, fmtLei, fmtPct, fmtPP } from '../../lib/engine';
import { Gol, Insigna, T, Td, Th, cx } from '../../lib/ui';

export default function Portofoliu() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const p = useMemo(() => portofoliu(state, ctx, sel.luna), [state, ctx, sel.luna]);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-sm font-bold">Echilibrul categoriilor</div>
        <T dens>
          <thead><tr><Th>Categorie</Th><Th dr>SKU</Th><Th dr>% din vânzări</Th><Th dr>% din profit</Th><Th dr>% din Food Cost</Th><Th dr>FC %</Th><Th dr>Dezechilibru</Th><Th>Verdict</Th></tr></thead>
          <tbody>
            {p.categorii.map(c => (
              <tr key={c.categorie}>
                <Td className="font-semibold">{c.categorie}</Td>
                <Td dr>{c.nrSKU}</Td>
                <Td dr>{fmtPct(c.mixVanzari)}</Td>
                <Td dr>{fmtPct(c.mixProfit)}</Td>
                <Td dr>{fmtPct(c.mixCost)}</Td>
                <Td dr>{fmtPct(c.fc)}</Td>
                <Td dr className={cx('font-semibold', c.dezechilibru <= -3 ? 'text-danger' : c.dezechilibru >= 3 ? 'text-ok' : '')}>{fmtPP(c.dezechilibru)}</Td>
                <Td className="text-xs text-muted-foreground">{c.verdict}</Td>
              </tr>
            ))}
          </tbody>
        </T>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-bold">Produse care se canibalizează ({p.canibalizari.length})</div>
          {p.canibalizari.length === 0 ? <Gol titlu="Nicio suprapunere semnificativă" sub="Produsele din aceeași categorie au prețuri și profiluri suficient de distincte." /> : (
            <div className="space-y-2">
              {p.canibalizari.map((c, i) => (
                <div key={i} className="rounded-md border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{c.numeA} ↔ {c.numeB}</span>
                    <Insigna fel="warn">{c.categorie}</Insigna>
                    <span className="num ml-auto text-sm">{fmtLei(c.pretA)} vs {fmtLei(c.pretB)} lei · {fmtPct(c.mixA + c.mixB)} din bucăți</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{c.motiv}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-sm font-bold">Produse redundante ({p.redundante.length})</div>
          {p.redundante.length === 0 ? <Gol titlu="Nicio redundanță de rețetar" sub="Structurile de cost sunt suficient de diferite între produse." /> : (
            <div className="space-y-2">
              {p.redundante.map((r, i) => (
                <div key={i} className="rounded-md border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.numeA} ↔ {r.numeB}</span>
                    <span className="num ml-auto text-sm font-semibold">{fmtPct(r.similaritate)} structură comună</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{r.motiv}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold">Segmente de preț neacoperite ({p.goluri.length})</div>
        {p.goluri.length === 0 ? <Gol titlu="Scara de prețuri este continuă" /> : (
          <div className="space-y-2">
            {p.goluri.map((g, i) => (
              <div key={i} className="rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Insigna fel="info">{g.categorie}</Insigna>
                  <span className="font-semibold">{fmtLei(g.de)} → {fmtLei(g.la)} lei (salt de {fmtPct(g.latimePct)})</span>
                  {g.potentialLunar != null && <span className="num ml-auto text-sm font-semibold text-ok">potențial ~{fmtInt(g.potentialLunar)} lei/lună</span>}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{g.sugestie}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-bold">Oportunități pentru produse noi</div>
        {p.produseNoi.length === 0 ? <Gol titlu="Portofoliul acoperă segmentele curente" /> : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {p.produseNoi.map((x, i) => (
              <div key={i} className="rounded-md border bg-card p-4">
                <div className="font-display text-sm font-extrabold">{x.titlu}</div>
                <div className="mt-1 text-sm text-muted-foreground">{x.motiv}</div>
                {x.potentialLunar != null && <div className="num mt-2 border-t pt-2 text-sm font-semibold text-ok">potențial ~{fmtInt(x.potentialLunar)} lei/lună · {fmtInt(x.potentialLunar * 12)} lei/an</div>}
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Potențialul produselor noi este o estimare orientativă (marja medie a categoriei × 30% din volumul mediu al categoriei) — validează-l în R&D Lab, cu rețeta reală.
        </p>
      </div>
    </div>
  );
}
