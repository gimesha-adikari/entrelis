"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Celestial3DController,
  type CatalogItemEntry,
  type ItemScreenPosition,
} from "./controller";
import { CATALOG_ARCHETYPES, ENTRELIS_CONCEPT_IDENTITIES } from "./identity";
import styles from "./Celestial3DLab.module.css";

type CategoryFilter =
  | "ALL"
  | "BLUE_ATM_CLOSE"
  | "STORM_GIANT_CLOSE"
  | "ICY_RING_CLOSE"
  | "DUST_RING_CLOSE"
  | "BROKEN_RING_CLOSE"
  | "RINGED_GAS_CLOSE"
  | "RINGED_ROCKY_CLOSE"
  | "GAS_RINGS_84PX"
  | "RING_OCCLUSION"
  | "STORM_ROT"
  | "RINGED_ROT"
  | "STARS"
  | "STARS_84PX"
  | "STARS_SCALE"
  | "CONFUSION_TEST"
  | "GOLDEN_CLOSE"
  | "BLUE_CLOSE"
  | "EMBER_CLOSE"
  | "VOLCANIC_CLOSE"
  | "MINERAL_CLOSE"
  | "LIFE_CLOSE"
  | "ROCKY_LIFE_84PX"
  | "CONFUSION_ROW_84PX"
  | "VOLCANIC_ROT"
  | "LIFE_ROT"
  | "ROCKY"
  | "BIOLOGICAL"
  | "ATMOSPHERIC"
  | "METALLIC_CLOSE"
  | "CRYSTAL_CLOSE"
  | "STRUCTURAL_84PX"
  | "STRUCTURAL_CONFUSION_84PX"
  | "METALLIC_ROT"
  | "CRYSTAL_ROT"
  | "ASTEROID_CARBON_CLOSE"
  | "ASTEROID_MINERAL_CLOSE"
  | "ASTEROID_DEBRIS_CLOSE"
  | "ASTEROIDS_84PX"
  | "ASTEROID_SILHOUETTES"
  | "ASTEROID_CARBON_ROT"
  | "ASTEROID_MINERAL_ROT"
  | "STRUCTURAL"
  | "SMALL BODIES"
  | "CONCEPTS";

const STARS_84PX_ITEMS: readonly CatalogItemEntry[] = [
  {
    id: "golden-84px",
    name: "Golden Star (84px)",
    identity: { archetype: "golden-star", seed: 101 },
    radius: 42,
  },
  {
    id: "blue-84px",
    name: "Blue-White Star (84px)",
    identity: { archetype: "blue-star", seed: 102 },
    radius: 42,
  },
  {
    id: "ember-84px",
    name: "Ember Star (84px)",
    identity: { archetype: "ember-star", seed: 103 },
    radius: 42,
  },
];

const STAR_SCALE_ITEMS: readonly CatalogItemEntry[] = [
  {
    id: "golden-detail",
    name: "Golden Star (Detail)",
    identity: { archetype: "golden-star", seed: 101 },
    radius: 56,
  },
  {
    id: "blue-detail",
    name: "Blue-White Star (Detail)",
    identity: { archetype: "blue-star", seed: 102 },
    radius: 56,
  },
  {
    id: "ember-detail",
    name: "Ember Star (Detail)",
    identity: { archetype: "ember-star", seed: 103 },
    radius: 56,
  },
  {
    id: "golden-84px",
    name: "Golden (84px Node)",
    identity: { archetype: "golden-star", seed: 101 },
    radius: 42,
  },
  {
    id: "blue-84px",
    name: "Blue-White (84px Node)",
    identity: { archetype: "blue-star", seed: 102 },
    radius: 42,
  },
  {
    id: "ember-84px",
    name: "Ember (84px Node)",
    identity: { archetype: "ember-star", seed: 103 },
    radius: 42,
  },
];

