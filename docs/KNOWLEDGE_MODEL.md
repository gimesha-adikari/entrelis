# Entrelis Knowledge Model & Provenance

This document specifies the domain schema, provenance architecture, and authoring guidelines for knowledge in Entrelis.

---

## 1. Core Principles

1. **Concepts are first-class entities:** Ideas possess stable identity independent of presentation strings.
2. **Relationships are first-class entities:** Connections between concepts are explicit, directed, and carry explanatory meaning.
3. **Sources are first-class entities:** Claims are backed by authoritative bibliographic references.
4. **Mandatory provenance:** No concept or relationship may exist in the graph without at least one verifiable source citation. AI output is never treated as a source.
5. **Human-readable explanations:** Edges explain _why_ two concepts connect in clear, accessible language.
6. **Database-agnostic & verifiable:** Stored in plain, statically typed TypeScript records that can be validated in CI and migrated into relational or graph databases when required.

---

## 2. Entities & Schema

### 2.1 Concept

A `Concept` represents a distinct idea, technology, system, or scientific principle.

| Field               | Type                | Required | Description                                               |
| :------------------ | :------------------ | :------- | :-------------------------------------------------------- |
| `id`                | `string`            | Yes      | Stable machine identifier (e.g. `concept-rust`).          |
| `slug`              | `string`            | Yes      | URL-friendly unique identifier (e.g. `rust`).             |
| `name`              | `string`            | Yes      | Primary display title (e.g. `"Rust"`).                    |
| `shortDescription`  | `string`            | Yes      | Concise, accessible summary (1–2 sentences).              |
| `description`       | `string`            | No       | Optional in-depth conceptual narrative.                   |
| `domains`           | `readonly string[]` | Yes      | High-level fields of study (e.g. `["computer-science"]`). |
| `tags`              | `readonly string[]` | Yes      | Granular thematic keywords.                               |
| `sourceIds`         | `readonly string[]` | Yes      | Array of valid `Source.id` references (non-empty).        |
| `reviewStatus`      | `ReviewStatus`      | Yes      | Editorial lifecycle status.                               |
| `aliases`           | `readonly string[]` | No       | Alternate names or acronyms.                              |
| `interactiveModule` | `string`            | No       | Identifier for an optional interactive module.            |

### 2.2 Relationship

A `Relationship` represents a directed, semantic connection between two concepts.

| Field             | Type                   | Required | Description                                             |
| :---------------- | :--------------------- | :------- | :------------------------------------------------------ |
| `id`              | `string`               | Yes      | Stable machine identifier (e.g. `rel-rust-ownership`).  |
| `sourceConceptId` | `string`               | Yes      | Origin concept ID.                                      |
| `targetConceptId` | `string`               | Yes      | Destination concept ID (self-loops disallowed).         |
| `type`            | `RelationshipType`     | Yes      | Controlled relationship classification.                 |
| `explanation`     | `string`               | Yes      | Clear explanation of why the edge exists.               |
| `strength`        | `RelationshipStrength` | Yes      | Priority rating for graph layout and filtering.         |
| `sourceIds`       | `readonly string[]`    | Yes      | Array of supporting `Source.id` references (non-empty). |
| `reviewStatus`    | `ReviewStatus`         | Yes      | Editorial lifecycle status.                             |

#### Controlled Relationship Types (`RelationshipType`)

- `depends-on`: Target is a prerequisite or foundational requirement for the source.
- `enables`: Source makes target possible, practical, or safe.
- `part-of`: Target is a structural component or segment of the source.
- `implemented-with`: Source is physically or logically realized using the target.
- `related-to`: Conceptual, architectural, or historical connection.
- `leads-to`: Direct causal, historical, or intellectual progression.
- `contrasts-with`: Opposing or alternative conceptual paradigm.

#### Relationship Strength (`RelationshipStrength`)

- `primary`: Core defining relationship fundamental to understanding the concept.
- `strong`: High-significance relationship frequently relevant during topic exploration.
- `supporting`: Contextual or historical connection providing deeper breadth.

### 2.3 Source

A `Source` represents an authoritative bibliographic reference that validates a claim.

| Field             | Type         | Required | Description                                       |
| :---------------- | :----------- | :------- | :------------------------------------------------ |
| `id`              | `string`     | Yes      | Stable machine identifier (e.g. `src-rust-book`). |
| `title`           | `string`     | Yes      | Full title of the publication or documentation.   |
| `url`             | `string`     | Yes      | Authoritative, accessible canonical URL.          |
| `publisher`       | `string`     | Yes      | Organization, institution, or publishing house.   |
| `author`          | `string`     | No       | Author(s) or editor(s).                           |
| `type`            | `SourceType` | Yes      | Bibliographic category.                           |
| `publicationDate` | `string`     | No       | Publication date or year.                         |
| `accessDate`      | `string`     | No       | Date retrieved or verified by editor.             |
| `notes`           | `string`     | No       | Scope of claims supported by this citation.       |
| `license`         | `string`     | No       | License or usage terms (if relevant).             |

