import type { CompanyInfo, GalleryImage } from "@/types";

export const company: CompanyInfo = {
  // Mock business identity: replace this one record before production launch.
  name: "Victory Foam",
  tagline: "Foam engineered for the way your product is used.",
  description:
    "Victory Foam manufactures mattress, comfort, industrial, and custom-cut foam components for trade customers.",
  phone: "+27 (0) 11 234 5678",
  email: "enquiries@victoryfoam.co.za",
  address: "Unit 7 Alton Industrial Park, 14 Electron Avenue, Kempton Park, Gauteng 1619, South Africa",
  postalAddress: {
    streetAddress: "Unit 7 Alton Industrial Park, 14 Electron Avenue",
    addressLocality: "Kempton Park",
    addressRegion: "Gauteng",
    postalCode: "1619",
    addressCountry: "ZA",
  },
  workingHours: "Monday–Friday, 07:30–16:30",
  openingHours: "Mo-Fr 07:30-16:30",
  mapEmbedUrl:
    "https://www.google.com/maps?q=Kempton+Park+Gauteng+1619+South+Africa&output=embed",
  socialLinks: [
    { platform: "LinkedIn", url: "https://www.linkedin.com/company/victory-foam-za/" },
    { platform: "Facebook", url: "https://www.facebook.com/victoryfoamza/" },
    { platform: "Instagram", url: "https://www.instagram.com/victoryfoamza/" },
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
