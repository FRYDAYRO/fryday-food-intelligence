/**
 * Reconciliere — ce explică puntea și ce rămâne neexplicat, cu factorii de încredere
 * și motivele pentru care închiderea nu e completă. Nimic nu se ajustează ca să iasă ținta.
 */
import { useState } from 'react';
import { fmtLei, fmtPct } from '../../lib/engine';
import { punteTower, semnaleCalitate, type GrupBridge } from '../../lib/fc-tower';
import { useTower } from './context';
import { useAnaliza, useIngrediente, usePunte } from './date';
import { Indisponibil, MaterialeGrup, Punte, Sectiune, Semnale } from './parti';

export default function Reconciliere() {
  const { state } = useTower();
  const bridge = usePunte();
  const analiza = useAnaliza();
  const ingrediente = useIngrediente();
  const [grup, setGrup] = useState<GrupBridge | null>(null);
  const punte = punteTower(bridge);

  if (!analiza.disponibil) {
    return <Indisponibil titlu="Nu există date pe această selecție" motiv={analiza.motivIndisponibil} />;
  }

  const grupActiv = punte.grupuri.find(g => g.grup === grup) ?? null;

  return (
    <div className="space-y-6">
      <Sectiune titlu="Puntea, în detaliu">
        <Punte p={punte} activ={grup} onAlege={g => setGrup(g === grup ? null : g as GrupBridge)} />
        {grupActiv && <MaterialeGrup g={grupActiv} />}
      </Sectiune>

      {punte.disponibil && (
        <Sectiune titlu="Explicat și neexplicat">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border bg-card px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Explicat</div>
              <div className="num mt-1 text-xl font-semibold">{fmtLei(bridge.explainedAmount, 0)}</div>
              <div className="text-xs text-muted-foreground">{fmtPct(bridge.explainedPct, 1)} din consum</div>
            </div>
            <div className="rounded-md border bg-card px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Neexplicat + neclasificat</div>
              <div className="num mt-1 text-xl font-semibold">{fmtLei(bridge.unexplainedAmount, 0)}</div>
              <div className="text-xs text-muted-foreground">{fmtPct(bridge.unexplainedPct, 1)} din consum</div>
            </div>
            <div className="rounded-md border bg-card px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Variație vs rețetar</div>
              <div className="num mt-1 text-xl font-semibold">
                {bridge.difference === null ? '—' : fmtLei(bridge.difference, 0)}
              </div>
              <div className="text-xs text-muted-foreground">consum real de FC − cost din rețete</div>
            </div>
            <div className="rounded-md border bg-card px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Acoperire rețete</div>
              <div className="num mt-1 text-xl font-semibold">{fmtPct(bridge.coveragePct, 1)}</div>
              <div className="text-xs text-muted-foreground">din vânzările nete ale scopului</div>
            </div>
          </div>
        </Sectiune>
      )}

      {punte.disponibil && (
        <Sectiune titlu="Din ce se compune încrederea" sub={bridge.confidence.formula}>
          <div className="overflow-x-auto rounded-md border bg-card" data-zona="confidenta">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Factor</th><th className="px-3 py-2 text-right">Pondere</th>
                  <th className="px-3 py-2 text-right">Scor</th><th className="px-3 py-2">Detaliu</th>
                </tr>
              </thead>
              <tbody>
                {bridge.confidence.factori.map(f => (
                  <tr key={f.factor} className="border-t">
                    <td className="px-3 py-1.5 font-semibold">{f.eticheta}</td>
                    <td className="num px-3 py-1.5 text-right">{fmtPct(f.pondere * 100, 0)}</td>
                    <td className="num px-3 py-1.5 text-right">{f.scor}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{f.detaliu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sectiune>
      )}

      {!analiza.complete && (
        <Sectiune titlu="De ce nu e completă">
          <ul className="list-inside list-disc space-y-1 rounded-md border bg-card p-3 text-sm">
            {analiza.motiveIncomplet.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </Sectiune>
      )}

      <Sectiune titlu="Calitatea datelor">
        <Semnale semnale={semnaleCalitate(state, analiza, ingrediente.disponibil ? ingrediente : null)} />
      </Sectiune>

      <Sectiune titlu="Surse">
        <ul className="space-y-1 text-sm">
          {analiza.surse.map((s, i) => (
            <li key={i} className="rounded-md border bg-card px-3 py-1.5">
              <b>{s.raport}</b> · {s.randuri} rânduri · {s.interval}
              {s.nota && <span className="text-muted-foreground"> — {s.nota}</span>}
            </li>
          ))}
        </ul>
      </Sectiune>
    </div>
  );
}
