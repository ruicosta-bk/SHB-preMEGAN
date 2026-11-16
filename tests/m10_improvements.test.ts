import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    BlendModes: { ADD: 1, NORMAL: 0 },
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
      Linear: (p0: number, p1: number, t: number) => p0 + (p1 - p0) * t,
      DegToRad: (deg: number) => (deg * Math.PI) / 180,
      Angle: {
        Wrap: (angle: number) => {
          let a = angle;
          while (a > Math.PI) a -= Math.PI * 2;
          while (a < -Math.PI) a += Math.PI * 2;
          return a;
        }
      }
    },
    Input: {
      Keyboard: {
        JustDown: (key: { _justDown?: boolean } | undefined) => {
          if (!key?._justDown) return false;
          key._justDown = false;
          return true;
        }
      }
    }
  }
}));

import { WEAPONS } from '../src/data/weapons';
import { WEAPON_CORES } from '../src/data/weaponCores';
import { HEROES, getHeroSkillMeta } from '../src/data/heroes';
import { UPGRADES } from '../src/data/upgrades';
import {
  generateWeaponAndBarrelTextures,
  spawnMeleeSlashTrail
} from '../src/presentation/textures/WeaponSlashTextures';
import { HazardZoneManager } from '../src/combat/HazardZoneManager';
import { InteractiveProps, resolveCombatExplosion } from '../src/world/InteractiveProps';
import { PlayerController } from '../src/player/PlayerController';
import { PauseModal } from '../src/ui/PauseModal';
import { CharacterInspectModal, PlayerInspectSnapshot } from '../src/ui/CharacterInspectModal';
import { DungeonGenerator } from '../src/world/DungeonGenerator';
import { RoomManager } from '../src/world/RoomManager';
import { events } from '../src/core/EventBus';

function createMockSprite(x: number = 0, y: number = 0, texture: string = 'mock') {
  const listeners = new Map<string, Function[]>();
  return {
    x,
    y,
    texture: { key: texture },
    active: true,
    visible: true,
    rotation: 0,
    alpha: 1,
    depth: 0,
    scaleX: 1,
    scaleY: 1,
    flipX: false,
    flipY: false,
    tint: undefined as number | undefined,
    blendMode: 0,
    setPosition(nx: number, ny: number) {
      this.x = nx;
      this.y = ny;
      return this;
    },
    setTexture(key: string) {
      this.texture = { key };
      return this;
    },
    setDepth(d: number) {
      this.depth = d;
      return this;
    },
    setRotation(r: number) {
      this.rotation = r;
      return this;
    },
    setScale(sx: number, sy: number = sx) {
      this.scaleX = sx;
      this.scaleY = sy;
      return this;
    },
    setAlpha(a: number) {
      this.alpha = a;
      return this;
    },
    setTint(t: number) {
      this.tint = t;
      return this;
    },
    clearTint() {
      this.tint = undefined;
      return this;
    },
    setBlendMode(mode: number) {
      this.blendMode = mode;
      return this;
    },
    setFlipX(f: boolean) {
      this.flipX = f;
      return this;
    },
    setFlipY(f: boolean) {
      this.flipY = f;
      return this;
    },
    setVisible(v: boolean) {
      this.visible = v;
      return this;
    },
    once(evt: string, cb: Function) {
      const arr = listeners.get(evt) ?? [];
      arr.push(cb);
      listeners.set(evt, arr);
      return this;
    },
    destroy() {
      this.active = false;
      for (const cb of listeners.get('destroy') ?? []) {
        cb();
      }
    }
  };
}

function createMockGraphics() {
  return {
    kind: 'graphics',
    x: 0,
    y: 0,
    depth: 0,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    destroyed: false,
    rects: [] as Array<{ x: number; y: number; w: number; h: number }>,
    setPosition(nx: number, ny: number) {
      this.x = nx;
      this.y = ny;
      return this;
    },
    setDepth(d: number) {
      this.depth = d;
      return this;
    },
    clear() {
      return this;
    },
    fillStyle() {
      return this;
    },
    fillRect() {
      return this;
    },
    fillRoundedRect(rx: number, ry: number, w: number, h: number) {
      this.rects.push({ x: rx, y: ry, w, h });
      return this;
    },
    fillCircle() {
      return this;
    },
    lineStyle() {
      return this;
    },
    strokeRoundedRect() {
      return this;
    },
    strokeCircle() {
      return this;
    },
    beginPath() {
      return this;
    },
    arc() {
      return this;
    },
    strokePath() {
      return this;
    },
    destroy() {
      this.destroyed = true;
    }
  };
}

