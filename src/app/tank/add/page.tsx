import { HubPage } from "@/components/tank/hub-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Add to the tank",
  "Pour chemicals into the open tank.",
  "/tank/add/",
);

export default function Page() {
  return <HubPage />;
}
