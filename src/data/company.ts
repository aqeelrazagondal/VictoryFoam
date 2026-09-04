import type { CompanyInfo, GalleryImage } from "@/types";

const ADDRESS_LINES = [
  "7684 Matlotlo Street",
  "Lawley Ext 2",
  "Ennerdale",
  "1830",
  "Gauteng, South Africa",
];

export const company: CompanyInfo = {
  name: "Victory Foam",
  tagline: "Foam engineered for the way your product is used.",
  description:
    "Victory Foam manufactures mattress, comfort, industrial, and custom-cut foam components for trade customers.",
  phone: "+27 73 799 3932",
  email: "enquiries@victoryfoam.co.za",
  address: ADDRESS_LINES.join(", "),
  addressLines: ADDRESS_LINES,
  postalAddress: {
    streetAddress: "7684 Matlotlo Street, Lawley Ext 2",
    addressLocality: "Ennerdale",
    addressRegion: "Gauteng",
    postalCode: "1830",
    addressCountry: "ZA",
  },
  workingHours: "Monday–Friday, 07:30–16:30",
  openingHours: "Mo-Fr 07:30-16:30",
  mapEmbedUrl:
    "https://www.google.com/maps?q=7684+Matlotlo+Street,+Lawley+Ext+2,+Ennerdale,+1830,+Gauteng,+South+Africa&output=embed",
  socialLinks: [
    { platform: "LinkedIn", url: "https://www.linkedin.com/company/victory-foam-za/" },
    { platform: "Facebook", url: "https://www.facebook.com/victoryfoamza/" },
    { platform: "Instagram", url: "https://www.instagram.com/victoryfoamza/" },
  ],
};

export const galleryImages: GalleryImage[] = [
  {
    src: "/images/factory/foam-cutting.svg",
    alt: "CNC foam cutting line prepared for a production run",
    type: "factory",
  },
  {
    src: "/images/factory/quality-control.svg",
    alt: "Foam samples arranged for quality inspection",
    type: "factory",
  },
  {
    src: "/images/factory/foam-blocks.svg",
    alt: "Foam blocks organised in the manufacturing facility",
    type: "factory",
  },
  {
    src: "/images/products/memory-foam-mattress.svg",
    alt: "Layered memory foam mattress construction",
    type: "product",
  },
  {
    src: "/images/products/acoustic-panels.svg",
    alt: "Profiled acoustic foam panels",
    type: "product",
  },
  {
    src: "/images/products/custom-cut-foam.svg",
    alt: "Custom-cut foam components in several profiles",
    type: "product",
  },
  {
    src: "/images/factory/foam-cutting.svg",
    alt: "Cutting equipment shaping foam to a controlled profile",
    type: "process",
  },
  {
    src: "/images/factory/quality-control.svg",
    alt: "Manufactured foam samples being checked against specification",
    type: "process",
  },
  {
    src: "/images/products/packaging-inserts.svg",
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
