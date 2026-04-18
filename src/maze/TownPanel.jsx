// ─────────────────────────────────────────────
//  TownPanel.jsx
//  城鎮選單 UI — 列出人物與地點，取代第一人稱迷宮
// ─────────────────────────────────────────────
import { LOC_TYPE } from './worldMap.jsx';

const TYPE_ICON = { capital: '🏰', town: '🏘️' };

const GROUPS = [
  { key: 'npc',    label: '人物', icon: '@', color: '#80aaff' },
  { key: 'shop',   label: '地點', icon: '$', color: '#ffd060' },
  { key: 'chest',  label: '寶箱', icon: 'T', color: '#a0e898' },
  { key: 'combat', label: '戰鬥', icon: '!', color: '#ff8888' },
];

const BUTTON_BASE = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
  fontSize: 14, fontWeight: 500, transition: 'opacity 0.15s',
  border: '1px solid',
};

export default function TownPanel({ loc, events, onEvent, onExit }) {
  const typeIcon = TYPE_ICON[loc.type] ?? '🏙️';

  return (
    <div style={{
      width: 640, minHeight: 440,
      background: 'linear-gradient(160deg, rgba(10,18,36,0.98) 0%, rgba(6,12,24,0.98) 100%)',
      borderRadius: 'var(--border-radius-md)',
      padding: '28px 32px',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-sans)',
      color: 'var(--color-text-primary)',
    }}>
      {/* 城鎮標題 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.04em' }}>
          {typeIcon} {loc.label}
        </div>
        {loc.nationLabel && (
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            {loc.nationLabel}
          </div>
        )}
      </div>

      {/* 各分組 */}
      {GROUPS.map(({ key, label, color }) => {
        const group = events.filter(ev => ev.type === key);
        if (group.length === 0) return null;
        return (
          <div key={key} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {group.map((ev, i) => {
                const idx = events.indexOf(ev);
                const done = !ev.repeatable && ev.triggered;
                return (
                  <button
                    key={ev.id ?? i}
                    disabled={done}
                    onClick={() => !done && onEvent(ev, idx)}
                    style={{
                      ...BUTTON_BASE,
                      background: done
                        ? 'rgba(40,40,50,0.5)'
                        : `rgba(${hexToRgb(color)},0.12)`,
                      borderColor: done
                        ? 'rgba(60,60,70,0.4)'
                        : `rgba(${hexToRgb(color)},0.45)`,
                      color: done ? 'rgba(120,120,130,0.7)' : color,
                      cursor: done ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {ev.icon && <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{ev.icon}</span>}
                    {ev.text}
                    {done && <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 4 }}>(已完成)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 離開按鈕 */}
      <div style={{ marginTop: 32, borderTop: '1px solid rgba(60,80,120,0.3)', paddingTop: 20 }}>
        <button
          onClick={onExit}
          style={{
            ...BUTTON_BASE,
            background: 'rgba(60,80,100,0.25)',
            borderColor: 'rgba(100,130,180,0.4)',
            color: '#b0c8e8',
            fontSize: 13,
          }}
        >
          ← 離開城鎮
        </button>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return '128,128,128';
  return `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}`;
}
