import type { MetadataRoute } from "next";

import { products } from "@/data/products";

const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
const siteUrl = raw && raw.startsWith("http") ? raw : "https://www.example.com";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: new URL("/", `${siteUrl}/`).toString(), changeFrequency: "monthly", priority: 1 },
    { url: new URL("/products/", `${siteUrl}/`).toString(), changeFrequency: "monthly", priority: 0.9 },
    { url: new URL("/about/", `${siteUrl}/`).toString(), changeFrequency: "yearly", priority: 0.7 },
    { url: new URL("/gallery/", `${siteUrl}/`).toString(), changeFrequency: "monthly", priority: 0.6 },
    { url: new URL("/contact/", `${siteUrl}/`).toString(), changeFrequency: "yearly", priority: 0.7 },
  ];

  return [
    ...staticPages,
    ...products.map((product) => ({
      url: new URL(`/products/${product.slug}/`, `${siteUrl}/`).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
