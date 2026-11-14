import Phaser from 'phaser';
import { Stats, DamageInfo, DamageResult } from '../types/entity';
import { WeaponData, WeaponId } from '../types/weapon';
import { UpgradeId } from '../types/upgrade';
import { WEAPONS } from '../data/weapons';
import { UPGRADES } from '../data/upgrades';
import { DamageCalculator } from '../combat/DamageCalculator';
import { ProjectilePool } from '../combat/ProjectilePool';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';

export class PlayerController {
  public scene: Phaser.Scene;
  public sprite: Phaser.GameObjects.Sprite;
  public shadow: Phaser.GameObjects.Sprite;

  public stats: Stats = {
    maxHp: 6,
    hp: 6,
    maxArmor: 5,
    armor: 5,
    maxEnergy: 180,
    energy: 180,
    speed: 210,
    dashSpeed: 460,
    dashDuration: 0.2,
    dashCooldown: 1.5
  };

  // Upgrades stack count
  public upgrades: Map<UpgradeId, number> = new Map();

  // Soul Knight Economy (Gold Coins)
  public coins: number = 0;

  // Weapons
  public weaponSlots: [WeaponData, WeaponData | null] = [WEAPONS.pistol, null];
  public activeSlotIndex: number = 0;
  private shootCooldownRemaining: number = 0;

  // Dash & Movement
  private isDashing: boolean = false;
  private dashTimer: number = 0;
  private dashCooldownRemaining: number = 0;
  private dashVx: number = 0;
  private dashVy: number = 0;

  // I-frames & Armor Regen
  private invulnerableTimer: number = 0;
  private timeSinceLastHit: number = 999;
  private isDead: boolean = false;

