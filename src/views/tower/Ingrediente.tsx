/**
 * Ingredient Intelligence — cine a mișcat FC-ul și cu cât, cu efectele separate
 * (preț, consum, rețetă, mix) și cu drill-down pe produsele și restaurantele atinse.
 */
import { useState } from 'react';
import { fmtLei, fmtPP, fmtPct } from '../../lib/engine';
import { Insigna, cx } from '../../lib/ui';
import { ETICHETA_ANOMALIE } from '../../lib/fc-ingrediente';
import { formulaConfidentaIngredient, panouriIngrediente, type IdPanou } from '../../lib/fc-tower';
import { useIngrediente } from './date';
import { Indisponibil, Sectiune, Valoare } from './parti';

function Detaliu({ ingredient, onInchide }: { ingredient: string; onInchide: () => void }) {
  const a = useIngrediente();
  const r = a.randuri.find(x => x.ingredient === ingredient);
  if (!r) return null;
  return (
    <div className="rounded-md border bg-card p-4" data-zona="detaliu-ingredient" data-ingredient={ingredient}>
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-bold">{r.denumire}</h3>
        <span className="text-xs text-muted-foreground">{r.ingredient} · {r.um} · {r.categorie}</span>
        <button type="button" onClick={onInchide} className="ml-auto text-xs font-semibold text-primary underline">închide</button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div><div className="text-xs text-muted-foreground">Preț</div>
          <div className="num">
            <Valoare v={r.pretPrecedent} unitate="RON" zecimale={2} /> → <Valoare v={r.pretCurent} unitate="RON" zecimale={2} />
          </div>
          {(r.pretPrecedentEstimat || r.pretCurentEstimat) && (
            <div className="text-[11px] text-muted-foreground">preț retro-umplut — nu era cunoscut atunci</div>
          )}
        </div>
        <div><div className="text-xs text-muted-foreground">Δ preț</div>
          <div className="num"><Valoare v={r.deltaPretPct} unitate="PCT" /></div></div>
        <div><div className="text-xs text-muted-foreground">Δ cost</div>
          <div className="num"><Valoare v={r.deltaCostLei} unitate="RON" /></div></div>
        <div><div className="text-xs text-muted-foreground">Impact FC</div>
          <div className="num"><Valoare v={r.fcImpactPp} unitate="PP" /></div></div>
      </div>

      {r.efecte
        ? (
          <div className="mt-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Efecte separate (lei)</div>
            <div className="mt-1 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {([
                ['Preț', r.efecte.pret], ['Consum', r.efecte.consum],
                ['— din rețetă', r.efecte.reteta], ['— din mix', r.efecte.pmix],
                ['Interacțiune preț×consum', r.efecte.interactiunePret],
                ['Interacțiune rețetă×mix', r.efecte.interactiuneConsum],
              ] as [string, number][]).map(([et, v]) => (
                <div key={et} className="flex justify-between">
                  <span className="text-muted-foreground">{et}</span><span className="num">{fmtLei(v, 0)}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Δcost = preț + consum + interacțiune · consum = rețetă + mix + interacțiune. Identități exacte, verificate în teste.
            </p>
          </div>
        )
        : <p className="mt-3 text-sm text-muted-foreground">Efectele nu se pot separa fără preț valid — nu se presupune zero.</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produse afectate</div>
          <table className="mt-1 w-full text-sm">
            <tbody>
              {r.produse.slice(0, 12).map(p => (
                <tr key={p.produs} className="border-t">
                  <td className="py-1">{p.denumire}</td>
                  <td className="num py-1 text-right"><Valoare v={p.costLei} unitate="RON" /></td>
                  <td className="num py-1 text-right text-muted-foreground"><Valoare v={p.fcImpactPp} unitate="PP" /></td>
                </tr>
              ))}
              {r.produse.length === 0 && <tr><td className="py-1 text-muted-foreground">niciun produs în scop</td></tr>}
            </tbody>
          </table>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Restaurante afectate</div>
          <table className="mt-1 w-full text-sm">
            <tbody>
              {r.magazine.slice(0, 12).map(m => (
                <tr key={m.locatie} className="border-t">
                  <td className="py-1">{m.locatie}</td>
                  <td className="num py-1 text-right"><Valoare v={m.deltaCostLei} unitate="RON" /></td>
                  <td className="num py-1 text-right text-muted-foreground"><Valoare v={m.fcImpactPp} unitate="PP" /></td>
                </tr>
              ))}
              {r.magazine.length === 0 && <tr><td className="py-1 text-muted-foreground">niciun restaurant în scop</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Ingrediente() {
  const a = useIngrediente();
  const [panouActiv, setPanouActiv] = useState<IdPanou>('DRIVERE_FC');
  const [ales, setAles] = useState<string | null>(null);

  if (!a.disponibil) {
    return <Indisponibil titlu="Analiza de ingrediente nu e disponibilă" motiv={a.motivIndisponibil} />;
  }

  const panouri = panouriIngrediente(a);
  const panou = panouri.find(p => p.id === panouActiv) ?? panouri[0];

  return (
    <div className="space-y-6">
      <Sectiune titlu="Cine a mișcat FC-ul" sub={`${a.perioadaCurenta.cheie} vs ${a.perioadaPrecedenta?.cheie ?? '—'}`}>
        <div className="flex flex-wrap gap-1" role="tablist" data-zona="panouri">
          {panouri.map(p => (
            <button key={p.id} type="button" role="tab" data-panou={p.id}
              aria-selected={p.id === panou.id}
              onClick={() => setPanouActiv(p.id)}
              className={cx('rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors',
                p.id === panou.id ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}>
              {p.eticheta}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-md border bg-card" data-zona="tabel-ingrediente">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Ingredient</th>
                <th className="px-3 py-2 text-right">Δ preț</th>
                <th className="px-3 py-2 text-right">Impact cost</th>
                <th className="px-3 py-2 text-right">Impact FC</th>
                <th className="px-3 py-2 text-right">Produse</th>
                <th className="px-3 py-2 text-right">Restaurante</th>
                <th className="px-3 py-2 text-right">Încredere</th>
                <th className="px-3 py-2">Observație</th>
              </tr>
            </thead>
            <tbody>
              {panou.randuri.map(r => (
                <tr key={r.ingredient} className="cursor-pointer border-t hover:bg-muted/40"
                  data-rand-ingredient={r.ingredient} onClick={() => setAles(r.ingredient)}>
                  <td className="px-3 py-1.5"><b>{r.denumire}</b>
                    <span className="ml-1 text-xs text-muted-foreground">{r.ingredient}</span></td>
                  <td className="num px-3 py-1.5 text-right">
                    {r.deltaPretPct === null ? '—' : `${fmtPct(r.deltaPretPct, 1)}`}
                    {r.deltaPretLei !== null && <span className="ml-1 text-xs text-muted-foreground">{fmtLei(r.deltaPretLei, 2)}</span>}
                  </td>
                  <td className="num px-3 py-1.5 text-right"><Valoare v={r.impactCostRON} unitate="RON" /></td>
                  <td className="num px-3 py-1.5 text-right">{r.impactFcPp === null ? '—' : fmtPP(r.impactFcPp)}</td>
                  <td className="num px-3 py-1.5 text-right">{r.produseAfectate.length}</td>
                  <td className="num px-3 py-1.5 text-right">{r.magazineAfectate.length}</td>
                  <td className="num px-3 py-1.5 text-right" title={r.motiveConfidenta.join('; ')}>{r.confidence}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.nota ?? ''}</td>
                </tr>
              ))}
              {panou.randuri.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">Niciun ingredient cu această metrică.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Ordonat după: {panou.baza}. Încredere = {formulaConfidentaIngredient}.
          {panou.excluse.length > 0 && ` Excluse (metrica lipsește): ${panou.excluse.slice(0, 10).join(', ')}.`}
        </p>
      </Sectiune>

      {ales && <Detaliu ingredient={ales} onInchide={() => setAles(null)} />}

      {a.anomalii.length > 0 && (
        <Sectiune titlu="Anomalii" sub="praguri deterministe, scrise în fiecare rând">
          <div className="space-y-1" data-zona="anomalii">
            {a.anomalii.slice(0, 15).map((an, i) => (
              <div key={i} className="rounded-md border bg-card px-3 py-2 text-sm" data-anomalie={an.tip}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <Insigna fel="warn">{ETICHETA_ANOMALIE[an.tip]}</Insigna>
                  <b>{an.denumire}</b>
                  {an.lei !== null && <span className="num text-xs">{fmtLei(an.lei, 0)}</span>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{an.detaliu}</div>
              </div>
            ))}
          </div>
        </Sectiune>
      )}
    </div>
  );
}
