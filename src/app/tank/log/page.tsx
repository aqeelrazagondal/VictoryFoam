import { LogPage } from "@/components/tank/log-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Tank log",
  "Append-only tank ledger. Running totals are recomputed from every entry.",
  "/tank/log/",
);

export default function Page() {
  return <LogPage />;
}
