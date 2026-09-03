import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/types";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-border p-6 text-muted-foreground">
        No products are published in this category yet.
      </p>
    );
  }

  return (
    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={`${product.category}-${product.slug}`}
          product={product}
        />
      ))}
    </div>
  );
}
