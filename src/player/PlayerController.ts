import Phaser from 'phaser';
import { Stats, DamageInfo, DamageResult } from '../types/entity';
import { WeaponData, WeaponId } from '../types/weapon';
import { UpgradeId } from '../types/upgrade';
import { WEAPONS } from '../data/weapons';
import { findMergeResult } from '../data/merges';
import { UPGRADES } from '../data/upgrades';
import { HEROES, HeroConfig, HeroId, shouldResetSkillOnKill } from '../data/heroes';
import { DamageCalculator } from '../combat/DamageCalculator';
import { ProjectilePool } from '../combat/ProjectilePool';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';
import { MetaBonuses } from '../core/MetaProgression';
import { EffectsManager } from '../presentation/EffectsManager';

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

  // Hero class state
  public heroId: HeroId;
  public heroConfig: HeroConfig;
  private texturePrefix: string;

  // Skill state & statue blessing
  public skillCooldownMax: number = 6.0;
  public skillCooldownRemaining: number = 0;
  public statueBlessing: 'knight' | 'sorcerer' | null = null;
  private guaranteedNextCrit: boolean = false;
  private rogueKillWindowTimer: number = 0;
  private dualWieldTimer: number = 0;
  private vampireHealCharges: number = 0;
  private reflectShieldTimer: number = 0;
  private reflectShieldGfx: Phaser.GameObjects.Graphics | null = null;
  private frostSlowTimer: number = 0;
  private bowChargeTime: number = 0;
  private isChargingBow: boolean = false;
  private bowChargeGfx: Phaser.GameObjects.Graphics | null = null;

  // Slash visual representation
  private slashSprite: Phaser.GameObjects.Sprite | null = null;
  private slashTimer: number = 0;

  // Held weapon & muzzle flash (360-degree aim + Knight Dual Wield off-hand weapon)
  private weaponSprite: Phaser.GameObjects.Sprite;
  private offhandWeaponSprite: Phaser.GameObjects.Sprite;
  private muzzleFlashSprite: Phaser.GameObjects.Sprite;
  private offhandMuzzleFlashSprite: Phaser.GameObjects.Sprite;
  private weaponRecoilOffset: number = 0;
  private muzzleFlashTimer: number = 0;

  // Animation walk cycle
  private animTimer: number = 0;
  private animFrame: number = 0;
  private bobTimer: number = 0;
  private dustTimer: number = 0;
  private effects: EffectsManager | null = null;

  // Milestone 4: Weapon forge upgrades, Vending drink buffs & Biome terrain hazards
  public forgeLevels: Map<string, number> = new Map();
  private fireRateBonus: number = 1.0;
  private isOnIce: boolean = false;
  private glideVx: number = 0;
  private glideVy: number = 0;
  private lavaTickTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, heroId: HeroId = 'alchemist', metaBonuses?: MetaBonuses) {
    this.scene = scene;
    this.heroId = heroId;
    this.heroConfig = HEROES[heroId] || HEROES.alchemist;
    this.texturePrefix = this.heroConfig.texturePrefix;

    this.stats.maxHp = this.heroConfig.hp;
    this.stats.hp = this.heroConfig.hp;
    this.stats.maxArmor = this.heroConfig.armor;
    this.stats.armor = this.heroConfig.armor;
    this.stats.maxEnergy = this.heroConfig.maxEnergy;
    this.stats.energy = this.heroConfig.maxEnergy;
    this.stats.speed = this.heroConfig.speed;
    this.stats.dashCooldown = this.heroConfig.dashCooldown;
    this.skillCooldownMax = this.heroConfig.skillCooldown;

    if (metaBonuses) {
      this.stats.maxHp += metaBonuses.bonusHp;
      this.stats.hp += metaBonuses.bonusHp;
      this.stats.maxArmor += metaBonuses.bonusArmor;
      this.stats.armor += metaBonuses.bonusArmor;
      this.stats.maxEnergy += metaBonuses.bonusEnergy;
      this.stats.energy += metaBonuses.bonusEnergy;
      this.coins += metaBonuses.startCoins;
      this.stats.dashCooldown = Math.max(0.4, Number((this.stats.dashCooldown * metaBonuses.cooldownMult).toFixed(2)));
      this.skillCooldownMax = Math.max(1.5, Number((this.skillCooldownMax * metaBonuses.cooldownMult).toFixed(2)));
    }

    const starterWeapon = WEAPONS[this.heroConfig.startWeapon];
    this.weaponSlots = [starterWeapon, starterWeapon.energyCost > 0 ? WEAPONS.pistol : null];

    // Visuals
    this.shadow = scene.add.sprite(x, y + 10, 'shadow').setDepth(9);
    this.sprite = scene.add.sprite(x, y, `${this.texturePrefix}_idle`).setDepth(10);

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

    // Held weapon sprite & muzzle flash (plus hidden offhand copy for Knight Dual-Wield)
    this.weaponSprite = scene.add.sprite(x + 12, y + 3, this.getCurrentWeapon().handTexture).setDepth(12);
    this.offhandWeaponSprite = scene.add
      .sprite(x - 10, y - 3, this.getCurrentWeapon().handTexture)
      .setDepth(11)
      .setVisible(false);
    this.muzzleFlashSprite = scene.add.sprite(x, y, 'muzzle_flash').setDepth(13).setVisible(false);
    this.offhandMuzzleFlashSprite = scene.add.sprite(x, y, 'muzzle_flash').setDepth(13).setVisible(false);

    // Notify initial state
    events.emit('player:hero-selected', {
      skillShortLabelVi: this.heroConfig.skillShortLabelVi,
      accentHex: this.heroConfig.accentHex,
      accentColor: this.heroConfig.accentColor
    });
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
      case 'trap_shield':
        this.stats.maxHp += 1;
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 1);
        break;
      default:
        break;
    }

    this.emitStats();
  }

  public getForgeLevel(weaponId: string): number {
    return this.forgeLevels.get(weaponId) || 0;
  }

  public forgeCurrentWeapon(): number | null {
    const cur = this.getCurrentWeapon();
    const level = this.getForgeLevel(cur.id);
    if (level >= 2) return null;
    const nextLevel = level + 1;
    this.forgeLevels.set(cur.id, nextLevel);
    audio.playPickup();
    this.emitWeaponChange();
    return nextLevel;
  }

  public setEffectsManager(fx: EffectsManager): void {
    this.effects = fx;
  }

  public getMergeMatchForWeapon(candidate: WeaponData): WeaponData | null {
    for (const held of this.weaponSlots) {
      if (!held) continue;
      const mergedId = findMergeResult(held.id, candidate.id);
      if (mergedId && WEAPONS[mergedId]) {
        return held;
      }
    }
    return null;
  }

  public getMergePreview(): { first: WeaponData; second: WeaponData; result: WeaponData } | null {
    const first = this.weaponSlots[0];
    const second = this.weaponSlots[1];
    if (!first || !second) return null;
    const mergedId = findMergeResult(first.id, second.id);
    if (!mergedId) return null;
    const result = WEAPONS[mergedId];
    if (!result) return null;
    return { first, second, result };
  }

  public mergeWeapons(): WeaponData | null {
    const preview = this.getMergePreview();
    if (!preview) return null;
    this.weaponSlots = [preview.result, null];
    this.activeSlotIndex = 0;
    this.emitWeaponChange();
    audio.playMergeSuccess();
    return preview.result;
  }

  public applyDrinkBuff(kind: 'vitality' | 'energy' | 'haste'): string {
    audio.playPickup();
    if (kind === 'vitality') {
      this.stats.maxHp += 2;
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 2);
      this.emitStats();
      return 'Nước Tăng Lực Đỏ (+2 HP tối đa)';
    }
    if (kind === 'energy') {
      this.stats.maxEnergy += 40;
      this.stats.energy = Math.min(this.stats.maxEnergy, this.stats.energy + 40);
      this.skillCooldownMax = Math.max(2.0, Number((this.skillCooldownMax * 0.85).toFixed(2)));
      this.emitStats();
      return 'Soda Năng Lượng (+40 NL, -15% Hồi Chiêu [F])';
    }
    this.stats.speed = Math.round(this.stats.speed * 1.12);
    this.fireRateBonus = Number((this.fireRateBonus * 1.1).toFixed(2));
    return 'Cà Phê Siêu Tốc (+12% Tốc Chạy, +10% Tốc Bắn)';
  }

  public applyFloorHazard(hazard: 'ice' | 'lava' | null, deltaSec: number): boolean {
    this.isOnIce = hazard === 'ice';
    if (hazard === 'lava' && !this.upgrades.has('trap_shield')) {
      this.lavaTickTimer -= deltaSec;
      if (this.lavaTickTimer <= 0) {
        this.lavaTickTimer = 0.85;
        return this.takeDamage({ amount: 1, element: 'fire', isPlayerAttack: false }) !== null;
      }
    } else {
      this.lavaTickTimer = Math.min(this.lavaTickTimer, 0.2);
    }
    return false;
  }

  public prepareForNextFloor(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.shadow.setPosition(x, y + 10);
    this.weaponSprite.setPosition(x + 12, y + 3);
    this.isDashing = false;
    this.dashTimer = 0;
    this.isChargingBow = false;
    this.bowChargeTime = 0;
    this.bowChargeGfx?.clear();
    this.frostSlowTimer = 0;
    this.dualWieldTimer = 0;
    this.offhandWeaponSprite?.setVisible(false);
    this.offhandMuzzleFlashSprite?.setVisible(false);
    this.isOnIce = false;
    this.glideVx = 0;
    this.glideVy = 0;
    this.sprite.clearTint();
    this.stats.armor = this.stats.maxArmor;
    this.stats.energy = Math.min(this.stats.maxEnergy, this.stats.energy + 25);
    this.emitStats();
    this.emitWeaponChange();
    this.emitCoins();
  }

  public applyFrostSlow(duration: number = 1.2): void {
    this.frostSlowTimer = Math.max(this.frostSlowTimer, duration);
    this.sprite.setTint(0x7dd3fc);
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
      currentHp: this.stats.hp,
      armorBroken: res.absorbedByArmor > 0 && this.stats.armor === 0 && this.upgrades.has('shockwave_armor')
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
    if (this.rogueKillWindowTimer > 0) {
      this.rogueKillWindowTimer -= deltaSec;
    }
    if (this.dualWieldTimer > 0) {
      this.dualWieldTimer -= deltaSec;
      if (this.dualWieldTimer <= 0 && this.frostSlowTimer <= 0 && !this.isDead) {
        this.sprite.clearTint();
      }
    }
    if (this.frostSlowTimer > 0) {
      this.frostSlowTimer -= deltaSec;
      if (this.frostSlowTimer <= 0 && !this.isDead) {
        this.sprite.clearTint();
      }
    }
    if (this.reflectShieldTimer > 0) {
      this.reflectShieldTimer -= deltaSec;
      if (!this.reflectShieldGfx) {
        this.reflectShieldGfx = this.scene.add.graphics().setDepth(13);
      }
      this.reflectShieldGfx.clear();
      this.reflectShieldGfx.lineStyle(2.5, 0xfacc15, 0.9);
      this.reflectShieldGfx.fillStyle(0xfacc15, 0.16);
      this.reflectShieldGfx.fillCircle(this.sprite.x, this.sprite.y, 26);
      this.reflectShieldGfx.strokeCircle(this.sprite.x, this.sprite.y, 26);
      if (this.reflectShieldTimer <= 0) {
        this.reflectShieldGfx.clear();
      }
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
      this.useSkill(pointer, pool, wallColliders, doorColliders);
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
      const speedMult = (this.frostSlowTimer > 0 ? 0.65 : 1.0) * (this.isOnIce ? 1.16 : 1.0);
      const targetVx = moveDx * this.stats.speed * speedMult;
      const targetVy = moveDy * this.stats.speed * speedMult;
      if (this.isOnIce) {
        const slideLerp = Math.min(1, deltaSec * 4.5);
        this.glideVx += (targetVx - this.glideVx) * slideLerp;
        this.glideVy += (targetVy - this.glideVy) * slideLerp;
        vx = this.glideVx;
        vy = this.glideVy;
      } else {
        this.glideVx = targetVx;
        this.glideVy = targetVy;
        vx = targetVx;
        vy = targetVy;
      }

      // Animate walk frames
      if (moveLen > 0) {
        this.animTimer += deltaSec;
        if (this.animTimer > 0.15) {
          this.animTimer = 0;
          this.animFrame = (this.animFrame + 1) % 2;
          this.sprite.setTexture(this.animFrame === 0 ? `${this.texturePrefix}_run_1` : `${this.texturePrefix}_run_2`);
        }
      } else {
        this.sprite.setTexture(`${this.texturePrefix}_idle`);
      }
    }

    // Wall collision resolution (step X and step Y independently)
    const pBounds = { width: 18, height: 20 };
    this.ensureUnstuck(pBounds, wallColliders, doorColliders);

    const nextX = this.sprite.x + vx * deltaSec;
    const nextY = this.sprite.y + vy * deltaSec;

    if (!this.checkCollides(nextX, this.sprite.y, pBounds, wallColliders, doorColliders)) {
      this.sprite.x = nextX;
    }
    if (!this.checkCollides(this.sprite.x, nextY, pBounds, wallColliders, doorColliders)) {
      this.sprite.y = nextY;
    }

    // Subtle Soul Knight breathing / walk bounce squash-and-stretch
    this.bobTimer += deltaSec * (moveLen > 0 ? 14 : 5.5);
    const stretch = Math.sin(this.bobTimer) * (moveLen > 0 ? 0.06 : 0.035);
    this.sprite.setScale(1 - stretch * 0.5, 1 + stretch);

    // Update shadow position
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 11);

    // Subtle footstep dust when moving
    if (moveLen > 0 && !this.isDashing) {
      this.dustTimer += deltaSec;
      if (this.dustTimer >= 0.16) {
        this.dustTimer = 0;
        if (this.effects) {
          this.effects.spawnFootstepDust(this.sprite.x, this.sprite.y + 11);
        } else {
          const dust = this.scene.add.rectangle(this.sprite.x, this.sprite.y + 11, 4, 3, 0x64748b, 0.5).setDepth(8);
          this.scene.tweens.add({
            targets: dust,
            y: dust.y - 4,
            alpha: 0,
            duration: 220,
            onComplete: () => dust.destroy()
          });
        }
      }
    }

    // Update 360-degree held weapon(s) & recoil spring
    this.weaponRecoilOffset = Phaser.Math.Linear(this.weaponRecoilOffset, 0, Math.min(1, deltaSec * 18));
    const holdRadius = Math.max(4, 12 - this.weaponRecoilOffset);
    const perpX = -Math.sin(aimAngle);
    const perpY = Math.cos(aimAngle);
    const isDualActive = this.dualWieldTimer > 0;
    const sep = isDualActive ? 7 : 0;

    const wx = this.sprite.x + Math.cos(aimAngle) * holdRadius + perpX * sep;
    const wy = this.sprite.y + 3 + Math.sin(aimAngle) * holdRadius + perpY * sep;
    this.weaponSprite.setPosition(wx, wy);
    this.weaponSprite.setRotation(aimAngle);
    this.weaponSprite.setFlipY(Math.cos(aimAngle) < 0);
    this.weaponSprite.setVisible(this.sprite.visible);
    if (isDualActive) {
      this.weaponSprite.setTint(0xfef08a);
    } else {
      this.weaponSprite.clearTint();
    }

    if (isDualActive) {
      const owx = this.sprite.x + Math.cos(aimAngle) * (holdRadius - 1) - perpX * sep;
      const owy = this.sprite.y + 3 + Math.sin(aimAngle) * (holdRadius - 1) - perpY * sep;
      this.offhandWeaponSprite.setPosition(owx, owy);
      this.offhandWeaponSprite.setRotation(aimAngle);
      this.offhandWeaponSprite.setFlipY(Math.cos(aimAngle) < 0);
      this.offhandWeaponSprite.setTint(0xfdba74);
      this.offhandWeaponSprite.setVisible(this.sprite.visible);
    } else {
      this.offhandWeaponSprite.setVisible(false);
    }

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= deltaSec;
      const mx = this.sprite.x + Math.cos(aimAngle) * (holdRadius + 13) + perpX * sep;
      const my = this.sprite.y + 3 + Math.sin(aimAngle) * (holdRadius + 13) + perpY * sep;
      this.muzzleFlashSprite.setPosition(mx, my);
      if (isDualActive) {
        this.offhandMuzzleFlashSprite.setPosition(
          this.sprite.x + Math.cos(aimAngle) * (holdRadius + 12) - perpX * sep,
          this.sprite.y + 3 + Math.sin(aimAngle) * (holdRadius + 12) - perpY * sep
        );
        this.offhandMuzzleFlashSprite.setRotation(aimAngle);
        this.offhandMuzzleFlashSprite.setVisible(true);
      } else {
        this.offhandMuzzleFlashSprite.setVisible(false);
      }
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashSprite.setVisible(false);
        this.offhandMuzzleFlashSprite.setVisible(false);
      }
    }

    // Update slash sprite timer
    if (this.slashTimer > 0) {
      this.slashTimer -= deltaSec;
      if (this.slashTimer <= 0 && this.slashSprite) {
        this.slashSprite.setVisible(false);
      }
    }

    // Bow charge-and-release or standard continuous fire
    const curWeapon = this.getCurrentWeapon();
    if (curWeapon.category === 'bow') {
      const chargeMax = curWeapon.chargeTime || 0.75;
      if (pointer.isDown && this.shootCooldownRemaining <= 0) {
        this.isChargingBow = true;
        this.bowChargeTime = Math.min(chargeMax, this.bowChargeTime + deltaSec);
        if (!this.bowChargeGfx) {
          this.bowChargeGfx = this.scene.add.graphics().setDepth(14);
        }
        const ratio = this.bowChargeTime / chargeMax;
        this.bowChargeGfx.clear();
        this.bowChargeGfx.lineStyle(2.5, ratio >= 0.85 ? 0xfacc15 : 0x22d3ee, 0.9);
        this.bowChargeGfx.beginPath();
        this.bowChargeGfx.arc(
          this.sprite.x,
          this.sprite.y,
          18,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * ratio,
          false
        );
        this.bowChargeGfx.strokePath();
      } else if (this.isChargingBow && !pointer.isDown) {
        const chargeRatio = Math.max(0.35, Math.min(1, this.bowChargeTime / chargeMax));
        this.isChargingBow = false;
        this.bowChargeTime = 0;
        if (this.bowChargeGfx) this.bowChargeGfx.clear();
        this.fireBowArrow(aimAngle, pool, chargeRatio);
      }
    } else {
      if (this.isChargingBow) {
        this.isChargingBow = false;
        this.bowChargeTime = 0;
        if (this.bowChargeGfx) this.bowChargeGfx.clear();
      }
      if (pointer.isDown && this.shootCooldownRemaining <= 0) {
        this.performAttack(aimAngle, pool, [...wallColliders, ...doorColliders]);
      }
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

  private ensureUnstuck(
    size: { width: number; height: number },
    walls: { x: number; y: number; width: number; height: number }[],
    doors: { x: number; y: number; width: number; height: number }[]
  ): void {
    if (!this.checkCollides(this.sprite.x, this.sprite.y, size, walls, doors)) return;
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [-1, 1], [1, -1], [-1, -1]
    ];
    for (const radius of [4, 8, 14, 22, 32]) {
      for (const [dx, dy] of dirs) {
        const tx = this.sprite.x + dx * radius;
        const ty = this.sprite.y + dy * radius;
        if (!this.checkCollides(tx, ty, size, walls, doors)) {
          this.sprite.x = tx;
          this.sprite.y = ty;
          return;
        }
      }
    }
  }

  private performAttack(
    aimAngle: number,
    pool: ProjectilePool,
    solidColliders: { x: number; y: number; width: number; height: number }[] = []
  ): void {
    const weapon = this.getCurrentWeapon();

    // Check energy cost
    if (weapon.energyCost > 0) {
      if (!DamageCalculator.consumeEnergy(this.stats, weapon.energyCost)) {
        // Can't afford energy, fail silently or fallback to pistol
        return;
      }
      this.emitStats();
    }

    this.shootCooldownRemaining = 1 / (weapon.fireRate * this.fireRateBonus);

    // Critical focus upgrade or Rogue guaranteed crit
    const isCrit = this.guaranteedNextCrit || (this.upgrades.has('critical_focus') && Math.random() < 0.25);
    this.guaranteedNextCrit = false;
    const forgeMult = 1 + this.getForgeLevel(weapon.id) * 0.25;
    const damageMultiplier = (isCrit ? 2.0 : 1.0) * forgeMult;
    const extraPierce = this.upgrades.has('piercing_rounds') ? 1 : 0;
    const extraBounce = this.upgrades.has('ricochet') ? 1 : 0;

    // Continuous Beam Laser attack
    if (weapon.category === 'beam') {
      this.fireLaserBeam(aimAngle, weapon.damage * damageMultiplier, weapon.range, isCrit, solidColliders);
      return;
    }

    // Melee Blade attack
    if (weapon.category === 'melee') {
      const bladeBonus = this.upgrades.has('blade_mastery') ? 3 : 0;
      const arcDegrees = this.upgrades.has('blade_mastery') ? Math.max(170, weapon.spreadAngle) : weapon.spreadAngle;
      const radius = this.upgrades.has('blade_mastery') ? weapon.range * 1.25 : weapon.range;

      audio.playSlash();

      // Show slash visual
      if (this.slashSprite) {
        this.slashSprite.setPosition(
          this.sprite.x + Math.cos(aimAngle) * 24,
          this.sprite.y + Math.sin(aimAngle) * 24
        );
        this.slashSprite.setRotation(aimAngle);
        if (weapon.appliesChill) {
          this.slashSprite.setTint(0x67e8f9);
        } else {
          this.slashSprite.clearTint();
        }
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

      // Emit real melee swing hit check to MainScene
      this.weaponRecoilOffset = -8; // Sword swings forward!
      events.emit('player:melee-swing', {
        x: this.sprite.x,
        y: this.sprite.y,
        angle: aimAngle,
        radius,
        arcDeg: arcDegrees,
        damage: (weapon.damage + bladeBonus) * damageMultiplier,
        isCrit,
        element: weapon.appliesChill ? 'frost' : undefined
      });

      // Frost Greatsword fires 3 piercing/chill ice shards in a forward fan
      if (weapon.id === 'frost_sword') {
        const shardOffsetsDeg = [-14, 0, 14];
        const fireIceFan = (perpOffset: number, dmgScale: number) => {
          const pxOff = -Math.sin(aimAngle) * perpOffset;
          const pyOff = Math.cos(aimAngle) * perpOffset;
          for (const deg of shardOffsetsDeg) {
            const bulletAngle = aimAngle + Phaser.Math.DegToRad(deg);
            pool.spawn({
              x: this.sprite.x + Math.cos(aimAngle) * 20 + pxOff,
              y: this.sprite.y + Math.sin(aimAngle) * 20 + pyOff,
              angleRad: bulletAngle,
              speed: 460,
              damage: Math.max(1, Math.round(5 * damageMultiplier * dmgScale)),
              isPlayer: true,
              isCrit,
              element: 'frost',
              texture: weapon.bulletTexture,
              range: 420,
              pierceCount: 2 + extraPierce,
              bounceCount: extraBounce,
              tint: isCrit ? 0xbae6fd : undefined
            });
          }
        };

        if (this.dualWieldTimer > 0) {
          fireIceFan(-6, 1.0);
          fireIceFan(6, 0.75);
        } else {
          fireIceFan(0, 1.0);
        }
      }

      return;
    }

    // Gun recoil & muzzle flash
    this.weaponRecoilOffset = Math.min(8, weapon.recoil || 3);
    this.muzzleFlashTimer = 0.055;
    this.muzzleFlashSprite.setVisible(true);
    this.muzzleFlashSprite.setRotation(aimAngle);

    // Gun attack
    switch (weapon.id) {
      case 'pistol':
        audio.playShootPistol();
        break;
      case 'shotgun':
        audio.playShootShotgun();
        break;
      case 'repeater':
      case 'inferno_gatling':
        audio.playShootRepeater();
        break;
      case 'penetrator':
        audio.playShootPenetrator();
        break;
      case 'thunder_staff':
        audio.playLightning();
        break;
      default:
        audio.playShootPistol();
        break;
    }

    // Spawn pellets (shotgun_plus grants +2 extra pellets, Knight Dual-Wield fires a parallel twin volley)
    const baseDamage = weapon.damage * damageMultiplier;
    const extraPellets = weapon.pellets > 1 && this.upgrades.has('shotgun_plus') ? 2 : 0;
    const totalPellets = weapon.pellets + extraPellets;
    const spreadRad = Phaser.Math.DegToRad(weapon.spreadAngle);
    const bulletElement: 'fire' | 'frost' | 'lightning' | undefined =
      weapon.appliesBurn || weapon.id === 'staff'
        ? 'fire'
        : weapon.appliesChill
          ? 'frost'
          : weapon.isChainLightning
            ? 'lightning'
            : undefined;

    const fireVolley = (perpOffset: number, dmgScale: number) => {
      const pxOff = -Math.sin(aimAngle) * perpOffset;
      const pyOff = Math.cos(aimAngle) * perpOffset;
      for (let i = 0; i < totalPellets; i++) {
        let angleOffset = 0;
        if (weapon.id === 'inferno_gatling' && totalPellets > 1) {
          angleOffset = (i / (totalPellets - 1) - 0.5) * (spreadRad * 0.45) + (Math.random() - 0.5) * (spreadRad * 0.55);
        } else if (totalPellets > 1) {
          angleOffset = (i / (totalPellets - 1) - 0.5) * spreadRad;
        } else if (weapon.spreadAngle > 0) {
          angleOffset = (Math.random() - 0.5) * spreadRad;
        }

        const bulletAngle = aimAngle + angleOffset;
        const muzzleDist = 18;
        const spawnX = this.sprite.x + Math.cos(aimAngle) * muzzleDist + pxOff;
        const spawnY = this.sprite.y + Math.sin(aimAngle) * muzzleDist + pyOff;

        pool.spawn({
          x: spawnX,
          y: spawnY,
          angleRad: bulletAngle,
          speed: weapon.bulletSpeed,
          damage: Math.max(1, Math.round(baseDamage * dmgScale)),
          isPlayer: true,
          isCrit,
          isHoming: !!weapon.isHoming,
          element: bulletElement,
          texture: weapon.bulletTexture,
          range: weapon.range,
          pierceCount: weapon.pierceCount + extraPierce,
          bounceCount: weapon.bounceCount + extraBounce,
          tint: isCrit ? 0xff0055 : undefined
        });
      }
    };

    if (this.dualWieldTimer > 0) {
      fireVolley(-6, 1.0);
      fireVolley(6, 0.75);
    } else {
      fireVolley(0, 1.0);
    }
  }

  private fireBowArrow(aimAngle: number, pool: ProjectilePool, chargeRatio: number): void {
    const weapon = WEAPONS.bow;
    if (weapon.energyCost > 0) {
      if (!DamageCalculator.consumeEnergy(this.stats, weapon.energyCost)) {
        return;
      }
      this.emitStats();
    }
    this.shootCooldownRemaining = 0.18;
    const isCrit =
      chargeRatio >= 0.85 ||
      this.guaranteedNextCrit ||
      (this.upgrades.has('critical_focus') && Math.random() < 0.25);
    this.guaranteedNextCrit = false;
    const extraPierce = this.upgrades.has('piercing_rounds') ? 1 : 0;
    const forgeMult = 1 + this.getForgeLevel(weapon.id) * 0.25;

    this.weaponRecoilOffset = 5;
    audio.playShootPenetrator();

    pool.spawn({
      x: this.sprite.x + Math.cos(aimAngle) * 18,
      y: this.sprite.y + Math.sin(aimAngle) * 18,
      angleRad: aimAngle,
      speed: weapon.bulletSpeed * (0.65 + 0.45 * chargeRatio),
      damage: Math.max(4, Math.round(weapon.damage * chargeRatio * (isCrit ? 1.5 : 1.0) * forgeMult)),
      isPlayer: true,
      isCrit,
      texture: weapon.bulletTexture,
      range: weapon.range,
      pierceCount: (chargeRatio >= 0.75 ? weapon.pierceCount : 1) + extraPierce,
      bounceCount: this.upgrades.has('ricochet') ? 1 : 0,
      tint: isCrit ? 0xfacc15 : undefined
    });
  }

  private fireLaserBeam(
    aimAngle: number,
    damage: number,
    maxRange: number,
    isCrit: boolean,
    solidColliders: { x: number; y: number; width: number; height: number }[]
  ): void {
    this.weaponRecoilOffset = 2;
    audio.playShootPenetrator();

    const startX = this.sprite.x + Math.cos(aimAngle) * 16;
    const startY = this.sprite.y + Math.sin(aimAngle) * 16;
    let endX = startX + Math.cos(aimAngle) * maxRange;
    let endY = startY + Math.sin(aimAngle) * maxRange;

    // Step raycast against wall/prop colliders in 12px increments
    const cos = Math.cos(aimAngle);
    const sin = Math.sin(aimAngle);
    for (let dist = 12; dist <= maxRange; dist += 12) {
      const rx = startX + cos * dist;
      const ry = startY + sin * dist;
      let hitWall = false;
      for (const w of solidColliders) {
        if (rx >= w.x && rx <= w.x + w.width && ry >= w.y && ry <= w.y + w.height) {
          hitWall = true;
          break;
        }
      }
      if (hitWall) {
        endX = rx;
        endY = ry;
        break;
      }
    }

    const beamGfx = this.scene.add.graphics().setDepth(17);
    beamGfx.lineStyle(isCrit ? 8 : 6, 0xf43f5e, 0.75);
    beamGfx.beginPath();
    beamGfx.moveTo(startX, startY);
    beamGfx.lineTo(endX, endY);
    beamGfx.strokePath();

    beamGfx.lineStyle(2.5, 0xffffff, 1.0);
    beamGfx.beginPath();
    beamGfx.moveTo(startX, startY);
    beamGfx.lineTo(endX, endY);
    beamGfx.strokePath();

    this.scene.tweens.add({
      targets: beamGfx,
      alpha: 0,
      duration: 110,
      onComplete: () => beamGfx.destroy()
    });

    events.emit('player:laser-beam', {
      x1: startX,
      y1: startY,
      x2: endX,
      y2: endY,
      damage,
      isCrit
    });
  }

  public isReflectShieldActive(): boolean {
    return this.reflectShieldTimer > 0;
  }

  public onEnemyKilled(): void {
    if (shouldResetSkillOnKill(this.heroId, this.rogueKillWindowTimer)) {
      this.skillCooldownRemaining = 0;
      this.rogueKillWindowTimer = 0;
      events.emit('player:skill-cooldown', { progress: 1, isReady: true });
    }
    if (this.upgrades.has('vampire_bite') && this.stats.hp < this.stats.maxHp && Math.random() < 0.2) {
      this.heal(1, 0);
    }
  }

  private useSkill(
    pointer: Phaser.Input.Pointer,
    pool: ProjectilePool,
    wallColliders: { x: number; y: number; width: number; height: number }[],
    doorColliders: { x: number; y: number; width: number; height: number }[]
  ): void {
    if (this.heroId === 'rogue') {
      this.useRogueShadowSlash(pointer, wallColliders, doorColliders);
    } else if (this.heroId === 'vanguard') {
      this.useVanguardReflectShield();
    } else if (this.heroId === 'knight') {
      this.useKnightDualWield();
    } else if (this.heroId === 'wizard') {
      this.useWizardFrostStorm(pointer, pool);
    } else if (this.heroId === 'vampire') {
      this.useVampireBatSwarm(pointer, pool);
    } else {
      this.useAlchemicalFlask(pointer, pool);
    }
    this.triggerStatueBlessing(pointer, pool);
  }

  public onVampireBatHit(): void {
    this.stats.energy = Math.min(this.stats.maxEnergy, this.stats.energy + 4);
    if (this.vampireHealCharges > 0 && this.stats.hp < this.stats.maxHp) {
      this.vampireHealCharges--;
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 1);
      events.emit('player:healed', { hpGain: 1, armorGain: 0 });
    }
    this.emitStats();
  }

  public useKnightDualWield(): void {
    this.skillCooldownRemaining = this.skillCooldownMax;
    events.emit('player:skill-cooldown', { progress: 0, isReady: false });
    this.dualWieldTimer = 4.0;
    this.sprite.setTint(0xfdba74);
    audio.playPickup();

    const ring = this.scene.add.circle(this.sprite.x, this.sprite.y, 26, 0xf97316, 0.3).setDepth(13);
    this.scene.tweens.add({ targets: ring, scale: 1.5, alpha: 0, duration: 240, onComplete: () => ring.destroy() });
  }

  public useWizardFrostStorm(pointer: Phaser.Input.Pointer, pool: ProjectilePool): void {
    this.skillCooldownRemaining = this.skillCooldownMax;
    events.emit('player:skill-cooldown', { progress: 0, isReady: false });
    const baseAngle = Math.atan2(pointer.worldY - this.sprite.y, pointer.worldX - this.sprite.x);
    audio.playChainLightning();

    const offsets = [-0.36, -0.18, 0, 0.18, 0.36];
    offsets.forEach((off, idx) => {
      const ang = baseAngle + off;
      pool.spawn({
        x: this.sprite.x + Math.cos(ang) * 18,
        y: this.sprite.y + Math.sin(ang) * 18,
        angleRad: ang,
        speed: 440,
        damage: 5,
        isPlayer: true,
        isCrit: idx === 2,
        element: idx % 2 === 0 ? 'frost' : 'lightning',
        texture: 'bullet_ice_shard',
        range: 460,
        pierceCount: 2
      });
    });
  }

  public useVampireBatSwarm(pointer: Phaser.Input.Pointer, pool: ProjectilePool): void {
    this.skillCooldownRemaining = this.skillCooldownMax;
    events.emit('player:skill-cooldown', { progress: 0, isReady: false });
    this.vampireHealCharges = 1;
    const baseAngle = Math.atan2(pointer.worldY - this.sprite.y, pointer.worldX - this.sprite.x);
    audio.playSlash();

    for (const off of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const ang = baseAngle + off;
      pool.spawn({
        x: this.sprite.x + Math.cos(ang) * 18,
        y: this.sprite.y + Math.sin(ang) * 18,
        angleRad: ang,
        speed: 310,
        damage: 4,
        isPlayer: true,
        isCrit: false,
        isHoming: true,
        element: 'vampire',
        texture: 'bullet_crimson_bat',
        range: 540
      });
    }
  }

  private triggerStatueBlessing(pointer: Phaser.Input.Pointer, pool: ProjectilePool): void {
    if (!this.statueBlessing) return;

    if (this.statueBlessing === 'knight') {
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        pool.spawn({
          x: this.sprite.x + Math.cos(ang) * 14,
          y: this.sprite.y + Math.sin(ang) * 14,
          angleRad: ang,
          speed: 420,
          damage: 6,
          isPlayer: true,
          isCrit: false,
          texture: 'bullet_pistol',
          range: 340,
          tint: 0xfacc15
        });
      }
    } else if (this.statueBlessing === 'sorcerer') {
      const baseAngle = Math.atan2(pointer.worldY - this.sprite.y, pointer.worldX - this.sprite.x);
      for (const offset of [-0.35, 0, 0.35]) {
        pool.spawn({
          x: this.sprite.x + Math.cos(baseAngle + offset) * 14,
          y: this.sprite.y + Math.sin(baseAngle + offset) * 14,
          angleRad: baseAngle + offset,
          speed: 300,
          damage: 8,
          isPlayer: true,
          isCrit: true,
          isHoming: true,
          element: 'fire',
          texture: 'bullet_fireball',
          range: 520
        });
      }
    }
  }

  public useRogueShadowSlash(
    pointer: Phaser.Input.Pointer,
    wallColliders: { x: number; y: number; width: number; height: number }[],
    doorColliders: { x: number; y: number; width: number; height: number }[]
  ): void {
    this.skillCooldownRemaining = this.skillCooldownMax;
    events.emit('player:skill-cooldown', { progress: 0, isReady: false });

    const aimAngle = Math.atan2(pointer.worldY - this.sprite.y, pointer.worldX - this.sprite.x);
    const pBounds = { width: 18, height: 20 };

    this.invulnerableTimer = Math.max(this.invulnerableTimer, 0.4);
    this.guaranteedNextCrit = true;
    this.rogueKillWindowTimer = 0.45;
    audio.playDash();
    audio.playSlash();

    // Dash step up to 112px cleanly without clipping through walls
    for (let step = 0; step < 14; step++) {
      const nx = this.sprite.x + Math.cos(aimAngle) * 8;
      const ny = this.sprite.y + Math.sin(aimAngle) * 8;
      if (step % 3 === 0) this.createDashGhost(0xf43f5e);
      if (!this.checkCollides(nx, this.sprite.y, pBounds, wallColliders, doorColliders)) {
        this.sprite.x = nx;
      }
      if (!this.checkCollides(this.sprite.x, ny, pBounds, wallColliders, doorColliders)) {
        this.sprite.y = ny;
      }
    }

    if (this.slashSprite) {
      this.slashSprite.setPosition(
        this.sprite.x + Math.cos(aimAngle) * 26,
        this.sprite.y + Math.sin(aimAngle) * 26
      );
      this.slashSprite.setRotation(aimAngle);
      this.slashSprite.setVisible(true);
      this.slashTimer = 0.16;
    }

    events.emit('player:melee-swing', {
      x: this.sprite.x,
      y: this.sprite.y,
      angle: aimAngle,
      radius: 64,
      arcDeg: 200,
      damage: 11,
      isCrit: true
    });
  }

  public useVanguardReflectShield(): void {
    this.skillCooldownRemaining = this.skillCooldownMax;
    events.emit('player:skill-cooldown', { progress: 0, isReady: false });
    this.reflectShieldTimer = 3.0;
    audio.playParryBullet();
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

        // Emit explosion event (rebalanced Alchemist flask damage)
        events.emit('combat:explosion', { x: targetX, y: targetY, radius: 80, damage: 14 });
      }
    });
  }

  private createDashGhost(tint: number): void {
    if (this.effects) {
      this.effects.spawnDashAfterimage(
        this.sprite.x,
        this.sprite.y,
        this.sprite.texture.key,
        this.sprite.flipX,
        tint
      );
      return;
    }
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
    const cur = this.getCurrentWeapon();
    const forgeLvl = this.getForgeLevel(cur.id);
    const displayWeapon: WeaponData =
      forgeLvl > 0
        ? {
            ...cur,
            nameVi: `${cur.nameVi} (+${forgeLvl})`,
            damage: Math.round(cur.damage * (1 + forgeLvl * 0.25))
          }
        : cur;
    if (this.weaponSprite) {
      this.weaponSprite.setTexture(cur.handTexture);
    }
    if (this.offhandWeaponSprite) {
      this.offhandWeaponSprite.setTexture(cur.handTexture);
    }
    events.emit('player:weapon-swapped', {
      current: displayWeapon,
      secondary: this.getSecondaryWeapon(),
      activeIndex: this.activeSlotIndex
    });
  }

  public destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    if (this.weaponSprite) this.weaponSprite.destroy();
    if (this.offhandWeaponSprite) this.offhandWeaponSprite.destroy();
    if (this.muzzleFlashSprite) this.muzzleFlashSprite.destroy();
    if (this.offhandMuzzleFlashSprite) this.offhandMuzzleFlashSprite.destroy();
    if (this.slashSprite) this.slashSprite.destroy();
    if (this.reflectShieldGfx) this.reflectShieldGfx.destroy();
    if (this.bowChargeGfx) this.bowChargeGfx.destroy();
  }
}
