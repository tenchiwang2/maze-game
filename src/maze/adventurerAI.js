// ─────────────────────────────────────────────
//  adventurerAI.js
//  非操控冒險者的 AI 狀態機
//  每次遊戲時間推進時呼叫 tickAdventurers()
// ─────────────────────────────────────────────
import { AI_STATE, adventurerLog } from './adventurerState.js';
import { gainExp, addItem } from './playerState.jsx';
import { LOC_TYPE } from './worldMap.jsx';

// ── 常數 ──────────────────────────────────────
const TRAVEL_SPEED        = 0.6;  // 世界格/遊戲分鐘
const ARRIVE_DIST         = 1.2;  // 到達目標的判定距離（格）
const IDLE_MIN_MINS       = 60;   // 待機最短時間（分鐘）
const IDLE_MAX_MINS       = 300;  // 待機最長時間（分鐘）
const DUNGEON_MIN_MINS    = 40;   // 地城最短探索時間
const DUNGEON_MAX_MINS    = 150;  // 地城最長探索時間
const REST_HP_REGEN_RATE  = 0.08; // 每分鐘恢復 maxHp * 此值
const REST_MP_REGEN_RATE  = 0.12; // 每分鐘恢復 maxMp * 此值

// 可以前往冒險的地點類型
const ADVENTURE_TYPES = new Set([
  LOC_TYPE.DUNGEON,
  LOC_TYPE.TEMPLE,
  LOC_TYPE.QUEST_DUNGEON,
]);

// ─────────────────────────────────────────────
//  tickAdventurers — 主入口
//  回傳 event 陣列供外層顯示 toast
// ─────────────────────────────────────────────
export function tickAdventurers(adventurers, activeAdvId, locations, gameTime, minsElapsed) {
  const events = [];
  for (const adv of Object.values(adventurers)) {
    if (adv.id === activeAdvId || !adv.isAlive || adv.isNPCAdventurer) continue;
    _tick(adv, locations, gameTime, minsElapsed, events);
  }
  return events;
}

// ─────────────────────────────────────────────
//  內部：單一冒險者每 tick 更新
// ─────────────────────────────────────────────
function _tick(adv, locations, gameTime, minsElapsed, events) {
  switch (adv.aiState) {
    case AI_STATE.IDLE:      _tickIdle(adv, locations, gameTime, minsElapsed, events); break;
    case AI_STATE.TRAVELING: _tickTraveling(adv, locations, gameTime, minsElapsed, events); break;
    case AI_STATE.DUNGEON:   _tickDungeon(adv, locations, gameTime, minsElapsed, events); break;
    case AI_STATE.RETURNING: _tickReturning(adv, locations, gameTime, minsElapsed, events); break;
    case AI_STATE.REST:      _tickRest(adv, locations, gameTime, minsElapsed, events); break;
  }
}

// ── IDLE：等待，倒數後選擇地城出發 ──────────
function _tickIdle(adv, locations, gameTime, minsElapsed, events) {
  adv.aiCooldown -= minsElapsed;

  // 待機倒數尚未結束
  if (adv.aiCooldown > 0) return;

  // HP 不足先休息
  if (adv.hp < adv.maxHp * 0.5) {
    _enterRest(adv, gameTime);
    return;
  }

  // 選一個地城目標
  const dungeons = locations.filter(l => ADVENTURE_TYPES.has(l.type) && l.wx != null && l.wy != null);
  if (dungeons.length === 0) {
    adv.aiCooldown = IDLE_MIN_MINS;
    return;
  }

  // 偏好選離家不太遠的地城（距離 < 30 格），隨機取樣
  const nearby = dungeons.filter(l => _dist(l.wx, l.wy, adv.homeWX, adv.homeWY) < 30);
  const pool   = nearby.length > 0 ? nearby : dungeons;
  const target = pool[Math.floor(Math.random() * pool.length)];

  adv.destinationId  = target.id;
  adv.destinationWX  = target.wx;
  adv.destinationWY  = target.wy;
  adv.aiState        = AI_STATE.TRAVELING;
  adv.dungeonDuration = DUNGEON_MIN_MINS + Math.random() * (DUNGEON_MAX_MINS - DUNGEON_MIN_MINS);

  adventurerLog(adv, `出發前往 ${target.label}`, gameTime);
  events.push({ type: 'depart', adv, target });
}

// ── TRAVELING：往目標移動 ────────────────────
function _tickTraveling(adv, locations, gameTime, minsElapsed, events) {
  if (adv.destinationWX == null) { adv.aiState = AI_STATE.IDLE; adv.aiCooldown = 30; return; }

  const dx = adv.destinationWX - adv.currentWX;
  const dy = adv.destinationWY - adv.currentWY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < ARRIVE_DIST) {
    // 到達目標地城
    adv.aiState       = AI_STATE.DUNGEON;
    adv.dungeonStartTime = gameTime;
    adventurerLog(adv, `抵達目標，進入地城探索`, gameTime);
    events.push({ type: 'enter_dungeon', adv });
    return;
  }

  // 移動
  const step = TRAVEL_SPEED * minsElapsed;
  const ratio = Math.min(step / dist, 1);
  adv.currentWX += dx * ratio;
  adv.currentWY += dy * ratio;
}

