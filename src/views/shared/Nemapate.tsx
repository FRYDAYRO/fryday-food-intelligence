import { useMemo, useState } from 'react';
import { useStore } from '../../lib/store';
import { cheieDenumire } from '../../lib/salesmix';
import { fmtInt } from '../../lib/engine';
import { Btn, Insigna, Sel, T, Td, Th, Titlu } from '../../lib/ui';

/**
 * Alocarea denumirilor din POS care nu s-au potrivit cu nomenclatorul.
 * Lista e ordonată după valoare, nu alfabetic: primele rânduri sunt cele care contează.
 * Odată alocată, denumirea se salvează ca alias pe produs — la importurile următoare
 * potrivirea se face singură, deci munca nu se repetă.
 */
export default function Nemapate() {
  const { state, atribuieAlias, renuntaNemapat } = useStore();
  const [alegeri, setAlegeri] = useState<Record<string, string>>({});
  const [doarCuValoare, setDoarCuValoare] = useState(true);

  const lista = useMemo(() => [...state.nemapate]
    .filter(n => !doarCuValoare || n.valoare > 0)
    .sort((a, b) => b.valoare - a.valoare), [state.nemapate, doarCuValoare]);

  // sugestie automată: cea mai bună potrivire parțială pe cuvinte, ca punct de plecare
  const sugestii = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of lista) {
      const cuvinte = cheieDenumire(n.denumire).split(' ').filter(w => w.length > 2);
      if (!cuvinte.length) continue;
      let cel = '', scorMax = 0;
      for (const p of state.produse) {
        const cheieP = cheieDenumire(p.denumire);
        const potrivite = cuvinte.filter(w => cheieP.includes(w)).length;
        const scor = potrivite / cuvinte.length;
        if (scor > scorMax) { scorMax = scor; cel = p.cod; }
      }
      if (scorMax >= 0.5) m.set(n.denumire, cel);
    }
    return m;
  }, [lista, state.produse]);

  const produseSortate = useMemo(() => [...state.produse].sort((a, b) => a.denumire.localeCompare(b.denumire)), [state.produse]);
  const totalValoare = lista.reduce((s, n) => s + n.valoare, 0);
  const totalCant = lista.reduce((s, n) => s + n.cant, 0);

  if (!state.nemapate.length) return null;

  return (
    <div className="mt-5">
      <Titlu actiuni={
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={doarCuValoare} onChange={e => setDoarCuValoare(e.target.checked)} />
          doar cele cu venit (ascunde componentele de meniu)
        </label>
      }>Denumiri POS nealocate — {lista.length} poziții, {fmtInt(totalCant)} buc, {fmtInt(totalValoare)} lei</Titlu>

      <p className="mb-2 text-sm text-muted-foreground">
        Acestea sunt denumirile din raportul POS care nu s-au potrivit cu niciun produs din nomenclator, deci
        vânzările lor nu intră în Food Cost. Alege produsul corect și apasă <b>Aloca</b>: denumirea se salvează
        ca alias, iar la următorul import se potrivește automat. Pentru ca vânzările deja importate să fie
        atribuite, reimportă raportul după ce termini alocările.
      </p>

      <T dens>
        <thead><tr><Th>#</Th><Th>Denumire din POS</Th><Th>Categorie</Th><Th dr>Bucăți</Th><Th dr>Valoare</Th><Th>Produs din nomenclator</Th><Th /></tr></thead>
        <tbody>
          {lista.map((n, i) => {
            const ales = alegeri[n.denumire] ?? sugestii.get(n.denumire) ?? '';
            return (
              <tr key={n.denumire}>
                <Td className="num text-muted-foreground">{i + 1}</Td>
                <Td className="font-semibold">{n.denumire}</Td>
                <Td className="text-xs text-muted-foreground">{n.categorie}</Td>
                <Td dr>{fmtInt(n.cant)}</Td>
                <Td dr>{fmtInt(n.valoare)}</Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <Sel className="h-8 w-64" value={ales} onChange={e => setAlegeri({ ...alegeri, [n.denumire]: e.target.value })}>
                      <option value="">— alege produsul —</option>
                      {produseSortate.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
                    </Sel>
                    {!alegeri[n.denumire] && sugestii.has(n.denumire) && <Insigna fel="ok">sugerat</Insigna>}
                  </div>
                </Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Btn className="h-8" disabled={!ales} onClick={() => atribuieAlias(n.denumire, ales)}>Alocă</Btn>
                    <Btn className="h-8" varianta="discret" onClick={() => renuntaNemapat(n.denumire)}>Ignoră</Btn>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </T>
      <p className="mt-1.5 text-xs text-muted-foreground">
        „Sugerat" înseamnă că cel puțin jumătate din cuvintele denumirii POS apar în denumirea produsului —
        e un punct de plecare, nu o certitudine: verifică înainte de a aloca. „Ignoră" scoate denumirea din listă
        fără să creeze alias (util pentru garanții SGR, jucării, pungi — lucruri care nu au rețetă).
      </p>
    </div>
  );
}
