"use client";

import { ChemicalPicker } from "@/components/tank/chemical-picker";
import { Field } from "@/components/tank/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPct } from "@/lib/calculations";
import type { Chemical } from "@/lib/tank/models";

export function ThirdChemicalPanel({
  chemicals,
  excludedIds,
  chemical,
  quantity,
  quantityId,
  hint,
  onChemicalChange,
  onQuantityChange,
  onClear,
}: {
  chemicals: Chemical[];
  excludedIds: readonly string[];
  chemical: Chemical | null;
  quantity: string;
  quantityId: string;
  hint?: string;
  onChemicalChange: (chemical: Chemical) => void;
  onQuantityChange: (value: string) => void;
  onClear: () => void;
}) {
  if (!chemical) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Optional. Lock how much of a third chemical to use. The other two are calculated from
          the remaining kg and %.
        </p>
        <ChemicalPicker chemicals={chemicals} excludedIds={excludedIds} onSelect={onChemicalChange} />
        <Button variant="secondary" size="touch" className="w-full" onClick={onClear}>
          Use two chemicals only
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        Third chemical: {chemical.name} ({formatPct(chemical.solidContentPct)})
      </p>
      <Field id={quantityId} label={`How much ${chemical.name} to use (kg)`} hint={hint}>
        <Input
          id={quantityId}
          inputMode="decimal"
          value={quantity}
          onChange={(event) => onQuantityChange(event.target.value)}
        />
      </Field>
      <Button variant="secondary" size="touch" className="w-full" onClick={onClear}>
        Use two chemicals only
      </Button>
    </div>
  );
}
