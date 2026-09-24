# Tank calculator — features

The tank calculator is a private, phone-first factory tool at `/tank`. Operators use it to name tanks, blend polyols, fill a tank to a target, record what was used, and track drums still on the shelf.

It is a client-only app inside the static site. It does not use API routes or a Node backend. Data is read and written in the browser: Supabase when the project keys are set, otherwise `localStorage` on this device.

It is `noindex`, omitted from the sitemap, and disallowed in `robots.txt`. It does not use the public site header, footer, or enquiry button.

---

## 1. Shell

Routes live under `src/app/tank/`. Screens live under `src/components/tank/`. Shared logic lives under `src/lib/tank/` and `src/lib/calculations/`.

**Header**

- Title links back to Tank home.
- Tank switcher shows the open tank.
- Help opens the guide.
- Skip link: “Skip to calculator”.

**Bottom navigation**

| Tab | Route | Role |
| --- | --- | --- |
| Tank | `/tank/` | Live tank: add, use, correct |
| Inventory | `/tank/inventory/` | Shelf stock |
| Activity | `/tank/log/` | Factory log |
| More | sheet | Blend, Fill, Planner, Chemicals, Composition, setup, guide, theme, sign out |

While Add, Record usage, or Correct readings is open, the bottom bar hides. Browser Back closes that panel.

**More sheet**

- Calculate: Blend, Fill, Planner.
- Manage: Chemicals, Composition.
- Help and preferences: Set up tank (only while the active tank has no opening balance), Guide, light/dark theme, Sign out (only when Supabase is configured).

**Old paths**

- `/tank/blend/setup/` redirects to `/tank/setup/`.
- `/tank/blend/planner/` redirects to `/tank/planner/`.

**Guide (`/tank/guide/`)**

Short tasks: add chemicals, record usage, correct readings, manage shelf stock, fresh blend, plan a target, read activity. Glossary: solid content is the percent that is not water; heel is the kilograms to leave in the tank.

---

## 2. Sign-in and storage

`src/lib/tank/client.ts`, `src/components/tank/auth-gate.tsx`, `src/lib/tank/repository.ts`.

