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

    // --- BIOME 2: FROST CAVERN TILES ---
    const drawBiomeFloor = (
      key: string,
      base: string,
      tileA: string,
      tileB: string,
      grout: string,
      accent?: (c: CanvasRenderingContext2D) => void
    ) => {
      const fctx = this.createCanvas(tm, key, 32, 32);
      fctx.fillStyle = base;
      fctx.fillRect(0, 0, 32, 32);
      fctx.fillStyle = tileA;
      fctx.fillRect(1, 1, 14, 14);
      fctx.fillRect(17, 17, 14, 14);
      fctx.fillStyle = tileB;
      fctx.fillRect(17, 1, 14, 14);
      fctx.fillRect(1, 17, 14, 14);
      fctx.fillStyle = grout;
      fctx.fillRect(0, 0, 32, 1);
      fctx.fillRect(0, 15, 32, 2);
      fctx.fillRect(0, 0, 1, 32);
      fctx.fillRect(15, 0, 2, 32);
      if (accent) accent(fctx);
      this.refresh(tm, key);
    };

    drawBiomeFloor('frost_floor_tile', '#0c273b', '#123650', '#0e2c42', '#071926');
    drawBiomeFloor('frost_floor_2', '#0c273b', '#123650', '#0e2c42', '#071926', c => {
      c.fillStyle = '#67e8f9';
      c.fillRect(6, 5, 3, 1);
      c.fillRect(21, 21, 4, 2);
      c.fillStyle = '#a5f3fc';
      c.fillRect(22, 21, 2, 1);
    });

    ctx = this.createCanvas(tm, 'frost_wall_tile', 32, 32);
    ctx.fillStyle = '#071622';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#1e5b78';
    ctx.fillRect(1, 1, 30, 14);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(1, 1, 30, 3);
    ctx.fillStyle = '#11374c';
    ctx.fillRect(1, 16, 30, 14);
    ctx.fillStyle = '#071926';
    ctx.fillRect(15, 1, 2, 14);
    ctx.fillRect(8, 16, 2, 14);
    ctx.fillRect(22, 16, 2, 14);
    ctx.fillStyle = '#a5f3fc';
    ctx.fillRect(13, 13, 6, 3);
    this.refresh(tm, 'frost_wall_tile');

    ctx = this.createCanvas(tm, 'frost_pillar_tile', 32, 32);
    ctx.fillStyle = '#071622';
    ctx.fillRect(1, 1, 30, 30);
    ctx.fillStyle = '#155e75';
    ctx.fillRect(3, 3, 26, 15);
    ctx.fillStyle = '#083344';
    ctx.fillRect(3, 18, 26, 11);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(12, 6, 8, 14);
    ctx.fillStyle = '#ecfeff';
    ctx.fillRect(14, 8, 4, 5);
    this.refresh(tm, 'frost_pillar_tile');

    // Ice Slippery Floor Patch (32x32)
    ctx = this.createCanvas(tm, 'ice_patch', 32, 32);
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(2, 2, 28, 28);
    ctx.fillStyle = '#cffafe';
    ctx.fillRect(5, 5, 10, 3);
    ctx.fillRect(17, 19, 9, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 6, 4, 1);
    this.refresh(tm, 'ice_patch');

    // --- BIOME 3: MOLTEN CORE TILES ---
    drawBiomeFloor('lava_floor_tile', '#241214', '#2e1619', '#211012', '#130809');
    drawBiomeFloor('lava_floor_2', '#241214', '#2e1619', '#211012', '#130809', c => {
      c.fillStyle = '#9a3412';
      c.fillRect(5, 6, 5, 1);
      c.fillRect(20, 22, 4, 2);
      c.fillStyle = '#f97316';
      c.fillRect(21, 22, 2, 1);
    });

    ctx = this.createCanvas(tm, 'lava_wall_tile', 32, 32);
    ctx.fillStyle = '#120708';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#4c1d1b';
    ctx.fillRect(1, 1, 30, 14);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(1, 1, 30, 3);
    ctx.fillStyle = '#2c1010';
    ctx.fillRect(1, 16, 30, 14);
    ctx.fillStyle = '#140808';
    ctx.fillRect(15, 1, 2, 14);
    ctx.fillRect(8, 16, 2, 14);
    ctx.fillRect(22, 16, 2, 14);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(13, 14, 6, 3);
    this.refresh(tm, 'lava_wall_tile');

    ctx = this.createCanvas(tm, 'lava_pillar_tile', 32, 32);
    ctx.fillStyle = '#120708';
    ctx.fillRect(1, 1, 30, 30);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(3, 3, 26, 15);
    ctx.fillStyle = '#290f02';
    ctx.fillRect(3, 18, 26, 11);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(12, 7, 8, 13);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(14, 9, 4, 4);
    this.refresh(tm, 'lava_pillar_tile');

    // Molten Lava Hazard Pool (32x32)
    ctx = this.createCanvas(tm, 'lava_pool', 32, 32);
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(2, 2, 28, 28);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(5, 5, 22, 22);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(8, 9, 5, 4);
    ctx.fillRect(19, 19, 4, 4);
    this.refresh(tm, 'lava_pool');
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
    const px = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w = 1, h = 1) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };

    const drawHeroSprite = (
      key: string,
      classId: 'alchemist' | 'rogue' | 'vanguard',
      colors: { outline: string; body: string; bodyHi: string; hood: string; visor: string; trim: string },
      runOffset: number,
      isHurt: boolean = false
    ) => {
      const ctx = this.createCanvas(tm, key, 28, 30);
      const o = isHurt ? '#ffffff' : colors.outline;
      const b = isHurt ? '#ef4444' : colors.body;
      const bh = isHurt ? '#f87171' : colors.bodyHi;
      const hd = isHurt ? '#dc2626' : colors.hood;
      const vs = isHurt ? '#ffffff' : colors.visor;
      const tr = isHurt ? '#fde047' : colors.trim;
      const bob = runOffset === 0 ? 0 : -1;

      // Flowing cape / scarf tail behind hero
      if (classId === 'rogue') {
        const tailLift = runOffset === 1 ? -1 : runOffset === 2 ? 1 : 0;
        px(ctx, o, 2, 11 + tailLift, 6, 6);
        px(ctx, tr, 3, 12 + tailLift, 4, 4);
        px(ctx, o, 1, 14 + tailLift, 4, 4);
        px(ctx, tr, 2, 15 + tailLift, 2, 2);
      } else {
        px(ctx, o, 5, 13 + bob, 18, 10);
        px(ctx, hd, 6, 14 + bob, 16, 8);
      }

      // Rounded Chibi Head Silhouette (outline)
      px(ctx, o, 7, 3 + bob, 14, 12);
      px(ctx, o, 6, 5 + bob, 16, 9);
      px(ctx, o, 9, 2 + bob, 10, 13);

      // Class-specific Hat / Crest / Headgear
      if (classId === 'alchemist') {
        // Pointed wizard/alchemist hood + flared brim
        px(ctx, o, 9, 0 + bob, 8, 4);
        px(ctx, hd, 10, 1 + bob, 6, 3);
        px(ctx, o, 5, 5 + bob, 18, 3);
        px(ctx, bh, 6, 6 + bob, 16, 1);
        px(ctx, hd, 7, 3 + bob, 14, 5);
      } else if (classId === 'rogue') {
        // Sleek assassin cowl + headband
        px(ctx, hd, 7, 4 + bob, 14, 9);
        px(ctx, bh, 8, 4 + bob, 12, 3);
        px(ctx, tr, 7, 6 + bob, 14, 2); // Crimson ninja headband
      } else {
        // Vanguard Knight horned/plumed helm
        px(ctx, o, 11, 0 + bob, 6, 4);
        px(ctx, tr, 12, 1 + bob, 4, 3); // Gold helmet crest plume
        px(ctx, hd, 7, 4 + bob, 14, 9);
        px(ctx, '#cbd5e1', 8, 4 + bob, 12, 3); // Top steel gleam
      }

      // Face Visor Recess & Expressive Chibi Eyes
      px(ctx, '#090b10', 9, 8 + bob, 10, 5);
      px(ctx, vs, 10, 9 + bob, 3, 3);
      px(ctx, vs, 15, 9 + bob, 3, 3);
      px(ctx, '#ffffff', 11, 9 + bob, 1, 2);
      px(ctx, '#ffffff', 16, 9 + bob, 1, 2);

      // Rounded Torso + Pauldrons + Belt
      px(ctx, o, 6, 14 + bob, 16, 10);
      px(ctx, b, 7, 15 + bob, 14, 8);
      px(ctx, bh, 9, 15 + bob, 10, 5);
      if (classId === 'vanguard') {
        // Wide steel shoulder pauldrons
        px(ctx, o, 4, 14 + bob, 5, 6);
        px(ctx, '#94a3b8', 5, 15 + bob, 3, 4);
        px(ctx, o, 19, 14 + bob, 5, 6);
        px(ctx, '#94a3b8', 20, 15 + bob, 3, 4);
      }
      // Belt & Emblem clasp
      px(ctx, '#1e293b', 7, 20 + bob, 14, 2);
      px(ctx, tr, 12, 19 + bob, 4, 3);

      // Animated Boots
      const lY = runOffset === 1 ? 22 : runOffset === 2 ? 25 : 24;
      const rY = runOffset === 2 ? 22 : runOffset === 1 ? 25 : 24;
      px(ctx, o, 7, lY, 5, 5);
      px(ctx, '#475569', 8, lY + 1, 3, 3);
      px(ctx, o, 16, rY, 5, 5);
      px(ctx, '#475569', 17, rY + 1, 3, 3);

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
      body: '#1e1b4b',
      bodyHi: '#4338ca',
      hood: '#0f172a',
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

    drawHeroSprite('player_idle', 'alchemist', alchemistPalette, 0, false);
    drawHeroSprite('player_run_1', 'alchemist', alchemistPalette, 1, false);
    drawHeroSprite('player_run_2', 'alchemist', alchemistPalette, 2, false);
    drawHeroSprite('player_hurt', 'alchemist', alchemistPalette, 0, true);

    const registerClass = (prefix: string, cid: 'alchemist' | 'rogue' | 'vanguard', palette: typeof alchemistPalette) => {
      drawHeroSprite(`${prefix}_idle`, cid, palette, 0, false);
      drawHeroSprite(`${prefix}_run_1`, cid, palette, 1, false);
      drawHeroSprite(`${prefix}_run_2`, cid, palette, 2, false);
      drawHeroSprite(`${prefix}_hurt`, cid, palette, 0, true);
    };

    registerClass('hero_alchemist', 'alchemist', alchemistPalette);
    registerClass('hero_rogue', 'rogue', roguePalette);
    registerClass('hero_vanguard', 'vanguard', vanguardPalette);
  }

  private static createPetFrames(tm: Phaser.Textures.TextureManager): void {
    const px = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w = 1, h = 1) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    const drawPet = (key: string, hop: boolean) => {
      const ctx = this.createCanvas(tm, key, 22, 22);
      const yOff = hop ? -1 : 0;
      // Cute fluffy tail wagging behind
      px(ctx, '#090b10', 1, 10 + (hop ? -1 : 1), 5, 5);
      px(ctx, '#f59e0b', 2, 11 + (hop ? -1 : 1), 3, 3);
      px(ctx, '#fef3c7', 2, 11 + (hop ? -1 : 1), 2, 2);

      // Pointed fox/pup ears
      px(ctx, '#090b10', 5, 2 + yOff, 4, 5);
      px(ctx, '#090b10', 13, 2 + yOff, 4, 5);
      px(ctx, '#d97706', 6, 3 + yOff, 2, 3);
      px(ctx, '#d97706', 14, 3 + yOff, 2, 3);

      // Rounded head + body
      px(ctx, '#090b10', 5, 5 + yOff, 12, 11);
      px(ctx, '#090b10', 4, 7 + yOff, 14, 8);
      px(ctx, '#d97706', 6, 6 + yOff, 10, 9);
      px(ctx, '#f59e0b', 5, 7 + yOff, 12, 6);
      // Cream cheek & chest fur
      px(ctx, '#fef3c7', 7, 11 + yOff, 8, 4);
      // Expressive cyan eyes + dark nose
      px(ctx, '#090b10', 7, 8 + yOff, 2, 2);
      px(ctx, '#090b10', 13, 8 + yOff, 2, 2);
      px(ctx, '#22d3ee', 7, 8 + yOff, 2, 2);
      px(ctx, '#22d3ee', 13, 8 + yOff, 2, 2);
      px(ctx, '#ffffff', 8, 8 + yOff, 1, 1);
      px(ctx, '#ffffff', 14, 8 + yOff, 1, 1);
      px(ctx, '#090b10', 10, 10 + yOff, 2, 1);
      // Blue collar tag
      px(ctx, '#38bdf8', 8, 14 + yOff, 6, 1);
      // Little paws
      px(ctx, '#090b10', 6, hop ? 16 : 17, 3, 3);
      px(ctx, '#090b10', 13, hop ? 17 : 16, 3, 3);
      px(ctx, '#fef3c7', 7, hop ? 17 : 18, 1, 1);
      px(ctx, '#fef3c7', 14, hop ? 18 : 17, 1, 1);
      this.refresh(tm, key);
    };
    drawPet('pet_golem_1', false);
    drawPet('pet_golem_2', true);
  }

  private static createEnemyFrames(tm: Phaser.Textures.TextureManager): void {
    const px = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w = 1, h = 1) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };

    // 1. Grunt (26x26): Horned Goblin/Gargoyle Raider with club
    let ctx = this.createCanvas(tm, 'enemy_grunt', 26, 26);
    // Pointed goblin ears & horns
    px(ctx, '#090b10', 2, 5, 5, 4);
    px(ctx, '#090b10', 19, 5, 5, 4);
    px(ctx, '#64748b', 3, 6, 3, 2);
    px(ctx, '#64748b', 20, 6, 3, 2);
    // Rounded head & torso
    px(ctx, '#090b10', 6, 3, 14, 18);
    px(ctx, '#090b10', 5, 6, 16, 13);
    px(ctx, '#475569', 7, 4, 12, 9);
    px(ctx, '#64748b', 8, 4, 10, 4);
    // Fierce eyes & fanged mouth
    px(ctx, '#090b10', 8, 8, 10, 3);
    px(ctx, '#ef4444', 9, 8, 3, 2);
    px(ctx, '#ef4444', 14, 8, 3, 2);
    px(ctx, '#fef08a', 10, 8, 1, 1);
    px(ctx, '#fef08a', 15, 8, 1, 1);
    // Ragged leather vest + iron club in right hand
    px(ctx, '#78350f', 7, 13, 12, 7);
    px(ctx, '#92400e', 9, 14, 8, 4);
    px(ctx, '#090b10', 20, 10, 5, 9);
    px(ctx, '#94a3b8', 21, 11, 3, 5);
    px(ctx, '#78350f', 22, 16, 2, 2);
    // Feet
    px(ctx, '#090b10', 7, 21, 4, 4);
    px(ctx, '#090b10', 15, 21, 4, 4);
    this.refresh(tm, 'enemy_grunt');

    // 2. Shooter (26x28): Pointed Hood Cultist Sniper with scope rifle
    ctx = this.createCanvas(tm, 'enemy_shooter', 26, 28);
    px(ctx, '#090b10', 9, 1, 8, 4);
    px(ctx, '#090b10', 6, 4, 14, 19);
    px(ctx, '#090b10', 5, 11, 16, 11);
    px(ctx, '#4c1d95', 7, 5, 12, 9);
    px(ctx, '#6d28d9', 10, 2, 6, 4);
    // Dark face + golden targeting monocle
    px(ctx, '#090b10', 8, 8, 10, 5);
    px(ctx, '#facc15', 13, 8, 5, 4);
    px(ctx, '#ef4444', 15, 9, 2, 2);
    px(ctx, '#a855f7', 9, 9, 2, 2);
    // Robe cloak + sniper rifle
    px(ctx, '#3b0764', 7, 14, 12, 8);
    px(ctx, '#581c87', 9, 14, 8, 6);
    px(ctx, '#090b10', 14, 14, 11, 5);
    px(ctx, '#94a3b8', 15, 15, 9, 2);
    px(ctx, '#ef4444', 22, 15, 2, 2);
    px(ctx, '#090b10', 7, 23, 4, 4);
    px(ctx, '#090b10', 15, 23, 4, 4);
    this.refresh(tm, 'enemy_shooter');

    // 3. Fan Caster (28x28): Horned Flame Cultist with fire wisps
    ctx = this.createCanvas(tm, 'enemy_fan_caster', 28, 28);
    // Curved obsidian demon horns
    px(ctx, '#090b10', 5, 1, 4, 6);
    px(ctx, '#090b10', 19, 1, 4, 6);
    px(ctx, '#f97316', 6, 2, 2, 3);
    px(ctx, '#f97316', 20, 2, 2, 3);
    // Head & robe
    px(ctx, '#090b10', 7, 4, 14, 20);
    px(ctx, '#090b10', 5, 12, 18, 11);
    px(ctx, '#9a3412', 8, 5, 12, 9);
    px(ctx, '#ea580c', 10, 5, 8, 4);
    // Glowing demonic mask eyes
    px(ctx, '#090b10', 9, 9, 10, 4);
    px(ctx, '#fde047', 10, 10, 3, 2);
    px(ctx, '#fde047', 15, 10, 3, 2);
    px(ctx, '#7c2d12', 7, 14, 14, 9);
    px(ctx, '#f59e0b', 12, 15, 4, 6);
    // Floating fire orbs in hands
    px(ctx, '#f97316', 2, 13, 4, 4);
    px(ctx, '#fef08a', 3, 14, 2, 2);
    px(ctx, '#f97316', 22, 13, 4, 4);
    px(ctx, '#fef08a', 23, 14, 2, 2);
    this.refresh(tm, 'enemy_fan_caster');

    // 4. Charger (30x28): Iron War-Boar / Mech-Bull with tusks & furnace core
    ctx = this.createCanvas(tm, 'enemy_charger', 30, 28);
    // Armored body silhouette
    px(ctx, '#090b10', 4, 5, 22, 18);
    px(ctx, '#090b10', 2, 9, 26, 11);
    px(ctx, '#3f3f46', 5, 6, 20, 16);
    px(ctx, '#71717a', 7, 7, 16, 7);
    // Curved silver bull horns / tusks
    px(ctx, '#090b10', 1, 5, 5, 6);
    px(ctx, '#090b10', 24, 5, 5, 6);
    px(ctx, '#e2e8f0', 2, 6, 3, 4);
    px(ctx, '#e2e8f0', 25, 6, 3, 4);
    // Angry glowing furnace eyes + magma chest core
    px(ctx, '#090b10', 8, 10, 14, 4);
    px(ctx, '#f97316', 9, 11, 4, 2);
    px(ctx, '#f97316', 17, 11, 4, 2);
    px(ctx, '#090b10', 12, 16, 6, 4);
    px(ctx, '#fb923c', 13, 17, 4, 2);
    // Heavy iron hooves
    px(ctx, '#090b10', 6, 23, 5, 4);
    px(ctx, '#090b10', 19, 23, 5, 4);
    this.refresh(tm, 'enemy_charger');

    // 5. Frost Mage (26x28): Crowned Cryomancer with crystal staff
    ctx = this.createCanvas(tm, 'enemy_frost_mage', 26, 28);
    // 3-prong ice crystal crown
    px(ctx, '#090b10', 7, 0, 12, 5);
    px(ctx, '#38bdf8', 8, 2, 2, 3);
    px(ctx, '#67e8f9', 12, 0, 2, 5);
    px(ctx, '#38bdf8', 16, 2, 2, 3);
    // Hood & fur-lined icy cloak
    px(ctx, '#090b10', 6, 4, 14, 20);
    px(ctx, '#0e7490', 7, 5, 12, 10);
    px(ctx, '#090b10', 8, 8, 10, 4);
    px(ctx, '#cffafe', 9, 9, 3, 2);
    px(ctx, '#cffafe', 14, 9, 3, 2);
    // White fur collar + teal robe
    px(ctx, '#e0f2fe', 6, 13, 14, 3);
    px(ctx, '#155e75', 7, 16, 12, 7);
    px(ctx, '#22d3ee', 11, 16, 4, 6);
    // Floating crystal ice staff
    px(ctx, '#090b10', 21, 7, 4, 16);
    px(ctx, '#78350f', 22, 12, 2, 10);
    px(ctx, '#67e8f9', 21, 7, 4, 5);
    px(ctx, '#ffffff', 22, 8, 2, 2);
    this.refresh(tm, 'enemy_frost_mage');

    // 6. Frost Knight (28x28): Glacial Armored Paladin with Horned Ice Helm & Spear
    ctx = this.createCanvas(tm, 'enemy_frost_knight', 28, 28);
    px(ctx, '#090b10', 4, 1, 4, 6);
    px(ctx, '#090b10', 20, 1, 4, 6);
    px(ctx, '#e0f2fe', 5, 2, 2, 4);
    px(ctx, '#e0f2fe', 21, 2, 2, 4);
    px(ctx, '#090b10', 6, 4, 16, 20);
    px(ctx, '#0284c7', 7, 5, 14, 9);
    px(ctx, '#38bdf8', 8, 5, 12, 4);
    px(ctx, '#090b10', 9, 9, 10, 4);
    px(ctx, '#22d3ee', 10, 10, 3, 2);
    px(ctx, '#22d3ee', 15, 10, 3, 2);
    px(ctx, '#1e3a8a', 7, 14, 14, 9);
    px(ctx, '#bae6fd', 12, 15, 4, 6);
    // Glacial halberd/spear on right side
    px(ctx, '#090b10', 22, 3, 5, 20);
    px(ctx, '#94a3b8', 24, 9, 2, 13);
    px(ctx, '#67e8f9', 22, 4, 4, 6);
    this.refresh(tm, 'enemy_frost_knight');
  }

  private static createBossFrames(tm: Phaser.Textures.TextureManager): void {
    const px = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w = 1, h = 1) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };

    const drawBoss = (key: string, isPhase2: boolean) => {
      const ctx = this.createCanvas(tm, key, 56, 56);
      const o = '#090b10';
      const cape = isPhase2 ? '#7f1d1d' : '#451a03';
      const armor = isPhase2 ? '#b91c1c' : '#78350f';
      const armorHi = isPhase2 ? '#ef4444' : '#b45309';
      const gold = isPhase2 ? '#fef08a' : '#f59e0b';
      const core = isPhase2 ? '#ffffff' : '#fb923c';

      // Billowing dark-flame cape behind boss
      px(ctx, o, 7, 15, 42, 34);
      px(ctx, cape, 9, 17, 38, 30);

      // Towering Horned Obsidian & Gold Crown
      px(ctx, o, 14, 2, 6, 12);
      px(ctx, o, 24, 0, 8, 12);
      px(ctx, o, 36, 2, 6, 12);
      px(ctx, gold, 15, 3, 4, 9);
      px(ctx, gold, 26, 1, 4, 10);
      px(ctx, gold, 37, 3, 4, 9);

      // Armored Skull / Helm
      px(ctx, o, 15, 10, 26, 16);
      px(ctx, armor, 17, 12, 22, 12);
      px(ctx, armorHi, 19, 12, 18, 5);
      // Glowing Archmage Visor & Eyes
      px(ctx, o, 19, 17, 18, 6);
      px(ctx, core, 21, 18, 5, 4);
      px(ctx, core, 30, 18, 5, 4);
      px(ctx, '#ffffff', 22, 19, 2, 2);
      px(ctx, '#ffffff', 31, 19, 2, 2);

      // Heavy Spiked Shoulder Pauldrons
      px(ctx, o, 4, 18, 12, 14);
      px(ctx, armorHi, 6, 20, 8, 10);
      px(ctx, gold, 5, 17, 5, 4);
      px(ctx, o, 40, 18, 12, 14);
      px(ctx, armorHi, 42, 20, 8, 10);
      px(ctx, gold, 46, 17, 5, 4);

      // Chestplate & Molten Core Reactor
      px(ctx, o, 14, 25, 28, 22);
      px(ctx, armor, 16, 26, 24, 20);
      px(ctx, gold, 18, 27, 20, 3);
      px(ctx, o, 22, 31, 12, 11);
      px(ctx, isPhase2 ? '#ef4444' : '#ea580c', 23, 32, 10, 9);
      px(ctx, gold, 25, 34, 6, 5);
      px(ctx, core, 27, 35, 2, 3);

      // Grand Arcane Fire Staff held on right
      px(ctx, o, 48, 12, 5, 36);
      px(ctx, '#78350f', 49, 22, 3, 24);
      px(ctx, o, 46, 8, 9, 11);
      px(ctx, isPhase2 ? '#ef4444' : '#f97316', 47, 9, 7, 9);
      px(ctx, gold, 49, 11, 3, 5);

      // Heavy Armored Boots
      px(ctx, o, 15, 47, 9, 7);
      px(ctx, gold, 17, 48, 5, 4);
      px(ctx, o, 32, 47, 9, 7);
      px(ctx, gold, 34, 48, 5, 4);

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

    // 11. Wave Spawn Warning X Marker (24x24)
    ctx = this.createCanvas(tm, 'spawn_marker_x', 24, 24);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(4, 4); ctx.lineTo(20, 20);
    ctx.moveTo(20, 4); ctx.lineTo(4, 20);
    ctx.stroke();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(6, 6); ctx.lineTo(18, 18);
    ctx.moveTo(18, 6); ctx.lineTo(6, 18);
    ctx.stroke();
    this.refresh(tm, 'spawn_marker_x');

    // 12. Beverage Vending Machine (28x36)
    ctx = this.createCanvas(tm, 'vending_machine', 28, 36);
    ctx.fillStyle = '#090b10'; ctx.fillRect(2, 2, 24, 32);
    ctx.fillStyle = '#0284c7'; ctx.fillRect(4, 4, 20, 28);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(4, 4, 20, 4);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(6, 9, 13, 14);
    // Colorful drink cans inside display window
    ctx.fillStyle = '#ef4444'; ctx.fillRect(7, 11, 3, 4);
    ctx.fillStyle = '#22c55e'; ctx.fillRect(11, 11, 3, 4);
    ctx.fillStyle = '#facc15'; ctx.fillRect(15, 11, 3, 4);
    ctx.fillStyle = '#a855f7'; ctx.fillRect(7, 17, 3, 4);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(11, 17, 3, 4);
    // Dispenser slot
    ctx.fillStyle = '#090b10'; ctx.fillRect(6, 25, 14, 5);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(20, 12, 3, 5);
    this.refresh(tm, 'vending_machine');

    // 13. Weapon Forge Anvil (32x28)
    ctx = this.createCanvas(tm, 'forge_anvil', 32, 28);
    ctx.fillStyle = '#090b10'; ctx.fillRect(2, 6, 28, 20);
    ctx.fillStyle = '#334155'; ctx.fillRect(6, 16, 20, 9);
    ctx.fillStyle = '#64748b'; ctx.fillRect(3, 8, 26, 8);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(5, 8, 22, 3);
    // Glowing hot ember runes & hammer spark
    ctx.fillStyle = '#f97316'; ctx.fillRect(12, 11, 8, 3);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(14, 11, 4, 2);
    this.refresh(tm, 'forge_anvil');
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
    drawSimpleIcon('upg_vampire', '#450a0a', '#e11d48', ctx => {
      ctx.beginPath();
      ctx.moveTo(10, 8); ctx.lineTo(14, 24); ctx.lineTo(16, 14);
      ctx.lineTo(18, 24); ctx.lineTo(22, 8);
      ctx.closePath(); ctx.fill();
    });
    drawSimpleIcon('upg_trap', '#064e3b', '#34d399', ctx => {
      ctx.fillRect(8, 20, 16, 4);
      ctx.beginPath();
      ctx.moveTo(9, 20); ctx.lineTo(12, 9); ctx.lineTo(15, 20);
      ctx.moveTo(17, 20); ctx.lineTo(20, 9); ctx.lineTo(23, 20);
      ctx.fill();
    });
    drawSimpleIcon('upg_shotgun', '#422006', '#fbbf24', ctx => {
      ctx.fillRect(6, 14, 7, 4);
      ctx.fillRect(16, 8, 9, 3);
      ctx.fillRect(16, 14, 10, 3);
      ctx.fillRect(16, 20, 9, 3);
    });
    drawSimpleIcon('upg_shockwave', '#1e1b4b', '#60a5fa', ctx => {
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(16, 16, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(16, 16, 5, 0, Math.PI * 2); ctx.fill();
    });
  }
}
