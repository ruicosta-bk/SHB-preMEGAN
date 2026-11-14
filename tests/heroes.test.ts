import { describe, it, expect } from 'vitest';
import { HEROES, HERO_LIST, shouldResetSkillOnKill } from '../src/data/heroes';
import { WEAPONS } from '../src/data/weapons';

describe('Hero Class Definitions & Skill Logic', () => {
  it('defines 6 distinct Soul Knight hero classes with valid starting weapons and stats', () => {
    expect(HERO_LIST.length).toBe(6);
    const ids = HERO_LIST.map(h => h.id);
    expect(ids).toEqual(['alchemist', 'rogue', 'vanguard', 'knight', 'wizard', 'vampire']);
    for (const h of HERO_LIST) {
      expect(h.hp).toBeGreaterThanOrEqual(5);
      expect(h.armor).toBeGreaterThanOrEqual(4);
      expect(h.maxEnergy).toBeGreaterThanOrEqual(160);
      expect(h.skillShortLabelVi.length).toBeGreaterThan(0);
      expect(WEAPONS[h.startWeapon]).toBeDefined();
      expect(h.texturePrefix.startsWith('hero_')).toBe(true);
    }

    expect(HEROES.rogue.speed).toBeGreaterThan(HEROES.vanguard.speed);
    expect(HEROES.vanguard.armor).toBeGreaterThan(HEROES.rogue.armor);
    expect(HEROES.wizard.maxEnergy).toBeGreaterThanOrEqual(240);
  });

  it('resets skill cooldown on kill exclusively for Rogue during active kill window', () => {
    expect(shouldResetSkillOnKill('rogue', 0.3)).toBe(true);
    expect(shouldResetSkillOnKill('rogue', 0)).toBe(false);
    expect(shouldResetSkillOnKill('alchemist', 0.3)).toBe(false);
    expect(shouldResetSkillOnKill('vanguard', 0.3)).toBe(false);
  });
});
