// ─────────────────────────────────────────────
//  world/shops.js
//  商店定義資料
//
//  inventory 欄位格式：
//    itemId            – 對應 ITEMS key
//    price             – 購買售價（可覆蓋 ITEMS.value）
//    stock / maxStock  – 初始/最大庫存（runtime 由 supplySystem 管理）
//    restockThreshold  – 庫存降至此值時觸發補貨
//    supply            – 補貨供應鏈設定，null 代表自動定時補貨
//      resourceId      – 需要的資源 itemId
//      resourceQty     – 每批次消耗資源數量
//      outputQty       – 每批次產出物品數量
//      craftDays       – 製作耗時（遊戲天數）
// ─────────────────────────────────────────────

export const SHOPS = {
  // ── 雜貨店（各地共用模板） ──────────────────
  general_store: {
    name: '雜貨店',
    inventory: [
      {
        itemId: 'health_potion', price: 20,
        stock: 6, maxStock: 8, restockThreshold: 2,
        supply: { resourceId: 'wild_herb', resourceQty: 4, outputQty: 4, craftDays: 1 },
      },
      {
        itemId: 'hi_potion', price: 60,
        stock: 2, maxStock: 4, restockThreshold: 1,
        supply: { resourceId: 'wild_herb', resourceQty: 8, outputQty: 2, craftDays: 2 },
      },
      {
        itemId: 'mp_potion', price: 25,
        stock: 4, maxStock: 6, restockThreshold: 2,
        supply: { resourceId: 'wild_herb', resourceQty: 2, outputQty: 3, craftDays: 1 },
      },
      {
        itemId: 'torch', price: 15,
        stock: 8, maxStock: 12, restockThreshold: 3,
        supply: null,   // 自動補貨，無需原料
      },
    ],
  },

  // ── 武器鐵匠 ────────────────────────────────
  weapon_shop: {
    name: '武器鐵匠',
    inventory: [
      {
        itemId: 'iron_sword', price: 55,
        stock: 3, maxStock: 5, restockThreshold: 1,
        supply: { resourceId: 'iron_ore', resourceQty: 5, outputQty: 2, craftDays: 2 },
      },
      {
        itemId: 'steel_sword', price: 160,
        stock: 2, maxStock: 3, restockThreshold: 1,
        supply: { resourceId: 'iron_ore', resourceQty: 10, outputQty: 1, craftDays: 3 },
      },
    ],
  },

  // ── 防具商人 ────────────────────────────────
  armor_shop: {
    name: '防具商人',
    inventory: [
      {
        itemId: 'leather_armor', price: 45,
        stock: 3, maxStock: 4, restockThreshold: 1,
        supply: { resourceId: 'iron_ore', resourceQty: 3, outputQty: 2, craftDays: 2 },
      },
      {
        itemId: 'torch', price: 15,
        stock: 6, maxStock: 10, restockThreshold: 2,
        supply: null,
      },
      {
        itemId: 'lantern', price: 65,
        stock: 3, maxStock: 5, restockThreshold: 1,
        supply: { resourceId: 'iron_ore', resourceQty: 4, outputQty: 2, craftDays: 2 },
      },
    ],
  },

  // ── 皇家武器庫（亞薩王都限定） ──────────────
  royal_weapon: {
    name: '皇家武器庫',
    inventory: [
      {
        itemId: 'iron_sword', price: 60,
        stock: 3, maxStock: 5, restockThreshold: 1,
        supply: { resourceId: 'iron_ore', resourceQty: 5, outputQty: 2, craftDays: 2 },
      },
      {
        itemId: 'steel_sword', price: 180,
        stock: 2, maxStock: 4, restockThreshold: 1,
        supply: { resourceId: 'iron_ore', resourceQty: 12, outputQty: 2, craftDays: 3 },
      },
      {
        itemId: 'dark_blade', price: 400,
        stock: 1, maxStock: 2, restockThreshold: 0,
        supply: { resourceId: 'ice_crystal_ore', resourceQty: 8, outputQty: 1, craftDays: 5 },
      },
    ],
  },

  // ── 皇家防具庫（亞薩王都限定） ──────────────
  royal_armor: {
    name: '皇家防具庫',
    inventory: [
      {
        itemId: 'leather_armor', price: 50,
        stock: 3, maxStock: 5, restockThreshold: 1,
        supply: { resourceId: 'iron_ore', resourceQty: 3, outputQty: 2, craftDays: 2 },
      },
      {
        itemId: 'chain_armor', price: 220,
        stock: 2, maxStock: 3, restockThreshold: 1,
        supply: { resourceId: 'iron_ore', resourceQty: 15, outputQty: 1, craftDays: 4 },
      },
      {
        itemId: 'lantern', price: 70,
        stock: 3, maxStock: 5, restockThreshold: 1,
        supply: { resourceId: 'iron_ore', resourceQty: 4, outputQty: 2, craftDays: 2 },
      },
    ],
  },
};
