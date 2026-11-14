import { describe, it, expect } from 'vitest';
import { UPGRADES } from '../src/data/upgrades';

describe('Upgrade System Unit Tests', () => {
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
});
