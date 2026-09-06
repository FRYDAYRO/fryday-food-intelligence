import { useMemo, useState } from 'react';
import { useStore } from '../../lib/store';
import type { AppState } from '../../lib/types';
import { fmtInt } from '../../lib/engine';
import { codIngredientPentru, codProdusPentru, coadaAprobare, felNemapat, rezumaCoada } from '../../lib/aprobare';
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
export function CoadaAprobare({ state, atribuieAlias, atribuieAliasIngredient, renuntaNemapat }: {
  state: AppState;
  atribuieAlias: (denumire: string, codProdus: string) => void;
  /** Materialele 2.9 se leagă de un ingredient; fără această acțiune rândul lor nu are „Alocă". */
  atribuieAliasIngredient?: (identitate: string, codIngredient: string) => void;
  renuntaNemapat: (denumire: string, fel?: 'PRODUS' | 'MATERIAL') => void;
}) {
  const [alegeri, setAlegeri] = useState<Record<string, string>>({});
  const [doarCuValoare, setDoarCuValoare] = useState(true);

  // coada canonică: ordonată după lei, cu sugestiile deja calculate de motor
  const coada = useMemo(() => coadaAprobare(state), [state.nemapate, state.produse, state.ingrediente]);
  const lista = useMemo(
    () => coada.filter(x => !doarCuValoare || x.greutate > 0),
    [coada, doarCuValoare],
  );
  const rezumat = useMemo(() => rezumaCoada(lista), [lista]);

  const produseSortate = useMemo(
    () => [...state.produse].sort((a, b) => a.denumire.localeCompare(b.denumire)), [state.produse]);
  const ingredienteSortate = useMemo(
    () => [...state.ingrediente].sort((a, b) => a.denumire.localeCompare(b.denumire)), [state.ingrediente]);
  const totalCant = lista.reduce((s, x) => s + (state.nemapate.find(n => n.denumire === x.valoareSursa)?.cant ?? 0), 0);

  if (!coada.length) return null;

  /** Sugestia → codul produsului sau al ingredientului. Traducerea e a motorului; ecranul doar o folosește. */
  const codPentru = (x: IntrareAprobare, s: SugestieAprobare) =>
    (x.fel === 'MATERIAL' ? codIngredientPentru(s.tinta, state) : codProdusPentru(s.tinta, state));

  return (
    <div className="mt-5" data-zona="coada-aprobare">
      <Titlu actiuni={
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={doarCuValoare} onChange={e => setDoarCuValoare(e.target.checked)} />
          doar cele cu venit (ascunde componentele de meniu)
        </label>
      }>
        Nealocate — {rezumat.total} poziții ({rezumat.peFel.PRODUS} denumiri POS, {rezumat.peFel.MATERIAL} materiale 2.9),
        {' '}{fmtInt(totalCant)} buc, {fmtInt(rezumat.greutateRON)} lei
      </Titlu>

      <p className="mb-2 text-sm text-muted-foreground">
        Denumirile din POS care nu s-au potrivit cu niciun produs și materialele din 2.9 fără corespondent în
        nomenclatorul de ingrediente. Lista e ordonată după lei — primul rând e cel care doare.
        Alege produsul sau ingredientul corect și apasă <b>Alocă</b>: identitatea se salvează ca alias, iar la
        următorul import se potrivește automat. Pentru ca datele deja importate să fie atribuite, reimportă
        raportul după ce termini alocările.
        {rezumat.cuSugestii < rezumat.total && (
          <> <b>{rezumat.total - rezumat.cuSugestii}</b> poziții nu au nicio sugestie — cer o decizie de la zero.</>
        )}
      </p>

      <T dens>
        <thead><tr>
          <Th>#</Th><Th>Denumire din POS / material 2.9</Th><Th>Categorie</Th><Th>Din fișierul</Th>
          <Th dr>Bucăți</Th><Th dr>Valoare</Th><Th>Sugestii</Th><Th>Produs sau ingredient din nomenclator</Th><Th />
        </tr></thead>
        <tbody>
          {lista.map((x: IntrareAprobare, i) => {
            // NIMIC preselectat: selectorul e gol până când omul alege, din listă sau dintr-o sugestie
            const ales = alegeri[x.id] ?? '';
            const brut = state.nemapate.find(n => n.denumire === x.valoareSursa && felNemapat(n) === x.fel);
            const eMaterial = x.fel === 'MATERIAL';
            return (
              <tr key={x.id} data-intrare={x.id} data-fel={x.fel}>
                <Td className="num text-muted-foreground">{i + 1}</Td>
                <Td className="font-semibold">
                  {x.valoareSursa}
                  {eMaterial && <span className="ml-1.5"><Insigna fel="info">material 2.9</Insigna></span>}
                </Td>
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
                        const cod = codPentru(x, s);
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
                  <Sel className="h-8 w-64" data-camp={eMaterial ? 'ingredient' : 'produs'} value={ales}
                    onChange={e => setAlegeri({ ...alegeri, [x.id]: e.target.value })}>
                    <option value="">{eMaterial ? '— alege ingredientul —' : '— alege produsul —'}</option>
                    {eMaterial
                      ? ingredienteSortate.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)
                      : produseSortate.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
                  </Sel>
                </Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Btn className="h-8" disabled={!ales || (eMaterial && !atribuieAliasIngredient)}
                      onClick={() => (eMaterial ? atribuieAliasIngredient?.(x.valoareSursa, ales) : atribuieAlias(x.valoareSursa, ales))}>Alocă</Btn>
                    <Btn className="h-8" varianta="discret"
                      onClick={() => renuntaNemapat(x.valoareSursa, x.fel === 'MATERIAL' ? 'MATERIAL' : 'PRODUS')}>Lasă nemapat</Btn>
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
  const { state, atribuieAlias, atribuieAliasIngredient, renuntaNemapat } = useStore();
  return <CoadaAprobare state={state} atribuieAlias={atribuieAlias} atribuieAliasIngredient={atribuieAliasIngredient} renuntaNemapat={renuntaNemapat} />;
}
