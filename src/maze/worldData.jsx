// ─────────────────────────────────────────────
//  worldData.jsx
//  世界內容定義 — 地點、對話、商店、任務
// ─────────────────────────────────────────────
import { LOC_TYPE } from './worldMap.jsx';

export const WORLD_DEF = {
  cols: 80,
  rows: 55,
  startX: 40,
  startY: 27,
  terrainRegions: [], // 地形由 worldFactory 動態產生
  locations: [
    // ── 亞薩王國 ────────────────────────────────
    {
      id: 'capital_ys',
      type: LOC_TYPE.CAPITAL,
      wx: 36, wy: 24,
      label: '亞薩王都',
      nationLabel: '亞薩王國',
      dungeonCfg: {
        cols: 20, rows: 16,
        fixedRooms: [
          {
            r: 1, c: 1, w: 6, h: 4,
            events: [
              { id: 'king_npc', dr: 2, dc: 2, type: 'npc', text: '國王', icon: '@', repeatable: true, dialogueId: 'king_speech' },
            ],
          },
          {
            r: 1, c: 13, w: 5, h: 4,
            events: [
              { id: 'capital_weapon', dr: 1, dc: 1, type: 'shop', text: '皇家武器', icon: '$', repeatable: true, shopId: 'royal_weapon' },
              { id: 'capital_armor',  dr: 1, dc: 3, type: 'shop', text: '皇家防具', icon: '$', repeatable: true, shopId: 'royal_armor' },
            ],
          },
          {
            r: 6, c: 4, w: 4, h: 3,
            events: [
              { id: 'guild_npc', dr: 1, dc: 1, type: 'npc', text: '冒險公會', icon: '@', repeatable: true, dialogueId: 'guild_master' },
            ],
          },
          {
            r: 6, c: 12, w: 4, h: 3,
            events: [
              { id: 'capital_shop', dr: 1, dc: 1, type: 'shop', text: '雜貨商', icon: '$', repeatable: true, shopId: 'general_store' },
            ],
          },
          {
            r: 12, c: 8, w: 3, h: 3,
            events: [
              { id: 'capital_gate', dr: 1, dc: 1, type: 'town_gate', text: '王都城門', icon: 'G', repeatable: true },
            ],
          },
        ],
        randomCount: 1,
        safeMin: 2, safeMax: 4,
        doorCount: 2, doorOpen: true,
        ambient: 0.7, torchRadius: 14,
      },
    },
    // 中城鎮
    {
      id: 'town_riverside',
      type: LOC_TYPE.TOWN,
      wx: 28, wy: 28,
      label: '河畔城',
      nationLabel: '亞薩王國',
      dungeonCfg: {
        cols: 14, rows: 12,
        fixedRooms: [
          {
            r: 1, c: 1, w: 4, h: 3,
            events: [
              { id: 'riverside_elder', dr: 1, dc: 1, type: 'npc', text: '城主', icon: '@', repeatable: true, dialogueId: 'riverside_elder' },
            ],
          },
          {
            r: 1, c: 9, w: 3, h: 3,
            events: [
              { id: 'riverside_shop', dr: 1, dc: 1, type: 'shop', text: '雜貨商', icon: '$', repeatable: true, shopId: 'general_store' },
              { id: 'riverside_weapon', dr: 1, dc: 2, type: 'shop', text: '鐵匠鋪', icon: '$', repeatable: true, shopId: 'weapon_shop' },
            ],
          },
          {
            r: 8, c: 5, w: 3, h: 3,
            events: [
              { id: 'riverside_gate', dr: 1, dc: 1, type: 'town_gate', text: '城鎮出口', icon: 'G', repeatable: true },
            ],
          },
        ],
        randomCount: 1,
        safeMin: 2, safeMax: 3,
        doorCount: 1, doorOpen: true,
        ambient: 0.65, torchRadius: 12,
        globalEvents: [
          { id: 'rv_chest1', r: 5, c: 10, type: 'chest', text: '木箱', icon: 'T', repeatable: false, triggered: false, itemId: 'health_potion', qty: 2 },
        ],
      },
    },
    {
      id: 'town_harbor',
      type: LOC_TYPE.TOWN,
      wx: 44, wy: 20,
      label: '東港城',
      nationLabel: '亞薩王國',
      dungeonCfg: {
        cols: 16, rows: 12,
        fixedRooms: [
          {
            r: 1, c: 1, w: 4, h: 3,
            events: [
              { id: 'harbor_captain', dr: 1, dc: 1, type: 'npc', text: '港口長', icon: '@', repeatable: true, dialogueId: 'harbor_captain' },
              { id: 'harbor_merchant', dr: 2, dc: 1, type: 'npc', text: '海商', icon: '@', repeatable: true, dialogueId: 'harbor_merchant' },
            ],
          },
          {
            r: 1, c: 11, w: 3, h: 3,
            events: [
              { id: 'harbor_shop', dr: 1, dc: 1, type: 'shop', text: '船員店', icon: '$', repeatable: true, shopId: 'general_store' },
              { id: 'harbor_armor', dr: 2, dc: 1, type: 'shop', text: '防具行', icon: '$', repeatable: true, shopId: 'armor_shop' },
            ],
          },
          {
            r: 8, c: 6, w: 3, h: 3,
            events: [
              { id: 'harbor_gate', dr: 1, dc: 1, type: 'town_gate', text: '港口出口', icon: 'G', repeatable: true },
            ],
          },
        ],
        randomCount: 2,
        safeMin: 2, safeMax: 4,
        doorCount: 2, doorOpen: true,
        ambient: 0.6, torchRadius: 10,
        globalEvents: [
          { id: 'pirate1', r: 6, c: 3, type: 'combat', text: '海盜', icon: '!', repeatable: false, triggered: false, enemyId: 'skeleton' },
          { id: 'harbor_chest', r: 4, c: 12, type: 'chest', text: '藏寶箱', icon: 'T', repeatable: false, triggered: false, itemId: 'steel_sword', qty: 1 },
        ],
      },
    },
    // 小城鎮
    {
      id: 'town_small_south',
      type: LOC_TYPE.TOWN_SMALL,
      wx: 32, wy: 34,
      label: '南境村',
      nationLabel: '亞薩王國',
      dungeonCfg: {
        cols: 8, rows: 7,
        fixedRooms: [
          {
            r: 1, c: 1, w: 3, h: 2,
            events: [
              { id: 'south_elder', dr: 0, dc: 1, type: 'npc', text: '村長', icon: '@', repeatable: true, dialogueId: 'south_elder' },
            ],
          },
          {
            r: 1, c: 5, w: 2, h: 2,
            events: [
              { id: 'south_shop', dr: 0, dc: 0, type: 'shop', text: '小賣部', icon: '$', repeatable: true, shopId: 'general_store' },
            ],
          },
        ],
        randomCount: 0, safeMin: 1, safeMax: 2,
        doorCount: 0, doorOpen: true,
        ambient: 0.70, torchRadius: 10,
        globalEvents: [
          { id: 'south_chest', r: 4, c: 5, type: 'chest', text: '木箱', icon: 'T', repeatable: false, triggered: false, itemId: 'health_potion', qty: 1 },
        ],
      },
    },

    // ── 沙漠帝國 ────────────────────────────────
    {
      id: 'capital_desert',
      type: LOC_TYPE.CAPITAL,
      wx: 58, wy: 40,
      label: '沙之帝都',
      nationLabel: '沙漠帝國',
      dungeonCfg: {
        cols: 18, rows: 14,
        fixedRooms: [
          {
            r: 1, c: 1, w: 5, h: 4,
            events: [
              { id: 'sultan_npc', dr: 2, dc: 2, type: 'npc', text: '沙漠蘇丹', icon: '@', repeatable: true, dialogueId: 'sultan_speech' },
            ],
          },
          {
            r: 1, c: 12, w: 4, h: 3,
            events: [
              { id: 'desert_weapon', dr: 1, dc: 1, type: 'shop', text: '沙漠武器', icon: '$', repeatable: true, shopId: 'weapon_shop' },
            ],
          },
          {
            r: 9, c: 6, w: 4, h: 3,
            events: [
              { id: 'desert_gate', dr: 1, dc: 1, type: 'town_gate', text: '帝都城門', icon: 'G', repeatable: true },
            ],
          },
        ],
        randomCount: 2,
        safeMin: 2, safeMax: 4,
        doorCount: 2, doorOpen: true,
        ambient: 0.5, torchRadius: 10,
        globalEvents: [
          { id: 'sand_guard1', r: 5, c: 5, type: 'combat', text: '沙漠衛兵', icon: '!', repeatable: false, triggered: false, enemyId: 'skeleton' },
          { id: 'desert_chest', r: 8, c: 14, type: 'chest', text: '帝國寶箱', icon: 'T', repeatable: false, triggered: false, itemId: 'health_potion', qty: 3 },
        ],
      },
    },
    // 中城鎮
    {
      id: 'town_oasis',
      type: LOC_TYPE.TOWN,
      wx: 64, wy: 34,
      label: '綠洲鎮',
      nationLabel: '沙漠帝國',
      dungeonCfg: {
        cols: 12, rows: 10,
        fixedRooms: [
          {
            r: 1, c: 1, w: 3, h: 3,
            events: [
              { id: 'oasis_elder', dr: 1, dc: 1, type: 'npc', text: '綠洲長老', icon: '@', repeatable: true, dialogueId: 'oasis_elder' },
            ],
          },
          {
            r: 1, c: 8, w: 3, h: 3,
            events: [
              { id: 'oasis_merchant', dr: 1, dc: 1, type: 'shop', text: '旅行商人', icon: '$', repeatable: true, shopId: 'general_store' },
              { id: 'oasis_weapon', dr: 1, dc: 2, type: 'shop', text: '沙漠武器', icon: '$', repeatable: true, shopId: 'weapon_shop' },
            ],
          },
          {
            r: 6, c: 4, w: 3, h: 3,
            events: [
              { id: 'oasis_gate', dr: 1, dc: 1, type: 'town_gate', text: '鎮門', icon: 'G', repeatable: true },
            ],
          },
        ],
        randomCount: 0,
        safeMin: 2, safeMax: 3,
        doorCount: 1, doorOpen: true,
        ambient: 0.55, torchRadius: 8,
        globalEvents: [
          { id: 'oasis_chest', r: 4, c: 4, type: 'chest', text: '旅人遺留', icon: 'T', repeatable: false, triggered: false, itemId: 'mp_potion', qty: 2 },
        ],
      },
    },
    // 小城鎮
    {
      id: 'town_small_dune',
      type: LOC_TYPE.TOWN_SMALL,
      wx: 70, wy: 42,
      label: '沙丘聚落',
      nationLabel: '沙漠帝國',
      dungeonCfg: {
        cols: 8, rows: 7,
        fixedRooms: [
          {
            r: 1, c: 1, w: 3, h: 2,
            events: [
              { id: 'dune_guide', dr: 0, dc: 1, type: 'npc', text: '商隊嚮導', icon: '@', repeatable: true, dialogueId: 'dune_guide' },
            ],
          },
          {
            r: 1, c: 5, w: 2, h: 2,
            events: [
              { id: 'dune_shop', dr: 0, dc: 0, type: 'shop', text: '行腳商', icon: '$', repeatable: true, shopId: 'general_store' },
            ],
          },
        ],
        randomCount: 0, safeMin: 1, safeMax: 2,
        doorCount: 0, doorOpen: true,
        ambient: 0.60, torchRadius: 8,
        globalEvents: [
          { id: 'dune_chest', r: 4, c: 5, type: 'chest', text: '商隊遺物', icon: 'T', repeatable: false, triggered: false, itemId: 'mp_potion', qty: 1 },
        ],
      },
    },

    // ── 雪域聯盟 ────────────────────────────────
    {
      id: 'capital_frost',
      type: LOC_TYPE.CAPITAL,
      wx: 22, wy: 8,
      label: '霜城要塞',
      nationLabel: '雪域聯盟',
      dungeonCfg: {
        cols: 16, rows: 14,
        fixedRooms: [
          {
            r: 1, c: 1, w: 4, h: 4,
            events: [
              { id: 'frost_chief', dr: 2, dc: 1, type: 'npc', text: '冰雪酋長', icon: '@', repeatable: true, dialogueId: 'frost_chief' },
            ],
          },
          {
            r: 1, c: 11, w: 3, h: 3,
            events: [
              { id: 'frost_shop', dr: 1, dc: 1, type: 'shop', text: '雪地補給', icon: '$', repeatable: true, shopId: 'armor_shop' },
            ],
          },
          {
            r: 9, c: 5, w: 3, h: 3,
            events: [
              { id: 'frost_gate', dr: 1, dc: 1, type: 'town_gate', text: '要塞出口', icon: 'G', repeatable: true },
            ],
          },
        ],
        randomCount: 2,
        safeMin: 2, safeMax: 3,
        doorCount: 2, doorOpen: false,
        ambient: 0.15, torchRadius: 7,
        globalEvents: [
          { id: 'frost_wolf1', r: 5, c: 8, type: 'combat', text: '冰雪狼', icon: '!', repeatable: false, triggered: false, enemyId: 'bat' },
          { id: 'frost_wolf2', r: 9, c: 11, type: 'combat', text: '冰雪狼', icon: '!', repeatable: false, triggered: false, enemyId: 'bat' },
          { id: 'frost_chest', r: 6, c: 13, type: 'chest', text: '凍結寶箱', icon: 'T', repeatable: false, triggered: false, itemId: 'steel_sword', qty: 1 },
        ],
      },
    },

    // 中城鎮
    {
      id: 'town_icelake',
      type: LOC_TYPE.TOWN,
      wx: 30, wy: 14,
      label: '冰湖城',
      nationLabel: '雪域聯盟',
      dungeonCfg: {
        cols: 14, rows: 12,
        fixedRooms: [
          {
            r: 1, c: 1, w: 4, h: 3,
            events: [
              { id: 'icelake_elder', dr: 1, dc: 1, type: 'npc', text: '漁夫長', icon: '@', repeatable: true, dialogueId: 'icelake_elder' },
              { id: 'icelake_alchemist', dr: 1, dc: 2, type: 'npc', text: '煉金師', icon: '@', repeatable: true, dialogueId: 'icelake_alchemist' },
            ],
          },
          {
            r: 1, c: 9, w: 3, h: 3,
            events: [
              { id: 'icelake_shop', dr: 1, dc: 1, type: 'shop', text: '雪地補給', icon: '$', repeatable: true, shopId: 'general_store' },
              { id: 'icelake_armor', dr: 1, dc: 2, type: 'shop', text: '皮革工匠', icon: '$', repeatable: true, shopId: 'armor_shop' },
            ],
          },
          {
            r: 8, c: 5, w: 3, h: 3,
            events: [
              { id: 'icelake_gate', dr: 1, dc: 1, type: 'town_gate', text: '城門', icon: 'G', repeatable: true },
            ],
          },
        ],
        randomCount: 1, safeMin: 2, safeMax: 3,
        doorCount: 1, doorOpen: true,
        ambient: 0.45, torchRadius: 9,
        globalEvents: [
          { id: 'icelake_chest', r: 5, c: 11, type: 'chest', text: '漁夫的箱子', icon: 'T', repeatable: false, triggered: false, itemId: 'health_potion', qty: 2 },
        ],
      },
    },
    // 小城鎮
    {
      id: 'town_small_peak',
      type: LOC_TYPE.TOWN_SMALL,
      wx: 16, wy: 16,
      label: '雪嶺村',
      nationLabel: '雪域聯盟',
      dungeonCfg: {
        cols: 8, rows: 7,
        fixedRooms: [
          {
            r: 1, c: 1, w: 3, h: 2,
            events: [
              { id: 'peak_hunter', dr: 0, dc: 1, type: 'npc', text: '獵人', icon: '@', repeatable: true, dialogueId: 'peak_hunter' },
            ],
          },
          {
            r: 1, c: 5, w: 2, h: 2,
            events: [
              { id: 'peak_shop', dr: 0, dc: 0, type: 'shop', text: '獵人補給', icon: '$', repeatable: true, shopId: 'general_store' },
            ],
          },
        ],
        randomCount: 0, safeMin: 1, safeMax: 2,
        doorCount: 0, doorOpen: true,
        ambient: 0.35, torchRadius: 7,
        globalEvents: [
          { id: 'peak_chest', r: 4, c: 5, type: 'chest', text: '獵物戰利品', icon: 'T', repeatable: false, triggered: false, itemId: 'health_potion', qty: 1 },
        ],
      },
    },

    // ── 獨立地點 ────────────────────────────────
    {
      id: 'dungeon_volcano',
      type: LOC_TYPE.DUNGEON,
      wx: 68, wy: 44,
      label: '火山洞窟',
      dungeonCfg: {
        cols: 18, rows: 18,
        fixedRooms: [
          {
            r: 1, c: 1, w: 3, h: 2,
            events: [
              { id: 'volcano_hint', dr: 0, dc: 1, type: 'message', text: '灼熱的岩漿在腳下流動...', icon: '!', repeatable: false },
            ],
          },
          {
            r: 15, c: 14, w: 3, h: 2,
            events: [
              { id: 'volcano_boss', dr: 0, dc: 1, type: 'combat', text: '熔岩巨人', icon: '!', repeatable: false, enemyId: 'dungeon_boss' },
            ],
          },
        ],
        randomCount: 4,
        safeMin: 2, safeMax: 5,
        doorCount: 1, doorOpen: false,
        ambient: 0.08, torchRadius: 5,
        globalEvents: [
          { id: 'fire_imp1', r: 5,  c: 4,  type: 'combat', text: '火焰精靈', icon: '!', repeatable: false, triggered: false, enemyId: 'goblin' },
          { id: 'fire_imp2', r: 10, c: 9,  type: 'combat', text: '火焰精靈', icon: '!', repeatable: false, triggered: false, enemyId: 'goblin' },
          { id: 'fire_imp3', r: 14, c: 5,  type: 'combat', text: '熔岩蜥蜴', icon: '!', repeatable: false, triggered: false, enemyId: 'cave_boss' },
          { id: 'volcano_chest1', r: 8,  c: 14, type: 'chest', text: '熔鍛寶箱', icon: 'T', repeatable: false, triggered: false, itemId: 'health_potion', qty: 4 },
          { id: 'volcano_chest2', r: 16, c: 3,  type: 'chest', text: '火焰晶石', icon: 'T', repeatable: false, triggered: false, itemId: 'tower_emblem', qty: 1 },
        ],
      },
    },
    // ── 港口（海上旅行節點）────────────────────
    {
      id: 'port_north',
      type: LOC_TYPE.PORT,
      wx: 18, wy: 10,
      label: '北方港',
      nationLabel: '雪域聯盟',
    },
    {
      id: 'port_west',
      type: LOC_TYPE.PORT,
      wx: 10, wy: 32,
      label: '西海港',
      nationLabel: '亞薩王國',
    },
    {
      id: 'port_south',
      type: LOC_TYPE.PORT,
      wx: 55, wy: 48,
      label: '南洋港',
      nationLabel: '沙漠帝國',
    },

    {
      id: 'temple_ancient',
      type: LOC_TYPE.TEMPLE,
      wx: 18, wy: 40,
      label: '古代神殿',
      dungeonCfg: {
        cols: 20, rows: 20,
        fixedRooms: [
          {
            r: 1, c: 1, w: 4, h: 3,
            events: [
              { id: 'temple_inscription', dr: 1, dc: 1, type: 'message', text: '石碑：「只有真正的勇者才能通過這道試煉...」', icon: '!', repeatable: false },
            ],
          },
          {
            r: 8, c: 8, w: 4, h: 4,
            events: [
              { id: 'temple_spirit', dr: 2, dc: 2, type: 'combat', text: '神殿守衛靈', icon: '!', repeatable: false, enemyId: 'skeleton' },
            ],
          },
          {
            r: 16, c: 14, w: 4, h: 4,
            events: [
              { id: 'temple_altar', dr: 1, dc: 1, type: 'chest', text: '聖壇祝福', icon: 'T', repeatable: false, itemId: 'health_potion', qty: 5 },
              { id: 'temple_boss', dr: 2, dc: 2, type: 'combat', text: '古代守護神', icon: '!', repeatable: false, enemyId: 'dungeon_boss' },
            ],
          },
        ],
        randomCount: 5,
        safeMin: 2, safeMax: 5,
        doorCount: 2, doorOpen: false,
        ambient: 0.03, torchRadius: 5,
        multiMap: true, floorCount: 3,
        globalEvents: [
          { id: 'temple_undead1', r: 4,  c: 8,  type: 'combat', text: '不死骸骨', icon: '!', repeatable: false, triggered: false, enemyId: 'skeleton' },
          { id: 'temple_undead2', r: 12, c: 4,  type: 'combat', text: '不死骸骨', icon: '!', repeatable: false, triggered: false, enemyId: 'skeleton' },
          { id: 'temple_relic',   r: 6,  c: 16, type: 'chest',  text: '古代聖物', icon: 'T', repeatable: false, triggered: false, itemId: 'cave_key', qty: 1 },
        ],
      },
    },
  ],
};

