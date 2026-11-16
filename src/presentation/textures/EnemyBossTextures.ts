import Phaser from 'phaser';

export type CreateCanvasFn = (
  tm: Phaser.Textures.TextureManager,
  key: string,
  w: number,
  h: number
) => CanvasRenderingContext2D;

export type RefreshTextureFn = (tm: Phaser.Textures.TextureManager, key: string) => void;

export function generateNewBiomeEnemyTextures(
  tm: Phaser.Textures.TextureManager,
  createCanvas: CreateCanvasFn,
  refresh: RefreshTextureFn
): void {
  const px = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w = 1, h = 1) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };

  // 1. Crypt Shielder (28x28): Stone Crypt armored sentinel carrying a heavy rune tower shield
  let ctx = createCanvas(tm, 'enemy_crypt_shielder', 28, 28);
  px(ctx, '#090b10', 8, 2, 13, 21);
  px(ctx, '#475569', 9, 3, 11, 9);
  px(ctx, '#64748b', 10, 4, 9, 3);
  px(ctx, '#090b10', 11, 7, 7, 3);
  px(ctx, '#38bdf8', 12, 8, 2, 1);
  px(ctx, '#38bdf8', 16, 8, 2, 1);
  px(ctx, '#334155', 9, 12, 11, 10);
  // Heavy stone tower shield held in front (right side, flips with setFlipX)
  px(ctx, '#090b10', 18, 6, 9, 17);
  px(ctx, '#64748b', 19, 7, 7, 15);
  px(ctx, '#94a3b8', 20, 8, 5, 3);
  px(ctx, '#38bdf8', 21, 12, 3, 5);
  px(ctx, '#090b10', 10, 23, 4, 4);
  px(ctx, '#090b10', 16, 23, 4, 4);
  refresh(tm, 'enemy_crypt_shielder');

  // 2. Bone Sniper (26x28): Hooded skeleton marksman with long bone crossbow
  ctx = createCanvas(tm, 'enemy_bone_sniper', 26, 28);
  px(ctx, '#090b10', 7, 2, 12, 11);
  px(ctx, '#e2e8f0', 8, 3, 10, 8);
  px(ctx, '#cbd5e1', 9, 9, 8, 3);
  px(ctx, '#090b10', 9, 6, 3, 3);
  px(ctx, '#090b10', 14, 6, 3, 3);
  px(ctx, '#ef4444', 10, 7, 1, 1);
  px(ctx, '#ef4444', 15, 7, 1, 1);
  px(ctx, '#090b10', 6, 12, 14, 11);
  px(ctx, '#334155', 7, 13, 12, 9);
  px(ctx, '#f8fafc', 11, 14, 4, 6);
  // Bone sniper rifle/crossbow
  px(ctx, '#090b10', 13, 14, 12, 5);
  px(ctx, '#cbd5e1', 14, 15, 10, 2);
  px(ctx, '#ef4444', 22, 15, 2, 2);
  px(ctx, '#090b10', 8, 23, 4, 4);
  px(ctx, '#090b10', 14, 23, 4, 4);
  refresh(tm, 'enemy_bone_sniper');

  // 3. Ice Stalker (26x28): Frost phantom assassin with twin ice daggers
  ctx = createCanvas(tm, 'enemy_ice_stalker', 26, 28);
  px(ctx, '#090b10', 7, 2, 12, 10);
  px(ctx, '#0284c7', 8, 3, 10, 8);
  px(ctx, '#0f172a', 9, 7, 8, 4);
  px(ctx, '#67e8f9', 10, 8, 2, 2);
  px(ctx, '#67e8f9', 14, 8, 2, 2);
  px(ctx, '#090b10', 6, 12, 14, 10);
  px(ctx, '#0369a1', 7, 13, 12, 8);
  px(ctx, '#38bdf8', 9, 14, 8, 3);
  // Twin frost blades
  px(ctx, '#090b10', 2, 13, 5, 7);
  px(ctx, '#bae6fd', 3, 14, 3, 5);
  px(ctx, '#090b10', 20, 12, 5, 9);
  px(ctx, '#e0f2fe', 21, 13, 3, 7);
  px(ctx, '#090b10', 8, 22, 4, 4);
  px(ctx, '#090b10', 14, 22, 4, 4);
  refresh(tm, 'enemy_ice_stalker');

  // 4. Glacial Totem (26x28): Floating runic ice pillar emitting frost rings
  ctx = createCanvas(tm, 'enemy_glacial_totem', 26, 28);
  px(ctx, '#090b10', 9, 1, 8, 4);
  px(ctx, '#67e8f9', 10, 2, 6, 2);
  px(ctx, '#090b10', 6, 4, 14, 18);
  px(ctx, '#0284c7', 7, 5, 12, 16);
  px(ctx, '#38bdf8', 8, 6, 10, 5);
  px(ctx, '#090b10', 9, 11, 8, 6);
  px(ctx, '#e0f2fe', 10, 12, 6, 4);
  px(ctx, '#22d3ee', 11, 13, 4, 2);
  px(ctx, '#090b10', 8, 23, 10, 4);
  px(ctx, '#67e8f9', 9, 24, 8, 2);
  refresh(tm, 'enemy_glacial_totem');

  // 5. Magma Slime (26x24): Molten obsidian slime with glowing lava core
  ctx = createCanvas(tm, 'enemy_magma_slime', 26, 24);
  px(ctx, '#090b10', 6, 4, 14, 5);
  px(ctx, '#090b10', 3, 8, 20, 13);
  px(ctx, '#9a3412', 4, 9, 18, 11);
  px(ctx, '#ea580c', 6, 6, 14, 11);
  px(ctx, '#fb923c', 8, 7, 10, 4);
  px(ctx, '#fef08a', 9, 10, 2, 2);
  px(ctx, '#fef08a', 15, 10, 2, 2);
  px(ctx, '#fde047', 10, 15, 6, 3);
  refresh(tm, 'enemy_magma_slime');

  // 6. Pyro Juggernaut (30x30): Heavy obsidian furnace colossus
  ctx = createCanvas(tm, 'enemy_pyro_juggernaut', 30, 30);
  px(ctx, '#090b10', 5, 2, 20, 23);
  px(ctx, '#090b10', 2, 9, 26, 14);
  px(ctx, '#27272a', 6, 3, 18, 21);
  px(ctx, '#3f3f46', 8, 4, 14, 6);
  px(ctx, '#dc2626', 9, 9, 12, 3);
  px(ctx, '#fef08a', 10, 10, 3, 1);
  px(ctx, '#fef08a', 17, 10, 3, 1);
  // Furnace chest grate
  px(ctx, '#090b10', 10, 14, 10, 7);
  px(ctx, '#f97316', 11, 15, 8, 5);
  px(ctx, '#fde047', 13, 16, 4, 3);
  // Heavy flame gauntlets
  px(ctx, '#7f1d1d', 3, 11, 3, 9);
  px(ctx, '#7f1d1d', 24, 11, 3, 9);
  px(ctx, '#090b10', 7, 25, 6, 4);
  px(ctx, '#090b10', 17, 25, 6, 4);
  refresh(tm, 'enemy_pyro_juggernaut');

  // Bullet 1: Piercing bone sniper bolt (14x8)
  ctx = createCanvas(tm, 'bullet_bone_pierce', 14, 8);
  px(ctx, '#090b10', 0, 2, 14, 4);
  px(ctx, '#f8fafc', 1, 3, 10, 2);
  px(ctx, '#ef4444', 10, 2, 3, 4);
  px(ctx, '#fef08a', 11, 3, 2, 2);
  refresh(tm, 'bullet_bone_pierce');

  // Bullet 2: Magma glob projectile (14x14)
  ctx = createCanvas(tm, 'bullet_magma_glob', 14, 14);
  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.arc(7, 7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(7, 7, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(6, 6, 2, 0, Math.PI * 2);
  ctx.fill();
  refresh(tm, 'bullet_magma_glob');
}
