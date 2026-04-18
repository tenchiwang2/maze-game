// ─────────────────────────────────────────────
//  itemData.jsx
//  靜態物品目錄
// ─────────────────────────────────────────────

export const ITEMS = {
  // ── 武器 ──
  iron_sword: {
    name: '鐵劍', type: 'weapon', icon: '⚔',
    atk: 8, value: 50,
    desc: '平凡的鐵打長劍，適合初心者。',
  },
  steel_sword: {
    name: '鋼劍', type: 'weapon', icon: '⚔',
    atk: 18, value: 150,
    desc: '精鋼鑄造，鋒利耐用。',
  },
  dark_blade: {
    name: '暗黑之刃', type: 'weapon', icon: '⚔',
    atk: 30, value: 400,
    desc: '從深淵地洞中取得，散發黑暗氣息。',
  },

  // ── 防具 ──
  leather_armor: {
    name: '皮甲', type: 'armor', icon: '🛡',
    def: 6, value: 40,
    desc: '輕便的皮革護甲，提供基礎防護。',
  },
  chain_armor: {
    name: '鏈甲', type: 'armor', icon: '🛡',
    def: 14, value: 200,
    desc: '由鋼環連接而成，防護效果優良。',
  },

  // ── 消耗品 ──
  health_potion: {
    name: '恢復藥水', type: 'consumable', icon: '🧪',
    heal: 40, value: 20,
    desc: '恢復 40 點 HP。',
  },
  hi_potion: {
    name: '特效藥水', type: 'consumable', icon: '🧪',
    heal: 100, value: 60,
    desc: '恢復 100 點 HP。',
  },
  mp_potion: {
    name: 'MP 藥水', type: 'consumable', icon: '🔮',
    healMp: 20, value: 25,
    desc: '恢復 20 點 MP。',
  },

  // ── 鑰匙類 ──
  cave_key: {
    name: '洞窟鑰匙', type: 'key', icon: '🗝',
    value: 0,
    desc: '通往洞穴深處的鑰匙。',
  },

  // ── 任務道具 ──
  tower_emblem: {
    name: '高塔徽章', type: 'quest', icon: '🏅',
    value: 0,
    desc: '古老高塔守衛持有的徽章，證明你已登頂。',
  },
  dungeon_seal: {
    name: '地洞封印', type: 'quest', icon: '🔮',
    value: 0,
    desc: '封印著地洞守衛的力量，散發黑暗能量。',
  },

  // ── 金幣（特殊：用於戰鬥掉落） ──
  gold: {
    name: '金幣', type: 'gold', icon: '🪙',
    value: 1,
    desc: '通用貨幣。',
  },
};
