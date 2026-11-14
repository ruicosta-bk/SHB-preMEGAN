import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { audio } from '../core/AudioSystem';

export class EnemyCharger extends EnemyBase {
  private state: 'patrol' | 'windup' | 'charging' | 'recovery' = 'patrol';
  private timer: number = 0;
  private chargeAngle: number = 0;
  private chargeDistanceLeft: number = 0;
  private lineGraphic: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_charger', 28, 70);
    this.lineGraphic = scene.add.graphics().setDepth(11);
  }

  public getEnemyType(): string {
    return 'charger';
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
      this.lineGraphic.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    switch (this.state) {
      case 'patrol':
        this.lineGraphic.clear();
        // Slow advance towards player
        this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls);
        if (dist <= 260) {
          this.state = 'windup';
          this.timer = 0.55; // 0.55s telegraph
          this.chargeAngle = Math.atan2(dy, dx);
        }
        break;

      case 'windup':
        this.timer -= deltaSec;
        // Draw charge direction warning path
        this.lineGraphic.clear();
        this.lineGraphic.lineStyle(2, 0xf97316, 0.8);
        this.lineGraphic.beginPath();
        this.lineGraphic.moveTo(this.sprite.x, this.sprite.y);
        this.lineGraphic.lineTo(
          this.sprite.x + Math.cos(this.chargeAngle) * 320,
          this.sprite.y + Math.sin(this.chargeAngle) * 320
        );
        this.lineGraphic.strokePath();

        // Subtle vibration during telegraph (never drifts into walls)
        const jitterX = (Math.random() - 0.5) * 2.5;
        if (!this.checkWallCollision(this.sprite.x + jitterX, this.sprite.y, 20, 20, walls)) {
          this.sprite.x += jitterX;
        }

        if (this.timer <= 0) {
          this.state = 'charging';
          this.lineGraphic.clear();
          this.chargeDistanceLeft = 320;
          this.sprite.setTint(0xf97316);
          audio.playDash();
        }
        break;

      case 'charging': {
        const step = 420 * deltaSec;
        this.chargeDistanceLeft -= step;
        const nextX = this.sprite.x + Math.cos(this.chargeAngle) * step;
        const nextY = this.sprite.y + Math.sin(this.chargeAngle) * step;

        // Check if hitting wall
        if (this.checkWallCollision(nextX, nextY, 24, 24, walls) || this.chargeDistanceLeft <= 0) {
          this.state = 'recovery';
          this.timer = 1.2; // 1.2s stunned recovery
          this.sprite.setTint(0x71717a);
        } else {
          this.sprite.x = nextX;
          this.sprite.y = nextY;

          // Check hit player with bullet hitbox
          if (dist <= 30) {
            pool.spawn({
              x: this.sprite.x,
              y: this.sprite.y,
              angleRad: this.chargeAngle,
              speed: 10,
              damage: 3,
              isPlayer: false,
              texture: 'bullet_enemy_orb',
              range: 15
            });
            this.state = 'recovery';
            this.timer = 1.2;
            this.sprite.setTint(0x71717a);
          }
        }
        break;
      }

      case 'recovery':
        this.lineGraphic.clear();
        this.timer -= deltaSec;
        // Flashing gray recovery
        if (this.timer <= 0) {
          this.state = 'patrol';
          this.sprite.clearTint();
        }
        break;
    }
  }

  public override destroy(): void {
    this.lineGraphic.destroy();
    super.destroy();
  }
}
