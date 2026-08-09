import { useRef, useState } from 'react';
import { migreaza, useStore, validInstantaneu } from '../lib/store';
import { Btn, Camp, In, T, Td, Th, Titlu } from '../lib/ui';

export default function Setari() {
  const { state, update, reset, incarcaSet, persistent } = useStore();
  const [conf, setConf] = useState(false);
  const [mesajInst, setMesajInst] = useState<string | null>(null);
  const fisierRef = useRef<HTMLInputElement>(null);

  const setTinta = (locatie: string, v: string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    update(s => ({
      ...s,
      tinte: [...s.tinte.filter(t => t.locatie !== locatie), { locatie: locatie as 'RETEA', fcCurat: n }],
    }));
  };

  return (
    <div className="max-w-3xl">
      <Titlu>Setări</Titlu>

      <div className="rounded-md border bg-card p-4">
        <div className="mb-2 font-display text-sm font-extrabold">Ținte Food Cost Curat (Target vs. Realizat)</div>
        <T>
          <thead><tr><Th>Nivel</Th><Th dr>Țintă FC Curat %</Th></tr></thead>
          <tbody>
            {[{ cod: 'RETEA', nume: 'Rețea (implicit)' }, ...state.locatii.map(l => ({ cod: l.cod, nume: l.nume }))].map(l => (
              <tr key={l.cod}>
                <Td>{l.nume}</Td>
                <Td dr>
                  <In type="number" step="0.1" className="h-8 w-24 text-right"
                    defaultValue={state.tinte.find(t => t.locatie === l.cod)?.fcCurat ?? ''}
                    onBlur={e => setTinta(l.cod, e.target.value)} />
                </Td>
              </tr>
            ))}
          </tbody>
        </T>
        <p className="mt-2 text-xs text-muted-foreground">Ținta locației are prioritate; în lipsa ei se folosește ținta de rețea. Modificarea se aplică la părăsirea câmpului.</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <Camp eticheta="TVA implicit (%)">
            <In type="number" defaultValue={state.setari.tvaImplicit}
              onBlur={e => update(s => ({ ...s, setari: { ...s.setari, tvaImplicit: Number(e.target.value) || s.setari.tvaImplicit } }))} />
          </Camp>
          <p className="mt-2 text-xs text-muted-foreground">Folosit pentru produsele noi din simulator și importurile fără TVA specificat.</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <Camp eticheta="Prag alertă variație preț ingredient (%)">
            <In type="number" defaultValue={state.setari.pragAlertaPret}
              onBlur={e => update(s => ({ ...s, setari: { ...s.setari, pragAlertaPret: Number(e.target.value) || s.setari.pragAlertaPret } }))} />
          </Camp>
          <p className="mt-2 text-xs text-muted-foreground">La importul costurilor, variațiile peste prag generează avertisment.</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <Camp eticheta="Toleranță reconciliere PMIX ↔ Sales (%)">
            <In type="number" step="0.1" defaultValue={state.setari.tolerantaReconciliere}
              onBlur={e => update(s => ({ ...s, setari: { ...s.setari, tolerantaReconciliere: Number(e.target.value) || s.setari.tolerantaReconciliere } }))} />
          </Camp>
          <Camp eticheta="Țintă Labor % (pentru Prime Cost)">
            <In type="number" step="0.1" defaultValue={state.setari.tintaLaborPct ?? 24}
              onBlur={e => update(s => ({ ...s, setari: { ...s.setari, tintaLaborPct: Number(e.target.value) || s.setari.tintaLaborPct } }))} />
          </Camp>
          <Camp eticheta="Comision Delivery (agregator) %">
            <In type="number" step="0.5" defaultValue={state.setari.comisionDeliveryPct ?? 16}
              onBlur={e => update(s => ({ ...s, setari: { ...s.setari, comisionDeliveryPct: Number(e.target.value) >= 0 ? Number(e.target.value) : s.setari.comisionDeliveryPct } }))} />
          </Camp>
          <p className="mt-2 text-xs text-muted-foreground">Prag informativ pentru controlul totalurilor.</p>
        </div>
      </div>

      <div className="mt-4 rounded-md border bg-card p-4">
        <div className="font-display text-sm font-extrabold">Date</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Persistență: {persistent ? 'activă — datele se salvează automat între sesiuni.' : 'indisponibilă în acest mediu — datele trăiesc doar în sesiunea curentă.'}
        </p>
        {(() => {
          const tva = state.setari.tvaImplicit;
          const diferite = state.produse.filter(p => p.tva !== tva);
          if (!diferite.length) return null;
          return (
            <div className="mt-3 rounded border border-l-4 border-l-primary bg-card p-3">
              <div className="text-sm font-semibold">
                {diferite.length} {diferite.length === 1 ? 'produs are' : 'produse au'} altă cotă de TVA decât cea implicită ({tva}%)
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {diferite.slice(0, 6).map(p => `${p.denumire} (${p.tva}%)`).join(' · ')}{diferite.length > 6 ? '…' : ''}
                {' — '}cota se aplică pe fiecare produs, deci pot coexista. Aliniază-le doar dacă e o eroare de import.
              </div>
              <Btn varianta="linie" className="mt-2 h-8"
                onClick={() => update(s => ({ ...s, produse: s.produse.map(p => ({ ...p, tva: s.setari.tvaImplicit })) }))}>
                Aliniază toate produsele la {tva}%
              </Btn>
            </div>
          );
        })()}

        <div className="mt-3 rounded border-2 border-primary/40 bg-card p-3">
          <div className="text-sm font-semibold">Partajarea datelor cu managementul</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Datele trăiesc în browserul acestui calculator. Ca directorul general sau CEO-ul să vadă
            <b> exact</b> aceleași cifre, descarcă instantaneul după import și trimite-i fișierul —
            îl încarcă aici și aplicația lui devine identică cu a ta.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Btn varianta="linie" onClick={() => {
              const azi = new Date().toISOString().slice(0, 10);
              const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `fryday-instantaneu-${azi}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}>Descarcă instantaneul</Btn>

            <Btn varianta="linie" onClick={() => fisierRef.current?.click()}>Încarcă un instantaneu…</Btn>
            <input ref={fisierRef} type="file" accept=".json,application/json" className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setMesajInst(null);
                try {
                  const brut = JSON.parse(await f.text());
                  if (!validInstantaneu(brut)) { setMesajInst('Fișierul nu pare a fi un instantaneu FRYDAY.'); return; }
                  const nou = migreaza(brut);
                  update(() => nou);
                  setMesajInst(`Instantaneu încărcat: ${nou.produse.length} produse, ${nou.retete.length} rețete, ${nou.vanzari.length} rânduri de vânzări.`);
                } catch {
                  setMesajInst('Fișierul nu a putut fi citit — verifică să fie .json descărcat din această aplicație.');
                } finally {
                  e.target.value = '';
                }
              }} />

            <span className="text-xs text-muted-foreground">
              {state.produse.length} produse · {state.vanzari.length} rânduri de vânzări
            </span>
          </div>
          {mesajInst && <div className="mt-2 text-sm font-semibold">{mesajInst}</div>}
        </div>

        <div className="mt-3 rounded border bg-muted/30 p-3">
          <div className="text-sm font-semibold">Setul de date încărcat</div>
          <p className="mt-1 text-xs text-muted-foreground">
            <b>Demo</b> — rețea fictivă cu 2 restaurante, folosită pentru exersare și pentru suita de teste.
            <b className="ml-2">Start curat</b> — golește tot și pornești doar din fișierele tale.
            <b className="ml-2">NBO real</b> — rețetele exacte din recipe cards NBO (07.01.2026): SAMURAI CHICKEN,
            CHICKEN LEMON, CHICKEN PESTO și Chicken Pesto Burger, cu costurile reproduse la bănuț.
            PMIX-ul din acest set este estimat, nu importat.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Btn varianta="linie" onClick={() => incarcaSet('NBO')}>Încarcă rețetele NBO reale</Btn>
            <Btn varianta="pericol" onClick={() => incarcaSet('GOL')}>Start curat (fără date demo)</Btn>
            <Btn varianta="discret" onClick={() => incarcaSet('DEMO')}>Revino la setul demo</Btn>
            <span className="text-xs text-muted-foreground">
              Încărcat acum: <b>{
                state.importuri.some(b => b.id === 'seed') ? 'setul demo'
                  : state.importuri.some(b => b.id === 'NBO1') ? 'setul NBO de referință'
                  : state.produse.length === 0 ? 'gol — pregătit pentru importuri'
                  : 'datele tale importate'
              }</b>
              {' · '}{state.produse.length} produse, {state.ingrediente.length} ingrediente
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {!conf ? <Btn varianta="pericol" onClick={() => setConf(true)}>Resetează la datele demo…</Btn> : (
            <>
              <span className="text-sm">Sigur? Toate datele curente (importuri, rețete, scenarii) se pierd.</span>
              <Btn varianta="pericol" onClick={() => { reset(); setConf(false); }}>Da, resetează</Btn>
              <Btn varianta="discret" onClick={() => setConf(false)}>Nu</Btn>
            </>
          )}
        </div>
      </div>
      <Titlu>Cost de personal (Labor) — pentru Prime Cost</Titlu>
      <T dens>
        <thead><tr><Th>Restaurant</Th><Th>Luna</Th><Th dr>Cost personal (lei)</Th></tr></thead>
        <tbody>
          {state.labor.map((l, i) => (
            <tr key={`${l.locatie}-${l.luna}`}>
              <Td>{state.locatii.find(x => x.cod === l.locatie)?.nume ?? l.locatie}</Td>
              <Td className="num">{l.luna}</Td>
              <Td dr>
                <In type="number" className="h-8 w-32 text-right" defaultValue={l.cost}
                  onBlur={e => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    update(s => ({ ...s, labor: s.labor.map((x, j) => j === i ? { ...x, cost: v } : x) }));
                  }} />
              </Td>
            </tr>
          ))}
        </tbody>
      </T>
      <Titlu>Costuri de operare — pentru EBITDA</Titlu>
      <T dens>
        <thead><tr><Th>Restaurant</Th><Th>Luna</Th><Th dr>Chirie</Th><Th dr>Utilități</Th><Th dr>Alte costuri</Th></tr></thead>
        <tbody>
          {state.costuriOperare.map((o, i) => (
            <tr key={`${o.locatie}-${o.luna}`}>
              <Td>{state.locatii.find(x => x.cod === o.locatie)?.nume ?? o.locatie}</Td>
              <Td className="num">{o.luna}</Td>
              {(['chirie', 'utilitati', 'altele'] as const).map(k => (
                <Td dr key={k}>
                  <In type="number" className="h-8 w-28 text-right" defaultValue={o[k]}
                    onBlur={e => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;
                      update(s => ({ ...s, costuriOperare: s.costuriOperare.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
                    }} />
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </T>
      <p className="mt-1.5 text-xs text-muted-foreground">
        EBITDA estimat = vânzări nete − Food &amp; Paper − Labor − costuri de operare. Exclude amortizarea, dobânzile și impozitul.
      </p>

      <p className="mt-3 text-xs text-muted-foreground">
        Prime Cost = Food &amp; Paper Cost + Labor, raportat la vânzările nete. În simulări costul de personal rămâne fix în lei (efect pe termen scurt), deci procentul se schimbă odată cu vânzările.
      </p>
    </div>
  );
}
