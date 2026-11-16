import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
      Angle: { Wrap: (a: number) => a }
    }
  }
}));

import { BossIgnis } from '../src/enemies/BossIgnis';
import { events } from '../src/core/EventBus';

function createMockBossScene() {
  const makeSprite = (x: number, y: number, tex: string) => ({
    x,
    y,
    texture: { key: tex },
    active: true,
    setDepth() { return this; },
    setScale() { return this; },
    setTint() { return this; },
    clearTint() { return this; },
    setTexture(key: string) { this.texture.key = key; return this; },
    setFlipX() { return this; },
    destroy() { this.active = false; }
  });

  const makeGfx = () => ({
    setDepth() { return this; },
    lineStyle() { return this; },
    strokeCircle() { return this; },
    fillStyle() { return this; },
    fillCircle() { return this; },
    clear() { return this; },
    destroy() {}
  });

  const scene: any = {
    cameras: { main: { shake: vi.fn() } },
    tweens: { add: vi.fn() },
    add: {
      sprite: (x: number, y: number, tex: string) => makeSprite(x, y, tex),
      graphics: () => makeGfx()
    }
  };
  return scene;
}

describe('QA-003 BossIgnis combat:enemy-hit feedback', () => {
  beforeEach(() => {
    events.clear();
  });

  afterEach(() => {
    events.clear();
  });

  it('emits combat:enemy-hit once per hit across Phase 1, Phase 1->2 transition, Phase 2 death, and ignores hits once dead', () => {
    const hitEvents: { enemyId: string; damage: number; isCrit: boolean; element?: string }[] = [];
    let damageDealt = 0;
    events.on('combat:enemy-hit', (payload: any) => {
      hitEvents.push(payload);
      damageDealt += payload.damage;
    });

    const boss = new BossIgnis(createMockBossScene(), 320, 240, 1);
    expect(boss.phase).toBe(1);
    expect(boss.hp).toBe(240);

    // 1. Phase 1 hit
    const res1 = boss.takeDamage({ amount: 25, isCrit: false, element: 'fire', isPlayerAttack: true });
    expect(res1.isDead).toBe(false);
    expect(boss.phase).toBe(1);
    expect(hitEvents.length).toBe(1);
    expect(hitEvents[0]).toMatchObject({ enemyId: boss.id, damage: 25, isCrit: false, element: 'fire' });
    expect(damageDealt).toBe(25);

    // 2. Hit triggering Phase 1 -> Phase 2 transition
    const res2 = boss.takeDamage({ amount: 225, isCrit: true, isPlayerAttack: true });
    expect(res2.isDead).toBe(false);
    expect(boss.phase).toBe(2);
    expect(hitEvents.length).toBe(2);
    expect(hitEvents[1]).toMatchObject({ enemyId: boss.id, damage: 225, isCrit: true });
    expect(damageDealt).toBe(250);

    // 3. Phase 2 lethal hit
    const p2Hp = boss.hp;
    const res3 = boss.takeDamage({ amount: p2Hp + 10, isCrit: false, isPlayerAttack: true });
    expect(res3.isDead).toBe(true);
    expect(boss.isDead).toBe(true);
    expect(hitEvents.length).toBe(3);
    expect(damageDealt).toBe(250 + p2Hp + 10);

    // 4. Subsequent hit on dead boss emits nothing
    const res4 = boss.takeDamage({ amount: 20, isCrit: false, isPlayerAttack: true });
    expect(res4.actualDamage).toBe(0);
    expect(hitEvents.length).toBe(3);
  });
});
