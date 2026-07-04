// js/utils.js
// Shared utility functions

/** Generate a simple unique ID */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Format a date string (YYYY-MM-DD) to a readable form */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Format a datetime ISO string to a readable form */
function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/** Return today's date as YYYY-MM-DD */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Return current time as HH:MM */
function currentTime() {
  return new Date().toTimeString().slice(0, 5);
}

/** Debounce a function call */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/** Escape HTML to prevent XSS */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Capitalize first letter */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Return a badge colour class for meeting status */
function statusClass(status) {
  const map = {
    planned: 'badge--planned',
    'in-progress': 'badge--progress',
    completed: 'badge--completed',
    cancelled: 'badge--cancelled'
  };
  return map[status] || 'badge--planned';
}

/** Return a badge colour class for action priority */
function priorityClass(priority) {
  const map = { high: 'badge--danger', medium: 'badge--warning', low: 'badge--info' };
  return map[priority] || 'badge--info';
}

/** Return a badge colour class for action status */
function actionStatusClass(status) {
  const map = { open: 'badge--planned', 'in-progress': 'badge--progress', done: 'badge--completed' };
  return map[status] || 'badge--planned';
}

export {
  generateId, formatDate, formatDateTime, today, currentTime,
  debounce, escapeHtml, capitalize, statusClass, priorityClass, actionStatusClass
};
