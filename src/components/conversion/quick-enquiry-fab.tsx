"use client";

import { MessageCircle, X } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { company } from "@/data/company";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-2 w-full rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-2 text-sm text-foreground placeholder:text-slate-500 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";

export function QuickEnquiryFab({ formId }: { formId?: string }) {
  const [open, setOpen] = useState(false);
  const formspreeId = formId?.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (formspreeId) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const body = [`Name: ${name}`, `Email: ${email}`, "", message].join("\n");
    window.location.href = `mailto:${company.email}?subject=${encodeURIComponent("Quick enquiry")}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-24 md:right-6">
      {open && (
        <div className="glass-card mb-3 w-[min(100vw-2rem,22rem)] rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <p className="font-heading text-sm font-semibold text-foreground">Quick enquiry</p>
            <button
              type="button"
              aria-label="Close quick enquiry"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <form
            className="mt-4 grid gap-3"
            method="POST"
            action={formspreeId ? `https://formspree.io/f/${formspreeId}` : undefined}
            onSubmit={handleSubmit}
          >
            <label className="block text-xs font-medium text-foreground">
              Name
              <input className={fieldClass} name="name" required autoComplete="name" />
            </label>
            <label className="block text-xs font-medium text-foreground">
              Email
              <input
                className={fieldClass}
                type="email"
                name="email"
                required
                autoComplete="email"
              />
            </label>
            <label className="block text-xs font-medium text-foreground">
              Message
              <textarea
                className={cn(fieldClass, "min-h-24 resize-y")}
                name="message"
                required
                minLength={10}
                placeholder="Application, dimensions, or timing"
              />
            </label>
            <Button type="submit" size="sm" className="w-full shadow-md shadow-primary/25">
              Send
            </Button>
          </form>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close enquiry form" : "Open enquiry form"}
        onClick={() => setOpen((current) => !current)}
        className="grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-shadow hover:shadow-primary/50"
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </button>
    </div>
  );
}