// ── DUNGEON：模擬地城探索 ────────────────────
function _tickDungeon(adv, locations, gameTime, minsElapsed, events) {
  const elapsed = gameTime - adv.dungeonStartTime;
  if (elapsed < adv.dungeonDuration) return; // 尚未探索完畢

  // ── 探索完成：結算 ──
  const lv      = adv.lv;
  const goldEarned = Math.floor(lv * 15 + Math.random() * 60 + 20);
  const expEarned  = Math.floor(lv * 25 + Math.random() * 50);
  const hpLost     = Math.floor(adv.maxHp * (0.05 + Math.random() * 0.25)); // 損失 5~30% HP

  adv.gold += goldEarned;
  adv.totalGoldEarned += goldEarned;
  adv.hp = Math.max(1, adv.hp - hpLost);

  const lvResult = gainExp(adv, expEarned);

  adv.totalDungeons++;

  // 有機率獲得藥水
  if (Math.random() < 0.4) addItem(adv, 'health_potion', 1);
  if (Math.random() < 0.2) addItem(adv, 'mp_potion', 1);

  const logMsg = `地城探索完成！獲得 ${goldEarned}💰 ${expEarned}EXP，損失 ${hpLost}HP${lvResult.leveled ? ' ⬆升級！' : ''}`;
  adventurerLog(adv, logMsg, gameTime);
  events.push({ type: 'dungeon_done', adv, goldEarned, expEarned, hpLost, leveled: lvResult.leveled });

  // 返回主城
  adv.aiState       = AI_STATE.RETURNING;
  adv.destinationWX = adv.homeWX;
  adv.destinationWY = adv.homeWY;
}

// ── RETURNING：返回主城 ──────────────────────
function _tickReturning(adv, locations, gameTime, minsElapsed, events) {
  const dx = adv.homeWX - adv.currentWX;
  const dy = adv.homeWY - adv.currentWY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < ARRIVE_DIST) {
    // 到家
    adv.currentWX = adv.homeWX;
    adv.currentWY = adv.homeWY;
    _enterRest(adv, gameTime);
    events.push({ type: 'returned', adv });
    return;
  }

  const step = TRAVEL_SPEED * minsElapsed;
  const ratio = Math.min(step / dist, 1);
  adv.currentWX += dx * ratio;
  adv.currentWY += dy * ratio;
}

// ── REST：休息恢復 ───────────────────────────
function _tickRest(adv, locations, gameTime, minsElapsed, events) {
  // 嘗試使用血藥
  if (adv.hp < adv.maxHp * 0.5) {
    const potion = adv.items.find(i => i.itemId === 'health_potion' && i.qty > 0);
    if (potion) {
      potion.qty--;
      if (potion.qty <= 0) adv.items = adv.items.filter(i => i.qty > 0);
      adv.hp = Math.min(adv.maxHp, adv.hp + Math.floor(adv.maxHp * 0.4));
    }
  }

  // 自然回復
  adv.hp = Math.min(adv.maxHp, adv.hp + Math.floor(adv.maxHp * REST_HP_REGEN_RATE * minsElapsed));
  adv.mp = Math.min(adv.maxMp, adv.mp + Math.floor(adv.maxMp * REST_MP_REGEN_RATE * minsElapsed));

  // 完全恢復後 → 轉回待機，設定下次出發倒數
  if (adv.hp >= adv.maxHp && adv.mp >= adv.maxMp) {
    adv.hp = adv.maxHp;
    adv.mp = adv.maxMp;
    adv.aiState    = AI_STATE.IDLE;
    adv.aiCooldown = IDLE_MIN_MINS + Math.random() * (IDLE_MAX_MINS - IDLE_MIN_MINS);
    adventurerLog(adv, `休息完畢，${Math.floor(adv.aiCooldown)} 分鐘後再次出發`, gameTime);
  }
}

// ── 進入休息狀態 ─────────────────────────────
function _enterRest(adv, gameTime) {
  adv.aiState = AI_STATE.REST;
  adventurerLog(adv, `返回主城，開始休息恢復`, gameTime);
}

// ── 距離工具 ─────────────────────────────────
function _dist(ax, ay, bx, by) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// ─────────────────────────────────────────────
//  getAdventurerSummary — 給 UI 顯示用的摘要
// ─────────────────────────────────────────────
export function getAdventurerSummary(adv) {
  return {
    id:         adv.id,
    name:       adv.name,
    portrait:   adv.portrait,
    classLabel: adv.classLabel,
    classColor: adv.classColor,
    lv:         adv.lv,
    hp:         adv.hp,
    maxHp:      adv.maxHp,
    mp:         adv.mp,
    maxMp:      adv.maxMp,
    gold:       adv.gold,
    aiState:    adv.aiState,
    isActive:   adv.isActive,
    isAlive:    adv.isAlive,
    totalDungeons: adv.totalDungeons,
    totalGoldEarned: adv.totalGoldEarned,
    actionLog:  adv.actionLog.slice(0, 5),
  };
}
