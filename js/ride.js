// The ride: one GSAP timeline scripted like a film, scrubbed by the page's scrollbar.
//
// Timeline time is "seconds of ride". ScrollTrigger maps the scrollbar onto that time,
// so scrolling down plays the film forwards and scrolling up plays it backwards.
// A `pause()` is a stretch of scrolling where nothing moves — that's what lets you
// read a panel before the journey continues.
import { SCROLL_SMOOTHING, MIN_SCROLL_PER_SECOND, TURN_DISTANCE } from './config.js';
import { PREFERS_REDUCED_MOTION } from './device.js';
import { $, $$ } from './dom.js';
import { state } from './state.js';
import { cameraView, sizeCameras } from './camera.js';
import { layoutMap, mapView, mapParts, routeHidden, routeDrawnTo, jobCount } from './map.js';
import { updateNav } from './nav.js';

export function buildRide() {
  sizeCameras();
  layoutMap();
  resetToStart();
  state.timeline = scriptTheRide();
  attachToScroll(state.timeline);
  updateNav();
}

// After a resize every measurement is stale, so throw the ride away and build it again
// at the same point in the journey.
export function rebuildRide() {
  const progress = state.scroll?.progress ?? 0;
  state.scroll?.kill();
  state.timeline?.kill();
  gsap.set($$('.scene, .camera, .panel, .job-card, .project-card, .pin-dot, .skill, #intro, .map-world, .route polyline'),
    { clearProps: 'all' });
  buildRide();
  ScrollTrigger.refresh();
  scrollTo(0, state.scroll.start + progress * (state.scroll.end - state.scroll.start));
}

// Everything as it looks before the first scroll.
function resetToStart() {
  const { scenes } = state;
  const map = mapParts();
  gsap.set($$('.camera'), { transformOrigin: '0 0' });
  for (const [key, scene] of Object.entries(scenes)) gsap.set(scene.el, { autoAlpha: key === 'platform' ? 1 : 0 });
  gsap.set(scenes.platform.camera, cameraView('platform', 'door'));
  gsap.set('#intro', { autoAlpha: 1, y: 0 });
  gsap.set('.panel', { autoAlpha: 0, scale: 0.4, y: 24 });
  gsap.set(map.cards, { autoAlpha: 0, y: 30 });
  gsap.set(map.pins, { autoAlpha: 0, scale: 0 });
  gsap.set(map.world, mapView());
  gsap.set(map.route, routeHidden());
  gsap.set('.project-card', { autoAlpha: 0, x: 80 });
  gsap.set('.skill', { '--lit': 0 });
}

