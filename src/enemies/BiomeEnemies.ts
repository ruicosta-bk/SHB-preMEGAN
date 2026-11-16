import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { DamageInfo, DamageResult } from '../types/entity';
import { audio } from '../core/AudioSystem';

/**
 * Stage 1 (stone_crypt): Armored sentinel carrying a front tower shield.
 * Blocks 70% of non-fire/non-lightning frontal bullet damage.
 */
export class EnemyCryptShielder extends EnemyBase {
  public facingX: number = 1;
  private attackCooldown: number = 1.6;
  private shieldGraphic: Phaser.GameObjects.Graphics | null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_crypt_shielder', 24, 64);
    this.shieldGraphic = scene.add.graphics().setDepth(10);
  }

  public getEnemyType(): string {
    return 'crypt_shielder';
  }

  protected override onDifficultyScaled(): void {
    this.attackCooldown = Math.max(0.8, this.attackCooldown / this.attackRateScale);
  }

  public override takeDamage(damage: DamageInfo): DamageResult {
    let adjustedDamage = damage;
    const isFrontalBullet =
      damage.isPlayerAttack &&
      damage.knockback &&
      damage.element !== 'fire' &&
      damage.element !== 'lightning' &&
      damage.amount > 0 &&
      damage.knockback.x * this.facingX < -0.25;

    if (isFrontalBullet) {
      adjustedDamage = {
        ...damage,
        amount: Math.max(1, Math.round(damage.amount * 0.3)),
        isCrit: false,
        knockback: damage.knockback
          ? { ...damage.knockback, force: damage.knockback.force * 0.25 }
          : undefined
      };
    }

    return super.takeDamage(adjustedDamage);
  }

  public override update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    super.update(deltaSec, playerX, playerY, pool, walls, roomBounds);
    if (this.isDead) {
      this.shieldGraphic?.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 4) {
      this.facingX = dx >= 0 ? 1 : -1;
    }

    if (this.shieldGraphic) {
      this.shieldGraphic.clear();
      this.shieldGraphic.lineStyle(2, 0x94a3b8, 0.75);
      const shieldX = this.sprite.x + this.facingX * 13;
      this.shieldGraphic.beginPath();
      this.shieldGraphic.moveTo(shieldX, this.sprite.y - 10);
      this.shieldGraphic.lineTo(shieldX, this.sprite.y + 10);
      this.shieldGraphic.strokePath();
    }

    if (dist > 78) {
      this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed);
    }

    this.attackCooldown -= deltaSec;
    if (this.attackCooldown <= 0 && dist <= 165) {
      this.attackCooldown = 2.1 / this.attackRateScale;
      const baseAngle = Math.atan2(dy, dx);
      audio.playEnemyShoot();
      for (const offset of [-0.26, 0, 0.26]) {
        const ang = baseAngle + offset;
        pool.spawn({
          x: this.sprite.x + Math.cos(ang) * 16,
          y: this.sprite.y + Math.sin(ang) * 16,
          angleRad: ang,
          speed: 225,
          damage: 2 + this.bonusDamage,
          isPlayer: false,
          texture: 'bullet_enemy_orb',
          range: 260
        });
      }
    }
  }

  protected override onDeath(): void {
    this.shieldGraphic?.destroy();
    this.shieldGraphic = null;
    super.onDeath();
  }

  public override destroy(): void {
    this.shieldGraphic?.destroy();
    this.shieldGraphic = null;
    super.destroy();
  }
}

/**
 * Stage 1 (stone_crypt): Precision skeleton marksman with red telegraph laser and ricocheting bone bolt.
 */
