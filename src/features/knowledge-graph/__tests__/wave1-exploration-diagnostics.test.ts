import { describe, it, expect } from "vitest";
import { WAVE1_PREVIEW_DATASET } from "@/data/preview";
import { getOrCreateKnowledgeGraphIndex } from "../knowledge-index";
import { buildLocalUniverseScene } from "../scene/build-local-scene";
import { DESKTOP_SCENE_BUDGET, MOBILE_SCENE_BUDGET } from "../scene/types";

describe("Wave 1 Exploration & Scene Budget Diagnostics", () => {
  const index = getOrCreateKnowledgeGraphIndex(WAVE1_PREVIEW_DATASET);

  it("calculates degree and scene truncation across all 33 concepts on desktop and mobile", () => {
    const diagnostics = WAVE1_PREVIEW_DATASET.concepts.map((concept) => {
      const allRels = index.relationshipsByConceptId.get(concept.id) ?? [];
      // Unique neighbor concept IDs
      const neighborIds = new Set<string>();
      for (const r of allRels) {
        const otherId = r.sourceConceptId === concept.id ? r.targetConceptId : r.sourceConceptId;
        neighborIds.add(otherId);
      }

      const desktopScene = buildLocalUniverseScene({
        index,
        focusSlug: concept.slug,
        isMobile: false,
      });

      const mobileScene = buildLocalUniverseScene({
        index,
        focusSlug: concept.slug,
        isMobile: true,
      });

      const desktopPrimaryIds = new Set(desktopScene.primaryNodes.map((n) => n.id));
      const desktopSceneIds = new Set(desktopScene.allNodes.map((n) => n.id));

      const mobilePrimaryIds = new Set(mobileScene.primaryNodes.map((n) => n.id));
      const mobileSceneIds = new Set(mobileScene.allNodes.map((n) => n.id));

      const desktopTruncatedFromPrimary = Array.from(neighborIds).filter((id) => !desktopPrimaryIds.has(id));
      const desktopMissingFromEntireScene = Array.from(neighborIds).filter((id) => !desktopSceneIds.has(id));

      const mobileTruncatedFromPrimary = Array.from(neighborIds).filter((id) => !mobilePrimaryIds.has(id));
      const mobileMissingFromEntireScene = Array.from(neighborIds).filter((id) => !mobileSceneIds.has(id));

      return {
        slug: concept.slug,
        name: concept.name,
        degree: neighborIds.size,
        desktop: {
          visiblePrimary: desktopScene.primaryNodes.length,
          truncatedFromPrimary: desktopTruncatedFromPrimary.length,
          truncatedSlugs: desktopTruncatedFromPrimary.map((id) => index.conceptById.get(id)?.slug),
          missingFromScene: desktopMissingFromEntireScene.length,
          missingSlugs: desktopMissingFromEntireScene.map((id) => index.conceptById.get(id)?.slug),
        },
        mobile: {
          visiblePrimary: mobileScene.primaryNodes.length,
          truncatedFromPrimary: mobileTruncatedFromPrimary.length,
          truncatedSlugs: mobileTruncatedFromPrimary.map((id) => index.conceptById.get(id)?.slug),
          missingFromScene: mobileMissingFromEntireScene.length,
          missingSlugs: mobileMissingFromEntireScene.map((id) => index.conceptById.get(id)?.slug),
        },
      };
    });

    const highDegreeDesktop = diagnostics.filter((d) => d.desktop.truncatedFromPrimary > 0);
    const highDegreeMobile = diagnostics.filter((d) => d.mobile.truncatedFromPrimary > 0);

    // Desktop findings
    // Concepts with > 6 connections lose primary planetary bodies on desktop
    expect(highDegreeDesktop.map((d) => d.slug)).toEqual(
      expect.arrayContaining(["operating-systems", "cpus", "memory"])
    );

    // Operating Systems specifically:
    const osDiag = diagnostics.find((d) => d.slug === "operating-systems")!;
    expect(osDiag.degree).toBe(7); // 7 unique neighbor concepts (with 8 relationships)
    expect(osDiag.desktop.truncatedFromPrimary).toBe(1);
    expect(osDiag.desktop.missingFromScene).toBe(1); // At least 1 neighbor is 100% missing from celestial canvas

    // Mobile findings:
    // On mobile, maxPrimary = 4, so any node with degree > 4 loses primary bodies
    expect(highDegreeMobile.length).toBeGreaterThanOrEqual(5);

    // Document exact missing counts for audit
    expect(osDiag.mobile.truncatedFromPrimary).toBe(3); // 3 out of 7 neighbors truncated on mobile
  });

  it("proves the asymmetric return-path trap: navigating A -> B where B drops A from its celestial scene", () => {
    // Navigate from memory to operating-systems:
    // Memory has operating-systems as primary
    const memoryScene = buildLocalUniverseScene({
      index,
      focusSlug: "memory",
      isMobile: false,
    });
    const memoryPrimaries = memoryScene.primaryNodes.map((n) => n.slug);
    expect(memoryPrimaries).toContain("operating-systems");

    // But Operating Systems drops memory from its scene because of ID sorting tie-break and maxPrimary = 6!
    const osScene = buildLocalUniverseScene({
      index,
      focusSlug: "operating-systems",
      isMobile: false,
    });
    const osSceneSlugs = osScene.allNodes.map((n) => n.slug);

    // Demonstrates empirical bug: user clicks 'Operating Systems' in 3D canvas,
    // and once arrived at Operating Systems, 'Memory' is NOT visible in the 3D celestial canvas!
    expect(osSceneSlugs).not.toContain("memory");
  });

  it("confirms ConceptPanel maintains full relationship discoverability while 3D canvas is truncated", () => {
    const osConcept = index.conceptBySlug.get("operating-systems")!;
    const allRels = index.relationshipsByConceptId.get(osConcept.id) ?? [];
    
    // ConceptPanel displays all connections from the index
    expect(allRels.length).toBe(8);

    // 3D scene only shows 6 primary nodes on desktop and 4 on mobile
    const desktopScene = buildLocalUniverseScene({ index, focusSlug: "operating-systems", isMobile: false });
    const mobileScene = buildLocalUniverseScene({ index, focusSlug: "operating-systems", isMobile: true });

    expect(desktopScene.primaryNodes.length).toBe(DESKTOP_SCENE_BUDGET.maxPrimary); // 6
    expect(mobileScene.primaryNodes.length).toBe(MOBILE_SCENE_BUDGET.maxPrimary); // 4

    // Confirms UI/canvas divergence
    expect(allRels.length).toBeGreaterThan(desktopScene.primaryNodes.length);
  });
});
