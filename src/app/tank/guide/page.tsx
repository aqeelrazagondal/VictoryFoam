import { GuidePage } from "@/components/tank/guide-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Calculator guide",
  "How to use the Victory Foam chemical calculator.",
  "/tank/guide/",
);

export default function Page() {
  return <GuidePage />;
}
