// ─────────────────────────────────────────────
//  QuestLogPanel.jsx
//  任務日誌面板：RPG 任務 + 補貨任務統一顯示
// ─────────────────────────────────────────────
import { useState } from 'react';
import { ITEMS } from './itemData.jsx';

const OVERLAY = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 40,
};

const PANEL = {
  background: 'rgba(6,6,20,0.98)',
  border: '1px solid rgba(100,140,255,0.4)',
  borderRadius: 12,
  width: 520,
  maxWidth: '96vw',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'var(--font-mono, monospace)',
  boxShadow: '0 0 40px rgba(60,100,255,0.12)',
  overflow: 'hidden',
};

const STEP_STATUS = {
  done:    { color: '#60cc80', icon: '✓' },
  current: { color: '#f0c040', icon: '►' },
  pending: { color: '#405060', icon: '○' },
};

function stepStatus(q, idx) {
  if (q.completed || idx < q.stepIdx) return 'done';
  if (idx === q.stepIdx) return 'current';
  return 'pending';
}

function RewardRow({ reward }) {
  if (!reward) return null;
  const { gold = 0, exp = 0, items = [] } = reward;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 4 }}>
      {gold > 0 && <span style={{ fontSize: 12, color: '#f0c040' }}>💰 {gold} 金</span>}
      {exp  > 0 && <span style={{ fontSize: 12, color: '#70d0ff' }}>✨ {exp} EXP</span>}
      {items.map((it, i) => {
        const def = ITEMS[it.itemId];
        return (
          <span key={i} style={{ fontSize: 12, color: '#88ee99' }}>
            {def?.icon ?? '📦'} {def?.name ?? it.itemId} ×{it.qty}
          </span>
        );
      })}
    </div>
  );
}