**Supabase configured** (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

- Email and password sign-in for a shared factory account. No public sign-up screen.
- Show / hide password.
- Session persists and refreshes in the browser.
- Sign out is in More.
- Authenticated users can read and write every tank table (row-level security policies are “authenticated, all”).

**Supabase not configured**

- Sign-in is skipped.
- A banner says data stays on this device until keys are added.
- The same records are stored under `localStorage` key `victory-foam-tank-v1`.
- Older on-device data that had no tank list is migrated into a default tank.

The open tank id is always stored separately in `localStorage`, so a reload returns to the same tank.

---

## 3. Data the calculator keeps

Defined in `src/lib/tank/models.ts`. Cloud shape is in `supabase/migrations/`.

| Record | Shared or per tank | What it stores |
| --- | --- | --- |
| Chemical | Shared | Name, solid content %, on-hand quantity (or untracked), unit, optional OH value and viscosity, reorder warning, archive time |
| Stock movement | Shared (per chemical) | Receive, issue, waste, count, or pour. Signed quantity, balance after, note, optional link to a tank log row |
| Tank | Per tank | Name, capacity (kg, optional), heel (kg), archive time |
| Tank log entry | Per tank | Date, type, chemical, quantity, solid content, note, created time |
| Last calculation | Per tank | Last successful Blend inputs, or last successful Fill inputs |

**Log types**

| Type | Meaning |
| --- | --- |
| `opening_balance` | What was already in the tank |
| `add_batch` | A pour. This is the only log type that takes kilograms off the shelf |
| `consume_usage` | A job. Solid content stays the same. Shelf stock does not change |
| `adjust_composition` | A correction. The note stores the new per-chemical split |

**Stock movement types**

| Type | Shelf effect |
| --- | --- |
| `receive` | Adds kilograms |
| `issue` | Removes kilograms (sample or another machine) |
| `waste` | Removes kilograms (spill or scrap) |
| `count` | Replaces the balance with the count. The row stores the difference |
| `pour` | Removes kilograms when a pour is confirmed. If on-hand was never tracked (`null`), a pour leaves it untracked |

Chemicals and shelf stock are shared. Each tank has its own log, capacity, heel, and remembered Blend/Fill inputs.

---

## 4. Tanks

`src/components/tank/tank-switcher.tsx`, `opening-panel.tsx`, `setup-page.tsx`, `hub-page.tsx`.

**Create**

- Name is required and must be unique among active tanks (for example “Blend tank”).
- Tank size in kilograms is optional. When the opening screen has no saved size, the field starts at 8000 kg.
- Heel defaults to 0.

**Switcher**

- Switch the open tank.
- Rename it.
- Change size (must be greater than zero when set) and heel (cannot be negative).
- Archive the open tank after confirmation.

**First contents**

A tank with no log shows the opening panel:

- One or more lines.
- Pick an existing chemical, or type a new name and solid content (that creates the chemical).
- Kilograms per line.
- Optional tank size and heel.
- Live mix summary, then save writes the opening balance.

`/tank/setup/` is the older single-line wizard: opening kilograms, solid content %, optional chemical or unattributed, then capacity and heel. It stops once the tank already has a starting amount.

**Tank home, after setup**

- Name and last update time.
- Total kilograms, solid content %, room left to capacity.
- Kilograms still attributed to each chemical.
- Warning when the tank is below the heel.
- The total can be edited. Every chemical scales by the same factor and solid content stays the same. Review, then save one correction row.
- Actions: Add to the tank, Record usage, Correct tank readings, View composition.
- If there are no active chemicals, home asks the operator to add a polyol first.

---

## 5. Chemicals

`/tank/chemicals/` and `src/components/tank/chemicals-page.tsx`.

- Add, edit, and remove.
- Name required. Duplicate active names are rejected (trim and case-insensitive).
- Solid content % required, from 0 to 100.
- On-hand quantity optional. Empty means stock is not tracked. Unit defaults to kg.
- Optional OH value and viscosity.
- Remove deletes a chemical that has never appeared in a log.
- Remove archives a chemical that has been logged, so old rows still have a name.
- The list is paged (`TANK_LIST_PAGE_SIZE`).
- `?suggestPct=` opens Add with that solid content filled in and a name like `POP {percent}`. Blend, Fill, and Planner use this when no chemical on the shelf can reach the target.

Inventory can add a chemical without leaving the stock screen. The chemical picker used by Blend, Fill, Planner, Add, and the log only lists active (not archived) chemicals.

---

## 6. Inventory

`/tank/inventory/` and `src/lib/tank/stock.ts`.

Shelf only. Receive, issue, waste, and count do not change any tank.

**Status line**

| Label | When |
| --- | --- |
| Stock not tracked | On-hand is empty (`null`). This is not zero |
| Short | On-hand is below zero |
| Low | On-hand is below the reorder warning |
| (no warning) | On-hand is at or above the reorder point, or no reorder point is set |

**Per chemical**

- Receive, Issue, Waste, Set count.
- Waste asks for confirmation.
- A preview sentence shows the shelf balance before save.
- Optional note.
- History lists every movement, newest first, including pours into a tank and stock put back.
- Reorder warning (kg) is edited from History.

---

## 7. Add to the tank

`src/components/tank/add-panel.tsx`. Depends on Fill and blend solvers in `src/lib/calculations/`.

Plans a pour into the tank that already has contents.

**Inputs**

- One polyol, two polyols, or all three.
- Final tank quantity (kg) and target solid content %.
- Optional “use about” kilograms as a size hint.
- Chemical pickers. With three, the third quantity can be locked and the other two are solved around it.
- Tank size, if it is not already saved.

**Result**

Suggested kilograms per polyol so the tank lands on the target mass and percent. The operator can edit those kilograms in the report.

- **Download PDF** saves `tank-report.pdf` on this device. It does not change the tank or the shelf.
- **Confirm** writes `add_batch` rows and reduces shelf stock for each poured chemical.

Blocked when the pour would pass capacity, the chemistry cannot hit the target, or required numbers are missing.

---

## 8. Record usage

`src/components/tank/use-panel.tsx`. Depends on `consumeBreakdown` in `src/lib/calculations/tank-log.ts`.

Withdraws mass for a job.

- Enter a total in kilograms, or a rate times minutes. Both become the same withdrawal.
- Preview shows how many kilograms of each chemical, and any unattributed mass, will leave. The split follows the current mix.
- Solid content stays the same.
- Shelf stock does not change.
- The quantity cannot exceed what is available above the heel.

Activity can reopen this panel with the last job’s quantity (`/tank/?repeat={kg}`) on that job’s tank.

---

## 9. Correct readings

`src/components/tank/correction-panel.tsx`. Depends on `src/lib/calculations/composition-edit.ts`.

Edits the current picture. It does not pretend a new pour or a new job happened.

- Change the total. Every chemical scales together. Solid content stays put.
- Change one chemical’s kilograms.
- Change the overall solid content.

Review lists what will move. Save writes one `adjust_composition` row. Back discards the draft.

The same total-scaling correction is available by editing the kilograms figure on Tank home.

---

## 10. Composition

`/tank/composition/`. Read-only replay of the open tank’s log (`compositionRows` in `tank-log.ts`).

- Total kilograms.
- Stacked bar of each chemical’s share of tank mass.
- Each row: name, kilograms, share, and that chemical’s solid content.
- Unattributed mass when some of the tank is not tied to a named chemical.
- Reconciliation note when the tracked total and the tank total differ.
- Shares can miss 100% because each share is rounded.

Changes are made on Tank, through Correct tank readings.

---

## 11. Blend

`/tank/blend/`. Depends on `src/lib/calculations/blend.ts` and `alternatives.ts`.

A fresh batch. Kilograms already in the tank are not included.

**Steps**

1. First chemical.
2. A different second chemical.
3. Target solid content %.
4. Target batch quantity (kg).
5. Review solved kilograms.

Optional third chemical: lock its kilograms. The other two are solved so the batch still hits the target percent and quantity.

**Rules**

- Target quantity must be greater than 0.
- The result sits between the two solid contents. A target outside that range is infeasible.
- If both chemicals have the same solid content, any split works only when the target matches that percent. The solver then splits the batch in half and says any ratio works.
- With three chemicals, the locked third quantity must leave a positive remainder for the other two, and that remainder must still be solvable.

**Stock and fallbacks**

- Each line is checked against shelf stock. A short line is a warning. Untracked stock does not block the result.
- If the chosen pair cannot hit the target, other pairs from the active list can be applied in one tap.
- If no chemical is strong enough or weak enough, a hint names the missing solid content and can open Chemicals with that percent suggested.

**After a result**

- The last successful inputs are saved on this tank. “Continue last blend” restores them.
- **Record inventory use** subtracts the solved kilograms from the shelf (`issue`-style stock movement). It does not pour into the tank and does not write a tank log row.
- Switching tanks clears the in-progress blend.

Guide example: 0% and 45% to 22.5% of 100 kg is 50 kg of each.

---

## 12. Fill

`/tank/fill/`. Depends on `src/lib/calculations/fill.ts`.

Starts from what is already in the open tank and solves the pour that reaches a new total and a new solid content.

**Steps**

1. Target tank volume (kg) and target solid content %. These can arrive as `?volume=` and `?pct=`.
2. The app computes how many kilograms must be added and what solid content that addition must have.
3. It suggests a pair: the weakest chemical still above that required percent, and the strongest chemical still below it. The operator can pick others.
4. Optional third chemical with a locked quantity.
5. Review, edit the pour quantities, download a PDF, or confirm.

**Rules**

- Fill only goes up. A target volume at or below the current tank is refused. Diluting is a Planner job.
- A target above capacity is refused, with the room left to capacity.
- Required blend percent is `(targetVolume × target% − currentVolume × current%) / fillAmount`.
- Confirm writes `add_batch` rows and reduces shelf stock.
- The same alternative pairs and missing-chemical hint as Blend appear when the chosen chemicals cannot do it.
- The last successful fill inputs are saved per tank.

Fill needs a tank that already has an opening balance.

---

## 13. Planner

`/tank/planner/`. Depends on `previewAddBatch` and `reverseAdd` in `src/lib/calculations/planner.ts`.

A scratch pad. Nothing is saved. It always uses **one** chemical against a tank. Two or three drums belong on Fill or Blend.

**Reach target %**

Pick a chemical and a target solid content. The planner says how many kilograms to add. The operator can type a different starting tank quantity and percent, then reset to the real tank.

The target must lie between the tank’s current percent and that chemical’s percent. If it does not, the add is impossible (for example a 53% target when the strongest chemical is 45%).

**Preview addition**

Enter kilograms and a solid content percent. The planner shows the tank afterwards: new mass and new solid content. The preview is the weighted mix of what is already there plus what would be added.

**Also shown**

- Other chemicals that can hit the same target.
- Alternative chemicals or targets when the chosen one cannot.
- Missing-chemical hint, with a link to add that solid content.
- A separate size warning when the result would pass tank capacity. That warning is not the same as “the chemistry is impossible”.
- What is drawable now: mass above the heel.

---

## 14. Activity

`/tank/log/`.

Factory history across tanks, newest first, paged.

**Latest production**

- Newest usage: “Last job: used {kg}”, with Repeat.
- Otherwise the latest pour.
- Repeat switches to that tank and opens Record usage with the quantity filled in.

**Each row**

When, tank name, type (Already in the tank / Pour / Used / Correction), chemical or “Tank mix” / “Unattributed” / “Archived chemical”, quantity, solid content when relevant, note.

**Add or edit**

- Opening balance, pour, or usage. Corrections are created from Correct readings, not from this sheet.
- Date and time.
- One chemical, or several lines for an opening balance or a pour (`batch-lines-editor`).
- Usage as a quantity, or as rate times minutes, with a split preview.
- Note.
- Heel and capacity are checked before save.
- Delete asks for confirmation.

The live tank is the replay of its log. Editing or deleting a row changes what Tank home shows.

---

## 15. PDF report

`src/lib/tank/report-pdf.ts`.

Built in the browser as a one-page PDF. No server.

Contents:

- “Victory Foam tank report”
- Tank name and date
- Quantities are mass in kg
- Already in the tank: kilograms and solid content
- Each polyol poured, and the calculator’s suggestion when the operator changed it
- Tank afterwards: kilograms and solid content
- Capacity note when the pour is tight or over size

Download name: `tank-report.pdf`. Used from Add and from Fill. Download does not write a log row or a stock movement.

---

## 16. Calculation module

`src/lib/calculations/`. Pure functions. No network and no React. The screens call these and then the repository if the operator confirms.

| File | Job |
| --- | --- |
| `blend.ts` | Two-chemical blend, three-chemical blend with a locked third, with and without stock checks |
| `fill.ts` | Required addition for a fuller tank, suggested pair, two- and three-chemical fill |
| `planner.ts` | Preview “add this much at this %”, and reverse “how much of this chemical to hit a target %” |
| `alternatives.ts` | Other pairs, other single chemicals, and “you need a chemical at this %” |
| `tank-log.ts` | Replay the log into a snapshot: volume, solid %, remaining kilograms per chemical, unattributed mass, room to capacity, heel breach, usage split |
| `composition-edit.ts` | Scale the total, edit one chemical, edit solid content, compare drafts, encode the correction note |
| `stock.ts` | Per-line stock check and combined feasible / warning / infeasible status |
| `format.ts` | Kilograms, percents, and local date-time display (`en-ZA`, up to 2 decimal places) |
| `types.ts` | Log entry types, chemical ref, feasibility status |

**Snapshot**

Replaying a tank’s log produces:

- `volume` and `solidPct`
- `remainingByChemical`
- `unattributed`
- `trackedTotal`
- Running totals used by the activity list

Usage removes a proportional slice. A pour adds that chemical’s mass and moves the solid content by a weighted average. A correction replaces the split from the note.

**Feasibility**

- `feasible` — the mix works and stock covers it, or stock is untracked.
- `warning` — the mix works but a tracked chemical is short.
- `infeasible` — the percents cannot hit the target, the quantity is invalid, or the tank cannot accept the fill.

---

## 17. Repository module

`src/lib/tank/repository.ts` is the only writer. Screens do not talk to Supabase or `localStorage` directly, except auth and the active-tank id.

| Function | Effect |
| --- | --- |
| `loadFactory` | Chemicals, tanks, entries for the active tank, and which tank is open |
| `listChemicalsPage` / `listLogEntriesPage` | Paged lists |
| `latestFactoryProduction` | Newest pour or usage across tanks |
| `createChemical` / `updateChemical` / `archiveChemical` / `deleteChemical` | Chemical catalogue |
| `createTank` / `renameTank` / `removeTank` / `saveTankSettings` | Tanks |
| `insertLogEntry` / `insertLogEntries` / `updateLogEntry` / `deleteLogEntry` | Tank log. An `add_batch` also writes a pour movement when that chemical’s stock is tracked |
| `applyStockMovement` / `listStockMovements` / `setReorderKg` | Shelf |
| `getLastCalculation` / `saveLastCalculation` | Last Blend or Fill inputs for one tank |

Errors are `TankError` with a message the screen can show.

`src/lib/tank/context.tsx` loads the factory once, holds the open tank, and exposes `refresh` after every save.

`src/lib/tank/parse.ts` turns typed decimals into numbers. `src/lib/tank/pagination.ts` slices lists. `src/lib/tank/tanks.ts` resolves the active tank and migrates old on-device state.

---

## 18. What confirms, and what does not

| Action | Tank log | Shelf stock |
| --- | --- | --- |
| Confirm addition (Tank home or Fill) | Pour rows | Reduced |
| Confirm usage | Usage row | Unchanged |
| Save correction | One correction row | Unchanged |
| Save opening balance | Opening row | Unchanged |
| Record inventory use (Blend) | Unchanged | Reduced |
| Receive, issue, waste, count | Unchanged | Updated |
| Download PDF | Unchanged | Unchanged |
| Planner | Unchanged | Unchanged |
| Blend or Fill result before confirm | Unchanged | Unchanged |

---

## 19. Configuration

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cloud storage and sign-in. Both this and the anon key are required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser key for that project |

Without both keys, the calculator runs entirely on this device.
