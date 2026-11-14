import { RoomState, RoomType, Direction, DoorData, RoomLayout, CorridorData } from '../types/room';

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
  public static readonly CELL_PITCH_TILES = 29; // Odd tile pitch guarantees exact corridor alignment
  public static readonly CELL_PITCH_PX = 29 * 32; // 928 px

  /**
   * Generates 8 connected rooms deterministically from a numeric seed with random branching topology,
   * varied room dimensions, traps, breakable crates, wall torches, and guaranteed path to Boss.
   */
  public static generateFloor(seed: number = 1337): RoomState[] {
    const rng = new SeededRandom(seed);

    const roomSequence: { type: RoomType; titleVi: string }[] = [
      { type: 'start', titleVi: 'Sảnh Xuất Phát' },
      { type: 'combat', titleVi: 'Mật Thất Đá Ngầm I' },
      { type: 'combat', titleVi: 'Hành Lang Cổ Ngữ II' },
      { type: 'treasure', titleVi: 'Kho Báu & Tượng Thần' },
      { type: 'combat', titleVi: 'Lò Luyện Quái Vật III' },
      { type: 'combat', titleVi: 'Ngục Tối Dung Nham IV' },
      { type: 'rest', titleVi: 'Trạm Thương Gia Giả Kim' },
      { type: 'boss', titleVi: 'Đại Điện Ignis Ignifer' }
    ];

    // Build deterministic random grid topology
    const occupied = new Map<string, number>(); // "gx,gy" -> roomIndex
    const coords: { gx: number; gy: number }[] = new Array(8);
    const edges: [number, number][] = [];

    const keyOf = (gx: number, gy: number) => `${gx},${gy}`;
    const dirs: { dx: number; dy: number }[] = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 }
    ];

    const getFreeNeighbors = (gx: number, gy: number) =>
      dirs.map(d => ({ gx: gx + d.dx, gy: gy + d.dy })).filter(p => !occupied.has(keyOf(p.gx, p.gy)));

    // Room 0: Start at (0,0)
    coords[0] = { gx: 0, gy: 0 };
    occupied.set(keyOf(0, 0), 0);

    // Main spine order: 0 -> 1 -> 2 -> 4 -> 5 -> 6 -> 7, with Room 3 (Treasure) branching off 1 or 2
    const spineOrder = [1, 2, 4, 5, 6, 7];
    let prevIdx = 0;

    for (const roomIdx of spineOrder) {
      let placed = false;
      // Try extending from prevIdx first; if boxed in, backtrack through placed spine rooms
      const candidates = [prevIdx, ...spineOrder.filter(idx => coords[idx] !== undefined).reverse(), 0];
      for (const anchorIdx of candidates) {
        const anchor = coords[anchorIdx];
        const free = getFreeNeighbors(anchor.gx, anchor.gy);
        if (free.length > 0) {
          const nextPos = rng.pick(free);
          coords[roomIdx] = nextPos;
          occupied.set(keyOf(nextPos.gx, nextPos.gy), roomIdx);
          edges.push([anchorIdx, roomIdx]);
          prevIdx = roomIdx;
          placed = true;
          break;
        }
      }
      if (!placed) {
        throw new Error('Failed to place dungeon spine room');
      }
    }

    // Branch Room 3 (Treasure) from Room 2 (or Room 1 / Room 4 if Room 2 has no free neighbor)
    const branchAnchors = [2, 1, 4, 0, 5];
    for (const anchorIdx of branchAnchors) {
      const anchor = coords[anchorIdx];
      const free = getFreeNeighbors(anchor.gx, anchor.gy);
      if (free.length > 0) {
        const treasurePos = rng.pick(free);
        coords[3] = treasurePos;
        occupied.set(keyOf(treasurePos.gx, treasurePos.gy), 3);
        edges.push([anchorIdx, 3]);
        break;
      }
    }

    // Create rooms with varied odd tile dimensions centered in each pitch cell
    const rooms: RoomState[] = [];
    for (let i = 0; i < roomSequence.length; i++) {
      const { type, titleVi } = roomSequence[i];
      const { gx, gy } = coords[i];
      const layout = this.createLayoutForRoom(type, i, rng);
      const width = layout.width * this.TILE_SIZE;
      const height = layout.height * this.TILE_SIZE;

      const cellCenterX = gx * this.CELL_PITCH_PX + this.CELL_PITCH_PX / 2;
      const cellCenterY = gy * this.CELL_PITCH_PX + this.CELL_PITCH_PX / 2;
      const worldX = cellCenterX - width / 2;
      const worldY = cellCenterY - height / 2;

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
        layout,
        enemySpawns,
        rewardSpawned: false
      });
    }

    // Connect doors bidirectionally
    for (const [idxA, idxB] of edges) {
      const roomA = rooms[idxA];
      const roomB = rooms[idxB];
      const dx = roomB.gridX - roomA.gridX;
      const dy = roomB.gridY - roomA.gridY;

      let dirA: Direction = 'east';
      let dirB: Direction = 'west';
      if (dx === 1) { dirA = 'east'; dirB = 'west'; }
      else if (dx === -1) { dirA = 'west'; dirB = 'east'; }
      else if (dy === 1) { dirA = 'south'; dirB = 'north'; }
      else if (dy === -1) { dirA = 'north'; dirB = 'south'; }

      const doorA = this.calculateDoorPos(roomA, dirA, idxB);
      const doorB = this.calculateDoorPos(roomB, dirB, idxA);
      roomA.doors.push(doorA);
      roomB.doors.push(doorB);
      roomA.layout.doors.push(dirA);
      roomB.layout.doors.push(dirB);
    }

    return rooms;
  }

  /**
   * Generates seamless 3-tile-wide stone corridors connecting every adjacent linked room pair.
   */
  public static generateCorridors(rooms: RoomState[]): CorridorData[] {
    const corridors: CorridorData[] = [];
    const seenPairs = new Set<string>();

    for (const roomA of rooms) {
      for (const door of roomA.doors) {
        const a = roomA.index;
        const b = door.targetRoomIndex;
        const pairKey = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        const roomB = rooms[b];
        const ts = this.TILE_SIZE;

        if (roomA.gridY === roomB.gridY) {
          // Horizontal corridor between leftRoom and rightRoom
          const leftRoom = roomA.gridX < roomB.gridX ? roomA : roomB;
          const rightRoom = roomA.gridX < roomB.gridX ? roomB : roomA;
          const startX = leftRoom.worldX + leftRoom.width;
          const endX = rightRoom.worldX;
          const centerY = leftRoom.worldY + Math.floor(leftRoom.layout.height / 2) * ts;
          const corrY = centerY - ts * 2; // includes top wall, 3 floor tiles, bottom wall
          const corrW = endX - startX;
          const corrH = ts * 5;

          const floorTiles: { x: number; y: number }[] = [];
          for (let x = startX; x < endX; x += ts) {
            floorTiles.push({ x, y: centerY - ts });
            floorTiles.push({ x, y: centerY });
            floorTiles.push({ x, y: centerY + ts });
          }

          corridors.push({
            fromRoomIndex: leftRoom.index,
            toRoomIndex: rightRoom.index,
            orientation: 'horizontal',
            x: startX,
            y: corrY,
            width: corrW,
            height: corrH,
            floorTiles,
            wallRects: [
              { x: startX, y: centerY - ts * 2, width: corrW, height: ts },
              { x: startX, y: centerY + ts * 2, width: corrW, height: ts }
            ]
          });
        } else {
          // Vertical corridor between topRoom and bottomRoom
          const topRoom = roomA.gridY < roomB.gridY ? roomA : roomB;
          const bottomRoom = roomA.gridY < roomB.gridY ? roomB : roomA;
          const startY = topRoom.worldY + topRoom.height;
          const endY = bottomRoom.worldY;
          const centerX = topRoom.worldX + Math.floor(topRoom.layout.width / 2) * ts;
          const corrX = centerX - ts * 2;
          const corrW = ts * 5;
          const corrH = endY - startY;

          const floorTiles: { x: number; y: number }[] = [];
          for (let y = startY; y < endY; y += ts) {
            floorTiles.push({ x: centerX - ts, y });
            floorTiles.push({ x: centerX, y });
            floorTiles.push({ x: centerX + ts, y });
          }

          corridors.push({
            fromRoomIndex: topRoom.index,
            toRoomIndex: bottomRoom.index,
            orientation: 'vertical',
            x: corrX,
            y: startY,
            width: corrW,
            height: corrH,
            floorTiles,
            wallRects: [
              { x: centerX - ts * 2, y: startY, width: ts, height: corrH },
              { x: centerX + ts * 2, y: startY, width: ts, height: corrH }
            ]
          });
        }
      }
    }

    return corridors;
  }

  private static calculateDoorPos(room: RoomState, dir: Direction, targetIdx: number): DoorData {
    const ts = this.TILE_SIZE;
    const midCol = Math.floor(room.layout.width / 2);
    const midRow = Math.floor(room.layout.height / 2);
    let x = room.worldX + midCol * ts + ts / 2;
    let y = room.worldY + midRow * ts + ts / 2;
    let width = ts;
    let height = ts;

    if (dir === 'north') {
      y = room.worldY + ts / 2;
      width = ts * 3;
    } else if (dir === 'south') {
      y = room.worldY + (room.layout.height - 1) * ts + ts / 2;
      width = ts * 3;
    } else if (dir === 'east') {
      x = room.worldX + (room.layout.width - 1) * ts + ts / 2;
      height = ts * 3;
    } else if (dir === 'west') {
      x = room.worldX + ts / 2;
      height = ts * 3;
    }

    return {
      direction: dir,
      targetRoomIndex: targetIdx,
      x,
      y,
      width,
      height,
      isOpen: room.isCleared
    };
  }

  private static createLayoutForRoom(type: RoomType, idx: number, rng: SeededRandom): RoomLayout {
    if (type === 'start') {
      return {
        width: 17,
        height: 15,
        walls: [],
        traps: [],
        crates: [
          { x: 2, y: 2 }, { x: 3, y: 2 },
          { x: 14, y: 2 }, { x: 14, y: 12 }
        ],
        torches: [{ x: 4, y: 0 }, { x: 12, y: 0 }],
        floorPattern: 'mosaic',
        doors: []
      };
    }

    if (type === 'treasure') {
      return {
        width: 15,
        height: 13,
        walls: [
          { x: 3, y: 3 }, { x: 11, y: 3 },
          { x: 3, y: 9 }, { x: 11, y: 9 }
        ],
        traps: [],
        crates: [{ x: 2, y: 2 }, { x: 12, y: 2 }, { x: 2, y: 10 }, { x: 12, y: 10 }],
        torches: [{ x: 4, y: 0 }, { x: 10, y: 0 }],
        floorPattern: 'rune',
        doors: []
      };
    }

    if (type === 'rest') {
      return {
        width: 17,
        height: 15,
        walls: [],
        traps: [],
        crates: [{ x: 2, y: 12 }, { x: 14, y: 12 }],
        torches: [{ x: 4, y: 0 }, { x: 12, y: 0 }],
        floorPattern: 'rune',
        doors: []
      };
    }

    if (type === 'boss') {
      return {
        width: 23,
        height: 19,
        walls: [
          { x: 4, y: 4 }, { x: 18, y: 4 },
          { x: 4, y: 14 }, { x: 18, y: 14 }
        ],
        traps: [],
        crates: [],
        torches: [{ x: 5, y: 0 }, { x: 17, y: 0 }],
        floorPattern: 'carpet',
        doors: []
      };
    }

    // Combat rooms: pick varied odd dimensions & obstacle patterns via seed
    const sizeChoices = [
      { w: 19, h: 15 },
      { w: 21, h: 17 },
      { w: 23, h: 15 },
      { w: 17, h: 17 }
    ];
    const dims = sizeChoices[(idx + rng.rangeInt(0, 3)) % sizeChoices.length];
    const patternRoll = rng.rangeInt(0, 3);
    const walls: { x: number; y: number }[] = [];
    const traps: { x: number; y: number }[] = [];
    const crates: { x: number; y: number }[] = [];

    const mx = Math.floor(dims.w / 2);
    const my = Math.floor(dims.h / 2);

    if (patternRoll === 0) {
      // 4 symmetrical 2x2 pillar clusters + center spike traps
      for (const px of [4, dims.w - 6]) {
        for (const py of [3, dims.h - 5]) {
          walls.push({ x: px, y: py }, { x: px + 1, y: py });
        }
      }
      traps.push({ x: mx - 2, y: my }, { x: mx + 2, y: my });
      crates.push({ x: 2, y: 2 }, { x: dims.w - 3, y: dims.h - 3 });
    } else if (patternRoll === 1) {
      // Bunker walls flanking center + corner crates
      walls.push(
        { x: mx - 4, y: my - 2 }, { x: mx - 4, y: my + 2 },
        { x: mx + 4, y: my - 2 }, { x: mx + 4, y: my + 2 }
      );
      traps.push({ x: mx, y: my - 3 }, { x: mx, y: my + 3 });
      crates.push({ x: 3, y: 3 }, { x: dims.w - 4, y: 3 }, { x: 3, y: dims.h - 4 });
    } else if (patternRoll === 2) {
      // Cross barricades + corner traps
      walls.push(
        { x: mx - 3, y: my }, { x: mx + 3, y: my },
        { x: mx, y: my - 2 }, { x: mx, y: my + 2 }
      );
      traps.push({ x: 4, y: 4 }, { x: dims.w - 5, y: dims.h - 5 });
      crates.push({ x: mx - 5, y: 2 }, { x: mx + 5, y: dims.h - 3 });
    } else {
      // Open arena with scattered crates & corner pillars
      walls.push(
        { x: 5, y: 4 }, { x: dims.w - 6, y: 4 },
        { x: 5, y: dims.h - 5 }, { x: dims.w - 6, y: dims.h - 5 }
      );
      crates.push(
        { x: mx - 2, y: my - 1 }, { x: mx + 2, y: my + 1 },
        { x: 2, y: my }, { x: dims.w - 3, y: my }
      );
    }

    return {
      width: dims.w,
      height: dims.h,
      walls,
      traps,
      crates,
      torches: [{ x: 4, y: 0 }, { x: dims.w - 5, y: 0 }],
      floorPattern: 'standard',
      doors: []
    };
  }

  private static generateEnemySpawns(
    type: RoomType,
    roomIndex: number,
    rng: SeededRandom
  ): { type: string; x: number; y: number; isElite?: boolean }[] {
    if (type === 'start' || type === 'treasure' || type === 'rest') {
      return [];
    }

    if (type === 'boss') {
      return [{ type: 'boss_ignis', x: 0.65, y: 0.5 }];
    }

    const safeSpots = [
      { x: 0.28, y: 0.28 },
      { x: 0.72, y: 0.28 },
      { x: 0.28, y: 0.72 },
      { x: 0.72, y: 0.72 },
      { x: 0.5, y: 0.24 },
      { x: 0.5, y: 0.76 },
      { x: 0.24, y: 0.5 },
      { x: 0.76, y: 0.5 }
    ];

    const pool = ['grunt', 'shooter'];
    if (roomIndex >= 2) pool.push('fan_caster', 'frost_mage');
    if (roomIndex >= 4) pool.push('charger');

    const count = roomIndex <= 2 ? 4 : 5;
    const spawns: { type: string; x: number; y: number; isElite?: boolean }[] = [];

    const shuffled = [...safeSpots];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (let i = 0; i < count; i++) {
      const spot = shuffled[i];
      const eType = rng.pick(pool);
      // 25% chance for Elite enemy from room 2 onwards (cap 1-2 per room)
      const isElite = roomIndex >= 2 && i === 0 && rng.next() < 0.65;
      spawns.push({ type: eType, x: spot.x, y: spot.y, isElite });
    }

    return spawns;
  }
}
