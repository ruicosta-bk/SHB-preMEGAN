import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';

export class EnemyGrunt extends EnemyBase {
  private attackCooldown: number = 1.2;
  private attackTimer: number = 0;
  private isWindup: boolean = false;
  private windupTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_grunt', 14, 110);
  }

  public getEnemyType(): string {
    return 'grunt';
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

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (this.attackTimer > 0) this.attackTimer -= deltaSec;

    if (this.isWindup) {
      this.windupTimer -= deltaSec;
      // Telegraph pulse (red-white)
      this.sprite.setTint(Math.floor(this.windupTimer * 20) % 2 === 0 ? 0xff4444 : 0xffffff);

      if (this.windupTimer <= 0) {
        this.isWindup = false;
        this.sprite.clearTint();
        this.attackTimer = this.attackCooldown;

        // Perform melee swipe check if still within range
        if (dist <= 36) {
          pool.spawn({
            x: this.sprite.x + (dx / dist) * 16,
            y: this.sprite.y + (dy / dist) * 16,
            angleRad: Math.atan2(dy, dx),
            speed: 120,
            damage: 2,
            isPlayer: false,
            texture: 'bullet_enemy_orb',
            range: 30
          });
        }
      }
      return;
    }

    // If within strike distance and ready, start windup
    if (dist <= 32 && this.attackTimer <= 0) {
      this.isWindup = true;
      this.windupTimer = 0.35; // 0.35s windup telegraph
      return;
    }

    // Move towards player avoiding obstacles
    this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls);
  }
}
