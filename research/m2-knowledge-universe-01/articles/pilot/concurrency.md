# Concurrency (`concept-concurrency`)

> **Identifier:** `concept-concurrency`  
> **Slug:** `concurrency`  
> **Primary Domains:** `computer-science`, `operating-systems`, `systems-programming`  
> **Direct Graph Adjacencies:** `concept-operating-systems`, `concept-asynchronous-io`  
> **Review Status:** `needs-review`  

---

## 1. Introduction & The Core Mental Model

In traditional, sequential programming, code executes like a recipe in a cookbook: Step 1 finishes, then Step 2 begins, followed by Step 3. If Step 2 involves waiting twenty minutes for bread to bake in the oven, the chef sits motionless in the kitchen until the timer rings.

In the real world, this is not how effective systems operate. While the bread is baking, the chef chops vegetables, washes dishes, and sets the dining table. 

**Concurrency** is the structural composition and organization of a computer program into independently executing computations whose execution lifetimes overlap in time. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf) It is the discipline that allows a software system to juggle multiple ongoing concerns—handling user keyboard input, rendering a graphical interface, downloading a file from the internet, and crunching background calculations—without allowing any single slow task to freeze the entire machine.

To understand the foundational mental model, consider the difference between a juggler and a team of workers:
- A single juggler keeps five balls in the air at the same time. The juggler has only two hands, meaning they only touch one or two balls at any exact instant. However, because they rapidly catch, toss, and interleave their attention across all five balls, the system as a whole exhibits **concurrency**: multiple tasks are in flight simultaneously.
- If two separate jugglers stand side-by-side, each juggling their own balls, the system exhibits **parallelism**: multiple physical actions are occurring at the exact same physical instant.

As computer scientist Rob Pike famously crystallized: *"Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once."*

---

## 2. Why It Matters: Motivation & Historical Context

The necessity for concurrency arises from a fundamental physical reality of computing: the extreme disparity in hardware speeds. 

A modern CPU core executes instructions in fractions of a nanosecond. By contrast, fetching data from main memory (RAM) takes tens of nanoseconds, reading a block from an NVMe SSD takes tens of microseconds, and waiting for a packet to travel across the internet takes tens or hundreds of milliseconds. If computer programs were strictly sequential, a processor capable of executing three billion calculations every second would spend 99.99% of its life sitting completely idle, waiting for external devices to respond.

In the 1960s and 1970s, pioneering computer scientists like Edsger Dijkstra, C.A.R. Hoare, and Leslie Lamport laid the theoretical foundations of concurrent execution. Dijkstra introduced mutual exclusion and semaphores; Hoare developed communicating sequential processes (CSP); and Lamport formulated the seminal **happens-before** relation, establishing that in asynchronous concurrent systems, event order cannot rely on physical wall clocks but must be derived from causal, partial orderings. [2](https://doi.org/10.1145/359545.359563)

Today, concurrency is ubiquitous. From the operating system scheduler managing hundreds of background daemons, to web servers handling tens of thousands of concurrent client connections, modern software relies on concurrent design patterns to maximize hardware throughput and maintain responsive user experiences.

---

## 3. Architectural Anatomy & How It Works

Concurrency can be realized through multiple execution models, most prominently **threads**, **preemptive scheduling**, and **synchronization primitives**.

```
┌────────────────────────────────────────────────────────┐
│  Operating System Kernel Preemptive Scheduler          │
├──────────────────────────┬─────────────────────────────┤
│                          │                             │
▼                          ▼                             ▼
Thread A (Active)          Thread B (Ready)              Thread C (Blocked on I/O)
- Private Register State   - Saved Register State        - Waiting for Disk Data
- Private Call Stack       - Saved Call Stack Pointer    - Involves Zero CPU Time
```

### 1. Threads and Context Switching
A **thread** is the smallest unit of execution that an operating system kernel can schedule. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf) Multiple threads residing within the same process share that process's virtual address space, heap memory, open file descriptors, and global variables. However, every thread possesses its own private **call stack**, its own **program counter (`pc`)**, and its own private snapshot of CPU **registers**.

