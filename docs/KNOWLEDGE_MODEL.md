# Entrelis Knowledge Model & Provenance

This document specifies the domain schema, relationship direction invariants, provenance architecture, and authoring guidelines for knowledge in Entrelis.

---

## 1. Core Principles

1. **Concepts are first-class entities:** Ideas possess stable identity independent of presentation strings.
2. **Relationships are first-class entities:** Connections between concepts are explicit, directed, and carry explanatory meaning.
3. **Relationship-direction invariant:** All relationship types must read naturally as:
   $$\text{SOURCE} \xrightarrow{\text{TYPE}} \text{TARGET}$$
   (e.g., `Rust --uses--> Ownership`, `Memory --includes--> Stack & Heap`, `Operating Systems --depends-on--> CPUs`).
4. **Sources are first-class entities:** Claims are backed by authoritative bibliographic references.
5. **Mandatory provenance:** No concept or relationship may exist in the graph without at least one verifiable source citation. AI output is never treated as a source.
6. **Human-readable explanations:** Edges explain _why_ two concepts connect in clear, accessible language.
7. **Database-agnostic & verifiable:** Stored in plain, statically typed TypeScript records that can be validated in CI and migrated into relational or graph databases when required.

---

## 2. Entities & Schema

### 2.1 Concept

A `Concept` represents a distinct idea, technology, system, or scientific principle.

| Field               | Type                | Required | Description                                                                   |
| :------------------ | :------------------ | :------- | :---------------------------------------------------------------------------- |
| `id`                | `string`            | Yes      | Stable machine identifier (e.g. `concept-rust`).                              |
| `slug`              | `string`            | Yes      | URL-friendly unique identifier (e.g. `rust`).                                 |
| `name`              | `string`            | Yes      | Primary display title (e.g. `"Rust"`).                                        |
| `shortDescription`  | `string`            | Yes      | Concise, accessible summary (1–2 sentences).                                  |
| `description`       | `string`            | No       | Optional in-depth conceptual narrative.                                       |
| `domains`           | `readonly string[]` | Yes      | High-level fields of study (e.g. `["computer-science"]`).                     |
| `tags`              | `readonly string[]` | Yes      | Granular thematic keywords.                                                   |
| `sourceIds`         | `readonly string[]` | Yes      | Array of valid `Source.id` references (non-empty).                            |
| `reviewStatus`      | `ReviewStatus`      | Yes      | Editorial lifecycle status (`draft`, `needs-review`, `reviewed`, `verified`). |
| `aliases`           | `readonly string[]` | No       | Alternate names or acronyms.                                                  |
| `interactiveModule` | `string`            | No       | Identifier for an optional interactive module.                                |

### 2.2 Relationship

A `Relationship` represents a directed, semantic connection between two concepts.

| Field             | Type                   | Required | Description                                                                 |
| :---------------- | :--------------------- | :------- | :-------------------------------------------------------------------------- |
| `id`              | `string`               | Yes      | Stable machine identifier (e.g. `rel-rust-ownership`).                      |
| `sourceConceptId` | `string`               | Yes      | Origin concept ID.                                                          |
| `targetConceptId` | `string`               | Yes      | Destination concept ID (self-loops disallowed).                             |
| `type`            | `RelationshipType`     | Yes      | Controlled relationship classification adhering to the direction invariant. |
| `explanation`     | `string`               | Yes      | Clear explanation of why the edge exists.                                   |
| `strength`        | `RelationshipStrength` | Yes      | Priority rating for graph layout and filtering.                             |
| `sourceIds`       | `readonly string[]`    | Yes      | Array of supporting `Source.id` references (non-empty).                     |
| `reviewStatus`    | `ReviewStatus`         | Yes      | Editorial lifecycle status.                                                 |

#### Direction Invariant & Controlled Types (`RelationshipType`)

Every edge must read forward from source to target: `SOURCE --TYPE--> TARGET`.

