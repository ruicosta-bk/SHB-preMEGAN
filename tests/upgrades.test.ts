import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Input: { Keyboard: { KeyCodes: { W: 87, A: 65, S: 83, D: 68, UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, SPACE: 32, Q: 81, E: 69, F: 70, ESC: 27 } } },
    Math: { Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)) }
  }
}));

import { UPGRADES, canApplyUpgrade, getAvailableUpgradeChoices } from '../src/data/upgrades';
import { UpgradeId } from '../src/types/upgrade';
import { PlayerController } from '../src/player/PlayerController';
import { UpgradeSelectModal } from '../src/ui/UpgradeSelectModal';
import { RoomManager, getEnemyEnergyDropChance } from '../src/world/RoomManager';

function createMockPlayerScene() {
  const makeSprite = (x: number, y: number, tex: string) => ({
    x,
    y,
    texture: { key: tex },
    active: true,
    setDepth() { return this; },
    setVisible() { return this; },
    setScale() { return this; },
    setOrigin() { return this; },
    setTint() { return this; },
    clearTint() { return this; },
    setTexture(t: string) { this.texture.key = t; return this; },
    setRotation() { return this; },
    setFlipX() { return this; },
    setPosition(nx: number, ny: number) { this.x = nx; this.y = ny; return this; },
    destroy() { this.active = false; }
  });

  return {
    add: {
      sprite: (x: number, y: number, tex: string) => makeSprite(x, y, tex),
      graphics: () => ({
        setDepth() { return this; },
        clear() { return this; },
        fillStyle() { return this; },
        fillRoundedRect() { return this; },
        fillRect() { return this; },
        lineStyle() { return this; },
        strokeRoundedRect() { return this; },
        destroy() {}
      }),
      container: () => ({
        x: 0,
        y: 0,
        add: () => {},
        removeAll: () => {},
        setDepth() { return this; },
        setScrollFactor() { return this; },
        setVisible() { return this; },
        setScale() { return this; },
        destroy() {}
      }),
      text: () => ({
        setOrigin() { return this; },
        destroy() {}
      }),
      zone: () => ({
        setInteractive() { return this; },
        on: () => {},
        destroy() {}
      })
    },
    input: {
      keyboard: {
        addKey: () => ({ isDown: false })
      }
    }
  } as any;
}

