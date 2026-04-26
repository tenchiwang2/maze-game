// ─────────────────────────────────────────────
//  StatsPanel.jsx
//  角色屬性面板（分頁版）
//  Tab 1: 基本資料 / Tab 2: 善惡 & 名聲
// ─────────────────────────────────────────────
import { useState } from 'react';
import { getKarmaInfo, getRepInfo, NATIONS, NATION_LABELS, NATION_COLORS } from './reputationSystem.js';

// ── 血條元件 ──────────────────────────────────
function Bar({ cur, max, color, height = 5 }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
  return (
    <div style={{ flex: 1, height, background: 'rgba(255,255,255,0.07)', borderRadius: height, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct * 100}%`,
        background: color, borderRadius: height,
        transition: 'width 0.35s',
      }} />
    </div>
  );
}

// ── 小數值格 ─────────────────────────────────
function Stat({ icon, val, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 2, flex: 1,
      padding: '6px 0',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 6,
      border: `0.5px solid ${color}22`,
    }}>
      <span style={{ fontSize: 10, color: 'rgba(160,170,200,0.50)' }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{val}</span>
    </div>
  );
}

// ── 分頁按鈕 ─────────────────────────────────
function TabButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 0', fontSize: 12, fontWeight: active ? 700 : 400,
      cursor: 'pointer', border: 'none', outline: 'none',
      borderRadius: 0,
      background: active ? 'rgba(100,150,255,0.12)' : 'transparent',
      color: active ? '#aac4ff' : 'rgba(160,170,200,0.45)',
      borderBottom: active ? '2px solid #6699ff' : '2px solid transparent',
      transition: 'color 0.2s, border-color 0.2s',
    }}>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────
export default function StatsPanel({ player, onClose }) {
  const [tab, setTab] = useState(0);

  const karma     = player.karma ?? 0;
  const karmaInfo = getKarmaInfo(karma);
  const karmaPct  = (karma + 1000) / 2000;
  const hpPct     = player.maxHp > 0 ? player.hp / player.maxHp : 0;
  const hpColor   = hpPct > 0.5 ? '#60d090' : hpPct > 0.25 ? '#ffd060' : '#ff5555';

  // ── 性別標示 ──────────────────────────────
  const genderLabel = player.gender === 'female' ? '♀ 女性'
                    : player.gender === 'male'   ? '♂ 男性'
                    : '— 未知';
  const genderColor = player.gender === 'female' ? '#ff88cc'
                    : player.gender === 'male'   ? '#88aaff'
                    : '#888';

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(8,10,20,0.97)',
      border: '1px solid rgba(100,150,255,0.30)',
      borderRadius: 12,
      width: 360, maxWidth: '96%',
      fontFamily: 'var(--font-mono, monospace)',
      zIndex: 10,
      overflow: 'hidden',
    }}>

      {/* ══ 頂部：名字 + 職業 ════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px 10px',
        background: 'rgba(255,255,255,0.025)',
        borderBottom: '1px solid rgba(100,120,180,0.15)',
      }}>
        {/* 名字 */}
        <span style={{ fontSize: 16, fontWeight: 700, color: '#e8eaff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.name ?? '冒險者'}
        </span>

        {/* 職業 badge */}
        <span style={{
          fontSize: 11, fontWeight: 600, color: player.classColor ?? '#888',
          padding: '2px 8px', borderRadius: 4, flexShrink: 0,
          background: `${player.classColor ?? '#555'}18`,
          border: `0.5px solid ${player.classColor ?? '#555'}44`,
        }}>
          {player.classIcon} {player.classLabel}
        </span>

        {/* 關閉按鈕 */}
        <button onClick={onClose} style={{
          flexShrink: 0, fontSize: 11, padding: '4px 10px', borderRadius: 5,
          background: 'rgba(80,80,100,0.30)', border: '0.5px solid rgba(120,130,160,0.35)',
          color: '#888', cursor: 'pointer',
        }}>✕ [C]</button>
      </div>

      {/* ══ 分頁切換列 ════════════════════════════ */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(100,120,180,0.15)',
        background: 'rgba(255,255,255,0.015)',
      }}>
        <TabButton label="📋 基本資料" active={tab === 0} onClick={() => setTab(0)} />
        <TabButton label="⚖ 善惡 & 名聲" active={tab === 1} onClick={() => setTab(1)} />
      </div>

      {/* ══ 分頁內容 ════════════════════════════ */}
      <div style={{ padding: '14px 16px 16px' }}>

        {/* ────────── Tab 0：基本資料 ────────── */}
        {tab === 0 && (
          <>
            {/* 等級 + EXP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#f0d060', lineHeight: 1, flexShrink: 0 }}>
                Lv.{player.lv}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>
                  {player.exp} / {player.lv * 100} EXP
                </div>
                <Bar cur={player.exp} max={player.lv * 100} color='#f0c040' height={4} />
              </div>
            </div>

            {/* 性別 + 職業 */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 12,
            }}>
              {/* 性別 */}
              <div style={{
                flex: 1, padding: '8px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: `0.5px solid ${genderColor}22`,
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 9, color: 'rgba(160,170,200,0.45)', marginBottom: 4 }}>性別</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: genderColor }}>{genderLabel}</div>
              </div>

              {/* 職業 */}
              <div style={{
                flex: 2, padding: '8px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: `0.5px solid ${player.classColor ?? '#555'}22`,
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 9, color: 'rgba(160,170,200,0.45)', marginBottom: 4 }}>職業</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: player.classColor ?? '#aaa' }}>
                  {player.classIcon} {player.classLabel}
                  {player.npcProfession && (
                    <span style={{ fontSize: 10, color: 'rgba(160,170,200,0.45)', marginLeft: 6 }}>
                      ({player.npcProfession})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* HP 條 */}
            <div style={{ marginBottom: 10 }}>
              {[
                { icon: '❤', label: 'HP', cur: player.hp,  max: player.maxHp, color: hpColor },
                { icon: '💧', label: 'MP', cur: player.mp,  max: player.maxMp, color: '#6699ff' },
              ].map(({ icon, label, cur, max, color }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color, fontWeight: 600 }}>{icon} {label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                      {cur}
                      <span style={{ color: 'rgba(200,210,230,0.30)', fontWeight: 400 }}>/{max}</span>
                    </span>
                  </div>
                  <Bar cur={cur} max={max} color={color} height={7} />
                </div>
              ))}
            </div>

            {/* 戰鬥屬性 + 金幣 */}
            <div style={{ display: 'flex', gap: 5 }}>
              <Stat icon="⚔ ATK" val={player.atk} color="#ffcc66" />
              <Stat icon="🛡 DEF" val={player.def} color="#88ddcc" />
              <Stat icon="💨 SPD" val={player.spd} color="#aaffaa" />
              <Stat icon="💰 金幣" val={player.gold} color="#ffd060" />
            </div>
          </>
        )}

        {/* ────────── Tab 1：善惡 & 名聲 ────────── */}
        {tab === 1 && (
          <>
            {/* 善惡質 */}
            <div style={{
              marginBottom: 14,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.025)',
              border: `0.5px solid ${karmaInfo.color}30`,
              borderRadius: 8,
            }}>
              {/* 標題行 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: 'rgba(160,170,200,0.50)', letterSpacing: '0.06em' }}>⚖ 善惡質</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: karmaInfo.color }}>
                  {karmaInfo.icon} {karmaInfo.label}
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: `${karmaInfo.color}cc` }}>
                    {karma > 0 ? '+' : ''}{karma}
                  </span>
                </span>
              </div>
              {/* 漸層軌道 + 指針 */}
              <div style={{
                position: 'relative', height: 10, borderRadius: 5, overflow: 'hidden',
                background: 'linear-gradient(90deg, #991111 0%, #554444 30%, #444455 50%, #334433 70%, #119944 100%)',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.45)',
                  clipPath: `inset(0 ${100 - karmaPct * 100}% 0 0)`,
                  borderRadius: 5,
                }} />
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `calc(${karmaPct * 100}% - 2px)`,
                  width: 4, background: '#fff', borderRadius: 2,
                  boxShadow: `0 0 6px ${karmaInfo.color}`,
                  transition: 'left 0.4s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#555', marginTop: 4 }}>
                <span style={{ color: '#cc4444' }}>惡魔</span>
                <span>中立</span>
                <span style={{ color: '#44aa44' }}>聖人</span>
              </div>
            </div>

            {/* 各國名聲 */}
            <div style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(100,120,180,0.18)',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, color: 'rgba(160,170,200,0.50)', letterSpacing: '0.06em', marginBottom: 10 }}>
                🌍 各國名聲
              </div>
              {NATIONS.map((nation, ni) => {
                const rep    = player.reputation?.[nation] ?? 0;
                const info   = getRepInfo(rep);
                const repPct = (rep + 1000) / 2000;
                const nColor = NATION_COLORS[nation];
                return (
                  <div key={nation} style={{ marginBottom: ni < NATIONS.length - 1 ? 12 : 0 }}>
                    {/* 國家名 + 稱號 + 數值 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: nColor, minWidth: 60 }}>
                        {NATION_LABELS[nation]}
                      </span>
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: 11, color: info.color, fontWeight: 600 }}>
                        {info.label}
                      </span>
                      <span style={{
                        fontSize: 11, color: `${info.color}99`,
                        minWidth: 38, textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {rep > 0 ? '+' : ''}{rep}
                      </span>
                    </div>
                    {/* 名聲軌道 */}
                    <div style={{
                      position: 'relative', height: 6, borderRadius: 3, overflow: 'hidden',
                      background: 'rgba(255,255,255,0.06)',
                    }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${repPct * 100}%`,
                        background: `linear-gradient(90deg, #993333, ${nColor})`,
                        borderRadius: 3,
                        transition: 'width 0.4s',
                      }} />
                      {/* 中線（0 點）標記 */}
                      <div style={{
                        position: 'absolute', left: '50%', top: 0, bottom: 0,
                        width: 1, background: 'rgba(255,255,255,0.20)',
                      }} />
                    </div>
                    {/* 特殊狀態標籤 */}
                    {(info.guardsHostile || info.priceMultiplier !== 1.0) && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {info.guardsHostile && (
                          <span style={{ fontSize: 9, color: '#ff4444' }}>⚠ 衛兵通緝</span>
                        )}
                        {!info.guardsHostile && info.priceMultiplier < 1.0 && (
                          <span style={{ fontSize: 9, color: '#60d090' }}>
                            🎖 商店 {Math.round(info.priceMultiplier * 100)}% 折扣
                          </span>
                        )}
                        {!info.guardsHostile && info.priceMultiplier > 1.0 && (
                          <span style={{ fontSize: 9, color: '#ff9944' }}>
                            ⚠ 商店加價 {Math.round((info.priceMultiplier - 1) * 100)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
