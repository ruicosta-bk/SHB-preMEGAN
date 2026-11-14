import { describe, it, expect } from 'vitest';
import { DamageCalculator } from '../src/combat/DamageCalculator';
import { Stats } from '../src/types/entity';

describe('DamageCalculator Unit Tests', () => {
  it('absorbs damage with armor first, keeping HP intact when armor >= damage', () => {
    const stats: Stats = {
      maxHp: 6,
      hp: 6,
      maxArmor: 5,
      armor: 5,
      maxEnergy: 180,
      energy: 180,
      speed: 200,
      dashSpeed: 450,
      dashDuration: 0.2,
      dashCooldown: 1.5
    };

    const result = DamageCalculator.applyDamage(stats, { amount: 3, isPlayerAttack: false });
    expect(result.absorbedByArmor).toBe(3);
    expect(result.hpDamage).toBe(0);
    expect(stats.armor).toBe(2);
    expect(stats.hp).toBe(6);
    expect(result.isDead).toBe(false);
  });

  it('excess damage penetrates armor into HP when damage > armor', () => {
    const stats: Stats = {
      maxHp: 6,
      hp: 6,
      maxArmor: 5,
      armor: 2,
      maxEnergy: 180,
      energy: 180,
      speed: 200,
      dashSpeed: 450,
      dashDuration: 0.2,
      dashCooldown: 1.5
    };

    const result = DamageCalculator.applyDamage(stats, { amount: 5, isPlayerAttack: false });
    expect(result.absorbedByArmor).toBe(2);
    expect(result.hpDamage).toBe(3);
    expect(stats.armor).toBe(0);
    expect(stats.hp).toBe(3);
    expect(result.isDead).toBe(false);
  });

  it('correctly sets isDead when HP reaches 0', () => {
    const stats: Stats = {
      maxHp: 6,
      hp: 2,
      maxArmor: 5,
      armor: 0,
      maxEnergy: 180,
      energy: 180,
      speed: 200,
      dashSpeed: 450,
      dashDuration: 0.2,
      dashCooldown: 1.5
    };

    const result = DamageCalculator.applyDamage(stats, { amount: 4, isPlayerAttack: false });
    expect(result.hpDamage).toBe(4);
    expect(stats.hp).toBe(0);
    expect(result.isDead).toBe(true);
  });

  it('armor does not regenerate before 3 seconds delay', () => {
    const stats: Stats = {
      maxHp: 6,
      hp: 6,
      maxArmor: 5,
      armor: 2,
      maxEnergy: 180,
      energy: 180,
      speed: 200,
      dashSpeed: 450,
      dashDuration: 0.2,
      dashCooldown: 1.5
    };

    const res = DamageCalculator.updateArmorRegen(stats, 0.5, 2.5, 3.0);
    expect(res.isRegening).toBe(false);
    expect(stats.armor).toBe(2);
  });

  it('armor regenerates after 3 seconds delay without exceeding maxArmor', () => {
    const stats: Stats = {
      maxHp: 6,
      hp: 6,
      maxArmor: 5,
      armor: 2,
      maxEnergy: 180,
      energy: 180,
      speed: 200,
      dashSpeed: 450,
      dashDuration: 0.2,
      dashCooldown: 1.5
    };

    const res = DamageCalculator.updateArmorRegen(stats, 1.0, 3.5, 3.0, 2.0);
    expect(res.isRegening).toBe(true);
    expect(stats.armor).toBe(4);

    // Further regen capped at maxArmor (5)
    DamageCalculator.updateArmorRegen(stats, 1.0, 4.5, 3.0, 2.0);
    expect(stats.armor).toBe(5);
  });

  it('consumes energy correctly or rejects when insufficient', () => {
    const stats: Stats = {
      maxHp: 6,
      hp: 6,
      maxArmor: 5,
      armor: 5,
      maxEnergy: 180,
      energy: 5,
      speed: 200,
      dashSpeed: 450,
      dashDuration: 0.2,
      dashCooldown: 1.5
    };

    expect(DamageCalculator.consumeEnergy(stats, 3)).toBe(true);
    expect(stats.energy).toBe(2);
    expect(DamageCalculator.consumeEnergy(stats, 4)).toBe(false);
    expect(stats.energy).toBe(2); // unchanged
    expect(DamageCalculator.consumeEnergy(stats, 0)).toBe(true); // 0 cost pistol always succeeds
  });
});
