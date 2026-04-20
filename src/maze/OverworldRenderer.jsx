// ─────────────────────────────────────────────
//  OverworldRenderer.jsx
//  俯視世界地圖 Canvas 繪製
// ─────────────────────────────────────────────
import { TERRAIN, LOC_TYPE } from './worldMap.jsx';
import { WORLD_TILE_SIZE } from './constants.jsx';

// 地形基本色
const TERRAIN_COLORS = {
  [TERRAIN.PLAINS]:     '#4a7c3f',
  [TERRAIN.MOUNTAIN]:   '#7a6650',
  [TERRAIN.WATER]:      '#3472a0',
  [TERRAIN.FOREST]:     '#2a5a1a',
  [TERRAIN.SNOW]:       '#dce8f0',
  [TERRAIN.DESERT]:     '#c8a84a',
  [TERRAIN.SWAMP]:      '#3a5030',
  [TERRAIN.LAVA]:       '#cc3300',
  [TERRAIN.TUNDRA]:     '#6a8090',
  [TERRAIN.ROAD]:       '#9a7a50',
  [TERRAIN.DEEP_WATER]: '#1a3d60',
  [TERRAIN.SAVANNA]:    '#8aac3a',
};

// 地形高光色
const TERRAIN_HIGHLIGHT = {
  [TERRAIN.PLAINS]:     '#5a9c50',
  [TERRAIN.MOUNTAIN]:   '#9a8570',
  [TERRAIN.WATER]:      '#4a92c8',
  [TERRAIN.FOREST]:     '#367025',
  [TERRAIN.SNOW]:       '#f0f8ff',
  [TERRAIN.DESERT]:     '#e0c060',
  [TERRAIN.SWAMP]:      '#4a6840',
  [TERRAIN.LAVA]:       '#ff6600',
  [TERRAIN.TUNDRA]:     '#8098a8',
  [TERRAIN.ROAD]:       '#b09060',
  [TERRAIN.DEEP_WATER]: '#244870',
  [TERRAIN.SAVANNA]:    '#a8cc50',
};

// 道路不需要高光邊框效果
const NO_PIXEL_BORDER = new Set([TERRAIN.ROAD, TERRAIN.DEEP_WATER]);

// 地點顏色與圖示
const LOC_COLORS = {
  [LOC_TYPE.TOWN]:          { bg: '#f0c040', border: '#c08010', text: '#2a1800' },
  [LOC_TYPE.TOWN_SMALL]:    { bg: '#c8a870', border: '#907040', text: '#2a1800' },
  [LOC_TYPE.CAVE]:          { bg: '#806040', border: '#503018', text: '#f0d0a0' },
  [LOC_TYPE.TOWER]:         { bg: '#8040c0', border: '#5020a0', text: '#f0d0ff' },
  [LOC_TYPE.DUNGEON]:       { bg: '#c03030', border: '#901010', text: '#ffd0d0' },
  [LOC_TYPE.CAPITAL]:       { bg: '#ffe060', border: '#c07800', text: '#1a1000' },
  [LOC_TYPE.TEMPLE]:        { bg: '#40a0c0', border: '#207090', text: '#e0f4ff' },
  [LOC_TYPE.PORT]:          { bg: '#2080c0', border: '#104080', text: '#d0f0ff' },
  [LOC_TYPE.QUEST_DUNGEON]: { bg: '#c06020', border: '#904000', text: '#ffeecc' },
};

const LOC_ICONS = {
  [LOC_TYPE.TOWN]:          '鎮',
  [LOC_TYPE.TOWN_SMALL]:    '村',
  [LOC_TYPE.CAVE]:          '穴',
  [LOC_TYPE.TOWER]:         '塔',
  [LOC_TYPE.DUNGEON]:       '洞',
  [LOC_TYPE.CAPITAL]:       '都',
  [LOC_TYPE.TEMPLE]:        '殿',
  [LOC_TYPE.PORT]:          '港',
  [LOC_TYPE.QUEST_DUNGEON]: '⚔',
};

