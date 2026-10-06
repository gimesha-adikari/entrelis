import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Entrelis Production Root Homepage", () => {
  it("renders the Entrelis brand title and core proposition", () => {
    render(<Home />);

    const brand = screen.getByRole("heading", { name: "Entrelis" });
    expect(brand).toBeDefined();
    expect(screen.getByText("Everything is connected")).toBeDefined();
  });

  it("renders with Rust selected by default", () => {
    render(<Home />);

    // Detail panel displays Rust title and short description
    const rustHeading = screen.getByRole("heading", { name: "Rust" });
    expect(rustHeading).toBeDefined();
    expect(
      screen.getByText(
        "A systems programming language that combines low-level hardware control with compile-time safety guarantees."
      )
    ).toBeDefined();

    // Ownership connection is present
    expect(screen.getByRole("button", { name: /Explore connected concept: Ownership/i })).toBeDefined();
    expect(screen.getByText(/--uses-->/)).toBeDefined();
  });

  it("renders interactive canvas and reset controls", () => {
    const { container } = render(<Home />);

    expect(container.querySelector("canvas")).toBeDefined();
    expect(screen.getByRole("button", { name: /Reset graph view/i })).toBeDefined();
  });
});