  // Input keys
  private keys: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    q: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    f: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
  };

  // Skill state (Alchemical Volatile Flask)
  public skillCooldownMax: number = 6.0;
  public skillCooldownRemaining: number = 0;

  // Slash visual representation
  private slashSprite: Phaser.GameObjects.Sprite | null = null;
  private slashTimer: number = 0;

  // Animation walk cycle
  private animTimer: number = 0;
  private animFrame: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Visuals
    this.shadow = scene.add.sprite(x, y + 10, 'shadow').setDepth(9);
    this.sprite = scene.add.sprite(x, y, 'player_idle').setDepth(10);

    // Setup input keys
    const k = scene.input.keyboard!;
    this.keys = {
      w: k.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: k.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: k.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: k.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: k.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      left: k.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      down: k.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      right: k.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      space: k.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      q: k.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      e: k.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      f: k.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      esc: k.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    };

    // Slash sprite
    this.slashSprite = scene.add.sprite(0, 0, 'slash_arc').setDepth(14).setVisible(false);

    // Notify initial state
    this.emitStats();
    this.emitWeaponChange();
    this.emitCoins();
  }

  public addCoins(amount: number): void {
    this.coins += amount;
    this.emitCoins();
  }

  public spendCoins(amount: number): boolean {
    if (this.coins >= amount) {
      this.coins -= amount;
      this.emitCoins();
      return true;
    }
    return false;
  }

  public emitCoins(): void {
    events.emit('player:coins-changed', { coins: this.coins });
  }

  public getCurrentWeapon(): WeaponData {
    return this.weaponSlots[this.activeSlotIndex] || WEAPONS.pistol;
  }

  public getSecondaryWeapon(): WeaponData | null {
    return this.weaponSlots[this.activeSlotIndex === 0 ? 1 : 0];
  }

  public equipWeapon(weapon: WeaponData): WeaponData | null {
    // If secondary slot is empty, put it in secondary
    if (this.weaponSlots[1] === null) {
      this.weaponSlots[1] = weapon;
      this.activeSlotIndex = 1;
      this.emitWeaponChange();
      audio.playPickup();
      return null;
    }
    // Swap currently active slot (if slot 0, swap slot 1)
    const slotToReplace = this.activeSlotIndex === 0 ? 1 : this.activeSlotIndex;
    const oldWeapon = this.weaponSlots[slotToReplace];
    this.weaponSlots[slotToReplace] = weapon;
    this.activeSlotIndex = slotToReplace;
    this.emitWeaponChange();
    audio.playPickup();
    return oldWeapon;
  }

  public swapWeaponSlot(): void {
    if (this.weaponSlots[1] !== null) {
      this.activeSlotIndex = this.activeSlotIndex === 0 ? 1 : 0;
      this.emitWeaponChange();
      audio.playPickup();
    }
  }

  public applyUpgrade(upgradeId: UpgradeId): void {
    const curStacks = this.upgrades.get(upgradeId) || 0;
    this.upgrades.set(upgradeId, curStacks + 1);

    switch (upgradeId) {
      case 'armor_plating':
        this.stats.maxArmor += 2;
        this.stats.armor = Math.min(this.stats.maxArmor, this.stats.armor + 2);
        break;
      case 'vitality_ember':
        this.stats.maxHp += 3;
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 2);
        break;
      case 'energy_capacitor':
        this.stats.maxEnergy += 60;
        this.stats.energy = Math.min(this.stats.maxEnergy, this.stats.energy + 60);
        break;
      case 'slipstream_dash':
        this.stats.dashCooldown = Math.max(0.6, this.stats.dashCooldown * 0.65);
        break;
      default:
        break;
    }

    this.emitStats();
  }

  public takeDamage(damage: DamageInfo): DamageResult | null {
    if (this.isDead || this.invulnerableTimer > 0 || this.isDashing) {
      return null;
    }

    const res = DamageCalculator.applyDamage(this.stats, damage);
    this.timeSinceLastHit = 0;
    this.invulnerableTimer = 0.8; // 0.8s i-frame
    audio.playPlayerHurt();

    events.emit('player:damaged', {
      amount: res.actualDamage,
      armorAbsorbed: res.absorbedByArmor,
      hpLoss: res.hpDamage,
      currentHp: this.stats.hp
    });

    this.emitStats();

    if (res.isDead) {
      this.isDead = true;
      this.sprite.setTint(0xef4444);
      events.emit('player:died');
    }

    return res;
  }

  public heal(hpAmount: number, energyAmount: number = 0): void {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + hpAmount);
    if (energyAmount > 0) {
      this.stats.energy = Math.min(this.stats.maxEnergy, this.stats.energy + energyAmount);
    }
    events.emit('player:healed', { hpGain: hpAmount, armorGain: 0 });
    this.emitStats();
    audio.playPickup();
  }

  public update(
    deltaSec: number,
    pointer: Phaser.Input.Pointer,
    pool: ProjectilePool,
    wallColliders: { x: number; y: number; width: number; height: number }[],
    doorColliders: { x: number; y: number; width: number; height: number }[]
  ): void {
    if (this.isDead) return;

    // Timers
    if (this.shootCooldownRemaining > 0) this.shootCooldownRemaining -= deltaSec;
    if (this.dashCooldownRemaining > 0) {
      this.dashCooldownRemaining -= deltaSec;
      const progress = 1 - Math.max(0, this.dashCooldownRemaining / this.stats.dashCooldown);
      events.emit('player:dash-cooldown', { progress, isReady: this.dashCooldownRemaining <= 0 });
    }
    if (this.skillCooldownRemaining > 0) {
      this.skillCooldownRemaining -= deltaSec;
      const progress = 1 - Math.max(0, this.skillCooldownRemaining / this.skillCooldownMax);
      events.emit('player:skill-cooldown', { progress, isReady: this.skillCooldownRemaining <= 0 });
    }
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= deltaSec;
      // Visual flash
      this.sprite.setVisible(Math.floor(this.invulnerableTimer * 15) % 2 === 0);
    } else {
      this.sprite.setVisible(true);
    }

    // Armor Regen
    this.timeSinceLastHit += deltaSec;
    const armorDelay = this.upgrades.has('armor_plating') ? 2.2 : 3.0;
    const regenRes = DamageCalculator.updateArmorRegen(this.stats, deltaSec, this.timeSinceLastHit, armorDelay, 2.0);
    if (regenRes.regened > 0) {
      this.emitStats();
    }

    // Weapon swap input (Q)
    if (Phaser.Input.Keyboard.JustDown(this.keys.q)) {
      this.swapWeaponSlot();
    }

    // Active skill input (F or Right Click)
    const isRightClick = pointer.rightButtonDown() && pointer.getDuration() < 120;
    if ((Phaser.Input.Keyboard.JustDown(this.keys.f) || isRightClick) && this.skillCooldownRemaining <= 0) {
      this.useAlchemicalFlask(pointer, pool);
    }

    // Aiming towards mouse in world coordinates
    const aimWorldX = pointer.worldX;
    const aimWorldY = pointer.worldY;
    const aimAngle = Math.atan2(aimWorldY - this.sprite.y, aimWorldX - this.sprite.x);

    // Flip sprite towards aim
    if (aimWorldX < this.sprite.x) {
      this.sprite.setFlipX(true);
    } else {
      this.sprite.setFlipX(false);
    }

    // Movement direction vector
    let moveDx = 0;
    let moveDy = 0;
    if (this.keys.w.isDown || this.keys.up.isDown) moveDy -= 1;
    if (this.keys.s.isDown || this.keys.down.isDown) moveDy += 1;
    if (this.keys.a.isDown || this.keys.left.isDown) moveDx -= 1;
    if (this.keys.d.isDown || this.keys.right.isDown) moveDx += 1;

    // Normalize diagonal movement
    const moveLen = Math.hypot(moveDx, moveDy);
    if (moveLen > 0) {
      moveDx /= moveLen;
      moveDy /= moveLen;
    }

    // Dash Trigger (Space)
    if (Phaser.Input.Keyboard.JustDown(this.keys.space) && this.dashCooldownRemaining <= 0 && !this.isDashing) {
      this.isDashing = true;
      this.dashTimer = this.stats.dashDuration;
      this.dashCooldownRemaining = this.stats.dashCooldown;
      audio.playDash();

      // Dash towards movement direction, or towards mouse if stationary
      if (moveLen > 0) {
        this.dashVx = moveDx * this.stats.dashSpeed;
        this.dashVy = moveDy * this.stats.dashSpeed;
      } else {
        this.dashVx = Math.cos(aimAngle) * this.stats.dashSpeed;
        this.dashVy = Math.sin(aimAngle) * this.stats.dashSpeed;
      }
    }

    // Execute Movement & Collisions
    let vx = 0;
    let vy = 0;

    if (this.isDashing) {
      this.dashTimer -= deltaSec;
      vx = this.dashVx;
      vy = this.dashVy;

      // Trail effect during dash
      if (Math.random() < 0.5) {
        const trailColor = this.upgrades.has('slipstream_dash') ? 0xf97316 : 0x38bdf8;
        this.createDashGhost(trailColor);
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      vx = moveDx * this.stats.speed;
      vy = moveDy * this.stats.speed;

      // Animate walk frames
      if (moveLen > 0) {
        this.animTimer += deltaSec;
        if (this.animTimer > 0.15) {
          this.animTimer = 0;
          this.animFrame = (this.animFrame + 1) % 2;
          this.sprite.setTexture(this.animFrame === 0 ? 'player_run_1' : 'player_run_2');
        }
      } else {
        this.sprite.setTexture('player_idle');
      }
    }

    // Wall collision resolution (step X and step Y independently)
    const nextX = this.sprite.x + vx * deltaSec;
    const nextY = this.sprite.y + vy * deltaSec;
    const pBounds = { width: 18, height: 20 };

    if (!this.checkCollides(nextX, this.sprite.y, pBounds, wallColliders, doorColliders)) {
      this.sprite.x = nextX;
    }
    if (!this.checkCollides(this.sprite.x, nextY, pBounds, wallColliders, doorColliders)) {
      this.sprite.y = nextY;
    }

    // Update shadow position
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 11);

    // Update slash sprite timer
    if (this.slashTimer > 0) {
      this.slashTimer -= deltaSec;
      if (this.slashTimer <= 0 && this.slashSprite) {
        this.slashSprite.setVisible(false);
      }
    }

    // Fire weapon while pointer held down
    if (pointer.isDown && this.shootCooldownRemaining <= 0) {
      this.performAttack(aimAngle, pool);
    }
  }

  private checkCollides(
    x: number,
    y: number,
    size: { width: number; height: number },
    walls: { x: number; y: number; width: number; height: number }[],
    doors: { x: number; y: number; width: number; height: number }[]
  ): boolean {
    const left = x - size.width / 2;
    const right = x + size.width / 2;
    const top = y - size.height / 2;
    const bottom = y + size.height / 2;

    for (const w of walls) {
      if (right > w.x && left < w.x + w.width && bottom > w.y && top < w.y + w.height) {
        return true;
      }
    }
    for (const d of doors) {
      if (right > d.x && left < d.x + d.width && bottom > d.y && top < d.y + d.height) {
        return true;
      }
    }
    return false;
  }

  private performAttack(aimAngle: number, pool: ProjectilePool): void {
    const weapon = this.getCurrentWeapon();

    // Check energy cost
    if (weapon.energyCost > 0) {
      if (!DamageCalculator.consumeEnergy(this.stats, weapon.energyCost)) {
        // Can't afford energy, fail silently or fallback to pistol
        return;
      }
      this.emitStats();
    }

    this.shootCooldownRemaining = 1 / weapon.fireRate;

    // Critical focus upgrade
    const isCrit = this.upgrades.has('critical_focus') && Math.random() < 0.25;
    const damageMultiplier = isCrit ? 2.0 : 1.0;
    const extraPierce = this.upgrades.has('piercing_rounds') ? 1 : 0;
    const extraBounce = this.upgrades.has('ricochet') ? 1 : 0;

    // Melee Blade attack
    if (weapon.category === 'melee') {
      const bladeBonus = this.upgrades.has('blade_mastery') ? 3 : 0;
      const arcDegrees = this.upgrades.has('blade_mastery') ? 170 : weapon.spreadAngle;
      const radius = this.upgrades.has('blade_mastery') ? weapon.range * 1.25 : weapon.range;

      audio.playSlash();

      // Show slash visual
      if (this.slashSprite) {
        this.slashSprite.setPosition(
          this.sprite.x + Math.cos(aimAngle) * 24,
          this.sprite.y + Math.sin(aimAngle) * 24
        );
        this.slashSprite.setRotation(aimAngle);
        this.slashSprite.setVisible(true);
        this.slashTimer = 0.12;
      }

      // Destroy enemy bullets in slash area
      const bulletsDestroyed = pool.destroyEnemyBulletsInRadius(
        this.sprite.x + Math.cos(aimAngle) * 24,
        this.sprite.y + Math.sin(aimAngle) * 24,
        radius
      );

      if (bulletsDestroyed > 0) {
        audio.playParryBullet();
        if (this.upgrades.has('blade_mastery')) {
          this.stats.energy = Math.min(this.stats.maxEnergy, this.stats.energy + bulletsDestroyed);
          this.emitStats();
        }
      }

      // Emit melee hit check to room enemies
      events.emit('combat:enemy-hit', {
        enemyId: 'melee_sweep',
        damage: (weapon.damage + bladeBonus) * damageMultiplier,
        isCrit,
        x: this.sprite.x + Math.cos(aimAngle) * 28,
        y: this.sprite.y + Math.sin(aimAngle) * 28
      });

      return;
    }

    // Gun attack
    switch (weapon.id) {
      case 'pistol':
        audio.playShootPistol();
        break;
      case 'shotgun':
        audio.playShootShotgun();
        break;
      case 'repeater':
        audio.playShootRepeater();
        break;
      case 'penetrator':
        audio.playShootPenetrator();
        break;
    }

    // Spawn pellets
    const baseDamage = weapon.damage * damageMultiplier;
    const spreadRad = Phaser.Math.DegToRad(weapon.spreadAngle);

    for (let i = 0; i < weapon.pellets; i++) {
      let angleOffset = 0;
      if (weapon.pellets > 1) {
        angleOffset = (i / (weapon.pellets - 1) - 0.5) * spreadRad;
      } else if (weapon.spreadAngle > 0) {
        angleOffset = (Math.random() - 0.5) * spreadRad;
      }

      const bulletAngle = aimAngle + angleOffset;
      const muzzleDist = 18;
      const spawnX = this.sprite.x + Math.cos(aimAngle) * muzzleDist;
      const spawnY = this.sprite.y + Math.sin(aimAngle) * muzzleDist;

      pool.spawn({
        x: spawnX,
        y: spawnY,
        angleRad: bulletAngle,
        speed: weapon.bulletSpeed,
        damage: baseDamage,
        isPlayer: true,
        isCrit,
        texture: weapon.bulletTexture,
        range: weapon.range,
        pierceCount: weapon.pierceCount + extraPierce,
        bounceCount: weapon.bounceCount + extraBounce,
        tint: isCrit ? 0xff0055 : undefined
      });
    }
  }

  public useAlchemicalFlask(pointer: Phaser.Input.Pointer, pool: ProjectilePool): void {
    this.skillCooldownRemaining = this.skillCooldownMax;
    events.emit('player:skill-cooldown', { progress: 0, isReady: false });

    audio.playGlassBreak();
    const targetX = pointer.worldX;
    const targetY = pointer.worldY;
    const startX = this.sprite.x;
    const startY = this.sprite.y;

    const flask = this.scene.add.sprite(startX, startY, 'flask_alchemical').setDepth(16);
    this.scene.tweens.add({
      targets: flask,
      x: targetX,
      y: targetY,
      rotation: Math.PI * 4,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flask.destroy();
        audio.playExplosion();
        this.scene.cameras.main.shake(220, 0.015);

        // Clear enemy bullets in 80px blast zone
        pool.destroyEnemyBulletsInRadius(targetX, targetY, 80);

        // Visual blast shockwave
        const blast = this.scene.add.graphics().setDepth(20);
        blast.fillStyle(0xf97316, 0.85);
        blast.fillCircle(targetX, targetY, 80);
        blast.lineStyle(3, 0xfef08a, 1);
        blast.strokeCircle(targetX, targetY, 80);

        this.scene.tweens.add({
          targets: blast,
          alpha: 0,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 350,
          ease: 'Cubic.easeOut',
          onComplete: () => blast.destroy()
        });

        // Emit explosion event
        events.emit('combat:explosion', { x: targetX, y: targetY, radius: 80, damage: 20 });
      }
    });
  }

  private createDashGhost(tint: number): void {
    const ghost = this.scene.add.sprite(this.sprite.x, this.sprite.y, this.sprite.texture.key);
    ghost.setDepth(9);
    ghost.setFlipX(this.sprite.flipX);
    ghost.setTint(tint);
    ghost.setAlpha(0.6);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 180,
      onComplete: () => ghost.destroy()
    });
  }

  private emitStats(): void {
    events.emit('player:stats-changed', {
      hp: this.stats.hp,
      maxHp: this.stats.maxHp,
      armor: this.stats.armor,
      maxArmor: this.stats.maxArmor,
      energy: this.stats.energy,
      maxEnergy: this.stats.maxEnergy
    });
  }

  private emitWeaponChange(): void {
    events.emit('player:weapon-swapped', {
      current: this.getCurrentWeapon(),
      secondary: this.getSecondaryWeapon(),
      activeIndex: this.activeSlotIndex
    });
  }

  public destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    if (this.slashSprite) this.slashSprite.destroy();
  }
}
