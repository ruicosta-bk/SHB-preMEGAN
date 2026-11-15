import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    BlendModes: { ADD: 1, NORMAL: 0 },
    Math: { Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)) }
  }
}));

import { RoomManager } from '../src/world/RoomManager';
import { DungeonGenerator } from '../src/world/DungeonGenerator';

function createMockScene() {
  let spriteCount = 0;
  const makeSprite = (x: number, y: number, texture: string) => {
    spriteCount++;
    return {
      x,
      y,
      texture: { key: texture },
      active: true,
      setDepth() { return this; },
      setScale() { return this; },
      setBlendMode() { return this; },
      setTint() { return this; },
      setAlpha() { return this; },
      once() { return this; },
      destroy() { this.active = false; }
    };
  };

  const scene: any = {
    textures: { exists: () => true },
    add: {
      sprite: (x: number, y: number, texture: string) => makeSprite(x, y, texture)
    },
    tweens: {
      add: () => ({}),
      killTweensOf: () => {}
    }
  };

  return { scene, getSpriteCount: () => spriteCount };
}

describe('QA-001 Rest Room Merchant Reward Spawning', () => {
  it('spawns merchant, shop items, forge, altar, core_anvil, and vending once on first call and never duplicates on revisit', () => {
    const rooms = DungeonGenerator.generateFloor(1337, 1, 'normal');
    const restRoom = rooms.find(r => r.type === 'rest')!;
    expect(restRoom).toBeDefined();
    expect(restRoom.rewardSpawned).toBe(false);

    const { scene, getSpriteCount } = createMockScene();
    const roomManager = new RoomManager(scene, rooms, [], 1, 'normal');

    roomManager.spawnRoomRewards(restRoom);
    expect(restRoom.rewardSpawned).toBe(true);

    const shopItems = roomManager.pickups.filter(p => p.type === 'shop_item');
    expect(shopItems.length).toBe(3);
    expect(roomManager.pickups.filter(p => p.type === 'forge').length).toBe(1);
    expect(roomManager.pickups.filter(p => p.type === 'altar').length).toBe(1);
    expect(roomManager.pickups.filter(p => p.type === 'core_anvil').length).toBe(1);
    expect(roomManager.pickups.filter(p => p.type === 'vending').length).toBe(1);

    const firstSpriteCount = getSpriteCount();
    expect(firstSpriteCount).toBeGreaterThanOrEqual(9); // shadow + merchant + 7 interactive pickups (+ halos)

    // Revisiting or re-calling reward generators must not duplicate anything
    roomManager.spawnRoomRewards(restRoom);
    roomManager.spawnRestRoomMerchant(restRoom);
    expect(roomManager.pickups.length).toBe(7);
    expect(getSpriteCount()).toBe(firstSpriteCount);
  });

  it('spawns rest room rewards normally on subsequent floors', () => {
    const floor2Rooms = DungeonGenerator.generateFloor(2026, 2, 'normal');
    const floor2Rest = floor2Rooms.find(r => r.type === 'rest')!;
    expect(floor2Rest.rewardSpawned).toBe(false);

    const { scene } = createMockScene();
    const roomManager = new RoomManager(scene, floor2Rooms, [], 2, 'normal');
    roomManager.spawnRoomRewards(floor2Rest);

    expect(floor2Rest.rewardSpawned).toBe(true);
    expect(roomManager.pickups.filter(p => p.type === 'shop_item').length).toBe(3);
    expect(roomManager.pickups.some(p => p.type === 'vending')).toBe(true);
  });
});
