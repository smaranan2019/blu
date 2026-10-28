// The world map inside the sleeper bunk. Each job is a pin placed by latitude/longitude;
// the ride flies the map from pin to pin and draws a route line between them.
// A job without valid coordinates still gets its card — it just has no pin.
import { $, $$, escapeHtml, paragraphs, bulletList, when } from './dom.js';
import { fillIn } from './content.js';
import { clamp, projectToMap, cumulativeLengths } from './geometry.js';
import { state } from './state.js';
import { createPanel } from './panels.js';

const WORLD_WIDTH = 1000;      // the map is laid out at this width (px), then scaled by the camera
const MIN_JOB_ZOOM = 2.2;      // never zoom in less than this on a pin, even on huge screens
const NARROW_MAP = 700;        // below this width the card sits under the pin, not beside it
let worldHeight = 500;         // follows the map image's real shape (set in layoutMap)

let jobs = [];
let pinPositions = [];         // [x, y] in world px per job, or null when it has no coordinates
let routeLengthAtJob = [];     // how much route line is drawn when we reach job i
let routeTotalLength = 0.01;
const parts = {};              // the map's DOM elements

export function buildMapPanel() {
  const { experience, map, labels } = state.content;
  jobs = experience;

  const empty = jobs.length ? '' : `<p class="empty map-empty">${escapeHtml(labels.no_jobs)}</p>`;
  const panel = createPanel('experience', 'map-panel', labels.stops.experience, `
    <p class="eyebrow">${escapeHtml(labels.map_eyebrow)}</p>
    <div class="map-view">
      <div class="map-world">
        <img src="${escapeHtml(map.image)}" alt="" draggable="false">
        <svg class="route" preserveAspectRatio="none" aria-hidden="true"><polyline></polyline></svg>
        ${jobs.map(() => '<div class="pin"><div class="pin-dot"></div></div>').join('')}
      </div>
      ${jobs.map((job, i) => jobCardHtml(job, i, labels)).join('')}
      ${empty}
    </div>`);

  parts.view = $('.map-view', panel);
  parts.world = $('.map-world', panel);
  parts.route = $('.route polyline', panel);
  parts.pins = $$('.pin-dot', panel);
  parts.cards = $$('.job-card', panel);
}

function jobCardHtml(job, i, labels) {
  return `
    <article class="card framed job-card">
      <p class="counter">${escapeHtml(fillIn(labels.job_counter, { n: i + 1, total: jobs.length }))}</p>
      <p class="dates">${escapeHtml(job.start)} — ${escapeHtml(job.end)}</p>
      <h3>${escapeHtml(job.role)}</h3>
      <p class="subtitle">${escapeHtml(job.company)}</p>
      ${when(job.location, `<p class="meta">◆ ${escapeHtml(job.location)}</p>`)}
      ${paragraphs(job.summary)}
      ${bulletList(job.bullets)}
      ${when(job.link, `<a class="btn" href="${escapeHtml(job.link)}" target="_blank" rel="noopener">${escapeHtml(labels.job_link)} ↗</a>`)}
    </article>`;
}

// Place pins and the route line. Runs after the map image has loaded, so we know its shape.
export function layoutMap() {
  const img = $('img', parts.world);
  if (img.naturalWidth) worldHeight = WORLD_WIDTH * (img.naturalHeight / img.naturalWidth);
  parts.world.style.height = `${worldHeight}px`;

  pinPositions = jobs.map(job => (job.coords ? projectToMap(job.coords, WORLD_WIDTH, worldHeight) : null));
  $$('.pin', parts.world).forEach((pin, i) => {
    const position = pinPositions[i];
    pin.hidden = !position;
    if (!position) return;
    pin.style.left = `${position[0]}px`;
    pin.style.top = `${position[1]}px`;
  });

  // The route only joins jobs that have a pin.
  const routePoints = pinPositions.filter(Boolean);
  $('.route', parts.world).setAttribute('viewBox', `0 0 ${WORLD_WIDTH} ${worldHeight}`);
  parts.route.setAttribute('points', routePoints.map(point => point.join(',')).join(' '));

  const lengths = cumulativeLengths(routePoints);
  routeTotalLength = Math.max(lengths.at(-1) ?? 0, 0.01);
  let pinsSoFar = 0;
  routeLengthAtJob = pinPositions.map(position => {
    if (position) pinsSoFar++;
    return lengths[pinsSoFar - 1] ?? 0;
  });
}

/**
 * Map camera for GSAP: the whole world (no index, or a job without a pin) or zoomed onto
 * job `index`, leaving room for its card (beside it on desktop, below it on phones).
 * `--counter-zoom` lets pins and the route line stay the same size on screen.
 */
export function mapView(index = null) {
  const viewWidth = parts.view.offsetWidth, viewHeight = parts.view.offsetHeight;
  const fitScale = Math.min(viewWidth / WORLD_WIDTH, viewHeight / worldHeight);

  let scale = fitScale;
  let focus = [WORLD_WIDTH / 2, worldHeight / 2];
  let screenPoint = [viewWidth / 2, viewHeight / 2];

  const pin = index === null ? null : pinPositions[index];
  if (pin) {
    const isNarrow = viewWidth < NARROW_MAP;
    scale = Math.max(fitScale * state.content.map.zoom, MIN_JOB_ZOOM);
    focus = pin;
    screenPoint = isNarrow ? [viewWidth / 2, viewHeight * 0.24] : [viewWidth * 0.3, viewHeight / 2];
  }

  let x = screenPoint[0] - scale * focus[0];
  let y = screenPoint[1] - scale * focus[1];
  // Once zoomed in, never show empty space past the map's edges.
  if (scale * WORLD_WIDTH >= viewWidth) x = clamp(x, viewWidth - scale * WORLD_WIDTH, 0);
  if (scale * worldHeight >= viewHeight) y = clamp(y, viewHeight - scale * worldHeight, 0);

  return { x, y, scale, '--counter-zoom': 1 / scale };
}

// The route line is "drawn" with a dash as long as the whole line, slid along by an offset.
export const routeHidden = () => ({ strokeDasharray: routeTotalLength, strokeDashoffset: routeTotalLength });
export const routeDrawnTo = index => ({ strokeDashoffset: routeTotalLength - routeLengthAtJob[index] });

export const mapParts = () => parts;
export const jobCount = () => jobs.length;
