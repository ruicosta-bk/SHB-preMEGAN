import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { DamageInfo, DamageResult } from '../types/entity';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

type IgnisAttackState =
  | 'idle'
  | 'radial'
  | 'spiral'
  | 'cross'
  | 'slam_windup'
  | 'slam_execute'
  | 'meteor_barrage'
  | 'flame_dash_trail'
  | 'pillar_ricochet_beam'
  | 'vulnerable';

export class BossIgnis extends EnemyBase {
  public phase: number = 1;
  private attackState: IgnisAttackState = 'idle';
  private stateTimer: number = 1.2; // Initial delay so player enters safely
  private lastAttack: string | null = null;

  // Spiral & Cross barrage state
  private spiralAngle: number = 0;
  private spiralBulletsFired: number = 0;
  private spiralTimer: number = 0;
  private crossBurstsLeft: number = 0;
  private crossTimer: number = 0;

  // Flame Dash Trail & Ricochet Beam state
  private dashPhase: 'windup' | 'dash' = 'windup';
  private dashAngle: number = 0;
  private dashTrailTimer: number = 0;
  private beamBurstsLeft: number = 0;
  private beamTimer: number = 0;

  // Slam & Meteor barrage state
  private slamTargetX: number = 0;
  private slamTargetY: number = 0;
  private slamGraphic: Phaser.GameObjects.Graphics;
  private pendingSummons: { type: string; x: number; y: number }[] | null = null;
  private meteorElapsed: number = 0;
  private meteors: {
    x: number;
    y: number;
    spawnDelay: number;
    telegraphRemaining: number;
    spawned: boolean;
    erupted: boolean;
  }[] = [];

