import { FOV, NUM_RAYS, MM } from './constants.js';

// ─────────────────────────────────────────────
//  renderer.js
//
//  All Canvas 2D drawing and raycasting.
//  No React. No maze-generation logic.
//
//  Exports:
//    castRays()            – DDA raycaster
//    renderFloorCeiling()  – floor casting (ImageData)
//    renderWalls()         – texture column slicing
//    getSpriteInfo()       – sprite z-buffer test
//    drawEntryArch()       – entry portal sprite
//    drawExitPortal()      – exit portal sprite
//    drawEventMarker()     – in-world event dot
//    drawMinimap()         – overlay minimap
//    drawHUD()             – door-interaction prompt
// ─────────────────────────────────────────────

export function castRays(grid, zoneMap, doorMap, px, py, angle, gW, gH) {
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

    // wallX: fractional hit position along the wall face (0-1)
    let wallX;
    if (side===0) {
      wallX = py + perpDist*sin;
    } else {
      wallX = px + perpDist*cos;
    }
    wallX -= Math.floor(wallX);
    // flip so textures aren't mirrored
    if ((side===0&&cos>0)||(side===1&&sin<0)) wallX = 1-wallX;

    // zoneId: look at the cell just before the wall in ray direction
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
//  Floor/ceiling caster  (ImageData-based)
// ─────────────────────────────────────────────
export function renderFloorCeiling(ctx, W, H, px, py, angle, zoneMap, gW, gH, textures) {
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
      // world cell
      const cellX = Math.floor(floorX);
      const cellY = Math.floor(floorY);

      // lookup zone at this world coord
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
        // distance darkening
        const shade = Math.max(0, 1-rowDist/18);
        r=(r*shade)|0; g=(g*shade)|0; b=(b*shade)|0;
      } else {
        // per-zone fallback solid colour
        const shade = Math.max(0, 1-rowDist/18);
        // zone 0 = corridor; zones 1+ = fixed rooms (each gets a distinct warm tint)
        const roomTints = [
          null,                    // 0 corridor: use default below
          [40,30,20],              // room 1: warm sandstone
          [18,28,38],              // room 2: cool slate
          [35,20,35],              // room 3: purple stone
          [20,35,20],              // room 4: mossy
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
//  Wall column renderer  (texture slice or flat)
// ─────────────────────────────────────────────
export function renderWalls(ctx, W, H, rays, textures, doors) {
  const sw = W / NUM_RAYS;
  for (let i=0; i<NUM_RAYS; i++) {
    const {dist, side, doorRoomIdx, wallX, zoneId} = rays[i];
    const wh  = Math.min(H*3, H/Math.max(0.08,dist));
    const top = (H-wh)/2;
    const dim = side===1 ? 0.6 : 1.0;

    if (doorRoomIdx >= 0) {
      // door: use the room's door texture, or fallback to warm brown flat colour
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
      // draw one vertical strip from the texture
      ctx.drawImage(
        tex.canvas,
        tx, 0, 1, tex.h,
        Math.floor(i*sw), top, Math.ceil(sw)+1, wh
      );
      // distance + side darkening overlay
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
//  Sprite z-buffer  (unchanged)
// ─────────────────────────────────────────────
export function getSpriteInfo(wx, wy, px, py, angle, W, rays) {
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
//  Portal / event draw helpers  (unchanged)
// ─────────────────────────────────────────────
export function drawEntryArch(ctx,sx,dist,H){
  const h=Math.min(H*2.2,H/dist),top=(H-h)/2,w=h*0.55,a=Math.min(1,Math.max(0,1-dist/18));
  ctx.fillStyle=`rgba(60,180,90,${a*0.95})`;
  ctx.fillRect(sx-w/2,top,w*0.18,h);ctx.fillRect(sx+w/2-w*0.18,top,w*0.18,h);ctx.fillRect(sx-w/2,top,w,h*0.17);
  ctx.fillStyle=`rgba(60,255,120,${a*0.25})`;ctx.fillRect(sx-w/2+w*0.18,top+h*0.17,w*0.64,h*0.83);
  ctx.fillStyle=`rgba(180,255,200,${a*0.8})`;
  for(let k=0;k<4;k++){const y=top+h*(0.22+k*0.18);ctx.fillRect(sx-w/2+w*0.05,y,w*0.08,h*0.035);ctx.fillRect(sx+w/2-w*0.13,y,w*0.08,h*0.035);}
  if(dist<10){ctx.save();ctx.globalAlpha=a*Math.min(1,(10-dist)/6);ctx.fillStyle="#afffbf";ctx.font=`bold ${Math.max(9,h*0.09)|0}px monospace`;ctx.textAlign="center";ctx.fillText("ENTER",sx,top-5);ctx.restore();}
}
export function drawExitPortal(ctx,sx,dist,H,t){
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
export function drawEventMarker(ctx,sx,dist,H,ev,t){
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
//  Minimap  (unchanged)
// ─────────────────────────────────────────────
export function drawMinimap(ctx,walls,cols,rows,px,py,angle,rooms,eCell,xCell,events,doors){
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
export function drawHUD(ctx,W,H,prompt){
  if(!prompt)return;
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,0.55)";
  const tw=Math.max(160,prompt.length*9+24);
  ctx.roundRect(W/2-tw/2,H-52,tw,32,6);ctx.fill();
  ctx.fillStyle="#fff";ctx.font="13px monospace";ctx.textAlign="center";ctx.fillText(prompt,W/2,H-30);
  ctx.restore();
}

// ─────────────────────────────────────────────
//  Texture helpers
// ─────────────────────────────────────────────
// Load an image file into a TexInfo object for floor casting (ImageData)
