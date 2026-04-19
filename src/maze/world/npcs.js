// ─────────────────────────────────────────────
//  npcs.js
//  世界 NPC 靜態定義
//  moveType:
//    STATIONARY  – 不移動（待在 home 附近）
//    LOCAL       – 城鎮內遊走  (~5 格)
//    REGIONAL    – 城鎮周邊巡邏 (~12 格)
//    LONG_HAUL   – 跨城移動（同國家）
//    FREE_ROAM   – 全地圖漫遊
//
//  alignment: 'friendly' | 'neutral' | 'hostile'
//  hostile NPC 靠近玩家會觸發戰鬥（enemyId 必填）
// ─────────────────────────────────────────────

export const PROFESSIONS = {
  // ── 友善職業 ──
  king:          { label: '國王',     color: '#ffd700', category: 'friendly' },
  chief:         { label: '酋長',     color: '#ffd700', category: 'friendly' },
  sultan:        { label: '蘇丹',     color: '#ffd700', category: 'friendly' },
  knight:        { label: '騎士',     color: '#6699ff', category: 'friendly' },
  guard:         { label: '衛兵',     color: '#5588cc', category: 'friendly' },
  merchant:      { label: '商人',     color: '#88cc44', category: 'friendly' },
  innkeeper:     { label: '旅館老闆', color: '#cc9944', category: 'friendly' },
  scholar:       { label: '學者',     color: '#aa88ff', category: 'friendly' },
  captain:       { label: '船長',     color: '#44aaff', category: 'friendly' },
  fisherman:     { label: '漁夫',     color: '#44ccbb', category: 'friendly' },
  caravan:       { label: '商隊長',   color: '#ddaa44', category: 'friendly' },
  hunter:        { label: '獵人',     color: '#88aa55', category: 'friendly' },
  ice_mage:      { label: '冰法師',   color: '#88ddff', category: 'friendly' },
  adventurer:    { label: '冒險家',   color: '#ff9944', category: 'friendly' },
  shaman:        { label: '沙漠祭司', color: '#ddaa88', category: 'friendly' },
  // ── 中立 / 可疑職業 ──
  corrupt_noble: { label: '腐敗貴族', color: '#cc8844', category: 'neutral' },
  informant:     { label: '線人',     color: '#aa7766', category: 'neutral' },
  rebel:         { label: '叛軍頭目', color: '#cc5533', category: 'neutral' },
  forger:        { label: '偽造商',   color: '#9977aa', category: 'neutral' },
  cult_priest:   { label: '邪教祭司', color: '#885599', category: 'neutral' },
  spy:           { label: '密探',     color: '#667788', category: 'neutral' },
  bounty_hunter: { label: '賞金獵人', color: '#bb6633', category: 'neutral' },
  betrayer:      { label: '背叛者',   color: '#996644', category: 'neutral' },
  snow_witch:    { label: '冰雪女巫', color: '#aaddff', category: 'neutral' },
  mysterious:    { label: '神秘旅人', color: '#9988bb', category: 'neutral' },
  black_market:  { label: '黑市商人', color: '#775566', category: 'neutral' },
  assassin:      { label: '刺客',     color: '#553344', category: 'neutral' },
  // ── 敵對職業 ──
  bandit:        { label: '強盜',     color: '#cc3333', category: 'hostile' },
  desert_bandit: { label: '沙漠盜匪', color: '#cc6622', category: 'hostile' },
  ice_pirate:    { label: '冰海盜',   color: '#4466aa', category: 'hostile' },
  rogue_hunter:  { label: '叛逃獵人', color: '#886633', category: 'hostile' },
  slave_trader:  { label: '奴隸販子', color: '#884422', category: 'hostile' },
  outlaw:        { label: '亡命之徒', color: '#aa3322', category: 'hostile' },
};

