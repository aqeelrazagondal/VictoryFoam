import type { Metadata } from "next";

import { SectionHeader } from "@/components/sections/section-header";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { company } from "@/data/company";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Use",
  description:
    "Terms for using the Victory Foam website, including intellectual property, limitation of liability, and South African governing law.",
  path: "/terms/",
});

export default function TermsPage() {
  return (
    <article>
      <SectionWrapper className="pb-10">
        <SectionHeader
          as="h1"
          title="Terms of Use"
          subtitle="These terms apply to your use of the Victory Foam website."
        />
        <p className="mt-4 text-sm text-muted-foreground">Last updated: 4 September 2026</p>
      </SectionWrapper>
      <SectionWrapper background="muted" className="space-y-8 pt-10 text-muted-foreground">
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">Website use</h2>
          <p className="mt-3">
            This site is a static brochure and display-only product catalogue. It does not publish
            prices, accept orders, or complete purchases. Product descriptions are manufacturing
            starting points and are confirmed during enquiry.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">Intellectual property</h2>
          <p className="mt-3">
            Text, branding, photographs, illustrations, and other site materials belong to{" "}
            {company.name} or their licensors. You may not copy or reuse them for commercial purposes
            without written permission.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">Limitation of liability</h2>
          <p className="mt-3">
            We take care to keep this site accurate, but specifications, availability, and lead times
            can change. To the extent permitted by South African law, {company.name} is not liable
            for loss arising from reliance on website content alone. A contract is formed only when
            we confirm a specification in writing.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">Governing law</h2>
          <p className="mt-3">
            These terms are governed by the laws of the Republic of South Africa. The courts of South
            Africa have jurisdiction over disputes arising from use of this website.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-semibold text-foreground">Contact</h2>
          <p className="mt-3">
            Questions about these terms:{" "}
            <a className="text-foreground underline underline-offset-2" href={`mailto:${company.email}`}>
              {company.email}
            </a>
            .
          </p>
        </section>
      </SectionWrapper>
    </article>
  );
}
