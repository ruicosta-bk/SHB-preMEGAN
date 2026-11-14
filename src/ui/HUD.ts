import Phaser from 'phaser';
import { events } from '../core/EventBus';
import { WeaponData } from '../types/weapon';
import { RoomState } from '../types/room';

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
    this.dashText = scene.add.text(125, 91, 'LƯỚT [SPACE]: SẴN SÀNG', { ...fontStyle, fontSize: '11px', color: '#f59e0b' }).setOrigin(0.5, 0);
    this.container.add(this.dashText);

    // Skill Bar (Alchemical Flask [F])
    this.skillBar = scene.add.graphics();
    this.container.add(this.skillBar);
    this.skillText = scene.add.text(125, 113, 'BÌNH HỎA [F]: SẴN SÀNG', { ...fontStyle, fontSize: '11px', color: '#ef4444' }).setOrigin(0.5, 0);
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

    this.curWeaponText = scene.add.text(1090, 630, 'Súng Lục', { ...fontStyle, fontSize: '14px', color: '#38bdf8' });
    this.container.add(this.curWeaponText);

    this.curWeaponSubtext = scene.add.text(1090, 650, 'NL: 0 | ST: 3', { ...fontStyle, fontSize: '12px', color: '#94a3b8' });
    this.container.add(this.curWeaponSubtext);

    this.secWeaponIcon = scene.add.sprite(1225, 660, 'icon_shotgun').setScale(0.8).setAlpha(0.5);
    this.container.add(this.secWeaponIcon);

    this.secWeaponText = scene.add.text(1225, 688, '[Q] Đổi', { ...fontStyle, fontSize: '11px', color: '#64748b' }).setOrigin(0.5, 0);
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

    this.bossNameText = scene.add.text(0, -18, 'Ignis Ignifer - Đại Pháp Sư Luyện Kim', { ...fontStyle, fontSize: '14px', color: '#f87171' }).setOrigin(0.5, 0);
    this.bossContainer.add(this.bossNameText);

    this.bossHpText = scene.add.text(0, 7, '150 / 150 (Giai đoạn 1)', { ...fontStyle, fontSize: '12px' }).setOrigin(0.5, 0);
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

    events.on('player:hero-selected', (data: { skillShortLabelVi: string; accentHex: string; accentColor: number }) => {
      this.skillShortLabel = data.skillShortLabelVi || 'KỸ NĂNG';
      this.skillColorHex = data.accentHex || '#ef4444';
      this.skillColorNum = data.accentColor || 0xef4444;
      this.updateSkill(1, true);
    });

    events.on('player:weapon-swapped', (data: any) => {
      this.updateWeapons(data.current, data.secondary);
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
    const barW = 180;
    const barH = 10;
    const startX = 35;

    this.dashBar.clear();
    this.dashBar.fillStyle(0x3f3f46, 0.8);
    this.dashBar.fillRect(startX, 94, barW, barH);

    this.dashBar.fillStyle(isReady ? 0xf59e0b : 0x71717a, 1.0);
    this.dashBar.fillRect(startX, 94, barW * progress, barH);

    this.dashText.setText(isReady ? 'LƯỚT [SPACE]: SẴN SÀNG' : 'LƯỚT: ĐANG HỒI...');
    this.dashText.setColor(isReady ? '#f59e0b' : '#94a3b8');
  }

  public updateSkill(progress: number, isReady: boolean): void {
    const barW = 180;
    const barH = 10;
    const startX = 35;

    this.skillBar.clear();
    this.skillBar.fillStyle(0x3f3f46, 0.8);
    this.skillBar.fillRect(startX, 116, barW, barH);

    this.skillBar.fillStyle(isReady ? this.skillColorNum : 0x71717a, 1.0);
    this.skillBar.fillRect(startX, 116, barW * progress, barH);

    this.skillText.setText(isReady ? `${this.skillShortLabel} [F]: SẴN SÀNG` : `${this.skillShortLabel}: ĐANG HỒI...`);
    this.skillText.setColor(isReady ? this.skillColorHex : '#94a3b8');
  }

  public updateWeapons(cur: WeaponData, sec: WeaponData | null): void {
    this.curWeaponIcon.setTexture(cur.iconTexture);
    this.curWeaponText.setText(cur.nameVi);
    this.curWeaponSubtext.setText(`NL: ${cur.energyCost} | ST: ${cur.damage}`);

    if (sec) {
      this.secWeaponIcon.setTexture(sec.iconTexture).setVisible(true);
      this.secWeaponText.setText('[Q] Đổi').setColor('#94a3b8');
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
    this.bossNameText.setText(data.nameVi);
    this.bossHpText.setText(`${Math.ceil(data.currentHp)} / ${data.maxHp} (Giai đoạn ${data.phase})`);

    const barW = 432;
    const barH = 24;
    this.bossBar.clear();
    this.bossBar.fillStyle(0x450a0a, 0.9);
    this.bossBar.fillRect(-216, 4, barW, barH);

    const pct = Math.max(0, Math.min(1, data.currentHp / data.maxHp));
    this.bossBar.fillStyle(data.phase === 1 ? 0xd97706 : 0xef4444, 1.0);
    this.bossBar.fillRect(-216, 4, barW * pct, barH);
  }

  public renderMinimap(rooms: RoomState[], currentIdx: number): void {
    this.minimapGraphics.clear();
    if (!rooms || rooms.length === 0) return;

    // Minimap panel is (1090, 16, 175, 125)
    const boxCenterX = 1090 + 175 / 2;
    const boxCenterY = 16 + 125 / 2;

    const visibleRooms = rooms.filter(r => r.isVisited || r.index === 0 || r.type === 'boss');
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
    const maxStepX = Math.floor(148 / spanX);
    const maxStepY = Math.floor(100 / spanY);
    const step = Math.max(16, Math.min(28, Math.min(maxStepX, maxStepY)));
    const cellW = Math.floor(step * 0.68);
    const cellH = Math.floor(step * 0.56);

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

    // Draw room nodes
    for (const r of visibleRooms) {
      const { x: px, y: py } = posOf(r);

      let color = 0x475569;
      if (r.index === currentIdx) {
        color = 0x38bdf8; // Bright cyan for player
      } else if (r.type === 'boss') {
        color = 0xef4444; // Red for boss
      } else if (r.type === 'treasure') {
        color = 0xf59e0b; // Gold
      } else if (r.type === 'rest') {
        color = 0xa855f7; // Purple shop/rest
      } else if (r.isCleared) {
        color = 0x22c55e; // Green for cleared
      }

      this.minimapGraphics.fillStyle(color, r.isVisited ? 0.9 : 0.45);
      this.minimapGraphics.fillRoundedRect(px, py, cellW, cellH, 3);

      if (r.index === currentIdx) {
        this.minimapGraphics.lineStyle(1.5, 0xffffff, 1.0);
        this.minimapGraphics.strokeRoundedRect(px - 1, py - 1, cellW + 2, cellH + 2, 3);
      }
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
