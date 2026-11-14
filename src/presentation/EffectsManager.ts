import type Phaser from 'phaser';

export const DEFAULT_EFFECTS_POOL_CAP = 96;

export type StatusElement = 'fire' | 'frost' | 'lightning';

export const STATUS_ELEMENT_COLORS: Record<StatusElement, number> = {
  fire: 0xf97316,
  frost: 0x38bdf8,
  lightning: 0xfacc15
};

export interface EffectsPoolMetrics {
  activeCount: number;
  poolSize: number;
  capacity: number;
  recycledCount: number;
}

interface PooledEffect {
  sprite: Phaser.GameObjects.Sprite;
  active: boolean;
  vx: number;
  vy: number;
  drag: number;
  age: number;
  lifetime: number;
  startAlpha: number;
  endAlpha: number;
  startScale: number;
  endScale: number;
  rotationSpeed: number;
}

interface SpawnOptions {
  x: number;
  y: number;
  textureKey: string;
  tint: number;
  vx: number;
  vy: number;
  drag: number;
  lifetime: number;
  startAlpha: number;
  endAlpha: number;
  startScale: number;
  endScale: number;
  depth: number;
  additive: boolean;
  flipX?: boolean;
  rotation?: number;
  rotationSpeed?: number;
}

// Phaser.BlendModes numeric constants (avoid importing Phaser runtime at module load)
const BLEND_MODE_NORMAL = 0 as Phaser.BlendModes;
const BLEND_MODE_ADD = 1 as Phaser.BlendModes;

export class EffectsManager {
  private readonly scene: Phaser.Scene;
  private readonly capacity: number;
  private readonly pool: PooledEffect[] = [];
  private recycledCount = 0;

  constructor(scene: Phaser.Scene, capacity: number = DEFAULT_EFFECTS_POOL_CAP) {
    this.scene = scene;
    this.capacity = Math.max(1, Math.floor(capacity));
  }

  public spawnHitSparks(x: number, y: number, color: number, count: number = 5): void {
    const total = Math.max(0, Math.floor(count));
    for (let i = 0; i < total; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 75 + Math.random() * 115;
      this.spawn({
        x,
        y,
        textureKey: 'spark_pixel',
        tint: color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag: 4.5,
        lifetime: 0.16 + Math.random() * 0.1,
        startAlpha: 1,
        endAlpha: 0,
        startScale: 1.35,
        endScale: 0.25,
        depth: 18,
        additive: true,
        rotation: angle
      });
    }
  }

  public spawnDeathBurst(x: number, y: number, color: number): void {
    const sparkCount = 10;
    for (let i = 0; i < sparkCount; i++) {
      const baseAngle = (Math.PI * 2 * i) / sparkCount;
      const angle = baseAngle + (Math.random() - 0.5) * 0.25;
      const speed = 95 + Math.random() * 85;
      this.spawn({
        x,
        y,
        textureKey: 'spark_pixel',
        tint: color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag: 3.6,
        lifetime: 0.26 + Math.random() * 0.12,
        startAlpha: 1,
        endAlpha: 0,
        startScale: 1.6,
        endScale: 0.2,
        depth: 18,
        additive: true,
        rotation: angle
      });
    }

    this.spawn({
      x,
      y,
      textureKey: 'glow_ring',
      tint: color,
      vx: 0,
      vy: 0,
      drag: 0,
      lifetime: 0.32,
      startAlpha: 0.9,
      endAlpha: 0,
      startScale: 0.35,
      endScale: 1.85,
      depth: 17,
      additive: true
    });
  }

  public spawnFootstepDust(x: number, y: number, color: number = 0x94a3b8): void {
    this.spawn({
      x: x + (Math.random() - 0.5) * 6,
      y,
      textureKey: 'dust_puff',
      tint: color,
      vx: (Math.random() - 0.5) * 18,
      vy: -16 - Math.random() * 14,
      drag: 2.5,
      lifetime: 0.26,
      startAlpha: 0.48,
      endAlpha: 0,
      startScale: 0.55,
      endScale: 0.95,
      depth: 8,
      additive: false
    });
  }

  public spawnDashAfterimage(
    x: number,
    y: number,
    textureKey: string,
    flipX: boolean,
    tint: number
  ): void {
    this.spawn({
      x,
      y,
      textureKey,
      tint,
      vx: 0,
      vy: 0,
      drag: 0,
      lifetime: 0.18,
      startAlpha: 0.55,
      endAlpha: 0,
      startScale: 1,
      endScale: 0.94,
      depth: 9,
      additive: false,
      flipX
    });
  }

