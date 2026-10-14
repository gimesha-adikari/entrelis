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

export const WAVE1_CONCEPT_OVERVIEWS: Record<string, ConceptOverview> = {
  "concept-compilers": {
    conceptId: "concept-compilers",
    slug: "compilers",
    title: "Compilers",
    paragraphs: [
      "A compiler is a specialized software program that translates human-readable computer code into the low-level binary instructions executed directly by hardware. When programmers write software in languages like Rust, C, or Java, they use expressive words and mathematical formulas that computer chips cannot inherently understand.",
      "The compiler analyzes this source code in stages, checking syntax, optimizing performance, and transforming abstract logic into efficient machine code. Without compilers, every modern application, operating system, and web browser would have to be painstakingly written by hand in tedious binary numbers.",
    ],
    wordCount: 87,
  },
  "concept-type-systems": {
    conceptId: "concept-type-systems",
    slug: "type-systems",
    title: "Type Systems",
    paragraphs: [
      "A type system is a logical framework built into programming languages that categorizes data values according to what kinds of operations can be safely performed on them. By distinguishing between numbers, text, collections, and custom domain models, type systems prevent common programming mistakes before software ever runs.",
      "In static languages, the compiler uses these rules to prove that operations will not produce nonsensical behavior, such as attempting to divide text by a date. By validating program correctness at build time, robust type systems eliminate entire categories of software bugs and provide living documentation for engineering teams.",
    ],
    wordCount: 96,
  },
  "concept-garbage-collection": {
    conceptId: "concept-garbage-collection",
    slug: "garbage-collection",
    title: "Garbage Collection",
    paragraphs: [
      "Garbage collection is an automatic memory management technique used by many popular programming languages, such as Python, Go, and Java. As a program executes, it continuously reserves small areas of memory for variables and data structures, but eventually those values are no longer needed.",
      "Instead of forcing developers to manually track and free every piece of allocated memory, a background collector periodically scans the program to find and reclaim discarded data. While garbage collection simplifies application development, it can introduce brief, unpredictable pauses that systems languages like Rust intentionally avoid.",
    ],
    wordCount: 90,
  },
  "concept-data-structures": {
    conceptId: "concept-data-structures",
    slug: "data-structures",
    title: "Data Structures",
    paragraphs: [
      "A data structure is a specialized way of organizing, managing, and storing information in computer memory so that it can be accessed and modified efficiently. Just as physical tools are organized in toolboxes or libraries organize books on shelves, different computational tasks require distinct structural arrangements.",
      "Common examples include arrays for ordered lists, hash tables for instant key-based lookups, and trees for representing hierarchical relationships. Choosing the appropriate data structure allows software algorithms to execute in milliseconds rather than hours, serving as the essential building blocks for all complex applications.",
    ],
    wordCount: 90,
  },
  "concept-database-systems": {
    conceptId: "concept-database-systems",
    slug: "database-systems",
    title: "Database Systems",
    paragraphs: [
      "A database system is dedicated software engineered to store, organize, and retrieve vast collections of electronic information reliably and quickly. Unlike simple text files that can become corrupted or slow when handling concurrent edits, databases provide structured query interfaces and guarantee data integrity.",
      "Modern databases employ sophisticated indexing, caching, and transaction logging to ensure that critical updates are never lost, even if power suddenly fails. From financial ledgers and medical records to global social networks, database systems serve as the durable memory banks powering modern digital civilization.",
    ],
    wordCount: 87,
  },
  "concept-logic-gates": {
    conceptId: "concept-logic-gates",
    slug: "logic-gates",
    title: "Logic Gates",
    paragraphs: [
      "Logic gates are the elementary electronic circuits that perform basic logical decisions inside a computer. By taking one or more binary electrical inputs and producing a single binary output, gates implement fundamental operations such as AND, OR, and NOT based on boolean algebra.",
      "In modern processors, these gates are constructed out of microscopic transistors working together as switches. By interconnecting millions or billions of these simple decision-making circuits, computer engineers construct arithmetic units, memory registers, and the complete processing architectures that drive our digital world.",
    ],
    wordCount: 85,
  },
  "concept-integrated-circuit": {
    conceptId: "concept-integrated-circuit",
    slug: "integrated-circuit",
    title: "The Integrated Circuit",
    paragraphs: [
      "An integrated circuit, commonly known as a microchip, is a flat piece of semiconductor material containing an entire electronic circuit of interconnected components. Before its invention in the late 1950s, computers required thousands of individual transistors, capacitors, and wires soldered together by hand.",
      "By printing microscopic transistors and wiring directly onto a single crystal wafer using photolithography, the integrated circuit dramatically slashed manufacturing costs, boosted reliability, and reduced electrical power requirements. This revolutionary packaging breakthrough enabled the personal computer, mobile smartphones, and the modern global digital economy.",
    ],
    wordCount: 87,
  },
  "concept-microprocessor-revolution": {
    conceptId: "concept-microprocessor-revolution",
    slug: "microprocessor-revolution",
    title: "The Microprocessor Revolution",
    paragraphs: [
      "The microprocessor revolution was the historical breakthrough that placed all the computational components of a central processing unit onto a single silicon microchip. Beginning in the early 1970s with chips like the Intel 4004, it transformed computing from massive, room-sized mainframe installations into compact, affordable machines.",
      "This dramatic consolidation made personal computers, industrial automation, and home appliances possible, bringing unprecedented computational power into homes, classrooms, and workplaces worldwide. It fundamentally democratized access to technology, sparking the birth of the modern software industry and accelerating global technological change.",
    ],
    wordCount: 87,
  },
  "concept-von-neumann-architecture": {
    conceptId: "concept-von-neumann-architecture",
    slug: "von-neumann-architecture",
    title: "Von Neumann Architecture",
    paragraphs: [
      "The Von Neumann architecture is the foundational structural design that has guided computer construction since the mid-twentieth century. Proposed by mathematician John von Neumann and early computing pioneers, its core insight was that both program instructions and working data can reside together in the same shared memory.",
      "A traditional Von Neumann computer consists of a central processing unit with an arithmetic logic unit and registers, a control unit, memory, and input-output mechanisms. This universal design eliminated the need to physically rewire machines for different calculations, creating the general-purpose programmable computer.",
    ],
    wordCount: 90,
  },
  "concept-history-of-computing": {
    conceptId: "concept-history-of-computing",
    slug: "history-of-computing",
    title: "History of Computing",
    paragraphs: [
      "The history of computing is the epic human journey to automate mathematical calculation and information processing across centuries. It stretches from ancient calculating tools like the abacus and mechanical clockwork gears to nineteenth-century mechanical engines, early electromechanical relays, and modern microscopic silicon processors.",
      "Driven by pioneers such as Ada Lovelace, Charles Babbage, and Alan Turing, computing evolved from rigid numerical calculators into universal information processors that reshape society. Understanding this history reveals how theoretical mathematics, physical engineering, and human ingenuity converged to create the digital universe we inhabit today.",
    ],
    wordCount: 89,
  },
  "concept-semiconductors": {
    conceptId: "concept-semiconductors",
    slug: "semiconductors",
    title: "Semiconductors",
    paragraphs: [
      "A semiconductor is a physical material whose ability to conduct electrical current falls between that of a metallic conductor, like copper, and an electrical insulator, like glass. Silicon, the most widely used semiconductor, possesses unique atomic properties that allow its conductivity to be altered with extraordinary precision.",
      "By deliberately introducing tiny traces of other elements through a chemical process called doping, scientists create regions with excess or scarce electrons. This controllable conductivity allows engineers to build solid-state switches and amplifiers, forming the physical foundation for transistors, microprocessors, and solar cells.",
    ],
    wordCount: 90,
  },
  "concept-transistor-invention": {
    conceptId: "concept-transistor-invention",
    slug: "transistor-invention",
    title: "Invention of the Transistor",
    paragraphs: [
      "The invention of the transistor at Bell Telephone Laboratories in December 1947 is widely regarded as one of the most transformative scientific breakthroughs of the twentieth century. Developed by John Bardeen, Walter Brattain, and William Shockley, it created a reliable solid-state alternative to fragile, power-hungry vacuum tubes.",
      "By using crystals of semiconductor germanium and silicon to amplify and switch electrical signals, the transistor eliminated the heat, bulk, and frequent burnouts of vacuum tubes. This pivotal discovery launched the solid-state electronics era, paving the way for integrated circuits, space exploration, and global digital telecommunications.",
    ],
    wordCount: 93,
  },
  "concept-solid-state-physics": {
    conceptId: "concept-solid-state-physics",
    slug: "solid-state-physics",
    title: "Solid-State Physics",
    paragraphs: [
      "Solid-state physics is the branch of physics that investigates how the microscopic properties of solid materials emerge from quantum mechanics and atomic structures. It focuses particularly on crystalline materials, where atoms are arranged in repeating geometric grids known as crystal lattices.",
      "By analyzing how electrons behave inside these periodic lattices, solid-state physicists formulated energy band theory, explaining why some solids conduct electricity freely while others insulate. This theoretical mastery made the invention of semiconductors, transistors, LEDs, and modern quantum computing devices possible.",
    ],
    wordCount: 82,
  },
  "concept-atoms": {
    conceptId: "concept-atoms",
    slug: "atoms",
    title: "Atoms",
    paragraphs: [
      "An atom is the basic defining building block of all ordinary matter in the physical universe, consisting of a dense central nucleus surrounded by a cloud of negatively charged electrons. The nucleus contains positively charged protons and electrically neutral neutrons bound together by the strong nuclear force.",
      "The specific arrangement of electrons in an atom determines its chemical properties and how it binds with neighboring atoms to form molecules and crystals. In computing, understanding atomic structure and electron behavior is essential for engineering semiconductor crystals and designing microscopic transistors.",
    ],
    wordCount: 89,
  },
  "concept-electrons": {
    conceptId: "concept-electrons",
    slug: "electrons",
    title: "Electrons",
    paragraphs: [
      "An electron is a fundamental subatomic particle carrying a negative elementary electrical charge that orbits atomic nuclei within matter. Because electrons are exceptionally lightweight and mobile compared to atomic nuclei, their coordinated movement through physical materials generates electrical current.",
      "In solid semiconductor crystals, the flow and confinement of electrons are controlled with microscopic precision to represent binary ones and zeros. Every logical decision, memory storage operation, and computational calculation across modern digital devices relies on guiding and switching these microscopic electrical charges.",
    ],
    wordCount: 82,
  },
  "concept-boolean-logic": {
    conceptId: "concept-boolean-logic",
    slug: "boolean-logic",
    title: "Boolean Logic",
    paragraphs: [
      "Boolean logic is an algebraic framework developed by English mathematician George Boole in the mid-nineteenth century, where all variables represent one of two values: true or false. It uses fundamental logical operators such as AND, OR, and NOT to combine and evaluate conditional propositions.",
      "In the 1930s, Claude Shannon made the landmark discovery that electrical switches and relays could directly evaluate Boolean expressions, mapping true and false to high and low voltages. This vital connection established Boolean logic as the universal mathematical grammar underlying all digital computer circuit design.",
    ],
    wordCount: 89,
  },
  "concept-formal-logic": {
    conceptId: "concept-formal-logic",
    slug: "formal-logic",
    title: "Formal Logic & Deductive Reasoning",
    paragraphs: [
      "Formal logic is the rigorous study of valid inference, argumentation, and truth structures using precise symbolic languages rather than ambiguous everyday speech. Originating in ancient philosophy and formalized by modern mathematicians, it examines how true premises guarantee true conclusions through deductive rules.",
      "In computer science, formal logic serves as the mathematical foundation for programming language design, automated theorem provers, database query semantics, and hardware verification. It provides the exact conceptual tools necessary to formally prove that critical software systems will operate safely without errors.",
    ],
    wordCount: 84,
  },
  "concept-algorithms": {
    conceptId: "concept-algorithms",
    slug: "algorithms",
    title: "Algorithms",
    paragraphs: [
      "An algorithm is a clear, finite, unambiguous set of step-by-step instructions designed to solve a specific problem or perform a computation. From simple recipes and sorting numerical lists to routing network traffic across continents, algorithms describe the precise procedural logic required to achieve an outcome.",
      "Computer scientists analyze algorithms based on their computational complexity, measuring how execution time and memory consumption grow as input sizes increase. Well-designed algorithms allow computers to process massive datasets in fractions of a second, driving everything from web search engines to medical imaging.",
    ],
    wordCount: 88,
  },
  "concept-computability-theory": {
    conceptId: "concept-computability-theory",
    slug: "computability-theory",
    title: "Computability Theory",
    paragraphs: [
      "Computability theory is the profound branch of theoretical computer science and mathematical logic that explores what problems can and cannot be solved by algorithms. Rather than focusing on how fast a computer runs, it investigates the ultimate theoretical limits of mechanical calculation itself.",
      "Through formal mathematical models such as Turing machines, pioneers proved the existence of undecidable problems—questions that no algorithm can ever solve, regardless of computational time or memory. This foundational field defines the absolute intellectual boundaries of automated reasoning and computer science.",
    ],
    wordCount: 84,
  },
  "concept-alan-turing": {
    conceptId: "concept-alan-turing",
    slug: "alan-turing",
    title: "Alan Turing",
    paragraphs: [
      "Alan Turing was an English mathematician, logician, and cryptanalyst widely celebrated as one of the principal founders of modern computer science and artificial intelligence. In his landmark 1936 paper, Turing introduced the concept of a universal machine capable of simulating any algorithmic computation.",
      "During the Second World War, Turing played a pivotal role breaking the German Enigma code at Bletchley Park, saving millions of lives. His profound conceptual work on computability, the Turing test for machine intelligence, and mathematical biology forever shaped the trajectory of technological history.",
    ],
    wordCount: 87,
  },
};

export const ALL_CONCEPT_OVERVIEWS: Record<string, ConceptOverview> = {
  ...SEED_CONCEPT_OVERVIEWS,
  ...PILOT_CONCEPT_OVERVIEWS,
  ...WAVE1_CONCEPT_OVERVIEWS,
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
