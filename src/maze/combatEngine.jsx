// ─────────────────────────────────────────────
//  combatEngine.jsx
//  回合制戰鬥純函數模組
//  不含 React，不含狀態管理
// ─────────────────────────────────────────────

// 傷害公式：攻擊方 atk * 1.5 - 防守方 def * 0.8，最低 1
export function calcDamage(atkStat, defStat) {
  const base = atkStat * 1.5 - defStat * 0.8;
  const variance = (Math.random() - 0.5) * 4; // ±2 隨機浮動
  return Math.max(1, Math.round(base + variance));
}

// 逃跑成功率（基於速度差）
function calcFleeChance(playerSpd, enemyAtk) {
  // 速度越高、敵人攻擊越低，越容易逃跑（固定70%基礎）
  return Math.min(0.9, 0.5 + (playerSpd / 20) * 0.4);
}

// 解析單一回合
// player: 玩家快照（只讀）
// enemy:  { ...enemyDef, currentHp }（包含當前HP）
// action: 'attack' | `item:${itemId}` | 'flee'
// 回傳:
// {
//   playerDmg: 對敵人造成傷害,
//   enemyDmg:  敵人對玩家造成傷害,
//   fled:      boolean,
//   enemyDied: boolean,
//   messages:  string[],
//   itemUsed:  string | null,
//   healEffect: number,
// }
export function resolveTurn(player, enemy, action) {
  const messages = [];
  let playerDmg = 0, enemyDmg = 0;
  let fled = false, enemyDied = false;
  let itemUsed = null, healEffect = 0;

  if (action === 'attack') {
    // 玩家攻擊
    playerDmg = calcDamage(player.atk, enemy.def);
    messages.push(`你對 ${enemy.name} 造成 ${playerDmg} 點傷害！`);

    // 敵人反擊（如果存活）
    if (enemy.currentHp - playerDmg > 0) {
      enemyDmg = calcDamage(enemy.atk, player.def);
      messages.push(`${enemy.name} 反擊，對你造成 ${enemyDmg} 點傷害！`);
    } else {
      enemyDied = true;
      messages.push(`${enemy.name} 被擊敗了！`);
    }
  } else if (action === 'flee') {
    const chance = calcFleeChance(player.spd, enemy.atk);
    if (Math.random() < chance) {
      fled = true;
      messages.push('成功逃跑！');
    } else {
      messages.push('逃跑失敗！');
      enemyDmg = Math.round(calcDamage(enemy.atk, player.def) * 0.6); // 逃跑失敗受到60%傷害
      messages.push(`${enemy.name} 趁機攻擊，造成 ${enemyDmg} 點傷害！`);
    }
  } else if (typeof action === 'string' && action.startsWith('item:')) {
    itemUsed = action.slice(5);
    // 實際使用效果由呼叫方（CombatPanel）處理，這裡只計算敵人反擊
    messages.push(`使用了物品。`);
    enemyDmg = calcDamage(enemy.atk, player.def);
    messages.push(`${enemy.name} 趁機攻擊，造成 ${enemyDmg} 點傷害！`);
  }

  return { playerDmg, enemyDmg, fled, enemyDied, messages, itemUsed, healEffect };
}

// 計算戰鬥掉落（依機率過濾）
export function rollLoot(enemyDef) {
  const loot = [];
  for (const drop of enemyDef.loot || []) {
    if (Math.random() < (drop.rate ?? 1)) {
      loot.push({ itemId: drop.itemId, qty: drop.qty });
    }
  }
  return loot;
}
