// Open the site with ?debug, then click a scene to read its [x%, y%] for blu.yaml targets.
import { $ } from './dom.js';
import { state } from './state.js';

export function enableDebugMode() {
  document.body.classList.add('debug');
  $('#overlays').style.display = 'none';      // panels would block clicks on the scene
  const toast = $('#toast');
  let hideTimer;

  $('#stage').addEventListener('click', event => {
    const [sceneKey, scene] = mostVisibleScene();
    const box = scene.camera.getBoundingClientRect();
    const x = Math.round(((event.clientX - box.left) / box.width) * 100);
    const y = Math.round(((event.clientY - box.top) / box.height) * 100);
    const message = `${sceneKey}: [${x}, ${y}]`;

    console.log(message);
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => toast.classList.remove('show'), 4000);
  });
}

function mostVisibleScene() {
  return Object.entries(state.scenes)
    .sort(([, a], [, b]) => getComputedStyle(b.el).opacity - getComputedStyle(a.el).opacity)[0];
}
