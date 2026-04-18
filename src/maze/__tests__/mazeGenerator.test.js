import { describe, it, expect } from 'vitest';
import {
  generateMaze,
  buildGrid,
  resolveEvents,
  doorWorldPos,
} from '../mazeGenerator.jsx';

// ─────────────────────────────────────────────
//  輔助函式
// ─────────────────────────────────────────────

/** BFS 從 (startR, startC) 出發，回傳走過的所有開放格子數 */
function bfsCount(grid, startR, startC) {
  const H = grid.length, W = grid[0].length;
  const visited = Array.from({ length: H }, () => Array(W).fill(false));
  const queue = [[startR, startC]];
  visited[startR][startC] = true;
  let count = 0;
  while (queue.length) {
    const [r, c] = queue.shift();
    count++;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < H && nc >= 0 && nc < W && !visited[nr][nc] && grid[nr][nc] === 0) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return count;
}

/** 計算 grid 中所有開放格子數 */
function countOpen(grid) {
  return grid.flat().filter(v => v === 0).length;
}

/** 判斷兩個房間是否重疊（含 1 格緩衝） */
function roomsOverlap(a, b) {
  return !(a.c + a.w + 1 <= b.c || b.c + b.w + 1 <= a.c ||
           a.r + a.h + 1 <= b.r || b.r + b.h + 1 <= a.r);
}

// ─────────────────────────────────────────────
//  generateMaze
// ─────────────────────────────────────────────
describe('generateMaze', () => {
  it('回傳正確的資料結構', () => {
    const result = generateMaze(10, 10);
    expect(result).toHaveProperty('walls');
    expect(result).toHaveProperty('rooms');
    expect(result).toHaveProperty('doorPositions');
  });

  it('walls 的維度符合 rows × cols', () => {
    const cols = 8, rows = 6;
    const { walls } = generateMaze(cols, rows);
    expect(walls.length).toBe(rows);
    walls.forEach(row => {
      expect(row.length).toBe(cols);
      row.forEach(cell => {
        expect(cell).toHaveProperty('right');
        expect(cell).toHaveProperty('bottom');
      });
    });
  });

  it('迷宮完全連通（所有格子從入口可達）', () => {
    const cols = 12, rows = 10;
    const { walls } = generateMaze(cols, rows);
    const { grid } = buildGrid(walls, cols, rows);
    expect(bfsCount(grid, 1, 1)).toBe(countOpen(grid));
  });

  it('多次產生迷宮都保持連通性', () => {
    for (let i = 0; i < 5; i++) {
      const cols = 8 + i, rows = 8 + i;
      const { walls } = generateMaze(cols, rows);
      const { grid } = buildGrid(walls, cols, rows);
      expect(bfsCount(grid, 1, 1)).toBe(countOpen(grid));
    }
  });

  it('固定房間被正確放入', () => {
    const fixedRooms = [{ r: 1, c: 1, w: 2, h: 2 }];
    const { rooms } = generateMaze(10, 10, fixedRooms, 0);
    const placed = rooms.find(rm => rm.fixed && rm.origIdx === 0);
    expect(placed).toBeDefined();
    expect(placed.r).toBe(1);
    expect(placed.c).toBe(1);
    expect(placed.w).toBe(2);
    expect(placed.h).toBe(2);
  });

  it('固定房間超出邊界時不被放入', () => {
    const fixedRooms = [{ r: 99, c: 99, w: 3, h: 3 }];
    const { rooms } = generateMaze(10, 10, fixedRooms, 0);
    const placed = rooms.find(rm => rm.fixed);
    expect(placed).toBeUndefined();
  });

  it('隨機房間不互相重疊', () => {
    const { rooms } = generateMaze(15, 15, [], 5);
    for (let i = 0; i < rooms.length; i++)
      for (let j = i + 1; j < rooms.length; j++)
        expect(roomsOverlap(rooms[i], rooms[j])).toBe(false);
  });

  it('randomCount=0 時不產生隨機房間', () => {
    const { rooms } = generateMaze(10, 10, [], 0);
    expect(rooms.filter(r => !r.fixed).length).toBe(0);
  });

  it('門的數量符合 defaultDoorCount 設定', () => {
    const fixedRooms = [{ r: 2, c: 2, w: 3, h: 3 }];
    const doorCount = 2;
    const { doorPositions } = generateMaze(10, 10, fixedRooms, 0, 2, 4, doorCount);
    expect(doorPositions.length).toBeLessThanOrEqual(doorCount);
  });

  it('doorPositions 每一項都有必要欄位', () => {
    const { doorPositions } = generateMaze(10, 10, [{ r: 1, c: 1, w: 2, h: 2 }], 0);
    doorPositions.forEach(dp => {
      expect(dp).toHaveProperty('r');
      expect(dp).toHaveProperty('c');
      expect(['bottom', 'right']).toContain(dp.side);
      expect(dp).toHaveProperty('roomIdx');
      expect(dp).toHaveProperty('defaultOpen');
    });
  });
});

