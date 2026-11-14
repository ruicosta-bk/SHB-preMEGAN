export const META_STORAGE_KEY = 'ember_vault_meta_v1';

export type MetaUpgradeId = 'vitality' | 'armor' | 'energy' | 'pouch' | 'reflex';

export interface MetaUpgradeConfig {
  id: MetaUpgradeId;
  nameVi: string;
  descVi: string;
  maxLevel: number;
  costs: readonly [number, number, number];
}

export interface MetaState {
  gems: number;
  runsPlayed: number;
  victories: number;
  bestFloorCode: string;
  upgrades: Record<MetaUpgradeId, number>;
}

export interface MetaBonuses {
  bonusHp: number;
  bonusArmor: number;
  bonusEnergy: number;
  startCoins: number;
  cooldownMult: number;
}

export interface RunGemInput {
  isVictory: boolean;
  enemiesDefeated: number;
  roomsCleared: number;
  floorNumber: number;
}

export interface RunResultInput extends RunGemInput {
  floorCode: string;
}

export interface RunResultSummary {
  gemsEarned: number;
  totalGems: number;
  state: MetaState;
}

export const META_UPGRADE_IDS: readonly MetaUpgradeId[] = [
  'vitality',
  'armor',
  'energy',
  'pouch',
  'reflex'
];

export const META_UPGRADES: Record<MetaUpgradeId, MetaUpgradeConfig> = {
  vitality: {
    id: 'vitality',
    nameVi: 'Thể Phách Cổ Thuật',
    descVi: '+1 Máu tối đa / cấp',
    maxLevel: 3,
    costs: [20, 45, 80]
  },
  armor: {
    id: 'armor',
    nameVi: 'Khiên Khảm Ngọc',
    descVi: '+1 Giáp tối đa / cấp',
    maxLevel: 3,
    costs: [25, 50, 90]
  },
  energy: {
    id: 'energy',
    nameVi: 'Lò Giả Kim',
    descVi: '+25 NL tối đa / cấp',
    maxLevel: 3,
    costs: [15, 35, 65]
  },
  pouch: {
    id: 'pouch',
    nameVi: 'Túi Vàng Thương Nhân',
    descVi: '+15 Vàng khởi đầu / cấp',
    maxLevel: 3,
    costs: [15, 35, 70]
  },
  reflex: {
    id: 'reflex',
    nameVi: 'Kỷ Luật Chiến Đấu',
    descVi: '-8% hồi chiêu Dash & Skill [F] / cấp',
    maxLevel: 3,
    costs: [30, 60, 100]
  }
};

function createDefaultUpgrades(): Record<MetaUpgradeId, number> {
  return {
    vitality: 0,
    armor: 0,
    energy: 0,
    pouch: 0,
    reflex: 0
  };
}

function createDefaultMetaState(): MetaState {
  return {
    gems: 0,
    runsPlayed: 0,
    victories: 0,
    bestFloorCode: '1-1',
    upgrades: createDefaultUpgrades()
  };
}

let memoryState: MetaState = createDefaultMetaState();
let storageWriteFailed = false;

