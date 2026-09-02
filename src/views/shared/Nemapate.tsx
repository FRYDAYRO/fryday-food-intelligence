import { useMemo, useState } from 'react';
import { useStore } from '../../lib/store';
import type { AppState } from '../../lib/types';
import { fmtInt } from '../../lib/engine';
import { codProdusPentru, coadaAprobare, rezumaCoada } from '../../lib/aprobare';
import type { IntrareAprobare, SugestieAprobare } from '../../lib/aprobare';
import { Btn, Insigna, Sel, T, Td, Th, Titlu, cx } from '../../lib/ui';

/**
 * Coada de aprobare a denumirilor din POS care nu s-au potrivit cu nomenclatorul.
 *
 * Ecranul nu decide nimic și nu calculează nimic: cere coada motorului canonic
 * (`coadaAprobare`), care o ordonează după cât cântărește fiecare rând în lei și îi atașează
 * sugestiile scorate. Aici se desenează, atât.
 *
 * Regula care guvernează ecranul: **nimic nu se aplică de la sine.** Sugestiile sunt propuneri
 * vizibile, cu scorul lor la vedere; niciuna nu e preselectată în listă. Un clic pe o sugestie
 * o pune în selector — tot omul apasă „Alocă". Înainte, cea mai bună potrivire era preselectată
 * tăcut, deci un „Alocă" apăsat din reflex aplica o ghicire.
 */

/** O sugestie, ca buton: se selectează la clic, nu se aplică. */
function Sugestie({ s, activ, onAlege }: {
  s: SugestieAprobare; activ: boolean; onAlege: () => void;
}) {
  return (
    <button type="button" onClick={onAlege} title={s.explicatie} data-sugestie={s.tinta}
      aria-pressed={activ}
      className={cx('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] transition-colors',
        activ ? 'border-primary bg-primary/10 font-semibold' : 'bg-card hover:bg-muted')}>
      <span className="max-w-[13rem] truncate">{s.tinta}</span>
      <span className="num text-muted-foreground">{s.scor}%</span>
    </button>
  );
}

/**
 * Ecranul propriu-zis, cu starea primită ca parametru — randabil și în teste, fără store.
 * `Nemapate` de mai jos e doar firul care îl leagă de aplicație.
 */
