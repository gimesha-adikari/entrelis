import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Entrelis Landing Shell", () => {
  it("renders the primary brand title and core proposition", () => {
    render(<Home />);

    const headings = screen.getAllByRole("heading");
    const h1 = headings.find((h) => h.tagName.toLowerCase() === "h1");
    expect(h1).toBeDefined();
    expect(h1?.textContent).toBe("Entrelis");

    expect(screen.getByText("Everything is connected. Pick somewhere to start.")).toBeDefined();
  });

  it("renders semantic landmarks for accessible structure", () => {
    render(<Home />);

    expect(screen.getByRole("banner")).toBeDefined();
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByRole("contentinfo")).toBeDefined();
  });

  it("renders the upcoming vertical slice path nodes", () => {
    render(<Home />);

    expect(screen.getByText("Rust")).toBeDefined();
    expect(screen.getByText("Ownership")).toBeDefined();
    expect(screen.getByText("Memory")).toBeDefined();
    expect(screen.getByText("Stack & Heap")).toBeDefined();
    expect(screen.getByText("Operating Systems")).toBeDefined();
    expect(screen.getByText("CPUs")).toBeDefined();
    expect(screen.getByText("Transistors")).toBeDefined();
  });
});
