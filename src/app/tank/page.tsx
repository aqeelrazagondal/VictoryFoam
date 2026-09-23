import { HubPage } from "@/components/tank/hub-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Foam Chemical Calculator",
  "Blend batches and optionally track a holding tank.",
  "/tank/",
);

export default function Page() {
  return <HubPage />;
}
