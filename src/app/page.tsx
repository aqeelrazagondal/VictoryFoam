import { ArrowRight, FlaskConical, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { FoamLayerViewerDynamic } from "@/components/3d/foam-layer-viewer-dynamic";
import { SectionHeader } from "@/components/sections/section-header";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { AnimateOnScroll } from "@/components/ui/animate-on-scroll";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categories } from "@/data/categories";
import { certifications } from "@/data/certifications";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Precision Foam Manufacturing",
  description:
    "Victory Foam manufactures specified mattresses, comfort products, industrial foam, and custom-cut components for trade customers across the UK.",
  path: "/",
});

const strengths = [
  {
    icon: FlaskConical,
    title: "Custom Formulations",
    description: "Foam density, firmness, resilience, and feel matched to the application.",
  },
  {
    icon: Sparkles,
    title: "In-House Testing",
    description: "Samples and production batches checked against the agreed specification.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Certified",
    description: "Applicable material and product evidence confirmed for each project.",
  },
  {
    icon: MapPin,
    title: "UK Manufacturing",
    description: "Responsive development and production support from a UK-based operation.",
  },
];

const process = [
  { title: "Enquire", description: "Share the application, dimensions, volume, and performance target." },
  { title: "Design", description: "We select materials and develop a practical construction or sample." },
  { title: "Manufacture", description: "Controlled conversion turns the approved design into repeatable parts." },
  { title: "Deliver", description: "Finished products are packed in the format your operation requires." },
];

export default function HomePage() {
  return (
    <>
      <SectionWrapper className="flex min-h-[90vh] items-center overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background py-16">
        <AnimateOnScroll className="w-full">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Foam manufacturing for trade
              </p>
              <h1 className="mt-5 max-w-4xl font-heading text-5xl font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Victory Foam — Precision Foam Manufacturing
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                We manufacture mattress, comfort, industrial, and custom-cut foam products around your specification.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/products/">
                    View Our Products <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/contact/">Get in Touch</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-[2rem] bg-slate-950 p-6 shadow-2xl md:p-8">
              <FoamLayerViewerDynamic />
            </div>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      <SectionWrapper>
        <AnimateOnScroll>
          <SectionHeader
            title="What We Make"
            subtitle="Product platforms that become your specification through material selection, conversion, and finishing."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/products/#${category.slug}`}
                className="group overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-white">
                  <Image
                    src={category.image}
                    alt={`${category.name} foam product category`}
                    width={1200}
                    height={900}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-heading text-lg font-semibold">{category.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      <SectionWrapper background="muted">
        <AnimateOnScroll>
          <SectionHeader
            title="Why Choose Us"
            subtitle="Practical technical support from first brief through repeat production."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {strengths.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardContent className="p-6">
                  <Icon className="size-6 text-primary" />
                  <h3 className="mt-5 font-heading text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      <SectionWrapper>
        <AnimateOnScroll>
          <SectionHeader
            title="How We Work"
            subtitle="A clear four-stage route from requirement to finished foam product."
          />
          <ol className="relative mt-12 grid gap-8 before:absolute before:left-0 before:right-0 before:top-6 before:hidden before:h-px before:bg-border before:content-[''] lg:grid-cols-4 lg:gap-5 lg:before:block">
            {process.map((step, index) => (
              <li
                key={step.title}
                className="relative grid grid-cols-[3rem_1fr] gap-4 lg:block lg:pt-20"
              >
                <span className="relative z-10 grid size-12 place-items-center rounded-full bg-primary font-heading font-semibold text-primary-foreground lg:absolute lg:top-0">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-heading text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </AnimateOnScroll>
      </SectionWrapper>

      <SectionWrapper background="muted">
        <AnimateOnScroll>
          <SectionHeader
            title="Certifications"
            subtitle="Standards are matched to the selected material and finished construction."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {certifications.map((certification) => (
              <div
                key={certification.name}
                className="grid min-h-44 place-items-center rounded-xl border border-border bg-card p-6"
              >
                <Image
                  src={certification.image}
                  alt={`${certification.name} certification badge`}
                  width={220}
                  height={145}
                  className="grayscale opacity-70"
                />
              </div>
            ))}
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      <SectionWrapper>
        <AnimateOnScroll>
          <div className="rounded-[2rem] bg-slate-950 p-8 text-slate-50 md:p-12">
            <h2 className="font-heading text-3xl font-semibold md:text-4xl">
              Ready to discuss your project?
            </h2>
            <p className="mt-4 text-slate-400">
              Send your dimensions, drawing, sample, or performance brief and we will help define the next step.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/contact/">Contact Us <ArrowRight /></Link>
            </Button>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>
    </>
  );
}
