import type { Metadata } from "next";

import { company } from "@/data/company";
import type { CompanyInfo, Product } from "@/types";

const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "https://www.example.com";

export const SITE_URL = configuredUrl;

export function getCanonicalUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function buildMetadata({
  title,
  description,
  path,
  image = "/og-image.jpg",
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const canonical = getCanonicalUrl(path);
  const imageUrl = getCanonicalUrl(image);
  const fullTitle = title.includes(company.name)
    ? title
    : `${title} | ${company.name}`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: company.name,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
  };
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildOrganizationSchema(info: CompanyInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: info.name,
    description: info.description,
    url: SITE_URL,
    email: info.email,
    telephone: info.phone,
    address: {
      "@type": "PostalAddress",
      ...info.postalAddress,
    },
    sameAs: info.socialLinks.map((social) => social.url),
  };
}

export function buildLocalBusinessSchema(info: CompanyInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#local-business`,
    name: info.name,
    description: info.description,
    url: SITE_URL,
    image: getCanonicalUrl("/og-image.jpg"),
    email: info.email,
    telephone: info.phone,
    openingHours: info.openingHours,
    address: {
      "@type": "PostalAddress",
      ...info.postalAddress,
    },
    sameAs: info.socialLinks.map((social) => social.url),
  };
}

export function buildProductSchema(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    category: product.category,
    image: getCanonicalUrl(product.image),
    url: getCanonicalUrl(`/products/${product.slug}/`),
    brand: {
      "@type": "Brand",
      name: company.name,
    },
    additionalProperty: product.specs.map((spec) => ({
      "@type": "PropertyValue",
      name: spec.label,
      value: spec.value,
    })),
  };
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.path),
    })),
  };
}
