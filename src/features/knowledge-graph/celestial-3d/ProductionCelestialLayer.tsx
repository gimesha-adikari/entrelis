"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type {
  ProductionCelestialController,
  ProductionCelestialLifecycleStats,
} from "./production-controller";
import { ProductionCelestialController as Controller } from "./production-controller";
import styles from "../components/KnowledgeGraph.module.css";

import type { ForegroundRingOcclusionSnapshot } from "./ring-occlusion";

const EMPTY_RING_OCCLUSIONS: ForegroundRingOcclusionSnapshot = {
  masks: [],
  pending: false,
  unreadyNodeIds: new Set(),
  bodyNotReadyNodeIds: new Set(),
};

type DisplayedSceneUpdate = Parameters<ProductionCelestialController["update"]>;

interface ProductionCelestialLayerProps {
  readonly onRingOcclusionChange?: () => void;
  readonly onRendererAvailabilityChange: (available: boolean) => void;
}

export interface ProductionCelestialLayerHandle {
  update(...args: DisplayedSceneUpdate): void;
  getForegroundRingOcclusions(priorityNodeId?: string): ForegroundRingOcclusionSnapshot;
  getLifecycleStats(): ProductionCelestialLifecycleStats | null;
}

/** Owns the production WebGL canvas while GraphCanvas supplies its displayed scene snapshots. */
const ProductionCelestialLayer = forwardRef<
  ProductionCelestialLayerHandle,
  ProductionCelestialLayerProps
>(function ProductionCelestialLayer(
  { onRendererAvailabilityChange, onRingOcclusionChange },
  forwardedRef
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ProductionCelestialController | null>(null);
  const latestUpdateRef = useRef<DisplayedSceneUpdate | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      getForegroundRingOcclusions(priorityNodeId) {
        return (
          controllerRef.current?.getForegroundRingOcclusions(priorityNodeId) ??
          EMPTY_RING_OCCLUSIONS
        );
      },
      getLifecycleStats() {
        return controllerRef.current?.getLifecycleStats() ?? null;
      },
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

    const controller = new Controller(canvas, { onRingOcclusionChange });
    controllerRef.current = controller;
    onRendererAvailabilityChange(controller.isAvailable);
    if (latestUpdateRef.current) controller.update(...latestUpdateRef.current);

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [onRendererAvailabilityChange, onRingOcclusionChange]);

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
