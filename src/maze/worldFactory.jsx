// ─────────────────────────────────────────────
//  worldFactory.jsx
//  世界地圖工廠 — 8 種大地圖地形產生器
// ─────────────────────────────────────────────
import { TERRAIN } from './worldMap.jsx';

export const WORLD_FACTORY_IDS = {
  GRAND_WORLD:    'grand_world',
  CONTINENTAL:    'continental',
  ARCHIPELAGO:    'archipelago',
  FROZEN_TUNDRA:  'frozen_tundra',
  DESERT_EMPIRE:  'desert_empire',
  VOLCANIC_ISLES: 'volcanic_isles',
  SWAMP_LANDS:    'swamp_lands',
  MOUNTAIN_CROSS: 'mountain_cross',
};

// ── 工具函式 ────────────────────────────────────

function makeRng(seed) {
  let s = (seed ^ 0xDEADBEEF) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0x100000000;
  };
}

function valueNoise(rng, cols, rows, scaleX, scaleY) {
  const gW = Math.ceil(cols / scaleX) + 2;
  const gH = Math.ceil(rows / scaleY) + 2;
  const grid = Array.from({ length: gH }, () =>
    Array.from({ length: gW }, () => rng())
  );
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const gx = c / scaleX, gy = r / scaleY;
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const tx = gx - x0, ty = gy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const v00 = grid[y0][x0], v10 = grid[y0][x0 + 1];
      const v01 = grid[y0 + 1][x0], v11 = grid[y0 + 1][x0 + 1];
      return v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v11 - v10 - v01 + v00) * sx * sy;
    })
  );
}

// BFS 尋路（避開不可通行地形）
function bfsPath(terrain, cols, rows, x0, y0, x1, y1) {
  const parent = new Int32Array(rows * cols).fill(-2);
  const startK = y0 * cols + x0;
  const endK = y1 * cols + x1;
  parent[startK] = -1;
  const queue = [startK];
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    if (cur === endK) {
      const path = [];
      let k = endK;
      while (k !== -1) { path.push({ r: Math.floor(k / cols), c: k % cols }); k = parent[k]; }
      return path;
    }
    const r = Math.floor(cur / cols), c = cur % cols;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 1 || nr >= rows - 1 || nc < 1 || nc >= cols - 1) continue;
      const nk = nr * cols + nc;
      if (parent[nk] !== -2) continue;
      const t = terrain[nr][nc];
      if (t === TERRAIN.MOUNTAIN || t === TERRAIN.LAVA || t === TERRAIN.WATER || t === TERRAIN.DEEP_WATER) continue;
      parent[nk] = cur;
      queue.push(nk);
    }
  }
  return null;
}

// 在地點之間鋪設道路
function placeRoads(terrain, cols, rows, locations) {
  if (locations.length < 2) return;
  // Hub-and-spoke: 所有城鎮都連向第一個（首都/主城）
  for (let i = 1; i < locations.length; i++) {
    const a = locations[0], b = locations[i];
    const path = bfsPath(terrain, cols, rows, a.wx, a.wy, b.wx, b.wy);
    if (path) path.forEach(({ r, c }) => {
      const t = terrain[r][c];
      if (t !== TERRAIN.MOUNTAIN && t !== TERRAIN.LAVA && t !== TERRAIN.DEEP_WATER) terrain[r][c] = TERRAIN.ROAD;
    });
  }
  // Ring: 相鄰城鎮之間也連接
  for (let i = 1; i < locations.length - 1; i++) {
    const a = locations[i], b = locations[i + 1];
    const path = bfsPath(terrain, cols, rows, a.wx, a.wy, b.wx, b.wy);
    if (path) path.forEach(({ r, c }) => {
      const t = terrain[r][c];
      if (t !== TERRAIN.MOUNTAIN && t !== TERRAIN.LAVA && t !== TERRAIN.DEEP_WATER) terrain[r][c] = TERRAIN.ROAD;
    });
  }
}

