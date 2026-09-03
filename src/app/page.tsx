import { ArrowRight, FlaskConical, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { FoamLayerViewerDynamic } from "@/components/3d/foam-layer-viewer-dynamic";
import { SectionHeader } from "@/components/sections/section-header";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { AnimateOnScroll } from "@/components/ui/animate-on-scroll";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/categories";
import { certifications } from "@/data/certifications";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export const metadata: Metadata = buildMetadata({
  title: "Precision Foam Manufacturing",
  description:
    "Victory Foam manufactures specified mattresses, comfort products, industrial foam, and custom-cut components for trade customers across South Africa.",
  path: "/",
});

const categoryAccentStyles: Record<
  Category["accent"],
  { border: string; glow: string }
> = {
  cyan: {
    border: "border-t-cyan-400",
    glow: "hover:shadow-[0_0_20px_-5px_rgb(34_211_238_/_0.35)]",
  },
  teal: {
    border: "border-t-teal-400",
    glow: "hover:shadow-[0_0_20px_-5px_rgb(45_212_191_/_0.35)]",
  },
  amber: {
    border: "border-t-amber-400",
    glow: "hover:shadow-[0_0_20px_-5px_rgb(251_191_36_/_0.35)]",
  },
  purple: {
    border: "border-t-purple-400",
    glow: "hover:shadow-[0_0_20px_-5px_rgb(192_132_252_/_0.35)]",
  },
};

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
    title: "South African Manufacturing",
    description: "Responsive development and production support from a South Africa-based operation.",
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
      <SectionWrapper className="hero-gradient-bg flex min-h-[90vh] items-center overflow-hidden py-16">
        <AnimateOnScroll>
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <h1 className="max-w-4xl font-heading text-5xl font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                <span className="gradient-text">Victory Foam</span>
                <span className="text-foreground"> — Precision Foam Manufacturing</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                We manufacture mattress, comfort, industrial, and custom-cut foam products around your specification.
              </p>
              <div className="gradient-border mt-8 inline-flex flex-wrap gap-3 rounded-xl p-3">
                <Button asChild size="lg" variant="gradient">
                  <Link href="/products/">
                    View Our Products <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/contact/">Get in Touch</Link>
                </Button>
              </div>
            </div>
            <div className="gradient-border rounded-[2rem] bg-slate-950 p-6 shadow-2xl md:p-8">
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
            {categories.map((category) => {
              const accent = categoryAccentStyles[category.accent];
              return (
                <Link
                  key={category.slug}
                  href={`/products/#${category.slug}`}
                  className={cn(
                    "glass-card group overflow-hidden rounded-xl border-t-2 transition-transform duration-300",
                    "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
                    accent.border,
                    accent.glow,
                  )}
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
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading text-lg font-semibold text-foreground">{category.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </Link>
              );
            })}
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
              <div key={title} className="glass-card rounded-xl p-6">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary glow-sm">
                  <Icon className="size-6" aria-hidden />
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </div>
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
          <div className="relative mt-12">
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-6 left-6 top-6 w-px bg-gradient-to-b from-primary via-primary/40 to-muted-foreground/30 lg:hidden"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-primary via-primary/40 to-muted-foreground/30 lg:block"
            />
            <ol className="relative grid gap-8 lg:grid-cols-4 lg:gap-5">
              {process.map((step, index) => (
                <li
                  key={step.title}
                  className="relative grid grid-cols-[3rem_1fr] gap-4 lg:block lg:pt-20"
                >
                  <span className="gradient-border relative z-10 grid size-12 place-items-center rounded-full bg-background font-heading font-semibold text-foreground lg:absolute lg:top-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="font-heading text-xl font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm text-foreground/80">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
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
              <div key={certification.name} className="glass-card rounded-xl p-6">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary glow-sm">
                  <ShieldCheck className="size-6" aria-hidden />
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-foreground">
                  {certification.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{certification.description}</p>
              </div>
            ))}
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      <SectionWrapper>
        <AnimateOnScroll>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-background to-transparent p-8 md:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl"
            />
            <div className="relative">
              <h2 className="font-heading text-3xl font-semibold md:text-4xl">
                <span className="gradient-text">Ready to discuss your project?</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Send your dimensions, drawing, sample, or performance brief and we will help define the next step.
              </p>
              <Button asChild size="lg" variant="gradient" className="mt-8">
                <Link href="/contact/">
                  Get in Touch <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>
    </>
  );
}
