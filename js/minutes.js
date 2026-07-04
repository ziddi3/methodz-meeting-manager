// js/minutes.js
// Meeting-minutes helpers

/** Return default empty minutes string */
function emptyMinutes() {
  return '';
}

/** Trim and validate minutes text */
function sanitizeMinutes(text) {
  return (text || '').trimEnd();
}

/** Check whether minutes have any content */
function hasMinutes(text) {
  return Boolean(text && text.trim().length > 0);
}

export { emptyMinutes, sanitizeMinutes, hasMinutes };
