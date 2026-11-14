import Phaser from 'phaser';
import { DamageInfo } from '../types/entity';
import { ProjectilePool } from '../combat/ProjectilePool';
import { EnemyBase } from '../enemies/EnemyBase';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';
import { StatusManager } from '../combat/StatusManager';

export type PropType = 'explosive' | 'toxic' | 'crate';

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

export class InteractiveProps {
  private scene: Phaser.Scene;
  public props: PropData[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public spawnProp(type: PropType, x: number, y: number): PropData {
    const id = 'prop_' + Math.random().toString(36).slice(2, 9);
    const texture =
      type === 'explosive'
        ? 'barrel_explosive'
        : type === 'toxic'
          ? 'barrel_toxic'
          : 'crate_wood';

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

  public detonateProp(prop: PropData, pool: ProjectilePool, enemies: EnemyBase[]): void {
    if (prop.isDestroyed) return;
    prop.isDestroyed = true;

    audio.playExplosion();
    this.scene.cameras.main.shake(240, 0.015);

    const explosionRadius = prop.type === 'explosive' ? 85 : 70;
    const damage = prop.type === 'explosive' ? 24 : 14;

    pool.destroyEnemyBulletsInRadius(prop.x, prop.y, explosionRadius);

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = Math.hypot(enemy.sprite.x - prop.x, enemy.sprite.y - prop.y);
      if (dist <= explosionRadius) {
        const dx = enemy.sprite.x - prop.x;
        const dy = enemy.sprite.y - prop.y;
        const len = Math.hypot(dx, dy) || 1;

        enemy.takeDamage({
          amount: damage,
          isCrit: true,
          element: prop.type === 'explosive' ? 'fire' : 'frost',
          knockback: {
            x: dx / len,
            y: dy / len,
            force: 280
          },
          isPlayerAttack: true
        });

        if (prop.type === 'explosive') {
          StatusManager.applyStatus(enemy as any, 'burn', 3.0, 3, 0.5);
        } else {
          StatusManager.applyStatus(enemy as any, 'freeze', 3.0, 1, 0.5, 0.6);
        }
      }
    }

    const fx = this.scene.add.graphics().setDepth(20);
    const fxColor = prop.type === 'explosive' ? 0xf59e0b : 0x22c55e;
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

    events.emit('combat:explosion', { x: prop.x, y: prop.y, radius: explosionRadius, damage });

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