To execute multiple threads concurrently on a limited number of processor cores, the operating system kernel employs a **preemptive scheduler**. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf) The hardware timer interrupt periodically interrupts the CPU (e.g., every 1 to 10 milliseconds). The kernel halts the currently executing thread, saves its registers and stack pointer into a kernel data structure (the Thread Control Block), loads the saved registers of another thread, and jumps to that thread's program counter. This rapid swapping is called a **context switch**.

### 2. The Danger: Shared Mutable State, Data Races, and Race Conditions
Because concurrent threads share the same address space, they can communicate with extraordinary efficiency: one thread writes data to a memory buffer, and another thread immediately reads it. 

However, shared memory introduces two distinct hazards that developers often conflate:
- **Data Races (Low-Level Memory Hazard):** A data race occurs when two or more concurrent threads access the exact same memory location without synchronization, at least one access is a write, and no *happens-before* relationship orders them. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf) In formal language memory models (such as ISO C11 §5.1.2.4 or C++20), a data race is not merely unexpected output—it is undefined behavior that allows the compiler and hardware to optimize away checks or produce corrupted memory.
- **Race Conditions (High-Level Semantic Hazard):** A race condition is a flaw in program design where the correctness of a computation depends on the relative timing or interleaving of concurrent operations. Crucially, a program can be 100% free of data races (for example, by guarding every individual read and write with a mutex) and still suffer from a severe race condition if higher-level logical steps (such as checking whether an account has sufficient balance and then withdrawing funds) interleave between two independent transactions.

### 3. Synchronization Primitives
To prevent data races and race conditions, concurrent programs use synchronization primitives to enforce **mutual exclusion** and establish well-defined execution orderings:

