import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "./qa-tools/node_modules/playwright/index.mjs";

const phase = process.argv[2];
const baseUrl = process.argv[3];
if (!phase || !baseUrl) throw new Error("Usage: interaction-qa.mjs <before|after> <base-url>");

const root = "/workspace/shared/gim53-observatory-veil";
const screenshotDir = path.join(root, phase, "screenshots");
await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const results = { phase, baseUrl, capturedAt: new Date().toISOString(), browser: browser.version(), rendering: "SwiftShader software WebGL", checks: {}, screenshots: [], errors: [] };

async function makeContext(options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    hasTouch: Boolean(options.hasTouch),
    colorScheme: "dark",
    reducedMotion: options.reducedMotion ?? "no-preference",
  });
  await context.addInitScript(() => {
    window.__gim53QaPointerTypes = [];
    window.__gim53QaPointerCancels = 0;
    document.addEventListener("pointerdown", (event) => {
      if (event.target instanceof Element && event.target.closest('[role="separator"]')) {
        window.__gim53QaPointerTypes.push(event.pointerType);
      }
    }, true);
    document.addEventListener("pointercancel", (event) => {
      if (event.target instanceof Element && event.target.closest('[role="separator"]')) {
        window.__gim53QaPointerCancels += 1;
      }
    }, true);
  });
  return context;
}

async function readState(page) {
  return page.evaluate(() => {
    const panel = document.querySelector("aside[aria-label='Selected Concept Details']");
    const canvas = document.querySelector("[data-testid='graph-canvas-area']");
    const handle = document.querySelector('[role="separator"]');
    return {
      title: panel?.querySelector("h2")?.textContent?.trim() ?? null,
      url: window.location.pathname,
      panelWidth: panel?.getBoundingClientRect().width ?? null,
      canvasWidth: canvas?.getBoundingClientRect().width ?? null,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      panelScrollWidth: panel?.scrollWidth ?? null,
      panelClientWidth: panel?.clientWidth ?? null,
      separator: handle ? {
        role: handle.getAttribute("role"),
        orientation: handle.getAttribute("aria-orientation"),
        min: Number(handle.getAttribute("aria-valuemin")),
        max: Number(handle.getAttribute("aria-valuemax")),
        now: Number(handle.getAttribute("aria-valuenow")),
        text: handle.getAttribute("aria-valuetext"),
        outlineStyle: getComputedStyle(handle).outlineStyle,
        outlineWidth: getComputedStyle(handle).outlineWidth,
      } : null,
      mainCount: document.querySelectorAll("main").length,
      pointerTypes: [...(window.__gim53QaPointerTypes ?? [])],
      pointerCancels: window.__gim53QaPointerCancels ?? 0,
    };
  });
}

async function capture(page, name, extra = {}) {
  const state = await readState(page);
  assert.equal(state.bodyScrollWidth, page.viewportSize().width, `${name}: body horizontal overflow`);
  assert.equal(state.documentScrollWidth, page.viewportSize().width, `${name}: document horizontal overflow`);
  if (state.panelClientWidth !== null) assert.ok(state.panelScrollWidth <= state.panelClientWidth, `${name}: panel horizontal overflow`);
  const filename = name + ".png";
  await page.screenshot({ path: path.join(screenshotDir, filename), animations: "disabled" });
  results.screenshots.push({ name: filename, ...state, ...extra });
  return state;
}

const desktopContext = await makeContext();
const desktop = await desktopContext.newPage();
desktop.on("pageerror", (error) => results.errors.push(error.message));
await desktop.goto(baseUrl + "/concept/rust", { waitUntil: "networkidle" });
await desktop.getByRole("heading", { name: "Rust", level: 2 }).waitFor();
await desktop.waitForTimeout(300);
const initialBounds = await desktop.locator("aside[aria-label='Selected Concept Details']").boundingBox();
assert.ok(initialBounds);
await desktop.screenshot({
  path: path.join(screenshotDir, "rust-1440-boundary.png"),
  clip: { x: Math.max(0, initialBounds.x - 64), y: 0, width: 128, height: 900 },
  animations: "disabled",
});
results.screenshots.push({ name: "rust-1440-boundary.png", edgeX: initialBounds.x, width: 128 });

