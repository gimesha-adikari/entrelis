"use client";

import { useEffect, useState, useMemo } from "react";
import type { CelestialArchetype, RingConfig } from "../celestial-3d/identity";
import styles from "./KnowledgeGraph.module.css";

export interface ProjectionAnchor {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface PanelGeometry {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

export interface CelestialProjectionBridgeProps {
  readonly focusPos: ProjectionAnchor | null;
  readonly archetype?: CelestialArchetype | null;
  readonly rings?: RingConfig | null;
  readonly panelRef: React.RefObject<HTMLElement | null>;
  readonly isMobile?: boolean;
  readonly isMobileExpanded?: boolean;
}

interface ArchetypePalette {
  readonly primary: string;
  readonly secondary: string;
  readonly glow: string;
  readonly dim: string;
  readonly rgb: string;
}

const ARCHETYPE_PALETTES: Record<string, ArchetypePalette> = {
  "volcanic-rocky": {
    primary: "#f59e0b",
    secondary: "#fbbf24",
    glow: "rgba(245, 158, 11, 0.45)",
    dim: "rgba(245, 158, 11, 0.12)",
    rgb: "245, 158, 11",
  },
  "storm-giant": {
    primary: "#06b6d4",
    secondary: "#38bdf8",
    glow: "rgba(6, 182, 212, 0.45)",
    dim: "rgba(6, 182, 212, 0.12)",
    rgb: "6, 182, 212",
  },
  "mineral-rocky": {
    primary: "#eab308",
    secondary: "#facc15",
    glow: "rgba(234, 179, 8, 0.45)",
    dim: "rgba(234, 179, 8, 0.12)",
    rgb: "234, 179, 8",
  },
  "ember-star": {
    primary: "#f97316",
    secondary: "#fed7aa",
    glow: "rgba(249, 115, 22, 0.48)",
    dim: "rgba(249, 115, 22, 0.14)",
    rgb: "249, 115, 22",
  },
  "blue-atmospheric": {
    primary: "#38bdf8",
    secondary: "#7dd3fc",
    glow: "rgba(56, 189, 248, 0.45)",
    dim: "rgba(56, 189, 248, 0.12)",
    rgb: "56, 189, 248",
  },
  "metallic-world": {
    primary: "#94a3b8",
    secondary: "#cbd5e1",
    glow: "rgba(148, 163, 184, 0.40)",
    dim: "rgba(148, 163, 184, 0.10)",
    rgb: "148, 163, 184",
  },
  "crystal-world": {
    primary: "#a5b4fc",
    secondary: "#c7d2fe",
    glow: "rgba(165, 180, 252, 0.45)",
    dim: "rgba(165, 180, 252, 0.12)",
    rgb: "165, 180, 252",
  },
  "golden-star": {
    primary: "#facc15",
    secondary: "#fef08a",
    glow: "rgba(250, 204, 21, 0.48)",
    dim: "rgba(250, 204, 21, 0.14)",
    rgb: "250, 204, 21",
  },
  "blue-star": {
    primary: "#60a5fa",
    secondary: "#93c5fd",
    glow: "rgba(96, 165, 250, 0.48)",
    dim: "rgba(96, 165, 250, 0.14)",
    rgb: "96, 165, 250",
  },
};

const DEFAULT_PALETTE: ArchetypePalette = {
  primary: "#38bdf8",
  secondary: "#7dd3fc",
  glow: "rgba(56, 189, 248, 0.45)",
  dim: "rgba(56, 189, 248, 0.12)",
  rgb: "56, 189, 248",
};

export default function CelestialProjectionBridge({
  focusPos,
  archetype,
  rings,
  panelRef,
  isMobile = false,
  isMobileExpanded = false,
}: CelestialProjectionBridgeProps) {
  const [panelRect, setPanelRect] = useState<PanelGeometry | null>(null);

  const palette = useMemo<ArchetypePalette>(() => {
    if (!archetype) return DEFAULT_PALETTE;
    return ARCHETYPE_PALETTES[archetype] ?? DEFAULT_PALETTE;
  }, [archetype]);

  // Track panel bounds on layout, resize, and scroll
  useEffect(() => {
    function measure() {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      setPanelRect((prev) => {
        if (
          prev &&
          Math.abs(prev.left - rect.left) < 1 &&
          Math.abs(prev.top - rect.top) < 1 &&
          Math.abs(prev.width - rect.width) < 1 &&
          Math.abs(prev.height - rect.height) < 1
        ) {
          return prev;
        }
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      });
    }

    measure();
    window.addEventListener("resize", measure);

    // Bounded re-measurement observer for layout shifts
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => measure())
      : null;

    if (panelRef.current && observer) {
      observer.observe(panelRef.current);
    }

    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [panelRef, isMobile, isMobileExpanded]);

  // If no planet position or panel measured yet, render empty SVG container
  if (!focusPos || !panelRect) {
    return null;
  }

  // Desktop Spatial Projection Path
  if (!isMobile) {
    const radius = focusPos.radius;
    const originCenterX = focusPos.x;
    const originCenterY = focusPos.y;

    const ringVisualRadius = rings ? (rings.outerRadius / 50) * radius : 0;
    const hasRings = ringVisualRadius > radius;
    const departureRadius = hasRings ? ringVisualRadius + 2 : radius + 1.5;
    const maskRadius = hasRings ? ringVisualRadius + 1 : radius + 0.5;

    const targetX = panelRect.left + 2;
    const targetTopY = panelRect.top + 36;
    const targetBottomY = panelRect.bottom - 36;
    const targetMidY = (targetTopY + targetBottomY) / 2;

    // Physical limb departure points (tangent to planet perimeter)
    // Angles: upper ray emerges at -28 degrees, lower ray at +28 degrees
    const limbCos = 0.8829; // cos(28 deg)
    const limbSin = 0.4695; // sin(28 deg)

    const upperOriginX = originCenterX + departureRadius * limbCos;
    const upperOriginY = originCenterY - departureRadius * limbSin;

    const lowerOriginX = originCenterX + departureRadius * limbCos;
    const lowerOriginY = originCenterY + departureRadius * limbSin;

    const equatorialOriginX = originCenterX + departureRadius;
    const equatorialOriginY = originCenterY;

    const dx = Math.max(40, targetX - equatorialOriginX);
    const midX = equatorialOriginX + dx * 0.48;
    const arcCurvature = Math.min(26, Math.max(14, dx * 0.08));

    // Outer projection veil boundary (organically curved starlight funnel)
    // Originates at exterior limb perimeter and sweeps outward to the knowledge field
    const veilPath = `
      M ${upperOriginX} ${upperOriginY}
      C ${upperOriginX + dx * 0.38} ${upperOriginY - 20}, ${targetX - dx * 0.28} ${targetTopY}, ${targetX} ${targetTopY}
      Q ${targetX - arcCurvature} ${targetMidY}, ${targetX} ${targetBottomY}
      C ${targetX - dx * 0.28} ${targetBottomY}, ${lowerOriginX + dx * 0.38} ${lowerOriginY + 20}, ${lowerOriginX} ${lowerOriginY}
      A ${departureRadius} ${departureRadius} 0 0 0 ${upperOriginX} ${upperOriginY}
      Z
    `;

    // Upper boundary filament
    const upperRay = `
      M ${upperOriginX} ${upperOriginY}
      C ${upperOriginX + dx * 0.38} ${upperOriginY - 20}, ${targetX - dx * 0.28} ${targetTopY}, ${targetX} ${targetTopY}
    `;

    // Lower boundary filament
    const lowerRay = `
      M ${lowerOriginX} ${lowerOriginY}
      C ${lowerOriginX + dx * 0.38} ${lowerOriginY + 20}, ${targetX - dx * 0.28} ${targetBottomY}, ${targetX} ${targetBottomY}
    `;

    // Central ethereal carrier stream
    const carrierStream = `
      M ${equatorialOriginX + 4} ${equatorialOriginY}
      Q ${midX} ${equatorialOriginY * 0.8 + targetMidY * 0.2}, ${targetX} ${targetMidY}
    `;

    // Curved field contour arc
    const contourArc = `
      M ${targetX} ${targetTopY}
      Q ${targetX - arcCurvature} ${targetMidY}, ${targetX} ${targetBottomY}
    `;

    // Exterior atmospheric crescent rim path (subtle crescent hugging outer perimeter)
    const rimRadius = radius + 1.2;
    const rimAngle = Math.PI / 3; // 60 degrees
    const rimTopX = originCenterX + rimRadius * Math.cos(rimAngle);
    const rimTopY = originCenterY - rimRadius * Math.sin(rimAngle);
    const rimBottomX = originCenterX + rimRadius * Math.cos(rimAngle);
    const rimBottomY = originCenterY + rimRadius * Math.sin(rimAngle);
    const rimArc = `
      M ${rimTopX} ${rimTopY}
      A ${rimRadius} ${rimRadius} 0 0 1 ${rimBottomX} ${rimBottomY}
    `;

    return (
      <svg
        className={styles.projectionBridgeSvg}
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="projectionGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="contourBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="bloom" />
            <feMerge>
              <feMergeNode in="bloom" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient
            id="projectionVeilGradient"
            x1={equatorialOriginX}
            y1={equatorialOriginY}
            x2={targetX}
            y2={targetMidY}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={`rgba(${palette.rgb}, 0.055)`} />
            <stop offset="30%" stopColor={`rgba(${palette.rgb}, 0.022)`} />
            <stop offset="72%" stopColor={`rgba(${palette.rgb}, 0.005)`} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          <linearGradient
            id="rayGradient"
            x1={equatorialOriginX}
            y1={equatorialOriginY}
            x2={targetX}
            y2={targetMidY}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.24" />
            <stop offset="35%" stopColor={palette.primary} stopOpacity="0.12" />
            <stop offset="80%" stopColor="rgba(255, 255, 255, 0.08)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.20)" stopOpacity="0.20" />
          </linearGradient>

          <linearGradient
            id="contourArcStroke"
            x1={targetX}
            y1={targetTopY}
            x2={targetX}
            y2={targetBottomY}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="transparent" />
            <stop offset="18%" stopColor="rgba(255, 255, 255, 0.14)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.38)" />
            <stop offset="82%" stopColor="rgba(255, 255, 255, 0.14)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          <radialGradient
            id="limbEmission"
            cx={equatorialOriginX + 2}
            cy={originCenterY}
            r={radius * 1.2}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.14" />
            <stop offset="50%" stopColor={palette.primary} stopOpacity="0.04" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* SVG Mask to ensure zero projection glow ever overlaps the celestial body */}
          <mask id="planetSilhouetteMask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <circle
              cx={originCenterX}
              cy={originCenterY}
              r={maskRadius}
              fill="black"
            />
          </mask>
        </defs>

        {/* Projection Geometry strictly masked outside planet silhouette */}
        <g mask="url(#planetSilhouetteMask)">
          {/* 1. Subtle exterior atmospheric emission glow */}
          <ellipse
            cx={equatorialOriginX + 2}
            cy={originCenterY}
            rx={radius * 0.35}
            ry={radius * 0.95}
            fill="url(#limbEmission)"
            filter="url(#projectionGlow)"
          />

          {/* 2. Delicate exterior atmospheric crescent rim */}
          <path
            d={rimArc}
            fill="none"
            stroke={palette.primary}
            strokeWidth="1.1"
            strokeOpacity="0.28"
            filter="url(#projectionGlow)"
          />

          {/* 3. Ethereal Projection Veil (Curved Cosmic Funnel) */}
          <path d={veilPath} fill="url(#projectionVeilGradient)" />

          {/* 4. Central Carrier Stream Wave */}
          <path
            d={carrierStream}
            fill="none"
            stroke={`rgba(${palette.rgb}, 0.12)`}
            strokeWidth="0.8"
            strokeDasharray="3 6"
          />

          {/* 5. Upper & Lower Boundary Filaments */}
          <path
            d={upperRay}
            fill="none"
            stroke="url(#rayGradient)"
            strokeWidth="0.75"
            filter="url(#projectionGlow)"
          />
          <path
            d={lowerRay}
            fill="none"
            stroke="url(#rayGradient)"
            strokeWidth="0.75"
            filter="url(#projectionGlow)"
          />
        </g>

        {/* 6. Curved Starlight Field Contour Arc with Outer Aura Bloom at Reading Panel */}
        <path
          d={contourArc}
          fill="none"
          stroke={`rgba(${palette.rgb}, 0.12)`}
          strokeWidth="2.2"
          filter="url(#contourBloom)"
        />
        <path
          d={contourArc}
          fill="none"
          stroke="url(#contourArcStroke)"
          strokeWidth="0.85"
        />
      </svg>
    );
  }

