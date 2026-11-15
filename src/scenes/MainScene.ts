import Phaser from 'phaser';
import { TextureGenerator } from '../presentation/TextureGenerator';
import { EffectsManager, STATUS_ELEMENT_COLORS, StatusElement } from '../presentation/EffectsManager';
import { DungeonGenerator } from '../world/DungeonGenerator';
import { RoomManager, PickupItem } from '../world/RoomManager';
import { resolveCombatExplosion } from '../world/InteractiveProps';
import { PlayerController } from '../player/PlayerController';
import { PetController } from '../player/PetController';
import { TurretEntity } from '../player/TurretEntity';
import { HeroId, SkillVariant, HEROES, getHeroSkillMeta } from '../data/heroes';
import { DifficultyMode, getFloorEnemyScale } from '../data/difficulty';
import { getFloorMeta, TOTAL_FLOORS } from '../data/biomes';
import { ProjectilePool } from '../combat/ProjectilePool';
import { StatusManager } from '../combat/StatusManager';
import { FloatingNumbers } from '../ui/FloatingNumbers';
import { UIScene } from './UIScene';
import { WeaponCoreData, WeaponData } from '../types/weapon';
import { WEAPONS } from '../data/weapons';
import { WEAPON_CORE_IDS, pickRandomWeaponCore } from '../data/weaponCores';
import { findMergeResult } from '../data/merges';
import type { EnemyBase } from '../enemies/EnemyBase';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';
import { getMetaBonuses, recordRunResult } from '../core/MetaProgression';

export interface PauseableSceneLike {
  time?: {
    paused: boolean;
    removeAllEvents?: () => void;
  };
  tweens?: {
    paused?: boolean;
    startTime?: number;
    prevTime?: number;
    pauseAll?: () => void;
    resumeAll?: () => void;
    killAll?: () => void;
  };
  anims?: {
    pauseAll?: () => void;
    resumeAll?: () => void;
  };
  input?: {
    keyboard?: { resetKeys?: () => void } | null;
  } | null;
  scene?: {
    pause?: () => void;
    resume?: () => void;
  };
}

/**
 * Synchronizes Phaser scene, clock, tweens, and animations with the pause state
 * and shifts TweenManager clocks on resume so elapsed wall time never causes a jump.
 */
export function syncScenePauseState(
  scene: PauseableSceneLike,
  paused: boolean,
  pausedAtMs: number = 0,
  nowMs: number = Date.now()
): number {
  if (paused) {
    scene.input?.keyboard?.resetKeys?.();
    if (scene.time) {
      scene.time.paused = true;
    }
    if (scene.tweens?.pauseAll) {
      scene.tweens.pauseAll();
    } else if (scene.tweens) {
      scene.tweens.paused = true;
    }
    scene.anims?.pauseAll?.();
    scene.scene?.pause?.();
    return pausedAtMs > 0 ? pausedAtMs : nowMs;
  }

  if (pausedAtMs > 0 && scene.tweens) {
    const pausedDuration = Math.max(0, nowMs - pausedAtMs);
    if (typeof scene.tweens.startTime === 'number') {
      scene.tweens.startTime += pausedDuration;
    }
    if (typeof scene.tweens.prevTime === 'number' && scene.tweens.prevTime > 0) {
      scene.tweens.prevTime += pausedDuration;
    }
  }
  if (scene.time) {
    scene.time.paused = false;
  }
  if (scene.tweens?.resumeAll) {
    scene.tweens.resumeAll();
  } else if (scene.tweens) {
    scene.tweens.paused = false;
  }
  scene.anims?.resumeAll?.();
  scene.scene?.resume?.();
  return 0;
}

export class MainScene extends Phaser.Scene {
  private player!: PlayerController;
  private pet!: PetController;
  private projectilePool!: ProjectilePool;
  private roomManager!: RoomManager;
  private floatingNumbers!: FloatingNumbers;
  private effects!: EffectsManager;
  private uiScene!: UIScene;

  // Game state
  private currentHeroId: HeroId = 'alchemist';
  private currentSkillVariant: SkillVariant = 1;
  private currentDifficultyMode: DifficultyMode = 'normal';
  private turrets: TurretEntity[] = [];
  private isGameRunning: boolean = false;
  private isPaused: boolean = false;
  private pausedAtMs: number = 0;
  private seed: number = 1000;
  private currentFloor: number = 1;
  private isTransitioningFloor: boolean = false;

  // Run statistics
  private runTime: number = 0;
  private enemiesDefeated: number = 0;
  private totalRoomsCleared: number = 0;
  private damageDealt: number = 0;

  // Nearest interactive pickup
  private nearestPickup: PickupItem | null = null;

  // Smooth camera look-ahead target
  private cameraTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private camLookAheadX: number = 0;
  private camLookAheadY: number = 0;

  // Hit-stop micro-pause state
  private hitStopTimer: number = 0;
  private lastHitStopAt: number = 0;

  constructor() {
    super({ key: 'MainScene' });
  }

  public create(): void {
    // 1. Generate all textures procedurally
    TextureGenerator.generateAll(this);

    // 2. Initialize Projectile Pool, Effects Pool & World Systems
    this.projectilePool = new ProjectilePool(this);
    this.floatingNumbers = new FloatingNumbers(this);
    this.effects = new EffectsManager(this, 96);

    // 3. Launch UI Scene in parallel
    this.scene.launch('UIScene');
    this.uiScene = this.scene.get('UIScene') as UIScene;

    // 4. Register window blur to auto-pause & reset latched keyboard state (matches Esc pause)
    window.addEventListener('blur', () => this.handleWindowBlur());

    this.input.on('pointerdown', () => {
      if (typeof window.focus === 'function') window.focus();
    });

    // 5. E key listener for pickup interaction
    this.input.keyboard!.on('keydown-E', () => {
      this.interactWithNearest();
    });

    // 7. Debug shortcut (B) to jump to Boss Room for verification
    this.input.keyboard!.on('keydown-B', () => {
      if (this.isGameRunning && this.roomManager) {
        console.log('[DEBUG] Teleporting to Boss Room for verification...');
        const bossRoom = this.roomManager.rooms.find(r => r.type === 'boss') || this.roomManager.rooms[this.roomManager.rooms.length - 1];
        const spawnX = bossRoom.worldX + bossRoom.width / 2;
        const spawnY = bossRoom.worldY + bossRoom.height / 2;
        this.transitionToRoom(bossRoom.index, spawnX, spawnY);
      }
    });

    // 8. Subscribe to global game events
    this.setupGlobalEvents();
  }

