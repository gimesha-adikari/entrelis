"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { KnowledgeDataset } from "@/domain/knowledge/types";
import type { GraphNode, GraphLink, ViewportTransform } from "../types";
import { createGraphData } from "../adapters/graph-adapter";
import { createGraphSimulation } from "../engine/simulation";
import { renderGraphCanvas } from "../rendering/canvas-renderer";
import { hitTestNode } from "../rendering/hit-test";
import styles from "./KnowledgeGraph.module.css";

interface Props {
  dataset: KnowledgeDataset;
  selectedConceptSlug: string | null;
  onSelectConcept: (slug: string) => void;
  onResetCamera?: () => void;
}

export default function GraphCanvas({
  dataset,
  selectedConceptSlug,
  onSelectConcept,
  onResetCamera,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Pan and zoom camera transform
  const transformRef = useRef<ViewportTransform>({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const isPinchingRef = useRef(false);
  const wasPinchingRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const lastPointerPosRef = useRef({ x: 0, y: 0 });
  const lastPinchDistRef = useRef(0);
  const lastPinchMidpointRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const isInitialMountRef = useRef(true);

  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  // Find currently selected concept ID directly from dataset props without reading refs during render
  const selectedNodeId = useMemo<string | null>(() => {
    if (!selectedConceptSlug) return null;
    const found = dataset.concepts.find((c) => c.slug === selectedConceptSlug);
    return found ? found.id : null;
  }, [dataset.concepts, selectedConceptSlug]);

  // Compute 1st-degree neighbors of selected concept
  const neighborIds = useMemo<Set<string>>(() => {
    if (!selectedNodeId) return new Set();
    const set = new Set<string>();
    dataset.relationships.forEach((r) => {
      if (r.sourceConceptId === selectedNodeId) set.add(r.targetConceptId);
      if (r.targetConceptId === selectedNodeId) set.add(r.sourceConceptId);
    });
    return set;
  }, [selectedNodeId, dataset.relationships]);

  // Canvas drawing pass
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    renderGraphCanvas(
      ctx,
      width,
      height,
      transformRef.current,
      { nodes: nodesRef.current, links: linksRef.current },
      {
        selectedNodeId,
        hoveredNodeId,
        neighborIds,
        isMobile,
      }
    );
  }, [selectedNodeId, hoveredNodeId, neighborIds]);

  // Keep stable reference to latest draw callback
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // Recenter camera onto target node coordinates
  const recenterOnNode = useCallback((node: GraphNode) => {
    if (typeof node.x !== "number" || typeof node.y !== "number") return;

    const currentK = transformRef.current.k;
    const targetX = -node.x * currentK;
    const targetY = -node.y * currentK;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isInitialMountRef.current || prefersReducedMotion) {
      isInitialMountRef.current = false;
      transformRef.current.x = targetX;
      transformRef.current.y = targetY;
      drawRef.current();
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startX = transformRef.current.x;
    const startY = transformRef.current.y;
    const startTime = performance.now();
    const duration = 300;

    const animateRecenter = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic: 1 - (1 - progress)^3
      const ease = 1 - Math.pow(1 - progress, 3);

      transformRef.current.x = startX + (targetX - startX) * ease;
      transformRef.current.y = startY + (targetY - startY) * ease;
      drawRef.current();

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateRecenter);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateRecenter);
  }, []);

  // Synchronously settle coordinates before initial interactive display.
  // Interaction state must not recreate the force simulation; selection and hover only redraw the existing coordinates.
  useEffect(() => {
    const { nodes, links } = createGraphData(dataset);
    nodesRef.current = nodes;
    linksRef.current = links;

    const simulation = createGraphSimulation(nodes, links, {
      settleTicks: 250,
    });

    const updateDimensions = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      drawRef.current();
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      simulation.stop();
      window.removeEventListener("resize", updateDimensions);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [dataset]);

  // When selected concept changes, recenter camera smoothly
  useEffect(() => {
    if (!selectedConceptSlug) return;
    const node = nodesRef.current.find((n) => n.slug === selectedConceptSlug);
    if (node) {
      recenterOnNode(node);
    }
  }, [selectedConceptSlug, recenterOnNode]);

  // Redraw canvas when selection or hover state changes without touching physics
  useEffect(() => {
    draw();
  }, [draw]);

  // Hit test helper
  const getNodeAtPoint = (clientX: number, clientY: number): GraphNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return hitTestNode(nodesRef.current, clientX, clientY, rect, transformRef.current);
  };

  // Pointer event handlers (Desktop mouse)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isDraggingRef.current = true;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastPointerPosRef.current.x;
      const dy = e.clientY - lastPointerPosRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      draw();
    } else {
      const hit = getNodeAtPoint(e.clientX, e.clientY);
      setHoveredNodeId(hit ? hit.id : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const totalDist = Math.hypot(
        e.clientX - pointerDownPosRef.current.x,
        e.clientY - pointerDownPosRef.current.y
      );
      if (totalDist < 5) {
        const hit = getNodeAtPoint(e.clientX, e.clientY);
        if (hit) {
          onSelectConcept(hit.slug);
        }
      }
    }
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    setHoveredNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const oldK = transformRef.current.k;
    const newK = Math.max(0.3, Math.min(3, oldK * zoomFactor));

    transformRef.current.x = cx - (cx - transformRef.current.x) * (newK / oldK);
    transformRef.current.y = cy - (cy - transformRef.current.y) * (newK / oldK);
    transformRef.current.k = newK;
    draw();
  };

  // Touch event handlers for mobile: one-finger pan/tap, two-finger pinch zoom
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (!touch) return;
      isDraggingRef.current = true;
      isPinchingRef.current = false;
      wasPinchingRef.current = false;
      pointerDownPosRef.current = { x: touch.clientX, y: touch.clientY };
      lastPointerPosRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length >= 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      if (!touch1 || !touch2) return;
      isDraggingRef.current = false;
      isPinchingRef.current = true;
      wasPinchingRef.current = true;
      lastPinchDistRef.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      lastPinchMidpointRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDraggingRef.current && !isPinchingRef.current) {
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - lastPointerPosRef.current.x;
      const dy = touch.clientY - lastPointerPosRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      lastPointerPosRef.current = { x: touch.clientX, y: touch.clientY };
      draw();
    } else if (e.touches.length >= 2 && isPinchingRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      if (!touch1 || !touch2) return;
      const currentDist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const currentMidpoint = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      if (lastPinchDistRef.current > 0) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const cx = currentMidpoint.x - rect.left - rect.width / 2;
        const cy = currentMidpoint.y - rect.top - rect.height / 2;

        const zoomFactor = currentDist / lastPinchDistRef.current;
        const oldK = transformRef.current.k;
        const newK = Math.max(0.3, Math.min(3, oldK * zoomFactor));

        // Preserve midpoint between fingers
        transformRef.current.x = cx - (cx - transformRef.current.x) * (newK / oldK);
        transformRef.current.y = cy - (cy - transformRef.current.y) * (newK / oldK);

        // Apply two-finger pan displacement
        transformRef.current.x += currentMidpoint.x - lastPinchMidpointRef.current.x;
        transformRef.current.y += currentMidpoint.y - lastPinchMidpointRef.current.y;

        transformRef.current.k = newK;
        lastPinchDistRef.current = currentDist;
        lastPinchMidpointRef.current = currentMidpoint;
        draw();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      if (isDraggingRef.current && !wasPinchingRef.current) {
        const touch = e.changedTouches[0];
        if (touch) {
          const totalDist = Math.hypot(
            touch.clientX - pointerDownPosRef.current.x,
            touch.clientY - pointerDownPosRef.current.y
          );
          if (totalDist < 8) {
            const hit = getNodeAtPoint(touch.clientX, touch.clientY);
            if (hit) {
              onSelectConcept(hit.slug);
            }
          }
        }
      }
      isDraggingRef.current = false;
      isPinchingRef.current = false;
      wasPinchingRef.current = false;
    } else if (e.touches.length === 1) {
      isPinchingRef.current = false;
      const touch = e.touches[0];
      if (touch) {
        lastPointerPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchCancel = () => {
    isDraggingRef.current = false;
    isPinchingRef.current = false;
    wasPinchingRef.current = false;
  };

  const handleReturnToRust = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    onSelectConcept("rust");
    if (onResetCamera) {
      onResetCamera();
    }
  };

  return (
    <div ref={containerRef} className={styles.canvasArea}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onWheel={handleWheel}
        className={styles.canvas}
        aria-label="Interactive 2D knowledge graph canvas"
      />
      <div className={styles.controls}>
        <button
          onClick={handleReturnToRust}
          className={styles.controlButton}
          type="button"
          aria-label="Return to Rust"
        >
          Return to Rust
        </button>
      </div>
    </div>
  );
}