  // Mobile Spatial Projection Path (Vertical Celestial Stream)
  if (isMobileExpanded) {
    return null;
  }

  const radius = focusPos.radius;
  const originCenterX = focusPos.x;
  const originCenterY = focusPos.y;

  const ringVisualRadius = rings ? (rings.outerRadius / 50) * radius : 0;
  const hasRings = ringVisualRadius > radius;
  const departureRadius = hasRings ? ringVisualRadius + 2 : radius + 1.5;
  const maskRadius = hasRings ? ringVisualRadius + 1 : radius + 0.5;

  const planetBottomX = originCenterX;
  const planetBottomY = originCenterY + departureRadius;

  const lensTopX = panelRect.left + panelRect.width / 2;
  const lensTopY = panelRect.top;

  if (lensTopY <= planetBottomY) {
    return null;
  }

  const dy = Math.max(20, lensTopY - planetBottomY);
  const halfTopW = 2.5;
  const halfBottomW = 9;

  // Delicate slender starlight channel
  const mobileStreamPath = `
    M ${planetBottomX - halfTopW} ${planetBottomY}
    C ${planetBottomX - halfTopW - 1} ${planetBottomY + dy * 0.35}, ${lensTopX - halfBottomW - 1} ${lensTopY - 6}, ${lensTopX - halfBottomW} ${lensTopY}
    L ${lensTopX + halfBottomW} ${lensTopY}
    C ${lensTopX + halfBottomW + 1} ${lensTopY - 6}, ${planetBottomX + halfTopW + 1} ${planetBottomY + dy * 0.35}, ${planetBottomX + halfTopW} ${planetBottomY}
    Z
  `;

