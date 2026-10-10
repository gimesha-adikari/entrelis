import { chromium } from "./qa-tools/node_modules/playwright/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const phase = process.argv[2];
const baseUrl = process.argv[3] || "http://127.0.0.1:3100";
if (!phase) throw new Error("Pass before or after as the capture phase.");

const baseDir = "/workspace/shared/gim53-observatory-veil";
const outputDir = path.join(baseDir, phase, "screenshots");
await mkdir(outputDir, { recursive: true });

const cases = [
  { name: "rust-1440-default", slug: "rust", width: 1440, height: 900 },
  { name: "rust-1280-default", slug: "rust", width: 1280, height: 800 },
  { name: "ownership-1024-default", slug: "ownership", width: 1024, height: 768 },
  { name: "stack-and-heap-769-boundary", slug: "stack-and-heap", width: 769, height: 900 },
  { name: "rust-390-mobile", slug: "rust", width: 390, height: 844, mobile: true },
  { name: "ownership-375-mobile", slug: "ownership", width: 375, height: 812, mobile: true },
  { name: "stack-and-heap-320-mobile", slug: "stack-and-heap", width: 320, height: 700, mobile: true },
  { name: "operating-systems-768-boundary", slug: "operating-systems", width: 768, height: 900, mobile: true },
  { name: "rust-1440-landscape", slug: "rust", width: 1440, height: 700 },
  { name: "ownership-768-landscape", slug: "ownership", width: 768, height: 390, mobile: true },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const results = [];
const errors = [];

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    deviceScaleFactor: 1,
    isMobile: Boolean(testCase.mobile),
    hasTouch: Boolean(testCase.mobile),
    colorScheme: "dark",
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push({ case: testCase.name, error: error.message }));
  await page.goto(baseUrl + "/concept/" + testCase.slug, { waitUntil: "networkidle" });
  await page.locator("aside[aria-label='Selected Concept Details'] h2").waitFor();
  await page.waitForTimeout(350);
  const details = await page.evaluate(() => {
    const panel = document.querySelector("aside[aria-label='Selected Concept Details']");
    const heading = panel?.querySelector("h2");
    const canvas = document.querySelector("canvas");
    return {
      title: heading?.textContent?.trim() ?? null,
      panelWidth: panel?.getBoundingClientRect().width ?? null,
      panelHeight: panel?.getBoundingClientRect().height ?? null,
      canvasWidth: canvas?.getBoundingClientRect().width ?? null,
      canvasHeight: canvas?.getBoundingClientRect().height ?? null,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      panelScrollWidth: panel?.scrollWidth ?? null,
      panelClientWidth: panel?.clientWidth ?? null,
      viewportWidth: window.innerWidth,
    };
  });
  const imagePath = path.join(outputDir, testCase.name + ".png");
  await page.screenshot({ path: imagePath, animations: "disabled" });
  results.push({ ...testCase, ...details, screenshot: path.basename(imagePath) });
  await context.close();
}

await browser.close();
await writeFile(path.join(baseDir, phase, "capture-metadata.json"), JSON.stringify({
  phase,
  baseUrl,
  browser: "Chromium 151, system /usr/bin/chromium",
  rendering: "SwiftShader software WebGL",
  deviceScaleFactor: 1,
  capturedAt: new Date().toISOString(),
  results,
  errors,
}, null, 2) + "\n");
console.log(JSON.stringify({ phase, captures: results.length, errors, results }, null, 2));
if (errors.length > 0 || results.some((result) => result.bodyScrollWidth > result.viewportWidth || result.documentScrollWidth > result.viewportWidth || (result.panelScrollWidth ?? 0) > (result.panelClientWidth ?? 0))) process.exitCode = 1;
