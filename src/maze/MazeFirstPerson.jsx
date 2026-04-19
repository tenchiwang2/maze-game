import { useState, useEffect, useRef, useCallback } from 'react';
import { FOV, NUM_RAYS, MOVE_SPEED, TURN_SPEED, INTERACT_DIST, MM, WORLD_MOVE_SPEED, ENTRY_PROXIMITY, TORCH_RADIUS, AMBIENT } from './constants.jsx';
import { generateMaze, buildGrid, doorWorldPos, resolveEvents, findDeadEnds, findFixedRoomFreeCells } from './mazeGenerator.jsx';
import { loadTexture, TexUpload, ZoneTexRow } from './textures.jsx';
import {
  castRays, renderFloorCeiling, renderWalls,
  getSpriteInfo,
  drawEntryArch, drawExitPortal, drawEventMarker, drawEnemy,
  drawMinimap, drawHUD,
} from './renderer.jsx';
import { DEFAULT_FIXED, DEFAULT_GLOBAL, EVENT_TYPES, EVENT_ICONS } from './defaults.jsx';
import { FACTORIES, FACTORY_IDS } from './mazeFactory.jsx';
// ── RPG 系統 ──
import { isPassable, findWorldSpawn, getNearbyLocation, LOC_TYPE } from './worldMap.jsx';
import { WORLD_DEF, DIALOGUES, SHOPS, QUEST_DEFS } from './worldData.jsx';
import { WORLD_FACTORIES, WORLD_FACTORY_IDS } from './worldFactory.jsx';
import { drawOverworld } from './OverworldRenderer.jsx';
import { NPC_DEFS } from './world/npcs.js';
import { initNPCs, updateNPCs, getNearbyNPC, getHostileNPCsNear } from './npcSystem.js';
import { createPlayer, addItem, addQuest, claimReward, checkQuestStep, gainExp, hasItem } from './playerState.jsx';
import QuestOfferPanel from './QuestOfferPanel.jsx';
import QuestLogPanel   from './QuestLogPanel.jsx';
import { applyCombatResult } from './combatService.js';
import { rollLoot } from './combatEngine.jsx';
import { ITEMS } from './itemData.jsx';
import { ENEMIES } from './enemyData.jsx';
import DialoguePanel  from './DialoguePanel.jsx';
import CombatPanel    from './CombatPanel.jsx';
import ShopPanel      from './ShopPanel.jsx';
import InventoryPanel from './InventoryPanel.jsx';
import StatsPanel          from './StatsPanel.jsx';
import ToastNotification   from './ToastNotification.jsx';
import CampRestPanel, { calcRestRecovery } from './CampRestPanel.jsx';
import TownPanel      from './TownPanel.jsx';
import { on, emit } from './eventBus.js';
import {
  TIME_START, TIME_WORLD_PER_MIN, TIME_DUNGEON_PER_MIN,
  TIME_DIALOGUE, TIME_SHOP, TIME_CHEST, TIME_COMBAT,
  formatTime, advanceTime, minsToNextDawn, getTimePeriod,
} from './timeSystem.js';

// ─────────────────────────────────────────────
//  敵人 AI 常數
// ─────────────────────────────────────────────
const ENEMY_DETECT_RANGE = 5.0;   // 格子單位：玩家偵測距離
const ENEMY_TRIGGER_DIST = 0.85;  // 格子單位：觸發戰鬥距離
const ENEMY_BASE_SPEED   = 0.022; // 格子/frame

// ─────────────────────────────────────────────
//  全局輔助函式（純粹，不依賴 React state）
// ─────────────────────────────────────────────
function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 將 globalEvents（無 r,c）自動配置到死路或房間空格。
 * - chest    → placed 陣列（加上 r,c，供 resolveEvents 使用）
 * - combat   → enemies 陣列（成為可移動敵人實體）
 * - 其他     → 保留進 placed
 * @returns {{ placed: object[], enemies: object[] }}
 */
function autoPlaceGlobalEvents(rawGlobal, grid, rooms, rows, cols, ENEMIES_DEF) {
  const deadEnds  = findDeadEnds(grid, rows, cols);
  const roomFree  = findFixedRoomFreeCells(rooms);

  // 排除已被固定房間事件占用的格子 + 入口 + 出口
  const used = new Set([`0,0`, `${rows - 1},${cols - 1}`]);
  rooms.forEach(rm => {
    if (!rm.fixed) return;
    (rm.events || []).forEach(ev => used.add(`${rm.r + ev.dr},${rm.c + ev.dc}`));
  });

  const candidates = shuffleArr([
    ...deadEnds.filter(p => !used.has(`${p.r},${p.c}`)),
    ...roomFree.filter(p => !used.has(`${p.r},${p.c}`)),
  ]);

  let cidx = 0;
  const placed  = [];
  const enemies = [];

  rawGlobal.forEach(ev => {
    if (ev.type === 'chest') {
      const pos = candidates[cidx];
      if (pos) { used.add(`${pos.r},${pos.c}`); cidx++; placed.push({ ...ev, r: pos.r, c: pos.c }); }
      // 若找不到格子，此寶箱跳過（避免塞在牆裡）
    } else if (ev.type === 'combat' && ev.enemyId) {
      // 成為遊走敵人
      const pos = candidates[cidx];
      if (pos) {
        used.add(`${pos.r},${pos.c}`); cidx++;
        const def = ENEMIES_DEF[ev.enemyId] ?? {};
        enemies.push({
          id: ev.id,
          enemyId: ev.enemyId,
          icon: def.icon ?? '👹',
          name: def.name ?? ev.text ?? '敵人',
          px: 2 * pos.c + 1.5,
          py: 2 * pos.r + 1.5,
          dirAngle: Math.random() * Math.PI * 2,
          speed: ENEMY_BASE_SPEED,
          hp: def.hp ?? 30,
          maxHp: def.hp ?? 30,
          alive: true,
          state: 'wander',
          stateTimer: 40 + Math.floor(Math.random() * 80),
          bobOffset: Math.random() * Math.PI * 2,
        });
      }
    } else {
      // 其他事件：若已有 r,c 直接放入，否則也配置位置
      if (ev.r != null && ev.c != null) {
        placed.push(ev);
      } else {
        const pos = candidates[cidx];
        if (pos) { used.add(`${pos.r},${pos.c}`); cidx++; placed.push({ ...ev, r: pos.r, c: pos.c }); }
      }
    }
  });

  return { placed, enemies };
}

// ─────────────────────────────────────────────
//  單張地圖建立輔助（供多地圖模式使用）
// ─────────────────────────────────────────────
function buildSingleMap(cols, rows, fixedRooms, randomCount, safeMin, safeMax, defDoorCount, defDoorOpen) {
  const { walls, rooms, doorPositions } = generateMaze(cols, rows, fixedRooms, randomCount, safeMin, safeMax, defDoorCount, defDoorOpen);
  const doors = doorPositions.map(dp => ({ ...dp, closed: dp.defaultOpen === false }));
  const { grid, zoneMap, doorMap } = buildGrid(walls, cols, rows, rooms, doors);
  return {
    walls, rooms, doors, doorMap, grid, zoneMap,
    eCell: { r: 0, c: 0 },
    xCell: { r: rows - 1, c: cols - 1 },
    entryGX: 1, entryGY: 1,
    exitGX: 2 * (cols - 1) + 1,
    exitGY: 2 * (rows - 1) + 1,
    events: [],
  };
}

// 在目標格 (gx, gy) 附近找到最近的可通行格，回傳 { px, py }
// minDist=2 時跳過傳送門本身的格子，避免傳送後立刻站在傳送門上
function findSafeSpawn(grid, gx, gy, minDist = 0) {
  const H = grid.length, W = grid[0].length;
  for (let d = minDist; d <= 6; d++) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        if (Math.abs(dy) !== d && Math.abs(dx) !== d) continue;
        const ny = gy + dy, nx = gx + dx;
        if (ny >= 1 && ny < H - 1 && nx >= 1 && nx < W - 1 && grid[ny][nx] === 0) {
          return { px: nx + 0.5, py: ny + 0.5 };
        }
      }
    }
  }
  return { px: 1.5, py: 1.5 };
}

// 將指定地圖快照的資料複製到遊戲狀態 s
function syncCurrentMap(s) {
  const map = s.maps[s.currentMapIdx];
  s.walls = map.walls; s.rooms = map.rooms; s.doors = map.doors;
  s.doorMap = map.doorMap; s.grid = map.grid; s.zoneMap = map.zoneMap;
  s.eCell = map.eCell; s.xCell = map.xCell;
  s.entryGX = map.entryGX; s.entryGY = map.entryGY;
  s.exitGX = map.exitGX; s.exitGY = map.exitGY;
}

// ─────────────────────────────────────────────
//  迷宮資料顯示面板

