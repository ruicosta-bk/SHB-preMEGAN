import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/data/weapons';
import { WEAPON_RECIPES, findMergeResult, getAllRecipesForDisplay } from '../src/data/merges';
import { WeaponId } from '../src/types/weapon';

describe('Weapon Merge Recipes & Tier-2 Weapons', () => {
  it('resolves all canonical recipes regardless of input order', () => {
    const expected: Array<[WeaponId, WeaponId, WeaponId]> = [
      ['blade', 'bow', 'frost_sword'],
      ['staff', 'laser', 'thunder_staff'],
      ['staff', 'penetrator', 'thunder_staff'],
      ['repeater', 'shotgun', 'inferno_gatling'],
      ['pistol', 'repeater', 'inferno_gatling']
    ];

    for (const [a, b, result] of expected) {
      expect(findMergeResult(a, b)).toBe(result);
      expect(findMergeResult(b, a)).toBe(result);
    }
  });

  it('returns null for non-matching pairs and identical weapon pairs', () => {
    expect(findMergeResult('pistol', 'blade')).toBeNull();
    expect(findMergeResult('bow', 'laser')).toBeNull();
    expect(findMergeResult('shotgun', 'penetrator')).toBeNull();
    expect(findMergeResult('pistol', 'pistol')).toBeNull();
    expect(findMergeResult('blade', 'blade')).toBeNull();
    expect(findMergeResult('frost_sword', 'bow')).toBeNull();
  });

  it('defines complete Tier-2 merged weapon metadata and texture keys', () => {
    const frost = WEAPONS.frost_sword;
    expect(frost).toBeDefined();
    expect(frost.tier).toBe(2);
    expect(frost.category).toBe('melee');
    expect(frost.nameVi).toBe('Hàn Băng Đại Kiếm');
    expect(frost.appliesChill).toBe(true);
    expect(frost.bulletTexture).toBe('bullet_ice_shard');
    expect(frost.iconTexture).toBe('icon_frost_sword');
    expect(frost.handTexture).toBe('hand_frost_sword');
    expect(frost.damage).toBe(11);
    expect(frost.energyCost).toBe(2);
    expect(frost.fireRate).toBe(2.0);
    expect(frost.spreadAngle).toBe(135);
    expect(frost.range).toBe(78);

    const thunder = WEAPONS.thunder_staff;
    expect(thunder).toBeDefined();
    expect(thunder.tier).toBe(2);
    expect(thunder.category).toBe('gun');
    expect(thunder.nameVi).toBe('Lôi Thần Trượng');
    expect(thunder.isChainLightning).toBe(true);
    expect(thunder.bulletTexture).toBe('bullet_lightning');
    expect(thunder.iconTexture).toBe('icon_thunder_staff');
    expect(thunder.handTexture).toBe('hand_thunder_staff');
    expect(thunder.damage).toBe(7);
    expect(thunder.energyCost).toBe(4);
    expect(thunder.fireRate).toBe(2.1);
    expect(thunder.bulletSpeed).toBe(480);
    expect(thunder.pellets).toBe(1);
    expect(thunder.range).toBe(620);

    const inferno = WEAPONS.inferno_gatling;
    expect(inferno).toBeDefined();
    expect(inferno.tier).toBe(2);
    expect(inferno.category).toBe('gun');
    expect(inferno.nameVi).toBe('Hỏa Long Liên Thanh');
    expect(inferno.appliesBurn).toBe(true);
    expect(inferno.bulletTexture).toBe('bullet_inferno');
    expect(inferno.iconTexture).toBe('icon_inferno_gatling');
    expect(inferno.handTexture).toBe('hand_inferno_gatling');
    expect(inferno.damage).toBe(2);
    expect(inferno.energyCost).toBe(1);
    expect(inferno.fireRate).toBe(10.5);
    expect(inferno.bulletSpeed).toBe(590);
    expect(inferno.spreadAngle).toBe(12);
    expect(inferno.pellets).toBe(2);
    expect(inferno.range).toBe(560);
  });

  it('exposes all recipes for display with valid weapon references', () => {
    const recipes = getAllRecipesForDisplay();
    expect(recipes).toHaveLength(WEAPON_RECIPES.length);
    expect(recipes).toHaveLength(5);

    for (const recipe of recipes) {
      expect(WEAPONS[recipe.inputs[0]]).toBeDefined();
      expect(WEAPONS[recipe.inputs[1]]).toBeDefined();
      expect(WEAPONS[recipe.result]).toBeDefined();
      expect(WEAPONS[recipe.result].tier).toBe(2);
      expect(recipe.nameVi).toBe(WEAPONS[recipe.result].nameVi);
    }
  });
});
