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

export const PILOT_CONCEPT_OVERVIEWS: Record<string, ConceptOverview> = {
  "concept-instruction-set-architecture": {
    conceptId: "concept-instruction-set-architecture",
    slug: "instruction-set-architecture",
    title: "Instruction Set Architecture",
    paragraphs: [
      "An instruction set architecture, or ISA, is the foundational boundary where software meets physical computer hardware. It defines the vocabulary of commands that a processor understands, specifying available registers, mathematical operations, and the exact binary format used to encode every instruction.",
      "By establishing this consistent contract, an ISA allows software developers and compilers to write programs that run reliably across different chip implementations without needing to know how internal silicon circuits are arranged. It is the universal blueprint that makes modern software portable and processor design possible.",
    ],
    wordCount: 87,
  },
  "concept-virtual-memory": {
    conceptId: "concept-virtual-memory",
    slug: "virtual-memory",
    title: "Virtual Memory",
    paragraphs: [
      "Virtual memory is an architectural technique that gives every active program the illusion of having its own private, unbroken expanse of memory. Instead of accessing physical RAM chips directly, programs read and write to virtual addresses that the processor and operating system translate on the fly.",
      "This translation is performed in fixed-size blocks called pages using specialized hardware inside the CPU. By separating logical program addresses from physical storage frames, virtual memory protects applications from interfering with one another, prevents accidental crashes, and allows computers to run programs larger than available physical RAM.",
    ],
    wordCount: 91,
  },
  "concept-file-systems": {
    conceptId: "concept-file-systems",
    slug: "file-systems",
    title: "File Systems",
    paragraphs: [
      "A file system is the organizational layer of an operating system that transforms raw, unstructured storage disks into accessible hierarchies of named files and directories. Rather than forcing programs to track raw storage sectors, it manages where data lives and keeps an index of metadata like ownership and permissions.",
      "To protect your data against unexpected crashes or power failures, modern file systems employ techniques like journaling to log changes before applying them permanently. This systematic discipline ensures that documents, databases, and programs remain intact, recoverable, and organized across years of continuous computer use.",
    ],
    wordCount: 91,
  },
  "concept-concurrency": {
    conceptId: "concept-concurrency",
    slug: "concurrency",
    title: "Concurrency",
    paragraphs: [
      "Concurrency is the art of structuring a software system so that multiple computational tasks can make progress during overlapping periods of time. Rather than waiting for a slow task like a disk read or network request to finish, a concurrent program switches attention to other useful calculations.",
      "Concurrency can happen on a single processor core through rapid multitasking or across multiple cores running instructions in parallel. By coordinating shared data with careful synchronization rules, concurrent systems remain responsive, handle thousands of simultaneous user connections, and extract maximum throughput from modern multi-core computing hardware.",
    ],
    wordCount: 93,
  },
  "concept-asynchronous-io": {
    conceptId: "concept-asynchronous-io",
    slug: "asynchronous-io",
    title: "Asynchronous I/O",
    paragraphs: [
      "Asynchronous I/O is a processing design that allows a program to initiate an input or output operation—such as downloading a file or querying a database—without freezing execution while waiting for the hardware to respond. The program requests data transfer and immediately continues doing other meaningful work.",
      "When the storage drive or network adapter completes the transfer, the operating system alerts the application through an event loop or completion signal. This prevents wasteful idle waiting, allowing a single lightweight process to coordinate thousands of active connections simultaneously without dedicating a separate system thread to each one.",
    ],
    wordCount: 96,
  },
  "concept-machine-code": {
    conceptId: "concept-machine-code",
    slug: "machine-code",
    title: "Machine Code",
    paragraphs: [
      "Machine code represents the most fundamental language in computing: the raw binary streams of ones and zeros that a central processing unit executes directly. Every high-level algorithm, graphical interface, and web service ultimately gets translated into these elementary binary instructions before the processor can run them.",
      "Each machine instruction carries a numerical operation code that commands the processor's silicon circuits to perform an exact physical task, such as adding numbers or loading data from a register. It is the purest expression of software, turning mathematical logic into physical electrical signals inside the machine.",
    ],
    wordCount: 92,
  },
};

export const ALL_CONCEPT_OVERVIEWS: Record<string, ConceptOverview> = {
  ...SEED_CONCEPT_OVERVIEWS,
  ...PILOT_CONCEPT_OVERVIEWS,
};

/**
 * Retrieves an enhanced Level 1 overview for a given concept ID or slug.
 */
export function getConceptOverview(conceptIdOrSlug: string): ConceptOverview | undefined {
  if (ALL_CONCEPT_OVERVIEWS[conceptIdOrSlug]) {
    return ALL_CONCEPT_OVERVIEWS[conceptIdOrSlug];
  }
  for (const overview of Object.values(ALL_CONCEPT_OVERVIEWS)) {
    if (overview.slug === conceptIdOrSlug || overview.conceptId === conceptIdOrSlug) {
      return overview;
    }
  }
  return undefined;
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
