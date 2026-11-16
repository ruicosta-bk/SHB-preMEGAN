import Phaser from 'phaser';
import { DamageInfo } from '../types/entity';
import { ProjectilePool } from '../combat/ProjectilePool';
import { EnemyBase } from '../enemies/EnemyBase';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';
import { StatusManager } from '../combat/StatusManager';
import type { PlayerController } from '../player/PlayerController';

export type PropType = 'explosive' | 'toxic' | 'frost' | 'crate';

export interface PropData {
  id: string;
  type: PropType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isDestroyed: boolean;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Sprite;
}

const BARREL_EXPLOSION_SPEC: Record<
  'explosive' | 'toxic' | 'frost',
  { radius: number; damage: number; element: 'fire' | 'poison' | 'frost'; color: number }
> = {
  explosive: { radius: 85, damage: 24, element: 'fire', color: 0xf59e0b },
  toxic: { radius: 75, damage: 14, element: 'poison', color: 0x22c55e },
  frost: { radius: 75, damage: 12, element: 'frost', color: 0x38bdf8 }
};

export class InteractiveProps {
  private scene: Phaser.Scene;
  public props: PropData[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public spawnProp(type: PropType, x: number, y: number): PropData {
    const id = 'prop_' + Math.random().toString(36).slice(2, 9);
    const textureMap: Record<PropType, string> = {
      explosive: 'barrel_explosive',
      toxic: 'barrel_toxic',
      frost: 'barrel_frost',
      crate: 'crate_wood'
    };
    const texture = textureMap[type];

    const shadow = this.scene.add.sprite(x, y + 10, 'shadow').setDepth(4);
    const sprite = this.scene.add.sprite(x, y, texture).setDepth(5);

    const hp = type === 'crate' ? 6 : type === 'explosive' ? 10 : 8;
    const prop: PropData = {
      id,
      type,
      x,
      y,
      hp,
      maxHp: hp,
      isDestroyed: false,
      sprite,
      shadow
    };

    this.props.push(prop);
    return prop;
  }

  public getObstacleColliders(): { x: number; y: number; width: number; height: number }[] {
    return this.props
      .filter(p => !p.isDestroyed)
      .map(p => ({
        x: p.x - 12,
        y: p.y - 12,
        width: 24,
        height: 24
      }));
  }

  public damageProp(
    prop: PropData,
    damage: DamageInfo,
    pool: ProjectilePool,
    enemies: EnemyBase[],
    onCrateBreak?: (x: number, y: number) => void
  ): boolean {
    if (prop.isDestroyed) return false;

    prop.hp -= damage.amount;
    prop.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (!prop.isDestroyed) prop.sprite.clearTint();
    });

    if (prop.hp <= 0) {
      if (prop.type === 'crate') {
        this.breakCrate(prop, onCrateBreak);
      } else {
        this.detonateProp(prop, pool, enemies);
      }
      return true;
    }

