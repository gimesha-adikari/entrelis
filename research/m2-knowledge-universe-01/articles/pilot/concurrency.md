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

**Concurrency** is the structural composition and organization of a computer program into independently executing computations whose execution lifetimes overlap in time. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/) It is the discipline that allows a software system to juggle multiple ongoing concerns—handling user keyboard input, rendering a graphical interface, downloading a file from the internet, and crunching background calculations—without allowing any single slow task to freeze the entire machine.

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
A **thread** is the smallest unit of execution that an operating system kernel can schedule. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/) Multiple threads residing within the same process share that process's virtual address space, heap memory, open file descriptors, and global variables. However, every thread possesses its own private **call stack**, its own **program counter (`pc`)**, and its own private snapshot of CPU **registers**.

To execute multiple threads concurrently on a limited number of processor cores, the operating system kernel employs a **preemptive scheduler**. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/) The hardware timer interrupt periodically interrupts the CPU (e.g., every 1 to 10 milliseconds). The kernel halts the currently executing thread, saves its registers and stack pointer into a kernel data structure (the Thread Control Block), loads the saved registers of another thread, and jumps to that thread's program counter. This rapid swapping is called a **context switch**.

### 2. The Danger: Shared Mutable State & Race Conditions
Because concurrent threads share the same address space, they can communicate with extraordinary efficiency: one thread writes data to a memory buffer, and another thread immediately reads it. 

However, this shared memory introduces the most notorious hazard in computer science: the **race condition**. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/) A race condition occurs when two or more threads access shared memory concurrently, at least one access is a write, and the threads perform no synchronization. Because the operating system scheduler can interrupt a thread at any arbitrary machine instruction, the final outcome depends on the unpredictable, non-deterministic timing of the execution interleaving.

### 3. Synchronization Primitives
To prevent race conditions, concurrent programs use synchronization primitives to enforce **mutual exclusion**—ensuring that only one thread can access a shared resource or execute a "critical section" at any given time:

