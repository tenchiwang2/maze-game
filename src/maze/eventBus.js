// ─────────────────────────────────────────────
//  eventBus.js
//  輕量 pub/sub，讓各系統透過事件溝通，不需直接依賴彼此
//
//  用法：
//    import { on, emit } from './eventBus.js';
//    const unsub = on('combat:end', handler);  // 訂閱
//    emit('combat:end', { won: true, ... });   // 發送
//    unsub();                                  // 取消訂閱
// ─────────────────────────────────────────────

const listeners = {};

/** 訂閱事件，回傳取消訂閱函數 */
export function on(event, handler) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(handler);
  return () => {
    listeners[event] = listeners[event].filter(h => h !== handler);
  };
}

/** 發送事件給所有訂閱者 */
export function emit(event, data) {
  (listeners[event] ?? []).forEach(h => h(data));
}
