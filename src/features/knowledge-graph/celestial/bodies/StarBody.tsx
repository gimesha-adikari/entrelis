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

export const StarBody: React.FC<BodyProps> = ({ identity, role, size, isHovered }) => {
  const { palette, seed, rotationDuration, rotationDelay, breathingDuration, breathingDelay } =
    identity;
  const isFocus = role === "focus";
  const isContext = role === "context";

  const flareAngle1 = (seed % 60) - 30;
  const flareAngle2 = flareAngle1 + 90;

  // Outer corona multiplier
  const coronaSize = isFocus ? size * 2.4 : isHovered ? size * 2.0 : size * 1.6;

  return (
    <div
      className={styles.celestialBodyWrapper}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* 1. Large Atmospheric Corona (breathing) */}
      <div
        className={`${styles.coronaLayer} ${isFocus ? styles.animateBreath : ""}`}
        style={{
          width: coronaSize,
          height: coronaSize,
          background: `radial-gradient(circle, ${palette.corona} 0%, ${palette.corona.replace("0.45", "0.15")} 45%, rgba(0,0,0,0) 70%)`,
          animationDuration: breathingDuration,
          animationDelay: breathingDelay,
        }}
      />

      {/* SVG Celestial Core & Flares */}
      <svg
        className={styles.bodySvg}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <defs>
          {/* Radial gradient for the luminous energetic core */}
          <radialGradient
            id={`star-core-${identity.conceptId}`}
            cx="50%"
            cy="50%"
            r="50%"
            fx="48%"
            fy="48%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor={palette.core} stopOpacity="0.95" />
            <stop offset="60%" stopColor={palette.primary} stopOpacity="0.85" />
            <stop offset="85%" stopColor={palette.secondary} stopOpacity="0.7" />
            <stop offset="100%" stopColor={palette.darkSide} stopOpacity="0" />
          </radialGradient>

          {/* Secondary flare gradient */}
          <linearGradient
            id={`star-flare-${identity.conceptId}`}
            x1="0%"
            y1="50%"
            x2="100%"
            y2="50%"
          >
            <stop offset="0%" stopColor={palette.primary} stopOpacity="0" />
            <stop offset="30%" stopColor={palette.core} stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="70%" stopColor={palette.core} stopOpacity="0.8" />
            <stop offset="100%" stopColor={palette.primary} stopOpacity="0" />
          </linearGradient>

          <clipPath id={`star-clip-${identity.conceptId}`}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>
        </defs>

        {/* 2. Rotating Asymmetric Flare Rays (Focus and Primary) */}
        {!isContext && (
          <g
            className={`${styles.flareGroup} ${styles.animateRotate}`}
            style={{
              animationDuration: rotationDuration,
              animationDelay: rotationDelay,
              transformOrigin: "50px 50px",
            }}
          >
            {/* Primary Flare Ray (horizontal diamond) */}
            <polygon
              points="10,50 48,47 90,50 48,53"
              fill={`url(#star-flare-${identity.conceptId})`}
              transform={`rotate(${flareAngle1} 50 50)`}
              opacity={isFocus ? 0.85 : 0.6}
            />
            {/* Cross Flare Ray (vertical diamond) */}
            <polygon
              points="50,15 47,48 50,85 53,48"
              fill={`url(#star-flare-${identity.conceptId})`}
              transform={`rotate(${flareAngle1} 50 50)`}
              opacity={isFocus ? 0.75 : 0.5}
            />
            {/* Diagonal Asymmetric Sub-Ray */}
            <polygon
              points="25,50 49,48 75,50 49,52"
              fill={`url(#star-flare-${identity.conceptId})`}
              transform={`rotate(${flareAngle2} 50 50)`}
              opacity={isFocus ? 0.55 : 0.35}
            />
          </g>
        )}

        {/* 3. Luminous Stellar Disk */}
        <circle cx="50" cy="50" r="46" fill={`url(#star-core-${identity.conceptId})`} />

        {/* 4. Plasma Turbulence Ring (clipped inside disk) */}
        {!isContext && (
          <g clipPath={`url(#star-clip-${identity.conceptId})`}>
            {/* Multi-layered soft plasma clouds */}
            <circle
              cx="45"
              cy="45"
              r="34"
              fill="none"
              stroke={palette.core}
              strokeWidth="5"
              opacity="0.3"
              filter="blur(2px)"
            />
            <circle
              cx="55"
              cy="52"
              r="24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              opacity="0.45"
              filter="blur(1px)"
            />
          </g>
        )}

        {/* 5. Pure White Intense Core Spot */}
        <circle
          cx="48"
          cy="48"
          r={isFocus ? 12 : 7}
          fill="#ffffff"
          opacity="0.9"
          filter="blur(1px)"
        />

        {/* 6. Focus Orbital / Polar Arc (thin dashed orbital treatment) */}
        {isFocus && (
          <ellipse
            cx="50"
            cy="50"
            rx="48"
            ry="48"
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