const CONFUSION_TEST_ITEMS: readonly CatalogItemEntry[] = [
  {
    id: "volcanic-rocky-84px",
    name: "Volcanic Rocky (84px)",
    identity: { archetype: "volcanic-rocky", seed: 201 },
    radius: 42,
    category: "CONFUSION_TEST",
  },
  {
    id: "blue-star-84px",
    name: "Blue-White Star (84px)",
    identity: { archetype: "blue-star", seed: 102 },
    radius: 42,
    category: "CONFUSION_TEST",
  },
  {
    id: "crystal-world-84px",
    name: "Crystal World (84px)",
    identity: { archetype: "crystal-world", seed: 502 },
    radius: 42,
    category: "CONFUSION_TEST",
  },
  {
    id: "ember-star-84px",
    name: "Ember Star (84px)",
    identity: { archetype: "ember-star", seed: 103 },
    radius: 42,
    category: "CONFUSION_TEST",
  },
];

const GOLDEN_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "golden-star",
    name: "Golden Star (Close-Up)",
    identity: { archetype: "golden-star", seed: 101 },
    radius: 110,
  },
];

const BLUE_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "blue-star",
    name: "Blue-White Star (Close-Up)",
    identity: { archetype: "blue-star", seed: 102 },
    radius: 110,
  },
];

const EMBER_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "ember-star",
    name: "Ember Star (Close-Up)",
    identity: { archetype: "ember-star", seed: 103 },
    radius: 110,
  },
];

const VOLCANIC_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "volcanic-rocky-close",
    name: "Volcanic Rocky World (Close-Up)",
    identity: { archetype: "volcanic-rocky", seed: 201 },
    radius: 110,
  },
];

const MINERAL_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "mineral-rocky-close",
    name: "Mineral / Desert World (Close-Up)",
    identity: { archetype: "mineral-rocky", seed: 202 },
    radius: 110,
  },
];

const LIFE_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "life-world-close",
    name: "Life World (Close-Up)",
    identity: { archetype: "life-world", seed: 301 },
    radius: 110,
  },
];

const ROCKY_LIFE_84PX_ITEMS: readonly CatalogItemEntry[] = [
  {
    id: "volcanic-84px",
    name: "Volcanic Rocky (84px)",
    identity: { archetype: "volcanic-rocky", seed: 201 },
    radius: 42,
  },
  {
    id: "mineral-84px",
    name: "Mineral / Desert (84px)",
    identity: { archetype: "mineral-rocky", seed: 202 },
    radius: 42,
  },
  {
    id: "life-84px",
    name: "Life World (84px)",
    identity: { archetype: "life-world", seed: 301 },
    radius: 42,
  },
];

const CONFUSION_ROW_84PX_ITEMS: readonly CatalogItemEntry[] = [
  {
    id: "ember-star-conf",
    name: "Ember Star (84px)",
    identity: { archetype: "ember-star", seed: 103 },
    radius: 42,
  },
  {
    id: "volcanic-rocky-conf",
    name: "Volcanic Rocky (84px)",
    identity: { archetype: "volcanic-rocky", seed: 201 },
    radius: 42,
  },
  {
    id: "mineral-rocky-conf",
    name: "Mineral Desert (84px)",
    identity: { archetype: "mineral-rocky", seed: 202 },
    radius: 42,
  },
  {
    id: "life-world-conf",
    name: "Life World (84px)",
    identity: { archetype: "life-world", seed: 301 },
    radius: 42,
  },
  {
    id: "blue-atm-conf",
    name: "Blue Atmospheric (84px)",
    identity: { archetype: "blue-atmospheric", seed: 401 },
    radius: 42,
  },
];

const VOLCANIC_ROT_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "volcanic-rocky-rot",
    name: "Volcanic Rocky World (Rotation)",
    identity: { archetype: "volcanic-rocky", seed: 201 },
    radius: 90,
  },
];

const LIFE_ROT_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "life-world-rot",
    name: "Life World (Rotation)",
    identity: { archetype: "life-world", seed: 301 },
    radius: 90,
  },
];

const BLUE_ATM_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "blue-atm-close",
    name: "Blue Atmospheric World (Close-Up)",
    identity: { archetype: "blue-atmospheric", seed: 401 },
    radius: 110,
  },
];

