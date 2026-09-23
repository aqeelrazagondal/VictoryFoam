import { CompositionPage } from "@/components/tank/composition-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Tank composition",
  "How much of each chemical remains in the tank.",
  "/tank/composition/",
);

export default function Page() {
  return <CompositionPage />;
}
