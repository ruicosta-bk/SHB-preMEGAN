import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Math: { Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)) }
  }
}));

import { InteractiveProps, resolveCombatExplosion } from '../src/world/InteractiveProps';
import { events } from '../src/core/EventBus';

function createMockScene() {
  const makeSprite = (x: number, y: number, texture: string) => ({
    x,
    y,
    texture: { key: texture },
    active: true,
    setDepth() { return this; },
    setTint() { return this; },
    clearTint() { return this; },
    destroy() { this.active = false; }
  });

  const scene: any = {
    cameras: { main: { shake: vi.fn() } },
    time: { delayedCall: vi.fn() },
    tweens: { add: vi.fn() },
    add: {
      sprite: (x: number, y: number, tex: string) => makeSprite(x, y, tex),
      rectangle: () => ({ setDepth() { return this; }, destroy() {} }),
      graphics: () => ({
        setDepth() { return this; },
        fillStyle() { return this; },
        fillCircle() { return this; },
        lineStyle() { return this; },
        strokeCircle() { return this; },
        destroy() {}
      })
    }
  };
  return scene;
}

function createMockEnemy(id: string, x: number, y: number, hp: number = 100) {
  const hits: { amount: number; element?: string }[] = [];
  const enemy: any = {
    id,
    x,
    y,
    sprite: { x, y },
    hp,
    isDead: false,
    statusEffects: new Map(),
    hits,
    takeDamage(dmg: { amount: number; element?: string }) {
      if (this.isDead) return { actualDamage: 0, absorbedByArmor: 0, hpDamage: 0, isDead: true, overkill: 0 };
      hits.push({ amount: dmg.amount, element: dmg.element });
      this.hp -= dmg.amount;
      if (this.hp <= 0) this.isDead = true;
      return { actualDamage: dmg.amount, absorbedByArmor: 0, hpDamage: dmg.amount, isDead: this.isDead, overkill: 0 };
    }
  };
  return enemy;
}

describe('QA-002 Single-Authority Barrel Explosion', () => {
  let props: InteractiveProps;
  let enemies: any[];
  let pool: any;

  beforeEach(() => {
    events.clear();
    const scene = createMockScene();
    props = new InteractiveProps(scene);
    enemies = [];
    pool = { destroyEnemyBulletsInRadius: vi.fn() };

    events.on('combat:explosion', (payload: any) => {
      resolveCombatExplosion(payload, enemies, props, pool);
    });
  });

  afterEach(() => {
    events.clear();
  });

  it('applies exact single-instance 24 damage and burn once for a single explosive barrel', () => {
    const barrel = props.spawnProp('explosive', 100, 100);
    const enemy = createMockEnemy('e1', 140, 100, 100);
    const farEnemy = createMockEnemy('e2', 300, 300, 100);
    enemies.push(enemy, farEnemy);

    props.damageProp(barrel, { amount: 20, isPlayerAttack: true }, pool, enemies);

    expect(barrel.isDestroyed).toBe(true);
    expect(enemy.hits.length).toBe(1);
    expect(enemy.hits[0].amount).toBe(24);
    expect(enemy.hp).toBe(76);
    expect(enemy.statusEffects.has('burn')).toBe(true);
    expect(farEnemy.hp).toBe(100);
    expect(pool.destroyEnemyBulletsInRadius).toHaveBeenCalledWith(100, 100, 85);
  });

  it('triggers chain reactions across adjacent barrels and applies each barrel blast once in overlapping zones', () => {
    const barrelA = props.spawnProp('explosive', 100, 100);
    const barrelB = props.spawnProp('explosive', 160, 100); // 60px apart -> within 85px blast radius
    const overlapEnemy = createMockEnemy('overlap', 130, 100, 100); // within 85px of BOTH A and B
    const bOnlyEnemy = createMockEnemy('bOnly', 220, 100, 100); // 120px from A, 60px from B
    enemies.push(overlapEnemy, bOnlyEnemy);

    props.damageProp(barrelA, { amount: 20, isPlayerAttack: true }, pool, enemies);

    expect(barrelA.isDestroyed).toBe(true);
    expect(barrelB.isDestroyed).toBe(true);

    // Overlap enemy takes 24 from barrel A + 24 from barrel B = 48 (NOT 96!)
    expect(overlapEnemy.hits.length).toBe(2);
    expect(overlapEnemy.hp).toBe(52);

    // Enemy only near barrel B takes 24 once from chain reaction
    expect(bOnlyEnemy.hits.length).toBe(1);
    expect(bOnlyEnemy.hp).toBe(76);
  });
});
