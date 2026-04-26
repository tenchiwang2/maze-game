// ─────────────────────────────────────────────
//  reputationSystem.js
//  善惡質（Karma）+ 各國名聲（Reputation）系統
//  純函數模組，不含 React
// ─────────────────────────────────────────────

// ── 國家定義 ──────────────────────────────────
export const NATIONS = ['ys', 'desert', 'snow'];

export const NATION_LABELS = {
  ys:     '亞薩王國',
  desert: '沙漠帝國',
  snow:   '雪域聯盟',
};

export const NATION_COLORS = {
  ys:     '#6699ff',
  desert: '#ddaa44',
  snow:   '#88ddff',
};

// 供 nationLabel 字串反查 nation key
export const NATION_LABEL_TO_KEY = {
  '亞薩王國': 'ys',
  '沙漠帝國': 'desert',
  '雪域聯盟': 'snow',
};

// ── 善惡質門檻（由高至低排列）────────────────
export const KARMA_LEVELS = [
  { min:  800, label: '聖人',   color: '#ffd700', icon: '✨' },
  { min:  400, label: '英雄',   color: '#88ff88', icon: '🏅' },
  { min:  100, label: '善良',   color: '#66dd66', icon: '😊' },
  { min:  -99, label: '中立',   color: '#aaaaaa', icon: '😐' },
  { min: -399, label: '惡劣',   color: '#ffaa44', icon: '😒' },
  { min: -799, label: '惡徒',   color: '#ff5555', icon: '💀' },
  { min:-1000, label: '惡魔',   color: '#cc0000', icon: '😡' },
];

// ── 名聲門檻（由高至低排列）──────────────────
//  priceMultiplier: 該國商店對玩家的價格係數
//  guardsHostile:   通緝狀態，衛兵主動攻擊
export const REP_LEVELS = [
  { min:  600, label: '國家英雄', color: '#ffd700', priceMultiplier: 0.85, guardsHostile: false },
  { min:  200, label: '受人尊敬', color: '#88ff88', priceMultiplier: 0.95, guardsHostile: false },
  { min: -199, label: '路人',     color: '#aaaaaa', priceMultiplier: 1.00, guardsHostile: false },
  { min: -599, label: '可疑人士', color: '#ffaa44', priceMultiplier: 1.05, guardsHostile: false },
  { min:-1000, label: '全國通緝', color: '#ff4444', priceMultiplier: 1.10, guardsHostile: true  },
];

// ─────────────────────────────────────────────
//  查詢工具
// ─────────────────────────────────────────────
export function getKarmaInfo(karma) {
  for (const level of KARMA_LEVELS) {
    if (karma >= level.min) return level;
  }
  return KARMA_LEVELS[KARMA_LEVELS.length - 1];
}

export function getRepInfo(rep) {
  for (const level of REP_LEVELS) {
    if (rep >= level.min) return level;
  }
  return REP_LEVELS[REP_LEVELS.length - 1];
}

// ─────────────────────────────────────────────
//  數值調整（直接修改 player 物件）
// ─────────────────────────────────────────────
export function adjustKarma(player, delta) {
  if (!delta) return;
  player.karma = Math.max(-1000, Math.min(1000, (player.karma ?? 0) + delta));
}

export function adjustReputation(player, nation, delta) {
  if (!nation || !delta) return;
  if (!player.reputation) player.reputation = { ys: 0, desert: 0, snow: 0 };
  const cur = player.reputation[nation] ?? 0;
  player.reputation[nation] = Math.max(-1000, Math.min(1000, cur + delta));
}

// ─────────────────────────────────────────────
//  任務完成時套用道德 / 名聲獎勵
// ─────────────────────────────────────────────
export function applyQuestMoralRewards(player, questDef) {
  if (questDef.karmaReward)      adjustKarma(player, questDef.karmaReward);
  if (questDef.reputationReward) {
    adjustReputation(player, questDef.reputationReward.nation, questDef.reputationReward.amount);
  }
}

// ─────────────────────────────────────────────
//  NPC 被擊殺時的道德 / 名聲變化
//  npc 需包含 { alignment, nation }
// ─────────────────────────────────────────────
export function applyNPCKillMoral(player, npc) {
  if (!npc) return;
  switch (npc.alignment) {
    case 'hostile':
      adjustKarma(player, +8);
      if (npc.nation) adjustReputation(player, npc.nation, +5);
      break;
    case 'neutral':
      adjustKarma(player, -20);
      if (npc.nation) adjustReputation(player, npc.nation, -30);
      break;
    case 'friendly':
    default:
      adjustKarma(player, -50);
      if (npc.nation) adjustReputation(player, npc.nation, -80);
      break;
  }
}

// ─────────────────────────────────────────────
//  取得商店對玩家的價格乘數
//  nation = 商店所在城鎮的國家 key
// ─────────────────────────────────────────────
export function getShopPriceMultiplier(player, nation) {
  if (!nation || !player?.reputation) return 1.0;
  const rep = player.reputation[nation] ?? 0;
  return getRepInfo(rep).priceMultiplier;
}

// ─────────────────────────────────────────────
//  判斷某國衛兵是否對玩家敵對（通緝狀態）
// ─────────────────────────────────────────────
export function isNationHostileToPlayer(player, nation) {
  if (!nation || !player?.reputation) return false;
  const rep = player.reputation[nation] ?? 0;
  return getRepInfo(rep).guardsHostile;
}

// ─────────────────────────────────────────────
//  checkNPCAccess(npcOrEvent, player)
//
//  npcOrEvent 需包含：
//    minReputation?: { nation: string, amount: number }
//    minKarma?:      number   （善惡質下限，含）
//    maxKarma?:      number   （善惡質上限，含，用於「只信任惡人」）
//
//  回傳 { ok: boolean, reason: string }
//    reason 在 ok=false 時顯示給玩家
// ─────────────────────────────────────────────
export function checkNPCAccess(npcOrEvent, player) {
  const req = npcOrEvent?.minReputation;
  if (req) {
    const rep = player?.reputation?.[req.nation] ?? 0;
    if (rep < req.amount) {
      const natLabel = NATION_LABELS[req.nation] ?? req.nation;
      const need     = getRepInfo(req.amount);
      return { ok: false, reason: `需要 ${natLabel} 名聲達到「${need.label}」（${req.amount > 0 ? '+' : ''}${req.amount}）` };
    }
  }

  const karma = player?.karma ?? 0;
  if (npcOrEvent?.minKarma !== undefined && karma < npcOrEvent.minKarma) {
    return { ok: false, reason: `善惡質需達到 ${npcOrEvent.minKarma > 0 ? '+' : ''}${npcOrEvent.minKarma} 以上` };
  }
  if (npcOrEvent?.maxKarma !== undefined && karma > npcOrEvent.maxKarma) {
    return { ok: false, reason: `善惡質需在 ${npcOrEvent.maxKarma} 以下（此人只接觸灰暗之人）` };
  }

  return { ok: true, reason: '' };
}