const STORM_GIANT_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "storm-giant-close",
    name: "Storm Gas Giant (Close-Up)",
    identity: { archetype: "storm-giant", seed: 402 },
    radius: 110,
  },
];

const ICY_RING_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "icy-ring-close",
    name: "Icy Ring System (Close-Up)",
    identity: {
      archetype: "storm-giant",
      seed: 403,
      rings: {
        innerRadius: 135,
        outerRadius: 200,
        tilt: 0.42,
        opacity: 0.88,
        style: "ice",
        seed: 403,
      },
    },
    radius: 105,
  },
];

const DUST_RING_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "dust-ring-close",
    name: "Dust Ring System (Close-Up)",
    identity: {
      archetype: "mineral-rocky",
      seed: 503,
      rings: {
        innerRadius: 130,
        outerRadius: 185,
        tilt: 0.36,
        opacity: 0.78,
        style: "dust",
        seed: 503,
      },
    },
    radius: 105,
  },
];

const BROKEN_RING_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "broken-ring-close",
    name: "Broken / Debris Ring (Close-Up)",
    identity: {
      archetype: "mineral-rocky",
      seed: 504,
      rings: {
        innerRadius: 132,
        outerRadius: 190,
        tilt: 0.4,
        opacity: 0.85,
        style: "broken",
        seed: 504,
      },
    },
    radius: 105,
  },
];

const RINGED_GAS_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "ringed-gas-close",
    name: "Ringed Gas Giant Presentation (Close-Up)",
    identity: {
      archetype: "storm-giant",
      seed: 403,
      rings: {
        innerRadius: 135,
        outerRadius: 200,
        tilt: 0.42,
        opacity: 0.88,
        style: "ice",
        seed: 403,
      },
    },
    radius: 105,
  },
];

const RINGED_ROCKY_CLOSE_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "ringed-rocky-close",
    name: "Ringed Structured Rocky Presentation (Close-Up)",
    identity: {
      archetype: "mineral-rocky",
      seed: 503,
      rings: {
        innerRadius: 130,
        outerRadius: 185,
        tilt: 0.36,
        opacity: 0.78,
        style: "dust",
        seed: 503,
      },
    },
    radius: 105,
  },
];

const GAS_RINGS_84PX_ITEMS: readonly CatalogItemEntry[] = [
  {
    id: "blue-atm-84px",
    name: "Blue Atmospheric (84px)",
    identity: { archetype: "blue-atmospheric", seed: 401 },
    radius: 42,
  },
  {
    id: "storm-giant-84px",
    name: "Storm Gas Giant (84px)",
    identity: { archetype: "storm-giant", seed: 402 },
    radius: 42,
  },
  {
    id: "ringed-gas-84px",
    name: "Ringed Gas Giant (84px)",
    identity: {
      archetype: "storm-giant",
      seed: 403,
      rings: {
        innerRadius: 54,
        outerRadius: 80,
        tilt: 0.42,
        opacity: 0.88,
        style: "ice",
        seed: 403,
      },
    },
    radius: 42,
  },
  {
    id: "ringed-rocky-84px",
    name: "Ringed Structured (84px)",
    identity: {
      archetype: "mineral-rocky",
      seed: 503,
      rings: {
        innerRadius: 52,
        outerRadius: 74,
        tilt: 0.36,
        opacity: 0.78,
        style: "dust",
        seed: 503,
      },
    },
    radius: 42,
  },
  {
    id: "broken-ring-84px",
    name: "Broken Ring (84px)",
    identity: {
      archetype: "mineral-rocky",
      seed: 504,
      rings: {
        innerRadius: 54,
        outerRadius: 78,
        tilt: 0.4,
        opacity: 0.85,
        style: "broken",
        seed: 504,
      },
    },
    radius: 42,
  },
];

