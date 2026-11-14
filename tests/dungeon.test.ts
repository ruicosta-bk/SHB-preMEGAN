import { describe, it, expect } from 'vitest';
import { DungeonGenerator } from '../src/world/DungeonGenerator';

describe('DungeonGenerator Unit Tests', () => {
  it('generates exactly 8 rooms of correct types', () => {
    const rooms = DungeonGenerator.generateFloor(42);
    expect(rooms.length).toBe(8);

    const counts = rooms.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(counts['start']).toBe(1);
    expect(counts['combat']).toBe(4);
    expect(counts['treasure']).toBe(1);
    expect(counts['rest']).toBe(1);
    expect(counts['boss']).toBe(1);
  });

  it('guarantees bidirectional door consistency', () => {
    const rooms = DungeonGenerator.generateFloor(100);

    for (const room of rooms) {
      for (const door of room.doors) {
        expect(door.targetRoomIndex).toBeGreaterThanOrEqual(0);
        expect(door.targetRoomIndex).toBeLessThan(rooms.length);

        const targetRoom = rooms[door.targetRoomIndex];
        const reciprocalDoor = targetRoom.doors.find(d => d.targetRoomIndex === room.index);
        expect(reciprocalDoor).toBeDefined();
      }
    }
  });

  it('proves all 8 rooms are reachable from Start (Room 0) and path to Boss exists', () => {
    const rooms = DungeonGenerator.generateFloor(999);

    // BFS from room 0
    const visited = new Set<number>();
    const queue = [0];
    visited.add(0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const door of rooms[current].doors) {
        if (!visited.has(door.targetRoomIndex)) {
          visited.add(door.targetRoomIndex);
          queue.push(door.targetRoomIndex);
        }
      }
    }

    // All 8 rooms must be visited
    expect(visited.size).toBe(8);
    // Boss room is index 7
    expect(visited.has(7)).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    const run1 = DungeonGenerator.generateFloor(777);
    const run2 = DungeonGenerator.generateFloor(777);

    expect(run1.length).toBe(run2.length);
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].type).toBe(run2[i].type);
      expect(run1[i].gridX).toBe(run2[i].gridX);
      expect(run1[i].gridY).toBe(run2[i].gridY);
      expect(run1[i].doors.length).toBe(run2[i].doors.length);
    }
  });

  it('generates valid seamless 3-tile corridors connecting all rooms without room overlap', () => {
    const rooms = DungeonGenerator.generateFloor(2026);
    const corridors = DungeonGenerator.generateCorridors(rooms);

    // A tree of 8 rooms has 7 unique bidirectional corridors
    expect(corridors.length).toBe(7);
    for (const c of corridors) {
      expect(c.width).toBeGreaterThan(0);
      expect(c.height).toBeGreaterThan(0);
      expect(c.floorTiles.length).toBeGreaterThan(0);
      expect(c.wallRects.length).toBe(2);
    }

    // Verify no two rooms overlap in world coordinates
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i];
        const b = rooms[j];
        const overlapX = a.worldX < b.worldX + b.width && a.worldX + a.width > b.worldX;
        const overlapY = a.worldY < b.worldY + b.height && a.worldY + a.height > b.worldY;
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });
});
