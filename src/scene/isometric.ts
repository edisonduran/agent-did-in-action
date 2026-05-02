/**
 * Isometric projection helpers.
 *
 * The world is a 2D grid (gridX, gridY); the camera projects each
 * cell to screen space using a 2:1 ratio diamond (classic isometric).
 *
 * Pure functions — fully unit-testable, no Pixi dependency.
 */

export interface GridPoint {
  gx: number;
  gy: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface IsoConfig {
  /** Width of one tile in screen pixels. Height is half of this (2:1). */
  tileWidth: number;
  /** Pixel offset for the (0,0) tile so the world is centered on canvas. */
  originX: number;
  originY: number;
}

export function gridToScreen(point: GridPoint, cfg: IsoConfig): ScreenPoint {
  const halfW = cfg.tileWidth / 2;
  const halfH = cfg.tileWidth / 4; // 2:1 ratio
  return {
    x: cfg.originX + (point.gx - point.gy) * halfW,
    y: cfg.originY + (point.gx + point.gy) * halfH,
  };
}

export function screenToGrid(point: ScreenPoint, cfg: IsoConfig): GridPoint {
  const dx = point.x - cfg.originX;
  const dy = point.y - cfg.originY;
  const halfW = cfg.tileWidth / 2;
  const halfH = cfg.tileWidth / 4;
  return {
    gx: (dx / halfW + dy / halfH) / 2,
    gy: (dy / halfH - dx / halfW) / 2,
  };
}
