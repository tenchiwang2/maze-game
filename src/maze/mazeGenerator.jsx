// ─────────────────────────────────────────────
//  mazeGenerator.js
//
//  純粹的資料函式 — 不含 React、canvas 或 DOM
//  設計為可輕鬆替換的工廠模式：
//
//  generateMaze()   → { walls, rooms, doorPositions }
//  buildGrid()      → { grid, zoneMap, doorMap }
//  resolveEvents()  → Event[]
//  doorWorldPos()   → { wx, wy }
// ─────────────────────────────────────────────

export function generateMaze(cols, rows, fixedRooms = [], randomCount = 3, minRoom = 2, maxRoom = 4, defaultDoorCount = 2, defaultDoorOpen = true) {
  const rooms = [];
  function overlaps(a, b) {
    return !(a.c+a.w+1<b.c||b.c+b.w+1<a.c||a.r+a.h+1<b.r||b.r+b.h+1<a.r);
  }
  function inBounds(rm) {
    return rm.r>=1&&rm.c>=1&&rm.r+rm.h<=rows-1&&rm.c+rm.w<=cols-1;
  }
  fixedRooms.forEach((fm, oi) => {
    const rm = { ...fm, fixed:true, origIdx:oi };
    if (!inBounds(rm)||rooms.some(e=>overlaps(e,rm))) return;
    rooms.push(rm);
  });
  for (let i=0; i<800&&rooms.filter(r=>!r.fixed).length<randomCount; i++) {
    const rw=minRoom+Math.floor(Math.random()*(maxRoom-minRoom+1));
    const rh=minRoom+Math.floor(Math.random()*(maxRoom-minRoom+1));
    const rc=1+Math.floor(Math.random()*(cols-rw-2));
    const rr=1+Math.floor(Math.random()*(rows-rh-2));
    if (rc<0||rr<0||rc+rw>=cols||rr+rh>=rows) continue;
    const rm = { r:rr,c:rc,w:rw,h:rh,fixed:false };
    if (!rooms.some(e=>overlaps(e,rm))) rooms.push(rm);
  }
  const visited = Array.from({length:rows},()=>Array(cols).fill(false));
  const walls   = Array.from({length:rows},()=>Array.from({length:cols},()=>({right:true,bottom:true})));
  for (const rm of rooms)
    for (let r=rm.r; r<rm.r+rm.h; r++)
      for (let c=rm.c; c<rm.c+rm.w; c++) {
        visited[r][c]=true;
        if (c<rm.c+rm.w-1) walls[r][c].right=false;
        if (r<rm.r+rm.h-1) walls[r][c].bottom=false;
      }
  function carve(r,c) {
    visited[r][c]=true;
    [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
      .filter(([nr,nc])=>nr>=0&&nr<rows&&nc>=0&&nc<cols&&!visited[nr][nc])
      .sort(()=>Math.random()-0.5)
      .forEach(([nr,nc])=>{
        if (!visited[nr][nc]) {
          if      (nr===r-1) walls[nr][nc].bottom=false;
          else if (nr===r+1) walls[r][c].bottom=false;
          else if (nc===c-1) walls[nr][nc].right=false;
          else               walls[r][c].right=false;
          carve(nr,nc);
        }
      });
  }
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) if (!visited[r][c]) carve(r,c);

  const doorPositions = [];
  rooms.forEach((rm,ri)=>{
    const doors=[];
    for (let r=rm.r;r<rm.r+rm.h;r++)
      for (let c=rm.c;c<rm.c+rm.w;c++) {
        if (!(r===rm.r||r===rm.r+rm.h-1||c===rm.c||c===rm.c+rm.w-1)) continue;
        [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>{
          const nr=r+dr,nc=c+dc;
          if (nr<0||nr>=rows||nc<0||nc>=cols) return;
          const inRoom=nr>=rm.r&&nr<rm.r+rm.h&&nc>=rm.c&&nc<rm.c+rm.w;
          if (!inRoom) doors.push({r,c,dr,dc});
        });
      }
    doors.sort(()=>Math.random()-0.5);
    // 每個房間的覆寫設定，或沿用全域預設值
    const count    = rm.fixed && rm.doorCount   != null ? rm.doorCount   : defaultDoorCount;
    const defOpen  = rm.fixed && rm.defaultOpen != null ? rm.defaultOpen : defaultDoorOpen;
    for (let i=0;i<Math.min(count,doors.length);i++) {
      const {r,c,dr,dc}=doors[i];
      if      (dr===-1) { walls[r-1][c].bottom=false; doorPositions.push({r:r-1,c,side:'bottom',roomIdx:ri,defaultOpen:defOpen}); }
      else if (dr===1)  { walls[r][c].bottom=false;   doorPositions.push({r,c,  side:'bottom',roomIdx:ri,defaultOpen:defOpen}); }
      else if (dc===-1) { walls[r][c-1].right=false;  doorPositions.push({r,c:c-1,side:'right', roomIdx:ri,defaultOpen:defOpen}); }
      else              { walls[r][c].right=false;     doorPositions.push({r,c,  side:'right', roomIdx:ri,defaultOpen:defOpen}); }
    }
  });
  return { walls, rooms, doorPositions };
}

