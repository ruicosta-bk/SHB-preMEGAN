import { Stats, DamageInfo, DamageResult } from '../types/entity';

export class DamageCalculator {
  /**
   * Applies damage to an entity's armor and HP.
   * Armor absorbs damage first; any excess damage carries over to HP.
   */
  public static applyDamage(stats: Stats, damage: DamageInfo): DamageResult {
    const rawDamage = Math.max(0, damage.amount);
    let absorbedByArmor = 0;
    let hpDamage = 0;

    if (stats.armor > 0) {
      if (stats.armor >= rawDamage) {
        absorbedByArmor = rawDamage;
        stats.armor -= rawDamage;
      } else {
        absorbedByArmor = stats.armor;
        const remainder = rawDamage - stats.armor;
        stats.armor = 0;
        hpDamage = remainder;
        stats.hp = Math.max(0, stats.hp - hpDamage);
      }
    } else {
      hpDamage = rawDamage;
      stats.hp = Math.max(0, stats.hp - hpDamage);
    }

    const isDead = stats.hp <= 0;
    const overkill = isDead && rawDamage > (absorbedByArmor + hpDamage) ? rawDamage - (absorbedByArmor + hpDamage) : 0;

    return {
      actualDamage: absorbedByArmor + hpDamage,
      absorbedByArmor,
      hpDamage,
      isDead,
      overkill
    };
  }

  /**
   * Armor regeneration helper.
   * Begins regening only after cooldownSinceLastHit has passed without taking damage.
   */
  public static updateArmorRegen(
    stats: Stats,
    deltaSeconds: number,
    timeSinceHit: number,
    delayRequired: number = 3.0,
    regenRatePerSec: number = 2.0
  ): { regened: number; isRegening: boolean } {
    if (stats.armor >= stats.maxArmor || stats.hp <= 0) {
      return { regened: 0, isRegening: false };
    }

    if (timeSinceHit < delayRequired) {
      return { regened: 0, isRegening: false };
    }

    const potentialGain = regenRatePerSec * deltaSeconds;
    const actualGain = Math.min(potentialGain, stats.maxArmor - stats.armor);
    stats.armor = Math.min(stats.maxArmor, stats.armor + actualGain);

    return { regened: actualGain, isRegening: true };
  }

  /**
   * Consumes energy if available.
   * Returns true if successful, false if insufficient energy.
   */
  public static consumeEnergy(stats: Stats, amount: number): boolean {
    if (amount <= 0) return true;
    if (stats.energy >= amount) {
      stats.energy -= amount;
      return true;
    }
    return false;
  }
}
