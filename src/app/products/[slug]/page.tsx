import { ArrowLeft, Check } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/product/product-gallery";
import { ProductGrid } from "@/components/product/product-grid";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { certifications } from "@/data/certifications";
import { company } from "@/data/company";
import { getProduct, products } from "@/data/products";
import { buildMetadata, buildProductSchema } from "@/lib/seo";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return {};

  return buildMetadata({
    title: product.name,
    description: `${product.shortDescription} Review its configurable construction, specifications, and manufacturing features.`,
    path: `/products/${product.slug}/`,
    image: product.image,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = getProduct((await params).slug);
  if (!product) notFound();

  const gallery = product.gallery ?? [product.image];
  const productCertifications = certifications.filter((certification) =>
    product.certifications?.includes(certification.name),
  );
  const relatedProducts = products
    .filter((candidate) => candidate.category === product.category && candidate.slug !== product.slug)
    .slice(0, 3);
  const enquiryQuery = new URLSearchParams({ product: product.name }).toString();

  return (
    <>
      <JsonLd data={buildProductSchema(product)} />
      <SectionWrapper className="pt-8">
        <Link
          href="/products/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Products
        </Link>
        <div className="grid gap-12 lg:grid-cols-[1.08fr_.92fr]">
          <ProductGallery images={gallery} productName={product.name} />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              {product.category.replaceAll("-", " ")}
            </p>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              {product.name}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {product.shortDescription}
            </p>

            <div className="mt-8 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Spec</th>
                    <th className="px-4 py-3 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {product.specs.map((spec) => (
                    <tr key={spec.label}>
                      <th scope="row" className="px-4 py-3 font-medium text-muted-foreground">
                        {spec.label}
                      </th>
                      <td className="px-4 py-3 font-medium">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="mt-8 font-heading text-xl font-semibold">Features</h2>
            <ul className="mt-4 grid gap-3">
              {product.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {productCertifications.length > 0 && (
              <div className="mt-8">
                <h2 className="font-heading text-xl font-semibold">Certifications</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {productCertifications.map((certification) => (
                    <Image
                      key={certification.name}
                      src={certification.image}
                      alt={`${certification.name} certification badge`}
                      width={130}
                      height={86}
                      className="rounded-lg border border-border bg-white p-2 grayscale"
                    />
                  ))}
                </div>
              </div>
            )}

            <Button asChild size="lg" className="mt-8">
              <Link href={`/contact/?${enquiryQuery}`}>Enquire About This Product</Link>
            </Button>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper background="muted">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            About this product
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold">{product.name}</h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {product.fullDescription}
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            Every specification is supplied by {company.name} as a display-only manufacturing
            starting point. Final materials and dimensions are confirmed during enquiry.
          </p>
        </div>
      </SectionWrapper>

      {relatedProducts.length > 0 && (
        <SectionWrapper>
          <h2 className="font-heading text-3xl font-semibold">Related Products</h2>
          <div className="mt-8">
            <ProductGrid products={relatedProducts} />
          </div>
        </SectionWrapper>
      )}
    </>
  );
}
