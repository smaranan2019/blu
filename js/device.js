// What the visitor's browser and device prefer. Browser-only, kept apart from config.js
// so the plain settings there can also be read by Node (tests, scripts/check-content.mjs).
export const PREFERS_REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
