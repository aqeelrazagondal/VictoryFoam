import { HubPage } from "@/components/tank/hub-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Correct tank readings",
  "Correct the open tank’s remaining kilograms.",
  "/tank/correct/",
);

export default function Page() {
  return <HubPage />;
}
