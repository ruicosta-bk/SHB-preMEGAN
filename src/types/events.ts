import { WeaponData } from './weapon';
import { UpgradeData } from './upgrade';
import { RoomState } from './room';

export interface GameEvents {
  // Player state
  'player:stats-changed': { hp: number; maxHp: number; armor: number; maxArmor: number; energy: number; maxEnergy: number };
  'player:dash-cooldown': { progress: number; isReady: boolean };
  'player:skill-cooldown': { progress: number; isReady: boolean };
  'player:weapon-swapped': { current: WeaponData; secondary: WeaponData | null; activeIndex: number };
  'player:damaged': { amount: number; armorAbsorbed: number; hpLoss: number; currentHp: number };
  'player:healed': { hpGain: number; armorGain: number };
  'player:energy-consumed': { currentEnergy: number };
  'player:coins-changed': { coins: number };
  'player:died': void;

  // Combat
  'combat:enemy-hit': { enemyId: string; damage: number; isCrit: boolean; x: number; y: number; element?: string };
  'combat:enemy-died': { enemyId: string; x: number; y: number; type: string };
  'combat:bullet-destroyed': { x: number; y: number };
  'combat:boss-stats': { currentHp: number; maxHp: number; phase: number; nameVi: string; isDead: boolean };
  'combat:explosion': { x: number; y: number; radius: number; damage: number };
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
  'game:pause-toggled': { isPaused: boolean };
  'game:victory': { timeElapsed: number; enemiesKilled: number; damageDealt: number };
  'game:over': { timeElapsed: number; enemiesKilled: number; roomsCleared: number };
  'game:restart': void;
}
