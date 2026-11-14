import Phaser from 'phaser';
import { EnemyBase } from '../enemies/EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { PickupItem } from '../world/RoomManager';
import { audio } from '../core/AudioSystem';

export class PetController {
  private scene: Phaser.Scene;
  public sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Sprite;
  private guardRing: Phaser.GameObjects.Graphics;

  private animTimer: number = 0;
  private animFrame: boolean = false;
  private bobPhase: number = 0;
  private attackCooldown: number = 1.2;
  private shieldBlockCooldown: number = 0;

  private state: 'follow' | 'pounce' | 'return' = 'follow';
  private pounceTarget: EnemyBase | null = null;
  private pounceTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.shadow = scene.add.sprite(x - 28, y + 10, 'shadow').setScale(0.7).setDepth(8);
    this.sprite = scene.add.sprite(x - 28, y + 4, 'pet_golem_1').setDepth(9);
    this.guardRing = scene.add.graphics().setDepth(8);
  }

  public resetPosition(x: number, y: number): void {
    this.state = 'follow';
    this.pounceTarget = null;
    this.sprite.setPosition(x - 28, y + 4);
    this.shadow.setPosition(x - 28, y + 10);
    this.guardRing.clear();
  }

  public update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    enemies: EnemyBase[],
    pool: ProjectilePool,
    pickups: PickupItem[]
  ): void {
    this.bobPhase += deltaSec * 6.5;

    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaSec;
    }

    // 1. State Machine: Follow <-> Melee Pounce <-> Return
    const homeX = playerX - 28;
    const homeY = playerY + 12;

    if (this.state === 'follow') {
      const dx = homeX - this.sprite.x;
      const dy = homeY - this.sprite.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 8) {
        const followRate = Math.min(1, deltaSec * 7.0);
        this.sprite.x += dx * followRate;
        this.sprite.y += dy * followRate;
        if (Math.abs(dx) > 1) {
          this.sprite.setFlipX(dx < 0);
        }
        this.stepWalkAnim(deltaSec);
      } else {
        this.sprite.setTexture('pet_golem_1');
        this.sprite.setScale(1.0, 1.0 + Math.sin(this.bobPhase) * 0.05);
      }

      // Trigger melee pounce if enemy within 195px
      if (this.attackCooldown <= 0 && enemies.length > 0) {
        let nearest: EnemyBase | null = null;
        let nearestDist = 195;
        for (const e of enemies) {
          if (e.isDead) continue;
          const eDist = Math.hypot(e.sprite.x - playerX, e.sprite.y - playerY);
          if (eDist < nearestDist) {
            nearestDist = eDist;
            nearest = e;
          }
        }
        if (nearest) {
          this.state = 'pounce';
          this.pounceTarget = nearest;
          this.pounceTimer = 0.55;
        }
      }
    } else if (this.state === 'pounce') {
      this.pounceTimer -= deltaSec;
      const target = this.pounceTarget;
      if (!target || target.isDead || this.pounceTimer <= 0) {
        this.state = 'return';
        this.pounceTarget = null;
      } else {
        const dx = target.sprite.x - this.sprite.x;
        const dy = target.sprite.y - this.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 22) {
          // Execute clean melee bite / shock bump
          const len = dist || 1;
          target.takeDamage({
            amount: 3,
            isCrit: false,
            knockback: { x: dx / len, y: dy / len, force: 110 },
            isPlayerAttack: true
          });
          this.spawnBiteVfx(target.sprite.x, target.sprite.y, Math.atan2(dy, dx));
          audio.playHitEnemy();
          this.attackCooldown = 1.6;
          this.state = 'return';
          this.pounceTarget = null;
        } else {
          const speed = 430;
          this.sprite.x += (dx / dist) * speed * deltaSec;
          this.sprite.y += (dy / dist) * speed * deltaSec;
          this.sprite.setFlipX(dx < 0);
          this.sprite.setTexture('pet_golem_2');
          this.sprite.setScale(1.12, 0.88);
        }
      }
    } else if (this.state === 'return') {
      const dx = homeX - this.sprite.x;
      const dy = homeY - this.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 16) {
        this.state = 'follow';
        this.sprite.setScale(1.0, 1.0);
      } else {
        const speed = 340;
        this.sprite.x += (dx / dist) * speed * deltaSec;
        this.sprite.y += (dy / dist) * speed * deltaSec;
        this.sprite.setFlipX(dx < 0);
        this.stepWalkAnim(deltaSec);
      }
    }

    this.shadow.setPosition(this.sprite.x, this.sprite.y + 9);

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

    // 3. Occasional enemy bullet guard (every 6s) with subtle ready indicator
    this.guardRing.clear();
    if (this.shieldBlockCooldown > 0) {
      this.shieldBlockCooldown -= deltaSec;
    } else {
      this.guardRing.lineStyle(1, 0x38bdf8, 0.35);
      this.guardRing.strokeCircle(this.sprite.x, this.sprite.y, 14);

      for (const proj of pool.getActiveProjectiles()) {
        if (proj.isPlayer) continue;
        const pDist = Math.hypot(proj.sprite.x - this.sprite.x, proj.sprite.y - this.sprite.y);
        if (pDist < 22) {
          pool.deactivate(proj);
          this.shieldBlockCooldown = 6.0;
          audio.playParryBullet();
          const spark = this.scene.add.circle(this.sprite.x, this.sprite.y, 14, 0x38bdf8, 0.65).setDepth(18);
          this.scene.tweens.add({
            targets: spark,
            alpha: 0,
            scale: 1.7,
            duration: 240,
            onComplete: () => spark.destroy()
          });
          break;
        }
      }
    }
  }

  private stepWalkAnim(deltaSec: number): void {
    this.animTimer += deltaSec;
    if (this.animTimer >= 0.14) {
      this.animTimer = 0;
      this.animFrame = !this.animFrame;
      this.sprite.setTexture(this.animFrame ? 'pet_golem_2' : 'pet_golem_1');
    }
    this.sprite.setScale(1.0, 1.0 + Math.abs(Math.sin(this.bobPhase)) * 0.08);
  }

  private spawnBiteVfx(x: number, y: number, angle: number): void {
    const gfx = this.scene.add.graphics().setDepth(18);
    gfx.lineStyle(3, 0xfacc15, 0.95);
    gfx.beginPath();
    gfx.arc(x, y, 14, angle - 0.9, angle + 0.9);
    gfx.strokePath();
    gfx.lineStyle(1.5, 0xffffff, 1.0);
    gfx.beginPath();
    gfx.arc(x, y, 11, angle - 0.6, angle + 0.6);
    gfx.strokePath();

    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 160,
      onComplete: () => gfx.destroy()
    });
  }

  public destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.guardRing.destroy();
  }
}
