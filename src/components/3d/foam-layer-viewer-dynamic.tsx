"use client";

import dynamic from "next/dynamic";

const FoamLayerViewer = dynamic(() => import("./foam-layer-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
      Loading 3D viewer...
    </div>
  ),
});

export function FoamLayerViewerDynamic() {
  return <FoamLayerViewer />;
}
