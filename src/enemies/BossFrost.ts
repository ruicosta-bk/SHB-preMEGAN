import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../combat/ProjectilePool';
import { DamageInfo, DamageResult } from '../types/entity';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

type FrostAttackState =
  | 'idle'
  | 'frost_nova'
  | 'ice_lance'
  | 'blizzard_cross'
  | 'frost_ring_windup'
  | 'frost_ring_burst'
  | 'vulnerable';

const FROST_RING_RADIUS = 95;
const FROST_RING_WINDUP_SEC = 1.0;

export class BossFrost extends EnemyBase {
  public phase: number = 1;
  private attackState: FrostAttackState = 'idle';
  private stateTimer: number = 1.4;
  private currentAttackIndex: number = 0;

  // Nova / Lance / Blizzard state
  private novaExecuted: boolean = false;
  private lanceShotsLeft: number = 0;
  private lanceTimer: number = 0;
  private lanceAimAngle: number = 0;
  private crossBurstsLeft: number = 0;
  private crossTimer: number = 0;
  private spiralAngle: number = 0;

  // Frost ring telegraph & burst
  private frostGraphic: Phaser.GameObjects.Graphics | null = null;
  private ringBurstExecuted: boolean = false;
  private frostRingWindupDuration: number = FROST_RING_WINDUP_SEC;
  private pendingSummons: { type: string; x: number; y: number }[] | null = null;