    return false;
  }

  private breakCrate(prop: PropData, onCrateBreak?: (x: number, y: number) => void): void {
    if (prop.isDestroyed) return;
    prop.isDestroyed = true;

    audio.playGlassBreak();
    // Wood splinter particles
    for (let i = 0; i < 6; i++) {
      const chip = this.scene.add.rectangle(prop.x, prop.y, 4, 4, 0xb45309).setDepth(15);
      const ang = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * 30;
      this.scene.tweens.add({
        targets: chip,
        x: prop.x + Math.cos(ang) * spd,
        y: prop.y + Math.sin(ang) * spd,
        alpha: 0,
        duration: 280,
        onComplete: () => chip.destroy()
      });
    }

    if (onCrateBreak) {
      onCrateBreak(prop.x, prop.y);
    }

    prop.sprite.destroy();
    prop.shadow.destroy();
  }

  public detonateProp(prop: PropData, pool: ProjectilePool, _enemies: EnemyBase[]): void {
    if (prop.isDestroyed) return;
    prop.isDestroyed = true;

    audio.playExplosion();
    this.scene.cameras.main.shake(240, 0.015);

    const spec = BARREL_EXPLOSION_SPEC[prop.type === 'crate' ? 'explosive' : prop.type];
    const explosionRadius = spec.radius;
    const damage = spec.damage;
    const element = spec.element;

    pool.destroyEnemyBulletsInRadius(prop.x, prop.y, explosionRadius);

    const fx = this.scene.add.graphics().setDepth(20);
    const fxColor = spec.color;
    fx.fillStyle(fxColor, 0.85);
    fx.fillCircle(prop.x, prop.y, explosionRadius);
    fx.lineStyle(3, 0xffffff, 1);
    fx.strokeCircle(prop.x, prop.y, explosionRadius);

    this.scene.tweens.add({
      targets: fx,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => fx.destroy()
    });

    // Single explosion authority: MainScene's 'combat:explosion' listener resolves enemy damage, status, and barrel chains
    events.emit('combat:explosion', {
      x: prop.x,
      y: prop.y,
      radius: explosionRadius,
      damage,
      element,
      spawnHazardZone: true,
      hurtsPlayer: true
    });

    prop.sprite.destroy();
    prop.shadow.destroy();
  }

  public clearAll(): void {
    for (const p of this.props) {
      p.sprite.destroy();
      p.shadow.destroy();
    }
    this.props = [];
  }
}

export interface CombatExplosionPayload {
  x: number;
  y: number;
  radius: number;
  damage: number;
  element?: 'fire' | 'frost' | 'physical' | 'poison';
  spawnHazardZone?: boolean;
  hurtsPlayer?: boolean;
}

export type ExplosionPlayerTarget =
  | PlayerController
  | {
      sprite?: { x: number; y: number };
      [key: string]: any;
    };

export function resolveCombatExplosion(
  data: CombatExplosionPayload,
  activeEnemies: EnemyBase[],
  interactiveProps: InteractiveProps | null | undefined,
  projectilePool: ProjectilePool,
  onCrateBreak?: (x: number, y: number) => void,
  player?: ExplosionPlayerTarget | null
): void {
  const element = data.element ?? 'fire';

  for (const enemy of activeEnemies) {
    if (enemy.isDead) continue;
    const dist = Math.hypot(enemy.sprite.x - data.x, enemy.sprite.y - data.y);
    if (dist <= data.radius) {
      const dx = enemy.sprite.x - data.x;
      const dy = enemy.sprite.y - data.y;
      const len = Math.hypot(dx, dy) || 1;

      enemy.takeDamage({
        amount: data.damage,
        isCrit: true,
        element,
        knockback: { x: dx / len, y: dy / len, force: element === 'frost' ? 240 : 280 },
        isPlayerAttack: true
      });
      if (element === 'fire') {
        StatusManager.applyStatus(enemy as any, 'burn', 3.0, 3, 0.5);
      } else if (element === 'frost') {
        StatusManager.applyStatus(enemy as any, 'freeze', 3.0, 0, 1.0, 0.45);
      } else if (element === 'poison') {
        StatusManager.applyStatus(enemy as any, 'poison', 3.0, 2, 0.5);
      }
    }
  }

  if (data.hurtsPlayer && player?.sprite && !(player as any).isDead) {
    const pDist = Math.hypot(player.sprite.x - data.x, player.sprite.y - data.y);
    if (pDist <= data.radius * 0.78) {
      (player as any).takeDamage?.({ amount: 2, element, isPlayerAttack: false });
      if (element === 'fire' || element === 'poison' || element === 'frost') {
        (player as any).applyHazardExposure?.(element);
      }
    }
  }

  if (interactiveProps) {
    for (const prop of interactiveProps.props) {
      if (prop.isDestroyed) continue;
      const dist = Math.hypot(prop.x - data.x, prop.y - data.y);
      if (dist <= data.radius && dist > 8) {
        interactiveProps.damageProp(
          prop,
          { amount: data.damage, isCrit: true, isPlayerAttack: true },
          projectilePool,
          activeEnemies,
          onCrateBreak
        );
      }
    }
  }
}
