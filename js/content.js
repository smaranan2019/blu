// Turns raw blu.yaml into one clean, predictable shape — the single source of truth
// the rest of the app reads. Anything missing gets a safe default; anything wrong is
// reported in `problems` (shown in the console and failed on in CI) instead of quietly
// becoming a wrong value, like a missing coordinate turning into a pin at 0°, 0°.
//
// Pure module: no DOM, no browser globals, so it runs in Node tests too.

export const DEFAULT_LABELS = {
  scroll_hint: 'Scroll to board',
  close: 'Close and continue',
  stops: { platform: 'Platform', profile: 'Profile', experience: 'Experience', projects: 'Projects', skills: 'Skills', contact: 'Contact' },
  profile_eyebrow: 'Carriage poster · Passenger profile',
  highlights: 'Highlights',
  avatar_alt: 'Pixel avatar of {name}',
  map_eyebrow: 'Sleeper screen · Route history (newest first)',
  job_counter: 'Stop {n} / {total}',
  job_link: 'More',
  no_jobs: 'No stops on the route yet.',
  projects_eyebrow: 'Cargo hold · Projects',
  project_counter: 'Crate {n} / {total}',
  project_link: 'Open project',
  photo: 'Photo {n}',
  previous_photo: 'Previous photo',
  next_photo: 'Next photo',
  no_projects: 'No projects yet.',
  skills_eyebrow: "Driver's console · Skills",
  contact_eyebrow: 'Arrival station',
  contact_heading: 'End of the line',
};

// "Stop {n} / {total}" + { n: 1, total: 3 } → "Stop 1 / 3"
export const fillIn = (template, values) =>
  String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));

// Only let through link schemes that can't run code. Browsers ignore control characters
// and spaces inside a scheme ("java\tscript:"), so strip them before checking.
const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];
export function safeUrl(url) {
  const cleaned = String(url ?? '').replace(/[\u0000- \u007f]/g, '');
  if (!cleaned) return '';
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned)?.[1].toLowerCase();
  if (!scheme) return cleaned;                       // relative path, e.g. images/a.jpg
  return ALLOWED_SCHEMES.includes(scheme) ? cleaned : '';
}

export function normalizeContent(raw) {
  const problems = [];
  const report = message => problems.push(message);

  const root = isPlainObject(raw) ? raw : {};
  if (!isPlainObject(raw)) report('blu.yaml is empty or is not a list of "key: value" settings.');

  const site = objectAt(root, 'site', report);
  const profile = objectAt(root, 'profile', report);
  const map = objectAt(root, 'map', report);
  const contact = objectAt(root, 'contact', report);
  const labels = objectAt(root, 'labels', report);

  const content = {
    site: {
      trainName: text(site.train_name) || 'BLU',
      title: text(site.title),
      tagline: text(site.tagline),
    },
    theme: normalizeTheme(objectAt(root, 'theme', report), report),
    scenes: normalizeScenes(objectAt(root, 'scenes', report), report),
    profile: {
      name: text(profile.name),
      title: text(profile.title),
      location: text(profile.location),
      avatar: safeUrl(profile.avatar),
      summary: text(profile.summary),
      highlights: textList(profile.highlights, 'profile.highlights', report),
      interests: text(profile.interests),
    },
    map: {
      image: safeUrl(map.image) || 'images/worldmap.jpg',
      zoom: positiveNumber(map.zoom, 3, 'map.zoom', report),
    },
    experience: listAt(root, 'experience', report).map((job, i) => normalizeJob(job, `experience[${i + 1}]`, report)),
    projects: listAt(root, 'projects', report).map((project, i) => normalizeProject(project, `projects[${i + 1}]`, report)),
    skills: listAt(root, 'skills', report).map((group, i) => ({
      category: text(group?.category),
      items: textList(group?.items, `skills[${i + 1}].items`, report),
    })),
    contact: {
      heading: text(contact.heading),
      message: text(contact.message),
      email: text(contact.email),
      phone: text(contact.phone),
      location: text(contact.location),
      socials: listAt(contact, 'socials', report).map((link, i) => normalizeLink(link, `contact.socials[${i + 1}]`, report)),
    },
    labels: {
      ...DEFAULT_LABELS,
      ...labels,
      stops: { ...DEFAULT_LABELS.stops, ...objectAt(labels, 'stops', report) },
    },
  };
  // Older blu.yaml files kept the scroll hint under `site`.
  if (site.scroll_hint) content.labels.scroll_hint = text(site.scroll_hint);

  return { content, problems };
}

