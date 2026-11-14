import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/data/weapons';

describe('Weapon System Unit Tests', () => {
  it('defines all 5 canonical weapons with distinct characteristics', () => {
    const ids = ['pistol', 'shotgun', 'repeater', 'penetrator', 'blade'];
    ids.forEach(id => {
      expect(WEAPONS[id as keyof typeof WEAPONS]).toBeDefined();
    });
  });

  it('guarantees pistol consumes 0 energy so player is never softlocked', () => {
    expect(WEAPONS.pistol.energyCost).toBe(0);
    expect(WEAPONS.pistol.damage).toBeGreaterThan(0);
    expect(WEAPONS.pistol.fireRate).toBeGreaterThan(0);
  });

  it('configures shotgun for close-quarters lethality with multi-pellet spread', () => {
    expect(WEAPONS.shotgun.pellets).toBe(5);
    expect(WEAPONS.shotgun.spreadAngle).toBeGreaterThan(15);
    expect(WEAPONS.shotgun.range).toBeLessThan(400);
  });

  it('configures repeater for high cadence rapid fire', () => {
    expect(WEAPONS.repeater.fireRate).toBeGreaterThan(7.0);
    expect(WEAPONS.repeater.energyCost).toBe(1);
  });

  it('configures penetrator for high-damage line penetration', () => {
    expect(WEAPONS.penetrator.pierceCount).toBeGreaterThanOrEqual(3);
    expect(WEAPONS.penetrator.damage).toBeGreaterThanOrEqual(8);
  });

  it('configures blade as a wide-arc melee weapon', () => {
    expect(WEAPONS.blade.category).toBe('melee');
    expect(WEAPONS.blade.spreadAngle).toBeGreaterThanOrEqual(120);
    expect(WEAPONS.blade.range).toBeLessThan(100);
  });
});
