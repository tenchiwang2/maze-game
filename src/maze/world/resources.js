// ─────────────────────────────────────────────
//  world/resources.js
//  世界地圖採集節點定義
//
//  每個節點欄位：
//    id          – 唯一識別碼
//    wx, wy      – 世界座標（格子）
//    resourceId  – 對應 ITEMS key
//    qty         – 每次採集數量
//    respawnDays – 重新生長所需遊戲天數
//    label       – 顯示名稱（HUD 用）
//    nation      – 所屬區域
// ─────────────────────────────────────────────

export const RESOURCE_NODES = [
  // ── 亞薩王國 ──────────────────────────────────
  {
    id: 'herb_ys_1',
    wx: 34, wy: 27,
    resourceId: 'wild_herb', qty: 3, respawnDays: 3,
    label: '野草藥叢', nation: 'ys',
  },
  {
    id: 'herb_ys_2',
    wx: 26, wy: 29,
    resourceId: 'wild_herb', qty: 3, respawnDays: 3,
    label: '野草藥叢', nation: 'ys',
  },
  {
    id: 'ore_ys_1',
    wx: 42, wy: 23,
    resourceId: 'iron_ore', qty: 2, respawnDays: 5,
    label: '鐵礦脈', nation: 'ys',
  },
  {
    id: 'ore_ys_2',
    wx: 37, wy: 20,
    resourceId: 'iron_ore', qty: 2, respawnDays: 5,
    label: '鐵礦脈', nation: 'ys',
  },

  // ── 沙漠帝國 ──────────────────────────────────
  {
    id: 'cactus_desert_1',
    wx: 62, wy: 37,
    resourceId: 'cactus_gel', qty: 3, respawnDays: 3,
    label: '仙人掌群', nation: 'desert',
  },
  {
    id: 'cactus_desert_2',
    wx: 67, wy: 43,
    resourceId: 'cactus_gel', qty: 3, respawnDays: 3,
    label: '仙人掌群', nation: 'desert',
  },
  {
    id: 'stone_desert_1',
    wx: 56, wy: 43,
    resourceId: 'desert_stone', qty: 2, respawnDays: 5,
    label: '砂石礦場', nation: 'desert',
  },
  {
    id: 'stone_desert_2',
    wx: 72, wy: 38,
    resourceId: 'desert_stone', qty: 2, respawnDays: 5,
    label: '砂石礦場', nation: 'desert',
  },

  // ── 雪域聯盟 ──────────────────────────────────
  {
    id: 'flower_snow_1',
    wx: 19, wy: 11,
    resourceId: 'frost_flower', qty: 2, respawnDays: 4,
    label: '霜雪花田', nation: 'snow',
  },
  {
    id: 'flower_snow_2',
    wx: 14, wy: 17,
    resourceId: 'frost_flower', qty: 2, respawnDays: 4,
    label: '霜雪花田', nation: 'snow',
  },
  {
    id: 'crystal_snow_1',
    wx: 28, wy: 11,
    resourceId: 'ice_crystal_ore', qty: 1, respawnDays: 7,
    label: '冰晶礦脈', nation: 'snow',
  },
  {
    id: 'crystal_snow_2',
    wx: 33, wy: 17,
    resourceId: 'ice_crystal_ore', qty: 1, respawnDays: 7,
    label: '冰晶礦脈', nation: 'snow',
  },
];
