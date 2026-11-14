import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { DamageInfo, DamageResult } from '../types/entity';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

export class BossIgnis extends EnemyBase {
  public phase: number = 1;
  private attackState: 'idle' | 'radial' | 'spiral' | 'cross' | 'slam_windup' | 'slam_execute' | 'vulnerable' = 'idle';
  private stateTimer: number = 1.4; // Initial delay so player enters safely
  private currentAttackIndex: number = 0;

  // Spiral & Cross barrage state
  private spiralAngle: number = 0;
  private spiralBulletsFired: number = 0;
  private spiralTimer: number = 0;
  private crossBurstsLeft: number = 0;
  private crossTimer: number = 0;

  // Slam state
  private slamTargetX: number = 0;
  private slamTargetY: number = 0;
  private slamGraphic: Phaser.GameObjects.Graphics;
  private pendingSummons: { type: string; x: number; y: number }[] | null = null;

  private stage: number = 1;
  private bossNameVi: string = 'Ignis Ignifer - Đại Pháp Sư Luyện Kim';

  constructor(scene: Phaser.Scene, x: number, y: number, stage: number = 1, bossNameVi?: string) {
    const p1Hp = 165 + (stage - 1) * 55;
    super(scene, x, y, 'boss_ignis_p1', p1Hp, 72 + (stage - 1) * 10);
    this.stage = stage;
    if (bossNameVi) this.bossNameVi = bossNameVi;
    if (stage === 2) {
      this.sprite.setTint(0x67e8f9);
    }
    this.shadow.setScale(1.8, 1.4);
    this.sprite.setScale(1.2);
    this.slamGraphic = scene.add.graphics().setDepth(11);

    audio.playBossAlert();
    this.emitBossStats();
  }

  public getEnemyType(): string {
    return 'boss_ignis';
  }

  public consumeSummonRequest(): { type: string; x: number; y: number }[] | null {
    const req = this.pendingSummons;
    this.pendingSummons = null;
    return req;
  }