const RING_OCCLUSION_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "ring-occlusion-close",
    name: "Ring Occlusion Geometry (Close-Up)",
    identity: {
      archetype: "storm-giant",
      seed: 403,
      rings: {
        innerRadius: 145,
        outerRadius: 215,
        tilt: 0.44,
        opacity: 0.9,
        style: "ice",
        seed: 403,
      },
    },
    radius: 115,
  },
];

const STORM_ROT_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "storm-giant-rot",
    name: "Storm Gas Giant (Rotation)",
    identity: { archetype: "storm-giant", seed: 402 },
    radius: 95,
  },
];

const RINGED_ROT_ITEM: readonly CatalogItemEntry[] = [
  {
    id: "ringed-gas-rot",
    name: "Ringed Gas Giant (Rotation)",
    identity: {
      archetype: "storm-giant",
      seed: 403,
      rings: {
        innerRadius: 125,
        outerRadius: 185,
        tilt: 0.42,
        opacity: 0.88,
        style: "ice",
        seed: 403,
      },
    },
    radius: 95,
  },
];

// Review the actual curated identities, so approval also covers the seven-concept gallery.
const METALLIC_REVIEW: CatalogItemEntry = {
  id: "metallic-review",
  name: "Metallic / Artificial World",
  identity: ENTRELIS_CONCEPT_IDENTITIES["cpus"]!,
  radius: 170,
};
const CRYSTAL_REVIEW: CatalogItemEntry = {
  id: "crystal-review",
  name: "Crystal / Ice World",
  identity: ENTRELIS_CONCEPT_IDENTITIES["transistors"]!,
  radius: 170,
};
const STRUCTURAL_REVIEW_ITEMS: Partial<Record<CategoryFilter, readonly CatalogItemEntry[]>> = {
  METALLIC_CLOSE: [METALLIC_REVIEW],
  CRYSTAL_CLOSE: [CRYSTAL_REVIEW],
  METALLIC_ROT: [METALLIC_REVIEW],
  CRYSTAL_ROT: [CRYSTAL_REVIEW],
  STRUCTURAL_84PX: [
    { ...METALLIC_REVIEW, radius: 42 },
    { ...CRYSTAL_REVIEW, radius: 42 },
  ],
  STRUCTURAL_CONFUSION_84PX: [
    {
      id: "mineral-structural",
      name: "Mineral / Desert World",
      identity: { archetype: "mineral-rocky", seed: 202 },
      radius: 42,
      category: "CONFUSION_TEST",
    },
    { ...METALLIC_REVIEW, radius: 42 },
    { ...CRYSTAL_REVIEW, radius: 42 },
    {
      id: "blue-star-structural",
      name: "Blue-White Star",
      identity: { archetype: "blue-star", seed: 102 },
      radius: 42,
    },
  ],
};

const CARBON_ASTEROID_IDENTITY: CatalogItemEntry["identity"] = {
  archetype: "asteroid",
  seed: 601,
  asteroidVariant: "carbon",
};

const MINERAL_ASTEROID_IDENTITY: CatalogItemEntry["identity"] = {
  archetype: "asteroid",
  seed: 602,
  asteroidVariant: "mineral",
};

const ASTEROID_DEBRIS_IDENTITY: CatalogItemEntry["identity"] = {
  archetype: "asteroid",
  seed: 603,
  asteroidVariant: "carbon",
  debris: {
    count: 4,
    seed: 603,
    minDistance: 68,
    maxDistance: 81,
    scale: 0.12,
  },
};

