# Entrelis Knowledge Writing Standard & Style Guide

> **Document ID:** `STD-KNOWLEDGE-2026-01`  
> **Status:** Canonical Working Standard  
> **Target Audience:** Content Authors, Domain Researchers, Knowledge Engineers, Editorial Reviewers  
> **Applies To:** All 7 Curated Seed Concepts, 26 Wave 1 Concepts, and 120 Total Research Candidates  
> **Branch:** `research/m2-knowledge-universe-01`  
> **Date:** October 2026  

---

## 1. Educational Mission & Philosophy

Entrelis is an interactive knowledge universe designed to reveal the inherent interconnectedness of human understanding. Its foundational axiom is:

> **Everything is connected. Pick somewhere to start.**

Reading an Entrelis article should feel like reading a masterfully crafted, beautifully illustrated textbook chapter written by an educator who combines technical rigor with pedagogical empathy. The universe does not exist to catalog trivia or present encyclopedic bullet points. It exists to foster deep, intuitive conceptual understanding and illuminate how individual ideas build upon, depend on, and transform one another.

### Core Editorial Tenets

1. **Continuous Educational Prose:** Every article is written as continuous, flowing prose organized into thoughtful paragraphs and thematic sections. We do not write bullet-pointed fact sheets, disconnected flashcards, or terse dictionary definitions.
2. **Beginner-Accessible, Expert-Respecting:** We write in clean, natural English. Complex concepts are introduced through intuitive analogies and concrete mental models before advancing to low-level implementation details. We eliminate needless jargon without diluting technical precision.
3. **Substantive Depth Without Filler:** Each article is substantial enough to teach its subject properly—typically **500 to 1,000 words** for core concepts. We provide real historical context, step-by-step physical or software mechanics, concrete code or execution walkthroughs, and edge cases.
4. **Source-Grounded Trust:** Every significant factual assertion is backed by authoritative primary literature, international standards, or seminal academic textbooks, signaled unobtrusively through compact, clickable inline references.
5. **Visible Interconnectedness:** No concept exists in a vacuum. Every article explicitly traces inbound prerequisites and outbound consequences, explaining *why* this idea connects to its neighbors in the Entrelis graph.

---

## 2. Canonical Article Anatomy

To maintain structural consistency across hundreds of concepts, every Entrelis article adheres to a unified seven-part anatomy:

```
┌──────────────────────────────────────────────────────────────┐
│  Article Frontmatter & Graph Metadata                        │
├──────────────────────────────────────────────────────────────┤
│  1. Introduction & The Core Mental Model                     │
│     - Foundational definition in plain English               │
│     - Intuitive physical or real-world analogy               │
├──────────────────────────────────────────────────────────────┤
│  2. Why It Matters: Motivation & Historical Context          │
│     - The engineering or theoretical problem it solved       │
│     - Why modern computing/science cannot function without it│
├──────────────────────────────────────────────────────────────┤
│  3. Architectural Anatomy & How It Works                     │
│     - Low-level step-by-step operational mechanics           │
│     - Hardware, kernel, or compiler interactions             │
├──────────────────────────────────────────────────────────────┤
│  4. Concrete Example & Practical Walkthrough                 │
│     - Real code snippet, byte pattern, or execution trace    │
│     - Line-by-line or cycle-by-cycle breakdown               │
├──────────────────────────────────────────────────────────────┤
│  5. Critical Distinctions & Common Misconceptions            │
│     - Precise debunking of frequent beginner confusions      │
│     - Explicit boundary definitions                          │
├──────────────────────────────────────────────────────────────┤
│  6. Interconnections in the Knowledge Universe               │
│     - Inbound connections (what you need to know first)      │
│     - Outbound connections (what this enables or leads to)   │
├──────────────────────────────────────────────────────────────┤
│  7. Authoritative References & Evidence Ledger               │
│     - Numbered source mapping with exact chapters & URLs     │
│     - Transparent verification tier disclosures              │
└──────────────────────────────────────────────────────────────┘
```

