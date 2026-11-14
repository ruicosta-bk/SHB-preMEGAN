import Phaser from 'phaser';
import { RoomState, DoorData } from '../types/room';
import { EnemyBase } from '../enemies/EnemyBase';
import { EnemyGrunt } from '../enemies/EnemyGrunt';
import { EnemyShooter } from '../enemies/EnemyShooter';
import { EnemyFanCaster } from '../enemies/EnemyFanCaster';
import { EnemyCharger } from '../enemies/EnemyCharger';
import { BossIgnis } from '../enemies/BossIgnis';
import { ProjectilePool } from '../combat/ProjectilePool';
import { InteractiveProps } from './InteractiveProps';
import { WeaponData } from '../types/weapon';
import { WEAPONS } from '../data/weapons';
import { UPGRADES } from '../data/upgrades';
import { UpgradeData } from '../types/upgrade';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

export interface PickupItem {
  type: 'weapon' | 'heart' | 'energy' | 'chest' | 'altar' | 'coin' | 'shop_item';
  sprite: Phaser.GameObjects.Sprite;
  data?: any;
  price?: number;
  label?: string;
}

export class RoomManager {
  private scene: Phaser.Scene;
  public rooms: RoomState[];
  public currentRoomIndex: number = 0;
  public interactiveProps: InteractiveProps;

  // Active room visual objects
  private floorSprites: Phaser.GameObjects.Sprite[] = [];
  private wallSprites: Phaser.GameObjects.Sprite[] = [];
  private doorSprites: { door: DoorData; sprite: Phaser.GameObjects.Sprite; hitZone: Phaser.Geom.Rectangle }[] = [];
  private merchantSprites: Phaser.GameObjects.Sprite[] = [];
  public wallColliders: { x: number; y: number; width: number; height: number }[] = [];
  public doorColliders: { x: number; y: number; width: number; height: number }[] = [];

  // Active enemies in current room
  public activeEnemies: EnemyBase[] = [];

  // Pickups in world
  public pickups: PickupItem[] = [];

  constructor(scene: Phaser.Scene, rooms: RoomState[]) {
    this.scene = scene;
    this.rooms = rooms;
    this.interactiveProps = new InteractiveProps(scene);
  }

  public getCurrentRoom(): RoomState {
    return this.rooms[this.currentRoomIndex];
  }

