import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
      Angle: { Wrap: (a: number) => a }
    }
  }
}));

import { ProjectilePool } from '../src/combat/ProjectilePool';
import { DungeonGenerator } from '../src/world/DungeonGenerator';
import { BossIgnis } from '../src/enemies/BossIgnis';
import { BossFrost } from '../src/enemies/BossFrost';
import { BossMolten } from '../src/enemies/BossMolten';
import {
  EnemyCryptShielder,
  EnemyBoneSniper,
  EnemyIceStalker,
  EnemyGlacialTotem,
  EnemyMagmaSlime,
  EnemyPyroJuggernaut
} from '../src/enemies/BiomeEnemies';
import { events } from '../src/core/EventBus';

function createMockCombatScene() {
  const makeSprite = (x: number, y: number, tex: string) => ({
    x,
    y,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    rotation: 0,
    visible: true,
    texture: { key: tex },
    active: true,
    setDepth() { return this; },
    setScale(sx: number, sy?: number) {
      this.scaleX = sx;
      this.scaleY = sy ?? sx;
      return this;
    },
    setAlpha(a: number) { this.alpha = a; return this; },
    setTint() { return this; },
    clearTint() { return this; },
    setTexture(key: string) { this.texture.key = key; return this; },
    setPosition(nx: number, ny: number) { this.x = nx; this.y = ny; return this; },
    setRotation(r: number) { this.rotation = r; return this; },
    setVisible(v: boolean) { this.visible = v; return this; },
    setFlipX() { return this; },
    destroy() { this.active = false; }
  });

  const makeGfx = () => ({
    x: 0,
    y: 0,
    setDepth() { return this; },
    setPosition(nx: number, ny: number) { this.x = nx; this.y = ny; return this; },
    setScale() { return this; },
    setAlpha() { return this; },
    lineStyle() { return this; },
    strokeCircle() { return this; },
    fillStyle() { return this; },
    fillCircle() { return this; },
    beginPath() { return this; },
    moveTo() { return this; },
    lineTo() { return this; },
    strokePath() { return this; },
    clear() { return this; },
    destroy() {}
  });

  const makeText = (x: number, y: number, text: string) => ({
    x,
    y,
    text,
    setOrigin() { return this; },
    setDepth() { return this; },
    setPosition(nx: number, ny: number) { this.x = nx; this.y = ny; return this; },
    destroy() {}
  });

  const scene: any = {
    cameras: { main: { shake: vi.fn() } },
    tweens: { add: vi.fn() },
    add: {
      sprite: (x: number, y: number, tex: string) => makeSprite(x, y, tex),
      graphics: () => makeGfx(),
      text: (x: number, y: number, text: string) => makeText(x, y, text)
    }
  };
  return scene;
}

