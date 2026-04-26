// ─────────────────────────────────────────────
//  DebugPanel.jsx
//  開發者調試面板 — 按 ` (Backtick) 或 F2 開啟
//  包含：角色切換、地圖重生、迷宮參數、作弊工具、傳送、時間快進
// ─────────────────────────────────────────────
import { useState } from 'react';
import { FACTORIES, FACTORY_IDS } from './mazeFactory.jsx';
import { WORLD_FACTORIES } from './worldFactory.jsx';
import { getAdventurerStatusLabel, getAdventurerStatusColor } from './adventurerState.js';
import { PROFESSIONS } from './world/npcs.js';
import { getKarmaInfo, getRepInfo, NATIONS, NATION_LABELS, NATION_COLORS } from './reputationSystem.js';

// ── 面板分頁 ──────────────────────────────────
const TABS = [
  { id: 'char',  label: '👤 角色' },
  { id: 'world', label: '🗺 世界' },
  { id: 'maze',  label: '🏛 迷宮' },
  { id: 'cheat', label: '🎮 作弊' },
  { id: 'tp',    label: '⚡ 傳送' },
  { id: 'time',  label: '⏰ 時間' },
];

const S = {
  panel: {
    position: 'fixed',
    top: 60,
    right: 20,
    width: 340,
    maxHeight: 'calc(100vh - 80px)',
    overflowY: 'auto',
    background: 'rgba(10,12,18,0.97)',
    border: '1.5px solid rgba(120,180,255,0.30)',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    zIndex: 9800,
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px 0',
    borderBottom: '1px solid rgba(120,180,255,0.18)',
    paddingBottom: 8,
    marginBottom: 0,
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'rgba(120,180,255,0.85)',
    textTransform: 'uppercase',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(200,200,220,0.5)',
    cursor: 'pointer',
    fontSize: 16,
    padding: '0 4px',
    lineHeight: 1,
  },
  tabs: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid rgba(120,180,255,0.14)',
    overflowX: 'auto',
  },
  tab: (active) => ({
    padding: '6px 11px',
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    color: active ? '#80c8ff' : 'rgba(180,190,210,0.55)',
    background: active ? 'rgba(80,160,255,0.12)' : 'none',
    border: 'none',
    borderBottom: active ? '2px solid #80c8ff' : '2px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }),
  body: {
    padding: '14px 14px 16px',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'rgba(180,190,220,0.45)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: 'rgba(190,200,220,0.75)',
    minWidth: 72,
    flexShrink: 0,
  },
  btn: (color = '#80c8ff') => ({
    padding: '5px 12px',
    borderRadius: 6,
    border: `1px solid ${color}44`,
    background: `${color}18`,
    color: color,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  }),
  dangerBtn: {
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,100,100,0.35)',
    background: 'rgba(255,80,80,0.12)',
    color: '#ff8888',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  successBtn: {
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid rgba(80,200,120,0.35)',
    background: 'rgba(80,200,120,0.12)',
    color: '#60d090',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  slider: {
    flex: 1,
    accentColor: '#4a90d9',
  },
  val: {
    fontSize: 12,
    fontWeight: 600,
    minWidth: 24,
    textAlign: 'right',
    color: 'var(--color-text-primary)',
  },
};

// ── SliderRow helper ──────────────────────────
function SliderRow({ label, value, set, min, max, step = 1 }) {
  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => set(Number(e.target.value))}
        style={S.slider}
      />
      <span style={S.val}>{value}</span>
    </div>
  );
}

// ── FactoryChip helper ────────────────────────
function FactoryChip({ f, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={f.description}
      style={{
        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        background: active ? 'rgba(80,160,255,0.22)' : 'rgba(60,70,90,0.40)',
        color: active ? '#80c8ff' : 'rgba(180,190,220,0.60)',
        border: active ? '1px solid rgba(80,160,255,0.45)' : '1px solid rgba(80,90,110,0.45)',
      }}
    >
      {f.label}
    </button>
  );
}

