// BLU — a scroll-driven, first-person ride through a pixel train.
//
// Start here. The app runs in four steps:
//   1. load blu.yaml and check it (content.js)
//   2. build the page: scenes, panels, map, nav
//   3. wait for what the first screen needs
//   4. script the ride (ride.js) and hand it to the scrollbar
// If anything fails, visitors see a message instead of a stuck loading screen.
import { URL_BAR_SLACK, LOAD_TIMEOUT_MS } from './config.js';
import { $, escapeHtml } from './dom.js';
import { normalizeContent } from './content.js';
import { state } from './state.js';
import { buildScenes } from './camera.js';
import { buildPanels } from './panels.js';
import { buildMapPanel } from './map.js';
import { buildNav, jumpTo, scrollPositionOf } from './nav.js';
import { buildRide, rebuildRide } from './ride.js';
import { enableDebugMode } from './debug.js';

// The three libraries come from a CDN. If one is blocked or fails its integrity check,
// its global is missing — say so plainly rather than crash halfway through.
const REQUIRED_LIBRARIES = { gsap: 'GSAP', ScrollTrigger: 'ScrollTrigger', jsyaml: 'js-yaml' };

async function start() {
  const missing = Object.keys(REQUIRED_LIBRARIES).filter(name => !(name in window));
  if (missing.length) throw new Error(`Couldn't load ${missing.map(name => REQUIRED_LIBRARIES[name]).join(', ')}.`);

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  state.content = await loadContent();
  fillIntro();
  buildScenes();
  buildPanels();
  buildMapPanel();
  buildNav();
  await essentialsReady();
  buildRide();
  $('#loader').classList.add('gone');

  rebuildOnResize();
  closePanelsWithEscape();
  if (new URLSearchParams(location.search).has('debug')) enableDebugMode();

  followDeepLinks();
}

// Deep links: /#projects, /#contact … start at that stop, and follow later hash changes.
// ScrollTrigger re-measures the page when it finishes loading (the background scene images
// arrive after we've started) and resets the scroll position, so the jump waits until then.
function followDeepLinks() {
  const goToHashStop = () => {
    const stop = location.hash.slice(1);
    if (state.timeline.labels[stop] !== undefined) scrollTo(0, scrollPositionOf(stop));
  };
  const afterLoad = () => requestAnimationFrame(goToHashStop);   // let ScrollTrigger's own refresh run first
  if (document.readyState === 'complete') afterLoad();
  else addEventListener('load', afterLoad, { once: true });

  addEventListener('hashchange', () => jumpTo(location.hash.slice(1) || 'platform'));
}

async function loadContent() {
  const response = await fetch('blu.yaml', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`blu.yaml: HTTP ${response.status}`);
  const { content, problems } = normalizeContent(jsyaml.load(await response.text()));
  // Content problems don't stop the ride (each has a safe fallback), but the owner should see them.
  problems.forEach(problem => console.warn(`blu.yaml: ${problem}`));
  return content;
}

function showStartupError(error) {
  console.error(error);
  $('#loader').classList.remove('gone');
  $('#loader').innerHTML = `
    <p class="brand-big">BLU</p>
    <p>Sorry — the train couldn't leave the station.</p>
    <p class="small">Please refresh the page in a moment.<br><br>
      <span class="detail">${escapeHtml(error.message)}</span></p>`;
}

// Title screen text and theme colours.
function fillIntro() {
  const { site, theme, profile, labels } = state.content;
  for (const [name, colour] of Object.entries(theme)) document.documentElement.style.setProperty(`--${name}`, colour);

  document.title = site.title || site.trainName;
  $('#intro-title').textContent = site.trainName;
  $('#route .brand').textContent = site.trainName;
  $('#intro-name').textContent = profile.name;
  $('#intro-tagline').textContent = site.tagline;
  $('#intro-hint').textContent = `${labels.scroll_hint} ▼`;
}

// Wait only for what the first screen needs: the platform scene, the fonts, and the map
// (its shape decides where pins go). The other scenes keep downloading in the background
// while you look at the title screen — waiting for all ~4 MB made the start feel slow.
function essentialsReady() {
  const loaded = img => img.complete ? Promise.resolve() : new Promise(done => { img.onload = img.onerror = done; });
  const essentials = [$('img', state.scenes.platform.el), $('.map-world img')].map(loaded);
  const timeout = new Promise(done => setTimeout(done, LOAD_TIMEOUT_MS));
  return Promise.race([Promise.all([...essentials, document.fonts.ready]), timeout]);
}

// Rebuild after a real resize. Phones resize constantly as the URL bar slides
// in and out, so height-only changes smaller than URL_BAR_SLACK are ignored.
function rebuildOnResize() {
  let lastWidth = innerWidth, lastHeight = innerHeight, timer;
  addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const onlyUrlBar = innerWidth === lastWidth && Math.abs(innerHeight - lastHeight) < URL_BAR_SLACK;
      if (onlyUrlBar) return;
      lastWidth = innerWidth;
      lastHeight = innerHeight;
      rebuildRide();
    }, 200);
  });
}

function closePanelsWithEscape() {
  addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openPanel = Object.values(state.panels).find(panel => Number(getComputedStyle(panel).opacity) > 0.5);
    openPanel?.querySelector('.close').click();
  });
}

start().catch(showStartupError);
