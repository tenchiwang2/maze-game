// ─────────────────────────────────────────────
//  ShopPanel.jsx
//  商店覆蓋層 UI（含補貨任務系統）
// ─────────────────────────────────────────────
import { useState } from 'react';
import { ITEMS } from './itemData.jsx';
import { addItem } from './playerState.jsx';
import {
  buyFromShop, getStock, getCraftingProgress,
  acceptSupplyQuest, getPlayerResourceQty,
} from './supplySystem.js';

// NPC job 進度條顏色
const NPC_PROGRESS_BG = 'rgba(80,200,120,0.15)';

const PANEL = {
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(8,8,18,0.97)',
  border: '1px solid rgba(200,160,40,0.7)',
  borderRadius: 10, padding: '16px 20px',
  width: 400, maxWidth: '94%',
  fontFamily: 'var(--font-mono, monospace)',
  zIndex: 10,
};

function fmtMins(mins) {
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
  supplyQuests,
  npcJobs,
  totalGameMins,
  priceMultiplier = 1.0,
  onClose,
  onBuy,
  onAcceptQuest,   // (questId) → void
  onPlayerUpdate,
}) {
  const [tab, setTab] = useState('buy');
  const [msg, setMsg] = useState('');

  if (!shopDef) { onClose(); return null; }

  // ── 購買 ──
  function handleBuy(itemId) {
    if (!shopStocks || !shopId) return;
    const result = buyFromShop(player, shopId, itemId, shopStocks, priceMultiplier);
    if (!result.success) { setMsg(result.message); return; }
    const item = ITEMS[itemId];
    addItem(player, itemId, 1);
    const discountNote = priceMultiplier < 1.0 ? ` 🎖折扣` : priceMultiplier > 1.0 ? ` ⚠加價` : '';
    setMsg(`購買了 ${item?.name ?? itemId}（-${result.price} 金幣${discountNote}）`);
    onBuy?.(itemId, result.price);
    onPlayerUpdate?.();
  }

  // ── 出售 ──
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

  // ── 接受補貨任務 ──
  function handleAccept(questId) {
    onAcceptQuest?.(questId);
    setMsg('已接受補貨任務！');
    onPlayerUpdate?.();
  }

  // ── 補貨任務列表 ──
  // 補貨任務（open + accepted，不含 npc_accepted）
  const shopSupplyQuests = (supplyQuests ?? []).filter(
    q => q.shopId === shopId && (q.status === 'open' || q.status === 'accepted')
  );
  // NPC 進行中的工作
  const shopNpcJobs = (npcJobs ?? []).filter(
    j => j.shopId === shopId && j.status === 'working'
  );
  const openCount     = shopSupplyQuests.filter(q => q.status === 'open').length;
  const acceptedCount = shopSupplyQuests.filter(q => q.status === 'accepted').length;
  const supplyBadge   = openCount + acceptedCount + shopNpcJobs.length;

  const tabBtn = (key, label, badge = 0) => (
    <button onClick={() => setTab(key)} style={{
      fontSize: 12, padding: '4px 14px', borderRadius: 5, position: 'relative',
      background: tab === key ? 'rgba(200,160,40,0.25)' : 'none',
      color: tab === key ? '#ffd060' : '#888',
      border: `0.5px solid ${tab === key ? 'rgba(200,160,40,0.6)' : 'transparent'}`,
      cursor: 'pointer',
    }}>
      {label}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -6,
          background: '#cc4444', color: '#fff',
          borderRadius: 8, fontSize: 9, padding: '0 4px', lineHeight: '14px',
        }}>{badge}</span>
      )}
    </button>
  );

  return (
    <div style={PANEL}>
      {/* 標題 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, color: '#ffd060', fontWeight: 600 }}>🏪 {shopDef.name}</div>
        <div style={{ fontSize: 12, color: '#f0c040' }}>💰 {player.gold} 金幣</div>
      </div>

      {/* 分頁 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {tabBtn('buy',    '購買')}
        {tabBtn('sell',   '出售')}
        {tabBtn('supply', '補貨任務', supplyBadge)}
      </div>

      {/* 訊息列 */}
      {msg && (
        <div style={{ fontSize: 12, color: '#88cc99', marginBottom: 8, padding: '5px 10px', background: 'rgba(80,200,100,0.1)', borderRadius: 4 }}>
          {msg}
        </div>
      )}

      {/* ── 購買列表 ── */}
      {tab === 'buy' && (
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {shopDef.inventory.map(itemDef => {
            const { itemId } = itemDef;
            const basePrice  = itemDef.price;
            const price      = Math.ceil(basePrice * priceMultiplier);
            const item     = ITEMS[itemId];
            if (!item) return null;
            const stock    = shopStocks ? getStock(shopId, itemId, shopStocks) : Infinity;
            const inStock  = stock > 0;
            const canAfford = player.gold >= price && inStock;
            const hasDiscount = priceMultiplier < 0.99;
            const hasSurcharge = priceMultiplier > 1.01;
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
                  <div style={{ fontSize: 13, color: inStock ? '#e8e8f0' : '#888' }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: '#777', marginTop: 1 }}>{item.desc}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    {shopStocks && (
                      <span style={{ fontSize: 10, color: inStock ? '#6090c0' : '#cc4444', fontVariantNumeric: 'tabular-nums' }}>
                        {inStock ? `庫存 ${stock}/${itemDef.maxStock}` : '缺貨'}
                      </span>
                    )}
                    {remaining !== null && remaining > 0 && (
                      <span style={{ fontSize: 10, color: '#a07030' }}>⏳ 補貨中 {fmtMins(remaining)}</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 54 }}>
                  {hasDiscount && (
                    <div style={{ fontSize: 9, color: '#60d090', textDecoration: 'line-through', lineHeight: 1.1 }}>
                      {basePrice} G
                    </div>
                  )}
                  {hasSurcharge && (
                    <div style={{ fontSize: 9, color: '#ff9944', lineHeight: 1.1 }}>⚠ 加價</div>
                  )}
                  <button onClick={() => handleBuy(itemId)} disabled={!canAfford} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 5,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    background: canAfford ? 'rgba(200,160,40,0.25)' : 'rgba(50,50,50,0.4)',
                    border: `0.5px solid ${canAfford ? 'rgba(200,160,40,0.6)' : '#444'}`,
                    color: hasDiscount ? '#60d090' : hasSurcharge ? '#ff9944' : canAfford ? '#ffd060' : '#666',
                    whiteSpace: 'nowrap',
                  }}>{price} G</button>
                </div>
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

      {/* ── 補貨任務 ── */}
      {tab === 'supply' && (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {shopSupplyQuests.map(q => {
            const accepted = q.status === 'accepted';
            const haveQty  = getPlayerResourceQty(player, q.resourceId);
            const hasEnough = haveQty >= q.resourceQty;
            const remaining = accepted && q.acceptedAt != null
              ? Math.max(0, q.timeLimitMins - (totalGameMins - q.acceptedAt))
              : null;

            return (
              <div key={q.id} style={{
                padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
              }}>
                {/* 任務標題 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{q.itemIcon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#e8e8d0' }}>
                      補充 {q.itemName} ×{q.outputQty}
                    </div>
                    <div style={{ fontSize: 10, color: '#607080', marginTop: 2 }}>
                      製作時間 {q.craftDays} 天
                    </div>
                  </div>
                  {/* 狀態標籤 */}
                  {accepted && (
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(80,140,255,0.2)', border: '0.5px solid rgba(80,140,255,0.5)',
                      color: '#80aaff',
                    }}>進行中</span>
                  )}
                </div>

                {/* 需求資源 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                  <span style={{ fontSize: 14 }}>{q.resourceIcon}</span>
                  <span style={{ fontSize: 12, color: '#c0c8d0' }}>
                    {q.resourceName} ×{q.resourceQty}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: hasEnough ? '#60cc80' : '#cc6040',
                  }}>
                    （背包 {haveQty}/{q.resourceQty}）
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: '#a09050' }}>💰 {q.reward.gold} 金獎勵</span>
                </div>

                {/* 期限 */}
                {remaining !== null && (
                  <div style={{ fontSize: 10, color: remaining < 1440 ? '#ff7060' : '#506070', marginBottom: 6, paddingLeft: 4 }}>
                    ⏳ 剩餘 {fmtMins(remaining)}
                  </div>
                )}

                {/* 行動按鈕 */}
                {!accepted && (
                  <button onClick={() => handleAccept(q.id)} style={{
                    width: '100%', padding: '5px 0', borderRadius: 5, cursor: 'pointer', fontSize: 12,
                    background: 'rgba(80,140,255,0.15)', border: '0.5px solid rgba(80,140,255,0.5)',
                    color: '#80aaff',
                  }}>
                    接受補貨任務
                  </button>
                )}
                {accepted && hasEnough && (
                  <div style={{
                    padding: '5px 10px', borderRadius: 5, fontSize: 12, textAlign: 'center',
                    background: 'rgba(80,200,80,0.15)', border: '0.5px solid rgba(80,200,80,0.4)',
                    color: '#80dd80',
                  }}>
                    ✓ 已有足夠資源 — 關閉商店即自動交付
                  </div>
                )}
                {accepted && !hasEnough && (
                  <div style={{
                    padding: '5px 10px', borderRadius: 5, fontSize: 12, textAlign: 'center',
                    background: 'rgba(80,80,80,0.15)', border: '0.5px solid rgba(80,80,80,0.4)',
                    color: '#888',
                  }}>
                    前往採集 {q.resourceIcon} {q.resourceName}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── NPC 補貨進行中 ── */}
          {shopNpcJobs.length > 0 && (
            <div style={{ marginTop: shopSupplyQuests.length > 0 ? 8 : 0 }}>
              <div style={{
                fontSize: 10, color: '#507050', letterSpacing: '0.08em',
                textTransform: 'uppercase', padding: '6px 0 4px',
                borderTop: shopSupplyQuests.length > 0 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                NPC 補貨進行中
              </div>
              {shopNpcJobs.map(job => {
                const remaining   = Math.max(0, job.dueAt - (totalGameMins ?? 0));
                const totalMins   = job.dueAt - (job.dueAt - job.outputQty * 0); // placeholder
                // 進度百分比（用 craftDays 估算）
                const questDef    = (supplyQuests ?? []).find(q => q.id === job.questId);
                const totalDuration = (questDef?.craftDays ?? 1) * 1440;
                const elapsed     = totalDuration - remaining;
                const pct         = Math.min(100, Math.round(elapsed / totalDuration * 100));

                return (
                  <div key={job.id} style={{
                    padding: '8px 0',
                    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                  }}>
                    {/* NPC 名稱 + 商品 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 18 }}>{job.npcIcon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#c0d0c0' }}>{job.npcName}</div>
                        <div style={{ fontSize: 10, color: '#607060' }}>
                          正在補充 {job.itemIcon}{job.itemName} ×{job.outputQty}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#608060', whiteSpace: 'nowrap' }}>
                        ⏳ {fmtMins(remaining)}
                      </span>
                    </div>
                    {/* 進度條 */}
                    <div style={{
                      height: 4, borderRadius: 2,
                      background: 'rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: 'rgba(80,200,100,0.6)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <div style={{ fontSize: 9, color: '#405040', marginTop: 2, textAlign: 'right' }}>
                      {pct}% 完成
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {shopSupplyQuests.length === 0 && shopNpcJobs.length === 0 && (
            <div style={{ fontSize: 12, color: '#505060', padding: '16px 0', textAlign: 'center' }}>
              目前無補貨需求
            </div>
          )}
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
