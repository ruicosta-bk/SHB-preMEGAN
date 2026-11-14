import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  META_STORAGE_KEY,
  META_UPGRADES,
  META_UPGRADE_IDS,
  MetaUpgradeId,
  calculateRunGems,
  getMetaBonuses,
  getNextUpgradeCost,
  loadMetaState,
  purchaseMetaUpgrade,
  recordRunResult,
  resetMetaStateForTests,
  saveMetaState
} from '../src/core/MetaProgression';

describe('MetaProgression (Ngọc Hồn) System', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetMetaStateForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetMetaStateForTests();
  });

  it('exposes complete META_UPGRADES metadata and default state schema', () => {
    expect(META_STORAGE_KEY).toBe('ember_vault_meta_v1');
    expect(META_UPGRADE_IDS).toEqual(['vitality', 'armor', 'energy', 'pouch', 'reflex']);

    expect(META_UPGRADES.vitality).toMatchObject({
      id: 'vitality',
      nameVi: 'Thể Phách Cổ Thuật',
      maxLevel: 3,
      costs: [20, 45, 80]
    });
    expect(META_UPGRADES.armor).toMatchObject({
      id: 'armor',
      nameVi: 'Khiên Khảm Ngọc',
      maxLevel: 3,
      costs: [25, 50, 90]
    });
    expect(META_UPGRADES.energy).toMatchObject({
      id: 'energy',
      nameVi: 'Lò Giả Kim',
      maxLevel: 3,
      costs: [15, 35, 65]
    });
    expect(META_UPGRADES.pouch).toMatchObject({
      id: 'pouch',
      nameVi: 'Túi Vàng Thương Nhân',
      maxLevel: 3,
      costs: [15, 35, 70]
    });
    expect(META_UPGRADES.reflex).toMatchObject({
      id: 'reflex',
      nameVi: 'Kỷ Luật Chiến Đấu',
      maxLevel: 3,
      costs: [30, 60, 100]
    });

    for (const id of META_UPGRADE_IDS) {
      expect(META_UPGRADES[id].descVi.length).toBeGreaterThan(0);
    }

    const state = loadMetaState();
    expect(state).toEqual({
      gems: 0,
      runsPlayed: 0,
      victories: 0,
      bestFloorCode: '1-1',
      upgrades: {
        vitality: 0,
        armor: 0,
        energy: 0,
        pouch: 0,
        reflex: 0
      }
    });
  });

  it('persists safely via in-memory fallback when localStorage is unavailable in Node', () => {
    const state = loadMetaState();
    state.gems = 100;
    saveMetaState(state);

    expect(purchaseMetaUpgrade('vitality')).toBe(true);
    expect(purchaseMetaUpgrade('pouch')).toBe(true);

    const reloaded = loadMetaState();
    expect(reloaded.gems).toBe(65);
    expect(reloaded.upgrades.vitality).toBe(1);
    expect(reloaded.upgrades.pouch).toBe(1);

    const reset = resetMetaStateForTests();
    expect(reset.gems).toBe(0);
    expect(reset.upgrades.vitality).toBe(0);
  });

  it('persists to and loads from localStorage when available and survives corrupt/throwing storage', () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (idx: number) => Array.from(store.keys())[idx] ?? null,
      get length() {
        return store.size;
      }
    } as Storage;

    vi.stubGlobal('localStorage', mockStorage);
    resetMetaStateForTests();

    recordRunResult({
      isVictory: true,
      enemiesDefeated: 20,
      roomsCleared: 5,
      floorNumber: 2,
      floorCode: '1-2'
    });

    expect(store.has(META_STORAGE_KEY)).toBe(true);
    const parsed = JSON.parse(store.get(META_STORAGE_KEY)!);
    expect(parsed.gems).toBe(82);
    expect(parsed.victories).toBe(1);
    expect(parsed.bestFloorCode).toBe('1-2');

    // Corrupt JSON should gracefully fall back to defaults without throwing
    store.set(META_STORAGE_KEY, '{broken-json');
    expect(loadMetaState().gems).toBe(0);

    // Out-of-bounds values should be sanitized/clamped
    store.set(
      META_STORAGE_KEY,
      JSON.stringify({
        gems: -50,
        runsPlayed: 3.9,
        victories: 'invalid',
        bestFloorCode: '2-1',
        upgrades: { vitality: 99, reflex: -2 }
      })
    );
    const sanitized = loadMetaState();
    expect(sanitized.gems).toBe(0);
    expect(sanitized.runsPlayed).toBe(3);
    expect(sanitized.victories).toBe(0);
    expect(sanitized.bestFloorCode).toBe('2-1');
    expect(sanitized.upgrades.vitality).toBe(3);
    expect(sanitized.upgrades.reflex).toBe(0);

    // Throwing storage should fall back to in-memory without crashing
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      }
    });
    const memState = loadMetaState();
    memState.gems = 40;
    saveMetaState(memState);
    expect(purchaseMetaUpgrade('energy')).toBe(true);
    expect(loadMetaState().upgrades.energy).toBe(1);
    expect(loadMetaState().gems).toBe(25);
  });

  it('handles upgrade costs, purchasing, and max-level caps accurately', () => {
    const state = loadMetaState();
    state.gems = 150;
    saveMetaState(state);

    // Cannot buy reflex lv1 (30) if gems are too low
    state.gems = 29;
    saveMetaState(state);
    expect(getNextUpgradeCost('reflex')).toBe(30);
    expect(purchaseMetaUpgrade('reflex')).toBe(false);
    expect(loadMetaState().upgrades.reflex).toBe(0);

    // Upgrade reflex 0 -> 1 -> 2 -> 3 (costs: 30 + 60 + 100 = 190)
    state.gems = 200;
    saveMetaState(state);

    expect(getNextUpgradeCost('reflex')).toBe(30);
    expect(purchaseMetaUpgrade('reflex')).toBe(true);
    expect(getNextUpgradeCost('reflex')).toBe(60);
    expect(purchaseMetaUpgrade('reflex')).toBe(true);
    expect(getNextUpgradeCost('reflex')).toBe(100);
    expect(purchaseMetaUpgrade('reflex')).toBe(true);

    expect(loadMetaState().gems).toBe(10);
    expect(loadMetaState().upgrades.reflex).toBe(3);
    expect(getNextUpgradeCost('reflex')).toBeNull();
    expect(purchaseMetaUpgrade('reflex')).toBe(false);
  });

  it('computes getMetaBonuses accurately including cooldownMult floor clamp', () => {
    expect(getMetaBonuses()).toEqual({
      bonusHp: 0,
      bonusArmor: 0,
      bonusEnergy: 0,
      startCoins: 0,
      cooldownMult: 1
    });

    const state = loadMetaState();
    state.gems = 1000;
    saveMetaState(state);

    const buyAll = (id: MetaUpgradeId, times: number) => {
      for (let i = 0; i < times; i++) {
        expect(purchaseMetaUpgrade(id)).toBe(true);
      }
    };

    buyAll('vitality', 2);
    buyAll('armor', 3);
    buyAll('energy', 2);
    buyAll('pouch', 3);
    buyAll('reflex', 3);

    expect(getMetaBonuses()).toEqual({
      bonusHp: 2,
      bonusArmor: 3,
      bonusEnergy: 50,
      startCoins: 45,
      cooldownMult: 0.76
    });
  });

  it('calculates run gems with minimum 5 rule and records run progression monotonically', () => {
    expect(
      calculateRunGems({ isVictory: false, enemiesDefeated: 0, roomsCleared: 0, floorNumber: 0 })
    ).toBe(0);

    // Minimal engagement (>=1 kill or >=1 room) yields at least 5 gems
    expect(
      calculateRunGems({ isVictory: false, enemiesDefeated: 1, roomsCleared: 0, floorNumber: 0 })
    ).toBe(5);
    expect(
      calculateRunGems({ isVictory: false, enemiesDefeated: 0, roomsCleared: 1, floorNumber: 0 })
    ).toBe(5);

    // Defeat on floor 1
    expect(
      calculateRunGems({ isVictory: false, enemiesDefeated: 12, roomsCleared: 3, floorNumber: 1 })
    ).toBe(18);

    // Victory on floor 2
    expect(
      calculateRunGems({ isVictory: true, enemiesDefeated: 35, roomsCleared: 8, floorNumber: 2 })
    ).toBe(95);

    const run1 = recordRunResult({
      isVictory: false,
      enemiesDefeated: 10,
      roomsCleared: 2,
      floorNumber: 1,
      floorCode: '1-2'
    });
    expect(run1.gemsEarned).toBe(15);
    expect(run1.totalGems).toBe(15);
    expect(run1.state.runsPlayed).toBe(1);
    expect(run1.state.victories).toBe(0);
    expect(run1.state.bestFloorCode).toBe('1-2');

    const run2 = recordRunResult({
      isVictory: true,
      enemiesDefeated: 20,
      roomsCleared: 6,
      floorNumber: 2,
      floorCode: '2-1'
    });
    expect(run2.gemsEarned).toBe(84);
    expect(run2.totalGems).toBe(99);
    expect(run2.state.runsPlayed).toBe(2);
    expect(run2.state.victories).toBe(1);
    expect(run2.state.bestFloorCode).toBe('2-1');

    // Subsequent earlier-floor death must NOT regress bestFloorCode
    const run3 = recordRunResult({
      isVictory: false,
      enemiesDefeated: 2,
      roomsCleared: 1,
      floorNumber: 1,
      floorCode: '1-1'
    });
    expect(run3.state.runsPlayed).toBe(3);
    expect(run3.state.victories).toBe(1);
    expect(run3.state.bestFloorCode).toBe('2-1');
  });
});
