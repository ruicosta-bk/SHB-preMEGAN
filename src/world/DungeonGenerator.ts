import { RoomState, RoomType, Direction, DoorData, RoomLayout } from '../types/room';

// Deterministic Mulberry32 PRNG
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  public next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

export class DungeonGenerator {
  public static readonly TILE_SIZE = 32;
  public static readonly ROOM_WIDTH_TILES = 26;  // 26 * 32 = 832 px
  public static readonly ROOM_HEIGHT_TILES = 18; // 18 * 32 = 576 px
  public static readonly ROOM_SPACING_PX = 1200; // room spacing in world coordinates

  /**
   * Generates all 8 rooms deterministically from a numeric seed.
   * Guaranteed to form an interconnected graph with a valid path from Start (0) to Boss (7).
   */
  public static generateFloor(seed: number = 1337): RoomState[] {
    const rng = new SeededRandom(seed);

    // 8 room types in fixed progression order:
    // 0: Start, 1: Combat 1, 2: Combat 2, 3: Treasure, 4: Combat 3, 5: Combat 4, 6: Rest, 7: Boss
    const roomSequence: { type: RoomType; titleVi: string }[] = [
      { type: 'start', titleVi: 'Sảnh Xuất Phát' },
      { type: 'combat', titleVi: 'Mật Thất Quái Vật I' },
      { type: 'combat', titleVi: 'Mật Thất Quái Vật II' },
      { type: 'treasure', titleVi: 'Kho Báu Cổ Xưa' },
      { type: 'combat', titleVi: 'Đấu Trường Hỏa Ngục III' },
      { type: 'combat', titleVi: 'Đấu Trường Hỏa Ngục IV' },
      { type: 'rest', titleVi: 'Trạm Nghỉ Luyện Kim' },
      { type: 'boss', titleVi: 'Đại Điện Ignis Ignifer' }
    ];

    // Grid positions for 8 rooms guaranteeing accessibility
    // Layout topology:
    // (0,0) Start -> (1,0) C1 -> (2,0) C2
    //                            |
    //               (2,1) T <--- (2,0) -> (3,0) C3 -> (3,1) C4 -> (4,1) Rest -> (5,1) Boss
    const gridLayouts = [
      { gx: 0, gy: 0 }, // 0: Start
      { gx: 1, gy: 0 }, // 1: Combat 1
      { gx: 2, gy: 0 }, // 2: Combat 2
      { gx: 2, gy: 1 }, // 3: Treasure (branch south from Combat 2)
      { gx: 3, gy: 0 }, // 4: Combat 3 (east from Combat 2)
      { gx: 3, gy: 1 }, // 5: Combat 4 (south from Combat 3)
      { gx: 4, gy: 1 }, // 6: Rest (east from Combat 4)
      { gx: 5, gy: 1 }  // 7: Boss (east from Rest)
    ];

    // Connected edges: [fromIndex, toIndex, dirFromTo, dirToFrom]
    const connections: [number, number, Direction, Direction][] = [
      [0, 1, 'east', 'west'],
      [1, 2, 'east', 'west'],
      [2, 3, 'south', 'north'], // branch to treasure
      [2, 4, 'east', 'west'],
      [4, 5, 'south', 'north'],
      [5, 6, 'east', 'west'],
      [6, 7, 'east', 'west']
    ];

    const rooms: RoomState[] = [];

    // Pre-crafted room obstacle layouts
    const layouts = [
      this.createPillarLayout(),
      this.createArenaLayout(),
      this.createCorridorCrossLayout(),
      this.createOpenLayout()
    ];

    for (let i = 0; i < roomSequence.length; i++) {
      const { type, titleVi } = roomSequence[i];
      const { gx, gy } = gridLayouts[i];
      const worldX = gx * this.ROOM_SPACING_PX;
      const worldY = gy * this.ROOM_SPACING_PX;
      const width = this.ROOM_WIDTH_TILES * this.TILE_SIZE;
      const height = this.ROOM_HEIGHT_TILES * this.TILE_SIZE;

      const chosenLayout = type === 'boss'
        ? this.createBossLayout()
        : type === 'start' || type === 'treasure' || type === 'rest'
          ? this.createOpenLayout()
          : layouts[i % layouts.length];

      const enemySpawns = this.generateEnemySpawns(type, i, rng);

      rooms.push({
        index: i,
        type,
        titleVi,
        gridX: gx,
        gridY: gy,
        worldX,
        worldY,
        width,
        height,
        isCleared: type === 'start' || type === 'treasure' || type === 'rest',
        isVisited: i === 0,
        isCurrent: i === 0,
        doors: [],
        layout: chosenLayout,
        enemySpawns,
        rewardSpawned: false
      });
    }

    // Attach doors based on connections
    for (const [fromIdx, toIdx, fromDir, toDir] of connections) {
      const roomA = rooms[fromIdx];
      const roomB = rooms[toIdx];

      const doorA = this.calculateDoorPos(roomA, fromDir);
      doorA.targetRoomIndex = toIdx;
      roomA.doors.push(doorA);

      const doorB = this.calculateDoorPos(roomB, toDir);
      doorB.targetRoomIndex = fromIdx;
      roomB.doors.push(doorB);
    }

    return rooms;
  }

