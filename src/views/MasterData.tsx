import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import type { Ingredient, Produs } from '../lib/types';
import { UMS, pretCurent, fmtLei } from '../lib/engine';
import { Btn, Camp, In, Insigna, Sel, T, Td, Th, Titlu, cx } from '../lib/ui';

const TABURI = ['Produse', 'Ingrediente', 'Ambalaje', 'Furnizori', 'Categorii', 'Unități de măsură'] as const;

function DialogPretIngredient({ ing, inchide }: { ing: Ingredient; inchide: () => void }) {
  const { update } = useStore();
  const [pret, setPret] = useState('');
  const [deLa, setDeLa] = useState(new Date().toISOString().slice(0, 10));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={inchide}>
      <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="font-display text-base font-extrabold">{ing.denumire} — actualizare preț</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Camp eticheta={`Preț net nou (lei / ${ing.um})`}><In type="number" step="0.01" value={pret} onChange={e => setPret(e.target.value)} autoFocus /></Camp>
          <Camp eticheta="Valabil de la"><In type="date" value={deLa} onChange={e => setDeLa(e.target.value)} /></Camp>
        </div>
        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold text-muted-foreground">Istoric prețuri (versionare nomenclator)</div>
          <div className="max-h-32 overflow-y-auto rounded border">
            {[...ing.preturi].reverse().map((p, i) => (
              <div key={i} className="flex justify-between border-b px-2 py-1 text-xs last:border-b-0">
                <span>{p.validDeLa}</span><span className="num font-semibold">{fmtLei(p.pret)} lei/{ing.um}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Btn varianta="linie" onClick={inchide}>Renunță</Btn>
          <Btn disabled={!pret} onClick={() => {
            const v = Number(pret);
            if (!Number.isFinite(v) || v <= 0) return;
            update(s => ({
              ...s,
              ingrediente: s.ingrediente.map(x => x.cod === ing.cod
                ? { ...x, preturi: [...x.preturi.filter(pp => pp.validDeLa !== deLa), { validDeLa: deLa, pret: v }].sort((a, b) => a.validDeLa.localeCompare(b.validDeLa)) }
                : x),
            }));
            inchide();
          }}>Salvează prețul</Btn>
        </div>
      </div>
    </div>
  );
}

function DialogProdus({ prod, inchide }: { prod: Produs; inchide: () => void }) {
  const { update } = useStore();
  const [pin, setPin] = useState(String(prod.pretInstore ?? ''));
  const [pdl, setPdl] = useState(String(prod.pretDelivery ?? ''));
  const [tva, setTva] = useState(String(prod.tva));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={inchide}>
      <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="font-display text-base font-extrabold">{prod.denumire} — prețuri de vânzare (brute)</div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Camp eticheta="InStore (lei)"><In type="number" step="0.1" value={pin} onChange={e => setPin(e.target.value)} /></Camp>
          <Camp eticheta="Delivery (lei)"><In type="number" step="0.1" value={pdl} onChange={e => setPdl(e.target.value)} /></Camp>
          <Camp eticheta="TVA %"><In type="number" step="1" value={tva} onChange={e => setTva(e.target.value)} /></Camp>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Btn varianta="linie" onClick={inchide}>Renunță</Btn>
          <Btn onClick={() => {
            update(s => ({
              ...s,
              produse: s.produse.map(x => x.cod === prod.cod ? {
                ...x,
                pretInstore: Number(pin) > 0 ? Number(pin) : undefined,
                pretDelivery: Number(pdl) > 0 ? Number(pdl) : undefined,
                tva: Number(tva) >= 0 ? Number(tva) : x.tva,
              } : x),
            }));
            inchide();
          }}>Salvează</Btn>
        </div>
      </div>
    </div>
  );
}

function FormIngredientNou({ ambalaj }: { ambalaj?: boolean }) {
  const { update, state } = useStore();
  const [deschis, setDeschis] = useState(false);
  const [f, setF] = useState({ cod: '', denumire: '', categorie: ambalaj ? 'Ambalaje' : '', um: 'kg', pret: '', furnizor: '' });
  if (!deschis) return <Btn varianta="linie" onClick={() => setDeschis(true)}>+ {ambalaj ? 'Ambalaj nou' : 'Ingredient nou'}</Btn>;
  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <div className="grid gap-2 md:grid-cols-6">
        <In placeholder="Cod (ex. I020)" value={f.cod} onChange={e => setF({ ...f, cod: e.target.value })} />
        <In placeholder="Denumire" value={f.denumire} onChange={e => setF({ ...f, denumire: e.target.value })} className="md:col-span-2" />
        <In placeholder="Categorie" value={f.categorie} onChange={e => setF({ ...f, categorie: e.target.value })} />
        <Sel value={f.um} onChange={e => setF({ ...f, um: e.target.value })}><option value="kg">kg</option><option value="l">l</option><option value="buc">buc</option></Sel>
        <In placeholder="Preț net" type="number" step="0.01" value={f.pret} onChange={e => setF({ ...f, pret: e.target.value })} />
      </div>
      <div className="mt-2 flex gap-2">
        <Btn disabled={!f.cod || !f.denumire || !f.pret} onClick={() => {
          if (state.ingrediente.some(i => i.cod === f.cod.trim())) return;
          update(s => ({
            ...s,
            ingrediente: [...s.ingrediente, {
              cod: f.cod.trim(), denumire: f.denumire.trim(), categorie: f.categorie.trim() || 'Alte alimente',
              tip: ambalaj ? 'PACKAGING' : 'FOOD', um: f.um as 'kg' | 'l' | 'buc',
              furnizor: f.furnizor || undefined, activ: true,
              preturi: [{ validDeLa: new Date().toISOString().slice(0, 10), pret: Number(f.pret) }],
            }],
          }));
          setDeschis(false);
          setF({ cod: '', denumire: '', categorie: ambalaj ? 'Ambalaje' : '', um: 'kg', pret: '', furnizor: '' });
        }}>Adaugă</Btn>
        <Btn varianta="discret" onClick={() => setDeschis(false)}>Renunță</Btn>
      </div>
    </div>
  );
}