// 國家標籤顏色
const NATION_COLORS = {
  '亞薩王國':  '#ffe080',
  '沙漠帝國':  '#ffb040',
  '雪域聯盟':  '#a0d0ff',
};

// ─────────────────────────────────────────────
//  主繪製函式
// ─────────────────────────────────────────────
import { PROFESSIONS } from './world/npcs.js';

export function drawOverworld(ctx, W, H, terrain, locations, wx, wy, nearbyLoc, npcs = [], nearbyNPC = null) {
  const TS   = WORLD_TILE_SIZE;
  const cols = terrain[0].length;
  const rows = terrain.length;

  // 相機（玩家置中，邊界夾取）
  let camX = wx * TS - W / 2;
  let camY = wy * TS - H / 2;
  camX = Math.max(0, Math.min(cols * TS - W, camX));
  camY = Math.max(0, Math.min(rows * TS - H, camY));

  // ── 1. 地形格子 ──────────────────────────────
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * TS - camX;
      const sy = r * TS - camY;
      if (sx + TS < 0 || sx > W || sy + TS < 0 || sy > H) continue;

      const t = terrain[r][c];
      const base  = TERRAIN_COLORS[t]    || '#444';
      const light = TERRAIN_HIGHLIGHT[t] || '#666';

      ctx.fillStyle = base;
      ctx.fillRect(sx, sy, TS, TS);

      // 道路：中央畫兩條軌道線
      if (t === TERRAIN.ROAD) {
        ctx.strokeStyle = 'rgba(60,40,20,0.45)';
        ctx.lineWidth = 1;
        const off = TS * 0.28;
        ctx.beginPath();
        ctx.moveTo(sx + off, sy); ctx.lineTo(sx + off, sy + TS);
        ctx.moveTo(sx + TS - off, sy); ctx.lineTo(sx + TS - off, sy + TS);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.strokeRect(sx, sy, TS, TS);
        continue;
      }

      // 像素風格高光
      if (!NO_PIXEL_BORDER.has(t)) {
        ctx.fillStyle = light;
        ctx.fillRect(sx,     sy,     TS, 2);
        ctx.fillRect(sx,     sy + 2, 2,  TS - 2);
      }

      // 格線
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, TS, TS);

      // 地形裝飾
      drawTerrainDetail(ctx, sx, sy, TS, t);
    }
  }

  // ── 2a. 港口間的航線（虛線）────────────────
  const ports = locations.filter(l => l.type === LOC_TYPE.PORT);
  if (ports.length >= 2) {
    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(80,180,255,0.30)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < ports.length; i++) {
      for (let j = i + 1; j < ports.length; j++) {
        const ax = ports[i].wx * TS - camX + TS / 2;
        const ay = ports[i].wy * TS - camY + TS / 2;
        const bx = ports[j].wx * TS - camX + TS / 2;
        const by = ports[j].wy * TS - camY + TS / 2;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── 2. 地點標記 ──────────────────────────────
  for (const loc of locations) {
    const sx = loc.wx * TS - camX;
    const sy = loc.wy * TS - camY;
    if (sx + TS < -20 || sx > W + 20 || sy + TS < -20 || sy > H + 20) continue;

    const isNearby = nearbyLoc?.id === loc.id;
    const cl = LOC_COLORS[loc.type] || { bg: '#aaa', border: '#777', text: '#000' };
    const isCapital  = loc.type === LOC_TYPE.CAPITAL;
    const isSmall    = loc.type === LOC_TYPE.TOWN_SMALL;

    // 首都：最大；小城鎮：最小；其他：中等
    const pad = isCapital ? 0 : isSmall ? 3 : 1;
    const sz = TS - pad * 2;

    // 靠近時發光
    if (isNearby) {
      ctx.fillStyle = 'rgba(255,255,180,0.40)';
      ctx.fillRect(sx - 4, sy - 4, TS + 8, TS + 8);
    }

    // 首都：額外外框
    if (isCapital) {
      ctx.strokeStyle = isNearby ? '#fff' : cl.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 1, sy - 1, TS + 2, TS + 2);
    }

    ctx.fillStyle = cl.bg;
    ctx.fillRect(sx + pad, sy + pad, sz, sz);
    ctx.strokeStyle = isNearby ? '#fff' : cl.border;
    ctx.lineWidth = isNearby ? 2 : (isCapital ? 2 : 1.5);
    ctx.strokeRect(sx + pad, sy + pad, sz, sz);

    // 圖示
    ctx.fillStyle = cl.text;
    ctx.font = `bold ${Math.floor(TS * (isCapital ? 0.55 : isSmall ? 0.42 : 0.50))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LOC_ICONS[loc.type] || '?', sx + TS / 2, sy + TS / 2 - 1);

    // 城鎮名稱（下方）
    const nationColor = loc.nationLabel ? (NATION_COLORS[loc.nationLabel] || '#ddd') : '#ddd';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;

    ctx.fillStyle = isNearby ? '#fff' : nationColor;
    ctx.font = `${isCapital ? 'bold ' : ''}${Math.max(7, Math.floor(TS * (isSmall ? 0.28 : 0.35)))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(loc.label, sx + TS / 2, sy + TS + 2);

    // 國家名（再下一行，更小）
    if (loc.nationLabel) {
      ctx.fillStyle = 'rgba(200,200,200,0.75)';
      ctx.font = `${Math.max(7, Math.floor(TS * 0.28))}px monospace`;
      ctx.fillText(`[${loc.nationLabel}]`, sx + TS / 2, sy + TS + 2 + Math.floor(TS * 0.38));
    }

    ctx.shadowBlur = 0;
  }

  // ── 3. NPC ──────────────────────────────────
  for (const npc of npcs) {
    const sx = npc.wx * TS - camX;
    const sy = npc.wy * TS - camY;
    if (sx < -24 || sx > W + 24 || sy < -24 || sy > H + 24) continue;

    const prof    = PROFESSIONS[npc.profession] ?? { color: '#aaa', label: '?' };
    const isNear  = nearbyNPC?.id === npc.id;
    const distToPlayer = Math.hypot(npc.wx - wx, npc.wy - wy);

    // 外光暈（靠近時或敵對時）
    if (isNear || npc.alignment === 'hostile') {
      ctx.fillStyle = npc.alignment === 'hostile'
        ? 'rgba(255,60,60,0.25)'
        : 'rgba(255,255,180,0.30)';
      ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
    }

    // NPC 點
    ctx.fillStyle = prof.color;
    ctx.beginPath(); ctx.arc(sx, sy, isNear ? 5 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = npc.alignment === 'hostile' ? '#ff4444' : (isNear ? '#fff' : 'rgba(0,0,0,0.5)');
    ctx.lineWidth = isNear ? 1.5 : 1;
    ctx.stroke();

    // icon（近距離才顯示）
    if (distToPlayer < 8) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (8 - distToPlayer) / 4);
      ctx.font = `${TS * 0.7 | 0}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(npc.icon, sx, sy - 3);
      ctx.restore();
    }

    // 名稱 + 職業標籤（靠近或 isNear 才顯示）
    if (isNear || distToPlayer < 4) {
      ctx.save();
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillStyle = isNear ? '#fff' : prof.color;
      ctx.font = `bold ${isNear ? 11 : 9}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(npc.name, sx, sy + 7);
      ctx.fillStyle = 'rgba(200,200,200,0.85)';
      ctx.font = '8px monospace';
      ctx.fillText(`[${prof.label}]`, sx, sy + 19);
      ctx.shadowBlur = 0; ctx.restore();
    }
  }

  // ── 4. 玩家（黃色圓點）──────────────────────
  const px = wx * TS - camX;
  const py = wy * TS - camY;

  ctx.fillStyle = 'rgba(255,230,80,0.28)';
  ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── 5. 靠近地點 HUD ─────────────────────────
  if (nearbyLoc) {
    const isCapital = nearbyLoc.type === LOC_TYPE.CAPITAL;
    const isPort    = nearbyLoc.type === LOC_TYPE.PORT;
    const verb = isPort ? '乘船出港' : '進入';
    const txt = `[E] ${verb} ${nearbyLoc.label}`;
    const tw = Math.max(200, txt.length * 9 + 28);
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, H - 58, tw, 42, 6); ctx.fill();
    ctx.strokeStyle = isPort ? 'rgba(80,200,255,0.9)' : isCapital ? 'rgba(255,200,40,0.9)' : 'rgba(255,220,80,0.7)';
    ctx.lineWidth = isCapital ? 1.5 : 1;
    ctx.stroke();
    ctx.fillStyle = isPort ? '#80d8ff' : isCapital ? '#ffe040' : '#ffd040';
    ctx.font = `bold 13px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, W / 2, H - 42);
    if (nearbyLoc.nationLabel) {
      ctx.fillStyle = NATION_COLORS[nearbyLoc.nationLabel] || '#ccc';
      ctx.font = '10px monospace';
      ctx.fillText(nearbyLoc.nationLabel, W / 2, H - 26);
    }
  }

  // ── 6. NPC 互動 HUD ─────────────────────────
  if (nearbyNPC && !nearbyLoc) {
    const prof = PROFESSIONS[nearbyNPC.profession] ?? { label: '?', color: '#aaa' };
    const isHostile = nearbyNPC.alignment === 'hostile';
    const verb = isHostile ? '迎戰' : '對話';
    const txt  = `[E] ${verb} ${nearbyNPC.name}`;
    const tw   = Math.max(200, txt.length * 9 + 28);
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, H - 58, tw, 42, 6); ctx.fill();
    ctx.strokeStyle = isHostile ? 'rgba(255,80,80,0.9)' : 'rgba(200,200,100,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = isHostile ? '#ff8888' : prof.color;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, W / 2, H - 42);
    ctx.fillStyle = 'rgba(180,180,180,0.8)';
    ctx.font = '10px monospace';
    ctx.fillText(`${nearbyNPC.icon}  ${prof.label}`, W / 2, H - 26);
  }

  // ── 7. 圖例 ──────────────────────────────────
  drawLegend(ctx, W, H);

  // ── 8. 標題 HUD ──────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.60)';
  ctx.beginPath(); ctx.roundRect(8, 8, 116, 22, 4); ctx.fill();
  ctx.fillStyle = '#b0c8ff';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('大地圖  WASD 移動', 14, 19);
}

// ─────────────────────────────────────────────
//  地形裝飾小圖示
// ─────────────────────────────────────────────
function drawTerrainDetail(ctx, sx, sy, TS, t) {
  const cx = sx + TS / 2, cy = sy + TS / 2;

  if (t === TERRAIN.MOUNTAIN) {
    ctx.beginPath();
    ctx.moveTo(cx, sy + 3);
    ctx.lineTo(sx + TS - 4, sy + TS - 4);
    ctx.lineTo(sx + 4, sy + TS - 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fill();

  } else if (t === TERRAIN.WATER) {
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      const yw = sy + TS * (0.3 + k * 0.38);
      ctx.beginPath();
      ctx.moveTo(sx + 2, yw);
      ctx.bezierCurveTo(sx + TS * 0.3, yw - 2, sx + TS * 0.7, yw + 2, sx + TS - 2, yw);
      ctx.stroke();
    }

  } else if (t === TERRAIN.DEEP_WATER) {
    ctx.strokeStyle = 'rgba(80,140,200,0.25)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const yw = sy + TS * (0.2 + k * 0.3);
      ctx.beginPath();
      ctx.moveTo(sx + 1, yw);
      ctx.bezierCurveTo(sx + TS * 0.35, yw - 1.5, sx + TS * 0.65, yw + 1.5, sx + TS - 1, yw);
      ctx.stroke();
    }

  } else if (t === TERRAIN.FOREST) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.arc(cx, cy, TS * 0.28, 0, Math.PI * 2); ctx.fill();

  } else if (t === TERRAIN.SNOW) {
    // 雪花點
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const [dx, dy] of [[0.25,0.3],[0.6,0.55],[0.4,0.7],[0.7,0.25]]) {
      ctx.beginPath();
      ctx.arc(sx + dx * TS, sy + dy * TS, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (t === TERRAIN.DESERT) {
    // 沙丘波浪
    ctx.strokeStyle = 'rgba(160,110,0,0.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 2, sy + TS * 0.55);
    ctx.bezierCurveTo(sx + TS * 0.4, sy + TS * 0.42, sx + TS * 0.6, sy + TS * 0.68, sx + TS - 2, sy + TS * 0.55);
    ctx.stroke();

  } else if (t === TERRAIN.SWAMP) {
    // 泥濘圓圈
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.beginPath(); ctx.arc(cx, cy + 1, TS * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(80,100,20,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy + 1, TS * 0.32, 0, Math.PI * 2); ctx.stroke();

  } else if (t === TERRAIN.LAVA) {
    // 熔岩光暈
    ctx.fillStyle = 'rgba(255,150,0,0.30)';
    ctx.beginPath(); ctx.arc(cx, cy, TS * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,50,0.25)';
    ctx.beginPath(); ctx.arc(cx, cy, TS * 0.18, 0, Math.PI * 2); ctx.fill();

  } else if (t === TERRAIN.TUNDRA) {
    // 冰裂紋
    ctx.strokeStyle = 'rgba(180,210,230,0.30)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx + 3, sy + TS * 0.5);
    ctx.lineTo(sx + TS * 0.45, sy + TS * 0.4);
    ctx.lineTo(sx + TS - 3, sy + TS * 0.6);
    ctx.stroke();

  } else if (t === TERRAIN.SAVANNA) {
    // 稀疏草叢點
    ctx.fillStyle = 'rgba(60,80,0,0.30)';
    for (const [dx, dy] of [[0.3,0.4],[0.65,0.35],[0.5,0.65]]) {
      ctx.fillRect(sx + dx * TS - 1, sy + dy * TS - 2, 2, 4);
    }
  }
}

// ─────────────────────────────────────────────
//  圖例（雙欄）
// ─────────────────────────────────────────────
function drawLegend(ctx, W, H) {
  const items = [
    { color: TERRAIN_COLORS[TERRAIN.PLAINS],     label: '平原' },
    { color: TERRAIN_COLORS[TERRAIN.FOREST],     label: '森林' },
    { color: TERRAIN_COLORS[TERRAIN.MOUNTAIN],   label: '山脈' },
    { color: TERRAIN_COLORS[TERRAIN.WATER],      label: '水域' },
    { color: TERRAIN_COLORS[TERRAIN.DEEP_WATER], label: '深海' },
    { color: TERRAIN_COLORS[TERRAIN.SNOW],       label: '雪原' },
    { color: TERRAIN_COLORS[TERRAIN.TUNDRA],     label: '凍原' },
    { color: TERRAIN_COLORS[TERRAIN.DESERT],     label: '沙漠' },
    { color: TERRAIN_COLORS[TERRAIN.SAVANNA],    label: '草原' },
    { color: TERRAIN_COLORS[TERRAIN.SWAMP],      label: '沼澤' },
    { color: TERRAIN_COLORS[TERRAIN.LAVA],       label: '熔岩' },
    { color: TERRAIN_COLORS[TERRAIN.ROAD],       label: '道路' },
  ];

  const half = Math.ceil(items.length / 2);
  const colW = 58, rowH = 15, padX = 6, padY = 6;
  const bW = colW * 2 + 2, bH = half * rowH + padY * 2;
  const lx = W - bW - 6, ly = 6;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath(); ctx.roundRect(lx, ly, bW, bH, 4); ctx.fill();

  items.forEach(({ color, label }, i) => {
    const col = Math.floor(i / half);
    const row = i % half;
    const ix = lx + padX + col * colW;
    const iy = ly + padY + row * rowH;
    ctx.fillStyle = color;
    ctx.fillRect(ix, iy, 9, 9);
    ctx.fillStyle = '#ccc';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ix + 12, iy + 4.5);
  });
}
