export type RoomType = 'start' | 'combat' | 'treasure' | 'rest' | 'boss';

export type Direction = 'north' | 'south' | 'east' | 'west';

export interface DoorData {
  direction: Direction;
  targetRoomIndex: number;
  x: number;
  y: number;
  isOpen: boolean;
}

export interface RoomLayout {
  width: number;  // in tiles
  height: number; // in tiles
  walls: { x: number; y: number }[]; // internal obstacles
  doors: Direction[];
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
  enemySpawns: { type: string; x: number; y: number; delay?: number }[];
  rewardSpawned: boolean;
}