// ─────────────────────────────────────────────
//  buildGrid
// ─────────────────────────────────────────────
describe('buildGrid', () => {
  it('grid 維度為 (2*rows+1) × (2*cols+1)', () => {
    const cols = 7, rows = 5;
    const { walls } = generateMaze(cols, rows);
    const { grid, zoneMap } = buildGrid(walls, cols, rows);
    expect(grid.length).toBe(2 * rows + 1);
    grid.forEach(row => expect(row.length).toBe(2 * cols + 1));
    expect(zoneMap.length).toBe(2 * rows + 1);
    zoneMap.forEach(row => expect(row.length).toBe(2 * cols + 1));
  });

  it('固定房間格子的 zoneId 為 origIdx+1', () => {
    const fixedRooms = [{ r: 1, c: 1, w: 2, h: 2 }];
    const { walls, rooms } = generateMaze(10, 10, fixedRooms, 0);
    const { zoneMap } = buildGrid(walls, 10, 10, rooms);
    // 固定房間 origIdx=0，zoneId 應為 1
    // 房間邏輯座標 (r=1,c=1)，網格座標起點 (gy=3, gx=3)
    expect(zoneMap[3][3]).toBe(1);
  });

  it('走廊格子的 zoneId 為 0', () => {
    const { walls } = generateMaze(10, 10, [], 0);
    const { zoneMap } = buildGrid(walls, 10, 10);
    // (1,1) 是走廊起點
    expect(zoneMap[1][1]).toBe(0);
  });

  it('關閉的門在 grid 中為牆壁（值=1）', () => {
    const fixedRooms = [{ r: 1, c: 1, w: 2, h: 2 }];
    const { walls, rooms, doorPositions } = generateMaze(10, 10, fixedRooms, 0, 2, 4, 1, false);
    if (doorPositions.length === 0) return; // 無門則跳過
    const doors = doorPositions.map(dp => ({ ...dp, closed: true }));
    const { grid, doorMap } = buildGrid(walls, 10, 10, rooms, doors);
    // doorMap 中每個 key 對應的格子應為牆
    Object.keys(doorMap).forEach(key => {
      const [gy, gx] = key.split(',').map(Number);
      expect(grid[gy][gx]).toBe(1);
    });
  });

  it('開啟的門在 grid 中為開放格（值=0）', () => {
    const fixedRooms = [{ r: 1, c: 1, w: 2, h: 2 }];
    const { walls, rooms, doorPositions } = generateMaze(10, 10, fixedRooms, 0, 2, 4, 1, true);
    if (doorPositions.length === 0) return;
    const doors = doorPositions.map(dp => ({ ...dp, closed: false }));
    const { grid, doorMap } = buildGrid(walls, 10, 10, rooms, doors);
    Object.keys(doorMap).forEach(key => {
      const [gy, gx] = key.split(',').map(Number);
      expect(grid[gy][gx]).toBe(0);
    });
  });

  it('doorMap 的 key 格式正確', () => {
    const fixedRooms = [{ r: 1, c: 1, w: 2, h: 2 }];
    const { walls, rooms, doorPositions } = generateMaze(10, 10, fixedRooms, 0);
    const doors = doorPositions.map(dp => ({ ...dp, closed: false }));
    const { doorMap } = buildGrid(walls, 10, 10, rooms, doors);
    Object.keys(doorMap).forEach(key => {
      expect(key).toMatch(/^\d+,\d+$/);
    });
  });
});

