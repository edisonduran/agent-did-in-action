import { describe, it, expect } from 'vitest';
import { gridToScreen, screenToGrid, type IsoConfig } from '../src/scene/isometric';

const CFG: IsoConfig = { tileWidth: 64, originX: 400, originY: 300 };

describe('isometric projection', () => {
  it('places origin (0,0) at the configured screen origin', () => {
    expect(gridToScreen({ gx: 0, gy: 0 }, CFG)).toEqual({ x: 400, y: 300 });
  });

  it('moving +gx goes right and down (isometric east)', () => {
    const p = gridToScreen({ gx: 1, gy: 0 }, CFG);
    expect(p.x).toBeGreaterThan(400);
    expect(p.y).toBeGreaterThan(300);
  });

  it('moving +gy goes left and down (isometric south)', () => {
    const p = gridToScreen({ gx: 0, gy: 1 }, CFG);
    expect(p.x).toBeLessThan(400);
    expect(p.y).toBeGreaterThan(300);
  });

  it('roundtrips screen <-> grid for several integer points', () => {
    for (const gx of [0, 1, 3, 5, 7]) {
      for (const gy of [0, 2, 4, 6]) {
        const screen = gridToScreen({ gx, gy }, CFG);
        const back = screenToGrid(screen, CFG);
        expect(back.gx).toBeCloseTo(gx, 5);
        expect(back.gy).toBeCloseTo(gy, 5);
      }
    }
  });
});
