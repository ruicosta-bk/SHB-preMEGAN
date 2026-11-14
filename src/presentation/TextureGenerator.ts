import Phaser from 'phaser';

export class TextureGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    const tm = scene.textures;

    this.createShadow(tm);
    this.createTiles(tm);
    this.createEnvironmentAndTraps(tm);
    this.createAllHeroFrames(tm);
    this.createPetFrames(tm);
    this.createEnemyFrames(tm);
    this.createBossFrames(tm);
    this.createProjectiles(tm);
    this.createHeldWeapons(tm);
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(12, 6, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    this.refresh(tm, 'shadow');
  }

  private static createTiles(tm: Phaser.Textures.TextureManager): void {
    // Rich Soul-Knight-inspired deep teal stone floor variants (32x32)
    const drawFloorBase = (key: string, accentFn?: (ctx: CanvasRenderingContext2D) => void) => {
      const ctx = this.createCanvas(tm, key, 32, 32);
      ctx.fillStyle = '#152d39';
      ctx.fillRect(0, 0, 32, 32);
      // Subtle checkerboard stone tiles
      ctx.fillStyle = '#193543';
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillRect(17, 17, 14, 14);
      ctx.fillStyle = '#132833';
      ctx.fillRect(17, 1, 14, 14);
      ctx.fillRect(1, 17, 14, 14);
      // Grout seams
      ctx.fillStyle = '#0d1e27';
      ctx.fillRect(0, 0, 32, 1);
      ctx.fillRect(0, 15, 32, 2);
      ctx.fillRect(0, 0, 1, 32);
      ctx.fillRect(15, 0, 2, 32);
      if (accentFn) accentFn(ctx);
      this.refresh(tm, key);
    };

    drawFloorBase('floor_tile');
    drawFloorBase('floor_tile_2', ctx => {
      // Cracked flagstone
      ctx.fillStyle = '#09141a';
      ctx.fillRect(6, 5, 4, 1);
      ctx.fillRect(10, 6, 2, 3);
      ctx.fillRect(20, 22, 5, 1);
    });
    drawFloorBase('floor_tile_3', ctx => {
      // Moss/emerald lichen patches
      ctx.fillStyle = '#14532d';
      ctx.fillRect(4, 20, 4, 3);
      ctx.fillRect(22, 4, 3, 2);
      ctx.fillStyle = '#166534';
      ctx.fillRect(5, 21, 2, 1);
    });
    drawFloorBase('floor_tile_4', ctx => {
      // Ancient subtle arcane rune inlay
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(6, 6, 4, 4);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(7, 7, 2, 2);
    });

    // Royal crimson carpet tile (Boss arena)
    let ctx = this.createCanvas(tm, 'floor_carpet', 32, 32);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(2, 2, 28, 28);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(0, 0, 32, 2);
    ctx.fillRect(0, 30, 32, 2);
    this.refresh(tm, 'floor_carpet');

    // Golden Hub Mosaic tile (Start room center)
    ctx = this.createCanvas(tm, 'floor_mosaic', 32, 32);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(2, 2, 28, 28);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(6, 6, 4, 4);
    ctx.fillRect(22, 22, 4, 4);
    this.refresh(tm, 'floor_mosaic');

    // 3D Top-down Beveled Stone Wall (32x32)
    ctx = this.createCanvas(tm, 'wall_tile', 32, 32);
    ctx.fillStyle = '#090f14';
    ctx.fillRect(0, 0, 32, 32);
    // Top cap (lighter slate-green brick)
    ctx.fillStyle = '#33525e';
    ctx.fillRect(1, 1, 30, 14);
    ctx.fillStyle = '#476f7d';
    ctx.fillRect(1, 1, 30, 3);
    // Front vertical face (darker)
    ctx.fillStyle = '#1c2f38';
    ctx.fillRect(1, 16, 30, 14);
    // Brick seams
    ctx.fillStyle = '#0d1920';
    ctx.fillRect(15, 1, 2, 14);
    ctx.fillRect(7, 16, 2, 14);
    ctx.fillRect(23, 16, 2, 14);
    ctx.fillRect(0, 15, 32, 2);
    // Bronze corner rivet
    ctx.fillStyle = '#b45309';
    ctx.fillRect(14, 14, 4, 3);
    this.refresh(tm, 'wall_tile');

    // Alchemical Stone Pillar (32x32)
    ctx = this.createCanvas(tm, 'pillar_tile', 32, 32);
    ctx.fillStyle = '#090f14';
    ctx.fillRect(1, 1, 30, 30);
    ctx.fillStyle = '#334155';
    ctx.fillRect(3, 3, 26, 15);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(3, 18, 26, 11);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(5, 5, 22, 11);
    // Glowing amber crystal core
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(13, 8, 6, 12);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(14, 10, 4, 4);
    this.refresh(tm, 'pillar_tile');

    // Door closed (32x32): Iron grate bars
    ctx = this.createCanvas(tm, 'door_closed', 32, 32);
    ctx.fillStyle = '#090d12';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#64748b';
    for (let x = 3; x <= 27; x += 6) {
      ctx.fillRect(x, 2, 3, 28);
    }
    ctx.fillStyle = '#334155';
    ctx.fillRect(1, 13, 30, 6);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(13, 12, 6, 8);
    ctx.fillStyle = '#fecaca';
    ctx.fillRect(15, 14, 2, 4);
    this.refresh(tm, 'door_closed');

    // Door open (32x32): Retracted threshold glow
    ctx = this.createCanvas(tm, 'door_open', 32, 32);
    ctx.fillStyle = '#152d39';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#0f2029';
    ctx.fillRect(2, 2, 28, 28);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(12, 26, 8, 3);
    ctx.fillRect(12, 3, 8, 3);
    this.refresh(tm, 'door_open');
  }

  private static createEnvironmentAndTraps(tm: Phaser.Textures.TextureManager): void {
    // 1. Wall Torches (20x26)
    const drawTorch = (key: string, f2: boolean) => {
      const ctx = this.createCanvas(tm, key, 20, 26);
      ctx.fillStyle = '#090b10';
      ctx.fillRect(7, 11, 6, 12);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, 12, 4, 10);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(6, 10, 8, 3);
      // Flame
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(f2 ? 5 : 6, 4, 8, 7);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(7, f2 ? 2 : 3, 6, 6);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(8, f2 ? 5 : 4, 4, 4);
      this.refresh(tm, key);
    };
    drawTorch('torch_1', false);
    drawTorch('torch_2', true);

    // Warm additive radial glow (96x96)
    let ctx = this.createCanvas(tm, 'torch_glow', 96, 96);
    const grad = ctx.createRadialGradient(48, 48, 4, 48, 48, 46);
    grad.addColorStop(0, 'rgba(251, 146, 60, 0.35)');
    grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.12)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 96, 96);
    this.refresh(tm, 'torch_glow');

    // 2. Floor Spike Traps (28x28)
    ctx = this.createCanvas(tm, 'trap_down', 28, 28);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(2, 2, 24, 24);
    ctx.fillStyle = '#090d14';
    for (const sx of [6, 18]) {
      for (const sy of [6, 18]) {
        ctx.fillRect(sx, sy, 4, 4);
      }
    }
    this.refresh(tm, 'trap_down');

    ctx = this.createCanvas(tm, 'trap_up', 28, 28);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(2, 2, 24, 24);
    for (const sx of [6, 18]) {
      for (const sy of [6, 18]) {
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(sx + 2, sy - 4);
        ctx.lineTo(sx + 5, sy + 4);
        ctx.lineTo(sx - 1, sy + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(sx + 1, sy - 3, 2, 2);
      }
    }
    this.refresh(tm, 'trap_up');

    // 3. Breakable Wooden Crate (26x26)
    ctx = this.createCanvas(tm, 'crate_wood', 26, 26);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(1, 1, 24, 24);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 2, 22, 22);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(4, 4, 18, 18);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(4, 12, 18, 2);
    // Diagonal brace
    ctx.fillStyle = '#d97706';
    for (let i = 0; i < 14; i++) {
      ctx.fillRect(5 + i, 5 + i, 2, 2);
    }
    this.refresh(tm, 'crate_wood');

    // 4. Ancient Statue (32x42)
    ctx = this.createCanvas(tm, 'statue_alchemist', 32, 42);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(4, 28, 24, 12);
    ctx.fillStyle = '#475569';
    ctx.fillRect(5, 29, 22, 10);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(8, 10, 16, 19);
    ctx.fillRect(10, 3, 12, 8);
    // Glowing cyan runic core on statue chest
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(14, 14, 4, 5);
    ctx.fillStyle = '#cffafe';
    ctx.fillRect(15, 15, 2, 2);
    this.refresh(tm, 'statue_alchemist');

    // 5. Boss Exit Portal (44x44)
    const drawPortal = (key: string, rot: boolean) => {
      const pCtx = this.createCanvas(tm, key, 44, 44);
      pCtx.fillStyle = '#312e81';
      pCtx.beginPath();
      pCtx.ellipse(22, 22, 18, 20, 0, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.fillStyle = '#6366f1';
      pCtx.beginPath();
      pCtx.ellipse(22, 22, rot ? 13 : 15, rot ? 16 : 14, 0, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.fillStyle = '#38bdf8';
      pCtx.beginPath();
      pCtx.ellipse(22, 22, 8, 10, 0, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.fillStyle = '#e0f2fe';
      pCtx.fillRect(19, 18, 6, 8);
      this.refresh(tm, key);
    };
    drawPortal('portal_1', false);
    drawPortal('portal_2', true);
  }

  private static createAllHeroFrames(tm: Phaser.Textures.TextureManager): void {
    const drawHeroSprite = (
      key: string,
      colors: { outline: string; body: string; bodyHi: string; hood: string; visor: string; trim: string },
      runOffset: number,
      isHurt: boolean = false
    ) => {
      const ctx = this.createCanvas(tm, key, 26, 28);
      const outline = isHurt ? '#ffffff' : colors.outline;
      const body = isHurt ? '#ef4444' : colors.body;
      const bodyHi = isHurt ? '#f87171' : colors.bodyHi;
      const hood = isHurt ? '#dc2626' : colors.hood;
      const visor = isHurt ? '#ffffff' : colors.visor;

      // Crisp 1px pixel outline silhouette
      ctx.fillStyle = outline;
      ctx.fillRect(5, 2, 16, 21);
      ctx.fillRect(7, 1, 12, 23);

      // Hood / Helmet
      ctx.fillStyle = hood;
      ctx.fillRect(6, 3, 14, 9);
      ctx.fillRect(8, 2, 10, 3);

      // Torso / Cloak
      ctx.fillStyle = body;
      ctx.fillRect(6, 11, 14, 11);
      ctx.fillStyle = bodyHi;
      ctx.fillRect(8, 12, 10, 8);

      // Visor / Eyes
      ctx.fillStyle = '#090b10';
      ctx.fillRect(8, 6, 10, 4);
      ctx.fillStyle = visor;
      ctx.fillRect(10, 7, 6, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(12, 7, 2, 1);

      // Class emblem / clasp
      ctx.fillStyle = colors.trim;
      ctx.fillRect(11, 12, 4, 3);

      // Boots with walk bounce
      ctx.fillStyle = outline;
      if (runOffset === 0) {
        ctx.fillRect(7, 22, 5, 5);
        ctx.fillRect(14, 22, 5, 5);
        ctx.fillStyle = '#475569';
        ctx.fillRect(8, 23, 3, 3);
        ctx.fillRect(15, 23, 3, 3);
      } else if (runOffset === 1) {
        ctx.fillRect(6, 21, 5, 6);
        ctx.fillRect(15, 23, 5, 4);
        ctx.fillStyle = '#475569';
        ctx.fillRect(7, 22, 3, 4);
        ctx.fillRect(16, 24, 3, 2);
      } else {
        ctx.fillRect(6, 23, 5, 4);
        ctx.fillRect(15, 21, 5, 6);
        ctx.fillStyle = '#475569';
        ctx.fillRect(7, 24, 3, 2);
        ctx.fillRect(16, 22, 3, 4);
      }

      this.refresh(tm, key);
    };

    const alchemistPalette = {
      outline: '#090b10',
      body: '#1e3a5f',
      bodyHi: '#2563eb',
      hood: '#0f2744',
      visor: '#38bdf8',
      trim: '#f59e0b'
    };
    const roguePalette = {
      outline: '#090b10',
      body: '#312e81',
      bodyHi: '#4f46e5',
      hood: '#1e1b4b',
      visor: '#f43f5e',
      trim: '#e11d48'
    };
    const vanguardPalette = {
      outline: '#090b10',
      body: '#475569',
      bodyHi: '#94a3b8',
      hood: '#64748b',
      visor: '#facc15',
      trim: '#d97706'
    };

    // Default player_* aliases map to Alchemist so legacy references never break
    drawHeroSprite('player_idle', alchemistPalette, 0, false);
    drawHeroSprite('player_run_1', alchemistPalette, 1, false);
    drawHeroSprite('player_run_2', alchemistPalette, 2, false);
    drawHeroSprite('player_hurt', alchemistPalette, 0, true);

    const registerClass = (prefix: string, palette: typeof alchemistPalette) => {
      drawHeroSprite(`${prefix}_idle`, palette, 0, false);
      drawHeroSprite(`${prefix}_run_1`, palette, 1, false);
      drawHeroSprite(`${prefix}_run_2`, palette, 2, false);
      drawHeroSprite(`${prefix}_hurt`, palette, 0, true);
    };

    registerClass('hero_alchemist', alchemistPalette);
    registerClass('hero_rogue', roguePalette);
    registerClass('hero_vanguard', vanguardPalette);
  }

  private static createPetFrames(tm: Phaser.Textures.TextureManager): void {
    const drawPet = (key: string, hop: boolean) => {
      const ctx = this.createCanvas(tm, key, 18, 18);
      const yOff = hop ? -1 : 0;
      ctx.fillStyle = '#090b10';
      ctx.fillRect(3, 3 + yOff, 12, 12);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(4, 4 + yOff, 10, 10);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(5, 5 + yOff, 8, 6);
      // Glowing cyan pet eyes
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(6, 7 + yOff, 2, 2);
      ctx.fillRect(10, 7 + yOff, 2, 2);
      // Feet
      ctx.fillStyle = '#090b10';
      ctx.fillRect(4, 15, 3, 2);
      ctx.fillRect(11, 15, 3, 2);
      this.refresh(tm, key);
    };
    drawPet('pet_golem_1', false);
    drawPet('pet_golem_2', true);
  }

  private static createEnemyFrames(tm: Phaser.Textures.TextureManager): void {
    // 1. Grunt (24x24): outlined clockwork gargoyle
    let ctx = this.createCanvas(tm, 'enemy_grunt', 24, 24);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(3, 2, 18, 19);
    ctx.fillStyle = '#475569';
    ctx.fillRect(5, 5, 14, 12);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(4, 3, 3, 4);
    ctx.fillRect(17, 3, 3, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(7, 8, 3, 3);
    ctx.fillRect(14, 8, 3, 3);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(6, 17, 4, 4);
    ctx.fillRect(14, 17, 4, 4);
    this.refresh(tm, 'enemy_grunt');

    // 2. Shooter (24x24): outlined sniper cultist
    ctx = this.createCanvas(tm, 'enemy_shooter', 24, 24);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(5, 1, 14, 22);
    ctx.fillStyle = '#581c87';
    ctx.fillRect(6, 4, 12, 14);
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(7, 2, 10, 5);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(12, 6, 5, 5);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(14, 8, 2, 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(16, 12, 7, 3);
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(7, 18, 10, 4);
    this.refresh(tm, 'enemy_shooter');

    // 3. Fan Caster (26x26): fire cultist
    ctx = this.createCanvas(tm, 'enemy_fan_caster', 26, 26);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(6, 5, 14, 17);
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(7, 6, 12, 14);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(6, 2, 4, 5);
    ctx.fillRect(11, 0, 4, 7);
    ctx.fillRect(16, 2, 4, 5);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(9, 9, 8, 3);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(1, 10, 4, 4);
    ctx.fillRect(21, 10, 4, 4);
    this.refresh(tm, 'enemy_fan_caster');

    // 4. Charger (28x28): iron ram tank
    ctx = this.createCanvas(tm, 'enemy_charger', 28, 28);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(3, 5, 22, 19);
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(4, 6, 20, 16);
    ctx.fillStyle = '#71717a';
    ctx.fillRect(6, 8, 16, 12);
    ctx.fillStyle = '#a1a1aa';
    ctx.fillRect(20, 10, 7, 8);
    ctx.fillRect(1, 10, 7, 8);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(10, 4, 3, 3);
    ctx.fillRect(15, 4, 3, 3);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(5, 22, 6, 5);
    ctx.fillRect(17, 22, 6, 5);
    this.refresh(tm, 'enemy_charger');

    // 5. Frost Mage (24x24): icy blue cultist
    ctx = this.createCanvas(tm, 'enemy_frost_mage', 24, 24);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(5, 2, 14, 20);
    ctx.fillStyle = '#0e7490';
    ctx.fillRect(6, 5, 12, 15);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(8, 2, 8, 5);
    ctx.fillStyle = '#cffafe';
    ctx.fillRect(9, 8, 6, 3);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(2, 11, 3, 3);
    ctx.fillRect(19, 11, 3, 3);
    this.refresh(tm, 'enemy_frost_mage');
  }

  private static createBossFrames(tm: Phaser.Textures.TextureManager): void {
    const drawBoss = (key: string, isPhase2: boolean) => {
      const ctx = this.createCanvas(tm, key, 48, 48);
      ctx.fillStyle = '#090b10';
      ctx.fillRect(9, 8, 30, 38);
      ctx.fillStyle = isPhase2 ? '#991b1b' : '#451a03';
      ctx.fillRect(10, 12, 28, 30);
      ctx.fillStyle = isPhase2 ? '#dc2626' : '#78350f';
      ctx.fillRect(14, 16, 20, 22);
      ctx.fillStyle = isPhase2 ? '#f87171' : '#d97706';
      ctx.fillRect(6, 12, 8, 10);
      ctx.fillRect(34, 12, 8, 10);
      ctx.fillStyle = isPhase2 ? '#fef08a' : '#f59e0b';
      ctx.fillRect(14, 4, 4, 8);
      ctx.fillRect(22, 1, 4, 11);
      ctx.fillRect(30, 4, 4, 8);
      ctx.fillStyle = isPhase2 ? '#ffffff' : '#fbbf24';
      ctx.fillRect(18, 15, 12, 4);
      ctx.fillStyle = isPhase2 ? '#fde047' : '#ef4444';
      ctx.fillRect(21, 23, 6, 8);
      this.refresh(tm, key);
    };

    drawBoss('boss_ignis_p1', false);
    drawBoss('boss_ignis_p2', true);
  }

  private static createProjectiles(tm: Phaser.Textures.TextureManager): void {
    // Player pistol (cyan)
    let ctx = this.createCanvas(tm, 'bullet_pistol', 12, 12);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.arc(6, 6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath(); ctx.arc(6, 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath(); ctx.arc(6, 6, 2, 0, Math.PI * 2); ctx.fill();
    this.refresh(tm, 'bullet_pistol');

    // Player shotgun (amber)
    ctx = this.createCanvas(tm, 'bullet_shotgun', 10, 10);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.arc(5, 5, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ea580c';
    ctx.beginPath(); ctx.arc(5, 5, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(5, 5, 1.5, 0, Math.PI * 2); ctx.fill();
    this.refresh(tm, 'bullet_shotgun');

    // Player repeater (emerald)
    ctx = this.createCanvas(tm, 'bullet_repeater', 10, 10);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(1, 2, 8, 6);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(2, 3, 6, 4);
    ctx.fillStyle = '#bbf7d0';
    ctx.fillRect(4, 4, 3, 2);
    this.refresh(tm, 'bullet_repeater');

    // Penetrator (purple lance)
    ctx = this.createCanvas(tm, 'bullet_penetrator', 20, 10);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 1, 20, 8);
    ctx.fillStyle = '#9333ea';
    ctx.fillRect(1, 2, 18, 6);
    ctx.fillStyle = '#f3e8ff';
    ctx.fillRect(4, 4, 14, 2);
    this.refresh(tm, 'bullet_penetrator');

    // Bow arrow (22x10 cyan crystal arrow)
    ctx = this.createCanvas(tm, 'bullet_arrow', 22, 10);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 3, 18, 4);
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(1, 4, 15, 2);
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(21, 5);
    ctx.lineTo(14, 1);
    ctx.lineTo(14, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(15, 4, 4, 2);
    this.refresh(tm, 'bullet_arrow');

    // Homing fireball (14x14)
    ctx = this.createCanvas(tm, 'bullet_fireball', 14, 14);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.arc(7, 7, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(7, 7, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(7, 7, 2, 0, Math.PI * 2); ctx.fill();
    this.refresh(tm, 'bullet_fireball');

    // Enemy Orb (crimson-magenta diamond)
    ctx = this.createCanvas(tm, 'bullet_enemy_orb', 14, 14);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.arc(7, 7, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e11d48';
    ctx.beginPath(); ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fda4af';
    ctx.beginPath(); ctx.arc(7, 7, 2.5, 0, Math.PI * 2); ctx.fill();
    this.refresh(tm, 'bullet_enemy_orb');

    // Enemy Frost Orb
    ctx = this.createCanvas(tm, 'bullet_enemy_frost', 14, 14);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.arc(7, 7, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cffafe';
    ctx.beginPath(); ctx.arc(7, 7, 2.5, 0, Math.PI * 2); ctx.fill();
    this.refresh(tm, 'bullet_enemy_frost');

    // Boss Orb (larger fiery orb)
    ctx = this.createCanvas(tm, 'bullet_boss_orb', 18, 18);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.arc(9, 9, 8.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath(); ctx.arc(9, 9, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(9, 9, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(9, 9, 2.5, 0, Math.PI * 2); ctx.fill();
    this.refresh(tm, 'bullet_boss_orb');

    // Slash Arc
    ctx = this.createCanvas(tm, 'slash_arc', 68, 68);
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(34, 34, 28, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(34, 34, 30, -Math.PI * 0.38, Math.PI * 0.38);
    ctx.stroke();
    this.refresh(tm, 'slash_arc');

    // Muzzle flash (16x16)
    ctx = this.createCanvas(tm, 'muzzle_flash', 16, 16);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(2, 6, 12, 4);
    ctx.fillRect(6, 2, 4, 12);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(5, 5, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 7, 2, 2);
    this.refresh(tm, 'muzzle_flash');
  }

  private static createHeldWeapons(tm: Phaser.Textures.TextureManager): void {
    const drawGun = (key: string, w: number, h: number, fn: (ctx: CanvasRenderingContext2D) => void) => {
      const ctx = this.createCanvas(tm, key, w, h);
      fn(ctx);
      this.refresh(tm, key);
    };

    // Pistol (20x12)
    drawGun('hand_pistol', 20, 12, ctx => {
      ctx.fillStyle = '#090b10'; ctx.fillRect(2, 2, 16, 5); ctx.fillRect(3, 5, 5, 6);
      ctx.fillStyle = '#64748b'; ctx.fillRect(3, 3, 14, 3);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(11, 3, 4, 2);
      ctx.fillStyle = '#78350f'; ctx.fillRect(4, 6, 3, 4);
    });

    // Shotgun (26x12)
    drawGun('hand_shotgun', 26, 12, ctx => {
      ctx.fillStyle = '#090b10'; ctx.fillRect(1, 2, 24, 5); ctx.fillRect(3, 5, 6, 5);
      ctx.fillStyle = '#78350f'; ctx.fillRect(2, 4, 6, 5);
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(7, 3, 17, 3);
      ctx.fillStyle = '#f97316'; ctx.fillRect(12, 5, 8, 2);
    });

    // Repeater (26x12)
    drawGun('hand_repeater', 26, 12, ctx => {
      ctx.fillStyle = '#090b10'; ctx.fillRect(2, 2, 22, 5); ctx.fillRect(9, 6, 4, 5);
      ctx.fillStyle = '#334155'; ctx.fillRect(3, 3, 20, 3);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(10, 3, 8, 2);
      ctx.fillStyle = '#475569'; ctx.fillRect(10, 6, 2, 4);
    });

    // Penetrator (30x14)
    drawGun('hand_penetrator', 30, 14, ctx => {
      ctx.fillStyle = '#090b10'; ctx.fillRect(1, 3, 28, 7); ctx.fillRect(5, 8, 5, 5);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(2, 4, 26, 5);
      ctx.fillStyle = '#c084fc'; ctx.fillRect(8, 5, 16, 3);
      ctx.fillStyle = '#f3e8ff'; ctx.fillRect(18, 6, 8, 1);
    });

    // Blade (28x10)
    drawGun('hand_blade', 28, 10, ctx => {
      ctx.fillStyle = '#090b10'; ctx.fillRect(1, 3, 26, 4); ctx.fillRect(6, 1, 3, 8);
      ctx.fillStyle = '#78350f'; ctx.fillRect(2, 4, 5, 2);
      ctx.fillStyle = '#d97706'; ctx.fillRect(7, 2, 2, 6);
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(9, 4, 17, 2);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(12, 4, 10, 1);
    });

    // Crystal Bow (18x26)
    drawGun('hand_bow', 18, 26, ctx => {
      ctx.fillStyle = '#090b10';
      ctx.fillRect(5, 1, 5, 24);
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(6, 2, 3, 22);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(8, 3, 4, 4);
      ctx.fillRect(10, 7, 3, 12);
      ctx.fillRect(8, 19, 4, 4);
      // Bowstring
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(6, 3, 1, 20);
    });

    // Fusion Laser (28x14)
    drawGun('hand_laser', 28, 14, ctx => {
      ctx.fillStyle = '#090b10'; ctx.fillRect(2, 2, 24, 9);
      ctx.fillStyle = '#475569'; ctx.fillRect(3, 3, 22, 7);
      ctx.fillStyle = '#f43f5e'; ctx.fillRect(10, 5, 14, 3);
      ctx.fillStyle = '#fecdd3'; ctx.fillRect(22, 5, 3, 3);
    });

    // Ember Staff (28x12)
    drawGun('hand_staff', 28, 12, ctx => {
      ctx.fillStyle = '#090b10'; ctx.fillRect(1, 4, 22, 4); ctx.fillRect(20, 2, 7, 8);
      ctx.fillStyle = '#78350f'; ctx.fillRect(2, 5, 19, 2);
      ctx.fillStyle = '#f97316'; ctx.fillRect(21, 3, 5, 6);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(23, 5, 2, 2);
    });
  }

  private static createPickupsAndProps(tm: Phaser.Textures.TextureManager): void {
    // 1. Heart (+HP)
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

    // 2. Energy Crystal
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

    // 3. Chest
    ctx = this.createCanvas(tm, 'chest_closed', 24, 20);
    ctx.fillStyle = '#090b10'; ctx.fillRect(1, 3, 22, 17);
    ctx.fillStyle = '#78350f'; ctx.fillRect(2, 6, 20, 13);
    ctx.fillStyle = '#d97706'; ctx.fillRect(2, 4, 20, 5);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(10, 8, 4, 5);
    this.refresh(tm, 'chest_closed');

    ctx = this.createCanvas(tm, 'chest_open', 24, 20);
    ctx.fillStyle = '#090b10'; ctx.fillRect(1, 1, 22, 18);
    ctx.fillStyle = '#451a03'; ctx.fillRect(2, 8, 20, 11);
    ctx.fillStyle = '#d97706'; ctx.fillRect(2, 2, 20, 5);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(6, 9, 12, 4);
    this.refresh(tm, 'chest_open');

    // 4. Upgrade Altar
    ctx = this.createCanvas(tm, 'upgrade_altar', 32, 32);
    ctx.fillStyle = '#090b10'; ctx.fillRect(1, 9, 30, 22);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(4, 14, 24, 16);
    ctx.fillStyle = '#334155'; ctx.fillRect(2, 10, 28, 5);
    ctx.fillStyle = '#a855f7'; ctx.fillRect(12, 2, 8, 8);
    ctx.fillStyle = '#e9d5ff'; ctx.fillRect(14, 4, 4, 4);
    this.refresh(tm, 'upgrade_altar');

    // 5. Explosive Red Barrel
    ctx = this.createCanvas(tm, 'barrel_explosive', 24, 26);
    ctx.fillStyle = '#090b10'; ctx.fillRect(1, 1, 22, 24);
    ctx.fillStyle = '#b91c1c'; ctx.fillRect(3, 4, 18, 20);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(2, 2, 20, 3); ctx.fillRect(2, 11, 20, 3); ctx.fillRect(2, 21, 20, 3);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.moveTo(12, 6); ctx.lineTo(16, 12); ctx.lineTo(8, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(11, 9, 2, 2);
    this.refresh(tm, 'barrel_explosive');

    // 6. Toxic Green Barrel
    ctx = this.createCanvas(tm, 'barrel_toxic', 24, 26);
    ctx.fillStyle = '#090b10'; ctx.fillRect(1, 1, 22, 24);
    ctx.fillStyle = '#15803d'; ctx.fillRect(3, 4, 18, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(2, 2, 20, 3); ctx.fillRect(2, 11, 20, 3); ctx.fillRect(2, 21, 20, 3);
    ctx.fillStyle = '#86efac';
    ctx.beginPath(); ctx.arc(12, 9, 3, 0, Math.PI * 2); ctx.fill();
    this.refresh(tm, 'barrel_toxic');

    // 7. Alchemical Flask
    ctx = this.createCanvas(tm, 'flask_alchemical', 16, 16);
    ctx.fillStyle = '#d97706'; ctx.fillRect(6, 1, 4, 3);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(7, 4, 2, 3);
    ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(14, 14); ctx.lineTo(2, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.fillRect(4, 10, 8, 4);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(6, 11, 4, 2);
    this.refresh(tm, 'flask_alchemical');

    // 8. Gold Coin
    ctx = this.createCanvas(tm, 'pickup_coin', 14, 14);
    ctx.fillStyle = '#090b10'; ctx.beginPath(); ctx.arc(7, 7, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(7, 7, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(7, 7, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef08a'; ctx.fillRect(4, 4, 2, 2);
    ctx.fillStyle = '#b45309'; ctx.fillRect(6, 5, 2, 4);
    this.refresh(tm, 'pickup_coin');

    // 9. Merchant NPC
    ctx = this.createCanvas(tm, 'merchant_npc', 24, 30);
    ctx.fillStyle = '#090b10'; ctx.fillRect(3, 5, 18, 24);
    ctx.fillStyle = '#3b0764'; ctx.fillRect(4, 10, 16, 18);
    ctx.fillStyle = '#581c87'; ctx.fillRect(6, 6, 12, 10);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(4, 26, 16, 2); ctx.fillRect(6, 14, 12, 2);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(8, 9, 8, 3);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(9, 10, 2, 2); ctx.fillRect(13, 10, 2, 2);
    this.refresh(tm, 'merchant_npc');

    // 10. Potions
    ctx = this.createCanvas(tm, 'potion_health_large', 16, 18);
    ctx.fillStyle = '#78350f'; ctx.fillRect(6, 1, 4, 3);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(3, 4, 10, 12);
    ctx.fillStyle = '#fca5a5'; ctx.fillRect(4, 5, 2, 8);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(7, 9, 2, 2);
    this.refresh(tm, 'potion_health_large');

    ctx = this.createCanvas(tm, 'potion_energy_large', 16, 18);
    ctx.fillStyle = '#78350f'; ctx.fillRect(6, 1, 4, 3);
    ctx.fillStyle = '#0284c7'; ctx.fillRect(3, 4, 10, 12);
    ctx.fillStyle = '#7dd3fc'; ctx.fillRect(4, 5, 2, 8);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(7, 9, 2, 2);
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
      ctx.beginPath(); ctx.moveTo(8, 24); ctx.lineTo(24, 8); ctx.stroke();
    });
    drawSimpleIcon('icon_bow', '#0f172a', '#22d3ee', ctx => {
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(12, 16, 10, -Math.PI * 0.45, Math.PI * 0.45); ctx.stroke();
      ctx.fillRect(10, 6, 1, 20);
      ctx.fillRect(9, 15, 16, 2);
    });
    drawSimpleIcon('icon_laser', '#0f172a', '#f43f5e', ctx => {
      ctx.fillRect(5, 12, 16, 8);
      ctx.fillStyle = '#fecdd3';
      ctx.fillRect(21, 14, 8, 4);
    });
    drawSimpleIcon('icon_staff', '#0f172a', '#f97316', ctx => {
      ctx.fillRect(7, 15, 13, 3);
      ctx.beginPath(); ctx.arc(22, 16, 4.5, 0, Math.PI * 2); ctx.fill();
    });

    // Upgrades icons
    drawSimpleIcon('upg_armor', '#082f49', '#38bdf8', ctx => {
      ctx.fillRect(10, 8, 12, 14);
      ctx.fillRect(12, 22, 8, 4);
    });
    drawSimpleIcon('upg_hp', '#450a0a', '#ef4444', ctx => {
      ctx.fillRect(14, 8, 4, 16);
      ctx.fillRect(8, 14, 16, 4);
    });
    drawSimpleIcon('upg_energy', '#052e16', '#22c55e', ctx => {
      ctx.beginPath();
      ctx.moveTo(16, 5); ctx.lineTo(24, 16); ctx.lineTo(16, 27); ctx.lineTo(8, 16);
      ctx.closePath(); ctx.fill();
    });
    drawSimpleIcon('upg_pierce', '#2e1065', '#c084fc', ctx => {
      ctx.fillRect(4, 15, 24, 2);
      ctx.fillRect(14, 8, 2, 16);
    });
    drawSimpleIcon('upg_ricochet', '#422006', '#facc15', ctx => {
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(6, 24); ctx.lineTo(16, 8); ctx.lineTo(26, 24); ctx.stroke();
    });
    drawSimpleIcon('upg_melee', '#1e293b', '#f8fafc', ctx => {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(16, 16, 10, -Math.PI * 0.7, Math.PI * 0.3); ctx.stroke();
    });
    drawSimpleIcon('upg_dash', '#431407', '#fb923c', ctx => {
      ctx.beginPath();
      ctx.moveTo(8, 10); ctx.lineTo(20, 16); ctx.lineTo(8, 22);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(21, 10, 3, 12);
    });
    drawSimpleIcon('upg_crit', '#4c0519', '#f43f5e', ctx => {
      ctx.beginPath(); ctx.arc(16, 16, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillRect(15, 4, 2, 24);
      ctx.fillRect(4, 15, 24, 2);
    });
  }
}
