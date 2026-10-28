// The pop-up cards (profile, projects, skills, contact). Each is plain HTML built from
// the cleaned content; the ride timeline decides when they appear and disappear.
// All links and image paths were already checked by content.js (safeUrl).
import { $, $$, escapeHtml, paragraphs, bulletList, when } from './dom.js';
import { fillIn } from './content.js';
import { icon, iconForLink } from './icons.js';
import { state } from './state.js';
import { jumpTo } from './nav.js';

// Create a panel with its ✕ button and add it to the page.
// tabindex="-1" lets the nav move keyboard/screen-reader focus into it on arrival.
export function createPanel(id, className, title, innerHtml) {
  const panel = document.createElement('section');
  panel.className = `panel framed ${className}`;
  panel.id = `panel-${id}`;
  panel.tabIndex = -1;
  panel.setAttribute('aria-label', title);
  panel.innerHTML = `<button class="close" type="button" aria-label="${escapeHtml(state.content.labels.close)}">${icon('close')}</button>${innerHtml}`;
  $('.close', panel).addEventListener('click', () => dismissPanel(id));
  $('#overlays').append(panel);
  state.panels[id] = panel;
  return panel;
}

// ✕ skips ahead to the moment this panel finishes closing, so the ride carries on.
// The contact panel is the last stop — there's nowhere further — so it just hides.
function dismissPanel(id) {
  const afterClose = `${id}-closed`;
  if (state.timeline.labels[afterClose] !== undefined) jumpTo(afterClose);
  else gsap.to(state.panels[id], { autoAlpha: 0, scale: 0.6, duration: 0.3, ease: 'power2.in' });
}

export function buildPanels() {
  const { profile, projects, skills, contact, labels } = state.content;
  createPanel('profile', 'profile-panel', labels.stops.profile, profileHtml(profile, labels));
  createPanel('projects', 'projects-panel', labels.stops.projects, projectsHtml(projects, labels));
  createPanel('skills', 'skills-panel', labels.stops.skills, skillsHtml(skills, labels));
  createPanel('contact', 'contact-panel', labels.stops.contact, contactHtml(contact, labels));
  $$('.carousel', state.panels.projects).forEach(setUpCarousel);
}

/* ── Templates: data in, HTML out ─────────────────────── */

function profileHtml(p, labels) {
  return `
    <p class="eyebrow">${escapeHtml(labels.profile_eyebrow)}</p>
    <div class="profile-head">
      ${when(p.avatar, `<img class="avatar" src="${escapeHtml(p.avatar)}" alt="${escapeHtml(fillIn(labels.avatar_alt, { name: p.name }))}">`)}
      <div>
        <h2>${escapeHtml(p.name)}</h2>
        <p class="subtitle">${escapeHtml(p.title)}</p>
        ${when(p.location, `<p class="meta">◆ ${escapeHtml(p.location)}</p>`)}
      </div>
    </div>
    ${paragraphs(p.summary)}
    ${when(p.highlights.length, `<div class="divider"></div><h3>${escapeHtml(labels.highlights)}</h3>${bulletList(p.highlights)}`)}
    ${when(p.interests, `<p class="meta interests">${escapeHtml(p.interests)}</p>`)}`;
}

