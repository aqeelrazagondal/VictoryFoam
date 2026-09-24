# Test results

Last verified: 24 September 2026.

The brochure is a static Next.js export. The factory calculator at `/tank` is a client-only app.

## How to verify

```bash
pnpm lint
pnpm typecheck
pnpm typecheck:tests
pnpm test
pnpm build
pnpm e2e
```

Optional factory UI (needs Chrome):

```bash
pnpm test:ui
```

CI runs the same lint/typecheck/test/build/e2e set on pull requests (`.github/workflows/ci.yml`).

## What the suites cover

- Unit tests: blend/fill/planner math, tank helpers, enquiry validation, last-calculation payloads, wizard drafts.
- `pnpm e2e`: built `out/` HTML, SEO, a11y smoke, robots/sitemap, tank `noindex`, including `/tank/inventory/`.
- `pnpm test:ui`: Playwright against localStorage tank flows. If Supabase keys are set, it checks AuthGate instead and skips localStorage mutations unless `TANK_UI_EMAIL` and `TANK_UI_PASSWORD` are provided.

## Known limits

- Remote tank writes need the Supabase migrations `20260924120000_atomic_tank_log_writes.sql`, `20260924140000_tank_reliability_writes.sql`, and `20260924160000_factory_allowlist_occupancy.sql` applied on the project.
- After creating a factory login, insert its `user_id` into `factory_users`. Enable Auth captcha (Turnstile) in the dashboard and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Add `/tank/` to Auth redirect URLs.
- Retry a timed-out save only with the same write key.
- Playwright UI tests stay on the localStorage path unless a factory session is provided (`TANK_UI_EMAIL` / `TANK_UI_PASSWORD`).
- Home cinema JavaScript is lazy-loaded; reserved hero height avoids a first-paint collapse.
- Tank `trackEvent` calls (`tank_sign_in_fail`, `tank_save_fail`, `tank_pour_confirm`) only fire when analytics cookies were accepted.
