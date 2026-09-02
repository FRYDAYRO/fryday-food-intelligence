/**
 * Import Center — interfața peste stratul canonic de import. Fluxul e cel al motorului:
 * se pregătește pe o copie, se arată tot ce s-a găsit, și abia apoi se poate activa.
 * Un import care nu a trecut validarea NU are buton de activare.
 */
import { useRef, useState } from 'react';
import { citesteFisier, type Parsat } from '../../lib/importer';
import {
  activeazaImport, pregatesteImport, ETICHETA_SURSA,
  type CerereImport, type PregatireImport, type TipSursaFC,
} from '../../lib/import-center';
import { fmtInterval } from '../../lib/engine';
import { Btn, Camp, In, Insigna, Sel, cx } from '../../lib/ui';
import { randImport, type RandImportTower } from '../../lib/fc-tower';
import { verificaImport, verificaScriere } from '../../lib/fc-acces';
import { useTower } from './context';
import { Sectiune } from './parti';

const TIPURI: TipSursaFC[] = ['NBO_29', 'NBO_41', 'PMIX_47', 'RETETAR', 'NOMENCLATOR', 'PRETURI_INGREDIENTE'];

const CULOARE_STARE: Record<RandImportTower['stare'], 'ok' | 'warn' | 'EXCLUS' | 'info'> = {
  VALIDAT: 'ok', ACTIVAT: 'ok', RESPINS: 'EXCLUS', NECESITA_CONFIRMARE: 'warn', DUPLICAT: 'info',
};