  private setupGlobalEvents(): void {
    events.on('combat:enemy-hit', (data: any) => {
      this.damageDealt += data.damage;
      this.floatingNumbers.showDamage(data.x, data.y, data.damage, data.isCrit);
      if (data.isCrit) {
        this.triggerHitStop(0.028);
      }
      if (this.effects) {
        const element = data.element as string | undefined;
        const elemColor =
          element === 'frost' || element === 'fire' || element === 'lightning' || element === 'poison'
            ? STATUS_ELEMENT_COLORS[element]
            : 0xfef08a;
        this.effects.spawnHitSparks(data.x, data.y, elemColor, data.isCrit ? 8 : 5);
        if (
          (element === 'fire' || element === 'frost' || element === 'lightning' || element === 'poison') &&
          (data.isCrit || Math.random() < 0.25)
        ) {
          this.effects.spawnStatusPop(data.x, data.y, element as StatusElement);
        }
      }
    });

    events.on('room:cleared', () => {
      this.totalRoomsCleared++;
    });

    events.on('combat:enemy-died', (data: any) => {
      this.enemiesDefeated++;
      if (this.player) {
        this.player.onEnemyKilled();
      }
      const isBoss = data.type === 'boss_ignis' || data.type === 'boss_frost' || data.type === 'boss_molten';
      if (this.effects) {
        this.effects.spawnDeathBurst(data.x, data.y, isBoss ? 0xf59e0b : 0xf87171);
      }
      if (isBoss) {
        this.triggerHitStop(0.045, 0);
        audio.playRoomClear();
        this.cameras.main.shake(350, 0.02);
        if (this.roomManager) {
          for (let i = 0; i < 15; i++) {
            const rx = data.x + (Math.random() - 0.5) * 90;
            const ry = data.y + (Math.random() - 0.5) * 90;
            this.roomManager.spawnPickup('coin', rx, ry, 1);
          }
          const msg =
            this.currentFloor < TOTAL_FLOORS ? 'CỔNG QUA TẦNG TIẾP ĐÃ MỞ!' : 'CỔNG CHIẾN THẮNG ĐÃ MỞ!';
          this.floatingNumbers.showNotice(data.x, data.y - 30, msg, '#38bdf8');
        }
      }
    });

    events.on('player:melee-swing', (data: {
      x: number;
      y: number;
      angle: number;
      radius: number;
      arcDeg: number;
      damage: number;
      isCrit: boolean;
      element?: 'physical' | 'fire' | 'lightning' | 'frost' | 'poison';
    }) => {
      if (!this.roomManager) return;
      const halfArcRad = Phaser.Math.DegToRad(data.arcDeg / 2);

      // Damage enemies in swing arc
      for (const enemy of this.roomManager.activeEnemies) {
        if (enemy.isDead) continue;
        const dx = enemy.sprite.x - data.x;
        const dy = enemy.sprite.y - data.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= data.radius + 14) {
          const angleToEnemy = Math.atan2(dy, dx);
          const diff = Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - data.angle));
          if (diff <= halfArcRad || dist < 24) {
            const len = dist || 1;
            enemy.takeDamage({
              amount: data.damage,
              isCrit: data.isCrit,
              element: data.element,
              knockback: { x: dx / len, y: dy / len, force: 210 },
              isPlayerAttack: true
            });
            this.applyExtraElementalEffects(enemy, data.element, data.damage);
          }
        }
      }

