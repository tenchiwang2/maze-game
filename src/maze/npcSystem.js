// ─────────────────────────────────────────────
//  npcSystem.js
//  世界 NPC 移動 AI（純函數，無 React）
//
//  initNPCs(defs, locations, terrain) → NpcState[]
//  updateNPCs(npcs, terrain, locations, gameTimeMins, deltaMinutes) → void（直接修改）
//  getNearbyNPC(npcs, wx, wy, radius) → NpcState | null
//  getHostileNPCsNear(npcs, wx, wy, radius) → NpcState[]
//
//  ★ 移動和狀態計時器全部以「遊戲分鐘」為單位，
//    只在 minsGained > 0 時才呼叫 updateNPCs，
//    靜止的玩家不會造成任何 NPC 移動。
// ─────────────────────────────────────────────
import { isPassable } from './worldMap.jsx';

// 速度單位：世界格 / 遊戲分鐘（TIME_WORLD_PER_MIN = 1.0 → 玩家走 1 格 = 1 分鐘）
const NPC_SPEED_BASE    = 0.6;   // 一般 NPC（玩家速度的 60%）
const NPC_SPEED_HOSTILE = 0.9;   // 敵對 NPC（略慢於玩家，有追逐感）

// 狀態計時器單位：遊戲分鐘
const WANDER_MIN_MINS = 5;       // 最短等待時間（分鐘）
const WANDER_MAX_MINS = 30;      // 最長等待時間（分鐘）

const REACH_THRESHOLD = 0.6;     // 到達目標的判定距離（世界格）

// ─────────────────────────────────────────────
//  初始化
// ─────────────────────────────────────────────
export function initNPCs(defs, locations, terrain) {
  return defs.map(def => {
    const home = locations.find(l => l.id === def.homeTownId);
    const homeWx = home ? home.wx + 0.5 : 40.5;
    const homeWy = home ? home.wy + 0.5 : 27.5;

    // 起始位置：在 home 附近隨機偏移
    const spawnOffset = def.moveType === 'STATIONARY' ? 0 : 2;
    const startWx = homeWx + (Math.random() - 0.5) * spawnOffset;
    const startWy = homeWy + (Math.random() - 0.5) * spawnOffset;

    // 解析 waypoints（LONG_HAUL）
    const resolvedWaypoints = (def.waypoints ?? []).map(tid => {
      const loc = locations.find(l => l.id === tid);
      return loc ? { wx: loc.wx + 0.5, wy: loc.wy + 0.5 } : null;
    }).filter(Boolean);

    return {
      ...def,
      wx: startWx,
      wy: startWy,
      homeWx,
      homeWy,
      targetWx: null,
      targetWy: null,
      state: 'idle',        // 'idle' | 'moving' | 'return_home'
      // 初始隨機分散，避免所有 NPC 同時開始移動
      stateTimer: Math.random() * WANDER_MAX_MINS,
      waypointIdx: 0,
      resolvedWaypoints,
      speed: def.alignment === 'hostile' ? NPC_SPEED_HOSTILE : NPC_SPEED_BASE,
    };
  });
}

