"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { getProduct } from "@/data/products";
import { buildBreadcrumbSchema } from "@/lib/seo";

function humanize(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const items = [
    { label: "Home", href: "/" },
    ...segments.map((segment, index) => ({
      label:
        segments[index - 1] === "products"
          ? (getProduct(segment)?.name ?? humanize(segment))
          : humanize(segment),
      href: `/${segments.slice(0, index + 1).join("/")}/`,
    })),
  ];
  const jsonLd = buildBreadcrumbSchema(
    items.map((item) => ({ name: item.label, path: item.href })),
  );

  return (
    <>
      <nav aria-label="Breadcrumb" className="container-site py-4 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-2">
                {index > 0 && <ChevronRight aria-hidden className="size-3.5" />}
                {isLast ? (
                  <span aria-current="page" className="text-foreground">
                    {item.label}
                  </span>
                ) : (
                  <Link className="hover:text-foreground" href={item.href}>
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={jsonLd} />
    </>
  );
}
