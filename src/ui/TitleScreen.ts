import Phaser from 'phaser';
import { audio } from '../core/AudioSystem';
import { HERO_LIST, HeroId } from '../data/heroes';
import { WEAPONS } from '../data/weapons';
import { getAllRecipesForDisplay } from '../data/merges';
import {
  loadMetaState,
  META_UPGRADE_IDS,
  META_UPGRADES,
  MetaUpgradeId,
  getNextUpgradeCost,
  purchaseMetaUpgrade
} from '../core/MetaProgression';

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
    runeGfx.strokeCircle(640, 52, 86);
    runeGfx.strokeCircle(640, 52, 60);
    this.container.add(runeGfx);

    // Top-left compact controls pill
    const ctrlPill = this.scene.add.graphics();
    ctrlPill.fillStyle(0x111827, 0.9);
    ctrlPill.fillRoundedRect(24, 14, 376, 54, 10);
    ctrlPill.lineStyle(1.5, 0x334155, 0.85);
    ctrlPill.strokeRoundedRect(24, 14, 376, 54, 10);
    this.container.add(ctrlPill);

    const ctrlLine1 = this.scene.add.text(38, 29, 'WASD/Mũi tên: Di chuyển  |  Chuột trái: Bắn 360°', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11px',
      color: '#e2e8f0'
    }).setOrigin(0, 0.5);
    this.container.add(ctrlLine1);

    const ctrlLine2 = this.scene.add.text(38, 51, 'Space: Lướt (0.2s) | F/Chuột phải: Skill | Q: Đổi | E: Tương tác', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11px',
      color: '#94a3b8'
    }).setOrigin(0, 0.5);
    this.container.add(ctrlLine2);

    // Game Title
    const title = this.scene.add.text(640, 30, 'EMBER VAULT', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '34px',
      color: '#f59e0b',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 7
    }).setOrigin(0.5);
    this.container.add(title);

    const subtitle = this.scene.add.text(640, 62, 'CHỌN 1 TRONG 6 ANH HÙNG & NÂNG CẤP VĨNH VIỄN', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '12.5px',
      color: '#38bdf8',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.container.add(subtitle);

    // Top-right Meta Progression Status Badge
    const statusBadge = this.scene.add.graphics();
    statusBadge.fillStyle(0x111827, 0.92);
    statusBadge.fillRoundedRect(880, 14, 376, 54, 10);
    statusBadge.lineStyle(1.5, 0x0284c7, 0.9);
    statusBadge.strokeRoundedRect(880, 14, 376, 54, 10);
    this.container.add(statusBadge);

    const gemStatusText = this.scene.add.text(1240, 29, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '15px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);
    this.container.add(gemStatusText);

    const recordStatusText = this.scene.add.text(1240, 51, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11.5px',
      color: '#fde047'
    }).setOrigin(1, 0.5);
    this.container.add(recordStatusText);

    // 6 Hero Class Selection Cards in crisp 3 x 2 Grid
    const cardW = 382;
    const cardH = 124;
    const gapX = 18;
    const gapY = 10;
    const cols = 3;
    const gridStartX = 640 - (cardW * cols + gapX * (cols - 1)) / 2 + cardW / 2;
    const gridStartY = 148;

    const getCardPos = (idx: number) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      return {
        cx: gridStartX + col * (cardW + gapX),
        cy: gridStartY + row * (cardH + gapY)
      };
    };

    const cardBgs: Map<HeroId, Phaser.GameObjects.Graphics> = new Map();

    const redrawCards = () => {
      HERO_LIST.forEach((h, idx) => {
        const g = cardBgs.get(h.id);
        if (!g) return;
        const { cx, cy } = getCardPos(idx);
        const isSel = this.selectedHeroId === h.id;
        g.clear();
        g.fillStyle(isSel ? 0x1e293b : 0x111827, 0.94);
        g.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 10);
        g.lineStyle(isSel ? 3 : 1.5, isSel ? h.accentColor : 0x374151, isSel ? 1 : 0.8);
        g.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 10);
      });
    };

    HERO_LIST.forEach((hero, idx) => {
      const { cx, cy } = getCardPos(idx);
      const bg = this.scene.add.graphics();
      cardBgs.set(hero.id, bg);
      this.container.add(bg);

      const heroSprite = this.scene.add.sprite(cx - 146, cy - 26, `${hero.texturePrefix}_idle`).setScale(1.9);
      this.container.add(heroSprite);

      const weaponData = WEAPONS[hero.startWeapon];
      const weaponIcon = this.scene.add.sprite(cx + 154, cy - 35, weaponData.iconTexture).setScale(1.0);
      this.container.add(weaponIcon);

      const nameText = this.scene.add.text(cx - 106, cy - 44, hero.nameVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '15px',
        color: hero.accentHex,
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.container.add(nameText);

      const roleText = this.scene.add.text(cx - 106, cy - 26, hero.roleVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11px',
        color: '#94a3b8'
      }).setOrigin(0, 0.5);
      this.container.add(roleText);

      const statsText = this.scene.add.text(
        cx - 106,
        cy - 8,
        `Máu: ${hero.hp} | Giáp: ${hero.armor} | NL: ${hero.maxEnergy}`,
        {
          fontFamily: "'Segoe UI', Roboto, sans-serif",
          fontSize: '11px',
          color: '#e2e8f0',
          fontStyle: 'bold'
        }
      ).setOrigin(0, 0.5);
      this.container.add(statsText);

      const skillTitle = this.scene.add.text(
        cx - 170,
        cy + 14,
        `[F] ${hero.skillNameVi} (${weaponData.nameVi})`,
        {
          fontFamily: "'Segoe UI', Roboto, sans-serif",
          fontSize: '11.5px',
          color: '#fbbf24',
          fontStyle: 'bold'
        }
      ).setOrigin(0, 0.5);
      this.container.add(skillTitle);

      const skillDesc = this.scene.add.text(cx - 170, cy + 26, hero.skillDescVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11px',
        color: '#cbd5e1',
        wordWrap: { width: cardW - 34 },
        lineSpacing: 2
      }).setOrigin(0, 0);
      this.container.add(skillDesc);

      const cardZone = this.scene.add.zone(cx, cy, cardW, cardH).setInteractive({ useHandCursor: true });
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

    // Sảnh Nâng Cấp Vĩnh Viễn (5 compact upgrade cards)
    const upgradeSectionTitle = this.scene.add.text(640, 366, '✦ SẢNH NÂNG CẤP VĨNH VIỄN (NGỌC HỒN) ✦', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '13.5px',
      color: '#38bdf8',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.container.add(upgradeSectionTitle);

    const upgW = 226;
    const upgH = 148;
    const upgGap = 14;
    const upgCount = META_UPGRADE_IDS.length;
    const upgStartX = 640 - (upgW * upgCount + upgGap * (upgCount - 1)) / 2 + upgW / 2;
    const upgY = 460;

    interface UpgradeCardRefs {
      id: MetaUpgradeId;
      ux: number;
      uy: number;
      bg: Phaser.GameObjects.Graphics;
      pipGfx: Phaser.GameObjects.Graphics;
      levelText: Phaser.GameObjects.Text;
      btnBg: Phaser.GameObjects.Graphics;
      btnLabel: Phaser.GameObjects.Text;
      hovered: boolean;
    }

    const upgradeRefs: UpgradeCardRefs[] = [];

    const refreshMetaUI = () => {
      const state = loadMetaState();
      gemStatusText.setText(`💎 Ngọc Hồn: ${state.gems}`);
      recordStatusText.setText(`🏆 Chiến Thắng: ${state.victories} | Tầng cao nhất: ${state.bestFloorCode}`);

      upgradeRefs.forEach((ref) => {
        const cfg = META_UPGRADES[ref.id];
        const level = state.upgrades[ref.id] ?? 0;
        const nextCost = getNextUpgradeCost(ref.id);
        const isMax = nextCost === null || level >= cfg.maxLevel;
        const canAfford = !isMax && nextCost !== null && state.gems >= nextCost;

        ref.bg.clear();
        ref.bg.fillStyle(ref.hovered && canAfford ? 0x1e293b : 0x111827, 0.94);
        ref.bg.fillRoundedRect(ref.ux - upgW / 2, ref.uy - upgH / 2, upgW, upgH, 10);
        const borderColor = isMax ? 0x22c55e : canAfford ? (ref.hovered ? 0x38bdf8 : 0x0284c7) : 0x334155;
        ref.bg.lineStyle(canAfford || isMax ? 2 : 1.5, borderColor, canAfford || isMax ? 0.95 : 0.75);
        ref.bg.strokeRoundedRect(ref.ux - upgW / 2, ref.uy - upgH / 2, upgW, upgH, 10);

        ref.pipGfx.clear();
        const pipW = 24;
        const pipH = 7;
        const pipGap = 6;
        const pipStartX = ref.ux - 68;
        const pipY = ref.uy + 16;
        for (let i = 0; i < cfg.maxLevel; i++) {
          const filled = i < level;
          ref.pipGfx.fillStyle(filled ? 0x38bdf8 : 0x1e293b, 1);
          ref.pipGfx.fillRoundedRect(pipStartX + i * (pipW + pipGap), pipY - pipH / 2, pipW, pipH, 3);
          ref.pipGfx.lineStyle(1, filled ? 0x7dd3fc : 0x475569, 0.9);
          ref.pipGfx.strokeRoundedRect(pipStartX + i * (pipW + pipGap), pipY - pipH / 2, pipW, pipH, 3);
        }

        ref.levelText.setText(`Lv ${level}/${cfg.maxLevel}`);
        ref.levelText.setColor(isMax ? '#4ade80' : '#e2e8f0');

        ref.btnBg.clear();
        const actionW = 192;
        const actionH = 28;
        const actionY = ref.uy + 47;
        const btnFill = isMax ? 0x14532d : canAfford ? (ref.hovered ? 0x0ea5e9 : 0x0284c7) : 0x1e293b;
        const btnStroke = isMax ? 0x22c55e : canAfford ? 0x7dd3fc : 0x475569;
        ref.btnBg.fillStyle(btnFill, 1);
        ref.btnBg.fillRoundedRect(ref.ux - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);
        ref.btnBg.lineStyle(1, btnStroke, 0.9);
        ref.btnBg.strokeRoundedRect(ref.ux - actionW / 2, actionY - actionH / 2, actionW, actionH, 6);

        if (isMax) {
          ref.btnLabel.setText('ĐÃ TỐI ĐA');
          ref.btnLabel.setColor('#86efac');
        } else if (canAfford) {
          ref.btnLabel.setText(`NÂNG CẤP · 💎 ${nextCost}`);
          ref.btnLabel.setColor('#ffffff');
        } else {
          ref.btnLabel.setText(`CẦN 💎 ${nextCost}`);
          ref.btnLabel.setColor('#94a3b8');
        }
      });
    };

    META_UPGRADE_IDS.forEach((id, idx) => {
      const cfg = META_UPGRADES[id];
      const ux = upgStartX + idx * (upgW + upgGap);
      const uy = upgY;

      const bg = this.scene.add.graphics();
      this.container.add(bg);

      const upgTitle = this.scene.add.text(ux, uy - 50, cfg.nameVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '13px',
        color: '#fbbf24',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: upgW - 20 }
      }).setOrigin(0.5);
      this.container.add(upgTitle);

      const upgDesc = this.scene.add.text(ux, uy - 17, cfg.descVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: { width: upgW - 22 },
        lineSpacing: 2
      }).setOrigin(0.5);
      this.container.add(upgDesc);

      const pipGfx = this.scene.add.graphics();
      this.container.add(pipGfx);

      const levelText = this.scene.add.text(ux + 68, uy + 16, 'Lv 0/3', {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11.5px',
        color: '#e2e8f0',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      this.container.add(levelText);

      const btnBg = this.scene.add.graphics();
      this.container.add(btnBg);

      const btnLabel = this.scene.add.text(ux, uy + 47, '', {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.container.add(btnLabel);

      const ref: UpgradeCardRefs = {
        id,
        ux,
        uy,
        bg,
        pipGfx,
        levelText,
        btnBg,
        btnLabel,
        hovered: false
      };
      upgradeRefs.push(ref);

      const upgZone = this.scene.add.zone(ux, uy, upgW, upgH).setInteractive({ useHandCursor: true });
      this.container.add(upgZone);

      upgZone.on('pointerover', () => {
        ref.hovered = true;
        refreshMetaUI();
      });

      upgZone.on('pointerout', () => {
        ref.hovered = false;
        refreshMetaUI();
      });

      upgZone.on('pointerdown', () => {
        audio.init();
        audio.resume();
        if (purchaseMetaUpgrade(id)) {
          audio.playGemReward();
          refreshMetaUI();
        }
      });
    });

    refreshMetaUI();

    // Start Button
    const btnW = 300;
    const btnH = 48;
    const btnY = 584;

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

    // Bottom concise Merge Hints & Companion tip bar
    const footerBg = this.scene.add.graphics();
    footerBg.fillStyle(0x111827, 0.88);
    footerBg.fillRoundedRect(47, 626, 1186, 72, 10);
    footerBg.lineStyle(1.5, 0x374151, 0.8);
    footerBg.strokeRoundedRect(47, 626, 1186, 72, 10);
    this.container.add(footerBg);

    const recipes = getAllRecipesForDisplay();
    const groupedHints = new Map<string, string[]>();
    recipes.forEach((recipe) => {
      const a = WEAPONS[recipe.inputs[0]].nameVi;
      const b = WEAPONS[recipe.inputs[1]].nameVi;
      const list = groupedHints.get(recipe.nameVi) ?? [];
      list.push(`${a} + ${b}`);
      groupedHints.set(recipe.nameVi, list);
    });
    const mergeSummary = Array.from(groupedHints.entries())
      .map(([resultName, pairs]) => `${pairs.join(' / ')} → ${resultName}`)
      .join('   |   ');

    const mergeHintText = this.scene.add.text(640, 646, `⚒️ Hợp Nhất Lò Rèn: ${mergeSummary}`, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11px',
      color: '#fbbf24',
      align: 'center',
      wordWrap: { width: 1156 }
    }).setOrigin(0.5);
    this.container.add(mergeHintText);

    const companionTip = this.scene.add.text(
      640,
      682,
      '🦊 Cáo Lửa Đồng Hành: tự lao tấn công & chặn 1 đạn mỗi 6s; tự hút vàng/NL/máu từ xa  •  Esc: Tạm dừng',
      {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11.5px',
        color: '#94a3b8'
      }
    ).setOrigin(0.5);
    this.container.add(companionTip);
  }

  public hide(): void {
    this.isOpen = false;
    this.container.setVisible(false);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
