// ─────────────────────────────────────────────
//  CombatPanel.jsx
//  回合制戰鬥覆蓋層 UI
// ─────────────────────────────────────────────
import { useState } from 'react';
import { resolveTurn, rollLoot } from './combatEngine.jsx';
import { ENEMIES } from './enemyData.jsx';
import { ITEMS } from './itemData.jsx';
import { useItem } from './playerState.jsx';

const PANEL = {
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(8,8,18,0.97)',
  border: '1px solid rgba(200,60,60,0.7)',
  borderRadius: 10, padding: '16px 20px',
  width: 380, maxWidth: '94%',
  fontFamily: 'var(--font-mono, monospace)',
  zIndex: 10,
};

function HpBar({ current, max, color }) {
  const pct = Math.max(0, Math.min(1, current / max));
  return (
    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
      <div style={{ width: `${pct * 100}%`, height: '100%', background: color, transition: 'width 0.3s', borderRadius: 4 }} />
    </div>
  );
}

export default function CombatPanel({ enemyId, player, onCombatEnd }) {
  const enemyDef = ENEMIES[enemyId];
  const [enemyHp, setEnemyHp]   = useState(enemyDef?.hp || 0);
  const [playerHp, setPlayerHp] = useState(player.hp);
  const [log, setLog]           = useState([`⚔ 遭遇 ${enemyDef?.name || '未知敵人'}！`]);
  const [phase, setPhase]       = useState('player'); // 'player' | 'victory' | 'defeat'

  if (!enemyDef) { onCombatEnd({ fled: true }); return null; }

  const consumables = player.items.filter(i => ITEMS[i.itemId]?.type === 'consumable');

  function doAction(action) {
    if (phase !== 'player') return;

    // 使用物品：直接處理 HP 恢復，再讓敵人反擊
    if (action.startsWith('item:')) {
      const itemId = action.slice(5);
      const msgs = useItem(player, itemId);
      if (!msgs) return;
      const newPlayerHp = player.hp;
      const result = resolveTurn({ ...player, hp: newPlayerHp }, { ...enemyDef, currentHp: enemyHp }, action);
      const finalPlayerHp = Math.max(0, newPlayerHp - result.enemyDmg);
      player.hp = finalPlayerHp;

      setPlayerHp(finalPlayerHp);
      setLog(prev => [...prev, ...msgs, ...result.messages].slice(-8));

      if (finalPlayerHp <= 0) {
        setPhase('defeat');
        onCombatEnd({ won: false, fled: false });
      }
      return;
    }

    const snap = { ...player, hp: playerHp };
    const result = resolveTurn(snap, { ...enemyDef, currentHp: enemyHp }, action);

    const newEnemyHp  = Math.max(0, enemyHp  - result.playerDmg);
    const newPlayerHp = Math.max(0, playerHp - result.enemyDmg);
    player.hp = newPlayerHp;

    setEnemyHp(newEnemyHp);
    setPlayerHp(newPlayerHp);
    setLog(prev => [...prev, ...result.messages].slice(-8));

    if (result.fled) {
      setPhase('victory'); // 重用 victory phase
      setTimeout(() => onCombatEnd({ fled: true }), 800);
      return;
    }
    if (newEnemyHp <= 0) {
      const loot = rollLoot(enemyDef);
      const lootMsgs = loot.map(l => `獲得 ${ITEMS[l.itemId]?.name || l.itemId} ×${l.qty}`);
      setLog(prev => [...prev, ...lootMsgs, `獲得 ${enemyDef.exp} 點 EXP！`].slice(-8));
      setPhase('victory');
      setTimeout(() => onCombatEnd({ won: true, fled: false, loot, exp: enemyDef.exp }), 1200);
      return;
    }
    if (newPlayerHp <= 0) {
      setPhase('defeat');
      onCombatEnd({ won: false, fled: false });
      return;
    }
  }

  return (
    <div style={PANEL}>
      {/* 標題 */}
      <div style={{ fontSize: 11, color: '#cc6666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        ⚔ 戰鬥
      </div>

      {/* 雙方狀態 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        {/* 玩家 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#aaddff', marginBottom: 4 }}>玩家 (Lv.{player.lv})</div>
          <HpBar current={playerHp} max={player.maxHp} color="#44aaff" />
          <div style={{ fontSize: 11, color: '#7799bb', marginTop: 2 }}>{playerHp}/{player.maxHp} HP</div>
        </div>
        <div style={{ color: '#666', alignSelf: 'center', fontSize: 18 }}>VS</div>
        {/* 敵人 */}
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#ffaa88', marginBottom: 4 }}>{enemyDef.name} {enemyDef.icon}</div>
          <HpBar current={enemyHp} max={enemyDef.hp} color="#ff6644" />
          <div style={{ fontSize: 11, color: '#bb7766', marginTop: 2 }}>{enemyHp}/{enemyDef.hp} HP</div>
        </div>
      </div>

      {/* 戰鬥記錄 */}
      <div style={{
        background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '8px 10px',
        minHeight: 72, maxHeight: 96, overflowY: 'auto', marginBottom: 12,
        fontSize: 12, color: '#ccc', lineHeight: 1.6,
      }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {/* 行動按鈕 */}
      {phase === 'player' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => doAction('attack')} style={{
            flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: 'rgba(200,60,60,0.3)', border: '1px solid rgba(200,60,60,0.6)',
            color: '#ffaaaa', cursor: 'pointer',
          }}>⚔ 攻擊</button>

          {consumables.map(item => (
            <button key={item.itemId} onClick={() => doAction(`item:${item.itemId}`)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 6, fontSize: 12,
              background: 'rgba(40,120,60,0.3)', border: '1px solid rgba(40,180,80,0.5)',
              color: '#88ddaa', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {ITEMS[item.itemId]?.name} ×{item.qty}
            </button>
          ))}

          <button onClick={() => doAction('flee')} style={{
            flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13,
            background: 'rgba(80,80,80,0.3)', border: '1px solid rgba(130,130,130,0.5)',
            color: '#aaa', cursor: 'pointer',
          }}>🏃 逃跑</button>
        </div>
      )}

      {phase === 'victory' && (
        <div style={{ textAlign: 'center', color: '#88ffaa', fontSize: 14, fontWeight: 600, padding: '8px 0' }}>
          勝利！
        </div>
      )}
      {phase === 'defeat' && (
        <div style={{ textAlign: 'center', fontSize: 13, padding: '8px 0' }}>
          <div style={{ color: '#ff6666', fontWeight: 600, marginBottom: 8 }}>你被打倒了...</div>
          <button onClick={() => onCombatEnd({ won: false, fled: false })} style={{
            fontSize: 12, padding: '6px 20px', borderRadius: 6,
            background: 'rgba(80,80,80,0.4)', border: '1px solid #666',
            color: '#aaa', cursor: 'pointer',
          }}>返回城鎮</button>
        </div>
      )}
    </div>
  );
}
