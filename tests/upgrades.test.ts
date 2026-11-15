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
});
