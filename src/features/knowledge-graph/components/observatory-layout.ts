export const OBSERVATORY_PANEL_MIN_WIDTH = 360;
export const OBSERVATORY_PANEL_MAX_WIDTH = 600;
export const OBSERVATORY_PANEL_DEFAULT_WIDTH = 470;
export const OBSERVATORY_GRAPH_MINIMUM_FRACTION = 0.5;
export const OBSERVATORY_DESKTOP_BREAKPOINT = 768;
export const OBSERVATORY_RESIZE_STEP = 16;
export const OBSERVATORY_RESIZE_LARGE_STEP = 64;

export interface ObservatoryPanelWidthConstraints {
  readonly minimum: number;
  readonly maximum: number;
}

export function getObservatoryPanelWidthConstraints(
  viewportWidth: number
): ObservatoryPanelWidthConstraints {
  const availableWidth = Math.max(0, Number.isFinite(viewportWidth) ? viewportWidth : 0);
  const maximum = Math.min(
    OBSERVATORY_PANEL_MAX_WIDTH,
    Math.floor(availableWidth * OBSERVATORY_GRAPH_MINIMUM_FRACTION)
  );

  return {
    minimum: Math.min(OBSERVATORY_PANEL_MIN_WIDTH, maximum),
    maximum,
  };
}

export function clampObservatoryPanelWidth(
  width: number,
  constraints: ObservatoryPanelWidthConstraints
): number {
  const safeWidth = Number.isFinite(width) ? width : constraints.minimum;
  return Math.round(Math.max(constraints.minimum, Math.min(constraints.maximum, safeWidth)));
}

export function getDefaultObservatoryPanelWidth(viewportWidth: number): number {
  return clampObservatoryPanelWidth(
    OBSERVATORY_PANEL_DEFAULT_WIDTH,
    getObservatoryPanelWidthConstraints(viewportWidth)
  );
}

export function getObservatoryPanelWidthForPointerMove(
  startWidth: number,
  startX: number,
  currentX: number,
  constraints: ObservatoryPanelWidthConstraints
): number {
  // The separator sits on a right-docked panel's left edge: moving it left widens the panel.
  return clampObservatoryPanelWidth(startWidth - (currentX - startX), constraints);
}

export function getObservatoryPanelWidthForKeyboardInput(
  currentWidth: number,
  key: string,
  useLargeStep: boolean,
  constraints: ObservatoryPanelWidthConstraints
): number | null {
  if (key === "Home") return constraints.minimum;
  if (key === "End") return constraints.maximum;

  const step = useLargeStep ? OBSERVATORY_RESIZE_LARGE_STEP : OBSERVATORY_RESIZE_STEP;
  if (key === "ArrowLeft") return clampObservatoryPanelWidth(currentWidth + step, constraints);
  if (key === "ArrowRight") return clampObservatoryPanelWidth(currentWidth - step, constraints);

  return null;
}
