import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {}
}));

vi.mock('../src/core/AudioSystem', () => ({
  audio: {
    init: vi.fn(),
    resume: vi.fn(),
    playPickup: vi.fn(),
    playGemReward: vi.fn(),
    playBossAlert: vi.fn()
  }
}));

vi.mock('../src/core/MetaProgression', () => ({
  META_UPGRADE_IDS: ['max_hp', 'max_armor', 'start_gold', 'base_damage', 'crit_chance'],
  META_UPGRADES: {
    max_hp: { nameVi: 'HP', descVi: '+1 HP', maxLevel: 3 },
    max_armor: { nameVi: 'Giáp', descVi: '+1 Giáp', maxLevel: 3 },
    start_gold: { nameVi: 'Vàng', descVi: '+10 Vàng', maxLevel: 3 },
    base_damage: { nameVi: 'Sát Thương', descVi: '+1 ST', maxLevel: 3 },
    crit_chance: { nameVi: 'Chí Mạng', descVi: '+3% Crit', maxLevel: 3 }
  },
  loadMetaState: () => ({
    gems: 50,
    victories: 1,
    bestFloorCode: '2-2',
    upgrades: {}
  }),
  getNextUpgradeCost: () => 20,
  purchaseMetaUpgrade: () => false
}));

import {
  TitleScreen,
  wrapHeroIndex,
  getCarouselOffset,
  computeCarouselSlotLayout
} from '../src/ui/TitleScreen';
import { HERO_LIST } from '../src/data/heroes';

function createFakeTitleScene() {
  const keyListeners: Map<string, Set<Function>> = new Map();
  const makeDisplayObj = (extra: Record<string, any> = {}) => {
    const obj: any = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      visible: true,
      depth: 0,
      setPosition(nx: number, ny: number) { this.x = nx; this.y = ny; return this; },
      setScale(sx: number, sy?: number) { this.scaleX = sx; this.scaleY = sy ?? sx; return this; },
      setAlpha(a: number) { this.alpha = a; return this; },
      setVisible(v: boolean) { this.visible = v; return this; },
      setDepth(d: number) { this.depth = d; return this; },
      setScrollFactor() { return this; },
      setOrigin() { return this; },
      setText(t: string) { this.text = t; return this; },
      setColor(c: string) { this.color = c; return this; },
      setInteractive() { return this; },
      clear() { return this; },
      fillStyle() { return this; },
      fillRect() { return this; },
      fillRoundedRect() { return this; },
      fillCircle() { return this; },
      lineStyle() { return this; },
      strokeRoundedRect() { return this; },
      strokeCircle() { return this; },
      on() { return this; },
      destroy() {},
      ...extra
    };
    return obj;
  };

  const scene: any = {
    input: {
      keyboard: {
        on: (evt: string, cb: Function) => {
          if (!keyListeners.has(evt)) keyListeners.set(evt, new Set());
          keyListeners.get(evt)!.add(cb);
        },
        off: (evt: string, cb: Function) => {
          keyListeners.get(evt)?.delete(cb);
        }
      }
    },
    tweens: {
      killTweensOf: vi.fn(),
      add: (cfg: any) => {
        if (cfg.targets) {
          if (cfg.x !== undefined) cfg.targets.x = cfg.x;
          if (cfg.y !== undefined) cfg.targets.y = cfg.y;
          if (cfg.scaleX !== undefined) cfg.targets.scaleX = cfg.scaleX;
          if (cfg.scaleY !== undefined) cfg.targets.scaleY = cfg.scaleY;
          if (cfg.alpha !== undefined) cfg.targets.alpha = cfg.alpha;
        }
        cfg.onComplete?.();
      }
    },
    add: {
      container: (x: number, y: number) => {
        const children: any[] = [];
        const c: any = makeDisplayObj({
          x,
          y,
          children,
          add: (item: any) => {
            children.push(item);
            return c;
          },
          bringToTop: (item: any) => {
            const idx = children.indexOf(item);
            if (idx >= 0) {
              children.splice(idx, 1);
              children.push(item);
            }
          },
          removeAll: () => {
            children.length = 0;
            return c;
          }
        });
        return c;
      },
      graphics: () => makeDisplayObj(),
      sprite: (x: number, y: number) => makeDisplayObj({ x, y }),
      text: (x: number, y: number, text: string) => makeDisplayObj({ x, y, text }),
      zone: (x: number, y: number) => makeDisplayObj({ x, y })
    }
  };

  return { scene, keyListeners };
}

