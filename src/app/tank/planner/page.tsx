import { PlannerPage } from "@/components/tank/planner-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Tank planner",
  "Preview an add batch or reverse-calculate how much of one chemical to add.",
  "/tank/planner/",
);

export default function Page() {
  return <PlannerPage />;
}
