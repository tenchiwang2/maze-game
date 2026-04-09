import { useState, useEffect, useRef, useCallback } from 'react';
import { FOV, NUM_RAYS, MOVE_SPEED, TURN_SPEED, INTERACT_DIST, MM } from './constants.jsx';
import { generateMaze, buildGrid, doorWorldPos } from './mazeGenerator.jsx';
import {
  castRays, renderFloorCeiling, renderWalls,
  getSpriteInfo,
  drawEntryArch, drawExitPortal, drawEventMarker,
  drawMinimap, drawHUD,
} from './renderer.jsx';
import { DEFAULT_FIXED, DEFAULT_GLOBAL, EVENT_TYPES, EVENT_ICONS } from './defaults.jsx';
import { FACTORIES, FACTORY_IDS } from './mazeFactory.jsx';

function loadTexture(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || TEX_W;
        const h = img.naturalHeight || TEX_H;
        // 用於 drawImage 牆面切片的離屏 canvas
        const oc = document.createElement('canvas');
        oc.width = w; oc.height = h;
        const octx = oc.getContext('2d');
        octx.drawImage(img, 0, 0);
        // 用於地板投射的像素陣列
        const id = octx.getImageData(0, 0, w, h);
        resolve({ loaded: true, canvas: oc, data: id.data, w, h, src: e.target.result });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────
//  貼圖上傳元件（單一面）
// ─────────────────────────────────────────────
function TexUpload({ label, texInfo, onLoad }) {
  return (
    <label style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      cursor: "pointer", width: 64,
    }}>
      <div style={{
        width: 60, height: 60, border: "0.5px solid var(--color-border-secondary)",
        borderRadius: "var(--border-radius-md)", overflow: "hidden",
        background: "var(--color-background-secondary)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {texInfo?.src
          ? <img src={texInfo.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 20, color: "var(--color-text-tertiary)" }}>+</span>
        }
      </div>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{label}</span>
      <input type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => e.target.files[0] && loadTexture(e.target.files[0]).then(onLoad)} />
    </label>
  );
}

