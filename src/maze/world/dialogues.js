export const DIALOGUES = {
  king_speech: [
    { speaker: '亞薩國王', text: '勇者，歡迎來到亞薩王都！我國正面臨重重危機。' },
    { speaker: '亞薩國王', text: '北方的雪域聯盟態度強硬，東南方的沙漠帝國也虎視眈眈。' },
    { speaker: '亞薩國王', text: '更糟的是，古代神殿中的邪惡正在甦醒，火山地帶出現了異常活動。' },
    { speaker: '亞薩國王', text: '請先到冒險公會接取任務，善用城內的武器店與防具店強化裝備。', choices: [
      { text: '遵命，陛下！', next: null },
    ]},
  ],
  guild_master: [
    { speaker: '公會長', text: '歡迎來到冒險者公會！這裡有各種委託任務等待完成。' },
    { speaker: '公會長', text: '建議新手先去河畔城或東港城熟悉環境。' },
    { speaker: '公會長', text: '霜城要塞的冰雪狼很危險，要做好充分準備再去。', choices: [
      { text: '謝謝指引！', next: null },
    ]},
  ],
  riverside_elder: [
    { speaker: '河畔城城主', text: '這裡是亞薩王國西部的重要貿易城市，河流是我們的生命線。' },
    { speaker: '河畔城城主', text: '最近河岸附近出現了一些野獸，請小心行動。', choices: [
      { text: '我會注意的。', next: null },
    ]},
  ],
  harbor_captain: [
    { speaker: '港口長', text: '歡迎來到東港城！我們是亞薩王國最繁忙的港口。' },
    { speaker: '港口長', text: '最近有海盜在附近活動，城內也不安全，要小心。', choices: [
      { text: '多謝提醒！', next: null },
    ]},
  ],
  harbor_merchant: [
    { speaker: '海商', text: '東港城是買賣東西的好地方，這裡什麼都有！' },
    { speaker: '海商', text: '不過最近海上不太平，聽說南方有強盜船出沒。', choices: [
      { text: '多謝消息。', next: null },
    ]},
  ],
  sultan_speech: [
    { speaker: '沙漠蘇丹', text: '外來者，你敢踏入沙漠帝國，勇氣可嘉。' },
    { speaker: '沙漠蘇丹', text: '我們的帝國統治著廣大的沙漠，擁有無盡的財富。' },
    { speaker: '沙漠蘇丹', text: '若你能通過火山洞窟的試煉，或許我能承認你的實力。', choices: [
      { text: '我會接受試煉的。', next: null },
    ]},
  ],
  oasis_elder: [
    { speaker: '綠洲長老', text: '這片綠洲是沙漠中的生命之源，我們在此生活了數百年。' },
    { speaker: '綠洲長老', text: '帝都的蘇丹雖然威嚴，但我們這裡的人更信賴自然的恩賜。', choices: [
      { text: '感謝指引。', next: null },
    ]},
  ],
  south_elder: [
    { speaker: '南境村村長', text: '歡迎到南境村！我們雖然是小村莊，但鄉親都很熱情。' },
    { speaker: '南境村村長', text: '王都在北邊，如果要買好武器的話，去河畔城比較方便。', choices: [
      { text: '謝謝指路。', next: null },
    ]},
  ],
  dune_guide: [
    { speaker: '商隊嚮導', text: '你好，旅人。這個聚落是穿越沙漠的必經之地。' },
    { speaker: '商隊嚮導', text: '記得補充水和食物再出發，沙漠可不是鬧著玩的。', choices: [
      { text: '我會注意的。', next: null },
    ]},
  ],
  frost_chief: [
    { speaker: '冰雪酋長', text: '外人，這裡是雪域聯盟的領土，輕易不接待外客。' },
    { speaker: '冰雪酋長', text: '我們世代守護北方的冰封秘密，不允許任何人破壞這片土地的寧靜。' },
    { speaker: '冰雪酋長', text: '若你是有誠意的冒險者，可以幫助我們清除入侵的怪物。', choices: [
      { text: '我願意幫忙。', next: null },
    ]},
  ],
  icelake_elder: [
    { speaker: '漁夫長', text: '冰湖城靠著這片冰湖維生，每年冬天湖面結冰，我們就在上面鑿冰捕魚。' },
    { speaker: '漁夫長', text: '要去霜城要塞的話，往西北走就到了，不過路上小心冰雪狼。', choices: [
      { text: '謝謝告知。', next: null },
    ]},
  ],
  icelake_alchemist: [
    { speaker: '煉金師', text: '我研究這片土地的冰晶已有多年，其中蘊含著不可思議的魔法能量。' },
    { speaker: '煉金師', text: '若你找到特殊的礦石或藥草，歡迎拿來交換我調製的藥劑。', choices: [
      { text: '有機會一定來。', next: null },
    ]},
  ],
  peak_hunter: [
    { speaker: '獵人', text: '雪嶺村只是個小地方，沒什麼特別的。' },
    { speaker: '獵人', text: '但如果你要打怪練手，附近的森林裡有不少野獸可以試試身手。', choices: [
      { text: '了解了。', next: null },
    ]},
  ],
};