### Frontmatter Schema (Markdown Header)

Every article must begin with standard metadata comments or frontmatter:

```markdown
# [Concept Name] (`concept-[slug]`)

> **Identifier:** `concept-[slug]`  
> **Primary Domains:** `[domain-1]`, `[domain-2]`  
> **Direct Graph Adjacencies:** `[concept-a]`, `[concept-b]`, `[concept-c]`  
> **Review Status:** `needs-review` (or `reviewed`)  
```

---

## 3. Small Inline References Standard (Mandatory Requirement)

To balance academic rigor with an immersive reading experience, Entrelis enforces a strict inline referencing style. Citations must substantiate factual claims without cluttering the page or interrupting the reader's cognitive flow.

### Citation Rules

1. **Compact Numbered Hyperlinks:** Use bracketed numbers hyperlinked directly to the source URL or specific document section:
   ```markdown
   An Instruction Set Architecture defines the contract between software and hardware. [1](https://riscv.org/technical/specifications/)
   ```
2. **Placement at Logical Boundaries:** Citations must be placed at the end of clauses, sentences, or paragraphs where a distinct factual claim or architectural detail is introduced.
3. **No Sentence-by-Sentence Density:** Do **NOT** attach citation markers to every sentence. Group corroborating assertions naturally and cite at the conclusion of the substantive passage.
4. **No Prose Clutter:** Never insert raw URLs, publisher names, author lists, or full book titles into the narrative prose. The prose remains pure storytelling and explanation.
5. **Citation Number Reuse:** If a source supports multiple distinct claims throughout an article, reuse the exact same citation number (`[1]`, `[2]`, etc.) consistently throughout that article.
6. **Deep Linking Preference:** Wherever an open-access standard or official documentation provides deep section anchors or chapter-specific URLs, link to that specific section rather than the generic homepage.
7. **Traceability:** Every numbered inline citation in the body must correspond to an entry in **Section 7: Authoritative References** at the foot of the article, specifying the exact chapter, section, page range, and evidence tier.

### Reader UI Rendering Specification (For Future Frontend Implementation)

In the interactive Entrelis reading interface, citations should be presented with dedicated typographic treatment:

- **Styling:** Rendered in small, elegant superscript-style typography (`0.75em` font size, `baseline` or `super` alignment).
- **Subtlety:** Styled with subdued secondary color tokens (e.g., `#71717A` in dark mode), shifting to high-contrast cyan or indigo on hover.
- **Interactivity:** Tapping or hovering a citation marker opens an inline popover preview card displaying:
  - Source Title & Author
  - Exact Chapter / Section Location
  - Verification Status Pill (`DIRECT-FULL-TEXT-VERIFIED`, `CHAPTER-CONFIRMED`, etc.)
  - Direct external link to open access or DOI repository.

---

## 4. Evidence Tiers & Factual Rigor

Factual precision is paramount. Entrelis articles are held to academic standards of integrity:

### The Four Evidence Tiers

| Evidence Tier | Criteria | Example Sources | Permissible Claims |
| :--- | :--- | :--- | :--- |
| **Tier 1: Direct Full-Text Verified** | Open-access specification, documentation, or open textbook whose complete text was directly examined and verified. | *RISC-V Volume I*, *OSTEP*, *POSIX.1-2017*, *Intel SDM* | Exact architectural mechanisms, register names, bitfield formats, system call behaviors, standard function signatures. |
| **Tier 2: Chapter & Syllabus Confirmed** | Authoritative copyrighted textbook whose official publisher table of contents, chapter headings, and curriculum syllabus were verified. | *Patterson & Hennessy (COD)*, *Bryant & O'Hallaron (CS:APP)* | Standard pedagogical models, historical attributions, broad architectural definitions, canonical textbook taxonomies. |
| **Tier 3: Paywalled Abstract & Corroborated** | Seminal primary literature behind academic paywalls whose abstract, DOI, and structural taxonomy were verified and corroborated by Tier 1 sources. | *Denning (1970) Virtual Memory*, *Lamport (1978) Logical Clocks* | Historical genesis, seminal nomenclature, core mathematical theorems, foundational architectural terminology. |
| **Tier 4: Archival Primary Verified** | Digitized historical papers, original laboratory notes, or milestone registries. | *IEEE Milestone: Invention of the Transistor (1947)*, *Shannon (1938)* | Chronological dates, primary inventor names, original hardware mechanisms, archival milestones. |

