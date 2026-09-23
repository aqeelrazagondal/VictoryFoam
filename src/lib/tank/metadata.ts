import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";

export function tankMetadata(title: string, description: string, path: string): Metadata {
  return {
    ...buildMetadata({ title, description, path }),
    robots: { index: false, follow: false },
  };
}
