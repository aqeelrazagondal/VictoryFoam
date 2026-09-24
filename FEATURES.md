# Victory Foam — application features

Victory Foam is two products in one static site.

1. A public brochure and display-only product catalogue for a Gauteng foam and mattress manufacturer.
2. A private, client-only factory calculator at `/tank` for blending polyols, filling tanks, and tracking shelf stock.

Production is a static export (`out/`). There is no Node server, API route, or Server Action. The public site posts enquiries to Formspree from the browser. The calculator talks to Supabase from the browser with the anon key, or stores data in this browser when Supabase is not configured.

Public origin defaults to `https://victoryfoam.co.za`.

---

## 1. Public brochure

Marketing chrome (header, footer, enquiry button) wraps only the public site. The tank calculator is outside that chrome.

### 1.1 Site chrome

**Header**

- Brand link to Home, with the company name.
- Primary navigation: Home, Products, About, Gallery, Contact.
- Current page is marked.
- Desktop links sit in the bar. On smaller screens they open in a slide-over menu.
- Phone number is a tracked call link.
- Light / dark theme toggle.
- Skip link: “Skip to content”.
- On the home page, while the desktop 3D mattress is in view, the header switches to a dark cinema style. After the visitor scrolls past it, the header becomes the normal sticky bar.

**Footer**

- Company description.
- Social links: LinkedIn, Facebook, Instagram (open in a new tab).
- Product category links into the catalogue anchors.
- Company links: Products, About, Gallery, Contact.
- Address, phone, email, and working hours (Monday–Friday, 07:30–16:30).
- Cookie settings control, shown only when a Google Analytics measurement ID is configured.

**Theme**

- Light, dark, and system themes via `next-themes`.
- The toggle switches between the resolved light and dark appearance.

**Motion and layout**

- Mobile-first layout with larger breakpoints for tablets and desktops.
- Section reveals use a short Framer Motion fade. Reduced-motion preferences skip those animations.
- One reveal per major section.
- Smooth scrolling (Lenis) exists as a wrapper. On the home page it is currently turned off so the scroll-driven 3D scene owns the scroll.

### 1.2 Home (`/`)

The home page is a long sales page with one visually hidden `h1`: “Victory Foam — Precision Foam Manufacturing”.

**Desktop mattress cinema**

- A scroll-driven 3D mattress built with React Three Fiber and GSAP ScrollTrigger.
- Layers, bottom to top: support core, transition layer, viscoelastic memory foam, comfort layer, knitted top cover.
- As the visitor scrolls, the mattress explodes, the camera moves, each layer is highlighted, and overlay copy plus specs appear.
- Chapter rail: Support, Transition, Memory, Cover, Complete, Enquire.
- Scroll progress indicator.
- The last beat is a call to action to request a quote.
- If the visitor prefers reduced motion, the scene stays assembled and does not animate.
- Heavy WebGL is skipped on devices that cannot run it well. The 3D bundle is loaded only in the browser (`ssr: false`).

**Mobile mattress hero**

- A lighter 3D hero for small screens.
- The visitor can select or hover a layer, explode the stack, and read that layer’s material and role.
- Falls back when WebGL is too heavy for the device.
- Quote call to action.

**Trust strip**

- ISO 9001 Certified
- CertiPUR Approved
- BS 7177 Fire Safety
- South African Manufacturing
- Sample Development
- Practical Response Times

**What we make**

Four category cards that jump to the matching filter on the products page:

| Category | What it covers |
| --- | --- |
| Mattresses | Layered foam constructions for comfort and support |
| Toppers & Pillows | Pressure-relieving sleep accessories |
| Industrial Foam | Acoustic, packaging, seating, and protection grades |
| Custom Cut Foam | Made-to-drawing components |

**Why choose us**

- Custom formulations (density, firmness, resilience, feel).
- In-house testing of samples and production batches.
- Quality evidence matched to the project.
- South African manufacturing and development support.

**How we work**

Numbered path: Quote → Design → Manufacture → Deliver.

**Certifications**

Cards for ISO 9001 (quality management), CertiPUR (foam safety), and BS 7177 (mattress fire safety).

