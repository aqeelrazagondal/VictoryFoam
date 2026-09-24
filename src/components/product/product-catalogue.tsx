"use client";

import { useEffect, useState } from "react";

import { ProductGrid } from "@/components/product/product-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categories } from "@/data/categories";
import { products } from "@/data/products";

function categoryFromHash() {
  if (typeof window === "undefined") return "all";
  const slug = window.location.hash.replace(/^#/, "");
  return categories.some((category) => category.slug === slug) ? slug : "all";
}

export function ProductCatalogue() {
  const [value, setValue] = useState("all");

  useEffect(() => {
    const apply = () => setValue(categoryFromHash());
    const frame = window.requestAnimationFrame(apply);
    window.addEventListener("hashchange", apply);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", apply);
    };
  }, []);

  function onValueChange(next: string) {
    setValue(next);
    const url = next === "all" ? "/products/" : `/products/#${next}`;
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList aria-label="Filter products by category">
        <TabsTrigger value="all">All products</TabsTrigger>
        {categories.map((category) => (
          <TabsTrigger id={category.slug} key={category.slug} value={category.slug}>
            {category.name}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="all">
        <ProductGrid products={products} />
      </TabsContent>
      {categories.map((category) => (
        <TabsContent key={category.slug} value={category.slug}>
          <ProductGrid products={products.filter((product) => product.category === category.slug)} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
