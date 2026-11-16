import Phaser from 'phaser';
import { audio } from '../core/AudioSystem';
import { controlSettings } from '../core/ControlSettings';
import { events } from '../core/EventBus';
import { HEROES, HERO_LIST, HeroId, SkillVariant, getHeroSkillMeta } from '../data/heroes';
import { DifficultyMode, DIFFICULTY_LABELS } from '../data/difficulty';
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

export function wrapHeroIndex(currentIndex: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((currentIndex + delta) % count) + count) % count;
}

export function getCarouselOffset(index: number, selectedIndex: number, count: number): number {
  if (count <= 0) return 0;
  let diff = (index - selectedIndex) % count;
  if (diff > count / 2) diff -= count;
  if (diff < -count / 2) diff += count;
  return diff;
}

export interface CarouselSlotLayout {
  offset: number;
  x: number;
  y: number;
  scale: number;
  alpha: number;
  visible: boolean;
  depth: number;
}

export function computeCarouselSlotLayout(offset: number): CarouselSlotLayout {
  const abs = Math.abs(offset);
  if (abs === 0) {
    return { offset, x: 640, y: 184, scale: 1.0, alpha: 1.0, visible: true, depth: 50 };
  }
  if (abs === 1) {
    return {
      offset,
      x: 640 + offset * 265,
      y: 190,
      scale: 0.78,
      alpha: 0.84,
      visible: true,
      depth: 30
    };
  }
  if (abs === 2) {
    const sign = offset > 0 ? 1 : -1;
    return {
      offset,
      x: 640 + sign * 448,
      y: 196,
      scale: 0.58,
      alpha: 0.52,
      visible: true,
      depth: 10
    };
  }
  const sign = offset > 0 ? 1 : -1;
  return {
    offset,
    x: 640 + sign * 535,
    y: 200,
    scale: 0.44,
    alpha: 0,
    visible: false,
    depth: 0
  };
}

export class TitleScreen {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  public isOpen: boolean = true;
  public selectedHeroId: HeroId = 'alchemist';
  public selectedSkillVariant: SkillVariant = 1;
  public selectedDifficultyMode: DifficultyMode = 'normal';
  private keyListener: ((event: { key?: string; code?: string; preventDefault?: () => void }) => void) | null = null;
  private rotateHeroHandler: ((delta: number) => void) | null = null;
  private selectSkillHandler: ((variant: SkillVariant) => void) | null = null;
  private confirmStartHandler: (() => void) | null = null;
  private inputBlocked: boolean = false;
  private ctrlLine1Text: Phaser.GameObjects.Text | null = null;
  private ctrlLine2Text: Phaser.GameObjects.Text | null = null;
  private controlsUpdatedCb = () => {
    this.refreshControlHints();
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(300).setScrollFactor(0);
    events.on('settings:controls-updated', this.controlsUpdatedCb);
  }

  public setInputBlocked(blocked: boolean): void {
    this.inputBlocked = blocked;
  }

  private refreshControlHints(): void {
    if (!this.isOpen) return;
    const up = controlSettings.getBindingLabel('moveUp');
    const left = controlSettings.getBindingLabel('moveLeft');
    const down = controlSettings.getBindingLabel('moveDown');
    const right = controlSettings.getBindingLabel('moveRight');
    const fire = controlSettings.getBindingLabel('fire');
    const dash = controlSettings.getBindingLabel('dash');
    const skill = controlSettings.getBindingLabel('skill');
    const swap = controlSettings.getBindingLabel('swapWeapon');
    const interact = controlSettings.getBindingLabel('interact');
    const drop = controlSettings.getBindingLabel('dropWeapon');
    this.ctrlLine1Text?.setText(`${up}${left}${down}${right}/Mũi tên: Di chuyển  |  [${fire}]/Chuột trái: Bắn`);
    this.ctrlLine2Text?.setText(`${dash}: Lướt | ${skill}/C.Phải: Skill | ${swap}: Đổi | ${interact}: Nhặt | ${drop}: Vứt`);
  }

  private detachKeyListener(): void {
    if (this.keyListener && this.scene.input?.keyboard?.off) {
      this.scene.input.keyboard.off('keydown', this.keyListener);
    }
    this.keyListener = null;
  }

  public rotateHero(delta: number): void {
    this.rotateHeroHandler?.(delta);
  }

