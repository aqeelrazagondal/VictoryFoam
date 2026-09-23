"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useTank } from "@/lib/tank/context";

export function GuidePage() {
  const { activeChemicals, tankReady } = useTank();
  const firstRun = activeChemicals.length === 0 || !tankReady;
  const [setupOpen, setSetupOpen] = useState(firstRun);

  return (
    <div className="space-y-8 pb-10">
      <h1>Guide</h1>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl">First-time setup (do this once)</h2>
          {!firstRun ? (
            <Button variant="ghost" size="touch" onClick={() => setSetupOpen((open) => !open)}>
              {setupOpen ? "Hide" : "Show"}
            </Button>
          ) : null}
        </div>
        {setupOpen ? (
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">Add your chemicals.</strong> Go to{" "}
              <Link href="/tank/chemicals/" className="font-medium text-primary underline-offset-4 hover:underline">
                Chemicals
              </Link>{" "}
              → Add. Just a name and a Solid Content % is enough to get started — you can fill in
              quantity, OH value, or viscosity later, or never.
            </li>
            <li>
              <strong className="text-foreground">(Optional) Set up your tank.</strong> If you&apos;re
              tracking a holding tank, open{" "}
              <Link href="/tank/setup/" className="font-medium text-primary underline-offset-4 hover:underline">
                Set up tank
              </Link>{" "}
              and enter what&apos;s currently in it (quantity + Solid %). If you don&apos;t have a
              tank to track, skip this — Blend Calculator works fine without it.
            </li>
            <li>That&apos;s it — you&apos;re ready to calculate.</li>
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Setup complete. Expand this if you need a refresher.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xl">A production day (Umer&apos;s 33% then 4 000 kg)</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>
            <strong className="text-foreground">Once:</strong> add Conventional (0%), POP 25, POP 45
            on{" "}
            <Link href="/tank/chemicals/" className="font-medium text-primary underline-offset-4 hover:underline">
              Chemicals
            </Link>
            .{" "}
            <Link href="/tank/setup/" className="font-medium text-primary underline-offset-4 hover:underline">
              Set up
            </Link>{" "}
            1 500 kg at 25% as POP 25. Capacity 8 000 kg. Heel 890 kg if that bottom stock stays in
            the tank.
          </li>
          <li>
            <strong className="text-foreground">Make 33%:</strong> Home → type 33 → Plan this fill.
            Confirm POP 45 + Conventional. Log it. That is 5 033 kg + 1 467 kg on top of the 1 500 kg.
          </li>
          <li>
            <strong className="text-foreground">After 80 kg/min × 50 min:</strong>{" "}
            <Link href="/tank/log/" className="font-medium text-primary underline-offset-4 hover:underline">
              Tank Log
            </Link>{" "}
            → Consume. Type 80 and 50, or 4 000. The table shows used and remaining of each polyol.
            The leftover is still 33%.
          </li>
          <li>
            <strong className="text-foreground">Next job at 28%:</strong> Home → type 28 → Plan this
            fill. Do not dilute 33% to 25% first. Fill picks a little Conventional plus POP 25 in one
            step.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl">Every time you use it</h2>
        <ul className="mt-4 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Making a fresh batch from scratch?</strong> →{" "}
            <Link href="/tank/blend/" className="font-medium text-primary underline-offset-4 hover:underline">
              Blend Calculator
            </Link>
            . Pick two chemicals, say what % and how much you need. If you must use a third drum,
            tap Add a third chemical and lock that kg — the other two fill the rest.
          </li>
          <li>
            <strong className="text-foreground">Topping up your tank with two chemicals?</strong> →{" "}
            <Link href="/tank/fill/" className="font-medium text-primary underline-offset-4 hover:underline">
              Fill Calculator
            </Link>
            . Say your target volume and %, and it&apos;ll suggest which two chemicals to use. Add a
            third chemical only if you need to lock one drum&apos;s kg.
          </li>
          <li>
            <strong className="text-foreground">Just added a batch or used some from the tank?</strong>{" "}
            →{" "}
            <Link href="/tank/log/" className="font-medium text-primary underline-offset-4 hover:underline">
              Tank Log
            </Link>{" "}
            → Add Entry. Pick Add Batch or Consume/Usage, enter the amount, done — everything else
            updates itself.
          </li>
          <li>
            <strong className="text-foreground">Want to know what&apos;s left of each chemical in the tank?</strong>{" "}
            →{" "}
            <Link href="/tank/composition/" className="font-medium text-primary underline-offset-4 hover:underline">
              Tank Composition
            </Link>
            . No calculation needed, it&apos;s always current.
          </li>
          <li>
            <strong className="text-foreground">Want the last tank to reach a target % such as 53%?</strong>{" "}
            →{" "}
            <Link href="/tank/planner/" className="font-medium text-primary underline-offset-4 hover:underline">
              Tank Planner
            </Link>
            . Type the target. Edit volume or solid % if this what-if is not the last logged tank.
            The app lists how many kg of which chemical to add, or tells you to add a stronger drum.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl">Glossary</h2>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="font-medium">Solid Content %</dt>
            <dd className="text-muted-foreground">
              The number you&apos;re targeting/blending on every screen.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Heel / Dead stock</dt>
            <dd className="text-muted-foreground">
              The part of the tank you physically can&apos;t draw out.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Drawable Now</dt>
            <dd className="text-muted-foreground">
              How much you can actually still use right now (tank volume minus heel).
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
