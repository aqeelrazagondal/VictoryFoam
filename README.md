# Victory Foam

A portable static brochure and display-only product catalog for a foam and
mattress manufacturer.

Repository: [github.com/aqeelrazagondal/VictoryFoam](https://github.com/aqeelrazagondal/VictoryFoam)

## Stack

- Next.js 16 App Router with static export (`output: "export"`)
- TypeScript (strict)
- Tailwind CSS v4 + CSS design tokens
- next-themes (light / dark / system)
- Framer Motion and Lucide React
- React Three Fiber / Three.js for one client-side product showcase
- Code-owned content in `src/data`

## Develop

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm build` creates `out/`. That folder is the complete deployable website;
no Node.js or Next.js server is required in production.

## Contact form

Create a form at [Formspree](https://formspree.io/), then set its ID:

```bash
NEXT_PUBLIC_FORMSPREE_FORM_ID=your_form_id
```

The contact page posts to Formspree when the ID is set. When it is absent,
submit opens a `mailto:` draft to `enquiries@victoryfoam.co.za`, and the form
always offers that address as a direct-email option.

Set `NEXT_PUBLIC_SITE_URL` to the public origin before building so canonical
URLs, sitemap entries, and structured data use the production domain.

## Launch checklist

The repository currently keeps one realistic mock business record in
`src/data/company.ts`. Replace it before publishing.

### SEO

- Unique meta titles and descriptions on every page
- Canonical URLs
- Open Graph and Twitter Card tags
- Organization, LocalBusiness, Product, and BreadcrumbList JSON-LD
- After HTTPS is live, validate structured data in [Google Rich Results Test](https://search.google.com/test/rich-results)
- `out/sitemap.xml` present after `pnpm build`
- `out/robots.txt` present and allows crawling
- `out/llms.txt` present for AI crawlers
- One `h1` per page with nested `h2` / `h3`

### Performance

- Lighthouse Performance 90+ on canonical pages (re-check after real photography)
- All images use `next/image` with descriptive alt text
- 3D viewer lazy-loaded with `next/dynamic` and `ssr: false`
- No production source maps (`productionBrowserSourceMaps: false`)
- Fonts loaded with `next/font` and `display: "swap"`

### Content

- No lorem ipsum or unfinished labels
- Internal links resolve
- Contact form is always usable; Formspree when configured, otherwise mailto
- Product records in `src/data/products.ts` are complete
- Company address, phone, and email in `src/data/company.ts` are client-verified

### Accessibility

- Keyboard navigation
- WCAG AA contrast
- Visible focus indicators
- Headings, alt text, and form labels
- `prefers-reduced-motion` respected

### Browser testing

Operator matrix after deploy: Chrome, Firefox, Safari, Edge, iOS Safari,
Android Chrome at 375px, 768px, 1024px, and 1280px. Confirm dark and light
mode.

### Hosting

- Favicon and Apple touch icon included
- Custom domain connected
- SSL/HTTPS active
- Only the `out/` folder deployed
- 404 page for invalid URLs
- Default Open Graph image set

## Deployment

### Vercel

1. Import `https://github.com/aqeelrazagondal/VictoryFoam.git`.
2. Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_FORMSPREE_FORM_ID`.
3. Use the Next.js framework preset; `pnpm build` emits `out/`.
4. Connect the custom domain and confirm HTTPS.
5. Push to `main` and confirm auto-deploy.

### cPanel / shared hosting

1. Run `pnpm build` locally.
2. Upload the **contents** of `out/` to `public_html` via FTP.
3. `out/.htaccess` maps unknown URLs to `/404.html` and serves `index.html`
   in trailing-slash directories.
4. Test every page after upload.

### Other hosts

- **Netlify:** build command `pnpm build`, publish directory `out`.
- **GitHub Pages:** publish `out/`. For a project site below `/{repository}`,
  set `basePath` and `assetPrefix` before building.
- **S3 + CloudFront:** sync `out/`, default root object `index.html`,
  invalidate after updates.

Only deploy `out/`; source files, dependencies, and environment files are not
needed by the static host.

## Content the client must provide

Before the site can go live, the client needs to supply:

- Company name and logo (SVG preferred, PNG acceptable)
- Company tagline
- Product list: name, short description, full description, specifications,
  and photos (at least one, ideally 3–4)
- Product categories
- Company address, phone, email, and working hours
- About text: story, mission, and values
- Factory/facility photos
- Team photos and names/roles (optional)
- Certification logos
- Social profile URLs
- Brand guidelines (or keep the current defaults)
- Google Maps location
- Formspree account (free tier is enough)
- Production domain
