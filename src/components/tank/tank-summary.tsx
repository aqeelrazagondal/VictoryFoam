import { formatPct, formatQty } from "@/lib/calculations";

export function TankSummary({
  volume,
  solidPct,
  room,
  rows,
}: {
  volume: number;
  solidPct: number;
  room: number | null;
  rows?: { id: string; name: string; amount: number }[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-live="polite">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">In the tank</p>
      <p className="hero-number">{formatQty(volume)} kg</p>
      <p className="mt-4 text-sm uppercase tracking-wide text-muted-foreground">Overall solid content</p>
      <p className="hero-number">{formatPct(solidPct)}</p>
      {room != null ? (
        <p className="mt-4 text-sm">You can add at most {formatQty(room)} kg.</p>
      ) : null}
      {rows && rows.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex items-baseline justify-between gap-3">
              <span>{row.name}</span>
              <span className="font-medium">{formatQty(row.amount)} kg</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