// ─────────────────────────────────────────────
//  格子建立器  +  zoneMap
// ─────────────────────────────────────────────
// zoneMap[gy][gx] = 區域 id：
//   0 = 走廊（預設貼圖）
//   N（1-based）= 固定房間 origIdx+1
//  -1 = 牆壁（無關緊要，但仍會設定）
export function buildGrid(walls, cols, rows, rooms = [], doors = []) {
  const W=2*cols+1, H=2*rows+1;
  const grid    = Array.from({length:H},()=>Array(W).fill(1));
  const zoneMap = Array.from({length:H},()=>Array(W).fill(0));
  const doorMap = {};

  for (let r=0;r<rows;r++)
    for (let c=0;c<cols;c++) {
      const gr=2*r+1,gc=2*c+1;
      grid[gr][gc]=0;
      if (!walls[r][c].bottom&&r<rows-1) grid[gr+1][gc]=0;
      if (!walls[r][c].right &&c<cols-1) grid[gr][gc+1]=0;
    }

  // 清除房間格子並標記區域
  for (const rm of rooms) {
    const zoneId = rm.fixed ? rm.origIdx+1 : 0;
    for (let gy=2*rm.r+1; gy<=2*(rm.r+rm.h)-1; gy++)
      for (let gx=2*rm.c+1; gx<=2*(rm.c+rm.w)-1; gx++)
        if (gy>=0&&gy<H&&gx>=0&&gx<W) {
          grid[gy][gx]=0;
          zoneMap[gy][gx]=zoneId;
        }
  }

  doors.forEach((door,idx)=>{
    const key = door.side==='bottom'
      ? `${2*door.r+2},${2*door.c+1}`
      : `${2*door.r+1},${2*door.c+2}`;
    doorMap[key]=idx;
    if (door.closed) {
      const [gy,gx]=key.split(',').map(Number);
      if (gy>=0&&gy<H&&gx>=0&&gx<W) grid[gy][gx]=1;
    }
  });

  return { grid, zoneMap, doorMap };
}

