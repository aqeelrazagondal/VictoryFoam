import { MixPage } from "@/components/tank/mix-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Mix",
  "Blend a batch, fill the tank, or plan a pour.",
  "/tank/mix/",
);

export default function Page() {
  return <MixPage />;
}