export class EnemyBoneSniper extends EnemyBase {
  private cooldownTimer: number = 1.6;
  private isAiming: boolean = false;
  private aimTimer: number = 0;
  private lockedAngle: number = 0;
  private laserGraphic: Phaser.GameObjects.Graphics | null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_bone_sniper', 14, 72);
    this.laserGraphic = scene.add.graphics().setDepth(11);
  }

  public getEnemyType(): string {
    return 'bone_sniper';
  }

  protected override onDifficultyScaled(): void {
    this.cooldownTimer = Math.max(0.75, this.cooldownTimer / this.attackRateScale);
  }

  public override update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    super.update(deltaSec, playerX, playerY, pool, walls, roomBounds);
    if (this.isDead) {
      this.laserGraphic?.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (this.cooldownTimer > 0 && !this.isAiming) {
      this.cooldownTimer -= deltaSec;
    }

    if (this.isAiming) {
      this.aimTimer -= deltaSec;
      if (this.laserGraphic) {
        this.laserGraphic.clear();
        this.laserGraphic.lineStyle(1.8, 0xef4444, 0.8);
        this.laserGraphic.beginPath();
        this.laserGraphic.moveTo(this.sprite.x, this.sprite.y);
        this.laserGraphic.lineTo(
          this.sprite.x + Math.cos(this.lockedAngle) * 340,
          this.sprite.y + Math.sin(this.lockedAngle) * 340
        );
        this.laserGraphic.strokePath();
      }

      if (this.aimTimer <= 0) {
        this.isAiming = false;
        this.laserGraphic?.clear();
        this.cooldownTimer = 2.4 / this.attackRateScale;
        audio.playEnemyShoot();
        pool.spawn({
          x: this.sprite.x + Math.cos(this.lockedAngle) * 16,
          y: this.sprite.y + Math.sin(this.lockedAngle) * 16,
          angleRad: this.lockedAngle,
          speed: 490,
          damage: 2 + this.bonusDamage,
          isPlayer: false,
          texture: 'bullet_bone_pierce',
          bounceCount: 1,
          range: 560
        });
      }
      return;
    }

    this.laserGraphic?.clear();
    if (dist > 310) {
      this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed);
    } else if (dist < 140 && dist > 1) {
      const awayX = this.sprite.x - (dx / dist) * 60;
      const awayY = this.sprite.y - (dy / dist) * 60;
      this.moveTowardsWithObstacleAvoidance(awayX, awayY, deltaSec, walls, this.speed * 0.9);
    }

    if (this.cooldownTimer <= 0 && dist <= 400) {
      this.isAiming = true;
      this.aimTimer = 0.7;
      this.lockedAngle = Math.atan2(dy, dx);
    }
  }

  protected override onDeath(): void {
    this.laserGraphic?.destroy();
    this.laserGraphic = null;
    super.onDeath();
  }

  public override destroy(): void {
    this.laserGraphic?.destroy();
    this.laserGraphic = null;
    super.destroy();
  }
}

/**
 * Stage 2 (frost_cavern): Semi-invisible frost assassin that decloaks to slash-dash with chill bolts.
 */
