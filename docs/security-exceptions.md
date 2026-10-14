# Security Exception Record: braces@3.0.3 (GHSA-vfj7-8cjw-p6xm)

| Field | Value |
|---|---|
| **Subject Package** | `braces@3.0.3` |
| **Vulnerability Advisory** | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| **Severity** | High (Dev-only ReDoS / Stack Exhaustion) |
| **Status** | Approved Temporary Exception (Monitored) |
| **Approval Date** | October 14, 2026 |
| **Expiry Date** | December 12, 2026 (60-day window) |
| **Approved By** | Project Lead (Explicit M1.5 release authorization) |

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

`braces` enters the dependency graph exclusively as a 4th-level transitive dependency through `eslint-config-next@16.3.8` (developer tooling).

### 2.2 Production Bundle Exclusion

Targeted audit verification:

```bash
$ npm audit --omit=dev
found 0 vulnerabilities
```

- **Runtime Exclusion**: Neither `braces`, `micromatch`, `fast-glob`, nor `eslint-config-next` is included in the Next.js client application bundle, server runtime, or static export assets.
- **Production Impact**: **Zero**. Production deployments serving user traffic do not execute or bundle this package in any capacity.

### 2.3 Development & CI Exposure

- In development and CI pipelines, `braces` is invoked strictly by ESLint to resolve file-matching patterns specified in static repository configuration files (`eslint.config.mjs`).
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
2. **CI Isolation**: GitHub Actions and local CI runs execute in isolated, sandboxed environments with bounded execution timeouts (preventing persistent resource exhaustion).
3. **Automated Production Gate**: CI pipelines enforce `npm audit --omit=dev` to ensure no vulnerable packages ever leak into production dependencies.

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
