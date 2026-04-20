// ─────────────────────────────────────────────
//  supplySystem.js
//  商店庫存與供應鏈管理（純函數模組）
//
//  shopStocks  格式：{ [shopId]: { [itemId]: number } }
//  craftingQueue 格式：[{
//    id, shopId, itemId, dueAt,
//    outputQty, maxStock,
//    resourceId, resourceQty,   // null/0 = 自動補貨
//  }]
// ─────────────────────────────────────────────
import { SHOPS } from './world/shops.js';

let _jobCounter = 0;
function nextJobId() { return `job_${++_jobCounter}`; }

// ── 初始化 ────────────────────────────────────
// 從 SHOPS 定義建立初始庫存快照
export function initShopStocks() {
  const stocks = {};
  for (const [shopId, shopDef] of Object.entries(SHOPS)) {
    stocks[shopId] = {};
    for (const item of shopDef.inventory) {
      stocks[shopId][item.itemId] = item.stock;
    }
  }
  return stocks;
}

// ── 補貨需求檢查 ──────────────────────────────
// 掃描所有商店，對低庫存品種建立製作任務
// 回傳新增的 job 陣列（呼叫方 push 到 craftingQueue）
export function checkRestockNeeds(shopStocks, craftingQueue, totalGameMins) {
  const newJobs = [];

  for (const [shopId, shopDef] of Object.entries(SHOPS)) {
    const stocks = shopStocks[shopId];
    if (!stocks) continue;

    for (const item of shopDef.inventory) {
      const current = stocks[item.itemId] ?? 0;
      if (current > item.restockThreshold) continue;

      // 已有待執行的同類任務 → 跳過
      const alreadyQueued = craftingQueue.some(
        j => j.shopId === shopId && j.itemId === item.itemId
      );
      if (alreadyQueued) continue;

      const craftDays = item.supply ? item.supply.craftDays : 0.25;
      const outputQty = item.supply ? item.supply.outputQty : Math.ceil((item.maxStock - current) / 2 + 1);

      newJobs.push({
        id:          nextJobId(),
        shopId,
        itemId:      item.itemId,
        dueAt:       totalGameMins + craftDays * 1440,
        outputQty,
        maxStock:    item.maxStock,
        resourceId:  item.supply?.resourceId  ?? null,
        resourceQty: item.supply?.resourceQty ?? 0,
      });
    }
  }

  return newJobs;
}

// ── 處理到期製作任務 ──────────────────────────
// 將已到期的任務轉換為庫存，並從 queue 中移除
// 回傳完成的任務陣列（用於 toast 通知）
export function processCraftingQueue(shopStocks, craftingQueue, totalGameMins) {
  const completed = [];
  const remaining = [];

  for (const job of craftingQueue) {
    if (totalGameMins >= job.dueAt) {
      // 補貨
      const current = shopStocks[job.shopId]?.[job.itemId] ?? 0;
      if (shopStocks[job.shopId]) {
        shopStocks[job.shopId][job.itemId] = Math.min(
          current + job.outputQty,
          job.maxStock,
        );
      }
      completed.push(job);
    } else {
      remaining.push(job);
    }
  }

  // 就地修改 queue（保持 ref 穩定）
  craftingQueue.length = 0;
  for (const j of remaining) craftingQueue.push(j);

  return completed;
}

// ── 購買 ──────────────────────────────────────
// 執行玩家購買：扣金幣、減庫存
// 回傳 { success: bool, price: number, message: string }
export function buyFromShop(player, shopId, itemId, shopStocks) {
  const shopDef = SHOPS[shopId];
  if (!shopDef) return { success: false, message: '商店不存在' };

  const itemDef = shopDef.inventory.find(i => i.itemId === itemId);
  if (!itemDef) return { success: false, message: '商品不存在' };

  const stock = shopStocks[shopId]?.[itemId] ?? 0;
  if (stock <= 0) return { success: false, message: '目前缺貨' };

  const price = itemDef.price;
  if (player.gold < price) return { success: false, message: '金幣不足！' };

  player.gold -= price;
  shopStocks[shopId][itemId] = Math.max(0, stock - 1);

  return { success: true, price, message: '' };
}

// ── 工具：取得商品當前庫存 ────────────────────
export function getStock(shopId, itemId, shopStocks) {
  return shopStocks?.[shopId]?.[itemId] ?? 0;
}

// ── 工具：取得商品的製作進度（剩餘分鐘）──────
export function getCraftingProgress(shopId, itemId, craftingQueue, totalGameMins) {
  const job = craftingQueue.find(j => j.shopId === shopId && j.itemId === itemId);
  if (!job) return null;
  return Math.max(0, job.dueAt - totalGameMins);
}
