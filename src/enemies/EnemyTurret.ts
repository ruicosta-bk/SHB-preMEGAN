import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { DamageInfo, DamageResult } from '../types/entity';
import { audio } from '../core/AudioSystem';

export class EnemyTurret extends EnemyBase {
  private state: 'cooldown' | 'aiming' | 'rapid_followup' = 'cooldown';
  private nextMode: 'laser_burst' | 'aimed_rapid' = 'laser_burst';
  private cooldownTimer: number = 1.2;
  private stateTimer: number = 0;
  private laserAngleOffset: number = 0;
  private lockedAngle: number = 0;
  private aimGraphic: Phaser.GameObjects.Graphics | null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_turret', 26, 0);
    this.aimGraphic = scene.add.graphics().setDepth(11);
  }

  public getEnemyType(): string {
    return 'turret_mage';
  }

  protected override onDifficultyScaled(): void {
    this.cooldownTimer = Math.max(0.6, this.cooldownTimer / this.attackRateScale);
  }

  public override takeDamage(damage: DamageInfo): DamageResult {
    const result = super.takeDamage(damage);
    this.knockbackVx *= 0.15;
    this.knockbackVy *= 0.15;
    return result;
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
      this.aimGraphic?.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    switch (this.state) {
      case 'cooldown':
        this.aimGraphic?.clear();
        if (this.cooldownTimer > 0) {
          this.cooldownTimer -= deltaSec;
        }
        if (this.cooldownTimer <= 0 && dist <= 400) {
          if (this.nextMode === 'laser_burst') {
            this.fireLaserBurst(pool);
            this.nextMode = 'aimed_rapid';
            this.cooldownTimer = 2.1 / this.attackRateScale;
          } else {
            this.state = 'aiming';
            this.stateTimer = 0.45;
            this.lockedAngle = Math.atan2(dy, dx);
          }
        }
        break;

      case 'aiming':
        this.stateTimer -= deltaSec;
        if (this.aimGraphic) {
          this.aimGraphic.clear();
          this.aimGraphic.lineStyle(1.5, 0xe879f9, 0.8);
          this.aimGraphic.beginPath();
          this.aimGraphic.moveTo(this.sprite.x, this.sprite.y);
          this.aimGraphic.lineTo(
            this.sprite.x + Math.cos(this.lockedAngle) * 300,
            this.sprite.y + Math.sin(this.lockedAngle) * 300
          );
          this.aimGraphic.strokePath();
        }
        if (this.stateTimer <= 0) {
          this.aimGraphic?.clear();
          this.fireDarkOrb(pool);
          this.state = 'rapid_followup';
          this.stateTimer = 0.15;
        }
        break;

      case 'rapid_followup':
        this.stateTimer -= deltaSec;
        if (this.stateTimer <= 0) {
          this.fireDarkOrb(pool);
          this.nextMode = 'laser_burst';
          this.state = 'cooldown';
          this.cooldownTimer = 2.1 / this.attackRateScale;
        }
        break;
    }
  }

  private fireLaserBurst(pool: ProjectilePool): void {
    audio.playEnemyShoot();
    for (let i = 0; i < 4; i++) {
      const angle = this.laserAngleOffset + i * (Math.PI / 2);
      pool.spawn({
        x: this.sprite.x + Math.cos(angle) * 14,
        y: this.sprite.y + Math.sin(angle) * 14,
        angleRad: angle,
        speed: 245,
        damage: 2 + this.bonusDamage,
        isPlayer: false,
        texture: 'bullet_enemy_laser',
        range: 460
      });
    }
    this.laserAngleOffset = this.laserAngleOffset === 0 ? Math.PI / 4 : 0;
  }

  private fireDarkOrb(pool: ProjectilePool): void {
    audio.playEnemyShoot();
    pool.spawn({
      x: this.sprite.x + Math.cos(this.lockedAngle) * 14,
      y: this.sprite.y + Math.sin(this.lockedAngle) * 14,
      angleRad: this.lockedAngle,
      speed: 285,
      damage: 2 + this.bonusDamage,
      isPlayer: false,
      texture: 'bullet_dark_orb',
      range: 480
    });
  }

  protected override onDeath(): void {
    this.aimGraphic?.clear();
    super.onDeath();
  }

  public override destroy(): void {
    if (this.aimGraphic) {
      this.aimGraphic.destroy();
      this.aimGraphic = null;
    }
    super.destroy();
  }
}
