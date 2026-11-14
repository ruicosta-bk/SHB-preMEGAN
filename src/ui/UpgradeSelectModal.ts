import Phaser from 'phaser';
import { UpgradeData } from '../types/upgrade';
import { UPGRADES } from '../data/upgrades';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

export class UpgradeSelectModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  public isOpen: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(200).setScrollFactor(0).setVisible(false);
  }

  public show(onSelected: (upgrade: UpgradeData) => void): void {
    this.isOpen = true;
    this.container.removeAll(true);
    this.container.setVisible(true);

    // Dark backdrop
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.75);
    backdrop.fillRect(0, 0, 1280, 720);
    this.container.add(backdrop);

    // Title
    const title = this.scene.add.text(640, 110, 'CHỌN NÂNG CẤP GIẢ KIM', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '28px',
      color: '#f59e0b',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);
    this.container.add(title);

    const sub = this.scene.add.text(640, 150, 'Chọn 1 trong 3 tàn tích cổ xưa để gia tăng sức mạnh:', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '15px',
      color: '#94a3b8'
    }).setOrigin(0.5);
    this.container.add(sub);

    // Pick 3 random distinct upgrades
    const allUpgrades = Object.values(UPGRADES);
    Phaser.Utils.Array.Shuffle(allUpgrades);
    const choices = allUpgrades.slice(0, 3);

    const cardW = 280;
    const cardH = 360;
    const spacing = 45;
    const totalW = 3 * cardW + 2 * spacing;
    const startX = (1280 - totalW) / 2 + cardW / 2;
    const cardY = 380;

    choices.forEach((upg, idx) => {
      const cx = startX + idx * (cardW + spacing);

      const card = this.scene.add.container(cx, cardY);

      // Card BG
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x1e2330, 0.95);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      bg.lineStyle(2, 0xd97706, 0.9);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      card.add(bg);

      // Icon
      const icon = this.scene.add.sprite(0, -95, upg.icon).setScale(1.8);
      card.add(icon);

      // Upgrade Name
      const name = this.scene.add.text(0, -25, upg.nameVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '18px',
        color: '#fbbf24',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5);
      card.add(name);

      // Description
      const desc = this.scene.add.text(0, 45, upg.descriptionVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '13px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: { width: cardW - 36 }
      }).setOrigin(0.5);
      card.add(desc);

      // Select Button
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(0xd97706, 1.0);
      btnBg.fillRoundedRect(-85, 120, 170, 38, 6);
      card.add(btnBg);

      const btnText = this.scene.add.text(0, 139, 'CHỌN', {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      card.add(btnText);

      // Interactive zone
      const hitZone = this.scene.add.zone(0, 0, cardW, cardH).setInteractive({ useHandCursor: true });
      card.add(hitZone);

      hitZone.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x2d3748, 0.98);
        bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
        bg.lineStyle(3, 0xf59e0b, 1.0);
        bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
        card.setScale(1.03);
      });

      hitZone.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x1e2330, 0.95);
        bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
        bg.lineStyle(2, 0xd97706, 0.9);
        bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
        card.setScale(1.0);
      });

      hitZone.on('pointerdown', () => {
        audio.playPickup();
        this.hide();
        onSelected(upg);
      });

      this.container.add(card);
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