  private stage: number = 1;
  private bossNameVi: string = 'Ignis Ignifer - Đại Pháp Sư Luyện Kim';
  private readonly baseP1Hp: number;
  private readonly baseP1Speed: number;
  private hpScaleMult: number = 1;
  private speedScaleMult: number = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, stage: number = 1, bossNameVi?: string) {
    const p1Hp = 240 + (stage - 1) * 65;
    const p1Speed = 76 + (stage - 1) * 10;
    super(scene, x, y, 'boss_ignis_p1', p1Hp, p1Speed);
    this.baseP1Hp = p1Hp;
    this.baseP1Speed = p1Speed;
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

    // Check Phase 1 -> Phase 2 transition
    if (this.phase === 1 && this.hp <= 0) {
      this.phase = 2;
      const baseP2Hp = 220 + (this.stage - 1) * 55;
      const p2Hp = Math.max(1, Math.ceil(baseP2Hp * this.hpScaleMult));
      this.hp = p2Hp;
      this.maxHp = p2Hp;
      this.speed = (96 + (this.stage - 1) * 12) * this.speedScaleMult;
      this.sprite.setTexture('boss_ignis_p2');
      this.sprite.setTint(this.stage === 2 ? 0x38bdf8 : 0xff6666);
      this.slamGraphic.clear();
      this.attackState = 'vulnerable';
      this.stateTimer = Math.max(0.35, 0.55 / this.attackRateScale);

      // Summon biome guards when entering enraged Phase 2
      const guardA = this.stage === 2 ? 'frost_mage' : this.stage >= 3 ? 'fan_caster' : 'shooter';
      const guardB = this.stage === 2 ? 'frost_knight' : this.stage >= 3 ? 'pyro_juggernaut' : 'crypt_shielder';
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
          const nextAtk = this.pickNextAttack(dist);
          this.lastAttack = nextAtk;

          if (nextAtk === 'radial') {
            this.attackState = 'radial';
            this.executeRadialNova(playerX, playerY, pool);
            this.attackState = 'vulnerable';
            this.stateTimer = Math.max(0.28, (this.phase === 1 ? 0.42 : 0.34) / this.attackRateScale);
          } else if (nextAtk === 'spiral') {
            this.attackState = 'spiral';
            this.spiralAngle = Math.atan2(dy, dx);
            this.spiralBulletsFired = 0;
            this.spiralTimer = 0;
            this.stateTimer = Math.max(0.95, (this.phase === 1 ? 1.45 : 1.7) / this.attackRateScale);
          } else if (nextAtk === 'cross') {
            this.attackState = 'cross';
            this.crossBurstsLeft = this.phase === 1 ? 3 : 4;
            this.crossTimer = 0;
            this.spiralAngle = Math.atan2(dy, dx);
            this.stateTimer = Math.max(0.95, 1.5 / this.attackRateScale);
          } else if (nextAtk === 'slam_windup') {
            this.attackState = 'slam_windup';
            this.slamTargetX = roomBounds ? Phaser.Math.Clamp(playerX, roomBounds.minX + 12, roomBounds.maxX - 12) : playerX;
            this.slamTargetY = roomBounds ? Phaser.Math.Clamp(playerY, roomBounds.minY + 12, roomBounds.maxY - 12) : playerY;
            this.stateTimer = Math.max(0.42, (this.phase === 1 ? 0.72 : 0.58) / this.attackRateScale);
          } else if (nextAtk === 'flame_dash_trail') {
            this.attackState = 'flame_dash_trail';
            this.dashPhase = 'windup';
            this.dashAngle = Math.atan2(dy, dx);
            this.dashTrailTimer = 0;
            this.stateTimer = Math.max(0.28, 0.44 / this.attackRateScale);
          } else if (nextAtk === 'pillar_ricochet_beam') {
            this.attackState = 'pillar_ricochet_beam';
            this.beamBurstsLeft = 2;
            this.beamTimer = 0;
            this.stateTimer = Math.max(0.55, 0.85 / this.attackRateScale);
          } else if (nextAtk === 'meteor_barrage') {
            this.attackState = 'meteor_barrage';
            this.meteorElapsed = 0;
            this.meteors = [
              { x: 0, y: 0, spawnDelay: 0, telegraphRemaining: 0.85, spawned: false, erupted: false },
              { x: 0, y: 0, spawnDelay: 0.28, telegraphRemaining: 0.85, spawned: false, erupted: false },
              { x: 0, y: 0, spawnDelay: 0.56, telegraphRemaining: 0.85, spawned: false, erupted: false }
            ];
          }
        }
        break;

      case 'spiral': {
        this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed * 0.55);
        this.spiralTimer += deltaSec;
        const fireInterval = Math.max(0.038, (this.phase === 1 ? 0.075 : 0.055) / this.attackRateScale);
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
            damage: 2 + this.bonusDamage,
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
              damage: 2 + this.bonusDamage,
              isPlayer: false,
              texture: 'bullet_boss_orb',
              range: 460
            });
            pool.spawn({
              x: this.sprite.x,
              y: this.sprite.y,
              angleRad: this.spiralAngle + (Math.PI * 4) / 3,
              speed: 230,
              damage: 2 + this.bonusDamage,
              isPlayer: false,
              texture: 'bullet_boss_orb',
              range: 460
            });
          }
        }

        if (this.stateTimer <= 0) {
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.28, (this.phase === 1 ? 0.42 : 0.34) / this.attackRateScale);
        }
        break;
      }

      case 'cross':
        this.crossTimer -= deltaSec;
        if (this.crossTimer <= 0 && this.crossBurstsLeft > 0) {
          this.crossBurstsLeft--;
          this.crossTimer = Math.max(0.18, (this.phase === 1 ? 0.38 : 0.28) / this.attackRateScale);
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
              damage: 2 + this.bonusDamage,
              isPlayer: false,
              texture: 'bullet_enemy_laser',
              range: 480
            });
          }
        }
        if (this.crossBurstsLeft <= 0 && this.stateTimer <= 0) {
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.28, (this.phase === 1 ? 0.42 : 0.34) / this.attackRateScale);
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
          this.stateTimer = Math.max(0.45, (this.phase === 1 ? 0.78 : 0.62) / this.attackRateScale);
        }
        break;

      case 'flame_dash_trail': {
        this.slamGraphic.clear();
        if (this.dashPhase === 'windup') {
          this.slamGraphic.lineStyle(2.5, 0xf97316, 0.9);
          this.slamGraphic.strokeCircle(this.sprite.x, this.sprite.y, 26);
          if (this.stateTimer <= 0) {
            this.dashPhase = 'dash';
            this.dashTrailTimer = 0;
            this.stateTimer = 0.42;
            audio.playEnemyShoot();
          }
        } else {
          const dashSpeed = 340 * this.speedScaleMult;
          const targetX = this.sprite.x + Math.cos(this.dashAngle) * dashSpeed * deltaSec;
          const targetY = this.sprite.y + Math.sin(this.dashAngle) * dashSpeed * deltaSec;
          this.moveTowardsWithObstacleAvoidance(targetX, targetY, deltaSec, walls, dashSpeed);

          this.dashTrailTimer -= deltaSec;
          if (this.dashTrailTimer <= 0) {
            this.dashTrailTimer = 0.085;
            for (const side of [-Math.PI / 2, Math.PI / 2, Math.PI]) {
              const ang = this.dashAngle + side;
              pool.spawn({
                x: this.sprite.x,
                y: this.sprite.y,
                angleRad: ang,
                speed: side === Math.PI ? 120 : 185,
                damage: 2 + this.bonusDamage,
                isPlayer: false,
                element: 'fire',
                texture: 'bullet_inferno',
                range: 260
              });
            }
          }
          if (this.stateTimer <= 0) {
            this.attackState = 'vulnerable';
            this.stateTimer = Math.max(0.28, 0.38 / this.attackRateScale);
          }
        }
        break;
      }

      case 'pillar_ricochet_beam': {
        this.beamTimer -= deltaSec;
        if (this.beamTimer <= 0 && this.beamBurstsLeft > 0) {
          this.beamBurstsLeft--;
          this.beamTimer = Math.max(0.18, 0.32 / this.attackRateScale);
          const aim = Math.atan2(dy, dx);
          audio.playShootShotgun();
          for (const offset of [-0.42, -0.21, 0, 0.21, 0.42]) {
            const ang = aim + offset;
            pool.spawn({
              x: this.sprite.x + Math.cos(ang) * 20,
              y: this.sprite.y + Math.sin(ang) * 20,
              angleRad: ang,
              speed: 310,
              damage: 2 + this.bonusDamage,
              isPlayer: false,
              element: 'fire',
              texture: 'bullet_enemy_laser',
              bounceCount: 1,
              range: 600
            });
          }
        }
        if (this.beamBurstsLeft <= 0 && this.stateTimer <= 0) {
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.3, 0.42 / this.attackRateScale);
        }
        break;
      }

      case 'meteor_barrage': {
        this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed * 0.45);
        this.meteorElapsed += deltaSec;
        this.slamGraphic.clear();

        let allErupted = true;
        for (let idx = 0; idx < this.meteors.length; idx++) {
          const m = this.meteors[idx];
          if (m.erupted) continue;
          allErupted = false;

          if (!m.spawned && this.meteorElapsed >= m.spawnDelay) {
            m.spawned = true;
            const spreadAngle = (idx * 2.1) + Math.random() * 0.8;
            const spreadDist = idx === 0 ? 12 : 34;
            const rawX = playerX + Math.cos(spreadAngle) * spreadDist;
            const rawY = playerY + Math.sin(spreadAngle) * spreadDist;
            m.x = roomBounds ? Phaser.Math.Clamp(rawX, roomBounds.minX + 16, roomBounds.maxX - 16) : rawX;
            m.y = roomBounds ? Phaser.Math.Clamp(rawY, roomBounds.minY + 16, roomBounds.maxY - 16) : rawY;
          }

          if (!m.spawned) continue;

          m.telegraphRemaining -= deltaSec;
          const progress = Phaser.Math.Clamp(1 - m.telegraphRemaining / 0.85, 0, 1);

          this.slamGraphic.lineStyle(2.5, 0xdc2626, 0.95);
          this.slamGraphic.strokeCircle(m.x, m.y, 46);
          this.slamGraphic.fillStyle(0xef4444, 0.14 + progress * 0.24);
          this.slamGraphic.fillCircle(m.x, m.y, 46 * Math.max(0.2, progress));

          if (m.telegraphRemaining <= 0) {
            m.erupted = true;
            const baseAng = (idx * Math.PI) / 6;
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
            this.scene.cameras.main.shake(100, 0.007);
          }
        }

        if (allErupted) {
          this.slamGraphic.clear();
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.45, (this.phase === 1 ? 0.75 : 0.62) / this.attackRateScale);
        }
        break;
      }

      case 'vulnerable':
        this.slamGraphic.clear();
        this.sprite.setAlpha?.(0.9);
        if (this.stateTimer <= 0) {
          this.sprite.setAlpha?.(1.0);
          this.attackState = 'idle';
          this.stateTimer = Math.max(0.18, (this.phase === 1 ? 0.34 : 0.24) / this.attackRateScale);
        }
        break;
    }
  }

  private pickNextAttack(dist: number): IgnisAttackState {
    const includeMeteor = (this.stage >= 2 && this.phase === 2) || this.stage >= 3;
    const candidates: IgnisAttackState[] =
      dist < 115
        ? ['flame_dash_trail', 'radial', 'cross']
        : dist > 215
        ? ['slam_windup', 'flame_dash_trail', 'spiral']
        : ['radial', 'spiral', 'cross', 'slam_windup', 'flame_dash_trail'];

    if (this.phase === 2 && !candidates.includes('pillar_ricochet_beam')) {
      candidates.push('pillar_ricochet_beam');
    }
    if (includeMeteor && !candidates.includes('meteor_barrage')) {
      candidates.push('meteor_barrage');
    }

    const filtered = candidates.filter(a => a !== this.lastAttack);
    const pool = filtered.length > 0 ? filtered : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
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
        damage: 2 + this.bonusDamage,
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
        damage: 2 + this.bonusDamage,
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
        damage: 3 + this.bonusDamage,
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
        damage: 2 + this.bonusDamage,
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

  protected override onDeath(): void {
    this.slamGraphic.clear();
    super.onDeath();
  }

  public override destroy(): void {
    this.slamGraphic.destroy();
    super.destroy();
  }
}
