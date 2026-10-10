# Validation results

## Source and runtime

- Required base and feature branch HEAD at final check: `30ce2e805c33474d0a2b84a359e66026543f562b`.
- Remote `m1-5-local-universe-ui` still pointed at the required SHA; implementation stayed in `/workspace/entrelis-gim53` and was not pushed.
- Node `v22.23.3`; npm `11.9.0`; Next.js `16.3.8`; Chromium `151.0.7922.173`.
- The baseline worktree ran a clean `npm ci --no-audit --no-fund`: 444 packages installed. npm emitted the existing `eslint@9.39.5` deprecation warning. No dependency or lockfile changes were made.
- Browser visual and performance runs used production builds, Playwright, Chromium with `--enable-webgl --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, DPR 1, and no preference for reduced motion unless stated otherwise.

## Repository checks

| Command | Result |
| --- | --- |
| `npm run format:check` | Passed. |
| `npm run lint` | Passed with no warnings. |
| `npm run typecheck` | Passed. |
| `npm run test` | Passed: 39 test files, 350 tests. Baseline at the required SHA: 35 files, 332 tests. |
| `npm run build` | Passed; production Next.js build and static route generation completed. |
| `git diff --check` | Passed. |

The full Vitest run printed jsdom's existing `HTMLCanvasElement.getContext()` “Not implemented” warning repeatedly; it also appeared on the exact-SHA baseline run. There were no failed or skipped tests. Vitest printed its informational note about jsdom setup cost.

Logs: [`npm ci`](logs/baseline-npm-ci.log), [baseline build](logs/baseline-build.log), [baseline tests](logs/baseline-tests.log), [format](logs/format-check.log), [lint](logs/lint.log), [typecheck](logs/typecheck.log), [tests](logs/test.log), [production build](logs/after-build.log), [diff check](logs/diff-check.log).

## Production browser checks

- Ten matched production viewport/concept screenshots were captured before and after: 1440×900 Rust, 1280×800 Rust, 1024×768 Ownership, 769×900 Stack & Heap, 390×844 Rust, 375×812 Ownership, 320×700 Stack & Heap, and 768×900 Operating Systems, plus 1440×700 and 768×390 landscape cases.
- The after set additionally covers panel minimum/default/maximum at 1440px, 1280px maximum, constrained 1024px maximum, 769px minimum/maximum, keyboard focus, panned/zoomed mouse resize before/during/after, touch resize, reduced motion, and 200% root text sizing.
- Every screenshot probe reported body and document `scrollWidth` equal to the viewport. The panel had no horizontal overflow. No browser page errors were recorded.
- At 1440×900 the panel/canvas widths were 360/1080px (minimum), 470/970px (default), and 600/840px (maximum). At 1280×800 default/max they were 470/810px and 600/680px. At 1024×768 default/max they were 470/554px and 512/512px. At 769×900 default/max/min they were 384/385px, 384/385px, and 360/409px.
- The 768px boundary uses the mobile stacked layout with no separator. Captures at 390×844, 375×812, and 320×700 kept the canvas visible above a scrollable panel. The 768×390 landscape capture kept both regions visible. The 200% text run used a 32px root size and had no horizontal overflow.
- A `prefers-reduced-motion: reduce` context matched the media query and had no desktop resize separator at 390px.
- Mouse resize changed 470→530→600px; touch changed 470→540px; touch cancellation restored 540px. Keyboard ArrowLeft changed 470→486px, Home selected 360px, and End selected 600px. `aria-valuetext` tracked the current width and keyboard focus displayed a 2px outline.
- Resizing kept Rust selected at `/concept/rust`; navigation through Ownership, Memory, Stack & Heap, Operating Systems, Back, and Home retained the selected 540px width. A hit test eight pixels on the universe side of the boundary reached the canvas, not the separator or decorative fade.

The captures and exact runtime probes are in `screenshots/`, `screenshots/after-interaction-results.json`, and [`interaction-qa.log`](logs/interaction-qa.log). Machine-readable performance data and its run log are in `performance/` and [`after-benchmark.log`](logs/after-benchmark.log) / [`baseline-benchmark.log`](logs/baseline-benchmark.log).

## Measurement limits

Cloud Chromium provided SwiftShader only. The software-rendered 130px synthetic drag took 4.714s and resize-window long tasks were substantial. GIM-52 also had slow sampled frames and resize callbacks. The callback samples and frame counts cover variable durations and repeated cycles; compare percentiles and the full JSON rather than raw event totals. These results do not represent a physical GPU. No Intel UHD630-class measurement was available; that is part of GIM-54.
