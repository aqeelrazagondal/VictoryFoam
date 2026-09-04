import Image from "next/image";
import type { CSSProperties } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { Product } from "@/types";

export function ProductCard({
  product,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  return (
    <Link
      href={`/products/${product.slug}/`}
      className="stagger-fade group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ "--stagger-index": index } as CSSProperties}
    >
        <div className="glass-card h-full overflow-hidden rounded-xl">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
          <Image
            width={1200}
            height={900}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            src={product.image}
            alt={product.name}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>
        <div className="p-5">
          <h3 className="font-heading text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {product.shortDescription}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {product.specs.slice(0, 2).map((spec) => (
              <Badge key={spec.label} variant="secondary">
                {spec.value}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