describe('TitleScreen Horizontal Hero Carousel & Keyboard Controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps hero indices cleanly and computes symmetric carousel slot layouts', () => {
    expect(wrapHeroIndex(0, -1, 8)).toBe(7);
    expect(wrapHeroIndex(7, 1, 8)).toBe(0);
    expect(wrapHeroIndex(3, 2, 8)).toBe(5);

    expect(getCarouselOffset(0, 0, 8)).toBe(0);
    expect(getCarouselOffset(1, 0, 8)).toBe(1);
    expect(getCarouselOffset(7, 0, 8)).toBe(-1);
    expect(getCarouselOffset(6, 0, 8)).toBe(-2);
    expect(getCarouselOffset(0, 7, 8)).toBe(1);

    const center = computeCarouselSlotLayout(0);
    const right = computeCarouselSlotLayout(1);
    const left = computeCarouselSlotLayout(-1);
    const farRight = computeCarouselSlotLayout(2);
    const hidden = computeCarouselSlotLayout(3);

    expect(center.x).toBe(640);
    expect(center.scale).toBe(1);
    expect(center.alpha).toBe(1);
    expect(right.x).toBeGreaterThan(center.x);
    expect(left.x).toBeLessThan(center.x);
    expect(right.scale).toBeLessThan(center.scale);
    expect(farRight.x).toBeGreaterThan(right.x);
    expect(hidden.visible).toBe(false);
    expect(hidden.alpha).toBe(0);
  });

  it('rotates carousel with ArrowRight/ArrowLeft/A/D, switches skills with 1/2, starts with Enter, and detaches listeners on hide', () => {
    const { scene, keyListeners } = createFakeTitleScene();
    const title = new TitleScreen(scene);
    const onStart = vi.fn();

    title.show(onStart);
    expect(title.isOpen).toBe(true);
    expect(title.selectedHeroId).toBe(HERO_LIST[0].id);
    expect(keyListeners.get('keydown')?.size).toBe(1);

    // Rotate right twice -> HERO_LIST[2]
    expect(title.handleKeyDown({ code: 'ArrowRight' })).toBe(true);
    expect(title.selectedHeroId).toBe(HERO_LIST[1].id);
    expect(title.handleKeyDown({ code: 'KeyD' })).toBe(true);
    expect(title.selectedHeroId).toBe(HERO_LIST[2].id);

    // Rotate left 3 times -> wraps from 0 to last hero (index 7)
    title.handleKeyDown({ code: 'ArrowLeft' });
    title.handleKeyDown({ code: 'KeyA' });
    title.handleKeyDown({ code: 'ArrowLeft' });
    expect(title.selectedHeroId).toBe(HERO_LIST[7].id);

    // Rotate right once -> wraps back to HERO_LIST[0]
    title.handleKeyDown({ code: 'ArrowRight' });
    expect(title.selectedHeroId).toBe(HERO_LIST[0].id);

    // Switch skill variant via keyboard 2 -> 1 -> 2
    expect(title.selectedSkillVariant).toBe(1);
    title.handleKeyDown({ code: 'Digit2' });
    expect(title.selectedSkillVariant).toBe(2);

    // Move right once to HERO_LIST[1] then press Enter to launch run
    title.handleKeyDown({ code: 'ArrowRight' });
    expect(title.handleKeyDown({ code: 'Enter' })).toBe(true);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(HERO_LIST[1].id, 2, 'normal');

    // TitleScreen hides and detaches keyboard listener so Enter/Arrows won't leak into gameplay
    expect(title.isOpen).toBe(false);
    expect(keyListeners.get('keydown')?.size).toBe(0);
    expect(title.handleKeyDown({ code: 'ArrowRight' })).toBe(false);
    expect(title.handleKeyDown({ code: 'Enter' })).toBe(false);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
