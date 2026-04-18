// ─────────────────────────────────────────────
//  defaults.js
//
//  預設關卡資料與 UI 選項常數
//  替換此檔案即可建立不同的關卡
// ─────────────────────────────────────────────

export const DEFAULT_FIXED = [
  { r:1,  c:1,  w:4, h:3, events:[
    { id:"f0a", dr:1, dc:1, type:"message",  text:"入口大廳", icon:"!", repeatable:false },
    { id:"f0b", dr:1, dc:2, type:"teleport", text:"傳送至房間 2", icon:"*", repeatable:true, destRoomIdx:1, destDr:1, destDc:1 },
  ]},
  { r:1,  c:10, w:4, h:3, events:[
    { id:"f1a", dr:1, dc:1, type:"message", text:"符文房間", icon:"?", repeatable:false },
  ]},
  { r:12, c:5,  w:5, h:4, events:[
    { id:"f2a", dr:1, dc:1, type:"message", text:"大廳祭壇", icon:"!", repeatable:false },
    { id:"f2b", dr:2, dc:3, type:"win",     text:"找到寶藏！", icon:"★", repeatable:false },
  ]},
];
export const DEFAULT_GLOBAL = [
  { id:"g0", r:8, c:4, type:"teleport", text:"走廊傳送陣", icon:"*", repeatable:true, triggered:false, destR:2, destC:12 },
  { id:"g1", r:14, c:2, type:"message", text:"古老石碑", icon:"!", repeatable:false, triggered:false },
];
export const EVENT_TYPES = ["message","teleport","door","win","npc","shop","combat","chest","town_gate"];
export const EVENT_ICONS = { message:"!", teleport:"*", door:"D", win:"★", npc:"@", shop:"$", combat:"!", chest:"T", town_gate:"G" };

// ─────────────────────────────────────────────
//  主元件
