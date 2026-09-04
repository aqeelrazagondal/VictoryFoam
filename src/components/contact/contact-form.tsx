"use client";

import { type FormEvent } from "react";

import { ContactSubjectField } from "@/components/contact/contact-subject-field";
import { Button } from "@/components/ui/button";
import { company } from "@/data/company";

const fieldClass =
  "mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:placeholder:text-slate-500";

function readField(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function buildMailtoHref(data: FormData): string {
  const name = readField(data, "name");
  const email = readField(data, "email");
  const phone = readField(data, "phone");
  const subject = readField(data, "subject") || "Victory Foam enquiry";
  const message = readField(data, "message");
  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    ...(phone ? [`Phone: ${phone}`] : []),
    "",
    message,
  ].join("\n");

  return `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function ContactForm({ formId }: { formId?: string }) {
  const formspreeId = formId?.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (formspreeId) {
      return;
    }

    event.preventDefault();
    window.location.href = buildMailtoHref(new FormData(event.currentTarget));
  }

  return (
    <div className="glass-card gradient-border rounded-xl p-6 md:p-8">
      <h2 className="font-heading text-2xl font-semibold">Send an enquiry</h2>
      <form
        className="mt-8 grid gap-5"
        method="POST"
        action={formspreeId ? `https://formspree.io/f/${formspreeId}` : undefined}
        onSubmit={handleSubmit}
      >
        <div className="hidden" aria-hidden="true">
          <label htmlFor="_gotcha">
            Leave this field empty
            <input id="_gotcha" name="_gotcha" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-foreground">
          Name
          <input
            id="contact-name"
            className={fieldClass}
            name="name"
            autoComplete="name"
            required
          />
        </label>
        <label htmlFor="contact-email" className="block text-sm font-medium text-foreground">
          Email
          <input
            id="contact-email"
            className={fieldClass}
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>
        <label htmlFor="contact-phone" className="block text-sm font-medium text-foreground">
          Phone
          <input
            id="contact-phone"
            className={fieldClass}
            type="tel"
            name="phone"
            autoComplete="tel"
            pattern="[0-9+() -]{7,}"
            title="Enter at least seven digits using spaces, brackets, plus, or hyphens."
          />
        </label>
        <label htmlFor="contact-subject" className="block text-sm font-medium text-foreground">
          Subject
          <ContactSubjectField className={fieldClass} />
        </label>
        <label htmlFor="contact-message" className="block text-sm font-medium text-foreground">
          Message
          <textarea
            id="contact-message"
            className={`${fieldClass} min-h-[120px] resize-y`}
            name="message"
            placeholder="Application, dimensions, quantity, timing, or relevant standards"
            required
            minLength={20}
          />
        </label>
        <Button
          type="submit"
          size="lg"
          className="w-full px-6 py-3 text-white shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40"
        >
          Send Message
        </Button>
        <p className="text-xs text-muted-foreground">
          {formspreeId
            ? "You will see a confirmation page after sending."
            : "This will open your email app with the message ready to send."}
        </p>
        <p className="text-xs text-muted-foreground">
          You can also email us directly at{" "}
          <a
            href={`mailto:${company.email}`}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {company.email}
          </a>
        </p>
      </form>
    </div>
  );
}