export default function ImportCenter() {
  const { state, acces, update } = useTower();
  const [pregatire, setPregatire] = useState<PregatireImport | null>(null);
  const [parsat, setParsat] = useState<Parsat | null>(null);
  const [fisier, setFisier] = useState('');
  const [tip, setTip] = useState<TipSursaFC | ''>('');
  const [locatie, setLocatie] = useState('');
  const [dataValabil, setDataValabil] = useState('');
  const [mesaj, setMesaj] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const poateScrie = verificaScriere(acces.context);
  if (!poateScrie.permis) {
    return (
      <div className="rounded-md border border-dashed bg-card p-6 text-center" data-zona="import-interzis">
        <div className="font-semibold">Importurile sunt rezervate analiștilor și administratorilor</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Rolul tău ({acces.rolSursa}) primește date deja importate. {poateScrie.motiv}
        </div>
      </div>
    );
  }

  const cerere = (p: Parsat, nume: string): CerereImport => ({
    fisier: nume, parsat: p,
    ...(tip ? { tip } : {}),
    ...(locatie ? { locatie } : {}),
    ...(dataValabil ? { dataValabil } : {}),
  });

  const alege = async (f: File) => {
    setMesaj(null);
    const p = await citesteFisier(f);
    setParsat(p); setFisier(f.name);
    setPregatire(pregatesteImport(state, cerere(p, f.name)));
  };

  const repregateste = () => {
    if (parsat) setPregatire(pregatesteImport(state, cerere(parsat, fisier)));
  };

  const activeaza = () => {
    if (!pregatire) return;
    // motorul decide: pe validare picată întoarce datele NESCHIMBATE, doar cu urma de audit
    const { stareNoua, rezultat } = activeazaImport(state, pregatire);
    update(() => stareNoua);
    setMesaj(rezultat.activat
      ? `Import activat ca versiunea ${rezultat.versiune}.`
      : rezultat.nemapateDePastrat > 0
        // coada a fost reținută: datele NU au rămas neschimbate, și nu se spune că ar fi
        ? `Importul nu a fost activat. ${rezultat.erori[0] ?? ''}`
        : `Importul nu a fost activat: ${rezultat.erori[0] ?? rezultat.stare}. Datele au rămas neschimbate.`);
    setPregatire(null); setParsat(null);
  };

  const randBrut = pregatire ? randImport(pregatire.rezultat) : null;
  // a doua poartă: chiar validat de motor, un import în afara scopului autorizat nu se activează
  const poarta = randBrut ? verificaImport(acces.context, { scop: randBrut.scop, restaurante: randBrut.restaurante }) : null;
  const rand = randBrut && poarta && !poarta.permis
    ? { ...randBrut, poateActiva: false, motivBlocare: poarta.motiv }
    : randBrut;
  const versiuni = state.versiuniImport ?? [];

  return (
    <div className="space-y-6">
      <Sectiune titlu="Fișier nou" sub="tipul se detectează din nume și din structură; ambiguitatea cere confirmare">
        <div className="grid gap-3 rounded-md border bg-card p-4 lg:grid-cols-4" data-zona="import-formular">
          <Camp eticheta="Fișier">
            <input ref={input} type="file" accept=".xlsx,.xls,.csv" data-camp="fisier"
              onChange={e => { const f = e.target.files?.[0]; if (f) void alege(f); }}
              className="block w-full text-sm file:mr-2 file:rounded-md file:border file:bg-card file:px-2 file:py-1 file:text-sm" />
          </Camp>
          <Camp eticheta="Tip (confirmă doar dacă e cerut)">
            <Sel data-camp="tip" value={tip} onChange={e => { setTip(e.target.value as TipSursaFC | ''); }}>
              <option value="">detectat automat</option>
              {TIPURI.map(t => <option key={t} value={t}>{ETICHETA_SURSA[t]}</option>)}
            </Sel>
          </Camp>
          <Camp eticheta="Restaurant (dacă fișierul nu îl conține)">
            <Sel data-camp="locatie-import" value={locatie} onChange={e => setLocatie(e.target.value)}>
              <option value="">— din fișier —</option>
              {state.locatii.map(l => <option key={l.cod} value={l.cod}>{l.nume}</option>)}
            </Sel>
          </Camp>
          <Camp eticheta="Valabil de la">
            <In type="date" data-camp="dataValabil" value={dataValabil} onChange={e => setDataValabil(e.target.value)} />
          </Camp>
          <div className="lg:col-span-4">
            <Btn varianta="linie" disabled={!parsat} onClick={repregateste}>Re-validează cu opțiunile de mai sus</Btn>
          </div>
        </div>
        {mesaj && <div className="rounded-md border bg-card px-3 py-2 text-sm" data-zona="mesaj-import">{mesaj}</div>}
      </Sectiune>

      {rand && (
        <Sectiune titlu="Rezultatul validării" sub={rand.fisier}>
          <div className="space-y-3" data-zona="rezultat-import" data-stare={rand.stare}>
            <div className="flex flex-wrap items-center gap-2">
              <Insigna fel={CULOARE_STARE[rand.stare]}>{rand.stare}</Insigna>
              <span className="text-sm font-semibold">{rand.eticheta}</span>
              <span className="text-xs text-muted-foreground">
                detecție {rand.stareDetectie} · încredere {rand.incredereDetectie}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
              {([
                ['Perioadă', rand.perioada ?? '—'],
                ['Interval acoperit', fmtInterval(rand.intervalDe, rand.intervalLa)],
                ['Granularitate', rand.granularitate],
                ['Scop', `${rand.scop}${rand.restaurante.length ? ` (${rand.restaurante.join(', ')})` : ''}`],
                ['Rânduri', `${rand.importate} importate din ${rand.randuri}`],
              ] as [string, string][]).map(([et, v]) => (
                <div key={et} className="rounded-md border bg-card px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{et}</div>
                  <div className="mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            {rand.erori.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" data-zona="erori">
                <b>Erori</b>
                <ul className="mt-0.5 list-inside list-disc">{rand.erori.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
            {rand.avertismente.length > 0 && (
              <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900" data-zona="avertismente">
                <b>Avertismente</b>
                <ul className="mt-0.5 list-inside list-disc">{rand.avertismente.slice(0, 10).map((a, i) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
            {rand.diagnostice.length > 0 && (
              <div className="overflow-x-auto rounded-md border bg-card" data-zona="diagnostice">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr><th className="px-3 py-2">Diagnostic</th><th className="px-3 py-2">Nivel</th><th className="px-3 py-2">Detaliu</th></tr>
                  </thead>
                  <tbody>
                    {rand.diagnostice.map((d, i) => (
                      <tr key={i} className="border-t align-top" data-diagnostic={d.cod}>
                        <td className="px-3 py-1.5 font-semibold">{d.titlu}</td>
                        <td className="px-3 py-1.5 text-xs">{d.nivel}</td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">
                          {d.detaliu}
                          {d.exemple.length > 0 && <div className="mt-0.5">ex.: {d.exemple.slice(0, 6).join(', ')}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Btn data-actiune="activeaza" disabled={!rand.poateActiva} onClick={activeaza}>
                {rand.doarCoada ? 'Păstrează coada de aprobare' : 'Activează importul'}
              </Btn>
              {!rand.poateActiva && (
                <span className={cx('text-sm', rand.stare === 'RESPINS' ? 'text-red-700' : 'text-muted-foreground')}>
                  {rand.motivBlocare}
                </span>
              )}
            </div>
          </div>
        </Sectiune>
      )}

      <Sectiune titlu="Versiuni activate" sub="istoricul nu se rescrie: fiecare import adaugă o versiune">
        <div className="overflow-x-auto rounded-md border bg-card" data-zona="versiuni">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Versiune</th><th className="px-3 py-2">Sursă</th>
                <th className="px-3 py-2">Fișier</th><th className="px-3 py-2">Valabil de la</th>
                <th className="px-3 py-2">Scop</th><th className="px-3 py-2 text-right">Rânduri</th>
                <th className="px-3 py-2">Activă</th>
              </tr>
            </thead>
            <tbody>
              {versiuni.map(v => (
                <tr key={v.id} className="border-t" data-versiune={v.id}>
                  <td className="px-3 py-1.5 font-semibold">{v.id}</td>
                  <td className="px-3 py-1.5 text-xs">{ETICHETA_SURSA[v.tip as TipSursaFC] ?? v.tip}</td>
                  <td className="px-3 py-1.5 text-xs">{v.fisier}</td>
                  <td className="num px-3 py-1.5 text-xs">{v.dataEfectiva}</td>
                  <td className="px-3 py-1.5 text-xs">{v.scop}{v.restaurante.length ? ` (${v.restaurante.join(', ')})` : ''}</td>
                  <td className="num px-3 py-1.5 text-right">{v.randuri}</td>
                  <td className="px-3 py-1.5">{v.activa ? <Insigna fel="ok">activă</Insigna> : <span className="text-xs text-muted-foreground">istoric</span>}</td>
                </tr>
              ))}
              {versiuni.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">Niciun import activat prin Import Center.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Sectiune>
    </div>
  );
}
