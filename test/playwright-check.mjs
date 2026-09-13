import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:5173";
const OUT = "/home/claude/wsw-summit/test/screenshots";
fs.mkdirSync(OUT, { recursive: true });

const consoleErrors = [];
const browser = await chromium.launch();

async function withPage(viewport, name, fn) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[${name}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`[${name}] pageerror: ${err.message}`));
  await fn(page);
  await context.close();
}

// ---- 1. Empty-state page load (mobile) ----
await withPage({ width: 390, height: 844 }, "empty-mobile", async (page) => {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400); // allow canvas/fonts to finish drawing
  await page.screenshot({ path: `${OUT}/01-empty-mobile.png`, fullPage: true });
  const heroName = await page.textContent(".hero__name");
  console.log("Empty-state hero name:", heroName?.trim());
});

// ---- 2. Filled-in form + live graphic/caption (desktop) ----
await withPage({ width: 1280, height: 900 }, "filled-desktop", async (page) => {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.fill("#field-name", "Sara Salami");
  await page.fill("#field-title", "Marketing & Community Manager");
  await page.fill("#field-company", "PLAYBOOK");
  await page.waitForTimeout(500); // debounced canvas redraw
  await page.screenshot({ path: `${OUT}/02-filled-desktop.png`, fullPage: true });

  const heroName = await page.textContent(".hero__name");
  const caption = await page.inputValue("#caption-text");
  console.log("Hero name:", heroName?.trim());
  console.log("Caption starts with:", caption.slice(0, 60));
});

// ---- 3. /api/me probe (should 404 locally with no LinkedIn env vars set) ----
await withPage({ width: 390, height: 844 }, "api-probe", async (page) => {
  const res = await page.goto(`${BASE}/api/me`);
  console.log("/api/me status:", res.status());
});

await browser.close();

if (consoleErrors.length) {
  console.log("\nConsole/page errors seen:");
  consoleErrors.forEach((e) => console.log(" -", e));
} else {
  console.log("\nNo console/page errors.");
}
