// ─────────────────────────────────────────────
//  enemyData.jsx
//  靜態敵人目錄
// ─────────────────────────────────────────────

export const ENEMIES = {
  bat: {
    name: '洞穴蝙蝠', icon: '🦇',
    hp: 18, atk: 5, def: 0,
    exp: 8,
    loot: [], // 無掉落
    desc: '棲息在洞穴中的蝙蝠，動作敏捷。',
  },
  cave_boss: {
    name: '巨型蝙蝠', icon: '🦇',
    hp: 60, atk: 12, def: 3,
    exp: 40,
    loot: [
      { itemId: 'health_potion', qty: 2, rate: 1.0 },
    ],
    desc: '洞穴深處的變異蝙蝠，體型是普通蝙蝠的五倍。',
  },
  goblin: {
    name: '哥布林', icon: '👺',
    hp: 30, atk: 8, def: 2,
    exp: 15,
    loot: [
      { itemId: 'gold', qty: 10, rate: 1.0 },
    ],
    desc: '貪婪的小型綠皮惡魔，常成群出沒。',
  },
  skeleton: {
    name: '骷髏士兵', icon: '💀',
    hp: 45, atk: 12, def: 5,
    exp: 25,
    loot: [
      { itemId: 'iron_sword', qty: 1, rate: 0.25 },
      { itemId: 'gold',       qty: 15, rate: 1.0  },
    ],
    desc: '被詛咒的骷髏兵，手持生鏽的武器繼續守衛。',
  },
  dungeon_boss: {
    name: '地洞守衛', icon: '👹',
    hp: 200, atk: 25, def: 15,
    exp: 200,
    loot: [
      { itemId: 'dungeon_seal', qty: 1, rate: 1.0 },
      { itemId: 'dark_blade',   qty: 1, rate: 0.5 },
      { itemId: 'gold',         qty: 100, rate: 1.0 },
    ],
    desc: '封印在深淵地洞中的古代惡魔守衛，力量強大。',
  },
};
