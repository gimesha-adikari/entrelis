"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { KnowledgeDataset } from "@/domain/knowledge/types";
import type { ViewportTransform } from "../types";
import type { UniverseScene, UniverseNode } from "../scene/types";
import { buildLocalUniverseScene } from "../scene/build-local-scene";
import { layoutLocalUniverseScene } from "../scene/layout-local-scene";
import { interpolateScenes, SCENE_TRANSITION_DURATION_MS } from "../scene/transition-scene";
import { renderUniverseScene } from "../rendering/universe-renderer";
import { hitTestUniverseNode } from "../rendering/hit-test";
import { CelestialNode } from "../celestial";
import styles from "./KnowledgeGraph.module.css";

import type { KnowledgeGraphIndex } from "../knowledge-index";

interface Props {
  dataset: KnowledgeDataset;
  index?: KnowledgeGraphIndex;
  selectedConceptSlug: string | null;
  onSelectConcept: (slug: string) => void;
  onResetCamera?: () => void;
}

export default function GraphCanvas({
  dataset,
  index,
  selectedConceptSlug,
  onSelectConcept,
  onResetCamera,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Reactive dimensions tracked via ResizeObserver
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const isMobile = dimensions.width <= 768;

  // Camera transform state (pan offset x, y, and scale k)
  const transformRef = useRef<ViewportTransform>({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const isPinchingRef = useRef(false);
  const wasPinchingRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const lastPointerPosRef = useRef({ x: 0, y: 0 });
  const lastPinchDistRef = useRef(0);
  const lastPinchMidpointRef = useRef({ x: 0, y: 0 });

  // Animation frame reference strictly for bounded transitions (zero idle loop)
  const animationFrameRef = useRef<number | null>(null);
  const isInitialMountRef = useRef(true);

  // Currently displayed universe scene on the canvas
  const currentSceneRef = useRef<UniverseScene | null>(null);

  // Build and lay out target scene using prebuilt index and exact available CSS dimensions
  const targetScene = useMemo<UniverseScene>(() => {
    const rawScene = buildLocalUniverseScene({
      dataset,
      index,
      focusSlug: selectedConceptSlug ?? "rust",
      isMobile,
    });
    return layoutLocalUniverseScene(rawScene, {
      viewportWidth: dimensions.width,
      viewportHeight: dimensions.height,
      isMobile,
    });
  }, [dataset, index, selectedConceptSlug, isMobile, dimensions.width, dimensions.height]);

  // Single-pass canvas drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scene = currentSceneRef.current ?? targetScene;
    const width = canvas.width;
    const height = canvas.height;

    renderUniverseScene(ctx, width, height, transformRef.current, scene, {
      hoveredNodeId,
      isMobile,
      skipNodeRendering: true,
    });

    if (layerRef.current) {
      layerRef.current.style.transformOrigin = `${dimensions.width / 2}px ${dimensions.height / 2}px`;
      layerRef.current.style.transform = `translate(${transformRef.current.x}px, ${transformRef.current.y}px) scale(${transformRef.current.k})`;
    }
  }, [targetScene, hoveredNodeId, isMobile, dimensions.width, dimensions.height]);

  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // Page visibility listener to pause compositor animations when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined") {
        if (document.hidden) {
          document.documentElement.setAttribute("data-visibility", "hidden");
        } else {
          document.documentElement.removeAttribute("data-visibility");
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Handle scene transition or initial render
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isInitialMountRef.current || prefersReducedMotion) {
      isInitialMountRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      currentSceneRef.current = targetScene;
      drawRef.current();
      return;
    }

    const fromScene = currentSceneRef.current ?? targetScene;
    const toScene = targetScene;

    // If already displaying this exact focus concept, just update scene and redraw
    if (fromScene.focus.slug === toScene.focus.slug) {
      currentSceneRef.current = toScene;
      drawRef.current();
      return;
    }

    // Cancel any in-flight animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const startTime = performance.now();
    const duration = SCENE_TRANSITION_DURATION_MS;

    const animateTransition = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      currentSceneRef.current = interpolateScenes(fromScene, toScene, progress);
      drawRef.current();

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateTransition);
      } else {
        // Transition finished: stop RAF completely, ensure scene is static, CPU idle
        animationFrameRef.current = null;
        currentSceneRef.current = toScene;
        drawRef.current();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateTransition);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [targetScene]);

  // Handle reactive container resizing and HiDPI canvas backing store scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const canvas = canvasRef.current;
      if (!canvas || !container) return;

      const effectiveDpr = Math.min(
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
        2
      );
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width > 0 && height > 0) {
        setDimensions((prev) => {
          if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
            return prev;
          }
          return { width, height };
        });

        canvas.width = width * effectiveDpr;
        canvas.height = height * effectiveDpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        drawRef.current();
      }
    };

    updateDimensions();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateDimensions);
      observer.observe(container);
      return () => {
        observer.disconnect();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    } else {
      window.addEventListener("resize", updateDimensions);
      return () => {
        window.removeEventListener("resize", updateDimensions);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }
  }, []);

  // Redraw when hover changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Hit test helper restricted strictly to visible universe scene
  const getNodeAtPoint = (clientX: number, clientY: number): UniverseNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const scene = currentSceneRef.current ?? targetScene;
    const rect = canvas.getBoundingClientRect();
    return hitTestUniverseNode(scene, clientX, clientY, rect, transformRef.current);
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

    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const oldK = transformRef.current.k;
    const newK = Math.max(0.3, Math.min(3, oldK * zoomFactor));

    transformRef.current.x = cx - (cx - transformRef.current.x) * (newK / oldK);
    transformRef.current.y = cy - (cy - transformRef.current.y) * (newK / oldK);
    transformRef.current.k = newK;
    draw();
  };

  // Touch event handlers for mobile
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

        transformRef.current.x = cx - (cx - transformRef.current.x) * (newK / oldK);
        transformRef.current.y = cy - (cy - transformRef.current.y) * (newK / oldK);
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

  const handleReturnHome = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Reset camera transform
    transformRef.current = { x: 0, y: 0, k: 1 };
    if (layerRef.current) {
      layerRef.current.style.transform = "none";
    }
    if (onResetCamera) {
      onResetCamera();
    } else {
      onSelectConcept("rust");
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
        aria-hidden="true"
      />

      {/* Hybrid DOM/SVG Celestial Node Layer */}
      <div ref={layerRef} className={styles.celestialLayer}>
        {targetScene.allNodes.map((node) => {
          const screenX = dimensions.width / 2 + (node.x ?? 0);
          const screenY = dimensions.height / 2 + (node.y ?? 0);

          return (
            <CelestialNode
              key={node.id}
              id={node.id}
              name={node.concept.name}
              slug={node.concept.slug}
              role={node.role}
              x={screenX}
              y={screenY}
              isSelected={node.id === targetScene.focus.id}
              isHovered={node.id === hoveredNodeId}
              isMobile={isMobile}
              onClick={() => onSelectConcept(node.slug)}
              onHover={(hoverId) => setHoveredNodeId(hoverId)}
            />
          );
        })}
      </div>
      <div className={styles.controls}>
        <button
          onClick={handleReturnHome}
          className={styles.controlButton}
          type="button"
          aria-label="Return to Rust"
          title="Return to Rust"
        >
          <svg
            className={styles.homeIcon}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 9.5L10 3l7 6.5V17a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 17V9.5z" />
            <path d="M7.5 18.5V11h5v7.5" />
          </svg>
          <span className={styles.controlLabel}>Home</span>
        </button>
      </div>
    </div>
  );
}
