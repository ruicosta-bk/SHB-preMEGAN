import Phaser from 'phaser';
import { RoomState, DoorData, CorridorData, EnemySpawnDef } from '../types/room';
import { FloorMeta, getFloorMeta } from '../data/biomes';
import { EnemyBase } from '../enemies/EnemyBase';
import { EnemyGrunt } from '../enemies/EnemyGrunt';
import { EnemyShooter } from '../enemies/EnemyShooter';
import { EnemyFanCaster } from '../enemies/EnemyFanCaster';
import { EnemyCharger } from '../enemies/EnemyCharger';
import { BossIgnis } from '../enemies/BossIgnis';
import { BossFrost } from '../enemies/BossFrost';
import { ProjectilePool } from '../combat/ProjectilePool';
import { InteractiveProps } from './InteractiveProps';
import { WeaponData } from '../types/weapon';
import { WEAPONS } from '../data/weapons';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

export interface RectCollider {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PickupItem {
  type: 'weapon' | 'heart' | 'energy' | 'chest' | 'altar' | 'coin' | 'shop_item' | 'statue' | 'portal' | 'vending' | 'forge';
  sprite: Phaser.GameObjects.Sprite;
  data?: any;
  price?: number;
  label?: string;
  isMagnetized?: boolean;
  magnetSpeed?: number;
}

interface HazardTile {
  x: number;
  y: number;
  kind: 'ice' | 'lava';
  sprite: Phaser.GameObjects.Sprite;
}

interface DoorVisualGroup {
  door: DoorData;
  sprites: Phaser.GameObjects.Sprite[];
  colliders: RectCollider[];
}

interface SpikeTrap {
  x: number;
  y: number;
  roomIndex: number;
  sprite: Phaser.GameObjects.Sprite;
}

export class RoomManager {
  private scene: Phaser.Scene;
  public rooms: RoomState[];
  public corridors: CorridorData[];
  public currentRoomIndex: number = 0;
  public interactiveProps: InteractiveProps;

  // Persistent floor objects (RenderTextures + animated props)
  private worldObjects: Phaser.GameObjects.GameObject[] = [];
  private fogOverlays: Map<number, Phaser.GameObjects.Rectangle> = new Map();
  private roomDoorsMap: Map<number, DoorVisualGroup[]> = new Map();
  private spawnedEnemyRooms: Set<number> = new Set();

  // Torch animation
  private torchSprites: Phaser.GameObjects.Sprite[] = [];
  private torchTimer: number = 0;
  private torchFrame: boolean = false;

  // Floor spike traps & biome hazards
  private spikeTraps: SpikeTrap[] = [];
  private hazardTiles: HazardTile[] = [];
  private trapCycleTimer: number = 0;
  public areTrapsActive: boolean = false;
  public floorMeta: FloorMeta;

  // Colliders
  public staticWallColliders: RectCollider[] = [];
  public wallColliders: RectCollider[] = [];
  public doorColliders: RectCollider[] = [];

  // Active enemies & wave reinforcement state
  public activeEnemies: EnemyBase[] = [];
  private waveQueue: EnemySpawnDef[][] = [];
  private pendingWaveSpawns: EnemySpawnDef[] | null = null;
  private pendingWaveRoom: RoomState | null = null;
  private pendingWaveTimer: number = 0;
  private waveMarkers: Phaser.GameObjects.Sprite[] = [];

  // Pickups & interactive world objects across the floor
  public pickups: PickupItem[] = [];
  private merchantSprites: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene, rooms: RoomState[], corridors: CorridorData[] = [], floorNumber: number = 1) {
    this.scene = scene;
    this.rooms = rooms;
    this.corridors = corridors;
    this.floorMeta = getFloorMeta(floorNumber);
    this.interactiveProps = new InteractiveProps(scene);
  }

  public getCurrentRoom(): RoomState {
    return this.rooms[this.currentRoomIndex];
  }

