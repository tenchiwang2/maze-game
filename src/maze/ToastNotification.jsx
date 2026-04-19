// ─────────────────────────────────────────────
//  ToastNotification.jsx
//  畫面上的浮現事件通知（自動消失）
// ─────────────────────────────────────────────
import { useEffect, useRef } from 'react';

// 每種事件類型的樣式設定
const TYPE_STYLE = {
  chest:   { border: '#ffd060', bg: 'rgba(40,30,0,0.92)',   accent: '#ffd060' },
  message: { border: '#88ccff', bg: 'rgba(0,20,40,0.92)',   accent: '#88ccff' },
  npc:     { border: '#88ee99', bg: 'rgba(0,25,10,0.92)',   accent: '#88ee99' },
  shop:    { border: '#bbaaff', bg: 'rgba(20,10,40,0.92)',  accent: '#bbaaff' },
  combat:  { border: '#ff6666', bg: 'rgba(40,0,0,0.92)',    accent: '#ff6666' },
  door:    { border: '#888888', bg: 'rgba(20,20,20,0.92)',  accent: '#aaaaaa' },
  teleport:{ border: '#44ddff', bg: 'rgba(0,25,35,0.92)',   accent: '#44ddff' },
  default: { border: '#888888', bg: 'rgba(15,15,25,0.92)',  accent: '#aaaaaa' },
};

function Toast({ toast, onDone }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 入場動畫
    el.animate([
      { opacity: 0, transform: 'translateX(30px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ], { duration: 200, fill: 'forwards' });

    // 計時消失
    const fadeTimer = setTimeout(() => {
      el.animate([
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: 'translateX(20px)' },
      ], { duration: 250, fill: 'forwards' }).onfinish = onDone;
    }, toast.duration ?? 2500);

    return () => clearTimeout(fadeTimer);
  }, []);

  const s = TYPE_STYLE[toast.type] ?? TYPE_STYLE.default;

  return (
    <div ref={ref} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px',
      background: s.bg,
      border: `1px solid ${s.border}55`,
      borderLeft: `3px solid ${s.border}`,
      borderRadius: 7,
      boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 8px ${s.border}22`,
      minWidth: 180, maxWidth: 280,
      fontFamily: 'monospace',
      pointerEvents: 'none',
    }}>
      {/* 圖示 */}
      <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{toast.icon}</span>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* 標題 */}
        {toast.title && (
          <div style={{ fontSize: 12, fontWeight: 700, color: s.accent, marginBottom: toast.body ? 2 : 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast.title}
          </div>
        )}
        {/* 內文 */}
        {toast.body && (
          <div style={{ fontSize: 11, color: '#cccccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast.body}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ToastNotification({ toasts, onRemove }) {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'absolute', top: 16, right: 16,
      display: 'flex', flexDirection: 'column', gap: 7,
      zIndex: 9, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDone={() => onRemove(t.id)} />
      ))}
    </div>
  );
}
