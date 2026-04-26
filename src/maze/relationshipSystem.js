// ─────────────────────────────────────────────
//  relationshipSystem.js
//  親屬 / 友好 / 婚姻 關係系統
//  純函數模組，不含 React
// ─────────────────────────────────────────────

// ── 好感度等級（由高至低）────────────────────
//  衰減下限：冷卻只降到「點頭之交」(DECAY_FLOOR = 20) 就停止
export const DECAY_FLOOR = 20;

export const AFFINITY_LEVELS = [
  { min:  80, label: '摯友',    color: '#ffd700', icon: '💛' },
  { min:  50, label: '朋友',    color: '#88dd88', icon: '🤝' },
  { min:  20, label: '點頭之交', color: '#aaaaaa', icon: '😊' },
  { min: -30, label: '陌生人',  color: '#666688', icon: '😐' },
  { min: -60, label: '不友好',  color: '#ffaa44', icon: '😒' },
  { min:-101, label: '敵對',    color: '#ff5544', icon: '⚔'  },
];

// ── 關係子類型中文標示 ──────────────────────
export const REL_SUBTYPE_LABELS = {
  sibling:  '兄弟姊妹',
  parent:   '父母',
  child:    '子女',
  lover:    '戀人',
  engaged:  '未婚配偶',
  spouse:   '配偶',
  rival:    '對手',
};

// ─────────────────────────────────────────────
//  查詢工具
// ─────────────────────────────────────────────
export function getAffinityInfo(affinity) {
  for (const lvl of AFFINITY_LEVELS) {
    if (affinity >= lvl.min) return lvl;
  }
  return AFFINITY_LEVELS[AFFINITY_LEVELS.length - 1];
}

export function getRelationship(player, targetId) {
  return player.relationships?.[targetId] ?? null;
}

// 取得已婚配偶 { id, name } 或 null
export function getSpouse(player) {
  if (!player.relationships) return null;
  for (const [id, rel] of Object.entries(player.relationships)) {
    if (rel.flags?.married) return { id, name: rel.targetName };
  }
  return null;
}

// 婚姻加成：+5% maxHp、+3% EXP
export function getMarriageBuff(player) {
  return getSpouse(player)
    ? { hpBonus: 0.05, expBonus: 0.03 }
    : null;
}

// ─────────────────────────────────────────────
//  建立 / 調整關係
// ─────────────────────────────────────────────

// 建立一筆新關係記錄（若已存在則略過）
export function initRelationship(player, targetId, targetName, type = 'friend', subtype = null) {
  if (!player.relationships) player.relationships = {};
  if (player.relationships[targetId]) return; // 已存在
  player.relationships[targetId] = {
    type,
    subtype,
    targetName,
    affinity: 0,
    flags: { proposed: false, engaged: false, married: false },
    history: [],
  };
}

// 調整好感度（clamp -100 ~ +100），可附加事件標籤進入 history
export function adjustAffinity(player, targetId, delta, targetName = '', gameTime = 0, eventLabel = '') {
  if (!player.relationships) player.relationships = {};
  if (!player.relationships[targetId]) {
    initRelationship(player, targetId, targetName || targetId);
  }
  const rel = player.relationships[targetId];
  rel.affinity = Math.max(-100, Math.min(100, rel.affinity + delta));
  if (eventLabel) {
    rel.history.unshift({ event: eventLabel, delta, time: gameTime });
    if (rel.history.length > 30) rel.history.length = 30;
  }
}

// ─────────────────────────────────────────────
//  每日衰減（遊戲日更換時呼叫）
//  好感度 > DECAY_FLOOR → 每天 -1，最低停在 DECAY_FLOOR
//  好感度 ≤ DECAY_FLOOR → 不變
// ─────────────────────────────────────────────
export function tickRelationshipDecay(player) {
  if (!player.relationships) return;
  for (const rel of Object.values(player.relationships)) {
    if (rel.affinity > DECAY_FLOOR) {
      rel.affinity = Math.max(DECAY_FLOOR, rel.affinity - 1);
    }
  }
}

// ─────────────────────────────────────────────
//  婚姻流程
// ─────────────────────────────────────────────

// 檢查是否可告白
export function canPropose(player, targetId) {
  const rel = getRelationship(player, targetId);
  if (!rel)                  return { ok: false, reason: '尚未建立關係' };
  if (rel.affinity < 60)     return { ok: false, reason: `好感度不足（需 60，目前 ${rel.affinity}）` };
  if (rel.flags?.married)    return { ok: false, reason: '已是配偶' };
  if (rel.flags?.engaged)    return { ok: false, reason: '已訂婚' };
  if (getSpouse(player))     return { ok: false, reason: '已有配偶' };
  return { ok: true, reason: '' };
}

// 套用告白結果
export function applyPropose(player, targetId, accepted, gameTime = 0) {
  if (!player.relationships?.[targetId]) return;
  const rel = player.relationships[targetId];
  if (accepted) {
    rel.flags.proposed = true;
    rel.flags.engaged  = true;
    rel.type    = 'romance';
    rel.subtype = 'engaged';
    adjustAffinity(player, targetId, +5, '', gameTime, '告白成功');
  } else {
    adjustAffinity(player, targetId, -10, '', gameTime, '告白被拒');
  }
}

// 完成婚禮（在婚禮任務觸發後呼叫）
export function applyMarriage(player, targetId, gameTime = 0) {
  const rel = player.relationships?.[targetId];
  if (!rel) return;
  rel.flags.engaged = false;
  rel.flags.married = true;
  rel.subtype = 'spouse';
  adjustAffinity(player, targetId, +10, '', gameTime, '結婚');
}

// 離婚（好感度 ≤ -30 時可觸發，或特殊劇情）
export function applyDivorce(player, targetId, gameTime = 0) {
  const rel = player.relationships?.[targetId];
  if (!rel) return;
  rel.flags.married = false;
  rel.flags.engaged = false;
  rel.subtype = null;
  rel.type    = 'friend';
  adjustAffinity(player, targetId, -40, '', gameTime, '離婚');
}

// ─────────────────────────────────────────────
//  家族連帶效果
//  傷害 NPC A 時，對 A 的兄弟姊妹好感 -20
//  npcDefs = NPC_DEFS 陣列
// ─────────────────────────────────────────────
export function applyFamilyImpact(player, killedNpcId, npcDefs, delta, gameTime = 0) {
  const killedDef = npcDefs.find(n => n.id === killedNpcId);
  if (!killedDef?.family) return;

  const siblings = killedDef.family.siblings ?? [];
  for (const sibId of siblings) {
    const sibDef = npcDefs.find(n => n.id === sibId);
    if (!sibDef) continue;
    adjustAffinity(player, sibId, delta, sibDef.name, gameTime, `${killedDef.name} 受到傷害`);
  }
}
