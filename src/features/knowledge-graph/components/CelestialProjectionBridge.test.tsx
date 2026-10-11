import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import CelestialProjectionBridge from "./CelestialProjectionBridge";

describe("CelestialProjectionBridge", () => {
  beforeEach(() => {
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 800,
      top: 50,
      right: 1400,
      bottom: 850,
      width: 600,
      height: 800,
      x: 800,
      y: 50,
      toJSON: () => {},
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockRef(): React.RefObject<HTMLElement | null> {
    const el = document.createElement("aside");
    return { current: el };
  }

  it("returns null when focusPos is null", () => {
    const panelRef = createMockRef();
    const { container } = render(
      <CelestialProjectionBridge focusPos={null} panelRef={panelRef} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when panelRef.current is null", () => {
    const nullRef = { current: null };
    const { container } = render(
      <CelestialProjectionBridge
        focusPos={{ x: 400, y: 300, radius: 45 }}
        panelRef={nullRef}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders desktop projection bridge with SVG paths and archetype styling", () => {
    const panelRef = createMockRef();
    const { container } = render(
      <CelestialProjectionBridge
        focusPos={{ x: 450, y: 350, radius: 50 }}
        archetype="volcanic-rocky"
        panelRef={panelRef}
        isMobile={false}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");

    // Check for gradients and filters
    expect(container.querySelector("#projectionGlow")).toBeDefined();
    expect(container.querySelector("#projectionVeilGradient")).toBeDefined();
    expect(container.querySelector("#contourArcStroke")).toBeDefined();
    expect(container.querySelector("#limbEmission")).toBeDefined();

    // Check for limb emission ellipse and path elements
    const ellipse = container.querySelector("ellipse");
    expect(ellipse).toBeDefined();

    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(4);
  });

  it("renders mobile vertical stream and crest rim when isMobile is true", () => {
    const panelRef = createMockRef();
    const { container } = render(
      <CelestialProjectionBridge
        focusPos={{ x: 200, y: 150, radius: 40 }}
        archetype="storm-giant"
        panelRef={panelRef}
        isMobile={true}
        isMobileExpanded={false}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();

    expect(container.querySelector("#mobileVeilGradient")).toBeDefined();
    expect(container.querySelector("#mobileRimGradient")).toBeDefined();

    const path = container.querySelector("path");
    expect(path).toBeDefined();

    const line = container.querySelector("line");
    expect(line).toBeDefined();
  });

  it("cleans up event listeners and ResizeObserver on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const disconnectMock = vi.fn();
    const originalRO = window.ResizeObserver;

    window.ResizeObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = disconnectMock;
    } as unknown as typeof ResizeObserver;

    const panelRef = createMockRef();
    const { unmount } = render(
      <CelestialProjectionBridge
        focusPos={{ x: 400, y: 300, radius: 45 }}
        archetype="mineral-rocky"
        panelRef={panelRef}
      />
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(disconnectMock).toHaveBeenCalled();

    window.ResizeObserver = originalRO;
  });
});
