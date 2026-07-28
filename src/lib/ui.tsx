import type { ReactNode, SelectHTMLAttributes } from 'react';

export const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

export function Kpi({ eticheta, valoare, sub, ton }: {
  eticheta: string; valoare: ReactNode; sub?: ReactNode; ton?: 'bun' | 'rau' | 'neutru';
}) {
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eticheta}</div>
      <div className={cx('num mt-1 text-2xl font-semibold leading-tight',
        ton === 'bun' && 'text-ok', ton === 'rau' && 'text-danger')}>{valoare}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Titlu({ children, actiuni }: { children: ReactNode; actiuni?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-end justify-between gap-3 first:mt-0">
      <h2 className="font-display text-lg font-extrabold tracking-tight">{children}</h2>
      {actiuni}
    </div>
  );
}

export function Sel(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select {...rest}
      className={cx('h-9 rounded-md border bg-card px-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring', className)} />
  );
}

export function T({ children, dens }: { children: ReactNode; dens?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table className={cx('w-full text-sm', dens && 'text-[13px]')}>{children}</table>
    </div>
  );
}
export const Th = ({ children, dr }: { children?: ReactNode; dr?: boolean }) => (
  <th className={cx('whitespace-nowrap border-b bg-muted/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground', dr && 'text-right')}>{children}</th>
);
export const Td = ({ children, dr, className }: { children?: ReactNode; dr?: boolean; className?: string }) => (
  <td className={cx('whitespace-nowrap border-b px-3 py-1.5 align-middle last:border-b', dr && 'num text-right', className)}>{children}</td>
);

export function Insigna({ fel, children }: { fel: 'FOOD' | 'PAPER' | 'EXCLUS' | 'ok' | 'warn' | 'info'; children: ReactNode }) {
  const stil: Record<string, string> = {
    FOOD: 'bg-amber-100 text-amber-900 border-amber-200',
    PAPER: 'bg-stone-200 text-stone-800 border-stone-300',
    EXCLUS: 'bg-red-100 text-red-800 border-red-200',
    ok: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    warn: 'bg-orange-100 text-orange-900 border-orange-200',
    info: 'bg-sky-100 text-sky-900 border-sky-200',
  };
  return <span className={cx('inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold', stil[fel])}>{children}</span>;
}

export function Gol({ titlu, sub }: { titlu: string; sub?: string }) {
  return (
    <div className="rounded-md border border-dashed bg-card px-6 py-10 text-center">
      <div className="font-semibold">{titlu}</div>
      {sub && <div className="mt-1 text-sm text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Camp({ eticheta, children }: { eticheta: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{eticheta}</span>
      {children}
    </label>
  );
}

export const In = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const { className, ...rest } = props;
  return <input {...rest} className={cx('h-9 w-full rounded-md border bg-card px-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring', className)} />;
};

export const Btn = (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { varianta?: 'plin' | 'linie' | 'discret' | 'pericol' }) => {
  const { className, varianta = 'plin', ...rest } = props;
  const v = {
    plin: 'bg-primary text-primary-foreground hover:bg-primary/90',
    linie: 'border bg-card hover:bg-muted',
    discret: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    pericol: 'bg-danger text-white hover:opacity-90',
  }[varianta];
  return <button {...rest} className={cx('inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors disabled:opacity-50', v, className)} />;
};
