"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { galleryImages } from "@/data/company";
import type { GalleryImage } from "@/types";

const collections: { value: GalleryImage["type"]; label: string }[] = [
  { value: "factory", label: "Factory & Facilities" },
  { value: "product", label: "Our Products" },
  { value: "process", label: "Process" },
];

export function GalleryBrowser() {
  const [category, setCategory] = useState<GalleryImage["type"]>("factory");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const selectedImages = galleryImages.filter((image) => image.type === category);

  useEffect(() => {
    if (lightboxIndex === null) return;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowLeft") {
        setLightboxIndex((current) =>
          current === null ? null : (current - 1 + selectedImages.length) % selectedImages.length,
        );
      }
      if (event.key === "ArrowRight") {
        setLightboxIndex((current) =>
          current === null ? null : (current + 1) % selectedImages.length,
        );
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, selectedImages.length]);

  return (
    <>
      <Tabs
        value={category}
        onValueChange={(value) => {
          setCategory(value as GalleryImage["type"]);
          setLightboxIndex(null);
        }}
      >
        <TabsList aria-label="Gallery categories">
          {collections.map((collection) => (
            <TabsTrigger key={collection.value} value={collection.value}>
              {collection.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {collections.map((collection) => {
          const images = galleryImages.filter((image) => image.type === collection.value);
          return (
            <TabsContent key={collection.value} value={collection.value}>
              <div className="grid auto-rows-[200px] gap-3 grid-cols-2 sm:auto-rows-[240px] sm:gap-4 lg:grid-cols-3">
                {images.map((image, index) => (
                  <button
                    key={`${image.src}-${image.alt}`}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="glass-card group relative overflow-hidden rounded-xl text-left transition-transform duration-300 hover:-translate-y-1 motion-reduce:hover:translate-y-0"
                    aria-label={`Open larger image: ${image.alt}`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={1200}
                      height={900}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-5 pb-5 pt-16 text-sm text-white">
                      {image.alt}
                    </span>
                  </button>
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {lightboxIndex !== null && selectedImages[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery lightbox"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setLightboxIndex(null);
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-5 top-5 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close lightbox"
          >
            <X />
          </button>
          <button
            type="button"
            onClick={() =>
              setLightboxIndex(
                (lightboxIndex - 1 + selectedImages.length) % selectedImages.length,
              )
            }
            className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4 sm:size-11"
            aria-label="Previous image"
          >
            <ChevronLeft />
          </button>
          <figure className="w-full max-w-5xl">
            <div className="relative aspect-[4/3] max-h-[78vh] w-full">
              <Image
                src={selectedImages[lightboxIndex].src}
                alt={selectedImages[lightboxIndex].alt}
                width={1200}
                height={900}
                className="h-full w-full object-contain"
                sizes="90vw"
              />
            </div>
            <figcaption className="mt-4 text-center text-sm text-muted-foreground">
              {selectedImages[lightboxIndex].alt}
            </figcaption>
          </figure>
          <button
            type="button"
            onClick={() => setLightboxIndex((lightboxIndex + 1) % selectedImages.length)}
            className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4 sm:size-11"
            aria-label="Next image"
          >
            <ChevronRight />
          </button>
        </div>
      )}
    </>
  );
}