function projectsHtml(projects, labels) {
  const cards = projects.map((project, i) => `
    <article class="project-card">
      ${carouselHtml(project.photos, project.title, labels)}
      <div class="project-body">
        <p class="counter">${escapeHtml(fillIn(labels.project_counter, { n: i + 1, total: projects.length }))}${when(project.date, ` · ${escapeHtml(project.date)}`)}</p>
        <h2>${escapeHtml(project.title)}</h2>
        ${when(project.client, `<p class="subtitle">${escapeHtml(project.client)}</p>`)}
        ${paragraphs(project.summary)}
        ${bulletList(project.bullets)}
        ${when(project.tags.length, `<div class="tags">${project.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`)}
        ${when(project.link, `<a class="btn" href="${escapeHtml(project.link)}" target="_blank" rel="noopener">${escapeHtml(labels.project_link)} ↗</a>`)}
      </div>
    </article>`).join('');
  const body = projects.length ? `<div class="project-stack">${cards}</div>` : `<p class="empty">${escapeHtml(labels.no_projects)}</p>`;
  return `<p class="eyebrow">${escapeHtml(labels.projects_eyebrow)}</p>${body}`;
}

function carouselHtml(photos, title, labels) {
  if (!photos.length) return '';
  const images = photos.map((src, i) =>
    `<img src="${escapeHtml(src)}" alt="${escapeHtml(`${title} — ${fillIn(labels.photo, { n: i + 1 })}`)}" draggable="false" loading="lazy">`).join('');
  const controls = photos.length < 2 ? '' : `
    <button class="carousel-btn carousel-prev" type="button" aria-label="${escapeHtml(labels.previous_photo)}">◀</button>
    <button class="carousel-btn carousel-next" type="button" aria-label="${escapeHtml(labels.next_photo)}">▶</button>
    <div class="carousel-dots">${photos.map((_, i) =>
      `<button class="carousel-dot${i === 0 ? ' active' : ''}" type="button" aria-label="${escapeHtml(fillIn(labels.photo, { n: i + 1 }))}"></button>`).join('')}</div>`;
  return `<div class="carousel"><div class="carousel-track">${images}</div>${controls}</div>`;
}

function skillsHtml(groups, labels) {
  const consoles = groups.map(group => `
    <div class="console">
      <h3>${escapeHtml(group.category)}</h3>
      <ul>${group.items.map(skill => `<li class="skill">${escapeHtml(skill)}</li>`).join('')}</ul>
    </div>`).join('');
  return `<p class="eyebrow">${escapeHtml(labels.skills_eyebrow)}</p><div class="consoles">${consoles}</div>`;
}

function contactHtml(c, labels) {
  const phoneDigits = c.phone.replace(/[^\d+]/g, '');
  const socials = c.socials.filter(link => link.url).map(link =>
    `<a class="btn social" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${icon(iconForLink(link))}${escapeHtml(link.label)}</a>`).join('');
  return `
    <p class="eyebrow">${escapeHtml(labels.contact_eyebrow)}</p>
    <div class="board">${escapeHtml(c.heading || labels.contact_heading)}</div>
    ${paragraphs(c.message)}
    ${when(c.location, `<p class="meta">◆ ${escapeHtml(c.location)}</p>`)}
    <ul class="contact-links">
      ${when(c.email, `<li><a href="mailto:${escapeHtml(c.email)}">${icon('email')}${escapeHtml(c.email)}</a></li>`)}
      ${when(phoneDigits, `<li><a href="tel:${escapeHtml(phoneDigits)}">${icon('phone')}${escapeHtml(c.phone)}</a></li>`)}
    </ul>
    <div class="socials">${socials}</div>`;
}

/* ── Photo carousel: arrows, dots and swipe ────────────── */

const SWIPE_MIN_DISTANCE = 40;   // px a finger must travel to count as a swipe

function setUpCarousel(carousel) {
  const track = $('.carousel-track', carousel);
  const count = track.children.length;
  if (count < 2) return;

  const dots = $$('.carousel-dot', carousel);
  let current = 0;
  const show = index => {
    current = (index + count) % count;                 // wrap around both ways
    track.style.transform = `translateX(${-current * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  };

  $('.carousel-prev', carousel).addEventListener('click', () => show(current - 1));
  $('.carousel-next', carousel).addEventListener('click', () => show(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));

  // Swipe: compare where the finger went down and came up.
  let swipeStartX = null;
  carousel.addEventListener('pointerdown', event => { swipeStartX = event.clientX; });
  carousel.addEventListener('pointerup', event => {
    if (swipeStartX === null) return;
    const distance = event.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(distance) > SWIPE_MIN_DISTANCE) show(current + (distance < 0 ? 1 : -1));
  });
}
