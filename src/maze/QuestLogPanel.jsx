// ─────────────────────────────────────────────
//  QuestLogPanel.jsx
//  任務日誌面板：顯示已接受、進行中、可交差的任務
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

// 將分鐘數轉為「X天X時」可讀字串
function formatMins(mins) {
  if (!Number.isFinite(mins) || mins <= 0) return '已超時';
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}天${h > 0 ? h + '時' : ''}`;
  if (h > 0) return `${h}時${m > 0 ? m + '分' : ''}`;
  return `${m}分`;
}

export default function QuestLogPanel({ questLog, questDefs, totalGameMins = 0, onClose }) {
  const [selected, setSelected] = useState(null);

  // 只顯示未領獎的任務（含失敗）
  const active    = questLog.filter(q => !q.claimed);
  const failed    = active.filter(q => q.failed);
  const inProgress = active.filter(q => !q.completed && !q.failed);
  const claimable  = active.filter(q => q.completed && !q.failed);

  const selectedDef = selected ? questDefs.find(d => d.id === selected) : null;
  const selectedQ   = selected ? active.find(q => q.questId === selected) : null;

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
              進行中 {inProgress.length} · 可交差 {claimable.length}
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
            {active.length === 0 && (
              <div style={{ padding: '16px 14px', fontSize: 12, color: '#405060' }}>
                尚未接受任何任務
              </div>
            )}

            {claimable.length > 0 && (
              <div style={{ padding: '4px 14px 2px', fontSize: 10, color: '#b09040', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                可交差
              </div>
            )}
            {claimable.map(q => {
              const def = questDefs.find(d => d.id === q.questId);
              if (!def) return null;
              return (
                <div key={q.questId} onClick={() => setSelected(q.questId)}
                  style={{
                    padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                    background: selected === q.questId ? 'rgba(180,140,40,0.18)' : 'transparent',
                    borderLeft: selected === q.questId ? '3px solid #c09030' : '3px solid transparent',
                    color: '#f0c040',
                    transition: 'background 0.1s',
                  }}>
                  📬 {def.title}
                </div>
              );
            })}

            {inProgress.length > 0 && (
              <div style={{ padding: '8px 14px 2px', fontSize: 10, color: '#6080b0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                進行中
              </div>
            )}
            {inProgress.map(q => {
              const def = questDefs.find(d => d.id === q.questId);
              if (!def) return null;
              const elapsed   = Number.isFinite(q.acceptedAt) ? totalGameMins - q.acceptedAt : 0;
              const remaining = def.timeLimitMins ? def.timeLimitMins - elapsed : null;
              const urgent = remaining !== null && remaining < 1440; // 少於 1 天顯示警示
              return (
                <div key={q.questId} onClick={() => setSelected(q.questId)}
                  style={{
                    padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                    background: selected === q.questId ? 'rgba(60,100,255,0.15)' : 'transparent',
                    borderLeft: selected === q.questId ? '3px solid #6090ff' : '3px solid transparent',
                    color: selected === q.questId ? '#c0d4ff' : '#8898b8',
                    transition: 'background 0.1s',
                  }}>
                  ◎ {def.title}
                  {remaining !== null && (
                    <div style={{ fontSize: 10, color: urgent ? '#ff7060' : '#5080a0', marginTop: 2 }}>
                      ⏳ {formatMins(remaining)}
                    </div>
                  )}
                </div>
              );
            })}

            {failed.length > 0 && (
              <div style={{ padding: '8px 14px 2px', fontSize: 10, color: '#804040', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                失敗
              </div>
            )}
            {failed.map(q => {
              const def = questDefs.find(d => d.id === q.questId);
              if (!def) return null;
              return (
                <div key={q.questId} onClick={() => setSelected(q.questId)}
                  style={{
                    padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                    background: selected === q.questId ? 'rgba(200,60,60,0.12)' : 'transparent',
                    borderLeft: selected === q.questId ? '3px solid #994444' : '3px solid transparent',
                    color: '#885555',
                    transition: 'background 0.1s',
                  }}>
                  ✕ {def.title}
                </div>
              );
            })}
          </div>

          {/* 右欄：詳情 */}
          <div style={{ flex: 1, padding: '16px 18px', overflowY: 'auto' }}>
            {!selectedDef && (
              <div style={{ color: '#304050', fontSize: 13, marginTop: 20, textAlign: 'center' }}>
                ← 選擇一個任務查看詳情
              </div>
            )}

            {selectedDef && selectedQ && (
              <>
                {/* 標題 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e0c8', marginBottom: 4 }}>
                    {selectedDef.title}
                  </div>
                  {selectedQ.failed && (
                    <div style={{
                      display: 'inline-block', fontSize: 11, padding: '2px 8px',
                      borderRadius: 4, background: 'rgba(180,40,40,0.2)',
                      border: '0.5px solid rgba(180,40,40,0.5)', color: '#ff7060',
                    }}>
                      💀 任務失敗（超過期限）
                    </div>
                  )}
                  {selectedQ.completed && !selectedQ.claimed && !selectedQ.failed && (
                    <div style={{
                      display: 'inline-block', fontSize: 11, padding: '2px 8px',
                      borderRadius: 4, background: 'rgba(180,140,40,0.2)',
                      border: '0.5px solid rgba(180,140,40,0.5)', color: '#f0c040',
                    }}>
                      📬 回到委託 NPC 交差
                    </div>
                  )}
                  {!selectedQ.completed && !selectedQ.failed && selectedDef.timeLimitMins && (() => {
                    const elapsed   = Number.isFinite(selectedQ.acceptedAt) ? totalGameMins - selectedQ.acceptedAt : 0;
                    const remaining = selectedDef.timeLimitMins - elapsed;
                    const urgent = remaining < 1440;
                    return (
                      <div style={{
                        display: 'inline-block', fontSize: 11, padding: '2px 8px', marginLeft: 6,
                        borderRadius: 4,
                        background: urgent ? 'rgba(200,60,40,0.15)' : 'rgba(40,80,140,0.2)',
                        border: urgent ? '0.5px solid rgba(200,60,40,0.5)' : '0.5px solid rgba(60,100,200,0.4)',
                        color: urgent ? '#ff7060' : '#80aadd',
                      }}>
                        ⏳ 剩餘 {formatMins(remaining)}
                      </div>
                    );
                  })()}
                </div>

                {/* 描述 */}
                <div style={{ fontSize: 13, color: '#9090a8', lineHeight: 1.7, marginBottom: 16 }}>
                  {selectedDef.desc}
                </div>

                {/* 步驟 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: '#5070a0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    目標
                  </div>
                  {selectedDef.steps.map((step, i) => {
                    const status = stepStatus(selectedQ, i);
                    const st = STEP_STATUS[status];
                    // kill / collect 步驟都顯示進度計數
                    const hasCount = (step.type === 'kill' || step.type === 'collect') && step.count > 0;
                    const isDone   = hasCount && status === 'done';
                    const current  = hasCount ? (selectedQ.progress?.[i] ?? 0) : null;
                    const display  = hasCount ? (isDone ? step.count : current) : null;
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
                          <span style={{
                            color: isDone ? '#60cc80' : '#f0c040',
                            flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                          }}>
                            {display}/{step.count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 獎勵 */}
                <div style={{
                  background: 'rgba(180,150,40,0.07)',
                  border: '0.5px solid rgba(180,150,40,0.22)',
                  borderRadius: 7, padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 10, color: '#b09040', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                    任務獎勵
                  </div>
                  <RewardRow reward={selectedDef.reward} />
                </div>
              </>
            )}
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
