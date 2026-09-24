import type { Metadata } from "next";

import { SectionHeader } from "@/components/sections/section-header";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { company } from "@/data/company";
import { buildMetadata } from "@/lib/seo";
import { toTelHref } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How Victory Foam collects, uses, and stores enquiry information under POPIA, including Formspree, hosting, analytics, and your South African data rights.",
  path: "/privacy/",
});

export default function PrivacyPage() {
  return (
    <article>
      <SectionWrapper className="pb-10">
        <SectionHeader
          as="h1"
          title="Privacy Policy"
          subtitle="This policy explains how Victory Foam handles personal information submitted through this website."
        />
        <p className="mt-4 text-sm text-muted-foreground">Last updated: 24 September 2026</p>
      </SectionWrapper>
      <SectionWrapper background="muted" className="prose-legal space-y-8 pt-10 text-muted-foreground">
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">Responsible party</h2>
          <p className="mt-3">
            Victory Foam is the responsible party for personal information collected through this site.
            We manufacture foam products for trade customers from {company.address}.
          </p>
          <p className="mt-3">
            For privacy requests, email{" "}
            <a className="text-foreground underline underline-offset-2" href={`mailto:${company.email}`}>
              {company.email}
            </a>{" "}
            or call{" "}
            <a className="text-foreground underline underline-offset-2" href={toTelHref(company.phone)}>
              {company.phone}
            </a>
            .
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">What we collect</h2>
          <p className="mt-3">
            The contact form and quick enquiry form collect your name, email address, optional phone
            number, subject, and message. We do not collect payment details, identity numbers, or
            account credentials on this site. This website is a brochure and display-only catalogue.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">How we use it</h2>
          <p className="mt-3">
            We use enquiry information only to understand your manufacturing requirement and to
            respond. We do not sell personal information or use it for automated decision-making.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">How it is stored</h2>
          <p className="mt-3">
            Victory Foam does not operate a customer database on this website. When a Formspree form
            identifier is configured, Formspree processes the submission and delivers it to{" "}
            {company.email}. If Formspree is not configured, the form opens your email application
            instead. Enquiry emails are retained only as long as needed to handle the request and
            any related manufacturing follow-up.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">Third-party services</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Formspree processes enquiry forms when that service is enabled.</li>
            <li>Vercel hosts the static website files.</li>
            <li>
              Google Analytics 4 loads only after you accept analytics cookies. If you decline, it
              is not loaded.
            </li>
            <li>Google Maps provides the location embed on the Contact page.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">Cookies</h2>
          <p className="mt-3">
            Theme preference is stored in your browser and is not used for advertising. Analytics
            cookies are optional. The cookie banner appears only when a Google Analytics measurement
            ID is configured. You can change your choice from Cookie preferences in the site footer,
            or by clearing this site&apos;s stored data in your browser and reloading the page.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">POPIA rights</h2>
          <p className="mt-3">
            Under the Protection of Personal Information Act 4 of 2013 you may request access to
            personal information we hold about you, ask us to correct or delete it, or object to
            processing that is not required to complete an enquiry. Send requests to {company.email}.
            You may also lodge a complaint with the Information Regulator of South Africa.
          </p>
        </section>
      </SectionWrapper>
    </article>
  );
}