// 在指定地形中找到可放置位置（含最小間距）
function findBiomeSpot(terrain, cols, rows, rng, preferred, fallback, minDist, occupied) {
  const candidates = [];
  for (let r = 3; r < rows - 3; r++) {
    for (let c = 3; c < cols - 3; c++) {
      const t = terrain[r][c];
      if (t === preferred || (fallback !== null && t === fallback)) candidates.push({ wx: c, wy: r });
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const p of candidates) {
    if (occupied.every(q => Math.hypot(p.wx - q.wx, p.wy - q.wy) >= minDist)) return p;
  }
  return candidates[0] || { wx: Math.floor(cols / 2), wy: Math.floor(rows / 2) };
}

// 通用：在任意可通行地形中放置，有偏好列表
function placeAnywhere(terrain, cols, rows, rng, allowed, minDist, occupied) {
  const candidates = [];
  const set = new Set(allowed);
  for (let r = 3; r < rows - 3; r++)
    for (let c = 3; c < cols - 3; c++)
      if (set.has(terrain[r][c])) candidates.push({ wx: c, wy: r });
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const p of candidates) {
    if (occupied.every(q => Math.hypot(p.wx - q.wx, p.wy - q.wy) >= minDist)) return p;
  }
  return candidates[0] || { wx: Math.floor(cols / 2), wy: Math.floor(rows / 2) };
}

// 放置火山熔岩圈（山頂熔岩+周圍山脈）
function placeVolcano(terrain, cols, rows, cx, cy, r) {
  for (let dr = -r - 2; dr <= r + 2; dr++) {
    for (let dc = -r - 2; dc <= r + 2; dc++) {
      const nr = cy + dr, nc = cx + dc;
      if (nr < 1 || nr >= rows - 1 || nc < 1 || nc >= cols - 1) continue;
      const dist = Math.hypot(dc, dr);
      if (dist <= r * 0.5) terrain[nr][nc] = TERRAIN.LAVA;
      else if (dist <= r) terrain[nr][nc] = TERRAIN.MOUNTAIN;
    }
  }
}

// 尋找海岸線附近的可通行格（供港口放置）
function findCoastalSpot(terrain, cols, rows, rng, minDist, occupied) {
  const waterSet = new Set([TERRAIN.WATER, TERRAIN.DEEP_WATER]);
  const blocked  = new Set([TERRAIN.MOUNTAIN, TERRAIN.WATER, TERRAIN.DEEP_WATER, TERRAIN.LAVA]);
  const coastal  = [];
  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      if (blocked.has(terrain[r][c])) continue;
      let near = false;
      outer: for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && waterSet.has(terrain[nr][nc])) {
            near = true; break outer;
          }
        }
      }
      if (near) coastal.push({ wx: c, wy: r });
    }
  }
  for (let i = coastal.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [coastal[i], coastal[j]] = [coastal[j], coastal[i]];
  }
  for (const p of coastal) {
    if (occupied.every(q => Math.hypot(p.wx - q.wx, p.wy - q.wy) >= minDist)) return p;
  }
  // 無海岸時退化為任意可通行地
  return placeAnywhere(terrain, cols, rows, rng,
    [TERRAIN.PLAINS, TERRAIN.FOREST, TERRAIN.SNOW, TERRAIN.DESERT, TERRAIN.SAVANNA, TERRAIN.SWAMP, TERRAIN.TUNDRA],
    minDist, occupied);
}

// 在地圖上放置 3 個港口位置（追加到現有 locations 之後）
function addPorts(terrain, cols, rows, rng, existingLocs) {
  const ports = [];
  for (let i = 0; i < 3; i++) {
    const p = findCoastalSpot(terrain, cols, rows, rng, 12, [...existingLocs, ...ports]);
    ports.push(p);
  }
  return ports;
}

// ── 工廠定義 ───────────────────────────────────

