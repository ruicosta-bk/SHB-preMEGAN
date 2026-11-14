import Phaser from 'phaser';
import { DamageInfo } from '../types/entity';
import { ProjectilePool } from '../combat/ProjectilePool';
import { EnemyBase } from '../enemies/EnemyBase';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';
import { StatusManager } from '../combat/StatusManager';

export interface PropData {
  id: string;
  type: 'explosive' | 'toxic';
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

  public spawnProp(type: 'explosive' | 'toxic', x: number, y: number): PropData {
    const id = 'prop_' + Math.random().toString(36).substr(2, 9);
    const texture = type === 'explosive' ? 'barrel_explosive' : 'barrel_toxic';
    const shadow = this.scene.add.sprite(x, y + 10, 'shadow').setDepth(4);
    const sprite = this.scene.add.sprite(x, y, texture).setDepth(5);

    const prop: PropData = {
      id,
      type,
      x,
      y,
      hp: type === 'explosive' ? 10 : 8,
      maxHp: type === 'explosive' ? 10 : 8,
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
    enemies: EnemyBase[]
  ): boolean {
    if (prop.isDestroyed) return false;

    prop.hp -= damage.amount;
    prop.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (!prop.isDestroyed) prop.sprite.clearTint();
    });

    if (prop.hp <= 0) {
      this.detonateProp(prop, pool, enemies);
      return true;
    }

    return false;
  }

  public detonateProp(prop: PropData, pool: ProjectilePool, enemies: EnemyBase[]): void {
    if (prop.isDestroyed) return;
    prop.isDestroyed = true;

    audio.playExplosion();
    this.scene.cameras.main.shake(250, 0.015);

    const explosionRadius = prop.type === 'explosive' ? 85 : 70;
    const damage = prop.type === 'explosive' ? 24 : 14;

    // Destroy enemy bullets in explosion
    pool.destroyEnemyBulletsInRadius(prop.x, prop.y, explosionRadius);

    // Damage and apply status to nearby enemies
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

        // Apply status
        if (prop.type === 'explosive') {
          StatusManager.applyStatus(enemy as any, 'burn', 3.0, 3, 0.5);
        } else {
          StatusManager.applyStatus(enemy as any, 'freeze', 3.0, 1, 0.5, 0.6);
        }
      }
    }

    // Visual explosion shockwave graphic
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

    // Destroy prop sprite
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
