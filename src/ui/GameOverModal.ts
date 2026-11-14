import Phaser from 'phaser';
import { audio } from '../core/AudioSystem';

export interface RunStats {
  isVictory: boolean;
  timeSeconds: number;
  enemiesDefeated: number;
  roomsCleared: number;
  totalRooms?: number;
  floorReached?: string;
  damageDealt: number;
}

export class GameOverModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  public isOpen: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(220).setScrollFactor(0).setVisible(false);
  }

  public show(stats: RunStats, onRestart: () => void): void {
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
    bg.fillRoundedRect(-250, -220, 500, 440, 14);
    bg.lineStyle(2.5, borderColor, 0.9);
    bg.strokeRoundedRect(-250, -220, 500, 440, 14);
    panel.add(bg);

    const titleText = stats.isVictory ? 'CHIẾN THẮNG HUY HOÀNG!' : 'BẠN ĐÃ HY SINH';
    const titleColor = stats.isVictory ? '#f59e0b' : '#ef4444';
    const title = this.scene.add.text(0, -170, titleText, {
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
      -130,
      stats.isVictory
        ? 'Bạn đã thanh tẩy Ignis Ignifer và phá vỡ phong ấn Ember Vault!'
        : 'Ngọn lửa giả kim đã tắt trong hầm ngục u tối...',
      {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '14px',
        color: '#94a3b8',
        align: 'center',
        wordWrap: { width: 440 }
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
      const line = this.scene.add.text(0, -60 + i * 32, text, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '16px',
        color: '#f8fafc',
        fontStyle: '500'
      }).setOrigin(0.5);
      panel.add(line);
    });

    // Restart button
    const btnW = 220;
    const btnH = 46;
    const btnY = 145;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(stats.isVictory ? 0xd97706 : 0xdc2626, 1.0);
    btnBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    panel.add(btnBg);

    const btnText = this.scene.add.text(0, btnY, 'CHƠI LẠI LƯỢT MỚI', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(btnText);

    const hitZone = this.scene.add.zone(0, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
    panel.add(hitZone);

    hitZone.on('pointerover', () => {
      panel.setScale(1.02);
    });
    hitZone.on('pointerout', () => {
      panel.setScale(1.0);
    });
    hitZone.on('pointerdown', () => {
      audio.playPickup();
      this.hide();
      onRestart();
    });

    this.container.add(panel);
  }

  public hide(): void {
    this.isOpen = false;
    this.container.setVisible(false);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
