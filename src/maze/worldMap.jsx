// ─────────────────────────────────────────────
//  worldMap.jsx
//  世界地圖純資料模組 — 對應 mazeGenerator.jsx 的設計風格
//  不含 React，不含渲染邏輯
// ─────────────────────────────────────────────

export const TERRAIN = {
  PLAINS:   0, // 平原（可通行）
  MOUNTAIN: 1, // 山脈（不可通行）
  WATER:    2, // 水域（不可通行）
  FOREST:   3, // 森林（可通行，移動稍慢）
};

export const LOC_TYPE = {
  TOWN:    'town',
  CAVE:    'cave',
  TOWER:   'tower',
  DUNGEON: 'dungeon',
};

// 從 WorldDef 建立 2D 地形陣列
// terrainRegions 可以是矩形或圓形 region
export function buildWorldGrid(def) {
  const { cols, rows, terrainRegions = [] } = def;
  const terrain = Array.from({ length: rows }, () => new Array(cols).fill(TERRAIN.PLAINS));

  for (const region of terrainRegions) {
    if (region.shape === 'circle') {
      const { cx, cy, r, type } = region;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (Math.hypot(col - cx, row - cy) <= r) terrain[row][col] = type;
        }
      }
    } else {
      // 預設：矩形
      const { x, y, w, h, type } = region;
      for (let row = Math.max(0, y); row < Math.min(rows, y + h); row++) {
        for (let col = Math.max(0, x); col < Math.min(cols, x + w); col++) {
          terrain[row][col] = type;
        }
      }
    }
  }

  return terrain;
}

// 判斷世界座標是否可通行（邊界外也視為不可通行）
export function isPassable(terrain, wx, wy) {
  const col = Math.floor(wx);
  const row = Math.floor(wy);
  if (row < 0 || row >= terrain.length || col < 0 || col >= terrain[0].length) return false;
  const t = terrain[row][col];
  return t !== TERRAIN.MOUNTAIN && t !== TERRAIN.WATER;
}

// 在指定位置附近尋找可通行的出生點
export function findWorldSpawn(terrain, preferX, preferY) {
  for (let d = 0; d <= 6; d++) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        if (Math.abs(dy) !== d && Math.abs(dx) !== d) continue;
        const wx = preferX + dx + 0.5;
        const wy = preferY + dy + 0.5;
        if (isPassable(terrain, wx, wy)) return { wx, wy };
      }
    }
  }
  return { wx: 0.5, wy: 0.5 };
}

// 取得玩家附近的地點（距離 <= proximityDist 格）
export function getNearbyLocation(locations, wx, wy, proximityDist) {
  for (const loc of locations) {
    const dx = wx - (loc.wx + 0.5);
    const dy = wy - (loc.wy + 0.5);
    if (dx * dx + dy * dy <= proximityDist * proximityDist) return loc;
  }
  return null;
}
