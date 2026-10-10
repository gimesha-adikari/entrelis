import { describe, expect, it } from "vitest";
import {
  getDefaultObservatoryPanelWidth,
  getObservatoryPanelWidthConstraints,
  getObservatoryPanelWidthForKeyboardInput,
  getObservatoryPanelWidthForPointerMove,
} from "./observatory-layout";

describe("Observatory panel width rules", () => {
  it("uses the approved desktop default and bounds", () => {
    expect(getObservatoryPanelWidthConstraints(1440)).toEqual({
      minimum: 360,
      maximum: 600,
    });
    expect(getDefaultObservatoryPanelWidth(1440)).toBe(470);
  });

  it("leaves at least half the desktop viewport for the universe", () => {
    expect(getObservatoryPanelWidthConstraints(1024)).toEqual({
      minimum: 360,
      maximum: 512,
    });
    expect(getObservatoryPanelWidthConstraints(769)).toEqual({
      minimum: 360,
      maximum: 384,
    });
    expect(getDefaultObservatoryPanelWidth(769)).toBe(384);
  });

  it("clamps to available space when 360 pixels is not available", () => {
    expect(getObservatoryPanelWidthConstraints(640)).toEqual({
      minimum: 320,
      maximum: 320,
    });
  });

  it("widens when the pointer moves left and clamps at both limits", () => {
    const constraints = { minimum: 360, maximum: 600 };

    expect(getObservatoryPanelWidthForPointerMove(470, 900, 830, constraints)).toBe(540);
    expect(getObservatoryPanelWidthForPointerMove(470, 900, 1200, constraints)).toBe(360);
    expect(getObservatoryPanelWidthForPointerMove(470, 900, 700, constraints)).toBe(600);
  });

  it("maps arrow and Home/End keys to the edge movement", () => {
    const constraints = { minimum: 360, maximum: 600 };

    expect(getObservatoryPanelWidthForKeyboardInput(470, "ArrowLeft", false, constraints)).toBe(
      486
    );
    expect(getObservatoryPanelWidthForKeyboardInput(470, "ArrowRight", false, constraints)).toBe(
      454
    );
    expect(getObservatoryPanelWidthForKeyboardInput(470, "Home", false, constraints)).toBe(360);
    expect(getObservatoryPanelWidthForKeyboardInput(470, "End", false, constraints)).toBe(600);
    expect(getObservatoryPanelWidthForKeyboardInput(470, "ArrowLeft", true, constraints)).toBe(534);
    expect(getObservatoryPanelWidthForKeyboardInput(590, "ArrowLeft", false, constraints)).toBe(
      600
    );
    expect(getObservatoryPanelWidthForKeyboardInput(470, "PageUp", false, constraints)).toBeNull();
  });
});