**Closing call to action**

“Request a Quote” links to Contact and is tracked as a click.

**Sticky bar**

After the visitor scrolls past the hero, and before the footer is on screen, a bar offers a phone call and a quote link. It hides while the cookie banner is open.

### 1.3 Products (`/products/`)

Display-only catalogue. There are no prices and no purchase buttons.

**Filters**

Tabs: All products, Mattresses, Toppers & Pillows, Industrial Foam, Custom Cut Foam. Home category cards land on the matching tab via a URL hash.

**Product cards**

Each card shows the product image, name, short description, and a link to the product page.

**Catalogue (8 products)**

| Product | Category | Summary |
| --- | --- | --- |
| Contour Memory Foam Mattress | Mattresses | 3-layer medium construction for private-label bedding. CertiPUR, BS 7177. |
| Orthopaedic Support Mattress | Mattresses | Firmer high-resilience core for contract, care, hospitality, and retail. ISO 9001, BS 7177. |
| Cooling Gel Foam Topper | Toppers & Pillows | Ventilated gel memory foam, roll-pack compatible. CertiPUR. |
| Contour Foam Pillow | Toppers & Pillows | CNC-contoured pillow in configurable foam grades. CertiPUR. |
| High-Density Industrial Foam | Industrial Foam | Sheet, block, or cut part to a drawing. ISO 9001. |
| Acoustic Foam Panels | Industrial Foam | Open-cell panels in flat and profiled shapes, optional adhesive backing. ISO 9001. |
| Custom Cut Foam Components | Custom Cut Foam | CNC, contour, profile, and laminate from prototype to production. ISO 9001. |
| Protective Packaging Inserts | Custom Cut Foam | Product-specific cavities and multi-layer case inserts. ISO 9001. |

Every product record includes a short description, a full description, a search description, specifications, feature bullets, an image, and optional gallery images. Content lives in typed files under `src/data/`, not in a CMS.

### 1.4 Product detail (`/products/[slug]/`)

Each product is a static page generated at build time. Unknown slugs 404.

- Image gallery.
- Name, short description, specification table, feature list.
- Certification badges for the standards attached to that product.
- “Request a Quote” opens Contact with the subject prefilled as “Quote request for {product name}”.
- Longer “About this product” copy, with a note that published specs are a manufacturing starting point and are confirmed during enquiry.
- Up to three related products: same category first, then other categories.
- Product JSON-LD for search engines.

### 1.5 About (`/about/`)

- Company story: foam specified for how the finished product is used, for bedding, furniture, packaging, acoustic, healthcare, and engineered-product teams.
- Factory image.
- Values: Quality, Innovation, Sustainability, Customer Focus.
- Capabilities: custom foam formulations, prototyping, volume manufacturing, testing and certification.
- Page call to action toward Contact or the catalogue.

### 1.6 Gallery (`/gallery/`)

Nine images in three collections:

- Factory & Facilities
- Our Products
- Process

Tabs switch the collection. A thumbnail opens a lightbox. Keyboard: Escape closes, Left and Right move between images in the current collection. Focus moves to the close control when the lightbox opens.

### 1.7 Contact (`/contact/`)

**Quote form**

Required:

- Name
- Email (format checked)
- Message (at least 20 characters)

Optional:

- Phone (at least seven digits, spaces, brackets, plus, or hyphens)
- Subject (prefilled when the visitor arrived from a product page)
- Application / use case
- Product or material type
- Dimensions
- Approximate volume / quantity

A hidden honeypot field is included for Formspree spam filtering.

**What happens on submit**

- If `NEXT_PUBLIC_FORMSPREE_FORM_ID` is set, the form posts to Formspree. Success replaces the form with “Quote request sent” and records a `generate_lead` analytics event after cookie consent.
- If Formspree is not configured, submit opens a `mailto:` draft to `enquiries@victoryfoam.co.za` with the same fields in the body.
- Validation errors stay next to the fields. A failed Formspree post shows an error and keeps the entered data.

**Contact aside**

