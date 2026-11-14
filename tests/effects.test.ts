import { describe, it, expect } from 'vitest';
import type Phaser from 'phaser';
import {
  EffectsManager,
  DEFAULT_EFFECTS_POOL_CAP,
  STATUS_ELEMENT_COLORS
} from '../src/presentation/EffectsManager';

interface MockSprite {
  x: number;
  y: number;
  textureKey: string;
  tint: number | null;
  alpha: number;
  scale: number;
  flipX: boolean;
  rotation: number;
  depth: number;
  blendMode: number;
  active: boolean;
  visible: boolean;
  destroyed: boolean;
  setTexture(key: string): MockSprite;
  setPosition(x: number, y: number): MockSprite;
  setTint(color: number): MockSprite;
  clearTint(): MockSprite;
  setAlpha(alpha: number): MockSprite;
  setScale(scale: number): MockSprite;
  setFlipX(flip: boolean): MockSprite;
  setRotation(rad: number): MockSprite;
  setDepth(depth: number): MockSprite;
  setBlendMode(mode: number): MockSprite;
  setActive(active: boolean): MockSprite;
  setVisible(visible: boolean): MockSprite;
  destroy(): void;
}

function createMockPhaserScene() {
  const createdSprites: MockSprite[] = [];
  let destroyCount = 0;

  const scene = {
    add: {
      sprite(x: number, y: number, textureKey: string): MockSprite {
        const spr: MockSprite = {
          x,
          y,
          textureKey,
          tint: null,
          alpha: 1,
          scale: 1,
          flipX: false,
          rotation: 0,
          depth: 0,
          blendMode: 0,
          active: true,
          visible: true,
          destroyed: false,
          setTexture(key: string) {
            this.textureKey = key;
            return this;
          },
          setPosition(nx: number, ny: number) {
            this.x = nx;
            this.y = ny;
            return this;
          },
          setTint(color: number) {
            this.tint = color;
            return this;
          },
          clearTint() {
            this.tint = null;
            return this;
          },
          setAlpha(alpha: number) {
            this.alpha = alpha;
            return this;
          },
          setScale(scale: number) {
            this.scale = scale;
            return this;
          },
          setFlipX(flip: boolean) {
            this.flipX = flip;
            return this;
          },
          setRotation(rad: number) {
            this.rotation = rad;
            return this;
          },
          setDepth(depth: number) {
            this.depth = depth;
            return this;
          },
          setBlendMode(mode: number) {
            this.blendMode = mode;
            return this;
          },
          setActive(active: boolean) {
            this.active = active;
            return this;
          },
          setVisible(visible: boolean) {
            this.visible = visible;
            return this;
          },
          destroy() {
            this.destroyed = true;
            destroyCount++;
          }
        };
        createdSprites.push(spr);
        return spr;
      }
    }
  };

  return {
    scene: scene as unknown as Phaser.Scene,
    createdSprites,
    getDestroyCount: () => destroyCount
  };
}

