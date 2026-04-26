// ─────────────────────────────────────────────
//  adventurerState.js
//  冒險者狀態統一格式
//  玩家與 NPC 冒險者共用相同 schema，
//  差別僅在 isPlayer / aiState 欄位。
// ─────────────────────────────────────────────

// ── 職業定義 ──────────────────────────────────
export const CLASSES = {
  warrior: {
    label: '戰士',     icon: '⚔️',
    color: '#e08060',
    hp: 140, mp: 20, atk: 14, def: 8, spd: 7,
    desc: '高HP、均衡攻防，適合前線衝鋒',
  },
  mage: {
    label: '法師',     icon: '🔮',
    color: '#9988ff',
    hp: 70,  mp: 80, atk: 18, def: 3, spd: 8,
    desc: '低HP高MP，爆發傷害最強',
  },
  archer: {
    label: '弓手',     icon: '🏹',
    color: '#88cc44',
    hp: 100, mp: 35, atk: 15, def: 5, spd: 12,
    desc: '速度最快，遠程優勢',
  },
  heavy: {
    label: '重甲',     icon: '🛡️',
    color: '#6688aa',
    hp: 180, mp: 15, atk: 11, def: 16, spd: 5,
    desc: '極高HP與DEF，移動緩慢',
  },
  assassin: {
    label: '刺客',     icon: '🗡️',
    color: '#cc4488',
    hp: 90,  mp: 40, atk: 20, def: 4, spd: 14,
    desc: '最高攻擊與速度，但防禦脆弱',
  },
  healer: {
    label: '治療師',   icon: '✨',
    color: '#60d090',
    hp: 85,  mp: 100, atk: 8,  def: 6, spd: 9,
    desc: '支援型，高MP，回復能力強',
  },
};

// ── AI 狀態 ───────────────────────────────────
// idle       → 在主城附近待機
// traveling  → 前往目標地點
// dungeon    → 正在地城冒險（模擬中）
// returning  → 返回主城
// rest       → 休息恢復（進城後）
export const AI_STATE = {
  IDLE:       'idle',
  TRAVELING:  'traveling',
  DUNGEON:    'dungeon',
  RETURNING:  'returning',
  REST:       'rest',
};

// ─────────────────────────────────────────────
//  NPC 職業 → 冒險者職業類別映射
// ─────────────────────────────────────────────
export const PROFESSION_CLASS_MAP = {
  // 統治者／重甲
  king:          'heavy',
  chief:         'heavy',
  sultan:        'heavy',
  // 戰士系
  knight:        'warrior',
  guard:         'warrior',
  rebel:         'warrior',
  bounty_hunter: 'warrior',
  rogue_hunter:  'warrior',
  bandit:        'warrior',
  outlaw:        'warrior',
  desert_bandit: 'warrior',
  ice_pirate:    'warrior',
  slave_trader:  'warrior',
  // 遠程 / 偵察系
  captain:       'archer',
  hunter:        'archer',
  fisherman:     'archer',
  caravan:       'archer',
  adventurer:    'archer',
  // 法術 / 知識系
  scholar:       'mage',
  ice_mage:      'mage',
  shaman:        'mage',
  cult_priest:   'mage',
  snow_witch:    'mage',
  mysterious:    'mage',
  // 暗影 / 情報系
  assassin:      'assassin',
  spy:           'assassin',
  informant:     'assassin',
  forger:        'assassin',
  betrayer:      'assassin',
  black_market:  'assassin',
  // 交涉 / 支援系
  merchant:      'healer',
  innkeeper:     'healer',
  corrupt_noble: 'healer',
};

// 依職業給予對應金幣起始值
const PROFESSION_GOLD = {
  king: 500, sultan: 500, chief: 400,
  merchant: 300, caravan: 250, black_market: 200,
  knight: 150, captain: 150, corrupt_noble: 180,
};

// ─────────────────────────────────────────────
//  npcToAdventurer(npcDef, npcRuntime?)
//
//  將世界 NPC 定義轉換為可操控的冒險者狀態。
//  npcRuntime = g.current.worldNPCs 中對應的執行時物件
//               （有 wx/wy/homeWx/homeWy）
// ─────────────────────────────────────────────
export function npcToAdventurer(npcDef, npcRuntime) {
  const className = PROFESSION_CLASS_MAP[npcDef.profession] ?? 'warrior';

  const adv = createAdventurer({
    id:         npcDef.id,
    name:       npcDef.name,
    className,
    portrait:   npcDef.icon,
    isPlayer:   false,
    homeWX:     npcRuntime?.homeWx ?? 36,
    homeWY:     npcRuntime?.homeWy ?? 24,
    homeTownId: npcDef.homeTownId ?? null,
    startGold:  PROFESSION_GOLD[npcDef.profession] ?? 80,
    lore:       `${npcDef.profession}（${npcDef.nation ?? '無國籍'}）`,
  });

  // NPC 專屬欄位
  adv.isNPCAdventurer = true;
  adv.npcProfession   = npcDef.profession;
  adv.npcAlignment    = npcDef.alignment;
  adv.npcNation       = npcDef.nation ?? null;
  adv.gender          = npcDef.gender ?? null;
  // 初始位置設在 NPC 目前所在位置
  adv.currentWX       = npcRuntime?.wx ?? adv.homeWX;
  adv.currentWY       = npcRuntime?.wy ?? adv.homeWY;

  // 預設家族關係（兄弟姊妹等）
  if (npcDef.family?.siblings) {
    for (const sibId of npcDef.family.siblings) {
      if (!adv.relationships[sibId]) {
        adv.relationships[sibId] = {
          type: 'family', subtype: 'sibling',
          targetName: sibId, // 名字在取得 sibDef 後可補上
          affinity: 50,
          flags: { proposed: false, engaged: false, married: false },
          history: [],
        };
      }
    }
  }

  return adv;
}

