"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
  const [selected, setSelected] = useState(0);

  return (
    <div>
      <div className="gradient-border rounded-xl">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white">
          <Image
            src={images[selected]}
            alt={productName}
            width={1200}
            height={900}
            priority
            className="h-full w-full object-cover"
            sizes="(min-width: 1024px) 55vw, 100vw"
          />
        </div>
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2" aria-label={`${productName} image gallery`}>
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white sm:w-20",
                selected === index ? "border-primary" : "border-transparent",
              )}
            >
              <Image
                src={image}
                alt={`${productName} view ${index + 1}`}
                width={320}
                height={240}
                className="h-full w-full object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