      // Break crates & barrels in melee swing arc
      if (this.roomManager.interactiveProps) {
        for (const prop of this.roomManager.interactiveProps.props) {
          if (prop.isDestroyed) continue;
          const dist = Math.hypot(prop.x - data.x, prop.y - data.y);
          if (dist <= data.radius + 10) {
            this.roomManager.interactiveProps.damageProp(
              prop,
              { amount: data.damage, isCrit: data.isCrit, isPlayerAttack: true },
              this.projectilePool,
              this.roomManager.activeEnemies,
              (cx, cy) => this.spawnCrateLoot(cx, cy)
            );
          }
        }
      }
    });

    events.on('combat:explosion', (data: { x: number; y: number; radius: number; damage: number; element?: 'fire' | 'frost' | 'physical' | 'poison' }) => {
      if (!this.roomManager) return;
      resolveCombatExplosion(
        data,
        this.roomManager.activeEnemies,
        this.roomManager.interactiveProps,
        this.projectilePool,
        (cx, cy) => this.spawnCrateLoot(cx, cy)
      );
    });

    events.on('player:laser-beam', (data: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      damage: number;
      isCrit: boolean;
      element?: 'fire' | 'frost' | 'lightning' | 'poison';
    }) => {
      if (!this.roomManager) return;
      for (const enemy of this.roomManager.activeEnemies) {
        if (enemy.isDead) continue;
        const d = this.pointToSegmentDist(enemy.sprite.x, enemy.sprite.y, data.x1, data.y1, data.x2, data.y2);
        if (d <= 20) {
          enemy.takeDamage({
            amount: data.damage,
            isCrit: data.isCrit,
            element: data.element,
            isPlayerAttack: true
          });
          this.applyExtraElementalEffects(enemy, data.element, data.damage);
        }
      }
      if (this.roomManager.interactiveProps) {
        for (const prop of this.roomManager.interactiveProps.props) {
          if (prop.isDestroyed) continue;
          const d = this.pointToSegmentDist(prop.x, prop.y, data.x1, data.y1, data.x2, data.y2);
          if (d <= 18) {
            this.roomManager.interactiveProps.damageProp(
              prop,
              { amount: data.damage, isCrit: data.isCrit, isPlayerAttack: true },
              this.projectilePool,
              this.roomManager.activeEnemies,
              (cx, cy) => this.spawnCrateLoot(cx, cy)
            );
          }
        }
      }
    });

    events.on('player:damaged', (data: { armorBroken?: boolean }) => {
      if (data?.armorBroken && this.player) {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;
        this.projectilePool.destroyEnemyBulletsInRadius(px, py, 95);
        audio.playExplosion();
        const ring = this.add.circle(px, py, 90, 0x38bdf8, 0.35).setDepth(19);
        this.tweens.add({ targets: ring, alpha: 0, scale: 1.25, duration: 280, onComplete: () => ring.destroy() });
        events.emit('combat:explosion', { x: px, y: py, radius: 90, damage: 12 });
      }
    });

    events.on('player:turret-spawned', (data: { x: number; y: number }) => {
      if (!this.isGameRunning) return;
      while (this.turrets.length >= 2) {
        const oldest = this.turrets.shift();
        oldest?.destroy();
      }
      this.turrets.push(new TurretEntity(this, data.x, data.y, 8.5));
    });

    events.on('player:skill-status-vortex', (data: { x: number; y: number; radius: number }) => {
      if (!this.roomManager) return;

      let hitCount = 0;
      for (const enemy of this.roomManager.activeEnemies) {
        if (enemy.isDead) continue;
        const dx = data.x - enemy.sprite.x;
        const dy = data.y - enemy.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= data.radius) {
          hitCount++;
          const len = dist || 1;
          enemy.takeDamage({
            amount: 12,
            isCrit: false,
            knockback: { x: dx / len, y: dy / len, force: 220 },
            isPlayerAttack: true
          });
        }
      }

      if (this.player) {
        this.player.heal(hitCount > 0 ? 1 : 0, 30);
      }

      const vortexGfx = this.add.graphics().setDepth(19);
      vortexGfx.fillStyle(0x7e22ce, 0.28);
      vortexGfx.fillCircle(data.x, data.y, data.radius);
      vortexGfx.lineStyle(3, 0xa855f7, 0.95);
      vortexGfx.strokeCircle(data.x, data.y, data.radius);
      vortexGfx.lineStyle(2, 0xdc2626, 0.9);
      vortexGfx.strokeCircle(data.x, data.y, data.radius * 0.55);

      this.tweens.add({
        targets: vortexGfx,
        alpha: 0,
        scaleX: 0.35,
        scaleY: 0.35,
        duration: 360,
        ease: 'Cubic.easeIn',
        onComplete: () => vortexGfx.destroy()
      });
    });

    events.on('player:died', () => {
      this.handleGameOver(false);
    });

    events.on('game:restart', (data?: { heroId?: HeroId; skillVariant?: SkillVariant; difficultyMode?: DifficultyMode }) => {
      this.startNewRun(
        data?.heroId || this.currentHeroId,
        data?.skillVariant ?? this.currentSkillVariant,
        data?.difficultyMode ?? this.currentDifficultyMode
      );
    });

    events.on('game:pause-requested', () => {
      if (this.isGameRunning && !this.isPaused && (!this.uiScene || !this.uiScene.isAnyModalOpen)) {
        this.setGameplayPaused(true);
      }
    });

    events.on('game:return-lobby', () => {
      this.haltActiveRun();
    });
  }

  private triggerHitStop(durationSec: number, minCooldownMs: number = 180): void {
    const now = this.time?.now ?? 0;
    if (now - this.lastHitStopAt < minCooldownMs) return;
    const clamped = Math.min(0.045, Math.max(0, durationSec));
    if (clamped > this.hitStopTimer) {
      this.hitStopTimer = clamped;
      this.lastHitStopAt = now;
    }
  }

  private applyExtraElementalEffects(enemy: EnemyBase, element: string | undefined, baseDamage: number): void {
    if (!this.roomManager || !element) return;
    if (element === 'poison') {
      StatusManager.applyStatus(enemy as any, 'poison', 3.0, 2, 0.5);
    } else if (element === 'lightning') {
      const chainTargets = StatusManager.findChainTargets(enemy, this.roomManager.activeEnemies, 130, 2);
      if (chainTargets.length > 0) {
        audio.playChainLightning();
        const chainDamage = Math.max(1, Math.ceil(baseDamage * 0.55));
        for (const ct of chainTargets) {
          const targetEnemy = this.roomManager.activeEnemies.find(e => e.id === ct.id && !e.isDead);
          if (!targetEnemy) continue;
          this.drawLightningArc(enemy.sprite.x, enemy.sprite.y, targetEnemy.sprite.x, targetEnemy.sprite.y);
          targetEnemy.takeDamage({
            amount: chainDamage,
            isCrit: false,
            element: 'lightning',
            isPlayerAttack: true
          });
        }
      }
    }
  }

  private clearTurrets(): void {
    for (const turret of this.turrets) {
      turret.destroy();
    }
    this.turrets = [];
  }

  private haltActiveRun(): void {
    this.isGameRunning = false;
    if (this.isPaused || this.pausedAtMs > 0) {
      this.pausedAtMs = syncScenePauseState(this, false, this.pausedAtMs);
    }
    this.isPaused = false;
    this.pausedAtMs = 0;
    this.isTransitioningFloor = false;
    this.hitStopTimer = 0;
    this.lastHitStopAt = 0;
    this.nearestPickup = null;
    this.camLookAheadX = 0;
    this.camLookAheadY = 0;
    this.floatingNumbers?.hidePrompt();
    this.projectilePool?.clearAll();
    this.effects?.clearAll();
    this.tweens?.killAll();
    this.time?.removeAllEvents();
    this.clearTurrets();
    this.cameras?.main?.stopFollow();

    if (this.roomManager) {
      this.roomManager.clearCurrentRoomVisuals();
    }
    if (this.player) {
      this.player.destroy();
      (this.player as any) = undefined;
    }
    if (this.pet) {
      this.pet.destroy();
      (this.pet as any) = undefined;
    }
  }

  public startNewRun(heroId?: HeroId, skillVariant?: SkillVariant, difficultyMode?: DifficultyMode): void {
    if (heroId) {
      this.currentHeroId = heroId;
    }
    if (skillVariant) {
      this.currentSkillVariant = skillVariant;
    }
    if (difficultyMode) {
      this.currentDifficultyMode = difficultyMode;
    }

    // Clean any active run state cleanly before starting fresh
    this.haltActiveRun();

    this.isGameRunning = true;
    this.isPaused = false;
    this.isTransitioningFloor = false;
    this.currentFloor = 1;
    this.runTime = 0;
    this.enemiesDefeated = 0;
    this.totalRoomsCleared = 0;
    this.damageDealt = 0;
    this.seed = Math.floor(Math.random() * 99999) + 1;

    // Generate fresh seamless dungeon floor + corridors
    const floorRooms = DungeonGenerator.generateFloor(this.seed, this.currentFloor, this.currentDifficultyMode);
    const corridors = DungeonGenerator.generateCorridors(floorRooms);
    this.roomManager = new RoomManager(this, floorRooms, corridors, this.currentFloor, this.currentDifficultyMode);

    // Spawn player (with Soul Gem meta bonuses) & pet in center of start room (Room 0)
    const startRoom = floorRooms[0];
    const playerSpawnX = startRoom.worldX + startRoom.width / 2;
    const playerSpawnY = startRoom.worldY + startRoom.height / 2;
    const metaBonuses = getMetaBonuses();

    this.player = new PlayerController(
      this,
      playerSpawnX,
      playerSpawnY,
      this.currentHeroId,
      metaBonuses,
      this.currentSkillVariant
    );
    const heroCfg = HEROES[this.currentHeroId] || HEROES.alchemist;
    const skillMeta = getHeroSkillMeta(this.currentHeroId, this.currentSkillVariant);
    events.emit('player:hero-selected', {
      skillShortLabelVi: skillMeta.shortLabelVi,
      accentHex: heroCfg.accentHex,
      accentColor: heroCfg.accentColor,
      difficultyMode: this.currentDifficultyMode
    });
    this.player.setEffectsManager(this.effects);
    this.pet = new PetController(this, playerSpawnX, playerSpawnY);

    // Build entire connected dungeon floor
    this.roomManager.buildEntireFloor();

    const meta = getFloorMeta(this.currentFloor);
    events.emit('floor:changed', meta);
    if (this.uiScene && this.uiScene.hud) {
      this.uiScene.hud.renderMinimap(floorRooms, 0);
    }

    // Setup Camera for gameplay (1.5x zoom frames compact Soul Knight rooms crisply)
    this.camLookAheadX = 0;
    this.camLookAheadY = 0;
    this.cameraTarget.set(playerSpawnX, playerSpawnY);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.16, 0.16);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.centerOn(playerSpawnX, playerSpawnY);
    this.floatingNumbers.showNotice(playerSpawnX, playerSpawnY - 36, `TẦNG ${meta.code}: ${meta.biomeNameVi.toUpperCase()}`, meta.accentHex);
  }

  private advanceFromPortal(): void {
    if (this.isTransitioningFloor || !this.isGameRunning) return;
    if (this.currentFloor < TOTAL_FLOORS) {
      this.transitionToNextFloor();
    } else {
      this.handleVictory();
    }
  }

  private transitionToNextFloor(): void {
    this.isTransitioningFloor = true;
    audio.playRoomClear();
    this.cameras.main.fade(200, 11, 13, 19, false, (_cam: any, progress: number) => {
      if (progress < 1) return;

      this.currentFloor += 1;
      this.projectilePool.clearAll();
      this.effects?.clearAll();
      this.clearTurrets();
      if (this.roomManager) {
        this.roomManager.clearCurrentRoomVisuals();
      }

      const floorRooms = DungeonGenerator.generateFloor(this.seed, this.currentFloor, this.currentDifficultyMode);
      const corridors = DungeonGenerator.generateCorridors(floorRooms);
      this.roomManager = new RoomManager(this, floorRooms, corridors, this.currentFloor, this.currentDifficultyMode);

      const startRoom = floorRooms[0];
      const spawnX = startRoom.worldX + startRoom.width / 2;
      const spawnY = startRoom.worldY + startRoom.height / 2;

      this.player.prepareForNextFloor(spawnX, spawnY);
      this.pet.resetPosition(spawnX, spawnY);
      this.camLookAheadX = 0;
      this.camLookAheadY = 0;
      this.cameraTarget.set(spawnX, spawnY);
      this.cameras.main.centerOn(spawnX, spawnY);
      this.roomManager.buildEntireFloor();

      const meta = getFloorMeta(this.currentFloor);
      events.emit('floor:changed', meta);
      if (this.uiScene && this.uiScene.hud) {
        this.uiScene.hud.renderMinimap(floorRooms, 0);
      }

      this.cameras.main.fadeIn(220, 11, 13, 19);
      this.floatingNumbers.showNotice(spawnX, spawnY - 36, `TẦNG ${meta.code}: ${meta.biomeNameVi.toUpperCase()}`, meta.accentHex);
      this.isTransitioningFloor = false;
    });
  }

  public handleWindowBlur(): void {
    this.input?.keyboard?.resetKeys?.();
    if (this.isGameRunning && !this.isPaused && (!this.uiScene || !this.uiScene.isAnyModalOpen)) {
      this.setGameplayPaused(true);
    }
  }

  private setGameplayPaused(paused: boolean): void {
    if (this.isPaused === paused) return;
    this.isPaused = paused;
    this.pausedAtMs = syncScenePauseState(this, paused, this.pausedAtMs);
    events.emit('game:pause-toggled', {
      isPaused: this.isPaused,
      onResume: () => {
        this.setGameplayPaused(false);
      },
      onRestart: () => {
        this.startNewRun();
      }
    });
  }

  private handleGameOver(isVictory: boolean): void {
    if (!this.isGameRunning) return;
    this.isGameRunning = false;
    const meta = getFloorMeta(this.currentFloor);
    const roomsCleared = Math.max(
      this.totalRoomsCleared,
      this.roomManager ? this.roomManager.rooms.filter(r => r.isCleared).length : 0
    );
    const gemSummary = recordRunResult({
      isVictory,
      enemiesDefeated: this.enemiesDefeated,
      roomsCleared,
      floorNumber: this.currentFloor,
      floorCode: meta.code,
      gemMultiplier: getFloorEnemyScale(this.currentFloor, this.currentDifficultyMode).gemMultiplier
    });
    audio.playGemReward();
    const stats = {
      isVictory,
      timeSeconds: this.runTime,
      enemiesDefeated: this.enemiesDefeated,
      roomsCleared,
      totalRooms: this.currentFloor * 8,
      floorReached: `${meta.code} · ${meta.biomeNameVi}`,
      damageDealt: this.damageDealt,
      gemsEarned: gemSummary.gemsEarned,
      totalGems: gemSummary.totalGems
    };
    events.emit(isVictory ? 'game:victory' : 'game:over', stats);
  }

  private handleVictory(): void {
    this.isTransitioningFloor = true;
    audio.playRoomClear();
    this.cameras.main.shake(400, 0.02);
    this.time.delayedCall(1200, () => {
      this.handleGameOver(true);
    });
  }

  public override update(time: number, delta: number): void {
    if (!this.isGameRunning || this.isPaused || (this.uiScene && this.uiScene.isAnyModalOpen) || !this.player || !this.roomManager) {
      return;
    }

    // Delta in seconds (clamped to prevent physics jumps after background tab freeze)
    const rawDeltaSec = Math.min(delta / 1000, 0.05);
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - rawDeltaSec);
      this.effects?.update(rawDeltaSec);
      return;
    }

    const deltaSec = rawDeltaSec;
    this.runTime += deltaSec;

    const pointer = this.input.activePointer;

    const allWallsAndProps = this.roomManager.getAllSolidColliders();

    // 1. Update Player
    this.player.update(
      deltaSec,
      pointer,
      this.projectilePool,
      allWallsAndProps,
      this.roomManager.doorColliders,
      this.roomManager.activeEnemies
    );

    // 1b. Floor Spike Trap & Biome Terrain Hazards (Ice Glide / Lava Burn)
    if (
      !this.player.upgrades.has('trap_shield') &&
      this.roomManager.isPlayerOnActiveTrap(this.player.sprite.x, this.player.sprite.y)
    ) {
      const trapHit = this.player.takeDamage({ amount: 1, isPlayerAttack: false });
      if (trapHit !== null) {
        this.cameras.main.shake(120, 0.007);
      }
    }
    const hazard = this.roomManager.getHazardAt(this.player.sprite.x, this.player.sprite.y);
    if (this.player.applyFloorHazard(hazard, deltaSec)) {
      this.cameras.main.shake(120, 0.007);
    }

    // 2. Smooth camera look-ahead toward pointer (clamped <= 36px)
    const lookDx = pointer.worldX - this.player.sprite.x;
    const lookDy = pointer.worldY - this.player.sprite.y;
    const lookDist = Math.hypot(lookDx, lookDy);
    const maxLookOffset = 36;
    const lookScale = lookDist > 0 ? Math.min(maxLookOffset, lookDist * 0.18) / lookDist : 0;
    const lookLerp = Math.min(1, deltaSec * 6);
    this.camLookAheadX = Phaser.Math.Linear(this.camLookAheadX, lookDx * lookScale, lookLerp);
    this.camLookAheadY = Phaser.Math.Linear(this.camLookAheadY, lookDy * lookScale, lookLerp);
    this.cameraTarget.set(
      this.player.sprite.x + this.camLookAheadX,
      this.player.sprite.y + this.camLookAheadY
    );

    // 3. Update Room Manager (Enemies AI, Room Clear, Seamless Room Transitions)
    this.roomManager.update(
      deltaSec,
      this.player.sprite.x,
      this.player.sprite.y,
      this.projectilePool,
      (roomIdx) => {
        if (this.uiScene && this.uiScene.hud) {
          this.uiScene.hud.renderMinimap(this.roomManager.rooms, roomIdx);
        }
      },
      this.player.getUpgradeStacks().get('energy_capacitor') ?? 0
    );

    // 3b. Update Clockwork Golem Pet Companion
    if (this.pet) {
      this.pet.update(
        deltaSec,
        this.player.sprite.x,
        this.player.sprite.y,
        this.roomManager.activeEnemies,
        this.projectilePool,
        this.roomManager.pickups
      );
    }

    // 3c. Update Engineer Auto-Turrets
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const turret = this.turrets[i];
      turret.update(deltaSec, this.roomManager.activeEnemies, this.projectilePool);
      if (turret.isExpired) {
        this.turrets.splice(i, 1);
      }
    }

    // 4. Update Projectiles (with active enemies for homing staff/sorcerer missiles)
    this.projectilePool.update(
      deltaSec,
      [...allWallsAndProps, ...this.roomManager.doorColliders],
      this.roomManager.activeEnemies
    );

    // 5. Check Projectile Collisions
    this.checkProjectileHits();

    // 6. Update Pooled VFX & Check Pickups Proximity
    this.effects?.update(deltaSec);
    this.updatePickupsProximity(deltaSec);
  }

  private transitionToRoom(targetRoomIdx: number, spawnX: number, spawnY: number): void {
    // Camera quick fade transition (used for Debug B boss jump)
    this.cameras.main.fade(120, 11, 13, 19, false, (_cam: any, progress: number) => {
      if (progress >= 1) {
        this.projectilePool.clearAll();
        this.effects?.clearAll();
        this.clearTurrets();
        this.player.sprite.setPosition(spawnX, spawnY);
        this.camLookAheadX = 0;
        this.camLookAheadY = 0;
        this.cameraTarget.set(spawnX, spawnY);
        this.cameras.main.centerOn(spawnX, spawnY);
        this.roomManager.enterRoom(targetRoomIdx);
        if (this.uiScene && this.uiScene.hud) {
          this.uiScene.hud.renderMinimap(this.roomManager.rooms, targetRoomIdx);
        }
        this.cameras.main.fadeIn(120, 11, 13, 19);
      }
    });
  }

  private checkProjectileHits(): void {
    const activeProjectiles = this.projectilePool.getActiveProjectiles();

    for (const p of activeProjectiles) {
      if (p.isPlayer) {
        // 1. Player bullet hitting enemies
        for (const enemy of this.roomManager.activeEnemies) {
          if (enemy.isDead || p.hitEntities.has(enemy)) continue;

          const dist = Math.hypot(p.sprite.x - enemy.sprite.x, p.sprite.y - enemy.sprite.y);
          if (dist < 22) {
            p.hitEntities.add(enemy);

            const dx = enemy.sprite.x - p.sprite.x;
            const dy = enemy.sprite.y - p.sprite.y;
            const len = Math.hypot(dx, dy) || 1;

            enemy.takeDamage({
              amount: p.damage,
              isCrit: p.isCrit,
              element: p.element === 'vampire' ? undefined : p.element,
              knockback: {
                x: dx / len,
                y: dy / len,
                force: p.isCrit ? 220 : 120
              },
              isPlayerAttack: true
            });

            if (p.element === 'fire') {
              StatusManager.applyStatus(enemy as any, 'burn', 2.5, 2, 0.5);
            } else if (p.element === 'frost') {
              StatusManager.applyStatus(enemy as any, 'freeze', 1.6, 0, 1.0, 0.5);
            } else if (p.element === 'poison') {
              StatusManager.applyStatus(enemy as any, 'poison', 3.0, 2, 0.5);
            } else if (p.element === 'vampire') {
              this.player.onVampireBatHit();
            }

            if (p.isFrostNova) {
              p.isFrostNova = false;
              const shardDamage = Math.max(2, Math.round(p.damage * 0.45));
              for (let k = 0; k < 6; k++) {
                const ang = (Math.PI * 2 * k) / 6;
                const shard = this.projectilePool.spawn({
                  x: p.sprite.x,
                  y: p.sprite.y,
                  angleRad: ang,
                  speed: 360,
                  damage: shardDamage,
                  isPlayer: true,
                  isCrit: false,
                  element: 'frost',
                  texture: 'bullet_ice_shard',
                  range: 140
                });
                if (shard) {
                  shard.hitEntities.add(enemy);
                }
              }
              this.effects?.spawnRingBurst(p.sprite.x, p.sprite.y, 0x38bdf8, 8);
            }

            // Soul Knight tactile feel: Crit screen shake & Chain Lightning shock (safe instance lookup!)
            const isThunderStaff = p.sprite.texture.key === 'bullet_lightning';
            if (p.isCrit || p.element === 'lightning' || isThunderStaff) {
              if (p.isCrit) {
                this.cameras.main.shake(120, 0.01);
              }
              const chainRadius = isThunderStaff ? 160 : 130;
              const maxChainTargets = isThunderStaff ? 3 : 2;
              const chainTargets = StatusManager.findChainTargets(
                enemy,
                this.roomManager.activeEnemies,
                chainRadius,
                maxChainTargets
              );
              if (chainTargets.length > 0) {
                if (isThunderStaff) {
                  audio.playLightning();
                } else {
                  audio.playChainLightning();
                }
                const chainDamage = isThunderStaff ? 5 : Math.max(1, Math.ceil(p.damage * 0.65));
                for (const ct of chainTargets) {
                  const targetEnemy = this.roomManager.activeEnemies.find(e => e.id === ct.id && !e.isDead);
                  if (!targetEnemy) continue;
                  this.drawLightningArc(enemy.sprite.x, enemy.sprite.y, targetEnemy.sprite.x, targetEnemy.sprite.y);
                  targetEnemy.takeDamage({
                    amount: chainDamage,
                    isCrit: false,
                    element: 'lightning',
                    isPlayerAttack: true
                  });
                }
              }
            }

            if (p.pierceRemaining > 0) {
              p.pierceRemaining--;
            } else {
              this.projectilePool.deactivate(p);
              break;
            }
          }
        }

        if (!p.active) continue;

        // 2. Player bullet hitting interactive barrels & crates
        if (this.roomManager.interactiveProps) {
          for (const prop of this.roomManager.interactiveProps.props) {
            if (prop.isDestroyed) continue;
            const dist = Math.hypot(p.sprite.x - prop.x, p.sprite.y - prop.y);
            if (dist < 20) {
              this.roomManager.interactiveProps.damageProp(
                prop,
                { amount: p.damage, isCrit: p.isCrit, isPlayerAttack: true },
                this.projectilePool,
                this.roomManager.activeEnemies,
                (cx, cy) => this.spawnCrateLoot(cx, cy)
              );
              this.projectilePool.deactivate(p);
              break;
            }
          }
        }
      } else {
        // 3. Enemy bullet hitting player or Vanguard reflective shield
        const dist = Math.hypot(p.sprite.x - this.player.sprite.x, p.sprite.y - this.player.sprite.y);
        if (this.player.isReflectShieldActive() && dist < 28) {
          p.isPlayer = true;
          p.isCrit = true;
          p.vx = -p.vx * 1.4;
          p.vy = -p.vy * 1.4;
          p.damage = Math.max(4, p.damage * 2);
          p.rangeRemaining = 420;
          p.hitEntities.clear();
          p.sprite.setTint(0xfacc15);
          p.sprite.setRotation(Math.atan2(p.vy, p.vx));
          audio.playParryBullet();
          continue;
        }
        if (dist < 18) {
          const hitRes = this.player.takeDamage({
            amount: p.damage,
            isPlayerAttack: false
          });

          if (hitRes !== null) {
            if (p.element === 'frost') {
              this.player.applyFrostSlow(1.2);
            }
            this.cameras.main.shake(150, 0.008);
            this.projectilePool.deactivate(p);
          }
        }

        // 4. Enemy bullet hitting barrels (barrel blocks bullets as cover)
        if (this.roomManager.interactiveProps) {
          for (const prop of this.roomManager.interactiveProps.props) {
            if (prop.isDestroyed) continue;
            const bDist = Math.hypot(p.sprite.x - prop.x, p.sprite.y - prop.y);
            if (bDist < 20) {
              this.roomManager.interactiveProps.damageProp(
                prop,
                { amount: p.damage, isCrit: false, isPlayerAttack: false },
                this.projectilePool,
                this.roomManager.activeEnemies
              );
              this.projectilePool.deactivate(p);
              break;
            }
          }
        }
      }
    }
  }

  private drawLightningArc(x1: number, y1: number, x2: number, y2: number): void {
    events.emit('combat:lightning-arc', { fromX: x1, fromY: y1, toX: x2, toY: y2 });

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
    const segments = 4;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const jitter = (Math.random() - 0.5) * 22;
      points.push({
        x: x1 + dx * t + nx * jitter,
        y: y1 + dy * t + ny * jitter
      });
    }
    points.push({ x: x2, y: y2 });

    const gfx = this.add.graphics().setDepth(22);
    // Outer cyan energy arc
    gfx.lineStyle(3.5, 0x38bdf8, 0.85);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.strokePath();

    // Inner bright yellow core
    gfx.lineStyle(1.8, 0xfef08a, 1);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.strokePath();

    this.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 160,
      onComplete: () => gfx.destroy()
    });
  }

  private spawnCrateLoot(x: number, y: number): void {
    const roll = Math.random();
    if (roll < 0.45) {
      this.roomManager.spawnPickup('coin', x, y, 1);
    } else if (roll < 0.7) {
      this.roomManager.spawnPickup('energy', x, y, 15);
    } else if (roll < 0.85) {
      this.roomManager.spawnPickup('heart', x, y, 1);
    }
  }

  private updatePickupsProximity(deltaSec: number): void {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const roomCleared = this.roomManager.getCurrentRoom()?.isCleared ?? false;
    const triggerRadius = roomCleared ? 340 : 155;
    const collectRadius = 22;

    this.nearestPickup = null;
    let closestDist = 999;

    for (let i = this.roomManager.pickups.length - 1; i >= 0; i--) {
      const p = this.roomManager.pickups[i];
      if (!p || !p.sprite.active) continue;
      const dist = Math.hypot(px - p.sprite.x, py - p.sprite.y);

      // Smooth Soul Knight magnet: stop bobbing tween once triggered so pickup glides seamlessly to hero
      if (p.type === 'coin' || p.type === 'energy' || p.type === 'heart') {
        if (!p.isMagnetized && dist <= triggerRadius) {
          p.isMagnetized = true;
          p.magnetSpeed = 180;
          this.tweens.killTweensOf(p.sprite);
        }

        if (p.isMagnetized && dist > 1) {
          p.magnetSpeed = Math.min(720, (p.magnetSpeed ?? 180) + 1400 * deltaSec);
          const angle = Math.atan2(py - p.sprite.y, px - p.sprite.x);
          const step = Math.min(dist, p.magnetSpeed * deltaSec);
          p.sprite.x += Math.cos(angle) * step;
          p.sprite.y += Math.sin(angle) * step;
        }

        const newDist = Math.hypot(px - p.sprite.x, py - p.sprite.y);
        if (newDist <= collectRadius) {
          if (p.type === 'coin') {
            this.player.addCoins(p.data || 1);
            audio.playCoinPickup();
            this.floatingNumbers.showNotice(p.sprite.x, p.sprite.y, `+${p.data || 1} Vàng`, '#f59e0b');
          } else if (p.type === 'heart') {
            this.player.heal(p.data || 2, 0);
            this.floatingNumbers.showNotice(p.sprite.x, p.sprite.y, `+${p.data || 2} Máu`, '#ef4444');
          } else {
            this.player.heal(0, p.data || 25);
            this.floatingNumbers.showNotice(p.sprite.x, p.sprite.y, `+${p.data || 25} NL`, '#38bdf8');
          }
          this.removePickup(p);
          continue;
        }
      }

      // Floor / Boss Exit Portal auto-triggers next floor or victory on close overlap
      if (p.type === 'portal' && dist < 24) {
        this.removePickup(p);
        this.advanceFromPortal();
        return;
      }

      // Smart Floor Weapon Merge Indicator (cyan halo when compatible with either held weapon)
      if (p.type === 'weapon') {
        const wData = p.data as WeaponData;
        const mergeWith = this.player.getMergeMatchForWeapon(wData);
        if (mergeWith) {
          this.roomManager.setPickupHaloColor(p, 0x22d3ee, 0.95);
        } else {
          this.roomManager.setPickupHaloColor(p, wData.tier === 2 ? 0xfacc15 : 0x64748b);
        }
      }

      // Check interaction proximity for Chest, Altar, Statue, Portal, Weapon, Shop Item (<48px)
      if (dist < 48 && dist < closestDist) {
        closestDist = dist;
        this.nearestPickup = p;
      }
    }

    if (this.nearestPickup) {
      if (this.nearestPickup.type === 'weapon') {
        const wData = this.nearestPickup.data as WeaponData;
        const mergeWith = this.player.getMergeMatchForWeapon(wData);
        const prompt = mergeWith
          ? `[E] Nhặt: ${wData.nameVi} ★ (Ghép ${mergeWith.nameVi}!)`
          : `[E] Nhặt: ${wData.nameVi}`;
        const mergeId = mergeWith ? findMergeResult(mergeWith.id, wData.id) : null;
        const mergeNameVi = mergeId && WEAPONS[mergeId] ? WEAPONS[mergeId].nameVi : null;
        this.floatingNumbers.hidePrompt();
        this.floatingNumbers.showWeaponTooltip(
          this.nearestPickup.sprite.x,
          this.nearestPickup.sprite.y,
          prompt,
          wData,
          this.player.getCurrentWeapon(),
          mergeNameVi
        );
      } else {
        let prompt = '[E] Tương tác';
        if (this.nearestPickup.type === 'chest') {
          prompt = '[E] Mở Rương Báu Cổ';
        } else if (this.nearestPickup.type === 'boss_chest') {
          prompt = '[E] Mở Rương Thủ Lĩnh';
        } else if (this.nearestPickup.type === 'altar') {
          prompt = '[E] Tiếp nhận Nâng Cấp Giả Kim';
        } else if (this.nearestPickup.type === 'statue') {
          prompt = `[E] Cầu nguyện (${this.nearestPickup.price || 12} Vàng)`;
        } else if (this.nearestPickup.type === 'vending') {
          prompt = `[E] Mua Nước Buff (${this.nearestPickup.price || 12} Vàng)`;
        } else if (this.nearestPickup.type === 'forge') {
          const mergePreview = this.player.getMergePreview();
          prompt = mergePreview
            ? `[E] Hợp Nhất: ${mergePreview.first.nameVi} + ${mergePreview.second.nameVi} -> ${mergePreview.result.nameVi} (Miễn phí)`
            : `[E] Cường Hóa Vũ Khí (${this.nearestPickup.price || 18} Vàng)`;
        } else if (this.nearestPickup.type === 'core_anvil') {
          prompt = `[E] Gắn Lõi Nguyên Tố (${this.nearestPickup.price || 15} Vàng)`;
        } else if (this.nearestPickup.type === 'weapon_core') {
          const coreData = this.nearestPickup.data as WeaponCoreData | undefined;
          prompt = coreData
            ? `[E] Gắn ${coreData.nameVi} (+${coreData.bonusDamage} ST)`
            : '[E] Nhặt Lõi Nguyên Tố';
        } else if (this.nearestPickup.type === 'portal') {
          prompt = this.currentFloor < TOTAL_FLOORS ? '[E] Bước Vào Tầng Tiếp Theo' : '[E] Hoàn Thành Hầm Ngục';
        } else if (this.nearestPickup.type === 'shop_item') {
          prompt = `[E] Mua: ${this.nearestPickup.label}`;
        }
        this.floatingNumbers.hideWeaponTooltip();
        this.floatingNumbers.showPrompt(this.nearestPickup.sprite.x, this.nearestPickup.sprite.y, prompt);
      }
    } else {
      this.floatingNumbers.hidePrompt();
    }
  }

  private interactWithNearest(): void {
    if (!this.isGameRunning || !this.player || !this.roomManager || !this.nearestPickup) return;

    const p = this.nearestPickup;

    if (p.type === 'weapon') {
      const droppedWeapon = p.data as WeaponData;
      const returnedWeapon = this.player.equipWeapon(droppedWeapon);

      this.removePickup(p);
      if (returnedWeapon) {
        this.roomManager.spawnPickup('weapon', this.player.sprite.x, this.player.sprite.y, returnedWeapon);
      }
    } else if (p.type === 'boss_chest') {
      audio.playPickup();
      p.sprite.setTexture('chest_open');

      const tier2Weapons: WeaponData[] = [
        WEAPONS.solar_laser,
        WEAPONS.boomerang_blade,
        WEAPONS.glacial_cannon,
        WEAPONS.frost_sword,
        WEAPONS.thunder_staff,
        WEAPONS.inferno_gatling
      ];
      const selectedWeapon = Phaser.Utils.Array.GetRandom(tier2Weapons);
      const px = p.sprite.x;
      const py = p.sprite.y;

      this.removePickup(p);
      this.roomManager.spawnPickup('weapon', px - 16, py + 12, selectedWeapon);
      this.roomManager.spawnPickup('weapon_core', px + 22, py + 12, pickRandomWeaponCore());
      this.effects?.spawnRingBurst(px, py, 0xf59e0b, 12);
    } else if (p.type === 'chest') {
      audio.playPickup();
      p.sprite.setTexture('chest_open');

      const highTierWeapons: WeaponData[] = [
        WEAPONS.shotgun,
        WEAPONS.repeater,
        WEAPONS.penetrator,
        WEAPONS.blade,
        WEAPONS.bow,
        WEAPONS.laser,
        WEAPONS.staff
      ];
      const selectedWeapon = Phaser.Utils.Array.GetRandom(highTierWeapons);
      const px = p.sprite.x;
      const py = p.sprite.y;

      this.removePickup(p);
      this.roomManager.spawnPickup('weapon', px, py + 10, selectedWeapon);
      if (Math.random() < 0.35) {
        this.roomManager.spawnPickup('weapon_core', px + 26, py + 10, pickRandomWeaponCore());
      }
    } else if (p.type === 'weapon_core') {
      const coreData = p.data as WeaponCoreData | undefined;
      if (!coreData) {
        this.removePickup(p);
        return;
      }
      const { weapon, core } = this.player.attachCoreToCurrentWeapon(coreData.id);
      this.floatingNumbers.showNotice(
        p.sprite.x,
        p.sprite.y - 24,
        `Gắn ${core.nameVi} -> ${weapon.nameVi}!`,
        core.colorHex
      );
      this.effects?.spawnRingBurst(p.sprite.x, p.sprite.y, core.colorNum, 10);
      this.removePickup(p);
    } else if (p.type === 'core_anvil') {
      const cost = p.price || 15;
      if (this.player.spendCoins(cost)) {
        const currentCoreId = this.player.getWeaponCore();
        const candidates = WEAPON_CORE_IDS.filter(id => id !== currentCoreId);
        const pickedId = Phaser.Utils.Array.GetRandom(candidates.length > 0 ? candidates : WEAPON_CORE_IDS);
        const { weapon, core } = this.player.attachCoreToCurrentWeapon(pickedId);
        this.floatingNumbers.showNotice(
          p.sprite.x,
          p.sprite.y - 24,
          `Gắn ${core.nameVi} -> ${weapon.nameVi}!`,
          core.colorHex
        );
        this.effects?.spawnRingBurst(p.sprite.x, p.sprite.y, core.colorNum, 10);
        this.removePickup(p);
      } else {
        audio.playGlassBreak();
        this.floatingNumbers.showNotice(this.player.sprite.x, this.player.sprite.y - 20, 'Không đủ Vàng!', '#ef4444');
      }
    } else if (p.type === 'altar') {
      const choices = this.player.getAvailableUpgrades(3);
      if (choices.length === 0) {
        audio.playGlassBreak();
        this.floatingNumbers.showNotice(
          this.player.sprite.x,
          this.player.sprite.y - 24,
          'Đã đạt tối đa mọi Nâng Cấp!',
          '#f59e0b'
        );
        return;
      }

      audio.playPickup();
      this.removePickup(p);

      events.emit('upgrade:offer', {
        choices,
        onSelected: (selectedUpgrade: any) => {
          this.player.applyUpgrade(selectedUpgrade.id);
        }
      });
    } else if (p.type === 'statue') {
      const cost = p.price || 12;
      if (this.player.spendCoins(cost)) {
        audio.playPickup();
        const blessingType = Math.random() < 0.5 ? 'knight' : 'sorcerer';
        (this.player as any).statueBlessing = blessingType;
        this.player.heal(1, 30);
        const nameVi = blessingType === 'knight' ? 'Phước Lành Kỵ Sĩ (Bắn đạn tỏa khi [F])' : 'Phước Lành Pháp Sư (Tên lửa đuổi khi [F])';
        this.floatingNumbers.showNotice(p.sprite.x, p.sprite.y - 24, nameVi, '#38bdf8');
        this.removePickup(p);
      } else {
        audio.playGlassBreak();
        this.floatingNumbers.showNotice(this.player.sprite.x, this.player.sprite.y - 20, 'Không đủ Vàng!', '#ef4444');
      }
    } else if (p.type === 'vending') {
      const cost = p.price || 12;
      if (this.player.spendCoins(cost)) {
        const kinds: ('vitality' | 'energy' | 'haste')[] = ['vitality', 'energy', 'haste'];
        const picked = Phaser.Utils.Array.GetRandom(kinds);
        const msg = this.player.applyDrinkBuff(picked);
        this.floatingNumbers.showNotice(p.sprite.x, p.sprite.y - 24, msg, '#38bdf8');
        this.removePickup(p);
      } else {
        audio.playGlassBreak();
        this.floatingNumbers.showNotice(this.player.sprite.x, this.player.sprite.y - 20, 'Không đủ Vàng!', '#ef4444');
      }
    } else if (p.type === 'forge') {
      const merged = this.player.mergeWeapons();
      if (merged) {
        this.floatingNumbers.showNotice(
          p.sprite.x,
          p.sprite.y - 24,
          `HỢP NHẤT: ${merged.nameVi}!`,
          '#38bdf8'
        );
        this.cameras.main.shake(180, 0.009);
        this.removePickup(p);
        return;
      }

      const cost = p.price || 18;
      const curWep = this.player.getCurrentWeapon();
      if (this.player.getForgeLevel(curWep.id) >= 2) {
        this.floatingNumbers.showNotice(this.player.sprite.x, this.player.sprite.y - 20, 'Vũ khí đã đạt cấp tối đa (+2)!', '#f59e0b');
        return;
      }
      if (this.player.spendCoins(cost)) {
        const nextLevel = this.player.forgeCurrentWeapon();
        this.floatingNumbers.showNotice(
          p.sprite.x,
          p.sprite.y - 24,
          `Cường hóa ${curWep.nameVi} (+${nextLevel})!`,
          '#f97316'
        );
        this.removePickup(p);
      } else {
        audio.playGlassBreak();
        this.floatingNumbers.showNotice(this.player.sprite.x, this.player.sprite.y - 20, 'Không đủ Vàng!', '#ef4444');
      }
    } else if (p.type === 'portal') {
      this.removePickup(p);
      this.advanceFromPortal();
    } else if (p.type === 'shop_item') {
      const price = p.price || 10;
      if (this.player.spendCoins(price)) {
        audio.playPickup();
        if (p.data.subType === 'heal') {
          this.player.heal(p.data.amount || 4, 0);
          this.floatingNumbers.showNotice(this.player.sprite.x, this.player.sprite.y - 20, '+4 Máu', '#22c55e');
        } else if (p.data.subType === 'energy') {
          this.player.heal(0, p.data.amount || 100);
          this.floatingNumbers.showNotice(this.player.sprite.x, this.player.sprite.y - 20, '+100 Năng Lượng', '#38bdf8');
        } else if (p.data.subType === 'weapon') {
          const oldW = this.player.equipWeapon(p.data.weapon);
          if (oldW) {
            this.roomManager.spawnPickup('weapon', this.player.sprite.x, this.player.sprite.y, oldW);
          }
          this.floatingNumbers.showNotice(this.player.sprite.x, this.player.sprite.y - 20, 'Trang bị Vũ khí mới!', '#f59e0b');
        }
        this.removePickup(p);
      } else {
        audio.playGlassBreak();
        this.floatingNumbers.showNotice(this.player.sprite.x, this.player.sprite.y - 20, 'Không đủ Vàng!', '#ef4444');
      }
    }
  }

  private pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  private removePickup(pickup: PickupItem): void {
    this.roomManager.removePickup(pickup);
    if (this.nearestPickup === pickup) {
      this.nearestPickup = null;
      this.floatingNumbers.hidePrompt();
    }
  }
}
