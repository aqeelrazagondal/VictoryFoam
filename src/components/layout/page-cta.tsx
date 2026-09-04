import { ArrowRight } from "lucide-react";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { Button } from "@/components/ui/button";

export function PageCta({
  title = "Ready to specify a foam product?",
  description = "Browse the catalogue or send dimensions, a drawing, or a performance brief.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <SectionWrapper>
      <div className="glass-card gradient-border rounded-xl p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-8">
        <div className="max-w-xl">
          <h2 className="font-heading text-2xl font-semibold text-foreground md:text-3xl">{title}</h2>
          <p className="mt-3 text-muted-foreground">{description}</p>
        </div>
        <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row md:mt-0 md:w-auto">
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <TrackedLink href="/products/" event="cta_click" eventParams={{ cta_id: "view-products" }}>
              View Products
            </TrackedLink>
          </Button>
          <Button asChild variant="gradient" className="min-h-11 w-full sm:w-auto">
            <TrackedLink href="/contact/" event="cta_click" eventParams={{ cta_id: "get-in-touch" }}>
              Get in Touch <ArrowRight className="size-4" />
            </TrackedLink>
          </Button>
        </div>
      </div>
    </SectionWrapper>
  );
}
