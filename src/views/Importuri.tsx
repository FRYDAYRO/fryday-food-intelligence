import { useMemo, useRef, useState } from 'react';
import { useSel, useStore } from '../lib/store';
import { campuriTip, citesteFisier, detecteazaTip, importa, mapeazaAntete, TIP_LABEL, type Parsat, type TipImport } from '../lib/importer';
import { analizeazaFisier, type FoaieAnalizata } from '../lib/auto';
import { Btn, Camp, Gol, In, Insigna, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';
import Nemapate from './shared/Nemapate';
import { areDateDemo, reconciliaza, type ProblemaDate } from '../lib/reconciliere';
import { fmtInt, fmtPct } from '../lib/engine';

const COLOANE_ASTEPTATE: Record<TipImport, string> = {
  PMIX: 'data · locație · canal (sau din numele fișierului) · cod produs · cantitate · valoare brută · discount · valoare netă',
  SALES: 'data · locație · canal · vânzări brute · vânzări nete · nr. bonuri',
  FC29: 'perioadă (lună) · locație · categorie cheltuială · valoare',
  FC29_MATERIAL: 'raportul 2.9 cu detaliu pe material: perioadă · locație · cod material · denumire · categorie · cantitate · UM · cost actual · cost teoretic · normalizat. Alimentează puntea de reconciliere pe material și generează automat rollup-ul pe categorie.',
  COST_INGREDIENTE: 'cod ingredient · denumire · categorie · tip · UM · preț net · valabil de la · furnizor',
  RETETAR: 'cod rețetă · tip rețetă · denumire · cod componentă · tip componentă · cantitate · UM · pierdere % · canal · randament',
  MENIURI: 'componența meniurilor: meniu · componentă · cantitate (opțional preț și TVA). Costul meniului se calculează prin însumarea componentelor, iar componentele vândute la preț 0 nu se mai contorizează separat.',
  WASTE: 'pierderile lunare pe ingredient: cod · cantitate · UM · restaurant · perioadă. Fără waste, diferența dintre Food Cost teoretic și consumul real rămâne neexplicată.',
  INVENTAR: 'consumul real pe ingredient (stoc inițial + intrări − stoc final): cod · consum real · UM · restaurant · perioadă. Permite descompunerea completă a variance-ului.',
  FC_BAZA: 'fișierul de bază FRYDAY FC, cu foile NOMENCLATOR · RETETAR · FOOD COST — se citesc toate trei într-o trecere și populează ingredientele cu prețuri, rețetele și produsele cu prețuri pe canal',
  SALES_MIX: 'raportul 4.7 Sales Mix exportat din Back Office — Menu Item Name · Qty · Price · Extension. Canalul se citește din sufixul denumirii („ D" = Delivery, „ MD" = meniu pe Delivery), iar liniile la prețuri diferite se însumează automat.',
  RETETAR_NBO: 'export din NBO — Product ID · Product Name · Category · POS Item Price · Item ID · Item Name · Qty · Units · Cost · Extension (merge și cu layoutul de recipe card, cu antet și grilă)',
  PRETURI_PRODUSE: 'cod produs · denumire · preț — fie o coloană „Preț InStore" și una „Preț Delivery", fie o singură coloană de preț plus canalul (din coloană, din numele fișierului sau ales manual)',
  PRETURI_FURNIZORI: 'furnizor · cod ingredient · preț ofertă · valabil de la',
};

// Fotografie a datelor, ca să putem arăta exact ce s-a schimbat după import.
function instantaneu(s: import('../lib/types').AppState) {
  return {
    produse: s.produse.length,
    ingrediente: s.ingrediente.length,
    retete: s.retete.length,
    vanzari: s.vanzari.length,
    linii29: s.linii29.length,
    oferte: s.pretFurnizori.length,
    luni: [...new Set(s.vanzari.map(v => v.data.slice(0, 7)))].sort(),
    locatii: s.locatii.length,
  };
}

function diferente(a: ReturnType<typeof instantaneu>, b: ReturnType<typeof instantaneu>): string[] {
  const et: Record<string, string> = {
    produse: 'produse', ingrediente: 'ingrediente', retete: 'rețete',
    vanzari: 'rânduri de vânzări', linii29: 'linii 2.9', oferte: 'oferte de furnizor', locatii: 'locații',
  };
  const rez: string[] = [];
  for (const k of Object.keys(et)) {
    const va = a[k as keyof typeof a] as number, vb = b[k as keyof typeof b] as number;
    if (va !== vb) rez.push(`${et[k]}: ${va} → ${vb} (${vb > va ? '+' : ''}${vb - va})`);
  }
  const luniNoi = b.luni.filter(l => !a.luni.includes(l));
  if (luniNoi.length) rez.push(`luni noi de date: ${luniNoi.join(', ')}`);
  return rez;
}

function TabImport() {
  const { state, update, incarcaSet } = useStore();
  const { sel, setSel } = useSel();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsat, setParsat] = useState<Parsat | null>(null);
  const [numeFisier, setNumeFisier] = useState('');
  const [tip, setTip] = useState<TipImport>('PMIX');
  const [rezumat, setRezumat] = useState<string | null>(null);
  const [mapare, setMapare] = useState<Record<string, string>>({});
  const [analiza, setAnaliza] = useState<FoaieAnalizata[] | null>(null);
  const [foaieSel, setFoaieSel] = useState(0);
  const [canalPret, setCanalPret] = useState<'AUTO' | 'INSTORE' | 'DELIVERY'>('AUTO');
  const [dataValabil, setDataValabil] = useState('');
  const [lot, setLot] = useState<{ nume: string; analiza: FoaieAnalizata[] }[] | null>(null);
  const [jurnalLot, setJurnalLot] = useState<string[] | null>(null);
  const [inLucru, setInLucru] = useState(false);
  const [jurnalAuto, setJurnalAuto] = useState<string[] | null>(null);
  const [schimbari, setSchimbari] = useState<string[] | null>(null);
  const [confDemo, setConfDemo] = useState(false);

  const demo = areDateDemo(state);

  // Import în bloc: câte un fișier per restaurant. Fiecare raport 4.7 conține propriul restaurant,
  // deci locația se deduce singură; fișierele se procesează secvențial, acumulând starea.
  const alegeLot = async (fisiere: File[]) => {
    setRezumat(null); setParsat(null); setAnaliza(null); setJurnalAuto(null); setSchimbari(null); setJurnalLot(null);
    setInLucru(true);
    const rez: { nume: string; analiza: FoaieAnalizata[] }[] = [];
    for (const f of fisiere) {
      try { rez.push({ nume: f.name, analiza: await analizeazaFisier(f) }); }
      catch { rez.push({ nume: f.name, analiza: [] }); }
    }
    setLot(rez);
    setInLucru(false);
  };

  const ruleazaLot = () => {
    if (!lot) return;
    const inainte = instantaneu(state);
    const jurnal: string[] = [];
    const ordine: TipImport[] = ['FC_BAZA', 'COST_INGREDIENTE', 'RETETAR_NBO', 'RETETAR', 'PRETURI_PRODUSE', 'PRETURI_FURNIZORI', 'FC29', 'FC29_MATERIAL', 'SALES', 'SALES_MIX', 'PMIX'];
    const foi = lot.flatMap(x => x.analiza.filter(f => f.tip).map(f => ({ fisier: x.nume, f })))
      .sort((a, b) => ordine.indexOf(a.f.tip!) - ordine.indexOf(b.f.tip!));
    let stare = state;
    let perioadaMax: string | undefined;
    const optLot = { ...(canalPret === 'AUTO' ? {} : { canalImplicit: canalPret }), ...(dataValabil ? { dataValabil } : {}) };
    for (const { fisier, f } of foi) {
      const { stateNou, batch } = importa(f.tip!, f.parsat, fisier, stare, f.mapare, optLot);
      stare = stateNou;
      if (batch.perioada && (!perioadaMax || batch.perioada > perioadaMax)) perioadaMax = batch.perioada;
      const loc = batch.avertismente.find(a => a.startsWith('Locație creată pentru raport:'))?.replace('Locație creată pentru raport: ', '');
      jurnal.push(`${fisier} → ${TIP_LABEL[f.tip!]}: ${batch.importate} înregistrări${loc ? ` · ${loc}` : ''}`
        + (batch.erori.length ? ` · EȘUAT: ${batch.erori[0]}` : '')
        + (batch.avertismente.length ? ` · ${batch.avertismente.length} avertismente` : ''));
    }
    const fara = lot.filter(x => !x.analiza.some(f => f.tip));
    for (const x of fara) jurnal.push(`${x.nume} → tip nedeterminat, ignorat`);
    update(() => stare);
    setSchimbari(diferente(inainte, instantaneu(stare)));
    if (perioadaMax && perioadaMax !== sel.luna) {
      setSel({ ...sel, luna: perioadaMax });
      jurnal.push(`Perioada globală a fost mutată pe ${perioadaMax}`);
    }
    setJurnalLot(jurnal);
    setLot(null);
  };

  const alegeFisier = async (f: File) => {
    setRezumat(null);
    try {
      const p = /\.pdf$/i.test(f.name) ? null : await citesteFisier(f);
      setNumeFisier(f.name);
      if (p) { setParsat(p); setTip(detecteazaTip(p.antete, f.name)); }
      setMapare({});
      try {
        const a = await analizeazaFisier(f);
        setAnaliza(a);
        setFoaieSel(0);
        if (a.length) {
          // panoul manual folosește aceeași interpretare, ca antetul și maparea să fie corecte
          setParsat(a[0].parsat);
          if (a[0].tip) setTip(a[0].tip);
          setMapare(a[0].mapare);
        }
      } catch { setAnaliza(null); }
      setJurnalAuto(null);
    } catch {
      setParsat(null);
    setAnaliza(null);
    setJurnalAuto(null);
      setAnaliza(null);
      setRezumat('Fișierul nu a putut fi citit. Sunt acceptate .xlsx, .xls, .csv și .pdf (raportul 4.7).');
    }
  };

  const auto = parsat ? mapeazaAntete(parsat.antete, tip) : {};
  const efectiva = (c: string) => (c in mapare ? mapare[c] : auto[c] ?? '');

  const ruleaza = () => {
    if (!parsat) return;
    const opt = { ...(canalPret === 'AUTO' ? {} : { canalImplicit: canalPret }), ...(dataValabil ? { dataValabil } : {}) };
    const inainte = instantaneu(state);
    const { stateNou, batch } = importa(tip, parsat, numeFisier, state, mapare, opt);
    if (batch.perioada && batch.perioada !== sel.luna) setSel({ ...sel, luna: batch.perioada });
    update(() => stateNou);
    setSchimbari(diferente(inainte, instantaneu(stateNou)));
    setRezumat(batch.status === 'IMPORTAT'
      ? `Import reușit: ${batch.importate} înregistrări din ${batch.randuri} rânduri.${batch.avertismente.length ? ` ${batch.avertismente.length} avertismente — vezi istoricul.` : ''}`
      : `Import eșuat: ${batch.erori.join('; ')}`);
    setParsat(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <Titlu>Import date (Excel / CSV)</Titlu>

      {demo.demo && (
        <div className="mb-4 rounded-md border-2 border-danger/60 bg-danger/5 p-4">
          <div className="font-display text-sm font-extrabold text-danger">Aplicația conține încă datele demo</div>
          <p className="mt-1 text-sm">
            {demo.produse > 0 && <>Sunt {demo.produse} produse demo și {fmtInt(demo.vanzari)} rânduri de vânzări fictive. </>}
            Importurile <b>se adaugă</b> peste ele, nu le înlocuiesc — deci Food Cost, denumirile și PMIX-ul
            vor amesteca datele demo cu ale tale. Șterge-le înainte de primul import real.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!confDemo ? (
              <Btn varianta="pericol" onClick={() => setConfDemo(true)}>Șterge datele demo și pornește curat</Btn>
            ) : (
              <>
                <span className="text-sm font-semibold">Se șterg toate produsele, rețetele, ingredientele și vânzările. Continui?</span>
                <Btn varianta="pericol" onClick={() => { incarcaSet('GOL'); setConfDemo(false); }}>Da, șterge tot</Btn>
                <Btn varianta="discret" onClick={() => setConfDemo(false)}>Nu</Btn>
              </>
            )}
            <span className="text-xs text-muted-foreground">Parametrii de calcul (TVA 11%, ținte, reguli) se păstrează.</span>
          </div>
        </div>
      )}

      <div
        className="rounded-md border-2 border-dashed bg-card p-6 text-center"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const fs = [...(e.dataTransfer.files ?? [])]; if (fs.length > 1) void alegeLot(fs); else if (fs[0]) void alegeFisier(fs[0]); }}
      >
        <div className="font-semibold">Trage fișierele aici (poți selecta mai multe) sau</div>
        <Btn className="mt-2" onClick={() => fileRef.current?.click()}>Alege fișier…</Btn>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" hidden multiple
          onChange={e => { const fs = [...(e.target.files ?? [])]; if (fs.length > 1) void alegeLot(fs); else if (fs[0]) void alegeFisier(fs[0]); }} />
        <div className="mt-2 text-xs text-muted-foreground">PMIX · Sales Report NBO · Raport NBO 2.9 · Cost ingrediente · Rețetar · Rețetar NBO · Sales Mix 4.7 (Excel sau PDF) · Prețuri de vânzare · Prețuri Furnizori — coloanele sunt detectate automat și pot fi mapate manual</div>
      </div>

      {schimbari && (
        <div className={cx('mt-3 rounded-md border-2 p-4', schimbari.length ? 'border-ok/50 bg-ok/5' : 'border-danger/50 bg-danger/5')}>
          <div className="font-display text-sm font-extrabold">
            {schimbari.length ? 'Ce s-a schimbat în date' : 'Nu s-a schimbat nimic în date'}
          </div>
          {schimbari.length ? (
            <ul className="num mt-1 list-inside list-disc text-sm">{schimbari.map((x, i) => <li key={i}>{x}</li>)}</ul>
          ) : (
            <div className="mt-1 text-sm">
              Fișierul a fost citit, dar nicio înregistrare nu a intrat. Cauzele obișnuite: importul a eșuat
              (vezi mesajul de eroare), codurile din fișier nu există în nomenclator (importă întâi rețetarul),
              sau valorile sunt identice cu cele existente. Detaliile pe rând sunt în „Istoricul importurilor".
            </div>
          )}
        </div>
      )}

      {rezumat && <div className="mt-3 rounded-md border bg-primary/10 px-4 py-3 text-sm font-semibold">{rezumat}</div>}

      {inLucru && <div className="mt-4 rounded-md border bg-card p-4 text-sm">Se analizează fișierele…</div>}

      {lot && lot.length > 0 && (
        <div className="mt-4 rounded-md border-2 border-primary/50 bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-display text-base font-extrabold">Import în bloc — {lot.length} fișiere</div>
            <div className="text-xs text-muted-foreground">câte un fișier per restaurant; locația se deduce din fiecare raport</div>
          </div>
          <T dens>
            <thead><tr><Th>Fișier</Th><Th>Ce este</Th><Th>Restaurant detectat</Th><Th dr>Rânduri</Th></tr></thead>
            <tbody>
              {lot.map(x => x.analiza.length === 0 ? (
                <tr key={x.nume}><Td className="font-semibold">{x.nume}</Td>
                  <Td><Insigna fel="EXCLUS">necitibil</Insigna></Td><Td /><Td dr>—</Td></tr>
              ) : x.analiza.map(f => (
                <tr key={`${x.nume}-${f.foaie}`}>
                  <Td className="font-semibold">{x.nume}{x.analiza.length > 1 ? ` · ${f.foaie}` : ''}</Td>
                  <Td>{f.tip ? <Insigna fel="ok">{TIP_LABEL[f.tip]}</Insigna> : <Insigna fel="EXCLUS">nedeterminat</Insigna>}</Td>
                  <Td className="text-xs text-muted-foreground">{f.note.find(n => n.includes('restaurant')) ?? (f.tip === 'SALES_MIX' ? 'din raport' : '—')}</Td>
                  <Td dr>{f.parsat.randuri.length || f.parsat.matrice?.length || 0}</Td>
                </tr>
              )))}
            </tbody>
          </T>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Btn disabled={!lot.some(x => x.analiza.some(f => f.tip))} onClick={ruleazaLot}>
              Importă toate cele {lot.reduce((n, x) => n + x.analiza.filter(f => f.tip).length, 0)} seturi de date
            </Btn>
            <Btn varianta="discret" onClick={() => setLot(null)}>Renunță</Btn>
            <span className="text-xs text-muted-foreground">Se importă în ordinea corectă: rețetar și prețuri întâi, vânzările la final.</span>
          </div>
        </div>
      )}

      {state.nemapate.length > 0 && (
        <div className="mt-6">
          <Titlu actiuni={<Btn varianta="discret" onClick={() => update(s => ({ ...s, nemapate: [] }))}>Golește lista</Btn>}>
            Mapare asistată — {state.nemapate.length} denumiri POS fără produs
          </Titlu>
          <p className="mb-2 text-sm text-muted-foreground">
            Denumirile din Sales Mix care nu s-au potrivit cu nomenclatorul, ordonate după valoarea vânzărilor.
            Alege produsul corect: aliasul se salvează definitiv și se aplică automat la <b>următorul import</b> al raportului.
          </p>
          <MapareAsistata />
        </div>
      )}

      <Nemapate />

      {jurnalLot && (
        <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-semibold">Rezultatul importului în bloc</div>
          <ul className="mt-1 list-inside list-disc">{jurnalLot.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      )}

      {analiza && analiza.length > 0 && (
        <div className="mt-4 rounded-md border-2 border-primary/50 bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-display text-base font-extrabold">Analiză automată</div>
            <div className="text-xs text-muted-foreground">
              {analiza.length} {analiza.length === 1 ? 'foaie' : 'foi'} · antetul și coloanele sunt găsite singure
            </div>
          </div>

          <T dens>
            <thead><tr><Th>Foaie</Th><Th>Ce este</Th><Th dr>Rânduri</Th><Th dr>Antet pe rândul</Th><Th dr>Încredere</Th><Th>Observații</Th></tr></thead>
            <tbody>
              {analiza.map(f => (
                <tr key={f.foaie}>
                  <Td className="font-semibold">{f.foaie}</Td>
                  <Td>{f.tip ? <Insigna fel="ok">{TIP_LABEL[f.tip]}</Insigna> : <Insigna fel="EXCLUS">nedeterminat</Insigna>}</Td>
                  <Td dr>{f.parsat.randuri.length}</Td>
                  <Td dr>{f.randAntet + 1}</Td>
                  <Td dr>{f.tip ? `${f.incredere}%` : '—'}</Td>
                  <Td className="text-xs text-muted-foreground">
                    {f.tip
                      ? `${Object.entries(f.mapare).slice(0, 5).map(([c, a]) => `${c} ← „${a}"`).join(' · ')}${Object.keys(f.mapare).length > 5 ? '…' : ''}`
                      : f.note.join(' · ')}
                  </Td>
                </tr>
              ))}
            </tbody>
          </T>

          {analiza.some(f => f.note.length > 0) && (
            <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
              {analiza.flatMap(f => f.note.map(n => <li key={`${f.foaie}-${n}`}><b>{f.foaie}:</b> {n}</li>))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Btn disabled={!analiza.some(f => f.tip)} onClick={() => {
              const jurnal: string[] = [];
              let perioadaMax: string | undefined;
              const inainte = instantaneu(state);
              // se importă în ordinea corectă: mai întâi nomenclator și rețete, apoi vânzările
              const ordine: TipImport[] = ['COST_INGREDIENTE', 'RETETAR_NBO', 'RETETAR', 'PRETURI_FURNIZORI', 'FC29', 'SALES', 'PMIX'];
              const foi = [...analiza].filter(f => f.tip)
                .sort((a, b) => ordine.indexOf(a.tip!) - ordine.indexOf(b.tip!));
              let stare = state;
              for (const f of foi) {
                const optAuto = { ...(canalPret === 'AUTO' ? {} : { canalImplicit: canalPret }), ...(dataValabil ? { dataValabil } : {}) };
                const { stateNou, batch } = importa(f.tip!, f.parsat, `${numeFisier} — ${f.foaie}`, stare, f.mapare, optAuto);
                stare = stateNou;
                const unitate = f.tip === 'RETETAR_NBO' ? 'produse' : f.tip === 'RETETAR' ? 'linii de rețetă' : 'rânduri';
                jurnal.push(`${f.foaie} → ${TIP_LABEL[f.tip!]}: ${batch.importate} ${unitate}`
                  + (f.tip !== 'RETETAR_NBO' ? ` din ${batch.randuri}` : '')
                  + (batch.erori.length ? ` · EȘUAT: ${batch.erori[0]}` : '')
                  + (batch.avertismente.length ? ` · ${batch.avertismente.length} avertismente` : ''));
                if (batch.perioada && (!perioadaMax || batch.perioada > perioadaMax)) perioadaMax = batch.perioada;
              }
              update(() => stare);
              setSchimbari(diferente(inainte, instantaneu(stare)));
              if (perioadaMax && perioadaMax !== sel.luna) {
                setSel({ ...sel, luna: perioadaMax });
                jurnal.push(`Perioada globală a fost mutată pe ${perioadaMax}, ca analizele să arate datele importate.`);
              }
              setJurnalAuto(jurnal);
            }}>
              Importă automat tot ({analiza.filter(f => f.tip).length} {analiza.filter(f => f.tip).length === 1 ? 'foaie' : 'foi'})
            </Btn>
            <span className="text-xs text-muted-foreground">
              Nu trebuie să mapezi nimic. Dacă o foaie a fost interpretată greșit, folosește importul manual de mai jos.
            </span>
          </div>

          {jurnalAuto && (
            <div className="mt-3 rounded border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">Rezultatul importului automat</div>
              <ul className="mt-1 list-inside list-disc">{jurnalAuto.map((l, i) => <li key={i}>{l}</li>)}</ul>
              <div className="mt-1.5 text-xs text-muted-foreground">
                Verifică în tabul „Reconciliere & calitatea datelor" înainte de a folosi cifrele.
              </div>
            </div>
          )}
        </div>
      )}

      {parsat && (
        <div className="mt-4 rounded-md border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="mr-auto">
              <div className="font-display text-base font-extrabold">{numeFisier}</div>
              <div className="text-xs text-muted-foreground">Foaie „{parsat.foaie}" · {parsat.randuri.length} rânduri · {parsat.antete.length} coloane</div>
              {analiza && analiza.length > 1 && (
                <label className="mt-1.5 block text-xs">
                  <span className="text-muted-foreground">Foaia analizată: </span>
                  <Sel className="mt-1 h-8" value={foaieSel} onChange={e => {
                    const i = Number(e.target.value);
                    setFoaieSel(i);
                    setParsat(analiza[i].parsat);
                    if (analiza[i].tip) setTip(analiza[i].tip!);
                    setMapare(analiza[i].mapare);
                  }}>
                    {analiza.map((f, i) => <option key={f.foaie} value={i}>{f.foaie} — {f.tip ? TIP_LABEL[f.tip] : 'nedeterminat'}</option>)}
                  </Sel>
                </label>
              )}
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
              {tip === 'PRETURI_PRODUSE' && (() => {
                const areColoanaCanal = efectiva('canal') !== '';
                const areAmbeleColoane = efectiva('pretInstore') !== '' || efectiva('pretDelivery') !== '';
                const nf = numeFisier.toLowerCase();
                const dinNume = /instore|sala|local/.test(nf) ? 'InStore' : /delivery|livrare/.test(nf) ? 'Delivery' : null;
                if (areColoanaCanal || areAmbeleColoane) {
                  return (
                    <div className="mt-2 rounded border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Canalul se ia {areColoanaCanal ? 'din coloana „canal"' : 'din coloanele separate de preț'} — nu trebuie ales manual.
                    </div>
                  );
                }
                return (
                  <div className="mt-2 rounded border-2 border-primary/40 bg-card px-3 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Canalul acestor prețuri</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Sel className="h-8" value={canalPret} onChange={e => setCanalPret(e.target.value as typeof canalPret)}>
                        <option value="AUTO">Automat{dinNume ? ` — din numele fișierului: ${dinNume}` : ' (nedetectabil)'}</option>
                        <option value="INSTORE">InStore</option>
                        <option value="DELIVERY">Delivery</option>
                      </Sel>
                      {canalPret === 'AUTO' && !dinNume && (
                        <span className="text-xs font-semibold text-danger">
                          Numele fișierului nu spune canalul — alege-l, altfel prețurile nu se aplică.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
              {['FC_BAZA', 'RETETAR_NBO', 'RETETAR', 'PRETURI_PRODUSE', 'COST_INGREDIENTE', 'PRETURI_FURNIZORI'].includes(tip) && (
                <label className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-muted-foreground">Prețurile se aplică de la data</span>
                  <In type="date" className="h-8 w-40" value={dataValabil} onChange={e => setDataValabil(e.target.value)} />
                  <span className="text-muted-foreground">
                    {dataValabil ? 'istoricul anterior se păstrează, cifrele mai vechi rămân calculate la prețurile lor' : 'implicit: azi'}
                  </span>
                </label>
              )}
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

function MapareAsistata() {
  const { state, update } = useStore();
  const [alocari, setAlocari] = useState<Record<string, string>>({});
  const produseSortate = useMemo(() => [...state.produse].sort((a, b) => a.denumire.localeCompare(b.denumire)), [state.produse]);

  const atribuie = (den: string) => {
    const cod = alocari[den];
    if (!cod) return;
    update(s => ({
      ...s,
      produse: s.produse.map(p => p.cod !== cod ? p : { ...p, aliasuri: [...new Set([...(p.aliasuri ?? []), den])] }),
      nemapate: s.nemapate.filter(n => n.denumire !== den),
    }));
  };

  return (
    <T dens>
      <thead><tr><Th>Denumirea din raport</Th><Th>Categorie</Th><Th dr>Bucăți</Th><Th dr>Valoare (lei)</Th><Th>Produsul corect</Th><Th /></tr></thead>
      <tbody>
        {state.nemapate.slice(0, 60).map(n => (
          <tr key={n.denumire}>
            <Td className="font-semibold">{n.denumire}</Td>
            <Td className="text-xs text-muted-foreground">{n.categorie}</Td>
            <Td dr>{n.cant.toLocaleString('ro-RO')}</Td>
            <Td dr>{Math.round(n.valoare).toLocaleString('ro-RO')}</Td>
            <Td>
              <Sel className="h-8 max-w-64" value={alocari[n.denumire] ?? ''}
                onChange={e => setAlocari(a => ({ ...a, [n.denumire]: e.target.value }))}>
                <option value="">— alege produsul —</option>
                {produseSortate.map(p => <option key={p.cod} value={p.cod}>{p.denumire}</option>)}
              </Sel>
            </Td>
            <Td><Btn className="h-8" disabled={!alocari[n.denumire]} onClick={() => atribuie(n.denumire)}>Atribuie</Btn></Td>
          </tr>
        ))}
      </tbody>
    </T>
  );
}