export class EnemyIceStalker extends EnemyBase {
  private state: 'stalk' | 'windup' | 'dash' | 'recover' = 'stalk';
  private stateTimer: number = 0;
  private dashAngle: number = 0;
  private stalkGraphic: Phaser.GameObjects.Graphics | null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_ice_stalker', 18, 105);
    this.stalkGraphic = scene.add.graphics().setDepth(10);
  }

  public getEnemyType(): string {
    return 'ice_stalker';
  }

  public override update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    super.update(deltaSec, playerX, playerY, pool, walls, roomBounds);
    if (this.isDead) {
      this.stalkGraphic?.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    switch (this.state) {
      case 'stalk':
        this.stalkGraphic?.clear();
        this.sprite.setAlpha?.(0.28);
        this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed);
        if (dist <= 135) {
          this.state = 'windup';
          this.stateTimer = Math.max(0.24, 0.42 / this.attackRateScale);
          this.dashAngle = Math.atan2(dy, dx);
          this.sprite.setAlpha?.(1.0);
        }
        break;

      case 'windup':
        this.stateTimer -= deltaSec;
        this.sprite.setAlpha?.(1.0);
        if (this.stalkGraphic) {
          this.stalkGraphic.clear();
          this.stalkGraphic.lineStyle(2, 0x38bdf8, 0.85);
          this.stalkGraphic.strokeCircle(this.sprite.x, this.sprite.y, 18);
        }
        if (this.stateTimer <= 0) {
          this.stalkGraphic?.clear();
          this.state = 'dash';
          this.stateTimer = 0.22;
          audio.playEnemyShoot();
          for (const offset of [-0.24, 0, 0.24]) {
            const ang = this.dashAngle + offset;
            pool.spawn({
              x: this.sprite.x + Math.cos(ang) * 14,
              y: this.sprite.y + Math.sin(ang) * 14,
              angleRad: ang,
              speed: 280,
              damage: 2 + this.bonusDamage,
              isPlayer: false,
              element: 'frost',
              texture: 'bullet_frost',
              range: 240
            });
          }
        }
        break;

      case 'dash': {
        this.stateTimer -= deltaSec;
        const stepX = this.sprite.x + Math.cos(this.dashAngle) * 260 * deltaSec;
        const stepY = this.sprite.y + Math.sin(this.dashAngle) * 260 * deltaSec;
        this.moveTowardsWithObstacleAvoidance(stepX, stepY, deltaSec, walls, 260);
        if (this.stateTimer <= 0) {
          this.state = 'recover';
          this.stateTimer = Math.max(0.55, 0.95 / this.attackRateScale);
        }
        break;
      }

      case 'recover':
        this.stateTimer -= deltaSec;
        this.sprite.setAlpha?.(0.85);
        if (this.stateTimer <= 0) {
          this.state = 'stalk';
        }
        break;
    }
  }

  protected override onDeath(): void {
    this.sprite.setAlpha?.(1.0);
    this.stalkGraphic?.destroy();
    this.stalkGraphic = null;
    super.onDeath();
  }

  public override destroy(): void {
    this.stalkGraphic?.destroy();
    this.stalkGraphic = null;
    super.destroy();
  }
}

/**
 * Stage 2 (frost_cavern): Stationary runic ice obelisk pulsing rotating frost rings.
 */
export class EnemyGlacialTotem extends EnemyBase {
  private pulseTimer: number = 1.4;
  private spinAngle: number = 0;
  private auraGraphic: Phaser.GameObjects.Graphics | null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_glacial_totem', 28, 0);
    this.auraGraphic = scene.add.graphics().setDepth(9);
  }

  public getEnemyType(): string {
    return 'glacial_totem';
  }

  protected override onDifficultyScaled(): void {
    this.pulseTimer = Math.max(0.75, this.pulseTimer / this.attackRateScale);
  }

  public override takeDamage(damage: DamageInfo): DamageResult {
    const res = super.takeDamage(damage);
    this.knockbackVx *= 0.15;
    this.knockbackVy *= 0.15;
    return res;
  }

  public override update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    super.update(deltaSec, playerX, playerY, pool, walls, roomBounds);
    if (this.isDead) {
      this.auraGraphic?.clear();
      return;
    }

    const dist = Math.hypot(playerX - this.sprite.x, playerY - this.sprite.y);
    this.pulseTimer -= deltaSec;

    if (this.auraGraphic) {
      const pulseRatio = Math.max(0, Math.min(1, 1 - this.pulseTimer / (2.0 / this.attackRateScale)));
      this.auraGraphic.clear();
      this.auraGraphic.lineStyle(1.5, 0x38bdf8, 0.25 + pulseRatio * 0.45);
      this.auraGraphic.strokeCircle(this.sprite.x, this.sprite.y, 40 + pulseRatio * 65);
    }

    if (this.pulseTimer <= 0 && dist <= 390) {
      this.pulseTimer = 2.0 / this.attackRateScale;
      this.spinAngle += Math.PI / 6;
      audio.playEnemyShoot();
      for (let i = 0; i < 6; i++) {
        const ang = this.spinAngle + (i / 6) * Math.PI * 2;
        pool.spawn({
          x: this.sprite.x + Math.cos(ang) * 14,
          y: this.sprite.y + Math.sin(ang) * 14,
          angleRad: ang,
          speed: 205,
          damage: 2 + this.bonusDamage,
          isPlayer: false,
          element: 'frost',
          texture: 'bullet_frost',
          range: 380
        });
      }
    }
  }

  protected override onDeath(): void {
    this.auraGraphic?.destroy();
    this.auraGraphic = null;
    super.onDeath();
  }

  public override destroy(): void {
    this.auraGraphic?.destroy();
    this.auraGraphic = null;
    super.destroy();
  }
}

