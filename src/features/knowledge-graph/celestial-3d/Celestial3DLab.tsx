"use client";

import React, { useEffect, useRef, useState } from "react";
import { Celestial3DController } from "./controller";
import styles from "./Celestial3DLab.module.css";

export const Celestial3DLab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Celestial3DController | null>(null);

  const [hoveredArchetype, setHoveredArchetype] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const controller = new Celestial3DController({
      canvas,
      targetFps: 60,
      onHoverChange: (archetype) => {
        setHoveredArchetype(archetype);
      },
    });
    controllerRef.current = controller;

    const updateSize = () => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      setDimensions({ width: w, height: h });
      controller.resize(w, h);
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
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

  const { width, height } = dimensions;
  const spacingX = Math.min(200, width * 0.26);
  const spacingY = Math.min(150, height * 0.25);
  const labelOffset = 68;

  const labels = [
    {
      id: "star",
      title: "Star",
      left: width / 2 - spacingX,
      top: height / 2 - spacingY + labelOffset,
    },
    {
      id: "rocky",
      title: "Rocky",
      left: width / 2 + spacingX,
      top: height / 2 - spacingY + labelOffset,
    },
    {
      id: "gas",
      title: "Gas",
      left: width / 2 - spacingX,
      top: height / 2 + spacingY + labelOffset,
    },
    {
      id: "ice",
      title: "Ice",
      left: width / 2 + spacingX,
      top: height / 2 + spacingY + labelOffset,
    },
  ];

  return (
    <div ref={containerRef} className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />

      <div className={styles.labelsOverlay} aria-hidden="true">
        {labels.map((item) => (
          <div
            key={item.id}
            className={`${styles.label} ${hoveredArchetype === item.id ? styles.labelActive : ""}`}
            style={{
              left: `${item.left}px`,
              top: `${item.top}px`,
            }}
          >
            {item.title}
          </div>
        ))}
      </div>
    </div>
  );
};
