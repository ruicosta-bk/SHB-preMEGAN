import type Phaser from 'phaser';

export type CreateCanvasFn = (
  tm: Phaser.Textures.TextureManager,
  key: string,
  w: number,
  h: number
) => CanvasRenderingContext2D;

export type RefreshTextureFn = (tm: Phaser.Textures.TextureManager, key: string) => void;

const BLEND_MODE_ADD = 1 as Phaser.BlendModes;

/**
 * Generates longsword textures, frost barrel texture, and the upgraded crescent slash_arc.
 */
export function generateWeaponAndBarrelTextures(
  tm: Phaser.Textures.TextureManager,
  createCanvas: CreateCanvasFn,
  refresh: RefreshTextureFn
): void {
  // 1. Longsword HUD / Drop Icon (24x24)
  let ctx = createCanvas(tm, 'icon_longsword', 24, 24);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 24, 24);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 22, 22);

  // Dark silhouette outline for crisp contrast
  ctx.strokeStyle = '#090b10';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(4, 20);
  ctx.lineTo(20, 4);
  ctx.stroke();

  // Pommel & leather grip
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4, 20);
  ctx.lineTo(8, 16);
  ctx.stroke();
  ctx.fillStyle = '#eab308';
  ctx.fillRect(3, 19, 2, 2);

  // Heavy bronze-gold crossguard
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(6, 13);
  ctx.lineTo(11, 18);
  ctx.stroke();

  // Broad steel blade with razor edge highlight
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(9, 15);
  ctx.lineTo(20, 4);
  ctx.stroke();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(9, 14);
  ctx.lineTo(20, 4);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(19, 4, 2, 2);
  refresh(tm, 'icon_longsword');

  // 2. Held Longsword Sprite (32x12, sleek long steel greatsword blade facing right)
  ctx = createCanvas(tm, 'hand_longsword', 32, 12);
  ctx.fillStyle = '#090b10';
  ctx.fillRect(0, 4, 30, 4);
  ctx.fillRect(6, 1, 4, 10);
  ctx.fillRect(9, 3, 20, 6);
  ctx.fillRect(28, 4, 4, 4);

  // Pommel & grip
  ctx.fillStyle = '#eab308';
  ctx.fillRect(1, 5, 2, 2);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(3, 5, 4, 2);

  // Crossguard
  ctx.fillStyle = '#d97706';
  ctx.fillRect(7, 2, 2, 8);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(7, 5, 2, 2);

  // Sleek tapered steel blade with central fuller and bright upper edge
  ctx.fillStyle = '#64748b';
  ctx.fillRect(10, 4, 18, 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(10, 4, 19, 2);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(11, 4, 19, 1);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(11, 6, 15, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(28, 5, 3, 2);
  refresh(tm, 'hand_longsword');

  // 3. Frost Barrel (24x28, icy blue steel barrel with frost crystal emblem)
  ctx = createCanvas(tm, 'barrel_frost', 24, 28);
  ctx.fillStyle = '#090b10';
  ctx.fillRect(1, 1, 22, 26);

  // Top cap & icy steel barrel body
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(3, 2, 18, 3);
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(3, 5, 18, 20);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(4, 6, 12, 18);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(5, 6, 3, 18);

  // Steel barrel hoops
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(2, 4, 20, 3);
  ctx.fillRect(2, 13, 20, 3);
  ctx.fillRect(2, 22, 20, 3);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(4, 5, 16, 1);
  ctx.fillRect(4, 23, 16, 1);

  // Frost crystal emblem
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(11, 8, 2, 10);
  ctx.fillRect(7, 12, 10, 2);
  ctx.fillRect(9, 10, 6, 6);
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(10, 11, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(11, 12, 2, 2);
  refresh(tm, 'barrel_frost');

  // 4. Upgraded Thicker Glowing Slash Arc (46x58 crescent with bright white inner edge & cyan glow)
  ctx = createCanvas(tm, 'slash_arc', 46, 58);

  const traceCrescent = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.arc(17, 29, 26, -1.9, 1.9, false);
    c.arc(6.29, 29, 24.71, 1.477, -1.477, true);
    c.closePath();
  };

  // Outer cyan glow halo
  ctx.save();
  ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
  ctx.shadowBlur = 5;
  traceCrescent(ctx);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Thick glowing cyan-ice crescent body
  traceCrescent(ctx);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();

  // Bright cyan-white mid-blade crescent
  ctx.beginPath();
  ctx.arc(17, 29, 24.5, -1.8, 1.8, false);
  ctx.arc(7.5, 29, 23.2, 1.38, -1.38, true);
  ctx.closePath();
  ctx.fillStyle = '#bae6fd';
  ctx.fill();

  // Bright pure-white inner edge & core gleam
  ctx.beginPath();
  ctx.arc(15.5, 29, 23, -1.65, 1.65, false);
  ctx.arc(8.8, 29, 21.8, 1.25, -1.25, true);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(6.29, 29, 25.2, -1.32, 1.32, false);
  ctx.stroke();

  refresh(tm, 'slash_arc');
}

/**
 * Generates HUD icon and held fist sprite textures for unarmed hand strikes.
 */
export function generateUnarmedTextures(
  tm: Phaser.Textures.TextureManager,
  createCanvas: CreateCanvasFn,
  refresh: RefreshTextureFn
): void {
  // 1. Unarmed HUD Icon (24x24)
  let ctx = createCanvas(tm, 'icon_unarmed', 24, 24);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 24, 24);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 22, 22);

  // Subtle impact arc behind fist
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(13, 12, 8.5, -1.0, 0.9, false);
  ctx.stroke();

  // Dark silhouette outline for clenched fist
  ctx.fillStyle = '#090b10';
  ctx.fillRect(5, 13, 6, 7);
  ctx.fillRect(6, 7, 12, 10);

  // Wrist wrap & golden knuckle gauntlet
  ctx.fillStyle = '#b45309';
  ctx.fillRect(6, 14, 5, 5);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(7, 8, 10, 8);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(8, 8, 8, 4);

  // Individual knuckle segments & bright highlight
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(8, 8, 2, 2);
  ctx.fillRect(11, 8, 2, 2);
  ctx.fillRect(14, 8, 2, 2);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(10, 12, 5, 2);
  refresh(tm, 'icon_unarmed');

  // 2. Held Clenched Fist Sprite (16x10 facing right)
  ctx = createCanvas(tm, 'hand_unarmed', 16, 10);
  ctx.fillStyle = '#090b10';
  ctx.fillRect(1, 3, 5, 4);
  ctx.fillRect(5, 1, 10, 8);

  // Forearm wrap
  ctx.fillStyle = '#92400e';
  ctx.fillRect(2, 4, 4, 2);

  // Fist body & upper wrap
  ctx.fillStyle = '#d97706';
  ctx.fillRect(6, 2, 8, 6);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(6, 2, 8, 4);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(10, 2, 4, 5);

  // Knuckle edge gleam
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(12, 2, 2, 2);
  ctx.fillRect(12, 5, 2, 2);
  refresh(tm, 'hand_unarmed');
}