  private static calculateDoorPos(room: RoomState, dir: Direction): DoorData {
    const doorCol = Math.floor(this.ROOM_WIDTH_TILES / 2);
    const doorRow = Math.floor(this.ROOM_HEIGHT_TILES / 2);
    let x = room.worldX + doorCol * this.TILE_SIZE + this.TILE_SIZE / 2;
    let y = room.worldY + doorRow * this.TILE_SIZE + this.TILE_SIZE / 2;

    if (dir === 'north') {
      y = room.worldY + this.TILE_SIZE / 2;
    } else if (dir === 'south') {
      y = room.worldY + (this.ROOM_HEIGHT_TILES - 1) * this.TILE_SIZE + this.TILE_SIZE / 2;
    } else if (dir === 'east') {
      x = room.worldX + (this.ROOM_WIDTH_TILES - 1) * this.TILE_SIZE + this.TILE_SIZE / 2;
    } else if (dir === 'west') {
      x = room.worldX + this.TILE_SIZE / 2;
    }

    return {
      direction: dir,
      targetRoomIndex: -1,
      x,
      y,
      isOpen: room.isCleared
    };
  }

  private static generateEnemySpawns(type: RoomType, roomIdx: number, rng: SeededRandom) {
    if (type !== 'combat' && type !== 'boss') {
      return [];
    }

    if (type === 'boss') {
      return [{ type: 'boss_ignis', x: 0.5, y: 0.45 }];
    }

    const spawns: { type: string; x: number; y: number; delay?: number }[] = [];

    // Distinct enemy setups per combat room:
    if (roomIdx === 1) {
      // Room 1: 4 Grunts (melee introductory)
      spawns.push({ type: 'grunt', x: 0.25, y: 0.3 });
      spawns.push({ type: 'grunt', x: 0.75, y: 0.3 });
      spawns.push({ type: 'grunt', x: 0.25, y: 0.7 });
      spawns.push({ type: 'grunt', x: 0.75, y: 0.7 });
    } else if (roomIdx === 2) {
      // Room 2: 2 Grunts + 2 Shooters
      spawns.push({ type: 'grunt', x: 0.3, y: 0.5 });
      spawns.push({ type: 'grunt', x: 0.7, y: 0.5 });
      spawns.push({ type: 'shooter', x: 0.2, y: 0.25 });
      spawns.push({ type: 'shooter', x: 0.8, y: 0.25 });
    } else if (roomIdx === 4) {
      // Room 4: 2 Shooters + 2 Fan Casters
      spawns.push({ type: 'shooter', x: 0.2, y: 0.3 });
      spawns.push({ type: 'shooter', x: 0.8, y: 0.7 });
      spawns.push({ type: 'fan_caster', x: 0.5, y: 0.25 });
      spawns.push({ type: 'fan_caster', x: 0.5, y: 0.75 });
    } else if (roomIdx === 5) {
      // Room 5: 2 Chargers + 2 Shooters + 2 Grunts
      spawns.push({ type: 'charger', x: 0.25, y: 0.35 });
      spawns.push({ type: 'charger', x: 0.75, y: 0.65 });
      spawns.push({ type: 'shooter', x: 0.2, y: 0.8 });
      spawns.push({ type: 'shooter', x: 0.8, y: 0.2 });
      spawns.push({ type: 'grunt', x: 0.5, y: 0.3 });
      spawns.push({ type: 'grunt', x: 0.5, y: 0.7 });
    }

    return spawns;
  }