// ─────────────────────────────────────────────
//  光線投射器  – 現在也回傳 wallX 與 zoneId
// ─────────────────────────────────────────────
function castRays(grid, zoneMap, doorMap, px, py, angle, gW, gH) {
  const rays = [];
  for (let i=0; i<NUM_RAYS; i++) {
    const ra  = angle - FOV/2 + (FOV*i/NUM_RAYS);
    const cos = Math.cos(ra), sin = Math.sin(ra);
    let mx=Math.floor(px), my=Math.floor(py);
    const dX=Math.abs(1/cos), dY=Math.abs(1/sin);
    const sX=cos<0?-1:1, sY=sin<0?-1:1;
    let sdX=cos<0?(px-mx)*dX:(mx+1-px)*dX;
    let sdY=sin<0?(py-my)*dY:(my+1-py)*dY;
    let side=0, dist=24, doorRoomIdx=-1;
    let hitMx=mx, hitMy=my;
    for (let d=0; d<350; d++) {
      if (sdX<sdY) { sdX+=dX; mx+=sX; side=0; }
      else         { sdY+=dY; my+=sY; side=1; }
      if (mx<0||mx>=gW||my<0||my>=gH) { dist=24; break; }
      if (grid[my][mx]===1) {
        dist   = side===0 ? sdX-dX : sdY-dY;
        const dk = doorMap[`${my},${mx}`];
        doorRoomIdx = dk!=null ? dk : -1;
        hitMx=mx; hitMy=my;
        break;
      }
    }
    const perpDist = dist * Math.cos(ra-angle);

    // wallX：光線命中牆面的小數位置（0-1）
    let wallX;
    if (side===0) {
      wallX = py + perpDist*sin;
    } else {
      wallX = px + perpDist*cos;
    }
    wallX -= Math.floor(wallX);
    // 翻轉以避免貼圖鏡像
    if ((side===0&&cos>0)||(side===1&&sin<0)) wallX = 1-wallX;

    // zoneId：取光線方向中牆壁前一格的區域
    const prevMx = side===0 ? hitMx-sX : hitMx;
    const prevMy = side===0 ? hitMy    : hitMy-sY;
    let zoneId = 0;
    if (prevMx>=0&&prevMx<gW&&prevMy>=0&&prevMy<gH)
      zoneId = zoneMap[prevMy][prevMx];

    rays.push({ dist: perpDist, side, doorRoomIdx, wallX, zoneId });
  }
  return rays;
}

// ─────────────────────────────────────────────
//  地板/天花板渲染器（基於 ImageData）
// ─────────────────────────────────────────────
function renderFloorCeiling(ctx, W, H, px, py, angle, zoneMap, gW, gH, textures) {
  const imgData = ctx.createImageData(W, H);
  const buf     = imgData.data;

  const halfH = H / 2;
  const rayDirX0 = Math.cos(angle - FOV/2);
  const rayDirY0 = Math.sin(angle - FOV/2);
  const rayDirX1 = Math.cos(angle + FOV/2);
  const rayDirY1 = Math.sin(angle + FOV/2);

  for (let y = 0; y < H; y++) {
    const isFloor   = y > halfH;
    const rowCenter = y - halfH;     // positive below, negative above
    if (rowCenter === 0) continue;

    const rowDist = halfH / Math.abs(rowCenter);
    const stepX   = rowDist * (rayDirX1-rayDirX0) / W;
    const stepY   = rowDist * (rayDirY1-rayDirY0) / W;
    let floorX    = px + rowDist * rayDirX0;
    let floorY    = py + rowDist * rayDirY0;

    for (let x = 0; x < W; x++) {
      // 世界格子座標
      const cellX = Math.floor(floorX);
      const cellY = Math.floor(floorY);

      // 查詢此世界座標的區域
      let zoneId = 0;
      if (cellX>=0&&cellX<gW&&cellY>=0&&cellY<gH)
        zoneId = zoneMap[cellY][cellX];

      const tz = textures[zoneId] || textures[0];
      const tex = isFloor ? tz?.floor : tz?.ceil;

      let r,g,b;
      if (tex && tex.loaded) {
        const tx = Math.floor((floorX-cellX)*tex.w) & (tex.w-1);
        const ty = Math.floor((floorY-cellY)*tex.h) & (tex.h-1);
        const ti = (ty*tex.w+tx)*4;
        r=tex.data[ti]; g=tex.data[ti+1]; b=tex.data[ti+2];
        // 距離昏暗效果
        const shade = Math.max(0, 1-rowDist/18);
        r=(r*shade)|0; g=(g*shade)|0; b=(b*shade)|0;
      } else {
        // 每區域備用純色
        const shade = Math.max(0, 1-rowDist/18);
        // 區域 0 = 走廊；區域 1+ = 固定房間（各有獨特暖色調）
        const roomTints = [
          null,                    // 0 走廊：使用以下預設色
          [40,30,20],              // 房間 1：溫暖砂岩色
          [18,28,38],              // 房間 2：冷色板岩
          [35,20,35],              // 房間 3：紫色石材
          [20,35,20],              // 房間 4：苔蘚色
        ];
        const tint = roomTints[zoneId] || null;
        if (isFloor) {
          r=((tint?tint[0]:20)*shade)|0;
          g=((tint?tint[1]:20)*shade)|0;
          b=((tint?tint[2]:20)*shade)|0;
        } else {
          r=((tint?Math.floor(tint[0]*0.5):13)*shade)|0;
          g=((tint?Math.floor(tint[1]*0.5):13)*shade)|0;
          b=((tint?Math.floor(tint[2]*0.5)+10:26)*shade)|0;
        }
      }

      const idx = (y*W+x)*4;
      buf[idx]=r; buf[idx+1]=g; buf[idx+2]=b; buf[idx+3]=255;
      floorX+=stepX; floorY+=stepY;
    }
  }
  ctx.putImageData(imgData,0,0);
}

