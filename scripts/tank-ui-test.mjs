/**
 * Interactive UI cases for /tank (positive + negative).
 * Uses system Chrome so CI does not need a Playwright browser download.
 *
 * Run: pnpm test:ui   (expects the app at TANK_UI_BASE_URL, default http://localhost:3000)
 */
import { chromium } from "playwright-core";

const BASE = (process.env.TANK_UI_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const LOCAL_KEY = "victory-foam-tank-v1";

const failures = [];
let pass = 0;
let total = 0;

function check(id, desc, ok, detail = "") {
  total += 1;
  if (ok) {
    pass += 1;
    console.log(`PASS ${id}: ${desc}`);
  } else {
    const suffix = detail ? ` (${detail})` : "";
    console.log(`FAIL ${id}: ${desc}${suffix}`);
    failures.push(`${id}|${desc}${suffix}`);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function chemical(id, name, pct, qty = null) {
  const now = nowIso();
  return {
    id,
    name,
    solidContentPct: pct,
    qtyAvailable: qty,
    unit: "kg",
    ohValue: null,
    viscosity: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function logEntry(id, type, quantity, extra = {}) {
  return {
    id,
    entryDate: extra.entryDate ?? nowIso().slice(0, 10),
    type,
    chemicalId: extra.chemicalId ?? null,
    quantity,
    solidContentPct: extra.solidContentPct ?? null,
    note: extra.note ?? null,
    createdAt: extra.createdAt ?? `${nowIso().slice(0, 19)}.${id.padStart(3, "0")}Z`,
  };
}

const TEST_TANK_ID = "tank-test";

function tankState({ chemicals = [], settings = null, entries = [], lastCalculation = {} } = {}) {
  const tank = {
    id: TEST_TANK_ID,
    name: "Tank",
    capacity: settings?.capacity ?? null,
    heel: settings?.heel ?? 0,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const memory = lastCalculation.blend || lastCalculation.fill ? { [TEST_TANK_ID]: lastCalculation } : {};
  return {
    chemicals,
    tanks: [tank],
    entries: entries.map((entry) => ({ ...entry, tankId: entry.tankId ?? TEST_TANK_ID })),
    movements: [],
    lastCalculation: memory,
  };
}

async function launchBrowser() {
  const executablePath =
    process.env.CHROME_PATH ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ executablePath, headless: true });
  }
}

async function openPage(browser, state) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "en-GB",
    timezoneId: "Europe/London",
    reducedMotion: "reduce",
  });
  if (state) {
    await context.addInitScript(
      ({ key, value }) => {
        // Seed once per browser context. Do not overwrite on later full navigations
        // after the factory has saved more rows in this session.
        if (!window.localStorage.getItem(key)) {
          window.localStorage.setItem(key, value);
        }
      },
      { key: LOCAL_KEY, value: JSON.stringify(state) },
    );
  }
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  return { context, page };
}

async function gotoTank(page, path = "/tank/") {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  if (!path.startsWith("/tank")) return;
  await page
    .locator("nav[aria-label='Calculator'][data-tank-state='ready'], nav[aria-label='Calculator'][data-tank-state='empty']")
    .waitFor({ timeout: 10_000 });
}

async function jumpToStep(page, index) {
  await page.getByRole("navigation", { name: "Completed steps" }).getByRole("button").nth(index).click();
}

function primaryButton(page, name) {
  return page.getByRole("button", { name, exact: true });
}

function pickerAfter(page, label) {
  return page.getByText(label, { exact: true }).locator("xpath=following-sibling::div[1]");
}

