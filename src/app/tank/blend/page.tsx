import { BlendPage } from "@/components/tank/blend-page";
import { tankMetadata } from "@/lib/tank/metadata";

export const metadata = tankMetadata(
  "Blend calculator",
  "Mix a fresh batch from two chemicals. No tank required.",
  "/tank/blend/",
);

export default function Page() {
  return <BlendPage />;
}