// ── 對話資料 ──────────────────────────────────
export const DIALOGUES = {
  king_speech: [
    { speaker: '亞薩國王', text: '勇者，歡迎來到亞薩王都！我國正面臨重重危機。' },
    { speaker: '亞薩國王', text: '北方的雪域聯盟態度強硬，東南方的沙漠帝國也虎視眈眈。' },
    { speaker: '亞薩國王', text: '更糟的是，古代神殿中的邪惡正在甦醒，火山地帶出現了異常活動。' },
    { speaker: '亞薩國王', text: '請先到冒險公會接取任務，善用城內的武器店與防具店強化裝備。', choices: [
      { text: '遵命，陛下！', next: null },
    ]},
  ],
  guild_master: [
    { speaker: '公會長', text: '歡迎來到冒險者公會！這裡有各種委託任務等待完成。' },
    { speaker: '公會長', text: '建議新手先去河畔城或東港城熟悉環境。' },
    { speaker: '公會長', text: '霜城要塞的冰雪狼很危險，要做好充分準備再去。', choices: [
      { text: '謝謝指引！', next: null },
    ]},
  ],
  riverside_elder: [
    { speaker: '河畔城城主', text: '這裡是亞薩王國西部的重要貿易城市，河流是我們的生命線。' },
    { speaker: '河畔城城主', text: '最近河岸附近出現了一些野獸，請小心行動。', choices: [
      { text: '我會注意的。', next: null },
    ]},
  ],
  harbor_captain: [
    { speaker: '港口長', text: '歡迎來到東港城！我們是亞薩王國最繁忙的港口。' },
    { speaker: '港口長', text: '最近有海盜在附近活動，城內也不安全，要小心。', choices: [
      { text: '多謝提醒！', next: null },
    ]},
  ],
  sultan_speech: [
    { speaker: '沙漠蘇丹', text: '外來者，你敢踏入沙漠帝國，勇氣可嘉。' },
    { speaker: '沙漠蘇丹', text: '我們的帝國統治著廣大的沙漠，擁有無盡的財富。' },
    { speaker: '沙漠蘇丹', text: '若你能通過火山洞窟的試煉，或許我能承認你的實力。', choices: [
      { text: '我會接受試煉的。', next: null },
    ]},
  ],
  frost_chief: [
    { speaker: '冰雪酋長', text: '外人，這裡是雪域聯盟的領土，輕易不接待外客。' },
    { speaker: '冰雪酋長', text: '我們世代守護北方的冰封秘密，不允許任何人破壞這片土地的寧靜。' },
    { speaker: '冰雪酋長', text: '若你是有誠意的冒險者，可以幫助我們清除入侵的怪物。', choices: [
      { text: '我願意幫忙。', next: null },
    ]},
  ],
  harbor_merchant: [
    { speaker: '海商', text: '東港城是買賣東西的好地方，這裡什麼都有！' },
    { speaker: '海商', text: '不過最近海上不太平，聽說南方有強盜船出沒。', choices: [
      { text: '多謝消息。', next: null },
    ]},
  ],
  oasis_elder: [
    { speaker: '綠洲長老', text: '這片綠洲是沙漠中的生命之源，我們在此生活了數百年。' },
    { speaker: '綠洲長老', text: '帝都的蘇丹雖然威嚴，但我們這裡的人更信賴自然的恩賜。', choices: [
      { text: '感謝指引。', next: null },
    ]},
  ],
  south_elder: [
    { speaker: '南境村村長', text: '歡迎到南境村！我們雖然是小村莊，但鄉親都很熱情。' },
    { speaker: '南境村村長', text: '王都在北邊，如果要買好武器的話，去河畔城比較方便。', choices: [
      { text: '謝謝指路。', next: null },
    ]},
  ],
  dune_guide: [
    { speaker: '商隊嚮導', text: '你好，旅人。這個聚落是穿越沙漠的必經之地。' },
    { speaker: '商隊嚮導', text: '記得補充水和食物再出發，沙漠可不是鬧著玩的。', choices: [
      { text: '我會注意的。', next: null },
    ]},
  ],
  icelake_elder: [
    { speaker: '漁夫長', text: '冰湖城靠著這片冰湖維生，每年冬天湖面結冰，我們就在上面鑿冰捕魚。' },
    { speaker: '漁夫長', text: '要去霜城要塞的話，往西北走就到了，不過路上小心冰雪狼。', choices: [
      { text: '謝謝告知。', next: null },
    ]},
  ],
  icelake_alchemist: [
    { speaker: '煉金師', text: '我研究這片土地的冰晶已有多年，其中蘊含著不可思議的魔法能量。' },
    { speaker: '煉金師', text: '若你找到特殊的礦石或藥草，歡迎拿來交換我調製的藥劑。', choices: [
      { text: '有機會一定來。', next: null },
    ]},
  ],
  peak_hunter: [
    { speaker: '獵人', text: '雪嶺村只是個小地方，沒什麼特別的。' },
    { speaker: '獵人', text: '但如果你要打怪練手，附近的森林裡有不少野獸可以試試身手。', choices: [
      { text: '了解了。', next: null },
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
  royal_weapon: {
    name: '皇家武器庫',
    inventory: ['steel_sword', 'iron_sword'],
  },
  royal_armor: {
    name: '皇家防具庫',
    inventory: ['leather_armor'],
  },
};

// ── 任務定義 ──────────────────────────────────
export const QUEST_DEFS = [
  {
    id: 'quest_frost_wolves',
    title: '驅逐冰雪狼',
    giverNpc: 'frost_chief',
    steps: [
      { desc: '前往霜城要塞', type: 'reach', locationId: 'capital_frost' },
      { desc: '消滅冰雪狼 (0/2)', type: 'kill', enemyId: 'bat', count: 2 },
    ],
    reward: { gold: 80, itemId: 'health_potion', qty: 3 },
  },
  {
    id: 'quest_volcano',
    title: '火山探索',
    giverNpc: 'sultan_speech',
    steps: [
      { desc: '進入火山洞窟', type: 'reach', locationId: 'dungeon_volcano' },
      { desc: '擊倒熔岩巨人', type: 'kill', enemyId: 'dungeon_boss', count: 1 },
    ],
    reward: { gold: 150, itemId: 'steel_sword', qty: 1 },
  },
  {
    id: 'quest_temple',
    title: '古代神殿的秘密',
    giverNpc: 'guild_master',
    steps: [
      { desc: '探索古代神殿', type: 'reach', locationId: 'temple_ancient' },
    ],
    reward: { gold: 200, itemId: 'tower_emblem', qty: 1 },
  },
];
