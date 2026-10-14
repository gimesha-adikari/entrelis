# Security Exception Record: braces@3.0.3 (GHSA-vfj7-8cjw-p6xm)

| Field                      | Value                                                                    |
| -------------------------- | ------------------------------------------------------------------------ |
| **Subject Package**        | `braces@3.0.3`                                                           |
| **Vulnerability Advisory** | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| **Severity**               | High (Dev-only ReDoS / Stack Exhaustion)                                 |
| **Status**                 | Approved Temporary Exception (Monitored)                                 |
| **Approval Date**          | October 14, 2026                                                         |
| **Expiry Date**            | December 12, 2026 (60-day window)                                        |
| **Approved By**            | Project Lead (Explicit M1.5 release authorization)                       |

---

## 1. Vulnerability & Affected Component

- **Package**: `braces@3.0.3`
- **Issue**: Uncontrolled resource consumption / stack-exhaustion Denial of Service when expanding deeply nested brace patterns (e.g., `{a,{b,{c,...}}}`).
- **CVSS Score**: 7.5 (High)

---

## 2. Dependency Graph & Exposure Analysis

### 2.1 Transitive Dependency Tree

Inspection via `npm ls braces`:

```
entrelis@0.1.0 /home/gimesha/My_Projects/entrelis
└─┬ eslint-config-next@16.3.8
  └─┬ @next/eslint-plugin-next@16.3.8
    └─┬ fast-glob@3.3.1
      └─┬ micromatch@4.0.8
        └── braces@3.0.3
```

`braces` enters the dependency graph exclusively as a 4th-level transitive dependency through `eslint-config-next@16.3.8`, which resides strictly under `devDependencies` in `package.json`.

### 2.2 Production Bundle Exclusion

Verified through three distinct architectural boundaries:

1. **Dependency Categorization**: Production dependencies in `package.json` are restricted to `next`, `react`, `react-dom`, and `three`. Neither ESLint nor its plugins are listed under runtime dependencies.
2. **Production Audit Verification**:
   ```bash
   $ npm audit --omit=dev
   found 0 vulnerabilities
   ```
   Omitting development dependencies verifies 0 vulnerabilities in the production dependency graph.
3. **Build Bundling Isolation**: Next.js 16 Turbopack build compilation (`npm run build`) bundles only client and server runtime code. ESLint configuration files and linting plugins are never evaluated, bundled, or served in production client assets or SSR runtime workers.

- **Production Impact**: **Zero**. Production deployments serving user traffic do not execute or bundle this package in any capacity.

### 2.3 Development & CI Exposure

- In development and CI pipelines, `braces` is invoked strictly by ESLint via `fast-glob`/`micromatch` to resolve static file-matching patterns specified in repository configuration (`eslint.config.mjs`).
- At no point is untrusted user input, dynamic web input, or external network payload passed to glob pattern expansion.

---

## 3. Rationale for Temporary Exception Over Forced Downgrade

Automated remediation tools propose:

```bash
$ npm audit fix --force
# Will install eslint-config-next@14.2.35, which is a breaking change
```

- **Incompatibility**: Downgrading `eslint-config-next` to `14.2.35` introduces severe breaking changes and incompatibilities with the project's Next.js 16 canary runtime and React 19 compiler pipeline.
- **False Fix**: Forced downgrade destabilizes core build and lint tooling without providing any tangible production security benefit, since production runtime has zero exposure.

---

## 4. Existing Safeguards & Mitigations

1. **Static Input Only**: File globs evaluated during linting are statically committed to the repository and governed by peer review.
2. **Automated CI Security Gate**: The GitHub Actions CI workflow (`.github/workflows/ci.yml`) executes `npm audit --omit=dev` as a blocking gate on every pull request targeting `main`. Any introduction of a vulnerable production dependency immediately fails CI.
3. **Automated Quality Gates**: In addition to security auditing, `.github/workflows/ci.yml` runs in an isolated runner on Node.js 22, executing:
   - `npm run typecheck` (strict TypeScript validation)
   - `npm run lint` (ESLint verification)
   - `npm test` (39 test suites, 376 unit & integration tests)
   - `npm run build` (Turbopack production build)
     with bounded step timeouts to prevent hanging or resource exhaustion.

---

## 5. Residual Risk Assessment

- **Residual Risk Level**: **Negligible**.
- Exploitation would require a malicious actor to possess direct commit access to alter repository glob configuration files, in which case arbitrary code execution could be achieved regardless of this specific advisory.

---

## 6. Review Triggers & Sunsetting Conditions

This exception is granted strictly for **60 days** and will expire on **December 12, 2026**.

### Review Triggers:

1. **Upstream Patch Available**: Upon release of an updated `eslint-config-next`, `@next/eslint-plugin-next`, or `fast-glob` utilizing a patched `micromatch`/`braces` release compatible with Next.js 16 canary.
2. **Dependency Tree Modification**: Any update to ESLint or Next.js core dependencies in `package.json`.
3. **Scheduled Expiry**: December 12, 2026, requiring re-evaluation before M2 milestone planning.
