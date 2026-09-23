import { PathRedirect } from "@/components/tank/path-redirect";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Set up your tank",
  "Tank setup is a separate page from Blend Calculator.",
  "/tank/setup/",
);

export default function Page() {
  return (
    <PathRedirect
      href="/tank/setup/"
      title="Set up your tank"
      description="Setup is not under Blend. It lives at /tank/setup/."
    />
  );
}
