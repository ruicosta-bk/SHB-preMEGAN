import Phaser from 'phaser';
import { generateNewBiomeEnemyTextures } from './textures/EnemyBossTextures';

export class TextureGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    const tm = scene.textures;

    this.createShadow(tm);
    this.createTiles(tm);
    this.createEnvironmentAndTraps(tm);
    this.createVfxTextures(tm);
    this.createAllHeroFrames(tm);
    this.createPetFrames(tm);
    this.createEnemyFrames(tm);
    this.createBossFrames(tm);
    this.createProjectiles(tm);
    this.createHeldWeapons(tm);
    this.createPickupsAndProps(tm);
    this.createTurretFrames(tm);
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
      // Subtle frosted seam and diamond crystal gleam
      c.fillStyle = '#164e63';
      c.fillRect(4, 10, 6, 1);
      c.fillRect(19, 6, 5, 1);
      c.fillStyle = '#38bdf8';
      c.fillRect(6, 5, 3, 2);
      c.fillRect(20, 20, 5, 3);
      c.fillStyle = '#67e8f9';
      c.fillRect(6, 5, 2, 1);
      c.fillRect(21, 21, 3, 2);
      c.fillStyle = '#cffafe';
      c.fillRect(22, 21, 2, 1);
      c.fillStyle = '#ffffff';
      c.fillRect(7, 5, 1, 1);
      c.fillRect(22, 21, 1, 1);
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
      // Cracked volcanic fissure with bright ember vein highlight
      c.fillStyle = '#7c2d12';
      c.fillRect(4, 5, 7, 2);
      c.fillRect(19, 21, 7, 3);
      c.fillStyle = '#ea580c';
      c.fillRect(5, 6, 5, 1);
      c.fillRect(20, 22, 5, 2);
      c.fillStyle = '#f97316';
      c.fillRect(6, 6, 3, 1);
      c.fillRect(21, 22, 3, 1);
      c.fillStyle = '#fbbf24';
      c.fillRect(7, 6, 1, 1);
      c.fillRect(22, 22, 2, 1);
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
      // Deep obsidian-indigo outer ring
      pCtx.fillStyle = '#1e1b4b';
      pCtx.beginPath();
      pCtx.ellipse(22, 22, 20, 21, 0, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.fillStyle = '#312e81';
      pCtx.beginPath();
      pCtx.ellipse(22, 22, 18, 20, 0, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.fillStyle = '#6366f1';
      pCtx.beginPath();
      pCtx.ellipse(22, 22, rot ? 13 : 15, rot ? 16 : 14, 0, 0, Math.PI * 2);
      pCtx.fill();
      // Concentric glowing rune pixels along the outer & inner vortex rings
      const runeAngles = [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75, Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75];
      runeAngles.forEach((baseAngle, idx) => {
        const a = baseAngle + (rot ? Math.PI * 0.125 : 0);
        const rx = Math.round(22 + Math.cos(a) * 15);
        const ry = Math.round(22 + Math.sin(a) * 16.5);
        pCtx.fillStyle = idx % 2 === 0 ? '#22d3ee' : '#c084fc';
        pCtx.fillRect(rx - 1, ry - 1, 2, 2);
        pCtx.fillStyle = idx % 2 === 0 ? '#a5f3fc' : '#e9d5ff';
        pCtx.fillRect(rx, ry, 1, 1);

        const ix = Math.round(22 + Math.cos(a + 0.35) * 10);
        const iy = Math.round(22 + Math.sin(a + 0.35) * 11.5);
        pCtx.fillStyle = '#7dd3fc';
        pCtx.fillRect(ix, iy, 2, 2);
      });
      pCtx.fillStyle = '#38bdf8';
      pCtx.beginPath();
      pCtx.ellipse(22, 22, 8, 10, 0, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.fillStyle = '#bae6fd';
      pCtx.beginPath();
      pCtx.ellipse(22, 22, 5, 6.5, 0, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.fillStyle = '#e0f2fe';
      pCtx.fillRect(19, 18, 6, 8);
      pCtx.fillStyle = '#ffffff';
      pCtx.fillRect(21, 20, 2, 4);
      this.refresh(tm, key);
    };
    drawPortal('portal_1', false);
    drawPortal('portal_2', true);
  }

  private static createVfxTextures(tm: Phaser.Textures.TextureManager): void {
    // Soft radial glow (48x48, pure white for tinting + ADD blend mode)
    let ctx = this.createCanvas(tm, 'glow_soft', 48, 48);
    const grad = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 48, 48);
    this.refresh(tm, 'glow_soft');

    // Crisp hollow aura/status ring (36x36, pure white for tinting)
    ctx = this.createCanvas(tm, 'glow_ring', 36, 36);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(18, 18, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(18, 18, 14, 0, Math.PI * 2);
    ctx.stroke();
    this.refresh(tm, 'glow_ring');

    // Crisp bright spark pixel (4x4, pure white for pooled hit/muzzle/death sparks)
    ctx = this.createCanvas(tm, 'spark_pixel', 4, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.fillRect(0, 0, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 1, 2, 2);
    this.refresh(tm, 'spark_pixel');

    // Soft rounded dust puff (10x10, pure white for footstep & explosion smoke)
    ctx = this.createCanvas(tm, 'dust_puff', 10, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(5, 5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(5, 5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 4, 2, 2);
    this.refresh(tm, 'dust_puff');
  }

  private static createAllHeroFrames(tm: Phaser.Textures.TextureManager): void {
    const px = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w = 1, h = 1) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };

    type HeroVisualClass = 'alchemist' | 'rogue' | 'vanguard' | 'knight' | 'wizard' | 'vampire' | 'engineer' | 'berserker';

    const drawHeroSprite = (
      key: string,
      classId: HeroVisualClass,
      colors: { outline: string; body: string; bodyHi: string; hood: string; eye: string; trim: string; skin: string },
      runOffset: number,
      isHurt: boolean = false
    ) => {
      const ctx = this.createCanvas(tm, key, 28, 30);
      const o = isHurt ? '#ffffff' : colors.outline;
      const b = isHurt ? '#ef4444' : colors.body;
      const bh = isHurt ? '#f87171' : colors.bodyHi;
      const hd = isHurt ? '#dc2626' : colors.hood;
      const ey = isHurt ? '#ffffff' : colors.eye;
      const tr = isHurt ? '#fde047' : colors.trim;
      const sk = isHurt ? '#fecaca' : colors.skin;
      const bob = runOffset === 0 ? 0 : -1;

      // Flowing Scarf / Cape behind character (adds Soul Knight dynamism)
      const tailLift = runOffset === 1 ? -1 : runOffset === 2 ? 1 : 0;
      if (classId === 'rogue' || classId === 'knight' || classId === 'wizard') {
        px(ctx, o, 2, 12 + bob + tailLift, 6, 5);
        px(ctx, tr, 3, 13 + bob + tailLift, 4, 3);
        px(ctx, o, 1, 15 + bob + tailLift, 4, 3);
        px(ctx, tr, 2, 16 + bob + tailLift, 2, 1);
      } else if (classId === 'vampire') {
        // High pointed Dracula cloak behind shoulders & hips
        px(ctx, o, 3, 10 + bob, 22, 13);
        px(ctx, tr, 4, 11 + bob, 20, 11);
        px(ctx, '#450a0a', 5, 14 + bob, 18, 7);
      } else if (classId === 'engineer') {
        // Mechanical backpack + large amber wrench rising behind left shoulder
        px(ctx, o, 2, 5 + bob + tailLift, 6, 5);
        px(ctx, o, 3, 9 + bob + tailLift, 4, 8);
        px(ctx, tr, 3, 6 + bob + tailLift, 1, 3); // left wrench jaw
        px(ctx, tr, 6, 6 + bob + tailLift, 1, 3); // right wrench jaw
        px(ctx, tr, 3, 8 + bob + tailLift, 4, 2); // wrench collar
        px(ctx, tr, 4, 10 + bob + tailLift, 2, 6); // wrench shaft
        px(ctx, isHurt ? '#ffffff' : '#fef08a', 4, 9 + bob + tailLift, 1, 2); // metallic gleam
        px(ctx, o, 4, 13 + bob, 19, 10);
        px(ctx, hd, 5, 14 + bob, 17, 8);
      } else if (classId === 'berserker') {
        // Trailing crimson headband tails behind left side
        px(ctx, o, 1, 9 + bob + tailLift, 6, 4);
        px(ctx, tr, 2, 10 + bob + tailLift, 4, 2);
        px(ctx, o, 2, 12 + bob + tailLift, 4, 3);
        px(ctx, isHurt ? '#fca5a5' : '#991b1b', 3, 13 + bob + tailLift, 2, 1);
        px(ctx, o, 5, 13 + bob, 18, 10);
        px(ctx, '#334155', 6, 14 + bob, 16, 8);
      } else {
        px(ctx, o, 5, 13 + bob, 18, 10);
        px(ctx, hd, 6, 14 + bob, 16, 8);
      }

      // Head / Hat / Hair Base (no boxy Among-Us shape!)
      px(ctx, o, 7, 4 + bob, 14, 11);
      px(ctx, o, 8, 3 + bob, 12, 12);

      if (classId === 'alchemist') {
        // Hooded alchemist cap + brass forehead goggles + dark green mask with bright cyan eyes
        px(ctx, hd, 8, 4 + bob, 12, 10);
        px(ctx, bh, 9, 4 + bob, 10, 3);
        px(ctx, '#090b10', 9, 9 + bob, 10, 4);
        // Brass goggles on brow
        px(ctx, tr, 8, 6 + bob, 5, 3);
        px(ctx, tr, 15, 6 + bob, 5, 3);
        px(ctx, '#bae6fd', 9, 7 + bob, 3, 1);
        px(ctx, '#bae6fd', 16, 7 + bob, 3, 1);
        // Crisp 2x2 glowing eyes inside lower hood (separated by nose bridge)
        px(ctx, ey, 10, 10 + bob, 2, 2);
        px(ctx, ey, 16, 10 + bob, 2, 2);
        // Scarf wrap around neck
        px(ctx, tr, 8, 13 + bob, 12, 2);
      } else if (classId === 'rogue') {
        // Fluffy crimson-auburn tousled hair + lower ninja bandana (Soul Knight Rogue style!)
        px(ctx, o, 6, 2 + bob, 16, 5);
        px(ctx, bh, 7, 3 + bob, 14, 4);
        px(ctx, '#f43f5e', 9, 2 + bob, 8, 2); // spiky hair tuft
        px(ctx, '#fb7185', 6, 4 + bob, 3, 3);
        // Face skin upper + crisp dark bandana lower
        px(ctx, sk, 8, 7 + bob, 12, 3);
        px(ctx, '#090b10', 10, 7 + bob, 2, 2);
        px(ctx, '#090b10', 16, 7 + bob, 2, 2);
        px(ctx, tr, 8, 10 + bob, 12, 4); // crimson face mask
        px(ctx, '#9f1239', 10, 11 + bob, 8, 2);
      } else if (classId === 'vanguard') {
        // Paladin silver-gold helm with signature vertical gold cross-guard ("T" visor)
        px(ctx, o, 11, 0 + bob, 6, 4);
        px(ctx, tr, 12, 1 + bob, 4, 3); // top crest
        px(ctx, hd, 8, 4 + bob, 12, 10);
        px(ctx, '#e2e8f0', 9, 4 + bob, 10, 3);
        // Separate left & right eye slits split by golden nose bridge (NOT one wide bar!)
        px(ctx, '#090b10', 9, 8 + bob, 4, 3);
        px(ctx, '#090b10', 15, 8 + bob, 4, 3);
        px(ctx, tr, 13, 6 + bob, 2, 7); // golden Paladin vertical cross bar
        px(ctx, ey, 10, 9 + bob, 2, 2);
        px(ctx, ey, 16, 9 + bob, 2, 2);
      } else if (classId === 'knight') {
        // Classic Soul Knight Silver Kettle Helm with open peach face + dark crisp chibi eyes
        px(ctx, o, 11, 1 + bob, 6, 3);
        px(ctx, tr, 12, 2 + bob, 4, 2); // small gold helm plume
        px(ctx, hd, 8, 4 + bob, 12, 5);
        px(ctx, '#e2e8f0', 9, 4 + bob, 10, 2); // steel shine
        // Warm skin face inside open visor arch
        px(ctx, hd, 8, 8 + bob, 2, 6);
        px(ctx, hd, 18, 8 + bob, 2, 6);
        px(ctx, sk, 10, 8 + bob, 8, 6);
        // Chibi vertical eyes
        px(ctx, ey, 11, 9 + bob, 2, 3);
        px(ctx, ey, 15, 9 + bob, 2, 3);
        // Orange-gold scarf around chin
        px(ctx, tr, 8, 13 + bob, 12, 3);
      } else if (classId === 'wizard') {
        // Soul Knight Wizard: tall pointed hat + wide curved brim + peach skin + magenta scarf
        px(ctx, o, 11, 0 + bob, 7, 4);
        px(ctx, hd, 12, 1 + bob, 5, 3);
        px(ctx, o, 4, 5 + bob, 20, 3);
        px(ctx, hd, 5, 6 + bob, 18, 2);
        px(ctx, tr, 8, 5 + bob, 12, 1); // hat ribbon
        // Spiky magenta bangs + warm face + dark chibi eyes
        px(ctx, sk, 9, 8 + bob, 10, 5);
        px(ctx, '#f472b6', 8, 8 + bob, 2, 3);
        px(ctx, '#f472b6', 18, 8 + bob, 2, 3);
        px(ctx, ey, 11, 9 + bob, 2, 2);
        px(ctx, ey, 15, 9 + bob, 2, 2);
        px(ctx, '#fecaca', 10, 11 + bob, 1, 1); // blush
        px(ctx, '#fecaca', 17, 11 + bob, 1, 1);
        // Magenta neck scarf
        px(ctx, tr, 8, 13 + bob, 12, 2);
      } else if (classId === 'engineer') {
        // Engineer cap + brass welding goggles with glowing teal lenses + teal-slate collar
        px(ctx, hd, 8, 4 + bob, 12, 6);
        px(ctx, bh, 9, 4 + bob, 10, 2);
        // Brass welding goggles spanning brow
        px(ctx, o, 6, 6 + bob, 16, 5);
        px(ctx, tr, 7, 7 + bob, 6, 3);
        px(ctx, tr, 15, 7 + bob, 6, 3);
        px(ctx, isHurt ? '#fca5a5' : '#b45309', 13, 8 + bob, 2, 2); // brass bridge
        // Glowing teal lenses
        px(ctx, ey, 8, 8 + bob, 4, 2);
        px(ctx, ey, 16, 8 + bob, 4, 2);
        px(ctx, '#ccfbf1', 9, 8 + bob, 2, 1);
        px(ctx, '#ccfbf1', 17, 8 + bob, 2, 1);
        // Warm face lower + teal-slate scarf collar
        px(ctx, sk, 9, 11 + bob, 10, 3);
        px(ctx, '#334155', 11, 12 + bob, 6, 1); // respirator/smirk line
        px(ctx, hd, 8, 13 + bob, 12, 2);
      } else if (classId === 'berserker') {
        // Spiked crimson mane + crimson headband + fierce glowing eyes
        px(ctx, o, 6, 1 + bob, 4, 4);
        px(ctx, o, 11, 0 + bob, 6, 5);
        px(ctx, o, 18, 1 + bob, 4, 4);
        px(ctx, hd, 7, 2 + bob, 3, 4);
        px(ctx, hd, 12, 1 + bob, 4, 5);
        px(ctx, hd, 18, 2 + bob, 3, 4);
        px(ctx, isHurt ? '#ffffff' : '#f87171', 13, 2 + bob, 2, 2); // spike gleam
        // Crimson headband across forehead
        px(ctx, o, 7, 5 + bob, 14, 4);
        px(ctx, tr, 8, 6 + bob, 12, 2);
        px(ctx, isHurt ? '#ffffff' : '#f59e0b', 13, 6 + bob, 2, 2); // gold headband clasp
        // Fierce face + glowing eyes
        px(ctx, sk, 8, 8 + bob, 12, 6);
        px(ctx, '#090b10', 9, 9 + bob, 4, 2);
        px(ctx, '#090b10', 15, 9 + bob, 4, 2);
        px(ctx, ey, 10, 9 + bob, 2, 2);
        px(ctx, ey, 16, 9 + bob, 2, 2);
        px(ctx, '#991b1b', 12, 12 + bob, 4, 1); // fierce grimace
        px(ctx, tr, 8, 13 + bob, 12, 2);
      } else {
        // Soul Knight Vampire: swept dark widow's-peak hair, pale gray face, crisp eyes, crimson collar
        px(ctx, o, 7, 2 + bob, 14, 5);
        px(ctx, hd, 8, 3 + bob, 12, 4);
        px(ctx, hd, 13, 6 + bob, 2, 2); // widow's peak center dip
        px(ctx, sk, 8, 7 + bob, 12, 7);
        px(ctx, '#090b10', 10, 9 + bob, 2, 2);
        px(ctx, '#090b10', 16, 9 + bob, 2, 2);
        px(ctx, ey, 10, 9 + bob, 1, 1); // subtle crimson iris glint
        px(ctx, ey, 16, 9 + bob, 1, 1);
        px(ctx, tr, 7, 12 + bob, 3, 3); // flared left collar
        px(ctx, tr, 18, 12 + bob, 3, 3); // flared right collar
      }

      // Rounded Chibi Torso + Class Details + Belt
      px(ctx, o, 6, 15 + bob, 16, 9);
      px(ctx, b, 7, 16 + bob, 14, 7);
      px(ctx, bh, 9, 16 + bob, 10, 4);
      if (classId === 'vanguard') {
        px(ctx, o, 4, 15 + bob, 5, 6);
        px(ctx, '#cbd5e1', 5, 16 + bob, 3, 4);
        px(ctx, o, 19, 15 + bob, 5, 6);
        px(ctx, '#cbd5e1', 20, 16 + bob, 3, 4);
      } else if (classId === 'vampire') {
        // Ruby pendant & pale cravat
        px(ctx, '#e2e8f0', 12, 16 + bob, 4, 4);
        px(ctx, '#ef4444', 13, 17 + bob, 2, 2);
      } else if (classId === 'engineer') {
        // Teal-slate coat lapels, brass buttons & chest pocket badge
        px(ctx, tr, 10, 17 + bob, 1, 1);
        px(ctx, tr, 10, 19 + bob, 1, 1);
        px(ctx, ey, 16, 17 + bob, 3, 2);
      } else if (classId === 'berserker') {
        // Dark iron chestplate bevel & heavy spiked iron gauntlets
        px(ctx, isHurt ? '#fecaca' : '#94a3b8', 10, 17 + bob, 8, 1);
        px(ctx, tr, 13, 18 + bob, 2, 2);
        px(ctx, o, 3, 15 + bob, 5, 7);
        px(ctx, '#334155', 4, 16 + bob, 3, 5);
        px(ctx, '#64748b', 4, 16 + bob, 2, 2);
        px(ctx, tr, 4, 20 + bob, 3, 1);
        px(ctx, o, 20, 15 + bob, 5, 7);
        px(ctx, '#334155', 21, 16 + bob, 3, 5);
        px(ctx, '#64748b', 22, 16 + bob, 2, 2);
        px(ctx, tr, 21, 20 + bob, 3, 1);
      }
      // Belt & Emblem clasp
      px(ctx, '#1e293b', 7, 21 + bob, 14, 2);
      px(ctx, tr, 12, 20 + bob, 4, 3);

      // Animated Boots
      const lY = runOffset === 1 ? 23 : runOffset === 2 ? 25 : 24;
      const rY = runOffset === 2 ? 23 : runOffset === 1 ? 25 : 24;
      px(ctx, o, 7, lY, 5, 5);
      px(ctx, '#475569', 8, lY + 1, 3, 3);
      px(ctx, o, 16, rY, 5, 5);
      px(ctx, '#475569', 17, rY + 1, 3, 3);

      this.refresh(tm, key);
    };

    const alchemistPalette = {
      outline: '#090b10',
      body: '#115e59',
      bodyHi: '#0d9488',
      hood: '#0f766e',
      eye: '#38bdf8',
      trim: '#f59e0b',
      skin: '#fbd3b6'
    };
    const roguePalette = {
      outline: '#090b10',
      body: '#1e293b',
      bodyHi: '#be123c',
      hood: '#334155',
      eye: '#090b10',
      trim: '#e11d48',
      skin: '#fbd3b6'
    };
    const vanguardPalette = {
      outline: '#090b10',
      body: '#1d4ed8',
      bodyHi: '#3b82f6',
      hood: '#94a3b8',
      eye: '#38bdf8',
      trim: '#facc15',
      skin: '#fbd3b6'
    };
    const knightPalette = {
      outline: '#090b10',
      body: '#475569',
      bodyHi: '#64748b',
      hood: '#94a3b8',
      eye: '#090b10',
      trim: '#f97316',
      skin: '#fbd3b6'
    };
    const wizardPalette = {
      outline: '#090b10',
      body: '#3b0764',
      bodyHi: '#6b21a8',
      hood: '#92400e',
      eye: '#090b10',
      trim: '#db2777',
      skin: '#fbd3b6'
    };
    const vampirePalette = {
      outline: '#090b10',
      body: '#18181b',
      bodyHi: '#27272a',
      hood: '#0f172a',
      eye: '#ef4444',
      trim: '#b91c1c',
      skin: '#cbd5e1'
    };
    const engineerPalette = {
      outline: '#090b10',
      body: '#1e3a4c',
      bodyHi: '#335c6e',
      hood: '#0f766e',
      eye: '#2dd4bf',
      trim: '#f59e0b',
      skin: '#fbd3b6'
    };
    const berserkerPalette = {
      outline: '#090b10',
      body: '#1e293b',
      bodyHi: '#475569',
      hood: '#dc2626',
      eye: '#fef08a',
      trim: '#ef4444',
      skin: '#fbd3b6'
    };

    drawHeroSprite('player_idle', 'alchemist', alchemistPalette, 0, false);
    drawHeroSprite('player_run_1', 'alchemist', alchemistPalette, 1, false);
    drawHeroSprite('player_run_2', 'alchemist', alchemistPalette, 2, false);
    drawHeroSprite('player_hurt', 'alchemist', alchemistPalette, 0, true);

    const registerClass = (prefix: string, cid: HeroVisualClass, palette: typeof alchemistPalette) => {
      drawHeroSprite(`${prefix}_idle`, cid, palette, 0, false);
      drawHeroSprite(`${prefix}_run_1`, cid, palette, 1, false);
      drawHeroSprite(`${prefix}_run_2`, cid, palette, 2, false);
      drawHeroSprite(`${prefix}_hurt`, cid, palette, 0, true);
    };

    registerClass('hero_alchemist', 'alchemist', alchemistPalette);
    registerClass('hero_rogue', 'rogue', roguePalette);
    registerClass('hero_vanguard', 'vanguard', vanguardPalette);
    registerClass('hero_knight', 'knight', knightPalette);
    registerClass('hero_wizard', 'wizard', wizardPalette);
    registerClass('hero_vampire', 'vampire', vampirePalette);
    registerClass('hero_engineer', 'engineer', engineerPalette);
    registerClass('hero_berserker', 'berserker', berserkerPalette);
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

    // 1. Grunt (26x26): Green/Slate Horned Goblin Raider with nose, fangs & shield
    let ctx = this.createCanvas(tm, 'enemy_grunt', 26, 26);
    // Pointed goblin ears
    px(ctx, '#090b10', 2, 6, 5, 4);
    px(ctx, '#090b10', 19, 6, 5, 4);
    px(ctx, '#65a30d', 3, 7, 3, 2);
    px(ctx, '#65a30d', 20, 7, 3, 2);
    // Head & torso
    px(ctx, '#090b10', 6, 3, 14, 18);
    px(ctx, '#090b10', 5, 6, 16, 13);
    px(ctx, '#4d7c0f', 7, 4, 12, 9);
    px(ctx, '#84cc16', 8, 4, 10, 4);
    // Expressive eyes directly on skin + hooked nose + white fangs (no black visor bar!)
    px(ctx, '#090b10', 9, 7, 2, 2);
    px(ctx, '#090b10', 15, 7, 2, 2);
    px(ctx, '#ef4444', 9, 7, 2, 1);
    px(ctx, '#ef4444', 15, 7, 2, 1);
    px(ctx, '#365314', 12, 8, 2, 2);
    px(ctx, '#ffffff', 10, 11, 1, 2);
    px(ctx, '#ffffff', 15, 11, 1, 2);
    // Leather tunic + iron club
    px(ctx, '#78350f', 7, 13, 12, 7);
    px(ctx, '#b45309', 9, 14, 8, 4);
    px(ctx, '#090b10', 20, 10, 5, 9);
    px(ctx, '#94a3b8', 21, 11, 3, 5);
    px(ctx, '#78350f', 22, 16, 2, 2);
    // Feet
    px(ctx, '#090b10', 7, 21, 4, 4);
    px(ctx, '#090b10', 15, 21, 4, 4);
    this.refresh(tm, 'enemy_grunt');

    // 2. Shooter (26x28): Hooded Cultist Sniper with cyclops targeting scope & cloak
    ctx = this.createCanvas(tm, 'enemy_shooter', 26, 28);
    px(ctx, '#090b10', 9, 1, 8, 4);
    px(ctx, '#090b10', 6, 4, 14, 19);
    px(ctx, '#090b10', 5, 11, 16, 11);
    px(ctx, '#5b21b6', 7, 5, 12, 9);
    px(ctx, '#7c3aed', 10, 2, 6, 4);
    // Hood opening with shadowed face, left purple pupil & right brass sniper scope
    px(ctx, '#1e1b4b', 8, 8, 10, 5);
    px(ctx, '#c084fc', 9, 9, 2, 2);
    px(ctx, '#facc15', 14, 8, 4, 4);
    px(ctx, '#ef4444', 15, 9, 2, 2);
    px(ctx, '#4c1d95', 8, 12, 10, 2); // scarf wrap
    // Robe cloak + sniper rifle
    px(ctx, '#3b0764', 7, 14, 12, 8);
    px(ctx, '#6d28d9', 9, 14, 8, 6);
    px(ctx, '#090b10', 14, 14, 11, 5);
    px(ctx, '#94a3b8', 15, 15, 9, 2);
    px(ctx, '#ef4444', 22, 15, 2, 2);
    px(ctx, '#090b10', 7, 23, 4, 4);
    px(ctx, '#090b10', 15, 23, 4, 4);
    this.refresh(tm, 'enemy_shooter');

    // 3. Fan Caster (28x28): Horned Flame Cultist with demonic yellow eyes & fire orbs
    ctx = this.createCanvas(tm, 'enemy_fan_caster', 28, 28);
    px(ctx, '#090b10', 5, 1, 4, 6);
    px(ctx, '#090b10', 19, 1, 4, 6);
    px(ctx, '#fbbf24', 6, 2, 2, 3);
    px(ctx, '#fbbf24', 20, 2, 2, 3);
    px(ctx, '#090b10', 7, 4, 14, 20);
    px(ctx, '#090b10', 5, 12, 18, 11);
    px(ctx, '#991b1b', 8, 5, 12, 9);
    px(ctx, '#dc2626', 10, 5, 8, 4);
    // Sharp eyes directly on crimson skin + fierce frown
    px(ctx, '#fde047', 10, 9, 2, 2);
    px(ctx, '#fde047', 16, 9, 2, 2);
    px(ctx, '#090b10', 11, 12, 6, 1);
    px(ctx, '#7f1d1d', 7, 14, 14, 9);
    px(ctx, '#f59e0b', 12, 15, 4, 6);
    px(ctx, '#f97316', 2, 13, 4, 4);
    px(ctx, '#fef08a', 3, 14, 2, 2);
    px(ctx, '#f97316', 22, 13, 4, 4);
    px(ctx, '#fef08a', 23, 14, 2, 2);
    this.refresh(tm, 'enemy_fan_caster');

    // 4. Charger (30x28): Armored Iron War-Boar with curved ivory tusks & glowing nose-ring
    ctx = this.createCanvas(tm, 'enemy_charger', 30, 28);
    px(ctx, '#090b10', 4, 5, 22, 18);
    px(ctx, '#090b10', 2, 9, 26, 11);
    px(ctx, '#52525b', 5, 6, 20, 16);
    px(ctx, '#71717a', 7, 7, 16, 7);
    // Curved ivory bull tusks
    px(ctx, '#090b10', 1, 5, 5, 6);
    px(ctx, '#090b10', 24, 5, 5, 6);
    px(ctx, '#fef3c7', 2, 6, 3, 4);
    px(ctx, '#fef3c7', 25, 6, 3, 4);
    // Eyes on armor plate + brass nose snout
    px(ctx, '#f97316', 9, 10, 3, 2);
    px(ctx, '#f97316', 18, 10, 3, 2);
    px(ctx, '#f59e0b', 13, 13, 4, 2);
    px(ctx, '#090b10', 12, 16, 6, 4);
    px(ctx, '#fb923c', 13, 17, 4, 2);
    px(ctx, '#090b10', 6, 23, 5, 4);
    px(ctx, '#090b10', 19, 23, 5, 4);
    this.refresh(tm, 'enemy_charger');

    // 5. Frost Mage (26x28): Crowned Cryomancer with frosty beard & crystal staff
    ctx = this.createCanvas(tm, 'enemy_frost_mage', 26, 28);
    px(ctx, '#090b10', 7, 0, 12, 5);
    px(ctx, '#38bdf8', 8, 2, 2, 3);
    px(ctx, '#67e8f9', 12, 0, 2, 5);
    px(ctx, '#38bdf8', 16, 2, 2, 3);
    px(ctx, '#090b10', 6, 4, 14, 20);
    px(ctx, '#0e7490', 7, 5, 12, 8);
    px(ctx, '#bae6fd', 9, 8, 8, 4); // pale frosty face
    px(ctx, '#0369a1', 10, 9, 2, 2);
    px(ctx, '#0369a1', 14, 9, 2, 2);
    px(ctx, '#f0f9ff', 7, 12, 12, 4); // snow-white fur collar & beard
    px(ctx, '#155e75', 7, 16, 12, 7);
    px(ctx, '#22d3ee', 11, 16, 4, 6);
    px(ctx, '#090b10', 21, 7, 4, 16);
    px(ctx, '#78350f', 22, 12, 2, 10);
    px(ctx, '#67e8f9', 21, 7, 4, 5);
    px(ctx, '#ffffff', 22, 8, 2, 2);
    this.refresh(tm, 'enemy_frost_mage');

    // 6. Frost Knight (28x28): Glacial Paladin Helm with icy nose-guard & spear
    ctx = this.createCanvas(tm, 'enemy_frost_knight', 28, 28);
    px(ctx, '#090b10', 4, 1, 4, 6);
    px(ctx, '#090b10', 20, 1, 4, 6);
    px(ctx, '#e0f2fe', 5, 2, 2, 4);
    px(ctx, '#e0f2fe', 21, 2, 2, 4);
    px(ctx, '#090b10', 6, 4, 16, 20);
    px(ctx, '#0284c7', 7, 5, 14, 9);
    px(ctx, '#38bdf8', 8, 5, 12, 3);
    // Split glacial helm visor with steel nose bridge
    px(ctx, '#090b10', 9, 9, 4, 3);
    px(ctx, '#090b10', 15, 9, 4, 3);
    px(ctx, '#e0f2fe', 13, 8, 2, 5);
    px(ctx, '#22d3ee', 10, 10, 2, 2);
    px(ctx, '#22d3ee', 16, 10, 2, 2);
    px(ctx, '#1e3a8a', 7, 14, 14, 9);
    px(ctx, '#bae6fd', 12, 15, 4, 6);
    px(ctx, '#090b10', 22, 3, 5, 20);
    px(ctx, '#94a3b8', 24, 9, 2, 13);
    px(ctx, '#67e8f9', 22, 4, 4, 6);
    this.refresh(tm, 'enemy_frost_knight');

    // 7. Bomber (26x26): Fiery horned imp/bomb beetle with glowing crimson core, lit sparkling yellow fuse & bat fins
    ctx = this.createCanvas(tm, 'enemy_bomber', 26, 26);
    // Sparkling lit fuse on top
    px(ctx, '#090b10', 11, 1, 4, 6);
    px(ctx, '#78350f', 12, 3, 2, 4);
    px(ctx, '#f97316', 11, 1, 4, 2);
    px(ctx, '#fef08a', 12, 0, 2, 3);
    px(ctx, '#ffffff', 12, 1, 1, 1);
    px(ctx, '#fef08a', 10, 1, 1, 1);
    px(ctx, '#fef08a', 15, 2, 1, 1);
    // Fiery horns
    px(ctx, '#090b10', 5, 3, 4, 5);
    px(ctx, '#090b10', 17, 3, 4, 5);
    px(ctx, '#f59e0b', 6, 4, 2, 3);
    px(ctx, '#f59e0b', 18, 4, 2, 3);
    px(ctx, '#fef08a', 6, 4, 1, 1);
    px(ctx, '#fef08a', 19, 4, 1, 1);
    // Bat-like side fins
    px(ctx, '#090b10', 1, 10, 5, 8);
    px(ctx, '#090b10', 20, 10, 5, 8);
    px(ctx, '#7f1d1d', 2, 11, 3, 5);
    px(ctx, '#7f1d1d', 21, 11, 3, 5);
    px(ctx, '#ef4444', 2, 11, 2, 2);
    px(ctx, '#ef4444', 22, 11, 2, 2);
    // Bomb-beetle armored body
    px(ctx, '#090b10', 6, 6, 14, 16);
    px(ctx, '#090b10', 5, 8, 16, 12);
    px(ctx, '#27272a', 7, 7, 12, 14);
    px(ctx, '#3f3f46', 8, 7, 10, 4);
    // Fierce eyes
    px(ctx, '#090b10', 8, 9, 3, 2);
    px(ctx, '#090b10', 15, 9, 3, 2);
    px(ctx, '#facc15', 9, 9, 2, 2);
    px(ctx, '#facc15', 15, 9, 2, 2);
    px(ctx, '#ffffff', 9, 9, 1, 1);
    px(ctx, '#ffffff', 16, 9, 1, 1);
    // Glowing crimson bomb core
    px(ctx, '#090b10', 9, 13, 8, 7);
    px(ctx, '#dc2626', 10, 14, 6, 5);
    px(ctx, '#f97316', 11, 15, 4, 3);
    px(ctx, '#fef08a', 12, 16, 2, 1);
    // Claws / feet
    px(ctx, '#090b10', 7, 22, 4, 3);
    px(ctx, '#090b10', 15, 22, 4, 3);
    px(ctx, '#52525b', 8, 22, 2, 2);
    px(ctx, '#52525b', 16, 22, 2, 2);
    this.refresh(tm, 'enemy_bomber');

    // 8. Summoner (26x28): Dark obsidian hooded Necromancer Priest with purple glowing eyes, horned skull mantle & amethyst staff
    ctx = this.createCanvas(tm, 'enemy_summoner', 26, 28);
    // Peaked obsidian hood + horns
    px(ctx, '#090b10', 9, 1, 8, 4);
    px(ctx, '#090b10', 4, 3, 4, 6);
    px(ctx, '#090b10', 18, 3, 4, 6);
    px(ctx, '#cbd5e1', 5, 4, 2, 4);
    px(ctx, '#cbd5e1', 19, 4, 2, 4);
    px(ctx, '#090b10', 6, 4, 14, 20);
    px(ctx, '#090b10', 5, 12, 16, 11);
    px(ctx, '#1e1b4b', 7, 5, 12, 9);
    px(ctx, '#312e81', 10, 2, 6, 4);
    // Shadowed hood opening & purple glowing eyes
    px(ctx, '#090b10', 8, 8, 10, 5);
    px(ctx, '#a855f7', 9, 9, 2, 2);
    px(ctx, '#a855f7', 15, 9, 2, 2);
    px(ctx, '#f3e8ff', 10, 9, 1, 1);
    px(ctx, '#f3e8ff', 15, 9, 1, 1);
    // Horned skull mantle collar
    px(ctx, '#090b10', 4, 12, 5, 5);
    px(ctx, '#090b10', 17, 12, 4, 5);
    px(ctx, '#e2e8f0', 5, 13, 3, 3);
    px(ctx, '#e2e8f0', 18, 13, 2, 3);
    px(ctx, '#94a3b8', 11, 13, 4, 3);
    // Dark obsidian robes + violet stole
    px(ctx, '#18181b', 7, 15, 12, 8);
    px(ctx, '#4c1d95', 11, 15, 4, 8);
    px(ctx, '#9333ea', 12, 16, 2, 6);
    // Amethyst summoning staff on right
    px(ctx, '#090b10', 21, 5, 4, 21);
    px(ctx, '#475569', 22, 11, 2, 14);
    px(ctx, '#7c3aed', 21, 6, 4, 5);
    px(ctx, '#c084fc', 22, 7, 2, 3);
    px(ctx, '#f3e8ff', 22, 7, 1, 1);
    // Feet
    px(ctx, '#090b10', 7, 24, 4, 3);
    px(ctx, '#090b10', 15, 24, 4, 3);
    this.refresh(tm, 'enemy_summoner');

    // 9. Turret (26x28): Armored floating ancient Runic Obelisk with glowing crimson-violet laser eye core & rune brackets
    ctx = this.createCanvas(tm, 'enemy_turret', 26, 28);
    // Floating rune brackets on sides
    px(ctx, '#090b10', 1, 8, 5, 11);
    px(ctx, '#090b10', 20, 8, 5, 11);
    px(ctx, '#334155', 2, 9, 3, 9);
    px(ctx, '#334155', 21, 9, 3, 9);
    px(ctx, '#a855f7', 3, 11, 1, 5);
    px(ctx, '#a855f7', 22, 11, 1, 5);
    // Obelisk spire & armored chassis
    px(ctx, '#090b10', 10, 0, 6, 4);
    px(ctx, '#090b10', 8, 3, 10, 4);
    px(ctx, '#090b10', 6, 6, 14, 17);
    px(ctx, '#1e293b', 7, 7, 12, 15);
    px(ctx, '#475569', 9, 4, 8, 3);
    px(ctx, '#64748b', 11, 1, 4, 3);
    px(ctx, '#334155', 8, 7, 10, 3);
    // Glowing crimson-violet laser eye core
    px(ctx, '#090b10', 9, 10, 8, 7);
    px(ctx, '#9333ea', 10, 11, 6, 5);
    px(ctx, '#e11d48', 11, 12, 4, 3);
    px(ctx, '#fef08a', 12, 13, 2, 1);
    // Rune base inlays & floating energy core underneath
    px(ctx, '#c084fc', 9, 19, 2, 2);
    px(ctx, '#c084fc', 15, 19, 2, 2);
    px(ctx, '#090b10', 10, 23, 6, 4);
    px(ctx, '#9333ea', 11, 24, 4, 2);
    px(ctx, '#f43f5e', 12, 24, 2, 1);
    this.refresh(tm, 'enemy_turret');

    generateNewBiomeEnemyTextures(
      tm,
      this.createCanvas.bind(this),
      this.refresh.bind(this)
    );
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
      const capeDark = isPhase2 ? '#450a0a' : '#2c1001';
      const armor = isPhase2 ? '#b91c1c' : '#78350f';
      const armorHi = isPhase2 ? '#ef4444' : '#b45309';
      const gold = isPhase2 ? '#fef08a' : '#f59e0b';
      const rim = isPhase2 ? '#ffffff' : '#fde68a';
      const core = isPhase2 ? '#ffffff' : '#fb923c';

      // Subtle base pixel drop-shadow
      px(ctx, 'rgba(0, 0, 0, 0.38)', 11, 51, 34, 3);
      px(ctx, 'rgba(0, 0, 0, 0.24)', 14, 54, 28, 1);

      // Billowing dark-flame cape behind boss
      px(ctx, o, 7, 15, 42, 34);
      px(ctx, cape, 9, 17, 38, 30);
      px(ctx, capeDark, 10, 38, 36, 9);
      px(ctx, armorHi, 9, 17, 6, 1);
      px(ctx, armorHi, 41, 17, 6, 1);

      // Towering Horned Obsidian & Gold Crown
      px(ctx, o, 14, 2, 6, 12);
      px(ctx, o, 24, 0, 8, 12);
      px(ctx, o, 36, 2, 6, 12);
      px(ctx, gold, 15, 3, 4, 9);
      px(ctx, gold, 26, 1, 4, 10);
      px(ctx, gold, 37, 3, 4, 9);
      px(ctx, rim, 15, 3, 3, 1);
      px(ctx, rim, 26, 1, 3, 1);
      px(ctx, rim, 37, 3, 3, 1);

      // Armored Skull / Helm (horned obsidian brow + fierce arched eyes, no flat black visor!)
      px(ctx, o, 15, 10, 26, 16);
      px(ctx, armor, 17, 12, 22, 12);
      px(ctx, armorHi, 19, 12, 18, 5);
      px(ctx, rim, 19, 12, 18, 1);
      // Heavy iron nose bridge + recessed brow slits
      px(ctx, o, 19, 17, 7, 4);
      px(ctx, o, 30, 17, 7, 4);
      px(ctx, gold, 26, 15, 4, 7);
      px(ctx, core, 21, 18, 4, 2);
      px(ctx, core, 31, 18, 4, 2);
      px(ctx, '#ffffff', 22, 18, 2, 1);
      px(ctx, '#ffffff', 32, 18, 2, 1);
      // Gritted furnace jaw teeth
      px(ctx, o, 20, 22, 16, 3);
      px(ctx, gold, 21, 22, 2, 2);
      px(ctx, gold, 25, 22, 2, 2);
      px(ctx, gold, 29, 22, 2, 2);
      px(ctx, gold, 33, 22, 2, 2);

      // Heavy Spiked Shoulder Pauldrons
      px(ctx, o, 4, 18, 12, 14);
      px(ctx, armorHi, 6, 20, 8, 10);
      px(ctx, rim, 6, 20, 7, 1);
      px(ctx, gold, 5, 17, 5, 4);
      px(ctx, rim, 5, 17, 3, 1);
      px(ctx, o, 40, 18, 12, 14);
      px(ctx, armorHi, 42, 20, 8, 10);
      px(ctx, rim, 43, 20, 7, 1);
      px(ctx, gold, 46, 17, 5, 4);
      px(ctx, rim, 47, 17, 3, 1);

      // Chestplate & Molten Core Reactor
      px(ctx, o, 14, 25, 28, 22);
      px(ctx, armor, 16, 26, 24, 20);
      px(ctx, gold, 18, 27, 20, 3);
      px(ctx, rim, 18, 27, 20, 1);
      px(ctx, o, 22, 31, 12, 11);
      px(ctx, isPhase2 ? '#ef4444' : '#ea580c', 23, 32, 10, 9);
      px(ctx, gold, 25, 34, 6, 5);
      px(ctx, core, 27, 35, 2, 3);
      px(ctx, '#ffffff', 27, 35, 1, 1);

      // Grand Arcane Fire Staff held on right
      px(ctx, o, 48, 12, 5, 36);
      px(ctx, '#78350f', 49, 22, 3, 24);
      px(ctx, o, 46, 8, 9, 11);
      px(ctx, isPhase2 ? '#ef4444' : '#f97316', 47, 9, 7, 9);
      px(ctx, gold, 49, 11, 3, 5);
      px(ctx, '#ffffff', 49, 10, 2, 2);

      // Heavy Armored Boots
      px(ctx, o, 15, 47, 9, 7);
      px(ctx, gold, 17, 48, 5, 4);
      px(ctx, rim, 17, 48, 4, 1);
      px(ctx, o, 32, 47, 9, 7);
      px(ctx, gold, 34, 48, 5, 4);
      px(ctx, rim, 34, 48, 4, 1);

      this.refresh(tm, key);
    };

    drawBoss('boss_ignis_p1', false);
    drawBoss('boss_ignis_p2', true);

    const drawFrostBoss = (key: string, isPhase2: boolean) => {
      const ctx = this.createCanvas(tm, key, 56, 56);
      const o = '#090b10';
      const cape = isPhase2 ? '#312e81' : '#0c4a6e';
      const capeDark = isPhase2 ? '#1e1b4b' : '#082f49';
      const armor = isPhase2 ? '#1e3a8a' : '#0369a1';
      const armorHi = isPhase2 ? '#6366f1' : '#0284c7';
      const ice = isPhase2 ? '#a78bfa' : '#bae6fd';
      const rim = isPhase2 ? '#ede9fe' : '#f0f9ff';
      const rune = isPhase2 ? '#c084fc' : '#22d3ee';
      const core = isPhase2 ? '#ffffff' : '#67e8f9';

      // Subtle base pixel drop-shadow
      px(ctx, 'rgba(0, 0, 0, 0.38)', 11, 51, 34, 3);
      px(ctx, 'rgba(0, 0, 0, 0.24)', 14, 54, 28, 1);

      // Billowing glacial / storm-indigo cloak behind boss
      px(ctx, o, 7, 15, 42, 34);
      px(ctx, cape, 9, 17, 38, 30);
      px(ctx, capeDark, 10, 41, 36, 6);
      px(ctx, armor, 11, 37, 34, 6);
      px(ctx, ice, 9, 17, 6, 1);
      px(ctx, ice, 41, 17, 6, 1);

      // Jagged Ice-Rune Crown
      px(ctx, o, 13, 2, 6, 11);
      px(ctx, o, 24, 0, 8, 12);
      px(ctx, o, 37, 2, 6, 11);
      px(ctx, ice, 14, 3, 4, 8);
      px(ctx, ice, 26, 1, 4, 10);
      px(ctx, ice, 38, 3, 4, 8);
      px(ctx, rim, 14, 3, 3, 1);
      px(ctx, '#ffffff', 26, 1, 3, 1);
      px(ctx, rim, 38, 3, 3, 1);
      px(ctx, rune, 27, 3, 2, 6);

      // Frost Guardian Helm & Glowing Cyan Eyes
      px(ctx, o, 15, 10, 26, 16);
      px(ctx, armor, 17, 12, 22, 12);
      px(ctx, armorHi, 19, 12, 18, 5);
      px(ctx, rim, 19, 12, 18, 1);
      // Recessed eye slits split by crystalline nasal guard
      px(ctx, o, 19, 17, 7, 4);
      px(ctx, o, 30, 17, 7, 4);
      px(ctx, ice, 26, 14, 4, 8);
      px(ctx, '#22d3ee', 20, 18, 5, 2);
      px(ctx, '#22d3ee', 31, 18, 5, 2);
      px(ctx, core, 22, 18, 2, 2);
      px(ctx, core, 32, 18, 2, 2);
      // Frosted jaw plates
      px(ctx, o, 20, 22, 16, 3);
      px(ctx, ice, 21, 22, 3, 2);
      px(ctx, ice, 26, 22, 4, 2);
      px(ctx, ice, 32, 22, 3, 2);

      // Crystalline Ice Shoulder Pauldrons
      px(ctx, o, 4, 17, 12, 14);
      px(ctx, armorHi, 6, 19, 8, 10);
      px(ctx, rim, 6, 19, 7, 1);
      px(ctx, ice, 5, 16, 5, 4);
      px(ctx, '#ffffff', 5, 16, 3, 1);
      px(ctx, o, 40, 17, 12, 14);
      px(ctx, armorHi, 42, 19, 8, 10);
      px(ctx, rim, 43, 19, 7, 1);
      px(ctx, ice, 46, 16, 5, 4);
      px(ctx, '#ffffff', 47, 16, 3, 1);

      // Chestplate & Frost Rune Core
      px(ctx, o, 14, 25, 28, 22);
      px(ctx, armor, 16, 26, 24, 20);
      px(ctx, ice, 18, 27, 20, 3);
      px(ctx, rim, 18, 27, 20, 1);
      px(ctx, o, 22, 31, 12, 11);
      px(ctx, isPhase2 ? '#4f46e5' : '#0284c7', 23, 32, 10, 9);
      px(ctx, rune, 25, 34, 6, 5);
      px(ctx, core, 27, 35, 2, 3);
      px(ctx, '#ffffff', 27, 35, 1, 1);

      // Glacial Rune Scepter held on right
      px(ctx, o, 48, 11, 5, 37);
      px(ctx, '#1e293b', 49, 22, 3, 24);
      px(ctx, o, 46, 7, 9, 12);
      px(ctx, isPhase2 ? '#7c3aed' : '#0284c7', 47, 8, 7, 10);
      px(ctx, rune, 49, 10, 3, 6);
      px(ctx, core, 50, 11, 1, 3);
      px(ctx, '#ffffff', 48, 8, 2, 1);

      // Heavy Frost Greaves
      px(ctx, o, 15, 47, 9, 7);
      px(ctx, ice, 17, 48, 5, 4);
      px(ctx, rim, 17, 48, 4, 1);
      px(ctx, o, 32, 47, 9, 7);
      px(ctx, ice, 34, 48, 5, 4);
      px(ctx, rim, 34, 48, 4, 1);

      this.refresh(tm, key);
    };

    drawFrostBoss('boss_frost_p1', false);
    drawFrostBoss('boss_frost_p2', true);

    const drawMoltenBoss = (key: string, isPhase2: boolean) => {
      const ctx = this.createCanvas(tm, key, 56, 56);
      const o = '#090b10';
      const obsidian = '#18181b';
      const armor = isPhase2 ? '#292524' : '#27272a';
      const armorHi = isPhase2 ? '#57534e' : '#52525b';
      const rim = isPhase2 ? '#fde047' : '#d4d4d8';
      const magma = isPhase2 ? '#ef4444' : '#ea580c';
      const amber = isPhase2 ? '#fbbf24' : '#f59e0b';
      const glow = isPhase2 ? '#fef08a' : '#fb923c';
      const core = isPhase2 ? '#ffffff' : '#fef08a';

      // Subtle base pixel drop-shadow
      px(ctx, 'rgba(0, 0, 0, 0.42)', 10, 51, 36, 3);
      px(ctx, 'rgba(0, 0, 0, 0.26)', 14, 54, 28, 1);

      // Scorched obsidian cape with glowing magma hem
      px(ctx, o, 7, 15, 42, 34);
      px(ctx, obsidian, 9, 17, 38, 30);
      px(ctx, magma, 10, 42, 36, 4);
      px(ctx, amber, 12, 44, 32, 2);
      px(ctx, rim, 9, 17, 5, 1);
      px(ctx, rim, 42, 17, 5, 1);

      // Obsidian Crown & Sweeping Magma Horns
      px(ctx, o, 11, 2, 7, 12);
      px(ctx, o, 24, 0, 8, 12);
      px(ctx, o, 38, 2, 7, 12);
      px(ctx, armor, 12, 3, 5, 9);
      px(ctx, armor, 25, 1, 6, 10);
      px(ctx, armor, 39, 3, 5, 9);
      px(ctx, amber, 13, 4, 2, 6);
      px(ctx, glow, 27, 2, 2, 8);
      px(ctx, amber, 41, 4, 2, 6);
      px(ctx, rim, 12, 3, 3, 1);
      px(ctx, '#ffffff', 25, 1, 4, 1);
      px(ctx, rim, 41, 3, 3, 1);

      // Obsidian Horned Helm & Magma Eye Visor
      px(ctx, o, 15, 10, 26, 16);
      px(ctx, armor, 17, 12, 22, 12);
      px(ctx, armorHi, 18, 12, 20, 4);
      px(ctx, rim, 18, 12, 20, 1);
      // Glowing amber brow rune
      px(ctx, amber, 26, 13, 4, 3);
      px(ctx, core, 27, 14, 2, 1);
      // Recessed magma eyes
      px(ctx, o, 19, 17, 7, 4);
      px(ctx, o, 30, 17, 7, 4);
      px(ctx, armorHi, 26, 16, 4, 6);
      px(ctx, magma, 20, 18, 5, 2);
      px(ctx, magma, 31, 18, 5, 2);
      px(ctx, glow, 21, 18, 3, 2);
      px(ctx, glow, 32, 18, 3, 2);
      px(ctx, core, 22, 18, 1, 1);
      px(ctx, core, 33, 18, 1, 1);
      // Furnace grate jaw with glowing magma vents
      px(ctx, o, 20, 22, 16, 3);
      px(ctx, amber, 21, 22, 2, 2);
      px(ctx, glow, 25, 22, 2, 2);
      px(ctx, glow, 29, 22, 2, 2);
      px(ctx, amber, 33, 22, 2, 2);

      // Fiery Obsidian Shoulder Pauldrons
      px(ctx, o, 3, 17, 13, 15);
      px(ctx, armor, 5, 19, 9, 11);
      px(ctx, magma, 6, 22, 7, 5);
      px(ctx, amber, 7, 23, 5, 3);
      px(ctx, glow, 4, 16, 6, 4);
      px(ctx, rim, 4, 16, 4, 1);

      px(ctx, o, 40, 17, 13, 15);
      px(ctx, armor, 42, 19, 9, 11);
      px(ctx, magma, 43, 22, 7, 5);
      px(ctx, amber, 44, 23, 5, 3);
      px(ctx, glow, 46, 16, 6, 4);
      px(ctx, rim, 48, 16, 4, 1);

      // Obsidian Chestplate with Glowing Magma/Amber Runes
      px(ctx, o, 14, 25, 28, 22);
      px(ctx, armor, 16, 26, 24, 20);
      px(ctx, armorHi, 17, 26, 22, 3);
      px(ctx, rim, 17, 26, 22, 1);
      // Side magma runes
      px(ctx, amber, 18, 31, 2, 7);
      px(ctx, glow, 18, 33, 2, 3);
      px(ctx, amber, 36, 31, 2, 7);
      px(ctx, glow, 36, 33, 2, 3);
      // Central magma core furnace
      px(ctx, o, 22, 30, 12, 12);
      px(ctx, magma, 23, 31, 10, 10);
      px(ctx, amber, 25, 33, 6, 6);
      px(ctx, core, 27, 34, 2, 4);
      // Belt rune buckle
      px(ctx, amber, 21, 43, 14, 2);

      // Molten Obsidian Great-Hammer held on right
      px(ctx, o, 48, 14, 5, 34);
      px(ctx, armorHi, 49, 20, 3, 26);
      px(ctx, o, 44, 6, 11, 12);
      px(ctx, armor, 45, 7, 9, 10);
      px(ctx, magma, 46, 9, 7, 6);
      px(ctx, amber, 47, 10, 5, 4);
      px(ctx, core, 48, 11, 3, 2);
      px(ctx, rim, 45, 7, 9, 1);

      // Obsidian Greaves with Amber Knee Runes
      px(ctx, o, 15, 47, 9, 7);
      px(ctx, armorHi, 16, 48, 7, 5);
      px(ctx, amber, 18, 49, 3, 2);
      px(ctx, rim, 16, 48, 6, 1);

      px(ctx, o, 32, 47, 9, 7);
      px(ctx, armorHi, 33, 48, 7, 5);
      px(ctx, amber, 35, 49, 3, 2);
      px(ctx, rim, 33, 48, 6, 1);

      this.refresh(tm, key);
    };

    drawMoltenBoss('boss_molten_p1', false);
    drawMoltenBoss('boss_molten_p2', true);
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

    // Generic Tintable Enemy Burst Orb (used by Volatile Elite death burst)
    ctx = this.createCanvas(tm, 'bullet_enemy', 14, 14);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.arc(7, 7, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fb923c';
    ctx.beginPath(); ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(7, 7, 2.5, 0, Math.PI * 2); ctx.fill();
    this.refresh(tm, 'bullet_enemy');

    // Wizard Piercing Ice-Storm Bolt (18x10)
    ctx = this.createCanvas(tm, 'bullet_ice_shard', 18, 10);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.moveTo(17, 5); ctx.lineTo(5, 1); ctx.lineTo(1, 5); ctx.lineTo(5, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.moveTo(16, 5); ctx.lineTo(6, 2); ctx.lineTo(2, 5); ctx.lineTo(6, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(5, 4, 8, 2);
    this.refresh(tm, 'bullet_ice_shard');

    // Vampire Crimson Bat Homing Projectile (16x12)
    ctx = this.createCanvas(tm, 'bullet_crimson_bat', 16, 12);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(1, 2, 5, 6);
    ctx.fillRect(10, 2, 5, 6);
    ctx.fillRect(5, 4, 6, 6);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(2, 3, 4, 4);
    ctx.fillRect(10, 3, 4, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(6, 5, 4, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(6, 6, 1, 1);
    ctx.fillRect(9, 6, 1, 1);
    this.refresh(tm, 'bullet_crimson_bat');

    // Enemy Sniper / Cross Laser Bolt (20x8 glowing crimson dart)
    ctx = this.createCanvas(tm, 'bullet_enemy_laser', 20, 8);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 1, 20, 6);
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(1, 2, 18, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(4, 3, 13, 2);
    this.refresh(tm, 'bullet_enemy_laser');

    // Enemy Frost Orb
    ctx = this.createCanvas(tm, 'bullet_enemy_frost', 14, 14);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.arc(7, 7, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cffafe';
    ctx.beginPath(); ctx.arc(7, 7, 2.5, 0, Math.PI * 2); ctx.fill();
    this.refresh(tm, 'bullet_enemy_frost');

    // Enemy Dark Void Orb (14x14 dark purple-violet glowing sphere with bright lavender core)
    ctx = this.createCanvas(tm, 'bullet_dark_orb', 14, 14);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.arc(7, 7, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath(); ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9333ea';
    ctx.beginPath(); ctx.arc(7, 7, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath(); ctx.arc(7, 7, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 6, 1, 1);
    this.refresh(tm, 'bullet_dark_orb');

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

    // Boss Frost Orb (16x16 icy crystal orb)
    ctx = this.createCanvas(tm, 'bullet_frost', 16, 16);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.arc(8, 8, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath(); ctx.arc(8, 8, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(8, 8, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath(); ctx.arc(8, 8, 2.2, 0, Math.PI * 2); ctx.fill();
    this.refresh(tm, 'bullet_frost');

    // Tier-2 Thunder Staff Lightning Bolt (18x12 crackling yellow-cyan bolt)
    ctx = this.createCanvas(tm, 'bullet_lightning', 18, 12);
    ctx.fillStyle = '#090b10';
    ctx.beginPath();
    ctx.moveTo(1, 6); ctx.lineTo(7, 1); ctx.lineTo(10, 4); ctx.lineTo(17, 3);
    ctx.lineTo(11, 11); ctx.lineTo(8, 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(2, 6); ctx.lineTo(7, 2); ctx.lineTo(10, 5); ctx.lineTo(16, 4);
    ctx.lineTo(11, 10); ctx.lineTo(8, 7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(5, 5, 8, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 5, 4, 2);
    this.refresh(tm, 'bullet_lightning');

    // Tier-2 Inferno Gatling Ember Slug (16x10 fiery orange-red slug)
    ctx = this.createCanvas(tm, 'bullet_inferno', 16, 10);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 2, 15, 6);
    ctx.fillRect(12, 3, 4, 4);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(1, 3, 13, 4);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(4, 3, 10, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(9, 4, 5, 2);
    this.refresh(tm, 'bullet_inferno');

    // Auto-Turret Plasma Bolt (14x8 bright teal-white plasma bolt)
    ctx = this.createCanvas(tm, 'bullet_turret', 14, 8);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 1, 13, 6);
    ctx.fillRect(11, 2, 3, 4);
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(1, 2, 11, 4);
    ctx.fillStyle = '#2dd4bf';
    ctx.fillRect(3, 2, 9, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 3, 6, 2);
    this.refresh(tm, 'bullet_turret');

    // Alchemist Skill 2 Toxic Green-Cyan Bubbling Sphere (16x16)
    ctx = this.createCanvas(tm, 'bullet_venom', 16, 16);
    ctx.fillStyle = '#090b10';
    ctx.beginPath(); ctx.arc(8, 8, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#047857';
    ctx.beginPath(); ctx.arc(8, 8, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(8, 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2dd4bf';
    ctx.beginPath(); ctx.arc(7, 7, 3.2, 0, Math.PI * 2); ctx.fill();
    // Bubbling toxic specular highlights
    ctx.fillStyle = '#a7f3d0';
    ctx.fillRect(5, 4, 2, 2);
    ctx.fillRect(10, 9, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5, 4, 1, 1);
    ctx.fillRect(8, 6, 1, 1);
    this.refresh(tm, 'bullet_venom');

    // Red-Gold Homing Rocket (18x10)
    ctx = this.createCanvas(tm, 'bullet_rocket', 18, 10);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(2, 1, 5, 8);
    ctx.fillRect(3, 2, 12, 6);
    ctx.fillRect(14, 3, 4, 4);
    // Thruster tail glow
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 3, 3, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(1, 4, 2, 2);
    // Crimson stabilizer fins & hull
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(3, 1, 3, 2);
    ctx.fillRect(3, 7, 3, 2);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(4, 3, 9, 4);
    // Gold warhead band & nosecone
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(8, 3, 3, 4);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(13, 3, 3, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(15, 4, 2, 2);
    this.refresh(tm, 'bullet_rocket');

    // Boss Weapon: Boomerang Blade Projectile (20x20 glowing cyan crescent blade)
    ctx = this.createCanvas(tm, 'bullet_boomerang', 20, 20);
    ctx.fillStyle = '#090b10';
    ctx.beginPath();
    ctx.arc(10, 10, 9, -Math.PI * 0.72, Math.PI * 0.72);
    ctx.arc(6, 10, 5.5, Math.PI * 0.65, -Math.PI * 0.65, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0891b2';
    ctx.beginPath();
    ctx.arc(10, 10, 7.8, -Math.PI * 0.68, Math.PI * 0.68);
    ctx.arc(7, 10, 5.8, Math.PI * 0.6, -Math.PI * 0.6, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(10.5, 10, 6.8, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.arc(8, 10, 5.6, Math.PI * 0.52, -Math.PI * 0.52, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cffafe';
    ctx.fillRect(15, 7, 2, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 8, 1, 4);
    ctx.fillRect(12, 4, 2, 2);
    ctx.fillRect(12, 14, 2, 2);
    this.refresh(tm, 'bullet_boomerang');

    // Boss Weapon: Glacial Cannon Orb (18x18 icy faceted crystal orb)
    ctx = this.createCanvas(tm, 'bullet_glacial_orb', 18, 18);
    ctx.fillStyle = '#090b10';
    ctx.beginPath();
    ctx.moveTo(9, 0); ctx.lineTo(14, 4); ctx.lineTo(18, 9); ctx.lineTo(14, 14);
    ctx.lineTo(9, 18); ctx.lineTo(4, 14); ctx.lineTo(0, 9); ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(9, 1.5); ctx.lineTo(13, 5); ctx.lineTo(16.5, 9); ctx.lineTo(13, 13);
    ctx.lineTo(9, 16.5); ctx.lineTo(5, 13); ctx.lineTo(1.5, 9); ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();
    // Upper-left bright crystal facet
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(9, 2); ctx.lineTo(13, 5); ctx.lineTo(9, 9); ctx.lineTo(2.5, 9); ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();
    // Inner luminous core facet
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(9, 4); ctx.lineTo(13, 9); ctx.lineTo(9, 14); ctx.lineTo(5, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 7, 3, 3);
    ctx.fillRect(5, 5, 2, 2);
    this.refresh(tm, 'bullet_glacial_orb');

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

    // Tier-2 Frost Sword (32x12): Icy cyan greatsword with crystal hilt
    drawGun('hand_frost_sword', 32, 12, ctx => {
      ctx.fillStyle = '#090b10';
      ctx.fillRect(1, 4, 29, 4);
      ctx.fillRect(7, 1, 4, 10);
      ctx.fillRect(27, 5, 4, 2);
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(2, 5, 5, 2); // grip
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(8, 2, 2, 8); // crystal crossguard
      ctx.fillStyle = '#bae6fd'; ctx.fillRect(9, 5, 2, 2);
      ctx.fillStyle = '#0284c7'; ctx.fillRect(11, 4, 17, 4); // broad blade
      ctx.fillStyle = '#e0f2fe'; ctx.fillRect(11, 5, 18, 2); // icy edge gleam
    });

    // Tier-2 Thunder Staff (30x14): Golden-indigo lightning staff with glowing orb
    drawGun('hand_thunder_staff', 30, 14, ctx => {
      ctx.fillStyle = '#090b10';
      ctx.fillRect(1, 5, 21, 4);
      ctx.fillRect(19, 2, 10, 10);
      ctx.fillStyle = '#312e81'; ctx.fillRect(2, 6, 18, 2); // indigo shaft
      ctx.fillStyle = '#facc15'; ctx.fillRect(18, 4, 2, 6); // gold collar
      ctx.fillStyle = '#eab308'; ctx.fillRect(20, 3, 8, 8); // golden prongs
      ctx.fillStyle = '#22d3ee'; ctx.fillRect(22, 4, 5, 6); // cyan lightning orb
      ctx.fillStyle = '#fef9c3'; ctx.fillRect(23, 5, 3, 4); // bright core
    });

    // Tier-2 Inferno Gatling (30x14): Crimson-orange multi-barrel rotary cannon
    drawGun('hand_inferno_gatling', 30, 14, ctx => {
      ctx.fillStyle = '#090b10';
      ctx.fillRect(1, 2, 15, 10);
      ctx.fillRect(15, 3, 14, 8);
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(2, 3, 13, 8); // crimson receiver
      ctx.fillStyle = '#f97316'; ctx.fillRect(5, 5, 6, 4); // glowing furnace core
      ctx.fillStyle = '#fef08a'; ctx.fillRect(7, 6, 3, 2);
      // 3 rotary barrels
      ctx.fillStyle = '#475569'; ctx.fillRect(16, 4, 12, 2);
      ctx.fillStyle = '#64748b'; ctx.fillRect(16, 6, 12, 2);
      ctx.fillStyle = '#475569'; ctx.fillRect(16, 8, 12, 2);
      ctx.fillStyle = '#dc2626'; ctx.fillRect(21, 3, 2, 8); // barrel clamp
      ctx.fillStyle = '#fb923c'; ctx.fillRect(26, 4, 2, 6); // heated muzzle
    });

    // Boss Weapon: Solar Laser (32x14): Golden-crimson solar prism cannon
    drawGun('hand_solar_laser', 32, 14, ctx => {
      ctx.fillStyle = '#090b10';
      ctx.fillRect(1, 3, 18, 8);
      ctx.fillRect(17, 2, 14, 10);
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(2, 4, 16, 6); // crimson chassis
      ctx.fillStyle = '#d97706'; ctx.fillRect(4, 4, 12, 2); // gold upper rail
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(18, 3, 10, 8); // solar prism shroud
      ctx.fillStyle = '#fef08a'; ctx.fillRect(10, 6, 18, 2); // solar core channel
      ctx.fillStyle = '#f97316'; ctx.fillRect(21, 5, 6, 4); // solar lens chamber
      ctx.fillStyle = '#ffffff'; ctx.fillRect(28, 5, 2, 4); // focusing emitter tip
    });

    // Boss Weapon: Boomerang Blade (26x14): Glowing cyan crescent throwing blade
    drawGun('hand_boomerang_blade', 26, 14, ctx => {
      ctx.fillStyle = '#090b10';
      ctx.fillRect(1, 5, 9, 4);
      ctx.fillRect(8, 1, 16, 12);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(2, 6, 7, 2); // obsidian hilt
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(8, 5, 2, 4); // gold collar
      ctx.fillStyle = '#0891b2'; ctx.fillRect(10, 2, 13, 10); // crescent body
      ctx.fillStyle = '#22d3ee'; ctx.fillRect(12, 3, 10, 8); // electric cyan edge
      ctx.fillStyle = '#0f172a'; ctx.fillRect(10, 5, 7, 4); // inner crescent cutout
      ctx.fillStyle = '#ecfeff'; ctx.fillRect(20, 4, 2, 6); // razor gleam
    });

    // Boss Weapon: Glacial Cannon (32x14): Heavy frost-crystal cannon
    drawGun('hand_glacial_cannon', 32, 14, ctx => {
      ctx.fillStyle = '#090b10';
      ctx.fillRect(1, 3, 14, 9);
      ctx.fillRect(13, 2, 18, 10);
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(2, 4, 12, 7); // sapphire receiver
      ctx.fillStyle = '#0284c7'; ctx.fillRect(14, 3, 15, 8); // frost barrel
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(15, 3, 13, 2); // upper ice fin
      ctx.fillStyle = '#bae6fd'; ctx.fillRect(8, 6, 12, 3); // cryo core window
      ctx.fillStyle = '#ffffff'; ctx.fillRect(12, 7, 5, 1);
      ctx.fillStyle = '#e0f2fe'; ctx.fillRect(27, 4, 3, 6); // frosted muzzle prongs
      ctx.fillStyle = '#0f172a'; ctx.fillRect(29, 6, 1, 2);
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

    // Boss Chest (24x20 ornate golden-red boss chest, distinct from standard chest_closed)
    ctx = this.createCanvas(tm, 'chest_boss', 24, 20);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)'; ctx.fillRect(1, 18, 22, 2);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(8, 0, 8, 3);
    ctx.fillRect(1, 2, 22, 17);
    ctx.fillStyle = '#7f1d1d'; ctx.fillRect(2, 7, 20, 11); // royal crimson base
    ctx.fillStyle = '#b91c1c'; ctx.fillRect(2, 3, 20, 5); // crimson lid
    ctx.fillStyle = '#d97706';
    ctx.fillRect(2, 3, 3, 15); ctx.fillRect(19, 3, 3, 15); // ornate side gold bands
    ctx.fillRect(2, 7, 20, 2); // gold lid trim
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(9, 1, 6, 2); // crown crest
    ctx.fillRect(9, 8, 6, 6); // central gold lock plate
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(10, 1, 4, 1); // crown rim highlight
    ctx.fillRect(3, 3, 18, 1); // lid top rim highlight
    ctx.fillStyle = '#ef4444'; ctx.fillRect(10, 9, 4, 4); // ruby lock gem
    ctx.fillStyle = '#ffffff'; ctx.fillRect(11, 10, 1, 1);
    this.refresh(tm, 'chest_boss');

    // Core Anvil (32x32 arcane obsidian anvil with floating cyan/amber core crystal)
    ctx = this.createCanvas(tm, 'core_anvil', 32, 32);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)'; ctx.fillRect(4, 28, 24, 3);
    // Floating cyan/amber core crystal
    ctx.fillStyle = '#090b10';
    ctx.beginPath();
    ctx.moveTo(16, 1); ctx.lineTo(22, 6); ctx.lineTo(16, 11); ctx.lineTo(10, 6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(16, 2); ctx.lineTo(16, 10); ctx.lineTo(11, 6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(16, 2); ctx.lineTo(21, 6); ctx.lineTo(16, 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(15, 5, 2, 2);
    ctx.fillStyle = '#67e8f9'; ctx.fillRect(8, 3, 1, 1);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(23, 3, 1, 1);
    // Arcane obsidian anvil body
    ctx.fillStyle = '#090b10';
    ctx.fillRect(2, 13, 28, 6); // anvil horn + table
    ctx.fillRect(8, 18, 16, 7); // waist
    ctx.fillRect(5, 24, 22, 6); // base plinth
    ctx.fillStyle = '#27272a';
    ctx.fillRect(3, 14, 26, 4);
    ctx.fillRect(9, 18, 14, 6);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(6, 25, 20, 4);
    ctx.fillStyle = '#a1a1aa';
    ctx.fillRect(5, 14, 22, 1); // crisp metallic striking-face rim
    ctx.fillStyle = '#22d3ee'; ctx.fillRect(11, 20, 3, 2); // cyan rune
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(18, 20, 3, 2); // amber rune
    ctx.fillStyle = '#52525b'; ctx.fillRect(7, 25, 18, 1); // plinth bevel
    this.refresh(tm, 'core_anvil');

    // Weapon Core Pickup (16x16 faceted prismatic elemental core gem)
    ctx = this.createCanvas(tm, 'weapon_core', 16, 16);
    ctx.fillStyle = '#090b10';
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(14, 4); ctx.lineTo(14, 12);
    ctx.lineTo(8, 16); ctx.lineTo(2, 12); ctx.lineTo(2, 4);
    ctx.closePath(); ctx.fill();
    // 4 prismatic elemental facets
    ctx.fillStyle = '#22d3ee'; // top-left cyan
    ctx.beginPath(); ctx.moveTo(8, 1.5); ctx.lineTo(8, 8); ctx.lineTo(3, 8); ctx.lineTo(3, 4.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f59e0b'; // top-right amber
    ctx.beginPath(); ctx.moveTo(8, 1.5); ctx.lineTo(13, 4.5); ctx.lineTo(13, 8); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#34d399'; // bottom-left emerald
    ctx.beginPath(); ctx.moveTo(3, 8); ctx.lineTo(8, 8); ctx.lineTo(8, 14.5); ctx.lineTo(3, 11.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e879f9'; // bottom-right magenta
    ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(13, 8); ctx.lineTo(13, 11.5); ctx.lineTo(8, 14.5); ctx.closePath(); ctx.fill();
    // Inner white crystal core & rim glints
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(8, 5); ctx.lineTo(11, 8); ctx.lineTo(8, 11); ctx.lineTo(5, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(5, 3, 2, 2);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(10, 4, 1, 2);
    this.refresh(tm, 'weapon_core');

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

    // 14. Arcane Weapon Merge Anvil / Pedestal (32x32)
    ctx = this.createCanvas(tm, 'anvil_merge', 32, 32);
    ctx.fillStyle = '#090b10'; ctx.fillRect(2, 9, 28, 21);
    // Obsidian-slate pedestal base
    ctx.fillStyle = '#1e293b'; ctx.fillRect(5, 19, 22, 10);
    ctx.fillStyle = '#334155'; ctx.fillRect(3, 10, 26, 9);
    ctx.fillStyle = '#64748b'; ctx.fillRect(4, 10, 24, 3);
    // Dual arcane cyan + amber fusion runes on anvil face
    ctx.fillStyle = '#22d3ee'; ctx.fillRect(6, 14, 7, 3);
    ctx.fillStyle = '#cffafe'; ctx.fillRect(8, 15, 3, 1);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(19, 14, 7, 3);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(21, 15, 3, 1);
    // Center fusion rune core & hovering arcane prism spark
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(14, 21, 4, 5);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(15, 22, 2, 3);
    ctx.fillStyle = '#22d3ee'; ctx.fillRect(13, 3, 6, 5);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(15, 4, 2, 3);
    this.refresh(tm, 'anvil_merge');
  }

  private static createTurretFrames(tm: Phaser.Textures.TextureManager): void {
    // 1. Mechanical Auto-Turret Tripod Base (22x22 bronze/teal tripod base)
    let ctx = this.createCanvas(tm, 'turret_base', 22, 22);
    ctx.fillStyle = '#090b10';
    // Top tripod strut & left/right splayed tripod legs
    ctx.fillRect(9, 1, 4, 7);
    ctx.fillRect(2, 13, 6, 7);
    ctx.fillRect(14, 13, 6, 7);
    ctx.beginPath(); ctx.arc(11, 11, 7.5, 0, Math.PI * 2); ctx.fill();

    // Bronze mechanical struts & feet
    ctx.fillStyle = '#92400e';
    ctx.fillRect(10, 2, 2, 5);
    ctx.fillRect(3, 14, 4, 5);
    ctx.fillRect(15, 14, 4, 5);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(3, 17, 3, 2);
    ctx.fillRect(16, 17, 3, 2);
    ctx.fillRect(10, 2, 2, 2);

    // Central bronze mounting ring
    ctx.fillStyle = '#b45309';
    ctx.beginPath(); ctx.arc(11, 11, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(11, 10.5, 4.5, 0, Math.PI * 2); ctx.fill();

    // Glowing teal core socket
    ctx.fillStyle = '#0f766e';
    ctx.beginPath(); ctx.arc(11, 11, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#14b8a6';
    ctx.beginPath(); ctx.arc(11, 11, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#99f6e4';
    ctx.fillRect(10, 10, 2, 2);
    this.refresh(tm, 'turret_base');

    // 2. Rotating Dual Plasma Turret Barrel (20x12, facing right)
    ctx = this.createCanvas(tm, 'turret_gun', 20, 12);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(1, 1, 10, 10);
    ctx.fillRect(10, 1, 10, 4);
    ctx.fillRect(10, 7, 10, 4);

    // Bronze & slate turret receiver housing
    ctx.fillStyle = '#334155';
    ctx.fillRect(2, 2, 8, 8);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(3, 2, 6, 2);
    ctx.fillRect(3, 8, 6, 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(4, 2, 4, 1);

    // Glowing teal energy cell on housing
    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(4, 4, 4, 4);
    ctx.fillStyle = '#ccfbf1';
    ctx.fillRect(5, 5, 2, 2);

    // Dual parallel plasma barrels (upper & lower)
    ctx.fillStyle = '#475569';
    ctx.fillRect(10, 2, 9, 2);
    ctx.fillRect(10, 8, 9, 2);
    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(12, 2, 4, 2);
    ctx.fillRect(12, 8, 4, 2);
    ctx.fillStyle = '#ccfbf1';
    ctx.fillRect(17, 2, 2, 2);
    ctx.fillRect(17, 8, 2, 2);
    this.refresh(tm, 'turret_gun');
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

    // Tier-2 Weapon Icons (32x32)
    drawSimpleIcon('icon_frost_sword', '#082f49', '#38bdf8', ctx => {
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(7, 25); ctx.lineTo(25, 7); ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(20, 7, 5, 5);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(8, 17, 7, 3);
      ctx.fillRect(12, 19, 3, 7);
    });
    drawSimpleIcon('icon_thunder_staff', '#1e1b4b', '#facc15', ctx => {
      ctx.fillStyle = '#a5b4fc';
      ctx.fillRect(7, 21, 12, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(17, 11, 8, 8);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(19, 13, 4, 4);
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(20, 7, 3, 4);
    });
    drawSimpleIcon('icon_inferno_gatling', '#450a0a', '#f97316', ctx => {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(5, 11, 11, 10);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(16, 11, 11, 2);
      ctx.fillRect(16, 15, 11, 2);
      ctx.fillRect(16, 19, 11, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(8, 14, 5, 4);
    });

    // Boss Weapon Icons (32x32)
    drawSimpleIcon('icon_solar_laser', '#450a0a', '#f59e0b', ctx => {
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(4, 12, 14, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(17, 10, 10, 12);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(8, 14, 18, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(25, 14, 3, 4);
    });
    drawSimpleIcon('icon_boomerang_blade', '#082f49', '#22d3ee', ctx => {
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0891b2';
      ctx.beginPath(); ctx.arc(13, 16, 10, -Math.PI * 0.45, Math.PI * 0.45); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#cffafe';
      ctx.beginPath(); ctx.arc(14, 16, 10, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(7, 14, 5, 4);
    });
    drawSimpleIcon('icon_glacial_cannon', '#0c4a6e', '#38bdf8', ctx => {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(4, 12, 11, 9);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(14, 10, 13, 12);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(10, 14, 12, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(24, 12, 3, 8);
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