if (phase === "after") {
  const handle = desktop.getByRole("separator", { name: "Resize knowledge panel" });
  const initial = await capture(desktop, "rust-1440-interaction-default");
  assert.equal(initial.panelWidth, 470);
  assert.equal(initial.canvasWidth, 970);
  assert.equal(initial.separator.role, "separator");
  assert.equal(initial.separator.orientation, "vertical");
  assert.equal(initial.separator.min, 360);
  assert.equal(initial.separator.max, 600);
  assert.equal(initial.mainCount, 1);
  const boundaryHit = await desktop.evaluate(() => {
    const panel = document.querySelector("aside[aria-label='Selected Concept Details']");
    const edgeX = panel?.getBoundingClientRect().left ?? 0;
    const target = document.elementFromPoint(edgeX - 8, Math.round(window.innerHeight / 2));
    return {
      targetTag: target?.tagName.toLowerCase() ?? null,
      canvasReceivesPointer: Boolean(target?.closest("canvas:not([data-production-celestial-layer])")),
      separatorReceivesPointer: Boolean(target?.closest('[role="separator"]')),
    };
  });
  assert.equal(boundaryHit.canvasReceivesPointer, true);
  assert.equal(boundaryHit.separatorReceivesPointer, false);
  results.checks.atmosphericBoundaryPointerTarget = boundaryHit;

  await handle.focus();
  await desktop.keyboard.press("ArrowLeft");
  await desktop.waitForFunction(() => document.querySelector('[role="separator"]')?.getAttribute("aria-valuenow") === "486");
  const keyboardFocus = await capture(desktop, "rust-1440-keyboard-focus", { action: "ArrowLeft widened from 470px to 486px" });
  results.checks.keyboardFocus = keyboardFocus.separator;
  assert.equal(keyboardFocus.separator.now, 486);
  assert.equal(keyboardFocus.separator.outlineStyle, "solid");

  await desktop.keyboard.press("Home");
  const minimum = await capture(desktop, "rust-1440-minimum", { action: "Home" });
  assert.equal(minimum.panelWidth, 360);
  await desktop.keyboard.press("End");
  const maximum = await capture(desktop, "rust-1440-maximum", { action: "End" });
  assert.equal(maximum.panelWidth, 600);
  results.checks.desktopWidthRange = { minimum: minimum.panelWidth, maximum: maximum.panelWidth };

  await desktop.reload({ waitUntil: "networkidle" });
  await desktop.getByRole("heading", { name: "Rust", level: 2 }).waitFor();
  const canvas = desktop.locator("[data-testid='graph-canvas-area'] canvas:not([data-production-celestial-layer])");
  await desktop.mouse.move(490, 440);
  await desktop.mouse.down();
  await desktop.mouse.move(545, 480, { steps: 5 });
  await desktop.mouse.up();
  await desktop.mouse.move(525, 465);
  await desktop.mouse.wheel(0, -320);
  await desktop.waitForTimeout(200);
  const panZoomBefore = await capture(desktop, "rust-1440-resize-before-panned-zoomed", { action: "Universe panned and zoomed before resize" });
  assert.equal(panZoomBefore.title, "Rust");
  assert.equal(panZoomBefore.url, "/concept/rust");

  const handleBounds = await handle.boundingBox();
  assert.ok(handleBounds);
  const startX = handleBounds.x + handleBounds.width / 2;
  const startY = handleBounds.y + handleBounds.height / 2;
  await desktop.mouse.move(startX, startY);
  await desktop.mouse.down();
  await desktop.mouse.move(startX - 60, startY, { steps: 4 });
  await desktop.waitForTimeout(100);
  const duringMouse = await capture(desktop, "rust-1440-resize-during-mouse", { action: "Mouse drag in progress" });
  await desktop.mouse.move(startX - 130, startY, { steps: 5 });
  await desktop.waitForTimeout(100);
  await desktop.mouse.up();
  const afterMouse = await capture(desktop, "rust-1440-resize-after-mouse", { action: "Mouse drag committed" });
  assert.equal(duringMouse.panelWidth, 530);
  assert.equal(afterMouse.panelWidth, 600);
  assert.equal(afterMouse.canvasWidth, 840);
  assert.equal(afterMouse.title, "Rust");
  assert.equal(afterMouse.url, "/concept/rust");
  assert.deepEqual(afterMouse.pointerTypes, ["mouse"]);
  results.checks.mouseResize = { before: panZoomBefore.panelWidth, during: duringMouse.panelWidth, after: afterMouse.panelWidth, canvasAfter: afterMouse.canvasWidth, selectedConcept: afterMouse.title, url: afterMouse.url };

  const viewportCases = [
    { name: "rust-1280-default", width: 1280, height: 800, slug: "rust", expectedPanel: 470 },
    { name: "ownership-1024-default", width: 1024, height: 768, slug: "ownership", expectedPanel: 470 },
    { name: "stack-and-heap-769-default", width: 769, height: 900, slug: "stack-and-heap", expectedPanel: 384 },
  ];
  for (const item of viewportCases) {
    const page = await desktopContext.newPage();
    page.on("pageerror", (error) => results.errors.push(error.message));
    await page.setViewportSize({ width: item.width, height: item.height });
    await page.goto(baseUrl + "/concept/" + item.slug, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: item.slug === "stack-and-heap" ? "Stack & Heap" : item.slug === "ownership" ? "Ownership" : "Rust", level: 2 }).waitFor();
    const baseState = await capture(page, item.name, { viewport: { width: item.width, height: item.height }, state: "default" });
    assert.equal(baseState.panelWidth, item.expectedPanel);
    const pageHandle = page.getByRole("separator", { name: "Resize knowledge panel" });
    await pageHandle.focus();
    await page.keyboard.press("End");
    const maxState = await capture(page, item.name.replace("default", "maximum"), { viewport: { width: item.width, height: item.height }, state: "maximum" });
    assert.equal(maxState.panelWidth, item.width === 769 ? 384 : item.width === 1024 ? 512 : 600);
    if (item.width === 769) {
      await page.keyboard.press("Home");
      const minState = await capture(page, "stack-and-heap-769-minimum", { viewport: { width: 769, height: 900 }, state: "minimum" });
      assert.equal(minState.panelWidth, 360);
    }
    await page.close();
  }

  const touchContext = await makeContext({ hasTouch: true });
  const touchPage = await touchContext.newPage();
  touchPage.on("pageerror", (error) => results.errors.push(error.message));
  await touchPage.goto(baseUrl + "/concept/rust", { waitUntil: "networkidle" });
  await touchPage.getByRole("heading", { name: "Rust", level: 2 }).waitFor();
  const touchHandle = touchPage.getByRole("separator", { name: "Resize knowledge panel" });
  const touchBounds = await touchHandle.boundingBox();
  assert.ok(touchBounds);
  const touchX = touchBounds.x + touchBounds.width / 2;
  const touchY = touchBounds.y + touchBounds.height / 2;
  const cdp = await touchContext.newCDPSession(touchPage);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: touchX, y: touchY, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touchX - 70, y: touchY, id: 1 }] });
  await touchPage.waitForTimeout(100);
  const duringTouch = await readState(touchPage);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await touchPage.waitForFunction(() => document.querySelector('[role="separator"]')?.getAttribute("aria-valuenow") === "540");
  const afterTouch = await capture(touchPage, "rust-1440-touch-resized", { action: "Touch pointer drag" });
  assert.equal(duringTouch.panelWidth, 540);
  assert.equal(afterTouch.panelWidth, 540);
  assert.ok(afterTouch.pointerTypes.includes("touch"));

  const cancelBounds = await touchHandle.boundingBox();
  assert.ok(cancelBounds);
  const cancelX = cancelBounds.x + cancelBounds.width / 2;
  const cancelY = cancelBounds.y + cancelBounds.height / 2;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cancelX, y: cancelY, id: 2 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cancelX + 35, y: cancelY, id: 2 }] });
  await touchPage.waitForTimeout(80);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await touchPage.waitForFunction(() => document.querySelector('[role="separator"]')?.getAttribute("aria-valuenow") === "540");
  const afterCancel = await readState(touchPage);
  assert.equal(afterCancel.panelWidth, 540);
  assert.ok(afterCancel.pointerCancels >= 1);
  results.checks.touchResizeAndCancel = { during: duringTouch.panelWidth, after: afterTouch.panelWidth, cancelRestored: afterCancel.panelWidth, pointerTypes: afterCancel.pointerTypes, pointerCancels: afterCancel.pointerCancels };

  const routeSequence = [
    { name: "Ownership", slug: "ownership" },
    { name: "Memory", slug: "memory" },
    { name: "Stack & Heap", slug: "stack-and-heap" },
    { name: "Operating Systems", slug: "operating-systems" },
  ];
  const routeStates = [];
  for (const route of routeSequence) {
    await touchPage.getByRole("button", { name: "Explore connected concept: " + route.name }).click();
    await touchPage.getByRole("heading", { name: route.name, level: 2 }).waitFor();
    const state = await readState(touchPage);
    assert.equal(state.url, "/concept/" + route.slug);
    assert.equal(state.panelWidth, 540);
    routeStates.push({ title: state.title, url: state.url, panelWidth: state.panelWidth });
  }
  await touchPage.goBack();
  await touchPage.getByRole("heading", { name: "Stack & Heap", level: 2 }).waitFor();
  const backState = await readState(touchPage);
  assert.equal(backState.panelWidth, 540);
  await touchPage.getByRole("button", { name: "Return to Rust" }).click();
  await touchPage.getByRole("heading", { name: "Rust", level: 2 }).waitFor();
  const homeState = await readState(touchPage);
  assert.equal(homeState.url, "/");
  assert.equal(homeState.panelWidth, 540);
  results.checks.sessionNavigation = { routeStates, back: { title: backState.title, url: backState.url, panelWidth: backState.panelWidth }, home: { title: homeState.title, url: homeState.url, panelWidth: homeState.panelWidth } };
  await touchContext.close();

  const reducedContext = await makeContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  const reducedPage = await reducedContext.newPage();
  reducedPage.on("pageerror", (error) => results.errors.push(error.message));
  await reducedPage.goto(baseUrl + "/concept/ownership", { waitUntil: "networkidle" });
  await reducedPage.getByRole("heading", { name: "Ownership", level: 2 }).waitFor();
  const reduced = await capture(reducedPage, "ownership-390-reduced-motion", { action: "prefers-reduced-motion: reduce" });
  const motionMatch = await reducedPage.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  assert.equal(motionMatch, true);
  const mobileSeparatorCount = await reducedPage.getByRole("separator").count();
  assert.equal(mobileSeparatorCount, 0);
  results.checks.reducedMotion = { matched: motionMatch, viewportWidth: reducedPage.viewportSize().width, panelWidth: reduced.panelWidth, separatorCount: mobileSeparatorCount };
  await reducedContext.close();

  const scaledContext = await makeContext({ viewport: { width: 390, height: 844 } });
  const scaledPage = await scaledContext.newPage();
  scaledPage.on("pageerror", (error) => results.errors.push(error.message));
  await scaledPage.goto(baseUrl + "/concept/ownership", { waitUntil: "networkidle" });
  await scaledPage.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const scaled = await capture(scaledPage, "ownership-390-text-enlarged-200", { action: "Root text size set to 200%" });
  assert.equal(scaled.panelWidth, 390);
  results.checks.textEnlargement = { rootFontSize: await scaledPage.evaluate(() => getComputedStyle(document.documentElement).fontSize), panelWidth: scaled.panelWidth, panelScrollWidth: scaled.panelScrollWidth, panelClientWidth: scaled.panelClientWidth, bodyScrollWidth: scaled.bodyScrollWidth, documentScrollWidth: scaled.documentScrollWidth };
  await scaledContext.close();
  await desktopContext.close();
}

assert.equal(results.errors.length, 0, `Browser errors: ${results.errors.join("; ")}`);
await writeFile(path.join(root, phase, "interaction-results.json"), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
await browser.close();