- **Mutexes (Mutual Exclusion Locks):** A locking mechanism where a thread acquires the lock before entering a critical section and releases it upon exit. If another thread attempts to acquire an already-locked mutex, it is placed in a sleep queue until the lock becomes available. [3](https://pubs.opengroup.org/onlinepubs/9699919799/functions/pthread_mutex_lock.html)
- **Atomic Operations:** Low-level CPU instructions (such as `atomic_fetch_add` or Compare-and-Swap `CAS`) that read, modify, and write a memory word in a single, indivisible hardware transaction that hardware execution units guarantee cannot be interrupted. [4](https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-397337-5)
- **Condition Variables & Semaphores:** Signaling mechanisms that allow threads to sleep efficiently until a specific condition becomes true (e.g., a shared queue receives new work). [1](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf)

---

## 4. Concrete Example & Practical Walkthrough

To understand why concurrency requires formal synchronization, consider the classic problem of two threads attempting to increment a shared counter variable.

In high-level source code, an expression like `counter++` looks like a single atomic step. However, on physical processor architectures, an increment operation decomposes into three distinct machine-level instructions:

```assembly
mov eax, [counter]   ; 1. Load: read counter value from RAM into CPU register eax
add eax, 1           ; 2. Update: increment the value inside register eax by 1
mov [counter], eax   ; 3. Store: write the updated register value back to RAM
```

In languages governed by formal memory models like C (ISO C11 §5.1.2.4) or C++, concurrently executing unsynchronized reads and writes across threads constitutes a **data race**, which results in undefined behavior. Merely labeling a variable `volatile` does not fix this: in C and C++, `volatile` informs the compiler that a memory location may change unexpectedly (such as a memory-mapped hardware peripheral), but it does **not** provide atomicity, does not generate atomic CPU instructions, and does not establish inter-thread memory barriers.

Now trace the conceptual interleaving that occurs when two threads attempt to execute this non-atomic sequence concurrently:

1. **Thread 1** executes the load instruction, reading `counter` (currently 0) into its private register `eax`.
2. **Thread 1** executes the addition, incrementing its `eax` to 1.
3. *Timer Interrupt!* Before Thread 1 can store its result, the operating system's preemptive scheduler deschedules Thread 1 and context-switches to **Thread 2**.
4. **Thread 2** executes its load instruction. Because Thread 1 never stored its update, `counter` in RAM is still 0! Thread 2 loads 0 into its register `eax`.
5. **Thread 2** increments its `eax` to 1, executes its store instruction, and writes 1 into `counter` in RAM.
6. *Context Switch!* The OS scheduler resumes **Thread 1** exactly where it was halted.
7. **Thread 1** executes its pending store instruction, writing its saved register value (1) into `counter`.

Two complete increments were attempted, yet the final value in `counter` is **1**, not 2! Thread 1 unknowingly overwrote Thread 2's update, causing an entire computation to vanish. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf)

### Restoring Correctness: Mutual Exclusion and Memory Ordering

To eliminate this data race, programs synchronize access using a POSIX mutex lock: [3](https://pubs.opengroup.org/onlinepubs/9699919799/functions/pthread_mutex_lock.html)

```c
pthread_mutex_lock(&lock);
counter++;  /* Protected critical section */
pthread_mutex_unlock(&lock);
```

A mutex solves the problem through two coordinated mechanisms:

1. **Mutual Exclusion:** Exactly one thread can hold the mutex at any given instant. Crucially, acquiring a lock does **not** make the underlying CPU instructions physically indivisible, nor does it physically prevent the CPU pipeline from interleaving instructions or servicing timer interrupts while Thread 1 is in the critical section. Rather, it enforces exclusive access: if Thread 1 is preempted while holding the lock, Thread 2 may be scheduled, but when Thread 2 attempts to call `pthread_mutex_lock(&lock)`, the operating system halts Thread 2 and puts it to sleep until Thread 1 completes its work and releases the lock.
2. **Memory Ordering (Happens-Before Relationship via Acquire-Release Semantics):** Modern out-of-order CPUs and optimizing compilers aggressively reorder instructions and buffer memory writes. Releasing a mutex does **not** flush memory writes to persistent disk or physical storage (a task reserved for filesystem calls like `fsync`), nor does it immediately write through to DRAM chips. Instead, a mutex establishes a formal **happens-before ordering** across threads: the `unlock` in Thread 1 *synchronizes-with* the subsequent `lock` in Thread 2. Releasing a lock (`unlock`) has *release semantics*, ensuring that all writes performed inside the critical section become globally visible across processor cores via hardware cache-coherency protocols (such as MESI/MOESI) before the lock is relinquished. Acquiring a lock (`lock`) has *acquire semantics*, preventing reads and writes inside the critical section from being speculatively reordered before the lock acquisition. [4](https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-397337-5) Through mutual exclusion and happens-before ordering, Thread 2 is guaranteed to observe Thread 1's updates before accessing the counter.

---

## 5. Critical Distinctions & Common Misconceptions

### Misconception 1: "Concurrency Requires Multiple Physical CPU Cores"
A fundamental conceptual error is believing that concurrency is synonymous with multi-core processors. 
- **Concurrency is about system structure:** managing many overlapping computational tasks at once. Concurrency operates with complete fidelity on a single-core CPU through time-sliced preemptive context switching. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf)
- **Parallelism is about simultaneous physical execution:** executing multiple operations at the exact same physical clock cycle. True parallelism requires multiple processing resources—such as multiple CPU cores, hardware execution units, SIMD/vector units, or GPUs.

A single-core computer running an operating system, a music player, a web browser, and an editor is highly concurrent, but completely non-parallel.

### Misconception 2: "More Threads Automatically Means Faster Code"
Many junior engineers assume that splitting an algorithm across 64 threads will make it run 64 times faster. In practice, uncoordinated multithreading frequently makes programs *slower*. Creating threads consumes memory; context switching burns thousands of CPU cycles saving and restoring state; lock contention forces threads into sleep queues; and cache coherency protocols force CPU cores to repeatedly invalidate and reload shared cache lines (a phenomenon known as *cache bouncing*). Concurrency improves software structure and latency overlap, but only careful parallel design enhances computational throughput. [4](https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-397337-5)

---

## 6. Interconnections in the Knowledge Universe

Concurrency sits at the crossroads of operating systems, hardware architecture, and distributed engineering:

- **From Operating Systems (`concept-concurrency --(depends-on)--> concept-operating-systems`):** OS-managed thread concurrency relies on the operating system kernel for thread creation, preemptive scheduling, and synchronization primitives (such as Linux `futex`), although concurrency can also be realized in bare-metal runtimes.
- **To Asynchronous I/O (`concept-asynchronous-io --(related-to)--> concept-concurrency`):** Traditional multi-threaded concurrency allocates one OS thread per task, which breaks down when handling tens of thousands of connections. Asynchronous I/O provides an alternative concurrent architecture, overlapping I/O latency across thousands of operations without thread overhead.
- **Looking Ahead to Distributed Systems (`concept-distributed-systems --(includes)--> concept-concurrency`):** Distributed systems scale concurrent programming across independent physical machines connected by a network, where shared memory no longer exists and synchronization must be achieved via network messaging and logical clocks.

---

## 7. Authoritative References & Evidence Ledger

1. `src-arpaci-ostep`: Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*. Arpaci-Dusseau Books, Version 1.10, 2023.  
   - **URL:** [https://pages.cs.wisc.edu/~remzi/OSTEP/](https://pages.cs.wisc.edu/~remzi/OSTEP/)  
   - **Direct Chapter URLs:**
     - Chapter 26 "Concurrency: An Introduction": [https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf)
     - Chapter 28 "Locks": [https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf)
     - Chapter 30 "Condition Variables": [https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf)
     - Chapter 32 "Common Concurrency Problems": [https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf](https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf)
   - **Evidence Tier:** Tier 1 (Direct Full-Text Verified Open Textbook)  
   - **Location:** Chapter 26, pp. 1–14; Chapter 28, pp. 1–20; Chapter 30, pp. 1–18; Chapter 32, pp. 1–16.  
   - **Supported Claims:** Distinction between concurrency and parallelism, thread lifecycle, preemptive scheduling, race condition assembly trace, critical sections, and mutual exclusion locks.

2. `src-lamport-clocks-1978`: Leslie Lamport. "Time, Clocks, and the Ordering of Events in a Distributed System", *Communications of the ACM*, 21(7): 558–565, July 1978.  
   - **URL:** [https://doi.org/10.1145/359545.359563](https://doi.org/10.1145/359545.359563)  
   - **Evidence Tier:** Tier 3 (Paywalled Seminal Primary Paper, Abstract & Citation Verified)  
   - **Location:** Section "The Partial Ordering", pp. 559–560.  
   - **Supported Claims:** Foundations of concurrent event ordering, partial orderings, and the definition of the *happens-before* relation in asynchronous systems.

3. `src-posix-base-spec`: The IEEE and The Open Group. *The Open Group Base Specifications Issue 7 / IEEE Std 1003.1-2017*.  
   - **URL:** [https://pubs.opengroup.org/onlinepubs/9699919799/](https://pubs.opengroup.org/onlinepubs/9699919799/)  
   - **Direct Reference URLs:**
     - Header `<pthread.h>`: [https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/pthread.h.html](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/pthread.h.html)
     - Function `pthread_mutex_lock()`: [https://pubs.opengroup.org/onlinepubs/9699919799/functions/pthread_mutex_lock.html](https://pubs.opengroup.org/onlinepubs/9699919799/functions/pthread_mutex_lock.html)
   - **Evidence Tier:** Tier 1 (Direct Full-Text Verified Open International Standard)  
   - **Location:** System Interfaces, Section 2.9 "Threads", pp. 497–505; Header `<pthread.h>`.  
   - **Supported Claims:** Standard POSIX thread synchronization semantics, `pthread_mutex_lock`, `pthread_mutex_unlock`, condition variables, and thread memory barriers.

4. `src-herlihy-multiprocessor`: Maurice Herlihy and Nir Shavit. *The Art of Multiprocessor Programming* (Revised 1st Edition). Morgan Kaufmann / Elsevier, 2012. ISBN: 978-0-12-397337-5.  
   - **URL:** [https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-397337-5](https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-397337-5)  
   - **Evidence Tier:** Tier 2 (Chapter & TOC Confirmed Academic Textbook)  
   - **Location:** Chapter 1 "Introduction", pp. 1–20; Chapter 3 "Concurrent Objects", pp. 45–65.  
   - **Supported Claims:** Shared mutable memory challenges, hardware atomic instructions, linearizability, and multicore contention overhead.