// ─────────────────────────────────────────────
//  createAdventurer(def)
//
//  def 格式：
//  {
//    id:          string           // 唯一 ID（'adv_kai' 等）
//    name:        string           // 顯示名稱
//    className:   keyof CLASSES    // 職業 key
//    portrait:    string           // emoji 頭像
//    isPlayer:    boolean          // true = 當前受玩家控制
//    homeWX:      number           // 初始世界座標 X
//    homeWY:      number           // 初始世界座標 Y
//    homeTownId:  string           // 初始城鎮 ID
//    startItems?: [{ itemId, qty }]// 初始物品
//    startGold?:  number           // 初始金幣（覆蓋職業預設）
//    lore?:       string           // 背景故事（UI 用）
//  }
// ─────────────────────────────────────────────
export function createAdventurer(def) {
  const cls = CLASSES[def.className] ?? CLASSES.warrior;

  return {
    // ── 身份 ──────────────────────────────────
    id:          def.id,
    name:        def.name,
    className:   def.className,
    classLabel:  cls.label,
    classIcon:   cls.icon,
    classColor:  cls.color,
    portrait:    def.portrait ?? cls.icon,
    lore:        def.lore ?? '',
    isPlayer:    def.isPlayer ?? false,

    // ── RPG 核心屬性（與 createPlayer() 相容）─
    hp:     cls.hp,
    maxHp:  cls.hp,
    mp:     cls.mp,
    maxMp:  cls.mp,
    atk:    cls.atk,
    def:    cls.def,
    spd:    cls.spd,
    lv:     1,
    exp:    0,
    gold:   def.startGold ?? 80,
    items:  def.startItems
      ? def.startItems.map(({ itemId, qty }) => ({ itemId, qty }))
      : [],
    equipped:    { weapon: null, armor: null },
    quests:      [],
    killCounts:  {},
    lightBuff:   null,

    // ── 位置（大地圖世界座標）────────────────
    currentWX:   def.homeWX,
    currentWY:   def.homeWY,
    homeWX:      def.homeWX,
    homeWY:      def.homeWY,
    homeTownId:  def.homeTownId ?? null,

    // ── AI 狀態（isPlayer=true 時不使用）──────
    aiState:           AI_STATE.IDLE,
    aiCooldown:        0,           // 剩餘冷卻 tick 數
    destinationId:     null,        // 目標地點 ID
    destinationWX:     null,
    destinationWY:     null,
    dungeonStartTime:  null,        // 進入地城時的遊戲分鐘數
    dungeonDuration:   null,        // 預計冒險時長（分鐘）
    actionLog:         [],          // 最近行動記錄（最多 20 條）
    lastLogTime:       0,           // 上次記錄的遊戲分鐘數
    totalDungeons:     0,           // 累計進入地城次數
    totalGoldEarned:   0,           // 累計獲得金幣

    // ── 道德 / 名聲 ──────────────────────────
    karma:       0,                    // 善惡質 -1000 ~ +1000
    reputation:  { ys: 0, desert: 0, snow: 0 }, // 各國名聲

    // ── 關係系統 ─────────────────────────────
    gender:        def.gender ?? null, // 'male' | 'female' | null
    relationships: {},                 // { [npcId]: RelationshipRecord }
    lastRelDecayDay: 0,                // 上次觸發衰減的遊戲日數

    // ── 狀態旗標 ─────────────────────────────
    isAlive:     true,
    isActive:    def.isPlayer ?? false, // 是否為當前受玩家控制的角色
  };
}

// ─────────────────────────────────────────────
//  adventurerLog(adv, msg, gameTime)
//  新增一條行動記錄
// ─────────────────────────────────────────────
export function adventurerLog(adv, msg, gameTime = 0) {
  adv.actionLog.unshift({ msg, time: gameTime });
  if (adv.actionLog.length > 20) adv.actionLog.length = 20;
  adv.lastLogTime = gameTime;
}

// ─────────────────────────────────────────────
//  getAdventurerStatusLabel(adv)
//  回傳 UI 顯示用的狀態文字
// ─────────────────────────────────────────────
export function getAdventurerStatusLabel(adv) {
  if (!adv.isAlive) return '⚰ 陣亡';
  if (adv.isActive) return '🎮 操控中';
  switch (adv.aiState) {
    case AI_STATE.IDLE:      return '😴 待機中';
    case AI_STATE.TRAVELING: return '🚶 移動中';
    case AI_STATE.DUNGEON:   return '⚔ 冒險中';
    case AI_STATE.RETURNING: return '🏠 返回中';
    case AI_STATE.REST:      return '🏕 休息中';
    default: return '❓ 未知';
  }
}

// ─────────────────────────────────────────────
//  getStatusColor(adv)
// ─────────────────────────────────────────────
export function getAdventurerStatusColor(adv) {
  if (!adv.isAlive) return '#666';
  if (adv.isActive) return '#80c8ff';
  switch (adv.aiState) {
    case AI_STATE.IDLE:      return 'rgba(160,170,200,0.55)';
    case AI_STATE.TRAVELING: return '#ffd060';
    case AI_STATE.DUNGEON:   return '#ff8888';
    case AI_STATE.RETURNING: return '#88ddaa';
    case AI_STATE.REST:      return '#a0b890';
    default: return '#888';
  }
}

// ─────────────────────────────────────────────
//  HP 百分比（方便 UI 血條使用）
// ─────────────────────────────────────────────
export function hpPct(adv) {
  return adv.maxHp > 0 ? Math.max(0, adv.hp / adv.maxHp) : 0;
}
