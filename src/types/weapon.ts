export type WeaponId =
  | 'pistol'
  | 'shotgun'
  | 'repeater'
  | 'penetrator'
  | 'blade'
  | 'longsword'
  | 'bow'
  | 'laser'
  | 'staff'
  | 'frost_sword'
  | 'thunder_staff'
  | 'inferno_gatling'
  | 'solar_laser'
  | 'boomerang_blade'
  | 'glacial_cannon';

export type WeaponCategory = 'gun' | 'melee' | 'bow' | 'beam';

export interface WeaponData {
  id: WeaponId;
  name: string;
  nameVi: string;
  category: WeaponCategory;
  damage: number;
  energyCost: number;
  fireRate: number; // shots per second
  bulletSpeed: number;
  spreadAngle: number; // degrees
  pellets: number;
  range: number;
  pierceCount: number;
  bounceCount: number;
  bulletRadius: number;
  bulletColor: number;
  bulletTexture: string;
  iconTexture: string;
  handTexture: string;
  recoil: number;
  screenShake: number;
  chargeTime?: number; // for charge bows (seconds)
  isHoming?: boolean;
  tier?: 1 | 2;
  isChainLightning?: boolean;
  appliesChill?: boolean;
  appliesBurn?: boolean;
  isBoomerang?: boolean;
  isFrostNova?: boolean;
  descriptionVi: string;
}

export type WeaponCoreId = 'fire' | 'frost' | 'poison' | 'lightning';

export interface WeaponCoreData {
  id: WeaponCoreId;
  nameVi: string;
  shortLabelVi: string;
  element: 'fire' | 'frost' | 'poison' | 'lightning';
  bonusDamage: number;
  colorNum: number;
  colorHex: string;
  descVi: string;
}