  public handleKeyDown(event: { key?: string; code?: string; preventDefault?: () => void }): boolean {
    if (!this.isOpen || this.inputBlocked) return false;
    const code = event.code ?? '';
    const key = event.key ?? '';

    if (code === 'ArrowRight' || key === 'ArrowRight' || code === 'KeyD' || key === 'd' || key === 'D') {
      event.preventDefault?.();
      this.rotateHeroHandler?.(1);
      return true;
    }
    if (code === 'ArrowLeft' || key === 'ArrowLeft' || code === 'KeyA' || key === 'a' || key === 'A') {
      event.preventDefault?.();
      this.rotateHeroHandler?.(-1);
      return true;
    }
    if (code === 'Digit1' || key === '1') {
      this.selectSkillHandler?.(1);
      return true;
    }
    if (code === 'Digit2' || key === '2') {
      this.selectSkillHandler?.(2);
      return true;
    }
    if (code === 'Enter' || code === 'NumpadEnter' || key === 'Enter') {
      event.preventDefault?.();
      this.confirmStartHandler?.();
      return true;
    }
    return false;
  }

  public show(onStart: (heroId: HeroId, skillVariant: SkillVariant, difficultyMode: DifficultyMode) => void): void {
    this.isOpen = true;
    this.detachKeyListener();
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
    ctrlPill.fillRoundedRect(24, 14, 396, 54, 10);
    ctrlPill.lineStyle(1.5, 0x334155, 0.85);
    ctrlPill.strokeRoundedRect(24, 14, 396, 54, 10);
    this.container.add(ctrlPill);

    const ctrlLine1 = this.scene.add.text(38, 29, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11px',
      color: '#e2e8f0'
    }).setOrigin(0, 0.5);
    this.container.add(ctrlLine1);
    this.ctrlLine1Text = ctrlLine1;