// ─────────────────────────────────────────────
//  牆壁欄位渲染器（貼圖切片或平面填色）
// ─────────────────────────────────────────────
function renderWalls(ctx, W, H, rays, textures, doors) {
  const sw = W / NUM_RAYS;
  for (let i=0; i<NUM_RAYS; i++) {
    const {dist, side, doorRoomIdx, wallX, zoneId} = rays[i];
    const wh  = Math.min(H*3, H/Math.max(0.08,dist));
    const top = (H-wh)/2;
    const dim = side===1 ? 0.6 : 1.0;

    if (doorRoomIdx >= 0) {
      // 門：使用房間的門貼圖，或備用暖棕色平面填色
      const door = doors && doors[doorRoomIdx];
      const doorZoneId = door ? door.roomIdx + 1 : 0;
      const tz  = textures[doorZoneId] || textures[0];
      const tex = tz?.door;
      if (tex && tex.loaded) {
        const tx = Math.floor(wallX * tex.w) & (tex.w - 1);
        ctx.drawImage(tex.canvas, tx, 0, 1, tex.h, Math.floor(i*sw), top, Math.ceil(sw)+1, wh);
        const alpha = Math.min(0.72, (1-dim)*0.45 + dist*0.032);
        if (alpha > 0.01) { ctx.fillStyle=`rgba(0,0,0,${alpha})`; ctx.fillRect(Math.floor(i*sw), top, Math.ceil(sw)+1, wh); }
      } else {
        const b = (Math.max(15, 230-dist*13)*dim)|0;
        ctx.fillStyle = `rgb(${(b*0.75)|0},${(b*0.45)|0},${(b*0.15)|0})`;
        ctx.fillRect(i*sw, top, sw+0.5, wh);
      }
      continue;
    }

    const tz  = textures[zoneId] || textures[0];
    const tex = tz?.wall;

    if (tex && tex.loaded) {
      const tx = Math.floor(wallX * tex.w) & (tex.w-1);
      // 從貼圖繪製一條垂直條紋
      ctx.drawImage(
        tex.canvas,
        tx, 0, 1, tex.h,
        Math.floor(i*sw), top, Math.ceil(sw)+1, wh
      );
      // 距離與側面昏暗疊加
      if (dim < 1 || dist > 2) {
        const alpha = Math.min(0.75, (1-dim)*0.4 + dist*0.035);
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(Math.floor(i*sw), top, Math.ceil(sw)+1, wh);
      }
    } else {
      const b = Math.max(15, 230-dist*13), bd = (b*dim)|0;
      ctx.fillStyle = `rgb(${(bd*0.4)|0},${(bd*0.38)|0},${bd})`;
      ctx.fillRect(i*sw, top, sw+0.5, wh);
    }
  }
}

// ─────────────────────────────────────────────
//  精靈 z-buffer（未修改）
// ─────────────────────────────────────────────
function getSpriteInfo(wx, wy, px, py, angle, W, rays) {
  const dx=wx-px, dy=wy-py;
  let da = Math.atan2(dy,dx)-angle;
  while (da<-Math.PI) da+=2*Math.PI; while (da>Math.PI) da-=2*Math.PI;
  if (Math.abs(da)>FOV/2+0.3) return null;
  const dist=Math.sqrt(dx*dx+dy*dy); if (dist<0.4) return null;
  const screenX=((da/(FOV/2))+1)/2*W;
  const sprW=Math.min(W*0.55, W/dist);
  let visible=false;
  for (let x=Math.max(0,Math.floor(screenX-sprW/2)); x<=Math.min(W-1,Math.ceil(screenX+sprW/2)); x+=3) {
    const col=Math.floor(x/W*NUM_RAYS);
    if (col>=0&&col<rays.length&&rays[col].dist>dist-0.4) { visible=true; break; }
  }
  return visible ? { screenX, dist } : null;
}

