import type { Metadata } from "next";

import { ProductCatalogue } from "@/components/product/product-catalogue";
import { SectionHeader } from "@/components/sections/section-header";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { AnimateOnScroll } from "@/components/ui/animate-on-scroll";
import { buildMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "Our Products",
    description:
      "Browse Victory Foam mattresses, toppers, pillows, industrial foam grades, and custom-cut components made for repeat trade manufacturing across Gauteng.",
    path: "/products/",
  });
}

export default function ProductsPage() {
  return (
    <>
      <SectionWrapper className="hero-gradient-bg pb-10">
        <AnimateOnScroll>
          <SectionHeader
            as="h1"
            title="Our Products"
            subtitle="Explore eight product platforms across bedding, comfort, industrial, and custom-cut foam manufacturing."
          />
        </AnimateOnScroll>
      </SectionWrapper>
      <SectionWrapper background="muted" className="pt-10">
        <AnimateOnScroll delay={0.1}>
        <h2 className="sr-only">Product catalogue</h2>
        <ProductCatalogue />
        </AnimateOnScroll>
      </SectionWrapper>
    </>
  );
}
