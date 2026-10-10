import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductionCelestialLayer from "./ProductionCelestialLayer";

describe("ProductionCelestialLayer", () => {
  it("reports Canvas fallback when WebGL renderer creation is unavailable", async () => {
    const onRendererAvailabilityChange = vi.fn();
    const { unmount } = render(
      <ProductionCelestialLayer onRendererAvailabilityChange={onRendererAvailabilityChange} />
    );

    await waitFor(() => {
      expect(onRendererAvailabilityChange).toHaveBeenCalledWith(false);
    });
    unmount();
  });
});
