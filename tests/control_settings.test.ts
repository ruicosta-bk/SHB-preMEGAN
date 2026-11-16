import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Input: {
      Keyboard: {
        KeyCodes: {
          W: 87, A: 65, S: 83, D: 68, UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39,
          SPACE: 32, Q: 81, E: 69, F: 70, J: 74, K: 75, ESC: 27
        },
        JustDown: (key: any) => Boolean(key?._justDown)
      }
    },
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
      Linear: (a: number, b: number, t: number) => a + (b - a) * t,
      DegToRad: (deg: number) => (deg * Math.PI) / 180
    }
  }
}));

import {
  controlSettings,
  DEFAULT_CONTROL_BINDINGS,
  DEFAULT_AIM_MODE,
  formatKeyCode,
  codeToPhaserKeyCode
} from '../src/core/ControlSettings';
import { SettingsModal } from '../src/ui/SettingsModal';
import { PlayerController } from '../src/player/PlayerController';
import { ProjectilePool } from '../src/combat/ProjectilePool';
import { events } from '../src/core/EventBus';

function createMockUiScene() {
  const texts: any[] = [];
  const zones: any[] = [];
  let registeredKeydown: ((e: any) => void) | null = null;

  const makeContainer = (x: number, y: number) => {
    const children: any[] = [];
    const c: any = {
      x,
      y,
      visible: true,
      children,
      add(item: any) {
        if (Array.isArray(item)) children.push(...item);
        else children.push(item);
        return c;
      },
      setDepth() { return c; },
      setScrollFactor() { return c; },
      setVisible(v: boolean) { c.visible = v; return c; },
      removeAll() { children.length = 0; return c; },
      destroy() {}
    };
    return c;
  };

  const makeGfx = () => ({
    setPosition() { return this; },
    fillStyle() { return this; },
    fillRect() { return this; },
    fillRoundedRect() { return this; },
    fillCircle() { return this; },
    lineStyle() { return this; },
    strokeRoundedRect() { return this; },
    strokeCircle() { return this; },
    beginPath() { return this; },
    moveTo() { return this; },
    lineTo() { return this; },
    strokePath() { return this; },
    clear() { return this; },
    setDepth() { return this; },
    destroy() {}
  });

  const makeSprite = (x: number, y: number, tex: string) => ({
    x, y, visible: true, texture: { key: tex }, active: true,
    setDepth() { return this; },
    setVisible(v: boolean) { this.visible = v; return this; },
    setScale() { return this; },
    setOrigin() { return this; },
    setPosition(nx: number, ny: number) { this.x = nx; this.y = ny; return this; },
    setRotation() { return this; },
    setFlipX() { return this; },
    setFlipY() { return this; },
    setTint() { return this; },
    clearTint() { return this; },
    setTexture(k: string) { this.texture.key = k; return this; },
    destroy() { this.active = false; }
  });

  const keyStates = new Map<number, { isDown: boolean; _justDown?: boolean }>();

  const scene: any = {
    input: {
      keyboard: {
        addKey: (code: number) => {
          if (!keyStates.has(code)) {
            keyStates.set(code, { isDown: false });
          }
          return keyStates.get(code)!;
        },
        on: (_evt: string, cb: (e: any) => void) => { registeredKeydown = cb; },
        off: () => { registeredKeydown = null; }
      }
    },
    tweens: { add: vi.fn() },
    cameras: { main: { shake: vi.fn() } },
    add: {
      container: makeContainer,
      graphics: makeGfx,
      sprite: makeSprite,
      text: (x: number, y: number, label: string) => {
        const obj: any = {
          x, y, text: label,
          setText(next: string) { obj.text = next; return obj; },
          setColor() { return obj; },
          setOrigin() { return obj; },
          destroy() {}
        };
        texts.push(obj);
        return obj;
      },
      zone: (x: number, y: number, w: number, h: number) => {
        const listeners = new Map<string, Function>();
        const z: any = {
          x, y, w, h,
          setInteractive() { return z; },
          on(evt: string, cb: Function) { listeners.set(evt, cb); return z; },
          trigger(evt: string) { listeners.get(evt)?.(); }
        };
        zones.push(z);
        return z;
      }
    }
  };

  return {
    scene,
    texts,
    zones,
    keyStates,
    dispatchKeyDown: (e: any) => registeredKeydown?.(e)
  };
}