function createMockScene(options: { runTweensImmediately?: boolean } = {}) {
  const sprites: ReturnType<typeof createMockSprite>[] = [];
  const graphics: ReturnType<typeof createMockGraphics>[] = [];
  const circles: Array<{ x: number; y: number; active: boolean; destroy: () => void }> = [];
  const tweens: Array<Record<string, any>> = [];
  const delayedCalls: Array<{ delay: number; cb: Function }> = [];
  const containers: Array<{ x: number; y: number; visible: boolean; children: any[] }> = [];

  const scene: any = {
    textures: { exists: () => true },
    cameras: {
      main: {
        shake: vi.fn(),
        setBounds: vi.fn()
      }
    },
    input: {
      keyboard: {
        addKey: () => ({ isDown: false, _justDown: false })
      }
    },
    time: {
      delayedCall: (delay: number, cb: Function) => {
        delayedCalls.push({ delay, cb });
        return {};
      }
    },
    tweens: {
      add: (cfg: Record<string, any>) => {
        tweens.push(cfg);
        if (options.runTweensImmediately) {
          if (typeof cfg.rotation === 'number' && cfg.targets) {
            cfg.targets.rotation = cfg.rotation;
          }
          cfg.onUpdate?.();
          cfg.onComplete?.();
        }
        return {};
      },
      killTweensOf: vi.fn()
    },
    add: {
      sprite: (x: number, y: number, texture: string) => {
        const s = createMockSprite(x, y, texture);
        sprites.push(s);
        return s;
      },
      graphics: () => {
        const g = createMockGraphics();
        graphics.push(g);
        return g;
      },
      circle: (x: number, y: number) => {
        const c = {
          x,
          y,
          active: true,
          setDepth() {
            return this;
          },
          destroy() {
            this.active = false;
          }
        };
        circles.push(c);
        return c;
      },
      rectangle: () => ({
        setOrigin() {
          return this;
        },
        setDepth() {
          return this;
        },
        destroy() {}
      }),
      renderTexture: () => ({
        setOrigin() {
          return this;
        },
        setDepth() {
          return this;
        },
        drawFrame() {},
        destroy() {}
      }),
      container: (x: number, y: number) => {
        const children: any[] = [];
        const c = {
          kind: 'container',
          x,
          y,
          visible: true,
          children,
          add: (item: any) => {
            children.push(item);
            return c;
          },
          setDepth: () => c,
          setScrollFactor: () => c,
          setVisible: (v: boolean) => {
            c.visible = v;
            return c;
          },
          removeAll: () => {
            children.length = 0;
            return c;
          },
          destroy: vi.fn()
        };
        containers.push(c);
        return c;
      },
      text: (x: number, y: number, label: string) => {
        let current = label;
        return {
          kind: 'text',
          x,
          y,
          get text() {
            return current;
          },
          setText: (next: string) => {
            current = next;
          },
          setOrigin() {
            return this;
          }
        };
      },
      zone: (x: number, y: number, w: number, h: number) => {
        const listeners = new Map<string, Function>();
        return {
          kind: 'zone',
          x,
          y,
          w,
          h,
          setInteractive() {
            return this;
          },
          on: (evt: string, cb: Function) => listeners.set(evt, cb),
          trigger: (evt: string) => listeners.get(evt)?.()
        };
      }
    }
  };

  return { scene, sprites, graphics, circles, tweens, delayedCalls, containers };
}

function createFakeEnemy(id: string, x: number, y: number, hp: number = 100) {
  const hits: Array<{ amount: number; element?: string }> = [];
  return {
    id,
    x,
    y,
    sprite: { x, y },
    hp,
    isDead: false,
    statusEffects: new Map(),
    hits,
    takeDamage(dmg: { amount: number; element?: string }) {
      if (this.isDead) {
        return { actualDamage: 0, absorbedByArmor: 0, hpDamage: 0, isDead: true, overkill: 0 };
      }
      hits.push({ amount: dmg.amount, element: dmg.element });
      this.hp -= dmg.amount;
      if (this.hp <= 0) this.isDead = true;
      return { actualDamage: dmg.amount, absorbedByArmor: 0, hpDamage: dmg.amount, isDead: this.isDead, overkill: 0 };
    }
  };
}

