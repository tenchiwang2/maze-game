import { FOV, NUM_RAYS, MM, TORCH_RADIUS, AMBIENT } from './constants.jsx';

// 依距離計算亮度（平方衰減），torchBright 含閃爍係數
function getLit(dist, torchBright) {
  const t = Math.max(0, 1 - dist / TORCH_RADIUS);
  return Math.max(AMBIENT, torchBright * t * t);
}

// ─────────────────────────────────────────────
//  renderer.js
//
//  所有 Canvas 2D 繪圖與光線投射
//  不含 React，不含迷宮生成邏輯
//
//  匯出：
//    castRays()            – DDA 光線投射器
//    renderFloorCeiling()  – 地板投射（ImageData）
//    renderWalls()         – 貼圖欄位切片
//    getSpriteInfo()       – 精靈 z-buffer 測試
//    drawEntryArch()       – 入口傳送門精靈
//    drawExitPortal()      – 出口傳送門精靈
//    drawEventMarker()     – 世界內事件標記點
//    drawMinimap()         – 疊加小地圖
//    drawHUD()             – 門互動提示
// ─────────────────────────────────────────────

export function castRays(grid, zoneMap, doorMap, px, py, angle, gW, gH) {
  const rays = [];
  for (let i = 0; i < NUM_RAYS; i++) {
    const ra = angle - FOV / 2 + (FOV * i / NUM_RAYS);
    const cos = Math.cos(ra), sin = Math.sin(ra);
    let mx = Math.floor(px), my = Math.floor(py);
    const dX = Math.abs(1 / cos), dY = Math.abs(1 / sin);
    const sX = cos < 0 ? -1 : 1, sY = sin < 0 ? -1 : 1;
    let sdX = cos < 0 ? (px - mx) * dX : (mx + 1 - px) * dX;
    let sdY = sin < 0 ? (py - my) * dY : (my + 1 - py) * dY;
    let side = 0, dist = 24, doorRoomIdx = -1;
    let hitMx = mx, hitMy = my;
    for (let d = 0; d < 350; d++) {
      if (sdX < sdY) { sdX += dX; mx += sX; side = 0; }
      else { sdY += dY; my += sY; side = 1; }
      if (mx < 0 || mx >= gW || my < 0 || my >= gH) { dist = 24; break; }
      if (grid[my][mx] === 1) {
        dist = side === 0 ? sdX - dX : sdY - dY;
        const dk = doorMap[`${my},${mx}`];
        doorRoomIdx = dk != null ? dk : -1;
        hitMx = mx; hitMy = my;
        break;
      }
    }
    const perpDist = dist * Math.cos(ra - angle);

    // wallX：光線命中牆面的小數位置（0-1）
    let wallX;
    if (side === 0) {
      wallX = py + perpDist * sin;
    } else {
      wallX = px + perpDist * cos;
    }
    wallX -= Math.floor(wallX);
    // 翻轉以避免貼圖鏡像
    if ((side === 0 && cos > 0) || (side === 1 && sin < 0)) wallX = 1 - wallX;

    // zoneId：取光線方向中牆壁前一格的區域
    const prevMx = side === 0 ? hitMx - sX : hitMx;
    const prevMy = side === 0 ? hitMy : hitMy - sY;
    let zoneId = 0;
    if (prevMx >= 0 && prevMx < gW && prevMy >= 0 && prevMy < gH)
      zoneId = zoneMap[prevMy][prevMx];

    rays.push({ dist: perpDist, side, doorRoomIdx, wallX, zoneId });
  }
  return rays;
}

