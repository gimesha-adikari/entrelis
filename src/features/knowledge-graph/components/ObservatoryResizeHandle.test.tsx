import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ObservatoryResizeHandle from "./ObservatoryResizeHandle";

const constraints = { minimum: 360, maximum: 600 };

describe("ObservatoryResizeHandle", () => {
  const onWidthChange = vi.fn();
  const capturedPointers = new Set<number>();

  beforeEach(() => {
    onWidthChange.mockReset();
    capturedPointers.clear();
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(function (this: HTMLElement, pointerId: number) {
        capturedPointers.add(pointerId);
      }),
    });
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn((pointerId: number) => capturedPointers.has(pointerId)),
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(function (this: HTMLElement, pointerId: number) {
        capturedPointers.delete(pointerId);
        this.dispatchEvent(new Event("lostpointercapture"));
      }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderHandle() {
    return render(
      <ObservatoryResizeHandle
        value={470}
        constraints={constraints}
        panelId="concept-details-panel"
        onWidthChange={onWidthChange}
      />
    );
  }

  it("exposes an adjustable vertical separator with the current width", () => {
    renderHandle();

    const handle = screen.getByRole("separator", { name: "Resize knowledge panel" });
    expect(handle.getAttribute("aria-orientation")).toBe("vertical");
    expect(handle.getAttribute("aria-controls")).toBe("concept-details-panel");
    expect(handle.getAttribute("aria-valuemin")).toBe("360");
    expect(handle.getAttribute("aria-valuemax")).toBe("600");
    expect(handle.getAttribute("aria-valuenow")).toBe("470");
    expect(handle.getAttribute("aria-valuetext")).toBe("470 pixels wide");
    expect(handle.getAttribute("tabindex")).toBe("0");
  });

  it("captures pointer movement and widens as the left edge moves left", () => {
    renderHandle();
    const handle = screen.getByRole("separator", { name: "Resize knowledge panel" });

    fireEvent.pointerDown(handle, {
      pointerId: 4,
      pointerType: "mouse",
      button: 0,
      isPrimary: true,
      clientX: 600,
    });
    fireEvent.pointerMove(handle, { pointerId: 4, pointerType: "mouse", buttons: 1, clientX: 540 });
    expect(onWidthChange).toHaveBeenLastCalledWith(530);

    fireEvent.pointerUp(handle, { pointerId: 4, pointerType: "mouse", button: 0, clientX: 540 });
    expect(HTMLElement.prototype.setPointerCapture).toHaveBeenCalledWith(4);
    expect(HTMLElement.prototype.releasePointerCapture).toHaveBeenCalledWith(4);
    expect(capturedPointers.size).toBe(0);
  });

  it("restores the starting width when pointer movement is cancelled", () => {
    renderHandle();
    const handle = screen.getByRole("separator", { name: "Resize knowledge panel" });

    fireEvent.pointerDown(handle, { pointerId: 2, button: 0, isPrimary: true, clientX: 500 });
    fireEvent.pointerMove(handle, { pointerId: 2, buttons: 1, clientX: 450 });
    fireEvent.pointerCancel(handle, { pointerId: 2 });

    expect(onWidthChange.mock.calls.map(([width]) => width)).toEqual([520, 470]);
    expect(capturedPointers.size).toBe(0);
  });

  it("restores the starting width and cleans up on window blur", () => {
    renderHandle();
    const handle = screen.getByRole("separator", { name: "Resize knowledge panel" });

    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, isPrimary: true, clientX: 500 });
    fireEvent.pointerMove(handle, { pointerId: 1, buttons: 1, clientX: 450 });
    fireEvent(window, new Event("blur"));

    expect(onWidthChange.mock.calls.map(([width]) => width)).toEqual([520, 470]);
    expect(capturedPointers.size).toBe(0);
    fireEvent(window, new Event("blur"));
    expect(onWidthChange).toHaveBeenCalledTimes(2);
  });

  it("cancels an active drag and restores its width when unmounted", () => {
    const { unmount } = renderHandle();
    const handle = screen.getByRole("separator", { name: "Resize knowledge panel" });

    fireEvent.pointerDown(handle, { pointerId: 8, button: 0, isPrimary: true, clientX: 500 });
    fireEvent.pointerMove(handle, { pointerId: 8, buttons: 1, clientX: 450 });
    unmount();

    expect(onWidthChange.mock.calls.map(([width]) => width)).toEqual([520, 470]);
  });

  it("resizes with arrow keys and offers minimum and maximum shortcuts", () => {
    renderHandle();
    const handle = screen.getByRole("separator", { name: "Resize knowledge panel" });

    handle.focus();
    expect(document.activeElement).toBe(handle);
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(handle, { key: "Home" });
    fireEvent.keyDown(handle, { key: "End" });

    expect(onWidthChange.mock.calls.map(([width]) => width)).toEqual([486, 406, 360, 600]);
  });
});
