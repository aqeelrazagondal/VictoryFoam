import type { Metadata } from "next";

import { certifications } from "@/data/certifications";
import { company } from "@/data/company";
import { toTelNumber } from "@/lib/utils";
import type { CompanyInfo, Product } from "@/types";

const DEFAULT_SITE_URL = "https://victoryfoam.co.za";
const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
export const SITE_URL = raw && raw.startsWith("http") ? raw : DEFAULT_SITE_URL;

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
      locale: "en_ZA",
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

function buildCertificationCredentials() {
  return certifications.map((cert) => ({
    "@type": "EducationalOccupationalCredential" as const,
    name: cert.name,
    description: cert.description,
    credentialCategory: "certification",
  }));
}

function buildOpeningHoursSpecification() {
  return {
    "@type": "OpeningHoursSpecification" as const,
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ],
    opens: "07:30",
    closes: "16:30",
  };
}

export function buildOrganizationSchema(info: CompanyInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: info.name,
    description: info.description,
    url: SITE_URL,
    logo: getCanonicalUrl("/logo.png"),
    email: info.email,
    telephone: toTelNumber(info.phone),
    address: {
      "@type": "PostalAddress",
      ...info.postalAddress,
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: toTelNumber(info.phone),
      email: info.email,
      contactType: "sales",
      areaServed: "ZA",
      availableLanguage: ["en"],
    },
    hasCredential: buildCertificationCredentials(),
    award: certifications.map((cert) => cert.name),
    sameAs: info.socialLinks.map((social) => social.url),
  };
}

export function buildLocalBusinessSchema(info: CompanyInfo) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ManufacturingBusiness"],
    "@id": `${SITE_URL}/#local-business`,
    name: info.name,
    description: info.description,
    url: SITE_URL,
    logo: getCanonicalUrl("/logo.png"),
    image: getCanonicalUrl("/og-image.jpg"),
    email: info.email,
    telephone: toTelNumber(info.phone),
    openingHours: info.openingHours,
    openingHoursSpecification: buildOpeningHoursSpecification(),
    address: {
      "@type": "PostalAddress",
      ...info.postalAddress,
    },
    ...(info.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: info.geo.latitude,
            longitude: info.geo.longitude,
          },
        }
      : {}),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: toTelNumber(info.phone),
      email: info.email,
      contactType: "sales",
      areaServed: "ZA",
      availableLanguage: ["en"],
    },
    hasCredential: buildCertificationCredentials(),
    award: certifications.map((cert) => cert.name),
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
    manufacturer: {
      "@type": "Organization",
      name: company.name,
    },
    additionalProperty: product.specs.map((spec) => ({
      "@type": "PropertyValue",
      name: spec.label,
      value: spec.value,
    })),
    ...(product.certifications?.length
      ? { award: product.certifications }
      : {}),
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