#### Source Types (`SourceType`)

- `official-documentation`: Primary vendor or foundation documentation (e.g., Rust Reference).
- `textbook`: Standard academic or university textbook.
- `academic`: Peer-reviewed research paper or journal publication.
- `standards`: Formal specification (e.g., IEEE, ISO/IEC, RFC, W3C).
- `educational`: Verified educational institution curriculum.
- `primary-source`: Historical patent, original manuscript, or foundational paper.
- `reference`: Curated authoritative reference work or encyclopedia.

### 2.4 Review Status Lifecycle (`ReviewStatus`)

- `draft`: Initial entry or unverified claim under active composition.
- `needs-review`: Authored claim with proposed sources awaiting peer or editorial review.
- `reviewed`: Content reviewed by an editor for clarity, accuracy, and tone.
- `verified`: Manually checked against the cited primary/authoritative sources; provenance and claims confirmed.

---

## 3. Concrete Example: `Rust → Ownership`

### Concept: Rust

```ts
{
  id: "concept-rust",
  slug: "rust",
  name: "Rust",
  shortDescription:
    "A systems programming language designed for performance and memory safety without relying on an automated garbage collector.",
  description:
    "Rust achieves compile-time safety through an innovative type system centered around ownership, borrowing, and strict concurrency rules.",
  domains: ["programming-languages", "computer-science"],
  tags: ["systems-programming", "type-safety", "compilers"],
  sourceIds: ["src-rust-book"],
  reviewStatus: "verified",
}
```

### Concept: Ownership

```ts
{
  id: "concept-ownership",
  slug: "ownership",
  name: "Ownership",
  shortDescription:
    "A compile-time memory management discipline where every resource has a unique owner and an automatic lifetime.",
  description:
    "In ownership-based systems, each value is bound to a single variable binding at any given moment. When the owner goes out of scope, the associated resource is automatically deallocated.",
  domains: ["programming-languages", "computer-science"],
  tags: ["memory-management", "type-system", "borrow-checker"],
  sourceIds: ["src-rust-book", "src-rust-reference"],
  reviewStatus: "verified",
}
```

### Relationship: Rust → Ownership

```ts
{
  id: "rel-rust-ownership",
  sourceConceptId: "concept-rust",
  targetConceptId: "concept-ownership",
  type: "enables",
  explanation:
    "Rust relies on an ownership and borrowing model enforced at compile time to guarantee memory safety without garbage collection overhead.",
  strength: "primary",
  sourceIds: ["src-rust-book"],
  reviewStatus: "verified",
}
```

### Source: The Rust Programming Language

```ts
{
  id: "src-rust-book",
  title: "The Rust Programming Language",
  url: "https://doc.rust-lang.org/book/",
  publisher: "Rust Foundation / No Starch Press",
  author: "Steve Klabnik and Carol Nichols",
  type: "official-documentation",
  publicationDate: "2024",
  notes: "Authoritative official guide detailing Rust language semantics and ownership.",
  license: "MIT / Apache 2.0 dual license",
}
```

---

## 4. Authoring Guidelines

### Adding a Source

1. Append the source record to [`src/data/seed/sources.ts`](../src/data/seed/sources.ts).
2. Use the ID prefix convention `src-<identifier>` (e.g. `src-knuth-taocp`).
3. Ensure the URL is canonical, active, and points to primary or authoritative publisher sites.

### Adding a Concept

1. Append the concept to [`src/data/seed/concepts.ts`](../src/data/seed/concepts.ts).
2. Assign a stable machine ID with prefix `concept-<slug>` (e.g. `concept-virtual-memory`).
3. Verify that all referenced `sourceIds` exist in `sources.ts`.
4. Compose an original summary in accessible prose; do not copy copyrighted text verbatim.

### Adding a Relationship

1. Append the relationship to [`src/data/seed/relationships.ts`](../src/data/seed/relationships.ts).
2. Assign a stable machine ID with prefix `rel-<source>-<target>` (e.g. `rel-memory-stack-and-heap`).
3. Ensure both `sourceConceptId` and `targetConceptId` exist in `concepts.ts`.
4. Self-loops (`sourceConceptId === targetConceptId`) are rejected by validation.
5. Provide a 1–2 sentence human-readable `explanation` explaining the connection.
6. Reference at least one valid source in `sourceIds` that directly supports the relationship claim.

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
