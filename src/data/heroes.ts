import { WeaponId } from '../types/weapon';

export type HeroId = 'alchemist' | 'rogue' | 'vanguard';

export interface HeroConfig {
  id: HeroId;
  nameVi: string;
  roleVi: string;
  hp: number;
  armor: number;
  maxEnergy: number;
  speed: number;
  dashCooldown: number;
  skillCooldown: number;
  startWeapon: WeaponId;
  texturePrefix: string;
  accentColor: number;
  accentHex: string;
  skillNameVi: string;
  skillDescVi: string;
}

export const HEROES: Record<HeroId, HeroConfig> = {
  alchemist: {
    id: 'alchemist',
    nameVi: 'Nhà Giả Kim',
    roleVi: 'Kiểm Soát Diện Rộng',
    hp: 6,
    armor: 5,
    maxEnergy: 180,
    speed: 210,
    dashCooldown: 1.5,
    skillCooldown: 6.0,
    startWeapon: 'pistol',
    texturePrefix: 'hero_alchemist',
    accentColor: 0x38bdf8,
    accentHex: '#38bdf8',
    skillNameVi: 'Bình Hỏa Giả Kim',
    skillDescVi: 'Ném bình thuốc nổ 80px, xóa đạn địch & thiêu đốt quái vật'
  },
  rogue: {
    id: 'rogue',
    nameVi: 'Thích Khách Bóng Đêm',
    roleVi: 'Sát Thủ Chí Mạng',
    hp: 5,
    armor: 4,
    maxEnergy: 200,
    speed: 235,
    dashCooldown: 1.1,
    skillCooldown: 4.0,
    startWeapon: 'blade',
    texturePrefix: 'hero_rogue',
    accentColor: 0xf43f5e,
    accentHex: '#f43f5e',
    skillNameVi: 'Ảnh Trảm Đoạt Mệnh',
    skillDescVi: 'Lướt chém bất tử, đòn kế 100% Chí Mạng; hạ địch hồi chiêu ngay'
  },
  vanguard: {
    id: 'vanguard',
    nameVi: 'Hộ Vệ Thiết Giáp',
    roleVi: 'Đỡ Đòn Phản Công',
    hp: 7,
    armor: 7,
    maxEnergy: 160,
    speed: 195,
    dashCooldown: 1.7,
    skillCooldown: 7.0,
    startWeapon: 'shotgun',
    texturePrefix: 'hero_vanguard',
    accentColor: 0xfacc15,
    accentHex: '#facc15',
    skillNameVi: 'Khiên Phản Xạ',
    skillDescVi: 'Bật khiên 3 giây chặn & phản ngược đạn địch thành đạn vàng'
  }
};

export const HERO_LIST: HeroConfig[] = [
  HEROES.alchemist,
  HEROES.rogue,
  HEROES.vanguard
];

/**
 * Pure helper determining whether Rogue's kill-reset window refreshes [F] skill cooldown.
 */
export function shouldResetSkillOnKill(heroId: HeroId, killWindowRemaining: number): boolean {
  return heroId === 'rogue' && killWindowRemaining > 0;
}
