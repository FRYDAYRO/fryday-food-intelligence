/**
 * Simulări — what-if pe preț, gramaj și mix. Motorul lucrează pe o COPIE a modelului:
 * niciun buton de aici nu scrie în datele reale.
 */
import { useMemo, useState } from 'react';
import { fmtLei, fmtPP, fmtPct } from '../../lib/engine';
import { Btn, Camp, In, Sel } from '../../lib/ui';
import {
  formSimulareGol, rezumatSimulare, scenariuDin, scenariuGol, type FormSimulare,
} from '../../lib/fc-tower';
import { useTower } from './context';
import { useSimulare } from './date';
import { Indisponibil, Sectiune, Valoare } from './parti';

const numar = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export default function Simulari() {
  const { state } = useTower();
  const [form, setForm] = useState<FormSimulare>(formSimulareGol());
  const scenariu = useMemo(() => scenariuDin(form), [form]);
  const sim = useSimulare(scenariu);
  const r = rezumatSimulare(sim);
  const gol = scenariuGol(scenariu);

  const componenteProdus = useMemo(() => {
    if (!form.produs) return [];
    const reteta = state.retete.find(x => x.cod === form.produs);
    const v = reteta?.versiuni.find(x => x.nr === reteta.activa) ?? reteta?.versiuni[0];
    return v?.linii.map(l => l.comp) ?? [];
  }, [state.retete, form.produs]);

  const set = (patch: Partial<FormSimulare>) => setForm({ ...form, ...patch });

  return (
    <div className="space-y-6">
      <Sectiune titlu="Scenariu" sub="simularea nu atinge niciodată datele reale"
        actiuni={<Btn varianta="linie" onClick={() => setForm(formSimulareGol())}>Golește</Btn>}>
        <div className="grid gap-3 rounded-md border bg-card p-4 lg:grid-cols-3" data-zona="formular">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Preț de ingredient</div>
            <Camp eticheta="Ingredient">
              <Sel data-camp="ingredient" value={form.ingredient ?? ''}
                onChange={e => set({ ingredient: e.target.value || null })}>
                <option value="">—</option>
                {state.ingrediente.filter(i => i.activ).map(i => (
                  <option key={i.cod} value={i.cod}>{i.denumire}</option>
                ))}
              </Sel>
            </Camp>
            <Camp eticheta="Preț nou (lei / UM de bază)">
              <In data-camp="pretNou" inputMode="decimal" value={form.pretNou ?? ''}
                onChange={e => set({ pretNou: numar(e.target.value) })} />
            </Camp>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Gramaj de rețetă</div>
            <Camp eticheta="Produs">
              <Sel data-camp="produs" value={form.produs ?? ''}
                onChange={e => set({ produs: e.target.value || null, component: null })}>
                <option value="">—</option>
                {state.produse.filter(p => p.activ).map(p => (
                  <option key={p.cod} value={p.cod}>{p.denumire}</option>
                ))}
              </Sel>
            </Camp>
            <Camp eticheta="Componentă">
              <Sel data-camp="component" value={form.component ?? ''} disabled={!form.produs}
                onChange={e => set({ component: e.target.value || null })}>
                <option value="">—</option>
                {componenteProdus.map(c => <option key={c} value={c}>{c}</option>)}
              </Sel>
            </Camp>
            <Camp eticheta="Cantitate nouă (UM-ul liniei)">
              <In data-camp="cantNoua" inputMode="decimal" value={form.cantNoua ?? ''}
                onChange={e => set({ cantNoua: numar(e.target.value) })} />
            </Camp>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Mix (PMIX)</div>
            <Camp eticheta="Produs">
              <Sel data-camp="pmixProdus" value={form.pmixProdus ?? ''}
                onChange={e => set({ pmixProdus: e.target.value || null })}>
                <option value="">—</option>
                {state.produse.filter(p => p.activ).map(p => (
                  <option key={p.cod} value={p.cod}>{p.denumire}</option>
                ))}
              </Sel>
            </Camp>
            <Camp eticheta="Factor de volum (1 = neschimbat, 0 = scos din mix)">
              <In data-camp="pmixFactor" inputMode="decimal" value={form.pmixFactor ?? ''}
                onChange={e => set({ pmixFactor: numar(e.target.value) })} />
            </Camp>
          </div>
        </div>
      </Sectiune>

      {gol
        ? <Indisponibil titlu="Niciun scenariu definit" motiv="Completează cel puțin o pârghie: preț, gramaj sau mix." />
        : !r.disponibil
          ? <Indisponibil titlu="Simularea nu se poate rula" motiv={r.motiv ?? undefined} />
          : (
            <>
              <Sectiune titlu="Rezultat">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-zona="rezultat">
                  <div className="rounded-md border bg-card px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">FC curent</div>
                    <div className="num mt-1 text-xl font-semibold"><Valoare v={r.fcCurent} unitate="PCT" /></div>
                  </div>
                  <div className="rounded-md border bg-card px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">FC scenariu</div>
                    <div className="num mt-1 text-xl font-semibold"><Valoare v={r.fcScenariu} unitate="PCT" /></div>
                  </div>
                  <div className="rounded-md border bg-card px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Δ FC</div>
                    <div className="num mt-1 text-xl font-semibold">{r.deltaPp === null ? '—' : fmtPP(r.deltaPp)}</div>
                  </div>
                  <div className="rounded-md border bg-card px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Δ cost</div>
                    <div className="num mt-1 text-xl font-semibold">{fmtLei(r.deltaRON ?? 0, 0)}</div>
                    {r.deltaPct !== null && <div className="text-xs text-muted-foreground">{fmtPct(r.deltaPct, 1)} față de costul curent</div>}
                  </div>
                </div>
              </Sectiune>

              <Sectiune titlu="Efectele, separate" sub="fiecare dimensiune aplicată singură, pe același baseline">
                <div className="overflow-x-auto rounded-md border bg-card" data-zona="efecte">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Efect</th>
                        <th className="px-3 py-2 text-right">Cost (lei)</th>
                        <th className="px-3 py-2 text-right">FC (pp)</th>
                        <th className="px-3 py-2">Explicație</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.efecte.map(e => (
                        <tr key={e.id} className="border-t align-top" data-efect={e.id}>
                          <td className="px-3 py-1.5 font-semibold">{e.eticheta}</td>
                          <td className="num px-3 py-1.5 text-right">{fmtLei(e.costLei, 0)}</td>
                          <td className="num px-3 py-1.5 text-right">{e.fcPp === null ? '—' : fmtPP(e.fcPp)}</td>
                          <td className="px-3 py-1.5 text-xs text-muted-foreground">{e.explicatie}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Identitatea motorului: {r.identitate}. Efectele în pp NU se adună între ele — numitorii diferă.
                </p>
              </Sectiune>

              <Sectiune titlu="Ce a fost atins">
                <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4" data-zona="afectate">
                  {([
                    ['Ingrediente', r.afectate.ingrediente], ['Produse', r.afectate.produse],
                    ['Restaurante', r.afectate.magazine], ['Perioade', r.afectate.perioade],
                  ] as [string, string[]][]).map(([et, lista]) => (
                    <div key={et} className="rounded-md border bg-card px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{et}</div>
                      <div className="mt-0.5 text-sm">{lista.length ? lista.slice(0, 8).join(', ') : '—'}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Încredere {r.confidenta}/100 · acoperire rețete {r.acoperire === null ? '—' : fmtPct(r.acoperire, 1)}.
                  {r.ingredienteFaraPret.length > 0 && ` Componente fără preț valid: ${r.ingredienteFaraPret.slice(0, 8).join(', ')}.`}
                </p>
                {!r.complete && (
                  <ul className="mt-1 list-inside list-disc text-[11px] text-muted-foreground">
                    {r.motiveIncomplet.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                )}
              </Sectiune>
            </>
          )}
    </div>
  );
}
