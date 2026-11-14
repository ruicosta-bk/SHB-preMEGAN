import Phaser from 'phaser';
import { TextureGenerator } from '../presentation/TextureGenerator';
import { DungeonGenerator } from '../world/DungeonGenerator';
import { RoomManager, PickupItem } from '../world/RoomManager';
import { PlayerController } from '../player/PlayerController';
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
  private projectilePool!: ProjectilePool;
  private roomManager!: RoomManager;
  private floatingNumbers!: FloatingNumbers;
  private uiScene!: UIScene;

  // Game state
  private isGameRunning: boolean = false;
  private isPaused: boolean = false;
  private seed: number = 1000;

  // Run statistics
  private runTime: number = 0;
  private enemiesDefeated: number = 0;
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

    // 4. Register window blur to auto-pause
    window.addEventListener('blur', () => {
      if (this.isGameRunning && !this.isPaused && !this.uiScene.isAnyModalOpen) {
        this.togglePause();
      }
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
        const bossRoom = this.roomManager.rooms[7];
        const spawnX = bossRoom.worldX + bossRoom.width / 2;
        const spawnY = bossRoom.worldY + bossRoom.height / 2;
        this.transitionToRoom(7, spawnX, spawnY);
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

    events.on('combat:enemy-died', (data: any) => {
      this.enemiesDefeated++;
      if (data.type === 'boss_ignis') {
        // Boss drops a burst of 15 gold coins!
        if (this.roomManager) {
          for (let i = 0; i < 15; i++) {
            const rx = data.x + (Math.random() - 0.5) * 80;
            const ry = data.y + (Math.random() - 0.5) * 80;
            this.roomManager.spawnPickup('coin', rx, ry, 1);
          }
        }
        this.handleVictory();
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
              this.roomManager.activeEnemies
            );
          }
        }
      }
    });

    events.on('player:died', () => {
      this.handleGameOver(false);
    });

    events.on('game:restart', () => {
      this.startNewRun();
    });
  }

  public startNewRun(): void {
    this.isGameRunning = true;
    this.isPaused = false;
    this.runTime = 0;
    this.enemiesDefeated = 0;
    this.damageDealt = 0;
    this.seed = Math.floor(Math.random() * 99999) + 1;

    // Reset projectile pool
    this.projectilePool.clearAll();

    // Clean previous room manager
    if (this.roomManager) {
      this.roomManager.clearCurrentRoomVisuals();
    }

    // Clean previous player
    if (this.player) {
      this.player.destroy();
    }

    // Generate fresh dungeon floor
    const floorRooms = DungeonGenerator.generateFloor(this.seed);
    this.roomManager = new RoomManager(this, floorRooms);

    // Spawn player in center of start room (Room 0)
    const startRoom = floorRooms[0];
    const playerSpawnX = startRoom.worldX + startRoom.width / 2;
    const playerSpawnY = startRoom.worldY + startRoom.height / 2;

    this.player = new PlayerController(this, playerSpawnX, playerSpawnY);

    // Build start room
    this.roomManager.buildRoom(0);

    if (this.uiScene && this.uiScene.hud) {
      this.uiScene.hud.renderMinimap(floorRooms, 0);
    }

    // Setup Camera for gameplay (1.4x zoom gives excellent pixel clarity)
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.4);
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
    const stats = {
      isVictory,
      timeSeconds: this.runTime,
      enemiesDefeated: this.enemiesDefeated,
      roomsCleared: this.roomManager.rooms.filter(r => r.isCleared).length,
      damageDealt: this.damageDealt
    };
    events.emit('game:over', stats);
  }

  private handleVictory(): void {
    audio.playRoomClear();
    this.cameras.main.shake(400, 0.02);
    this.time.delayedCall(1200, () => {
      this.isGameRunning = false;
      const stats = {
        isVictory: true,
        timeSeconds: this.runTime,
        enemiesDefeated: this.enemiesDefeated,
        roomsCleared: this.roomManager.rooms.filter(r => r.isCleared).length,
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

    const propObstacles = this.roomManager.interactiveProps ? this.roomManager.interactiveProps.getObstacleColliders() : [];
    const allWallsAndProps = [...this.roomManager.wallColliders, ...propObstacles];

    // 1. Update Player
    this.player.update(
      deltaSec,
      pointer,
      this.projectilePool,
      allWallsAndProps,
      this.roomManager.doorColliders
    );

    // 2. Camera slight lookahead towards mouse
    const cam = this.cameras.main;
    const lookX = this.player.sprite.x + (pointer.worldX - this.player.sprite.x) * 0.18;
    const lookY = this.player.sprite.y + (pointer.worldY - this.player.sprite.y) * 0.18;
    cam.centerOn(
      Phaser.Math.Linear(cam.midPoint.x, lookX, 0.08),
      Phaser.Math.Linear(cam.midPoint.y, lookY, 0.08)
    );

    // 3. Update Room Manager (Enemies AI, Room Clear, Door Triggers)
    this.roomManager.update(
      deltaSec,
      this.player.sprite.x,
      this.player.sprite.y,
      this.projectilePool,
      (targetRoomIdx, spawnX, spawnY) => {
        this.transitionToRoom(targetRoomIdx, spawnX, spawnY);
      }
    );

    // 4. Update Projectiles
    this.projectilePool.update(deltaSec, this.roomManager.wallColliders);

    // 5. Check Projectile Collisions
    this.checkProjectileHits();

    // 6. Check Pickups Proximity
    this.updatePickupsProximity();
  }

  private transitionToRoom(targetRoomIdx: number, spawnX: number, spawnY: number): void {
    // Camera quick fade transition
    this.cameras.main.fade(120, 11, 13, 19, false, (cam: any, progress: number) => {
      if (progress >= 1) {
        this.projectilePool.clearAll();
        this.player.sprite.setPosition(spawnX, spawnY);
        this.roomManager.buildRoom(targetRoomIdx);
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

            // Soul Knight tactile feel: Crit screen shake & Chain Lightning shock
            if (p.isCrit) {
              this.cameras.main.shake(140, 0.012);
              const chainTargets = StatusManager.findChainTargets(enemy, this.roomManager.activeEnemies, 130, 2);
              if (chainTargets.length > 0) {
                audio.playChainLightning();
                for (const ct of chainTargets) {
                  this.drawLightningArc(enemy.sprite.x, enemy.sprite.y, ct.x, ct.y);
                  (ct as any).takeDamage({
                    amount: Math.max(1, Math.ceil(p.damage * 0.7)),
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

        // 2. Player bullet hitting interactive barrels
        if (this.roomManager.interactiveProps) {
          for (const prop of this.roomManager.interactiveProps.props) {
            if (prop.isDestroyed) continue;
            const dist = Math.hypot(p.sprite.x - prop.x, p.sprite.y - prop.y);
            if (dist < 20) {
              this.roomManager.interactiveProps.damageProp(
                prop,
                { amount: p.damage, isCrit: p.isCrit, isPlayerAttack: true },
                this.projectilePool,
                this.roomManager.activeEnemies
              );
              this.projectilePool.deactivate(p);
              break;
            }
          }
        }
      } else {
        // 3. Enemy bullet hitting player
        const dist = Math.hypot(p.sprite.x - this.player.sprite.x, p.sprite.y - this.player.sprite.y);
        if (dist < 18) {
          const hitRes = this.player.takeDamage({
            amount: p.damage,
            isPlayerAttack: false
          });

          if (hitRes !== null) {
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

  private updatePickupsProximity(): void {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    this.nearestPickup = null;
    let closestDist = 999;

    for (const p of this.roomManager.pickups) {
      const dist = Math.hypot(px - p.sprite.x, py - p.sprite.y);

      // Magnetic coin pickup: pull towards player if <90px, auto-collect if <24px
      if (p.type === 'coin') {
        if (dist < 90) {
          const angle = Math.atan2(py - p.sprite.y, px - p.sprite.x);
          p.sprite.x += Math.cos(angle) * 320 * 0.016;
          p.sprite.y += Math.sin(angle) * 320 * 0.016;
        }
        if (dist < 24) {
          this.player.addCoins(p.data || 1);
          audio.playCoinPickup();
          this.floatingNumbers.showNotice(p.sprite.x, p.sprite.y, `+${p.data || 1} Vàng`, '#f59e0b');
          this.removePickup(p);
          continue;
        }
      }

      // Auto-collect hearts and energy on overlap (<24px)
      if (dist < 24) {
        if (p.type === 'heart') {
          this.player.heal(p.data || 2, 0);
          this.removePickup(p);
          continue;
        } else if (p.type === 'energy') {
          this.player.heal(0, p.data || 25);
          this.removePickup(p);
          continue;
        }
      }

      // Check interaction proximity for Chest, Altar, Weapon, Shop Item (<45px)
      if (dist < 45 && dist < closestDist) {
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
        WEAPONS.blade
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