- Street address: 7684 Matlotlo Street, Lawley Ext 2, Ennerdale, 1830, Gauteng, South Africa.
- Phone: +27 73 799 3932.
- Email: enquiries@victoryfoam.co.za.
- Hours: Monday–Friday, 07:30–16:30.
- Embedded Google Map for that address.
- LocalBusiness JSON-LD, including geo coordinates for the Lawley / Ennerdale area.

### 1.8 Quick enquiry

A floating message button appears on public pages after the cookie banner is dismissed (or when analytics is not configured, so the banner never shows).

The sheet asks for name, email, and a message of at least 10 characters. It uses the same Formspree or mailto path as the full form, with the subject “Quick enquiry”. A successful Formspree submit is tracked as `generate_lead` with form id `quick_enquiry`.

### 1.9 Privacy, terms, and 404

**Privacy (`/privacy/`)**

Explains how enquiry data is handled under POPIA: responsible party, what is collected, Formspree, hosting, analytics cookies, and how to request access or correction. Last updated 4 September 2026.

**Terms (`/terms/`)**

Terms for using the brochure: it is a display-only catalogue, it does not publish prices or take orders, plus intellectual property, liability, and South African law. Last updated 4 September 2026.

**Not found**

Unknown URLs show a 404 page with links to Home and Products. The page is marked `noindex`. Static hosting uses `out/.htaccess` to send unknown paths to the 404 file.

### 1.10 Cookies and analytics