/* ── Sections ─────────────────────────────────────────── */

function normalizeJob(job, where, report) {
  const coords = validCoords(job?.coords);
  if (!coords) report(`${where}: "coords" should be [latitude, longitude], e.g. [1.29, 103.85]. This stop gets no map pin.`);
  return {
    role: text(job?.role),
    company: text(job?.company),
    location: text(job?.location),
    start: text(job?.start),
    end: text(job?.end),
    summary: text(job?.summary),
    bullets: textList(job?.bullets, `${where}.bullets`, report),
    link: checkedUrl(job?.link, `${where}.link`, report),
    coords,                                              // null = no pin, never a fake 0°, 0°
  };
}

function normalizeProject(project, where, report) {
  return {
    title: text(project?.title),
    client: text(project?.client),
    date: text(project?.date),
    summary: text(project?.summary),
    bullets: textList(project?.bullets, `${where}.bullets`, report),
    tags: textList(project?.tags, `${where}.tags`, report),
    link: checkedUrl(project?.link, `${where}.link`, report),
    photos: textList(project?.photos, `${where}.photos`, report).map(safeUrl).filter(Boolean),
  };
}

function normalizeLink(link, where, report) {
  return { label: text(link?.label), url: checkedUrl(link?.url, `${where}.url`, report), icon: text(link?.icon) };
}

function normalizeScenes(scenes, report) {
  const result = {};
  for (const [key, scene] of Object.entries(scenes)) {
    const targets = {};
    for (const [name, point] of Object.entries(scene?.targets ?? {})) {
      if (isPercentPoint(point)) targets[name] = [Number(point[0]), Number(point[1])];
      else report(`scenes.${key}.targets.${name} should be [x%, y%] with numbers from 0 to 100.`);
    }
    result[key] = { image: safeUrl(scene?.image), targets };
  }
  return result;
}

// Colours go straight into CSS, so accept only plain colour values.
const COLOUR = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([\d\s.,%]+\))$/i;
function normalizeTheme(theme, report) {
  const result = {};
  for (const [name, value] of Object.entries(theme)) {
    if (/^[a-z][a-z0-9-]*$/i.test(name) && COLOUR.test(String(value).trim())) result[name] = String(value).trim();
    else report(`theme.${name}: "${value}" isn't a colour like #03396c.`);
  }
  return result;
}

/* ── Small validators ─────────────────────────────────── */

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function objectAt(parent, key, report) {
  const value = parent?.[key];
  if (value === undefined || value === null) return {};
  if (isPlainObject(value)) return value;
  report(`"${key}" should be a group of settings, not ${describe(value)}.`);
  return {};
}

function listAt(parent, key, report) {
  const value = parent?.[key];
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value;
  report(`"${key}" should be a list (lines starting with "-"), not ${describe(value)}.`);
  return [];
}

function text(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function textList(value, where, report) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    report(`${where} should be a list, not ${describe(value)}.`);
    return [];
  }
  return value.map(text).filter(Boolean);
}

function checkedUrl(value, where, report) {
  if (!value) return '';
  const url = safeUrl(value);
  if (!url) report(`${where}: "${value}" isn't an allowed link (use https://, mailto: or tel:).`);
  return url;
}

function positiveNumber(value, fallback, where, report) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) return number;
  report(`${where} should be a number above 0.`);
  return fallback;
}

function validCoords(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lat, lng] = value.map(Number);
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return valid ? [lat, lng] : null;
}

function isPercentPoint(value) {
  return Array.isArray(value) && value.length === 2 &&
    value.every(n => Number.isFinite(Number(n)) && Number(n) >= 0 && Number(n) <= 100);
}

const describe = value => (Array.isArray(value) ? 'a list' : typeof value === 'object' ? 'a group' : `"${value}"`);
