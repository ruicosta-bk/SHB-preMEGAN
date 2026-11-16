import Phaser from 'phaser';
import { audio } from '../core/AudioSystem';
import { controlSettings } from '../core/ControlSettings';
import { HEROES, HeroId, SkillVariant, getHeroSkillMeta } from '../data/heroes';
import { events } from '../core/EventBus';

export class PauseModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  public isOpen: boolean = false;
  private volumeText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(210).setScrollFactor(0).setVisible(false);
  }

  public show(
    onResume: () => void,
    onRestart: () => void,
    heroId: HeroId = 'alchemist',
    skillVariant: SkillVariant = 1
  ): void {
    this.isOpen = true;
    this.container.removeAll(true);
    this.container.setVisible(true);

    const heroCfg = HEROES[heroId] ?? HEROES.alchemist;
    const skillMeta = getHeroSkillMeta(heroCfg.id, skillVariant);
    const moveKeys = `${controlSettings.getBindingLabel('moveUp')}${controlSettings.getBindingLabel('moveLeft')}${controlSettings.getBindingLabel('moveDown')}${controlSettings.getBindingLabel('moveRight')}`;
    const fireKey = controlSettings.getBindingLabel('fire');
    const dashKey = controlSettings.getBindingLabel('dash');
    const skillKey = controlSettings.getBindingLabel('skill');
    const swapKey = controlSettings.getBindingLabel('swapWeapon');
    const interactKey = controlSettings.getBindingLabel('interact');

    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.8);
    backdrop.fillRect(0, 0, 1280, 720);
    this.container.add(backdrop);

    const panel = this.scene.add.container(640, 360);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f172a, 0.95);
    bg.fillRoundedRect(-240, -220, 480, 440, 12);
    bg.lineStyle(2, 0x475569, 0.9);
    bg.strokeRoundedRect(-240, -220, 480, 440, 12);
    panel.add(bg);

    const title = this.scene.add.text(0, -188, 'TẠM DỪNG', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '26px',
      color: '#f8fafc',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(title);

    // Controls reminder (dynamically bound to active hero skill & user key bindings)
    const controls = [
      `${moveKeys} / Mũi tên: Di chuyển mượt mà`,
      `Phím ${fireKey} / Chuột trái: Tấn công (giữ để bắn liên tục)`,
      `Phím ${dashKey}: Lướt né đòn (bất tử 0.2s)`,
      `Phím ${skillKey} / Chuột phải: [S${skillVariant}] ${skillMeta.nameVi} (${heroCfg.nameVi})`,
      `Phím ${swapKey}: Đổi súng  |  Phím ${interactKey}: Nhặt & Mua hàng Shop`,
      'Phím Esc: Tạm dừng  |  Phím Tab: Xem Kỹ năng & Trang bị'
    ];
    controls.forEach((text, i) => {
      const line = this.scene.add.text(0, -150 + i * 21, text, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '12px',
        color: i === 3 ? heroCfg.accentHex || '#38bdf8' : '#94a3b8'
      }).setOrigin(0.5);
      panel.add(line);
    });

    const skillNote = this.scene.add.text(0, -10, `Kỹ năng (${skillMeta.cooldown}s): ${skillMeta.descVi}`, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11.5px',
      color: '#cbd5e1',
      align: 'center',
      wordWrap: { width: 432 }
    }).setOrigin(0.5);
    panel.add(skillNote);

    // Sound settings
    const soundTitle = this.scene.add.text(0, 30, 'CÀI ĐẶT ÂM THANH', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '15px',
      color: '#f59e0b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(soundTitle);

    this.volumeText = this.scene.add.text(0, 60, `Âm lượng: ${Math.round(audio.getVolume() * 100)}% ${audio.getIsMuted() ? '(ĐÃ TẮT)' : ''}`, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '14px',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    panel.add(this.volumeText);

    // Vol down button
    this.createButton(panel, -90, 95, 60, 30, '-', () => {
      audio.setVolume(Math.max(0, audio.getVolume() - 0.1));
      this.refreshVolumeText();
    });

    // Mute button
    this.createButton(panel, 0, 95, 100, 30, audio.getIsMuted() ? 'BẬT ÂM' : 'TẮT ÂM', (btnText) => {
      const muted = audio.toggleMute();
      btnText.setText(muted ? 'BẬT ÂM' : 'TẮT ÂM');
      this.refreshVolumeText();
    });

    // Vol up button
    this.createButton(panel, 90, 95, 60, 30, '+', () => {
      audio.setVolume(Math.min(1, audio.getVolume() + 0.1));
      this.refreshVolumeText();
    });

    // Resume button
    this.createButton(panel, 0, 145, 200, 36, 'TIẾP TỤC CHƠI', () => {
      this.hide();
      onResume();
    }, 0x22c55e);

    // Restart button
    this.createButton(panel, 0, 190, 200, 36, 'CHƠI LẠI TỪ ĐẦU', () => {
      this.hide();
      onRestart();
    }, 0xef4444);

    this.container.add(panel);
  }

  private refreshVolumeText(): void {
    if (this.volumeText) {
      this.volumeText.setText(`Âm lượng: ${Math.round(audio.getVolume() * 100)}% ${audio.getIsMuted() ? '(ĐÃ TẮT)' : ''}`);
    }
  }

  private createButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: (textObj: Phaser.GameObjects.Text) => void,
    color: number = 0x334155
  ): void {
    const bg = this.scene.add.graphics();
    bg.setPosition(x, y);
    bg.fillStyle(color, 1.0);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    parent.add(bg);

    const txt = this.scene.add.text(x, y, text, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    parent.add(txt);

    const zone = this.scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    parent.add(zone);

    zone.on('pointerdown', () => {
      audio.playPickup();
      onClick(txt);
    });
  }

  public hide(): void {
    this.isOpen = false;
    this.container.setVisible(false);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
