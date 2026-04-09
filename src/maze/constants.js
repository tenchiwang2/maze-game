// ─────────────────────────────────────────────
//  constants.js
//  Shared numeric / config constants.
//  Import from here in every other module.
// ─────────────────────────────────────────────

// Raycaster / movement
export const FOV           = Math.PI / 2.5;
export const NUM_RAYS      = 320;
export const MOVE_SPEED    = 0.065;
export const TURN_SPEED    = 0.058;
export const INTERACT_DIST = 1.8;    // grid units for door interaction

// Texture tile hints (images will be stretched, but square tiles look best)
export const TEX_W = 64;
export const TEX_H = 64;

// Minimap cell pixel size
export const MM = 5;
