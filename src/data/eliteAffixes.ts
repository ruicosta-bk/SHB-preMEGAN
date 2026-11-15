export type EliteAffixId = 'armored' | 'volatile' | 'regen' | 'haste';

export interface EliteAffixMeta {
  id: EliteAffixId;
  labelVi: string;
  shortVi: string;
  colorNum: number;
  colorHex: string;
  speedMult: number;
  attackRateMult: number;
  damageTakenMult: number;
}

export const ELITE_AFFIX_IDS: EliteAffixId[] = ['armored', 'volatile', 'regen', 'haste'];

export const ELITE_AFFIXES: Record<EliteAffixId, EliteAffixMeta> = {
  armored: {
    id: 'armored',
    labelVi: 'Giáp Sắt',
    shortVi: 'GIÁP',
    colorNum: 0x94a3b8,
    colorHex: '#94a3b8',
    speedMult: 0.92,
    attackRateMult: 1.0,
    damageTakenMult: 0.72
  },
  volatile: {
    id: 'volatile',
    labelVi: 'Bùng Nổ',
    shortVi: 'NỔ',
    colorNum: 0xf97316,
    colorHex: '#f97316',
    speedMult: 1.05,
    attackRateMult: 1.08,
    damageTakenMult: 1.0
  },
  regen: {
    id: 'regen',
    labelVi: 'Tái Tạo',
    shortVi: 'HỒI',
    colorNum: 0x22c55e,
    colorHex: '#22c55e',
    speedMult: 1.0,
    attackRateMult: 1.0,
    damageTakenMult: 1.0
  },
  haste: {
    id: 'haste',
    labelVi: 'Cuồng Tốc',
    shortVi: 'TỐC',
    colorNum: 0xfacc15,
    colorHex: '#facc15',
    speedMult: 1.28,
    attackRateMult: 1.32,
    damageTakenMult: 1.0
  }
};

export function pickRandomEliteAffix(rng: () => number = Math.random): EliteAffixMeta {
  const idx = Math.min(ELITE_AFFIX_IDS.length - 1, Math.max(0, Math.floor(rng() * ELITE_AFFIX_IDS.length)));
  return ELITE_AFFIXES[ELITE_AFFIX_IDS[idx]];
}
