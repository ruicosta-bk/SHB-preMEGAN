import { WeaponId } from '../types/weapon';

export type HeroId = 'alchemist' | 'rogue' | 'vanguard' | 'knight' | 'wizard' | 'vampire';

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
  skillShortLabelVi: string;
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
    skillShortLabelVi: 'BÌNH HỎA',
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
    skillCooldown: 4.5,
    startWeapon: 'blade',
    texturePrefix: 'hero_rogue',
    accentColor: 0xf43f5e,
    accentHex: '#f43f5e',
    skillNameVi: 'Ảnh Trảm Đoạt Mệnh',
    skillShortLabelVi: 'ẢNH TRẢM',
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
    skillShortLabelVi: 'KHIÊN PHẢN',
    skillDescVi: 'Bật khiên 3 giây chặn & phản ngược đạn địch thành đạn vàng'
  },
  knight: {
    id: 'knight',
    nameVi: 'Hiệp Sĩ Song Kích',
    roleVi: 'Cường Công Hỏa Lực',
    hp: 7,
    armor: 6,
    maxEnergy: 200,
    speed: 210,
    dashCooldown: 1.4,
    skillCooldown: 7.5,
    startWeapon: 'pistol',
    texturePrefix: 'hero_knight',
    accentColor: 0xf97316,
    accentHex: '#f97316',
    skillNameVi: 'Song Kích Hỏa Lực',
    skillShortLabelVi: 'SONG KÍCH',
    skillDescVi: 'Khai hỏa song song 2 vũ khí trong 4 giây với sát thương bùng nổ'
  },
  wizard: {
    id: 'wizard',
    nameVi: 'Pháp Sư Nguyên Tố',
    roleVi: 'Khống Chế Băng Sét',
    hp: 5,
    armor: 6,
    maxEnergy: 240,
    speed: 205,
    dashCooldown: 1.5,
    skillCooldown: 6.5,
    startWeapon: 'staff',
    texturePrefix: 'hero_wizard',
    accentColor: 0xa855f7,
    accentHex: '#a855f7',
    skillNameVi: 'Bão Băng Sét',
    skillShortLabelVi: 'BÃO BĂNG',
    skillDescVi: 'Phóng 5 gai băng xuyên thấu làm chậm địch và giật sét lan tỏa'
  },
  vampire: {
    id: 'vampire',
    nameVi: 'Ma Cà Rồng',
    roleVi: 'Hút Máu Bền Bỉ',
    hp: 5,
    armor: 5,
    maxEnergy: 190,
    speed: 215,
    dashCooldown: 1.4,
    skillCooldown: 7.5,
    startWeapon: 'repeater',
    texturePrefix: 'hero_vampire',
    accentColor: 0xdc2626,
    accentHex: '#dc2626',
    skillNameVi: 'Đàn Dơi Hút Máu',
    skillShortLabelVi: 'ĐÀN DƠI',
    skillDescVi: 'Triệu hồi 5 dơi huyết tộc tự đuổi đánh & hút Máu, Năng Lượng'
  }
};

export const HERO_LIST: HeroConfig[] = [
  HEROES.alchemist,
  HEROES.rogue,
  HEROES.vanguard,
  HEROES.knight,
  HEROES.wizard,
  HEROES.vampire
];

/**
 * Pure helper determining whether Rogue's kill-reset window refreshes [F] skill cooldown.
 */
export function shouldResetSkillOnKill(heroId: HeroId, killWindowRemaining: number): boolean {
  return heroId === 'rogue' && killWindowRemaining > 0;
}
