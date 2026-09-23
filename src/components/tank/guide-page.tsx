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
            <strong className="text-foreground">Day to day.</strong> Stay on{" "}
            <GuideLink href="/tank/">Home</GuideLink>. Enter what is already in the tank, then either
            add to the tank or record what you used.
            <Result>Home shows the kg, the overall solid content, and how much room is left.</Result>
          </li>
          <li>
            <strong className="text-foreground">Fresh batch in a mixer or drum, tank empty or ignored.</strong>{" "}
            More, then <GuideLink href="/tank/blend/">Blend</GuideLink>
            <Result>Two drums, or three if you lock one amount. No tank log is written.</Result>
          </li>
          <li>
            <strong className="text-foreground">The same sums, on the older screens.</strong> More, then
            Fill, Planner, Log, or Composition.
            <Result>Those screens still work. Home is the shorter path.</Result>
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
              <strong className="text-foreground">On Home, enter each polyol already in the tank.</strong>{" "}
              Pick one you already use, or type a new name, solid content, and kg. Tap Add another
              polyol for the next drum. Tank size starts
              at 8,000 kg. You can change it. Save.
              <Result>
                Home shows the total kg, the overall solid content, and how many kg you can still add.
                You do not type the overall %.
              </Result>
            </li>
            <li>
              <strong className="text-foreground">Add to the tank</strong> when you need a solid
              content. Type how full the tank should be this time (kg — not locked to the tank
              size), the solid content, and one polyol, two, or all three. For three, type how many
              kg of one of them.
              <Result>
                Home lists the kg of each polyol. After the suggestion, type the kg you will
                actually pour, read the solid content, then download the PDF. Nothing is saved
                until you confirm.
              </Result>
            </li>
            <li>
              <strong className="text-foreground">I used some</strong> after a job. Type kg per minute
              and minutes, for example 57 and 77.
              <Result>
                Home shows how many kg of each polyol were in that use, what is left, and that the
                solid content did not change.
              </Result>
            </li>
            <li>
              No holding tank? More, then <GuideLink href="/tank/blend/">Blend</GuideLink>. Heel, if
              you use it, is on More → <GuideLink href="/tank/setup/">Set up tank</GuideLink> before
              the first save.
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
            On <GuideLink href="/tank/">Home</GuideLink> tap Add to the tank and type how full the
            tank should be and the solid content. Or open{" "}
            <GuideLink href="/tank/fill/">Fill</GuideLink> and enter the same numbers.
            <Result>
              Required blend % is for the added portion only, not the whole tank.
            </Result>
          </li>
          <li>
            Confirm the suggested pair, or pick two other drums.
            <Result>
              Each drum shows kg and solid content, already filled. Type the kg you will pour, read
              Your solid content, then download the PDF. Nothing is saved until you confirm.
            </Result>
          </li>
          <li>
            Need a third drum? Tap <strong className="text-foreground">Add a third chemical</strong>{" "}
            and lock that kg.
            <Result>The pair fills the rest. Log writes three Add Batch rows.</Result>
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl">Change the suggestion</h2>
        <p className="mt-3 text-muted-foreground">
          Home and Fill start with the calculator kilograms. Type the kilograms you will actually
          pour. Change a solid content only if this drum differs a little from the saved chemical.
          The suggestion stays on the screen. It is not calculated again.
        </p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>
            Each polyol has kg and solid content, already filled. Under the kg it says Calculator
            suggested, with the original number.
            <Result>
              Your solid content is the tank you already have, plus the kilograms and solid content
              you typed.
            </Result>
          </li>
          <li>
            Type a different kg. For example, write 1,050 where the calculator said 925, and 5,250
            where it said 5,093.
            <Result>Tank afterwards shows the new total kg and the solid content those pours make.</Result>
          </li>
          <li>
            If the typed total is more than the tank size, the solid content still shows.
            <Result>Add this to the tank and Log this stay off until the total fits.</Result>
          </li>
          <li>
            Tap <strong className="text-foreground">Download PDF</strong>.
            <Result>
              tank-report.pdf saves on this phone or computer. It lists the date, what is already in
              the tank, each polyol with the typed kg and solid content, the suggestion when you
              changed it, and the tank afterwards.
            </Result>
          </li>
          <li>
            Tap Add this to the tank, or Log this on Fill, only when the numbers are the pour you
            want.
            <Result>
              The log stores the typed kg and the typed solid content for this pour. The chemical
              saved solid content does not change.
            </Result>
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
            Pick one or more chemicals and type the kg for each. The tank size is a maximum — you
            can add less. The form refuses a total that would go over capacity.
            <Result>
              One Add Batch row is written per chemical. Volume and % go up. Composition lists each
              chemical.
            </Result>
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
        <h2 className="text-xl">A production day</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>
            <strong className="text-foreground">Already in the tank:</strong> Conventional 0% 700 kg,
            polymer 25% 220 kg, polymer 45% 1,150 kg. Tank size 8,000 kg.
            <Result>Home shows 2,070 kg at about 27.66% (often called 28). You can add at most 5,930 kg.</Result>
          </li>
          <li>
            <strong className="text-foreground">Requirement:</strong> Add to the tank. Type how full
            you need it this time (type the kg — never assumed to be 8,000), the solid content, and
            the polyols. Two polyols is the usual case, such as 45 and conventional for 28%, or 45
            and 25 for 28.7%. One polyol asks only for the solid content. All three asks how many kg
            of one polyol you will pour.
            <Result>
              Home shows the kg of each polyol. Type the kg you will pour, read Your solid content,
              download the PDF, then confirm to save.
            </Result>
          </li>
          <li>
            <strong className="text-foreground">After the job:</strong> I used some. Type 57 kg per
            minute and 77 minutes.
            <Result>
              57 × 77 = 4,389 kg. Home lists how much of each polyol was in that 4,389 kg. The
              remainder stays at the same solid content.
            </Result>
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl">Every time you use it</h2>
        <ul className="mt-4 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Making a fresh batch from scratch?</strong> → More, then{" "}
            <GuideLink href="/tank/blend/">Blend Calculator</GuideLink>
            . Pick two chemicals, say what % and how much you need. If you must use a third drum,
            tap Add a third chemical and lock that kg — the other two fill the rest.
          </li>
          <li>
            <strong className="text-foreground">Topping up your tank with two chemicals?</strong> →{" "}
            <GuideLink href="/tank/fill/">Fill Calculator</GuideLink>
            . Say your target volume and %, and it&apos;ll suggest which two chemicals to use. Add a
            third chemical only if you need to lock one drum&apos;s kg. You can type different kg
            before you log, then download the PDF.
          </li>
          <li>
            <strong className="text-foreground">Just added a batch or used some from the tank?</strong>{" "}
            → <GuideLink href="/tank/log/">Tank Log</GuideLink> → Add Entry. For Add Batch, pick
            several chemicals if the blend used more than one, and type the kg for each. For Consume,
            use kg/min × minutes. The form shows how much room is left and blocks a fill over the
            tank size.
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
