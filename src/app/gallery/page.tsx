import type { Metadata } from "next";

import { GalleryBrowser } from "@/components/gallery/gallery-browser";
import { SectionHeader } from "@/components/sections/section-header";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { AnimateOnScroll } from "@/components/ui/animate-on-scroll";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Gallery",
  description:
    "View Victory Foam factory facilities, precision conversion processes, mattress constructions, and finished industrial foam components.",
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
    </>
  );
}
