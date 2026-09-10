import fs from "fs";
import { execSync } from "child_process";

const failures = [];
let pass = 0;
let total = 0;

function check(id, desc, ok) {
  total++;
  if (ok) {
    pass++;
    console.log(`PASS ${id}: ${desc}`);
  } else {
    console.log(`FAIL ${id}: ${desc}`);
    failures.push(`${id}|${desc}`);
  }
}

function readPage(route) {
  const path = route === "/" ? "out/index.html" : `out${route}index.html`;
  return fs.readFileSync(path, "utf8");
}

const slugs = [
  "memory-foam-mattress",
  "orthopaedic-support-mattress",
  "cooling-gel-topper",
  "contour-foam-pillow",
  "high-density-industrial-foam",
  "custom-cut-foam",
  "acoustic-foam-panels",
  "protective-packaging-foam",
];
const routes = [
  "/",
  "/about/",
  "/products/",
  "/gallery/",
  "/contact/",
  "/privacy/",
  "/terms/",
  ...slugs.map((s) => `/products/${s}/`),
];
const home = readPage("/");
const contact = readPage("/contact/");
const labelCount = (contact.match(/<label/g) || []).length;
const inputCount = (contact.match(/<input|<textarea/g) || []).length;

check("1.1", "build output", fs.existsSync("out/index.html"));
check("1.4", "404.html", fs.existsSync("out/404.html"));
check("1.5", "sitemap", fs.readFileSync("out/sitemap.xml", "utf8").includes("<url>"));
check("1.6", "robots", fs.readFileSync("out/robots.txt", "utf8").includes("Sitemap:"));
check("2.1", "home h1", (home.match(/<h1/g) || []).length === 1);
check("2.1", "home size", home.length > 5000);
check("2.7", "404 content", /404|not found/i.test(fs.readFileSync("out/404.html", "utf8")));

for (const slug of slugs) {
  const html = readPage(`/products/${slug}/`);
  check("2.3", slug, (html.match(/<h1/g) || []).length === 1);
}

const allHtml = routes.map(readPage).join("\n");
for (const term of [
  "lorem ipsum",
  "coming soon",
  "form delivery is not configured",
  "NEXT_PUBLIC_FORMSPREE",
]) {
  check("2.8", `no ${term}`, !new RegExp(term, "i").test(allHtml));
}

const titles = new Set();
for (const route of routes) {
  const html = readPage(route);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (title) titles.add(title);
  check("3.1", `title ${route}`, Boolean(title));
  check("3.2", `desc ${route}`, /name="description"/.test(html));
  check("3.3", `og ${route}`, /og:title/.test(html) && /og:description/.test(html) && /og:image/.test(html));
  check("3.4", `canonical ${route}`, /rel="canonical"/.test(html));
  check("3.5", `h1 ${route}`, (html.match(/<h1/g) || []).length === 1);
}
check("3.1", "unique titles", titles.size === routes.length);
check("3.7a", "json-ld", (home.match(/application\/ld\+json/g) || []).length >= 1);
check("3.7b", "LocalBusiness", /LocalBusiness/.test(readPage("/contact/")));
check("3.7c", "Product schema", /"@type":"Product"/.test(readPage("/products/memory-foam-mattress/")));
check("3.7d", "contact geo", /GeoCoordinates/.test(readPage("/contact/")));
check("2.1", "home h1 copy", /Victory Foam — Precision Foam Manufacturing/.test(home));
check("3.8", "sitemap count", (fs.readFileSync("out/sitemap.xml", "utf8").match(/<url>/g) || []).length === 15);
check("3.8b", "sitemap lastmod", (fs.readFileSync("out/sitemap.xml", "utf8").match(/<lastmod>/g) || []).length === 15);
check("3.9", "favicons", fs.existsSync("out/favicon.ico") && fs.existsSync("out/apple-touch-icon.png"));
check("3.10", "llms.txt", fs.existsSync("out/llms.txt"));

