# GIM-52 Codeac cleanup QA report

Generated: 2026-10-10 13:06 UTC
Repository: `gimesha-adikari/entrelis`
Source branch: `m1-5-local-universe-ui`
Baseline SHA: `520f7d40ccbe61f6dd0672e91e2d4e83075f105f`

## Scope and source changes

The cleanup is limited to two files and preserves the GIM-52 rendering behavior:

- `src/features/knowledge-graph/__tests__/filament-motion.test.tsx`
- `src/features/knowledge-graph/celestial-3d/ring-occlusion.ts`

The mocked celestial layer now registers `onRingOcclusionChange` in `React.useEffect` and clears the same callback during cleanup. A regression test verifies registration on mount and cleanup on unmount. Before the effect cleanup was added, that test failed because the callback remained set after unmount; it passes with the lifecycle registration.

The ring fallback and alpha-mask builder now share `captureRingMaskTransform`, which centralizes their repeated matrix and rotation snapshot. Both paths retain the same inputs, order, and cached values.

## Codeac findings

The current PR #5 head remains the baseline SHA above. Its latest Codeac run (check run `114214759788`) completed with a successful check conclusion and reported **2 errors and 34 warnings**. The source cleanup has not been pushed, by instruction, so Codeac has not rescanned these changes and its remote counts do not yet reflect this patch.

Local validation confirms that the configured ESLint `react-hooks/immutability` rule has error severity, the changed test file passes ESLint, and the full lint command passes. The installed ESLint run did not reproduce the original Codeac annotation against the baseline file, so the Codeac service's post-change result remains pending until the reviewed source changes are later integrated. The callback mutation is now confined to an effect and its cleanup.

The `CodeDuplication` warning pair in `ring-occlusion.ts` is addressed by the shared transform helper above. The warning pair in `rendering/universe-renderer.test.ts` is intentionally left as inline setup: the adjacent cases exercise opposite safety outcomes for the same pending pulse, with one starting energy for a mask-safe edge and the other suppressing energy while an endpoint is unready. Keeping those inputs and assertions visible in each test makes the contrasting safety conditions easier to audit; extracting a helper would obscure that difference without changing production code.

## Review and publication boundary

The remote feature branch and PR #5 were verified at the baseline SHA before work. PR #5 was OPEN and UNMERGED. No source commit was created or pushed, and PR #5 was not modified. The implementation changes remain uncommitted in the isolated source worktree. Only the files in this QA package are published to the existing `gim51-qa-artifact` branch.

## Limitations

Browser/GPU performance was not in scope for this code-quality cleanup. This package makes no new physical-GPU performance claim. Codeac's post-change status awaits independent review and later source integration.
