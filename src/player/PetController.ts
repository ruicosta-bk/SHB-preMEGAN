import Phaser from 'phaser';
import { EnemyBase } from '../enemies/EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { PickupItem } from '../world/RoomManager';

export class PetController {
  private scene: Phaser.Scene;
  public sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Sprite;

  private animTimer: number = 0;
  private animFrame: boolean = false;
  private fireCooldown: number = 1.0;
  private shieldBlockCooldown: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.shadow = scene.add.sprite(x - 28, y + 10, 'shadow').setScale(0.75).setDepth(8);
    this.sprite = scene.add.sprite(x - 28, y + 4, 'pet_golem_1').setDepth(9);
  }

  public update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    enemies: EnemyBase[],
    pool: ProjectilePool,
    pickups: PickupItem[]
  ): void {
    // 1. Follow behind-left/right of player smoothly
    const targetX = playerX - 28;
    const targetY = playerY + 12;
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      const followRate = Math.min(1, deltaSec * 6.5);
      this.sprite.x += dx * followRate;
      this.sprite.y += dy * followRate;
      if (Math.abs(dx) > 1) {
        this.sprite.setFlipX(dx < 0);
      }

      this.animTimer += deltaSec;
      if (this.animTimer >= 0.2) {
        this.animTimer = 0;
        this.animFrame = !this.animFrame;
        this.sprite.setTexture(this.animFrame ? 'pet_golem_2' : 'pet_golem_1');
      }
    } else {
      this.sprite.setTexture('pet_golem_1');
    }

    this.shadow.setPosition(this.sprite.x, this.sprite.y + 8);

    // 2. Magnetize nearby coins strongly toward player
    for (const p of pickups) {
      if (p.type !== 'coin') continue;
      const cDist = Math.hypot(playerX - p.sprite.x, playerY - p.sprite.y);
      if (cDist > 24 && cDist < 180) {
        const ang = Math.atan2(playerY - p.sprite.y, playerX - p.sprite.x);
        p.sprite.x += Math.cos(ang) * 260 * deltaSec;
        p.sprite.y += Math.sin(ang) * 260 * deltaSec;
      }
    }

    // 3. Occasional enemy bullet guard (every 6s)
    if (this.shieldBlockCooldown > 0) {
      this.shieldBlockCooldown -= deltaSec;
    } else {
      for (const proj of pool.getActiveProjectiles()) {
        if (proj.isPlayer) continue;
        const pDist = Math.hypot(proj.sprite.x - this.sprite.x, proj.sprite.y - this.sprite.y);
        if (pDist < 22) {
          pool.deactivate(proj);
          this.shieldBlockCooldown = 6.0;
          const spark = this.scene.add.circle(this.sprite.x, this.sprite.y, 12, 0x38bdf8, 0.7).setDepth(18);
          this.scene.tweens.add({
            targets: spark,
            alpha: 0,
            scale: 1.6,
            duration: 240,
            onComplete: () => spark.destroy()
          });
          break;
        }
      }
    }

    // 4. Fire mini bolt at nearest living enemy within 260px
    if (this.fireCooldown > 0) {
      this.fireCooldown -= deltaSec;
    }
    if (this.fireCooldown <= 0 && enemies.length > 0) {
      let nearest: EnemyBase | null = null;
      let nearestDist = 260;
      for (const e of enemies) {
        if (e.isDead) continue;
        const eDist = Math.hypot(e.sprite.x - this.sprite.x, e.sprite.y - this.sprite.y);
        if (eDist < nearestDist) {
          nearestDist = eDist;
          nearest = e;
        }
      }

      if (nearest) {
        this.fireCooldown = 1.35;
        const angle = Math.atan2(nearest.sprite.y - this.sprite.y, nearest.sprite.x - this.sprite.x);
        this.sprite.setFlipX(Math.cos(angle) < 0);
        pool.spawn({
          x: this.sprite.x + Math.cos(angle) * 10,
          y: this.sprite.y + Math.sin(angle) * 10,
          angleRad: angle,
          speed: 380,
          damage: 2,
          isPlayer: true,
          isCrit: false,
          texture: 'bullet_player_pistol',
          range: 300,
          tint: 0xfacc15
        });
      }
    }
  }

  public destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
