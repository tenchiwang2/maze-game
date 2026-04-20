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

// ═════════════════════════════════════════════
//  資源採集節點
//  nodeStates 格式：{ [nodeId]: { harvestedAt: number | null } }
// ═════════════════════════════════════════════
import { RESOURCE_NODES } from './world/resources.js';
import { ITEMS } from './itemData.jsx';

// 初始化所有節點狀態（全部可採集）
export function initResourceNodes() {
  const states = {};
  for (const node of RESOURCE_NODES) {
    states[node.id] = { harvestedAt: null };
  }
  return states;
}

// 取得靠近的可採集節點（距離 <= proximityDist 格）
export function getNearbyResourceNode(nodeStates, wx, wy, totalGameMins, proximityDist = 1.5) {
  for (const node of RESOURCE_NODES) {
    const dx = wx - (node.wx + 0.5);
    const dy = wy - (node.wy + 0.5);
    if (dx * dx + dy * dy > proximityDist * proximityDist) continue;
    const state = nodeStates[node.id];
    if (!state) continue;
    return { node, state, ready: isNodeReady(node, state, totalGameMins) };
  }
  return null;
}

// 節點是否可採集
export function isNodeReady(node, state, totalGameMins) {
  if (state.harvestedAt === null) return true;
  return (totalGameMins - state.harvestedAt) >= node.respawnDays * 1440;
}

// 採集節點：加入物品到背包（強制執行 stackLimit），回傳結果訊息
// 回傳 { harvested: number, blocked: number, message: string } 或 null（無法採集）
export function harvestNode(player, nodeId, nodeStates, totalGameMins) {
  const node = RESOURCE_NODES.find(n => n.id === nodeId);
  if (!node) return null;

  const state = nodeStates[node.id];
  if (!state || !isNodeReady(node, state, totalGameMins)) return null;

  const item = ITEMS[node.resourceId];
  const stackLimit = item?.stackLimit ?? Infinity;

  // 計算背包中已有數量
  const existing = player.items.find(i => i.itemId === node.resourceId);
  const have = existing?.qty ?? 0;
  const canTake = Math.min(node.qty, stackLimit - have);

  if (canTake <= 0) {
    return { harvested: 0, blocked: node.qty, message: `${item?.name ?? node.resourceId} 已達到攜帶上限（${stackLimit}）` };
  }

  // 加入背包
  if (existing) {
    existing.qty += canTake;
  } else {
    player.items.push({ itemId: node.resourceId, qty: canTake });
  }

  // 標記採集時間
  state.harvestedAt = totalGameMins;

  const blocked = node.qty - canTake;
  const msg = blocked > 0
    ? `採集了 ${item?.name} ×${canTake}（背包空間不足，遺留 ${blocked}）`
    : `採集了 ${item?.name} ×${canTake}`;

  return { harvested: canTake, blocked, message: msg };
}

// 取得節點剩餘冷卻時間（分鐘），0 = 可採集
export function getNodeCooldown(node, state, totalGameMins) {
  if (!state || state.harvestedAt === null) return 0;
  const elapsed = totalGameMins - state.harvestedAt;
  return Math.max(0, node.respawnDays * 1440 - elapsed);
}