describe('EffectsManager Pooled VFX Tests', () => {
  it('spawns hit sparks with spark_pixel texture and additive tint', () => {
    const mock = createMockPhaserScene();
    const fx = new EffectsManager(mock.scene);

    fx.spawnHitSparks(100, 200, 0x38bdf8, 6);

    expect(fx.getActiveCount()).toBe(6);
    expect(fx.getPoolSize()).toBe(6);
    expect(mock.createdSprites.length).toBe(6);
    expect(mock.createdSprites.every(s => s.textureKey === 'spark_pixel')).toBe(true);
    expect(mock.createdSprites.every(s => s.tint === 0x38bdf8)).toBe(true);
    expect(mock.createdSprites.every(s => s.blendMode === 1 && s.active && s.visible)).toBe(true);
  });

  it('spawns death burst with 10 radial sparks and 1 expanding glow_ring', () => {
    const mock = createMockPhaserScene();
    const fx = new EffectsManager(mock.scene);

    fx.spawnDeathBurst(320, 240, 0xf97316);

    expect(fx.getActiveCount()).toBe(11);
    const sparks = mock.createdSprites.filter(s => s.textureKey === 'spark_pixel');
    const rings = mock.createdSprites.filter(s => s.textureKey === 'glow_ring');
    expect(sparks.length).toBe(10);
    expect(rings.length).toBe(1);
    expect(rings[0].tint).toBe(0xf97316);
    expect(rings[0].scale).toBeCloseTo(0.35, 2);

    // Mid-lifetime update should expand ring and fade alpha
    fx.update(0.16);
    expect(rings[0].active).toBe(true);
    expect(rings[0].scale).toBeGreaterThan(0.9);
    expect(rings[0].alpha).toBeLessThan(0.9);
  });

  it('expires active effects back to inactive pool on update(deltaSec) without destroying sprites', () => {
    const mock = createMockPhaserScene();
    const fx = new EffectsManager(mock.scene);

    fx.spawnHitSparks(50, 50, 0xfacc15, 5);
    fx.spawnFootstepDust(60, 70);
    expect(fx.getActiveCount()).toBe(6);

    const dust = mock.createdSprites[5];
    expect(dust.textureKey).toBe('dust_puff');
    const startY = dust.y;
    fx.update(0.1);
    expect(dust.y).toBeLessThan(startY); // drifts upward

    // Advance past all lifetimes
    fx.update(0.5);
    expect(fx.getActiveCount()).toBe(0);
    expect(fx.getPoolSize()).toBe(6);
    expect(mock.getDestroyCount()).toBe(0);
    expect(mock.createdSprites.every(s => !s.active && !s.visible)).toBe(true);

    // Re-spawning reuses the existing 6 pool slots with zero new sprite allocations
    fx.spawnHitSparks(120, 120, 0xffffff, 5);
    expect(fx.getActiveCount()).toBe(5);
    expect(fx.getPoolSize()).toBe(6);
    expect(mock.createdSprites.length).toBe(6);
  });

  it('enforces fixed-cap pooling (default 96) with zero unbounded allocation', () => {
    const mock = createMockPhaserScene();
    const fx = new EffectsManager(mock.scene);

    expect(fx.getCapacity()).toBe(DEFAULT_EFFECTS_POOL_CAP);
    expect(DEFAULT_EFFECTS_POOL_CAP).toBe(96);

    // Spawn 200 sparks at once (exceeds 96 cap)
    fx.spawnHitSparks(0, 0, 0xef4444, 200);

    expect(mock.createdSprites.length).toBe(96);
    expect(fx.getPoolSize()).toBe(96);
    expect(fx.getActiveCount()).toBe(96);
    expect(fx.getMetrics().recycledCount).toBe(104);
    expect(mock.getDestroyCount()).toBe(0);
  });

  it('clears all active sprites cleanly via clearAll() and resets reused sprite state', () => {
    const mock = createMockPhaserScene();
    const fx = new EffectsManager(mock.scene);

    fx.spawnDashAfterimage(80, 90, 'knight_idle', true, 0x38bdf8);
    expect(fx.getActiveCount()).toBe(1);
    expect(mock.createdSprites[0].flipX).toBe(true);
    expect(mock.createdSprites[0].textureKey).toBe('knight_idle');

    fx.spawnStatusPop(100, 100, 'frost');
    expect(fx.getActiveCount()).toBe(6); // 1 afterimage + 1 glow_ring + 4 sparks
    expect(mock.createdSprites[1].tint).toBe(STATUS_ELEMENT_COLORS.frost);

    fx.clearAll();
    expect(fx.getActiveCount()).toBe(0);
    expect(fx.getPoolSize()).toBe(6);
    expect(mock.createdSprites.every(s => !s.active && !s.visible)).toBe(true);
    expect(mock.getDestroyCount()).toBe(0);

    // Reusing the first slot must reset flipX and textureKey
    fx.spawnHitSparks(10, 10, 0xfacc15, 1);
    expect(mock.createdSprites[0].textureKey).toBe('spark_pixel');
    expect(mock.createdSprites[0].flipX).toBe(false);
    expect(mock.createdSprites[0].blendMode).toBe(1);
  });
});
