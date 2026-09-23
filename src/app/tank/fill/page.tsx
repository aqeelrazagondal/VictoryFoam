import { FillPage } from "@/components/tank/fill-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Fill calculator",
  "Top up an existing tank with two chemicals to a target volume and solid %.",
  "/tank/fill/",
);

export default function Page() {
  return <FillPage />;
}
