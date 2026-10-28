// 24×24 SVG icons. Brand marks use the official simple shapes; the rest are pixel-drawn.
const PATHS = {
  linkedin: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z',
  github: 'M12 .3a12 12 0 0 0-3.8 23.38c.6.12.82-.26.82-.57v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22v3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3',
  medium: 'M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z',
  website: 'M8 2h8v2h2v2h2v2h2v8h-2v2h-2v2h-2v2H8v-2H6v-2H4v-2H2V8h2V6h2V4h2zm3 2H9v2H8v3h3zm2 0v5h3V6h-1V4zM4 11v2h4v-2zm6 0v2h4v-2zm6 0v2h4v-2zM8 15v3h1v2h2v-5zm5 0v5h2v-2h1v-3z',
  email: 'M2 4h20v16H2zm2 2v1h2v1h2v1h2v1h4V9h2V8h2V7h2V6zm0 4v8h16v-8h-2v1h-2v1h-2v1h-4v-1H8v-1H6v-1z',
  phone: 'M4 2h6v6H8v2h2v2h2v2h2v-2h6v6h-2v2h-2v2h-4v-2h-2v-2H8v-2H6v-2H4v-2H2V6h2z',
  link: 'M10 6h4v2h-4v2H8v4h2v2h4v2h-4v-2H8v-2H6v-4h2V8h2zm6-2h6v6h-2V7h-2v2h-2v2h-2V9h2V7h2V6h-2z',
  close: 'M3 3h5v3h2v3h4V6h2V3h5v5h-3v2h-3v4h3v2h3v5h-5v-3h-2v-3h-4v3H8v3H3v-5h3v-2h3v-4H6V8H3z',
};

export const icon = name =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="${PATHS[name] || PATHS.link}"/></svg>`;

// Pick an icon for a social link: an explicit `icon:` wins, else match the label or URL.
export function iconForLink({ icon: chosen, label = '', url = '' }) {
  if (chosen) return chosen;
  const text = `${label} ${url}`.toLowerCase();
  const brand = ['linkedin', 'github', 'medium'].find(name => text.includes(name));
  return brand || (url.startsWith('http') ? 'website' : 'link');
}
