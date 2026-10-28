// Fixed settings for the ride. Content (text, images, zoom targets) lives in blu.yaml;
// this file only holds defaults and tuning numbers, each named so it explains itself.

// Default image and zoom targets per scene. blu.yaml → scenes overrides any of these.
// A target is [x%, y%] of the image: the point the camera centres on when it zooms.
export const SCENE_DEFAULTS = {
  platform:    { image: 'images/scenes/platform.jpg',     targets: { door: [50, 57] } },
  cabin_side:  { image: 'images/scenes/cabin-side.jpg',   targets: { poster: [50, 45] } },
  cabin_front: { image: 'images/scenes/cabin-front.avif', targets: { door_window: [50, 44] } },
  corridor:    { image: 'images/scenes/corridor.avif',    targets: { left_door: [25, 57], right_door: [75, 57], end_door: [50, 52] } },
  bunk:        { image: 'images/scenes/bunk.jpg',         targets: { screen: [50, 27] } },
  cargo:       { image: 'images/scenes/cargo.jpg',        targets: { crates: [50, 59] } },
  cab:         { image: 'images/scenes/cab.jpg',          targets: { console: [50, 66], windscreen: [50, 32] } },
  arrival:     { image: 'images/scenes/arrival.jpg',      targets: { sign: [59, 30] } },
};

// Stations on the journey nav, in order. Each is also a label on the ride timeline and
// (except platform) a panel id. Their display names live in blu.yaml → labels.stops.
export const STOPS = ['platform', 'profile', 'experience', 'projects', 'skills', 'contact'];

export const SCENE_ASPECT = 16 / 9;          // every scene image is drawn into a 16:9 box

export const SCROLL_SMOOTHING = 0.6;         // seconds the camera takes to catch up with the scrollbar
export const MIN_SCROLL_PER_SECOND = 380;    // px of scrolling per second of ride, at minimum
export const NAV_LEAD_SECONDS = 0.8;         // light up a station this long before arriving
export const URL_BAR_SLACK = 140;            // ignore height changes smaller than this (phone URL bars)
export const TOUCH_COVER_EXTRA = 120;        // extra image height so a hiding URL bar never shows a gap
export const LOAD_TIMEOUT_MS = 6000;         // start anyway if images are slower than this
export const TURN_DISTANCE = 0.12;           // how far (in screen widths) a new scene slides in on a turn
