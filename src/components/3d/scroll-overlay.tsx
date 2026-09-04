"use client";

import { ArrowRight, Mail, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { company } from "@/data/company";
import { scrollSlides, type ScrollSlide } from "@/data/mattress-scroll";
import { cn } from "@/lib/utils";

function activeSlide(progress: number): ScrollSlide | undefined {
  return scrollSlides.find(
    (slide) => progress >= slide.scrollStart && progress < slide.scrollEnd,
  ) ?? scrollSlides[scrollSlides.length - 1];
}

export function ScrollOverlay({
  progress,
  reduceMotion,
}: {
  progress: number;
  reduceMotion: boolean;
}) {
  const slide = activeSlide(progress);
  if (!slide) return null;

  const positionClass =
    slide.position === "center"
      ? "items-center text-center"
      : slide.position === "left"
        ? "items-start text-left md:pr-[42%]"
        : "items-end text-right md:pl-[42%]";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex">
      <div className={cn("container-site flex w-full flex-col justify-center py-24", positionClass)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={cn(
              "max-w-xl",
              slide.position === "center" && "mx-auto max-w-2xl",
              slide.position === "right" && "ml-auto",
            )}
          >
            {slide.id === "hook" ? (
              <h1 className="font-heading text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
                {slide.title}
              </h1>
            ) : (
              <h2
                className={cn(
                  "font-heading text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl",
                  "whitespace-pre-line",
                )}
              >
                {slide.isCta ? (
                  <>
                    Your specification.
                    <br />
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      Our precision.
                    </span>
                  </>
                ) : (
                  slide.title
                )}
              </h2>
            )}

            {slide.subtitle && (
              <p
                className={cn(
                  "mt-4 text-base text-slate-300 md:text-lg",
                  slide.position === "center" && "mx-auto",
                )}
              >
                {slide.subtitle}
              </p>
            )}

            {slide.specs && slide.specs.length > 0 && (
              <div className="mt-6 grid gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-left backdrop-blur-md md:grid-cols-3">
                {slide.specs.map((spec) => (
                  <div key={spec.label}>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {spec.label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">{spec.value}</p>
                  </div>
                ))}
              </div>
            )}

            {slide.isCta && (
              <div className="pointer-events-auto mt-10 flex flex-col items-center gap-6">
                <Button
                  asChild
                  size="lg"
                  variant="gradient"
                  className="px-10 py-5 text-lg shadow-lg shadow-primary/40 hover:shadow-primary/60"
                >
                  <Link href="/contact/">
                    Start Your Project <ArrowRight className="size-5" />
                  </Link>
                </Button>
                <div className="flex flex-col items-center gap-3 text-sm text-slate-400 md:flex-row md:gap-6">
                  <a
                    href={`tel:${company.phone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
                  >
                    <Phone className="size-4 text-primary" />
                    {company.phone}
                  </a>
                  <a
                    href={`mailto:${company.email}`}
                    className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
                  >
                    <Mail className="size-4 text-primary" />
                    {company.email}
                  </a>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                  <span>Response within 24 hours</span>
                  <span>Sample development available</span>
                  <span>South African manufacturing</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
