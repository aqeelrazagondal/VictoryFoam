import type { Product } from "@/types";

export const products: Product[] = [
  {
    slug: "memory-foam-mattress",
    name: "Contour Memory Foam Mattress",
    category: "mattresses",
    shortDescription:
      "A multi-layer mattress combining pressure relief with a stable support core.",
    fullDescription:
      "Designed for private-label bedding programs, this construction pairs a responsive memory foam comfort layer with transition and high-resilience support foams. Layer heights, densities, firmness, covers, and finished dimensions can be specified for each range.",
    image: "/images/products/memory-foam-mattress.svg",
    gallery: ["/images/products/memory-foam-mattress.svg", "/images/factory/foam-cutting.svg"],
    specs: [
      { label: "Construction", value: "3-layer foam" },
      { label: "Firmness", value: "Medium" },
      { label: "Height", value: "Custom" },
    ],
    features: ["Pressure-relieving comfort layer", "Stable support core", "Private-label dimensions"],
    certifications: ["CertiPUR", "BS 7177"],
  },
  {
    slug: "orthopaedic-support-mattress",
    name: "Orthopaedic Support Mattress",
    category: "mattresses",
    shortDescription:
      "A firmer support-led construction for hospitality, care, and retail ranges.",
    fullDescription:
      "A durable foam mattress platform designed around firmer load response and edge stability. The specification can be tuned for contract, healthcare, hospitality, and consumer applications.",
    image: "/images/products/orthopaedic-mattress.svg",
    specs: [
      { label: "Construction", value: "High-resilience core" },
      { label: "Firmness", value: "Firm" },
      { label: "Use", value: "Contract & retail" },
    ],
    features: ["Consistent edge support", "Custom cover options", "High-use durability"],
    certifications: ["ISO 9001", "BS 7177"],
  },
  {
    slug: "cooling-gel-topper",
    name: "Cooling Gel Foam Topper",
    category: "toppers-pillows",
    shortDescription:
      "A ventilated gel-infused comfort layer for mattress enhancement programs.",
    fullDescription:
      "This topper uses open-cell gel foam and a ventilated profile to improve surface comfort. Available in custom thicknesses, roll-pack formats, and private-label cover specifications.",
    image: "/images/products/cooling-gel-topper.svg",
    specs: [
      { label: "Material", value: "Gel memory foam" },
      { label: "Feel", value: "Soft-medium" },
      { label: "Thickness", value: "Custom" },
    ],
    features: ["Open-cell airflow", "Pressure redistribution", "Roll-pack compatible"],
    certifications: ["CertiPUR"],
  },
  {
    slug: "contour-foam-pillow",
    name: "Contour Foam Pillow",
    category: "toppers-pillows",
    shortDescription:
      "A shaped foam pillow platform with configurable profiles and materials.",
    fullDescription:
      "CNC-profiled for consistent ergonomic support, this pillow can be manufactured in memory, latex-like, or high-resilience foam with optional ventilation channels.",
    image: "/images/products/contour-pillow.svg",
    specs: [
      { label: "Profile", value: "CNC contoured" },
      { label: "Material", value: "Custom foam grade" },
      { label: "Ventilation", value: "Optional" },
    ],
    features: ["Repeatable contour geometry", "Multiple foam grades", "Private-label sizing"],
    certifications: ["CertiPUR"],
  },
  {
    slug: "high-density-industrial-foam",
    name: "High-Density Industrial Foam",
    category: "industrial-foam",
    shortDescription:
      "A resilient material platform for seating, protection, and engineered parts.",
    fullDescription:
      "Specified by density, firmness, compression set, and finished tolerance, this foam supports demanding industrial applications where repeatability matters.",
    image: "/images/products/industrial-foam.svg",
    specs: [
      { label: "Density", value: "Custom range" },
      { label: "Format", value: "Sheet, block, cut part" },
      { label: "Tolerance", value: "To drawing" },
    ],
    features: ["Controlled compression response", "Batch consistency", "Multiple conversion formats"],
    certifications: ["ISO 9001"],
  },
  {
    slug: "acoustic-foam-panels",
    name: "Acoustic Foam Panels",
    category: "industrial-foam",
    shortDescription:
      "Profiled open-cell foam for sound absorption and equipment enclosures.",
    fullDescription:
      "Available in wedge, pyramid, convoluted, and flat profiles for studios, plant rooms, transport interiors, and OEM acoustic assemblies.",
    image: "/images/products/acoustic-panels.svg",
    specs: [
      { label: "Cell structure", value: "Open cell" },
      { label: "Profiles", value: "Flat & profiled" },
      { label: "Backing", value: "Optional adhesive" },
    ],
    features: ["Multiple surface profiles", "Die-cut shapes", "Self-adhesive backing option"],
    certifications: ["ISO 9001"],
  },
  {
    slug: "custom-cut-foam",
    name: "Custom Cut Foam Components",
    category: "custom-cut-foam",
    shortDescription:
      "CNC, contour, and profile-cut components made to drawing.",
    fullDescription:
      "From prototypes to repeat production, we convert foam blocks and sheets into finished parts using CNC contour cutting, profiling, lamination, and adhesive application.",
    image: "/images/products/custom-cut-foam.svg",
    specs: [
      { label: "Input", value: "Drawing or sample" },
      { label: "Processes", value: "CNC, profile, laminate" },
      { label: "Volume", value: "Prototype to production" },
    ],
    features: ["Drawing-controlled geometry", "Material selection support", "Assembly-ready finishing"],
    certifications: ["ISO 9001"],
  },
  {
    slug: "protective-packaging-foam",
    name: "Protective Packaging Inserts",
    category: "custom-cut-foam",
    shortDescription:
      "Presentation and transit inserts engineered around the product.",
    fullDescription:
      "Custom cavities, layered builds, and case inserts protect sensitive products through handling and transport while presenting them clearly at the point of use.",
    image: "/images/products/packaging-inserts.svg",
    specs: [
      { label: "Design", value: "Product-specific" },
      { label: "Build", value: "Single or multi-layer" },
      { label: "Finish", value: "Optional colour facing" },
    ],
    features: ["Custom cavity layouts", "Transit protection", "Case and carton integration"],
    certifications: ["ISO 9001"],
  },
];

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getRelatedProducts(slug: string, limit = 3) {
  const current = getProduct(slug);
  if (!current || limit <= 0) return [];

  const sameCategory = products.filter(
    (product) => product.slug !== slug && product.category === current.category,
  );
  const otherCategories = products.filter(
    (product) => product.slug !== slug && product.category !== current.category,
  );

  return [...sameCategory, ...otherCategories].slice(0, limit);
}