function isUsableStorage(candidate: unknown): candidate is Storage {
  return (
    Boolean(candidate) &&
    typeof (candidate as Storage).getItem === 'function' &&
    typeof (candidate as Storage).setItem === 'function' &&
    typeof (candidate as Storage).removeItem === 'function'
  );
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && isUsableStorage(window.localStorage)) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined') {
      const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
      // Avoid invoking Node 22+'s experimental localStorage getter unless explicitly provided as a value
      if (desc && 'value' in desc && isUsableStorage(desc.value)) {
        return desc.value;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function clampNonNegativeInt(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

function sanitizeMetaState(raw: unknown): MetaState {
  const defaults = createDefaultMetaState();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const candidate = raw as Partial<MetaState>;
  const rawUpgrades = (candidate.upgrades && typeof candidate.upgrades === 'object'
    ? candidate.upgrades
    : {}) as Partial<Record<MetaUpgradeId, unknown>>;

  const upgrades = createDefaultUpgrades();
  for (const id of META_UPGRADE_IDS) {
    const maxLevel = META_UPGRADES[id].maxLevel;
    upgrades[id] = Math.min(maxLevel, clampNonNegativeInt(rawUpgrades[id], 0));
  }

  const bestFloorCode =
    typeof candidate.bestFloorCode === 'string' && candidate.bestFloorCode.trim().length > 0
      ? candidate.bestFloorCode.trim()
      : defaults.bestFloorCode;

  return {
    gems: clampNonNegativeInt(candidate.gems, 0),
    runsPlayed: clampNonNegativeInt(candidate.runsPlayed, 0),
    victories: clampNonNegativeInt(candidate.victories, 0),
    bestFloorCode,
    upgrades
  };
}

function parseFloorRank(code: string): number | null {
  const match = /^(\d+)-(\d+)$/.exec(code.trim());
  if (!match) return null;
  const stage = Number(match[1]);
  const subFloor = Number(match[2]);
  if (!Number.isFinite(stage) || !Number.isFinite(subFloor)) return null;
  return stage * 100 + subFloor;
}

function pickHigherFloorCode(current: string, next: string): string {
  const trimmedNext = typeof next === 'string' ? next.trim() : '';
  if (!trimmedNext) return current;

  const currentRank = parseFloorRank(current);
  const nextRank = parseFloorRank(trimmedNext);
  if (currentRank !== null && nextRank !== null) {
    return nextRank > currentRank ? trimmedNext : current;
  }
  return trimmedNext > current ? trimmedNext : current;
}

export function loadMetaState(): MetaState {
  const storage = getStorage();
  if (storage && !storageWriteFailed) {
    try {
      const raw = storage.getItem(META_STORAGE_KEY);
      if (raw === null) {
        memoryState = createDefaultMetaState();
        return memoryState;
      }
      memoryState = sanitizeMetaState(JSON.parse(raw));
      return memoryState;
    } catch {
      memoryState = createDefaultMetaState();
      return memoryState;
    }
  }
  return memoryState;
}

export function saveMetaState(nextState?: MetaState): MetaState {
  memoryState = sanitizeMetaState(nextState ?? memoryState);
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(META_STORAGE_KEY, JSON.stringify(memoryState));
      storageWriteFailed = false;
    } catch {
      storageWriteFailed = true;
    }
  }
  return memoryState;
}

export function resetMetaStateForTests(): MetaState {
  memoryState = createDefaultMetaState();
  storageWriteFailed = false;
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(META_STORAGE_KEY);
    } catch {
      // Ignore storage removal errors in restricted environments
    }
  }
  return memoryState;
}

export function getMetaBonuses(): MetaBonuses {
  const state = loadMetaState();
  const cooldownRaw = 1 - state.upgrades.reflex * 0.08;
  const cooldownMult = Math.max(0.65, Number(cooldownRaw.toFixed(4)));

  return {
    bonusHp: state.upgrades.vitality,
    bonusArmor: state.upgrades.armor,
    bonusEnergy: state.upgrades.energy * 25,
    startCoins: state.upgrades.pouch * 15,
    cooldownMult
  };
}

export function getNextUpgradeCost(id: MetaUpgradeId): number | null {
  const config = META_UPGRADES[id];
  if (!config) return null;

  const state = loadMetaState();
  const currentLevel = state.upgrades[id] ?? 0;
  if (currentLevel >= config.maxLevel) {
    return null;
  }

  return config.costs[currentLevel] ?? null;
}

export function purchaseMetaUpgrade(id: MetaUpgradeId): boolean {
  const cost = getNextUpgradeCost(id);
  if (cost === null) {
    return false;
  }

  const state = loadMetaState();
  if (state.gems < cost) {
    return false;
  }

  state.gems -= cost;
  state.upgrades[id] = (state.upgrades[id] ?? 0) + 1;
  saveMetaState(state);
  return true;
}

export function calculateRunGems(input: RunGemInput): number {
  const floor = clampNonNegativeInt(input.floorNumber, 0);
  const rooms = clampNonNegativeInt(input.roomsCleared, 0);
  const kills = clampNonNegativeInt(input.enemiesDefeated, 0);
  const victoryBonus = input.isVictory ? 50 : 0;

  if (floor < 1 && rooms < 1 && kills < 1 && !input.isVictory) {
    return 0;
  }

  const raw = floor * 6 + rooms * 2 + Math.floor(kills * 0.5) + victoryBonus;
  return Math.max(5, raw);
}

export function recordRunResult(input: RunResultInput): RunResultSummary {
  const state = loadMetaState();
  const gemsEarned = calculateRunGems(input);

  state.gems += gemsEarned;
  state.runsPlayed += 1;
  if (input.isVictory) {
    state.victories += 1;
  }
  state.bestFloorCode = pickHigherFloorCode(state.bestFloorCode, input.floorCode);

  saveMetaState(state);

  return {
    gemsEarned,
    totalGems: state.gems,
    state: {
      ...state,
      upgrades: { ...state.upgrades }
    }
  };
}