// ─────────────────────────────────────────────
//  地板/天花板渲染器（基於 ImageData）
// ─────────────────────────────────────────────
export function renderFloorCeiling(ctx, W, H, px, py, angle, zoneMap, gW, gH, textures, torchBright = 1) {
  const imgData = ctx.createImageData(W, H);
  const buf = imgData.data;

  const halfH = H / 2;
  const rayDirX0 = Math.cos(angle - FOV / 2);
  const rayDirY0 = Math.sin(angle - FOV / 2);
  const rayDirX1 = Math.cos(angle + FOV / 2);
  const rayDirY1 = Math.sin(angle + FOV / 2);

  for (let y = 0; y < H; y++) {
    const isFloor = y > halfH;
    const rowCenter = y - halfH;     // 正值在下方，負值在上方
    if (rowCenter === 0) continue;

    const rowDist = halfH / Math.abs(rowCenter);
    const stepX = rowDist * (rayDirX1 - rayDirX0) / W;
    const stepY = rowDist * (rayDirY1 - rayDirY0) / W;
    let floorX = px + rowDist * rayDirX0;
    let floorY = py + rowDist * rayDirY0;

    for (let x = 0; x < W; x++) {
      // 世界格子座標
      const cellX = Math.floor(floorX);
      const cellY = Math.floor(floorY);

      // 查詢此世界座標的區域
      let zoneId = 0;
      if (cellX >= 0 && cellX < gW && cellY >= 0 && cellY < gH)
        zoneId = zoneMap[cellY][cellX];

      const tz = textures[zoneId] || textures[0];
      const tex = isFloor ? tz?.floor : tz?.ceil;

      // 火把亮度（平方衰減 + 暖色調）
      const lit = getLit(rowDist, torchBright);
      const warmR = Math.min(1, lit * 1.25);
      const warmG = Math.min(1, lit * 1.0);
      const warmB = Math.min(1, lit * 0.6);

      let r, g, b;
      if (tex && tex.loaded) {
        const tx = Math.floor((floorX - cellX) * tex.w) & (tex.w - 1);
        const ty = Math.floor((floorY - cellY) * tex.h) & (tex.h - 1);
        const ti = (ty * tex.w + tx) * 4;
        r = Math.min(255, tex.data[ti]     * warmR) | 0;
        g = Math.min(255, tex.data[ti + 1] * warmG) | 0;
        b = Math.min(255, tex.data[ti + 2] * warmB) | 0;
      } else {
        // 每區域備用純色
        const roomTints = [
          null,            // 0 走廊：使用以下預設色
          [40, 30, 20],    // 房間 1：溫暖砂岩色
          [18, 28, 38],    // 房間 2：冷色板岩
          [35, 20, 35],    // 房間 3：紫色石材
          [20, 35, 20],    // 房間 4：苔蘚色
        ];
        const tint = roomTints[zoneId] || null;
        if (isFloor) {
          r = ((tint ? tint[0] : 20) * warmR) | 0;
          g = ((tint ? tint[1] : 20) * warmG) | 0;
          b = ((tint ? tint[2] : 20) * warmB) | 0;
        } else {
          r = ((tint ? Math.floor(tint[0] * 0.5) : 13) * warmR) | 0;
          g = ((tint ? Math.floor(tint[1] * 0.5) : 13) * warmG) | 0;
          b = ((tint ? Math.floor(tint[2] * 0.5) + 10 : 26) * warmB) | 0;
        }
      }

      const idx = (y * W + x) * 4;
      buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
      floorX += stepX; floorY += stepY;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// ─────────────────────────────────────────────
//  牆壁欄位渲染器（貼圖切片或平面填色）
// ─────────────────────────────────────────────
export function renderWalls(ctx, W, H, rays, textures, doors, torchBright = 1) {
  const sw = W / NUM_RAYS;
  for (let i = 0; i < NUM_RAYS; i++) {
    const { dist, side, doorRoomIdx, wallX, zoneId } = rays[i];
    const wh = Math.min(H * 3, H / Math.max(0.08, dist));
    const top = (H - wh) / 2;
    const dim = side === 1 ? 0.6 : 1.0;
    const sx = Math.floor(i * sw);
    const sw1 = Math.ceil(sw) + 1;

    // 火把亮度（平方衰減 × 側面暗係數）
    const lit = getLit(dist, torchBright) * dim;
    const darkAlpha = Math.min(0.97, 1 - lit);
    const warmAlpha = Math.max(0, (lit - AMBIENT) * 0.22);

    if (doorRoomIdx >= 0) {
      // 門：使用房間的門貼圖，或備用暖棕色平面填色
      const door = doors && doors[doorRoomIdx];
      const doorZoneId = door ? door.roomIdx + 1 : 0;
      const tz = textures[doorZoneId] || textures[0];
      const tex = tz?.door;
      if (tex && tex.loaded) {
        const tx = Math.floor(wallX * tex.w) & (tex.w - 1);
        ctx.drawImage(tex.canvas, tx, 0, 1, tex.h, sx, top, sw1, wh);
        if (warmAlpha > 0.01) { ctx.fillStyle = `rgba(255,130,40,${warmAlpha})`; ctx.fillRect(sx, top, sw1, wh); }
        if (darkAlpha > 0.01) { ctx.fillStyle = `rgba(0,0,0,${darkAlpha})`; ctx.fillRect(sx, top, sw1, wh); }
      } else {
        const bv = Math.max(5, (210 * lit) | 0);
        ctx.fillStyle = `rgb(${(bv * 0.75) | 0},${(bv * 0.45) | 0},${(bv * 0.15) | 0})`;
        ctx.fillRect(i * sw, top, sw + 0.5, wh);
      }
      continue;
    }

    const tz = textures[zoneId] || textures[0];
    const tex = tz?.wall;

    if (tex && tex.loaded) {
      const tx = Math.floor(wallX * tex.w) & (tex.w - 1);
      // 從貼圖繪製一條垂直條紋
      ctx.drawImage(tex.canvas, tx, 0, 1, tex.h, sx, top, sw1, wh);
      // 暖光疊加（橘黃色，近處可見）
      if (warmAlpha > 0.01) { ctx.fillStyle = `rgba(255,130,40,${warmAlpha})`; ctx.fillRect(sx, top, sw1, wh); }
      // 黑暗疊加（遠處變暗）
      if (darkAlpha > 0.01) { ctx.fillStyle = `rgba(0,0,0,${darkAlpha})`; ctx.fillRect(sx, top, sw1, wh); }
    } else {
      const bv = Math.max(5, (210 * lit) | 0);
      ctx.fillStyle = `rgb(${(bv * 0.4) | 0},${(bv * 0.38) | 0},${bv})`;
      ctx.fillRect(i * sw, top, sw + 0.5, wh);
    }
  }
}

// ─────────────────────────────────────────────
//  精靈 z-buffer（未修改）
// ─────────────────────────────────────────────
export function getSpriteInfo(wx, wy, px, py, angle, W, rays) {
  const dx = wx - px, dy = wy - py;
  let da = Math.atan2(dy, dx) - angle;
  while (da < -Math.PI) da += 2 * Math.PI; while (da > Math.PI) da -= 2 * Math.PI;
  if (Math.abs(da) > FOV / 2 + 0.3) return null;
  const dist = Math.sqrt(dx * dx + dy * dy); if (dist < 0.4) return null;
  const screenX = ((da / (FOV / 2)) + 1) / 2 * W;
  const sprW = Math.min(W * 0.55, W / dist);
  let visible = false;
  for (let x = Math.max(0, Math.floor(screenX - sprW / 2)); x <= Math.min(W - 1, Math.ceil(screenX + sprW / 2)); x += 3) {
    const col = Math.floor(x / W * NUM_RAYS);
    if (col >= 0 && col < rays.length && rays[col].dist > dist - 0.4) { visible = true; break; }
  }
  return visible ? { screenX, dist } : null;
}

// ─────────────────────────────────────────────
//  傳送門 / 事件繪製輔助函式（未修改）
// ─────────────────────────────────────────────
export function drawEntryArch(ctx, sx, dist, H) {
  const h = Math.min(H * 2.2, H / dist), top = (H - h) / 2, w = h * 0.55, a = Math.min(1, Math.max(0, 1 - dist / 18));
  ctx.fillStyle = `rgba(60,180,90,${a * 0.95})`;
  ctx.fillRect(sx - w / 2, top, w * 0.18, h); ctx.fillRect(sx + w / 2 - w * 0.18, top, w * 0.18, h); ctx.fillRect(sx - w / 2, top, w, h * 0.17);
  ctx.fillStyle = `rgba(60,255,120,${a * 0.25})`; ctx.fillRect(sx - w / 2 + w * 0.18, top + h * 0.17, w * 0.64, h * 0.83);
  ctx.fillStyle = `rgba(180,255,200,${a * 0.8})`;
  for (let k = 0; k < 4; k++) { const y = top + h * (0.22 + k * 0.18); ctx.fillRect(sx - w / 2 + w * 0.05, y, w * 0.08, h * 0.035); ctx.fillRect(sx + w / 2 - w * 0.13, y, w * 0.08, h * 0.035); }
  if (dist < 10) { ctx.save(); ctx.globalAlpha = a * Math.min(1, (10 - dist) / 6); ctx.fillStyle = "#afffbf"; ctx.font = `bold ${Math.max(9, h * 0.09) | 0}px monospace`; ctx.textAlign = "center"; ctx.fillText("ENTER", sx, top - 5); ctx.restore(); }
}
export function drawExitPortal(ctx, sx, dist, H, t) {
  const h = Math.min(H * 2.2, H / dist), top = (H - h) / 2, w = h * 0.55, a = Math.min(1, Math.max(0, 1 - dist / 18)), fl = 0.88 + Math.sin(t * 0.09) * 0.12;
  ctx.fillStyle = `rgba(60,15,5,${a * 0.98})`;
  ctx.fillRect(sx - w / 2, top, w * 0.17, h); ctx.fillRect(sx + w / 2 - w * 0.17, top, w * 0.17, h); ctx.fillRect(sx - w / 2, top, w, h * 0.17);
  ctx.fillStyle = `rgba(180,40,5,${a * 0.85 * fl})`; ctx.fillRect(sx - w / 2 + w * 0.17, top + h * 0.17, w * 0.66, h * 0.83);
  ctx.fillStyle = `rgba(230,100,20,${a * 0.65 * fl})`; ctx.fillRect(sx - w / 2 + w * 0.24, top + h * 0.23, w * 0.52, h * 0.72);
  ctx.fillStyle = `rgba(255,180,50,${a * 0.4 * fl})`; ctx.fillRect(sx - w / 2 + w * 0.32, top + h * 0.30, w * 0.36, h * 0.58);
  ctx.fillStyle = `rgba(255,240,180,${a * 0.18 * fl})`; ctx.fillRect(sx - w / 2 + w * 0.39, top + h * 0.37, w * 0.22, h * 0.44);
  ctx.fillStyle = `rgba(255,150,40,${a * 0.9})`;
  [0.12, 0.34, 0.56, 0.78].forEach(f => { const rr = Math.max(1.5, h * 0.028); ctx.beginPath(); ctx.arc(sx - w / 2 + w * 0.085, top + h * f, rr, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(sx + w / 2 - w * 0.085, top + h * f, rr, 0, Math.PI * 2); ctx.fill(); });
  if (dist < 10) { ctx.save(); ctx.globalAlpha = a * Math.min(1, (10 - dist) / 6); ctx.fillStyle = "#ffcc66"; ctx.font = `bold ${Math.max(9, h * 0.09) | 0}px monospace`; ctx.textAlign = "center"; ctx.fillText("EXIT", sx, top - 5); ctx.restore(); }
}
export function drawEventMarker(ctx, sx, dist, H, ev, t) {
  if (dist < 0.4) return;
  const h = Math.min(H * 1.6, H / dist) * 0.5, top = (H - h) / 2, r = Math.max(3, h * 0.18);
  const a = Math.min(1, Math.max(0, 1 - dist / 14)), pulse = 0.8 + Math.sin(t * 0.07) * 0.2;
  const colors = { message: "rgba(120,160,255", teleport: "rgba(200,80,255", door: "rgba(255,200,40", win: "rgba(80,220,120" };
  const base = colors[ev.type] || "rgba(200,200,200";
  ctx.fillStyle = `${base},${a * 0.85 * pulse})`; ctx.beginPath(); ctx.arc(sx, top + h / 2, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `${base},${a * 0.4 * pulse})`; ctx.beginPath(); ctx.arc(sx, top + h / 2, r * 1.6, 0, Math.PI * 2); ctx.fill();
  if (dist < 10) { ctx.save(); ctx.globalAlpha = a * Math.min(1, (10 - dist) / 6); ctx.fillStyle = "#fff"; ctx.font = `${Math.max(9, h * 0.25) | 0}px monospace`; ctx.textAlign = "center"; ctx.fillText(ev.icon || "?", sx, top + h / 2 + 4); ctx.restore(); }
}

// ─────────────────────────────────────────────
//  小地圖（未修改）
// ─────────────────────────────────────────────
export function drawMinimap(ctx, walls, cols, rows, px, py, angle, rooms, eCell, xCell, events, doors, torchBright = 1, grid = null) {
  const ox = 8, oy = 8, mW = cols * MM, mH = rows * MM;
  const gcx = ox + ((px - 1) / 2) * MM, gcy = oy + ((py - 1) / 2) * MM;

  // 背景框（不受能見遮罩影響）
  ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(ox - 3, oy - 3, mW + 6, mH + 6, 4); ctx.fill();

  // 能見範圍遮罩：光線追蹤可見多邊形（牆壁遮擋）
  const visGridR = TORCH_RADIUS * 0.8 * Math.max(0.5, torchBright); // grid 單位
  const NUM_VIS_RAYS = 120;
  ctx.save();
  ctx.beginPath();
  if (grid) {
    const gW = grid[0].length, gH = grid.length;
    const step = 0.25; // grid 單位步長
    let first = true;
    for (let i = 0; i < NUM_VIS_RAYS; i++) {
      const ra = (i / NUM_VIS_RAYS) * Math.PI * 2;
      const cos = Math.cos(ra), sin = Math.sin(ra);
      let hitX = px, hitY = py;
      for (let d = step; d <= visGridR; d += step) {
        const wx = px + cos * d, wy = py + sin * d;
        const gx = Math.floor(wx), gy = Math.floor(wy);
        if (gx < 0 || gx >= gW || gy < 0 || gy >= gH || grid[gy][gx] === 1) break;
        hitX = wx; hitY = wy;
      }
      const cx = ox + ((hitX - 1) / 2) * MM, cy = oy + ((hitY - 1) / 2) * MM;
      if (first) { ctx.moveTo(cx, cy); first = false; } else ctx.lineTo(cx, cy);
    }
    ctx.closePath();
  } else {
    // grid 未就緒時退回圓形
    ctx.arc(gcx, gcy, TORCH_RADIUS * 0.4 * MM * Math.max(0.5, torchBright), 0, Math.PI * 2);
  }
  ctx.clip();

  // 地板底色
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { ctx.fillStyle = "#1e1e1e"; ctx.fillRect(ox + c * MM, oy + r * MM, MM, MM); }
  // 房間填色
  for (const rm of rooms) { ctx.fillStyle = rm.fixed ? "rgba(216,90,48,0.45)" : "rgba(80,70,160,0.4)"; ctx.fillRect(ox + rm.c * MM, oy + rm.r * MM, rm.w * MM, rm.h * MM); }
  // 牆線
  ctx.lineWidth = 1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = ox + c * MM, y = oy + r * MM; ctx.strokeStyle = "#555";
    if (r === 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + MM, y); ctx.stroke(); }
    if (c === 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + MM); ctx.stroke(); }
    if (walls[r][c].right) { ctx.beginPath(); ctx.moveTo(x + MM, y); ctx.lineTo(x + MM, y + MM); ctx.stroke(); }
    if (walls[r][c].bottom) { ctx.beginPath(); ctx.moveTo(x, y + MM); ctx.lineTo(x + MM, y + MM); ctx.stroke(); }
  }
  // 門
  doors.forEach(door => {
    ctx.strokeStyle = door.closed ? "#e87" : "#4d4"; ctx.lineWidth = 2;
    if (door.side === 'bottom') { ctx.beginPath(); ctx.moveTo(ox + door.c * MM, oy + (door.r + 1) * MM); ctx.lineTo(ox + (door.c + 1) * MM, oy + (door.r + 1) * MM); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(ox + (door.c + 1) * MM, oy + door.r * MM); ctx.lineTo(ox + (door.c + 1) * MM, oy + (door.r + 1) * MM); ctx.stroke(); }
  });
  // 事件標記
  events.filter(ev => !ev.triggered || ev.repeatable).forEach(ev => {
    ctx.fillStyle = ev.roomLabel ? "rgba(255,180,80,0.9)" : "rgba(140,180,255,0.9)";
    ctx.beginPath(); ctx.arc(ox + ev.c * MM + MM / 2, oy + ev.r * MM + MM / 2, 2.5, 0, Math.PI * 2); ctx.fill();
  });
  // 入口 / 出口
  ctx.fillStyle = "rgba(50,210,90,0.95)"; ctx.fillRect(ox + eCell.c * MM + 1, oy + eCell.r * MM + 1, MM - 2, MM - 2);
  ctx.fillStyle = "rgba(230,100,20,0.95)"; ctx.fillRect(ox + xCell.c * MM + 1, oy + xCell.r * MM + 1, MM - 2, MM - 2);

  ctx.restore(); // 解除能見遮罩

  // 玩家（永遠可見）
  ctx.fillStyle = "#7F77DD"; ctx.beginPath(); ctx.arc(gcx, gcy, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#AFA9EC"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gcx, gcy); ctx.lineTo(gcx + Math.cos(angle) * 7, gcy + Math.sin(angle) * 7); ctx.stroke();
}
export function drawHUD(ctx, W, H, prompt) {
  if (!prompt) return;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  const tw = Math.max(160, prompt.length * 9 + 24);
  ctx.roundRect(W / 2 - tw / 2, H - 52, tw, 32, 6); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "13px monospace"; ctx.textAlign = "center"; ctx.fillText(prompt, W / 2, H - 30);
  ctx.restore();
}

// ─────────────────────────────────────────────
//  貼圖輔助函式
// ─────────────────────────────────────────────
// 將圖片檔載入 TexInfo 物件，供地板投射（ImageData）使用
