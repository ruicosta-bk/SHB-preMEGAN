import Phaser from 'phaser';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

export type ProjectileElement = 'fire' | 'frost' | 'lightning' | 'vampire' | 'poison';

export interface Projectile {
  sprite: Phaser.GameObjects.Sprite;
  active: boolean;
  vx: number;
  vy: number;
  damage: number;
  isPlayer: boolean;
  isCrit: boolean;
  isHoming: boolean;
  element?: ProjectileElement;
  pierceRemaining: number;
  bouncesRemaining: number;
  rangeRemaining: number;
  hitEntities: Set<any>;
  isBoomerang?: boolean;
  isFrostNova?: boolean;
  ownerRef?: { x: number; y: number };
  boomerangElapsed?: number;
  boomerangReturned?: boolean;
  boomerangReturnThreshold?: number;
  boomerangHalfTime?: number;
}

export class ProjectilePool {
  private scene: Phaser.Scene;
  private projectiles: Projectile[] = [];
  private readonly maxProjectiles: number = 300;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public spawn(config: {
    x: number;
    y: number;
    angleRad: number;
    speed: number;
    damage: number;
    isPlayer: boolean;
    isCrit?: boolean;
    isHoming?: boolean;
    isBoomerang?: boolean;
    isFrostNova?: boolean;
    ownerRef?: { x: number; y: number };
    element?: ProjectileElement;
    texture: string;
    range: number;
    pierceCount?: number;
    bounceCount?: number;
    tint?: number;
  }): Projectile | null {
    let p = this.projectiles.find(item => !item.active);

    if (!p) {
      if (this.projectiles.length >= this.maxProjectiles) {
        return null; // Cap budget
      }
      const sprite = this.scene.add.sprite(config.x, config.y, config.texture);
      sprite.setDepth(15);
      p = {
        sprite,
        active: false,
        vx: 0,
        vy: 0,
        damage: 0,
        isPlayer: false,
        isCrit: false,
        isHoming: false,
        element: undefined,
        pierceRemaining: 0,
        bouncesRemaining: 0,
        rangeRemaining: 0,
        hitEntities: new Set(),
        isBoomerang: false,
        isFrostNova: false,
        ownerRef: undefined,
        boomerangElapsed: 0,
        boomerangReturned: false,
        boomerangReturnThreshold: 0,
        boomerangHalfTime: 0
      };
      this.projectiles.push(p);
    }

    p.active = true;
    p.sprite.setTexture(config.texture);
    p.sprite.setPosition(config.x, config.y);
    p.sprite.setRotation(config.angleRad);
    p.sprite.setVisible(true);
    if (config.tint !== undefined) {
      p.sprite.setTint(config.tint);
    } else {
      p.sprite.clearTint();
    }

    p.vx = Math.cos(config.angleRad) * config.speed;
    p.vy = Math.sin(config.angleRad) * config.speed;
    p.damage = config.damage;
    p.isPlayer = config.isPlayer;
    p.isCrit = !!config.isCrit;
    p.isHoming = !!config.isHoming;
    p.element = config.element;
    p.pierceRemaining = config.pierceCount || 0;
    p.bouncesRemaining = config.bounceCount || 0;
    p.rangeRemaining = config.range;
    p.hitEntities.clear();
    p.isBoomerang = !!config.isBoomerang;
    p.isFrostNova = !!config.isFrostNova;
    p.ownerRef = config.ownerRef;
    p.boomerangElapsed = 0;
    p.boomerangReturned = false;
    p.boomerangReturnThreshold = config.range * 0.5;
    p.boomerangHalfTime = config.speed > 0 ? (config.range * 0.5) / config.speed : 0;

    return p;
  }

