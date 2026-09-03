import type { Category } from "@/types";

export const categories: Category[] = [
  {
    slug: "mattresses",
    name: "Mattresses",
    description:
      "Layered foam constructions engineered for repeatable comfort and support.",
    image: "/images/products/memory-foam-mattress.webp",
    accent: "cyan",
  },
  {
    slug: "toppers-pillows",
    name: "Toppers & Pillows",
    description:
      "Pressure-relieving sleep accessories in custom profiles and firmnesses.",
    image: "/images/products/cooling-gel-topper.webp",
    accent: "teal",
  },
  {
    slug: "industrial-foam",
    name: "Industrial Foam",
    description:
      "Durable foam grades for acoustic, packaging, seating, and protection.",
    image: "/images/products/industrial-foam.webp",
    accent: "amber",
  },
  {
    slug: "custom-cut-foam",
    name: "Custom Cut Foam",
    description:
      "Made-to-drawing components cut to your dimensions and tolerances.",
    image: "/images/products/custom-cut-foam.webp",
    accent: "purple",
  },
];

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}