/**
 * Stage 3 (molten_core): Splitting molten slime that bursts into 2 fast mini-slimes on death.
 */
export class EnemyMagmaSlime extends EnemyBase {
  public readonly isMini: boolean;
  private attackTimer: number = 1.5;
  private pendingSplit: { type: string; x: number; y: number }[] | null = null;
  private splitQueued: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, isMini: boolean = false) {
    super(scene, x, y, 'enemy_magma_slime', isMini ? 10 : 20, isMini ? 115 : 82);
    this.isMini = isMini;
    if (isMini) {
      this.sprite.setScale(0.72);
      this.shadow.setScale(0.72);
    }
  }

  public getEnemyType(): string {
    return this.isMini ? 'magma_slime_mini' : 'magma_slime';
  }

  protected override onDifficultyScaled(): void {
    this.attackTimer = Math.max(0.75, this.attackTimer / this.attackRateScale);
  }

  public consumeSummonRequest(): { type: string; x: number; y: number }[] | null {
    const req = this.pendingSplit;
    this.pendingSplit = null;
    return req;
  }

  protected override onDeath(): void {
    if (!this.isMini && !this.splitQueued) {
      this.splitQueued = true;
      this.pendingSplit = [
        { type: 'magma_slime_mini', x: this.sprite.x - 18, y: this.sprite.y + 6 },
        { type: 'magma_slime_mini', x: this.sprite.x + 18, y: this.sprite.y - 6 }
      ];
    }
    super.onDeath();
  }

  public override update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    super.update(deltaSec, playerX, playerY, pool, walls, roomBounds);
    if (this.isDead) return;

    if (this.isMini) {
      this.sprite.setScale(this.sprite.scaleX * 0.72, this.sprite.scaleY * 0.72);
      if (this.hitFlashTimer <= 0) {
        this.sprite.setTint(0xfb923c);
      }
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed);

    this.attackTimer -= deltaSec;
    if (this.attackTimer <= 0 && dist <= 260) {
      this.attackTimer = (this.isMini ? 1.8 : 2.1) / this.attackRateScale;
      const baseAngle = Math.atan2(dy, dx);
      audio.playEnemyShoot();
      const count = this.isMini ? 2 : 4;
      for (let i = 0; i < count; i++) {
        const ang = baseAngle + (i / count) * Math.PI * 2;
        pool.spawn({
          x: this.sprite.x + Math.cos(ang) * 12,
          y: this.sprite.y + Math.sin(ang) * 12,
          angleRad: ang,
          speed: this.isMini ? 215 : 190,
          damage: 2 + this.bonusDamage,
          isPlayer: false,
          element: 'fire',
          texture: 'bullet_magma_glob',
          range: 280
        });
      }
    }
  }
}

/**
 * Stage 3 (molten_core): Heavy armored furnace colossus alternating flame streams and mortar bursts.
 */
