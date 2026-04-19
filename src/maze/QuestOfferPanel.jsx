// ─────────────────────────────────────────────
//  QuestOfferPanel.jsx
//  任務接取 / 領獎 彈窗
//
//  Props:
//    questDef  — 任務定義物件（來自 QUEST_DEFS）
//    mode      — 'offer'（接任務）| 'reward'（領獎勵）
//    playerQuest — 玩家任務狀態物件（mode='reward' 時用）
//    onAccept  — 確認按鈕回呼
//    onDecline — 拒絕按鈕回呼（mode='offer' 才有）
// ─────────────────────────────────────────────
import { ITEMS } from './itemData.jsx';

const OVERLAY = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.72)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 50,
};

const PANEL = {
  background: 'rgba(6,6,18,0.98)',
  border: '1px solid rgba(180,150,60,0.65)',
  borderRadius: 10,
  padding: '22px 26px',
  width: 420,
  maxWidth: '94vw',
  fontFamily: 'var(--font-mono, monospace)',
  boxShadow: '0 0 40px rgba(180,150,40,0.15)',
};

const DIVIDER = {
  borderTop: '0.5px solid rgba(180,150,60,0.2)',
  margin: '14px 0',
};

const LABEL = {
  fontSize: 10,
  color: '#b09040',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

function RewardBlock({ reward }) {
  const { gold = 0, exp = 0, items = [] } = reward ?? {};
  const hasItems = items.length > 0;
  if (!gold && !exp && !hasItems) return <span style={{ color: '#606060', fontSize: 12 }}>（無獎勵）</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 4 }}>
      {gold > 0 && (
        <span style={{ fontSize: 13, color: '#f0c040' }}>
          💰 {gold} 金幣
        </span>
      )}
      {exp > 0 && (
        <span style={{ fontSize: 13, color: '#70d0ff' }}>
          ✨ {exp} EXP
        </span>
      )}
      {items.map((it, i) => {
        const def = ITEMS[it.itemId];
        return (
          <span key={i} style={{ fontSize: 13, color: '#88ee99' }}>
            {def?.icon ?? '📦'} {def?.name ?? it.itemId} ×{it.qty}
          </span>
        );
      })}
    </div>
  );
}

function StepList({ steps, playerQuest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {steps.map((s, i) => {
        const isDone = playerQuest
          ? (playerQuest.completed || i < playerQuest.stepIdx)
          : false;
        return (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
            <span style={{ color: isDone ? '#60cc80' : '#506080', flexShrink: 0 }}>
              {isDone ? '✓' : '○'}
            </span>
            <span style={{ color: isDone ? '#60cc80' : '#a8b8d0' }}>
              {s.desc}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function QuestOfferPanel({ questDef, mode = 'offer', playerQuest, onAccept, onDecline }) {
  if (!questDef) return null;
  const isReward = mode === 'reward';

  return (
    <div style={OVERLAY}>
      <div style={PANEL}>
        {/* ── 標題列 ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={LABEL}>
            {isReward ? '📬 任務完成' : '📜 任務委託'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f0e8c0', lineHeight: 1.2 }}>
            {questDef.title}
          </div>
        </div>

        {/* ── 任務說明 ── */}
        <div style={{ fontSize: 13, color: '#b8b0a0', lineHeight: 1.65, marginBottom: 14 }}>
          {questDef.desc}
        </div>

        <div style={DIVIDER} />

        {/* ── 目標步驟 ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={LABEL}>目標</div>
          <StepList steps={questDef.steps} playerQuest={isReward ? playerQuest : null} />
        </div>

        {/* ── 獎勵 ── */}
        <div style={{
          background: 'rgba(180,150,40,0.07)',
          border: '0.5px solid rgba(180,150,40,0.28)',
          borderRadius: 7,
          padding: '10px 14px',
          marginBottom: 20,
        }}>
          <div style={LABEL}>{isReward ? '領取獎勵' : '任務獎勵'}</div>
          <RewardBlock reward={questDef.reward} />
        </div>

        {/* ── 按鈕 ── */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {!isReward && (
            <button onClick={onDecline} style={BTN_DECLINE}>
              拒絕
            </button>
          )}
          <button onClick={onAccept} style={isReward ? BTN_CLAIM : BTN_ACCEPT}>
            {isReward ? '領取獎勵 ✓' : '接受任務'}
          </button>
        </div>
      </div>
    </div>
  );
}

const BTN_BASE = {
  fontSize: 13, padding: '9px 22px', borderRadius: 7,
  cursor: 'pointer', fontFamily: 'inherit',
  transition: 'opacity 0.15s',
};
const BTN_ACCEPT = {
  ...BTN_BASE,
  background: 'rgba(60,160,90,0.25)',
  border: '1px solid rgba(60,160,90,0.6)',
  color: '#70dd90',
};
const BTN_DECLINE = {
  ...BTN_BASE,
  background: 'rgba(160,60,60,0.15)',
  border: '1px solid rgba(160,60,60,0.4)',
  color: '#dd7070',
};
const BTN_CLAIM = {
  ...BTN_BASE,
  background: 'rgba(180,140,40,0.25)',
  border: '1px solid rgba(180,140,40,0.6)',
  color: '#f0c040',
};
