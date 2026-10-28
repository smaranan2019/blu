// The "camera" is a trick: each scene image sits in a 16:9 box (the camera)
// that's big enough to cover the screen. Moving or scaling that box with CSS
// transforms looks like the viewer walking, turning and zooming.
import { SCENE_DEFAULTS, SCENE_ASPECT, TOUCH_COVER_EXTRA } from './config.js';
import { IS_TOUCH, PREFERS_REDUCED_MOTION } from './device.js';
import { $, escapeHtml } from './dom.js';
import { computeCameraView } from './geometry.js';
import { state } from './state.js';

export function buildScenes() {
  const container = $('#scenes');
  for (const [key, defaults] of Object.entries(SCENE_DEFAULTS)) {
    const custom = state.content.scenes[key] ?? {};
    const el = document.createElement('div');
    el.className = 'scene';
    el.innerHTML = `<div class="camera"><img alt="" src="${escapeHtml(custom.image || defaults.image)}" draggable="false"></div>`;
    container.append(el);
    state.scenes[key] = {
      el,
      camera: el.firstElementChild,
      targets: { ...defaults.targets, ...custom.targets },
    };
  }
}

// Height the image must cover. On phones we add a little, because the URL bar
// can slide away and make the screen taller without a resize we'd react to.
const coverHeight = () => innerHeight + (IS_TOUCH ? TOUCH_COVER_EXTRA : 0);

// The camera box: as wide as the screen, or wider if that's what it takes to be tall enough.
function cameraSize() {
  const width = Math.max(innerWidth, coverHeight() * SCENE_ASPECT);
  return { width, height: width / SCENE_ASPECT };
}

export function sizeCameras() {
  const { width, height } = cameraSize();
  for (const { camera } of Object.values(state.scenes)) {
    camera.style.width = `${width}px`;
    camera.style.height = `${height}px`;
  }
}

// GSAP-ready { x, y, scale } that centres `target` of `sceneKey` at `zoom`. See geometry.js.
export function cameraView(sceneKey, target, zoom = 1, look = 0) {
  const { width, height } = cameraSize();
  return computeCameraView({
    screenWidth: innerWidth,
    screenHeight: innerHeight,
    coverHeight: coverHeight(),
    boxWidth: width,
    boxHeight: height,
    target: state.scenes[sceneKey].targets[target] ?? [50, 50],
    zoom: PREFERS_REDUCED_MOTION ? 1 + (zoom - 1) * 0.35 : zoom,   // gentler zooms if asked
    look,
  });
}