// ─────────────────────────────────────────────
//  傳送門 / 事件繪製輔助函式（未修改）
// ─────────────────────────────────────────────
function drawEntryArch(ctx,sx,dist,H){
  const h=Math.min(H*2.2,H/dist),top=(H-h)/2,w=h*0.55,a=Math.min(1,Math.max(0,1-dist/18));
  ctx.fillStyle=`rgba(60,180,90,${a*0.95})`;
  ctx.fillRect(sx-w/2,top,w*0.18,h);ctx.fillRect(sx+w/2-w*0.18,top,w*0.18,h);ctx.fillRect(sx-w/2,top,w,h*0.17);
  ctx.fillStyle=`rgba(60,255,120,${a*0.25})`;ctx.fillRect(sx-w/2+w*0.18,top+h*0.17,w*0.64,h*0.83);
  ctx.fillStyle=`rgba(180,255,200,${a*0.8})`;
  for(let k=0;k<4;k++){const y=top+h*(0.22+k*0.18);ctx.fillRect(sx-w/2+w*0.05,y,w*0.08,h*0.035);ctx.fillRect(sx+w/2-w*0.13,y,w*0.08,h*0.035);}
  if(dist<10){ctx.save();ctx.globalAlpha=a*Math.min(1,(10-dist)/6);ctx.fillStyle="#afffbf";ctx.font=`bold ${Math.max(9,h*0.09)|0}px monospace`;ctx.textAlign="center";ctx.fillText("ENTER",sx,top-5);ctx.restore();}
}
function drawExitPortal(ctx,sx,dist,H,t){
  const h=Math.min(H*2.2,H/dist),top=(H-h)/2,w=h*0.55,a=Math.min(1,Math.max(0,1-dist/18)),fl=0.88+Math.sin(t*0.09)*0.12;
  ctx.fillStyle=`rgba(60,15,5,${a*0.98})`;
  ctx.fillRect(sx-w/2,top,w*0.17,h);ctx.fillRect(sx+w/2-w*0.17,top,w*0.17,h);ctx.fillRect(sx-w/2,top,w,h*0.17);
  ctx.fillStyle=`rgba(180,40,5,${a*0.85*fl})`;ctx.fillRect(sx-w/2+w*0.17,top+h*0.17,w*0.66,h*0.83);
  ctx.fillStyle=`rgba(230,100,20,${a*0.65*fl})`;ctx.fillRect(sx-w/2+w*0.24,top+h*0.23,w*0.52,h*0.72);
  ctx.fillStyle=`rgba(255,180,50,${a*0.4*fl})`;ctx.fillRect(sx-w/2+w*0.32,top+h*0.30,w*0.36,h*0.58);
  ctx.fillStyle=`rgba(255,240,180,${a*0.18*fl})`;ctx.fillRect(sx-w/2+w*0.39,top+h*0.37,w*0.22,h*0.44);
  ctx.fillStyle=`rgba(255,150,40,${a*0.9})`;
  [0.12,0.34,0.56,0.78].forEach(f=>{const rr=Math.max(1.5,h*0.028);ctx.beginPath();ctx.arc(sx-w/2+w*0.085,top+h*f,rr,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(sx+w/2-w*0.085,top+h*f,rr,0,Math.PI*2);ctx.fill();});
  if(dist<10){ctx.save();ctx.globalAlpha=a*Math.min(1,(10-dist)/6);ctx.fillStyle="#ffcc66";ctx.font=`bold ${Math.max(9,h*0.09)|0}px monospace`;ctx.textAlign="center";ctx.fillText("EXIT",sx,top-5);ctx.restore();}
}
function drawEventMarker(ctx,sx,dist,H,ev,t){
  if(dist<0.4)return;
  const h=Math.min(H*1.6,H/dist)*0.5,top=(H-h)/2,r=Math.max(3,h*0.18);
  const a=Math.min(1,Math.max(0,1-dist/14)),pulse=0.8+Math.sin(t*0.07)*0.2;
  const colors={message:"rgba(120,160,255",teleport:"rgba(200,80,255",door:"rgba(255,200,40",win:"rgba(80,220,120"};
  const base=colors[ev.type]||"rgba(200,200,200";
  ctx.fillStyle=`${base},${a*0.85*pulse})`;ctx.beginPath();ctx.arc(sx,top+h/2,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=`${base},${a*0.4*pulse})`;ctx.beginPath();ctx.arc(sx,top+h/2,r*1.6,0,Math.PI*2);ctx.fill();
  if(dist<10){ctx.save();ctx.globalAlpha=a*Math.min(1,(10-dist)/6);ctx.fillStyle="#fff";ctx.font=`${Math.max(9,h*0.25)|0}px monospace`;ctx.textAlign="center";ctx.fillText(ev.icon||"?",sx,top+h/2+4);ctx.restore();}
}

// ─────────────────────────────────────────────
//  小地圖（未修改）
// ─────────────────────────────────────────────
const MM=5;
function drawMinimap(ctx,walls,cols,rows,px,py,angle,rooms,eCell,xCell,events,doors){
  const ox=8,oy=8,mW=cols*MM,mH=rows*MM;
  ctx.fillStyle="rgba(0,0,0,0.7)";ctx.beginPath();ctx.roundRect(ox-3,oy-3,mW+6,mH+6,4);ctx.fill();
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){ctx.fillStyle="#1e1e1e";ctx.fillRect(ox+c*MM,oy+r*MM,MM,MM);}
  for(const rm of rooms){ctx.fillStyle=rm.fixed?"rgba(216,90,48,0.45)":"rgba(80,70,160,0.4)";ctx.fillRect(ox+rm.c*MM,oy+rm.r*MM,rm.w*MM,rm.h*MM);}
  ctx.lineWidth=1;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const x=ox+c*MM,y=oy+r*MM;ctx.strokeStyle="#555";
    if(r===0){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+MM,y);ctx.stroke();}
    if(c===0){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+MM);ctx.stroke();}
    if(walls[r][c].right){ctx.beginPath();ctx.moveTo(x+MM,y);ctx.lineTo(x+MM,y+MM);ctx.stroke();}
    if(walls[r][c].bottom){ctx.beginPath();ctx.moveTo(x,y+MM);ctx.lineTo(x+MM,y+MM);ctx.stroke();}
  }
  doors.forEach(door=>{
    ctx.strokeStyle=door.closed?"#e87":"#4d4";ctx.lineWidth=2;
    if(door.side==='bottom'){ctx.beginPath();ctx.moveTo(ox+door.c*MM,oy+(door.r+1)*MM);ctx.lineTo(ox+(door.c+1)*MM,oy+(door.r+1)*MM);ctx.stroke();}
    else{ctx.beginPath();ctx.moveTo(ox+(door.c+1)*MM,oy+door.r*MM);ctx.lineTo(ox+(door.c+1)*MM,oy+(door.r+1)*MM);ctx.stroke();}
  });
  events.filter(ev=>!ev.triggered||ev.repeatable).forEach(ev=>{
    ctx.fillStyle=ev.roomLabel?"rgba(255,180,80,0.9)":"rgba(140,180,255,0.9)";
    ctx.beginPath();ctx.arc(ox+ev.c*MM+MM/2,oy+ev.r*MM+MM/2,2.5,0,Math.PI*2);ctx.fill();
  });
  ctx.fillStyle="rgba(50,210,90,0.95)";ctx.fillRect(ox+eCell.c*MM+1,oy+eCell.r*MM+1,MM-2,MM-2);
  ctx.fillStyle="rgba(230,100,20,0.95)";ctx.fillRect(ox+xCell.c*MM+1,oy+xCell.r*MM+1,MM-2,MM-2);
  const gcx=ox+((px-1)/2)*MM,gcy=oy+((py-1)/2)*MM;
  ctx.fillStyle="#7F77DD";ctx.beginPath();ctx.arc(gcx,gcy,3,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#AFA9EC";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(gcx,gcy);ctx.lineTo(gcx+Math.cos(angle)*7,gcy+Math.sin(angle)*7);ctx.stroke();
}
function drawHUD(ctx,W,H,prompt){
  if(!prompt)return;
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,0.55)";
  const tw=Math.max(160,prompt.length*9+24);
  ctx.roundRect(W/2-tw/2,H-52,tw,32,6);ctx.fill();
  ctx.fillStyle="#fff";ctx.font="13px monospace";ctx.textAlign="center";ctx.fillText(prompt,W/2,H-30);
  ctx.restore();
}