export class EnemyPyroJuggernaut extends EnemyBase {
  private state: 'advance' | 'flame_stream' | 'mortar_windup' = 'advance';
  private stateTimer: number = 1.4;
  private flameTicksLeft: number = 0;
  private flameTickTimer: number = 0;
  private nextAttack: 'flame' | 'mortar' = 'flame';
  private telegraphGraphic: Phaser.GameObjects.Graphics | null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_pyro_juggernaut', 36, 58);
    this.telegraphGraphic = scene.add.graphics().setDepth(10);
  }

  public getEnemyType(): string {
    return 'pyro_juggernaut';
  }

  protected override onDifficultyScaled(): void {
    this.stateTimer = Math.max(0.7, this.stateTimer / this.attackRateScale);
  }

  public override takeDamage(damage: DamageInfo): DamageResult {
    const res = super.takeDamage(damage);
    this.knockbackVx *= 0.25;
    this.knockbackVy *= 0.25;
    return res;
  }

  public override update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    super.update(deltaSec, playerX, playerY, pool, walls, roomBounds);
    if (this.isDead) {
      this.telegraphGraphic?.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    this.stateTimer -= deltaSec;

    switch (this.state) {
      case 'advance':
        this.telegraphGraphic?.clear();
        if (dist > 85) {
          this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed);
        }
        if (this.stateTimer <= 0 && dist <= 320) {
          if (this.nextAttack === 'flame' && dist <= 210) {
            this.state = 'flame_stream';
            this.flameTicksLeft = 4;
            this.flameTickTimer = 0;
            this.nextAttack = 'mortar';
          } else {
            this.state = 'mortar_windup';
            this.stateTimer = Math.max(0.35, 0.55 / this.attackRateScale);
            this.nextAttack = 'flame';
          }
        }
        break;

      case 'flame_stream':
        this.flameTickTimer -= deltaSec;
        if (this.flameTickTimer <= 0 && this.flameTicksLeft > 0) {
          this.flameTicksLeft--;
          this.flameTickTimer = Math.max(0.08, 0.14 / this.attackRateScale);
          const aim = Math.atan2(dy, dx);
          audio.playEnemyShoot();
          for (const off of [-0.18, 0, 0.18]) {
            const ang = aim + off;
            pool.spawn({
              x: this.sprite.x + Math.cos(ang) * 16,
              y: this.sprite.y + Math.sin(ang) * 16,
              angleRad: ang,
              speed: 255,
              damage: 2 + this.bonusDamage,
              isPlayer: false,
              element: 'fire',
              texture: 'bullet_inferno',
              range: 240
            });
          }
        }
        if (this.flameTicksLeft <= 0) {
          this.state = 'advance';
          this.stateTimer = 1.9 / this.attackRateScale;
        }
        break;

      case 'mortar_windup':
        if (this.telegraphGraphic) {
          this.telegraphGraphic.clear();
          this.telegraphGraphic.lineStyle(2, 0xf97316, 0.9);
          this.telegraphGraphic.strokeCircle(this.sprite.x, this.sprite.y, 26);
        }
        if (this.stateTimer <= 0) {
          this.telegraphGraphic?.clear();
          const aim = Math.atan2(dy, dx);
          audio.playShootShotgun();
          pool.spawn({
            x: this.sprite.x + Math.cos(aim) * 16,
            y: this.sprite.y + Math.sin(aim) * 16,
            angleRad: aim,
            speed: 295,
            damage: 3 + this.bonusDamage,
            isPlayer: false,
            element: 'fire',
            texture: 'bullet_magma_glob',
            range: 420
          });
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            pool.spawn({
              x: this.sprite.x + Math.cos(ang) * 14,
              y: this.sprite.y + Math.sin(ang) * 14,
              angleRad: ang,
              speed: 195,
              damage: 2 + this.bonusDamage,
              isPlayer: false,
              element: 'fire',
              texture: 'bullet_inferno',
              range: 300
            });
          }
          this.state = 'advance';
          this.stateTimer = 2.1 / this.attackRateScale;
        }
        break;
    }
  }

  protected override onDeath(): void {
    this.telegraphGraphic?.destroy();
    this.telegraphGraphic = null;
    super.onDeath();
  }

  public override destroy(): void {
    this.telegraphGraphic?.destroy();
    this.telegraphGraphic = null;
    super.destroy();
  }
}
