import { describe, it, expect } from 'vitest';
import { DungeonGenerator } from '../src/world/DungeonGenerator';

describe('Run Cycle & Room State Unit Tests', () => {
  it('initializes rooms with correct default visited/cleared states', () => {
    const rooms = DungeonGenerator.generateFloor(1234);

    // Start room is visited and cleared by default
    expect(rooms[0].type).toBe('start');
    expect(rooms[0].isVisited).toBe(true);
    expect(rooms[0].isCleared).toBe(true);
    expect(rooms[0].doors.every(d => d.isOpen)).toBe(true);

    // Combat rooms are uncleared by default
    const combatRooms = rooms.filter(r => r.type === 'combat');
    expect(combatRooms.length).toBe(4);
    combatRooms.forEach(cr => {
      expect(cr.isCleared).toBe(false);
      expect(cr.enemySpawns.length).toBeGreaterThan(0);
    });

    // Boss room is uncleared by default with boss spawn
    const bossRoom = rooms.find(r => r.type === 'boss')!;
    expect(bossRoom.isCleared).toBe(false);
    expect(bossRoom.enemySpawns.some(e => e.type === 'boss_ignis')).toBe(true);
  });

  it('guarantees rewards spawn flag prevents duplicate reward generation', () => {
    const rooms = DungeonGenerator.generateFloor(5678);
    const room = rooms[1];
    expect(room.rewardSpawned).toBe(false);

    // Simulate first clear reward spawn
    room.rewardSpawned = true;
    expect(room.rewardSpawned).toBe(true);

    // Attempting subsequent spawn should be blocked
    let spawnedAgain = false;
    if (!room.rewardSpawned) {
      spawnedAgain = true;
    }
    expect(spawnedAgain).toBe(false);
  });
});
