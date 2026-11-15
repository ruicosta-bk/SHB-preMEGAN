import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import type { EnemyBase } from '../src/enemies/EnemyBase';
import type { ProjectilePool } from '../src/combat/ProjectilePool';
import { TurretEntity, selectNearestLivingEnemy } from '../src/player/TurretEntity';
import { events } from '../src/core/EventBus';

interface MockSprite {
  x: number;
  y: number;
  texture: string;
  depth: number;
  rotation: number;
  destroyCount: number;
  setDepth(d: number): MockSprite;
  setRotation(rad: number): MockSprite;
  destroy(): void;
}

interface MockGraphics {
  depth: number;
  clearCount: number;
  destroyCount: number;
  setDepth(d: number): MockGraphics;
  clear(): MockGraphics;
  lineStyle(..._args: unknown[]): MockGraphics;
  strokeCircle(..._args: unknown[]): MockGraphics;
  beginPath(): MockGraphics;
  arc(..._args: unknown[]): MockGraphics;
  strokePath(): MockGraphics;
  destroy(): void;
}

function createMockScene() {
  const sprites: MockSprite[] = [];
  const graphics: MockGraphics[] = [];

  const scene = {
    add: {
      sprite(x: number, y: number, texture: string): MockSprite {
        const spr: MockSprite = {
          x,
          y,
          texture,
          depth: 0,
          rotation: 0,
          destroyCount: 0,
          setDepth(d: number) {
            this.depth = d;
            return this;
          },
          setRotation(rad: number) {
            this.rotation = rad;
            return this;
          },
          destroy() {
            this.destroyCount++;
          }
        };
        sprites.push(spr);
        return spr;
      },
      graphics(): MockGraphics {
        const gfx: MockGraphics = {
          depth: 0,
          clearCount: 0,
          destroyCount: 0,
          setDepth(d: number) {
            this.depth = d;
            return this;
          },
          clear() {
            this.clearCount++;
            return this;
          },
          lineStyle() {
            return this;
          },
          strokeCircle() {
            return this;
          },
          beginPath() {
            return this;
          },
          arc() {
            return this;
          },
          strokePath() {
            return this;
          },
          destroy() {
            this.destroyCount++;
          }
        };
        graphics.push(gfx);
        return gfx;
      }
    }
  } as unknown as Phaser.Scene;

  return { scene, sprites, graphics };
}

describe('TurretEntity & selectNearestLivingEnemy', () => {
  beforeEach(() => {
    events.clear();
  });

  it('returns null when enemy list is empty', () => {
    expect(selectNearestLivingEnemy(100, 100, [], 330)).toBeNull();
  });

  it('skips dead enemies even if they are closer', () => {
    const deadNear = { id: 'dead', isDead: true, x: 110, y: 100 };
    const aliveFar = { id: 'alive', isDead: false, x: 250, y: 100 };

    const picked = selectNearestLivingEnemy(100, 100, [deadNear, aliveFar], 330);
    expect(picked).toBe(aliveFar);
  });

  it('skips living enemies outside maxRange and includes boundary targets', () => {
    const outOfRange = { id: 'far', isDead: false, x: 431, y: 100 };
    expect(selectNearestLivingEnemy(100, 100, [outOfRange], 330)).toBeNull();

    const onBoundary = { id: 'edge', isDead: false, x: 430, y: 100 };
    expect(selectNearestLivingEnemy(100, 100, [onBoundary], 330)).toBe(onBoundary);
  });

  it('chooses the nearest living enemy among multiple candidates', () => {
    const candidates = [
      { id: 'far', isDead: false, x: 300, y: 100 },
      { id: 'dead-closest', isDead: true, x: 105, y: 100 },
      { id: 'nearest', isDead: false, x: 100, y: 160 },
      { id: 'mid', isDead: false, x: 220, y: 100 }
    ];

    const picked = selectNearestLivingEnemy(100, 100, candidates, 330);
    expect(picked?.id).toBe('nearest');
  });

  it('aims, fires bullet_turret on cadence, expires with explosion, and destroys idempotently', () => {
    const { scene, sprites, graphics } = createMockScene();
    const spawned: Array<Record<string, unknown>> = [];
    const mockPool = {
      spawn: vi.fn((cfg: Record<string, unknown>) => {
        spawned.push(cfg);
        return null;
      })
    } as unknown as ProjectilePool;

    const explosionSpy = vi.fn();
    events.on('combat:explosion', explosionSpy);

    const turret = new TurretEntity(scene, 100, 200, 0.5);
    expect(turret.isExpired).toBe(false);
    expect(sprites.map(s => [s.texture, s.depth])).toEqual([
      ['turret_base', 8],
      ['turret_gun', 11]
    ]);
    expect(graphics[0].depth).toBe(6);

    const target = { isDead: false, x: 100, y: 300 } as unknown as EnemyBase;

    // First update fires immediately and rotates gun toward +90deg (PI / 2)
    turret.update(0.1, [target], mockPool);
    expect(sprites[1].rotation).toBeCloseTo(Math.PI / 2, 5);
    expect(spawned).toHaveLength(1);
    expect(spawned[0]).toMatchObject({
      damage: 4,
      isPlayer: true,
      texture: 'bullet_turret',
      range: 420
    });

    // Within 0.26s cooldown: does not fire again yet
    turret.update(0.15, [target], mockPool);
    expect(spawned).toHaveLength(1);

    // Past 0.26s cooldown: fires second shot
    turret.update(0.12, [target], mockPool);
    expect(spawned).toHaveLength(2);

    // Remaining lifetime expires (0.5 - 0.1 - 0.15 - 0.12 = 0.13 left)
    turret.update(0.2, [target], mockPool);
    expect(turret.isExpired).toBe(true);
    expect(explosionSpy).toHaveBeenCalledWith({ x: 100, y: 200, radius: 48, damage: 8 });
    expect(sprites[0].destroyCount).toBe(1);
    expect(sprites[1].destroyCount).toBe(1);
    expect(graphics[0].destroyCount).toBe(1);

    // Idempotent destroy & post-expiry update safety
    turret.destroy();
    turret.update(0.1, [target], mockPool);
    expect(sprites[0].destroyCount).toBe(1);
    expect(sprites[1].destroyCount).toBe(1);
    expect(graphics[0].destroyCount).toBe(1);
    expect(spawned).toHaveLength(2);
  });
});
