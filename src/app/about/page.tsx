import {
  BadgeCheck,
  Boxes,
  FlaskConical,
  Leaf,
  Lightbulb,
  ScanLine,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { SectionHeader } from "@/components/sections/section-header";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { AnimateOnScroll } from "@/components/ui/animate-on-scroll";
import { company } from "@/data/company";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description:
    "Learn how Victory Foam develops, prototypes, tests, converts, and manufactures reliable foam specifications for UK trade customers.",
  path: "/about/",
});

const values = [
  {
    icon: BadgeCheck,
    title: "Quality",
    description: "Control the material, geometry, and finishing details that make repeat production reliable.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "Test practical combinations of foam grades and conversion methods around the application.",
  },
  {
    icon: Leaf,
    title: "Sustainability",
    description: "Reduce avoidable material use through considered design, nesting, and production planning.",
  },
  {
    icon: UsersRound,
    title: "Customer Focus",
    description: "Keep technical decisions connected to the buyer, user, and manufacturing constraint.",
  },
];

const capabilities = [
  {
    icon: FlaskConical,
    title: "Custom foam formulations",
    description: "Density, firmness, resilience, airflow, and feel selected for the target performance.",
  },
  {
    icon: Sparkles,
    title: "Prototyping",
    description: "Samples and development quantities created before the production specification is locked.",
  },
  {
    icon: Boxes,
    title: "Volume manufacturing",
    description: "Repeatable components, assemblies, and private-label products at planned production cadence.",
  },
  {
    icon: ScanLine,
    title: "Testing and certification",
    description: "Specification checks and applicable evidence aligned to material, construction, and end use.",
  },
];

export default function AboutPage() {
  return (
    <article>
      <SectionWrapper className="pb-12">
        <AnimateOnScroll>
          <section className="grid items-center gap-12 lg:grid-cols-2" aria-labelledby="about-title">
            <div>
              <h1 id="about-title" className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
                About {company.name}
              </h1>
              <div className="mt-6 space-y-4 text-muted-foreground">
                <p>
                  Victory Foam was built around a straightforward manufacturing idea: foam works best when its material and geometry are specified for the way the finished product will actually be used.
                </p>
                <p>
                  We work with bedding, furniture, packaging, acoustic, healthcare, and engineered-product teams to turn performance requirements into practical foam constructions.
                </p>
                <p>
                  From a first sample to repeat production, our role is to keep material selection, cutting, lamination, finishing, and quality control connected to one agreed specification.
                </p>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-white">
              <Image
                src="/images/factory/foam-blocks.webp"
                alt="Foam blocks arranged for conversion in the Victory Foam factory"
                width={1200}
                height={900}
                priority
                className="h-full w-full object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
          </section>
        </AnimateOnScroll>
      </SectionWrapper>

      <SectionWrapper background="muted">
        <AnimateOnScroll>
          <section aria-labelledby="mission-title">
          <SectionHeader
            id="mission-title"
            title="Mission & Values"
            subtitle="Our mission is to make foam specifications easier to develop, manufacture, and repeat with confidence."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, title, description }) => (
              <div key={title} className="glass-card rounded-xl p-6">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary glow-sm">
                  <Icon className="size-6" aria-hidden />
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
          </section>
        </AnimateOnScroll>
      </SectionWrapper>

      <SectionWrapper>
        <AnimateOnScroll>
          <section aria-labelledby="capabilities-title">
          <SectionHeader
            id="capabilities-title"
            title="Our Capabilities"
            subtitle="Technical and production support from material selection through finished part."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <div key={title} className="glass-card flex gap-4 rounded-xl p-6">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary glow-sm">
                  <Icon className="size-6" aria-hidden />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
          </section>
        </AnimateOnScroll>
      </SectionWrapper>

      {/*
        Team photos and names are omitted until the client provides them.
        When ready, render a section of cards: photo, name, and role from
        src/data/company.ts using /images/team/.
      */}
    </article>
  );
}
