/**
 * AI Advisor — ecranul care arată dosarul de dovezi și explicația lui.
 *
 * Tot ce se vede aici vine din `fc-advisor.ts` (determinist) și `fc-advisor-llm.ts`
 * (exprimarea). Ecranul nu calculează nimic și nu poate adăuga o cifră care nu e în dosar.
 */
import { useMemo, useState } from 'react';
import { fmtLei, fmtPP, fmtPct } from '../../lib/engine';
import { Insigna, cx } from '../../lib/ui';
import {
  ETICHETA_CAUZA, MESAJ_INSUFICIENT, dosarAdvisor,
  type Cifra, type DosarAdvisor, type Miscare, type Prioritate,
} from '../../lib/fc-advisor';
import { naratorDeterminist } from '../../lib/fc-advisor-llm';
import { useTower } from './context';
import { Indisponibil, Sectiune } from './parti';

const CULOARE_PRIORITATE: Record<Prioritate, 'EXCLUS' | 'warn' | 'info' | 'ok'> = {
  CRITICA: 'EXCLUS', MARE: 'warn', MEDIE: 'info', MICA: 'ok',
};

/** O cifră cu proveniență: valoarea, iar la hover câmpul exact din motor. */
function C({ c }: { c: Cifra }) {
  if (c.valoare === null) {
    return <span className="text-muted-foreground" title={c.indisponibilDe}>{MESAJ_INSUFICIENT}</span>;
  }
  const text = c.unitate === 'RON' ? fmtLei(c.valoare, 0)
    : c.unitate === 'PP' ? fmtPP(c.valoare)
      : c.unitate === 'BUC' ? String(Math.round(c.valoare))
        : fmtPct(c.valoare, 1);
  return (
    <span className="num" data-cifra={c.eticheta}
      title={`${c.referinta.motor} · ${c.referinta.camp} · ${c.referinta.scop}`}>
      {text}
    </span>
  );
}

