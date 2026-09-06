import { useMemo, useState } from 'react';
import { useSel, useStore } from '../../lib/store';
import type { Schimbare } from '../../lib/types';
import {
  aplicaScenariu, impactRetea, kpiProdus, versiuneActiva, volumeLuna,
  fmtInt, fmtLei, fmtPP, fmtPct,
} from '../../lib/engine';
import { simulPromotie, type TipPromotie } from '../../lib/portofoliu';
import { Camp, Gol, In, Insigna, Sel, T, Td, Th, cx } from '../../lib/ui';

const Card = ({ e, children }: { e: string; children: React.ReactNode }) => (
  <div className="rounded-md border bg-card px-3 py-2.5">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{e}</div>
    <div className="mt-0.5">{children}</div>
  </div>
);

// ————————————————— Product Impact Dashboard: „Ce se întâmplă dacă modific acest produs?"
export function ImpactRapid() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const [cod, setCod] = useState(state.produse[0]?.cod ?? '');
  const p = state.produse.find(x => x.cod === cod);
  const ret = state.retete.find(r => r.cod === cod);
  const linii = ret ? versiuneActiva(ret).linii : [];

  const [pIn, setPIn] = useState('');
  const [pDlv, setPDlv] = useState('');
  const [linie, setLinie] = useState(0);
  const [cantNoua, setCantNoua] = useState('');

  const alege = (c: string) => { setCod(c); setPIn(''); setPDlv(''); setLinie(0); setCantNoua(''); };

  const rez = useMemo(() => {
    if (!p) return null;
    const schimbari: Schimbare[] = [];
    if (pIn && Number(pIn) > 0 && Number(pIn) !== p.pretInstore) schimbari.push({ tip: 'PRET_VANZARE', produs: cod, canal: 'INSTORE', pretNou: Number(pIn) });
    if (pDlv && Number(pDlv) > 0 && Number(pDlv) !== p.pretDelivery) schimbari.push({ tip: 'PRET_VANZARE', produs: cod, canal: 'DELIVERY', pretNou: Number(pDlv) });
    if (ret && cantNoua && Number(cantNoua) > 0 && Number(cantNoua) !== linii[linie]?.cant) schimbari.push({ tip: 'GRAMAJ', reteta: cod, linie, cantNoua: Number(cantNoua) });
    if (!schimbari.length) return null;
    const { ctx: c1, ctxBaza, produseNoi, preturiVanzare } = aplicaScenariu(state, schimbari, { peIstoric: true });
    const retea = impactRetea(state, ctxBaza, c1, produseNoi, preturiVanzare, sel.luna);
    const afectate: { cod: string; denumire: string }[] = [];
    for (const [pc, pp] of c1.produse) {
      const a = kpiProdus(pc, 'INSTORE', ctx); const b = kpiProdus(pc, 'INSTORE', c1);
      const a2 = kpiProdus(pc, 'DELIVERY', ctx); const b2 = kpiProdus(pc, 'DELIVERY', c1);
      const dif = Math.abs((b?.cost?.total ?? 0) - (a?.cost?.total ?? 0)) > 0.0005 ||
        Math.abs((b?.net ?? 0) - (a?.net ?? 0)) > 0.0005 ||
        Math.abs((b2?.cost?.total ?? 0) - (a2?.cost?.total ?? 0)) > 0.0005 ||
        Math.abs((b2?.net ?? 0) - (a2?.net ?? 0)) > 0.0005;
      if (dif) afectate.push({ cod: pc, denumire: pp.denumire });
    }
    const kpi = (['INSTORE', 'DELIVERY'] as const).map(canal => ({
      canal, a: kpiProdus(cod, canal, ctx), b: kpiProdus(cod, canal, c1),
    }));
    return { retea, afectate, kpi, schimbari };
  }, [p, ret, cod, pIn, pDlv, linie, cantNoua, linii, state, ctx, sel.luna]);

  if (!p) return <Gol titlu="Niciun produs" />;

  return (
    <div>
      <div className="rounded-md border bg-card p-4">
        <div className="grid items-end gap-2 md:grid-cols-5">
          <Camp eticheta="Produsul modificat">
            <Sel value={cod} onChange={e => alege(e.target.value)}>
              {state.produse.map(x => <option key={x.cod} value={x.cod}>{x.denumire}</option>)}
            </Sel>
          </Camp>
          <Camp eticheta={`Preț InStore nou (acum ${fmtLei(p.pretInstore)})`}><In type="number" step="0.1" value={pIn} onChange={e => setPIn(e.target.value)} placeholder={String(p.pretInstore ?? '')} /></Camp>
          <Camp eticheta={`Preț Delivery nou (acum ${fmtLei(p.pretDelivery)})`}><In type="number" step="0.1" value={pDlv} onChange={e => setPDlv(e.target.value)} placeholder={String(p.pretDelivery ?? '')} /></Camp>
          {ret && linii.length > 0 && <>
            <Camp eticheta="Linia de rețetă">
              <Sel value={linie} onChange={e => { setLinie(Number(e.target.value)); setCantNoua(''); }}>
                {linii.map((l, i) => <option key={i} value={i}>{state.ingrediente.find(x => x.cod === l.comp)?.denumire ?? state.retete.find(x => x.cod === l.comp)?.denumire ?? l.comp} · {l.cant} {l.um}</option>)}
              </Sel>
            </Camp>
            <Camp eticheta={`Cantitate nouă (${linii[linie]?.um})`}><In type="number" step="any" value={cantNoua} onChange={e => setCantNoua(e.target.value)} placeholder={String(linii[linie]?.cant ?? '')} /></Camp>
          </>}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Modifică oricare dintre câmpuri — răspunsul apare instant, fără a atinge datele reale. Pentru scenarii complexe folosește tabul „Simulare & impact".</p>
      </div>

      {rez && (() => {
        const { inainte, dupa } = rez.retea;
        const dP = dupa.profit - inainte.profit;
        return (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Card e="Food Cost rețea — actual → nou">
                <span className="num text-lg font-semibold">{fmtPct(inainte.fc)} → {fmtPct(dupa.fc)}</span>
                <div className={cx('num text-sm font-bold', (dupa.fc ?? 0) > (inainte.fc ?? 0) ? 'text-danger' : 'text-ok')}>{fmtPP(dupa.fc != null && inainte.fc != null ? dupa.fc - inainte.fc : null)}</div>
              </Card>
              <Card e="Profit rețea — actual → nou">
                <span className="num text-lg font-semibold">{fmtInt(inainte.profit)} → {fmtInt(dupa.profit)} lei</span>
                <div className={cx('num text-sm font-bold', dP >= 0 ? 'text-ok' : 'text-danger')}>{dP >= 0 ? '+' : ''}{fmtInt(dP)} lei</div>
              </Card>
              <Card e="Impact lunar"><span className={cx('num text-lg font-semibold', dP >= 0 ? 'text-ok' : 'text-danger')}>{dP >= 0 ? '+' : ''}{fmtInt(dP)} lei</span></Card>
              <Card e="Impact anual (run-rate)"><span className={cx('num text-lg font-semibold', dP >= 0 ? 'text-ok' : 'text-danger')}>{dP >= 0 ? '+' : ''}{fmtInt(dP * 12)} lei</span></Card>
            </div>

            <T dens>
              <thead><tr><Th>Canal</Th><Th dr>Cost — actual → nou</Th><Th dr>FC % — actual → nou</Th><Th dr>Profit/buc — actual → nou</Th><Th dr>Marjă — actual → nou</Th></tr></thead>
              <tbody>
                {rez.kpi.map(k => (
                  <tr key={k.canal}>
                    <Td>{k.canal === 'INSTORE' ? 'InStore' : 'Delivery'}</Td>
                    <Td dr>{fmtLei(k.a?.cost?.total ?? null)} → <b>{fmtLei(k.b?.cost?.total ?? null)}</b></Td>
                    <Td dr>{fmtPct(k.a?.fc ?? null)} → <b>{fmtPct(k.b?.fc ?? null)}</b></Td>
                    <Td dr>{fmtLei(k.a?.profit ?? null)} → <b>{fmtLei(k.b?.profit ?? null)}</b></Td>
                    <Td dr>{fmtPct(k.a?.marja ?? null)} → <b>{fmtPct(k.b?.marja ?? null)}</b></Td>
                  </tr>
                ))}
              </tbody>
            </T>

            <div className="mt-3 rounded-md border bg-card px-4 py-3 text-sm">
              <b>Produse afectate ({rez.afectate.length}):</b>{' '}
              {rez.afectate.map(a => a.denumire).join(' · ')}
              {rez.afectate.length > 1 && <span className="text-muted-foreground"> — include propagarea prin meniurile combo.</span>}
            </div>
          </>
        );
      })()}
      {!rez && <div className="mt-4"><Gol titlu="Introdu o modificare pentru a vedea impactul" sub="Preț pe canal sau gramaj pe o linie de rețetă." /></div>}
    </div>
  );
}

