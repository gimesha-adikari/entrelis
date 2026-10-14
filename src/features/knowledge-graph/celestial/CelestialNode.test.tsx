import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CelestialNode } from "./CelestialNode";
import { STAR_PALETTES } from "./identity";

describe("CelestialNode Component", () => {
  it("renders accessible button and semantic label", () => {
    render(<CelestialNode id="concept-rust" name="Rust" slug="rust" role="focus" />);

    const btn = screen.getByRole("button", { name: /Rust/i });
    expect(btn).not.toBeNull();
    expect(btn.getAttribute("data-role")).toBe("focus");
    expect(btn.getAttribute("data-archetype")).toBe("rocky");
    expect(screen.getByText("Rust")).not.toBeNull();
  });

  it("triggers click and hover handlers", () => {
    const handleClick = vi.fn();
    const handleHover = vi.fn();

    render(
      <CelestialNode
        id="concept-memory"
        name="Memory"
        slug="memory"
        role="primary"
        onClick={handleClick}
        onHover={handleHover}
      />
    );

    const btn = screen.getByRole("button", { name: /Memory/i });
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.mouseEnter(btn);
    expect(handleHover).toHaveBeenCalledWith("concept-memory");

    fireEvent.mouseLeave(btn);
    expect(handleHover).toHaveBeenCalledWith(null);
  });

  it("renders all four archetypes cleanly", () => {
    const archetypes = ["rocky", "gas", "ice", "star"] as const;

    for (const archetype of archetypes) {
      const { container } = render(
        <CelestialNode
          id={`test-${archetype}`}
          name={`Test ${archetype}`}
          slug={archetype}
          role="primary"
          forcedArchetype={archetype}
        />
      );

      expect(container.querySelector("svg")).not.toBeNull();
      expect(container.querySelector("button")?.getAttribute("data-archetype")).toBe(archetype);
    }
  });

  it("preserves concept identity when transitioning from context to primary to focus", () => {
    const { rerender } = render(
      <CelestialNode id="concept-ownership" name="Ownership" slug="ownership" role="context" />
    );

    let btn = screen.getByRole("button");
    const initialArchetype = btn.getAttribute("data-archetype");

    rerender(
      <CelestialNode id="concept-ownership" name="Ownership" slug="ownership" role="primary" />
    );
    btn = screen.getByRole("button");
    expect(btn.getAttribute("data-archetype")).toBe(initialArchetype);

    rerender(
      <CelestialNode id="concept-ownership" name="Ownership" slug="ownership" role="focus" />
    );
    btn = screen.getByRole("button");
    expect(btn.getAttribute("data-archetype")).toBe(initialArchetype);
  });

  it("supports forced palette override for design testing", () => {
    render(
      <CelestialNode
        id="concept-test"
        name="Custom Star"
        slug="custom-star"
        role="focus"
        forcedArchetype="star"
        forcedPalette={STAR_PALETTES[0]}
      />
    );

    expect(screen.getByRole("button").getAttribute("data-archetype")).toBe("star");
  });
});
