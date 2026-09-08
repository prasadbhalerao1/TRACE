import { chromium } from "playwright";
import fs from "node:fs";

/** Capture the landing page as viewport-sized frames at several widths.
 *
 * Full-page screenshots of a 12,000px page are unreadable as images; frames the size of
 * the actual viewport are what a visitor really sees, and are the only way to judge
 * composition, scale and whether a scene has dead space in it. */

const BASE = "http://127.0.0.1:3111";
const OUT = process.argv[2];
const SIZES = [
  ["1440x900", 1440, 900],
  ["1440x1200", 1440, 1200],
  ["834x1112", 834, 1112],
  ["390x844", 390, 844],
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

for (const [name, w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });

  // Scroll the whole page once so every latched IntersectionObserver has fired and the
  // demos sit in their resolved state, then step back through frame by frame.
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, Math.round(h * 0.7));
    await page.waitForTimeout(110);
  }
  await page.keyboard.press("Home");
  await page.waitForTimeout(1400);

  const total = await page.evaluate(() => document.body.scrollHeight);
  const frames = Math.ceil(total / h);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * h);
    await page.waitForTimeout(650);
    await page.screenshot({ path: `${OUT}/${name}-${String(i).padStart(2, "0")}.png` });
  }
  console.log(`${name}: height ${total}, ${frames} frames`);
  await ctx.close();
}

await browser.close();
