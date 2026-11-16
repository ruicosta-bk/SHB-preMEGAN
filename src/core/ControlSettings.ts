import { events } from './EventBus';

export const CONTROL_STORAGE_KEY = 'ember_vault_controls_v1';

export type ControlAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'fire'
  | 'dash'
  | 'skill'
  | 'swapWeapon'
  | 'interact'
  | 'dropWeapon';

export type AimMode = 'touchpad_assist' | 'cursor_only' | 'auto_nearest';

export type ControlBindings = Record<ControlAction, string>;

export interface ControlSettingsState {
  bindings: ControlBindings;
  aimMode: AimMode;
}

export interface ControlActionMeta {
  action: ControlAction;
  labelVi: string;
}

export const CONTROL_ACTIONS: readonly ControlActionMeta[] = [
  { action: 'moveUp', labelVi: 'Đi lên' },
  { action: 'moveDown', labelVi: 'Đi xuống' },
  { action: 'moveLeft', labelVi: 'Sang trái' },
  { action: 'moveRight', labelVi: 'Sang phải' },
  { action: 'fire', labelVi: 'Bắn / Tấn công (bàn phím)' },
  { action: 'dash', labelVi: 'Lướt né đòn' },
  { action: 'skill', labelVi: 'Kỹ năng tướng' },
  { action: 'swapWeapon', labelVi: 'Đổi vũ khí' },
  { action: 'interact', labelVi: 'Tương tác / Nhặt đồ' },
  { action: 'dropWeapon', labelVi: 'Vứt vũ khí' }
];

export const AIM_MODES: readonly { id: AimMode; labelVi: string; descVi: string }[] = [
  {
    id: 'touchpad_assist',
    labelVi: 'Linh hoạt (Khuyên dùng Touchpad)',
    descVi: 'Nhấn phím Bắn để tự khóa quái gần nhất; dùng Chuột trái khi muốn ngắm tự do.'
  },
  {
    id: 'cursor_only',
    labelVi: 'Định hướng Touchpad + Phím Bắn',
    descVi: 'Lướt nhẹ ngón tay chỉnh tâm ngắm, bấm phím Bắn trên bàn phím (không cần đè touchpad).'
  },
  {
    id: 'auto_nearest',
    labelVi: 'Tự ngắm 100% (Chỉ bàn phím)',
    descVi: 'Luôn tự xoay hướng vào quái gần nhất trong tầm, không cần chạm touchpad.'
  }
];

export const DEFAULT_CONTROL_BINDINGS: ControlBindings = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  fire: 'KeyJ',
  dash: 'Space',
  skill: 'KeyF',
  swapWeapon: 'KeyQ',
  interact: 'KeyE',
  dropWeapon: 'KeyG'
};

export const DEFAULT_AIM_MODE: AimMode = 'touchpad_assist';

const SPECIAL_KEY_CODES: Record<string, number> = {
  Space: 32,
  Enter: 13,
  NumpadEnter: 13,
  Tab: 9,
  Backspace: 8,
  ShiftLeft: 16,
  ShiftRight: 16,
  ControlLeft: 17,
  ControlRight: 17,
  AltLeft: 18,
  AltRight: 18,
  ArrowUp: 38,
  ArrowDown: 40,
  ArrowLeft: 37,
  ArrowRight: 39,
  Semicolon: 186,
  Equal: 187,
  Comma: 188,
  Minus: 189,
  Period: 190,
  Slash: 191,
  Backquote: 192,
  BracketLeft: 219,
  Backslash: 220,
  BracketRight: 221,
  Quote: 222
};

const SPECIAL_LABELS: Record<string, string> = {
  Space: 'SPACE',
  Enter: 'ENTER',
  NumpadEnter: 'NUM ENTER',
  Tab: 'TAB',
  Backspace: 'BACK',
  ShiftLeft: 'SHIFT',
  ShiftRight: 'R-SHIFT',
  ControlLeft: 'CTRL',
  ControlRight: 'R-CTRL',
  AltLeft: 'ALT',
  AltRight: 'R-ALT',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Semicolon: ';',
  Equal: '=',
  Comma: ',',
  Minus: '-',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  BracketLeft: '[',
  Backslash: '\\',
  BracketRight: ']',
  Quote: "'"
};

