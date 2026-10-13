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

    // Verify SVG planet silhouette mask to guarantee zero glow over the world
    const mask = container.querySelector("#planetSilhouetteMask");
    expect(mask).toBeDefined();
    const maskCircle = mask?.querySelector("circle");
    expect(maskCircle?.getAttribute("cx")).toBe("450");
    expect(maskCircle?.getAttribute("cy")).toBe("350");
    expect(maskCircle?.getAttribute("r")).toBe("50.5");
    expect(maskCircle?.getAttribute("fill")).toBe("black");

    // Verify masked group wraps projection elements
    const maskedGroup = container.querySelector("g[mask='url(#planetSilhouetteMask)']");
    expect(maskedGroup).toBeDefined();

    // Check for limb emission ellipse and path elements
    const ellipse = maskedGroup?.querySelector("ellipse");
    expect(ellipse).toBeDefined();

    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(5);
  });

  it("renders mobile vertical stream and crest rim when isMobile is true", () => {
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 400,
      right: 375,
      bottom: 667,
      width: 375,
      height: 267,
      x: 0,
      y: 400,
      toJSON: () => {},
    }));

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

    // Verify mobile planet silhouette mask
    const mobileMask = container.querySelector("#mobilePlanetSilhouetteMask");
    expect(mobileMask).toBeDefined();
    const mobileCircle = mobileMask?.querySelector("circle");
    expect(mobileCircle?.getAttribute("cx")).toBe("200");
    expect(mobileCircle?.getAttribute("cy")).toBe("150");
    expect(mobileCircle?.getAttribute("r")).toBe("40.5");
    expect(mobileCircle?.getAttribute("fill")).toBe("black");

    const maskedGroup = container.querySelector("g[mask='url(#mobilePlanetSilhouetteMask)']");
    expect(maskedGroup).toBeDefined();

    const path = maskedGroup?.querySelector("path");
    expect(path).toBeDefined();

    const line = container.querySelector("line");
    expect(line).toBeDefined();
  });

  it("suppresses mobile projection stream when isMobileExpanded is true (G53-03)", () => {
    const panelRef = createMockRef();
    const { container } = render(
      <CelestialProjectionBridge
        focusPos={{ x: 200, y: 150, radius: 40 }}
        archetype="storm-giant"
        panelRef={panelRef}
        isMobile={true}
        isMobileExpanded={true}
      />
    );

    // When expanded, the bridge must not render over the reading panel
    expect(container.firstChild).toBeNull();
  });

  it("suppresses mobile projection stream when lens top is above planet bottom (G53-03)", () => {
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 100, // Above planetBottomY (150 + 41.5 = 191.5)
      right: 375,
      bottom: 700,
      width: 375,
      height: 600,
      x: 0,
      y: 100,
      toJSON: () => {},
    }));

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

    expect(container.firstChild).toBeNull();
  });

  it("adjusts departure radius and silhouette mask beyond outer ring radius when rings are present (G53-02)", () => {
    const panelRef = createMockRef();
    const ringConfig = {
      innerRadius: 66,
      outerRadius: 96,
      tilt: 0.42,
      opacity: 0.88,
      style: "ice" as const,
    };

    const { container } = render(
      <CelestialProjectionBridge
        focusPos={{ x: 450, y: 350, radius: 50 }}
        archetype="storm-giant"
        rings={ringConfig}
        panelRef={panelRef}
        isMobile={false}
      />
    );

    // ringVisualRadius = (96 / 50) * 50 = 96
    // Mask circle radius must be greater than 96 to shield entire ring system
    const mask = container.querySelector("#planetSilhouetteMask");
    expect(mask).toBeDefined();
    const maskCircle = mask?.querySelector("circle");
    const maskRadius = Number(maskCircle?.getAttribute("r"));
    expect(maskRadius).toBeGreaterThan(96);

    // Silhouette masked group should exist
    const maskedGroup = container.querySelector("g[mask='url(#planetSilhouetteMask)']");
    expect(maskedGroup).toBeDefined();
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
