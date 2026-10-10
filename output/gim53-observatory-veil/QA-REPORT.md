# GIM-53 — Observatory Veil QA

**Status:** implementation and QA complete; stopped for independent review.  
**Implementation base:** `30ce2e805c33474d0a2b84a359e66026543f562b`  
**Implementation branch:** `m1-5-local-universe-ui` (working tree only; source not pushed)  
**QA artifact branch:** `gim51-qa-artifact`

## Result

The knowledge panel now docks at the right edge as a dark editorial reading surface, defaults to 470px at 1440px, and resizes from its left edge. Its width adapts so the universe keeps at least half of the desktop viewport. The 64px navy transition uses CSS, remains pointer-transparent, and does not put the WebGL universe behind the panel. On mobile, the universe remains above the reading surface and the atmosphere moves to its top edge.

Resizing does not rebuild the graph scene. Graph layout dimensions stay fixed for dock-only changes, the camera's horizontal translation is compensated as the canvas narrows, and the same canvas and WebGL renderer resize in place. The selected concept and URL stay put. The width lives in the mounted experience, survives concept links, browser Back, and Home, and resets to the default after a reload.

**Acceptance answer:** yes for the visual and navigation checks: the panel reads as an adjustable observatory surface while the universe stays interactive and the selected celestial remains in place during a resize. Cloud Chromium is SwiftShader-only; its slow resize frames are recorded below and do not establish physical-GPU acceptance.

## Visual review

Production screenshots were captured from the exact GIM-52 base and from the GIM-53 build in Chromium. The matched viewport captures include Rust, Ownership, Stack & Heap, and Operating Systems. The after set also includes minimum, default, and maximum panel widths, keyboard focus, mouse resizing before/during/after a panned and zoomed universe, and touch resizing.

| Comparison | GIM-52 baseline | Observatory Veil |
| --- | --- | --- |
| Rust, 1440×900 | [Screenshot](screenshots/before/rust-1440-default.png) | [Screenshot](screenshots/after/rust-1440-default.png) |
| Atmospheric boundary, 1440×900 crop | [Screenshot](screenshots/before/rust-1440-boundary.png) | [Screenshot](screenshots/after/rust-1440-boundary.png) |
| Stack & Heap, 769×900 | [Screenshot](screenshots/before/stack-and-heap-769-boundary.png) | [Screenshot](screenshots/after/stack-and-heap-769-boundary.png) |
| Ownership, 375×812 | [Screenshot](screenshots/before/ownership-375-mobile.png) | [Screenshot](screenshots/after/ownership-375-mobile.png) |

Additional captures:

- Desktop minimum/default/maximum: [360px](screenshots/after/rust-1440-minimum.png), [470px](screenshots/after/rust-1440-default.png), [600px](screenshots/after/rust-1440-maximum.png).
- Panned and zoomed resize sequence: [before](screenshots/after/rust-1440-resize-before-panned-zoomed.png), [during](screenshots/after/rust-1440-resize-during-mouse.png), [after](screenshots/after/rust-1440-resize-after-mouse.png).
- [Keyboard focus](screenshots/after/rust-1440-keyboard-focus.png), [touch resize](screenshots/after/rust-1440-touch-resized.png), [reduced motion](screenshots/after/ownership-390-reduced-motion.png), and [200% text enlargement](screenshots/after/ownership-390-text-enlarged-200.png).
- The complete before and after image sets are in [`screenshots/before/`](screenshots/before/) and [`screenshots/after/`](screenshots/after/).

Manual inspection found no horizontal overflow, unreadable text, broken relationship lines, shifted camera, or ring alignment defect in the captured states. At 769px, the selected Stack & Heap body is centered and Memory and Operating Systems remain visible. The atmospheric boundary is restrained in the desktop crop and stronger at the mobile top edge. The fade itself does not intercept canvas input; the browser hit test at eight pixels inside the universe boundary reaches the graph canvas.

