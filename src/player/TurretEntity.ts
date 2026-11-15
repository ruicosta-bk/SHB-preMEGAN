import type Phaser from 'phaser';
import type { EnemyBase } from '../enemies/EnemyBase';
import type { ProjectilePool } from '../combat/ProjectilePool';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

const TURRET_RANGE_PX = 330;
const TURRET_FIRE_INTERVAL_SEC = 0.26;
const TURRET_BULLET_SPEED = 520;
const TURRET_BULLET_DAMAGE = 4;
const TURRET_BULLET_RANGE = 420;
const TURRET_MUZZLE_OFFSET = 12;
const TURRET_RING_RADIUS = 18;
const TURRET_RING_COLOR = 0x14b8a6;
const TURRET_EXPLOSION_RADIUS = 48;
const TURRET_EXPLOSION_DAMAGE = 8;

export interface TurretTargetCandidate {
  isDead: boolean;
  x: number;
  y: number;
}

/**
 * Selects the nearest living enemy within `maxRange` pixels of `(tx, ty)`.
 */
export function selectNearestLivingEnemy<T extends TurretTargetCandidate>(
  tx: number,
  ty: number,
  enemies: T[],
  maxRange: number
): T | null {
  if (maxRange < 0 || enemies.length === 0) {
    return null;
  }

  let best: T | null = null;
  let bestDist = Infinity;

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.isDead) continue;

    const dist = Math.hypot(enemy.x - tx, enemy.y - ty);
    if (dist <= maxRange && dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }

  return best;
}

/**
 * Deployable auto-turret spawned by Engineer's [F] skill.
 * Tracks nearest living enemy, fires plasma bolts on a fixed cadence,
 * and detonates lightly when its lifetime expires.
 */
export class TurretEntity {
  public isExpired: boolean = false;

  private readonly x: number;
  private readonly y: number;
  private readonly durationSec: number;
  private lifeRemaining: number;
  private fireCooldown: number = 0;

  private baseSprite: Phaser.GameObjects.Sprite | null;
  private gunSprite: Phaser.GameObjects.Sprite | null;
  private ringGfx: Phaser.GameObjects.Graphics | null;

  constructor(scene: Phaser.Scene, x: number, y: number, durationSec: number = 8.5) {
    this.x = x;
    this.y = y;
    this.durationSec = Math.max(0.001, durationSec);
    this.lifeRemaining = durationSec;

    this.ringGfx = scene.add.graphics().setDepth(6);
    this.baseSprite = scene.add.sprite(x, y, 'turret_base').setDepth(8);
    this.gunSprite = scene.add.sprite(x, y, 'turret_gun').setDepth(11);

    this.drawLifetimeRing();
  }

  public update(deltaSec: number, enemies: EnemyBase[], pool: ProjectilePool): void {
    if (this.isExpired) return;

    this.lifeRemaining -= deltaSec;
    if (this.lifeRemaining <= 0) {
      this.lifeRemaining = 0;
      this.isExpired = true;
      events.emit('combat:explosion', {
        x: this.x,
        y: this.y,
        radius: TURRET_EXPLOSION_RADIUS,
        damage: TURRET_EXPLOSION_DAMAGE
      });
      this.destroy();
      return;
    }

    this.drawLifetimeRing();
    this.fireCooldown = Math.max(0, this.fireCooldown - deltaSec);

    const target = selectNearestLivingEnemy(this.x, this.y, enemies, TURRET_RANGE_PX);
    if (!target) return;

    const angleRad = Math.atan2(target.y - this.y, target.x - this.x);
    if (this.gunSprite) {
      this.gunSprite.setRotation(angleRad);
    }

    if (this.fireCooldown <= 0) {
      this.fireCooldown = TURRET_FIRE_INTERVAL_SEC;
      pool.spawn({
        x: this.x + Math.cos(angleRad) * TURRET_MUZZLE_OFFSET,
        y: this.y + Math.sin(angleRad) * TURRET_MUZZLE_OFFSET,
        angleRad,
        speed: TURRET_BULLET_SPEED,
        damage: TURRET_BULLET_DAMAGE,
        isPlayer: true,
        texture: 'bullet_turret',
        range: TURRET_BULLET_RANGE
      });

      audio.playTurretShoot();
    }
  }

  private drawLifetimeRing(): void {
    if (!this.ringGfx) return;

    const ratio = Math.max(0, Math.min(1, this.lifeRemaining / this.durationSec));
    const ringY = this.y + 4;
    const startAngle = -Math.PI / 2;

    this.ringGfx.clear();
    this.ringGfx.lineStyle(2, 0x0f766e, 0.35);
    this.ringGfx.strokeCircle(this.x, ringY, TURRET_RING_RADIUS);

    if (ratio > 0) {
      this.ringGfx.lineStyle(2.5, TURRET_RING_COLOR, 0.9);
      this.ringGfx.beginPath();
      this.ringGfx.arc(
        this.x,
        ringY,
        TURRET_RING_RADIUS,
        startAngle,
        startAngle + Math.PI * 2 * ratio,
        false
      );
      this.ringGfx.strokePath();
    }
  }

  public destroy(): void {
    if (this.baseSprite) {
      this.baseSprite.destroy();
      this.baseSprite = null;
    }
    if (this.gunSprite) {
      this.gunSprite.destroy();
      this.gunSprite = null;
    }
    if (this.ringGfx) {
      this.ringGfx.destroy();
      this.ringGfx = null;
    }
    this.isExpired = true;
  }
}
