/**
 * PixiScene — owns the PixiJS Application, the isometric tile floor,
 * the agent sprite layer, and the resize logic.
 *
 * This is a Day 2 deliverable: it can stand up a canvas, draw a
 * tile grid, load and place 3 sprites at fixed grid positions.
 * Day 3 will wire it to the SimulationEngine event bus.
 */

import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
} from 'pixi.js';
import { gridToScreen, type GridPoint, type IsoConfig } from './isometric';

export interface PlacedAgent {
  id: string;
  spriteUrl: string;
  position: GridPoint;
  label: string;
}

const GRID_SIZE = 8; // 8x8 tiles
const TILE_WIDTH = 96; // px
const TILE_COLOR_A = 0x1f2a37;
const TILE_COLOR_B = 0x141c25;

export class PixiScene {
  private app: Application;
  private root = new Container();
  private floor = new Container();
  private agentLayer = new Container();
  private isoConfig: IsoConfig = {
    tileWidth: TILE_WIDTH,
    originX: 0,
    originY: 0,
  };
  private resizeHandler: () => void;

  constructor(private parent: HTMLElement) {
    this.app = new Application();
    this.resizeHandler = () => this.handleResize();
  }

  async init(): Promise<void> {
    await this.app.init({
      background: 0x0b0f14,
      resizeTo: this.parent,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.parent.appendChild(this.app.canvas);
    this.app.stage.addChild(this.root);
    this.root.addChild(this.floor);
    this.root.addChild(this.agentLayer);

    this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
    this.drawFloor();
  }

  destroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.app.destroy(true, { children: true });
  }

  async placeAgents(agents: PlacedAgent[]): Promise<void> {
    this.agentLayer.removeChildren();
    for (const agent of agents) {
      const texture = await Assets.load(agent.spriteUrl);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 1);
      const pos = gridToScreen(agent.position, this.isoConfig);
      sprite.position.set(pos.x, pos.y);
      this.agentLayer.addChild(sprite);

      const label = new Text({
        text: agent.label,
        style: new TextStyle({
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          fill: 0xe5e7eb,
          stroke: { color: 0x000000, width: 3 },
        }),
      });
      label.anchor.set(0.5, 0);
      label.position.set(pos.x, pos.y + 4);
      this.agentLayer.addChild(label);
    }
    this.depthSort();
  }

  private depthSort(): void {
    // Painter's algorithm: bigger y renders on top
    this.agentLayer.children.sort((a, b) => a.y - b.y);
  }

  private handleResize(): void {
    const w = this.parent.clientWidth || 800;
    const h = this.parent.clientHeight || 600;
    this.isoConfig = {
      tileWidth: TILE_WIDTH,
      originX: w / 2,
      originY: h / 2 - (GRID_SIZE * TILE_WIDTH) / 8,
    };
    this.drawFloor();
  }

  private drawFloor(): void {
    this.floor.removeChildren();
    const g = new Graphics();
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_WIDTH / 4;
    for (let gx = 0; gx < GRID_SIZE; gx += 1) {
      for (let gy = 0; gy < GRID_SIZE; gy += 1) {
        const p = gridToScreen({ gx, gy }, this.isoConfig);
        const color = (gx + gy) % 2 === 0 ? TILE_COLOR_A : TILE_COLOR_B;
        g.poly([
          p.x, p.y - halfH,
          p.x + halfW, p.y,
          p.x, p.y + halfH,
          p.x - halfW, p.y,
        ]).fill(color).stroke({ color: 0x0b0f14, width: 1 });
      }
    }
    this.floor.addChild(g);
  }
}
