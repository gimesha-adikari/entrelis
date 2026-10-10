# Validation results

Baseline: `520f7d40ccbe61f6dd0672e91e2d4e83075f105f`
Runtime: Node `v22.23.3`, npm `11.9.0`

All required project commands ran in the isolated source worktree after clean dependency installation.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 444 packages installed in 9s |
| `npm run format:check` | PASS | All files match Prettier style |
| `npm run lint` | PASS | ESLint exited 0 |
| `npm run typecheck` | PASS | TypeScript exited 0 |
| `npm run test` | PASS | 35 files, 332 tests passed |
| `npm run build` | PASS | Next.js production build completed |
| `git diff --check` | PASS | No whitespace errors |

The prior baseline had 35 test files and 331 tests. The cleanup adds one callback-lifecycle regression test, so the final total is 332 tests. The two focused files (`filament-motion.test.tsx` and `ring-occlusion.test.ts`) also passed together: 18 tests across 2 files.

The changed test file passes direct ESLint. `eslint --print-config` reports `react-hooks/immutability` at error severity. The project lint output is clean. See `logs/` for the complete command output, focused test output, rule configuration, and the attempted baseline lint comparison.

Non-failing output: clean install reports the package's existing `eslint@9.39.5` deprecation notice; Vitest emits jsdom `HTMLCanvasElement.getContext()` notices during tests. The test process exits successfully with all 332 tests passing.