async function visibleText(page, pattern, timeout = 5000) {
  try {
    await page.getByText(pattern).first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function addChemicalViaUi(page, { name, pct, qty }) {
  await page.getByRole("button", { name: "Add chemical", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.locator("#chem-name").fill(name);
  await dialog.locator("#chem-pct").fill(String(pct));
  if (qty !== undefined && qty !== null) {
    await dialog.getByRole("button", { name: "Add more details" }).click();
    await dialog.locator("#chem-qty").fill(String(qty));
  }
  await dialog.getByRole("button", { name: "Save" }).click();
  await dialog.waitFor({ state: "hidden" });
}

async function run() {
  const browser = await launchBrowser();

  try {
    {
      const { context, page } = await openPage(browser);
      await gotoTank(page, "/tank/");
      await page.getByRole("heading", { name: "Name your tank" }).waitFor();
      check("ui.empty.1", "hub asks for a tank name before setup", await visibleText(page, "Name your tank"));
      const emptyNav = page.getByRole("navigation", { name: "Calculator" });
      check("ui.empty.2", "Fill stays under More until it is opened", (await emptyNav.getByRole("link", { name: "Fill" }).count()) === 0);
      check("ui.empty.3", "Log stays under More until it is opened", (await emptyNav.getByRole("link", { name: "Log" }).count()) === 0);
      check("ui.empty.inventory", "Inventory sits next to Tank", (await emptyNav.getByRole("link", { name: "Inventory" }).count()) === 1);
      await page.getByRole("button", { name: "More" }).click();
      check("ui.empty.4", "Set up tank is available under More", (await page.getByRole("link", { name: /Set up tank/i }).count()) > 0);
      check("ui.empty.5", "localStorage banner is shown without Supabase", await visibleText(page, "Data is stored on this device"));
      await context.close();
    }

    {
      const { context, page } = await openPage(browser);
      await gotoTank(page, "/tank/fill/");
      check("ui.gate.fill", "fill without a tank asks to set up", await visibleText(page, "Set up your tank first"));
      await gotoTank(page, "/tank/log/");
      check("ui.gate.log", "log without a tank asks to set up", await visibleText(page, "Set up your tank first"));
      await gotoTank(page, "/tank/composition/");
      check("ui.gate.composition", "composition without a tank asks to set up", await visibleText(page, "Set up your tank first"));
      await gotoTank(page, "/tank/planner/");
      check("ui.gate.planner", "planner without a tank asks to set up", await visibleText(page, "Set up your tank first"));
      await gotoTank(page, "/tank/blend/");
      check("ui.gate.blend", "blend with no chemicals asks to add one", await visibleText(page, "Add your first chemical"));
      await context.close();
    }

    {
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals: [],
          settings: { capacity: 8000, heel: 0 },
          entries: [logEntry("1", "opening_balance", 2462, { chemicalId: null, solidContentPct: 28 })],
        }),
      );
      await gotoTank(page, "/tank/");
      check("ui.chem.gate.home", "home asks for a polyol before filling", await visibleText(page, "Add a polyol first"));
      check(
        "ui.chem.gate.home-cta",
        "home links to the polyol list",
        (await page.getByRole("link", { name: "Add a polyol" }).count()) === 1,
      );
      check(
        "ui.chem.gate.no-form",
        "the pour form stays closed until a polyol exists",
        (await page.getByRole("button", { name: "One polyol" }).count()) === 0,
      );
      await gotoTank(page, "/tank/fill/");
      check("ui.chem.gate.fill", "fill asks for a polyol first", await visibleText(page, "Add a polyol first"));
      await gotoTank(page, "/tank/planner/");
      check("ui.chem.gate.planner", "planner asks for a polyol first", await visibleText(page, "Add a polyol first"));
      await gotoTank(page, "/tank/log/");
      await page.getByRole("button", { name: "Add entry" }).click();
      const logDialog = page.getByRole("dialog");
      await logDialog.waitFor();
      check("ui.chem.gate.log", "log add batch asks for a polyol first", await logDialog.getByText("Add a polyol first").isVisible());
      check(
        "ui.chem.gate.log-save",
        "log cannot save a pour until a polyol exists",
        (await logDialog.getByRole("button", { name: "Save entry" }).count()) === 0,
      );
      await logDialog.getByRole("link", { name: "Add a polyol" }).click();
      await page.waitForURL("**/tank/chemicals/**");
      check("ui.chem.gate.list", "the prompt opens the polyol list", await visibleText(page, "Add your first chemical"));
      await context.close();
    }

    {
      const { context, page } = await openPage(browser);
      await gotoTank(page, "/tank/guide/");
      check("ui.guide.1", "guide lists add chemicals", await visibleText(page, "Add chemicals"));
      check("ui.guide.2", "guide lists a fresh blend", await visibleText(page, "Fresh blend"));
      check("ui.guide.3", "guide explains the PDF download", await visibleText(page, "Download PDF"));
      check("ui.guide.4", "guide explains the local PDF", await visibleText(page, "tank-report.pdf"));
      await gotoTank(page, "/tank/blend/setup/");
      await page.waitForURL("**/tank/setup/");
      check("ui.redirect.setup", "mistaken /tank/blend/setup/ opens tank setup", /\/tank\/setup\/?$/.test(new URL(page.url()).pathname));
      check("ui.redirect.setup-heading", "redirected setup still has an h1", await visibleText(page, "Set up your tank"));
      await gotoTank(page, "/tank/blend/planner/");
      await page.waitForURL("**/tank/planner/");
      check("ui.redirect.planner", "mistaken /tank/blend/planner/ opens tank planner", /\/tank\/planner\/?$/.test(new URL(page.url()).pathname));
      await context.close();
    }

    {
      const { context, page } = await openPage(browser);
      await gotoTank(page, "/tank/chemicals/");
      await page.getByRole("button", { name: "Add chemical", exact: true }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      await dialog.getByRole("button", { name: "Save" }).click();
      check("ui.chem.neg.name", "empty chemical name is rejected", await dialog.getByText("Name is required.").isVisible());
      await dialog.locator("#chem-name").fill("Water");
      await dialog.locator("#chem-pct").fill("150");
      await dialog.getByRole("button", { name: "Save" }).click();
      check("ui.chem.neg.pct-high", "solid % above 100 is rejected", await dialog.getByText("Solid Content % must be between 0 and 100.").isVisible());
      await dialog.locator("#chem-pct").fill("-4");
      await dialog.getByRole("button", { name: "Save" }).click();
      check("ui.chem.neg.pct-low", "solid % below 0 is rejected", await dialog.getByText("Solid Content % must be between 0 and 100.").isVisible());
      await dialog.locator("#chem-pct").fill("0");
      await dialog.getByRole("button", { name: "Save" }).click();
      await dialog.waitFor({ state: "hidden" });
      check("ui.chem.pos.water", "0% water can be saved", await visibleText(page, "Water"));

      await addChemicalViaUi(page, { name: "POP 10", pct: 10 });
      await addChemicalViaUi(page, { name: "POP 40", pct: 40, qty: 10 });
      check(
        "ui.chem.pos.untracked",
        "chemical without qty says no kilograms on the shelf yet",
        await visibleText(page, /No kilograms on the shelf yet/i),
      );
      check("ui.chem.pos.tracked", "chemical with qty shows the stock amount", await page.getByText(/10 kg/).first().isVisible());

      await page.getByRole("button", { name: "Add chemical", exact: true }).first().click();
      await page.getByRole("dialog").waitFor();
      await page.getByRole("dialog").locator("#chem-name").fill("pop 10");
      await page.getByRole("dialog").locator("#chem-pct").fill("10");
      await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
      check(
        "ui.chem.neg.duplicate",
        "case-insensitive duplicate name is rejected",
        await page.getByRole("dialog").getByText("A chemical with this name already exists.").isVisible(),
      );
      await page.keyboard.press("Escape");

      const unusedRow = page.locator("li").filter({ hasText: "Water" });
      check("ui.chem.pos.delete-label", "unused chemical offers Delete, not Archive", await unusedRow.getByRole("button", { name: "Delete" }).isVisible());
      await unusedRow.getByRole("button", { name: "Delete" }).click();
      check("ui.chem.pos.delete-ask", "delete asks before removing a polyol", await unusedRow.getByText("Are you sure?").isVisible());
      check(
        "ui.chem.pos.delete-consequence",
        "delete explains the tank stays the same",
        await unusedRow.getByText(/kilograms and solid content in the tank stay the same/).isVisible(),
      );
      await unusedRow.getByRole("button", { name: "Yes, delete it" }).click();
      check("ui.chem.pos.delete", "unused chemical can be hard-deleted", !(await visibleText(page, "Water")));
      await context.close();
    }

    {
      const chemicals = [
        chemical("c10", "POP 10", 10),
        chemical("c40", "POP 40", 40, 10),
        chemical("c25", "POP 25", 25),
      ];
      const { context, page } = await openPage(browser, tankState({ chemicals }));
      await gotoTank(page, "/tank/blend/");
      await page.locator("ul.grid").getByRole("button", { name: /POP 10/ }).click();
      await page.getByRole("navigation", { name: "Completed steps" }).getByRole("button", { name: "POP 10" }).waitFor();
      await page.locator("ul.grid").getByRole("button", { name: /POP 40/ }).waitFor();
      await page.locator("ul.grid").getByRole("button", { name: /POP 10/ }).waitFor({ state: "hidden" });
      check(
        "ui.blend.neg.same",
        "second picker hides the already-chosen chemical",
        (await page.locator("ul.grid").getByRole("button", { name: /POP 10/ }).count()) === 0,
      );
      await page.locator("ul.grid").getByRole("button", { name: /POP 40/ }).click();
      await page.locator("#blend-pct").fill("50");
      await primaryButton(page, "Next").click();
      await page.locator("#blend-qty").fill("1000");
      await primaryButton(page, "See result").click();
      check("ui.blend.neg.range", "target outside the pair is Not reachable", await visibleText(page, "Not reachable"));
      check("ui.blend.neg.blank", "infeasible blend hides amounts", !(await visibleText(page, /Use POP 10/, 800)));
      check("ui.blend.pos.alts", "infeasible blend offers reachable combinations", await visibleText(page, "Try one of these instead"));
      await page.getByRole("button", { name: /Use only POP 40/ }).first().click();
      check("ui.blend.pos.alt-apply", "tapping a blend alternative leaves Not reachable", !(await visibleText(page, "Not reachable", 800)));
      check("ui.blend.pos.alt-amount", "applied blend alternative shows amounts", await visibleText(page, /1[\s\u00a0\u202f]?000 kg/));

      await jumpToStep(page, 2);
      await page.locator("#blend-pct").fill("52");
      await primaryButton(page, "Next").click();
      await primaryButton(page, "See result").click();
      check("ui.blend.pos.need-chem", "52% above strongest drum asks to add a chemical", await visibleText(page, "Add a stronger chemical"));
      check("ui.blend.neg.zero-mix", "one-drum clamp is not shown as 0 kg plus another chemical", !(await visibleText(page, /0 kg \+| \+ 0 kg/, 800)));
      await jumpToStep(page, 2);
      await page.locator("#blend-pct").fill("25");
      await primaryButton(page, "Next").click();
      await page.locator("#blend-qty").fill("0");
      check("ui.blend.neg.zero", "quantity 0 keeps See result disabled", await primaryButton(page, "See result").isDisabled());
      await page.locator("#blend-qty").fill("1000");
      await primaryButton(page, "See result").click();
      await page.getByText("500 kg").nth(1).waitFor({ state: "visible" });
      check("ui.blend.pos.split", "25% of 1000 kg from 10%+40% solves to 500 + 500", true);
      check("ui.blend.pos.amounts", "blend amounts are shown", true);
      check("ui.blend.pos.low-stock", "short stock is a warning, numbers still shown", await visibleText(page, "Low stock"));
      check("ui.blend.pos.stock-copy", "insufficient stock still names the available qty", await visibleText(page, /Only .+ kg in stock/));

      await jumpToStep(page, 2);
      await page.locator("#blend-pct").fill("33");
      await primaryButton(page, "Next").click();
      await page.locator("#blend-qty").fill("1000");
      await page.getByRole("button", { name: "Add a third chemical" }).click();
      await page.locator("ul.grid").getByRole("button", { name: /POP 25/ }).click();
      await page.locator("#blend-x3").fill("200");
      await primaryButton(page, "See result").click();
      check("ui.blend.pos.three", "optional third chemical shows a locked POP 25 line", await visibleText(page, /Use POP 25/));
      check("ui.blend.pos.three-kg", "locked third amount is 200 kg", await visibleText(page, /200 kg/));
      await context.close();
    }

    {
      const chemicals = [chemical("c10", "POP 10", 10), chemical("c40", "POP 40", 40)];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: 10_000, heel: 200 },
          entries: [
            logEntry("1", "opening_balance", 1500, { chemicalId: null, solidContentPct: 25 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/");
      const nav = page.getByRole("navigation", { name: "Calculator" });
      check("ui.nav.pos.activity", "Activity is a primary destination", (await nav.getByRole("link", { name: "Activity" }).count()) === 1);
      await page.getByRole("button", { name: "More" }).click();
      const moreSheet = page.getByRole("dialog");
      check("ui.nav.pos.fill", "Fill appears under More after Opening Balance", (await moreSheet.getByRole("link", { name: "Fill" }).count()) === 1);
      check("ui.nav.neg.setup", "Set up tank leaves the nav once the tank exists", (await moreSheet.getByRole("link", { name: /Set up tank/i }).count()) === 0);
      await moreSheet.getByRole("button", { name: "Close" }).last().click();
      const volumeField = page.locator("#tank-total-kg");
      const volumeShown =
        ((await volumeField.count()) > 0 && /1[\s\u00a0\u202f]?500/.test(await volumeField.inputValue())) ||
        (await visibleText(page, /1.?500 kg/));
      check("ui.hub.pos.volume", "hub shows opening volume", volumeShown);
      check("ui.hub.pos.add", "hub offers Add to the tank", (await page.getByRole("button", { name: "Add to the tank" }).count()) === 1);
      check("ui.hub.pos.use", "hub offers Record usage", (await page.getByRole("button", { name: "Record usage" }).count()) === 1);
      check("ui.hub.pos.pct", "hub shows opening solid %", await visibleText(page, "25%"));
      check(
        "ui.home.solid.readonly",
        "overall solid content is not an editable field",
        (await page.locator("input#tank-solid-pct").count()) === 0,
      );

      await gotoTank(page, "/tank/setup/");
      check("ui.setup.neg.repeat", "setup refuses a second Opening Balance", await visibleText(page, "Tank already set up"));

      await gotoTank(page, "/tank/composition/");
      check("ui.comp.pos.unattributed", "unattributed opening appears in composition", await visibleText(page, "Unattributed"));
      check("ui.comp.pos.recon", "unattributed tank shows reconciliation", await visibleText(page, "Reconciliation"));
      await context.close();
    }

    {
      const chemicals = [
        chemical("c0", "Water", 0),
        chemical("c10", "POP 10", 10),
        chemical("c45", "POP 45", 45),
      ];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: null, heel: 0 },
          entries: [
            logEntry("1", "opening_balance", 4000, { chemicalId: "c10", solidContentPct: 33 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/fill/");
      await page.locator("#fill-vol").fill("3000");
      await page.locator("#fill-pct").fill("20");
      await primaryButton(page, "Next").click();
      check("ui.fill.neg.down", "target volume below current is infeasible", await visibleText(page, /fill up, not down/i));
      check("ui.fill.neg.planner", "fill-down offers Tank Planner, not a fake mix", await visibleText(page, "Open Tank Planner"));

      await page.getByRole("button", { name: "Target", exact: true }).click();
      await page.locator("#fill-vol").fill("8000");
      await primaryButton(page, "Next").click();
      check("ui.fill.pos.required", "required blend % is for the added portion (7%)", await visibleText(page, /7%/));
      check("ui.fill.pos.suggest-above", "suggestion picks closest above required blend", await visibleText(page, /POP 10/));
      check("ui.fill.pos.suggest-below", "suggestion picks closest below required blend", await visibleText(page, /Water/));
      await pickerAfter(page, "First chemical").getByRole("button", { name: /POP 10/ }).click();
      await pickerAfter(page, "Second chemical").getByRole("button", { name: /Water/ }).click();
      await page.getByRole("button", { name: "Review addition" }).click();
      check("ui.fill.pos.result", "reachable fill pair is achievable", await visibleText(page, "Target achievable"));
      check("ui.fill.pos.log-cta", "Confirm addition is offered and not auto-written", await visibleText(page, "Confirm addition"));
      await page.getByRole("button", { name: "Confirm addition" }).click();
      await page.waitForURL("**/tank/log/**");
      await page.getByText("Pour").first().waitFor({ state: "visible" });
      check(
        "ui.fill.pos.logged",
        "confirming Log this writes two pour rows",
        (await page.getByText("Pour").count()) >= 2,
      );
      await context.close();
    }

    {
      const chemicals = [
        chemical("c0", "Conventional", 0),
        chemical("c25", "POP 25", 25),
        chemical("c45", "POP 45", 45),
      ];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: 8000, heel: 0 },
          entries: [logEntry("1", "opening_balance", 1500, { chemicalId: "c25", solidContentPct: 25 })],
        }),
      );
      await gotoTank(page, "/tank/fill/");
      await page.locator("#fill-vol").fill("8000");
      await page.locator("#fill-pct").fill("33");
      await primaryButton(page, "Next").click();
      await page.getByRole("button", { name: "Add a third chemical" }).click();
      await page
        .getByText("Optional. Lock how much", { exact: false })
        .locator("xpath=following-sibling::div[1]")
        .getByRole("button", { name: /Conventional 0%/ })
        .click();
      await page.locator("#fill-x3").fill("1000");
      await pickerAfter(page, "First chemical").getByRole("button", { name: /POP 45/ }).click();
      await pickerAfter(page, "Second chemical").getByRole("button", { name: /POP 25/ }).click();
      await page.getByRole("button", { name: "Review addition" }).click();
      check("ui.fill.pos.three", "three-chemical fill is achievable", await visibleText(page, "Target achievable"));
      check(
        "ui.fill.pos.three-line",
        "locked third fill line is shown",
        (await visibleText(page, "Conventional")) &&
          (await visibleText(page, /Calculator suggested 1[\s\u00a0\u202f]?000 kg/)),
      );
      check("ui.fill.pos.three-log", "three-chemical fill offers confirm", await visibleText(page, "Confirm addition"));
      await context.close();
    }

    {
      const chemicals = [
        chemical("c25", "POP 25", 25),
        chemical("c45", "POP 45", 45),
        chemical("c0", "Conventional", 0),
      ];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: 8000, heel: 890 },
          entries: [
            logEntry("1", "opening_balance", 1500, { chemicalId: "c25", solidContentPct: 25 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/fill/");
      await page.locator("#fill-vol").fill("8000");
      await page.locator("#fill-pct").fill("33");
      await primaryButton(page, "Next").click();
      await page.getByRole("button", { name: "Review addition" }).waitFor();
      check("ui.umer.pos.pair", "33% fill includes POP 45 as the strong drum", await visibleText(page, "POP 45"));
      check("ui.umer.pos.other-pair", "45% + Conventional is offered as another pair", await visibleText(page, "Conventional"));
      const umerPair = page.getByRole("button", { name: /Conventional/ }).first();
      if (await umerPair.count()) {
        await umerPair.click();
      } else {
        await page.locator("ul.grid").getByRole("button", { name: /POP 45/ }).click();
        await page.locator("ul.grid").getByRole("button", { name: /Conventional/ }).click();
        await page.getByRole("button", { name: "Review addition" }).click();
      }
      if ((await page.getByRole("button", { name: "Review addition" }).count()) > 0) {
        await page.getByRole("button", { name: "Review addition" }).click();
      }
      check("ui.umer.pos.amounts", "33% fill is about 5 033 kg + 1 467 kg", await visibleText(page, /5[\s\u00a0\u202f]?033/) && await visibleText(page, /1[\s\u00a0\u202f]?466|1[\s\u00a0\u202f]?467/));
      await page.getByRole("button", { name: "Confirm addition" }).click();
      await page.waitForURL("**/tank/log/**");
      await page.getByRole("button", { name: "Add entry" }).click();
      const umerLog = page.getByRole("dialog");
      await umerLog.waitFor();
      await umerLog.getByText("Consume / Usage").click();
      await umerLog.locator("#log-rate").fill("80");
      await umerLog.locator("#log-minutes").fill("50");
      check("ui.umer.pos.rate", "80 kg/min × 50 min fills 4 000 kg", (await umerLog.locator("#log-qty").inputValue()) === "4000");
      check("ui.umer.pos.used25", "consume uses 750 kg of POP 25", await umerLog.getByText(/750/).count() >= 1);
      check("ui.umer.pos.still33", "leftover tank is still 33%", await umerLog.getByText(/still 33%/).isVisible());
      await page.keyboard.press("Escape");
      await context.close();
    }

    {
      const chemicals = [
        chemical("c0", "Conventional", 0),
        chemical("c25", "POP 25", 25),
        chemical("c45", "POP 45", 45),
      ];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: 8000, heel: 0 },
          entries: [
            logEntry("1", "opening_balance", 700, {
              chemicalId: "c0",
              solidContentPct: 0,
              entryDate: "2026-09-23",
              createdAt: "2026-09-23T14:05:00.000Z",
            }),
            logEntry("2", "opening_balance", 220, { chemicalId: "c25", solidContentPct: 25 }),
            logEntry("3", "opening_balance", 1150, { chemicalId: "c45", solidContentPct: 45 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/log/");
      check("ui.log.pos.room", "log shows room left under capacity", await visibleText(page, /room for .+ kg more/i));
      check(
        "ui.log.pos.when",
        "log shows the date and time on each entry",
        await visibleText(page, /23 September 2026 · \d{2}:\d{2}/),
      );
      await page.getByRole("button", { name: "Add entry" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      check("ui.log.pos.multi", "add batch starts with chemical lines", await dialog.getByText("Chemical 1").isVisible());
      await dialog.locator("ul.grid").getByRole("button", { name: /POP 25/ }).click();
      await dialog.locator("#line-1-kg").fill("4200");
      await dialog.getByRole("button", { name: "Add another chemical" }).click();
      await dialog.getByText("Chemical 2").waitFor();
      const secondLine = dialog.locator("li").filter({ hasText: "Chemical 2" });
      await secondLine.getByRole("button", { name: /POP 45/ }).click();
      await secondLine.locator("[id$='-kg']").fill("1050");
      check("ui.log.pos.multi-total", "multi-chemical entry shows total add", await dialog.getByText(/adds .+ kg/).isVisible());
      await secondLine.locator("[id$='-kg']").fill("7000");
      check("ui.log.neg.overcap", "multi-chemical over capacity is refused in the form", await dialog.getByText(/more than the room left/i).isVisible());
      await secondLine.locator("[id$='-kg']").fill("1050");
      await dialog.getByRole("button", { name: "Save entry" }).click();
      await dialog.waitFor({ state: "hidden" });
      check("ui.log.pos.multi-saved", "multi-chemical add writes two Pour rows", (await page.getByText("Pour").count()) >= 2);
      check("ui.log.pos.multi-vol", "tank volume becomes 7 320 kg", await visibleText(page, /7.?320/));
      await context.close();
    }

    {
      const chemicals = [chemical("c10", "POP 10", 10), chemical("c40", "POP 40", 40)];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: null, heel: 0 },
          entries: [
            logEntry("1", "opening_balance", 4000, { chemicalId: "c10", solidContentPct: 33 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/fill/");
      await page.locator("#fill-vol").fill("8000");
      await page.locator("#fill-pct").fill("20");
      await primaryButton(page, "Next").click();
      check("ui.fill.neg.pair", "required 7% with no below chemical is infeasible", await visibleText(page, "Not reachable"));
      check("ui.fill.pos.alts", "fill offers a reachable combination", await visibleText(page, "Try one of these instead"));
      await page.getByRole("heading", { name: "Try one of these instead" }).locator("..").getByRole("button").first().click();
      check("ui.fill.pos.alt-apply", "tapping a fill alternative is achievable", await visibleText(page, "Target achievable"));
      check("ui.fill.pos.alt-no-autolog", "applying a fill alternative does not write the log", await visibleText(page, "Confirm addition"));
      check("ui.fill.pos.alt-stays", "fill alternative stays on Fill", page.url().includes("/tank/fill"));
      await context.close();
    }

    {
      const chemicals = [chemical("c25", "POP 25", 25), chemical("c40", "POP 40", 40)];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: null, heel: 200 },
          entries: [
            logEntry("1", "opening_balance", 1500, { chemicalId: "c25", solidContentPct: 25 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/log/");
      await page.getByRole("button", { name: "Add entry" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      await dialog.getByText("Consume / Usage").click();
      await dialog.locator("#log-qty").fill("2000");
      await dialog.getByRole("button", { name: "Save entry" }).click();
      check("ui.log.neg.overdraw", "consume above volume is hard-blocked", await dialog.getByText("Cannot consume more than the current tank volume.").isVisible());
      await dialog.locator("#log-qty").fill("1400");
      check("ui.log.pos.consume-table", "consume preview names each polyol", await dialog.getByText("Consumption of each polyol").isVisible());
      check("ui.log.pos.still-pct", "consume preview keeps the tank %", await dialog.getByText(/still 25%/).isVisible());
      await dialog.getByRole("button", { name: "Save entry" }).click();
      await dialog.waitFor({ state: "hidden" });
      check("ui.log.pos.heel", "consume below heel still saves and warns", await visibleText(page, /below the heel/i));

      await gotoTank(page, "/tank/chemicals/");
      const listed = page.locator("li").filter({ hasText: "POP 25" });
      check("ui.chem.pos.archive-label", "chemical in the log offers Archive", await listed.getByRole("button", { name: "Archive" }).isVisible());
      await listed.getByRole("button", { name: "Archive" }).click();
      check(
        "ui.chem.pos.archive-ask",
        "archive explains the log stays",
        await listed.getByText(/Old log rows stay/).isVisible(),
      );
      await listed.getByRole("button", { name: "Yes, archive it" }).click();
      check("ui.chem.pos.archive", "logged chemical is archived instead of deleted", !(await listed.isVisible().catch(() => false)));
      await context.close();
    }

    {
      const chemicals = [chemical("c40", "POP 40", 40), chemical("c0", "Water", 0)];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: null, heel: 0 },
          entries: [
            logEntry("1", "opening_balance", 1000, { chemicalId: "c40", solidContentPct: 20 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/planner/");
      const logCountCopy = await page.getByText(/Log entries:/).textContent();
      await page.getByRole("button", { name: "Preview addition" }).click();
      await page.locator("#preview-qty").fill("1000");
      await page.locator("#preview-pct").fill("40");
      check("ui.planner.pos.preview-vol", "preview shows resulting volume", await visibleText(page, /2.?000 kg/));
      check("ui.planner.pos.preview-only", "preview is labelled as not writing the log", await visibleText(page, "This does not write to the tank log."));
      const logCountAfter = await page.getByText(/Log entries:/).textContent();
      check("ui.planner.pos.no-write", "preview leaves the log count unchanged", logCountCopy === logCountAfter);

      await page.getByRole("button", { name: "Reach target %" }).click();
      check("ui.planner.pos.reverse-hint", "reverse mode asks for a target first", await visibleText(page, "Enter a target % to continue."));
      check("ui.planner.pos.last-tank", "planner shows the last recorded tank quantity", await visibleText(page, /Last recorded tank quantity/));
      await page.locator("#rev-pct").fill("10");
      await page.locator("#rev-pct").blur();
      check(
        "ui.planner.pos.hits",
        "target 10% lists Water as a reachable add",
        await visibleText(page, "Add one of these to reach that target", 8000),
      );
      await page.locator("#rev-pct").fill("53");
      check("ui.planner.pos.need-chem", "53% with max 40% asks for a stronger drum", await visibleText(page, "Add a stronger chemical"));
      await page.locator("#rev-pct").fill("10");
      await page.locator("ul.grid").getByRole("button", { name: /POP 40/ }).click();
      check("ui.planner.neg.reverse", "unreachable reverse target hides the amount", await visibleText(page, "Not reachable"));
      check("ui.planner.pos.alts", "planner offers reachable alternatives", await visibleText(page, "Try one of these instead"));
      await page.getByRole("button", { name: /Set target to 20%/ }).click();
      check("ui.planner.pos.alt-apply", "tapping a planner alternative is achievable", await visibleText(page, "Target achievable"));
      await page.locator("#rev-pct").fill("30");
      check("ui.planner.pos.reverse", "reachable reverse raise shows how much to add", await visibleText(page, "Target achievable"));
      check(
        "ui.planner.pos.reverse-qty",
        "reverse 20% → 30% with 40% chemical is 1000 kg",
        await visibleText(page, /1[\s\u00a0\u202f]?000 kg/),
      );
      await context.close();
    }

    {
      const { context, page } = await openPage(browser, tankState({ chemicals: [chemical("only", "Only one", 25)] }));
      await gotoTank(page, "/tank/blend/");
      await page.locator("ul.grid").getByRole("button", { name: /Only one/ }).click();
      check("ui.blend.neg.one-chemical", "cannot pick the same chemical twice when only one exists", await visibleText(page, "No chemicals match that search."));
      await context.close();
    }

    {
      const chemicals = [
        chemical("c0", "Conventional polyol", 0),
        chemical("c25", "Polymer polyol 25", 25),
      ];
      const { context, page } = await openPage(
        browser,
        tankState({ chemicals, settings: null, entries: [] }),
      );
      await gotoTank(page, "/tank/");
      check(
        "ui.opening.pos.pick",
        "opening offers chemicals that already exist",
        await visibleText(page, "Conventional polyol"),
      );
      check(
        "ui.opening.neg.no-force-name",
        "an existing chemical does not force a typed name",
        (await page.locator("#line-1-name").count()) === 0,
      );
      check(
        "ui.opening.neg.details-wait",
        "kg stays hidden until a chemical is chosen",
        (await page.locator("#line-1-kg").count()) === 0,
      );
      check(
        "ui.opening.neg.no-number",
        "the form does not number the rows as Polyol 1",
        (await page.getByText("Polyol 1").count()) === 0,
      );
      await page.locator("ul.grid").getByRole("button", { name: /Conventional polyol/ }).click();
      const pct = page.locator("#line-1-pct");
      check(
        "ui.opening.pos.locked-pct",
        "a picked polyol keeps its solid content",
        (await pct.inputValue()) === "0" && (await pct.isDisabled()),
      );
      await page.locator("#line-1-kg").fill("700");
      check(
        "ui.opening.pos.picked-kg",
        "a picked polyol counts the kg already in the tank",
        await visibleText(page, /700 kg/),
      );
      await page.getByRole("button", { name: "Type a chemical, such as Conventional" }).click();
      check(
        "ui.opening.pos.type-new",
        "a polyol that is not in the list can still be typed",
        await page.locator("#line-1-name").isVisible(),
      );
      await context.close();
    }

    {
      const { context, page } = await openPage(browser, tankState({}));
      await gotoTank(page, "/tank/");
      check(
        "ui.opening.neg.details-before-name",
        "a new chemical asks for the name before the kg",
        (await page.locator("#line-1-kg").count()) === 0,
      );
      await page.locator("#line-1-name").fill("Conventional polyol");
      await page.locator("#line-1-pct").fill("0");
      await page.locator("#line-1-kg").fill("9 000");
      await page.locator("#tank-capacity").fill("8 000");
      check(
        "ui.opening.neg.uk-overcap",
        "UK-grouped kg above the tank size is refused",
        await visibleText(page, /The tank holds/),
      );
      await page.getByRole("button", { name: "Save what's in the tank" }).click();
      check(
        "ui.opening.neg.uk-stays",
        "an over-capacity opening is not saved",
        await visibleText(page, "What's in the tank"),
      );
      await context.close();
    }

    {
      const chemicals = [
        chemical("c0", "Conventional polyol", 0),
        chemical("c25", "Polymer polyol 25", 25),
        chemical("c45", "Polymer polyol 45", 45),
      ];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: 8000, heel: 0 },
          entries: [
            logEntry("1", "opening_balance", 700, { chemicalId: "c0", solidContentPct: 0 }),
            logEntry("2", "opening_balance", 220, { chemicalId: "c25", solidContentPct: 25 }),
            logEntry("3", "opening_balance", 1150, { chemicalId: "c45", solidContentPct: 45 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/");
      await page.getByRole("button", { name: "Add to the tank" }).click();
      await page.locator("#target-kg").fill("9 000");
      await page.locator("#target-pct").fill("28.7");
      await primaryButton(page, "Next").click();
      const pickers = page.locator("ul.grid");
      await pickers.nth(0).getByRole("button", { name: /Polymer polyol 25/ }).click();
      await pickers.nth(1).getByRole("button", { name: /Polymer polyol 45/ }).click();
      check(
        "ui.hub.neg.uk-overcap",
        "a UK-grouped fill above 8,000 kg is refused",
        await visibleText(page, /You can add at most/),
      );
      await page.getByRole("button", { name: "Target", exact: true }).click();
      await page.locator("#target-kg").fill("1 000");
      await primaryButton(page, "Next").click();
      check(
        "ui.hub.neg.down",
        "a fill below what is already in the tank is refused",
        await visibleText(page, /fill up, not down/i),
      );
      await page.getByRole("button", { name: "Back" }).click();
      await page.getByRole("button", { name: "Record usage" }).click();
      await page.locator("#use-rate").fill("57");
      await page.locator("#use-minutes").fill("77");
      check(
        "ui.hub.neg.overdraw",
        "57 kg/min for 77 min is refused when the tank is only 2,070 kg",
        await visibleText(page, "Cannot consume more than the current tank volume."),
      );
      await context.close();
    }

    {
      const chemicals = [
        chemical("c0", "Conventional polyol", 0),
        chemical("c25", "Polymer polyol 25", 25),
        chemical("c45", "Polymer polyol 45", 45),
      ];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: 8000, heel: 0 },
          entries: [
            logEntry("1", "opening_balance", 700, { chemicalId: "c0", solidContentPct: 0 }),
            logEntry("2", "opening_balance", 220, { chemicalId: "c25", solidContentPct: 25 }),
            logEntry("3", "opening_balance", 1150, { chemicalId: "c45", solidContentPct: 45 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/");
      await page.getByRole("button", { name: "Add to the tank" }).click();
      await page.locator("#target-kg").fill("8000");
      await page.locator("#target-pct").fill("28");
      await primaryButton(page, "Next").click();
      const pickers = page.locator("ul.grid");
      await pickers.nth(0).getByRole("button", { name: /Polymer polyol 45/ }).click();
      await pickers.nth(1).getByRole("button", { name: /Polymer polyol 25/ }).click();
      await page.getByRole("button", { name: "Review addition" }).click();
      const solid = page.locator("p.hero-number.mt-1");
      await solid.waitFor();
      const suggested = (await solid.innerText()).trim();
      check("ui.report.pos.suggestion", "the suggestion shows your solid content", suggested.length > 0);
      check(
        "ui.report.pos.hint",
        "each line keeps the calculator suggestion",
        await visibleText(page, /Calculator suggested/),
      );
      const save = page.getByRole("button", { name: "Confirm addition" });
      check("ui.report.pos.save", "a fit suggestion can be saved", await save.isEnabled());
      await page.locator("#report-c45-kg").fill("1050");
      await page.locator("#report-c25-kg").fill("5250");
      await page.locator("#report-c45-pct").fill("44");
      const edited = (await solid.innerText()).trim();
      check("ui.report.pos.edited", "typed kg and solid content replace the suggestion", edited !== suggested);
      check(
        "ui.report.neg.overcap",
        "a typed pour over the tank size is refused",
        (await visibleText(page, /The tank holds/)) && (await save.isDisabled()),
      );
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: "Download PDF" }).click(),
      ]);
      check("ui.report.pos.pdf", "the edited report downloads on this device", download.suggestedFilename() === "tank-report.pdf");
      check(
        "ui.report.neg.unsaved",
        "downloading the PDF does not write the log",
        (await page.getByRole("heading", { name: "Add to the tank" }).count()) === 1,
      );
      await context.close();
    }

    {
      const chemicals = [chemical("c25", "POP 25", 25)];
      const entries = Array.from({ length: 12 }, (_, index) => {
        const n = index + 1;
        return logEntry(String(n), n === 1 ? "opening_balance" : "add_batch", 40, {
          chemicalId: "c25",
          solidContentPct: 25,
          entryDate: `2026-01-${String(n).padStart(2, "0")}`,
          createdAt: `2026-01-${String(n).padStart(2, "0")}T10:00:00.000Z`,
          // Newest-first positions: 1=n12 … 11=n2. Marker belongs on page 2.
          note: n === 2 ? "MARKER-ROW-11" : `seed-row-${n}`,
        });
      });
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: 8000, heel: 0 },
          entries,
        }),
      );
      await gotoTank(page, "/tank/log/");
      check("ui.log.page.heading", "activity shows latest production and all activity", await visibleText(page, "Latest production activity") && await visibleText(page, "All activity"));
      check(
        "ui.log.page.1-hides-11",
        "first page does not show row 11 marker",
        !(await visibleText(page, "MARKER-ROW-11", 1500)),
      );
      check("ui.log.page.controls", "log has Next page control", (await page.getByRole("button", { name: "Next page" }).count()) === 1);
      await page.getByRole("button", { name: "Next page" }).click();
      check("ui.log.page.2-shows-11", "Next shows row 11 marker", await visibleText(page, "MARKER-ROW-11"));
      await page.getByRole("button", { name: "Previous page" }).click();
      check(
        "ui.log.page.prev",
        "Previous returns without row 11 marker",
        !(await visibleText(page, "MARKER-ROW-11", 1500)),
      );
      await context.close();
    }

    {
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals: [chemical("c45", "Polymer polyol 45", 45)],
          settings: { capacity: 8000, heel: 0 },
          entries: [
            logEntry("1", "opening_balance", 1200, { chemicalId: "c45", solidContentPct: 45 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/log/");
      await page.getByRole("button", { name: "Delete" }).click();
      check("ui.delete.ask", "delete asks before removing a log row", await visibleText(page, "Are you sure?"));
      check(
        "ui.delete.consequence",
        "delete shows the tank after the row is gone",
        await visibleText(page, /instead of 1.?200 kg/),
      );
      await page.getByRole("button", { name: "Cancel" }).click();
      check("ui.delete.cancel", "cancel keeps the log row", await visibleText(page, "Already in the tank"));
      await page.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Yes, delete it" }).click();
      check(
        "ui.delete.gone",
        "confirming delete removes the row and the tank needs an opening again",
        await visibleText(page, "Set up your tank first"),
      );
      await context.close();
    }

    {
      const chemicals = [
        chemical("c45", "polymer polyol 3125", 45),
        chemical("c25", "polymer polyol 2045", 25),
        chemical("c0", "Conventional Polyol", 0),
      ];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: 8000, heel: 0 },
          entries: [
            logEntry("1", "opening_balance", 1063.4, { chemicalId: "c45", solidContentPct: 45 }),
            logEntry("2", "opening_balance", 527.5, { chemicalId: "c25", solidContentPct: 25 }),
            logEntry("3", "opening_balance", 166.2, { chemicalId: "c0", solidContentPct: 0 }),
          ],
        }),
      );
      await gotoTank(page, "/tank/");
      check("ui.home.edit.readonly", "viewing the tank does not show kg inputs", (await page.locator("input#tank-total-kg").count()) === 0);
      await page.getByRole("button", { name: "Correct tank readings" }).click();
      const total = page.locator("#tank-total-kg");
      const chemA = page.locator("#tank-chem-c45");
      const chemB = page.locator("#tank-chem-c25");
      const chemC = page.locator("#tank-chem-c0");
      check("ui.home.edit.fields", "correction shows editable kg fields", (await total.count()) === 1 && (await chemA.count()) === 1);
      await page.waitForFunction(() => {
        const field = document.querySelector("#tank-total-kg");
        return field instanceof HTMLInputElement && field.value.trim().length > 0;
      });

      const beforeTotal = await total.inputValue();
      const beforeB = await chemB.inputValue();
      await chemA.fill("1200");
      await chemA.blur();
      await page.getByRole("button", { name: "Review correction" }).click();
      check("ui.home.edit.rebalance-ask", "editing one chemical asks before saving", await visibleText(page, "Are you sure?"));
      const afterTotal = await total.inputValue();
      const afterB = await chemB.inputValue();
      const afterC = await chemC.inputValue();
      check(
        "ui.home.edit.rebalance-total",
        "editing one chemical keeps the total",
        afterTotal === beforeTotal,
        `before ${JSON.stringify(beforeTotal)} after ${JSON.stringify(afterTotal)}`,
      );
      check(
        "ui.home.edit.rebalance-others",
        "editing one chemical changes the other kilograms",
        afterB !== beforeB && afterC.length > 0,
      );
      await page.getByRole("button", { name: "Save correction" }).click();
      await page.getByText("Saved the new kilograms on Home.").waitFor();

      await page.getByRole("button", { name: "Correct tank readings" }).click();
      await page.waitForFunction(() => {
        const field = document.querySelector("#tank-solid-pct");
        return field instanceof HTMLInputElement && field.value.trim().length > 0;
      });
      const solidBeforeScale = await page.locator("#tank-solid-pct").inputValue();
      await total.fill("2000");
      await total.blur();
      await page.getByRole("button", { name: "Review correction" }).click();
      check("ui.home.edit.scale-ask", "editing the total asks before saving", await visibleText(page, "Are you sure?"));
      check(
        "ui.home.edit.scale-copy",
        "scaling explains every chemical moves together",
        await visibleText(page, /Every chemical is scaled/),
      );
      const scaledA = await chemA.inputValue();
      const scaledB = await chemB.inputValue();
      const scaledC = await chemC.inputValue();
      check(
        "ui.home.edit.scale-all",
        "editing the total scales every chemical",
        scaledA.length > 0 && scaledB.length > 0 && scaledC.length > 0 && scaledA !== "1 200",
      );
      await page.getByRole("button", { name: "Save correction" }).click();
      await page.getByText("Saved the new kilograms on Home.").waitFor();
      await page.getByRole("button", { name: "Correct tank readings" }).click();
      await page.waitForFunction(() => {
        const field = document.querySelector("#tank-total-kg");
        return field instanceof HTMLInputElement && field.value.trim().length > 0;
      });
      const solidAfterScale = await page.locator("#tank-solid-pct").inputValue();
      check(
        "ui.home.edit.scale-pct",
        "scaling the total keeps the solid content",
        solidAfterScale === solidBeforeScale,
        `before ${JSON.stringify(solidBeforeScale)} after ${JSON.stringify(solidAfterScale)}`,
      );
      const scaledTotal = await total.inputValue();
      check(
        "ui.home.edit.scale-total",
        "scaled total shows 2 000 kg",
        /2.?000/.test(scaledTotal),
        JSON.stringify(scaledTotal),
      );

      await gotoTank(page, "/tank/composition/");
      check(
        "ui.home.edit.composition",
        "composition sees the saved kilograms",
        await visibleText(page, /polymer polyol 3125/i),
      );
      await page.getByRole("link", { name: "Activity" }).click();
      await page.waitForURL("**/tank/log/**");
      await page.getByRole("heading", { name: "Latest production activity" }).waitFor();
      check("ui.home.edit.log", "log shows the Correction row", await visibleText(page, /correction/i, 8000));
      await context.close();
    }

    {
      const { context, page } = await openPage(browser, tankState({ chemicals: [] }));
      await gotoTank(page, "/tank/inventory/");
      check(
        "ui.inventory.empty.add",
        "empty inventory tells the user to add a chemical",
        await visibleText(page, "Add a chemical") &&
          await visibleText(page, /A name and a solid content are enough/i),
      );
      await primaryButton(page, "Add a chemical").click();
      const emptyAdd = page.getByRole("dialog");
      await emptyAdd.waitFor();
      check(
        "ui.inventory.empty.name",
        "empty inventory add form asks for a name",
        await emptyAdd.locator("#inv-chem-name").isVisible(),
      );
      await page.keyboard.press("Escape");
      await emptyAdd.waitFor({ state: "hidden" });
      await context.close();
    }

    {
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals: [chemical("c10", "POP 10", 10)],
        }),
      );
      await gotoTank(page, "/tank/inventory/");
      check(
        "ui.inventory.pos.add",
        "inventory with chemicals shows Add a chemical",
        (await page.getByRole("button", { name: "Add a chemical" }).count()) === 1,
      );
      await primaryButton(page, "Add a chemical").click();
      const addDialog = page.getByRole("dialog");
      await addDialog.waitFor();
      check(
        "ui.inventory.pos.add-name",
        "opening Add a chemical asks for a name",
        await addDialog.locator("#inv-chem-name").isVisible(),
      );
      await page.keyboard.press("Escape");
      await addDialog.waitFor({ state: "hidden" });
      check(
        "ui.inventory.pos.untracked",
        "untracked stock says no kilograms on the shelf yet",
        await visibleText(page, "No kilograms on the shelf yet"),
      );
      check(
        "ui.inventory.pos.receive-primary",
        "Drums arrived is the primary stock action",
        (await page.getByRole("button", { name: "Receive POP 10" }).count()) === 1,
      );
      await page.getByRole("button", { name: "Receive POP 10" }).click();
      const receiveDialog = page.getByRole("dialog");
      await receiveDialog.waitFor();
      check(
        "ui.inventory.pos.receive-hint",
        "receive form explains shelf vs tank",
        await visibleText(page, /does not pour them into the tank/i),
      );
      await page.locator("#stock-qty").fill("250");
      check(
        "ui.inventory.pos.receive-preview",
        "the form says what the shelf will show",
        await visibleText(page, /The shelf will show 250 kg/i),
      );
      await page.getByRole("button", { name: "Save" }).click();
      await receiveDialog.waitFor({ state: "hidden" });
      check("ui.inventory.pos.receive", "a receive sets on-hand kilograms", await visibleText(page, "250 kg"));
      await page.getByRole("button", { name: "Actions for POP 10" }).click();
      await page.getByRole("button", { name: "Issue" }).click();
      const issueDialog = page.getByRole("dialog");
      await issueDialog.waitFor();
      await page.locator("#stock-qty").fill("50");
      await page.getByRole("button", { name: "Save" }).click();
      await issueDialog.waitFor({ state: "hidden" });
      check("ui.inventory.pos.issue", "an issue reduces on-hand kilograms", await visibleText(page, "200 kg"));
      await page.getByRole("button", { name: "Actions for POP 10" }).click();
      await page.getByRole("button", { name: "Set count" }).click();
      const countDialog = page.getByRole("dialog");
      await countDialog.waitFor();
      await page.locator("#stock-qty").fill("180");
      await page.getByRole("button", { name: "Save" }).click();
      await countDialog.waitFor({ state: "hidden" });
      check("ui.inventory.pos.count", "a physical count replaces on-hand kilograms", await visibleText(page, "180 kg"));
      await page.getByRole("button", { name: "Actions for POP 10" }).click();
      await page.getByRole("button", { name: "History" }).click();
      await page.getByRole("heading", { name: "History for POP 10" }).waitFor();
      check("ui.inventory.pos.history", "history lists the count and what is left", await visibleText(page, /left on the shelf/i));
      await context.close();
    }

    {
      const chemicals = [
        chemical("c0", "Conventional polyol", 0),
        chemical("c20", "POP 20", 20, 1500),
      ];
      const { context, page } = await openPage(
        browser,
        tankState({
          chemicals,
          settings: { capacity: 8000, heel: 0 },
          entries: [logEntry("1", "opening_balance", 1000, { chemicalId: "c0", solidContentPct: 0 })],
        }),
      );
      await gotoTank(page, "/tank/");
      await page.getByRole("button", { name: "Add to the tank" }).click();
      await page.getByRole("button", { name: "One polyol" }).click();
      await page.locator("#target-pct").fill("10");
      await primaryButton(page, "Next").click();
      await page.getByRole("button", { name: /POP 20/ }).click();
      await page.getByRole("button", { name: "Review addition" }).click();
      await page.getByRole("button", { name: "Confirm addition" }).click();
      check(
        "ui.inventory.pos.pour-saved",
        "the pour is saved on Home",
        await visibleText(page, /The tank is now/),
      );
      await page.getByRole("link", { name: "Inventory" }).click();
      await page.waitForURL("**/tank/inventory/**");
      const poured = await page.locator("li").filter({ hasText: "POP 20" }).innerText();
      const untouched = await page.locator("li").filter({ hasText: "Conventional polyol" }).innerText();
      check(
        "ui.inventory.pos.pour",
        "a confirmed pour reduces shelf stock and leaves the opening balance alone",
        /500 kg on the shelf/.test(poured.replace(/\s+/g, " ")) && /No kilograms on the shelf yet/.test(untouched),
        poured.replace(/\s+/g, " "),
      );
      await context.close();
    }

    {
      const { context, page } = await openPage(browser);
      await gotoTank(page, "/about/");
      check("ui.brochure.header", "brochure chrome is still on marketing pages", (await page.locator("header").count()) > 0);
      check("ui.brochure.no-tank-nav", "public nav does not link to /tank", (await page.getByRole("navigation").getByRole("link", { name: /tank/i }).count()) === 0);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

try {
  await run();
} catch (error) {
  console.error(error);
  failures.push(`crash|${error instanceof Error ? error.message : String(error)}`);
}

console.log(`\n=== ${pass}/${total} UI checks passed, ${total - pass} failed ===`);
if (failures.length) {
  console.log("Failed tests:");
  for (const failure of failures) console.log(`  ${failure}`);
  process.exit(1);
}
console.log("\n✅ TANK UI CASES PASSED");
