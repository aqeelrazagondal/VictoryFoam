import { ArrowLeft, CheckCircle } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/product/product-gallery";
import { ProductGrid } from "@/components/product/product-grid";
import { SectionWrapper } from "@/components/sections/section-wrapper";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { certifications } from "@/data/certifications";
import { company } from "@/data/company";
import { getProduct, getRelatedProducts, products } from "@/data/products";
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
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = getProduct((await params).slug);
  if (!product) notFound();

  const gallery = product.gallery ?? [product.image];
  const productCertifications = certifications.filter((certification) =>
    product.certifications?.includes(certification.name),
  );
  const relatedProducts = getRelatedProducts(product.slug, 3);
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
            <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              {product.name}
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {product.shortDescription}
            </p>

            <div className="glass-card mt-8 overflow-x-auto overflow-hidden rounded-xl">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 font-semibold">Spec</th>
                    <th className="px-4 py-3 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {product.specs.map((spec) => (
                    <tr key={spec.label} className="odd:bg-card/30">
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
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-primary glow-sm">
                    <CheckCircle className="size-5" aria-hidden />
                  </span>
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

            <Button asChild size="lg" className="mt-8 h-auto px-8 py-3 glow-sm">
              <TrackedLink
                href={`/contact/?${enquiryQuery}`}
                event="cta_click"
                eventParams={{ cta_id: "product-enquire" }}
              >
                Enquire About This Product
              </TrackedLink>
            </Button>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper background="muted">
        <div className="max-w-3xl">
          <h2 className="font-heading text-3xl font-semibold">About this product</h2>
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
