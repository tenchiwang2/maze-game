// ─────────────────────────────────────────────
//  DebugPanel.jsx
//  開發者調試面板 — 按 ` (Backtick) 或 F2 開啟
//  包含：角色切換、地圖重生、迷宮參數、作弊工具、傳送、時間快進
// ─────────────────────────────────────────────
import { useState } from 'react';
import { FACTORIES, FACTORY_IDS } from './mazeFactory.jsx';
import { WORLD_FACTORIES } from './worldFactory.jsx';

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
  cheatFullMap, setCheatFullMap,
  onAddGold,
  onFillHpMp,
  onAddExp,
  playerStats,
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
            <div style={S.sectionLabel}>目前角色</div>
            <div style={{
              background: 'rgba(80,160,255,0.10)',
              border: '1px solid rgba(80,160,255,0.25)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 14,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#80c8ff', marginBottom: 4 }}>
                🧑 {playerStats?.name || '玩家'}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(200,210,230,0.75)' }}>
                <span>❤ {playerStats?.hp ?? '?'}/{playerStats?.maxHp ?? '?'}</span>
                <span>💧 {playerStats?.mp ?? '?'}/{playerStats?.maxMp ?? '?'}</span>
                <span>Lv.{playerStats?.lv ?? 1}</span>
                <span>💰 {playerStats?.gold ?? 0}</span>
              </div>
            </div>

            <div style={S.sectionLabel}>冒險者列表</div>
            <div style={{
              background: 'rgba(40,45,60,0.60)',
              border: '1px solid rgba(100,110,140,0.30)',
              borderRadius: 8, padding: '10px 12px',
              fontSize: 12, color: 'rgba(160,170,190,0.60)',
              textAlign: 'center',
            }}>
              🚧 冒險者系統開發中<br />
              <span style={{ fontSize: 10, opacity: 0.7 }}>（Adventurer System — 即將推出）</span>
            </div>
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
                onClick={() => setCheatFullMap(v => !v)}
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