export function codeToPhaserKeyCode(code: string): number | null {
  if (!code) return null;
  if (/^Key[A-Z]$/.test(code)) {
    return code.charCodeAt(3);
  }
  if (/^Digit[0-9]$/.test(code)) {
    return code.charCodeAt(5);
  }
  if (/^Numpad[0-9]$/.test(code)) {
    return 96 + Number(code.charAt(6));
  }
  return SPECIAL_KEY_CODES[code] ?? null;
}

export function normalizeKeyboardCode(event: { code?: string; key?: string }): string | null {
  if (event.code && event.code !== 'Escape' && codeToPhaserKeyCode(event.code) !== null) {
    return event.code;
  }
  const key = event.key ?? '';
  if (!key || key === 'Escape') return null;
  if (key === ' ') return 'Space';
  if (/^[a-zA-Z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  if (key in SPECIAL_KEY_CODES) return key;
  return null;
}

export function formatKeyCode(code: string): string {
  if (!code) return '?';
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return `NUM ${code.slice(6)}`;
  return SPECIAL_LABELS[code] ?? code.toUpperCase();
}

function getSafeStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Node/private browsing without localStorage
  }
  return null;
}

class ControlSettingsManager {
  private state: ControlSettingsState;

  constructor() {
    this.state = this.load();
  }

  public load(): ControlSettingsState {
    const defaults: ControlSettingsState = {
      bindings: { ...DEFAULT_CONTROL_BINDINGS },
      aimMode: DEFAULT_AIM_MODE
    };
    const storage = getSafeStorage();
    if (!storage) return defaults;

    try {
      const raw = storage.getItem(CONTROL_STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      const mergedBindings: ControlBindings = { ...DEFAULT_CONTROL_BINDINGS };
      if (parsed?.bindings && typeof parsed.bindings === 'object') {
        for (const meta of CONTROL_ACTIONS) {
          const val = parsed.bindings[meta.action];
          if (typeof val === 'string' && codeToPhaserKeyCode(val) !== null) {
            mergedBindings[meta.action] = val;
          }
        }
      }
      const aimMode: AimMode =
        parsed?.aimMode === 'touchpad_assist' ||
        parsed?.aimMode === 'cursor_only' ||
        parsed?.aimMode === 'auto_nearest'
          ? parsed.aimMode
          : DEFAULT_AIM_MODE;
      return { bindings: mergedBindings, aimMode };
    } catch {
      return defaults;
    }
  }

  public reloadFromStorage(): ControlSettingsState {
    this.state = this.load();
    return this.getSettings();
  }

  private save(): void {
    const storage = getSafeStorage();
    if (!storage) return;
    try {
      storage.setItem(CONTROL_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore quota/storage restrictions
    }
  }

  public getSettings(): ControlSettingsState {
    return {
      bindings: { ...this.state.bindings },
      aimMode: this.state.aimMode
    };
  }

  public getBinding(action: ControlAction): string {
    return this.state.bindings[action];
  }

  public getBindingLabel(action: ControlAction): string {
    return formatKeyCode(this.state.bindings[action]);
  }

  public setBinding(
    action: ControlAction,
    rawCode: string
  ): { ok: boolean; swappedWith: ControlAction | null } {
    const normalized = normalizeKeyboardCode({ code: rawCode });
    if (!normalized) {
      return { ok: false, swappedWith: null };
    }

    const previous = this.state.bindings[action];
    let swappedWith: ControlAction | null = null;
    for (const meta of CONTROL_ACTIONS) {
      if (meta.action !== action && this.state.bindings[meta.action] === normalized) {
        this.state.bindings[meta.action] = previous;
        swappedWith = meta.action;
        break;
      }
    }

    this.state.bindings[action] = normalized;
    this.save();
    events.emit('settings:controls-updated', this.getSettings());
    return { ok: true, swappedWith };
  }

  public setAimMode(mode: AimMode): void {
    this.state.aimMode = mode;
    this.save();
    events.emit('settings:controls-updated', this.getSettings());
  }

  public cycleAimMode(): AimMode {
    const idx = AIM_MODES.findIndex(m => m.id === this.state.aimMode);
    const next = AIM_MODES[(idx + 1) % AIM_MODES.length].id;
    this.setAimMode(next);
    return next;
  }

  public resetToDefaults(): ControlSettingsState {
    this.state = {
      bindings: { ...DEFAULT_CONTROL_BINDINGS },
      aimMode: DEFAULT_AIM_MODE
    };
    this.save();
    const snapshot = this.getSettings();
    events.emit('settings:controls-updated', snapshot);
    return snapshot;
  }
}

export const controlSettings = new ControlSettingsManager();
