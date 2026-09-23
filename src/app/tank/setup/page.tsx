import { SetupPage } from "@/components/tank/setup-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Set up tank",
  "Optional tank setup. Unlocks fill, log, composition, and planner.",
  "/tank/setup/",
);

export default function Page() {
  return <SetupPage />;
}
