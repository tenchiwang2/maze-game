// ─────────────────────────────────────────────
//  timeSystem.js
//  遊戲時間純函數模組（無 React、無狀態）
//  時間單位：分鐘，0 = 00:00，1439 = 23:59
// ─────────────────────────────────────────────

export const TIME_START = 360; // 遊戲開始時間 06:00

// 一格世界地圖 = 1 分鐘；dungeon 單位較密，2 units = 1 分鐘
export const TIME_WORLD_PER_MIN  = 1.0;
export const TIME_DUNGEON_PER_MIN = 2.0;

// 動作固定耗時（分鐘）
export const TIME_DIALOGUE = 3;
export const TIME_SHOP     = 5;
export const TIME_CHEST    = 1;
export const TIME_COMBAT   = 10;

/** 將分鐘數格式化為 HH:MM 字串 */
export function formatTime(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** 推進時間，回傳新分鐘數 */
export function advanceTime(current, amount) {
  return ((current + Math.round(amount)) % 1440 + 1440) % 1440;
}

/** 到下一個黎明（06:00）需要幾分鐘 */
export function minsToNextDawn(current) {
  const dawn = 360; // 06:00
  const diff = (dawn - current + 1440) % 1440;
  return diff === 0 ? 1440 : diff; // 若剛好是 06:00 則跳一整天
}

/**
 * 取得時段資訊
 * @returns {{ label: string, icon: string, color: string }}
 */
export function getTimePeriod(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  if (m >= 300 && m < 420)  return { label: '黎明', icon: '🌅', color: '#ffaa66' };
  if (m >= 420 && m < 1080) return { label: '白天', icon: '☀️',  color: '#ffffaa' };
  if (m >= 1080 && m < 1200) return { label: '黃昏', icon: '🌆', color: '#ff8855' };
  return                             { label: '夜晚', icon: '🌙', color: '#8888cc' };
}