## Interaction and continuity

- Desktop bounds at 1440px: 360px minimum, 470px default, 600px maximum. At 1024px: 360–512px, default 470px. At 769px: 360–384px, default 384px. Desktop keeps at least half the viewport for the graph.
- Mouse and touch pointer drags widened the panel when the left edge moved left. Touch cancellation restored the starting width. Pointer capture is released on completion and cancellation; blur and unmount cleanup are covered by regression tests.
- ArrowLeft/ArrowRight adjust width; Home/End select minimum/maximum. The separator exposes its width, bounds, orientation, controlled panel, keyboard shortcuts, and a visible focus outline. Mobile renders no separator.
- A 130px mouse resize preserved Rust at `/concept/rust`; a browser hit test during drag did not change the concept URL. The browser sequence Rust → Ownership → Memory → Stack & Heap → Operating Systems retained the selected 540px width, as did Back and Home.
- The panned and zoomed capture sequence shows Rust, Ownership, and Memory staying in place while the canvas edge moves. Deterministic canvas tests also check the WebGL backing size, stable node coordinates, and camera `y`/zoom while compensating `x`.
- The production WebGL controller test checks that resizing updates the existing renderer and does not create/dispose celestial bodies. Browser counters remained at one production canvas and one WebGL context; buffer, texture, program, and shader counters did not change across the measured resize sequence.
- All original knowledge sections remain. Tests cover true SOURCE → TARGET relationship paths and explanations, provenance/source links, status and empty state, plus the existing scroll-to-top behavior.

Width persistence is session/component state only; it is not stored across reloads.

## Performance evidence

The machine-readable runs are [`baseline.json`](performance/baseline.json) and [`after.json`](performance/after.json). Both used Chromium 151.0.7922.173, DPR 1, reduced motion off, and SwiftShader software WebGL. The canvas began at 970×900 and ended at 840×900 in both runs. The baseline used viewport resizing because GIM-52 had no panel handle; the after run used the separator. Each measured window includes two additional return-and-repeat cycles.

| Measure | GIM-52 | GIM-53 |
| --- | ---: | ---: |
| First resize command / 130px drag | 663ms | 4,714ms |
| Canvas ResizeObserver-to-next-frame samples | 5; p50 307.6ms, p95 396.4ms, max 546ms | 66; p50 241.8ms, p95 348.1ms, max 424.1ms |
| Pointer event to next animation frame | Not available | 70 samples; p50 0.7ms, p95 4.1ms, max 10.6ms |
| Sampled frame intervals | 26; p50 100ms, p95 283.3ms, max 416.6ms | 234; p50 50ms, p95 266.8ms, max 400.1ms |
| Long Tasks during resize measurement window | 5, 1,684ms total, max 536ms | 65, 18,115ms total, max 449ms |
| Production canvas / WebGL contexts | 1 / 1 | 1 / 1 |

The software-rendered drag takes several seconds for the 13-step synthetic pointer movement, and the after run accumulates long tasks while repeatedly resizing. The baseline also has long resize-frame intervals. These are SwiftShader results, not a physical-GPU acceptance result. The immediate pointer-event-to-frame sample remains low, while canvas resize-to-frame remains slow in this environment. No rendering quality or celestial detail was reduced. A physical Intel UHD630-class run remains for GIM-54.

Navigation and load samples are included in the JSON. They varied between runs, so this QA does not attribute their differences to the panel. The repository does not expose browser-side celestial lifecycle counters; body creation/disposal stability is verified by the controller regression test.

## Validation

See [`validation-results.md`](validation-results.md) for the exact commands, counts, warnings, and environment. The implementation patch is [`IMPLEMENTATION.patch`](IMPLEMENTATION.patch), against the required base SHA. QA logs are under [`logs/`](logs/).

No implementation code was pushed, no new PR was created, and PR #5 and `main` were not modified. Only this QA evidence is being published to `gim51-qa-artifact`.
