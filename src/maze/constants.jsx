// ─────────────────────────────────────────────
//  constants.js
//  共用數字 / 設定常數
//  其他模組皆從此處匯入
// ─────────────────────────────────────────────

// 光線投射 / 移動
export const FOV           = Math.PI / 2.5;
export const NUM_RAYS      = 320;
export const MOVE_SPEED    = 0.065;
export const TURN_SPEED    = 0.058;
export const INTERACT_DIST = 1.8;    // 與門互動的距離（格子單位）

// 貼圖尺寸提示（圖片會自動縮放，正方形貼圖效果最佳）
export const TEX_W = 64;
export const TEX_H = 64;

// 小地圖格子像素大小
export const MM = 5;

// 燈光
export const TORCH_RADIUS = 8;   // 火把照明半徑（grid 單位）
export const AMBIENT      = 0.03; // 最低環境亮度（近乎全暗）
