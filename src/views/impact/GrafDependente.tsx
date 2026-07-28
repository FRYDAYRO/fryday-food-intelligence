import { useMemo } from 'react';
import { grafIngredient, type NodGraf } from '../../lib/decizii';
import type { Ctx } from '../../lib/engine';
import { fmtInt } from '../../lib/engine';

const CULOARE: Record<NodGraf['tip'], string> = {
  INGREDIENT: '#B97A0A', SEMIPREPARAT: '#2563A6', PRODUS: '#1E7F4F', COMBO: '#6B4E9E',
};
const NIVEL_NUME = ['Ingredient', 'Semipreparat', 'Produse', 'Meniuri combo'];

const LAT = 168, INAL = 40, GAP_X = 62, GAP_Y = 14, PAD = 14;

export default function GrafDependente({ codIng, ctx, impacturi }: {
  codIng: string; ctx: Ctx; impacturi?: Map<string, number>;
}) {
  const { noduri, muchii, pozitii, w, h, niveleFolosite } = useMemo(() => {
    const g = grafIngredient(codIng, ctx);
    const nivele = [...new Set(g.noduri.map(n => n.nivel))].sort();
    const perNivel = new Map<number, NodGraf[]>();
    for (const n of g.noduri) perNivel.set(n.nivel, [...(perNivel.get(n.nivel) ?? []), n]);
    const maxCol = Math.max(1, ...[...perNivel.values()].map(v => v.length));
    const poz = new Map<string, { x: number; y: number }>();
    nivele.forEach((niv, col) => {
      const lista = perNivel.get(niv)!;
      const inaltimeCol = lista.length * INAL + (lista.length - 1) * GAP_Y;
      const inaltimeMax = maxCol * INAL + (maxCol - 1) * GAP_Y;
      lista.forEach((n, i) => poz.set(n.id, {
        x: PAD + col * (LAT + GAP_X),
        y: PAD + 22 + (inaltimeMax - inaltimeCol) / 2 + i * (INAL + GAP_Y),
      }));
    });
    return {
      noduri: g.noduri, muchii: g.muchii, pozitii: poz,
      w: PAD * 2 + nivele.length * LAT + (nivele.length - 1) * GAP_X,
      h: PAD * 2 + 26 + maxCol * INAL + (maxCol - 1) * GAP_Y,
      niveleFolosite: nivele,
    };
  }, [codIng, ctx]);

  if (noduri.length <= 1) {
    return <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Ingredientul nu apare în nicio rețetă activă — fără dependențe de afișat.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-card p-2">
      <svg width={w} height={h} style={{ minWidth: w }}>
        {niveleFolosite.map((niv, col) => (
          <text key={niv} x={PAD + col * (LAT + GAP_X)} y={12} fontSize={10} fontWeight={700} fill="#8A8173" letterSpacing="0.06em">
            {(NIVEL_NUME[niv] ?? '').toUpperCase()}
          </text>
        ))}
        {muchii.map((m, i) => {
          const a = pozitii.get(m.de), b = pozitii.get(m.la);
          if (!a || !b) return null;
          const x1 = a.x + LAT, y1 = a.y + INAL / 2, x2 = b.x, y2 = b.y + INAL / 2;
          const mx = (x1 + x2) / 2;
          return (
            <g key={i}>
              <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke="#D6CFC2" strokeWidth={1.6} />
              <circle cx={x2} cy={y2} r={2.5} fill="#D6CFC2" />
              <text x={mx} y={(y1 + y2) / 2 - 4} fontSize={9} textAnchor="middle" fill="#8A8173">{m.eticheta}</text>
            </g>
          );
        })}
        {noduri.map(n => {
          const p = pozitii.get(n.id)!;
          const imp = impacturi?.get(n.id);
          return (
            <g key={n.id}>
              <rect x={p.x} y={p.y} width={LAT} height={INAL} rx={6} fill="#fff" stroke={CULOARE[n.tip]} strokeWidth={n.nivel === 0 ? 2.2 : 1.4} />
              <rect x={p.x} y={p.y} width={4} height={INAL} rx={2} fill={CULOARE[n.tip]} />
              <text x={p.x + 12} y={p.y + (imp != null ? 17 : 24)} fontSize={12} fontWeight={600} fill="#241F19">
                {n.nume.length > 22 ? n.nume.slice(0, 21) + '…' : n.nume}
              </text>
              {imp != null && (
                <text x={p.x + 12} y={p.y + 31} fontSize={11} fill={imp > 0 ? '#1E7F4F' : '#C6373C'} fontFamily="IBM Plex Mono, monospace">
                  {imp >= 0 ? '+' : ''}{fmtInt(imp)} lei/lună
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
