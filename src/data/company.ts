import type { CompanyInfo, GalleryImage } from "@/types";

export const company: CompanyInfo = {
  // Mock business identity: replace this one record before production launch.
  name: "Victory Foam",
  tagline: "Foam engineered for the way your product is used.",
  description:
    "Victory Foam manufactures mattress, comfort, industrial, and custom-cut foam components for trade customers.",
  phone: "+44 (0) 24 7618 4200",
  email: "enquiries@victoryfoam.co.uk",
  address: "Unit 14 Meridian Works, Coventry, West Midlands CV6 4BX, United Kingdom",
  postalAddress: {
    streetAddress: "Unit 14 Meridian Works",
    addressLocality: "Coventry",
    addressRegion: "West Midlands",
    postalCode: "CV6 4BX",
    addressCountry: "GB",
  },
  workingHours: "Monday–Friday, 08:00–17:00",
  openingHours: "Mo-Fr 08:00-17:00",
  mapEmbedUrl:
    "https://www.google.com/maps?q=Coventry%20West%20Midlands%20CV6%204BX&output=embed",
  socialLinks: [
    { platform: "LinkedIn", url: "https://www.linkedin.com/company/victory-foam-uk/" },
    { platform: "Facebook", url: "https://www.facebook.com/victoryfoamuk/" },
    { platform: "Instagram", url: "https://www.instagram.com/victoryfoamuk/" },
  ],
};

export const galleryImages: GalleryImage[] = [
  {
    src: "/images/factory/foam-cutting.webp",
    alt: "CNC foam cutting line prepared for a production run",
    type: "factory",
  },
  {
    src: "/images/factory/quality-control.webp",
    alt: "Foam samples arranged for quality inspection",
    type: "factory",
  },
  {
    src: "/images/factory/foam-blocks.webp",
    alt: "Foam blocks organised in the manufacturing facility",
    type: "factory",
  },
  {
    src: "/images/products/memory-foam-mattress.webp",
    alt: "Layered memory foam mattress construction",
    type: "product",
  },
  {
    src: "/images/products/acoustic-panels.webp",
    alt: "Profiled acoustic foam panels",
    type: "product",
  },
  {
    src: "/images/products/custom-cut-foam.webp",
    alt: "Custom-cut foam components in several profiles",
    type: "product",
  },
  {
    src: "/images/factory/foam-cutting.webp",
    alt: "Cutting equipment shaping foam to a controlled profile",
    type: "process",
  },
  {
    src: "/images/factory/quality-control.webp",
    alt: "Manufactured foam samples being checked against specification",
    type: "process",
  },
  {
    src: "/images/products/packaging-inserts.webp",
    alt: "Converted packaging insert ready for final inspection",
    type: "process",
  },
];

export const navigation = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products/" },
  { label: "About", href: "/about/" },
  { label: "Gallery", href: "/gallery/" },
  { label: "Contact", href: "/contact/" },
] as const;
