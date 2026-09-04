import type { MetadataRoute } from "next";

import { products } from "@/data/products";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: new URL("/", `${SITE_URL}/`).toString(), changeFrequency: "monthly", priority: 1 },
    { url: new URL("/products/", `${SITE_URL}/`).toString(), changeFrequency: "monthly", priority: 0.9 },
    { url: new URL("/about/", `${SITE_URL}/`).toString(), changeFrequency: "yearly", priority: 0.7 },
    { url: new URL("/gallery/", `${SITE_URL}/`).toString(), changeFrequency: "monthly", priority: 0.6 },
    { url: new URL("/contact/", `${SITE_URL}/`).toString(), changeFrequency: "yearly", priority: 0.7 },
    { url: new URL("/privacy/", `${SITE_URL}/`).toString(), changeFrequency: "yearly", priority: 0.3 },
    { url: new URL("/terms/", `${SITE_URL}/`).toString(), changeFrequency: "yearly", priority: 0.3 },
  ];

  return [
    ...staticPages,
    ...products.map((product) => ({
      url: new URL(`/products/${product.slug}/`, `${SITE_URL}/`).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
