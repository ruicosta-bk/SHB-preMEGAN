import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { DamageInfo, DamageResult } from '../types/entity';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

type MoltenAttackState =
  | 'idle'
  | 'flame_fan'
  | 'lava_eruption_windup'
  | 'spiral_barrage'
  | 'meteor_ring'
  | 'vulnerable';

const LAVA_SLAM_RADIUS = 58;
const METEOR_TELEGRAPH_RADIUS = 44;
const METEOR_TELEGRAPH_SEC = 0.85;

export class BossMolten extends EnemyBase {
  public phase: number = 1;
  private attackState: MoltenAttackState = 'idle';
  private stateTimer: number = 1.3;
  private currentAttackIndex: number = 0;

  // Flame fan burst state
  private fanBurstsLeft: number = 0;
  private fanTimer: number = 0;

  // Twin spiral barrage state
  private spiralAngle: number = 0;
  private spiralTicksLeft: number = 0;
  private spiralTimer: number = 0;

  // Lava eruption slam & Phase 2 meteor ring state
  private slamTargetX: number = 0;
  private slamTargetY: number = 0;
  private slamWindupDuration: number = 0.78;
  private slamGraphic: Phaser.GameObjects.Graphics | null = null;
  private pendingSummons: { type: string; x: number; y: number }[] | null = null;
  private meteorElapsed: number = 0;
  private meteorTelegraphDuration: number = METEOR_TELEGRAPH_SEC;
  private meteors: {
    x: number;
    y: number;
    spawnDelay: number;
    telegraphRemaining: number;
    spawned: boolean;
    erupted: boolean;
  }[] = [];

