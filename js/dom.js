// Small DOM and HTML helpers used everywhere.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Everything from blu.yaml goes through this before it becomes HTML,
// so a stray "<" or "&" in your content can never break the page.
const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, ch => HTML_ENTITIES[ch]);

// A block of text → one <p> per blank-line-separated paragraph.
export const paragraphs = text =>
  String(text ?? '').trim().split(/\n\s*\n/).filter(Boolean)
    .map(p => `<p>${escapeHtml(p)}</p>`).join('');

export const bulletList = items =>
  items?.length ? `<ul class="bullets">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';

// Render only when the value exists: when(p.location, `<p>…</p>`)
export const when = (value, html) => (value ? html : '');
