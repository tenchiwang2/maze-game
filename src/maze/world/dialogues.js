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
    { speaker: '公會長', text: '建議新手先去河畔城或東港城熟悉環境。霜城要塞的冰雪狼很危險，要做好充分準備再去。' },
    { speaker: '公會長', text: '我這裡有幾個委託，你有興趣接嗎？', choices: [
      { text: '我想接「公會入會試煉」', questOffer: 'quest_guild_trial', next: null },
      { text: '我想接「古代神殿的秘密」', questOffer: 'quest_temple', next: null },
      { text: '不了，謝謝。', next: null },
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
    { speaker: '港口長', text: '最近哥布林在附近活動猖獗，嚴重影響貿易。我正在找人幫忙解決這個麻煩。', choices: [
      { text: '我來幫忙！（接受護衛任務）', questOffer: 'quest_harbor_guard', next: null },
      { text: '多謝提醒，保重。', next: null },
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
    { speaker: '沙漠蘇丹', text: '若你能通過火山洞窟的試煉，擊倒其中的守護者，或許我能承認你的實力，並賜予獎賞。', choices: [
      { text: '接受火山試煉！', questOffer: 'quest_volcano', next: null },
      { text: '我還沒準備好。', next: null },
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
    { speaker: '冰雪酋長', text: '不過……若你是有誠意的冒險者，可以幫助我們清除入侵的冰雪狼。報酬不會虧待你。', choices: [
      { text: '我願意接受任務！', questOffer: 'quest_frost_wolves', next: null },
      { text: '我只是路過。', next: null },
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

  // ── 世界 NPC 對話 ────────────────────────────

  npc_knight_ys: [
    { speaker: '皇家騎士', text: '守護亞薩王國是騎士的榮耀，旅人請小心前行。' },
    { speaker: '皇家騎士', text: '王都以東的山脈近來有哥布林出沒，獨行要特別留意。', choices: [
      { text: '多謝告知。', next: null },
    ]},
  ],
  npc_scholar_ys: [
    { speaker: '王室學者', text: '古代神殿的文獻記載著三百年前的大災變，那段歷史至今仍是謎。' },
    { speaker: '王室學者', text: '傳說夜明珠是那個時代留下的神器，據說封存在火山深處……', choices: [
      { text: '有意思。', next: null },
    ]},
  ],
  npc_guard_ys: [
    { speaker: '衛兵', text: '旅人，此城受亞薩王國保護，請勿惹事生非。' },
    { speaker: '衛兵', text: '如有危險可向任何衛兵求助，我們 24 小時巡邏。', choices: [
      { text: '明白了。', next: null },
    ]},
  ],
  npc_corrupt_noble: [
    { speaker: '腐敗貴族', text: '哦，外地來的旅人？有什麼……需要辦的事嗎？' },
    { speaker: '腐敗貴族', text: '本人在朝中頗有人脈，只要你出得起價錢，什麼情報都能取得。', choices: [
      { text: '不了，謝謝。', next: null },
      { text: '我有興趣……', next: null },
    ]},
  ],
  npc_assassin: [
    { speaker: '影刃', text: '……你是在找我嗎？' },
    { speaker: '影刃', text: '我接受委託，不問原因，不留痕跡。需要的話，你知道怎麼聯繫。', choices: [
      { text: '我只是路過。', next: null },
    ]},
  ],
  npc_informant: [
    { speaker: '諾斯', text: '噓——聲音小一點！' },
    { speaker: '諾斯', text: '我手上有些消息……不過情報可不免費。付 50 金幣？', choices: [
      { text: '好的。', next: null },
      { text: '沒興趣。', next: null },
    ]},
  ],
  npc_rebel: [
    { speaker: '叛軍首領', text: '現在的王室已經腐化了。稅收越來越重，平民卻一無所有。' },
    { speaker: '叛軍首領', text: '如果你也看不下去，可以加入我們，一起改變這個王國。', choices: [
      { text: '我會考慮的。', next: null },
      { text: '這不是我的事。', next: null },
    ]},
  ],
  npc_forger: [
    { speaker: '鐵嘴', text: '嘿，你需要通行證？貴族令牌？……我都能做。' },
    { speaker: '鐵嘴', text: '品質保證，看起來跟真的一樣，但……千萬別被王室的學者檢查。', choices: [
      { text: '聽起來違法。', next: null },
    ]},
  ],
  npc_captain: [
    { speaker: '船長', text: '歡迎來到港口！出海的話要看風向，最近北風強，小心行船。' },
    { speaker: '船長', text: '需要搭船的話，可以跟我談談。只要價錢合適，哪裡都去。', choices: [
      { text: '知道了，謝謝。', next: null },
    ]},
  ],
  npc_fisherman: [
    { speaker: '漁夫', text: '今天收穫不錯！海裡的魚最近很多，也許是天氣的關係。' },
    { speaker: '漁夫', text: '這條大魚送你，補補體力！', choices: [
      { text: '謝謝大哥！', next: null },
    ]},
  ],
  npc_guard_desert: [
    { speaker: '帝國衛兵', text: '外來者，帝國歡迎有能力的冒險者，但也不容忍挑釁。' },
    { speaker: '帝國衛兵', text: '火山地帶有管制，沒有蘇丹的許可不得進入。', choices: [
      { text: '明白了。', next: null },
    ]},
  ],
  npc_spy: [
    { speaker: '密探', text: '……你在看什麼？' },
    { speaker: '密探', text: '我只是個普通旅人，別多問了。', choices: [
      { text: '好吧……', next: null },
    ]},
  ],
  npc_caravan: [
    { speaker: '商隊長', text: '啊，旅人！要買點沙漠特產嗎？駱駝奶、香料、珍貴礦石都有！' },
    { speaker: '商隊長', text: '不過沙漠路上盜匪猖獗，我的商隊需要護衛隨行。你有興趣嗎？報酬豐厚！', choices: [
      { text: '我可以護送你們！', questOffer: 'quest_desert_caravan', next: null },
      { text: '不了，祝一路順風。', next: null },
    ]},
  ],
  npc_shaman: [
    { speaker: '沙漠祭司', text: '沙漠之神告訴我，你是一個命運特殊的旅人。' },
    { speaker: '沙漠祭司', text: '我感應到古代神殿的封印出現了裂縫……黑暗正在滲透。我需要一個勇者前往確認。', choices: [
      { text: '我可以去調查。', questOffer: 'quest_shaman_ritual', next: null },
      { text: '感謝指引，我考慮看看。', next: null },
    ]},
  ],
  npc_cult_priest: [
    { speaker: '邪教祭司', text: '哈哈……旅人，你感受到了嗎？地底的脈動？' },
    { speaker: '邪教祭司', text: '火山的熔岩是古神的血液，祂們即將復甦……你想成為見證者嗎？', choices: [
      { text: '不，我要離開了。', next: null },
      { text: '告訴我更多……', next: null },
    ]},
  ],
  npc_bounty_hunter: [
    { speaker: '賞金獵人', text: '我追緝各地的通緝犯，沒有什麼人是找不到的。' },
    { speaker: '賞金獵人', text: '如果你有冒犯過任何國家的法律……最好離我遠一點。', choices: [
      { text: '我沒犯法。', next: null },
    ]},
  ],
  npc_guard_snow: [
    { speaker: '聯盟衛兵', text: '北地嚴寒，外來者要準備好厚實的裝備。' },
    { speaker: '聯盟衛兵', text: '聯盟的土地雖然冷，但民心溫暖。尊重我們的規矩，你會受到歡迎。', choices: [
      { text: '謝謝提醒。', next: null },
    ]},
  ],
  npc_ice_mage: [
    { speaker: '冰法師', text: '這片大地蘊含著上古冰魔法的殘留，只有雪域的人能感受到。' },
    { speaker: '冰法師', text: '我的研究需要冰湖附近礦洞的冰晶礦石，但那裡有骷髏士兵把守，我無法親自前往……', choices: [
      { text: '我可以幫你採集！', questOffer: 'quest_ice_crystal', next: null },
      { text: '聽起來很危險，不了。', next: null },
    ]},
  ],
  npc_hunter_snow: [
    { speaker: '獵人', text: '這片雪地是我的獵場，我追蹤過狼群、雪熊，甚至是更危險的東西。' },
    { speaker: '獵人', text: '我的夥伴在雪嶺村附近失蹤了，懷疑遇上了骷髏士兵。你願意幫我調查嗎？', choices: [
      { text: '我去幫你查清楚！', questOffer: 'quest_snow_missing', next: null },
      { text: '抱歉，我幫不上忙。', next: null },
    ]},
  ],
  npc_betrayer: [
    { speaker: '背叛者', text: '……你不是聯盟的人。好，那我可以說幾句。' },
    { speaker: '背叛者', text: '酋長伯恩在隱瞞什麼，聯盟的北方領土有秘密……但我說太多就危險了。', choices: [
      { text: '繼續說……', next: null },
      { text: '我不想知道。', next: null },
    ]},
  ],
  npc_snow_witch: [
    { speaker: '冰雪女巫', text: '旅人……我嗅到了你身上命運的氣息。' },
    { speaker: '冰雪女巫', text: '帶來三樣東西：月光下的冰晶、熔岩蜥蜴的鱗片、骷髏的碎骨，我為你預言未來。', choices: [
      { text: '我考慮看看。', next: null },
    ]},
  ],
  npc_adventurer: [
    { speaker: '冒險家', text: '你好，同行！這個世界到處都是寶藏和危險，每天都很刺激！' },
    { speaker: '冒險家', text: '聽說火山洞窟深處有一顆夜明珠，能驅散所有黑暗……不知道是不是真的。', choices: [
      { text: '一起加油！', next: null },
    ]},
  ],
  npc_adventurer_old: [
    { speaker: '老冒險家', text: '年輕人，我走過三個國家，打過數百場戰鬥，活下來靠的不是力氣，是謹慎。' },
    { speaker: '老冒險家', text: '遇到打不過的就跑，跑得掉才有機會變強。別為了面子丟命。', choices: [
      { text: '受教了。', next: null },
    ]},
  ],
  npc_black_market: [
    { speaker: '暗影', text: '（壓低聲音）……你來對地方了。我賣的東西，正規商店沒有。' },
    { speaker: '暗影', text: '不問出處，不給收據，現金交易，懂嗎？', choices: [
      { text: '讓我看看有什麼。', next: null },
      { text: '不了，謝謝。', next: null },
    ]},
  ],
  npc_mysterious: [
    { speaker: '神秘旅人', text: '……' },
    { speaker: '神秘旅人', text: '你在尋找什麼？力量？財富？還是……真相？', choices: [
      { text: '你是誰？', next: null },
      { text: '（沉默地離開）', next: null },
    ]},
  ],
};
