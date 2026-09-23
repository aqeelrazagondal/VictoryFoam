import type { Metadata } from "next";

import { GalleryBrowser } from "@/components/gallery/gallery-browser";
import { PageCta } from "@/components/layout/page-cta";
import { SectionHeader } from "@/components/sections/section-header";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { AnimateOnScroll } from "@/components/ui/animate-on-scroll";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Gallery",
  description:
    "Explore Victory Foam factory facilities, precision conversion processes, mattress constructions, and finished industrial foam components across Gauteng.",
  path: "/gallery/",
});

export default function GalleryPage() {
  return (
    <>
      <SectionWrapper className="pb-10">
        <AnimateOnScroll>
          <SectionHeader
            as="h1"
            title="Gallery"
            subtitle="A closer view of the factory, products, and processes behind our foam manufacturing work."
          />
        </AnimateOnScroll>
      </SectionWrapper>
      <SectionWrapper background="muted" className="pt-10">
        <AnimateOnScroll>
          <GalleryBrowser />
        </AnimateOnScroll>
      </SectionWrapper>
      <PageCta
        title="See a construction that fits your range?"
        description="Browse product platforms or send a drawing, sample, or specification for a manufacturing review."
      />
    </>
  );
}
