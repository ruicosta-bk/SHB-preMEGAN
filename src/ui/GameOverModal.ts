import Phaser from 'phaser';
import { audio } from '../core/AudioSystem';
import { loadMetaState } from '../core/MetaProgression';

export interface RunStats {
  isVictory: boolean;
  timeSeconds: number;
  enemiesDefeated: number;
  roomsCleared: number;
  totalRooms?: number;
  floorReached?: string;
  damageDealt: number;
  gemsEarned?: number;
  totalGems?: number;
}

export class GameOverModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  public isOpen: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(220).setScrollFactor(0).setVisible(false);
  }

  public show(stats: RunStats, onRestart: () => void, onReturnLobby?: () => void): void {
    this.isOpen = true;
    this.container.removeAll(true);
    this.container.setVisible(true);

    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.85);
    backdrop.fillRect(0, 0, 1280, 720);
    this.container.add(backdrop);

    const panel = this.scene.add.container(640, 360);
    const bg = this.scene.add.graphics();
    const borderColor = stats.isVictory ? 0xf59e0b : 0xef4444;
    bg.fillStyle(0x0f172a, 0.98);
    bg.fillRoundedRect(-270, -230, 540, 460, 14);
    bg.lineStyle(2.5, borderColor, 0.9);
    bg.strokeRoundedRect(-270, -230, 540, 460, 14);
    panel.add(bg);

    const titleText = stats.isVictory ? 'CHIẾN THẮNG HUY HOÀNG!' : 'BẠN ĐÃ HY SINH';
    const titleColor = stats.isVictory ? '#f59e0b' : '#ef4444';
    const title = this.scene.add.text(0, -182, titleText, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '28px',
      color: titleColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);
    panel.add(title);

    const sub = this.scene.add.text(
      0,
      -142,
      stats.isVictory
        ? 'Bạn đã thanh tẩy Ignis Ignifer và phá vỡ phong ấn Ember Vault!'
        : 'Ngọn lửa giả kim đã tắt trong hầm ngục u tối...',
      {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '14px',
        color: '#94a3b8',
        align: 'center',
        wordWrap: { width: 470 }
      }
    ).setOrigin(0.5);
    panel.add(sub);

    // Format time
    const mins = Math.floor(stats.timeSeconds / 60);
    const secs = Math.floor(stats.timeSeconds % 60);
    const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Stats box
    const floorLine = stats.floorReached ? `Tầng đạt tới: ${stats.floorReached}` : '';
    const statLines = [
      ...(floorLine ? [floorLine] : []),
      `Thời gian chinh chiến: ${timeFormatted}`,
      `Quái vật đã tiêu diệt: ${stats.enemiesDefeated}`,
      `Phòng đã giải phóng: ${stats.roomsCleared}${stats.totalRooms ? ` / ${stats.totalRooms}` : ''}`,
      `Tổng sát thương gây ra: ${Math.round(stats.damageDealt)}`
    ];

    statLines.forEach((text, i) => {
      const line = this.scene.add.text(0, -88 + i * 28, text, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '15.5px',
        color: '#f8fafc',
        fontStyle: '500'
      }).setOrigin(0.5);
      panel.add(line);
    });

    // Highlighted Soul Gem ("Ngọc Hồn") reward breakdown
    const gemsEarned = stats.gemsEarned ?? 0;
    const totalGems = stats.totalGems ?? loadMetaState().gems;
    const gemBox = this.scene.add.graphics();
    gemBox.fillStyle(0x1e293b, 0.95);
    gemBox.fillRoundedRect(-215, 60, 430, 44, 10);
    gemBox.lineStyle(1.5, 0x38bdf8, 0.9);
    gemBox.strokeRoundedRect(-215, 60, 430, 44, 10);
    panel.add(gemBox);

    const gemText = this.scene.add.text(0, 82, `+💎 ${gemsEarned} Ngọc Hồn (Tổng: ${totalGems})`, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '16.5px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(gemText);

    // Side-by-side action buttons
    const btnW = 216;
    const btnH = 46;
    const btnY = 160;

    this.createActionButton(
      panel,
      -120,
      btnY,
      btnW,
      btnH,
      'CHƠI LẠI NGAY',
      stats.isVictory ? 0xd97706 : 0xdc2626,
      stats.isVictory ? 0xf59e0b : 0xef4444,
      0xfde68a,
      () => {
        audio.playPickup();
        this.hide();
        onRestart();
      }
    );

    this.createActionButton(
      panel,
      120,
      btnY,
      btnW,
      btnH,
      'SẢNH NGỌC HỒN',
      0x0284c7,
      0x0ea5e9,
      0x7dd3fc,
      () => {
        audio.playPickup();
        this.hide();
        if (onReturnLobby) {
          onReturnLobby();
        }
      }
    );

    this.container.add(panel);
  }

  private createActionButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    fillColor: number,
    hoverColor: number,
    strokeColor: number,
    onClick: () => void
  ): void {
    const btnBg = this.scene.add.graphics();
    const drawBtn = (color: number, borderAlpha: number) => {
      btnBg.clear();
      btnBg.fillStyle(color, 1.0);
      btnBg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      btnBg.lineStyle(1.5, strokeColor, borderAlpha);
      btnBg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    };
    drawBtn(fillColor, 0.85);
    parent.add(btnBg);

    const btnText = this.scene.add.text(x, y, label, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    parent.add(btnText);

    const hitZone = this.scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    parent.add(hitZone);

    hitZone.on('pointerover', () => drawBtn(hoverColor, 1.0));
    hitZone.on('pointerout', () => drawBtn(fillColor, 0.85));
    hitZone.on('pointerdown', onClick);
  }

  public hide(): void {
    this.isOpen = false;
    this.container.setVisible(false);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
