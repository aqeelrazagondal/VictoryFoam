import type { Metadata } from "next";

import { ProductGrid } from "@/components/product/product-grid";
import { SectionHeader } from "@/components/sections/section-header";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { AnimateOnScroll } from "@/components/ui/animate-on-scroll";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { buildMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "Our Products",
    description:
      "Explore Victory Foam mattresses, toppers, pillows, industrial grades, and custom-cut components developed for repeat trade manufacturing.",
    path: "/products/",
  });
}

export default function ProductsPage() {
  return (
    <>
      <SectionWrapper className="bg-gradient-to-br from-primary/20 via-background to-background pb-10">
        <AnimateOnScroll>
          <SectionHeader
            as="h1"
            title="Our Products"
            subtitle="Explore eight product platforms across bedding, comfort, industrial, and custom-cut foam manufacturing."
          />
        </AnimateOnScroll>
      </SectionWrapper>
      <SectionWrapper background="muted" className="pt-10">
        <h2 className="sr-only">Product catalogue</h2>
        <Tabs defaultValue="all">
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
      </SectionWrapper>
    </>
  );
}
