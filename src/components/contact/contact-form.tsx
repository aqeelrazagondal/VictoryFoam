"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const fieldClass =
  "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground";

export function ContactForm({ formId }: { formId?: string }) {
  const searchParams = useSearchParams();
  const product = searchParams.get("product");
  const [subject, setSubject] = useState(product ? `Enquiry about ${product}` : "");
  const configured = Boolean(formId);

  return (
    <div className="rounded-xl border border-border bg-card p-6 md:p-8">
      <h2 className="font-heading text-2xl font-semibold">Send an enquiry</h2>
      {!configured && (
        <p className="mt-4 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          Form delivery is not configured. Add{" "}
          <code>NEXT_PUBLIC_FORMSPREE_FORM_ID</code> to enable submission, or
          email us directly.
        </p>
      )}
      <form
        className="mt-8 grid gap-5"
        method="POST"
        action={configured ? `https://formspree.io/f/${formId}` : undefined}
      >
        <input type="hidden" name="_subject" value={subject || "Victory Foam enquiry"} />
        <div className="hidden" aria-hidden="true">
          <label>
            Leave this field empty
            <input name="_gotcha" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="text-sm font-medium">
          Name
          <input className={fieldClass} name="name" autoComplete="name" required />
        </label>
        <label className="text-sm font-medium">
          Email
          <input
            className={fieldClass}
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="text-sm font-medium">
          Phone
          <input
            className={fieldClass}
            type="tel"
            name="phone"
            autoComplete="tel"
            pattern="[0-9+() -]{7,}"
            title="Enter at least seven digits using spaces, brackets, plus, or hyphens."
          />
        </label>
        <label className="text-sm font-medium">
          Subject
          <input
            className={fieldClass}
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Message
          <textarea
            className={`${fieldClass} min-h-36 resize-y`}
            name="message"
            placeholder="Application, dimensions, quantity, timing, or relevant standards"
            required
            minLength={20}
          />
        </label>
        <Button type="submit" size="lg" disabled={!configured}>
          Send Message
        </Button>
        {configured && (
          <p className="text-xs text-muted-foreground">
            After sending, Formspree will display a confirmation message.
          </p>
        )}
      </form>
    </div>
  );
}