const SMALL_BODY_REVIEW_ITEMS: Partial<Record<CategoryFilter, readonly CatalogItemEntry[]>> = {
  ASTEROID_CARBON_CLOSE: [
    {
      id: "carbon-asteroid-close",
      name: "Carbon Asteroid",
      identity: CARBON_ASTEROID_IDENTITY,
      radius: 110,
    },
  ],
  ASTEROID_MINERAL_CLOSE: [
    {
      id: "mineral-asteroid-close",
      name: "Mineral Asteroid",
      identity: MINERAL_ASTEROID_IDENTITY,
      radius: 110,
    },
  ],
  ASTEROID_DEBRIS_CLOSE: [
    {
      id: "asteroid-debris-close",
      name: "Asteroid + Debris",
      identity: ASTEROID_DEBRIS_IDENTITY,
      radius: 100,
    },
  ],
  ASTEROIDS_84PX: [
    {
      id: "carbon-asteroid-84px",
      name: "Carbon Asteroid (84px)",
      identity: CARBON_ASTEROID_IDENTITY,
      radius: 42,
    },
    {
      id: "mineral-asteroid-84px",
      name: "Mineral Asteroid (84px)",
      identity: MINERAL_ASTEROID_IDENTITY,
      radius: 42,
    },
    {
      id: "asteroid-debris-84px",
      name: "Asteroid + Debris (84px)",
      identity: ASTEROID_DEBRIS_IDENTITY,
      radius: 42,
    },
  ],
  ASTEROID_SILHOUETTES: [
    {
      id: "carbon-asteroid-silhouette",
      name: "Carbon Asteroid",
      identity: CARBON_ASTEROID_IDENTITY,
      radius: 90,
    },
    {
      id: "mineral-asteroid-silhouette",
      name: "Mineral Asteroid",
      identity: MINERAL_ASTEROID_IDENTITY,
      radius: 90,
    },
  ],
  ASTEROID_CARBON_ROT: [
    {
      id: "carbon-asteroid-rotation",
      name: "Carbon Asteroid Rotation",
      identity: CARBON_ASTEROID_IDENTITY,
      radius: 90,
    },
  ],
  ASTEROID_MINERAL_ROT: [
    {
      id: "mineral-asteroid-rotation",
      name: "Mineral Asteroid Rotation",
      identity: MINERAL_ASTEROID_IDENTITY,
      radius: 90,
    },
  ],
};

const CONCEPT_ITEMS: readonly CatalogItemEntry[] = [
  { id: "rust", name: "Rust", identity: ENTRELIS_CONCEPT_IDENTITIES["rust"]! },
  { id: "ownership", name: "Ownership", identity: ENTRELIS_CONCEPT_IDENTITIES["ownership"]! },
  { id: "memory", name: "Memory", identity: ENTRELIS_CONCEPT_IDENTITIES["memory"]! },
  { id: "stack-heap", name: "Stack & Heap", identity: ENTRELIS_CONCEPT_IDENTITIES["stack-heap"]! },
  {
    id: "operating-systems",
    name: "Operating Systems",
    identity: ENTRELIS_CONCEPT_IDENTITIES["operating-systems"]!,
  },
  { id: "cpus", name: "CPUs", identity: ENTRELIS_CONCEPT_IDENTITIES["cpus"]! },
  { id: "transistors", name: "Transistors", identity: ENTRELIS_CONCEPT_IDENTITIES["transistors"]! },
];

