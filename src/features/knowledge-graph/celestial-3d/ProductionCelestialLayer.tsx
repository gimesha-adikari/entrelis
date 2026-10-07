"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ProductionCelestialController } from "./production-controller";
import { ProductionCelestialController as Controller } from "./production-controller";
import styles from "../components/KnowledgeGraph.module.css";

type DisplayedSceneUpdate = Parameters<ProductionCelestialController["update"]>;

interface ProductionCelestialLayerProps {
  readonly onRendererAvailabilityChange: (available: boolean) => void;
}

export interface ProductionCelestialLayerHandle {
  update(...args: DisplayedSceneUpdate): void;
}

/** Owns the production WebGL canvas while GraphCanvas supplies its displayed scene snapshots. */
const ProductionCelestialLayer = forwardRef<
  ProductionCelestialLayerHandle,
  ProductionCelestialLayerProps
>(function ProductionCelestialLayer({ onRendererAvailabilityChange }, forwardedRef) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ProductionCelestialController | null>(null);
  const latestUpdateRef = useRef<DisplayedSceneUpdate | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      update(...args) {
        latestUpdateRef.current = args;
        controllerRef.current?.update(...args);
      },
    }),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new Controller(canvas);
    controllerRef.current = controller;
    onRendererAvailabilityChange(controller.isAvailable);
    if (latestUpdateRef.current) controller.update(...latestUpdateRef.current);

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [onRendererAvailabilityChange]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.productionCelestialCanvas}
      data-production-celestial-layer="true"
      aria-hidden="true"
    />
  );
});

export default ProductionCelestialLayer;
