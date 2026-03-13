import { escapeHTML } from './api.js';

/**
 * Post a status message to the aria-live #status region.
 */
export function announce(msg) {
  const status = document.getElementById('status');
  if (status) status.textContent = msg;
}

/**
 * Populate a <select> element with <option>s from a lookup array.
 */
export function populateSelect(id, items, valKey, labelKey) {
  const el = document.getElementById(id);
  if (!el) return;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item[valKey];
    opt.textContent = item[labelKey];
    el.appendChild(opt);
  });
}

/**
 * Return an HTML badge string for a report/item status.
 */
export function statusBadge(st) {
  const cls = st === 'approved' ? 'badge-approved' : st === 'rejected' ? 'badge-rejected' : 'badge-pending';
  return `<span class="badge ${cls}">${escapeHTML(st)}</span>`;
}