export default function MasterData() {
  const { state, update } = useStore();
  const [tab, setTab] = useState<(typeof TABURI)[number]>('Produse');
  const [cauta, setCauta] = useState('');
  const [dlgIng, setDlgIng] = useState<Ingredient | null>(null);
  const [dlgProd, setDlgProd] = useState<Produs | null>(null);
  const [furnNou, setFurnNou] = useState('');

  const q = cauta.toLowerCase();
  const ingrediente = useMemo(() => state.ingrediente.filter(i =>
    (tab === 'Ambalaje' ? i.tip === 'PACKAGING' : i.tip === 'FOOD') &&
    (i.denumire.toLowerCase().includes(q) || i.cod.toLowerCase().includes(q))), [state.ingrediente, q, tab]);
  const produse = useMemo(() => state.produse.filter(p =>
    p.denumire.toLowerCase().includes(q) || p.cod.toLowerCase().includes(q)), [state.produse, q]);

  return (
    <div>
      <Titlu actiuni={<In placeholder="Caută…" value={cauta} onChange={e => setCauta(e.target.value)} className="w-44" />}>Master Data</Titlu>
      <div className="mb-4 flex flex-wrap gap-1 rounded-md border bg-card p-1">
        {TABURI.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cx('rounded px-3 py-1.5 text-sm font-semibold', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{t}</button>
        ))}
      </div>

      {tab === 'Produse' && (
        <T>
          <thead><tr><Th>Cod</Th><Th>Denumire</Th><Th>Categorie</Th><Th>Tip</Th><Th dr>Preț InStore</Th><Th dr>Preț Delivery</Th><Th dr>TVA</Th><Th>Rețetă</Th><Th /></tr></thead>
          <tbody>
            {produse.map(p => {
              const r = state.retete.find(x => x.cod === p.cod);
              return (
                <tr key={p.cod} className={!p.activ ? 'opacity-50' : ''}>
                  <Td className="num">{p.cod}</Td><Td>{p.denumire}</Td><Td>{p.categorie}</Td>
                  <Td>{p.tip === 'COMBO' ? <Insigna fel="info">COMBO ({p.combo?.length ?? 0} comp.)</Insigna> : 'Simplu'}</Td>
                  <Td dr>{fmtLei(p.pretInstore)}</Td><Td dr>{fmtLei(p.pretDelivery)}</Td><Td dr>{p.tva}%</Td>
                  <Td>{p.tip === 'COMBO' ? <Insigna fel="ok">din componente</Insigna> : r ? <Insigna fel="ok">v{r.activa}</Insigna> : <Insigna fel="warn">fără rețetă</Insigna>}</Td>
                  <Td><Btn varianta="linie" className="h-7 px-2 text-xs" onClick={() => setDlgProd(p)}>Prețuri</Btn></Td>
                </tr>
              );
            })}
          </tbody>
        </T>
      )}

      {(tab === 'Ingrediente' || tab === 'Ambalaje') && (
        <div className="space-y-3">
          <FormIngredientNou ambalaj={tab === 'Ambalaje'} />
          <T>
            <thead><tr><Th>Cod</Th><Th>Denumire</Th><Th>Categorie</Th><Th>UM bază</Th><Th>Furnizor</Th><Th dr>Preț net curent</Th><Th dr>Versiuni preț</Th><Th /></tr></thead>
            <tbody>
              {ingrediente.map(i => (
                <tr key={i.cod}>
                  <Td className="num">{i.cod}</Td><Td>{i.denumire}</Td><Td>{i.categorie}</Td><Td>{i.um}</Td>
                  <Td>{state.furnizori.find(f => f.cod === i.furnizor)?.nume ?? '—'}</Td>
                  <Td dr>{fmtLei(pretCurent(i))} lei/{i.um}</Td>
                  <Td dr>{i.preturi.length}</Td>
                  <Td><Btn varianta="linie" className="h-7 px-2 text-xs" onClick={() => setDlgIng(i)}>Preț nou</Btn></Td>
                </tr>
              ))}
            </tbody>
          </T>
        </div>
      )}

      {tab === 'Furnizori' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <In placeholder="Nume furnizor nou" value={furnNou} onChange={e => setFurnNou(e.target.value)} className="max-w-xs" />
            <Btn disabled={!furnNou.trim()} onClick={() => {
              const cod = `F${String(state.furnizori.length + 1).padStart(2, '0')}`;
              update(s => ({ ...s, furnizori: [...s.furnizori, { cod, nume: furnNou.trim() }] }));
              setFurnNou('');
            }}>Adaugă</Btn>
          </div>
          <T>
            <thead><tr><Th>Cod</Th><Th>Nume</Th><Th dr>Ingrediente livrate</Th><Th dr>Oferte de preț</Th><Th dr>Valoare listă (lei, la prețuri curente)</Th></tr></thead>
            <tbody>
              {state.furnizori.map(f => {
                const ale = state.ingrediente.filter(i => i.furnizor === f.cod);
                return (
                  <tr key={f.cod}>
                    <Td className="num">{f.cod}</Td><Td>{f.nume}</Td>
                    <Td dr>{ale.length}</Td>
                    <Td dr>{state.pretFurnizori.filter(o => o.furnizor === f.cod).length}</Td>
                    <Td dr>{fmtLei(ale.reduce((s2, i) => s2 + pretCurent(i), 0))}</Td>
                  </tr>
                );
              })}
            </tbody>
          </T>
        </div>
      )}

      {tab === 'Categorii' && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { titlu: 'Categorii produse', lista: [...new Set(state.produse.map(p => p.categorie))] },
            { titlu: 'Categorii ingrediente', lista: [...new Set(state.ingrediente.map(i => i.categorie))] },
          ].map(c => (
            <div key={c.titlu} className="rounded-md border bg-card p-4">
              <div className="mb-2 text-sm font-bold">{c.titlu}</div>
              <div className="flex flex-wrap gap-1.5">
                {c.lista.map(x => <span key={x} className="rounded border bg-muted px-2 py-0.5 text-xs font-semibold">{x}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Unități de măsură' && (
        <T>
          <thead><tr><Th>UM</Th><Th>UM de bază</Th><Th dr>Factor de conversie</Th></tr></thead>
          <tbody>
            {Object.entries(UMS).map(([um, u]) => (
              <tr key={um}><Td>{um}</Td><Td>{u.baza}</Td><Td dr>{u.f}</Td></tr>
            ))}
          </tbody>
        </T>
      )}

      {dlgIng && <DialogPretIngredient ing={dlgIng} inchide={() => setDlgIng(null)} />}
      {dlgProd && <DialogProdus prod={dlgProd} inchide={() => setDlgProd(null)} />}
    </div>
  );
}
