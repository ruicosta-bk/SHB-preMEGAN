import Phaser from 'phaser';
import { TextureGenerator } from '../presentation/TextureGenerator';
import { DungeonGenerator } from '../world/DungeonGenerator';
import { RoomManager, PickupItem } from '../world/RoomManager';
import { PlayerController } from '../player/PlayerController';
import { PetController } from '../player/PetController';
import { HeroId } from '../data/heroes';
import { getFloorMeta, TOTAL_FLOORS } from '../data/biomes';
import { ProjectilePool } from '../combat/ProjectilePool';
import { StatusManager } from '../combat/StatusManager';
import { FloatingNumbers } from '../ui/FloatingNumbers';
import { UIScene } from './UIScene';
import { WeaponData } from '../types/weapon';
import { WEAPONS } from '../data/weapons';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

export class MainScene extends Phaser.Scene {
  private player!: PlayerController;
  private pet!: PetController;
  private projectilePool!: ProjectilePool;
  private roomManager!: RoomManager;
  private floatingNumbers!: FloatingNumbers;
  private uiScene!: UIScene;

  // Game state
  private currentHeroId: HeroId = 'alchemist';
  private isGameRunning: boolean = false;
  private isPaused: boolean = false;
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

  constructor() {
    super({ key: 'MainScene' });
  }

