import { chromium } from "./qa-tools/node_modules/playwright/index.mjs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const phase = process.argv[2];
const baseUrl = process.argv[3];
if (!phase || !baseUrl) throw new Error("Usage: benchmark.mjs <phase> <base-url>");
const isBaseline = phase === "baseline";
const viewportBeforeResize = isBaseline ? { width: 1350, height: 900 } : { width: 1440, height: 900 };
const viewportAfterResize = isBaseline ? { width: 1220, height: 900 } : viewportBeforeResize;

const baseDir = "/workspace/shared/gim53-observatory-veil";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: viewportBeforeResize,
  deviceScaleFactor: 1,
  colorScheme: "dark",
  reducedMotion: "no-preference",
});
await context.addInitScript(() => {
  const metrics = {
    frameIntervals: [],
    resizeResponseFrameLatencies: [],
    canvasResizeFrameLatencies: [],
    longTasks: [],
    pointerTypes: [],
    webglContextAttempts: [],
    webglContexts: 0,
    resources: {
      createBuffer: 0,
      deleteBuffer: 0,
      createTexture: 0,
      deleteTexture: 0,
      createProgram: 0,
      deleteProgram: 0,
      createShader: 0,
      deleteShader: 0,
      createRenderbuffer: 0,
      deleteRenderbuffer: 0,
    },
  };
  window.__gim53Metrics = metrics;
  let frameSampling = false;
  let longTaskSampling = false;
  let lastFrame = null;
  window.__gim53StartFrameSampling = () => {
    metrics.frameIntervals.length = 0;
    metrics.longTasks.length = 0;
    lastFrame = null;
    frameSampling = true;
    longTaskSampling = true;
    const sample = (now) => {
      if (!frameSampling) return;
      if (lastFrame !== null) metrics.frameIntervals.push(now - lastFrame);
      lastFrame = now;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  };
  window.__gim53StopFrameSampling = () => {
    frameSampling = false;
    longTaskSampling = false;
  };

  try {
    const observer = new PerformanceObserver((entries) => {
      if (!longTaskSampling) return;
      for (const entry of entries.getEntries()) {
        metrics.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
      }
    });
    observer.observe({ type: "longtask" });
  } catch {}

  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[role="separator"]')) {
        metrics.pointerTypes.push(event.pointerType);
      }
    },
    true
  );
  document.addEventListener(
    "pointermove",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('[role="separator"]')) return;
      const eventTime = performance.now();
      requestAnimationFrame(() => {
        metrics.resizeResponseFrameLatencies.push(performance.now() - eventTime);
      });
    },
    true
  );

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const context = originalGetContext.call(this, type, ...args);
    if (typeof type === "string" && type.indexOf("webgl") === 0) {
      metrics.webglContextAttempts.push(type);
      if (context && !this.__gim53Instrumented) {
        this.__gim53Instrumented = true;
        metrics.webglContexts += 1;
        for (const name of Object.keys(metrics.resources)) {
          const method = context[name];
          if (typeof method !== "function") continue;
          context[name] = function (...methodArgs) {
            metrics.resources[name] += 1;
            return method.apply(this, methodArgs);
          };
        }
      }
    }
    return context;
  };
});

const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
const coldStartedAt = Date.now();
await page.goto(baseUrl + "/concept/rust", { waitUntil: "domcontentloaded" });
await page.locator("aside[aria-label='Selected Concept Details'] h2").waitFor();
const coldLoadMs = Date.now() - coldStartedAt;
await page.waitForTimeout(700);
const coldNavigationEntry = await page.evaluate(() => {
  const entry = performance.getEntriesByType("navigation")[0];
  return entry
    ? {
        responseStart: entry.responseStart,
        domInteractive: entry.domInteractive,
        domContentLoaded: entry.domContentLoadedEventEnd,
        loadEventEnd: entry.loadEventEnd,
      }
    : null;
});

const warmStartedAt = Date.now();
await page.goto(baseUrl + "/concept/rust", { waitUntil: "domcontentloaded" });
await page.locator("aside[aria-label='Selected Concept Details'] h2").waitFor();
const warmLoadMs = Date.now() - warmStartedAt;
await page.waitForTimeout(600);

async function navigateTo(slug, name) {
  const started = await page.evaluate(() => performance.now());
  await page.getByRole("button", { name: "Explore connected concept: " + name }).click();
  await page.getByRole("heading", { name, level: 2 }).waitFor();
  return page.evaluate((start) => performance.now() - start, started);
}

const navigationBeforeResize = {
  rustToOwnershipMs: await navigateTo("ownership", "Ownership"),
  ownershipToMemoryMs: await navigateTo("memory", "Memory"),
};
await page.getByRole("button", { name: "Return to Rust" }).click();
await page.getByRole("heading", { name: "Rust", level: 2 }).waitFor();
await page.waitForTimeout(700);

