import { ArrowRight, FlaskConical, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { MattressScrollDynamic } from "@/components/3d/mattress-scroll-dynamic";
import { MobileMattressHeroDynamic } from "@/components/3d/mobile-mattress-hero-dynamic";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { StickyCtaBar } from "@/components/conversion/sticky-cta-bar";
import { TrustStrip } from "@/components/conversion/trust-strip";
import { SmoothScroll } from "@/components/smooth-scroll";
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

const workflow = [
  { title: "Enquire", description: "Share the application, dimensions, volume, and performance target." },
  { title: "Design", description: "We select materials and develop a practical construction or sample." },
  { title: "Manufacture", description: "Controlled conversion turns the approved design into repeatable parts." },
  { title: "Deliver", description: "Finished products are packed in the format your operation requires." },
];

export default function HomePage() {
  return (
    <SmoothScroll enabled={false}>
      <MattressScrollDynamic />
      <MobileMattressHeroDynamic />

      <TrustStrip />
      <div className="section-divider" />

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
                    "glass-card group overflow-hidden rounded-xl border-t-2",
                    accent.border,
                    accent.glow,
                  )}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
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

      <div className="section-divider" />

      <SectionWrapper background="muted">
        <AnimateOnScroll delay={0.1}>
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

      <div className="section-divider" />

      <SectionWrapper>
        <AnimateOnScroll delay={0.1}>
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
              {workflow.map((step, index) => (
                <li
                  key={step.title}
                  className="relative grid grid-cols-[3rem_1fr] gap-4 lg:block lg:pt-20"
                >
                  <span className="gradient-border relative z-10 grid size-12 place-items-center rounded-full bg-background font-heading font-semibold text-foreground lg:absolute lg:top-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="font-heading text-xl font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      <div className="section-divider" />

      <SectionWrapper background="muted">
        <AnimateOnScroll delay={0.1}>
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

      <div className="section-divider" />

      <section className="relative overflow-hidden py-20">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(199_89%_48%_/_0.1)_0%,_transparent_70%)]"
        />
        <div className="container-site relative">
          <AnimateOnScroll delay={0.1}>
            <div className="mx-auto max-w-2xl px-4 text-center">
              <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
                Ready to discuss your project?
              </h2>
              <p className="mb-8 text-lg text-slate-600 dark:text-slate-300">
                Send your dimensions, drawing, sample, or performance brief and we will help define the next step.
              </p>
              <Button
                asChild
                size="lg"
                variant="gradient"
                className="px-8 py-4 text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40"
              >
                <TrackedLink href="/contact/" event="cta_click" eventParams={{ cta_id: "start-your-project" }}>
                  Get in Touch <ArrowRight className="size-5" />
                </TrackedLink>
              </Button>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <StickyCtaBar />
    </SmoothScroll>
  );
}