export function CoadaAprobare({ state, atribuieAlias, renuntaNemapat }: {
  state: AppState;
  atribuieAlias: (denumire: string, codProdus: string) => void;
  renuntaNemapat: (denumire: string) => void;
}) {
  const [alegeri, setAlegeri] = useState<Record<string, string>>({});
  const [doarCuValoare, setDoarCuValoare] = useState(true);

  // coada canonică: ordonată după lei, cu sugestiile deja calculate de motor
  const coada = useMemo(() => coadaAprobare(state), [state.nemapate, state.produse]);
  const lista = useMemo(
    () => coada.filter(x => !doarCuValoare || x.greutate > 0),
    [coada, doarCuValoare],
  );
  const rezumat = useMemo(() => rezumaCoada(lista), [lista]);

  const produseSortate = useMemo(
    () => [...state.produse].sort((a, b) => a.denumire.localeCompare(b.denumire)), [state.produse]);
  const totalCant = lista.reduce((s, x) => s + (state.nemapate.find(n => n.denumire === x.valoareSursa)?.cant ?? 0), 0);

  if (!coada.length) return null;

  /** Sugestia → codul produsului. Traducerea e a motorului; ecranul doar o folosește. */
  const codPentru = (s: SugestieAprobare) => codProdusPentru(s.tinta, state);

  return (
    <div className="mt-5" data-zona="coada-aprobare">
      <Titlu actiuni={
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={doarCuValoare} onChange={e => setDoarCuValoare(e.target.checked)} />
          doar cele cu venit (ascunde componentele de meniu)
        </label>
      }>
        Denumiri POS nealocate — {rezumat.total} poziții, {fmtInt(totalCant)} buc, {fmtInt(rezumat.greutateRON)} lei
      </Titlu>

      <p className="mb-2 text-sm text-muted-foreground">
        Acestea sunt denumirile din raportul POS care nu s-au potrivit cu niciun produs din nomenclator, deci
        vânzările lor nu intră în Food Cost. Lista e ordonată după lei — primul rând e cel care doare.
        Alege produsul corect și apasă <b>Alocă</b>: denumirea se salvează ca alias, iar la următorul import se
        potrivește automat. Pentru ca vânzările deja importate să fie atribuite, reimportă raportul după ce
        termini alocările.
        {rezumat.cuSugestii < rezumat.total && (
          <> <b>{rezumat.total - rezumat.cuSugestii}</b> poziții nu au nicio sugestie — cer o decizie de la zero.</>
        )}
      </p>

      <T dens>
        <thead><tr>
          <Th>#</Th><Th>Denumire din POS</Th><Th>Categorie</Th><Th>Din fișierul</Th>
          <Th dr>Bucăți</Th><Th dr>Valoare</Th><Th>Sugestii</Th><Th>Produs din nomenclator</Th><Th />
        </tr></thead>
        <tbody>
          {lista.map((x: IntrareAprobare, i) => {
            // NIMIC preselectat: selectorul e gol până când omul alege, din listă sau dintr-o sugestie
            const ales = alegeri[x.id] ?? '';
            const brut = state.nemapate.find(n => n.denumire === x.valoareSursa);
            return (
              <tr key={x.id} data-intrare={x.id}>
                <Td className="num text-muted-foreground">{i + 1}</Td>
                <Td className="font-semibold">{x.valoareSursa}</Td>
                <Td className="text-xs text-muted-foreground">{brut?.categorie ?? '—'}</Td>
                <Td className="text-xs text-muted-foreground">
                  <span data-camp="sursa">{x.sursa || '—'}</span>
                </Td>
                <Td dr>{fmtInt(brut?.cant ?? 0)}</Td>
                <Td dr>{fmtInt(x.greutate)}</Td>
                <Td>
                  {x.sugestii.length ? (
                    <div className="flex flex-wrap gap-1" data-zona="sugestii">
                      {x.sugestii.slice(0, 3).map(s => {
                        const cod = codPentru(s);
                        return cod ? (
                          <Sugestie key={s.tinta} s={s} activ={ales === cod}
                            onAlege={() => setAlegeri({ ...alegeri, [x.id]: cod })} />
                        ) : (
                          <span key={s.tinta} className="text-[11px] text-orange-700"
                            title="Două produse poartă aceeași denumire — alege din listă">
                            {s.tinta} (omonim)
                          </span>
                        );
                      })}
                    </div>
                  ) : <Insigna fel="warn">fără sugestii</Insigna>}
                </Td>
                <Td>
                  <Sel className="h-8 w-64" data-camp="produs" value={ales}
                    onChange={e => setAlegeri({ ...alegeri, [x.id]: e.target.value })}>
                    <option value="">— alege produsul —</option>
                    {produseSortate.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
                  </Sel>
                </Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Btn className="h-8" disabled={!ales}
                      onClick={() => atribuieAlias(x.valoareSursa, ales)}>Alocă</Btn>
                    <Btn className="h-8" varianta="discret"
                      onClick={() => renuntaNemapat(x.valoareSursa)}>Lasă nemapat</Btn>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </T>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Procentul de lângă o sugestie spune cât din cuvinte coincid — <b>e ordinea în care merită să te uiți,
        nu o certitudine</b>. Nimic nu se alege de la sine: chiar și o potrivire de 100% cere confirmarea ta,
        pentru că două produse pot diferi printr-un singur cuvânt. „Lasă nemapat" scoate denumirea din coadă
        fără să creeze alias — util pentru garanții SGR, jucării, pungi, lucruri care nu au rețetă.
      </p>
    </div>
  );
}

export default function Nemapate() {
  const { state, atribuieAlias, renuntaNemapat } = useStore();
  return <CoadaAprobare state={state} atribuieAlias={atribuieAlias} renuntaNemapat={renuntaNemapat} />;
}
