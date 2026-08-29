/**
 * Setări — contextul de lucru al turnului: cine ești, ce vezi, de unde vin datele
 * și ce ținte se folosesc la colorarea statusurilor.
 */
import { fmtPct } from '../../lib/engine';
import { Insigna } from '../../lib/ui';
import { descrieSelectie, origineDate } from '../../lib/fc-tower';
import { useTower } from './context';
import { Sectiune } from './parti';

export default function SetariTower() {
  const { state, sel, acces } = useTower();
  const origine = origineDate(state);

  return (
    <div className="space-y-6">
      <Sectiune titlu="Cine ești și ce vezi">
        <div className="space-y-2 rounded-md border bg-card p-4 text-sm" data-zona="acces">
          <div className="flex flex-wrap items-center gap-2">
            <Insigna fel={acces.rol === 'TOP_MANAGEMENT' ? 'ok' : 'info'}>{acces.rol}</Insigna>
            <span className="text-muted-foreground">derivat din rolul „{acces.rolSursa}"</span>
          </div>
          <div>Restaurante vizibile: <b>{acces.locatiiVizibile.join(', ') || '—'}</b></div>
          <div>Vederea pe companie: <b>{acces.poateVedeaCompania ? 'permisă' : 'blocată'}</b></div>
          <div>Import și scriere: <b>{acces.poateScrie ? 'permise' : 'blocate'}</b></div>
          <div>
            Filtrare aplicată de server:{' '}
            <b>{acces.enforcatPeServer ? 'da — datele vin deja filtrate' : 'nu'}</b>
          </div>
          {acces.avertismentEnforcement && (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-orange-900"
              data-zona="avertisment-enforcement">
              {acces.avertismentEnforcement}
            </div>
          )}
        </div>
      </Sectiune>

      <Sectiune titlu="De unde vin datele">
        <div className="rounded-md border bg-card p-4 text-sm" data-zona="origine" data-origine={origine.origine}>
          <div className="flex flex-wrap items-center gap-2">
            <Insigna fel={origine.origine === 'IMPORTAT' ? 'ok' : origine.origine === 'GOL' ? 'EXCLUS' : 'warn'}>
              {origine.eticheta}
            </Insigna>
          </div>
          <p className="mt-1 text-muted-foreground">{origine.detaliu}</p>
        </div>
      </Sectiune>

      <Sectiune titlu="Ținte de Food Cost" sub="statusul restaurantelor se colorează față de acestea">
        <div className="overflow-x-auto rounded-md border bg-card" data-zona="tinte">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Scop</th><th className="px-3 py-2 text-right">Țintă FC curat</th></tr>
            </thead>
            <tbody>
              {state.tinte.map(t => (
                <tr key={t.locatie} className="border-t">
                  <td className="px-3 py-1.5">{t.locatie}</td>
                  <td className="num px-3 py-1.5 text-right">{fmtPct(t.fcCurat, 1)}</td>
                </tr>
              ))}
              {state.tinte.length === 0 && (
                <tr><td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                  Nicio țintă definită — statusurile rămân neutre, nu se inventează un prag.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Țintele se editează în modulul Setări al aplicației. Aici sunt doar afișate, ca să se vadă
          pe ce se bazează culorile din tabelul de restaurante.
        </p>
      </Sectiune>

      <Sectiune titlu="Scopul curent">
        <div className="rounded-md border bg-card px-3 py-2 text-sm" data-zona="scop-curent">{descrieSelectie(sel)}</div>
      </Sectiune>
    </div>
  );
}
