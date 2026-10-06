import React, { useMemo } from "react";
import { CelestialNodeProps } from "./types";
import { getCelestialIdentity } from "./identity";
import { StarBody } from "./bodies/StarBody";
import { RockyBody } from "./bodies/RockyBody";
import { GasBody } from "./bodies/GasBody";
import { IceBody } from "./bodies/IceBody";
import styles from "./CelestialNode.module.css";

export const CelestialNode: React.FC<CelestialNodeProps> = ({
  id,
  name,
  slug,
  role,
  x,
  y,
  isSelected = false,
  isHovered = false,
  isMobile = false,
  onClick,
  onHover,
  className = "",
  testId,
  style = {},
  showLabel,
  forcedArchetype,
  forcedPalette,
}) => {
  // 1. Deterministic Celestial Identity
  const baseIdentity = useMemo(() => getCelestialIdentity(id), [id]);

  const identity = useMemo(() => {
    if (!forcedArchetype && !forcedPalette) return baseIdentity;
    return {
      ...baseIdentity,
      ...(forcedArchetype ? { archetype: forcedArchetype } : {}),
      ...(forcedPalette ? { palette: forcedPalette } : {}),
    };
  }, [baseIdentity, forcedArchetype, forcedPalette]);

  // 2. Physical & Hit Target Sizing
  const { bodySize, hitSize } = useMemo(() => {
    if (role === "focus") {
      return {
        bodySize: isMobile ? 56 : 74,
        hitSize: isMobile ? 80 : 96,
      };
    }
    if (role === "primary") {
      return {
        bodySize: isMobile ? 30 : 38,
        hitSize: isMobile ? 48 : 56,
      };
    }
    // Context / 2nd-degree
    return {
      bodySize: isMobile ? 14 : 18,
      hitSize: isMobile ? 44 : 44, // Generous accessible hit target even for tiny bodies
    };
  }, [role, isMobile]);

  // 3. Coordinate Positioning
  const isPositioned = typeof x === "number" && typeof y === "number";

  const positionStyle: React.CSSProperties = isPositioned
    ? {
        transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
      }
    : {};

  const roleClass =
    role === "focus"
      ? styles.roleFocus
      : role === "primary"
        ? styles.rolePrimary
        : styles.roleContext;

  // 4. Label Visibility Rule
  const shouldShowLabel = showLabel ?? (role === "focus" || role === "primary" || isHovered);

  const labelClass =
    role === "focus"
      ? styles.focusLabel
      : role === "primary"
        ? styles.primaryLabel
        : styles.contextLabel;

  // 5. Select Body Archetype
  const renderArchetypeBody = () => {
    const props = {
      identity,
      role,
      size: bodySize,
      isSelected,
      isHovered,
    };

    switch (identity.archetype) {
      case "star":
        return <StarBody {...props} />;
      case "rocky":
        return <RockyBody {...props} />;
      case "gas":
        return <GasBody {...props} />;
      case "ice":
        return <IceBody {...props} />;
      default:
        return <RockyBody {...props} />;
    }
  };

  return (
    <button
      type="button"
      className={`${styles.nodeButton} ${roleClass} ${!isPositioned ? styles.relativeNode : ""} ${className}`}
      style={{
        width: hitSize,
        height: hitSize,
        ...positionStyle,
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(id)}
      onBlur={() => onHover?.(null)}
      aria-label={`${name} (${identity.archetype} ${role})`}
      data-concept-id={id}
      data-concept-slug={slug}
      data-role={role}
      data-archetype={identity.archetype}
      data-testid={testId ?? `celestial-node-${id}`}
    >
      {/* Visual Celestial Body */}
      {renderArchetypeBody()}

      {/* Label */}
      {shouldShowLabel && (
        <div className={styles.labelWrapper}>
          <span className={labelClass}>{name}</span>
        </div>
      )}
    </button>
  );
};