export const WORLD_FACTORIES = [

  // ── 1. 多國大世界（旗艦） ──────────────────
  {
    id:          WORLD_FACTORY_IDS.GRAND_WORLD,
    label:       '多國大世界',
    description: '三大國家並立：溫帶王國、沙漠帝國、雪域聯盟，道路四通八達',
    generate(seed, cols, rows) {
      const rng = makeRng(seed);
      const elev   = valueNoise(rng, cols, rows, cols / 3,   rows / 3);
      const elevHi = valueNoise(rng, cols, rows, cols / 8,   rows / 8);
      const moist  = valueNoise(rng, cols, rows, cols / 3.5, rows / 3.5);
      const moistHi = valueNoise(rng, cols, rows, cols / 6, rows / 6);

      // 大陸輪廓（距中心衰減）
      const cx = cols / 2, cy = rows / 2;
      const maxD = Math.min(cx, cy) * 0.82;

      const terrain = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const dist = Math.hypot(c - cx, r - cy);
          const falloff = Math.max(0, 1 - (dist / maxD) ** 1.6);
          const e = (elev[r][c] * 0.6 + elevHi[r][c] * 0.4) * falloff;
          const m = moist[r][c] * 0.65 + moistHi[r][c] * 0.35;
          // 溫度：北方冷，南方熱（0=北=冷，1=南=熱）
          const temp = r / rows;

          if (e < 0.12) return TERRAIN.DEEP_WATER;
          if (e < 0.22) return TERRAIN.WATER;
          if (e > 0.78) return TERRAIN.MOUNTAIN;

          // 北方（雪域）
          if (temp < 0.25) {
            if (e > 0.60) return TERRAIN.MOUNTAIN;
            if (e > 0.40) return TERRAIN.TUNDRA;
            return TERRAIN.SNOW;
          }
          // 溫帶（王國）
          if (temp < 0.60) {
            if (e > 0.65) return TERRAIN.MOUNTAIN;
            if (m > 0.62) return TERRAIN.FOREST;
            if (m > 0.45) return TERRAIN.PLAINS;
            return TERRAIN.SAVANNA;
          }
          // 南方（沙漠帝國）
          if (e > 0.65) return TERRAIN.MOUNTAIN;
          if (m > 0.65) return TERRAIN.SWAMP;
          if (m > 0.38) return TERRAIN.SAVANNA;
          return TERRAIN.DESERT;
        })
      );

      // 加幾座火山（南方）
      const volcCount = 2 + Math.floor(rng() * 2);
      for (let v = 0; v < volcCount; v++) {
        const vc = 50 + Math.floor(rng() * 25);
        const vr = 38 + Math.floor(rng() * 14);
        placeVolcano(terrain, cols, rows, vc, vr, 3 + Math.floor(rng() * 3));
      }

      // 放置地點（按國家分區）
      const occ = [];
      const TEMP = [TERRAIN.PLAINS, TERRAIN.FOREST, TERRAIN.SAVANNA];
      const COLD = [TERRAIN.SNOW, TERRAIN.TUNDRA];
      const HOT  = [TERRAIN.DESERT, TERRAIN.SAVANNA];
      const ANY  = [TERRAIN.PLAINS, TERRAIN.FOREST, TERRAIN.SAVANNA, TERRAIN.SNOW, TERRAIN.TUNDRA, TERRAIN.DESERT];

      const l = (allowed, dist) => placeAnywhere(terrain, cols, rows, rng, allowed, dist, occ);
      const push = p => { occ.push(p); return p; };

      // 0: 亞薩王都（溫帶中心）
      const L0 = push(l(TEMP, 10));
      // 1: 河畔城（溫帶，離王都有段距離）
      const L1 = push(l(TEMP, 8));
      // 2: 東港城（溫帶東側）
      const L2 = push(l(TEMP, 8));
      // 3: 沙漠帝都（沙漠）
      const L3 = push(l(HOT, 10));
      // 4: 綠洲鎮（沙漠/稀樹）
      const L4 = push(l(HOT, 7));
      // 5: 霜城要塞（北方雪地）
      const L5 = push(l(COLD, 8));
      // 6: 火山洞窟（靠近熔岩）
      const L6 = push(l([TERRAIN.SAVANNA, TERRAIN.DESERT, TERRAIN.PLAINS], 7));
      // 7: 古代神殿（任意可通行）
      const L7 = push(l(ANY, 8));

      const locations = [L0, L1, L2, L3, L4, L5, L6, L7];

      // 鋪設王國內道路（前三個城鎮互連）
      placeRoads(terrain, cols, rows, [L0, L1, L2]);
      // 沙漠帝國道路
      placeRoads(terrain, cols, rows, [L3, L4]);
      // 跨國交通（王都↔沙漠帝都，王都↔霜城）
      placeRoads(terrain, cols, rows, [L0, L3]);
      placeRoads(terrain, cols, rows, [L0, L5]);

      const ports = addPorts(terrain, cols, rows, rng, locations);
      return { terrain, locations: [...locations, ...ports] };
    },
  },

  // ── 2. 大陸型 ───────────────────────────────
  {
    id:          WORLD_FACTORY_IDS.CONTINENTAL,
    label:       '標準大陸',
    description: '中央大陸四周環海，混合地形，城鎮由道路相連',
    generate(seed, cols, rows) {
      const rng = makeRng(seed);
      const low  = valueNoise(rng, cols, rows, cols / 2.5, rows / 2.5);
      const hi   = valueNoise(rng, cols, rows, cols / 7,   rows / 7);
      const moist = valueNoise(rng, cols, rows, cols / 4, rows / 4);
      const cx = cols / 2, cy = rows / 2;
      const maxD = Math.min(cx, cy) * 0.88;

      const terrain = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const dist = Math.hypot(c - cx, r - cy);
          const falloff = Math.max(0, 1 - (dist / maxD) ** 1.7);
          const h = (low[r][c] * 0.65 + hi[r][c] * 0.35) * falloff;
          const m = moist[r][c];
          if (h < 0.12) return TERRAIN.DEEP_WATER;
          if (h < 0.24) return TERRAIN.WATER;
          if (h > 0.78) return TERRAIN.MOUNTAIN;
          if (h > 0.60) return m > 0.5 ? TERRAIN.FOREST : TERRAIN.MOUNTAIN;
          if (h > 0.45) return m > 0.55 ? TERRAIN.FOREST : TERRAIN.PLAINS;
          if (m > 0.68) return TERRAIN.SWAMP;
          if (m > 0.50) return TERRAIN.FOREST;
          if (m < 0.28) return TERRAIN.SAVANNA;
          return TERRAIN.PLAINS;
        })
      );

      const ALL = [TERRAIN.PLAINS, TERRAIN.FOREST, TERRAIN.SAVANNA];
      const occ = [];
      const locations = Array.from({ length: 8 }, () => {
        const p = placeAnywhere(terrain, cols, rows, rng, ALL, 8, occ);
        occ.push(p);
        return p;
      });

      placeRoads(terrain, cols, rows, locations.slice(0, 6));
      const ports = addPorts(terrain, cols, rows, rng, locations);
      return { terrain, locations: [...locations, ...ports] };
    },
  },

  // ── 3. 冰封世界 ─────────────────────────────
  {
    id:          WORLD_FACTORY_IDS.FROZEN_TUNDRA,
    label:       '冰封世界',
    description: '冰雪覆蓋的冷酷大陸，凍原、雪山、冰湖，偶有寒帶森林',
    generate(seed, cols, rows) {
      const rng = makeRng(seed);
      const elev  = valueNoise(rng, cols, rows, cols / 2.8, rows / 2.8);
      const elevHi = valueNoise(rng, cols, rows, cols / 6, rows / 6);
      const crack = valueNoise(rng, cols, rows, cols / 5, rows / 5);
      const cx = cols / 2, cy = rows / 2;
      const maxD = Math.min(cx, cy) * 0.85;

      const terrain = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const dist = Math.hypot(c - cx, r - cy);
          const falloff = Math.max(0, 1 - (dist / maxD) ** 1.5);
          const h = (elev[r][c] * 0.6 + elevHi[r][c] * 0.4) * falloff;
          const ck = crack[r][c];
          if (h < 0.12) return TERRAIN.DEEP_WATER;
          if (h < 0.25) return TERRAIN.WATER; // 冰湖
          if (h > 0.80) return TERRAIN.MOUNTAIN;
          if (h > 0.62) return TERRAIN.SNOW; // 雪山坡
          if (ck > 0.72) return TERRAIN.FOREST; // 稀疏寒帶林
          if (h > 0.40) return TERRAIN.SNOW;
          return TERRAIN.TUNDRA;
        })
      );

      const COLD = [TERRAIN.SNOW, TERRAIN.TUNDRA, TERRAIN.FOREST];
      const occ = [];
      const locations = Array.from({ length: 8 }, () => {
        const p = placeAnywhere(terrain, cols, rows, rng, COLD, 7, occ);
        occ.push(p);
        return p;
      });

      placeRoads(terrain, cols, rows, locations);
      const ports = addPorts(terrain, cols, rows, rng, locations);
      return { terrain, locations: [...locations, ...ports] };
    },
  },

  // ── 4. 沙漠帝國 ─────────────────────────────
  {
    id:          WORLD_FACTORY_IDS.DESERT_EMPIRE,
    label:       '沙漠帝國',
    description: '廣袤沙漠與稀樹草原，綠洲星羅棋布，山峰聳立',
    generate(seed, cols, rows) {
      const rng = makeRng(seed);
      const dune  = valueNoise(rng, cols, rows, cols / 3, rows / 3);
      const duneHi = valueNoise(rng, cols, rows, cols / 7, rows / 7);
      const oasis = valueNoise(rng, cols, rows, cols / 8, rows / 8);
      const cx = cols / 2, cy = rows / 2;
      const maxD = Math.min(cx, cy) * 0.86;

      const terrain = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const dist = Math.hypot(c - cx, r - cy);
          const falloff = Math.max(0, 1 - (dist / maxD) ** 1.7);
          const h = (dune[r][c] * 0.6 + duneHi[r][c] * 0.4) * falloff;
          const oa = oasis[r][c];
          if (h < 0.12) return TERRAIN.DEEP_WATER;
          if (h < 0.22) return TERRAIN.WATER;
          if (h > 0.80) return TERRAIN.MOUNTAIN;
          if (h > 0.64) return TERRAIN.MOUNTAIN;
          if (oa < 0.15) return TERRAIN.WATER; // 小綠洲水域
          if (oa < 0.22) return TERRAIN.FOREST; // 棕櫚林
          if (h > 0.48) return TERRAIN.SAVANNA;
          return TERRAIN.DESERT;
        })
      );

      const HOT = [TERRAIN.DESERT, TERRAIN.SAVANNA];
      const occ = [];
      const locations = Array.from({ length: 8 }, () => {
        const p = placeAnywhere(terrain, cols, rows, rng, HOT, 7, occ);
        occ.push(p);
        return p;
      });

      placeRoads(terrain, cols, rows, locations);
      const ports = addPorts(terrain, cols, rows, rng, locations);
      return { terrain, locations: [...locations, ...ports] };
    },
  },

  // ── 5. 火山群島 ─────────────────────────────
  {
    id:          WORLD_FACTORY_IDS.VOLCANIC_ISLES,
    label:       '火山群島',
    description: '海洋中散布的火山島，熔岩與平原交錯，危機四伏',
    generate(seed, cols, rows) {
      const rng = makeRng(seed);
      const islandCount = 6 + Math.floor(rng() * 4);
      const islands = Array.from({ length: islandCount }, () => ({
        cx: 5 + rng() * (cols - 10),
        cy: 5 + rng() * (rows - 10),
        r:  3 + rng() * 5,
        volcanic: rng() > 0.5,
      }));
      const noise = valueNoise(rng, cols, rows, cols / 5, rows / 5);

      const terrain = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          let maxInf = 0, bestIsle = null;
          for (const isl of islands) {
            const inf = Math.max(0, 1 - Math.hypot(c - isl.cx, r - isl.cy) / isl.r);
            if (inf > maxInf) { maxInf = inf; bestIsle = isl; }
          }
          const h = maxInf * 0.80 + noise[r][c] * 0.20;
          if (h < 0.22) return TERRAIN.DEEP_WATER;
          if (h < 0.32) return TERRAIN.WATER;
          if (bestIsle?.volcanic) {
            if (h > 0.72) return TERRAIN.LAVA;
            if (h > 0.55) return TERRAIN.MOUNTAIN;
            if (h > 0.42) return TERRAIN.SAVANNA;
          } else {
            if (h > 0.75) return TERRAIN.MOUNTAIN;
            if (h > 0.55) return TERRAIN.FOREST;
          }
          return TERRAIN.PLAINS;
        })
      );

      const SAFE = [TERRAIN.PLAINS, TERRAIN.FOREST, TERRAIN.SAVANNA];
      const occ = [];
      const locations = Array.from({ length: 8 }, () => {
        const p = placeAnywhere(terrain, cols, rows, rng, SAFE, 6, occ);
        occ.push(p);
        return p;
      });

      placeRoads(terrain, cols, rows, locations);
      const ports = addPorts(terrain, cols, rows, rng, locations);
      return { terrain, locations: [...locations, ...ports] };
    },
  },

  // ── 6. 沼澤大地 ─────────────────────────────
  {
    id:          WORLD_FACTORY_IDS.SWAMP_LANDS,
    label:       '沼澤大地',
    description: '廣大的沼澤與密林，水道交錯，隱藏著古老的秘密',
    generate(seed, cols, rows) {
      const rng = makeRng(seed);
      const elev  = valueNoise(rng, cols, rows, cols / 2.5, rows / 2.5);
      const elevHi = valueNoise(rng, cols, rows, cols / 7, rows / 7);
      const wet   = valueNoise(rng, cols, rows, cols / 4, rows / 4);
      const cx = cols / 2, cy = rows / 2;
      const maxD = Math.min(cx, cy) * 0.87;

      const terrain = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const dist = Math.hypot(c - cx, r - cy);
          const falloff = Math.max(0, 1 - (dist / maxD) ** 1.5);
          const h = (elev[r][c] * 0.55 + elevHi[r][c] * 0.45) * falloff;
          const w = wet[r][c];
          if (h < 0.12) return TERRAIN.DEEP_WATER;
          if (h < 0.22) return TERRAIN.WATER;
          if (h > 0.78) return TERRAIN.MOUNTAIN;
          if (h < 0.35 && w > 0.45) return TERRAIN.SWAMP;
          if (h < 0.38) return TERRAIN.WATER;
          if (w > 0.70) return TERRAIN.SWAMP;
          if (w > 0.48) return TERRAIN.FOREST;
          if (h > 0.58) return TERRAIN.PLAINS;
          return TERRAIN.SWAMP;
        })
      );

      const SAFE = [TERRAIN.PLAINS, TERRAIN.FOREST, TERRAIN.SWAMP];
      const occ = [];
      const locations = Array.from({ length: 8 }, () => {
        const p = placeAnywhere(terrain, cols, rows, rng, SAFE, 7, occ);
        occ.push(p);
        return p;
      });

      placeRoads(terrain, cols, rows, locations);
      const ports = addPorts(terrain, cols, rows, rng, locations);
      return { terrain, locations: [...locations, ...ports] };
    },
  },

  // ── 7. 群島世界 ─────────────────────────────
  {
    id:          WORLD_FACTORY_IDS.ARCHIPELAGO,
    label:       '千島群島',
    description: '大海中散布數十個島嶼，氣候各異，充滿冒險精神',
    generate(seed, cols, rows) {
      const rng = makeRng(seed);
      const islandCount = 9 + Math.floor(rng() * 5);
      const islands = Array.from({ length: islandCount }, () => ({
        cx: 4 + rng() * (cols - 8),
        cy: 4 + rng() * (rows - 8),
        r:  2 + rng() * 4.5,
        tropical: rng() > 0.5,
      }));
      const noise = valueNoise(rng, cols, rows, cols / 6, rows / 6);
      const temp  = valueNoise(rng, cols, rows, cols / 10, rows / 3);

      const terrain = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          let maxInf = 0, bestIsle = null;
          for (const isl of islands) {
            const inf = Math.max(0, 1 - Math.hypot(c - isl.cx, r - isl.cy) / isl.r);
            if (inf > maxInf) { maxInf = inf; bestIsle = isl; }
          }
          const h = maxInf * 0.78 + noise[r][c] * 0.22;
          if (h < 0.24) return TERRAIN.DEEP_WATER;
          if (h < 0.34) return TERRAIN.WATER;
          const t = temp[r][c];
          if (h > 0.74) return TERRAIN.MOUNTAIN;
          if (bestIsle?.tropical) {
            if (h > 0.55) return TERRAIN.FOREST;
            return t > 0.5 ? TERRAIN.SAVANNA : TERRAIN.PLAINS;
          }
          return t > 0.6 ? TERRAIN.FOREST : (t > 0.35 ? TERRAIN.PLAINS : TERRAIN.SNOW);
        })
      );

      const SAFE = [TERRAIN.PLAINS, TERRAIN.FOREST, TERRAIN.SAVANNA, TERRAIN.SNOW];
      const occ = [];
      const locations = Array.from({ length: 8 }, () => {
        const p = placeAnywhere(terrain, cols, rows, rng, SAFE, 5, occ);
        occ.push(p);
        return p;
      });

      placeRoads(terrain, cols, rows, locations);
      const ports = addPorts(terrain, cols, rows, rng, locations);
      return { terrain, locations: [...locations, ...ports] };
    },
  },

  // ── 8. 山脈橫貫型 ───────────────────────────
  {
    id:          WORLD_FACTORY_IDS.MOUNTAIN_CROSS,
    label:       '山脈橫貫',
    description: '巨大山脈橫跨全圖，山谷中有河流與聚落，山頂終年積雪',
    generate(seed, cols, rows) {
      const rng = makeRng(seed);
      const ctrlCount = 6;
      const ctrlY = Array.from({ length: ctrlCount }, () => (rng() - 0.5) * rows * 0.35);
      function ridgeY(x) {
        const t = (x / cols) * (ctrlCount - 1);
        const i = Math.min(Math.floor(t), ctrlCount - 2);
        return rows / 2 + ctrlY[i] * (1 - (t - i)) + ctrlY[i + 1] * (t - i);
      }
      const noise  = valueNoise(rng, cols, rows, cols / 5,  rows / 5);
      const detail = valueNoise(rng, cols, rows, cols / 9,  rows / 9);
      const river  = valueNoise(rng, cols, rows, cols / 4,  rows / 4);
      const border = valueNoise(rng, cols, rows, cols / 3,  rows / 3);

      const terrain = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          // 邊緣海洋
          const edgeDist = Math.min(c, cols - 1 - c, r, rows - 1 - r);
          const edgeFalloff = Math.min(1, edgeDist / 6);
          const b = border[r][c] * edgeFalloff;
          if (b < 0.15) return TERRAIN.DEEP_WATER;
          if (b < 0.25) return TERRAIN.WATER;

          const ry   = ridgeY(c);
          const dist = Math.abs(r - ry);
          const width = 4 + noise[r][c] * 3;
          if (dist < width * 0.35 + detail[r][c] * 1.5) {
            // 山頂：北側有雪
            return r < rows * 0.45 ? TERRAIN.SNOW : TERRAIN.MOUNTAIN;
          }
          if (dist < width) return detail[r][c] > 0.6 ? TERRAIN.FOREST : TERRAIN.MOUNTAIN;
          const valley = dist - width;
          if (valley < 1.5 && river[r][c] < 0.38) return TERRAIN.WATER;
          // 南側更溫暖 → 稀樹草原
          if (r > rows * 0.65) return detail[r][c] > 0.65 ? TERRAIN.SAVANNA : TERRAIN.PLAINS;
          return detail[r][c] > 0.70 ? TERRAIN.FOREST : TERRAIN.PLAINS;
        })
      );

      const SAFE = [TERRAIN.PLAINS, TERRAIN.FOREST, TERRAIN.SAVANNA, TERRAIN.SNOW];
      const occ = [];
      const locations = Array.from({ length: 8 }, () => {
        const p = placeAnywhere(terrain, cols, rows, rng, SAFE, 7, occ);
        occ.push(p);
        return p;
      });

      placeRoads(terrain, cols, rows, locations);
      const ports = addPorts(terrain, cols, rows, rng, locations);
      return { terrain, locations: [...locations, ...ports] };
    },
  },
];
