import { PathRedirect } from "@/components/tank/path-redirect";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Tank planner",
  "Planner is a separate page from Blend Calculator.",
  "/tank/planner/",
);

export default function Page() {
  return (
    <PathRedirect
      href="/tank/planner/"
      title="Tank planner"
      description="Planner is not under Blend. It lives at /tank/planner/."
    />
  );
}
