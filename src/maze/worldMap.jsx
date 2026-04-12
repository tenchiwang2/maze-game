// ─────────────────────────────────────────────
//  worldMap.jsx
//  世界地圖純資料模組
// ─────────────────────────────────────────────

export const TERRAIN = {
  PLAINS:     0,  // 平原（可通行）
  MOUNTAIN:   1,  // 山脈（不可通行）
  WATER:      2,  // 水域（不可通行）
  FOREST:     3,  // 森林（可通行）
  SNOW:       4,  // 雪原（可通行）
  DESERT:     5,  // 沙漠（可通行）
  SWAMP:      6,  // 沼澤（可通行）
  LAVA:       7,  // 熔岩（不可通行）
  TUNDRA:     8,  // 凍原（可通行）
  ROAD:       9,  // 道路（可通行，加速）
  DEEP_WATER: 10, // 深海（不可通行）
  SAVANNA:    11, // 稀樹草原（可通行）
};

export const LOC_TYPE = {
  TOWN:    'town',
  CAVE:    'cave',
  TOWER:   'tower',
  DUNGEON: 'dungeon',
  CAPITAL: 'capital', // 國家首都
  TEMPLE:  'temple',  // 神殿/遺跡
};

// 保留：手工地圖用
export function buildWorldGrid(def) {
  const { cols, rows, terrainRegions = [] } = def;
  const terrain = Array.from({ length: rows }, () => new Array(cols).fill(TERRAIN.PLAINS));
  for (const region of terrainRegions) {
    if (region.shape === 'circle') {
      const { cx, cy, r, type } = region;
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++)
          if (Math.hypot(col - cx, row - cy) <= r) terrain[row][col] = type;
    } else {
      const { x, y, w, h, type } = region;
      for (let row = Math.max(0, y); row < Math.min(rows, y + h); row++)
        for (let col = Math.max(0, x); col < Math.min(cols, x + w); col++)
          terrain[row][col] = type;
    }
  }
  return terrain;
}

export function isPassable(terrain, wx, wy) {
  const col = Math.floor(wx);
  const row = Math.floor(wy);
  if (row < 0 || row >= terrain.length || col < 0 || col >= terrain[0].length) return false;
  const t = terrain[row][col];
  return t !== TERRAIN.MOUNTAIN && t !== TERRAIN.WATER &&
         t !== TERRAIN.LAVA && t !== TERRAIN.DEEP_WATER;
}

export function findWorldSpawn(terrain, preferX, preferY) {
  for (let d = 0; d <= 12; d++) {
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

export function getNearbyLocation(locations, wx, wy, proximityDist) {
  for (const loc of locations) {
    const dx = wx - (loc.wx + 0.5);
    const dy = wy - (loc.wy + 0.5);
    if (dx * dx + dy * dy <= proximityDist * proximityDist) return loc;
  }
  return null;
}
