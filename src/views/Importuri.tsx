import { useMemo, useRef, useState } from 'react';
import { useSel, useStore } from '../lib/store';
import { campuriTip, citesteFisier, detecteazaTip, importa, mapeazaAntete, TIP_LABEL, type Parsat, type TipImport } from '../lib/importer';
import { Btn, Camp, Gol, Insigna, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';
import { reconciliaza, type ProblemaDate } from '../lib/reconciliere';
import { fmtInt, fmtPct } from '../lib/engine';

const COLOANE_ASTEPTATE: Record<TipImport, string> = {
  PMIX: 'data · locație · canal (sau din numele fișierului) · cod produs · cantitate · valoare brută · discount · valoare netă',
  SALES: 'data · locație · canal · vânzări brute · vânzări nete · nr. bonuri',
  FC29: 'perioadă (lună) · locație · categorie cheltuială · valoare',
  COST_INGREDIENTE: 'cod ingredient · denumire · categorie · tip · UM · preț net · valabil de la · furnizor',
  RETETAR: 'cod rețetă · tip rețetă · denumire · cod componentă · tip componentă · cantitate · UM · pierdere % · canal · randament',
  PRETURI_FURNIZORI: 'furnizor · cod ingredient · preț ofertă · valabil de la',
};

function TabImport() {
  const { state, update } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsat, setParsat] = useState<Parsat | null>(null);
  const [numeFisier, setNumeFisier] = useState('');
  const [tip, setTip] = useState<TipImport>('PMIX');
  const [rezumat, setRezumat] = useState<string | null>(null);
  const [mapare, setMapare] = useState<Record<string, string>>({});

  const alegeFisier = async (f: File) => {
    setRezumat(null);
    try {
      const p = await citesteFisier(f);
      setParsat(p);
      setNumeFisier(f.name);
      setTip(detecteazaTip(p.antete, f.name));
      setMapare({});
    } catch {
      setParsat(null);
      setRezumat('Fișierul nu a putut fi citit. Sunt acceptate .xlsx, .xls și .csv.');
    }
  };

  const auto = parsat ? mapeazaAntete(parsat.antete, tip) : {};
  const efectiva = (c: string) => (c in mapare ? mapare[c] : auto[c] ?? '');

  const ruleaza = () => {
    if (!parsat) return;
    const { stateNou, batch } = importa(tip, parsat, numeFisier, state, mapare);
    update(() => stateNou);
    setRezumat(batch.status === 'IMPORTAT'
      ? `Import reușit: ${batch.importate} înregistrări din ${batch.randuri} rânduri.${batch.avertismente.length ? ` ${batch.avertismente.length} avertismente — vezi istoricul.` : ''}`
      : `Import eșuat: ${batch.erori.join('; ')}`);
    setParsat(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <Titlu>Import date (Excel / CSV)</Titlu>

      <div
        className="rounded-md border-2 border-dashed bg-card p-6 text-center"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void alegeFisier(f); }}
      >
        <div className="font-semibold">Trage fișierul aici sau</div>
        <Btn className="mt-2" onClick={() => fileRef.current?.click()}>Alege fișier…</Btn>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) void alegeFisier(f); }} />
        <div className="mt-2 text-xs text-muted-foreground">PMIX · Sales Report NBO · Raport NBO 2.9 · Cost ingrediente · Rețetar · Prețuri Furnizori — coloanele sunt detectate automat și pot fi mapate manual</div>
      </div>

      {rezumat && <div className="mt-3 rounded-md border bg-primary/10 px-4 py-3 text-sm font-semibold">{rezumat}</div>}

      {parsat && (
        <div className="mt-4 rounded-md border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="mr-auto">
              <div className="font-display text-base font-extrabold">{numeFisier}</div>
              <div className="text-xs text-muted-foreground">Foaie „{parsat.foaie}" · {parsat.randuri.length} rânduri · {parsat.antete.length} coloane</div>
            </div>
            <Camp eticheta="Tip import (detectat automat)">
              <Sel value={tip} onChange={e => { setTip(e.target.value as TipImport); setMapare({}); }}>
                {(Object.keys(TIP_LABEL) as TipImport[]).map(t => <option key={t} value={t}>{TIP_LABEL[t]}</option>)}
              </Sel>
            </Camp>
            <Btn onClick={ruleaza}>Validează și importă</Btn>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Maparea coloanelor (detectată automat, editabilă)</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {campuriTip(tip).map(c => (
                  <label key={c} className="flex items-center gap-1.5 text-xs">
                    <span className={`w-24 shrink-0 font-semibold ${efectiva(c) ? '' : 'text-muted-foreground'}`}>{c}</span>
                    <Sel className="h-7 flex-1 text-xs" value={efectiva(c)}
                      onChange={e => setMapare(m => ({ ...m, [c]: e.target.value }))}>
                      <option value="">— fără —</option>
                      {parsat.antete.map(a => <option key={a} value={a}>{a}</option>)}
                    </Sel>
                  </label>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Coloane așteptate: {COLOANE_ASTEPTATE[tip]}</div>
            </div>
            <div className="overflow-x-auto">
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Primele rânduri</div>
              <table className="w-full text-[11px]">
                <thead><tr>{parsat.antete.slice(0, 6).map(a => <th key={a} className="border-b bg-muted px-1.5 py-1 text-left">{a}</th>)}</tr></thead>
                <tbody>
                  {parsat.randuri.slice(0, 4).map((r, i) => (
                    <tr key={i}>{parsat.antete.slice(0, 6).map(a => <td key={a} className="border-b px-1.5 py-0.5">{String(r[a] ?? '')}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Titlu>Istoricul importurilor</Titlu>
      {state.importuri.length === 0 ? <Gol titlu="Niciun import încă" /> : (
        <div className="space-y-2">
          {state.importuri.map(b => (
            <div key={b.id} className="rounded-md border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {b.status === 'IMPORTAT' ? <Insigna fel="ok">IMPORTAT</Insigna> : <Insigna fel="EXCLUS">EȘUAT</Insigna>}
                <b>{b.tip}</b>
                <span className="text-muted-foreground">— {b.fisier}</span>
                <span className="num ml-auto text-xs text-muted-foreground">{new Date(b.data).toLocaleString('ro-RO')} · {b.importate}/{b.randuri} rânduri</span>
              </div>
              {(b.erori.length > 0 || b.avertismente.length > 0) && (
                <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                  {b.erori.map((e, i) => <li key={`e${i}`} className="text-danger">{e}</li>)}
                  {b.avertismente.map((a, i) => <li key={`a${i}`}>{a}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————— Reconciliere & calitatea datelor
const NIVEL: Record<ProblemaDate['nivel'], { fel: 'EXCLUS' | 'warn' | 'info'; l: string; bord: string }> = {
  BLOCANT: { fel: 'EXCLUS', l: 'blocant', bord: 'border-l-danger' },
  ATENTIE: { fel: 'warn', l: 'atenție', bord: 'border-l-primary' },
  INFO: { fel: 'info', l: 'info', bord: 'border-l-sky-500' },
};

function TabReconciliere() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const loc = sel.locatie === 'RETEA' ? undefined : sel.locatie;
  const r = useMemo(() => reconciliaza(state, ctx, sel.luna, loc), [state, ctx, sel.luna, loc]);

  const culoare = r.verdict === 'FIABIL' ? 'text-ok' : r.verdict === 'CU_REZERVE' ? 'text-primary' : 'text-danger';

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className="rounded-md border-2 bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Încredere în date</div>
          <div className={cx('num mt-0.5 text-2xl font-bold', culoare)}>{r.scorIncredere.toFixed(0)}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
          <div className={cx('text-xs font-semibold', culoare)}>
            {r.verdict === 'FIABIL' ? 'raportare fiabilă' : r.verdict === 'CU_REZERVE' ? 'raportare cu rezerve' : 'date insuficiente'}
          </div>
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acoperirea rețetarului</div>
          <div className={cx('num mt-0.5 text-lg font-semibold', (r.acoperire ?? 0) < 90 && 'text-danger')}>{fmtPct(r.acoperire)}</div>
          <div className="num text-xs text-muted-foreground">{fmtInt(r.netCuReteta)} din {fmtInt(r.netTotal)} lei</div>
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PMIX vs Sales Report</div>
          {r.netSales != null ? <>
            <div className={cx('num mt-0.5 text-lg font-semibold', r.inToleranta === false && 'text-danger')}>
              {r.diferentaPct! >= 0 ? '+' : ''}{fmtPct(r.diferentaPct)}
            </div>
            <div className="num text-xs text-muted-foreground">{fmtInt(r.netPmix)} vs {fmtInt(r.netSales)} lei</div>
          </> : <div className="mt-0.5 text-sm text-muted-foreground">Sales Report lipsă</div>}
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Raportul 2.9</div>
          <div className={cx('num mt-0.5 text-lg font-semibold', !r.are29 && 'text-danger')}>{r.are29 ? `${fmtInt(r.total29)} lei` : 'lipsă'}</div>
          <div className="num text-xs text-muted-foreground">{r.are29 ? `din care excluderi ${fmtInt(r.excluderi)} lei` : 'fără FC operațional'}</div>
        </div>
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Produse nemapate</div>
          <div className={cx('num mt-0.5 text-lg font-semibold', r.nemapate.length > 0 && 'text-danger')}>{r.nemapate.length}</div>
          <div className="num text-xs text-muted-foreground">{fmtInt(r.netTotal - r.netCuReteta)} lei fără cost</div>
        </div>
      </div>

      <Titlu>Ce trebuie corectat înainte de a folosi rapoartele</Titlu>
      {r.probleme.length === 0 ? (
        <Gol titlu="Datele sunt complete" sub="Acoperire peste 90%, surse reconciliate, 2.9 prezent și clasificat integral." />
      ) : (
        <div className="space-y-2">
          {r.probleme.map((p, i) => (
            <div key={i} className={cx('rounded-md border border-l-4 bg-card px-4 py-3', NIVEL[p.nivel].bord)}>
              <div className="flex flex-wrap items-center gap-2">
                <Insigna fel={NIVEL[p.nivel].fel}>{NIVEL[p.nivel].l}</Insigna>
                <span className="font-semibold">{p.titlu}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{p.detaliu}</div>
              <div className="mt-1 text-sm"><b>De făcut:</b> {p.actiune}</div>
            </div>
          ))}
        </div>
      )}

      {r.nemapate.length > 0 && (
        <>
          <Titlu>Produse fără cost calculabil</Titlu>
          <T dens>
            <thead><tr><Th>Cod</Th><Th>Cauza</Th><Th dr>Bucăți</Th><Th dr>Vânzări nete</Th><Th dr>% din vânzări</Th></tr></thead>
            <tbody>
              {r.nemapate.map(n => (
                <tr key={n.cod}>
                  <Td className="num">{n.cod}</Td>
                  <Td>{n.motiv === 'FARA_NOMENCLATOR' ? 'nu există în nomenclator' : 'există, dar fără rețetă'}</Td>
                  <Td dr>{fmtInt(n.buc)}</Td>
                  <Td dr>{fmtInt(n.net)}</Td>
                  <Td dr>{fmtPct(r.netTotal > 0 ? (n.net / r.netTotal) * 100 : 0)}</Td>
                </tr>
              ))}
            </tbody>
          </T>
        </>
      )}

      <Titlu>Ultimele loturi importate</Titlu>
      <T dens>
        <thead><tr><Th>Data</Th><Th>Tip</Th><Th>Fișier</Th><Th dr>Rânduri</Th><Th dr>Erori</Th><Th dr>Avertismente</Th><Th>Status</Th></tr></thead>
        <tbody>
          {r.loturi.map(l => (
            <tr key={l.id}>
              <Td className="num">{l.data}</Td>
              <Td>{l.tip}</Td>
              <Td className="max-w-[260px] truncate">{l.fisier}</Td>
              <Td dr>{fmtInt(l.importate)}</Td>
              <Td dr className={l.erori ? 'text-danger font-semibold' : ''}>{l.erori}</Td>
              <Td dr>{l.avertismente}</Td>
              <Td><Insigna fel={l.status === 'IMPORTAT' ? 'ok' : 'warn'}>{l.status.toLowerCase()}</Insigna></Td>
            </tr>
          ))}
        </tbody>
      </T>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Scorul de încredere scade cu fiecare punct de acoperire lipsă (×1,5), cu 25 la o diferență PMIX–Sales peste toleranță, cu 15 dacă lipsește 2.9 și cu până la 10 pentru categorii neclasificate.
      </p>
    </div>
  );
}

export default function Importuri() {
  const [tab, setTab] = useState<'import' | 'recon'>('import');
  return (
    <div>
      <Titlu>Import Center</Titlu>
      <div className="mb-4 flex flex-wrap gap-1 rounded-md border bg-card p-1">
        {([['import', 'Import fișiere'], ['recon', 'Reconciliere & calitatea datelor']] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cx('rounded px-3 py-1.5 text-sm font-semibold', tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{l}</button>
        ))}
      </div>
      {tab === 'import' ? <TabImport /> : <TabReconciliere />}
    </div>
  );
}
