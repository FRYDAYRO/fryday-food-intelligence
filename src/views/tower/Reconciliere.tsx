/**
 * Reconciliere — ce explică puntea și ce rămâne neexplicat, cu factorii de încredere
 * și motivele pentru care închiderea nu e completă. Nimic nu se ajustează ca să iasă ținta.
 */
import { useState } from 'react';
import { fmtLei, fmtPct } from '../../lib/engine';
import { punteTower, semnaleCalitate, type GrupBridge } from '../../lib/fc-tower';
import { useTower } from './context';
import { useAnaliza, useIngrediente, usePunte, useReconciliere } from './date';
import type { ReconciliationFC } from '../../lib/fc-core';
import { Insigna } from '../../lib/ui';
import { Indisponibil, MaterialeGrup, Punte, Sectiune, Semnale } from './parti';

export default function Reconciliere() {
  const { state } = useTower();
  const bridge = usePunte();
  const analiza = useAnaliza();
  const ingrediente = useIngrediente();
  const rec = useReconciliere();
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
              <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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

      <Sectiune titlu="Waste 2.8 față de Usage Actual și Inv Adj"
        sub="numai waste-ul demonstrat inclus în Usage Actual reduce Neexplicatul; potrivirea cantitativă cu Inv Adj e o observație, nu o dovadă">
        <AtribuireWaste rec={rec} />
      </Sectiune>

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

const POTRIVIRE: Record<string, { text: string; fel: 'ok' | 'warn' | 'EXCLUS' }> = {
  EXACTA: { text: 'exactă', fel: 'ok' },
  COMPATIBILA_CU_PRECIZIA: { text: 'compatibilă cu precizia', fel: 'ok' },
  DIFERENTA_REALA: { text: 'diferență reală', fel: 'warn' },
  FARA_EVENIMENT_28: { text: 'Adj fără eveniment 2.8', fel: 'warn' },
  FARA_CORESPONDENT_29: { text: 'fără corespondent 2.9', fel: 'warn' },
  FARA_COLOANA_ADJ: { text: 'fără coloana Adj', fel: 'warn' },
  UM_DIFERITA: { text: 'UM diferită', fel: 'EXCLUS' },
};

function AtribuireWaste({ rec }: { rec: ReconciliationFC }) {
  const w = rec.waste;
  const pasW = rec.pasi.find(p => p.id === 'WASTE');
  const pasN = rec.pasi.find(p => p.id === 'WASTE_NERECONCILIAT');
  const card = (titlu: string, valoare: string, sub: string) => (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{titlu}</div>
      <div className="num mt-1 text-xl font-semibold">{valoare}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
  return (
    <div className="space-y-3" data-zona="atribuire-waste">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {card('Inclus în Usage Actual', fmtLei(w.inclusLei, 2), pasW?.disponibil ? 'scade Neexplicatul (pas EXPLICAT)' : 'nimic demonstrat: Neexplicatul nu se mișcă')}
        {card('Exclus prin ajustare', fmtLei(w.exclusLei, 2), 'nu e în Usage Actual; nu se scade')}
        {card('Nedeterminat', fmtLei(w.nedeterminatLei, 2), `${pasN?.nrRanduri ?? 0} rânduri nereconciliate${w.vechi.randuri ? `, din care ${w.vechi.randuri} vechi (${fmtLei(w.vechi.leiDeterminabil, 2)} la preț determinabil)` : ''}`)}
        {card('Adj 2.9 fără eveniment 2.8', fmtLei(w.ajustariFaraEveniment.leiEstimat, 2), `${w.ajustariFaraEveniment.coduri} coduri · estimare la Cost per Unit, nu waste`)}
      </div>
      <div className="rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">
        {w.disponibil
          ? <>Evaluările rămân separate: 2.8 la Extension tipărit, 2.9 la Cost per Unit. Rezidualul zero al punții nu dovedește atribuirea:
              {' '}atribuirea este {w.atribuireCompleta ? <b>completă</b> : <b>incompletă</b>}
              {w.potrivire && <> · acoperire pe coduri: {w.potrivire.coduri.ambele} cu Adj și evenimente, {w.potrivire.coduri.doarAdj} doar Adj, {w.potrivire.coduri.doarEvenimente} doar 2.8</>}.</>
          : <>Potrivirea cu Inv Adj nu se poate face: {w.motiv}</>}
      </div>
      {w.potrivire && w.potrivire.linii.length > 0 && (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Restaurant · fereastră</th>
                <th className="px-3 py-2">Material · UM</th>
                <th className="px-3 py-2 text-right">Adj 2.9</th>
                <th className="px-3 py-2 text-right">Qty 2.8</th>
                <th className="px-3 py-2">Potrivire</th>
                <th className="px-3 py-2 text-right">Adj × CPU</th>
                <th className="px-3 py-2 text-right">Σ 2.8</th>
                <th className="px-3 py-2 text-right">Inclus</th>
                <th className="px-3 py-2 text-right">Exclus</th>
                <th className="px-3 py-2 text-right">Nedeterminat</th>
              </tr>
            </thead>
            <tbody>
              {w.potrivire.linii.map(l => {
                const p = POTRIVIRE[l.potrivire] ?? { text: l.potrivire, fel: 'warn' as const };
                return (
                  <tr key={`${l.locatie ?? ''}|${l.fereastra.de}|${l.material}|${l.um}`} className="border-t align-top">
                    <td className="px-3 py-1.5 text-xs">{l.locatie ?? 'fără restaurant'}<div className="text-muted-foreground">{l.fereastra.de} → {l.fereastra.la}</div></td>
                    <td className="px-3 py-1.5"><b>{l.denumire}</b> <span className="text-xs text-muted-foreground">{l.material} · {l.um}</span>
                      {l.coduri28.length > 1 && <div className="text-[11px] text-muted-foreground">coduri 2.8: {l.coduri28.join(', ')}</div>}
                      {l.nrEvenimente > 0 && (
                        <details className="mt-1 text-xs">
                          <summary className="cursor-pointer text-muted-foreground">{l.nrEvenimente} evenimente · {l.motive.map(m => `${m.motiv} ${m.cant}`).join(', ')}</summary>
                          <ul className="mt-1 space-y-0.5">
                            {l.evenimente.map((e, i) => (
                              <li key={i} className="text-muted-foreground">
                                {e.motiv} · {e.utilizator ?? '—'} · {e.cant} {e.um} × {e.costUnitar} = {e.lei} lei
                                {e.sursa && <> · {e.sursa.fisier}{e.rand !== undefined ? `, rândul ${e.rand}` : ''}</>}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className="num px-3 py-1.5 text-right">{l.adj === null ? '—' : l.adj}</td>
                    <td className="num px-3 py-1.5 text-right">{l.cant28}{l.diferenta !== null && l.diferenta !== 0 && <span className="ml-1 text-xs text-muted-foreground">({l.diferenta > 0 ? '+' : ''}{l.diferenta})</span>}</td>
                    <td className="px-3 py-1.5 text-xs"><Insigna fel={p.fel}>{p.text}</Insigna>
                      {l.declaratiiNeaplicate > 0 && <div className="text-muted-foreground">{l.declaratiiNeaplicate} declarații neaplicate</div>}
                      {l.declaratiiPlafonate > 0 && <div className="text-muted-foreground">{l.declaratiiPlafonate} declarații plafonate</div>}</td>
                    <td className="num px-3 py-1.5 text-right">{l.leiEstimat29 === null ? '—' : fmtLei(l.leiEstimat29, 2)}</td>
                    <td className="num px-3 py-1.5 text-right">{fmtLei(l.lei28, 2)}</td>
                    <td className="num px-3 py-1.5 text-right">{l.parti.INCLUS_IN_USAGE.lei ? fmtLei(l.parti.INCLUS_IN_USAGE.lei, 2) : '—'}</td>
                    <td className="num px-3 py-1.5 text-right">{l.parti.EXCLUS_PRIN_AJUSTARE.lei ? fmtLei(l.parti.EXCLUS_PRIN_AJUSTARE.lei, 2) : '—'}</td>
                    <td className="num px-3 py-1.5 text-right">{fmtLei(l.parti.NEDETERMINAT.lei, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
