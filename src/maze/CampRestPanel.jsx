// ─────────────────────────────────────────────
//  CampRestPanel.jsx
//  扎營休息面板：選擇休息時間，依時長回復 HP/MP
// ─────────────────────────────────────────────
import { formatTime, advanceTime, minsToNextDawn } from './timeSystem.js';

// 完整休息（8 小時）= 100% 回復基準
const FULL_REST_MINS = 480;

/** 計算休息後的 HP/MP 回復量（不超過上限） */
export function calcRestRecovery(player, restMins) {
  const ratio = Math.min(1, restMins / FULL_REST_MINS);
  const hp = Math.min(player.maxHp - player.hp, Math.round(player.maxHp * ratio));
  const mp = Math.min(player.maxMp - player.mp, Math.round(player.maxMp * ratio));
  return { hp, mp, ratio };
}

const PANEL = {
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(8,10,22,0.97)',
  border: '1px solid rgba(100,100,180,0.45)',
  borderRadius: 10, padding: '18px 22px',
  width: 340, maxWidth: '94%',
  fontFamily: 'var(--font-mono, monospace)',
  zIndex: 10,
};

export default function CampRestPanel({ player, currentTime, onRest, onClose }) {
  // 動態產生選項：固定時長 + 到黎明
  const dawnMins = minsToNextDawn(currentTime);
  const OPTIONS = [
    { label: '小憩',   icon: '😴', mins: 30  },
    { label: '短眠',   icon: '🛌', mins: 120 },
    { label: '長眠',   icon: '💤', mins: 240 },
    { label: '安眠到黎明', icon: '🌅', mins: dawnMins },
  ];

  return (
    <div style={PANEL}>
      {/* 標題 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, color: '#aaaaff', fontWeight: 600 }}>⛺ 扎營休息</div>
        <button onClick={onClose} style={{
          fontSize: 12, padding: '3px 10px', borderRadius: 5,
          background: 'rgba(80,80,80,0.3)', border: '0.5px solid #555',
          color: '#aaa', cursor: 'pointer',
        }}>取消</button>
      </div>

      {/* 目前狀態 */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 14,
        padding: '8px 12px', borderRadius: 7,
        background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#777', marginBottom: 3 }}>❤ HP</div>
          <div style={{ fontSize: 13, color: '#ff8888' }}>{player.hp} <span style={{ color: '#555' }}>/ {player.maxHp}</span></div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#777', marginBottom: 3 }}>💧 MP</div>
          <div style={{ fontSize: 13, color: '#88aaff' }}>{player.mp} <span style={{ color: '#555' }}>/ {player.maxMp}</span></div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#777', marginBottom: 3 }}>🕐 現在</div>
          <div style={{ fontSize: 13, color: '#aaaacc' }}>{formatTime(currentTime)}</div>
        </div>
      </div>

      {/* 選項列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {OPTIONS.map(({ label, icon, mins }) => {
          const { hp, mp } = calcRestRecovery(player, mins);
          const wakeTime = formatTime(advanceTime(currentTime, mins));
          const hpFull = player.hp + hp >= player.maxHp;
          const mpFull = player.mp + mp >= player.maxMp;
          const h = Math.floor(mins / 60), m = mins % 60;
          const durationLabel = h > 0 ? (m > 0 ? `${h}h${m}m` : `${h} 小時`) : `${m} 分`;

          return (
            <button key={label} onClick={() => onRest(mins)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
              background: 'rgba(60,60,110,0.25)',
              border: '1px solid rgba(100,100,180,0.35)',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(80,80,150,0.4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(60,60,110,0.25)'}
            >
              <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, color: '#d0d0f0', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 10, color: '#666' }}>{durationLabel}</span>
                  <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>起床 {wakeTime}</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 11, color: hp > 0 ? '#ff8888' : '#444' }}>
                    ❤ +{hp}{hpFull ? ' (滿)' : ''}
                  </span>
                  <span style={{ fontSize: 11, color: mp > 0 ? '#88aaff' : '#444' }}>
                    💧 +{mp}{mpFull ? ' (滿)' : ''}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
