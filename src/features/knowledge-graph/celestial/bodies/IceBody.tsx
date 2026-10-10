import React from "react";
import { CelestialIdentity, CelestialRole } from "../types";
import styles from "./bodies.module.css";

interface BodyProps {
  identity: CelestialIdentity;
  role: CelestialRole;
  size: number;
  isSelected?: boolean;
  isHovered?: boolean;
}

export const IceBody: React.FC<BodyProps> = ({ identity, role, size, isHovered }) => {
  const { palette, seed, rotationDelay, breathingDuration, breathingDelay } = identity;
  const isFocus = role === "focus";
  const isContext = role === "context";

  const p1 = (seed % 11) - 5;
  const p2 = ((seed >> 4) % 13) - 6;

  const coronaSize = isFocus ? size * 2.0 : isHovered ? size * 1.6 : size * 1.35;

  return (
    <div
      className={styles.celestialBodyWrapper}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* 1. Icy Atmospheric Scattering Halo */}
      <div
        className={`${styles.coronaLayer} ${isFocus ? styles.animateBreath : ""}`}
        style={{
          width: coronaSize,
          height: coronaSize,
          background: `radial-gradient(circle, ${palette.corona} 0%, ${palette.corona.replace("0.40", "0.10")} 42%, rgba(0,0,0,0) 68%)`,
          animationDuration: breathingDuration,
          animationDelay: breathingDelay,
        }}
      />

      <svg
        className={styles.bodySvg}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={`ice-clip-${identity.conceptId}`}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>

          {/* Translucent Icy Spherical Core */}
          <radialGradient
            id={`ice-base-${identity.conceptId}`}
            cx="32%"
            cy="28%"
            r="65%"
            fx="28%"
            fy="24%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="20%" stopColor={palette.core} stopOpacity="0.9" />
            <stop offset="55%" stopColor={palette.primary} stopOpacity="0.85" />
            <stop offset="85%" stopColor={palette.secondary} stopOpacity="0.9" />
            <stop offset="100%" stopColor={palette.darkSide} stopOpacity="1" />
          </radialGradient>

          {/* Internal Shimmer Gradient */}
          <linearGradient
            id={`ice-shimmer-${identity.conceptId}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="50%" stopColor={palette.core} stopOpacity="0.3" />
            <stop offset="100%" stopColor={palette.primary} stopOpacity="0.1" />
          </linearGradient>

          {/* Crisp Bright Rim Gradient */}
          <linearGradient id={`ice-rim-${identity.conceptId}`} x1="15%" y1="15%" x2="85%" y2="85%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor={palette.limb} stopOpacity="0.95" />
            <stop offset="70%" stopColor={palette.primary} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 2. Base Translucent Icy Sphere */}
        <circle cx="50" cy="50" r="46" fill={`url(#ice-base-${identity.conceptId})`} />

        {/* 3. Internal Crystalline Fractures & Cloudy Structures (Clipped) */}
        {!isContext && (
          <g clipPath={`url(#ice-clip-${identity.conceptId})`}>
            {/* Shimmering internal crystalline lattice */}
            <g
              className={styles.animateCrystalShimmer}
              style={{
                animationDuration: "24s",
                animationDelay: rotationDelay,
              }}
            >
              {/* Primary Glacial Fracture Lines */}
              <path
                d={`M 22 ${32 + p1} L 45 ${48 + p2} L 72 ${36 + p1} M 45 ${48 + p2} L 38 ${75 + p1} M 45 ${48 + p2} L 65 ${68 + p2}`}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                opacity="0.55"
              />
              <path
                d={`M 30 ${20 + p2} L 48 ${32 + p1} L 75 ${22 + p2} M 48 ${32 + p1} L 55 ${52 + p1}`}
                fill="none"
                stroke={palette.core}
                strokeWidth="0.8"
                opacity="0.4"
              />

              {/* Internal Subsurface Frost Clouds */}
              <ellipse
                cx={44 + p1}
                cy={40 + p2}
                rx="18"
                ry="12"
                transform={`rotate(25 ${44 + p1} ${40 + p2})`}
                fill={`url(#ice-shimmer-${identity.conceptId})`}
                opacity="0.5"
              />
              <ellipse
                cx={60 + p2}
                cy={55 + p1}
                rx="14"
                ry="8"
                transform={`rotate(-15 ${60 + p2} ${55 + p1})`}
                fill={palette.core}
                opacity="0.35"
              />
            </g>
          </g>
        )}

        {/* 4. Subsurface Dark Core Shading for Depth */}
        <circle cx="62" cy="64" r="38" fill={palette.darkSide} opacity="0.5" filter="blur(4px)" />

        {/* 5. Crisp Luminous Frozen Rim Light */}
        <circle
          cx="50"
          cy="50"
          r="45.5"
          fill="none"
          stroke={`url(#ice-rim-${identity.conceptId})`}
          strokeWidth={isFocus ? 2.2 : 1.6}
        />

        {/* 6. Specular Glacial Sweep Highlight (Drifting gently 14s) */}
        {!isContext && (
          <ellipse
            className={styles.animateSpecularSweep}
            cx="32"
            cy="26"
            rx={isFocus ? 8 : 5}
            ry={isFocus ? 4 : 2.5}
            transform="rotate(-28 32 26)"
            fill="#ffffff"
            opacity="0.85"
            filter="blur(0.8px)"
            style={{
              animationDuration: "14s",
              animationDelay: breathingDelay,
            }}
          />
        )}

        {/* 7. Focus Orbital Arc */}
        {isFocus && (
          <ellipse
            cx="50"
            cy="50"
            rx="48.5"
            ry="48.5"
            fill="none"
            stroke={palette.limb}
            strokeWidth="1.2"
            strokeDasharray="14 10"
            opacity="0.8"
          />
        )}
      </svg>
    </div>
  );
};
