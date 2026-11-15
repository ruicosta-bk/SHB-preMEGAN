import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {}
}));

vi.mock('../core/AudioSystem', () => {
  let vol = 0.6;
  let muted = false;
  return {
    audio: {
      getVolume: () => vol,
      setVolume: (v: number) => { vol = v; },
      getIsMuted: () => muted,
      toggleMute: () => {
        muted = !muted;
        return muted;
      },
      playPickup: vi.fn()
    }
  };
});

import { PauseModal } from '../src/ui/PauseModal';

interface CreatedGraphics {
  kind: 'graphics';
  x: number;
  y: number;
  rects: Array<{ x: number; y: number; w: number; h: number }>;
  setPosition: (x: number, y: number) => any;
  fillStyle: () => any;
  fillRect: () => any;
  fillRoundedRect: (x: number, y: number, w: number, h: number) => any;
  lineStyle: () => any;
  strokeRoundedRect: () => any;
}

function createFakePauseModalScene() {
  const panels: Array<{ x: number; y: number; children: any[] }> = [];

  const scene: any = {
    add: {
      container: (x: number, y: number) => {
        const children: any[] = [];
        const c = {
          x,
          y,
          children,
          add: (item: any) => {
            children.push(item);
            return c;
          },
          setDepth: () => c,
          setScrollFactor: () => c,
          setVisible: () => c,
          removeAll: () => {
            children.length = 0;
            return c;
          },
          destroy: () => {}
        };
        if (x === 640 && y === 360) {
          panels.push(c);
        }
        return c;
      },
      graphics: (): CreatedGraphics => {
        const g: CreatedGraphics = {
          kind: 'graphics',
          x: 0,
          y: 0,
          rects: [],
          setPosition(nx: number, ny: number) {
            this.x = nx;
            this.y = ny;
            return this;
          },
          fillStyle() { return this; },
          fillRect() { return this; },
          fillRoundedRect(rx: number, ry: number, w: number, h: number) {
            this.rects.push({ x: rx, y: ry, w, h });
            return this;
          },
          lineStyle() { return this; },
          strokeRoundedRect() { return this; }
        };
        return g;
      },
      text: (x: number, y: number, label: string) => {
        let current = label;
        return {
          kind: 'text',
          x,
          y,
          get text() { return current; },
          setText: (next: string) => { current = next; },
          setOrigin() { return this; }
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
          setInteractive() { return this; },
          on: (evt: string, cb: Function) => listeners.set(evt, cb),
          trigger: (evt: string) => listeners.get(evt)?.()
        };
      }
    }
  };

  return { scene, panels };
}

describe('PauseModal Button Alignment (QA-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('positions every button background at its label and hit zone coordinates', () => {
    const { scene, panels } = createFakePauseModalScene();
    const modal = new PauseModal(scene);
    const onResume = vi.fn();
    const onRestart = vi.fn();

    modal.show(onResume, onRestart);
    expect(modal.isOpen).toBe(true);
    expect(panels.length).toBe(1);

    const panelChildren = panels[0].children;
    // Skip panel backdrop bg (first child at 0,0); collect each button's [bg, txt, zone] triplet
    const zones = panelChildren.filter(item => item.kind === 'zone');
    expect(zones.length).toBe(5);

    const expectedButtons = [
      { label: '-', x: -90, y: 95, w: 60, h: 30 },
      { label: 'TẮT ÂM', x: 0, y: 95, w: 100, h: 30 },
      { label: '+', x: 90, y: 95, w: 60, h: 30 },
      { label: 'TIẾP TỤC CHƠI', x: 0, y: 145, w: 200, h: 36 },
      { label: 'CHƠI LẠI TỪ ĐẦU', x: 0, y: 190, w: 200, h: 36 }
    ];

    expectedButtons.forEach((expected) => {
      const zoneIdx = panelChildren.findIndex(
        item => item.kind === 'zone' && item.x === expected.x && item.y === expected.y
      );
      expect(zoneIdx).toBeGreaterThanOrEqual(2);

      const bg = panelChildren[zoneIdx - 2];
      const txt = panelChildren[zoneIdx - 1];
      const zone = panelChildren[zoneIdx];

      expect(bg.kind).toBe('graphics');
      expect(txt.kind).toBe('text');
      expect(txt.text).toBe(expected.label);

      // Regression guard: bg must NOT stay at (0, 0); bg, txt, and zone must all share (x, y)
      expect(bg.x).toBe(expected.x);
      expect(bg.y).toBe(expected.y);
      expect(txt.x).toBe(expected.x);
      expect(txt.y).toBe(expected.y);
      expect(zone.x).toBe(expected.x);
      expect(zone.y).toBe(expected.y);
      expect(zone.w).toBe(expected.w);
      expect(zone.h).toBe(expected.h);
      expect(bg.rects[0]).toEqual({
        x: -expected.w / 2,
        y: -expected.h / 2,
        w: expected.w,
        h: expected.h
      });
    });

    // Trigger Resume and Restart zones to verify button actions still fire cleanly
    const resumeZone = zones[3];
    resumeZone.trigger('pointerdown');
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(modal.isOpen).toBe(false);

    modal.show(onResume, onRestart);
    const restartZone = panels[1].children.filter(item => item.kind === 'zone')[4];
    restartZone.trigger('pointerdown');
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(modal.isOpen).toBe(false);
  });
});
