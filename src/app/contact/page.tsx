import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";

import { TrackedAnchor } from "@/components/analytics/tracked-link";
import { ContactForm } from "@/components/contact/contact-form";
import { SectionHeader } from "@/components/sections/section-header";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { AnimateOnScroll } from "@/components/ui/animate-on-scroll";
import { JsonLd } from "@/components/seo/json-ld";
import { company } from "@/data/company";
import { buildLocalBusinessSchema, buildMetadata } from "@/lib/seo";
import { toTelHref } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description:
    "Contact Victory Foam to discuss mattress, comfort, industrial, or custom-cut foam specifications, samples, production volumes, and delivery.",
  path: "/contact/",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={buildLocalBusinessSchema(company)} />
      <SectionWrapper className="pb-10">
        <AnimateOnScroll>
          <SectionHeader
            as="h1"
            title="Contact Victory Foam"
            subtitle="Share dimensions, quantities, intended use, or a drawing. We will help turn the requirement into a practical specification."
          />
        </AnimateOnScroll>
      </SectionWrapper>
      <SectionWrapper background="muted" className="pt-10">
        <AnimateOnScroll>
        <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <ContactForm formId={process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID} />

          <aside className="glass-card gradient-border overflow-hidden rounded-xl text-foreground">
            <div className="p-7 md:p-8">
              <h2 className="font-heading text-2xl font-semibold">{company.name}</h2>
              <ul className="mt-8 space-y-6 text-sm">
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                  <address className="not-italic">
                    {company.addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                </li>
                <li className="flex gap-3">
                  <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
                  <TrackedAnchor
                    href={toTelHref(company.phone)}
                    linkType="phone"
                    className="underline-offset-2 hover:underline"
                  >
                    {company.phone}
                  </TrackedAnchor>
                </li>
                <li className="flex gap-3">
                  <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
                  <TrackedAnchor
                    href={`mailto:${company.email}`}
                    linkType="email"
                    className="underline-offset-2 hover:underline"
                  >
                    {company.email}
                  </TrackedAnchor>
                </li>
                <li className="flex gap-3">
                  <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>{company.workingHours}</span>
                </li>
              </ul>
            </div>
            <iframe
              title="Victory Foam location map"
              src={company.mapEmbedUrl}
              className="h-72 w-full border-0 grayscale"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </aside>
        </div>
        </AnimateOnScroll>
      </SectionWrapper>
    </>
  );
}
