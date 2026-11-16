import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../src/data/weapons';
import {
  WEAPON_CORES,
  WEAPON_CORE_IDS,
  getWeaponCore,
  pickRandomWeaponCore
} from '../src/data/weaponCores';
import {
  ELITE_AFFIXES,
  EliteAffixId,
  pickRandomEliteAffix
} from '../src/data/eliteAffixes';
import { StatusManager, EntityWithStatus } from '../src/combat/StatusManager';
import { DamageInfo } from '../src/types/entity';

describe('Milestone 9 Wave 1 Data & Poison Systems', () => {
  it('defines the 3 Tier-2 boss weapons with valid stats and hand textures', () => {
    const solar = WEAPONS.solar_laser;
    expect(solar).toBeDefined();
    expect(solar.nameVi).toBe('Huyết Quang Đại Pháo');
    expect(solar.category).toBe('beam');
    expect(solar.tier).toBe(2);
    expect(solar.damage).toBe(7);
    expect(solar.energyCost).toBe(2);
    expect(solar.fireRate).toBe(7.2);
    expect(solar.range).toBe(580);
    expect(solar.pierceCount).toBe(999);
    expect(solar.appliesBurn).toBe(true);
    expect(solar.handTexture).toBe('hand_solar_laser');

    const boomerang = WEAPONS.boomerang_blade;
    expect(boomerang).toBeDefined();
    expect(boomerang.nameVi).toBe('Nguyệt Luân Hồi Toàn');
    expect(boomerang.category).toBe('gun');
    expect(boomerang.tier).toBe(2);
    expect(boomerang.isBoomerang).toBe(true);
    expect(boomerang.damage).toBe(9);
    expect(boomerang.energyCost).toBe(3);
    expect(boomerang.fireRate).toBe(2.2);
    expect(boomerang.bulletSpeed).toBe(460);
    expect(boomerang.range).toBe(320);
    expect(boomerang.pierceCount).toBe(99);
    expect(boomerang.handTexture).toBe('hand_boomerang_blade');

    const glacial = WEAPONS.glacial_cannon;
    expect(glacial).toBeDefined();
    expect(glacial.nameVi).toBe('Pháo Băng Vĩnh Cửu');
    expect(glacial.category).toBe('gun');
    expect(glacial.tier).toBe(2);
    expect(glacial.appliesChill).toBe(true);
    expect(glacial.isFrostNova).toBe(true);
    expect(glacial.damage).toBe(8);
    expect(glacial.energyCost).toBe(4);
    expect(glacial.fireRate).toBe(1.5);
    expect(glacial.bulletSpeed).toBe(420);
    expect(glacial.spreadAngle).toBe(20);
    expect(glacial.pellets).toBe(3);
    expect(glacial.range).toBe(520);
    expect(glacial.pierceCount).toBe(1);
    expect(glacial.handTexture).toBe('hand_glacial_cannon');
  });

  it('defines all 4 Weapon Cores and supports deterministic random selection', () => {
    expect(WEAPON_CORE_IDS).toEqual(['fire', 'frost', 'poison', 'lightning']);

    for (const id of WEAPON_CORE_IDS) {
      const core = getWeaponCore(id);
      expect(core).toBe(WEAPON_CORES[id]);
      expect(core.id).toBe(id);
      expect(core.element).toBe(id);
      expect(core.bonusDamage).toBeGreaterThan(0);
      expect(core.colorHex.startsWith('#')).toBe(true);
      expect(core.nameVi.length).toBeGreaterThan(0);
      expect(core.shortLabelVi.length).toBeGreaterThan(0);
    }

    expect(getWeaponCore(null)).toBeNull();
    expect(getWeaponCore(undefined)).toBeNull();

    expect(pickRandomWeaponCore(() => 0.0).id).toBe('fire');
    expect(pickRandomWeaponCore(() => 0.3).id).toBe('frost');
    expect(pickRandomWeaponCore(() => 0.6).id).toBe('poison');
    expect(pickRandomWeaponCore(() => 0.99).id).toBe('lightning');
  });

  it('defines all 4 Elite Affixes with balanced combat multipliers', () => {
    const ids: EliteAffixId[] = ['armored', 'volatile', 'regen', 'haste'];
    for (const id of ids) {
      const affix = ELITE_AFFIXES[id];
      expect(affix).toBeDefined();
      expect(affix.id).toBe(id);
      expect(affix.labelVi.length).toBeGreaterThan(0);
      expect(affix.shortVi.length).toBeGreaterThan(0);
      expect(affix.colorHex.startsWith('#')).toBe(true);
      expect(typeof affix.colorNum).toBe('number');
      expect(affix.speedMult).toBeGreaterThan(0);
      expect(affix.attackRateMult).toBeGreaterThan(0);
      expect(affix.damageTakenMult).toBeGreaterThan(0);
    }

    expect(ELITE_AFFIXES.armored.damageTakenMult).toBeLessThan(1);
    expect(ELITE_AFFIXES.haste.speedMult).toBeGreaterThan(1);
    expect(ELITE_AFFIXES.haste.attackRateMult).toBeGreaterThan(1);

    const picked = pickRandomEliteAffix();
    expect(ids).toContain(picked.id);
  });

  it('applies poison status and deals poison element DoT ticks via StatusManager', () => {
    const receivedDamage: DamageInfo[] = [];
    const mockEntity: EntityWithStatus = {
      id: 'enemy_poison_test',
      x: 50,
      y: 60,
      isDead: false,
      statusEffects: new Map(),
      takeDamage: (dmg) => {
        receivedDamage.push(dmg);
      }
    };

    StatusManager.applyStatus(mockEntity, 'poison', 1.6, 2, 0.5);
    expect(mockEntity.statusEffects.has('poison')).toBe(true);

    const step1 = StatusManager.updateStatus(mockEntity, 0.3);
    expect(step1.totalDotDamage).toBe(0);
    expect(receivedDamage.length).toBe(0);

    const step2 = StatusManager.updateStatus(mockEntity, 0.25);
    expect(step2.totalDotDamage).toBe(2);
    expect(receivedDamage).toHaveLength(1);
    expect(receivedDamage[0].element).toBe('poison');
    expect(receivedDamage[0].amount).toBe(2);
    expect(receivedDamage[0].isPlayerAttack).toBe(true);

    const step3 = StatusManager.updateStatus(mockEntity, 0.5);
    expect(step3.totalDotDamage).toBe(2);
    expect(receivedDamage).toHaveLength(2);

    // Expire remaining duration
    StatusManager.updateStatus(mockEntity, 0.7);
    expect(mockEntity.statusEffects.has('poison')).toBe(false);
  });
});
