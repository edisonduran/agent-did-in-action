/**
 * PixiScene — owns the PixiJS Application, the isometric tile floor,
 * the agent sprite layer, and the FX layer (connection lines + badges).
 *
 * In Day 3 it grows two new responsibilities:
 *   - `moveAgent(id, target, durationMs)` smoothly animates a sprite
 *     between grid tiles (lerp on the ticker).
 *   - `flashLink(fromId, toId, kind)` draws a momentary line between
 *     two agents in green (verified) or red (blocked), plus a badge.
 *
 * The renderer is intentionally dumb: scenarios call these methods
 * via the SimulationEngine's event bus.
 */

import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Ticker,
} from 'pixi.js';
import { gridToScreen, type GridPoint, type IsoConfig } from './isometric';

export interface PlacedAgent {
  id: string;
  spriteUrl: string;
  position: GridPoint;
  label: string;
}

const GRID_SIZE = 8;
const TILE_WIDTH = 96;
const TILE_COLOR_A = 0x1f2a37;
const TILE_COLOR_B = 0x141c25;

interface AgentNode {
  sprite: Sprite;
  label: Text;
  current: GridPoint;
  target: GridPoint;
  travel: { startMs: number; durationMs: number; from: GridPoint } | null;
  shake: { startMs: number; durationMs: number } | null;
}

export class PixiScene {
  private app: Application;
  private root = new Container();
  private floor = new Container();
  private fxLayer = new Container();
  private agentLayer = new Container();
  private agents = new Map<string, AgentNode>();
  private isoConfig: IsoConfig = {
    tileWidth: TILE_WIDTH,
    originX: 0,
    originY: 0,
  };
  private resizeHandler: () => void;
  private elapsedMs = 0;
  private tickHandler = (ticker: Ticker) => this.onTick(ticker);

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
    this.root.addChild(this.fxLayer);
    this.root.addChild(this.agentLayer);

    this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
    this.drawFloor();
    this.app.ticker.add(this.tickHandler);
  }

  destroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.app.ticker.remove(this.tickHandler);
    this.app.destroy(true, { children: true });
  }

  async placeAgents(agents: PlacedAgent[]): Promise<void> {
    this.agentLayer.removeChildren();
    this.agents.clear();
    for (const agent of agents) {
      const texture = await Assets.load(agent.spriteUrl);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 1);
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
      this.agentLayer.addChild(label);

      const node: AgentNode = {
        sprite,
        label,
        current: { ...agent.position },
        target: { ...agent.position },
        travel: null,
        shake: null,
      };
      this.agents.set(agent.id, node);
      this.applyNodePosition(node);
    }
    this.depthSort();
  }

  /** Animate an agent from its current cell to a new cell. */
  moveAgent(id: string, target: GridPoint, durationMs = 1200): void {
    const node = this.agents.get(id);
    if (!node) return;
    node.travel = {
      startMs: this.elapsedMs,
      durationMs,
      from: { ...node.current },
    };
    node.target = { ...target };
  }

  /** Make an agent shake horizontally for a short window — used on block. */
  shakeAgent(id: string, durationMs = 600): void {
    const node = this.agents.get(id);
    if (!node) return;
    node.shake = { startMs: this.elapsedMs, durationMs };
  }

  /** Flash a colored line + badge between two agents for ~1.2s. */
  flashLink(fromId: string, toId: string, kind: 'verify' | 'block' | 'sign'): void {
    const a = this.agents.get(fromId);
    const b = this.agents.get(toId);
    if (!a || !b) return;
    const aPos = gridToScreen(a.current, this.isoConfig);
    const bPos = gridToScreen(b.current, this.isoConfig);

    const color = kind === 'verify' ? 0x22c55e : kind === 'block' ? 0xef4444 : 0x22d3ee;
    const fx = new Container();
    const line = new Graphics()
      .moveTo(aPos.x, aPos.y - 32)
      .lineTo(bPos.x, bPos.y - 32)
      .stroke({ color, width: 3, alpha: 0.9 });
    fx.addChild(line);

    const midX = (aPos.x + bPos.x) / 2;
    const midY = (aPos.y + bPos.y) / 2 - 40;
    const badge = new Graphics().circle(midX, midY, 14).fill(color);
    fx.addChild(badge);
    const badgeText = new Text({
      text: kind === 'verify' ? '\u2713' : kind === 'block' ? '\u2717' : '\u270D',
      style: new TextStyle({
        fontFamily: 'system-ui, sans-serif',
        fontSize: 18,
        fill: 0x0b0f14,
        fontWeight: 'bold',
      }),
    });
    badgeText.anchor.set(0.5);
    badgeText.position.set(midX, midY);
    fx.addChild(badgeText);

    this.fxLayer.addChild(fx);
    const startMs = this.elapsedMs;
    const lifetime = 1300;
    const fadeFn = (ticker: Ticker) => {
      const age = this.elapsedMs - startMs;
      const t = age / lifetime;
      if (t >= 1) {
        this.fxLayer.removeChild(fx);
        fx.destroy({ children: true });
        this.app.ticker.remove(fadeFn);
        return;
      }
      fx.alpha = 1 - t;
      void ticker;
    };
    this.app.ticker.add(fadeFn);
  }

  private onTick(ticker: Ticker): void {
    this.elapsedMs += ticker.deltaMS;
    let dirty = false;
    for (const node of this.agents.values()) {
      if (node.travel) {
        const age = this.elapsedMs - node.travel.startMs;
        const t = Math.min(1, age / node.travel.durationMs);
        const eased = easeInOut(t);
        node.current = {
          gx: node.travel.from.gx + (node.target.gx - node.travel.from.gx) * eased,
          gy: node.travel.from.gy + (node.target.gy - node.travel.from.gy) * eased,
        };
        dirty = true;
        if (t >= 1) {
          node.current = { ...node.target };
          node.travel = null;
        }
      }
      this.applyNodePosition(node);
      if (node.shake) {
        const age = this.elapsedMs - node.shake.startMs;
        if (age >= node.shake.durationMs) {
          node.shake = null;
        }
      }
    }
    if (dirty) this.depthSort();
  }

  private applyNodePosition(node: AgentNode): void {
    const screen = gridToScreen(node.current, this.isoConfig);
    let dx = 0;
    let tint = 0xffffff;
    if (node.shake) {
      const age = this.elapsedMs - node.shake.startMs;
      const t = Math.min(1, age / node.shake.durationMs);
      const decay = 1 - t;
      dx = Math.sin(age / 30) * 6 * decay;
      tint = 0xffaaaa;
    }
    node.sprite.tint = tint;
    node.sprite.position.set(screen.x + dx, screen.y);
    node.label.position.set(screen.x + dx, screen.y + 4);
  }

  private depthSort(): void {
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
    for (const node of this.agents.values()) this.applyNodePosition(node);
    this.depthSort();
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

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