  public create(): void {
    // 1. Generate all textures procedurally
    TextureGenerator.generateAll(this);

    // 2. Initialize Projectile Pool & World Systems
    this.projectilePool = new ProjectilePool(this);
    this.floatingNumbers = new FloatingNumbers(this);

    // 3. Launch UI Scene in parallel
    this.scene.launch('UIScene');
    this.uiScene = this.scene.get('UIScene') as UIScene;

    // 4. Register window blur to auto-pause & reset latched keyboard state
    window.addEventListener('blur', () => {
      this.input.keyboard?.resetKeys();
      if (this.isGameRunning && !this.isPaused && !this.uiScene.isAnyModalOpen) {
        this.togglePause();
      }
    });

    this.input.on('pointerdown', () => {
      if (typeof window.focus === 'function') window.focus();
    });

    // 5. Esc key listener for pause
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.isGameRunning && !this.uiScene.isAnyModalOpen) {
        this.togglePause();
      }
    });

    // 6. E key listener for pickup interaction
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
    });

    events.on('room:cleared', () => {
      this.totalRoomsCleared++;
    });

    events.on('combat:enemy-died', (data: any) => {
      this.enemiesDefeated++;
      if (this.player) {
        this.player.onEnemyKilled();
      }
      if (data.type === 'boss_ignis') {
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
              knockback: { x: dx / len, y: dy / len, force: 210 },
              isPlayerAttack: true
            });
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

    events.on('combat:explosion', (data: { x: number; y: number; radius: number; damage: number }) => {
      if (!this.roomManager) return;

      // 1. Damage all active enemies in blast radius
      for (const enemy of this.roomManager.activeEnemies) {
        if (enemy.isDead) continue;
        const dist = Math.hypot(enemy.sprite.x - data.x, enemy.sprite.y - data.y);
        if (dist <= data.radius) {
          const dx = enemy.sprite.x - data.x;
          const dy = enemy.sprite.y - data.y;
          const len = Math.hypot(dx, dy) || 1;

          enemy.takeDamage({
            amount: data.damage,
            isCrit: true,
            element: 'fire',
            knockback: { x: dx / len, y: dy / len, force: 280 },
            isPlayerAttack: true
          });
          StatusManager.applyStatus(enemy as any, 'burn', 3.0, 3, 0.5);
        }
      }

      // 2. Chain reaction: detonate other barrels within blast radius!
      if (this.roomManager.interactiveProps) {
        for (const prop of this.roomManager.interactiveProps.props) {
          if (prop.isDestroyed) continue;
          const dist = Math.hypot(prop.x - data.x, prop.y - data.y);
          if (dist <= data.radius && dist > 8) {
            this.roomManager.interactiveProps.damageProp(
              prop,
              { amount: data.damage, isCrit: true, isPlayerAttack: true },
              this.projectilePool,
              this.roomManager.activeEnemies,
              (cx, cy) => this.spawnCrateLoot(cx, cy)
            );
          }
        }
      }
    });

    events.on('player:laser-beam', (data: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      damage: number;
      isCrit: boolean;
    }) => {
      if (!this.roomManager) return;
      for (const enemy of this.roomManager.activeEnemies) {
        if (enemy.isDead) continue;
        const d = this.pointToSegmentDist(enemy.sprite.x, enemy.sprite.y, data.x1, data.y1, data.x2, data.y2);
        if (d <= 20) {
          enemy.takeDamage({
            amount: data.damage,
            isCrit: data.isCrit,
            isPlayerAttack: true
          });
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

    events.on('player:died', () => {
      this.handleGameOver(false);
    });

    events.on('game:restart', (data?: { heroId?: HeroId }) => {
      this.startNewRun(data?.heroId || this.currentHeroId);
    });
  }

  public startNewRun(heroId?: HeroId): void {
    if (heroId) {
      this.currentHeroId = heroId;
    }
    this.isGameRunning = true;
    this.isPaused = false;
    this.isTransitioningFloor = false;
    this.currentFloor = 1;
    this.runTime = 0;
    this.enemiesDefeated = 0;
    this.totalRoomsCleared = 0;
    this.damageDealt = 0;
    this.seed = Math.floor(Math.random() * 99999) + 1;

    // Reset projectile pool
    this.projectilePool.clearAll();

    // Clean previous room manager
    if (this.roomManager) {
      this.roomManager.clearCurrentRoomVisuals();
    }

    // Clean previous player & pet
    if (this.player) {
      this.player.destroy();
    }
    if (this.pet) {
      this.pet.destroy();
    }

    // Generate fresh seamless dungeon floor + corridors
    const floorRooms = DungeonGenerator.generateFloor(this.seed, this.currentFloor);
    const corridors = DungeonGenerator.generateCorridors(floorRooms);
    this.roomManager = new RoomManager(this, floorRooms, corridors, this.currentFloor);

    // Spawn player & pet in center of start room (Room 0)
    const startRoom = floorRooms[0];
    const playerSpawnX = startRoom.worldX + startRoom.width / 2;
    const playerSpawnY = startRoom.worldY + startRoom.height / 2;

    this.player = new PlayerController(this, playerSpawnX, playerSpawnY, this.currentHeroId);
    this.pet = new PetController(this, playerSpawnX, playerSpawnY);

    // Build entire connected dungeon floor
    this.roomManager.buildEntireFloor();

    const meta = getFloorMeta(this.currentFloor);
    events.emit('floor:changed', meta);
    if (this.uiScene && this.uiScene.hud) {
      this.uiScene.hud.renderMinimap(floorRooms, 0);
    }

    // Setup Camera for gameplay (1.5x zoom frames compact Soul Knight rooms crisply)
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.5);
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
      if (this.roomManager) {
        this.roomManager.clearCurrentRoomVisuals();
      }

      const floorRooms = DungeonGenerator.generateFloor(this.seed, this.currentFloor);
      const corridors = DungeonGenerator.generateCorridors(floorRooms);
      this.roomManager = new RoomManager(this, floorRooms, corridors, this.currentFloor);

      const startRoom = floorRooms[0];
      const spawnX = startRoom.worldX + startRoom.width / 2;
      const spawnY = startRoom.worldY + startRoom.height / 2;

      this.player.prepareForNextFloor(spawnX, spawnY);
      this.pet.resetPosition(spawnX, spawnY);
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

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    events.emit('game:pause-toggled', {
      isPaused: this.isPaused,
      onResume: () => {
        this.isPaused = false;
      },
      onRestart: () => {
        this.startNewRun();
      }
    });
  }

  private handleGameOver(isVictory: boolean): void {
    this.isGameRunning = false;
    const meta = getFloorMeta(this.currentFloor);
    const stats = {
      isVictory,
      timeSeconds: this.runTime,
      enemiesDefeated: this.enemiesDefeated,
      roomsCleared: Math.max(this.totalRoomsCleared, this.roomManager.rooms.filter(r => r.isCleared).length),
      totalRooms: this.currentFloor * 8,
      floorReached: `${meta.code} · ${meta.biomeNameVi}`,
      damageDealt: this.damageDealt
    };
    events.emit('game:over', stats);
  }

  private handleVictory(): void {
    this.isTransitioningFloor = true;
    audio.playRoomClear();
    this.cameras.main.shake(400, 0.02);
    this.time.delayedCall(1200, () => {
      this.isGameRunning = false;
      const meta = getFloorMeta(this.currentFloor);
      const stats = {
        isVictory: true,
        timeSeconds: this.runTime,
        enemiesDefeated: this.enemiesDefeated,
        roomsCleared: Math.max(this.totalRoomsCleared, this.roomManager.rooms.filter(r => r.isCleared).length),
        totalRooms: this.currentFloor * 8,
        floorReached: `${meta.code} · ${meta.biomeNameVi}`,
        damageDealt: this.damageDealt
      };
      events.emit('game:victory', stats);
    });
  }

  public override update(time: number, delta: number): void {
    if (!this.isGameRunning || this.isPaused || (this.uiScene && this.uiScene.isAnyModalOpen)) {
      return;
    }

    // Delta in seconds (clamped to prevent physics jumps after background tab freeze)
    const deltaSec = Math.min(delta / 1000, 0.05);
    this.runTime += deltaSec;

    const pointer = this.input.activePointer;

    const allWallsAndProps = this.roomManager.getAllSolidColliders();

    // 1. Update Player
    this.player.update(
      deltaSec,
      pointer,
      this.projectilePool,
      allWallsAndProps,
      this.roomManager.doorColliders
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

    // 2. Camera slight lookahead towards mouse
    const cam = this.cameras.main;
    const lookX = this.player.sprite.x + (pointer.worldX - this.player.sprite.x) * 0.18;
    const lookY = this.player.sprite.y + (pointer.worldY - this.player.sprite.y) * 0.18;
    cam.centerOn(
      Phaser.Math.Linear(cam.midPoint.x, lookX, 0.08),
      Phaser.Math.Linear(cam.midPoint.y, lookY, 0.08)
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
      }
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

    // 4. Update Projectiles (with active enemies for homing staff/sorcerer missiles)
    this.projectilePool.update(
      deltaSec,
      [...allWallsAndProps, ...this.roomManager.doorColliders],
      this.roomManager.activeEnemies
    );

    // 5. Check Projectile Collisions
    this.checkProjectileHits();

    // 6. Check Pickups Proximity
    this.updatePickupsProximity(deltaSec);
  }

  private transitionToRoom(targetRoomIdx: number, spawnX: number, spawnY: number): void {
    // Camera quick fade transition (used for Debug B boss jump)
    this.cameras.main.fade(120, 11, 13, 19, false, (_cam: any, progress: number) => {
      if (progress >= 1) {
        this.projectilePool.clearAll();
        this.player.sprite.setPosition(spawnX, spawnY);
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
            } else if (p.element === 'vampire') {
              this.player.onVampireBatHit();
            }

            // Soul Knight tactile feel: Crit screen shake & Chain Lightning shock (safe instance lookup!)
            if (p.isCrit || p.element === 'lightning') {
              if (p.isCrit) {
                this.cameras.main.shake(120, 0.01);
              }
              const chainTargets = StatusManager.findChainTargets(enemy, this.roomManager.activeEnemies, 130, 2);
              if (chainTargets.length > 0) {
                audio.playChainLightning();
                for (const ct of chainTargets) {
                  const targetEnemy = this.roomManager.activeEnemies.find(e => e.id === ct.id && !e.isDead);
                  if (!targetEnemy) continue;
                  this.drawLightningArc(enemy.sprite.x, enemy.sprite.y, targetEnemy.sprite.x, targetEnemy.sprite.y);
                  targetEnemy.takeDamage({
                    amount: Math.max(1, Math.ceil(p.damage * 0.65)),
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
    const gfx = this.add.graphics().setDepth(22);
    gfx.lineStyle(2, 0x38bdf8, 1);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 20;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;
    gfx.lineTo(midX, midY);
    gfx.lineTo(x2, y2);
    gfx.strokePath();

    this.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 150,
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

      // Check interaction proximity for Chest, Altar, Statue, Portal, Weapon, Shop Item (<48px)
      if (dist < 48 && dist < closestDist) {
        closestDist = dist;
        this.nearestPickup = p;
      }
    }

    if (this.nearestPickup) {
      let prompt = '[E] Tương tác';
      if (this.nearestPickup.type === 'weapon') {
        const wData = this.nearestPickup.data as WeaponData;
        prompt = `[E] Nhặt: ${wData.nameVi}`;
      } else if (this.nearestPickup.type === 'chest') {
        prompt = '[E] Mở Rương Báu Cổ';
      } else if (this.nearestPickup.type === 'altar') {
        prompt = '[E] Tiếp nhận Nâng Cấp Giả Kim';
      } else if (this.nearestPickup.type === 'statue') {
        prompt = `[E] Cầu nguyện (${this.nearestPickup.price || 12} Vàng)`;
      } else if (this.nearestPickup.type === 'vending') {
        prompt = `[E] Mua Nước Buff (${this.nearestPickup.price || 12} Vàng)`;
      } else if (this.nearestPickup.type === 'forge') {
        prompt = `[E] Cường Hóa Vũ Khí (${this.nearestPickup.price || 18} Vàng)`;
      } else if (this.nearestPickup.type === 'portal') {
        prompt = this.currentFloor < TOTAL_FLOORS ? '[E] Bước Vào Tầng Tiếp Theo' : '[E] Hoàn Thành Hầm Ngục';
      } else if (this.nearestPickup.type === 'shop_item') {
        prompt = `[E] Mua: ${this.nearestPickup.label}`;
      }
      this.floatingNumbers.showPrompt(this.nearestPickup.sprite.x, this.nearestPickup.sprite.y, prompt);
    } else {
      this.floatingNumbers.hidePrompt();
    }
  }

  private interactWithNearest(): void {
    if (!this.nearestPickup) return;

    const p = this.nearestPickup;

    if (p.type === 'weapon') {
      const droppedWeapon = p.data as WeaponData;
      const returnedWeapon = this.player.equipWeapon(droppedWeapon);

      this.removePickup(p);
      if (returnedWeapon) {
        this.roomManager.spawnPickup('weapon', this.player.sprite.x, this.player.sprite.y, returnedWeapon);
      }
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

      this.removePickup(p);
      this.roomManager.spawnPickup('weapon', p.sprite.x, p.sprite.y + 10, selectedWeapon);
    } else if (p.type === 'altar') {
      audio.playPickup();
      this.removePickup(p);

      events.emit('upgrade:offer', {
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
    pickup.sprite.destroy();
    const idx = this.roomManager.pickups.indexOf(pickup);
    if (idx !== -1) {
      this.roomManager.pickups.splice(idx, 1);
    }
    if (this.nearestPickup === pickup) {
      this.nearestPickup = null;
      this.floatingNumbers.hidePrompt();
    }
  }
}
