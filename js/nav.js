// The journey nav: a line of stations you can tap, with a train that shows your progress.
import { STOPS, NAV_LEAD_SECONDS, SCROLL_SMOOTHING } from './config.js';
import { PREFERS_REDUCED_MOTION } from './device.js';
import { $, $$, escapeHtml } from './dom.js';
import { clamp } from './geometry.js';
import { state } from './state.js';

const parts = {};
let currentStop = null;

export function buildNav() {
  const names = state.content.labels.stops;
  const list = $('#route .stops');
  list.innerHTML = STOPS.map(stop => `
    <li>
      <button class="stop-btn" type="button" data-stop="${stop}" aria-label="${escapeHtml(names[stop])}">
        <span class="dot"></span><span class="stop-label">${escapeHtml(names[stop])}</span>
      </button>
    </li>`).join('');
  // Spread stations evenly along the line (set here, not inline, so the CSP can forbid inline styles).
  $$('li', list).forEach((item, i) => { item.style.left = `${(i / (STOPS.length - 1)) * 100}%`; });

  parts.buttons = $$('.stop-btn', list);
  parts.fill = $('#route .fill');
  parts.currentLabel = $('#route .nav-current');
  // The BLU brand button also has data-stop="platform", so it's wired up here too.
  $$('[data-stop]', $('#route')).forEach(btn => btn.addEventListener('click', () => {
    jumpTo(btn.dataset.stop);
    focusPanelOnArrival(btn.dataset.stop);
  }));
}

// Timeline label → the page scroll position where it happens.
export function scrollPositionOf(label) {
  const { timeline, scroll } = state;
  return scroll.start + (scroll.end - scroll.start) * (timeline.labels[label] / timeline.duration());
}

// Scroll to a point in the ride. Smooth scrolling plays the journey in between.
export function jumpTo(label) {
  if (state.timeline?.labels[label] === undefined) return;

  // Already at the end with the contact card dismissed? Bring it back.
  if (label === 'contact') gsap.to(state.panels.contact, { autoAlpha: 1, scale: 1, y: 0, duration: 0.3 });

  // Stations get a shareable URL (#projects); in-between labels don't.
  if (STOPS.includes(label)) {
    history.replaceState(null, '', label === 'platform' ? location.pathname + location.search : `#${label}`);
  }
  scrollTo({ top: scrollPositionOf(label), behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth' });
}

// Keyboard and screen-reader users: after a nav jump, move focus into the stop's panel
// so its content is read out and Tab continues from there. We wait for the scroll to
// finish and the smoothed camera to catch up, because a still-hidden panel can't take focus.
const MAX_SCROLL_WAIT_MS = 3000;
function focusPanelOnArrival(stop) {
  const panel = state.panels[stop];
  if (!panel) return;

  let done = false;
  const focusSoon = () => {
    if (done) return;
    done = true;
    setTimeout(() => panel.focus({ preventScroll: true }), SCROLL_SMOOTHING * 1000 + 150);
  };
  addEventListener('scrollend', focusSoon, { once: true });
  setTimeout(focusSoon, MAX_SCROLL_WAIT_MS);       // browsers without scrollend, or no scroll needed
}

// Called on every frame of the ride.
export function updateNav() {
  const now = state.timeline.time();
  const stopTimes = STOPS.map(stop => state.timeline.labels[stop] ?? 0);

  // Fill the line station-to-station (not by raw time), so the train
  // reaches a dot exactly when you arrive at that stop.
  const reached = Math.max(0, stopTimes.findLastIndex(time => now >= time));
  const next = Math.min(reached + 1, stopTimes.length - 1);
  const legDuration = stopTimes[next] - stopTimes[reached];
  const legProgress = legDuration > 0 ? clamp((now - stopTimes[reached]) / legDuration, 0, 1) : 0;
  parts.fill.style.width = `${((reached + legProgress) / (STOPS.length - 1)) * 100}%`;

  // Light up a station a moment before arriving. Only touch the DOM when it changes.
  const highlighted = Math.max(0, stopTimes.findLastIndex(time => now >= time - NAV_LEAD_SECONDS));
  if (highlighted === currentStop) return;
  currentStop = highlighted;
  parts.buttons.forEach((btn, i) => {
    btn.classList.toggle('current', i === highlighted);
    btn.classList.toggle('passed', i < highlighted);
    if (i === highlighted) btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
  });
  parts.currentLabel.textContent = state.content.labels.stops[STOPS[highlighted]];
}