const cdp = await context.newCDPSession(page);
await cdp.send("Performance.enable");
async function getCdpMetrics() {
  const response = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(response.metrics.map((metric) => [metric.name, metric.value]));
}
const cdpBeforeResize = await getCdpMetrics();
await page.evaluate(() => {
  window.__gim53Metrics.resizeResponseFrameLatencies.length = 0;
  window.__gim53Metrics.canvasResizeFrameLatencies.length = 0;
});
const pageBeforeResize = await page.evaluate(() => {
  const canvas = document.querySelector("div[class*='canvasArea']");
  const webglCanvas = document.querySelector("canvas[data-production-celestial-layer]");
  const state = window.__gim53Metrics;
  return {
    title: document.querySelector("aside h2")?.textContent?.trim() ?? null,
    canvasWidth: canvas?.getBoundingClientRect().width ?? null,
    canvasHeight: canvas?.getBoundingClientRect().height ?? null,
    productionCanvasCount: document.querySelectorAll("canvas[data-production-celestial-layer]").length,
    webglCanvasWidth: webglCanvas?.width ?? null,
    webglCanvasHeight: webglCanvas?.height ?? null,
    separatorAvailable: Boolean(document.querySelector('[role="separator"]')),
    webglContextAttempts: [...state.webglContextAttempts],
    webglContexts: state.webglContexts,
    resources: { ...state.resources },
  };
});

await page.evaluate(() => {
  const target = document.querySelector("[data-testid='graph-canvas-area']") ?? document.querySelector("div[class*='canvasArea']");
  if (!target) return;
  const metrics = window.__gim53Metrics;
  const observer = new ResizeObserver(() => {
    const started = performance.now();
    requestAnimationFrame(() => metrics.canvasResizeFrameLatencies.push(performance.now() - started));
  });
  observer.observe(target);
  window.__gim53ResizeObserver = observer;
  metrics.canvasResizeFrameLatencies.length = 0;
});
await page.evaluate(() => window.__gim53StartFrameSampling());
const resizeCycles = 2;
let interactionElapsedMs;
const measurementStartedAt = Date.now();
const waitForCanvasWidth = (width) =>
  page.waitForFunction((targetWidth) => {
    const area = document.querySelector("[data-testid='graph-canvas-area']") ?? document.querySelector("div[class*='canvasArea']");
    return area && Math.round(area.getBoundingClientRect().width) === targetWidth;
  }, width);
const getCanvasResizeSampleCount = () =>
  page.evaluate(() => window.__gim53Metrics.canvasResizeFrameLatencies.length);
const waitForNextCanvasResizeSample = (previousCount) =>
  page.waitForFunction(
    (count) => window.__gim53Metrics.canvasResizeFrameLatencies.length > count,
    previousCount
  );
const resizeViewportTo = async (viewport, canvasWidth) => {
  const previousSampleCount = await getCanvasResizeSampleCount();
  await page.setViewportSize(viewport);
  await waitForCanvasWidth(canvasWidth);
  await waitForNextCanvasResizeSample(previousSampleCount);
};

if (isBaseline) {
  const interactionStartedAt = Date.now();
  await resizeViewportTo(viewportAfterResize, 840);
  interactionElapsedMs = Date.now() - interactionStartedAt;

  for (let cycle = 0; cycle < resizeCycles; cycle += 1) {
    await resizeViewportTo(viewportBeforeResize, 970);
    await resizeViewportTo(viewportAfterResize, 840);
  }
} else {
  const dragPanelToWidth = async (targetWidth) => {
    const handle = page.getByRole("separator", { name: "Resize knowledge panel" });
    const bounds = await handle.boundingBox();
    const panel = page.locator("aside[aria-label='Selected Concept Details']");
    const currentWidth = await panel.evaluate((element) => element.getBoundingClientRect().width);
    if (!bounds) throw new Error("Observatory resize handle was not visible in the benchmark.");
    const previousSampleCount = await getCanvasResizeSampleCount();
    const startX = bounds.x + bounds.width / 2;
    const startY = bounds.y + bounds.height / 2;
    const delta = targetWidth - currentWidth;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let step = 1; step <= 13; step += 1) {
      await page.mouse.move(startX - (delta * step) / 13, startY, { steps: 1 });
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await waitForNextCanvasResizeSample(previousSampleCount);
  };

  const interactionStartedAt = Date.now();
  await dragPanelToWidth(600);
  interactionElapsedMs = Date.now() - interactionStartedAt;

  for (let cycle = 0; cycle < resizeCycles; cycle += 1) {
    await dragPanelToWidth(470);
    await dragPanelToWidth(600);
  }
}
const measurementInteractionElapsedMs = Date.now() - measurementStartedAt;
await page.waitForFunction((baseline) => {
  const area = document.querySelector("[data-testid='graph-canvas-area']") ?? document.querySelector("div[class*='canvasArea']");
  const panel = document.querySelector("aside[aria-label='Selected Concept Details']");
  return area && Math.round(area.getBoundingClientRect().width) === 840 && (baseline || (panel && Math.round(panel.getBoundingClientRect().width) === 600));
}, isBaseline);
await page.waitForTimeout(1100);
await page.evaluate(() => window.__gim53StopFrameSampling());
const cdpAfterResize = await getCdpMetrics();
const pageAfterResize = await page.evaluate(() => {
  const canvas = document.querySelector("[data-testid='graph-canvas-area']") ?? document.querySelector("div[class*='canvasArea']");
  const webglCanvas = document.querySelector("canvas[data-production-celestial-layer]");
  const state = window.__gim53Metrics;
  return {
    title: document.querySelector("aside h2")?.textContent?.trim() ?? null,
    canvasWidth: canvas?.getBoundingClientRect().width ?? null,
    canvasHeight: canvas?.getBoundingClientRect().height ?? null,
    productionCanvasCount: document.querySelectorAll("canvas[data-production-celestial-layer]").length,
    webglCanvasWidth: webglCanvas?.width ?? null,
    webglCanvasHeight: webglCanvas?.height ?? null,
    separatorAvailable: Boolean(document.querySelector('[role="separator"]')),
    webglContextAttempts: [...state.webglContextAttempts],
    webglContexts: state.webglContexts,
    resources: { ...state.resources },
    frameIntervals: [...state.frameIntervals],
    resizeResponseFrameLatencies: [...state.resizeResponseFrameLatencies],
    canvasResizeFrameLatencies: [...state.canvasResizeFrameLatencies],
    longTasks: [...state.longTasks],
    pointerTypes: [...state.pointerTypes],
  };
});
const navigationAfterResize = {
  rustToOwnershipMs: await navigateTo("ownership", "Ownership"),
  ownershipToMemoryMs: await navigateTo("memory", "Memory"),
};

