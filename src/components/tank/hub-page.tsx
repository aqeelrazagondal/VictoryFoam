"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Beaker, Droplets, FlaskConical, NotebookPen } from "lucide-react";

import { EmptyState, Field } from "@/components/tank/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { drawableNow, formatPct, formatQty, isHeelBreach } from "@/lib/calculations";
import { useTank } from "@/lib/tank/context";
import { parseNumber } from "@/lib/tank/parse";

export function HubPage() {
  const { loading, error, activeChemicals, tankReady, snapshot, settings } = useTank();
  const [nextPct, setNextPct] = useState("");
  const [nextVol, setNextVol] = useState("");
  const heel = settings?.heel ?? 0;
  const drawable = drawableNow(snapshot.volume, heel);
  const heelWarning = isHeelBreach(snapshot.volume, heel);
  const nextTarget = parseNumber(nextPct);
  const nextVolume = parseNumber(nextVol);

  useEffect(() => {
    if (nextVol !== "") return;
    if (settings?.capacity == null) return;
    setNextVol(String(settings.capacity));
  }, [nextVol, settings?.capacity]);

  const canPlan = nextTarget !== null && nextVolume !== null && nextVolume > snapshot.volume;
  const fillHref = canPlan
    ? `/tank/fill/?volume=${encodeURIComponent(String(nextVolume))}&pct=${encodeURIComponent(String(nextTarget))}`
    : "/tank/fill/";

  if (loading) {
    return (
      <div className="space-y-4">
        <h1>Foam calculator</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1>Foam calculator</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1>Foam calculator</h1>
        <p className="mt-2 text-muted-foreground">
          One decision at a time. Blend a batch, or track a holding tank if you have one.
        </p>
      </div>

      {activeChemicals.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="size-8" />}
          title="Add your first chemical"
          description="Just a name and a Solid Content % is enough to start blending."
          actionLabel="Add chemical"
          actionHref="/tank/chemicals/"
        />
      ) : (
        <div className="grid gap-3">
          <Button asChild size="touch" className="justify-start">
            <Link href="/tank/blend/">
              <Beaker className="size-5" />
              Blend a fresh batch
            </Link>
          </Button>
          {tankReady ? (
            <Button asChild size="touch" variant="secondary" className="justify-start">
              <Link href="/tank/fill/">
                <Droplets className="size-5" />
                Top up the tank
              </Link>
            </Button>
          ) : (
            <EmptyState
              title="No tank set up"
              description="Blend Calculator works without a tank. Set one up only if you are tracking a holding tank."
              actionLabel="Set up tank"
              actionHref="/tank/setup/"
            />
          )}
        </div>
      )}

      {tankReady ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg">Current tank</h2>
          {heelWarning ? (
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
              Running volume is below the heel. This is physically unlikely — check the log.
            </p>
          ) : null}
          <p className="mt-4 text-sm uppercase tracking-wide text-muted-foreground">Volume</p>
          <p className="hero-number">{formatQty(snapshot.volume)} kg</p>
          <p className="mt-4 text-sm uppercase tracking-wide text-muted-foreground">Solid content</p>
          <p className="hero-number">{formatPct(snapshot.solidPct)}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Drawable now: {formatQty(drawable)} kg
            {heel > 0 ? ` (heel ${formatQty(heel)} kg is part of this mix)` : ""}
          </p>
          <Field
            id="next-vol"
            label="Fill the tank to (kg)"
            hint={`Must be more than the current ${formatQty(snapshot.volume)} kg.`}
          >
            <Input
              id="next-vol"
              inputMode="decimal"
              value={nextVol}
              onChange={(event) => setNextVol(event.target.value)}
              placeholder="8000"
            />
          </Field>
          <Field id="next-pct" label="Target Solid Content %">
            <Input
              id="next-pct"
              inputMode="decimal"
              value={nextPct}
              onChange={(event) => setNextPct(event.target.value)}
              placeholder="33"
            />
          </Field>
          {canPlan ? (
            <Button asChild size="touch" className="mt-3 w-full">
              <Link href={fillHref}>Plan this fill</Link>
            </Button>
          ) : (
            <Button size="touch" className="mt-3 w-full" disabled>
              Plan this fill
            </Button>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="touch">
              <Link href="/tank/log/">
                <NotebookPen className="size-4" />
                Tank log
              </Link>
            </Button>
            <Button asChild variant="outline" size="touch">
              <Link href="/tank/composition/">Composition</Link>
            </Button>
            <Button asChild variant="outline" size="touch">
              <Link href="/tank/planner/">Planner</Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
