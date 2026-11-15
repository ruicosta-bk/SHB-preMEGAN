import { WeaponCoreData, WeaponCoreId } from '../types/weapon';

export const WEAPON_CORE_IDS: WeaponCoreId[] = ['fire', 'frost', 'poison', 'lightning'];

export const WEAPON_CORES: Record<WeaponCoreId, WeaponCoreData> = {
  fire: {
    id: 'fire',
    nameVi: 'Lõi Hỏa Diễm',
    shortLabelVi: 'HỎA',
    element: 'fire',
    bonusDamage: 2,
    colorNum: 0xf97316,
    colorHex: '#f97316',
    descVi: '+2 sát thương và thiêu đốt kẻ địch theo thời gian.'
  },
  frost: {
    id: 'frost',
    nameVi: 'Lõi Hàn Băng',
    shortLabelVi: 'BĂNG',
    element: 'frost',
    bonusDamage: 1,
    colorNum: 0x38bdf8,
    colorHex: '#38bdf8',
    descVi: '+1 sát thương và làm chậm, đóng băng mục tiêu.'
  },
  poison: {
    id: 'poison',
    nameVi: 'Lõi Độc Tố',
    shortLabelVi: 'ĐỘC',
    element: 'poison',
    bonusDamage: 1,
    colorNum: 0x22c55e,
    colorHex: '#22c55e',
    descVi: '+1 sát thương và gây trúng độc rút máu liên tục.'
  },
  lightning: {
    id: 'lightning',
    nameVi: 'Lõi Lôi Điện',
    shortLabelVi: 'LÔI',
    element: 'lightning',
    bonusDamage: 2,
    colorNum: 0xfacc15,
    colorHex: '#facc15',
    descVi: '+2 sát thương và phóng sét lan sang kẻ địch lân cận.'
  }
};

export function getWeaponCore(id: WeaponCoreId): WeaponCoreData;
export function getWeaponCore(id: WeaponCoreId | null | undefined): WeaponCoreData | null;
export function getWeaponCore(id: WeaponCoreId | null | undefined): WeaponCoreData | null {
  if (!id) return null;
  return WEAPON_CORES[id] ?? null;
}

export function pickRandomWeaponCore(rng: () => number = Math.random): WeaponCoreData {
  const idx = Math.min(WEAPON_CORE_IDS.length - 1, Math.max(0, Math.floor(rng() * WEAPON_CORE_IDS.length)));
  return WEAPON_CORES[WEAPON_CORE_IDS[idx]];
}