  // Left & right guide filaments
  const leftFilament = `
    M ${planetBottomX - halfTopW} ${planetBottomY}
    C ${planetBottomX - halfTopW - 1} ${planetBottomY + dy * 0.35}, ${lensTopX - halfBottomW - 1} ${lensTopY - 6}, ${lensTopX - halfBottomW} ${lensTopY}
  `;
  const rightFilament = `
    M ${planetBottomX + halfTopW} ${planetBottomY}
    C ${planetBottomX + halfTopW + 1} ${planetBottomY + dy * 0.35}, ${lensTopX + halfBottomW + 1} ${lensTopY - 6}, ${lensTopX + halfBottomW} ${lensTopY}
  `;

  // Central luminous carrier filament
  const centerRay = `
    M ${planetBottomX} ${planetBottomY}
    L ${lensTopX} ${lensTopY}
  `;

  const crestRadius = 24;

  return (
    <svg
      className={styles.projectionBridgeSvg}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Soft starlight diffusion veil */}
        <linearGradient
          id="mobileVeilGradient"
          x1={planetBottomX}
          y1={planetBottomY}
          x2={lensTopX}
          y2={lensTopY}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={`rgba(${palette.rgb}, 0.035)`} />
          <stop offset="45%" stopColor={`rgba(${palette.rgb}, 0.012)`} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        {/* Luminous starlight filament gradient */}
        <linearGradient
          id="mobileBeamGradient"
          x1={planetBottomX}
          y1={planetBottomY}
          x2={lensTopX}
          y2={lensTopY}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.45" />
          <stop offset="35%" stopColor={palette.primary} stopOpacity="0.22" />
          <stop offset="80%" stopColor="rgba(255, 255, 255, 0.12)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.38)" />
        </linearGradient>

