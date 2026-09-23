import type { Metadata } from "next";
import Link from "next/link";

import { SiteFrame } from "@/components/layout/site-frame";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Page Not Found",
    description:
      "The requested Victory Foam page could not be found. Return to the company overview or browse our mattress, industrial, and custom foam products.",
    path: "/404.html",
  }),
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <SiteFrame>
    <section className="container-site grid min-h-[70vh] place-items-center py-20 text-center">
      <div>
        <p className="bg-gradient-to-r from-primary to-sky-300 bg-clip-text font-heading text-[8rem] font-bold leading-none text-transparent opacity-80 sm:text-[11rem]">
          404
        </p>
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          This page doesn&apos;t exist
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          The page you&apos;re looking for may have moved or doesn&apos;t exist. Here are some
          helpful links:
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/products/">View Products</Link>
          </Button>
        </div>
      </div>
    </section>
    </SiteFrame>
  );
}
