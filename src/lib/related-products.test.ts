import assert from "node:assert/strict";
import { test } from "node:test";

import { getRelatedProducts, products } from "../data/products.ts";

test("returns an empty list for an unknown product slug", () => {
  assert.deepEqual(getRelatedProducts("not-a-product"), []);
});

test("prefers the same category, then fills from other categories to the limit", () => {
  const related = getRelatedProducts("memory-foam-mattress", 3);
  assert.equal(related.length, 3);
  assert.equal(related[0]?.slug, "orthopaedic-support-mattress");
  assert.ok(related.every((product) => product.slug !== "memory-foam-mattress"));
  assert.equal(new Set(related.map((product) => product.slug)).size, 3);
});

test("never includes the current product even when asking for every item", () => {
  const related = getRelatedProducts("custom-cut-foam", products.length);
  assert.equal(related.length, products.length - 1);
  assert.ok(related.every((product) => product.slug !== "custom-cut-foam"));
});