// ————————————————— Price Change Analyzer
export function PriceChange() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const [cod, setCod] = useState(state.produse[0]?.cod ?? '');
  const [pIn, setPIn] = useState('');
  const [pDlv, setPDlv] = useState('');
  const p = state.produse.find(x => x.cod === cod);

  const rez = useMemo(() => {
    if (!p) return null;
    const schimbari: Schimbare[] = [];
    if (pIn && Number(pIn) > 0) schimbari.push({ tip: 'PRET_VANZARE', produs: cod, canal: 'INSTORE', pretNou: Number(pIn) });
    if (pDlv && Number(pDlv) > 0) schimbari.push({ tip: 'PRET_VANZARE', produs: cod, canal: 'DELIVERY', pretNou: Number(pDlv) });
    if (!schimbari.length) return null;
    const { ctx: c1, produseNoi, preturiVanzare } = aplicaScenariu(state, schimbari);
    const retea = impactRetea(state, ctx, c1, produseNoi, preturiVanzare, sel.luna);
    const vol = volumeLuna(state, sel.luna).get(cod) ?? { bucIn: 0, bucDlv: 0, netIn: 0, netDlv: 0 };
    const kpi = (['INSTORE', 'DELIVERY'] as const).map(canal => ({
      canal, buc: canal === 'INSTORE' ? vol.bucIn : vol.bucDlv,
      a: kpiProdus(cod, canal, ctx), b: kpiProdus(cod, canal, c1),
    }));
    return { retea, kpi };
  }, [p, cod, pIn, pDlv, state, ctx, sel.luna]);

  if (!p) return <Gol titlu="Niciun produs" />;

  return (
    <div>
      <div className="rounded-md border bg-card p-4">
        <div className="grid items-end gap-2 md:grid-cols-3">
          <Camp eticheta="Produs">
            <Sel value={cod} onChange={e => { setCod(e.target.value); setPIn(''); setPDlv(''); }}>
              {state.produse.map(x => <option key={x.cod} value={x.cod}>{x.denumire}</option>)}
            </Sel>
          </Camp>
          <Camp eticheta={`Preț InStore nou (acum ${fmtLei(p.pretInstore)} lei)`}><In type="number" step="0.1" value={pIn} onChange={e => setPIn(e.target.value)} /></Camp>
          <Camp eticheta={`Preț Delivery nou (acum ${fmtLei(p.pretDelivery)} lei)`}><In type="number" step="0.1" value={pDlv} onChange={e => setPDlv(e.target.value)} /></Camp>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Impactul folosește volumele istorice din PMIX ({sel.luna}), la volum constant — elasticitatea o testezi în Promo Analyzer.</p>
      </div>

      {rez && (() => {
        const dP = rez.retea.dupa.profit - rez.retea.inainte.profit;
        return (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Card e="Profit rețea Δ / lună"><span className={cx('num text-lg font-semibold', dP >= 0 ? 'text-ok' : 'text-danger')}>{dP >= 0 ? '+' : ''}{fmtInt(dP)} lei</span></Card>
              <Card e="Δ / an (run-rate)"><span className={cx('num text-lg font-semibold', dP >= 0 ? 'text-ok' : 'text-danger')}>{dP >= 0 ? '+' : ''}{fmtInt(dP * 12)} lei</span></Card>
              <Card e="FC rețea"><span className="num text-lg font-semibold">{fmtPct(rez.retea.inainte.fc)} → {fmtPct(rez.retea.dupa.fc)}</span></Card>
            </div>
            <T dens>
              <thead><tr><Th>Canal</Th><Th dr>Buc/lună (PMIX)</Th><Th dr>FC % nou</Th><Th dr>Marjă nouă</Th><Th dr>Profit/buc nou</Th><Th dr>Δ profit / lună</Th></tr></thead>
              <tbody>
                {rez.kpi.map(k => {
                  const d = ((k.b?.profit ?? 0) - (k.a?.profit ?? 0)) * k.buc;
                  return (
                    <tr key={k.canal}>
                      <Td>{k.canal === 'INSTORE' ? 'InStore' : 'Delivery'}</Td>
                      <Td dr>{fmtInt(k.buc)}</Td>
                      <Td dr>{fmtPct(k.a?.fc ?? null)} → <b>{fmtPct(k.b?.fc ?? null)}</b></Td>
                      <Td dr>{fmtPct(k.a?.marja ?? null)} → <b>{fmtPct(k.b?.marja ?? null)}</b></Td>
                      <Td dr>{fmtLei(k.a?.profit ?? null)} → <b>{fmtLei(k.b?.profit ?? null)}</b></Td>
                      <Td dr className={d > 0 ? 'text-ok' : d < 0 ? 'text-danger' : ''}>{d >= 0 ? '+' : ''}{fmtInt(d)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </T>
          </>
        );
      })()}
    </div>
  );
}

// ————————————————— Promotion Simulator (reducere · combo · cadou · meniu)
const TIPURI: { v: TipPromotie; l: string }[] = [
  { v: 'DISCOUNT', l: 'Reducere procentuală' },
  { v: 'COMBO', l: 'Combo (pachet)' },
  { v: 'CADOU', l: 'Produs cadou' },
  { v: 'MENIU', l: 'Meniu (pachet cu discount)' },
];

export function PromoAnalyzer() {
  const { state, ctx } = useStore();
  const { sel } = useSel();
  const [tip, setTip] = useState<TipPromotie>('DISCOUNT');
  const [produs, setProdus] = useState(state.produse[0]?.cod ?? '');
  const [produs2, setProdus2] = useState(state.produse[1]?.cod ?? '');
  const [cadou, setCadou] = useState(state.produse.find(p => (p.pretInstore ?? 0) < 10)?.cod ?? state.produse[2]?.cod ?? '');
  const [disc, setDisc] = useState('15');
  const [pretPachet, setPretPachet] = useState('');
  const [volum, setVolum] = useState('');
  const [canib, setCanib] = useState('70');

  const rez = useMemo(() => simulPromotie(state, ctx, {
    tip, produs,
    discountPct: Number(disc) || 0,
    produseCombo: tip === 'COMBO' || tip === 'MENIU' ? [produs, produs2] : undefined,
    pretPachet: pretPachet ? Number(pretPachet) : undefined,
    cadou: tip === 'CADOU' ? cadou : undefined,
    volumBaza: volum ? Number(volum) : undefined,
    canibalizarePct: Number(canib),
    uplifts: [0, 10, 20, 30],
  }, sel.luna), [state, ctx, tip, produs, produs2, cadou, disc, pretPachet, volum, canib, sel.luna]);

  const cuPachet = tip === 'COMBO' || tip === 'MENIU';

  return (
    <div>
      <div className="rounded-md border bg-card p-4">
        <div className="grid items-end gap-2 md:grid-cols-3 xl:grid-cols-4">
          <Camp eticheta="Tip promoție">
            <Sel value={tip} onChange={e => setTip(e.target.value as TipPromotie)}>
              {TIPURI.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </Sel>
          </Camp>
          <Camp eticheta={cuPachet ? 'Produsul 1 din pachet' : 'Produs'}>
            <Sel value={produs} onChange={e => setProdus(e.target.value)}>
              {state.produse.map(x => <option key={x.cod} value={x.cod}>{x.denumire}</option>)}
            </Sel>
          </Camp>
          {cuPachet && (
            <Camp eticheta="Produsul 2 din pachet">
              <Sel value={produs2} onChange={e => setProdus2(e.target.value)}>
                {state.produse.map(x => <option key={x.cod} value={x.cod}>{x.denumire}</option>)}
              </Sel>
            </Camp>
          )}
          {tip === 'CADOU' && (
            <Camp eticheta="Produsul oferit cadou">
              <Sel value={cadou} onChange={e => setCadou(e.target.value)}>
                {state.produse.map(x => <option key={x.cod} value={x.cod}>{x.denumire}</option>)}
              </Sel>
            </Camp>
          )}
          {(tip === 'DISCOUNT' || tip === 'MENIU') && (
            <Camp eticheta="Reducere (%)"><In type="number" step="1" value={disc} onChange={e => setDisc(e.target.value)} /></Camp>
          )}
          {tip === 'COMBO' && (
            <Camp eticheta="Preț pachet (lei, brut)"><In type="number" step="0.1" value={pretPachet} onChange={e => setPretPachet(e.target.value)} placeholder="ex. 32,90" /></Camp>
          )}
          {cuPachet && (
            <Camp eticheta="Pachete estimate / lună"><In type="number" value={volum} onChange={e => setVolum(e.target.value)} placeholder="implicit: 25% din volumul minim" /></Camp>
          )}
          {tip !== 'DISCOUNT' && (
            <Camp eticheta="Canibalizare (%)"><In type="number" value={canib} onChange={e => setCanib(e.target.value)} /></Camp>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Scenarii de volum +0 / +10 / +20 / +30% față de PMIX-ul lunii {sel.luna}.
          {tip !== 'DISCOUNT' && ' Canibalizarea = procentul din promoții care înlocuiesc vânzări care s-ar fi făcut oricum; profitul pierdut este scăzut automat.'}
        </p>
      </div>

      {!rez ? <div className="mt-4"><Gol titlu="Configurează promoția" /></div> : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Card e="Promoția simulată">
              <div className="text-sm font-semibold leading-tight">{rez.descriere}</div>
            </Card>
            <Card e="Unitate promoțională">
              <span className="num text-lg font-semibold">{fmtLei(rez.netUnitar)} net · cost {fmtLei(rez.costUnitar)}</span>
              <div className="num text-xs text-muted-foreground">FC {fmtPct(rez.fcUnitar)} · marjă {fmtPct(rez.marjaUnitara)}</div>
            </Card>
            <Card e="Profit / unitate">
              <span className={cx('num text-lg font-semibold', rez.profitUnitar - rez.pierdereUnitara >= 0 ? 'text-ok' : 'text-danger')}>
                {fmtLei(rez.profitUnitar - rez.pierdereUnitara)} lei
              </span>
              <div className="num text-xs text-muted-foreground">
                {rez.pierdereUnitara > 0 ? `brut ${fmtLei(rez.profitUnitar)} − canibalizare ${fmtLei(rez.pierdereUnitara)}` : 'fără canibalizare'}
              </div>
            </Card>
            <Card e="Break-even volum">
              {rez.upliftBreakEven != null
                ? <span className="num text-lg font-semibold text-ok">≈ +{rez.upliftBreakEven}% volum</span>
                : <span className="num text-lg font-semibold text-danger">peste +30%</span>}
              <div className="text-xs text-muted-foreground">creșterea minimă ca profitul să nu scadă</div>
            </Card>
          </div>

          <T dens>
            <thead><tr><Th>Scenariu volum</Th><Th dr>Unități/lună</Th><Th dr>Vânzări nete</Th><Th dr>Cost</Th><Th dr>FC %</Th><Th dr>Profit pierdut</Th><Th dr>Profit promoție</Th><Th dr>Δ vs azi</Th></tr></thead>
            <tbody>
              {rez.randuri.map(r => (
                <tr key={r.upliftPct} className={r.breakEven ? 'bg-ok/10' : ''}>
                  <Td>{r.upliftPct === 0 ? 'Volum neschimbat' : `+${r.upliftPct}% volum`}{r.breakEven && <span className="ml-1.5"><Insigna fel="ok">break-even</Insigna></span>}</Td>
                  <Td dr>{fmtInt(r.unitati)}</Td>
                  <Td dr>{fmtInt(r.net)}</Td>
                  <Td dr>{fmtInt(r.cost)}</Td>
                  <Td dr>{fmtPct(r.fc)}</Td>
                  <Td dr className={r.profitPierdut > 0 ? 'text-danger' : ''}>{r.profitPierdut > 0 ? `−${fmtInt(r.profitPierdut)}` : '—'}</Td>
                  <Td dr>{fmtInt(r.profit)}</Td>
                  <Td dr className={r.dProfit >= 0 ? 'text-ok font-semibold' : 'text-danger'}>{r.dProfit >= 0 ? '+' : ''}{fmtInt(r.dProfit)}</Td>
                </tr>
              ))}
            </tbody>
          </T>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {rez.tip === 'DISCOUNT'
              ? 'Reducerea afectează prețul net, deci FC% crește chiar la volum constant; „Δ vs azi" compară cu profitul actual al produsului.'
              : 'Pachetele nu există azi, deci baseline-ul este zero; „Δ vs azi" este profitul net al promoției, după scăderea vânzărilor canibalizate.'}
          </p>
        </>
      )}
    </div>
  );
}
