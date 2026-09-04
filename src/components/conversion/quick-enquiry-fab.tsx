"use client";

import { MessageCircle } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import { useConsent } from "@/components/analytics/consent-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { company } from "@/data/company";
import { trackEvent } from "@/lib/analytics";
import {
  buildEnquiryMailto,
  readFormField,
  submitFormspree,
  validateEnquiry,
  type EnquiryErrors,
} from "@/lib/enquiry";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-2 w-full rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";

export function QuickEnquiryFab({ formId }: { formId?: string }) {
  const { bannerVisible } = useConsent();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const successRef = useRef<HTMLParagraphElement>(null);
  const formspreeId = formId?.trim();

  if (bannerVisible) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextErrors = validateEnquiry(data, 10);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    if (!formspreeId) {
      window.location.href = buildEnquiryMailto({
        to: company.email,
        subject: "Quick enquiry",
        name: readFormField(data, "name"),
        email: readFormField(data, "email"),
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

    trackEvent("generate_lead", { form_id: "quick_enquiry" });
    setSubmitted(true);
    form.reset();
    window.setTimeout(() => successRef.current?.focus(), 0);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setErrors({});
          setSubmitError(null);
          setSubmitted(false);
        }
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open enquiry form"
          className="fixed bottom-20 right-4 z-50 grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-shadow hover:shadow-primary/50 md:bottom-24 md:right-6"
        >
          <MessageCircle className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading">Quick enquiry</SheetTitle>
        </SheetHeader>
        {submitted ? (
          <p
            ref={successRef}
            tabIndex={-1}
            role="status"
            className="mt-6 text-sm text-muted-foreground outline-none"
          >
            Thank you. We will review your enquiry and respond during working hours.
          </p>
        ) : (
          <form className="mt-6 grid gap-3" onSubmit={handleSubmit} noValidate>
            <label htmlFor="quick-name" className="block text-xs font-medium text-foreground">
              Name
              <input
                id="quick-name"
                className={fieldClass}
                name="name"
                required
                autoComplete="name"
                aria-required="true"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "quick-name-error" : undefined}
              />
            </label>
            {errors.name ? (
              <p id="quick-name-error" className="text-xs text-destructive">
                {errors.name}
              </p>
            ) : null}
            <label htmlFor="quick-email" className="block text-xs font-medium text-foreground">
              Email
              <input
                id="quick-email"
                className={fieldClass}
                type="email"
                name="email"
                required
                autoComplete="email"
                aria-required="true"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "quick-email-error" : undefined}
              />
            </label>
            {errors.email ? (
              <p id="quick-email-error" className="text-xs text-destructive">
                {errors.email}
              </p>
            ) : null}
            <label htmlFor="quick-message" className="block text-xs font-medium text-foreground">
              Message
              <textarea
                id="quick-message"
                className={cn(fieldClass, "min-h-24 resize-y")}
                name="message"
                required
                minLength={10}
                placeholder="Application, dimensions, or timing"
                aria-required="true"
                aria-invalid={errors.message ? true : undefined}
                aria-describedby={errors.message ? "quick-message-error" : undefined}
              />
            </label>
            {errors.message ? (
              <p id="quick-message-error" className="text-xs text-destructive">
                {errors.message}
              </p>
            ) : null}
            {submitError ? (
              <p className="text-xs text-destructive" role="alert">
                {submitError}
              </p>
            ) : null}
            <Button type="submit" size="sm" disabled={pending} className="mt-2 min-h-11 w-full shadow-md shadow-primary/25">
              {pending ? "Sending…" : "Send"}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
