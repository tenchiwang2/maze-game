// ─────────────────────────────────────────────
//  worldData.jsx
//  世界內容定義 — 對應 defaults.jsx 的設計風格
//  手工撰寫的地圖地形、地點、對話、商店、任務資料
// ─────────────────────────────────────────────
import { TERRAIN, LOC_TYPE } from './worldMap.jsx';

// ── 世界地圖定義 ──────────────────────────────
export const WORLD_DEF = {
  cols: 32,
  rows: 22,
  startX: 4,
  startY: 4,
  terrainRegions: [
    // 北方山脈
    { x: 0,  y: 0,  w: 32, h: 2,  type: TERRAIN.MOUNTAIN },
    // 西方山脈（邊界）
    { x: 0,  y: 0,  w: 2,  h: 22, type: TERRAIN.MOUNTAIN },
    // 東方山脈（邊界）
    { x: 30, y: 0,  w: 2,  h: 22, type: TERRAIN.MOUNTAIN },
    // 南方山脈（邊界）
    { x: 0,  y: 20, w: 32, h: 2,  type: TERRAIN.MOUNTAIN },
    // 中央山脈
    { x: 16, y: 2,  w: 3,  h: 10, type: TERRAIN.MOUNTAIN },
    { x: 17, y: 10, w: 4,  h: 5,  type: TERRAIN.MOUNTAIN },
    // 東北山群
    { x: 22, y: 2,  w: 5,  h: 4,  type: TERRAIN.MOUNTAIN },
    // 中心湖
    { shape: 'circle', cx: 10, cy: 11, r: 2.8, type: TERRAIN.WATER },
    // 東方湖泊
    { shape: 'circle', cx: 25, cy: 15, r: 1.8, type: TERRAIN.WATER },
    // 河流（橫向）
    { x: 3,  y: 10, w: 7,  h: 1,  type: TERRAIN.WATER },
    // 南方森林
    { x: 3,  y: 15, w: 12, h: 4,  type: TERRAIN.FOREST },
    { x: 20, y: 16, w: 8,  h: 3,  type: TERRAIN.FOREST },
    // 東方森林
    { x: 20, y: 6,  w: 5,  h: 5,  type: TERRAIN.FOREST },
  ],
  locations: [
    {
      id: 'town_start',
      type: LOC_TYPE.TOWN,
      wx: 4, wy: 4,
      label: '起始城鎮',
      dungeonCfg: {
        cols: 16, rows: 14,
        fixedRooms: [
          {
            r: 1, c: 1, w: 5, h: 4,
            events: [
              { id: 'elder_npc', dr: 2, dc: 2, type: 'npc', text: '村長', icon: '@', repeatable: true, dialogueId: 'elder_welcome' },
            ],
          },
          {
            r: 1, c: 10, w: 4, h: 4,
            events: [
              { id: 'weapon_shop', dr: 1, dc: 1, type: 'shop', text: '武器店', icon: '$', repeatable: true, shopId: 'weapon_shop' },
              { id: 'armor_shop',  dr: 1, dc: 2, type: 'shop', text: '防具店', icon: '$', repeatable: true, shopId: 'armor_shop' },
            ],
          },
          {
            r: 8, c: 3, w: 4, h: 3,
            events: [
              { id: 'general_shop', dr: 1, dc: 1, type: 'shop', text: '雜貨店', icon: '$', repeatable: true, shopId: 'general_store' },
            ],
          },
          {
            r: 8, c: 10, w: 3, h: 3,
            events: [
              { id: 'town_gate_ev', dr: 1, dc: 1, type: 'town_gate', text: '城鎮出口', icon: 'G', repeatable: true },
            ],
          },
        ],
        randomCount: 0,
        safeMin: 2, safeMax: 4,
        doorCount: 2, doorOpen: true,
        ambient: 0.7, torchRadius: 12,
      },
    },
    {
      id: 'cave_1',
      type: LOC_TYPE.CAVE,
      wx: 13, wy: 7,
      label: '幽暗洞穴',
      dungeonCfg: {
        cols: 10, rows: 12,
        fixedRooms: [
          {
            r: 1, c: 1, w: 3, h: 2,
            events: [
              { id: 'cave_chest1', dr: 0, dc: 1, type: 'chest', text: '石箱', icon: 'T', repeatable: false, itemId: 'health_potion', qty: 2 },
            ],
          },
          {
            r: 9, c: 7, w: 2, h: 2,
            events: [
              { id: 'cave_boss', dr: 0, dc: 0, type: 'combat', text: '巨型蝙蝠', icon: '!', repeatable: false, enemyId: 'cave_boss' },
            ],
          },
        ],
        randomCount: 0,
        safeMin: 2, safeMax: 3,
        doorCount: 0, doorOpen: true,
        ambient: 0.01, torchRadius: 4,
        globalEvents: [
          { id: 'bat1', r: 4, c: 2, type: 'combat', text: '蝙蝠', icon: '!', repeatable: false, triggered: false, enemyId: 'bat' },
          { id: 'bat2', r: 7, c: 5, type: 'combat', text: '蝙蝠', icon: '!', repeatable: false, triggered: false, enemyId: 'bat' },
          { id: 'cave_key_drop', r: 5, c: 8, type: 'chest', text: '生鏽鐵箱', icon: 'T', repeatable: false, triggered: false, itemId: 'cave_key', qty: 1 },
        ],
      },
    },
    {
      id: 'tower_1',
      type: LOC_TYPE.TOWER,
      wx: 20, wy: 8,
      label: '古老高塔',
      dungeonCfg: {
        cols: 8, rows: 8,
        fixedRooms: [
          {
            r: 1, c: 1, w: 3, h: 2,
            events: [
              { id: 'tower_chest', dr: 0, dc: 1, type: 'chest', text: '寶箱', icon: 'T', repeatable: false, itemId: 'steel_sword', qty: 1 },
            ],
          },
        ],
        randomCount: 1,
        safeMin: 2, safeMax: 3,
        doorCount: 1, doorOpen: true,
        ambient: 0.15, torchRadius: 6,
        multiMap: true, floorCount: 3,
        globalEvents: [
          { id: 'tower_guard1', r: 4, c: 4, type: 'combat', text: '石製守衛', icon: '!', repeatable: false, triggered: false, enemyId: 'skeleton' },
        ],
      },
    },
    {
      id: 'dungeon_1',
      type: LOC_TYPE.DUNGEON,
      wx: 27, wy: 12,
      label: '深淵地洞',
      dungeonCfg: {
        cols: 22, rows: 22,
        fixedRooms: [
          {
            r: 1, c: 1, w: 4, h: 3,
            events: [
              { id: 'dungeon_hint', dr: 1, dc: 1, type: 'message', text: '牆上刻著：「深處有強大的守衛...」', icon: '!', repeatable: false },
            ],
          },
          {
            r: 18, c: 18, w: 3, h: 3,
            events: [
              { id: 'dungeon_boss', dr: 1, dc: 1, type: 'combat', text: '地洞守衛', icon: '!', repeatable: false, enemyId: 'dungeon_boss' },
            ],
          },
        ],
        randomCount: 6,
        safeMin: 2, safeMax: 5,
        doorCount: 2, doorOpen: true,
        ambient: 0.02, torchRadius: 5,
        globalEvents: [
          { id: 'goblin1', r: 5,  c: 5,  type: 'combat', text: '哥布林', icon: '!', repeatable: false, triggered: false, enemyId: 'goblin' },
          { id: 'goblin2', r: 10, c: 8,  type: 'combat', text: '哥布林', icon: '!', repeatable: false, triggered: false, enemyId: 'goblin' },
          { id: 'goblin3', r: 15, c: 12, type: 'combat', text: '哥布林', icon: '!', repeatable: false, triggered: false, enemyId: 'goblin' },
          { id: 'dchest1', r: 8,  c: 14, type: 'chest',  text: '古老寶箱', icon: 'T', repeatable: false, triggered: false, itemId: 'health_potion', qty: 3 },
          { id: 'dchest2', r: 18, c: 5,  type: 'chest',  text: '隱藏寶箱', icon: 'T', repeatable: false, triggered: false, itemId: 'tower_emblem', qty: 1 },
        ],
      },
    },
  ],
};

