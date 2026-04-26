// ─────────────────────────────────────────────
//  ProposePanel.jsx
//  告白 / 婚禮 / 婚姻管理 面板
//  mode: 'propose' | 'wedding' | 'married'
// ─────────────────────────────────────────────
import { useState } from 'react';
import { getAffinityInfo } from './relationshipSystem.js';

// 根據好感決定 NPC 的反應提示
function npcHint(affinity) {
  if (affinity >= 90) return { text: '眼神中充滿期待…', color: '#ffd700' };
  if (affinity >= 75) return { text: '似乎對你有著特別的感情', color: '#88ff88' };
  return { text: '看起來有些猶豫…', color: '#ffaa44' };
}

// 根據好感計算接受機率
function acceptChance(affinity) {
  if (affinity >= 90) return 0.95;
  if (affinity >= 75) return 0.80;
  return 0.60;
}

export default function ProposePanel({ player, targetNPC, mode, nearTown, onResult, onClose }) {
  const [phase, setPhase] = useState('confirm'); // 'confirm' | 'result'
  const [accepted, setAccepted] = useState(null);

  const rel       = player.relationships?.[targetNPC.id];
  const affinity  = rel?.affinity ?? 0;
  const afInfo    = getAffinityInfo(affinity);
  const hint      = npcHint(affinity);

  // ── 告白確認 ───────────────────────────────
  function doPropose() {
    const roll = Math.random();
    const ok   = roll < acceptChance(affinity);
    setAccepted(ok);
    setPhase('result');
    onResult({ type: 'propose', accepted: ok });
  }

  // ── 婚禮確認 ───────────────────────────────
  function doWedding() {
    setPhase('result');
    setAccepted(true);
    onResult({ type: 'wedding' });
  }

  // ── 離婚確認 ───────────────────────────────
  function doDivorce() {
    onResult({ type: 'divorce' });
  }

  // ─────────────────────────────────────────
  const borderColor =
    mode === 'married' ? 'rgba(255,100,100,0.35)' :
    mode === 'wedding' ? 'rgba(255,220,100,0.40)' :
                         'rgba(255,150,200,0.35)';

  const headerBg =
    mode === 'married' ? 'rgba(255,100,100,0.06)' :
    mode === 'wedding' ? 'rgba(255,220,100,0.07)' :
                         'rgba(255,150,200,0.07)';

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(8,10,20,0.97)',
      border: `1px solid ${borderColor}`,
      borderRadius: 12, width: 320, maxWidth: '96%',
      fontFamily: 'var(--font-mono, monospace)',
      zIndex: 12,
      overflow: 'hidden',
    }}>

      {/* 頂部 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px 10px',
        background: headerBg,
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <span style={{ fontSize: 20 }}>{targetNPC.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaff' }}>{targetNPC.name}</div>
          <div style={{ fontSize: 10, color: afInfo.color }}>
            {afInfo.icon} {afInfo.label}（{affinity > 0 ? '+' : ''}{affinity}）
          </div>
        </div>
        <button onClick={onClose} style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 4,
          background: 'rgba(80,80,100,0.30)', border: '0.5px solid rgba(120,130,160,0.35)',
          color: '#888', cursor: 'pointer',
        }}>✕</button>
      </div>

      <div style={{ padding: '16px 16px 18px' }}>

        {/* ── 告白模式 ── */}
        {mode === 'propose' && phase === 'confirm' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>💌</div>
              <div style={{ fontSize: 12, color: '#e8eaff', marginBottom: 6 }}>
                向 <span style={{ color: '#ffaadd', fontWeight: 700 }}>{targetNPC.name}</span> 告白
              </div>
              <div style={{ fontSize: 11, color: hint.color, marginBottom: 12 }}>
                「{hint.text}」
              </div>
              <div style={{
                fontSize: 10, color: 'rgba(160,170,200,0.40)',
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 6, marginBottom: 4,
              }}>
                成功後進入訂婚狀態，再次按 [P] 可舉行婚禮
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={doPropose} style={{
                flex: 1, padding: '9px 0', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(255,150,200,0.15)', border: '0.5px solid rgba(255,150,200,0.40)',
                color: '#ffaadd', fontWeight: 700, fontSize: 12,
              }}>
                💝 告白
              </button>
              <button onClick={onClose} style={{
                flex: 1, padding: '9px 0', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(80,80,100,0.20)', border: '0.5px solid rgba(120,130,160,0.25)',
                color: '#888', fontSize: 12,
              }}>
                算了
              </button>
            </div>
          </>
        )}

        {/* ── 告白結果 ── */}
        {mode === 'propose' && phase === 'result' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>
              {accepted ? '💕' : '💔'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: accepted ? '#ffaadd' : '#ff7777', marginBottom: 8 }}>
              {accepted ? '成功！進入訂婚狀態' : '被拒絕了…'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(160,170,200,0.55)', marginBottom: 16 }}>
              {accepted
                ? `「我也… 我也喜歡你。」`
                : `「…對不起，我沒有那樣的感情。」`}
            </div>
            <button onClick={onClose} style={{
              padding: '8px 24px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(100,150,255,0.15)', border: '0.5px solid rgba(100,150,255,0.35)',
              color: '#aac4ff', fontSize: 12,
            }}>
              關閉
            </button>
          </div>
        )}

        {/* ── 婚禮模式 ── */}
        {mode === 'wedding' && phase === 'confirm' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💍</div>
              <div style={{ fontSize: 12, color: '#e8eaff', marginBottom: 6 }}>
                與 <span style={{ color: '#ffd700', fontWeight: 700 }}>{targetNPC.name}</span> 舉行婚禮
              </div>
              {!nearTown && (
                <div style={{
                  fontSize: 10, color: '#ffaa44',
                  padding: '5px 10px', borderRadius: 5, marginBottom: 8,
                  background: 'rgba(255,170,68,0.08)',
                  border: '0.5px solid rgba(255,170,68,0.25)',
                }}>
                  ⚠ 建議在城鎮中舉行婚禮
                </div>
              )}
              <div style={{
                fontSize: 10, color: 'rgba(160,170,200,0.40)',
                padding: '6px 10px', background: 'rgba(255,255,255,0.03)',
                borderRadius: 6, lineHeight: 1.6,
              }}>
                婚後獲得：最大 HP +5%、EXP 獲得 +3%
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={doWedding} style={{
                flex: 1, padding: '9px 0', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(255,220,100,0.15)', border: '0.5px solid rgba(255,220,100,0.45)',
                color: '#ffd700', fontWeight: 700, fontSize: 12,
              }}>
                💒 舉行婚禮
              </button>
              <button onClick={onClose} style={{
                flex: 1, padding: '9px 0', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(80,80,100,0.20)', border: '0.5px solid rgba(120,130,160,0.25)',
                color: '#888', fontSize: 12,
              }}>
                再等等
              </button>
            </div>
          </>
        )}

        {/* ── 婚禮完成 ── */}
        {mode === 'wedding' && phase === 'result' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🎊</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffd700', marginBottom: 8 }}>
              恭喜！已結為連理
            </div>
            <div style={{ fontSize: 11, color: 'rgba(160,170,200,0.55)', marginBottom: 8 }}>
              「我會一直在你身邊的。」
            </div>
            <div style={{ fontSize: 10, color: '#60d090', marginBottom: 16 }}>
              ✨ 最大 HP +5%　⭐ EXP 獲得 +3%
            </div>
            <button onClick={onClose} style={{
              padding: '8px 24px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(255,220,100,0.15)', border: '0.5px solid rgba(255,220,100,0.35)',
              color: '#ffd700', fontSize: 12,
            }}>
              關閉
            </button>
          </div>
        )}

        {/* ── 婚姻管理（已婚）── */}
        {mode === 'married' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>💍</div>
              <div style={{ fontSize: 12, color: '#ffcc88' }}>
                你與 <span style={{ fontWeight: 700 }}>{targetNPC.name}</span> 已婚
              </div>
              <div style={{ fontSize: 10, color: '#60d090', marginTop: 6 }}>
                ✨ 最大 HP +5%　⭐ EXP 獲得 +3%
              </div>
            </div>
            {/* 離婚按鈕 */}
            <div style={{
              padding: '10px 12px', borderRadius: 7, marginTop: 4,
              background: 'rgba(255,80,80,0.06)',
              border: '0.5px solid rgba(255,80,80,0.20)',
            }}>
              <div style={{ fontSize: 10, color: 'rgba(255,100,100,0.60)', marginBottom: 8 }}>
                ⚠ 離婚後好感 -40，婚姻加成消失
              </div>
              <button onClick={doDivorce} style={{
                width: '100%', padding: '7px 0', borderRadius: 5, cursor: 'pointer',
                background: 'rgba(255,80,80,0.12)', border: '0.5px solid rgba(255,80,80,0.35)',
                color: '#ff7777', fontSize: 11,
              }}>
                💔 提出離婚
              </button>
            </div>
            <button onClick={onClose} style={{
              width: '100%', padding: '7px 0', borderRadius: 5, cursor: 'pointer', marginTop: 8,
              background: 'rgba(80,80,100,0.20)', border: '0.5px solid rgba(120,130,160,0.25)',
              color: '#888', fontSize: 11,
            }}>
              關閉
            </button>
          </>
        )}

      </div>
    </div>
  );
}
