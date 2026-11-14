export type ElementType = 'physical' | 'fire' | 'lightning' | 'frost';

export interface Stats {
  maxHp: number;
  hp: number;
  maxArmor: number;
  armor: number;
  maxEnergy: number;
  energy: number;
  speed: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
}

export interface DamageInfo {
  amount: number;
  isCrit?: boolean;
  element?: ElementType;
  knockback?: {
    x: number;
    y: number;
    force: number;
  };
  sourceId?: string;
  isPlayerAttack: boolean;
}

export interface DamageResult {
  actualDamage: number;
  absorbedByArmor: number;
  hpDamage: number;
  isDead: boolean;
  overkill: number;
}

export interface StatusEffect {
  type: 'burn' | 'freeze' | 'shock';
  duration: number; // remaining duration in seconds
  tickTimer: number; // timer for periodic damage
  tickInterval: number;
  damagePerTick: number;
  slowPercent?: number;
}

export interface SkillState {
  nameVi: string;
  cooldownMax: number;
  cooldownRemaining: number;
  isReady: boolean;
  icon: string;
}
