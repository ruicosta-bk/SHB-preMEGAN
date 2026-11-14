import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { DamageInfo, DamageResult } from '../types/entity';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

export class BossIgnis extends EnemyBase {
  public phase: number = 1;
  private attackState: 'idle' | 'radial' | 'spiral' | 'slam_windup' | 'slam_execute' | 'vulnerable' = 'idle';
  private stateTimer: number = 2.0; // Initial delay so player has time to prepare
  private currentAttackIndex: number = 0;

  // Spiral state
  private spiralAngle: number = 0;
  private spiralBulletsFired: number = 0;
  private spiralTimer: number = 0;

  // Slam state
  private slamTargetX: number = 0;
  private slamTargetY: number = 0;
  private slamGraphic: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boss_ignis_p1', 150, 45);
    this.shadow.setScale(1.8, 1.4);
    this.sprite.setScale(1.2);
    this.slamGraphic = scene.add.graphics().setDepth(11);

    audio.playBossAlert();
    this.emitBossStats();
  }

  public getEnemyType(): string {
    return 'boss_ignis';
  }

  public override takeDamage(damage: DamageInfo): DamageResult {
    if (this.isDead) {
      return { actualDamage: 0, absorbedByArmor: 0, hpDamage: 0, isDead: true, overkill: 0 };
    }

    const amt = Math.max(0, damage.amount);
    this.hp -= amt;
    this.hitFlashTimer = 0.1;
    this.sprite.setTint(0xffffff);
    audio.playHitEnemy();

    // Check Phase 1 -> Phase 2 transition
    if (this.phase === 1 && this.hp <= 0) {
      this.phase = 2;
      this.hp = 120;
      this.maxHp = 120;
      this.sprite.setTexture('boss_ignis_p2');
      this.sprite.setTint(0xff6666);
      this.attackState = 'vulnerable';
      this.stateTimer = 2.0;

      audio.playBossAlert();

      // Camera shake on phase transition
      this.scene.cameras.main.shake(300, 0.015);
      this.emitBossStats();
      return { actualDamage: amt, absorbedByArmor: 0, hpDamage: amt, isDead: false, overkill: 0 };
    }

    this.emitBossStats();

    if (this.hp <= 0) {
      this.isDead = true;
      events.emit('combat:boss-stats', {
        currentHp: 0,
        maxHp: this.maxHp,
        phase: this.phase,
        nameVi: 'Ignis Ignifer',
        isDead: true
      });
      this.onDeath();
      return { actualDamage: amt, absorbedByArmor: 0, hpDamage: amt, isDead: true, overkill: Math.abs(this.hp) };
    }

    return { actualDamage: amt, absorbedByArmor: 0, hpDamage: amt, isDead: false, overkill: 0 };
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
      this.slamGraphic.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;

    this.stateTimer -= deltaSec;

    switch (this.attackState) {
      case 'idle':
        this.slamGraphic.clear();
        // Move slowly towards arena center
        if (this.stateTimer <= 0) {
          // Choose next attack in rotation
          const attacks = ['radial', 'spiral', 'slam_windup'];
          this.currentAttackIndex = (this.currentAttackIndex + 1) % attacks.length;
          const nextAtk = attacks[this.currentAttackIndex];

          if (nextAtk === 'radial') {
            this.attackState = 'radial';
            this.executeRadialNova(playerX, playerY, pool);
            this.attackState = 'vulnerable';
            this.stateTimer = this.phase === 1 ? 1.6 : 1.3;
          } else if (nextAtk === 'spiral') {
            this.attackState = 'spiral';
            this.spiralAngle = Math.atan2(dy, dx);
            this.spiralBulletsFired = 0;
            this.spiralTimer = 0;
            this.stateTimer = this.phase === 1 ? 1.5 : 1.8;
          } else if (nextAtk === 'slam_windup') {
            this.attackState = 'slam_windup';
            this.slamTargetX = playerX;
            this.slamTargetY = playerY;
            this.stateTimer = this.phase === 1 ? 0.9 : 0.7; // Telegraph duration
          }
        }
        break;

      case 'spiral':
        this.spiralTimer += deltaSec;
        const fireInterval = this.phase === 1 ? 0.08 : 0.06;
        if (this.spiralTimer >= fireInterval && this.spiralBulletsFired < (this.phase === 1 ? 18 : 28)) {
          this.spiralTimer = 0;
          this.spiralBulletsFired++;
          const angleStep = (Math.PI * 2) / 10;
          this.spiralAngle += 0.28;

          audio.playEnemyShoot();
          // Fire spiral arm 1
          pool.spawn({
            x: this.sprite.x,
            y: this.sprite.y,
            angleRad: this.spiralAngle,
            speed: this.phase === 1 ? 180 : 220,
            damage: 2,
            isPlayer: false,
            texture: 'bullet_enemy_orb',
            range: 450
          });

          // In phase 2, fire counter-rotating second arm
          if (this.phase === 2) {
            pool.spawn({
              x: this.sprite.x,
              y: this.sprite.y,
              angleRad: -this.spiralAngle + Math.PI,
              speed: 210,
              damage: 2,
              isPlayer: false,
              texture: 'bullet_boss_orb',
              range: 450
            });
          }
        }

        if (this.stateTimer <= 0) {
          this.attackState = 'vulnerable';
          this.stateTimer = this.phase === 1 ? 1.5 : 1.2;
        }
        break;

      case 'slam_windup':
        // Draw expanding ground warning circle at target location
        this.slamGraphic.clear();
        this.slamGraphic.lineStyle(2.5, 0xef4444, 0.9);
        this.slamGraphic.strokeCircle(this.slamTargetX, this.slamTargetY, 55);
        this.slamGraphic.fillStyle(0xef4444, 0.2);
        this.slamGraphic.fillCircle(this.slamTargetX, this.slamTargetY, 55);

        // Hover slightly up
        this.sprite.y -= 0.5;

        if (this.stateTimer <= 0) {
          this.slamGraphic.clear();
          this.attackState = 'slam_execute';
          this.executeSlam(pool);
          this.attackState = 'vulnerable';
          this.stateTimer = this.phase === 1 ? 1.8 : 1.4;
        }
        break;

      case 'vulnerable':
        this.slamGraphic.clear();
        // Boss pauses to catch breath / gather ether (perfect window to attack!)
        this.sprite.setAlpha(0.85);
        if (this.stateTimer <= 0) {
          this.sprite.setAlpha(1.0);
          this.attackState = 'idle';
          this.stateTimer = 0.5;
        }
        break;
    }
  }

  private executeRadialNova(playerX: number, playerY: number, pool: ProjectilePool): void {
    const totalBullets = 14;
    const baseAngle = Math.atan2(playerY - this.sprite.y, playerX - this.sprite.x);
    audio.playShootShotgun();

    // 14 pellets around the ring, with 2 deliberate gap sectors for player to dodge through
    for (let i = 0; i < totalBullets; i++) {
      // Create safe gaps at index 3 and index 10
      if (i === 3 || i === 10) continue;

      const angle = baseAngle + (i / totalBullets) * Math.PI * 2;
      pool.spawn({
        x: this.sprite.x + Math.cos(angle) * 25,
        y: this.sprite.y + Math.sin(angle) * 25,
        angleRad: angle,
        speed: this.phase === 1 ? 190 : 230,
        damage: 2,
        isPlayer: false,
        texture: 'bullet_boss_orb',
        range: 480
      });
    }
  }

  private executeSlam(pool: ProjectilePool): void {
    // Teleport/Leap to target position
    this.sprite.setPosition(this.slamTargetX, this.slamTargetY);
    this.shadow.setPosition(this.slamTargetX, this.slamTargetY + 8);

    audio.playShootShotgun();
    this.scene.cameras.main.shake(200, 0.012);

    // Shockwave ring of 8 expanding pellets
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      pool.spawn({
        x: this.sprite.x,
        y: this.sprite.y,
        angleRad: angle,
        speed: 150,
        damage: 3,
        isPlayer: false,
        texture: 'bullet_enemy_orb',
        range: 220
      });
    }
  }

  private emitBossStats(): void {
    events.emit('combat:boss-stats', {
      currentHp: Math.max(0, this.hp),
      maxHp: this.maxHp,
      phase: this.phase,
      nameVi: 'Ignis Ignifer - Đại Pháp Sư Luyện Kim',
      isDead: this.isDead
    });
  }

  public override destroy(): void {
    this.slamGraphic.destroy();
    super.destroy();
  }
}
