// ─────────────────────────────────────────────
//  supplySystem.js
//  商店庫存、供應鏈、採集節點（純函數模組）
//
//  shopStocks    格式：{ [shopId]: { [itemId]: number } }
//  craftingQueue 格式：[{ id, shopId, itemId, dueAt, outputQty, maxStock, resourceId, resourceQty }]
//  supplyQuests  格式：[{ id, shopId, shopName, itemId, resourceId, resourceQty,
//                         outputQty, craftDays, reward:{gold}, timeLimitMins,
//                         status:'open'|'accepted'|'done', postedAt, acceptedAt }]
//  nodeStates    格式：{ [nodeId]: { harvestedAt: number | null } }
// ─────────────────────────────────────────────
import { SHOPS } from './world/shops.js';
import { RESOURCE_NODES } from './world/resources.js';
import { ITEMS } from './itemData.jsx';

let _jobCounter = 0;
let _sqCounter  = 0;
function nextJobId() { return `job_${++_jobCounter}`; }
function nextSqId()  { return `sq_${++_sqCounter}`;  }

// ═════════════════════════════════════════════
//  商店庫存
// ═════════════════════════════════════════════

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

// ── 補貨需求檢查（自動補貨 fallback）────────────
// 掃描所有商店，對低庫存品種建立製作任務
// 如果有玩家已接受的補貨任務 → 等玩家交付，不排程自動補貨
// 如果有公開的補貨任務且不滿 2 天 → 等玩家接任務
// 否則 → 自動補貨
export function checkRestockNeeds(shopStocks, craftingQueue, supplyQuests, totalGameMins) {
  const newJobs = [];

  for (const [shopId, shopDef] of Object.entries(SHOPS)) {
    const stocks = shopStocks[shopId];
    if (!stocks) continue;

    for (const item of shopDef.inventory) {
      const current = stocks[item.itemId] ?? 0;
      if (current > item.restockThreshold) continue;

      // 已有製作任務 → 跳過
      if (craftingQueue.some(j => j.shopId === shopId && j.itemId === item.itemId)) continue;

      // 玩家已接補貨任務 → 等交付，不自動補
      if (supplyQuests?.some(q =>
        q.shopId === shopId && q.itemId === item.itemId && q.status === 'accepted'
      )) continue;

      // 公開任務發布不滿 2 天 → 等玩家接單
      const openQuest = supplyQuests?.find(q =>
        q.shopId === shopId && q.itemId === item.itemId && q.status === 'open'
      );
      if (openQuest && (totalGameMins - openQuest.postedAt) < 2880) continue;

      // 自動補貨（兜底）
      const craftDays = item.supply ? item.supply.craftDays : 0.25;
      const outputQty = item.supply
        ? item.supply.outputQty
        : Math.ceil((item.maxStock - current) / 2 + 1);

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
export function processCraftingQueue(shopStocks, craftingQueue, totalGameMins) {
  const completed = [];
  const remaining = [];

  for (const job of craftingQueue) {
    if (totalGameMins >= job.dueAt) {
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

  craftingQueue.length = 0;
  for (const j of remaining) craftingQueue.push(j);

  return completed;
}

// ── 購買 ──────────────────────────────────────
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

// ── 工具 ──────────────────────────────────────
export function getStock(shopId, itemId, shopStocks) {
  return shopStocks?.[shopId]?.[itemId] ?? 0;
}

export function getCraftingProgress(shopId, itemId, craftingQueue, totalGameMins) {
  const job = craftingQueue.find(j => j.shopId === shopId && j.itemId === itemId);
  if (!job) return null;
  return Math.max(0, job.dueAt - totalGameMins);
}

// ═════════════════════════════════════════════
//  補貨任務（Supply Quests） — Phase 3
//
//  status 流程：open → accepted → done（或逾時 → open）
// ═════════════════════════════════════════════

// 掃描低庫存，產生補貨任務（若尚無對應任務）
// 回傳新增的任務陣列（呼叫方 push 到 supplyQuests）
export function generateSupplyQuests(shopStocks, supplyQuests, totalGameMins) {
  const newQuests = [];

  for (const [shopId, shopDef] of Object.entries(SHOPS)) {
    const stocks = shopStocks[shopId];
    if (!stocks) continue;

    for (const item of shopDef.inventory) {
      if (!item.supply) continue; // 無需供應鏈的商品不發任務
      const current = stocks[item.itemId] ?? 0;
      if (current > item.restockThreshold) continue;

      // 已有進行中任務 → 跳過
      if (supplyQuests.some(q =>
        q.shopId === shopId && q.itemId === item.itemId && q.status !== 'done'
      )) continue;

      const resource = ITEMS[item.supply.resourceId];
      const itemDef  = ITEMS[item.itemId];
      // 獎勵 = 資源數量 × 8g（略高於採集售出價值）
      const reward = item.supply.resourceQty * 8;

      newQuests.push({
        id:          `sq_${shopId}_${item.itemId}_${nextSqId()}`,
        shopId,
        shopName:    shopDef.name,
        itemId:      item.itemId,
        itemName:    itemDef?.name   ?? item.itemId,
        itemIcon:    itemDef?.icon   ?? '📦',
        resourceId:  item.supply.resourceId,
        resourceName: resource?.name ?? item.supply.resourceId,
        resourceIcon: resource?.icon ?? '🌿',
        resourceQty:  item.supply.resourceQty,
        outputQty:    item.supply.outputQty,
        craftDays:    item.supply.craftDays,
        reward:       { gold: reward },
        timeLimitMins: 4320,   // 3 天期限
        status:       'open',
        postedAt:     totalGameMins,
        acceptedAt:   null,
      });
    }
  }

  return newQuests;
}

// 玩家接受補貨任務
export function acceptSupplyQuest(questId, supplyQuests, totalGameMins) {
  const q = supplyQuests.find(sq => sq.id === questId && sq.status === 'open');
  if (!q) return false;
  q.status     = 'accepted';
  q.acceptedAt = totalGameMins;
  return true;
}

// 當玩家打開商店時：自動嘗試交付符合條件的補貨任務
// - 檢查玩家已接受的任務，若有足夠資源則完成交付
// - 取消對應的自動補貨 job（避免雙重補貨）
// - 立即補充庫存（不走製作倒數）
// 回傳完成的任務陣列
export function tryDeliverSupplyQuests(player, shopId, supplyQuests, craftingQueue, shopStocks, totalGameMins) {
  const delivered = [];

  for (const q of supplyQuests) {
    if (q.shopId !== shopId || q.status !== 'accepted') continue;

    // 確認玩家有足夠資源
    const slot = player.items.find(i => i.itemId === q.resourceId);
    if (!slot || slot.qty < q.resourceQty) continue;

    // 扣除資源
    slot.qty -= q.resourceQty;
    if (slot.qty <= 0) {
      player.items.splice(player.items.indexOf(slot), 1);
    }

    // 發放獎勵
    player.gold += q.reward.gold;

    // 取消對應的自動補貨 job（如有）
    const jobIdx = craftingQueue.findIndex(j => j.shopId === shopId && j.itemId === q.itemId);
    if (jobIdx >= 0) craftingQueue.splice(jobIdx, 1);

    // 立即補充庫存
    const itemDef = SHOPS[shopId]?.inventory.find(i => i.itemId === q.itemId);
    const maxStock = itemDef?.maxStock ?? 8;
    const current  = shopStocks[shopId]?.[q.itemId] ?? 0;
    if (shopStocks[shopId]) {
      shopStocks[shopId][q.itemId] = Math.min(current + q.outputQty, maxStock);
    }

    q.status = 'done';
    delivered.push(q);
  }

  return delivered;
}

// 逾時的已接任務 → 重新設為 open（退回市場）
export function checkExpiredSupplyQuests(supplyQuests, totalGameMins) {
  const expired = [];
  for (const q of supplyQuests) {
    if (q.status !== 'accepted') continue;
    const elapsed = totalGameMins - (q.acceptedAt ?? totalGameMins);
    if (elapsed >= q.timeLimitMins) {
      q.status     = 'open';
      q.acceptedAt = null;
      expired.push(q);
    }
  }
  return expired;
}

// 玩家接受的任務中，是否有某個商店的任務且帶著所需資源（用於 HUD 提示）
export function getDeliverableQuests(player, shopId, supplyQuests) {
  return supplyQuests.filter(q => {
    if (q.shopId !== shopId || q.status !== 'accepted') return false;
    const slot = player.items.find(i => i.itemId === q.resourceId);
    return slot && slot.qty >= q.resourceQty;
  });
}

// 取得玩家持有的資源數量（供 UI 顯示）
export function getPlayerResourceQty(player, resourceId) {
  return player.items.find(i => i.itemId === resourceId)?.qty ?? 0;
}

// ═════════════════════════════════════════════
//  資源採集節點
//  nodeStates 格式：{ [nodeId]: { harvestedAt: number | null } }
// ═════════════════════════════════════════════

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

// 採集節點：加入物品到背包（強制執行 stackLimit），回傳結果
export function harvestNode(player, nodeId, nodeStates, totalGameMins) {
  const node = RESOURCE_NODES.find(n => n.id === nodeId);
  if (!node) return null;

  const state = nodeStates[node.id];
  if (!state || !isNodeReady(node, state, totalGameMins)) return null;

  const item       = ITEMS[node.resourceId];
  const stackLimit = item?.stackLimit ?? Infinity;
  const existing   = player.items.find(i => i.itemId === node.resourceId);
  const have       = existing?.qty ?? 0;
  const canTake    = Math.min(node.qty, stackLimit - have);

  if (canTake <= 0) {
    return {
      harvested: 0, blocked: node.qty,
      message: `${item?.name ?? node.resourceId} 已達到攜帶上限（${stackLimit}）`,
    };
  }

  if (existing) {
    existing.qty += canTake;
  } else {
    player.items.push({ itemId: node.resourceId, qty: canTake });
  }

  state.harvestedAt = totalGameMins;

  const blocked = node.qty - canTake;
  return {
    harvested: canTake, blocked,
    message: blocked > 0
      ? `採集了 ${item?.name} ×${canTake}（背包空間不足，遺留 ${blocked}）`
      : `採集了 ${item?.name} ×${canTake}`,
  };
}

// 取得節點剩餘冷卻時間（分鐘），0 = 可採集
export function getNodeCooldown(node, state, totalGameMins) {
  if (!state || state.harvestedAt === null) return 0;
  const elapsed = totalGameMins - state.harvestedAt;
  return Math.max(0, node.respawnDays * 1440 - elapsed);
}
