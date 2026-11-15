import Phaser from 'phaser';
import { WeaponData } from '../types/weapon';

export class FloatingNumbers {
  private scene: Phaser.Scene;
  private interactionText: Phaser.GameObjects.Text;

  // Ground weapon stats comparison tooltip
  private weaponTooltipContainer: Phaser.GameObjects.Container;
  private tooltipBg: Phaser.GameObjects.Graphics;
  private tooltipTitleText: Phaser.GameObjects.Text;
  private tooltipDamageText: Phaser.GameObjects.Text;
  private tooltipDeltaText: Phaser.GameObjects.Text;
  private tooltipStatsRestText: Phaser.GameObjects.Text;
  private tooltipTagsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.interactionText = scene.add.text(0, 0, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '14px',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      padding: { x: 8, y: 4 }
    }).setDepth(50).setVisible(false).setOrigin(0.5);

    this.weaponTooltipContainer = scene.add.container(0, 0).setDepth(51).setVisible(false);
    this.tooltipBg = scene.add.graphics();

    const baseStyle = {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      stroke: '#000000',
      strokeThickness: 2
    };

    this.tooltipTitleText = scene.add.text(0, 0, '', {
      ...baseStyle,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#f8fafc'
    }).setOrigin(0.5, 0);

    this.tooltipDamageText = scene.add.text(0, 0, '', {
      ...baseStyle,
      fontSize: '11px',
      color: '#f8fafc'
    }).setOrigin(0, 0);

    this.tooltipDeltaText = scene.add.text(0, 0, '', {
      ...baseStyle,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#4ade80'
    }).setOrigin(0, 0);

    this.tooltipStatsRestText = scene.add.text(0, 0, '', {
      ...baseStyle,
      fontSize: '11px',
      color: '#cbd5e1'
    }).setOrigin(0, 0);

    this.tooltipTagsText = scene.add.text(0, 0, '', {
      ...baseStyle,
      fontSize: '10px',
      color: '#94a3b8'
    }).setOrigin(0.5, 0);

    this.weaponTooltipContainer.add([
      this.tooltipBg,
      this.tooltipTitleText,
      this.tooltipDamageText,
      this.tooltipDeltaText,
      this.tooltipStatsRestText,
      this.tooltipTagsText
    ]);
  }

  public showDamage(x: number, y: number, amount: number, isCrit: boolean = false): void {
    const textStr = isCrit ? `${Math.ceil(amount)}! CHÍ MẠNG` : `${Math.ceil(amount)}`;
    const color = isCrit ? '#f43f5e' : '#ffffff';
    const fontSize = isCrit ? '16px' : '13px';

    const text = this.scene.add.text(x + (Math.random() - 0.5) * 12, y - 10, textStr, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize,
      fontStyle: isCrit ? 'bold' : 'normal',
      color,
      stroke: '#000000',
      strokeThickness: 3
    }).setDepth(45).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 32,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });
  }

  public showPrompt(x: number, y: number, promptText: string): void {
    this.interactionText.setPosition(x, y - 30);
    this.interactionText.setText(promptText);
    this.interactionText.setVisible(true);
  }

  public showNotice(x: number, y: number, message: string, color: string = '#f59e0b'): void {
    const text = this.scene.add.text(x, y - 10, message, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '13px',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 3
    }).setDepth(45).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 28,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });
  }

  public showWeaponTooltip(
    x: number,
    y: number,
    promptTitle: string,
    dropped: WeaponData,
    equipped: WeaponData,
    mergeNameVi?: string | null
  ): void {
    const borderColor = mergeNameVi
      ? 0x22d3ee
      : dropped.tier === 2
        ? 0xfacc15
        : 0x64748b;

    const titleColor = mergeNameVi
      ? '#67e8f9'
      : dropped.tier === 2
        ? '#fef08a'
        : '#f8fafc';

    this.tooltipTitleText.setText(promptTitle).setColor(titleColor);

    const dmgDelta = dropped.damage - equipped.damage;
    this.tooltipDamageText.setText(`ST: ${dropped.damage}`);
    if (dmgDelta > 0) {
      this.tooltipDeltaText.setText(` (+${dmgDelta})`).setColor('#4ade80').setVisible(true);
    } else if (dmgDelta < 0) {
      this.tooltipDeltaText.setText(` (${dmgDelta})`).setColor('#f87171').setVisible(true);
    } else {
      this.tooltipDeltaText.setText('').setVisible(false);
    }

    this.tooltipStatsRestText.setText(` | NL: ${dropped.energyCost} | Tốc: ${dropped.fireRate.toFixed(1)}/s`);

    const tags: string[] = [];
    if (mergeNameVi) tags.push(`★ Hợp nhất -> ${mergeNameVi}`);
    if (dropped.tier === 2) tags.push('[Huyền Thoại]');
    if (dropped.category === 'beam') tags.push('[Laser]');
    if (dropped.isBoomerang) tags.push('[Bumerang]');
    if (dropped.category === 'bow') tags.push('[Cung]');
    if (dropped.category === 'melee') tags.push('[Cận Chiến]');
    if (dropped.appliesChill || dropped.isFrostNova) tags.push('[Băng]');
    if (dropped.appliesBurn || dropped.id === 'staff') tags.push('[Lửa]');
    if (dropped.isChainLightning) tags.push('[Sét]');
    if (dropped.pierceCount > 0 && dropped.pierceCount < 99) tags.push(`[Xuyên ${dropped.pierceCount}]`);

    const tagsLine = tags.join(' ');
    const hasTags = tagsLine.length > 0;
    this.tooltipTagsText.setText(tagsLine).setVisible(hasTags);
    this.tooltipTagsText.setColor(mergeNameVi ? '#22d3ee' : dropped.tier === 2 ? '#fde047' : '#94a3b8');

    const line2Width =
      this.tooltipDamageText.width +
      (dmgDelta !== 0 ? this.tooltipDeltaText.width : 0) +
      this.tooltipStatsRestText.width;
    const contentWidth = Math.max(
      this.tooltipTitleText.width,
      line2Width,
      hasTags ? this.tooltipTagsText.width : 0
    );
    const cardW = Math.max(200, Math.ceil(contentWidth) + 22);
    const cardH = hasTags ? 66 : 48;

    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(0x0a0e17, 0.94);
    this.tooltipBg.fillRoundedRect(-cardW / 2, -cardH, cardW, cardH, 7);
    this.tooltipBg.lineStyle(1.5, borderColor, 0.95);
    this.tooltipBg.strokeRoundedRect(-cardW / 2, -cardH, cardW, cardH, 7);

    const topY = -cardH + 7;
    this.tooltipTitleText.setPosition(0, topY);

    const line2Y = topY + 19;
    let cursorX = -line2Width / 2;
    this.tooltipDamageText.setPosition(cursorX, line2Y);
    cursorX += this.tooltipDamageText.width;
    if (dmgDelta !== 0) {
      this.tooltipDeltaText.setPosition(cursorX, line2Y);
      cursorX += this.tooltipDeltaText.width;
    }
    this.tooltipStatsRestText.setPosition(cursorX, line2Y);

    if (hasTags) {
      this.tooltipTagsText.setPosition(0, line2Y + 17);
    }

    this.weaponTooltipContainer.setPosition(x, y - 48);
    this.weaponTooltipContainer.setVisible(true);
  }

  public hideWeaponTooltip(): void {
    this.weaponTooltipContainer.setVisible(false);
  }

  public hidePrompt(): void {
    this.interactionText.setVisible(false);
    this.hideWeaponTooltip();
  }

  public destroy(): void {
    this.hideWeaponTooltip();
    this.interactionText.destroy();
    this.weaponTooltipContainer.destroy();
  }
}
