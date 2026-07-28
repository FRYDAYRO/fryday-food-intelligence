import { useMemo } from 'react';
import { useSel, useStore } from '../lib/store';
import { recomandari, fmtInt, fmtPP, type Recomandare } from '../lib/engine';
import { Gol, Insigna, Titlu, cx } from '../lib/ui';

const TIP: Record<Recomandare['tip'], { l: string; fel: 'FOOD' | 'ok' | 'info' | 'PAPER' | 'warn' }> = {
  PRET: { l: 'Preț', fel: 'FOOD' },
  GRAMAJ: { l: 'Gramaj', fel: 'warn' },
  FURNIZOR: { l: 'Furnizor', fel: 'info' },
  PROMOVEAZA: { l: 'Promovare', fel: 'ok' },
  ANALIZEAZA: { l: 'De analizat', fel: 'PAPER' },
};

export default function Recomandari() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const lista = useMemo(() => recomandari(state, ctx, sel.luna), [state, ctx, sel.luna]);

  const totalPotential = lista.reduce((s, r) => s + Math.max(0, r.impactProfitLunar ?? 0), 0);

  return (
    <div>
      <Titlu actiuni={
        <span className="rounded-md border bg-card px-3 py-1.5 text-sm">
          Potențial cumulat: <b className="num text-ok">+{fmtInt(totalPotential)} lei/lună</b> · <span className="num">{fmtInt(totalPotential * 12)} lei/an</span>
        </span>
      }>Smart Recommendations — {sel.luna}</Titlu>
      <p className="mb-3 text-sm text-muted-foreground">
        Recomandări generate automat din datele reale (PMIX, rețetar, prețuri, oferte de furnizori), fiecare cu impactul simulat pe întreaga rețea. Aplică-le controlat din Product Impact sau R&D Lab.
      </p>

      {lista.length === 0 ? <Gol titlu="Nicio recomandare — meniul e în parametri" /> : (
        <div className="space-y-3">
          {lista.map(r => (
            <div key={r.id} className="rounded-md border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Insigna fel={TIP[r.tip].fel}>{TIP[r.tip].l}</Insigna>
                <div className="font-display text-[15px] font-extrabold">{r.titlu}</div>
                <div className="num ml-auto flex gap-4 text-sm">
                  {r.impactFcPP != null && (
                    <span>FC rețea <b className={cx(r.impactFcPP > 0 ? 'text-danger' : 'text-ok')}>{fmtPP(r.impactFcPP)}</b></span>
                  )}
                  {r.impactProfitLunar != null && (
                    <span>profit <b className={cx(r.impactProfitLunar >= 0 ? 'text-ok' : 'text-danger')}>{r.impactProfitLunar >= 0 ? '+' : ''}{fmtInt(r.impactProfitLunar)} lei/lună</b></span>
                  )}
                </div>
              </div>
              <div className="mt-1.5 text-sm"><b>Motiv:</b> {r.motiv}</div>
              <div className="mt-0.5 text-sm text-muted-foreground"><b className="text-foreground">Impact pe rețea:</b> {r.detaliu}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