  public buildRoom(roomIndex: number): void {
    this.clearCurrentRoomVisuals();
    this.currentRoomIndex = roomIndex;
    const room = this.rooms[roomIndex];
    room.isVisited = true;
    room.isCurrent = true;

    const tileSize = 32;
    const startX = room.worldX;
    const startY = room.worldY;
    const cols = room.layout.width;
    const rows = room.layout.height;

    // 1. Build Floor
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * tileSize + tileSize / 2;
        const y = startY + r * tileSize + tileSize / 2;
        const spr = this.scene.add.sprite(x, y, 'floor_tile').setDepth(1);
        this.floorSprites.push(spr);
      }
    }

    // 2. Build Perimeter Walls (leaving openings for doors)
    const hasNorthDoor = room.doors.some(d => d.direction === 'north');
    const hasSouthDoor = room.doors.some(d => d.direction === 'south');
    const hasEastDoor = room.doors.some(d => d.direction === 'east');
    const hasWestDoor = room.doors.some(d => d.direction === 'west');
    const doorCol = Math.floor(cols / 2);
    const doorRow = Math.floor(rows / 2);

    // Top & Bottom walls
    for (let c = 0; c < cols; c++) {
      if (!hasNorthDoor || c !== doorCol) {
        this.addWall(startX + c * tileSize, startY, tileSize, tileSize);
      }
      if (!hasSouthDoor || c !== doorCol) {
        this.addWall(startX + c * tileSize, startY + (rows - 1) * tileSize, tileSize, tileSize);
      }
    }
    // Left & Right walls
    for (let r = 1; r < rows - 1; r++) {
      if (!hasWestDoor || r !== doorRow) {
        this.addWall(startX, startY + r * tileSize, tileSize, tileSize);
      }
      if (!hasEastDoor || r !== doorRow) {
        this.addWall(startX + (cols - 1) * tileSize, startY + r * tileSize, tileSize, tileSize);
      }
    }

    // 3. Build Internal Obstacle Walls
    for (const w of room.layout.walls) {
      this.addWall(startX + w.x * tileSize, startY + w.y * tileSize, tileSize, tileSize, 'pillar_tile');
    }

    // 4. Build Doors
    this.doorColliders = [];
    this.doorSprites = [];
    for (const d of room.doors) {
      const isDoorOpen = room.isCleared;
      d.isOpen = isDoorOpen;
      const texture = isDoorOpen ? 'door_open' : 'door_closed';
      const spr = this.scene.add.sprite(d.x, d.y, texture).setDepth(4);
      const hitZone = new Phaser.Geom.Rectangle(d.x - 16, d.y - 16, 32, 32);

      this.doorSprites.push({ door: d, sprite: spr, hitZone });

      if (!isDoorOpen) {
        // Closed door collider blocks movement
        this.doorColliders.push({ x: d.x - 16, y: d.y - 16, width: 32, height: 32 });
      }
    }

    // 5. Spawn Interactive Barrels for tactical cover & chain explosions
    if (room.type === 'combat') {
      const bOffset = 100;
      this.interactiveProps.spawnProp('explosive', room.worldX + bOffset, room.worldY + bOffset);
      this.interactiveProps.spawnProp('toxic', room.worldX + room.width - bOffset, room.worldY + bOffset);
      this.interactiveProps.spawnProp('explosive', room.worldX + room.width - bOffset, room.worldY + room.height - bOffset);
      this.interactiveProps.spawnProp('toxic', room.worldX + bOffset, room.worldY + room.height - bOffset);
    }

    // 6. Spawn Enemies if room not yet cleared
    if (!room.isCleared) {
      this.spawnRoomEnemies(room);
    } else if (!room.rewardSpawned) {
      this.spawnRoomRewards(room);
    }

    // 7. If Rest Room, spawn Merchant NPC & Altar
    if (room.type === 'rest') {
      this.spawnRestRoomMerchant(room);
    }

    // Set camera bounds to this room
    this.scene.cameras.main.setBounds(
      room.worldX - 32,
      room.worldY - 32,
      room.width + 64,
      room.height + 64
    );

    events.emit('room:entered', { room });
  }

  private addWall(x: number, y: number, w: number, h: number, texture: string = 'wall_tile'): void {
    const spr = this.scene.add.sprite(x + w / 2, y + h / 2, texture).setDepth(3);
    this.wallSprites.push(spr);
    this.wallColliders.push({ x, y, width: w, height: h });
  }

  private spawnRoomEnemies(room: RoomState): void {
    this.activeEnemies = [];

    for (const sp of room.enemySpawns) {
      const worldPosX = room.worldX + sp.x * room.width;
      const worldPosY = room.worldY + sp.y * room.height;

      let enemy: EnemyBase | null = null;
      if (sp.type === 'grunt') {
        enemy = new EnemyGrunt(this.scene, worldPosX, worldPosY);
      } else if (sp.type === 'shooter') {
        enemy = new EnemyShooter(this.scene, worldPosX, worldPosY);
      } else if (sp.type === 'fan_caster') {
        enemy = new EnemyFanCaster(this.scene, worldPosX, worldPosY);
      } else if (sp.type === 'charger') {
        enemy = new EnemyCharger(this.scene, worldPosX, worldPosY);
      } else if (sp.type === 'boss_ignis') {
        enemy = new BossIgnis(this.scene, worldPosX, worldPosY);
      }

      if (enemy) {
        this.activeEnemies.push(enemy);
      }
    }

    if (this.activeEnemies.length > 0) {
      this.lockDoors();
    }
  }

  public update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    onRoomTransition: (targetRoomIdx: number, targetSpawnX: number, targetSpawnY: number) => void
  ): void {
    const curRoom = this.getCurrentRoom();
    const allBlockers = [...this.wallColliders, ...this.doorColliders];
    const roomBounds = {
      minX: curRoom.worldX + 36,
      maxX: curRoom.worldX + curRoom.width - 36,
      minY: curRoom.worldY + 36,
      maxY: curRoom.worldY + curRoom.height - 36
    };

    // 1. Update active enemies
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];
      if (enemy.isDead) {
        // Chance to spawn energy/heart drop on enemy death
        this.rollEnemyDrop(enemy.sprite.x, enemy.sprite.y);
        this.activeEnemies.splice(i, 1);
        continue;
      }
      enemy.update(deltaSec, playerX, playerY, pool, allBlockers, roomBounds);
    }

    // 2. Check room clear condition
    if (!curRoom.isCleared && this.activeEnemies.length === 0) {
      curRoom.isCleared = true;
      audio.playRoomClear();
      this.unlockDoors();
      this.spawnRoomRewards(curRoom);
      events.emit('room:cleared', { room: curRoom });
    }

    // 3. Check door trigger overlaps
    for (const ds of this.doorSprites) {
      if (ds.door.isOpen) {
        const dist = Math.hypot(playerX - ds.door.x, playerY - ds.door.y);
        if (dist < 40) {
          // Transition to adjacent room
          const targetIdx = ds.door.targetRoomIndex;
          const targetRoom = this.rooms[targetIdx];
          // Find opposite door in target room
          let spawnX = targetRoom.worldX + targetRoom.width / 2;
          let spawnY = targetRoom.worldY + targetRoom.height / 2;

          for (const targetDoor of targetRoom.doors) {
            if (targetDoor.targetRoomIndex === this.currentRoomIndex) {
              // Offset spawn 65px inward from door to avoid immediately re-triggering door
              if (targetDoor.direction === 'north') {
                spawnX = targetDoor.x;
                spawnY = targetDoor.y + 65;
              } else if (targetDoor.direction === 'south') {
                spawnX = targetDoor.x;
                spawnY = targetDoor.y - 65;
              } else if (targetDoor.direction === 'east') {
                spawnX = targetDoor.x - 65;
                spawnY = targetDoor.y;
              } else if (targetDoor.direction === 'west') {
                spawnX = targetDoor.x + 65;
                spawnY = targetDoor.y;
              }
              break;
            }
          }

          onRoomTransition(targetIdx, spawnX, spawnY);
          break;
        }
      }
    }
  }

  private rollEnemyDrop(x: number, y: number): void {
    // 1. Guaranteed coin drop (Soul Knight gold drop mechanic)
    const coinCount = Math.random() < 0.35 ? 2 : 1;
    for (let c = 0; c < coinCount; c++) {
      this.spawnPickup('coin', x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, 1);
    }

    // 2. Chance for recovery supplies
    const roll = Math.random();
    if (roll < 0.22) {
      this.spawnPickup('energy', x, y, 25);
    } else if (roll < 0.32) {
      this.spawnPickup('heart', x, y, 2);
    }
  }

  public spawnRestRoomMerchant(room: RoomState): void {
    if (room.rewardSpawned) return;
    room.rewardSpawned = true;

    const centerX = room.worldX + room.width / 2;
    const centerY = room.worldY + room.height / 2;

    // Mysterious Alchemist Merchant NPC with shadow
    const shadow = this.scene.add.sprite(centerX, centerY - 52, 'shadow').setDepth(4);
    const merchant = this.scene.add.sprite(centerX, centerY - 62, 'merchant_npc').setDepth(5).setScale(1.2);
    this.merchantSprites.push(shadow, merchant);

    // Shop item 1: Large Health Potion (+4 HP) for 15 Gold
    this.spawnPickup(
      'shop_item',
      centerX - 80,
      centerY - 10,
      { subType: 'heal', amount: 4 },
      15,
      'Bình Huyết Thạch (+4 HP) [15 Vàng]'
    );

    // Shop item 2: Large Energy Potion (+100 NL) for 10 Gold
    this.spawnPickup(
      'shop_item',
      centerX,
      centerY - 10,
      { subType: 'energy', amount: 100 },
      10,
      'Bình Linh Lực (+100 NL) [10 Vàng]'
    );

    // Shop item 3: Rare Blade for 30 Gold
    this.spawnPickup(
      'shop_item',
      centerX + 80,
      centerY - 10,
      { subType: 'weapon', weapon: WEAPONS.blade },
      30,
      'Đoản Kiếm Phản Đạn [30 Vàng]'
    );

    // Altar for free upgrade choice!
    this.spawnPickup('altar', centerX, centerY + 65);
  }

  public spawnRoomRewards(room: RoomState): void {
    if (room.rewardSpawned) return;
    room.rewardSpawned = true;

    const centerX = room.worldX + room.width / 2;
    const centerY = room.worldY + room.height / 2;

    if (room.type === 'treasure') {
      // Guaranteed weapon chest + coins
      this.spawnPickup('chest', centerX, centerY);
      this.spawnPickup('coin', centerX - 25, centerY + 25, 3);
      this.spawnPickup('coin', centerX + 25, centerY + 25, 3);
      this.spawnPickup('heart', centerX - 60, centerY, 3);
      this.spawnPickup('energy', centerX + 60, centerY, 60);
    } else if (room.type === 'rest') {
      this.spawnRestRoomMerchant(room);
    } else if (room.index === 2 || room.index === 5) {
      // Altar after Combat 2 and Combat 4
      this.spawnPickup('altar', centerX, centerY);
    } else if (room.type === 'combat') {
      // Combat reward drops
      this.spawnPickup('energy', centerX - 30, centerY, 40);
      this.spawnPickup('heart', centerX + 30, centerY, 2);
      this.spawnPickup('coin', centerX, centerY, 2);
    }
  }

  public spawnPickup(
    type: 'weapon' | 'heart' | 'energy' | 'chest' | 'altar' | 'coin' | 'shop_item',
    x: number,
    y: number,
    data?: any,
    price?: number,
    label?: string
  ): void {
    let texture = 'pickup_energy';
    if (type === 'heart') texture = 'pickup_heart';
    else if (type === 'coin') texture = 'pickup_coin';
    else if (type === 'chest') texture = 'chest_closed';
    else if (type === 'altar') texture = 'upgrade_altar';
    else if (type === 'weapon') texture = (data as WeaponData)?.iconTexture || 'icon_shotgun';
    else if (type === 'shop_item') {
      if (data?.subType === 'heal') texture = 'potion_health_large';
      else if (data?.subType === 'energy') texture = 'potion_energy_large';
      else if (data?.subType === 'weapon') texture = (data?.weapon as WeaponData)?.iconTexture || 'icon_blade';
    }

    const spr = this.scene.add.sprite(x, y, texture).setDepth(6);

    // Floating bobbing tween for items
    if (type !== 'chest' && type !== 'altar') {
      this.scene.tweens.add({
        targets: spr,
        y: y - 5,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    this.pickups.push({ type, sprite: spr, data, price, label });
  }

  public lockDoors(): void {
    this.doorColliders = [];
    for (const ds of this.doorSprites) {
      ds.door.isOpen = false;
      ds.sprite.setTexture('door_closed');
      this.doorColliders.push({ x: ds.door.x - 16, y: ds.door.y - 16, width: 32, height: 32 });
    }
    events.emit('room:doors-locked');
  }

  public unlockDoors(): void {
    this.doorColliders = [];
    for (const ds of this.doorSprites) {
      ds.door.isOpen = true;
      ds.sprite.setTexture('door_open');
    }
    events.emit('room:doors-unlocked');
  }

  public clearCurrentRoomVisuals(): void {
    for (const spr of this.floorSprites) spr.destroy();
    this.floorSprites = [];
    for (const spr of this.wallSprites) spr.destroy();
    this.wallSprites = [];
    for (const ds of this.doorSprites) ds.sprite.destroy();
    this.doorSprites = [];
    this.wallColliders = [];
    this.doorColliders = [];
    for (const e of this.activeEnemies) e.destroy();
    this.activeEnemies = [];
    for (const p of this.pickups) p.sprite.destroy();
    this.pickups = [];
    for (const m of this.merchantSprites) m.destroy();
    this.merchantSprites = [];
    if (this.interactiveProps) {
      this.interactiveProps.clearAll();
    }
  }
}
