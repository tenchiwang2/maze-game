// ─────────────────────────────────────────────
//  itemData.jsx
//  靜態物品目錄
// ─────────────────────────────────────────────

export const ITEM_CATEGORY = {
  CONSUMABLE: 'consumable', // 消耗品
  EQUIPMENT:  'equipment',  // 裝備
  QUEST:      'quest',      // 任務用品
};

export const ITEMS = {
  // ── 武器（裝備） ──────────────────────────────
  iron_sword: {
    name: '鐵劍', type: 'weapon', category: ITEM_CATEGORY.EQUIPMENT, icon: '⚔',
    atk: 8, value: 50,
    desc: '平凡的鐵打長劍，適合初心者。',
  },
  steel_sword: {
    name: '鋼劍', type: 'weapon', category: ITEM_CATEGORY.EQUIPMENT, icon: '⚔',
    atk: 18, value: 150,
    desc: '精鋼鑄造，鋒利耐用。',
  },
  dark_blade: {
    name: '暗黑之刃', type: 'weapon', category: ITEM_CATEGORY.EQUIPMENT, icon: '⚔',
    atk: 30, value: 400,
    desc: '從深淵地洞中取得，散發黑暗氣息。',
  },

  // ── 防具（裝備） ──────────────────────────────
  leather_armor: {
    name: '皮甲', type: 'armor', category: ITEM_CATEGORY.EQUIPMENT, icon: '🛡',
    def: 6, value: 40,
    desc: '輕便的皮革護甲，提供基礎防護。',
  },
  chain_armor: {
    name: '鏈甲', type: 'armor', category: ITEM_CATEGORY.EQUIPMENT, icon: '🛡',
    def: 14, value: 200,
    desc: '由鋼環連接而成，防護效果優良。',
  },

  // ── 光源（消耗品） ────────────────────────────
  torch: {
    name: '火把', type: 'consumable', category: ITEM_CATEGORY.CONSUMABLE, icon: '🔥',
    lightRadius: 16, lightAmbient: 0.06, lightDuration: 30, value: 15,
    desc: '燃燒 30 分鐘，照明範圍擴大為平時的 2 倍。',
  },
  lantern: {
    name: '提燈', type: 'consumable', category: ITEM_CATEGORY.CONSUMABLE, icon: '🏮',
    lightRadius: 22, lightAmbient: 0.10, lightDuration: 120, value: 60,
    desc: '穩定的油燈，照明範圍約 2.7 倍，持續 120 分鐘。',
  },
  night_pearl: {
    name: '夜明珠', type: 'consumable', category: ITEM_CATEGORY.CONSUMABLE, icon: '💎',
    lightRadius: 32, lightAmbient: 0.18, lightDuration: Infinity, value: 10000,
    noConsume: true,
    desc: '稀有寶珠，能將黑暗化為白晝，效果永久持續，且不會消耗。',
  },

  // ── 消耗品 ────────────────────────────────────
  health_potion: {
    name: '恢復藥水', type: 'consumable', category: ITEM_CATEGORY.CONSUMABLE, icon: '🧪',
    heal: 40, value: 20,
    desc: '恢復 40 點 HP。',
  },
  hi_potion: {
    name: '特效藥水', type: 'consumable', category: ITEM_CATEGORY.CONSUMABLE, icon: '🧪',
    heal: 100, value: 60,
    desc: '恢復 100 點 HP。',
  },
  mp_potion: {
    name: 'MP 藥水', type: 'consumable', category: ITEM_CATEGORY.CONSUMABLE, icon: '🔮',
    healMp: 20, value: 25,
    desc: '恢復 20 點 MP。',
  },

  // ── 任務用品 ──────────────────────────────────
  cave_key: {
    name: '洞窟鑰匙', type: 'key', category: ITEM_CATEGORY.QUEST, icon: '🗝',
    value: 0,
    desc: '通往洞穴深處的鑰匙。',
  },
  tower_emblem: {
    name: '高塔徽章', type: 'quest', category: ITEM_CATEGORY.QUEST, icon: '🏅',
    value: 0,
    desc: '古老高塔守衛持有的徽章，證明你已登頂。',
  },
  dungeon_seal: {
    name: '地洞封印', type: 'quest', category: ITEM_CATEGORY.QUEST, icon: '🔮',
    value: 0,
    desc: '封印著地洞守衛的力量，散發黑暗能量。',
  },

  // ── 金幣（戰鬥掉落用，不顯示在背包） ──────────
  gold: {
    name: '金幣', type: 'gold', category: null, icon: '🪙',
    value: 1,
    desc: '通用貨幣。',
  },
};