describe('ControlSettings, Key Rebinding & Touchpad Fire/Aim Modes', () => {
  beforeEach(() => {
    events.clear();
    controlSettings.resetToDefaults();
  });

  afterEach(() => {
    controlSettings.resetToDefaults();
    events.clear();
  });

  it('provides sensible defaults, key label formatting, key swap on conflict, and aim mode cycling', () => {
    const initial = controlSettings.getSettings();
    expect(initial.bindings).toEqual(DEFAULT_CONTROL_BINDINGS);
    expect(initial.aimMode).toBe(DEFAULT_AIM_MODE);
    expect(formatKeyCode('KeyW')).toBe('W');
    expect(formatKeyCode('Space')).toBe('SPACE');
    expect(formatKeyCode('ArrowUp')).toBe('↑');
    expect(codeToPhaserKeyCode('KeyJ')).toBe(74);

    // Assigning an unused key updates cleanly & emits settings:controls-updated
    let emitted = 0;
    events.on('settings:controls-updated', () => { emitted++; });
    const res1 = controlSettings.setBinding('fire', 'KeyK');
    expect(res1).toEqual({ ok: true, swappedWith: null });
    expect(controlSettings.getBinding('fire')).toBe('KeyK');
    expect(emitted).toBe(1);

    // Assigning a key already used by moveUp automatically swaps them
    const res2 = controlSettings.setBinding('fire', 'KeyW');
    expect(res2).toEqual({ ok: true, swappedWith: 'moveUp' });
    expect(controlSettings.getBinding('fire')).toBe('KeyW');
    expect(controlSettings.getBinding('moveUp')).toBe('KeyK');

    // Escape is rejected as a bind key
    expect(controlSettings.setBinding('dash', 'Escape')).toEqual({ ok: false, swappedWith: null });

    // Cycle Touchpad aim modes
    expect(controlSettings.cycleAimMode()).toBe('cursor_only');
    expect(controlSettings.cycleAimMode()).toBe('auto_nearest');
    expect(controlSettings.cycleAimMode()).toBe('touchpad_assist');

    controlSettings.resetToDefaults();
    expect(controlSettings.getSettings().bindings).toEqual(DEFAULT_CONTROL_BINDINGS);
  });

  it('captures new keys in SettingsModal and handles Escape cancellation vs close cleanly', () => {
    const { scene, texts, dispatchKeyDown } = createMockUiScene();
    const modal = new SettingsModal(scene);
    const onClose = vi.fn();

    modal.show(onClose);
    expect(modal.isOpen).toBe(true);
    expect(modal.getListeningAction()).toBeNull();

    // Start listening to rebind 'fire'
    modal.startListening('fire');
    expect(modal.getListeningAction()).toBe('fire');
    expect(texts.some(t => t.text === 'NHẤN PHÍM...')).toBe(true);

    // Esc while listening cancels capture WITHOUT closing modal
    dispatchKeyDown({ code: 'Escape', key: 'Escape' });
    expect(modal.getListeningAction()).toBeNull();
    expect(modal.isOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    // Re-listen and bind 'KeyL'
    modal.startListening('fire');
    dispatchKeyDown({ code: 'KeyL', key: 'l' });
    expect(modal.getListeningAction()).toBeNull();
    expect(controlSettings.getBinding('fire')).toBe('KeyL');
    expect(texts.some(t => t.text === 'L')).toBe(true);

    // Esc while NOT listening closes modal cleanly
    dispatchKeyDown({ code: 'Escape', key: 'Escape' });
    expect(modal.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lets PlayerController fire via keyboard key without pressing touchpad and supports touchpad aim modes', () => {
    const { scene, keyStates } = createMockUiScene();
    const pool = new ProjectilePool(scene);
    const player = new PlayerController(scene, 100, 100, 'knight');

    // Mock pointer hovering without being clicked down (touchpad finger lifted / just aiming)
    const pointer: any = {
      isDown: false,
      worldX: 300,
      worldY: 100,
      rightButtonDown: () => false,
      getDuration: () => 0
    };

    const mockEnemy: any = {
      id: 'e1',
      isDead: false,
      sprite: { x: 100, y: 260 }
    };

    // 1. In cursor_only mode, holding keyboard fire key [J] shoots toward cursor (right: angle 0) without mouse down
    controlSettings.setAimMode('cursor_only');
    keyStates.get(74)!.isDown = true; // Default fire key KeyJ (74)
    player.update(0.05, pointer, pool, [], [], [mockEnemy]);

    const cursorBullets = pool.getActiveProjectiles(true);
    expect(cursorBullets.length).toBeGreaterThan(0);
    expect(cursorBullets[0].vx).toBeGreaterThan(100); // Fired right toward pointer (300, 100)
    expect(Math.abs(cursorBullets[0].vy)).toBeLessThan(30);

    // 2. Rebind fire to KeyK (75) at runtime and switch to touchpad_assist -> locks nearest enemy below (100, 260)
    pool.clearAll();
    keyStates.get(74)!.isDown = false;
    player.update(1.0, pointer, pool, [], [], [mockEnemy]);
    controlSettings.setBinding('fire', 'KeyK');
    controlSettings.setAimMode('touchpad_assist');

    keyStates.get(75)!.isDown = true;
    player.update(0.05, pointer, pool, [], [], [mockEnemy]);

    const assistedBullets = pool.getActiveProjectiles(true);
    expect(assistedBullets.length).toBeGreaterThan(0);
    expect(assistedBullets[0].vy).toBeGreaterThan(100); // Locked onto enemy at y=260 instead of pointer at x=300
    player.destroy();
  });
});
