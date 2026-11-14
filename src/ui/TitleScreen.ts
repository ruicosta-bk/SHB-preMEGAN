import Phaser from 'phaser';
import { audio } from '../core/AudioSystem';
import { HERO_LIST, HeroId } from '../data/heroes';
import { WEAPONS } from '../data/weapons';

export class TitleScreen {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  public isOpen: boolean = true;
  public selectedHeroId: HeroId = 'alchemist';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(300).setScrollFactor(0);
  }

  public show(onStart: (heroId: HeroId) => void): void {
    this.isOpen = true;
    this.container.removeAll(true);
    this.container.setVisible(true);

    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x0b0d13, 1.0);
    backdrop.fillRect(0, 0, 1280, 720);
    this.container.add(backdrop);

    // Decorative alchemy rune circles
    const runeGfx = this.scene.add.graphics();
    runeGfx.lineStyle(2, 0xd97706, 0.22);
    runeGfx.strokeCircle(640, 100, 130);
    runeGfx.strokeCircle(640, 100, 92);
    this.container.add(runeGfx);

    // Game Title
    const title = this.scene.add.text(640, 62, 'EMBER VAULT', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '44px',
      color: '#f59e0b',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5);
    this.container.add(title);

    const subtitle = this.scene.add.text(640, 108, 'CHỌN ANH HÙNG & CHINH PHỤC HẦM NGỤC GIẢ KIM', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '15px',
      color: '#38bdf8',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.container.add(subtitle);

    // 3 Hero Class Selection Cards
    const cardW = 300;
    const cardH = 192;
    const gap = 22;
    const startX = 640 - (cardW * 3 + gap * 2) / 2 + cardW / 2;
    const cardY = 242;

    const cardBgs: Map<HeroId, Phaser.GameObjects.Graphics> = new Map();

    const redrawCards = () => {
      for (const h of HERO_LIST) {
        const g = cardBgs.get(h.id);
        if (!g) continue;
        const idx = HERO_LIST.indexOf(h);
        const cx = startX + idx * (cardW + gap);
        const isSel = this.selectedHeroId === h.id;
        g.clear();
        g.fillStyle(isSel ? 0x1e293b : 0x111827, 0.94);
        g.fillRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 10);
        g.lineStyle(isSel ? 3 : 1.5, isSel ? h.accentColor : 0x374151, isSel ? 1 : 0.8);
        g.strokeRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 10);
      }
    };

    HERO_LIST.forEach((hero, idx) => {
      const cx = startX + idx * (cardW + gap);
      const bg = this.scene.add.graphics();
      cardBgs.set(hero.id, bg);
      this.container.add(bg);

      const heroSprite = this.scene.add.sprite(cx - 102, cardY - 46, `${hero.texturePrefix}_idle`).setScale(2.4);
      this.container.add(heroSprite);

      const weaponData = WEAPONS[hero.startWeapon];
      const weaponIcon = this.scene.add.sprite(cx + 116, cardY - 54, weaponData.iconTexture).setScale(1.1);
      this.container.add(weaponIcon);

      const nameText = this.scene.add.text(cx - 64, cardY - 68, hero.nameVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '16px',
        color: hero.accentHex,
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.container.add(nameText);

      const roleText = this.scene.add.text(cx - 64, cardY - 47, hero.roleVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11px',
        color: '#94a3b8'
      }).setOrigin(0, 0.5);
      this.container.add(roleText);

      const statsText = this.scene.add.text(
        cx - 132,
        cardY - 12,
        `Máu: ${hero.hp}   |   Giáp: ${hero.armor}   |   NL: ${hero.maxEnergy}`,
        {
          fontFamily: "'Segoe UI', Roboto, sans-serif",
          fontSize: '12px',
          color: '#e2e8f0',
          fontStyle: 'bold'
        }
      ).setOrigin(0, 0.5);
      this.container.add(statsText);

      const weaponLine = this.scene.add.text(
        cx - 132,
        cardY + 10,
        `Khởi đầu: ${weaponData.nameVi}`,
        {
          fontFamily: "'Segoe UI', Roboto, sans-serif",
          fontSize: '11px',
          color: '#cbd5e1'
        }
      ).setOrigin(0, 0.5);
      this.container.add(weaponLine);

      const skillTitle = this.scene.add.text(
        cx - 132,
        cardY + 34,
        `[F] ${hero.skillNameVi}`,
        {
          fontFamily: "'Segoe UI', Roboto, sans-serif",
          fontSize: '12px',
          color: '#fbbf24',
          fontStyle: 'bold'
        }
      ).setOrigin(0, 0.5);
      this.container.add(skillTitle);

      const skillDesc = this.scene.add.text(cx - 132, cardY + 50, hero.skillDescVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11px',
        color: '#94a3b8',
        wordWrap: { width: cardW - 28 },
        lineSpacing: 3
      }).setOrigin(0, 0);
      this.container.add(skillDesc);

      const cardZone = this.scene.add.zone(cx, cardY, cardW, cardH).setInteractive({ useHandCursor: true });
      this.container.add(cardZone);
      cardZone.on('pointerdown', () => {
        audio.init();
        audio.resume();
        audio.playPickup();
        this.selectedHeroId = hero.id;
        redrawCards();
      });
    });

    redrawCards();

    // Controls Guide Panel
    const ctrlBg = this.scene.add.graphics();
    ctrlBg.fillStyle(0x111827, 0.85);
    ctrlBg.fillRoundedRect(310, 360, 660, 150, 10);
    ctrlBg.lineStyle(1.5, 0x374151, 0.8);
    ctrlBg.strokeRoundedRect(310, 360, 660, 150, 10);
    this.container.add(ctrlBg);

    const ctrlTitle = this.scene.add.text(640, 378, 'HƯỚNG DẪN & BẠN ĐỒNG HÀNH CƠ KHÍ', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '13px',
      color: '#f59e0b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(ctrlTitle);

    const ctrlItems = [
      'WASD / Mũi tên: Di chuyển mượt  |  Chuột trái: Ngắm & Bắn 360°',
      'Space: Lướt né đòn (bất tử 0.2s)  |  F / Chuột phải: Tuyệt Kỹ Anh Hùng',
      'Q: Đổi vũ khí  |  E: Nhặt đồ, Mở rương, Cầu nguyện Tượng Thần, Mua Shop',
      'Golem Cơ Khí luôn đi cùng: tự bắn hỗ trợ, nhặt vàng từ xa & chặn 1 viên đạn mỗi 6s'
    ];
    ctrlItems.forEach((text, i) => {
      const line = this.scene.add.text(640, 405 + i * 24, text, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '12px',
        color: '#e2e8f0'
      }).setOrigin(0.5);
      this.container.add(line);
    });

    // Start Button
    const btnW = 280;
    const btnH = 52;
    const btnY = 576;

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
      onStart(this.selectedHeroId);
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
