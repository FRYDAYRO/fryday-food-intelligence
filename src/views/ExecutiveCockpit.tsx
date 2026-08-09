import { useMemo } from 'react';
import { useSel, useStore } from '../lib/store';
import { cockpit } from '../lib/decizii';
import { fcPerioada, fmtInt, fmtPct, fmtPP } from '../lib/engine';
import { Titlu, cx } from '../lib/ui';

export default function ExecutiveCockpit() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const { raspunsuri, narativ } = useMemo(() => cockpit(state, ctx, sel.luna, sel.locatie), [state, ctx, sel.luna, sel.locatie]);
  const fc = useMemo(() => fcPerioada(state, ctx, sel.luna, sel.locatie), [state, ctx, sel.luna, sel.locatie]);

  const inTarget = fc.tinta != null && (fc.fcCurat ?? fc.fcTeoretic ?? 0) <= fc.tinta;

  return (
    <div>
      <Titlu actiuni={
        <span className={cx('rounded-md border px-3 py-1.5 text-sm font-semibold', inTarget ? 'border-ok/40 bg-ok/10 text-ok' : 'border-danger/40 bg-danger/10 text-danger')}>
          {inTarget ? 'În target' : 'Peste target'} · FC {fmtPct(fc.fcCurat ?? fc.fcTeoretic)}{fc.tinta != null ? ` / ${fmtPct(fc.tinta)}` : ''}
        </span>
      }>Executive Cockpit — {sel.luna}</Titlu>

      {/* Narativul executiv, generat pe reguli */}
      <div className="rounded-md border-2 border-primary/50 bg-card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-display text-base font-extrabold">Rezumat executiv</div>
          <div className="num text-xs text-muted-foreground">
            {narativ.deltaPP != null && <>Δ Food Cost {fmtPP(narativ.deltaPP)} vs {narativ.lunaPrec} · </>}
            preț {fmtPP(narativ.efectPreturiPP)} · mix {fmtPP(narativ.efectMixPP)}
          </div>
        </div>
        <div className="mt-2 space-y-1.5 text-[15px] leading-relaxed">
          {narativ.paragrafe.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {narativ.cauze.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cauzele variației, în ordinea impactului</div>
            <div className="grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
              {narativ.cauze.slice(0, 4).map((c, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="truncate">{c.eticheta}</span>
                  <span className={cx('num shrink-0 font-semibold', c.lei > 0 ? 'text-danger' : 'text-ok')}>
                    {fmtPP(c.pp)} · {c.lei >= 0 ? '+' : ''}{fmtInt(c.lei)} lei
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cele șapte întrebări ale CEO-ului */}
      <Titlu>Răspunsuri directe</Titlu>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {raspunsuri.map((r, i) => (
          <div key={i} className={cx('flex flex-col rounded-md border bg-card p-4', i === raspunsuri.length - 1 && 'md:col-span-2 xl:col-span-1 border-primary/50')}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{r.intrebare}</div>
            <div className="font-display mt-1 text-[17px] font-extrabold leading-tight">{r.raspuns}</div>
            <div className="mt-1.5 flex-1 text-sm text-muted-foreground">{r.detaliu}</div>
            <div className="num mt-2 border-t pt-2 text-sm font-semibold">{r.impact}</div>
            <div className="mt-1 text-xs text-muted-foreground">→ {r.unde}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Toate cifrele provin din simulări pe volumele reale din PMIX ({sel.luna}); nicio valoare nu este estimată manual. Rezumatul este generat de un motor pe reguli, fără model AI extern.
      </p>
    </div>
  );
}