function MazeDataPanel({ data, walls }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("rooms");

  if (!data) return null;

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      style={{
        fontSize: 12, padding: "3px 10px",
        borderRadius: "var(--border-radius-md)",
        background: tab === key ? "var(--color-background-info)" : "none",
        color: tab === key ? "var(--color-text-info)" : "var(--color-text-secondary)",
        border: tab === key ? "0.5px solid var(--color-border-info)" : "0.5px solid transparent",
      }}>
      {label}
    </button>
  );

  const cell = (v, muted) => (
    <span style={{ color: muted ? "var(--color-text-tertiary)" : "var(--color-text-primary)" }}>{v}</span>
  );

  const roomTypeColor = (type) =>
    type.startsWith("固定") ? "rgba(216,90,48,0.85)" : "rgba(80,70,160,0.75)";

  // 建立平面圖的牆壁字元格子字串
  const renderGrid = () => {
    if (!walls) return null;
    const rows = walls.length, cols = walls[0].length;
    const W = 2 * cols + 1, H = 2 * rows + 1;
    const ch = Array.from({ length: H }, () => Array(W).fill(' '));
    // 邊框
    for (let c = 0; c < W; c++) { ch[0][c] = '─'; ch[H - 1][c] = '─'; }
    for (let r = 0; r < H; r++) { ch[r][0] = '│'; ch[r][W - 1] = '│'; }
    ch[0][0] = '┌'; ch[0][W - 1] = '┐'; ch[H - 1][0] = '└'; ch[H - 1][W - 1] = '┘';
    // 內部牆壁
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const gr = 2 * r + 1, gc = 2 * c + 1;
      ch[gr][gc] = '·';
      if (walls[r][c].right && c < cols - 1) ch[gr][gc + 1] = '│';
      if (walls[r][c].bottom && r < rows - 1) ch[gr + 1][gc] = '─';
    }
    // 房間標記
    if (data.rooms) {
      data.rooms.forEach((rm, i) => {
        const label = rm.type.startsWith("固定") ? `R${i + 1}` : 'r';
        for (let r = rm.r; r < rm.r + rm.h; r++) for (let c = rm.c; c < rm.c + rm.w; c++) {
          ch[2 * r + 1][2 * c + 1] = label[0];
        }
      });
    }
    // 入口/出口
    ch[1][1] = 'S'; ch[2 * (rows - 1) + 1][2 * (cols - 1) + 1] = 'E';
    // 門
    if (data.doors) data.doors.forEach(d => {
      const gy = d.side === 'bottom' ? 2 * d.r + 2 : 2 * d.r + 1;
      const gx = d.side === 'bottom' ? 2 * d.c + 1 : 2 * d.c + 2;
      if (gy > 0 && gy < H && gx > 0 && gx < W) ch[gy][gx] = 'D';
    });
    return ch.map(row => row.join('')).join('\n');
  };

  return (
    <div style={{ marginTop: 14 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)",
          textTransform: "uppercase", letterSpacing: "0.06em",
          background: "var(--color-background-secondary)",
          borderRadius: open ? "var(--border-radius-md) var(--border-radius-md) 0 0" : "var(--border-radius-md)",
          padding: "8px 12px", border: "0.5px solid var(--color-border-tertiary)",
        }}>
        <span>迷宮資料</span>
        <span style={{ fontSize: 14 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderTop: "none",
          borderRadius: "0 0 var(--border-radius-md) var(--border-radius-md)",
          padding: "12px",
          background: "var(--color-background-primary)",
        }}>
          {/* 摘要列 */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            {[
              ["地圖大小", `${data.size.cols} × ${data.size.rows}`],
              ["格子總數", data.size.cols * data.size.rows],
              ["房間總數", data.rooms.length],
              ["固定房間", data.rooms.filter(r => r.type.startsWith("固定")).length],
              ["隨機房間", data.rooms.filter(r => r.type.startsWith("隨機")).length],
              ["門總數", data.doors.length],
              ["全域事件", data.globalEvents.length],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{
                background: "var(--color-background-secondary)",
                borderRadius: "var(--border-radius-md)", padding: "6px 10px", minWidth: 72,
              }}>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>{lbl}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{val}</div>
              </div>
            ))}
          </div>

          {/* 分頁標籤 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {tabBtn("rooms", "房間列表")}
            {tabBtn("doors", "門列表")}
            {tabBtn("events", "事件列表")}
            {tabBtn("grid", "平面圖")}
            {tabBtn("json", "JSON")}
          </div>

          {/* 分頁內容 */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>

            {tab === "rooms" && (
              <div>
                {data.rooms.map((rm, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 8, alignItems: "flex-start",
                    padding: "6px 0", borderBottom: "0.5px solid var(--color-border-tertiary)",
                    flexWrap: "wrap",
                  }}>
                    <span style={{
                      fontSize: 11, padding: "2px 7px", borderRadius: "99px",
                      background: rm.type.startsWith("固定") ? "rgba(216,90,48,0.15)" : "rgba(80,70,160,0.15)",
                      color: roomTypeColor(rm.type), minWidth: 64, textAlign: "center",
                    }}>{rm.type}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        r:{rm.r} c:{rm.c}  {rm.w}×{rm.h}  面積:{rm.area}
                      </span>
                      {rm.events.length > 0 && (
                        <div style={{ marginTop: 3, paddingLeft: 8 }}>
                          {rm.events.map((ev, ei) => (
                            <div key={ei} style={{ color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
                              <span style={{ color: { message: "var(--color-text-info)", teleport: "var(--color-text-warning)", win: "var(--color-text-success)" }[ev.type] || "var(--color-text-secondary)" }}>
                                [{ev.type}]
                              </span>
                              {" "}{ev.pos} — {ev.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "doors" && (
              <div>
                {data.doors.length === 0
                  ? <p style={{ color: "var(--color-text-tertiary)" }}>無門</p>
                  : data.doors.map(d => (
                    <div key={d.id} style={{
                      display: "flex", gap: 12, padding: "5px 0",
                      borderBottom: "0.5px solid var(--color-border-tertiary)",
                      color: "var(--color-text-secondary)",
                    }}>
                      <span style={{ minWidth: 16, color: "var(--color-text-tertiary)" }}>#{d.id}</span>
                      <span>r:{d.r} c:{d.c}</span>
                      <span style={{ color: d.side === "bottom" ? "var(--color-text-info)" : "var(--color-text-warning)" }}>
                        {d.side === "bottom" ? "↓ 下邊" : "→ 右邊"}
                      </span>
                      <span style={{ color: "var(--color-text-tertiary)" }}>
                        房間 #{d.roomIdx}
                      </span>
                    </div>
                  ))
                }
              </div>
            )}

            {tab === "events" && (
              <div>
                {[...data.rooms.flatMap(rm => rm.events.map(ev => ({ ...ev, src: rm.type }))), ...data.globalEvents.map(ev => ({ ...ev, src: "全域" }))].map((ev, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 8, padding: "5px 0",
                    borderBottom: "0.5px solid var(--color-border-tertiary)",
                    flexWrap: "wrap", alignItems: "baseline",
                  }}>
                    <span style={{
                      fontSize: 11, padding: "1px 6px", borderRadius: 99,
                      background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", minWidth: 36, textAlign: "center"
                    }}>{ev.src}</span>
                    <span style={{ color: { message: "var(--color-text-info)", teleport: "var(--color-text-warning)", win: "var(--color-text-success)", door: "var(--color-text-secondary)" }[ev.type] || "var(--color-text-secondary)" }}>
                      [{ev.type}]
                    </span>
                    <span style={{ color: "var(--color-text-tertiary)" }}>
                      {ev.pos || `r:${ev.r} c:${ev.c}`}
                    </span>
                    <span style={{ color: "var(--color-text-primary)", flex: 1 }}>{ev.text}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "grid" && (
              <div>
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 6px" }}>
                  S=入口  E=出口  D=門  R1/R2…=固定房間  r=隨機房間  ·=走廊
                </p>
                <div style={{ overflowX: "auto" }}>
                  <pre style={{
                    fontSize: 10, lineHeight: 1.25, margin: 0,
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "pre",
                  }}>{renderGrid()}</pre>
                </div>
              </div>
            )}

            {tab === "json" && (
              <div>
                <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 320 }}>
                  <pre style={{
                    fontSize: 11, margin: 0, color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-mono)", whiteSpace: "pre",
                  }}>{JSON.stringify(data, null, 2)}</pre>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  港口旅行面板

function PortPanel({ port, locations, onTravel, onClose }) {
  const dests = locations.filter(l => l.type === LOC_TYPE.PORT && l.id !== port.id);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,8,20,0.82)',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, rgba(8,24,50,0.98) 0%, rgba(4,16,36,0.98) 100%)',
        border: '1.5px solid rgba(60,160,230,0.55)',
        borderRadius: 12,
        padding: '20px 26px',
        minWidth: 280,
        maxWidth: 360,
        boxShadow: '0 0 32px rgba(40,120,200,0.25)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#60c8ff', marginBottom: 4 }}>
          ⚓ {port.label}
        </div>
        <div style={{ fontSize: 11, color: '#4880a0', marginBottom: 16 }}>
          {port.nationLabel && `[${port.nationLabel}]  `}選擇目的港口出航：
        </div>

        {dests.length === 0 ? (
          <div style={{ color: '#405060', fontSize: 12, marginBottom: 12 }}>此港暫無航線</div>
        ) : dests.map(dest => {
          const dist = Math.round(Math.hypot(dest.wx - port.wx, dest.wy - port.wy));
          return (
            <button
              key={dest.id}
              onClick={() => onTravel(dest)}
              style={{
                display: 'block', width: '100%', marginBottom: 8,
                padding: '9px 14px',
                background: 'rgba(20,55,90,0.75)',
                border: '1px solid rgba(60,150,220,0.35)',
                borderRadius: 7,
                color: '#b8e4ff',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
              }}>
              <span style={{ marginRight: 8 }}>⛵</span>
              {dest.label}
              {dest.nationLabel && (
                <span style={{ fontSize: 10, color: '#407090', marginLeft: 8 }}>
                  [{dest.nationLabel}]
                </span>
              )}
              <span style={{ float: 'right', fontSize: 11, color: '#406070' }}>
                ~{dist} 海里
              </span>
            </button>
          );
        })}

        <button
          onClick={onClose}
          style={{
            marginTop: 4, padding: '6px 18px',
            background: 'none',
            border: '1px solid rgba(60,90,110,0.6)',
            borderRadius: 6,
            color: '#406070',
            fontSize: 12,
            cursor: 'pointer',
          }}>
          留在港口
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  預設資料

export default function MazeFirstPerson() {
  const canvasRef = useRef(null);
  const [cols, setCols] = useState(16);
  const [rows, setRows] = useState(20);
  const [randomCount, setRandomCount] = useState(3);
  const [minRoom, setMinRoom] = useState(2);
  const [maxRoom, setMaxRoom] = useState(4);
  const [fixedRooms, setFixedRooms] = useState(DEFAULT_FIXED);
  const [globalEvCfg, setGlobalEvCfg] = useState(DEFAULT_GLOBAL);
  const [events, setEvents] = useState([]);
  const [seed, setSeed] = useState(0);
  const [won, setWon] = useState(false);
  const [log, setLog] = useState([]);
  const [mazeData, setMazeData] = useState(null);
  // textures[0]=走廊，textures[N]=固定房間 origIdx+1  { wall,ceil,floor,door }
  const [textures, setTextures] = useState([{}, {}, {}, {}]);
  const [defaultDoorCount, setDefaultDoorCount] = useState(2);
  const [defaultDoorOpen, setDefaultDoorOpen] = useState(true);
  const [factoryMode, setFactoryMode] = useState(FACTORY_IDS.CUSTOM);
  const [currentMapIdx, setCurrentMapIdx] = useState(0);
  const [transitionPrompt, setTransitionPrompt] = useState(null); // null | 'fwd' | 'bwd'
  // ── RPG 狀態 ──
  const [gameMode, setGameMode] = useState('OVERWORLD'); // 'OVERWORLD' | 'DUNGEON_INTERIOR' | 'TOWN_MENU'
  const [activeTownLoc, setActiveTownLoc] = useState(null);
  const [nearbyLocation, setNearbyLocation]   = useState(null);
  const [activeDialogue, setActiveDialogue]   = useState(null); // dialogueId
  const [activeShop, setActiveShop]           = useState(null); // shopId
  const [activeCombat, setActiveCombat]       = useState(null); // enemyId
  const [showInventory, setShowInventory]     = useState(false);
  const [showStats,     setShowStats]         = useState(false);
  const [showCampRest,  setShowCampRest]      = useState(false);
  const [cheatFullMap,  setCheatFullMap]      = useState(false);
  const [toasts,        setToasts]            = useState([]);
  const [activePort, setActivePort]           = useState(null); // 港口旅行面板
  const [nearbyNPC,  setNearbyNPC]            = useState(null); // 靠近的世界 NPC
  const [playerStats, setPlayerStats]         = useState(() => createPlayer()); // for re-render trigger
  const [questLog, setQuestLog]               = useState([]);
  const [showQuestLog, setShowQuestLog]        = useState(false);
  const [activeQuestOffer, setActiveQuestOffer] = useState(null);
  // shape: { questId, mode:'offer'|'reward', playerQuest?, continueDialogue } | null
  const [levelUpMsg, setLevelUpMsg]           = useState('');
  const [gameTime, setGameTime]               = useState(TIME_START); // 遊戲時間（分鐘）

  // ── 世界地圖工廠 ──
  const [worldFactoryId, setWorldFactoryId] = useState(WORLD_FACTORY_IDS.GRAND_WORLD);
  const [worldSeed, setWorldSeed]           = useState(1);

  const playerRef       = useRef(createPlayer());
  const nearbyLocRef    = useRef(null);
  const worldTerrainRef = useRef(null);
  // 當前世界地點（含工廠產生的隨機位置）
  const worldLocationsRef = useRef(WORLD_DEF.locations);

  const g = useRef({
    walls: null, grid: null, zoneMap: null, rooms: [], doors: [],
    doorMap: {},
    px: 1.5, py: 1.5, angle: Math.PI / 4,
    keys: {}, won: false, animId: null, t: 0,
    entryGX: 1, entryGY: 1, exitGX: 0, exitGY: 0,
    eCell: { r: 0, c: 0 }, xCell: { r: 0, c: 0 },
    cols, rows, interactCooldown: 0,
    multiMap: false, maps: [], currentMapIdx: 0,
    transitionPrompt: null, wasOnPortal: false,
    // RPG 欄位
    gameMode: 'OVERWORLD',
    wx: WORLD_DEF.startX + 0.5,
    wy: WORLD_DEF.startY + 0.5,
    returnWX: WORLD_DEF.startX + 0.5,
    returnWY: WORLD_DEF.startY + 0.5,
    activeLocationId: null,
    lightCfg: { ambient: AMBIENT, torchRadius: TORCH_RADIUS },
    uiPaused: false,
    gameTime: TIME_START,  // 分鐘，game loop 用
    timeAccum: 0,          // 移動距離累積器
    dungeonEnemies: [],    // 遊走敵人實體陣列
    worldNPCs: [],         // 世界 NPC 實體陣列
    nearbyNPCId: null,     // 目前靠近的 NPC id
  });
  const renderRef = useRef(null);
  const eventsRef = useRef(events);
  const textureRef = useRef(textures);
  eventsRef.current = events;
  textureRef.current = textures;


  function triggerEvent(ev, idx) {
    if (!ev.repeatable) {
      setEvents(prev => prev.map((e, i) => i === idx ? { ...e, triggered: true } : e));
    }
    setLog(prev => [{ id: Date.now(), type: ev.type, roomLabel: ev.roomLabel, text: (ev.text || "").split("\n")[0] }, ...prev].slice(0, 30));

    if (ev.type === 'teleport' && ev.destR != null) {
      g.current.px = 2 * ev.destC + 1 + 0.5; g.current.py = 2 * ev.destR + 1 + 0.5;
      addToast({ type: 'teleport', icon: '✨', title: '傳送', body: ev.text || '移動至新位置', duration: 1800 });
    }
    if (ev.type === 'win' && !g.current.won) {
      g.current.won = true; setWon(true);
      addToast({ type: 'message', icon: '🏆', title: '目標達成！', body: ev.text, duration: 4000 });
    }

    // ── RPG 事件 ──
    if (ev.type === 'message') {
      addToast({ type: 'message', icon: '📜', title: ev.text, duration: 3000 });
    }
    if (ev.type === 'npc' && ev.dialogueId) {
      g.current.uiPaused = true;
      // 優先檢查：是否有完成但未領獎的任務可向此 NPC 交差
      if (tryClaimQuest(ev.dialogueId)) {
        addToast({ type: 'quest', icon: '📬', title: `任務交差：${ev.text || 'NPC'}`, duration: 1800 });
      } else {
        setActiveDialogue(ev.dialogueId);
        addToast({ type: 'npc', icon: '💬', title: ev.text || 'NPC', body: '按下對話繼續', duration: 1800 });
      }
    }
    if (ev.type === 'shop' && ev.shopId) {
      g.current.uiPaused = true;
      setActiveShop(ev.shopId);
      addToast({ type: 'shop', icon: '🛒', title: ev.text || '商店', body: '進入商店', duration: 1800 });
    }
    if (ev.type === 'combat' && ev.enemyId) {
      g.current.uiPaused = true;
      emit('combat:start', { enemyId: ev.enemyId });
      addToast({ type: 'combat', icon: '⚔', title: '遭遇戰鬥！', body: ev.text, duration: 1800 });
    }
    if (ev.type === 'chest') {
      const p = playerRef.current;
      addItem(p, ev.itemId, ev.qty ?? 1);
      const item = ITEMS[ev.itemId];
      const itemName = item?.name || ev.itemId;
      const qty = ev.qty ?? 1;
      setLog(prev => [{ id: Date.now() + 1, type: 'chest', text: `獲得 ${itemName} ×${qty}` }, ...prev].slice(0, 30));
      setPlayerStats({ ...p });
      addToast({
        type: 'chest',
        icon: item?.icon ?? '📦',
        title: `獲得 ${itemName}`,
        body: qty > 1 ? `×${qty}` : item?.desc,
        duration: 3000,
      });
      // 任務：collect 進度
      QUEST_DEFS.forEach(qd => checkQuestStep(p, qd, 'collect', { itemId: ev.itemId }));
      g.current.gameTime = advanceTime(g.current.gameTime, TIME_CHEST);
      setGameTime(g.current.gameTime);
    }
    if (ev.type === 'town_gate') {
      g.current.transitionPrompt = 'gate';
      setTransitionPrompt('gate');
    }
    if (ev.type === 'port_travel') {
      g.current.uiPaused = true;
      setActivePort(worldLocationsRef.current.find(l => l.id === g.current.activeLocationId) ?? null);
    }
  }

  // ── 世界地圖重新產生 ──────────────────────
  const regenerateWorld = useCallback((factoryId, seed) => {
    const factory = WORLD_FACTORIES.find(f => f.id === factoryId) ?? WORLD_FACTORIES[0];
    const { terrain, locations: locs } = factory.generate(seed, WORLD_DEF.cols, WORLD_DEF.rows);
    // 工廠輸出：末尾 3 個是港口（海岸格），其餘是陸地城鎮/地城
    const portFactory    = locs.slice(-3);
    const nonPortFactory = locs.slice(0, locs.length - 3);
    // 分開合併：PORT 用海岸座標，其他用陸地座標
    let nonPortIdx = 0, portIdx = 0;
    const merged = WORLD_DEF.locations.map((loc) => {
      if (loc.type === LOC_TYPE.PORT) {
        const pos = portFactory[portIdx++];
        return pos ? { ...loc, wx: pos.wx, wy: pos.wy } : loc;
      } else {
        const pos = nonPortFactory[nonPortIdx++];
        return pos ? { ...loc, wx: pos.wx, wy: pos.wy } : loc;
      }
    });
    // 補救：factory 位置不足時 hardcode 座標可能落在水上，移到最近陸地
    const sanitized = merged.map((loc) => {
      if (loc.type === LOC_TYPE.PORT) return loc;
      if (isPassable(terrain, loc.wx, loc.wy)) return loc;
      const safe = findWorldSpawn(terrain, Math.floor(loc.wx), Math.floor(loc.wy));
      return { ...loc, wx: safe.wx, wy: safe.wy };
    });
    worldTerrainRef.current = terrain;
    worldLocationsRef.current = sanitized;
    // 找到可通行出生點（靠近地圖中心）
    const spawn = findWorldSpawn(terrain, WORLD_DEF.cols / 2, WORLD_DEF.rows / 2);
    g.current.wx = spawn.wx; g.current.wy = spawn.wy;
    g.current.returnWX = spawn.wx; g.current.returnWY = spawn.wy;
    nearbyLocRef.current = null;
    setNearbyLocation(null);
    // 初始化世界 NPC
    g.current.worldNPCs = initNPCs(NPC_DEFS, sanitized, terrain);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 港口海上旅行 ──────────────────────────
  function doEnterPort(loc) {
    g.current.uiPaused = true;
    setActivePort(loc);
  }

  function doTravelToPort(destLoc) {
    const s = g.current;
    const spawn = findWorldSpawn(worldTerrainRef.current, destLoc.wx, destLoc.wy);
    s.wx = spawn.wx;
    s.wy = spawn.wy;
    s.returnWX = spawn.wx; s.returnWY = spawn.wy;
    s.gameMode = 'OVERWORLD';
    s.activeLocationId = null;
    s.uiPaused = false;
    nearbyLocRef.current = null;
    setNearbyLocation(null);
    setActivePort(null);
    setActiveTownLoc(null);
    setGameMode('OVERWORLD');
    setLog(prev => [{ id: Date.now(), type: 'message', text: `⚓ 抵達 ${destLoc.label}` }, ...prev].slice(0, 30));
  }

  function closePort() {
    g.current.uiPaused = false;
    setActivePort(null);
  }

  // ── 離開地城，返回大地圖 ───────────────────
  function doExitToOverworld() {
    const s = g.current;
    s.gameMode = 'OVERWORLD';
    s.wx = s.returnWX; s.wy = s.returnWY;
    s.activeLocationId = null;
    s.won = false; s.grid = null;
    s.uiPaused = false;
    s.transitionPrompt = null; s.wasOnPortal = false;
    s.dungeonBaseLightCfg = null; // 清除地城基礎光源
    s.dungeonEnemies = [];        // 清除遊走敵人
    setGameMode('OVERWORLD');
    setActiveTownLoc(null);
    setWon(false);
    setTransitionPrompt(null);
    setActiveDialogue(null);
    setActiveShop(null);
    setActiveCombat(null);
    setShowInventory(false);
  }

  // ── 進入地點（由大地圖觸發）───────────────
  function doEnterLocation(loc) {
    const s = g.current;
    const cfg = loc.dungeonCfg;

    s.returnWX = s.wx; s.returnWY = s.wy;
    s.activeLocationId = loc.id;

    // 城鎮/首都/小城鎮/港口 → 選單模式，不產生迷宮
    if (loc.type === LOC_TYPE.TOWN || loc.type === LOC_TYPE.TOWN_SMALL || loc.type === LOC_TYPE.CAPITAL || loc.type === LOC_TYPE.PORT) {
      let flatEvents;
      if (loc.type === LOC_TYPE.PORT) {
        flatEvents = [{ id: 'port_travel', type: 'port_travel', text: '出航', icon: '⚓', repeatable: true }];
      } else {
        flatEvents = [
          ...(cfg.fixedRooms ?? []).flatMap(rm => rm.events ?? []),
          ...(cfg.globalEvents ?? []),
        ].filter(ev => ev.type !== 'town_gate');
      }
      setEvents(flatEvents);
      s.gameMode = 'TOWN_MENU';
      setGameMode('TOWN_MENU');
      setActiveTownLoc(loc);
      setNearbyLocation(null);
      nearbyLocRef.current = null;
      const p = playerRef.current;
      QUEST_DEFS.forEach(qd => checkQuestStep(p, qd, 'reach', { locationId: loc.id }));
      return;
    }
    {
      // 保存地城基礎光源（供 applyLightBuff 疊加用）
      const baseTorch   = cfg.torchRadius ?? TORCH_RADIUS;
      const baseAmbient = cfg.ambient     ?? AMBIENT;
      s.dungeonBaseLightCfg = { torchRadius: baseTorch, ambient: baseAmbient };
      const buff = playerRef.current.lightBuff;
      s.lightCfg = {
        torchRadius: buff ? Math.max(baseTorch, buff.torchRadius) : baseTorch,
        ambient:     buff ? Math.max(baseAmbient, buff.ambient)   : baseAmbient,
      };
    }
    s.won = false; s.t = 0; s.keys = {}; s.interactCooldown = 0;
    s.transitionPrompt = null; s.wasOnPortal = false; s.uiPaused = false;
    setTransitionPrompt(null); setWon(false); setLog([]);

    const safeMin = cfg.safeMin ?? 2;
    const safeMax = cfg.safeMax ?? 4;

    if (cfg.multiMap) {
      const floorCount = cfg.floorCount ?? 3;
      s.multiMap = true;
      s.maps = Array.from({ length: floorCount }, () =>
        buildSingleMap(cfg.cols, cfg.rows, cfg.fixedRooms ?? [], cfg.randomCount ?? 1, safeMin, safeMax, cfg.doorCount ?? 1, cfg.doorOpen ?? true)
      );
      const exitGX = 2 * (cfg.cols - 1) + 1;
      const exitGY = 2 * (cfg.rows - 1) + 1;
      for (let fi = 1; fi < floorCount; fi++) {
        if (fi % 2 !== 0) {
          // 奇數層：入口右下，出口左上
          s.maps[fi].entryGX = exitGX; s.maps[fi].entryGY = exitGY;
          s.maps[fi].exitGX  = 1;      s.maps[fi].exitGY  = 1;
          s.maps[fi].eCell   = { r: cfg.rows - 1, c: cfg.cols - 1 };
          s.maps[fi].xCell   = { r: 0, c: 0 };
        } else {
          // 偶數層：入口左上，出口右下（與第 0 層相同）
          s.maps[fi].entryGX = 1;      s.maps[fi].entryGY = 1;
          s.maps[fi].exitGX  = exitGX; s.maps[fi].exitGY  = exitGY;
          s.maps[fi].eCell   = { r: 0, c: 0 };
          s.maps[fi].xCell   = { r: cfg.rows - 1, c: cfg.cols - 1 };
        }
      }
      s.currentMapIdx = 0;
      syncCurrentMap(s);
      const sp = findSafeSpawn(s.grid, s.entryGX, s.entryGY);
      s.px = sp.px; s.py = sp.py; s.angle = Math.PI / 4;
      s.cols = cfg.cols; s.rows = cfg.rows;
      // 多層地城：第一層也做事件 + 敵人自動配置
      {
        const fr0 = cfg.fixedRooms ?? [];
        const { placed: pl0, enemies: en0 } = autoPlaceGlobalEvents(
          cfg.globalEvents ?? [], s.grid, s.rooms, cfg.rows, cfg.cols, ENEMIES
        );
        setEvents(resolveEvents(s.rooms, fr0, pl0));
        s.dungeonEnemies = en0;
      }
      setCurrentMapIdx(0); setMazeData(null);
    } else {
      s.multiMap = false; s.maps = []; s.currentMapIdx = 0;
      setCurrentMapIdx(0);
      const fr = cfg.fixedRooms ?? [];
      const { walls, rooms, doorPositions } = generateMaze(
        cfg.cols, cfg.rows, fr, cfg.randomCount ?? 3, safeMin, safeMax, cfg.doorCount ?? 2, cfg.doorOpen ?? true
      );
      const doors = doorPositions.map(dp => ({ ...dp, closed: dp.defaultOpen === false }));
      s.walls = walls; s.rooms = rooms; s.doors = doors;
      const { grid, zoneMap, doorMap } = buildGrid(walls, cfg.cols, cfg.rows, rooms, doors);
      s.grid = grid; s.zoneMap = zoneMap; s.doorMap = doorMap;
      s.cols = cfg.cols; s.rows = cfg.rows;
      const xCell = { r: cfg.rows - 1, c: cfg.cols - 1 };
      s.eCell = { r: 0, c: 0 }; s.xCell = xCell;
      s.entryGX = 1; s.entryGY = 1;
      s.exitGX = 2 * xCell.c + 1; s.exitGY = 2 * xCell.r + 1;
      s.px = 1.5; s.py = 1.5; s.angle = Math.PI / 4;
      // 自動將 globalEvents 配置到死路 / 房間空格，並生成遊走敵人
      const { placed, enemies } = autoPlaceGlobalEvents(
        cfg.globalEvents ?? [], grid, rooms, cfg.rows, cfg.cols, ENEMIES
      );
      setEvents(resolveEvents(rooms, fr, placed));
      s.dungeonEnemies = enemies;
      setMazeData(null);
    }

    s.gameMode = 'DUNGEON_INTERIOR';
    setGameMode('DUNGEON_INTERIOR');
    setNearbyLocation(null);
    nearbyLocRef.current = null;

    // 任務進度：reach
    const p = playerRef.current;
    QUEST_DEFS.forEach(qd => checkQuestStep(p, qd, 'reach', { locationId: loc.id }));
  }

  function toggleDoor(idx) {
    const s = g.current;
    s.doors = s.doors.map((d, i) => i === idx ? { ...d, closed: !d.closed } : d);
    const { grid, zoneMap, doorMap } = buildGrid(s.walls, s.cols, s.rows, s.rooms, s.doors);
    s.grid = grid; s.zoneMap = zoneMap; s.doorMap = doorMap;
    // 多地圖：同步回當前地圖快照
    if (s.multiMap && s.maps[s.currentMapIdx]) {
      const m = s.maps[s.currentMapIdx];
      m.doors = s.doors; m.grid = grid; m.zoneMap = zoneMap; m.doorMap = doorMap;
    }
    setLog(prev => [{ id: Date.now(), type: "door", text: `門已${s.doors[idx].closed ? "關閉" : "開啟"}` }, ...prev].slice(0, 30));
  }

  // ── 敵人 AI 更新（每 frame 呼叫）──
  function updateDungeonEnemies() {
    const s = g.current;
    if (!s.dungeonEnemies?.length || !s.grid) return;

    for (const e of s.dungeonEnemies) {
      if (!e.alive) continue;

      const dx = s.px - e.px, dy = s.py - e.py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 觸發戰鬥
      if (dist < ENEMY_TRIGGER_DIST && !s.uiPaused) {
        e.alive = false;
        s.uiPaused = true;
        emit('combat:start', { enemyId: e.enemyId });
        addToast({ type: 'combat', icon: '⚔️', title: `遭遇 ${e.name}！`, duration: 1800 });
        return; // 一次只一場戰鬥
      }

      // 狀態切換
      if (dist < ENEMY_DETECT_RANGE) {
        e.state = 'chase';
      } else if (dist > ENEMY_DETECT_RANGE * 1.5 && e.state === 'chase') {
        e.state = 'wander';
      }

      // 決定移動方向
      let angle = e.dirAngle;
      if (e.state === 'chase') {
        angle = Math.atan2(dy, dx);
      } else {
        e.stateTimer--;
        if (e.stateTimer <= 0) {
          e.dirAngle = Math.random() * Math.PI * 2;
          e.stateTimer = 60 + Math.floor(Math.random() * 80);
        }
        angle = e.dirAngle;
      }

      // 移動（簡易碰撞：分軸嘗試）
      const spd = e.speed;
      const nx = e.px + Math.cos(angle) * spd;
      const ny = e.py + Math.sin(angle) * spd;
      const gx = Math.floor(nx), gy = Math.floor(ny);
      if (s.grid[gy]?.[gx] === 0) {
        e.px = nx; e.py = ny;
      } else {
        // 撞牆：換方向
        e.dirAngle = Math.random() * Math.PI * 2;
        e.stateTimer = 20 + Math.floor(Math.random() * 30);
        e.state = 'wander';
      }
    }

    // 清除已死亡的敵人
    s.dungeonEnemies = s.dungeonEnemies.filter(e => e.alive);
  }

  // ── 世界 NPC 每幀偵測（靠近 + 敵對自動戰鬥）──
  // ★ 只做偵測，不移動 NPC；每幀都要呼叫
  function detectWorldNPCs() {
    const s = g.current;
    if (!s.worldNPCs?.length) return;

    // 偵測靠近的 NPC（取最近的）
    const near = getNearbyNPC(s.worldNPCs, s.wx, s.wy, 1.8);
    if (near?.id !== s.nearbyNPCId) {
      s.nearbyNPCId = near?.id ?? null;
      setNearbyNPC(near ?? null);
    }

    // 敵對 NPC 自動觸發戰鬥
    if (!s.uiPaused && s.interactCooldown === 0) {
      const hostiles = getHostileNPCsNear(s.worldNPCs, s.wx, s.wy, 1.0);
      if (hostiles.length > 0) {
        const h = hostiles[0];
        // 從陣列中移除，避免重複觸發
        const idx = s.worldNPCs.indexOf(h);
        if (idx >= 0) s.worldNPCs.splice(idx, 1);
        s.uiPaused = true;
        s.interactCooldown = 80;
        emit('combat:start', { enemyId: h.enemyId });
        addToast({ type: 'combat', icon: '⚔️', title: `遭遇 ${h.name}！`, duration: 1800 });
      }
    }
  }

  renderRef.current = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const s = g.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    s.t++;
    if (s.interactCooldown > 0) s.interactCooldown--;

    // ── 大地圖模式 ────────────────────────────
    if (s.gameMode === 'OVERWORLD') {
      const terrain = worldTerrainRef.current;
      if (!terrain) { s.animId = requestAnimationFrame(() => renderRef.current?.()); return; }

      if (!s.uiPaused) {
        const spd = WORLD_MOVE_SPEED;
        const dx = (s.keys['d'] || s.keys['ArrowRight'] ? spd : 0) - (s.keys['a'] || s.keys['ArrowLeft'] ? spd : 0);
        const dy = (s.keys['s'] || s.keys['ArrowDown']  ? spd : 0) - (s.keys['w'] || s.keys['ArrowUp']   ? spd : 0);
        const prevWx = s.wx, prevWy = s.wy;
        const nx = s.wx + dx, ny = s.wy + dy;
        if (isPassable(terrain, nx, s.wy)) s.wx = nx;
        if (isPassable(terrain, s.wx, ny)) s.wy = ny;

        // 移動距離累積 → 時間流逝
        const moved = Math.abs(s.wx - prevWx) + Math.abs(s.wy - prevWy);
        if (moved > 0) {
          s.timeAccum += moved;
          const minsGained = Math.floor(s.timeAccum / TIME_WORLD_PER_MIN);
          if (minsGained > 0) {
            s.timeAccum -= minsGained * TIME_WORLD_PER_MIN;
            s.gameTime = advanceTime(s.gameTime, minsGained);
            setGameTime(s.gameTime);
            tickLightBuff();
            // ★ NPC 移動只在時間推進時執行（玩家移動才觸發）
            if (s.worldNPCs?.length && worldTerrainRef.current) {
              updateNPCs(
                s.worldNPCs,
                worldTerrainRef.current,
                worldLocationsRef.current,
                s.gameTime,
                minsGained,
              );
            }
          }
        }

        // 靠近地點偵測
        const near = getNearbyLocation(worldLocationsRef.current, s.wx, s.wy, ENTRY_PROXIMITY);
        if (near?.id !== nearbyLocRef.current?.id) {
          nearbyLocRef.current = near;
          setNearbyLocation(near);
        }

        // E 鍵：優先進入地點，其次對話 NPC
        if ((s.keys['KeyE'] || s.keys['e']) && s.interactCooldown === 0) {
          s.keys['KeyE'] = false; s.keys['e'] = false;
          if (near) {
            s.interactCooldown = 40;
            doEnterLocation(near);
            s.animId = requestAnimationFrame(() => renderRef.current?.());
            return;
          }
          // 靠近的 NPC 互動
          const nearNPC = getNearbyNPC(s.worldNPCs, s.wx, s.wy, 1.8);
          if (nearNPC) {
            s.interactCooldown = 40;
            if (nearNPC.alignment === 'hostile' && nearNPC.enemyId) {
              // 敵對 NPC → 戰鬥
              const idx = s.worldNPCs.indexOf(nearNPC);
              if (idx >= 0) s.worldNPCs.splice(idx, 1);
              s.uiPaused = true;
              emit('combat:start', { enemyId: nearNPC.enemyId });
              addToast({ type: 'combat', icon: '⚔️', title: `挑戰 ${nearNPC.name}！`, duration: 1800 });
            } else if (nearNPC.dialogueId) {
              s.uiPaused = true;
              // 優先檢查：是否有完成但未領獎的任務可交差
              if (tryClaimQuest(nearNPC.dialogueId)) {
                addToast({ type: 'quest', icon: '📬', title: `任務交差：${nearNPC.name}`, duration: 1500 });
              } else {
                // 一般對話
                setActiveDialogue(nearNPC.dialogueId);
                addToast({ type: 'npc', icon: nearNPC.icon, title: nearNPC.name, duration: 1500 });
              }
            }
          }
        }

        // NPC 靠近偵測 + 敵對戰鬥觸發（每幀）
        detectWorldNPCs();
      }

      drawOverworld(ctx, W, H, terrain, worldLocationsRef.current, s.wx, s.wy, nearbyLocRef.current, s.worldNPCs, getNearbyNPC(s.worldNPCs, s.wx, s.wy, 1.8));
      s.animId = requestAnimationFrame(() => renderRef.current?.());
      return;
    }

    // ── 地城內部模式 ──────────────────────────
    if (!s.grid) { s.animId = requestAnimationFrame(() => renderRef.current?.()); return; }
    const gW = s.grid[0].length, gH = s.grid.length;

    if (!s.won && !s.uiPaused) {
      const cos = Math.cos(s.angle), sin = Math.sin(s.angle);
      const prevPx = s.px, prevPy = s.py;
      const mv = (nx, ny) => {
        if (s.grid[Math.floor(s.py)][Math.floor(nx)] === 0) s.px = nx;
        if (s.grid[Math.floor(ny)][Math.floor(s.px)] === 0) s.py = ny;
      };
      if (s.keys["ArrowUp"] || s.keys["w"]) mv(s.px + cos * MOVE_SPEED, s.py + sin * MOVE_SPEED);
      if (s.keys["ArrowDown"] || s.keys["s"]) mv(s.px - cos * MOVE_SPEED, s.py - sin * MOVE_SPEED);
      if (s.keys["ArrowLeft"] || s.keys["a"]) s.angle -= TURN_SPEED;
      if (s.keys["ArrowRight"] || s.keys["d"]) s.angle += TURN_SPEED;

      // 移動距離累積 → 時間流逝（轉向不算）
      const dungeonMoved = Math.abs(s.px - prevPx) + Math.abs(s.py - prevPy);
      if (dungeonMoved > 0) {
        s.timeAccum += dungeonMoved;
        const minsGained = Math.floor(s.timeAccum / TIME_DUNGEON_PER_MIN);
        if (minsGained > 0) {
          s.timeAccum -= minsGained * TIME_DUNGEON_PER_MIN;
          s.gameTime = advanceTime(s.gameTime, minsGained);
          setGameTime(s.gameTime);
          tickLightBuff();
          applyLightBuff();
        }
      }

      // 距離判定（中心 = portal座標 + 0.5），半徑 1.0 格都算「踩上」
      const PORTAL_RADIUS = 1.0;
      const onExitPortal  = Math.hypot(s.px - (s.exitGX  + 0.5), s.py - (s.exitGY  + 0.5)) < PORTAL_RADIUS;
      const onEntryPortal = Math.hypot(s.px - (s.entryGX + 0.5), s.py - (s.entryGY + 0.5)) < PORTAL_RADIUS
        && (s.multiMap ? s.currentMapIdx > 0 : s.gameMode === 'DUNGEON_INTERIOR');

      // 玩家離開傳送門後才能再觸發詢問
      if (s.wasOnPortal && !onExitPortal && !onEntryPortal) {
        s.wasOnPortal = false;
      }
      // 玩家離開傳送門時自動收起詢問框
      if (s.transitionPrompt && !onExitPortal && !onEntryPortal) {
        s.transitionPrompt = null;
        setTransitionPrompt(null);
      }
      // 首次踩上傳送門時顯示詢問框
      if (!s.wasOnPortal && !s.transitionPrompt) {
        if (onExitPortal) {
          if (s.multiMap && s.currentMapIdx < s.maps.length - 1) {
            // 多層：前往下一層
            s.transitionPrompt = 'fwd';
            setTransitionPrompt('fwd');
          } else if (s.gameMode === 'DUNGEON_INTERIOR') {
            // RPG 模式：出口 → 詢問是否返回大地圖
            s.transitionPrompt = 'gate';
            setTransitionPrompt('gate');
          } else {
            // 舊的「迷宮遊戲」模式
            s.won = true; setWon(true);
          }
          s.wasOnPortal = true;
        } else if (onEntryPortal) {
          s.transitionPrompt = 'bwd';
          setTransitionPrompt('bwd');
          s.wasOnPortal = true;
        }
      }

      // I 鍵開啟背包
      if ((s.keys['KeyI'] || s.keys['i']) && s.interactCooldown === 0) {
        s.keys['KeyI'] = false; s.keys['i'] = false;
        s.interactCooldown = 30;
        s.uiPaused = true;
        setShowInventory(true);
      }

      // C 鍵開啟屬性
      if ((s.keys['KeyC'] || s.keys['c']) && s.interactCooldown === 0) {
        s.keys['KeyC'] = false; s.keys['c'] = false;
        s.interactCooldown = 30;
        s.uiPaused = true;
        setShowStats(true);
      }

      // Q 鍵開啟任務日誌
      if ((s.keys['KeyQ'] || s.keys['q']) && s.interactCooldown === 0) {
        s.keys['KeyQ'] = false; s.keys['q'] = false;
        s.interactCooldown = 30;
        s.uiPaused = true;
        setShowQuestLog(true);
      }

      const mr = Math.round((s.py - 1) / 2), mc = Math.round((s.px - 1) / 2);
      eventsRef.current.forEach((ev, i) => {
        if (ev.triggered && !ev.repeatable) return;
        if (ev.r === mr && ev.c === mc && s.interactCooldown === 0) {
          s.interactCooldown = 80; triggerEvent(ev, i);
        }
      });
      if (s.keys["KeyE"] && s.interactCooldown === 0) {
        s.interactCooldown = 40;
        let nearest = null, nearDist = INTERACT_DIST;
        s.doors.forEach((door, i) => {
          const { wx, wy } = doorWorldPos(door);
          const d = Math.hypot(wx - s.px, wy - s.py);
          if (d < nearDist) { nearest = i; nearDist = d; }
        });
        if (nearest !== null) toggleDoor(nearest);
      }

      // ── 敵人 AI 更新 ──
      updateDungeonEnemies();
    }

    const txs = textureRef.current;

    // 火把閃爍（多頻正弦疊加，利用現有 s.t 計數器）
    const flicker = 1.0
      + 0.06 * Math.sin(s.t * 0.27)
      + 0.04 * Math.sin(s.t * 0.71)
      + 0.02 * Math.sin(s.t * 1.37);
    const torchBright = Math.max(0.7, Math.min(1.1, flicker));

    const lightCfg = {
      ...(s.lightCfg || {}),
      fullMap:     s.cheatFullMap ?? false,
      showEnemies: (s.cheatFullMap ?? false) || hasItem(playerRef.current, 'night_pearl'),
    };
    const rays = castRays(s.grid, s.zoneMap, s.doorMap, s.px, s.py, s.angle, gW, gH);

    // 1. 地板 + 天花板（逐像素 ImageData）
    renderFloorCeiling(ctx, W, H, s.px, s.py, s.angle, s.zoneMap, gW, gH, txs, torchBright, lightCfg);

    // 2. 牆壁（貼圖切片或平面填色）
    renderWalls(ctx, W, H, rays, txs, s.doors, torchBright, lightCfg);

    // 3. 精靈（傳送門 + 事件 + 敵人，依距離由遠到近繪製）
    const sprites = [
      { type: "entry", wx: s.entryGX + 0.5, wy: s.entryGY + 0.5 },
      { type: "exit",  wx: s.exitGX  + 0.5, wy: s.exitGY  + 0.5 },
      ...eventsRef.current
        .filter(ev => !ev.triggered || ev.repeatable)
        .map(ev => ({ type: "event", wx: 2 * ev.c + 1 + 0.5, wy: 2 * ev.r + 1 + 0.5, ev })),
      ...(s.dungeonEnemies ?? [])
        .filter(e => e.alive)
        .map(e => ({ type: "enemy", wx: e.px, wy: e.py, e })),
    ];
    sprites.sort((a, b) => Math.hypot(b.wx - s.px, b.wy - s.py) - Math.hypot(a.wx - s.px, a.wy - s.py));
    for (const sp of sprites) {
      const info = getSpriteInfo(sp.wx, sp.wy, s.px, s.py, s.angle, W, rays);
      if (!info) continue;
      if (sp.type === "entry") drawEntryArch(ctx, info.screenX, info.dist, H);
      else if (sp.type === "exit")  drawExitPortal(ctx, info.screenX, info.dist, H, s.t);
      else if (sp.type === "enemy") drawEnemy(ctx, info.screenX, info.dist, H, sp.e, s.t);
      else drawEventMarker(ctx, info.screenX, info.dist, H, sp.ev, s.t);
    }

    // 4. 小地圖 + HUD
    let nearDoor = null, nearDoorDist = INTERACT_DIST;
    s.doors.forEach(door => {
      const { wx, wy } = doorWorldPos(door);
      const d = Math.hypot(wx - s.px, wy - s.py);
      if (d < nearDoorDist) { nearDoor = door; nearDoorDist = d; }
    });
    drawMinimap(ctx, s.walls, s.cols, s.rows, s.px, s.py, s.angle, s.rooms, s.eCell, s.xCell, eventsRef.current, s.doors, torchBright, s.grid, lightCfg, s.dungeonEnemies ?? []);
    drawHUD(ctx, W, H, nearDoor ? `[E]  ${nearDoor.closed ? "開門" : "關門"}` : null);

    s.animId = requestAnimationFrame(() => renderRef.current?.());
  };

  const initMaze = useCallback(() => {
    const s = g.current; s.cols = cols; s.rows = rows;
    const safeMin = Math.min(minRoom, maxRoom), safeMax = Math.max(minRoom, maxRoom);
    const factory = FACTORIES.find(f => f.id === factoryMode) || FACTORIES[2];

    s.won = false; s.t = 0; s.keys = {}; s.interactCooldown = 0;
    s.transitionPrompt = null; s.wasOnPortal = false;
    setTransitionPrompt(null);
    setWon(false); setLog([]);

    if (factory.multiMap) {
      // ── 多地圖串聯模式：產生三張獨立迷宮 ──
      s.multiMap = true;
      s.maps = [0, 1, 2].map(() =>
        buildSingleMap(cols, rows, [], factory.randomCount, safeMin, safeMax, defaultDoorCount, defaultDoorOpen)
      );
      // 交替式傳送門：A右下→B右下（B出口在左上）→C左上（C出口在右下）
      const exitGX = 2 * (cols - 1) + 1, exitGY = 2 * (rows - 1) + 1;
      // Map B：入口右下、出口左上（eCell/xCell 供小地圖使用）
      s.maps[1].entryGX = exitGX;    s.maps[1].entryGY = exitGY;
      s.maps[1].exitGX  = 1;         s.maps[1].exitGY  = 1;
      s.maps[1].eCell   = { r: rows - 1, c: cols - 1 };
      s.maps[1].xCell   = { r: 0, c: 0 };
      // Map C：入口左上、出口右下（與 A 相同，預設值已正確）
      s.maps[2].entryGX = 1;         s.maps[2].entryGY = 1;
      s.maps[2].exitGX  = exitGX;    s.maps[2].exitGY  = exitGY;
      s.currentMapIdx = 0;
      syncCurrentMap(s);
      const spawn0 = findSafeSpawn(s.grid, s.entryGX, s.entryGY);
      s.px = spawn0.px; s.py = spawn0.py; s.angle = Math.PI / 4;
      setCurrentMapIdx(0);
      setEvents([]);
      setMazeData(null);
    } else {
      // ── 單地圖模式 ──
      s.multiMap = false; s.maps = []; s.currentMapIdx = 0;
      setCurrentMapIdx(0);

      // 取得工廠設定的房間清單與隨機房間數
      const activeFixedRooms = factory.id === FACTORY_IDS.CUSTOM
        ? fixedRooms
        : factory.getFixedRooms(cols, rows);
      const activeRandomCount = factory.id === FACTORY_IDS.CUSTOM
        ? randomCount
        : factory.randomCount;

      const { walls, rooms, doorPositions } = generateMaze(
        cols, rows, activeFixedRooms, activeRandomCount, safeMin, safeMax, defaultDoorCount, defaultDoorOpen
      );
      const doors = doorPositions.map(dp => ({ ...dp, closed: dp.defaultOpen === false }));
      s.walls = walls; s.rooms = rooms; s.doors = doors;
      const { grid, zoneMap, doorMap } = buildGrid(walls, cols, rows, rooms, doors);
      s.grid = grid; s.zoneMap = zoneMap; s.doorMap = doorMap;

      // 由工廠決定出口格子座標
      const xCell = factory.getExitCell(rooms, cols, rows);
      s.eCell = { r: 0, c: 0 }; s.xCell = xCell;
      s.entryGX = 1; s.entryGY = 1;
      s.exitGX = 2 * xCell.c + 1; s.exitGY = 2 * xCell.r + 1;
      s.px = 1.5; s.py = 1.5; s.angle = Math.PI / 4;

      setEvents(resolveEvents(rooms, activeFixedRooms, globalEvCfg));

      // 收集迷宮資料供顯示用
      setMazeData({
        size: { cols, rows },
        rooms: rooms.map(rm => ({
          type: rm.fixed ? `固定房間 ${rm.origIdx + 1}` : '隨機房間',
          r: rm.r, c: rm.c, w: rm.w, h: rm.h,
          area: rm.w * rm.h,
          events: rm.fixed
            ? (activeFixedRooms[rm.origIdx]?.events || []).map(ev => ({ type: ev.type, pos: `△${ev.dr},△${ev.dc}`, text: ev.text }))
            : [],
        })),
        doors: doors.map((d, i) => ({ id: i, side: d.side, r: d.r, c: d.c, roomIdx: d.roomIdx })),
        globalEvents: resolveEvents(rooms, activeFixedRooms, globalEvCfg)
          .filter(ev => !ev.roomLabel)
          .map(ev => ({ type: ev.type, r: ev.r, c: ev.c, text: ev.text })),
        entry: { r: 0, c: 0 },
        exit: { r: xCell.r, c: xCell.c },
      });
    }
  }, [cols, rows, fixedRooms, randomCount, minRoom, maxRoom, defaultDoorCount, defaultDoorOpen, globalEvCfg, factoryMode]);

  useEffect(() => {
    // 初始化世界地圖（只需一次）
    if (!worldTerrainRef.current) {
      regenerateWorld(WORLD_FACTORY_IDS.GRAND_WORLD, 1);
    }

    const canvas = canvasRef.current; if (!canvas) return;
    canvas.width = 640; canvas.height = 440;
    cancelAnimationFrame(g.current.animId);
    g.current.animId = requestAnimationFrame(() => renderRef.current?.());
    const onKey = e => {
      g.current.keys[e.code] = e.type === "keydown";
      g.current.keys[e.key] = e.type === "keydown";
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      cancelAnimationFrame(g.current.animId);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  // 世界地圖工廠：worldSeed 或 worldFactoryId 變化時重新產生地形
  useEffect(() => {
    if (!canvasRef.current) return; // 尚未掛載
    regenerateWorld(worldFactoryId, worldSeed);
  }, [worldFactoryId, worldSeed]); // eslint-disable-line react-hooks/exhaustive-deps

  // 迷宮編輯器模式：seed 變化時重新初始化並切換至地城視角
  useEffect(() => {
    if (seed === 0) return; // 初次掛載不執行（保留大地圖模式）
    initMaze();
    g.current.gameMode = 'DUNGEON_INTERIOR';
    g.current.lightCfg = { ambient: AMBIENT, torchRadius: TORCH_RADIUS };
    setGameMode('DUNGEON_INTERIOR');
  }, [seed]); // eslint-disable-line react-hooks/exhaustive-deps

  // 確認傳送（支援多層高塔 / 多地圖）
  const confirmTransition = useCallback(() => {
    const s = g.current;
    const dir = s.transitionPrompt;
    if (!dir) return;
    s.transitionPrompt = null;
    setTransitionPrompt(null);
    s.wasOnPortal = true;
    if (dir === 'gate') {
      doExitToOverworld();
      return;
    }
    if (dir === 'fwd') {
      s.currentMapIdx++;
      // 若已是最後一層 → 返回大地圖
      if (s.currentMapIdx >= s.maps.length) {
        doExitToOverworld();
        return;
      }
      syncCurrentMap(s);
      s.dungeonEnemies = []; // 切換樓層時清除敵人（新樓層需重新生成）
      eventsRef.current = []; setEvents([]);
      setCurrentMapIdx(s.currentMapIdx);
      const sp = findSafeSpawn(s.grid, s.entryGX, s.entryGY);
      s.px = sp.px; s.py = sp.py;
    } else {
      s.currentMapIdx--;
      if (s.currentMapIdx < 0) {
        // 回到地城入口 → 返回大地圖
        doExitToOverworld();
        return;
      }
      syncCurrentMap(s);
      s.dungeonEnemies = [];
      eventsRef.current = []; setEvents([]);
      setCurrentMapIdx(s.currentMapIdx);
      const sp = findSafeSpawn(s.grid, s.exitGX, s.exitGY);
      s.px = sp.px; s.py = sp.py;
    }
  }, []);

  // 取消傳送（玩家需離開傳送門才能再次詢問）
  const cancelTransition = useCallback(() => {
    const s = g.current;
    s.transitionPrompt = null;
    setTransitionPrompt(null);
    // wasOnPortal 保持 true，確保玩家離開後才能再觸發
  }, []);

  const press = (k, d) => { g.current.keys[k] = d; };
  const DBtn = ({ label, k, code }) => (
    <button
      onPointerDown={e => { e.preventDefault(); press(k, true); if (code) press(code, true); }}
      onPointerUp={e => { e.preventDefault(); press(k, false); if (code) press(code, false); }}
      onPointerLeave={e => { e.preventDefault(); press(k, false); if (code) press(code, false); }}
      style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none", touchAction: "none", fontSize: 15 }}>
      {label}
    </button>
  );

  // ── 事件編輯器輔助函式 ────────────────
  const setRmEvent = (rIdx, ei, patch) => setFixedRooms(p => p.map((x, j) => j === rIdx ? { ...x, events: (x.events || []).map((xe, k) => k === ei ? { ...xe, ...patch } : xe) } : x));
  const delRmEvent = (rIdx, ei) => setFixedRooms(p => p.map((x, j) => j === rIdx ? { ...x, events: (x.events || []).filter((_, k) => k !== ei) } : x));
  const addRmEvent = (rIdx) => setFixedRooms(p => p.map((x, j) => j === rIdx ? { ...x, events: [...(x.events || []), { id: `fr${rIdx}_${Date.now()}`, dr: 0, dc: 0, type: "message", text: "新事件", icon: "!", repeatable: false }] } : x));
  const addRmRoom = () => setFixedRooms(p => [...p, { r: 2, c: 2, w: 3, h: 3, events: [] }]);
  const delRmRoom = (i) => setFixedRooms(p => p.filter((_, j) => j !== i));
  const setRmField = (i, field, val) => setFixedRooms(p => p.map((x, j) => j === i ? { ...x, [field]: Number(val) } : x));

  const updateZone = (zoneIdx, newZone) =>
    setTextures(prev => { const n = [...prev]; while (n.length <= zoneIdx) n.push({}); n[zoneIdx] = newZone; return n; });

  const typeColor = { message: "var(--color-text-primary)", teleport: "var(--color-text-info)", door: "var(--color-text-warning)", win: "var(--color-text-success)" };
  const safeMin = Math.min(minRoom, maxRoom), safeMax = Math.max(minRoom, maxRoom);

  // ── 畫面通知 ──
  function addToast({ type = 'message', icon = '📢', title, body, duration = 2500 }) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, type, icon, title, body, duration }]);
  }

  // ── 時間工具 ──
  function advanceGameTime(minutes) {
    g.current.gameTime = advanceTime(g.current.gameTime, minutes);
    setGameTime(g.current.gameTime);
  }

  // ── 光源 buff 套用 / 清除 ──
  function applyLightBuff() {
    const p   = playerRef.current;
    const s   = g.current;
    const buff = p.lightBuff;
    // 以地城基礎設定為底，buff 只能增強不能減弱
    const base = s.dungeonBaseLightCfg ?? { torchRadius: TORCH_RADIUS, ambient: AMBIENT };
    s.lightCfg = buff
      ? { torchRadius: Math.max(base.torchRadius, buff.torchRadius),
          ambient:     Math.max(base.ambient,     buff.ambient) }
      : { ...base };
  }

  function tickLightBuff() {
    const p = playerRef.current;
    if (!p.lightBuff) return;
    if (p.lightBuff.duration === Infinity) return; // 永久效果，不過期
    const now     = g.current.gameTime;
    const started = p.lightBuff.startedAt;
    // 經過的遊戲分鐘（跨午夜也正確）
    const elapsed = (now - started + 1440) % 1440;
    if (elapsed >= p.lightBuff.duration) {
      p.lightBuff = null;
      applyLightBuff();
      setPlayerStats({ ...p });
    }
  }

  function doCampRest() {
    g.current.uiPaused = true;
    setShowCampRest(true);
  }

  function applyCampRest(restMins) {
    const p = playerRef.current;
    const { hp, mp } = calcRestRecovery(p, restMins);
    p.hp = Math.min(p.maxHp, p.hp + hp);
    p.mp = Math.min(p.maxMp, p.mp + mp);
    g.current.gameTime = advanceTime(g.current.gameTime, restMins);
    setGameTime(g.current.gameTime);
    tickLightBuff(); // 休息可能讓火把過期
    setPlayerStats({ ...p });
    setShowCampRest(false);
    g.current.uiPaused = false;
    g.current.interactCooldown = 30;
  }

  // ── 任務系統回呼 ──────────────────────────────────────────────────────────

  // DialoguePanel → questOffer 選項被點擊時呼叫
  // continueDialogue：accept 或 decline 後繼續/關閉對話的函式
  function handleQuestOffer(questId, continueDialogue) {
    setActiveQuestOffer({ questId, mode: 'offer', continueDialogue });
  }

  // QuestOfferPanel「接受任務」
  function handleQuestAccept() {
    if (!activeQuestOffer) return;
    const { questId, mode, continueDialogue } = activeQuestOffer;
    setActiveQuestOffer(null);

    if (mode === 'offer') {
      const def = QUEST_DEFS.find(q => q.id === questId);
      if (def) {
        addQuest(playerRef.current, def);
        setQuestLog(playerRef.current.quests.map(q => ({ ...q })));
        addToast({ type: 'quest', icon: '📜', title: `接受任務：${def.title}`, duration: 2500 });
      }
      continueDialogue?.();           // 繼續 / 關閉對話
    } else {
      // reward 模式：領獎邏輯已封裝在 continueDialogue 裡
      continueDialogue?.();
    }
  }

  // QuestOfferPanel「拒絕」（只有 offer 模式有）
  function handleQuestDecline() {
    if (!activeQuestOffer) return;
    const { continueDialogue } = activeQuestOffer;
    setActiveQuestOffer(null);
    continueDialogue?.();
  }

  // 向 NPC 交差（回到 giverNpc 時自動偵測）
  function tryClaimQuest(dialogueId) {
    const p = playerRef.current;
    const claimable = QUEST_DEFS.find(qd =>
      qd.giverNpcId === dialogueId &&
      p.quests.some(q => q.questId === qd.id && q.completed && !q.claimed)
    );
    if (!claimable) return false;

    // 顯示領獎彈窗
    const playerQuest = p.quests.find(q => q.questId === claimable.id);
    setActiveQuestOffer({
      questId: claimable.id,
      mode: 'reward',
      playerQuest,
      continueDialogue: () => {
        // 領取獎勵
        const r = claimReward(p, claimable);
        if (r?.exp) {
          const { leveled, messages } = gainExp(p, r.exp);
          if (leveled) addToast({ type: 'levelup', icon: '⬆', title: messages[0] ?? '升等！', duration: 3000 });
        }
        setPlayerStats({ ...p });
        setQuestLog(p.quests.map(q => ({ ...q })));
        setActiveQuestOffer(null);
        g.current.uiPaused = false;
        g.current.interactCooldown = 60;
        addToast({ type: 'quest', icon: '🎉', title: `任務完成：${claimable.title}！`, duration: 3000 });
      },
    });
    return true;
  }

  // ── UI 面板關閉回呼 ──
  function closeDialogue()   { setActiveDialogue(null);   g.current.uiPaused = false; g.current.interactCooldown = 60; advanceGameTime(TIME_DIALOGUE); }
  function closeQuestLog()   { setShowQuestLog(false);    g.current.uiPaused = false; g.current.interactCooldown = 30; }
  function closeShop()      { setActiveShop(null);     g.current.uiPaused = false; g.current.interactCooldown = 60; advanceGameTime(TIME_SHOP); }
  function closeInventory() { setShowInventory(false); g.current.uiPaused = false; g.current.interactCooldown = 30; }
  function closeStats()     { setShowStats(false);     g.current.uiPaused = false; g.current.interactCooldown = 30; }

  // ── 戰鬥事件訂閱 ──
  useEffect(() => {
    const unsubStart = on('combat:start', ({ enemyId }) => {
      setActiveCombat(enemyId);
    });

    const unsubEnd = on('combat:end', (result) => {
      setActiveCombat(null);
      g.current.uiPaused = false;
      g.current.interactCooldown = 80;
      const p = playerRef.current;

      const { leveled, levelMsg } = applyCombatResult(result, p, QUEST_DEFS);
      if (leveled) {
        setLevelUpMsg(levelMsg);
        setTimeout(() => setLevelUpMsg(''), 3000);
        addToast({ type: 'message', icon: '⭐', title: levelMsg, duration: 3500 });
      }

      // 戰鬥結果通知
      if (result?.won) {
        const lootLines = (result.loot || [])
          .map(l => `${ITEMS[l.itemId]?.icon ?? '📦'} ${ITEMS[l.itemId]?.name ?? l.itemId} ×${l.qty}`)
          .join('　');
        addToast({
          type: 'chest',
          icon: '🎉',
          title: '戰鬥勝利！',
          body: lootLines || (result.exp ? `EXP +${result.exp}` : undefined),
          duration: 3000,
        });
      } else if (result?.fled) {
        addToast({ type: 'door', icon: '💨', title: '成功逃跑', duration: 1800 });
      } else if (!result?.won) {
        addToast({ type: 'combat', icon: '💀', title: '戰鬥失敗', body: '傳送至入口', duration: 3000 });
      }

      if (!result?.fled) {
        g.current.gameTime = advanceTime(g.current.gameTime, TIME_COMBAT);
        setGameTime(g.current.gameTime);
      }

      if (!result?.won && !result?.fled) {
        const s = g.current;
        p.hp = Math.max(1, Math.floor(p.maxHp * 0.3));
        const sp = findSafeSpawn(s.grid, s.entryGX, s.entryGY);
        s.px = sp.px; s.py = sp.py;
      }
      setPlayerStats({ ...p });
      setQuestLog(p.quests.map(q => ({ ...q })));
    });

    return () => { unsubStart(); unsubEnd(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: "1rem 0", fontFamily: "var(--font-sans)" }}>
      <div style={{ position: 'fixed', bottom: 8, right: 10, fontSize: 10, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', zIndex: 9999 }}>
        v0.3.0-timesystem
      </div>

      {/* ── 迷宮工廠選擇器（地城模式才顯示）── */}
      {gameMode === 'DUNGEON_INTERIOR' && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {FACTORIES.map(f => (
            <button
              key={f.id}
              onClick={() => { setFactoryMode(f.id); setSeed(s => s + 1); }}
              title={f.description}
              style={{
                fontSize: 12, padding: "5px 12px",
                borderRadius: "var(--border-radius-md)",
                background: factoryMode === f.id ? "var(--color-background-info)" : "var(--color-background-secondary)",
                color: factoryMode === f.id ? "var(--color-text-info)" : "var(--color-text-secondary)",
                border: factoryMode === f.id ? "0.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
                fontWeight: factoryMode === f.id ? 600 : 400,
              }}>
              {f.label}
            </button>
          ))}
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", alignSelf: "center", marginLeft: 4 }}>
            {FACTORIES.find(f => f.id === factoryMode)?.description}
          </span>
        </div>
      )}

      {/* ── 大地圖工廠選擇器 ── */}
      {gameMode === 'OVERWORLD' && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
          {WORLD_FACTORIES.map(f => (
            <button
              key={f.id}
              onClick={() => setWorldFactoryId(f.id)}
              title={f.description}
              style={{
                fontSize: 12, padding: "5px 12px",
                borderRadius: "var(--border-radius-md)",
                background: worldFactoryId === f.id ? "var(--color-background-success)" : "var(--color-background-secondary)",
                color: worldFactoryId === f.id ? "var(--color-text-success)" : "var(--color-text-secondary)",
                border: worldFactoryId === f.id ? "0.5px solid var(--color-border-success)" : "0.5px solid var(--color-border-tertiary)",
                fontWeight: worldFactoryId === f.id ? 600 : 400,
              }}>
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setWorldSeed(s => s + 1)}
            style={{ fontSize: 12, padding: "5px 12px", marginLeft: 4 }}>
            🎲 重新產生地圖
          </button>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", alignSelf: "center" }}>
            {WORLD_FACTORIES.find(f => f.id === worldFactoryId)?.description}
            {' '}#{worldSeed}
          </span>
        </div>
      )}

      {/* ── 地城模式按鈕 ── */}
      {gameMode === 'DUNGEON_INTERIOR' && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <button onClick={doExitToOverworld} style={{ fontSize: 12, padding: "4px 12px" }}>← 返回大地圖</button>
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
            📍 {worldLocationsRef.current.find(l => l.id === g.current.activeLocationId)?.label || '地城'}
          </span>
          {/* 玩家狀態列 */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 12 }}>
            <span style={{ color: "#ff8888" }}>❤ {playerStats.hp}/{playerStats.maxHp}</span>
            <span style={{ color: "#88aaff" }}>💧 {playerStats.mp}/{playerStats.maxMp}</span>
            <span style={{ color: "#ffd060" }}>💰 {playerStats.gold}</span>
            <span style={{ color: "#aaffaa" }}>Lv.{playerStats.lv}</span>
          </div>
        </div>
      )}

      {/* ── 城鎮選單模式按鈕 ── */}
      {gameMode === 'TOWN_MENU' && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <button onClick={doExitToOverworld} style={{ fontSize: 12, padding: "4px 12px" }}>← 返回大地圖</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 12 }}>
            <span style={{ color: "#ff8888" }}>❤ {playerStats.hp}/{playerStats.maxHp}</span>
            <span style={{ color: "#88aaff" }}>💧 {playerStats.mp}/{playerStats.maxMp}</span>
            <span style={{ color: "#ffd060" }}>💰 {playerStats.gold}</span>
            <span style={{ color: "#aaffaa" }}>Lv.{playerStats.lv}</span>
          </div>
        </div>
      )}

      {/* ── 城鎮選單 ── */}
      {gameMode === 'TOWN_MENU' && activeTownLoc && (
        <div style={{ marginBottom: 10, position: "relative", display: "inline-block" }}>
          <TownPanel
            loc={activeTownLoc}
            events={events}
            onEvent={triggerEvent}
            onExit={doExitToOverworld}
          />
          {/* 覆蓋面板（對話/商店/戰鬥/港口）掛在同一容器 */}
          {activeDialogue && (
            <DialoguePanel
              lines={DIALOGUES[activeDialogue] || []}
              onClose={closeDialogue}
              onQuestOffer={handleQuestOffer}
            />
          )}
          {activeShop && (
            <ShopPanel
              shopDef={SHOPS[activeShop]}
              player={playerRef.current}
              onClose={closeShop}
              onPlayerUpdate={() => setPlayerStats({ ...playerRef.current })}
            />
          )}
          {activeCombat && (
            <CombatPanel enemyId={activeCombat} player={playerRef.current} />
          )}
          {activePort && (
            <PortPanel
              port={activePort}
              locations={worldLocationsRef.current}
              onTravel={doTravelToPort}
              onClose={closePort}
            />
          )}
        </div>
      )}

      {/* ── 畫布 ── */}
      <div style={{ overflowX: "auto", marginBottom: 10, position: "relative", display: gameMode === 'TOWN_MENU' ? "none" : "inline-block" }}>
        <canvas ref={canvasRef} style={{ display: "block", borderRadius: "var(--border-radius-md)", background: "#0d0d1a" }} />

        {/* 人物動作面板（含時間） */}
        {(() => {
          const period = getTimePeriod(gameTime);
          return (
            <div style={{
              position: 'absolute', bottom: 16, left: 16,
              background: 'rgba(8,8,18,0.55)',
              backdropFilter: 'blur(6px)',
              border: `1px solid ${period.color}30`,
              borderRadius: 8, padding: '8px 10px',
              fontFamily: 'monospace', zIndex: 8, minWidth: 120,
            }}>
              {/* 時間列 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                <span style={{ fontSize: 13, lineHeight: 1 }}>{period.icon}</span>
                <span style={{ fontSize: 12, color: period.color, letterSpacing: '0.06em', fontWeight: 600 }}>
                  {formatTime(gameTime)}
                </span>
                <span style={{ fontSize: 9, color: `${period.color}99` }}>
                  {period.label}
                </span>
              </div>

              {/* 光源 buff 狀態 */}
              {playerStats.lightBuff && (() => {
                const buff = playerStats.lightBuff;
                const isInfinite = buff.duration === Infinity;
                // elapsed = 已過去的遊戲分鐘（跨午夜也正確）
                const elapsed   = isInfinite ? 0 : (gameTime - buff.startedAt + 1440) % 1440;
                const remaining = isInfinite ? null : Math.max(0, buff.duration - elapsed);
                const pct       = isInfinite ? 100 : Math.min(100, (remaining / buff.duration) * 100);
                return (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: 11 }}>{buff.icon}</span>
                      <span style={{ fontSize: 10, color: '#ffdd88' }}>{buff.name}</span>
                      <span style={{ fontSize: 9, color: isInfinite ? '#aaffcc' : '#888', marginLeft: 'auto' }}>
                        {isInfinite ? '永久' : `${remaining}分`}
                      </span>
                    </div>
                    {!isInfinite && (
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${pct}%`,
                          background: pct > 40 ? '#ffcc44' : pct > 15 ? '#ff8844' : '#ff4444',
                          transition: 'width 0.5s',
                        }} />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 快捷按鈕列 */}
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => setShowInventory(true)} title="背包 [I]" style={{
                  flex: 1, padding: '5px 0', borderRadius: 5, cursor: 'pointer', fontSize: 14,
                  background: 'rgba(40,100,60,0.4)', border: '1px solid rgba(80,180,80,0.4)', color: '#88dd88',
                }}>🎒</button>
                <button onClick={() => setShowStats(true)} title="屬性 [C]" style={{
                  flex: 1, padding: '5px 0', borderRadius: 5, cursor: 'pointer', fontSize: 14,
                  background: 'rgba(40,80,160,0.4)', border: '1px solid rgba(80,140,255,0.4)', color: '#88ccff',
                }}>📊</button>
                <button
                  onClick={() => { setShowQuestLog(true); g.current.uiPaused = true; }}
                  title="任務日誌 [Q]"
                  style={{
                    flex: 1, padding: '5px 0', borderRadius: 5, cursor: 'pointer', fontSize: 14,
                    background: questLog.some(q => q.completed && !q.claimed)
                      ? 'rgba(160,120,20,0.45)'
                      : 'rgba(100,70,20,0.35)',
                    border: questLog.some(q => q.completed && !q.claimed)
                      ? '1px solid rgba(220,170,40,0.7)'
                      : '1px solid rgba(180,130,40,0.4)',
                    color: questLog.some(q => q.completed && !q.claimed) ? '#f0c040' : '#c09840',
                  }}
                >📜</button>
                {gameMode === 'OVERWORLD' && (
                  <button onClick={doCampRest} title="扎營休息" style={{
                    flex: 1, padding: '5px 0', borderRadius: 5, cursor: 'pointer', fontSize: 14,
                    background: 'rgba(60,60,100,0.4)', border: '1px solid rgba(100,100,180,0.4)', color: '#aaaaff',
                  }}>⛺</button>
                )}
                {gameMode === 'DUNGEON_INTERIOR' && (
                  <button
                    onClick={() => {
                      const next = !cheatFullMap;
                      setCheatFullMap(next);
                      g.current.cheatFullMap = next;
                    }}
                    title="作弊：全開小地圖"
                    style={{
                      flex: 1, padding: '5px 0', borderRadius: 5, cursor: 'pointer', fontSize: 14,
                      background: cheatFullMap ? 'rgba(200,160,0,0.5)' : 'rgba(80,60,0,0.4)',
                      border: `1px solid ${cheatFullMap ? 'rgba(255,220,0,0.8)' : 'rgba(140,110,0,0.4)'}`,
                      color: cheatFullMap ? '#ffe066' : '#998833',
                    }}
                  >🗺</button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── 港口旅行面板 ── */}
        {gameMode !== 'TOWN_MENU' && activePort && (
          <PortPanel
            port={activePort}
            locations={worldLocationsRef.current}
            onTravel={doTravelToPort}
            onClose={closePort}
          />
        )}

        {/* ── RPG 覆蓋面板（地城模式）── */}
        {gameMode !== 'TOWN_MENU' && activeDialogue && (
          <DialoguePanel
            lines={DIALOGUES[activeDialogue] || []}
            onClose={closeDialogue}
            onQuestOffer={handleQuestOffer}
          />
        )}
        {gameMode !== 'TOWN_MENU' && activeShop && (
          <ShopPanel
            shopDef={SHOPS[activeShop]}
            player={playerRef.current}
            onClose={closeShop}
            onPlayerUpdate={() => setPlayerStats({ ...playerRef.current })}
          />
        )}
        {gameMode !== 'TOWN_MENU' && activeCombat && (
          <CombatPanel
            enemyId={activeCombat}
            player={playerRef.current}
          />
        )}
        {showInventory && (
          <InventoryPanel
            player={playerRef.current}
            onClose={closeInventory}
            onPlayerUpdate={() => { applyLightBuff(); setPlayerStats({ ...playerRef.current }); }}
            currentGameTime={gameTime}
          />
        )}
        {showStats && (
          <StatsPanel
            player={playerRef.current}
            onClose={closeStats}
          />
        )}
        {showCampRest && (
          <CampRestPanel
            player={playerRef.current}
            currentTime={gameTime}
            onRest={applyCampRest}
            onClose={() => { setShowCampRest(false); g.current.uiPaused = false; }}
          />
        )}

        {/* 事件通知 Toast */}
        <ToastNotification
          toasts={toasts}
          onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))}
        />

        {/* 升等提示 */}
        {levelUpMsg && (
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
            background: "rgba(255,220,40,0.95)", color: "#3a2000", fontWeight: 700,
            fontSize: 14, padding: "8px 20px", borderRadius: 8, whiteSpace: "nowrap",
            boxShadow: "0 0 16px rgba(255,200,0,0.6)",
          }}>{levelUpMsg}</div>
        )}

        {/* ── 地圖切換詢問框 ── */}
        {transitionPrompt && (
          <div style={{
            position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
            background: "rgba(10,10,20,0.92)", border: "0.5px solid var(--color-border-info)",
            borderRadius: "var(--border-radius-md)", padding: "10px 18px",
            display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
              {transitionPrompt === 'gate'
                ? '離開並返回大地圖？'
                : transitionPrompt === 'fwd'
                  ? (g.current.gameMode === 'DUNGEON_INTERIOR'
                      ? `前往第 ${g.current.currentMapIdx + 2} 層？`
                      : `前往地圖 ${["B", "C"][g.current.currentMapIdx]}？`)
                  : (g.current.gameMode === 'DUNGEON_INTERIOR'
                      ? (g.current.currentMapIdx <= 1 ? `返回地面？` : `返回第 ${g.current.currentMapIdx} 層？`)
                      : `返回地圖 ${["A", "B"][g.current.currentMapIdx - 1]}？`)}
            </span>
            <button onClick={confirmTransition} style={{
              fontSize: 12, padding: "4px 14px", borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-info)", color: "var(--color-text-info)",
              border: "0.5px solid var(--color-border-info)", cursor: "pointer", fontWeight: 600,
            }}>確認</button>
            <button onClick={cancelTransition} style={{
              fontSize: 12, padding: "4px 10px", borderRadius: "var(--border-radius-md)",
              background: "none", color: "var(--color-text-tertiary)",
              border: "0.5px solid var(--color-border-tertiary)", cursor: "pointer",
            }}>取消</button>
          </div>
        )}
      </div>

      {/* ── 多地圖進度指示器 ── */}
      {factoryMode === FACTORY_IDS.MULTI_MAP && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
          {["A", "B", "C"].map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 600,
                background: currentMapIdx === i
                  ? "var(--color-background-info)"
                  : currentMapIdx > i ? "var(--color-background-success)" : "var(--color-background-secondary)",
                color: currentMapIdx === i
                  ? "var(--color-text-info)"
                  : currentMapIdx > i ? "var(--color-text-success)" : "var(--color-text-tertiary)",
                border: `0.5px solid ${currentMapIdx === i ? "var(--color-border-info)" : currentMapIdx > i ? "var(--color-border-success)" : "var(--color-border-tertiary)"}`,
              }}>
                {label}
              </div>
              {i < 2 && <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>→</span>}
            </div>
          ))}
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: 6 }}>
            {won ? "通關！" : `目前在地圖 ${["A","B","C"][currentMapIdx]}`}
          </span>
        </div>
      )}

      {won && <div style={{ background: "var(--color-background-success)", color: "var(--color-text-success)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", marginBottom: 10, fontSize: 14, fontWeight: 500 }}>通過出口！</div>}

      {/* ── 操作按鈕 ── */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,48px)", gridTemplateRows: "repeat(3,48px)", gap: 4 }}>
          <div /><DBtn label="▲" k="ArrowUp" /><div />
          <DBtn label="◀" k="ArrowLeft" /><DBtn label="▼" k="ArrowDown" /><DBtn label="▶" k="ArrowRight" />
          <div /><DBtn label="E" k="e" code="KeyE" /><div />
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.9 }}>
          ↑↓ 前進後退<br />←→ 左右轉  WASD 同效果<br />
          <span style={{ color: "var(--color-text-secondary)" }}>E 靠近門時開/關</span>
        </div>
        <button onClick={() => setSeed(s => s + 1)} style={{ marginLeft: "auto", alignSelf: "center" }}>重新開始</button>
      </div>

      {/* ── 地城編輯器面板（大地圖模式下隱藏）── */}
      {gameMode === 'DUNGEON_INTERIOR' && (<>

      {/* ── 地圖與房間大小設定 ── */}
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "10px 14px", marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>地圖與房間設定</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 8 }}>
          {[["地圖寬", cols, setCols, 6, 26], ["地圖高", rows, setRows, 6, 30]].map(([lbl, val, set, mn, mx]) => (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 13, color: "var(--color-text-secondary)", minWidth: 52 }}>{lbl}</label>
              <input type="range" min={mn} max={mx} step={1} value={val} onChange={e => set(Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 13, fontWeight: 500, minWidth: 24, color: "var(--color-text-primary)" }}>{val}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 16px", marginBottom: 8 }}>
          {[["隨機房間數", randomCount, setRandomCount, 0, 12], ["房間最小", minRoom, (v) => { setMinRoom(v); if (v > maxRoom) setMaxRoom(v); }, 2, 8], ["房間最大", maxRoom, (v) => { setMaxRoom(v); if (v < minRoom) setMinRoom(v); }, 2, 10]].map(([lbl, val, set, mn, mx]) => (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", minWidth: 60, whiteSpace: "nowrap" }}>{lbl}</label>
              <input type="range" min={mn} max={mx} step={1} value={val} onChange={e => set(Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 12, fontWeight: 500, minWidth: 18, color: "var(--color-text-primary)" }}>{val}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 8, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>預設門數量（上限）</label>
          <input type="range" min={1} max={4} step={1} value={defaultDoorCount}
            onChange={e => setDefaultDoorCount(Number(e.target.value))} style={{ flex: 1, maxWidth: 120 }} />
          <span style={{ fontSize: 12, fontWeight: 500, minWidth: 18, color: "var(--color-text-primary)" }}>{defaultDoorCount}</span>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={defaultDoorOpen} onChange={e => setDefaultDoorOpen(e.target.checked)} />
            預設開啟
          </label>
        </div>
      </div>

      {/* ── 貼圖面板 ── */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          貼圖設定（點擊 + 上傳，即時生效）
        </p>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "8px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 5, marginBottom: 2, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ width: 4, flexShrink: 0 }} /><span style={{ minWidth: 70 }} />
            {["牆壁", "天花板", "地板"].map(l => (
              <span key={l} style={{ width: 60, fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textAlign: "center" }}>{l}</span>
            ))}
            <span style={{ width: 60, fontSize: 11, fontWeight: 500, color: "#BA7517", textAlign: "center" }}>房間門</span>
          </div>
          <ZoneTexRow label={"走廊\n（預設）"} zone={textures[0] || {}} onChange={z => updateZone(0, z)} accent="#7F77DD" showDoor={false} />
          {fixedRooms.map((rm, i) => (
            <ZoneTexRow
              key={i}
              label={`固定房間 ${i + 1}\nr:${rm.r} c:${rm.c}`}
              zone={textures[i + 1] || {}}
              onChange={z => updateZone(i + 1, z)}
              accent={["#D85A30", "#1D9E75", "#378ADD", "#BA7517", "#993556"][i] || "#888"}
              showDoor={true}
            />
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "5px 0 0" }}>
          未設定貼圖時，房間地板/天花板顯示獨立純色；房間門未設定時顯示棕色。
        </p>
      </div>

      {/* ── 固定房間 + 事件 + 全域事件 + 記錄 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* 固定房間編輯器（僅完全自訂模式顯示） */}
        <div style={{ display: factoryMode === FACTORY_IDS.CUSTOM ? undefined : "none" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>固定房間</p>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", maxHeight: 280, overflowY: "auto" }}>
            {fixedRooms.map((rm, rIdx) => (
              <div key={rIdx} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(216,130,48,0.9)", flex: 1 }}>房間 {rIdx + 1}</span>
                  {[["r", rm.r, "r", 0, rows - 3], ["c", rm.c, "c", 0, cols - 3], ["w", rm.w, "w", 2, Math.min(10, cols - 2)], ["h", rm.h, "h", 2, Math.min(10, rows - 2)]].map(([lbl, val, field, mn, mx]) => (
                    <label key={lbl} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>{lbl}</span>
                      <input type="number" min={mn} max={mx} value={val}
                        onChange={e => setRmField(rIdx, field, e.target.value)}
                        style={{ width: 30, fontSize: 11, textAlign: "center" }} />
                    </label>
                  ))}
                  <button onClick={() => delRmRoom(rIdx)} style={{ fontSize: 11, padding: "1px 5px", color: "var(--color-text-danger)" }}>✕</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, paddingLeft: 4, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>門數量</label>
                  <input type="range" min={1} max={4} step={1}
                    value={rm.doorCount ?? defaultDoorCount}
                    onChange={e => setFixedRooms(p => p.map((x, j) => j === rIdx ? { ...x, doorCount: +e.target.value } : x))}
                    style={{ width: 72 }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)", minWidth: 14 }}>{rm.doorCount ?? defaultDoorCount}</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--color-text-tertiary)", cursor: "pointer", marginLeft: 4 }}>
                    <input type="checkbox"
                      checked={rm.defaultOpen ?? defaultDoorOpen}
                      onChange={e => setFixedRooms(p => p.map((x, j) => j === rIdx ? { ...x, defaultOpen: e.target.checked } : x))} />
                    預設開啟
                  </label>
                  <button onClick={() => setFixedRooms(p => p.map((x, j) => j === rIdx ? { ...x, doorCount: undefined, defaultOpen: undefined } : x))}
                    style={{ fontSize: 10, padding: "1px 5px", color: "var(--color-text-tertiary)" }}>重設為全域</button>
                </div>
                <div style={{ paddingLeft: 4 }}>
                  <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 3px" }}>事件（△r/△c 相對座標）</p>
                  {(rm.events || []).map((ev, ei) => (
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 0", flexWrap: "wrap" }}>
                      <select value={ev.type} onChange={e => setRmEvent(rIdx, ei, { type: e.target.value, icon: EVENT_ICONS[e.target.value] })} style={{ fontSize: 11, width: 72 }}>
                        {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>△r</span>
                      <input type="number" min={0} max={rm.h - 1} value={ev.dr}
                        onChange={e => setRmEvent(rIdx, ei, { dr: Math.min(rm.h - 1, Math.max(0, +e.target.value)) })}
                        style={{ width: 28, fontSize: 11, textAlign: "center" }} />
                      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>△c</span>
                      <input type="number" min={0} max={rm.w - 1} value={ev.dc}
                        onChange={e => setRmEvent(rIdx, ei, { dc: Math.min(rm.w - 1, Math.max(0, +e.target.value)) })}
                        style={{ width: 28, fontSize: 11, textAlign: "center" }} />
                      <input type="text" value={ev.text} onChange={e => setRmEvent(rIdx, ei, { text: e.target.value })}
                        placeholder="訊息..." style={{ flex: 1, fontSize: 11, minWidth: 50 }} />
                      <button onClick={() => delRmEvent(rIdx, ei)} style={{ fontSize: 11, padding: "1px 4px", color: "var(--color-text-danger)" }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => addRmEvent(rIdx)} style={{ fontSize: 11, marginTop: 3 }}>+ 事件</button>
                </div>
              </div>
            ))}
            <button onClick={addRmRoom} style={{ fontSize: 12 }}>+ 新增固定房間</button>
          </div>
        </div>

        {/* 全域事件 + 記錄 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: factoryMode === FACTORY_IDS.CUSTOM ? undefined : "none" }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>全域事件</p>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 8px", maxHeight: 140, overflowY: "auto" }}>
              {globalEvCfg.map((ev, i) => (
                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", flexWrap: "wrap" }}>
                  <select value={ev.type} onChange={e => setGlobalEvCfg(p => p.map((x, j) => j === i ? { ...x, type: e.target.value, icon: EVENT_ICONS[e.target.value] } : x))} style={{ fontSize: 11, width: 72 }}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>r</span>
                  <input type="number" min={0} max={rows - 1} value={ev.r} onChange={e => setGlobalEvCfg(p => p.map((x, j) => j === i ? { ...x, r: +e.target.value } : x))} style={{ width: 28, fontSize: 11, textAlign: "center" }} />
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>c</span>
                  <input type="number" min={0} max={cols - 1} value={ev.c} onChange={e => setGlobalEvCfg(p => p.map((x, j) => j === i ? { ...x, c: +e.target.value } : x))} style={{ width: 28, fontSize: 11, textAlign: "center" }} />
                  <input type="text" value={ev.text} onChange={e => setGlobalEvCfg(p => p.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} placeholder="訊息..." style={{ flex: 1, fontSize: 11, minWidth: 50 }} />
                  <button onClick={() => setGlobalEvCfg(p => p.filter((_, j) => j !== i))} style={{ fontSize: 11, padding: "1px 4px", color: "var(--color-text-danger)" }}>✕</button>
                </div>
              ))}
              <button onClick={() => setGlobalEvCfg(p => [...p, { id: `g${Date.now()}`, r: 5, c: 5, type: "message", text: "新事件", icon: "!", repeatable: false, triggered: false }])} style={{ fontSize: 11, marginTop: 3 }}>+ 新增</button>
            </div>
            <button onClick={() => setSeed(s => s + 1)} style={{ marginTop: 5, fontSize: 12, width: "100%" }}>套用並重新開始</button>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>事件記錄</p>
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", minHeight: 60, maxHeight: 120, overflowY: "auto" }}>
              {log.length === 0 && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>尚無事件</p>}
              {log.map(entry => (
                <div key={entry.id} style={{ fontSize: 12, padding: "3px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 5, alignItems: "baseline" }}>
                  {entry.roomLabel && <span style={{ fontSize: 10, color: "rgba(255,180,80,0.9)", minWidth: 40 }}>[{entry.roomLabel}]</span>}
                  <span style={{ fontWeight: 500, color: typeColor[entry.type] || "var(--color-text-primary)", minWidth: 50 }}>[{entry.type}]</span>
                  <span style={{ color: "var(--color-text-primary)" }}>{entry.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── 任務記錄（地城模式才顯示）── */}
      {gameMode === 'DUNGEON_INTERIOR' && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>任務記錄</p>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px", minHeight: 40 }}>
            {questLog.length === 0 && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>尚未接受任何任務</p>}
            {questLog.filter(q => !q.claimed).map(q => {
              const def = QUEST_DEFS.find(d => d.id === q.questId);
              if (!def) return null;
              const step = def.steps[q.stepIdx];
              const canClaim = q.completed && !q.claimed;
              return (
                <div key={q.questId} style={{ fontSize: 12, padding: "4px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <span style={{
                    fontWeight: 500,
                    color: canClaim
                      ? "#f0c040"
                      : q.completed
                        ? "var(--color-text-success)"
                        : "var(--color-text-primary)",
                  }}>
                    {canClaim ? "📬 " : q.completed ? "✓ " : "◎ "}
                    {def.title}
                    {canClaim && <span style={{ fontSize: 10, marginLeft: 6, color: "#c09030" }}>（可交差）</span>}
                  </span>
                  {!q.completed && step && (
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: 8 }}>
                      → {step.desc}
                      {step.type === 'kill' && (
                        <> ({q.progress?.[q.stepIdx] ?? 0}/{step.count})</>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 迷宮資料顯示（舊工具模式）── */}
      {mazeData && <MazeDataPanel data={mazeData} walls={g.current.walls} />}

      </>)}

      {/* ── 任務日誌面板 ── */}
      {showQuestLog && (
        <QuestLogPanel
          questLog={questLog}
          questDefs={QUEST_DEFS}
          onClose={closeQuestLog}
        />
      )}

      {/* ── 任務接取 / 領獎彈窗（全螢幕覆蓋）── */}
      {activeQuestOffer && (() => {
        const def = QUEST_DEFS.find(q => q.id === activeQuestOffer.questId);
        return (
          <QuestOfferPanel
            questDef={def}
            mode={activeQuestOffer.mode}
            playerQuest={activeQuestOffer.playerQuest}
            onAccept={handleQuestAccept}
            onDecline={activeQuestOffer.mode === 'offer' ? handleQuestDecline : undefined}
          />
        );
      })()}

    </div>
  );
}