// ─────────────────────────────────────────────
//  每次遊戲時間推進時呼叫（deltaMinutes > 0）
//  ★ 不要在每幀呼叫此函式
// ─────────────────────────────────────────────
export function updateNPCs(npcs, terrain, locations, gameTimeMins, deltaMinutes) {
  const hour = Math.floor(gameTimeMins / 60) % 24;

  for (const npc of npcs) {
    if (npc.moveType === 'STATIONARY') {
      // 靜止型：始終保持在 home
      npc.wx = npc.homeWx;
      npc.wy = npc.homeWy;
      continue;
    }

    // 時間排程：不在活躍時段則回家
    const hasSchedule = npc.schedule != null;
    const inActiveHours = hasSchedule
      ? isInSchedule(hour, npc.schedule.activeStart, npc.schedule.activeEnd)
      : true;

    if (!inActiveHours) {
      moveToward(npc, npc.homeWx, npc.homeWy, terrain, deltaMinutes);
      continue;
    }

    // 夜間友善 NPC（非 FREE_ROAM）返家
    const isNight = hour < 5 || hour >= 20;
    if (isNight && npc.alignment === 'friendly' && npc.moveType !== 'FREE_ROAM') {
      npc.state = 'return_home';
    }

    // ── 狀態計時器遞減（遊戲分鐘）──────────
    npc.stateTimer -= deltaMinutes;

    // ── 狀態機 ──────────────────────────────
    if (npc.state === 'return_home') {
      const dist = Math.hypot(npc.homeWx - npc.wx, npc.homeWy - npc.wy);
      if (dist < REACH_THRESHOLD) {
        npc.state = 'idle';
        npc.stateTimer = WANDER_MIN_MINS;
      } else {
        moveToward(npc, npc.homeWx, npc.homeWy, terrain, deltaMinutes);
      }
      continue;
    }

    if (npc.state === 'moving' && npc.targetWx != null) {
      const dist = Math.hypot(npc.targetWx - npc.wx, npc.targetWy - npc.wy);
      if (dist < REACH_THRESHOLD) {
        // 抵達目標 → 轉 idle，等待一段時間
        npc.state = 'idle';
        npc.stateTimer = WANDER_MIN_MINS + Math.random() * (WANDER_MAX_MINS - WANDER_MIN_MINS);
        // LONG_HAUL：移到下一個路點
        if (npc.moveType === 'LONG_HAUL' && npc.resolvedWaypoints.length > 0) {
          npc.waypointIdx = (npc.waypointIdx + 1) % npc.resolvedWaypoints.length;
        }
        npc.targetWx = null;
        npc.targetWy = null;
      } else {
        moveToward(npc, npc.targetWx, npc.targetWy, terrain, deltaMinutes);
      }
      continue;
    }

    // idle → 等待結束後決定下一個目標
    if (npc.stateTimer <= 0) {
      pickTarget(npc, locations);
    }
  }
}

// ─────────────────────────────────────────────
//  找最近的 NPC（供玩家互動偵測，每幀可呼叫）
// ─────────────────────────────────────────────
export function getNearbyNPC(npcs, wx, wy, radius = 1.8) {
  let best = null, bestDist = radius;
  for (const npc of npcs) {
    const d = Math.hypot(npc.wx - wx, npc.wy - wy);
    if (d < bestDist) { bestDist = d; best = npc; }
  }
  return best;
}

// ─────────────────────────────────────────────
//  取得在指定半徑內的所有敵對 NPC（供戰鬥觸發，每幀可呼叫）
// ─────────────────────────────────────────────
export function getHostileNPCsNear(npcs, wx, wy, radius = 1.2) {
  return npcs.filter(
    n => n.alignment === 'hostile' && Math.hypot(n.wx - wx, n.wy - wy) < radius
  );
}

// ─────────────────────────────────────────────
//  內部輔助函式
// ─────────────────────────────────────────────

function isInSchedule(hour, start, end) {
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end; // 跨午夜（例如 20-5）
}

function moveToward(npc, tx, ty, terrain, deltaMinutes) {
  const dx = tx - npc.wx, dy = ty - npc.wy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.01) return;

  // step = 速度（格/分鐘）× 本次推進的分鐘數
  const step = npc.speed * deltaMinutes;
  // 不超過到目標的實際距離（避免超頭）
  const actualStep = Math.min(step, dist);
  const nx = npc.wx + (dx / dist) * actualStep;
  const ny = npc.wy + (dy / dist) * actualStep;

  // 分軸碰撞
  if (isPassable(terrain, nx, npc.wy)) npc.wx = nx;
  if (isPassable(terrain, npc.wx, ny)) npc.wy = ny;
}

function pickTarget(npc, locations) {
  npc.state = 'moving';
  npc.stateTimer = WANDER_MIN_MINS + Math.random() * (WANDER_MAX_MINS - WANDER_MIN_MINS);

  if (npc.moveType === 'LONG_HAUL' && npc.resolvedWaypoints.length > 0) {
    const wp = npc.resolvedWaypoints[npc.waypointIdx];
    npc.targetWx = wp.wx + (Math.random() - 0.5) * 1.5;
    npc.targetWy = wp.wy + (Math.random() - 0.5) * 1.5;
    return;
  }

  if (npc.moveType === 'FREE_ROAM') {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 5 + Math.random() * 15;
    npc.targetWx = npc.homeWx + Math.cos(angle) * dist;
    npc.targetWy = npc.homeWy + Math.sin(angle) * dist;
    return;
  }

  // LOCAL / REGIONAL：在 moveRadius 範圍內隨機漫步
  const radius = npc.moveRadius ?? 5;
  const angle  = Math.random() * Math.PI * 2;
  const dist   = Math.random() * radius;
  npc.targetWx = npc.homeWx + Math.cos(angle) * dist;
  npc.targetWy = npc.homeWy + Math.sin(angle) * dist;
}