  public override takeDamage(damage: DamageInfo): DamageResult {
    if (this.isDead) {
      return { actualDamage: 0, absorbedByArmor: 0, hpDamage: 0, isDead: true, overkill: 0 };
    }

    const amt = Math.max(0, damage.amount);
    this.hp -= amt;
    this.hitFlashTimer = 0.08;
    this.sprite.setTint(0xffffff);
    audio.playHitEnemy();

    // Check Phase 1 -> Phase 2 transition
    if (this.phase === 1 && this.hp <= 0) {
      this.phase = 2;
      const p2Hp = 140 + (this.stage - 1) * 50;
      this.hp = p2Hp;
      this.maxHp = p2Hp;
      this.speed = 92 + (this.stage - 1) * 12;
      this.sprite.setTexture('boss_ignis_p2');
      this.sprite.setTint(this.stage === 2 ? 0x38bdf8 : 0xff6666);
      this.attackState = 'vulnerable';
      this.stateTimer = 0.85;

      // Summon biome guards when entering enraged Phase 2
      const guardA = this.stage === 2 ? 'frost_mage' : this.stage >= 3 ? 'fan_caster' : 'shooter';
      const guardB = this.stage === 2 ? 'frost_knight' : this.stage >= 3 ? 'charger' : 'grunt';
      this.pendingSummons = [
        { type: guardA, x: this.sprite.x - 68, y: this.sprite.y - 24 },
        { type: guardB, x: this.sprite.x + 68, y: this.sprite.y + 24 }
      ];

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
        nameVi: this.bossNameVi,
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
    const dist = Math.hypot(dx, dy);

    this.stateTimer -= deltaSec;

    switch (this.attackState) {
      case 'idle':
        this.slamGraphic.clear();
        // Actively reposition/circle around player instead of standing still
        if (dist > 110) {
          this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed);
        } else if (dist > 1) {
          const strafeX = this.sprite.x + (-dy / dist) * 60;
          const strafeY = this.sprite.y + (dx / dist) * 60;
          this.moveTowardsWithObstacleAvoidance(strafeX, strafeY, deltaSec, walls, this.speed * 0.9);
        }

        if (this.stateTimer <= 0) {
          const attacks = ['radial', 'spiral', 'cross', 'slam_windup'] as const;
          this.currentAttackIndex = (this.currentAttackIndex + 1) % attacks.length;
          const nextAtk = attacks[this.currentAttackIndex];

          if (nextAtk === 'radial') {
            this.attackState = 'radial';
            this.executeRadialNova(playerX, playerY, pool);
            this.attackState = 'vulnerable';
            this.stateTimer = this.phase === 1 ? 0.95 : 0.7;
          } else if (nextAtk === 'spiral') {
            this.attackState = 'spiral';
            this.spiralAngle = Math.atan2(dy, dx);
            this.spiralBulletsFired = 0;
            this.spiralTimer = 0;
            this.stateTimer = this.phase === 1 ? 1.5 : 1.8;
          } else if (nextAtk === 'cross') {
            this.attackState = 'cross';
            this.crossBurstsLeft = this.phase === 1 ? 3 : 4;
            this.crossTimer = 0;
            this.spiralAngle = Math.atan2(dy, dx);
            this.stateTimer = 1.6;
          } else if (nextAtk === 'slam_windup') {
            this.attackState = 'slam_windup';
            this.slamTargetX = roomBounds ? Phaser.Math.Clamp(playerX, roomBounds.minX + 12, roomBounds.maxX - 12) : playerX;
            this.slamTargetY = roomBounds ? Phaser.Math.Clamp(playerY, roomBounds.minY + 12, roomBounds.maxY - 12) : playerY;
            this.stateTimer = this.phase === 1 ? 0.75 : 0.6;
          }
        }
        break;

      case 'spiral':
        this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed * 0.55);
        this.spiralTimer += deltaSec;
        const fireInterval = this.phase === 1 ? 0.075 : 0.055;
        if (this.spiralTimer >= fireInterval && this.spiralBulletsFired < (this.phase === 1 ? 20 : 30)) {
          this.spiralTimer = 0;
          this.spiralBulletsFired++;
          this.spiralAngle += 0.34;

          audio.playEnemyShoot();
          pool.spawn({
            x: this.sprite.x,
            y: this.sprite.y,
            angleRad: this.spiralAngle,
            speed: this.phase === 1 ? 200 : 240,
            damage: 2,
            isPlayer: false,
            texture: 'bullet_enemy_orb',
            range: 460
          });

          if (this.phase === 2) {
            pool.spawn({
              x: this.sprite.x,
              y: this.sprite.y,
              angleRad: this.spiralAngle + (Math.PI * 2) / 3,
              speed: 230,
              damage: 2,
              isPlayer: false,
              texture: 'bullet_boss_orb',
              range: 460
            });
            pool.spawn({
              x: this.sprite.x,
              y: this.sprite.y,
              angleRad: this.spiralAngle + (Math.PI * 4) / 3,
              speed: 230,
              damage: 2,
              isPlayer: false,
              texture: 'bullet_boss_orb',
              range: 460
            });
          }
        }

        if (this.stateTimer <= 0) {
          this.attackState = 'vulnerable';
          this.stateTimer = this.phase === 1 ? 0.9 : 0.65;
        }
        break;

      case 'cross':
        this.crossTimer -= deltaSec;
        if (this.crossTimer <= 0 && this.crossBurstsLeft > 0) {
          this.crossBurstsLeft--;
          this.crossTimer = this.phase === 1 ? 0.38 : 0.28;
          this.spiralAngle += Math.PI / 4;
          const arms = this.phase === 1 ? 4 : 6;
          audio.playShootShotgun();
          for (let i = 0; i < arms; i++) {
            const ang = this.spiralAngle + (i / arms) * Math.PI * 2;
            pool.spawn({
              x: this.sprite.x + Math.cos(ang) * 18,
              y: this.sprite.y + Math.sin(ang) * 18,
              angleRad: ang,
              speed: this.phase === 1 ? 250 : 285,
              damage: 2,
              isPlayer: false,
              texture: 'bullet_enemy_laser',
              range: 480
            });
          }
        }
        if (this.crossBurstsLeft <= 0 && this.stateTimer <= 0) {
          this.attackState = 'vulnerable';
          this.stateTimer = this.phase === 1 ? 0.9 : 0.65;
        }
        break;

      case 'slam_windup':
        this.slamGraphic.clear();
        this.slamGraphic.lineStyle(2.5, 0xef4444, 0.95);
        this.slamGraphic.strokeCircle(this.slamTargetX, this.slamTargetY, 54);
        this.slamGraphic.fillStyle(0xef4444, 0.22);
        this.slamGraphic.fillCircle(this.slamTargetX, this.slamTargetY, 54);

        this.sprite.y -= 0.4;

        if (this.stateTimer <= 0) {
          this.slamGraphic.clear();
          this.attackState = 'slam_execute';
          this.executeSlam(playerX, playerY, pool, walls, roomBounds);
          this.attackState = 'vulnerable';
          this.stateTimer = this.phase === 1 ? 1.0 : 0.75;
        }
        break;

      case 'vulnerable':
        this.slamGraphic.clear();
        this.sprite.setAlpha(0.9);
        if (this.stateTimer <= 0) {
          this.sprite.setAlpha(1.0);
          this.attackState = 'idle';
          this.stateTimer = this.phase === 1 ? 0.55 : 0.35;
        }
        break;
    }
  }

  private executeRadialNova(playerX: number, playerY: number, pool: ProjectilePool): void {
    const totalBullets = this.phase === 1 ? 14 : 18;
    const baseAngle = Math.atan2(playerY - this.sprite.y, playerX - this.sprite.x);
    audio.playShootShotgun();

    // Outer ring with deliberate safe dodge sectors
    for (let i = 0; i < totalBullets; i++) {
      if (i % 7 === 3) continue;

      const angle = baseAngle + (i / totalBullets) * Math.PI * 2;
      pool.spawn({
        x: this.sprite.x + Math.cos(angle) * 24,
        y: this.sprite.y + Math.sin(angle) * 24,
        angleRad: angle,
        speed: this.phase === 1 ? 205 : 245,
        damage: 2,
        isPlayer: false,
        texture: 'bullet_boss_orb',
        range: 480
      });
    }

    // Plus a tight aimed 3-round volley directly toward player
    for (const off of [-0.18, 0, 0.18]) {
      pool.spawn({
        x: this.sprite.x + Math.cos(baseAngle + off) * 24,
        y: this.sprite.y + Math.sin(baseAngle + off) * 24,
        angleRad: baseAngle + off,
        speed: this.phase === 1 ? 265 : 300,
        damage: 2,
        isPlayer: false,
        element: this.stage === 2 ? 'frost' : 'fire',
        texture: this.stage === 2 ? 'bullet_enemy_frost' : 'bullet_enemy_orb',
        range: 480
      });
    }
  }

  private executeSlam(
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    this.sprite.setPosition(this.slamTargetX, this.slamTargetY);
    this.ensureUnstuck(walls, roomBounds);
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 8);

    audio.playExplosion();
    this.scene.cameras.main.shake(220, 0.014);

    // 12-orb expanding shockwave ring + aimed follow-up shot
    const count = this.phase === 1 ? 10 : 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      pool.spawn({
        x: this.sprite.x,
        y: this.sprite.y,
        angleRad: angle,
        speed: this.phase === 1 ? 175 : 210,
        damage: 3,
        isPlayer: false,
        texture: 'bullet_enemy_orb',
        range: 280
      });
    }

    const aimAng = Math.atan2(playerY - this.sprite.y, playerX - this.sprite.x);
    for (const off of [-0.22, 0, 0.22]) {
      pool.spawn({
        x: this.sprite.x,
        y: this.sprite.y,
        angleRad: aimAng + off,
        speed: 250,
        damage: 2,
        isPlayer: false,
        texture: 'bullet_boss_orb',
        range: 360
      });
    }
  }

  private emitBossStats(): void {
    events.emit('combat:boss-stats', {
      currentHp: Math.max(0, this.hp),
      maxHp: this.maxHp,
      phase: this.phase,
      nameVi: this.bossNameVi,
      isDead: this.isDead
    });
  }

  public override destroy(): void {
    this.slamGraphic.destroy();
    super.destroy();
  }
}
