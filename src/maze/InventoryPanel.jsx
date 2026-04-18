// ─────────────────────────────────────────────
//  InventoryPanel.jsx
//  物品欄 / 裝備 / 屬性面板覆蓋層
// ─────────────────────────────────────────────
import { useState } from 'react';
import { ITEMS } from './itemData.jsx';
import { equipItem, useItem } from './playerState.jsx';

const PANEL = {
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(8,8,18,0.97)',
  border: '1px solid rgba(100,180,100,0.5)',
  borderRadius: 10, padding: '16px 20px',
  width: 400, maxWidth: '94%',
  fontFamily: 'var(--font-mono, monospace)',
  zIndex: 10,
};

export default function InventoryPanel({ player, onClose, onPlayerUpdate }) {
  const [tab, setTab] = useState('items');
  const [msg, setMsg] = useState('');

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      fontSize: 12, padding: '4px 14px', borderRadius: 5,
      background: tab === key ? 'rgba(80,180,80,0.2)' : 'none',
      color: tab === key ? '#80ee88' : '#888',
      border: `0.5px solid ${tab === key ? 'rgba(80,180,80,0.5)' : 'transparent'}`,
      cursor: 'pointer',
    }}>{label}</button>
  );

  function doEquip(itemId) {
    const result = equipItem(player, itemId);
    if (result) { setMsg(result); onPlayerUpdate(); }
  }

  function doUse(itemId) {
    const msgs = useItem(player, itemId);
    if (msgs) { setMsg(msgs.join('  ')); onPlayerUpdate(); }
    else setMsg('無法使用！');
  }

  return (
    <div style={PANEL}>
      {/* 標題列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, color: '#88ee99', fontWeight: 600 }}>🎒 背包</div>
        <button onClick={onClose} style={{
          fontSize: 12, padding: '3px 10px', borderRadius: 5,
          background: 'rgba(80,80,80,0.3)', border: '0.5px solid #555', color: '#aaa', cursor: 'pointer',
        }}>關閉 [I]</button>
      </div>

      {/* 分頁 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {tabBtn('items', '物品')}
        {tabBtn('equip', '裝備')}
        {tabBtn('stats', '屬性')}
      </div>

      {msg && (
        <div style={{ fontSize: 12, color: '#88cc99', marginBottom: 8, padding: '5px 10px', background: 'rgba(80,200,100,0.1)', borderRadius: 4 }}>
          {msg}
        </div>
      )}

      {/* 物品列表 */}
      {tab === 'items' && (
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {player.items.length === 0 && (
            <div style={{ fontSize: 12, color: '#666', padding: '10px 0' }}>背包是空的</div>
          )}
          {player.items.map(({ itemId, qty }) => {
            const item = ITEMS[itemId];
            if (!item) return null;
            return (
              <div key={itemId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 4px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
              }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#e8e8f0' }}>{item.name} <span style={{ color: '#888' }}>×{qty}</span></div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>{item.desc}</div>
                </div>
                {item.type === 'weapon' || item.type === 'armor' ? (
                  <button onClick={() => doEquip(itemId)} style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(100,80,200,0.25)', border: '0.5px solid rgba(140,100,255,0.5)',
                    color: '#bbaaff',
                  }}>裝備</button>
                ) : item.type === 'consumable' ? (
                  <button onClick={() => doUse(itemId)} style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(40,140,60,0.25)', border: '0.5px solid rgba(80,200,80,0.5)',
                    color: '#88dd88',
                  }}>使用</button>
                ) : null}
              </div>
            );
          })}
          <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            💰 金幣：{player.gold}
          </div>
        </div>
      )}

      {/* 裝備欄 */}
      {tab === 'equip' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['weapon', '武器', '⚔'], ['armor', '防具', '🛡']].map(([slot, label, icon]) => {
            const equipped = player.equipped[slot];
            const item = equipped ? ITEMS[equipped] : null;
            return (
              <div key={slot} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.1)',
              }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{label}</div>
                  {item ? (
                    <div style={{ fontSize: 13, color: '#e8e8f0' }}>
                      {item.name}
                      <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>
                        {slot === 'weapon' ? `ATK +${item.atk}` : `DEF +${item.def}`}
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#555' }}>（未裝備）</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 屬性面板 */}
      {tab === 'stats' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f0e080' }}>Lv.{player.lv}</div>
              <div style={{ fontSize: 10, color: '#888' }}>EXP {player.exp}/{player.lv * 100}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['❤ HP',  `${player.hp} / ${player.maxHp}`, '#ff8888'],
              ['💧 MP',  `${player.mp} / ${player.maxMp}`, '#88aaff'],
              ['⚔ ATK', player.atk,                        '#ffcc66'],
              ['🛡 DEF', player.def,                        '#88ddcc'],
              ['💨 SPD', player.spd,                        '#aaffaa'],
              ['💰 金幣', player.gold,                      '#ffd060'],
            ].map(([lbl, val, color]) => (
              <div key={lbl} style={{
                padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 10, color: '#777', marginBottom: 2 }}>{lbl}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