// ── 對話資料 ──────────────────────────────────
export const DIALOGUES = {
  elder_welcome: [
    { speaker: '村長', text: '歡迎來到起始城鎮！勇者，這個世界充滿危機。' },
    { speaker: '村長', text: '附近的洞穴裡有蝙蝠作亂，古老高塔的惡靈越來越強...' },
    { speaker: '村長', text: '深淵地洞中更有強大的守衛。請備足藥水再出發！' },
    { speaker: '村長', text: '城鎮的武器店、防具店和雜貨店都能提供幫助。' },
    { speaker: '村長', text: '城鎮出口在東南角的小屋，穿過它就能回到大地圖。', choices: [
      { text: '謝謝村長！', next: null },
    ]},
  ],
};

// ── 商店資料 ──────────────────────────────────
export const SHOPS = {
  general_store: {
    name: '雜貨店',
    inventory: ['health_potion', 'mp_potion'],
  },
  weapon_shop: {
    name: '武器鐵匠',
    inventory: ['iron_sword', 'steel_sword'],
  },
  armor_shop: {
    name: '防具商人',
    inventory: ['leather_armor'],
  },
};

// ── 任務定義 ──────────────────────────────────
export const QUEST_DEFS = [
  {
    id: 'quest_bats',
    title: '洞穴清理',
    giverNpc: 'elder_welcome',
    steps: [
      { desc: '前往幽暗洞穴', type: 'reach', locationId: 'cave_1' },
      { desc: '擊退洞穴蝙蝠 (0/2)', type: 'kill', enemyId: 'bat', count: 2 },
    ],
    reward: { gold: 50, itemId: 'health_potion', qty: 2 },
  },
  {
    id: 'quest_tower',
    title: '高塔探索',
    giverNpc: 'elder_welcome',
    steps: [
      { desc: '登上古老高塔頂層', type: 'reach', locationId: 'tower_1' },
    ],
    reward: { gold: 100, itemId: 'steel_sword', qty: 1 },
  },
];
