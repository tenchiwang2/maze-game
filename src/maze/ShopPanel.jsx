// ─────────────────────────────────────────────
//  ShopPanel.jsx
//  商店覆蓋層 UI
// ─────────────────────────────────────────────
import { useState } from 'react';
import { ITEMS } from './itemData.jsx';
import { addItem } from './playerState.jsx';
import { buyFromShop, getStock, getCraftingProgress } from './supplySystem.js';

const PANEL = {
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(8,8,18,0.97)',
  border: '1px solid rgba(200,160,40,0.7)',
  borderRadius: 10, padding: '16px 20px',
  width: 380, maxWidth: '94%',
  fontFamily: 'var(--font-mono, monospace)',
  zIndex: 10,
};

// 將剩餘分鐘數轉為「Xd Xh Xm」字串
function fmtRemaining(mins) {
  if (!Number.isFinite(mins) || mins <= 0) return '';
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = Math.floor(mins % 60);
  if (d > 0) return `${d}天${h > 0 ? h + '時' : ''}`;
  if (h > 0) return `${h}時${m > 0 ? m + '分' : ''}`;
  return `${m}分`;
}

export default function ShopPanel({
  shopDef,
  shopId,
  player,
  shopStocks,
  craftingQueue,
  totalGameMins,
  onClose,
  onBuy,         // (itemId, price) → void
  onPlayerUpdate,
}) {
  const [tab, setTab] = useState('buy');
  const [msg, setMsg] = useState('');

  if (!shopDef) { onClose(); return null; }

  function handleBuy(itemId) {
    if (!shopStocks || !shopId) return;
    const result = buyFromShop(player, shopId, itemId, shopStocks);
    if (!result.success) { setMsg(result.message); return; }
    const item = ITEMS[itemId];
    addItem(player, itemId, 1);
    setMsg(`購買了 ${item?.name ?? itemId}（-${result.price} 金幣）`);
    onBuy?.(itemId, result.price);
    onPlayerUpdate?.();
  }

  function handleSell(itemId) {
    const item = ITEMS[itemId];
    if (!item || item.value <= 0) return;
    const sellPrice = Math.floor(item.value * 0.5);
    const idx = player.items.findIndex(i => i.itemId === itemId);
    if (idx < 0 || player.items[idx].qty <= 0) return;
    player.items[idx].qty -= 1;
    if (player.items[idx].qty <= 0) player.items.splice(idx, 1);
    player.gold += sellPrice;
    setMsg(`出售了 ${item.name}（+${sellPrice} 金幣）`);
    onPlayerUpdate?.();
  }

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      fontSize: 12, padding: '4px 14px', borderRadius: 5,
      background: tab === key ? 'rgba(200,160,40,0.25)' : 'none',
      color: tab === key ? '#ffd060' : '#888',
      border: `0.5px solid ${tab === key ? 'rgba(200,160,40,0.6)' : 'transparent'}`,
      cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <div style={PANEL}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, color: '#ffd060', fontWeight: 600 }}>🏪 {shopDef.name}</div>
        <div style={{ fontSize: 12, color: '#f0c040' }}>💰 {player.gold} 金幣</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {tabBtn('buy', '購買')}
        {tabBtn('sell', '出售')}
      </div>

      {msg && (
        <div style={{ fontSize: 12, color: '#88cc99', marginBottom: 8, padding: '5px 10px', background: 'rgba(80,200,100,0.1)', borderRadius: 4 }}>
          {msg}
        </div>
      )}

      {/* ── 購買列表 ── */}
      {tab === 'buy' && (
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {shopDef.inventory.map(itemDef => {
            const { itemId, price } = itemDef;
            const item      = ITEMS[itemId];
            if (!item) return null;

            const stock     = shopStocks ? getStock(shopId, itemId, shopStocks) : Infinity;
            const inStock   = stock > 0;
            const canAfford = player.gold >= price && inStock;

            // 製作進度
            const remaining = craftingQueue
              ? getCraftingProgress(shopId, itemId, craftingQueue, totalGameMins ?? 0)
              : null;

            return (
              <div key={itemId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 4px', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
                opacity: inStock ? 1 : 0.6,
              }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: inStock ? '#e8e8f0' : '#888' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#777', marginTop: 1 }}>
                    {item.desc}
                  </div>
                  {/* 庫存 & 製作進度 */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    {shopStocks && (
                      <span style={{
                        fontSize: 10,
                        color: inStock ? '#6090c0' : '#cc4444',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {inStock ? `庫存 ${stock}/${itemDef.maxStock}` : '缺貨'}
                      </span>
                    )}
                    {remaining !== null && remaining > 0 && (
                      <span style={{ fontSize: 10, color: '#a07030' }}>
                        ⏳ 補貨中 {fmtRemaining(remaining)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleBuy(itemId)}
                  disabled={!canAfford}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 5,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    background: canAfford ? 'rgba(200,160,40,0.25)' : 'rgba(50,50,50,0.4)',
                    border: `0.5px solid ${canAfford ? 'rgba(200,160,40,0.6)' : '#444'}`,
                    color: canAfford ? '#ffd060' : '#666',
                    whiteSpace: 'nowrap',
                  }}>
                  {price} G
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 出售列表 ── */}
      {tab === 'sell' && (
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {player.items.length === 0 && (
            <div style={{ fontSize: 12, color: '#666', padding: '10px 0' }}>背包是空的</div>
          )}
          {player.items.map(({ itemId, qty }) => {
            const item = ITEMS[itemId];
            if (!item || item.type === 'key' || item.type === 'quest' || item.value <= 0) return null;
            const sellPrice = Math.floor(item.value * 0.5);
            return (
              <div key={itemId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 4px', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
              }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#e8e8f0' }}>{item.name} ×{qty}</div>
                  <div style={{ fontSize: 10, color: '#777', marginTop: 1 }}>{item.desc}</div>
                </div>
                <button onClick={() => handleSell(itemId)} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                  background: 'rgba(80,120,80,0.3)', border: '0.5px solid rgba(80,180,80,0.5)',
                  color: '#88cc88', whiteSpace: 'nowrap',
                }}>{sellPrice} G</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onClose} style={{
          fontSize: 12, padding: '5px 18px', borderRadius: 6,
          background: 'rgba(80,80,80,0.3)', border: '0.5px solid #555',
          color: '#aaa', cursor: 'pointer',
        }}>離開商店</button>
      </div>
    </div>
  );
}
