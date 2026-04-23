// ─────────────────────────────────────────────
//  TownPanel.jsx
//  城鎮選單 UI — 列出人物與地點，取代第一人稱迷宮
// ─────────────────────────────────────────────
import { LOC_TYPE } from './worldMap.jsx';

// ── 等級設定 ──────────────────────────────────
const TIER = {
  [LOC_TYPE.CAPITAL]: {
    icon: '🏰',
    label: '首都',
    stars: '⭐⭐⭐',
    headerColor: '#ffd060',
    subColor: '#b07820',
    borderColor: 'rgba(200,150,0,0.55)',
    bg: 'linear-gradient(160deg, rgba(28,20,4,0.99) 0%, rgba(18,12,2,0.99) 100%)',
    badgeBg: 'rgba(180,120,0,0.25)',
    badgeColor: '#ffd060',
  },
  [LOC_TYPE.TOWN]: {
    icon: '🏘️',
    label: '城鎮',
    stars: '⭐⭐',
    headerColor: '#80c8ff',
    subColor: '#3a6080',
    borderColor: 'rgba(60,140,220,0.45)',
    bg: 'linear-gradient(160deg, rgba(8,18,36,0.99) 0%, rgba(4,12,24,0.99) 100%)',
    badgeBg: 'rgba(40,100,180,0.22)',
    badgeColor: '#80c8ff',
  },
  [LOC_TYPE.TOWN_SMALL]: {
    icon: '🏠',
    label: '小村',
    stars: '⭐',
    headerColor: '#a0b890',
    subColor: '#506040',
    borderColor: 'rgba(100,130,80,0.40)',
    bg: 'linear-gradient(160deg, rgba(10,14,8,0.99) 0%, rgba(6,10,4,0.99) 100%)',
    badgeBg: 'rgba(70,100,50,0.22)',
    badgeColor: '#a0b890',
  },
};

const GROUPS = [
  { key: 'npc',         label: '人物', icon: '@', color: '#80aaff' },
  { key: 'shop',        label: '地點', icon: '$', color: '#ffd060' },
  { key: 'port_travel', label: '航行', icon: '⚓', color: '#60c8ff' },
  { key: 'chest',       label: '寶箱', icon: 'T', color: '#a0e898' },
  { key: 'gather',      label: '採集', icon: '🌿', color: '#60d090' },
  { key: 'combat',      label: '戰鬥', icon: '!', color: '#ff8888' },
];

const BUTTON_BASE = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
  fontSize: 14, fontWeight: 500, transition: 'opacity 0.15s',
  border: '1px solid',
};

export default function TownPanel({ loc, events, onEvent, onExit }) {
  const tier = TIER[loc.type] ?? TIER[LOC_TYPE.TOWN];

  return (
    <div style={{
      width: 640, minHeight: 440,
      background: tier.bg,
      border: `1.5px solid ${tier.borderColor}`,
      borderRadius: 'var(--border-radius-md)',
      padding: '28px 32px',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-sans)',
      color: 'var(--color-text-primary)',
    }}>
      {/* 城鎮標題 */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', color: tier.headerColor }}>
            {tier.icon} {loc.label}
          </div>
          {loc.nationLabel && (
            <div style={{ fontSize: 12, color: tier.subColor, marginTop: 4 }}>
              {loc.nationLabel}
            </div>
          )}
        </div>
        {/* 等級徽章 */}
        <div style={{
          background: tier.badgeBg,
          border: `1px solid ${tier.borderColor}`,
          borderRadius: 6, padding: '4px 10px',
          fontSize: 11, color: tier.badgeColor,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        }}>
          <span style={{ fontSize: 13 }}>{tier.stars}</span>
          <span style={{ letterSpacing: '0.05em' }}>{tier.label}</span>
        </div>
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
                    {ev.icon && <span style={{ fontSize: 13 }}>{ev.icon}</span>}
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
      <div style={{ marginTop: 32, borderTop: `1px solid ${tier.borderColor}`, paddingTop: 20 }}>
        <button
          onClick={onExit}
          style={{
            ...BUTTON_BASE,
            background: tier.badgeBg,
            borderColor: tier.borderColor,
            color: tier.headerColor,
            fontSize: 13,
          }}
        >
          ← 離開{tier.label}
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