for (const route of routes.slice(0, 5)) {
  const html = readPage(route);
  const imgs = html.match(/<img[^>]*>/g) || [];
  check("4.1", `alt ${route}`, imgs.every((img) => /alt=/.test(img)));
}
check("4.2", `labels ${labelCount} >= inputs ${inputCount}`, labelCount >= inputCount);
check("4.3", "skip link", /skip.*content/i.test(home));
check("4.4", "lang=en-ZA", /lang="en-ZA"/.test(home));
check("4.6", "viewport", /viewport/.test(home));
check("4.7", "reduced motion", execSync('grep -r prefers-reduced-motion src/ | wc -l').toString().trim() !== "0");

for (const link of ["about", "products", "gallery", "contact"]) {
  check("5.3", `nav /${link}/`, home.includes(`href="/${link}/"`));
}

check("6.1", "no source maps", execSync('find out -name "*.map" | wc -l').toString().trim() === "0");

const INITIAL_JS_LIMIT = 256 * 1024;
let overLimit = 0;
for (const tag of home.match(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g) || []) {
  const chunkPath = tag.match(/src="([^"]+)"/)[1];
  const size = fs.statSync(`out${chunkPath}`).size;
  if (size > INITIAL_JS_LIMIT) {
    overLimit++;
    console.log(`  initial over256KB: ${chunkPath} (${size})`);
  }
}
check("6.4", `initial load JS (${overLimit} over 256KB)`, overLimit === 0);
check("6.6", "no console", execSync('grep -rE "console\\.(log|warn|error)" src/ --include="*.ts" --include="*.tsx" | grep -v "// " | wc -l').toString().trim() === "0");
check("6.7", "3d dynamic", execSync('grep -r "dynamic" src/components/3d/ | wc -l').toString().trim() !== "0");

check("7.1", "no caps eyebrow", execSync('grep -riE "tracking-widest.*uppercase|uppercase.*tracking-widest" src/ --include="*.tsx" | wc -l').toString().trim() === "0");
check("7.2", "footer sentence case", !/>(PRODUCTS|COMPANY|CONTACT)</.test(home));
check("7.3", "dark default", fs.readFileSync("src/app/layout.tsx", "utf8").includes('defaultTheme="dark"'));
check("7.5", "glow utilities", (fs.readFileSync("src/app/globals.css", "utf8").match(/@utility glow-/g) || []).length >= 4);
check("7.6", "radial gradient", /radial-gradient/.test(fs.readFileSync("src/app/globals.css", "utf8")));
check("7.8", "CTA section", /ready to discuss/i.test(home));

check("8.1", "6+ products", (fs.readFileSync("src/data/products.ts", "utf8").match(/slug:/g) || []).length >= 6);
try {
  execSync("npm run typecheck", { stdio: "pipe" });
  check("8.4", "typescript", true);
} catch {
  check("8.4", "typescript", false);
}
try {
  execSync("npm run lint", { stdio: "pipe" });
  check("8.5", "eslint", true);
} catch {
  check("8.5", "eslint", false);
}

for (const route of routes.slice(0, 6)) {
  const html = readPage(route);
  check("9.1", `header ${route}`, /(<header|<nav)/.test(html));
  check("9.2", `footer ${route}`, /<footer/.test(html));
  check("9.5", `semantic ${route}`, /(<main|<section)/.test(html));
}
for (const route of ["/about/", "/products/", "/gallery/", "/contact/"]) {
  check("9.3", `breadcrumb ${route}`, /breadcrumb|Home/i.test(readPage(route)));
}
check("9.4", "theme toggle", /theme|sun|moon/i.test(home));

console.log(`\n=== ${pass}/${total} passed, ${total - pass} failed ===`);
if (failures.length === 0) {
  console.log("\n✅ ALL TESTS PASSED — PRODUCTION READY");
  console.log("Total passes required: 2");
  console.log(`Final test count: ${pass} passed / ${total} total`);
} else {
  console.log("\nFailed tests:");
  failures.forEach((failure) => console.log(`  ${failure}`));
}

process.exit(failures.length === 0 ? 0 : 1);
