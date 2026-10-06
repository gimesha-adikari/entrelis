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
  | "STARS"
  | "ROCKY"
  | "BIOLOGICAL"
  | "ATMOSPHERIC"
  | "STRUCTURAL"
  | "SMALL BODIES"
  | "CONCEPTS";

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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [screenPositions, setScreenPositions] = useState<readonly ItemScreenPosition[]>([]);

  // Filter items based on active category
  const filteredItems = useMemo((): readonly CatalogItemEntry[] => {
    if (activeCategory === "CONCEPTS") {
      return CONCEPT_ITEMS;
    }
    if (activeCategory === "ALL") {
      return CATALOG_ARCHETYPES;
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
    { id: "STARS", label: "Stars" },
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
        </nav>
      </header>

      <canvas ref={canvasRef} className={styles.canvas} />

      <div className={styles.labelsOverlay} aria-hidden="true">
        {screenPositions.map((pos) => (
          <div
            key={pos.id}
            className={`${styles.label} ${hoveredId === pos.id ? styles.labelActive : ""}`}
            style={{
              left: `${pos.x}px`,
              top: `${pos.y + 54}px`, // Centered beneath body
            }}
          >
            {pos.name}
          </div>
        ))}
      </div>
    </div>
  );
};