- `uses`: Source employs Target as an internal mechanism, tool, or discipline (e.g. `Rust --uses--> Ownership`).
- `manages`: Source actively governs the allocation, state, or lifecycle of Target (e.g. `Ownership --manages--> Memory`, `Operating Systems --manages--> Memory`).
- `includes`: Source structurally contains or encompasses Target as an internal region, mode, or component (e.g. `Memory --includes--> Stack & Heap`).
- `depends-on`: Source relies on Target as an underlying substrate or operational prerequisite (e.g. `Stack & Heap --depends-on--> Operating Systems`, `Operating Systems --depends-on--> CPUs`).
- `part-of`: Source is a constituent sub-component of Target (e.g. `Arithmetic Logic Unit --part-of--> CPU`). Note: `A --part-of--> B` means A is part of B.
- `implemented-with`: Source is physically or architecturally realized using Target (e.g. `CPUs --implemented-with--> Transistors`).
- `related-to`: Conceptual, architectural, or domain relationship where both topics intersect significantly.
- `leads-to`: Direct causal, historical, or intellectual progression.
- `contrasts-with`: Opposing or alternative conceptual paradigm.

#### Relationship Strength (`RelationshipStrength`)

- `primary`: Core defining relationship fundamental to understanding the concept.
- `strong`: High-significance relationship frequently relevant during topic exploration.
- `supporting`: Contextual or historical connection providing deeper breadth.

### 2.3 Source

A `Source` represents an authoritative bibliographic reference that validates a claim.

| Field             | Type         | Required | Description                                                      |
| :---------------- | :----------- | :------- | :--------------------------------------------------------------- |
| `id`              | `string`     | Yes      | Stable machine identifier (e.g. `src-rust-book`).                |
| `title`           | `string`     | Yes      | Full title of the publication or documentation.                  |
| `url`             | `string`     | Yes      | Authoritative, accessible canonical URL.                         |
| `publisher`       | `string`     | Yes      | Organization, institution, or publishing house.                  |
| `author`          | `string`     | No       | Author(s) or editor(s).                                          |
| `type`            | `SourceType` | Yes      | Bibliographic category.                                          |
| `publicationDate` | `string`     | No       | Publication date or version date (omitted for living documents). |
| `accessDate`      | `string`     | No       | Date retrieved or verified by editor.                            |
| `notes`           | `string`     | No       | Scope of claims supported by this citation.                      |
| `license`         | `string`     | No       | License or usage terms (if confirmed from source).               |

#### Source Types (`SourceType`)

- `official-documentation`: Primary project or foundation documentation (e.g., The Rust Reference).
- `textbook`: Standard academic or university textbook.
- `academic`: Peer-reviewed research paper or journal publication.
- `standards`: Formal specification (e.g., IEEE, ISO/IEC, RFC, W3C).
- `educational`: Verified educational institution curriculum.
- `primary-source`: Historical patent, original lab notebook, or contemporaneous publication.
- `reference`: Curated authoritative historical retrospective, milestone page, or encyclopedia entry.

### 2.4 Review Status Lifecycle (`ReviewStatus`)

- `draft`: Initial entry or unverified claim under active composition.
- `needs-review`: Authored claim with proposed sources awaiting peer or editorial review.
- `reviewed`: Content reviewed by an editor for clarity, accuracy, and tone against cited material. (All curated initial seed entries start in this state).
- `verified`: Reserved for records whose claims and citation metadata have undergone a deliberate, independent source verification audit confirming that the stored claim matches the primary evidence.

---

## 3. Concrete Example: `Rust --uses--> Ownership`

### Concept: Rust

```ts
{
  id: "concept-rust",
  slug: "rust",
  name: "Rust",
  shortDescription:
    "A systems programming language that combines low-level hardware control with compile-time safety guarantees.",
  description:
    "In Safe Rust, ownership, borrowing, and the type system prevent many classes of memory-safety and concurrency errors without requiring an automated garbage collector. Unsafe Rust permits lower-level operations whose safety invariants must be upheld manually by the programmer.",
  domains: ["programming-languages", "computer-science"],
  tags: ["systems-programming", "type-safety", "compilers", "concurrency"],
  sourceIds: ["src-rust-book"],
  reviewStatus: "reviewed",
  aliases: ["Rust-lang"],
}
```

### Concept: Ownership

