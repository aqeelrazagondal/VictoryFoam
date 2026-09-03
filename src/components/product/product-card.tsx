import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}/`}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            width={1200}
            height={900}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            src={product.image}
            alt={product.name}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>
        <CardContent>
          <h3 className="font-heading text-xl font-semibold transition-colors group-hover:text-primary">
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
        </CardContent>
      </Card>
    </Link>
  );
}
