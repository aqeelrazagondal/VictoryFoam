"use client";

import { EmptyState, Field, TankLoading } from "@/components/tank/empty-state";
import { ScreenHeading } from "@/components/tank/screen-help";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTank } from "@/lib/tank/context";
import { parseNumber } from "@/lib/tank/parse";
import { saveTankSettings, TankError } from "@/lib/tank/repository";
import { useState } from "react";

export function SetupPage() {
  const { tankReady, activeTank, refresh, loading } = useTank();
  const [capacity, setCapacity] = useState(activeTank?.capacity != null ? String(activeTank.capacity) : "");
  const [heel, setHeel] = useState(activeTank?.heel ? String(activeTank.heel) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return <TankLoading title="Tank settings" />;
  }

  if (!activeTank) {
    return (
      <div className="space-y-4">
        <ScreenHeading title="Tank settings">
          Choose a name on Home. Then you can set capacity and heel.
        </ScreenHeading>
        <EmptyState title="Name a tank first" actionLabel="Name a tank" actionHref="/tank/" />
      </div>
    );
  }

  if (!tankReady) {
    return (
      <div className="space-y-4">
        <ScreenHeading title="Tank settings">
          Capacity and heel wait until this tank has an opening amount.
        </ScreenHeading>
        <EmptyState title="Set the opening on Home" actionLabel="Open tank" actionHref="/tank/" />
      </div>
    );
  }

  async function saveSettings() {
    if (saving || !activeTank) return;
    const tankId = activeTank.id;
    setSaving(true);
    setError(null);
    try {
      await saveTankSettings(tankId, {
        capacity: parseNumber(capacity),
        heel: parseNumber(heel) ?? 0,
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof TankError ? caught.message : "Could not save tank settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <ScreenHeading title="Tank settings">
        Capacity and heel for {activeTank.name}. Opening mass is already on the log.
      </ScreenHeading>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="capacity" label="Tank capacity (optional)">
          <Input
            id="capacity"
            inputMode="decimal"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </Field>
        <Field
          id="heel"
          label="Minimum left in the tank (optional)"
          hint="A warning only, sometimes called the heel. The tank can still go below this."
        >
          <Input
            id="heel"
            inputMode="decimal"
            value={heel}
            onChange={(event) => setHeel(event.target.value)}
          />
        </Field>
      </div>
      <Button size="touch" className="w-full" disabled={saving} onClick={() => void saveSettings()}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
