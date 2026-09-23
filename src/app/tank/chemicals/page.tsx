import { ChemicalsPage } from "@/components/tank/chemicals-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Chemical library",
  "Add chemicals with a name and Solid Content %. Everything else is optional.",
  "/tank/chemicals/",
);

export default function Page() {
  return <ChemicalsPage />;
}
