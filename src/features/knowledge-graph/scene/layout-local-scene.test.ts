import { describe, expect, it } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { buildLocalUniverseScene } from "./build-local-scene";
import { layoutLocalUniverseScene } from "./layout-local-scene";

describe("layoutLocalUniverseScene", () => {
  it("places focus node at the designated focal origin", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
      focalOffsetX: -100,
      focalOffsetY: 0,
    });

    expect(laidOut.focus.x).toBe(-100);
    expect(laidOut.focus.y).toBe(0);
  });

  it("places primary nodes on an orbital ring around the focus node", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "ownership",
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
      focalOffsetX: 0,
      focalOffsetY: 0,
    });

    for (const primary of laidOut.primaryNodes) {
      const dist = Math.hypot(primary.x - laidOut.focus.x, primary.y - laidOut.focus.y);
      // Primary ring radius should be around 180 - 240px
      expect(dist).toBeGreaterThanOrEqual(160);
      expect(dist).toBeLessThanOrEqual(250);
    }
  });

  it("places context nodes on an outer ring beyond the primary ring", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    expect(laidOut.contextNodes.length).toBeGreaterThan(0);
    for (const contextNode of laidOut.contextNodes) {
      const dist = Math.hypot(contextNode.x - laidOut.focus.x, contextNode.y - laidOut.focus.y);
      // Context ring should be distinctly further than primary ring (approx 280 - 380px)
      expect(dist).toBeGreaterThanOrEqual(280);
      expect(dist).toBeLessThanOrEqual(400);
    }
  });

  it("produces strictly deterministic coordinates across runs", () => {
    const scene1 = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    });
    const laidOut1 = layoutLocalUniverseScene(scene1, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    const scene2 = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    });
    const laidOut2 = layoutLocalUniverseScene(scene2, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    for (let i = 0; i < laidOut1.allNodes.length; i++) {
      const n1 = laidOut1.allNodes[i]!;
      const n2 = laidOut2.allNodes[i]!;
      expect(n1.x).toBeCloseTo(n2.x, 5);
      expect(n1.y).toBeCloseTo(n2.y, 5);
    }
  });

  it("contains no NaN, Infinity, or undefined coordinates", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "operating-systems",
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    for (const node of laidOut.allNodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isNaN(node.x)).toBe(false);
      expect(Number.isNaN(node.y)).toBe(false);
    }
  });

  it("maintains minimum physical clearance between all visible nodes", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    const nodes = laidOut.allNodes;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ni = nodes[i]!;
        const nj = nodes[j]!;
        const dist = Math.hypot(ni.x - nj.x, ni.y - nj.y);
        const combinedRadii = ni.radius + nj.radius;
        // Nodes must not overlap and should maintain comfortable breathing room (>= 40px)
        expect(dist).toBeGreaterThan(combinedRadii + 30);
      }
    }
  });

  it("adapts layout geometry for mobile viewport", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: true,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 375,
      viewportHeight: 812,
      isMobile: true,
    });

    // Mobile focal position centered or elevated slightly for bottom panel
    expect(laidOut.focus.x).toBe(0);

    // Radii on mobile should be more compact than desktop
    for (const primary of laidOut.primaryNodes) {
      const dist = Math.hypot(primary.x - laidOut.focus.x, primary.y - laidOut.focus.y);
      expect(dist).toBeGreaterThanOrEqual(100);
      expect(dist).toBeLessThanOrEqual(180);
    }
  });

  it("scales constellation radii proportionally with viewport dimensions", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "ownership",
      isMobile: false,
    });

    const smallViewport = layoutLocalUniverseScene(scene, {
      viewportWidth: 800,
      viewportHeight: 600,
      isMobile: false,
    });

    const largeViewport = layoutLocalUniverseScene(scene, {
      viewportWidth: 1600,
      viewportHeight: 1200,
      isMobile: false,
    });

    const smallDist = Math.hypot(
      smallViewport.primaryNodes[0]!.x - smallViewport.focus.x,
      smallViewport.primaryNodes[0]!.y - smallViewport.focus.y
    );
    const largeDist = Math.hypot(
      largeViewport.primaryNodes[0]!.x - largeViewport.focus.x,
      largeViewport.primaryNodes[0]!.y - largeViewport.focus.y
    );

    expect(largeDist).toBeGreaterThan(smallDist);
  });

  it("uses asymmetric slot templates that avoid exact 180° opposition and mechanical symmetry", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "ownership", // Has exactly 2 primary neighbors: rust & memory
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    expect(laidOut.primaryNodes.length).toBe(2);
    const n1 = laidOut.primaryNodes[0]!;
    const n2 = laidOut.primaryNodes[1]!;

    const angle1 = Math.atan2(n1.y - laidOut.focus.y, n1.x - laidOut.focus.x);
    const angle2 = Math.atan2(n2.y - laidOut.focus.y, n2.x - laidOut.focus.x);
    let diff = Math.abs(angle1 - angle2);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    // Angle difference must NOT be exactly 180° (Math.PI)
    expect(Math.abs(diff - Math.PI)).toBeGreaterThan(0.12);
  });

  it("crossing desktop/mobile breakpoint dynamically changes scene budget and geometry", () => {
    const desktopScene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    });
    const desktopLaidOut = layoutLocalUniverseScene(desktopScene, {
      viewportWidth: 1024,
      viewportHeight: 768,
      isMobile: false,
    });

    const mobileScene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: true,
    });
    const mobileLaidOut = layoutLocalUniverseScene(mobileScene, {
      viewportWidth: 375,
      viewportHeight: 812,
      isMobile: true,
    });

    expect(desktopLaidOut.primaryNodes.length).toBeGreaterThanOrEqual(
      mobileLaidOut.primaryNodes.length
    );
    expect(desktopLaidOut.contextNodes.length).toBeGreaterThanOrEqual(
      mobileLaidOut.contextNodes.length
    );
    expect(mobileLaidOut.allNodes.length).toBeLessThanOrEqual(6);
    expect(desktopLaidOut.allNodes.length).toBeLessThanOrEqual(10);
    expect(mobileLaidOut.focus.x).toBe(0);
    expect(desktopLaidOut.focus.x).toBe(-100);
  });

  it("adaptively positions focus node based on knowledgeFieldWidth to keep celestial sky clear", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    });

    // Default width (480px) on 1440x900
    const defaultLaidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1440,
      viewportHeight: 900,
      isMobile: false,
      knowledgeFieldWidth: 480,
    });

    // Wide field (680px) on 1440x900
    const wideLaidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1440,
      viewportHeight: 900,
      isMobile: false,
      knowledgeFieldWidth: 680,
    });

    // As field width increases, focus node must shift left to preserve celestial breathing room
    expect(wideLaidOut.focus.x).toBeLessThan(defaultLaidOut.focus.x);

    // Verify rightmost node stays well to the left of the knowledge field contour (1440 - 480 = 960)
    for (const node of defaultLaidOut.allNodes) {
      const screenX = 1440 / 2 + node.x;
      expect(screenX).toBeLessThan(1440 - 480 - 40); // at least 40px buffer
    }
  });

  it("resolves collision-free labels for all concepts on mobile viewports (390x844 and 360x640) without mutual overlap", () => {
    for (const [width, height] of [
      [390, 844],
      [360, 640],
    ]) {
      for (const concept of SEED_DATASET.concepts) {
        const rawScene = buildLocalUniverseScene({
          dataset: SEED_DATASET,
          focusSlug: concept.slug,
          isMobile: true,
        });

        const laidOut = layoutLocalUniverseScene(rawScene, {
          viewportWidth: width,
          viewportHeight: height,
          isMobile: true,
        });

        // Verify every node receives resolved label properties
        for (const node of laidOut.allNodes) {
          expect(typeof node.labelOffsetX).toBe("number");
          expect(typeof node.labelOffsetY).toBe("number");
          expect(node.labelAlignment).toBeDefined();
          expect(node.labelBaseline).toBeDefined();
          expect(typeof node.labelFontSize).toBe("number");
          expect(Number.isFinite(node.labelOffsetX)).toBe(true);
          expect(Number.isFinite(node.labelOffsetY)).toBe(true);
        }

        // Compute bounding box for every node
        interface Box {
          readonly name: string;
          readonly left: number;
          readonly right: number;
          readonly top: number;
          readonly bottom: number;
        }

        const boxes: Box[] = laidOut.allNodes.map((node) => {
          const fontSize = node.labelFontSize ?? 11;
          const textWidth = Math.max(1, node.name.length * fontSize * 0.58);
          const textHeight = fontSize * 1.15;

          const lx = node.x + (node.labelOffsetX ?? 0);
          const ly = node.y + (node.labelOffsetY ?? 0);

          let boxLeft = lx;
          if (node.labelAlignment === "center") boxLeft = lx - textWidth / 2;
          else if (node.labelAlignment === "right") boxLeft = lx - textWidth;

          let boxTop = ly;
          if (node.labelBaseline === "middle") boxTop = ly - textHeight / 2;
          else if (node.labelBaseline === "bottom") boxTop = ly - textHeight;

          return {
            name: node.name,
            left: boxLeft,
            right: boxLeft + textWidth,
            top: boxTop,
            bottom: boxTop + textHeight,
          };
        });

        // Verify zero label-label overlaps with at least 0px clearance
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const b1 = boxes[i]!;
            const b2 = boxes[j]!;
            const xOverlap = Math.max(0, Math.min(b1.right, b2.right) - Math.max(b1.left, b2.left));
            const yOverlap = Math.max(0, Math.min(b1.bottom, b2.bottom) - Math.max(b1.top, b2.top));
            expect(
              xOverlap > 0 && yOverlap > 0,
              `Collision detected between "${b1.name}" and "${b2.name}" under focus "${concept.name}" on ${width}x${height} viewport`
            ).toBe(false);
          }
        }

        // Specifically verify "Operating Systems" focus node does not overlap "Stack & Heap"
        if (concept.slug === "operating-systems") {
          const osBox = boxes.find((b) => b.name === "Operating Systems");
          const shBox = boxes.find((b) => b.name === "Stack & Heap");
          expect(osBox).toBeDefined();
          expect(shBox).toBeDefined();
          if (osBox && shBox) {
            const xOver = Math.max(0, Math.min(osBox.right, shBox.right) - Math.max(osBox.left, shBox.left));
            const yOver = Math.max(0, Math.min(osBox.bottom, shBox.bottom) - Math.max(osBox.top, shBox.top));
            expect(xOver * yOver).toBe(0);
          }
        }
      }
    }
  });

  it("maintains safe clearance between Home/zoom navigation controls and celestial bodies & labels across 360x640 and 390x844 viewports", () => {
    const viewports = [
      [360, 640],
      [390, 844],
    ] as const;

    for (const [width, height] of viewports) {
      // Top-left masthead/controls reserved box in screen coordinates
      const controlsBox = {
        left: 0,
        right: 165,
        top: 0,
        bottom: 86,
      };

      for (const concept of SEED_DATASET.concepts) {
        const rawScene = buildLocalUniverseScene({
          dataset: SEED_DATASET,
          focusSlug: concept.slug,
          isMobile: true,
        });

        const laidOut = layoutLocalUniverseScene(rawScene, {
          viewportWidth: width,
          viewportHeight: height,
          isMobile: true,
        });

        // Check focus planet in screen coordinates
        const fx = width / 2 + laidOut.focus.x;
        const fy = height / 2 + laidOut.focus.y;
        const fr = laidOut.focus.radius;

        // Focus planet bounding box
        const focusScreenBox = {
          left: fx - fr,
          right: fx + fr,
          top: fy - fr,
          bottom: fy + fr,
        };

        const xOver = Math.max(0, Math.min(controlsBox.right, focusScreenBox.right) - Math.max(controlsBox.left, focusScreenBox.left));
        const yOver = Math.max(0, Math.min(controlsBox.bottom, focusScreenBox.bottom) - Math.max(controlsBox.top, focusScreenBox.top));
        expect(
          xOver > 0 && yOver > 0,
          `Focus planet "${concept.name}" on ${width}x${height} collides with top-left controls!`
        ).toBe(false);

        // Distance from controls bottom to focus planet top must be at least 30px
        expect(
          focusScreenBox.top - controlsBox.bottom,
          `Clearance between controls and "${concept.name}" on ${width}x${height} is insufficient`
        ).toBeGreaterThanOrEqual(30);

        // Also check that no label box intersects controlsBox
        for (const node of laidOut.allNodes) {
          const fontSize = node.labelFontSize ?? 11;
          const textWidth = Math.max(1, node.name.length * fontSize * 0.58);
          const textHeight = fontSize * 1.15;

          const lx = width / 2 + node.x + (node.labelOffsetX ?? 0);
          const ly = height / 2 + node.y + (node.labelOffsetY ?? 0);

          let boxLeft = lx;
          if (node.labelAlignment === "center") boxLeft = lx - textWidth / 2;
          else if (node.labelAlignment === "right") boxLeft = lx - textWidth;

          let boxTop = ly;
          if (node.labelBaseline === "middle") boxTop = ly - textHeight / 2;
          else if (node.labelBaseline === "bottom") boxTop = ly - textHeight;

          const labelBox = {
            left: boxLeft,
            right: boxLeft + textWidth,
            top: boxTop,
            bottom: boxTop + textHeight,
          };

          const lXOver = Math.max(0, Math.min(controlsBox.right, labelBox.right) - Math.max(controlsBox.left, labelBox.left));
          const lYOver = Math.max(0, Math.min(controlsBox.bottom, labelBox.bottom) - Math.max(controlsBox.top, labelBox.top));
          expect(
            lXOver > 0 && lYOver > 0,
            `Label "${node.name}" on ${width}x${height} collides with top-left controls!`
          ).toBe(false);
        }
      }
    }
  });
});
