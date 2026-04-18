// ─────────────────────────────────────────────
//  combatService.js
//  戰鬥結果的純邏輯層
//  只操作 player 物件與 quest 進度，不碰 React state
// ─────────────────────────────────────────────
import { addItem, gainExp, recordKill, checkQuestStep } from './playerState.jsx';

/**
 * 將 combat:end 事件的結果套用到 player 身上
 * @param {object} result  - combat:end payload { won, fled, enemyId, loot, exp }
 * @param {object} player  - playerRef.current（直接 mutate）
 * @param {Array}  questDefs - QUEST_DEFS 陣列
 * @returns {{ leveled: boolean, levelMsg: string }}
 */
export function applyCombatResult(result, player, questDefs) {
  if (!result?.won) return { leveled: false, levelMsg: '' };

  result.loot?.forEach(l => addItem(player, l.itemId, l.qty));

  let leveled = false, levelMsg = '';
  if (result.exp) {
    const { leveled: lv, messages } = gainExp(player, result.exp);
    leveled = lv;
    levelMsg = messages?.[0] ?? '升等！';
  }

  recordKill(player, result.enemyId);
  questDefs.forEach(qd => checkQuestStep(player, qd, 'kill', { enemyId: result.enemyId }));

  return { leveled, levelMsg };
}