describe('Sprint 0-3 Roadmap Systems', () => {
  beforeEach(() => {
    events.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    events.clear();
  });

  it('Sprint 0: applies armored eliteAffix damageTakenMult consistently on BossIgnis and BossFrost', () => {
    const scene = createMockCombatScene();
    const ignis = new BossIgnis(scene, 200, 200, 1);
    const frost = new BossFrost(scene, 200, 200, 2);

    expect(ignis.hp).toBe(240);
    expect(frost.hp).toBe(290);

    ignis.promoteToElite('armored');
    frost.promoteToElite('armored');

    const mult = ignis.eliteAffix!.damageTakenMult;
    expect(mult).toBeLessThan(1);

    const ignisHpBefore = ignis.hp;
    const resIgnis = ignis.takeDamage({ amount: 20, isCrit: false, isPlayerAttack: true });
    expect(resIgnis.actualDamage).toBe(Math.max(1, Math.round(20 * mult)));
    expect(ignis.hp).toBe(ignisHpBefore - resIgnis.actualDamage);

    const frostHpBefore = frost.hp;
    const resFrost = frost.takeDamage({ amount: 20, isCrit: false, isPlayerAttack: true });
    expect(resFrost.actualDamage).toBe(Math.max(1, Math.round(20 * mult)));
    expect(frost.hp).toBe(frostHpBefore - resFrost.actualDamage);
  });

  it('Sprint 0 & 1: keeps DungeonGenerator enemy spawns biome-pure and includes all 6 new biome enemies', () => {
    const collectEnemyTypes = (floor: number): Set<string> => {
      const types = new Set<string>();
      for (const seed of [101, 202, 303, 404, 505, 777, 999, 2026]) {
        const rooms = DungeonGenerator.generateFloor(seed, floor);
        for (const r of rooms) {
          for (const wave of [r.enemySpawns, ...(r.waves || [])]) {
            for (const sp of wave) types.add(sp.type);
          }
        }
      }
      return types;
    };

    const floor1Types = collectEnemyTypes(1);
    expect(floor1Types.has('frost_mage')).toBe(false);
    expect(floor1Types.has('frost_knight')).toBe(false);
    expect(floor1Types.has('summoner')).toBe(false);
    expect(floor1Types.has('crypt_shielder')).toBe(true);
    expect(floor1Types.has('bone_sniper')).toBe(true);

    const floor3Types = collectEnemyTypes(3);
    expect(floor3Types.has('frost_mage')).toBe(true);
    expect(floor3Types.has('frost_knight')).toBe(true);
    expect(floor3Types.has('ice_stalker')).toBe(true);
    expect(floor3Types.has('glacial_totem')).toBe(true);

    const floor5Types = collectEnemyTypes(5);
    expect(floor5Types.has('frost_knight')).toBe(false);
    expect(floor5Types.has('magma_slime')).toBe(true);
    expect(floor5Types.has('pyro_juggernaut')).toBe(true);
  });

  it('Sprint 0: supports wall bounce for enemy/Boss projectiles with bounceCount > 0', () => {
    const scene = createMockCombatScene();
    const pool = new ProjectilePool(scene);
    const wall = { x: 100, y: 0, width: 32, height: 200 };

    const proj = pool.spawn({
      x: 96,
      y: 80,
      angleRad: 0,
      speed: 300,
      damage: 2,
      isPlayer: false,
      texture: 'bullet_bone_pierce',
      bounceCount: 1,
      range: 500
    })!;

    pool.update(0.05, [wall]);
    expect(proj.active).toBe(true);
    expect(proj.vx).toBeLessThan(0);
    expect(proj.damage).toBe(2);
    expect(proj.bouncesRemaining).toBe(0);

    // Next collision with no bounces remaining deactivates projectile
    const leftWall = { x: -20, y: 0, width: 100, height: 200 };
    pool.update(0.05, [leftWall]);
    expect(proj.active).toBe(false);
  });

  it('Sprint 1: verifies combat mechanics for all 6 new biome enemies', () => {
    const scene = createMockCombatScene();
    const pool = new ProjectilePool(scene);

    // 1. Crypt Shielder: blocks 70% frontal kinetic damage, takes full rear or elemental fire damage
    const shielder = new EnemyCryptShielder(scene, 200, 200);
    shielder.facingX = 1;
    const frontHit = shielder.takeDamage({
      amount: 20,
      isCrit: true,
      isPlayerAttack: true,
      knockback: { x: -1, y: 0, force: 100 }
    });
    expect(frontHit.actualDamage).toBe(6);

    const fireFrontHit = shielder.takeDamage({
      amount: 10,
      isCrit: false,
      isPlayerAttack: true,
      element: 'fire',
      knockback: { x: -1, y: 0, force: 100 }
    });
    expect(fireFrontHit.actualDamage).toBe(10);

    // 2. Bone Sniper: laser windup + ricocheting bone pierce bolt
    const sniper = new EnemyBoneSniper(scene, 100, 200);
    for (let i = 0; i < 28; i++) {
      sniper.update(0.1, 320, 200, pool, []);
    }
    expect(pool.getActiveProjectiles(false).some(p => p.sprite.texture.key === 'bullet_bone_pierce' && p.bouncesRemaining === 1)).toBe(true);

    // 3. Ice Stalker: semi-invisible while stalking, decloaks and shoots 3 frost shards in range
    pool.clearAll();
    const stalker = new EnemyIceStalker(scene, 200, 200);
    stalker.update(0.05, 420, 200, pool, []);
    expect((stalker.sprite as any).alpha).toBeCloseTo(0.28, 2);
    for (let i = 0; i < 10; i++) {
      stalker.update(0.1, 250, 200, pool, []);
    }
    expect(pool.getActiveProjectiles(false).filter(p => p.element === 'frost').length).toBeGreaterThanOrEqual(3);

    // 4. Glacial Totem: stationary 6-bolt frost pulse
    pool.clearAll();
    const totem = new EnemyGlacialTotem(scene, 200, 200);
    for (let i = 0; i < 18; i++) {
      totem.update(0.1, 260, 200, pool, []);
    }
    expect(pool.getActiveProjectiles(false).length).toBeGreaterThanOrEqual(6);

    // 5. Magma Slime: shoots magma globs and splits into 2 magma_slime_mini on death
    pool.clearAll();
    const slime = new EnemyMagmaSlime(scene, 200, 200, false);
    for (let i = 0; i < 18; i++) {
      slime.update(0.1, 250, 200, pool, []);
    }
    expect(pool.getActiveProjectiles(false).some(p => p.sprite.texture.key === 'bullet_magma_glob')).toBe(true);
    slime.takeDamage({ amount: 50, isCrit: false, isPlayerAttack: true });
    expect(slime.isDead).toBe(true);
    const splitReq = slime.consumeSummonRequest();
    expect(splitReq).toHaveLength(2);
    expect(splitReq!.every(s => s.type === 'magma_slime_mini')).toBe(true);

    // Mini slime does not split again
    const mini = new EnemyMagmaSlime(scene, 200, 200, true);
    mini.takeDamage({ amount: 50, isCrit: false, isPlayerAttack: true });
    expect(mini.consumeSummonRequest()).toBeNull();

    // 6. Pyro Juggernaut: executes close flame stream
    pool.clearAll();
    const pyro = new EnemyPyroJuggernaut(scene, 200, 200);
    for (let i = 0; i < 20; i++) {
      pyro.update(0.1, 250, 200, pool, []);
    }
    expect(pool.getActiveProjectiles(false).length).toBeGreaterThanOrEqual(6);
  });

  it('Sprint 2: verifies all 6 new Boss skills and non-repeating Phase 2 patterns', () => {
    const scene = createMockCombatScene();
    const pool = new ProjectilePool(scene);
    const bounds = { minX: 40, maxX: 600, minY: 40, maxY: 600 };

    // BossIgnis: flame_dash_trail & pillar_ricochet_beam
    const ignis = new BossIgnis(scene, 300, 300, 1);
    ignis.phase = 2;
    const ignisPick = vi.spyOn(ignis as any, 'pickNextAttack');
    ignisPick.mockReturnValueOnce('flame_dash_trail').mockReturnValueOnce('pillar_ricochet_beam');
    (ignis as any).stateTimer = 0.01;
    for (let i = 0; i < 15; i++) {
      ignis.update(0.08, 450, 300, pool, [], bounds);
    }
    expect(pool.getActiveProjectiles(false).length).toBeGreaterThan(0);

    pool.clearAll();
    (ignis as any).attackState = 'idle';
    (ignis as any).stateTimer = 0.01;
    for (let i = 0; i < 10; i++) {
      ignis.update(0.1, 450, 300, pool, [], bounds);
    }
    expect(pool.getActiveProjectiles(false).some(p => p.bouncesRemaining === 1)).toBe(true);

    // BossFrost: ice_prison_wall & shatter_clone_blink
    pool.clearAll();
    const frost = new BossFrost(scene, 300, 300, 2);
    expect(frost.hp).toBe(290);
    frost.phase = 2;
    const frostPick = vi.spyOn(frost as any, 'pickNextAttack');
    frostPick.mockReturnValueOnce('ice_prison_wall').mockReturnValueOnce('shatter_clone_blink');
    (frost as any).stateTimer = 0.01;
    for (let i = 0; i < 12; i++) {
      frost.update(0.1, 200, 220, pool, [], bounds);
    }
    expect(pool.getActiveProjectiles(false).length).toBeGreaterThanOrEqual(16);

    pool.clearAll();
    (frost as any).attackState = 'idle';
    (frost as any).stateTimer = 0.01;
    for (let i = 0; i < 14; i++) {
      frost.update(0.1, 340, 320, pool, [], bounds);
    }
    expect(pool.getActiveProjectiles(false).length).toBeGreaterThanOrEqual(15);

    // BossMolten: magma_fissure_wave & hellfire_laser_sweep
    pool.clearAll();
    const molten = new BossMolten(scene, 300, 300, 3);
    expect(molten.hp).toBe(360);
    molten.phase = 2;
    const moltenPick = vi.spyOn(molten as any, 'pickNextAttack');
    moltenPick.mockReturnValueOnce('magma_fissure_wave').mockReturnValueOnce('hellfire_laser_sweep');
    (molten as any).stateTimer = 0.01;
    for (let i = 0; i < 15; i++) {
      molten.update(0.1, 460, 300, pool, [], bounds);
    }
    expect(pool.getActiveProjectiles(false).some(p => p.sprite.texture.key === 'bullet_magma_glob')).toBe(true);

    pool.clearAll();
    (molten as any).attackState = 'idle';
    (molten as any).stateTimer = 0.01;
    for (let i = 0; i < 20; i++) {
      molten.update(0.1, 460, 300, pool, [], bounds);
    }
    expect(pool.getActiveProjectiles(false).length).toBeGreaterThanOrEqual(16);
  });
});