function scriptTheRide() {
  // onUpdate on the timeline (not the scroll) so the nav follows the smoothed camera.
  const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: updateNav });
  const { scenes, panels } = state;
  const map = mapParts();

  /* ── Vocabulary: small helpers so the script below reads like stage directions ── */

  const mark = name => tl.addLabel(name);                       // a named moment (nav + ✕ buttons jump here)
  const pause = seconds => tl.to({}, { duration: seconds });    // scroll without anything moving

  // Move a scene's camera to centre `target` at `zoom`. `look` turns it sideways.
  const camera = (scene, target, { zoom = 1, look = 0, duration = 0.5, ease = 'power1.inOut' } = {}) =>
    tl.to(scenes[scene].camera, { ...cameraView(scene, target, zoom, look), duration, ease });

  // Fade from one scene into the next. The new camera starts at `startZoom` and settles
  // at `endZoom`. `turn` slides it in from the side, as if you'd turned your head.
  // `overlap` starts the fade that many seconds before the previous move ends.
  const crossfade = (from, to, { target, startZoom = 1.2, endZoom = 1, turn = null, duration = 0.5, overlap = 0 }) => {
    const startLook = turn === 'left' ? TURN_DISTANCE : turn === 'right' ? -TURN_DISTANCE : 0;
    tl.set(scenes[to].camera, cameraView(to, target, startZoom, startLook), overlap ? `-=${overlap}` : undefined);
    tl.to(scenes[from].el, { autoAlpha: 0, duration }, '<');
    tl.to(scenes[to].el, { autoAlpha: 1, duration }, '<');
    tl.to(scenes[to].camera, { ...cameraView(to, target, endZoom), duration: duration * 1.4, ease: 'power2.out' }, '<');
  };

  const showPanel = id => tl.to(panels[id], { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' });
  const hidePanel = id => {
    tl.to(panels[id], { autoAlpha: 0, scale: 0.6, y: -20, duration: 0.4, ease: 'power2.in' });
    mark(`${id}-closed`);                                      // where this panel's ✕ button lands
  };

  /* ── The script ── */

  // 1 · On the platform: title, then walk through the open door
  mark('platform');
  pause(0.6);
  tl.to('#intro', { autoAlpha: 0, y: -40, duration: 0.4 });
  camera('platform', 'door', { zoom: 4, duration: 1.4, ease: 'power2.in' });
  crossfade('platform', 'cabin_side', { target: 'poster', startZoom: 1.3, overlap: 0.45 });

  // 2 · Carriage side: the poster becomes the profile
  camera('cabin_side', 'poster', { zoom: 1.6 });
  showPanel('profile');
  mark('profile');
  pause(1.6);
  hidePanel('profile');

  // 3 · Step back, look right along the carriage, then walk through the front door
  camera('cabin_side', 'poster', { zoom: 1.15 });
  pause(0.3);
  camera('cabin_side', 'poster', { zoom: 1.15, look: 0.8, duration: 0.7, ease: 'power1.in' });
  crossfade('cabin_side', 'cabin_front', { target: 'door_window', turn: 'right', duration: 0.6, overlap: 0.3 });
  pause(0.3);
  camera('cabin_front', 'door_window', { zoom: 4, duration: 1.3, ease: 'power2.in' });
  crossfade('cabin_front', 'corridor', { target: 'end_door', startZoom: 1.25, overlap: 0.45 });
  pause(0.3);

  // 4 · Corridor: turn left into the sleeper bunk and zoom into its map screen
  camera('corridor', 'left_door', { zoom: 1.8, duration: 0.7 });
  crossfade('corridor', 'bunk', { target: 'screen', turn: 'left', overlap: 0.25 });
  camera('bunk', 'screen', { zoom: 1.8 });
  showPanel('experience');
  if (!jobCount()) mark('experience');

  // 5 · The map flies from job to job, newest first, drawing the route as it goes
  for (let i = 0; i < jobCount(); i++) {
    tl.to(map.world, { ...mapView(i), duration: 0.7, ease: 'power2.inOut' });
    tl.to(map.route, { ...routeDrawnTo(i), duration: 0.7 }, '<');
    tl.to(map.pins[i], { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' });
    tl.to(map.cards[i], { autoAlpha: 1, y: 0, duration: 0.3 }, '<');
    if (i === 0) mark('experience');                           // land on the first job, not an empty map
    pause(1.2);
    tl.to(map.cards[i], { autoAlpha: 0, y: -30, duration: 0.3 });
  }
  tl.to(map.world, { ...mapView(), duration: 0.6, ease: 'power2.inOut' });  // zoom out to see the whole route
  pause(0.3);
  hidePanel('experience');
  camera('bunk', 'screen', { zoom: 1, duration: 0.4 });

  // 6 · Turn right back into the corridor, then right again into the cargo hold
  crossfade('bunk', 'corridor', { target: 'end_door', startZoom: 1.35, endZoom: 1.2, turn: 'right' });
  camera('corridor', 'right_door', { zoom: 1.8, duration: 0.7 });
  crossfade('corridor', 'cargo', { target: 'crates', turn: 'right', overlap: 0.25 });
  camera('cargo', 'crates', { zoom: 1.5 });
  showPanel('projects');

  const projectCards = $$('.project-card');
  if (!projectCards.length) mark('projects');
  projectCards.forEach((card, i) => {
    tl.to(card, { autoAlpha: 1, x: 0, duration: 0.35, ease: 'power2.out' });
    if (i === 0) mark('projects');                             // land on the first card, not an empty panel
    pause(1.2);
    const isLast = i === projectCards.length - 1;
    if (!isLast) tl.to(card, { autoAlpha: 0, x: -80, duration: 0.3, ease: 'power2.in' });
  });
  hidePanel('projects');

  // 7 · Turn left into the corridor and walk all the way to the driver's cab
  crossfade('cargo', 'corridor', { target: 'end_door', startZoom: 1.45, endZoom: 1.3, turn: 'left' });
  camera('corridor', 'end_door', { zoom: 4.5, duration: 1.4, ease: 'power2.in' });
  crossfade('corridor', 'cab', { target: 'console', startZoom: 1.3, overlap: 0.45 });

  // 8 · The console becomes the skills panel; buttons light up one by one
  camera('cab', 'console', { zoom: 1.5 });
  showPanel('skills');
  const skills = $$('.skill', panels.skills);
  tl.to(skills, { '--lit': 1, duration: 0.15, stagger: Math.min(0.05, 1.2 / Math.max(skills.length, 1)) });
  mark('skills');                                              // land with every button lit
  pause(1.2);
  hidePanel('skills');

  // 9 · Out through the windscreen, arrive at the station: contact details
  camera('cab', 'windscreen', { zoom: 3.5, duration: 1.3, ease: 'power2.in' });
  crossfade('cab', 'arrival', { target: 'sign', startZoom: 1.4, duration: 0.6, overlap: 0.45 });
  camera('arrival', 'sign', { zoom: 1.4 });
  showPanel('contact');
  mark('contact');
  pause(0.8);

  return tl;
}

// Make the page tall enough to scroll through the whole ride, and let the scrollbar drive it.
function attachToScroll(timeline) {
  const scrollPerSecond = Math.max(innerHeight * 0.5, MIN_SCROLL_PER_SECOND);
  $('#scroller').style.height = `${Math.round(timeline.duration() * scrollPerSecond + innerHeight)}px`;
  state.scroll = ScrollTrigger.create({
    trigger: '#scroller',
    start: 'top top',
    end: 'bottom bottom',
    animation: timeline,
    scrub: PREFERS_REDUCED_MOTION ? true : SCROLL_SMOOTHING,
  });
}
