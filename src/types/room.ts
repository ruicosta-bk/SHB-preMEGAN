export type RoomType = 'start' | 'combat' | 'treasure' | 'rest' | 'boss';

export type Direction = 'north' | 'south' | 'east' | 'west';

export interface DoorData {
  direction: Direction;
  targetRoomIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
}

export interface RoomLayout {
  width: number;  // in tiles (odd numbers for symmetric 3-tile corridors)
  height: number; // in tiles
  walls: { x: number; y: number }[]; // internal pillar/wall obstacles
  traps?: { x: number; y: number }[]; // spike trap tile coords
  crates?: { x: number; y: number }[]; // breakable crate tile coords
  torches?: { x: number; y: number }[]; // torch tile coords on north/perimeter walls
  floorPattern?: 'standard' | 'mosaic' | 'carpet' | 'rune';
  doors: Direction[];
}

export interface CorridorData {
  fromRoomIndex: number;
  toRoomIndex: number;
  orientation: 'horizontal' | 'vertical';
  x: number;
  y: number;
  width: number;
  height: number;
  floorTiles: { x: number; y: number }[];
  wallRects: { x: number; y: number; width: number; height: number }[];
}

export interface RoomState {
  index: number;
  type: RoomType;
  titleVi: string;
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
  width: number;  // pixels
  height: number; // pixels
  isCleared: boolean;
  isVisited: boolean;
  isCurrent: boolean;
  doors: DoorData[];
  layout: RoomLayout;
  enemySpawns: { type: string; x: number; y: number; delay?: number; isElite?: boolean }[];
  rewardSpawned: boolean;
}
