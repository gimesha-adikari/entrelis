import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import KnowledgeGraphExperience from "../components/KnowledgeGraphExperience";
import { SEED_DATASET } from "@/data/seed";

describe("KnowledgeGraphExperience Production Integration", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("initializes with default Rust concept selected", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();
    expect(
      screen.getByText(
        "A systems programming language that combines low-level hardware control with compile-time safety guarantees."
      )
    ).toBeDefined();

    // Check live announcement region
    expect(screen.getByText(/Selected concept: Rust/i)).toBeDefined();
  });

  it("provides one main landmark while preserving the brand and concept-panel landmarks", () => {
    const { container } = render(
      <KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />
    );

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Entrelis", level: 1 })).toBeDefined();
    expect(screen.getByRole("complementary", { name: "Selected Concept Details" })).toBeDefined();
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("button", { name: /Return to Rust/i })).toBeDefined();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDefined();
  });

  it("keeps one production WebGL canvas and accessible concept controls with stable 3D identities", () => {
    const { container } = render(
      <KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />
    );

    expect(container.querySelectorAll("canvas[data-production-celestial-layer]")).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid^="celestial-node-"]')).toHaveLength(0);

    const rustControl = screen.getByRole("button", { name: "Rust, focus concept" });
    expect(rustControl.getAttribute("data-celestial-archetype")).toBe("volcanic-rocky");
    expect(rustControl.getAttribute("data-celestial-seed")).toBe("42");

    const ownershipControl = screen.getByRole("button", { name: "Ownership, primary concept" });
    expect(ownershipControl.getAttribute("data-celestial-archetype")).toBe("ember-star");
    expect(ownershipControl.getAttribute("data-celestial-seed")).toBe("108");
    fireEvent.click(ownershipControl);

    expect(screen.getByRole("heading", { name: "Ownership" })).toBeDefined();
  });

  it("does not run a permanent requestAnimationFrame loop while idle", () => {
    let activeRafCount = 0;
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      activeRafCount++;
      return window.setTimeout(() => {
        activeRafCount--;
        cb(performance.now());
      }, 16);
    });

    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    // On initial mount, canvas draws once synchronously without scheduling transition RAF
    expect(activeRafCount).toBe(0);

    rafSpy.mockRestore();
  });

  it("strictly preserves SOURCE → TARGET directional relationship display and removes raw strength", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="ownership" />);

    // Ownership has two connections:
    // Rust → Ownership (incoming, uses)
    // Ownership → Memory (outgoing, manages)
    expect(screen.getByText("uses")).toBeDefined();
    expect(screen.getByText("manages")).toBeDefined();
    expect(screen.getAllByText("→").length).toBe(2);

    // Incoming has Rust as clickable connection, Ownership as current
    expect(screen.getByRole("button", { name: /Explore connected concept: Rust/i })).toBeDefined();
    // Outgoing has Memory as clickable connection
    expect(
      screen.getByRole("button", { name: /Explore connected concept: Memory/i })
    ).toBeDefined();

    // Internal graph engine terminology should not be rendered
    expect(screen.queryByText(/Strength:/i)).toBeNull();
    expect(screen.queryByText(/PRIMARY/i)).toBeNull();
  });

  it("exposes all direct relationships semantically in the panel", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="memory" />);

    // Memory has 3 direct relationships in SEED_DATASET:
    // Ownership --manages--> Memory
    // Memory --includes--> Stack & Heap
    // Operating Systems --manages--> Memory
    // Rust --related-to--> Memory
    const connectionItems = screen.getAllByRole("listitem");
    expect(connectionItems.length).toBeGreaterThanOrEqual(4);
  });

  it("exposes source provenance without leaking internal IDs", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    // Check sources disclosure
    const summary = screen.getByText(/Sources · 1/i);
    expect(summary).toBeDefined();

    // Contains authoritative title and publisher
    expect(screen.getByText("The Rust Programming Language")).toBeDefined();
    expect(screen.getByText(/The Rust Project/i)).toBeDefined();

    // View source link has safe target and rel
    const link = screen.getByRole("link", { name: /Open source in new window/i });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");

    // Internal ID must not be displayed in UI
    expect(screen.queryByText("src-rust-book")).toBeNull();
  });

  it("honors prefers-reduced-motion without scheduling RAF animations on selection", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const rafSpy = vi.spyOn(window, "requestAnimationFrame");

    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    rafSpy.mockClear();

    const ownershipBtn = screen.getByRole("button", {
      name: /Explore connected concept: Ownership/i,
    });
    fireEvent.click(ownershipBtn);

    expect(screen.getByRole("heading", { name: "Ownership" })).toBeDefined();
    // With prefers-reduced-motion active, no RAF transition frames are scheduled
    expect(rafSpy).not.toHaveBeenCalled();

    rafSpy.mockRestore();
  });

  it("updates browser history state when concept selection changes", () => {
    const pushStateSpy = vi.spyOn(window.history, "pushState");

    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    const ownershipBtn = screen.getByRole("button", {
      name: /Explore connected concept: Ownership/i,
    });
    fireEvent.click(ownershipBtn);

    expect(pushStateSpy).toHaveBeenCalledWith({ slug: "ownership" }, "", "/concept/ownership");

    pushStateSpy.mockRestore();
  });

  it("restores concept on browser popstate navigation", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    // Simulate browser back to /concept/memory
    window.history.pushState({}, "", "/concept/memory");
    fireEvent(window, new PopStateEvent("popstate"));

    expect(screen.getByRole("heading", { name: "Memory" })).toBeDefined();
  });

  it("synchronizes document title during client exploration and popstate navigation", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);
    expect(document.title).toBe("Entrelis — Everything is connected");

    // Select Ownership
    const ownershipBtn = screen.getByRole("button", {
      name: /Explore connected concept: Ownership/i,
    });
    fireEvent.click(ownershipBtn);
    expect(document.title).toBe("Ownership — Entrelis");

    // Select Memory
    const memoryBtn = screen.getByRole("button", {
      name: /Explore connected concept: Memory/i,
    });
    fireEvent.click(memoryBtn);
    expect(document.title).toBe("Memory — Entrelis");

    // Simulate browser back to /concept/ownership
    window.history.pushState({}, "", "/concept/ownership");
    fireEvent(window, new PopStateEvent("popstate"));
    expect(document.title).toBe("Ownership — Entrelis");

    // Simulate browser back to root /
    window.history.pushState({}, "", "/");
    fireEvent(window, new PopStateEvent("popstate"));
    expect(document.title).toBe("Entrelis — Everything is connected");
  });

  it("resets camera and selection to Rust on Return to Rust", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="ownership" />);

    expect(screen.getByRole("heading", { name: "Ownership" })).toBeDefined();

    const returnBtn = screen.getByRole("button", { name: /Return to Rust/i });
    fireEvent.click(returnBtn);

    expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();
  });

  it("creates exactly one history entry when clicking Return to Rust and restores prior concept on Back", () => {
    // Start at /concept/memory
    window.history.replaceState({ slug: "memory" }, "", "/concept/memory");
    const pushStateSpy = vi.spyOn(window.history, "pushState");

    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="memory" />);

    expect(screen.getByRole("heading", { name: "Memory" })).toBeDefined();
    expect(document.title).toBe("Memory — Entrelis");

    // Click Return to Rust
    const returnBtn = screen.getByRole("button", { name: /Return to Rust/i });
    fireEvent.click(returnBtn);

    // Exactly one pushState call should be made to "/"
    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(pushStateSpy).toHaveBeenCalledWith({ slug: "rust" }, "", "/");

    // Rust is now selected and root title is active
    expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();
    expect(document.title).toBe("Entrelis — Everything is connected");

    // Simulate browser Back (popstate) to /concept/memory
    window.history.replaceState({ slug: "memory" }, "", "/concept/memory");
    fireEvent(window, new PopStateEvent("popstate"));

    // Memory is restored directly without intermediate /concept/rust stop
    expect(screen.getByRole("heading", { name: "Memory" })).toBeDefined();
    expect(document.title).toBe("Memory — Entrelis");

    pushStateSpy.mockRestore();
  });
});

