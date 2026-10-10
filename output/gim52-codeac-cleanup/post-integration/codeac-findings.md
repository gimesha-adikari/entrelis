# Codeac findings for the integrated commit

Commit: `30ce2e805c33474d0a2b84a359e66026543f562b`
Check run: [114224633087](https://github.com/gimesha-adikari/entrelis/runs/114224633087), completed with `success`.

Summary: **1 error, 32 warnings** (33 annotations). The previous baseline was 2 errors and 34 warnings.

- The `react-hooks/immutability` finding is absent from the completed new scan.
- The `CodeDuplication` pair in `celestial-3d/ring-occlusion.ts` is absent.
- The `CodeDuplication` pair in `rendering/universe-renderer.test.ts` remains at lines 813 and 838. The reviewed QA report documents why this pair is acceptable: its two adjacent test cases cover opposite mask-safety outcomes and keep the relevant setup visible.
- The sole error annotation is the existing `braces` 3.0.3 dependency advisory (CVE-2026-93687, high severity).
- The remaining 32 warnings are 16 CodeDuplication pairs: noise3d (3); attachments/textures tests (3); factory/textures tests (2); build-local-scene (2); universe-renderer.test (1); hit-test (1); glow-cache (2); controller (2).

The complete annotation payload is in [`codeac-annotations.json`](codeac-annotations.json).
