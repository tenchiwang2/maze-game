// ─────────────────────────────────────────────
//  playerState.jsx
//  玩家 RPG 狀態管理（純函數模組）
//  不含 React，不含渲染邏輯
// ─────────────────────────────────────────────
import { ITEMS } from './itemData.jsx';

// 建立初始玩家狀態
export function createPlayer() {
  return {
    hp: 100, maxHp: 100,
    mp: 30,  maxMp: 30,
    atk: 10, def: 5, spd: 8,
    lv: 1, exp: 0,
    gold: 50,
    items: [],              // [{ itemId: string, qty: number }]
    equipped: { weapon: null, armor: null },
    quests: [],             // [{ questId, stepIdx, completed, progress: {} }]
    killCounts: {},         // { enemyId: count }
    lightBuff: null,        // { torchRadius, ambient, startedAt, duration, icon, name } 或 null
  };
}

// ── 經驗值與升等 ─────────────────────────────
// 回傳 { leveled: boolean, messages: string[] }
export function gainExp(player, amount) {
  player.exp += amount;
  const messages = [];
  let leveled = false;
  let safety = 0;
  while (player.exp >= expForLevel(player.lv) && safety++ < 20) {
    player.exp -= expForLevel(player.lv);
    player.lv++;
    player.maxHp += 20;
    player.hp = Math.min(player.hp + 20, player.maxHp);
    player.maxMp += 5;
    player.mp = Math.min(player.mp + 5, player.maxMp);
    player.atk += 3;
    player.def += 2;
    leveled = true;
    messages.push(`升等！等級提升到 ${player.lv}！HP+20 ATK+3 DEF+2`);
  }
  return { leveled, messages };
}

function expForLevel(lv) {
  return lv * 100;
}

// ── 物品管理 ─────────────────────────────────
export function addItem(player, itemId, qty = 1) {
  if (itemId === 'gold') { player.gold += qty; return; }
  const existing = player.items.find(i => i.itemId === itemId);
  if (existing) { existing.qty += qty; }
  else { player.items.push({ itemId, qty }); }
}

export function removeItem(player, itemId, qty = 1) {
  if (itemId === 'gold') {
    if (player.gold < qty) return false;
    player.gold -= qty;
    return true;
  }
  const idx = player.items.findIndex(i => i.itemId === itemId);
  if (idx < 0 || player.items[idx].qty < qty) return false;
  player.items[idx].qty -= qty;
  if (player.items[idx].qty <= 0) player.items.splice(idx, 1);
  return true;
}

// 使用消耗品，回傳效果說明 string[] 或 null（失敗）
export function useItem(player, itemId, currentGameTime = 0) {
  const item = ITEMS[itemId];
  if (!item || item.type !== 'consumable') return null;
  if (item.noConsume) {
    // 不消耗物品，但需確認背包中有此物品
    if (!player.items.some(i => i.itemId === itemId && i.qty > 0)) return null;
  } else {
    if (!removeItem(player, itemId, 1)) return null;
  }

  const msgs = [];
  if (item.heal) {
    const actual = Math.min(item.heal, player.maxHp - player.hp);
    player.hp += actual;
    msgs.push(`HP 恢復 ${actual} 點（${player.hp}/${player.maxHp}）`);
  }
  if (item.healMp) {
    const actual = Math.min(item.healMp, player.maxMp - player.mp);
    player.mp += actual;
    msgs.push(`MP 恢復 ${actual} 點（${player.mp}/${player.maxMp}）`);
  }
  if (item.lightRadius) {
    const isInfinite = item.lightDuration === Infinity;
    // 若已有光源 buff，取較強的
    if (!player.lightBuff || item.lightRadius > player.lightBuff.torchRadius) {
      player.lightBuff = {
        torchRadius: item.lightRadius,
        ambient:     item.lightAmbient ?? 0.06,
        startedAt:   currentGameTime,          // 開始時間（遊戲分鐘）
        duration:    item.lightDuration,       // 持續時間（Infinity = 永久）
        icon:        item.icon,
        name:        item.name,
      };
    }
    msgs.push(`使用了 ${item.name}，照明增強${isInfinite ? '（永久）' : ` ${item.lightDuration} 分鐘`}`);
  }
  return msgs;
}

