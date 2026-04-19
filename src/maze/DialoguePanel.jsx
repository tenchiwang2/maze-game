// ─────────────────────────────────────────────
//  DialoguePanel.jsx
//  NPC 對話覆蓋層
// ─────────────────────────────────────────────
import { useState } from 'react';

const PANEL = {
  position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(8,8,18,0.96)',
  border: '1px solid rgba(100,140,255,0.6)',
  borderRadius: 8, padding: '14px 18px',
  width: 420, maxWidth: '92%',
  fontFamily: 'var(--font-mono, monospace)',
  zIndex: 10,
};

// onQuestOffer(questId, continueDialogue) — 當選項含 questOffer 時呼叫
export default function DialoguePanel({ lines, onClose, onQuestOffer }) {
  const [idx, setIdx] = useState(0);

  if (!lines || lines.length === 0) { onClose(); return null; }
  const line = lines[idx];
  const isLast = idx >= lines.length - 1;

  function next(choiceNext) {
    if (choiceNext === null || choiceNext === undefined) {
      if (isLast) { onClose(); return; }
      setIdx(i => i + 1);
      return;
    }
    if (choiceNext === -1) { onClose(); return; }
    if (choiceNext < lines.length) setIdx(choiceNext);
    else onClose();
  }

  function handleChoice(c) {
    if (c.questOffer && onQuestOffer) {
      // 暫停對話，交由 QuestOfferPanel 處理；
      // accept / decline 後都繼續到 c.next
      onQuestOffer(c.questOffer, () => next(c.next ?? null));
    } else {
      next(c.next);
    }
  }

  return (
    <div style={PANEL}>
      {/* 說話者名稱 */}
      <div style={{ fontSize: 11, color: '#80aaff', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {line.speaker || 'NPC'}
      </div>

      {/* 對話文字 */}
      <div style={{ fontSize: 14, color: '#e8e8f0', lineHeight: 1.65, marginBottom: 12, minHeight: 44 }}>
        {line.text}
      </div>

      {/* 選項或繼續按鈕 */}
      {line.choices ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {line.choices.map((c, i) => (
            <button key={i} onClick={() => handleChoice(c)}
              style={{
                textAlign: 'left', fontSize: 13, padding: '7px 12px',
                borderRadius: 5, background: 'rgba(80,120,255,0.15)',
                border: '0.5px solid rgba(80,120,255,0.5)',
                color: '#aaccff', cursor: 'pointer',
              }}>
              {c.questOffer ? '📜 ' : '▶ '}{c.text}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {!isLast ? (
            <button onClick={() => next(undefined)} style={{
              fontSize: 12, padding: '5px 16px', borderRadius: 5,
              background: 'rgba(80,120,255,0.25)',
              border: '0.5px solid rgba(80,120,255,0.6)',
              color: '#aaccff', cursor: 'pointer',
            }}>繼續 ▶</button>
          ) : (
            <button onClick={onClose} style={{
              fontSize: 12, padding: '5px 16px', borderRadius: 5,
              background: 'rgba(80,200,120,0.2)',
              border: '0.5px solid rgba(80,200,120,0.5)',
              color: '#80dd99', cursor: 'pointer',
            }}>結束對話</button>
          )}
        </div>
      )}

      {/* 進度指示 */}
      <div style={{ marginTop: 8, display: 'flex', gap: 4, justifyContent: 'center' }}>
        {lines.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 16 : 6, height: 4, borderRadius: 2,
            background: i === idx ? '#80aaff' : 'rgba(80,120,255,0.3)',
            transition: 'width 0.2s',
          }} />
        ))}
      </div>
    </div>
  );
}
