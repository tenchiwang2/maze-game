// ─────────────────────────────────────────────
//  InventoryPanel.jsx
//  物品欄 / 裝備 / 屬性面板覆蓋層
// ─────────────────────────────────────────────
import { useState } from 'react';
import { ITEMS, ITEM_CATEGORY } from './itemData.jsx';
import { equipItem, useItem } from './playerState.jsx';

const PANEL = {
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(8,8,18,0.97)',
  border: '1px solid rgba(100,180,100,0.5)',
  borderRadius: 10, padding: '16px 20px',
  width: 420, maxWidth: '94%',
  fontFamily: 'var(--font-mono, monospace)',
  zIndex: 10,
};

const TABS = [
  { key: ITEM_CATEGORY.CONSUMABLE, label: '消耗品', color: '#88dd88' },
  { key: ITEM_CATEGORY.EQUIPMENT,  label: '裝備',   color: '#bbaaff' },
  { key: ITEM_CATEGORY.QUEST,      label: '任務',   color: '#ffd060' },
];

export default function InventoryPanel({ player, onClose, onPlayerUpdate }) {
  const [tab, setTab] = useState(ITEM_CATEGORY.CONSUMABLE);
  const [msg, setMsg] = useState('');

  function doEquip(itemId) {
    const result = equipItem(player, itemId);
    if (result) { setMsg(result); onPlayerUpdate(); }
  }

  function doUse(itemId) {
    const msgs = useItem(player, itemId);
    if (msgs) { setMsg(msgs.join('  ')); onPlayerUpdate(); }
    else setMsg('無法使用！');
  }

  const itemsInBag = (category) =>
    player.items.filter(({ itemId }) => ITEMS[itemId]?.category === category);

  const activeColor = TABS.find(t => t.key === tab)?.color ?? '#88ee99';

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

      {/* 分頁列 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {TABS.map(({ key, label, color }) => (
          <button key={key} onClick={() => { setTab(key); setMsg(''); }} style={{
            flex: 1, fontSize: 12, padding: '5px 0', borderRadius: 5, cursor: 'pointer',
            background: tab === key ? `${color}22` : 'none',
            color: tab === key ? color : '#666',
            border: `0.5px solid ${tab === key ? color + '66' : 'rgba(255,255,255,0.08)'}`,
            fontWeight: tab === key ? 600 : 400,
          }}>{label}</button>
        ))}
      </div>

      {msg && (
        <div style={{ fontSize: 12, color: '#88cc99', marginBottom: 8, padding: '5px 10px', background: 'rgba(80,200,100,0.1)', borderRadius: 4 }}>
          {msg}
        </div>
      )}

      {/* ── 消耗品 ── */}
      {tab === ITEM_CATEGORY.CONSUMABLE && (
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {itemsInBag(ITEM_CATEGORY.CONSUMABLE).length === 0 && (
            <div style={{ fontSize: 12, color: '#555', padding: '12px 0' }}>沒有消耗品</div>
          )}
          {itemsInBag(ITEM_CATEGORY.CONSUMABLE).map(({ itemId, qty }) => {
            const item = ITEMS[itemId];
            return (
              <div key={itemId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 4px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
              }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#e8e8f0' }}>
                    {item.name} <span style={{ color: '#888' }}>×{qty}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>{item.desc}</div>
                </div>
                <button onClick={() => doUse(itemId)} style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
                  background: 'rgba(40,140,60,0.25)', border: '0.5px solid rgba(80,200,80,0.5)',
                  color: '#88dd88',
                }}>使用</button>
              </div>
            );
          })}
          <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>💰 金幣：{player.gold}</div>
        </div>
      )}

      {/* ── 裝備 ── */}
      {tab === ITEM_CATEGORY.EQUIPMENT && (
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {/* 已裝備欄位 */}
          <div style={{ fontSize: 10, color: '#888', marginBottom: 6, letterSpacing: '0.08em' }}>已裝備</div>
          {[['weapon', '武器', '⚔'], ['armor', '防具', '🛡']].map(([slot, label, icon]) => {
            const eqId = player.equipped[slot];
            const item = eqId ? ITEMS[eqId] : null;
            return (
              <div key={slot} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', marginBottom: 6,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.1)',
              }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 1 }}>{label}</div>
                  {item
                    ? <div style={{ fontSize: 13, color: '#e8e8f0' }}>
                        {item.name}
                        <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>
                          {slot === 'weapon' ? `ATK +${item.atk}` : `DEF +${item.def}`}
                        </span>
                      </div>
                    : <div style={{ fontSize: 12, color: '#444' }}>（未裝備）</div>
                  }
                </div>
              </div>
            );
          })}

          {/* 背包裝備 */}
          {itemsInBag(ITEM_CATEGORY.EQUIPMENT).length > 0 && (
            <>
              <div style={{ fontSize: 10, color: '#888', margin: '10px 0 6px', letterSpacing: '0.08em' }}>背包中</div>
              {itemsInBag(ITEM_CATEGORY.EQUIPMENT).map(({ itemId, qty }) => {
                const item = ITEMS[itemId];
                const isEquipped = Object.values(player.equipped).includes(itemId);
                return (
                  <div key={itemId} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 4px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
                  }}>
                    <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: isEquipped ? '#bbaaff' : '#e8e8f0' }}>
                        {item.name}
                        {isEquipped && <span style={{ fontSize: 10, color: '#9988dd', marginLeft: 6 }}>已裝備</span>}
                        <span style={{ color: '#888' }}> ×{qty}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>
                        {item.type === 'weapon' ? `ATK +${item.atk}` : `DEF +${item.def}`}
                        {'  '}{item.desc}
                      </div>
                    </div>
                    {!isEquipped && (
                      <button onClick={() => doEquip(itemId)} style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
                        background: 'rgba(100,80,200,0.25)', border: '0.5px solid rgba(140,100,255,0.5)',
                        color: '#bbaaff',
                      }}>裝備</button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── 任務用品 ── */}
      {tab === ITEM_CATEGORY.QUEST && (
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {itemsInBag(ITEM_CATEGORY.QUEST).length === 0 && (
            <div style={{ fontSize: 12, color: '#555', padding: '12px 0' }}>沒有任務用品</div>
          )}
          {itemsInBag(ITEM_CATEGORY.QUEST).map(({ itemId, qty }) => {
            const item = ITEMS[itemId];
            return (
              <div key={itemId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 4px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
              }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#ffd060' }}>
                    {item.name} <span style={{ color: '#888' }}>×{qty}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