### Absolute Verification Prohibitions

- **Never Fabricate Page Numbers:** If an interior page number was not personally confirmed from the physical or digital text, cite the chapter, section, or appendix heading instead.
- **Never Conflate Metadata with Content:** The existence of an ISBN, DOI, or Amazon listing does not prove that an asserted technical nuance appears in the book.
- **Explicit Limitation Disclosures:** If a paper is paywalled or an edition has structural discrepancies, state the limitation openly in the article's reference notes.

---

## 5. Pedagogical Writing Rules

### Rule 1: Anchor the Abstract in the Tangible
Never open an article with formal algebraic definitions or bare specifications. Open with what the human programmer or physical machine actually experiences.
- *Poor:* "Virtual memory is a contiguous abstraction of storage space that decouples logical addressing from physical DRAM addresses using multi-level page tables."
- *Excellent:* "When a program reads an integer from memory, it might imagine that it possesses the entire physical memory of the computer—a vast, neatly numbered street where every house is exclusively its own. In reality, modern computers run dozens of programs simultaneously, all sharing the same physical chips. Virtual memory is the architectural magic trick that gives every program this private, idealized illusion while quietly juggling the physical reality beneath."

### Rule 2: Expose the Mechanics Step by Step
Walk through the machine's actions chronologically. Show how signals travel from code to kernel to silicon. Trace the exact sequence of events during a cache miss, an instruction decode, a page fault, or a thread context switch.

### Rule 3: Use Concrete, Minimal Code & Traces
Illustrate concepts with real, readable code (Rust, C, assembly, or pseudocode) and explain what every line or byte achieves. Keep examples under 25 lines, tightly focused on the architectural principle.

### Rule 4: Tackle Misconceptions Directly
Learners carry persistent misconceptions (e.g., that virtual memory is software swapping, that concurrency requires multi-core hardware, or that assembly language is machine code). Dedicate a distinct section to dispelling these errors with precision and empathy.

### Rule 5: Weave the Graph
Never end an article abruptly. Conclude by charting pathways outward into the wider Entrelis universe. Highlight the specific relationships connecting this node to preceding prerequisites and advanced downstream concepts.

---

## 6. Article Editorial Review Checklist

Before any concept article is promoted from `needs-review` to `reviewed`, an editor must verify:

- [ ] **Word Count:** Substantial depth (500–1,000 words of core prose, excluding frontmatter and bibliography).
- [ ] **Prose Flow:** Written in continuous educational paragraphs, completely devoid of bare bullet-point summaries in the main explanation.
- [ ] **Readability:** Plain, engaging English accessible to undergraduate computer science students and self-taught developers.
- [ ] **Inline Reference Quality:** Compact `[n](url)` citations placed at major factual assertions; no raw URLs in body; no sentence-level clutter.
- [ ] **Exact Location Traceability:** Every inline citation maps to a documented chapter, section, or page range in Section 7.
- [ ] **No Fabrications:** Zero invented citations, page numbers, or claims.
- [ ] **Misconceptions Addressed:** At least two persistent conceptual pitfalls addressed and clarified with technical rigor.
- [ ] **Graph Integrity:** All referenced concept and relationship IDs exist in the canonical Entrelis graph and match directional semantics.
- [ ] **Candidate Invariant:** Article maintains `reviewStatus: "needs-review"` pending formal human editorial sign-off.
