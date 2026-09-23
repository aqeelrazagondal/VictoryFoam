import { InventoryPage } from "@/components/tank/inventory-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Chemical inventory",
  "Track kilograms on the shelf: receive, issue, waste, count, and the history of each chemical.",
  "/tank/inventory/",
);

export default function Page() {
  return <InventoryPage />;
}
