import { describe, it, expect } from 'vitest';
import { HEROES, HERO_LIST, getHeroSkillMeta, shouldResetSkillOnKill } from '../src/data/heroes';
import { WEAPONS } from '../src/data/weapons';

describe('Hero Class Definitions & Skill Logic', () => {
  it('defines 8 distinct Soul Knight hero classes with valid starting weapons, stats, and Skill 1 & 2 metadata', () => {
    expect(HERO_LIST.length).toBe(8);
    const ids = HERO_LIST.map(h => h.id);
    expect(ids).toEqual([
      'alchemist',
      'rogue',
      'vanguard',
      'knight',
      'wizard',
      'vampire',
      'engineer',
      'berserker'
    ]);

    for (const h of HERO_LIST) {
      expect(h.hp).toBeGreaterThanOrEqual(5);
      expect(h.armor).toBeGreaterThanOrEqual(4);
      expect(h.maxEnergy).toBeGreaterThanOrEqual(160);
      expect(h.dashCooldown).toBeGreaterThan(0);
      expect(WEAPONS[h.startWeapon]).toBeDefined();
      expect(h.texturePrefix.startsWith('hero_')).toBe(true);

      // Skill 1 fields
      expect(h.skillNameVi.trim().length).toBeGreaterThan(0);
      expect(h.skillShortLabelVi.trim().length).toBeGreaterThan(0);
      expect(h.skillDescVi.trim().length).toBeGreaterThan(0);
      expect(h.skillCooldown).toBeGreaterThan(0);

      // Skill 2 fields
      expect(h.skill2NameVi.trim().length).toBeGreaterThan(0);
      expect(h.skill2ShortLabelVi.trim().length).toBeGreaterThan(0);
      expect(h.skill2DescVi.trim().length).toBeGreaterThan(0);
      expect(h.skill2Cooldown).toBeGreaterThan(0);
    }

    expect(HEROES.rogue.speed).toBeGreaterThan(HEROES.vanguard.speed);
    expect(HEROES.vanguard.armor).toBeGreaterThan(HEROES.rogue.armor);
    expect(HEROES.wizard.maxEnergy).toBeGreaterThanOrEqual(240);
    expect(HEROES.engineer.startWeapon).toBe('repeater');
    expect(HEROES.engineer.texturePrefix).toBe('hero_engineer');
    expect(HEROES.berserker.startWeapon).toBe('shotgun');
    expect(HEROES.berserker.texturePrefix).toBe('hero_berserker');
  });

  it('returns accurate skill metadata via getHeroSkillMeta for variants 1 and 2', () => {
    for (const h of HERO_LIST) {
      expect(getHeroSkillMeta(h.id, 1)).toEqual({
        nameVi: h.skillNameVi,
        shortLabelVi: h.skillShortLabelVi,
        descVi: h.skillDescVi,
        cooldown: h.skillCooldown
      });
      expect(getHeroSkillMeta(h.id, 2)).toEqual({
        nameVi: h.skill2NameVi,
        shortLabelVi: h.skill2ShortLabelVi,
        descVi: h.skill2DescVi,
        cooldown: h.skill2Cooldown
      });
    }

    expect(getHeroSkillMeta('alchemist', 2).shortLabelVi).toBe('ĐỘC BĂNG');
    expect(getHeroSkillMeta('engineer', 1).cooldown).toBe(9.0);
    expect(getHeroSkillMeta('berserker', 2).cooldown).toBe(5.5);
  });

  it('resets skill cooldown on kill exclusively for Rogue during active kill window', () => {
    expect(shouldResetSkillOnKill('rogue', 0.3)).toBe(true);
    expect(shouldResetSkillOnKill('rogue', 0)).toBe(false);
    expect(shouldResetSkillOnKill('alchemist', 0.3)).toBe(false);
    expect(shouldResetSkillOnKill('vanguard', 0.3)).toBe(false);
    expect(shouldResetSkillOnKill('engineer', 0.3)).toBe(false);
    expect(shouldResetSkillOnKill('berserker', 0.3)).toBe(false);
  });
});
