import Phaser from 'phaser';
import { audio } from '../core/AudioSystem';
import { HEROES, HERO_LIST, HeroId, SkillVariant, getHeroSkillMeta } from '../data/heroes';
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
  public selectedSkillVariant: SkillVariant = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(300).setScrollFactor(0);
  }

  public show(onStart: (heroId: HeroId, skillVariant: SkillVariant) => void): void {
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

    const subtitle = this.scene.add.text(640, 62, 'CHỌN 1 TRONG 8 ANH HÙNG, TUYỆT KỸ [F] & NÂNG CẤP VĨNH VIỄN', {
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

    // 8 Hero Class Selection Cards in crisp 4 x 2 Grid (X: 39..1241, Y: 79..315)
    const cardW = 290;
    const cardH = 114;
    const gapX = 14;
    const gapY = 8;
    const cols = 4;
    const gridStartX = 640 - (cardW * cols + gapX * (cols - 1)) / 2 + cardW / 2;
    const gridStartY = 136;

    const getCardPos = (idx: number) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      return {
        cx: gridStartX + col * (cardW + gapX),
        cy: gridStartY + row * (cardH + gapY)
      };
    };

    interface HeroCardRefs {
      bg: Phaser.GameObjects.Graphics;
      badgeBg: Phaser.GameObjects.Graphics;
      badgeText: Phaser.GameObjects.Text;
    }

    const cardRefs: Map<HeroId, HeroCardRefs> = new Map();

    // Skill 1 / Skill 2 Selector Bar (Y: 324..372, X: 47..1233)
    const skillBarBg = this.scene.add.graphics();
    skillBarBg.fillStyle(0x111827, 0.94);
    skillBarBg.fillRoundedRect(47, 324, 1186, 48, 10);
    skillBarBg.lineStyle(1.5, 0x334155, 0.85);
    skillBarBg.strokeRoundedRect(47, 324, 1186, 48, 10);
    this.container.add(skillBarBg);

    const sBtnW = 278;
    const sBtnH = 34;
    const sBtnY = 348;
    const s1BtnX = 197; // 58..336
    const s2BtnX = 485; // 346..624

    const s1Bg = this.scene.add.graphics();
    const s2Bg = this.scene.add.graphics();
    this.container.add(s1Bg);
    this.container.add(s2Bg);

    const s1Label = this.scene.add.text(s1BtnX, sBtnY, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11.5px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(s1Label);

    const s2Label = this.scene.add.text(s2BtnX, sBtnY, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11.5px',
      color: '#94a3b8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(s2Label);

    const skillBarDesc = this.scene.add.text(638, sBtnY, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11.5px',
      color: '#e2e8f0',
      wordWrap: { width: 582 }
    }).setOrigin(0, 0.5);
    this.container.add(skillBarDesc);

    const refreshSkillBar = () => {
      const hero = HEROES[this.selectedHeroId];
      const s1Meta = getHeroSkillMeta(this.selectedHeroId, 1);
      const s2Meta = getHeroSkillMeta(this.selectedHeroId, 2);
      const activeMeta = getHeroSkillMeta(this.selectedHeroId, this.selectedSkillVariant);

      const drawSkillBtn = (
        g: Phaser.GameObjects.Graphics,
        bx: number,
        label: Phaser.GameObjects.Text,
        text: string,
        selected: boolean
      ) => {
        g.clear();
        g.fillStyle(selected ? 0x1e293b : 0x0f172a, 0.96);
        g.fillRoundedRect(bx - sBtnW / 2, sBtnY - sBtnH / 2, sBtnW, sBtnH, 8);
        g.lineStyle(selected ? 2.5 : 1.5, selected ? hero.accentColor : 0x334155, selected ? 1 : 0.85);
        g.strokeRoundedRect(bx - sBtnW / 2, sBtnY - sBtnH / 2, sBtnW, sBtnH, 8);
        label.setText(text);
        label.setColor(selected ? hero.accentHex : '#94a3b8');
      };

      drawSkillBtn(
        s1Bg,
        s1BtnX,
        s1Label,
        `[S1] ${s1Meta.nameVi} (${s1Meta.cooldown}s)`,
        this.selectedSkillVariant === 1
      );
      drawSkillBtn(
        s2Bg,
        s2BtnX,
        s2Label,
        `[S2] ${s2Meta.nameVi} (${s2Meta.cooldown}s)`,
        this.selectedSkillVariant === 2
      );
      skillBarDesc.setText(`✦ ${activeMeta.nameVi}: ${activeMeta.descVi}`);
    };

    const s1Zone = this.scene.add.zone(s1BtnX, sBtnY, sBtnW, sBtnH).setInteractive({ useHandCursor: true });
    const s2Zone = this.scene.add.zone(s2BtnX, sBtnY, sBtnW, sBtnH).setInteractive({ useHandCursor: true });
    this.container.add(s1Zone);
    this.container.add(s2Zone);

    const redrawCards = () => {
      HERO_LIST.forEach((h, idx) => {
        const ref = cardRefs.get(h.id);
        if (!ref) return;
        const { cx, cy } = getCardPos(idx);
        const isSel = this.selectedHeroId === h.id;

        ref.bg.clear();
        ref.bg.fillStyle(isSel ? 0x1e293b : 0x111827, 0.94);
        ref.bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 10);
        ref.bg.lineStyle(isSel ? 3 : 1.5, isSel ? h.accentColor : 0x374151, isSel ? 1 : 0.8);
        ref.bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 10);

        const variant: SkillVariant = isSel ? this.selectedSkillVariant : 1;
        const meta = getHeroSkillMeta(h.id, variant);
        const badgeX = cx - 133;
        const badgeY = cy + 20;
        const badgeW = 144;
        const badgeH = 24;

        ref.badgeBg.clear();
        ref.badgeBg.fillStyle(isSel ? 0x0f172a : 0x0b1120, 0.95);
        ref.badgeBg.fillRoundedRect(badgeX, badgeY, badgeW, badgeH, 6);
        ref.badgeBg.lineStyle(1, isSel ? h.accentColor : 0x475569, isSel ? 0.95 : 0.7);
        ref.badgeBg.strokeRoundedRect(badgeX, badgeY, badgeW, badgeH, 6);

        ref.badgeText.setText(`[S${variant}] ${meta.shortLabelVi} · ${meta.cooldown}s`);
        ref.badgeText.setColor(isSel ? h.accentHex : '#fbbf24');
      });
    };

    s1Zone.on('pointerdown', () => {
      audio.init();
      audio.resume();
      audio.playPickup();
      this.selectedSkillVariant = 1;
      redrawCards();
      refreshSkillBar();
    });

    s2Zone.on('pointerdown', () => {
      audio.init();
      audio.resume();
      audio.playPickup();
      this.selectedSkillVariant = 2;
      redrawCards();
      refreshSkillBar();
    });

    HERO_LIST.forEach((hero, idx) => {
      const { cx, cy } = getCardPos(idx);
      const bg = this.scene.add.graphics();
      this.container.add(bg);

      const heroSprite = this.scene.add.sprite(cx - 108, cy - 16, `${hero.texturePrefix}_idle`).setScale(1.85);
      this.container.add(heroSprite);

      const weaponData = WEAPONS[hero.startWeapon];
      const weaponIcon = this.scene.add.sprite(cx + 120, cy - 30, weaponData.iconTexture).setScale(0.95);
      this.container.add(weaponIcon);

      const nameText = this.scene.add.text(cx - 72, cy - 39, hero.nameVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '13.5px',
        color: hero.accentHex,
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.container.add(nameText);

      const roleText = this.scene.add.text(cx - 72, cy - 21, hero.roleVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '10.5px',
        color: '#94a3b8'
      }).setOrigin(0, 0.5);
      this.container.add(roleText);

      const statsText = this.scene.add.text(
        cx - 72,
        cy - 2,
        `HP: ${hero.hp} | Giáp: ${hero.armor} | NL: ${hero.maxEnergy}`,
        {
          fontFamily: "'Segoe UI', Roboto, sans-serif",
          fontSize: '10.5px',
          color: '#e2e8f0',
          fontStyle: 'bold'
        }
      ).setOrigin(0, 0.5);
      this.container.add(statsText);

      const badgeBg = this.scene.add.graphics();
      this.container.add(badgeBg);

      const badgeText = this.scene.add.text(cx - 61, cy + 32, '', {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '10.5px',
        color: '#fbbf24',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.container.add(badgeText);

      const weaponLabel = this.scene.add.text(cx + 133, cy + 32, weaponData.nameVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '10.5px',
        color: '#cbd5e1'
      }).setOrigin(1, 0.5);
      this.container.add(weaponLabel);

      cardRefs.set(hero.id, { bg, badgeBg, badgeText });

      const cardZone = this.scene.add.zone(cx, cy, cardW, cardH).setInteractive({ useHandCursor: true });
      this.container.add(cardZone);
      cardZone.on('pointerdown', () => {
        audio.init();
        audio.resume();
        audio.playPickup();
        this.selectedHeroId = hero.id;
        redrawCards();
        refreshSkillBar();
      });
    });

    redrawCards();
    refreshSkillBar();

    // Sảnh Nâng Cấp Vĩnh Viễn (Y: 382..540, 5 compact upgrade cards)
    const upgradeSectionTitle = this.scene.add.text(640, 386, '✦ SẢNH NÂNG CẤP VĨNH VIỄN (NGỌC HỒN) ✦', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '13px',
      color: '#38bdf8',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.container.add(upgradeSectionTitle);

    const upgW = 226;
    const upgH = 124;
    const upgGap = 14;
    const upgCount = META_UPGRADE_IDS.length;
    const upgStartX = 640 - (upgW * upgCount + upgGap * (upgCount - 1)) / 2 + upgW / 2;
    const upgY = 466;

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
        const pipY = ref.uy + 14;
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
        const actionH = 26;
        const actionY = ref.uy + 40;
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

      const upgTitle = this.scene.add.text(ux, uy - 44, cfg.nameVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '12.5px',
        color: '#fbbf24',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: upgW - 20 }
      }).setOrigin(0.5);
      this.container.add(upgTitle);

      const upgDesc = this.scene.add.text(ux, uy - 16, cfg.descVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '10.5px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: { width: upgW - 20 },
        lineSpacing: 1
      }).setOrigin(0.5);
      this.container.add(upgDesc);

      const pipGfx = this.scene.add.graphics();
      this.container.add(pipGfx);

      const levelText = this.scene.add.text(ux + 68, uy + 14, 'Lv 0/3', {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11px',
        color: '#e2e8f0',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      this.container.add(levelText);

      const btnBg = this.scene.add.graphics();
      this.container.add(btnBg);

      const btnLabel = this.scene.add.text(ux, uy + 40, '', {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11.5px',
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

    // Start Button (Y: 552..596)
    const btnW = 300;
    const btnH = 44;
    const btnY = 574;

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
      onStart(this.selectedHeroId, this.selectedSkillVariant);
    });

    // Bottom concise Merge Hints & Companion tip bar (Y: 616..698)
    const footerBg = this.scene.add.graphics();
    footerBg.fillStyle(0x111827, 0.88);
    footerBg.fillRoundedRect(47, 616, 1186, 82, 10);
    footerBg.lineStyle(1.5, 0x374151, 0.8);
    footerBg.strokeRoundedRect(47, 616, 1186, 82, 10);
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

    const mergeHintText = this.scene.add.text(640, 640, `⚒️ Hợp Nhất Lò Rèn: ${mergeSummary}`, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11px',
      color: '#fbbf24',
      align: 'center',
      wordWrap: { width: 1156 }
    }).setOrigin(0.5);
    this.container.add(mergeHintText);

    const companionTip = this.scene.add.text(
      640,
      680,
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