describe('Upgrade System Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('defines all 12 canonical Soul Knight upgrades with complete metadata and valid icons', () => {
    const ids = [
      'armor_plating',
      'vitality_ember',
      'energy_capacitor',
      'piercing_rounds',
      'ricochet',
      'blade_mastery',
      'slipstream_dash',
      'critical_focus',
      'vampire_bite',
      'trap_shield',
      'shotgun_plus',
      'shockwave_armor'
    ];

    expect(Object.keys(UPGRADES).length).toBe(12);

    ids.forEach(id => {
      const upg = UPGRADES[id as keyof typeof UPGRADES];
      expect(upg).toBeDefined();
      expect(upg.nameVi.length).toBeGreaterThan(0);
      expect(upg.descriptionVi.length).toBeGreaterThan(0);
      expect(upg.icon.startsWith('upg_')).toBe(true);
      expect(upg.maxStacks).toBeGreaterThanOrEqual(1);
    });
  });

  it('guarantees diversity of upgrade categories', () => {
    const categories = Object.values(UPGRADES).map(u => u.category);
    expect(categories).toContain('survival');
    expect(categories).toContain('offense');
    expect(categories).toContain('utility');
  });

  it('enforces maxStacks=1 and maxStacks=2 in PlayerController.applyUpgrade without granting extra stats past cap', () => {
    const player = new PlayerController(createMockPlayerScene(), 100, 100, 'knight');

    // maxStacks: 1 (trap_shield -> +1 maxHp once)
    const hpBeforeTrap = player.stats.maxHp;
    expect(player.applyUpgrade('trap_shield')).toBe(true);
    expect(player.stats.maxHp).toBe(hpBeforeTrap + 1);
    expect(player.applyUpgrade('trap_shield')).toBe(false);
    expect(player.stats.maxHp).toBe(hpBeforeTrap + 1);
    expect(player.getUpgradeStacks().get('trap_shield')).toBe(1);

    // maxStacks: 2 (armor_plating -> +2 maxArmor twice, blocked on 3rd)
    const armorBefore = player.stats.maxArmor;
    expect(player.applyUpgrade('armor_plating')).toBe(true);
    expect(player.applyUpgrade('armor_plating')).toBe(true);
    expect(player.applyUpgrade('armor_plating')).toBe(false);
    expect(player.stats.maxArmor).toBe(armorBefore + 4);
    expect(player.getUpgradeStacks().get('armor_plating')).toBe(2);
  });

  it('excludes capped upgrades, returns fewer than 3 when pool shrinks, and returns 0 when exhausted', () => {
    const stacks = new Map<UpgradeId, number>();
    const allIds = Object.keys(UPGRADES) as UpgradeId[];

    // Cap all except 2 upgrades
    for (let i = 0; i < allIds.length - 2; i++) {
      const id = allIds[i];
      stacks.set(id, UPGRADES[id].maxStacks);
    }

    const partial = getAvailableUpgradeChoices(stacks, 3, () => 0.5);
    expect(partial.length).toBe(2);
    expect(partial.map(u => u.id).sort()).toEqual([allIds[allIds.length - 2], allIds[allIds.length - 1]].sort());

    // Cap remaining 2 upgrades
    for (const id of allIds) {
      stacks.set(id, UPGRADES[id].maxStacks);
      expect(canApplyUpgrade(stacks, id)).toBe(false);
    }

    const exhausted = getAvailableUpgradeChoices(stacks, 3);
    expect(exhausted).toEqual([]);

    // Modal should stay closed if offered an empty pool (prevents wasting altar)
    const modal = new UpgradeSelectModal(createMockPlayerScene());
    modal.show(exhausted, () => {});
    expect(modal.isOpen).toBe(false);

    // Modal opens cleanly when 1 or 2 valid choices remain
    modal.show(partial, () => {});
    expect(modal.isOpen).toBe(true);
  });

  it('applies Energy Capacitor +50% energy drop bonus per stack, clamped at 100%, with deterministic RNG', () => {
    // Formula check: base (0.24 normal / 0.50 elite) * (1 + 0.5 * stacks), capped at 1.0
    expect(getEnemyEnergyDropChance(false, 0)).toBeCloseTo(0.24, 5);
    expect(getEnemyEnergyDropChance(false, 1)).toBeCloseTo(0.36, 5);
    expect(getEnemyEnergyDropChance(false, 2)).toBeCloseTo(0.48, 5);
    expect(getEnemyEnergyDropChance(true, 0)).toBeCloseTo(0.5, 5);
    expect(getEnemyEnergyDropChance(true, 1)).toBeCloseTo(0.75, 5);
    expect(getEnemyEnergyDropChance(true, 2)).toBe(1);
    expect(getEnemyEnergyDropChance(true, 5)).toBe(1);

    const makeSequenceRng = (values: number[]) => {
      let idx = 0;
      return () => values[Math.min(idx++, values.length - 1)];
    };

    const runRoll = (isElite: boolean, stacks: number, rngValues: number[]) => {
      const dropped: string[] = [];
      const fakeRm: any = {
        spawnPickup: (type: string) => dropped.push(type)
      };
      RoomManager.prototype.rollEnemyDrop.call(
        fakeRm,
        200,
        200,
        isElite,
        stacks,
        makeSequenceRng(rngValues)
      );
      return dropped;
    };

    // Normal enemy: coinCount roll=0.2 (< 0.55 -> 1 coin -> 2 offset rngs), energy roll=0.30, heart roll=0.90
    // At 0 stacks (threshold 0.24): 0.30 does NOT drop energy
    expect(runRoll(false, 0, [0.2, 0.5, 0.5, 0.30, 0.9])).not.toContain('energy');
    // At 1 stack (threshold 0.36): 0.30 DOES drop energy
    expect(runRoll(false, 1, [0.2, 0.5, 0.5, 0.30, 0.9])).toContain('energy');

    // Roll 0.42 misses at 1 stack (0.36) but hits at 2 stacks (0.48)
    expect(runRoll(false, 1, [0.2, 0.5, 0.5, 0.42, 0.9])).not.toContain('energy');
    expect(runRoll(false, 2, [0.2, 0.5, 0.5, 0.42, 0.9])).toContain('energy');

    // Elite (2 coins -> 4 offset rngs) at 2 stacks has 100% energy drop even on high roll (0.999) while heart chance remains independent
    const eliteMaxStackDrops = runRoll(true, 2, [0.5, 0.5, 0.5, 0.5, 0.999, 0.2]);
    expect(eliteMaxStackDrops).toContain('energy');
    expect(eliteMaxStackDrops).toContain('heart');

    // Verify PlayerController tracks energy_capacitor stacks cleanly up to maxStacks=2
    const player = new PlayerController(createMockPlayerScene(), 100, 100, 'knight');
    const baseMaxEnergy = player.stats.maxEnergy;
    expect(player.getUpgradeStackCount('energy_capacitor')).toBe(0);
    expect(player.applyUpgrade('energy_capacitor')).toBe(true);
    expect(player.stats.maxEnergy).toBe(baseMaxEnergy + 60);
    expect(player.getUpgradeStackCount('energy_capacitor')).toBe(1);
    expect(player.applyUpgrade('energy_capacitor')).toBe(true);
    expect(player.stats.maxEnergy).toBe(baseMaxEnergy + 120);
    expect(player.getUpgradeStackCount('energy_capacitor')).toBe(2);
    expect(player.applyUpgrade('energy_capacitor')).toBe(false);
  });
});
