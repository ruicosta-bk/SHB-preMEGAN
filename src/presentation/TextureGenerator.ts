import Phaser from 'phaser';

export class TextureGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    const tm = scene.textures;

    this.createShadow(tm);
    this.createTiles(tm);
    this.createPlayerFrames(tm);
    this.createEnemyFrames(tm);
    this.createBossFrames(tm);
    this.createProjectiles(tm);
    this.createPickupsAndProps(tm);
    this.createIcons(tm);
  }

  private static createCanvas(tm: Phaser.Textures.TextureManager, key: string, w: number, h: number): CanvasRenderingContext2D {
    if (tm.exists(key)) {
      tm.remove(key);
    }
    const canvasTexture = tm.createCanvas(key, w, h);
    if (!canvasTexture) {
      throw new Error(`Failed to create canvas texture ${key}`);
    }
    const ctx = canvasTexture.getContext();
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }

  private static refresh(tm: Phaser.Textures.TextureManager, key: string): void {
    const texture = tm.get(key);
    if (texture && (texture as any).refresh) {
      (texture as any).refresh();
    }
  }

  private static createShadow(tm: Phaser.Textures.TextureManager): void {
    const ctx = this.createCanvas(tm, 'shadow', 24, 12);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(12, 6, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    this.refresh(tm, 'shadow');
  }

  private static createTiles(tm: Phaser.Textures.TextureManager): void {
    // 1. Floor tile (32x32): dark slate with stone joints
    let ctx = this.createCanvas(tm, 'floor_tile', 32, 32);
    ctx.fillStyle = '#1e2330';
    ctx.fillRect(0, 0, 32, 32);
    // Subtle flagstone grid
    ctx.fillStyle = '#171b26';
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillRect(0, 0, 1, 32);
    ctx.fillRect(0, 16, 32, 1);
    ctx.fillRect(16, 0, 1, 16);
    ctx.fillRect(8, 16, 1, 16);
    ctx.fillRect(24, 16, 1, 16);
    // Moss/patina speckles
    ctx.fillStyle = '#262f40';
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillRect(20, 8, 2, 2);
    ctx.fillRect(12, 22, 2, 2);
    this.refresh(tm, 'floor_tile');

    // 2. Wall tile (32x32): dark basalt with metallic bronze trim
    ctx = this.createCanvas(tm, 'wall_tile', 32, 32);
    ctx.fillStyle = '#0f121a';
    ctx.fillRect(0, 0, 32, 32);
    // Bronze cornice/top rim
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 32, 4);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(0, 1, 32, 2);
    // Carved brick texture
    ctx.fillStyle = '#1a1f2c';
    ctx.fillRect(2, 6, 28, 10);
    ctx.fillRect(2, 18, 28, 12);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 16, 32, 2);
    ctx.fillRect(15, 6, 2, 10);
    this.refresh(tm, 'wall_tile');

    // 3. Pillar tile (32x32): alchemical conduit with amber rune
    ctx = this.createCanvas(tm, 'pillar_tile', 32, 32);
    ctx.fillStyle = '#141824';
    ctx.fillRect(2, 2, 28, 28);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(4, 4, 24, 24);
    ctx.fillStyle = '#0f121a';
    ctx.fillRect(6, 6, 20, 20);
    // Glowing crystal rune in center
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(13, 9, 6, 14);
    ctx.fillRect(9, 13, 14, 6);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(14, 14, 4, 4);
    this.refresh(tm, 'pillar_tile');

    // 4. Door closed (32x32): heavy iron grate with red lock gem
    ctx = this.createCanvas(tm, 'door_closed', 32, 32);
    ctx.fillStyle = '#0b0d13';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#475569';
    for (let x = 4; x <= 28; x += 6) {
      ctx.fillRect(x, 2, 3, 28);
    }
    ctx.fillRect(2, 14, 28, 4);
    // Red lock crystal
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(13, 12, 6, 8);
    ctx.fillStyle = '#fecaca';
    ctx.fillRect(15, 14, 2, 4);
    this.refresh(tm, 'door_closed');

    // 5. Door open (32x32): clear stone archway with green passage light
    ctx = this.createCanvas(tm, 'door_open', 32, 32);
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(12, 26, 8, 4);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(14, 28, 4, 2);
    this.refresh(tm, 'door_open');
  }

  private static createPlayerFrames(tm: Phaser.Textures.TextureManager): void {
    // Player base dimensions: 24x28
    // Cloaked explorer with dark navy/teal cowl, bronze clasps, glowing eye visor
    const drawPlayer = (key: string, runOffset: number, isHurt: boolean = false) => {
      const ctx = this.createCanvas(tm, key, 24, 28);

      // Body / Cloak
      ctx.fillStyle = isHurt ? '#ef4444' : '#1e3a5f';
      ctx.fillRect(6, 8, 12, 14); // main torso cloak
      ctx.fillStyle = isHurt ? '#f87171' : '#2563eb';
      ctx.fillRect(7, 10, 10, 10);

      // Hood / Head
      ctx.fillStyle = isHurt ? '#dc2626' : '#0f2744';
      ctx.fillRect(5, 3, 14, 9);
      ctx.fillRect(7, 1, 10, 3);

      // Glowing adventurer visor (Cyan)
      ctx.fillStyle = isHurt ? '#ffffff' : '#38bdf8';
      ctx.fillRect(9, 6, 6, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 7, 2, 1);

      // Bronze mantle clasp
      ctx.fillStyle = '#d97706';
      ctx.fillRect(10, 11, 4, 2);

      // Boots with run animation offsets
      ctx.fillStyle = '#334155';
      if (runOffset === 0) {
        // Idle
        ctx.fillRect(7, 22, 4, 5);
        ctx.fillRect(13, 22, 4, 5);
      } else if (runOffset === 1) {
        // Run frame 1
        ctx.fillRect(6, 21, 4, 6);
        ctx.fillRect(14, 23, 4, 4);
      } else {
        // Run frame 2
        ctx.fillRect(6, 23, 4, 4);
        ctx.fillRect(14, 21, 4, 6);
      }

      this.refresh(tm, key);
    };

    drawPlayer('player_idle', 0, false);
    drawPlayer('player_run_1', 1, false);
    drawPlayer('player_run_2', 2, false);
    drawPlayer('player_hurt', 0, true);
  }

  private static createEnemyFrames(tm: Phaser.Textures.TextureManager): void {
    // 1. Grunt (22x22): clockwork automaton / gargoyle with glowing red eyes
    let ctx = this.createCanvas(tm, 'enemy_grunt', 22, 22);
    ctx.fillStyle = '#475569';
    ctx.fillRect(4, 5, 14, 12);
    ctx.fillStyle = '#334155';
    ctx.fillRect(3, 8, 16, 8);
    // Horns
    ctx.fillStyle = '#64748b';
    ctx.fillRect(3, 2, 3, 4);
    ctx.fillRect(16, 2, 3, 4);
    // Red glowing eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(6, 8, 3, 3);
    ctx.fillRect(13, 8, 3, 3);
    // Feet
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(5, 17, 4, 4);
    ctx.fillRect(13, 17, 4, 4);
    this.refresh(tm, 'enemy_grunt');

    // 2. Shooter (24x24): hooded alchemist sniper with brass monocle
    ctx = this.createCanvas(tm, 'enemy_shooter', 24, 24);
    ctx.fillStyle = '#581c87';
    ctx.fillRect(6, 4, 12, 14);
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(7, 2, 10, 5);
    // Gold crosshair eyepiece
    ctx.fillStyle = '#eab308';
    ctx.fillRect(12, 6, 5, 5);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(14, 8, 2, 2);
    // Arbalest/gun in hand
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(16, 12, 7, 3);
    // Robe bottom
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(7, 18, 10, 4);
    this.refresh(tm, 'enemy_shooter');

    // 3. Fan Caster (26x26): fire cultist with flame orbs
    ctx = this.createCanvas(tm, 'enemy_fan_caster', 26, 26);
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(7, 6, 12, 14);
    // Flame crown
    ctx.fillStyle = '#f97316';
    ctx.fillRect(6, 2, 4, 5);
    ctx.fillRect(11, 0, 4, 7);
    ctx.fillRect(16, 2, 4, 5);
    // Visor
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(9, 9, 8, 3);
    // Floating ember catalysts on sides
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(1, 10, 4, 4);
    ctx.fillRect(21, 10, 4, 4);
    this.refresh(tm, 'enemy_fan_caster');

    // 4. Charger (28x28): heavy iron bull / steam tank
    ctx = this.createCanvas(tm, 'enemy_charger', 28, 28);
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(4, 6, 20, 16);
    ctx.fillStyle = '#71717a';
    ctx.fillRect(6, 8, 16, 12);
    // Massive iron ram horn on front
    ctx.fillStyle = '#a1a1aa';
    ctx.fillRect(20, 10, 7, 8);
    ctx.fillRect(1, 10, 7, 8);
    // Steam vents glowing orange
    ctx.fillStyle = '#f97316';
    ctx.fillRect(10, 4, 3, 3);
    ctx.fillRect(15, 4, 3, 3);
    // Treads/hooves
    ctx.fillStyle = '#18181b';
    ctx.fillRect(5, 22, 6, 5);
    ctx.fillRect(17, 22, 6, 5);
    this.refresh(tm, 'enemy_charger');
  }

  private static createBossFrames(tm: Phaser.Textures.TextureManager): void {
    // Boss: Arch-Alchemist Ignis Ignifer (48x48)
    const drawBoss = (key: string, isPhase2: boolean) => {
      const ctx = this.createCanvas(tm, key, 48, 48);

      // Great cape / mantle
      ctx.fillStyle = isPhase2 ? '#7f1d1d' : '#1e1b4b';
      ctx.fillRect(8, 12, 32, 28);
      ctx.fillStyle = isPhase2 ? '#991b1b' : '#312e81';
      ctx.fillRect(12, 14, 24, 24);

      // Gold ornate trim
      ctx.fillStyle = isPhase2 ? '#f59e0b' : '#d97706';
      ctx.fillRect(8, 12, 32, 3);
      ctx.fillRect(10, 38, 28, 3);

      // Hood & Mask
      ctx.fillStyle = isPhase2 ? '#450a0a' : '#0f172a';
      ctx.fillRect(14, 4, 20, 14);
      // Alchemical burning crown
      ctx.fillStyle = isPhase2 ? '#f43f5e' : '#f59e0b';
      ctx.fillRect(12, 2, 4, 5);
      ctx.fillRect(18, 0, 4, 6);
      ctx.fillRect(26, 0, 4, 6);
      ctx.fillRect(32, 2, 4, 5);

      // Burning eyes
      ctx.fillStyle = isPhase2 ? '#ffffff' : '#fbbf24';
      ctx.fillRect(18, 10, 4, 3);
      ctx.fillRect(26, 10, 4, 3);

      // Floating elemental alembics on shoulders
      ctx.fillStyle = isPhase2 ? '#ef4444' : '#06b6d4';
      ctx.fillRect(3, 16, 7, 7);
      ctx.fillStyle = isPhase2 ? '#f97316' : '#a855f7';
      ctx.fillRect(38, 16, 7, 7);

      this.refresh(tm, key);
    };

    drawBoss('boss_ignis_p1', false);
    drawBoss('boss_ignis_p2', true);
  }

  private static createProjectiles(tm: Phaser.Textures.TextureManager): void {
    // Player bullets
    // 1. Pistol (10x6)
    let ctx = this.createCanvas(tm, 'bullet_pistol', 10, 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 1, 10, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 2, 6, 2);
    this.refresh(tm, 'bullet_pistol');

    // 2. Shotgun (8x8)
    ctx = this.createCanvas(tm, 'bullet_shotgun', 8, 8);
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(4, 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(4, 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    this.refresh(tm, 'bullet_shotgun');

    // 3. Repeater (12x4)
    ctx = this.createCanvas(tm, 'bullet_repeater', 12, 4);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, 1, 12, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 1, 6, 2);
    this.refresh(tm, 'bullet_repeater');

    // 4. Penetrator (18x6)
    ctx = this.createCanvas(tm, 'bullet_penetrator', 18, 6);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(0, 1, 18, 4);
    ctx.fillStyle = '#f3e8ff';
    ctx.fillRect(3, 2, 12, 2);
    this.refresh(tm, 'bullet_penetrator');

    // 5. Slash Arc (60x60)
    ctx = this.createCanvas(tm, 'slash_arc', 60, 60);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(30, 30, 24, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(30, 30, 24, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();
    this.refresh(tm, 'slash_arc');

    // --- ENEMY BULLETS (Distinct shapes & high-contrast red/orange colors) ---

    // Enemy Orb Bullet (10x10): Deep crimson glowing ball with yellow-white core
    ctx = this.createCanvas(tm, 'bullet_enemy_orb', 10, 10);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(5, 5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fee2e2';
    ctx.beginPath();
    ctx.arc(5, 5, 2, 0, Math.PI * 2);
    ctx.fill();
    this.refresh(tm, 'bullet_enemy_orb');

    // Enemy Sniper Dart (14x6): Long red needle
    ctx = this.createCanvas(tm, 'bullet_enemy_laser', 14, 6);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 1, 14, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 2, 10, 2);
    this.refresh(tm, 'bullet_enemy_laser');

    // Boss Magma Orb (14x14): Large pulsating fireball
    ctx = this.createCanvas(tm, 'bullet_boss_orb', 14, 14);
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(7, 7, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(7, 7, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(7, 7, 2, 0, Math.PI * 2);
    ctx.fill();
    this.refresh(tm, 'bullet_boss_orb');
  }

  private static createPickupsAndProps(tm: Phaser.Textures.TextureManager): void {
    // 1. Heart (+HP) (16x16)
    let ctx = this.createCanvas(tm, 'pickup_heart', 16, 16);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(8, 14);
    ctx.bezierCurveTo(2, 10, 1, 4, 5, 2);
    ctx.bezierCurveTo(7, 1, 8, 4, 8, 4);
    ctx.bezierCurveTo(8, 4, 9, 1, 11, 2);
    ctx.bezierCurveTo(15, 4, 14, 10, 8, 14);
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(4, 4, 2, 2);
    this.refresh(tm, 'pickup_heart');

    // 2. Energy Crystal (+Energy) (16x16)
    ctx = this.createCanvas(tm, 'pickup_energy', 16, 16);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(8, 1);
    ctx.lineTo(14, 8);
    ctx.lineTo(8, 15);
    ctx.lineTo(2, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#bbf7d0';
    ctx.fillRect(6, 6, 4, 4);
    this.refresh(tm, 'pickup_energy');

    // 3. Chest (24x20)
    ctx = this.createCanvas(tm, 'chest_closed', 24, 20);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 6, 20, 13);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(1, 4, 22, 5); // lid
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(10, 8, 4, 5); // lock
    this.refresh(tm, 'chest_closed');

    ctx = this.createCanvas(tm, 'chest_open', 24, 20);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(2, 8, 20, 11);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(1, 1, 22, 6); // opened lid up
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(6, 9, 12, 4); // gold glow inside
    this.refresh(tm, 'chest_open');

    // 4. Upgrade Altar (32x32)
    ctx = this.createCanvas(tm, 'upgrade_altar', 32, 32);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 14, 24, 16);
    ctx.fillStyle = '#334155';
    ctx.fillRect(2, 10, 28, 5);
    // Floating mystical rune
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(12, 2, 8, 8);
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(14, 4, 4, 4);
    this.refresh(tm, 'upgrade_altar');

    // 5. Explosive Red Barrel (24x26)
    ctx = this.createCanvas(tm, 'barrel_explosive', 24, 26);
    ctx.fillStyle = '#b91c1c'; // Red barrel body
    ctx.fillRect(3, 4, 18, 20);
    ctx.fillStyle = '#18181b'; // Iron bands
    ctx.fillRect(2, 2, 20, 3);
    ctx.fillRect(2, 11, 20, 3);
    ctx.fillRect(2, 21, 20, 3);
    // Yellow explosive flame hazard symbol
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.lineTo(16, 12);
    ctx.lineTo(8, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(11, 9, 2, 2);
    this.refresh(tm, 'barrel_explosive');

    // 6. Toxic Green Barrel (24x26)
    ctx = this.createCanvas(tm, 'barrel_toxic', 24, 26);
    ctx.fillStyle = '#15803d'; // Green toxic body
    ctx.fillRect(3, 4, 18, 20);
    ctx.fillStyle = '#0f172a'; // Iron bands
    ctx.fillRect(2, 2, 20, 3);
    ctx.fillRect(2, 11, 20, 3);
    ctx.fillRect(2, 21, 20, 3);
    // Toxic slime biohazard symbol
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.arc(12, 9, 3, 0, Math.PI * 2);
    ctx.fill();
    this.refresh(tm, 'barrel_toxic');

    // 7. Alchemical Volatile Flask (16x16)
    ctx = this.createCanvas(tm, 'flask_alchemical', 16, 16);
    ctx.fillStyle = '#d97706'; // Cork stopper
    ctx.fillRect(6, 1, 4, 3);
    // Glass vial neck & body
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(7, 4, 2, 3);
    ctx.beginPath();
    ctx.moveTo(8, 6);
    ctx.lineTo(14, 14);
    ctx.lineTo(2, 14);
    ctx.closePath();
    ctx.fill();
    // Glowing volatile fire mixture inside
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(4, 10, 8, 4);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(6, 11, 4, 2);
    this.refresh(tm, 'flask_alchemical');

    // 8. Shiny Gold Coin (14x14)
    ctx = this.createCanvas(tm, 'pickup_coin', 14, 14);
    ctx.fillStyle = '#d97706'; // Dark amber border
    ctx.beginPath();
    ctx.arc(7, 7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b'; // Gold coin face
    ctx.beginPath();
    ctx.arc(7, 7, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a'; // Highlight sparkle
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillStyle = '#b45309'; // Center embossed rune
    ctx.fillRect(6, 5, 2, 4);
    this.refresh(tm, 'pickup_coin');

    // 9. Mysterious Merchant NPC (24x30)
    ctx = this.createCanvas(tm, 'merchant_npc', 24, 30);
    // Dark purple robe & cowl
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(4, 10, 16, 18);
    ctx.fillStyle = '#581c87';
    ctx.fillRect(6, 6, 12, 10);
    // Gold trim on cowl and hem
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(4, 26, 16, 2);
    ctx.fillRect(6, 14, 12, 2);
    // Glowing golden goggles / eyes in cowl
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 9, 8, 3);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(9, 10, 2, 2);
    ctx.fillRect(13, 10, 2, 2);
    this.refresh(tm, 'merchant_npc');

    // 10. Large Healing Potion (16x18)
    ctx = this.createCanvas(tm, 'potion_health_large', 16, 18);
    ctx.fillStyle = '#78350f'; // Stopper
    ctx.fillRect(6, 1, 4, 3);
    ctx.fillStyle = '#ef4444'; // Red bottle
    ctx.fillRect(3, 4, 10, 12);
    ctx.fillStyle = '#fca5a5'; // Glass shine
    ctx.fillRect(4, 5, 2, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 9, 2, 2);
    this.refresh(tm, 'potion_health_large');

    // 11. Large Energy Potion (16x18)
    ctx = this.createCanvas(tm, 'potion_energy_large', 16, 18);
    ctx.fillStyle = '#78350f'; // Stopper
    ctx.fillRect(6, 1, 4, 3);
    ctx.fillStyle = '#0284c7'; // Blue bottle
    ctx.fillRect(3, 4, 10, 12);
    ctx.fillStyle = '#7dd3fc'; // Glass shine
    ctx.fillRect(4, 5, 2, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 9, 2, 2);
    this.refresh(tm, 'potion_energy_large');
  }

  private static createIcons(tm: Phaser.Textures.TextureManager): void {
    const drawSimpleIcon = (key: string, bgColor: string, symbolColor: string, drawShape: (ctx: CanvasRenderingContext2D) => void) => {
      const ctx = this.createCanvas(tm, key, 32, 32);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 32, 32);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 30, 30);

      ctx.fillStyle = symbolColor;
      ctx.strokeStyle = symbolColor;
      drawShape(ctx);
      this.refresh(tm, key);
    };

    // Weapons
    drawSimpleIcon('icon_pistol', '#0f172a', '#38bdf8', ctx => {
      ctx.fillRect(8, 14, 14, 5);
      ctx.fillRect(8, 17, 5, 8);
    });
    drawSimpleIcon('icon_shotgun', '#0f172a', '#fb923c', ctx => {
      ctx.fillRect(6, 12, 18, 6);
      ctx.fillRect(6, 17, 6, 7);
      ctx.fillRect(22, 11, 4, 8);
    });
    drawSimpleIcon('icon_repeater', '#0f172a', '#4ade80', ctx => {
      ctx.fillRect(6, 13, 20, 5);
      ctx.fillRect(10, 18, 5, 7);
      ctx.fillRect(16, 18, 4, 6);
    });
    drawSimpleIcon('icon_penetrator', '#0f172a', '#c084fc', ctx => {
      ctx.fillRect(4, 14, 24, 4);
      ctx.fillRect(20, 11, 6, 10);
      ctx.fillRect(8, 17, 5, 8);
    });
    drawSimpleIcon('icon_blade', '#0f172a', '#f1f5f9', ctx => {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 24);
      ctx.lineTo(24, 8);
      ctx.stroke();
      ctx.fillStyle = '#d97706';
      ctx.fillRect(6, 22, 4, 4);
    });

    // Upgrades
    drawSimpleIcon('icon_up_armor', '#1e293b', '#38bdf8', ctx => {
      ctx.fillRect(8, 8, 16, 16);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(12, 12, 8, 8);
    });
    drawSimpleIcon('icon_up_hp', '#1e293b', '#ef4444', ctx => {
      ctx.fillRect(13, 6, 6, 20);
      ctx.fillRect(6, 13, 20, 6);
    });
    drawSimpleIcon('icon_up_energy', '#1e293b', '#22c55e', ctx => {
      ctx.beginPath();
      ctx.moveTo(16, 4);
      ctx.lineTo(26, 16);
      ctx.lineTo(16, 28);
      ctx.lineTo(6, 16);
      ctx.closePath();
      ctx.fill();
    });
    drawSimpleIcon('icon_up_pierce', '#1e293b', '#c084fc', ctx => {
      ctx.fillRect(4, 15, 24, 2);
      ctx.fillRect(20, 11, 6, 10);
    });
    drawSimpleIcon('icon_up_bounce', '#1e293b', '#fb923c', ctx => {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(6, 24);
      ctx.lineTo(16, 8);
      ctx.lineTo(26, 24);
      ctx.stroke();
    });
    drawSimpleIcon('icon_up_blade', '#1e293b', '#e2e8f0', ctx => {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(16, 16, 10, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    });
    drawSimpleIcon('icon_up_dash', '#1e293b', '#f59e0b', ctx => {
      ctx.fillRect(4, 10, 16, 3);
      ctx.fillRect(8, 16, 16, 3);
      ctx.fillRect(12, 22, 16, 3);
    });
    drawSimpleIcon('icon_up_crit', '#1e293b', '#e11d48', ctx => {
      ctx.fillRect(14, 4, 4, 24);
      ctx.fillRect(4, 14, 24, 4);
      ctx.fillRect(8, 8, 16, 16);
    });

    // Skill icon
    drawSimpleIcon('icon_skill_flask', '#1e1b4b', '#f97316', ctx => {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(13, 4, 6, 4);
      ctx.beginPath();
      ctx.moveTo(16, 8);
      ctx.lineTo(26, 26);
      ctx.lineTo(6, 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(10, 18, 12, 6);
    });
  }
}
