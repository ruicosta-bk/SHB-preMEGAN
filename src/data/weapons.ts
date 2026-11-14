import { WeaponData, WeaponId } from '../types/weapon';

export const WEAPONS: Record<WeaponId, WeaponData> = {
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    nameVi: 'Súng Lục Đồng Cổ',
    category: 'gun',
    damage: 3,
    energyCost: 0,
    fireRate: 3.5, // 3.5 rps
    bulletSpeed: 520,
    spreadAngle: 2,
    pellets: 1,
    range: 650,
    pierceCount: 0,
    bounceCount: 0,
    bulletRadius: 4,
    bulletColor: 0x38bdf8, // light cyan
    bulletTexture: 'bullet_pistol',
    iconTexture: 'icon_pistol',
    recoil: 3,
    screenShake: 1,
    descriptionVi: 'Bắn đơn chính xác, không tốn năng lượng. Luôn sẵn sàng trong tay.'
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    nameVi: 'Hỏa Pháo Tán Xạ',
    category: 'gun',
    damage: 3, // 3 x 5 = 15 max up close
    energyCost: 3,
    fireRate: 1.4,
    bulletSpeed: 440,
    spreadAngle: 26,
    pellets: 5,
    range: 340,
    pierceCount: 0,
    bounceCount: 0,
    bulletRadius: 3.5,
    bulletColor: 0xfb923c, // amber/orange
    bulletTexture: 'bullet_shotgun',
    iconTexture: 'icon_shotgun',
    recoil: 7,
    screenShake: 4,
    descriptionVi: 'Tung chùm đạn 5 mảnh uy lực cực lớn ở cự ly gần.'
  },
  repeater: {
    id: 'repeater',
    name: 'Repeater',
    nameVi: 'Liên Thanh Tinh Thể',
    category: 'gun',
    damage: 2,
    energyCost: 1,
    fireRate: 8.5,
    bulletSpeed: 560,
    spreadAngle: 9,
    pellets: 1,
    range: 550,
    pierceCount: 0,
    bounceCount: 0,
    bulletRadius: 3,
    bulletColor: 0x4ade80, // emerald green
    bulletTexture: 'bullet_repeater',
    iconTexture: 'icon_repeater',
    recoil: 2.5,
    screenShake: 1.5,
    descriptionVi: 'Tốc độ xả đạn cực nhanh, áp đảo đối phương nhưng hao hụt năng lượng.'
  },
  penetrator: {
    id: 'penetrator',
    name: 'Penetrator',
    nameVi: 'Lôi Kích Xuyên Giáp',
    category: 'gun',
    damage: 9,
    energyCost: 4,
    fireRate: 1.1,
    bulletSpeed: 680,
    spreadAngle: 0,
    pellets: 1,
    range: 750,
    pierceCount: 3, // Pierces up to 3 enemies
    bounceCount: 0,
    bulletRadius: 5,
    bulletColor: 0xc084fc, // purple plasma
    bulletTexture: 'bullet_penetrator',
    iconTexture: 'icon_penetrator',
    recoil: 9,
    screenShake: 5,
    descriptionVi: 'Chùm năng lượng tầm xa cực mạnh, xuyên qua nhiều kẻ thù liên tiếp.'
  },
  blade: {
    id: 'blade',
    name: 'Blade',
    nameVi: 'Hư Không Đoản Kiếm',
    category: 'melee',
    damage: 8,
    energyCost: 0,
    fireRate: 2.2,
    bulletSpeed: 0,
    spreadAngle: 120, // 120 degrees sweep
    pellets: 1,
    range: 65, // melee radius
    pierceCount: 999,
    bounceCount: 0,
    bulletRadius: 0,
    bulletColor: 0xf1f5f9,
    bulletTexture: 'slash_arc',
    iconTexture: 'icon_blade',
    recoil: 2,
    screenShake: 2,
    descriptionVi: 'Chém quét hình cung, gây sát thương, đẩy lùi và phá hủy đạn địch trong tầm.'
  }
};
