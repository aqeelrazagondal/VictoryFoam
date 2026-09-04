export type MattressLayerId =
  | "support"
  | "transition"
  | "memory"
  | "comfort"
  | "cover";

export type SlidePosition = "left" | "right" | "center";

export type MattressLayer = {
  id: MattressLayerId;
  name: string;
  material: string;
  detail: string;
  color: string;
  height: number;
  assembledY: number;
  explodedY: number;
  roughness: number;
  focusY: number;
};

export type ScrollSlide = {
  id: string;
  scrollStart: number;
  scrollEnd: number;
  title: string;
  subtitle?: string;
  specs?: { label: string; value: string }[];
  position: SlidePosition;
  highlightLayer?: MattressLayerId | null;
  isCta?: boolean;
};

export type ScrollChapter = {
  id: string;
  label: string;
  progress: number;
};

/** Layers ordered top → bottom for UI lists; scene uses assembledY for stacking. */
export const mattressLayers: MattressLayer[] = [
  {
    id: "cover",
    name: "Top cover",
    material: "Knitted comfort cover",
    detail: "Creates a breathable, soft-touch sleeping surface.",
    color: "#F1F5F9",
    height: 0.2,
    assembledY: 1.05,
    explodedY: 2.0,
    roughness: 0.35,
    focusY: 0.9,
  },
  {
    id: "comfort",
    name: "Comfort layer",
    material: "Open-cell cooling foam",
    detail: "Improves airflow and cushions immediate surface pressure.",
    color: "#38BDF8",
    height: 0.45,
    assembledY: 0.7,
    explodedY: 1.15,
    roughness: 0.6,
    focusY: 0.55,
  },
  {
    id: "memory",
    name: "Memory foam",
    material: "Viscoelastic foam",
    detail: "Contours to the body and redistributes pressure.",
    color: "#7C3AED",
    height: 0.65,
    assembledY: 0.15,
    explodedY: 0.15,
    roughness: 0.4,
    focusY: 0.05,
  },
  {
    id: "transition",
    name: "Transition layer",
    material: "High-resilience transition foam",
    detail: "Balances deep comfort with progressive support.",
    color: "#0D9488",
    height: 0.35,
    assembledY: -0.38,
    explodedY: -0.95,
    roughness: 0.7,
    focusY: -0.45,
  },
  {
    id: "support",
    name: "Support base",
    material: "High-density support foam",
    detail: "Stabilises the construction and carries long-term load.",
    color: "#4B5563",
    height: 0.9,
    assembledY: -1.03,
    explodedY: -2.05,
    roughness: 0.9,
    focusY: -1.1,
  },
];

export const LAYER_WIDTH = 5;
export const LAYER_DEPTH = 3.2;

export const scrollSlides: ScrollSlide[] = [
  {
    id: "hook",
    scrollStart: 0,
    scrollEnd: 0.12,
    title: "Engineered from the inside out.",
    position: "center",
    highlightLayer: null,
  },
  {
    id: "explode",
    scrollStart: 0.12,
    scrollEnd: 0.18,
    title: "5 precision layers. One specification.",
    position: "left",
    highlightLayer: null,
  },
  {
    id: "support",
    scrollStart: 0.18,
    scrollEnd: 0.32,
    title: "High-density support base",
    subtitle: "The foundation. Engineered for long-term structural integrity.",
    specs: [
      { label: "Density", value: "Specified to brief" },
      { label: "Type", value: "HR polyurethane" },
      { label: "Purpose", value: "Weight distribution" },
    ],
    position: "right",
    highlightLayer: "support",
  },
  {
    id: "transition",
    scrollStart: 0.32,
    scrollEnd: 0.45,
    title: "Transition layer — pressure distribution",
    subtitle: "Bridges deep comfort with progressive support response.",
    specs: [
      { label: "Feel", value: "Progressive" },
      { label: "Type", value: "High-resilience foam" },
      { label: "Role", value: "Load transfer" },
    ],
    position: "left",
    highlightLayer: "transition",
  },
  {
    id: "memory",
    scrollStart: 0.45,
    scrollEnd: 0.6,
    title: "Viscoelastic memory foam — your shape, your comfort",
    subtitle: "Contours under pressure and recovers for repeat performance.",
    specs: [
      { label: "Response", value: "Pressure-relieving" },
      { label: "Type", value: "Memory foam" },
      { label: "Tuneable", value: "Density & height" },
    ],
    position: "right",
    highlightLayer: "memory",
  },
  {
    id: "cover",
    scrollStart: 0.6,
    scrollEnd: 0.75,
    title: "Knitted comfort cover — breathable, soft-touch",
    subtitle: "Surface comfort and airflow matched to the finished specification.",
    specs: [
      { label: "Surface", value: "Soft-touch knit" },
      { label: "Airflow", value: "Open construction" },
      { label: "Finish", value: "Private-label ready" },
    ],
    position: "left",
    highlightLayer: "cover",
  },
  {
    id: "reassemble",
    scrollStart: 0.75,
    scrollEnd: 0.85,
    title: "Certified quality. Built to specification.",
    subtitle: "ISO 9001 · CertiPUR · BS 7177 — matched to material and construction.",
    position: "center",
    highlightLayer: null,
  },
  {
    id: "cta",
    scrollStart: 0.85,
    scrollEnd: 1,
    title: "Your specification.\nOur precision.",
    subtitle:
      "Send your requirements. We will help turn them into a production-ready foam specification.",
    position: "center",
    highlightLayer: null,
    isCta: true,
  },
];

export const scrollChapters: ScrollChapter[] = [
  { id: "support", label: "Support", progress: 0.22 },
  { id: "transition", label: "Transition", progress: 0.38 },
  { id: "memory", label: "Memory", progress: 0.52 },
  { id: "cover", label: "Cover", progress: 0.66 },
  { id: "complete", label: "Complete", progress: 0.8 },
  { id: "cta", label: "Enquire", progress: 0.92 },
];

export const trustSignals = [
  "ISO 9001 Certified",
  "CertiPUR Approved",
  "BS 7177 Fire Safety",
  "South African Manufacturing",
  "Sample Development",
  "Practical Response Times",
] as const;

export function getLayerById(id: MattressLayerId) {
  return mattressLayers.find((layer) => layer.id === id);
}