const percentile = (values, fraction) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
};
const summarizeFrames = (intervals) => ({
  count: intervals.length,
  p50Ms: percentile(intervals, 0.5),
  p95Ms: percentile(intervals, 0.95),
  maxMs: intervals.length ? Math.max(...intervals) : null,
  above33_3ms: intervals.filter((value) => value > 33.3).length,
  above50ms: intervals.filter((value) => value > 50).length,
  above100ms: intervals.filter((value) => value > 100).length,
});
const frameSummary = summarizeFrames(pageAfterResize.frameIntervals);
const resizeResponseSummary = {
  count: pageAfterResize.resizeResponseFrameLatencies.length,
  p50Ms: percentile(pageAfterResize.resizeResponseFrameLatencies, 0.5),
  p95Ms: percentile(pageAfterResize.resizeResponseFrameLatencies, 0.95),
  maxMs: pageAfterResize.resizeResponseFrameLatencies.length
    ? Math.max(...pageAfterResize.resizeResponseFrameLatencies)
    : null,
};
const longTaskSummary = {
  count: pageAfterResize.longTasks.length,
  totalMs: pageAfterResize.longTasks.reduce((total, entry) => total + entry.duration, 0),
  maxMs: pageAfterResize.longTasks.length
    ? Math.max(...pageAfterResize.longTasks.map((entry) => entry.duration))
    : 0,
};
const output = {
  phase,
  baseUrl,
  capturedAt: new Date().toISOString(),
  browser: {
    version: browser.version(),
    executable: "/usr/bin/chromium",
    rendering: "SwiftShader software WebGL",
    viewportBeforeResize,
    viewportAfterResize,
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  },
  load: {
    coldLoadMs,
    coldNavigationEntry,
    warmLoadMs,
  },
  navigationBeforeResize,
  navigationAfterResize,
  resize: {
    interactionElapsedMs,
    measurementInteractionElapsedMs,
    resizeCycles,
    pageBeforeResize,
    pageAfterResize,
    cdpBeforeResize,
    cdpAfterResize,
    cdpDeltas: Object.fromEntries(
      Object.keys(cdpBeforeResize).map((key) => [
        key,
        (cdpAfterResize[key] ?? 0) - (cdpBeforeResize[key] ?? 0),
      ])
    ),
    frames: frameSummary,
    resizeResponseFrameLatency: resizeResponseSummary,
    longTasks: longTaskSummary,
    canvasResizeFrameLatency: {
      count: pageAfterResize.canvasResizeFrameLatencies.length,
      p50Ms: percentile(pageAfterResize.canvasResizeFrameLatencies, 0.5),
      p95Ms: percentile(pageAfterResize.canvasResizeFrameLatencies, 0.95),
      maxMs: pageAfterResize.canvasResizeFrameLatencies.length
        ? Math.max(...pageAfterResize.canvasResizeFrameLatencies)
        : null,
    },
  },
  pageErrors,
};

await writeFile(
  path.join(baseDir, "performance", phase + ".json"),
  JSON.stringify(output, null, 2) + "\n"
);
console.log(JSON.stringify(output, null, 2));
await browser.close();
if (pageErrors.length) process.exitCode = 1;
