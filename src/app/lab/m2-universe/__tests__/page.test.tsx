import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import M2UniversePage, { generateMetadata } from "../page";

describe("/lab/m2-universe Page Route", () => {
  beforeEach(() => {
    window.history.pushState(null, "", "/lab/m2-universe");
  });

  it("generates correct no-index preview metadata for default and concept parameters", async () => {
    const defaultMeta = await generateMetadata({});
    expect(defaultMeta.title).toBe("M2 Connected Universe Preview (13 Nodes) — Entrelis Lab");
    expect(defaultMeta.robots).toEqual({ index: false, follow: false });

    const vmMeta = await generateMetadata({
      searchParams: Promise.resolve({ concept: "virtual-memory" }),
    });
    expect(vmMeta.title).toBe("Virtual Memory — M2 Connected Universe Preview | Entrelis Lab");
    expect(vmMeta.robots).toEqual({ index: false, follow: false });
  });

  it("renders the 13-node universe with editorial research preview badge and tagline", async () => {
    const pageComponent = await M2UniversePage({});
    render(pageComponent);

    const badge = screen.getByTestId("m2-preview-badge");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("M2 Preview · 13 Nodes");

    expect(screen.getByText(/Editorial Research Universe Preview/)).toBeDefined();
  });

  it("initializes selected concept from searchParams (?concept=concurrency)", async () => {
    const pageComponent = await M2UniversePage({
      searchParams: Promise.resolve({ concept: "concurrency" }),
    });
    render(pageComponent);

    // ConceptPanel should display Concurrency details
    const heading = screen.getByRole("heading", { level: 2, name: "Concurrency" });
    expect(heading).toBeDefined();

    // Learn more link should include from=m2-universe
    const learnMore = screen.getByTestId("learn-more-link");
    expect(learnMore.getAttribute("href")).toBe(
      "/lab/knowledge-reader/concurrency?from=m2-universe"
    );
  });

  it("renders Level 1 overview paragraphs for pilot concepts with Learn more link", async () => {
    const pageComponent = await M2UniversePage({
      searchParams: Promise.resolve({ concept: "virtual-memory" }),
    });
    render(pageComponent);

    const overviewP1 = screen.getByText(/Virtual memory is an architectural technique/i);
    expect(overviewP1).toBeDefined();

    const learnMore = screen.getByTestId("learn-more-link");
    expect(learnMore.getAttribute("href")).toBe(
      "/lab/knowledge-reader/virtual-memory?from=m2-universe"
    );
  });

  it("maintains lab navigation mode: selecting a connected concept updates URL with ?concept=<slug>", async () => {
    const pushStateSpy = vi.spyOn(window.history, "pushState");
    const pageComponent = await M2UniversePage({
      searchParams: Promise.resolve({ concept: "rust" }),
    });
    render(pageComponent);

    // Find a connection button in the panel (e.g. Ownership)
    const ownershipBtn = screen.getByRole("button", {
      name: /Explore connected concept: Ownership/i,
    });
    fireEvent.click(ownershipBtn);

    // URL should be updated with ?concept=ownership, not /concept/ownership
    expect(pushStateSpy).toHaveBeenCalled();
    const lastCall = pushStateSpy.mock.calls[pushStateSpy.mock.calls.length - 1];
    expect(lastCall?.[2]).toContain("concept=ownership");
    expect(lastCall?.[2]).not.toBe("/concept/ownership");

    pushStateSpy.mockRestore();
  });

  it("restores selected concept on browser popstate navigation", async () => {
    const pageComponent = await M2UniversePage({});
    render(pageComponent);

    expect(screen.getByRole("heading", { level: 2, name: "Rust" })).toBeDefined();

    // Simulate browser Back/Forward to ?concept=machine-code
    window.history.pushState(null, "", "/lab/m2-universe?concept=machine-code");
    fireEvent(window, new PopStateEvent("popstate"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: "Machine Code" })).toBeDefined();
    });
  });
});
