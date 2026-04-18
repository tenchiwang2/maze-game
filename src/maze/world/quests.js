export const QUEST_DEFS = [
  {
    id: 'quest_frost_wolves',
    title: '驅逐冰雪狼',
    giverNpc: 'frost_chief',
    steps: [
      { desc: '前往霜城要塞', type: 'reach', locationId: 'capital_frost' },
      { desc: '消滅冰雪狼 (0/2)', type: 'kill', enemyId: 'bat', count: 2 },
    ],
    reward: { gold: 80, itemId: 'health_potion', qty: 3 },
  },
  {
    id: 'quest_volcano',
    title: '火山探索',
    giverNpc: 'sultan_speech',
    steps: [
      { desc: '進入火山洞窟', type: 'reach', locationId: 'dungeon_volcano' },
      { desc: '擊倒熔岩巨人', type: 'kill', enemyId: 'dungeon_boss', count: 1 },
    ],
    reward: { gold: 150, itemId: 'steel_sword', qty: 1 },
  },
  {
    id: 'quest_temple',
    title: '古代神殿的秘密',
    giverNpc: 'guild_master',
    steps: [
      { desc: '探索古代神殿', type: 'reach', locationId: 'temple_ancient' },
    ],
    reward: { gold: 200, itemId: 'tower_emblem', qty: 1 },
  },
];
