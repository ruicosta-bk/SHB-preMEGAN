import Phaser from 'phaser';
import { DamageInfo, DamageResult, StatusEffect } from '../types/entity';
import { ProjectilePool } from '../combat/ProjectilePool';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';
import { StatusManager, EntityWithStatus } from '../combat/StatusManager';

export abstract class EnemyBase implements EntityWithStatus {
  public id: string;
  public scene: Phaser.Scene;
  public sprite: Phaser.GameObjects.Sprite;
  public shadow: Phaser.GameObjects.Sprite;

  public hp: number;
  public maxHp: number;
  public speed: number;
  public isDead: boolean = false;
  public isElite: boolean = false;
  public statusEffects: Map<string, StatusEffect> = new Map();

  protected hitFlashTimer: number = 0;
  protected knockbackVx: number = 0;
  protected knockbackVy: number = 0;
  protected eliteAura: Phaser.GameObjects.Graphics | null = null;
  protected bobTimer: number = Math.random() * Math.PI * 2;

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, maxHp: number, speed: number) {
    this.id = 'enemy_' + Math.random().toString(36).substr(2, 9);
    this.scene = scene;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.speed = speed;

    this.shadow = scene.add.sprite(x, y + 8, 'shadow').setDepth(7);
    this.sprite = scene.add.sprite(x, y, texture).setDepth(8);
  }

  public promoteToElite(): void {
    if (this.isElite) return;
    this.isElite = true;
    this.maxHp = Math.ceil(this.maxHp * 2.4);
    this.hp = this.maxHp;
    this.speed *= 1.15;
    this.sprite.setScale(1.38);
    this.shadow.setScale(1.35);

    this.eliteAura = this.scene.add.graphics().setDepth(6);
    this.eliteAura.lineStyle(2, 0xf59e0b, 0.9);
    this.eliteAura.strokeCircle(0, 0, 17);
    this.eliteAura.fillStyle(0xef4444, 0.22);
    this.eliteAura.fillCircle(0, 0, 17);
    this.eliteAura.setPosition(this.sprite.x, this.sprite.y + 4);
  }

  public takeDamage(damage: DamageInfo): DamageResult {
    if (this.isDead) {
      return { actualDamage: 0, absorbedByArmor: 0, hpDamage: 0, isDead: true, overkill: 0 };
    }

    let amt = Math.max(0, damage.amount);
    let isShatter = false;

    // Shatter mechanic: hitting frozen enemy with heavy melee triggers critical shatter
    if (this.statusEffects.has('freeze') && damage.isPlayerAttack && amt >= 6) {
      amt += 8; // Bonus shatter damage
      damage.isCrit = true;
      isShatter = true;
      this.statusEffects.delete('freeze');
      audio.playGlassBreak();
    }

    // Apply elemental status
    if (damage.element === 'fire') {
      StatusManager.applyStatus(this, 'burn', 3.0, 2, 0.5);
    } else if (damage.element === 'frost') {
      StatusManager.applyStatus(this, 'freeze', 2.5, 1, 0.5, 0.5);
    }

    this.hp -= amt;
    this.hitFlashTimer = 0.12;
    this.sprite.setTint(0xffffff);

    audio.playHitEnemy();

    // Knockback
    if (damage.knockback) {
      this.knockbackVx = damage.knockback.x * damage.knockback.force;
      this.knockbackVy = damage.knockback.y * damage.knockback.force;
    }

    events.emit('combat:enemy-hit', {
      enemyId: this.id,
      damage: amt,
      isCrit: !!damage.isCrit || isShatter,
      x: this.sprite.x,
      y: this.sprite.y,
      element: damage.element
    });

    if (this.hp <= 0) {
      this.isDead = true;
      this.onDeath();
      return { actualDamage: amt, absorbedByArmor: 0, hpDamage: amt, isDead: true, overkill: Math.abs(this.hp) };
    }

    return { actualDamage: amt, absorbedByArmor: 0, hpDamage: amt, isDead: false, overkill: 0 };
  }

  protected onDeath(): void {
    // If enemy died while burning, burst into flames hurting other enemies
    if (this.statusEffects.has('burn')) {
      audio.playExplosion();
      events.emit('combat:explosion', { x: this.sprite.x, y: this.sprite.y, radius: 45, damage: 6 });
    }

    events.emit('combat:enemy-died', {
      enemyId: this.id,
      x: this.sprite.x,
      y: this.sprite.y,
      type: this.getEnemyType()
    });

    // Death fade & destroy
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 150,
      onComplete: () => {
        this.destroy();
      }
    });
  }

  public abstract getEnemyType(): string;

  public update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    if (this.isDead) return;

    // Update status effects (DoT, freeze slow)
    const { isFrozen } = StatusManager.updateStatus(this, deltaSec);

    // Flash recovery or status visual tint
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= deltaSec;
      if (this.hitFlashTimer <= 0) {
        if (this.statusEffects.has('burn')) {
          this.sprite.setTint(0xf97316); // Fiery orange
        } else if (isFrozen) {
          this.sprite.setTint(0x38bdf8); // Icy cyan
        } else {
          this.sprite.clearTint();
        }
      }
    } else {
      if (this.statusEffects.has('burn')) {
        this.sprite.setTint(0xf97316);
      } else if (isFrozen) {
        this.sprite.setTint(0x38bdf8);
      }
    }

    // Apply knockback decay with wall collision check
    if (Math.abs(this.knockbackVx) > 5 || Math.abs(this.knockbackVy) > 5) {
      const nextX = this.sprite.x + this.knockbackVx * deltaSec;
      const nextY = this.sprite.y + this.knockbackVy * deltaSec;

      if (!this.checkWallCollision(nextX, this.sprite.y, 18, 18, walls)) {
        this.sprite.x = nextX;
      } else {
        this.knockbackVx = 0;
      }

      if (!this.checkWallCollision(this.sprite.x, nextY, 18, 18, walls)) {
        this.sprite.y = nextY;
      } else {
        this.knockbackVy = 0;
      }

      this.knockbackVx *= Math.pow(0.1, deltaSec);
      this.knockbackVy *= Math.pow(0.1, deltaSec);
    }

    // Strict depenetration + room bounds failsafe: never allow enemy to stay inside pillars or outside walls
    this.ensureUnstuck(walls, roomBounds);

    // Facing direction & subtle Soul Knight breathing squash-stretch
    this.bobTimer += deltaSec * 5.2;
    const baseScale = this.isElite ? 1.38 : this.getEnemyType() === 'boss_ignis' ? 1.2 : 1.0;
    const breath = Math.sin(this.bobTimer) * 0.045;
    this.sprite.setScale(baseScale * (1 - breath * 0.6), baseScale * (1 + breath));
    this.sprite.setFlipX(playerX < this.sprite.x);
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 8);
    if (this.eliteAura) {
      this.eliteAura.setPosition(this.sprite.x, this.sprite.y + 4);
    }
  }

  protected moveTowardsWithObstacleAvoidance(
    targetX: number,
    targetY: number,
    deltaSec: number,
    walls: { x: number; y: number; width: number; height: number }[],
    customSpeed?: number
  ): void {
    let spd = customSpeed !== undefined ? customSpeed : this.speed;
    if (this.statusEffects.has('freeze')) {
      spd *= 0.5; // Slow down when frozen
    }
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return;

    let dirX = dx / dist;
    let dirY = dy / dist;

    // Test X movement
    const nextX = this.sprite.x + dirX * spd * deltaSec;
    if (!this.checkWallCollision(nextX, this.sprite.y, 16, 16, walls)) {
      this.sprite.x = nextX;
    } else {
      // Wall slide Y
      dirY = dirY !== 0 ? Math.sign(dirY) : 1;
    }

    // Test Y movement
    const nextY = this.sprite.y + dirY * spd * deltaSec;
    if (!this.checkWallCollision(this.sprite.x, nextY, 16, 16, walls)) {
      this.sprite.y = nextY;
    }
  }

  protected ensureUnstuck(
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    if (roomBounds) {
      this.sprite.x = Phaser.Math.Clamp(this.sprite.x, roomBounds.minX, roomBounds.maxX);
      this.sprite.y = Phaser.Math.Clamp(this.sprite.y, roomBounds.minY, roomBounds.maxY);
    }

    if (!this.checkWallCollision(this.sprite.x, this.sprite.y, 18, 18, walls)) {
      return;
    }

    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707]
    ];
    for (let radius = 6; radius <= 48; radius += 6) {
      for (const [dx, dy] of dirs) {
        const tx = this.sprite.x + dx * radius;
        const ty = this.sprite.y + dy * radius;
        if (roomBounds) {
          if (tx < roomBounds.minX || tx > roomBounds.maxX || ty < roomBounds.minY || ty > roomBounds.maxY) {
            continue;
          }
        }
        if (!this.checkWallCollision(tx, ty, 18, 18, walls)) {
          this.sprite.x = tx;
          this.sprite.y = ty;
          return;
        }
      }
    }
  }

  protected checkWallCollision(
    x: number,
    y: number,
    w: number,
    h: number,
    walls: { x: number; y: number; width: number; height: number }[]
  ): boolean {
    const left = x - w / 2;
    const right = x + w / 2;
    const top = y - h / 2;
    const bottom = y + h / 2;

    for (const wall of walls) {
      if (right > wall.x && left < wall.x + wall.width && bottom > wall.y && top < wall.y + wall.height) {
        return true;
      }
    }
    return false;
  }

  public destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    if (this.eliteAura) {
      this.eliteAura.destroy();
      this.eliteAura = null;
    }
  }
}