Analytics loads only when both of these are true:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` is a GA4 id (`G-…`).
- The visitor presses Accept on the cookie banner.

Decline stores the choice and does not load Google Analytics. The choice is kept in `localStorage` under `victoryfoam-cookie-consent`. “Cookie settings” in the footer clears that choice and shows the banner again.

Tracked events, only after consent:

- `cta_click` on quote buttons.
- Phone and email clicks.
- `generate_lead` on a successful Formspree submit (full quote form and quick enquiry).

Essential browsing works without analytics cookies.

### 1.11 Search and sharing

Every public page has its own title, description, canonical URL, Open Graph data, and Twitter card, built through one SEO helper.

Structured data:

- Organization
- LocalBusiness (contact page)
- Product (each product page)
- BreadcrumbList

`/sitemap.xml` lists Home, Products, About, Gallery, Contact, Privacy, Terms, and every product URL. It does not list `/tank`.

`/robots.txt` allows crawling and disallows `/tank`.

`llms.txt` is generated for AI crawlers.

---

## 2. Factory tank calculator (`/tank`)

This is an internal tool for the foam plant. It is `noindex`, omitted from the sitemap, blocked in `robots.txt`, and absent from public navigation.

It is a phone-first app: bottom navigation, large touch targets, and a narrow column that widens slightly on bigger screens. Light and dark themes are available. A skip link jumps to the calculator.

**Bottom navigation**

- Tank
- Inventory
- Activity
- More

**More sheet**

- Calculate: Blend, Fill, Planner
- Manage: Chemicals, Composition
- Help and preferences: Set up tank (only while the active tank has no opening balance), Guide, theme toggle, Sign out (only when Supabase is configured)

While a workflow panel is open (add, use, or correct), the bottom bar hides so the step flow owns the screen. The browser Back button closes that panel.

**Help**

The header Help link opens `/tank/guide/`, a short task guide: add chemicals, record usage, correct readings, manage shelf stock, fresh blend, plan a target, read activity, plus a glossary for solid content and heel.

### 2.1 Sign-in and storage

**With Supabase** (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

- Factory sign-in with email and password. There is no public sign-up screen. The operator uses a shared factory account.
- Show / hide password.
- Session stays in the browser and refreshes.
- Sign out is in the More sheet.
- Chemicals, tanks, the tank log, stock movements, and the last blend/fill calculation are stored in Supabase.

**Without Supabase**

- The sign-in screen is skipped.
- A banner says data is stored on this device until Supabase keys are added.
- The same records live in `localStorage`.

The active tank id is always remembered in `localStorage`, so reopening the app returns to the same tank.

### 2.2 Tanks

Chemicals and shelf stock are shared across tanks. Each tank has its own log, capacity, heel, and last calculator inputs.

**Create**

- Name (required), for example “Blend tank”.
- Optional tank size in kilograms. The opening flow defaults the size field to 8000 kg when none is set.
- More tanks can be added later from the tank switcher.

**Switcher**

The header shows the open tank. Opening it lets the operator:

- Switch tanks.
- Rename the open tank.
- Set or change tank size (kg) and heel (kg). Heel cannot be negative. Size, when set, must be greater than zero.
- Remove (archive) the open tank after confirmation.

**Opening the tank**

A new tank has no contents until an opening balance is saved. The first screen asks what is already in the tank:

- One or more lines: existing chemical, or a new chemical typed by name and solid content.
- Kilograms and solid content percent per line.
- Optional tank size and heel.
- A live summary of the mix before save.
- Saving writes an opening balance and the tank settings, then opens the tank home.

There is also a step-by-step setup page (`/tank/setup/`) for a single opening quantity, solid content, optional chemical (or unattributed), capacity, and heel. It refuses to run again once the tank already has a starting amount.

**Home summary**

After setup, Tank home shows:

- Tank name and when it was last updated.
- Total kilograms, solid content percent, and room left to capacity.
- A breakdown of kilograms still attributed to each chemical.
- A warning when the tank is below the heel.
- An editable total. Changing the total scales every chemical by the same factor and keeps solid content the same. The operator reviews the change, then saves one correction log row.

### 2.3 What the numbers mean

- **Solid content** is the percent of the mixture that is not water. It is not a liquid height.
- **Heel** is the kilograms the plant wants left in the tank. Available to use is the mass above that heel.
- **Capacity** is the tank size in kilograms. Pours that would pass it are blocked or warned.
- **Unattributed** mass is in the tank total but is not assigned to a named chemical. Composition shows a reconciliation note when tracked kilograms and the tank total do not match.
- **Shelf stock** is drums not yet poured. “Stock not tracked” is not the same as zero. A pour confirmed from Add or Fill reduces shelf stock. Recording usage from the tank does not.

### 2.4 Chemicals (`/tank/chemicals/`)

Shared list of polyols and other chemicals.

**Fields**

- Name (required, unique among active chemicals, case-insensitive).
- Solid content percent, from 0 to 100 (required).
- Quantity available and unit (default kg). Quantity can be empty, which means stock is not tracked.
- Optional details: OH value and viscosity.

**Actions**

- Add, edit, and remove.
- If the chemical has never appeared in a tank log, remove deletes it.
- If it has been used in a log, remove archives it so history still has a name.
- The list is paged.
- A link from an infeasible calculation can open Add with a suggested solid content already filled in (`?suggestPct=`), named like `POP {percent}`.

Inventory can also add a chemical without leaving the stock screen.

### 2.5 Inventory (`/tank/inventory/`)

Shelf stock only. None of these actions pour into a tank.

Each chemical shows on-hand kilograms (or “No kilograms on the shelf yet”), solid content, and a plain-language status:

- Not tracked
- In stock
- Low (on hand is below the reorder warning)
- Short (on hand is negative)

**Actions menu**

| Action | Effect |
| --- | --- |
| Receive | Drums arrived. Adds kilograms to the shelf. |
| Issue | Kilograms left the shelf for a sample or another machine. |
| Waste | Spill or scrap. Asks for confirmation. |
| Set count | Replaces the balance with the kilograms just counted. The movement stores the difference. |
| History | Every movement for that chemical, newest first, with a reorder warning the operator can set. |

A preview sentence shows what the shelf will read before the operator saves. Each movement can carry a note.

History labels include drums arrived, used somewhere else, spilled or thrown away, shelf counted, poured into the tank, and put back on the shelf.

### 2.6 Add to the tank

From Tank home, “Add to the tank” plans a pour into the tank that already has contents.

**Inputs**

- How many polyols: one, two, or all three.
- Final tank quantity (kg) and target solid content percent.
- Optional “use about” kilograms, used as a hint for the pour size.
- Chemical pickers. With three polyols, the third quantity can be locked and the other two are solved around it.
- Tank size, if it is not already saved.

**Result**

The calculator proposes kilograms of each polyol so the tank lands on the target mass and solid content. The operator can edit the suggested kilograms in the report before confirming.

- **Download PDF** writes `tank-report.pdf` on this device. It does not change the tank or the shelf. The report lists the tank name, date, what is already in the tank, each polyol poured (and the original suggestion if the operator changed it), and the tank afterwards, plus a capacity note when relevant.
- **Confirm addition** writes the pours to this tank’s log and reduces shelf stock for each chemical.

The pour is refused when it would overflow capacity, when the chemistry cannot hit the target, or when required numbers are missing.

### 2.7 Record usage

From Tank home, “Record usage” withdraws mass for a job.

Two ways to enter the same withdrawal:

- A total in kilograms.
- A rate times minutes.

Before confirm, a table shows how many kilograms of each chemical (and any unattributed mass) will leave, in proportion to what is in the tank. Solid content stays the same. Shelf stock does not change.

The quantity cannot exceed what is available above the heel. Going below the heel is called out.

**Repeat last job**

Activity can send the operator back to Tank with the last usage quantity filled in (`/tank/?repeat={kg}`), on the tank that job belonged to.

### 2.8 Correct tank readings

“Correct tank readings” edits the current picture without pretending a new pour or a new job happened.

The operator can change:

- The total kilograms (every chemical scales together; solid content stays put).
- One chemical’s kilograms.
- The overall solid content.

Review lists what will move. Save writes a single correction row. Back discards the draft.

The same total-scaling correction is also available by editing the kilograms figure on Tank home.

### 2.9 Composition (`/tank/composition/`)

A read-only view of what the log says is still in the tank.

- Total kilograms.
- A stacked bar of each chemical’s share.
- Each row: name, kilograms, share of tank mass, and that chemical’s solid content.
- Unattributed mass when some of the tank is not tied to a named chemical.
- A reconciliation note when the tracked total and the actual tank total differ.
- A note that displayed shares can miss 100% because each share is rounded.

Edits happen on Tank, through Correct tank readings.

### 2.10 Blend (`/tank/blend/`)

A fresh batch. The tank’s current contents are not part of the sum.

**Steps**

1. Pick the first chemical.
2. Pick a second, different chemical.
3. Enter the target solid content percent.
4. Enter the target batch quantity in kilograms.
5. Review the solved kilograms of each.

Optional third chemical: lock its kilograms, and the other two are solved so the whole batch still hits the target percent and quantity.

**Stock**

Each line is checked against shelf stock. A short line is marked. The batch can still be calculated when stock is untracked.

**When the pair cannot hit the target**

- Alternative pairs from the chemical list are offered and can be applied in one tap.
- If no chemical on the shelf is strong enough or weak enough, a hint says what solid content is missing and can open Chemicals with that percent suggested.

**After a result**

- The last successful inputs are saved for this tank, so “continue last blend” restores them.
- **Record inventory use** subtracts the solved kilograms from shelf stock. It does not pour into the tank and does not write a tank log row.
- Switching tanks clears the in-progress blend.

Example used in the guide: 0% and 45% blended to 22.5% of 100 kg is 50 kg of each.

### 2.11 Fill (`/tank/fill/`)

Fill starts from what is already in the tank and solves the pour that reaches a new total and a new solid content.

**Steps**

1. Target tank volume (kg) and target solid content percent. These can also arrive on the URL (`?volume=&pct=`).
2. The app computes how many kilograms must be added and what solid content that addition must have.
3. It suggests a pair: one chemical above that required percent and one below. The operator can pick different chemicals.
4. Optional third chemical with a locked quantity.
5. Review, edit the pour quantities, download a PDF, or confirm.

Confirm writes add-batch rows on this tank and reduces shelf stock. Overflow past capacity is blocked. The same alternative-pair and missing-chemical hints used by Blend appear here when the chosen chemicals cannot do it.

The last successful fill inputs are saved per tank.

Fill needs a tank that already has an opening balance. Blend does not use the tank contents, but it still belongs to the open tank for saving the last calculation.

### 2.12 Planner (`/tank/planner/`)

A scratch pad. Nothing is saved.

It always uses **one** chemical against the current tank. Two or three drums belong on Fill (tank already has something) or Blend (fresh batch).

**Two modes**

- **Reach target %.** Pick a chemical and a target solid content. The planner says how many kilograms to add. The operator can override the current tank kilograms and percent to try a different starting point, then reset to the real tank.
- **Preview addition.** Enter kilograms and a solid content percent. The planner shows the tank afterwards.

**Extra help**

- Other chemicals that can hit the same target (“hits”).
- Alternatives when the chosen chemical cannot get there (the target is outside the range between the tank and that chemical).
- A missing-chemical hint. Example from the guide: a 53% target when the strongest chemical is 45% cannot be reached.
- A separate size warning when the result would pass tank capacity. That warning is not the same as “the chemistry is impossible”.
- The planner also shows what is drawable now (mass above the heel).

### 2.13 Activity (`/tank/log/`)

The factory history, across tanks, newest first, paged.

**Latest production**

- If the newest production row is a usage, the card says “Last job: used {kg}”.
- Otherwise it is the latest pour.
- “Repeat” on a usage jumps to that tank’s Record usage screen with the quantity filled in.

**Row types**

| Log type | What the operator sees |
| --- | --- |
| Opening balance | Already in the tank |
| Add batch | Pour |
| Consume / usage | Used |
| Adjust composition | Correction |

Each row shows when it happened, which tank, the chemical (or “Tank mix” / “Unattributed” / “Archived chemical”), the quantity, solid content when relevant, and a note.

**Add or edit a row**

The sheet can record:

- Opening balance, add batch, or usage (corrections are created from the correct-readings flow).
- A date and time.
- One chemical, or several batch lines for an opening balance or a pour.
- Usage as a quantity, or as rate times minutes, with a preview of how the withdrawal splits across chemicals.
- A note.

Saves are checked against the heel and against capacity. Deleting a row asks for confirmation. Editing and deleting recompute what the tank contains, because the live tank is the replay of its log.

### 2.14 Calculator behaviour (shared rules)

- Targets and quantities accept normal decimal entry. Display uses South African grouping and up to two decimal places.
- A blend of two chemicals is a weighted mix: the result sits between the two solid contents. A target outside that range is infeasible.
- Fill first computes the blend that must be added so the existing tank plus the addition lands on the new total and percent, then splits that addition across the chosen chemicals.
- Three-chemical mode locks the third quantity and solves the other two.
- Usage removes a slice of the current mix. Each chemical drops by its share. Solid content does not change.
- Stock checks return feasible, warning, or infeasible. Untracked stock does not block a calculation.
- Feasibility badges and suggestion lists are reused on Blend, Fill, and Planner.

---

## 3. Company record shown on the site

| Item | Value |
| --- | --- |
| Name | Victory Foam |
| Tagline | Foam engineered for the way your product is used. |
| Phone | +27 73 799 3932 |
| Email | enquiries@victoryfoam.co.za |
| Address | 7684 Matlotlo Street, Lawley Ext 2, Ennerdale, 1830, Gauteng, South Africa |
| Hours | Monday–Friday, 07:30–16:30 |
| Social | LinkedIn, Facebook, Instagram |

The README treats this company record as realistic stand-in content to confirm before a public launch.

---

## 4. Configuration

| Variable | What it turns on |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, and structured data. Default `https://victoryfoam.co.za`. |
| `NEXT_PUBLIC_FORMSPREE_FORM_ID` | Contact form and quick enquiry post to Formspree. Without it, submit opens email. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Cookie banner and GA4, only after Accept. |
| `NEXT_PUBLIC_SUPABASE_URL` | Factory calculator cloud storage and sign-in. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser key for that Supabase project. Both keys are required. |

---

## 5. What the site deliberately does not do

- No online shop, cart, checkout, or public prices.
- No user accounts on the brochure.
- No server-rendered personalisation, cookies set by the app itself (analytics consent is `localStorage`), or request-time redirects.
- The tank calculator is not linked from the public header, footer, or sitemap.
- PDF download does not write to the tank. Only an explicit confirm does.
- Planner never writes a log row or a stock movement.
