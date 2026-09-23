import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SiteChrome } from "@/components/layout/site-chrome";
import { JsonLd } from "@/components/seo/json-ld";
import { company } from "@/data/company";
import { buildOrganizationSchema } from "@/lib/seo";

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <SiteChrome
      measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
      formId={process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID}
    >
      <JsonLd data={buildOrganizationSchema(company)} />
      <Header />
      <Breadcrumbs />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </SiteChrome>
  );
}