// ─────────────────────────────────────────────
//  貼圖輔助函式
// ─────────────────────────────────────────────
// 將圖片檔載入 TexInfo 物件，供地板投射（ImageData）使用
// 並建立獨立的離屏 canvas 供牆面切片（drawImage）使用
function loadTexture(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth  || TEX_W;
        const h = img.naturalHeight || TEX_H;
        // 用於 drawImage 牆面切片的離屏 canvas
        const oc = document.createElement('canvas');
        oc.width=w; oc.height=h;
        const octx = oc.getContext('2d');
        octx.drawImage(img,0,0);
        // 用於地板投射的像素陣列
        const id   = octx.getImageData(0,0,w,h);
        resolve({ loaded:true, canvas:oc, data:id.data, w, h, src:e.target.result });
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
      display:"flex", flexDirection:"column", alignItems:"center", gap:4,
      cursor:"pointer", width:64,
    }}>
      <div style={{
        width:60, height:60, border:"0.5px solid var(--color-border-secondary)",
        borderRadius:"var(--border-radius-md)", overflow:"hidden",
        background:"var(--color-background-secondary)",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {texInfo?.src
          ? <img src={texInfo.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          : <span style={{fontSize:20,color:"var(--color-text-tertiary)"}}>+</span>
        }
      </div>
      <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{label}</span>
      <input type="file" accept="image/*" style={{display:"none"}}
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
      display:"flex", alignItems:"center", gap:8, padding:"8px 0",
      borderBottom:"0.5px solid var(--color-border-tertiary)",
    }}>
      <div style={{width:4,height:36,borderRadius:2,background:accent||"#888",flexShrink:0}}/>
      <span style={{fontSize:12,color:"var(--color-text-secondary)",minWidth:68,lineHeight:1.3}}>{label}</span>
      <TexUpload label="牆壁"   texInfo={zone?.wall}  onLoad={t => onChange({...zone, wall:t})} />
      <TexUpload label="天花板" texInfo={zone?.ceil}  onLoad={t => onChange({...zone, ceil:t})} />
      <TexUpload label="地板"   texInfo={zone?.floor} onLoad={t => onChange({...zone, floor:t})} />
      {showDoor && (
        <TexUpload label="房間門" texInfo={zone?.door} onLoad={t => onChange({...zone, door:t})} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  解析事件輔助函式
// ─────────────────────────────────────────────
export function resolveEvents(rooms, fixedRms, globalEvCfg) {
  const out=[];
  fixedRms.forEach((fm,rIdx)=>{
    const placed=rooms.find(r=>r.fixed&&r.origIdx===rIdx);
    if (!placed) return;
    (fm.events||[]).forEach(ev=>{
      let destR=ev.destR, destC=ev.destC;
      if (ev.destRoomIdx!=null) {
        const dp=rooms.find(r=>r.fixed&&r.origIdx===ev.destRoomIdx);
        if (dp) { destR=dp.r+(ev.destDr||0); destC=dp.c+(ev.destDc||0); }
      }
      out.push({...ev, r:placed.r+ev.dr, c:placed.c+ev.dc, triggered:false, roomLabel:`房間${rIdx+1}`, destR, destC});
    });
  });
  globalEvCfg.forEach(ev=>out.push({...ev, triggered:false}));
  return out;
}


// ─────────────────────────────────────────────
//  門的世界座標位置輔助函式
// ─────────────────────────────────────────────
/**
 * 回傳門的世界座標中心點，供鄰近偵測 / 互動判定使用。
 * @param {{ side: string, r: number, c: number }} door
 * @returns {{ wx: number, wy: number }}
 */
export function doorWorldPos(door) {
  if (door.side === 'bottom')
    return { wx: 2*door.c + 2,         wy: 2*(door.r + 1) + 0.5 };
  return   { wx: 2*(door.c + 1) + 0.5, wy: 2*door.r + 2 };
}