// ─────────────────────────────────────────────
//  NPC 定義清單
// ─────────────────────────────────────────────
export const NPC_DEFS = [

  // ══════════════════════════════════════════
  //  亞薩王國
  // ══════════════════════════════════════════

  // ── 首都 ──
  {
    id: 'king_ys', name: '亞薩國王', profession: 'king',
    nation: 'ys', homeTownId: 'capital_ys',
    icon: '👑', dialogueId: 'king_speech',
    moveType: 'STATIONARY', alignment: 'friendly',
    schedule: { activeStart: 8, activeEnd: 18 },
  },
  {
    id: 'knight_ys_1', name: '皇家騎士 艾倫', profession: 'knight',
    nation: 'ys', homeTownId: 'capital_ys',
    icon: '🛡️', dialogueId: 'npc_knight_ys',
    moveType: 'REGIONAL', moveRadius: 12, alignment: 'friendly',
  },
  {
    id: 'knight_ys_2', name: '皇家騎士 席拉', profession: 'knight',
    nation: 'ys', homeTownId: 'capital_ys',
    icon: '🛡️', dialogueId: 'npc_knight_ys',
    moveType: 'REGIONAL', moveRadius: 10, alignment: 'friendly',
  },
  {
    id: 'scholar_ys', name: '王室學者 克勞斯', profession: 'scholar',
    nation: 'ys', homeTownId: 'capital_ys',
    icon: '📚', dialogueId: 'npc_scholar_ys',
    moveType: 'LOCAL', moveRadius: 4, alignment: 'friendly',
  },
  {
    id: 'corrupt_noble_ys', name: '貴族 馬格勒', profession: 'corrupt_noble',
    nation: 'ys', homeTownId: 'capital_ys',
    icon: '🎭', dialogueId: 'npc_corrupt_noble',
    moveType: 'LOCAL', moveRadius: 5, alignment: 'neutral',
    schedule: { activeStart: 10, activeEnd: 22 },
  },
  {
    id: 'assassin_ys', name: '影刃', profession: 'assassin',
    nation: 'ys', homeTownId: 'capital_ys',
    icon: '🗡️', dialogueId: 'npc_assassin',
    moveType: 'FREE_ROAM', alignment: 'neutral',
    schedule: { activeStart: 20, activeEnd: 5 }, // 夜間活動
  },

  // ── 河畔城 ──
  {
    id: 'guard_riverside_1', name: '衛兵 托馬斯', profession: 'guard',
    nation: 'ys', homeTownId: 'town_riverside',
    icon: '⚔️', dialogueId: 'npc_guard_ys',
    moveType: 'LOCAL', moveRadius: 5, alignment: 'friendly',
  },
  {
    id: 'guard_riverside_2', name: '衛兵 艾娜', profession: 'guard',
    nation: 'ys', homeTownId: 'town_riverside',
    icon: '⚔️', dialogueId: 'npc_guard_ys',
    moveType: 'REGIONAL', moveRadius: 8, alignment: 'friendly',
  },
  {
    id: 'informant_ys', name: '諾斯（線人）', profession: 'informant',
    nation: 'ys', homeTownId: 'town_riverside',
    icon: '🐀', dialogueId: 'npc_informant',
    moveType: 'LOCAL', moveRadius: 4, alignment: 'neutral',
    schedule: { activeStart: 20, activeEnd: 4 }, // 只在夜間出現
  },
  {
    id: 'rebel_leader_ys', name: '叛軍首領 雷納斯', profession: 'rebel',
    nation: 'ys', homeTownId: 'town_riverside',
    icon: '✊', dialogueId: 'npc_rebel',
    moveType: 'REGIONAL', moveRadius: 10, alignment: 'neutral',
  },

  // ── 東港城 ──
  {
    id: 'captain_west', name: '船長 海德里克', profession: 'captain',
    nation: 'ys', homeTownId: 'port_west',
    icon: '⚓', dialogueId: 'npc_captain',
    moveType: 'LOCAL', moveRadius: 3, alignment: 'friendly',
  },
  {
    id: 'fisherman_ys_1', name: '漁夫 老康', profession: 'fisherman',
    nation: 'ys', homeTownId: 'port_west',
    icon: '🎣', dialogueId: 'npc_fisherman',
    moveType: 'REGIONAL', moveRadius: 8, alignment: 'friendly',
  },
  {
    id: 'fisherman_ys_2', name: '漁夫 小銘', profession: 'fisherman',
    nation: 'ys', homeTownId: 'port_west',
    icon: '🎣', dialogueId: 'npc_fisherman',
    moveType: 'REGIONAL', moveRadius: 6, alignment: 'friendly',
  },
  {
    id: 'forger_ys', name: '偽造商 鐵嘴', profession: 'forger',
    nation: 'ys', homeTownId: 'port_west',
    icon: '📜', dialogueId: 'npc_forger',
    moveType: 'LOCAL', moveRadius: 4, alignment: 'neutral',
    schedule: { activeStart: 18, activeEnd: 6 },
  },

  // ── 亞薩敵對 NPC ──
  {
    id: 'bandit_ys_1', name: '路霸 格魯', profession: 'bandit',
    nation: 'ys', homeTownId: 'town_riverside',
    icon: '🪓', dialogueId: null, enemyId: 'goblin',
    moveType: 'REGIONAL', moveRadius: 14, alignment: 'hostile',
  },
  {
    id: 'outlaw_ys', name: '亡命徒 野刀', profession: 'outlaw',
    nation: 'ys', homeTownId: 'capital_ys',
    icon: '💀', dialogueId: null, enemyId: 'skeleton',
    moveType: 'FREE_ROAM', alignment: 'hostile',
  },

  // ══════════════════════════════════════════
  //  沙漠帝國
  // ══════════════════════════════════════════

  // ── 帝都 ──
  {
    id: 'sultan_desert', name: '沙漠蘇丹 卡里姆', profession: 'sultan',
    nation: 'desert', homeTownId: 'capital_desert',
    icon: '👑', dialogueId: 'sultan_speech',
    moveType: 'STATIONARY', alignment: 'friendly',
    schedule: { activeStart: 9, activeEnd: 17 },
  },
  {
    id: 'guard_desert_1', name: '帝國衛兵 法魯克', profession: 'guard',
    nation: 'desert', homeTownId: 'capital_desert',
    icon: '⚔️', dialogueId: 'npc_guard_desert',
    moveType: 'LOCAL', moveRadius: 6, alignment: 'friendly',
  },
  {
    id: 'guard_desert_2', name: '帝國衛兵 薩米', profession: 'guard',
    nation: 'desert', homeTownId: 'capital_desert',
    icon: '⚔️', dialogueId: 'npc_guard_desert',
    moveType: 'REGIONAL', moveRadius: 10, alignment: 'friendly',
  },
  {
    id: 'spy_desert', name: '帝國密探 阿里夫', profession: 'spy',
    nation: 'desert', homeTownId: 'capital_desert',
    icon: '🕵️', dialogueId: 'npc_spy',
    moveType: 'FREE_ROAM', alignment: 'neutral',
  },

  // ── 綠洲鎮 ──
  {
    id: 'caravan_1', name: '商隊長 賽義德', profession: 'caravan',
    nation: 'desert', homeTownId: 'town_oasis',
    icon: '🐪', dialogueId: 'npc_caravan',
    moveType: 'LONG_HAUL', alignment: 'friendly',
    waypoints: ['capital_desert', 'town_oasis', 'town_small_dune'],
  },
  {
    id: 'caravan_2', name: '商隊長 法蒂瑪', profession: 'caravan',
    nation: 'desert', homeTownId: 'capital_desert',
    icon: '🐪', dialogueId: 'npc_caravan',
    moveType: 'LONG_HAUL', alignment: 'friendly',
    waypoints: ['capital_desert', 'town_small_dune', 'town_oasis'],
  },
  {
    id: 'shaman_desert', name: '沙漠祭司 伊梅爾', profession: 'shaman',
    nation: 'desert', homeTownId: 'town_oasis',
    icon: '🔮', dialogueId: 'npc_shaman',
    moveType: 'LOCAL', moveRadius: 5, alignment: 'friendly',
  },
  {
    id: 'cult_priest', name: '邪教祭司 穆薩', profession: 'cult_priest',
    nation: 'desert', homeTownId: 'dungeon_volcano',
    icon: '🕯️', dialogueId: 'npc_cult_priest',
    moveType: 'LOCAL', moveRadius: 6, alignment: 'neutral',
    schedule: { activeStart: 20, activeEnd: 6 },
  },
  {
    id: 'bounty_hunter_desert', name: '賞金獵人 達吾德', profession: 'bounty_hunter',
    nation: 'desert', homeTownId: 'town_oasis',
    icon: '🏹', dialogueId: 'npc_bounty_hunter',
    moveType: 'REGIONAL', moveRadius: 15, alignment: 'neutral',
  },

  // ── 沙漠敵對 NPC ──
  {
    id: 'desert_bandit_1', name: '沙漠盜匪 沙齒', profession: 'desert_bandit',
    nation: 'desert', homeTownId: 'town_small_dune',
    icon: '🔪', dialogueId: null, enemyId: 'goblin',
    moveType: 'REGIONAL', moveRadius: 16, alignment: 'hostile',
  },
  {
    id: 'desert_bandit_2', name: '沙漠盜匪 黃沙', profession: 'desert_bandit',
    nation: 'desert', homeTownId: 'capital_desert',
    icon: '🔪', dialogueId: null, enemyId: 'goblin',
    moveType: 'FREE_ROAM', alignment: 'hostile',
  },
  {
    id: 'slave_trader', name: '奴隸販子 哈金', profession: 'slave_trader',
    nation: 'desert', homeTownId: 'capital_desert',
    icon: '⛓️', dialogueId: null, enemyId: 'skeleton',
    moveType: 'LONG_HAUL', alignment: 'hostile',
    waypoints: ['capital_desert', 'town_oasis'],
  },

  // ══════════════════════════════════════════
  //  雪域聯盟
  // ══════════════════════════════════════════

  // ── 霜城要塞 ──
  {
    id: 'chief_snow', name: '冰雪酋長 伯恩', profession: 'chief',
    nation: 'snow', homeTownId: 'capital_frost',
    icon: '👑', dialogueId: 'frost_chief',
    moveType: 'STATIONARY', alignment: 'friendly',
    schedule: { activeStart: 8, activeEnd: 18 },
  },
  {
    id: 'ice_mage_snow', name: '冰法師 艾洛拉', profession: 'ice_mage',
    nation: 'snow', homeTownId: 'capital_frost',
    icon: '🧊', dialogueId: 'npc_ice_mage',
    moveType: 'LOCAL', moveRadius: 5, alignment: 'friendly',
  },
  {
    id: 'guard_frost_1', name: '聯盟衛兵 格里爾', profession: 'guard',
    nation: 'snow', homeTownId: 'capital_frost',
    icon: '⚔️', dialogueId: 'npc_guard_snow',
    moveType: 'LOCAL', moveRadius: 5, alignment: 'friendly',
  },
  {
    id: 'betrayer_snow', name: '背叛者 維爾納', profession: 'betrayer',
    nation: 'snow', homeTownId: 'capital_frost',
    icon: '🔱', dialogueId: 'npc_betrayer',
    moveType: 'LOCAL', moveRadius: 6, alignment: 'neutral',
    schedule: { activeStart: 20, activeEnd: 5 },
  },

  // ── 冰湖城 ──
  {
    id: 'captain_north', name: '船長 鐵鬚', profession: 'captain',
    nation: 'snow', homeTownId: 'port_north',
    icon: '⚓', dialogueId: 'npc_captain',
    moveType: 'LOCAL', moveRadius: 3, alignment: 'friendly',
  },
  {
    id: 'hunter_snow_1', name: '獵人 斯文', profession: 'hunter',
    nation: 'snow', homeTownId: 'town_small_peak',
    icon: '🏹', dialogueId: 'npc_hunter_snow',
    moveType: 'REGIONAL', moveRadius: 14, alignment: 'friendly',
  },
  {
    id: 'hunter_snow_2', name: '獵人 英格麗', profession: 'hunter',
    nation: 'snow', homeTownId: 'town_icelake',
    icon: '🏹', dialogueId: 'npc_hunter_snow',
    moveType: 'REGIONAL', moveRadius: 12, alignment: 'friendly',
  },
  {
    id: 'fisherman_north_1', name: '漁夫 奧拉夫', profession: 'fisherman',
    nation: 'snow', homeTownId: 'port_north',
    icon: '🎣', dialogueId: 'npc_fisherman',
    moveType: 'REGIONAL', moveRadius: 7, alignment: 'friendly',
  },
  {
    id: 'snow_witch', name: '冰雪女巫 茲拉', profession: 'snow_witch',
    nation: 'snow', homeTownId: 'capital_frost',
    icon: '❄️', dialogueId: 'npc_snow_witch',
    moveType: 'REGIONAL', moveRadius: 10, alignment: 'neutral',
  },

  // ── 雪域敵對 NPC ──
  {
    id: 'ice_pirate_1', name: '冰海盜 黑霜', profession: 'ice_pirate',
    nation: 'snow', homeTownId: 'port_north',
    icon: '🏴‍☠️', dialogueId: null, enemyId: 'skeleton',
    moveType: 'REGIONAL', moveRadius: 12, alignment: 'hostile',
  },
  {
    id: 'ice_pirate_2', name: '冰海盜 寒刃', profession: 'ice_pirate',
    nation: 'snow', homeTownId: 'port_north',
    icon: '🏴‍☠️', dialogueId: null, enemyId: 'bat',
    moveType: 'REGIONAL', moveRadius: 10, alignment: 'hostile',
  },
  {
    id: 'rogue_hunter', name: '叛逃獵人 黑箭', profession: 'rogue_hunter',
    nation: 'snow', homeTownId: 'town_small_peak',
    icon: '🪓', dialogueId: null, enemyId: 'goblin',
    moveType: 'FREE_ROAM', alignment: 'hostile',
  },
  {
    id: 'bandit_snow', name: '雪地強盜首領 鐵拳', profession: 'bandit',
    nation: 'snow', homeTownId: 'town_icelake',
    icon: '🪓', dialogueId: null, enemyId: 'cave_boss',
    moveType: 'REGIONAL', moveRadius: 12, alignment: 'hostile',
  },

  // ══════════════════════════════════════════
  //  無國籍 / 全地圖流浪者
  // ══════════════════════════════════════════

  {
    id: 'adventurer_1', name: '冒險家 洛克', profession: 'adventurer',
    nation: null, homeTownId: 'capital_ys',
    icon: '🧗', dialogueId: 'npc_adventurer',
    moveType: 'FREE_ROAM', alignment: 'friendly',
  },
  {
    id: 'adventurer_2', name: '冒險家 米雅', profession: 'adventurer',
    nation: null, homeTownId: 'town_oasis',
    icon: '🧗', dialogueId: 'npc_adventurer',
    moveType: 'FREE_ROAM', alignment: 'friendly',
  },
  {
    id: 'adventurer_3', name: '老冒險家 葛雷', profession: 'adventurer',
    nation: null, homeTownId: 'capital_frost',
    icon: '🧗', dialogueId: 'npc_adventurer_old',
    moveType: 'FREE_ROAM', alignment: 'friendly',
  },
  {
    id: 'black_market', name: '黑市商人 暗影', profession: 'black_market',
    nation: null, homeTownId: 'town_riverside',
    icon: '🎲', dialogueId: 'npc_black_market',
    moveType: 'LONG_HAUL', alignment: 'neutral',
    schedule: { activeStart: 20, activeEnd: 5 },
    waypoints: ['town_riverside', 'town_oasis', 'town_icelake'],
  },
  {
    id: 'mysterious_wanderer', name: '神秘旅人', profession: 'mysterious',
    nation: null, homeTownId: 'temple_ancient',
    icon: '👤', dialogueId: 'npc_mysterious',
    moveType: 'FREE_ROAM', alignment: 'neutral',
  },
  {
    id: 'outlaw_world', name: '亡命徒 血爪', profession: 'outlaw',
    nation: null, homeTownId: 'dungeon_volcano',
    icon: '💀', dialogueId: null, enemyId: 'dungeon_boss',
    moveType: 'FREE_ROAM', alignment: 'hostile',
  },
];
