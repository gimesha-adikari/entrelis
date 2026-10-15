/**
 * High-resolution diagnostic telemetry for celestial transitions and rendering subsystems.
 * Distinguishes procedural texture generation, body construction, shader preparation,
 * ring mask creation, scene layout, and WebGL rendering.
 */

export interface SubsystemTiming {
  count: number;
  totalMs: number;
  maxMs: number;
}

export interface TextureDiagnosticStats {
  generations: number;
  totalMs: number;
  maxMs: number;
  byArchetype: Record<string, SubsystemTiming>;
  cacheHits: number;
  cacheMisses: number;
  evictions: number;
  activeCacheSize: number;
}

export class CelestialDiagnosticsCollector {
  private textureGenerations = 0;
  private textureTotalMs = 0;
  private textureMaxMs = 0;
  private textureByArchetype: Record<string, SubsystemTiming> = {};
  private textureCacheHits = 0;
  private textureCacheMisses = 0;
  private textureEvictions = 0;
  private activeCacheSize = 0;

  private bodyConstructionCount = 0;
  private bodyConstructionTotalMs = 0;
  private bodyConstructionMaxMs = 0;

  private sceneLayoutCount = 0;
  private sceneLayoutTotalMs = 0;
  private sceneLayoutMaxMs = 0;

  public recordTextureHit(): void {
    this.textureCacheHits += 1;
  }

  public recordTextureMiss(): void {
    this.textureCacheMisses += 1;
  }

  public recordTextureEviction(count = 1): void {
    this.textureEvictions += count;
  }

  public setActiveCacheSize(size: number): void {
    this.activeCacheSize = size;
  }

  public recordTextureGeneration(archetype: string, durationMs: number): void {
    this.textureGenerations += 1;
    this.textureTotalMs += durationMs;
    this.textureMaxMs = Math.max(this.textureMaxMs, durationMs);

    const arch = this.textureByArchetype[archetype] ?? { count: 0, totalMs: 0, maxMs: 0 };
    arch.count += 1;
    arch.totalMs += durationMs;
    arch.maxMs = Math.max(arch.maxMs, durationMs);
    this.textureByArchetype[archetype] = arch;
  }

  public recordBodyConstruction(pureConstructionMs: number): void {
    this.bodyConstructionCount += 1;
    this.bodyConstructionTotalMs += pureConstructionMs;
    this.bodyConstructionMaxMs = Math.max(this.bodyConstructionMaxMs, pureConstructionMs);
  }

  public recordSceneLayout(durationMs: number): void {
    this.sceneLayoutCount += 1;
    this.sceneLayoutTotalMs += durationMs;
    this.sceneLayoutMaxMs = Math.max(this.sceneLayoutMaxMs, durationMs);
  }

  public getTextureStats(): TextureDiagnosticStats {
    return {
      generations: this.textureGenerations,
      totalMs: this.textureTotalMs,
      maxMs: this.textureMaxMs,
      byArchetype: { ...this.textureByArchetype },
      cacheHits: this.textureCacheHits,
      cacheMisses: this.textureCacheMisses,
      evictions: this.textureEvictions,
      activeCacheSize: this.activeCacheSize,
    };
  }

  public getBodyConstructionStats(): SubsystemTiming {
    return {
      count: this.bodyConstructionCount,
      totalMs: this.bodyConstructionTotalMs,
      maxMs: this.bodyConstructionMaxMs,
    };
  }

  public getSceneLayoutStats(): SubsystemTiming {
    return {
      count: this.sceneLayoutCount,
      totalMs: this.sceneLayoutTotalMs,
      maxMs: this.sceneLayoutMaxMs,
    };
  }

  public reset(): void {
    this.textureGenerations = 0;
    this.textureTotalMs = 0;
    this.textureMaxMs = 0;
    this.textureByArchetype = {};
    this.textureCacheHits = 0;
    this.textureCacheMisses = 0;
    this.textureEvictions = 0;
    this.bodyConstructionCount = 0;
    this.bodyConstructionTotalMs = 0;
    this.bodyConstructionMaxMs = 0;
    this.sceneLayoutCount = 0;
    this.sceneLayoutTotalMs = 0;
    this.sceneLayoutMaxMs = 0;
  }
}

export const celestialDiagnostics = new CelestialDiagnosticsCollector();

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__CELESTIAL_DIAGNOSTICS__ = celestialDiagnostics;
}
