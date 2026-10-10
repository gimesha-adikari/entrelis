import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { ObservatoryPanelWidthConstraints } from "./observatory-layout";
import {
  getObservatoryPanelWidthForKeyboardInput,
  getObservatoryPanelWidthForPointerMove,
} from "./observatory-layout";
import styles from "./KnowledgeGraph.module.css";

interface Props {
  readonly value: number;
  readonly constraints: ObservatoryPanelWidthConstraints;
  readonly panelId: string;
  readonly onWidthChange: (width: number) => void;
}

interface ActiveDrag {
  readonly pointerId: number;
  readonly startX: number;
  readonly startWidth: number;
  readonly element: HTMLDivElement;
  readonly handleWindowBlur: () => void;
}

export default function ObservatoryResizeHandle({
  value,
  constraints,
  panelId,
  onWidthChange,
}: Props) {
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const onWidthChangeRef = useRef(onWidthChange);

  useEffect(() => {
    onWidthChangeRef.current = onWidthChange;
  }, [onWidthChange]);

  const finishDrag = useCallback((commit: boolean) => {
    const drag = activeDragRef.current;
    if (!drag) return;

    activeDragRef.current = null;
    window.removeEventListener("blur", drag.handleWindowBlur);

    if (!commit) onWidthChangeRef.current(drag.startWidth);

    if (
      drag.element.hasPointerCapture &&
      drag.element.releasePointerCapture &&
      drag.element.hasPointerCapture(drag.pointerId)
    ) {
      drag.element.releasePointerCapture(drag.pointerId);
    }
  }, []);

  const cancelOnWindowBlur = useCallback(() => finishDrag(false), [finishDrag]);

  useEffect(
    () => () => {
      finishDrag(false);
    },
    [finishDrag]
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.isPrimary === false) return;

    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });

    const drag: ActiveDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: value,
      element: event.currentTarget,
      handleWindowBlur: cancelOnWindowBlur,
    };
    activeDragRef.current = drag;
    window.addEventListener("blur", drag.handleWindowBlur);

    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = activeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    onWidthChangeRef.current(
      getObservatoryPanelWidthForPointerMove(
        drag.startWidth,
        drag.startX,
        event.clientX,
        constraints
      )
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (activeDragRef.current?.pointerId !== event.pointerId) return;

    event.preventDefault();
    finishDrag(true);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (activeDragRef.current?.pointerId !== event.pointerId) return;

    event.preventDefault();
    finishDrag(false);
  };

  const handleLostPointerCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (activeDragRef.current?.pointerId === event.pointerId) finishDrag(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nextWidth = getObservatoryPanelWidthForKeyboardInput(
      value,
      event.key,
      event.shiftKey,
      constraints
    );
    if (nextWidth === null) return;

    event.preventDefault();
    onWidthChangeRef.current(nextWidth);
  };

  return (
    <div
      className={styles.resizeHandle}
      role="separator"
      aria-label="Resize knowledge panel"
      aria-orientation="vertical"
      aria-controls={panelId}
      aria-valuemin={constraints.minimum}
      aria-valuemax={constraints.maximum}
      aria-valuenow={value}
      aria-valuetext={value + " pixels wide"}
      aria-keyshortcuts="ArrowLeft ArrowRight Home End"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
    />
  );
}
