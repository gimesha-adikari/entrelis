/**
 * Typed preview content mapping for enhanced Level 1 concept overviews.
 * Maintained separately from production seed datasets.
 * Keyed by stable concept IDs.
 */

export interface ConceptOverview {
  readonly conceptId: string;
  readonly slug: string;
  readonly title: string;
  readonly paragraphs: readonly [string, string];
  readonly wordCount: number;
}

export const SEED_CONCEPT_OVERVIEWS: Record<string, ConceptOverview> = {
  "concept-rust": {
    conceptId: "concept-rust",
    slug: "rust",
    title: "Rust",
    paragraphs: [
      "Rust is a modern programming language engineered for tasks where speed, reliability, and precision matter most. Traditional low-level languages like C and C++ give programmers full control over the computer's hardware, but an accidental mistake with memory can crash the program or open severe security vulnerabilities.",
      "Rust solves this dilemma through a built-in set of rules called ownership that checks your program while you compile it. By verifying who owns each piece of data before the code ever runs, Rust guarantees safety without needing a background garbage collector that could pause or slow down execution.",
    ],
    wordCount: 99,
  },
  "concept-ownership": {
    conceptId: "concept-ownership",
    slug: "ownership",
    title: "Ownership",
    paragraphs: [
      "Ownership is the foundational discipline that sets Rust apart from virtually every other language. Instead of relying on automated garbage collectors to clean up discarded data at runtime, or forcing programmers to manually allocate and free memory, Rust assigns every piece of data a single, clear owner variable.",
      "When that owner variable finishes its job and goes out of scope, the computer immediately reclaims the memory automatically. You can also borrow access to data temporarily without taking ownership, ensuring that multiple parts of a program can cooperate without accidentally modifying or deleting each other's data.",
    ],
    wordCount: 101,
  },
  "concept-memory": {
    conceptId: "concept-memory",
    slug: "memory",
    title: "Memory",
    paragraphs: [
      "Computer memory is the electronic workspace where active programs and data reside while the machine is running. It is organized into a carefully engineered hierarchy, moving from tiny, ultra-fast storage registers located directly inside the processor down to spacious, slightly slower chips of primary physical RAM.",
      "To keep software organized and secure, the operating system works with hardware to create virtual memory for each program. This gives every application the illusion of having a clean, private, uninterrupted workspace, preventing buggy or malicious software from reading or corrupting the private memory of another program.",
    ],
    wordCount: 101,
  },
  "concept-stack-and-heap": {
    conceptId: "concept-stack-and-heap",
    slug: "stack-and-heap",
    title: "Stack & Heap",
    paragraphs: [
      "The stack and the heap are two distinct zones of process memory used to store program data during execution. The stack acts like an organized pile of plates: memory is reserved instantly in order when a function starts, and removed just as rapidly the moment that function finishes.",
      "The heap, by contrast, resembles an open warehouse. It provides flexible storage for data whose size might change as the program runs or that needs to outlive the function that created it. While the stack is ultra-fast, the heap allows software to handle dynamic, unpredictable information like open documents or network streams.",
    ],
    wordCount: 108,
  },
  "concept-operating-systems": {
    conceptId: "concept-operating-systems",
    slug: "operating-systems",
    title: "Operating Systems",
    paragraphs: [
      "An operating system is the master conductor of a computer, bridging the gap between physical silicon and user applications. Without an operating system, every software program would need custom, hand-crafted instructions to manage the processor, control storage drives, draw graphics to screens, and listen to network cards.",
      "The core of the operating system, known as the kernel, schedules which programs get processor time, shields applications from one another, and provides clean abstractions like files and network sockets. It ensures hardware resources are shared fairly and reliably, preventing a single misbehaving application from bringing down the entire machine.",
    ],
    wordCount: 101,
  },
  "concept-cpus": {
    conceptId: "concept-cpus",
    slug: "cpus",
    title: "CPUs",
    paragraphs: [
      "The central processing unit, or CPU, is the computational brain of a computer. It executes instructions by continuously repeating a straightforward three-step cycle: fetching a binary instruction from memory, decoding what that instruction demands, and executing the calculation across high-speed electronic circuits.",
      "Modern processors carry out billions of these cycles every second across multiple cores. To maximize performance, they employ sophisticated hardware techniques, including pipelining to work on several instructions simultaneously and branch prediction to anticipate what a program will do next, transforming raw electrical current into fluid interactive experiences.",
    ],
    wordCount: 97,
  },
  "concept-transistors": {
    conceptId: "concept-transistors",
    slug: "transistors",
    title: "Transistors",
    paragraphs: [
      "Transistors are the microscopic physical building blocks of all modern computing hardware. Manufactured from semiconductor materials like silicon, each transistor functions essentially as a tiny electronic switch that can either allow electrical current to flow or block it completely.",
      "By grouping billions of these microscopic switches together on a single silicon chip, computer architects build logic gates that calculate basic logical operations like AND, OR, and NOT. From those simple switches, processors can perform arithmetic, remember data, and execute the complex software systems that power our digital world.",
    ],
    wordCount: 93,
  },
};

/**
 * Retrieves an enhanced Level 1 overview for a given concept ID.
 */
export function getConceptOverview(conceptId: string): ConceptOverview | undefined {
  return SEED_CONCEPT_OVERVIEWS[conceptId];
}

/**
 * All slugs that currently have an available long-form article in the reader preview.
 * Includes all 7 seed concepts and all 6 pilot candidates.
 */
export const AVAILABLE_ARTICLE_SLUGS: ReadonlySet<string> = new Set([
  // 7 Seed Articles
  "rust",
  "ownership",
  "memory",
  "stack-and-heap",
  "operating-systems",
  "cpus",
  "transistors",
  // 6 Pilot Articles
  "instruction-set-architecture",
  "virtual-memory",
  "file-systems",
  "concurrency",
  "asynchronous-io",
  "machine-code",
]);

/**
 * Checks whether a full long-form article is available for a given concept slug.
 */
export function hasArticleForSlug(slug: string): boolean {
  return AVAILABLE_ARTICLE_SLUGS.has(slug);
}
