"use client";

import { type FormEvent, useRef, useState } from "react";

import { ContactSubjectField } from "@/components/contact/contact-subject-field";
import { Button } from "@/components/ui/button";
import { company } from "@/data/company";
import { trackEvent } from "@/lib/analytics";
import {
  buildEnquiryMailto,
  readFormField,
  submitFormspree,
  validateEnquiry,
  type EnquiryErrors,
} from "@/lib/enquiry";

const fieldClass =
  "mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:placeholder:text-muted-foreground";

export function ContactForm({ formId }: { formId?: string }) {
  const formspreeId = formId?.trim();
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextErrors = validateEnquiry(data, 20);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    if (!formspreeId) {
      window.location.href = buildEnquiryMailto({
        to: company.email,
        subject: readFormField(data, "subject") || "Victory Foam quote request",
        name: readFormField(data, "name"),
        email: readFormField(data, "email"),
        phone: readFormField(data, "phone") || undefined,
        application: readFormField(data, "application") || undefined,
        material: readFormField(data, "material") || undefined,
        dimensions: readFormField(data, "dimensions") || undefined,
        volume: readFormField(data, "volume") || undefined,
        message: readFormField(data, "message"),
      });
      return;
    }

    setPending(true);
    const result = await submitFormspree(formspreeId, data);
    setPending(false);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    trackEvent("generate_lead", { form_id: "quote", intent: "quote" });
    setSubmitted(true);
    form.reset();
    window.setTimeout(() => successRef.current?.focus(), 0);
  }

  if (submitted) {
    return (
      <div className="glass-card gradient-border rounded-xl p-6 md:p-8">
        <div
          ref={successRef}
          tabIndex={-1}
          className="outline-none"
          role="status"
        >
          <h2 className="font-heading text-2xl font-semibold">Quote request sent</h2>
          <p className="mt-4 text-muted-foreground">
            Thank you. We will review your requirements and respond during working hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card gradient-border rounded-xl p-6 md:p-8">
      <h2 className="font-heading text-2xl font-semibold">Request a quote</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Share the application details you have. Quote fields below are optional but help us
        qualify the requirement faster.
      </p>
      <form className="mt-8 grid gap-5" onSubmit={handleSubmit} noValidate>
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
            aria-required="true"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
          />
        </label>
        {errors.name ? (
          <p id="contact-name-error" className="-mt-3 text-sm text-destructive">
            {errors.name}
          </p>
        ) : null}
        <label htmlFor="contact-email" className="block text-sm font-medium text-foreground">
          Email
          <input
            id="contact-email"
            className={fieldClass}
            type="email"
            name="email"
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
          />
        </label>
        {errors.email ? (
          <p id="contact-email-error" className="-mt-3 text-sm text-destructive">
            {errors.email}
          </p>
        ) : null}
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
        <fieldset className="grid gap-5 rounded-lg border border-border/60 p-4 dark:border-slate-600/40">
          <legend className="px-1 text-sm font-medium text-foreground">
            Quote details (optional)
          </legend>
          <label htmlFor="contact-application" className="block text-sm font-medium text-foreground">
            Application / use case
            <input
              id="contact-application"
              className={fieldClass}
              name="application"
              placeholder="e.g. hospitality mattresses, seating, packaging"
              autoComplete="off"
            />
          </label>
          <label htmlFor="contact-material" className="block text-sm font-medium text-foreground">
            Product or material type
            <input
              id="contact-material"
              className={fieldClass}
              name="material"
              placeholder="e.g. memory foam, HR foam, acoustic panel"
              autoComplete="off"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label htmlFor="contact-dimensions" className="block text-sm font-medium text-foreground">
              Dimensions
              <input
                id="contact-dimensions"
                className={fieldClass}
                name="dimensions"
                placeholder="e.g. 1880 × 915 × 200 mm"
                autoComplete="off"
              />
            </label>
            <label htmlFor="contact-volume" className="block text-sm font-medium text-foreground">
              Approximate volume / quantity
              <input
                id="contact-volume"
                className={fieldClass}
                name="volume"
                placeholder="e.g. 200 units / month"
                autoComplete="off"
              />
            </label>
          </div>
        </fieldset>
        <label htmlFor="contact-message" className="block text-sm font-medium text-foreground">
          Message
          <textarea
            id="contact-message"
            className={`${fieldClass} min-h-[120px] resize-y`}
            name="message"
            placeholder="Performance targets, drawings, timing, or relevant standards"
            required
            minLength={20}
            aria-required="true"
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
          />
        </label>
        {errors.message ? (
          <p id="contact-message-error" className="-mt-3 text-sm text-destructive">
            {errors.message}
          </p>
        ) : null}
        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="w-full px-6 py-3 text-white shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40"
        >
          {pending ? "Sending…" : "Request a Quote"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {formspreeId
            ? "We will show a confirmation on this page after sending."
            : "This will open your email app with the message ready to send."}
        </p>
        <p className="text-xs text-muted-foreground">
          You can also email us directly at{" "}
          <a
            href={`mailto:${company.email}`}
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => trackEvent("click", { link_type: "email" })}
          >
            {company.email}
          </a>
        </p>
      </form>
    </div>
  );
}