  public getAllSolidColliders(): RectCollider[] {
    const propColliders = this.interactiveProps ? this.interactiveProps.getObstacleColliders() : [];
    return [...this.staticWallColliders, ...propColliders];
  }

  /**
   * Builds the entire seamless dungeon floor (all rooms, corridors, torches, traps, crates, fog of war).
   */
  public buildEntireFloor(): void {
    this.clearCurrentRoomVisuals();
    const ts = 32;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // 1. Render every room onto its own cached RenderTexture + add props/torches/doors
    for (const room of this.rooms) {
      minX = Math.min(minX, room.worldX);
      minY = Math.min(minY, room.worldY);
      maxX = Math.max(maxX, room.worldX + room.width);
      maxY = Math.max(maxY, room.worldY + room.height);

      const rt = this.scene.add.renderTexture(room.worldX, room.worldY, room.width, room.height)
        .setOrigin(0, 0)
        .setDepth(1);
      this.worldObjects.push(rt);

      const cols = room.layout.width;
      const rows = room.layout.height;
      const midCol = Math.floor(cols / 2);
      const midRow = Math.floor(rows / 2);

      // Draw varied biome floor tiles
      const isDefaultBiome = this.floorMeta.biomeId === 'stone_crypt';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let tileKey = this.floorMeta.floorTex;
          const hash = ((c * 73856093) ^ (r * 19349663) ^ (room.index * 83492791)) >>> 0;

          if (room.layout.floorPattern === 'mosaic' && Math.abs(c - midCol) <= 1 && Math.abs(r - midRow) <= 1) {
            tileKey = 'floor_mosaic';
          } else if (room.layout.floorPattern === 'carpet' && Math.abs(r - midRow) <= 1 && c >= 2 && c <= cols - 3) {
            tileKey = 'floor_carpet';
          } else if (hash % 17 === 0) {
            tileKey = this.floorMeta.floorAltTex;
          } else if (isDefaultBiome && hash % 23 === 0) {
            tileKey = 'floor_tile_3';
          } else if (isDefaultBiome && room.layout.floorPattern === 'rune' && hash % 11 === 0) {
            tileKey = 'floor_tile_4';
          }

          rt.drawFrame(tileKey, undefined, c * ts, r * ts);
        }
      }

      // Draw perimeter walls leaving 3-tile doorway openings
      const hasNorth = room.doors.some(d => d.direction === 'north');
      const hasSouth = room.doors.some(d => d.direction === 'south');
      const hasEast = room.doors.some(d => d.direction === 'east');
      const hasWest = room.doors.some(d => d.direction === 'west');

      const isNorthDoorCol = (c: number) => hasNorth && Math.abs(c - midCol) <= 1;
      const isSouthDoorCol = (c: number) => hasSouth && Math.abs(c - midCol) <= 1;
      const isWestDoorRow = (r: number) => hasWest && Math.abs(r - midRow) <= 1;
      const isEastDoorRow = (r: number) => hasEast && Math.abs(r - midRow) <= 1;

      for (let c = 0; c < cols; c++) {
        if (!isNorthDoorCol(c)) {
          rt.drawFrame(this.floorMeta.wallTex, undefined, c * ts, 0);
          this.staticWallColliders.push({ x: room.worldX + c * ts, y: room.worldY, width: ts, height: ts });
        }
        if (!isSouthDoorCol(c)) {
          rt.drawFrame(this.floorMeta.wallTex, undefined, c * ts, (rows - 1) * ts);
          this.staticWallColliders.push({ x: room.worldX + c * ts, y: room.worldY + (rows - 1) * ts, width: ts, height: ts });
        }
      }
      for (let r = 1; r < rows - 1; r++) {
        if (!isWestDoorRow(r)) {
          rt.drawFrame(this.floorMeta.wallTex, undefined, 0, r * ts);
          this.staticWallColliders.push({ x: room.worldX, y: room.worldY + r * ts, width: ts, height: ts });
        }
        if (!isEastDoorRow(r)) {
          rt.drawFrame(this.floorMeta.wallTex, undefined, (cols - 1) * ts, r * ts);
          this.staticWallColliders.push({ x: room.worldX + (cols - 1) * ts, y: room.worldY + r * ts, width: ts, height: ts });
        }
      }