// ─────────────────────────────────────────────
export default function DebugPanel({
  // world
  worldSeed, onRegenMap,
  worldFactoryId, setWorldFactoryId,
  // maze
  cols, setCols,
  rows, setRows,
  randomCount, setRandomCount,
  minRoom, setMinRoom,
  maxRoom, setMaxRoom,
  defaultDoorCount, setDefaultDoorCount,
  defaultDoorOpen, setDefaultDoorOpen,
  factoryMode, setFactoryMode,
  onRegenMaze,
  // cheats
  cheatFullMap, onToggleFullMap,
  onAddGold,
  onFillHpMp,
  onAddExp,
  onAdjustKarma,
  onAdjustReputation,
  playerStats,
  // adventurers
  adventurerList,
  activeAdvId,
  onSwitchAdventurer,
  npcDefs,
  // teleport
  locations,
  onTeleport,
  // time
  gameTime, onAdvanceTime,
  formatTimeFn,
  // misc
  onClose,
}) {
  const [tab, setTab] = useState('world');
  const [selectedAdvId, setSelectedAdvId] = useState(null);

  return (
    <div style={S.panel} onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.title}>⚙ DEBUG PANEL</span>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={S.body}>

        {/* ── 角色切換 ─────────────────────────── */}
        {tab === 'char' && (
          <div>
            <div style={S.sectionLabel}>冒險者列表（點擊展開詳情）</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(adventurerList ?? []).map(adv => {
                const isActive  = adv.id === activeAdvId;
                const isExpanded = adv.id === selectedAdvId;
                const hpPct  = adv.maxHp > 0 ? adv.hp / adv.maxHp : 0;
                const hpColor = hpPct > 0.5 ? '#60d090' : hpPct > 0.25 ? '#ffd060' : '#ff6666';
                const statusLabel = getAdventurerStatusLabel(adv);
                const statusColor = getAdventurerStatusColor(adv);

                return (
                  <div key={adv.id} style={{
                    borderRadius: 8,
                    background: isActive ? 'rgba(80,160,255,0.13)' : 'rgba(30,35,50,0.60)',
                    border: isActive
                      ? '1.5px solid rgba(80,160,255,0.45)'
                      : isExpanded
                        ? '1px solid rgba(120,140,180,0.45)'
                        : '1px solid rgba(70,80,100,0.35)',
                    overflow: 'hidden',
                  }}>
                    {/* ── 卡片頭部（可點擊折疊） ── */}
                    <button
                      onClick={() => setSelectedAdvId(isExpanded ? null : adv.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '8px 12px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {/* 頭像 */}
                      <span style={{ fontSize: 22, lineHeight: 1, minWidth: 28, textAlign: 'center' }}>
                        {adv.portrait}
                      </span>
                      {/* 資訊 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                          <span style={{
                            fontSize: 13, fontWeight: 600,
                            color: isActive ? '#80c8ff' : 'var(--color-text-primary)',
                          }}>
                            {adv.name}
                          </span>
                          <span style={{ fontSize: 10, color: adv.classColor ?? '#888' }}>
                            {adv.classIcon} {adv.classLabel}
                          </span>
                          <span style={{ fontSize: 10, color: 'rgba(160,170,200,0.55)', marginLeft: 'auto' }}>
                            Lv.{adv.lv}
                          </span>
                        </div>
                        {/* HP 血條 */}
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
                          <div style={{ height: '100%', width: `${hpPct * 100}%`, background: hpColor, borderRadius: 2 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'rgba(160,170,200,0.60)' }}>
                          <span style={{ color: hpColor }}>❤ {adv.hp}/{adv.maxHp}</span>
                          <span>💧 {adv.mp}/{adv.maxMp}</span>
                          {isActive
                            ? <span style={{ color: '#80c8ff', marginLeft: 'auto' }}>🎮 操控中</span>
                            : <span style={{ color: statusColor, marginLeft: 'auto' }}>{statusLabel}</span>
                          }
                        </div>
                      </div>
                      {/* 折疊箭頭 */}
                      <span style={{ fontSize: 10, color: 'rgba(160,170,200,0.40)', paddingLeft: 4 }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </button>

                    {/* ── 展開詳情 ── */}
                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid rgba(100,110,140,0.20)',
                        padding: '10px 12px 12px',
                      }}>
                        {/* 屬性格 */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '4px 0', fontSize: 11,
                          background: 'rgba(20,25,38,0.50)',
                          borderRadius: 6, padding: '6px 10px',
                          marginBottom: 8,
                          color: 'rgba(190,200,220,0.80)',
                        }}>
                          <span>⚔ ATK {adv.atk ?? '—'}</span>
                          <span>🛡 DEF {adv.def ?? '—'}</span>
                          <span>💨 SPD {adv.spd ?? '—'}</span>
                          <span>🏆 {adv.totalDungeons ?? 0} 次地城</span>
                          <span style={{ gridColumn: 'span 2' }}>💰 累計 {adv.totalGoldEarned ?? 0} 金</span>
                        </div>

                        {/* HP / MP 數字條 */}
                        <div style={{ marginBottom: 10 }}>
                          {[
                            { label: 'HP', cur: adv.hp, max: adv.maxHp, color: hpColor },
                            { label: 'MP', cur: adv.mp, max: adv.maxMp, color: '#60aaff' },
                          ].map(({ label, cur, max, color }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: 'rgba(160,170,200,0.55)', minWidth: 20 }}>{label}</span>
                              <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${max > 0 ? cur / max * 100 : 0}%`, background: color, borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 10, color, minWidth: 52, textAlign: 'right', fontFamily: 'monospace' }}>
                                {cur}/{max}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* 行動紀錄 */}
                        {adv.actionLog && adv.actionLog.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ ...S.sectionLabel, marginBottom: 5 }}>近期動態</div>
                            <div style={{
                              background: 'rgba(15,18,28,0.70)',
                              border: '1px solid rgba(80,90,120,0.25)',
                              borderRadius: 6, padding: '6px 8px',
                              maxHeight: 130, overflowY: 'auto',
                            }}>
                              {adv.actionLog.slice(0, 10).map((entry, i) => (
                                <div key={i} style={{
                                  display: 'flex', gap: 6, fontSize: 10,
                                  color: 'rgba(180,190,215,0.75)',
                                  marginBottom: i < adv.actionLog.length - 1 ? 4 : 0,
                                  lineHeight: 1.4,
                                }}>
                                  <span style={{ color: 'rgba(150,160,180,0.45)', flexShrink: 0, fontFamily: 'monospace' }}>
                                    {formatTimeFn ? formatTimeFn(entry.time) : `${entry.time}m`}
                                  </span>
                                  <span>{entry.msg}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 操控按鈕 */}
                        {!isActive && (
                          <button
                            style={{
                              ...S.btn('#80c8ff'),
                              width: '100%', textAlign: 'center',
                              display: 'block',
                            }}
                            onClick={() => {
                              onSwitchAdventurer?.(adv.id);
                              setSelectedAdvId(null);
                            }}
                          >
                            🎮 切換操控
                          </button>
                        )}
                        {isActive && (
                          <div style={{
                            textAlign: 'center', fontSize: 11,
                            color: '#80c8ff', padding: '4px 0',
                          }}>
                            🎮 目前操控中
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(160,170,190,0.40)', lineHeight: 1.6 }}>
              切換角色後，當前角色狀態自動儲存。<br />
              非操控角色由 AI 自動冒險。
            </div>

            {/* ── 世界人物 NPC ── */}
            {npcDefs && npcDefs.length > 0 && (() => {
              // 已轉換為冒險者的 NPC id 集合
              const advIds = new Set((adventurerList ?? []).map(a => a.id));
              // 未轉換的 NPC（還在世界上的身份）
              const unconverted = npcDefs.filter(n => !advIds.has(n.id));
              if (unconverted.length === 0) return null;

              // 依國家分組
              const groups = {};
              for (const n of unconverted) {
                const key = n.nation ?? '無國籍';
                if (!groups[key]) groups[key] = [];
                groups[key].push(n);
              }
              const NATION_LABELS = { ys: '亞薩王國', desert: '沙漠帝國', snow: '雪域聯盟', '無國籍': '無國籍' };
              const ALIGNMENT_COLOR = { friendly: '#60d090', neutral: '#ffd060', hostile: '#ff7777' };
              const ALIGNMENT_LABEL = { friendly: '友善', neutral: '中立', hostile: '敵對' };

              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ ...S.sectionLabel, marginBottom: 8 }}>世界人物（點擊切換操控）</div>
                  {Object.entries(groups).map(([nation, npcs]) => (
                    <div key={nation} style={{ marginBottom: 12 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                        color: 'rgba(160,170,200,0.50)', textTransform: 'uppercase',
                        marginBottom: 5,
                      }}>
                        {NATION_LABELS[nation] ?? nation}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {npcs.map(npc => {
                          const prof    = PROFESSIONS[npc.profession];
                          const isSelected = npc.id === selectedAdvId;
                          const aColor  = ALIGNMENT_COLOR[npc.alignment] ?? '#888';
                          return (
                            <div key={npc.id} style={{
                              borderRadius: 7,
                              background: isSelected ? 'rgba(60,70,100,0.70)' : 'rgba(25,30,45,0.60)',
                              border: isSelected
                                ? '1px solid rgba(120,140,190,0.45)'
                                : '1px solid rgba(60,70,95,0.35)',
                              overflow: 'hidden',
                            }}>
                              {/* 卡片頭 */}
                              <button
                                onClick={() => setSelectedAdvId(isSelected ? null : npc.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  width: '100%', padding: '6px 10px',
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{npc.icon}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                      {npc.name}
                                    </span>
                                    <span style={{ fontSize: 10, color: prof?.color ?? '#888' }}>
                                      {prof?.label ?? npc.profession}
                                    </span>
                                    <span style={{ fontSize: 10, color: aColor, marginLeft: 'auto' }}>
                                      {ALIGNMENT_LABEL[npc.alignment] ?? ''}
                                    </span>
                                  </div>
                                </div>
                                <span style={{ fontSize: 10, color: 'rgba(160,170,200,0.35)' }}>
                                  {isSelected ? '▲' : '▼'}
                                </span>
                              </button>

                              {/* 展開：切換操控按鈕 */}
                              {isSelected && (
                                <div style={{
                                  borderTop: '1px solid rgba(80,90,120,0.20)',
                                  padding: '8px 10px',
                                }}>
                                  <div style={{
                                    fontSize: 11, color: 'rgba(180,190,215,0.60)',
                                    marginBottom: 7, lineHeight: 1.4,
                                  }}>
                                    {npc.moveType === 'STATIONARY' && '📍 固定位置'}
                                    {npc.moveType === 'LOCAL' && `🚶 城鎮內遊走 (${npc.moveRadius ?? '?'} 格)`}
                                    {npc.moveType === 'REGIONAL' && `🗺 區域巡邏 (${npc.moveRadius ?? '?'} 格)`}
                                    {npc.moveType === 'LONG_HAUL' && '🐪 跨城移動'}
                                    {npc.moveType === 'FREE_ROAM' && '🌍 全地圖漫遊'}
                                    {npc.schedule && ` ⏰ ${npc.schedule.activeStart}:00–${npc.schedule.activeEnd}:00`}
                                  </div>
                                  <button
                                    style={{ ...S.btn(aColor), width: '100%', textAlign: 'center', display: 'block' }}
                                    onClick={() => {
                                      onSwitchAdventurer?.(npc.id);
                                      setSelectedAdvId(null);
                                    }}
                                  >
                                    🎮 切換操控 {npc.name}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── 世界地圖 ──────────────────────────── */}
        {tab === 'world' && (
          <div>
            <div style={S.sectionLabel}>世界工廠</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {WORLD_FACTORIES.map(f => (
                <FactoryChip
                  key={f.id} f={f}
                  active={worldFactoryId === f.id}
                  onClick={() => setWorldFactoryId(f.id)}
                />
              ))}
            </div>

            <div style={S.sectionLabel}>地圖種子</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,210,230,0.80)', fontFamily: 'monospace' }}>
                #{worldSeed}
              </span>
              <button style={S.btn('#60d090')} onClick={onRegenMap}>🎲 重新產生</button>
            </div>

            <div style={{
              fontSize: 11, color: 'rgba(160,170,190,0.50)',
              borderTop: '1px solid rgba(100,110,140,0.20)', paddingTop: 10,
            }}>
              切換工廠或點擊重新產生後，世界地圖將即時刷新。<br />
              種子固定時，相同種子產生相同地形。
            </div>
          </div>
        )}

        {/* ── 迷宮參數 ──────────────────────────── */}
        {tab === 'maze' && (
          <div>
            <div style={S.sectionLabel}>迷宮工廠</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {FACTORIES.map(f => (
                <FactoryChip
                  key={f.id} f={f}
                  active={factoryMode === f.id}
                  onClick={() => { setFactoryMode(f.id); onRegenMaze(); }}
                />
              ))}
            </div>

            <div style={S.sectionLabel}>地圖尺寸</div>
            <SliderRow label="地圖寬（cols）" value={cols} set={setCols} min={6} max={26} />
            <SliderRow label="地圖高（rows）" value={rows} set={setRows} min={6} max={30} />

            <div style={{ ...S.sectionLabel, marginTop: 12 }}>房間設定</div>
            <SliderRow
              label="隨機房間數"
              value={randomCount}
              set={setRandomCount}
              min={0} max={12}
            />
            <SliderRow
              label="房間最小"
              value={minRoom}
              set={v => { setMinRoom(v); if (v > maxRoom) setMaxRoom(v); }}
              min={2} max={8}
            />
            <SliderRow
              label="房間最大"
              value={maxRoom}
              set={v => { setMaxRoom(v); if (v < minRoom) setMinRoom(v); }}
              min={2} max={10}
            />

            <div style={{ ...S.sectionLabel, marginTop: 12 }}>門設定</div>
            <SliderRow label="預設門數量" value={defaultDoorCount} set={setDefaultDoorCount} min={1} max={4} />
            <div style={{ ...S.row, marginBottom: 10 }}>
              <span style={S.label}>預設開啟</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={defaultDoorOpen}
                  onChange={e => setDefaultDoorOpen(e.target.checked)}
                  style={{ accentColor: '#4a90d9', width: 14, height: 14 }}
                />
                <span style={{ fontSize: 12, color: defaultDoorOpen ? '#60d090' : 'rgba(180,190,220,0.55)' }}>
                  {defaultDoorOpen ? '開啟' : '關閉'}
                </span>
              </label>
            </div>

            <button
              style={{ ...S.btn('#80c8ff'), width: '100%', justifyContent: 'center', marginTop: 4 }}
              onClick={onRegenMaze}
            >
              🔄 重新產生迷宮
            </button>
          </div>
        )}

        {/* ── 作弊工具 ──────────────────────────── */}
        {tab === 'cheat' && (
          <div>
            <div style={S.sectionLabel}>視野</div>
            <div style={S.row}>
              <button
                style={cheatFullMap ? S.successBtn : S.btn()}
                onClick={onToggleFullMap}
              >
                {cheatFullMap ? '🗺 全圖已開啟' : '🗺 開啟全地圖'}
              </button>
            </div>

            <div style={{ ...S.sectionLabel, marginTop: 14 }}>玩家屬性</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button style={S.btn('#ffd060')} onClick={() => onAddGold(1000)}>+1000 金</button>
              <button style={S.btn('#ffd060')} onClick={() => onAddGold(100)}>+100 金</button>
              <button style={S.btn('#ff8888')} onClick={() => onFillHpMp()}>❤💧 補滿 HP/MP</button>
              <button style={S.btn('#aaffaa')} onClick={() => onAddExp(100)}>+100 EXP</button>
              <button style={S.btn('#aaffaa')} onClick={() => onAddExp(500)}>+500 EXP</button>
            </div>

            {playerStats && (
              <div style={{
                marginTop: 12,
                background: 'rgba(40,45,60,0.50)',
                border: '1px solid rgba(100,110,140,0.25)',
                borderRadius: 8, padding: '8px 12px',
                fontSize: 12, color: 'rgba(200,210,230,0.75)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px',
              }}>
                <span>❤ {playerStats.hp}/{playerStats.maxHp}</span>
                <span>💧 {playerStats.mp}/{playerStats.maxMp}</span>
                <span>💰 {playerStats.gold}</span>
                <span>⭐ Lv.{playerStats.lv} ({playerStats.exp ?? 0} EXP)</span>
              </div>
            )}

            {/* ── 善惡質 ── */}
            <div style={{ ...S.sectionLabel, marginTop: 14 }}>善惡質</div>
            {playerStats && (() => {
              const karma = playerStats.karma ?? 0;
              const info  = getKarmaInfo(karma);
              return (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: info.color, marginBottom: 6, fontWeight: 600 }}>
                    {info.icon} {info.label}（{karma > 0 ? '+' : ''}{karma}）
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button style={S.btn('#88ff88')} onClick={() => onAdjustKarma?.(100)}>+100 善</button>
                    <button style={S.btn('#88ff88')} onClick={() => onAdjustKarma?.(500)}>+500 善</button>
                    <button style={S.btn('#ff8888')} onClick={() => onAdjustKarma?.(-100)}>-100 惡</button>
                    <button style={S.btn('#ff8888')} onClick={() => onAdjustKarma?.(-500)}>-500 惡</button>
                  </div>
                </div>
              );
            })()}

            {/* ── 各國名聲 ── */}
            <div style={{ ...S.sectionLabel, marginTop: 14 }}>各國名聲</div>
            {NATIONS.map(nation => {
              const rep  = playerStats?.reputation?.[nation] ?? 0;
              const info = getRepInfo(rep);
              return (
                <div key={nation} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: NATION_COLORS[nation], fontWeight: 600 }}>
                      {NATION_LABELS[nation]}
                    </span>
                    <span style={{ fontSize: 11, color: info.color }}>
                      {info.label}（{rep > 0 ? '+' : ''}{rep}）
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <button style={S.btn('#60d090')} onClick={() => onAdjustReputation?.(nation, 100)}>+100</button>
                    <button style={S.btn('#60d090')} onClick={() => onAdjustReputation?.(nation, 500)}>+500</button>
                    <button style={S.btn('#ff8888')} onClick={() => onAdjustReputation?.(nation, -100)}>-100</button>
                    <button style={S.btn('#ff8888')} onClick={() => onAdjustReputation?.(nation, -500)}>-500</button>
                  </div>
                </div>
              );
            })}

            <div style={{ ...S.sectionLabel, marginTop: 14 }}>危險操作</div>
            <div style={{ fontSize: 11, color: 'rgba(255,120,120,0.55)', marginBottom: 8 }}>
              以下操作不可撤銷
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                style={S.dangerBtn}
                onClick={() => { if (window.confirm('重置玩家資料？')) onFillHpMp('reset'); }}
              >
                💀 重置玩家
              </button>
            </div>
          </div>
        )}

        {/* ── 傳送 ──────────────────────────────── */}
        {tab === 'tp' && (
          <div>
            <div style={S.sectionLabel}>傳送至城鎮</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(locations ?? [])
                .filter(l => l.wx != null && l.wy != null)
                .map(loc => (
                  <button
                    key={loc.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', borderRadius: 7, cursor: 'pointer',
                      background: 'rgba(40,50,70,0.55)',
                      border: '1px solid rgba(80,100,140,0.30)',
                      color: 'var(--color-text-primary)',
                      fontSize: 12, fontWeight: 400,
                      textAlign: 'left',
                    }}
                    onClick={() => onTeleport(loc)}
                  >
                    <span style={{ minWidth: 18, textAlign: 'center' }}>
                      {loc.type === 'capital' ? '🏰' : loc.type === 'town' ? '🏘️' : '🏠'}
                    </span>
                    <span style={{ flex: 1 }}>{loc.label}</span>
                    {loc.nationLabel && (
                      <span style={{ fontSize: 10, color: 'rgba(160,170,190,0.55)' }}>{loc.nationLabel}</span>
                    )}
                    <span style={{ fontSize: 10, color: 'rgba(120,130,150,0.55)', fontFamily: 'monospace' }}>
                      ({loc.wx},{loc.wy})
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* ── 時間快進 ──────────────────────────── */}
        {tab === 'time' && (
          <div>
            <div style={S.sectionLabel}>目前時間</div>
            <div style={{
              fontSize: 20, fontWeight: 700,
              color: '#ffd060',
              fontFamily: 'monospace',
              marginBottom: 16, letterSpacing: '0.05em',
            }}>
              {formatTimeFn ? formatTimeFn(gameTime) : `${gameTime} 分`}
            </div>

            <div style={S.sectionLabel}>快進</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {[
                { label: '+30分', mins: 30 },
                { label: '+1小時', mins: 60 },
                { label: '+3小時', mins: 180 },
                { label: '+6小時', mins: 360 },
                { label: '+1天', mins: 1440 },
                { label: '+3天', mins: 4320 },
                { label: '+1週', mins: 10080 },
              ].map(({ label, mins }) => (
                <button key={label} style={S.btn('#c8a040')} onClick={() => onAdvanceTime(mins)}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ ...S.sectionLabel, marginTop: 4 }}>跳轉至</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: '清晨 06:00', target: 6 * 60 },
                { label: '正午 12:00', target: 12 * 60 },
                { label: '傍晚 18:00', target: 18 * 60 },
                { label: '午夜 00:00', target: 0 },
              ].map(({ label, target }) => (
                <button
                  key={label}
                  style={S.btn('#88aacc')}
                  onClick={() => {
                    const dayMins = 1440;
                    const cur = gameTime % dayMins;
                    const diff = ((target - cur) + dayMins) % dayMins;
                    onAdvanceTime(diff || dayMins);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
