import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_LABELS,
  DifficultyMode,
  getFloorEnemyScale
} from '../src/data/difficulty';
import { DungeonGenerator } from '../src/world/DungeonGenerator';

describe('Difficulty scaling & DungeonGenerator badass mode', () => {
  it('scales normal floor difficulty monotonically across floors 1..6', () => {
    const scales = [1, 2, 3, 4, 5, 6].map((f) => getFloorEnemyScale(f, 'normal'));

    expect(scales[0].hpMult).toBeCloseTo(1.15, 5);
    expect(scales[2].hpMult).toBeCloseTo(1.63, 5);
    expect(scales[5].hpMult).toBeCloseTo(2.35, 5);

    expect(scales[0].speedMult).toBeCloseTo(1.0, 5);
    expect(scales[0].attackRateScale).toBeCloseTo(1.05, 5);
    expect(scales[0].extraEliteChance).toBe(0);
    expect(scales[0].gemMultiplier).toBe(1.0);

    for (let i = 1; i < scales.length; i++) {
      expect(scales[i].hpMult).toBeGreaterThan(scales[i - 1].hpMult);
      expect(scales[i].speedMult).toBeGreaterThan(scales[i - 1].speedMult);
      expect(scales[i].attackRateScale).toBeGreaterThan(scales[i - 1].attackRateScale);
    }

    expect(scales[3].bonusDamage).toBe(0);
    expect(scales[4].bonusDamage).toBe(1);
    expect(scales[5].bonusDamage).toBe(1);
  });

  it('applies badass multipliers, bonusDamage, extraEliteChance, and 1.6 gemMultiplier', () => {
    for (let f = 1; f <= 6; f++) {
      const normal = getFloorEnemyScale(f, 'normal');
      const badass = getFloorEnemyScale(f, 'badass');

      expect(badass.hpMult).toBeCloseTo(normal.hpMult * 1.45, 5);
      expect(badass.speedMult).toBeCloseTo(normal.speedMult * 1.12, 5);
      expect(badass.attackRateScale).toBeCloseTo(normal.attackRateScale * 1.28, 5);
      expect(badass.bonusDamage).toBe(normal.bonusDamage + 1);
      expect(badass.extraEliteChance).toBe(0.25);
      expect(badass.gemMultiplier).toBe(1.6);
    }

    const modes: DifficultyMode[] = ['normal', 'badass'];
    for (const mode of modes) {
      expect(DIFFICULTY_LABELS[mode].nameVi.length).toBeGreaterThan(0);
      expect(DIFFICULTY_LABELS[mode].shortVi.length).toBeGreaterThan(0);
      expect(DIFFICULTY_LABELS[mode].descVi.length).toBeGreaterThan(0);
      expect(DIFFICULTY_LABELS[mode].accentHex.startsWith('#')).toBe(true);
      expect(typeof DIFFICULTY_LABELS[mode].accentColor).toBe('number');
    }
  });

  it('spawns richer enemy types (bomber, summoner, turret_mage) and higher wave density in badass mode', () => {
    const seenTypes = new Set<string>();
    let normalEnemyTotal = 0;
    let badassEnemyTotal = 0;
    let badassMultiEliteWaveSeen = false;

    for (const seed of [101, 777, 1337, 2026, 4040, 8888]) {
      for (const floor of [1, 3, 5]) {
        const normalRooms = DungeonGenerator.generateFloor(seed, floor, 'normal');
        const badassRooms = DungeonGenerator.generateFloor(seed, floor, 'badass');

        for (const room of normalRooms) {
          if (room.type === 'combat') {
            normalEnemyTotal +=
              room.enemySpawns.length +
              (room.waves || []).reduce((sum, w) => sum + w.length, 0);
          }
        }

        for (const room of badassRooms) {
          const allWaves = [room.enemySpawns, ...(room.waves || [])];
          for (const wave of allWaves) {
            let elitesInWave = 0;
            for (const sp of wave) {
              seenTypes.add(sp.type);
              if (sp.isElite) elitesInWave++;
            }
            if (room.type === 'combat' && elitesInWave >= 2) {
              badassMultiEliteWaveSeen = true;
            }
          }
          if (room.type === 'combat') {
            badassEnemyTotal += allWaves.reduce((sum, w) => sum + w.length, 0);
          }
        }

        // Sub-floor 1 guardian room (1-1, 2-1, 3-1) includes turret_mage or summoner in wave 2
        const guardianRoom = badassRooms.find((r) => r.type === 'boss')!;
        const wave2Types = (guardianRoom.waves?.[0] || []).map((e) => e.type);
        expect(
          wave2Types.includes('turret_mage') || wave2Types.includes('summoner')
        ).toBe(true);
      }
    }

    expect(seenTypes.has('bomber')).toBe(true);
    expect(seenTypes.has('summoner')).toBe(true);
    expect(seenTypes.has('turret_mage')).toBe(true);
    expect(badassEnemyTotal).toBeGreaterThan(normalEnemyTotal);
    expect(badassMultiEliteWaveSeen).toBe(true);
  });
});