// 裝備武器/防具，自動解除舊裝備
export function equipItem(player, itemId) {
  const item = ITEMS[itemId];
  if (!item || (item.type !== 'weapon' && item.type !== 'armor')) return null;
  const slot = item.type === 'weapon' ? 'weapon' : 'armor';

  // 卸下現有裝備
  const oldId = player.equipped[slot];
  if (oldId) {
    const old = ITEMS[oldId];
    if (old) {
      if (slot === 'weapon') player.atk -= old.atk || 0;
      if (slot === 'armor')  player.def -= old.def || 0;
    }
    addItem(player, oldId, 1);
  }

  // 裝備新物品
  if (!removeItem(player, itemId, 1)) return null;
  player.equipped[slot] = itemId;
  if (slot === 'weapon') player.atk += item.atk || 0;
  if (slot === 'armor')  player.def += item.def || 0;

  return `裝備了 ${item.name}`;
}

export function hasItem(player, itemId) {
  if (itemId === 'gold') return player.gold > 0;
  return player.items.some(i => i.itemId === itemId && i.qty > 0);
}

export function getItemQty(player, itemId) {
  if (itemId === 'gold') return player.gold;
  return player.items.find(i => i.itemId === itemId)?.qty || 0;
}

// ── 任務系統 ─────────────────────────────────
export function addQuest(player, questDef, totalGameMins = 0) {
  // 已存在且未 claimed → 不重複接
  const existing = player.quests.find(q => q.questId === questDef.id);
  if (existing && !existing.claimed) return;
  // repeatable 且已 claimed → 允許重新接（移除舊記錄）
  if (existing && existing.claimed) {
    const idx = player.quests.indexOf(existing);
    if (idx >= 0) player.quests.splice(idx, 1);
  }
  player.quests.push({
    questId:    questDef.id,
    stepIdx:    0,
    completed:  false,
    claimed:    false,          // ← 已領獎才設為 true
    failed:     false,          // ← 超時失敗
    progress:   {},             // { [stepIdx]: current }
    acceptedAt: totalGameMins,  // 接任務時的總遊戲分鐘數
  });
}

// 檢查所有進行中任務是否超時，回傳失敗的任務 def 陣列
export function checkExpiredQuests(player, questDefs, totalGameMins) {
  const failed = [];
  for (const q of player.quests) {
    if (q.completed || q.claimed || q.failed) continue;
    const def = questDefs.find(d => d.id === q.questId);
    if (!def || !def.timeLimitMins) continue;
    const elapsed = totalGameMins - q.acceptedAt;
    if (elapsed >= def.timeLimitMins) {
      q.failed = true;
      failed.push(def);
    }
  }
  return failed;
}

// 領取任務獎勵，回傳 reward 物件（或 null 若不可領）
export function claimReward(player, questDef) {
  const qState = player.quests.find(
    q => q.questId === questDef.id && q.completed && !q.claimed
  );
  if (!qState) return null;
  qState.claimed = true;

  const r = questDef.reward ?? {};
  if (r.gold) addItem(player, 'gold', r.gold);
  (r.items ?? []).forEach(({ itemId, qty }) => addItem(player, itemId, qty));
  // exp 由呼叫方用 gainExp() 處理，這裡回傳 exp 值
  return r;
}

// 檢查指定步驟是否完成，完成則推進
export function checkQuestStep(player, questDef, eventType, eventData) {
  const qState = player.quests.find(q => q.questId === questDef.id && !q.completed);
  if (!qState) return false;
  const step = questDef.steps[qState.stepIdx];
  if (!step) return false;

  if (step.type === 'reach' && eventType === 'reach' && eventData.locationId === step.locationId) {
    qState.stepIdx++;
    if (qState.stepIdx >= questDef.steps.length) qState.completed = true;
    return true;
  }
  if (step.type === 'kill' && eventType === 'kill' && eventData.enemyId === step.enemyId) {
    qState.progress[qState.stepIdx] = (qState.progress[qState.stepIdx] || 0) + 1;
    if (qState.progress[qState.stepIdx] >= step.count) {
      qState.stepIdx++;
      if (qState.stepIdx >= questDef.steps.length) qState.completed = true;
      return true;
    }
  }
  if (step.type === 'collect' && eventType === 'collect' && eventData.itemId === step.itemId) {
    qState.stepIdx++;
    if (qState.stepIdx >= questDef.steps.length) qState.completed = true;
    return true;
  }
  // report：找到世界 NPC（dialogueId 對應）時完成
  if (step.type === 'report' && eventType === 'report' && eventData.npcId === step.npcId) {
    qState.stepIdx++;
    if (qState.stepIdx >= questDef.steps.length) qState.completed = true;
    return true;
  }
  return false;
}

// 記錄擊殺（供任務進度追蹤）
export function recordKill(player, enemyId) {
  player.killCounts[enemyId] = (player.killCounts[enemyId] || 0) + 1;
}
