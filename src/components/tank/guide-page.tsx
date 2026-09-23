"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useTank } from "@/lib/tank/context";

function GuideLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

function Result({ children }: { children: string }) {
  return (
    <p className="mt-1 text-sm">
      <span className="font-medium text-foreground">Result: </span>
      {children}
    </p>
  );
}

export function GuidePage() {
  const { activeChemicals, tankReady } = useTank();
  const firstRun = activeChemicals.length === 0 || !tankReady;
  const [setupOpen, setSetupOpen] = useState(firstRun);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1>Guide</h1>
        <p className="mt-2 text-muted-foreground">
          Open this page any time you are stuck. Each step says what to tap and what number you
          should see afterwards.
        </p>
      </div>

      <section>
        <h2 className="text-xl">Which screen do I use?</h2>
        <ul className="mt-4 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Fresh batch in a mixer or drum, tank empty or ignored.</strong>{" "}
            <GuideLink href="/tank/blend/">Blend</GuideLink>
            <Result>Two drums, or three if you lock one amount. No tank log is written.</Result>
          </li>
          <li>
            <strong className="text-foreground">Tank already has something. Top it up to a kg and %.</strong>{" "}
            <GuideLink href="/tank/fill/">Fill</GuideLink>
            <Result>
              Two drums (or three if you lock one). Log it and Home shows the new tank kg and %.
            </Result>
          </li>
          <li>
            <strong className="text-foreground">How many kg of ONE drum to hit a %.</strong>{" "}
            <GuideLink href="/tank/planner/">Planner</GuideLink>
            <Result>
              One chemical only. This is a what-if. Nothing is saved until you Log that amount.
            </Result>
          </li>
          <li>
            <strong className="text-foreground">I poured or used foam.</strong>{" "}
            <GuideLink href="/tank/log/">Log</GuideLink>
            <Result>Home, Composition, and Fill all update from the new log.</Result>
          </li>
          <li>
            <strong className="text-foreground">What is left of each drum in the tank?</strong>{" "}
            <GuideLink href="/tank/composition/">Composition</GuideLink>
            <Result>A live table. No extra calculation.</Result>
          </li>
        </ul>
      </section>

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
              <strong className="text-foreground">Sign in</strong> if you see Factory sign-in. Ask
              the site owner for the shared factory account.
              <Result>You land on Home. The yellow “this device” banner should be gone.</Result>
            </li>
            <li>
              <strong className="text-foreground">Add your chemicals.</strong>{" "}
              <GuideLink href="/tank/chemicals/">Chemicals</GuideLink> → Add. Name + Solid Content %
              is enough.
              <Result>Each drum appears in the list. Blend can now pick them.</Result>
            </li>
            <li>
              <strong className="text-foreground">Set up the tank</strong> only if you track a holding
              tank.{" "}
              <GuideLink href="/tank/setup/">Set up tank</GuideLink> → what is in it now (kg + %),
              then optional capacity and heel.
              <Result>
                Home shows Current tank. Fill, Log, Composition, and Planner appear in the menu.
              </Result>
            </li>
            <li>
              If you do not have a tank, skip setup.{" "}
              <GuideLink href="/tank/blend/">Blend</GuideLink> still works.
            </li>
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Setup complete. Expand this if you need a refresher.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xl">Blend — fresh mix (2 or 3 drums)</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>
            Open <GuideLink href="/tank/blend/">Blend</GuideLink>. Pick chemical 1, then chemical 2.
            <Result>The app moves to Target %.</Result>
          </li>
          <li>
            Type the Solid Content % you want, then the total kg.
            <Result>See result shows how many kg of each of the two drums.</Result>
          </li>
          <li>
            Need a third drum? On the quantity step tap <strong className="text-foreground">Add a third chemical</strong>,
            pick it, and type how many kg of that one to lock.
            <Result>
              The locked kg stays as you typed. The first two drums are calculated so the batch still
              hits the target %.
            </Result>
          </li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">
          Blend does not change the tank. To put this mix into the tank, go to Log → Add batch.
        </p>
      </section>

      <section>
        <h2 className="text-xl">Fill — top up the tank (2 or 3 drums)</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>
            On <GuideLink href="/tank/">Home</GuideLink> type “Fill the tank to (kg)” and “Target
            Solid Content %”, then Plan this fill. Or open{" "}
            <GuideLink href="/tank/fill/">Fill</GuideLink> and enter the same numbers.
            <Result>
              Required blend % is for the added portion only, not the whole tank.
            </Result>
          </li>
          <li>
            Confirm the suggested pair, or pick two other drums.
            <Result>You see kg of drum A and drum B. Log writes two Add Batch rows.</Result>
          </li>
          <li>
            Need a third drum? Tap <strong className="text-foreground">Add a third chemical</strong>{" "}
            and lock that kg.
            <Result>The pair fills the rest. Log writes three Add Batch rows.</Result>
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl">Planner — one chemical only</h2>
        <p className="mt-3 text-muted-foreground">
          Planner answers: “If I add only this one drum, how many kg to reach 53%?” It cannot pick
          two or three chemicals. That would be Blend (empty mixer) or Fill (tank already has
          something).
        </p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>
            Open <GuideLink href="/tank/planner/">Planner</GuideLink>. Stay on Reverse calc.
          </li>
          <li>
            Type the target %. The last logged tank is used unless you edit kg or %.
            <Result>
              It lists drums that can hit that % alone, or asks you to add a stronger / weaker
              chemical.
            </Result>
          </li>
          <li>
            Tap one chemical.
            <Result>You get one kg number. This is a preview. Log it yourself if you pour it.</Result>
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl">Log and Composition</h2>
        <ul className="mt-4 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Add batch</strong> after you pour into the tank.
            <Result>Volume and % go up. Composition adds that chemical.</Result>
          </li>
          <li>
            <strong className="text-foreground">Consume</strong> after you use foam. Type kg, or
            kg/min × minutes.
            <Result>
              Volume goes down. % stays the same. The table shows used and remaining of each
              chemical.
            </Result>
          </li>
          <li>
            <GuideLink href="/tank/composition/">Composition</GuideLink> shows what is left of each
            drum in the mix right now.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl">A production day (Umer&apos;s 33% then 4 000 kg)</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>
            <strong className="text-foreground">Once:</strong> add Conventional (0%), POP 25, POP 45
            on <GuideLink href="/tank/chemicals/">Chemicals</GuideLink>.{" "}
            <GuideLink href="/tank/setup/">Set up</GuideLink> 1 500 kg at 25% as POP 25. Capacity
            8 000 kg. Heel 890 kg if that bottom stock stays in the tank.
            <Result>Home shows 1 500 kg at 25%.</Result>
          </li>
          <li>
            <strong className="text-foreground">Make 33%:</strong> Home → type 8 000 and 33 → Plan
            this fill. Confirm POP 45 + Conventional. Log it.
            <Result>About 5 033 kg + 1 467 kg on top of the 1 500 kg. Tank is 8 000 kg at 33%.</Result>
          </li>
          <li>
            <strong className="text-foreground">After 80 kg/min × 50 min:</strong>{" "}
            <GuideLink href="/tank/log/">Tank Log</GuideLink> → Consume. Type 80 and 50, or 4 000.
            <Result>Used/remaining table. Leftover is still 33%.</Result>
          </li>
          <li>
            <strong className="text-foreground">Next job at 28%:</strong> Home → type the new kg and
            28 → Plan this fill. Do not dilute 33% to 25% first.
            <Result>Fill picks a little Conventional plus POP 25 in one step.</Result>
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl">Every time you use it</h2>
        <ul className="mt-4 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Making a fresh batch from scratch?</strong> →{" "}
            <GuideLink href="/tank/blend/">Blend Calculator</GuideLink>
            . Pick two chemicals, say what % and how much you need. If you must use a third drum,
            tap Add a third chemical and lock that kg — the other two fill the rest.
          </li>
          <li>
            <strong className="text-foreground">Topping up your tank with two chemicals?</strong> →{" "}
            <GuideLink href="/tank/fill/">Fill Calculator</GuideLink>
            . Say your target volume and %, and it&apos;ll suggest which two chemicals to use. Add a
            third chemical only if you need to lock one drum&apos;s kg.
          </li>
          <li>
            <strong className="text-foreground">Just added a batch or used some from the tank?</strong>{" "}
            → <GuideLink href="/tank/log/">Tank Log</GuideLink> → Add Entry. Pick Add Batch or
            Consume/Usage, enter the amount, done — everything else updates itself.
          </li>
          <li>
            <strong className="text-foreground">Want to know what&apos;s left of each chemical in the tank?</strong>{" "}
            → <GuideLink href="/tank/composition/">Tank Composition</GuideLink>
            . No calculation needed, it&apos;s always current.
          </li>
          <li>
            <strong className="text-foreground">Want the last tank to reach a target % such as 53% with one drum?</strong>{" "}
            → <GuideLink href="/tank/planner/">Tank Planner</GuideLink>
            . Type the target. Pick one chemical. For two or three drums use Fill, not Planner.
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
