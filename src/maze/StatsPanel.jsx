// ─────────────────────────────────────────────
//  StatsPanel.jsx
//  獨立的玩家屬性面板覆蓋層
// ─────────────────────────────────────────────

const PANEL = {
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(8,8,18,0.97)',
  border: '1px solid rgba(100,160,255,0.4)',
  borderRadius: 10, padding: '16px 20px',
  width: 320, maxWidth: '94%',
  fontFamily: 'var(--font-mono, monospace)',
  zIndex: 10,
};

export default function StatsPanel({ player, onClose }) {
  return (
    <div style={PANEL}>
      {/* 標題列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, color: '#88ccff', fontWeight: 600 }}>📊 角色屬性</div>
        <button onClick={onClose} style={{
          fontSize: 12, padding: '3px 10px', borderRadius: 5,
          background: 'rgba(80,80,80,0.3)', border: '0.5px solid #555', color: '#aaa', cursor: 'pointer',
        }}>關閉 [C]</button>
      </div>

      {/* 等級 / EXP */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
        padding: '10px 14px', borderRadius: 8,
        background: 'rgba(255,220,60,0.07)', border: '0.5px solid rgba(255,220,60,0.2)',
      }}>
        <div style={{ textAlign: 'center', minWidth: 52 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#f0e080', lineHeight: 1 }}>Lv.{player.lv}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
            EXP {player.exp} / {player.lv * 100}
          </div>
          {/* EXP 進度條 */}
          <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${Math.min(100, (player.exp / (player.lv * 100)) * 100)}%`,
              background: 'linear-gradient(90deg, #f0e080, #ffc040)',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </div>

      {/* 屬性格 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['❤ HP',   `${player.hp} / ${player.maxHp}`, '#ff8888'],
          ['💧 MP',   `${player.mp} / ${player.maxMp}`, '#88aaff'],
          ['⚔ ATK',  player.atk,                        '#ffcc66'],
          ['🛡 DEF',  player.def,                        '#88ddcc'],
          ['💨 SPD',  player.spd,                        '#aaffaa'],
          ['💰 金幣', player.gold,                       '#ffd060'],
        ].map(([lbl, val, color]) => (
          <div key={lbl} style={{
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 6,
            border: `0.5px solid ${color}22`,
          }}>
            <div style={{ fontSize: 10, color: '#777', marginBottom: 3 }}>{lbl}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
