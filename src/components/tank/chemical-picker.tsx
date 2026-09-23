"use client";

import { FlaskConical } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/tank/empty-state";
import { Input } from "@/components/ui/input";
import type { Chemical } from "@/lib/tank/models";
import { cn } from "@/lib/utils";
import { formatPct, formatQty } from "@/lib/calculations";

export function ChemicalPicker({
  chemicals,
  selectedId,
  excludedId,
  excludedIds,
  onSelect,
  emptyTitle = "Add your first chemical",
}: {
  chemicals: Chemical[];
  selectedId?: string | null;
  excludedId?: string | null;
  excludedIds?: readonly string[];
  onSelect: (chemical: Chemical) => void;
  emptyTitle?: string;
}) {
  const [query, setQuery] = useState("");
  const hidden = useMemo(() => {
    const ids = new Set(excludedIds ?? []);
    if (excludedId) ids.add(excludedId);
    return ids;
  }, [excludedId, excludedIds]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return chemicals.filter((chemical) => {
      if (hidden.has(chemical.id)) return false;
      if (!needle) return true;
      return chemical.name.toLowerCase().includes(needle);
    });
  }, [chemicals, hidden, query]);

  if (chemicals.length === 0) {
    return (
      <EmptyState
        icon={<FlaskConical className="size-8" />}
        title={emptyTitle}
        description="A name and a Solid Content % is enough. You can add stock later, or never."
        actionLabel="Add chemical"
        actionHref="/tank/chemicals/"
      />
    );
  }

  return (
    <div className="space-y-3">
      {chemicals.length > 5 ? (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chemicals"
          aria-label="Search chemicals"
        />
      ) : null}
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No chemicals match that search.</p>
      ) : (
        <ul className="grid gap-2">
          {visible.map((chemical) => {
            const selected = chemical.id === selectedId;
            return (
              <li key={chemical.id}>
                <button
                  type="button"
                  onClick={() => onSelect(chemical)}
                  className={cn(
                    "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                  aria-pressed={selected}
                >
                  <span>
                    <span className="block font-medium">{chemical.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatPct(chemical.solidContentPct)}
                      {chemical.qtyAvailable === null
                        ? " · Stock not tracked"
                        : ` · ${formatQty(chemical.qtyAvailable)} ${chemical.unit} available`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
