import Phaser from 'phaser';
import { audio } from '../core/AudioSystem';

export class TitleScreen {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  public isOpen: boolean = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(300).setScrollFactor(0);
  }

  public show(onStart: () => void): void {
    this.isOpen = true;
    this.container.removeAll(true);
    this.container.setVisible(true);

    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x0b0d13, 1.0);
    backdrop.fillRect(0, 0, 1280, 720);
    this.container.add(backdrop);

    // Decorative alchemy rune circles
    const runeGfx = this.scene.add.graphics();
    runeGfx.lineStyle(2, 0xd97706, 0.25);
    runeGfx.strokeCircle(640, 240, 170);
    runeGfx.strokeCircle(640, 240, 120);
    runeGfx.strokeRect(640 - 100, 240 - 100, 200, 200);
    this.container.add(runeGfx);

    // Game Title
    const title = this.scene.add.text(640, 180, 'EMBER VAULT', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '48px',
      color: '#f59e0b',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5);
    this.container.add(title);

    const subtitle = this.scene.add.text(640, 235, 'HẦM NGỤC GIẢ KIM & NGỌN LỬA BẤT DIỆT', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '16px',
      color: '#38bdf8',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.container.add(subtitle);

    const desc = this.scene.add.text(
      640,
      285,
      'Chiến đấu qua 8 phòng hầm ngục, thu thập vũ khí giả kim, nâng cấp sức mạnh\nvà đánh bại Đại Pháp Sư Ignis Ignifer để thoát khỏi mật thất!',
      {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '14px',
        color: '#94a3b8',
        align: 'center',
        lineSpacing: 6
      }
    ).setOrigin(0.5);
    this.container.add(desc);

    // Controls Guide Panel
    const ctrlBg = this.scene.add.graphics();
    ctrlBg.fillStyle(0x111827, 0.85);
    ctrlBg.fillRoundedRect(320, 335, 640, 175, 10);
    ctrlBg.lineStyle(1.5, 0x374151, 0.8);
    ctrlBg.strokeRoundedRect(320, 335, 640, 175, 10);
    this.container.add(ctrlBg);

    const ctrlTitle = this.scene.add.text(640, 352, 'HƯỚNG DẪN ĐIỀU KHIỂN & KỸ NĂNG', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '14px',
      color: '#f59e0b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(ctrlTitle);

    const ctrlItems = [
      'WASD / Mũi tên: Di chuyển mượt mà (đi chéo cân bằng)',
      'Chuột trái: Ngắm & Bắn liên tục theo tốc độ vũ khí',
      'Phím Space: Lướt né đòn (bất tử 0.2s, hồi chiêu)',
      'Phím F / Chuột phải: Tuyệt Kỹ Bình Hỏa Giả Kim (Nổ diện rộng, phá đạn)',
      'Phím Q: Đổi vũ khí  |  Phím E: Nhặt đồ, Mở rương, Mua hàng Shop',
      'Giáp nhận đòn trước máu, tự hồi lại sau 3 giây không dính đòn'
    ];
    ctrlItems.forEach((text, i) => {
      const line = this.scene.add.text(640, 378 + i * 19, text, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '12px',
        color: '#e2e8f0'
      }).setOrigin(0.5);
      this.container.add(line);
    });

    // Start Button
    const btnW = 260;
    const btnH = 50;
    const btnY = 550;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0xd97706, 1.0);
    btnBg.fillRoundedRect(640 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    btnBg.lineStyle(2, 0xfde68a, 0.9);
    btnBg.strokeRoundedRect(640 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    this.container.add(btnBg);

    const btnText = this.scene.add.text(640, btnY, 'BẮT ĐẦU CHINH PHỤC', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(btnText);

    const hitZone = this.scene.add.zone(640, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
    this.container.add(hitZone);

    hitZone.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0xf59e0b, 1.0);
      btnBg.fillRoundedRect(640 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
      btnBg.lineStyle(2, 0xffffff, 1.0);
      btnBg.strokeRoundedRect(640 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    });

    hitZone.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0xd97706, 1.0);
      btnBg.fillRoundedRect(640 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
      btnBg.lineStyle(2, 0xfde68a, 0.9);
      btnBg.strokeRoundedRect(640 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    });

    hitZone.on('pointerdown', () => {
      audio.init();
      audio.resume();
      audio.playPickup();
      this.hide();
      onStart();
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
