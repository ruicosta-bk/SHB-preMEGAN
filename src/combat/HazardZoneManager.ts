import type Phaser from 'phaser';
import { StatusManager } from './StatusManager';
import type { EnemyBase } from '../enemies/EnemyBase';
import type { PlayerController } from '../player/PlayerController';
import type { DamageInfo, StatusEffect } from '../types/entity';

export type HazardElement = 'fire' | 'poison' | 'frost';

export interface HazardZoneConfig {
  x: number;
  y: number;
  radius: number;
  element: HazardElement;
  duration: number;
  affectsPlayer: boolean;
  applyChill?: boolean;
  damagePerTick?: number;
}

export interface ActiveHazardZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  element: HazardElement;
  duration: number;
  elapsed: number;
  tickTimer: number;
  particleTimer: number;
  affectsPlayer: boolean;
  applyChill: boolean;
  damagePerTick: number;
  gfx: Phaser.GameObjects.Graphics | null;
}

export interface HazardEnemyLike {
  id: string;
  x: number;
  y: number;
  sprite?: { x: number; y: number };
  isDead: boolean;
  statusEffects: Map<string, StatusEffect>;
  takeDamage: (damage: DamageInfo) => unknown;
}

export type HazardPlayerLike =
  | PlayerController
  | {
      sprite?: { x: number; y: number };
      [key: string]: any;
    };

interface ZonePalette {
  fill: number;
  rim: number;
  particleA: number;
  particleB: number;
}

const BASE_PALETTES: Record<HazardElement, ZonePalette> = {
  fire: { fill: 0xf97316, rim: 0xfef08a, particleA: 0xfb923c, particleB: 0xfef08a },
  poison: { fill: 0x22c55e, rim: 0x86efac, particleA: 0x4ade80, particleB: 0x86efac },
  frost: { fill: 0x38bdf8, rim: 0xbae6fd, particleA: 0x7dd3fc, particleB: 0xe0f2fe }
};

export class HazardZoneManager {
  private readonly scene: Phaser.Scene;
  private zones: ActiveHazardZone[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public spawnZone(config: HazardZoneConfig): ActiveHazardZone {
    const duration = Math.max(0, config.duration);
    const radius = Math.max(1, config.radius);
    const damagePerTick =
      config.element === 'frost' ? 0 : Math.max(0, config.damagePerTick ?? 2);

    const gfx = this.scene.add?.graphics ? this.scene.add.graphics().setDepth(3) : null;

    const zone: ActiveHazardZone = {
      id: 'hazard_' + Math.random().toString(36).slice(2, 9),
      x: config.x,
      y: config.y,
      radius,
      element: config.element,
      duration,
      elapsed: 0,
      tickTimer: 0,
      particleTimer: 0,
      affectsPlayer: config.affectsPlayer,
      applyChill: !!config.applyChill,
      damagePerTick,
      gfx
    };

    this.drawZone(zone);
    this.zones.push(zone);
    return zone;
  }

  public update(
    deltaSec: number,
    activeEnemies: readonly (EnemyBase | HazardEnemyLike)[],
    player?: HazardPlayerLike | null
  ): void {
    if (deltaSec <= 0 || this.zones.length === 0) return;

    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      const prevElapsed = zone.elapsed;
      zone.elapsed += deltaSec;

      const activeSlice = Math.max(0, Math.min(deltaSec, zone.duration - prevElapsed));
      zone.tickTimer += activeSlice;
      zone.particleTimer += deltaSec;

      this.drawZone(zone);

      if (zone.particleTimer >= 0.18) {
        zone.particleTimer %= 0.18;
        this.spawnAmbientParticles(zone);
      }

      while (zone.tickTimer >= 0.5) {
        zone.tickTimer -= 0.5;
        this.applyZoneTick(zone, activeEnemies, player);
      }

      if (zone.elapsed >= zone.duration) {
        zone.gfx?.destroy?.();
        zone.gfx = null;
        this.zones.splice(i, 1);
      }
    }
  }

  public clearAll(): void {
    for (const zone of this.zones) {
      zone.gfx?.destroy?.();
      zone.gfx = null;
    }
    this.zones = [];
  }

  public getActiveZones(): readonly ActiveHazardZone[] {
    return this.zones;
  }