  private stage: number;
  private bossNameVi: string;
  private readonly baseP1Hp: number;
  private readonly baseP1Speed: number = 86;
  private hpScaleMult: number = 1;
  private speedScaleMult: number = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stage: number = 3,
    bossNameVi: string = 'Ignifer Molten - Chúa Tể Dung Nham'
  ) {
    const p1Hp = Math.max(1, 250 + (stage - 3) * 40);
    super(scene, x, y, 'boss_molten_p1', p1Hp, 86);
    this.baseP1Hp = p1Hp;
    this.stage = stage;
    this.bossNameVi = bossNameVi || 'Ignifer Molten - Chúa Tể Dung Nham';

    this.shadow.setScale(1.85, 1.45);
    this.sprite.setScale(1.2);
    this.slamGraphic = scene.add.graphics().setDepth(11);

    audio.playBossAlert();
    this.emitBossStats();
  }

  public override getEnemyType(): string {
    return 'boss_molten';
  }

  protected override onDifficultyScaled(): void {
    this.hpScaleMult = this.maxHp / this.baseP1Hp;
    this.speedScaleMult = this.speed / this.baseP1Speed;
    this.stateTimer = Math.max(0.65, this.stateTimer / this.attackRateScale);
    this.emitBossStats();
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

    let amt = Math.max(0, damage.amount);
    if (this.eliteAffix && this.eliteAffix.damageTakenMult !== 1 && amt > 0) {
      amt = Math.max(1, Math.round(amt * this.eliteAffix.damageTakenMult));
    }

    this.hp -= amt;
    this.hitFlashTimer = 0.08;
    this.sprite.setTint(0xffffff);
    audio.playHitEnemy();

    events.emit('combat:enemy-hit', {
      enemyId: this.id,
      damage: amt,
      isCrit: !!damage.isCrit,
      x: this.sprite.x,
      y: this.sprite.y,
      element: damage.element
    });

    // Phase 1 -> Phase 2 transition
    if (this.phase === 1 && this.hp <= 0) {
      this.phase = 2;
      const baseP2Hp = Math.max(1, 230 + (this.stage - 3) * 40);
      const p2Hp = Math.max(1, Math.ceil(baseP2Hp * this.hpScaleMult));
      this.hp = p2Hp;
      this.maxHp = p2Hp;
      this.speed = 108 * this.speedScaleMult;
      this.sprite.setTexture('boss_molten_p2');
      this.sprite.setTint(0xfb923c);
      this.hitFlashTimer = 0.28;
      this.sprite.setAlpha(1.0);
      this.slamGraphic?.clear();
      this.attackState = 'vulnerable';
      this.stateTimer = Math.max(0.45, 0.85 / this.attackRateScale);

      this.pendingSummons = [
        { type: 'bomber', x: this.sprite.x - 68, y: this.sprite.y - 20 },
        { type: 'charger', x: this.sprite.x + 68, y: this.sprite.y + 20 }
      ];

      audio.playMoltenRoar();
      this.scene.cameras.main.shake(300, 0.015);
      this.emitBossStats();
      return { actualDamage: amt, absorbedByArmor: 0, hpDamage: amt, isDead: false, overkill: 0 };
    }

    this.emitBossStats();

    if (this.hp <= 0) {
      this.isDead = true;
      this.emitBossStats();
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
      this.slamGraphic?.clear();
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    this.stateTimer -= deltaSec;

    switch (this.attackState) {
      case 'idle': {
        this.slamGraphic?.clear();
        if (dist > 115) {
          this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed);
        } else if (dist > 1) {
          const strafeX = this.sprite.x + (-dy / dist) * 60;
          const strafeY = this.sprite.y + (dx / dist) * 60;
          this.moveTowardsWithObstacleAvoidance(strafeX, strafeY, deltaSec, walls, this.speed * 0.9);
        }

        if (this.stateTimer <= 0) {
          const rotation: MoltenAttackState[] =
            this.phase === 1
              ? ['flame_fan', 'lava_eruption_windup', 'spiral_barrage']
              : ['flame_fan', 'lava_eruption_windup', 'spiral_barrage', 'meteor_ring'];
          this.currentAttackIndex = (this.currentAttackIndex + 1) % rotation.length;
          const nextAtk = rotation[this.currentAttackIndex];

          if (nextAtk === 'flame_fan') {
            this.attackState = 'flame_fan';
            this.fanBurstsLeft = this.phase === 1 ? 2 : 3;
            this.fanTimer = 0;
            this.stateTimer = Math.max(0.55, (this.phase === 1 ? 0.7 : 0.9) / this.attackRateScale);
          } else if (nextAtk === 'lava_eruption_windup') {
            this.attackState = 'lava_eruption_windup';
            this.slamTargetX = roomBounds
              ? Phaser.Math.Clamp(playerX, roomBounds.minX + 16, roomBounds.maxX - 16)
              : playerX;
            this.slamTargetY = roomBounds
              ? Phaser.Math.Clamp(playerY, roomBounds.minY + 16, roomBounds.maxY - 16)
              : playerY;
            this.slamWindupDuration = Math.max(0.42, (this.phase === 1 ? 0.78 : 0.62) / this.attackRateScale);
            this.stateTimer = this.slamWindupDuration;
          } else if (nextAtk === 'spiral_barrage') {
            this.attackState = 'spiral_barrage';
            this.spiralAngle = Math.atan2(dy, dx);
            this.spiralTicksLeft = this.phase === 1 ? 16 : 24;
            this.spiralTimer = 0;
            this.stateTimer = Math.max(0.85, (this.phase === 1 ? 1.4 : 1.65) / this.attackRateScale);
          } else {
            this.attackState = 'meteor_ring';
            this.meteorElapsed = 0;
            this.meteorTelegraphDuration = Math.max(0.5, METEOR_TELEGRAPH_SEC / this.attackRateScale);
            const stagger = Math.max(0.1, 0.18 / this.attackRateScale);
            this.meteors = [
              { x: 0, y: 0, spawnDelay: 0, telegraphRemaining: this.meteorTelegraphDuration, spawned: false, erupted: false },
              { x: 0, y: 0, spawnDelay: stagger, telegraphRemaining: this.meteorTelegraphDuration, spawned: false, erupted: false },
              { x: 0, y: 0, spawnDelay: stagger * 2, telegraphRemaining: this.meteorTelegraphDuration, spawned: false, erupted: false },
              { x: 0, y: 0, spawnDelay: stagger * 3, telegraphRemaining: this.meteorTelegraphDuration, spawned: false, erupted: false }
            ];
          }
        }
        break;
      }

      case 'flame_fan': {
        this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed * 0.55);
        this.fanTimer -= deltaSec;
        if (this.fanTimer <= 0 && this.fanBurstsLeft > 0) {
          this.fanBurstsLeft--;
          this.fanTimer = Math.max(0.18, (this.phase === 1 ? 0.34 : 0.26) / this.attackRateScale);
          this.fireFlameFan(playerX, playerY, pool);
        }
        if (this.fanBurstsLeft <= 0 && this.stateTimer <= 0) {
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.4, (this.phase === 1 ? 0.85 : 0.62) / this.attackRateScale);
        }
        break;
      }

      case 'lava_eruption_windup': {
        const progress = Phaser.Math.Clamp(1 - this.stateTimer / this.slamWindupDuration, 0, 1);
        if (this.slamGraphic) {
          this.slamGraphic.clear();
          this.slamGraphic.lineStyle(2.5, 0xdc2626, 0.95);
          this.slamGraphic.strokeCircle(this.slamTargetX, this.slamTargetY, LAVA_SLAM_RADIUS);
          this.slamGraphic.fillStyle(0xef4444, 0.14 + progress * 0.24);
          this.slamGraphic.fillCircle(this.slamTargetX, this.slamTargetY, LAVA_SLAM_RADIUS * Math.max(0.25, progress));
        }

        this.sprite.y -= 0.45;

        if (this.stateTimer <= 0) {
          this.slamGraphic?.clear();
          this.executeLavaEruption(pool, walls, roomBounds);
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.42, (this.phase === 1 ? 0.9 : 0.65) / this.attackRateScale);
        }
        break;
      }

      case 'spiral_barrage': {
        this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed * 0.5);
        this.spiralTimer += deltaSec;
        const fireInterval = Math.max(0.038, (this.phase === 1 ? 0.08 : 0.058) / this.attackRateScale);
        if (this.spiralTimer >= fireInterval && this.spiralTicksLeft > 0) {
          this.spiralTimer = 0;
          this.spiralTicksLeft--;
          this.spiralAngle += 0.32;
          const bulletSpeed = this.phase === 1 ? 210 : 245;

          audio.playEnemyShoot();
          for (let stream = 0; stream < 2; stream++) {
            const ang = this.spiralAngle + stream * Math.PI;
            pool.spawn({
              x: this.sprite.x + Math.cos(ang) * 16,
              y: this.sprite.y + Math.sin(ang) * 16,
              angleRad: ang,
              speed: bulletSpeed,
              damage: 2 + this.bonusDamage,
              isPlayer: false,
              element: 'fire',
              texture: stream === 0 ? 'bullet_boss_orb' : 'bullet_inferno',
              range: 460
            });
          }
        }
        if (this.spiralTicksLeft <= 0 && this.stateTimer <= 0) {
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.4, (this.phase === 1 ? 0.85 : 0.62) / this.attackRateScale);
        }
        break;
      }

      case 'meteor_ring': {
        this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed * 0.45);
        this.meteorElapsed += deltaSec;
        this.slamGraphic?.clear();

        let allErupted = true;
        for (let idx = 0; idx < this.meteors.length; idx++) {
          const m = this.meteors[idx];
          if (m.erupted) continue;
          allErupted = false;

          if (!m.spawned && this.meteorElapsed >= m.spawnDelay) {
            m.spawned = true;
            const ringAngle = (idx / this.meteors.length) * Math.PI * 2 + Math.random() * 0.45;
            const ringDist = idx === 0 ? 18 : 54;
            const rawX = playerX + Math.cos(ringAngle) * ringDist;
            const rawY = playerY + Math.sin(ringAngle) * ringDist;
            m.x = roomBounds ? Phaser.Math.Clamp(rawX, roomBounds.minX + 16, roomBounds.maxX - 16) : rawX;
            m.y = roomBounds ? Phaser.Math.Clamp(rawY, roomBounds.minY + 16, roomBounds.maxY - 16) : rawY;
          }

          if (!m.spawned) continue;

          m.telegraphRemaining -= deltaSec;
          const progress = Phaser.Math.Clamp(1 - m.telegraphRemaining / this.meteorTelegraphDuration, 0, 1);

          if (this.slamGraphic) {
            this.slamGraphic.lineStyle(2.5, 0xdc2626, 0.95);
            this.slamGraphic.strokeCircle(m.x, m.y, METEOR_TELEGRAPH_RADIUS);
            this.slamGraphic.fillStyle(0xef4444, 0.14 + progress * 0.26);
            this.slamGraphic.fillCircle(m.x, m.y, METEOR_TELEGRAPH_RADIUS * Math.max(0.2, progress));
          }

          if (m.telegraphRemaining <= 0) {
            m.erupted = true;
            const baseAng = (idx * Math.PI) / 8;
            for (let i = 0; i < 6; i++) {
              const ang = baseAng + (i / 6) * Math.PI * 2;
              pool.spawn({
                x: m.x + Math.cos(ang) * 8,
                y: m.y + Math.sin(ang) * 8,
                angleRad: ang,
                speed: 225,
                damage: 2 + this.bonusDamage,
                isPlayer: false,
                element: 'fire',
                texture: 'bullet_inferno',
                range: 320
              });
            }
            audio.playExplosion();
            this.scene.cameras.main.shake(110, 0.008);
          }
        }

        if (allErupted) {
          this.slamGraphic?.clear();
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.42, 0.7 / this.attackRateScale);
        }
        break;
      }

      case 'vulnerable':
        this.slamGraphic?.clear();
        this.sprite.setAlpha(0.9);
        if (this.stateTimer <= 0) {
          this.sprite.setAlpha(1.0);
          this.attackState = 'idle';
          this.stateTimer = Math.max(0.25, (this.phase === 1 ? 0.5 : 0.34) / this.attackRateScale);
        }
        break;
    }
  }

  private fireFlameFan(playerX: number, playerY: number, pool: ProjectilePool): void {
    const baseAngle = Math.atan2(playerY - this.sprite.y, playerX - this.sprite.x);
    const count = this.phase === 1 ? 5 : 7;
    const halfSpread = this.phase === 1 ? 0.36 : 0.48;
    audio.playShootShotgun();

    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1)) * 2 - 1;
      const angle = baseAngle + t * halfSpread;
      pool.spawn({
        x: this.sprite.x + Math.cos(angle) * 22,
        y: this.sprite.y + Math.sin(angle) * 22,
        angleRad: angle,
        speed: this.phase === 1 ? 245 : 280,
        damage: 2 + this.bonusDamage,
        isPlayer: false,
        element: 'fire',
        texture: 'bullet_inferno',
        range: 480
      });
    }
  }

  private executeLavaEruption(
    pool: ProjectilePool,
    walls: { x: number; y: number; width: number; height: number }[],
    roomBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    this.sprite.setPosition(this.slamTargetX, this.slamTargetY);
    this.ensureUnstuck(walls, roomBounds);
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 8);

    audio.playMoltenRoar();
    audio.playExplosion();
    this.scene.cameras.main.shake(240, 0.015);

    // Shockwave + 8-way magma bullet ring
    const ringCount = 8;
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      pool.spawn({
        x: this.sprite.x + Math.cos(angle) * 14,
        y: this.sprite.y + Math.sin(angle) * 14,
        angleRad: angle,
        speed: this.phase === 1 ? 195 : 230,
        damage: 3 + this.bonusDamage,
        isPlayer: false,
        element: 'fire',
        texture: 'bullet_inferno',
        range: 340
      });
    }

    if (this.phase === 2) {
      for (let i = 0; i < ringCount; i++) {
        const angle = Math.PI / 8 + (i / ringCount) * Math.PI * 2;
        pool.spawn({
          x: this.sprite.x + Math.cos(angle) * 10,
          y: this.sprite.y + Math.sin(angle) * 10,
          angleRad: angle,
          speed: 165,
          damage: 2 + this.bonusDamage,
          isPlayer: false,
          element: 'fire',
          texture: 'bullet_boss_orb',
          range: 300
        });
      }
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

  private cleanupSlamGraphic(): void {
    if (this.slamGraphic) {
      this.slamGraphic.clear();
      this.slamGraphic.destroy();
      this.slamGraphic = null;
    }
  }

  protected override onDeath(): void {
    this.isDead = true;
    this.cleanupSlamGraphic();
    this.emitBossStats();
    super.onDeath();
  }

  public override destroy(): void {
    this.cleanupSlamGraphic();
    super.destroy();
  }
}