- **Mutexes (Mutual Exclusion Locks):** A locking mechanism where a thread acquires the lock before entering a critical section and releases it upon exit. If another thread attempts to acquire an already-locked mutex, it is placed in a sleep queue until the lock becomes available. [3](https://pubs.opengroup.org/onlinepubs/9699919799/)
- **Atomic Operations:** Low-level CPU instructions (such as `atomic_fetch_add` or Compare-and-Swap `CAS`) that read, modify, and write a memory word in a single, indivisible hardware transaction that hardware execution units guarantee cannot be interrupted. [4](https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-370591-4)
- **Condition Variables & Semaphores:** Signaling mechanisms that allow threads to sleep efficiently until a specific condition becomes true (e.g., a shared queue receives new work). [1](https://pages.cs.wisc.edu/~remzi/OSTEP/)

---

## 4. Concrete Example & Practical Walkthrough

To see how concurrency goes wrong without synchronization, consider two threads attempting to increment a shared counter:

```c
volatile int counter = 0;

void* worker(void* arg) {
    for (int i = 0; i < 10000; i++) {
        counter++;
    }
    return NULL;
}
```

At the high-level language level, `counter++` looks like a single atomic step. However, an ISA translates `counter++` into three distinct assembly instructions:

```assembly
mov eax, [counter]   ; 1. Load: read counter from RAM into CPU register eax
add eax, 1           ; 2. Update: increment register eax by 1
mov [counter], eax   ; 3. Store: write the new value back to RAM
```

Now trace the disaster that occurs when two threads interleave:
1. **Thread 1** reads `counter` (value is 0) into its register `eax`.
2. **Thread 1** increments its `eax` to 1.
3. *Timer Interrupt!* The OS context-switches to **Thread 2** before Thread 1 can store its result.
4. **Thread 2** reads `counter` from RAM (value is still 0!) into its register `eax`.
5. **Thread 2** increments its `eax` to 1 and stores 1 into `counter`.
6. *Context Switch!* The OS resumes **Thread 1**.
7. **Thread 1** stores its saved `eax` (which is 1) into `counter`.

Two separate increment operations occurred, but the final value of `counter` is **1**, not 2! One entire update vanished into thin air. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/)

To fix this, the programmer wraps the increment in a POSIX mutex:

```c
pthread_mutex_lock(&lock);
counter++;
pthread_mutex_unlock(&lock);
```

Now, when Thread 1 acquires the lock, any attempt by Thread 2 to acquire that same lock causes the kernel to block Thread 2, guaranteeing that Thread 1 completes all three assembly instructions atomically before Thread 2 can touch the memory. [3](https://pubs.opengroup.org/onlinepubs/9699919799/)

---

## 5. Critical Distinctions & Common Misconceptions

### Misconception 1: "Concurrency Requires Multiple Physical CPU Cores"
A fundamental conceptual error is believing that concurrency is synonymous with multi-core processors. 
- **Concurrency is about system structure:** managing many overlapping computational tasks at once. Concurrency operates with complete fidelity on a single-core CPU through time-sliced preemptive context switching. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/)
- **Parallelism is about simultaneous physical execution:** executing multiple operations at the exact same physical clock cycle. True parallelism requires multiple processing resources—such as multiple CPU cores, hardware execution units, SIMD/vector units, or GPUs.

A single-core computer running an operating system, a music player, a web browser, and an editor is highly concurrent, but completely non-parallel.

### Misconception 2: "More Threads Automatically Means Faster Code"
Many junior engineers assume that splitting an algorithm across 64 threads will make it run 64 times faster. In practice, uncoordinated multithreading frequently makes programs *slower*. Creating threads consumes memory; context switching burns thousands of CPU cycles saving and restoring state; lock contention forces threads into sleep queues; and cache coherency protocols force CPU cores to repeatedly invalidate and reload shared cache lines (a phenomenon known as *cache bouncing*). Concurrency improves software structure and latency overlap, but only careful parallel design enhances computational throughput. [4](https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-370591-4)

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
   - **Evidence Tier:** Tier 1 (Direct Full-Text Verified Open Textbook)  
   - **Location:** Chapter 26 "Concurrency: An Introduction", pp. 1–14; Chapter 28 "Locks", pp. 1–20; Chapter 30 "Condition Variables", pp. 1–18; Chapter 32 "Common Concurrency Problems", pp. 1–16.  
   - **Supported Claims:** Distinction between concurrency and parallelism, thread lifecycle, preemptive scheduling, race condition assembly trace, critical sections, and mutual exclusion locks.

2. `src-lamport-clocks-1978`: Leslie Lamport. "Time, Clocks, and the Ordering of Events in a Distributed System", *Communications of the ACM*, 21(7): 558–565, July 1978.  
   - **URL:** [https://doi.org/10.1145/359545.359563](https://doi.org/10.1145/359545.359563)  
   - **Evidence Tier:** Tier 3 (Paywalled Seminal Primary Paper, Abstract & Citation Verified)  
   - **Location:** Section "The Partial Ordering", pp. 559–560.  
   - **Supported Claims:** Foundations of concurrent event ordering, partial orderings, and the definition of the *happens-before* relation in asynchronous systems.

3. `src-posix-base-spec`: The IEEE and The Open Group. *The Open Group Base Specifications Issue 7 / IEEE Std 1003.1-2017*.  
   - **URL:** [https://pubs.opengroup.org/onlinepubs/9699919799/](https://pubs.opengroup.org/onlinepubs/9699919799/)  
   - **Evidence Tier:** Tier 1 (Direct Full-Text Verified Open International Standard)  
   - **Location:** System Interfaces, Section 2.9 "Threads", pp. 497–505; Header `<pthread.h>`.  
   - **Supported Claims:** Standard POSIX thread synchronization semantics, `pthread_mutex_lock`, `pthread_mutex_unlock`, condition variables, and thread memory barriers.

4. `src-herlihy-multiprocessor`: Maurice Herlihy and Nir Shavit. *The Art of Multiprocessor Programming* (Revised 1st Edition). Morgan Kaufmann / Elsevier, 2012. ISBN: 978-0-12-370591-4.  
   - **URL:** [https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-370591-4](https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-370591-4)  
   - **Evidence Tier:** Tier 2 (Chapter & TOC Confirmed Academic Textbook)  
   - **Location:** Chapter 1 "Introduction", pp. 1–20; Chapter 3 "Concurrent Objects", pp. 45–65.  
   - **Supported Claims:** Shared mutable memory challenges, hardware atomic instructions, linearizability, and multicore contention overhead.