  // --- Pre-crafted Room Layouts ---

  private static createOpenLayout(): RoomLayout {
    return {
      width: this.ROOM_WIDTH_TILES,
      height: this.ROOM_HEIGHT_TILES,
      walls: [],
      doors: ['north', 'south', 'east', 'west']
    };
  }

  private static createPillarLayout(): RoomLayout {
    const walls: { x: number; y: number }[] = [];
    // 4 symmetric pillars
    const pillars = [
      { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 6, y: 6 }, { x: 7, y: 6 },
      { x: 18, y: 5 }, { x: 19, y: 5 }, { x: 18, y: 6 }, { x: 19, y: 6 },
      { x: 6, y: 11 }, { x: 7, y: 11 }, { x: 6, y: 12 }, { x: 7, y: 12 },
      { x: 18, y: 11 }, { x: 19, y: 11 }, { x: 18, y: 12 }, { x: 19, y: 12 }
    ];
    return {
      width: this.ROOM_WIDTH_TILES,
      height: this.ROOM_HEIGHT_TILES,
      walls: pillars,
      doors: ['north', 'south', 'east', 'west']
    };
  }

  private static createArenaLayout(): RoomLayout {
    const walls: { x: number; y: number }[] = [];
    // Central barrier split
    walls.push({ x: 12, y: 7 }, { x: 13, y: 7 }, { x: 12, y: 10 }, { x: 13, y: 10 });
    // Corner covers
    walls.push({ x: 5, y: 4 }, { x: 20, y: 4 }, { x: 5, y: 13 }, { x: 20, y: 13 });
    return {
      width: this.ROOM_WIDTH_TILES,
      height: this.ROOM_HEIGHT_TILES,
      walls,
      doors: ['north', 'south', 'east', 'west']
    };
  }

  private static createCorridorCrossLayout(): RoomLayout {
    const walls: { x: number; y: number }[] = [];
    // L-shaped corner covers
    walls.push({ x: 6, y: 4 }, { x: 6, y: 5 }, { x: 7, y: 4 });
    walls.push({ x: 19, y: 4 }, { x: 19, y: 5 }, { x: 18, y: 4 });
    walls.push({ x: 6, y: 13 }, { x: 6, y: 12 }, { x: 7, y: 13 });
    walls.push({ x: 19, y: 13 }, { x: 19, y: 12 }, { x: 18, y: 13 });
    return {
      width: this.ROOM_WIDTH_TILES,
      height: this.ROOM_HEIGHT_TILES,
      walls,
      doors: ['north', 'south', 'east', 'west']
    };
  }

  private static createBossLayout(): RoomLayout {
    const walls: { x: number; y: number }[] = [];
    // 2 protective crystal pillars on sides
    walls.push(
      { x: 6, y: 8 }, { x: 6, y: 9 },
      { x: 19, y: 8 }, { x: 19, y: 9 }
    );
    return {
      width: this.ROOM_WIDTH_TILES,
      height: this.ROOM_HEIGHT_TILES,
      walls,
      doors: ['west']
    };
  }
}
