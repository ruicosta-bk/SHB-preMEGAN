import { StatusEffect, DamageInfo } from '../types/entity';

export interface EntityWithStatus {
  id: string;
  x: number;
  y: number;
  isDead: boolean;
  statusEffects: Map<string, StatusEffect>;
  takeDamage: (damage: DamageInfo) => any;
}

export class StatusManager {
  /**
   * Applies or refreshes a status effect on an entity.
   */
  public static applyStatus(
    entity: EntityWithStatus,
    type: 'burn' | 'freeze' | 'shock' | 'poison',
    duration: number,
    damagePerTick: number = 2,
    tickInterval: number = 0.5,
    slowPercent: number = 0.45
  ): void {
    const existing = entity.statusEffects.get(type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
    } else {
      entity.statusEffects.set(type, {
        type,
        duration,
        tickTimer: 0,
        tickInterval,
        damagePerTick,
        slowPercent
      });
    }
  }

  /**
   * Updates all active status effects on an entity.
   * Returns total damage dealt by DoT this tick.
   */
  public static updateStatus(entity: EntityWithStatus, deltaSec: number): { totalDotDamage: number; isFrozen: boolean } {
    let totalDotDamage = 0;
    let isFrozen = false;

    for (const [type, effect] of entity.statusEffects.entries()) {
      effect.duration -= deltaSec;
      effect.tickTimer += deltaSec;

      if (type === 'freeze') {
        isFrozen = true;
      }

      if (effect.tickTimer >= effect.tickInterval) {
        effect.tickTimer = 0;
        if (type === 'burn') {
          entity.takeDamage({
            amount: effect.damagePerTick,
            isPlayerAttack: true,
            element: 'fire'
          });
          totalDotDamage += effect.damagePerTick;
        } else if (type === 'poison') {
          entity.takeDamage({
            amount: effect.damagePerTick,
            isPlayerAttack: true,
            element: 'poison'
          });
          totalDotDamage += effect.damagePerTick;
        }
      }

      if (effect.duration <= 0 || entity.isDead) {
        entity.statusEffects.delete(type);
      }
    }

    return { totalDotDamage, isFrozen };
  }

  /**
   * Searches for up to maxTargets nearby entities within chainRadius to chain lightning.
   */
  public static findChainTargets(
    originEntity: { id: string; x: number; y: number },
    allEntities: { id: string; x: number; y: number; isDead: boolean }[],
    chainRadius: number = 140,
    maxTargets: number = 2
  ): { id: string; x: number; y: number }[] {
    const targets: { id: string; x: number; y: number }[] = [];
    const rSq = chainRadius * chainRadius;

    // Sort by distance to find closest chain links
    const candidates = allEntities
      .filter(e => !e.isDead && e.id !== originEntity.id)
      .map(e => {
        const dx = e.x - originEntity.x;
        const dy = e.y - originEntity.y;
        return { entity: e, distSq: dx * dx + dy * dy };
      })
      .filter(item => item.distSq <= rSq)
      .sort((a, b) => a.distSq - b.distSq);

    for (let i = 0; i < Math.min(maxTargets, candidates.length); i++) {
      targets.push({
        id: candidates[i].entity.id,
        x: candidates[i].entity.x,
        y: candidates[i].entity.y
      });
    }

    return targets;
  }
}