// ─────────────────────────────────────────────
//  區域貼圖列（牆壁 + 天花板 + 地板）
// ─────────────────────────────────────────────
function ZoneTexRow({ label, zone, onChange, accent, showDoor }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
    }}>
      <div style={{ width: 4, height: 36, borderRadius: 2, background: accent || "#888", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "var(--color-text-secondary)", minWidth: 68, lineHeight: 1.3 }}>{label}</span>
      <TexUpload label="牆壁" texInfo={zone?.wall} onLoad={t => onChange({ ...zone, wall: t })} />
      <TexUpload label="天花板" texInfo={zone?.ceil} onLoad={t => onChange({ ...zone, ceil: t })} />
      <TexUpload label="地板" texInfo={zone?.floor} onLoad={t => onChange({ ...zone, floor: t })} />
      {showDoor && (
        <TexUpload label="房間門" texInfo={zone?.door} onLoad={t => onChange({ ...zone, door: t })} />
      )}
    </div>
  );
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
//  解析事件輔助函式
// ─────────────────────────────────────────────
function resolveEvents(rooms, fixedRms, globalEvCfg) {
  const out = [];
  fixedRms.forEach((fm, rIdx) => {
    const placed = rooms.find(r => r.fixed && r.origIdx === rIdx);
    if (!placed) return;
    (fm.events || []).forEach(ev => {
      let destR = ev.destR, destC = ev.destC;
      if (ev.destRoomIdx != null) {
        const dp = rooms.find(r => r.fixed && r.origIdx === ev.destRoomIdx);
        if (dp) { destR = dp.r + (ev.destDr || 0); destC = dp.c + (ev.destDc || 0); }
      }
      out.push({ ...ev, r: placed.r + ev.dr, c: placed.c + ev.dc, triggered: false, roomLabel: `房間${rIdx + 1}`, destR, destC });
    });
  });
  globalEvCfg.forEach(ev => out.push({ ...ev, triggered: false }));
  return out;
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
  });
  const renderRef = useRef(null);
  const eventsRef = useRef(events);
  const textureRef = useRef(textures);
  eventsRef.current = events;
  textureRef.current = textures;


  function triggerEvent(ev, idx) {
    setEvents(prev => prev.map((e, i) => i === idx ? { ...e, triggered: true } : e));
    setLog(prev => [{ id: Date.now(), type: ev.type, roomLabel: ev.roomLabel, text: (ev.text || "").split("\n")[0] }, ...prev].slice(0, 30));
    if (ev.type === 'teleport' && ev.destR != null) {
      g.current.px = 2 * ev.destC + 1 + 0.5; g.current.py = 2 * ev.destR + 1 + 0.5;
    }
    if (ev.type === 'win' && !g.current.won) { g.current.won = true; setWon(true); }
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

  renderRef.current = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const s = g.current; if (!s.grid) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const gW = s.grid[0].length, gH = s.grid.length;
    s.t++;
    if (s.interactCooldown > 0) s.interactCooldown--;

    if (!s.won) {
      const cos = Math.cos(s.angle), sin = Math.sin(s.angle);
      const mv = (nx, ny) => {
        if (s.grid[Math.floor(s.py)][Math.floor(nx)] === 0) s.px = nx;
        if (s.grid[Math.floor(ny)][Math.floor(s.px)] === 0) s.py = ny;
      };
      if (s.keys["ArrowUp"] || s.keys["w"]) mv(s.px + cos * MOVE_SPEED, s.py + sin * MOVE_SPEED);
      if (s.keys["ArrowDown"] || s.keys["s"]) mv(s.px - cos * MOVE_SPEED, s.py - sin * MOVE_SPEED);
      if (s.keys["ArrowLeft"] || s.keys["a"]) s.angle -= TURN_SPEED;
      if (s.keys["ArrowRight"] || s.keys["d"]) s.angle += TURN_SPEED;

      const onExitPortal  = Math.floor(s.px) === s.exitGX  && Math.floor(s.py) === s.exitGY;
      const onEntryPortal = s.multiMap && s.currentMapIdx > 0
        && Math.floor(s.px) === s.entryGX && Math.floor(s.py) === s.entryGY;

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
          if (s.multiMap && s.currentMapIdx < 2) {
            s.transitionPrompt = 'fwd';
            setTransitionPrompt('fwd');
          } else {
            s.won = true; setWon(true);
          }
          s.wasOnPortal = true;
        } else if (onEntryPortal) {
          s.transitionPrompt = 'bwd';
          setTransitionPrompt('bwd');
          s.wasOnPortal = true;
        }
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
    }

    const txs = textureRef.current;
    const rays = castRays(s.grid, s.zoneMap, s.doorMap, s.px, s.py, s.angle, gW, gH);

    // 1. 地板 + 天花板（逐像素 ImageData）
    renderFloorCeiling(ctx, W, H, s.px, s.py, s.angle, s.zoneMap, gW, gH, txs);

    // 2. 牆壁（貼圖切片或平面填色）
    renderWalls(ctx, W, H, rays, txs, s.doors);

    // 3. 精靈
    const sprites = [
      { type: "entry", wx: s.entryGX + 0.5, wy: s.entryGY + 0.5 },
      { type: "exit", wx: s.exitGX + 0.5, wy: s.exitGY + 0.5 },
      ...eventsRef.current
        .filter(ev => !ev.triggered || ev.repeatable)
        .map(ev => ({ type: "event", wx: 2 * ev.c + 1 + 0.5, wy: 2 * ev.r + 1 + 0.5, ev }))
    ];
    sprites.sort((a, b) => Math.hypot(b.wx - s.px, b.wy - s.py) - Math.hypot(a.wx - s.px, a.wy - s.py));
    for (const sp of sprites) {
      const info = getSpriteInfo(sp.wx, sp.wy, s.px, s.py, s.angle, W, rays);
      if (!info) continue;
      if (sp.type === "entry") drawEntryArch(ctx, info.screenX, info.dist, H);
      else if (sp.type === "exit") drawExitPortal(ctx, info.screenX, info.dist, H, s.t);
      else drawEventMarker(ctx, info.screenX, info.dist, H, sp.ev, s.t);
    }

    // 4. 小地圖 + HUD
    let nearDoor = null, nearDoorDist = INTERACT_DIST;
    s.doors.forEach(door => {
      const { wx, wy } = doorWorldPos(door);
      const d = Math.hypot(wx - s.px, wy - s.py);
      if (d < nearDoorDist) { nearDoor = door; nearDoorDist = d; }
    });
    drawMinimap(ctx, s.walls, s.cols, s.rows, s.px, s.py, s.angle, s.rooms, s.eCell, s.xCell, eventsRef.current, s.doors);
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
    initMaze();
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.width = 520; canvas.height = 340;
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
  }, [seed, initMaze]);

  // 確認傳送
  const confirmTransition = useCallback(() => {
    const s = g.current;
    const dir = s.transitionPrompt;
    if (!dir) return;
    s.transitionPrompt = null;
    setTransitionPrompt(null);
    s.wasOnPortal = true; // 傳送後標記仍在傳送門上，需離開才能再觸發
    if (dir === 'fwd') {
      s.currentMapIdx++;
      syncCurrentMap(s);
      eventsRef.current = [];
      setEvents([]);
      setCurrentMapIdx(s.currentMapIdx);
      const sp = findSafeSpawn(s.grid, s.entryGX, s.entryGY);
      s.px = sp.px; s.py = sp.py;
    } else {
      s.currentMapIdx--;
      syncCurrentMap(s);
      eventsRef.current = [];
      setEvents([]);
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

  // const updateZone = (zoneIdx, newZone) =>
  //   setTextures(prev => { const n=[...prev]; n[zoneIdx]=newZone; return n; });

  // const typeColor={message:"var(--color-text-primary)",teleport:"var(--color-text-info)",door:"var(--color-text-warning)",win:"var(--color-text-success)"};

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

  return (
    <div style={{ padding: "1rem 0", fontFamily: "var(--font-sans)" }}>

      {/* ── 模式選擇器 ── */}
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

      {/* ── 畫布 ── */}
      <div style={{ overflowX: "auto", marginBottom: 10, position: "relative", display: "inline-block" }}>
        <canvas ref={canvasRef} style={{ display: "block", borderRadius: "var(--border-radius-md)", background: "#0d0d1a" }} />
        {/* ── 地圖切換詢問框 ── */}
        {transitionPrompt && (
          <div style={{
            position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
            background: "rgba(10,10,20,0.92)", border: "0.5px solid var(--color-border-info)",
            borderRadius: "var(--border-radius-md)", padding: "10px 18px",
            display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
              {transitionPrompt === 'fwd'
                ? `前往地圖 ${["B", "C"][g.current.currentMapIdx]}？`
                : `返回地圖 ${["A", "B"][g.current.currentMapIdx - 1]}？`}
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

      {/* ── 迷宮資料顯示 ── */}
      {mazeData && <MazeDataPanel data={mazeData} walls={g.current.walls} />}

    </div>
  );
}
