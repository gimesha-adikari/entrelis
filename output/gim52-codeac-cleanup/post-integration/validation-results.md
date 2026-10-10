# Validation results

- Repository: `gimesha-adikari/entrelis`
- Baseline: `520f7d40ccbe61f6dd0672e91e2d4e83075f105f`
- Integrated commit: `30ce2e805c33474d0a2b84a359e66026543f562b`
- Node: `v22.23.3`
- npm: `11.9.0`

| Command | Result | Evidence |
|---|---|---|
| `npm ci` | PASS — clean install, 444 packages added | [`logs/npm-ci.log`](logs/npm-ci.log) |
| `npm run format:check` | PASS | [`logs/format-check.log`](logs/format-check.log) |
| `npm run lint` | PASS | [`logs/lint.log`](logs/lint.log) |
| `npm run typecheck` | PASS | [`logs/typecheck.log`](logs/typecheck.log) |
| `npm run test` | PASS — 35 files, 332 tests | [`logs/test.log`](logs/test.log) |
| `npm run build` | PASS | [`logs/build.log`](logs/build.log) |
| `git diff --check` | PASS | [`logs/diff-check.log`](logs/diff-check.log) |