  private getPalette(zone: ActiveHazardZone): ZonePalette {
    if (zone.element === 'poison' && zone.applyChill) {
      return { fill: 0x10b981, rim: 0x22d3ee, particleA: 0x4ade80, particleB: 0x22d3ee };
    }
    return BASE_PALETTES[zone.element];
  }

  private drawZone(zone: ActiveHazardZone): void {
    const gfx = zone.gfx;
    if (!gfx) return;

    const palette = this.getPalette(zone);
    const remaining = Math.max(0, zone.duration - zone.elapsed);
    const fadeWindow = Math.min(0.6, zone.duration);
    const fade = fadeWindow > 0 ? Math.min(1, remaining / fadeWindow) : 0;
    const pulse = 0.5 + 0.5 * Math.sin(zone.elapsed * 5);

    const fillAlpha = (0.18 + pulse * 0.08) * fade;
    const rimAlpha = (0.68 + pulse * 0.24) * fade;
    const rimRadius = zone.radius * (0.95 + pulse * 0.05);

    gfx.clear?.();
    gfx.fillStyle?.(palette.fill, fillAlpha);
    gfx.fillCircle?.(zone.x, zone.y, zone.radius);
    gfx.lineStyle?.(2.5, palette.rim, rimAlpha);
    gfx.strokeCircle?.(zone.x, zone.y, rimRadius);
  }

  private spawnAmbientParticles(zone: ActiveHazardZone): void {
    if (!this.scene.add?.circle || !this.scene.tweens?.add) return;

    const palette = this.getPalette(zone);
    const count = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * zone.radius * 0.85;
      const px = zone.x + Math.cos(ang) * dist;
      const py = zone.y + Math.sin(ang) * dist;
      const r = 2 + Math.random() * 2.5;
      const color = Math.random() < 0.5 ? palette.particleA : palette.particleB;

      const dot = this.scene.add.circle(px, py, r, color, 0.75);
      dot?.setDepth?.(4);
      this.scene.tweens.add({
        targets: dot,
        y: py - (10 + Math.random() * 12),
        alpha: 0,
        scale: 0.4,
        duration: 320 + Math.random() * 160,
        onComplete: () => dot?.destroy?.()
      });
    }
  }

  private applyZoneTick(
    zone: ActiveHazardZone,
    activeEnemies: readonly (EnemyBase | HazardEnemyLike)[],
    player?: HazardPlayerLike | null
  ): void {
    for (const enemy of activeEnemies) {
      if (!enemy || enemy.isDead) continue;
      const ex = enemy.sprite?.x ?? enemy.x;
      const ey = enemy.sprite?.y ?? enemy.y;
      if (typeof ex !== 'number' || typeof ey !== 'number') continue;

      if (Math.hypot(ex - zone.x, ey - zone.y) > zone.radius) continue;

      if (zone.element === 'fire') {
        if (zone.damagePerTick > 0) {
          enemy.takeDamage({
            amount: zone.damagePerTick,
            isCrit: false,
            element: 'fire',
            isPlayerAttack: true,
            isDot: true
          });
        }
        if (!enemy.isDead) {
          StatusManager.applyStatus(enemy as any, 'burn', 1.2, 2, 0.5);
        }
      } else if (zone.element === 'poison') {
        if (zone.damagePerTick > 0) {
          enemy.takeDamage({
            amount: zone.damagePerTick,
            isCrit: false,
            element: 'poison',
            isPlayerAttack: true,
            isDot: true
          });
        }
        if (!enemy.isDead) {
          StatusManager.applyStatus(enemy as any, 'poison', 1.2, 2, 0.5);
          if (zone.applyChill) {
            StatusManager.applyStatus(enemy as any, 'freeze', 2.0, 0, 1.0, 0.45);
          }
        }
      } else if (zone.element === 'frost') {
        StatusManager.applyStatus(enemy as any, 'freeze', 2.2, 0, 1.0, 0.45);
      }
    }

    if (zone.affectsPlayer && player && !(player as any).isDead) {
      const px = player.sprite?.x ?? (player as any).x;
      const py = player.sprite?.y ?? (player as any).y;
      if (typeof px === 'number' && typeof py === 'number') {
        if (Math.hypot(px - zone.x, py - zone.y) <= zone.radius) {
          (player as any).applyHazardExposure?.(zone.element);
        }
      }
    }
  }
}