function ListaMiscari({ titlu, m }: { titlu: string; m: Miscare[] }) {
  return (
    <div className="rounded-md border bg-card p-3" data-lista={titlu}>
      <div className="text-sm font-bold">{titlu}</div>
      {m.length === 0
        ? <div className="mt-1 text-sm text-muted-foreground">{MESAJ_INSUFICIENT}</div>
        : (
          <ul className="mt-1 space-y-1 text-sm">
            {m.map(x => (
              <li key={`${x.tip}-${x.subiect}`} className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">{x.denumire}</span>
                <C c={x.lei} />
                {x.pp.valoare !== null && <span className="text-muted-foreground">(<C c={x.pp} />)</span>}
                <span className="text-xs text-muted-foreground">încredere {x.confidenta}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

function Explicatie({ d }: { d: DosarAdvisor }) {
  const e = d.explicatie;
  if (!e.disponibil) return <Indisponibil titlu={MESAJ_INSUFICIENT} motiv={e.motiv ?? undefined} />;
  return (
    <div className="space-y-2" data-zona="explicatie">
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Cauză</th>
              <th className="px-3 py-2 text-right">Lei</th>
              <th className="px-3 py-2 text-right">pp</th>
              <th className="px-3 py-2">Ce s-a măsurat</th>
              <th className="px-3 py-2">Principalii contribuitori</th>
            </tr>
          </thead>
          <tbody>
            {e.cauze.map(c => (
              <tr key={c.cauza} className="border-t align-top" data-cauza={c.cauza}>
                <td className="px-3 py-1.5 font-semibold">{ETICHETA_CAUZA[c.cauza]}</td>
                <td className="px-3 py-1.5 text-right"><C c={c.lei} /></td>
                <td className="px-3 py-1.5 text-right"><C c={c.pp} /></td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">{c.descriere}</td>
                <td className="px-3 py-1.5 text-xs">
                  {c.contribuitori.length
                    ? c.contribuitori.map(x => `${x.denumire} (${fmtLei(x.lei, 0)})`).join(', ')
                    : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">{e.verificareIdentitate}</p>
      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900" data-zona="nota-neexplicat">
        {e.notaNeexplicat}
      </p>
    </div>
  );
}

export default function AiAdvisor() {
  const { state, ctx, sel, acces } = useTower();
  const [aratNaratiune, setAratNaratiune] = useState(false);
  const d = useMemo(
    () => dosarAdvisor(state, ctx, { selectie: sel, acces }),
    [state, ctx, sel.ancora, sel.granularitate, sel.comparatie, sel.scop, sel.locatie, sel.canal, acces],
  );

  return (
    <div className="space-y-6">
      <Sectiune titlu="Stare FC" sub={d.scop.descriere}
        actiuni={<span className="text-xs text-muted-foreground">încredere {d.confidenta.scor}/100</span>}>
        <div className="rounded-md border bg-card p-4" data-zona="stare">
          <p className="text-sm">{d.stare.disponibil ? d.stare.rezumat : (d.stare.motiv ?? MESAJ_INSUFICIENT)}</p>
          {d.stare.disponibil && (
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              {[d.stare.fcRetetar, d.stare.fcActualNbo, d.stare.variatie, d.stare.neexplicat].map(c => (
                <div key={c.eticheta} className="rounded-md border px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.eticheta}</div>
                  <div className="mt-0.5 text-lg font-semibold"><C c={c} /></div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-[11px] text-muted-foreground">{d.confidenta.formula}</div>
        </div>
      </Sectiune>

      <Sectiune titlu="De ce s-a schimbat FC-ul">
        <Explicatie d={d} />
      </Sectiune>

      <Sectiune titlu="Mișcări">
        <div className="grid gap-3 lg:grid-cols-2">
          <ListaMiscari titlu="Mișcări negative" m={d.miscariNegative} />
          <ListaMiscari titlu="Mișcări pozitive" m={d.miscariPozitive} />
        </div>
      </Sectiune>

      {d.restaurante.fcMare.length > 0 && (
        <Sectiune titlu="Restaurante">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <ListaMiscari titlu="FC cel mai mare" m={d.restaurante.fcMare} />
            <ListaMiscari titlu="Cea mai mare deteriorare" m={d.restaurante.deteriorare} />
            <ListaMiscari titlu="Cea mai mare îmbunătățire" m={d.restaurante.imbunatatire} />
            <ListaMiscari titlu="Cel mai mare neexplicat" m={d.restaurante.neexplicatMare} />
          </div>
          {d.restaurante.excluse.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Excluse din clasamente (metrica lipsește, nu e zero): {d.restaurante.excluse.join(', ')}.
            </p>
          )}
        </Sectiune>
      )}

      <Sectiune titlu="Acțiuni recomandate" sub="prioritatea e o regulă deterministă, nu o părere">
        {d.actiuni.length === 0
          ? <Indisponibil titlu={MESAJ_INSUFICIENT} />
          : (
            <div className="space-y-2" data-zona="actiuni">
              {d.actiuni.map((r, i) => (
                <div key={`${r.tip}-${i}`} className="rounded-md border bg-card p-3" data-actiune={r.tip}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Insigna fel={CULOARE_PRIORITATE[r.prioritate]}>{r.prioritate}</Insigna>
                    <b className="text-sm">{r.titlu}</b>
                    <span className="ml-auto text-xs text-muted-foreground">încredere {r.confidenta}</span>
                  </div>
                  <p className="mt-1 text-sm">{r.motiv}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm">
                    <span>Impact: <C c={r.impactLei} /></span>
                    {r.impactPp.valoare !== null && <span>FC: <C c={r.impactPp} /></span>}
                    <span className="text-muted-foreground">Scop: {r.scop}</span>
                  </div>
                  <details className="mt-1 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Dovadă și regulă de prioritate</summary>
                    <div className="mt-1">{r.dovada.calcul}</div>
                    <div className="mt-1">Prioritate: {r.regulaPrioritate}</div>
                    <div className="mt-1">
                      Surse: {r.dovada.referinte.map(x => `${x.motor}·${x.camp}`).join(' · ')}
                    </div>
                    {r.motiveConfidenta.length > 0 && <div className="mt-1">Încredere: {r.motiveConfidenta.join('; ')}</div>}
                  </details>
                </div>
              ))}
            </div>
          )}
      </Sectiune>

      <Sectiune titlu="Riscuri">
        {d.riscuri.length === 0
          ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
            Niciun risc peste pragurile deterministe.
          </div>
          : (
            <div className="space-y-1.5" data-zona="riscuri">
              {d.riscuri.map((r, i) => (
                <div key={`${r.tip}-${i}`} className="rounded-md border bg-card px-3 py-2 text-sm" data-risc={r.tip}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Insigna fel={CULOARE_PRIORITATE[r.prioritate]}>{r.prioritate}</Insigna>
                    <b>{r.titlu}</b>
                    {r.lei.valoare !== null && <C c={r.lei} />}
                    {r.pp.valoare !== null && <span className="text-muted-foreground">(<C c={r.pp} />)</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{r.detaliu}</div>
                </div>
              ))}
            </div>
          )}
      </Sectiune>

      <Sectiune titlu="Opțiuni what-if" sub="rulate pe o copie — datele reale rămân neatinse">
        {d.whatIf.length === 0
          ? <Indisponibil titlu={MESAJ_INSUFICIENT} motiv="Motorul de simulare nu are date suficiente pe acest scop." />
          : (
            <div className="space-y-2" data-zona="whatif">
              {d.whatIf.map((w, i) => (
                <div key={i} className="rounded-md border bg-card p-3" data-whatif={i}>
                  <div className="text-sm font-bold">{w.titlu}</div>
                  <div className="text-xs text-muted-foreground">{w.descriere}</div>
                  {w.disponibil
                    ? (
                      <div className="mt-1 flex flex-wrap gap-3 text-sm">
                        <span>Δ FC: <C c={w.deltaPp} /></span>
                        <span>Δ cost: <C c={w.deltaLei} /></span>
                        <span className="text-muted-foreground">
                          <C c={w.fcCurent} /> → <C c={w.fcScenariu} />
                        </span>
                        <span className="text-xs text-muted-foreground">încredere {w.confidenta}</span>
                      </div>
                    )
                    : <div className="mt-1 text-sm text-muted-foreground">{MESAJ_INSUFICIENT} {w.motiv}</div>}
                </div>
              ))}
              <p className="text-[11px] leading-snug text-muted-foreground">{d.whatIf[0].notaSemantica}</p>
            </div>
          )}
      </Sectiune>

      <Sectiune titlu="Avertismente de date">
        {d.avertismenteDate.length === 0
          ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
            Nicio problemă de date semnalată pe acest scop.
          </div>
          : (
            <div className="space-y-1.5" data-zona="avertismente">
              {d.avertismenteDate.map((a, i) => (
                <div key={`${a.cod}-${i}`} data-avertisment={a.cod}
                  className={cx('rounded-md border px-3 py-2 text-sm',
                    a.nivel === 'BLOCANT' ? 'border-red-200 bg-red-50 text-red-900'
                      : a.nivel === 'ATENTIE' ? 'border-orange-200 bg-orange-50 text-orange-900'
                        : 'border-sky-200 bg-sky-50 text-sky-900')}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <b>{a.titlu}</b>
                    <span className="text-[11px] font-semibold uppercase">{a.nivel}</span>
                  </div>
                  <div className="mt-0.5 text-xs">{a.detaliu}</div>
                  <div className="mt-0.5 text-[11px] opacity-80">{a.efectAsupraIncrederii}</div>
                </div>
              ))}
            </div>
          )}
      </Sectiune>

      {d.lipsuri.length > 0 && (
        <Sectiune titlu="Ce nu s-a putut produce">
          <ul className="list-inside list-disc rounded-md border bg-card p-3 text-sm" data-zona="lipsuri">
            {d.lipsuri.map((l, i) => <li key={i}><b>{l.sectiune}</b> — {l.motiv}</li>)}
          </ul>
        </Sectiune>
      )}

      <Sectiune titlu="Explicația în cuvinte"
        actiuni={
          <button type="button" onClick={() => setAratNaratiune(!aratNaratiune)}
            className="text-xs font-semibold text-primary underline">
            {aratNaratiune ? 'ascunde' : 'arată'}
          </button>
        }>
        <p className="text-xs text-muted-foreground">
          Textul de mai jos e generat determinist din dosarul de dovezi, fără model de limbaj.
          Când un narator e configurat pe server, el rescrie ACELEAȘI cifre — iar orice număr
          care nu apare în dovezi duce la respingerea textului și revenirea la varianta aceasta.
        </p>
        {aratNaratiune && (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border bg-card p-3 text-xs leading-relaxed"
            data-zona="naratiune">{naratorDeterminist(d)}</pre>
        )}
      </Sectiune>
    </div>
  );
}
