// ─────────────────────────────────────────────
//  npcSystem.js
//  世界 NPC 移動 AI（純函數，無 React）
//
//  initNPCs(defs, locations, terrain) → NpcState[]
//  updateNPCs(npcs, terrain, locations, gameTimeMins) → void（直接修改）
//  getNearbyNPC(npcs, wx, wy, radius) → NpcState | null
// ─────────────────────────────────────────────
import { isPassable } from './worldMap.jsx';

const NPC_SPEED_BASE    = 0.030;   // 世界格/frame（一般移動）
const NPC_SPEED_HOSTILE = 0.042;   // 敵對 NPC 追逐速度
const UPDATE_INTERVAL   = 4;       // 每 N 幀更新一次位置
const WANDER_MIN_TICKS  = 80;      // 最短停留幀數
const WANDER_MAX_TICKS  = 220;     // 最長停留幀數
const REACH_THRESHOLD   = 0.6;     // 到達目標的判定距離

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
      state: 'idle',        // 'idle' | 'moving' | 'return_home' | 'chase'
      stateTimer: Math.floor(Math.random() * WANDER_MAX_TICKS),
      frameCounter: Math.floor(Math.random() * UPDATE_INTERVAL),
      waypointIdx: 0,
      resolvedWaypoints,
      speed: def.alignment === 'hostile' ? NPC_SPEED_HOSTILE : NPC_SPEED_BASE,
    };
  });
}

// ─────────────────────────────────────────────
//  每 frame 呼叫（內部有節流）
// ─────────────────────────────────────────────
export function updateNPCs(npcs, terrain, locations, gameTimeMins) {
  const hour = Math.floor(gameTimeMins / 60) % 24;

  for (const npc of npcs) {
    // 節流：每 UPDATE_INTERVAL frame 才真正更新
    npc.frameCounter = (npc.frameCounter + 1) % UPDATE_INTERVAL;
    if (npc.frameCounter !== 0) continue;

    if (npc.moveType === 'STATIONARY') {
      // 靜止型：始終保持在 home
      npc.wx = npc.homeWx;
      npc.wy = npc.homeWy;
      continue;
    }

    // 時間排程：夜間非敵對 NPC 返家
    const isNight = hour < 5 || hour >= 20;
    const hasSchedule = npc.schedule != null;
    const inActiveHours = hasSchedule
      ? isInSchedule(hour, npc.schedule.activeStart, npc.schedule.activeEnd)
      : true;

    if (!inActiveHours) {
      // 不在活躍時段：躲回 home
      moveToward(npc, npc.homeWx, npc.homeWy, terrain);
      continue;
    }

    if (isNight && npc.alignment === 'friendly' && npc.moveType !== 'FREE_ROAM') {
      npc.state = 'return_home';
    }

    // ── 狀態機 ──────────────────────────────
    npc.stateTimer -= UPDATE_INTERVAL;

    if (npc.state === 'return_home') {
      const dist = Math.hypot(npc.homeWx - npc.wx, npc.homeWy - npc.wy);
      if (dist < REACH_THRESHOLD) {
        npc.state = 'idle';
        npc.stateTimer = WANDER_MIN_TICKS;
      } else {
        moveToward(npc, npc.homeWx, npc.homeWy, terrain);
      }
      continue;
    }

    if (npc.state === 'moving' && npc.targetWx != null) {
      const dist = Math.hypot(npc.targetWx - npc.wx, npc.targetWy - npc.wy);
      if (dist < REACH_THRESHOLD) {
        npc.state = 'idle';
        npc.stateTimer = WANDER_MIN_TICKS + Math.floor(Math.random() * WANDER_MAX_TICKS);
        // LONG_HAUL：移到下一個路點
        if (npc.moveType === 'LONG_HAUL' && npc.resolvedWaypoints.length > 0) {
          npc.waypointIdx = (npc.waypointIdx + 1) % npc.resolvedWaypoints.length;
        }
        npc.targetWx = null; npc.targetWy = null;
      } else {
        moveToward(npc, npc.targetWx, npc.targetWy, terrain);
      }
      continue;
    }

    // idle → 決定下一個目標
    if (npc.stateTimer <= 0) {
      pickTarget(npc, locations);
    }
  }
}

// ─────────────────────────────────────────────
//  找最近的 NPC（供玩家互動偵測）
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
//  取得在指定半徑內的所有敵對 NPC（供戰鬥觸發）
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

function moveToward(npc, tx, ty, terrain) {
  const dx = tx - npc.wx, dy = ty - npc.wy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.01) return;
  const step = npc.speed;
  const nx = npc.wx + (dx / dist) * step;
  const ny = npc.wy + (dy / dist) * step;

  // 分軸碰撞
  if (isPassable(terrain, nx, npc.wy)) npc.wx = nx;
  if (isPassable(terrain, npc.wx, ny)) npc.wy = ny;
}

function pickTarget(npc, locations) {
  npc.state = 'moving';
  npc.stateTimer = WANDER_MIN_TICKS + Math.floor(Math.random() * WANDER_MAX_TICKS);

  if (npc.moveType === 'LONG_HAUL' && npc.resolvedWaypoints.length > 0) {
    // 前往下一個路點
    const wp = npc.resolvedWaypoints[npc.waypointIdx];
    npc.targetWx = wp.wx + (Math.random() - 0.5) * 1.5;
    npc.targetWy = wp.wy + (Math.random() - 0.5) * 1.5;
    return;
  }

  if (npc.moveType === 'FREE_ROAM') {
    // 隨機方向，距離 5-20 格
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
