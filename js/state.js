// The few things several modules need to share. Keeping them on one object means
// there is exactly one place to look when you wonder "where does this live?"
export const state = {
  content: null,    // blu.yaml after content.js has cleaned and checked it
  timeline: null,   // the GSAP timeline that *is* the ride
  scroll: null,     // the ScrollTrigger that links page scroll to the timeline
  scenes: {},       // scene key → { el, camera, targets }
  panels: {},       // panel id → its <section> element
};
