import Phaser from 'phaser';
import { audio } from '../core/AudioSystem';
import { controlSettings } from '../core/ControlSettings';
import { HEROES, HeroId, SkillVariant, getHeroSkillMeta } from '../data/heroes';

export interface PlayerInspectSnapshot {
  heroId: HeroId;
  heroNameVi: string;
  skillVariant: SkillVariant;
  skillNameVi: string;
  skillCooldownSec: number;
  skillDescVi: string;
  statueBlessing: 'knight' | 'sorcerer' | null;
  weapons: {
    nameVi: string;
    forgeLevel: number;
    coreNameVi: string | null;
    coreColorHex?: string;
    isActive: boolean;
  }[];
  upgrades: {
    id: string;
    nameVi: string;
    descVi: string;
    stacks: number;
    maxStacks: number;
  }[];
}

const FONT_FAMILY = "'Segoe UI', Roboto, sans-serif";

export class CharacterInspectModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  public isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(345).setScrollFactor(0).setVisible(false);
  }

  public show(snapshot: PlayerInspectSnapshot, onClose?: () => void): void {
    this.isOpen = true;
    this.onCloseCallback = onClose ?? null;
    this.container.removeAll(true);
    this.container.setVisible(true);

    const heroCfg = HEROES[snapshot.heroId];
    const skillMeta = heroCfg ? getHeroSkillMeta(snapshot.heroId, snapshot.skillVariant) : null;
    const accentColor = heroCfg?.accentColor ?? 0x38bdf8;
    const accentHex = heroCfg?.accentHex ?? '#38bdf8';
    const heroName = snapshot.heroNameVi || heroCfg?.nameVi || snapshot.heroId;
    const skillName = snapshot.skillNameVi || skillMeta?.nameVi || 'Kỹ năng';
    const cooldownSec = snapshot.skillCooldownSec ?? skillMeta?.cooldown ?? 0;
    const skillDesc = snapshot.skillDescVi || skillMeta?.descVi || '';

    // Dark backdrop + full-screen click blocker
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.82);
    backdrop.fillRect(0, 0, 1280, 720);
    this.container.add(backdrop);

    const blocker = this.scene.add.zone(640, 360, 1280, 720).setInteractive();
    this.container.add(blocker);

    // Main modal panel (680x540 centered at 640,360)
    const panel = this.scene.add.container(640, 360);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f172a, 0.98);
    bg.fillRoundedRect(-340, -270, 680, 540, 14);
    bg.lineStyle(2, accentColor, 0.92);
    bg.strokeRoundedRect(-340, -270, 680, 540, 14);
    panel.add(bg);

    const title = this.scene.add.text(0, -246, '📋 HỒ SƠ CHIẾN ĐẤU & KỸ NĂNG', {
      fontFamily: FONT_FAMILY,
      fontSize: '19px',
      color: '#f8fafc',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(title);

    // --- Section 1: Hero & Active Skill ---
    const heroBox = this.scene.add.graphics();
    heroBox.fillStyle(0x1e293b, 0.95);
    heroBox.fillRoundedRect(-312, -222, 624, 94, 10);
    heroBox.lineStyle(1.5, accentColor, 0.85);
    heroBox.strokeRoundedRect(-312, -222, 624, 94, 10);
    panel.add(heroBox);

    const heroTitleText = heroCfg?.roleVi ? `${heroName}  •  ${heroCfg.roleVi}` : heroName;
    panel.add(
      this.scene.add.text(-296, -203, heroTitleText, {
        fontFamily: FONT_FAMILY,
        fontSize: '14.5px',
        color: accentHex,
        fontStyle: 'bold'
      }).setOrigin(0, 0.5)
    );

    const skillBindLabel = controlSettings.getBindingLabel('skill');
    panel.add(
      this.scene.add.text(296, -203, `Hồi chiêu: ${cooldownSec}s  [${skillBindLabel} / C.Phải]`, {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: '#fde047',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5)
    );

    panel.add(
      this.scene.add.text(-296, -181, `Kỹ năng [S${snapshot.skillVariant}]: ${skillName}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '13.5px',
        color: '#f8fafc',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5)
    );

    panel.add(
      this.scene.add.text(-296, -165, skillDesc, {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: '#cbd5e1',
        wordWrap: { width: 592 },
        lineSpacing: 2
      }).setOrigin(0, 0)
    );

    // --- Section 2: Statue Blessing ---
    const statueStyle = this.getStatueMeta(snapshot.statueBlessing);
    const statueBox = this.scene.add.graphics();
    statueBox.fillStyle(0x172033, 0.95);
    statueBox.fillRoundedRect(-312, -120, 624, 32, 8);
    statueBox.lineStyle(1.5, statueStyle.borderColor, 0.9);
    statueBox.strokeRoundedRect(-312, -120, 624, 32, 8);
    panel.add(statueBox);

    panel.add(
      this.scene.add.text(-296, -104, `🗿 Phước Lành Tượng Cổ: ${statueStyle.label}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '12.5px',
        color: statueStyle.textColor,
        fontStyle: snapshot.statueBlessing ? 'bold' : 'normal'
      }).setOrigin(0, 0.5)
    );

    // --- Section 3: Equipped Weapons ---
    panel.add(
      this.scene.add.text(-312, -74, '⚔️ VŨ KHÍ ĐANG TRANG BỊ', {
        fontFamily: FONT_FAMILY,
        fontSize: '11.5px',
        color: '#f59e0b',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5)
    );

    for (let idx = 0; idx < 2; idx++) {
      const cardX = idx === 0 ? -312 : 8;
      const cardY = -60;
      const cardW = 304;
      const cardH = 62;
      const weapon = snapshot.weapons[idx];

      const wBg = this.scene.add.graphics();
      wBg.fillStyle(weapon?.isActive ? 0x1e293b : 0x111827, 0.95);
      wBg.fillRoundedRect(cardX, cardY, cardW, cardH, 8);
      wBg.lineStyle(1.5, weapon?.isActive ? 0x38bdf8 : 0x334155, 0.9);
      wBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 8);
      panel.add(wBg);

      if (weapon) {
        const forgeTag = weapon.forgeLevel > 0 ? ` (+${weapon.forgeLevel})` : '';
        const prefix = weapon.isActive ? '▶ ' : '';
        panel.add(
          this.scene.add.text(cardX + 12, cardY + 18, `${prefix}${weapon.nameVi}${forgeTag}`, {
            fontFamily: FONT_FAMILY,
            fontSize: '12px',
            color: weapon.isActive ? '#38bdf8' : '#e2e8f0',
            fontStyle: 'bold'
          }).setOrigin(0, 0.5)
        );

        panel.add(
          this.scene.add.text(cardX + cardW - 12, cardY + 18, weapon.isActive ? 'ĐANG DÙNG' : 'DỰ PHÒNG', {
            fontFamily: FONT_FAMILY,
            fontSize: '10.5px',
            color: weapon.isActive ? '#4ade80' : '#64748b',
            fontStyle: 'bold'
          }).setOrigin(1, 0.5)
        );

        const coreLabel = weapon.coreNameVi ? `Lõi: ${weapon.coreNameVi}` : 'Lõi nguyên tố: Chưa gắn';
        const coreColor = weapon.coreNameVi ? weapon.coreColorHex || '#fbbf24' : '#64748b';
        panel.add(
          this.scene.add.text(cardX + 12, cardY + 42, coreLabel, {
            fontFamily: FONT_FAMILY,
            fontSize: '11.5px',
            color: coreColor,
            fontStyle: weapon.coreNameVi ? 'bold' : 'normal'
          }).setOrigin(0, 0.5)
        );
      } else {
        panel.add(
          this.scene.add.text(cardX + cardW / 2, cardY + cardH / 2, idx === 0 ? 'Chưa có vũ khí' : 'Ô vũ khí phụ (Trống)', {
            fontFamily: FONT_FAMILY,
            fontSize: '12px',
            color: '#64748b'
          }).setOrigin(0.5)
        );
      }
    }

    // --- Section 4: Active Run Upgrades ---
    panel.add(
      this.scene.add.text(-312, 18, `✨ NÂNG CẤP GIẢ KIM ĐANG KÍCH HOẠT (${snapshot.upgrades.length})`, {
        fontFamily: FONT_FAMILY,
        fontSize: '11.5px',
        color: '#22c55e',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5)
    );

    if (snapshot.upgrades.length === 0) {
      const emptyBox = this.scene.add.graphics();
      emptyBox.fillStyle(0x111827, 0.78);
      emptyBox.fillRoundedRect(-312, 32, 624, 176, 10);
      emptyBox.lineStyle(1, 0x334155, 0.85);
      emptyBox.strokeRoundedRect(-312, 32, 624, 176, 10);
      panel.add(emptyBox);

      panel.add(
        this.scene.add.text(0, 120, 'Chưa nhận nâng cấp nào trong lượt chơi này.\nHãy tìm Bệ Đá Giả Kim trong hầm ngục để cường hóa!', {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: '#94a3b8',
          align: 'center'
        }).setOrigin(0.5)
      );
    } else {
      const visibleUpgrades = snapshot.upgrades.slice(0, 8);
      const overflowCount = snapshot.upgrades.length - visibleUpgrades.length;
      const rows = Math.ceil(visibleUpgrades.length / 2);
      const availH = overflowCount > 0 ? 162 : 180;
      const gapY = rows <= 3 ? 5 : 3;
      const cardH = Math.floor((availH - Math.max(0, rows - 1) * gapY) / rows);
      const cardW = 304;

      visibleUpgrades.forEach((upg, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cx = col === 0 ? -312 : 8;
        const cy = 32 + row * (cardH + gapY);

        const uBg = this.scene.add.graphics();
        uBg.fillStyle(0x111827, 0.92);
        uBg.fillRoundedRect(cx, cy, cardW, cardH, 7);
        uBg.lineStyle(1, 0x334155, 0.9);
        uBg.strokeRoundedRect(cx, cy, cardW, cardH, 7);
        panel.add(uBg);

        panel.add(
          this.scene.add.text(cx + 10, cy + 9, upg.nameVi, {
            fontFamily: FONT_FAMILY,
            fontSize: '11.5px',
            color: '#fbbf24',
            fontStyle: 'bold'
          }).setOrigin(0, 0.5)
        );

        const maxed = upg.stacks >= upg.maxStacks;
        panel.add(
          this.scene.add.text(cx + cardW - 10, cy + 9, `Lv.${upg.stacks}/${upg.maxStacks}`, {
            fontFamily: FONT_FAMILY,
            fontSize: '10.5px',
            color: maxed ? '#4ade80' : '#38bdf8',
            fontStyle: 'bold'
          }).setOrigin(1, 0.5)
        );

        panel.add(
          this.scene.add.text(cx + 10, cy + 17, upg.descVi, {
            fontFamily: FONT_FAMILY,
            fontSize: rows <= 3 ? '10px' : '9.5px',
            color: '#cbd5e1',
            wordWrap: { width: cardW - 20 }
          }).setOrigin(0, 0)
        );
      });

      if (overflowCount > 0) {
        const extraNames = snapshot.upgrades
          .slice(8)
          .map(u => `${u.nameVi} (Lv.${u.stacks}/${u.maxStacks})`)
          .join(', ');
        panel.add(
          this.scene.add.text(0, 203, `+${overflowCount} nâng cấp khác: ${extraNames}`, {
            fontFamily: FONT_FAMILY,
            fontSize: '10px',
            color: '#94a3b8',
            align: 'center',
            wordWrap: { width: 610 }
          }).setOrigin(0.5)
        );
      }
    }

    // --- Close Button [ESC / TAB] ---
    this.createCloseButton(panel, 0, 240, 230, 34, 'ĐÓNG [ESC / TAB]');
    this.container.add(panel);
  }

  private getStatueMeta(blessing: 'knight' | 'sorcerer' | null): {
    label: string;
    borderColor: number;
    textColor: string;
  } {
    if (blessing === 'knight') {
      return {
        label: 'Phước Lành Kỵ Sĩ (Bắn vòng đạn tỏa khi dùng kỹ năng)',
        borderColor: 0xf59e0b,
        textColor: '#fbbf24'
      };
    }
    if (blessing === 'sorcerer') {
      return {
        label: 'Phước Lành Pháp Sư (Phóng tên lửa đuổi khi dùng kỹ năng)',
        borderColor: 0xa855f7,
        textColor: '#c084fc'
      };
    }
    return {
      label: 'Chưa nhận',
      borderColor: 0x475569,
      textColor: '#94a3b8'
    };
  }

  private createCloseButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string
  ): void {
    const bg = this.scene.add.graphics();
    bg.setPosition(x, y);
    bg.fillStyle(0x0284c7, 1.0);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(1.5, 0x7dd3fc, 0.95);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    parent.add(bg);

    const txt = this.scene.add.text(x, y, label, {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    parent.add(txt);

    const zone = this.scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      audio.playPickup?.();
      this.close();
    });
    parent.add(zone);
  }

  private close(): void {
    this.hide();
    const cb = this.onCloseCallback;
    this.onCloseCallback = null;
    cb?.();
  }

  public hide(): void {
    this.isOpen = false;
    this.container.setVisible(false);
  }

  public destroy(): void {
    this.onCloseCallback = null;
    this.container.destroy();
  }
}