  public spawnStatusPop(x: number, y: number, element: StatusElement): void {
    const color = STATUS_ELEMENT_COLORS[element];

    this.spawn({
      x,
      y,
      textureKey: 'glow_ring',
      tint: color,
      vx: 0,
      vy: 0,
      drag: 0,
      lifetime: 0.28,
      startAlpha: 0.85,
      endAlpha: 0,
      startScale: 0.25,
      endScale: 1.25,
      depth: 18,
      additive: true
    });

    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4 + Math.PI * 0.25;
      const speed = 50 + Math.random() * 35;
      this.spawn({
        x,
        y,
        textureKey: 'spark_pixel',
        tint: color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 18,
        drag: 3.2,
        lifetime: 0.24,
        startAlpha: 0.95,
        endAlpha: 0,
        startScale: 1.25,
        endScale: 0.2,
        depth: 18,
        additive: true,
        rotation: angle
      });
    }
  }

  public update(deltaSec: number): void {
    if (deltaSec <= 0) return;

    for (let i = 0; i < this.pool.length; i++) {
      const item = this.pool[i];
      if (!item.active) continue;

      item.age += deltaSec;
      if (item.age >= item.lifetime) {
        this.deactivate(item);
        continue;
      }

      const sprite = item.sprite;
      if (item.vx !== 0 || item.vy !== 0) {
        sprite.setPosition(sprite.x + item.vx * deltaSec, sprite.y + item.vy * deltaSec);
        if (item.drag > 0) {
          const damping = Math.max(0, 1 - item.drag * deltaSec);
          item.vx *= damping;
          item.vy *= damping;
        }
      }

      const progress = Math.min(1, item.age / item.lifetime);
      sprite.setAlpha(item.startAlpha + (item.endAlpha - item.startAlpha) * progress);
      sprite.setScale(item.startScale + (item.endScale - item.startScale) * progress);

      if (item.rotationSpeed !== 0) {
        sprite.setRotation(sprite.rotation + item.rotationSpeed * deltaSec);
      }
    }
  }

  public clearAll(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.deactivate(this.pool[i]);
    }
  }

  public getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) count++;
    }
    return count;
  }

  public getPoolSize(): number {
    return this.pool.length;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getMetrics(): EffectsPoolMetrics {
    return {
      activeCount: this.getActiveCount(),
      poolSize: this.pool.length,
      capacity: this.capacity,
      recycledCount: this.recycledCount
    };
  }

  private spawn(opts: SpawnOptions): void {
    const slot = this.acquireSlot(opts.x, opts.y, opts.textureKey);
    if (!slot) return;

    slot.active = true;
    slot.vx = opts.vx;
    slot.vy = opts.vy;
    slot.drag = opts.drag;
    slot.age = 0;
    slot.lifetime = Math.max(0.01, opts.lifetime);
    slot.startAlpha = opts.startAlpha;
    slot.endAlpha = opts.endAlpha;
    slot.startScale = opts.startScale;
    slot.endScale = opts.endScale;
    slot.rotationSpeed = opts.rotationSpeed ?? 0;

    const spr = slot.sprite;
    spr.setTexture(opts.textureKey);
    spr.setPosition(opts.x, opts.y);
    spr.setTint(opts.tint);
    spr.setAlpha(opts.startAlpha);
    spr.setScale(opts.startScale);
    spr.setFlipX(Boolean(opts.flipX));
    spr.setRotation(opts.rotation ?? 0);
    spr.setDepth(opts.depth);
    spr.setBlendMode(opts.additive ? BLEND_MODE_ADD : BLEND_MODE_NORMAL);
    spr.setActive(true);
    spr.setVisible(true);
  }

  private acquireSlot(x: number, y: number, textureKey: string): PooledEffect | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }

    if (this.pool.length < this.capacity) {
      if (!this.scene?.add?.sprite) return null;
      const sprite = this.scene.add.sprite(x, y, textureKey);
      const item: PooledEffect = {
        sprite,
        active: false,
        vx: 0,
        vy: 0,
        drag: 0,
        age: 0,
        lifetime: 0.1,
        startAlpha: 1,
        endAlpha: 0,
        startScale: 1,
        endScale: 1,
        rotationSpeed: 0
      };
      this.pool.push(item);
      return item;
    }

    // Fixed-cap pool exhausted: recycle the oldest active slot instead of allocating more sprites
    let oldest = this.pool[0];
    let highestProgress = oldest.age / oldest.lifetime;
    for (let i = 1; i < this.pool.length; i++) {
      const candidate = this.pool[i];
      const progress = candidate.age / candidate.lifetime;
      if (progress > highestProgress) {
        highestProgress = progress;
        oldest = candidate;
      }
    }
    this.recycledCount++;
    return oldest;
  }

  private deactivate(item: PooledEffect): void {
    item.active = false;
    const spr = item.sprite as (Phaser.GameObjects.Sprite & { destroyed?: boolean }) | undefined;
    if (spr && !spr.destroyed && typeof spr.setActive === 'function') {
      spr.setActive(false);
      spr.setVisible(false);
    }
  }
}