```ts
{
  id: "concept-ownership",
  slug: "ownership",
  name: "Ownership",
  shortDescription:
    "The set of rules that governs how a Rust program manages memory and resources at compile time.",
  description:
    "Rust associates each value with an owner. Moves transfer ownership, borrowing grants temporary access without taking ownership, and owned resources are dropped when their owner's lifetime ends.",
  domains: ["programming-languages", "computer-science"],
  tags: ["memory-management", "type-system", "borrow-checker", "lifetimes"],
  sourceIds: ["src-rust-book", "src-rust-reference"],
  reviewStatus: "reviewed",
  aliases: ["Rust Ownership", "Ownership Model"],
  interactiveModule: "module-rust-ownership",
}
```

### Relationship: Rust --uses--> Ownership

```ts
{
  id: "rel-rust-ownership",
  sourceConceptId: "concept-rust",
  targetConceptId: "concept-ownership",
  type: "uses",
  explanation:
    "Rust uses its ownership and borrowing system to enforce memory safety and prevent data races at compile time in Safe Rust without needing an automated garbage collector.",
  strength: "primary",
  sourceIds: ["src-rust-book"],
  reviewStatus: "reviewed",
}
```

### Source: The Rust Programming Language

```ts
{
  id: "src-rust-book",
  title: "The Rust Programming Language",
  url: "https://doc.rust-lang.org/book/",
  publisher: "The Rust Project",
  author: "Steve Klabnik, Carol Nichols, Chris Krycho, and contributions from the Rust Community",
  type: "official-documentation",
  accessDate: "2026-10-06",
  notes: "Official living documentation detailing Rust language semantics, ownership, borrowing, lifetimes, and safety guarantees. Published in print by No Starch Press.",
  license: "MIT / Apache-2.0 dual license",
}
```

---

## 4. Authoring Guidelines

### Adding a Source

1. Append the source record to [`src/data/seed/sources.ts`](../src/data/seed/sources.ts).
2. Use the ID prefix convention `src-<identifier>` (e.g. `src-knuth-taocp`).
3. Ensure the URL is canonical, active, and points to primary or authoritative publisher sites.
4. For living online documentation, omit a fixed publication date and provide `accessDate`.

### Adding a Concept

1. Append the concept to [`src/data/seed/concepts.ts`](../src/data/seed/concepts.ts).
2. Assign a stable machine ID with prefix `concept-<slug>` (e.g. `concept-virtual-memory`).
3. Verify that all referenced `sourceIds` exist in `sources.ts`.
4. Compose an original summary in accessible prose; do not copy copyrighted text verbatim.
5. Initialize new concepts as `draft` or `reviewed`.

### Adding a Relationship

1. Append the relationship to [`src/data/seed/relationships.ts`](../src/data/seed/relationships.ts).
2. Assign a stable machine ID with prefix `rel-<source>-<target>` (e.g. `rel-memory-stack-and-heap`).
3. Ensure both `sourceConceptId` and `targetConceptId` exist in `concepts.ts`.
4. Enforce the direction invariant: the statement must read forward as `SOURCE --TYPE--> TARGET`.
5. Self-loops (`sourceConceptId === targetConceptId`) are rejected by validation.
6. Provide a 1–2 sentence human-readable `explanation` explaining the connection.
7. Reference at least one valid source in `sourceIds` that directly supports the relationship claim.

---

## 5. Running Validation & Tests

Validation runs automatically as part of the test suite:

```bash
# Run automated tests and validation suite
npm run test

# Run TypeScript type check
npm run typecheck

# Run linter
npm run lint
```

The validation module (`src/domain/knowledge/validation.ts`) verifies:

- Uniqueness of concept IDs and slugs.
- Uniqueness of relationship IDs and source IDs.
- Relational integrity: endpoints reference existing concepts.
- Provenance integrity: concepts and relationships reference existing sources.
- No empty source arrays or blank required fields.
- No self-referencing relationship loops.
- Adherence to controlled taxonomy types and review statuses.

---

## 6. Intentionally Deferred

The following capabilities are deliberately deferred to future milestones:

- Graph rendering and interactive visualization engines (D3, Cytoscape, WebGL).
- Dynamic database persistence (PostgreSQL, SQLite, Neo4j, Prisma, Drizzle).
- Ingestion pipelines, scrapers, and external synchronization workers.
- AI-driven relationship suggestion or summarization tooling.
- User accounts, public submission portals, and collaborative web editors.
