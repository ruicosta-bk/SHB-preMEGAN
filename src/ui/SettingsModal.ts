import Phaser from 'phaser';
import { audio } from '../core/AudioSystem';
import {
  AIM_MODES,
  CONTROL_ACTIONS,
  ControlAction,
  controlSettings,
  formatKeyCode,
  normalizeKeyboardCode
} from '../core/ControlSettings';

interface KeySlotRef {
  action: ControlAction;
  labelVi: string;
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  x: number;
  y: number;
}

export class SettingsModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  public isOpen: boolean = false;
  private listeningAction: ControlAction | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private aimTitleText: Phaser.GameObjects.Text | null = null;
  private aimDescText: Phaser.GameObjects.Text | null = null;
  private keySlotRefs: KeySlotRef[] = [];
  private onCloseCallback: (() => void) | null = null;
  private keyListener: ((event: { key?: string; code?: string; preventDefault?: () => void }) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(350).setScrollFactor(0).setVisible(false);
  }

  public getListeningAction(): ControlAction | null {
    return this.listeningAction;
  }

  public startListening(action: ControlAction): void {
    this.listeningAction = action;
    const meta = CONTROL_ACTIONS.find(m => m.action === action);
    if (this.statusText) {
      this.statusText.setText(`Đang chờ nhấn phím mới cho "${meta?.labelVi ?? action}"... (Nhấn Esc để hủy)`);
      this.statusText.setColor('#fbbf24');
    }
    this.refreshKeySlots();
  }

  public handleKeyDown(event: { key?: string; code?: string; preventDefault?: () => void }): boolean {
    if (!this.isOpen) return false;

    if (this.listeningAction !== null) {
      event.preventDefault?.();
      if (event.code === 'Escape' || event.key === 'Escape') {
        this.listeningAction = null;
        if (this.statusText) {
          this.statusText.setText('Đã hủy đổi phím.');
          this.statusText.setColor('#94a3b8');
        }
        this.refreshKeySlots();
        return true;
      }

      const targetAction = this.listeningAction;
      const normalized = normalizeKeyboardCode(event);
      if (!normalized) {
        if (this.statusText) {
          this.statusText.setText('Phím này chưa được hỗ trợ. Hãy thử phím chữ, số, Space, Shift hoặc Mũi tên.');
          this.statusText.setColor('#f87171');
        }
        return true;
      }

      const result = controlSettings.setBinding(targetAction, normalized);
      this.listeningAction = null;
      if (result.ok) {
        const meta = CONTROL_ACTIONS.find(m => m.action === targetAction);
        const swappedMeta = result.swappedWith
          ? CONTROL_ACTIONS.find(m => m.action === result.swappedWith)
          : null;
        const msg = swappedMeta
          ? `Đã gán [${formatKeyCode(normalized)}] cho "${meta?.labelVi}" (hoán đổi với "${swappedMeta.labelVi}").`
          : `Đã gán [${formatKeyCode(normalized)}] cho "${meta?.labelVi}".`;
        if (this.statusText) {
          this.statusText.setText(msg);
          this.statusText.setColor('#4ade80');
        }
        audio.playPickup?.();
      }
      this.refreshKeySlots();
      return true;
    }

    if (event.code === 'Escape' || event.key === 'Escape') {
      event.preventDefault?.();
      this.close();
      return true;
    }

    return false;
  }

  public handleEsc(): boolean {
    if (!this.isOpen) return false;
    if (this.listeningAction !== null) {
      this.listeningAction = null;
      if (this.statusText) {
        this.statusText.setText('Đã hủy đổi phím.');
        this.statusText.setColor('#94a3b8');
      }
      this.refreshKeySlots();
      return true;
    }
    this.close();
    return false;
  }

  public show(onClose?: () => void): void {
    this.isOpen = true;
    this.listeningAction = null;
    this.onCloseCallback = onClose ?? null;
    this.detachKeyListener();
    this.container.removeAll(true);
    this.keySlotRefs = [];
    this.container.setVisible(true);

    // Interactive backdrop blocks accidental clicks underneath
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.82);
    backdrop.fillRect(0, 0, 1280, 720);
    this.container.add(backdrop);

    const blocker = this.scene.add.zone(640, 360, 1280, 720).setInteractive();
    this.container.add(blocker);

    const panel = this.scene.add.container(640, 360);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f172a, 0.98);
    bg.fillRoundedRect(-340, -290, 680, 580, 14);
    bg.lineStyle(2, 0x38bdf8, 0.92);
    bg.strokeRoundedRect(-340, -290, 680, 580, 14);
    panel.add(bg);

    const title = this.scene.add.text(0, -254, '⚙️ CÀI ĐẶT ĐIỀU KHIỂN & TOUCHPAD', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(title);

    // --- Section 1: Touchpad Aim Mode ---
    const aimHeader = this.scene.add.text(-305, -214, 'CHẾ ĐỘ ĐỊNH HƯỚNG & BẮN (DÀNH CHO NGƯỜI DÙNG TOUCHPAD)', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11.5px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    panel.add(aimHeader);

    const aimBg = this.scene.add.graphics();
    aimBg.setPosition(0, -168);
    aimBg.fillStyle(0x1e293b, 1.0);
    aimBg.fillRoundedRect(-305, -28, 610, 56, 8);
    aimBg.lineStyle(1.5, 0x0ea5e9, 0.85);
    aimBg.strokeRoundedRect(-305, -28, 610, 56, 8);
    panel.add(aimBg);

    this.aimTitleText = this.scene.add.text(-290, -180, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '13px',
      color: '#fde047',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    panel.add(this.aimTitleText);

    const aimBadge = this.scene.add.text(290, -180, '[BẤM ĐỂ ĐỔI]', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);
    panel.add(aimBadge);

    this.aimDescText = this.scene.add.text(-290, -156, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11.5px',
      color: '#cbd5e1'
    }).setOrigin(0, 0.5);
    panel.add(this.aimDescText);

    const aimZone = this.scene.add.zone(0, -168, 610, 56).setInteractive({ useHandCursor: true });
    aimZone.on('pointerdown', () => {
      audio.playPickup?.();
      controlSettings.cycleAimMode();
      this.refreshAimMode();
    });
    panel.add(aimZone);

    // --- Section 2: Key Rebinding ---
    const bindHeader = this.scene.add.text(-305, -118, 'TÙY CHỈNH PHÍM BẤM (CHỌN Ô RỒI NHẤN PHÍM MỚI)', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11.5px',
      color: '#f59e0b',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    panel.add(bindHeader);

    CONTROL_ACTIONS.forEach((meta, idx) => {
      const col = idx < 5 ? 0 : 1;
      const row = idx < 5 ? idx : idx - 5;
      const baseX = col === 0 ? -158 : 158;
      const y = -82 + row * 46;

      const label = this.scene.add.text(baseX - 144, y, meta.labelVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '12.5px',
        color: '#e2e8f0'
      }).setOrigin(0, 0.5);
      panel.add(label);

      const btnX = baseX + 82;
      const keyBg = this.scene.add.graphics();
      keyBg.setPosition(btnX, y);
      panel.add(keyBg);

      const keyTxt = this.scene.add.text(btnX, y, '', {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      panel.add(keyTxt);

      const keyZone = this.scene.add.zone(btnX, y, 120, 34).setInteractive({ useHandCursor: true });
      keyZone.on('pointerdown', () => {
        audio.playPickup?.();
        this.startListening(meta.action);
      });
      panel.add(keyZone);

      this.keySlotRefs.push({
        action: meta.action,
        labelVi: meta.labelVi,
        bg: keyBg,
        text: keyTxt,
        x: btnX,
        y
      });
    });

    const dualNote = this.scene.add.text(158, 102, 'Chuột trái/phải & Mũi tên vẫn dùng song song', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11px',
      color: '#94a3b8'
    }).setOrigin(0.5);
    panel.add(dualNote);

    this.statusText = this.scene.add.text(0, 160, 'Bấm vào một ô phím bất kỳ để thay đổi. Trùng phím sẽ tự hoán đổi.', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '12px',
      color: '#94a3b8',
      align: 'center',
      wordWrap: { width: 610 }
    }).setOrigin(0.5);
    panel.add(this.statusText);

    // Footer buttons
    this.createFooterButton(panel, -150, 226, 220, 40, 'KHÔI PHỤC MẶC ĐỊNH', 0x475569, () => {
      controlSettings.resetToDefaults();
      this.listeningAction = null;
      this.refreshAimMode();
      this.refreshKeySlots();
      if (this.statusText) {
        this.statusText.setText('Đã khôi phục toàn bộ phím & chế độ ngắm về mặc định.');
        this.statusText.setColor('#38bdf8');
      }
    });

    this.createFooterButton(panel, 150, 226, 220, 40, 'LƯU & ĐÓNG [ESC]', 0x22c55e, () => {
      this.close();
    });

    this.container.add(panel);
    this.refreshAimMode();
    this.refreshKeySlots();

    if (this.scene.input?.keyboard?.on) {
      this.keyListener = (event: { key?: string; code?: string; preventDefault?: () => void }) => {
        this.handleKeyDown(event);
      };
      this.scene.input.keyboard.on('keydown', this.keyListener);
    }
  }

  private refreshAimMode(): void {
    const modeId = controlSettings.getSettings().aimMode;
    const meta = AIM_MODES.find(m => m.id === modeId) ?? AIM_MODES[0];
    this.aimTitleText?.setText(`Chế độ: ${meta.labelVi}`);
    this.aimDescText?.setText(meta.descVi);
  }

  private refreshKeySlots(): void {
    const bindings = controlSettings.getSettings().bindings;
    for (const slot of this.keySlotRefs) {
      const isListening = this.listeningAction === slot.action;
      slot.bg.clear();
      slot.bg.fillStyle(isListening ? 0xd97706 : 0x1e293b, 1.0);
      slot.bg.fillRoundedRect(-60, -17, 120, 34, 6);
      slot.bg.lineStyle(1.5, isListening ? 0xfef08a : 0x475569, 0.95);
      slot.bg.strokeRoundedRect(-60, -17, 120, 34, 6);

      slot.text.setText(isListening ? 'NHẤN PHÍM...' : formatKeyCode(bindings[slot.action]));
      slot.text.setColor(isListening ? '#ffffff' : '#38bdf8');
    }
  }

  private createFooterButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    color: number,
    onClick: () => void
  ): void {
    const bg = this.scene.add.graphics();
    bg.setPosition(x, y);
    bg.fillStyle(color, 1.0);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    parent.add(bg);

    const txt = this.scene.add.text(x, y, text, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    parent.add(txt);

    const zone = this.scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      audio.playPickup?.();
      onClick();
    });
    parent.add(zone);
  }

  private detachKeyListener(): void {
    if (this.keyListener && this.scene.input?.keyboard?.off) {
      this.scene.input.keyboard.off('keydown', this.keyListener);
    }
    this.keyListener = null;
  }

  private close(): void {
    this.hide();
    const cb = this.onCloseCallback;
    this.onCloseCallback = null;
    cb?.();
  }

  public hide(): void {
    this.isOpen = false;
    this.listeningAction = null;
    this.detachKeyListener();
    this.container.setVisible(false);
  }

  public destroy(): void {
    this.detachKeyListener();
    this.container.destroy();
  }
}
