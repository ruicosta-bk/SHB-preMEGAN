import { WeaponCoreId, WeaponData } from './weapon';
import { UpgradeData } from './upgrade';
import { RoomState } from './room';
import { HeroId, SkillVariant } from '../data/heroes';
import { DifficultyMode } from '../data/difficulty';

export interface GameEvents {
  // Player state
  'player:hero-selected': { skillShortLabelVi: string; accentHex: string; accentColor: number; difficultyMode?: DifficultyMode };
  'player:stats-changed': { hp: number; maxHp: number; armor: number; maxArmor: number; energy: number; maxEnergy: number };
  'player:dash-cooldown': { progress: number; isReady: boolean };
  'player:skill-cooldown': { progress: number; isReady: boolean };
  'player:weapon-swapped': {
    current: WeaponData;
    secondary: WeaponData | null;
    activeIndex: number;
    currentCore?: WeaponCoreId | null;
    secondaryCore?: WeaponCoreId | null;
  };
  'player:damaged': { amount: number; armorAbsorbed: number; hpLoss: number; currentHp: number };
  'player:healed': { hpGain: number; armorGain: number };
  'player:energy-consumed': { currentEnergy: number };
  'player:coins-changed': { coins: number };
  'player:died': void;
  'player:turret-spawned': { x: number; y: number };
  'player:skill-status-vortex': { x: number; y: number; radius: number };

  // Combat
  'combat:enemy-hit': { enemyId: string; damage: number; isCrit: boolean; x: number; y: number; element?: string };
  'combat:enemy-died': { enemyId: string; x: number; y: number; type: string };
  'combat:bullet-destroyed': { x: number; y: number };
  'combat:boss-stats': { currentHp: number; maxHp: number; phase: number; nameVi: string; isDead: boolean };
  'combat:explosion': { x: number; y: number; radius: number; damage: number; element?: 'fire' | 'frost' | 'physical' | 'poison' };
  'combat:lightning-arc': { fromX: number; fromY: number; toX: number; toY: number };

  // Room & Exploration
  'room:entered': { room: RoomState };
  'room:cleared': { room: RoomState };
  'room:doors-locked': void;
  'room:doors-unlocked': void;

  // Pickups & Upgrades
  'pickup:weapon-nearby': { weapon: WeaponData | null };
  'upgrade:offer': { choices: UpgradeData[] };
  'upgrade:selected': { upgrade: UpgradeData };

  // Game cycle
  'game:pause-requested': void;
  'game:pause-toggled': { isPaused: boolean };
  'game:victory': RunResultEventPayload;
  'game:over': RunResultEventPayload;
  'game:restart': { heroId?: HeroId; skillVariant?: SkillVariant; difficultyMode?: DifficultyMode } | void;
  'game:return-lobby': void;
}

export interface RunResultEventPayload {
  isVictory: boolean;
  timeSeconds: number;
  enemiesDefeated: number;
  roomsCleared: number;
  totalRooms?: number;
  floorReached?: string;
  damageDealt: number;
  gemsEarned?: number;
  totalGems?: number;
}