      // Draw internal biome stone/crystal/obsidian pillars
      for (const w of room.layout.walls) {
        rt.drawFrame(this.floorMeta.pillarTex, undefined, w.x * ts, w.y * ts);
        this.staticWallColliders.push({
          x: room.worldX + w.x * ts,
          y: room.worldY + w.y * ts,
          width: ts,
          height: ts
        });
      }

      // Add biome floor hazards (icy patches / molten lava pools)
      for (const hz of room.layout.hazards || []) {
        const hx = room.worldX + hz.x * ts + ts / 2;
        const hy = room.worldY + hz.y * ts + ts / 2;
        const hzSpr = this.scene.add
          .sprite(hx, hy, hz.kind === 'ice' ? 'ice_patch' : 'lava_pool')
          .setDepth(2)
          .setAlpha(hz.kind === 'ice' ? 0.85 : 0.92);
        this.worldObjects.push(hzSpr);
        this.hazardTiles.push({ x: hx, y: hy, kind: hz.kind, sprite: hzSpr });
      }

      // Add glowing wall torches
      const torches = room.layout.torches || [];
      for (const t of torches) {
        const tx = room.worldX + t.x * ts + ts / 2;
        const ty = room.worldY + t.y * ts + ts / 2 + 6;
        const glow = this.scene.add.sprite(tx, ty, 'torch_glow').setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
        const torchSpr = this.scene.add.sprite(tx, ty, 'torch_1').setDepth(4);
        this.worldObjects.push(glow, torchSpr);
        this.torchSprites.push(torchSpr);
      }

      // Add floor spike traps
      const traps = room.layout.traps || [];
      for (const tr of traps) {
        const tx = room.worldX + tr.x * ts + ts / 2;
        const ty = room.worldY + tr.y * ts + ts / 2;
        const trapSpr = this.scene.add.sprite(tx, ty, 'trap_down').setDepth(2);
        this.worldObjects.push(trapSpr);
        this.spikeTraps.push({ x: tx, y: ty, roomIndex: room.index, sprite: trapSpr });
      }

      // Add breakable crates
      const crates = room.layout.crates || [];
      for (const cr of crates) {
        const cx = room.worldX + cr.x * ts + ts / 2;
        const cy = room.worldY + cr.y * ts + ts / 2;
        this.interactiveProps.spawnProp('crate', cx, cy);
      }

      // Add explosive & toxic barrels in combat rooms
      if (room.type === 'combat') {
        this.interactiveProps.spawnProp('explosive', room.worldX + ts * 2.5, room.worldY + ts * 2.5);
        this.interactiveProps.spawnProp('toxic', room.worldX + room.width - ts * 2.5, room.worldY + ts * 2.5);
        this.interactiveProps.spawnProp('explosive', room.worldX + room.width - ts * 2.5, room.worldY + room.height - ts * 2.5);
      }

      // Create 3-tile door threshold visuals (starts open until player enters uncleared room)
      const doorGroups: DoorVisualGroup[] = [];
      for (const d of room.doors) {
        const sprites: Phaser.GameObjects.Sprite[] = [];
        const colliders: RectCollider[] = [];
        for (let offset = -1; offset <= 1; offset++) {
          const sx = d.direction === 'north' || d.direction === 'south' ? d.x + offset * ts : d.x;
          const sy = d.direction === 'east' || d.direction === 'west' ? d.y + offset * ts : d.y;
          const spr = this.scene.add.sprite(sx, sy, 'door_open').setDepth(3);
          this.worldObjects.push(spr);
          sprites.push(spr);
          colliders.push({ x: sx - ts / 2, y: sy - ts / 2, width: ts, height: ts });
        }
        d.isOpen = true;
        doorGroups.push({ door: d, sprites, colliders });
      }
      this.roomDoorsMap.set(room.index, doorGroups);