  public update(
    deltaSec: number,
    wallColliders: { x: number; y: number; width: number; height: number }[],
    activeEnemies?: { sprite: { x: number; y: number }; isDead: boolean }[]
  ): void {
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      if (p.isBoomerang) {
        p.sprite.rotation += 14 * deltaSec;
        p.boomerangElapsed = (p.boomerangElapsed ?? 0) + deltaSec;

        if (!p.boomerangReturned && p.rangeRemaining <= (p.boomerangReturnThreshold ?? 0)) {
          p.boomerangReturned = true;
          p.hitEntities.clear();
          if (!p.ownerRef) {
            p.vx = -p.vx;
            p.vy = -p.vy;
          }
        }

        if (p.boomerangReturned && p.ownerRef) {
          const dx = p.ownerRef.x - p.sprite.x;
          const dy = p.ownerRef.y - p.sprite.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= 16) {
            this.deactivate(p);
            continue;
          }
          const speed = Math.hypot(p.vx, p.vy) || 460;
          p.vx = (dx / dist) * speed;
          p.vy = (dy / dist) * speed;
        }
      } else if (p.isPlayer && p.isHoming && activeEnemies && activeEnemies.length > 0) {
        let bestTarget: { sprite: { x: number; y: number } } | null = null;
        let bestDist = 280;
        for (const e of activeEnemies) {
          if (e.isDead) continue;
          const d = Math.hypot(e.sprite.x - p.sprite.x, e.sprite.y - p.sprite.y);
          if (d < bestDist) {
            bestDist = d;
            bestTarget = e;
          }
        }
        if (bestTarget) {
          const speed = Math.hypot(p.vx, p.vy) || 300;
          const currentAngle = Math.atan2(p.vy, p.vx);
          const targetAngle = Math.atan2(bestTarget.sprite.y - p.sprite.y, bestTarget.sprite.x - p.sprite.x);
          const diff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
          const maxTurn = 5.5 * deltaSec;
          const nextAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, diff));
          p.vx = Math.cos(nextAngle) * speed;
          p.vy = Math.sin(nextAngle) * speed;
          p.sprite.setRotation(nextAngle);
        }
      }

      const moveStepX = p.vx * deltaSec;
      const moveStepY = p.vy * deltaSec;
      const stepDist = Math.hypot(moveStepX, moveStepY);

      p.sprite.x += moveStepX;
      p.sprite.y += moveStepY;
      p.rangeRemaining -= stepDist;

      if (p.rangeRemaining <= 0) {
        this.deactivate(p);
        continue;
      }

      // Check wall collision
      const px = p.sprite.x;
      const py = p.sprite.y;

      let hitWall = false;
      for (const w of wallColliders) {
        if (px >= w.x && px <= w.x + w.width && py >= w.y && py <= w.y + w.height) {
          hitWall = true;
          break;
        }
      }

      if (hitWall) {
        if (p.isBoomerang && !p.boomerangReturned) {
          p.boomerangReturned = true;
          p.vx = -p.vx;
          p.vy = -p.vy;
          p.hitEntities.clear();
          p.sprite.x += p.vx * deltaSec * 2;
          p.sprite.y += p.vy * deltaSec * 2;
        } else if (p.isPlayer && p.bouncesRemaining > 0) {
          p.bouncesRemaining--;
          p.damage *= 0.8;
          // Reverse direction with small random perturbation
          const currentAngle = Math.atan2(p.vy, p.vx);
          const newAngle = currentAngle + Math.PI + (Math.random() - 0.5) * 0.4;
          const speed = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(newAngle) * speed;
          p.vy = Math.sin(newAngle) * speed;
          p.sprite.setRotation(newAngle);
          // Step out of wall
          p.sprite.x += p.vx * deltaSec * 2;
          p.sprite.y += p.vy * deltaSec * 2;
        } else {
          this.deactivate(p);
        }
      }
    }
  }

  public getActiveProjectiles(isPlayer?: boolean): Projectile[] {
    return this.projectiles.filter(p => p.active && (isPlayer === undefined || p.isPlayer === isPlayer));
  }

  public destroyEnemyBulletsInRadius(x: number, y: number, radius: number): number {
    let destroyed = 0;
    const rSq = radius * radius;
    for (const p of this.projectiles) {
      if (p.active && !p.isPlayer) {
        const dx = p.sprite.x - x;
        const dy = p.sprite.y - y;
        if (dx * dx + dy * dy <= rSq) {
          this.deactivate(p);
          events.emit('combat:bullet-destroyed', { x: p.sprite.x, y: p.sprite.y });
          destroyed++;
        }
      }
    }
    return destroyed;
  }

  public deactivate(p: Projectile): void {
    p.active = false;
    p.sprite.setVisible(false);
    p.hitEntities.clear();
    p.ownerRef = undefined;
    p.isBoomerang = false;
    p.isFrostNova = false;
    p.boomerangElapsed = 0;
    p.boomerangReturned = false;
  }

  public clearAll(): void {
    for (const p of this.projectiles) {
      this.deactivate(p);
    }
  }
}
