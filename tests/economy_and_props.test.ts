import { describe, it, expect } from 'vitest';
import { StatusManager, EntityWithStatus } from '../src/combat/StatusManager';

describe('Soul Knight Features - Economy & Interactive Mechanics', () => {
  it('handles player coin transactions correctly', () => {
    let coins = 0;
    const addCoins = (amount: number) => {
      coins += amount;
    };
    const spendCoins = (amount: number): boolean => {
      if (coins >= amount) {
        coins -= amount;
        return true;
      }
      return false;
    };

    // Starts with 0 coins
    expect(coins).toBe(0);

    // Cannot buy health potion (15 coins) with 0 coins
    expect(spendCoins(15)).toBe(false);
    expect(coins).toBe(0);

    // Defeat enemies and collect coins
    addCoins(2); // Grunt 1
    addCoins(1); // Grunt 2
    addCoins(15); // Boss drop
    expect(coins).toBe(18);

    // Buy health potion (15 coins)
    expect(spendCoins(15)).toBe(true);
    expect(coins).toBe(3);

    // Cannot buy rare weapon (30 coins) with 3 coins
    expect(spendCoins(30)).toBe(false);
    expect(coins).toBe(3);
  });

  it('calculates chain lightning targets within specified radius ignoring dead entities', () => {
    const origin = { id: 'grunt_source', x: 200, y: 200 };
    const candidates = [
      { id: 'grunt_near', x: 240, y: 210, isDead: false },
      { id: 'shooter_near', x: 190, y: 260, isDead: false },
      { id: 'charger_far', x: 500, y: 500, isDead: false },
      { id: 'dead_grunt', x: 210, y: 205, isDead: true }
    ];

    const targets = StatusManager.findChainTargets(origin, candidates, 150, 2);
    expect(targets.length).toBe(2);
    expect(targets.map(t => t.id)).toEqual(['grunt_near', 'shooter_near']);
  });

  it('applies burn and freeze statuses correctly to entities', () => {
    let damageTaken = 0;
    const enemy: EntityWithStatus = {
      id: 'test_enemy',
      x: 0,
      y: 0,
      isDead: false,
      statusEffects: new Map(),
      takeDamage: (d) => {
        damageTaken += d.amount;
      }
    };

    // Apply burn status from explosive barrel / flask
    StatusManager.applyStatus(enemy, 'burn', 2.0, 4, 0.5);
    expect(enemy.statusEffects.has('burn')).toBe(true);

    // 0.6s elapsed -> 1 tick fires (4 damage)
    StatusManager.updateStatus(enemy, 0.6);
    expect(damageTaken).toBe(4);

    // Apply freeze status
    StatusManager.applyStatus(enemy, 'freeze', 1.0);
    const { isFrozen } = StatusManager.updateStatus(enemy, 0.1);
    expect(isFrozen).toBe(true);
  });
});
