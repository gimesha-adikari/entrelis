"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { KnowledgeDataset } from "@/domain/knowledge/types";
import type { ViewportTransform } from "../types";
import type { UniverseScene, UniverseNode } from "../scene/types";
import { buildLocalUniverseScene } from "../scene/build-local-scene";
import { layoutLocalUniverseScene } from "../scene/layout-local-scene";
import { interpolateScenes, SCENE_TRANSITION_DURATION_MS } from "../scene/transition-scene";
import { renderUniverseScene } from "../rendering/universe-renderer";
import {
  isPendingRelationshipPulseActive,
  isRelationshipPulseActive,
  requestRelationshipPulse,
  type PendingRelationshipPulse,
  type RelationshipPulse,
} from "../rendering/relationship-pulse";
import { hitTestUniverseNode } from "../rendering/hit-test";
import { getConceptCelestialIdentity } from "../celestial-3d/identity";
import ProductionCelestialLayer, {
  type ProductionCelestialLayerHandle,
} from "../celestial-3d/ProductionCelestialLayer";
import {
  calculateNavigationStep,
  getRememberedAnchor,
  interpolateTravelOffset,
  registerConceptAnchor,
  resolveDestinationAnchor,
  type ConceptAnchorMap,
  type UniverseTravelState,
} from "../celestial-3d/universe";
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
  const productionCelestialLayerRef = useRef<ProductionCelestialLayerHandle>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [hasProductionRenderer, setHasProductionRenderer] = useState(false);
  const [zoomK, setZoomK] = useState(1);

  // Reactive dimensions tracked via ResizeObserver
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 1280,
    height: 800,
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
  const pulseRef = useRef<RelationshipPulse | null>(null);
  const pendingPulseRef = useRef<PendingRelationshipPulse | null>(null);
  const drawRef = useRef<(syncBodies?: boolean) => void>(() => {});

  const animateEnergy = useCallback(function animateEnergyFrame(now: number) {
    animationFrameRef.current = null;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!isRelationshipPulseActive(pulseRef.current, now, reduced, document.hidden)) {
      pulseRef.current = null;
      drawRef.current(false);
      return;
    }
    drawRef.current(false);
    animationFrameRef.current = requestAnimationFrame(animateEnergyFrame);
  }, []);

  // Currently displayed universe scene on the canvas
  const currentSceneRef = useRef<UniverseScene | null>(null);
  const travelStateRef = useRef<UniverseTravelState | null>(null);
  const persistentCameraOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const conceptAnchorsRef = useRef<ConceptAnchorMap>(new Map());

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
  const draw = useCallback(
    (syncBodies = true) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scene = currentSceneRef.current ?? targetScene;
      const width = canvas.width;
      const height = canvas.height;

      if (syncBodies)
        productionCelestialLayerRef.current?.update(
          scene,
          transformRef.current,
          dimensions.width,
          dimensions.height,
          hoveredNodeId,
          travelStateRef.current
        );
      const ringOcclusions = productionCelestialLayerRef.current?.getForegroundRingOcclusions(
        scene.focus.id
      );
      const now = performance.now();
      const reducedMotion =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      if (
        !isPendingRelationshipPulseActive(
          pendingPulseRef.current,
          now,
          reducedMotion,
          document.hidden
        )
      ) {
        pendingPulseRef.current = null;
      }

      const result = renderUniverseScene(ctx, width, height, transformRef.current, scene, {
        pulse: pulseRef.current,
        pendingPulse: pendingPulseRef.current,
        reducedMotion,
        hidden: document.hidden,
        now,
        hoveredNodeId,
        focusedNodeId,
        isMobile,
        skipBodyRendering: hasProductionRenderer,
        skipBackgroundStars: hasProductionRenderer,
        foregroundRingOcclusions: ringOcclusions?.masks,
        unreadyRelationshipNodeIds: ringOcclusions?.unreadyNodeIds,
        bodyNotReadyNodeIds: ringOcclusions?.bodyNotReadyNodeIds,
      });
      if (result.activatedPulse) {
        pulseRef.current = result.activatedPulse;
        pendingPulseRef.current = null;
        if (!travelStateRef.current?.active && animationFrameRef.current === null) {
          animationFrameRef.current = requestAnimationFrame(animateEnergy);
        }
      }
    },
    [
      targetScene,
      hoveredNodeId,
      focusedNodeId,
      isMobile,
      dimensions.width,
      dimensions.height,
      hasProductionRenderer,
      animateEnergy,
    ]
  );

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  const handleRingOcclusionChange = useCallback(() => drawRef.current(), []);

  const cancelEnergy = useCallback(() => {
    pulseRef.current = null;
    pendingPulseRef.current = null;
    if (!travelStateRef.current?.active && animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    drawRef.current(false);
  }, []);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const changed = () => {
      if (query?.matches) cancelEnergy();
    };
    query?.addEventListener?.("change", changed);
    return () => query?.removeEventListener?.("change", changed);
  }, [cancelEnergy]);

  // Page visibility listener to pause compositor animations when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined") {
        if (document.hidden) {
          document.documentElement.setAttribute("data-visibility", "hidden");
          cancelEnergy();
        } else {
          document.documentElement.removeAttribute("data-visibility");
          drawRef.current();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cancelEnergy]);

  // Handle scene transition or initial render
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isInitialMountRef.current || prefersReducedMotion) {
      isInitialMountRef.current = false;
      pulseRef.current = null;
      pendingPulseRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      const existingAnchor = getRememberedAnchor(
        conceptAnchorsRef.current,
        targetScene.focus.id,
        targetScene.focus.slug
      );
      const targetAnchor = existingAnchor ?? persistentCameraOffsetRef.current;
      registerConceptAnchor(
        conceptAnchorsRef.current,
        targetScene.focus.id,
        targetAnchor,
        targetScene.focus.slug
      );
      persistentCameraOffsetRef.current = targetAnchor;

      travelStateRef.current = {
        active: false,
        progress: 1,
        currentOffset: targetAnchor,
        fromSlug: targetScene.focus.slug,
        toSlug: targetScene.focus.slug,
      };
      currentSceneRef.current = targetScene;
      drawRef.current();
      return;
    }

    const fromScene = currentSceneRef.current ?? targetScene;
    const toScene = targetScene;

    // If already displaying this exact focus concept, just update scene and redraw
    if (fromScene.focus.slug === toScene.focus.slug) {
      pulseRef.current = null;
      const settledAnchor =
        getRememberedAnchor(conceptAnchorsRef.current, toScene.focus.id, toScene.focus.slug) ??
        persistentCameraOffsetRef.current;

      travelStateRef.current = {
        active: false,
        progress: 1,
        currentOffset: settledAnchor,
        fromSlug: toScene.focus.slug,
        toSlug: toScene.focus.slug,
      };
      currentSceneRef.current = toScene;
      drawRef.current();
      return;
    }

    // Capture start offset before canceling any in-flight animation for seamless continuity
    const startOffset = travelStateRef.current?.active
      ? travelStateRef.current.currentOffset
      : persistentCameraOffsetRef.current;

    // Cancel any in-flight animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Derive travel step from navigation geometry
    const step = calculateNavigationStep({
      fromSceneNodes: fromScene.allNodes,
      toSceneNodes: toScene.allNodes,
      fromFocus: fromScene.focus,
      toFocus: toScene.focus,
    });

    // Resolve persistent destination anchor: unvisited gets fromAnchor + step; visited returns to its remembered coordinate
    const targetOffset = resolveDestinationAnchor({
      anchorMap: conceptAnchorsRef.current,
      fromKey: fromScene.focus.id,
      toKey: toScene.focus.id,
      fromSecondaryKey: fromScene.focus.slug,
      toSecondaryKey: toScene.focus.slug,
      step,
      fallbackOffset: startOffset,
    });

    const fromSlug = fromScene.focus.slug;
    const toSlug = toScene.focus.slug;

    travelStateRef.current = {
      active: true,
      progress: 0,
      currentOffset: startOffset,
      startOffset,
      targetOffset,
      fromSlug,
      toSlug,
    };

    const startTime = performance.now();
    pulseRef.current = null;
    pendingPulseRef.current = document.hidden
      ? null
      : (requestRelationshipPulse(
          toScene.relationships,
          fromScene.focus.id,
          toScene.focus.id,
          startTime
        ) ??
        requestRelationshipPulse(
          fromScene.relationships,
          fromScene.focus.id,
          toScene.focus.id,
          startTime
        ));
    const duration = SCENE_TRANSITION_DURATION_MS;

    const animateTransition = (now: number) => {
      animationFrameRef.current = null;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const currentOffset = interpolateTravelOffset(startOffset, targetOffset, progress);

      travelStateRef.current = {
        active: progress < 1,
        progress,
        currentOffset,
        startOffset,
        targetOffset,
        fromSlug,
        toSlug,
      };

      currentSceneRef.current = interpolateScenes(fromScene, toScene, progress);
      drawRef.current();

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateTransition);
      } else {
        // Settle the shared scene, then continue only finite Canvas energy if needed.
        animationFrameRef.current = null;
        persistentCameraOffsetRef.current = targetOffset;
        travelStateRef.current = {
          active: false,
          progress: 1,
          currentOffset: targetOffset,
          startOffset,
          targetOffset,
          fromSlug,
          toSlug,
        };
        currentSceneRef.current = toScene;
        drawRef.current();
        if (
          isRelationshipPulseActive(pulseRef.current, now, false, document.hidden) &&
          animationFrameRef.current === null
        ) {
          animationFrameRef.current = requestAnimationFrame(animateEnergy);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateTransition);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [animateEnergy, targetScene]);

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
    return hitTestUniverseNode(
      scene,
      clientX,
      clientY,
      rect,
      transformRef.current,
      hasProductionRenderer
    );
  };

  // Pointer event handlers (Desktop mouse)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    pulseRef.current = null;
    pendingPulseRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    drawRef.current();
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
    pulseRef.current = null;
    pendingPulseRef.current = null;
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
    setZoomK(newK);
    draw();
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    pulseRef.current = null;
    pendingPulseRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    drawRef.current();
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
        setZoomK(newK);
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
      if (wasPinchingRef.current) {
        setZoomK(transformRef.current.k);
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

  const handleZoom = (direction: "in" | "out") => {
    pulseRef.current = null;
    pendingPulseRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const zoomFactor = direction === "in" ? 1.25 : 0.8;
    const oldK = transformRef.current.k;
    const newK = Math.max(0.3, Math.min(3, oldK * zoomFactor));
    if (Math.abs(newK - oldK) < 0.001) return;

    // Viewport-centered zoom relative to canvas center cx = 0, cy = 0
    const cx = 0;
    const cy = 0;
    transformRef.current.x = cx - (cx - transformRef.current.x) * (newK / oldK);
    transformRef.current.y = cy - (cy - transformRef.current.y) * (newK / oldK);
    transformRef.current.k = newK;
    setZoomK(newK);
    drawRef.current();
  };

  const handleReturnHome = () => {
    pulseRef.current = null;
    pendingPulseRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Reset camera transform
    transformRef.current = { x: 0, y: 0, k: 1 };
    setZoomK(1);
    drawRef.current();
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

      <ProductionCelestialLayer
        ref={productionCelestialLayerRef}
        onRendererAvailabilityChange={setHasProductionRenderer}
        onRingOcclusionChange={handleRingOcclusionChange}
      />

      {/* Keyboard and screen-reader controls mirror the visible concept scene. */}
      <div className={styles.srOnly} role="group" aria-label="Visible concepts">
        {targetScene.allNodes.map((node) => {
          const identity = getConceptCelestialIdentity(node.slug);

          return (
            <button
              key={node.id}
              type="button"
              aria-label={`${node.name}, ${node.role} concept`}
              data-testid={`concept-accessible-control-${node.id}`}
              data-concept-id={node.id}
              data-concept-slug={node.slug}
              data-role={node.role}
              data-celestial-archetype={identity.archetype}
              data-celestial-seed={identity.seed}
              onClick={() => onSelectConcept(node.slug)}
              onFocus={() => {
                setFocusedNodeId(node.id);
                setHoveredNodeId(node.id);
              }}
              onBlur={() => {
                setFocusedNodeId(null);
                setHoveredNodeId(null);
              }}
            >
              {node.name}
            </button>
          );
        })}
      </div>
      <nav className={styles.controls} aria-label="Spatial navigation controls">
        <button
          onClick={handleReturnHome}
          className={`${styles.controlButton} ${styles.homeButton}`}
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

        <div className={styles.zoomCluster} role="group" aria-label="Zoom controls">
          <button
            onClick={() => handleZoom("out")}
            disabled={zoomK <= 0.305}
            className={`${styles.controlButton} ${styles.zoomButton}`}
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <svg
              className={styles.controlIcon}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="10" x2="15" y2="10" />
            </svg>
          </button>

          <button
            onClick={() => handleZoom("in")}
            disabled={zoomK >= 2.995}
            className={`${styles.controlButton} ${styles.zoomButton}`}
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <svg
              className={styles.controlIcon}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="10" y1="5" x2="10" y2="15" />
              <line x1="5" y1="10" x2="15" y2="10" />
            </svg>
          </button>
        </div>
      </nav>
    </div>
  );
}
