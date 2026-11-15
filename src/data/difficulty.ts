export type DifficultyMode = 'normal' | 'badass';

export interface DifficultyEnemyScale {
  hpMult: number;
  speedMult: number;
  attackRateScale: number;
  bonusDamage: number;
  extraEliteChance: number;
  gemMultiplier: number;
}

export const DIFFICULTY_LABELS: Record<
  DifficultyMode,
  { nameVi: string; shortVi: string; descVi: string; accentHex: string; accentColor: number }
> = {
  normal: {
    nameVi: 'Chế Độ Thường',
    shortVi: 'THƯỜNG',
    descVi: 'Cân bằng chuẩn, sức mạnh quái tăng dần theo từng tầng.',
    accentHex: '#38bdf8',
    accentColor: 0x38bdf8
  },
  badass: {
    nameVi: 'Chế Độ Ác Mộng',
    shortVi: 'ÁC MỘNG',
    descVi: 'Quái trâu hơn, bắn nhanh hơn, nhiều Tinh Anh & +60% Ngọc Hồn.',
    accentHex: '#ef4444',
    accentColor: 0xef4444
  }
};

export function getFloorEnemyScale(
  floorNumber: number,
  mode: DifficultyMode = 'normal'
): DifficultyEnemyScale {
  const f = Math.max(1, Math.floor(floorNumber || 1));

  let hpMult = 1.15 + (f - 1) * 0.24;
  let speedMult = 1.0 + (f - 1) * 0.035;
  let attackRateScale = 1.05 + (f - 1) * 0.06;
  let bonusDamage = f >= 5 ? 1 : 0;
  let extraEliteChance = 0;
  let gemMultiplier = 1.0;

  if (mode === 'badass') {
    hpMult *= 1.45;
    speedMult *= 1.12;
    attackRateScale *= 1.28;
    bonusDamage += 1;
    extraEliteChance = 0.25;
    gemMultiplier = 1.6;
  }

  return {
    hpMult,
    speedMult,
    attackRateScale,
    bonusDamage,
    extraEliteChance,
    gemMultiplier
  };
}
