# GIM-52 cleanup post-integration verification

Generated: 2026-10-10 13:33 UTC
Repository: `gimesha-adikari/entrelis`
Source branch: `m1-5-local-universe-ui`
Baseline SHA: `520f7d40ccbe61f6dd0672e91e2d4e83075f105f`
Integrated commit: `30ce2e805c33474d0a2b84a359e66026543f562b`
Pull request: [#5](https://github.com/gimesha-adikari/entrelis/pull/5) — OPEN, UNMERGED

## Integration

The reviewed two-file cleanup was committed and pushed normally to the existing feature branch. PR #5 head equals `30ce2e805c33474d0a2b84a359e66026543f562b`. The comparison against the required baseline is one commit ahead and lists exactly these two files:

- `src/features/knowledge-graph/__tests__/filament-motion.test.tsx`
- `src/features/knowledge-graph/celestial-3d/ring-occlusion.ts`

No other implementation files were changed. The QA publication on `gim51-qa-artifact` contains verification artifacts only.

## Validation

Validation ran with Node `v22.23.3` and npm `11.9.0`. All requested commands passed:

- `npm ci` — passed (clean install; 444 packages added)
- `npm run format:check` — passed
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed, **35 test files / 332 tests**
- `npm run build` — passed
- `git diff --check` — passed

Full output is available under [`logs/`](logs/), with a summary in [`validation-results.md`](validation-results.md).

## Codeac on the new commit

Codeac completed check run [114224633087](https://github.com/gimesha-adikari/entrelis/runs/114224633087) for `30ce2e805c33474d0a2b84a359e66026543f562b` with conclusion `success` and reported **1 error and 32 warnings** (33 annotations). The previous baseline was 2 errors and 34 warnings.

- `react-hooks/immutability`: **resolved in this scan**; no such annotation appears on the new commit. The mock callback now registers and cleans up in an effect.
- `CodeDuplication` pair in `celestial-3d/ring-occlusion.ts`: **resolved in this scan**; no ring-occlusion duplication annotation appears.
- `rendering/universe-renderer.test.ts`: **the 8-line duplication pair remains** at lines 813 and 838. The reviewed report explains these are opposite safety cases (energy for a mask-safe edge versus suppression while an endpoint is unready), and keeps the setup inline so the contrasting conditions remain visible.
- Remaining error: the existing `braces` 3.0.3 advisory, CVE-2026-93687 (high; stack-exhaustion denial of service through deeply nested patterns).
- Remaining warnings: all 32 are `CodeDuplication` annotations. They are grouped below; the full annotation payload is in [`codeac-annotations.json`](codeac-annotations.json).

Remaining duplication findings (16 pairs / 32 annotations):

| File(s) | Pairs |
|---|---:|
| `celestial-3d/procedural/noise3d.ts` | 3 |
| `celestial-3d/attachments/attachments.test.ts` and `celestial-3d/procedural/textures.test.ts` | 3 |
| `celestial-3d/archetypes/factory.test.ts` and `celestial-3d/procedural/textures.test.ts` | 2 |
| `scene/build-local-scene.ts` | 2 |
| `rendering/universe-renderer.test.ts` | 1 |
| `rendering/hit-test.ts` | 1 |
| `rendering/glow-cache.ts` | 2 |
| `celestial-3d/controller.ts` | 2 |

## Vercel

The Vercel Preview deployment for `30ce2e805c33474d0a2b84a359e66026543f562b` completed successfully. GitHub deployment ID `6981599058` has status `success` (“Deployment has completed”), with preview URL: https://entrelis-5uut85bm0-gimeshas-projects.vercel.app. The separate `Vercel Preview Comments` check also completed successfully. The accessible GitHub deployment/status records provide this verification; the Vercel listing connector itself returned HTTP 403. See [`vercel-deployment.json`](vercel-deployment.json), [`github-check-runs.json`](github-check-runs.json), and [`logs/vercel-status.log`](logs/vercel-status.log).

## Evidence files

- [`validation-results.md`](validation-results.md)
- [`codeac-findings.md`](codeac-findings.md)
- [`codeac-check-run.json`](codeac-check-run.json)
- [`vercel-deployment.json`](vercel-deployment.json)
- [`github-check-runs.json`](github-check-runs.json)
- [`github-commit-status.json`](github-commit-status.json)
- [`codeac-annotations.json`](codeac-annotations.json)
- [`github-pr-verification.json`](github-pr-verification.json)
- [`github-compare-verification.json`](github-compare-verification.json)
- [`manifest.json`](manifest.json)
- [`post-integration.zip`](post-integration.zip) and [`post-integration.zip.sha256`](post-integration.zip.sha256)
