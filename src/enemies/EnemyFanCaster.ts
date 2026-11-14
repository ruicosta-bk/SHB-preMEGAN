import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { audio } from '../core/AudioSystem';

export class EnemyFanCaster extends EnemyBase {
  private castCooldown: number = 2.4;
  private castTimer: number = 1.0;
  private isCasting: boolean = false;
  private windupTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_fan_caster', 16, 65);
  }

  public getEnemyType(): string {
    return 'fan_caster';
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

    if (this.castTimer > 0) this.castTimer -= deltaSec;

    if (this.isCasting) {
      this.windupTimer -= deltaSec;
      // Visual flare
      this.sprite.setTint(Math.floor(this.windupTimer * 15) % 2 === 0 ? 0xf97316 : 0xfef08a);

      if (this.windupTimer <= 0) {
        this.isCasting = false;
        this.sprite.clearTint();
        this.castTimer = this.castCooldown;

        // Fire 5-way spread with wide dodge gaps (spread 48 degrees total, 12 deg between pellets)
        const baseAngle = Math.atan2(dy, dx);
        const count = 5;
        const totalSpread = Phaser.Math.DegToRad(48);

        audio.playEnemyShoot();
        for (let i = 0; i < count; i++) {
          const offset = (i / (count - 1) - 0.5) * totalSpread;
          const bulletAngle = baseAngle + offset;
          pool.spawn({
            x: this.sprite.x + Math.cos(bulletAngle) * 14,
            y: this.sprite.y + Math.sin(bulletAngle) * 14,
            angleRad: bulletAngle,
            speed: 210,
            damage: 1,
            isPlayer: false,
            texture: 'bullet_enemy_orb',
            range: 420
          });
        }
      }
      return;
    }

    if (dist <= 300 && this.castTimer <= 0) {
      this.isCasting = true;
      this.windupTimer = 0.5; // 0.5s windup telegraph
      return;
    }

    // Wander towards player
    if (dist > 180) {
      this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls);
    }
  }
}
