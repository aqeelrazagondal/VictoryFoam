import { HubPage } from "@/components/tank/hub-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Record usage",
  "Record kilograms used from the open tank.",
  "/tank/use/",
);

export default function Page() {
  return <HubPage />;
}