describe("Observatory panel resizing integration", () => {
  it("preserves the chosen width through concept links, Back, and Home without changing selection on resize", () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
    window.history.replaceState({}, "", "/concept/rust");

    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    const handle = screen.getByRole("separator", { name: "Resize knowledge panel" });
    expect(handle.getAttribute("aria-valuenow")).toBe("470");

    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(handle.getAttribute("aria-valuenow")).toBe("486");
    expect(window.location.pathname).toBe("/concept/rust");
    expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Explore connected concept: Ownership/i }));
    expect(screen.getByRole("heading", { name: "Ownership" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Explore connected concept: Memory/i }));
    expect(screen.getByRole("heading", { name: "Memory" })).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: /Explore connected concept: Stack & Heap/i })
    );
    expect(screen.getByRole("heading", { name: "Stack & Heap" })).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: /Explore connected concept: Operating Systems/i })
    );
    expect(screen.getByRole("heading", { name: "Operating Systems" })).toBeDefined();
    expect(handle.getAttribute("aria-valuenow")).toBe("486");

    window.history.replaceState({}, "", "/concept/stack-and-heap");
    fireEvent(window, new PopStateEvent("popstate"));
    expect(screen.getByRole("heading", { name: "Stack & Heap" })).toBeDefined();
    expect(handle.getAttribute("aria-valuenow")).toBe("486");

    fireEvent.click(screen.getByRole("button", { name: "Return to Rust" }));
    expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();
    expect(window.location.pathname).toBe("/");
    expect(handle.getAttribute("aria-valuenow")).toBe("486");

    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  });

  it("does not render a resizing control on mobile viewports", () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    expect(screen.queryByRole("separator", { name: "Resize knowledge panel" })).toBeNull();
    expect(screen.getByRole("complementary", { name: "Selected Concept Details" })).toBeDefined();

    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  });
});
