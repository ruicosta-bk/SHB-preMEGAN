import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { audio } from '../core/AudioSystem';

export class EnemyBomber extends EnemyBase {
  private isFusing: boolean = false;
  private fuseTimer: number = 0;
  private fuseDuration: number = 0.65;
  private isSelfDetonated: boolean = false;
  private fuseGraphic: Phaser.GameObjects.Graphics | null;
  private lastPool: ProjectilePool | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_bomber', 16, 134);
    this.fuseGraphic = scene.add.graphics().setDepth(11);
  }

  public getEnemyType(): string {
    return 'bomber';
  }

  public override update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    this.lastPool = pool;
    super.update(deltaSec, playerX, playerY, pool, walls, roomBounds);
    if (this.isDead) {
      this.fuseGraphic?.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (this.isFusing) {
      this.fuseTimer -= deltaSec;

      const progress = Phaser.Math.Clamp(1 - this.fuseTimer / this.fuseDuration, 0, 1);
      const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 10);
      const ringColor = pulse > 0.5 ? 0xef4444 : 0xf97316;

      if (this.fuseGraphic) {
        this.fuseGraphic.clear();
        this.fuseGraphic.lineStyle(2.5, ringColor, 0.75 + pulse * 0.25);
        this.fuseGraphic.strokeCircle(this.sprite.x, this.sprite.y, 58);
        this.fuseGraphic.fillStyle(ringColor, 0.14 + progress * 0.2);
        this.fuseGraphic.fillCircle(this.sprite.x, this.sprite.y, 58 * (0.35 + progress * 0.65));
      }

      this.sprite.setTint(pulse > 0.5 ? 0xf97316 : 0xffffff);

      if (this.fuseTimer <= 0) {
        this.detonate(pool);
      }
      return;
    }

    this.fuseGraphic?.clear();

    if (dist <= 64) {
      this.isFusing = true;
      this.fuseDuration = Math.max(0.42, 0.65 / this.attackRateScale);
      this.fuseTimer = this.fuseDuration;
      audio.playBomberFuse();
      return;
    }

    this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls);
  }

  private detonate(pool: ProjectilePool): void {
    if (this.isDead) return;
    this.isSelfDetonated = true;
    this.isDead = true;
    this.fuseGraphic?.clear();

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      pool.spawn({
        x: this.sprite.x + Math.cos(angle) * 10,
        y: this.sprite.y + Math.sin(angle) * 10,
        angleRad: angle,
        speed: 195,
        damage: 2 + this.bonusDamage,
        isPlayer: false,
        element: 'fire',
        texture: 'bullet_inferno',
        range: 175
      });
    }

    audio.playExplosion();
    this.scene.cameras.main.shake(150, 0.009);
    this.onDeath();
  }

  protected override onDeath(): void {
    this.fuseGraphic?.clear();
    if (!this.isSelfDetonated && this.lastPool) {
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + i * (Math.PI / 2);
        this.lastPool.spawn({
          x: this.sprite.x + Math.cos(angle) * 8,
          y: this.sprite.y + Math.sin(angle) * 8,
          angleRad: angle,
          speed: 175,
          damage: 2,
          isPlayer: false,
          element: 'fire',
          texture: 'bullet_inferno',
          range: 110
        });
      }
    }
    super.onDeath();
  }

  public override destroy(): void {
    if (this.fuseGraphic) {
      this.fuseGraphic.destroy();
      this.fuseGraphic = null;
    }
    super.destroy();
  }
}
