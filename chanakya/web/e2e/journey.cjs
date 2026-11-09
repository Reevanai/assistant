// End-to-end journey against a running app + local Supabase (see chanakya/README.md).
// Usage: NODE_PATH=$(npm root -g) node e2e/journey.cjs <screenshot-dir>   (needs Playwright + Chromium)
const { chromium } = require("playwright");
const OUT = process.argv[2];
const BASE = "http://localhost:3000";
const step = (m) => console.log("•", m);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const a = await ctxA.newPage();
  a.on("pageerror", (e) => errors.push("A pageerror: " + e.message));
  a.on("console", (m) => m.type() === "error" && errors.push("A console: " + m.text()));

  await a.goto(BASE + "/o/acme/command");
  if (!a.url().includes("/login?next=")) throw new Error("unauthenticated not redirected: " + a.url());
  step("protected route redirects to login");

  await a.goto(BASE + "/signup");
  await a.fill("#fullName", "Asha Rao");
  await a.fill("#email", "asha@acme-affairs.test");
  await a.fill("#password", "weak");
  await a.evaluate(() => document.querySelector("#password").removeAttribute("minlength"));
  await a.click("button[type=submit]");
  await a.waitForSelector("text=Use at least 12 characters");
  step("weak password rejected");
  await a.fill("#password", "correct-horse-42-battery");
  await a.click("button[type=submit]");
  await a.waitForURL("**/onboarding");
  step("signed up → onboarding");

  await a.fill("#name", "Acme Public Affairs");
  if ((await a.inputValue("#slug")) !== "acme-public-affairs") throw new Error("slug autogen");
  await a.click("button[type=submit]");
  await a.waitForURL("**/o/acme-public-affairs/command");
  await a.waitForSelector("text=Latest developments");
  await a.waitForSelector("text=synthetic demo documents loaded");
  step("org created → Command Centre with demo corpus");

  // Watchlist
  await a.keyboard.press("g"); await a.keyboard.press("w");
  await a.waitForURL("**/watchlists");
  step("keyboard chord g w navigates");
  await a.fill("#name", "Karnataka energy & real estate");
  await a.click("text=Create watchlist");
  await a.waitForURL(/watchlists\/[0-9a-f-]{36}$/);
  await a.selectOption("#itemType", "sector");
  await a.selectOption("#value", "renewable_energy");
  await a.click("button:has-text('Add')");
  await a.waitForSelector("text=Item added.");
  await a.selectOption("#itemType", "jurisdiction");
  await a.selectOption("#value", "IN-KA");
  await a.click("button:has-text('Add')");
  await a.waitForSelector("li:has-text('Karnataka')");
  await a.waitForSelector("text=[DEMO] Draft guidelines for rooftop solar");
  step("watchlist items added; matches shown");
  await a.screenshot({ path: OUT + "/watchlist.png" });

  // Document provenance
  await a.click("text=[DEMO] Draft guidelines for rooftop solar");
  await a.waitForSelector("text=Provenance");
  await a.waitForSelector("text=DEMO-KA-0001");
  await a.click("text=Report an inaccuracy");
  await a.fill("#description", "Publication date in the demo record should be checked.");
  await a.click("button:has-text('Submit')");
  await a.waitForSelector("text=Correction request recorded");
  step("document provenance + correction request");
  await a.screenshot({ path: OUT + "/document.png" });

  // Invite
  await a.goto(BASE + "/o/acme-public-affairs/settings/members");
  await a.fill("#email", "vikram@acme-affairs.test");
  await a.selectOption("#role", "viewer");
  await a.click("text=Create invitation");
  const link = await (await a.waitForSelector("input[aria-label='Invitation link']")).inputValue();
  step("invitation link created");

  // Command palette
  await a.goto(BASE + "/o/acme-public-affairs/command");
  await a.waitForSelector("text=Research activity");
  await a.keyboard.press("Control+k");
  await a.waitForSelector("[cmdk-input]");
  await a.keyboard.type("radar");
  await a.keyboard.press("Enter");
  await a.waitForURL("**/radar");
  await a.waitForSelector("text=PLANNED · MILESTONE 2");
  step("⌘K palette → planned module page");
  await a.goto(BASE + "/o/acme-public-affairs/command");
  await a.waitForSelector("text=invited vikram@acme-affairs.test as viewer");
  await a.waitForTimeout(500);
  await a.screenshot({ path: OUT + "/command.png" });
  step("audit activity visible");

  // Second user
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const b = await ctxB.newPage();
  b.on("pageerror", (e) => errors.push("B pageerror: " + e.message));
  await b.goto(link);
  await b.click("text=create an account");
  await b.fill("#fullName", "Vikram Iyer");
  await b.fill("#email", "vikram@acme-affairs.test");
  await b.fill("#password", "another-strong-pass-77");
  await b.click("button[type=submit]");
  await b.waitForURL("**/invite/**");
  await b.click("button:has-text('Accept invitation')");
  await b.waitForURL("**/o/acme-public-affairs/command");
  step("second user accepted invitation");
  await b.goto(BASE + "/o/acme-public-affairs/watchlists");
  await b.waitForSelector("text=Read-only access");
  await b.waitForSelector("text=Karnataka energy & real estate");
  step("viewer sees org watchlist read-only");
  await b.goto(BASE + "/o/acme-public-affairs/settings/members");
  if (await b.locator("text=Invite a colleague").count()) throw new Error("viewer sees invite form");
  step("viewer cannot manage members");

  // Outsider org isolation
  const ctxC = await browser.newContext();
  const c = await ctxC.newPage();
  await c.goto(BASE + "/signup");
  await c.fill("#fullName", "Outsider"); await c.fill("#email", "x@rival.test"); await c.fill("#password", "rival-strong-pass-99");
  await c.click("button[type=submit]");
  await c.waitForURL("**/onboarding");
  const res = await c.goto(BASE + "/o/acme-public-affairs/command");
  if (res.status() !== 404) throw new Error("outsider got " + res.status());
  step("outsider gets 404 for foreign org");
  await c.goto(link);
  await c.click("button:has-text('Accept invitation')");
  await c.waitForSelector("text=Invitation is invalid or expired");
  step("used invitation cannot be replayed");

  // Mobile
  const m = await browser.newContext({ ...require("playwright").devices["iPhone 13"] });
  const mp = await m.newPage();
  await mp.context().addCookies(await ctxA.cookies());
  await mp.goto(BASE + "/o/acme-public-affairs/command");
  await mp.waitForSelector("text=Latest developments");
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  step("mobile layout; horizontal overflow=" + overflow);
  await mp.screenshot({ path: OUT + "/mobile.png" });

  console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no browser errors");
  await browser.close();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
