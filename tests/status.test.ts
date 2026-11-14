import { describe, it, expect } from 'vitest';
import { StatusManager, EntityWithStatus } from '../src/combat/StatusManager';

describe('StatusManager Unit Tests', () => {
  it('applies burn and triggers damage per tick', () => {
    let damageTaken = 0;
    const mockEntity: EntityWithStatus = {
      id: 'e1',
      x: 100,
      y: 100,
      isDead: false,
      statusEffects: new Map(),
      takeDamage: (dmg) => {
        damageTaken += dmg.amount;
      }
    };

    StatusManager.applyStatus(mockEntity, 'burn', 2.0, 3, 0.5);
    expect(mockEntity.statusEffects.has('burn')).toBe(true);

    // 0.2s elapsed -> no tick yet
    StatusManager.updateStatus(mockEntity, 0.2);
    expect(damageTaken).toBe(0);

    // 0.4s more -> total 0.6s -> 1 tick fires
    StatusManager.updateStatus(mockEntity, 0.4);
    expect(damageTaken).toBe(3);

    // 0.5s more -> second tick fires
    StatusManager.updateStatus(mockEntity, 0.5);
    expect(damageTaken).toBe(6);
  });

  it('freeze marks entity as frozen for movement slow', () => {
    const mockEntity: EntityWithStatus = {
      id: 'e2',
      x: 100,
      y: 100,
      isDead: false,
      statusEffects: new Map(),
      takeDamage: () => {}
    };

    StatusManager.applyStatus(mockEntity, 'freeze', 1.5);
    const res = StatusManager.updateStatus(mockEntity, 0.5);
    expect(res.isFrozen).toBe(true);

    // Wait until expired
    StatusManager.updateStatus(mockEntity, 1.2);
    expect(mockEntity.statusEffects.has('freeze')).toBe(false);
  });

  it('finds closest chain targets within radius up to max limit', () => {
    const origin = { id: 'origin', x: 0, y: 0 };
    const enemies = [
      { id: 'close1', x: 50, y: 0, isDead: false },
      { id: 'close2', x: 0, y: 80, isDead: false },
      { id: 'far', x: 300, y: 300, isDead: false }, // outside 140px radius
      { id: 'deadOne', x: 20, y: 20, isDead: true } // dead, must ignore
    ];

    const targets = StatusManager.findChainTargets(origin, enemies, 140, 2);
    expect(targets.length).toBe(2);
    expect(targets[0].id).toBe('close1');
    expect(targets[1].id).toBe('close2');
  });
});
