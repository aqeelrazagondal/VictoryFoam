<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Victory Foam project rules

## Static architecture
- This is a static brochure and display-only catalog, not a web application.
- Keep `output: "export"`; production deploys only the generated `out/` folder.
- Do not add databases, authentication, API routes, Server Actions, request-time redirects, cookies, headers, or server-only logic.
- Keep all content in typed files under `src/data/`. The contact form posts directly to Formspree.
- Every dynamic route must export `generateStaticParams`; do not use `force-dynamic` or request-time revalidation.

## TypeScript and components
- Keep TypeScript strict and do not introduce `any`.
- Prefer Server Components. Use `"use client"` only for hooks, browser APIs, or direct interaction.
- Keep base shadcn-style primitives in `src/components/ui/`; custom components belong in feature folders.

## Styling, content, and accessibility
- Use Tailwind CSS and the tokens in `src/app/globals.css`; do not add CSS modules or inline styles.
- Build mobile-first with `md:` and `lg:` enhancements.
- Use `next/image` with descriptive alt text and `next/font` for fonts.
- Every page needs one `h1`, ordered headings, semantic landmarks, visible focus, and keyboard-operable controls.
- Use Framer Motion only for restrained section-level reveals, respect reduced motion, and avoid page transitions, parallax, and bouncy content springs.
- Do not ship lorem ipsum, unfinished labels, broken links, public prices, or purchase actions.

## Animation
- One Framer Motion reveal per major section, not per card.
- Keep durations between 0.2s and 0.5s. Respect `prefers-reduced-motion`.
- Do not add page-route transitions, parallax, or bouncy content springs.

## SEO and performance
- Every page must have unique metadata, canonical URLs, Open Graph data, and Twitter card data through `src/lib/seo.ts`.
- Add JSON-LD through the shared schema builders and `JsonLd` component.
- Lazy-load the 3D viewer with `next/dynamic` and `ssr: false`; keep its assets and fallbacks local.
- Use `next/image` for images and `next/font` for fonts.
- Read the relevant local Next.js 16 documentation before changing framework APIs or conventions.
