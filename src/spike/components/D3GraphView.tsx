"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import type { Concept, KnowledgeDataset, Relationship } from "@/domain/knowledge/types";
import { createD3GraphData, type D3SimulationNode, type D3SimulationLink } from "../adapters/d3";
import styles from "./SpikeGraphView.module.css";

interface Props {
  dataset: KnowledgeDataset;
}

export default function D3GraphView({ dataset }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Pan and zoom transform
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const nodesRef = useRef<D3SimulationNode[]>([]);
  const linksRef = useRef<D3SimulationLink[]>([]);

  const selectedConcept = useMemo<Concept | null>(() => {
    if (!selectedNodeId) return null;
    return dataset.concepts.find((c) => c.id === selectedNodeId) || null;
  }, [selectedNodeId, dataset.concepts]);

  const connectedRelationships = useMemo<Relationship[]>(() => {
    if (!selectedNodeId) return [];
    return dataset.relationships.filter(
      (r) => r.sourceConceptId === selectedNodeId || r.targetConceptId === selectedNodeId
    );
  }, [selectedNodeId, dataset.relationships]);

  const neighborIds = useMemo<Set<string>>(() => {
    if (!selectedNodeId) return new Set();
    const set = new Set<string>();
    dataset.relationships.forEach((r) => {
      if (r.sourceConceptId === selectedNodeId) set.add(r.targetConceptId);
      if (r.targetConceptId === selectedNodeId) set.add(r.sourceConceptId);
    });
    return set;
  }, [selectedNodeId, dataset.relationships]);

  // Render loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply pan/zoom transform
    const { x, y, k } = transformRef.current;
    ctx.translate(width / 2 + x * dpr, height / 2 + y * dpr);
    ctx.scale(k * dpr, k * dpr);

    // Draw links / edges
    for (const link of linksRef.current) {
      const source = link.source as D3SimulationNode;
      const target = link.target as D3SimulationNode;
      if (typeof source.x !== "number" || typeof source.y !== "number") continue;
      if (typeof target.x !== "number" || typeof target.y !== "number") continue;

      const isConnected =
        selectedNodeId && (source.id === selectedNodeId || target.id === selectedNodeId);
      const isDimmed = selectedNodeId && !isConnected;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      if (isConnected) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 1;
      } else if (isDimmed) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.15;
      } else {
        ctx.strokeStyle =
          link.strength === "primary" ? "rgba(96, 165, 250, 0.4)" : "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = link.strength === "primary" ? 2 : 1;
        ctx.globalAlpha = 0.6;
      }
      ctx.stroke();

      // Draw directional arrow on the link
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const angle = Math.atan2(dy, dx);
      const targetRadius = (target.id === selectedNodeId ? 18 : 12) + 2;
      const arrowX = target.x - Math.cos(angle) * targetRadius;
      const arrowY = target.y - Math.sin(angle) * targetRadius;
      const arrowLength = 7;

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle - Math.PI / 7),
        arrowY - arrowLength * Math.sin(angle - Math.PI / 7)
      );
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle + Math.PI / 7),
        arrowY - arrowLength * Math.sin(angle + Math.PI / 7)
      );
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }

    // Draw nodes
    for (const node of nodesRef.current) {
      if (typeof node.x !== "number" || typeof node.y !== "number") continue;

      const isSelected = node.id === selectedNodeId;
      const isNeighbor = neighborIds.has(node.id);
      const isHovered = node.id === hoveredNodeId;
      const isDimmed = selectedNodeId && !isSelected && !isNeighbor;

      ctx.globalAlpha = isDimmed ? 0.25 : 1.0;

      const radius = isSelected ? 16 : isHovered ? 14 : isNeighbor ? 13 : 11;

      // Glow effect for selected
      if (isSelected) {
        ctx.save();
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);

      if (isSelected) {
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#0284c7";
      } else if (isNeighbor) {
        ctx.fillStyle = "#93c5fd";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#38bdf8";
      } else if (isDimmed) {
        ctx.fillStyle = "rgba(71, 85, 105, 0.4)";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      } else {
        ctx.fillStyle = "#60a5fa";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#bfdbfe";
      }
      ctx.stroke();

      // Labels
      if (!isDimmed) {
        ctx.font = isSelected ? "bold 13px system-ui, sans-serif" : "12px system-ui, sans-serif";
        ctx.fillStyle = isSelected ? "#f8fafc" : isNeighbor ? "#e2e8f0" : "#cbd5e1";
        ctx.textAlign = "center";
        ctx.fillText(node.name, node.x, node.y + radius + 14);
      }
    }

    ctx.restore();
  }, [selectedNodeId, hoveredNodeId, neighborIds]);

  // Concept selection with recenter animation
  const selectConcept = useCallback(
    (nodeId: string | null) => {
      setSelectedNodeId(nodeId);
      if (!nodeId) return;

      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node || typeof node.x !== "number" || typeof node.y !== "number") return;

      const currentK = transformRef.current.k;
      const targetX = -node.x * currentK;
      const targetY = -node.y * currentK;

      // Honor prefers-reduced-motion
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        transformRef.current.x = targetX;
        transformRef.current.y = targetY;
        draw();
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
        draw();

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animateRecenter);
        } else {
          animationFrameRef.current = null;
        }
      };

      animationFrameRef.current = requestAnimationFrame(animateRecenter);
    },
    [draw]
  );

  // Setup simulation and resize
  useEffect(() => {
    const { nodes, links } = createD3GraphData(dataset);
    nodesRef.current = nodes;
    linksRef.current = links;

    const simulation = forceSimulation(nodes)
      .force(
        "link",
        forceLink<D3SimulationNode, D3SimulationLink>(links)
          .id((d) => d.id)
          .distance(110)
      )
      .force("charge", forceManyBody().strength(-240))
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide(35));

    simulation.on("tick", () => {
      draw();
    });

    const updateDimensions = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      draw();
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      simulation.stop();
      window.removeEventListener("resize", updateDimensions);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dataset, draw]);

  // Redraw when selection changes
  useEffect(() => {
    draw();
  }, [selectedNodeId, hoveredNodeId, draw]);

  // Hit test helper
  const getNodeAtPoint = (clientX: number, clientY: number): D3SimulationNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    // Inverse transform
    const { x, y, k } = transformRef.current;
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const worldX = (canvasX - rect.width / 2 - x) / k;
    const worldY = (canvasY - rect.height / 2 - y) / k;

    for (const node of nodesRef.current) {
      if (typeof node.x !== "number" || typeof node.y !== "number") continue;
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      const hitRadius = 20;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return node;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isDraggingRef.current = true;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      draw();
    } else {
      const hit = getNodeAtPoint(e.clientX, e.clientY);
      setHoveredNodeId(hit ? hit.id : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const totalDx = e.clientX - pointerDownPosRef.current.x;
      const totalDy = e.clientY - pointerDownPosRef.current.y;
      const totalDist = Math.hypot(totalDx, totalDy);
      if (totalDist < 5) {
        const hit = getNodeAtPoint(e.clientX, e.clientY);
        selectConcept(hit ? hit.id : null);
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
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newK = Math.max(0.3, Math.min(3, transformRef.current.k * zoomFactor));
    transformRef.current.k = newK;
    draw();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    if (e.touches.length === 1 && touch) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isDraggingRef.current = true;
      pointerDownPosRef.current = { x: touch.clientX, y: touch.clientY };
      lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    if (e.touches.length === 1 && isDraggingRef.current && touch) {
      const dx = touch.clientX - lastMousePosRef.current.x;
      const dy = touch.clientY - lastMousePosRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
      draw();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const touch = e.changedTouches[0];
      if (touch) {
        const totalDx = touch.clientX - pointerDownPosRef.current.x;
        const totalDy = touch.clientY - pointerDownPosRef.current.y;
        if (Math.hypot(totalDx, totalDy) < 8) {
          const hit = getNodeAtPoint(touch.clientX, touch.clientY);
          selectConcept(hit ? hit.id : null);
        }
      }
    }
  };

  const handleTouchCancel = () => {
    isDraggingRef.current = false;
  };

  const handleResetCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    transformRef.current = { x: 0, y: 0, k: 1 };
    setSelectedNodeId(null);
    draw();
  };

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.viewportContainer}>
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
          className={styles.canvasContainer}
        />
        <div className={styles.controls}>
          <button onClick={handleResetCamera} className={styles.button} type="button">
            Reset View
          </button>
          <span className={styles.engineBadge}>Engine: D3-force + Custom Canvas</span>
        </div>
      </div>

      <aside className={styles.detailPanel} aria-label="Selected Concept Details">
        {/* ARIA live region announcing selection changes */}
        <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {selectedConcept
            ? `Selected concept: ${selectedConcept.name}. ${connectedRelationships.length} connected relationships.`
            : "No concept selected."}
        </div>

        {/* Parallel DOM concept list for keyboard navigation and screen readers */}
        <nav className={styles.accessibilityNav} aria-label="Accessible Concept Navigator">
          <span className={styles.navLabel}>Concept List (Keyboard Accessible):</span>
          <div className={styles.conceptButtonGroup} role="group" aria-label="Available concepts">
            {dataset.concepts.map((concept) => (
              <button
                key={concept.id}
                type="button"
                className={
                  selectedNodeId === concept.id ? styles.conceptButtonActive : styles.conceptButton
                }
                aria-pressed={selectedNodeId === concept.id}
                onClick={() => selectConcept(concept.id)}
              >
                {concept.name}
              </button>
            ))}
          </div>
        </nav>

        {selectedConcept ? (
          <div>
            <span className={styles.badge}>Selected Concept</span>
            <h3 className={styles.conceptTitle}>{selectedConcept.name}</h3>
            <p className={styles.conceptSummary}>{selectedConcept.shortDescription}</p>

            <h4 className={styles.relHeading}>Connected Relationships</h4>
            <div className={styles.relList}>
              {connectedRelationships.map((r) => {
                const isSource = r.sourceConceptId === selectedConcept.id;
                const otherConceptId = isSource ? r.targetConceptId : r.sourceConceptId;
                const otherConcept = dataset.concepts.find((c) => c.id === otherConceptId);

                return (
                  <div key={r.id} className={styles.relCard}>
                    <div className={styles.relPath}>
                      <span>{isSource ? selectedConcept.name : otherConcept?.name}</span>
                      <span className={styles.relType}>--{r.type}--&gt;</span>
                      <span>{isSource ? otherConcept?.name : selectedConcept.name}</span>
                    </div>
                    <p className={styles.relExplanation}>{r.explanation}</p>
                    <span className={styles.relStrength}>Strength: {r.strength}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={styles.emptyPrompt}>
            <p>
              Click on any concept node or select from the list above to focus, recenter, and view
              connected relationships.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
