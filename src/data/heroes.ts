import { WeaponId } from '../types/weapon';

export type HeroId =
  | 'alchemist'
  | 'rogue'
  | 'vanguard'
  | 'knight'
  | 'wizard'
  | 'vampire'
  | 'engineer'
  | 'berserker';

export type SkillVariant = 1 | 2;

export interface HeroSkillMeta {
  nameVi: string;
  shortLabelVi: string;
  descVi: string;
  cooldown: number;
}

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
  skill2NameVi: string;
  skill2ShortLabelVi: string;
  skill2DescVi: string;
  skill2Cooldown: number;
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
    skillDescVi: 'Ném bình thuốc nổ 80px, xóa đạn địch & thiêu đốt quái vật',
    skill2NameVi: 'Bình Độc Băng',
    skill2ShortLabelVi: 'ĐỘC BĂNG',
    skill2Cooldown: 6.5,
    skill2DescVi: 'Ném bình độc-băng 95px làm chậm 45% & rút máu liên tục'
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
    skillDescVi: 'Lướt chém bất tử, đòn kế 100% Chí Mạng; hạ địch hồi chiêu ngay',
    skill2NameVi: 'Ảnh Bộ Xuyên Không',
    skill2ShortLabelVi: 'ẢNH BỘ',
    skill2Cooldown: 4.0,
    skill2DescVi: 'Dịch chuyển tức thời tới hướng di chuyển, xóa sạch đạn quanh điểm đến'
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
    skillDescVi: 'Bật khiên 3 giây chặn & phản ngược đạn địch thành đạn vàng',
    skill2NameVi: 'Chấn Địa Hộ Thân',
    skill2ShortLabelVi: 'CHẤN ĐỊA',
    skill2Cooldown: 7.5,
    skill2DescVi: 'Dậm đất gây choáng 90px đẩy lùi địch & hồi ngay +2 Giáp'
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
    skillDescVi: 'Khai hỏa song song 2 vũ khí trong 4 giây với sát thương bùng nổ',
    skill2NameVi: 'Cuồng Xạ Vô Tận',
    skill2ShortLabelVi: 'CUỒNG XẠ',
    skill2Cooldown: 8.0,
    skill2DescVi: 'Trong 3.5 giây: tốc độ bắn +70% và miễn phí toàn bộ Năng Lượng'
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
    skillDescVi: 'Phóng 5 gai băng xuyên thấu làm chậm địch và giật sét lan tỏa',
    skill2NameVi: 'Hỏa Hoàn Hộ Thể',
    skill2ShortLabelVi: 'HỎA HOÀN',
    skill2Cooldown: 7.0,
    skill2DescVi: 'Triệu hồi 4 cầu lửa xoay quanh người 4.5s thiêu đốt & chắn đạn'
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
    skillDescVi: 'Triệu hồi 5 dơi huyết tộc tự đuổi đánh & hút Máu, Năng Lượng',
    skill2NameVi: 'Hắc Ám Hấp Tinh',
    skill2ShortLabelVi: 'HẤP TINH',
    skill2Cooldown: 7.0,
    skill2DescVi: 'Tạo xoáy trọng lực kéo quái vào tâm, hút HP & hồi +30 Năng Lượng'
  },
  engineer: {
    id: 'engineer',
    nameVi: 'Kỹ Sư Cơ Khí',
    roleVi: 'Triệu Hồi Tháp Pháo',
    hp: 6,
    armor: 6,
    maxEnergy: 200,
    speed: 205,
    dashCooldown: 1.5,
    skillCooldown: 9.0,
    startWeapon: 'repeater',
    texturePrefix: 'hero_engineer',
    accentColor: 0x14b8a6,
    accentHex: '#14b8a6',
    skillNameVi: 'Pháo Đài Tự Động',
    skillShortLabelVi: 'PHÁO ĐÀI',
    skillDescVi: 'Triệu hồi tháp pháo tự động bắn laser vào quái trong 8.5 giây',
    skill2NameVi: 'Tên Lửa Truy Kích',
    skill2ShortLabelVi: 'TÊN LỬA',
    skill2Cooldown: 6.5,
    skill2DescVi: 'Phóng 4 tên lửa tầm nhiệt tự bám đuổi gây nổ lan 50px'
  },
  berserker: {
    id: 'berserker',
    nameVi: 'Cuồng Chiến Binh',
    roleVi: 'Xung Kích Điên Cuồng',
    hp: 8,
    armor: 4,
    maxEnergy: 170,
    speed: 220,
    dashCooldown: 1.3,
    skillCooldown: 7.0,
    startWeapon: 'shotgun',
    texturePrefix: 'hero_berserker',
    accentColor: 0xe11d48,
    accentHex: '#e11d48',
    skillNameVi: 'Cuồng Nộ Liên Kích',
    skillShortLabelVi: 'CUỒNG NỘ',
    skillDescVi: 'Trong 3.5 giây: tốc độ bắn +75% & bắn đạn to chí mạng',
    skill2NameVi: 'Nhảy Búa Chấn Động',
    skill2ShortLabelVi: 'ĐẬP ĐẤT',
    skill2Cooldown: 5.5,
    skill2DescVi: 'Lao về phía chuột giáng đòn nổ 95px phá sạch đạn địch'
  }
};

export const HERO_LIST: HeroConfig[] = [
  HEROES.alchemist,
  HEROES.rogue,
  HEROES.vanguard,
  HEROES.knight,
  HEROES.wizard,
  HEROES.vampire,
  HEROES.engineer,
  HEROES.berserker
];

/**
 * Return localized skill metadata and cooldown for a hero's selected skill variant (1 or 2).
 */
export function getHeroSkillMeta(heroId: HeroId, variant: SkillVariant): HeroSkillMeta {
  const hero = HEROES[heroId];
  if (variant === 2) {
    return {
      nameVi: hero.skill2NameVi,
      shortLabelVi: hero.skill2ShortLabelVi,
      descVi: hero.skill2DescVi,
      cooldown: hero.skill2Cooldown
    };
  }
  return {
    nameVi: hero.skillNameVi,
    shortLabelVi: hero.skillShortLabelVi,
    descVi: hero.skillDescVi,
    cooldown: hero.skillCooldown
  };
}

/**
 * Pure helper determining whether Rogue's kill-reset window refreshes [F] skill cooldown.
 */
export function shouldResetSkillOnKill(heroId: HeroId, killWindowRemaining: number): boolean {
  return heroId === 'rogue' && killWindowRemaining > 0;
}