      // Spawn static non-combat room contents immediately (Treasure / Rest)
      if (room.type === 'treasure' || room.type === 'rest') {
        this.spawnRoomRewards(room);
      }

      // Fog of War overlay on unvisited rooms (fades away when entered)
      if (room.index !== 0) {
        const fog = this.scene.add.rectangle(
          room.worldX,
          room.worldY,
          room.width,
          room.height,
          0x05070c,
          0.72
        ).setOrigin(0, 0).setDepth(24);
        this.worldObjects.push(fog);
        this.fogOverlays.set(room.index, fog);
      }
    }

    // 2. Render every connecting corridor onto cached RenderTextures
    for (const corr of this.corridors) {
      const rt = this.scene.add.renderTexture(corr.x, corr.y, corr.width, corr.height)
        .setOrigin(0, 0)
        .setDepth(1);
      this.worldObjects.push(rt);

      for (const ft of corr.floorTiles) {
        rt.drawFrame(this.floorMeta.floorTex, undefined, ft.x - corr.x, ft.y - corr.y);
      }
      for (const wr of corr.wallRects) {
        this.staticWallColliders.push(wr);
        for (let x = wr.x; x < wr.x + wr.width; x += ts) {
          for (let y = wr.y; y < wr.y + wr.height; y += ts) {
            rt.drawFrame(this.floorMeta.wallTex, undefined, x - corr.x, y - corr.y);
          }
        }
      }

      // Midpoint corridor torch on north/west wall
      const midTorchX = corr.x + corr.width / 2;
      const midTorchY = corr.orientation === 'horizontal' ? corr.y + 18 : corr.y + corr.height / 2;
      if (corr.orientation === 'horizontal') {
        const glow = this.scene.add.sprite(midTorchX, midTorchY, 'torch_glow').setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
        const torchSpr = this.scene.add.sprite(midTorchX, midTorchY, 'torch_1').setDepth(4);
        this.worldObjects.push(glow, torchSpr);
        this.torchSprites.push(torchSpr);
      }
    }

    this.wallColliders = this.staticWallColliders;

    // 3. Set camera bounds covering entire connected dungeon
    this.scene.cameras.main.setBounds(
      minX - 160,
      minY - 160,
      maxX - minX + 320,
      maxY - minY + 320
    );

    this.currentRoomIndex = 0;
    this.rooms[0].isVisited = true;
    this.rooms[0].isCurrent = true;
    events.emit('room:entered', { room: this.rooms[0] });
  }

  /**
   * Kept for backwards compatibility / Debug Boss Teleport
   */
  public buildRoom(roomIndex: number): void {
    if (this.worldObjects.length === 0) {
      this.buildEntireFloor();
    }
    this.enterRoom(roomIndex);
  }

  public enterRoom(roomIndex: number): void {
    const prevRoom = this.rooms[this.currentRoomIndex];
    if (prevRoom) prevRoom.isCurrent = false;

    this.currentRoomIndex = roomIndex;
    const room = this.rooms[roomIndex];
    room.isVisited = true;
    room.isCurrent = true;

    // Fade Fog of War cleanly
    const fog = this.fogOverlays.get(roomIndex);
    if (fog) {
      this.scene.tweens.add({
        targets: fog,
        alpha: 0,
        duration: 280,
        onComplete: () => {
          fog.destroy();
          this.fogOverlays.delete(roomIndex);
        }
      });
    }

    // Spawn enemies & lock room doors if uncleared combat/boss room
    if (!room.isCleared && !this.spawnedEnemyRooms.has(roomIndex)) {
      this.spawnedEnemyRooms.add(roomIndex);
      this.spawnRoomEnemies(room);
      if (room.type === 'boss') {
        audio.playBossAlert();
      }
    }

    events.emit('room:entered', { room });
  }

  private spawnRoomEnemies(room: RoomState): void {
    this.activeEnemies = [];
    this.waveQueue = room.waves ? room.waves.map(w => [...w]) : [];
    this.clearWaveMarkers();

    this.spawnEnemyList(room, room.enemySpawns);

    if (this.activeEnemies.length > 0) {
      this.lockRoomDoors(room.index);
    }
  }

  private resolveClearSpawnPos(rawX: number, rawY: number, room: RoomState): { x: number; y: number } {
    const blockers = [...this.staticWallColliders, ...this.interactiveProps.getObstacleColliders()];
    const minX = room.worldX + 46;
    const maxX = room.worldX + room.width - 46;
    const minY = room.worldY + 46;
    const maxY = room.worldY + room.height - 46;

    const isBlocked = (x: number, y: number): boolean => {
      if (x < minX || x > maxX || y < minY || y > maxY) return true;
      const r = 13;
      for (const b of blockers) {
        if (x + r > b.x && x - r < b.x + b.width && y + r > b.y && y - r < b.y + b.height) {
          return true;
        }
      }
      return false;
    };

    const startX = Phaser.Math.Clamp(rawX, minX, maxX);
    const startY = Phaser.Math.Clamp(rawY, minY, maxY);
    if (!isBlocked(startX, startY)) {
      return { x: startX, y: startY };
    }

    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707]
    ];
    for (let radius = 16; radius <= 128; radius += 16) {
      for (const [dx, dy] of dirs) {
        const tx = startX + dx * radius;
        const ty = startY + dy * radius;
        if (!isBlocked(tx, ty)) {
          return { x: tx, y: ty };
        }
      }
    }
    return { x: room.worldX + room.width / 2, y: room.worldY + room.height / 2 };
  }

  private spawnEnemyList(room: RoomState, spawns: EnemySpawnDef[]): void {
    for (const sp of spawns) {
      const rawX = room.worldX + sp.x * room.width;
      const rawY = room.worldY + sp.y * room.height;
      const { x: worldPosX, y: worldPosY } = this.resolveClearSpawnPos(rawX, rawY, room);

      let enemy: EnemyBase | null = null;
      if (sp.type === 'grunt') {
        enemy = new EnemyGrunt(this.scene, worldPosX, worldPosY);
      } else if (sp.type === 'shooter' || sp.type === 'frost_mage' || sp.type === 'frost_knight') {
        enemy = new EnemyShooter(this.scene, worldPosX, worldPosY, sp.type);
      } else if (sp.type === 'fan_caster') {
        enemy = new EnemyFanCaster(this.scene, worldPosX, worldPosY);
      } else if (sp.type === 'charger') {
        enemy = new EnemyCharger(this.scene, worldPosX, worldPosY);
      } else if (
        sp.type === 'boss_frost' ||
        (sp.type === 'boss_ignis' && this.floorMeta.biomeId === 'frost_cavern' && this.floorMeta.isBossFloor)
      ) {
        enemy = new BossFrost(this.scene, worldPosX, worldPosY, this.floorMeta.stage, this.floorMeta.bossTitleVi);
      } else if (sp.type === 'boss_ignis') {
        enemy = new BossIgnis(this.scene, worldPosX, worldPosY, this.floorMeta.stage, this.floorMeta.bossTitleVi);
      }

      if (enemy) {
        if (sp.isElite) {
          enemy.promoteToElite();
        }
        this.activeEnemies.push(enemy);
      }
    }
  }

  private beginWaveTelegraph(room: RoomState, waveSpawns: EnemySpawnDef[]): void {
    this.clearWaveMarkers();
    this.pendingWaveSpawns = waveSpawns;
    this.pendingWaveRoom = room;
    this.pendingWaveTimer = 0.75;

    for (const sp of waveSpawns) {
      const { x: wx, y: wy } = this.resolveClearSpawnPos(
        room.worldX + sp.x * room.width,
        room.worldY + sp.y * room.height,
        room
      );
      const marker = this.scene.add.sprite(wx, wy, 'spawn_marker_x').setDepth(4).setAlpha(0.9);
      this.scene.tweens.add({
        targets: marker,
        scaleX: 1.35,
        scaleY: 1.35,
        alpha: 0.45,
        duration: 240,
        yoyo: true,
        repeat: -1
      });
      this.waveMarkers.push(marker);
    }
  }

  private clearWaveMarkers(): void {
    for (const m of this.waveMarkers) m.destroy();
    this.waveMarkers = [];
    this.pendingWaveSpawns = null;
    this.pendingWaveRoom = null;
    this.pendingWaveTimer = 0;
  }

  public update(
    deltaSec: number,
    playerX: number,
    playerY: number,
    pool: ProjectilePool,
    onRoomEntered?: (roomIndex: number) => void
  ): void {
    // 1. Animate torches
    this.torchTimer += deltaSec;
    if (this.torchTimer >= 0.18) {
      this.torchTimer = 0;
      this.torchFrame = !this.torchFrame;
      const key = this.torchFrame ? 'torch_2' : 'torch_1';
      for (const ts of this.torchSprites) {
        ts.setTexture(key);
      }
    }

    // 2. Cycle floor spike traps (1.4s down -> 0.8s up)
    this.trapCycleTimer += deltaSec;
    const cyclePos = this.trapCycleTimer % 2.2;
    const nextTrapState = cyclePos >= 1.4;
    if (nextTrapState !== this.areTrapsActive) {
      this.areTrapsActive = nextTrapState;
      const tex = this.areTrapsActive ? 'trap_up' : 'trap_down';
      for (const tr of this.spikeTraps) {
        tr.sprite.setTexture(tex);
      }
    }

    // 3. Detect player seamlessly entering any room interior (54px clear of walls/doors so gates never trap player)
    for (const r of this.rooms) {
      if (
        playerX >= r.worldX + 54 &&
        playerX <= r.worldX + r.width - 54 &&
        playerY >= r.worldY + 54 &&
        playerY <= r.worldY + r.height - 54
      ) {
        if (r.index !== this.currentRoomIndex) {
          this.enterRoom(r.index);
          if (onRoomEntered) onRoomEntered(r.index);
        }
        break;
      }
    }

    const curRoom = this.getCurrentRoom();
    const allBlockers = [...this.staticWallColliders, ...this.doorColliders, ...this.interactiveProps.getObstacleColliders()];
    const roomBounds = {
      minX: curRoom.worldX + 40,
      maxX: curRoom.worldX + curRoom.width - 40,
      minY: curRoom.worldY + 40,
      maxY: curRoom.worldY + curRoom.height - 40
    };

    // 4. Update active enemies
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];
      if (enemy.isDead) {
        this.rollEnemyDrop(enemy.sprite.x, enemy.sprite.y, enemy.isElite);
        this.activeEnemies.splice(i, 1);
        continue;
      }
      enemy.update(deltaSec, playerX, playerY, pool, allBlockers, roomBounds);

      if ((enemy instanceof BossIgnis || enemy instanceof BossFrost) && this.activeEnemies.length < 5) {
        const summons = enemy.consumeSummonRequest();
        if (summons && summons.length > 0) {
          const normSpawns = summons.map(s => ({
            type: s.type,
            x: (s.x - curRoom.worldX) / curRoom.width,
            y: (s.y - curRoom.worldY) / curRoom.height
          }));
          this.spawnEnemyList(curRoom, normSpawns);
        }
      }
    }

    // 4b. Handle telegraphed multi-wave reinforcements
    if (this.pendingWaveSpawns && this.pendingWaveRoom) {
      this.pendingWaveTimer -= deltaSec;
      if (this.pendingWaveTimer <= 0) {
        const nextSpawns = this.pendingWaveSpawns;
        const targetRoom = this.pendingWaveRoom;
        this.clearWaveMarkers();
        this.spawnEnemyList(targetRoom, nextSpawns);
      }
      return;
    }

    // 5. Check room clear / next wave trigger
    if (!curRoom.isCleared && this.activeEnemies.length === 0 && this.spawnedEnemyRooms.has(curRoom.index)) {
      if (this.waveQueue.length > 0) {
        const nextWave = this.waveQueue.shift()!;
        this.beginWaveTelegraph(curRoom, nextWave);
      } else {
        curRoom.isCleared = true;
        audio.playRoomClear();
        this.unlockRoomDoors(curRoom.index);
        this.spawnRoomRewards(curRoom);
        events.emit('room:cleared', { room: curRoom });
      }
    }
  }

  public isPlayerOnActiveTrap(px: number, py: number): boolean {
    if (!this.areTrapsActive) return false;
    for (const tr of this.spikeTraps) {
      if (Math.abs(px - tr.x) < 14 && Math.abs(py - tr.y) < 14) {
        return true;
      }
    }
    return false;
  }

  public getHazardAt(px: number, py: number): 'ice' | 'lava' | null {
    for (const hz of this.hazardTiles) {
      if (Math.abs(px - hz.x) < 15 && Math.abs(py - hz.y) < 15) {
        return hz.kind;
      }
    }
    return null;
  }

  private rollEnemyDrop(x: number, y: number, isElite: boolean = false): void {
    const coinCount = isElite ? 4 : Math.random() < 0.4 ? 2 : 1;
    for (let c = 0; c < coinCount; c++) {
      this.spawnPickup('coin', x + (Math.random() - 0.5) * 22, y + (Math.random() - 0.5) * 22, 1);
    }

    const roll = Math.random();
    if (roll < (isElite ? 0.5 : 0.24)) {
      this.spawnPickup('energy', x, y, 25);
    } else if (roll < (isElite ? 0.85 : 0.35)) {
      this.spawnPickup('heart', x, y, 2);
    }
  }

  public spawnRestRoomMerchant(room: RoomState): void {
    if (room.rewardSpawned) return;
    room.rewardSpawned = true;

    const centerX = room.worldX + room.width / 2;
    const centerY = room.worldY + room.height / 2;

    const shadow = this.scene.add.sprite(centerX, centerY - 52, 'shadow').setDepth(4);
    const merchant = this.scene.add.sprite(centerX, centerY - 62, 'merchant_npc').setDepth(5).setScale(1.2);
    this.merchantSprites.push(shadow, merchant);

    this.spawnPickup(
      'shop_item',
      centerX - 80,
      centerY - 10,
      { subType: 'heal', amount: 4 },
      15,
      'Bình Huyết Thạch (+4 HP) [15 Vàng]'
    );

    this.spawnPickup(
      'shop_item',
      centerX,
      centerY - 10,
      { subType: 'energy', amount: 100 },
      10,
      'Bình Linh Lực (+100 NL) [10 Vàng]'
    );

    const shopWeapons = [WEAPONS.bow, WEAPONS.laser, WEAPONS.staff, WEAPONS.blade];
    const picked = shopWeapons[Math.floor(Math.random() * shopWeapons.length)];
    this.spawnPickup(
      'shop_item',
      centerX + 80,
      centerY - 10,
      { subType: 'weapon', weapon: picked },
      28,
      `${picked.nameVi} [28 Vàng]`
    );

    this.spawnPickup('altar', centerX, centerY + 65);
    this.spawnPickup('forge', centerX - 105, centerY + 65, { cost: 18 }, 18, 'Lò Rèn Cường Hóa (+25% ST Vũ Khí) [18 Vàng]');
    this.spawnPickup('vending', centerX + 105, centerY + 65, { cost: 12 }, 12, 'Máy Bán Nước Buff Vĩnh Viễn [12 Vàng]');
  }

  public spawnRoomRewards(room: RoomState): void {
    if (room.rewardSpawned) return;
    room.rewardSpawned = true;

    const centerX = room.worldX + room.width / 2;
    const centerY = room.worldY + room.height / 2;

    if (room.type === 'treasure') {
      this.spawnPickup('chest', centerX - 35, centerY);
      this.spawnPickup('statue', centerX + 45, centerY, { cost: 12 }, 12, 'Tượng Thần Cổ Xưa [12 Vàng]');
      this.spawnPickup('vending', centerX, centerY - 56, { cost: 12 }, 12, 'Máy Bán Nước Buff Vĩnh Viễn [12 Vàng]');
      this.spawnPickup('coin', centerX - 35, centerY + 35, 3);
      this.spawnPickup('heart', centerX - 80, centerY, 3);
      this.spawnPickup('energy', centerX + 90, centerY, 60);
    } else if (room.type === 'rest') {
      this.spawnRestRoomMerchant(room);
    } else if (room.type === 'boss') {
      this.spawnPickup('portal', centerX, centerY);
    } else if (room.index === 2 || room.index === 5) {
      this.spawnPickup('altar', centerX, centerY);
    } else if (room.type === 'combat') {
      this.spawnPickup('energy', centerX - 30, centerY, 40);
      this.spawnPickup('heart', centerX + 30, centerY, 2);
      this.spawnPickup('coin', centerX, centerY, 2);
    }
  }

  public spawnPickup(
    type: PickupItem['type'],
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
    else if (type === 'statue') texture = 'statue_alchemist';
    else if (type === 'vending') texture = 'vending_machine';
    else if (type === 'forge') texture = 'anvil_merge';
    else if (type === 'portal') texture = 'portal_1';
    else if (type === 'weapon') texture = (data as WeaponData)?.iconTexture || 'icon_shotgun';
    else if (type === 'shop_item') {
      if (data?.subType === 'heal') texture = 'potion_health_large';
      else if (data?.subType === 'energy') texture = 'potion_energy_large';
      else if (data?.subType === 'weapon') texture = (data?.weapon as WeaponData)?.iconTexture || 'icon_blade';
    }

    const spr = this.scene.add.sprite(x, y, texture).setDepth(6);

    if (type === 'portal') {
      this.scene.tweens.add({
        targets: spr,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else if (type !== 'chest' && type !== 'altar' && type !== 'statue' && type !== 'vending' && type !== 'forge') {
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

  public lockRoomDoors(roomIndex: number): void {
    this.doorColliders = [];
    const groups = this.roomDoorsMap.get(roomIndex) || [];
    for (const g of groups) {
      g.door.isOpen = false;
      for (const s of g.sprites) s.setTexture('door_closed');
      this.doorColliders.push(...g.colliders);
    }
    events.emit('room:doors-locked');
  }

  public unlockRoomDoors(roomIndex: number): void {
    this.doorColliders = [];
    const groups = this.roomDoorsMap.get(roomIndex) || [];
    for (const g of groups) {
      g.door.isOpen = true;
      for (const s of g.sprites) s.setTexture('door_open');
    }
    events.emit('room:doors-unlocked');
  }

  public clearCurrentRoomVisuals(): void {
    for (const obj of this.worldObjects) obj.destroy();
    this.worldObjects = [];
    this.fogOverlays.clear();
    this.roomDoorsMap.clear();
    this.spawnedEnemyRooms.clear();
    this.torchSprites = [];
    this.spikeTraps = [];
    this.hazardTiles = [];
    this.waveQueue = [];
    this.clearWaveMarkers();
    this.staticWallColliders = [];
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
