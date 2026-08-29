/**
 * NBO 2.9 — consumul raportat, așa cum îl vede puntea: pe material, cu categoria brută,
 * regula care a clasificat-o și legătura (sau lipsa ei) cu nomenclatorul și rețetarul.
 */
import { fmtLei } from '../../lib/engine';
import { Insigna } from '../../lib/ui';
import { ETICHETA_COMPONENTA_BRIDGE } from '../../lib/fc-bridge';
import { etichetaCanal } from '../../lib/fc-domeniu';
import { punteTower } from '../../lib/fc-tower';
import { usePunte } from './date';
import { Indisponibil, Sectiune, Valoare } from './parti';

export default function Nbo29() {
  const bridge = usePunte();
  const punte = punteTower(bridge);

  if (!punte.disponibil) {
    return <Indisponibil titlu="Raportul 2.9 nu acoperă această selecție" motiv={punte.motiv ?? undefined} />;
  }

  const randuri = [...bridge.randuri].sort((a, b) => b.costActual - a.costActual).slice(0, 60);

  return (
    <div className="space-y-6">
      <Sectiune titlu="Sursa" sub={`perioade: ${bridge.perioadeSursa.join(', ') || '—'}`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-card px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Consum total 2.9</div>
            <div className="num mt-1 text-xl font-semibold">{fmtLei(bridge.nboActual, 0)}</div>
          </div>
          <div className="rounded-md border bg-card px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Din care Food Cost</div>
            <div className="num mt-1 text-xl font-semibold">{fmtLei(bridge.nboFoodCost, 0)}</div>
          </div>
          <div className="rounded-md border bg-card px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Teoretic declarat</div>
            <div className="num mt-1 text-xl font-semibold">
              {bridge.nboTheoreticalFC === null
                ? <span className="text-base font-medium text-muted-foreground">nedeclarat</span>
                : fmtLei(bridge.nboTheoreticalFC, 0)}
            </div>
          </div>
          <div className="rounded-md border bg-card px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Canalul sursei</div>
            <div className="mt-1 text-xl font-semibold">{etichetaCanal(bridge.canalSursa)}</div>
            {bridge.canalSursa === 'UNKNOWN' && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Raportul nu declară canalul — repartiția pe InStore/Delivery nu se inventează.
              </div>
            )}
          </div>
        </div>
      </Sectiune>

      <Sectiune titlu="Materialele raportate" sub={`primele ${randuri.length} din ${bridge.randuri.length}, după cost actual`}>
        <div className="overflow-x-auto rounded-md border bg-card" data-zona="materiale29">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2">Categorie în raport</th>
                <th className="px-3 py-2">Clasificare</th>
                <th className="px-3 py-2">Componentă</th>
                <th className="px-3 py-2">Restaurant</th>
                <th className="px-3 py-2 text-right">Cost actual</th>
                <th className="px-3 py-2 text-right">Cost teoretic</th>
                <th className="px-3 py-2">Legături</th>
              </tr>
            </thead>
            <tbody>
              {randuri.map(r => {
                const contributie = bridge.componente
                  .flatMap(c => c.contributii)
                  .find(c => c.material === r.material && c.locatie === r.locatie && c.perioadaSursa === r.perioadaSursa);
                return (
                  <tr key={`${r.material}|${r.locatie ?? ''}|${r.perioadaSursa}`} className="border-t align-top">
                    <td className="px-3 py-1.5"><b>{r.denumire}</b>
                      <span className="ml-1 text-xs text-muted-foreground">{r.material}</span></td>
                    <td className="px-3 py-1.5 text-xs">{r.categorieBruta}</td>
                    <td className="px-3 py-1.5 text-xs">
                      {r.categorie === 'UNCLASSIFIED'
                        ? <Insigna fel="EXCLUS">neclasificat</Insigna>
                        : <span>{r.categorie}</span>}
                      {r.clasificare.regula && <div className="text-muted-foreground">regula „{r.clasificare.regula}"</div>}
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      {contributie ? ETICHETA_COMPONENTA_BRIDGE[contributie.componenta] : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      {r.locatie ?? <span className="text-muted-foreground">fără restaurant</span>}
                    </td>
                    <td className="num px-3 py-1.5 text-right">{fmtLei(r.costActual, 0)}</td>
                    <td className="num px-3 py-1.5 text-right"><Valoare v={r.costTeoretic} unitate="RON" /></td>
                    <td className="px-3 py-1.5 text-xs">
                      {r.areIngredient ? <span>ingredient {r.ingredient}</span> : <Insigna fel="warn">fără ingredient</Insigna>}
                      {r.areReteta
                        ? <div className="text-muted-foreground">{r.utilizareInRetete} rețete</div>
                        : <div className="text-muted-foreground">nicio rețetă</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Sectiune>

      {bridge.diagnostice.length > 0 && (
        <Sectiune titlu="Diagnostice pe sursă">
          <ul className="space-y-1 text-sm">
            {bridge.diagnostice.map((d, i) => (
              <li key={i} className="rounded-md border bg-card px-3 py-2">
                <b>{d.titlu}</b> <span className="text-xs uppercase text-muted-foreground">{d.nivel}</span>
                <div className="text-xs text-muted-foreground">{d.detaliu}</div>
              </li>
            ))}
          </ul>
        </Sectiune>
      )}
    </div>
  );
}
