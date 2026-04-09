// ─────────────────────────────────────────────
//  mazeFactory.jsx
//  迷宮工廠 — 定義各模式的產生參數與出口邏輯
// ─────────────────────────────────────────────

export const FACTORY_IDS = {
  NO_ROOMS:         'no_rooms',
  SINGLE_ROOM_EXIT: 'single_room_exit',
  CUSTOM:           'custom',
  MULTI_MAP:        'multi_map',
};

export const FACTORIES = [
  {
    id:          FACTORY_IDS.NO_ROOMS,
    label:       '無房間',
    description: '純走廊迷宮，不含任何房間',
    getFixedRooms: () => [],
    randomCount:   0,
    getExitCell:   (_rooms, cols, rows) => ({ r: rows - 1, c: cols - 1 }),
    multiMap:      false,
  },
  {
    id:          FACTORY_IDS.SINGLE_ROOM_EXIT,
    label:       '單房間出口',
    description: '迷宮右下角有一個房間，出口固定在房間中心',
    getFixedRooms: (cols, rows) => [{
      r: Math.max(1, rows - 5),
      c: Math.max(1, cols - 5),
      w: 3, h: 3,
      events: [],
    }],
    randomCount:   0,
    getExitCell:   (rooms, cols, rows) => {
      const room = rooms.find(r => r.fixed);
      if (room) return { r: room.r + 1, c: room.c + 1 };
      return { r: rows - 1, c: cols - 1 };
    },
    multiMap:      false,
  },
  {
    id:          FACTORY_IDS.CUSTOM,
    label:       '完全自訂',
    description: '使用下方設定自由配置迷宮（現有行為）',
    // getFixedRooms 與 randomCount 由元件狀態提供
    getExitCell:   (_rooms, cols, rows) => ({ r: rows - 1, c: cols - 1 }),
    multiMap:      false,
  },
  {
    id:          FACTORY_IDS.MULTI_MAP,
    label:       '多地圖串聯',
    description: 'A→B→C 三張地圖串聯，可雙向來回，抵達 C 出口才通關',
    getFixedRooms: () => [],
    randomCount:   3,
    getExitCell:   (_rooms, cols, rows) => ({ r: rows - 1, c: cols - 1 }),
    multiMap:      true,
  },
];