function formatMins(mins) {
  if (!Number.isFinite(mins) || mins <= 0) return '已超時';
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}天${h > 0 ? h + '時' : ''}`;
  if (h > 0) return `${h}時${m > 0 ? m + '分' : ''}`;
  return `${m}分`;
}

export default function QuestLogPanel({ questLog, questDefs, totalGameMins = 0, supplyQuests = [], playerItems = [], onClose }) {
  const [selected, setSelected] = useState(null);

  // ── 統一格式化所有任務 ──────────────────────
  // displayStatus: 'claimable' | 'active' | 'failed'
  const entries = [];

  // RPG 任務
  for (const q of questLog) {
    if (q.claimed) continue;
    const def = questDefs.find(d => d.id === q.questId);
    if (!def) continue;
    const elapsed   = Number.isFinite(q.acceptedAt) ? totalGameMins - q.acceptedAt : 0;
    const remaining = def.timeLimitMins ? def.timeLimitMins - elapsed : null;
    entries.push({
      key:           q.questId,
      type:          'rpg',
      displayStatus: q.failed ? 'failed' : q.completed ? 'claimable' : 'active',
      title:         def.title,
      remaining,
      urgent:        remaining !== null && remaining < 1440,
      def, q,
    });
  }

  // 補貨任務（只顯示玩家已接的）
  for (const sq of supplyQuests) {
    if (sq.status !== 'accepted') continue;
    const elapsed   = totalGameMins - (sq.acceptedAt ?? totalGameMins);
    const remaining = sq.timeLimitMins ? sq.timeLimitMins - elapsed : null;
    const haveQty   = playerItems.find(i => i.itemId === sq.resourceId)?.qty ?? 0;
    entries.push({
      key:           sq.id,
      type:          'supply',
      displayStatus: 'active',
      title:         `${sq.itemIcon ?? '📦'}${sq.itemName} 補貨`,
      subtitle:      sq.shopName,
      remaining,
      urgent:        remaining !== null && remaining < 1440,
      sq, haveQty,
      hasEnough:     haveQty >= sq.resourceQty,
    });
  }

  const claimable  = entries.filter(e => e.displayStatus === 'claimable');
  const active     = entries.filter(e => e.displayStatus === 'active');
  const failed     = entries.filter(e => e.displayStatus === 'failed');

  const selEntry = entries.find(e => e.key === selected);

  // 左欄：通用列項渲染
  function EntryRow({ entry }) {
    const isSel = selected === entry.key;
    // 顏色主題
    const theme =
      entry.displayStatus === 'claimable' ? { bg: 'rgba(180,140,40,0.18)', border: '#c09030', color: '#f0c040', selColor: '#f0c040' } :
      entry.displayStatus === 'failed'    ? { bg: 'rgba(200,60,60,0.12)',  border: '#994444', color: '#885555', selColor: '#885555' } :
      entry.type === 'supply'             ? { bg: 'rgba(40,160,120,0.15)', border: '#40b890', color: '#508878', selColor: '#80e8c0' } :
                                            { bg: 'rgba(60,100,255,0.15)', border: '#6090ff', color: '#8898b8', selColor: '#c0d4ff' };
    const icon =
      entry.displayStatus === 'claimable' ? '📬' :
      entry.displayStatus === 'failed'    ? '✕' :
      entry.type === 'supply'             ? '📦' : '◎';

    return (
      <div onClick={() => setSelected(entry.key)} style={{
        padding: '8px 14px', cursor: 'pointer', fontSize: 13,
        background: isSel ? theme.bg : 'transparent',
        borderLeft: isSel ? `3px solid ${theme.border}` : '3px solid transparent',
        color: isSel ? theme.selColor : theme.color,
        transition: 'background 0.1s',
      }}>
        {icon} {entry.title}
        {entry.subtitle && (
          <div style={{ fontSize: 10, color: isSel ? '#50a888' : '#3a6858', marginTop: 1 }}>
            {entry.subtitle}
          </div>
        )}
        {/* 補貨任務：資源持有進度 */}
        {entry.type === 'supply' && (
          <div style={{ fontSize: 10, color: entry.hasEnough ? '#60cc80' : (entry.urgent ? '#ff7060' : '#406858'), marginTop: 2 }}>
            {entry.sq.resourceIcon}{entry.sq.resourceName} {entry.haveQty}/{entry.sq.resourceQty}
            {entry.remaining !== null && <span style={{ marginLeft: 6 }}>⏳{formatMins(entry.remaining)}</span>}
          </div>
        )}
        {/* RPG 任務：剩餘時限 */}
        {entry.type === 'rpg' && entry.remaining !== null && entry.displayStatus === 'active' && (
          <div style={{ fontSize: 10, color: entry.urgent ? '#ff7060' : '#5080a0', marginTop: 2 }}>
            ⏳ {formatMins(entry.remaining)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={OVERLAY} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={PANEL}>

        {/* ── 標題列 ── */}
        <div style={{
          padding: '14px 18px 12px',
          borderBottom: '0.5px solid rgba(100,140,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#c8d8ff' }}>
            📜 任務日誌
            <span style={{ fontSize: 11, color: '#607090', fontWeight: 400, marginLeft: 10 }}>
              進行中 {active.length} · 可交差 {claimable.length}
              {failed.length > 0 && <span style={{ color: '#cc4444', marginLeft: 6 }}>· 失敗 {failed.length}</span>}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#607090',
            cursor: 'pointer', fontSize: 16, padding: '2px 6px',
          }}>✕</button>
        </div>

        {/* ── 主體：左欄清單 + 右欄詳情 ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* 左欄 */}
          <div style={{
            width: 190, flexShrink: 0,
            borderRight: '0.5px solid rgba(100,140,255,0.2)',
            overflowY: 'auto',
            padding: '8px 0',
          }}>
            {entries.length === 0 && (
              <div style={{ padding: '16px 14px', fontSize: 12, color: '#405060' }}>
                尚未接受任何任務
              </div>
            )}

            {claimable.length > 0 && (
              <div style={{ padding: '4px 14px 2px', fontSize: 10, color: '#b09040', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                可交差
              </div>
            )}
            {claimable.map(e => <EntryRow key={e.key} entry={e} />)}

            {active.length > 0 && (
              <div style={{ padding: '8px 14px 2px', fontSize: 10, color: '#6080b0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                進行中
              </div>
            )}
            {active.map(e => <EntryRow key={e.key} entry={e} />)}

            {failed.length > 0 && (
              <div style={{ padding: '8px 14px 2px', fontSize: 10, color: '#804040', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                失敗
              </div>
            )}
            {failed.map(e => <EntryRow key={e.key} entry={e} />)}
          </div>

          {/* 右欄：詳情 */}
          <div style={{ flex: 1, padding: '16px 18px', overflowY: 'auto' }}>
            {!selEntry && (
              <div style={{ color: '#304050', fontSize: 13, marginTop: 20, textAlign: 'center' }}>
                ← 選擇一個任務查看詳情
              </div>
            )}

            {/* 補貨任務詳情 */}
            {selEntry?.type === 'supply' && (() => {
              const { sq, haveQty, hasEnough, remaining, urgent } = selEntry;
              return (
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e0c8', marginBottom: 4 }}>
                    {sq.itemIcon} {sq.itemName} 補貨任務
                  </div>
                  <div style={{ fontSize: 12, color: '#6090a8', marginBottom: 12 }}>
                    委託商店：{sq.shopName}
                  </div>
                  {remaining !== null && (
                    <div style={{
                      display: 'inline-block', fontSize: 11, padding: '2px 8px', marginBottom: 14,
                      borderRadius: 4,
                      background: urgent ? 'rgba(200,60,40,0.15)' : 'rgba(40,80,140,0.2)',
                      border: urgent ? '0.5px solid rgba(200,60,40,0.5)' : '0.5px solid rgba(60,100,200,0.4)',
                      color: urgent ? '#ff7060' : '#80aadd',
                    }}>
                      ⏳ 剩餘 {formatMins(remaining)}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: '#5070a0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    目標
                  </div>
                  <div style={{
                    display: 'flex', gap: 8, fontSize: 13, padding: '5px 0',
                    borderBottom: '0.5px solid rgba(80,100,140,0.12)',
                    color: hasEnough ? '#60cc80' : '#f0c040',
                  }}>
                    <span style={{ flexShrink: 0, width: 14, textAlign: 'center' }}>{hasEnough ? '✓' : '►'}</span>
                    <span style={{ flex: 1 }}>收集 {sq.resourceIcon}{sq.resourceName}</span>
                    <span style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{haveQty}/{sq.resourceQty}</span>
                  </div>
                  <div style={{
                    display: 'flex', gap: 8, fontSize: 13, padding: '5px 0',
                    color: '#405060',
                  }}>
                    <span style={{ flexShrink: 0, width: 14, textAlign: 'center' }}>○</span>
                    <span>前往 {sq.shopName} 交付，補充 {sq.itemIcon}{sq.itemName} ×{sq.outputQty}</span>
                  </div>
                  <div style={{
                    marginTop: 14,
                    background: 'rgba(180,150,40,0.07)',
                    border: '0.5px solid rgba(180,150,40,0.22)',
                    borderRadius: 7, padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 10, color: '#b09040', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                      任務獎勵
                    </div>
                    <span style={{ fontSize: 12, color: '#f0c040' }}>💰 {sq.reward?.gold ?? 0} 金</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#3a5a70', marginTop: 10 }}>
                    帶著資源前往 {sq.shopName}，進入商店即自動交付。
                  </div>
                </div>
              );
            })()}

            {/* RPG 任務詳情 */}
            {selEntry?.type === 'rpg' && (() => {
              const { def, q, remaining, urgent } = selEntry;
              return (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e0c8', marginBottom: 4 }}>
                      {def.title}
                    </div>
                    {q.failed && (
                      <div style={{
                        display: 'inline-block', fontSize: 11, padding: '2px 8px',
                        borderRadius: 4, background: 'rgba(180,40,40,0.2)',
                        border: '0.5px solid rgba(180,40,40,0.5)', color: '#ff7060',
                      }}>
                        💀 任務失敗（超過期限）
                      </div>
                    )}
                    {q.completed && !q.claimed && !q.failed && (
                      <div style={{
                        display: 'inline-block', fontSize: 11, padding: '2px 8px',
                        borderRadius: 4, background: 'rgba(180,140,40,0.2)',
                        border: '0.5px solid rgba(180,140,40,0.5)', color: '#f0c040',
                      }}>
                        📬 回到委託 NPC 交差
                      </div>
                    )}
                    {!q.completed && !q.failed && remaining !== null && (
                      <div style={{
                        display: 'inline-block', fontSize: 11, padding: '2px 8px', marginLeft: 6,
                        borderRadius: 4,
                        background: urgent ? 'rgba(200,60,40,0.15)' : 'rgba(40,80,140,0.2)',
                        border: urgent ? '0.5px solid rgba(200,60,40,0.5)' : '0.5px solid rgba(60,100,200,0.4)',
                        color: urgent ? '#ff7060' : '#80aadd',
                      }}>
                        ⏳ 剩餘 {formatMins(remaining)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#9090a8', lineHeight: 1.7, marginBottom: 16 }}>
                    {def.desc}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: '#5070a0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                      目標
                    </div>
                    {def.steps.map((step, i) => {
                      const status = stepStatus(q, i);
                      const st = STEP_STATUS[status];
                      const hasCount = (step.type === 'kill' || step.type === 'collect') && step.count > 0;
                      const isDone   = hasCount && status === 'done';
                      const cur      = hasCount ? (q.progress?.[i] ?? 0) : null;
                      const display  = hasCount ? (isDone ? step.count : cur) : null;
                      return (
                        <div key={i} style={{
                          display: 'flex', gap: 8, fontSize: 13,
                          padding: '5px 0',
                          borderBottom: '0.5px solid rgba(80,100,140,0.12)',
                          color: st.color,
                        }}>
                          <span style={{ flexShrink: 0, width: 14, textAlign: 'center' }}>{st.icon}</span>
                          <span style={{ flex: 1 }}>{step.desc}</span>
                          {hasCount && (
                            <span style={{ color: isDone ? '#60cc80' : '#f0c040', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                              {display}/{step.count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{
                    background: 'rgba(180,150,40,0.07)',
                    border: '0.5px solid rgba(180,150,40,0.22)',
                    borderRadius: 7, padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 10, color: '#b09040', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                      任務獎勵
                    </div>
                    <RewardRow reward={def.reward} />
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* ── 底部提示 ── */}
        <div style={{
          padding: '8px 18px',
          borderTop: '0.5px solid rgba(100,140,255,0.15)',
          fontSize: 11, color: '#304050',
          display: 'flex', gap: 16,
        }}>
          <span>[Q] 關閉</span>
          <span>回到委託 NPC 按 [E] 交差領獎</span>
        </div>

      </div>
    </div>
  );
}
