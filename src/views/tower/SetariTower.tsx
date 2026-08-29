/**
 * Setări — contextul de lucru al turnului: cine ești, ce vezi, de unde vin datele
 * și ce ținte se folosesc la colorarea statusurilor.
 */
import { fmtPct } from '../../lib/engine';
import { Insigna } from '../../lib/ui';
import { descrieSelectie, origineDate } from '../../lib/fc-tower';
import { etichetaScop } from '../../lib/fc-acces';
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
          <div>Scop curent: <b data-zona="eticheta-scop">{etichetaScop(acces.context)}</b></div>
          <div>Canale permise: <b>{acces.context.channelAccess.join(', ')}</b></div>
          <div>
            Unde e impusă restricția:{' '}
            <b>{acces.context.enforcement === 'SERVER' ? 'pe server' : 'doar în client'}</b>
          </div>
          <div className="text-xs text-muted-foreground">{acces.context.motivEnforcement}</div>
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
            <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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

      <Sectiune titlu="Urma de acces" sub="ultimele acțiuni înregistrate pe această stare">
        <div className="overflow-x-auto rounded-md border bg-card" data-zona="audit-acces">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Când</th><th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Acțiune</th><th className="px-3 py-2">Scop</th>
                <th className="px-3 py-2">Rezultat</th><th className="px-3 py-2">Detaliu</th>
              </tr>
            </thead>
            <tbody>
              {[...(state.auditAcces ?? [])].reverse().slice(0, 25).map(x => (
                <tr key={x.id} className="border-t align-top" data-audit={x.actiune}>
                  <td className="num px-3 py-1.5 text-xs">{x.data.slice(0, 19).replace('T', ' ')}</td>
                  <td className="px-3 py-1.5 text-xs">{x.actor}</td>
                  <td className="px-3 py-1.5 text-xs font-semibold">{x.actiune}</td>
                  <td className="px-3 py-1.5 text-xs">{x.scop}</td>
                  <td className="px-3 py-1.5 text-xs">
                    {x.rezultat === 'REFUZAT'
                      ? <Insigna fel="EXCLUS">refuzat</Insigna>
                      : <Insigna fel="ok">permis</Insigna>}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{x.detaliu}</td>
                </tr>
              ))}
              {(state.auditAcces ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  Nicio acțiune înregistrată încă pe această stare.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Se rețin ultimele intrări, fără date personale peste identificatorul de actor deja folosit
          de auditul de import. Jurnalul complet și de nefalsificat e cel de pe serverul comun.
        </p>
      </Sectiune>
    </div>
  );
}