        {/* Compact, focused luminous crest on top rim of Cosmic Lens */}
        <linearGradient
          id="mobileRimGradient"
          x1={lensTopX - crestRadius}
          y1={lensTopY}
          x2={lensTopX + crestRadius}
          y2={lensTopY}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="transparent" />
          <stop offset="28%" stopColor={palette.primary} stopOpacity="0.20" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.60" />
          <stop offset="72%" stopColor={palette.primary} stopOpacity="0.20" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        {/* Ring-aware SVG Mask to ensure zero projection overlap with celestial body or rings */}
        <mask id="mobilePlanetSilhouetteMask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle
            cx={originCenterX}
            cy={originCenterY}
            r={maskRadius}
            fill="black"
          />
        </mask>
      </defs>

      {/* Masked starlight connection outside planetary body and rings */}
      <g mask="url(#mobilePlanetSilhouetteMask)">
        {/* 1. Subtle starlight diffusion veil */}
        <path d={mobileStreamPath} fill="url(#mobileVeilGradient)" />

        {/* 2. Delicate outer boundary filaments */}
        <path
          d={leftFilament}
          fill="none"
          stroke="url(#mobileBeamGradient)"
          strokeWidth="0.65"
          strokeOpacity="0.30"
        />
        <path
          d={rightFilament}
          fill="none"
          stroke="url(#mobileBeamGradient)"
          strokeWidth="0.65"
          strokeOpacity="0.30"
        />

        {/* 3. Central luminous carrier filament */}
        <path
          d={centerRay}
          fill="none"
          stroke="url(#mobileBeamGradient)"
          strokeWidth="1.1"
          strokeDasharray="3 4"
        />

        {/* 4. Soft departure starlight spark */}
        <circle
          cx={planetBottomX}
          cy={planetBottomY + 0.5}
          r={1.8}
          fill={palette.secondary}
          fillOpacity="0.4"
        />
      </g>

      {/* Luminous crest on the top rim of the Cosmic Lens */}
      <line
        x1={lensTopX - crestRadius}
        y1={lensTopY}
        x2={lensTopX + crestRadius}
        y2={lensTopY}
        stroke="url(#mobileRimGradient)"
        strokeWidth="1.2"
      />
    </svg>
  );
}
