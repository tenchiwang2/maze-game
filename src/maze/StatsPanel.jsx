// ─────────────────────────────────────────────
//  StatsPanel.jsx
//  角色屬性面板（分頁版）
//  Tab 0: 基本資料 / Tab 1: 善惡 & 名聲 / Tab 2: 關係
// ─────────────────────────────────────────────
import { useState } from 'react';
import { getKarmaInfo, getRepInfo, NATIONS, NATION_LABELS, NATION_COLORS } from './reputationSystem.js';
import { getAffinityInfo, getSpouse, REL_SUBTYPE_LABELS, DECAY_FLOOR } from './relationshipSystem.js';

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

// ── 好感度條（中心 = 0）─────────────────────
function AffinityBar({ affinity, color, height = 5 }) {
  const pct = (affinity + 100) / 200; // 0 → left, 0.5 → center, 1 → right
  const isPos = affinity >= 0;
  return (
    <div style={{ position: 'relative', height, background: 'rgba(255,255,255,0.07)', borderRadius: height, overflow: 'hidden' }}>
      {isPos ? (
        // 正值：從中心往右填
        <div style={{
          position: 'absolute',
          left: '50%', top: 0, bottom: 0,
          width: `${(affinity / 100) * 50}%`,
          background: color, borderRadius: height,
          transition: 'width 0.35s',
        }} />
      ) : (
        // 負值：從中心往左填
        <div style={{
          position: 'absolute',
          right: '50%', top: 0, bottom: 0,
          width: `${(Math.abs(affinity) / 100) * 50}%`,
          background: color, borderRadius: height,
          transition: 'width 0.35s',
        }} />
      )}
      {/* 中心線 */}
      <div style={{
        position: 'absolute', left: '50%', top: 0, bottom: 0,
        width: 1, background: 'rgba(255,255,255,0.25)',
      }} />
      {/* 衰減下限標記 */}
      <div style={{
        position: 'absolute',
        left: `${((DECAY_FLOOR + 100) / 200) * 100}%`,
        top: 0, bottom: 0,
        width: 1, background: 'rgba(255,220,100,0.30)',
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
      flex: 1, padding: '7px 0', fontSize: 11, fontWeight: active ? 700 : 400,
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

  const genderLabel = player.gender === 'female' ? '♀ 女性'
                    : player.gender === 'male'   ? '♂ 男性'
                    : '— 未知';
  const genderColor = player.gender === 'female' ? '#ff88cc'
                    : player.gender === 'male'   ? '#88aaff'
                    : '#888';

  // 關係列表（按好感度由高至低排序）
  const relEntries = Object.entries(player.relationships ?? {})
    .sort((a, b) => b[1].affinity - a[1].affinity);
  const spouse = getSpouse(player);

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
        <span style={{
          fontSize: 16, fontWeight: 700, color: '#e8eaff',
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {player.name ?? '冒險者'}
        </span>

        <span style={{
          fontSize: 11, fontWeight: 600, color: player.classColor ?? '#888',
          padding: '2px 8px', borderRadius: 4, flexShrink: 0,
          background: `${player.classColor ?? '#555'}18`,
          border: `0.5px solid ${player.classColor ?? '#555'}44`,
        }}>
          {player.classIcon} {player.classLabel}
        </span>

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
        <TabButton label="👥 關係" active={tab === 2} onClick={() => setTab(2)} />
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{
                flex: 1, padding: '8px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: `0.5px solid ${genderColor}22`,
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 9, color: 'rgba(160,170,200,0.45)', marginBottom: 4 }}>性別</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: genderColor }}>{genderLabel}</div>
              </div>
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

            {/* HP / MP 條 */}
            <div style={{ marginBottom: 10 }}>
              {[
                { icon: '❤', label: 'HP', cur: player.hp,  max: player.maxHp, color: hpColor },
                { icon: '💧', label: 'MP', cur: player.mp,  max: player.maxMp, color: '#6699ff' },
              ].map(({ icon, label, cur, max, color }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color, fontWeight: 600 }}>{icon} {label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                      {cur}<span style={{ color: 'rgba(200,210,230,0.30)', fontWeight: 400 }}>/{max}</span>
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
              marginBottom: 14, padding: '10px 12px',
              background: 'rgba(255,255,255,0.025)',
              border: `0.5px solid ${karmaInfo.color}30`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: 'rgba(160,170,200,0.50)', letterSpacing: '0.06em' }}>⚖ 善惡質</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: karmaInfo.color }}>
                  {karmaInfo.icon} {karmaInfo.label}
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: `${karmaInfo.color}cc` }}>
                    {karma > 0 ? '+' : ''}{karma}
                  </span>
                </span>
              </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: nColor, minWidth: 60 }}>
                        {NATION_LABELS[nation]}
                      </span>
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: 11, color: info.color, fontWeight: 600 }}>{info.label}</span>
                      <span style={{ fontSize: 11, color: `${info.color}99`, minWidth: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {rep > 0 ? '+' : ''}{rep}
                      </span>
                    </div>
                    <div style={{ position: 'relative', height: 6, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${repPct * 100}%`,
                        background: `linear-gradient(90deg, #993333, ${nColor})`,
                        borderRadius: 3, transition: 'width 0.4s',
                      }} />
                      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.20)' }} />
                    </div>
                    {(info.guardsHostile || info.priceMultiplier !== 1.0) && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {info.guardsHostile && <span style={{ fontSize: 9, color: '#ff4444' }}>⚠ 衛兵通緝</span>}
                        {!info.guardsHostile && info.priceMultiplier < 1.0 && (
                          <span style={{ fontSize: 9, color: '#60d090' }}>🎖 商店 {Math.round(info.priceMultiplier * 100)}% 折扣</span>
                        )}
                        {!info.guardsHostile && info.priceMultiplier > 1.0 && (
                          <span style={{ fontSize: 9, color: '#ff9944' }}>⚠ 商店加價 {Math.round((info.priceMultiplier - 1) * 100)}%</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ────────── Tab 2：關係 ────────── */}
        {tab === 2 && (
          <>
            {/* 配偶橫幅（已婚才顯示）*/}
            {spouse && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 12,
                background: 'rgba(255,180,100,0.08)',
                border: '0.5px solid rgba(255,180,100,0.30)',
                borderRadius: 8,
              }}>
                <span style={{ fontSize: 18 }}>💍</span>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,200,120,0.60)', marginBottom: 2 }}>配偶</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffcc88' }}>{spouse.name}</div>
                </div>
              </div>
            )}

            {/* 關係列表 */}
            {relEntries.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px 0',
                color: 'rgba(160,170,200,0.30)', fontSize: 12,
              }}>
                尚無關係紀錄
                <div style={{ fontSize: 10, marginTop: 6, color: 'rgba(160,170,200,0.20)' }}>
                  與 NPC 對話、完成任務、送禮後將累積好感度
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {relEntries.map(([id, rel]) => {
                  const info    = getAffinityInfo(rel.affinity);
                  const isFamily = rel.type === 'family';
                  const isRomance = rel.type === 'romance';
                  const subtypeLabel = rel.subtype ? REL_SUBTYPE_LABELS[rel.subtype] : null;

                  return (
                    <div key={id} style={{
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.025)',
                      border: `0.5px solid ${info.color}22`,
                      borderRadius: 7,
                    }}>
                      {/* 名字行 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#dde0f0', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rel.targetName}
                        </span>
                        {/* 類型標籤 */}
                        {isFamily && subtypeLabel && (
                          <span style={{ fontSize: 9, color: '#ffcc88', background: 'rgba(255,200,100,0.10)', padding: '1px 5px', borderRadius: 3, border: '0.5px solid rgba(255,200,100,0.20)' }}>
                            👨‍👩‍👧 {subtypeLabel}
                          </span>
                        )}
                        {isRomance && rel.flags?.married && (
                          <span style={{ fontSize: 9, color: '#ffaa88', background: 'rgba(255,150,100,0.10)', padding: '1px 5px', borderRadius: 3, border: '0.5px solid rgba(255,150,100,0.20)' }}>
                            💍 配偶
                          </span>
                        )}
                        {isRomance && rel.flags?.engaged && !rel.flags?.married && (
                          <span style={{ fontSize: 9, color: '#ffdd88', background: 'rgba(255,220,100,0.10)', padding: '1px 5px', borderRadius: 3, border: '0.5px solid rgba(255,220,100,0.20)' }}>
                            💌 訂婚
                          </span>
                        )}
                        {/* 好感等級 */}
                        <span style={{ fontSize: 11, fontWeight: 700, color: info.color, flexShrink: 0 }}>
                          {info.icon} {rel.affinity > 0 ? '+' : ''}{rel.affinity}
                        </span>
                      </div>

                      {/* 好感度條 */}
                      <AffinityBar affinity={rel.affinity} color={info.color} height={5} />

                      {/* 等級標籤 + 衰減提示 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginTop: 3 }}>
                        <span style={{ color: info.color }}>{info.label}</span>
                        {rel.affinity > DECAY_FLOOR && (
                          <span style={{ color: 'rgba(255,220,100,0.35)' }}>↓ 會緩慢衰減</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
