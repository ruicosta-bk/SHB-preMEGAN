import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { audio } from '../core/AudioSystem';

export class EnemyShooter extends EnemyBase {
  private aimTimer: number = 0;
  private shootCooldownRemaining: number = 2.0;
  private isAiming: boolean = false;
  private laserGraphic: Phaser.GameObjects.Graphics;
  private lockedAngle: number = 0;
  private variant: 'shooter' | 'frost_mage' | 'frost_knight';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    variant: 'shooter' | 'frost_mage' | 'frost_knight' = 'shooter'
  ) {
    const tex =
      variant === 'frost_knight'
        ? 'enemy_frost_knight'
        : variant === 'frost_mage'
        ? 'enemy_frost_mage'
        : 'enemy_shooter';
    const hp = variant === 'frost_knight' ? 18 : variant === 'frost_mage' ? 14 : 12;
    const speed = variant === 'frost_knight' ? 85 : 75;
    super(scene, x, y, tex, hp, speed);
    this.variant = variant;
    this.laserGraphic = scene.add.graphics().setDepth(11);
  }

  public getEnemyType(): string {
    return this.variant;
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
      this.laserGraphic.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (this.shootCooldownRemaining > 0) this.shootCooldownRemaining -= deltaSec;

    if (this.isAiming) {
      this.aimTimer -= deltaSec;

      // Draw laser aim telegraph
      this.laserGraphic.clear();
      const isFrost = this.variant === 'frost_mage' || this.variant === 'frost_knight';
      this.laserGraphic.lineStyle(1.5, isFrost ? 0x38bdf8 : 0xef4444, 0.7);
      this.laserGraphic.beginPath();
      this.laserGraphic.moveTo(this.sprite.x, this.sprite.y);
      this.laserGraphic.lineTo(
        this.sprite.x + Math.cos(this.lockedAngle) * 280,
        this.sprite.y + Math.sin(this.lockedAngle) * 280
      );
      this.laserGraphic.strokePath();

      if (this.aimTimer <= 0) {
        this.isAiming = false;
        this.laserGraphic.clear();
        this.shootCooldownRemaining = this.variant === 'frost_knight' ? 2.0 : 2.2;

        audio.playEnemyShoot();
        if (this.variant === 'frost_knight') {
          // Frost Knight fires a tight 3-shard glacial fan that slows the player
          for (const offset of [-0.22, 0, 0.22]) {
            pool.spawn({
              x: this.sprite.x + Math.cos(this.lockedAngle + offset) * 16,
              y: this.sprite.y + Math.sin(this.lockedAngle + offset) * 16,
              angleRad: this.lockedAngle + offset,
              speed: 330,
              damage: 2,
              isPlayer: false,
              element: 'frost',
              texture: 'bullet_enemy_frost',
              range: 480
            });
          }
        } else if (this.variant === 'frost_mage') {
          // Frost mage fires 2 chilled ice shards that briefly slow the player
          for (const offset of [-0.14, 0.14]) {
            pool.spawn({
              x: this.sprite.x + Math.cos(this.lockedAngle + offset) * 16,
              y: this.sprite.y + Math.sin(this.lockedAngle + offset) * 16,
              angleRad: this.lockedAngle + offset,
              speed: 310,
              damage: 1,
              isPlayer: false,
              element: 'frost',
              texture: 'bullet_enemy_frost',
              range: 460
            });
          }
        } else {
          // Fire laser bolt
          pool.spawn({
            x: this.sprite.x + Math.cos(this.lockedAngle) * 16,
            y: this.sprite.y + Math.sin(this.lockedAngle) * 16,
            angleRad: this.lockedAngle,
            speed: 460,
            damage: 2,
            isPlayer: false,
            texture: 'bullet_enemy_laser',
            range: 500
          });
        }
      }
      return;
    }

    this.laserGraphic.clear();

    // Start aiming if in range and ready
    if (dist <= 320 && this.shootCooldownRemaining <= 0) {
      this.isAiming = true;
      this.aimTimer = 0.65; // 0.65s aim telegraph
      this.lockedAngle = Math.atan2(dy, dx);
      return;
    }

    // Kite behavior: if too close (<180px), back away; if too far (>280px), approach
    if (dist < 180) {
      // Retreat
      this.moveTowardsWithObstacleAvoidance(this.sprite.x - dx, this.sprite.y - dy, deltaSec, walls, this.speed * 0.8);
    } else if (dist > 280) {
      // Approach
      this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls);
    }
  }

  public override destroy(): void {
    this.laserGraphic.destroy();
    super.destroy();
  }
}
