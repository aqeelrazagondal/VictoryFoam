import type { ReactNode } from "react";

import { TankApp } from "@/components/tank/tank-app";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Foam Chemical Calculator",
  "Internal Victory Foam blend, fill, and tank-tracking calculator.",
  "/tank/",
);

export default function TankLayout({ children }: { children: ReactNode }) {
  return <TankApp>{children}</TankApp>;
}
