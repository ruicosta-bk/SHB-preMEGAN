import Phaser from 'phaser';
import { events } from '../core/EventBus';
import { controlSettings } from '../core/ControlSettings';
import { WeaponCoreId, WeaponData } from '../types/weapon';
import { RoomState } from '../types/room';
import { DifficultyMode } from '../data/difficulty';
import { getWeaponCore } from '../data/weaponCores';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Resource bars & texts
  private hpBar: Phaser.GameObjects.Graphics;
  private hpText: Phaser.GameObjects.Text;
  private armorBar: Phaser.GameObjects.Graphics;
  private armorText: Phaser.GameObjects.Text;
  private energyBar: Phaser.GameObjects.Graphics;
  private energyText: Phaser.GameObjects.Text;
  private dashBar: Phaser.GameObjects.Graphics;
  private dashText: Phaser.GameObjects.Text;
  private skillBar: Phaser.GameObjects.Graphics;
  private skillText: Phaser.GameObjects.Text;
  private coinIcon: Phaser.GameObjects.Sprite;
  private coinText: Phaser.GameObjects.Text;

  // Weapon icons & texts
  private curWeaponIcon: Phaser.GameObjects.Sprite;
  private curWeaponText: Phaser.GameObjects.Text;
  private curWeaponSubtext: Phaser.GameObjects.Text;
  private secWeaponIcon: Phaser.GameObjects.Sprite;
  private secWeaponText: Phaser.GameObjects.Text;

  // Boss bar
  private bossContainer: Phaser.GameObjects.Container;
  private bossBar: Phaser.GameObjects.Graphics;
  private bossNameText: Phaser.GameObjects.Text;
  private bossHpText: Phaser.GameObjects.Text;

  // Dynamic Hero Skill Label
  private skillShortLabel: string = 'BÌNH HỎA';
  private skillColorHex: string = '#ef4444';
  private skillColorNum: number = 0xef4444;

  // Minimap
  private minimapGraphics: Phaser.GameObjects.Graphics;
  private roomTitleText: Phaser.GameObjects.Text;
  private difficultyBadge: Phaser.GameObjects.Container;
  private lastDashProgress: number = 1;
  private lastDashReady: boolean = true;
  private lastSkillProgress: number = 1;
  private lastSkillReady: boolean = true;
  private lastCurWeapon: WeaponData | null = null;
  private lastSecWeapon: WeaponData | null = null;
  private lastCurCore: WeaponCoreId | null | undefined = null;
  private lastSecCore: WeaponCoreId | null | undefined = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(100).setScrollFactor(0);

    const fontStyle = {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '13px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    };

    // --- 1. PLAYER STATS (Top-Left) ---
    // Background panel
    const statsBg = scene.add.graphics();
    statsBg.fillStyle(0x0a0e17, 0.75);
    statsBg.fillRoundedRect(16, 16, 230, 156, 8);
    statsBg.lineStyle(1.5, 0x334155, 0.8);
    statsBg.strokeRoundedRect(16, 16, 230, 156, 8);
    this.container.add(statsBg);

    // HP Bar
    this.hpBar = scene.add.graphics();
    this.container.add(this.hpBar);
    this.hpText = scene.add.text(125, 25, 'HP: 6/6', { ...fontStyle, fontSize: '12px' }).setOrigin(0.5, 0);
    this.container.add(this.hpText);

    // Armor Bar
    this.armorBar = scene.add.graphics();
    this.container.add(this.armorBar);
    this.armorText = scene.add.text(125, 47, 'GIÁP: 5/5', { ...fontStyle, fontSize: '12px' }).setOrigin(0.5, 0);
    this.container.add(this.armorText);

    // Energy Bar
    this.energyBar = scene.add.graphics();
    this.container.add(this.energyBar);
    this.energyText = scene.add.text(125, 69, 'NĂNG LƯỢNG: 180/180', { ...fontStyle, fontSize: '12px' }).setOrigin(0.5, 0);
    this.container.add(this.energyText);

    // Dash Bar
    this.dashBar = scene.add.graphics();
    this.container.add(this.dashBar);
    this.dashText = scene.add.text(125, 91, `LƯỚT [${controlSettings.getBindingLabel('dash')}]: SẴN SÀNG`, { ...fontStyle, fontSize: '11px', color: '#f59e0b' }).setOrigin(0.5, 0);
    this.container.add(this.dashText);

    // Skill Bar (Hero Skill)
    this.skillBar = scene.add.graphics();
    this.container.add(this.skillBar);
    this.skillText = scene.add.text(125, 113, `BÌNH HỎA [${controlSettings.getBindingLabel('skill')}]: SẴN SÀNG`, { ...fontStyle, fontSize: '11px', color: '#ef4444' }).setOrigin(0.5, 0);
    this.container.add(this.skillText);

    // Coins (Gold)
    this.coinIcon = scene.add.sprite(42, 148, 'pickup_coin').setScale(1.1);
    this.container.add(this.coinIcon);
    this.coinText = scene.add.text(56, 140, 'VÀNG: 0', { ...fontStyle, fontSize: '12px', color: '#f59e0b' });
    this.container.add(this.coinText);

    // --- 2. WEAPONS (Bottom-Right) ---
    const weaponBg = scene.add.graphics();
    weaponBg.fillStyle(0x0a0e17, 0.8);
    weaponBg.fillRoundedRect(1020, 615, 240, 90, 8);
    weaponBg.lineStyle(1.5, 0x334155, 0.8);
    weaponBg.strokeRoundedRect(1020, 615, 240, 90, 8);
    this.container.add(weaponBg);

    this.curWeaponIcon = scene.add.sprite(1055, 660, 'icon_pistol').setScale(1.2);
    this.container.add(this.curWeaponIcon);

    this.curWeaponText = scene.add.text(1090, 626, 'Súng Lục', { ...fontStyle, fontSize: '14px', color: '#38bdf8' });
    this.container.add(this.curWeaponText);

    this.curWeaponSubtext = scene.add.text(1090, 648, 'NL: 0 | ST: 3', {
      ...fontStyle,
      fontSize: '11px',
      color: '#94a3b8',
      wordWrap: { width: 120 },
      lineSpacing: 2
    });
    this.container.add(this.curWeaponSubtext);

    this.secWeaponIcon = scene.add.sprite(1225, 660, 'icon_shotgun').setScale(0.8).setAlpha(0.5);
    this.container.add(this.secWeaponIcon);

    this.secWeaponText = scene.add.text(1225, 688, `[${controlSettings.getBindingLabel('swapWeapon')}] Đổi`, { ...fontStyle, fontSize: '11px', color: '#64748b' }).setOrigin(0.5, 0);
    this.container.add(this.secWeaponText);

    // --- 3. MINIMAP (Top-Right) ---
    const mapBg = scene.add.graphics();
    mapBg.fillStyle(0x0a0e17, 0.75);
    mapBg.fillRoundedRect(1090, 16, 175, 125, 8);
    mapBg.lineStyle(1.5, 0x334155, 0.8);
    mapBg.strokeRoundedRect(1090, 16, 175, 125, 8);
    this.container.add(mapBg);

    this.minimapGraphics = scene.add.graphics();
    this.container.add(this.minimapGraphics);

    this.roomTitleText = scene.add.text(1178, 122, '[1-1] Sảnh Xuất Phát', { ...fontStyle, fontSize: '10px', color: '#cbd5e1' }).setOrigin(0.5, 0);
    this.container.add(this.roomTitleText);

    // Subtle Nightmare Mode pill under Minimap (x: 1090..1174, y: 145..163), clear of FPS (x ~ 1185..1260, y: 146)
    this.difficultyBadge = scene.add.container(1090, 145).setVisible(false);
    const diffBadgeBg = scene.add.graphics();
    diffBadgeBg.fillStyle(0x450a0a, 0.9);
    diffBadgeBg.fillRoundedRect(0, 0, 84, 18, 5);
    diffBadgeBg.lineStyle(1, 0xef4444, 0.95);
    diffBadgeBg.strokeRoundedRect(0, 0, 84, 18, 5);
    const diffBadgeText = scene.add.text(42, 9, '🔥 ÁC MỘNG', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '10px',
      color: '#fca5a5',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.difficultyBadge.add([diffBadgeBg, diffBadgeText]);
    this.container.add(this.difficultyBadge);

    // --- 4. BOSS HEALTH BAR (Top-Center) ---
    this.bossContainer = scene.add.container(640, 35).setVisible(false);
    this.container.add(this.bossContainer);

    const bossBarBg = scene.add.graphics();
    bossBarBg.fillStyle(0x0a0e17, 0.85);
    bossBarBg.fillRoundedRect(-220, 0, 440, 32, 6);
    bossBarBg.lineStyle(1.5, 0xb91c1c, 0.9);
    bossBarBg.strokeRoundedRect(-220, 0, 440, 32, 6);
    this.bossContainer.add(bossBarBg);

    this.bossBar = scene.add.graphics();
    this.bossContainer.add(this.bossBar);

    this.bossNameText = scene.add.text(0, -21, 'Ignis Ignifer - Đại Pháp Sư Luyện Kim', {
      ...fontStyle,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fde68a',
      strokeThickness: 4
    }).setOrigin(0.5, 0);
    this.bossContainer.add(this.bossNameText);

    this.bossHpText = scene.add.text(0, 7, '150 / 150 (Giai đoạn 1)', {
      ...fontStyle,
      fontSize: '12px',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.bossContainer.add(this.bossHpText);

    // Setup event listeners
    this.setupEvents();
  }

  private setupEvents(): void {
    events.on('player:stats-changed', (stats: any) => {
      this.updateStats(stats);
    });

    events.on('player:dash-cooldown', (data: any) => {
      this.updateDash(data.progress, data.isReady);
    });

    events.on('player:skill-cooldown', (data: any) => {
      this.updateSkill(data.progress, data.isReady);
    });

    events.on('player:hero-selected', (data: { skillShortLabelVi: string; accentHex: string; accentColor: number; difficultyMode?: DifficultyMode }) => {
      this.skillShortLabel = data.skillShortLabelVi || 'KỸ NĂNG';
      this.skillColorHex = data.accentHex || '#ef4444';
      this.skillColorNum = data.accentColor || 0xef4444;
      this.difficultyBadge.setVisible(data.difficultyMode === 'badass');
      this.updateSkill(1, true);
    });

    events.on('player:weapon-swapped', (data: {
      current: WeaponData;
      secondary: WeaponData | null;
      currentCore?: WeaponCoreId | null;
      secondaryCore?: WeaponCoreId | null;
    }) => {
      this.updateWeapons(data.current, data.secondary, data.currentCore, data.secondaryCore);
    });

    events.on('player:coins-changed', (data: any) => {
      this.coinText.setText(`VÀNG: ${data.coins}`);
    });

    events.on('combat:boss-stats', (data: any) => {
      this.updateBoss(data);
    });

    events.on('floor:changed', (meta: { code: string; biomeNameVi: string; accentHex: string }) => {
      this.bossContainer.setVisible(false);
      this.roomTitleText.setColor(meta.accentHex || '#cbd5e1');
    });

    events.on('room:entered', (data: any) => {
      this.roomTitleText.setText(data.room.titleVi);
    });

    events.on('settings:controls-updated', () => {
      this.updateDash(this.lastDashProgress, this.lastDashReady);
      this.updateSkill(this.lastSkillProgress, this.lastSkillReady);
      if (this.lastCurWeapon) {
        this.updateWeapons(this.lastCurWeapon, this.lastSecWeapon, this.lastCurCore, this.lastSecCore);
      }
    });
  }

  public updateStats(stats: { hp: number; maxHp: number; armor: number; maxArmor: number; energy: number; maxEnergy: number }): void {
    const barW = 180;
    const barH = 16;
    const startX = 35;

    // HP Bar (Red)
    this.hpBar.clear();
    this.hpBar.fillStyle(0x450a0a, 0.8);
    this.hpBar.fillRect(startX, 24, barW, barH);
    const hpPct = Math.max(0, Math.min(1, stats.hp / stats.maxHp));
    this.hpBar.fillStyle(0xef4444, 1.0);
    this.hpBar.fillRect(startX, 24, barW * hpPct, barH);
    this.hpText.setText(`HP: ${Math.ceil(stats.hp)} / ${stats.maxHp}`);

    // Armor Bar (Cyan/Blue)
    this.armorBar.clear();
    this.armorBar.fillStyle(0x082f49, 0.8);
    this.armorBar.fillRect(startX, 46, barW, barH);
    const armorPct = Math.max(0, Math.min(1, stats.armor / stats.maxArmor));
    this.armorBar.fillStyle(0x0ea5e9, 1.0);
    this.armorBar.fillRect(startX, 46, barW * armorPct, barH);
    this.armorText.setText(`GIÁP: ${Math.ceil(stats.armor)} / ${stats.maxArmor}`);

    // Energy Bar (Emerald Green)
    this.energyBar.clear();
    this.energyBar.fillStyle(0x052e16, 0.8);
    this.energyBar.fillRect(startX, 68, barW, barH);
    const energyPct = Math.max(0, Math.min(1, stats.energy / stats.maxEnergy));
    this.energyBar.fillStyle(0x22c55e, 1.0);
    this.energyBar.fillRect(startX, 68, barW * energyPct, barH);
    this.energyText.setText(`NL: ${Math.ceil(stats.energy)} / ${stats.maxEnergy}`);
  }

  public updateDash(progress: number, isReady: boolean): void {
    this.lastDashProgress = progress;
    this.lastDashReady = isReady;
    const barW = 180;
    const barH = 10;
    const startX = 35;

    this.dashBar.clear();
    this.dashBar.fillStyle(0x3f3f46, 0.8);
    this.dashBar.fillRect(startX, 94, barW, barH);

    this.dashBar.fillStyle(isReady ? 0xf59e0b : 0x71717a, 1.0);
    this.dashBar.fillRect(startX, 94, barW * progress, barH);

    this.dashText.setText(isReady ? `LƯỚT [${controlSettings.getBindingLabel('dash')}]: SẴN SÀNG` : 'LƯỚT: ĐANG HỒI...');
    this.dashText.setColor(isReady ? '#f59e0b' : '#94a3b8');
  }

  public updateSkill(progress: number, isReady: boolean): void {
    this.lastSkillProgress = progress;
    this.lastSkillReady = isReady;
    const barW = 180;
    const barH = 10;
    const startX = 35;

    this.skillBar.clear();
    this.skillBar.fillStyle(0x3f3f46, 0.8);
    this.skillBar.fillRect(startX, 116, barW, barH);

    this.skillBar.fillStyle(isReady ? this.skillColorNum : 0x71717a, 1.0);
    this.skillBar.fillRect(startX, 116, barW * progress, barH);

    this.skillText.setText(isReady ? `${this.skillShortLabel} [${controlSettings.getBindingLabel('skill')}]: SẴN SÀNG` : `${this.skillShortLabel}: ĐANG HỒI...`);
    this.skillText.setColor(isReady ? this.skillColorHex : '#94a3b8');
  }

  public updateWeapons(
    cur: WeaponData,
    sec: WeaponData | null,
    curCoreId?: WeaponCoreId | null,
    secCoreId?: WeaponCoreId | null
  ): void {
    this.lastCurWeapon = cur;
    this.lastSecWeapon = sec;
    this.lastCurCore = curCoreId;
    this.lastSecCore = secCoreId;
    this.curWeaponIcon.setTexture(cur.iconTexture);
    this.curWeaponText.setText(cur.nameVi);

    const curCore = getWeaponCore(curCoreId);
    const baseStats = `NL: ${cur.energyCost} | ST: ${cur.damage}`;
    if (curCore) {
      this.curWeaponSubtext.setText(`${baseStats} • LÕI ${curCore.shortLabelVi}`);
      this.curWeaponSubtext.setColor(curCore.colorHex);
    } else {
      this.curWeaponSubtext.setText(baseStats);
      this.curWeaponSubtext.setColor('#94a3b8');
    }

    if (sec) {
      const secCore = getWeaponCore(secCoreId);
      this.secWeaponIcon.setTexture(sec.iconTexture).setVisible(true);
      const swapLabel = controlSettings.getBindingLabel('swapWeapon');
      if (secCore) {
        this.secWeaponText.setText(`[${swapLabel}] • ${secCore.shortLabelVi}`).setColor(secCore.colorHex);
      } else {
        this.secWeaponText.setText(`[${swapLabel}] Đổi`).setColor('#94a3b8');
      }
    } else {
      this.secWeaponIcon.setVisible(false);
      this.secWeaponText.setText('Trống').setColor('#475569');
    }
  }

  public updateBoss(data: { currentHp: number; maxHp: number; phase: number; nameVi: string; isDead: boolean }): void {
    if (data.isDead) {
      this.bossContainer.setVisible(false);
      return;
    }
    this.bossContainer.setVisible(true);
    const isPhase2 = data.phase >= 2;
    this.bossNameText.setText(isPhase2 ? `☠ ${data.nameVi} [CUỒNG NỘ]` : data.nameVi);
    this.bossNameText.setColor(isPhase2 ? '#fbbf24' : '#fde68a');
    this.bossHpText.setText(`${Math.ceil(data.currentHp)} / ${data.maxHp} (Giai đoạn ${data.phase})`);
    this.bossHpText.setColor(isPhase2 ? '#fef08a' : '#ffffff');

    const barW = 432;
    const barH = 24;
    const pct = Math.max(0, Math.min(1, data.currentHp / data.maxHp));
    const fillW = barW * pct;

    this.bossBar.clear();
    this.bossBar.fillStyle(isPhase2 ? 0x450a0a : 0x291509, 0.92);
    this.bossBar.fillRect(-216, 4, barW, barH);

    if (fillW > 0) {
      this.bossBar.fillStyle(isPhase2 ? 0xdc2626 : 0xd97706, 1.0);
      this.bossBar.fillRect(-216, 4, fillW, barH);
      this.bossBar.fillStyle(isPhase2 ? 0xf59e0b : 0xfbbf24, 0.45);
      this.bossBar.fillRect(-216, 4, fillW, 5);
    }

    this.bossBar.lineStyle(1.5, isPhase2 ? 0xf59e0b : 0xb91c1c, 0.95);
    this.bossBar.strokeRoundedRect(-220, 0, 440, 32, 6);
  }

  public renderMinimap(rooms: RoomState[], currentIdx: number): void {
    this.minimapGraphics.clear();
    if (!rooms || rooms.length === 0) return;

    // Minimap panel is (1090, 16, 175, 125); keep grid strictly above roomTitleText (y: 122)
    const boxCenterX = 1090 + 175 / 2;
    const boxCenterY = 70;

    const visibleRooms = rooms.filter(r => r.isVisited || r.index === 0 || r.type === 'boss');
    if (visibleRooms.length === 0) return;

    let minGX = Infinity;
    let maxGX = -Infinity;
    let minGY = Infinity;
    let maxGY = -Infinity;
    for (const r of visibleRooms) {
      if (r.gridX < minGX) minGX = r.gridX;
      if (r.gridX > maxGX) maxGX = r.gridX;
      if (r.gridY < minGY) minGY = r.gridY;
      if (r.gridY > maxGY) maxGY = r.gridY;
    }

    const spanX = Math.max(1, maxGX - minGX + 1);
    const spanY = Math.max(1, maxGY - minGY + 1);
    const maxStepX = Math.floor(150 / spanX);
    const maxStepY = Math.floor(90 / spanY);
    const step = Math.max(12, Math.min(28, Math.min(maxStepX, maxStepY)));
    const cellW = Math.max(10, Math.floor(step * 0.68));
    const cellH = Math.max(8, Math.floor(step * 0.56));

    const gridWidthPx = (maxGX - minGX) * step + cellW;
    const gridHeightPx = (maxGY - minGY) * step + cellH;
    const originX = boxCenterX - gridWidthPx / 2;
    const originY = boxCenterY - gridHeightPx / 2;

    const posOf = (r: RoomState) => ({
      x: originX + (r.gridX - minGX) * step,
      y: originY + (r.gridY - minGY) * step
    });

    // Draw connecting corridor lines first
    this.minimapGraphics.lineStyle(2, 0x64748b, 0.75);
    const visibleSet = new Set(visibleRooms.map(r => r.index));
    for (const r of visibleRooms) {
      const p1 = posOf(r);
      for (const d of r.doors) {
        if (!visibleSet.has(d.targetRoomIndex) || d.targetRoomIndex < r.index) continue;
        const target = rooms[d.targetRoomIndex];
        if (!target) continue;
        const p2 = posOf(target);
        this.minimapGraphics.beginPath();
        this.minimapGraphics.moveTo(p1.x + cellW / 2, p1.y + cellH / 2);
        this.minimapGraphics.lineTo(p2.x + cellW / 2, p2.y + cellH / 2);
        this.minimapGraphics.strokePath();
      }
    }

    // Draw room nodes and distinct markers
    for (const r of visibleRooms) {
      const { x: px, y: py } = posOf(r);
      const cx = px + cellW / 2;
      const cy = py + cellH / 2;
      const isCurrent = r.index === currentIdx;

      let color = 0x475569;
      if (r.type === 'boss') {
        color = 0xef4444;
      } else if (r.type === 'treasure') {
        color = 0xf59e0b;
      } else if (r.type === 'rest') {
        color = 0xa855f7;
      } else if (isCurrent) {
        color = 0x0284c7;
      } else if (r.isCleared) {
        color = 0x16a34a;
      }

      const alpha = isCurrent ? 0.98 : r.isVisited ? 0.9 : r.type === 'boss' ? 0.65 : 0.45;
      this.minimapGraphics.fillStyle(color, alpha);
      this.minimapGraphics.fillRoundedRect(px, py, cellW, cellH, 3);

      // Distinct room type pips
      if (r.type === 'boss') {
        const dr = Math.max(2.6, Math.min(cellW, cellH) * 0.34);
        this.minimapGraphics.fillStyle(0xfef08a, 1.0);
        this.minimapGraphics.fillPoints([
          { x: cx, y: cy - dr },
          { x: cx + dr, y: cy },
          { x: cx, y: cy + dr },
          { x: cx - dr, y: cy }
        ], true);
        this.minimapGraphics.lineStyle(0.9, 0xffffff, 0.95);
        this.minimapGraphics.strokePoints([
          { x: cx, y: cy - dr },
          { x: cx + dr, y: cy },
          { x: cx, y: cy + dr },
          { x: cx - dr, y: cy }
        ], true, true);
      } else if (r.type === 'treasure') {
        const bw = Math.max(4, Math.floor(cellW * 0.44));
        const bh = Math.max(3, Math.floor(cellH * 0.44));
        this.minimapGraphics.fillStyle(0xfef08a, 1.0);
        this.minimapGraphics.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
        this.minimapGraphics.lineStyle(1, 0x78350f, 0.95);
        this.minimapGraphics.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
      } else if (r.type === 'rest') {
        const arm = Math.max(2.5, Math.min(cellW, cellH) * 0.28);
        this.minimapGraphics.lineStyle(1.8, 0xffffff, 0.98);
        this.minimapGraphics.beginPath();
        this.minimapGraphics.moveTo(cx - arm, cy);
        this.minimapGraphics.lineTo(cx + arm, cy);
        this.minimapGraphics.moveTo(cx, cy - arm);
        this.minimapGraphics.lineTo(cx, cy + arm);
        this.minimapGraphics.strokePath();
      } else if (r.isCleared && !isCurrent) {
        this.minimapGraphics.fillStyle(0x86efac, 0.95);
        this.minimapGraphics.fillCircle(cx, cy, 1.8);
      }

      if (isCurrent) {
        this.minimapGraphics.lineStyle(2, 0x22d3ee, 0.7);
        this.minimapGraphics.strokeRoundedRect(px - 2, py - 2, cellW + 4, cellH + 4, 4);
        this.minimapGraphics.lineStyle(1.5, 0xffffff, 1.0);
        this.minimapGraphics.strokeRoundedRect(px - 0.5, py - 0.5, cellW + 1, cellH + 1, 3);
        this.minimapGraphics.fillStyle(0x22d3ee, 1.0);
        this.minimapGraphics.fillCircle(cx, cy, 2.8);
        this.minimapGraphics.fillStyle(0xffffff, 1.0);
        this.minimapGraphics.fillCircle(cx, cy, 1.6);
      }
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
