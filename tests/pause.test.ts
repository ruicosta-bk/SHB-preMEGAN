import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Scene: class {},
    Input: { Keyboard: { KeyCodes: { W: 87, A: 65, S: 83, D: 68, UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, SPACE: 32, Q: 81, E: 69, F: 70, ESC: 27 } } },
    Math: { Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)) }
  }
}));

import { MainScene, PauseableSceneLike, syncScenePauseState } from '../src/scenes/MainScene';
import { UIScene } from '../src/scenes/UIScene';
import { events } from '../src/core/EventBus';

function createFakePauseableScene(): PauseableSceneLike & {
  calls: string[];
  tweens: {
    paused: boolean;
    startTime: number;
    prevTime: number;
    pauseAll: () => void;
    resumeAll: () => void;
    killAll: () => void;
  };
  time: {
    paused: boolean;
    removeAllEvents: () => void;
  };
} {
  const calls: string[] = [];
  const tweens = {
    paused: false,
    startTime: 1000,
    prevTime: 1120,
    pauseAll: () => {
      tweens.paused = true;
      calls.push('tweens:pauseAll');
    },
    resumeAll: () => {
      tweens.paused = false;
      calls.push('tweens:resumeAll');
    },
    killAll: () => {
      calls.push('tweens:killAll');
    }
  };
  const time = {
    paused: false,
    removeAllEvents: () => {
      calls.push('time:removeAllEvents');
    }
  };

  return {
    calls,
    time,
    tweens,
    anims: {
      pauseAll: () => calls.push('anims:pauseAll'),
      resumeAll: () => calls.push('anims:resumeAll')
    },
    input: {
      keyboard: {
        resetKeys: () => calls.push('input:resetKeys')
      }
    },
    scene: {
      pause: () => calls.push('scene:pause'),
      resume: () => calls.push('scene:resume')
    }
  };
}

