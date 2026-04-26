// ─────────────────────────────────────────────
//  world/quests.js
//  任務定義資料
//
//  reward 格式：{ gold, exp, items: [{ itemId, qty }] }
//  giverNpcId：對應 DialoguePanel 使用的 dialogueId
//  acceptAt: 'npc' | 'board'
// ─────────────────────────────────────────────

export const QUEST_DEFS = [

  // ── 亞薩王國 ──────────────────────────────────────────────────────────────

  {
    id: 'quest_guild_trial',
    title: '公會入會試煉',
    desc: '冒險者公會要求新入會成員展現基本戰鬥能力：消滅洞穴蝙蝠，再回到冒險公會回報結果。',
    giverNpcId: 'guild_master',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '擊敗洞穴蝙蝠', type: 'kill', enemyId: 'bat', count: 3 },
      { desc: '回到冒險公會（亞薩王都）回報', type: 'reach', locationId: 'capital_ys' },
    ],
    timeLimitMins: 4320,   // 3 天
    reward: { gold: 60, exp: 80, items: [{ itemId: 'health_potion', qty: 2 }] },
    karmaReward: 20,
    reputationReward: { nation: 'ys', amount: 30 },
  },

  {
    id: 'quest_temple',
    title: '古代神殿的秘密',
    desc: '冒險公會收到報告，古代神殿中出現異常活動。需要一名勇敢的冒險者前往調查。',
    giverNpcId: 'guild_master',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '探索古代神殿', type: 'reach', locationId: 'temple_ancient' },
    ],
    timeLimitMins: 10080,  // 7 天
    reward: { gold: 200, exp: 120, items: [{ itemId: 'tower_emblem', qty: 1 }] },
    karmaReward: 15,
    reputationReward: { nation: 'ys', amount: 25 },
  },

  {
    id: 'quest_harbor_guard',
    title: '港口護衛任務',
    desc: '東港城近來哥布林頻繁騷擾，港口長需要一名冒險者協助清除威脅，確保貿易路線安全。',
    giverNpcId: 'harbor_captain',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '擊退哥布林', type: 'kill', enemyId: 'goblin', count: 2 },
      { desc: '回報港口長',       type: 'reach', locationId: 'town_harbor' },
    ],
    timeLimitMins: 4320,   // 3 天
    reward: { gold: 120, exp: 70, items: [{ itemId: 'iron_sword', qty: 1 }] },
    karmaReward: 25,
    reputationReward: { nation: 'ys', amount: 40 },
  },

  // ── 沙漠帝國 ──────────────────────────────────────────────────────────────

  {
    id: 'quest_volcano',
    title: '火山試煉',
    desc: '沙漠蘇丹要求你進入火山洞窟，擊敗其中最強的守護者，以此證明你配得上他的賞識。',
    giverNpcId: 'sultan_speech',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '進入火山洞窟',         type: 'reach', locationId: 'dungeon_volcano' },
      { desc: '擊倒地洞守衛',         type: 'kill',  enemyId: 'dungeon_boss', count: 1 },
      { desc: '回到沙漠帝都向蘇丹回報', type: 'reach', locationId: 'capital_desert' },
    ],
    timeLimitMins: 20160,  // 14 天
    reward: { gold: 150, exp: 100, items: [{ itemId: 'steel_sword', qty: 1 }] },
    karmaReward: 20,
    reputationReward: { nation: 'desert', amount: 60 },
  },

  {
    id: 'quest_desert_caravan',
    title: '商隊護送',
    desc: '一支沙漠商隊需要護衛，從帝都出發，護送至沙漠綠洲。路途遙遠，報酬豐厚。',
    giverNpcId: 'npc_caravan',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '前往沙漠帝都集合', type: 'reach', locationId: 'capital_desert' },
      { desc: '護送至沙漠綠洲',   type: 'reach', locationId: 'town_oasis' },
    ],
    timeLimitMins: 20160,  // 14 天（跨區遠距離）
    reward: { gold: 200, exp: 80, items: [] },
    karmaReward: 15,
    reputationReward: { nation: 'desert', amount: 50 },
  },

  {
    id: 'quest_shaman_ritual',
    title: '神殿封印調查',
    desc: '沙漠祭司感應到古代神殿的封印出現裂縫，懷疑有黑暗力量正在滲透，需要勇者親赴確認。',
    giverNpcId: 'npc_shaman',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '前往古代神殿調查', type: 'reach', locationId: 'temple_ancient' },
    ],
    timeLimitMins: 10080,  // 7 天
    reward: { gold: 100, exp: 90, items: [{ itemId: 'health_potion', qty: 4 }] },
    karmaReward: 10,
    reputationReward: { nation: 'desert', amount: 35 },
  },

  // ── 雪域聯盟 ──────────────────────────────────────────────────────────────

  {
    id: 'quest_frost_wolves',
    title: '驅逐冰雪狼',
    desc: '霜城附近出現大量冰雪狼，威脅著村民的安全，酋長請求有能力的冒險者前來協助清除。',
    giverNpcId: 'frost_chief',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '前往霜城要塞',         type: 'reach', locationId: 'capital_frost' },
      { desc: '消滅冰雪狼',           type: 'kill',  enemyId: 'bat', count: 2 },
      { desc: '回到霜城要塞向酋長回報', type: 'reach', locationId: 'capital_frost' },
    ],
    timeLimitMins: 4320,   // 3 天
    reward: { gold: 80, exp: 50, items: [{ itemId: 'health_potion', qty: 3 }] },
    karmaReward: 25,
    reputationReward: { nation: 'snow', amount: 45 },
  },

  {
    id: 'quest_ice_crystal',
    title: '冰晶礦石採集',
    desc: '冰法師需要特殊的冰晶礦石來完成魔法研究，但冰湖城附近礦洞中有骷髏士兵把守。',
    giverNpcId: 'npc_ice_mage',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '前往冰湖城',             type: 'reach', locationId: 'town_icelake' },
      { desc: '清除骷髏守衛',           type: 'kill',  enemyId: 'skeleton', count: 2 },
      { desc: '在世界地圖找冰法師回報',  type: 'report', npcId: 'npc_ice_mage' },
    ],
    timeLimitMins: 4320,   // 3 天
    reward: { gold: 90, exp: 60, items: [{ itemId: 'hi_potion', qty: 1 }] },
    karmaReward: 20,
    reputationReward: { nation: 'snow', amount: 40 },
  },

  // ── 採集任務 ───────────────────────────────────────────────────────────────

  {
    id: 'quest_cave_mushroom',
    title: '洞穴蘑菇採集',
    desc: '港口長聽說東港城地下水道長滿了洞穴蘑菇，想委託冒險者採集幾株，作為航海藥劑的原料。注意，地下有海盜出沒！',
    giverNpcId: 'harbor_captain',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '前往東港城地下採集洞穴蘑菇', type: 'collect', itemId: 'cave_mushroom', count: 3 },
      { desc: '回到東港城回報港口長',       type: 'reach',   locationId: 'town_harbor' },
    ],
    timeLimitMins: 2880,   // 2 天
    reward: { gold: 70, exp: 60, items: [{ itemId: 'health_potion', qty: 2 }] },
    karmaReward: 15,
    reputationReward: { nation: 'ys', amount: 25 },
  },

  {
    id: 'quest_fire_stone',
    title: '火焰原石探勘',
    desc: '沙漠祭司需要火山洞窟深處的火焰原石來完成上古儀式，但熔岩地帶危險重重，需要有能力的冒險者代勞。',
    giverNpcId: 'npc_shaman',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '前往火山洞窟',             type: 'reach',   locationId: 'dungeon_volcano' },
      { desc: '採集火焰原石',             type: 'collect', itemId: 'fire_stone', count: 2 },
      { desc: '在世界地圖找沙漠祭司回報', type: 'report',  npcId: 'npc_shaman' },
    ],
    timeLimitMins: 7200,   // 5 天
    reward: { gold: 140, exp: 95, items: [{ itemId: 'mp_potion', qty: 2 }] },
    karmaReward: 20,
    reputationReward: { nation: 'desert', amount: 40 },
  },

  {
    id: 'quest_relic_study',
    title: '遺跡碎片蒐集',
    desc: '冒險公會收到王室學者的委託，希望取得古代神殿牆壁上的浮雕碎片，以研究失落文明。神殿內有不死守衛，請做好戰鬥準備。',
    giverNpcId: 'guild_master',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '前往古代神殿',             type: 'reach',   locationId: 'temple_ancient' },
      { desc: '採集遺跡碎片',             type: 'collect', itemId: 'relic_fragment', count: 2 },
      { desc: '回到亞薩王都交差',         type: 'reach',   locationId: 'capital_ys' },
    ],
    timeLimitMins: 10080,  // 7 天
    reward: { gold: 200, exp: 130, items: [{ itemId: 'hi_potion', qty: 1 }] },
    karmaReward: 20,
    reputationReward: { nation: 'ys', amount: 35 },
  },

  {
    id: 'quest_snow_missing',
    title: '雪地失蹤調查',
    desc: '雪域獵人的隊員在追蹤獵物時神秘失蹤，懷疑是遭到骷髏士兵的突擊。請幫忙調查並消滅威脅。',
    giverNpcId: 'npc_hunter_snow',
    acceptAt: 'npc',
    repeatable: false,
    steps: [
      { desc: '前往雪嶺村調查',         type: 'reach', locationId: 'town_small_peak' },
      { desc: '消滅威脅生物',           type: 'kill',  enemyId: 'skeleton', count: 3 },
      { desc: '在世界地圖找獵人回報',    type: 'report', npcId: 'npc_hunter_snow' },
    ],
    timeLimitMins: 4320,   // 3 天
    reward: { gold: 110, exp: 75, items: [{ itemId: 'health_potion', qty: 3 }] },
    karmaReward: 25,
    reputationReward: { nation: 'snow', amount: 45 },
  },

];
