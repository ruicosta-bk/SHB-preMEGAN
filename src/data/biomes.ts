export type BiomeId = 'stone_crypt' | 'frost_cavern' | 'molten_core';

export interface FloorMeta {
  floorNumber: number;
  stage: number;
  subFloor: number;
  code: string;
  biomeId: BiomeId;
  biomeNameVi: string;
  bossTitleVi: string;
  accentColor: number;
  accentHex: string;
  floorTex: string;
  floorAltTex: string;
  wallTex: string;
  pillarTex: string;
  isBossFloor: boolean;
}

export const TOTAL_FLOORS = 6;

const BIOME_CONFIGS: Record<
  BiomeId,
  {
    nameVi: string;
    bossTitleVi: string;
    accentColor: number;
    accentHex: string;
    floorTex: string;
    floorAltTex: string;
    wallTex: string;
    pillarTex: string;
  }
> = {
  stone_crypt: {
    nameVi: 'Hầm Mộ Đá Cổ',
    bossTitleVi: 'Ignis Hộ Vệ Đá Cổ',
    accentColor: 0x38bdf8,
    accentHex: '#38bdf8',
    floorTex: 'floor_tile',
    floorAltTex: 'floor_tile_2',
    wallTex: 'wall_tile',
    pillarTex: 'pillar_tile'
  },
  frost_cavern: {
    nameVi: 'Lăng Mộ Băng Giá',
    bossTitleVi: 'Ignis Ấn Băng Cổ Ngữ',
    accentColor: 0x22d3ee,
    accentHex: '#22d3ee',
    floorTex: 'frost_floor_tile',
    floorAltTex: 'frost_floor_2',
    wallTex: 'frost_wall_tile',
    pillarTex: 'frost_pillar_tile'
  },
  molten_core: {
    nameVi: 'Lõi Dung Nham',
    bossTitleVi: 'Ignis Ignifer - Chúa Tể Dung Nham',
    accentColor: 0xf97316,
    accentHex: '#f97316',
    floorTex: 'lava_floor_tile',
    floorAltTex: 'lava_floor_2',
    wallTex: 'lava_wall_tile',
    pillarTex: 'lava_pillar_tile'
  }
};

export function getFloorMeta(floorNumber: number): FloorMeta {
  const clamped = Math.max(1, Math.min(TOTAL_FLOORS, Math.floor(floorNumber || 1)));
  const stage = Math.ceil(clamped / 2);
  const subFloor = ((clamped - 1) % 2) + 1;
  const biomeId: BiomeId =
    stage === 1 ? 'stone_crypt' : stage === 2 ? 'frost_cavern' : 'molten_core';
  const cfg = BIOME_CONFIGS[biomeId];

  return {
    floorNumber: clamped,
    stage,
    subFloor,
    code: `${stage}-${subFloor}`,
    biomeId,
    biomeNameVi: cfg.nameVi,
    bossTitleVi: cfg.bossTitleVi,
    accentColor: cfg.accentColor,
    accentHex: cfg.accentHex,
    floorTex: cfg.floorTex,
    floorAltTex: cfg.floorAltTex,
    wallTex: cfg.wallTex,
    pillarTex: cfg.pillarTex,
    isBossFloor: subFloor === 2
  };
}