// ─────────────────────────────────────────────
//  resolveEvents
// ─────────────────────────────────────────────
describe('resolveEvents', () => {
  it('無事件時回傳空陣列', () => {
    const { rooms } = generateMaze(10, 10, [{ r: 1, c: 1, w: 2, h: 2 }], 0);
    const result = resolveEvents(rooms, [{ r: 1, c: 1, w: 2, h: 2, events: [] }], []);
    expect(result).toEqual([]);
  });

  it('房間事件座標 = 房間原點 + 偏移', () => {
    const fixedRooms = [{ r: 2, c: 3, w: 3, h: 3, events: [{ id: 'e1', dr: 1, dc: 1, type: 'message', text: '測試' }] }];
    const { rooms } = generateMaze(12, 12, fixedRooms, 0);
    const placed = rooms.find(rm => rm.fixed && rm.origIdx === 0);
    const result = resolveEvents(rooms, fixedRooms, []);
    expect(result.length).toBe(1);
    expect(result[0].r).toBe(placed.r + 1);
    expect(result[0].c).toBe(placed.c + 1);
  });

  it('所有事件的 triggered 初始為 false', () => {
    const fixedRooms = [{ r: 1, c: 1, w: 2, h: 2, events: [{ id: 'e1', dr: 0, dc: 0, type: 'message', text: 'hi' }] }];
    const { rooms } = generateMaze(10, 10, fixedRooms, 0);
    const globalEvs = [{ id: 'g1', r: 3, c: 3, type: 'message', text: 'global' }];
    const result = resolveEvents(rooms, fixedRooms, globalEvs);
    result.forEach(ev => expect(ev.triggered).toBe(false));
  });

  it('roomLabel 格式正確', () => {
    const fixedRooms = [{ r: 1, c: 1, w: 2, h: 2, events: [{ id: 'e1', dr: 0, dc: 0, type: 'message', text: 'x' }] }];
    const { rooms } = generateMaze(10, 10, fixedRooms, 0);
    const result = resolveEvents(rooms, fixedRooms, []);
    expect(result[0].roomLabel).toBe('房間1');
  });

  it('全域事件被附加到結果末尾', () => {
    const { rooms } = generateMaze(10, 10, [], 0);
    const globalEvs = [
      { id: 'g1', r: 2, c: 2, type: 'message', text: 'A' },
      { id: 'g2', r: 4, c: 4, type: 'message', text: 'B' },
    ];
    const result = resolveEvents(rooms, [], globalEvs);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('g1');
    expect(result[1].id).toBe('g2');
  });

  it('destRoomIdx 解析為目標房間的絕對座標', () => {
    const fixedRooms = [
      { r: 1, c: 1, w: 2, h: 2, events: [{ id: 'tp', dr: 0, dc: 0, type: 'teleport', destRoomIdx: 1, destDr: 0, destDc: 0 }] },
      { r: 5, c: 5, w: 2, h: 2, events: [] },
    ];
    const { rooms } = generateMaze(15, 15, fixedRooms, 0);
    const dest = rooms.find(rm => rm.fixed && rm.origIdx === 1);
    const result = resolveEvents(rooms, fixedRooms, []);
    expect(result[0].destR).toBe(dest.r);
    expect(result[0].destC).toBe(dest.c);
  });

  it('房間未被放入時其事件被略過', () => {
    // 超出邊界的房間不會被放入
    const fixedRooms = [{ r: 99, c: 99, w: 2, h: 2, events: [{ id: 'x', dr: 0, dc: 0, type: 'message', text: '!' }] }];
    const { rooms } = generateMaze(10, 10, fixedRooms, 0);
    const result = resolveEvents(rooms, fixedRooms, []);
    expect(result.length).toBe(0);
  });
});

// ─────────────────────────────────────────────
//  doorWorldPos
// ─────────────────────────────────────────────
describe('doorWorldPos', () => {
  it('bottom 側門的世界座標', () => {
    const door = { side: 'bottom', r: 2, c: 3 };
    const { wx, wy } = doorWorldPos(door);
    expect(wx).toBe(2 * 3 + 2);          // 2*c + 2 = 8
    expect(wy).toBe(2 * (2 + 1) + 0.5);  // 2*(r+1) + 0.5 = 6.5
  });

  it('right 側門的世界座標', () => {
    const door = { side: 'right', r: 1, c: 4 };
    const { wx, wy } = doorWorldPos(door);
    expect(wx).toBe(2 * (4 + 1) + 0.5);  // 2*(c+1) + 0.5 = 10.5
    expect(wy).toBe(2 * 1 + 2);           // 2*r + 2 = 4
  });

  it('回傳物件包含 wx 和 wy', () => {
    const result = doorWorldPos({ side: 'bottom', r: 0, c: 0 });
    expect(result).toHaveProperty('wx');
    expect(result).toHaveProperty('wy');
    expect(typeof result.wx).toBe('number');
    expect(typeof result.wy).toBe('number');
  });

  it('不同位置的門座標不相同', () => {
    const a = doorWorldPos({ side: 'bottom', r: 1, c: 1 });
    const b = doorWorldPos({ side: 'bottom', r: 2, c: 3 });
    expect(a.wx === b.wx && a.wy === b.wy).toBe(false);
  });
});
