"use client";

import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function GuideLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

const TASKS = [
  {
    id: "add",
    title: "Add chemicals",
    body: (
      <>
        <p>
          On <GuideLink href="/tank/">Tank</GuideLink>, tap Add to the tank. Enter the final tank
          quantity and the target solid content, then choose the chemicals. Review the suggestion.
          Download PDF writes tank-report.pdf on this device and does not change the tank. Confirm
          addition writes the pour and reduces shelf stock.
        </p>
        <p className="mt-2">
          Example data, not a live tank: a fresh 0% chemical and a 45% chemical at 22,5% and 100 kg
          is 50 kg of each.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "Record usage",
    body: (
      <p>
        Tap Record usage. Enter a total in kg, or a rate times minutes. Both use the same
        withdrawal. Review usage, then Confirm usage. The solid content stays the same. Shelf stock
        does not change.
      </p>
    ),
  },
  {
    id: "correct",
    title: "Correct readings",
    body: (
      <p>
        Tap Correct tank readings. Change the total, one chemical, or the solid content. Review
        correction shows what will move. Save correction writes one log row. Back discards the
        draft.
      </p>
    ),
  },
  {
    id: "stock",
    title: "Manage shelf stock",
    body: (
      <p>
        Open <GuideLink href="/tank/inventory/">Inventory</GuideLink>. Receive adds kilograms on the
        shelf. Actions covers Issue, Waste, Set count, and History. Stock not tracked is not zero.
        None of these pour into the tank.
      </p>
    ),
  },
  {
    id: "blend",
    title: "Fresh blend",
    body: (
      <p>
        Open <GuideLink href="/tank/blend/">Blend</GuideLink> from More. Calculate a fresh batch.
        Tank contents are not included. Record inventory use reduces shelf stock and does not change
        the tank. Example data: 0% and 45% to 22,5% of 100 kg is 50 kg each.
      </p>
    ),
  },
  {
    id: "plan",
    title: "Plan a target",
    body: (
      <p>
        Open <GuideLink href="/tank/planner/">Planner</GuideLink>. Reach target % or Preview
        addition. Nothing is saved. A target of 53% when the strongest chemical is 45% is an
        impossible-target example: the tank cannot get there with the chemicals you have.
      </p>
    ),
  },
  {
    id: "activity",
    title: "Read activity",
    body: (
      <p>
        Open <GuideLink href="/tank/log/">Activity</GuideLink>. Latest usage is the newest use, when
        one exists. Otherwise the card is the latest production activity. All activity lists every
        saved change, newest first.
      </p>
    ),
  },
];

export function GuidePage() {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1>Guide</h1>
        <p className="mt-2 text-muted-foreground">
          Short tasks for the tank calculator. On Tank home, open a tank and use Tank actions to
          rename or remove it. Add a tank from the bottom of the list. On other screens, open the
          header name to switch tanks. Chemicals and Inventory stay shared. Numbers in the examples
          are example data.
        </p>
      </div>
      <Accordion type="single" collapsible defaultValue="add">
        {TASKS.map((task) => (
          <AccordionItem key={task.id} value={task.id}>
            <AccordionTrigger>{task.title}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{task.body}</AccordionContent>
          </AccordionItem>
        ))}
        <AccordionItem value="glossary">
          <AccordionTrigger>Glossary</AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Solid content.</strong> The percent of the mixture
              that is not water. It is not a liquid height.
            </p>
            <p>
              <strong className="text-foreground">Heel.</strong> Kilograms you want left in the tank.
              Available to use is the mass above that heel.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
