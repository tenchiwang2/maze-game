// ─────────────────────────────────────────────
//  GiftPanel.jsx
//  送禮面板：從背包選一樣物品送給 NPC
//  好感度增幅依物品 value 計算
// ─────────────────────────────────────────────
import { useState } from 'react';
import { ITEMS } from './itemData.jsx';
import { getAffinityInfo } from './relationshipSystem.js';

// value → 好感增幅
export function giftAffinityDelta(itemValue) {
  if (itemValue >= 300) return 20;
  if (itemValue >= 100) return 15;
  if (itemValue >=  20) return  8;
  return 3;
}

export default function GiftPanel({ player, targetNPC, onGive, onClose }) {
  const [hovered, setHovered] = useState(null);

  // 可送禮的物品：有 value > 0 且 type 非 quest/gold
  const giftableItems = player.items.filter(slot => {
    const def = ITEMS[slot.itemId];
    return def && def.value > 0 && def.type !== 'gold' && def.type !== 'quest' && def.type !== 'key';
  });

  const relNow = player.relationships?.[targetNPC.id];
  const currentAffinity = relNow?.affinity ?? 0;
  const currentInfo = getAffinityInfo(currentAffinity);

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(8,10,20,0.97)',
      border: '1px solid rgba(255,180,100,0.35)',
      borderRadius: 12, width: 320, maxWidth: '96%',
      fontFamily: 'var(--font-mono, monospace)',
      zIndex: 11,
      overflow: 'hidden',
    }}>

      {/* 頂部 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px 10px',
        background: 'rgba(255,180,100,0.06)',
        borderBottom: '1px solid rgba(255,180,100,0.15)',
      }}>
        <span style={{ fontSize: 18 }}>{targetNPC.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaff' }}>{targetNPC.name}</div>
          <div style={{ fontSize: 10, color: currentInfo.color }}>
            {currentInfo.icon} {currentInfo.label}（{currentAffinity > 0 ? '+' : ''}{currentAffinity}）
          </div>
        </div>
        <button onClick={onClose} style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 4,
          background: 'rgba(80,80,100,0.30)', border: '0.5px solid rgba(120,130,160,0.35)',
          color: '#888', cursor: 'pointer',
        }}>✕</button>
      </div>

      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: 10, color: 'rgba(160,170,200,0.50)', marginBottom: 10 }}>
          🎁 選擇要送出的物品
        </div>

        {giftableItems.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px 0',
            color: 'rgba(160,170,200,0.30)', fontSize: 12,
          }}>
            背包裡沒有可送出的物品
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {giftableItems.map(slot => {
              const def   = ITEMS[slot.itemId];
              const delta = giftAffinityDelta(def.value);
              const afterAffinity = Math.min(100, currentAffinity + delta);
              const afterInfo = getAffinityInfo(afterAffinity);
              const isHovered = hovered === slot.itemId;

              return (
                <button
                  key={slot.itemId}
                  onMouseEnter={() => setHovered(slot.itemId)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onGive(slot.itemId, delta)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                    background: isHovered ? 'rgba(255,180,100,0.10)' : 'rgba(255,255,255,0.025)',
                    border: isHovered
                      ? '0.5px solid rgba(255,180,100,0.40)'
                      : '0.5px solid rgba(255,255,255,0.08)',
                    textAlign: 'left',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {/* 圖示 + 名稱 */}
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{def.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#dde0f0' }}>
                      {def.name}
                      <span style={{ fontSize: 10, color: 'rgba(160,170,200,0.45)', marginLeft: 5 }}>
                        ×{slot.qty}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(160,170,200,0.40)', marginTop: 1 }}>
                      價值 {def.value} 金幣
                    </div>
                  </div>
                  {/* 好感增幅 */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#88ff88' }}>
                      +{delta}
                    </div>
                    {afterInfo.label !== currentInfo.label && (
                      <div style={{ fontSize: 9, color: afterInfo.color, marginTop: 1 }}>
                        → {afterInfo.label}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 9, color: 'rgba(160,170,200,0.25)', marginTop: 10, textAlign: 'center' }}>
          送出物品後將從背包移除一個
        </div>
      </div>
    </div>
  );
}