describe('Pause & Scene Freeze (QA-005)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('freezes scene, time clock, tweens, anims, and keyboard state when paused and resumes without tween time jump', () => {
    const scene = createFakePauseableScene();

    // Pause at t = 1120ms (while a 320ms tween like Alchemical Flask is mid-flight)
    const anchor = syncScenePauseState(scene, true, 0, 1120);
    expect(anchor).toBe(1120);
    expect(scene.time.paused).toBe(true);
    expect(scene.tweens.paused).toBe(true);
    expect(scene.calls).toEqual([
      'input:resetKeys',
      'tweens:pauseAll',
      'anims:pauseAll',
      'scene:pause'
    ]);

    // Calling pause repeatedly should preserve the original pause timestamp
    expect(syncScenePauseState(scene, true, anchor, 1500)).toBe(1120);

    // Resume 400ms later (within Phaser's 500ms maxLag window where an unshifted TweenManager would jump 400ms!)
    scene.calls.length = 0;
    const cleared = syncScenePauseState(scene, false, anchor, 1520);
    expect(cleared).toBe(0);
    expect(scene.time.paused).toBe(false);
    expect(scene.tweens.paused).toBe(false);
    // Clocks shifted forward by pausedDuration (400ms) so delta stays ~0ms on resume
    expect(scene.tweens.startTime).toBe(1400);
    expect(scene.tweens.prevTime).toBe(1520);
    expect(scene.calls).toEqual([
      'tweens:resumeAll',
      'anims:resumeAll',
      'scene:resume'
    ]);
  });

  it('MainScene.setGameplayPaused and haltActiveRun freeze/resume scene cleanly without pausing UIScene', () => {
    const fakeMain: any = {
      ...createFakePauseableScene(),
      isGameRunning: true,
      isPaused: false,
      pausedAtMs: 0,
      isTransitioningFloor: false,
      hitStopTimer: 0,
      lastHitStopAt: 0,
      nearestPickup: null,
      camLookAheadX: 0,
      camLookAheadY: 0,
      turrets: [],
      uiScene: { isAnyModalOpen: false },
      setGameplayPaused: (MainScene.prototype as any).setGameplayPaused,
      clearTurrets: (MainScene.prototype as any).clearTurrets,
      startNewRun: vi.fn()
    };

    const emitted: any[] = [];
    const listener = (payload: any) => emitted.push(payload);
    events.on('game:pause-toggled', listener);

    try {
      (MainScene.prototype as any).setGameplayPaused.call(fakeMain, true);
      expect(fakeMain.isPaused).toBe(true);
      expect(fakeMain.time.paused).toBe(true);
      expect(fakeMain.tweens.paused).toBe(true);
      expect(fakeMain.calls).toContain('scene:pause');
      expect(emitted.length).toBe(1);
      expect(emitted[0].isPaused).toBe(true);

      // Resume callback restores gameplay state
      emitted[0].onResume();
      expect(fakeMain.isPaused).toBe(false);
      expect(fakeMain.time.paused).toBe(false);
      expect(fakeMain.tweens.paused).toBe(false);
      expect(fakeMain.calls).toContain('scene:resume');
      expect(emitted.length).toBe(2);
      expect(emitted[1].isPaused).toBe(false);

      // Re-pause then abort run (Restart / Return Lobby via haltActiveRun) must unfreeze & clear timers/tweens
      (MainScene.prototype as any).setGameplayPaused.call(fakeMain, true);
      fakeMain.calls.length = 0;
      (MainScene.prototype as any).haltActiveRun.call(fakeMain);
      expect(fakeMain.isPaused).toBe(false);
      expect(fakeMain.pausedAtMs).toBe(0);
      expect(fakeMain.time.paused).toBe(false);
      expect(fakeMain.tweens.paused).toBe(false);
      expect(fakeMain.calls).toContain('scene:resume');
      expect(fakeMain.calls).toContain('tweens:killAll');
      expect(fakeMain.calls).toContain('time:removeAllEvents');
    } finally {
      events.off('game:pause-toggled', listener);
    }
  });

  it('MainScene.handleWindowBlur matches Esc pause by resetting keys and freezing gameplay state', () => {
    const fakeMain: any = {
      ...createFakePauseableScene(),
      isGameRunning: true,
      isPaused: false,
      pausedAtMs: 0,
      uiScene: { isAnyModalOpen: false },
      setGameplayPaused: MainScene.prototype['setGameplayPaused']
    };

    const emitted: any[] = [];
    const listener = (payload: any) => emitted.push(payload);
    events.on('game:pause-toggled', listener);
    try {
      MainScene.prototype.handleWindowBlur.call(fakeMain);
      expect(fakeMain.isPaused).toBe(true);
      expect(fakeMain.time.paused).toBe(true);
      expect(fakeMain.tweens.paused).toBe(true);
      expect(fakeMain.calls).toContain('input:resetKeys');
      expect(fakeMain.calls).toContain('scene:pause');
      expect(emitted.length).toBe(1);
      expect(emitted[0].isPaused).toBe(true);
    } finally {
      events.off('game:pause-toggled', listener);
    }
  });

  it('UIScene.handleEscKey stays unpaused and toggles pause/resume cleanly via ESC key', () => {
    const fakeUI: any = {
      pauseModal: {
        isOpen: false,
        show: vi.fn(() => {
          fakeUI.pauseModal.isOpen = true;
        }),
        hide: vi.fn(() => {
          fakeUI.pauseModal.isOpen = false;
        })
      },
      titleScreen: { isOpen: false },
      upgradeModal: { isOpen: false },
      gameOverModal: { isOpen: false },
      activePauseResume: null
    };
    Object.defineProperty(fakeUI, 'isAnyModalOpen', {
      get: Object.getOwnPropertyDescriptor(UIScene.prototype, 'isAnyModalOpen')!.get
    });

    const onResumeSpy = vi.fn(() => {
      fakeUI.pauseModal.hide();
    });
    const onPauseRequested = vi.fn(() => {
      fakeUI.activePauseResume = onResumeSpy;
      fakeUI.pauseModal.show();
    });

    events.on('game:pause-requested', onPauseRequested);
    try {
      // Blocked when non-pause modal (e.g. TitleScreen or UpgradeModal) is open
      fakeUI.upgradeModal.isOpen = true;
      UIScene.prototype.handleEscKey.call(fakeUI);
      expect(onPauseRequested).not.toHaveBeenCalled();

      // 1st ESC during active run emits pause request
      fakeUI.upgradeModal.isOpen = false;
      UIScene.prototype.handleEscKey.call(fakeUI);
      expect(onPauseRequested).toHaveBeenCalledTimes(1);
      expect(fakeUI.pauseModal.isOpen).toBe(true);

      // 2nd ESC while PauseModal is open closes modal and invokes resume callback
      UIScene.prototype.handleEscKey.call(fakeUI);
      expect(onResumeSpy).toHaveBeenCalledTimes(1);
      expect(fakeUI.pauseModal.isOpen).toBe(false);
    } finally {
      events.off('game:pause-requested', onPauseRequested);
    }
  });
});