export const Celestial3DLab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Celestial3DController | null>(null);

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [screenPositions, setScreenPositions] = useState<readonly ItemScreenPosition[]>([]);

  // Filter items based on active category
  const filteredItems = useMemo((): readonly CatalogItemEntry[] => {
    const structuralReview = STRUCTURAL_REVIEW_ITEMS[activeCategory];
    if (structuralReview) return structuralReview;
    const smallBodyReview = SMALL_BODY_REVIEW_ITEMS[activeCategory];
    if (smallBodyReview) return smallBodyReview;
    if (activeCategory === "CONCEPTS") {
      return CONCEPT_ITEMS;
    }
    if (activeCategory === "ALL") {
      return CATALOG_ARCHETYPES;
    }
    if (activeCategory === "STARS_84PX") {
      return STARS_84PX_ITEMS;
    }
    if (activeCategory === "STARS_SCALE") {
      return STAR_SCALE_ITEMS;
    }
    if (activeCategory === "CONFUSION_TEST") {
      return CONFUSION_TEST_ITEMS;
    }
    if (activeCategory === "GOLDEN_CLOSE") {
      return GOLDEN_CLOSE_ITEM;
    }
    if (activeCategory === "BLUE_CLOSE") {
      return BLUE_CLOSE_ITEM;
    }
    if (activeCategory === "EMBER_CLOSE") {
      return EMBER_CLOSE_ITEM;
    }
    if (activeCategory === "VOLCANIC_CLOSE") {
      return VOLCANIC_CLOSE_ITEM;
    }
    if (activeCategory === "MINERAL_CLOSE") {
      return MINERAL_CLOSE_ITEM;
    }
    if (activeCategory === "LIFE_CLOSE") {
      return LIFE_CLOSE_ITEM;
    }
    if (activeCategory === "ROCKY_LIFE_84PX") {
      return ROCKY_LIFE_84PX_ITEMS;
    }
    if (activeCategory === "CONFUSION_ROW_84PX") {
      return CONFUSION_ROW_84PX_ITEMS;
    }
    if (activeCategory === "BLUE_ATM_CLOSE") {
      return BLUE_ATM_CLOSE_ITEM;
    }
    if (activeCategory === "STORM_GIANT_CLOSE") {
      return STORM_GIANT_CLOSE_ITEM;
    }
    if (activeCategory === "ICY_RING_CLOSE") {
      return ICY_RING_CLOSE_ITEM;
    }
    if (activeCategory === "DUST_RING_CLOSE") {
      return DUST_RING_CLOSE_ITEM;
    }
    if (activeCategory === "BROKEN_RING_CLOSE") {
      return BROKEN_RING_CLOSE_ITEM;
    }
    if (activeCategory === "RINGED_GAS_CLOSE") {
      return RINGED_GAS_CLOSE_ITEM;
    }
    if (activeCategory === "RINGED_ROCKY_CLOSE") {
      return RINGED_ROCKY_CLOSE_ITEM;
    }
    if (activeCategory === "GAS_RINGS_84PX") {
      return GAS_RINGS_84PX_ITEMS;
    }
    if (activeCategory === "RING_OCCLUSION") {
      return RING_OCCLUSION_ITEM;
    }
    if (activeCategory === "STORM_ROT") {
      return STORM_ROT_ITEM;
    }
    if (activeCategory === "RINGED_ROT") {
      return RINGED_ROT_ITEM;
    }
    if (activeCategory === "VOLCANIC_ROT") {
      return VOLCANIC_ROT_ITEM;
    }
    if (activeCategory === "LIFE_ROT") {
      return LIFE_ROT_ITEM;
    }
    return CATALOG_ARCHETYPES.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  // Initialize Three.js controller
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const controller = new Celestial3DController({
      canvas,
      targetFps: 30,
      initialItems: [],
      onHoverChange: (id) => {
        setHoveredId(id);
      },
    });
    controllerRef.current = controller;
    if (typeof window !== "undefined") {
      (
        window as unknown as { __celestialController?: Celestial3DController }
      ).__celestialController = controller;
    }

    const handleResize = () => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      controller.resize(w, h);
      setScreenPositions(controller.getItemScreenPositions());
    };

    handleResize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  // Update controller when category filter changes
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    controller.loadItems(filteredItems);
    if (containerRef.current) {
      const w = containerRef.current.clientWidth || 800;
      const h = containerRef.current.clientHeight || 600;
      controller.resize(w, h);
    }
    setScreenPositions(controller.getItemScreenPositions());
  }, [filteredItems]);

  const categories: readonly { id: CategoryFilter; label: string }[] = [
    { id: "ALL", label: "All Catalog" },
    { id: "METALLIC_CLOSE", label: "Metallic Close" },
    { id: "CRYSTAL_CLOSE", label: "Crystal Close" },
    { id: "STRUCTURAL_84PX", label: "Structural 84px" },
    { id: "STRUCTURAL_CONFUSION_84PX", label: "Structural Confusion 84px" },
    { id: "METALLIC_ROT", label: "Metallic Rotation" },
    { id: "CRYSTAL_ROT", label: "Crystal Rotation" },
    { id: "ASTEROID_CARBON_CLOSE", label: "Carbon Asteroid Close" },
    { id: "ASTEROID_MINERAL_CLOSE", label: "Mineral Asteroid Close" },
    { id: "ASTEROID_DEBRIS_CLOSE", label: "Asteroid + Debris Close" },
    { id: "ASTEROIDS_84PX", label: "Asteroids (84px)" },
    { id: "ASTEROID_SILHOUETTES", label: "Asteroid Silhouettes" },
    { id: "ASTEROID_CARBON_ROT", label: "Carbon Rotation" },
    { id: "ASTEROID_MINERAL_ROT", label: "Mineral Rotation" },
    { id: "BLUE_ATM_CLOSE", label: "Blue Atm Close" },
    { id: "STORM_GIANT_CLOSE", label: "Storm Giant Close" },
    { id: "ICY_RING_CLOSE", label: "Icy Ring Close" },
    { id: "DUST_RING_CLOSE", label: "Dust Ring Close" },
    { id: "BROKEN_RING_CLOSE", label: "Broken Ring Close" },
    { id: "RINGED_GAS_CLOSE", label: "Ringed Gas Close" },
    { id: "RINGED_ROCKY_CLOSE", label: "Ringed Rocky Close" },
    { id: "GAS_RINGS_84PX", label: "Gas & Rings (84px)" },
    { id: "RING_OCCLUSION", label: "Ring Occlusion" },
    { id: "STORM_ROT", label: "Storm Rot" },
    { id: "RINGED_ROT", label: "Ringed Gas Rot" },
    { id: "VOLCANIC_CLOSE", label: "Volcanic Close" },
    { id: "MINERAL_CLOSE", label: "Mineral Desert Close" },
    { id: "LIFE_CLOSE", label: "Life World Close" },
    { id: "ROCKY_LIFE_84PX", label: "Rocky & Life (84px)" },
    { id: "CONFUSION_ROW_84PX", label: "Confusion Row (84px)" },
    { id: "VOLCANIC_ROT", label: "Volcanic Rot" },
    { id: "LIFE_ROT", label: "Life Rot" },
    { id: "STARS", label: "Stars" },
    { id: "STARS_84PX", label: "Stars (84px)" },
    { id: "CONFUSION_TEST", label: "Stars Confusion (84px)" },
    { id: "GOLDEN_CLOSE", label: "Golden Close" },
    { id: "BLUE_CLOSE", label: "Blue-White Close" },
    { id: "EMBER_CLOSE", label: "Ember Close" },
    { id: "ROCKY", label: "Rocky" },
    { id: "BIOLOGICAL", label: "Life" },
    { id: "ATMOSPHERIC", label: "Gas & Rings" },
    { id: "STRUCTURAL", label: "Structural" },
    { id: "SMALL BODIES", label: "Asteroids" },
    { id: "CONCEPTS", label: "Current 7 Concepts" },
  ];

  return (
    <div ref={containerRef} className={styles.container}>
      <header className={styles.headerBar}>
        <div className={styles.title}>Entrelis Celestial 3D Catalog</div>
        <nav className={styles.categoryNav} aria-label="Celestial archetype filter">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.categoryBtn} ${activeCategory === cat.id ? styles.categoryBtnActive : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.categoryBtn} ${!showLabels ? styles.categoryBtnActive : ""}`}
            onClick={() => setShowLabels((prev) => !prev)}
            aria-pressed={!showLabels}
            title="Toggle label visibility for blind evaluation"
            style={{
              marginLeft: "8px",
              borderLeft: "1px solid rgba(51, 65, 85, 0.4)",
              paddingLeft: "12px",
            }}
          >
            {showLabels ? "Hide Labels" : "Show Labels"}
          </button>
        </nav>
      </header>

      <canvas ref={canvasRef} className={styles.canvas} />

      {showLabels && (
        <div className={styles.labelsOverlay} aria-hidden="true">
          {screenPositions.map((pos) => (
            <div
              key={pos.id}
              className={`${styles.label} ${hoveredId === pos.id ? styles.labelActive : ""}`}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y + (pos.radius ?? 50) + 14}px`, // Positioned cleanly beneath body
              }}
            >
              {pos.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
