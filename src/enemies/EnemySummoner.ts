import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { audio } from '../core/AudioSystem';

export class EnemySummoner extends EnemyBase {
  private shootTimer: number = 1.4;
  private summonTimer: number = 2.8;
  private isSummoning: boolean = false;
  private runeTimer: number = 0;
  private readonly runeDuration: number = 0.75;
  private summonX: number = 0;
  private summonY: number = 0;
  private runeGraphic: Phaser.GameObjects.Graphics | null;
  private pendingSummons: { type: string; x: number; y: number }[] | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_summoner', 22, 68);
    this.runeGraphic = scene.add.graphics().setDepth(11);
  }

  public getEnemyType(): string {
    return 'summoner';
  }

  protected override onDifficultyScaled(): void {
    this.shootTimer = Math.max(0.7, this.shootTimer / this.attackRateScale);
    this.summonTimer = Math.max(1.4, this.summonTimer / this.attackRateScale);
  }

  public consumeSummonRequest(): { type: string; x: number; y: number }[] | null {
    const req = this.pendingSummons;
    this.pendingSummons = null;
    return req;
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
      this.runeGraphic?.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (this.shootTimer > 0) this.shootTimer -= deltaSec;
    if (this.summonTimer > 0 && !this.isSummoning) this.summonTimer -= deltaSec;

    // Handle active summon rune telegraph
    if (this.isSummoning) {
      this.runeTimer -= deltaSec;
      const progress = Phaser.Math.Clamp(1 - this.runeTimer / this.runeDuration, 0, 1);
      const pulse = 0.65 + 0.35 * Math.sin(progress * Math.PI * 6);

      if (this.runeGraphic) {
        this.runeGraphic.clear();
        this.runeGraphic.lineStyle(2, 0xa855f7, pulse);
        this.runeGraphic.strokeCircle(this.summonX, this.summonY, 20);
        this.runeGraphic.fillStyle(0x9333ea, 0.18 + progress * 0.2);
        this.runeGraphic.fillCircle(this.summonX, this.summonY, 16 * (0.4 + progress * 0.6));

        // Inner mystic cross-rune
        const r = 12;
        this.runeGraphic.lineStyle(1.5, 0xe879f9, pulse);
        this.runeGraphic.beginPath();
        this.runeGraphic.moveTo(this.summonX - r, this.summonY);
        this.runeGraphic.lineTo(this.summonX + r, this.summonY);
        this.runeGraphic.moveTo(this.summonX, this.summonY - r);
        this.runeGraphic.lineTo(this.summonX, this.summonY + r);
        this.runeGraphic.strokePath();
      }

      if (this.runeTimer <= 0) {
        this.isSummoning = false;
        this.runeGraphic?.clear();
        this.summonTimer = 5.2 / this.attackRateScale;
        this.pendingSummons = [{ type: 'grunt', x: this.summonX, y: this.summonY }];
      }
      return;
    }

    this.runeGraphic?.clear();

    // Summon cycle every ~5.2s / attackRateScale
    if (this.summonTimer <= 0 && dist <= 420) {
      this.isSummoning = true;
      this.runeTimer = this.runeDuration;
      const angle = Math.random() * Math.PI * 2;
      const offsetX = Math.cos(angle) * 38;
      const offsetY = Math.sin(angle) * 38;
      this.summonX = roomBounds
        ? Phaser.Math.Clamp(this.sprite.x + offsetX, roomBounds.minX + 12, roomBounds.maxX - 12)
        : this.sprite.x + offsetX;
      this.summonY = roomBounds
        ? Phaser.Math.Clamp(this.sprite.y + offsetY, roomBounds.minY + 12, roomBounds.maxY - 12)
        : this.sprite.y + offsetY;
      audio.playSummonChant();
      return;
    }

    // 3-orb dark fan every ~3.0s / attackRateScale
    if (this.shootTimer <= 0 && dist <= 340) {
      this.shootTimer = 3.0 / this.attackRateScale;
      const baseAngle = Math.atan2(dy, dx);
      audio.playEnemyShoot();
      for (const offset of [-0.24, 0, 0.24]) {
        const angle = baseAngle + offset;
        pool.spawn({
          x: this.sprite.x + Math.cos(angle) * 14,
          y: this.sprite.y + Math.sin(angle) * 14,
          angleRad: angle,
          speed: 215,
          damage: 2 + this.bonusDamage,
          isPlayer: false,
          texture: 'bullet_dark_orb',
          range: 440
        });
      }
    }

    // Maintain spacing: kite slowly away if < 135, advance if > 260
    if (dist < 135) {
      this.moveTowardsWithObstacleAvoidance(
        this.sprite.x - dx,
        this.sprite.y - dy,
        deltaSec,
        walls,
        this.speed * 0.85
      );
    } else if (dist > 260) {
      this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls);
    }
  }

  protected override onDeath(): void {
    this.isSummoning = false;
    this.pendingSummons = null;
    this.runeGraphic?.clear();
    super.onDeath();
  }

  public override destroy(): void {
    if (this.runeGraphic) {
      this.runeGraphic.destroy();
      this.runeGraphic = null;
    }
    super.destroy();
  }
}
