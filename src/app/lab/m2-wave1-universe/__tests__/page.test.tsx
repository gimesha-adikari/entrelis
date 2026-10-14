import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import M2Wave1UniversePage, { generateMetadata } from "../page";

describe("/lab/m2-wave1-universe Page Route (33 Nodes)", () => {
  beforeEach(() => {
    window.history.pushState(null, "", "/lab/m2-wave1-universe");
  });

  it("generates correct no-index preview metadata for default and concept parameters", async () => {
    const defaultMeta = await generateMetadata({});
    expect(defaultMeta.title).toBe("M2 Wave 1 Universe Preview (33 Nodes) — Entrelis Lab");
    expect(defaultMeta.robots).toEqual({ index: false, follow: false });

    const compilersMeta = await generateMetadata({
      searchParams: Promise.resolve({ concept: "compilers" }),
    });
    expect(compilersMeta.title).toBe(
      "Compilers — M2 Wave 1 Universe Preview (33 Nodes) | Entrelis Lab"
    );
    expect(compilersMeta.robots).toEqual({ index: false, follow: false });
  });

  it("renders the 33-node universe with editorial research preview badge and tagline", async () => {
    const pageComponent = await M2Wave1UniversePage({});
    render(pageComponent);

    const badge = screen.getByTestId("wave1-preview-badge");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("Wave 1 Preview · 33 Nodes");

    expect(screen.getByText(/33 Nodes · 61 Connections/)).toBeDefined();
  });

  it("initializes selected concept from searchParams (?concept=compilers)", async () => {
    const pageComponent = await M2Wave1UniversePage({
      searchParams: Promise.resolve({ concept: "compilers" }),
    });
    render(pageComponent);

    // ConceptPanel should display Compilers details
    const heading = screen.getByRole("heading", { level: 2, name: "Compilers" });
    expect(heading).toBeDefined();

    // Compilers is a new Wave 1 concept WITHOUT a full article -> NO learn-more-link
    const learnMore = screen.queryByTestId("learn-more-link");
    expect(learnMore).toBeNull();
  });

  it("renders Level 1 overview paragraphs for concepts with full articles and provides wave1 Learn more link", async () => {
    const pageComponent = await M2Wave1UniversePage({
      searchParams: Promise.resolve({ concept: "virtual-memory" }),
    });
    render(pageComponent);

    const overviewP1 = screen.getByText(/Virtual memory is an architectural technique/i);
    expect(overviewP1).toBeDefined();

    const learnMore = screen.getByTestId("learn-more-link");
    expect(learnMore).toBeDefined();
    expect(learnMore.getAttribute("href")).toBe(
      "/lab/knowledge-reader/virtual-memory?from=wave1-universe"
    );
  });

  it("renders Level 1 overview paragraphs for new Wave 1 concepts without articles and suppresses Learn more link", async () => {
    const pageComponent = await M2Wave1UniversePage({
      searchParams: Promise.resolve({ concept: "alan-turing" }),
    });
    render(pageComponent);

    const heading = screen.getByRole("heading", { level: 2, name: "Alan Turing" });
    expect(heading).toBeDefined();

    const overviewP1 = screen.getByText(/Alan Turing was an English mathematician/i);
    expect(overviewP1).toBeDefined();

    // Verify learn more link is NOT rendered
    expect(screen.queryByTestId("learn-more-link")).toBeNull();
  });

  it("maintains wave1 navigation mode: selecting a connected concept updates URL with ?concept=<slug>", async () => {
    const pushStateSpy = vi.spyOn(window.history, "pushState");
    const pageComponent = await M2Wave1UniversePage({
      searchParams: Promise.resolve({ concept: "rust" }),
    });
    render(pageComponent);

    // Find a connection button in the panel (e.g. Compilers, which is connected to Rust in Wave 1)
    const compilersBtn = screen.getByRole("button", {
      name: /Explore connected concept: Compilers/i,
    });
    fireEvent.click(compilersBtn);

    // URL should be updated with ?concept=compilers, not /concept/compilers
    expect(pushStateSpy).toHaveBeenCalled();
    const lastCall = pushStateSpy.mock.calls[pushStateSpy.mock.calls.length - 1];
    expect(lastCall?.[2]).toContain("concept=compilers");
    expect(lastCall?.[2]).not.toBe("/concept/compilers");

    pushStateSpy.mockRestore();
  });

  it("restores selected concept on browser popstate navigation", async () => {
    const pageComponent = await M2Wave1UniversePage({});
    render(pageComponent);

    expect(screen.getByRole("heading", { level: 2, name: "Rust" })).toBeDefined();

    // Simulate browser Back/Forward to ?concept=alan-turing
    window.history.pushState(null, "", "/lab/m2-wave1-universe?concept=alan-turing");
    fireEvent(window, new PopStateEvent("popstate"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: "Alan Turing" })).toBeDefined();
    });
  });
});
