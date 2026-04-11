// ─────────────────────────────────────────────
//  OverworldRenderer.jsx
//  俯視世界地圖 Canvas 繪製
//  不含 React，不含遊戲邏輯
// ─────────────────────────────────────────────
import { TERRAIN, LOC_TYPE } from './worldMap.jsx';
import { WORLD_TILE_SIZE } from './constants.jsx';

// 地形顏色
const TERRAIN_COLORS = {
  [TERRAIN.PLAINS]:   '#4a7c3f',
  [TERRAIN.MOUNTAIN]: '#7a6650',
  [TERRAIN.WATER]:    '#2d6a8f',
  [TERRAIN.FOREST]:   '#2d5a1e',
};

// 地形高光（模擬像素藝術光感）
const TERRAIN_HIGHLIGHT = {
  [TERRAIN.PLAINS]:   '#5a9c4f',
  [TERRAIN.MOUNTAIN]: '#9a8070',
  [TERRAIN.WATER]:    '#3d80a0',
  [TERRAIN.FOREST]:   '#3a7028',
};

// 地點顏色與圖示
const LOC_COLORS = {
  [LOC_TYPE.TOWN]:    { bg: '#f0c040', border: '#c0900a', text: '#3a2000' },
  [LOC_TYPE.CAVE]:    { bg: '#806040', border: '#503018', text: '#f0d0a0' },
  [LOC_TYPE.TOWER]:   { bg: '#8040c0', border: '#5020a0', text: '#f0d0ff' },
  [LOC_TYPE.DUNGEON]: { bg: '#c03030', border: '#901010', text: '#ffd0d0' },
};

const LOC_ICONS = {
  [LOC_TYPE.TOWN]:    '城',
  [LOC_TYPE.CAVE]:    '穴',
  [LOC_TYPE.TOWER]:   '塔',
  [LOC_TYPE.DUNGEON]: '洞',
};

// ─────────────────────────────────────────────
//  主繪製函式
// ─────────────────────────────────────────────
export function drawOverworld(ctx, W, H, terrain, locations, wx, wy, nearbyLoc) {
  const TS  = WORLD_TILE_SIZE;
  const cols = terrain[0].length;
  const rows = terrain.length;

  // 相機（玩家置中，邊界夾取）
  let camX = wx * TS - W / 2;
  let camY = wy * TS - H / 2;
  camX = Math.max(0, Math.min(cols * TS - W, camX));
  camY = Math.max(0, Math.min(rows * TS - H, camY));

  // ── 1. 地形格子 ──────────────────────────
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * TS - camX;
      const sy = r * TS - camY;
      if (sx + TS < 0 || sx > W || sy + TS < 0 || sy > H) continue;

      const t = terrain[r][c];
      const base  = TERRAIN_COLORS[t]     || '#333';
      const light = TERRAIN_HIGHLIGHT[t]  || '#555';

      ctx.fillStyle = base;
      ctx.fillRect(sx, sy, TS, TS);

      // 像素風格：左上角高光
      ctx.fillStyle = light;
      ctx.fillRect(sx,      sy,       TS, 2);
      ctx.fillRect(sx,      sy + 2,   2,  TS - 2);

      // 格線
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, TS, TS);

      // 地形裝飾（山頂/波浪/樹冠）
      drawTerrainDetail(ctx, sx, sy, TS, t);
    }
  }

  // ── 2. 地點標記 ──────────────────────────
  for (const loc of locations) {
    const sx = loc.wx * TS - camX;
    const sy = loc.wy * TS - camY;
    if (sx + TS < 0 || sx > W || sy + TS < 0 || sy > H) continue;

    const isNearby = nearbyLoc?.id === loc.id;
    const c = LOC_COLORS[loc.type] || { bg: '#aaa', border: '#777', text: '#000' };

    // 靠近時發光
    if (isNearby) {
      ctx.fillStyle = 'rgba(255,255,200,0.35)';
      ctx.fillRect(sx - 3, sy - 3, TS + 6, TS + 6);
    }

    // 背景磚塊
    ctx.fillStyle = c.bg;
    ctx.fillRect(sx + 1, sy + 1, TS - 2, TS - 2);

    // 邊框
    ctx.strokeStyle = isNearby ? '#fff' : c.border;
    ctx.lineWidth = isNearby ? 2 : 1.5;
    ctx.strokeRect(sx + 1, sy + 1, TS - 2, TS - 2);

    // 圖示文字
    ctx.fillStyle = c.text;
    ctx.font = `bold ${Math.floor(TS * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LOC_ICONS[loc.type] || '?', sx + TS / 2, sy + TS / 2 - 1);

    // 標籤（格子下方）
    ctx.fillStyle = isNearby ? '#ffffff' : '#dddddd';
    ctx.font = `${Math.max(8, Math.floor(TS * 0.33))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(loc.label, sx + TS / 2, sy + TS + 2);
    ctx.shadowBlur = 0;
  }

  // ── 3. 玩家（黃色圓點 + 方向線）──────────
  const px = wx * TS - camX;
  const py = wy * TS - camY;

  // 外圈光暈
  ctx.fillStyle = 'rgba(255,230,80,0.25)';
  ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill();

  // 主體
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── 4. 靠近地點 HUD ──────────────────────
  if (nearbyLoc) {
    const txt = `[E] 進入 ${nearbyLoc.label}`;
    const tw = Math.max(180, txt.length * 8.5 + 28);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - tw / 2, H - 54, tw, 34, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,80,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffe040';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, W / 2, H - 37);
  }

  // ── 5. 圖例（右上角）───────────────────
  drawLegend(ctx, W, H);

  // ── 6. 標題 HUD（左上角）───────────────
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.roundRect(8, 8, 90, 22, 4); ctx.fill();
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
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  if (t === TERRAIN.MOUNTAIN) {
    // 山形
    ctx.beginPath();
    ctx.moveTo(cx, sy + 4);
    ctx.lineTo(sx + TS - 4, sy + TS - 4);
    ctx.lineTo(sx + 4, sy + TS - 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
  } else if (t === TERRAIN.WATER) {
    // 波浪
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      const yw = sy + TS * (0.3 + k * 0.35);
      ctx.beginPath();
      ctx.moveTo(sx + 2, yw);
      ctx.bezierCurveTo(sx + TS * 0.3, yw - 2, sx + TS * 0.7, yw + 2, sx + TS - 2, yw);
      ctx.stroke();
    }
  } else if (t === TERRAIN.FOREST) {
    // 樹冠圓圈
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.arc(cx, cy, TS * 0.28, 0, Math.PI * 2); ctx.fill();
  }
}

// ─────────────────────────────────────────────
//  圖例
// ─────────────────────────────────────────────
function drawLegend(ctx, W) {
  const items = [
    { color: '#4a7c3f', label: '平原' },
    { color: '#2d5a1e', label: '森林' },
    { color: '#7a6650', label: '山脈' },
    { color: '#2d6a8f', label: '水域' },
  ];
  const lx = W - 78, ly = 8;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.roundRect(lx, ly, 70, items.length * 16 + 8, 4); ctx.fill();
  items.forEach(({ color, label }, i) => {
    const iy = ly + 8 + i * 16;
    ctx.fillStyle = color;
    ctx.fillRect(lx + 6, iy, 9, 9);
    ctx.fillStyle = '#ccc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + 20, iy + 4.5);
  });
}
