// ─────────────────────────────────────────────
//  adventurers.js
//  初始冒險者定義（6位可選角色）
//  玩家在 Debug 面板中切換主控角色
// ─────────────────────────────────────────────
import { createAdventurer } from './adventurerState.js';

// 亞薩王都起點座標（wx:36, wy:24）
const HOME_WX = 36;
const HOME_WY = 24;

// ─────────────────────────────────────────────
//  ADVENTURER_DEFS — 原始定義（不含 runtime 狀態）
//  傳入 createAdventurer() 產生完整狀態物件
// ─────────────────────────────────────────────
export const ADVENTURER_DEFS = [
  {
    id:         'adv_kai',
    name:       '凱',
    className:  'mage',
    portrait:   '🧙',
    isPlayer:   true,   // 預設玩家角色
    homeWX:     HOME_WX,
    homeWY:     HOME_WY,
    homeTownId: 'capital_ys',
    startGold:  60,
    startItems: [
      { itemId: 'health_potion', qty: 2 },
      { itemId: 'mp_potion',     qty: 2 },
    ],
    lore: '來自遙遠的魔法學院，為了尋找失散的師父而踏上旅途。精通火系與冰系魔法，但體質虛弱。',
  },
  {
    id:         'adv_lea',
    name:       '蕾雅',
    className:  'warrior',
    portrait:   '⚔️',
    isPlayer:   false,
    homeWX:     HOME_WX + 1,
    homeWY:     HOME_WY,
    homeTownId: 'capital_ys',
    startGold:  100,
    startItems: [
      { itemId: 'health_potion', qty: 3 },
    ],
    lore: '前王都近衛騎士，因一次失敗的任務被解職。她獨自浪跡，試圖重拾榮耀。',
  },
  {
    id:         'adv_axe',
    name:       '阿修',
    className:  'archer',
    portrait:   '🏹',
    isPlayer:   false,
    homeWX:     HOME_WX - 1,
    homeWY:     HOME_WY + 1,
    homeTownId: 'capital_ys',
    startGold:  75,
    startItems: [
      { itemId: 'health_potion', qty: 2 },
      { itemId: 'torch',         qty: 2 },
    ],
    lore: '出身山地部落的獵人，以神準箭術聞名。為了讓家族從乾旱中活下去，深入地城尋找傳說中的聖泉地圖。',
  },
  {
    id:         'adv_thor',
    name:       '托爾',
    className:  'heavy',
    portrait:   '🛡️',
    isPlayer:   false,
    homeWX:     HOME_WX,
    homeWY:     HOME_WY - 1,
    homeTownId: 'capital_ys',
    startGold:  120,
    startItems: [
      { itemId: 'health_potion', qty: 4 },
    ],
    lore: '雪域聯盟最強的重甲武士，因王位繼承紛爭被流放。他誓言以雙手奪回自己應得的一切。',
  },
  {
    id:         'adv_shay',
    name:       '夏依',
    className:  'assassin',
    portrait:   '🗡️',
    isPlayer:   false,
    homeWX:     HOME_WX + 2,
    homeWY:     HOME_WY + 1,
    homeTownId: 'capital_ys',
    startGold:  90,
    startItems: [
      { itemId: 'health_potion', qty: 2 },
      { itemId: 'mp_potion',     qty: 1 },
    ],
    lore: '影刃公會的前成員，因拒絕刺殺無辜平民而遭到追殺。她以速度與詭計在黑暗中求生。',
  },
  {
    id:         'adv_ivy',
    name:       '艾薇',
    className:  'healer',
    portrait:   '✨',
    isPlayer:   false,
    homeWX:     HOME_WX - 1,
    homeWY:     HOME_WY - 1,
    homeTownId: 'capital_ys',
    startGold:  70,
    startItems: [
      { itemId: 'health_potion', qty: 3 },
      { itemId: 'mp_potion',     qty: 3 },
    ],
    lore: '神殿修女，因見到神靈的啟示而離開聖職。她的回復魔法超乎尋常，但自身卻時常受傷。',
  },
];

// ─────────────────────────────────────────────
//  初始化所有冒險者的 runtime 狀態
//  回傳 { [id]: adventurerState }
// ─────────────────────────────────────────────
export function initAdventurers() {
  const map = {};
  for (const def of ADVENTURER_DEFS) {
    map[def.id] = createAdventurer(def);
  }
  return map;
}

// ─────────────────────────────────────────────
//  getDefaultActiveId() — 預設玩家角色 ID
// ─────────────────────────────────────────────
export const DEFAULT_ACTIVE_ID = ADVENTURER_DEFS.find(d => d.isPlayer)?.id ?? 'adv_kai';