/**
 * Spawns 3 thick crescent slash afterimage layers sweeping in a fixed direction
 * (-0.85 rad to +0.85 rad around aimAngle) and fading out smoothly over ~210ms.
 */
export function spawnMeleeSlashTrail(
  scene: Phaser.Scene,
  x: number,
  y: number,
  aimAngle: number,
  radius: number,
  tintColor?: number
): void {
  if (!scene?.add?.sprite) return;

  const offsetDist = Math.max(18, radius * 0.48);
  const baseScale = Math.max(0.68, radius / 48);

  const layers = [
    { startOffset: -0.85, endOffset: 0.15, scaleMult: 1.08, duration: 220 },
    { startOffset: -0.45, endOffset: 0.55, scaleMult: 1.0, duration: 210 },
    { startOffset: -0.05, endOffset: 0.85, scaleMult: 0.94, duration: 200 }
  ];

  for (const layer of layers) {
    const startAngle = aimAngle + layer.startOffset;
    const endAngle = aimAngle + layer.endOffset;
    const layerScale = baseScale * layer.scaleMult;

    const spr = scene.add.sprite(
      x + Math.cos(startAngle) * offsetDist,
      y + Math.sin(startAngle) * offsetDist,
      'slash_arc'
    );
    if (!spr) continue;

    spr.setRotation(startAngle);
    spr.setScale(layerScale);
    spr.setAlpha(0.88);
    spr.setDepth(14);
    if (tintColor !== undefined) {
      spr.setTint?.(tintColor);
    }
    (spr as unknown as { setBlendMode?: (mode: Phaser.BlendModes) => unknown }).setBlendMode?.(
      BLEND_MODE_ADD
    );

    if (scene.tweens?.add) {
      scene.tweens.add({
        targets: spr,
        rotation: endAngle,
        alpha: 0,
        scaleX: layerScale * 1.12,
        scaleY: layerScale * 1.12,
        duration: layer.duration,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          spr.setPosition?.(
            x + Math.cos(spr.rotation) * offsetDist,
            y + Math.sin(spr.rotation) * offsetDist
          );
        },
        onComplete: () => {
          spr.destroy?.();
        }
      });
    } else if (scene.time?.delayedCall) {
      scene.time.delayedCall(layer.duration, () => {
        spr.destroy?.();
      });
    }
  }
}