describe('Milestone 10 Improvements Verification Suite', () => {
  beforeEach(() => {
    events.clear();
  });

  afterEach(() => {
    events.clear();
  });

  describe('Weapons, Rebalance, Textures & Melee Slash Trail', () => {
    it('defines WEAPONS.longsword and rebalanced Tier-1/Tier-2 weapon stats', () => {
      expect(WEAPONS.longsword).toMatchObject({
        id: 'longsword',
        name: 'Longsword',
        nameVi: 'Thiên Trọng Trường Kiếm',
        category: 'melee',
        damage: 13,
        energyCost: 0,
        fireRate: 1.2,
        spreadAngle: 145,
        range: 96,
        pierceCount: 999,
        bulletTexture: 'slash_arc',
        iconTexture: 'icon_longsword',
        handTexture: 'hand_longsword'
      });

      expect(WEAPONS.shotgun).toMatchObject({ damage: 3, energyCost: 2, pellets: 5 });
      expect(WEAPONS.repeater).toMatchObject({ damage: 3, energyCost: 1, fireRate: 7.5 });
      expect(WEAPONS.penetrator).toMatchObject({ damage: 13, energyCost: 3, fireRate: 1.2 });
      expect(WEAPONS.bow).toMatchObject({ damage: 18, energyCost: 2, chargeTime: 0.7 });
      expect(WEAPONS.laser).toMatchObject({ damage: 5, energyCost: 2, fireRate: 6.0 });
      expect(WEAPONS.staff).toMatchObject({ damage: 5, energyCost: 3 });
      expect(WEAPONS.solar_laser).toMatchObject({ damage: 7, energyCost: 2, fireRate: 7.2 });
    });

    it('generates icon_longsword, hand_longsword, barrel_frost, and upgraded slash_arc textures', () => {
      const created: Array<{ key: string; w: number; h: number }> = [];
      const refreshed: string[] = [];
      const fakeCtx = new Proxy(
        {
          save: vi.fn(),
          restore: vi.fn(),
          beginPath: vi.fn(),
          closePath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          arc: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          fillRect: vi.fn(),
          strokeRect: vi.fn()
        } as unknown as CanvasRenderingContext2D,
        {
          set: (target, prop, value) => {
            (target as any)[prop] = value;
            return true;
          }
        }
      );

      generateWeaponAndBarrelTextures(
        {} as any,
        (_tm, key, w, h) => {
          created.push({ key, w, h });
          return fakeCtx;
        },
        (_tm, key) => {
          refreshed.push(key);
        }
      );

      expect(created).toEqual([
        { key: 'icon_longsword', w: 24, h: 24 },
        { key: 'hand_longsword', w: 32, h: 12 },
        { key: 'barrel_frost', w: 24, h: 28 },
        { key: 'slash_arc', w: 46, h: 58 }
      ]);
      expect(refreshed).toEqual(['icon_longsword', 'hand_longsword', 'barrel_frost', 'slash_arc']);
    });

    it('spawns 3 slash_arc afterimage layers sweeping in fixed direction (-0.85 -> +0.85) and cleans up', () => {
      for (const aimAngle of [0, Math.PI]) {
        const { scene, sprites, tweens } = createMockScene();
        spawnMeleeSlashTrail(scene, 100, 120, aimAngle, 96, 0x38bdf8);

        expect(sprites).toHaveLength(3);
        expect(tweens).toHaveLength(3);

        const expectedStartOffsets = [-0.85, -0.45, -0.05];
        const expectedEndOffsets = [0.15, 0.55, 0.85];

        sprites.forEach((spr, idx) => {
          expect(spr.texture.key).toBe('slash_arc');
          expect(spr.tint).toBe(0x38bdf8);
          expect(spr.rotation).toBeCloseTo(aimAngle + expectedStartOffsets[idx], 5);
          expect(tweens[idx].rotation).toBeCloseTo(aimAngle + expectedEndOffsets[idx], 5);
          expect(tweens[idx].rotation).toBeGreaterThan(spr.rotation);
          expect(tweens[idx].alpha).toBe(0);

          // Simulate tween mid-update and completion
          tweens[idx].targets.rotation = tweens[idx].rotation;
          tweens[idx].onUpdate();
          const expectedDist = Math.max(18, 96 * 0.48);
          expect(spr.x).toBeCloseTo(100 + Math.cos(tweens[idx].rotation) * expectedDist, 4);
          expect(spr.y).toBeCloseTo(120 + Math.sin(tweens[idx].rotation) * expectedDist, 4);

          tweens[idx].onComplete();
          expect(spr.active).toBe(false);
        });
      }

      // Fallback cleanup via time.delayedCall when tweens are absent
      const { scene: timeOnlyScene, sprites: fallbackSprites, delayedCalls } = createMockScene();
      timeOnlyScene.tweens = undefined;
      spawnMeleeSlashTrail(timeOnlyScene, 50, 50, 0.5, 65);
      expect(fallbackSprites).toHaveLength(3);
      expect(delayedCalls).toHaveLength(3);
      delayedCalls.forEach(dc => dc.cb());
      expect(fallbackSprites.every(s => !s.active)).toBe(true);
    });
  });

  describe('PlayerController M10 Mechanics', () => {
    it('sweeps melee weapon in a fixed direction and returns cleanly to rest angle (offset 0)', () => {
      const { scene, sprites } = createMockScene({ runTweensImmediately: true });
      const player = new PlayerController(scene, 200, 200, 'rogue');
      const pool: any = {
        destroyEnemyBulletsInRadius: vi.fn(() => 0),
        spawn: vi.fn()
      };

      // Locate primary weaponSprite created in constructor (depth 12; offhandWeaponSprite is depth 11)
      const weaponSprite = sprites.find(s => s.texture.key === WEAPONS.blade.handTexture && s.depth === 12)!;
      expect(weaponSprite).toBeDefined();

      // Aim left (Math.PI) and fire melee attack
      const pointer: any = {
        isDown: true,
        worldX: 100,
        worldY: 200,
        rightButtonDown: () => false,
        getDuration: () => 0
      };
      player.update(0.016, pointer, pool, [], [], []);
      const aimAngle = Math.atan2(200 - player.sprite.y, 100 - player.sprite.x);

      // Immediately after melee strike: swing starts near -1.13 rad offset
      expect(weaponSprite.rotation).toBeLessThan(aimAngle);
      expect(weaponSprite.rotation).toBeCloseTo(aimAngle - 1.13, 2);

      // Release fire and step through swing duration (0.17s) verifying monotonic sweep
      pointer.isDown = false;
      const recordedRotations: number[] = [weaponSprite.rotation];
      for (let i = 0; i < 4; i++) {
        player.update(0.05, pointer, pool, [], [], []);
        recordedRotations.push(weaponSprite.rotation);
      }

      expect(recordedRotations[1]).toBeGreaterThan(recordedRotations[0]);
      expect(recordedRotations[2]).toBeGreaterThan(recordedRotations[1]);
      // Once elapsed >= 0.17s, weaponSprite returns to exact aimAngle (swingOffset = 0)
      expect(recordedRotations[recordedRotations.length - 1]).toBeCloseTo(aimAngle, 5);

      // Wait out blade attack cooldown (1/2.2s ~ 0.455s), then test longsword swing + swapWeaponSlot reset
      for (let i = 0; i < 6; i++) {
        player.update(0.05, pointer, pool, [], [], []);
      }
      pointer.isDown = true;
      player.equipWeapon(WEAPONS.longsword);
      player.update(0.016, pointer, pool, [], [], []);
      expect(weaponSprite.texture.key).toBe(WEAPONS.longsword.handTexture);
      expect(weaponSprite.rotation).toBeLessThan(aimAngle - 0.5);
      pointer.isDown = false;
      player.swapWeaponSlot();
      player.update(0.016, pointer, pool, [], [], []);
      expect(weaponSprite.rotation).toBeCloseTo(aimAngle, 5);

      // Also verify prepareForNextFloor clears active status timers & melee swing cleanly
      player.applyHazardExposure('fire');
      player.prepareForNextFloor(300, 300);
      expect(player.sprite.rotation).toBe(0);
      expect(player.sprite.tint).toBeUndefined();

      player.destroy();
    });

    it('detaches weapon cores and preserves primary / overflows secondary core on mergeEquippedWeapons', () => {
      const { scene } = createMockScene();
      const player = new PlayerController(scene, 100, 100, 'rogue'); // starts with [blade, null]
      player.equipWeapon(WEAPONS.bow); // [blade, bow], activeSlotIndex = 1

      // Attach fire to blade (slot 0), frost to bow (slot 1)
      player.swapWeaponSlot();
      player.attachCoreToCurrentWeapon('fire');
      player.swapWeaponSlot();
      player.attachCoreToCurrentWeapon('frost');

      const swappedEvents: any[] = [];
      events.on('player:weapon-swapped', payload => swappedEvents.push(payload));

      // Detach core from blade
      const detached = player.detachWeaponCore('blade');
      expect(detached).toEqual(WEAPON_CORES.fire);
      expect(player.getWeaponCore('blade')).toBeNull();
      expect(player.detachWeaponCore('blade')).toBeNull();
      expect(swappedEvents.at(-1)?.secondaryCore).toBeNull();

      // Re-attach fire to blade and merge [blade(fire), bow(frost)] -> frost_sword(fire) + overflow frost
      player.swapWeaponSlot();
      player.attachCoreToCurrentWeapon('fire');
      const mergeRes = player.mergeEquippedWeapons();
      expect(mergeRes).not.toBeNull();
      expect(mergeRes!.first.id).toBe('blade');
      expect(mergeRes!.second.id).toBe('bow');
      expect(mergeRes!.result.id).toBe('frost_sword');
      expect(mergeRes!.overflowCore).toEqual(WEAPON_CORES.frost);

      expect(player.getWeaponCore('frost_sword')).toBe('fire');
      expect(player.getWeaponCore('blade')).toBeNull();
      expect(player.getWeaponCore('bow')).toBeNull();
      expect(player.weaponSlots).toEqual([WEAPONS.frost_sword, null]);
      expect(player.activeSlotIndex).toBe(0);

      // Single-core transfer when only secondary weapon holds a core
      const player2 = new PlayerController(scene, 100, 100, 'rogue');
      player2.equipWeapon(WEAPONS.bow);
      player2.attachCoreToCurrentWeapon('poison');
      const singleMerge = player2.mergeEquippedWeapons();
      expect(singleMerge?.result.id).toBe('frost_sword');
      expect(singleMerge?.overflowCore).toBeNull();
      expect(player2.getWeaponCore('frost_sword')).toBe('poison');

      player.destroy();
      player2.destroy();
    });

    it('applies fire/poison burn & poison DoT ticks while frost slows only with zero DoT damage', () => {
      const { scene } = createMockScene();
      const idlePointer: any = {
        isDown: false,
        worldX: 500,
        worldY: 100,
        rightButtonDown: () => false,
        getDuration: () => 0
      };
      const pool: any = { destroyEnemyBulletsInRadius: vi.fn(), spawn: vi.fn() };

      // 1. Fire exposure: 2.4s duration, 0.8s tick cadence -> 3 ticks of 1 dmg
      const firePlayer = new PlayerController(scene, 100, 100, 'alchemist');
      const fireDamaged: number[] = [];
      events.on('player:damaged', d => fireDamaged.push(d.amount));
      firePlayer.applyHazardExposure('fire');
      expect([0xf97316, 0xef4444]).toContain(firePlayer.sprite.tint);
      for (let i = 0; i < 150; i++) {
        firePlayer.update(1 / 60, idlePointer, pool, [], [], []);
      }
      expect(fireDamaged).toEqual([1, 1, 1]);
      expect(firePlayer.stats.armor).toBe(HEROES.alchemist.armor - 3);
      expect(firePlayer.sprite.tint).toBeUndefined();
      firePlayer.destroy();

      // 2. Poison exposure: 2.8s duration, 0.9s tick cadence -> 3 ticks of 1 dmg
      events.clear();
      const poisonPlayer = new PlayerController(scene, 100, 100, 'alchemist');
      const poisonDamaged: number[] = [];
      events.on('player:damaged', d => poisonDamaged.push(d.amount));
      poisonPlayer.applyHazardExposure('poison');
      expect(poisonPlayer.sprite.tint).toBe(0x4ade80);
      for (let i = 0; i < 175; i++) {
        poisonPlayer.update(1 / 60, idlePointer, pool, [], [], []);
      }
      expect(poisonDamaged).toEqual([1, 1, 1]);
      expect(poisonPlayer.stats.armor).toBe(HEROES.alchemist.armor - 3);
      expect(poisonPlayer.sprite.tint).toBeUndefined();
      poisonPlayer.destroy();

      // 3. Frost exposure: chill slow only (0.65x speed), ZERO DoT damage
      events.clear();
      const frostPlayer = new PlayerController(scene, 100, 100, 'alchemist');
      const normalPlayer = new PlayerController(scene, 100, 100, 'alchemist');
      const frostDamaged: any[] = [];
      events.on('player:damaged', d => frostDamaged.push(d));

      frostPlayer.applyHazardExposure('frost');
      expect(frostPlayer.sprite.tint).toBe(0x7dd3fc);

      // Hold move right ('d') for 0.2s and compare displacement vs normal player
      (frostPlayer as any).keys.d.isDown = true;
      (normalPlayer as any).keys.d.isDown = true;
      for (let i = 0; i < 12; i++) {
        frostPlayer.update(1 / 60, idlePointer, pool, [], [], []);
        normalPlayer.update(1 / 60, idlePointer, pool, [], [], []);
      }
      const frostDx = frostPlayer.sprite.x - 100;
      const normalDx = normalPlayer.sprite.x - 100;
      expect(frostDx / normalDx).toBeCloseTo(0.65, 2);

      // Continue updating past full 2.2s chill duration -> still 0 damage
      (frostPlayer as any).keys.d.isDown = false;
      for (let i = 0; i < 150; i++) {
        frostPlayer.update(1 / 60, idlePointer, pool, [], [], []);
      }
      expect(frostDamaged).toHaveLength(0);
      expect(frostPlayer.stats.hp).toBe(HEROES.alchemist.hp);
      expect(frostPlayer.stats.armor).toBe(HEROES.alchemist.armor);
      expect(frostPlayer.sprite.tint).toBeUndefined();

      frostPlayer.destroy();
      normalPlayer.destroy();
    });

    it('emits combat:spawn-hazard-zone on Alchemist S1 (fire) and S2 (poison + applyChill)', () => {
      const { scene } = createMockScene({ runTweensImmediately: true });
      const pool: any = { destroyEnemyBulletsInRadius: vi.fn(), spawn: vi.fn() };
      const pointer: any = {
        isDown: false,
        worldX: 260,
        worldY: 180,
        rightButtonDown: () => true,
        getDuration: () => 50
      };

      const emittedZones: any[] = [];
      const emittedExplosions: any[] = [];
      events.on('combat:spawn-hazard-zone', z => emittedZones.push(z));
      events.on('combat:explosion', e => emittedExplosions.push(e));

      const alchemistS1 = new PlayerController(scene, 100, 100, 'alchemist', undefined, 1);
      alchemistS1.update(0.016, pointer, pool, [], [], []);

      expect(emittedExplosions[0]).toEqual({ x: 260, y: 180, radius: 80, damage: 14 });
      expect(emittedZones[0]).toEqual({
        x: 260,
        y: 180,
        radius: 75,
        element: 'fire',
        duration: 4.0,
        affectsPlayer: false,
        damagePerTick: 3
      });

      const alchemistS2 = new PlayerController(scene, 100, 100, 'alchemist', undefined, 2);
      alchemistS2.update(0.016, pointer, pool, [], [], []);

      expect(emittedExplosions[1]).toEqual({ x: 260, y: 180, radius: 95, damage: 16, element: 'frost' });
      expect(emittedZones[1]).toEqual({
        x: 260,
        y: 180,
        radius: 85,
        element: 'poison',
        applyChill: true,
        duration: 4.5,
        affectsPlayer: false,
        damagePerTick: 2
      });

      alchemistS1.destroy();
      alchemistS2.destroy();
    });

    it('builds accurate PlayerInspectSnapshot in getInspectSnapshot()', () => {
      const { scene } = createMockScene();
      const player = new PlayerController(scene, 100, 100, 'wizard', undefined, 2);
      player.statueBlessing = 'sorcerer';
      player.forgeCurrentWeapon(); // +1 on staff
      player.attachCoreToCurrentWeapon('lightning');
      player.equipWeapon(WEAPONS.longsword); // swaps activeSlotIndex to 1
      player.applyUpgrade('critical_focus');

      const snap = player.getInspectSnapshot();
      const skillMeta = getHeroSkillMeta('wizard', 2);

      expect(snap).toEqual({
        heroId: 'wizard',
        heroNameVi: HEROES.wizard.nameVi,
        skillVariant: 2,
        skillNameVi: skillMeta.nameVi,
        skillCooldownSec: skillMeta.cooldown,
        skillDescVi: skillMeta.descVi,
        statueBlessing: 'sorcerer',
        weapons: [
          {
            nameVi: WEAPONS.staff.nameVi,
            forgeLevel: 1,
            coreNameVi: WEAPON_CORES.lightning.nameVi,
            coreColorHex: WEAPON_CORES.lightning.colorHex,
            isActive: false
          },
          {
            nameVi: WEAPONS.longsword.nameVi,
            forgeLevel: 0,
            coreNameVi: null,
            coreColorHex: undefined,
            isActive: true
          }
        ],
        upgrades: [
          {
            id: 'critical_focus',
            nameVi: UPGRADES.critical_focus.nameVi,
            descVi: UPGRADES.critical_focus.descriptionVi,
            stacks: 1,
            maxStacks: UPGRADES.critical_focus.maxStacks
          }
        ]
      });

      player.destroy();
    });
  });

  describe('HazardZoneManager & InteractiveProps', () => {
    it('ticks fire/poison zones on enemies, gives frost 0 DoT, exposes player when configured, and cleans up gfx', () => {
      const { scene, graphics } = createMockScene();
      const manager = new HazardZoneManager(scene);

      const enemyInFire = createFakeEnemy('eFire', 110, 100, 50);
      const enemyOutFire = createFakeEnemy('eFar', 400, 400, 50);
      const enemyInFrost = createFakeEnemy('eFrost', 300, 300, 50);
      const enemyInVenom = createFakeEnemy('eVenom', 500, 500, 50);

      const exposureCalls: string[] = [];
      const mockPlayer = {
        sprite: { x: 105, y: 100 },
        isDead: false,
        applyHazardExposure: (el: string) => exposureCalls.push(el)
      };

      // Fire zone affecting player
      manager.spawnZone({
        x: 100,
        y: 100,
        radius: 60,
        element: 'fire',
        duration: 1.1,
        affectsPlayer: true,
        damagePerTick: 3
      });

      // Frost zone (damagePerTick ignored -> forced to 0), player NOT inside
      const frostZone = manager.spawnZone({
        x: 300,
        y: 300,
        radius: 60,
        element: 'frost',
        duration: 2.0,
        affectsPlayer: true,
        damagePerTick: 99
      });
      expect(frostZone.damagePerTick).toBe(0);

      // Poison + chill zone with affectsPlayer: false
      manager.spawnZone({
        x: 500,
        y: 500,
        radius: 60,
        element: 'poison',
        applyChill: true,
        duration: 2.0,
        affectsPlayer: false,
        damagePerTick: 2
      });

      expect(manager.getActiveZones()).toHaveLength(3);
      expect(graphics).toHaveLength(3);

      // Advance 0.55s -> 1 tick fires
      manager.update(0.55, [enemyInFire, enemyOutFire, enemyInFrost, enemyInVenom] as any, mockPlayer);

      expect(enemyInFire.hits).toEqual([{ amount: 3, element: 'fire' }]);
      expect(enemyInFire.statusEffects.has('burn')).toBe(true);
      expect(enemyOutFire.hits).toHaveLength(0);

      expect(enemyInFrost.hits).toHaveLength(0);
      expect(enemyInFrost.hp).toBe(50);
      expect(enemyInFrost.statusEffects.has('freeze')).toBe(true);

      expect(enemyInVenom.hits).toEqual([{ amount: 2, element: 'poison' }]);
      expect(enemyInVenom.statusEffects.has('poison')).toBe(true);
      expect(enemyInVenom.statusEffects.has('freeze')).toBe(true);

      expect(exposureCalls).toEqual(['fire']);

      // Advance another 0.6s -> fire zone (duration 1.1s) expires and destroys its gfx
      manager.update(0.6, [enemyInFire, enemyOutFire, enemyInFrost, enemyInVenom] as any, mockPlayer);
      expect(graphics[0].destroyed).toBe(true);
      expect(manager.getActiveZones()).toHaveLength(2);

      // clearAll() destroys remaining gfx and empties active zones
      manager.clearAll();
      expect(graphics[1].destroyed).toBe(true);
      expect(graphics[2].destroyed).toBe(true);
      expect(manager.getActiveZones()).toHaveLength(0);
    });

    it('handles toxic -> poison and frost -> barrel_frost detonation and close player blast damage/status', () => {
      const { scene } = createMockScene();
      const props = new InteractiveProps(scene);
      const pool: any = { destroyEnemyBulletsInRadius: vi.fn() };
      const enemies: any[] = [];
      const emittedPayloads: any[] = [];

      events.on('combat:explosion', p => emittedPayloads.push(p));

      const toxicBarrel = props.spawnProp('toxic', 100, 100);
      const frostBarrel = props.spawnProp('frost', 400, 400);
      expect(toxicBarrel.sprite.texture.key).toBe('barrel_toxic');
      expect(frostBarrel.sprite.texture.key).toBe('barrel_frost');
      expect(frostBarrel.hp).toBe(8);

      props.detonateProp(toxicBarrel, pool, enemies);
      props.detonateProp(frostBarrel, pool, enemies);

      expect(emittedPayloads[0]).toEqual({
        x: 100,
        y: 100,
        radius: 75,
        damage: 14,
        element: 'poison',
        spawnHazardZone: true,
        hurtsPlayer: true
      });
      expect(emittedPayloads[1]).toEqual({
        x: 400,
        y: 400,
        radius: 75,
        damage: 12,
        element: 'frost',
        spawnHazardZone: true,
        hurtsPlayer: true
      });

      // resolveCombatExplosion damages & exposes close player (dist <= radius * 0.78)
      const closePlayer = {
        sprite: { x: 430, y: 400 }, // dist 30 <= 75 * 0.78 (58.5)
        isDead: false,
        takeDamage: vi.fn(),
        applyHazardExposure: vi.fn()
      };
      const farPlayer = {
        sprite: { x: 470, y: 400 }, // dist 70 > 58.5
        isDead: false,
        takeDamage: vi.fn(),
        applyHazardExposure: vi.fn()
      };
      const frostEnemy = createFakeEnemy('eFrost', 440, 400, 40);

      resolveCombatExplosion(emittedPayloads[1], [frostEnemy] as any, props, pool, undefined, closePlayer);
      expect(frostEnemy.hits).toEqual([{ amount: 12, element: 'frost' }]);
      expect(frostEnemy.statusEffects.has('freeze')).toBe(true);
      expect(closePlayer.takeDamage).toHaveBeenCalledWith({
        amount: 2,
        element: 'frost',
        isPlayerAttack: false
      });
      expect(closePlayer.applyHazardExposure).toHaveBeenCalledWith('frost');

      resolveCombatExplosion(emittedPayloads[1], [], props, pool, undefined, farPlayer);
      expect(farPlayer.takeDamage).not.toHaveBeenCalled();
      expect(farPlayer.applyHazardExposure).not.toHaveBeenCalled();
    });
  });

  describe('PauseModal & CharacterInspectModal', () => {
    it('renders active hero skill label & description in PauseModal while keeping all 5 buttons intact', () => {
      const { scene, containers } = createMockScene();
      const modal = new PauseModal(scene);
      const onResume = vi.fn();
      const onRestart = vi.fn();

      modal.show(onResume, onRestart, 'wizard', 2);
      expect(modal.isOpen).toBe(true);

      const panel = containers.find(c => c.x === 640 && c.y === 360)!;
      expect(panel).toBeDefined();

      const skillMeta = getHeroSkillMeta('wizard', 2);
      const texts = panel.children.filter(c => c.kind === 'text').map(c => c.text);
      expect(texts.some(t => t.includes(`[S2] ${skillMeta.nameVi} (${HEROES.wizard.nameVi})`))).toBe(true);
      expect(texts.some(t => t.includes(`Kỹ năng (${skillMeta.cooldown}s): ${skillMeta.descVi}`))).toBe(true);

      // Verify all 5 buttons in [bg, txt, zone] order at exact coordinates
      const expectedButtons = [
        { label: '-', x: -90, y: 95, w: 60, h: 30 },
        { label: 'TẮT ÂM', x: 0, y: 95, w: 100, h: 30 },
        { label: '+', x: 90, y: 95, w: 60, h: 30 },
        { label: 'TIẾP TỤC CHƠI', x: 0, y: 145, w: 200, h: 36 },
        { label: 'CHƠI LẠI TỪ ĐẦU', x: 0, y: 190, w: 200, h: 36 }
      ];
      const zones = panel.children.filter(c => c.kind === 'zone');
      expect(zones).toHaveLength(5);

      expectedButtons.forEach((btn, idx) => {
        const zIdx = panel.children.indexOf(zones[idx]);
        const bg = panel.children[zIdx - 2];
        const txt = panel.children[zIdx - 1];
        const zone = panel.children[zIdx];

        expect(bg.kind).toBe('graphics');
        expect(bg.x).toBe(btn.x);
        expect(bg.y).toBe(btn.y);
        expect(txt.kind).toBe('text');
        expect(txt.text).toBe(btn.label);
        expect(zone.x).toBe(btn.x);
        expect(zone.y).toBe(btn.y);
        expect(zone.w).toBe(btn.w);
        expect(zone.h).toBe(btn.h);
      });

      zones[3].trigger('pointerdown');
      expect(onResume).toHaveBeenCalledTimes(1);
      expect(modal.isOpen).toBe(false);
    });

    it('displays hero skill, statue blessing, weapons with forge/core, upgrades, and closes cleanly in CharacterInspectModal', () => {
      const { scene, containers } = createMockScene();
      const modal = new CharacterInspectModal(scene);
      const onClose = vi.fn();

      const snapshot: PlayerInspectSnapshot = {
        heroId: 'alchemist',
        heroNameVi: HEROES.alchemist.nameVi,
        skillVariant: 2,
        skillNameVi: HEROES.alchemist.skill2NameVi,
        skillCooldownSec: HEROES.alchemist.skill2Cooldown,
        skillDescVi: HEROES.alchemist.skill2DescVi,
        statueBlessing: 'knight',
        weapons: [
          {
            nameVi: WEAPONS.longsword.nameVi,
            forgeLevel: 2,
            coreNameVi: WEAPON_CORES.fire.nameVi,
            coreColorHex: WEAPON_CORES.fire.colorHex,
            isActive: true
          },
          {
            nameVi: WEAPONS.pistol.nameVi,
            forgeLevel: 0,
            coreNameVi: null,
            isActive: false
          }
        ],
        upgrades: [
          {
            id: 'blade_mastery',
            nameVi: UPGRADES.blade_mastery.nameVi,
            descVi: UPGRADES.blade_mastery.descriptionVi,
            stacks: 1,
            maxStacks: UPGRADES.blade_mastery.maxStacks
          }
        ]
      };

      modal.show(snapshot, onClose);
      expect(modal.isOpen).toBe(true);

      const panel = containers.find(c => c.x === 640 && c.y === 360)!;
      const texts = panel.children.filter(c => c.kind === 'text').map(c => c.text);

      expect(texts.some(t => t.includes(HEROES.alchemist.nameVi))).toBe(true);
      expect(texts.some(t => t.includes(`Kỹ năng [S2]: ${HEROES.alchemist.skill2NameVi}`))).toBe(true);
      expect(texts.some(t => t.includes(HEROES.alchemist.skill2DescVi))).toBe(true);
      expect(texts.some(t => t.includes('Phước Lành Kỵ Sĩ'))).toBe(true);
      expect(texts.some(t => t.includes(`${WEAPONS.longsword.nameVi} (+2)`))).toBe(true);
      expect(texts.some(t => t.includes(`Lõi: ${WEAPON_CORES.fire.nameVi}`))).toBe(true);
      expect(texts.some(t => t.includes('Lõi nguyên tố: Chưa gắn'))).toBe(true);
      expect(texts.some(t => t.includes(UPGRADES.blade_mastery.nameVi))).toBe(true);
      expect(texts.some(t => t.includes('Lv.1/1'))).toBe(true);
      expect(texts.some(t => t.includes('ĐÓNG [ESC / TAB]'))).toBe(true);

      const closeZone = panel.children.find(c => c.kind === 'zone');
      closeZone.trigger('pointerdown');
      expect(modal.isOpen).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(1);

      modal.destroy();
    });
  });

  describe('DungeonGenerator Compact Scale & RoomManager Biome Barrels / Drops', () => {
    it('uses compact 19-tile pitch and 13x11..15x13 combat rooms across seeds without overlap', () => {
      expect(DungeonGenerator.CELL_PITCH_TILES).toBe(19);
      expect(DungeonGenerator.CELL_PITCH_PX).toBe(608);

      for (const seed of [101, 777, 1337, 2026]) {
        for (const floor of [1, 3, 6]) {
          const rooms = DungeonGenerator.generateFloor(seed, floor);
          for (const room of rooms) {
            if (room.type === 'start' || room.type === 'treasure') {
              expect(room.layout.width).toBe(11);
              expect(room.layout.height).toBe(9);
            } else if (room.type === 'rest') {
              expect(room.layout.width).toBe(13);
              expect(room.layout.height).toBe(11);
            } else if (room.type === 'boss') {
              expect(room.layout.width).toBe(15);
              expect(room.layout.height).toBe(13);
            } else if (room.type === 'combat') {
              expect(room.layout.width).toBeGreaterThanOrEqual(13);
              expect(room.layout.width).toBeLessThanOrEqual(15);
              expect(room.layout.height).toBeGreaterThanOrEqual(11);
              expect(room.layout.height).toBeLessThanOrEqual(13);
            }
          }
        }
      }
    });

    it('spawns biome-specific barrels in combat rooms and reduced enemy coin drops (isElite ? 2 : 0|1)', () => {
      const checkBiomeBarrels = (floor: number, expectedTypes: string[]) => {
        const { scene } = createMockScene();
        const rooms = DungeonGenerator.generateFloor(1337, floor, 'normal');
        const rm = new RoomManager(scene, rooms, [], floor, 'normal');
        rm.buildEntireFloor();

        const combatCount = rooms.filter(r => r.type === 'combat').length;
        const barrels = rm.interactiveProps.props.filter(p => p.type !== 'crate');
        expect(barrels).toHaveLength(combatCount * expectedTypes.length);
        for (let i = 0; i < combatCount; i++) {
          const slice = barrels.slice(i * expectedTypes.length, (i + 1) * expectedTypes.length).map(b => b.type);
          expect(slice).toEqual(expectedTypes);
        }
        rm.clearCurrentRoomVisuals();
      };

      checkBiomeBarrels(1, ['explosive', 'toxic']); // stone_crypt
      checkBiomeBarrels(3, ['frost', 'toxic']); // frost_cavern
      checkBiomeBarrels(5, ['explosive', 'explosive', 'toxic']); // molten_core

      // Check reduced coin drops: normal enemy -> 0 or 1, elite -> 2
      const { scene } = createMockScene();
      const rooms = DungeonGenerator.generateFloor(1337, 1);
      const rm = new RoomManager(scene, rooms, [], 1, 'normal');

      const countCoins = (isElite: boolean, seq: number[]) => {
        rm.pickups = [];
        let idx = 0;
        rm.rollEnemyDrop(100, 100, isElite, 0, () => seq[idx++ % seq.length]);
        return rm.pickups.filter(p => p.type === 'coin').length;
      };

      // Normal: 0.4 (< 0.55) -> 1 coin; 0.7 (>= 0.55) -> 0 coins
      expect(countCoins(false, [0.4, 0.5, 0.5, 0.99, 0.99])).toBe(1);
      expect(countCoins(false, [0.7, 0.99, 0.99])).toBe(0);

      // Elite: always 2 coins
      expect(countCoins(true, [0.5, 0.5, 0.5, 0.5, 0.99, 0.99])).toBe(2);
      rm.clearCurrentRoomVisuals();
    });
  });
});