  private stage: number;
  private bossNameVi: string;
  private readonly baseP1Hp: number;
  private readonly baseP1Speed: number = 76;
  private hpScaleMult: number = 1;
  private speedScaleMult: number = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stage: number = 2,
    bossNameVi: string = 'Ignis Ấn Băng Cổ Ngữ'
  ) {
    const p1Hp = 195 + Math.max(0, stage - 2) * 55;
    super(scene, x, y, 'boss_frost_p1', p1Hp, 76);
    this.baseP1Hp = p1Hp;
    this.stage = stage;
    this.bossNameVi = bossNameVi || 'Ignis Ấn Băng Cổ Ngữ';

    this.shadow.setScale(1.8, 1.4);
    this.sprite.setScale(1.2);
    this.frostGraphic = scene.add.graphics().setDepth(11);

    audio.playBossAlert();
    this.emitBossStats();
  }

  public override getEnemyType(): string {
    return 'boss_frost';
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

    const amt = Math.max(0, damage.amount);
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
      const baseP2Hp = 170 + Math.max(0, this.stage - 2) * 50;
      const p2Hp = Math.max(1, Math.ceil(baseP2Hp * this.hpScaleMult));
      this.hp = p2Hp;
      this.maxHp = p2Hp;
      this.speed = 96 * this.speedScaleMult;
      this.sprite.setTexture('boss_frost_p2');
      this.sprite.setTint(0x67e8f9);
      this.hitFlashTimer = 0.28;
      this.sprite.setAlpha(1.0);
      this.frostGraphic?.clear();
      this.attackState = 'vulnerable';
      this.stateTimer = Math.max(0.45, 0.85 / this.attackRateScale);

      this.pendingSummons = [
        { type: 'frost_mage', x: this.sprite.x - 64, y: this.sprite.y },
        { type: 'frost_knight', x: this.sprite.x + 64, y: this.sprite.y }
      ];

      audio.playBossAlert();
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
      this.frostGraphic?.clear();
      return;
    }

    // Preserve 1.2x boss scale with EnemyBase breathing motion (EnemyBase defaults non-boss_ignis to 1.0)
    const baseScale = this.isElite ? 1.38 : 1.2;
    const breath = Math.sin(this.bobTimer) * 0.045;
    this.sprite.setScale(baseScale * (1 - breath * 0.6), baseScale * (1 + breath));

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    this.stateTimer -= deltaSec;

    switch (this.attackState) {
      case 'idle': {
        this.frostGraphic?.clear();
        if (dist > 125) {
          this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed);
        } else if (dist > 1) {
          const strafeX = this.sprite.x + (-dy / dist) * 60;
          const strafeY = this.sprite.y + (dx / dist) * 60;
          this.moveTowardsWithObstacleAvoidance(strafeX, strafeY, deltaSec, walls, this.speed * 0.9);
        }

        if (this.stateTimer <= 0) {
          const rotation: FrostAttackState[] =
            this.phase === 1
              ? ['frost_nova', 'ice_lance', 'frost_ring_windup']
              : ['frost_nova', 'ice_lance', 'blizzard_cross', 'frost_ring_windup'];
          this.currentAttackIndex = (this.currentAttackIndex + 1) % rotation.length;
          const nextAtk = rotation[this.currentAttackIndex];

          if (nextAtk === 'frost_nova') {
            this.attackState = 'frost_nova';
            this.novaExecuted = false;
            this.stateTimer = Math.max(0.14, 0.22 / this.attackRateScale);
          } else if (nextAtk === 'ice_lance') {
            this.attackState = 'ice_lance';
            this.lanceShotsLeft = 3;
            this.lanceTimer = 0;
            this.lanceAimAngle = Math.atan2(dy, dx);
            this.stateTimer = Math.max(0.38, 0.6 / this.attackRateScale);
          } else if (nextAtk === 'blizzard_cross') {
            this.attackState = 'blizzard_cross';
            this.crossBurstsLeft = 4;
            this.crossTimer = 0;
            this.spiralAngle = Math.atan2(dy, dx);
            this.stateTimer = Math.max(0.75, 1.25 / this.attackRateScale);
          } else {
            this.attackState = 'frost_ring_windup';
            this.ringBurstExecuted = false;
            this.frostRingWindupDuration = Math.max(0.65, FROST_RING_WINDUP_SEC / this.attackRateScale);
            this.stateTimer = this.frostRingWindupDuration;
          }
        }
        break;
      }

      case 'frost_nova':
        if (this.stateTimer <= 0 && !this.novaExecuted) {
          this.novaExecuted = true;
          this.executeFrostNova(playerX, playerY, pool);
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.45, (this.phase === 1 ? 0.85 : 0.65) / this.attackRateScale);
        }
        break;

      case 'ice_lance':
        this.lanceTimer -= deltaSec;
        if (this.lanceTimer <= 0 && this.lanceShotsLeft > 0) {
          const shotIdx = 3 - this.lanceShotsLeft; // 0, 1, 2
          const spreadOffsets = [-0.18, 0, 0.18];
          const angle = this.lanceAimAngle + spreadOffsets[shotIdx];
          this.lanceShotsLeft--;
          this.lanceTimer = Math.max(0.08, (this.phase === 1 ? 0.15 : 0.12) / this.attackRateScale);

          audio.playEnemyShoot();
          pool.spawn({
            x: this.sprite.x + Math.cos(angle) * 20,
            y: this.sprite.y + Math.sin(angle) * 20,
            angleRad: angle,
            speed: 305,
            damage: 2 + this.bonusDamage,
            isPlayer: false,
            element: 'frost',
            texture: 'bullet_enemy_laser',
            tint: 0x38bdf8,
            range: 500
          });
        }
        if (this.lanceShotsLeft <= 0 && this.stateTimer <= 0) {
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.4, (this.phase === 1 ? 0.8 : 0.6) / this.attackRateScale);
        }
        break;

      case 'blizzard_cross':
        this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed * 0.45);
        this.crossTimer -= deltaSec;
        if (this.crossTimer <= 0 && this.crossBurstsLeft > 0) {
          this.crossBurstsLeft--;
          this.crossTimer = Math.max(0.16, 0.28 / this.attackRateScale);
          this.spiralAngle += Math.PI / 8;
          audio.playEnemyShoot();
          for (let i = 0; i < 8; i++) {
            const ang = this.spiralAngle + (i / 8) * Math.PI * 2;
            pool.spawn({
              x: this.sprite.x + Math.cos(ang) * 18,
              y: this.sprite.y + Math.sin(ang) * 18,
              angleRad: ang,
              speed: 205,
              damage: 2 + this.bonusDamage,
              isPlayer: false,
              element: 'frost',
              texture: 'bullet_frost',
              range: 460
            });
          }
        }
        if (this.crossBurstsLeft <= 0 && this.stateTimer <= 0) {
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.4, 0.65 / this.attackRateScale);
        }
        break;

      case 'frost_ring_windup': {
        this.moveTowardsWithObstacleAvoidance(playerX, playerY, deltaSec, walls, this.speed * 0.4);
        const progress = Phaser.Math.Clamp(1 - this.stateTimer / this.frostRingWindupDuration, 0, 1);
        const innerRadius = 20 + (FROST_RING_RADIUS - 20) * progress;

        if (this.frostGraphic) {
          this.frostGraphic.clear();
          this.frostGraphic.fillStyle(0xbae6fd, 0.12 + progress * 0.16);
          this.frostGraphic.fillCircle(this.sprite.x, this.sprite.y, FROST_RING_RADIUS);
          this.frostGraphic.lineStyle(2, 0xbae6fd, 0.55);
          this.frostGraphic.strokeCircle(this.sprite.x, this.sprite.y, FROST_RING_RADIUS);
          this.frostGraphic.lineStyle(2.5, 0xe0f2fe, 0.95);
          this.frostGraphic.strokeCircle(this.sprite.x, this.sprite.y, innerRadius);
        }

        if (this.stateTimer <= 0) {
          this.attackState = 'frost_ring_burst';
          this.ringBurstExecuted = false;
          this.stateTimer = 0.18;
        }
        break;
      }

      case 'frost_ring_burst': {
        if (!this.ringBurstExecuted) {
          this.ringBurstExecuted = true;
          this.executeFrostRingBurst(playerX, playerY, dist, dx, dy, pool);
        }
        if (this.frostGraphic) {
          const fade = Phaser.Math.Clamp(this.stateTimer / 0.18, 0, 1);
          this.frostGraphic.clear();
          this.frostGraphic.lineStyle(3, 0xe0f2fe, fade * 0.9);
          this.frostGraphic.strokeCircle(this.sprite.x, this.sprite.y, FROST_RING_RADIUS + (1 - fade) * 14);
        }
        if (this.stateTimer <= 0) {
          this.frostGraphic?.clear();
          this.attackState = 'vulnerable';
          this.stateTimer = Math.max(0.45, (this.phase === 1 ? 0.95 : 0.7) / this.attackRateScale);
        }
        break;
      }

      case 'vulnerable':
        this.frostGraphic?.clear();
        this.sprite.setAlpha(0.88);
        if (this.stateTimer <= 0) {
          this.sprite.setAlpha(1.0);
          this.attackState = 'idle';
          this.stateTimer = Math.max(0.25, (this.phase === 1 ? 0.55 : 0.35) / this.attackRateScale);
        }
        break;
    }
  }

  private executeFrostNova(playerX: number, playerY: number, pool: ProjectilePool): void {
    const count = this.phase === 1 ? 10 : 14;
    const baseAngle = Math.atan2(playerY - this.sprite.y, playerX - this.sprite.x);
    audio.playBossFrostNova();

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i / count) * Math.PI * 2;
      pool.spawn({
        x: this.sprite.x + Math.cos(angle) * 22,
        y: this.sprite.y + Math.sin(angle) * 22,
        angleRad: angle,
        speed: 185,
        damage: 2 + this.bonusDamage,
        isPlayer: false,
        element: 'frost',
        texture: 'bullet_frost',
        range: 460
      });
    }
  }

  private executeFrostRingBurst(
    playerX: number,
    playerY: number,
    dist: number,
    dx: number,
    dy: number,
    pool: ProjectilePool
  ): void {
    audio.playBossFrostNova();
    this.scene.cameras.main.shake(180, 0.012);

    // Close-range frost burst damage if player stays inside telegraph ring
    if (dist <= FROST_RING_RADIUS) {
      pool.spawn({
        x: playerX,
        y: playerY,
        angleRad: Math.atan2(dy, dx),
        speed: 120,
        damage: (this.phase === 1 ? 1 : 2) + this.bonusDamage,
        isPlayer: false,
        element: 'frost',
        texture: 'bullet_frost',
        range: 12
      });
    }

    // Scatter 8 frost bolts radially
    const offset = this.phase === 2 ? Math.PI / 8 : 0;
    for (let i = 0; i < 8; i++) {
      const angle = offset + (i / 8) * Math.PI * 2;
      pool.spawn({
        x: this.sprite.x + Math.cos(angle) * 20,
        y: this.sprite.y + Math.sin(angle) * 20,
        angleRad: angle,
        speed: 215,
        damage: 2 + this.bonusDamage,
        isPlayer: false,
        element: 'frost',
        texture: 'bullet_frost',
        range: 420
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

  private cleanupFrostGraphic(): void {
    if (this.frostGraphic) {
      this.frostGraphic.clear();
      this.frostGraphic.destroy();
      this.frostGraphic = null;
    }
  }

  protected override onDeath(): void {
    this.isDead = true;
    this.cleanupFrostGraphic();
    this.emitBossStats();
    super.onDeath();
  }

  public override destroy(): void {
    this.cleanupFrostGraphic();
    super.destroy();
  }
}