    const ctrlLine2 = this.scene.add.text(38, 51, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11px',
      color: '#94a3b8'
    }).setOrigin(0, 0.5);
    this.container.add(ctrlLine2);
    this.ctrlLine2Text = ctrlLine2;
    this.refreshControlHints();

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

    const subtitle = this.scene.add.text(640, 62, '◀ / ▶ HOẶC A / D: XOAY TƯỚNG  •  1 / 2: ĐỔI SKILL  •  ENTER: VÀO TRẬN', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '12px',
      color: '#38bdf8',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.container.add(subtitle);

    // Top-right Meta Progression Status Badge (x: 946..1256 so Settings gear button at x: 902 stays unobstructed)
    const statusBadge = this.scene.add.graphics();
    statusBadge.fillStyle(0x111827, 0.92);
    statusBadge.fillRoundedRect(946, 14, 310, 54, 10);
    statusBadge.lineStyle(1.5, 0x0284c7, 0.9);
    statusBadge.strokeRoundedRect(946, 14, 310, 54, 10);
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

    // Horizontal Rotating Hero Carousel (X: 47..1233, Y: 79..315)
    const carouselLayer = this.scene.add.container(0, 0);
    this.container.add(carouselLayer);

    const cardW = 340;
    const cardH = 196;

    interface HeroCardRefs {
      id: HeroId;
      card: Phaser.GameObjects.Container;
      bg: Phaser.GameObjects.Graphics;
      pedestal: Phaser.GameObjects.Graphics;
      badgeBg: Phaser.GameObjects.Graphics;
      badgeText: Phaser.GameObjects.Text;
      lastOffset: number;
    }

    const cardRefs: HeroCardRefs[] = [];
    let selectedIndex = Math.max(
      0,
      HERO_LIST.findIndex(h => h.id === this.selectedHeroId)
    );
    this.selectedHeroId = HERO_LIST[selectedIndex].id;

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

    // Carousel Pagination Dots (Y = 301)
    const dotsGfx = this.scene.add.graphics();
    this.container.add(dotsGfx);
    const dotSpacing = 22;
    const dotStartX = 640 - ((HERO_LIST.length - 1) * dotSpacing) / 2;
    const dotY = 301;

    const redrawDots = () => {
      const hero = HEROES[this.selectedHeroId];
      dotsGfx.clear();
      HERO_LIST.forEach((h, i) => {
        const dx = dotStartX + i * dotSpacing;
        const isCurrent = i === selectedIndex;
        if (isCurrent) {
          dotsGfx.fillStyle(hero.accentColor, 1);
          dotsGfx.fillRoundedRect(dx - 8, dotY - 4, 16, 8, 4);
        } else {
          dotsGfx.fillStyle(0x475569, 0.85);
          dotsGfx.fillCircle(dx, dotY, 3.5);
        }
      });
    };

    const redrawCards = (animate: boolean) => {
      const total = HERO_LIST.length;

      cardRefs.forEach((ref, idx) => {
        const hero = HERO_LIST[idx];
        const offset = getCarouselOffset(idx, selectedIndex, total);
        const layout = computeCarouselSlotLayout(offset);
        const isSel = offset === 0;

        ref.bg.clear();
        ref.bg.fillStyle(isSel ? 0x172033 : 0x0f172a, isSel ? 0.98 : 0.9);
        ref.bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
        ref.bg.lineStyle(isSel ? 3 : 1.5, isSel ? hero.accentColor : 0x334155, isSel ? 1 : 0.75);
        ref.bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);

        ref.pedestal.clear();
        ref.pedestal.fillStyle(hero.accentColor, isSel ? 0.16 : 0.08);
        ref.pedestal.fillCircle(-100, -18, isSel ? 46 : 38);
        ref.pedestal.lineStyle(1.5, hero.accentColor, isSel ? 0.65 : 0.25);
        ref.pedestal.strokeCircle(-100, -18, isSel ? 46 : 38);

        const variant: SkillVariant = isSel ? this.selectedSkillVariant : 1;
        const meta = getHeroSkillMeta(hero.id, variant);
        const badgeW = 308;
        const badgeH = 28;
        const badgeY = 66;

        ref.badgeBg.clear();
        ref.badgeBg.fillStyle(isSel ? 0x0b1120 : 0x090d16, 0.96);
        ref.badgeBg.fillRoundedRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 7);
        ref.badgeBg.lineStyle(1, isSel ? hero.accentColor : 0x475569, isSel ? 0.95 : 0.6);
        ref.badgeBg.strokeRoundedRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 7);

        ref.badgeText.setText(`[S${variant}] ${meta.shortLabelVi} · ${meta.cooldown}s`);
        ref.badgeText.setColor(isSel ? hero.accentHex : '#fbbf24');

        ref.card.setDepth(layout.depth);

        if (!animate || !this.scene.tweens?.add) {
          ref.card.setPosition(layout.x, layout.y);
          ref.card.setScale(layout.scale);
          ref.card.setAlpha(layout.alpha);
          ref.card.setVisible(layout.visible);
        } else {
          this.scene.tweens.killTweensOf?.(ref.card);
          const wasHidden = Math.abs(ref.lastOffset) >= 3;
          if (wasHidden && layout.visible) {
            const enterX = offset > 0 ? 640 + 535 : 640 - 535;
            ref.card.setPosition(enterX, 200);
            ref.card.setScale(0.44);
            ref.card.setAlpha(0);
            ref.card.setVisible(true);
          } else if (layout.visible) {
            ref.card.setVisible(true);
          }

          // Prevent cards wrapping from -2 to +3 from crossing over center
          if (!wasHidden && Math.abs(offset - ref.lastOffset) > total / 2) {
            const jumpEdgeX = offset > 0 ? 640 + 535 : 640 - 535;
            ref.card.setPosition(jumpEdgeX, layout.y);
          }

          this.scene.tweens.add({
            targets: ref.card,
            x: layout.x,
            y: layout.y,
            scaleX: layout.scale,
            scaleY: layout.scale,
            alpha: layout.alpha,
            duration: 185,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              ref.card.setVisible(layout.visible);
            }
          });
        }

        ref.lastOffset = offset;
      });

      // Keep Phaser container draw order aligned with depth (back -> front)
      const ordered = [...cardRefs].sort((a, b) => a.card.depth - b.card.depth);
      ordered.forEach(item => carouselLayer.bringToTop?.(item.card));
      redrawDots();
    };

    const setSelectedIndex = (nextIdx: number, animate: boolean = true) => {
      selectedIndex = wrapHeroIndex(nextIdx, 0, HERO_LIST.length);
      this.selectedHeroId = HERO_LIST[selectedIndex].id;
      redrawCards(animate);
      refreshSkillBar();
    };

    const selectSkill = (variant: SkillVariant) => {
      audio.init();
      audio.resume();
      audio.playPickup();
      this.selectedSkillVariant = variant;
      redrawCards(false);
      refreshSkillBar();
    };

    s1Zone.on('pointerdown', () => selectSkill(1));
    s2Zone.on('pointerdown', () => selectSkill(2));

    HERO_LIST.forEach((hero, idx) => {
      const card = this.scene.add.container(640, 184);
      carouselLayer.add(card);

      const bg = this.scene.add.graphics();
      card.add(bg);

      const pedestal = this.scene.add.graphics();
      card.add(pedestal);

      const heroSprite = this.scene.add.sprite(-100, -20, `${hero.texturePrefix}_idle`).setScale(2.75);
      card.add(heroSprite);

      const weaponData = WEAPONS[hero.startWeapon];
      const nameText = this.scene.add.text(-36, -68, hero.nameVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '17px',
        color: hero.accentHex,
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      card.add(nameText);

      const roleText = this.scene.add.text(-36, -45, hero.roleVi, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11.5px',
        color: '#94a3b8'
      }).setOrigin(0, 0.5);
      card.add(roleText);

      const statsText = this.scene.add.text(
        -36,
        -19,
        `HP: ${hero.hp}  |  Giáp: ${hero.armor}  |  NL: ${hero.maxEnergy}`,
        {
          fontFamily: "'Segoe UI', Roboto, sans-serif",
          fontSize: '11.5px',
          color: '#e2e8f0',
          fontStyle: 'bold'
        }
      ).setOrigin(0, 0.5);
      card.add(statsText);

      const weaponIcon = this.scene.add.sprite(-24, 16, weaponData.iconTexture).setScale(1.0);
      card.add(weaponIcon);

      const weaponLabel = this.scene.add.text(-4, 16, `Khởi đầu: ${weaponData.nameVi}`, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '11.5px',
        color: '#cbd5e1'
      }).setOrigin(0, 0.5);
      card.add(weaponLabel);

      const badgeBg = this.scene.add.graphics();
      card.add(badgeBg);

      const badgeText = this.scene.add.text(0, 66, '', {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '12px',
        color: '#fbbf24',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      card.add(badgeText);

      const ref: HeroCardRefs = {
        id: hero.id,
        card,
        bg,
        pedestal,
        badgeBg,
        badgeText,
        lastOffset: getCarouselOffset(idx, selectedIndex, HERO_LIST.length)
      };
      cardRefs.push(ref);

      const cardZone = this.scene.add.zone(0, 0, cardW, cardH).setInteractive({ useHandCursor: true });
      card.add(cardZone);
      cardZone.on('pointerdown', () => {
        audio.init();
        audio.resume();
        audio.playPickup();
        setSelectedIndex(idx, true);
      });
    });

    // Left / Right Carousel Arrow Buttons
    const createArrowBtn = (bx: number, label: string, delta: number) => {
      const bw = 44;
      const bh = 74;
      const by = 186;
      const arrowBg = this.scene.add.graphics();
      const drawArrow = (hover: boolean) => {
        arrowBg.clear();
        arrowBg.fillStyle(hover ? 0x1e293b : 0x0f172a, 0.94);
        arrowBg.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 10);
        arrowBg.lineStyle(2, hover ? 0x38bdf8 : 0x475569, hover ? 1 : 0.85);
        arrowBg.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 10);
      };
      drawArrow(false);
      this.container.add(arrowBg);

      const arrowTxt = this.scene.add.text(bx, by, label, {
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        fontSize: '22px',
        color: '#e2e8f0',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.container.add(arrowTxt);

      const arrowZone = this.scene.add.zone(bx, by, bw, bh).setInteractive({ useHandCursor: true });
      this.container.add(arrowZone);

      arrowZone.on('pointerover', () => {
        drawArrow(true);
        arrowTxt.setColor('#38bdf8');
      });
      arrowZone.on('pointerout', () => {
        drawArrow(false);
        arrowTxt.setColor('#e2e8f0');
      });
      arrowZone.on('pointerdown', () => {
        audio.init();
        audio.resume();
        audio.playPickup();
        setSelectedIndex(wrapHeroIndex(selectedIndex, delta, HERO_LIST.length), true);
      });
    };

    createArrowBtn(46, '◀', -1);
    createArrowBtn(1234, '▶', 1);

    // Clickable dot hit zones
    HERO_LIST.forEach((_h, i) => {
      const dx = dotStartX + i * dotSpacing;
      const dotZone = this.scene.add.zone(dx, dotY, 18, 18).setInteractive({ useHandCursor: true });
      this.container.add(dotZone);
      dotZone.on('pointerdown', () => {
        audio.init();
        audio.resume();
        audio.playPickup();
        setSelectedIndex(i, true);
      });
    });

    redrawCards(false);
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

    // Start Row (cy = 574): Difficulty Toggle (left), Start Button (center), Tip Box (right)
    const btnW = 280;
    const btnH = 44;
    const btnY = 574;

    // Left: Difficulty Toggle Pill (x: 47..460, cy: 574, width: 413, height: 42)
    const diffX = 47;
    const diffW = 413;
    const diffH = 42;
    const diffCenterX = diffX + diffW / 2;
    let diffHovered = false;

    const diffBg = this.scene.add.graphics();
    this.container.add(diffBg);

    const diffText = this.scene.add.text(diffCenterX, btnY, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '13.5px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(diffText);

    const diffZone = this.scene.add.zone(diffCenterX, btnY, diffW, diffH).setInteractive({ useHandCursor: true });
    this.container.add(diffZone);

    // Right: Compact Difficulty / Scaling Tip Box (x: 820..1233, cy: 574, width: 413, height: 42)
    const tipX = 820;
    const tipW = 413;
    const tipH = 42;
    const tipCenterX = tipX + tipW / 2;

    const tipBg = this.scene.add.graphics();
    this.container.add(tipBg);

    const tipText = this.scene.add.text(tipCenterX, btnY, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11px',
      color: '#cbd5e1',
      align: 'center',
      wordWrap: { width: tipW - 24 }
    }).setOrigin(0.5);
    this.container.add(tipText);

    const refreshDifficultyUI = () => {
      const isBadass = this.selectedDifficultyMode === 'badass';
      const fillColor = isBadass ? (diffHovered ? 0x991b1b : 0x7f1d1d) : diffHovered ? 0x1e293b : 0x0f172a;
      const strokeColor = isBadass ? (diffHovered ? 0xfbbf24 : 0xef4444) : diffHovered ? 0x7dd3fc : 0x38bdf8;
      diffBg.clear();
      diffBg.fillStyle(fillColor, 0.96);
      diffBg.fillRoundedRect(diffX, btnY - diffH / 2, diffW, diffH, 10);
      diffBg.lineStyle(2, strokeColor, 0.95);
      diffBg.strokeRoundedRect(diffX, btnY - diffH / 2, diffW, diffH, 10);

      diffText.setText(isBadass ? 'CHẾ ĐỘ: [ÁC MỘNG 🔥 (+60% 💎)]' : 'CHẾ ĐỘ: [THƯỜNG]');
      diffText.setColor(isBadass ? '#fde68a' : '#e0f2fe');

      tipBg.clear();
      tipBg.fillStyle(0x111827, 0.9);
      tipBg.fillRoundedRect(tipX, btnY - tipH / 2, tipW, tipH, 10);
      tipBg.lineStyle(1.5, isBadass ? 0xb91c1c : 0x334155, 0.85);
      tipBg.strokeRoundedRect(tipX, btnY - tipH / 2, tipW, tipH, 10);

      tipText.setText(
        isBadass
          ? DIFFICULTY_LABELS.badass.descVi
          : 'Mỗi tầng sâu quái mạnh dần! Ác Mộng +60% Ngọc Hồn'
      );
      tipText.setColor(isBadass ? '#fca5a5' : '#cbd5e1');
    };

    refreshDifficultyUI();

    diffZone.on('pointerover', () => {
      diffHovered = true;
      refreshDifficultyUI();
    });

    diffZone.on('pointerout', () => {
      diffHovered = false;
      refreshDifficultyUI();
    });

    diffZone.on('pointerdown', () => {
      audio.init();
      audio.resume();
      this.selectedDifficultyMode = this.selectedDifficultyMode === 'normal' ? 'badass' : 'normal';
      if (this.selectedDifficultyMode === 'badass') {
        audio.playBossAlert();
      } else {
        audio.playPickup();
      }
      refreshDifficultyUI();
    });

    // Center: Start Button (x: 500..780, cx = 640, width: 280, height: 44)
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

    const triggerStart = () => {
      if (!this.isOpen) return;
      audio.init();
      audio.resume();
      audio.playPickup();
      this.hide();
      onStart(this.selectedHeroId, this.selectedSkillVariant, this.selectedDifficultyMode);
    };

    hitZone.on('pointerdown', triggerStart);

    this.rotateHeroHandler = (delta: number) => {
      audio.init();
      audio.resume();
      audio.playPickup();
      setSelectedIndex(wrapHeroIndex(selectedIndex, delta, HERO_LIST.length), true);
    };
    this.selectSkillHandler = selectSkill;
    this.confirmStartHandler = triggerStart;

    if (this.scene.input?.keyboard?.on) {
      this.keyListener = (event: { key?: string; code?: string; preventDefault?: () => void }) => {
        this.handleKeyDown(event);
      };
      this.scene.input.keyboard.on('keydown', this.keyListener);
    }

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
    this.detachKeyListener();
    this.container.setVisible(false);
  }

  public destroy(): void {
    events.off('settings:controls-updated', this.controlsUpdatedCb);
    this.detachKeyListener();
    this.container.destroy();
  }
}
